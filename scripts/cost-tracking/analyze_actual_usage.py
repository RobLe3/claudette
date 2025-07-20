#!/usr/bin/env python3
"""
Analyze actual token usage from Claude logs to understand real costs
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Import by loading the module directly
import importlib.util
spec = importlib.util.spec_from_file_location("claude_cost_tracker", 
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "claude-cost-tracker.py"))
claude_cost_tracker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(claude_cost_tracker)
ClaudeCostTracker = claude_cost_tracker.ClaudeCostTracker

def find_claude_log():
    """Find the Claude log file"""
    claude_dir = Path.home() / ".claude" / "projects"
    
    for project_dir in claude_dir.iterdir():
        if project_dir.is_dir():
            for log_file in project_dir.glob("*.jsonl"):
                return log_file
    return None

def analyze_usage_patterns():
    """Analyze actual usage patterns from logs"""
    log_file = find_claude_log()
    if not log_file:
        print("❌ No Claude log file found")
        return
    
    print("🔍 Analyzing ACTUAL Token Usage Patterns")
    print("=" * 60)
    
    # Track different types of tokens
    actual_input_tokens = 0
    actual_output_tokens = 0
    cache_creation_tokens = 0
    cache_read_tokens = 0
    message_count = 0
    
    # Track by time
    hourly_usage = defaultdict(lambda: {'input': 0, 'output': 0, 'messages': 0})
    
    # Track by task type (based on message content)
    task_usage = defaultdict(lambda: {'input': 0, 'output': 0, 'messages': 0, 'cost': 0.0})
    
    tracker = ClaudeCostTracker()
    
    with open(log_file, 'r') as f:
        for line_num, line in enumerate(f, 1):
            try:
                data = json.loads(line.strip())
                
                # Look for assistant messages with usage data
                if (data.get('type') == 'assistant' and 
                    'message' in data and 
                    'usage' in data['message']):
                    
                    usage = data['message']['usage']
                    
                    # ONLY count actual input/output tokens, NOT cache tokens
                    input_tokens = usage.get('input_tokens', 0)
                    output_tokens = usage.get('output_tokens', 0)
                    cache_creation = usage.get('cache_creation_input_tokens', 0)
                    cache_read = usage.get('cache_read_input_tokens', 0)
                    
                    # Track separately
                    actual_input_tokens += input_tokens
                    actual_output_tokens += output_tokens
                    cache_creation_tokens += cache_creation
                    cache_read_tokens += cache_read
                    message_count += 1
                    
                    # Get timestamp for hourly tracking
                    timestamp_str = data.get('timestamp', '')
                    if timestamp_str:
                        timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                        hour_key = timestamp.strftime('%Y-%m-%d %H:00')
                        hourly_usage[hour_key]['input'] += input_tokens
                        hourly_usage[hour_key]['output'] += output_tokens
                        hourly_usage[hour_key]['messages'] += 1
                    
                    # Determine task type from content
                    content = data['message'].get('content', [])
                    task_type = "conversation"
                    
                    if isinstance(content, list):
                        for item in content:
                            if isinstance(item, dict):
                                if item.get('type') == 'tool_use':
                                    tool_name = item.get('name', 'unknown_tool')
                                    task_type = f"tool_{tool_name}"
                                    break
                                elif item.get('type') == 'text':
                                    text = item.get('text', '').lower()
                                    if 'file' in text or 'edit' in text:
                                        task_type = "file_operations"
                                    elif 'cost' in text or 'token' in text:
                                        task_type = "cost_tracking"
                                    elif 'database' in text or 'sql' in text:
                                        task_type = "database_operations"
                                    elif 'import' in text or 'module' in text:
                                        task_type = "code_development"
                                    break
                    
                    # Track by task type
                    task_usage[task_type]['input'] += input_tokens
                    task_usage[task_type]['output'] += output_tokens
                    task_usage[task_type]['messages'] += 1
                    
                    # Calculate ACTUAL cost (only for real tokens, not cache)
                    model = data['message'].get('model', 'claude-sonnet-4-20250514')
                    cost = tracker.calculate_cost(input_tokens, output_tokens, model)
                    task_usage[task_type]['cost'] += cost
                    
            except (json.JSONDecodeError, KeyError, Exception) as e:
                continue
    
    # Display results
    print(f"\n📊 **ACTUAL TOKEN USAGE ANALYSIS**")
    print("=" * 60)
    print(f"🎯 Total Messages: {message_count:,}")
    print(f"📥 ACTUAL Input Tokens: {actual_input_tokens:,}")
    print(f"📤 ACTUAL Output Tokens: {actual_output_tokens:,}")
    print(f"🧮 ACTUAL Total Tokens: {actual_input_tokens + actual_output_tokens:,}")
    print(f"💾 Cache Creation Tokens: {cache_creation_tokens:,}")
    print(f"🔄 Cache Read Tokens: {cache_read_tokens:,}")
    
    # Calculate actual costs
    total_actual_cost = 0
    for task_type, usage in task_usage.items():
        total_actual_cost += usage['cost']
    
    cost_eur = tracker.usd_to_euros(total_actual_cost)
    print(f"💰 ACTUAL Cost: ${total_actual_cost:.4f} ({cost_eur:.4f}€)")
    
    # Show the difference
    print(f"\n⚠️  **COMPARISON**")
    print("=" * 60)
    print(f"❌ Previous calculation (with cache): 24,294,186 tokens")
    print(f"✅ Actual tokens (without cache): {actual_input_tokens + actual_output_tokens:,} tokens")
    print(f"📊 Difference: {24_294_186 - (actual_input_tokens + actual_output_tokens):,} tokens")
    print(f"💡 Cache tokens were incorrectly counted as billable!")
    
    # Show usage by task type
    print(f"\n📋 **USAGE BY TASK TYPE**")
    print("=" * 60)
    for task_type, usage in sorted(task_usage.items(), key=lambda x: x[1]['input'] + x[1]['output'], reverse=True):
        total_tokens = usage['input'] + usage['output']
        cost_eur = tracker.usd_to_euros(usage['cost'])
        print(f"{task_type:20} | {total_tokens:8,} tokens | {usage['messages']:3} msgs | €{cost_eur:.4f}")
    
    # Show usage by hour
    print(f"\n⏰ **USAGE BY HOUR**")
    print("=" * 60)
    for hour, usage in sorted(hourly_usage.items()):
        total_tokens = usage['input'] + usage['output']
        print(f"{hour} | {total_tokens:6,} tokens | {usage['messages']:3} msgs")
    
    return {
        'actual_input_tokens': actual_input_tokens,
        'actual_output_tokens': actual_output_tokens,
        'cache_creation_tokens': cache_creation_tokens,
        'cache_read_tokens': cache_read_tokens,
        'total_actual_cost': total_actual_cost,
        'task_usage': dict(task_usage),
        'hourly_usage': dict(hourly_usage)
    }

if __name__ == "__main__":
    results = analyze_usage_patterns()