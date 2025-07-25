#!/usr/bin/env python3
"""
Cost Comparison Test - Real-world scenarios comparing systems
"""

import sys
from pathlib import Path
from datetime import datetime

# Import both systems
sys.path.append(str(Path(__file__).parent))
from cost_conservation_integration import CostConservationSystem
from enhanced_model_switching import EnhancedModelSelector

def run_cost_comparison():
    """Run direct cost comparison between systems"""
    
    conservation = CostConservationSystem()
    legacy = EnhancedModelSelector()
    
    # Real-world test scenarios
    scenarios = [
        "explain how this JavaScript function works",
        "write a hello world program in Python", 
        "create a REST API endpoint for user login",
        "review this code for potential bugs",
        "implement user authentication with JWT",
        "write unit tests for this module",
        "design a microservices architecture", 
        "optimize database query performance",
        "create documentation for this API",
        "debug this error message",
        "security analysis of this system",
        "spawn agents for swarm coordination"
    ]
    
    print("🔄 COST COMPARISON: Conservation vs Legacy")
    print("=" * 60)
    
    total_conservation_cost = 0
    total_legacy_cost = 0
    conservation_claude_tasks = 0
    legacy_claude_tasks = 0
    
    for i, scenario in enumerate(scenarios, 1):
        print(f"\n📋 Test {i}: {scenario[:40]}...")
        
        # Test cost conservation system
        conservation_result = conservation.classify_and_route_task(scenario)
        if conservation_result['route_to'] == 'claude':
            conservation_claude_tasks += 1
        
        # Test legacy system
        legacy_classification = legacy.classify_task(scenario, 1000)
        legacy_selection = legacy.select_optimal_model(legacy_classification, 0.0)
        
        if legacy_selection['recommendation'] == 'claude_fallback':
            legacy_cost = 0.016  # Claude cost
            legacy_model = 'claude'
            legacy_claude_tasks += 1
        else:
            legacy_cost = legacy_selection['estimated_cost']
            legacy_model = legacy_selection['model']
        
        total_conservation_cost += conservation_result['estimated_cost']
        total_legacy_cost += legacy_cost
        
        savings = legacy_cost - conservation_result['estimated_cost']
        savings_percent = (savings / legacy_cost * 100) if legacy_cost > 0 else 0
        
        print(f"   Conservation: ${conservation_result['estimated_cost']:.4f} ({conservation_result.get('model', 'claude')})")
        print(f"   Legacy:       ${legacy_cost:.4f} ({legacy_model})")
        print(f"   Savings:      ${savings:.4f} ({savings_percent:.1f}%)")
    
    # Summary
    total_savings = total_legacy_cost - total_conservation_cost
    total_savings_percent = (total_savings / total_legacy_cost * 100) if total_legacy_cost > 0 else 0
    
    print(f"\n🏆 SUMMARY RESULTS:")
    print(f"=" * 60)
    print(f"📊 Total Scenarios: {len(scenarios)}")
    print(f"💰 Conservation Total: ${total_conservation_cost:.4f}")
    print(f"💰 Legacy Total:       ${total_legacy_cost:.4f}")
    print(f"💰 Total Savings:      ${total_savings:.4f} ({total_savings_percent:.1f}%)")
    print(f"🤖 Conservation Claude: {conservation_claude_tasks}/{len(scenarios)} ({conservation_claude_tasks/len(scenarios)*100:.1f}%)")
    print(f"🤖 Legacy Claude:       {legacy_claude_tasks}/{len(scenarios)} ({legacy_claude_tasks/len(scenarios)*100:.1f}%)")
    print(f"🎯 Claude Reduction:    {legacy_claude_tasks - conservation_claude_tasks} tasks ({(legacy_claude_tasks - conservation_claude_tasks)/len(scenarios)*100:.1f}%)")
    
    # Monthly/Annual projections
    monthly_tasks = 500  # Assume 500 tasks per month
    annual_tasks = 6000  # Assume 6000 tasks per year
    
    monthly_savings = (total_savings / len(scenarios)) * monthly_tasks
    annual_savings = (total_savings / len(scenarios)) * annual_tasks
    
    print(f"\n📈 PROJECTIONS:")
    print(f"📅 Monthly Savings (500 tasks): ${monthly_savings:.2f}")
    print(f"📅 Annual Savings (6000 tasks): ${annual_savings:.0f}")
    
    return {
        'total_savings_percent': total_savings_percent,
        'conservation_claude_usage': conservation_claude_tasks / len(scenarios) * 100,
        'legacy_claude_usage': legacy_claude_tasks / len(scenarios) * 100,
        'claude_reduction': (legacy_claude_tasks - conservation_claude_tasks) / len(scenarios) * 100,
        'monthly_savings': monthly_savings,
        'annual_savings': annual_savings
    }

if __name__ == "__main__":
    run_cost_comparison()