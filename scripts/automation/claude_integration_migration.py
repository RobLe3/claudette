#!/usr/bin/env python3
"""
Claude Integration Migration Script
Safely migrates from separate integration files to unified coordinator
"""

import os
import shutil
from datetime import datetime
from pathlib import Path

def create_migration_backup():
    """Create backup of existing integration files"""
    backup_dir = Path('/Users/roble/Documents/Python/claude_flow/backups/integration_migration')
    backup_dir.mkdir(parents=True, exist_ok=True)
    
    files_to_backup = [
        'scripts/automation/claude_hook_integration.py',
        'scripts/automation/claude_status_integration.py', 
        'scripts/automation/claude_reminder_system.py'
    ]
    
    project_root = Path('/Users/roble/Documents/Python/claude_flow')
    
    for file_rel_path in files_to_backup:
        source_file = project_root / file_rel_path
        if source_file.exists():
            backup_file = backup_dir / Path(file_rel_path).name
            shutil.copy2(source_file, backup_file)
            print(f"✅ Backed up: {file_rel_path} → {backup_file}")
    
    return backup_dir

def create_compatibility_wrappers():
    """Create compatibility wrappers for existing imports"""
    project_root = Path('/Users/roble/Documents/Python/claude_flow')
    
    # Claude Hook Integration wrapper
    hook_wrapper = '''#!/usr/bin/env python3
"""
Compatibility wrapper for claude_hook_integration.py
Redirects to unified claude_integration_coordinator.py
"""

# Import from unified coordinator
from claude_integration_coordinator import (
    ClaudeIntegrationCoordinator,
    hook_pre_operation,
    create_hook_integration
)

# Backwards compatibility class
class ClaudeHookIntegration:
    def __init__(self):
        coordinator = ClaudeIntegrationCoordinator()
        self.hook_manager = coordinator.hook_manager
    
    def parse_claude_operation(self, operation_data):
        return self.hook_manager.parse_claude_operation(operation_data)
    
    def log_activity_to_daemon(self, activity_data):
        return self.hook_manager.log_activity_to_daemon(activity_data)

# Backwards compatibility functions
def hook_post_operation(operation_type, result=None, **kwargs):
    """Backwards compatibility for post-operation hooks"""
    pass

def parse_command_line_hook():
    """Backwards compatibility for command line hooks"""
    import sys
    if len(sys.argv) < 2:
        return
    
    operation_type = sys.argv[1]
    kwargs = {}
    
    for i in range(2, len(sys.argv), 2):
        if i + 1 < len(sys.argv):
            key = sys.argv[i].lstrip('--')
            value = sys.argv[i + 1]
            kwargs[key] = value
    
    hook_pre_operation(operation_type, **kwargs)

if __name__ == "__main__":
    parse_command_line_hook()
'''
    
    # Status Integration wrapper
    status_wrapper = '''#!/usr/bin/env python3
"""
Compatibility wrapper for claude_status_integration.py
Redirects to unified claude_integration_coordinator.py
"""

# Import from unified coordinator
from claude_integration_coordinator import (
    ClaudeIntegrationCoordinator,
    create_status_integration
)

# Backwards compatibility class
class ClaudeStatusIntegration:
    def __init__(self):
        coordinator = ClaudeIntegrationCoordinator()
        self.status_manager = coordinator.status_manager
    
    def get_claude_pro_status(self):
        return self.status_manager.get_claude_pro_status()
    
    def analyze_project_maturity(self, project_path):
        return self.status_manager.analyze_project_maturity(project_path)
    
    def generate_status_message(self):
        coordinator = ClaudeIntegrationCoordinator()
        return coordinator.generate_unified_status_message()
    
    def generate_development_suggestions(self, project_maturity):
        return self.status_manager.generate_development_suggestions(project_maturity)

def main():
    """Generate and display status message"""
    status_system = ClaudeStatusIntegration()
    status_message = status_system.generate_status_message()
    print(status_message)

if __name__ == "__main__":
    main()
'''
    
    # Reminder System wrapper
    reminder_wrapper = '''#!/usr/bin/env python3
"""
Compatibility wrapper for claude_reminder_system.py
Redirects to unified claude_integration_coordinator.py
"""

import sys
from claude_integration_coordinator import (
    ClaudeIntegrationCoordinator,
    create_reminder_system,
    display_status_in_terminal
)

# Backwards compatibility class
class ClaudeReminderSystem:
    def __init__(self):
        coordinator = ClaudeIntegrationCoordinator()
        self.reminder_manager = coordinator.reminder_manager
        self.reminder_manager.set_status_manager(coordinator.status_manager)
    
    def check_all_reminders(self):
        return self.reminder_manager.check_all_reminders()
    
    def create_claude_hook_message(self):
        reminders = self.check_all_reminders()
        if reminders:
            return "\\n\\n".join(reminders)
        return None

def configure_reminders():
    """Interactive configuration of reminder system"""
    print("🔧 Claude Reminder System Configuration")
    print("Configuration now handled by unified coordinator")
    print("Use: python3 claude_integration_coordinator.py")

def main():
    """Main entry point"""
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "status":
            display_status_in_terminal()
        elif command == "configure":
            configure_reminders()
        elif command == "test":
            reminder_system = ClaudeReminderSystem()
            message = reminder_system.create_claude_hook_message()
            if message:
                print(message)
            else:
                print("No reminders to display.")
        else:
            print("Usage: python3 claude_reminder_system.py [status|configure|test]")
    else:
        display_status_in_terminal()

if __name__ == "__main__":
    main()
'''
    
    # Write wrapper files
    wrappers = [
        ('scripts/automation/claude_hook_integration_wrapper.py', hook_wrapper),
        ('scripts/automation/claude_status_integration_wrapper.py', status_wrapper),
        ('scripts/automation/claude_reminder_system_wrapper.py', reminder_wrapper)
    ]
    
    for wrapper_path, wrapper_content in wrappers:
        wrapper_file = project_root / wrapper_path
        with open(wrapper_file, 'w') as f:
            f.write(wrapper_content)
        print(f"✅ Created wrapper: {wrapper_path}")

