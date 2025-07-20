#!/usr/bin/env python3
"""
Claude Code Hook Integration - Real-time activity tracking
Connects Claude Code operations to the project automation system
"""

import sys
import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

class ClaudeHookIntegration:
    """Handles integration with Claude Code hooks for real-time tracking"""
    
    def __init__(self):
        self.daemon_script = Path(__file__).parent / 'project_automation_daemon.py'
        self.log_file = Path.home() / '.claude' / 'automation_activity.log'
        
        # Ensure log directory exists
        self.log_file.parent.mkdir(exist_ok=True)
        
    def parse_claude_operation(self, operation_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse Claude Code operation data into standardized format"""
        
        # Extract operation details
        operation_type = operation_data.get('tool', 'unknown')
        working_dir = os.getcwd()
        files_touched = []
        tokens_used = 0
        cost_eur = 0.0
        context = ""
        
        # Parse based on operation type
        if operation_type == 'Read':
            files_touched = [operation_data.get('file_path', '')]
            tokens_used = self.estimate_tokens_for_read(operation_data.get('file_path', ''))
            context = "file_reading"
            
        elif operation_type == 'Write':
            files_touched = [operation_data.get('file_path', '')]
            content_length = len(operation_data.get('content', ''))
            tokens_used = max(content_length // 4, 10)  # Rough estimate: 4 chars per token
            context = "file_creation"
            
        elif operation_type == 'Edit':
            files_touched = [operation_data.get('file_path', '')]
            old_string_length = len(operation_data.get('old_string', ''))
            new_string_length = len(operation_data.get('new_string', ''))
            tokens_used = max((old_string_length + new_string_length) // 4, 5)
            context = "file_modification"
            
        elif operation_type == 'MultiEdit':
            files_touched = [operation_data.get('file_path', '')]
            edits = operation_data.get('edits', [])
            tokens_used = max(sum(len(edit.get('old_string', '')) + len(edit.get('new_string', '')) 
                                for edit in edits) // 4, 10)
            context = "multi_file_edit"
            
        elif operation_type == 'Bash':
            command = operation_data.get('command', '')
            tokens_used = max(len(command) // 4, 5)
            context = f"command_execution: {command[:50]}"
            
        elif operation_type == 'TodoWrite':
            todos = operation_data.get('todos', [])
            tokens_used = max(sum(len(todo.get('content', '')) for todo in todos) // 4, 5)
            context = f"task_management: {len(todos)} todos"
            
        elif operation_type == 'Glob':
            pattern = operation_data.get('pattern', '')
            tokens_used = max(len(pattern) // 4, 2)
            context = f"file_search: {pattern}"
            
        elif operation_type == 'Grep':
            pattern = operation_data.get('pattern', '')
            tokens_used = max(len(pattern) // 4, 2)
            context = f"content_search: {pattern}"
            
        elif operation_type == 'LS':
            path = operation_data.get('path', '')
            tokens_used = 10  # Fixed cost for directory listing
            context = f"directory_listing: {path}"
            
        # Calculate cost (rough estimate based on Claude API pricing)
        # Using approximate €0.000015 per 1000 input tokens
        cost_eur = (tokens_used / 1000) * 0.000015
        
        return {
            'operation_type': operation_type,
            'working_dir': working_dir,
            'files_touched': files_touched,
            'tokens_used': tokens_used,
            'cost_eur': cost_eur,
            'context': context,
            'timestamp': datetime.now().isoformat()
        }
    
    def estimate_tokens_for_read(self, file_path: str) -> int:
        """Estimate tokens used for reading a file"""
        try:
            if file_path and Path(file_path).exists():
                file_size = Path(file_path).stat().st_size
                # Rough estimate: 4 bytes per token
                return max(file_size // 4, 10)
        except:
            pass
        return 50  # Default estimate
    
    def log_activity_to_daemon(self, activity_data: Dict[str, Any]):
        """Send activity data to automation daemon"""
        try:
            # Import and use daemon directly
            sys.path.append(str(Path(__file__).parent))
            from project_automation_daemon import ProjectAutomationDaemon
            
            daemon = ProjectAutomationDaemon()
            daemon.log_activity(
                operation_type=activity_data['operation_type'],
                working_dir=activity_data['working_dir'],
                files=activity_data['files_touched'],
                tokens_used=activity_data['tokens_used'],
                cost_eur=activity_data['cost_eur'],
                context=activity_data['context']
            )
            
        except Exception as e:
            # Fallback to file logging if daemon unavailable
            self.log_to_file(activity_data, error=str(e))
    
    def log_to_file(self, activity_data: Dict[str, Any], error: str = None):
        """Fallback logging to file"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'activity': activity_data,
            'error': error
        }
        
        with open(self.log_file, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')

def hook_pre_operation(operation_type: str, **kwargs):
    """Called before Claude Code operation"""
    hook = ClaudeHookIntegration()
    
    operation_data = {
        'tool': operation_type,
        **kwargs
    }
    
    activity = hook.parse_claude_operation(operation_data)
    hook.log_activity_to_daemon(activity)

def hook_post_operation(operation_type: str, result: Any = None, **kwargs):
    """Called after Claude Code operation"""
    # For post-operation hooks, we might want to update with actual results
    # For now, we track on pre-operation to capture intent
    pass

def parse_command_line_hook():
    """Parse command line arguments from Claude Code hooks"""
    if len(sys.argv) < 2:
        return
        
    operation_type = sys.argv[1]
    
    # Parse additional arguments based on operation type
    kwargs = {}
    
    for i in range(2, len(sys.argv), 2):
        if i + 1 < len(sys.argv):
            key = sys.argv[i].lstrip('--')
            value = sys.argv[i + 1]
            kwargs[key] = value
    
    hook_pre_operation(operation_type, **kwargs)

if __name__ == "__main__":
    # Handle direct command line usage from Claude Code hooks
    parse_command_line_hook()