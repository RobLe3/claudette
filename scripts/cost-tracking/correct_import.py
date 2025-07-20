#!/usr/bin/env python3
"""
Correct import of Claude logs with proper token counting
"""

import json
import os
import sys
import sqlite3
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

def correct_import():
    """Import Claude logs with correct token counting"""
    log_file = find_claude_log()
    if not log_file:
        print("❌ No Claude log file found")
        return
    
    tracker = ClaudeCostTracker()
    
    print("🔄 Correcting Claude Code Log Import")
    print("=" * 50)
    
    # Clear existing data
    conn = sqlite3.connect(tracker.db_path)
    cursor = conn.cursor()
    
    print("🗑️  Clearing incorrect data...")
    cursor.execute("DELETE FROM usage_events")
    cursor.execute("DELETE FROM usage_sessions")
    cursor.execute("DELETE FROM daily_summary")
    cursor.execute("DELETE FROM weekly_summary")
    cursor.execute("DELETE FROM monthly_summary")
    conn.commit()
    conn.close()
    
    session_id = "claude_flow_session_corrected"
    session_start = None
    session_end = None
    
    imported_count = 0
    total_input_tokens = 0
    total_output_tokens = 0
    total_cost = 0.0
    
    # Track by task for billing directory
    task_breakdown = defaultdict(lambda: {
        'input_tokens': 0,
        'output_tokens': 0,
        'cost': 0.0,
        'messages': 0,
        'start_time': None,
        'end_time': None
    })
    
    print("📊 Importing with CORRECT token counting...")
    
    with open(log_file, 'r') as f:
        for line_num, line in enumerate(f, 1):
            try:
                data = json.loads(line.strip())
                
                # Get timestamp
                timestamp_str = data.get('timestamp', '')
                if timestamp_str:
                    timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                    if session_start is None:
                        session_start = timestamp
                    session_end = timestamp
                else:
                    timestamp = datetime.now()
                
                # Look for assistant messages with usage data
                if (data.get('type') == 'assistant' and 
                    'message' in data and 
                    'usage' in data['message']):
                    
                    usage = data['message']['usage']
                    
                    # ONLY count ACTUAL tokens - NOT cache tokens
                    input_tokens = usage.get('input_tokens', 0)
                    output_tokens = usage.get('output_tokens', 0)
                    
                    # Determine task type
                    task_type = "conversation"
                    content = data['message'].get('content', [])
                    if isinstance(content, list):
                        for item in content:
                            if isinstance(item, dict) and item.get('type') == 'tool_use':
                                tool_name = item.get('name', 'unknown_tool')
                                task_type = f"tool_{tool_name}"
                                break
                    
                    # Calculate cost using API pricing (ignoring subscription for now)
                    model = data['message'].get('model', 'claude-sonnet-4-20250514')
                    if model in tracker.api_pricing:
                        pricing = tracker.api_pricing[model]
                        cost = input_tokens * pricing['input'] + output_tokens * pricing['output']
                    else:
                        cost = 0.0
                    
                    # Track by task
                    task_breakdown[task_type]['input_tokens'] += input_tokens
                    task_breakdown[task_type]['output_tokens'] += output_tokens
                    task_breakdown[task_type]['cost'] += cost
                    task_breakdown[task_type]['messages'] += 1
                    if task_breakdown[task_type]['start_time'] is None:
                        task_breakdown[task_type]['start_time'] = timestamp
                    task_breakdown[task_type]['end_time'] = timestamp
                    
                    # Import into database
                    conn = sqlite3.connect(tracker.db_path)
                    cursor = conn.cursor()
                    
                    cursor.execute('''
                        INSERT INTO usage_events 
                        (session_id, timestamp, event_type, input_tokens, output_tokens, cost, model_name, command, file_path)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (session_id, timestamp, 'claude_conversation', input_tokens, output_tokens, cost, model, task_type, ''))
                    
                    conn.commit()
                    conn.close()
                    
                    total_input_tokens += input_tokens
                    total_output_tokens += output_tokens
                    total_cost += cost
                    imported_count += 1
                    
                    if imported_count % 50 == 0:
                        print(f"   📊 Imported {imported_count} events...")
                        
            except Exception as e:
                continue
    
    # Create session record
    if session_start and session_end:
        conn = sqlite3.connect(tracker.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO usage_sessions (session_id, start_time, end_time, total_cost, total_input_tokens, total_output_tokens)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (session_id, session_start, session_end, total_cost, total_input_tokens, total_output_tokens))
        
        # Update daily summary
        session_date = session_start.date()
        cursor.execute('''
            INSERT OR REPLACE INTO daily_summary (date, total_cost, total_input_tokens, total_output_tokens, session_count)
            VALUES (?, ?, ?, ?, 1)
        ''', (session_date, total_cost, total_input_tokens, total_output_tokens))
        
        conn.commit()
        conn.close()
    
    # Create billing directory
    billing_dir = Path("/Users/roble/Documents/Python/claude_flow/billing")
    billing_dir.mkdir(exist_ok=True)
    
    # Create detailed billing report
    billing_file = billing_dir / f"billing_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
    
    with open(billing_file, 'w') as f:
        f.write("# Claude Flow Billing Report\n\n")
        f.write(f"**Session Date:** {session_start.strftime('%Y-%m-%d')}\n")
        f.write(f"**Session Time:** {session_start.strftime('%H:%M:%S')} - {session_end.strftime('%H:%M:%S')}\n")
        f.write(f"**Total Duration:** {session_end - session_start}\n\n")
        
        f.write("## Summary\n\n")
        f.write(f"- **Total Messages:** {imported_count:,}\n")
        f.write(f"- **Total Input Tokens:** {total_input_tokens:,}\n")
        f.write(f"- **Total Output Tokens:** {total_output_tokens:,}\n")
        f.write(f"- **Total Tokens:** {total_input_tokens + total_output_tokens:,}\n")
        f.write(f"- **Total Cost:** ${total_cost:.6f}\n")
        f.write(f"- **Total Cost (EUR):** €{tracker.usd_to_euros(total_cost):.6f}\n\n")
        
        f.write("## Task Breakdown\n\n")
        f.write("| Task Type | Messages | Input Tokens | Output Tokens | Total Tokens | Cost (USD) | Cost (EUR) | Duration |\n")
        f.write("|-----------|----------|--------------|---------------|--------------|------------|------------|----------|\n")
        
        for task_type, task_data in sorted(task_breakdown.items(), key=lambda x: x[1]['cost'], reverse=True):
            total_tokens = task_data['input_tokens'] + task_data['output_tokens']
            cost_eur = tracker.usd_to_euros(task_data['cost'])
            duration = task_data['end_time'] - task_data['start_time'] if task_data['start_time'] else timedelta(0)
            
            f.write(f"| {task_type} | {task_data['messages']} | {task_data['input_tokens']:,} | {task_data['output_tokens']:,} | {total_tokens:,} | ${task_data['cost']:.6f} | €{cost_eur:.6f} | {duration} |\n")
    
    print(f"\n✅ **CORRECTED IMPORT COMPLETE**")
    print("=" * 50)
    print(f"📊 Imported Events: {imported_count:,}")
    print(f"📥 Total Input Tokens: {total_input_tokens:,}")
    print(f"📤 Total Output Tokens: {total_output_tokens:,}")
    print(f"🧮 Total Tokens: {total_input_tokens + total_output_tokens:,}")
    print(f"💰 Total Cost: ${total_cost:.6f}")
    print(f"💰 Total Cost (EUR): €{tracker.usd_to_euros(total_cost):.6f}")
    print(f"📄 Billing report saved to: {billing_file}")
    
    return total_cost

if __name__ == "__main__":
    from datetime import timedelta
    correct_import()