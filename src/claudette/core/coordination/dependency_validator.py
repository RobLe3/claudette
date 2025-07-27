#!/usr/bin/env python3
"""
Dependency Validator - Automated validation of all system dependencies
Ensures configuration files, imports, and paths are consistent after changes
"""

import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
import subprocess

class DependencyValidator:
    """Validate all system dependencies and configurations"""
    
    def __init__(self, project_root: Optional[Path] = None):
        self.project_root = project_root or Path('/Users/roble/Documents/Python/claude_flow')
        self.errors = []
        self.warnings = []
        
        # Critical files that must be checked
        self.critical_files = {
            'claude_settings': self.project_root / '.claude' / 'settings.json',
            'claude_config': self.project_root / 'CLAUDE.md',
            'cost_tracker': self.project_root / 'core' / 'cost-tracking' / 'tracker.py',
            'session_guard': self.project_root / 'core' / 'coordination' / 'session_guard.py',
            'structure_manager': self.project_root / 'core' / 'coordination' / 'structure_manager.py'
        }
    
    def validate_all(self) -> Dict[str, any]:
        """Run comprehensive validation of all dependencies"""
        print("🔍 Running comprehensive dependency validation...")
        
        results = {
            'claude_settings': self.validate_claude_settings(),
            'import_paths': self.validate_import_paths(),
            'hook_paths': self.validate_hook_paths(),
            'symlinks': self.validate_symlinks(),
            'documentation': self.validate_documentation_paths(),
            'structure': self.validate_structure_consistency(),
            'critical_functionality': self.test_critical_functionality()
        }
        
        # Summary
        total_errors = sum(len(r.get('errors', [])) for r in results.values())
        total_warnings = sum(len(r.get('warnings', [])) for r in results.values())
        
        print(f"\n📊 Validation Summary:")
        print(f"   ✅ Checks completed: {len(results)}")
        print(f"   ❌ Errors found: {total_errors}")
        print(f"   ⚠️  Warnings found: {total_warnings}")
        
        if total_errors == 0:
            print("   🎉 All dependencies validated successfully!")
        else:
            print("   🚨 Critical dependency issues found!")
        
        return results
    
    def validate_claude_settings(self) -> Dict[str, any]:
        """Validate .claude/settings.json paths and configurations"""
        print("🔧 Validating Claude settings...")
        
        errors = []
        warnings = []
        
        settings_file = self.critical_files['claude_settings']
        if not settings_file.exists():
            errors.append(f"Missing Claude settings file: {settings_file}")
            return {'errors': errors, 'warnings': warnings}
        
        try:
            with open(settings_file, 'r') as f:
                settings = json.load(f)
            
            # Check hook paths
            hooks = settings.get('hooks', {})
            for hook_type, hook_configs in hooks.items():
                if isinstance(hook_configs, list):
                    for hook_config in hook_configs:
                        if isinstance(hook_config, dict) and 'hooks' in hook_config:
                            for hook in hook_config['hooks']:
                                if 'command' in hook:
                                    command = hook['command']
                                    self._validate_command_paths(command, errors, warnings)
            
            # Check permissions
            permissions = settings.get('permissions', {})
            allow_commands = permissions.get('allow', [])
            for command in allow_commands:
                if 'python3' in command and '.py' in command:
                    self._validate_command_paths(command, errors, warnings)
        
        except json.JSONDecodeError as e:
            errors.append(f"Invalid JSON in Claude settings: {e}")
        except Exception as e:
            errors.append(f"Error reading Claude settings: {e}")
        
        return {'errors': errors, 'warnings': warnings}
    
    def _validate_command_paths(self, command: str, errors: List[str], warnings: List[str]):
        """Validate paths in command strings"""
        # Extract Python file paths from commands
        python_path_pattern = r'python3\s+([^\s]+\.py)'
        matches = re.findall(python_path_pattern, command)
        
        for match in matches:
            # Convert relative to absolute path
            if match.startswith('/'):
                file_path = Path(match)
            else:
                file_path = self.project_root / match
            
            if not file_path.exists():
                errors.append(f"Command references non-existent file: {match}")
            elif not file_path.is_file():
                warnings.append(f"Command references non-file path: {match}")
    
    def validate_import_paths(self) -> Dict[str, any]:
        """Validate Python import statements across the project"""
        print("📦 Validating Python import paths...")
        
        errors = []
        warnings = []
        
        # Find all Python files
        python_files = list(self.project_root.rglob("*.py"))
        
        for py_file in python_files:
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Find import statements
                import_patterns = [
                    r'^from\s+([^\s]+)\s+import',
                    r'^import\s+([^\s,]+)',
                ]
                
                for pattern in import_patterns:
                    matches = re.findall(pattern, content, re.MULTILINE)
                    for match in matches:
                        if match.startswith('.') or match.startswith('core.') or match.startswith('scripts.'):
                            # Check if imported module exists
                            self._validate_module_import(match, py_file, errors, warnings)
            
            except Exception as e:
                warnings.append(f"Could not read file {py_file}: {e}")
        
        return {'errors': errors, 'warnings': warnings}
    
    def _validate_module_import(self, module_path: str, source_file: Path, errors: List[str], warnings: List[str]):
        """Validate that an imported module exists"""
        if module_path.startswith('core.'):
            # Convert to file path
            parts = module_path.split('.')
            expected_path = self.project_root / Path(*parts).with_suffix('.py')
            
            if not expected_path.exists():
                errors.append(f"Import in {source_file.name}: Module {module_path} not found at {expected_path}")
    
    def validate_hook_paths(self) -> Dict[str, any]:
        """Validate Claude Flow hook commands and paths"""
        print("🪝 Validating hook paths...")
        
        errors = []
        warnings = []
        
        # Check if claude-flow is available
        try:
            result = subprocess.run(['npx', 'claude-flow@alpha', '--version'], 
                                 capture_output=True, text=True, timeout=10)
            if result.returncode != 0:
                warnings.append("Claude Flow MCP server may not be properly installed")
        except Exception as e:
            warnings.append(f"Could not verify Claude Flow installation: {e}")
        
        return {'errors': errors, 'warnings': warnings}
    
    def validate_symlinks(self) -> Dict[str, any]:
        """Validate that symlinks point to correct targets"""
        print("🔗 Validating symlinks...")
        
        errors = []
        warnings = []
        
        # Find all symlinks in project
        for path in self.project_root.rglob("*"):
            if path.is_symlink():
                try:
                    target = path.readlink()
                    if not target.is_absolute():
                        # Resolve relative to symlink location
                        absolute_target = (path.parent / target).resolve()
                    else:
                        absolute_target = target
                    
                    if not absolute_target.exists():
                        errors.append(f"Broken symlink: {path} -> {target}")
                    
                except Exception as e:
                    errors.append(f"Could not validate symlink {path}: {e}")
        
        return {'errors': errors, 'warnings': warnings}
    
    def validate_documentation_paths(self) -> Dict[str, any]:
        """Validate paths referenced in documentation"""
        print("📚 Validating documentation paths...")
        
        errors = []
        warnings = []
        
        # Check markdown files for path references
        md_files = list(self.project_root.rglob("*.md"))
        
        for md_file in md_files:
            try:
                with open(md_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Find code blocks with file paths
                code_block_pattern = r'```bash\n([^`]+)\n```'
                matches = re.findall(code_block_pattern, content, re.MULTILINE | re.DOTALL)
                
                for match in matches:
                    # Look for python3 commands with file paths
                    python_commands = re.findall(r'python3\s+([^\s]+\.py)', match)
                    for py_path in python_commands:
                        if py_path.startswith('/'):
                            file_path = Path(py_path)
                        else:
                            file_path = self.project_root / py_path
                        
                        if not file_path.exists():
                            warnings.append(f"Documentation in {md_file.name} references non-existent file: {py_path}")
            
            except Exception as e:
                warnings.append(f"Could not read documentation file {md_file}: {e}")
        
        return {'errors': errors, 'warnings': warnings}
    
    def validate_structure_consistency(self) -> Dict[str, any]:
        """Validate that the organized structure is consistent"""
        print("🏗️ Validating structure consistency...")
        
        errors = []
        warnings = []
        
        # Validate core structure exists
        expected_dirs = [
            'core/cost-tracking',
            'core/coordination', 
            'core/monitoring',
            'docs/analysis',
            'docs/results',
            'data/memory',
            'data/billing',
            'tests/performance',
            'archive/legacy'
        ]
        
        for dir_path in expected_dirs:
            full_path = self.project_root / dir_path
            if not full_path.exists():
                errors.append(f"Missing expected directory: {dir_path}")
        
        # Validate critical files exist
        critical_files = [
            'core/cost-tracking/tracker.py',
            'core/coordination/session_guard.py',
            'core/coordination/structure_manager.py',
            'docs/guides/NEW_STRUCTURE_GUIDE.md'
        ]
        
        for file_path in critical_files:
            full_path = self.project_root / file_path
            if not full_path.exists():
                errors.append(f"Missing critical file: {file_path}")
        
        return {'errors': errors, 'warnings': warnings}
    
    def test_critical_functionality(self) -> Dict[str, any]:
        """Test that critical functionality still works"""
        print("🧪 Testing critical functionality...")
        
        errors = []
        warnings = []
        
        # Test cost tracker
        try:
            tracker_path = self.project_root / 'core' / 'cost-tracking' / 'tracker.py'
            result = subprocess.run([sys.executable, str(tracker_path), '--action', 'summary'], 
                                 capture_output=True, text=True, timeout=30)
            if result.returncode != 0:
                errors.append(f"Cost tracker test failed: {result.stderr}")
        except Exception as e:
            errors.append(f"Could not test cost tracker: {e}")
        
        # Test structure manager
        try:
            sm_path = self.project_root / 'core' / 'coordination' / 'structure_manager.py'
            result = subprocess.run([sys.executable, str(sm_path), 'validate'], 
                                 capture_output=True, text=True, timeout=30)
            if result.returncode != 0:
                warnings.append(f"Structure manager validation had issues: {result.stderr}")
        except Exception as e:
            warnings.append(f"Could not test structure manager: {e}")
        
        return {'errors': errors, 'warnings': warnings}

def main():
    """CLI interface for dependency validation"""
    validator = DependencyValidator()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "--check-all":
            results = validator.validate_all()
            
            # Exit with error code if there are errors
            total_errors = sum(len(r.get('errors', [])) for r in results.values())
            sys.exit(1 if total_errors > 0 else 0)
        
        elif command == "--validate-all":
            results = validator.validate_all()
            
            # Print detailed results
            for check_name, result in results.items():
                print(f"\n{check_name.upper()}:")
                for error in result.get('errors', []):
                    print(f"  ❌ {error}")
                for warning in result.get('warnings', []):
                    print(f"  ⚠️  {warning}")
        
        else:
            print(f"Unknown command: {command}")
            sys.exit(1)
    else:
        print("Dependency Validator - Automated validation of system dependencies")
        print("\nUsage:")
        print("  python3 dependency_validator.py --check-all     # Quick validation")
        print("  python3 dependency_validator.py --validate-all # Detailed validation")

if __name__ == "__main__":
    main()