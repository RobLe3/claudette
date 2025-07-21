#!/usr/bin/env python3
"""
Test cases to validate model selection issues and fixes
Identifies specific problems in the enhanced_model_switching.py
"""

import sys
from pathlib import Path

# Add to path for imports
sys.path.append(str(Path(__file__).parent))
from enhanced_model_switching import EnhancedModelSelector, TaskComplexity

def test_model_selection_issues():
    """Test and identify specific issues in model selection"""
    
    print("🧪 TESTING MODEL SELECTION ISSUES")
    print("=" * 50)
    
    selector = EnhancedModelSelector()
    
    # Test Case 1: CRITICAL ISSUE - Complex tasks getting cheap models
    print("\n❌ ISSUE 1: Complex tasks getting cheap models")
    complex_task = "design a distributed microservices architecture with fault tolerance"
    classification = selector.classify_task(complex_task)
    selection = selector.select_optimal_model(classification, current_budget_used=0.0)
    
    print(f"Task: {complex_task}")
    print(f"Complexity: {classification['complexity'].name}")
    print(f"Selected Model: {selection.get('model', 'Claude fallback')}")
    print(f"Model Tier: {selection.get('tier', 'N/A')}")
    
    # This should select a PREMIUM or FLAGSHIP model, not BASIC
    if selection.get('tier') in ['basic', 'advanced']:
        print(f"🔴 BUG: Complex task assigned {selection.get('tier')} tier model!")
    else:
        print(f"✅ Correct: Complex task assigned {selection.get('tier')} tier model")
    
    # Test Case 2: CRITICAL ISSUE - Emergency mode not working
    print("\n❌ ISSUE 2: Emergency mode not working for critical tasks")
    critical_task = "security vulnerability assessment for financial system"
    classification = selector.classify_task(critical_task)
    selection = selector.select_optimal_model(classification, current_budget_used=9.5)  # High budget usage
    
    print(f"Task: {critical_task}")
    print(f"Complexity: {classification['complexity'].name}")
    print(f"Budget used: $9.50 / $10.00 (95%)")
    print(f"Selected Model: {selection.get('model', 'Claude fallback')}")
    
    # For CRITICAL tasks, should allow expensive models even with high budget usage
    if selection.get('recommendation') == 'claude_fallback':
        print("🔴 BUG: Critical task rejected due to budget - emergency mode not working!")
    else:
        print("✅ Correct: Critical task gets expensive model despite budget")
    
    # Test Case 3: CRITICAL ISSUE - Quality thresholds ignored
    print("\n❌ ISSUE 3: Quality requirements being ignored")
    
    # Check models for CRITICAL complexity task
    critical_classification = {
        'task_type': 'security_tasks',
        'complexity': TaskComplexity.CRITICAL,
        'quality_requirement': 9.8,  # Very high quality needed
        'max_cost_per_1k': 0.100,
        'confidence': 0.9,
        'context_size': 5000
    }
    
    selection = selector.select_optimal_model(critical_classification, current_budget_used=0.0)
    
    print(f"Quality Required: {critical_classification['quality_requirement']}")
    print(f"Selected Model Quality: {selection.get('quality_score', 0)}")
    
    if selection.get('quality_score', 0) < critical_classification['quality_requirement']:
        print("🔴 BUG: Selected model doesn't meet quality requirements!")
    else:
        print("✅ Correct: Selected model meets quality requirements")
    
    # Test Case 4: CRITICAL ISSUE - Cost calculation errors
    print("\n❌ ISSUE 4: Cost calculation errors")
    
    # Test cost estimation
    trivial_classification = {
        'task_type': 'trivial_tasks', 
        'complexity': TaskComplexity.TRIVIAL,
        'quality_requirement': 6.0,
        'max_cost_per_1k': 0.001,
        'confidence': 0.9,
        'context_size': 100
    }
    
    trivial_selection = selector.select_optimal_model(trivial_classification, current_budget_used=0.0)
    trivial_cost = trivial_selection.get('estimated_cost', 0)
    
    moderate_classification = {
        'task_type': 'complex_code_generation',
        'complexity': TaskComplexity.MODERATE, 
        'quality_requirement': 8.5,
        'max_cost_per_1k': 0.010,
        'confidence': 0.9,
        'context_size': 5000
    }
    
    moderate_selection = selector.select_optimal_model(moderate_classification, current_budget_used=0.0)
    moderate_cost = moderate_selection.get('estimated_cost', 0)
    
    print(f"TRIVIAL task cost: ${trivial_cost:.4f}")
    print(f"MODERATE task cost: ${moderate_cost:.4f}")
    
    if trivial_cost >= moderate_cost:
        print("🔴 BUG: Trivial task costs same or more than moderate task!")
    else:
        print("✅ Correct: Trivial task costs less than moderate task")
    
    # Test Case 5: PRIORITY LOGIC ERROR - Cost-effectiveness calculation
    print("\n❌ ISSUE 5: Wrong cost-effectiveness calculation")
    
    # Check the cost-effectiveness function logic
    models = selector.models
    
    # Find models for comparison
    basic_model = None
    premium_model = None
    
    for name, config in models.items():
        if config['tier'].value == 'basic' and not basic_model:
            basic_model = (name, config)
        elif config['tier'].value == 'premium' and not premium_model:
            premium_model = (name, config)
    
    if basic_model and premium_model:
        basic_name, basic_config = basic_model
        premium_name, premium_config = premium_model
        
        # Calculate cost-effectiveness manually
        basic_avg_cost = (basic_config['input_cost_per_1k'] + basic_config['output_cost_per_1k']) / 2
        premium_avg_cost = (premium_config['input_cost_per_1k'] + premium_config['output_cost_per_1k']) / 2
        
        basic_ce = basic_config['quality_score'] / basic_avg_cost
        premium_ce = premium_config['quality_score'] / premium_avg_cost
        
        print(f"Basic model ({basic_name}): Quality {basic_config['quality_score']:.1f} / Cost ${basic_avg_cost:.4f} = {basic_ce:.2f}")
        print(f"Premium model ({premium_name}): Quality {premium_config['quality_score']:.1f} / Cost ${premium_avg_cost:.4f} = {premium_ce:.2f}")
        
        # For complex tasks, should prioritize quality over cost-effectiveness
        if basic_ce > premium_ce:
            print("🔴 BUG: Basic model has higher cost-effectiveness - will be selected for complex tasks!")
        else:
            print("✅ Correct: Premium model has better cost-effectiveness for quality tasks")
    
    print("\n" + "=" * 50)
    print("🔍 SUMMARY OF IDENTIFIED ISSUES:")
    print("1. ❌ Complex tasks may get basic/advanced models instead of premium/flagship")
    print("2. ❌ Emergency mode for critical tasks not working properly")
    print("3. ❌ Quality requirements not being enforced")
    print("4. ❌ Cost estimation may be incorrect")
    print("5. ❌ Cost-effectiveness calculation favors cheap models over quality")

