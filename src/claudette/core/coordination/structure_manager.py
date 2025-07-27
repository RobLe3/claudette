#!/usr/bin/env python3
"""
Structure Manager - Provides awareness of the new organized structure for all automation systems
Ensures future developments follow the organized structure pattern
"""

from pathlib import Path
from typing import Dict, List, Optional
import json

class StructureManager:
    """Centralized knowledge of the new organized file structure"""
    
    def __init__(self, project_root: Optional[Path] = None):
        self.project_root = project_root or Path('/Users/roble/Documents/Python/claude_flow')
        
        # Core structure definitions
        self.structure = {
            'core': {
                'cost-tracking': ['tracker.py', 'analyzer.py'],
                'coordination': ['session_guard.py', 'plugin_manager.py', 'integration_coordinator.py'],
                'monitoring': ['health_monitor.py', 'usage_monitor.py', 'session_optimizer.py']
            },
            'docs': {
                'analysis': 'Analysis and research documents',
                'results': 'Test results and performance data',
                'guides': 'User and developer guides'
            },
            'data': {
                'memory': 'Claude Flow memory and agent data',
                'billing': 'Cost tracking and billing reports',
                'sessions': 'Session state and history'
            },
            'tests': {
                'integration': 'Integration test suites',
                'performance': 'Performance and benchmark tests',
                'validation': 'Validation and verification tests'
            },
            'archive': {
                'legacy': 'Safely archived legacy components',
                'backups': 'Historical backups and migrations',
                'deprecated': 'Deprecated features and code'
            }
        }
    
    def get_core_path(self, module: str, file: str = None) -> Path:
        """Get path to core module or specific file"""
        path = self.project_root / 'core' / module
        if file:
            path = path / file
        return path
    
    def get_cost_tracker_path(self) -> Path:
        """Get path to the new cost tracker location"""
        return self.get_core_path('cost-tracking', 'tracker.py')
    
    def get_session_guard_path(self) -> Path:
        """Get path to the new session guard location"""
        return self.get_core_path('coordination', 'session_guard.py')
    
    def get_plugin_manager_path(self) -> Path:
        """Get path to the new plugin manager location"""
        return self.get_core_path('coordination', 'plugin_manager.py')
    
    def get_docs_path(self, category: str, file: str = None) -> Path:
        """Get path to documentation category or specific file"""
        path = self.project_root / 'docs' / category
        if file:
            path = path / file
        return path
    
    def get_data_path(self, category: str, file: str = None) -> Path:
        """Get path to data category or specific file"""
        path = self.project_root / 'data' / category
        if file:
            path = path / file
        return path
    
    def get_tests_path(self, category: str, file: str = None) -> Path:
        """Get path to test category or specific file"""
        path = self.project_root / 'tests' / category
        if file:
            path = path / file
        return path
    
    def suggest_placement(self, file_type: str, description: str = "") -> Dict[str, str]:
        """Suggest where a new file should be placed based on type and description"""
        suggestions = {
            'cost_tracking': {
                'path': 'core/cost-tracking/',
                'reason': 'Cost tracking and billing functionality'
            },
            'coordination': {
                'path': 'core/coordination/',
                'reason': 'Agent coordination and session management'
            },
            'monitoring': {
                'path': 'core/monitoring/',
                'reason': 'System monitoring and health checks'
            },
            'analysis': {
                'path': 'docs/analysis/',
                'reason': 'Research and analysis documents'
            },
            'test_results': {
                'path': 'docs/results/testing/',
                'reason': 'Test results and validation reports'
            },
            'performance_test': {
                'path': 'tests/performance/',
                'reason': 'Performance and benchmark tests'
            },
            'integration_test': {
                'path': 'tests/integration/',
                'reason': 'Integration test suites'
            },
            'memory_data': {
                'path': 'data/memory/',
                'reason': 'Agent memory and state data'
            },
            'billing_data': {
                'path': 'data/billing/',
                'reason': 'Cost tracking and billing reports'
            },
            'legacy_code': {
                'path': 'archive/legacy/',
                'reason': 'Safely archived legacy components'
            }
        }
        
        # Use description to make intelligent suggestions
        if 'cost' in description.lower() or 'billing' in description.lower():
            return suggestions['cost_tracking']
        elif 'test' in description.lower() and 'performance' in description.lower():
            return suggestions['performance_test']
        elif 'test' in description.lower():
            return suggestions['integration_test']
        elif 'analysis' in description.lower() or 'research' in description.lower():
            return suggestions['analysis']
        elif 'monitor' in description.lower() or 'health' in description.lower():
            return suggestions['monitoring']
        elif 'session' in description.lower() or 'coordination' in description.lower():
            return suggestions['coordination']
        else:
            return {
                'path': 'core/',
                'reason': 'Default core location - consider specific subdirectory'
            }
    
    def validate_structure(self) -> Dict[str, bool]:
        """Validate that the organized structure exists"""
        validation = {}
        
        # Check core directories
        for module in self.structure['core']:
            path = self.project_root / 'core' / module
            validation[f'core/{module}'] = path.exists()
        
        # Check other main directories
        for category in ['docs', 'data', 'tests', 'archive']:
            path = self.project_root / category
            validation[category] = path.exists()
        
        return validation
    
    def get_migration_paths(self) -> Dict[str, Dict[str, str]]:
        """Get mapping of old paths to new paths for migration purposes"""
        return {
            'scripts/cost-tracking/claude-cost-tracker.py': str(self.get_cost_tracker_path()),
            'scripts/automation/claude_session_guard.py': str(self.get_session_guard_path()),
            'scripts/automation/claude_plugin_manager.py': str(self.get_plugin_manager_path()),
            'memory/': str(self.get_data_path('memory')),
            'billing/': str(self.get_data_path('billing')),
            'scripts/automation/enhancement_health_monitor.py': str(self.get_core_path('monitoring', 'health_monitor.py'))
        }
    
    def export_structure_config(self) -> str:
        """Export structure configuration as JSON for other tools"""
        config = {
            'project_root': str(self.project_root),
            'structure': self.structure,
            'migration_paths': self.get_migration_paths(),
            'validation': self.validate_structure(),
            'version': '2.0.0',
            'updated': '2025-07-20'
        }
        return json.dumps(config, indent=2)

