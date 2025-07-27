#!/usr/bin/env python3
"""
Qwen Backend Implementation for Claudette
Provides integration with Qwen/Qwen2.5-Coder-7B-Instruct-AWQ via flexcon-ai.de API
"""

import json
import logging
import requests
from typing import Dict, Any, Optional, List, Union
from .backends import BaseBackend

logger = logging.getLogger(__name__)


class QwenBackend(BaseBackend):
    """Backend implementation for Qwen LLM via flexcon-ai.de API"""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize Qwen backend with configuration
        
        Args:
            config: Configuration dictionary containing:
                - qwen_api_key: API key for flexcon-ai.de
                - qwen_base_url: Base URL (default: https://tools.flexcon-ai.de/v1)
                - qwen_model: Model name (default: Qwen/Qwen2.5-Coder-7B-Instruct-AWQ)
                - qwen_max_tokens: Maximum tokens per request (default: 2048)
                - qwen_timeout: Request timeout in seconds (default: 60)
        """
        super().__init__(config)
        
        # Qwen-specific configuration  
        self.api_key = config.get('qwen_api_key', 'k8J2mX9pQ3zW7vT5rY1nF4bL6hD8gK2J2mX9pQ3zW7vT5rY1')
        self.base_url = config.get('qwen_base_url', 'https://tools.flexcon-ai.de')
        self.model = config.get('qwen_model', 'Qwen/Qwen2.5-Coder-7B-Instruct-AWQ')
        self.max_tokens = config.get('qwen_max_tokens', 2048)
        self.timeout = config.get('qwen_timeout', 60)
        
        self.headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        
        logger.info(f"Qwen backend initialized with model: {self.model}")
    
    def is_available(self) -> bool:
        """Check if Qwen backend is available"""
        try:
            import urllib3
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
            
            # Check if API endpoints are available (skip base URL check as it returns 404)
            api_check = requests.get(
                f"{self.base_url}/v1/models",
                headers=self.headers,
                timeout=10,
                verify=False
            )
            
            if api_check.status_code != 200:
                logger.warning(f"Qwen API models endpoint failed: {api_check.status_code}")
                return False
            
            # Try a minimal API call to verify functionality
            response = requests.post(
                f"{self.base_url}/v1/chat/completions",
                headers=self.headers,
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": "test"}],
                    "max_tokens": 1
                },
                timeout=10,
                verify=False
            )
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"Qwen backend availability check failed: {e}")
            return False
    
    def send(self, prompt: str, cmd_args: List[str]) -> str:
        """Send prompt to Qwen LLM
        
        Args:
            prompt: User prompt to send
            cmd_args: Command arguments for context
            
        Returns:
            str: Response from Qwen LLM
            
        Raises:
            RuntimeError: If API request fails
            ValueError: If inputs are invalid
        """
        # Input validation
        if not isinstance(prompt, str):
            raise ValueError(f"Prompt must be string, got {type(prompt)}")
        if not isinstance(cmd_args, list):
            raise ValueError(f"Command args must be list, got {type(cmd_args)}")
        
        # Build context-aware prompt
        context_prompt = self._build_context_prompt(prompt, cmd_args)
        
        # Prepare API request
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system", 
                    "content": "You are a helpful coding assistant. Provide clear, concise, and accurate responses."
                },
                {
                    "role": "user", 
                    "content": context_prompt
                }
            ],
            "max_tokens": self.max_tokens,
            "temperature": 0.1,  # Low temperature for consistent code generation
            "top_p": 0.9
        }
        
        try:
            # Check availability before making the request
            if not self.is_available():
                raise RuntimeError("Qwen API is currently unavailable. The service may be down or endpoints have changed. Please check service status or try again later.")
            
            logger.debug(f"Sending request to Qwen API: {len(context_prompt)} chars")
            
            import urllib3
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
            
            response = requests.post(
                f"{self.base_url}/v1/chat/completions",
                headers=self.headers,
                json=payload,
                timeout=self.timeout,
                verify=False
            )
            
            response.raise_for_status()
            result = response.json()
            
            # Extract response content
            if 'choices' in result and len(result['choices']) > 0:
                content = result['choices'][0]['message']['content']
                
                # Log token usage if available
                if 'usage' in result:
                    usage = result['usage']
                    logger.info(f"Qwen API usage - prompt: {usage.get('prompt_tokens', 0)}, "
                               f"completion: {usage.get('completion_tokens', 0)}, "
                               f"total: {usage.get('total_tokens', 0)}")
                
                return content
            else:
                raise RuntimeError("Invalid response format from Qwen API")
                
        except requests.exceptions.RequestException as e:
            error_msg = f"Qwen API request failed: {e}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        except json.JSONDecodeError as e:
            error_msg = f"Invalid JSON response from Qwen API: {e}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        except Exception as e:
            error_msg = f"Unexpected error with Qwen API: {e}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
    
    def process(self, prompt: str, context: Dict[str, Any]) -> str:
        """Process prompt with context (legacy method for compatibility)
        
        Args:
            prompt: User prompt to process
            context: Additional context information
            
        Returns:
            str: Processed response from Qwen LLM
        """
        # Convert context to cmd_args for compatibility
        cmd_args = context.get('cmd_args', [])
        if not cmd_args and 'command' in context:
            cmd_args = context['command'].split() if isinstance(context['command'], str) else []
        
        return self.send(prompt, cmd_args)
    
    def _build_context_prompt(self, prompt: str, cmd_args: List[str]) -> str:
        """Build context-aware prompt based on command arguments
        
        Args:
            prompt: Original user prompt
            cmd_args: Command line arguments for context
            
        Returns:
            str: Enhanced prompt with context
        """
        context_parts = []
        
        # Add command context
        if cmd_args:
            if any(arg in ['edit', 'modify', 'change'] for arg in cmd_args):
                context_parts.append("Context: This is a code editing task.")
            elif any(arg in ['create', 'generate', 'new'] for arg in cmd_args):
                context_parts.append("Context: This is a code creation task.")
            elif any(arg in ['debug', 'fix', 'error'] for arg in cmd_args):
                context_parts.append("Context: This is a debugging/troubleshooting task.")
            elif any(arg in ['analyze', 'review', 'explain'] for arg in cmd_args):
                context_parts.append("Context: This is a code analysis task.")
            
            # Add file context if present
            file_args = [arg for arg in cmd_args if '.' in arg and not arg.startswith('-')]
            if file_args:
                context_parts.append(f"Files involved: {', '.join(file_args)}")
        
        # Combine context with prompt
        if context_parts:
            return f"{' '.join(context_parts)}\n\nTask: {prompt}"
        else:
            return prompt
    
    def estimate_cost(self, prompt: str, response: str) -> float:
        """Estimate cost of API call (placeholder implementation)
        
        Args:
            prompt: Input prompt
            response: API response
            
        Returns:
            float: Estimated cost in USD (very rough estimate)
        """
        # Rough token estimation (4 chars per token average)
        prompt_tokens = len(prompt) // 4
        response_tokens = len(response) // 4
        total_tokens = prompt_tokens + response_tokens
        
        # Estimated cost per 1K tokens (placeholder - adjust based on actual pricing)
        cost_per_1k = 0.002  # Very rough estimate
        return (total_tokens / 1000) * cost_per_1k


def create_qwen_backend(config: Dict[str, Any]) -> QwenBackend:
    """Factory function to create Qwen backend instance
    
    Args:
        config: Configuration dictionary
        
    Returns:
        QwenBackend: Configured Qwen backend instance
    """
    return QwenBackend(config)


# Integration with claudette backend system
def register_qwen_backend():
    """Register Qwen backend with claudette's backend system"""
    try:
        from .backends import register_backend
        register_backend('qwen', create_qwen_backend)
        logger.info("Qwen backend registered successfully")
    except ImportError:
        logger.warning("Could not register Qwen backend - backends module not available")


if __name__ == "__main__":
    # Test the Qwen backend
    test_config = {
        'qwen_api_key': 'k8J2mX9pQ3zW7vT5rY1nF4bL6hD8gK2J2mX9pQ3zW7vT5rY1',
        'qwen_max_tokens': 256
    }
    
    backend = QwenBackend(test_config)
    
    print("🔍 Testing Qwen Backend")
    print("=" * 40)
    
    # Test availability
    available = backend.is_available()
    print(f"Backend available: {available}")
    
    if available:
        # Test code generation
        response = backend.send(
            "Write a simple Python function to reverse a string", 
            ["create", "function.py"]
        )
        print(f"Response: {response[:200]}...")
        
        # Test code analysis
        response2 = backend.send(
            "Explain what this code does: def factorial(n): return 1 if n <= 1 else n * factorial(n-1)",
            ["analyze", "code.py"]
        )
        print(f"Analysis: {response2[:200]}...")