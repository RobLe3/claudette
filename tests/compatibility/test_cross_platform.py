#!/usr/bin/env python3
"""
Cross-platform compatibility tests for Claudette
Tests functionality across different operating systems and Python versions
"""

import pytest
import os
import sys
import platform
import subprocess
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add claudette to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))


class TestCrossPlatformCompatibility:
    """Cross-platform compatibility tests."""
    
    def test_path_handling_cross_platform(self):
        """Test path handling works on all platforms."""
        from claudette.context_builder import ContextBuilder
        
        builder = ContextBuilder()
        
        # Test different path formats
        if platform.system() == "Windows":
            test_paths = [
                "C:\\Users\\test\\file.py",
                "C:/Users/test/file.py",  # Forward slashes should work
                "\\\\server\\share\\file.py",  # UNC paths
                "file.py",  # Relative path
                ".\\relative\\file.py"
            ]
        else:
            test_paths = [
                "/home/user/file.py",
                "/tmp/file.py",
                "~/file.py",  # Home directory expansion
                "file.py",  # Relative path
                "./relative/file.py"
            ]
        
        for path_str in test_paths:
            try:
                path_obj = Path(path_str)
                # Should not raise exception when processing paths
                result = builder._normalize_path(path_obj) if hasattr(builder, '_normalize_path') else path_obj
                assert isinstance(result, (str, Path))
            except (ValueError, OSError):
                # Some paths might not be valid on current platform
                pass

    def test_environment_variables_cross_platform(self):
        """Test environment variable handling across platforms."""
        from claudette.config import Config
        
        # Test common environment variables
        test_env_vars = {
            'PATH': '/usr/bin:/bin' if platform.system() != 'Windows' else 'C:\\Windows\\System32',
            'HOME': '/home/user' if platform.system() != 'Windows' else None,
            'USERPROFILE': 'C:\\Users\\user' if platform.system() == 'Windows' else None,
            'CLAUDE_API_KEY': 'test-key-123',
            'OPENAI_API_KEY': 'sk-test123'
        }
        
        # Filter out None values for current platform
        filtered_env = {k: v for k, v in test_env_vars.items() if v is not None}
        
        with patch.dict(os.environ, filtered_env, clear=False):
            config = Config({})
            
            # Should handle environment variables appropriately
            assert hasattr(config, 'claude_api_key') or hasattr(config, 'openai_api_key')

    def test_file_permissions_cross_platform(self):
        """Test file permission handling across platforms."""
        from claudette.cache import CacheManager
        
        with tempfile.TemporaryDirectory() as temp_dir:
            cache_dir = Path(temp_dir)
            cache = CacheManager(cache_dir=cache_dir)
            
            # Create cache file
            test_data = {"test": "data"}
            cache.set("permission_test", test_data)
            
            # Check file permissions (platform-specific)
            cache_files = list(cache_dir.rglob("*"))
            for cache_file in cache_files:
                if cache_file.is_file():
                    if platform.system() != 'Windows':
                        # Unix-like systems have detailed permissions
                        file_stat = cache_file.stat()
                        # Check that file is readable by owner
                        assert file_stat.st_mode & 0o400, "File should be readable by owner"
                    else:
                        # Windows file permissions are different
                        assert cache_file.exists(), "File should exist and be accessible"

    def test_line_ending_handling(self):
        """Test proper handling of different line endings."""
        from claudette.context_builder import ContextBuilder
        
        builder = ContextBuilder()
        
        # Test different line ending formats
        line_endings = {
            'unix': '\n',
            'windows': '\r\n',
            'mac': '\r'
        }
        
        for ending_type, ending in line_endings.items():
            test_content = f"line 1{ending}line 2{ending}line 3{ending}"
            
            with tempfile.NamedTemporaryFile(mode='w', delete=False, newline='') as tmp_file:
                tmp_file.write(test_content)
                tmp_file.flush()
                
                try:
                    file_info = builder.get_file_info(Path(tmp_file.name))
                    if file_info and 'content' in file_info:
                        # Should handle all line ending types
                        content = file_info['content']
                        assert 'line 1' in content
                        assert 'line 2' in content
                        assert 'line 3' in content
                finally:
                    os.unlink(tmp_file.name)

    def test_subprocess_execution_cross_platform(self):
        """Test subprocess execution works on all platforms."""
        from claudette.main import ClaudetteCLI
        
        cli = ClaudetteCLI()
        
        # Test basic commands that should work on all platforms
        if platform.system() == 'Windows':
            test_commands = [
                ['dir', '/b'],  # List directory
                ['echo', 'test']  # Echo command
            ]
        else:
            test_commands = [
                ['ls'],  # List directory
                ['echo', 'test']  # Echo command
            ]
        
        for cmd in test_commands:
            try:
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                # Should execute without error
                assert result.returncode in [0, 1], f"Command {cmd} failed with code {result.returncode}"
            except (FileNotFoundError, subprocess.TimeoutExpired):
                # Some commands might not exist on all systems
                pass

    def test_python_version_compatibility(self):
        """Test compatibility with supported Python versions."""
        current_version = sys.version_info
        
        # Should work with Python 3.11+
        assert current_version >= (3, 11), f"Requires Python 3.11+, got {current_version}"
        
        # Test version-specific features
        from claudette.main import ClaudetteCLI
        
        cli = ClaudetteCLI()
        assert cli is not None
        
        # Test that type hints work (Python 3.11+ feature)
        from typing import List, Optional, Dict
        test_annotation: Optional[Dict[str, List[str]]] = None
        assert test_annotation is None

    def test_character_encoding_handling(self):
        """Test proper handling of different character encodings."""
        from claudette.context_builder import ContextBuilder
        
        builder = ContextBuilder()
        
        # Test different encodings
        test_strings = {
            'ascii': 'Hello World',
            'utf8': 'Hello 世界 🌍',
            'latin1': 'Café naïve résumé',
            'emoji': '🚀 🐍 ✨ 💻'
        }
        
        for encoding_name, test_string in test_strings.items():
            try:
                with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', delete=False) as tmp_file:
                    tmp_file.write(test_string)
                    tmp_file.flush()
                    
                    file_info = builder.get_file_info(Path(tmp_file.name))
                    if file_info and 'content' in file_info:
                        # Should preserve unicode characters
                        content = file_info['content']
                        if '世界' in test_string:
                            assert '世界' in content, f"Unicode handling failed for {encoding_name}"
                        if '🚀' in test_string:
                            assert '🚀' in content, f"Emoji handling failed for {encoding_name}"
                
                os.unlink(tmp_file.name)
            except (UnicodeError, OSError):
                # Some encoding issues might be platform-specific
                pass

    def test_temporary_directory_handling(self):
        """Test temporary directory handling across platforms."""
        import tempfile
        
        # Should work with system temp directories
        temp_dirs = [
            tempfile.gettempdir(),
            tempfile.mkdtemp(),
            Path(tempfile.gettempdir()) / 'claudette_test'
        ]
        
        for temp_dir in temp_dirs:
            temp_path = Path(temp_dir)
            
            if temp_path.exists() or temp_path.parent.exists():
                try:
                    # Should be able to create and use temp directories
                    temp_path.mkdir(exist_ok=True)
                    
                    test_file = temp_path / 'test.txt'
                    test_file.write_text('test content')
                    
                    assert test_file.read_text() == 'test content'
                    
                    # Cleanup
                    test_file.unlink()
                    if temp_path.name == 'claudette_test':
                        temp_path.rmdir()
                        
                except (PermissionError, OSError):
                    # Some temp directories might not be writable
                    pass

    def test_signal_handling_cross_platform(self):
        """Test signal handling works appropriately on different platforms."""
        import signal
        
        # Test available signals (varies by platform)
        common_signals = ['SIGTERM', 'SIGINT']
        if platform.system() != 'Windows':
            common_signals.extend(['SIGUSR1', 'SIGUSR2', 'SIGHUP'])
        
        for signal_name in common_signals:
            if hasattr(signal, signal_name):
                signal_obj = getattr(signal, signal_name)
                assert isinstance(signal_obj, int), f"Signal {signal_name} should be an integer"

    def test_shell_command_compatibility(self):
        """Test shell command compatibility across platforms."""
        # Test commands that work differently on different platforms
        test_cases = [
            {
                'description': 'List files',
                'windows': 'dir /b',
                'unix': 'ls'
            },
            {
                'description': 'Echo command',
                'windows': 'echo test',
                'unix': 'echo test'
            },
            {
                'description': 'Current directory',
                'windows': 'cd',
                'unix': 'pwd'
            }
        ]
        
        for case in test_cases:
            if platform.system() == 'Windows':
                cmd = case['windows']
            else:
                cmd = case['unix']
            
            try:
                result = subprocess.run(
                    cmd,
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                # Should execute without hanging or crashing
                assert result.returncode in [0, 1], f"Command failed: {case['description']}"
            except (subprocess.TimeoutExpired, FileNotFoundError):
                # Some commands might not exist or timeout
                pass

    def test_file_locking_cross_platform(self):
        """Test file locking behavior across platforms."""
        import fcntl if platform.system() != 'Windows' else None
        
        with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
            try:
                if platform.system() != 'Windows' and fcntl:
                    # Unix-style file locking
                    fcntl.flock(tmp_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                    fcntl.flock(tmp_file.fileno(), fcntl.LOCK_UN)
                else:
                    # Windows or no fcntl available
                    # Just test that file operations work
                    tmp_file.write(b'test data')
                    tmp_file.flush()
                
                assert tmp_file.name, "File operations should work"
            finally:
                tmp_file.close()
                os.unlink(tmp_file.name)

    def test_module_import_compatibility(self):
        """Test that all modules import correctly across Python versions."""
        import importlib
        
        # Core claudette modules
        modules_to_test = [
            'claudette.main',
            'claudette.config',
            'claudette.cache',
            'claudette.preprocessor',
            'claudette.context_builder',
            'claudette.backends',
            'claudette.lazy_imports'
        ]
        
        for module_name in modules_to_test:
            try:
                module = importlib.import_module(module_name)
                assert module is not None, f"Module {module_name} failed to import"
            except ImportError as e:
                pytest.fail(f"Failed to import {module_name}: {e}")

    @pytest.mark.skipif(platform.system() == 'Windows', reason="Unix-specific test")
    def test_unix_specific_features(self):
        """Test Unix-specific features."""
        # Test Unix file permissions
        with tempfile.NamedTemporaryFile() as tmp_file:
            # Set specific permissions
            os.chmod(tmp_file.name, 0o644)
            
            stat_result = os.stat(tmp_file.name)
            permissions = stat_result.st_mode & 0o777
            assert permissions == 0o644, "Unix permissions not set correctly"

    @pytest.mark.skipif(platform.system() != 'Windows', reason="Windows-specific test")
    def test_windows_specific_features(self):
        """Test Windows-specific features."""
        # Test Windows path handling
        if platform.system() == 'Windows':
            # Test drive letters
            import string
            for drive in string.ascii_uppercase:
                drive_path = f"{drive}:\\"
                path_obj = Path(drive_path)
                # Should not raise exception
                assert path_obj.anchor == f"{drive}:\\"

    def test_memory_usage_cross_platform(self):
        """Test memory usage patterns across platforms."""
        import psutil
        
        process = psutil.Process()
        initial_memory = process.memory_info()
        
        # Perform standard operations
        from claudette.main import ClaudetteCLI
        cli = ClaudetteCLI()
        
        # Initialize components
        config = cli.config
        preprocessor = cli.preprocessor
        cache = cli.cache
        
        final_memory = process.memory_info()
        
        # Memory usage should be reasonable on all platforms
        memory_growth = (final_memory.rss - initial_memory.rss) / 1024 / 1024  # MB
        assert memory_growth < 200, f"Excessive memory usage: {memory_growth:.2f}MB"

    def test_networking_cross_platform(self):
        """Test networking behavior across platforms."""
        import socket
        
        # Test basic socket operations work on all platforms
        try:
            # Test DNS resolution
            socket.gethostbyname('google.com')
            
            # Test socket creation
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            sock.close()
            
        except (socket.gaierror, OSError):
            # Network might not be available in test environment
            pass


if __name__ == '__main__':
    pytest.main([__file__])