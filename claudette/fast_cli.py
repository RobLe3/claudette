"""
Fast path CLI implementation for common commands
Bypasses heavy imports for simple operations like help and version
"""

import sys
import os
import subprocess
from pathlib import Path
from typing import List, Optional
try:
    from .sudo_helper import sudo_helper
except ImportError:
    try:
        from claudette.sudo_helper import sudo_helper
    except ImportError:
        # Fallback sudo helper
        def sudo_helper(reason, operation):
            return None


class FastPathCLI:
    """
    Lightweight CLI handler for commands that don't need full claudette pipeline
    
    This handles simple commands like help, version, status without loading
    expensive dependencies like OpenAI, tiktoken, etc.
    """
    
    def __init__(self):
        self.claude_cmd = self._get_claude_cmd()
    
    def _get_claude_cmd(self) -> str:
        """Get Claude CLI command without loading full config system"""
        # Quick check for config file
        config_file = Path.home() / '.claudette' / 'config.yaml'
        project_config = Path('config.yaml')
        
        # Default command
        claude_cmd = 'claude'
        
        # Try to read claude_cmd from config without yaml dependency
        for config_path in [project_config, config_file]:
            if config_path.exists():
                try:
                    # Simple text parsing instead of yaml
                    content = config_path.read_text()
                    for line in content.split('\n'):
                        if line.strip().startswith('claude_cmd:'):
                            value = line.split(':', 1)[1].strip()
                            # Remove quotes if present
                            claude_cmd = value.strip('\'"')
                            break
                except Exception:
                    # If parsing fails, use default
                    pass
                break
        
        return claude_cmd
    
    def can_handle_fast(self, args: List[str]) -> bool:
        """
        Check if command can be handled by fast path
        
        Fast path commands:
        - help, --help, -h
        - version, --version, -V  
        - Direct forwards (no preprocessing needed)
        """
        if not args:
            return True  # Empty args = help
        
        first_arg = args[0].lstrip('-').lstrip('/')
        
        # Commands that can use fast path
        fast_commands = {
            'help', 'version', 'status',
            'h', 'V',  # Short flags
        }
        
        return first_arg in fast_commands
    
    def handle_help(self) -> int:
        """Handle help command with custom help text"""
        # Check for and clean up problematic cache files
        self._cleanup_problematic_cache()
        
        # Force our custom help - bypass any caching issues
        help_text = """claudette - Claude Code Middleware with Cost Optimization

Usage: claudette [COMMAND] [ARGS]...

Behavior:
  claudette acts as intelligent middleware for Claude Code, providing:
  - Interactive GUI spawning (default)
  - Console mode when using --print, -p, or output flags
  - Preprocessing and cost optimization
  - Argument preprocessing and token reduction

Examples:
  claudette                      # Launch Claude interactive GUI
  claudette "help me code"       # Launch GUI with initial prompt
  claudette --print "2+2"        # Console mode for quick output
  claudette -p "generate code"    # Console mode with preprocessing

Mode Selection:
  GUI Mode (default):   Interactive session with full Claude interface
  Console Mode:         Direct output when using --print, -p, --output-format

Special Commands:
  --help       Show this message and exit
  --version    Show version and exit
  diagnose     Run system diagnostic to identify issues
  fix          Automatically fix detected system issues
  config       Manage claudette configuration
  doctor       System health check

System Maintenance:
  claudette diagnose    # Check for cache, permission, and config issues
  claudette fix         # Auto-fix issues with secure sudo when needed

Note: claudette is middleware that enhances Claude Code with cost optimization.
It intelligently routes between GUI and console modes based on usage.
When system issues are detected, claudette can securely request administrator
privileges to fix problems like root-owned cache files.
"""
        print(help_text)
        return 0
    
    def _cleanup_problematic_cache(self):
        """Clean up cache files that might be causing issues"""
        try:
            cache_dir = Path.home() / '.cache' / 'claudette'
            if cache_dir.exists():
                # Check for root-owned files
                root_files = []
                for file_path in cache_dir.rglob('*'):
                    if file_path.is_file() and sudo_helper.needs_sudo_for_path(str(file_path)):
                        root_files.append(str(file_path))
                
                if root_files:
                    print(f"🧹 Found {len(root_files)} problematic cache files...")
                    sudo_helper.cleanup_cache_files(str(cache_dir))
        except Exception as e:
            # Silently handle cache cleanup issues
            pass
    
    def handle_version(self) -> int:
        """Handle version command"""
        # Get version without importing main claudette module
        try:
            # Try to read version from __init__.py without importing
            init_file = Path(__file__).parent / '__init__.py'
            if init_file.exists():
                content = init_file.read_text()
                for line in content.split('\n'):
                    if line.strip().startswith('__version__'):
                        version = line.split('=')[1].strip().strip('\'"')
                        print(f"claudette {version} (Claude Code compatible CLI)")
                        return 0
        except Exception:
            pass
        
        # Fallback version
        print("claudette 1.3.0 (Claude Code compatible CLI)")
        return 0
    
    def forward_to_claude(self, args: List[str]) -> int:
        """Spawn Claude interactive GUI unless console flags provided"""
        # Check if user wants console mode (--print, -p, or other console flags)
        console_flags = {'--print', '-p', '--output-format', '--input-format'}
        force_console = any(arg in console_flags or arg.startswith('--output-format=') or arg.startswith('--input-format=') for arg in args)
        
        if force_console:
            # Console mode - forward directly to Claude CLI
            print(f"🖥️ Running Claude in console mode...")
            try:
                result = subprocess.run([self.claude_cmd] + args, text=True)
                return result.returncode
            except Exception as e:
                print(f"Error running Claude in console mode: {e}", file=sys.stderr)
                return 1
        else:
            # GUI/Interactive mode (default)
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
                        [self.claude_cmd],
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
                    result = subprocess.run([self.claude_cmd], text=True)
                    return result.returncode
            
            except FileNotFoundError:
                print(f"Error: Claude CLI not found at '{self.claude_cmd}'", file=sys.stderr)
                print("Please install Claude CLI or update config.yaml", file=sys.stderr)
                return 127
            
            except Exception as e:
                print(f"Error spawning Claude interactive GUI: {e}", file=sys.stderr)
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

Note: claudette is a launcher that spawns Claude Code interactively.
It does NOT replace Claude Code - it starts a new Claude session.

Performance optimized: Fast path bypasses heavy imports for simple commands.
"""


def should_use_fast_path(args: List[str]) -> bool:
    """
    Global function to check if fast path should be used
    
    This is the main entry point for optimization - called before
    any heavy imports are loaded.
    """
    fast_cli = FastPathCLI()
    return fast_cli.can_handle_fast(args)


def handle_fast_path(args: List[str]) -> int:
    """
    Handle command using fast path
    
    Returns exit code
    """
    # Record performance optimization
    from .performance_monitor import record_fast_path_used, record_startup_complete, save_performance_metrics
    
    record_fast_path_used()
    
    fast_cli = FastPathCLI()
    
    try:
        if not args or args[0] in {'--help', '-h', 'help'}:
            result = fast_cli.handle_help()
        elif args[0] in {'--version', '-V', 'version'}:
            result = fast_cli.handle_version()
        else:
            # Forward other fast commands directly
            result = fast_cli.forward_to_claude(args)
        
        record_startup_complete()
        save_performance_metrics()
        return result
        
    except Exception as e:
        record_startup_complete()
        save_performance_metrics()
        raise