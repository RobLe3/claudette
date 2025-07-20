#!/usr/bin/env python3
"""
Parse Claude Code logs to extract actual token usage
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime

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
    
    # Look for project directories
    for project_dir in claude_dir.iterdir():
        if project_dir.is_dir():
            # Look for JSONL files
            for log_file in project_dir.glob("*.jsonl"):
                return log_file
    
    return None

def parse_claude_log(log_file):
    """Parse Claude log file and extract token usage"""
    total_input_tokens = 0
    total_output_tokens = 0
    total_cache_creation_tokens = 0
    total_cache_read_tokens = 0
    total_cost = 0.0
    
    message_count = 0
    tracker = ClaudeCostTracker()
    
    print(f"📁 Parsing log file: {log_file}")
    
    with open(log_file, 'r') as f:
        for line_num, line in enumerate(f, 1):
            try:
                data = json.loads(line.strip())
                
                # Look for assistant messages with usage data
                if (data.get('type') == 'assistant' and 
                    'message' in data and 
                    'usage' in data['message']):
                    
                    usage = data['message']['usage']
                    input_tokens = usage.get('input_tokens', 0)
                    output_tokens = usage.get('output_tokens', 0)
                    cache_creation = usage.get('cache_creation_input_tokens', 0)
                    cache_read = usage.get('cache_read_input_tokens', 0)
                    
                    # Total tokens include all types
                    effective_input = input_tokens + cache_creation + cache_read
                    
                    # Calculate cost using the tracker's pricing
                    model = data['message'].get('model', 'claude-sonnet-4-20250514')
                    cost = tracker.calculate_cost(effective_input, output_tokens, model)
                    
                    total_input_tokens += effective_input
                    total_output_tokens += output_tokens
                    total_cache_creation_tokens += cache_creation
                    total_cache_read_tokens += cache_read
                    total_cost += cost
                    
                    message_count += 1
                    
                    # Show progress every 100 messages
                    if message_count % 100 == 0:
                        print(f"   📊 Processed {message_count} messages...")
                        
            except json.JSONDecodeError:
                print(f"   ⚠️  Skipping malformed JSON on line {line_num}")
                continue
            except Exception as e:
                print(f"   ⚠️  Error on line {line_num}: {e}")
                continue
    
    return {
        'total_input_tokens': total_input_tokens,
        'total_output_tokens': total_output_tokens,
        'total_cache_creation_tokens': total_cache_creation_tokens,
        'total_cache_read_tokens': total_cache_read_tokens,
        'total_cost': total_cost,
        'message_count': message_count
    }

def main():
    print("🔍 Claude Code Log Parser")
    print("=" * 50)
    
    # Find the log file
    log_file = find_claude_log()
    if not log_file:
        print("❌ No Claude log file found")
        return
    
    # Parse the log
    results = parse_claude_log(log_file)
    
    # Display results
    print(f"\n📊 **ACTUAL TOKEN USAGE ANALYSIS**")
    print("=" * 50)
    print(f"🎯 Total Messages: {results['message_count']:,}")
    print(f"📥 Total Input Tokens: {results['total_input_tokens']:,}")
    print(f"📤 Total Output Tokens: {results['total_output_tokens']:,}")
    print(f"💾 Cache Creation Tokens: {results['total_cache_creation_tokens']:,}")
    print(f"🔄 Cache Read Tokens: {results['total_cache_read_tokens']:,}")
    print(f"🧮 Total Tokens: {results['total_input_tokens'] + results['total_output_tokens']:,}")
    print(f"💰 Total Cost: ${results['total_cost']:.4f}")
    
    # Convert to EUR
    tracker = ClaudeCostTracker()
    cost_eur = tracker.usd_to_euros(results['total_cost'])
    print(f"💰 Total Cost (EUR): €{cost_eur:.4f}")
    
    # Compare with current database
    print(f"\n📊 **COMPARISON WITH DATABASE**")
    print("=" * 50)
    
    # Get current database totals
    import sqlite3
    conn = sqlite3.connect(tracker.db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT SUM(input_tokens), SUM(output_tokens), SUM(cost) FROM usage_events")
    db_result = cursor.fetchone()
    conn.close()
    
    if db_result:
        db_input, db_output, db_cost = db_result
        print(f"📊 Database Input Tokens: {db_input or 0:,}")
        print(f"📊 Database Output Tokens: {db_output or 0:,}")
        print(f"📊 Database Cost: ${db_cost or 0:.4f}")
        
        # Show the discrepancy
        print(f"\n⚠️  **DISCREPANCY ANALYSIS**")
        print("=" * 50)
        print(f"Missing Input Tokens: {results['total_input_tokens'] - (db_input or 0):,}")
        print(f"Missing Output Tokens: {results['total_output_tokens'] - (db_output or 0):,}")
        print(f"Missing Cost: ${results['total_cost'] - (db_cost or 0):.4f}")
        print(f"Missing Cost (EUR): €{tracker.usd_to_euros(results['total_cost'] - (db_cost or 0)):.4f}")

if __name__ == "__main__":
    main()