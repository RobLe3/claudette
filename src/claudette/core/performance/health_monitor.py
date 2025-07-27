#!/usr/bin/env python3
"""
Enhancement Health Monitor - Continuous monitoring and alerting for enhancement system
"""

import json
import sqlite3
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any
import sys
import threading
import subprocess

# Add to path for imports
sys.path.append(str(Path(__file__).parent))
from enhancement_index_manager import EnhancementIndexManager

class EnhancementHealthMonitor:
    """Monitor enhancement system health and provide alerts"""
    
    def __init__(self):
        self.claude_dir = Path.home() / '.claude'
        self.monitor_db = self.claude_dir / 'health_monitor.db'
        self.alert_log = self.claude_dir / 'health_alerts.log'
        self.enhancement_manager = EnhancementIndexManager()
        
        self.monitoring_config = {
            'check_interval_minutes': 30,
            'health_threshold': 0.8,
            'alert_threshold': 0.6,
            'critical_enhancements': [
                'claude_integration_coordinator.py',
                'unified_cost_tracker.py',
                'chatgpt_offloading_manager.py',
                'session_optimizer.py',
                'enhancement_index_manager.py'
            ],
            'auto_healing_enabled': True
        }
        
        self._init_monitor_database()
        
    def _init_monitor_database(self):
        """Initialize health monitoring database"""
        with sqlite3.connect(self.monitor_db) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS health_checks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT,
                    overall_health REAL,
                    enhancement_count INTEGER,
                    healthy_count INTEGER,
                    issues_count INTEGER,
                    missing_count INTEGER,
                    critical_issues TEXT,
                    recommendations TEXT
                )
            ''')
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT,
                    alert_type TEXT,
                    severity TEXT,
                    enhancement_id TEXT,
                    message TEXT,
                    auto_resolved BOOLEAN DEFAULT 0,
                    resolution_time TEXT
                )
            ''')
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS performance_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT,
                    metric_name TEXT,
                    metric_value REAL,
                    enhancement_id TEXT
                )
            ''')
    
    def run_health_check(self) -> Dict[str, Any]:
        """Run comprehensive health check"""
        start_time = datetime.now()
        
        # Get current verification results
        verification_result = self.enhancement_manager.verify_enhancements()
        
        health_check = {
            'timestamp': start_time.isoformat(),
            'overall_health': verification_result['overall_health'],
            'enhancement_count': verification_result['total_checked'],
            'healthy_count': verification_result['healthy'],
            'issues_count': verification_result['issues'],
            'missing_count': verification_result['missing'],
            'critical_issues': [],
            'recommendations': [],
            'alerts_generated': [],
            'auto_healing_attempted': []
        }
        
        # Check critical enhancements
        critical_issues = self._check_critical_enhancements(verification_result)
        health_check['critical_issues'] = critical_issues
        
        # Generate alerts if needed
        alerts = self._generate_alerts(health_check)
        health_check['alerts_generated'] = alerts
        
        # Attempt auto-healing if enabled
        if self.monitoring_config['auto_healing_enabled']:
            healing_results = self._attempt_auto_healing(health_check)
            health_check['auto_healing_attempted'] = healing_results
        
        # Generate recommendations
        recommendations = self._generate_recommendations(health_check)
        health_check['recommendations'] = recommendations
        
        # Log health check
        self._log_health_check(health_check)
        
        # Store performance metrics
        duration_ms = (datetime.now() - start_time).total_seconds() * 1000
        self._log_performance_metric('health_check_duration', duration_ms)
        
        return health_check
    
    def _check_critical_enhancements(self, verification_result: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check status of critical enhancements"""
        critical_issues = []
        
        for detail in verification_result['details']:
            if any(critical in detail['name'] for critical in self.monitoring_config['critical_enhancements']):
                if detail['status'] != 'healthy':
                    critical_issues.append({
                        'name': detail['name'],
                        'status': detail['status'],
                        'issues': detail['issues']
                    })
        
        return critical_issues
    
    def _generate_alerts(self, health_check: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate alerts based on health check results"""
        alerts = []
        
        # Overall health alert
        if health_check['overall_health'] < self.monitoring_config['alert_threshold']:
            alerts.append({
                'type': 'low_health',
                'severity': 'critical' if health_check['overall_health'] < 0.5 else 'warning',
                'message': f"Overall health dropped to {health_check['overall_health']:.1%}",
                'enhancement_id': 'system'
            })
        
        # Critical enhancement alerts
        for critical_issue in health_check['critical_issues']:
            alerts.append({
                'type': 'critical_enhancement',
                'severity': 'critical',
                'message': f"Critical enhancement {critical_issue['name']} has issues: {', '.join(critical_issue['issues'])}",
                'enhancement_id': critical_issue['name']
            })
        
        # Missing enhancements alert
        if health_check['missing_count'] > 0:
            alerts.append({
                'type': 'missing_enhancements',
                'severity': 'warning',
                'message': f"{health_check['missing_count']} enhancements are missing",
                'enhancement_id': 'system'
            })
        
        # Log alerts
        for alert in alerts:
            self._log_alert(alert)
        
        return alerts
    
    def _attempt_auto_healing(self, health_check: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Attempt automatic healing of detected issues"""
        healing_results = []
        
        # Try to rebuild index if health is low
        if health_check['overall_health'] < self.monitoring_config['health_threshold']:
            try:
                rebuild_result = self.enhancement_manager.rebuild_index()
                healing_results.append({
                    'action': 'index_rebuild',
                    'status': 'success',
                    'details': f"Rebuilt index with {rebuild_result['total_enhancements']} enhancements"
                })
            except Exception as e:
                healing_results.append({
                    'action': 'index_rebuild',
                    'status': 'failed',
                    'details': f"Failed to rebuild index: {str(e)}"
                })
        
        # Try to fix missing critical enhancements
        for critical_issue in health_check['critical_issues']:
            if critical_issue['status'] == 'missing':
                healing_result = self._try_restore_enhancement(critical_issue['name'])
                healing_results.append(healing_result)
        
        return healing_results
    
    def _try_restore_enhancement(self, enhancement_name: str) -> Dict[str, Any]:
        """Try to restore a missing enhancement"""
        # Check if it's a known script that can be regenerated
        restoration_map = {
            'claude_integration_coordinator.py': 'Core integration coordinator',
            'unified_cost_tracker.py': 'Unified cost tracking system',
            'chatgpt_offloading_manager.py': 'ChatGPT integration manager',
            'session_optimizer.py': 'Session optimization tools'
        }
        
        if enhancement_name in restoration_map:
            return {
                'action': f'restore_{enhancement_name}',
                'status': 'attempted',
                'details': f'Would attempt to restore {restoration_map[enhancement_name]}'
            }
        
        return {
            'action': f'restore_{enhancement_name}',
            'status': 'unknown',
            'details': f'No restoration method available for {enhancement_name}'
        }
    
    def _generate_recommendations(self, health_check: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on health check"""
        recommendations = []
        
        if health_check['overall_health'] < 0.7:
            recommendations.append("Run full system verification: python3 enhancement_index_manager.py verify")
        
        if health_check['missing_count'] > 0:
            recommendations.append("Check installation integrity and reinstall missing components")
        
        if health_check['critical_issues']:
            recommendations.append("Immediate attention required for critical enhancement issues")
        
        if health_check['issues_count'] > health_check['healthy_count']:
            recommendations.append("More enhancements have issues than are healthy - system review needed")
        
        if not recommendations:
            recommendations.append("System health is good - no immediate action required")
        
        return recommendations
    
    def _log_health_check(self, health_check: Dict[str, Any]):
        """Log health check to database"""
        with sqlite3.connect(self.monitor_db) as conn:
            conn.execute('''
                INSERT INTO health_checks 
                (timestamp, overall_health, enhancement_count, healthy_count, 
                 issues_count, missing_count, critical_issues, recommendations)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                health_check['timestamp'],
                health_check['overall_health'],
                health_check['enhancement_count'],
                health_check['healthy_count'],
                health_check['issues_count'],
                health_check['missing_count'],
                json.dumps(health_check['critical_issues']),
                json.dumps(health_check['recommendations'])
            ))
    
    def _log_alert(self, alert: Dict[str, Any]):
        """Log alert to database"""
        with sqlite3.connect(self.monitor_db) as conn:
            conn.execute('''
                INSERT INTO alerts 
                (timestamp, alert_type, severity, enhancement_id, message)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                datetime.now().isoformat(),
                alert['type'],
                alert['severity'],
                alert['enhancement_id'],
                alert['message']
            ))
    
    def _log_performance_metric(self, metric_name: str, value: float, enhancement_id: str = 'system'):
        """Log performance metric"""
        with sqlite3.connect(self.monitor_db) as conn:
            conn.execute('''
                INSERT INTO performance_metrics 
                (timestamp, metric_name, metric_value, enhancement_id)
                VALUES (?, ?, ?, ?)
            ''', (
                datetime.now().isoformat(),
                metric_name,
                value,
                enhancement_id
            ))
    
    def get_health_trend(self, days: int = 7) -> Dict[str, Any]:
        """Get health trend over specified days"""
        cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        with sqlite3.connect(self.monitor_db) as conn:
            cursor = conn.execute('''
                SELECT timestamp, overall_health, enhancement_count, healthy_count, issues_count
                FROM health_checks 
                WHERE timestamp > ?
                ORDER BY timestamp
            ''', (cutoff_date,))
            
            rows = cursor.fetchall()
        
        if not rows:
            return {'trend': 'no_data', 'health_points': []}
        
        health_points = []
        for row in rows:
            health_points.append({
                'timestamp': row[0],
                'health': row[1],
                'total': row[2],
                'healthy': row[3],
                'issues': row[4]
            })
        
        # Calculate trend
        if len(health_points) > 1:
            recent_avg = sum(p['health'] for p in health_points[-3:]) / min(3, len(health_points))
            older_avg = sum(p['health'] for p in health_points[:3]) / min(3, len(health_points))
            
            if recent_avg > older_avg + 0.05:
                trend = 'improving'
            elif recent_avg < older_avg - 0.05:
                trend = 'declining'
            else:
                trend = 'stable'
        else:
            trend = 'insufficient_data'
        
        return {
            'trend': trend,
            'health_points': health_points,
            'current_health': health_points[-1]['health'] if health_points else 0,
            'average_health': sum(p['health'] for p in health_points) / len(health_points),
            'days_analyzed': days
        }
    
    def generate_health_dashboard(self) -> str:
        """Generate health monitoring dashboard"""
        health_check = self.run_health_check()
        health_trend = self.get_health_trend()
        
        trend_emoji = {
            'improving': '📈',
            'stable': '➡️',
            'declining': '📉',
            'insufficient_data': '❓',
            'no_data': '📊'
        }
        
        dashboard = f"""
╭─────────────────────────────────────────────────────────╮
│            💊 ENHANCEMENT HEALTH MONITOR                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🏥 CURRENT HEALTH                                      │
│     Overall Health: {health_check['overall_health']:>6.1%}                      │
│     Healthy: {health_check['healthy_count']:>3} | Issues: {health_check['issues_count']:>3} | Missing: {health_check['missing_count']:>3}    │
│     Total Enhancements: {health_check['enhancement_count']:>3}                      │
│                                                         │
│  📊 TREND (7 days) {trend_emoji.get(health_trend['trend'], '❓')}                           │
│     Trend: {health_trend['trend'].title():<15}                   │
│     Average Health: {health_trend.get('average_health', 0):>6.1%}                  │
│     Data Points: {len(health_trend.get('health_points', [])):>3}                          │
│                                                         │
"""
        
        # Show critical issues if any
        if health_check['critical_issues']:
            dashboard += "│  🚨 CRITICAL ISSUES                                     │\n"
            for issue in health_check['critical_issues'][:2]:
                name = issue['name'][:35] + '...' if len(issue['name']) > 35 else issue['name']
                status = issue['status'].upper()
                dashboard += f"│     {name:<35}: {status:>8}    │\n"
            if len(health_check['critical_issues']) > 2:
                dashboard += f"│     ... and {len(health_check['critical_issues']) - 2} more critical issues                │\n"
            dashboard += "│                                                         │\n"
        
        # Show alerts if any
        if health_check['alerts_generated']:
            dashboard += "│  🔔 RECENT ALERTS                                      │\n"
            for alert in health_check['alerts_generated'][:2]:
                severity = alert['severity'].upper()
                message = alert['message'][:35] + '...' if len(alert['message']) > 35 else alert['message']
                dashboard += f"│     {severity:<8}: {message:<35}    │\n"
            dashboard += "│                                                         │\n"
        
        # Show recommendations
        if health_check['recommendations']:
            dashboard += "│  💡 RECOMMENDATIONS                                    │\n"
            for rec in health_check['recommendations'][:2]:
                rec_short = rec[:47] + '...' if len(rec) > 47 else rec
                dashboard += f"│     • {rec_short:<47}    │\n"
            dashboard += "│                                                         │\n"
        
        dashboard += "╰─────────────────────────────────────────────────────────╯"
        
        return dashboard

def main():
    """Main CLI interface"""
    monitor = EnhancementHealthMonitor()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "check":
            result = monitor.run_health_check()
            print(json.dumps(result, indent=2))
            
        elif command == "dashboard":
            print(monitor.generate_health_dashboard())
            
        elif command == "trend":
            days = int(sys.argv[2]) if len(sys.argv) > 2 else 7
            trend = monitor.get_health_trend(days)
            print(json.dumps(trend, indent=2))
            
        elif command == "alerts":
            # Show recent alerts
            with sqlite3.connect(monitor.monitor_db) as conn:
                cursor = conn.execute('''
                    SELECT timestamp, alert_type, severity, message 
                    FROM alerts 
                    ORDER BY timestamp DESC 
                    LIMIT 10
                ''')
                alerts = cursor.fetchall()
            
            print("🔔 Recent Alerts:")
            for alert in alerts:
                print(f"  {alert[0]}: {alert[2].upper()} - {alert[3]}")
                
        else:
            print("Commands: check, dashboard, trend [days], alerts")
    else:
        print(monitor.generate_health_dashboard())

if __name__ == "__main__":
    main()