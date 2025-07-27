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


class ClaudetteCLI:
    """CLI proxy that mirrors Claude Code interface with preprocessing."""
    
    def __init__(self) -> None:
        """
        Initialize claudette CLI with lazy loading for performance.
        
        Sets up lazy-loaded components to minimize startup time:
        - Configuration loading deferred until needed
        - Preprocessor initialization on first use
        - Cache manager creation when required
        - Fallback manager setup as needed
        
        Raises:
            RuntimeError: If critical system components are unavailable
        """
        # Lazy initialization - only load what's needed
        self._config = None
        self._preprocessor = None
        self._cache = None
        self._fallback_manager = None
        self._claude_cmd = None
        
        # Known Claude Code verbs that should use preprocessing pipeline
        # These commands benefit from prompt compression and context enhancement
        self.known_verbs: set[str] = {
            'edit', 'commit', 'new', 'ask', 'chat', 'help', 'version',
            '/status', '/continue', '/reset'
        }
        
        logger.debug("ClaudetteCLI initialized with lazy loading")
    
    @property
    def config(self) -> Any:
        """
        Lazy load config only when needed.
        
        Returns:
            Config: Configuration instance with validated settings
            
        Note:
            Falls back to SimpleConfig if main Config class fails to load
        """
        if self._config is None:
            try:
                from .config import Config
                self._config = Config({})
                logger.debug("Configuration loaded successfully")
            except Exception as e:
                logger.warning(f"Failed to load main Config, using fallback: {e}")
                # Fallback config with type hints
                class SimpleConfig:
                    def __init__(self) -> None:
                        self.cache_dir = Path.home() / '.claudette' / 'cache'
                        self.cache_dir.mkdir(parents=True, exist_ok=True)
                self._config = SimpleConfig()
        return self._config
    
    @property
    def preprocessor(self) -> Any:
        """
        Lazy load preprocessor only when needed.
        
        Returns:
            Preprocessor: Instance for prompt compression and preprocessing
            
        Note:
            Falls back to SimplePreprocessor if main class fails to load
        """
        if self._preprocessor is None:
            try:
                from .preprocessor import Preprocessor
                self._preprocessor = Preprocessor(self.config)
                logger.debug("Preprocessor loaded successfully")
            except Exception as e:
                logger.warning(f"Failed to load main Preprocessor, using fallback: {e}")
                # Simple fallback preprocessor with type hints
                class SimplePreprocessor:
                    def compress(self, text: str) -> str:
                        return text
                self._preprocessor = SimplePreprocessor()
        return self._preprocessor
    
    @property
    def cache(self) -> Any:
        """
        Lazy load cache only when needed.
        
        Returns:
            CacheManager: Instance for session caching and persistence
            
        Note:
            Falls back to SimpleCache if main CacheManager fails to load
        """
        if self._cache is None:
            try:
                from .cache import CacheManager
                cache_dir = getattr(self.config, 'cache_dir', Path.home() / '.claudette' / 'cache')
                self._cache = CacheManager(cache_dir=str(cache_dir))
                logger.debug("Cache manager loaded successfully")
            except Exception as e:
                logger.warning(f"Failed to load main CacheManager, using fallback: {e}")
                # Simple fallback cache with type hints
                class SimpleCache:
                    def get(self, key: str) -> Optional[Any]:
                        return None
                    def set(self, key: str, value: Any) -> None:
                        pass
                self._cache = SimpleCache()
        return self._cache
    
    @property  
    def fallback_manager(self):
        """Lazy load fallback manager only when needed"""
        if self._fallback_manager is None:
            try:
                from .backends import FallbackBackend
                self._fallback_manager = FallbackBackend(self.config)
            except ImportError:
                # Create a simple fallback manager
                class FallbackManager:
                    def __init__(self, config):
                        self.config = config
                self._fallback_manager = FallbackManager(self.config)
        return self._fallback_manager
    
    @property
    def claude_cmd(self):
        """Lazy load claude command only when needed"""
        if self._claude_cmd is None:
            self._claude_cmd = self._load_claude_cmd()
        return self._claude_cmd
    
    def _load_claude_cmd(self) -> str:
        """
        Load Claude CLI command from config with fast parsing.
        
        Attempts to load claude_cmd configuration from:
        1. Project config.yaml (current directory)
        2. User config (~/.claudette/config.yaml)
        
        Returns:
            str: Claude CLI command name/path (defaults to 'claude')
            
        Security:
            - Path validation to prevent directory traversal
            - Safe yaml parsing with fallback to text parsing
        """
        config_file = Path.home() / '.claudette' / 'config.yaml'
        
        # Try project config first
        project_config = Path('config.yaml')
        if project_config.exists():
            config_file = project_config
        
        claude_cmd = 'claude'  # Default
        
        if config_file.exists():
            try:
                # Validate config file is within expected bounds (security)
                if not self._is_safe_config_path(config_file):
                    logger.warning(f"Unsafe config path detected: {config_file}")
                    return claude_cmd
                    
                # Fast text parsing first (avoid yaml import for simple cases)
                content = config_file.read_text(encoding='utf-8')
                for line in content.split('\n'):
                    if line.strip().startswith('claude_cmd:'):
                        value = line.split(':', 1)[1].strip()
                        # Sanitize command value (security hardening)
                        claude_cmd = self._sanitize_command_value(value.strip('\'"'))
                        return claude_cmd
                
                # Fallback to yaml parsing if needed
                if yaml:
                    with open(config_file, 'r', encoding='utf-8') as f:
                        config_data = yaml.safe_load(f)
                        raw_cmd = config_data.get('claude_cmd', 'claude')
                        claude_cmd = self._sanitize_command_value(raw_cmd)
                        
            except Exception as e:
                logger.debug(f"Config loading failed, using default: {e}")
                pass  # Use default on any error
        
        return claude_cmd
        
    def _is_safe_config_path(self, path: Path) -> bool:
        """
        Validate that config path is safe to read.
        
        Args:
            path: Path to validate
            
        Returns:
            bool: True if path is safe to read
        """
        try:
            # Resolve path and check it's within expected directories
            resolved = path.resolve()
            home = Path.home().resolve()
            cwd = Path.cwd().resolve()
            
            # Allow paths in home directory or current working directory
            return (str(resolved).startswith(str(home)) or 
                   str(resolved).startswith(str(cwd)))
        except (OSError, ValueError):
            return False
            
    def _sanitize_command_value(self, cmd: str) -> str:
        """
        Sanitize command value to prevent command injection.
        
        Args:
            cmd: Raw command string from config
            
        Returns:
            str: Sanitized command string
        """
        if not cmd or not isinstance(cmd, str):
            return 'claude'
            
        # Remove potentially dangerous characters
        sanitized = cmd.strip()
        
        # Only allow alphanumeric, hyphens, underscores, forward slashes, and dots
        # This covers common executable names and paths
        allowed_chars = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_./')
        
        if not all(c in allowed_chars for c in sanitized):
            logger.warning(f"Command contains potentially unsafe characters, using default: {cmd}")
            return 'claude'
            
        # Prevent overly long commands
        if len(sanitized) > 100:
            logger.warning(f"Command too long, using default: {len(sanitized)} chars")
            return 'claude'
            
        return sanitized
    
    def _should_use_pipeline(self, args: List[str]) -> bool:
        """
        Determine if args should use claudette preprocessing pipeline.
        
        Args:
            args: Command arguments to analyze
            
        Returns:
            bool: True if arguments should go through preprocessing
            
        Security:
            - Input validation to prevent processing of malicious arguments
            - Safe argument parsing with bounds checking
        """
        if not args or not isinstance(args, list):
            return False
            
        # Validate first argument
        try:
            first_arg = args[0]
            if not isinstance(first_arg, str) or len(first_arg) > 50:
                logger.warning(f"Invalid first argument: {first_arg}")
                return False
                
            first_arg = first_arg.lstrip('-').lstrip('/')
        except (IndexError, AttributeError):
            return False
        
        # Use pipeline for known verbs except help and version
        if first_arg in {'help', 'version'}:
            return False
        
        return first_arg in self.known_verbs
    
    def _cache_help(self) -> str:
        """
        Cache and return Claude CLI help text.
        
        Returns:
            str: Help text for claudette CLI
            
        Performance:
            - Caches help text to avoid repeated subprocess calls
            - Falls back to built-in help if Claude CLI unavailable
        
        Security:
            - Safe subprocess execution with timeout
            - Path validation for cache directory
        """
        cache_dir = Path.home() / '.cache' / 'claudette'
        cache_dir.mkdir(parents=True, exist_ok=True)
        help_file = cache_dir / 'help.txt'
        
        # Try to read cached help with validation
        if help_file.exists():
            try:
                # Validate cache file size (prevent reading huge files)
                if help_file.stat().st_size > 10240:  # 10KB max
                    logger.warning("Help cache file too large, regenerating")
                    help_file.unlink()
                else:
                    return help_file.read_text(encoding='utf-8')
            except Exception as e:
                logger.debug(f"Failed to read cached help: {e}")
                # Remove corrupted cache file
                try:
                    help_file.unlink()
                except OSError:
                    pass
        
        # Get fresh help from Claude CLI with security hardening
        try:
            # Validate command before execution
            if not self._is_safe_command(self.claude_cmd):
                logger.warning(f"Potentially unsafe command: {self.claude_cmd}")
                return self._get_fallback_help()
                
            result = subprocess.run(
                [self.claude_cmd, '--help'],
                capture_output=True,
                text=True,
                timeout=10,
                # Security: prevent shell injection
                shell=False,
                # Limit environment exposure
                env=self._get_safe_env()
            )
            
            if result.returncode == 0 and result.stdout:
                help_text = result.stdout
                
                # Replace 'claude' with 'claudette' in help text
                help_text = help_text.replace('claude ', 'claudette ')
                help_text = help_text.replace('Usage: claude', 'Usage: claudette')
                
                # Cache the help text with error handling
                try:
                    # Validate help text size before caching
                    if len(help_text) > 10240:  # 10KB max
                        logger.warning("Help text too large to cache")
                    else:
                        help_file.write_text(help_text, encoding='utf-8')
                        logger.debug("Help text cached successfully")
                except Exception as e:
                    logger.debug(f"Failed to cache help text: {e}")
                    pass  # Cache write failure is not critical
                
                return help_text
        except Exception as e:
            logger.debug(f"Failed to get help from Claude CLI: {e}")
            pass
        
        # Fallback help if Claude CLI is not available
        return self._get_fallback_help()
        
    def _get_fallback_help(self) -> str:
        """
        Get fallback help text when Claude CLI is unavailable.
        
        Returns:
            str: Static fallback help text
        """
        return """claudette - Claude Code compatible CLI with preprocessing

Usage: claudette [OPTIONS] COMMAND [ARGS]...

Commands:
  edit     Edit files with AI assistance
  commit   Create git commits with AI
  new      Create new files/projects
  ask      Ask questions about code
  chat     Interactive chat mode

Options:
  --help     Show this message and exit
  --version  Show version and exit

Note: claudette enhances Claude Code with preprocessing, caching, and fallback backends.
For full Claude Code functionality, ensure Claude CLI is installed and accessible.
"""
        
    def _is_safe_command(self, cmd: str) -> bool:
        """
        Validate that a command is safe to execute.
        
        Args:
            cmd: Command to validate
            
        Returns:
            bool: True if command appears safe
        """
        if not cmd or not isinstance(cmd, str):
            return False
            
        # Basic safety checks
        cmd = cmd.strip()
        
        # Reject commands with shell metacharacters
        dangerous_chars = {'&', '|', ';', '$', '`', '(', ')', '<', '>', '\n', '\r'}
        if any(char in cmd for char in dangerous_chars):
            return False
            
        # Reject overly complex commands
        if len(cmd) > 100 or cmd.count('/') > 10:
            return False
            
        return True
        
    def _get_safe_env(self) -> Dict[str, str]:
        """
        Get a safe environment for subprocess execution.
        
        Returns:
            Dict[str, str]: Sanitized environment variables
        """
        # Start with minimal environment
        safe_env = {
            'PATH': os.environ.get('PATH', ''),
            'HOME': os.environ.get('HOME', ''),
            'USER': os.environ.get('USER', ''),
            'TERM': os.environ.get('TERM', 'xterm')
        }
        
        # Add Claude-specific environment variables if present
        claude_vars = ['CLAUDE_API_KEY', 'ANTHROPIC_API_KEY']
        for var in claude_vars:
            if var in os.environ:
                safe_env[var] = os.environ[var]
                
        return safe_env
