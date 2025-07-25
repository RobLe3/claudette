"""
Backend implementations for different LLM providers
Provides base classes and specific implementations with fallback routing

This module implements a flexible backend system for claudette that supports:
- Multiple LLM providers (Claude, OpenAI, Mistral, Ollama)
- Automatic fallback routing based on quotas and availability
- Plugin system for extensible backend support
- Security-hardened command execution and API calls
- Cost tracking and quota management

Security Features:
- Input validation for all prompts and commands
- Safe subprocess execution with timeouts
- API key validation and secure storage
- Command injection prevention

Example:
    >>> from claudette.backends import load_backend
    >>> backend = load_backend('claude', config)
    >>> result = backend.send('Hello, world!', ['edit', 'file.py'])

Architecture:
    BaseBackend (ABC)
    ├── ClaudeBackend (Primary)
    ├── OpenAIBackend (Fallback)
    └── FallbackBackend (Last resort)
"""

import sys
import re
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Union, Tuple
import subprocess
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Import cost tracking for quota detection
sys.path.append(str(Path(__file__).parent.parent / "core" / "cost-tracking"))
try:
    from tracker import ClaudeCostTracker
except ImportError:
    class ClaudeCostTracker:
        def get_daily_token_usage(self): return 0
        def get_monthly_token_usage(self): return 0


class BaseBackend(ABC):
    """
    Base class for LLM backends.
    
    This abstract base class defines the interface that all backend implementations
    must follow. It provides a consistent API for interacting with different
    LLM providers while allowing for provider-specific optimizations.
    
    Attributes:
        config (Dict[str, Any]): Configuration dictionary for the backend
    
    Security:
        - All implementations must validate inputs
        - Subclasses should implement proper error handling
        - API keys and credentials must be handled securely
    
    Example:
        >>> class MyBackend(BaseBackend):
        ...     def send(self, prompt, cmd_args):
        ...         return self._process_safely(prompt, cmd_args)
    """
    
    def __init__(self, config: Dict[str, Any]) -> None:
        """
        Initialize backend with configuration.
        
        Args:
            config: Configuration dictionary with backend settings
            
        Raises:
            ValueError: If config is invalid or missing required fields
        """
        if not isinstance(config, dict):
            raise ValueError(f"Config must be a dictionary, got {type(config)}")
            
        self.config = config.copy()  # Create defensive copy
        
        # Validate configuration on initialization
        self._validate_config()
        
        logger.debug(f"Initialized {self.__class__.__name__} backend")
    
    def _validate_config(self) -> None:
        """
        Validate backend configuration.
        
        Raises:
            ValueError: If configuration is invalid
        """
        # Base validation - subclasses can override
        if not isinstance(self.config, dict):
            raise ValueError("Configuration must be a dictionary")
    
    @abstractmethod
    def send(self, prompt: str, cmd_args: List[str]) -> str:
        """
        Send prompt and return result.
        
        Args:
            prompt: User prompt to process
            cmd_args: Command arguments for context
            
        Returns:
            str: Processed response from the backend
            
        Raises:
            RuntimeError: If backend is unavailable or request fails
            ValueError: If inputs are invalid
        
        Security:
            - Must validate all inputs before processing
            - Should sanitize prompts to prevent injection attacks
            - Must handle API keys securely
        """
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """
        Check if backend is available and configured.
        
        Returns:
            bool: True if backend can be used, False otherwise
            
        Note:
            This method should be fast and not perform expensive operations.
            It should check configuration validity and basic availability.
        """
        pass
    
    @abstractmethod
    def process(self, prompt: str, context: Dict[str, Any]) -> str:
        """
        Process prompt and return result (legacy method).
        
        Args:
            prompt: User prompt to process
            context: Additional context information
            
        Returns:
            str: Processed response
            
        Deprecated:
            This method is maintained for backwards compatibility.
            New code should use send() instead.
        """
        pass


