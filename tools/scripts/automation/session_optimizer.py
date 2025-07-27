#!/usr/bin/env python3
"""
Session Optimizer - Optimize Claude Code sessions for minimal costs and maximum duration
"""

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional

# Add to path for imports
sys.path.append(str(Path(__file__).parent))
from unified_cost_tracker import UnifiedCostTracker
from chatgpt_offloading_manager import ChatGPTOffloadingManager
from claude_integration_coordinator import ClaudeIntegrationCoordinator

class SessionOptimizer:
    """Optimize Claude Code sessions for extended usage with minimal costs"""
    
    def __init__(self):
        self.cost_tracker = UnifiedCostTracker()
        self.chatgpt_manager = ChatGPTOffloadingManager()
        self.claude_coordinator = ClaudeIntegrationCoordinator()
        
        # Session optimization targets
        self.targets = {
            'max_daily_cost_eur': 2.0,  # €2 daily target
            'claude_usage_threshold': 80,  # Start offloading at 80%
            'openai_daily_budget_usd': 5.0,  # $5 OpenAI daily budget
            'session_duration_hours': 8,  # Target 8-hour sessions
            'efficiency_target': 0.85  # 85% efficiency target
        }
        
    def analyze_session_potential(self) -> Dict[str, Any]:
        """Analyze potential for extended sessions"""
        
        status = self.cost_tracker.get_unified_status()
        
        analysis = {
            'timestamp': datetime.now().isoformat(),
            'current_state': {
                'claude_capacity_remaining': status['unified_metrics']['claude_capacity_remaining'],
                'openai_budget_remaining': status['platforms']['openai']['budget_remaining_usd'],
                'session_efficiency': status['unified_metrics']['session_efficiency'],
                'total_cost_today_eur': status['unified_metrics']['total_cost_eur']
            },
            'session_potential': {},
            'optimization_strategy': {},
            'cost_projections': {}
        }
        
        # Calculate session potential
        claude_hours_remaining = self._calculate_claude_hours_remaining(status)
        openai_budget_hours = self._calculate_openai_budget_hours(status)
        
        analysis['session_potential'] = {
            'claude_hours_remaining': claude_hours_remaining,
            'openai_budget_hours': openai_budget_hours,
            'combined_potential_hours': min(claude_hours_remaining + openai_budget_hours, 12),
            'can_achieve_8h_session': claude_hours_remaining + openai_budget_hours >= 8,
            'bottleneck': 'claude' if claude_hours_remaining < openai_budget_hours else 'openai'
        }
        
        # Generate optimization strategy
        analysis['optimization_strategy'] = self._generate_optimization_strategy(status, analysis['session_potential'])
        
        # Project costs for different session lengths
        analysis['cost_projections'] = self._project_session_costs(status)
        
        return analysis
    
    def _calculate_claude_hours_remaining(self, status: Dict[str, Any]) -> float:
        """Calculate hours of Claude usage remaining based on current rate"""
        
        claude_usage_percent = status['platforms']['claude']['daily_usage_percent']
        claude_capacity_remaining = 100 - claude_usage_percent
        
        # If no usage yet, estimate conservatively
        if claude_usage_percent == 0:
            return 6.0  # Conservative estimate
            
        # Calculate based on current usage rate
        current_hour = datetime.now().hour
        if current_hour == 0:
            current_hour = 1
            
        usage_rate_per_hour = claude_usage_percent / current_hour
        hours_to_80_percent = (80 - claude_usage_percent) / usage_rate_per_hour if usage_rate_per_hour > 0 else 8
        
        return max(0, min(hours_to_80_percent, 8))
    
    def _calculate_openai_budget_hours(self, status: Dict[str, Any]) -> float:
        """Calculate hours of OpenAI budget remaining"""
        
        budget_remaining = status['platforms']['openai']['budget_remaining_usd']
        daily_cost = status['platforms']['openai']['daily_cost_usd']
        
        if daily_cost == 0:
            return 8.0  # Full day if no usage yet
            
        current_hour = datetime.now().hour
        if current_hour == 0:
            current_hour = 1
            
        hourly_rate = daily_cost / current_hour
        hours_remaining = budget_remaining / hourly_rate if hourly_rate > 0 else 8
        
        return max(0, min(hours_remaining, 12))
    
    def _generate_optimization_strategy(self, status: Dict[str, Any], potential: Dict[str, Any]) -> Dict[str, Any]:
        """Generate strategy to optimize session duration"""
        
        strategy = {
            'primary_approach': '',
            'specific_actions': [],
            'task_distribution': {},
            'monitoring_points': []
        }
        
        claude_capacity = status['unified_metrics']['claude_capacity_remaining']
        
        if claude_capacity > 60:
            strategy['primary_approach'] = 'claude_focused'
            strategy['specific_actions'] = [
                'Use Claude for complex tasks, file operations, and analysis',
                'Reserve OpenAI for simple code generation and documentation',
                'Monitor Claude usage and increase offloading at 70%'
            ]
            strategy['task_distribution'] = {
                'claude': 80,
                'openai': 20
            }
        elif claude_capacity > 30:
            strategy['primary_approach'] = 'balanced'
            strategy['specific_actions'] = [
                'Balance tasks between Claude and OpenAI',
                'Offload documentation, simple functions to OpenAI',
                'Keep complex analysis and file operations with Claude'
            ]
            strategy['task_distribution'] = {
                'claude': 60,
                'openai': 40
            }
        else:
            strategy['primary_approach'] = 'openai_heavy'
            strategy['specific_actions'] = [
                'Primarily use OpenAI for new tasks',
                'Only use Claude for file operations and complex debugging',
                'Consider taking a break to reset Claude limits'
            ]
            strategy['task_distribution'] = {
                'claude': 30,
                'openai': 70
            }
        
        strategy['monitoring_points'] = [
            f"Check Claude usage every hour (currently {status['platforms']['claude']['daily_usage_percent']:.1f}%)",
            f"Monitor OpenAI budget (${status['platforms']['openai']['budget_remaining_usd']:.2f} remaining)",
            "Reassess strategy if efficiency drops below 80%"
        ]
        
        return strategy
    
    def _project_session_costs(self, status: Dict[str, Any]) -> Dict[str, Any]:
        """Project costs for different session durations"""
        
        projections = {}
        
        current_cost_eur = status['unified_metrics']['total_cost_eur']
        claude_hourly_rate = status['platforms']['claude']['session_cost_eur'] / max(datetime.now().hour, 1)
        openai_hourly_rate = status['platforms']['openai']['daily_cost_usd'] / max(datetime.now().hour, 1) * 0.92
        
        for hours in [2, 4, 6, 8, 10, 12]:
            claude_cost = claude_hourly_rate * hours
            openai_cost = openai_hourly_rate * hours
            total_cost = current_cost_eur + claude_cost + openai_cost
            
            projections[f'{hours}h'] = {
                'total_cost_eur': total_cost,
                'claude_cost_eur': claude_cost,
                'openai_cost_eur': openai_cost,
                'feasible': total_cost <= self.targets['max_daily_cost_eur']
            }
        
        return projections
    
    def get_real_time_recommendations(self) -> List[str]:
        """Get real-time recommendations for current session"""
        
        status = self.cost_tracker.get_unified_status()
        recommendations = []
        
        claude_usage = status['platforms']['claude']['daily_usage_percent']
        openai_cost = status['platforms']['openai']['daily_cost_usd']
        efficiency = status['unified_metrics']['session_efficiency']
        
        # Claude usage recommendations
        if claude_usage > 80:
            recommendations.append("🔴 URGENT: Claude usage high - offload simple tasks to OpenAI immediately")
        elif claude_usage > 60:
            recommendations.append("🟡 WARNING: Claude usage moderate - start offloading documentation/simple coding to OpenAI")
        elif claude_usage < 30:
            recommendations.append("🟢 OPTIMAL: Claude capacity available - can handle complex tasks")
        
        # OpenAI budget recommendations
        if openai_cost > 3:
            recommendations.append(f"🟡 OpenAI costs at ${openai_cost:.2f} - consider reducing offloading")
        elif openai_cost < 1:
            recommendations.append("🟢 OpenAI budget available - can offload more simple tasks")
        
        # Efficiency recommendations
        if efficiency < 0.7:
            recommendations.append("⚠️ Session efficiency low - review task distribution strategy")
        
        # Session extension recommendations
        hours_potential = self._calculate_claude_hours_remaining(status) + self._calculate_openai_budget_hours(status)
        if hours_potential > 6:
            recommendations.append(f"✅ Can extend session {hours_potential:.1f} more hours with current strategy")
        elif hours_potential > 3:
            recommendations.append(f"⚠️ Limited extension potential ({hours_potential:.1f}h) - optimize task distribution")
        else:
            recommendations.append("🔴 Limited session extension - consider break or strategy change")
        
        return recommendations
    
    def optimize_for_long_session(self) -> Dict[str, Any]:
        """Generate comprehensive optimization plan for long sessions"""
        
        analysis = self.analyze_session_potential()
        recommendations = self.get_real_time_recommendations()
        
        optimization_plan = {
            'timestamp': datetime.now().isoformat(),
            'session_analysis': analysis,
            'immediate_recommendations': recommendations,
            'hour_by_hour_plan': self._generate_hourly_plan(analysis),
            'emergency_strategies': self._generate_emergency_strategies(),
            'success_metrics': {
                'target_duration_hours': 8,
                'max_cost_eur': 2.0,
                'min_efficiency': 0.80,
                'claude_usage_limit': 85
            }
        }
        
        return optimization_plan
    
    def _generate_hourly_plan(self, analysis: Dict[str, Any]) -> List[Dict[str, str]]:
        """Generate hour-by-hour optimization plan"""
        
        current_hour = datetime.now().hour
        plan = []
        
        for i in range(8):  # 8-hour plan
            hour = (current_hour + i + 1) % 24
            
            if i < 3:  # First 3 hours
                plan.append({
                    'hour': f'{hour:02d}:00',
                    'focus': 'Use Claude for complex tasks',
                    'openai_usage': 'Minimal - only for documentation',
                    'monitoring': 'Track Claude usage every 30 min'
                })
            elif i < 6:  # Middle hours
                plan.append({
                    'hour': f'{hour:02d}:00',
                    'focus': 'Balanced approach',
                    'openai_usage': 'Increase for simple code generation',
                    'monitoring': 'Check both platforms hourly'
                })
            else:  # Final hours
                plan.append({
                    'hour': f'{hour:02d}:00',
                    'focus': 'OpenAI-heavy strategy',
                    'openai_usage': 'Primary for most tasks',
                    'monitoring': 'Preserve Claude for emergencies'
                })
        
        return plan
    
    def _generate_emergency_strategies(self) -> List[Dict[str, str]]:
        """Generate emergency strategies for when limits are approached"""
        
        return [
            {
                'trigger': 'Claude usage > 90%',
                'action': 'Switch entirely to OpenAI for remaining session',
                'fallback': 'Take 30-minute break, use minimal Claude for critical files only'
            },
            {
                'trigger': 'OpenAI cost > $8',
                'action': 'Stop OpenAI usage, work with Claude only',
                'fallback': 'Manual coding without AI assistance for simple tasks'
            },
            {
                'trigger': 'Both platforms near limits',
                'action': 'Save work, take break until Claude resets at 2am',
                'fallback': 'Continue with local tools and documentation'
            }
        ]

