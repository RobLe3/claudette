#!/usr/bin/env python3
"""
Claude Usage Validator - Verify Claude Pro Metrics Accuracy
"""

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add coordinator to path
sys.path.append(str(Path(__file__).parent))
from claude_integration_coordinator import ClaudeIntegrationCoordinator

class ClaudeUsageValidator:
    """Validate Claude Pro usage metrics and calculations"""
    
    def __init__(self):
        self.coordinator = ClaudeIntegrationCoordinator()
        
    def validate_all_metrics(self) -> dict:
        """Comprehensive validation of all Claude Pro metrics"""
        
        validation_results = {
            'timestamp': datetime.now().isoformat(),
            'validation_status': 'PASS',
            'errors': [],
            'warnings': [],
            'metrics': {}
        }
        
        # Get current status
        status = self.coordinator.status_manager.get_claude_pro_status()
        if not status:
            validation_results['validation_status'] = 'FAIL'
            validation_results['errors'].append('Could not retrieve Claude Pro status')
            return validation_results
            
        validation_results['metrics']['raw_status'] = status
        
        # Validate usage percentages
        daily_calc = (status['daily_usage_tokens'] / status['daily_limit_tokens']) * 100
        monthly_calc = (status['monthly_usage_tokens'] / status['monthly_limit_tokens']) * 100
        
        if abs(daily_calc - status['daily_usage_percent']) > 0.001:
            validation_results['errors'].append(f"Daily percentage mismatch: {daily_calc:.3f}% vs {status['daily_usage_percent']:.3f}%")
            
        if abs(monthly_calc - status['monthly_usage_percent']) > 0.001:
            validation_results['errors'].append(f"Monthly percentage mismatch: {monthly_calc:.3f}% vs {status['monthly_usage_percent']:.3f}%")
            
        # Validate reset timing
        now = datetime.now()
        if now.hour < 2:
            expected_reset = now.replace(hour=2, minute=0, second=0, microsecond=0)
        else:
            expected_reset = now.replace(hour=2, minute=0, second=0, microsecond=0) + timedelta(days=1)
            
        expected_hours = (expected_reset - now).total_seconds() / 3600
        if abs(expected_hours - status['hours_to_reset']) > 0.1:
            validation_results['errors'].append(f"Reset timing mismatch: {expected_hours:.1f}h vs {status['hours_to_reset']:.1f}h")
            
        # Validate limits (Claude Pro limits)
        if status['daily_limit_tokens'] != 2000000:
            validation_results['errors'].append(f"Incorrect daily limit: {status['daily_limit_tokens']} (expected 2,000,000)")
            
        if status['monthly_limit_tokens'] != 60000000:
            validation_results['errors'].append(f"Incorrect monthly limit: {status['monthly_limit_tokens']} (expected 60,000,000)")
            
        # Usage warnings
        if status['daily_usage_percent'] > 80:
            validation_results['warnings'].append(f"High daily usage: {status['daily_usage_percent']:.1f}%")
            
        if status['monthly_usage_percent'] > 80:
            validation_results['warnings'].append(f"High monthly usage: {status['monthly_usage_percent']:.1f}%")
            
        # Set final status
        if validation_results['errors']:
            validation_results['validation_status'] = 'FAIL'
        elif validation_results['warnings']:
            validation_results['validation_status'] = 'WARN'
            
        return validation_results
        
    def generate_usage_overview(self) -> str:
        """Generate permanent overview of Claude Code usage remaining"""
        
        status = self.coordinator.status_manager.get_claude_pro_status()
        if not status:
            return "❌ Unable to retrieve Claude Pro status"
            
        # Calculate remaining capacity
        daily_remaining = status['daily_limit_tokens'] - status['daily_usage_tokens']
        monthly_remaining = status['monthly_limit_tokens'] - status['monthly_usage_tokens']
        
        # Format large numbers
        def format_tokens(tokens):
            if tokens >= 1000000:
                return f"{tokens/1000000:.1f}M"
            elif tokens >= 1000:
                return f"{tokens/1000:.1f}K"
            return str(tokens)
            
        overview = f"""
╭─────────────────────────────────────────────────────────╮
│                  🤖 CLAUDE PRO USAGE OVERVIEW           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📊 DAILY CAPACITY                                      │
│     Used: {format_tokens(status['daily_usage_tokens']):>8} / {format_tokens(status['daily_limit_tokens'])} tokens ({status['daily_usage_percent']:>5.1f}%)    │
│     Left: {format_tokens(daily_remaining):>8} tokens ({100-status['daily_usage_percent']:>5.1f}% remaining)      │
│                                                         │
│  📈 MONTHLY CAPACITY                                    │
│     Used: {format_tokens(status['monthly_usage_tokens']):>8} / {format_tokens(status['monthly_limit_tokens'])} tokens ({status['monthly_usage_percent']:>5.1f}%)    │
│     Left: {format_tokens(monthly_remaining):>8} tokens ({100-status['monthly_usage_percent']:>5.1f}% remaining)      │
│                                                         │
│  ⏰ RESET TIMING                                        │
│     Next reset: {status['hours_to_reset']:>5.1f} hours (2:00 AM)             │
│                                                         │
│  💰 BILLING                                             │
│     Session: €{status['session_cost_eur']:>6.4f}                            │
│     Period:  €{status['billing_period_eur']:>6.2f}                              │
│                                                         │
│  🎯 STATUS: {'🟢 OPTIMAL' if status['daily_usage_percent'] < 50 else '🟡 MODERATE' if status['daily_usage_percent'] < 80 else '🔴 HIGH'}                            │
╰─────────────────────────────────────────────────────────╯
"""
        return overview.strip()
        
    def check_usage_efficiency(self) -> dict:
        """Check if usage is efficient based on patterns"""
        
        status = self.coordinator.status_manager.get_claude_pro_status()
        efficiency_report = {
            'timestamp': datetime.now().isoformat(),
            'efficiency_score': 100,
            'recommendations': [],
            'status': status
        }
        
        # Check usage patterns
        if status['daily_usage_percent'] > 90:
            efficiency_report['efficiency_score'] -= 30
            efficiency_report['recommendations'].append("Consider spreading work across multiple days")
            
        if status['monthly_usage_percent'] > 90:
            efficiency_report['efficiency_score'] -= 40
            efficiency_report['recommendations'].append("Approaching monthly limit - optimize token usage")
            
        if status['billing_period_eur'] > 15:  # Getting close to subscription cost
            efficiency_report['efficiency_score'] -= 20
            efficiency_report['recommendations'].append("High overage costs - stay within included limits")
            
        return efficiency_report

def main():
    """Main validation and overview function"""
    
    validator = ClaudeUsageValidator()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "validate":
            results = validator.validate_all_metrics()
            print(json.dumps(results, indent=2))
            
        elif command == "overview":
            overview = validator.generate_usage_overview()
            print(overview)
            
        elif command == "efficiency":
            efficiency = validator.check_usage_efficiency()
            print(json.dumps(efficiency, indent=2))
            
        else:
            print("Usage: python3 claude_usage_validator.py [validate|overview|efficiency]")
    else:
        # Default: show overview
        overview = validator.generate_usage_overview()
        print(overview)

if __name__ == "__main__":
    main()