#!/usr/bin/env python3
"""
Integration tests for cache functionality
Tests that cache hits prevent recompression and backend calls
"""

import os
import sys
import tempfile
import pytest
from pathlib import Path
from unittest.mock import Mock, patch, call

# Add claudette to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from claudette.cache import CacheManager, get_cache_manager, create_cache_event
from claudette.preprocessor import Preprocessor
from claudette.invoker import ClaudeInvoker
from claudette.config import Config


class TestCacheIntegration:
    """Integration tests for caching system"""
    
    def setup_method(self):
        """Setup test environment"""
        # Create temporary cache directory
        self.temp_cache_dir = tempfile.mkdtemp()
        self.cache_manager = CacheManager(self.temp_cache_dir)
        
        # Create test config with cache enabled
        self.config = Config({
            'claude_cmd': 'claude',
            'history_enabled': True,
            'cache_dir': self.temp_cache_dir,
            'openai_key': 'test-key',
            'openai_model': 'gpt-3.5-turbo'
        })
    
    def teardown_method(self):
        """Cleanup test environment"""
        import shutil
        shutil.rmtree(self.temp_cache_dir, ignore_errors=True)
    
    def test_cache_event_creation(self):
        """Test cache event creation with proper hashing"""
        event = create_cache_event(
            cmd="edit",
            files=["test.py"],
            raw_prompt="optimize this code",
            compressed_prompt="optimize code in test.py",
            backend="claude",
            compressed_tokens=50,
            response="Code optimized successfully"
        )
        
        # Verify event structure
        assert event['cmd'] == 'edit'
        assert event['files'] == ['test.py']
        assert event['backend'] == 'claude'
        assert event['compressed_tokens'] == 50
        assert 'timestamp' in event
        assert 'prompt_hash' in event
        assert 'file_digest' in event
        assert 'response_hash' in event
    
    def test_cache_save_and_lookup(self):
        """Test saving and retrieving cache entries"""
        # Create and save an event
        event = create_cache_event(
            cmd="edit",
            files=["dummy.py"],
            raw_prompt="noop",
            compressed_prompt="no operation on dummy.py",
            backend="claude",
            compressed_tokens=25,
            response="No changes needed"
        )
        
        self.cache_manager.save_event(event)
        
        # Look up the cached entry
        cached = self.cache_manager.lookup(
            event['prompt_hash'],
            event['file_digest'], 
            'claude'
        )
        
        assert cached is not None
        assert cached['cmd'] == 'edit'
        assert cached['backend'] == 'claude'
        assert cached['compressed_tokens'] == 25
    
    def test_cache_miss_different_files(self):
        """Test cache miss when file contents change"""
        # Save event for one file
        event1 = create_cache_event(
            cmd="edit",
            files=["test.py"],
            raw_prompt="optimize code",
            compressed_prompt="optimize test.py",
            backend="claude",
            response="optimized"
        )
        self.cache_manager.save_event(event1)
        
        # Look up with different file digest (simulating file change)
        different_digest = self.cache_manager.compute_file_digest(["different.py"])
        cached = self.cache_manager.lookup(
            event1['prompt_hash'],
            different_digest,
            'claude'
        )
        
        assert cached is None
    
    def test_cache_miss_different_prompt(self):
        """Test cache miss when prompt changes"""
        # Save event
        event = create_cache_event(
            cmd="edit",
            files=["test.py"],
            raw_prompt="optimize code",
            compressed_prompt="optimize test.py",
            backend="claude",
            response="optimized"
        )
        self.cache_manager.save_event(event)
        
        # Look up with different prompt
        different_hash = self.cache_manager.compute_prompt_hash("different prompt")
        cached = self.cache_manager.lookup(
            different_hash,
            event['file_digest'],
            'claude'
        )
        
        assert cached is None
    
    @patch('claudette.preprocessor.openai.OpenAI')
    def test_preprocessor_cache_integration(self, mock_openai):
        """Test preprocessor uses cache to skip compression"""
        # Setup mock OpenAI client
        mock_client = Mock()
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "compressed result"
        mock_client.chat.completions.create.return_value = mock_response
        mock_openai.return_value = mock_client
        
        preprocessor = Preprocessor(self.config)
        
        # First call - should compress and cache
        context = {'command_type': 'edit', 'files': ['dummy.py']}
        result1 = preprocessor.compress("noop", context, "claude", True)
        
        # Verify OpenAI was called
        assert mock_client.chat.completions.create.called
        
        # Reset mock to track second call
        mock_client.chat.completions.create.reset_mock()
        
        # Second call with same prompt and files - should use cache
        result2 = preprocessor.compress("noop", context, "claude", True)
        
        # Verify OpenAI was NOT called again (cache hit)
        assert not mock_client.chat.completions.create.called
        
        # Results should be the same
        assert result1 == result2
    
    @patch('claudette.backends.load_backend')
    def test_invoker_saves_to_cache(self, mock_load_backend):
        """Test invoker saves successful operations to cache"""
        # Setup mock backend
        mock_backend = Mock()
        mock_backend.is_available.return_value = True
        mock_backend.send.return_value = "Operation completed successfully"
        mock_load_backend.return_value = mock_backend
        
        invoker = ClaudeInvoker(self.config)
        
        # Run command with caching enabled
        context = {'files': ['dummy.py']}
        result = invoker.run(
            cmd_args=['edit', 'dummy.py'],
            message='noop',
            backend_override='claude',
            context=context,
            use_cache=True
        )
        
        # Verify backend was called
        assert mock_backend.send.called
        assert result.returncode == 0
        
        # Check if event was saved to cache
        events = self.cache_manager.get_history(limit=1)
        assert len(events) == 1
        assert events[0]['cmd'] == 'edit'
        assert events[0]['backend'] == 'claude'
    
    @patch('claudette.backends.load_backend')
    def test_no_cache_flag_bypasses_cache(self, mock_load_backend):
        """Test --no-cache flag bypasses cache entirely"""
        # Setup mock backend
        mock_backend = Mock()
        mock_backend.is_available.return_value = True
        mock_backend.send.return_value = "Operation completed"
        mock_load_backend.return_value = mock_backend
        
        invoker = ClaudeInvoker(self.config)
        
        # Run command with caching disabled
        context = {'files': ['dummy.py']}
        result = invoker.run(
            cmd_args=['edit', 'dummy.py'],
            message='noop',
            backend_override='claude',
            context=context,
            use_cache=False  # Cache disabled
        )
        
        # Verify backend was called
        assert mock_backend.send.called
        assert result.returncode == 0
        
        # Check that no event was saved to cache
        events = self.cache_manager.get_history(limit=10)
        assert len(events) == 0
    
    def test_duplicate_command_reuses_compressed_prompt(self):
        """Test that identical commands reuse cached compressed prompt"""
        
        # Create a dummy file for testing
        test_file = Path(self.temp_cache_dir) / "dummy.py"
        test_file.write_text("# dummy python file\npass\n")
        
        with patch('claudette.preprocessor.openai.OpenAI') as mock_openai, \
             patch('claudette.backends.load_backend') as mock_load_backend:
            
            # Setup mocks
            mock_client = Mock()
            mock_response = Mock()
            mock_response.choices = [Mock()]
            mock_response.choices[0].message.content = "compressed: noop on dummy.py"
            mock_client.chat.completions.create.return_value = mock_response
            mock_openai.return_value = mock_client
            
            mock_backend = Mock()
            mock_backend.is_available.return_value = True
            mock_backend.send.return_value = "File processed"
            mock_load_backend.return_value = mock_backend
            
            # Create components
            preprocessor = Preprocessor(self.config)
            invoker = ClaudeInvoker(self.config)
            
            # First run - should compress and call backend
            context1 = {'command_type': 'edit', 'files': [str(test_file)]}
            compressed1 = preprocessor.compress("noop", context1, "claude", True)
            result1 = invoker.run(['edit', str(test_file)], compressed1, 'claude', context1, True)
            
            # Verify first run used OpenAI and backend
            assert mock_client.chat.completions.create.call_count == 1
            assert mock_backend.send.call_count == 1
            assert result1.returncode == 0
            
            # Reset mocks
            mock_client.chat.completions.create.reset_mock()
            mock_backend.send.reset_mock()
            
            # Second run with identical parameters
            context2 = {'command_type': 'edit', 'files': [str(test_file)]}
            compressed2 = preprocessor.compress("noop", context2, "claude", True)
            result2 = invoker.run(['edit', str(test_file)], compressed2, 'claude', context2, True)
            
            # Verify second run used cache (no OpenAI call) but still called backend
            assert mock_client.chat.completions.create.call_count == 0  # Cache hit!
            assert mock_backend.send.call_count == 1  # Backend still called
            assert result2.returncode == 0
            
            # Both compressions should be identical
            assert compressed1 == compressed2


if __name__ == '__main__':
    pytest.main([__file__])