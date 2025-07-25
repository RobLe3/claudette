#!/usr/bin/env python3
"""
Intelligent Swarm Coordinator - Implements 70% ChatGPT / 30% Claude distribution
with real-time verification and adaptive optimization
"""

import asyncio
import json
import time
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import sys
import os

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from token_distribution_manager import TokenDistributionManager
from claude_usage_monitor import ClaudeUsageMonitor

class IntelligentSwarmCoordinator:
    """Coordinates swarm execution with intelligent model selection and usage verification"""
    
    def __init__(self):
        self.token_manager = TokenDistributionManager()
        self.usage_monitor = ClaudeUsageMonitor()
        
        # Swarm configuration
        self.swarm_config = {
            'target_distribution': {
                'chatgpt_percent': 70.0,
                'claude_percent': 30.0
            },
            'task_routing': {
                'simple_tasks_to_chatgpt': True,
                'complex_tasks_prefer_claude': True,
                'adaptive_routing': True
            },
            'verification': {
                'monitor_claude_usage': True,
                'enforce_limits': True,
                'real_time_adaptation': True
            }
        }
        
        # Task execution tracking
        self.execution_history = []
        self.current_session = {
            'session_id': f"swarm_{int(time.time())}",
            'start_time': datetime.now().isoformat(),
            'tasks_executed': 0,
            'claude_tasks': 0,
            'chatgpt_tasks': 0,
            'cost_savings_eur': 0.0,
            'adaptations_made': 0
        }
        
        print("🎯 Intelligent Swarm Coordinator initialized")
        print(f"📊 Target: {self.swarm_config['target_distribution']['chatgpt_percent']}% ChatGPT, {self.swarm_config['target_distribution']['claude_percent']}% Claude")
        
        # Start monitoring
        self.usage_monitor.start_monitoring()
    
    async def execute_swarm_task(self, task_description: str, complexity: str = "medium", 
                                task_type: str = "general") -> Dict[str, Any]:
        """
        Execute a task using the optimal model based on distribution strategy
        """
        
        task_id = f"task_{int(time.time())}_{len(self.execution_history)}"
        start_time = time.time()
        
        print(f"\n🎯 Executing swarm task: {task_id}")
        print(f"📝 Description: {task_description[:100]}...")
        print(f"🔧 Complexity: {complexity}")
        
        try:
            # Step 1: Analyze task and select optimal model
            platform, model = await self._select_optimal_platform(
                task_description, complexity, task_type
            )
            
            print(f"🤖 Selected platform: {platform} ({model})")
            
            # Step 2: Verify Claude usage if Claude is selected
            if platform == "claude":
                tokens_estimated = self._estimate_task_tokens(task_description, complexity)
                should_use_claude = await self.usage_monitor.record_claude_usage(
                    action=f"swarm_task_{task_type}",
                    tokens_estimated=tokens_estimated,
                    details={
                        'task_id': task_id,
                        'complexity': complexity,
                        'description_length': len(task_description)
                    }
                )
                
                if not should_use_claude:
                    print("⚠️ Claude usage limit reached, switching to ChatGPT")
                    platform = "chatgpt"
                    model = self.token_manager._select_chatgpt_model(
                        self.token_manager._analyze_task_complexity(task_description, complexity)
                    )
                    self.current_session['adaptations_made'] += 1
            
            # Step 3: Execute task using selected platform
            result = await self._execute_on_platform(
                platform, model, task_description, task_id
            )
            
            # Step 4: Record execution and update metrics
            execution_time = time.time() - start_time
            await self._record_task_execution(
                task_id, platform, model, task_description, complexity,
                execution_time, result
            )
            
            # Step 5: Check if adaptation is needed
            await self._check_distribution_adaptation()
            
            return {
                'task_id': task_id,
                'platform': platform,
                'model': model,
                'success': result.get('success', False),
                'result': result.get('result', ''),
                'execution_time': execution_time,
                'cost_info': result.get('cost_info', {}),
                'verification_status': 'verified'
            }
            
        except Exception as e:
            execution_time = time.time() - start_time
            print(f"❌ Task execution failed: {e}")
            
            return {
                'task_id': task_id,
                'platform': 'unknown',
                'model': 'unknown',
                'success': False,
                'error': str(e),
                'execution_time': execution_time,
                'verification_status': 'failed'
            }
    
    async def _select_optimal_platform(self, task_description: str, complexity: str, 
                                     task_type: str) -> Tuple[str, str]:
        """Select optimal platform and model for task execution"""
        
        # Get current distribution status
        current_dist = self.token_manager.get_current_distribution()
        chatgpt_percent = current_dist['chatgpt_percent']
        claude_percent = current_dist['claude_percent']
        
        # Analyze task characteristics
        complexity_score = self.token_manager._analyze_task_complexity(task_description, complexity)
        
        # Task type preferences
        task_preferences = {
            'code_generation': 'chatgpt',
            'analysis': 'claude',
            'implementation': 'chatgpt',
            'research': 'claude',
            'optimization': 'claude',
            'testing': 'chatgpt',
            'validation': 'chatgpt',
            'documentation': 'chatgpt'
        }
        
        preferred_platform = task_preferences.get(task_type, None)
        
        # Decision logic with multiple factors
        factors = {
            'distribution_pressure': self._calculate_distribution_pressure(chatgpt_percent, claude_percent),
            'complexity_preference': self._calculate_complexity_preference(complexity_score),
            'task_type_preference': preferred_platform,
            'resource_availability': self._check_resource_availability()
        }
        
        # Make decision
        platform, model = self._make_platform_decision(factors, task_description, complexity)
        
        print(f"🧠 Decision factors: {factors}")
        return platform, model
    
    def _calculate_distribution_pressure(self, chatgpt_percent: float, claude_percent: float) -> Dict[str, float]:
        """Calculate pressure to rebalance distribution"""
        
        target_chatgpt = self.swarm_config['target_distribution']['chatgpt_percent']
        target_claude = self.swarm_config['target_distribution']['claude_percent']
        
        chatgpt_pressure = max(0, target_chatgpt - chatgpt_percent) / 100
        claude_pressure = max(0, target_claude - claude_percent) / 100
        
        return {
            'chatgpt_pressure': chatgpt_pressure,
            'claude_pressure': claude_pressure
        }
    
    def _calculate_complexity_preference(self, complexity_score: float) -> str:
        """Determine platform preference based on complexity"""
        
        if complexity_score > 0.8:
            return 'claude'  # Complex tasks prefer Claude
        elif complexity_score < 0.4:
            return 'chatgpt'  # Simple tasks prefer ChatGPT
        else:
            return 'neutral'  # Medium complexity can use either
    
    def _check_resource_availability(self) -> Dict[str, bool]:
        """Check resource availability for both platforms"""
        
        return {
            'claude_available': self.usage_monitor._should_continue_with_claude(),
            'chatgpt_available': self.token_manager.is_chatgpt_available()
        }
    
    def _make_platform_decision(self, factors: Dict[str, Any], task_description: str, 
                               complexity: str) -> Tuple[str, str]:
        """Make final platform decision based on all factors"""
        
        # Force ChatGPT if Claude not available
        if not factors['resource_availability']['claude_available']:
            model = self.token_manager._select_chatgpt_model(
                self.token_manager._analyze_task_complexity(task_description, complexity)
            )
            return 'chatgpt', model
        
        # Force Claude if ChatGPT not available  
        if not factors['resource_availability']['chatgpt_available']:
            return 'claude', 'claude-3-sonnet'
        
        # Calculate preference scores
        chatgpt_score = 0.0
        claude_score = 0.0
        
        # Distribution pressure
        chatgpt_score += factors['distribution_pressure']['chatgpt_pressure'] * 2.0
        claude_score += factors['distribution_pressure']['claude_pressure'] * 2.0
        
        # Complexity preference
        if factors['complexity_preference'] == 'chatgpt':
            chatgpt_score += 1.0
        elif factors['complexity_preference'] == 'claude':
            claude_score += 1.0
        
        # Task type preference
        if factors['task_type_preference'] == 'chatgpt':
            chatgpt_score += 0.5
        elif factors['task_type_preference'] == 'claude':
            claude_score += 0.5
        
        # Default bias toward target distribution
        chatgpt_score += 0.7  # Default 70% bias
        claude_score += 0.3   # Default 30% bias
        
        # Make decision
        if chatgpt_score > claude_score:
            model = self.token_manager._select_chatgpt_model(
                self.token_manager._analyze_task_complexity(task_description, complexity)
            )
            return 'chatgpt', model
        else:
            return 'claude', 'claude-3-sonnet'
    
    async def _execute_on_platform(self, platform: str, model: str, 
                                  task_description: str, task_id: str) -> Dict[str, Any]:
        """Execute task on selected platform"""
        
        if platform == "chatgpt":
            return await self._execute_chatgpt_task(model, task_description, task_id)
        else:
            return await self._execute_claude_task(model, task_description, task_id)
    
    async def _execute_chatgpt_task(self, model: str, task_description: str, 
                                   task_id: str) -> Dict[str, Any]:
        """Execute task using ChatGPT"""
        
        try:
            result = await self.token_manager.execute_chatgpt_task(task_description, model)
            
            return {
                'success': result['success'],
                'result': result.get('result', ''),
                'cost_info': {
                    'platform': 'chatgpt',
                    'model': result['model'],
                    'tokens_used': result.get('tokens_used', 0),
                    'cost_usd': result.get('cost_usd', 0.0)
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'cost_info': {'platform': 'chatgpt', 'model': model}
            }
    
    async def _execute_claude_task(self, model: str, task_description: str, 
                                  task_id: str) -> Dict[str, Any]:
        """Execute task using Claude (simulated - in practice this would call Claude API)"""
        
        try:
            # Simulate Claude execution
            tokens_used = self._estimate_task_tokens(task_description, "medium")
            cost_eur = (tokens_used / 1000) * 0.015  # €0.015 per 1K tokens
            
            # Simulate response (in practice, this would be actual Claude API call)
            response = f"Claude response for task: {task_description[:50]}... (simulated)"
            
            return {
                'success': True,
                'result': response,
                'cost_info': {
                    'platform': 'claude',
                    'model': model,
                    'tokens_used': tokens_used,
                    'cost_eur': cost_eur
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'cost_info': {'platform': 'claude', 'model': model}
            }
    
    def _estimate_task_tokens(self, task_description: str, complexity: str) -> int:
        """Estimate tokens needed for task"""
        
        base_tokens = len(task_description.split()) * 1.3  # Word to token ratio
        
        complexity_multipliers = {
            'simple': 1.2,
            'medium': 2.0,
            'complex': 3.5,
            'critical': 5.0
        }
        
        multiplier = complexity_multipliers.get(complexity, 2.0)
        estimated_tokens = int(base_tokens * multiplier)
        
        return max(50, min(estimated_tokens, 2000))  # Cap between 50-2000 tokens
    
    async def _record_task_execution(self, task_id: str, platform: str, model: str,
                                   task_description: str, complexity: str,
                                   execution_time: float, result: Dict[str, Any]):
        """Record task execution for analytics"""
        
        execution_record = {
            'task_id': task_id,
            'timestamp': datetime.now().isoformat(),
            'platform': platform,
            'model': model,
            'task_description': task_description[:200],  # Truncate for storage
            'complexity': complexity,
            'execution_time': execution_time,
            'success': result.get('success', False),
            'cost_info': result.get('cost_info', {}),
            'session_id': self.current_session['session_id']
        }
        
        self.execution_history.append(execution_record)
        
        # Update session metrics
        self.current_session['tasks_executed'] += 1
        if platform == 'claude':
            self.current_session['claude_tasks'] += 1
        else:
            self.current_session['chatgpt_tasks'] += 1
            
            # Calculate cost savings by using ChatGPT instead of Claude
            chatgpt_cost = result.get('cost_info', {}).get('cost_usd', 0.0)
            estimated_claude_cost_eur = self._estimate_task_tokens(task_description, complexity) / 1000 * 0.015
            estimated_claude_cost_usd = estimated_claude_cost_eur * 1.1  # Rough EUR to USD
            
            savings = max(0, estimated_claude_cost_usd - chatgpt_cost)
            self.current_session['cost_savings_eur'] += savings * 0.91  # USD to EUR
        
        print(f"📊 Task recorded: {platform}:{model} ({'✅' if result.get('success') else '❌'})")
    
    async def _check_distribution_adaptation(self):
        """Check if distribution needs adaptation"""
        
        if self.current_session['tasks_executed'] % 5 == 0:  # Check every 5 tasks
            current_dist = self.get_current_distribution()
            target_dist = self.swarm_config['target_distribution']
            
            chatgpt_diff = abs(current_dist['chatgpt_percent'] - target_dist['chatgpt_percent'])
            claude_diff = abs(current_dist['claude_percent'] - target_dist['claude_percent'])
            
            if chatgpt_diff > 15 or claude_diff > 15:  # 15% deviation threshold
                print(f"🔄 Distribution adaptation needed:")
                print(f"   Current: {current_dist['chatgpt_percent']:.1f}% ChatGPT, {current_dist['claude_percent']:.1f}% Claude")
                print(f"   Target: {target_dist['chatgpt_percent']:.1f}% ChatGPT, {target_dist['claude_percent']:.1f}% Claude")
                self.current_session['adaptations_made'] += 1
    
    def get_current_distribution(self) -> Dict[str, float]:
        """Get current actual distribution"""
        
        total_tasks = self.current_session['tasks_executed']
        if total_tasks == 0:
            return {'chatgpt_percent': 0.0, 'claude_percent': 0.0}
        
        chatgpt_percent = (self.current_session['chatgpt_tasks'] / total_tasks) * 100
        claude_percent = (self.current_session['claude_tasks'] / total_tasks) * 100
        
        return {
            'chatgpt_percent': chatgpt_percent,
            'claude_percent': claude_percent
        }
    
    def get_comprehensive_report(self) -> str:
        """Generate comprehensive status report"""
        
        current_dist = self.get_current_distribution()
        usage_summary = self.usage_monitor.get_usage_summary()
        token_status = self.token_manager.get_status_report()
        
        report = f"""
🎯 INTELLIGENT SWARM COORDINATOR REPORT
========================================

📊 SESSION SUMMARY:
   Session ID: {self.current_session['session_id']}
   Duration: {(datetime.now() - datetime.fromisoformat(self.current_session['start_time'])).total_seconds() / 3600:.2f} hours
   Tasks Executed: {self.current_session['tasks_executed']}

📈 CURRENT DISTRIBUTION:
   ChatGPT: {current_dist['chatgpt_percent']:.1f}% ({self.current_session['chatgpt_tasks']} tasks)
   Claude: {current_dist['claude_percent']:.1f}% ({self.current_session['claude_tasks']} tasks)
   
   Target: {self.swarm_config['target_distribution']['chatgpt_percent']}% ChatGPT, {self.swarm_config['target_distribution']['claude_percent']}% Claude

💰 COST OPTIMIZATION:
   Estimated Savings: €{self.current_session['cost_savings_eur']:.4f}
   Adaptations Made: {self.current_session['adaptations_made']}

🔍 CLAUDE USAGE VERIFICATION:
   Session Tokens: {usage_summary['current_usage']['session_tokens']}
   Session Cost: €{usage_summary['current_usage']['session_cost_eur']:.4f}
   Should Continue with Claude: {'✅ YES' if usage_summary['should_use_claude'] else '❌ NO'}
   Offload Recommendations: {usage_summary['offload_recommendations']}

🎯 SYSTEM STATUS:
   Claude Available: {'✅' if usage_summary['should_use_claude'] else '❌'}
   ChatGPT Available: {'✅' if self.token_manager.is_chatgpt_available() else '❌'}
   Distribution On Target: {'✅' if abs(current_dist['chatgpt_percent'] - 70.0) < 10 else '⚠️'}

========================================
"""
        
        return report
    
    async def shutdown(self):
        """Shutdown coordinator and save data"""
        
        print("\n🔄 Shutting down Intelligent Swarm Coordinator...")
        
        # Stop monitoring
        self.usage_monitor.stop_monitoring()
        
        # Save execution history
        history_file = Path.home() / '.claude' / 'swarm_execution_history.json'
        try:
            with open(history_file, 'w') as f:
                json.dump({
                    'session_info': self.current_session,
                    'execution_history': self.execution_history,
                    'final_distribution': self.get_current_distribution(),
                    'shutdown_time': datetime.now().isoformat()
                }, f, indent=2)
            print(f"💾 Execution history saved to {history_file}")
        except Exception as e:
            print(f"⚠️ Failed to save execution history: {e}")
        
        # Generate final report
        print(self.get_comprehensive_report())

async def main():
    """Test the intelligent swarm coordinator"""
    
    try:
        coordinator = IntelligentSwarmCoordinator()
        
        print("\n🧪 Testing Intelligent Swarm Coordinator...")
        
        # Execute various types of tasks
        test_tasks = [
            ("Check system status and generate a brief report", "simple", "testing"),
            ("Implement a neural network optimization algorithm", "complex", "implementation"),
            ("Analyze performance metrics and identify bottlenecks", "medium", "analysis"),
            ("Generate unit tests for the token distribution system", "medium", "testing"),
            ("Create documentation for the usage monitoring system", "simple", "documentation"),
            ("Optimize memory allocation in the hierarchical system", "complex", "optimization"),
            ("Validate input parameters for API functions", "simple", "validation"),
            ("Research best practices for AI model coordination", "medium", "research")
        ]
        
        for task_desc, complexity, task_type in test_tasks:
            print(f"\n{'='*60}")
            result = await coordinator.execute_swarm_task(task_desc, complexity, task_type)
            print(f"Result: {result['success']} on {result['platform']}:{result['model']}")
            
            # Small delay between tasks
            await asyncio.sleep(0.5)
        
        # Generate final report
        print("\n" + "="*60)
        print("📊 FINAL REPORT:")
        print(coordinator.get_comprehensive_report())
        
        # Shutdown
        await coordinator.shutdown()
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())