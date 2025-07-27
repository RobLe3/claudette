#!/usr/bin/env python3
"""
Qwen Performance and Quality Assessment
"""

from claudette.qwen_backend import QwenBackend
import time
import statistics

def main():
    config = {'qwen_max_tokens': 150}
    qwen = QwenBackend(config)

    print('\n4. ⚡ PERFORMANCE AND RELIABILITY TEST')
    print('-' * 40)

    # Test multiple requests to measure consistency
    test_prompts = [
        'Write a simple Python function to validate email addresses',
        'Create a basic error logging utility in Python', 
        'Implement a simple caching decorator',
        'Write a function to parse command line arguments',
        'Create a basic configuration reader'
    ]

    response_times = []
    success_count = 0
    total_tokens = 0

    for i, prompt in enumerate(test_prompts, 1):
        try:
            start_time = time.time()
            result = qwen.send(prompt, ['create', f'test{i}.py'])
            response_time = time.time() - start_time
            
            response_times.append(response_time)
            success_count += 1
            
            # Estimate token usage (rough)
            estimated_tokens = (len(prompt) + len(result)) // 4
            total_tokens += estimated_tokens
            
            print(f'   {i}. ✅ {response_time:.1f}s - {len(result)} chars')
            
        except Exception as e:
            print(f'   {i}. ❌ Failed: {str(e)[:50]}...')

    if response_times:
        avg_time = statistics.mean(response_times)
        min_time = min(response_times)
        max_time = max(response_times)
        
        print(f'\n📊 Performance Statistics:')
        print(f'   📈 Success Rate: {success_count}/{len(test_prompts)} ({success_count/len(test_prompts)*100:.1f}%)')
        print(f'   ⏱️  Average Response Time: {avg_time:.1f}s')
        print(f'   🚀 Fastest Response: {min_time:.1f}s')
        print(f'   🐌 Slowest Response: {max_time:.1f}s')
        print(f'   🔢 Total Estimated Tokens: {total_tokens}')
        print(f'   💰 Estimated Cost: ${total_tokens * 0.002 / 1000:.4f}')
    else:
        print('\n❌ No successful responses to analyze')

if __name__ == '__main__':
    main()