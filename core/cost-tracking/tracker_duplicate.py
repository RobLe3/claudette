#!/usr/bin/env python3
"""
Claude Code Cost Tracker
Tracks token usage and costs for Claude Code sessions with real-time monitoring
"""

import json
import sqlite3
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
import argparse
import requests
from typing import Optional, Dict, List
import csv
from io import StringIO

class ClaudeCostTracker:
    def __init__(self, db_path=None, subscription_tier=None):
        if db_path is None:
            db_path = Path.home() / ".claude" / "cost_tracker.db"
        
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Detect subscription tier
        self.subscription_tier = subscription_tier or self._detect_subscription_tier()
        
        # Claude API pricing (as of 2025) - for non-subscription users
        self.api_pricing = {
            'claude-3-5-sonnet-20241022': {
                'input': 3.00 / 1_000_000,   # $3 per million input tokens
                'output': 15.00 / 1_000_000  # $15 per million output tokens
            },
            'claude-3-5-haiku-20241022': {
                'input': 1.00 / 1_000_000,   # $1 per million input tokens
                'output': 5.00 / 1_000_000   # $5 per million output tokens
            },
            'claude-3-opus-20240229': {
                'input': 15.00 / 1_000_000,  # $15 per million input tokens
                'output': 75.00 / 1_000_000  # $75 per million output tokens
            },
            'claude-sonnet-4-20250514': {
                'input': 3.00 / 1_000_000,   # $3 per million input tokens
                'output': 15.00 / 1_000_000  # $15 per million output tokens
            }
        }
        
        # Subscription pricing with token limits
        self.subscription_pricing = {
            'pro': {
                'monthly_cost': 20.00,  # $20/month
                'included_usage': True,  # Usage included in subscription
                'daily_message_limit': 216,  # ~45 messages per 5-hour cycle * 4.8 cycles
                'daily_token_estimate': 2_000_000,  # Estimated 2M tokens/day (conservative estimate)
                'monthly_token_estimate': 60_000_000,  # ~60M tokens/month
                'overage_cost_per_token': 3.00 / 1_000_000,  # Same as API pricing for overages
                'reset_cycle_hours': 5  # Resets every 5 hours
            },
            'max': {
                'monthly_cost': 200.00,  # $200/month (estimated)
                'included_usage': True,  # Usage included in subscription
                'daily_message_limit': 500,  # Higher limit for Max
                'daily_token_estimate': 10_000_000,  # 10M tokens/day estimate
                'monthly_token_estimate': 300_000_000,  # 300M tokens/month
                'overage_cost_per_token': 3.00 / 1_000_000,  # Same as API pricing for overages
                'reset_cycle_hours': 5  # Resets every 5 hours
            },
            'api': {
                'monthly_cost': 0.0,  # No subscription
                'included_usage': False,  # Pay per use
                'daily_message_limit': None,  # No limit
                'daily_token_estimate': None,  # No inclusive volume
                'monthly_token_estimate': None,  # No inclusive volume
                'overage_cost_per_token': None,  # Use API pricing
                'reset_cycle_hours': None  # No reset cycle
            }
        }
        
        # Get API key from environment or Claude config
        self.api_key = self._get_api_key()
        
        # USD to EUR conversion rate (approximate)
        self.usd_to_eur = 0.92  # Update this periodically
        
        self.init_database()
    
    def _detect_subscription_tier(self) -> str:
        """Detect subscription tier from Claude logs"""
        # Check for Claude logs to determine tier
        claude_dir = Path.home() / ".claude" / "projects"
        
        if claude_dir.exists():
            for project_dir in claude_dir.iterdir():
                if project_dir.is_dir():
                    for log_file in project_dir.glob("*.jsonl"):
                        try:
                            with open(log_file, 'r') as f:
                                # Read last few lines to check service tier
                                lines = f.readlines()
                                for line in lines[-10:]:  # Check last 10 lines
                                    try:
                                        data = json.loads(line.strip())
                                        if ('message' in data and 
                                            'usage' in data.get('message', {}) and
                                            'service_tier' in data['message']['usage']):
                                            service_tier = data['message']['usage']['service_tier']
                                            
                                            # Map service tier to subscription tier
                                            if service_tier == 'standard':
                                                return 'pro'  # Claude Pro subscription
                                            elif service_tier == 'max':
                                                return 'max'  # Claude Max subscription
                                            else:
                                                return 'api'  # API usage
                                    except (json.JSONDecodeError, KeyError):
                                        continue
                        except Exception:
                            continue
        
        # Default to API pricing if can't detect
        return 'api'
    
    def _get_api_key(self) -> Optional[str]:
        """Get Anthropic API key from environment or Claude config"""
        # Try environment variable first
        api_key = os.getenv('ANTHROPIC_API_KEY')
        if api_key:
            return api_key
        
        # Try Claude config file
        config_paths = [
            Path.home() / '.claude' / 'config.json',
            Path.home() / '.config' / 'claude' / 'config.json',
        ]
        
        for config_path in config_paths:
            if config_path.exists():
                try:
                    with open(config_path, 'r') as f:
                        config = json.load(f)
                        if 'api_key' in config:
                            return config['api_key']
                except (json.JSONDecodeError, KeyError):
                    continue
        
        return None
    
    def init_database(self):
        """Initialize the SQLite database for cost tracking"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS usage_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT UNIQUE,
                start_time TIMESTAMP,
                end_time TIMESTAMP,
                total_cost REAL DEFAULT 0.0,
                total_input_tokens INTEGER DEFAULT 0,
                total_output_tokens INTEGER DEFAULT 0,
                model_name TEXT DEFAULT 'claude-3-5-sonnet-20241022'
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS usage_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                timestamp TIMESTAMP,
                event_type TEXT,
                input_tokens INTEGER DEFAULT 0,
                output_tokens INTEGER DEFAULT 0,
                cost REAL DEFAULT 0.0,
                model_name TEXT,
                command TEXT,
                file_path TEXT,
                FOREIGN KEY (session_id) REFERENCES usage_sessions (session_id)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS daily_summary (
                date DATE PRIMARY KEY,
                total_cost REAL DEFAULT 0.0,
                total_input_tokens INTEGER DEFAULT 0,
                total_output_tokens INTEGER DEFAULT 0,
                session_count INTEGER DEFAULT 0,
                actual_api_cost REAL DEFAULT 0.0,
                last_sync_time TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS weekly_summary (
                year INTEGER,
                week INTEGER,
                total_cost REAL DEFAULT 0.0,
                total_input_tokens INTEGER DEFAULT 0,
                total_output_tokens INTEGER DEFAULT 0,
                session_count INTEGER DEFAULT 0,
                PRIMARY KEY (year, week)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS monthly_summary (
                year INTEGER,
                month INTEGER,
                total_cost REAL DEFAULT 0.0,
                total_input_tokens INTEGER DEFAULT 0,
                total_output_tokens INTEGER DEFAULT 0,
                session_count INTEGER DEFAULT 0,
                PRIMARY KEY (year, month)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def get_session_id(self):
        """Get or create a session ID for the current session"""
        session_file = Path.home() / ".claude" / "current_session.txt"
        
        if session_file.exists():
            return session_file.read_text().strip()
        else:
            session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            session_file.write_text(session_id)
            
            # Initialize session in database
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR IGNORE INTO usage_sessions (session_id, start_time)
                VALUES (?, ?)
            ''', (session_id, datetime.now()))
            conn.commit()
            conn.close()
            
            return session_id
    
    def estimate_tokens(self, text, is_input=True):
        """Estimate token count (rough approximation: 1 token ≈ 4 characters)"""
        if not text:
            return 0
        return max(1, len(text) // 4)
    
    def calculate_cost(self, input_tokens, output_tokens, model_name):
        """Calculate cost based on token usage, model, and subscription tier"""
        subscription_info = self.subscription_pricing[self.subscription_tier]
        
        # If usage is included in subscription, check for overages
        if subscription_info['included_usage']:
            # Get current usage to check for overages
            daily_usage = self.get_daily_token_usage()
            monthly_usage = self.get_monthly_token_usage()
            
            total_tokens = input_tokens + output_tokens
            
            # Check daily overage
            daily_limit = subscription_info['daily_token_estimate']
            daily_overage = max(0, (daily_usage + total_tokens) - daily_limit)
            
            # Check monthly overage
            monthly_limit = subscription_info['monthly_token_estimate']
            monthly_overage = max(0, (monthly_usage + total_tokens) - monthly_limit)
            
            # Use the higher overage amount
            overage_tokens = max(daily_overage, monthly_overage)
            
            if overage_tokens > 0:
                # Calculate overage cost
                overage_cost = overage_tokens * subscription_info['overage_cost_per_token']
                return overage_cost
            else:
                return 0.0
        
        # Otherwise use API pricing
        if model_name not in self.api_pricing:
            model_name = 'claude-3-5-sonnet-20241022'  # Default model
        
        pricing = self.api_pricing[model_name]
        input_cost = input_tokens * pricing['input']
        output_cost = output_tokens * pricing['output']
        
        return input_cost + output_cost
    
    def track_usage(self, event_type, input_text="", output_text="", model_name="claude-3-5-sonnet-20241022", command="", file_path=""):
        """Track usage event"""
        session_id = self.get_session_id()
        input_tokens = self.estimate_tokens(input_text)
        output_tokens = self.estimate_tokens(output_text)
        cost = self.calculate_cost(input_tokens, output_tokens, model_name)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Insert usage event
        cursor.execute('''
            INSERT INTO usage_events 
            (session_id, timestamp, event_type, input_tokens, output_tokens, cost, model_name, command, file_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (session_id, datetime.now(), event_type, input_tokens, output_tokens, cost, model_name, command, file_path))
        
        # Update session totals
        cursor.execute('''
            UPDATE usage_sessions 
            SET total_input_tokens = total_input_tokens + ?,
                total_output_tokens = total_output_tokens + ?,
                total_cost = total_cost + ?,
                end_time = ?
            WHERE session_id = ?
        ''', (input_tokens, output_tokens, cost, datetime.now(), session_id))
        
        # Update daily summary
        today = datetime.now().date()
        cursor.execute('''
            INSERT OR REPLACE INTO daily_summary (date, total_cost, total_input_tokens, total_output_tokens, session_count)
            VALUES (?, 
                    COALESCE((SELECT total_cost FROM daily_summary WHERE date = ?), 0) + ?,
                    COALESCE((SELECT total_input_tokens FROM daily_summary WHERE date = ?), 0) + ?,
                    COALESCE((SELECT total_output_tokens FROM daily_summary WHERE date = ?), 0) + ?,
                    COALESCE((SELECT session_count FROM daily_summary WHERE date = ?), 0) + 1)
        ''', (today, today, cost, today, input_tokens, today, output_tokens, today))
        
        conn.commit()
        conn.close()
        
        return cost
    
    def usd_to_euros(self, usd_amount):
        """Convert USD to EUR"""
        return usd_amount * self.usd_to_eur
    
    def get_daily_token_usage(self, date=None):
        """Get daily token usage"""
        if date is None:
            date = datetime.now().date()
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT COALESCE(SUM(input_tokens + output_tokens), 0) 
            FROM usage_events 
            WHERE DATE(timestamp) = ?
        ''', (date,))
        
        result = cursor.fetchone()
        conn.close()
        
        return result[0] if result else 0
    
    def get_monthly_token_usage(self, date=None):
        """Get monthly token usage"""
        if date is None:
            date = datetime.now().date()
        
        start_of_month = date.replace(day=1)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT COALESCE(SUM(input_tokens + output_tokens), 0) 
            FROM usage_events 
            WHERE DATE(timestamp) >= ? AND DATE(timestamp) <= ?
        ''', (start_of_month, date))
        
        result = cursor.fetchone()
        conn.close()
        
        return result[0] if result else 0
    
    def get_billing_period_summary(self, use_cache=True):
        """Get billing period summary (current month) with optional caching"""
        # Check for cached result if requested
        if use_cache and hasattr(self, '_billing_cache'):
            cache_time, cached_data = self._billing_cache
            if datetime.now() - cache_time < timedelta(minutes=5):
                return cached_data
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get current month's data
        now = datetime.now()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        cursor.execute('''
            SELECT SUM(total_cost), SUM(total_input_tokens), SUM(total_output_tokens)
            FROM daily_summary 
            WHERE date >= ? AND date <= ?
        ''', (start_of_month.date(), now.date()))
        
        result = cursor.fetchone()
        conn.close()
        
        if result and result[0] is not None:
            data = {
                'total_cost': result[0],
                'total_input_tokens': result[1],
                'total_output_tokens': result[2],
                'billing_period': f"{now.strftime('%B %Y')}"
            }
        else:
            data = {
                'total_cost': 0.0,
                'total_input_tokens': 0,
                'total_output_tokens': 0,
                'billing_period': f"{now.strftime('%B %Y')}"
            }
        
        # Cache the result
        if use_cache:
            self._billing_cache = (datetime.now(), data)
        
        return data
    
    def display_status_bar(self, fast_mode=False):
        """Display compact status bar with session and billing period costs"""
        if fast_mode:
            # Fast mode: minimal database access with connection reuse
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get session cost with single query
            session_id = self.get_session_id()
            cursor.execute('SELECT total_cost FROM usage_sessions WHERE session_id = ?', (session_id,))
            session_result = cursor.fetchone()
            session_cost = session_result[0] if session_result else 0.0
            
            # Get billing period with single query
            now = datetime.now()
            start_of_month = now.replace(day=1)
            cursor.execute('''
                SELECT COALESCE(SUM(total_cost), 0) FROM daily_summary 
                WHERE date >= ? AND date <= ?
            ''', (start_of_month.date(), now.date()))
            billing_result = cursor.fetchone()
            billing_cost = billing_result[0] if billing_result else 0.0
            
            conn.close()
            
            # Convert to euros
            session_cost_eur = self.usd_to_euros(session_cost)
            billing_cost_eur = self.usd_to_euros(billing_cost)
            billing_period = now.strftime('%B %Y')
        else:
            # Full mode: complete data retrieval
            session = self.get_session_summary()
            billing = self.get_billing_period_summary()
            
            session_cost = session['total_cost'] if session else 0.0
            session_cost_eur = self.usd_to_euros(session_cost)
            billing_cost_eur = self.usd_to_euros(billing['total_cost'])
            billing_period = billing['billing_period']
        
        # Get terminal width for right alignment
        import shutil
        terminal_width = shutil.get_terminal_size().columns
        
        # Create status messages
        session_text = f"Session Cost: {session_cost_eur:.4f}€"
        billing_text = f"Billing Period ({billing_period}): {billing_cost_eur:.2f}€"
        
        # Right-align the status bar
        session_line = session_text.rjust(terminal_width)
        billing_line = billing_text.rjust(terminal_width)
        
        print(session_line)
        print(billing_line)
        print()
    
    def get_quick_billing_total(self):
        """Quick lookup for billing period total with minimal database access"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Simple query for current month total
        now = datetime.now()
        start_of_month = now.replace(day=1)
        
        cursor.execute('''
            SELECT COALESCE(SUM(total_cost), 0) FROM daily_summary 
            WHERE date >= ? AND date <= ?
        ''', (start_of_month.date(), now.date()))
        
        result = cursor.fetchone()
        conn.close()
        
        return result[0] if result else 0.0
    
    def get_daily_summary(self, date=None):
        """Get daily usage summary"""
        if date is None:
            date = datetime.now().date()
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT total_cost, total_input_tokens, total_output_tokens, session_count
            FROM daily_summary WHERE date = ?
        ''', (date,))
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return {
                'date': date,
                'total_cost': result[0],
                'total_input_tokens': result[1],
                'total_output_tokens': result[2],
                'session_count': result[3]
            }
        else:
            return {
                'date': date,
                'total_cost': 0.0,
                'total_input_tokens': 0,
                'total_output_tokens': 0,
                'session_count': 0
            }
    
    def get_session_summary(self, session_id=None):
        """Get current session summary"""
        if session_id is None:
            session_id = self.get_session_id()
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT total_cost, total_input_tokens, total_output_tokens, start_time, end_time
            FROM usage_sessions WHERE session_id = ?
        ''', (session_id,))
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return {
                'session_id': session_id,
                'total_cost': result[0],
                'total_input_tokens': result[1],
                'total_output_tokens': result[2],
                'start_time': result[3],
                'end_time': result[4]
            }
        else:
            return None
    
    def display_summary(self, show_historical: bool = False):
        """Display current usage summary with Euro conversion"""
        # Display status bar first
        self.display_status_bar()
        
        daily = self.get_daily_summary()
        session = self.get_session_summary()
        billing = self.get_billing_period_summary()
        
        print("🔍 Claude Code Cost Tracker")
        print("=" * 50)
        
        # Show subscription information
        subscription_info = self.subscription_pricing[self.subscription_tier]
        print(f"📋 Subscription Tier: {self.subscription_tier.upper()}")
        if subscription_info['included_usage']:
            monthly_cost_eur = self.usd_to_euros(subscription_info['monthly_cost'])
            print(f"💳 Monthly Subscription: ${subscription_info['monthly_cost']:.2f} ({monthly_cost_eur:.2f}€)")
            
            # Get current usage
            daily_usage = self.get_daily_token_usage()
            monthly_usage = self.get_monthly_token_usage()
            
            # Calculate percentages
            daily_limit = subscription_info['daily_token_estimate']
            monthly_limit = subscription_info['monthly_token_estimate']
            
            daily_percentage = (daily_usage / daily_limit) * 100 if daily_limit else 0
            monthly_percentage = (monthly_usage / monthly_limit) * 100 if monthly_limit else 0
            
            print(f"✅ Usage Status: Included in subscription")
            print(f"📊 Daily Usage: {daily_usage:,} / {daily_limit:,} tokens ({daily_percentage:.1f}%)")
            print(f"📊 Monthly Usage: {monthly_usage:,} / {monthly_limit:,} tokens ({monthly_percentage:.1f}%)")
            
            # Show warnings if approaching limits
            if daily_percentage > 90:
                print(f"⚠️  WARNING: Daily usage at {daily_percentage:.1f}% - approaching limit!")
            elif daily_percentage > 75:
                print(f"💡 INFO: Daily usage at {daily_percentage:.1f}% - monitor closely")
            
            if monthly_percentage > 90:
                print(f"⚠️  WARNING: Monthly usage at {monthly_percentage:.1f}% - approaching limit!")
            elif monthly_percentage > 75:
                print(f"💡 INFO: Monthly usage at {monthly_percentage:.1f}% - monitor closely")
            
            # Calculate overage costs if any
            daily_overage = max(0, daily_usage - daily_limit)
            monthly_overage = max(0, monthly_usage - monthly_limit)
            
            if daily_overage > 0 or monthly_overage > 0:
                overage_tokens = max(daily_overage, monthly_overage)
                overage_cost = overage_tokens * subscription_info['overage_cost_per_token']
                overage_cost_eur = self.usd_to_euros(overage_cost)
                print(f"💰 Overage Cost: ${overage_cost:.4f} ({overage_cost_eur:.4f}€)")
                print(f"📊 Overage Tokens: {overage_tokens:,}")
        else:
            print(f"💳 Subscription: Pay-per-use API")
            print(f"💰 Usage Status: Billed per token")
        
        print(f"\n📅 Today ({daily['date']}):")
        print(f"   💰 Total Cost: ${daily['total_cost']:.4f} ({self.usd_to_euros(daily['total_cost']):.4f}€)")
        print(f"   📊 Input Tokens: {daily['total_input_tokens']:,}")
        print(f"   📊 Output Tokens: {daily['total_output_tokens']:,}")
        print(f"   🎯 Sessions: {daily['session_count']}")
        
        if session:
            print(f"\n🎯 Current Session:")
            print(f"   💰 Session Cost: ${session['total_cost']:.4f} ({self.usd_to_euros(session['total_cost']):.4f}€)")
            print(f"   📊 Input Tokens: {session['total_input_tokens']:,}")
            print(f"   📊 Output Tokens: {session['total_output_tokens']:,}")
        
        # Billing period summary
        print(f"\n📊 Billing Period ({billing['billing_period']}):")
        print(f"   💰 Total Cost: ${billing['total_cost']:.4f} ({self.usd_to_euros(billing['total_cost']):.2f}€)")
        print(f"   📊 Total Tokens: {billing['total_input_tokens'] + billing['total_output_tokens']:,}")
        
        # Estimate monthly cost
        monthly_estimate = daily['total_cost'] * 30
        print(f"\n📈 Monthly Estimate: ${monthly_estimate:.2f} ({self.usd_to_euros(monthly_estimate):.2f}€)")
        
        # Daily budget warnings (in EUR)
        daily_cost_eur = self.usd_to_euros(daily['total_cost'])
        if daily_cost_eur > 11.04:  # $12 in EUR
            print(f"⚠️  WARNING: Daily cost exceeds 11.04€ (90th percentile)")
        elif daily_cost_eur > 5.52:  # $6 in EUR
            print(f"💡 INFO: Daily cost above average (5.52€)")
        
        # Show historical data if requested
        if show_historical:
            print("\n" + "=" * 50)
            self.display_historical_summary(7)
    
    def end_session(self):
        """End the current session"""
        session_file = Path.home() / ".claude" / "current_session.txt"
        if session_file.exists():
            session_file.unlink()
        
        print("✅ Session ended. Cost tracking saved.")
    
    def get_historical_summary(self, days: int = 7) -> List[Dict]:
        """Get historical cost summary for the last N days"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days-1)
        
        cursor.execute('''
            SELECT date, total_cost, total_input_tokens, total_output_tokens, session_count
            FROM daily_summary 
            WHERE date >= ? AND date <= ?
            ORDER BY date DESC
        ''', (start_date, end_date))
        
        results = cursor.fetchall()
        conn.close()
        
        history = []
        for row in results:
            history.append({
                'date': row[0],
                'total_cost': row[1],
                'total_input_tokens': row[2],
                'total_output_tokens': row[3],
                'session_count': row[4]
            })
        
        return history
    
    def get_weekly_summary(self) -> List[Dict]:
        """Get weekly cost summary for the last 4 weeks"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get last 4 weeks
        cursor.execute('''
            SELECT year, week, total_cost, total_input_tokens, total_output_tokens, session_count
            FROM weekly_summary 
            ORDER BY year DESC, week DESC
            LIMIT 4
        ''')
        
        results = cursor.fetchall()
        conn.close()
        
        weekly_data = []
        for row in results:
            weekly_data.append({
                'year': row[0],
                'week': row[1],
                'total_cost': row[2],
                'total_input_tokens': row[3],
                'total_output_tokens': row[4],
                'session_count': row[5]
            })
        
        return weekly_data
    
    def get_monthly_summary(self) -> List[Dict]:
        """Get monthly cost summary for the last 6 months"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT year, month, total_cost, total_input_tokens, total_output_tokens, session_count
            FROM monthly_summary 
            ORDER BY year DESC, month DESC
            LIMIT 6
        ''')
        
        results = cursor.fetchall()
        conn.close()
        
        monthly_data = []
        for row in results:
            monthly_data.append({
                'year': row[0],
                'month': row[1],
                'total_cost': row[2],
                'total_input_tokens': row[3],
                'total_output_tokens': row[4],
                'session_count': row[5]
            })
        
        return monthly_data
    
    def display_historical_summary(self, days: int = 7):
        """Display comprehensive historical summary with Euro conversion"""
        print("📊 Historical Cost Analysis")
        print("=" * 50)
        
        # Daily history
        history = self.get_historical_summary(days)
        if history:
            print(f"\n📅 Last {days} Days:")
            total_cost = 0
            total_tokens = 0
            
            for day in history:
                date_str = day['date'] if isinstance(day['date'], str) else day['date'].strftime('%Y-%m-%d')
                cost_eur = self.usd_to_euros(day['total_cost'])
                print(f"   {date_str}: ${day['total_cost']:.4f} ({cost_eur:.4f}€) - {day['total_input_tokens'] + day['total_output_tokens']:,} tokens, {day['session_count']} sessions")
                total_cost += day['total_cost']
                total_tokens += day['total_input_tokens'] + day['total_output_tokens']
            
            total_cost_eur = self.usd_to_euros(total_cost)
            avg_cost_eur = self.usd_to_euros(total_cost/days)
            print(f"   📊 {days}-day total: ${total_cost:.4f} ({total_cost_eur:.4f}€) - {total_tokens:,} tokens")
            print(f"   📈 Daily average: ${total_cost/days:.4f} ({avg_cost_eur:.4f}€)")
        
        # Weekly summary
        weekly = self.get_weekly_summary()
        if weekly:
            print("\n🗓️  Weekly Summary (Last 4 weeks):")
            for week in weekly:
                cost_eur = self.usd_to_euros(week['total_cost'])
                print(f"   Week {week['week']}/{week['year']}: ${week['total_cost']:.4f} ({cost_eur:.4f}€) - {week['total_input_tokens'] + week['total_output_tokens']:,} tokens")
        
        # Monthly summary
        monthly = self.get_monthly_summary()
        if monthly:
            print("\n📆 Monthly Summary (Last 6 months):")
            for month in monthly:
                month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                month_name = month_names[month['month'] - 1]
                cost_eur = self.usd_to_euros(month['total_cost'])
                print(f"   {month_name} {month['year']}: ${month['total_cost']:.4f} ({cost_eur:.4f}€) - {month['total_input_tokens'] + month['total_output_tokens']:,} tokens")
    
    def sync_with_anthropic_api(self) -> bool:
        """Sync with Anthropic API to get actual usage data"""
        if not self.api_key:
            print("⚠️  No API key found. Cannot sync with Anthropic API.")
            print("   Set ANTHROPIC_API_KEY environment variable or add to Claude config.")
            return False
        
        try:
            # Note: Anthropic doesn't provide a direct usage API endpoint
            # This would require scraping the console or using unofficial methods
            # For now, we'll just mark that we attempted sync
            
            print("📡 Attempting to sync with Anthropic API...")
            print("⚠️  Direct API usage endpoints not available.")
            print("   Please check your usage manually at: https://console.anthropic.com/")
            
            # Update sync time
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            today = datetime.now().date()
            cursor.execute('''
                UPDATE daily_summary 
                SET last_sync_time = ?
                WHERE date = ?
            ''', (datetime.now(), today))
            
            conn.commit()
            conn.close()
            
            return True
            
        except Exception as e:
            print(f"❌ Error syncing with Anthropic API: {e}")
            return False
    
    def export_usage_data(self, output_file: str = None) -> str:
        """Export usage data to CSV"""
        if output_file is None:
            output_file = f"claude_usage_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                ue.timestamp,
                ue.event_type,
                ue.input_tokens,
                ue.output_tokens,
                ue.cost,
                ue.model_name,
                ue.command,
                ue.file_path,
                us.session_id
            FROM usage_events ue
            JOIN usage_sessions us ON ue.session_id = us.session_id
            ORDER BY ue.timestamp DESC
        ''')
        
        results = cursor.fetchall()
        conn.close()
        
        # Write to CSV
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow([
                'Timestamp', 'Event Type', 'Input Tokens', 'Output Tokens', 
                'Cost', 'Model', 'Command', 'File Path', 'Session ID'
            ])
            
            for row in results:
                writer.writerow(row)
        
        print(f"📊 Usage data exported to: {output_file}")
        return output_file


def main():
    parser = argparse.ArgumentParser(description='Claude Code Cost Tracker')
    parser.add_argument('--action', choices=['track', 'summary', 'end', 'history', 'sync', 'export', 'status'], default='summary',
                       help='Action to perform')
    parser.add_argument('--event-type', help='Type of event being tracked')
    parser.add_argument('--input', help='Input text to track')
    parser.add_argument('--output', help='Output text to track')
    parser.add_argument('--model', default='claude-sonnet-4-20250514', help='Model name')
    parser.add_argument('--command', help='Command being executed')
    parser.add_argument('--file', help='File being processed')
    parser.add_argument('--days', type=int, default=7, help='Number of days for historical analysis')
    parser.add_argument('--output-file', help='Output file for export')
    parser.add_argument('--show-historical', action='store_true', help='Show historical data in summary')
    parser.add_argument('--fast-mode', action='store_true', help='Use fast mode for status bar (minimal database access)')
    
    args = parser.parse_args()
    
    tracker = ClaudeCostTracker()
    
    if args.action == 'track':
        cost = tracker.track_usage(
            event_type=args.event_type or 'unknown',
            input_text=args.input or '',
            output_text=args.output or '',
            model_name=args.model,
            command=args.command or '',
            file_path=args.file or ''
        )
        cost_eur = tracker.usd_to_euros(cost)
        print(f"💰 Event cost: ${cost:.6f} ({cost_eur:.6f}€)")
    
    elif args.action == 'summary':
        tracker.display_summary(show_historical=args.show_historical)
    
    elif args.action == 'status':
        tracker.display_status_bar(fast_mode=args.fast_mode)
    
    elif args.action == 'history':
        tracker.display_historical_summary(args.days)
    
    elif args.action == 'sync':
        tracker.sync_with_anthropic_api()
    
    elif args.action == 'export':
        tracker.export_usage_data(args.output_file)
    
    elif args.action == 'end':
        tracker.end_session()


if __name__ == '__main__':
    main()