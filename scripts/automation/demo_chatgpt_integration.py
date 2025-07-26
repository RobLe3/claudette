#!/usr/bin/env python3
"""
Demo Script for ChatGPT Integration
Shows how the system would work with an API key configured
"""

import json
import asyncio
from datetime import datetime

def demo_task_classification():
    """Demo the task classification system"""
    print("🧠 TASK CLASSIFICATION DEMO")
    print("=" * 50)
    
    # Simulate different task types
    demo_tasks = [
        {
            "description": "write a simple hello world function in Python",
            "complexity": "simple",
            "requires_files": False
        },
        {
            "description": "analyze the architecture of this complex microservices system",
            "complexity": "complex", 
            "requires_files": True
        },
        {
            "description": "generate comprehensive API documentation for REST endpoints",
            "complexity": "medium",
            "requires_files": False
        },
        {
            "description": "edit multiple configuration files across the project",
            "complexity": "medium",
            "requires_files": True
        },
        {
            "description": "brainstorm creative variable names for machine learning model",
            "complexity": "simple",
            "requires_files": False
        },
        {
            "description": "debug complex memory leak in production system",
            "complexity": "complex",
            "requires_files": True
        }
    ]
    
    # Classification logic (simplified)
    def classify_task(task):
        desc = task["description"].lower()
        
        # ChatGPT preferred patterns
        chatgpt_indicators = [
            "write", "generate", "create", "brainstorm", 
            "documentation", "simple", "hello world"
        ]
        
        # Claude preferred patterns  
        claude_indicators = [
            "edit", "debug", "analyze", "complex", "files",
            "architecture", "memory leak", "production"
        ]
        
        chatgpt_score = sum(1 for indicator in chatgpt_indicators if indicator in desc)
        claude_score = sum(1 for indicator in claude_indicators if indicator in desc)
        
        if task["requires_files"]:
            claude_score += 3
            
        if task["complexity"] == "complex":
            claude_score += 2
        elif task["complexity"] == "simple":
            chatgpt_score += 1
            
        if chatgpt_score > claude_score:
            return "ChatGPT", chatgpt_score, claude_score
        else:
            return "Claude", claude_score, chatgpt_score
    
    print(f"{'Task':<50} {'Recommended':<12} {'Reasoning'}")
    print("-" * 80)
    
    for task in demo_tasks:
        recommendation, primary_score, secondary_score = classify_task(task)
        reasoning = f"Score: {primary_score} vs {secondary_score}"
        if task["requires_files"]:
            reasoning += " (+files)"
        print(f"{task['description'][:48]:<50} {recommendation:<12} {reasoning}")
    
    print("\n🎯 DISTRIBUTION SUMMARY:")
    claude_tasks = [t for t in demo_tasks if classify_task(t)[0] == "Claude"]
    chatgpt_tasks = [t for t in demo_tasks if classify_task(t)[0] == "ChatGPT"]
    
    print(f"   Claude: {len(claude_tasks)} tasks (file operations, complex analysis)")
    print(f"   ChatGPT: {len(chatgpt_tasks)} tasks (simple generation, documentation)")

def demo_cost_analysis():
    """Demo cost analysis and savings"""
    print("\n\n💰 COST ANALYSIS DEMO")
    print("=" * 50)
    
    # Sample usage scenarios
    scenarios = [
        {
            "name": "Documentation Generation",
            "claude_tokens": 2000,
            "chatgpt_tokens": 1500,
            "chatgpt_model": "gpt-3.5-turbo"
        },
        {
            "name": "Simple Code Generation", 
            "claude_tokens": 1000,
            "chatgpt_tokens": 800,
            "chatgpt_model": "gpt-3.5-turbo"
        },
        {
            "name": "Complex Analysis",
            "claude_tokens": 3000,
            "chatgpt_tokens": 2500,
            "chatgpt_model": "gpt-4"
        }
    ]
    
    # Cost calculations
    claude_cost_per_1k = 0.015  # EUR per 1k tokens
    chatgpt_costs = {
        "gpt-3.5-turbo": 0.0005,  # USD per 1k tokens
        "gpt-4": 0.03  # USD per 1k tokens
    }
    usd_to_eur = 0.92
    
    print(f"{'Scenario':<25} {'Claude Cost':<12} {'ChatGPT Cost':<15} {'Savings':<10}")
    print("-" * 70)
    
    total_claude_cost = 0
    total_chatgpt_cost = 0
    
    for scenario in scenarios:
        claude_cost_eur = (scenario['claude_tokens'] / 1000) * claude_cost_per_1k
        chatgpt_cost_usd = (scenario['chatgpt_tokens'] / 1000) * chatgpt_costs[scenario['chatgpt_model']]
        chatgpt_cost_eur = chatgpt_cost_usd * usd_to_eur
        
        savings_eur = claude_cost_eur - chatgpt_cost_eur
        savings_percent = (savings_eur / claude_cost_eur) * 100 if claude_cost_eur > 0 else 0
        
        total_claude_cost += claude_cost_eur
        total_chatgpt_cost += chatgpt_cost_eur
        
        print(f"{scenario['name']:<25} €{claude_cost_eur:<11.4f} €{chatgpt_cost_eur:<14.4f} {savings_percent:>6.1f}%")
    
    total_savings = total_claude_cost - total_chatgpt_cost
    total_savings_percent = (total_savings / total_claude_cost) * 100
    
    print("-" * 70)
    print(f"{'TOTAL':<25} €{total_claude_cost:<11.4f} €{total_chatgpt_cost:<14.4f} {total_savings_percent:>6.1f}%")
    print(f"\n💡 Potential monthly savings: €{total_savings:.2f} ({total_savings_percent:.1f}%)")