def main():
    """Main CLI interface"""
    optimizer = SessionOptimizer()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "analyze":
            analysis = optimizer.analyze_session_potential()
            print(json.dumps(analysis, indent=2))
            
        elif command == "recommendations":
            recs = optimizer.get_real_time_recommendations()
            print("🎯 REAL-TIME SESSION RECOMMENDATIONS")
            print("=" * 50)
            for rec in recs:
                print(f"  {rec}")
                
        elif command == "optimize":
            plan = optimizer.optimize_for_long_session()
            print("🚀 LONG SESSION OPTIMIZATION PLAN")
            print("=" * 50)
            
            print("\n📊 SESSION ANALYSIS:")
            potential = plan['session_analysis']['session_potential']
            print(f"  Claude hours remaining: {potential['claude_hours_remaining']:.1f}h")
            print(f"  OpenAI budget hours: {potential['openai_budget_hours']:.1f}h")
            print(f"  Can achieve 8h session: {'✅ Yes' if potential['can_achieve_8h_session'] else '❌ No'}")
            
            print("\n💡 IMMEDIATE ACTIONS:")
            for rec in plan['immediate_recommendations'][:3]:
                print(f"  • {rec}")
                
            print("\n📅 STRATEGY:")
            strategy = plan['session_analysis']['optimization_strategy']
            print(f"  Approach: {strategy['primary_approach']}")
            print(f"  Task distribution: Claude {strategy['task_distribution']['claude']}% | OpenAI {strategy['task_distribution']['openai']}%")
            
        elif command == "dashboard":
            # Show unified cost dashboard
            from unified_cost_tracker import UnifiedCostTracker
            tracker = UnifiedCostTracker()
            print(tracker.generate_unified_dashboard())
            
            # Add optimizer recommendations
            recs = optimizer.get_real_time_recommendations()
            print("\n🎯 SESSION OPTIMIZATION:")
            for rec in recs[:2]:
                print(f"  {rec}")
                
        else:
            print("Commands: analyze, recommendations, optimize, dashboard")
    else:
        print("🚀 Session Optimizer - Extend Claude Code sessions with minimal costs")
        print("Commands:")
        print("  analyze - Analyze session extension potential")
        print("  recommendations - Get real-time recommendations")
        print("  optimize - Generate comprehensive optimization plan")
        print("  dashboard - Show unified cost dashboard with optimization tips")

if __name__ == "__main__":
    main()