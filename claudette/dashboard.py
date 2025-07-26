"""
Cost Dashboard for Claudette
Interactive terminal and web dashboard for cost analysis and visualization
"""

import sqlite3
import json
import os
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from pathlib import Path

# Terminal UI
try:
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich.progress import Progress, SpinnerColumn, TextColumn
    from rich.layout import Layout
    from rich.live import Live
    from rich.tree import Tree
    from rich.bar import Bar
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False

# Web dashboard dependencies
try:
    import pandas as pd
    import plotly.graph_objects as go
    import plotly.express as px
    from plotly.subplots import make_subplots
    from flask import Flask, render_template_string, jsonify
    WEB_DEPS_AVAILABLE = True
except ImportError:
    WEB_DEPS_AVAILABLE = False

from .cache import get_cache_manager
from .stats import estimate_cost, format_currency, query_stats


class TerminalDashboard:
    """Rich-based terminal dashboard"""
    
    def __init__(self, cache_manager):
        self.cache_manager = cache_manager
        self.console = Console()
    
    def display_overview(self):
        """Display cost overview"""
        if not RICH_AVAILABLE:
            print("Rich library not available. Install with: pip install rich")
            return
        
        stats = self._get_dashboard_stats()
        
        # Create layout
        layout = Layout()
        layout.split_column(
            Layout(name="header", size=3),
            Layout(name="body"),
            Layout(name="footer", size=3)
        )
        
        layout["body"].split_row(
            Layout(name="left"),
            Layout(name="right")
        )
        
        # Header
        layout["header"].update(
            Panel(
                f"[bold blue]Claudette Cost Dashboard[/bold blue] - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                style="bold white on blue"
            )
        )
        
        # Left panel - Summary
        summary_table = Table(title="Cost Summary", show_header=True)
        summary_table.add_column("Metric", style="cyan")
        summary_table.add_column("Value", style="magenta")
        
        summary_table.add_row("Total Requests", str(stats['total_requests']))
        summary_table.add_row("Total Tokens", f"{stats['total_tokens']:,}")
        summary_table.add_row("Estimated Cost", format_currency(stats['total_cost']))
        summary_table.add_row("Avg Cost/Request", format_currency(stats['avg_cost_per_request']))
        summary_table.add_row("Cache Hit Rate", f"{stats['cache_hit_rate']:.1f}%")
        
        layout["left"].update(Panel(summary_table, title="Summary", border_style="green"))
        
        # Right panel - Backend breakdown
        backend_table = Table(title="Backend Usage", show_header=True)
        backend_table.add_column("Backend", style="cyan")
        backend_table.add_column("Requests", justify="right")
        backend_table.add_column("Tokens", justify="right")
        backend_table.add_column("Cost", justify="right")
        backend_table.add_column("Share", justify="right")
        
        for backend_data in stats['backend_breakdown']:
            backend_table.add_row(
                backend_data['backend'],
                str(backend_data['requests']),
                f"{backend_data['tokens']:,}",
                format_currency(backend_data['cost']),
                f"{backend_data['cost_share']:.1f}%"
            )
        
        layout["right"].update(Panel(backend_table, title="Backends", border_style="blue"))
        
        # Footer
        layout["footer"].update(
            Panel(
                f"Database: {self.cache_manager.db_path} | "
                f"Cache events: {stats['cache_events']:,} | "
                f"DB size: {stats['db_size_mb']:.1f} MB",
                style="dim"
            )
        )
        
        self.console.print(layout)
    
    def display_trends(self, days: int = 7):
        """Display cost trends over time"""
        if not RICH_AVAILABLE:
            print("Rich library not available. Install with: pip install rich")
            return
        
        trends = self._get_trend_data(days)
        
        # Create trend visualization using Rich Bar
        table = Table(title=f"Daily Cost Trends (Last {days} Days)", show_header=True)
        table.add_column("Date", style="cyan")
        table.add_column("Requests", justify="right")
        table.add_column("Cost", justify="right")
        table.add_column("Trend", width=20)
        
        max_cost = max(day['cost'] for day in trends) if trends else 1
        
        for day_data in trends:
            # Create simple bar using rich Bar
            bar_value = int((day_data['cost'] / max_cost) * 10) if max_cost > 0 else 0
            trend_bar = "█" * bar_value + "░" * (10 - bar_value)
            
            table.add_row(
                day_data['date'],
                str(day_data['requests']),
                format_currency(day_data['cost']),
                f"[green]{trend_bar}[/green]"
            )
        
        self.console.print(Panel(table, title="Trends", border_style="yellow"))
    
    def display_files_usage(self, limit: int = 10):
        """Display top files by usage"""
        if not RICH_AVAILABLE:
            print("Terminal dashboard requires 'rich' library. Using basic output:")
            self._basic_files_display(limit)
            return
        
        files_data = self._get_files_usage(limit)
        
        table = Table(title=f"Top {limit} Files by Usage", show_header=True)
        table.add_column("File", style="cyan", width=40)
        table.add_column("Uses", justify="right")
        table.add_column("Tokens", justify="right")
        table.add_column("Cost", justify="right")
        table.add_column("Last Used", style="dim")
        
        for file_data in files_data:
            # Truncate filename if too long
            filename = file_data['files']
            if len(filename) > 37:
                filename = "..." + filename[-34:]
            
            table.add_row(
                filename,
                str(file_data['usage_count']),
                f"{file_data['total_tokens']:,}",
                format_currency(file_data['estimated_cost']),
                file_data['last_used'][:10]  # Date only
            )
        
        self.console.print(Panel(table, title="File Usage", border_style="magenta"))
    
    def live_monitoring(self, refresh_seconds: int = 30):
        """Live monitoring dashboard"""
        if not RICH_AVAILABLE:
            print("Live monitoring requires 'rich' library")
            return
        
        def generate_display():
            stats = self._get_dashboard_stats()
            recent_requests = self._get_recent_activity(10)
            
            layout = Layout()
            layout.split_column(
                Layout(Panel("[bold]Live Claudette Dashboard[/bold]", style="bold white on blue"), size=3),
                Layout(name="main"),
                Layout(Panel(f"Last updated: {datetime.now().strftime('%H:%M:%S')}", style="dim"), size=3)
            )
            
            layout["main"].split_row(
                Layout(self._create_live_stats_panel(stats), name="stats"),
                Layout(self._create_recent_activity_panel(recent_requests), name="activity")
            )
            
            return layout
        
        with Live(generate_display(), refresh_per_second=1/refresh_seconds) as live:
            try:
                while True:
                    import time
                    time.sleep(refresh_seconds)
                    live.update(generate_display())
            except KeyboardInterrupt:
                pass
    
    def _get_dashboard_stats(self) -> Dict[str, Any]:
        """Get comprehensive dashboard statistics"""
        with sqlite3.connect(self.cache_manager.db_path) as conn:
            conn.row_factory = sqlite3.Row
            
            # Total stats
            cursor = conn.execute("""
                SELECT 
                    COUNT(*) as total_requests,
                    SUM(compressed_tokens) as total_tokens,
                    COUNT(DISTINCT backend) as backends_used
                FROM events
            """)
            totals = dict(cursor.fetchone())
            
            # Backend breakdown  
            cursor = conn.execute("""
                SELECT 
                    backend,
                    COUNT(*) as requests,
                    SUM(compressed_tokens) as tokens
                FROM events
                GROUP BY backend
                ORDER BY requests DESC
            """)
            backend_data = [dict(row) for row in cursor.fetchall()]
        
        # Calculate costs and shares
        total_cost = 0
        for backend in backend_data:
            backend['cost'] = estimate_cost(backend['backend'], backend['tokens'] or 0)
            total_cost += backend['cost']
        
        for backend in backend_data:
            backend['cost_share'] = (backend['cost'] / total_cost * 100) if total_cost > 0 else 0
        
        # Cache statistics
        cache_stats = self.cache_manager.get_stats()
        
        return {
            'total_requests': totals['total_requests'] or 0,
            'total_tokens': totals['total_tokens'] or 0, 
            'total_cost': total_cost,
            'avg_cost_per_request': total_cost / max(totals['total_requests'], 1),
            'backend_breakdown': backend_data,
            'cache_hit_rate': cache_stats.get('hit_rate', 0),
            'cache_events': cache_stats.get('total_events', 0),
            'db_size_mb': cache_stats.get('db_size_mb', 0)
        }
    
    def _get_trend_data(self, days: int) -> List[Dict[str, Any]]:
        """Get daily trend data"""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        with sqlite3.connect(self.cache_manager.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT 
                    DATE(timestamp) as date,
                    COUNT(*) as requests,
                    SUM(compressed_tokens) as tokens
                FROM events
                WHERE timestamp >= ?
                GROUP BY DATE(timestamp)
                ORDER BY date ASC
            """, (start_date.isoformat(),))
            
            trends = []
            for row in cursor.fetchall():
                row_dict = dict(row)
                row_dict['cost'] = estimate_cost('claude', row_dict['tokens'] or 0)  # Use average
                trends.append(row_dict)
            
            return trends
    
    def _get_files_usage(self, limit: int) -> List[Dict[str, Any]]:
        """Get top files by usage with cost estimates"""
        with sqlite3.connect(self.cache_manager.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT 
                    files,
                    COUNT(*) as usage_count,
                    SUM(compressed_tokens) as total_tokens,
                    MAX(timestamp) as last_used,
                    backend
                FROM events 
                WHERE files != '[]' AND files != ''
                GROUP BY files
                ORDER BY usage_count DESC, total_tokens DESC
                LIMIT ?
            """, (limit,))
            
            files_data = []
            for row in cursor.fetchall():
                row_dict = dict(row)
                row_dict['estimated_cost'] = estimate_cost(
                    row_dict.get('backend', 'claude'), 
                    row_dict['total_tokens'] or 0
                )
                files_data.append(row_dict)
            
            return files_data
    
    def _basic_files_display(self, limit: int):
        """Basic file display without rich"""
        files_data = self._get_files_usage(limit)
        
        print(f"\nTop {limit} Files by Usage:")
        print(f"{'File':<40} {'Uses':<6} {'Tokens':<8} {'Cost':<8} {'Last Used':<12}")
        print("-" * 80)
        
        for file_data in files_data:
            filename = file_data['files'][:37] + "..." if len(file_data['files']) > 40 else file_data['files']
            print(f"{filename:<40} {file_data['usage_count']:<6} {file_data['total_tokens']:<8} "
                  f"{format_currency(file_data['estimated_cost']):<8} {file_data['last_used'][:10]:<12}")