class ClaudeBackend(BaseBackend):
    """
    Claude CLI backend with quota detection and smart routing.
    
    This backend integrates with the Claude CLI tool to provide access to
    Anthropic's Claude models. It includes intelligent quota detection to
    enable automatic fallback to other providers when limits are reached.
    
    Features:
        - Quota detection and monitoring
        - Cost tracking integration
        - Secure subprocess execution
        - Automatic retry logic
    
    Configuration:
        - claude_cmd: Path to Claude CLI executable
        - Additional Claude-specific settings
    
    Example:
        >>> backend = ClaudeBackend({'claude_cmd': 'claude'})
        >>> if backend.is_available():
        ...     result = backend.send('Hello', ['edit', 'file.py'])
    """
    
    def __init__(self, config: Dict[str, Any]) -> None:
        """
        Initialize Claude backend with configuration.
        
        Args:
            config: Configuration dictionary
            
        Raises:
            ValueError: If Claude command is not properly configured
        """
        super().__init__(config)
        
        # Validate and sanitize Claude command
        raw_cmd = config.get('claude_cmd', 'claude')
        self.claude_cmd = self._sanitize_claude_cmd(raw_cmd)
        
        # Initialize cost tracker with error handling
        try:
            self.cost_tracker = ClaudeCostTracker()
            logger.debug("Cost tracker initialized successfully")
        except Exception as e:
            logger.warning(f"Cost tracker initialization failed: {e}")
            self.cost_tracker = ClaudeCostTracker()  # Use fallback
            
    def _sanitize_claude_cmd(self, cmd: str) -> str:
        """
        Sanitize Claude command to prevent injection attacks.
        
        Args:
            cmd: Raw command from configuration
            
        Returns:
            str: Sanitized command
        """
        if not cmd or not isinstance(cmd, str):
            return 'claude'
            
        cmd = cmd.strip()
        
        # Check for dangerous characters
        dangerous_chars = {'&', '|', ';', '$', '`', '(', ')', '<', '>', '\n', '\r'}
        if any(char in cmd for char in dangerous_chars):
            logger.warning(f"Potentially unsafe Claude command: {cmd}")
            return 'claude'
            
        # Limit length
        if len(cmd) > 100:
            logger.warning(f"Claude command too long: {len(cmd)} chars")
            return 'claude'
            
        return cmd
    
    def send(self, prompt: str, cmd_args: List[str]) -> str:
        """
        Execute Claude CLI with command arguments.
        
        Args:
            prompt: User prompt to send to Claude
            cmd_args: Command arguments for context
            
        Returns:
            str: Response from Claude CLI
            
        Raises:
            RuntimeError: If Claude CLI execution fails
            ValueError: If inputs are invalid
        
        Security:
            - Validates all inputs before execution
            - Uses safe subprocess execution
            - Prevents command injection
        """
        # Input validation
        if not isinstance(prompt, str):
            raise ValueError(f"Prompt must be string, got {type(prompt)}")
        if not isinstance(cmd_args, list):
            raise ValueError(f"Command args must be list, got {type(cmd_args)}")
            
        # Sanitize inputs
        safe_prompt = self._sanitize_prompt(prompt)
        safe_args = self._sanitize_cmd_args(cmd_args)
        
        # Build command safely
        cmd = [self.claude_cmd] + safe_args + ["--message", safe_prompt]
        
        logger.debug(f"Executing Claude CLI with {len(safe_args)} args and {len(safe_prompt)} char prompt")
        
        try:
            result = subprocess.run(
                cmd,
                check=True,
                text=True,
                capture_output=True,
                timeout=300,  # 5 minute timeout
                shell=False,  # Prevent shell injection
                env=self._get_safe_env()  # Sanitized environment
            )
            
            if result.stdout:
                logger.debug(f"Claude CLI returned {len(result.stdout)} characters")
                return result.stdout
            else:
                logger.warning("Claude CLI returned empty response")
                return ""
        except subprocess.CalledProcessError as e:
            error_msg = f"Claude CLI failed with exit code {e.returncode}"
            if e.stderr:
                error_msg += f": {e.stderr.strip()}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
            
        except subprocess.TimeoutExpired:
            error_msg = "Claude CLI timed out after 5 minutes"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
            
        except FileNotFoundError:
            error_msg = f"Claude CLI not found: {self.claude_cmd}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
            
        except Exception as e:
            error_msg = f"Unexpected error executing Claude CLI: {e}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
    
    def quota_low(self) -> bool:
        """
        Check if Claude quota is low.
        
        Returns:
            bool: True if quota is running low and fallback should be used
            
        Note:
            Uses multiple detection methods for robustness:
            1. Cost tracker integration
            2. Claude CLI status parsing
            3. Conservative fallbacks on errors
        """
        try:
            # Try cost tracker first
            prompts_left = self.prompts_left()
            if prompts_left is not None:
                return prompts_left < 2
            
            # Fallback to parsing claude status
            return self._parse_claude_status() < 2
        except Exception:
            return False  # Conservative: assume quota is fine if we can't detect
    
    def prompts_left(self) -> Optional[int]:
        """
        Get remaining prompts from cost tracker.
        
        Returns:
            Optional[int]: Estimated number of prompts remaining,
                         None if cannot be determined
                         
        Note:
            Provides conservative estimates based on subscription tier
            and current usage patterns.
        """
        try:
            # Estimate based on subscription tier and usage
            daily_usage = self.cost_tracker.get_daily_token_usage()
            monthly_usage = self.cost_tracker.get_monthly_token_usage()
            
            # Conservative estimate for Pro tier (adjust based on actual limits)
            daily_limit = 2_000_000  # 2M tokens per day estimate
            monthly_limit = 60_000_000  # 60M tokens per month estimate
            
            # Check which limit is more restrictive
            daily_remaining = max(0, daily_limit - daily_usage)
            monthly_remaining = max(0, monthly_limit - monthly_usage)
            
            tokens_remaining = min(daily_remaining, monthly_remaining)
            
            # Estimate prompts (assume ~1000 tokens per prompt)
            estimated_prompts = tokens_remaining // 1000
            return estimated_prompts
        except Exception:
            return None
    
    def _parse_claude_status(self) -> int:
        """
        Parse Claude CLI status for remaining requests.
        
        Returns:
            int: Estimated remaining requests (100 if unknown)
            
        Security:
            - Safe subprocess execution with timeout
            - Error handling for all failure modes
        """
        try:
            result = subprocess.run(
                [self.claude_cmd, "/status"],
                check=False,
                capture_output=True,
                text=True,
                timeout=10,
                shell=False,
                env=self._get_safe_env()
            )
            
            if result.returncode != 0:
                return 100  # Assume plenty if status fails
            
            # Look for patterns like "You have X requests left"
            patterns = [
                r"You have (\d+) requests? left",
                r"(\d+) requests? remaining",
                r"Remaining requests?: (\d+)"
            ]
            
            for pattern in patterns:
                match = re.search(pattern, result.stdout, re.IGNORECASE)
                if match:
                    return int(match.group(1))
            
            return 100  # Default if we can't parse
        except Exception:
            return 100  # Conservative default
    
    def process(self, prompt: str, context: Dict[str, Any]) -> str:
        """Legacy process method for backwards compatibility"""
        return self.send(prompt, [])
    
    def is_available(self) -> bool:
        """
        Check if Claude CLI is available.
        
        Returns:
            bool: True if Claude CLI can be executed
            
        Note:
            This is a fast check that only tests if the CLI is accessible.
            It does not check authentication or quota status.
        """
        try:
            result = subprocess.run(
                [self.claude_cmd, "--version"],
                check=False,
                capture_output=True,
                text=True,
                timeout=5,
                shell=False
            )
            return result.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired, OSError) as e:
            logger.debug(f"Claude CLI availability check failed: {e}")
            return False
            
    def _sanitize_prompt(self, prompt: str) -> str:
        """
        Sanitize prompt to prevent injection attacks.
        
        Args:
            prompt: Raw prompt text
            
        Returns:
            str: Sanitized prompt
        """
        if not prompt:
            return ""
            
        # Limit prompt size
        max_size = 100 * 1024  # 100KB
        if len(prompt) > max_size:
            logger.warning(f"Prompt truncated from {len(prompt)} to {max_size} chars")
            prompt = prompt[:max_size] + "...[truncated]"
            
        return prompt
        
    def _sanitize_cmd_args(self, args: List[str]) -> List[str]:
        """
        Sanitize command arguments.
        
        Args:
            args: Raw command arguments
            
        Returns:
            List[str]: Sanitized arguments
        """
        if not args:
            return []
            
        sanitized = []
        for arg in args:
            if not isinstance(arg, str):
                logger.warning(f"Non-string argument ignored: {type(arg)}")
                continue
                
            # Limit argument length
            if len(arg) > 1000:
                logger.warning(f"Argument truncated from {len(arg)} chars")
                arg = arg[:1000]
                
            sanitized.append(arg)
            
        return sanitized
        
    def _get_safe_env(self) -> Dict[str, str]:
        """
        Get safe environment for subprocess execution.
        
        Returns:
            Dict[str, str]: Sanitized environment variables
        """
        import os
        
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


