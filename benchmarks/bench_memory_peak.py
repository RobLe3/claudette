"""Benchmark memory peak usage."""

import pytest
import psutil
import os
import time
import threading
from unittest.mock import patch, MagicMock
from . import BenchmarkRunner
from claudette.main import main
from claudette.cache import CacheManager as Cache
from claudette.preprocessor import Preprocessor

class TestMemoryPeakBenchmark:
    """Benchmark memory peak usage to ensure RSS < 150 MB under load."""
    
    @pytest.fixture
    def memory_monitor(self):
        """Create memory monitoring instance."""
        return BenchmarkRunner()
    
    def test_baseline_memory_usage(self, memory_monitor):
        """Test baseline memory usage of claudette components."""
        baseline_memory = memory_monitor.get_current_memory_mb()
        
        # Import and initialize core components
        from claudette.config import Config
        from claudette.backends import OpenAIBackend
        
        config = Config()
        
        try:
            backend = OpenAIBackend()
        except Exception:
            # Backend might fail without API key, that's ok for memory test
            pass
        
        current_memory = memory_monitor.get_current_memory_mb()
        initialization_memory = current_memory - baseline_memory
        
        # Core initialization should use minimal memory
        assert initialization_memory < 50, (
            f"Core initialization used {initialization_memory:.2f}MB, should be < 50MB"
        )
    
    @patch('claudette.backends.OpenAI')
    def test_single_operation_memory_usage(self, mock_openai, memory_monitor):
        """Test memory usage for single operation."""
        # Mock OpenAI response
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "Test response"
        mock_response.usage.total_tokens = 100
        mock_client.chat.completions.create.return_value = mock_response
        mock_openai.return_value = mock_client
        
        baseline_memory = memory_monitor.get_current_memory_mb()
        
        # Simulate single operation
        preprocessor = Preprocessor()
        prompt = "Test prompt for memory measurement"
        compressed = preprocessor.compress(prompt)
        
        peak_memory = memory_monitor.get_current_memory_mb()
        memory_usage = peak_memory - baseline_memory
        
        # Single operation should use minimal memory
        assert memory_usage < 20, (
            f"Single operation used {memory_usage:.2f}MB, should be < 20MB"
        )
    
    @patch('claudette.backends.OpenAI')
    def test_multiple_operations_memory_usage(self, mock_openai, memory_monitor):
        """Test memory usage for multiple consecutive operations."""
        # Mock OpenAI response
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "Test response"
        mock_response.usage.total_tokens = 100
        mock_client.chat.completions.create.return_value = mock_response
        mock_openai.return_value = mock_client
        
        baseline_memory = memory_monitor.get_current_memory_mb()
        max_memory = baseline_memory
        
        preprocessor = Preprocessor()
        
        # Perform multiple operations
        for i in range(50):
            prompt = f"Test prompt {i} with some content to process"
            compressed = preprocessor.compress(prompt)
            
            current_memory = memory_monitor.get_current_memory_mb()
            max_memory = max(max_memory, current_memory)
            
            # Check for memory leaks (gradual increase)
            if i > 10:  # Allow some ramp-up
                assert current_memory < baseline_memory + 100, (
                    f"Memory leak detected: {current_memory:.2f}MB at operation {i}"
                )
        
        peak_memory_usage = max_memory - baseline_memory
        
        # Multiple operations should not use excessive memory
        assert peak_memory_usage < 150, (
            f"Multiple operations peak memory {peak_memory_usage:.2f}MB, should be < 150MB"
        )
    
    def test_cache_memory_usage(self, memory_monitor):
        """Test cache memory usage under load."""
        import tempfile
        from pathlib import Path
        
        baseline_memory = memory_monitor.get_current_memory_mb()
        
        with tempfile.TemporaryDirectory() as tmpdir:
            cache = Cache(cache_dir=Path(tmpdir))
            
            # Populate cache with many entries
            for i in range(500):
                key = f"cache_memory_test_{i}"
                value = {
                    'content': f"Cache content {i} " * 100,  # ~1.5KB each
                    'tokens': 300 + i,
                    'model': 'gpt-3.5-turbo'
                }
                cache.set(key, value)
                
                # Check memory periodically
                if i % 100 == 0:
                    current_memory = memory_monitor.get_current_memory_mb()
                    memory_usage = current_memory - baseline_memory
                    
                    # Should not exceed reasonable limits
                    assert memory_usage < 150, (
                        f"Cache memory usage {memory_usage:.2f}MB at {i} entries"
                    )
        
        # Check memory after cache operations
        final_memory = memory_monitor.get_current_memory_mb()
        total_usage = final_memory - baseline_memory
        
        assert total_usage < 150, (
            f"Cache operations total memory {total_usage:.2f}MB, should be < 150MB"
        )
    
    def test_concurrent_operations_memory_usage(self, memory_monitor):
        """Test memory usage under concurrent operations."""
        import threading
        import queue
        
        baseline_memory = memory_monitor.get_current_memory_mb()
        max_memory = baseline_memory
        memory_lock = threading.Lock()
        
        def memory_intensive_worker(worker_id, result_queue):
            nonlocal max_memory
            
            try:
                preprocessor = Preprocessor()
                
                # Perform operations
                for i in range(20):
                    prompt = f"Worker {worker_id} prompt {i} with content " * 50
                    compressed = preprocessor.compress(prompt)
                    
                    # Update max memory safely
                    with memory_lock:
                        current_memory = memory_monitor.get_current_memory_mb()
                        max_memory = max(max_memory, current_memory)
                
                result_queue.put(f"Worker {worker_id} completed")
                
            except Exception as e:
                result_queue.put(f"Worker {worker_id} error: {e}")
        
        # Start multiple worker threads
        threads = []
        result_queue = queue.Queue()
        
        for worker_id in range(5):
            thread = threading.Thread(
                target=memory_intensive_worker, 
                args=(worker_id, result_queue)
            )
            threads.append(thread)
            thread.start()
        
        # Monitor memory during concurrent execution
        monitoring_active = True
        
        def memory_monitor_thread():
            nonlocal max_memory
            while monitoring_active:
                with memory_lock:
                    current_memory = memory_monitor.get_current_memory_mb()
                    max_memory = max(max_memory, current_memory)
                time.sleep(0.1)
        
        monitor_thread = threading.Thread(target=memory_monitor_thread)
        monitor_thread.start()
        
        # Wait for workers to complete
        for thread in threads:
            thread.join()
        
        monitoring_active = False
        monitor_thread.join()
        
        # Check results
        results = []
        while not result_queue.empty():
            results.append(result_queue.get())
        
        peak_memory_usage = max_memory - baseline_memory
        
        # Concurrent operations should not exceed memory limit
        assert peak_memory_usage < 150, (
            f"Concurrent operations peak memory {peak_memory_usage:.2f}MB, should be < 150MB"
        )
        
        # All workers should complete successfully
        for result in results:
            assert "completed" in result, f"Worker failed: {result}"
    
    def test_large_data_processing_memory(self, memory_monitor):
        """Test memory usage when processing large data."""
        baseline_memory = memory_monitor.get_current_memory_mb()
        
        preprocessor = Preprocessor()
        
        # Create large text data
        large_texts = []
        for i in range(10):
            # Each text ~50KB
            large_text = f"Large text content for memory testing {i}. " * 2000
            large_texts.append(large_text)
        
        max_memory = baseline_memory
        
        # Process large texts
        for i, text in enumerate(large_texts):
            compressed = preprocessor.compress(text)
            
            current_memory = memory_monitor.get_current_memory_mb()
            max_memory = max(max_memory, current_memory)
            
            # Should not accumulate memory excessively
            memory_usage = current_memory - baseline_memory
            assert memory_usage < 150, (
                f"Large data processing memory {memory_usage:.2f}MB at item {i}"
            )
        
        peak_memory_usage = max_memory - baseline_memory
        
        assert peak_memory_usage < 150, (
            f"Large data processing peak memory {peak_memory_usage:.2f}MB, should be < 150MB"
        )
    
    def test_memory_cleanup_after_operations(self, memory_monitor):
        """Test memory is properly cleaned up after operations."""
        import gc
        
        baseline_memory = memory_monitor.get_current_memory_mb()
        
        # Perform memory-intensive operations
        def memory_intensive_operations():
            preprocessor = Preprocessor()
            cache_data = []
            
            for i in range(100):
                # Create temporary data
                text = f"Temporary text data {i} " * 100
                compressed = preprocessor.compress(text)
                cache_data.append({
                    'original': text,
                    'compressed': compressed,
                    'metadata': {'id': i, 'timestamp': time.time()}
                })
            
            return len(cache_data)
        
        # Execute operations
        result_count = memory_intensive_operations()
        
        # Force garbage collection
        gc.collect()
        
        # Allow time for cleanup
        time.sleep(0.5)
        
        # Check memory after cleanup
        final_memory = memory_monitor.get_current_memory_mb()
        memory_retention = final_memory - baseline_memory
        
        # Memory should return close to baseline
        assert memory_retention < 50, (
            f"Memory retention {memory_retention:.2f}MB after cleanup, should be < 50MB"
        )
        
        assert result_count == 100, "Operations should complete successfully"
    
    @pytest.mark.parametrize("load_level", [10, 50, 100])
    def test_memory_usage_scaling(self, memory_monitor, load_level):
        """Test memory usage scales reasonably with load."""
        baseline_memory = memory_monitor.get_current_memory_mb()
        
        preprocessor = Preprocessor()
        
        # Process increasing load
        for i in range(load_level):
            text = f"Scaling test text {i} with content " * 50
            compressed = preprocessor.compress(text)
        
        current_memory = memory_monitor.get_current_memory_mb()
        memory_usage = current_memory - baseline_memory
        
        # Memory should scale reasonably (not linearly with load)
        max_expected_memory = min(150, 10 + (load_level * 0.5))
        
        assert memory_usage < max_expected_memory, (
            f"Memory usage {memory_usage:.2f}MB for load {load_level}, "
            f"should be < {max_expected_memory:.2f}MB"
        )
    
    def test_memory_under_stress(self, memory_monitor):
        """Test memory usage under stress conditions."""
        baseline_memory = memory_monitor.get_current_memory_mb()
        max_memory = baseline_memory
        
        # Stress test: many rapid operations
        preprocessor = Preprocessor()
        
        start_time = time.time()
        operation_count = 0
        
        # Run for 10 seconds or until memory limit
        while time.time() - start_time < 10:
            text = f"Stress test {operation_count} content " * 20
            compressed = preprocessor.compress(text)
            
            current_memory = memory_monitor.get_current_memory_mb()
            max_memory = max(max_memory, current_memory)
            
            # Stop if approaching memory limit
            if current_memory > baseline_memory + 140:
                break
            
            operation_count += 1
        
        peak_memory_usage = max_memory - baseline_memory
        
        assert peak_memory_usage < 150, (
            f"Stress test peak memory {peak_memory_usage:.2f}MB, should be < 150MB"
        )
        
        # Should handle reasonable number of operations
        assert operation_count > 100, (
            f"Only {operation_count} operations completed under stress"
        )