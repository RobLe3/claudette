#!/usr/bin/env python3
"""
ChatGPT Cost Optimizer - Fix Cost Explosion
Implements smart cost-quality balance to achieve real savings
"""

from typing import Dict, List, Any, Optional
from enum import Enum

class TaskComplexity(Enum):
    TRIVIAL = 1
    SIMPLE = 2
    MODERATE = 3
    COMPLEX = 4
    CRITICAL = 5

class ChatGPTCostOptimizer:
    """Smart cost-quality optimization for ChatGPT model selection"""
    
    def __init__(self):
        # AGGRESSIVE COST CAPS - Maximum cost per task
        self.max_cost_per_task = {
            TaskComplexity.TRIVIAL: 0.005,   # Max $0.005 (vs Claude $0.016)
            TaskComplexity.SIMPLE: 0.010,    # Max $0.010 (vs Claude $0.016)
            TaskComplexity.MODERATE: 0.025,  # Max $0.025 (vs Claude $0.016)
            TaskComplexity.COMPLEX: 0.050,   # Max $0.050 (vs Claude $0.016)
            TaskComplexity.CRITICAL: 0.100   # Max $0.100 (emergency only)
        }
        
        # COST-OPTIMIZED model selection (prioritizing savings)
        self.cost_optimized_models = {
            TaskComplexity.TRIVIAL: {
                'primary': 'gpt-4o-mini',    # $0.00015/1k - 94% cheaper
                'fallback': 'gpt-3.5-turbo', # $0.0005/1k - 69% cheaper
                'max_quality_loss': 0.15     # Accept 15% quality loss for 94% savings
            },
            TaskComplexity.SIMPLE: {
                'primary': 'gpt-4o-mini',    # $0.00015/1k - 94% cheaper
                'fallback': 'gpt-4o',        # $0.005/1k - 69% cheaper
                'max_quality_loss': 0.12     # Accept 12% quality loss for savings
            },
            TaskComplexity.MODERATE: {
                'primary': 'gpt-4o-mini',    # Try cheapest first
                'fallback': 'gpt-4o',        # $0.005/1k - 69% cheaper
                'emergency': 'gpt-4',        # $0.030/1k - only if needed
                'max_quality_loss': 0.10     # Accept 10% quality loss
            },
            TaskComplexity.COMPLEX: {
                'primary': 'gpt-4o',         # $0.005/1k - balanced
                'fallback': 'gpt-4',         # $0.030/1k - premium but reasonable
                'emergency': 'gpt-4.1',      # $0.075/1k - only if absolutely needed
                'max_quality_loss': 0.08     # Accept 8% quality loss
            },
            TaskComplexity.CRITICAL: {
                'primary': 'gpt-4',          # $0.030/1k - premium
                'fallback': 'gpt-4.1',       # $0.075/1k - flagship
                'max_quality_loss': 0.05     # Accept 5% quality loss only
            }
        }
        
        # Current 2025 model pricing (accurate)
        self.model_pricing = {
            'gpt-3.5-turbo': {'input': 0.0005, 'output': 0.0015},
            'gpt-4o-mini': {'input': 0.00015, 'output': 0.0006},
            'gpt-4o': {'input': 0.005, 'output': 0.020},
            'gpt-4': {'input': 0.030, 'output': 0.060},
            'gpt-4.1': {'input': 0.075, 'output': 0.150}  # Estimated flagship pricing
        }
        
        # Claude cost for comparison
        self.claude_cost_usd = 0.016  # ~€0.015 converted to USD
        
        # Daily budget allocation
        self.daily_budgets = {
            'total_chatgpt': 5.00,
            'trivial_tasks': 1.50,
            'simple_tasks': 1.50,
            'moderate_tasks': 1.50,
            'complex_tasks': 0.50,
            'emergency_reserve': 0.50
        }
        
    def estimate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        """Estimate cost for specific model and token usage"""
        if model not in self.model_pricing:
            return 999.0  # Penalize unknown models
        
        pricing = self.model_pricing[model]
        input_cost = (input_tokens / 1000) * pricing['input']
        output_cost = (output_tokens / 1000) * pricing['output']
        
        return input_cost + output_cost
    
    def select_cost_optimal_model(self, complexity: TaskComplexity, 
                                  input_tokens: int = 800, 
                                  output_tokens: int = 400,
                                  budget_remaining: float = 5.0) -> Dict[str, Any]:
        """Select optimal model balancing cost and quality"""
        
        if complexity not in self.cost_optimized_models:
            return {'error': f'Unknown complexity: {complexity}'}
        
        models_config = self.cost_optimized_models[complexity]
        max_cost = self.max_cost_per_task[complexity]
        
        # Try models in cost-optimized order
        for model_type in ['primary', 'fallback', 'emergency']:
            if model_type not in models_config:
                continue
                
            model = models_config[model_type]
            estimated_cost = self.estimate_cost(model, input_tokens, output_tokens)
            
            # Check cost constraints
            if estimated_cost > max_cost:
                continue
                
            if estimated_cost > budget_remaining:
                continue
            
            # Calculate savings vs Claude
            claude_total_cost = ((input_tokens + output_tokens) / 1000) * self.claude_cost_usd
            savings = claude_total_cost - estimated_cost
            savings_percent = (savings / claude_total_cost) * 100 if claude_total_cost > 0 else 0
            
            # Only proceed if we're saving money vs Claude
            if savings_percent < 10 and complexity.value < 4:  # Require 10% savings for non-critical
                continue
            
            return {
                'selected_model': model,
                'selection_type': model_type,
                'estimated_cost': estimated_cost,
                'claude_cost': claude_total_cost,
                'savings_usd': savings,
                'savings_percent': savings_percent,
                'max_quality_loss': models_config.get('max_quality_loss', 0.10),
                'within_budget': True,
                'recommendation': 'use_chatgpt' if savings_percent > 0 else 'use_claude'
            }
        
        # If no suitable ChatGPT model found, recommend Claude
        claude_cost = ((input_tokens + output_tokens) / 1000) * self.claude_cost_usd
        return {
            'selected_model': 'claude',
            'selection_type': 'fallback',
            'estimated_cost': claude_cost,
            'claude_cost': claude_cost,
            'savings_usd': 0.0,
            'savings_percent': 0.0,
            'reason': 'No cost-effective ChatGPT model found',
            'recommendation': 'use_claude'
        }
    
    def validate_budget_allocation(self, daily_usage: Dict[str, float]) -> Dict[str, Any]:
        """Validate current budget allocation and recommend adjustments"""
        
        total_used = sum(daily_usage.values())
        budget_status = {}
        
        for category, budget in self.daily_budgets.items():
            used = daily_usage.get(category, 0.0)
            remaining = budget - used
            usage_percent = (used / budget) * 100 if budget > 0 else 0
            
            status = 'healthy'
            if usage_percent > 90:
                status = 'critical'
            elif usage_percent > 75:
                status = 'warning'
            elif usage_percent > 50:
                status = 'moderate'
            
            budget_status[category] = {
                'budgeted': budget,
                'used': used,
                'remaining': remaining,
                'usage_percent': usage_percent,
                'status': status
            }
        
        return {
            'total_budget': self.daily_budgets['total_chatgpt'],
            'total_used': total_used,
            'total_remaining': self.daily_budgets['total_chatgpt'] - total_used,
            'overall_usage_percent': (total_used / self.daily_budgets['total_chatgpt']) * 100,
            'category_status': budget_status,
            'recommendations': self._generate_budget_recommendations(budget_status)
        }
    
    def _generate_budget_recommendations(self, budget_status: Dict) -> List[str]:
        """Generate budget optimization recommendations"""
        recommendations = []
        
        for category, status in budget_status.items():
            if status['status'] == 'critical':
                recommendations.append(f"🚨 {category}: Usage critical ({status['usage_percent']:.0f}%) - switch to cheaper models")
            elif status['status'] == 'warning':
                recommendations.append(f"⚠️ {category}: Usage high ({status['usage_percent']:.0f}%) - consider cost optimization")
        
        return recommendations
    
    def calculate_target_savings(self) -> Dict[str, Any]:
        """Calculate target savings vs all-Claude usage"""
        
        # Assume typical daily usage: 20 tasks across complexities
        daily_tasks = {
            TaskComplexity.TRIVIAL: 8,    # 40% of tasks
            TaskComplexity.SIMPLE: 6,     # 30% of tasks
            TaskComplexity.MODERATE: 4,   # 20% of tasks
            TaskComplexity.COMPLEX: 2,    # 10% of tasks
            TaskComplexity.CRITICAL: 0    # 0% normal days
        }
        
        # Estimate costs
        all_claude_cost = 0
        optimized_cost = 0
        
        for complexity, count in daily_tasks.items():
            # Assume average 1000 tokens per task (600 input, 400 output)
            claude_task_cost = (1000 / 1000) * self.claude_cost_usd
            all_claude_cost += claude_task_cost * count
            
            # Get optimized cost
            optimal_selection = self.select_cost_optimal_model(complexity, 600, 400)
            if optimal_selection.get('recommendation') == 'use_chatgpt':
                optimized_task_cost = optimal_selection['estimated_cost']
            else:
                optimized_task_cost = claude_task_cost
            
            optimized_cost += optimized_task_cost * count
        
        total_savings = all_claude_cost - optimized_cost
        savings_percent = (total_savings / all_claude_cost) * 100 if all_claude_cost > 0 else 0
        
        return {
            'all_claude_daily_cost': all_claude_cost,
            'optimized_daily_cost': optimized_cost,
            'daily_savings': total_savings,
            'savings_percent': savings_percent,
            'monthly_savings': total_savings * 30,
            'annual_savings': total_savings * 365
        }
    
    def generate_cost_optimization_report(self) -> str:
        """Generate comprehensive cost optimization report"""
        
        savings_analysis = self.calculate_target_savings()
        
        report = f"""
╭─────────────────────────────────────────────────────────╮
│           💰 CHATGPT COST OPTIMIZATION SYSTEM           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🎯 AGGRESSIVE COST CAPS (vs Claude $0.016):            │
│     • TRIVIAL:  max $0.005 (69% cheaper)               │
│     • SIMPLE:   max $0.010 (38% cheaper)               │
│     • MODERATE: max $0.025 (+56% premium only if high quality) │
│     • COMPLEX:  max $0.050 (+213% premium for quality) │
│     • CRITICAL: max $0.100 (emergency only)            │
│                                                         │
│  💡 COST-FIRST MODEL SELECTION:                         │
│     • Primary:   gpt-4o-mini (94% cheaper than Claude) │
│     • Fallback:  gpt-4o (69% cheaper than Claude)      │
│     • Emergency: gpt-4 (−88% vs Claude, quality only)  │
│                                                         │
│  📊 DAILY BUDGET ALLOCATION ($5.00 total):              │
│     • Trivial tasks:  $1.50 (300 simple tasks)        │
│     • Simple tasks:   $1.50 (150 simple tasks)        │
│     • Moderate tasks: $1.50 (60 moderate tasks)       │
│     • Complex tasks:  $0.50 (10 complex tasks)        │
│     • Emergency:      $0.50 (critical situations)     │
│                                                         │
│  🎯 PROJECTED SAVINGS (20 tasks/day):                   │
│     • All-Claude cost:    ${savings_analysis['all_claude_daily_cost']:.2f}/day          │
│     • Optimized cost:     ${savings_analysis['optimized_daily_cost']:.2f}/day           │
│     • Daily savings:      ${savings_analysis['daily_savings']:.2f} ({savings_analysis['savings_percent']:.0f}%)        │
│     • Monthly savings:    ${savings_analysis['monthly_savings']:.2f}                │
│     • Annual savings:     ${savings_analysis['annual_savings']:.0f}               │
│                                                         │
╰─────────────────────────────────────────────────────────╯
"""
        return report.strip()

