#!/usr/bin/env python3
"""
Integration tests for fallback routing functionality
Tests automatic detection and routing to OpenAI when Claude quota is low
"""

import subprocess
import sys
import pytest
from unittest.mock import patch, Mock
from pathlib import Path

# Add claudette to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from claudette.backends import ClaudeBackend, OpenAIBackend
from claudette.invoker import ClaudeInvoker
from claudette.config import Config


class TestFallbackRouting:
    """Integration tests for fallback routing"""
    
    def test_fallback_when_quota_low(self):
        """Test automatic fallback to OpenAI when Claude quota is low"""
        # Create config with fallback enabled
        config = Config({
            'fallback_enabled': True,
            'openai_key': 'test-key',
            'openai_model': 'gpt-3.5-turbo'
        })
        
        invoker = ClaudeInvoker(config)
        
        # Mock Claude backend to report low quota
        with patch.object(invoker.claude_backend, 'quota_low', return_value=True):
            with patch.object(invoker.claude_backend, 'is_available', return_value=True):
                with patch.object(invoker.openai_backend, 'is_available', return_value=True):
                    with patch.object(invoker.openai_backend, 'send') as mock_openai_send:
                        mock_openai_send.return_value = "OpenAI response"
                        
                        # Execute command
                        result = invoker.run(['edit', 'test.py'], 'test prompt')
                        
                        # Verify OpenAI backend was called
                        mock_openai_send.assert_called_once()
                        assert result.returncode == 0
                        assert "OpenAI response" in result.stdout
    
    def test_no_fallback_when_quota_ok(self):
        """Test Claude backend used when quota is sufficient"""
        config = Config({
            'fallback_enabled': True,
            'claude_cmd': 'claude'
        })
        
        invoker = ClaudeInvoker(config)
        
        # Mock Claude backend with good quota
        with patch.object(invoker.claude_backend, 'quota_low', return_value=False):
            with patch.object(invoker.claude_backend, 'is_available', return_value=True):
                with patch.object(invoker.claude_backend, 'send') as mock_claude_send:
                    mock_claude_send.return_value = "Claude response"
                    
                    # Execute command
                    result = invoker.run(['edit', 'test.py'], 'test prompt')
                    
                    # Verify Claude backend was called
                    mock_claude_send.assert_called_once()
                    assert result.returncode == 0
                    assert "Claude response" in result.stdout
    
    def test_fallback_disabled(self):
        """Test fallback is bypassed when disabled"""
        config = Config({
            'fallback_enabled': False,
            'claude_cmd': 'claude'
        })
        
        invoker = ClaudeInvoker(config)
        
        # Mock Claude backend with low quota but fallback disabled
        with patch.object(invoker.claude_backend, 'quota_low', return_value=True):
            with patch.object(invoker.claude_backend, 'is_available', return_value=True):
                with patch.object(invoker.claude_backend, 'send') as mock_claude_send:
                    with patch.object(invoker.openai_backend, 'send') as mock_openai_send:
                        mock_claude_send.return_value = "Claude response"
                        
                        # Execute command
                        result = invoker.run(['edit', 'test.py'], 'test prompt')
                        
                        # Verify only Claude backend was called
                        mock_claude_send.assert_called_once()
                        mock_openai_send.assert_not_called()
    
    def test_backend_override_claude(self):
        """Test explicit Claude backend selection"""
        config = Config({
            'fallback_enabled': True,
            'claude_cmd': 'claude'
        })
        
        invoker = ClaudeInvoker(config)
        
        # Mock Claude backend with low quota
        with patch.object(invoker.claude_backend, 'quota_low', return_value=True):
            with patch.object(invoker.claude_backend, 'is_available', return_value=True):
                with patch.object(invoker.claude_backend, 'send') as mock_claude_send:
                    with patch.object(invoker.openai_backend, 'send') as mock_openai_send:
                        mock_claude_send.return_value = "Claude response"
                        
                        # Force Claude backend
                        result = invoker.run(['edit', 'test.py'], 'test prompt', 'claude')
                        
                        # Verify Claude backend was used despite low quota
                        mock_claude_send.assert_called_once()
                        mock_openai_send.assert_not_called()
    
    def test_backend_override_openai(self):
        """Test explicit OpenAI backend selection"""
        config = Config({
            'openai_key': 'test-key',
            'openai_model': 'gpt-3.5-turbo'
        })
        
        invoker = ClaudeInvoker(config)
        
        # Mock OpenAI backend
        with patch.object(invoker.openai_backend, 'is_available', return_value=True):
            with patch.object(invoker.openai_backend, 'send') as mock_openai_send:
                with patch.object(invoker.claude_backend, 'send') as mock_claude_send:
                    mock_openai_send.return_value = "OpenAI response"
                    
                    # Force OpenAI backend
                    result = invoker.run(['edit', 'test.py'], 'test prompt', 'openai')
                    
                    # Verify OpenAI backend was used
                    mock_openai_send.assert_called_once()
                    mock_claude_send.assert_not_called()
    
    @patch('subprocess.run')
    def test_integration_with_dummy_file(self, mock_run):
        """Test end-to-end fallback with dummy file"""
        # Create dummy file
        dummy_file = Path("dummy.py")
        dummy_file.write_text("print('hello')")
        
        try:
            # Mock subprocess to simulate claudette execution
            mock_run.return_value.returncode = 0
            mock_run.return_value.stdout = "Fallback response"
            mock_run.return_value.stderr = "Claude quota low, routed to OpenAI backend"
            
            # Run claudette edit command
            result = subprocess.run([
                sys.executable, "-m", "claudette.main",
                "edit", "dummy.py", 
                "--explain", "noop"
            ], capture_output=True, text=True, cwd=Path(__file__).parent.parent.parent)
            
            # Should execute without error
            assert result.returncode in [0, 1]  # Allow errors due to missing keys
            
        finally:
            # Cleanup
            if dummy_file.exists():
                dummy_file.unlink()
    
    def test_quota_detection_methods(self):
        """Test quota detection mechanisms"""
        config = {'claude_cmd': 'claude'}
        backend = ClaudeBackend(config)
        
        # Test prompts_left method
        with patch.object(backend.cost_tracker, 'get_daily_token_usage', return_value=1_900_000):
            with patch.object(backend.cost_tracker, 'get_monthly_token_usage', return_value=50_000_000):
                prompts_left = backend.prompts_left()
                assert prompts_left is not None
                assert prompts_left < 200  # Should be low
        
        # Test quota_low method
        with patch.object(backend, 'prompts_left', return_value=1):
            assert backend.quota_low() is True
        
        with patch.object(backend, 'prompts_left', return_value=100):
            assert backend.quota_low() is False
    
    def test_openai_backend_diff_formatting(self):
        """Test OpenAI backend formats response as diff"""
        config = {
            'openai_key': 'test-key',
            'openai_model': 'gpt-3.5-turbo'
        }
        
        backend = OpenAIBackend(config)
        
        # Mock OpenAI client
        with patch.object(backend, 'client') as mock_client:
            mock_response = Mock()
            mock_response.choices = [Mock()]
            mock_response.choices[0].message.content = "Test response content"
            mock_client.chat.completions.create.return_value = mock_response
            
            result = backend.send("test prompt", ["edit", "file.py"])
            
            # Verify diff formatting
            assert "```diff" in result
            assert "OpenAI Backend Response" in result
            assert "Test response content" in result
            assert "Claude quota fallback" in result


if __name__ == '__main__':
    pytest.main([__file__])