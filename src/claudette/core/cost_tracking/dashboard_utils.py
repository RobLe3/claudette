"""
Cost Dashboard Utilities
Helper functions for aggregating and processing cost data across different sources
"""

import sqlite3
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
import sys

# Add claudette to path for imports
sys.path.append(str(Path(__file__).parent.parent.parent / 'claudette'))

try:
    from cache import get_cache_manager
except ImportError:
    # Fallback for standalone usage
    def get_cache_manager():
        return None


class CostDataAggregator:
    """Aggregates cost data from multiple sources"""
    
    def __init__(self, cache_manager=None):
        self.cache_manager = cache_manager or get_cache_manager()
        
        # Cost rates per 1K tokens (2025 accurate pricing)
        self.cost_rates = {
            'claude': {
                'sonnet': 0.015,      # Claude Sonnet average
                'haiku': 0.005,       # Claude Haiku
                'opus': 0.045         # Claude Opus
            },
            'openai': {
                'gpt-4': 0.030,       # GPT-4
                'gpt-4-turbo': 0.010, # GPT-4 Turbo
                'gpt-3.5-turbo': 0.0015 # GPT-3.5 Turbo
            },
            'mistral': 0.0007,        # Mistral 7B average
            'ollama': 0.0,            # Local - no cost
            'fallback': 0.001         # Fallback estimate
        }
    
    def get_cost_estimate(self, backend: str, tokens: int, model: str = None) -> float:
        """Get cost estimate for backend and token count"""
        backend = backend.lower()
        
        if backend == 'claude':
            # Try to detect model from context
            if model and 'haiku' in model.lower():
                rate = self.cost_rates['claude']['haiku']
            elif model and 'opus' in model.lower():
                rate = self.cost_rates['claude']['opus'] 
            else:
                rate = self.cost_rates['claude']['sonnet']  # Default
        
        elif backend == 'openai':
            if model and 'gpt-4' in model.lower():
                if 'turbo' in model.lower():
                    rate = self.cost_rates['openai']['gpt-4-turbo']
                else:
                    rate = self.cost_rates['openai']['gpt-4']
            else:
                rate = self.cost_rates['openai']['gpt-3.5-turbo']  # Default
        
        else:
            rate = self.cost_rates.get(backend, self.cost_rates['fallback'])
        
        return (tokens / 1000.0) * rate
    
    def aggregate_by_period(self, period_type: str = 'daily', days_back: int = 30) -> List[Dict[str, Any]]:
        """Aggregate costs by time period"""
        if not self.cache_manager:
            return []
        
        start_date = datetime.utcnow() - timedelta(days=days_back)
        
        # Date format based on period
        if period_type == 'daily':
            date_format = "DATE(timestamp)"
        elif period_type == 'weekly':
            date_format = "strftime('%Y-W%W', timestamp)"
        elif period_type == 'monthly':
            date_format = "strftime('%Y-%m', timestamp)"
        else:
            date_format = "DATE(timestamp)"  # Default to daily
        
        with sqlite3.connect(self.cache_manager.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(f"""
                SELECT 
                    {date_format} as period,
                    backend,
                    COUNT(*) as requests,
                    SUM(compressed_tokens) as total_tokens,
                    AVG(compressed_tokens) as avg_tokens
                FROM events
                WHERE timestamp >= ?
                GROUP BY {date_format}, backend
                ORDER BY period DESC, backend
            """, (start_date.isoformat(),))
            
            results = []
            for row in cursor.fetchall():
                row_dict = dict(row)
                row_dict['estimated_cost'] = self.get_cost_estimate(
                    row_dict['backend'], 
                    row_dict['total_tokens'] or 0
                )
                results.append(row_dict)
            
            return results
    
    def aggregate_by_backend(self, days_back: int = 30) -> List[Dict[str, Any]]:
        """Aggregate costs by backend"""
        if not self.cache_manager:
            return []
        
        start_date = datetime.utcnow() - timedelta(days=days_back)
        
        with sqlite3.connect(self.cache_manager.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT 
                    backend,
                    COUNT(*) as total_requests,
                    SUM(compressed_tokens) as total_tokens,
                    AVG(compressed_tokens) as avg_tokens_per_request,
                    MIN(timestamp) as first_used,
                    MAX(timestamp) as last_used,
                    COUNT(DISTINCT DATE(timestamp)) as active_days
                FROM events
                WHERE timestamp >= ?
                GROUP BY backend
                ORDER BY total_tokens DESC
            """, (start_date.isoformat(),))
            
            results = []
            total_cost = 0
            
            for row in cursor.fetchall():
                row_dict = dict(row)
                cost = self.get_cost_estimate(row_dict['backend'], row_dict['total_tokens'] or 0)
                row_dict['estimated_cost'] = cost
                row_dict['cost_per_request'] = cost / max(row_dict['total_requests'], 1)
                total_cost += cost
                results.append(row_dict)
            
            # Add cost share percentages
            for result in results:
                result['cost_share'] = (result['estimated_cost'] / total_cost * 100) if total_cost > 0 else 0
            
            return results
    
    def aggregate_by_command(self, days_back: int = 30) -> List[Dict[str, Any]]:
        """Aggregate costs by command type"""
        if not self.cache_manager:
            return []
        
        start_date = datetime.utcnow() - timedelta(days=days_back)
        
        with sqlite3.connect(self.cache_manager.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT 
                    cmd,
                    COUNT(*) as usage_count,
                    SUM(compressed_tokens) as total_tokens,
                    AVG(compressed_tokens) as avg_tokens,
                    backend,
                    COUNT(DISTINCT DATE(timestamp)) as active_days
                FROM events
                WHERE timestamp >= ?
                GROUP BY cmd, backend
                ORDER BY total_tokens DESC
            """, (start_date.isoformat(),))
            
            results = []
            for row in cursor.fetchall():
                row_dict = dict(row)
                row_dict['estimated_cost'] = self.get_cost_estimate(
                    row_dict['backend'],
                    row_dict['total_tokens'] or 0
                )
                results.append(row_dict)
            
            return results
    
    def get_top_expensive_files(self, limit: int = 10, days_back: int = 30) -> List[Dict[str, Any]]:
        """Get most expensive files by estimated cost"""
        if not self.cache_manager:
            return []
        
        start_date = datetime.utcnow() - timedelta(days=days_back)
        
        with sqlite3.connect(self.cache_manager.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT 
                    files,
                    COUNT(*) as usage_count,
                    SUM(compressed_tokens) as total_tokens,
                    AVG(compressed_tokens) as avg_tokens,
                    backend,
                    MAX(timestamp) as last_used
                FROM events
                WHERE timestamp >= ? AND files != '[]' AND files != ''
                GROUP BY files, backend
                ORDER BY total_tokens DESC
                LIMIT ?
            """, (start_date.isoformat(), limit))
            
            results = []
            for row in cursor.fetchall():
                row_dict = dict(row)
                row_dict['estimated_cost'] = self.get_cost_estimate(
                    row_dict['backend'],
                    row_dict['total_tokens'] or 0
                )
                
                # Parse file list for better display
                try:
                    files_list = json.loads(row_dict['files'])
                    if isinstance(files_list, list) and files_list:
                        row_dict['primary_file'] = files_list[0]
                        row_dict['file_count'] = len(files_list)
                    else:
                        row_dict['primary_file'] = row_dict['files']
                        row_dict['file_count'] = 1
                except (json.JSONDecodeError, TypeError):
                    row_dict['primary_file'] = row_dict['files']
                    row_dict['file_count'] = 1
                
                results.append(row_dict)
            
            return results
    
    def get_cost_trends(self, days_back: int = 30) -> Dict[str, Any]:
        """Get cost trends and projections"""
        daily_data = self.aggregate_by_period('daily', days_back)
        
        if not daily_data:
            return {
                'daily_average': 0,
                'weekly_projection': 0,
                'monthly_projection': 0,
                'trend_direction': 'stable',
                'peak_day': None,
                'total_period_cost': 0
            }
        
        # Group by day for trend analysis
        daily_totals = {}
        for entry in daily_data:
            day = entry['period']
            if day not in daily_totals:
                daily_totals[day] = 0
            daily_totals[day] += entry['estimated_cost']
        
        daily_costs = list(daily_totals.values())
        total_cost = sum(daily_costs)
        avg_daily_cost = total_cost / len(daily_costs) if daily_costs else 0
        
        # Simple trend detection (compare first half to second half)
        mid_point = len(daily_costs) // 2
        if mid_point > 0:
            first_half_avg = sum(daily_costs[:mid_point]) / mid_point
            second_half_avg = sum(daily_costs[mid_point:]) / (len(daily_costs) - mid_point)
            
            if second_half_avg > first_half_avg * 1.1:
                trend = 'increasing'
            elif second_half_avg < first_half_avg * 0.9:
                trend = 'decreasing'
            else:
                trend = 'stable'
        else:
            trend = 'stable'
        
        # Find peak day
        peak_day = max(daily_totals.items(), key=lambda x: x[1]) if daily_totals else (None, 0)
        
        return {
            'daily_average': avg_daily_cost,
            'weekly_projection': avg_daily_cost * 7,
            'monthly_projection': avg_daily_cost * 30,
            'trend_direction': trend,
            'peak_day': peak_day[0] if peak_day[0] else None,
            'peak_cost': peak_day[1] if peak_day[1] else 0,
            'total_period_cost': total_cost,
            'active_days': len(daily_costs)
        }
    
    def get_efficiency_metrics(self) -> Dict[str, Any]:
        """Calculate efficiency and optimization metrics"""
        if not self.cache_manager:
            return {}
        
        cache_stats = self.cache_manager.get_stats()
        
        # Get compression effectiveness
        with sqlite3.connect(self.cache_manager.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT 
                    backend,
                    AVG(LENGTH(raw_prompt)) as avg_raw_length,
                    AVG(LENGTH(compressed_prompt)) as avg_compressed_length,
                    AVG(compressed_tokens) as avg_tokens
                FROM events
                WHERE raw_prompt IS NOT NULL AND compressed_prompt IS NOT NULL
                GROUP BY backend
            """)
            
            compression_data = []
            for row in cursor.fetchall():
                row_dict = dict(row)
                if row_dict['avg_raw_length'] and row_dict['avg_compressed_length']:
                    row_dict['compression_ratio'] = row_dict['avg_compressed_length'] / row_dict['avg_raw_length']
                    row_dict['compression_savings'] = 1 - row_dict['compression_ratio']
                else:
                    row_dict['compression_ratio'] = 1.0
                    row_dict['compression_savings'] = 0.0
                compression_data.append(row_dict)
        
        return {
            'cache_hit_rate': cache_stats.get('hit_rate', 0),
            'total_cache_events': cache_stats.get('total_events', 0),
            'cache_size_mb': cache_stats.get('db_size_mb', 0),
            'compression_effectiveness': compression_data,
            'avg_compression_savings': sum(d['compression_savings'] for d in compression_data) / len(compression_data) if compression_data else 0
        }
    
    def generate_cost_report(self, days_back: int = 30) -> Dict[str, Any]:
        """Generate comprehensive cost report"""
        return {
            'period_summary': {
                'days_analyzed': days_back,
                'analysis_date': datetime.utcnow().isoformat()
            },
            'cost_trends': self.get_cost_trends(days_back),
            'backend_breakdown': self.aggregate_by_backend(days_back),
            'command_analysis': self.aggregate_by_command(days_back),
            'expensive_files': self.get_top_expensive_files(10, days_back),
            'efficiency_metrics': self.get_efficiency_metrics(),
            'daily_breakdown': self.aggregate_by_period('daily', days_back)
        }


class CostExporter:
    """Export cost data to various formats"""
    
    def __init__(self, aggregator: CostDataAggregator):
        self.aggregator = aggregator
    
    def export_to_csv(self, data: List[Dict[str, Any]], output_path: str):
        """Export data to CSV format"""
        import csv
        
        if not data:
            return
        
        fieldnames = data[0].keys()
        
        with open(output_path, 'w', newline='') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(data)
    
    def export_to_json(self, data: Any, output_path: str, pretty: bool = True):
        """Export data to JSON format"""
        with open(output_path, 'w') as jsonfile:
            if pretty:
                json.dump(data, jsonfile, indent=2, default=str)
            else:
                json.dump(data, jsonfile, default=str)
    
    def export_report(self, output_dir: str, days_back: int = 30, format: str = 'json'):
        """Export comprehensive cost report"""
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        report = self.aggregator.generate_cost_report(days_back)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        if format.lower() == 'json':
            report_file = output_path / f'cost_report_{timestamp}.json'
            self.export_to_json(report, report_file)
        
        elif format.lower() == 'csv':
            # Export individual sections as CSV
            self.export_to_csv(report['backend_breakdown'], 
                             output_path / f'backend_costs_{timestamp}.csv')
            self.export_to_csv(report['command_analysis'], 
                             output_path / f'command_costs_{timestamp}.csv')
            self.export_to_csv(report['expensive_files'], 
                             output_path / f'expensive_files_{timestamp}.csv')
            self.export_to_csv(report['daily_breakdown'], 
                             output_path / f'daily_costs_{timestamp}.csv')
        
        return str(output_path)


# Utility functions
def format_cost_display(cost: float) -> str:
    """Format cost for display"""
    if cost < 0.001:
        return f"${cost:.6f}"
    elif cost < 0.01:
        return f"${cost:.4f}"
    else:
        return f"${cost:.2f}"


def calculate_cost_savings(baseline_cost: float, optimized_cost: float) -> Dict[str, Any]:
    """Calculate cost savings metrics"""
    savings = baseline_cost - optimized_cost
    savings_percent = (savings / baseline_cost * 100) if baseline_cost > 0 else 0
    
    return {
        'absolute_savings': savings,
        'percent_savings': savings_percent,
        'cost_reduction_factor': baseline_cost / optimized_cost if optimized_cost > 0 else float('inf')
    }


if __name__ == '__main__':
    # Standalone testing
    aggregator = CostDataAggregator()
    report = aggregator.generate_cost_report(30)
    
    print("Cost Report Generated:")
    print(f"- Total backends: {len(report['backend_breakdown'])}")
    print(f"- Active days: {report['cost_trends']['active_days']}")
    print(f"- Daily average: {format_cost_display(report['cost_trends']['daily_average'])}")
    print(f"- Cache hit rate: {report['efficiency_metrics']['cache_hit_rate']:.1f}%")