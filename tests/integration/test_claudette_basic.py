#!/usr/bin/env python3
"""
Basic integration tests for Claudette CLI
Validates core functionality and CLI interface
"""

import subprocess
import sys
import pytest
from pathlib import Path

# Add claudette to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))


class TestClaudetteBasic:
    """Basic integration tests for Claudette"""
    
    def test_help_command_exits_zero(self):
        """Test that --help command exits with code 0"""
        result = subprocess.run(
            [sys.executable, "-m", "claudette.main", "--help"],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent.parent
        )
        
        assert result.returncode == 0
        assert "claudette" in result.stdout.lower()
        assert "usage:" in result.stdout.lower()
    
    def test_no_args_shows_help(self):
        """Test that no arguments shows help and exits 0"""
        result = subprocess.run(
            [sys.executable, "-m", "claudette.main"],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent.parent
        )
        
        assert result.returncode == 0
        assert "usage:" in result.stdout.lower()
    
    def test_edit_command_structure(self):
        """Test that edit command accepts basic arguments"""
        # This test validates argument parsing, not actual execution
        from claudette.main import create_parser
        
        parser = create_parser()
        
        # Test valid edit command
        args = parser.parse_args(["edit", "test.py", "--explain", "test message"])
        assert args.command == "edit"
        assert args.path == "test.py"
        assert args.explain == "test message"
    
    def test_commit_command_structure(self):
        """Test that commit command accepts basic arguments"""
        from claudette.main import create_parser
        
        parser = create_parser()
        
        # Test valid commit command
        args = parser.parse_args(["commit", "--message", "test commit"])
        assert args.command == "commit"
        assert args.message == "test commit"
    
    def test_new_command_structure(self):
        """Test that new command accepts basic arguments"""
        from claudette.main import create_parser
        
        parser = create_parser()
        
        # Test valid new command
        args = parser.parse_args(["new", "--project", "test-project"])
        assert args.command == "new"
        assert args.project == "test-project"
    
    def test_config_loading(self):
        """Test that configuration can be loaded"""
        from claudette.config import Config
        
        # Should not raise exception even if config doesn't exist
        config = Config.load()
        assert config.claude_cmd is not None
        assert config.fallback_enabled is not None
    
    def test_preprocessor_fallback(self):
        """Test that preprocessor works without OpenAI key"""
        from claudette.preprocessor import Preprocessor
        from claudette.config import Config
        
        # Create config without OpenAI key
        config = Config({})
        preprocessor = Preprocessor(config)
        
        # Should not raise exception
        result = preprocessor.compress("test prompt", {"summary": "test context"})
        assert isinstance(result, str)
        assert len(result) > 0


if __name__ == '__main__':
    pytest.main([__file__])