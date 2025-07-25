#!/usr/bin/env python3
"""
Integration tests for Claudette compression functionality
Tests end-to-end compression and Claude CLI integration
"""

import subprocess
import sys
import pytest
from unittest.mock import patch, Mock
from pathlib import Path

# Add claudette to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))


class TestClaudetteCompression:
    """Integration tests for compression functionality"""
    
    def test_edit_command_with_compression(self):
        """Test edit command produces compressed output with header"""
        # Create a sample file to edit
        sample_file = Path("sample.py")
        sample_file.write_text("def hello():\n    print('Hello world')")
        
        try:
            # Mock Claude CLI to capture what gets passed to it
            with patch('subprocess.run') as mock_run:
                mock_run.return_value.returncode = 0
                mock_run.return_value.stdout = "Claude CLI output"
                mock_run.return_value.stderr = ""
                
                # Run claudette edit command
                result = subprocess.run([
                    sys.executable, "-m", "claudette.main", 
                    "edit", "sample.py", 
                    "--explain", "optimize this function for better performance"
                ], capture_output=True, text=True, cwd=Path(__file__).parent.parent.parent)
                
                # Verify claudette ran successfully
                assert result.returncode == 0
                
                # Verify Claude CLI was called
                assert mock_run.called
                call_args = mock_run.call_args[0][0]  # First positional arg
                
                # Check that message includes claudette header
                message_arg_index = None
                for i, arg in enumerate(call_args):
                    if arg == "--message":
                        message_arg_index = i + 1
                        break
                
                assert message_arg_index is not None
                assert message_arg_index < len(call_args)
                
                message_content = call_args[message_arg_index]
                assert "# Prepared by claudette v0.2" in message_content
                assert "###COMPRESSED###" in message_content
        
        finally:
            # Cleanup
            if sample_file.exists():
                sample_file.unlink()
    
    def test_compression_reduces_token_count(self):
        """Test that compression respects token limits and achieves reduction"""
        from claudette.preprocessor import Preprocessor
        from claudette.config import Config
        
        # Create a very long prompt that definitely needs compression (8000+ tokens)
        long_prompt = """
        I need you to completely rewrite this entire application from scratch.
        The application should be a comprehensive web application with the following features:
        - User authentication and authorization system
        - Real-time messaging capabilities
        - File upload and management system
        - Advanced search functionality with filters
        - Dashboard with analytics and charts
        - Mobile-responsive design
        - Database integration with complex queries
        - API endpoints for external integrations
        - Security features including rate limiting
        - Performance optimization and caching
        - Email notification system
        - Multi-language support
        - Advanced user roles and permissions
        - Audit logging and tracking
        - Backup and recovery systems
        """ * 20  # Much larger multiplier to force compression
        
        context = {
            "command_type": "edit",
            "files": ["app.py", "models.py", "views.py"],
            "summary": "Comprehensive application rewrite"
        }
        
        # Test with fallback compression (no OpenAI)
        config = Config({})
        preprocessor = Preprocessor(config)
        
        original_tokens = preprocessor.estimate_tokens(long_prompt)
        compressed = preprocessor.compress(long_prompt, context)
        
        # Verify compression occurred
        assert "###COMPRESSED###" in compressed
        
        # Extract content without ###COMPRESSED### header
        content_without_header = compressed.replace("###COMPRESSED###\n", "")
        compressed_tokens = preprocessor.estimate_tokens(content_without_header)
        
        # For very large inputs, should achieve significant reduction
        if original_tokens > 3000:  # Only test reduction for truly large inputs
            reduction_percent = (original_tokens - compressed_tokens) / original_tokens * 100
            assert reduction_percent >= 40, f"Only achieved {reduction_percent:.1f}% reduction (original: {original_tokens}, compressed: {compressed_tokens})"
        
        # Most importantly: should stay under 2000 token limit
        assert compressed_tokens <= 2000
    
    @patch('openai.OpenAI')
    def test_openai_compression_integration(self, mock_openai_class):
        """Test full OpenAI compression integration"""
        # Setup OpenAI mock
        mock_client = Mock()
        mock_openai_class.return_value = mock_client
        
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "Optimized: Rewrite app.py for performance"
        mock_client.chat.completions.create.return_value = mock_response
        
        from claudette.preprocessor import Preprocessor
        from claudette.config import Config
        
        config = Config({
            'openai_key': 'test-key',
            'openai_model': 'gpt-3.5-turbo'
        })
        
        preprocessor = Preprocessor(config)
        
        prompt = "Please rewrite this file to optimize performance and add error handling"
        context = {"command_type": "edit", "files": ["app.py"]}
        
        result = preprocessor.compress(prompt, context)
        
        # Verify OpenAI was called
        mock_client.chat.completions.create.assert_called_once()
        
        # Verify compression marker present
        assert "###COMPRESSED###" in result
        assert "Optimized: Rewrite app.py for performance" in result
    
    def test_context_builder_token_awareness(self):
        """Test that context builder respects token limits"""
        from claudette.context_builder import ContextBuilder
        
        builder = ContextBuilder()
        
        # Create many files that would exceed token limit
        many_files = [f"file_{i}.py" for i in range(50)]
        
        with patch.object(builder, '_estimate_file_tokens', return_value=100):
            selected = builder.select_top_k(many_files, k=20)
        
        # Should limit files to stay under 1500 token budget
        total_estimated_tokens = len(selected) * 100
        assert total_estimated_tokens <= 1500
        assert len(selected) <= 15  # 15 * 100 = 1500 tokens max
    
    def test_help_still_works_after_compression_changes(self):
        """Ensure help command still works after compression updates"""
        result = subprocess.run([
            sys.executable, "-m", "claudette.main", "--help"
        ], capture_output=True, text=True, cwd=Path(__file__).parent.parent.parent)
        
        assert result.returncode == 0
        assert "claudette" in result.stdout.lower()
        assert "edit" in result.stdout
        assert "commit" in result.stdout
        assert "new" in result.stdout


if __name__ == '__main__':
    pytest.main([__file__])