#!/usr/bin/env python3
"""
Claude Token Minimizer - Aggressive Claude Usage Reduction
Implements cost conservation agent swarm recommendations
"""

import re
from typing import Dict, List, Any, Optional

class ClaudeTokenMinimizer:
    """Aggressive Claude token usage minimization system"""
    
    def __init__(self):
        # DRASTICALLY reduced Claude-only patterns - only true orchestration
        self.claude_only_patterns = [
            r'swarm.*init',              # Swarm initialization
            r'agent.*spawn.*coordination', # Agent coordination spawning  
            r'mcp.*swarm',               # MCP swarm operations
            r'todowrite.*batch'          # Batch todo operations
        ]
        
        # EXPANDED offload patterns - aggressive ChatGPT routing
        self.aggressive_offload_patterns = {
            'code_explanation': {
                'patterns': [
                    r'explain.*code', r'what.*does.*this', r'how.*works',
                    r'describe.*function', r'analyze.*implementation', r'code.*walkthrough'
                ],
                'model': 'gpt-4o-mini',
                'max_tokens': 1000,
                'cost_per_1k': 0.00015,
                'rationale': 'ChatGPT excels at code explanation'
            },
            'code_review': {
                'patterns': [
                    r'review.*code', r'check.*code', r'analyze.*file',
                    r'find.*issues', r'code.*quality', r'best.*practices'
                ],
                'model': 'gpt-4o',
                'max_tokens': 1500,
                'cost_per_1k': 0.005,
                'rationale': 'Good quality code review without Claude cost'
            },
            'testing_tasks': {
                'patterns': [
                    r'write.*test', r'create.*test', r'test.*code',
                    r'unit.*test', r'integration.*test', r'test.*suite'
                ],
                'model': 'gpt-4o-mini',
                'max_tokens': 1200,
                'cost_per_1k': 0.00015,
                'rationale': 'Test writing well-suited for ChatGPT'
            },
            'refactoring_tasks': {
                'patterns': [
                    r'refactor.*code', r'improve.*code', r'optimize.*code',
                    r'clean.*up', r'restructure', r'modernize.*code'
                ],
                'model': 'gpt-4o',
                'max_tokens': 2000,
                'cost_per_1k': 0.005,
                'rationale': 'ChatGPT handles refactoring well'
            },
            'documentation_tasks': {
                'patterns': [
                    r'write.*docs', r'document.*code', r'create.*readme',
                    r'api.*documentation', r'user.*guide', r'comments'
                ],
                'model': 'gpt-4o-mini',
                'max_tokens': 1500,
                'cost_per_1k': 0.00015,
                'rationale': 'Documentation is perfect for ChatGPT'
            },
            'debugging_assistance': {
                'patterns': [
                    r'debug.*issue', r'fix.*bug', r'troubleshoot',
                    r'error.*help', r'solve.*problem'
                ],
                'model': 'gpt-4o',
                'max_tokens': 1500,
                'cost_per_1k': 0.005,
                'rationale': 'ChatGPT can debug many common issues'
            },
            'simple_analysis': {
                'patterns': [
                    r'analyze.*performance', r'check.*efficiency', r'review.*logic',
                    r'examine.*code', r'assess.*quality'
                ],
                'model': 'gpt-4o-mini',
                'max_tokens': 1000,
                'cost_per_1k': 0.00015,
                'rationale': 'Basic analysis suitable for ChatGPT'
            }
        }
        
        # Tiered fallback system - try multiple ChatGPT models before Claude
        self.fallback_sequence = [
            'gpt-4o-mini',  # Try cheapest first ($0.00015/1k)
            'gpt-4o',       # Try mid-tier ($0.005/1k)  
            'gpt-4',        # Try premium ($0.030/1k) - still cheaper than Claude
            'claude'        # Absolute last resort ($0.016/1k but in EUR)
        ]
        
        # Cost thresholds for Claude avoidance
        self.claude_cost_eur_per_1k = 0.015
        self.claude_cost_usd_per_1k = 0.015 * 1.09  # Convert to USD (~$0.016)
        
    def should_avoid_claude(self, task_description: str, estimated_tokens: int = 1000) -> Dict[str, Any]:
        """Determine if we should aggressively avoid Claude for this task"""
        
        task_lower = task_description.lower()
        
        # Check if it's truly Claude-only (minimal patterns)
        for claude_pattern in self.claude_only_patterns:
            if re.search(claude_pattern, task_lower):
                return {
                    'avoid_claude': False,
                    'reason': 'True orchestration task requiring Claude',
                    'pattern_matched': claude_pattern
                }
        
        # Calculate Claude cost for comparison
        claude_cost_usd = (estimated_tokens / 1000) * self.claude_cost_usd_per_1k
        
        # Check if any ChatGPT pattern matches
        for category, config in self.aggressive_offload_patterns.items():
            for pattern in config['patterns']:
                if re.search(pattern, task_lower):
                    chatgpt_cost = (estimated_tokens / 1000) * config['cost_per_1k']
                    savings_potential = claude_cost_usd - chatgpt_cost
                    savings_percent = (savings_potential / claude_cost_usd) * 100
                    
                    return {
                        'avoid_claude': True,
                        'recommended_category': category,
                        'recommended_model': config['model'],
                        'claude_cost_usd': claude_cost_usd,
                        'chatgpt_cost_usd': chatgpt_cost,
                        'savings_usd': savings_potential,
                        'savings_percent': savings_percent,
                        'rationale': config['rationale']
                    }
        
        # For unmatched tasks, still try to avoid Claude if cost-effective
        # Use cheapest ChatGPT model as default
        cheapest_cost = (estimated_tokens / 1000) * 0.00015  # gpt-4o-mini
        if cheapest_cost < claude_cost_usd * 0.8:  # If 20%+ savings
            return {
                'avoid_claude': True,
                'recommended_category': 'general_cost_optimization',
                'recommended_model': 'gpt-4o-mini',
                'claude_cost_usd': claude_cost_usd,
                'chatgpt_cost_usd': cheapest_cost,
                'savings_usd': claude_cost_usd - cheapest_cost,
                'savings_percent': ((claude_cost_usd - cheapest_cost) / claude_cost_usd) * 100,
                'rationale': 'Cost optimization - try ChatGPT first'
            }
        
        return {
            'avoid_claude': False,
            'reason': 'No cost advantage found',
            'claude_cost_usd': claude_cost_usd
        }
    
    def get_fallback_sequence(self, task_complexity: str, budget_remaining: float) -> List[Dict[str, Any]]:
        """Get optimal fallback sequence based on complexity and budget"""
        
        sequence = []
        
        # Cost mapping per model
        model_costs = {
            'gpt-4o-mini': 0.00015,
            'gpt-4o': 0.005,
            'gpt-4': 0.030,
            'claude': self.claude_cost_usd_per_1k
        }
        
        # Build sequence based on budget and complexity
        for model in self.fallback_sequence:
            cost_per_1k = model_costs[model]
            estimated_cost = cost_per_1k  # Assume 1k tokens for estimation
            
            # Skip if over budget (except Claude as last resort)
            if estimated_cost > budget_remaining and model != 'claude':
                continue
            
            sequence.append({
                'model': model,
                'cost_per_1k': cost_per_1k,
                'estimated_cost': estimated_cost,
                'try_order': len(sequence) + 1
            })
        
        return sequence
    
    def generate_claude_avoidance_report(self) -> str:
        """Generate report on Claude avoidance strategies"""
        
        report = f"""
╭─────────────────────────────────────────────────────────╮
│            🎯 CLAUDE TOKEN MINIMIZATION SYSTEM          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📊 AGGRESSIVE OFFLOAD STRATEGY                         │
│                                                         │
│  🔴 CLAUDE-ONLY PATTERNS (MINIMIZED):                   │
│     • {len(self.claude_only_patterns)} patterns (was 11+)                    │
│     • Only true orchestration tasks                     │
│                                                         │
│  ✅ CHATGPT OFFLOAD PATTERNS (EXPANDED):                │
│     • {len(self.aggressive_offload_patterns)} categories (was 7)                     │
│     • Code explanation, review, testing, refactoring    │
│     • Documentation, debugging, analysis                │
│                                                         │
│  💰 COST COMPARISON (per 1k tokens):                    │
│     • gpt-4o-mini: $0.00015 (94% cheaper than Claude)  │
│     • gpt-4o:      $0.005   (69% cheaper than Claude)  │
│     • gpt-4:       $0.030   (−88% vs Claude)           │
│     • Claude:      $0.016   (baseline)                 │
│                                                         │
│  🎯 FALLBACK SEQUENCE:                                  │
│     1. gpt-4o-mini (try cheapest first)                │
│     2. gpt-4o      (mid-tier quality)                  │
│     3. gpt-4       (premium but still viable)          │
│     4. Claude      (absolute last resort)              │
│                                                         │
│  📈 EXPECTED SAVINGS:                                   │
│     • 80% of tasks → ChatGPT (target)                  │
│     • 20% of tasks → Claude (orchestration only)       │
│     • 60-90% cost reduction vs all-Claude              │
│                                                         │
╰─────────────────────────────────────────────────────────╯
"""
        return report.strip()