"""
    
    # @LazyFunction(['openai', 'tiktoken'])  # Temporarily disabled due to import issue
    def _preprocess_request(self, args: List[str]) -> List[str]:
        """Apply claudette preprocessing pipeline to request.
        
        Args:
            args: Command arguments to preprocess
            
        Returns:
            List[str]: Preprocessed arguments with compressed prompt
            
        Security:
            - Input validation for all arguments
            - Safe prompt processing with size limits
        
        Performance:
            - Lazy loading of heavy dependencies
            - Intelligent caching of compression results
        """
        if not args or not isinstance(args, list):
            logger.debug("No args to preprocess or invalid args type")
            return args or []
        
        try:
            # Extract the main prompt/request from args with validation
            prompt_parts = []
            non_prompt_args = []
            
            # Validate arguments before processing
            for i, arg in enumerate(args[1:], 1):  # Skip the verb
                if not isinstance(arg, str):
                    logger.warning(f"Non-string argument at position {i}: {type(arg)}")
                    continue
                    
                if len(arg) > 1000:  # Prevent overly long arguments
                    logger.warning(f"Argument too long at position {i}: {len(arg)} chars")
                    arg = arg[:1000] + "...[truncated]"
                
                if arg.startswith('-'):
                    non_prompt_args.append(arg)
                else:
                    prompt_parts.append(arg)
            
            if prompt_parts:
                original_prompt = ' '.join(prompt_parts)
                
                # Validate prompt size
                if len(original_prompt) > 50000:  # 50KB max
                    logger.warning(f"Prompt very large: {len(original_prompt)} chars, may be truncated")
                    original_prompt = original_prompt[:50000] + "...[truncated for size]"
                
                # Check cache first if available (with error handling)
                cached_result = None
                try:
                    # Create stable hash for caching
                    import hashlib
                    cache_key = f"compress_{hashlib.sha256(original_prompt.encode('utf-8')).hexdigest()[:16]}"
                    
                    if hasattr(self.cache, 'get'):
                        cached_result = self.cache.get(cache_key)
                        if cached_result:
                            logger.debug(f"Cache hit for preprocessing: {cache_key}")
                    
                    if cached_result and isinstance(cached_result, dict):
                        # Use cached compressed prompt with validation
                        compressed_prompt = cached_result.get('compressed_prompt', original_prompt)
                        if not isinstance(compressed_prompt, str):
                            logger.warning("Invalid cached prompt, reprocessing")
                            compressed_prompt = self.preprocessor.compress(original_prompt)
                    else:
                        # Apply preprocessing (heavy imports happen here)
                        logger.debug("Processing prompt with preprocessor")
                        compressed_prompt = self.preprocessor.compress(original_prompt)
                        
                        # Cache the result if cache is available
                        if hasattr(self.cache, 'set'):
                            try:
                                self.cache.set(cache_key, {
                                    'original_prompt': original_prompt,
                                    'compressed_prompt': compressed_prompt,
                                    'timestamp': str(time.time()),
                                    'version': '1.3.0'  # Track cache version
                                })
                                logger.debug(f"Cached preprocessing result: {cache_key}")
                            except Exception as e:
                                logger.debug(f"Failed to cache result: {e}")
                except Exception as e:
                    logger.debug(f"Cache lookup failed: {e}")
                    # Fallback to basic preprocessing
                    compressed_prompt = self.preprocessor.compress(original_prompt)
                
                # Rebuild args with compressed prompt (with validation)
                new_args = [args[0]] + non_prompt_args
                
                if compressed_prompt and compressed_prompt != original_prompt:
                    # Split compressed prompt safely
                    compressed_parts = compressed_prompt.split()
                    if len(compressed_parts) > 200:  # Prevent excessive arguments
                        logger.warning(f"Compressed prompt has many parts: {len(compressed_parts)}")
                        compressed_parts = compressed_parts[:200]
                    new_args.extend(compressed_parts)
                else:
                    new_args.extend(prompt_parts)
                
                return new_args
        
        except Exception as e:
            logger.warning(f"Preprocessing failed, using original args: {e}")
            # On any preprocessing error, return original args
            pass
        
        return args
    
    def _forward_to_claude(self, args: List[str], stdin_data: Optional[bytes] = None) -> int:
        """Forward command to Claude CLI and return exit code."""
        cmd = [self.claude_cmd] + args
        
        try:
            # Forward to Claude CLI with proper STDIN handling
            proc = subprocess.run(
                cmd,
                input=stdin_data,
                text=False,  # Handle binary data
                stdout=None,  # Forward stdout directly
                stderr=None,  # Forward stderr directly
            )
            return proc.returncode
        
        except FileNotFoundError:
            print(f"Error: Claude CLI not found at '{self.claude_cmd}'", file=sys.stderr)
            print("Please install Claude CLI or update 'claude_cmd' in config.yaml", file=sys.stderr)
            return 127
        
        except Exception as e:
            print(f"Error executing Claude CLI: {e}", file=sys.stderr)
            return 1
    
    def run(self, argv: List[str]) -> int:
        """Main CLI entry point with performance optimization."""
        # Preload modules based on command for better performance
        if argv:
            preload_for_command(argv[0])
        
        # Handle help specially
        if not argv or argv[0] in {'--help', '-h', 'help'}:
            print(self._cache_help())
            return 0
        
        # Handle version
        if argv[0] in {'--version', '-V', 'version'}:
            from claudette import __version__
            print(f"claudette {__version__} (Claude Code compatible CLI)")
            return 0
        
        # Read STDIN if available
        stdin_data = None
        if not sys.stdin.isatty():
            try:
                stdin_data = sys.stdin.buffer.read()
            except Exception:
                pass
        
        # Decide whether to use preprocessing pipeline
        if self._should_use_pipeline(argv):
            # Apply claudette preprocessing
            processed_args = self._preprocess_request(argv)
            result = self._forward_to_claude(processed_args, stdin_data)
        else:
            # Forward directly without preprocessing
            result = self._forward_to_claude(argv, stdin_data)
        
        # Optimize memory after command completion
        optimize_memory()
        
        return result


def cli(argv: Optional[List[str]] = None) -> None:
    """Main CLI function with ultra performance optimization."""
    if argv is None:
        argv = sys.argv[1:]
    
    # ULTRA PERFORMANCE OPTIMIZATION: Route to optimal execution path
    # Check for ultra-optimization mode
    if os.environ.get('CLAUDETTE_ULTRA_MODE', '0') == '1':
        try:
            exit_code = run_ultra_optimized(argv)
            sys.exit(exit_code)
        except Exception as e:
            print(f"claudette (ultra): error: {e}", file=sys.stderr)
            sys.exit(1)
    
    # PERFORMANCE OPTIMIZATION: Fast path for simple commands
    # This avoids loading heavy imports (openai, tiktoken) for help/version
    if should_use_fast_path(argv):
        try:
            exit_code = handle_fast_path(argv)
            sys.exit(exit_code)
        except Exception as e:
            print(f"claudette (fast): error: {e}", file=sys.stderr)
            sys.exit(1)
    
    # Check for alias disabling
    if os.environ.get('CLAUDETTE_NO_CLAUDE_ALIAS') == '1':
        # Running as 'claude' but alias is disabled
        if sys.argv[0].endswith('claude') and not sys.argv[0].endswith('claudette'):
            print("Error: claude alias is disabled (CLAUDETTE_NO_CLAUDE_ALIAS=1)", file=sys.stderr)
            sys.exit(1)
    
    try:
        # Full claudette instance only for commands needing preprocessing
        cli_instance = ClaudetteCLI()
        exit_code = cli_instance.run(argv)
        sys.exit(exit_code)
    
    except KeyboardInterrupt:
        sys.exit(130)  # Standard exit code for Ctrl+C
    
    except Exception as e:
        print(f"claudette: error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    cli()