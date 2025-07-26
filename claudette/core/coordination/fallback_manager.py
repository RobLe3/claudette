#!/usr/bin/env python3
"""
Claude Fallback Manager - Automatic ChatGPT fallback when Claude tokens/subscription is exhausted
Ensures seamless continuation of work without interruption
"""

import json
import sys
import asyncio
import time
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Union
import re

# Add to path for imports
sys.path.append(str(Path(__file__).parent))
# Import from same directory
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

try:
    from unified_cost_tracker import UnifiedCostTracker
    from chatgpt_offloading_manager import ChatGPTOffloadingManager
    from integration_coordinator import ClaudeIntegrationCoordinator
except ImportError:
    # Fallback for standalone testing - create minimal stubs
    class UnifiedCostTracker:
        def __init__(self): pass
        def get_current_costs(self): return {"total": 0.0}
    
    class ChatGPTOffloadingManager:
        def __init__(self): pass
        def is_available(self): return False
    
    class ClaudeIntegrationCoordinator:
        def __init__(self): pass
        def get_status(self): return {"status": "fallback"}

class ClaudeFallbackManager:
    """Manage automatic fallback to ChatGPT when Claude limits are reached"""
    
    def __init__(self):
        self.cost_tracker = UnifiedCostTracker()
        self.chatgpt_manager = ChatGPTOffloadingManager()
        self.claude_coordinator = ClaudeIntegrationCoordinator()
        self.session_optimizer = SessionOptimizer()
        
        # Fallback thresholds
        self.fallback_triggers = {
            'claude_usage_critical': 95,     # 95% Claude usage triggers fallback
            'claude_usage_warning': 85,      # 85% usage starts preparation
            'session_cost_limit_eur': 1.50,  # €1.50 session cost limit
            'daily_cost_limit_eur': 2.00,    # €2.00 daily cost limit
            'token_rate_limit': True,        # Rate limit detection
            'subscription_exhausted': True    # Subscription limit reached
        }
        
        # Fallback configuration
        self.fallback_config = {
            'auto_fallback_enabled': True,
            'preserve_claude_for_files': True,  # Reserve Claude for file operations
            'chatgpt_model_preference': 'gpt-4o-mini',  # Cheaper model for most tasks
            'emergency_budget_usd': 20.0,     # Emergency ChatGPT budget
            'fallback_session_duration': 8    # Hours to continue with ChatGPT
        }
        
        # State tracking
        self.fallback_state = {
            'active': False,
            'triggered_at': None,
            'trigger_reason': None,
            'tasks_completed_on_chatgpt': 0,
            'claude_tokens_saved': 0,
            'fallback_cost_usd': 0.0
        }
        
        self._load_fallback_state()
    
    def _load_fallback_state(self):
        """Load fallback state from file"""
        state_file = Path.home() / '.claude' / 'fallback_state.json'
        try:
            if state_file.exists():
                with open(state_file, 'r') as f:
                    saved_state = json.load(f)
                    self.fallback_state.update(saved_state)
        except Exception as e:
            print(f"Warning: Could not load fallback state: {e}")
    
    def _save_fallback_state(self):
        """Save fallback state to file"""
        state_file = Path.home() / '.claude' / 'fallback_state.json'
        try:
            with open(state_file, 'w') as f:
                json.dump(self.fallback_state, f, indent=2)
        except Exception as e:
            print(f"Warning: Could not save fallback state: {e}")
    
    def check_claude_status(self) -> Dict[str, Any]:
        """Check Claude's current status and determine if fallback is needed"""
        
        # Get unified status
        status = self.cost_tracker.get_unified_status()
        
        claude_status = status['platforms']['claude']
        
        status_check = {
            'timestamp': datetime.now().isoformat(),
            'claude_available': True,
            'fallback_needed': False,
            'trigger_reasons': [],
            'severity': 'normal',  # normal, warning, critical, emergency
            'recommended_action': 'continue_claude',
            'claude_metrics': {
                'daily_usage_percent': claude_status['daily_usage_percent'],
                'session_cost_eur': claude_status['session_cost_eur'],
                'hours_to_reset': claude_status['hours_to_reset'],
                'subscription_tier': claude_status['subscription_tier']
            },
            'chatgpt_readiness': self._check_chatgpt_readiness()
        }
        
        # Check various triggers
        self._check_usage_triggers(status_check, claude_status)
        self._check_cost_triggers(status_check, status)
        self._check_technical_triggers(status_check)
        
        # Determine overall recommendation
        status_check['recommended_action'] = self._determine_recommended_action(status_check)
        
        return status_check
    
    def _check_usage_triggers(self, status_check: Dict[str, Any], claude_status: Dict[str, Any]):
        """Check Claude usage-based triggers"""
        
        daily_usage = claude_status['daily_usage_percent']
        
        if daily_usage >= self.fallback_triggers['claude_usage_critical']:
            status_check['fallback_needed'] = True
            status_check['severity'] = 'critical'
            status_check['trigger_reasons'].append(f"Claude usage critical: {daily_usage:.1f}%")
            
        elif daily_usage >= self.fallback_triggers['claude_usage_warning']:
            status_check['severity'] = 'warning'
            status_check['trigger_reasons'].append(f"Claude usage high: {daily_usage:.1f}%")
    
    def _check_cost_triggers(self, status_check: Dict[str, Any], unified_status: Dict[str, Any]):
        """Check cost-based triggers"""
        
        session_cost = unified_status['platforms']['claude']['session_cost_eur']
        total_cost = unified_status['unified_metrics']['total_cost_eur']
        
        if session_cost >= self.fallback_triggers['session_cost_limit_eur']:
            status_check['fallback_needed'] = True
            status_check['severity'] = 'critical'
            status_check['trigger_reasons'].append(f"Session cost limit: €{session_cost:.2f}")
            
        if total_cost >= self.fallback_triggers['daily_cost_limit_eur']:
            status_check['fallback_needed'] = True
            status_check['severity'] = 'emergency'
            status_check['trigger_reasons'].append(f"Daily cost limit: €{total_cost:.2f}")
    
    def _check_technical_triggers(self, status_check: Dict[str, Any]):
        """Check for technical issues requiring fallback"""
        
        # Check for rate limiting or subscription issues
        try:
            # Quick test of Claude availability
            result = subprocess.run(['claude', '--version'], capture_output=True, text=True, timeout=5)
            if result.returncode != 0:
                status_check['claude_available'] = False
                status_check['fallback_needed'] = True
                status_check['severity'] = 'emergency'
                status_check['trigger_reasons'].append("Claude CLI unavailable")
        except Exception:
            status_check['claude_available'] = False
            status_check['fallback_needed'] = True
            status_check['severity'] = 'emergency'
            status_check['trigger_reasons'].append("Claude command failed")
    
    def _check_chatgpt_readiness(self) -> Dict[str, Any]:
        """Check if ChatGPT is ready for fallback"""
        
        openai_status = self.chatgpt_manager.get_usage_summary()
        
        readiness = {
            'available': bool(self.chatgpt_manager.openai_api_key),
            'budget_remaining_usd': openai_status.get('budget_status', {}).get('daily_remaining_usd', 0),
            'can_handle_session': False,
            'estimated_hours': 0.0,
            'ready_for_fallback': False
        }
        
        if readiness['available']:
            # Estimate how many hours ChatGPT can handle
            budget_remaining = readiness['budget_remaining_usd']
            avg_cost_per_hour = 0.50  # Conservative estimate for mixed tasks
            readiness['estimated_hours'] = budget_remaining / avg_cost_per_hour
            readiness['can_handle_session'] = readiness['estimated_hours'] >= 4
            readiness['ready_for_fallback'] = readiness['can_handle_session']
        
        return readiness
    
    def _determine_recommended_action(self, status_check: Dict[str, Any]) -> str:
        """Determine recommended action based on status"""
        
        if status_check['severity'] == 'emergency':
            return 'immediate_fallback'
        elif status_check['severity'] == 'critical' and status_check['chatgpt_readiness']['ready_for_fallback']:
            return 'initiate_fallback'
        elif status_check['severity'] == 'warning':
            return 'prepare_fallback'
        else:
            return 'continue_claude'
    
    def initiate_fallback(self, reason: str = "Automatic trigger") -> Dict[str, Any]:
        """Initiate fallback to ChatGPT"""
        
        if not self.chatgpt_manager.openai_api_key:
            return {
                'success': False,
                'error': 'ChatGPT not configured - cannot initiate fallback',
                'recommendation': 'Take a break until Claude resets or configure OpenAI API key'
            }
        
        # Update fallback state
        self.fallback_state.update({
            'active': True,
            'triggered_at': datetime.now().isoformat(),
            'trigger_reason': reason,
            'tasks_completed_on_chatgpt': 0,
            'claude_tokens_saved': 0,
            'fallback_cost_usd': 0.0
        })
        
        self._save_fallback_state()
        
        # Generate fallback strategy
        strategy = self._generate_fallback_strategy()
        
        return {
            'success': True,
            'fallback_active': True,
            'triggered_reason': reason,
            'strategy': strategy,
            'estimated_duration_hours': strategy['estimated_duration'],
            'chatgpt_budget_available': strategy['budget_analysis']['available_usd'],
            'next_steps': strategy['immediate_actions']
        }
    
    def _generate_fallback_strategy(self) -> Dict[str, Any]:
        """Generate comprehensive fallback strategy"""
        
        openai_status = self.chatgpt_manager.get_usage_summary()
        claude_status = self.check_claude_status()
        
        strategy = {
            'timestamp': datetime.now().isoformat(),
            'strategy_type': 'chatgpt_primary',
            'estimated_duration': 0.0,
            'budget_analysis': {
                'available_usd': openai_status.get('budget_status', {}).get('daily_remaining_usd', 0),
                'emergency_budget_usd': self.fallback_config['emergency_budget_usd'],
                'estimated_hourly_cost': 0.50
            },
            'task_routing': {
                'chatgpt_handles': [
                    'Code generation and modification',
                    'Documentation writing',
                    'Text processing and analysis',
                    'Problem solving and debugging',
                    'Research and summarization'
                ],
                'claude_reserved_for': [
                    'File read/write operations (if capacity allows)',
                    'Critical debugging (emergency only)',
                    'Final review and testing'
                ]
            },
            'immediate_actions': [],
            'hourly_monitoring': {
                'check_claude_recovery': True,
                'monitor_openai_budget': True,
                'track_task_completion': True
            }
        }
        
        # Calculate estimated duration
        available_budget = strategy['budget_analysis']['available_usd']
        hourly_cost = strategy['budget_analysis']['estimated_hourly_cost']
        
        if available_budget > 0:
            strategy['estimated_duration'] = min(
                available_budget / hourly_cost, 
                self.fallback_config['fallback_session_duration']
            )
        
        # Generate immediate actions
        if claude_status['claude_metrics']['hours_to_reset'] < 6:
            strategy['immediate_actions'].append(
                f"Claude resets in {claude_status['claude_metrics']['hours_to_reset']:.1f}h - plan fallback accordingly"
            )
        
        strategy['immediate_actions'].extend([
            "Switch all new tasks to ChatGPT",
            "Preserve remaining Claude capacity for file operations only",
            f"Monitor OpenAI budget (${available_budget:.2f} available)",
            "Use GPT-4o-mini for cost efficiency on simple tasks"
        ])
        
        return strategy
    
    async def process_task_with_fallback(self, task_description: str, context: Optional[str] = None) -> Dict[str, Any]:
        """Process a task using the appropriate platform based on fallback status"""
        
        status_check = self.check_claude_status()
        
        # If fallback is needed and not active, initiate it
        if status_check['fallback_needed'] and not self.fallback_state['active']:
            fallback_result = self.initiate_fallback("Automatic - limit reached")
            if not fallback_result['success']:
                return {'error': fallback_result['error'], 'recommendation': fallback_result['recommendation']}
        
        # Route task based on current status
        if self.fallback_state['active'] or status_check['recommended_action'] in ['immediate_fallback', 'initiate_fallback']:
            return await self._process_with_chatgpt(task_description, context)
        else:
            return await self._process_with_claude(task_description, context)
    
    async def _process_with_chatgpt(self, task_description: str, context: Optional[str] = None) -> Dict[str, Any]:
        """Process task with ChatGPT and track fallback metrics"""
        
        result = await self.chatgpt_manager.offload_task(task_description, context)
        
        if result.get('success'):
            # Update fallback tracking
            self.fallback_state['tasks_completed_on_chatgpt'] += 1
            self.fallback_state['fallback_cost_usd'] += result.get('cost_usd', 0)
            self.fallback_state['claude_tokens_saved'] += result.get('tokens_used', 0) * 1.2  # Estimate
            
            self._save_fallback_state()
            
            result['platform_used'] = 'chatgpt'
            result['fallback_active'] = True
            result['fallback_stats'] = {
                'tasks_completed': self.fallback_state['tasks_completed_on_chatgpt'],
                'total_cost_usd': self.fallback_state['fallback_cost_usd'],
                'claude_tokens_saved': self.fallback_state['claude_tokens_saved']
            }
        
        return result
    
    async def _process_with_claude(self, task_description: str, context: Optional[str] = None) -> Dict[str, Any]:
        """Process task with Claude (normal operation)"""
        
        # This would integrate with Claude Code's normal operation
        # For now, return a placeholder indicating Claude should handle it
        return {
            'success': True,
            'platform_used': 'claude',
            'fallback_active': False,
            'message': 'Task should be processed by Claude Code normally',
            'task_description': task_description
        }
    
    def get_fallback_dashboard(self) -> str:
        """Generate comprehensive fallback status dashboard"""
        
        status_check = self.check_claude_status()
        
        # Status indicators
        claude_indicator = "🔴" if not status_check['claude_available'] else \
                          "🟡" if status_check['severity'] in ['warning', 'critical'] else "🟢"
        
        chatgpt_indicator = "🟢" if status_check['chatgpt_readiness']['ready_for_fallback'] else \
                           "🟡" if status_check['chatgpt_readiness']['available'] else "🔴"
        
        fallback_indicator = "🔄" if self.fallback_state['active'] else "⭕"
        
        dashboard = f"""
╭─────────────────────────────────────────────────────────╮
│           {fallback_indicator} CLAUDE FALLBACK MANAGER                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  {claude_indicator} CLAUDE STATUS                                       │
│     Usage: {status_check['claude_metrics']['daily_usage_percent']:>6.1f}% | Reset in: {status_check['claude_metrics']['hours_to_reset']:>5.1f}h      │
│     Session Cost: €{status_check['claude_metrics']['session_cost_eur']:>8.4f}                     │
│     Tier: {status_check['claude_metrics']['subscription_tier']:<15} Available: {'Yes' if status_check['claude_available'] else 'No':<3}    │
│                                                         │
│  {chatgpt_indicator} CHATGPT READINESS                                  │
│     API Status: {'✅ Ready' if status_check['chatgpt_readiness']['available'] else '❌ Not Available':<12}                  │
│     Budget: ${status_check['chatgpt_readiness']['budget_remaining_usd']:>8.2f} | Hours: {status_check['chatgpt_readiness']['estimated_hours']:>5.1f}h      │
│     Fallback Ready: {'Yes' if status_check['chatgpt_readiness']['ready_for_fallback'] else 'No':<3}                          │
│                                                         │
│  🎯 CURRENT STATUS                                      │
│     Fallback Active: {'✅ Yes' if self.fallback_state['active'] else '❌ No':<3}                       │
│     Severity: {status_check['severity'].upper():<15}                  │
│     Action: {status_check['recommended_action'].replace('_', ' ').title():<15}            │
│                                                         │
"""
        
        # Show triggers if any
        if status_check['trigger_reasons']:
            dashboard += "│  ⚠️  ACTIVE TRIGGERS                                    │\n"
            for trigger in status_check['trigger_reasons'][:2]:
                trigger_short = trigger[:47] + '...' if len(trigger) > 47 else trigger
                dashboard += f"│     • {trigger_short:<47}    │\n"
            dashboard += "│                                                         │\n"
        
        # Show fallback statistics if active
        if self.fallback_state['active']:
            dashboard += "│  📊 FALLBACK STATISTICS                                │\n"
            dashboard += f"│     Tasks on ChatGPT: {self.fallback_state['tasks_completed_on_chatgpt']:>6}                      │\n"
            dashboard += f"│     Fallback Cost: ${self.fallback_state['fallback_cost_usd']:>8.4f}                     │\n"
            dashboard += f"│     Claude Tokens Saved: {self.fallback_state['claude_tokens_saved']:>6.0f}                │\n"
            
            triggered_time = datetime.fromisoformat(self.fallback_state['triggered_at'])
            duration = datetime.now() - triggered_time
            dashboard += f"│     Fallback Duration: {duration.total_seconds()/3600:>6.1f}h                  │\n"
            dashboard += "│                                                         │\n"
        
        # Show next actions
        dashboard += "│  💡 RECOMMENDED ACTIONS                                │\n"
        
        if status_check['recommended_action'] == 'immediate_fallback':
            dashboard += "│     🔴 Switch to ChatGPT immediately                    │\n"
            dashboard += "│     🔴 Preserve Claude for emergency file operations    │\n"
        elif status_check['recommended_action'] == 'initiate_fallback':
            dashboard += "│     🟡 Prepare to switch to ChatGPT                     │\n"
            dashboard += "│     🟡 Complete current Claude task first               │\n"
        elif status_check['recommended_action'] == 'prepare_fallback':
            dashboard += "│     🟢 Continue with Claude, monitor usage              │\n"
            dashboard += "│     🟢 Start offloading simple tasks to ChatGPT        │\n"
        else:
            dashboard += "│     ✅ Continue normal Claude operation                  │\n"
            dashboard += "│     ✅ ChatGPT available as backup                      │\n"
        
        dashboard += "│                                                         │\n"
        dashboard += "╰─────────────────────────────────────────────────────────╯"
        
        return dashboard
    
    def reset_fallback(self) -> Dict[str, Any]:
        """Reset fallback state (when Claude limits reset)"""
        
        old_state = self.fallback_state.copy()
        
        self.fallback_state = {
            'active': False,
            'triggered_at': None,
            'trigger_reason': None,
            'tasks_completed_on_chatgpt': 0,
            'claude_tokens_saved': 0,
            'fallback_cost_usd': 0.0
        }
        
        self._save_fallback_state()
        
        return {
            'success': True,
            'message': 'Fallback state reset - back to normal Claude operation',
            'previous_session': {
                'tasks_completed': old_state.get('tasks_completed_on_chatgpt', 0),
                'cost_usd': old_state.get('fallback_cost_usd', 0),
                'tokens_saved': old_state.get('claude_tokens_saved', 0)
            }
        }

