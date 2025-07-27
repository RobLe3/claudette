#!/usr/bin/env python3
"""
Claude Session Guard - Active monitoring and automatic fallback triggering
Continuously monitors Claude status and triggers ChatGPT fallback when needed
"""

import json
import sys
import time
import threading
import signal
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional
import subprocess

# Add to path for imports
sys.path.append(str(Path(__file__).parent))
from fallback_manager import ClaudeFallbackManager
from unified_cost_tracker import UnifiedCostTracker

class ClaudeSessionGuard:
    """Active session monitoring with automatic fallback triggering"""
    
    def __init__(self):
        self.fallback_manager = ClaudeFallbackManager()
        self.cost_tracker = UnifiedCostTracker()
        
        # Monitoring configuration
        self.monitor_config = {
            'check_interval_seconds': 300,  # Check every 5 minutes
            'alert_interval_seconds': 1800,  # Alert every 30 minutes if in warning state
            'auto_fallback_enabled': True,   # Automatically trigger fallback
            'notification_enabled': True,    # Show notifications
            'log_all_checks': False          # Log every check (can be verbose)
        }
        
        # State tracking
        self.guard_state = {
            'monitoring': False,
            'started_at': None,
            'last_check': None,
            'last_alert': None,
            'checks_performed': 0,
            'fallbacks_triggered': 0,
            'current_status': 'normal'
        }
        
        # Load configuration
        self._load_config()
        
        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _load_config(self):
        """Load guard configuration from file"""
        config_file = Path.home() / '.claude' / 'session_guard_config.json'
        try:
            if config_file.exists():
                with open(config_file, 'r') as f:
                    saved_config = json.load(f)
                    self.monitor_config.update(saved_config)
        except Exception as e:
            print(f"Warning: Could not load guard config: {e}")
    
    def _save_config(self):
        """Save guard configuration to file"""
        config_file = Path.home() / '.claude' / 'session_guard_config.json'
        try:
            config_file.parent.mkdir(parents=True, exist_ok=True)
            with open(config_file, 'w') as f:
                json.dump(self.monitor_config, f, indent=2)
        except Exception as e:
            print(f"Warning: Could not save guard config: {e}")
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully"""
        print(f"\n🛑 Received signal {signum} - shutting down session guard...")
        self.stop_monitoring()
        sys.exit(0)
    
    def start_monitoring(self) -> Dict[str, Any]:
        """Start continuous monitoring of Claude status"""
        
        if self.guard_state['monitoring']:
            return {'success': False, 'error': 'Monitoring already active'}
        
        self.guard_state.update({
            'monitoring': True,
            'started_at': datetime.now().isoformat(),
            'last_check': None,
            'last_alert': None,
            'checks_performed': 0,
            'fallbacks_triggered': 0,
            'current_status': 'normal'
        })
        
        print("🛡️ Claude Session Guard - Starting Monitoring")
        print(f"   Check Interval: {self.monitor_config['check_interval_seconds']}s")
        print(f"   Auto-Fallback: {'✅ Enabled' if self.monitor_config['auto_fallback_enabled'] else '❌ Disabled'}")
        print(f"   Notifications: {'✅ Enabled' if self.monitor_config['notification_enabled'] else '❌ Disabled'}")
        print("   Press Ctrl+C to stop monitoring\n")
        
        # Start monitoring thread
        monitor_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        monitor_thread.start()
        
        try:
            # Keep main thread alive
            while self.guard_state['monitoring']:
                time.sleep(1)
        except KeyboardInterrupt:
            self.stop_monitoring()
        
        return {'success': True, 'message': 'Monitoring started'}
    
    def _monitoring_loop(self):
        """Main monitoring loop"""
        
        while self.guard_state['monitoring']:
            try:
                self._perform_status_check()
                time.sleep(self.monitor_config['check_interval_seconds'])
            except Exception as e:
                print(f"❌ Error in monitoring loop: {e}")
                time.sleep(30)  # Wait 30s before retrying
    
    def _perform_status_check(self):
        """Perform a single status check and take action if needed"""
        
        check_time = datetime.now()
        self.guard_state['last_check'] = check_time.isoformat()
        self.guard_state['checks_performed'] += 1
        
        # Get Claude status
        status_check = self.fallback_manager.check_claude_status()
        
        # Update current status
        previous_status = self.guard_state['current_status']
        self.guard_state['current_status'] = status_check['severity']
        
        # Log if configured or status changed
        if self.monitor_config['log_all_checks'] or previous_status != status_check['severity']:
            self._log_status_check(status_check)
        
        # Take action based on status
        action_taken = self._take_action_on_status(status_check)
        
        # Show notifications if enabled
        if self.monitor_config['notification_enabled']:
            self._show_notification(status_check, action_taken)
    
    def _log_status_check(self, status_check: Dict[str, Any]):
        """Log status check results"""
        
        timestamp = datetime.now().strftime('%H:%M:%S')
        severity_emoji = {
            'normal': '🟢',
            'warning': '🟡', 
            'critical': '🔴',
            'emergency': '🚨'
        }
        
        emoji = severity_emoji.get(status_check['severity'], '❓')
        usage = status_check['claude_metrics']['daily_usage_percent']
        
        print(f"[{timestamp}] {emoji} Claude: {usage:>5.1f}% | Severity: {status_check['severity']:<8} | Checks: {self.guard_state['checks_performed']}")
    
    def _take_action_on_status(self, status_check: Dict[str, Any]) -> str:
        """Take appropriate action based on status check"""
        
        action = 'none'
        
        # Automatic fallback triggers
        if self.monitor_config['auto_fallback_enabled']:
            if status_check['recommended_action'] == 'immediate_fallback':
                fallback_result = self.fallback_manager.initiate_fallback("Automatic - emergency trigger")
                if fallback_result['success']:
                    action = 'emergency_fallback_triggered'
                    self.guard_state['fallbacks_triggered'] += 1
                    print(f"🚨 EMERGENCY FALLBACK TRIGGERED: {status_check['trigger_reasons'][0]}")
                
            elif status_check['recommended_action'] == 'initiate_fallback':
                fallback_result = self.fallback_manager.initiate_fallback("Automatic - critical trigger")
                if fallback_result['success']:
                    action = 'fallback_triggered'
                    self.guard_state['fallbacks_triggered'] += 1
                    print(f"🔄 FALLBACK TRIGGERED: {status_check['trigger_reasons'][0]}")
        
        # Alert on warnings (but not too frequently)
        if status_check['severity'] in ['warning', 'critical']:
            now = datetime.now()
            if (self.guard_state['last_alert'] is None or 
                now - datetime.fromisoformat(self.guard_state['last_alert']) > 
                timedelta(seconds=self.monitor_config['alert_interval_seconds'])):
                
                self.guard_state['last_alert'] = now.isoformat()
                action = 'alert_shown'
        
        return action
    
    def _show_notification(self, status_check: Dict[str, Any], action_taken: str):
        """Show appropriate notifications based on status and actions"""
        
        # Only show notifications for important events
        if action_taken in ['fallback_triggered', 'emergency_fallback_triggered']:
            return  # Already printed above
        
        if action_taken == 'alert_shown':
            usage = status_check['claude_metrics']['daily_usage_percent']
            hours_to_reset = status_check['claude_metrics']['hours_to_reset']
            
            if status_check['severity'] == 'critical':
                print(f"🔴 CRITICAL: Claude usage at {usage:.1f}% - fallback recommended (resets in {hours_to_reset:.1f}h)")
            elif status_check['severity'] == 'warning':
                print(f"🟡 WARNING: Claude usage at {usage:.1f}% - consider reducing usage (resets in {hours_to_reset:.1f}h)")
    
    def stop_monitoring(self):
        """Stop monitoring"""
        
        if not self.guard_state['monitoring']:
            return
        
        self.guard_state['monitoring'] = False
        
        # Calculate session statistics
        started_at = datetime.fromisoformat(self.guard_state['started_at'])
        duration = datetime.now() - started_at
        
        print("\n🛡️ Session Guard - Monitoring Stopped")
        print(f"   Duration: {duration.total_seconds()/3600:.1f} hours")
        print(f"   Checks Performed: {self.guard_state['checks_performed']}")
        print(f"   Fallbacks Triggered: {self.guard_state['fallbacks_triggered']}")
        print(f"   Final Status: {self.guard_state['current_status']}")
    
    def get_monitoring_status(self) -> Dict[str, Any]:
        """Get current monitoring status"""
        
        status = {
            'monitoring_active': self.guard_state['monitoring'],
            'configuration': self.monitor_config,
            'session_stats': self.guard_state.copy(),
            'claude_status': None
        }
        
        if self.guard_state['monitoring']:
            status['claude_status'] = self.fallback_manager.check_claude_status()
            
            # Calculate session duration
            if self.guard_state['started_at']:
                started_at = datetime.fromisoformat(self.guard_state['started_at'])
                duration = datetime.now() - started_at
                status['session_stats']['duration_hours'] = duration.total_seconds() / 3600
        
        return status
    
    def configure_monitoring(self, **kwargs) -> Dict[str, Any]:
        """Configure monitoring parameters"""
        
        valid_configs = {
            'check_interval_seconds': int,
            'alert_interval_seconds': int,
            'auto_fallback_enabled': bool,
            'notification_enabled': bool,
            'log_all_checks': bool
        }
        
        updated = {}
        for key, value in kwargs.items():
            if key in valid_configs:
                # Type conversion
                try:
                    converted_value = valid_configs[key](value)
                    self.monitor_config[key] = converted_value
                    updated[key] = converted_value
                except (ValueError, TypeError):
                    return {'success': False, 'error': f'Invalid value for {key}: {value}'}
            else:
                return {'success': False, 'error': f'Unknown configuration: {key}'}
        
        # Save configuration
        self._save_config()
        
        return {
            'success': True,
            'updated_configs': updated,
            'current_config': self.monitor_config
        }

def main():
    """Main CLI interface"""
    if len(sys.argv) < 2:
        print("Usage: python3 claude_session_guard.py [start|stop|status|config|dashboard]")
        return
    
    command = sys.argv[1]
    guard = ClaudeSessionGuard()
    
    if command == "start":
        result = guard.start_monitoring()
        if not result['success']:
            print(f"❌ {result['error']}")
        
    elif command == "status":
        status = guard.get_monitoring_status()
        print(json.dumps(status, indent=2))
        
    elif command == "config":
        if len(sys.argv) > 2:
            # Parse config arguments: key=value key=value
            configs = {}
            for arg in sys.argv[2:]:
                if '=' in arg:
                    key, value = arg.split('=', 1)
                    # Convert common values
                    if value.lower() in ['true', 'false']:
                        value = value.lower() == 'true'
                    elif value.isdigit():
                        value = int(value)
                    configs[key] = value
            
            result = guard.configure_monitoring(**configs)
            print(json.dumps(result, indent=2))
        else:
            print("Current configuration:")
            print(json.dumps(guard.monitor_config, indent=2))
            
    elif command == "dashboard":
        # Show comprehensive dashboard
        print(guard.fallback_manager.get_fallback_dashboard())
        
        # Add monitoring status
        status = guard.get_monitoring_status()
        
        print("\n╭─────────────────────────────────────────────────────────╮")
        print("│              🛡️ SESSION GUARD STATUS                    │")
        print("├─────────────────────────────────────────────────────────┤")
        
        if status['monitoring_active']:
            duration = status['session_stats'].get('duration_hours', 0)
            checks = status['session_stats']['checks_performed']
            fallbacks = status['session_stats']['fallbacks_triggered']
            print(f"│  🟢 Monitoring: ACTIVE for {duration:>6.1f}h                    │")
            print(f"│     Checks: {checks:>6} | Fallbacks: {fallbacks:>3} | Status: {status['session_stats']['current_status'].upper():<8}  │")
        else:
            print("│  ⭕ Monitoring: INACTIVE                                │")
        
        interval = status['configuration']['check_interval_seconds']
        auto_fallback = "✅" if status['configuration']['auto_fallback_enabled'] else "❌"
        print(f"│     Interval: {interval:>4}s | Auto-Fallback: {auto_fallback}            │")
        print("╰─────────────────────────────────────────────────────────╯")
        
    else:
        print("Commands:")
        print("  start               - Start monitoring")
        print("  status              - Show detailed status")
        print("  config [key=value]  - Configure monitoring")
        print("  dashboard           - Show complete dashboard")
        print("\nExample configuration:")
        print("  python3 claude_session_guard.py config check_interval_seconds=180 auto_fallback_enabled=true")

if __name__ == "__main__":
    main()