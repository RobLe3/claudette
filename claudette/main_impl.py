"""
Main implementation for Claudette CLI
Contains the core ClaudetteCLI class with full functionality
"""

import sys
import os
import subprocess
import time
import hashlib
import logging
import json
from pathlib import Path
from typing import List, Optional, Dict, Any, Union, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Import configuration and dependencies
from .config import Config
from .lazy_imports import LazyFunction, conditional_import
from .performance_monitor import record_command_execution, record_startup_complete, save_performance_metrics

# Version info
from . import __version__

def emit_event(name: str, payload: dict):
    """Emit JSON events for agent status tracking"""
    event_data = {
        'event': name,
        'payload': payload,
        'timestamp': time.time()
    }
    print(f"<<CLAUDETTE_EVENT::{json.dumps(event_data, ensure_ascii=False)}>>", file=sys.stdout, flush=True)


class ClaudetteCLI:
    """CLI proxy that mirrors Claude Code interface with preprocessing."""
    
    def __init__(self):
        """Initialize CLI with lazy loading of expensive components."""
        self._config = None
        self._preprocessor = None
        self._cache_manager = None
        self._fallback_manager = None
        self.claude_cmd = None
        
        logger.debug("ClaudetteCLI initialized with lazy loading")
    
    def _get_config(self) -> Config:
        """Lazy load configuration only when needed"""
        if self._config is None:
            try:
                self._config = Config.load()
                logger.debug("Configuration loaded successfully")
            except Exception as e:
                logger.warning(f"Failed to load main Config, using fallback: {e}")
                # Fallback to empty config
                self._config = Config({})
        return self._config
    
    def _get_preprocessor(self):
        """Lazy load preprocessor only when needed"""
        if self._preprocessor is None:
            try:
                from .preprocessor import Preprocessor
                self._preprocessor = Preprocessor()
                logger.debug("Preprocessor loaded successfully")
            except Exception as e:
                logger.warning(f"Failed to load main Preprocessor, using fallback: {e}")
                self._preprocessor = None
        return self._preprocessor
    
    def _get_cache_manager(self):
        """Lazy load cache manager only when needed"""
        if self._cache_manager is None:
            try:
                from .cache import get_cache_manager
                self._cache_manager = get_cache_manager()
                logger.debug("Cache manager loaded successfully")
            except Exception as e:
                logger.warning(f"Failed to load main CacheManager, using fallback: {e}")
                self._cache_manager = None
        return self._cache_manager
    
    def _get_fallback_manager(self):
        """Lazy load fallback manager only when needed"""
        if self._fallback_manager is None:
            try:
                from .backends import FallbackManager
                self._fallback_manager = FallbackManager()
            except ImportError:
                # Create minimal fallback
                class MinimalFallback:
                    def get_backend(self, name):
                        return None
                self._fallback_manager = MinimalFallback()
        return self._fallback_manager
    
    def _get_claude_cmd(self) -> str:
        """Lazy load claude command only when needed"""
        if self.claude_cmd is None:
            config = self._get_config()
            self.claude_cmd = config.claude_cmd
        return self.claude_cmd
    
    def run(self, args: List[str]) -> int:
        """Main entry point for claudette CLI."""
        start_time = time.time()
        
        try:
            # Handle version command
            if args and args[0] in ['--version', '-V', 'version']:
                print(f"claudette {__version__} (Claude Code compatible CLI)")
                return 0
            
            # Handle help command with caching
            if not args or args[0] in ['--help', '-h', 'help']:
                return self._handle_help()
            
            # Handle special claudette commands
            if args and args[0] in ['config', 'doctor', 'performance', 'stats', 'diagnose', 'fix', 
                                  'claude-flow-status', 'install-claude-flow', 'check-dependencies', 'swarm-init']:
                return self._handle_special_commands(args)
            
            # Preprocess arguments if needed
            processed_args = self._preprocess_request(args)
            
            # Forward to Claude CLI
            exit_code = self._forward_to_claude(processed_args)
            
            # Record performance metrics
            duration = time.time() - start_time
            command_type = args[0] if args else 'unknown'
            record_command_execution(duration, command_type, 'claude')
            record_startup_complete()
            save_performance_metrics()
            
            return exit_code
            
        except KeyboardInterrupt:
            print("\n🛑 Interrupted by user", file=sys.stderr)
            return 130
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            print(f"claudette: error: {e}", file=sys.stderr)
            return 1
    
    def _handle_help(self) -> int:
        """Handle help command with caching."""
        try:
            cache_dir = Path.home() / '.cache' / 'claudette'
            cache_dir.mkdir(parents=True, exist_ok=True)
            help_file = cache_dir / 'help.txt'
            
            # Always show our custom help - no caching for now
            help_text = self._get_fallback_help()
            print(help_text)
            return 0
            
            # Get fresh help from Claude CLI
            claude_cmd = self._get_claude_cmd()
            try:
                result = subprocess.run(
                    [claude_cmd, '--help'],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                
                if result.returncode == 0 and result.stdout:
                    help_text = result.stdout
                    
                    # Don't replace - show our custom help instead
                    help_text = self._get_fallback_help()
                    
                    # Cache the help text
                    try:
                        help_file.write_text(help_text)
                        logger.debug("Help text cached successfully")
                    except Exception as e:
                        logger.debug(f"Failed to cache help text: {e}")
                    
                    print(help_text)
                    return 0
            except Exception as e:
                logger.debug(f"Failed to get help from Claude CLI: {e}")
            
            # Fallback help
            print(self._get_fallback_help())
            return 0
            
        except Exception as e:
            logger.error(f"Help command failed: {e}")
            return 1
    
    def _get_fallback_help(self) -> str:
        """Fallback help text when Claude CLI unavailable"""
        return """claudette - Interactive Claude Code launcher with preprocessing

Usage: claudette [COMMAND] [ARGS]...

Behavior:
  claudette spawns Claude Code in interactive mode and passes any 
  provided arguments as initial input to the session.

Examples:
  claudette                    # Launch Claude interactive console
  claudette edit main.py       # Launch Claude with "edit main.py" as initial input
  claudette "help me code"     # Launch Claude with prompt as initial input

Special Commands:
  --help     Show this message and exit
  --version  Show version and exit
  config     Configure claudette settings
  doctor     Diagnose configuration issues

Note: claudette is a launcher that spawns Claude Code interactively.
It does NOT replace Claude Code - it starts a new Claude session.

Performance optimized: Fast path bypasses heavy imports for simple commands.
"""
    
    def _handle_special_commands(self, args: List[str]) -> int:
        """Handle special claudette commands"""
        try:
            # Handle diagnostic commands directly
            if args[0] == 'diagnose':
                from .diagnostic_commands import diagnostic
                diagnostic.run_full_diagnostic()
                return 0
            elif args[0] == 'fix':
                from .diagnostic_commands import diagnostic
                success = diagnostic.auto_fix_issues(interactive=True)
                return 0 if success else 1
            
            # Handle other special commands
            from .cli_commands import setup_cli_commands
            import argparse
            
            parser = argparse.ArgumentParser(prog='claudette')
            subparsers = setup_cli_commands(parser)
            
            # Parse and execute the command
            parsed_args = parser.parse_args(args)
            
            if hasattr(parsed_args, 'func'):
                return parsed_args.func(parsed_args)
            else:
                parser.print_help()
                return 0
                
        except Exception as e:
            logger.error(f"Special command failed: {e}")
            print(f"claudette: {args[0]} command failed: {e}", file=sys.stderr)
            return 1
    
    # @LazyFunction('openai')  # Temporarily disabled due to import issue
    def _preprocess_request(self, args: List[str]) -> List[str]:
        """Apply claudette preprocessing pipeline to request."""
        if not args or not isinstance(args, list):
            logger.debug("No args to preprocess or invalid args type")
            return args or []
        
        try:
            # For simple commands, skip preprocessing
            if args and args[0] in ['--help', '-h', '--version', '-V', 'version', 'help']:
                return args
            
            # Get preprocessor
            preprocessor = self._get_preprocessor()
            if not preprocessor:
                return args
            
            # Extract main prompt for preprocessing
            prompt_parts = []
            non_prompt_args = []
            
            for i, arg in enumerate(args):
                if isinstance(arg, str) and len(arg) > 20 and ' ' in arg:
                    prompt_parts.append(arg)
                else:
                    non_prompt_args.append(arg)
            
            if not prompt_parts:
                return args
            
            # Combine and preprocess the main prompt
            original_prompt = ' '.join(prompt_parts)
            
            # Check cache first
            cache_manager = self._get_cache_manager()
            if cache_manager:
                try:
                    cache_key = f"compress_{hashlib.sha256(original_prompt.encode('utf-8')).hexdigest()[:16]}"
                    cached = cache_manager.get_cached_response(cache_key)
                    if cached:
                        logger.debug(f"Cache hit for preprocessing: {cache_key}")
                        compressed_prompt = cached
                    else:
                        # Preprocess the prompt
                        compressed_prompt = preprocessor.compress(original_prompt, {})
                        # Cache the result
                        cache_manager.store_event(
                            cmd='preprocess',
                            files=[],
                            prompt_hash=cache_key,
                            compressed_tokens=len(compressed_prompt.split()),
                            backend='preprocessor'
                        )
                        logger.debug(f"Cached preprocessing result: {cache_key}")
                except Exception as e:
                    logger.debug(f"Cache operation failed: {e}")
                    compressed_prompt = preprocessor.compress(original_prompt, {})
            else:
                compressed_prompt = preprocessor.compress(original_prompt, {})
            
            # Rebuild args with compressed prompt
            result_args = non_prompt_args[:]
            if compressed_prompt and compressed_prompt != original_prompt:
                result_args.append(compressed_prompt)
                logger.debug(f"Prompt compressed from {len(original_prompt)} to {len(compressed_prompt)} chars")
            else:
                result_args.extend(prompt_parts)
            
            return result_args
            
        except Exception as e:
            logger.warning(f"Preprocessing failed, using original args: {e}")
            return args
    
    def _forward_to_claude(self, args: List[str]) -> int:
        """Spawn Claude interactive GUI unless --print or console flags provided."""
        claude_cmd = self._get_claude_cmd()
        
        # Check if user wants console mode (--print, -p, or other console flags)
        console_flags = {'--print', '-p', '--output-format', '--input-format'}
        force_console = any(arg in console_flags or arg.startswith('--output-format=') or arg.startswith('--input-format=') for arg in args)
        
        if force_console:
            # Console mode - forward directly to Claude CLI
            print(f"🖥️ Running Claude in console mode...")
            try:
                result = subprocess.run([claude_cmd] + args, text=True)
                return result.returncode
            except Exception as e:
                print(f"Error running Claude in console mode: {e}", file=sys.stderr)
                return 1
        else:
            # GUI/Interactive mode (default behavior)
            print(f"🚀 Spawning Claude interactive GUI...")
            print(f"💡 Use 'exit' or Ctrl+C to return to your shell")
            if args:
                print(f"📝 Initial prompt: {' '.join(args)}")
            print("=" * 50)
            
            try:
                # Spawn Claude in interactive GUI mode
                if args:
                    # Start Claude and provide the args as initial input
                    process = subprocess.Popen(
                        [claude_cmd],
                        stdin=subprocess.PIPE,
                        text=True
                    )
                    
                    # Send the original command as first input
                    initial_input = ' '.join(args)
                    process.stdin.write(initial_input + '\n')
                    process.stdin.flush()
                    process.stdin.close()
                    
                    # Wait for Claude to finish
                    return process.wait()
                else:
                    # Just start Claude interactively (GUI mode)
                    result = subprocess.run([claude_cmd], text=True)
                    return result.returncode
                
            except FileNotFoundError:
                print(f"Error: Claude CLI not found at '{claude_cmd}'", file=sys.stderr)
                print("Please install Claude CLI or update 'claude_cmd' in config.yaml", file=sys.stderr)
                return 127
            except Exception as e:
                print(f"Error spawning Claude interactive GUI: {e}", file=sys.stderr)
                return 1