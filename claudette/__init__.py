"""
Claudette AI Tools - Intelligent AI Tools and Libraries

A comprehensive toolkit for AI development, automation, and integration.

Author: Claude Flow Development Team
Version: 2.0.0
License: MIT
"""

__version__ = "2.0.0"
__author__ = "Claude Flow Development Team"
__email__ = "dev@claudette.ai"

# Core imports with graceful fallback
try:
    from .main import main
except ImportError:
    main = None

try:
    from .cli_commands import CLICommands
except ImportError:
    CLICommands = None

try:
    from .config import Config
except ImportError:
    Config = None

try:
    from .cache import Cache
except ImportError:
    Cache = None

try:
    from .performance_monitor import PerformanceMonitor
except ImportError:
    PerformanceMonitor = None

__all__ = [
    'main',
    'CLICommands', 
    'Config',
    'Cache',
    'PerformanceMonitor',
    '__version__',
    '__author__',
    '__email__'
]