#!/usr/bin/env python3
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