def main():
    """Main CLI interface"""
    if len(sys.argv) < 2:
        print("Usage: python3 claude_fallback_manager.py [status|check|initiate|reset|dashboard|test]")
        return
    
    command = sys.argv[1]
    manager = ClaudeFallbackManager()
    
    if command == "status":
        status = manager.check_claude_status()
        print(json.dumps(status, indent=2))
        
    elif command == "check":
        status = manager.check_claude_status()
        print("🔍 CLAUDE STATUS CHECK")
        print("=" * 50)
        print(f"Claude Available: {'✅' if status['claude_available'] else '❌'}")
        print(f"Fallback Needed: {'🔄 Yes' if status['fallback_needed'] else '⭕ No'}")
        print(f"Severity: {status['severity'].upper()}")
        print(f"Recommended Action: {status['recommended_action'].replace('_', ' ').title()}")
        
        if status['trigger_reasons']:
            print("\nTriggers:")
            for trigger in status['trigger_reasons']:
                print(f"  • {trigger}")
                
    elif command == "initiate":
        reason = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else "Manual initiation"
        result = manager.initiate_fallback(reason)
        print(json.dumps(result, indent=2))
        
    elif command == "reset":
        result = manager.reset_fallback()
        print(json.dumps(result, indent=2))
        
    elif command == "dashboard":
        print(manager.get_fallback_dashboard())
        
    elif command == "test":
        task = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else "write a hello world function"
        print(f"🧪 Testing fallback with task: {task}")
        result = asyncio.run(manager.process_task_with_fallback(task))
        print(json.dumps(result, indent=2))
        
    else:
        print("Commands: status, check, initiate, reset, dashboard, test")

if __name__ == "__main__":
    main()