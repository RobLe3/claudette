#!/usr/bin/env python3
"""
Dependency Checker - Legacy script checker for automation systems
Verifies that automation hooks and scripts are using correct paths
"""

import json
import sys
from pathlib import Path
from typing import Dict, List
import subprocess

class DependencyChecker:
    """Check automation system dependencies and configurations"""
    
    def __init__(self, project_root: Path = None):
        self.project_root = project_root or Path('/Users/roble/Documents/Python/claude_flow')
        self.claude_dir = Path.home() / '.claude'
        self.project_claude_dir = self.project_root / '.claude'
    
    def verify_hooks(self) -> Dict[str, any]:
        """Verify all hook configurations are using correct paths"""
        print("🪝 Verifying hook configurations...")
        
        results = {
            'global_settings': self._check_global_settings(),
            'project_settings': self._check_project_settings(),
            'hook_accessibility': self._check_hook_accessibility(),
            'automation_scripts': self._check_automation_scripts()
        }
        
        # Summary
        total_errors = sum(len(r.get('errors', [])) for r in results.values())
        total_warnings = sum(len(r.get('warnings', [])) for r in results.values())
        
        print(f"\n📊 Hook Verification Summary:")
        print(f"   ✅ Components checked: {len(results)}")
        print(f"   ❌ Errors found: {total_errors}")
        print(f"   ⚠️  Warnings found: {total_warnings}")
        
        return results
    
    def _check_global_settings(self) -> Dict[str, any]:
        """Check global Claude settings"""
        errors = []
        warnings = []
        
        global_settings = self.claude_dir / 'settings.json'
        if global_settings.exists():
            try:
                with open(global_settings, 'r') as f:
                    settings = json.load(f)
                self._validate_settings_content(settings, "global", errors, warnings)
            except Exception as e:
                errors.append(f"Error reading global settings: {e}")
        else:
            warnings.append("No global Claude settings found")
        
        return {'errors': errors, 'warnings': warnings}
    
    def _check_project_settings(self) -> Dict[str, any]:
        """Check project-specific Claude settings"""
        errors = []
        warnings = []
        
        project_settings = self.project_claude_dir / 'settings.json'
        if project_settings.exists():
            try:
                with open(project_settings, 'r') as f:
                    settings = json.load(f)
                self._validate_settings_content(settings, "project", errors, warnings)
            except Exception as e:
                errors.append(f"Error reading project settings: {e}")
        else:
            warnings.append("No project-specific Claude settings found")
        
        return {'errors': errors, 'warnings': warnings}
    
    def _validate_settings_content(self, settings: dict, settings_type: str, errors: List[str], warnings: List[str]):
        """Validate the content of settings files"""
        # Check hooks section
        hooks = settings.get('hooks', {})
        for hook_type, hook_configs in hooks.items():
            if isinstance(hook_configs, list):
                for i, hook_config in enumerate(hook_configs):
                    if isinstance(hook_config, dict) and 'hooks' in hook_config:
                        for j, hook in enumerate(hook_config['hooks']):
                            if 'command' in hook:
                                command = hook['command']
                                self._validate_hook_command(command, f"{settings_type}.hooks.{hook_type}[{i}].hooks[{j}]", errors, warnings)
        
        # Check permissions
        permissions = settings.get('permissions', {})
        allow_commands = permissions.get('allow', [])
        for i, command in enumerate(allow_commands):
            if 'python3' in command:
                self._validate_permission_command(command, f"{settings_type}.permissions.allow[{i}]", errors, warnings)
    
    def _validate_hook_command(self, command: str, location: str, errors: List[str], warnings: List[str]):
        """Validate a specific hook command"""
        # Check for python3 commands with file paths
        if 'python3' in command and '.py' in command:
            # Extract file path
            parts = command.split()
            for part in parts:
                if part.endswith('.py') and ('/' in part or '\\' in part):
                    if part.startswith('/'):
                        file_path = Path(part)
                    else:
                        file_path = self.project_root / part
                    
                    if not file_path.exists():
                        errors.append(f"Hook {location}: File not found: {part}")
                    
                    # Check if using new structure
                    if 'scripts/cost-tracking/claude-cost-tracker.py' in part:
                        warnings.append(f"Hook {location}: Consider updating to new core structure path")
    
    def _validate_permission_command(self, command: str, location: str, errors: List[str], warnings: List[str]):
        """Validate a permission command pattern"""
        # Extract file paths from permission patterns
        if 'python3' in command and '.py' in command:
            # Find the file path part
            parts = command.split()
            for part in parts:
                if part.endswith('.py') and ('/' in part or '\\' in part):
                    # Remove wildcards for validation
                    clean_path = part.replace(' *', '').replace('*', '')
                    
                    if clean_path.startswith('/'):
                        file_path = Path(clean_path)
                    else:
                        file_path = self.project_root / clean_path
                    
                    if not file_path.exists():
                        errors.append(f"Permission {location}: File not found: {clean_path}")
    
    def _check_hook_accessibility(self) -> Dict[str, any]:
        """Check if claude-flow hooks are accessible"""
        errors = []
        warnings = []
        
        try:
            # Test claude-flow availability
            result = subprocess.run(['npx', 'claude-flow@alpha', '--version'], 
                                 capture_output=True, text=True, timeout=10)
            if result.returncode != 0:
                warnings.append("Claude Flow MCP server may not be properly installed")
            else:
                print(f"   ✅ Claude Flow version: {result.stdout.strip()}")
        except subprocess.TimeoutExpired:
            warnings.append("Claude Flow command timed out - may be slow to respond")
        except Exception as e:
            errors.append(f"Could not access claude-flow command: {e}")
        
        return {'errors': errors, 'warnings': warnings}
    
    def _check_automation_scripts(self) -> Dict[str, any]:
        """Check that automation scripts are accessible and functional"""
        errors = []
        warnings = []
        
        # Critical automation scripts to check
        critical_scripts = [
            'core/cost-tracking/tracker.py',
            'core/coordination/session_guard.py',
            'core/coordination/structure_manager.py',
            'scripts/automation/claude_session_guard.py',  # Legacy
            'scripts/automation/claude_plugin_manager.py'   # Legacy
        ]
        
        for script_path in critical_scripts:
            full_path = self.project_root / script_path
            if not full_path.exists():
                if 'core/' in script_path:
                    errors.append(f"Missing new structure script: {script_path}")
                else:
                    warnings.append(f"Missing legacy script: {script_path}")
            else:
                # Test if script is executable
                try:
                    result = subprocess.run([sys.executable, str(full_path), '--help'], 
                                         capture_output=True, text=True, timeout=5)
                    # Don't treat non-zero exit as error for --help, just check it responds
                    if 'python3' not in result.stderr and len(result.stdout) == 0 and len(result.stderr) == 0:
                        warnings.append(f"Script may not be responding: {script_path}")
                except subprocess.TimeoutExpired:
                    warnings.append(f"Script timed out during test: {script_path}")
                except Exception as e:
                    warnings.append(f"Could not test script {script_path}: {e}")
        
        return {'errors': errors, 'warnings': warnings}

def main():
    """CLI interface for dependency checking"""
    checker = DependencyChecker()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "--verify-hooks":
            results = checker.verify_hooks()
            
            # Print detailed results
            for check_name, result in results.items():
                if result.get('errors') or result.get('warnings'):
                    print(f"\n{check_name.upper().replace('_', ' ')}:")
                    for error in result.get('errors', []):
                        print(f"  ❌ {error}")
                    for warning in result.get('warnings', []):
                        print(f"  ⚠️  {warning}")
            
            # Exit with error code if there are errors
            total_errors = sum(len(r.get('errors', [])) for r in results.values())
            sys.exit(1 if total_errors > 0 else 0)
        
        else:
            print(f"Unknown command: {command}")
            sys.exit(1)
    else:
        print("Dependency Checker - Verify automation system dependencies")
        print("\nUsage:")
        print("  python3 dependency_checker.py --verify-hooks")

if __name__ == "__main__":
    main()