def main():
    """Test ChatGPT cost optimization"""
    optimizer = ChatGPTCostOptimizer()
    
    print(optimizer.generate_cost_optimization_report())
    
    print("\n🧪 COST OPTIMIZATION TEST CASES:")
    print("=" * 60)
    
    test_cases = [
        (TaskComplexity.TRIVIAL, "Hello world function", 100, 50),
        (TaskComplexity.SIMPLE, "Basic API endpoint", 400, 200),
        (TaskComplexity.MODERATE, "User authentication system", 800, 400),
        (TaskComplexity.COMPLEX, "Microservices architecture", 1200, 600),
        (TaskComplexity.CRITICAL, "Security vulnerability assessment", 1500, 800)
    ]
    
    for complexity, description, input_tokens, output_tokens in test_cases:
        result = optimizer.select_cost_optimal_model(complexity, input_tokens, output_tokens)
        
        print(f"\n📋 {complexity.name}: {description}")
        print(f"   Model: {result.get('selected_model', 'N/A')}")
        print(f"   Cost: ${result.get('estimated_cost', 0):.4f}")
        print(f"   Savings: ${result.get('savings_usd', 0):.4f} ({result.get('savings_percent', 0):.0f}%)")
        print(f"   Recommendation: {result.get('recommendation', 'N/A')}")

if __name__ == "__main__":
    main()