def main():
    """Test Claude token minimization system"""
    minimizer = ClaudeTokenMinimizer()
    
    print(minimizer.generate_claude_avoidance_report())
    
    # Test cases
    test_tasks = [
        "explain how this function works",
        "review this code for issues", 
        "write unit tests for this module",
        "refactor this legacy code",
        "create documentation for the API",
        "debug this error message",
        "spawn new agents for coordination",  # Should stay with Claude
        "initialize swarm topology"           # Should stay with Claude
    ]
    
    print("\n🧪 CLAUDE AVOIDANCE TEST RESULTS:")
    print("=" * 60)
    
    for task in test_tasks:
        result = minimizer.should_avoid_claude(task, 1000)
        
        if result['avoid_claude']:
            print(f"✅ OFFLOAD: {task[:40]}...")
            print(f"   → {result['recommended_model']} (${result['chatgpt_cost_usd']:.4f} vs Claude ${result['claude_cost_usd']:.4f})")
            print(f"   → Savings: ${result['savings_usd']:.4f} ({result['savings_percent']:.0f}%)")
            print(f"   → Reason: {result['rationale']}")
        else:
            print(f"🔴 CLAUDE: {task[:40]}...")
            print(f"   → Reason: {result['reason']}")
        print()

if __name__ == "__main__":
    main()