"""
Preprocessor - Compress prompts using external LLMs
Full compression implementation with token limiting and caching
"""

import os
import sys
from typing import Dict, Any, Optional, List
from pathlib import Path

# Lazy imports for performance
from .lazy_imports import openai_lazy as openai, tiktoken_lazy as tiktoken, LazyFunction

# Import token counter from existing codebase
# sys.path manipulation removed - using proper imports.parent.parent / "core" / "cost-tracking"))
try:
    from tracker import ClaudeCostTracker
except ImportError:
    class ClaudeCostTracker:
        def estimate_tokens(self, text, is_input=True):
            return len(text) // 4


class Preprocessor:
    """Handles prompt compression and preprocessing via external LLMs"""
    
    def __init__(self, config=None):
        # Accept config or lazy load
        if config is None:
            from .config import Config
            config = Config({})
            
        self.config = config
        self._client = None
        self._encoder = None
        self.token_counter = ClaudeCostTracker()
        
        # Token limits
        self.max_output_tokens = 2000
        self.compression_target = 400  # OpenAI response limit
        
        # Cache settings
        self.use_cache = getattr(config, 'history_enabled', True)
        self._cache_manager = None
    
    @property
    def client(self):
        """Lazy load OpenAI client only when needed"""
        if self._client is None and self.config.openai_key:
            if openai:
                self._client = openai.OpenAI(api_key=self.config.openai_key)
        return self._client
    
    @property
    def encoder(self):
        """Lazy load tiktoken encoder only when needed"""
        if self._encoder is None and tiktoken and self.client:
            try:
                self._encoder = tiktoken.encoding_for_model(self.config.openai_model)
            except (KeyError, AttributeError):
                self._encoder = tiktoken.get_encoding("cl100k_base")
        return self._encoder
    
    @property
    def cache_manager(self):
        """Lazy load cache manager only when needed"""
        if self._cache_manager is None:
            try:
                from .cache import get_cache_manager
                self._cache_manager = get_cache_manager(getattr(self.config, 'cache_dir', None))
            except ImportError:
                # Simple fallback
                class SimpleCacheManager:
                    def compute_prompt_hash(self, prompt): return hash(prompt)
                    def compute_file_digest(self, files): return hash(tuple(files))
                    def lookup(self, *args): return None
                self._cache_manager = SimpleCacheManager()
        return self._cache_manager
    
    def estimate_tokens(self, text: str) -> int:
        """Estimate token count for text"""
        encoder = self.encoder
        if encoder:
            return len(encoder.encode(text))
        return self.token_counter.estimate_tokens(text)
    
    def compress(self, prompt: str, context: Dict[str, Any], 
                 backend_name: str = None, use_cache: bool = None) -> str:
        """
        Compress prompt using external LLM with token limits and caching
        
        Args:
            prompt: Original user prompt
            context: Additional context from context_builder
            backend_name: Target backend name for cache lookup
            use_cache: Override cache usage setting
            
        Returns:
            Compressed prompt ready for Claude CLI (≤2000 tokens)
        """
        # Override cache setting if specified
        cache_enabled = self.use_cache if use_cache is None else use_cache
        
        # Build full context string
        context_str = self._build_context_string(context)
        full_prompt = f"{prompt}\n\nContext:\n{context_str}"
        
        # Check cache for existing compression
        if cache_enabled and backend_name:
            cache_hit = self._check_cache(prompt, context.get('files', []), backend_name)
            if cache_hit:
                print("Cache hit, reusing compressed prompt")
                return f"###COMPRESSED###\n{cache_hit['compressed_prompt']}"
        
        # Check if compression needed
        original_tokens = self.estimate_tokens(full_prompt)
        if original_tokens <= self.max_output_tokens:
            return f"###COMPRESSED###\n{full_prompt}"
        
        client = self.client
        if not client:
            return f"###COMPRESSED###\n{self._fallback_compression(prompt, context)}"
        
        try:
            # Compress using OpenAI
            compressed = self._openai_compress(prompt, context_str)
            
            # Ensure token limit
            final_prompt = self._ensure_token_limit(compressed)
            
            return f"###COMPRESSED###\n{final_prompt}"
            
        except Exception as e:
            print(f"Warning: OpenAI compression failed: {e}")
            return f"###COMPRESSED###\n{self._fallback_compression(prompt, context)}"
    
    def _openai_compress(self, prompt: str, context_str: str) -> str:
        """Compress using OpenAI API"""
        compression_prompt = f"""Compress this development task for efficient Claude Code execution:

TASK: {prompt}

CONTEXT: {context_str}

Requirements:
- Preserve all essential technical details
- Keep file paths and specific requirements
- Remove redundant explanations
- Use concise technical language
- Maintain actionable instructions

Return only the compressed version:"""
        
        client = self.client
        if not client:
            raise RuntimeError("OpenAI client not available")
            
        response = client.chat.completions.create(
            model=self.config.openai_model,
            messages=[
                {
                    "role": "system",
                    "content": "You are a concise rewriting engine. Compress development prompts while preserving all technical details and actionability."
                },
                {
                    "role": "user",
                    "content": compression_prompt
                }
            ],
            max_tokens=self.compression_target,
            temperature=0.3
        )
        
        return response.choices[0].message.content.strip()
    
    def _build_context_string(self, context: Dict[str, Any]) -> str:
        """Build context string from context dict"""
        parts = []
        
        if context.get('command_type'):
            parts.append(f"Command: {context['command_type']}")
        
        if context.get('files'):
            files = context['files'][:5]  # Limit file list
            parts.append(f"Files: {', '.join(files)}")
        
        if context.get('file_info'):
            info = context['file_info']
            if info.get('size', 0) > 0:
                parts.append(f"File size: {info['size']} bytes")
            if info.get('extension'):
                parts.append(f"Type: {info['extension']}")
        
        if context.get('summary'):
            parts.append(f"Summary: {context['summary']}")
        
        return " | ".join(parts)
    
    def _ensure_token_limit(self, text: str) -> str:
        """Ensure text stays under token limit"""
        current_tokens = self.estimate_tokens(text)
        
        if current_tokens <= self.max_output_tokens:
            return text
        
        # More aggressive trimming to ensure we stay under limit
        words = text.split()
        reduction_ratio = (self.max_output_tokens - 50) / current_tokens  # Leave buffer
        target_words = int(len(words) * reduction_ratio)
        
        if target_words < len(words) // 2:
            # Very aggressive trimming for large texts
            keep_start = min(target_words // 3, 100)
            keep_end = min(target_words - keep_start, 50)
            
            if keep_start + keep_end < len(words):
                trimmed = words[:keep_start] + ["[...content trimmed for token limit...]"] + words[-keep_end:]
                return " ".join(trimmed)
        
        # Standard trimming
        return " ".join(words[:target_words]) + " [...]"
    
    def _fallback_compression(self, prompt: str, context: Dict[str, Any]) -> str:
        """Fallback compression when OpenAI unavailable"""
        # Basic compression: remove redundant words and phrases
        compressed = prompt.strip()
        
        # Simple text compression techniques
        compressed = self._basic_text_compression(compressed)
        
        # Add essential context efficiently
        context_parts = []
        if context.get('command_type'):
            context_parts.append(f"Cmd: {context['command_type']}")
        if context.get('files'):
            file_count = len(context['files'])
            context_parts.append(f"Files: {file_count}")
        
        if context_parts:
            compressed += f" [{', '.join(context_parts)}]"
        
        # Ensure token limit with more aggressive compression
        return self._ensure_token_limit(compressed)
    
    def _basic_text_compression(self, text: str) -> str:
        """Apply basic text compression techniques"""
        # Remove common redundant phrases
        redundant_patterns = [
            ("please ", ""),
            ("could you ", ""),
            ("i need you to ", ""),
            ("can you ", ""),
            ("i want you to ", ""),
            ("  ", " "),  # Double spaces
            ("\n\n", "\n"),  # Double newlines
        ]
        
        compressed = text
        for pattern, replacement in redundant_patterns:
            compressed = compressed.replace(pattern, replacement)
        
        # Simplify common phrases
        compressed = compressed.replace("completely rewrite", "rewrite")
        compressed = compressed.replace("from scratch", "")
        compressed = compressed.replace("entire application", "app")
        
        return compressed.strip()
    
    def _check_cache(self, prompt: str, files: List[str], backend: str) -> Optional[Dict[str, Any]]:
        """Check cache for existing compression"""
        try:
            prompt_hash = self.cache_manager.compute_prompt_hash(prompt)
            file_digest = self.cache_manager.compute_file_digest(files)
            
            return self.cache_manager.lookup(prompt_hash, file_digest, backend)
        except Exception as e:
            print(f"Warning: Cache lookup failed: {e}")
            return None