def rename_original_files():
    """Rename original files to .backup"""
    project_root = Path('/Users/roble/Documents/Python/claude_flow')
    
    files_to_rename = [
        'scripts/automation/claude_hook_integration.py',
        'scripts/automation/claude_status_integration.py',
        'scripts/automation/claude_reminder_system.py'
    ]
    
    for file_path in files_to_rename:
        original_file = project_root / file_path
        backup_file = project_root / f"{file_path}.backup"
        
        if original_file.exists():
            original_file.rename(backup_file)
            print(f"✅ Renamed: {file_path} → {file_path}.backup")

def create_symlinks():
    """Create symlinks from wrapper files to original names"""
    project_root = Path('/Users/roble/Documents/Python/claude_flow')
    
    symlinks = [
        ('claude_hook_integration_wrapper.py', 'claude_hook_integration.py'),
        ('claude_status_integration_wrapper.py', 'claude_status_integration.py'),
        ('claude_reminder_system_wrapper.py', 'claude_reminder_system.py')
    ]
    
    automation_dir = project_root / 'scripts' / 'automation'
    
    for wrapper_name, original_name in symlinks:
        wrapper_file = automation_dir / wrapper_name
        symlink_file = automation_dir / original_name
        
        if wrapper_file.exists() and not symlink_file.exists():
            try:
                os.symlink(wrapper_name, symlink_file)
                print(f"✅ Created symlink: {original_name} → {wrapper_name}")
            except OSError as e:
                print(f"⚠️ Could not create symlink {original_name}: {e}")

def main():
    """Execute migration process"""
    print("🚀 Starting Claude Integration Migration")
    print("="*50)
    
    # Step 1: Create backup
    print("📦 Creating backup of original files...")
    backup_dir = create_migration_backup()
    print(f"✅ Backup created in: {backup_dir}")
    print()
    
    # Step 2: Rename original files  
    print("📝 Renaming original files to .backup...")
    rename_original_files()
    print()
    
    # Step 3: Create compatibility wrappers
    print("🔗 Creating compatibility wrappers...")
    create_compatibility_wrappers()
    print()
    
    # Step 4: Create symlinks
    print("🔗 Creating symlinks for backwards compatibility...")
    create_symlinks()
    print()
    
    print("✅ Migration completed successfully!")
    print()
    print("🎯 Next steps:")
    print("1. Test the unified coordinator: python3 scripts/automation/claude_integration_coordinator.py test")
    print("2. Verify backwards compatibility with existing imports")
    print("3. Update any external scripts to use the unified coordinator directly")
    print("4. Remove .backup files after confirming everything works")

if __name__ == "__main__":
    main()