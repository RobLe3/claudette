#!/usr/bin/env python3
"""
Extended Session Test - Test cost tracking accuracy for long Claude Code sessions
"""

import asyncio
import json
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any
import sys

# Add to path for imports
sys.path.append(str(Path(__file__).parent))
from unified_cost_tracker import UnifiedCostTracker
from session_optimizer import SessionOptimizer
from chatgpt_offloading_manager import ChatGPTOffloadingManager

class ExtendedSessionTester:
    """Test extended session capabilities and cost tracking"""
    
    def __init__(self):
        self.cost_tracker = UnifiedCostTracker()
        self.optimizer = SessionOptimizer()
        self.chatgpt_manager = ChatGPTOffloadingManager()
        
    async def simulate_extended_session(self, duration_minutes: int = 60) -> Dict[str, Any]:
        """Simulate an extended session with mixed Claude/OpenAI usage"""
        
        session_start = datetime.now()
        session_id = self.cost_tracker.start_session_tracking()
        
        print(f"🚀 Starting {duration_minutes}-minute extended session simulation...")
        print(f"📊 Session ID: {session_id}")
        
        # Track initial state
        initial_status = self.cost_tracker.get_unified_status()
        
        simulation_results = {
            'session_id': session_id,
            'duration_minutes': duration_minutes,
            'start_time': session_start.isoformat(),
            'initial_state': initial_status,
            'activities': [],
            'cost_progression': [],
            'final_state': None,
            'summary': {}
        }
        
        # Simulate activities over time
        activities_per_minute = 2  # 2 activities per minute
        total_activities = duration_minutes * activities_per_minute
        
        for i in range(total_activities):
            minute = i // activities_per_minute
            activity_time = session_start + timedelta(minutes=minute)
            
            # Simulate different types of activities
            activity = await self._simulate_activity(i, total_activities)
            activity['timestamp'] = activity_time.isoformat()
            simulation_results['activities'].append(activity)
            
            # Track cost progression every 10 activities
            if i % 10 == 0:
                current_status = self.cost_tracker.get_unified_status()
                progression_point = {
                    'minute': minute,
                    'activity_index': i,
                    'claude_usage_percent': current_status['platforms']['claude']['daily_usage_percent'],
                    'openai_cost_usd': current_status['platforms']['openai']['daily_cost_usd'],
                    'total_cost_eur': current_status['unified_metrics']['total_cost_eur'],
                    'efficiency': current_status['unified_metrics']['session_efficiency']
                }
                simulation_results['cost_progression'].append(progression_point)
                
                # Print progress
                if i % 20 == 0:
                    print(f"⏱️  Minute {minute}: Claude {progression_point['claude_usage_percent']:.1f}% | OpenAI ${progression_point['openai_cost_usd']:.4f} | Total €{progression_point['total_cost_eur']:.4f}")
            
            # Small delay to simulate real time
            await asyncio.sleep(0.1)
        
        # Get final state
        simulation_results['final_state'] = self.cost_tracker.get_unified_status()
        
        # Calculate summary
        simulation_results['summary'] = self._calculate_session_summary(simulation_results)
        
        # End session tracking
        self.cost_tracker.end_session_tracking(session_id)
        
        print(f"✅ Extended session simulation complete!")
        
        return simulation_results
    
    async def _simulate_activity(self, activity_index: int, total_activities: int) -> Dict[str, Any]:
        """Simulate a single activity"""
        
        # Different activity patterns based on session progress
        progress = activity_index / total_activities
        
        if progress < 0.3:  # Early session - more Claude usage
            activity_types = ['complex_analysis', 'file_editing', 'code_review', 'simple_generation']
            weights = [0.4, 0.3, 0.2, 0.1]
        elif progress < 0.7:  # Mid session - balanced
            activity_types = ['complex_analysis', 'file_editing', 'simple_generation', 'documentation']
            weights = [0.3, 0.2, 0.3, 0.2]
        else:  # Late session - more OpenAI to preserve Claude
            activity_types = ['simple_generation', 'documentation', 'complex_analysis', 'file_editing']
            weights = [0.4, 0.3, 0.2, 0.1]
        
        import random
        activity_type = random.choices(activity_types, weights=weights)[0]
        
        activity = {
            'type': activity_type,
            'estimated_claude_tokens': 0,
            'estimated_openai_tokens': 0,
            'estimated_cost_eur': 0.0,
            'platform_used': 'claude'  # default
        }
        
        # Simulate activity based on type
        if activity_type == 'complex_analysis':
            activity.update({
                'description': 'Complex code analysis and architecture review',
                'estimated_claude_tokens': random.randint(800, 1500),
                'estimated_cost_eur': random.uniform(0.012, 0.0225),
                'platform_used': 'claude'
            })
        elif activity_type == 'file_editing':
            activity.update({
                'description': 'Multi-file editing and refactoring',
                'estimated_claude_tokens': random.randint(500, 1000),
                'estimated_cost_eur': random.uniform(0.0075, 0.015),
                'platform_used': 'claude'
            })
        elif activity_type == 'simple_generation':
            # Could go to either platform
            if progress > 0.4:  # Later in session, prefer OpenAI
                activity.update({
                    'description': 'Simple code generation via OpenAI',
                    'estimated_openai_tokens': random.randint(100, 300),
                    'estimated_cost_eur': random.uniform(0.0001, 0.0003),
                    'platform_used': 'openai'
                })
                # Actually call OpenAI for realism
                try:
                    result = await self.chatgpt_manager.offload_task("write a simple hello function")
                    if result.get('success'):
                        activity['actual_openai_tokens'] = result.get('tokens_used', 0)
                        activity['actual_cost_usd'] = result.get('cost_usd', 0)
                except:
                    pass
            else:
                activity.update({
                    'description': 'Simple code generation via Claude',
                    'estimated_claude_tokens': random.randint(200, 500),
                    'estimated_cost_eur': random.uniform(0.003, 0.0075),
                    'platform_used': 'claude'
                })
        elif activity_type == 'documentation':
            # Prefer OpenAI for documentation
            activity.update({
                'description': 'Documentation generation via OpenAI',
                'estimated_openai_tokens': random.randint(200, 600),
                'estimated_cost_eur': random.uniform(0.0002, 0.0006),
                'platform_used': 'openai'
            })
            # Actually call OpenAI
            try:
                result = await self.chatgpt_manager.offload_task("generate documentation for a calculator function")
                if result.get('success'):
                    activity['actual_openai_tokens'] = result.get('tokens_used', 0)
                    activity['actual_cost_usd'] = result.get('cost_usd', 0)
            except:
                pass
        
        return activity
    
    def _calculate_session_summary(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate comprehensive session summary"""
        
        initial = results['initial_state']
        final = results['final_state']
        
        # Calculate changes
        claude_usage_change = final['platforms']['claude']['daily_usage_percent'] - initial['platforms']['claude']['daily_usage_percent']
        openai_cost_change = final['platforms']['openai']['daily_cost_usd'] - initial['platforms']['openai']['daily_cost_usd']
        total_cost_change = final['unified_metrics']['total_cost_eur'] - initial['unified_metrics']['total_cost_eur']
        
        # Analyze activities
        claude_activities = [a for a in results['activities'] if a['platform_used'] == 'claude']
        openai_activities = [a for a in results['activities'] if a['platform_used'] == 'openai']
        
        summary = {
            'duration_minutes': results['duration_minutes'],
            'total_activities': len(results['activities']),
            'platform_distribution': {
                'claude_activities': len(claude_activities),
                'openai_activities': len(openai_activities),
                'claude_percentage': len(claude_activities) / len(results['activities']) * 100,
                'openai_percentage': len(openai_activities) / len(results['activities']) * 100
            },
            'cost_changes': {
                'claude_usage_increase_percent': claude_usage_change,
                'openai_cost_increase_usd': openai_cost_change,
                'total_cost_increase_eur': total_cost_change
            },
            'efficiency_metrics': {
                'initial_efficiency': initial['unified_metrics']['session_efficiency'],
                'final_efficiency': final['unified_metrics']['session_efficiency'],
                'efficiency_maintained': final['unified_metrics']['session_efficiency'] > 0.8
            },
            'session_feasibility': {
                'can_continue_4h': final['platforms']['claude']['daily_usage_percent'] < 60,
                'can_continue_8h': final['platforms']['claude']['daily_usage_percent'] < 40,
                'openai_budget_sufficient': final['platforms']['openai']['budget_remaining_usd'] > 5,
                'overall_sustainable': final['unified_metrics']['session_efficiency'] > 0.75
            },
            'cost_per_minute_eur': total_cost_change / results['duration_minutes'] if results['duration_minutes'] > 0 else 0,
            'projected_8h_cost_eur': (total_cost_change / results['duration_minutes']) * 480 if results['duration_minutes'] > 0 else 0  # 8 hours = 480 minutes
        }
        
        return summary
    
    def generate_session_report(self, results: Dict[str, Any]) -> str:
        """Generate comprehensive session test report"""
        
        summary = results['summary']
        
        report = f"""
╭─────────────────────────────────────────────────────────╮
│            📊 EXTENDED SESSION TEST REPORT               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ⏱️  SESSION DETAILS                                    │
│     Duration: {summary['duration_minutes']:>3} minutes | Activities: {summary['total_activities']:>3}           │
│     Platform Distribution: Claude {summary['platform_distribution']['claude_percentage']:>4.1f}% | OpenAI {summary['platform_distribution']['openai_percentage']:>4.1f}%  │
│                                                         │
│  💰 COST ANALYSIS                                       │
│     Claude Usage Increase: {summary['cost_changes']['claude_usage_increase_percent']:>6.1f}%             │
│     OpenAI Cost Increase: ${summary['cost_changes']['openai_cost_increase_usd']:>8.4f}             │
│     Total Cost Increase: €{summary['cost_changes']['total_cost_increase_eur']:>8.4f}              │
│     Cost per Minute: €{summary['cost_per_minute_eur']:>10.6f}                │
│                                                         │
│  🎯 EFFICIENCY METRICS                                  │
│     Initial Efficiency: {summary['efficiency_metrics']['initial_efficiency']:>6.1%}                │
│     Final Efficiency: {summary['efficiency_metrics']['final_efficiency']:>8.1%}                │
│     Efficiency Maintained: {'✅ Yes' if summary['efficiency_metrics']['efficiency_maintained'] else '❌ No':>9}              │
│                                                         │
│  🚀 SESSION FEASIBILITY                                 │
│     Can Continue 4h: {'✅ Yes' if summary['session_feasibility']['can_continue_4h'] else '❌ No':>12}                │
│     Can Continue 8h: {'✅ Yes' if summary['session_feasibility']['can_continue_8h'] else '❌ No':>12}                │
│     OpenAI Budget OK: {'✅ Yes' if summary['session_feasibility']['openai_budget_sufficient'] else '❌ No':>11}                │
│     Overall Sustainable: {'✅ Yes' if summary['session_feasibility']['overall_sustainable'] else '❌ No':>9}              │
│                                                         │
│  📈 PROJECTIONS                                         │
│     Projected 8h Cost: €{summary['projected_8h_cost_eur']:>8.4f}                │
│     Daily Budget Target: €2.0000 {'✅ Within' if summary['projected_8h_cost_eur'] < 2.0 else '❌ Over':>7}              │
│                                                         │
╰─────────────────────────────────────────────────────────╯
"""
        
        return report.strip()

async def main():
    """Main test interface"""
    tester = ExtendedSessionTester()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "quick":
            # 10-minute quick test
            results = await tester.simulate_extended_session(10)
            print(tester.generate_session_report(results))
            
        elif command == "medium":
            # 30-minute medium test
            results = await tester.simulate_extended_session(30)
            print(tester.generate_session_report(results))
            
        elif command == "long":
            # 60-minute extended test
            results = await tester.simulate_extended_session(60)
            print(tester.generate_session_report(results))
            print("\n📊 Detailed Results:")
            print(json.dumps(results['summary'], indent=2))
            
        elif command == "stress":
            # Multiple session test
            print("🧪 Running stress test with multiple sessions...")
            for i in range(3):
                print(f"\n--- Session {i+1}/3 ---")
                results = await tester.simulate_extended_session(20)
                print(tester.generate_session_report(results))
                await asyncio.sleep(2)  # Brief pause between sessions
                
        else:
            print("Commands: quick (10m), medium (30m), long (60m), stress (3x20m)")
    else:
        # Default: quick test
        print("🧪 Running quick extended session test (10 minutes)...")
        results = await tester.simulate_extended_session(10)
        print(tester.generate_session_report(results))

if __name__ == "__main__":
    asyncio.run(main())