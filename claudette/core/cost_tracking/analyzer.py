#!/usr/bin/env python3
"""
Analyze real Claude Pro usage limits based on footer warning
"""

import json
import os
from pathlib import Path
from datetime import datetime, timedelta
from collections import defaultdict, OrderedDict

def find_claude_log():
    """Find the Claude log file"""
    claude_dir = Path.home() / ".claude" / "projects"
    
    for project_dir in claude_dir.iterdir():
        if project_dir.is_dir():
            for log_file in project_dir.glob("*.jsonl"):
                return log_file
    return None

def analyze_real_usage():
    """Analyze real usage including cache tokens which may count towards limits"""
    log_file = find_claude_log()
    if not log_file:
        print("❌ No Claude log file found")
        return
    
    print("🔍 Analyzing REAL Claude Pro Usage Limits")
    print("=" * 60)
    print("📋 Based on footer warning: 'Approaching usage limit · resets at 2am'")
    print("=" * 60)
    
    # Track all token types
    actual_input_tokens = 0
    actual_output_tokens = 0
    cache_creation_tokens = 0
    cache_read_tokens = 0
    
    # Track chronologically for historical breakdown
    historical_tasks = []
    
    # Track by 5-hour cycles (Claude Pro resets every 5 hours)
    cycle_usage = defaultdict(lambda: {
        'input': 0, 'output': 0, 'cache_creation': 0, 'cache_read': 0, 
        'total_context': 0, 'messages': 0, 'start_time': None, 'end_time': None
    })
    
    # Current time for cycle calculation
    now = datetime.now()
    
    message_count = 0
    
    with open(log_file, 'r') as f:
        for line_num, line in enumerate(f, 1):
            try:
                data = json.loads(line.strip())
                
                # Look for assistant messages with usage data
                if (data.get('type') == 'assistant' and 
                    'message' in data and 
                    'usage' in data['message']):
                    
                    usage = data['message']['usage']
                    
                    # Get all token types
                    input_tokens = usage.get('input_tokens', 0)
                    output_tokens = usage.get('output_tokens', 0)
                    cache_creation = usage.get('cache_creation_input_tokens', 0)
                    cache_read = usage.get('cache_read_input_tokens', 0)
                    
                    # Get timestamp
                    timestamp_str = data.get('timestamp', '')
                    if timestamp_str:
                        timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                    else:
                        timestamp = now
                    
                    # Calculate 5-hour cycle
                    # Claude Pro resets every 5 hours, let's assume starting from midnight
                    hours_since_midnight = timestamp.hour + timestamp.minute/60.0
                    cycle_number = int(hours_since_midnight // 5)
                    cycle_key = f"{timestamp.date()}_cycle_{cycle_number}"
                    
                    # Determine task type
                    task_type = "conversation"
                    content = data['message'].get('content', [])
                    if isinstance(content, list):
                        for item in content:
                            if isinstance(item, dict) and item.get('type') == 'tool_use':
                                tool_name = item.get('name', 'unknown_tool')
                                task_type = f"tool_{tool_name}"
                                break
                    
                    # Calculate total context used (might include cache for limit purposes)
                    total_context_tokens = input_tokens + cache_creation + cache_read
                    
                    # Add to historical tasks
                    historical_tasks.append({
                        'timestamp': timestamp,
                        'task_type': task_type,
                        'input_tokens': input_tokens,
                        'output_tokens': output_tokens,
                        'cache_creation': cache_creation,
                        'cache_read': cache_read,
                        'total_context': total_context_tokens,
                        'total_tokens': input_tokens + output_tokens,
                        'message_id': data.get('uuid', f'msg_{message_count}')
                    })
                    
                    # Track by cycle
                    cycle_data = cycle_usage[cycle_key]
                    cycle_data['input'] += input_tokens
                    cycle_data['output'] += output_tokens
                    cycle_data['cache_creation'] += cache_creation
                    cycle_data['cache_read'] += cache_read
                    cycle_data['total_context'] += total_context_tokens
                    cycle_data['messages'] += 1
                    
                    if cycle_data['start_time'] is None:
                        cycle_data['start_time'] = timestamp
                    cycle_data['end_time'] = timestamp
                    
                    # Track totals
                    actual_input_tokens += input_tokens
                    actual_output_tokens += output_tokens
                    cache_creation_tokens += cache_creation
                    cache_read_tokens += cache_read
                    
                    message_count += 1
                    
            except Exception as e:
                continue
    
    # Calculate various possible limits
    total_actual_tokens = actual_input_tokens + actual_output_tokens
    total_context_tokens = actual_input_tokens + actual_output_tokens + cache_creation_tokens + cache_read_tokens
    
    print(f"\n📊 **TOKEN USAGE ANALYSIS**")
    print("=" * 60)
    print(f"🎯 Total Messages: {message_count:,}")
    print(f"📥 Input Tokens: {actual_input_tokens:,}")
    print(f"📤 Output Tokens: {actual_output_tokens:,}")
    print(f"🧮 Actual Tokens (input + output): {total_actual_tokens:,}")
    print(f"💾 Cache Creation Tokens: {cache_creation_tokens:,}")
    print(f"🔄 Cache Read Tokens: {cache_read_tokens:,}")
    print(f"🌍 Total Context (all tokens): {total_context_tokens:,}")
    
    # Estimate limits based on "approaching" warning
    print(f"\n⚠️  **LIMIT ANALYSIS**")
    print("=" * 60)
    
    # If we're "approaching" the limit, we might be at 80-90% of capacity
    # Let's estimate what the actual limits might be
    for percentage in [75, 80, 85, 90, 95]:
        estimated_limit_actual = int(total_actual_tokens / (percentage / 100))
        estimated_limit_context = int(total_context_tokens / (percentage / 100))
        
        print(f"If at {percentage}% of limit:")
        print(f"  - Actual tokens limit: ~{estimated_limit_actual:,} (current: {total_actual_tokens:,})")
        print(f"  - Context tokens limit: ~{estimated_limit_context:,} (current: {total_context_tokens:,})")
    
    # Show usage by 5-hour cycles
    print(f"\n⏰ **USAGE BY 5-HOUR CYCLES**")
    print("=" * 60)
    print("| Cycle | Messages | Input | Output | Cache Creation | Cache Read | Total Context |")
    print("|-------|----------|-------|--------|----------------|------------|---------------|")
    
    for cycle_key in sorted(cycle_usage.keys()):
        cycle_data = cycle_usage[cycle_key]
        print(f"| {cycle_key} | {cycle_data['messages']:3} | {cycle_data['input']:5,} | {cycle_data['output']:6,} | {cycle_data['cache_creation']:8,} | {cycle_data['cache_read']:8,} | {cycle_data['total_context']:9,} |")
    
    # Create detailed historical breakdown
    print(f"\n📋 **HISTORICAL TASK BREAKDOWN**")
    print("=" * 60)
    
    # Group by task type and show cumulative usage
    task_totals = defaultdict(lambda: {
        'count': 0, 'input': 0, 'output': 0, 'cache_creation': 0, 'cache_read': 0, 
        'total_context': 0, 'first_use': None, 'last_use': None
    })
    
    for task in historical_tasks:
        task_type = task['task_type']
        task_data = task_totals[task_type]
        
        task_data['count'] += 1
        task_data['input'] += task['input_tokens']
        task_data['output'] += task['output_tokens']
        task_data['cache_creation'] += task['cache_creation']
        task_data['cache_read'] += task['cache_read']
        task_data['total_context'] += task['total_context']
        
        if task_data['first_use'] is None:
            task_data['first_use'] = task['timestamp']
        task_data['last_use'] = task['timestamp']
    
    print("| Task Type | Count | Input | Output | Cache Creation | Cache Read | Total Context | Duration |")
    print("|-----------|-------|-------|--------|----------------|------------|---------------|----------|")
    
    for task_type in sorted(task_totals.keys(), key=lambda x: task_totals[x]['total_context'], reverse=True):
        task_data = task_totals[task_type]
        duration = task_data['last_use'] - task_data['first_use'] if task_data['first_use'] else timedelta(0)
        
        print(f"| {task_type} | {task_data['count']:3} | {task_data['input']:5,} | {task_data['output']:6,} | {task_data['cache_creation']:8,} | {task_data['cache_read']:8,} | {task_data['total_context']:9,} | {duration} |")
    
    # Write detailed report
    billing_dir = Path("/Users/roble/Documents/Python/claude_flow/billing")
    billing_dir.mkdir(exist_ok=True)
    
    detailed_report = billing_dir / f"detailed_usage_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
    
    with open(detailed_report, 'w') as f:
        f.write("# Detailed Claude Pro Usage Analysis\n\n")
        f.write("## Context\n\n")
        f.write("This analysis was triggered by the footer warning: **'Approaching usage limit · resets at 2am'**\n\n")
        
        f.write("## Token Usage Summary\n\n")
        f.write(f"- **Total Messages:** {message_count:,}\n")
        f.write(f"- **Input Tokens:** {actual_input_tokens:,}\n")
        f.write(f"- **Output Tokens:** {actual_output_tokens:,}\n")
        f.write(f"- **Actual Tokens (input + output):** {total_actual_tokens:,}\n")
        f.write(f"- **Cache Creation Tokens:** {cache_creation_tokens:,}\n")
        f.write(f"- **Cache Read Tokens:** {cache_read_tokens:,}\n")
        f.write(f"- **Total Context (all tokens):** {total_context_tokens:,}\n\n")
        
        f.write("## Chronological Task History\n\n")
        f.write("| Timestamp | Task Type | Input | Output | Cache Creation | Cache Read | Total Context |\n")
        f.write("|-----------|-----------|-------|--------|----------------|------------|---------------|\n")
        
        for task in historical_tasks:
            f.write(f"| {task['timestamp'].strftime('%H:%M:%S')} | {task['task_type']} | {task['input_tokens']:,} | {task['output_tokens']:,} | {task['cache_creation']:,} | {task['cache_read']:,} | {task['total_context']:,} |\n")
    
    print(f"\n📄 Detailed analysis saved to: {detailed_report}")
    
    return {
        'total_actual_tokens': total_actual_tokens,
        'total_context_tokens': total_context_tokens,
        'message_count': message_count,
        'historical_tasks': historical_tasks,
        'task_totals': dict(task_totals)
    }

if __name__ == "__main__":
    analyze_real_usage()