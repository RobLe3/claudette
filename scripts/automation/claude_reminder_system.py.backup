#!/usr/bin/env python3
"""
Claude Code Reminder System
Provides regular reminders and status updates integrated with Claude Code workflow
"""

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional, List
import subprocess

class ClaudeReminderSystem:
    """System for providing regular reminders and status updates to Claude Code"""
    
    def __init__(self):
        self.project_dir = Path('/Users/roble/Documents/Python/claude_flow')
        self.claude_dir = Path.home() / '.claude'
        self.reminder_config_file = self.claude_dir / 'reminder_config.json'
        self.last_reminder_file = self.claude_dir / 'last_reminder.json'
        
        # Load configuration
        self.config = self.load_reminder_config()
        
        # Import status integration
        sys.path.append(str(self.project_dir / 'scripts' / 'automation'))
        from claude_status_integration import ClaudeStatusIntegration
        self.status_system = ClaudeStatusIntegration()

    def load_reminder_config(self) -> Dict[str, Any]:
        """Load reminder configuration with defaults"""
        default_config = {
            "enabled": True,
            "reminder_intervals": {
                "status_update": 3600,      # 1 hour - Regular status updates
                "token_warning": 1800,      # 30 minutes - Token usage warnings
                "project_suggestion": 7200, # 2 hours - Project improvement suggestions
                "break_reminder": 5400      # 1.5 hours - Break suggestions
            },
            "token_thresholds": {
                "yellow_warning": 60,  # % usage for moderate warning
                "red_warning": 80,     # % usage for high warning
                "critical_warning": 90 # % usage for critical warning
            },
            "reminder_types": {
                "status_messages": True,
                "usage_warnings": True,
                "development_suggestions": True,
                "break_reminders": True,
                "project_opportunities": True
            },
            "display_preferences": {
                "show_emoji": True,
                "compact_mode": False,
                "show_suggestions": True,
                "max_message_length": 1000
            }
        }
        
        if self.reminder_config_file.exists():
            try:
                with open(self.reminder_config_file, 'r') as f:
                    user_config = json.load(f)
                    default_config.update(user_config)
            except Exception as e:
                print(f"Error loading reminder config: {e}")
                
        return default_config

    def save_reminder_config(self):
        """Save current configuration"""
        try:
            os.makedirs(self.reminder_config_file.parent, exist_ok=True)
            with open(self.reminder_config_file, 'w') as f:
                json.dump(self.config, f, indent=2)
        except Exception as e:
            print(f"Error saving reminder config: {e}")

    def get_last_reminder_times(self) -> Dict[str, str]:
        """Get timestamps of last reminders"""
        default_times = {
            "status_update": "2025-01-01T00:00:00",
            "token_warning": "2025-01-01T00:00:00", 
            "project_suggestion": "2025-01-01T00:00:00",
            "break_reminder": "2025-01-01T00:00:00"
        }
        
        if self.last_reminder_file.exists():
            try:
                with open(self.last_reminder_file, 'r') as f:
                    return json.load(f)
            except Exception:
                pass
                
        return default_times

    def update_last_reminder_time(self, reminder_type: str):
        """Update the last reminder time for a specific type"""
        last_times = self.get_last_reminder_times()
        last_times[reminder_type] = datetime.now().isoformat()
        
        try:
            os.makedirs(self.last_reminder_file.parent, exist_ok=True)
            with open(self.last_reminder_file, 'w') as f:
                json.dump(last_times, f, indent=2)
        except Exception as e:
            print(f"Error updating reminder time: {e}")

    def should_show_reminder(self, reminder_type: str) -> bool:
        """Check if it's time to show a specific reminder type"""
        if not self.config.get('enabled', True):
            return False
            
        if not self.config['reminder_types'].get(f"{reminder_type}_reminders", True):
            return False
            
        last_times = self.get_last_reminder_times()
        last_time_str = last_times.get(reminder_type, "2025-01-01T00:00:00")
        
        try:
            last_time = datetime.fromisoformat(last_time_str)
            interval = self.config['reminder_intervals'].get(reminder_type, 3600)
            
            return (datetime.now() - last_time).total_seconds() >= interval
        except Exception:
            return True  # Show reminder if there's an error parsing time

    def generate_status_reminder(self) -> Optional[str]:
        """Generate status update reminder"""
        if not self.should_show_reminder('status_update'):
            return None
            
        # Get comprehensive status
        claude_status = self.status_system.get_claude_pro_status()
        project_maturity = self.status_system.analyze_project_maturity(self.project_dir)
        
        if not claude_status:
            return None
            
        # Create compact status message
        now = datetime.now()
        daily_percent = claude_status['daily_usage_percent']
        hours_to_reset = claude_status['hours_to_reset']
        
        # Status emoji based on usage
        if daily_percent < 50:
            status_emoji = "🟢"
            capacity = "High"
        elif daily_percent < 80:
            status_emoji = "🟡" 
            capacity = "Moderate"
        else:
            status_emoji = "🔴"
            capacity = "Limited"
        
        message = f"""
📊 **Claude Status Update** ({now.strftime('%H:%M')})
{status_emoji} **Capacity:** {capacity} ({daily_percent:.0f}% used)
⏰ **Reset in:** {hours_to_reset:.1f}h | 💰 **Cost:** €{claude_status['billing_period_eur']:.2f}
"""
        
        # Add project info if available
        if project_maturity:
            maturity_emoji = {'prototype': '🧪', 'alpha': '🔬', 'beta': '🧪', 'stable': '✅', 'mature': '🏆'}
            emoji = maturity_emoji.get(project_maturity['maturity_level'], '📦')
            
            message += f"""
🎯 **Project:** {project_maturity['project_name']} {emoji} {project_maturity['maturity_level']} v{project_maturity['version']}
"""
        
        self.update_last_reminder_time('status_update')
        return message.strip()

    def generate_token_warning(self) -> Optional[str]:
        """Generate token usage warning if needed"""
        if not self.should_show_reminder('token_warning'):
            return None
            
        claude_status = self.status_system.get_claude_pro_status()
        if not claude_status:
            return None
            
        daily_percent = claude_status['daily_usage_percent']
        thresholds = self.config['token_thresholds']
        
        warning_level = None
        if daily_percent >= thresholds['critical_warning']:
            warning_level = "critical"
        elif daily_percent >= thresholds['red_warning']:
            warning_level = "high"
        elif daily_percent >= thresholds['yellow_warning']:
            warning_level = "moderate"
        
        if not warning_level:
            return None
            
        # Generate appropriate warning message
        warnings = {
            "moderate": {
                "emoji": "🟡",
                "title": "Moderate Usage Alert",
                "message": "Consider batching operations to optimize token usage.",
                "suggestions": ["Use MultiEdit for multiple file changes", "Batch related operations together"]
            },
            "high": {
                "emoji": "🔴", 
                "title": "High Usage Warning",
                "message": "Approaching daily limits. Switch to lighter operations.",
                "suggestions": ["Focus on planning and documentation", "Use simple edits over complex operations"]
            },
            "critical": {
                "emoji": "🚨",
                "title": "Critical Usage Alert", 
                "message": "Very close to daily limit! Consider pausing until reset.",
                "suggestions": ["Wait for 2am reset", "Use read-only operations only"]
            }
        }
        
        warning = warnings[warning_level]
        hours_to_reset = claude_status['hours_to_reset']
        
        message = f"""
{warning['emoji']} **{warning['title']}**
📊 **Usage:** {daily_percent:.0f}% of daily limit
⏰ **Reset in:** {hours_to_reset:.1f} hours
💡 **Recommendation:** {warning['message']}
"""
        
        if self.config['display_preferences']['show_suggestions']:
            message += "\n**Suggestions:**\n"
            for suggestion in warning['suggestions']:
                message += f"- {suggestion}\n"
        
        self.update_last_reminder_time('token_warning')
        return message.strip()

    def generate_project_suggestion(self) -> Optional[str]:
        """Generate project improvement suggestions"""
        if not self.should_show_reminder('project_suggestion'):
            return None
            
        project_maturity = self.status_system.analyze_project_maturity(self.project_dir)
        if not project_maturity:
            return None
            
        suggestions = self.status_system.generate_development_suggestions(project_maturity)
        if not suggestions:
            return None
            
        maturity_level = project_maturity['maturity_level']
        confidence = project_maturity['confidence']
        
        message = f"""
💡 **Development Suggestions**
🎯 **Project:** {project_maturity['project_name']} ({maturity_level} - {confidence:.0%} confidence)

**Next Steps:**
"""
        
        # Show top 3 suggestions
        for i, suggestion in enumerate(suggestions[:3], 1):
            message += f"{i}. {suggestion}\n"
        
        self.update_last_reminder_time('project_suggestion')
        return message.strip()

    def generate_break_reminder(self) -> Optional[str]:
        """Generate break reminder for healthy development habits"""
        if not self.should_show_reminder('break_reminder'):
            return None
            
        # Check if user has been active for a while
        claude_status = self.status_system.get_claude_pro_status()
        if not claude_status:
            return None
            
        # Simple break reminder based on session activity
        now = datetime.now()
        
        message = f"""
☕ **Take a Break Reminder**
🕐 **Time:** {now.strftime('%H:%M')} - You've been coding for a while!

**Healthy Development Tips:**
- 👀 Rest your eyes (20-20-20 rule)
- 🚶 Take a short walk
- 💧 Stay hydrated
- 🧠 Let your mind process what you've built

**Ready to continue with fresh energy!** 🚀
"""
        
        self.update_last_reminder_time('break_reminder')
        return message.strip()

    def check_all_reminders(self) -> List[str]:
        """Check all reminder types and return any that should be shown"""
        reminders = []
        
        # Check each reminder type
        status_reminder = self.generate_status_reminder()
        if status_reminder:
            reminders.append(status_reminder)
            
        token_warning = self.generate_token_warning()
        if token_warning:
            reminders.append(token_warning)
            
        project_suggestion = self.generate_project_suggestion()
        if project_suggestion:
            reminders.append(project_suggestion)
            
        break_reminder = self.generate_break_reminder()
        if break_reminder:
            reminders.append(break_reminder)
        
        return reminders

    def format_combined_reminder(self, reminders: List[str]) -> str:
        """Format multiple reminders into a single message"""
        if not reminders:
            return ""
            
        if len(reminders) == 1:
            return reminders[0]
            
        # Combine multiple reminders with separators
        combined = "🤖 **Claude Code Assistant**\n" + "="*40 + "\n\n"
        
        for i, reminder in enumerate(reminders):
            combined += reminder
            if i < len(reminders) - 1:
                combined += "\n\n" + "-"*30 + "\n\n"
        
        combined += f"\n\n📅 **Time:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        return combined

    def create_claude_hook_message(self) -> Optional[str]:
        """Create a message suitable for Claude Code hook integration"""
        reminders = self.check_all_reminders()
        
        if not reminders:
            return None
            
        message = self.format_combined_reminder(reminders)
        
        # Ensure message isn't too long
        max_length = self.config['display_preferences']['max_message_length']
        if len(message) > max_length:
            message = message[:max_length] + "...\n\n📝 *Message truncated*"
            
        return message