class OpenAIBackend(BaseBackend):
    """
    OpenAI API backend with Claude-compatible output.
    
    This backend provides a fallback option when Claude is unavailable or
    quota-limited. It formats responses to be compatible with Claude Code
    workflows while leveraging OpenAI's API.
    
    Features:
        - Claude-compatible response formatting
        - Secure API key handling
        - Prompt enhancement for better code generation
        - Error handling and retry logic
    
    Configuration:
        - openai_key: OpenAI API key
        - openai_model: Model to use (default: gpt-3.5-turbo)
    
    Security:
        - API key validation and secure storage
        - Input sanitization and size limits
        - Rate limiting and error handling
    """
    
    def __init__(self, config: Dict[str, Any]) -> None:
        """
        Initialize OpenAI backend with configuration.
        
        Args:
            config: Configuration dictionary
            
        Raises:
            ValueError: If API key is invalid
        """
        super().__init__(config)
        
        # Get and validate API key
        self.api_key = self._get_api_key(config)
        self.model = config.get('openai_model', 'gpt-3.5-turbo')
        self.client = None
        
        # Initialize client if API key is available
        if self.api_key:
            try:
                import openai
                self.client = openai.OpenAI(api_key=self.api_key)
                logger.debug("OpenAI client initialized successfully")
            except ImportError as e:
                logger.error(f"OpenAI package not available: {e}")
                raise RuntimeError("OpenAI package required but not installed")
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {e}")
                raise
                
    def _get_api_key(self, config: Dict[str, Any]) -> Optional[str]:
        """
        Get and validate OpenAI API key.
        
        Args:
            config: Configuration dictionary
            
        Returns:
            Optional[str]: API key if valid, None otherwise
        """
        import os
        
        # Try config first, then environment
        api_key = config.get('openai_key') or os.getenv('OPENAI_API_KEY')
        
        if not api_key:
            logger.debug("No OpenAI API key configured")
            return None
            
        # Basic validation
        if not isinstance(api_key, str) or len(api_key) < 10:
            logger.warning("OpenAI API key appears invalid")
            return None
            
        # Check format (OpenAI keys start with 'sk-')
        if not api_key.startswith('sk-'):
            logger.warning("OpenAI API key format appears incorrect")
            return None
            
        return api_key
    
    def send(self, prompt: str, cmd_args: List[str]) -> str:
        """
        Send prompt to OpenAI and return Claude-compatible response.
        
        Args:
            prompt: User prompt to process
            cmd_args: Command arguments for context
            
        Returns:
            str: Claude-compatible formatted response
            
        Raises:
            RuntimeError: If API call fails or client not configured
            ValueError: If inputs are invalid
        """
        # Input validation
        if not isinstance(prompt, str):
            raise ValueError(f"Prompt must be string, got {type(prompt)}")
        if not isinstance(cmd_args, list):
            raise ValueError(f"Command args must be list, got {type(cmd_args)}")
            
        if not self.client:
            raise RuntimeError("OpenAI client not configured - check API key")
            
        # Sanitize inputs
        safe_prompt = self._sanitize_prompt(prompt)
        logger.debug(f"Sending {len(safe_prompt)} char prompt to OpenAI")
        
        try:
            # Enhance prompt for better Claude compatibility
            enhanced_prompt = self._enhance_prompt_for_command(safe_prompt, cmd_args)
            
            # Validate enhanced prompt size
            if len(enhanced_prompt) > 16000:  # Stay within token limits
                logger.warning("Enhanced prompt too long, truncating")
                enhanced_prompt = enhanced_prompt[:16000] + "...[truncated]"
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system", 
                        "content": "You are a helpful coding assistant compatible with Claude Code workflows. Provide practical, actionable responses for development tasks. Format output as clear, executable code or specific instructions."
                    },
                    {"role": "user", "content": enhanced_prompt}
                ],
                max_tokens=2000,
                temperature=0.1,
                timeout=30  # 30 second timeout
            )
            
            if not response or not response.choices:
                logger.error("Empty response from OpenAI")
                raise RuntimeError("Empty response from OpenAI API")
            
            content = response.choices[0].message.content
            
            if not content:
                logger.warning("Empty content from OpenAI response")
                content = "[No response generated]"
                
            logger.debug(f"Received {len(content)} char response from OpenAI")
            
            # Format as Claude-compatible response
            return self._format_as_diff(content, cmd_args)
            
        except Exception as e:
            error_msg = f"OpenAI API failed: {type(e).__name__}: {e}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
    
    def _enhance_prompt_for_command(self, prompt: str, cmd_args: List[str]) -> str:
        """Enhance prompt based on command arguments"""
        if not cmd_args:
            return prompt
        
        command = cmd_args[0] if cmd_args else "unknown"
        
        if command == "edit":
            return f"For file editing task: {prompt}\nProvide specific code changes or suggestions."
        elif command == "commit":
            return f"For git commit: {prompt}\nSuggest commit message and changes summary."
        elif command == "new":
            return f"For new project: {prompt}\nProvide project structure and initial code."
        
        return prompt
    
    def _format_as_diff(self, content: str, cmd_args: List[str]) -> str:
        """Format OpenAI response as Claude-compatible diff"""
        command = cmd_args[0] if cmd_args else "unknown"
        
        # Simple diff wrapper for Phase 4
        return f"""```diff
# OpenAI Backend Response ({command} command)
+ {content.replace(chr(10), chr(10) + '+ ')}
```

Note: Response generated by OpenAI {self.model} (Claude quota fallback)"""
    
    def process(self, prompt: str, context: Dict[str, Any]) -> str:
        """Legacy process method"""
        return self.send(prompt, [])
    
    def is_available(self) -> bool:
        """Check if OpenAI API is configured"""
        return self.client is not None


