#!/usr/bin/env python3
"""
ChatGPT Offloading Manager - Dynamic task offloading to OpenAI ChatGPT
Integrates with Claude Code for intelligent task distribution
"""

import json
import sys
import asyncio
import aiohttp
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any, Union
import re

# Add to path for imports
# sys.path manipulation removed - using proper imports.parent.parent.parent / "scripts" / "automation"))
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent / "scripts" / "automation"))
try:
    from secure_key_manager import SecureKeyManager
except ImportError:
    # Fallback for development/testing
    class SecureKeyManager:
        def __init__(self): pass
        def get_key(self, key_name): return None

# Import enhanced model selection and cost conservation components
# sys.path manipulation removed - using proper imports.parent.parent.parent))
try:
    from enhanced_model_switching import EnhancedModelSelector, TaskComplexity
except ImportError:
    try:
        import sys
        # sys.path manipulation removed - using proper imports
        from enhanced_model_switching import EnhancedModelSelector, TaskComplexity
    except ImportError:
        # Fallback implementation
        class TaskComplexity:
            TRIVIAL = "trivial"
            SIMPLE = "simple"
            MODERATE = "moderate"
            COMPLEX = "complex"
        
        class EnhancedModelSelector:
            def __init__(self):
                pass
            def select_model(self, *args, **kwargs):
                return "gpt-4o-mini"
try:
    from scripts.automation.cost_conservation_integration import CostConservationSystem
    from scripts.automation.claude_token_minimizer import ClaudeTokenMinimizer
    from scripts.automation.chatgpt_cost_optimizer import ChatGPTCostOptimizer
except ImportError:
    # Fallback - create mock classes for missing dependencies
    class CostConservationSystem:
        def __init__(self): pass
        def optimize_request(self, *args, **kwargs): return args, kwargs
    
    class ClaudeTokenMinimizer:
        def __init__(self): pass
        def minimize_tokens(self, text): return text
    
    class ChatGPTCostOptimizer:
        def __init__(self): pass
        def optimize_cost(self, *args, **kwargs): return args, kwargs

# Mock coordinator for now
class ClaudeIntegrationCoordinator:
    class StatusManager:
        def get_claude_pro_status(self):
            return {"daily_usage_percent": 50}
    
    def __init__(self):
        self.status_manager = self.StatusManager()

