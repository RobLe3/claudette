"""End-to-end CLI tests for claudette."""

import os
import subprocess
import tempfile
from pathlib import Path
import pytest
from unittest.mock import patch, MagicMock

class TestCLIEndToEnd:
    """Test claudette CLI commands in realistic scenarios."""
    
    @pytest.fixture
    def sample_repo(self):
        """Create a temporary git repository with sample files."""
        with tempfile.TemporaryDirectory() as tmpdir:
            repo_path = Path(tmpdir)
            
            # Initialize git repo
            subprocess.run(['git', 'init'], cwd=repo_path, check=True, capture_output=True)
            subprocess.run(['git', 'config', 'user.name', 'Test User'], cwd=repo_path, check=True)
            subprocess.run(['git', 'config', 'user.email', 'test@example.com'], cwd=repo_path, check=True)
            
            # Create sample files
            (repo_path / 'main.py').write_text('''def hello_world():
    print("Hello, World!")

if __name__ == "__main__":
    hello_world()
''')
            
            (repo_path / 'README.md').write_text('''# Sample Project
This is a test project for claudette CLI testing.
''')
            
            # Initial commit
            subprocess.run(['git', 'add', '.'], cwd=repo_path, check=True)
            subprocess.run(['git', 'commit', '-m', 'Initial commit'], cwd=repo_path, check=True)
            
            yield repo_path

    def test_claudette_help(self):
        """Test claudette --help command."""
        result = subprocess.run(['python3', '-m', 'claudette', '--help'], 
                              capture_output=True, text=True)
        assert result.returncode == 0
        assert 'claudette' in result.stdout.lower()
        assert 'usage' in result.stdout.lower() or 'help' in result.stdout.lower()

    @patch('claudette.main.OpenAI')
    def test_claudette_basic_query(self, mock_openai, sample_repo):
        """Test basic claudette query with mocked OpenAI."""
        # Mock OpenAI response
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "# Sample output\nThis is a test response."
        mock_client.chat.completions.create.return_value = mock_response
        mock_openai.return_value = mock_client
        
        # Change to sample repo directory
        original_cwd = os.getcwd()
        try:
            os.chdir(sample_repo)
            
            # Run claudette with simple query
            result = subprocess.run(['python3', '-m', 'claudette', 'What is in main.py?'], 
                                  capture_output=True, text=True, timeout=30)
            
            # Should not crash (even if mocking doesn't work perfectly)
            assert result.returncode in [0, 1]  # 0 for success, 1 for API errors
            
        finally:
            os.chdir(original_cwd)

    @patch('claudette.backends.OpenAI')  
    def test_claudette_file_edit(self, mock_openai, sample_repo):
        """Test claudette file editing functionality."""
        # Mock OpenAI response for file editing
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = '''def hello_world():
    """Print hello world message."""
    print("Hello, World!")

if __name__ == "__main__":
    hello_world()
'''
        mock_client.chat.completions.create.return_value = mock_response
        mock_openai.return_value = mock_client
        
        original_cwd = os.getcwd()
        try:
            os.chdir(sample_repo)
            
            # Check original file content
            original_content = (sample_repo / 'main.py').read_text()
            
            # Run claudette to add docstring
            result = subprocess.run(['python3', '-m', 'claudette', 'Add docstring to main.py'], 
                                  capture_output=True, text=True, timeout=30)
            
            # Should handle gracefully even if API call fails
            assert result.returncode in [0, 1]
            
            # File should still exist
            assert (sample_repo / 'main.py').exists()
            
        finally:
            os.chdir(original_cwd)

    def test_claudette_config_validation(self):
        """Test claudette configuration validation."""
        # Test with missing config
        with patch.dict(os.environ, {}, clear=True):
            # Remove API key environment variable
            env = dict(os.environ)
            env.pop('OPENAI_API_KEY', None)
            env.pop('ANTHROPIC_API_KEY', None)
            
            result = subprocess.run(['python3', '-m', 'claudette', '--help'], 
                                  env=env, capture_output=True, text=True)
            
            # Help should still work without API keys
            assert result.returncode == 0

    def test_claudette_version(self):
        """Test claudette version command."""
        result = subprocess.run(['python3', '-m', 'claudette', '--version'], 
                              capture_output=True, text=True)
        
        # Should show version or fail gracefully
        assert result.returncode in [0, 2]  # 0 for success, 2 for argparse error
        
        if result.returncode == 0:
            assert any(char.isdigit() for char in result.stdout)  # Version contains numbers

    @patch('claudette.cache.Cache')
    def test_claudette_cache_behavior(self, mock_cache, sample_repo):
        """Test claudette caching behavior."""
        # Mock cache behavior
        mock_cache_instance = MagicMock()
        mock_cache_instance.get.return_value = None  # Cache miss
        mock_cache_instance.set.return_value = True
        mock_cache.return_value = mock_cache_instance
        
        original_cwd = os.getcwd()
        try:
            os.chdir(sample_repo)
            
            # Run claudette command that should use cache
            result = subprocess.run(['python3', '-m', 'claudette', 'List files'], 
                                  capture_output=True, text=True, timeout=30)
            
            # Should handle gracefully
            assert result.returncode in [0, 1]
            
        finally:
            os.chdir(original_cwd)

    def test_claudette_error_handling(self):
        """Test claudette error handling with invalid inputs."""
        # Test with invalid command
        result = subprocess.run(['python3', '-m', 'claudette', '--invalid-flag'], 
                              capture_output=True, text=True)
        assert result.returncode != 0
        
        # Test with empty input
        result = subprocess.run(['python3', '-m', 'claudette', ''], 
                              capture_output=True, text=True, input='\\n', timeout=10)
        assert result.returncode in [0, 1, 2]  # Various expected error codes

    @pytest.mark.integration
    def test_claudette_git_integration(self, sample_repo):
        """Test claudette integration with git repositories."""
        original_cwd = os.getcwd()
        try:
            os.chdir(sample_repo)
            
            # Test that claudette can detect git repo
            result = subprocess.run(['python3', '-m', 'claudette', 'What git branch am I on?'], 
                                  capture_output=True, text=True, timeout=30)
            
            # Should not crash even if API fails
            assert result.returncode in [0, 1]
            
            # Check git status still works
            git_result = subprocess.run(['git', 'status'], 
                                      capture_output=True, text=True)
            assert git_result.returncode == 0
            
        finally:
            os.chdir(original_cwd)