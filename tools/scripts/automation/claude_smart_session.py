#!/usr/bin/env python3
"""
Claude Smart Session - Intelligent session management with automatic ChatGPT fallback
Main entry point for extended Claude Code sessions with cost optimization
"""

import json
import sys
import asyncio
import time
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional
import argparse

# Add to path for imports
sys.path.append(str(Path(__file__).parent))
from claude_fallback_manager import ClaudeFallbackManager
from claude_session_guard import ClaudeSessionGuard
from unified_cost_tracker import UnifiedCostTracker
from session_optimizer import SessionOptimizer
from chatgpt_offloading_manager import ChatGPTOffloadingManager

class ClaudeSmartSession:
    """Intelligent session manager with automatic fallback and optimization"""
    
    def __init__(self):
        self.fallback_manager = ClaudeFallbackManager()
        self.session_guard = ClaudeSessionGuard()
        self.cost_tracker = UnifiedCostTracker()
        self.session_optimizer = SessionOptimizer()
        self.chatgpt_manager = ChatGPTOffloadingManager()
        
        # Session configuration
        self.session_config = {
            'target_duration_hours': 8,
            'max_cost_eur': 2.0,
            'auto_monitoring': True,
            'auto_fallback': True,
            'smart_routing': True,
            'cost_alerts': True
        }
        
        self.session_id = None
        self.session_start_time = None
        
    def start_smart_session(self, duration_hours: int = 8, max_cost_eur: float = 2.0) -> Dict[str, Any]:
        """Start an intelligent session with monitoring and fallback"""
        
        self.session_config.update({
            'target_duration_hours': duration_hours,
            'max_cost_eur': max_cost_eur
        })
        
        # Generate session ID
        self.session_id = f"smart_session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.session_start_time = datetime.now()
        
        print("🚀 CLAUDE SMART SESSION - STARTING")
        print("=" * 60)
        
        # 1. Check initial status
        initial_status = self._perform_startup_checks()
        if not initial_status['can_start']:
            return initial_status
        
        # 2. Start cost tracking
        cost_session_id = self.cost_tracker.start_session_tracking()
        
        # 3. Generate optimization plan
        optimization_plan = self.session_optimizer.optimize_for_long_session()
        
        # 4. Start monitoring if enabled
        if self.session_config['auto_monitoring']:
            self._start_background_monitoring()
        
        # 5. Show startup summary
        self._show_startup_summary(initial_status, optimization_plan)
        
        return {
            'success': True,
            'session_id': self.session_id,
            'cost_session_id': cost_session_id,
            'target_duration_hours': duration_hours,
            'max_cost_eur': max_cost_eur,
            'monitoring_active': self.session_config['auto_monitoring'],
            'initial_status': initial_status,
            'optimization_plan': optimization_plan
        }
    
    def _perform_startup_checks(self) -> Dict[str, Any]:
        """Perform comprehensive startup checks"""
        
        print("🔍 Performing startup checks...")
        
        # Check Claude status
        claude_status = self.fallback_manager.check_claude_status()
        
        # Check ChatGPT readiness
        chatgpt_summary = self.chatgpt_manager.get_usage_summary()
        
        # Check cost status
        unified_status = self.cost_tracker.get_unified_status()
        
        startup_checks = {
            'timestamp': datetime.now().isoformat(),
            'can_start': True,
            'warnings': [],
            'recommendations': [],
            'claude_health': {
                'available': claude_status['claude_available'],
                'usage_percent': claude_status['claude_metrics']['daily_usage_percent'],
                'hours_to_reset': claude_status['claude_metrics']['hours_to_reset'],
                'session_cost_eur': claude_status['claude_metrics']['session_cost_eur']
            },
            'chatgpt_health': {
                'configured': chatgpt_summary['openai_status'] == 'available',
                'budget_remaining_usd': chatgpt_summary.get('budget_status', {}).get('daily_remaining_usd', 0),
                'ready_for_fallback': claude_status['chatgpt_readiness']['ready_for_fallback']
            },
            'cost_analysis': {
                'total_cost_eur': unified_status['unified_metrics']['total_cost_eur'],
                'projected_daily_eur': unified_status['unified_metrics']['projected_daily_cost_eur'],
                'efficiency': unified_status['unified_metrics']['session_efficiency']
            }
        }
        
        # Analyze startup conditions
        self._analyze_startup_conditions(startup_checks)
        
        return startup_checks
    
    def _analyze_startup_conditions(self, checks: Dict[str, Any]):
        """Analyze startup conditions and generate recommendations"""
        
        # Check Claude availability
        if not checks['claude_health']['available']:
            checks['can_start'] = False
            checks['warnings'].append("❌ Claude CLI not available - cannot start session")
            return
        
        # Check if Claude usage is already too high
        claude_usage = checks['claude_health']['usage_percent']
        if claude_usage > 90:
            checks['warnings'].append(f"🔴 Claude usage very high ({claude_usage:.1f}%) - limited session potential")
            checks['recommendations'].append("Consider waiting for Claude reset or using ChatGPT primarily")
        elif claude_usage > 75:
            checks['warnings'].append(f"🟡 Claude usage high ({claude_usage:.1f}%) - early fallback likely")
            checks['recommendations'].append("Plan to use ChatGPT for simple tasks")
        
        # Check ChatGPT configuration for fallback
        if not checks['chatgpt_health']['configured']:
            checks['warnings'].append("🟡 ChatGPT not configured - no fallback available")
            checks['recommendations'].append("Configure OpenAI API key for extended sessions")
        elif not checks['chatgpt_health']['ready_for_fallback']:
            budget = checks['chatgpt_health']['budget_remaining_usd']
            checks['warnings'].append(f"🟡 Limited ChatGPT budget (${budget:.2f}) - fallback capacity reduced")
        
        # Check projected costs
        projected_cost = checks['cost_analysis']['projected_daily_eur']
        max_cost = self.session_config['max_cost_eur']
        if projected_cost > max_cost:
            checks['warnings'].append(f"🟡 Projected cost (€{projected_cost:.2f}) exceeds target (€{max_cost:.2f})")
            checks['recommendations'].append("Monitor costs closely and increase ChatGPT usage")
        
        # Generate positive recommendations
        if claude_usage < 50 and checks['chatgpt_health']['ready_for_fallback']:
            checks['recommendations'].append("✅ Excellent conditions for extended session")
        
        if checks['cost_analysis']['efficiency'] > 0.8:
            checks['recommendations'].append("✅ Current session efficiency is excellent")
    
    def _start_background_monitoring(self):
        """Start background monitoring"""
        
        print("🛡️ Starting background monitoring...")
        
        # Configure session guard for this session
        self.session_guard.configure_monitoring(
            check_interval_seconds=300,  # 5 minutes
            auto_fallback_enabled=self.session_config['auto_fallback'],
            notification_enabled=True
        )
        
        # Note: In a real implementation, this would start in a separate process
        # For now, we'll indicate it's configured
        print("   ✅ Session guard configured")
        print("   ✅ Automatic fallback enabled" if self.session_config['auto_fallback'] else "   ⭕ Manual fallback mode")
    
    def _show_startup_summary(self, status: Dict[str, Any], optimization: Dict[str, Any]):
        """Show comprehensive startup summary"""
        
        print("\n📊 SESSION STARTUP SUMMARY")
        print("=" * 60)
        
        # Claude status
        claude_usage = status['claude_health']['usage_percent']
        claude_hours = status['claude_health']['hours_to_reset']
        print(f"🤖 Claude Status: {claude_usage:>5.1f}% used | Reset in {claude_hours:>4.1f}h")
        
        # ChatGPT status
        if status['chatgpt_health']['configured']:
            budget = status['chatgpt_health']['budget_remaining_usd']
            print(f"🧠 ChatGPT Ready: ${budget:>6.2f} budget available")
        else:
            print("🧠 ChatGPT: ❌ Not configured")
        
        # Cost analysis
        current_cost = status['cost_analysis']['total_cost_eur']
        efficiency = status['cost_analysis']['efficiency']
        print(f"💰 Current Cost: €{current_cost:>6.4f} | Efficiency: {efficiency:>5.1%}")
        
        # Session potential
        potential = optimization['session_analysis']['session_potential']
        can_achieve_8h = potential['can_achieve_8h_session']
        print(f"⏱️  8-Hour Potential: {'✅ Yes' if can_achieve_8h else '❌ Limited'}")
        
        # Strategy
        strategy = optimization['session_analysis']['optimization_strategy']
        approach = strategy['primary_approach'].replace('_', ' ').title()
        claude_percent = strategy['task_distribution']['claude']
        openai_percent = strategy['task_distribution']['openai']
        print(f"🎯 Strategy: {approach} (Claude {claude_percent}% | OpenAI {openai_percent}%)")
        
        print("\n💡 RECOMMENDATIONS:")
        for rec in status['recommendations'][:3]:
            print(f"   • {rec}")
        
        if status['warnings']:
            print("\n⚠️  WARNINGS:")
            for warning in status['warnings']:
                print(f"   • {warning}")
        
        print(f"\n🚀 Smart session started - ID: {self.session_id}")
        print("   Use 'python3 claude_smart_session.py status' to monitor progress")
        print("   Use 'python3 claude_smart_session.py dashboard' for real-time status")
    
    async def process_task(self, task_description: str, context: Optional[str] = None) -> Dict[str, Any]:
        """Process a task using smart routing"""
        
        if not self.session_config['smart_routing']:
            # Default to Claude if smart routing disabled
            return await self.fallback_manager._process_with_claude(task_description, context)
        
        # Use fallback manager for intelligent routing
        result = await self.fallback_manager.process_task_with_fallback(task_description, context)
        
        # Track session metrics
        if hasattr(self, 'session_start_time') and self.session_start_time:
            session_duration = (datetime.now() - self.session_start_time).total_seconds() / 3600
            result['session_duration_hours'] = session_duration
        
        return result
    
    def get_session_status(self) -> Dict[str, Any]:
        """Get comprehensive session status"""
        
        # Get all component statuses
        claude_status = self.fallback_manager.check_claude_status()
        cost_status = self.cost_tracker.get_unified_status()
        recommendations = self.session_optimizer.get_real_time_recommendations()
        
        session_status = {
            'session_id': self.session_id,
            'session_start': self.session_start_time.isoformat() if self.session_start_time else None,
            'session_duration_hours': 0,
            'claude_status': claude_status,
            'cost_status': cost_status,
            'recommendations': recommendations,
            'fallback_active': self.fallback_manager.fallback_state['active'],
            'session_health': 'unknown'
        }
        
        # Calculate session duration
        if self.session_start_time:
            duration = datetime.now() - self.session_start_time
            session_status['session_duration_hours'] = duration.total_seconds() / 3600
        
        # Assess session health
        session_status['session_health'] = self._assess_session_health(session_status)
        
        return session_status
    
    def _assess_session_health(self, status: Dict[str, Any]) -> str:
        """Assess overall session health"""
        
        claude_usage = status['claude_status']['claude_metrics']['daily_usage_percent']
        efficiency = status['cost_status']['unified_metrics']['session_efficiency']
        cost = status['cost_status']['unified_metrics']['total_cost_eur']
        
        if claude_usage > 90 and not status['fallback_active']:
            return 'critical'
        elif cost > self.session_config['max_cost_eur']:
            return 'over_budget'
        elif efficiency < 0.6:
            return 'inefficient'
        elif claude_usage > 70:
            return 'warning'
        else:
            return 'excellent'
    
    def get_dashboard(self) -> str:
        """Get comprehensive session dashboard"""
        
        if not self.session_id:
            return "❌ No active smart session"
        
        status = self.get_session_status()
        
        # Health indicators
        health_emoji = {
            'excellent': '🟢',
            'warning': '🟡',
            'critical': '🔴',
            'over_budget': '💸',
            'inefficient': '⚠️',
            'unknown': '❓'
        }
        
        health_icon = health_emoji.get(status['session_health'], '❓')
        duration = status['session_duration_hours']
        
        dashboard = f"""
╭─────────────────────────────────────────────────────────╮
│            {health_icon} CLAUDE SMART SESSION DASHBOARD            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📊 SESSION INFO                                        │
│     ID: {self.session_id[-15:]:<15} Health: {status['session_health'].upper():<11}     │
│     Duration: {duration:>6.1f}h | Target: {self.session_config['target_duration_hours']:>4.1f}h              │
│     Status: {'🔄 FALLBACK ACTIVE' if status['fallback_active'] else '🤖 CLAUDE PRIMARY':>20}                    │
│                                                         │
│  🤖 CLAUDE STATUS                                       │
│     Usage: {status['claude_status']['claude_metrics']['daily_usage_percent']:>6.1f}% | Reset: {status['claude_status']['claude_metrics']['hours_to_reset']:>5.1f}h        │
│     Session Cost: €{status['claude_status']['claude_metrics']['session_cost_eur']:>8.4f}                     │
│     Available: {'✅ Yes' if status['claude_status']['claude_available'] else '❌ No':<3}                           │
│                                                         │
│  💰 COST TRACKING                                       │
│     Total: €{status['cost_status']['unified_metrics']['total_cost_eur']:>8.4f} | Budget: €{self.session_config['max_cost_eur']:>6.2f}         │
│     Efficiency: {status['cost_status']['unified_metrics']['session_efficiency']:>6.1%} | Projected: €{status['cost_status']['unified_metrics']['projected_daily_cost_eur']:>6.4f}      │
│                                                         │
│  🎯 CURRENT RECOMMENDATIONS                             │
"""
        
        # Show top recommendations
        for rec in status['recommendations'][:3]:
            rec_short = rec[:50] + '...' if len(rec) > 50 else rec
            dashboard += f"│     • {rec_short:<50}    │\n"
        
        dashboard += "│                                                         │\n"
        
        # Show session targets vs actual
        target_cost = self.session_config['max_cost_eur']
        actual_cost = status['cost_status']['unified_metrics']['total_cost_eur']
        cost_percent = (actual_cost / target_cost) * 100 if target_cost > 0 else 0
        
        target_duration = self.session_config['target_duration_hours']
        actual_duration = duration
        duration_percent = (actual_duration / target_duration) * 100 if target_duration > 0 else 0
        
        dashboard += "│  📈 SESSION PROGRESS                                   │\n"
        dashboard += f"│     Duration: {duration_percent:>5.1f}% of target ({actual_duration:.1f}h / {target_duration:.1f}h)      │\n"
        dashboard += f"│     Cost: {cost_percent:>8.1f}% of budget (€{actual_cost:.4f} / €{target_cost:.2f})    │\n"
        dashboard += "│                                                         │\n"
        dashboard += "╰─────────────────────────────────────────────────────────╯"
        
        return dashboard