def test_expected_outcomes():
    """Test expected outcomes from the requirements"""
    
    print("\n🎯 TESTING EXPECTED OUTCOMES")
    print("=" * 50)
    
    selector = EnhancedModelSelector()
    
    test_cases = [
        ("print hello world", TaskComplexity.TRIVIAL, ["gpt-3.5-turbo", "gpt-4o-mini"]),
        ("write a simple function", TaskComplexity.SIMPLE, ["gpt-4o-mini"]),
        ("implement REST API", TaskComplexity.MODERATE, ["gpt-4o-mini", "gpt-4o"]),
        ("design microservices architecture", TaskComplexity.COMPLEX, ["gpt-4o", "gpt-4"]),
        ("security vulnerability assessment", TaskComplexity.CRITICAL, ["gpt-4", "gpt-4.1"])
    ]
    
    for task, expected_complexity, expected_models in test_cases:
        classification = selector.classify_task(task)
        selection = selector.select_optimal_model(classification, current_budget_used=0.0)
        
        actual_model = selection.get('model', 'Claude fallback')
        
        print(f"\nTask: {task}")
        print(f"Expected complexity: {expected_complexity.name}")
        print(f"Actual complexity: {classification['complexity'].name}")
        print(f"Expected models: {expected_models}")
        print(f"Actual model: {actual_model}")
        
        complexity_correct = classification['complexity'] == expected_complexity
        model_correct = any(expected in actual_model for expected in expected_models) if actual_model != 'Claude fallback' else False
        
        print(f"Complexity match: {'✅' if complexity_correct else '❌'}")
        print(f"Model match: {'✅' if model_correct else '❌'}")

if __name__ == "__main__":
    test_model_selection_issues()
    test_expected_outcomes()