#!/usr/bin/env python3
"""
Pytest configuration and fixtures for Claudette tests
Provides shared fixtures and test configuration
"""

import pytest
import tempfile
import sys
import os
from pathlib import Path
from unittest.mock import MagicMock, patch
import psutil
import time

# Add claudette to path for all tests
sys.path.insert(0, str(Path(__file__).parent.parent))


@pytest.fixture
def temp_dir():
    """Provide a temporary directory for tests."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture
def mock_openai_client():
    """Mock OpenAI client for testing."""
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = "Test response"
    mock_response.usage.total_tokens = 100
    mock_client.chat.completions.create.return_value = mock_response
    
    with patch('openai.OpenAI', return_value=mock_client):
        yield mock_client


@pytest.fixture
def mock_subprocess():
    """Mock subprocess for testing CLI interactions."""
    with patch('subprocess.run') as mock_run:
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="Success",
            stderr=""
        )
        yield mock_run


@pytest.fixture
def claudette_config():
    """Provide a test configuration for Claudette."""
    return {
        'claude_cmd': 'claude',
        'openai_api_key': 'sk-test123',
        'fallback_enabled': True,
        'cache_dir': None,  # Will use temp dir
        'compression_threshold': 1000,
        'max_tokens': 4000,
    }


@pytest.fixture
def memory_monitor():
    """Monitor memory usage during tests."""
    process = psutil.Process()
    initial_memory = process.memory_info().rss
    
    yield initial_memory
    
    final_memory = process.memory_info().rss
    memory_growth = (final_memory - initial_memory) / 1024 / 1024  # MB
    
    # Warn if memory growth is excessive
    if memory_growth > 50:  # 50MB threshold
        pytest.warns(UserWarning, f"Test caused {memory_growth:.2f}MB memory growth")


@pytest.fixture
def performance_timer():
    """Time test execution for performance validation."""
    start_time = time.perf_counter()
    
    yield start_time
    
    end_time = time.perf_counter()
    execution_time = (end_time - start_time) * 1000  # ms
    
    # Store execution time for analysis
    if not hasattr(pytest, '_execution_times'):
        pytest._execution_times = []
    pytest._execution_times.append(execution_time)


@pytest.fixture
def isolated_environment(temp_dir, monkeypatch):
    """Provide isolated environment for tests."""
    # Set up isolated environment variables
    monkeypatch.setenv('HOME', str(temp_dir))
    monkeypatch.setenv('CLAUDE_CONFIG_DIR', str(temp_dir / '.claude'))
    
    # Create config directory
    config_dir = temp_dir / '.claude'
    config_dir.mkdir(exist_ok=True)
    
    yield {
        'home_dir': temp_dir,
        'config_dir': config_dir,
    }


@pytest.fixture
def mock_cache_manager(temp_dir):
    """Mock cache manager for testing."""
    from claudette.cache import CacheManager
    
    cache_dir = temp_dir / 'cache'
    cache_dir.mkdir(exist_ok=True)
    
    cache = CacheManager(cache_dir=cache_dir)
    return cache


@pytest.fixture(autouse=True)
def cleanup_test_artifacts():
    """Automatically clean up test artifacts."""
    yield
    
    # Clean up any test files that might have been created
    test_artifacts = [
        'test_output.txt',
        'temp_test_file.py',
        '.test_cache',
    ]
    
    for artifact in test_artifacts:
        artifact_path = Path(artifact)
        if artifact_path.exists():
            try:
                if artifact_path.is_file():
                    artifact_path.unlink()
                elif artifact_path.is_dir():
                    import shutil
                    shutil.rmtree(artifact_path)
            except (PermissionError, OSError):
                pass  # Ignore cleanup failures


# Pytest markers
def pytest_configure(config):
    """Configure pytest markers."""
    config.addinivalue_line(
        "markers", "security: mark test as security validation"
    )
    config.addinivalue_line(
        "markers", "performance: mark test as performance regression"
    )
    config.addinivalue_line(
        "markers", "compatibility: mark test as cross-platform compatibility"
    )
    config.addinivalue_line(
        "markers", "resilience: mark test as error handling and recovery"
    )


# Test collection hooks
def pytest_collection_modifyitems(config, items):
    """Modify test collection to add markers based on file location."""
    for item in items:
        # Add markers based on test file location
        if "security" in str(item.fspath):
            item.add_marker(pytest.mark.security)
        elif "performance" in str(item.fspath):
            item.add_marker(pytest.mark.performance)
        elif "compatibility" in str(item.fspath):
            item.add_marker(pytest.mark.compatibility)
        elif "resilience" in str(item.fspath):
            item.add_marker(pytest.mark.resilience)
        elif "integration" in str(item.fspath):
            item.add_marker(pytest.mark.integration)
        elif "unit" in str(item.fspath):
            item.add_marker(pytest.mark.unit)


# Session-level fixtures
@pytest.fixture(scope="session")
def test_session_info():
    """Provide information about the test session."""
    return {
        'start_time': time.time(),
        'python_version': sys.version,
        'platform': sys.platform,
        'test_count': 0,
        'performance_data': {},
    }


# Hooks for test reporting
def pytest_runtest_setup(item):
    """Setup for each test."""
    # Record test start time for performance tracking
    item._start_time = time.perf_counter()


def pytest_runtest_teardown(item):
    """Teardown for each test."""
    # Record test execution time
    if hasattr(item, '_start_time'):
        execution_time = time.perf_counter() - item._start_time
        
        # Store performance data if needed
        if hasattr(item.session, 'performance_data'):
            item.session.performance_data[item.nodeid] = execution_time


def pytest_sessionfinish(session, exitstatus):
    """Session finish hook for cleanup and reporting."""
    # Generate performance report if enabled
    if hasattr(session, 'performance_data') and session.performance_data:
        slow_tests = [
            (test, time) for test, time in session.performance_data.items()
            if time > 1.0  # Tests taking more than 1 second
        ]
        
        if slow_tests:
            print(f"\n⚠️  Slow tests detected ({len(slow_tests)} tests > 1s):")
            for test, exec_time in sorted(slow_tests, key=lambda x: x[1], reverse=True)[:5]:
                print(f"   {exec_time:.2f}s - {test}")


# Skip conditions for CI/environment specific tests
def pytest_runtest_setup(item):
    """Skip tests based on environment conditions."""
    # Skip network tests if no internet
    if item.get_closest_marker("network"):
        try:
            import socket
            socket.create_connection(("8.8.8.8", 53), timeout=3)
        except OSError:
            pytest.skip("Network not available")
    
    # Skip GPU tests if no GPU
    if item.get_closest_marker("gpu"):
        try:
            import torch
            if not torch.cuda.is_available():
                pytest.skip("GPU not available")
        except ImportError:
            pytest.skip("PyTorch not available")
    
    # Skip slow tests in fast mode
    if item.get_closest_marker("slow") and item.config.getoption("--fast"):
        pytest.skip("Slow test skipped in fast mode")


def pytest_addoption(parser):
    """Add command line options."""
    parser.addoption(
        "--fast", action="store_true", default=False,
        help="Skip slow tests"
    )
    parser.addoption(
        "--security", action="store_true", default=False,
        help="Run only security tests"
    )
    parser.addoption(
        "--performance", action="store_true", default=False,
        help="Run only performance tests"
    )


def pytest_collection_modifyitems(config, items):
    """Filter tests based on command line options."""
    if config.getoption("--security"):
        # Only run security tests
        items[:] = [item for item in items if item.get_closest_marker("security")]
    elif config.getoption("--performance"):
        # Only run performance tests
        items[:] = [item for item in items if item.get_closest_marker("performance")]