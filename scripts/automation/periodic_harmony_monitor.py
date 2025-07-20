#!/usr/bin/env python3
"""
Periodic Harmony Monitor
Runs regular scans to detect splintering and maintain harmonization
"""

import os
import json
import sys
import time
import schedule
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any
import subprocess
import sqlite3

# Add auto inventory system to path
sys.path.append(str(Path(__file__).parent))
from auto_inventory_system import AutoInventorySystem

class PeriodicHarmonyMonitor:
    """Monitor system for periodic harmony checking and splintering prevention"""
    
    def __init__(self):
        self.project_root = Path('/Users/roble/Documents/Python/claude_flow')
        self.config_file = Path.home() / '.claude' / 'harmony_monitor_config.json'
        self.log_file = Path.home() / '.claude' / 'harmony_monitor.log'
        self.alerts_file = Path.home() / '.claude' / 'harmony_alerts.json'
        
        # Initialize components
        self.inventory_system = AutoInventorySystem()
        self.config = self.load_config()
        
        # Setup logging
        self.setup_logging()

    def load_config(self) -> Dict[str, Any]:
        """Load monitoring configuration"""
        default_config = {
            "monitoring": {
                "enabled": True,
                "full_scan_interval": "daily",      # daily, weekly, manual
                "quick_scan_interval": "hourly",    # hourly, 2hours, 4hours
                "alert_threshold": 0.6,             # Harmony score threshold for alerts
                "max_splintering_alerts": 5        # Maximum alerts before high priority
            },
            "notifications": {
                "enabled": True,
                "email_enabled": False,
                "console_enabled": True,
                "file_enabled": True,
                "dashboard_integration": True
            },
            "auto_resolution": {
                "enabled": False,               # Auto-resolve certain issues
                "safe_consolidations": False,  # Automatically consolidate obvious duplicates
                "move_to_correct_locations": False,  # Move files to proper directories
                "update_documentation": True   # Update harmony documentation
            },
            "scan_scheduling": {
                "full_scan_time": "02:00",     # Daily full scan time
                "quick_scan_interval_minutes": 60,  # Quick scan every N minutes
                "weekend_scans": True,         # Run scans on weekends
                "working_hours_only": False    # Only scan during working hours
            }
        }
        
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r') as f:
                    user_config = json.load(f)
                    # Deep merge
                    self.deep_merge_config(default_config, user_config)
            except Exception as e:
                self.log(f"Error loading config: {e}")
                
        return default_config

    def deep_merge_config(self, default: Dict, user: Dict):
        """Deep merge user config into default config"""
        for key, value in user.items():
            if key in default and isinstance(default[key], dict) and isinstance(value, dict):
                self.deep_merge_config(default[key], value)
            else:
                default[key] = value

    def save_config(self):
        """Save current configuration"""
        try:
            os.makedirs(self.config_file.parent, exist_ok=True)
            with open(self.config_file, 'w') as f:
                json.dump(self.config, f, indent=2)
        except Exception as e:
            self.log(f"Error saving config: {e}")

    def setup_logging(self):
        """Setup logging system"""
        os.makedirs(self.log_file.parent, exist_ok=True)
        
    def log(self, message: str, level: str = "INFO"):
        """Log message to file and console"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f"[{timestamp}] {level}: {message}"
        
        # Console logging
        if self.config['notifications']['console_enabled']:
            print(log_entry)
        
        # File logging
        if self.config['notifications']['file_enabled']:
            try:
                with open(self.log_file, 'a') as f:
                    f.write(log_entry + '\n')
            except Exception as e:
                print(f"Error writing to log file: {e}")

    def run_quick_scan(self):
        """Run quick harmony scan - focuses on new/changed files"""
        self.log("Starting quick harmony scan...")
        
        try:
            # Get files modified in last hour
            one_hour_ago = datetime.now() - timedelta(hours=1)
            recent_files = self.find_recently_modified_files(one_hour_ago)
            
            if not recent_files:
                self.log("No recent modifications found")
                return
            
            self.log(f"Found {len(recent_files)} recently modified files")
            
            # Quick analysis of recent files
            potential_issues = self.analyze_recent_files(recent_files)
            
            if potential_issues:
                self.log(f"Found {len(potential_issues)} potential harmony issues")
                self.handle_harmony_issues(potential_issues, scan_type="quick")
            else:
                self.log("No harmony issues detected in recent changes")
                
        except Exception as e:
            self.log(f"Error in quick scan: {e}", "ERROR")

    def run_full_scan(self):
        """Run comprehensive harmony scan"""
        self.log("Starting full harmony scan...")
        
        try:
            # Run complete inventory scan
            report = self.inventory_system.run_full_inventory_scan()
            
            # Analyze results
            harmony_score = report['harmony_score']
            splintering_alerts = report['splintering_alerts']
            duplicates = report['duplicate_functionality']
            
            self.log(f"Full scan completed - Harmony: {harmony_score:.2f}, Alerts: {splintering_alerts}, Duplicates: {duplicates}")
            
            # Check if action needed
            if harmony_score < self.config['monitoring']['alert_threshold']:
                self.log(f"Harmony score {harmony_score:.2f} below threshold {self.config['monitoring']['alert_threshold']}", "WARNING")
                self.generate_harmony_alert(report, "low_harmony_score")
            
            if splintering_alerts > self.config['monitoring']['max_splintering_alerts']:
                self.log(f"Splintering alerts {splintering_alerts} above threshold", "WARNING")
                self.generate_harmony_alert(report, "high_splintering")
            
            # Store scan results
            self.store_scan_results(report)
            
            # Auto-resolution if enabled
            if self.config['auto_resolution']['enabled']:
                self.attempt_auto_resolution(report)
                
        except Exception as e:
            self.log(f"Error in full scan: {e}", "ERROR")

    def find_recently_modified_files(self, since: datetime) -> List[Path]:
        """Find files modified since given time"""
        recent_files = []
        
        scan_locations = [
            self.project_root / 'scripts',
            self.project_root / 'tools',
            self.project_root / 'plugins',
            self.project_root / 'coordination',
            self.project_root / '.claude'
        ]
        
        for location in scan_locations:
            if not location.exists():
                continue
                
            for file_path in location.rglob('*'):
                if file_path.is_file():
                    try:
                        mod_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                        if mod_time > since:
                            recent_files.append(file_path)
                    except:
                        continue
        
        return recent_files

    def analyze_recent_files(self, files: List[Path]) -> List[Dict[str, Any]]:
        """Analyze recently modified files for potential harmony issues"""
        issues = []
        
        for file_path in files:
            # Check if file is in wrong location
            location_issue = self.check_file_location(file_path)
            if location_issue:
                issues.append(location_issue)
            
            # Check for duplicate functionality
            duplicate_issue = self.check_for_duplicates(file_path)
            if duplicate_issue:
                issues.append(duplicate_issue)
            
            # Check naming consistency
            naming_issue = self.check_naming_consistency(file_path)
            if naming_issue:
                issues.append(naming_issue)
        
        return issues

    def check_file_location(self, file_path: Path) -> Dict[str, Any]:
        """Check if file is in the correct location based on its content"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Determine expected category
            expected_category = self.inventory_system.categorize_enhancement(file_path, content, {})
            expected_locations = self.inventory_system.enhancement_categories.get(expected_category, {}).get('locations', [])
            
            if expected_locations:
                file_path_str = str(file_path)
                if not any(loc in file_path_str for loc in expected_locations):
                    return {
                        'type': 'wrong_location',
                        'file': str(file_path),
                        'expected_category': expected_category,
                        'expected_locations': expected_locations,
                        'severity': 'medium'
                    }
        except Exception:
            pass
            
        return None

    def check_for_duplicates(self, file_path: Path) -> Dict[str, Any]:
        """Check if file duplicates existing functionality"""
        try:
            # Get existing enhancements from database
            with sqlite3.connect(self.inventory_system.inventory_db) as conn:
                cursor = conn.execute('''
                    SELECT id, name, file_path, functionality 
                    FROM enhancements 
                    WHERE status='active' AND file_path != ?
                ''', (str(file_path.relative_to(self.project_root)),))
                
                existing = cursor.fetchall()
            
            if not existing:
                return None
            
            # Analyze current file
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            enhancement_data = self.inventory_system.analyze_file_for_enhancements(file_path, 'python')
            if not enhancement_data:
                return None
            
            # Check similarity with existing enhancements
            for existing_id, existing_name, existing_path, existing_func in existing:
                similarity = self.calculate_quick_similarity(enhancement_data, {
                    'functionality': existing_func,
                    'name': existing_name
                })
                
                if similarity > 0.7:  # High similarity threshold
                    return {
                        'type': 'duplicate_functionality',
                        'file': str(file_path),
                        'duplicate_of': existing_path,
                        'similarity': similarity,
                        'severity': 'high'
                    }
                    
        except Exception:
            pass
            
        return None

    def calculate_quick_similarity(self, enhancement1: Dict, enhancement2: Dict) -> float:
        """Quick similarity calculation"""
        func1_words = set(enhancement1.get('functionality', '').lower().split())
        func2_words = set(enhancement2.get('functionality', '').lower().split())
        
        if func1_words and func2_words:
            return len(func1_words & func2_words) / len(func1_words | func2_words)
        
        return 0.0

    def check_naming_consistency(self, file_path: Path) -> Dict[str, Any]:
        """Check if file follows naming conventions"""
        file_name = file_path.name.lower()
        path_str = str(file_path).lower()
        
        # Define naming conventions
        naming_issues = []
        
        if 'cost' in path_str and 'cost' not in file_name:
            naming_issues.append("Cost-related file should include 'cost' in name")
        
        if 'automation' in path_str and file_name.endswith('.py') and 'automation' not in file_name:
            naming_issues.append("Automation file should include 'automation' in name")
        
        if 'claude' in path_str and 'claude' not in file_name and file_name.endswith('.py'):
            naming_issues.append("Claude integration file should include 'claude' in name")
        
        if naming_issues:
            return {
                'type': 'naming_inconsistency',
                'file': str(file_path),
                'issues': naming_issues,
                'severity': 'low'
            }
        
        return None

    def handle_harmony_issues(self, issues: List[Dict], scan_type: str):
        """Handle detected harmony issues"""
        for issue in issues:
            self.log(f"Harmony issue detected: {issue['type']} in {issue['file']}", "WARNING")
            
            # Store issue for later analysis
            self.store_harmony_issue(issue, scan_type)
            
            # Auto-resolution if enabled and safe
            if self.config['auto_resolution']['enabled']:
                resolved = self.attempt_issue_resolution(issue)
                if resolved:
                    self.log(f"Auto-resolved: {issue['type']}", "INFO")

    def store_harmony_issue(self, issue: Dict, scan_type: str):
        """Store harmony issue for tracking"""
        issue['detected_date'] = datetime.now().isoformat()
        issue['scan_type'] = scan_type
        issue['status'] = 'active'
        
        # Load existing alerts
        alerts = []
        if self.alerts_file.exists():
            try:
                with open(self.alerts_file, 'r') as f:
                    alerts = json.load(f)
            except:
                pass
        
        # Add new alert
        alerts.append(issue)
        
        # Keep only recent alerts (last 100)
        alerts = alerts[-100:]
        
        # Save alerts
        try:
            with open(self.alerts_file, 'w') as f:
                json.dump(alerts, f, indent=2)
        except Exception as e:
            self.log(f"Error saving alerts: {e}", "ERROR")

    def attempt_issue_resolution(self, issue: Dict) -> bool:
        """Attempt automatic resolution of harmony issue"""
        issue_type = issue['type']
        
        if issue_type == 'wrong_location' and self.config['auto_resolution']['move_to_correct_locations']:
            return self.auto_move_file(issue)
        elif issue_type == 'duplicate_functionality' and self.config['auto_resolution']['safe_consolidations']:
            return self.auto_consolidate_duplicate(issue)
        elif issue_type == 'naming_inconsistency':
            # For now, just log naming suggestions
            self.log(f"Naming suggestion for {issue['file']}: {'; '.join(issue['issues'])}")
            return True
        
        return False

    def auto_move_file(self, issue: Dict) -> bool:
        """Automatically move file to correct location"""
        # This is a potentially dangerous operation, so be very conservative
        file_path = Path(issue['file'])
        expected_locations = issue['expected_locations']
        
        if not file_path.exists():
            return False
        
        # Only move if there's a clear single target location
        if len(expected_locations) == 1:
            target_dir = self.project_root / expected_locations[0]
            target_path = target_dir / file_path.name
            
            if not target_path.exists():
                try:
                    os.makedirs(target_dir, exist_ok=True)
                    file_path.rename(target_path)
                    self.log(f"Moved {file_path} to {target_path}")
                    return True
                except Exception as e:
                    self.log(f"Error moving file: {e}", "ERROR")
        
        return False

    def auto_consolidate_duplicate(self, issue: Dict) -> bool:
        """Automatically consolidate duplicate functionality"""
        # This is complex and potentially risky, so just log for now
        self.log(f"Duplicate detected: {issue['file']} similar to {issue['duplicate_of']} ({issue['similarity']:.2f} similarity)")
        return False

    def store_scan_results(self, report: Dict):
        """Store scan results for trend analysis"""
        results = {
            'timestamp': datetime.now().isoformat(),
            'harmony_score': report['harmony_score'],
            'enhancements_found': report['enhancements_found'],
            'splintering_alerts': report['splintering_alerts'],
            'duplicate_functionality': report['duplicate_functionality'],
            'integration_opportunities': report['integration_opportunities']
        }
        
        results_file = Path.home() / '.claude' / 'harmony_trend.jsonl'
        
        try:
            with open(results_file, 'a') as f:
                json.dump(results, f)
                f.write('\n')
        except Exception as e:
            self.log(f"Error storing scan results: {e}", "ERROR")

    def generate_harmony_alert(self, report: Dict, alert_type: str):
        """Generate high-priority harmony alert"""
        alert = {
            'type': alert_type,
            'timestamp': datetime.now().isoformat(),
            'harmony_score': report['harmony_score'],
            'splintering_alerts': report['splintering_alerts'],
            'duplicate_functionality': report['duplicate_functionality'],
            'recommended_actions': self.get_recommended_actions(report, alert_type)
        }
        
        self.log(f"HARMONY ALERT: {alert_type}", "CRITICAL")
        
        # Integration with reminder system
        if self.config['notifications']['dashboard_integration']:
            self.notify_dashboard_integration(alert)

    def get_recommended_actions(self, report: Dict, alert_type: str) -> List[str]:
        """Get recommended actions for harmony alert"""
        actions = []
        
        if alert_type == "low_harmony_score":
            actions.extend([
                "Review splintering alerts and consolidate duplicate functionality",
                "Move enhancements to appropriate category directories",
                "Standardize naming conventions across similar enhancements",
                "Run harmony dashboard for detailed analysis"
            ])
        elif alert_type == "high_splintering":
            actions.extend([
                "Run detailed splintering analysis",
                "Plan consolidation strategy for duplicate functionality",
                "Update development guidelines to prevent future splintering",
                "Consider creating integration layers between categories"
            ])
        
        return actions

    def notify_dashboard_integration(self, alert: Dict):
        """Notify dashboard integration of harmony alert"""
        # This could integrate with the reminder system
        try:
            reminder_file = Path.home() / '.claude' / 'harmony_notification.json'
            with open(reminder_file, 'w') as f:
                json.dump({
                    'type': 'harmony_alert',
                    'alert': alert,
                    'timestamp': datetime.now().isoformat()
                }, f, indent=2)
        except Exception as e:
            self.log(f"Error creating dashboard notification: {e}", "ERROR")

    def setup_schedule(self):
        """Setup monitoring schedule"""
        if not self.config['monitoring']['enabled']:
            self.log("Monitoring disabled in configuration")
            return
        
        # Full scan schedule
        full_scan_interval = self.config['monitoring']['full_scan_interval']
        if full_scan_interval == "daily":
            full_scan_time = self.config['scan_scheduling']['full_scan_time']
            schedule.every().day.at(full_scan_time).do(self.run_full_scan)
            self.log(f"Scheduled daily full scan at {full_scan_time}")
        elif full_scan_interval == "weekly":
            schedule.every().week.do(self.run_full_scan)
            self.log("Scheduled weekly full scan")
        
        # Quick scan schedule
        quick_scan_interval = self.config['monitoring']['quick_scan_interval']
        if quick_scan_interval == "hourly":
            schedule.every().hour.do(self.run_quick_scan)
            self.log("Scheduled hourly quick scans")
        elif quick_scan_interval == "2hours":
            schedule.every(2).hours.do(self.run_quick_scan)
            self.log("Scheduled quick scans every 2 hours")
        elif quick_scan_interval == "4hours":
            schedule.every(4).hours.do(self.run_quick_scan)
            self.log("Scheduled quick scans every 4 hours")

    def run_monitor_daemon(self):
        """Run monitoring daemon"""
        self.log("Starting periodic harmony monitor daemon...")
        
        # Setup schedule
        self.setup_schedule()
        
        # Run initial scan
        self.log("Running initial harmony scan...")
        self.run_full_scan()
        
        # Main monitoring loop
        while True:
            try:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
            except KeyboardInterrupt:
                self.log("Monitor daemon stopped by user")
                break
            except Exception as e:
                self.log(f"Error in monitor daemon: {e}", "ERROR")
                time.sleep(60)

def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Claude Code Harmony Monitor")
    parser.add_argument('--daemon', action='store_true', help='Run as daemon')
    parser.add_argument('--full-scan', action='store_true', help='Run full scan once')
    parser.add_argument('--quick-scan', action='store_true', help='Run quick scan once')
    parser.add_argument('--configure', action='store_true', help='Configure monitoring')
    
    args = parser.parse_args()
    
    monitor = PeriodicHarmonyMonitor()
    
    if args.configure:
        print("Configuration will be interactive in future version")
        print(f"Config file: {monitor.config_file}")
    elif args.full_scan:
        monitor.run_full_scan()
    elif args.quick_scan:
        monitor.run_quick_scan()
    elif args.daemon:
        monitor.run_monitor_daemon()
    else:
        # Default: run once and exit
        monitor.run_full_scan()

if __name__ == "__main__":
    main()