#!/usr/bin/env python3
"""
Claude-ChatGPT Coordinator - Intelligent task distribution between Claude and ChatGPT
Implements parallel execution patterns from CLAUDE.md
"""

import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Union

# Add to path for imports
sys.path.append(str(Path(__file__).parent))
from claude_integration_coordinator import ClaudeIntegrationCoordinator
from chatgpt_offloading_manager import ChatGPTOffloadingManager
from secure_key_manager import SecureKeyManager

class ClaudeChatGPTCoordinator:
    """Coordinate task distribution between Claude Code and ChatGPT"""
    
    def __init__(self):
        self.claude_coordinator = ClaudeIntegrationCoordinator()
        self.chatgpt_manager = ChatGPTOffloadingManager()
        self.key_manager = SecureKeyManager()
        
        # Decision engine configuration
        self.decision_config = {
            'claude_preferred_tasks': [
                'file_operations', 'complex_analysis', 'code_review',
                'multi_file_editing', 'project_management', 'debugging'
            ],
            'chatgpt_preferred_tasks': [
                'simple_code_generation', 'documentation_writing', 'text_processing',
                'creative_brainstorming', 'format_conversion', 'basic_explanations'
            ],
            'hybrid_tasks': [
                'system_design', 'architecture_planning', 'testing_strategies'
            ]
        }
        
        # Parallel execution tracking
        self.parallel_operations = []
        self.coordination_results = {}
        
    def analyze_task_distribution(self, tasks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze optimal distribution of tasks between Claude and ChatGPT"""
        
        distribution = {
            'claude_tasks': [],
            'chatgpt_tasks': [],
            'hybrid_tasks': [],
            'analysis': {
                'total_tasks': len(tasks),
                'claude_count': 0,
                'chatgpt_count': 0,
                'hybrid_count': 0,
                'estimated_costs': {'claude_eur': 0.0, 'openai_usd': 0.0},
                'estimated_time': {'claude_seconds': 0.0, 'openai_seconds': 0.0}
            }
        }
        
        for i, task in enumerate(tasks):
            task_analysis = self._analyze_single_task(task)
            task['id'] = task.get('id', f"task_{i}")
            task['analysis'] = task_analysis
            
            if task_analysis['recommendation'] == 'claude':
                distribution['claude_tasks'].append(task)
                distribution['analysis']['claude_count'] += 1
                distribution['analysis']['estimated_costs']['claude_eur'] += task_analysis['estimated_cost_eur']
                distribution['analysis']['estimated_time']['claude_seconds'] += task_analysis['estimated_time_seconds']
                
            elif task_analysis['recommendation'] == 'chatgpt':
                distribution['chatgpt_tasks'].append(task)
                distribution['analysis']['chatgpt_count'] += 1
                distribution['analysis']['estimated_costs']['openai_usd'] += task_analysis['estimated_cost_usd']
                distribution['analysis']['estimated_time']['openai_seconds'] += task_analysis['estimated_time_seconds']
                
            else:  # hybrid
                distribution['hybrid_tasks'].append(task)
                distribution['analysis']['hybrid_count'] += 1
                # Split costs for hybrid tasks
                distribution['analysis']['estimated_costs']['claude_eur'] += task_analysis['estimated_cost_eur'] * 0.6
                distribution['analysis']['estimated_costs']['openai_usd'] += task_analysis['estimated_cost_usd'] * 0.4
        
        return distribution
    
    def _analyze_single_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze a single task for optimal assignment"""
        description = task.get('description', '').lower()
        complexity = task.get('complexity', 'medium')
        requires_files = task.get('requires_files', False)
        
        analysis = {
            'recommendation': 'claude',  # Default to Claude
            'confidence': 0.5,
            'reasoning': [],
            'estimated_cost_eur': 0.01,  # Default Claude cost
            'estimated_cost_usd': 0.0,
            'estimated_time_seconds': 30.0
        }
        
        # Check for ChatGPT preferred patterns
        chatgpt_score = 0
        for task_type in self.decision_config['chatgpt_preferred_tasks']:
            if task_type.replace('_', ' ') in description:
                chatgpt_score += 2
                analysis['reasoning'].append(f"Matches ChatGPT preferred: {task_type}")
        
        # Check Claude capacity
        claude_status = self.claude_coordinator.status_manager.get_claude_pro_status()
        if claude_status:
            if claude_status['daily_usage_percent'] > 80:
                chatgpt_score += 3
                analysis['reasoning'].append("Claude capacity high - prefer offloading")
            elif claude_status['daily_usage_percent'] < 20:
                chatgpt_score -= 1
                analysis['reasoning'].append("Claude capacity available")
        
        # File operations strongly prefer Claude
        if requires_files or 'file' in description or 'edit' in description:
            chatgpt_score -= 5
            analysis['reasoning'].append("File operations require Claude")
        
        # Cost considerations
        if complexity == 'simple':
            chatgpt_score += 1
            analysis['estimated_cost_usd'] = 0.005
            analysis['estimated_time_seconds'] = 15.0
        elif complexity == 'complex':
            chatgpt_score -= 2
            analysis['estimated_cost_eur'] = 0.03
            analysis['estimated_time_seconds'] = 60.0
        
        # Check OpenAI availability and budget
        openai_summary = self.chatgpt_manager.get_usage_summary()
        if openai_summary['openai_status'] != 'available':
            chatgpt_score -= 10
            analysis['reasoning'].append("OpenAI not configured")
        elif openai_summary['budget_status']['daily_usage_percent'] > 80:
            chatgpt_score -= 3
            analysis['reasoning'].append("OpenAI daily budget high")
        
        # Make recommendation
        if chatgpt_score >= 2:
            analysis['recommendation'] = 'chatgpt'
            analysis['confidence'] = min(0.9, 0.5 + (chatgpt_score * 0.1))
        elif chatgpt_score <= -3:
            analysis['recommendation'] = 'claude'
            analysis['confidence'] = min(0.9, 0.7 + abs(chatgpt_score) * 0.05)
        else:
            analysis['recommendation'] = 'hybrid'
            analysis['confidence'] = 0.6
        
        return analysis
    
    async def execute_parallel_coordination(self, tasks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Execute tasks in parallel following CLAUDE.md patterns"""
        
        # Analyze task distribution
        distribution = self.analyze_task_distribution(tasks)
        
        execution_results = {
            'timestamp': datetime.now().isoformat(),
            'distribution': distribution['analysis'],
            'results': {
                'claude_results': [],
                'chatgpt_results': [],
                'hybrid_results': []
            },
            'performance': {
                'total_time_seconds': 0.0,
                'parallel_efficiency': 0.0,
                'tasks_completed': 0,
                'tasks_failed': 0
            },
            'costs': {
                'claude_eur': 0.0,
                'openai_usd': 0.0,
                'total_eur_equivalent': 0.0
            }
        }
        
        start_time = asyncio.get_event_loop().time()
        
        # Prepare parallel execution batches
        claude_tasks = [self._execute_claude_task(task) for task in distribution['claude_tasks']]
        chatgpt_tasks = [self._execute_chatgpt_task(task) for task in distribution['chatgpt_tasks']]
        hybrid_tasks = [self._execute_hybrid_task(task) for task in distribution['hybrid_tasks']]
        
        # Execute all tasks in parallel
        all_tasks = []
        if claude_tasks:
            all_tasks.extend(claude_tasks)
        if chatgpt_tasks:
            all_tasks.extend(chatgpt_tasks)
        if hybrid_tasks:
            all_tasks.extend(hybrid_tasks)
        
        if all_tasks:
            results = await asyncio.gather(*all_tasks, return_exceptions=True)
            
            # Process results
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    execution_results['performance']['tasks_failed'] += 1
                else:
                    execution_results['performance']['tasks_completed'] += 1
                    
                    # Categorize results
                    if result.get('executor') == 'claude':
                        execution_results['results']['claude_results'].append(result)
                        execution_results['costs']['claude_eur'] += result.get('cost_eur', 0)
                    elif result.get('executor') == 'chatgpt':
                        execution_results['results']['chatgpt_results'].append(result)
                        execution_results['costs']['openai_usd'] += result.get('cost_usd', 0)
                    else:  # hybrid
                        execution_results['results']['hybrid_results'].append(result)
                        execution_results['costs']['claude_eur'] += result.get('claude_cost_eur', 0)
                        execution_results['costs']['openai_usd'] += result.get('openai_cost_usd', 0)
        
        end_time = asyncio.get_event_loop().time()
        execution_results['performance']['total_time_seconds'] = end_time - start_time
        
        # Calculate efficiency
        if execution_results['performance']['total_time_seconds'] > 0:
            theoretical_sequential_time = sum(task.get('analysis', {}).get('estimated_time_seconds', 30) for task in tasks)
            execution_results['performance']['parallel_efficiency'] = min(1.0, theoretical_sequential_time / execution_results['performance']['total_time_seconds'])
        
        # Convert costs to EUR equivalent
        usd_to_eur = 0.92  # Approximate conversion
        execution_results['costs']['total_eur_equivalent'] = (
            execution_results['costs']['claude_eur'] + 
            (execution_results['costs']['openai_usd'] * usd_to_eur)
        )
        
        return execution_results
    
    async def _execute_claude_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute task using Claude (simulated)"""
        # Simulate Claude task execution
        await asyncio.sleep(0.5)  # Simulate processing time
        
        return {
            'task_id': task['id'],
            'executor': 'claude',
            'success': True,
            'result': f"Claude completed: {task.get('description', 'Unknown task')}",
            'cost_eur': task.get('analysis', {}).get('estimated_cost_eur', 0.01),
            'tokens_used': 500,
            'processing_time': 0.5
        }
    
    async def _execute_chatgpt_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute task using ChatGPT"""
        description = task.get('description', '')
        context = task.get('context', '')
        
        result = await self.chatgpt_manager.offload_task(description, context)
        
        return {
            'task_id': task['id'],
            'executor': 'chatgpt',
            'success': result.get('success', False),
            'result': result.get('result', result.get('error', 'Unknown error')),
            'cost_usd': result.get('cost_usd', 0.0),
            'tokens_used': result.get('tokens_used', 0),
            'model_used': result.get('model_used', 'unknown'),
            'processing_time': result.get('completion_time', 0.0)
        }
    
    async def _execute_hybrid_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute task using hybrid approach (both Claude and ChatGPT)"""
        # Split task into sub-tasks for parallel execution
        chatgpt_subtask = f"Provide initial analysis for: {task.get('description', '')}"
        claude_context = await self.chatgpt_manager.offload_task(chatgpt_subtask)
        
        # Simulate Claude refinement
        await asyncio.sleep(0.3)
        
        return {
            'task_id': task['id'],
            'executor': 'hybrid',
            'success': True,
            'result': f"Hybrid completion: ChatGPT analysis + Claude refinement for {task.get('description', '')}",
            'chatgpt_analysis': claude_context.get('result', 'No analysis'),
            'claude_cost_eur': 0.005,
            'openai_cost_usd': claude_context.get('cost_usd', 0.0),
            'processing_time': 0.8
        }
    
    def generate_coordination_report(self, results: Dict[str, Any]) -> str:
        """Generate comprehensive coordination report"""
        
        report = f"""
╭─────────────────────────────────────────────────────────╮
│            🤖 CLAUDE-CHATGPT COORDINATION REPORT         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📊 TASK DISTRIBUTION                                   │
│     Claude: {results['distribution']['claude_count']:>3} tasks | ChatGPT: {results['distribution']['chatgpt_count']:>3} tasks │
│     Hybrid: {results['distribution']['hybrid_count']:>3} tasks | Total: {results['distribution']['total_tasks']:>5} tasks   │
│                                                         │
│  ⚡ PERFORMANCE                                          │
│     Completed: {results['performance']['tasks_completed']:>3} | Failed: {results['performance']['tasks_failed']:>3}           │
│     Time: {results['performance']['total_time_seconds']:>6.1f}s | Efficiency: {results['performance']['parallel_efficiency']:>5.1%}     │
│                                                         │
│  💰 COSTS                                               │
│     Claude: €{results['costs']['claude_eur']:>8.4f}                         │
│     OpenAI: ${results['costs']['openai_usd']:>8.4f}                         │
│     Total:  €{results['costs']['total_eur_equivalent']:>8.4f} (EUR equiv)             │
│                                                         │
│  🎯 OPTIMIZATION                                        │
│     Parallel efficiency: {results['performance']['parallel_efficiency']*100:>5.1f}%                 │
│     Cost optimization: {'✅ OPTIMAL' if results['costs']['total_eur_equivalent'] < 0.5 else '⚠️ REVIEW'}                   │
│                                                         │
╰─────────────────────────────────────────────────────────╯
"""
        return report.strip()

def main():
    """Main CLI interface for coordination"""
    if len(sys.argv) < 2:
        print("Usage: python3 claude_chatgpt_coordinator.py [analyze|execute|status]")
        return
        
    command = sys.argv[1]
    coordinator = ClaudeChatGPTCoordinator()
    
    if command == "analyze":
        # Example task analysis
        sample_tasks = [
            {"description": "write a hello world function", "complexity": "simple"},
            {"description": "analyze this complex codebase architecture", "complexity": "complex", "requires_files": True},
            {"description": "generate documentation for API", "complexity": "medium"},
            {"description": "create unit tests", "complexity": "medium", "requires_files": True},
            {"description": "brainstorm creative variable names", "complexity": "simple"}
        ]
        
        distribution = coordinator.analyze_task_distribution(sample_tasks)
        print(json.dumps(distribution, indent=2))
        
    elif command == "execute":
        # Example parallel execution
        sample_tasks = [
            {"description": "write a hello world function", "complexity": "simple"},
            {"description": "generate API documentation", "complexity": "medium"},
            {"description": "suggest creative project names", "complexity": "simple"}
        ]
        
        print("🚀 Executing parallel coordination...")
        results = asyncio.run(coordinator.execute_parallel_coordination(sample_tasks))
        print(coordinator.generate_coordination_report(results))
        
    elif command == "status":
        # Show coordination status
        claude_status = coordinator.claude_coordinator.status_manager.get_claude_pro_status()
        openai_summary = coordinator.chatgpt_manager.get_usage_summary()
        
        print("🤖 Claude Status:")
        if claude_status:
            print(f"   Daily usage: {claude_status['daily_usage_percent']:.1f}%")
            print(f"   Monthly usage: {claude_status['monthly_usage_percent']:.1f}%")
        
        print("\n🧠 OpenAI Status:")
        print(f"   API: {openai_summary['openai_status']}")
        print(f"   Daily budget: {openai_summary['budget_status']['daily_usage_percent']:.1f}%")
        print(f"   Monthly budget: {openai_summary['budget_status']['monthly_usage_percent']:.1f}%")
    
    else:
        print("Commands: analyze, execute, status")

if __name__ == "__main__":
    main()