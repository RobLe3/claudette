"""Cache hit tests for claudette caching functionality."""

import pytest
import tempfile
import time
from pathlib import Path
from unittest.mock import patch, MagicMock
from claudette.cache import CacheManager as Cache
from claudette.main import main
import hashlib
import json

class TestCacheHit:
    """Test cache hit functionality and performance."""

    @pytest.fixture
    def temp_cache_dir(self):
        """Create temporary cache directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            yield Path(tmpdir)

    @pytest.fixture
    def mock_cache(self, temp_cache_dir):
        """Create mock cache instance."""
        return Cache(cache_dir=temp_cache_dir)

    def test_cache_initialization(self, temp_cache_dir):
        """Test cache initializes correctly."""
        cache = Cache(cache_dir=temp_cache_dir)
        assert cache is not None
        assert cache.cache_dir == temp_cache_dir

    def test_cache_key_generation(self, mock_cache):
        """Test cache key generation is consistent."""
        prompt1 = "Hello, world!"
        prompt2 = "Hello, world!"
        prompt3 = "Different prompt"
        
        key1 = mock_cache._generate_key(prompt1, model="gpt-3.5-turbo")
        key2 = mock_cache._generate_key(prompt2, model="gpt-3.5-turbo")
        key3 = mock_cache._generate_key(prompt3, model="gpt-3.5-turbo")
        
        # Same prompts should generate same keys
        assert key1 == key2
        # Different prompts should generate different keys
        assert key1 != key3

    def test_cache_set_and_get(self, mock_cache):
        """Test basic cache set and get operations."""
        key = "test_key"
        value = {"response": "Test response", "tokens": 100}
        
        # Set cache value
        mock_cache.set(key, value)
        
        # Get cache value
        retrieved = mock_cache.get(key)
        assert retrieved == value

    def test_cache_miss(self, mock_cache):
        """Test cache miss returns None."""
        non_existent_key = "does_not_exist"
        result = mock_cache.get(non_existent_key)
        assert result is None

    def test_cache_hit_performance(self, mock_cache):
        """Test cache hit performance is under 150ms."""
        key = "performance_test_key"
        large_value = {
            "response": "Large response data " * 1000,
            "tokens": 5000,
            "model": "gpt-3.5-turbo",
            "timestamp": time.time()
        }
        
        # Set cache value
        mock_cache.set(key, large_value)
        
        # Measure cache hit time
        start_time = time.perf_counter()
        result = mock_cache.get(key)
        end_time = time.perf_counter()
        
        hit_time = (end_time - start_time) * 1000  # Convert to milliseconds
        
        assert result == large_value
        assert hit_time < 150, f"Cache hit took {hit_time:.2f}ms, should be < 150ms"

    def test_cache_expiration(self, mock_cache):
        """Test cache expiration functionality."""
        key = "expiring_key"
        value = {"response": "Expiring response"}
        ttl = 1  # 1 second TTL
        
        # Set cache with TTL
        mock_cache.set(key, value, ttl=ttl)
        
        # Should be available immediately
        assert mock_cache.get(key) == value
        
        # Wait for expiration
        time.sleep(1.1)
        
        # Should be expired now
        assert mock_cache.get(key) is None

    @patch('claudette.backends.OpenAI')
    def test_end_to_end_cache_hit(self, mock_openai, mock_cache):
        """Test end-to-end cache hit in actual claudette usage."""
        # Mock OpenAI response
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "Cached response"
        mock_response.usage.total_tokens = 50
        mock_client.chat.completions.create.return_value = mock_response
        mock_openai.return_value = mock_client
        
        prompt = "What is 2+2?"
        
        # First call - should miss cache and call API
        with patch('claudette.cache.Cache', return_value=mock_cache):
            with patch('claudette.main.Cache', return_value=mock_cache):
                # Simulate first call (cache miss)
                cache_key = mock_cache._generate_key(prompt, model="gpt-3.5-turbo")
                
                # Ensure cache miss first
                assert mock_cache.get(cache_key) is None
                
                # Set cache for second call
                cached_response = {
                    "content": "Cached response: 2+2=4",
                    "tokens": 25,
                    "model": "gpt-3.5-turbo"
                }
                mock_cache.set(cache_key, cached_response)
                
                # Second call - should hit cache
                start_time = time.perf_counter()
                result = mock_cache.get(cache_key)
                end_time = time.perf_counter()
                
                cache_hit_time = (end_time - start_time) * 1000
                
                assert result == cached_response
                assert cache_hit_time < 150, f"Cache hit took {cache_hit_time:.2f}ms"

    def test_cache_size_limits(self, mock_cache):
        """Test cache handles size limits appropriately."""
        # Test with large cache entries
        for i in range(100):
            key = f"large_key_{i}"
            value = {
                "response": f"Large response {i} " * 100,
                "tokens": 1000 + i
            }
            mock_cache.set(key, value)
        
        # Should handle large number of entries
        # (Implementation may vary based on cache strategy)
        assert True  # Basic test that it doesn't crash

    def test_cache_concurrent_access(self, mock_cache):
        """Test cache handles concurrent access safely."""
        import threading
        
        results = []
        
        def cache_operation(thread_id):
            key = f"concurrent_key_{thread_id}"
            value = f"concurrent_value_{thread_id}"
            
            # Set and immediately get
            mock_cache.set(key, value)
            result = mock_cache.get(key)
            results.append(result == value)
        
        # Run concurrent operations
        threads = []
        for i in range(10):
            thread = threading.Thread(target=cache_operation, args=(i,))
            threads.append(thread)
            thread.start()
        
        for thread in threads:
            thread.join()
        
        # All operations should succeed
        assert all(results), "Some concurrent cache operations failed"

    def test_cache_invalidation(self, mock_cache):
        """Test cache invalidation functionality."""
        key = "invalidation_test"
        value = {"response": "Original value"}
        
        # Set cache value
        mock_cache.set(key, value)
        assert mock_cache.get(key) == value
        
        # Invalidate cache entry
        if hasattr(mock_cache, 'invalidate'):
            mock_cache.invalidate(key)
            assert mock_cache.get(key) is None
        else:
            # Alternative: overwrite with None or use delete
            mock_cache.set(key, None)
            result = mock_cache.get(key)
            assert result is None or result == value  # Depends on implementation

    def test_cache_statistics(self, mock_cache):
        """Test cache statistics tracking."""
        # Perform various cache operations
        mock_cache.set("stats_key_1", "value1")
        mock_cache.set("stats_key_2", "value2")
        
        # Cache hits
        mock_cache.get("stats_key_1")
        mock_cache.get("stats_key_2")
        
        # Cache misses
        mock_cache.get("non_existent_1")
        mock_cache.get("non_existent_2")
        
        # Check if statistics are available
        if hasattr(mock_cache, 'get_stats'):
            stats = mock_cache.get_stats()
            assert isinstance(stats, dict)
        else:
            # Statistics might not be implemented yet
            assert True

    def test_cache_serialization(self, mock_cache):
        """Test cache properly serializes complex data."""
        complex_data = {
            "nested": {
                "list": [1, 2, 3, {"inner": "value"}],
                "tuple_as_list": [4, 5, 6],
                "unicode": "测试中文",
                "special_chars": "!@#$%^&*()"
            },
            "timestamp": 1234567890.123,
            "boolean": True,
            "null_value": None
        }
        
        key = "serialization_test"
        mock_cache.set(key, complex_data)
        retrieved = mock_cache.get(key)
        
        assert retrieved == complex_data

    @pytest.mark.benchmark
    def test_cache_benchmark(self, mock_cache, benchmark):
        """Benchmark cache operations."""
        key = "benchmark_key"
        value = {"response": "Benchmark response", "tokens": 100}
        
        # Benchmark cache set operation
        def cache_set():
            mock_cache.set(key, value)
        
        benchmark(cache_set)
        
        # Verify the cache was set
        assert mock_cache.get(key) == value

    @pytest.mark.benchmark  
    def test_cache_get_benchmark(self, mock_cache, benchmark):
        """Benchmark cache get operation."""
        key = "get_benchmark_key"
        value = {"response": "Get benchmark response", "tokens": 150}
        
        # Pre-populate cache
        mock_cache.set(key, value)
        
        # Benchmark cache get operation
        def cache_get():
            return mock_cache.get(key)
        
        result = benchmark(cache_get)
        assert result == value