def main():
    """Main CLI interface"""
    parser = argparse.ArgumentParser(description='Claude Smart Session Manager')
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Start command
    start_parser = subparsers.add_parser('start', help='Start smart session')
    start_parser.add_argument('--duration', type=int, default=8, help='Target duration in hours')
    start_parser.add_argument('--max-cost', type=float, default=2.0, help='Maximum cost in EUR')
    start_parser.add_argument('--no-monitoring', action='store_true', help='Disable background monitoring')
    start_parser.add_argument('--no-fallback', action='store_true', help='Disable automatic fallback')
    
    # Other commands
    subparsers.add_parser('status', help='Show session status')
    subparsers.add_parser('dashboard', help='Show live dashboard')
    subparsers.add_parser('fallback', help='Show fallback status')
    
    # Task processing
    task_parser = subparsers.add_parser('task', help='Process a task')
    task_parser.add_argument('description', nargs='+', help='Task description')
    task_parser.add_argument('--context', help='Additional context')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    smart_session = ClaudeSmartSession()
    
    if args.command == 'start':
        config = {
            'auto_monitoring': not args.no_monitoring,
            'auto_fallback': not args.no_fallback
        }
        smart_session.session_config.update(config)
        
        result = smart_session.start_smart_session(args.duration, args.max_cost)
        if not result['success']:
            print(f"❌ Failed to start session: {result.get('error', 'Unknown error')}")
        
    elif args.command == 'status':
        status = smart_session.get_session_status()
        print(json.dumps(status, indent=2))
        
    elif args.command == 'dashboard':
        print(smart_session.get_dashboard())
        
    elif args.command == 'fallback':
        fallback_manager = ClaudeFallbackManager()
        print(fallback_manager.get_fallback_dashboard())
        
    elif args.command == 'task':
        task_description = ' '.join(args.description)
        context = args.context
        
        result = asyncio.run(smart_session.process_task(task_description, context))
        print(json.dumps(result, indent=2))
    
    else:
        parser.print_help()

if __name__ == "__main__":
    main()