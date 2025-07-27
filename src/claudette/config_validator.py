"""
Configuration validation and helper methods for Claudette
Provides validation utilities and smart configuration defaults
"""

import shutil
import re
from pathlib import Path
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse


def validate_command(command: str) -> str:
    """Validate and normalize command path"""
    if not command or not isinstance(command, str):
        raise ValueError("Command must be a non-empty string")
    
    # Check if command is available in PATH
    if shutil.which(command):
        return command
    
    # Check if it's an absolute path
    command_path = Path(command)
    if command_path.is_absolute() and command_path.exists():
        return str(command_path)
    
    # Return as-is but warn about potential issues
    return command


def validate_url(url: str) -> str:
    """Validate and normalize URL"""
    if not url or not isinstance(url, str):
        raise ValueError("URL must be a non-empty string")
    
    try:
        parsed = urlparse(url)
        if not all([parsed.scheme, parsed.netloc]):
            raise ValueError("URL must have scheme and netloc")
        
        # Normalize common schemes
        if parsed.scheme not in ['http', 'https']:
            raise ValueError("URL must use http or https scheme")
        
        return url
    except Exception as e:
        raise ValueError(f"Invalid URL format: {e}")


def validate_backend_name(backend: str) -> bool:
    """Validate backend name"""
    valid_backends = {'claude', 'openai', 'mistral', 'ollama', 'fallback', 'auto'}
    return backend in valid_backends


def validate_model_name(model: str, backend: str) -> bool:
    """Validate model name for specific backend"""
    model_patterns = {
        'openai': r'^(gpt-|text-|davinci-|curie-|babbage-|ada-)',
        'mistral': r'^(mistral-|codestral-)',
        'ollama': r'^[a-z0-9\-\_]+$',  # More flexible for local models
    }
    
    if backend not in model_patterns:
        return True  # Unknown backend, assume valid
    
    pattern = model_patterns[backend]
    return bool(re.match(pattern, model, re.IGNORECASE))


def get_config_suggestions(config_data: Dict[str, Any]) -> List[str]:
    """Generate configuration improvement suggestions"""
    suggestions = []
    
    # Check for missing API keys
    if not config_data.get('openai_key') and not os.getenv('OPENAI_API_KEY'):
        suggestions.append("Consider setting 'openai_key' for OpenAI backend support")
    
    if not config_data.get('mistral_key') and not os.getenv('MISTRAL_API_KEY'):
        suggestions.append("Consider setting 'mistral_key' for Mistral backend support")
    
    # Check backend configuration
    default_backend = config_data.get('default_backend', 'auto')
    if default_backend != 'auto':
        if not validate_backend_name(default_backend):
            suggestions.append(f"Invalid default_backend '{default_backend}', should be one of: claude, openai, mistral, ollama, fallback, auto")
    
    # Performance suggestions
    if config_data.get('fast_path_enabled', True) is False:
        suggestions.append("Disabling fast_path_enabled will reduce performance for simple commands")
    
    if config_data.get('cache_enabled', True) is False:
        suggestions.append("Disabling cache_enabled will reduce performance and increase costs")
    
    return suggestions


def create_example_config() -> Dict[str, Any]:
    """Create an example configuration with documentation"""
    return {
        # Core Claudette Settings
        'claude_cmd': 'claude',
        'default_backend': 'auto',
        'fallback_enabled': True,
        
        # Backend Configurations
        'openai_key': '${OPENAI_API_KEY}',  # Use environment variable
        'openai_model': 'gpt-3.5-turbo',
        'mistral_key': '${MISTRAL_API_KEY}',
        'mistral_model': 'mistral-tiny',
        'ollama_model': 'llama2',
        'ollama_url': 'http://localhost:11434',
        
        # Performance Settings
        'cache_enabled': True,
        'fast_path_enabled': True,
        'compression_enabled': True,
        
        # Advanced Settings
        'debug': False,
        'max_retries': 3,
        'timeout': 30,
    }


def save_example_config(path: Path) -> None:
    """Save an example configuration file with comments"""
    config_content = '''# Claudette Configuration File
# For detailed documentation, visit: https://github.com/your-repo/claudette

# Core Settings
claude_cmd: claude                    # Path to Claude CLI executable
default_backend: auto                 # Backend selection: auto, claude, openai, mistral, ollama, fallback
fallback_enabled: true               # Enable automatic fallback to other backends

# Backend API Keys (recommend using environment variables)
openai_key: ${OPENAI_API_KEY}        # OpenAI API key
mistral_key: ${MISTRAL_API_KEY}      # Mistral API key

# Model Selection
openai_model: gpt-3.5-turbo          # OpenAI model to use
mistral_model: mistral-tiny           # Mistral model to use
ollama_model: llama2                  # Local Ollama model
ollama_url: http://localhost:11434    # Ollama server URL

# Performance Optimizations
cache_enabled: true                   # Enable session caching
fast_path_enabled: true              # Enable fast path for simple commands
compression_enabled: true            # Enable prompt compression

# Advanced Settings
debug: false                         # Enable debug logging
max_retries: 3                       # Maximum retry attempts for failed requests
timeout: 30                          # Request timeout in seconds
'''
    
    with open(path, 'w') as f:
        f.write(config_content)


import os  # Import needed for environment variable access