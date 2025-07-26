#!/usr/bin/env python3
"""
Claude Usage Monitor - Real-time tracking and verification of Claude subscription usage
Prevents waste of Claude subscription allowance through intelligent monitoring
"""

import json
import time
import psutil
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import asyncio

@dataclass
class ClaudeUsageEvent:
    """Single Claude usage event"""
    timestamp: str
    action: str  # 'tool_call', 'response_generation', 'context_processing'
    tokens_estimated: int
    cost_estimated_eur: float
    session_id: str
    success: bool
    details: Dict[str, Any]

class ClaudeUsageMonitor:
    """Real-time monitoring of Claude usage to prevent subscription waste"""
    
    def __init__(self):
        self.monitoring_file = Path.home() / '.claude' / 'usage_monitoring.json'
        self.monitoring_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Usage tracking
        self.session_id = f"session_{int(time.time())}"
        self.session_start = datetime.now()
        self.usage_events: List[ClaudeUsageEvent] = []
        self.real_time_usage = {
            'session_tokens': 0,
            'session_cost_eur': 0.0,
            'hourly_tokens': 0,
            'hourly_cost_eur': 0.0,
            'daily_tokens': 0,
            'daily_cost_eur': 0.0
        }
        
        # Limits and thresholds
        self.limits = {
            'hourly_token_limit': 5000,      # Conservative hourly limit
            'daily_token_limit': 50000,      # Conservative daily limit  
            'session_cost_limit_eur': 5.0,   # Max €5 per session
            'hourly_cost_limit_eur': 2.0,    # Max €2 per hour
            'daily_cost_limit_eur': 10.0     # Max €10 per day
        }
        
        # Monitoring state
        self.monitoring_active = False
        self.last_usage_check = time.time()
        self.offload_recommendations = []
        
        print("👁️ Claude Usage Monitor initialized")
        print(f"🆔 Session ID: {self.session_id}")
        
        # Load historical data
        self.load_historical_usage()
        
    def load_historical_usage(self):
        """Load historical usage data"""
        try:
            if self.monitoring_file.exists():
                with open(self.monitoring_file, 'r') as f:
                    data = json.load(f)
                    
                    # Load today's usage
                    today = datetime.now().date().isoformat()
                    daily_events = [
                        event for event in data.get('events', [])
                        if event['timestamp'].startswith(today)
                    ]
                    
                    self.real_time_usage['daily_tokens'] = sum(
                        event.get('tokens_estimated', 0) for event in daily_events
                    )
                    self.real_time_usage['daily_cost_eur'] = sum(
                        event.get('cost_estimated_eur', 0.0) for event in daily_events
                    )
                    
                    print(f"📊 Daily usage loaded: {self.real_time_usage['daily_tokens']} tokens, €{self.real_time_usage['daily_cost_eur']:.4f}")
                    
        except Exception as e:
            print(f"⚠️ Failed to load historical usage: {e}")
    
    def start_monitoring(self):
        """Start real-time usage monitoring"""
        self.monitoring_active = True
        print("🔍 Started real-time Claude usage monitoring")
        
        # Start background monitoring task
        asyncio.create_task(self._background_monitor())
    
    def stop_monitoring(self):
        """Stop usage monitoring"""
        self.monitoring_active = False
        self.save_usage_data()
        print("⏹️ Claude usage monitoring stopped")
    
    async def _background_monitor(self):
        """Background monitoring task"""
        while self.monitoring_active:
            try:
                await self._check_system_usage()
                await asyncio.sleep(10)  # Check every 10 seconds
            except Exception as e:
                print(f"⚠️ Monitoring error: {e}")
                await asyncio.sleep(30)  # Back off on error
    
    async def _check_system_usage(self):
        """Check system for Claude usage indicators"""
        
        # Check if Claude Code process is active
        claude_processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'memory_info']):
            try:
                if proc.info['name'] and 'claude' in proc.info['name'].lower():
                    claude_processes.append(proc.info)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        # Monitor network activity (API calls)
        network_stats = psutil.net_io_counters()
        
        # Estimate usage based on system activity
        if claude_processes or network_stats.bytes_sent > 0:
            estimated_tokens = self._estimate_tokens_from_activity(claude_processes, network_stats)
            if estimated_tokens > 0:
                await self._record_usage_event(
                    action="system_activity",
                    tokens_estimated=estimated_tokens,
                    details={
                        'processes': len(claude_processes),
                        'network_bytes': network_stats.bytes_sent
                    }
                )
    
    def _estimate_tokens_from_activity(self, processes: List[Dict], network_stats) -> int:
        """Estimate token usage from system activity"""
        
        # Very conservative estimation
        base_tokens = 0
        
        # Estimate based on active processes
        if processes:
            memory_usage = sum(p.get('memory_info', {}).get('rss', 0) for p in processes)
            # Rough estimate: 1MB memory = ~100 tokens
            base_tokens += max(0, (memory_usage / 1024 / 1024) * 100)
        
        # Network activity estimation (very rough)
        if network_stats.bytes_sent > 1000:  # > 1KB sent
            base_tokens += 10  # Minimal estimate for API calls
        
        return int(min(base_tokens, 50))  # Cap at 50 tokens per check
    
    async def record_claude_usage(self, action: str, tokens_estimated: int, 
                                 cost_estimated_eur: float = None, 
                                 details: Dict[str, Any] = None) -> bool:
        """
        Record Claude usage event and check limits
        Returns True if usage is within limits, False if should offload to ChatGPT
        """
        
        if cost_estimated_eur is None:
            # Estimate cost: €0.015 per 1K tokens for Sonnet
            cost_estimated_eur = (tokens_estimated / 1000) * 0.015
        
        if details is None:
            details = {}
        
        # Record the event
        await self._record_usage_event(action, tokens_estimated, cost_estimated_eur, details)
        
        # Check if we should continue with Claude or offload
        return self._should_continue_with_claude()
    
    async def _record_usage_event(self, action: str, tokens_estimated: int, 
                                 cost_estimated_eur: float = None, 
                                 details: Dict[str, Any] = None,
                                 success: bool = True):
        """Record a usage event"""
        
        if cost_estimated_eur is None:
            cost_estimated_eur = (tokens_estimated / 1000) * 0.015
        
        if details is None:
            details = {}
        
        event = ClaudeUsageEvent(
            timestamp=datetime.now().isoformat(),
            action=action,
            tokens_estimated=tokens_estimated,
            cost_estimated_eur=cost_estimated_eur,
            session_id=self.session_id,
            success=success,
            details=details
        )
        
        self.usage_events.append(event)
        
        # Update real-time counters
        self.real_time_usage['session_tokens'] += tokens_estimated
        self.real_time_usage['session_cost_eur'] += cost_estimated_eur
        self.real_time_usage['daily_tokens'] += tokens_estimated
        self.real_time_usage['daily_cost_eur'] += cost_estimated_eur
        
        # Update hourly counters
        self._update_hourly_usage()
        
        print(f"📝 Claude usage recorded: {action} ({tokens_estimated} tokens, €{cost_estimated_eur:.4f})")
        
        # Check for limit warnings
        self._check_usage_warnings()
    
    def _update_hourly_usage(self):
        """Update hourly usage counters"""
        current_hour = datetime.now().replace(minute=0, second=0, microsecond=0)
        
        # Reset hourly counters if new hour
        if not hasattr(self, '_current_hour') or self._current_hour != current_hour:
            self._current_hour = current_hour
            self.real_time_usage['hourly_tokens'] = 0
            self.real_time_usage['hourly_cost_eur'] = 0.0
        
        # Add to hourly usage from recent events
        hour_events = [
            event for event in self.usage_events
            if datetime.fromisoformat(event.timestamp) >= current_hour
        ]
        
        self.real_time_usage['hourly_tokens'] = sum(
            event.tokens_estimated for event in hour_events
        )
        self.real_time_usage['hourly_cost_eur'] = sum(
            event.cost_estimated_eur for event in hour_events
        )
    
    def _should_continue_with_claude(self) -> bool:
        """Determine if we should continue using Claude or offload to ChatGPT"""
        
        # Check hard limits
        if self.real_time_usage['session_cost_eur'] >= self.limits['session_cost_limit_eur']:
            self._add_offload_recommendation("Session cost limit reached")
            return False
        
        if self.real_time_usage['hourly_cost_eur'] >= self.limits['hourly_cost_limit_eur']:
            self._add_offload_recommendation("Hourly cost limit reached")
            return False
        
        if self.real_time_usage['daily_cost_eur'] >= self.limits['daily_cost_limit_eur']:
            self._add_offload_recommendation("Daily cost limit reached")
            return False
        
        # Check token limits
        if self.real_time_usage['hourly_tokens'] >= self.limits['hourly_token_limit']:
            self._add_offload_recommendation("Hourly token limit reached")
            return False
        
        if self.real_time_usage['daily_tokens'] >= self.limits['daily_token_limit']:
            self._add_offload_recommendation("Daily token limit reached")
            return False
        
        # Check soft limits (80% thresholds)
        soft_warnings = []
        
        if self.real_time_usage['session_cost_eur'] >= self.limits['session_cost_limit_eur'] * 0.8:
            soft_warnings.append("Approaching session cost limit")
        
        if self.real_time_usage['hourly_cost_eur'] >= self.limits['hourly_cost_limit_eur'] * 0.8:
            soft_warnings.append("Approaching hourly cost limit")
        
        if self.real_time_usage['daily_tokens'] >= self.limits['daily_token_limit'] * 0.8:
            soft_warnings.append("Approaching daily token limit")
        
        if soft_warnings:
            for warning in soft_warnings:
                print(f"⚠️ {warning}")
            self._add_offload_recommendation(f"Soft limits reached: {', '.join(soft_warnings)}")
        
        return True
    
    def _add_offload_recommendation(self, reason: str):
        """Add recommendation to offload to ChatGPT"""
        recommendation = {
            'timestamp': datetime.now().isoformat(),
            'reason': reason,
            'current_usage': self.real_time_usage.copy(),
            'limits': self.limits.copy()
        }
        
        self.offload_recommendations.append(recommendation)
        print(f"🔄 Offload recommendation: {reason}")
    
    def _check_usage_warnings(self):
        """Check for usage warnings and alerts"""
        
        warnings = []
        
        # Cost warnings
        session_cost_pct = (self.real_time_usage['session_cost_eur'] / self.limits['session_cost_limit_eur']) * 100
        if session_cost_pct > 75:
            warnings.append(f"Session cost at {session_cost_pct:.1f}% of limit")
        
        hourly_cost_pct = (self.real_time_usage['hourly_cost_eur'] / self.limits['hourly_cost_limit_eur']) * 100
        if hourly_cost_pct > 75:
            warnings.append(f"Hourly cost at {hourly_cost_pct:.1f}% of limit")
        
        # Token warnings  
        daily_token_pct = (self.real_time_usage['daily_tokens'] / self.limits['daily_token_limit']) * 100
        if daily_token_pct > 75:
            warnings.append(f"Daily tokens at {daily_token_pct:.1f}% of limit")
        
        for warning in warnings:
            print(f"⚠️ Usage warning: {warning}")
    
    def get_usage_summary(self) -> Dict[str, Any]:
        """Get comprehensive usage summary"""
        
        current_time = datetime.now()
        session_duration = (current_time - self.session_start).total_seconds() / 3600  # hours
        
        return {
            'session_info': {
                'session_id': self.session_id,
                'start_time': self.session_start.isoformat(),
                'duration_hours': round(session_duration, 2),
                'events_recorded': len(self.usage_events)
            },
            'current_usage': self.real_time_usage.copy(),
            'limits': self.limits.copy(),
            'usage_percentages': {
                'session_cost': (self.real_time_usage['session_cost_eur'] / self.limits['session_cost_limit_eur']) * 100,
                'hourly_cost': (self.real_time_usage['hourly_cost_eur'] / self.limits['hourly_cost_limit_eur']) * 100,
                'daily_cost': (self.real_time_usage['daily_cost_eur'] / self.limits['daily_cost_limit_eur']) * 100,
                'hourly_tokens': (self.real_time_usage['hourly_tokens'] / self.limits['hourly_token_limit']) * 100,
                'daily_tokens': (self.real_time_usage['daily_tokens'] / self.limits['daily_token_limit']) * 100
            },
            'offload_recommendations': len(self.offload_recommendations),
            'should_use_claude': self._should_continue_with_claude(),
            'recent_offload_reasons': [
                rec['reason'] for rec in self.offload_recommendations[-3:]
            ]
        }
    
    def save_usage_data(self):
        """Save usage data to file"""
        try:
            data = {
                'session_info': {
                    'session_id': self.session_id,
                    'start_time': self.session_start.isoformat(),
                    'end_time': datetime.now().isoformat()
                },
                'usage_summary': self.real_time_usage.copy(),
                'limits': self.limits.copy(),
                'events': [
                    {
                        'timestamp': event.timestamp,
                        'action': event.action,
                        'tokens_estimated': event.tokens_estimated,
                        'cost_estimated_eur': event.cost_estimated_eur,
                        'session_id': event.session_id,
                        'success': event.success,
                        'details': event.details
                    }
                    for event in self.usage_events
                ],
                'offload_recommendations': self.offload_recommendations
            }
            
            # Load existing data and append
            existing_data = {'events': []}
            if self.monitoring_file.exists():
                with open(self.monitoring_file, 'r') as f:
                    existing_data = json.load(f)
            
            # Merge events (keep last 1000 events)
            all_events = existing_data.get('events', []) + data['events']
            data['events'] = all_events[-1000:]  # Keep last 1000 events
            
            with open(self.monitoring_file, 'w') as f:
                json.dump(data, f, indent=2)
                
            print(f"💾 Usage data saved to {self.monitoring_file}")
            
        except Exception as e:
            print(f"❌ Failed to save usage data: {e}")
    
    def get_verification_report(self) -> str:
        """Generate human-readable verification report"""
        
        summary = self.get_usage_summary()
        
        report = f"""
🔍 CLAUDE USAGE VERIFICATION REPORT
=====================================

📊 Session Information:
   Session ID: {summary['session_info']['session_id']}
   Duration: {summary['session_info']['duration_hours']} hours
   Events Recorded: {summary['session_info']['events_recorded']}

💰 Current Usage:
   Session Cost: €{summary['current_usage']['session_cost_eur']:.4f} ({summary['usage_percentages']['session_cost']:.1f}% of limit)
   Hourly Cost: €{summary['current_usage']['hourly_cost_eur']:.4f} ({summary['usage_percentages']['hourly_cost']:.1f}% of limit)
   Daily Cost: €{summary['current_usage']['daily_cost_eur']:.4f} ({summary['usage_percentages']['daily_cost']:.1f}% of limit)

🎯 Token Usage:
   Session Tokens: {summary['current_usage']['session_tokens']}
   Hourly Tokens: {summary['current_usage']['hourly_tokens']} ({summary['usage_percentages']['hourly_tokens']:.1f}% of limit)
   Daily Tokens: {summary['current_usage']['daily_tokens']} ({summary['usage_percentages']['daily_tokens']:.1f}% of limit)

🚦 Status:
   Should Continue with Claude: {'✅ YES' if summary['should_use_claude'] else '❌ NO - OFFLOAD TO CHATGPT'}
   Offload Recommendations: {summary['offload_recommendations']}

"""
        
        if summary['recent_offload_reasons']:
            report += "🔄 Recent Offload Reasons:\n"
            for reason in summary['recent_offload_reasons']:
                report += f"   • {reason}\n"
        
        report += "\n" + "="*50 + "\n"
        
        return report

async def main():
    """Test the Claude usage monitor"""
    
    try:
        monitor = ClaudeUsageMonitor()
        
        print("\n🧪 Testing Claude Usage Monitor...")
        
        # Start monitoring
        monitor.start_monitoring()
        
        # Simulate some usage events
        print("\n📝 Simulating usage events...")
        
        await monitor.record_claude_usage("tool_call", 150, details={"tool": "bash"})
        await monitor.record_claude_usage("response_generation", 300, details={"length": "medium"})
        await monitor.record_claude_usage("context_processing", 75, details={"context_size": "small"})
        
        # Wait a bit for background monitoring
        await asyncio.sleep(2)
        
        # Generate reports
        print("\n📊 Usage Summary:")
        summary = monitor.get_usage_summary()
        print(json.dumps(summary, indent=2))
        
        print("\n📋 Verification Report:")
        print(monitor.get_verification_report())
        
        # Test limit checking
        print("\n🧪 Testing limit enforcement...")
        should_continue = await monitor.record_claude_usage("large_task", 4000, details={"task": "complex"})
        print(f"Should continue with Claude after large task: {should_continue}")
        
        # Stop monitoring
        monitor.stop_monitoring()
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())