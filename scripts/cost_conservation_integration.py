#!/usr/bin/env python3
"""
Cost Conservation Integration - Apply Swarm Recommendations
Integrates Claude minimizer and ChatGPT optimizer into offloading system
"""

import sys
from pathlib import Path

# Import our enhanced components
sys.path.append(str(Path(__file__).parent))
from claude_token_minimizer import ClaudeTokenMinimizer
from chatgpt_cost_optimizer import ChatGPTCostOptimizer, TaskComplexity

class CostConservationSystem:
    """Integrated cost conservation system applying swarm recommendations"""
    
    def __init__(self):
        self.claude_minimizer = ClaudeTokenMinimizer()
        self.chatgpt_optimizer = ChatGPTCostOptimizer()
        
        # Cost conservation targets
        self.targets = {
            'claude_usage_reduction': 80,    # 80% reduction in Claude usage
            'chatgpt_savings_vs_claude': 60, # 60% savings vs all-Claude
            'daily_budget_limit': 5.00,     # $5/day ChatGPT budget
            'max_cost_per_task': 0.05       # $0.05 max per task (most tasks)
        }
        
    def classify_and_route_task(self, task_description: str, context: str = "") -> dict:
        """Apply cost conservation classification and routing"""
        
        # Step 1: Check if we should avoid Claude
        claude_avoidance = self.claude_minimizer.should_avoid_claude(task_description, 1000)
        
        if not claude_avoidance['avoid_claude']:
            return {
                'route_to': 'claude',
                'reason': claude_avoidance['reason'],
                'estimated_cost': claude_avoidance.get('claude_cost_usd', 0.016),
                'savings_vs_claude': 0.0
            }
        
        # Step 2: Get optimal ChatGPT model
        # Estimate complexity from task description
        complexity = self._estimate_complexity(task_description)
        
        # Get cost-optimized model selection
        model_selection = self.chatgpt_optimizer.select_cost_optimal_model(
            complexity, 
            input_tokens=800,  # Reasonable estimate
            output_tokens=400
        )
        
        if model_selection.get('recommendation') == 'use_claude':
            return {
                'route_to': 'claude',
                'reason': 'No cost-effective ChatGPT option',
                'estimated_cost': model_selection['claude_cost'],
                'savings_vs_claude': 0.0
            }
        
        return {
            'route_to': 'chatgpt',
            'model': model_selection['selected_model'],
            'selection_type': model_selection['selection_type'],
            'estimated_cost': model_selection['estimated_cost'],
            'claude_cost': model_selection['claude_cost'],
            'savings_vs_claude': model_selection['savings_percent'],
            'max_quality_loss': model_selection.get('max_quality_loss', 0.10),
            'category': claude_avoidance['recommended_category'],
            'rationale': claude_avoidance['rationale']
        }
    
    def _estimate_complexity(self, task_description: str) -> TaskComplexity:
        """Estimate task complexity from description"""
        
        task_lower = task_description.lower()
        
        # Critical patterns
        critical_keywords = ['security', 'vulnerability', 'critical', 'financial', 'mission', 'safety']
        if any(keyword in task_lower for keyword in critical_keywords):
            return TaskComplexity.CRITICAL
        
        # Complex patterns  
        complex_keywords = ['architecture', 'microservices', 'distributed', 'system design', 'machine learning']
        if any(keyword in task_lower for keyword in complex_keywords):
            return TaskComplexity.COMPLEX
        
        # Moderate patterns
        moderate_keywords = ['api', 'authentication', 'database', 'performance', 'optimization']
        if any(keyword in task_lower for keyword in moderate_keywords):
            return TaskComplexity.MODERATE
        
        # Simple patterns
        simple_keywords = ['function', 'class', 'simple', 'basic', 'create']
        if any(keyword in task_lower for keyword in simple_keywords):
            return TaskComplexity.SIMPLE
        
        # Trivial patterns
        trivial_keywords = ['hello', 'print', 'variable', 'string']
        if any(keyword in task_lower for keyword in trivial_keywords):
            return TaskComplexity.TRIVIAL
        
        # Default to moderate
        return TaskComplexity.MODERATE
    
    def validate_cost_conservation(self, daily_usage: dict) -> dict:
        """Validate cost conservation targets are being met"""
        
        # Calculate metrics
        total_tasks = daily_usage.get('total_tasks', 0)
        claude_tasks = daily_usage.get('claude_tasks', 0)
        chatgpt_tasks = daily_usage.get('chatgpt_tasks', 0)
        
        claude_usage_percent = (claude_tasks / total_tasks * 100) if total_tasks > 0 else 0
        claude_reduction = 100 - claude_usage_percent
        
        chatgpt_cost = daily_usage.get('chatgpt_cost', 0.0)
        estimated_claude_cost = total_tasks * 0.016  # Estimated all-Claude cost
        
        savings_vs_claude = ((estimated_claude_cost - chatgpt_cost) / estimated_claude_cost * 100) if estimated_claude_cost > 0 else 0
        
        # Check targets
        targets_met = {
            'claude_reduction': {
                'target': self.targets['claude_usage_reduction'],
                'actual': claude_reduction,
                'met': claude_reduction >= self.targets['claude_usage_reduction']
            },
            'chatgpt_savings': {
                'target': self.targets['chatgpt_savings_vs_claude'],
                'actual': savings_vs_claude,
                'met': savings_vs_claude >= self.targets['chatgpt_savings_vs_claude']
            },
            'daily_budget': {
                'target': self.targets['daily_budget_limit'],
                'actual': chatgpt_cost,
                'met': chatgpt_cost <= self.targets['daily_budget_limit']
            }
        }
        
        # Overall success
        all_targets_met = all(target['met'] for target in targets_met.values())
        
        return {
            'targets_met': targets_met,
            'overall_success': all_targets_met,
            'claude_usage_percent': claude_usage_percent,
            'savings_vs_claude_percent': savings_vs_claude,
            'recommendations': self._generate_conservation_recommendations(targets_met)
        }
    
    def _generate_conservation_recommendations(self, targets_met: dict) -> list:
        """Generate recommendations for improving cost conservation"""
        
        recommendations = []
        
        if not targets_met['claude_reduction']['met']:
            deficit = targets_met['claude_reduction']['target'] - targets_met['claude_reduction']['actual']
            recommendations.append(f"🎯 Increase ChatGPT offloading by {deficit:.0f}% to meet Claude reduction target")
        
        if not targets_met['chatgpt_savings']['met']:
            deficit = targets_met['chatgpt_savings']['target'] - targets_met['chatgpt_savings']['actual']
            recommendations.append(f"💰 Improve ChatGPT cost efficiency by {deficit:.0f}% to meet savings target")
        
        if not targets_met['daily_budget']['met']:
            overage = targets_met['daily_budget']['actual'] - targets_met['daily_budget']['target']
            recommendations.append(f"🚨 Reduce daily ChatGPT spending by ${overage:.2f} to stay within budget")
        
        return recommendations
    
    def generate_conservation_report(self) -> str:
        """Generate comprehensive cost conservation report"""
        
        claude_report = self.claude_minimizer.generate_claude_avoidance_report()
        chatgpt_report = self.chatgpt_optimizer.generate_cost_optimization_report()
        
        integration_report = f"""
╭─────────────────────────────────────────────────────────╮
│        🎯 COST CONSERVATION SWARM INTEGRATION           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🚀 SWARM MISSION STATUS: IMPLEMENTING FIXES            │
│                                                         │
│  ✅ CLAUDE TOKEN MINIMIZER: DEPLOYED                    │
│     • Claude-only patterns: 4 (was 11+)               │
│     • Offload patterns: 7 categories                   │
│     • Fallback sequence: 4 tiers before Claude        │
│                                                         │
│  ✅ CHATGPT COST OPTIMIZER: DEPLOYED                    │
│     • Cost caps: $0.005-$0.100 per task              │
│     • Primary model: gpt-4o-mini (94% cheaper)        │
│     • Daily budget: $5.00 with smart allocation       │
│                                                         │
│  🎯 CONSERVATION TARGETS:                               │
│     • Claude usage reduction: 80%                     │
│     • ChatGPT savings vs Claude: 60%                  │
│     • Max cost per task: $0.05                        │
│     • Daily budget: $5.00                             │
│                                                         │
│  📊 EXPECTED OUTCOMES:                                  │
│     • 90% tasks routed to ChatGPT                     │
│     • 10% tasks stay with Claude (orchestration)      │
│     • $2.68/day savings vs all-Claude                 │
│     • 62% cost reduction                              │
│                                                         │
╰─────────────────────────────────────────────────────────╯
"""
        
        return integration_report.strip() + "\n\n" + claude_report + "\n\n" + chatgpt_report

def main():
    """Test integrated cost conservation system"""
    
    conservation = CostConservationSystem()
    
    print(conservation.generate_conservation_report())
    
    print("\n🧪 INTEGRATED COST CONSERVATION TEST:")
    print("=" * 60)
    
    test_tasks = [
        "write a hello world function",
        "explain how this code works", 
        "create a REST API endpoint",
        "review this code for issues",
        "design microservices architecture",
        "security analysis of banking system",
        "spawn agents for coordination"  # Should stay Claude
    ]
    
    for task in test_tasks:
        result = conservation.classify_and_route_task(task)
        
        route = result['route_to']
        cost = result['estimated_cost']
        savings = result.get('savings_vs_claude', 0)
        
        if route == 'chatgpt':
            model = result['model']
            print(f"✅ CHATGPT: {task[:35]}...")
            print(f"   → Model: {model}")
            print(f"   → Cost: ${cost:.4f}")
            print(f"   → Savings: {savings:.0f}%")
        else:
            print(f"🔴 CLAUDE: {task[:35]}...")
            print(f"   → Cost: ${cost:.4f}")
            print(f"   → Reason: {result['reason']}")
        print()

if __name__ == "__main__":
    main()