def demo_parallel_execution():
    """Demo parallel execution capabilities"""
    print("\n\n⚡ PARALLEL EXECUTION DEMO") 
    print("=" * 50)
    
    # Simulate parallel task execution
    tasks = [
        {"id": "task_1", "description": "Generate hello world", "executor": "ChatGPT", "time": 0.8},
        {"id": "task_2", "description": "Edit configuration file", "executor": "Claude", "time": 1.2},
        {"id": "task_3", "description": "Write documentation", "executor": "ChatGPT", "time": 1.0},
        {"id": "task_4", "description": "Debug complex issue", "executor": "Claude", "time": 2.0},
        {"id": "task_5", "description": "Brainstorm names", "executor": "ChatGPT", "time": 0.5}
    ]
    
    print("📋 TASK QUEUE:")
    for task in tasks:
        print(f"   {task['id']}: {task['description']} [{task['executor']}] ({task['time']}s)")
    
    # Sequential vs Parallel comparison
    sequential_time = sum(task['time'] for task in tasks)
    parallel_time = max(
        max(task['time'] for task in tasks if task['executor'] == 'Claude'),
        max(task['time'] for task in tasks if task['executor'] == 'ChatGPT')
    )
    
    efficiency = sequential_time / parallel_time
    
    print(f"\n📊 EXECUTION ANALYSIS:")
    print(f"   Sequential execution: {sequential_time:.1f} seconds")
    print(f"   Parallel execution: {parallel_time:.1f} seconds")
    print(f"   Efficiency gain: {efficiency:.1f}x faster")
    print(f"   Time saved: {sequential_time - parallel_time:.1f} seconds")

def demo_usage_monitoring():
    """Demo usage monitoring and budgets"""
    print("\n\n📊 USAGE MONITORING DEMO")
    print("=" * 50)
    
    # Simulate daily usage
    daily_usage = {
        "claude": {"tokens": 45000, "limit": 2000000, "cost_eur": 0.675},
        "openai": {"tokens": 12000, "limit": None, "cost_usd": 0.15}
    }
    
    claude_percent = (daily_usage['claude']['tokens'] / daily_usage['claude']['limit']) * 100
    
    print("🤖 CLAUDE USAGE:")
    print(f"   Daily: {daily_usage['claude']['tokens']:,} / {daily_usage['claude']['limit']:,} tokens ({claude_percent:.1f}%)")
    print(f"   Cost: €{daily_usage['claude']['cost_eur']:.3f}")
    
    print("\n🧠 OPENAI USAGE:")
    print(f"   Tokens: {daily_usage['openai']['tokens']:,}")
    print(f"   Cost: ${daily_usage['openai']['cost_usd']:.3f} (€{daily_usage['openai']['cost_usd'] * 0.92:.3f})")
    
    # Budget recommendations
    print(f"\n💡 RECOMMENDATIONS:")
    if claude_percent > 70:
        print("   ⚠️  Claude usage high - increase ChatGPT offloading")
    else:
        print("   ✅ Claude usage optimal")
        
    if daily_usage['openai']['cost_usd'] < 2.0:
        print("   ✅ OpenAI costs within daily budget")
    else:
        print("   ⚠️  OpenAI costs approaching daily limit")

def demo_security_features():
    """Demo security features"""
    print("\n\n🔒 SECURITY FEATURES DEMO")
    print("=" * 50)
    
    print("✅ IMPLEMENTED SECURITY MEASURES:")
    print("   📱 System Keyring Integration")
    print("      - API keys stored in OS secure keyring")
    print("      - No plaintext storage in files")
    print("      - Automatic encryption/decryption")
    print()
    print("   🔐 Fernet Encryption")
    print("      - Additional encryption layer")
    print("      - Unique encryption key per installation")
    print("      - Keys hashed for verification")
    print()
    print("   💰 Budget Protection")
    print("      - Daily spending limits: $10 USD")
    print("      - Monthly spending limits: $100 USD") 
    print("      - Automatic cost tracking")
    print()
    print("   🔍 Usage Monitoring")
    print("      - Real-time token tracking")
    print("      - Cost analysis and projections")
    print("      - Security audit logs")

def main():
    """Run complete demo"""
    print("🚀 CLAUDE-CHATGPT INTEGRATION DEMO")
    print("==================================")
    print(f"Demo running at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    demo_task_classification()
    demo_cost_analysis()
    demo_parallel_execution()
    demo_usage_monitoring()
    demo_security_features()
    
    print("\n\n🎉 INTEGRATION READY!")
    print("=" * 50)
    print("To activate with your OpenAI API key:")
    print("  python3 secure_key_manager.py setup-openai <your_api_key>")
    print()
    print("Then test with:")
    print("  python3 chatgpt_offloading_manager.py test")
    print("  python3 claude_chatgpt_coordinator.py execute")

if __name__ == "__main__":
    main()