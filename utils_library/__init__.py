"""
Python Utility Library
======================

A comprehensive utility library with mixed-model development approach:
- Code generation via Qwen backend
- Coordination via Claude

Modules:
- file_utils: File operations (read, write, copy)
- string_utils: String formatting and validation
- data_utils: JSON/CSV processing utilities
"""

from .file_utils import FileUtils
from .string_utils import StringUtils  
from .data_utils import DataUtils

__version__ = "1.0.0"
__author__ = "QwenCoder Agent (Swarm)"

# Export main utility classes
__all__ = ['FileUtils', 'StringUtils', 'DataUtils']