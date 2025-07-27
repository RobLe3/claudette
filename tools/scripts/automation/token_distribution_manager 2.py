#!/usr/bin/env python3
"""
Token Distribution Manager - Intelligent load balancing between Claude and ChatGPT
Implements 70% ChatGPT / 30% Claude distribution with adaptive optimization
"""

import asyncio
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from pathlib import Path
import openai
from secure_key_manager import SecureKeyManager

@dataclass
class TaskMetrics:
    """Metrics for task execution"""
    task_id: str
    model_used: str
    tokens_used: int
    execution_time: float
    cost_usd: float
    quality_score: float
    success: bool
    timestamp: str

@dataclass
class DistributionConfig:
    """Configuration for token distribution"""
    chatgpt_target_percent: float = 70.0
    claude_target_percent: float = 30.0
    claude_token_limit_daily: int = 100000  # Conservative limit
    chatgpt_budget_daily_usd: float = 10.0
    adaptation_factor: float = 0.1  # How quickly to adapt distribution
    quality_threshold: float = 0.8  # Minimum quality score
    
class TokenDistributionManager:
    """Manages intelligent token distribution between Claude and ChatGPT"""
    
    def __init__(self):
        self.config = DistributionConfig()
        self.key_manager = SecureKeyManager()
        self.metrics_file = Path.home() / '.claude' / 'token_distribution_metrics.json'
        self.metrics_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Initialize OpenAI client
        self.openai_key = self.key_manager.retrieve_api_key('openai')
        if not self.openai_key:
            raise ValueError("OpenAI API key not found. Please run: python3 secure_key_manager.py setup-openai <key>")
        
        self.openai_client = openai.OpenAI(api_key=self.openai_key)
        
        # Load historical metrics
        self.metrics_history = self.load_metrics()
        
        # Current session tracking
        self.session_metrics = {
            'session_start': datetime.now().isoformat(),
            'claude_tokens_used': 0,
            'chatgpt_tokens_used': 0,
            'claude_cost_eur': 0.0,
            'chatgpt_cost_usd': 0.0,
            'tasks_completed': 0,
            'claude_tasks': 0,
            'chatgpt_tasks': 0,
            'avg_quality_claude': 0.0,
            'avg_quality_chatgpt': 0.0,
            'adaptation_events': []
        }
        
        print("🎯 Token Distribution Manager initialized")
        print(f"📊 Target distribution: {self.config.chatgpt_target_percent}% ChatGPT, {self.config.claude_target_percent}% Claude")
        
    def load_metrics(self) -> List[TaskMetrics]:
        """Load historical metrics from file"""
        try:
            if self.metrics_file.exists():
                with open(self.metrics_file, 'r') as f:
                    data = json.load(f)
                    return [TaskMetrics(**item) for item in data.get('metrics', [])]
            return []
        except Exception as e:
            print(f"⚠️ Failed to load metrics: {e}")
            return []
    
    def save_metrics(self):
        """Save metrics to file"""
        try:
            data = {
                'metrics': [asdict(metric) for metric in self.metrics_history],
                'session_metrics': self.session_metrics,
                'config': asdict(self.config),
                'last_updated': datetime.now().isoformat()
            }
            with open(self.metrics_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"⚠️ Failed to save metrics: {e}")
    
    def get_available_chatgpt_models(self) -> List[str]:
        """Get list of available ChatGPT models"""
        try:
            models = self.openai_client.models.list()
            chat_models = [
                model.id for model in models.data 
                if 'gpt' in model.id and any(x in model.id for x in ['3.5', '4', '4o'])
            ]
            return sorted(chat_models, key=self._model_priority)
        except Exception as e:
            print(f"⚠️ Failed to get ChatGPT models: {e}")
            return ['gpt-3.5-turbo']  # Fallback
    
    def _model_priority(self, model_id: str) -> int:
        """Priority order for model selection (lower = higher priority)"""
        priorities = {
            'gpt-4o': 1,
            'gpt-4o-mini': 2, 
            'gpt-4': 3,
            'gpt-4-turbo': 4,
            'gpt-3.5-turbo': 5
        }
        
        for key, priority in priorities.items():
            if key in model_id:
                return priority
        return 10  # Unknown models get low priority
    
    def select_optimal_model(self, task_description: str, complexity: str = "medium") -> Tuple[str, str]:
        """
        Select optimal model (Claude or ChatGPT) for a task
        Returns: (platform, model_name)
        """
        
        # Get current distribution
        current_distribution = self.get_current_distribution()
        chatgpt_percent = current_distribution['chatgpt_percent']
        claude_percent = current_distribution['claude_percent']
        
        # Check constraints
        claude_available = self.is_claude_available()
        chatgpt_available = self.is_chatgpt_available()
        
        # Task complexity analysis
        complexity_score = self._analyze_task_complexity(task_description, complexity)
        
        # Decision logic
        should_use_chatgpt = (
            chatgpt_available and
            (chatgpt_percent < self.config.chatgpt_target_percent or
             complexity_score < 0.7 or  # Simple tasks prefer ChatGPT
             not claude_available)
        )
        
        should_use_claude = (
            claude_available and
            (claude_percent < self.config.claude_target_percent or
             complexity_score > 0.8 or  # Complex tasks prefer Claude
             not chatgpt_available)
        )
        
        # Make decision with preference for target distribution
        if should_use_chatgpt and not (should_use_claude and claude_percent < 20):
            model = self._select_chatgpt_model(complexity_score)
            return ("chatgpt", model)
        elif claude_available:
            return ("claude", "claude-3-sonnet")
        elif chatgpt_available:
            model = self._select_chatgpt_model(complexity_score)
            return ("chatgpt", model)
        else:
            raise RuntimeError("No available models for task execution")
    
    def _analyze_task_complexity(self, description: str, complexity: str) -> float:
        """Analyze task complexity score (0.0 = simple, 1.0 = complex)"""
        
        # Base complexity from parameter
        complexity_map = {
            'simple': 0.3,
            'medium': 0.6, 
            'complex': 0.9,
            'critical': 1.0
        }
        base_score = complexity_map.get(complexity.lower(), 0.6)
        
        # Analyze description for complexity indicators
        complex_keywords = [
            'implement', 'architecture', 'system', 'optimize', 'analyze',
            'neural', 'learning', 'algorithm', 'performance', 'benchmark',
            'security', 'validation', 'comprehensive', 'advanced'
        ]
        
        simple_keywords = [
            'read', 'list', 'check', 'status', 'simple', 'basic',
            'get', 'show', 'display', 'format', 'print'
        ]
        
        description_lower = description.lower()
        complex_count = sum(1 for kw in complex_keywords if kw in description_lower)
        simple_count = sum(1 for kw in simple_keywords if kw in description_lower)
        
        # Adjust base score
        adjustment = (complex_count - simple_count) * 0.1
        final_score = max(0.0, min(1.0, base_score + adjustment))
        
        return final_score
    
    def _select_chatgpt_model(self, complexity_score: float) -> str:
        """Select best ChatGPT model based on complexity"""
        available_models = self.get_available_chatgpt_models()
        
        if complexity_score > 0.8:
            # Complex tasks: prefer GPT-4 variants
            for model in ['gpt-4o', 'gpt-4', 'gpt-4-turbo']:
                if any(model in m for m in available_models):
                    return next(m for m in available_models if model in m)
        
        elif complexity_score > 0.5:
            # Medium tasks: prefer balanced models
            for model in ['gpt-4o-mini', 'gpt-3.5-turbo']:
                if any(model in m for m in available_models):
                    return next(m for m in available_models if model in m)
        
        else:
            # Simple tasks: prefer efficient models
            for model in ['gpt-3.5-turbo', 'gpt-4o-mini']:
                if any(model in m for m in available_models):
                    return next(m for m in available_models if model in m)
        
        # Fallback to first available
        return available_models[0] if available_models else 'gpt-3.5-turbo'
    
    def is_claude_available(self) -> bool:
        """Check if Claude is available for use"""
        daily_tokens = self.get_daily_claude_tokens()
        return daily_tokens < self.config.claude_token_limit_daily
    
    def is_chatgpt_available(self) -> bool:
        """Check if ChatGPT is available for use"""
        daily_cost = self.get_daily_chatgpt_cost()
        return daily_cost < self.config.chatgpt_budget_daily_usd
    
    def get_daily_claude_tokens(self) -> int:
        """Get Claude tokens used today"""
        today = datetime.now().date()
        daily_metrics = [
            m for m in self.metrics_history 
            if datetime.fromisoformat(m.timestamp).date() == today and m.model_used.startswith('claude')
        ]
        return sum(m.tokens_used for m in daily_metrics) + self.session_metrics['claude_tokens_used']
    
    def get_daily_chatgpt_cost(self) -> float:
        """Get ChatGPT cost spent today"""
        today = datetime.now().date()
        daily_metrics = [
            m for m in self.metrics_history 
            if datetime.fromisoformat(m.timestamp).date() == today and m.model_used.startswith('gpt')
        ]
        return sum(m.cost_usd for m in daily_metrics) + self.session_metrics['chatgpt_cost_usd']
    
    def get_current_distribution(self) -> Dict[str, float]:
        """Get current actual distribution"""
        total_tasks = self.session_metrics['tasks_completed']
        if total_tasks == 0:
            return {'chatgpt_percent': 0.0, 'claude_percent': 0.0}
        
        chatgpt_percent = (self.session_metrics['chatgpt_tasks'] / total_tasks) * 100
        claude_percent = (self.session_metrics['claude_tasks'] / total_tasks) * 100
        
        return {
            'chatgpt_percent': chatgpt_percent,
            'claude_percent': claude_percent
        }
    
    async def execute_chatgpt_task(self, prompt: str, model: str = None) -> Dict[str, Any]:
        """Execute task using ChatGPT"""
        
        if model is None:
            complexity_score = self._analyze_task_complexity(prompt, "medium")
            model = self._select_chatgpt_model(complexity_score)
        
        start_time = time.time()
        
        try:
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.openai_client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.7
                )
            )
            
            execution_time = time.time() - start_time
            
            # Calculate metrics
            tokens_used = response.usage.total_tokens
            cost_usd = self._calculate_chatgpt_cost(model, tokens_used)
            
            # Record metrics
            task_metrics = TaskMetrics(
                task_id=f"chatgpt_{int(time.time())}",
                model_used=model,
                tokens_used=tokens_used,
                execution_time=execution_time,
                cost_usd=cost_usd,
                quality_score=0.85,  # Default good quality
                success=True,
                timestamp=datetime.now().isoformat()
            )
            
            self._record_task_completion(task_metrics, "chatgpt")
            
            return {
                'success': True,
                'result': response.choices[0].message.content,
                'model': model,
                'tokens_used': tokens_used,
                'cost_usd': cost_usd,
                'execution_time': execution_time
            }
            
        except Exception as e:
            execution_time = time.time() - start_time
            print(f"❌ ChatGPT task failed: {e}")
            
            # Record failure
            task_metrics = TaskMetrics(
                task_id=f"chatgpt_failed_{int(time.time())}",
                model_used=model,
                tokens_used=0,
                execution_time=execution_time,
                cost_usd=0.0,
                quality_score=0.0,
                success=False,
                timestamp=datetime.now().isoformat()
            )
            
            self._record_task_completion(task_metrics, "chatgpt")
            
            return {
                'success': False,
                'error': str(e),
                'model': model,
                'execution_time': execution_time
            }
    
    def _calculate_chatgpt_cost(self, model: str, tokens: int) -> float:
        """Calculate cost for ChatGPT usage"""
        
        # Pricing per 1M tokens (approximate)
        pricing = {
            'gpt-4o': {'input': 2.50, 'output': 10.00},
            'gpt-4o-mini': {'input': 0.15, 'output': 0.60},
            'gpt-4': {'input': 30.00, 'output': 60.00},
            'gpt-4-turbo': {'input': 10.00, 'output': 30.00},
            'gpt-3.5-turbo': {'input': 0.50, 'output': 1.50}
        }
        
        # Find matching model pricing
        model_pricing = None
        for key, price in pricing.items():
            if key in model:
                model_pricing = price
                break
        
        if not model_pricing:
            model_pricing = pricing['gpt-3.5-turbo']  # Fallback
        
        # Estimate 70% input, 30% output split
        input_tokens = tokens * 0.7
        output_tokens = tokens * 0.3
        
        cost = (
            (input_tokens / 1_000_000) * model_pricing['input'] +
            (output_tokens / 1_000_000) * model_pricing['output']
        )
        
        return cost
    
    def _record_task_completion(self, metrics: TaskMetrics, platform: str):
        """Record task completion metrics"""
        
        # Add to history
        self.metrics_history.append(metrics)
        
        # Update session metrics
        self.session_metrics['tasks_completed'] += 1
        
        if platform == "chatgpt":
            self.session_metrics['chatgpt_tasks'] += 1
            self.session_metrics['chatgpt_tokens_used'] += metrics.tokens_used
            self.session_metrics['chatgpt_cost_usd'] += metrics.cost_usd
        else:
            self.session_metrics['claude_tasks'] += 1
            self.session_metrics['claude_tokens_used'] += metrics.tokens_used
            # Estimate Claude cost (€0.015 per 1K tokens for Sonnet)
            claude_cost_eur = (metrics.tokens_used / 1000) * 0.015
            self.session_metrics['claude_cost_eur'] += claude_cost_eur
        
        # Check if adaptation is needed
        self._check_adaptation_needed()
        
        # Save metrics
        self.save_metrics()
    
    def _check_adaptation_needed(self):
        """Check if distribution adaptation is needed"""
        
        current_dist = self.get_current_distribution()
        chatgpt_diff = abs(current_dist['chatgpt_percent'] - self.config.chatgpt_target_percent)
        claude_diff = abs(current_dist['claude_percent'] - self.config.claude_target_percent)
        
        # If deviation is > 20%, trigger adaptation
        if chatgpt_diff > 20 or claude_diff > 20:
            self._adapt_distribution(current_dist)
    
    def _adapt_distribution(self, current_dist: Dict[str, float]):
        """Adapt distribution strategy based on performance"""
        
        adaptation_event = {
            'timestamp': datetime.now().isoformat(),
            'current_distribution': current_dist,
            'target_distribution': {
                'chatgpt_percent': self.config.chatgpt_target_percent,
                'claude_percent': self.config.claude_target_percent
            },
            'action': 'rebalance'
        }
        
        # Adjust targets slightly based on performance
        chatgpt_quality = self.session_metrics.get('avg_quality_chatgpt', 0.8)
        claude_quality = self.session_metrics.get('avg_quality_claude', 0.8)
        
        if chatgpt_quality > claude_quality + 0.1:
            # ChatGPT performing better, increase its allocation
            self.config.chatgpt_target_percent = min(80.0, self.config.chatgpt_target_percent + 5.0)
            self.config.claude_target_percent = 100.0 - self.config.chatgpt_target_percent
            adaptation_event['action'] = 'increase_chatgpt'
            
        elif claude_quality > chatgpt_quality + 0.1:
            # Claude performing better, increase its allocation  
            self.config.claude_target_percent = min(50.0, self.config.claude_target_percent + 5.0)
            self.config.chatgpt_target_percent = 100.0 - self.config.claude_target_percent
            adaptation_event['action'] = 'increase_claude'
        
        self.session_metrics['adaptation_events'].append(adaptation_event)
        
        print(f"🔄 Distribution adapted: {self.config.chatgpt_target_percent:.1f}% ChatGPT, {self.config.claude_target_percent:.1f}% Claude")
    
    def get_status_report(self) -> Dict[str, Any]:
        """Generate comprehensive status report"""
        
        current_dist = self.get_current_distribution()
        
        return {
            'session_summary': {
                'session_start': self.session_metrics['session_start'],
                'tasks_completed': self.session_metrics['tasks_completed'],
                'current_distribution': current_dist,
                'target_distribution': {
                    'chatgpt_percent': self.config.chatgpt_target_percent,
                    'claude_percent': self.config.claude_target_percent
                }
            },
            'resource_usage': {
                'claude': {
                    'tokens_used': self.session_metrics['claude_tokens_used'],
                    'cost_eur': self.session_metrics['claude_cost_eur'],
                    'daily_tokens': self.get_daily_claude_tokens(),
                    'daily_limit': self.config.claude_token_limit_daily,
                    'available': self.is_claude_available()
                },
                'chatgpt': {
                    'tokens_used': self.session_metrics['chatgpt_tokens_used'],
                    'cost_usd': self.session_metrics['chatgpt_cost_usd'],
                    'daily_cost': self.get_daily_chatgpt_cost(),
                    'daily_budget': self.config.chatgpt_budget_daily_usd,
                    'available': self.is_chatgpt_available()
                }
            },
            'adaptation_events': len(self.session_metrics['adaptation_events']),
            'recommendations': self._generate_recommendations()
        }
    
    def _generate_recommendations(self) -> List[str]:
        """Generate optimization recommendations"""
        recommendations = []
        
        current_dist = self.get_current_distribution()
        
        # Distribution recommendations
        if current_dist['chatgpt_percent'] < 60:
            recommendations.append("Consider increasing ChatGPT usage for better cost efficiency")
        
        if current_dist['claude_percent'] > 40:
            recommendations.append("High Claude usage detected - monitor token limits")
        
        # Resource recommendations
        if self.get_daily_claude_tokens() > self.config.claude_token_limit_daily * 0.8:
            recommendations.append("⚠️ Approaching Claude daily token limit")
        
        if self.get_daily_chatgpt_cost() > self.config.chatgpt_budget_daily_usd * 0.8:
            recommendations.append("⚠️ Approaching ChatGPT daily budget limit")
        
        # Performance recommendations
        if len(self.session_metrics['adaptation_events']) > 3:
            recommendations.append("Frequent adaptations detected - consider adjusting base distribution")
        
        return recommendations

