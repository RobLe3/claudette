#!/usr/bin/env python3
"""
Unified Cost Tracker - Integrated Claude and OpenAI cost tracking
Ensures compatibility and unified reporting for long-duration sessions
"""

import json
import sqlite3
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional
import sys

# Add to path for imports
sys.path.append(str(Path(__file__).parent))
from claude_integration_coordinator import ClaudeIntegrationCoordinator
from chatgpt_offloading_manager import ChatGPTOffloadingManager

class UnifiedCostTracker:
    """Unified tracking for both Claude and OpenAI costs"""
    
    def __init__(self):
        self.claude_coordinator = ClaudeIntegrationCoordinator()
        self.chatgpt_manager = ChatGPTOffloadingManager()
        
        # Database for unified tracking
        self.db_path = Path.home() / '.claude' / 'unified_costs.db'
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Exchange rates (2025 accurate rates)
        self.usd_to_eur = 1.09  # 1 USD = 1.09 EUR (July 2025)
        self.eur_to_usd = 0.92  # 1 EUR = 0.92 USD (July 2025)
        
        self._init_database()
        
    def _init_database(self):
        """Initialize unified cost tracking database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS unified_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_start TEXT,
                    session_end TEXT,
                    duration_minutes REAL,
                    claude_tokens_input INTEGER DEFAULT 0,
                    claude_tokens_output INTEGER DEFAULT 0,
                    claude_cost_eur REAL DEFAULT 0.0,
                    openai_tokens INTEGER DEFAULT 0,
                    openai_requests INTEGER DEFAULT 0,
                    openai_cost_usd REAL DEFAULT 0.0,
                    total_cost_eur REAL DEFAULT 0.0,
                    savings_eur REAL DEFAULT 0.0,
                    efficiency_score REAL DEFAULT 0.0
                )
            ''')
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS cost_optimizations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT,
                    optimization_type TEXT,
                    claude_tokens_saved INTEGER,
                    openai_tokens_used INTEGER,
                    cost_difference_eur REAL,
                    task_description TEXT
                )
            ''')
            
    def get_unified_status(self) -> Dict[str, Any]:
        """Get comprehensive status from both platforms"""
        
        # Get Claude status
        claude_status = self.claude_coordinator.status_manager.get_claude_pro_status()
        
        # Get OpenAI status
        openai_status = self.chatgpt_manager.get_usage_summary()
        
        # Calculate unified metrics
        unified_status = {
            'timestamp': datetime.now().isoformat(),
            'platforms': {
                'claude': {
                    'subscription_tier': claude_status.get('subscription_tier', 'UNKNOWN') if claude_status else 'UNKNOWN',
                    'daily_usage_percent': claude_status.get('daily_usage_percent', 0) if claude_status else 0,
                    'monthly_usage_percent': claude_status.get('monthly_usage_percent', 0) if claude_status else 0,
                    'session_cost_eur': claude_status.get('session_cost_eur', 0) if claude_status else 0,
                    'billing_period_eur': claude_status.get('billing_period_eur', 0) if claude_status else 0,
                    'hours_to_reset': claude_status.get('hours_to_reset', 0) if claude_status else 0
                },
                'openai': {
                    'api_status': openai_status.get('openai_status', 'not_configured'),
                    'daily_requests': openai_status.get('today', {}).get('requests', 0),
                    'daily_tokens': openai_status.get('today', {}).get('tokens', 0),
                    'daily_cost_usd': openai_status.get('today', {}).get('cost_usd', 0),
                    'monthly_cost_usd': openai_status.get('this_month', {}).get('cost_usd', 0),
                    'budget_remaining_usd': openai_status.get('budget_status', {}).get('daily_remaining_usd', 10),
                    'claude_tokens_saved': openai_status.get('savings', {}).get('claude_tokens_saved', 0)
                }
            },
            'unified_metrics': {},
            'optimization_opportunities': [],
            'session_recommendations': []
        }
        
        # Calculate unified metrics
        claude_cost_eur = unified_status['platforms']['claude']['billing_period_eur']
        openai_cost_eur = unified_status['platforms']['openai']['daily_cost_usd'] * self.usd_to_eur
        
        unified_status['unified_metrics'] = {
            'total_cost_eur': claude_cost_eur + openai_cost_eur,
            'cost_distribution': {
                'claude_percent': (claude_cost_eur / (claude_cost_eur + openai_cost_eur)) * 100 if (claude_cost_eur + openai_cost_eur) > 0 else 100,
                'openai_percent': (openai_cost_eur / (claude_cost_eur + openai_cost_eur)) * 100 if (claude_cost_eur + openai_cost_eur) > 0 else 0
            },
            'session_efficiency': self._calculate_session_efficiency(unified_status),
            'projected_daily_cost_eur': self._project_daily_cost(unified_status),
            'claude_capacity_remaining': 100 - unified_status['platforms']['claude']['daily_usage_percent']
        }
        
        # Generate optimization opportunities
        unified_status['optimization_opportunities'] = self._identify_optimizations(unified_status)
        
        # Generate session recommendations
        unified_status['session_recommendations'] = self._generate_session_recommendations(unified_status)
        
        return unified_status
    
    def _calculate_session_efficiency(self, status: Dict[str, Any]) -> float:
        """Calculate overall session efficiency score"""
        claude_usage = status['platforms']['claude']['daily_usage_percent']
        openai_budget_used = (10 - status['platforms']['openai']['budget_remaining_usd']) / 10 * 100
        
        # Efficiency score: balance between platforms
        if claude_usage < 50 and openai_budget_used < 20:
            return 0.95  # Excellent - both platforms underutilized
        elif claude_usage < 80 and openai_budget_used < 50:
            return 0.85  # Good - balanced usage
        elif claude_usage > 90:
            return 0.60  # Should offload more to OpenAI
        else:
            return 0.75  # Moderate efficiency
    
    def _project_daily_cost(self, status: Dict[str, Any]) -> float:
        """Project total daily cost based on current usage"""
        current_hour = datetime.now().hour
        if current_hour == 0:
            current_hour = 1  # Avoid division by zero
            
        hours_remaining = 24 - current_hour
        
        # Current costs
        claude_session_eur = status['platforms']['claude']['session_cost_eur']
        openai_daily_eur = status['platforms']['openai']['daily_cost_usd'] * self.usd_to_eur
        
        current_total = claude_session_eur + openai_daily_eur
        
        # Project based on usage rate
        if current_hour > 0:
            hourly_rate = current_total / current_hour
            projected_total = current_total + (hourly_rate * hours_remaining)
        else:
            projected_total = current_total
            
        return projected_total
    
    def _identify_optimizations(self, status: Dict[str, Any]) -> list:
        """Identify cost optimization opportunities"""
        optimizations = []
        
        claude_usage = status['platforms']['claude']['daily_usage_percent']
        openai_cost = status['platforms']['openai']['daily_cost_usd']
        
        if claude_usage > 70:
            optimizations.append({
                'type': 'offload_more',
                'priority': 'high',
                'description': f'Claude usage at {claude_usage:.1f}% - consider offloading more simple tasks to ChatGPT',
                'potential_savings_eur': self._estimate_offload_savings(claude_usage)
            })
            
        if openai_cost > 5:  # $5 daily budget warning
            optimizations.append({
                'type': 'reduce_openai',
                'priority': 'medium',
                'description': f'OpenAI costs at ${openai_cost:.2f} - consider keeping more tasks with Claude',
                'potential_savings_eur': (openai_cost - 2) * self.usd_to_eur
            })
            
        if claude_usage < 30 and openai_cost < 0.5:
            optimizations.append({
                'type': 'underutilized',
                'priority': 'low',
                'description': 'Both platforms underutilized - could handle more complex tasks',
                'potential_increase_capacity': '40%'
            })
            
        return optimizations
    
    def _estimate_offload_savings(self, claude_usage: float) -> float:
        """Estimate potential savings from offloading"""
        if claude_usage > 80:
            # High usage - significant savings possible
            return 0.05  # €0.05 potential daily savings
        elif claude_usage > 60:
            return 0.02
        else:
            return 0.01
    
    def _generate_session_recommendations(self, status: Dict[str, Any]) -> list:
        """Generate recommendations for session optimization"""
        recommendations = []
        
        claude_capacity = status['unified_metrics']['claude_capacity_remaining']
        session_efficiency = status['unified_metrics']['session_efficiency']
        
        if claude_capacity > 70:
            recommendations.append({
                'category': 'capacity',
                'message': f'High Claude capacity remaining ({claude_capacity:.1f}%) - perfect for extended sessions',
                'action': 'Continue current workflow'
            })
        elif claude_capacity < 30:
            recommendations.append({
                'category': 'capacity',
                'message': f'Claude capacity low ({claude_capacity:.1f}%) - increase ChatGPT offloading',
                'action': 'Offload documentation, simple code generation to ChatGPT'
            })
            
        if session_efficiency < 0.7:
            recommendations.append({
                'category': 'efficiency',
                'message': f'Session efficiency at {session_efficiency:.0%} - room for improvement',
                'action': 'Review task distribution between platforms'
            })
        else:
            recommendations.append({
                'category': 'efficiency',
                'message': f'Excellent session efficiency ({session_efficiency:.0%})',
                'action': 'Maintain current distribution strategy'
            })
            
        return recommendations
    
    def track_optimization(self, task_description: str, claude_tokens_saved: int, 
                          openai_tokens_used: int, cost_difference_eur: float):
        """Track a specific optimization for analysis"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT INTO cost_optimizations 
                (timestamp, optimization_type, claude_tokens_saved, openai_tokens_used, 
                 cost_difference_eur, task_description)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                datetime.now().isoformat(),
                'offload',
                claude_tokens_saved,
                openai_tokens_used,
                cost_difference_eur,
                task_description
            ))
    
    def start_session_tracking(self) -> str:
        """Start tracking a new unified session"""
        session_id = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT INTO unified_sessions (session_start)
                VALUES (?)
            ''', (datetime.now().isoformat(),))
            
        return session_id
    
    def end_session_tracking(self, session_start: str):
        """End session tracking with final metrics"""
        status = self.get_unified_status()
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                UPDATE unified_sessions 
                SET session_end = ?, 
                    claude_cost_eur = ?,
                    openai_cost_usd = ?,
                    total_cost_eur = ?,
                    efficiency_score = ?
                WHERE session_start = ?
            ''', (
                datetime.now().isoformat(),
                status['platforms']['claude']['session_cost_eur'],
                status['platforms']['openai']['daily_cost_usd'],
                status['unified_metrics']['total_cost_eur'],
                status['unified_metrics']['session_efficiency'],
                session_start
            ))
    
    def generate_unified_dashboard(self) -> str:
        """Generate comprehensive unified cost dashboard"""
        status = self.get_unified_status()
        
        dashboard = f"""
╭─────────────────────────────────────────────────────────╮
│             💰 UNIFIED COST TRACKING DASHBOARD           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🤖 CLAUDE STATUS                                       │
│     Tier: {status['platforms']['claude']['subscription_tier']:<15} Daily: {status['platforms']['claude']['daily_usage_percent']:>5.1f}%      │
│     Session: €{status['platforms']['claude']['session_cost_eur']:>8.4f} Period: €{status['platforms']['claude']['billing_period_eur']:>6.2f}        │
│     Reset in: {status['platforms']['claude']['hours_to_reset']:>6.1f}h                             │
│                                                         │
│  🧠 OPENAI STATUS                                       │
│     Status: {status['platforms']['openai']['api_status']:<16} Budget: ${status['platforms']['openai']['budget_remaining_usd']:>6.2f}     │
│     Daily: ${status['platforms']['openai']['daily_cost_usd']:>8.4f} Monthly: ${status['platforms']['openai']['monthly_cost_usd']:>7.4f}        │
│     Tokens: {status['platforms']['openai']['daily_tokens']:>8} Saved: {status['platforms']['openai']['claude_tokens_saved']:>6}       │
│                                                         │
│  📊 UNIFIED METRICS                                     │
│     Total Cost: €{status['unified_metrics']['total_cost_eur']:>8.4f}                        │
│     Distribution: Claude {status['unified_metrics']['cost_distribution']['claude_percent']:>4.1f}% | OpenAI {status['unified_metrics']['cost_distribution']['openai_percent']:>4.1f}%    │
│     Efficiency: {status['unified_metrics']['session_efficiency']:>6.1%} | Capacity: {status['unified_metrics']['claude_capacity_remaining']:>5.1f}%     │
│     Projected Daily: €{status['unified_metrics']['projected_daily_cost_eur']:>6.4f}                    │
│                                                         │
│  🎯 OPTIMIZATION                                        │
"""
        
        if status['optimization_opportunities']:
            for opt in status['optimization_opportunities'][:2]:
                priority = opt['priority'].upper()
                desc = opt['description'][:45] + '...' if len(opt['description']) > 45 else opt['description']
                dashboard += f"│     {priority:<6}: {desc:<45}     │\n"
        else:
            dashboard += "│     ✅ No optimizations needed - system efficient      │\n"
        
        dashboard += "│                                                         │\n"
        dashboard += "│  💡 RECOMMENDATIONS                                    │\n"
        
        for rec in status['session_recommendations'][:2]:
            message = rec['message'][:50] + '...' if len(rec['message']) > 50 else rec['message']
            dashboard += f"│     • {message:<50}    │\n"
        
        dashboard += "│                                                         │\n"
        dashboard += "╰─────────────────────────────────────────────────────────╯"
        
        return dashboard

def main():
    """Main CLI interface"""
    tracker = UnifiedCostTracker()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "status":
            status = tracker.get_unified_status()
            print(json.dumps(status, indent=2))
            
        elif command == "dashboard":
            print(tracker.generate_unified_dashboard())
            
        elif command == "start-session":
            session_id = tracker.start_session_tracking()
            print(f"📊 Started tracking session: {session_id}")
            
        elif command == "optimize":
            status = tracker.get_unified_status()
            print("🔍 OPTIMIZATION ANALYSIS")
            print("=" * 50)
            
            for opt in status['optimization_opportunities']:
                print(f"🎯 {opt['type'].upper()} ({opt['priority']} priority)")
                print(f"   {opt['description']}")
                if 'potential_savings_eur' in opt:
                    print(f"   Potential savings: €{opt['potential_savings_eur']:.4f}/day")
                print()
        else:
            print("Commands: status, dashboard, start-session, optimize")
    else:
        print(tracker.generate_unified_dashboard())

if __name__ == "__main__":
    main()