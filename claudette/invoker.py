"""
Claude Invoker - Smart routing with fallback support
Handles execution and output streaming with automatic backend selection
"""

import subprocess
import sys
from typing import List, Optional, Dict, Any
from pathlib import Path

from .config import Config
from .backends import load_backend, list_available_backends


class ClaudeInvoker:
    """Handles smart routing between multiple backends including plugins"""
    
    def __init__(self, config: Config):
        self.config = config
        self._backend_cache = {}
        
        # Cache settings
        self.use_cache = getattr(config, 'history_enabled', True)
        self.cache_manager = get_cache_manager(getattr(config, 'cache_dir', None))
    
    def run(self, cmd_args: List[str], message: str, backend_override: Optional[str] = None, 
            context: Optional[Dict[str, Any]] = None, use_cache: Optional[bool] = None) -> subprocess.CompletedProcess:
        """
        Execute with smart backend selection and caching
        
        Args:
            cmd_args: Command arguments (e.g., ['edit', 'file.py'])
            message: Preprocessed message to send
            backend_override: Force specific backend ('claude', 'openai', 'auto')
            context: Context information for caching
            use_cache: Override cache usage setting
            
        Returns:
            CompletedProcess result
        """
        # Prepend claudette header
        if message:
            claudette_message = f"# Prepared by claudette v0.3\n{message}"
        else:
            claudette_message = "# Prepared by claudette v0.3\nNo message provided"
        
        # Determine which backend to use
        backend, backend_name = self._select_backend(backend_override)
        
        if not backend:
            error_msg = f"Backend '{backend_override or 'auto'}' not available"
            print(error_msg, file=sys.stderr)
            return subprocess.CompletedProcess(
                args=['claudette'] + cmd_args,
                returncode=1,
                stdout="",
                stderr=error_msg
            )
        
        try:
            # Execute via selected backend
            output = backend.send(claudette_message, cmd_args)
            
            # Save to cache if enabled
            cache_enabled = self.use_cache if use_cache is None else use_cache
            if cache_enabled and context and output:
                self._save_to_cache(cmd_args, message, claudette_message, 
                                  backend_name, output, context)
            
            # Print output
            if output:
                print(output, end='')
            
            # Return successful result
            return subprocess.CompletedProcess(
                args=['claudette'] + cmd_args,
                returncode=0,
                stdout=output,
                stderr=""
            )
            
        except Exception as e:
            error_msg = f"Error with {backend_name}: {e}"
            print(error_msg, file=sys.stderr)
            
            # If primary backend failed and fallback is enabled, try alternatives
            if (backend_name == "claude" and 
                self.config.fallback_enabled and 
                backend_override != "claude"):
                
                return self._try_fallback_backends(cmd_args, claudette_message)
            
            # Return error result
            return subprocess.CompletedProcess(
                args=['claudette'] + cmd_args,
                returncode=1,
                stdout="",
                stderr=error_msg
            )
    
    def _get_backend(self, name: str):
        """Get backend instance with caching"""
        if name not in self._backend_cache:
            backend = load_backend(name, self.config.to_dict())
            self._backend_cache[name] = backend
        return self._backend_cache[name]
    
    def _select_backend(self, backend_override: Optional[str]) -> tuple:
        """Select appropriate backend based on configuration and quota"""
        # Handle explicit override
        if backend_override and backend_override != "auto":
            backend = self._get_backend(backend_override)
            return backend, backend_override
        
        # Auto selection (default)
        # Use config default_backend if set
        default_backend = getattr(self.config, 'default_backend', 'claude')
        
        # Check Claude quota if fallback is enabled
        if (self.config.fallback_enabled and default_backend == 'claude'):
            claude_backend = self._get_backend('claude')
            if claude_backend and hasattr(claude_backend, 'quota_low') and claude_backend.quota_low():
                # Try OpenAI fallback
                openai_backend = self._get_backend('openai')
                if openai_backend and openai_backend.is_available():
                    print("Claude quota low, routed to OpenAI backend")
                    return openai_backend, 'openai'
        
        # Try default backend
        backend = self._get_backend(default_backend)
        if backend and backend.is_available():
            return backend, default_backend
        
        # Try available backends in order of preference
        preferred_order = ['claude', 'openai', 'mistral', 'ollama', 'fallback']
        
        for backend_name in preferred_order:
            if backend_name == default_backend:
                continue  # Already tried
            
            backend = self._get_backend(backend_name)
            if backend and backend.is_available():
                print(f"Using {backend_name} backend")
                return backend, backend_name
        
        # Last resort
        fallback = self._get_backend('fallback')
        return fallback, 'fallback'
    
    def _try_fallback_backends(self, cmd_args: List[str], message: str) -> subprocess.CompletedProcess:
        """Try fallback backends when primary fails"""
        fallback_order = ['openai', 'mistral', 'ollama', 'fallback']
        
        for backend_name in fallback_order:
            try:
                backend = self._get_backend(backend_name)
                if backend and backend.is_available():
                    print(f"Claude quota low, routed to {backend_name} backend", file=sys.stderr)
                    output = backend.send(message, cmd_args)
                    
                    if output:
                        print(output, end='')
                    
                    return subprocess.CompletedProcess(
                        args=['claudette'] + cmd_args,
                        returncode=0,
                        stdout=output,
                        stderr=""
                    )
            except Exception as e:
                print(f"Warning: {backend_name} backend failed: {e}", file=sys.stderr)
                continue
        
        # All fallbacks failed
        error_msg = "All fallback backends failed"
        print(error_msg, file=sys.stderr)
        
        return subprocess.CompletedProcess(
            args=['claudette'] + cmd_args,
            returncode=1,
            stdout="",
            stderr=error_msg
        )
    
    def _save_to_cache(self, cmd_args: List[str], raw_prompt: str, compressed_prompt: str,
                      backend_name: str, response: str, context: Dict[str, Any]):
        """Save operation to cache"""
        try:
            # Extract command type
            cmd_type = cmd_args[0] if cmd_args else 'unknown'
            
            # Get file list from context or cmd_args
            files = context.get('files', [])
            if not files and len(cmd_args) > 1:
                # Try to extract files from command args
                files = [arg for arg in cmd_args[1:] if not arg.startswith('-')]
            
            # Estimate token count from compressed prompt
            compressed_tokens = len(compressed_prompt.split()) * 1.3  # Rough estimate
            
            # Create cache event
            event = create_cache_event(
                cmd=cmd_type,
                files=files,
                raw_prompt=raw_prompt,
                compressed_prompt=compressed_prompt,
                backend=backend_name,
                compressed_tokens=int(compressed_tokens),
                response=response
            )
            
            # Save to cache
            self.cache_manager.save_event(event)
            
        except Exception as e:
            print(f"Warning: Failed to save to cache: {e}", file=sys.stderr)