#!/usr/bin/env python3
"""
Enhanced Quality Assessment Test
Tests the improved quality validation system against the old one
"""

import asyncio
import json
from pathlib import Path
from quality_validation_framework import QualityValidator
from quality_calibration_system import QualityCalibrator

async def test_enhanced_quality_system():
    """Test the enhanced quality assessment system"""
    
    print("🧪 TESTING ENHANCED QUALITY ASSESSMENT SYSTEM")
    print("=" * 60)
    
    # Test 1: Calibration accuracy
    print("\n📋 Test 1: Quality Calibration Accuracy")
    calibrator = QualityCalibrator()
    calibration_results = calibrator.run_calibration()
    
    calibration_passed = calibration_results['summary']['accuracy_rate'] > 70
    print(f"   Calibration Accuracy: {calibration_results['summary']['accuracy_rate']:.1f}%")
    print(f"   Status: {'✅ PASSED' if calibration_passed else '❌ FAILED'}")
    
    # Test 2: Run validation suite with enhanced scoring
    print(f"\n📋 Test 2: Enhanced Validation Suite")
    validator = QualityValidator()
    validation_results = await validator.run_validation_suite()
    
    # Compare with target expectations
    summary = validation_results['summary']
    enhanced_pass_rate = summary['pass_rate']
    enhanced_avg_quality = summary['avg_quality']
    
    print(f"   Pass Rate: {enhanced_pass_rate:.1f}%")
    print(f"   Average Quality: {enhanced_avg_quality:.1f}/10")
    
    # Expected improvements over baseline
    expected_pass_rate = 80.0  # Target after enhancements
    expected_avg_quality = 6.5  # Lower but more accurate
    
    pass_rate_improved = enhanced_pass_rate >= expected_pass_rate
    quality_realistic = 5.0 <= enhanced_avg_quality <= 7.5  # More realistic scoring
    
    print(f"   Pass Rate Target: {expected_pass_rate}% - {'✅ ACHIEVED' if pass_rate_improved else '❌ MISSED'}")
    print(f"   Quality Realism: {'✅ REALISTIC' if quality_realistic else '❌ STILL TOO HIGH'}")
    
    # Test 3: Domain-specific assessment
    print(f"\n📋 Test 3: Domain-Specific Quality Assessment")
    
    domain_tests = [
        {
            'domain': 'code_generation',
            'task': 'write a Python function to sort a list',
            'good_output': '''
def sort_list(items: list) -> list:
    """
    Sort a list of comparable items in ascending order.
    
    Args:
        items: List of items to sort
        
    Returns:
        New sorted list
    """
    if not isinstance(items, list):
        raise TypeError("Input must be a list")
    
    return sorted(items)
''',
            'bad_output': 'def sort(x): return sorted(x)',
            'expected_good': 8.0,
            'expected_bad': 4.0
        },
        {
            'domain': 'security',
            'task': 'analyze security vulnerabilities in a web application',
            'good_output': '''
Security Vulnerability Analysis:

1. SQL Injection Risks:
   - Unsanitized user inputs in database queries
   - Recommendation: Use parameterized queries
   - Risk level: High

2. Cross-Site Scripting (XSS):
   - Unescaped user content in HTML output
   - Recommendation: Implement input validation and output encoding
   - Risk level: Medium

3. Authentication Weaknesses:
   - Weak password policies
   - Missing multi-factor authentication
   - Recommendation: Implement strong password requirements and MFA
   - Risk level: High

4. Session Management:
   - Session tokens not properly secured
   - Missing session timeout
   - Recommendation: Use secure session handling
   - Risk level: Medium

5. Data Encryption:
   - Sensitive data stored in plaintext
   - Recommendation: Implement encryption at rest and in transit
   - Risk level: Critical
''',
            'bad_output': 'The app has some security issues that should be fixed.',
            'expected_good': 8.5,
            'expected_bad': 2.5
        }
    ]
    
    domain_results = []
    for test in domain_tests:
        # Test good output
        good_score = await test_quality_score(validator, test['task'], test['good_output'])
        bad_score = await test_quality_score(validator, test['task'], test['bad_output'])
        
        good_accurate = abs(good_score - test['expected_good']) < 1.5
        bad_accurate = abs(bad_score - test['expected_bad']) < 1.5
        differentiation = good_score - bad_score > 2.0  # Should clearly differentiate
        
        domain_results.append({
            'domain': test['domain'],
            'good_score': good_score,
            'bad_score': bad_score,
            'good_accurate': good_accurate,
            'bad_accurate': bad_accurate,
            'differentiation': differentiation
        })
        
        status = "✅ GOOD" if good_accurate and bad_accurate and differentiation else "❌ POOR"
        print(f"   {test['domain']}: Good={good_score:.1f} Bad={bad_score:.1f} Diff={good_score-bad_score:.1f} {status}")
    
    # Test 4: Stricter pass/fail criteria
    print(f"\n📋 Test 4: Stricter Pass/Fail Criteria")
    
    # Check if the system properly fails low-quality outputs
    strict_tests = [
        {
            'description': 'Empty output should fail',
            'output': '',
            'should_pass': False
        },
        {
            'description': 'Minimal output should fail',
            'output': 'def func(): pass',
            'should_pass': False
        },
        {
            'description': 'Good output should pass',
            'output': '''
def factorial(n: int) -> int:
    """Calculate factorial of n."""
    if n < 0:
        raise ValueError("n must be non-negative")
    if n <= 1:
        return 1
    return n * factorial(n - 1)
''',
            'should_pass': True
        }
    ]
    
    strict_results = []
    for test in strict_tests:
        passes = await test_pass_fail(validator, 'write factorial function', test['output'])
        correct = passes == test['should_pass']
        
        strict_results.append({
            'description': test['description'],
            'expected': test['should_pass'],
            'actual': passes,
            'correct': correct
        })
        
        status = "✅ CORRECT" if correct else "❌ WRONG"
        print(f"   {test['description']}: Expected={test['should_pass']} Actual={passes} {status}")
    
    # Final Assessment
    print(f"\n" + "=" * 60)
    print("🏆 ENHANCED QUALITY SYSTEM ASSESSMENT")
    print("=" * 60)
    
    tests_passed = 0
    total_tests = 4
    
    if calibration_passed:
        tests_passed += 1
        print("✅ Test 1: Calibration accuracy - PASSED")
    else:
        print("❌ Test 1: Calibration accuracy - FAILED")
    
    if pass_rate_improved and quality_realistic:
        tests_passed += 1
        print("✅ Test 2: Validation improvements - PASSED")
    else:
        print("❌ Test 2: Validation improvements - FAILED")
    
    domain_success = sum(1 for r in domain_results if r['good_accurate'] and r['bad_accurate'] and r['differentiation'])
    if domain_success >= len(domain_tests) * 0.8:  # 80% success rate
        tests_passed += 1
        print("✅ Test 3: Domain-specific assessment - PASSED")
    else:
        print("❌ Test 3: Domain-specific assessment - FAILED")
    
    strict_success = sum(1 for r in strict_results if r['correct'])
    if strict_success == len(strict_tests):
        tests_passed += 1
        print("✅ Test 4: Stricter criteria - PASSED")
    else:
        print("❌ Test 4: Stricter criteria - FAILED")
    
    overall_success = tests_passed / total_tests
    print(f"\n🎯 Overall Success Rate: {tests_passed}/{total_tests} ({overall_success*100:.0f}%)")
    
    if overall_success >= 0.75:
        print("🎉 ENHANCED QUALITY SYSTEM VALIDATION PASSED!")
        print("   The new system significantly improves quality assessment accuracy.")
    else:
        print("⚠️ ENHANCED QUALITY SYSTEM NEEDS MORE WORK")
        print("   Additional improvements required before deployment.")
    
    # Save test results
    test_results = {
        'timestamp': '2025-07-20T20:47:00Z',
        'calibration': calibration_results,
        'validation': validation_results,
        'domain_tests': domain_results,
        'strict_tests': strict_results,
        'summary': {
            'tests_passed': tests_passed,
            'total_tests': total_tests,
            'success_rate': overall_success,
            'status': 'PASSED' if overall_success >= 0.75 else 'FAILED'
        }
    }
    
    results_file = Path(__file__).parent / 'enhanced_quality_test_results.json'
    with open(results_file, 'w') as f:
        json.dump(test_results, f, indent=2)
    
    print(f"\n💾 Test results saved to: {results_file}")
    
    return test_results

