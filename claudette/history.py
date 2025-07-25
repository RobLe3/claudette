"""
History management for Claudette sessions
CLI interface for querying past operations
"""

import argparse
import json
from datetime import datetime
from typing import List, Dict, Any

from .cache import get_cache_manager


def format_timestamp(timestamp_str: str) -> str:
    """Format timestamp for display"""
    try:
        dt = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        return dt.strftime('%Y-%m-%d %H:%M:%S')
    except ValueError:
        return timestamp_str


def format_files(files_json: str) -> str:
    """Format files list for display"""
    try:
        if isinstance(files_json, str):
            files = json.loads(files_json)
        else:
            files = files_json
            
        if not files:
            return "no files"
        elif len(files) == 1:
            return files[0]
        else:
            return f"{files[0]} (+{len(files)-1} more)"
    except (json.JSONDecodeError, TypeError):
        return str(files_json) if files_json else "no files"


def format_prompt_excerpt(prompt: str, max_length: int = 60) -> str:
    """Format prompt excerpt for display"""
    if not prompt:
        return "no prompt"
    
    # Clean up the prompt - remove newlines and extra spaces
    clean_prompt = ' '.join(prompt.strip().split())
    
    if len(clean_prompt) <= max_length:
        return clean_prompt
    else:
        return clean_prompt[:max_length-3] + "..."


def calculate_token_cost(backend: str, tokens: int) -> str:
    """Estimate token cost based on backend and token count"""
    if not tokens:
        return "unknown"
    
    # Rough cost estimates per 1k tokens (as of 2025)
    cost_per_1k = {
        'claude': 0.008,     # Claude Pro estimate
        'openai': 0.002,     # GPT-3.5-turbo
        'mistral': 0.0002,   # Mistral tiny
        'ollama': 0.0,       # Local inference
        'fallback': 0.0      # No cost
    }
    
    rate = cost_per_1k.get(backend.lower(), 0.001)
    cost = (tokens / 1000) * rate
    
    if cost == 0:
        return "free"
    elif cost < 0.001:
        return "<$0.001"
    else:
        return f"~${cost:.3f}"


def print_history_table(events: List[Dict[str, Any]]):
    """Print history events in table format"""
    if not events:
        print("No history entries found.")
        return
    
    print(f"{'Timestamp':<19} {'Backend':<8} {'Cost':<8} {'Files':<25} {'Prompt':<40}")
    print("=" * 100)
    
    for event in events:
        timestamp = format_timestamp(event['timestamp'])
        backend = event['backend'][:8]
        tokens = event.get('compressed_tokens', 0) or 0
        cost = calculate_token_cost(backend, tokens)
        files = format_files(event['files'])[:25]
        prompt = format_prompt_excerpt(event.get('raw_prompt', ''))[:40]
        
        print(f"{timestamp:<19} {backend:<8} {cost:<8} {files:<25} {prompt:<40}")


def print_detailed_event(event: Dict[str, Any]):
    """Print single event with full details"""
    print(f"Event ID: {event['id']}")
    print(f"Timestamp: {format_timestamp(event['timestamp'])}")
    print(f"Command: {event['cmd']}")
    print(f"Backend: {event['backend']}")
    print(f"Files: {format_files(event['files'])}")
    
    if event.get('compressed_tokens'):
        cost = calculate_token_cost(event['backend'], event['compressed_tokens'])
        print(f"Tokens: {event['compressed_tokens']} (~{cost})")
    
    if event.get('raw_prompt'):
        prompt = event['raw_prompt'][:200]
        if len(event['raw_prompt']) > 200:
            prompt += "..."
        print(f"Prompt: {prompt}")
    
    if event.get('response_hash'):
        print(f"Response hash: {event['response_hash'][:16]}...")
    
    print("-" * 60)


def show_cache_stats():
    """Display cache statistics"""
    cache = get_cache_manager()
    stats = cache.get_stats()
    
    print("Cache Statistics:")
    print(f"  Database: {stats['db_path']}")
    print(f"  Size: {stats['db_size_mb']} MB")
    print(f"  Total events: {stats['total_events']}")
    
    if stats['backends']:
        print("  Backend usage:")
        for backend, count in stats['backends'].items():
            print(f"    {backend}: {count} events")
    
    if stats['daily_usage']:
        print("  Recent daily usage:")
        for date, count in list(stats['daily_usage'].items())[:3]:
            print(f"    {date}: {count} events")


def create_parser() -> argparse.ArgumentParser:
    """Create argument parser for history command"""
    parser = argparse.ArgumentParser(
        prog='claudette history',
        description='Query Claudette session history'
    )
    
    # Filtering options
    parser.add_argument('--last', '-l', type=int, metavar='N',
                       help='Show last N entries (default: 10)')
    parser.add_argument('--grep', '-g', metavar='PATTERN',
                       help='Search for pattern in prompts')
    
    # Display options
    parser.add_argument('--detailed', '-d', action='store_true',
                       help='Show detailed information for each entry')
    parser.add_argument('--stats', '-s', action='store_true',
                       help='Show cache statistics')
    
    # Management options
    parser.add_argument('--clear', action='store_true',
                       help='Clear all history (use with caution)')
    
    return parser


def main(args: List[str] = None):
    """Main entry point for history command"""
    parser = create_parser()
    parsed_args = parser.parse_args(args)
    
    cache = get_cache_manager()
    
    # Handle stats display
    if parsed_args.stats:
        show_cache_stats()
        return
    
    # Handle cache clearing
    if parsed_args.clear:
        response = input("Are you sure you want to clear all history? (yes/no): ")
        if response.lower() in ['yes', 'y']:
            cache.clear_cache()
            print("History cleared.")
        else:
            print("Operation cancelled.")
        return
    
    # Set default limit if none specified
    limit = parsed_args.last if parsed_args.last else 10
    
    # Get history entries
    try:
        events = cache.get_history(limit=limit, pattern=parsed_args.grep)
        
        if parsed_args.detailed:
            for event in events:
                print_detailed_event(event)
        else:
            print_history_table(events)
            
        if events and not parsed_args.detailed:
            print(f"\nShowing {len(events)} entries. Use --detailed for more info.")
            
    except Exception as e:
        print(f"Error accessing history: {e}")
        return 1
    
    return 0


if __name__ == '__main__':
    import sys
    sys.exit(main())