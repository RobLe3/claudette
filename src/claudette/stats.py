"""
Cost Statistics CLI for Claudette
Provides detailed cost analysis and statistics from session history
"""

import sqlite3
import argparse
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from pathlib import Path
import sys

from .cache import get_cache_manager


def format_currency(amount: float) -> str:
    """Format currency with appropriate precision"""
    if amount < 0.01:
        return f"${amount:.4f}"
    return f"${amount:.2f}"


def estimate_cost(backend: str, tokens: int) -> float:
    """Estimate cost based on backend and token count"""
    # Cost per 1K tokens (input + output averaged)
    cost_rates = {
        'claude': 0.015,      # Claude Sonnet average
        'openai': 0.0015,     # GPT-3.5-turbo average  
        'mistral': 0.0007,    # Mistral 7B average
        'ollama': 0.0,        # Local - no cost
        'fallback': 0.001     # Fallback estimate
    }
    
    rate = cost_rates.get(backend.lower(), 0.001)
    return (tokens / 1000.0) * rate


def get_time_filter(period: str) -> Optional[str]:
    """Convert period string to SQL timestamp filter"""
    if not period:
        return None
    
    now = datetime.utcnow()
    
    if period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start = now - timedelta(days=7)
    elif period == "month":
        start = now - timedelta(days=30)
    elif period.endswith("d"):
        try:
            days = int(period[:-1])
            start = now - timedelta(days=days)
        except ValueError:
            return None
    else:
        return None
    
    return start.isoformat()


def query_stats(cache_manager, backend: str = None, period: str = None, 
                file_filter: str = None) -> List[Dict[str, Any]]:
    """Query statistics from cache database"""
    
    # Build WHERE clause
    conditions = []
    params = []
    
    if backend:
        conditions.append("backend = ?")
        params.append(backend)
    
    if period:
        time_filter = get_time_filter(period)
        if time_filter:
            conditions.append("timestamp >= ?")
            params.append(time_filter)
    
    if file_filter:
        conditions.append("files LIKE ?")
        params.append(f"%{file_filter}%")
    
    where_clause = " AND ".join(conditions) if conditions else "1=1"
    
    # Execute query with parameterized WHERE clause - SECURITY FIX
    base_query = """
        SELECT 
            DATE(timestamp) as date,
            backend,
            SUM(compressed_tokens) as total_tokens,
            COUNT(*) as request_count,
            GROUP_CONCAT(DISTINCT cmd) as commands
        FROM events 
        WHERE """
    
    # Build secure WHERE clause without f-string interpolation
    if conditions:
        where_clause = " AND ".join(conditions)
        full_query = base_query + where_clause + """
            GROUP BY DATE(timestamp), backend
            ORDER BY date DESC, backend
        """
    else:
        full_query = base_query + """1=1
            GROUP BY DATE(timestamp), backend
            ORDER BY date DESC, backend
        """
    
    with sqlite3.connect(cache_manager.db_path) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.execute(full_query, params)
        
        return [dict(row) for row in cursor.fetchall()]


def print_stats_table(stats: List[Dict[str, Any]]):
    """Print formatted statistics table"""
    if not stats:
        print("No statistics found for the specified filters.")
        return
    
    # Calculate totals
    total_tokens = sum(row['total_tokens'] or 0 for row in stats)
    total_cost = sum(estimate_cost(row['backend'], row['total_tokens'] or 0) for row in stats)
    total_requests = sum(row['request_count'] for row in stats)
    
    # Print header
    print(f"{'Date':<12} {'Backend':<8} {'Tokens':<8} {'Cost':<8} {'Requests':<9} {'Commands':<20}")
    print("-" * 70)
    
    # Print rows
    for row in stats:
        tokens = row['total_tokens'] or 0
        cost = estimate_cost(row['backend'], tokens)
        commands = (row['commands'] or 'unknown')[:18]
        
        print(f"{row['date']:<12} {row['backend']:<8} {tokens:<8} "
              f"{format_currency(cost):<8} {row['request_count']:<9} {commands:<20}")
    
    # Print totals
    print("-" * 70)
    print(f"{'TOTALS':<12} {'ALL':<8} {total_tokens:<8} "
          f"{format_currency(total_cost):<8} {total_requests:<9}")
    
    # Print summary
    print(f"\nSummary:")
    print(f"  Total requests: {total_requests}")
    print(f"  Total tokens: {total_tokens:,}")
    print(f"  Estimated cost: {format_currency(total_cost)}")
    
    # Backend breakdown
    backend_stats = {}
    for row in stats:
        backend = row['backend']
        if backend not in backend_stats:
            backend_stats[backend] = {'tokens': 0, 'cost': 0.0, 'requests': 0}
        
        backend_stats[backend]['tokens'] += row['total_tokens'] or 0
        backend_stats[backend]['cost'] += estimate_cost(row['backend'], row['total_tokens'] or 0)
        backend_stats[backend]['requests'] += row['request_count']
    
    if len(backend_stats) > 1:
        print(f"\nBy Backend:")
        for backend, data in sorted(backend_stats.items()):
            pct_tokens = (data['tokens'] / total_tokens * 100) if total_tokens > 0 else 0
            pct_cost = (data['cost'] / total_cost * 100) if total_cost > 0 else 0
            print(f"  {backend}: {data['requests']} requests, {data['tokens']:,} tokens "
                  f"({pct_tokens:.1f}%), {format_currency(data['cost'])} ({pct_cost:.1f}%)")