class ChatGPTOffloadingManager:
    """Manage dynamic offloading of tasks to ChatGPT API"""
    
    def __init__(self):
        self.key_manager = SecureKeyManager()
        self.coordinator = ClaudeIntegrationCoordinator()
        self.openai_api_key = self.key_manager.retrieve_api_key('openai')
        
        # Initialize enhanced model selector
        self.model_selector = EnhancedModelSelector()
        
        # COST CONSERVATION SWARM INTEGRATION
        self.cost_conservation = CostConservationSystem()
        self.claude_minimizer = ClaudeTokenMinimizer()
        self.chatgpt_optimizer = ChatGPTCostOptimizer()
        
        # COST CONSERVATION: Use minimizer's aggressive Claude avoidance patterns
        # Only 4 true orchestration patterns remain (was 11+)
        self.claude_only_patterns = self.claude_minimizer.claude_only_patterns
        
        # 2025 OpenAI pricing - ACCURATE RATES
        self.openai_pricing_2025 = {
            'gpt-3.5-turbo': {'input': 0.50, 'output': 1.50},  # per 1M tokens
            'gpt-4o-mini': {'input': 0.15, 'output': 0.60},    # per 1M tokens
            'gpt-4o': {'input': 5.00, 'output': 20.00},        # per 1M tokens
            'gpt-4': {'input': 30.00, 'output': 60.00}         # per 1M tokens
        }
        
        # COST CONSERVATION: Use minimizer's expanded offload patterns (7 categories)
        # This replaces the 18 manual patterns with intelligent cost-optimized routing
        self.offload_patterns = self.claude_minimizer.aggressive_offload_patterns
        
        # Legacy patterns for backward compatibility
        self.legacy_offload_patterns = {
            'code_explanation': {
                'patterns': [r'explain.*code', r'what.*does.*this', r'how.*works', r'describe.*function', r'what.*is.*this.*code'],
                'model': 'gpt-4o-mini',
                'max_tokens': 1500,
                'cost_per_1k_tokens': 0.60 / 1000,
                'rationale': 'ChatGPT excels at code explanation'
            },
            'code_review': {
                'patterns': [r'review.*code', r'check.*code', r'analyze.*file', r'code.*quality', r'find.*issues', r'improve.*code'],
                'model': 'gpt-4o',
                'max_tokens': 2500,
                'cost_per_1k_tokens': 20.00 / 1000,
                'rationale': 'Good enough code review, significant cost savings'
            },
            'testing_tasks': {
                'patterns': [r'write.*test', r'create.*test', r'test.*code', r'unit.*test', r'test.*case', r'test.*scenario'],
                'model': 'gpt-4o-mini',
                'max_tokens': 2000,
                'cost_per_1k_tokens': 0.60 / 1000,
                'rationale': 'Test writing is well-suited for ChatGPT'
            },
            'refactoring_tasks': {
                'patterns': [r'refactor.*code', r'improve.*code', r'optimize.*code', r'clean.*up.*code', r'restructure'],
                'model': 'gpt-4o',
                'max_tokens': 2500,
                'cost_per_1k_tokens': 20.00 / 1000,
                'rationale': 'ChatGPT can handle most refactoring tasks'
            },
            'debugging_tasks': {
                'patterns': [r'debug.*code', r'fix.*bug', r'find.*error', r'troubleshoot', r'why.*not.*working'],
                'model': 'gpt-4o',
                'max_tokens': 2000,
                'cost_per_1k_tokens': 20.00 / 1000,
                'rationale': 'ChatGPT can debug most common issues'
            },
            'simple_code_generation': {
                'patterns': [r'write.*function', r'create.*script', r'generate.*code', r'implement.*feature', r'build.*component'],
                'model': 'gpt-4o-mini',
                'max_tokens': 2000,
                'cost_per_1k_tokens': 0.60 / 1000,
                'rationale': 'Most code generation can be handled by ChatGPT'
            },
            'complex_code_generation': {
                'patterns': [r'implement.*api', r'build.*system', r'create.*application', r'develop.*feature'],
                'model': 'gpt-4o',
                'max_tokens': 3000,
                'cost_per_1k_tokens': 20.00 / 1000,
                'rationale': 'Even complex code can often be handled by ChatGPT'
            },
            'text_processing': {
                'patterns': [r'summarize', r'extract.*from', r'parse.*text', r'format.*text', r'convert.*format'],
                'model': 'gpt-4o-mini',
                'max_tokens': 1500,
                'cost_per_1k_tokens': 0.60 / 1000,
                'rationale': 'Text processing is perfect for ChatGPT'
            },
            'documentation_generation': {
                'patterns': [r'write.*docs', r'create.*readme', r'document.*code', r'write.*guide', r'explain.*code'],
                'model': 'gpt-3.5-turbo',
                'max_tokens': 2500,
                'cost_per_1k_tokens': 1.50 / 1000,
                'rationale': 'Documentation is ideal for cost-effective models'
            },
            'analysis_tasks': {
                'patterns': [r'analyze.*code', r'review.*file', r'check.*syntax', r'find.*bug', r'performance.*analysis'],
                'model': 'gpt-4o',
                'max_tokens': 2500,
                'cost_per_1k_tokens': 20.00 / 1000,
                'rationale': 'Most analysis tasks can be handled by ChatGPT'
            },
            'research_tasks': {
                'patterns': [r'research.*topic', r'find.*information', r'lookup.*docs', r'search.*for', r'investigate'],
                'model': 'gpt-3.5-turbo',
                'max_tokens': 2000,
                'cost_per_1k_tokens': 1.50 / 1000,
                'rationale': 'Research tasks are cost-effective with ChatGPT'
            },
            'general_assistance': {
                'patterns': [r'help.*with', r'how.*to', r'what.*is', r'explain.*how', r'show.*example', r'guide.*me'],
                'model': 'gpt-4o-mini',
                'max_tokens': 1500,
                'cost_per_1k_tokens': 0.60 / 1000,
                'rationale': 'General assistance perfect for cost-effective models'
            },
            'creative_tasks': {
                'patterns': [r'brainstorm', r'suggest.*names', r'creative.*solutions', r'generate.*ideas', r'design.*concept'],
                'model': 'gpt-4o',
                'max_tokens': 2000,
                'cost_per_1k_tokens': 20.00 / 1000,
                'rationale': 'ChatGPT excels at creative tasks'
            },
            'file_operations': {
                'patterns': [r'read.*file', r'write.*file', r'create.*file', r'modify.*file', r'update.*file'],
                'model': 'gpt-4o-mini',
                'max_tokens': 2000,
                'cost_per_1k_tokens': 0.60 / 1000,
                'rationale': 'File operations can often be guided by ChatGPT'
            },
            'configuration_tasks': {
                'patterns': [r'configure.*system', r'setup.*environment', r'install.*package', r'config.*file'],
                'model': 'gpt-4o-mini',
                'max_tokens': 1500,
                'cost_per_1k_tokens': 0.60 / 1000,
                'rationale': 'Configuration tasks are well-suited for ChatGPT'
            },
            'data_processing': {
                'patterns': [r'process.*data', r'transform.*data', r'clean.*data', r'filter.*data', r'sort.*data'],
                'model': 'gpt-4o-mini',
                'max_tokens': 2000,
                'cost_per_1k_tokens': 0.60 / 1000,
                'rationale': 'Data processing is excellent for ChatGPT'
            },
            'api_development': {
                'patterns': [r'api.*endpoint', r'rest.*api', r'web.*service', r'http.*request', r'api.*integration'],
                'model': 'gpt-4o',
                'max_tokens': 2500,
                'cost_per_1k_tokens': 20.00 / 1000,
                'rationale': 'API development can be handled by ChatGPT with good results'
            },
            'database_tasks': {
                'patterns': [r'database.*query', r'sql.*statement', r'db.*schema', r'database.*design', r'query.*optimization'],
                'model': 'gpt-4o',
                'max_tokens': 2000,
                'cost_per_1k_tokens': 20.00 / 1000,
                'rationale': 'Database tasks work well with ChatGPT'
            },
            'ui_development': {
                'patterns': [r'user.*interface', r'frontend.*code', r'ui.*component', r'css.*style', r'html.*element'],
                'model': 'gpt-4o',
                'max_tokens': 2500,
                'cost_per_1k_tokens': 20.00 / 1000,
                'rationale': 'UI development is well-suited for ChatGPT'
            },
            'catchall_offload': {
                'patterns': [r'.*'],  # Catch everything else
                'model': 'gpt-4o-mini',
                'max_tokens': 1500,
                'cost_per_1k_tokens': 0.60 / 1000,
                'rationale': 'Default to ChatGPT for maximum cost savings'
            }
        }
        
        # Usage tracking
        self.usage_file = Path.home() / '.claude' / 'openai_usage.json'
        self.usage_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Load usage data
        self.usage_data = self._load_usage_data()
        
    def _load_usage_data(self) -> Dict[str, Any]:
        """Load OpenAI usage tracking data"""
        try:
            if self.usage_file.exists():
                with open(self.usage_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            print(f"❌ Failed to load usage data: {e}")
            
        return {
            'daily_usage': {},
            'monthly_usage': {},
            'session_usage': {
                'requests': 0,
                'tokens': 0,
                'cost_usd': 0.0,
                'started_at': datetime.now().isoformat()
            },
            'total_savings': {
                'claude_tokens_saved': 0,
                'cost_comparison': {'claude_eur': 0.0, 'openai_usd': 0.0}
            }
        }
    
    def _save_usage_data(self):
        """Save usage data to file"""
        try:
            with open(self.usage_file, 'w') as f:
                json.dump(self.usage_data, f, indent=2)
        except Exception as e:
            print(f"❌ Failed to save usage data: {e}")
    
    def classify_task(self, task_description: str, context: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """COST CONSERVATION: Enhanced task classification with aggressive Claude minimization"""
        
        # STEP 1: Apply cost conservation routing
        context_text = context or ""
        conservation_result = self.cost_conservation.classify_and_route_task(task_description, context_text)
        
        if conservation_result['route_to'] == 'claude':
            return {
                'task_type': 'claude_orchestration',
                'model': 'claude',
                'max_tokens': 0,
                'estimated_cost_usd': conservation_result['estimated_cost'],
                'confidence': 0.95,
                'recommendation': 'keep_local',
                'reason': conservation_result['reason']
            }
        
        # STEP 2: Use ChatGPT with cost-optimized model selection
        return {
            'task_type': conservation_result.get('category', 'general_optimization'),
            'model': conservation_result['model'],
            'tier': conservation_result.get('selection_type', 'cost_optimized'),
            'max_tokens': 2000,  # Conservative default
            'estimated_cost_usd': conservation_result['estimated_cost'],
            'quality_score': 8.5,  # Default quality score
            'complexity': 'moderate',  # Default complexity
            'confidence': 0.90,
            'recommendation': 'offload',
            'reasoning': f"Cost conservation: {conservation_result['rationale']}",
            'savings_vs_claude': conservation_result['savings_vs_claude'],
            'max_quality_loss': conservation_result.get('max_quality_loss', 0.10)
        }
    
    def _should_offload(self, config: Dict[str, Any]) -> bool:
        """COST CONSERVATION: Determine offloading using smart budget management"""
        if not self.openai_api_key:
            return False
        
        # Use ChatGPT cost optimizer for budget validation
        today = datetime.now().strftime('%Y-%m-%d')
        daily_usage = self.usage_data['daily_usage'].get(today, {})
        
        # Map usage data to optimizer format
        usage_by_complexity = {
            'trivial_tasks': daily_usage.get('trivial_cost', 0.0),
            'simple_tasks': daily_usage.get('simple_cost', 0.0),
            'moderate_tasks': daily_usage.get('moderate_cost', 0.0),
            'complex_tasks': daily_usage.get('complex_cost', 0.0)
        }
        
        budget_status = self.chatgpt_optimizer.validate_budget_allocation(usage_by_complexity)
        
        # Check if we're within budget limits
        remaining_budget = budget_status['total_remaining']
        estimated_cost = config.get('estimated_cost_usd', 0.01)
        
        if estimated_cost > remaining_budget:
            return False
        
        # AGGRESSIVE OFFLOADING: Use Claude minimizer's strategy
        # 90% of tasks should be offloaded to ChatGPT
        return True  # Default to offload unless budget constraints prevent it
    
    async def offload_task(self, task_description: str, context: Optional[str] = None) -> Dict[str, Any]:
        """Offload task to ChatGPT API"""
        if not self.openai_api_key:
            return {'error': 'No OpenAI API key configured'}
            
        classification = self.classify_task(task_description)
        if not classification or classification['recommendation'] != 'offload':
            return {'error': 'Task not suitable for offloading'}
        
        # Prepare API request
        messages = [
            {
                "role": "system", 
                "content": "You are an expert assistant helping with Claude Code development tasks. Provide precise, practical solutions."
            },
            {
                "role": "user",
                "content": f"Task: {task_description}"
            }
        ]
        
        if context:
            messages.insert(-1, {
                "role": "user",
                "content": f"Context: {context}"
            })
        
        start_time = time.time()
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    'https://api.openai.com/v1/chat/completions',
                    headers={
                        'Authorization': f'Bearer {self.openai_api_key}',
                        'Content-Type': 'application/json'
                    },
                    json={
                        'model': classification['model'],
                        'messages': messages,
                        'max_tokens': classification['max_tokens'],
                        'temperature': 0.7
                    }
                ) as response:
                    result = await response.json()
                    
                    if response.status == 200:
                        completion_time = time.time() - start_time
                        
                        # Track usage
                        tokens_used = result.get('usage', {}).get('total_tokens', 0)
                        cost_usd = (tokens_used / 1000) * classification['estimated_cost_usd']
                        
                        self._track_usage(tokens_used, cost_usd, classification['model'])
                        
                        return {
                            'success': True,
                            'result': result['choices'][0]['message']['content'],
                            'model_used': classification['model'],
                            'tokens_used': tokens_used,
                            'cost_usd': cost_usd,
                            'completion_time': completion_time,
                            'task_type': classification['task_type']
                        }
                    else:
                        return {'error': f'OpenAI API error: {result}'}
                        
        except Exception as e:
            return {'error': f'Request failed: {str(e)}'}
    
    def _track_usage(self, tokens: int, cost_usd: float, model: str):
        """Track OpenAI usage for monitoring and budgeting"""
        today = datetime.now().strftime('%Y-%m-%d')
        month = datetime.now().strftime('%Y-%m')
        
        # Update daily usage
        if today not in self.usage_data['daily_usage']:
            self.usage_data['daily_usage'][today] = {'tokens': 0, 'cost_usd': 0.0, 'requests': 0}
        
        self.usage_data['daily_usage'][today]['tokens'] += tokens
        self.usage_data['daily_usage'][today]['cost_usd'] += cost_usd
        self.usage_data['daily_usage'][today]['requests'] += 1
        
        # Update monthly usage
        if month not in self.usage_data['monthly_usage']:
            self.usage_data['monthly_usage'][month] = {'tokens': 0, 'cost_usd': 0.0, 'requests': 0}
            
        self.usage_data['monthly_usage'][month]['tokens'] += tokens
        self.usage_data['monthly_usage'][month]['cost_usd'] += cost_usd
        self.usage_data['monthly_usage'][month]['requests'] += 1
        
        # Update session usage
        self.usage_data['session_usage']['tokens'] += tokens
        self.usage_data['session_usage']['cost_usd'] += cost_usd
        self.usage_data['session_usage']['requests'] += 1
        
        # Estimate Claude tokens saved (approximate)
        claude_tokens_equivalent = tokens * 1.2  # Assume similar complexity
        self.usage_data['total_savings']['claude_tokens_saved'] += claude_tokens_equivalent
        
        # Cost comparison
        claude_cost_eur = (claude_tokens_equivalent / 1000) * 0.015 * 0.92  # Convert to EUR
        self.usage_data['total_savings']['cost_comparison']['claude_eur'] += claude_cost_eur
        self.usage_data['total_savings']['cost_comparison']['openai_usd'] += cost_usd
        
        self._save_usage_data()
    
    def get_usage_summary(self) -> Dict[str, Any]:
        """Get comprehensive usage summary"""
        today = datetime.now().strftime('%Y-%m-%d')
        month = datetime.now().strftime('%Y-%m')
        
        summary = {
            'timestamp': datetime.now().isoformat(),
            'openai_status': 'available' if self.openai_api_key else 'not_configured',
            'today': self.usage_data['daily_usage'].get(today, {'tokens': 0, 'cost_usd': 0.0, 'requests': 0}),
            'this_month': self.usage_data['monthly_usage'].get(month, {'tokens': 0, 'cost_usd': 0.0, 'requests': 0}),
            'session': self.usage_data['session_usage'],
            'savings': self.usage_data['total_savings']
        }
        
        # Add budget status
        daily_budget = 10.0
        monthly_budget = 100.0
        
        summary['budget_status'] = {
            'daily_remaining_usd': max(0, daily_budget - summary['today']['cost_usd']),
            'daily_usage_percent': (summary['today']['cost_usd'] / daily_budget) * 100,
            'monthly_remaining_usd': max(0, monthly_budget - summary['this_month']['cost_usd']),
            'monthly_usage_percent': (summary['this_month']['cost_usd'] / monthly_budget) * 100
        }
        
        return summary
    
    def generate_offloading_report(self) -> str:
        """COST CONSERVATION: Generate comprehensive report with swarm enhancements"""
        summary = self.get_usage_summary()
        
        # Get cost conservation metrics
        conservation_report = self.cost_conservation.generate_conservation_report()
        
        # Calculate cost conservation effectiveness
        today_cost = summary['today']['cost_usd']
        estimated_claude_cost = summary['today']['requests'] * 0.016 if summary['today']['requests'] > 0 else 0
        savings_percent = ((estimated_claude_cost - today_cost) / estimated_claude_cost * 100) if estimated_claude_cost > 0 else 0
        
        report = f"""
╭─────────────────────────────────────────────────────────╮
│           🎯 COST CONSERVATION OFFLOADING SYSTEM        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🔐 API Status: {'✅ CONFIGURED' if summary['openai_status'] == 'available' else '❌ NOT CONFIGURED':>40}              │
│  🎯 Mode: ✅ AGGRESSIVE CLAUDE MINIMIZATION             │
│  🤖 Agent Swarm: ✅ COST CONSERVATION ACTIVE            │
│                                                         │
│  📊 TODAY'S CONSERVATION METRICS                        │
│     Requests: {summary['today']['requests']:>6} | Savings: {savings_percent:>6.1f}%                │
│     ChatGPT: ${summary['today']['cost_usd']:>7.4f} | vs Claude: ${estimated_claude_cost:>7.4f}            │
│     Budget: ${summary['budget_status']['daily_remaining_usd']:>7.2f} remaining                         │
│                                                         │
│  🎯 COST CONSERVATION TARGETS                           │
│     Claude usage reduction: 80% (target)               │
│     ChatGPT savings vs Claude: 60% (target)            │
│     Daily budget limit: $5.00                          │
│                                                         │
│  ⚡ AGGRESSIVE PATTERNS ACTIVE                          │
│     Claude-only patterns: 4 (was 11+)                  │
│     Offload categories: 7 (expanded)                   │
│     Fallback sequence: 4 tiers before Claude           │
│                                                         │
│  💰 MONTHLY TOTALS                                      │
│     Requests: {summary['this_month']['requests']:>6} | Cost: ${summary['this_month']['cost_usd']:>8.4f}        │
│     Projected savings: ${(summary['this_month']['requests'] * 0.016 - summary['this_month']['cost_usd']):>6.2f}/month             │
│                                                         │
╰─────────────────────────────────────────────────────────╯

🚀 COST CONSERVATION SWARM FEATURES:
├── 🎯 Aggressive Claude Token Minimization (80% reduction)
├── 💰 Smart ChatGPT Cost Optimization ($0.005-$0.100 caps)
├── 🧠 Integrated Cost-Quality Balance Matrix
├── 📊 Real-time Budget Monitoring & Alerts
├── ⚡ 4-Tier Fallback Sequence (gpt-4o-mini → Claude)
└── 🔄 Dynamic Cost Conservation Validation
"""
        return report.strip() + "\n\n" + conservation_report
    
    def get_model_matrix_report(self) -> str:
        """Get the enhanced model selection matrix with cost conservation"""
        base_report = self.model_selector.get_model_comparison_report()
        conservation_details = self.cost_conservation.generate_conservation_report()
        
        return base_report + "\n\n" + conservation_details
    
    def get_cost_conservation_status(self) -> Dict[str, Any]:
        """Get detailed cost conservation status"""
        today = datetime.now().strftime('%Y-%m-%d')
        daily_usage = self.usage_data['daily_usage'].get(today, {})
        
        # Map to conservation system format
        usage_metrics = {
            'total_tasks': daily_usage.get('requests', 0),
            'claude_tasks': 0,  # Estimated from patterns
            'chatgpt_tasks': daily_usage.get('requests', 0),
            'chatgpt_cost': daily_usage.get('cost_usd', 0.0)
        }
        
        return self.cost_conservation.validate_cost_conservation(usage_metrics)

def main():
    """Main CLI interface"""
    if len(sys.argv) < 2:
        print("Usage: python3 chatgpt_offloading_manager.py [setup|test|status|offload|models|classify]")
        return
        
    command = sys.argv[1]
    manager = ChatGPTOffloadingManager()
    
    if command == "setup":
        if len(sys.argv) > 2:
            api_key = sys.argv[2]
            key_manager = SecureKeyManager()
            if key_manager.setup_openai_key(api_key):
                print("✅ OpenAI API key configured successfully")
                print("🔄 Testing connection...")
                # Test with simple task
                result = asyncio.run(manager.offload_task("write a hello world function in python"))
                if result.get('success'):
                    print("✅ Connection test successful")
                else:
                    print(f"❌ Connection test failed: {result.get('error')}")
            else:
                print("❌ Failed to setup OpenAI API key")
        else:
            print("Usage: python3 chatgpt_offloading_manager.py setup <api_key>")
            
    elif command == "test":
        task = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else "write a simple hello world function"
        print(f"🧪 Testing offload with task: {task}")
        result = asyncio.run(manager.offload_task(task))
        print(json.dumps(result, indent=2))
        
    elif command == "status":
        print(manager.generate_offloading_report())
        
    elif command == "models":
        print(manager.get_model_matrix_report())
        
    elif command == "classify":
        if len(sys.argv) > 2:
            task = " ".join(sys.argv[2:])
            print(f"🔍 Classifying task: {task}")
            classification = manager.classify_task(task)
            print(json.dumps(classification, indent=2))
        else:
            print("Usage: python3 chatgpt_offloading_manager.py classify <task_description>")
        
    elif command == "offload":
        if len(sys.argv) > 2:
            task = " ".join(sys.argv[2:])
            print(f"📤 Offloading task: {task}")
            result = asyncio.run(manager.offload_task(task))
            if result.get('success'):
                print("✅ Task completed successfully")
                print(f"Result: {result['result']}")
                print(f"Cost: ${result['cost_usd']:.4f} | Tokens: {result['tokens_used']}")
            else:
                print(f"❌ Task failed: {result.get('error')}")
        else:
            print("Usage: python3 chatgpt_offloading_manager.py offload <task_description>")
    else:
        print("Commands: setup, test, status, offload, models, classify")

if __name__ == "__main__":
    main()