#!/usr/bin/env python3
"""
Performance test for Claude Cost Tracker
Tests async performance and update intervals
"""

import time
import subprocess
import sys
from pathlib import Path

def run_command(cmd, timeout=5):
    """Run command with timeout"""
    try:
        start = time.time()
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        end = time.time()
        return result.returncode == 0, end - start, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, timeout, "", "Timeout"

def test_performance():
    """Test cost tracking performance"""
    tracker_path = Path(__file__).parent / "claude-cost-tracker.py"
    
    print("🔍 Claude Cost Tracker Performance Test")
    print("=" * 50)
    
    # Test fast-mode vs normal mode
    print("\n📊 Testing Status Bar Performance:")
    
    # Fast mode
    success, time_fast, stdout_fast, stderr_fast = run_command(
        f"python3 {tracker_path} --action status --fast-mode"
    )
    
    # Normal mode
    success, time_normal, stdout_normal, stderr_normal = run_command(
        f"python3 {tracker_path} --action status"
    )
    
    print(f"   Fast mode: {time_fast:.3f}s")
    print(f"   Normal mode: {time_normal:.3f}s")
    print(f"   Speedup: {time_normal/time_fast:.2f}x" if time_fast > 0 else "   Speedup: instant")
    
    # Test hook performance
    print("\n🔗 Testing Hook Performance:")
    
    # Track event performance
    success, time_track, stdout_track, stderr_track = run_command(
        f"python3 {tracker_path} --action track --event-type test --input 'test input' --output 'test output'"
    )
    
    print(f"   Track event: {time_track:.3f}s")
    
    # Test database integrity
    print("\n🗄️ Database Integrity Check:")
    
    # Check event count
    success, time_db, stdout_db, stderr_db = run_command(
        "sqlite3 ~/.claude/cost_tracker.db 'SELECT COUNT(*) FROM usage_events;'"
    )
    
    if success:
        event_count = int(stdout_db.strip())
        print(f"   Total events: {event_count}")
        
        # Check data consistency
        success, time_sum, stdout_sum, stderr_sum = run_command(
            "sqlite3 ~/.claude/cost_tracker.db 'SELECT SUM(cost) FROM usage_events;'"
        )
        
        if success:
            total_cost = float(stdout_sum.strip())
            print(f"   Total cost: ${total_cost:.6f}")
            
            # Check daily summary consistency
            success, time_daily, stdout_daily, stderr_daily = run_command(
                "sqlite3 ~/.claude/cost_tracker.db 'SELECT SUM(total_cost) FROM daily_summary;'"
            )
            
            if success:
                daily_cost = float(stdout_daily.strip())
                print(f"   Daily summary cost: ${daily_cost:.6f}")
                
                if abs(total_cost - daily_cost) < 0.000001:
                    print("   ✅ Data consistency: PASS")
                else:
                    print("   ❌ Data consistency: FAIL")
    
    # Performance benchmarks
    print("\n⚡ Performance Benchmarks:")
    print(f"   Status bar (fast): {time_fast:.3f}s {'✅ PASS' if time_fast < 0.5 else '❌ SLOW'}")
    print(f"   Event tracking: {time_track:.3f}s {'✅ PASS' if time_track < 0.5 else '❌ SLOW'}")
    print(f"   Database query: {time_db:.3f}s {'✅ PASS' if time_db < 0.2 else '❌ SLOW'}")
    
    print("\n🏁 Performance Test Complete")
    
    # Return overall performance score
    avg_time = (time_fast + time_track + time_db) / 3
    return avg_time < 0.3  # Pass if average < 300ms

if __name__ == "__main__":
    passed = test_performance()
    sys.exit(0 if passed else 1)