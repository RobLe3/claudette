#!/usr/bin/env python3
"""
Unit tests for Preprocessor module
Tests compression functionality and token limits
"""

import sys
import pytest
from unittest.mock import Mock, patch
from pathlib import Path

# Add claudette to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from claudette.preprocessor import Preprocessor
from claudette.config import Config


class TestPreprocessor:
    """Unit tests for Preprocessor class"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.config = Config({
            'openai_key': 'test-key',
            'openai_model': 'gpt-3.5-turbo'
        })
        self.preprocessor = Preprocessor(self.config)
    
    def test_estimate_tokens_basic(self):
        """Test basic token estimation"""
        text = "Hello world, this is a test message"
        tokens = self.preprocessor.estimate_tokens(text)
        assert tokens > 0
        assert tokens < len(text)  # Should be less than character count
    
    def test_compress_adds_marker(self):
        """Test that compress adds ###COMPRESSED### marker"""
        prompt = "Test prompt"
        context = {"summary": "Test context"}
        
        with patch.object(self.preprocessor, 'client', None):
            result = self.preprocessor.compress(prompt, context)
        
        assert result.startswith("###COMPRESSED###")
    
    def test_compress_respects_token_limit(self):
        """Test that compression respects 2000 token limit"""
        # Create a very long prompt
        long_prompt = "This is a test. " * 1000  # ~4000 tokens
        context = {"summary": "Long test"}
        
        with patch.object(self.preprocessor, 'client', None):
            result = self.preprocessor.compress(long_prompt, context)
        
        # Should be under token limit
        tokens = self.preprocessor.estimate_tokens(result)
        assert tokens <= 2000
    
    @patch('openai.OpenAI')
    def test_openai_compression_mock(self, mock_openai):
        """Test OpenAI compression with mocked response"""
        # Setup mock
        mock_client = Mock()
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "Compressed prompt content"
        mock_client.chat.completions.create.return_value = mock_response
        
        # Inject mock client
        self.preprocessor.client = mock_client
        
        prompt = "Long detailed prompt that needs compression"
        context = {"command_type": "edit", "files": ["test.py"]}
        
        result = self.preprocessor.compress(prompt, context)
        
        # Verify compression occurred
        assert "###COMPRESSED###" in result
        assert "Compressed prompt content" in result
        
        # Verify OpenAI was called
        mock_client.chat.completions.create.assert_called_once()
        call_args = mock_client.chat.completions.create.call_args
        assert call_args[1]['model'] == 'gpt-3.5-turbo'
        assert call_args[1]['max_tokens'] == 400
    
    def test_fallback_compression(self):
        """Test fallback compression when OpenAI unavailable"""
        # Create preprocessor without OpenAI client
        config_no_key = Config({})
        preprocessor = Preprocessor(config_no_key)
        
        prompt = "Test prompt for fallback"
        context = {
            "command_type": "edit",
            "files": ["file1.py", "file2.py"],
            "summary": "Edit files"
        }
        
        result = preprocessor.compress(prompt, context)
        
        assert "###COMPRESSED###" in result
        assert "Test prompt for fallback" in result
        assert "Files: file1.py, file2.py" in result or "Cmd: edit" in result
    
    def test_build_context_string(self):
        """Test context string building"""
        context = {
            "command_type": "edit",
            "files": ["test.py", "app.js"],
            "file_info": {"size": 1000, "extension": ".py"},
            "summary": "Edit Python file"
        }
        
        context_str = self.preprocessor._build_context_string(context)
        
        assert "Command: edit" in context_str
        assert "Files: test.py, app.js" in context_str
        assert "File size: 1000 bytes" in context_str
        assert "Type: .py" in context_str
        assert "Summary: Edit Python file" in context_str
    
    def test_ensure_token_limit_trimming(self):
        """Test token limit enforcement with trimming"""
        # Create text that exceeds limit
        long_text = "word " * 2000  # Much longer than 2000 tokens
        
        result = self.preprocessor._ensure_token_limit(long_text)
        
        # Should be trimmed
        result_tokens = self.preprocessor.estimate_tokens(result)
        assert result_tokens <= 2000
        assert "[...trimmed...]" in result or len(result) < len(long_text)


if __name__ == '__main__':
    pytest.main([__file__])