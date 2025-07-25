#!/usr/bin/env python3
"""
Classification Algorithm Accuracy Test
Tests the improved task classification algorithm against validation datasets
"""

import sys
import json
from enhanced_model_switching import EnhancedModelSelector, TaskComplexity

def create_validation_dataset():
    """Create comprehensive validation dataset with expected classifications"""
    return [
        # TRIVIAL TASKS (Expected: TRIVIAL)
        {
            "task": "write a hello world function",
            "expected": TaskComplexity.TRIVIAL,
            "category": "trivial"
        },
        {
            "task": "print hello world",
            "expected": TaskComplexity.TRIVIAL,
            "category": "trivial"
        },
        {
            "task": "simple print statement",
            "expected": TaskComplexity.TRIVIAL,
            "category": "trivial"
        },
        {
            "task": "basic variable assignment",
            "expected": TaskComplexity.TRIVIAL,
            "category": "trivial"
        },
        {
            "task": "convert string to uppercase",
            "expected": TaskComplexity.TRIVIAL,
            "category": "trivial"
        },
        
        # SIMPLE TASKS (Expected: SIMPLE)
        {
            "task": "write a simple function to calculate sum",
            "expected": TaskComplexity.SIMPLE,
            "category": "simple"
        },
        {
            "task": "create a basic class for user data",
            "expected": TaskComplexity.SIMPLE,
            "category": "simple"
        },
        {
            "task": "implement simple sorting algorithm",
            "expected": TaskComplexity.SIMPLE,
            "category": "simple"
        },
        {
            "task": "write documentation for this function",
            "expected": TaskComplexity.SIMPLE,
            "category": "simple"
        },
        {
            "task": "create a README file",
            "expected": TaskComplexity.SIMPLE,
            "category": "simple"
        },
        
        # MODERATE TASKS (Expected: MODERATE)
        {
            "task": "create a REST API endpoint",
            "expected": TaskComplexity.MODERATE,
            "category": "moderate"
        },
        {
            "task": "build a web application feature",
            "expected": TaskComplexity.MODERATE,
            "category": "moderate"
        },
        {
            "task": "implement authentication system",
            "expected": TaskComplexity.MODERATE,
            "category": "moderate"
        },
        {
            "task": "analyze code for performance issues",
            "expected": TaskComplexity.MODERATE,
            "category": "moderate"
        },
        {
            "task": "optimize database queries",
            "expected": TaskComplexity.MODERATE,
            "category": "moderate"
        },
        
        # COMPLEX TASKS (Expected: COMPLEX)
        {
            "task": "design microservices architecture",
            "expected": TaskComplexity.COMPLEX,
            "category": "complex"
        },
        {
            "task": "architect a distributed system",
            "expected": TaskComplexity.COMPLEX,
            "category": "complex"
        },
        {
            "task": "research machine learning approaches",
            "expected": TaskComplexity.COMPLEX,
            "category": "complex"
        },
        {
            "task": "create scalable framework",
            "expected": TaskComplexity.COMPLEX,
            "category": "complex"
        },
        {
            "task": "technical analysis of emerging technologies",
            "expected": TaskComplexity.COMPLEX,
            "category": "complex"
        },
        
        # CRITICAL TASKS (Expected: CRITICAL)
        {
            "task": "security analysis of financial system",
            "expected": TaskComplexity.CRITICAL,
            "category": "critical"
        },
        {
            "task": "vulnerability assessment of web application",
            "expected": TaskComplexity.CRITICAL,
            "category": "critical"
        },
        {
            "task": "penetration testing of network",
            "expected": TaskComplexity.CRITICAL,
            "category": "critical"
        },
        {
            "task": "implement cryptographic security",
            "expected": TaskComplexity.CRITICAL,
            "category": "critical"
        },
        {
            "task": "design mission critical system",
            "expected": TaskComplexity.CRITICAL,
            "category": "critical"
        },
        {
            "task": "fault tolerant system design",
            "expected": TaskComplexity.CRITICAL,
            "category": "critical"
        }
    ]