def get_top_files(cache_manager, limit: int = 10) -> List[Dict[str, Any]]:
    """Get top files by usage"""
    with sqlite3.connect(cache_manager.db_path) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.execute("""
            SELECT 
                files,
                COUNT(*) as usage_count,
                SUM(compressed_tokens) as total_tokens,
                MAX(timestamp) as last_used
            FROM events 
            WHERE files != '[]' AND files != ''
            GROUP BY files
            ORDER BY usage_count DESC, total_tokens DESC
            LIMIT ?
        """, (limit,))
        
        return [dict(row) for row in cursor.fetchall()]


def print_top_files(files_data: List[Dict[str, Any]]):
    """Print top files table"""
    if not files_data:
        print("No file usage data found.")
        return
    
    print(f"\nTop Files by Usage:")
    print(f"{'Files':<40} {'Uses':<6} {'Tokens':<8} {'Last Used':<12}")
    print("-" * 70)
    
    for row in files_data:
        files_str = row['files'][:37] + "..." if len(row['files']) > 40 else row['files']
        last_used = row['last_used'][:10]  # Date only
        tokens = row['total_tokens'] or 0
        
        print(f"{files_str:<40} {row['usage_count']:<6} {tokens:<8} {last_used:<12}")


def cmd_stats(args):
    """Main stats command handler"""
    try:
        # Initialize cache manager
        cache_manager = get_cache_manager()
        
        # Get statistics
        stats = query_stats(
            cache_manager,
            backend=args.backend,
            period=args.period, 
            file_filter=args.file
        )
        
        # Print results
        print_stats_table(stats)
        
        # Show top files if requested
        if args.files:
            files_data = get_top_files(cache_manager, limit=args.files)
            print_top_files(files_data)
        
        # Show cache info
        if args.info:
            stats_info = cache_manager.get_stats()
            print(f"\nCache Information:")
            print(f"  Database: {stats_info['db_path']}")
            print(f"  Total events: {stats_info['total_events']:,}")
            print(f"  Database size: {stats_info['db_size_mb']:.1f} MB")
            print(f"  Cache hits: {stats_info['cache_hits']:,}")
            print(f"  Hit rate: {stats_info['hit_rate']:.1f}%")
        
    except sqlite3.Error as e:
        print("Error retrieving statistics: Database query failed", file=sys.stderr)
        sys.exit(1)
    except ValueError as e:
        print("Error retrieving statistics: Invalid input parameters", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print("Error retrieving statistics: An unexpected error occurred", file=sys.stderr)
        sys.exit(1)


def setup_stats_parser(subparsers):
    """Setup stats subcommand parser"""
    parser = subparsers.add_parser(
        'stats',
        help='Display cost statistics and usage analytics',
        description='Analyze costs, tokens, and usage patterns from claudette history'
    )
    
    parser.add_argument(
        '--backend', '-b',
        help='Filter by backend (claude, openai, mistral, ollama)',
        choices=['claude', 'openai', 'mistral', 'ollama', 'fallback']
    )
    
    parser.add_argument(
        '--period', '-p', 
        help='Time period filter (today, week, month, Nd for N days)',
        default=None
    )
    
    parser.add_argument(
        '--file', '-f',
        help='Filter by file pattern (partial filename match)',
        default=None
    )
    
    parser.add_argument(
        '--files',
        type=int,
        help='Show top N files by usage (default: disabled)',
        metavar='N'
    )
    
    parser.add_argument(
        '--info', '-i',
        action='store_true',
        help='Show cache database information'
    )
    
    parser.set_defaults(func=cmd_stats)
    return parser


if __name__ == '__main__':
    # Standalone execution for testing
    parser = argparse.ArgumentParser(description='Claudette Cost Statistics')
    setup_stats_parser(parser._subparsers)
    args = parser.parse_args()
    
    if hasattr(args, 'func'):
        args.func(args)
    else:
        parser.print_help()