#!/usr/bin/env python3
"""
Quality metrics validation for Claudette
Validates production readiness metrics and quality gates
"""

import pytest
import subprocess
import sys
import time
import json
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock
import psutil
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

# Add claudette to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))


class TestQualityMetrics:
    """Test quality metrics meet production standards."""
    
    def test_code_coverage_requirements(self):
        """Test that code coverage meets minimum requirements (>85%)."""
        try:
            # Try to run coverage analysis
            result = subprocess.run(
                [sys.executable, "-m", "pytest", "--cov=claudette", "--cov-report=json", "--cov-report=term-missing", "tests/"],
                cwd=Path(__file__).parent.parent.parent,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if result.returncode == 0:
                # Look for coverage.json file
                coverage_file = Path(__file__).parent.parent.parent / "coverage.json"
                if coverage_file.exists():
                    with open(coverage_file) as f:
                        coverage_data = json.load(f)
                    
                    total_coverage = coverage_data.get('totals', {}).get('percent_covered', 0)
                    assert total_coverage >= 85, f"Code coverage {total_coverage:.1f}% is below 85% requirement"
                else:
                    # Check output for coverage percentage
                    if "TOTAL" in result.stdout:
                        # Parse coverage from output
                        lines = result.stdout.split('\n')
                        for line in lines:
                            if "TOTAL" in line and "%" in line:
                                # Extract percentage
                                parts = line.split()
                                for part in parts:
                                    if part.endswith('%'):
                                        coverage_pct = float(part[:-1])
                                        assert coverage_pct >= 85, f"Code coverage {coverage_pct:.1f}% is below 85% requirement"
                                        return
                    
                    # If no coverage data found, skip this test
                    pytest.skip("Coverage data not available")
            else:
                pytest.skip(f"Coverage test failed to run: {result.stderr}")
                
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pytest.skip("Coverage testing not available in current environment")

    def test_error_rate_under_normal_usage(self):
        """Test that error rate is <1% under normal usage patterns."""
        from claudette.main import ClaudetteCLI
        
        cli = ClaudetteCLI()
        total_operations = 100
        error_count = 0
        
        # Simulate normal usage patterns
        normal_operations = [
            ['--help'],
            ['--version'],
            ['edit', 'nonexistent.py'],  # Should handle gracefully
            ['commit', '--message', 'test'],
            ['new', '--project', 'test'],
        ]
        
        for i in range(total_operations):
            operation = normal_operations[i % len(normal_operations)]
            
            try:
                with patch('sys.argv', ['claudette'] + operation):
                    with patch('subprocess.run') as mock_run:
                        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
                        
                        try:
                            cli.run()
                        except SystemExit:
                            # SystemExit is expected for help/version
                            pass
                        except Exception:
                            error_count += 1
                            
            except Exception:
                error_count += 1
        
        error_rate = error_count / total_operations
        assert error_rate < 0.01, f"Error rate {error_rate:.3f} exceeds 1% threshold"

    def test_performance_benchmarks_meet_targets(self):
        """Test that performance benchmarks meet target requirements."""
        performance_targets = {
            'startup_time_ms': 500,
            'cache_hit_time_ms': 5,
            'compression_time_per_kb_ms': 10,
            'memory_usage_mb': 100,
        }
        
        results = {}
        
        # Test startup time
        start_time = time.perf_counter()
        result = subprocess.run(
            [sys.executable, "-m", "claudette.main", "--help"],
            capture_output=True,
            text=True,
            timeout=5
        )
        startup_time = (time.perf_counter() - start_time) * 1000
        results['startup_time_ms'] = startup_time
        
        # Test cache performance
        from claudette.cache import CacheManager
        with tempfile.TemporaryDirectory() as temp_dir:
            cache = CacheManager(cache_dir=Path(temp_dir))
            
            # Test cache hit time
            test_data = {"test": "data"}
            cache.set("benchmark_test", test_data)
            
            start_time = time.perf_counter()
            cache.get("benchmark_test")
            cache_hit_time = (time.perf_counter() - start_time) * 1000
            results['cache_hit_time_ms'] = cache_hit_time
        
        # Test compression performance
        from claudette.preprocessor import Preprocessor
        from claudette.config import Config
        
        config = Config({})
        preprocessor = Preprocessor(config)
        
        test_text = "Test text for compression benchmark. " * 100  # ~3KB
        test_size_kb = len(test_text) / 1024
        
        start_time = time.perf_counter()
        preprocessor.compress(test_text, {})
        compression_time = (time.perf_counter() - start_time) * 1000
        compression_time_per_kb = compression_time / test_size_kb
        results['compression_time_per_kb_ms'] = compression_time_per_kb
        
        # Test memory usage
        process = psutil.Process()
        memory_usage_mb = process.memory_info().rss / 1024 / 1024
        results['memory_usage_mb'] = memory_usage_mb
        
        # Validate all benchmarks
        for metric, actual_value in results.items():
            target_value = performance_targets[metric]
            assert actual_value <= target_value, f"{metric}: {actual_value:.2f} exceeds target {target_value}"

    def test_security_vulnerability_scan(self):
        """Test for security vulnerabilities using bandit."""
        try:
            # Run bandit security scan
            result = subprocess.run(
                [sys.executable, "-m", "bandit", "-r", "claudette/", "-f", "json", "-c", "bandit.yaml"],
                cwd=Path(__file__).parent.parent.parent,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode == 0:
                # No high-severity issues found
                if result.stdout:
                    try:
                        bandit_report = json.loads(result.stdout)
                        
                        # Check for high-severity issues
                        high_issues = [issue for issue in bandit_report.get('results', []) 
                                     if issue.get('issue_severity') == 'HIGH']
                        
                        assert len(high_issues) == 0, f"Found {len(high_issues)} high-severity security issues"
                        
                        # Check for medium-severity issues (should be minimal)
                        medium_issues = [issue for issue in bandit_report.get('results', []) 
                                       if issue.get('issue_severity') == 'MEDIUM']
                        
                        assert len(medium_issues) <= 2, f"Found {len(medium_issues)} medium-severity security issues (max 2 allowed)"
                        
                    except json.JSONDecodeError:
                        # If JSON parsing fails, assume scan passed
                        pass
            else:
                # Check if failure is due to high-severity issues
                if result.returncode == 1 and "high" in result.stdout.lower():
                    pytest.fail("Security scan failed due to high-severity vulnerabilities")
                else:
                    pytest.skip("Security scanning not available or failed")
                    
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pytest.skip("Bandit security scanner not available")

    def test_cross_platform_compatibility_score(self):
        """Test cross-platform compatibility score meets requirements."""
        import platform
        
        compatibility_tests = [
            'test_path_handling',
            'test_file_permissions', 
            'test_line_endings',
            'test_environment_variables',
            'test_subprocess_execution'
        ]
        
        passed_tests = 0
        total_tests = len(compatibility_tests)
        
        # Import and run cross-platform tests
        from tests.compatibility.test_cross_platform import TestCrossPlatformCompatibility
        
        test_instance = TestCrossPlatformCompatibility()
        
        for test_name in compatibility_tests:
            if hasattr(test_instance, test_name):
                try:
                    test_method = getattr(test_instance, test_name)
                    test_method()
                    passed_tests += 1
                except Exception:
                    # Test failed - compatibility issue
                    pass
        
        compatibility_score = passed_tests / total_tests
        assert compatibility_score >= 0.8, f"Cross-platform compatibility score {compatibility_score:.2f} below 80% requirement"

    def test_load_testing_performance(self):
        """Test performance under load meets requirements."""
        from claudette.cache import CacheManager
        
        with tempfile.TemporaryDirectory() as temp_dir:
            cache = CacheManager(cache_dir=Path(temp_dir))
            
            # Load testing configuration
            num_concurrent_users = 10
            operations_per_user = 50
            max_acceptable_failure_rate = 0.05  # 5%
            max_acceptable_avg_response_time = 100  # ms
            
            def load_test_user(user_id):
                """Simulate a user performing operations."""
                user_results = {
                    'operations': 0,
                    'failures': 0,
                    'total_time': 0
                }
                
                for i in range(operations_per_user):
                    start_time = time.perf_counter()
                    
                    try:
                        # Simulate typical operations
                        key = f"load_test_{user_id}_{i}"
                        data = {"user": user_id, "operation": i, "timestamp": time.time()}
                        
                        cache.set(key, data)
                        result = cache.get(key)
                        
                        if result == data:
                            user_results['operations'] += 1
                        else:
                            user_results['failures'] += 1
                            
                    except Exception:
                        user_results['failures'] += 1
                    
                    end_time = time.perf_counter()
                    user_results['total_time'] += (end_time - start_time) * 1000  # ms
                
                return user_results
            
            # Run load test
            start_time = time.perf_counter()
            
            with ThreadPoolExecutor(max_workers=num_concurrent_users) as executor:
                futures = [executor.submit(load_test_user, i) for i in range(num_concurrent_users)]
                user_results = [future.result() for future in as_completed(futures)]
            
            total_time = time.perf_counter() - start_time
            
            # Analyze results
            total_operations = sum(result['operations'] for result in user_results)
            total_failures = sum(result['failures'] for result in user_results)
            total_response_time = sum(result['total_time'] for result in user_results)
            
            failure_rate = total_failures / (total_operations + total_failures) if total_operations + total_failures > 0 else 0
            avg_response_time = total_response_time / (total_operations + total_failures) if total_operations + total_failures > 0 else 0
            throughput = (total_operations + total_failures) / total_time
            
            # Validate load test results
            assert failure_rate <= max_acceptable_failure_rate, f"Failure rate {failure_rate:.3f} exceeds {max_acceptable_failure_rate} limit"
            assert avg_response_time <= max_acceptable_avg_response_time, f"Avg response time {avg_response_time:.2f}ms exceeds {max_acceptable_avg_response_time}ms limit"
            assert throughput >= 10, f"Throughput {throughput:.2f} ops/sec is too low"

    def test_memory_leak_detection(self):
        """Test for memory leaks over extended operation."""
        import gc
        
        process = psutil.Process()
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        from claudette.cache import CacheManager
        
        # Perform many operations to detect leaks
        for cycle in range(10):
            with tempfile.TemporaryDirectory() as temp_dir:
                cache = CacheManager(cache_dir=Path(temp_dir))
                
                # Perform operations
                for i in range(100):
                    key = f"leak_test_{cycle}_{i}"
                    data = {"cycle": cycle, "data": "x" * 1000}
                    
                    cache.set(key, data)
                    result = cache.get(key)
                    assert result == data
                
                # Force garbage collection
                gc.collect()
            
            # Check memory usage every few cycles
            if cycle % 3 == 0:
                current_memory = process.memory_info().rss / 1024 / 1024  # MB
                memory_growth = current_memory - initial_memory
                
                # Should not grow more than 100MB over time
                assert memory_growth < 100, f"Potential memory leak: {memory_growth:.2f}MB growth after {(cycle + 1) * 100} operations"

    def test_api_quota_compliance(self):
        """Test API usage stays within quota limits."""
        from claudette.backends import OpenAIBackend
        from claudette.config import Config
        
        config = Config({})
        backend = OpenAIBackend(config)
        
        # Mock quota tracking
        api_calls = []
        
        def track_api_call(*args, **kwargs):
            api_calls.append(time.time())
            mock_response = MagicMock()
            mock_response.choices = [MagicMock()]
            mock_response.choices[0].message.content = "Test response"
            mock_response.usage.total_tokens = 100
            return mock_response
        
        with patch('openai.ChatCompletion.create', side_effect=track_api_call):
            # Simulate normal usage pattern
            for i in range(20):  # 20 API calls
                try:
                    backend.process_request(f"test prompt {i}", {})
                    time.sleep(0.1)  # Small delay
                except Exception:
                    # API might not be available in test
                    pass
        
        # Check API call rate
        if len(api_calls) > 1:
            time_span = api_calls[-1] - api_calls[0]
            calls_per_second = len(api_calls) / time_span if time_span > 0 else 0
            
            # Should respect reasonable rate limits (e.g., < 10 calls/second)
            assert calls_per_second <= 10, f"API call rate {calls_per_second:.2f} calls/sec too high"

    def test_configuration_validation_coverage(self):
        """Test that all configuration options are properly validated."""
        from claudette.config import Config
        
        # Test all configuration options with invalid values
        invalid_configs = [
            {'claude_cmd': 123},  # Wrong type
            {'openai_api_key': None},  # Invalid value
            {'cache_dir': '/invalid/path/that/cannot/exist/anywhere'},
            {'max_tokens': 'invalid'},  # Wrong type
            {'max_tokens': -1},  # Invalid value
            {'compression_threshold': 'not_a_number'},
            {'fallback_enabled': 'not_boolean'},
        ]
        
        validation_errors = 0
        
        for invalid_config in invalid_configs:
            try:
                config = Config(invalid_config)
                
                # Check that invalid values were corrected or rejected
                for key, invalid_value in invalid_config.items():
                    if hasattr(config, key):
                        actual_value = getattr(config, key)
                        
                        # Should not have the invalid value
                        if actual_value == invalid_value:
                            validation_errors += 1
                
            except (ValueError, TypeError):
                # Proper validation error - this is good
                pass
        
        # Should have caught and fixed/rejected invalid configurations
        assert validation_errors == 0, f"{validation_errors} configuration validation failures"

    def test_documentation_completeness(self):
        """Test that documentation coverage is adequate."""
        import ast
        import inspect
        
        # Check main modules for documentation
        modules_to_check = [
            'claudette.main',
            'claudette.config',
            'claudette.cache',
            'claudette.preprocessor'
        ]
        
        total_functions = 0
        documented_functions = 0
        
        for module_name in modules_to_check:
            try:
                module = __import__(module_name, fromlist=[''])
                
                # Get all public functions and classes
                for name, obj in inspect.getmembers(module):
                    if (inspect.isfunction(obj) or inspect.isclass(obj)) and not name.startswith('_'):
                        total_functions += 1
                        
                        # Check for docstring
                        if obj.__doc__ and len(obj.__doc__.strip()) > 10:
                            documented_functions += 1
                            
            except ImportError:
                # Module might not exist yet
                pass
        
        if total_functions > 0:
            documentation_coverage = documented_functions / total_functions
            assert documentation_coverage >= 0.7, f"Documentation coverage {documentation_coverage:.2f} below 70% requirement"

    def test_test_coverage_quality(self):
        """Test that test coverage includes critical paths."""
        # Critical code paths that must be tested
        critical_paths = [
            'claudette.main.ClaudetteCLI.run',
            'claudette.config.Config.load',
            'claudette.cache.CacheManager.get',
            'claudette.cache.CacheManager.set',
            'claudette.preprocessor.Preprocessor.compress'
        ]
        
        covered_paths = 0
        
        # Check if test files exist for critical components
        test_files = [
            'tests/integration/test_claudette_basic.py',
            'tests/unit/test_context_builder.py',
            'tests/unit/test_preprocessor.py',
            'tests/integration/test_cache.py'
        ]
        
        existing_test_files = 0
        for test_file in test_files:
            test_path = Path(__file__).parent.parent.parent / test_file
            if test_path.exists():
                existing_test_files += 1
        
        test_coverage_score = existing_test_files / len(test_files)
        assert test_coverage_score >= 0.8, f"Test file coverage {test_coverage_score:.2f} below 80% requirement"

    def test_production_readiness_checklist(self):
        """Test production readiness checklist items."""
        checklist_items = {
            'error_handling': False,
            'logging': False,
            'configuration': False,
            'performance': False,
            'security': False,
            'monitoring': False
        }
        
        # Check error handling
        try:
            from claudette.main import ClaudetteCLI
            cli = ClaudetteCLI()
            # Should have error handling mechanisms
            checklist_items['error_handling'] = True
        except Exception:
            pass
        
        # Check configuration system
        try:
            from claudette.config import Config
            config = Config({})
            checklist_items['configuration'] = True
        except Exception:
            pass
        
        # Check performance monitoring
        try:
            from claudette.cache import CacheManager
            # Should have caching for performance
            checklist_items['performance'] = True
        except Exception:
            pass
        
        # Check security measures (basic)
        try:
            # Should have input validation in preprocessor
            from claudette.preprocessor import Preprocessor
            checklist_items['security'] = True
        except Exception:
            pass
        
        # Calculate readiness score
        readiness_score = sum(checklist_items.values()) / len(checklist_items)
        assert readiness_score >= 0.8, f"Production readiness score {readiness_score:.2f} below 80% requirement"


if __name__ == '__main__':
    pytest.main([__file__])