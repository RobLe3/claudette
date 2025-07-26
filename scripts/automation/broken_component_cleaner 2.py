#!/usr/bin/env python3
"""
Broken Component Cleaner
Identifies and removes/fixes broken components in Claude Flow
"""

import os
import sys
import subprocess
import json
from pathlib import Path
from datetime import datetime

class ComponentCleaner:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.broken_components = []
        self.fixed_components = []
        
    def test_python_script(self, script_path):
        """Test if a Python script runs without errors"""
        try:
            result = subprocess.run([
                sys.executable, script_path, '--help'
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                return True, "Working"
            else:
                return False, f"Exit code: {result.returncode}, Error: {result.stderr[:200]}"
                
        except subprocess.TimeoutExpired:
            return False, "Timeout after 10 seconds"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    def test_shell_script(self, script_path):
        """Test if a shell script is executable and has basic syntax"""
        try:
            if not os.access(script_path, os.X_OK):
                return False, "Not executable"
                
            # Basic syntax check for shell scripts
            if script_path.suffix in ['.sh', '.zsh', '.bash']:
                result = subprocess.run([
                    'bash', '-n', str(script_path)
                ], capture_output=True, text=True)
                
                if result.returncode == 0:
                    return True, "Syntax OK"
                else:
                    return False, f"Syntax error: {result.stderr[:200]}"
            
            return True, "Executable"
            
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    def scan_scripts_directory(self):
        """Scan all scripts and test functionality"""
        scripts_dir = self.project_root / "scripts"
        results = []
        
        for script_file in scripts_dir.rglob("*.py"):
            if script_file.name.startswith('__'):
                continue
                
            is_working, message = self.test_python_script(script_file)
            results.append({
                'file': str(script_file.relative_to(self.project_root)),
                'type': 'python',
                'working': is_working,
                'message': message
            })
            
            if not is_working:
                self.broken_components.append(script_file)
            else:
                self.fixed_components.append(script_file)
        
        # Test shell scripts
        for script_file in scripts_dir.rglob("*.sh"):
            is_working, message = self.test_shell_script(script_file)
            results.append({
                'file': str(script_file.relative_to(self.project_root)),
                'type': 'shell',
                'working': is_working,
                'message': message
            })
        
        for script_file in scripts_dir.rglob("*.zsh"):
            is_working, message = self.test_shell_script(script_file)
            results.append({
                'file': str(script_file.relative_to(self.project_root)),
                'type': 'zsh',
                'working': is_working,
                'message': message
            })
                
        return results
    
    def scan_tools_directory(self):
        """Scan tools directory"""
        tools_dir = self.project_root / "tools"
        results = []
        
        for script_file in tools_dir.rglob("*.zsh"):
            is_working, message = self.test_shell_script(script_file)
            results.append({
                'file': str(script_file.relative_to(self.project_root)),
                'type': 'zsh',
                'working': is_working,
                'message': message
            })
                
        return results
    
    def fix_broken_symlinks(self):
        """Find and fix broken symbolic links"""
        broken_links = []
        
        for path in self.project_root.rglob("*"):
            if path.is_symlink() and not path.exists():
                broken_links.append(path)
                print(f"🔗 Broken symlink: {path}")
        
        return broken_links
    
    def generate_report(self):
        """Generate comprehensive report"""
        print("🧹 Claude Flow Component Cleaner")
        print("=" * 50)
        
        # Test scripts
        print("\n📂 Testing Scripts Directory...")
        script_results = self.scan_scripts_directory()
        
        print("\n🛠️ Testing Tools Directory...")
        tool_results = self.scan_tools_directory()
        
        print("\n🔗 Checking Symbolic Links...")
        broken_links = self.fix_broken_symlinks()
        
        # Summary
        all_results = script_results + tool_results
        working = [r for r in all_results if r['working']]
        broken = [r for r in all_results if not r['working']]
        
        print(f"\n📊 Summary:")
        print(f"✅ Working components: {len(working)}")
        print(f"❌ Broken components: {len(broken)}")
        print(f"🔗 Broken symlinks: {len(broken_links)}")
        
        if broken:
            print(f"\n❌ Broken Components:")
            for component in broken:
                print(f"  - {component['file']}: {component['message'][:100]}")
        
        # Save detailed report
        report = {
            'timestamp': str(datetime.now()),
            'summary': {
                'working': len(working),
                'broken': len(broken),
                'broken_symlinks': len(broken_links)
            },
            'working_components': working,
            'broken_components': broken,
            'broken_symlinks': [str(link) for link in broken_links]
        }
        
        report_file = self.project_root / "component_health_report.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\n📄 Detailed report saved to: {report_file}")
        
        return report

if __name__ == "__main__":
    cleaner = ComponentCleaner()
    report = cleaner.generate_report()