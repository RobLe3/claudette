"""
Diagnostic and system repair commands for Claudette
Provides utilities to diagnose and fix common system issues
"""

import os
import sys
from pathlib import Path
from typing import List, Dict, Any
from .sudo_helper import sudo_helper


class ClaudetteDiagnostic:
    """Diagnostic and repair utilities for Claudette"""
    
    def __init__(self):
        self.issues_found = []
        self.fixes_applied = []
    
    def run_full_diagnostic(self) -> Dict[str, Any]:
        """Run comprehensive diagnostic of Claudette system"""
        print("🔍 Running Claudette system diagnostic...")
        
        results = {
            'cache_issues': self._check_cache_issues(),
            'permission_issues': self._check_permission_issues(),
            'config_issues': self._check_config_issues(),
            'dependency_issues': self._check_dependency_issues(),
            'pyenv_issues': self._check_pyenv_issues()
        }
        
        # Summary
        total_issues = sum(len(issues) for issues in results.values())
        if total_issues == 0:
            print("✅ No issues found - Claudette system is healthy!")
        else:
            print(f"⚠️  Found {total_issues} issues that may need attention")
        
        return results
    
    def _check_cache_issues(self) -> List[str]:
        """Check for cache-related issues"""
        issues = []
        
        try:
            cache_dir = Path.home() / '.cache' / 'claudette'
            if cache_dir.exists():
                # Check for root-owned files
                root_files = []
                for file_path in cache_dir.rglob('*'):
                    if file_path.is_file() and sudo_helper.needs_sudo_for_path(str(file_path)):
                        root_files.append(str(file_path))
                
                if root_files:
                    issues.append(f"Found {len(root_files)} root-owned cache files")
                    self.issues_found.extend(root_files)
                
                # Check for corrupt cache files
                help_file = cache_dir / 'help.txt'
                if help_file.exists():
                    try:
                        content = help_file.read_text()
                        if 'claudettette' in content:  # Typo in cached help
                            issues.append("Corrupt help cache with typos")
                    except Exception:
                        issues.append("Unreadable help cache file")
        
        except Exception as e:
            issues.append(f"Error checking cache: {e}")
        
        return issues
    
    def _check_permission_issues(self) -> List[str]:
        """Check for permission-related issues"""
        issues = []
        
        # Check if we can write to important directories
        important_dirs = [
            Path.home() / '.cache' / 'claudette',
            Path.home() / '.claude',
        ]
        
        for dir_path in important_dirs:
            if dir_path.exists() and not os.access(str(dir_path), os.W_OK):
                issues.append(f"Cannot write to {dir_path}")
        
        return issues
    
    def _check_config_issues(self) -> List[str]:
        """Check for configuration issues"""
        issues = []
        
        try:
            # Try to import config module
            from .config import Config
            config = Config.load()
        except ImportError:
            issues.append("Missing claudette.config module")
        except Exception as e:
            issues.append(f"Config loading error: {e}")
        
        return issues
    
    def _check_dependency_issues(self) -> List[str]:
        """Check for missing dependencies"""
        issues = []
        
        # Check for important Python modules
        required_modules = ['requests', 'yaml', 'openai']
        missing_modules = []
        
        for module in required_modules:
            try:
                __import__(module)
            except ImportError:
                missing_modules.append(module)
        
        if missing_modules:
            issues.append(f"Missing Python modules: {', '.join(missing_modules)}")
        
        return issues
    
    def _check_pyenv_issues(self) -> List[str]:
        """Check for pyenv-related issues"""
        issues = []
        
        # Check for problematic shims
        shims_dir = Path.home() / '.pyenv' / 'shims'
        if shims_dir.exists():
            claude_shim = shims_dir / 'claude'
            claudette_shim = shims_dir / 'claudette'
            
            if claude_shim.exists():
                issues.append("Problematic claude shim exists (may hijack commands)")
            
            # Check if claudette shim is empty (as mentioned in system reminder)
            if claudette_shim.exists():
                try:
                    content = claudette_shim.read_text()
                    if not content.strip():
                        issues.append("Empty claudette shim file")
                except Exception:
                    issues.append("Unreadable claudette shim file")
        
        return issues
    
    def auto_fix_issues(self, interactive: bool = True) -> bool:
        """Automatically fix detected issues"""
        print("🔧 Starting automatic issue resolution...")
        
        # Get diagnostic results
        results = self.run_full_diagnostic()
        total_issues = sum(len(issues) for issues in results.values())
        
        if total_issues == 0:
            print("✅ No issues to fix!")
            return True
        
        if interactive:
            print(f"\n🤔 Found {total_issues} issues. Attempt automatic fixes?")
            response = input("Proceed with fixes? [y/N]: ").strip().lower()
            if response not in ['y', 'yes']:
                print("🚫 Auto-fix cancelled by user")
                return False
        
        success_count = 0
        
        # Fix cache issues
        if results['cache_issues']:
            print("\n🧹 Fixing cache issues...")
            if self._fix_cache_issues():
                success_count += 1
        
        # Fix permission issues
        if results['permission_issues']:
            print("\n🔐 Fixing permission issues...")
            if self._fix_permission_issues():
                success_count += 1
        
        # Fix pyenv issues
        if results['pyenv_issues']:
            print("\n🐍 Fixing pyenv issues...")
            if self._fix_pyenv_issues():
                success_count += 1
        
        print(f"\n✅ Successfully applied {len(self.fixes_applied)} fixes")
        return len(self.fixes_applied) > 0
    
    def _fix_cache_issues(self) -> bool:
        """Fix cache-related issues"""
        try:
            cache_dir = Path.home() / '.cache' / 'claudette'
            if sudo_helper.cleanup_cache_files(str(cache_dir)):
                self.fixes_applied.append("Cleaned up root-owned cache files")
                return True
        except Exception as e:
            print(f"❌ Failed to fix cache issues: {e}")
        
        return False
    
    def _fix_permission_issues(self) -> bool:
        """Fix permission-related issues"""
        # This would typically involve changing ownership or permissions
        # Implementation depends on specific permission issues found
        try:
            cache_dir = Path.home() / '.cache' / 'claudette'
            if cache_dir.exists():
                current_user = os.getenv('USER', 'unknown')
                if sudo_helper.safe_change_ownership(str(cache_dir), current_user, 
                                                   "Fix cache directory ownership"):
                    self.fixes_applied.append("Fixed cache directory ownership")
                    return True
        except Exception as e:
            print(f"❌ Failed to fix permission issues: {e}")
        
        return False
    
    def _fix_pyenv_issues(self) -> bool:
        """Fix pyenv-related issues"""
        try:
            shims_dir = Path.home() / '.pyenv' / 'shims'
            claude_shim = shims_dir / 'claude'
            
            # Remove problematic claude shim
            if claude_shim.exists():
                if sudo_helper.safe_remove_file(str(claude_shim), 
                                              "Remove problematic claude shim"):
                    self.fixes_applied.append("Removed problematic claude shim")
                    return True
        except Exception as e:
            print(f"❌ Failed to fix pyenv issues: {e}")
        
        return False


# Global diagnostic instance
diagnostic = ClaudetteDiagnostic()