async def main():
    """Test the token distribution manager"""
    
    try:
        manager = TokenDistributionManager()
        
        print("\n🧪 Testing Token Distribution Manager...")
        
        # Test model selection
        print("\n📋 Testing model selection:")
        for task_desc, complexity in [
            ("Simple status check", "simple"),
            ("Implement neural network", "complex"),
            ("Format output data", "simple"),
            ("Optimize system performance", "complex")
        ]:
            platform, model = manager.select_optimal_model(task_desc, complexity)
            print(f"  Task: '{task_desc}' → {platform}:{model}")
        
        # Test ChatGPT execution
        print("\n🤖 Testing ChatGPT execution:")
        result = await manager.execute_chatgpt_task(
            "Generate a brief status message for a working system",
            "gpt-3.5-turbo"
        )
        
        if result['success']:
            print(f"✅ ChatGPT task successful:")
            print(f"   Model: {result['model']}")
            print(f"   Tokens: {result['tokens_used']}")
            print(f"   Cost: ${result['cost_usd']:.4f}")
            print(f"   Result: {result['result'][:100]}...")
        else:
            print(f"❌ ChatGPT task failed: {result['error']}")
        
        # Show status report
        print("\n📊 Status Report:")
        status = manager.get_status_report()
        print(json.dumps(status, indent=2))
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())