def test_classification_accuracy():
    """Test classification accuracy with validation dataset"""
    selector = EnhancedModelSelector()
    validation_data = create_validation_dataset()
    
    results = {
        'total_tests': len(validation_data),
        'correct_classifications': 0,
        'category_accuracy': {},
        'detailed_results': [],
        'confusion_matrix': {}
    }
    
    # Initialize category counters
    categories = ['trivial', 'simple', 'moderate', 'complex', 'critical']
    for cat in categories:
        results['category_accuracy'][cat] = {'correct': 0, 'total': 0, 'accuracy': 0.0}
        results['confusion_matrix'][cat] = {c: 0 for c in categories}
    
    print("🧪 TESTING CLASSIFICATION ALGORITHM ACCURACY")
    print("=" * 60)
    
    for test_case in validation_data:
        task = test_case['task']
        expected = test_case['expected']
        category = test_case['category']
        
        # Classify the task
        classification = selector.classify_task(task)
        actual = classification['complexity']
        confidence = classification['confidence']
        
        # Check if classification is correct
        is_correct = actual == expected
        
        if is_correct:
            results['correct_classifications'] += 1
            results['category_accuracy'][category]['correct'] += 1
        
        results['category_accuracy'][category]['total'] += 1
        
        # Update confusion matrix
        actual_cat = actual.name.lower()
        if actual_cat not in results['confusion_matrix']:
            results['confusion_matrix'][actual_cat] = {c: 0 for c in categories}
        
        if actual_cat in results['confusion_matrix'] and category in results['confusion_matrix'][actual_cat]:
            results['confusion_matrix'][actual_cat][category] += 1
        
        # Store detailed result
        result_detail = {
            'task': task,
            'expected': expected.name,
            'actual': actual.name,
            'category': category,
            'correct': is_correct,
            'confidence': confidence,
            'score': classification.get('score', 0.0)
        }
        results['detailed_results'].append(result_detail)
        
        # Print result
        status = "✅" if is_correct else "❌"
        print(f"{status} {task[:50]:<50} | Expected: {expected.name:<8} | Got: {actual.name:<8} | Conf: {confidence:.2f}")
    
    # Calculate category accuracies
    for cat in categories:
        if results['category_accuracy'][cat]['total'] > 0:
            accuracy = results['category_accuracy'][cat]['correct'] / results['category_accuracy'][cat]['total']
            results['category_accuracy'][cat]['accuracy'] = accuracy
    
    # Calculate overall accuracy
    overall_accuracy = results['correct_classifications'] / results['total_tests']
    results['overall_accuracy'] = overall_accuracy
    
    return results

def print_detailed_report(results):
    """Print comprehensive accuracy report"""
    print("\n" + "=" * 60)
    print("📊 CLASSIFICATION ACCURACY REPORT")
    print("=" * 60)
    
    # Overall accuracy
    accuracy_pct = results['overall_accuracy'] * 100
    print(f"\n🎯 OVERALL ACCURACY: {accuracy_pct:.1f}% ({results['correct_classifications']}/{results['total_tests']})")
    
    if accuracy_pct >= 90:
        print("🎉 EXCELLENT: Target 90%+ accuracy achieved!")
    elif accuracy_pct >= 75:
        print("🎯 GOOD: Above 75% accuracy")
    elif accuracy_pct >= 50:
        print("⚠️  NEEDS IMPROVEMENT: Below 75% accuracy")
    else:
        print("❌ POOR: Major improvements needed")
    
    print(f"\n📈 ACCURACY BY COMPLEXITY LEVEL:")
    print("-" * 40)
    
    categories = ['trivial', 'simple', 'moderate', 'complex', 'critical']
    for cat in categories:
        if results['category_accuracy'][cat]['total'] > 0:
            accuracy = results['category_accuracy'][cat]['accuracy'] * 100
            correct = results['category_accuracy'][cat]['correct']
            total = results['category_accuracy'][cat]['total']
            print(f"├── {cat.upper():<8}: {accuracy:5.1f}% ({correct}/{total})")
    
    print(f"\n🔍 CLASSIFICATION DETAILS:")
    print("-" * 40)
    
    # Group by category for better analysis
    for cat in categories:
        cat_results = [r for r in results['detailed_results'] if r['category'] == cat]
        if cat_results:
            print(f"\n{cat.upper()} TASKS:")
            for result in cat_results:
                status = "✅" if result['correct'] else "❌"
                print(f"  {status} {result['task'][:60]:<60} → {result['actual']:<8} (conf: {result['confidence']:.2f})")
    
    # Error analysis
    errors = [r for r in results['detailed_results'] if not r['correct']]
    if errors:
        print(f"\n❌ CLASSIFICATION ERRORS ({len(errors)} total):")
        print("-" * 40)
        for error in errors:
            print(f"├── \"{error['task'][:50]}\"")
            print(f"│   Expected: {error['expected']} → Got: {error['actual']} (confidence: {error['confidence']:.2f})")
    
    print(f"\n💡 ALGORITHM IMPROVEMENTS:")
    print("-" * 30)
    if accuracy_pct >= 90:
        print("✅ Classification patterns are working well")
        print("✅ Semantic keyword scoring is effective")  
        print("✅ Anti-keyword penalties are preventing misclassification")
    else:
        print("🔧 Consider improving regex patterns for failed cases")
        print("🔧 Add more specific keywords for edge cases")
        print("🔧 Tune confidence scoring thresholds")

def main():
    """Main test execution"""
    print("🚀 STARTING CLASSIFICATION ALGORITHM ACCURACY TEST")
    print("Testing improved algorithm against validation dataset...")
    
    try:
        # Run accuracy test
        results = test_classification_accuracy()
        
        # Print detailed report
        print_detailed_report(results)
        
        # Save results to file
        with open('classification_test_results.json', 'w') as f:
            # Convert enum values to strings for JSON serialization
            json_results = json.loads(json.dumps(results, default=str))
            json.dump(json_results, f, indent=2)
        
        print(f"\n💾 Detailed results saved to: classification_test_results.json")
        
        # Return success code based on accuracy
        if results['overall_accuracy'] >= 0.90:
            print(f"\n🎉 SUCCESS: Algorithm achieves 90%+ accuracy target!")
            return 0
        else:
            print(f"\n⚠️  NEEDS WORK: Algorithm accuracy below 90% target")
            return 1
            
    except Exception as e:
        print(f"\n❌ ERROR during testing: {e}")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)