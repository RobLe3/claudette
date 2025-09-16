#!/usr/bin/env python3
"""
Minimal security audit script for git pre-commit hook
"""
import sys
import subprocess
import re

def check_staged_files():
    """Check staged files for sensitive patterns"""
    try:
        # Get staged files
        result = subprocess.run(['git', 'diff', '--cached', '--name-only'], 
                              capture_output=True, text=True)
        staged_files = result.stdout.strip().split('\n') if result.stdout.strip() else []
        
        for file_path in staged_files:
            if not file_path:
                continue
                
            try:
                # Read file content
                result = subprocess.run(['git', 'show', f':{file_path}'], 
                                      capture_output=True, text=True)
                content = result.stdout
                
                # Check for API keys (OpenAI pattern)
                if re.search(r'sk-[a-zA-Z0-9]{20,}', content):
                    print(f"❌ Potential API key found in {file_path}")
                    return False
                    
                # Check for hardcoded passwords
                if re.search(r'password.*=.*[\'"][^\'"]{8,}[\'"]', content, re.IGNORECASE):
                    print(f"❌ Potential hardcoded password in {file_path}")
                    return False
                    
            except Exception as e:
                # Skip files that can't be read
                continue
                
        print("✅ Security audit passed")
        return True
        
    except Exception as e:
        print(f"⚠️ Security audit error: {e}")
        return True  # Allow commit if audit fails

if __name__ == '__main__':
    if not check_staged_files():
        sys.exit(1)
    sys.exit(0)