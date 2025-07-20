#!/usr/bin/env python3
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
            return "\n\n".join(reminders)
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
