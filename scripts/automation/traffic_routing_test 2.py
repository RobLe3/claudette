#!/usr/bin/env python3
"""
Traffic Routing Test - Verify Claude vs ChatGPT task distribution
Tests that Claude only handles orchestration, ChatGPT handles everything else
"""

import sys
import json
from pathlib import Path

# Add path for imports
sys.path.append(str(Path(__file__).parent.parent.parent / "core" / "coordination"))
from chatgpt_offloading_manager import ChatGPTOffloadingManager

def test_traffic_routing():
    """Test comprehensive traffic routing patterns"""
    manager = ChatGPTOffloadingManager()
    
    # Test cases: [description, expected_handler, expected_model]
    test_cases = [
        # Claude-only tasks (orchestration)
        ("swarm orchestration setup", "claude", "claude"),
        ("agent spawn researcher", "claude", "claude"),
        ("mcp tool initialization", "claude", "claude"),
        ("claude flow configuration", "claude", "claude"),
        ("task orchestration planning", "claude", "claude"),
        ("coordination between agents", "claude", "claude"),
        ("memory usage tracking", "claude", "claude"),
        ("neural training patterns", "claude", "claude"),
        ("todowrite task management", "claude", "claude"),
        ("batch tool operations", "claude", "claude"),
        
        # ChatGPT tasks (everything else)
        ("write a python function", "chatgpt", "gpt-3.5-turbo"),
        ("create a bash script", "chatgpt", "gpt-3.5-turbo"),
        ("generate HTML code", "chatgpt", "gpt-3.5-turbo"),
        ("implement user authentication", "chatgpt", "gpt-3.5-turbo"),
        ("summarize this document", "chatgpt", "gpt-3.5-turbo"),
        ("extract data from text", "chatgpt", "gpt-3.5-turbo"),
        ("parse JSON response", "chatgpt", "gpt-3.5-turbo"),
        ("format code output", "chatgpt", "gpt-3.5-turbo"),
        ("write API documentation", "chatgpt", "gpt-3.5-turbo"),
        ("create README file", "chatgpt", "gpt-3.5-turbo"),
        ("document code functions", "chatgpt", "gpt-3.5-turbo"),
        ("explain code logic", "chatgpt", "gpt-3.5-turbo"),
        ("analyze code performance", "chatgpt", "gpt-4"),
        ("review file structure", "chatgpt", "gpt-4"),
        ("debug syntax errors", "chatgpt", "gpt-4"),
        ("find security issues", "chatgpt", "gpt-4"),
        ("research Python libraries", "chatgpt", "gpt-3.5-turbo"),
        ("find documentation", "chatgpt", "gpt-3.5-turbo"),
        ("lookup API reference", "chatgpt", "gpt-3.5-turbo"),
        ("help with debugging", "chatgpt", "gpt-3.5-turbo"),
        ("how to use Docker", "chatgpt", "gpt-3.5-turbo"),
        ("what is machine learning", "chatgpt", "gpt-3.5-turbo"),
        ("explain REST APIs", "chatgpt", "gpt-3.5-turbo"),
        ("show example code", "chatgpt", "gpt-3.5-turbo"),
        ("brainstorm project ideas", "chatgpt", "gpt-4"),
        ("suggest variable names", "chatgpt", "gpt-4"),
        ("creative problem solving", "chatgpt", "gpt-4"),
        ("generate test ideas", "chatgpt", "gpt-4")
    ]
    
    results = {
        "claude_tasks": {"correct": 0, "total": 0},
        "chatgpt_tasks": {"correct": 0, "total": 0},
        "cost_analysis": {"chatgpt_costs": [], "claude_savings": 0},
        "detailed_results": []
    }
    
    print("🧪 TRAFFIC ROUTING TEST")
    print("=" * 50)
    
    for task_desc, expected_handler, expected_model in test_cases:
        classification = manager.classify_task(task_desc)
        
        if expected_handler == "claude":
            results["claude_tasks"]["total"] += 1
            is_correct = (classification and 
                         classification["recommendation"] == "keep_local" and 
                         classification["model"] == "claude")
            if is_correct:
                results["claude_tasks"]["correct"] += 1
                status = "✅"
            else:
                status = "❌"
                
        else:  # chatgpt
            results["chatgpt_tasks"]["total"] += 1
            is_correct = (classification and 
                         classification["recommendation"] == "offload" and 
                         classification["model"] == expected_model)
            if is_correct:
                results["chatgpt_tasks"]["correct"] += 1
                results["cost_analysis"]["chatgpt_costs"].append(classification["estimated_cost_usd"])
                status = "✅"
            else:
                status = "❌"
        
        results["detailed_results"].append({
            "task": task_desc,
            "expected": f"{expected_handler}({expected_model})",
            "actual": f"{classification['model'] if classification else 'None'}({classification['recommendation'] if classification else 'None'})",
            "correct": is_correct
        })
        
        print(f"{status} {task_desc:<35} → {expected_handler:>8} ({expected_model})")
    
    # Calculate metrics
    claude_accuracy = results["claude_tasks"]["correct"] / results["claude_tasks"]["total"] * 100
    chatgpt_accuracy = results["chatgpt_tasks"]["correct"] / results["chatgpt_tasks"]["total"] * 100
    total_accuracy = (results["claude_tasks"]["correct"] + results["chatgpt_tasks"]["correct"]) / len(test_cases) * 100
    
    estimated_chatgpt_cost = sum(results["cost_analysis"]["chatgpt_costs"])
    estimated_claude_savings = len([c for c in results["cost_analysis"]["chatgpt_costs"]]) * 0.015  # Claude cost per 1k tokens
    
    print("\n📊 ROUTING ACCURACY RESULTS")
    print("=" * 50)
    print(f"Claude Orchestration Tasks: {results['claude_tasks']['correct']}/{results['claude_tasks']['total']} ({claude_accuracy:.1f}%)")
    print(f"ChatGPT Offloaded Tasks:    {results['chatgpt_tasks']['correct']}/{results['chatgpt_tasks']['total']} ({chatgpt_accuracy:.1f}%)")
    print(f"Overall Accuracy:           {total_accuracy:.1f}%")
    
    print("\n💰 COST OPTIMIZATION ANALYSIS")
    print("=" * 50)
    print(f"Estimated ChatGPT cost:     ${estimated_chatgpt_cost:.6f}")
    print(f"Estimated Claude savings:   ${estimated_claude_savings:.6f}")
    print(f"Cost reduction:             {((estimated_claude_savings - estimated_chatgpt_cost) / estimated_claude_savings * 100):.1f}%")
    
    print("\n🎯 TRAFFIC DISTRIBUTION")
    print("=" * 50)
    print(f"Tasks staying with Claude:  {results['claude_tasks']['total']} ({results['claude_tasks']['total']/len(test_cases)*100:.1f}%)")
    print(f"Tasks offloaded to ChatGPT: {results['chatgpt_tasks']['total']} ({results['chatgpt_tasks']['total']/len(test_cases)*100:.1f}%)")
    
    # Status summary
    if total_accuracy >= 95:
        print("\n✅ TRAFFIC ROUTING: EXCELLENT")
    elif total_accuracy >= 90:
        print("\n🟡 TRAFFIC ROUTING: GOOD")
    else:
        print("\n❌ TRAFFIC ROUTING: NEEDS IMPROVEMENT")
    
    return results

if __name__ == "__main__":
    test_traffic_routing()