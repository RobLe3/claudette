"""
Main CLI interface for claudette
Drop-in replacement for Claude Code with preprocessing pipeline

This module provides the primary entry point for the claudette CLI tool,
which acts as a drop-in replacement for Claude Code while adding:
- Intelligent preprocessing and prompt compression
- Multi-backend support with automatic fallbacks
- Session caching and performance optimizations
- Security-hardened command execution

Example:
    $ claudette edit main.py "Add error handling"
    $ claudette commit "Implement new feature"
    $ claudette --help

Security:
    - All user inputs are validated and sanitized
    - Command injection protection via subprocess isolation
    - Configuration loading with path validation

Performance:
    - Lazy loading of heavy dependencies (OpenAI, tiktoken)
    - Fast path execution for simple commands
    - Intelligent caching of preprocessing results
"""

import sys
import os
import subprocess
import time
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any, Union, Tuple, NoReturn

# Configure logging with performance optimization
_logger = None

def get_logger():
    """Lazy logger initialization to reduce startup time"""
    global _logger
    if _logger is None:
        logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        _logger = logging.getLogger(__name__)
    return _logger

# Fast path optimization - check before heavy imports
from .fast_cli import should_use_fast_path, handle_fast_path

# Lazy imports for performance optimization  
from .lazy_imports import (
    yaml_lazy as yaml,
    LazyFunction,
    conditional_import
)

# Performance monitoring
from .performance_monitor import (
    record_startup_time,
    record_command_execution,
    get_performance_stats
)

# Check for ultra-optimized fast path before any heavy imports
def cli(argv: Optional[List[str]] = None) -> None:
    """Main CLI function with ultra performance optimization."""
    if argv is None:
        argv = sys.argv[1:]
    
    # ULTRA PERFORMANCE OPTIMIZATION: Route to optimal execution path
    # Check for ultra-optimization mode
    if os.environ.get('CLAUDETTE_ULTRA_MODE', '0') == '1':
        # Direct forwarding without any preprocessing for maximum speed
        try:
            claude_cmd = os.environ.get('CLAUDETTE_CLAUDE_CMD', 'claude')
            result = subprocess.run([claude_cmd] + argv, text=True)
            sys.exit(result.returncode)
        except Exception as e:
            print(f"claudette (ultra): error: {e}", file=sys.stderr)
            sys.exit(1)
    
    # Fast path optimization for common commands
    if should_use_fast_path(argv):
        try:
            exit_code = handle_fast_path(argv)
            sys.exit(exit_code)
        except Exception as e:
            print(f"claudette (fast): error: {e}", file=sys.stderr)
            sys.exit(1)
    
    # Claude alias handling
    if os.environ.get('CLAUDETTE_NO_CLAUDE_ALIAS', '0') == '1':
        if os.path.basename(sys.argv[0]) == 'claude':
            print("Error: claude alias is disabled (CLAUDETTE_NO_CLAUDE_ALIAS=1)", file=sys.stderr)
            sys.exit(1)
    
    # Import main claudette functionality (heavier imports)
    try:
        from .main_impl import ClaudetteCLI
        cli_instance = ClaudetteCLI()
        exit_code = cli_instance.run(argv)
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n🛑 Interrupted by user", file=sys.stderr)
        sys.exit(130)
    except Exception as e:
        print(f"claudette: error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    cli()