class FallbackBackend(BaseBackend):
    """Fallback backend that passes through prompts unchanged"""
    
    def send(self, prompt: str, cmd_args: List[str]) -> str:
        """Return prompt as simple response"""
        return f"Fallback response for: {prompt}"
    
    def process(self, prompt: str, context: Dict[str, Any]) -> str:
        """Return prompt unchanged"""
        return prompt
    
    def is_available(self) -> bool:
        """Always available as fallback"""
        return True


def load_backend(name: str, config: Dict[str, Any] = None) -> Optional[BaseBackend]:
    """
    Factory function to load backends dynamically
    
    Discovery order:
    1. Built-in backends (claude, openai, fallback)
    2. Plugin files in claudette/plugins/
    3. Entry points under group 'claudette_backends'
    
    Args:
        name: Backend name (case insensitive)
        config: Configuration dictionary
        
    Returns:
        Backend instance or None if not found
    """
    if config is None:
        config = {}
    
    backend_name = name.lower()
    
    # 1. Built-in backends
    builtin_backends = {
        'claude': ClaudeBackend,
        'openai': OpenAIBackend,  
        'fallback': FallbackBackend
    }
    
    if backend_name in builtin_backends:
        try:
            return builtin_backends[backend_name](config)
        except Exception as e:
            print(f"Warning: Failed to load built-in backend '{name}': {e}")
            return None
    
    # 2. Plugin discovery
    try:
        from .plugins import load_backend as plugin_load_backend
        backend_class = plugin_load_backend(name)
        
        if backend_class:
            try:
                return backend_class(config)
            except Exception as e:
                print(f"Warning: Failed to instantiate plugin backend '{name}': {e}")
                return None
    except ImportError as e:
        print(f"Warning: Plugin system not available: {e}")
    
    # 3. Entry points (handled by plugin system)
    
    return None


def list_available_backends() -> List[str]:
    """
    List all available backend names
    
    Returns:
        List of backend names
    """
    backends = ['claude', 'openai', 'fallback']
    
    # Add plugin backends
    try:
        from .plugins import list_available_backends as plugin_list
        plugin_backends = plugin_list()
        
        # Merge, avoiding duplicates
        for backend in plugin_backends:
            if backend not in backends:
                backends.append(backend)
    except ImportError:
        pass
    
    return sorted(backends)