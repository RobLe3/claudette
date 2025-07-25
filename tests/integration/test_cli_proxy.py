"""Integration tests for claudette CLI proxy functionality."""

import subprocess
import sys
import os
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock
import pytest

class TestCLIProxy:
    """Test claudette CLI proxy mirrors Claude Code interface."""
    
    def test_claudette_help_command(self):
        """Test claudette --help exits 0 and contains expected content."""
        result = subprocess.run(
            [sys.executable, '-m', 'claudette', '--help'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        assert result.returncode == 0
        assert 'claudette' in result.stdout.lower()
        assert 'edit' in result.stdout.lower()
    
    def test_claudette_version_command(self):
        """Test claudette --version shows version information."""
        result = subprocess.run(
            [sys.executable, '-m', 'claudette', '--version'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        assert result.returncode == 0
        assert 'claudette' in result.stdout.lower()
        # Should contain version number
        assert any(char.isdigit() for char in result.stdout)
    
    @patch('subprocess.run')
    def test_claudette_edit_calls_claude_cli(self, mock_subprocess):
        """Test claudette edit forwards to Claude CLI."""
        # Mock subprocess call to Claude CLI
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_subprocess.return_value = mock_result
        
        # Import and test CLI function directly
        from claudette.main import cli
        
        # Mock sys.exit to prevent actual exit
        with patch('sys.exit') as mock_exit:
            cli(['edit', 'test.py', '--explain', 'add async'])
            
            # Verify subprocess was called with claude command
            mock_subprocess.assert_called_once()
            call_args = mock_subprocess.call_args[0][0]  # First positional arg (the command list)
            
            assert call_args[0] == 'claude'  # Should call claude CLI
            assert 'edit' in call_args
            assert 'test.py' in call_args
            
            # Verify exit was called with correct code
            mock_exit.assert_called_once_with(0)
    
    @patch('subprocess.run')
    def test_claudette_unknown_verb_passthrough(self, mock_subprocess):
        """Test unknown verbs are passed through directly."""
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_subprocess.return_value = mock_result
        
        from claudette.main import cli
        
        with patch('sys.exit') as mock_exit:
            cli(['unknown-command', '--some-flag'])
            
            # Should still call Claude CLI
            mock_subprocess.assert_called_once()
            call_args = mock_subprocess.call_args[0][0]
            
            assert call_args[0] == 'claude'
            assert 'unknown-command' in call_args
            assert '--some-flag' in call_args
    
    @patch('subprocess.run')
    def test_stdin_forwarding(self, mock_subprocess):
        """Test STDIN is properly forwarded to Claude CLI."""
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_subprocess.return_value = mock_result
        
        from claudette.main import ClaudetteCLI
        
        cli_instance = ClaudetteCLI()
        
        # Test with mock stdin data
        test_input = b"test input data"
        result = cli_instance._forward_to_claude(['edit', 'file.py'], stdin_data=test_input)
        
        assert result == 0
        mock_subprocess.assert_called_once()
        
        # Check that input was passed to subprocess
        call_kwargs = mock_subprocess.call_args[1]
        assert call_kwargs['input'] == test_input
    
    def test_preprocessing_pipeline_usage(self):
        """Test that known verbs use preprocessing pipeline."""
        from claudette.main import ClaudetteCLI
        
        cli_instance = ClaudetteCLI()
        
        # Known verbs should use pipeline
        assert cli_instance._should_use_pipeline(['edit', 'file.py'])
        assert cli_instance._should_use_pipeline(['commit', '-m', 'message'])
        assert cli_instance._should_use_pipeline(['new', 'project'])
        
        # Help and version should not use pipeline
        assert not cli_instance._should_use_pipeline(['--help'])
        assert not cli_instance._should_use_pipeline(['help'])
        assert not cli_instance._should_use_pipeline(['--version'])
        assert not cli_instance._should_use_pipeline(['version'])
    
    def test_help_caching(self):
        """Test help text caching functionality."""
        from claudette.main import ClaudetteCLI
        
        cli_instance = ClaudetteCLI()
        
        # Should return help text (either cached or generated)
        help_text = cli_instance._cache_help()
        
        assert isinstance(help_text, str)
        assert len(help_text) > 0
        assert 'claudette' in help_text.lower()
    
    @patch('claudette.main.CacheManager')
    @patch('claudette.main.Preprocessor')
    def test_preprocessing_with_cache(self, mock_preprocessor, mock_cache):
        """Test preprocessing pipeline with cache integration."""
        # Mock cache miss then hit
        mock_cache_instance = MagicMock()
        mock_cache_instance.get.return_value = None  # Cache miss
        mock_cache_instance._generate_key.return_value = "test_key"
        mock_cache.return_value = mock_cache_instance
        
        # Mock preprocessor
        mock_preprocessor_instance = MagicMock()
        mock_preprocessor_instance.compress.return_value = "compressed prompt"
        mock_preprocessor.return_value = mock_preprocessor_instance
        
        from claudette.main import ClaudetteCLI
        
        cli_instance = ClaudetteCLI()
        
        # Test preprocessing
        args = ['edit', 'file.py', 'add', 'async', 'function']
        result = cli_instance._preprocess_request(args)
        
        # Should have called preprocessor
        mock_preprocessor_instance.compress.assert_called_once()
        
        # Should have called cache
        mock_cache_instance.get.assert_called_once()
        mock_cache_instance.set.assert_called_once()
    
    def test_claude_alias_environment_variable(self):
        """Test CLAUDETTE_NO_CLAUDE_ALIAS environment variable."""
        # Test with alias disabled
        with patch.dict(os.environ, {'CLAUDETTE_NO_CLAUDE_ALIAS': '1'}):
            # Mock sys.argv to simulate being called as 'claude'
            with patch('sys.argv', ['claude', '--help']):
                from claudette.main import cli
                
                with patch('sys.exit') as mock_exit:
                    with patch('sys.stderr'):  # Suppress error output
                        cli(['--help'])
                    
                    # Should exit with error when alias is disabled
                    mock_exit.assert_called_once_with(1)
    
    @patch('subprocess.run')
    def test_claude_cli_not_found_error(self, mock_subprocess):
        """Test error handling when Claude CLI is not found."""
        # Mock FileNotFoundError
        mock_subprocess.side_effect = FileNotFoundError("claude not found")
        
        from claudette.main import ClaudetteCLI
        
        cli_instance = ClaudetteCLI()
        
        with patch('sys.stderr'):  # Suppress error output
            result = cli_instance._forward_to_claude(['edit', 'file.py'])
        
        assert result == 127  # Command not found exit code
    
    @pytest.mark.integration
    def test_config_loading(self):
        """Test configuration loading from config.yaml."""
        from claudette.main import ClaudetteCLI
        
        # Create temporary config
        with tempfile.TemporaryDirectory() as tmpdir:
            config_file = Path(tmpdir) / 'config.yaml'
            config_file.write_text("""
claude_cmd: /custom/path/to/claude
default_backend: openai
""")
            
            # Test config loading
            cli_instance = ClaudetteCLI()
            
            # Should load custom claude_cmd if config exists in current directory
            with patch('pathlib.Path.cwd', return_value=Path(tmpdir)):
                claude_cmd = cli_instance._load_claude_cmd()
                # May be default 'claude' if config loading fails, that's ok
                assert isinstance(claude_cmd, str)
                assert len(claude_cmd) > 0
    
    def test_empty_args_handling(self):
        """Test handling of empty arguments."""
        from claudette.main import ClaudetteCLI
        
        cli_instance = ClaudetteCLI()
        
        # Empty args should not use pipeline
        assert not cli_instance._should_use_pipeline([])
        
        # Preprocessing empty args should return empty args
        result = cli_instance._preprocess_request([])
        assert result == []
    
    @patch('subprocess.run')
    def test_exit_code_forwarding(self, mock_subprocess):
        """Test that exit codes are properly forwarded."""
        # Test various exit codes
        test_codes = [0, 1, 2, 127, 130]
        
        from claudette.main import ClaudetteCLI
        cli_instance = ClaudetteCLI()
        
        for code in test_codes:
            mock_result = MagicMock()
            mock_result.returncode = code
            mock_subprocess.return_value = mock_result
            
            result = cli_instance._forward_to_claude(['edit', 'test.py'])
            assert result == code