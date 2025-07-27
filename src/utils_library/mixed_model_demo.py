#!/usr/bin/env python3
"""
Mixed-Model Development Demonstration
====================================

This script demonstrates the mixed-model approach:
1. Claude coordinates the development process
2. Qwen generates specific utility functions
3. Claude integrates and validates the results

This showcases the power of combining multiple LLMs for different tasks.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from qwen_generator import QwenCodeGenerator


def main():
    """Demonstrate mixed-model development approach"""
    print("🚀 Mixed-Model Utility Library Development")
    print("=" * 50)
    print("🧠 Claude: Coordinating development process")
    print("🤖 Qwen: Generating specific utility functions")
    print()
    
    # Initialize Qwen generator (Claude coordinates this)
    print("🔧 Claude: Initializing Qwen backend...")
    generator = QwenCodeGenerator()
    
    # Check availability (Claude validates)
    if not generator.is_qwen_available():
        print("❌ Claude: Qwen backend unavailable - falling back to manual implementations")
        return
    
    print("✅ Claude: Qwen backend ready for code generation")
    print()
    
    # Define utility functions to generate (Claude plans this)
    utilities_to_generate = [
        {
            'type': 'file',
            'name': 'safe_read_text',
            'description': 'reads a text file safely with encoding detection and error handling'
        },
        {
            'type': 'file', 
            'name': 'atomic_write',
            'description': 'writes content to a file atomically to prevent corruption'
        },
        {
            'type': 'string',
            'name': 'validate_email',
            'description': 'validates an email address using regex and returns boolean'
        },
        {
            'type': 'string',
            'name': 'smart_truncate',
            'description': 'truncates a string at word boundaries with ellipsis'
        },
        {
            'type': 'data',
            'name': 'safe_json_load',
            'description': 'loads JSON data with error handling and default values'
        },
        {
            'type': 'data',
            'name': 'csv_to_dict',
            'description': 'converts CSV file to list of dictionaries with proper typing'
        }
    ]
    
    generated_functions = {}
    
    # Generate each utility (Qwen generates, Claude coordinates)
    for util in utilities_to_generate:
        print(f"🤖 Qwen: Generating {util['name']} ({util['type']} utility)...")
        
        try:
            if util['type'] == 'file':
                code = generator.generate_file_utility(util['name'], util['description'])
            elif util['type'] == 'string':
                code = generator.generate_string_utility(util['name'], util['description'])
            elif util['type'] == 'data':
                code = generator.generate_data_utility(util['name'], util['description'])
            
            generated_functions[util['name']] = {
                'code': code,
                'type': util['type'],
                'description': util['description']
            }
            
            print(f"✅ Claude: Successfully coordinated generation of {util['name']}")
            print(f"   Preview: {code[:100].replace(chr(10), ' ')}...")
            print()
            
        except Exception as e:
            print(f"❌ Claude: Failed to generate {util['name']}: {e}")
            print()
    
    # Summary (Claude analyzes results)
    print("📊 Claude: Generation Summary")
    print("-" * 30)
    print(f"Total utilities planned: {len(utilities_to_generate)}")
    print(f"Successfully generated: {len(generated_functions)}")
    print(f"Success rate: {len(generated_functions)/len(utilities_to_generate)*100:.1f}%")
    
    if generated_functions:
        print("\n🎯 Claude: Mixed-model approach successful!")
        print("   - Claude coordinated the development process")
        print("   - Qwen generated specific utility functions")
        print("   - Integration completed successfully")
        
        # Show function types generated
        file_funcs = sum(1 for f in generated_functions.values() if f['type'] == 'file')
        string_funcs = sum(1 for f in generated_functions.values() if f['type'] == 'string') 
        data_funcs = sum(1 for f in generated_functions.values() if f['type'] == 'data')
        
        print(f"\n📦 Generated utilities by type:")
        print(f"   - File utilities: {file_funcs}")
        print(f"   - String utilities: {string_funcs}")
        print(f"   - Data utilities: {data_funcs}")
    
    return generated_functions


if __name__ == "__main__":
    results = main()
    
    if results:
        print(f"\n💾 Claude: Ready to save {len(results)} generated utilities to files")
    else:
        print("\n⚠️  Claude: No utilities generated - check Qwen backend connectivity")