class WebDashboard:
    """Flask-based web dashboard"""
    
    def __init__(self, cache_manager):
        self.cache_manager = cache_manager
        self.app = Flask(__name__)
        self._setup_routes()
    
    def _setup_routes(self):
        """Setup Flask routes"""
        
        @self.app.route('/')
        def dashboard():
            return render_template_string(self._get_dashboard_template())
        
        @self.app.route('/api/stats')
        def api_stats():
            stats = self._get_web_stats()
            return jsonify(stats)
        
        @self.app.route('/api/trends/<int:days>')
        def api_trends(days):
            trends = self._get_trend_data(days)
            return jsonify(trends)
        
        @self.app.route('/api/charts')
        def api_charts():
            charts = self._generate_charts()
            return jsonify(charts)
    
    def run(self, host='127.0.0.1', port=8080, debug=False):
        """Start web dashboard"""
        if not WEB_DEPS_AVAILABLE:
            print("Web dashboard requires: pip install pandas plotly flask")
            return
        
        print(f"Starting Claudette Web Dashboard at http://{host}:{port}")
        self.app.run(host=host, port=port, debug=debug)
    
    def _get_web_stats(self) -> Dict[str, Any]:
        """Get statistics for web API"""
        # Reuse terminal dashboard stats logic
        terminal_dashboard = TerminalDashboard(self.cache_manager)
        return terminal_dashboard._get_dashboard_stats()
    
    def _get_trend_data(self, days: int) -> List[Dict[str, Any]]:
        """Get trend data for web API"""
        terminal_dashboard = TerminalDashboard(self.cache_manager)
        return terminal_dashboard._get_trend_data(days)
    
    def _generate_charts(self) -> Dict[str, str]:
        """Generate Plotly charts as JSON"""
        if not WEB_DEPS_AVAILABLE:
            return {}
        
        stats = self._get_web_stats()
        
        # Backend usage pie chart
        backend_fig = px.pie(
            values=[b['cost'] for b in stats['backend_breakdown']],
            names=[b['backend'] for b in stats['backend_breakdown']],
            title="Cost by Backend"
        )
        
        # Trend line chart
        trends = self._get_trend_data(30)
        if trends:
            trend_fig = px.line(
                x=[t['date'] for t in trends],
                y=[t['cost'] for t in trends],
                title="Daily Cost Trends (30 Days)",
                labels={'x': 'Date', 'y': 'Cost ($)'}
            )
        else:
            trend_fig = {}
        
        return {
            'backend_chart': backend_fig.to_json() if backend_fig else '{}',
            'trend_chart': trend_fig.to_json() if trend_fig else '{}'
        }
    
    def _get_dashboard_template(self) -> str:
        """HTML template for web dashboard"""
        return """
<!DOCTYPE html>
<html>
<head>
    <title>Claudette Cost Dashboard</title>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #2196F3; color: white; padding: 20px; margin-bottom: 20px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .stat-card { background: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; }
        .chart-container { margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Claudette Cost Dashboard</h1>
        <p>Real-time cost analysis and usage statistics</p>
    </div>
    
    <div class="stats-grid" id="stats-grid">
        <!-- Stats will be loaded here -->
    </div>
    
    <div class="chart-container">
        <div id="backend-chart" style="height: 400px;"></div>
    </div>
    
    <div class="chart-container">
        <div id="trend-chart" style="height: 400px;"></div>
    </div>
    
    <script>
        // Load stats
        fetch('/api/stats')
            .then(response => response.json())
            .then(data => {
                document.getElementById('stats-grid').innerHTML = `
                    <div class="stat-card">
                        <h3>Total Requests</h3>
                        <p>${data.total_requests}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Total Tokens</h3>
                        <p>${data.total_tokens.toLocaleString()}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Estimated Cost</h3>
                        <p>$${data.total_cost.toFixed(4)}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Cache Hit Rate</h3>
                        <p>${data.cache_hit_rate.toFixed(1)}%</p>
                    </div>
                `;
            });
        
        // Load charts
        fetch('/api/charts')
            .then(response => response.json())
            .then(data => {
                if (data.backend_chart) {
                    Plotly.newPlot('backend-chart', JSON.parse(data.backend_chart).data, JSON.parse(data.backend_chart).layout);
                }
                if (data.trend_chart) {
                    Plotly.newPlot('trend-chart', JSON.parse(data.trend_chart).data, JSON.parse(data.trend_chart).layout);
                }
            });
    </script>
</body>
</html>
        """


