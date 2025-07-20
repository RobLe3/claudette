#!/usr/bin/env python3
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
