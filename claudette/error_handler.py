"""
Enhanced error handling for Claudette
Provides user-friendly error messages with actionable suggestions
"""

import sys
import traceback
from typing import Dict, Any, Optional, List, Tuple
from pathlib import Path
import subprocess


class ClaudetteError(Exception):
    """Base exception for Claudette-specific errors"""
    
    def __init__(self, message: str, suggestions: Optional[List[str]] = None):
        super().__init__(message)
        self.suggestions = suggestions or []


class ConfigurationError(ClaudetteError):
    """Configuration-related errors"""
    pass


class BackendError(ClaudetteError):
    """Backend-related errors"""
    pass


class PerformanceError(ClaudetteError):
    """Performance-related errors"""
    pass


class ErrorHandler:
    """Enhanced error handler with user-friendly messages and suggestions"""
    
    @staticmethod
    def handle_claude_cli_not_found(command: str) -> ClaudetteError:
        """Handle Claude CLI not found error"""
        suggestions = [
            f"Install Claude CLI: Visit https://claude.ai/code to download",
            f"Check if '{command}' is in your PATH",
            f"Update config.yaml with correct claude_cmd path",
            f"Try running '{command} --version' to test installation"
        ]
        
        message = f"Claude CLI not found at '{command}'"
        return BackendError(message, suggestions)
    
    @staticmethod
    def handle_api_key_missing(backend: str) -> ClaudetteError:
        """Handle missing API key error"""
        env_var_map = {
            'openai': 'OPENAI_API_KEY',
            'mistral': 'MISTRAL_API_KEY',
        }
        
        env_var = env_var_map.get(backend, f'{backend.upper()}_API_KEY')
        suggestions = [
            f"Set environment variable: export {env_var}=your_api_key",
            f"Add to config.yaml: {backend}_key: your_api_key",
            f"Visit {backend} website to obtain API key",
        ]
        
        message = f"API key missing for {backend} backend"
        return BackendError(message, suggestions)
    
    @staticmethod
    def handle_config_file_error(config_path: Path, error: Exception) -> ClaudetteError:
        """Handle configuration file errors"""
        suggestions = [
            f"Check YAML syntax in {config_path}",
            f"Ensure file is readable (check permissions)",
            f"Run 'claudette config --validate' to check configuration",
            f"Create example config: claudette config --example > config.yaml"
        ]
        
        message = f"Configuration file error: {error}"
        return ConfigurationError(message, suggestions)
    
    @staticmethod
    def handle_backend_failure(backend: str, error: Exception) -> ClaudetteError:
        """Handle backend communication failures"""
        suggestions = []
        
        error_str = str(error).lower()
        
        if 'timeout' in error_str:
            suggestions.extend([
                "Check your internet connection",
                "Increase timeout in config.yaml",
                "Try again in a few minutes"
            ])
        elif 'rate limit' in error_str or '429' in error_str:
            suggestions.extend([
                "Wait before retrying (rate limit exceeded)",
                "Consider using a different backend",
                "Check your API usage limits"
            ])
        elif 'auth' in error_str or '401' in error_str:
            suggestions.extend([
                "Verify your API key is correct",
                f"Check {backend} account status",
                "API key might be expired or invalid"
            ])
        else:
            suggestions.extend([
                f"Check {backend} service status",
                "Try a different backend with --backend flag",
                "Enable fallback mode in configuration"
            ])
        
        message = f"{backend.title()} backend failed: {error}"
        return BackendError(message, suggestions)
    
    @staticmethod
    def handle_performance_warning(issue: str, current_value: float, threshold: float) -> None:
        """Handle performance warnings (non-fatal)"""
        suggestions = []
        
        if 'startup' in issue.lower():
            suggestions.extend([
                "Enable fast path for simple commands",
                "Check if heavy imports can be deferred",
                "Clear cache if it's too large: rm -rf ~/.claudette/cache"
            ])
        elif 'memory' in issue.lower():
            suggestions.extend([
                "Restart claudette periodically for long sessions",
                "Reduce cache size in configuration",
                "Close other memory-intensive applications"
            ])
        
        print(f"⚠️  Performance Warning: {issue}", file=sys.stderr)
        print(f"   Current: {current_value:.2f}, Threshold: {threshold:.2f}", file=sys.stderr)
        
        if suggestions:
            print("   Suggestions:", file=sys.stderr)
            for suggestion in suggestions:
                print(f"   • {suggestion}", file=sys.stderr)
    
    @staticmethod
    def format_error_message(error: ClaudetteError) -> str:
        """Format error message with suggestions"""
        lines = [
            f"❌ Error: {error}",
            ""
        ]
        
        if error.suggestions:
            lines.append("💡 Suggestions:")
            for i, suggestion in enumerate(error.suggestions, 1):
                lines.append(f"   {i}. {suggestion}")
            lines.append("")
        
        return "\n".join(lines)
    
    @staticmethod
    def print_error(error: ClaudetteError) -> None:
        """Print formatted error to stderr"""
        print(ErrorHandler.format_error_message(error), file=sys.stderr)
    
    @staticmethod
    def handle_unexpected_error(error: Exception, context: str = "") -> ClaudetteError:
        """Handle unexpected errors with debugging info"""
        suggestions = [
            "Report this issue on GitHub with the error details",
            "Try running with --debug flag for more information",
            "Check if claudette needs updating: pip install --upgrade claudette"
        ]
        
        if context:
            message = f"Unexpected error during {context}: {error}"
        else:
            message = f"Unexpected error: {error}"
        
        # Add traceback for debugging (not shown to user by default)
        debug_info = traceback.format_exc()
        return ClaudetteError(message, suggestions)


def handle_keyboard_interrupt() -> None:
    """Handle Ctrl+C gracefully"""
    print("\n🛑 Interrupted by user", file=sys.stderr)
    sys.exit(130)  # Standard exit code for keyboard interrupt


def check_system_requirements() -> List[str]:
    """Check system requirements and return warnings"""
    warnings = []
    
    # Check Python version
    if sys.version_info < (3, 8):
        warnings.append("Python 3.8+ recommended for optimal performance")
    
    # Check if git is available (for commit commands)
    if not subprocess.run(['git', '--version'], capture_output=True, text=True).returncode == 0:
        warnings.append("Git not found - commit commands will not work")
    
    # Check available disk space
    try:
        import shutil
        cache_dir = Path.home() / '.claudette'
        if cache_dir.exists():
            total, used, free = shutil.disk_usage(cache_dir)
            if free < 100 * 1024 * 1024:  # Less than 100MB
                warnings.append("Low disk space - cache may be limited")
    except Exception:
        pass
    
    return warnings


def validate_environment() -> Tuple[bool, List[str]]:
    """Validate environment and return (is_valid, warnings)"""
    warnings = []
    is_valid = True
    
    # System requirements check
    sys_warnings = check_system_requirements()
    warnings.extend(sys_warnings)
    
    # Check critical dependencies
    try:
        import yaml
    except ImportError:
        warnings.append("PyYAML not installed - configuration loading may fail")
        is_valid = False
    
    return is_valid, warnings