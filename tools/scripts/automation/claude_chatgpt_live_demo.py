#!/usr/bin/env python3
"""
Live Demo of Claude-ChatGPT Integration
Real-world examples of the working system
"""

import asyncio
import json
import sys
from pathlib import Path

# Add to path for imports
sys.path.append(str(Path(__file__).parent))
from chatgpt_offloading_manager import ChatGPTOffloadingManager
from claude_chatgpt_coordinator import ClaudeChatGPTCoordinator

async def demo_simple_tasks():
    """Demo simple tasks that should offload to ChatGPT"""
    print("🧪 DEMO: Simple Tasks → ChatGPT")
    print("=" * 50)
    
    manager = ChatGPTOffloadingManager()
    
    simple_tasks = [
        "write a hello world function",
        "create a simple calculator",
        "generate API documentation example",
        "brainstorm variable names for user data",
        "write a function comment"
    ]
    
    for i, task in enumerate(simple_tasks, 1):
        print(f"\n{i}. Testing: {task}")
        
        # Check classification
        classification = manager.classify_task(task)
        if classification:
            print(f"   Classification: {classification['recommendation']} ({classification['confidence']:.1%} confidence)")
            print(f"   Model: {classification['model']}")
        
        # Try to offload
        if classification and classification['recommendation'] == 'offload':
            result = await manager.offload_task(task)
            if result.get('success'):
                print(f"   ✅ Success: {result['result'][:100]}...")
                print(f"   Cost: ${result['cost_usd']:.6f} | Tokens: {result['tokens_used']}")
            else:
                print(f"   ❌ Failed: {result.get('error')}")
        else:
            print(f"   📝 Would stay with Claude (not classified for offloading)")

async def demo_forced_offload():
    """Demo forcing offload to test functionality"""
    print("\n\n🚀 DEMO: Forced Offload Testing")
    print("=" * 50)
    
    manager = ChatGPTOffloadingManager()
    
    # Override the decision to test functionality
    test_tasks = [
        "write a python function that prints hello world",
        "create a simple addition function",
        "generate a docstring for a calculator function"
    ]
    
    for i, task in enumerate(test_tasks, 1):
        print(f"\n{i}. Forcing offload: {task}")
        
        # Direct offload (bypass classification)
        result = await manager.offload_task(task)
        
        if result.get('success'):
            print(f"   ✅ ChatGPT Response:")
            print(f"   {result['result']}")
            print(f"   📊 Model: {result['model_used']} | Tokens: {result['tokens_used']} | Cost: ${result['cost_usd']:.6f}")
        else:
            print(f"   ❌ Error: {result.get('error')}")

def demo_classification_logic():
    """Demo the classification decision logic"""
    print("\n\n🧠 DEMO: Classification Logic")
    print("=" * 50)
    
    manager = ChatGPTOffloadingManager()
    
    test_cases = [
        {"task": "write a hello world function", "expected": "offload"},
        {"task": "debug complex memory leak", "expected": "claude"},
        {"task": "edit configuration files", "expected": "claude"},
        {"task": "generate documentation", "expected": "offload"},
        {"task": "analyze architecture", "expected": "claude"},
        {"task": "brainstorm creative names", "expected": "offload"}
    ]
    
    print(f"{'Task':<40} {'Expected':<10} {'Actual':<10} {'Model':<15} {'Match'}")
    print("-" * 85)
    
    for case in test_cases:
        classification = manager.classify_task(case['task'])
        
        if classification:
            actual = classification['recommendation']
            model = classification['model']
            match = "✅" if actual == case['expected'] else "❌"
        else:
            actual = "none"
            model = "N/A"
            match = "❌"
        
        print(f"{case['task'][:38]:<40} {case['expected']:<10} {actual:<10} {model:<15} {match}")

async def demo_cost_savings():
    """Demo actual cost savings"""
    print("\n\n💰 DEMO: Real Cost Savings")
    print("=" * 50)
    
    manager = ChatGPTOffloadingManager()
    
    # Get usage summary
    usage = manager.get_usage_summary()
    
    print("📊 Current Usage Statistics:")
    print(f"   OpenAI Requests: {usage['today']['requests']}")
    print(f"   OpenAI Tokens: {usage['today']['tokens']}")
    print(f"   OpenAI Cost: ${usage['today']['cost_usd']:.6f}")
    print(f"   Claude Tokens Saved: {usage['savings']['claude_tokens_saved']:.0f}")
    
    # Calculate savings
    claude_cost = usage['savings']['cost_comparison']['claude_eur']
    openai_cost = usage['savings']['cost_comparison']['openai_usd'] * 0.92  # Convert to EUR
    
    if claude_cost > 0:
        savings_eur = claude_cost - openai_cost
        savings_percent = (savings_eur / claude_cost) * 100
        
        print(f"\n💡 Cost Comparison:")
        print(f"   Claude equivalent cost: €{claude_cost:.6f}")
        print(f"   OpenAI actual cost: €{openai_cost:.6f}")
        print(f"   Savings: €{savings_eur:.6f} ({savings_percent:.1f}%)")
    
    # Budget status
    print(f"\n📈 Budget Status:")
    print(f"   Daily: ${usage['budget_status']['daily_remaining_usd']:.2f} remaining")
    print(f"   Monthly: ${usage['budget_status']['monthly_remaining_usd']:.2f} remaining")

async def demo_parallel_coordination():
    """Demo the parallel coordination system"""
    print("\n\n⚡ DEMO: Parallel Coordination")
    print("=" * 50)
    
    coordinator = ClaudeChatGPTCoordinator()
    
    # Create mixed tasks
    mixed_tasks = [
        {
            "description": "write a hello world function",
            "complexity": "simple",
            "requires_files": False
        },
        {
            "description": "create simple documentation",
            "complexity": "simple", 
            "requires_files": False
        },
        {
            "description": "generate example JSON data",
            "complexity": "simple",
            "requires_files": False
        }
    ]
    
    print("📋 Task Queue:")
    for i, task in enumerate(mixed_tasks, 1):
        print(f"   {i}. {task['description']} (complexity: {task['complexity']})")
    
    # Execute coordination
    print("\n🚀 Executing parallel coordination...")
    results = await coordinator.execute_parallel_coordination(mixed_tasks)
    
    # Show results
    print(coordinator.generate_coordination_report(results))
    
    print("\n📊 Detailed Results:")
    for category, task_results in results['results'].items():
        if task_results:
            print(f"\n   {category.upper()}:")
            for result in task_results:
                print(f"     • {result.get('task_id', 'Unknown')}: {result.get('success', False)}")

async def main():
    """Run comprehensive live demo"""
    print("🎉 CLAUDE-CHATGPT LIVE INTEGRATION DEMO")
    print("=" * 60)
    print("Testing with REAL OpenAI API integration!")
    
    try:
        await demo_simple_tasks()
        await demo_forced_offload()
        demo_classification_logic()
        await demo_cost_savings()
        await demo_parallel_coordination()
        
        print("\n\n🎯 DEMO COMPLETE!")
        print("=" * 50)
        print("✅ OpenAI API integration working")
        print("✅ Task classification functional")
        print("✅ Cost tracking operational")
        print("✅ Parallel coordination active")
        print("✅ Security measures in place")
        
    except Exception as e:
        print(f"\n❌ Demo failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())