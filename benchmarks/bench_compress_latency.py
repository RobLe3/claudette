"""Benchmark compression latency performance."""

import pytest
import time
from unittest.mock import patch, MagicMock
from . import BenchmarkRunner
from claudette.preprocessor import Preprocessor

class TestCompressionLatencyBenchmark:
    """Benchmark compression latency to ensure < 300ms average."""
    
    @pytest.fixture
    def preprocessor(self):
        """Create preprocessor instance."""
        return Preprocessor()
    
    @pytest.fixture
    def sample_data(self):
        """Create sample data for compression testing."""
        return {
            'small_text': "Hello, world! " * 10,  # ~130 chars
            'medium_text': "This is a medium sized text for compression testing. " * 20,  # ~1060 chars
            'large_text': "This is a large text sample for compression benchmark testing. " * 100,  # ~6300 chars
            'code_sample': '''
def example_function():
    """Example function for testing."""
    data = {
        'key1': 'value1',
        'key2': 'value2',
        'list': [1, 2, 3, 4, 5]
    }
    
    for item in data['list']:
        print(f"Processing item: {item}")
    
    return data
''' * 5  # ~1000+ chars of code
        }
    
    @pytest.mark.benchmark
    def test_small_text_compression_latency(self, benchmark, preprocessor, sample_data):
        """Benchmark small text compression latency."""
        def compress_small():
            return preprocessor.compress(sample_data['small_text'])
        
        result = benchmark(compress_small)
        
        # Verify compression works
        assert len(result) <= len(sample_data['small_text'])
    
    @pytest.mark.benchmark
    def test_medium_text_compression_latency(self, benchmark, preprocessor, sample_data):
        """Benchmark medium text compression latency."""
        def compress_medium():
            return preprocessor.compress(sample_data['medium_text'])
        
        result = benchmark(compress_medium)
        
        # Should achieve some compression
        assert len(result) < len(sample_data['medium_text'])
    
    @pytest.mark.benchmark
    def test_large_text_compression_latency(self, benchmark, preprocessor, sample_data):
        """Benchmark large text compression latency."""
        def compress_large():
            return preprocessor.compress(sample_data['large_text'])
        
        result = benchmark(compress_large)
        
        # Should achieve significant compression
        assert len(result) < len(sample_data['large_text']) * 0.8
    
    @pytest.mark.benchmark
    def test_code_compression_latency(self, benchmark, preprocessor, sample_data):
        """Benchmark code compression latency."""
        def compress_code():
            return preprocessor.compress(sample_data['code_sample'])
        
        result = benchmark(compress_code)
        
        # Code should compress well
        assert len(result) < len(sample_data['code_sample'])
    
    def test_compression_latency_threshold(self, preprocessor, sample_data):
        """Test that compression stays under 300ms threshold."""
        runner = BenchmarkRunner()
        
        # Test all sample data types
        for data_type, text in sample_data.items():
            runner.start_monitoring()
            
            # Perform compression
            compressed = preprocessor.compress(text)
            
            metrics = runner.stop_monitoring()
            
            # Assert latency is under 300ms
            assert metrics['duration_ms'] < 300, (
                f"Compression of {data_type} took {metrics['duration_ms']:.2f}ms, "
                f"should be < 300ms"
            )
            
            # Verify compression actually worked
            assert isinstance(compressed, str)
            assert len(compressed) <= len(text)
    
    @patch('claudette.backends.OpenAI')
    def test_end_to_end_compression_latency(self, mock_openai, preprocessor):
        """Test end-to-end compression latency including API mock."""
        # Mock OpenAI response
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "Compressed response"
        mock_response.usage.total_tokens = 50
        mock_client.chat.completions.create.return_value = mock_response
        mock_openai.return_value = mock_client
        
        large_prompt = "Compress this large prompt. " * 100  # ~2700 chars
        
        runner = BenchmarkRunner()
        runner.start_monitoring()
        
        # Compress the prompt
        compressed = preprocessor.compress(large_prompt)
        
        metrics = runner.stop_monitoring()
        
        # Should be under latency threshold
        assert metrics['duration_ms'] < 300
        assert len(compressed) < len(large_prompt)
    
    def test_compression_memory_usage(self, preprocessor, sample_data):
        """Test compression memory usage stays reasonable."""
        runner = BenchmarkRunner()
        
        # Get baseline memory
        baseline_memory = runner.get_current_memory_mb()
        
        # Compress all samples
        compressed_results = []
        for text in sample_data.values():
            compressed = preprocessor.compress(text)
            compressed_results.append(compressed)
        
        # Check memory usage
        peak_memory = runner.get_current_memory_mb()
        memory_increase = peak_memory - baseline_memory
        
        # Memory increase should be reasonable (< 50MB for this test)
        assert memory_increase < 50, (
            f"Compression used {memory_increase:.2f}MB additional memory"
        )
    
    def test_compression_consistency(self, preprocessor, sample_data):
        """Test compression is consistent across multiple runs."""
        text = sample_data['medium_text']
        
        # Compress same text multiple times
        results = []
        latencies = []
        
        for _ in range(5):
            start_time = time.perf_counter()
            compressed = preprocessor.compress(text)
            end_time = time.perf_counter()
            
            results.append(compressed)
            latencies.append((end_time - start_time) * 1000)  # Convert to ms
        
        # Results should be consistent
        assert all(result == results[0] for result in results), (
            "Compression should be deterministic"
        )
        
        # Latencies should be consistent (no outliers > 2x average)
        avg_latency = sum(latencies) / len(latencies)
        for latency in latencies:
            assert latency < avg_latency * 2, (
                f"Latency {latency:.2f}ms is too high compared to average {avg_latency:.2f}ms"
            )
    
    @pytest.mark.parametrize("text_size", [100, 500, 1000, 2000, 5000])
    def test_compression_scaling(self, preprocessor, text_size):
        """Test compression latency scaling with text size."""
        # Generate text of specific size
        base_text = "This is a sample text for scaling test. "
        repeat_count = max(1, text_size // len(base_text))
        test_text = base_text * repeat_count
        
        runner = BenchmarkRunner()
        runner.start_monitoring()
        
        compressed = preprocessor.compress(test_text)
        
        metrics = runner.stop_monitoring()
        
        # Latency should scale reasonably with size
        # Allow more time for larger texts but still reasonable
        max_latency = min(300, text_size * 0.1)  # 0.1ms per character max
        
        assert metrics['duration_ms'] < max_latency, (
            f"Compression of {text_size} chars took {metrics['duration_ms']:.2f}ms, "
            f"should be < {max_latency:.2f}ms"
        )
        
        # Should achieve compression
        assert len(compressed) <= len(test_text)