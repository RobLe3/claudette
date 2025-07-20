#!/usr/bin/env python3
"""
Import Claude Code logs into the cost tracking database
"""

import json
import os
import sys
import sqlite3
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

def import_claude_log(log_file):
    """Import Claude log file into cost tracking database"""
    tracker = ClaudeCostTracker()
    
    print(f"📁 Importing log file: {log_file}")
    
    # Clear existing data (since it's incomplete)
    conn = sqlite3.connect(tracker.db_path)
    cursor = conn.cursor()
    
    print("🗑️  Clearing incomplete data...")
    cursor.execute("DELETE FROM usage_events")
    cursor.execute("DELETE FROM usage_sessions")
    cursor.execute("DELETE FROM daily_summary")
    cursor.execute("DELETE FROM weekly_summary")
    cursor.execute("DELETE FROM monthly_summary")
    conn.commit()
    conn.close()
    
    session_id = "claude_flow_session_complete"
    session_start = None
    session_end = None
    
    imported_count = 0
    total_cost = 0.0
    total_input_tokens = 0
    total_output_tokens = 0
    
    print("📊 Importing conversation data...")
    
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
                    input_tokens = usage.get('input_tokens', 0)
                    output_tokens = usage.get('output_tokens', 0)
                    cache_creation = usage.get('cache_creation_input_tokens', 0)
                    cache_read = usage.get('cache_read_input_tokens', 0)
                    
                    # Total tokens include all types
                    effective_input = input_tokens + cache_creation + cache_read
                    
                    # Calculate cost using the tracker's pricing
                    model = data['message'].get('model', 'claude-sonnet-4-20250514')
                    cost = tracker.calculate_cost(effective_input, output_tokens, model)
                    
                    # Import into database
                    conn = sqlite3.connect(tracker.db_path)
                    cursor = conn.cursor()
                    
                    # Insert usage event
                    cursor.execute('''
                        INSERT INTO usage_events 
                        (session_id, timestamp, event_type, input_tokens, output_tokens, cost, model_name, command, file_path)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (session_id, timestamp, 'claude_conversation', effective_input, output_tokens, cost, model, '', ''))
                    
                    conn.commit()
                    conn.close()
                    
                    total_input_tokens += effective_input
                    total_output_tokens += output_tokens
                    total_cost += cost
                    imported_count += 1
                    
                    # Show progress every 50 messages
                    if imported_count % 50 == 0:
                        print(f"   📊 Imported {imported_count} conversation events...")
                        
            except json.JSONDecodeError:
                print(f"   ⚠️  Skipping malformed JSON on line {line_num}")
                continue
            except Exception as e:
                print(f"   ⚠️  Error on line {line_num}: {e}")
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
    
    return {
        'imported_count': imported_count,
        'total_cost': total_cost,
        'total_input_tokens': total_input_tokens,
        'total_output_tokens': total_output_tokens,
        'session_start': session_start,
        'session_end': session_end
    }

def main():
    print("🔄 Claude Code Log Importer")
    print("=" * 50)
    
    # Find the log file
    log_file = find_claude_log()
    if not log_file:
        print("❌ No Claude log file found")
        return
    
    # Import the log
    results = import_claude_log(log_file)
    
    # Display results
    print(f"\n✅ **IMPORT COMPLETE**")
    print("=" * 50)
    print(f"📊 Imported Events: {results['imported_count']:,}")
    print(f"📥 Total Input Tokens: {results['total_input_tokens']:,}")
    print(f"📤 Total Output Tokens: {results['total_output_tokens']:,}")
    print(f"💰 Total Cost: ${results['total_cost']:.4f}")
    
    # Convert to EUR
    tracker = ClaudeCostTracker()
    cost_eur = tracker.usd_to_euros(results['total_cost'])
    print(f"💰 Total Cost (EUR): €{cost_eur:.4f}")
    
    print(f"📅 Session Duration: {results['session_start']} to {results['session_end']}")
    
    # Verify the import
    print(f"\n🔍 **VERIFICATION**")
    print("=" * 50)
    
    # Check database totals
    conn = sqlite3.connect(tracker.db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*), SUM(input_tokens), SUM(output_tokens), SUM(cost) FROM usage_events")
    db_result = cursor.fetchone()
    conn.close()
    
    if db_result:
        count, db_input, db_output, db_cost = db_result
        print(f"✅ Database Events: {count:,}")
        print(f"✅ Database Input Tokens: {db_input:,}")
        print(f"✅ Database Output Tokens: {db_output:,}")
        print(f"✅ Database Cost: ${db_cost:.4f}")
        
        if count == results['imported_count']:
            print("✅ Import verification: PASSED")
        else:
            print("❌ Import verification: FAILED")

if __name__ == "__main__":
    main()