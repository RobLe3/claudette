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
sys.path.append(str(Path(__file__).parent))
from secure_key_manager import SecureKeyManager
from claude_integration_coordinator import ClaudeIntegrationCoordinator

class ChatGPTOffloadingManager:
    """Manage dynamic offloading of tasks to ChatGPT API"""
    
    def __init__(self):
        self.key_manager = SecureKeyManager()
        self.coordinator = ClaudeIntegrationCoordinator()
        self.openai_api_key = self.key_manager.retrieve_api_key('openai')
        
        # Task classification patterns
        self.offload_patterns = {
            'simple_code_generation': {
                'patterns': [r'write.*function', r'create.*script', r'generate.*code'],
                'model': 'gpt-3.5-turbo',
                'max_tokens': 1000,
                'cost_per_1k_tokens': 0.0005  # USD
            },
            'text_processing': {
                'patterns': [r'summarize', r'extract.*from', r'parse.*text'],
                'model': 'gpt-3.5-turbo', 
                'max_tokens': 500,
                'cost_per_1k_tokens': 0.0005
            },
            'documentation_generation': {
                'patterns': [r'write.*docs', r'create.*readme', r'document.*code'],
                'model': 'gpt-3.5-turbo',
                'max_tokens': 1500,
                'cost_per_1k_tokens': 0.0005
            },
            'complex_analysis': {
                'patterns': [r'analyze.*architecture', r'review.*code', r'optimize.*performance'],
                'model': 'gpt-4',
                'max_tokens': 2000,
                'cost_per_1k_tokens': 0.03
            },
            'creative_tasks': {
                'patterns': [r'brainstorm', r'suggest.*names', r'creative.*solutions'],
                'model': 'gpt-4',
                'max_tokens': 1000,
                'cost_per_1k_tokens': 0.03
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
    
    def classify_task(self, task_description: str) -> Optional[Dict[str, Any]]:
        """Classify task to determine if it should be offloaded to ChatGPT"""
        task_lower = task_description.lower()
        
        for task_type, config in self.offload_patterns.items():
            for pattern in config['patterns']:
                if re.search(pattern, task_lower):
                    return {
                        'task_type': task_type,
                        'model': config['model'],
                        'max_tokens': config['max_tokens'],
                        'estimated_cost_usd': config['cost_per_1k_tokens'],
                        'confidence': 0.8,
                        'recommendation': 'offload' if self._should_offload(config) else 'keep_local'
                    }
        
        return None
    
    def _should_offload(self, config: Dict[str, Any]) -> bool:
        """Determine if task should be offloaded based on usage limits and costs"""
        if not self.openai_api_key:
            return False
            
        # Check daily budget
        today = datetime.now().strftime('%Y-%m-%d')
        daily_spent = self.usage_data['daily_usage'].get(today, {}).get('cost_usd', 0.0)
        daily_budget = 10.0  # $10/day default
        
        if daily_spent + config['cost_per_1k_tokens'] > daily_budget:
            return False
            
        # Check if Claude is near limits
        claude_status = self.coordinator.status_manager.get_claude_pro_status()
        if claude_status and claude_status['daily_usage_percent'] > 70:  # Offload if Claude > 70%
            return True
            
        # Cost-benefit analysis
        claude_cost_per_1k = 0.015  # Claude cost per 1k tokens in USD equivalent
        if config['cost_per_1k_tokens'] < claude_cost_per_1k * 0.5:  # Offload if 50% cheaper
            return True
            
        return False
    
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
        """Generate comprehensive offloading status report"""
        summary = self.get_usage_summary()
        
        report = f"""
╭─────────────────────────────────────────────────────────╮
│               🤖 CHATGPT OFFLOADING STATUS               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🔐 API Status: {'✅ CONFIGURED' if summary['openai_status'] == 'available' else '❌ NOT CONFIGURED':>40}              │
│                                                         │
│  📊 TODAY'S USAGE                                       │
│     Requests: {summary['today']['requests']:>6} | Tokens: {summary['today']['tokens']:>8}           │
│     Cost: ${summary['today']['cost_usd']:>8.4f} | Budget: ${summary['budget_status']['daily_remaining_usd']:>6.2f} left     │
│                                                         │
│  📈 MONTHLY USAGE                                       │
│     Requests: {summary['this_month']['requests']:>6} | Tokens: {summary['this_month']['tokens']:>8}           │
│     Cost: ${summary['this_month']['cost_usd']:>8.4f} | Budget: ${summary['budget_status']['monthly_remaining_usd']:>6.2f} left     │
│                                                         │
│  💰 COST COMPARISON                                     │
│     OpenAI: ${summary['savings']['cost_comparison']['openai_usd']:>8.4f}                            │
│     Claude: €{summary['savings']['cost_comparison']['claude_eur']:>8.4f}                            │
│     Saved: {summary['savings']['claude_tokens_saved']:>8.0f} Claude tokens                    │
│                                                         │
│  🎯 SESSION                                             │
│     Requests: {summary['session']['requests']:>6} | Cost: ${summary['session']['cost_usd']:>8.4f}        │
│                                                         │
╰─────────────────────────────────────────────────────────╯
"""
        return report.strip()

def main():
    """Main CLI interface"""
    if len(sys.argv) < 2:
        print("Usage: python3 chatgpt_offloading_manager.py [setup|test|status|offload]")
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
        print("Commands: setup, test, status, offload")

if __name__ == "__main__":
    main()