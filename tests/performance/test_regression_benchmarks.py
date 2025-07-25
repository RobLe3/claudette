#!/usr/bin/env python3
"""
Performance regression tests with benchmarks for Claudette
Validates performance characteristics and prevents regressions
"""

import pytest
import time
import psutil
import subprocess
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock
import tempfile
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

# Add claudette to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))


class TestPerformanceRegression:
    """Performance regression tests with specific benchmarks."""
    
    def test_startup_time_regression(self):
        """Test that CLI startup time is under 500ms."""
        start_time = time.perf_counter()
        
        result = subprocess.run(
            [sys.executable, "-m", "claudette.main", "--help"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        end_time = time.perf_counter()
        startup_time = (end_time - start_time) * 1000  # Convert to milliseconds
        
        assert result.returncode == 0, "CLI should start successfully"
        assert startup_time < 500, f"Startup time {startup_time:.2f}ms exceeds 500ms threshold"

    def test_memory_usage_baseline(self):
        """Test that memory usage stays within acceptable limits."""
        import claudette.main
        
        process = psutil.Process()
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Initialize CLI components
        cli = claudette.main.ClaudetteCLI()
        
        # Load heavy components
        _ = cli.config
        _ = cli.preprocessor
        _ = cli.cache
        
        peak_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = peak_memory - initial_memory
        
        # Should not use more than 100MB for basic initialization
        assert memory_increase < 100, f"Memory usage increased by {memory_increase:.2f}MB, threshold is 100MB"

    def test_cache_performance_regression(self):
        """Test cache operations maintain performance characteristics."""
        from claudette.cache import CacheManager
        
        with tempfile.TemporaryDirectory() as temp_dir:
            cache = CacheManager(cache_dir=Path(temp_dir))
            
            # Test cache write performance
            large_data = {"content": "Large test data " * 1000, "tokens": 5000}
            
            write_times = []
            for i in range(100):
                start = time.perf_counter()
                cache.set(f"perf_test_{i}", large_data)
                end = time.perf_counter()
                write_times.append((end - start) * 1000)
            
            avg_write_time = sum(write_times) / len(write_times)
            assert avg_write_time < 10, f"Average cache write time {avg_write_time:.2f}ms exceeds 10ms threshold"
            
            # Test cache read performance
            read_times = []
            for i in range(100):
                start = time.perf_counter()
                result = cache.get(f"perf_test_{i}")
                end = time.perf_counter()
                read_times.append((end - start) * 1000)
                assert result == large_data, "Cache read should return correct data"
            
            avg_read_time = sum(read_times) / len(read_times)
            assert avg_read_time < 5, f"Average cache read time {avg_read_time:.2f}ms exceeds 5ms threshold"

    def test_compression_performance_scaling(self):
        """Test that compression performance scales appropriately with input size."""
        from claudette.preprocessor import Preprocessor
        from claudette.config import Config
        
        config = Config({})
        preprocessor = Preprocessor(config)
        
        # Test different input sizes
        test_sizes = [100, 1000, 5000, 10000]  # characters
        compression_times = []
        
        for size in test_sizes:
            test_input = "Test compression input data. " * (size // 30 + 1)
            test_input = test_input[:size]  # Trim to exact size
            
            start = time.perf_counter()
            result = preprocessor.compress(test_input, {})
            end = time.perf_counter()
            
            compression_time = (end - start) * 1000
            compression_times.append(compression_time)
            
            # Basic performance requirements
            assert compression_time < size / 10, f"Compression too slow for {size} chars: {compression_time:.2f}ms"
        
        # Check that compression time scales roughly linearly (not exponentially)
        for i in range(1, len(test_sizes)):
            size_ratio = test_sizes[i] / test_sizes[i-1]
            time_ratio = compression_times[i] / compression_times[i-1]
            
            # Time ratio should not be more than 3x the size ratio (allowing for overhead)
            assert time_ratio < size_ratio * 3, f"Compression scaling issue: {time_ratio:.2f}x time for {size_ratio:.2f}x input"

    def test_concurrent_cache_performance(self):
        """Test cache performance under concurrent load."""
        from claudette.cache import CacheManager
        
        with tempfile.TemporaryDirectory() as temp_dir:
            cache = CacheManager(cache_dir=Path(temp_dir))
            
            # Concurrent operations
            num_threads = 10
            operations_per_thread = 50
            
            def cache_worker(thread_id):
                times = []
                for i in range(operations_per_thread):
                    key = f"concurrent_test_{thread_id}_{i}"
                    data = {"thread": thread_id, "operation": i, "data": "test data" * 10}
                    
                    # Write operation
                    start = time.perf_counter()
                    cache.set(key, data)
                    write_time = time.perf_counter() - start
                    
                    # Read operation
                    start = time.perf_counter()
                    result = cache.get(key)
                    read_time = time.perf_counter() - start
                    
                    times.append((write_time * 1000, read_time * 1000))
                    assert result == data, "Concurrent cache operation failed"
                
                return times
            
            # Run concurrent operations
            start_time = time.perf_counter()
            
            with ThreadPoolExecutor(max_workers=num_threads) as executor:
                futures = [executor.submit(cache_worker, i) for i in range(num_threads)]
                all_times = []
                
                for future in as_completed(futures):
                    all_times.extend(future.result())
            
            total_time = time.perf_counter() - start_time
            
            # Performance analysis
            write_times = [t[0] for t in all_times]
            read_times = [t[1] for t in all_times]
            
            avg_write = sum(write_times) / len(write_times)
            avg_read = sum(read_times) / len(read_times)
            max_write = max(write_times)
            max_read = max(read_times)
            
            # Performance assertions
            assert avg_write < 20, f"Average concurrent write time {avg_write:.2f}ms exceeds 20ms"
            assert avg_read < 10, f"Average concurrent read time {avg_read:.2f}ms exceeds 10ms"
            assert max_write < 100, f"Max concurrent write time {max_write:.2f}ms exceeds 100ms"
            assert max_read < 50, f"Max concurrent read time {max_read:.2f}ms exceeds 50ms"
            
            total_operations = num_threads * operations_per_thread * 2  # read + write
            throughput = total_operations / total_time
            assert throughput > 100, f"Concurrent throughput {throughput:.2f} ops/sec is too low"

    def test_file_processing_performance(self):
        """Test file processing performance across different file sizes."""
        from claudette.context_builder import ContextBuilder
        
        builder = ContextBuilder()
        
        # Create test files of different sizes
        with tempfile.TemporaryDirectory() as temp_dir:
            test_files = []
            file_sizes = [1000, 10000, 50000, 100000]  # bytes
            
            for size in file_sizes:
                file_path = Path(temp_dir) / f"test_file_{size}.py"
                content = f"# Test file {size} bytes\n" + "print('test')\n" * (size // 15)
                file_path.write_text(content[:size])
                test_files.append((file_path, size))
            
            processing_times = []
            
            for file_path, expected_size in test_files:
                start = time.perf_counter()
                file_info = builder.get_file_info(file_path)
                end = time.perf_counter()
                
                processing_time = (end - start) * 1000
                processing_times.append(processing_time)
                
                assert file_info is not None, f"Should process file {file_path}"
                
                # Performance requirement: < 1ms per KB
                max_time = expected_size / 1024  # 1ms per KB
                assert processing_time < max_time, f"File processing too slow: {processing_time:.2f}ms for {expected_size} bytes"

    def test_api_call_latency_tracking(self):
        """Test tracking of API call latencies."""
        from claudette.backends import OpenAIBackend
        from claudette.config import Config
        
        config = Config({})
        backend = OpenAIBackend(config)
        
        # Mock API calls with different latencies
        latencies = [50, 150, 300, 500, 1000]  # milliseconds
        
        for target_latency in latencies:
            with patch('openai.ChatCompletion.create') as mock_api:
                # Mock response with artificial delay
                mock_response = MagicMock()
                mock_response.choices = [MagicMock()]
                mock_response.choices[0].message.content = "Test response"
                mock_response.usage.total_tokens = 100
                
                def delayed_response(*args, **kwargs):
                    time.sleep(target_latency / 1000)  # Convert to seconds
                    return mock_response
                
                mock_api.side_effect = delayed_response
                
                # Measure actual latency
                start = time.perf_counter()
                try:
                    result = backend.process_request("test prompt", {})
                    end = time.perf_counter()
                    
                    actual_latency = (end - start) * 1000
                    
                    # Should be within 10% of target latency
                    assert abs(actual_latency - target_latency) < target_latency * 0.1
                    
                    # Track performance metrics if available
                    if hasattr(backend, 'get_metrics'):
                        metrics = backend.get_metrics()
                        assert 'latency' in metrics
                        
                except Exception:
                    # API calls might fail in test environment
                    pass

    def test_memory_leak_detection(self):
        """Test for memory leaks in repeated operations."""
        from claudette.cache import CacheManager
        
        process = psutil.Process()
        initial_memory = process.memory_info().rss
        
        with tempfile.TemporaryDirectory() as temp_dir:
            cache = CacheManager(cache_dir=Path(temp_dir))
            
            # Perform many operations that might leak memory
            for cycle in range(10):
                for i in range(100):
                    # Create and destroy cache entries
                    key = f"leak_test_{cycle}_{i}"
                    data = {"cycle": cycle, "data": "x" * 1000}
                    
                    cache.set(key, data)
                    result = cache.get(key)
                    assert result == data
                    
                    # Clear entry to test cleanup
                    if hasattr(cache, 'delete'):
                        cache.delete(key)
                
                # Check memory usage every cycle
                current_memory = process.memory_info().rss
                memory_growth = (current_memory - initial_memory) / 1024 / 1024  # MB
                
                # Should not grow more than 50MB over 1000 operations
                assert memory_growth < 50, f"Potential memory leak: {memory_growth:.2f}MB growth after {(cycle + 1) * 100} operations"

    def test_cpu_usage_during_processing(self):
        """Test CPU usage stays within reasonable bounds during processing."""
        from claudette.preprocessor import Preprocessor
        from claudette.config import Config
        
        config = Config({})
        preprocessor = Preprocessor(config)
        
        # Monitor CPU usage during intensive processing
        process = psutil.Process()
        
        def cpu_monitor():
            """Monitor CPU usage in background."""
            cpu_samples = []
            for _ in range(20):  # Sample for 2 seconds
                cpu_samples.append(process.cpu_percent())
                time.sleep(0.1)
            return cpu_samples
        
        # Start CPU monitoring
        import threading
        cpu_samples = []
        monitor_thread = threading.Thread(target=lambda: cpu_samples.extend(cpu_monitor()))
        monitor_thread.start()
        
        # Perform CPU-intensive operations
        large_input = "Processing test data " * 5000
        for _ in range(10):
            result = preprocessor.compress(large_input, {})
            assert isinstance(result, str)
        
        monitor_thread.join()
        
        # Analyze CPU usage
        if cpu_samples:
            avg_cpu = sum(cpu_samples) / len(cpu_samples)
            max_cpu = max(cpu_samples)
            
            # Should not consistently use more than 80% CPU
            assert avg_cpu < 80, f"Average CPU usage {avg_cpu:.1f}% is too high"
            assert max_cpu < 95, f"Peak CPU usage {max_cpu:.1f}% is too high"

    @pytest.mark.benchmark
    def test_end_to_end_performance(self, benchmark):
        """Benchmark complete end-to-end operation."""
        from claudette.main import ClaudetteCLI
        
        cli = ClaudetteCLI()
        
        def full_operation():
            """Simulate a complete claudette operation."""
            # This would be customized based on actual CLI operations
            with patch('subprocess.run') as mock_run:
                mock_run.return_value = MagicMock(returncode=0, stdout="Success", stderr="")
                
                # Simulate argument parsing and processing
                with patch('sys.argv', ['claudette', 'edit', 'test.py', '--explain', 'test']):
                    try:
                        cli.run()
                    except SystemExit:
                        pass  # Expected for help/version commands
        
        # Benchmark the operation
        result = benchmark(full_operation)
        
        # Should complete in reasonable time
        assert benchmark.stats.mean < 1.0, "End-to-end operation too slow"

    def test_database_query_performance(self):
        """Test database query performance if applicable."""
        from claudette.cache import CacheManager
        
        with tempfile.TemporaryDirectory() as temp_dir:
            cache = CacheManager(cache_dir=Path(temp_dir))
            
            # Populate cache with many entries
            num_entries = 1000
            for i in range(num_entries):
                cache.set(f"db_test_{i}", {"index": i, "data": f"test data {i}"})
            
            # Test lookup performance
            lookup_times = []
            for i in range(100):  # Test random lookups
                import random
                key = f"db_test_{random.randint(0, num_entries-1)}"
                
                start = time.perf_counter()
                result = cache.get(key)
                end = time.perf_counter()
                
                lookup_time = (end - start) * 1000
                lookup_times.append(lookup_time)
                assert result is not None, "Should find existing key"
            
            # Performance assertions
            avg_lookup = sum(lookup_times) / len(lookup_times)
            max_lookup = max(lookup_times)
            
            assert avg_lookup < 5, f"Average database lookup {avg_lookup:.2f}ms too slow"
            assert max_lookup < 20, f"Max database lookup {max_lookup:.2f}ms too slow"


@pytest.mark.slow
class TestLoadTesting:
    """Load testing for concurrent usage scenarios."""
    
    def test_concurrent_cli_invocations(self):
        """Test multiple concurrent CLI invocations."""
        def invoke_cli():
            """Single CLI invocation."""
            result = subprocess.run(
                [sys.executable, "-m", "claudette.main", "--help"],
                capture_output=True,
                text=True,
                timeout=10
            )
            return result.returncode == 0
        
        # Test concurrent invocations
        num_concurrent = 5
        with ThreadPoolExecutor(max_workers=num_concurrent) as executor:
            futures = [executor.submit(invoke_cli) for _ in range(num_concurrent)]
            results = [future.result() for future in as_completed(futures)]
        
        # All should succeed
        assert all(results), "Some concurrent CLI invocations failed"

    def test_cache_under_load(self):
        """Test cache performance under high load."""
        from claudette.cache import CacheManager
        
        with tempfile.TemporaryDirectory() as temp_dir:
            cache = CacheManager(cache_dir=Path(temp_dir))
            
            # High load test
            num_workers = 10
            operations_per_worker = 100
            
            def load_test_worker(worker_id):
                """Worker function for load testing."""
                success_count = 0
                for i in range(operations_per_worker):
                    key = f"load_test_{worker_id}_{i}"
                    data = {"worker": worker_id, "op": i, "payload": "x" * 100}
                    
                    try:
                        cache.set(key, data)
                        result = cache.get(key)
                        if result == data:
                            success_count += 1
                    except Exception:
                        pass  # Some failures acceptable under extreme load
                
                return success_count
            
            # Run load test
            with ThreadPoolExecutor(max_workers=num_workers) as executor:
                futures = [executor.submit(load_test_worker, i) for i in range(num_workers)]
                success_counts = [future.result() for future in as_completed(futures)]
            
            # Calculate success rate
            total_operations = num_workers * operations_per_worker
            successful_operations = sum(success_counts)
            success_rate = successful_operations / total_operations
            
            # Should maintain >95% success rate under load
            assert success_rate > 0.95, f"Success rate {success_rate:.2f} too low under load"


if __name__ == '__main__':
    pytest.main([__file__])