def display_status_in_terminal():
    """Display status message in terminal"""
    reminder_system = ClaudeReminderSystem()
    message = reminder_system.create_claude_hook_message()
    
    if message:
        print("\n" + "="*60)
        print(message)
        print("="*60 + "\n")
    else:
        # Show minimal status if no reminders
        status = reminder_system.status_system.get_claude_pro_status()
        if status:
            print(f"💰 Session: €{status['session_cost_eur']:.4f} | "
                  f"Daily: {status['daily_usage_percent']:.0f}% | "
                  f"Reset: {status['hours_to_reset']:.1f}h")

def configure_reminders():
    """Interactive configuration of reminder system"""
    reminder_system = ClaudeReminderSystem()
    
    print("🔧 Claude Reminder System Configuration")
    print("="*40)
    
    # Enable/disable reminders
    enabled = input(f"Enable reminders? (y/n) [current: {'y' if reminder_system.config['enabled'] else 'n'}]: ").lower()
    if enabled in ['y', 'yes']:
        reminder_system.config['enabled'] = True
    elif enabled in ['n', 'no']:
        reminder_system.config['enabled'] = False
    
    # Configure intervals
    print("\nReminder Intervals (in seconds):")
    for reminder_type, current_interval in reminder_system.config['reminder_intervals'].items():
        new_interval = input(f"{reminder_type.replace('_', ' ').title()} [{current_interval}s]: ")
        if new_interval.isdigit():
            reminder_system.config['reminder_intervals'][reminder_type] = int(new_interval)
    
    # Configure thresholds
    print("\nToken Usage Thresholds (%):")
    for threshold_type, current_value in reminder_system.config['token_thresholds'].items():
        new_value = input(f"{threshold_type.replace('_', ' ').title()} [{current_value}%]: ")
        if new_value.isdigit():
            reminder_system.config['token_thresholds'][threshold_type] = int(new_value)
    
    # Save configuration
    reminder_system.save_reminder_config()
    print("\n✅ Configuration saved!")

def main():
    """Main entry point"""
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "status":
            display_status_in_terminal()
        elif command == "configure":
            configure_reminders()
        elif command == "test":
            # Test all reminder types
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