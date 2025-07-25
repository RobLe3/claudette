#!/usr/bin/env python3
"""
Unit tests for ContextBuilder module
Tests context selection and token-aware file ranking
"""

import sys
import pytest
from unittest.mock import Mock, patch
from pathlib import Path

# Add claudette to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from claudette.context_builder import ContextBuilder


class TestContextBuilder:
    """Unit tests for ContextBuilder class"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.context_builder = ContextBuilder()
    
    def test_build_context_edit_command(self):
        """Test context building for edit command"""
        context = self.context_builder.build_context("edit", ["edit", "test.py"])
        
        assert context["command_type"] == "edit"
        assert context["args"] == ["edit", "test.py"]
        assert context["files"] == ["test.py"]
        assert "Editing file: test.py" in context["summary"]
    
    def test_build_context_commit_command(self):
        """Test context building for commit command"""
        with patch.object(self.context_builder, '_get_git_changed_files', return_value=['file1.py', 'file2.js']):
            context = self.context_builder.build_context("commit", ["commit"])
        
        assert context["command_type"] == "commit"
        assert context["summary"] == "Creating git commit"
        assert context["files"] == ['file1.py', 'file2.js']
    
    def test_build_context_new_command(self):
        """Test context building for new command"""
        context = self.context_builder.build_context("new", ["new", "--project", "my-app"])
        
        assert context["command_type"] == "new"
        assert context["summary"] == "Creating new project: my-app"
        assert context["project_name"] == "my-app"
    
    def test_select_top_k_respects_token_limit(self):
        """Test that select_top_k respects token limits"""
        # Mock files with different sizes
        files = ["small.py", "medium.js", "large.cpp", "huge.txt"]
        
        with patch.object(self.context_builder, '_estimate_file_tokens') as mock_estimate:
            # Setup token estimates: small=100, medium=300, large=500, huge=1200
            mock_estimate.side_effect = lambda f: {
                "small.py": 100,
                "medium.js": 300, 
                "large.cpp": 500,
                "huge.txt": 1200
            }[f]
            
            result = self.context_builder.select_top_k(files, k=10)
        
        # Should not include huge.txt as it would exceed 1500 token limit
        assert len(result) <= 3
        assert "huge.txt" not in result
    
    def test_rank_files_by_relevance(self):
        """Test file ranking by relevance score"""
        files = ["README.md", "main.py", "test.js", "config.json", "deep/nested/file.txt"]
        
        with patch('pathlib.Path.stat') as mock_stat:
            # Mock file sizes
            mock_stat.return_value.st_size = 1000
            
            ranked = self.context_builder._rank_files_by_relevance(files)
        
        # main.py should rank high (Python + main name)
        # README.md should rank moderately (markdown + special name)
        # deep nested file should rank lower
        assert "main.py" in ranked[:2]  # Should be in top 2
        assert ranked.index("deep/nested/file.txt") > ranked.index("main.py")
    
    def test_calculate_relevance_score(self):
        """Test relevance score calculation"""
        with patch('pathlib.Path.stat') as mock_stat:
            mock_stat.return_value.st_size = 2000
            
            # Python files should score high
            py_score = self.context_builder._calculate_relevance_score("app.py")
            
            # Text files should score lower
            txt_score = self.context_builder._calculate_relevance_score("notes.txt")
            
            # Main files should get bonus
            main_score = self.context_builder._calculate_relevance_score("main.py")
        
        assert py_score > txt_score
        assert main_score >= py_score  # main.py gets bonus
    
    def test_estimate_file_tokens(self):
        """Test file token estimation"""
        with patch('pathlib.Path.exists', return_value=True):
            with patch('pathlib.Path.stat') as mock_stat:
                mock_stat.return_value.st_size = 400  # 400 bytes
                
                tokens = self.context_builder._estimate_file_tokens("test.py")
                
                # Should estimate ~100 tokens (400/4)
                assert 90 <= tokens <= 110
    
    def test_estimate_file_tokens_missing_file(self):
        """Test token estimation for missing files"""
        with patch('pathlib.Path.exists', return_value=False):
            tokens = self.context_builder._estimate_file_tokens("missing.py")
            assert tokens == 50  # Default for missing files
    
    def test_trim_file_for_tokens(self):
        """Test file trimming for token budgets"""
        # Test with sufficient tokens
        result = self.context_builder._trim_file_for_tokens("longfile.py", 100)
        assert result is not None
        assert "[trimmed]" in result
        
        # Test with insufficient tokens
        result = self.context_builder._trim_file_for_tokens("longfile.py", 10)
        assert result is None
    
    def test_get_file_info_existing_file(self):
        """Test file info gathering for existing files"""
        with patch('pathlib.Path.exists', return_value=True):
            with patch('pathlib.Path.stat') as mock_stat:
                mock_stat.return_value.st_size = 1500
                
                info = self.context_builder._get_file_info("test.py")
                
                assert info["exists"] is True
                assert info["extension"] == ".py"
                assert info["size"] == 1500
    
    def test_get_file_info_missing_file(self):
        """Test file info gathering for missing files"""
        with patch('pathlib.Path.exists', return_value=False):
            info = self.context_builder._get_file_info("missing.py")
            
            assert info["exists"] is False
            assert info["extension"] == ".py"
            assert info["size"] == 0
    
    def test_get_git_changed_files(self):
        """Test git changed files detection"""
        with patch('subprocess.run') as mock_run:
            # Mock successful git command
            mock_run.return_value.returncode = 0
            mock_run.return_value.stdout = "file1.py\nfile2.js\n"
            
            files = self.context_builder._get_git_changed_files()
            
            assert files == ["file1.py", "file2.js"]
    
    def test_get_git_changed_files_no_git(self):
        """Test git changed files when git not available"""
        with patch('subprocess.run', side_effect=FileNotFoundError):
            files = self.context_builder._get_git_changed_files()
            assert files == []


if __name__ == '__main__':
    pytest.main([__file__])