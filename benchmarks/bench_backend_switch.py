"""Benchmark backend switching overhead."""

import pytest
import time
from unittest.mock import patch, MagicMock
from . import BenchmarkRunner
from claudette.backends import FallbackManager
from claudette.config import Config

class TestBackendSwitchBenchmark:
    """Benchmark backend switching to ensure < 40ms overhead."""
    
    @pytest.fixture
    def mock_backends(self):
        """Create mock backends for testing."""
        openai_backend = MagicMock()
        openai_backend.name = "openai"
        openai_backend.is_available.return_value = True
        openai_backend.chat_completion.return_value = "OpenAI response"
        
        claude_backend = MagicMock()
        claude_backend.name = "claude"
        claude_backend.is_available.return_value = True
        claude_backend.chat_completion.return_value = "Claude response"
        
        mistral_backend = MagicMock()
        mistral_backend.name = "mistral"
        mistral_backend.is_available.return_value = True
        mistral_backend.chat_completion.return_value = "Mistral response"
        
        return {
            'openai': openai_backend,
            'claude': claude_backend,
            'mistral': mistral_backend
        }
    
    @pytest.fixture
    def fallback_manager(self, mock_backends):
        """Create fallback manager with mock backends."""
        config = Config()
        manager = FallbackManager(config)
        
        # Inject mock backends
        manager.backends = mock_backends
        
        return manager
    
    @pytest.mark.benchmark
    def test_single_backend_switch_latency(self, benchmark, fallback_manager):
        """Benchmark single backend switch operation."""
        def switch_backend():
            return fallback_manager.get_backend("openai")
        
        result = benchmark(switch_backend)
        assert result is not None
    
    @pytest.mark.benchmark
    def test_multiple_backend_switches(self, benchmark, fallback_manager):
        """Benchmark multiple consecutive backend switches."""
        backends = ["openai", "claude", "mistral", "openai", "claude"]
        
        def switch_multiple():
            results = []
            for backend_name in backends:
                backend = fallback_manager.get_backend(backend_name)
                results.append(backend)
            return results
        
        results = benchmark(switch_multiple)
        assert len(results) == len(backends)
    
    def test_backend_switch_overhead_threshold(self, fallback_manager):
        """Test backend switching overhead is under 40ms."""
        runner = BenchmarkRunner()
        
        # Test switching between different backends
        backend_sequence = ["openai", "claude", "mistral", "openai", "claude"] * 4  # 20 switches
        
        runner.start_monitoring()
        
        for backend_name in backend_sequence:
            backend = fallback_manager.get_backend(backend_name)
            assert backend is not None
        
        metrics = runner.stop_monitoring()
        
        # Calculate average time per switch
        avg_switch_time = metrics['duration_ms'] / len(backend_sequence)
        
        assert avg_switch_time < 2.0, (  # 40ms / 20 switches = 2ms per switch
            f"Average backend switch took {avg_switch_time:.2f}ms, should be < 2ms"
        )
        
        # Total time for 20 switches should be under 40ms
        assert metrics['duration_ms'] < 40, (
            f"20 backend switches took {metrics['duration_ms']:.2f}ms, should be < 40ms"
        )
    
    def test_backend_initialization_overhead(self, mock_backends):
        """Test backend initialization overhead."""
        config = Config()
        
        runner = BenchmarkRunner()
        runner.start_monitoring()
        
        # Initialize fallback manager (should initialize backends)
        manager = FallbackManager(config)
        manager.backends = mock_backends  # Inject mocks
        
        metrics = runner.stop_monitoring()
        
        # Initialization should be fast
        assert metrics['duration_ms'] < 20, (
            f"Backend initialization took {metrics['duration_ms']:.2f}ms, should be < 20ms"
        )
    
    def test_concurrent_backend_access_performance(self, fallback_manager):
        """Test performance under concurrent backend access."""
        import threading
        import queue
        
        result_queue = queue.Queue()
        
        def backend_access_worker():
            start_time = time.perf_counter()
            
            # Perform multiple backend switches
            for backend_name in ["openai", "claude", "mistral"] * 3:
                backend = fallback_manager.get_backend(backend_name)
                assert backend is not None
            
            end_time = time.perf_counter()
            result_queue.put((end_time - start_time) * 1000)  # Convert to ms
        
        # Start multiple threads
        threads = []
        for _ in range(5):
            thread = threading.Thread(target=backend_access_worker)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # Collect results
        times = []
        while not result_queue.empty():
            times.append(result_queue.get())
        
        # Each thread should complete within reasonable time
        for time_ms in times:
            assert time_ms < 50, (
                f"Concurrent backend access took {time_ms:.2f}ms, should be < 50ms"
            )
    
    def test_backend_caching_performance(self, fallback_manager):
        """Test backend caching improves performance."""
        # First access (might involve initialization)
        runner1 = BenchmarkRunner()
        runner1.start_monitoring()
        
        backend1 = fallback_manager.get_backend("openai")
        
        metrics1 = runner1.stop_monitoring()
        
        # Second access (should be cached)
        runner2 = BenchmarkRunner()
        runner2.start_monitoring()
        
        backend2 = fallback_manager.get_backend("openai")
        
        metrics2 = runner2.stop_monitoring()
        
        # Both should return same backend
        assert backend1 is backend2
        
        # Second access should be faster or at least not significantly slower
        assert metrics2['duration_ms'] <= metrics1['duration_ms'] * 1.5, (
            f"Cached access ({metrics2['duration_ms']:.2f}ms) should not be much slower "
            f"than first access ({metrics1['duration_ms']:.2f}ms)"
        )
    
    def test_backend_switch_memory_usage(self, fallback_manager):
        """Test backend switching doesn't cause memory leaks."""
        runner = BenchmarkRunner()
        
        # Get baseline memory
        baseline_memory = runner.get_current_memory_mb()
        
        # Perform many backend switches
        for _ in range(100):
            for backend_name in ["openai", "claude", "mistral"]:
                backend = fallback_manager.get_backend(backend_name)
                assert backend is not None
        
        # Check memory usage
        final_memory = runner.get_current_memory_mb()
        memory_increase = final_memory - baseline_memory
        
        # Memory increase should be minimal (< 10MB)
        assert memory_increase < 10, (
            f"Backend switching used {memory_increase:.2f}MB additional memory"
        )
    
    @pytest.mark.parametrize("switch_count", [10, 50, 100, 200])
    def test_backend_switch_scaling(self, fallback_manager, switch_count):
        """Test backend switching performance scales linearly."""
        runner = BenchmarkRunner()
        runner.start_monitoring()
        
        # Perform specified number of switches
        for i in range(switch_count):
            backend_name = ["openai", "claude", "mistral"][i % 3]
            backend = fallback_manager.get_backend(backend_name)
            assert backend is not None
        
        metrics = runner.stop_monitoring()
        
        # Calculate time per switch
        time_per_switch = metrics['duration_ms'] / switch_count
        
        # Should scale well (< 0.5ms per switch for reasonable counts)
        max_time_per_switch = 0.5
        
        assert time_per_switch < max_time_per_switch, (
            f"Average switch time {time_per_switch:.3f}ms should be < {max_time_per_switch}ms"
        )
    
    def test_fallback_chain_performance(self, mock_backends):
        """Test fallback chain performance when backends fail."""
        # Setup failing backends
        mock_backends["openai"].is_available.return_value = False
        mock_backends["claude"].is_available.return_value = False
        mock_backends["mistral"].is_available.return_value = True  # Only this works
        
        config = Config()
        manager = FallbackManager(config)
        manager.backends = mock_backends
        
        runner = BenchmarkRunner()
        runner.start_monitoring()
        
        # Should try backends in order and find working one
        backend = manager.get_backend("auto")  # Auto-select working backend
        
        metrics = runner.stop_monitoring()
        
        # Fallback chain should complete quickly
        assert metrics['duration_ms'] < 10, (
            f"Fallback chain took {metrics['duration_ms']:.2f}ms, should be < 10ms"
        )
        
        # Should find the working backend
        if backend:
            assert backend.name == "mistral"