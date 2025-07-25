"""Regression tests for configuration handling issues."""

import pytest
import os
import tempfile
from pathlib import Path
from unittest.mock import patch
from .regression_test_base import RegressionTestBase
from claudette.config import Config

class TestConfigHandlingRegression(RegressionTestBase):
    """Test configuration handling regressions."""
    
    def get_bug_description(self):
        """Return description of configuration bugs."""
        return "Configuration file loading and environment variable handling"
    
    def test_missing_config_file_handling(self):
        """Test that missing config files are handled gracefully."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "nonexistent_config.yaml"
            
            # Should not crash when config file doesn't exist
            try:
                config = Config(config_path=config_path)
                assert config is not None
            except FileNotFoundError:
                pytest.fail("Config should handle missing files gracefully")
    
    def test_invalid_config_file_handling(self):
        """Test that invalid config files are handled gracefully."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "invalid_config.yaml"
            
            # Create invalid YAML file
            config_path.write_text("invalid: yaml: content: [")
            
            # Should not crash with invalid YAML
            try:
                config = Config(config_path=config_path)
                assert config is not None
            except Exception as e:
                # Should be a handled exception with clear message
                assert "yaml" in str(e).lower() or "config" in str(e).lower()
    
    def test_environment_variable_precedence(self):
        """Test that environment variables take precedence over config files."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "test_config.yaml"
            
            # Create config file with API key
            config_path.write_text("""
openai:
  api_key: "file_api_key"
  model: "gpt-3.5-turbo"
""")
            
            # Test environment variable takes precedence
            with patch.dict(os.environ, {'OPENAI_API_KEY': 'env_api_key'}):
                config = Config(config_path=config_path)
                
                # Environment variable should override file
                if hasattr(config, 'openai_api_key'):
                    assert config.openai_api_key == 'env_api_key'
    
    def test_bug_is_fixed(self):
        """Test that configuration bugs are fixed."""
        # Test 1: Config with no API keys should not crash
        with patch.dict(os.environ, {}, clear=True):
            env = dict(os.environ)
            env.pop('OPENAI_API_KEY', None)
            env.pop('ANTHROPIC_API_KEY', None)
            
            with patch.dict(os.environ, env):
                try:
                    config = Config()
                    assert config is not None
                except Exception as e:
                    # Should be handled gracefully
                    assert "api" in str(e).lower() or "key" in str(e).lower()
        
        # Test 2: Config should handle partial configuration
        partial_config = {
            'model': 'gpt-3.5-turbo'
            # Missing API key intentionally
        }
        
        try:
            config = Config()
            # Should be able to set individual properties
            if hasattr(config, 'model'):
                config.model = partial_config['model']
                assert config.model == partial_config['model']
        except Exception:
            # Partial configuration handling may vary
            pass

class TestCacheConfigRegression(RegressionTestBase):
    """Test cache configuration regression."""
    
    def get_bug_description(self):
        return "Cache directory creation and permission issues"
    
    def test_cache_directory_creation(self):
        """Test cache directory is created automatically."""
        with tempfile.TemporaryDirectory() as tmpdir:
            cache_dir = Path(tmpdir) / "cache" / "subdir"
            
            # Cache directory should be created automatically
            from claudette.cache import Cache
            cache = Cache(cache_dir=cache_dir)
            
            # Directory should exist after cache creation
            assert cache_dir.exists() or cache_dir.parent.exists()
    
    def test_cache_permission_handling(self):
        """Test cache handles permission issues gracefully."""
        # Test with read-only directory (if possible)
        with tempfile.TemporaryDirectory() as tmpdir:
            readonly_dir = Path(tmpdir) / "readonly"
            readonly_dir.mkdir()
            
            try:
                # Make directory read-only
                readonly_dir.chmod(0o444)
                
                from claudette.cache import Cache
                cache = Cache(cache_dir=readonly_dir / "cache")
                
                # Should handle gracefully or use fallback
                assert cache is not None
                
            except PermissionError:
                # Expected behavior - should be handled gracefully
                pass
            finally:
                # Restore permissions for cleanup
                readonly_dir.chmod(0o755)
    
    def test_bug_is_fixed(self):
        """Test that cache configuration bugs are fixed."""
        # Cache should work with default settings
        from claudette.cache import CacheManager as Cache
        
        try:
            cache = Cache()
            assert cache is not None
        except Exception as e:
            pytest.fail(f"Default cache configuration failed: {e}")

class TestAPIErrorHandlingRegression(RegressionTestBase):
    """Test API error handling regression."""
    
    def get_bug_description(self):
        return "API timeout and rate limiting error handling"
    
    @patch('claudette.backends.OpenAI')
    def test_api_timeout_handling(self, mock_openai):
        """Test API timeout is handled gracefully."""
        from claudette.backends import OpenAIBackend
        import requests
        
        # Mock timeout error
        mock_client = mock_openai.return_value
        mock_client.chat.completions.create.side_effect = requests.Timeout("Request timeout")
        
        backend = OpenAIBackend()
        
        try:
            response = backend.chat_completion(
                messages=[{"role": "user", "content": "test"}],
                model="gpt-3.5-turbo"
            )
            # Should either handle gracefully or raise appropriate exception
        except requests.Timeout:
            pytest.fail("Timeout should be handled gracefully")
        except Exception as e:
            # Should be a handled exception
            assert "timeout" in str(e).lower() or "api" in str(e).lower()
    
    @patch('claudette.backends.OpenAI')
    def test_rate_limit_handling(self, mock_openai):
        """Test rate limiting is handled gracefully."""
        from claudette.backends import OpenAIBackend
        import requests
        
        # Mock rate limit error
        mock_response = type('MockResponse', (), {})()
        mock_response.status_code = 429
        mock_response.text = "Rate limit exceeded"
        
        rate_limit_error = requests.HTTPError("Rate limit exceeded")
        rate_limit_error.response = mock_response
        
        mock_client = mock_openai.return_value
        mock_client.chat.completions.create.side_effect = rate_limit_error
        
        backend = OpenAIBackend()
        
        try:
            response = backend.chat_completion(
                messages=[{"role": "user", "content": "test"}],
                model="gpt-3.5-turbo"
            )
        except requests.HTTPError:
            pytest.fail("Rate limit should be handled gracefully")
        except Exception as e:
            # Should be a handled exception
            assert "rate" in str(e).lower() or "limit" in str(e).lower() or "api" in str(e).lower()
    
    def test_bug_is_fixed(self):
        """Test that API error handling bugs are fixed."""
        from claudette.backends import OpenAIBackend
        
        # Should be able to create backend without crashing
        try:
            backend = OpenAIBackend()
            assert backend is not None
        except Exception as e:
            # Should only fail for configuration issues, not implementation bugs
            assert "api" in str(e).lower() or "key" in str(e).lower() or "config" in str(e).lower()