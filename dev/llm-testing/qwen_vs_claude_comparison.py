#!/usr/bin/env python3
"""
Qwen vs Claude Direct Coding Comparison
Test both models on the same complex coding tasks
"""

from claudette.qwen_backend import QwenBackend
import time
import subprocess
import tempfile
import sys

def test_qwen_solution(prompt, task_description):
    """Test Qwen's solution to a coding problem"""
    print(f"\n🤖 QWEN SOLUTION: {task_description}")
    print("=" * 50)
    
    config = {'qwen_max_tokens': 800}
    qwen = QwenBackend(config)
    
    start_time = time.time()
    try:
        result = qwen.send(prompt, ['create', 'solution.py'])
        response_time = time.time() - start_time
        
        print(f"⏱️  Response Time: {response_time:.1f}s")
        print(f"📏 Code Length: {len(result)} characters")
        print(f"📝 Solution:\n{result}")
        
        return {
            'solution': result,
            'response_time': response_time,
            'success': True,
            'length': len(result)
        }
    except Exception as e:
        response_time = time.time() - start_time
        print(f"❌ Error: {e}")
        return {
            'solution': None,
            'response_time': response_time,
            'success': False,
            'error': str(e)
        }

def test_claude_solution(prompt, task_description):
    """Test Claude's solution to the same coding problem"""
    print(f"\n🧠 CLAUDE SOLUTION: {task_description}")
    print("=" * 50)
    
    # Use claudette to get Claude's response
    start_time = time.time()
    try:
        # Write prompt to temp file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write(prompt)
            temp_file = f.name
        
        # Call claudette with the prompt
        result = subprocess.run([
            sys.executable, '-m', 'claudette', '--print', prompt
        ], capture_output=True, text=True, timeout=60)
        
        response_time = time.time() - start_time
        
        if result.returncode == 0:
            solution = result.stdout
            print(f"⏱️  Response Time: {response_time:.1f}s")
            print(f"📏 Code Length: {len(solution)} characters")
            print(f"📝 Solution:\n{solution}")
            
            return {
                'solution': solution,
                'response_time': response_time,
                'success': True,
                'length': len(solution)
            }
        else:
            print(f"❌ Claude Error: {result.stderr}")
            return {
                'solution': None,
                'response_time': response_time,
                'success': False,
                'error': result.stderr
            }
            
    except Exception as e:
        response_time = time.time() - start_time
        print(f"❌ Error: {e}")
        return {
            'solution': None,
            'response_time': response_time,
            'success': False,
            'error': str(e)
        }

def analyze_code_quality(code):
    """Analyze code quality metrics"""
    if not code:
        return {'score': 0, 'details': 'No code provided'}
    
    metrics = {
        'has_functions': 'def ' in code,
        'has_classes': 'class ' in code,
        'has_error_handling': any(term in code for term in ['try:', 'except:', 'raise']),
        'has_docstrings': '"""' in code or "'''" in code,
        'has_type_hints': ':' in code and '->' in code,
        'has_imports': 'import ' in code,
        'has_comments': '#' in code,
        'proper_naming': any(char.islower() for char in code),  # Basic check
    }
    
    score = sum(metrics.values()) / len(metrics) * 100
    
    return {
        'score': score,
        'metrics': metrics,
        'line_count': len(code.split('\n')),
        'function_count': code.count('def '),
        'class_count': code.count('class ')
    }

def main():
    print("🔬 QWEN vs CLAUDE CODING COMPARISON")
    print("=" * 60)
    
    # Test 1: Algorithm Implementation
    test1_prompt = """Create a Python implementation of a LRU (Least Recently Used) cache with the following requirements:
- Support get(key) and put(key, value) operations
- Fixed capacity limit
- O(1) time complexity for both operations
- Include proper error handling
- Add type hints and documentation"""
    
    print("\n📋 TEST 1: LRU Cache Implementation")
    qwen_result1 = test_qwen_solution(test1_prompt, "LRU Cache")
    claude_result1 = test_claude_solution(test1_prompt, "LRU Cache")
    
    # Test 2: API Design
    test2_prompt = """Design and implement a Python REST API client for a fictional todo service with:
- CRUD operations (create, read, update, delete todos)
- Authentication handling (JWT tokens)
- Rate limiting and retry logic
- Proper error handling and logging
- Async/await support
- Configuration management"""
    
    print("\n📋 TEST 2: REST API Client")
    qwen_result2 = test_qwen_solution(test2_prompt, "REST API Client")
    claude_result2 = test_claude_solution(test2_prompt, "REST API Client")
    
    # Analysis
    print("\n📊 COMPARISON ANALYSIS")
    print("=" * 60)
    
    tests = [
        ("LRU Cache", qwen_result1, claude_result1),
        ("REST API Client", qwen_result2, claude_result2)
    ]
    
    for test_name, qwen_result, claude_result in tests:
        print(f"\n🎯 {test_name} Analysis:")
        print("-" * 30)
        
        if qwen_result['success']:
            qwen_quality = analyze_code_quality(qwen_result['solution'])
            print(f"Qwen Quality Score: {qwen_quality['score']:.1f}%")
            print(f"Qwen Response Time: {qwen_result['response_time']:.1f}s")
            print(f"Qwen Code Lines: {qwen_quality['line_count']}")
        else:
            print(f"Qwen: ❌ Failed - {qwen_result.get('error', 'Unknown error')}")
        
        if claude_result['success']:
            claude_quality = analyze_code_quality(claude_result['solution'])
            print(f"Claude Quality Score: {claude_quality['score']:.1f}%")
            print(f"Claude Response Time: {claude_result['response_time']:.1f}s")
            print(f"Claude Code Lines: {claude_quality['line_count']}")
        else:
            print(f"Claude: ❌ Failed - {claude_result.get('error', 'Unknown error')}")
    
    print("\n🏆 FINAL COMPARISON SUMMARY")
    print("=" * 40)
    
    # Calculate overall scores
    qwen_successes = sum(1 for r in [qwen_result1, qwen_result2] if r['success'])
    claude_successes = sum(1 for r in [claude_result1, claude_result2] if r['success'])
    
    qwen_avg_time = sum(r['response_time'] for r in [qwen_result1, qwen_result2] if r['success']) / max(qwen_successes, 1)
    claude_avg_time = sum(r['response_time'] for r in [claude_result1, claude_result2] if r['success']) / max(claude_successes, 1)
    
    print(f"Success Rate:")
    print(f"  Qwen:  {qwen_successes}/2 ({qwen_successes*50}%)")
    print(f"  Claude: {claude_successes}/2 ({claude_successes*50}%)")
    
    print(f"\nAverage Response Time:")
    print(f"  Qwen:  {qwen_avg_time:.1f}s")
    print(f"  Claude: {claude_avg_time:.1f}s")
    
    print(f"\nSpeed Advantage: Claude is {qwen_avg_time/claude_avg_time:.1f}x faster" if claude_avg_time > 0 else "Cannot compare speed")

if __name__ == '__main__':
    main()