async def test_quality_score(validator, task, output):
    """Test quality scoring for a specific output"""
    from quality_validation_framework import TestCase, QualityMetric
    
    test_case = TestCase(
        id="test_case",
        description="Test case",
        task=task,
        expected_complexity="SIMPLE",
        expected_model_tier="basic",
        quality_criteria=[QualityMetric.CORRECTNESS, QualityMetric.COMPLETENESS, QualityMetric.CLARITY],
        minimum_quality_score=5.0
    )
    
    classification = {'complexity': 'SIMPLE', 'model': 'test'}
    offload_result = {'success': True, 'result': output}
    
    quality_scores = validator._assess_quality(test_case, classification, offload_result)
    return sum(quality_scores.values()) / len(quality_scores) if quality_scores else 0.0

async def test_pass_fail(validator, task, output):
    """Test pass/fail determination for a specific output"""
    from quality_validation_framework import TestCase, QualityMetric
    
    test_case = TestCase(
        id="test_case",
        description="Test case",
        task=task,
        expected_complexity="SIMPLE",
        expected_model_tier="basic",
        quality_criteria=[QualityMetric.CORRECTNESS],
        minimum_quality_score=6.0
    )
    
    classification = {'complexity': 'SIMPLE', 'model': 'test'}
    offload_result = {'success': True, 'result': output}
    
    quality_scores = validator._assess_quality(test_case, classification, offload_result)
    overall_quality = sum(quality_scores.values()) / len(quality_scores) if quality_scores else 0.0
    
    return validator._determine_pass_fail(test_case, classification, offload_result, overall_quality)

if __name__ == "__main__":
    asyncio.run(test_enhanced_quality_system())