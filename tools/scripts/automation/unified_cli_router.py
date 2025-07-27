#!/usr/bin/env python3
"""
Unified CLI Router - 3-Tier Enhancement System
Routes commands to appropriate enhancement tiers with cost conservation
"""

import sys
import subprocess
from pathlib import Path

class UnifiedCLIRouter:
    def __init__(self):
        self.base_dir = Path(__file__).parent.parent.parent
        
        # Tier 1: Core Management
        self.tier1_commands = {
            'status': ('core/coordination/chatgpt_offloading_manager.py', 'status'),
            'cost': ('core/coordination/chatgpt_offloading_manager.py', 'status'),
            'budget': ('core/coordination/chatgpt_offloading_manager.py', 'status')
        }
        
        # Tier 2: Enhanced Features
        self.tier2_commands = {
            'plugin': 'scripts/automation/plugin_manager.py',
            'session': 'scripts/automation/session_guard.py',
            'enhancement': 'scripts/automation/enhancement_index_manager.py'
        }
        
        # Tier 3: Advanced Features
        self.tier3_commands = {
            'health': 'scripts/automation/enhancement_health_monitor.py',
            'monitor': 'scripts/automation/enhancement_health_monitor.py'
        }
    
    def route_command(self, args):
        """Route command to appropriate tier"""
        if len(args) < 2:
            self.show_help()
            return 1
        
        command = args[1]
        remaining_args = args[2:]
        
        # Find command in tiers
        script_info = None
        if command in self.tier1_commands:
            script_info = self.tier1_commands[command]
        elif command in self.tier2_commands:
            script_path = self.tier2_commands[command]
            script_info = (script_path, command)
        elif command in self.tier3_commands:
            script_path = self.tier3_commands[command]
            script_info = (script_path, command)
        
        if not script_info:
            print(f"❌ Unknown command: {command}")
            self.show_help()
            return 1
        
        # Execute command
        script_path, script_command = script_info
        full_path = self.base_dir / script_path
        if not full_path.exists():
            print(f"❌ Script not found: {full_path}")
            return 1
        
        try:
            # Build command args
            cmd_args = ['python3', str(full_path), script_command] + remaining_args
            result = subprocess.run(cmd_args)
            return result.returncode
        except Exception as e:
            print(f"❌ Error executing command: {e}")
            return 1
    
    def show_help(self):
        print("""
Claude Flow - 3-Tier Enhancement System

TIER 1 - Core Management:
  status     - System status and cost tracking
  cost       - Cost analysis and conservation
  budget     - Budget monitoring

TIER 2 - Enhanced Features:
  plugin     - Plugin management
  session    - Session guard
  enhancement - Enhancement index management

TIER 3 - Advanced Features:
  health     - Health monitoring
  monitor    - Enhancement monitoring

Usage: python3 unified_cli_router.py <command> [args...]
""")

def main():
    router = UnifiedCLIRouter()
    return router.route_command(sys.argv)

if __name__ == "__main__":
    sys.exit(main())