if __name__ == "__main__":
    # CLI interface for structure management
    import sys
    
    sm = StructureManager()
    
    if len(sys.argv) < 2:
        print("Structure Manager - New organized file structure")
        print("\nUsage:")
        print("  python3 structure_manager.py validate")
        print("  python3 structure_manager.py suggest <file_type> [description]")
        print("  python3 structure_manager.py export")
        print("  python3 structure_manager.py cost-tracker")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "validate":
        validation = sm.validate_structure()
        print("Structure Validation:")
        for path, exists in validation.items():
            status = "✅" if exists else "❌"
            print(f"  {status} {path}")
    
    elif command == "suggest":
        if len(sys.argv) < 3:
            print("Usage: suggest <file_type> [description]")
            sys.exit(1)
        file_type = sys.argv[2]
        description = sys.argv[3] if len(sys.argv) > 3 else ""
        suggestion = sm.suggest_placement(file_type, description)
        print(f"Suggested placement: {suggestion['path']}")
        print(f"Reason: {suggestion['reason']}")
    
    elif command == "export":
        print(sm.export_structure_config())
    
    elif command == "cost-tracker":
        print(str(sm.get_cost_tracker_path()))
    
    elif command == "validate-deps":
        print("🔍 Validating structure dependencies...")
        from .dependency_validator import DependencyValidator
        validator = DependencyValidator()
        results = validator.validate_all()
        
        # Exit with error code if there are errors
        total_errors = sum(len(r.get('errors', [])) for r in results.values())
        sys.exit(1 if total_errors > 0 else 0)
    
    else:
        print(f"Unknown command: {command}")
        print("\nAvailable commands:")
        print("  validate       - Check directory structure")
        print("  suggest        - Suggest file placement")
        print("  export         - Export structure config")
        print("  cost-tracker   - Get cost tracker path")
        print("  validate-deps  - Validate all dependencies")
        sys.exit(1)