# CLI functions for dashboard commands
def cmd_dashboard_terminal(args):
    """Terminal dashboard command"""
    cache_manager = get_cache_manager()
    dashboard = TerminalDashboard(cache_manager)
    
    if args.live:
        dashboard.live_monitoring(args.refresh or 30)
    elif args.trends:
        dashboard.display_trends(args.days or 7)
    elif args.files:
        dashboard.display_files_usage(args.limit or 10)
    else:
        dashboard.display_overview()


def cmd_dashboard_web(args):
    """Web dashboard command"""
    cache_manager = get_cache_manager()
    dashboard = WebDashboard(cache_manager)
    
    dashboard.run(
        host=args.host or '127.0.0.1',
        port=args.port or 8080,
        debug=args.debug
    )


def setup_dashboard_parser(subparsers):
    """Setup dashboard subcommands"""
    
    # Main dashboard parser
    dashboard_parser = subparsers.add_parser(
        'dashboard',
        help='Cost dashboard and visualization',
        description='Interactive cost analysis dashboard'
    )
    
    dashboard_subparsers = dashboard_parser.add_subparsers(dest='dashboard_mode')
    
    # Terminal dashboard
    terminal_parser = dashboard_subparsers.add_parser(
        'terminal', aliases=['term'],
        help='Terminal-based dashboard'
    )
    
    terminal_parser.add_argument('--live', action='store_true', help='Live monitoring mode')
    terminal_parser.add_argument('--trends', action='store_true', help='Show trends view')
    terminal_parser.add_argument('--files', action='store_true', help='Show files usage')
    terminal_parser.add_argument('--days', type=int, default=7, help='Days for trends (default: 7)')
    terminal_parser.add_argument('--limit', type=int, default=10, help='Limit for file list (default: 10)')
    terminal_parser.add_argument('--refresh', type=int, default=30, help='Live refresh seconds (default: 30)')
    terminal_parser.set_defaults(func=cmd_dashboard_terminal)
    
    # Web dashboard
    web_parser = dashboard_subparsers.add_parser(
        'web',
        help='Web-based dashboard'
    )
    
    web_parser.add_argument('--host', default='127.0.0.1', help='Host address (default: 127.0.0.1)')
    web_parser.add_argument('--port', type=int, default=8080, help='Port number (default: 8080)')
    web_parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    web_parser.set_defaults(func=cmd_dashboard_web)
    
    # Default to terminal dashboard if no subcommand
    dashboard_parser.set_defaults(func=cmd_dashboard_terminal)
    
    return dashboard_parser


if __name__ == '__main__':
    # Standalone testing
    cache_manager = get_cache_manager()
    dashboard = TerminalDashboard(cache_manager)
    dashboard.display_overview()