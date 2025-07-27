"""
Qwen Code Generator
==================

Utility for generating code using the Qwen backend within our mixed-model approach.
This demonstrates the separation of concerns: Qwen for code generation, Claude for coordination.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from claudette.qwen_backend import QwenBackend
from typing import Dict, Any, List


class QwenCodeGenerator:
    """Utility class for generating code using Qwen backend"""
    
    def __init__(self):
        """Initialize Qwen backend for code generation"""
        self.config = {
            'qwen_api_key': 'k8J2mX9pQ3zW7vT5rY1nF4bL6hD8gK2J2mX9pQ3zW7vT5rY1',
            'qwen_max_tokens': 2048,
            'qwen_timeout': 60
        }
        self.qwen = QwenBackend(self.config)
        
    def generate_file_utility(self, function_name: str, description: str) -> str:
        """Generate file utility function using Qwen"""
        prompt = f"""
        Create a Python function named '{function_name}' that {description}.
        
        Requirements:
        - Include proper error handling
        - Add type hints
        - Include docstring with examples
        - Use pathlib for path operations
        - Return appropriate types
        
        Generate only the function code, no extra explanation.
        """
        
        return self.qwen.send(prompt, ["create", "file_function.py"])
    
    def generate_string_utility(self, function_name: str, description: str) -> str:
        """Generate string utility function using Qwen"""
        prompt = f"""
        Create a Python function named '{function_name}' that {description}.
        
        Requirements:
        - Include proper error handling
        - Add type hints
        - Include docstring with examples
        - Handle edge cases (empty strings, None values)
        - Use efficient string operations
        
        Generate only the function code, no extra explanation.
        """
        
        return self.qwen.send(prompt, ["create", "string_function.py"])
    
    def generate_data_utility(self, function_name: str, description: str) -> str:
        """Generate data utility function using Qwen"""
        prompt = f"""
        Create a Python function named '{function_name}' that {description}.
        
        Requirements:
        - Include proper error handling
        - Add type hints
        - Include docstring with examples
        - Handle JSON/CSV format errors gracefully
        - Use standard library modules (json, csv)
        
        Generate only the function code, no extra explanation.
        """
        
        return self.qwen.send(prompt, ["create", "data_function.py"])
    
    def is_qwen_available(self) -> bool:
        """Check if Qwen backend is available for code generation"""
        return self.qwen.is_available()


# Demonstration function
def demo_qwen_generation():
    """Demonstrate Qwen code generation capabilities"""
    generator = QwenCodeGenerator()
    
    if not generator.is_qwen_available():
        print("❌ Qwen backend not available - using fallback implementations")
        return False
    
    print("🤖 Qwen backend is available - generating utility functions...")
    
    # Generate a sample file utility
    file_func = generator.generate_file_utility(
        "safe_read_text", 
        "reads a text file safely with encoding detection"
    )
    print(f"Generated file utility:\n{file_func[:200]}...")
    
    return True


if __name__ == "__main__":
    demo_qwen_generation()