"""
Claudette - Claude Code compatible CLI wrapper
Preprocesses user intent with external LLMs and forwards to Claude CLI
"""

__version__ = "2.0.0"
__author__ = "Claude Flow Project"

# Export main CLI function for testing
from .main import cli

__all__ = ['cli', '__version__', '__author__']