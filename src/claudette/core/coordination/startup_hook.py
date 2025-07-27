#!/usr/bin/env python3
"""
Claude Startup Hook - Automatic enhancement verification on Claude startup
Integrates with Claude Code's startup process
"""

import json
import sys
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any
import subprocess

# Add to path for imports
sys.path.append(str(Path(__file__).parent))
from enhancement_index_manager import EnhancementIndexManager

class ClaudeStartupHook:
    """Manage Claude Code startup verification and enhancement loading"""
    
    def __init__(self):
        self.claude_dir = Path.home() / '.claude'
        self.startup_log = self.claude_dir / 'startup_verification.log'
        self.last_check_file = self.claude_dir / 'last_startup_check.json'
        self.enhancement_manager = EnhancementIndexManager()
        
        # Configuration
        self.config = {
            'verification_interval_hours': 24,  # Run full verification daily
            'quick_check_interval_hours': 1,   # Quick check every hour
            'startup_timeout_seconds': 30,     # Max time for startup checks
            'critical_enhancement_check': True, # Always check critical enhancements
            'auto_fix_enabled': True           # Attempt automatic fixes
        }
        
    def should_run_verification(self) -> Dict[str, bool]:
        """Determine what verification should run based on timing"""
        check_status = {
            'full_verification': False,
            'quick_check': False,
            'first_run': False
        }
        
        if not self.last_check_file.exists():
            check_status['first_run'] = True
            check_status['full_verification'] = True
            return check_status
        
        try:
            with open(self.last_check_file, 'r') as f:
                last_check = json.load(f)
            
            last_full = datetime.fromisoformat(last_check.get('last_full_verification', '2000-01-01'))
            last_quick = datetime.fromisoformat(last_check.get('last_quick_check', '2000-01-01'))
            
            now = datetime.now()
            
            # Check if full verification is needed
            if (now - last_full).total_seconds() > (self.config['verification_interval_hours'] * 3600):
                check_status['full_verification'] = True
            
            # Check if quick check is needed
            elif (now - last_quick).total_seconds() > (self.config['quick_check_interval_hours'] * 3600):
                check_status['quick_check'] = True
                
        except Exception:
            check_status['full_verification'] = True
        
        return check_status
    
    def run_startup_verification(self) -> Dict[str, Any]:
        """Run appropriate startup verification based on timing"""
        start_time = datetime.now()
        
        check_status = self.should_run_verification()
        
        verification_result = {
            'timestamp': start_time.isoformat(),
            'verification_type': 'none',
            'duration_ms': 0,
            'status': 'success',
            'enhancement_count': 0,
            'health_score': 1.0,
            'issues': [],
            'recommendations': []
        }
        
        try:
            if check_status['full_verification']:
                verification_result = self._run_full_verification()
                verification_result['verification_type'] = 'full'
                
            elif check_status['quick_check']:
                verification_result = self._run_quick_check()
                verification_result['verification_type'] = 'quick'
                
            elif check_status['first_run']:
                verification_result = self._run_first_run_setup()
                verification_result['verification_type'] = 'first_run'
            
            # Update last check record
            self._update_last_check_record(verification_result['verification_type'])
            
            # Log the verification
            self._log_startup_verification(verification_result)
            
        except Exception as e:
            verification_result['status'] = 'error'
            verification_result['issues'].append(f"Startup verification failed: {str(e)}")
        
        verification_result['duration_ms'] = (datetime.now() - start_time).total_seconds() * 1000
        
        return verification_result
    
    def _run_full_verification(self) -> Dict[str, Any]:
        """Run complete enhancement verification"""
        # Rebuild index and verify all enhancements
        index_result = self.enhancement_manager.rebuild_index()
        verification_result = self.enhancement_manager.verify_enhancements()
        
        result = {
            'timestamp': datetime.now().isoformat(),
            'status': 'success',
            'enhancement_count': index_result['total_enhancements'],
            'health_score': verification_result['overall_health'],
            'issues': [],
            'recommendations': []
        }
        
        # Analyze results and generate recommendations
        if verification_result['overall_health'] < 0.8:
            result['issues'].append(f"Low health score: {verification_result['overall_health']:.1%}")
            result['recommendations'].append("Run 'python3 enhancement_index_manager.py verify' for details")
        
        if verification_result['missing'] > 0:
            result['issues'].append(f"{verification_result['missing']} missing enhancements")
            result['recommendations'].append("Check file paths and reinstall missing components")
        
        if verification_result['issues'] > 0:
            result['issues'].append(f"{verification_result['issues']} enhancements have issues")
            result['recommendations'].append("Review enhancement integrity")
        
        return result
    
    def _run_quick_check(self) -> Dict[str, Any]:
        """Run quick check of critical enhancements"""
        critical_enhancements = [
            'claude_integration_coordinator.py',
            'unified_cost_tracker.py',
            'chatgpt_offloading_manager.py',
            'session_optimizer.py'
        ]
        
        result = {
            'timestamp': datetime.now().isoformat(),
            'status': 'success',
            'enhancement_count': 0,
            'health_score': 1.0,
            'issues': [],
            'recommendations': []
        }
        
        # Check critical files exist and are accessible
        for enhancement in critical_enhancements:
            file_path = Path(__file__).parent / enhancement
            if file_path.exists():
                result['enhancement_count'] += 1
            else:
                result['issues'].append(f"Critical enhancement missing: {enhancement}")
                result['health_score'] *= 0.8
        
        if result['issues']:
            result['status'] = 'issues'
            result['recommendations'].append("Run full verification to identify problems")
        
        return result
    
    def _run_first_run_setup(self) -> Dict[str, Any]:
        """Setup enhancement system on first run"""
        result = {
            'timestamp': datetime.now().isoformat(),
            'status': 'success',
            'enhancement_count': 0,
            'health_score': 1.0,
            'issues': [],
            'recommendations': []
        }
        
        try:
            # Initialize enhancement system
            index_result = self.enhancement_manager.rebuild_index()
            result['enhancement_count'] = index_result['total_enhancements']
            
            # Create startup configuration
            self._create_startup_config()
            
            result['recommendations'].append("Enhancement system initialized successfully")
            result['recommendations'].append("Run 'python3 enhancement_index_manager.py startup' for full report")
            
        except Exception as e:
            result['status'] = 'error'
            result['issues'].append(f"First run setup failed: {str(e)}")
        
        return result
    
    def _create_startup_config(self):
        """Create startup configuration files"""
        # Create Claude settings integration
        settings_file = self.claude_dir / 'settings.json'
        
        startup_settings = {
            'enhancement_verification': {
                'enabled': True,
                'verification_on_startup': True,
                'full_verification_interval_hours': 24,
                'quick_check_interval_hours': 1
            },
            'hooks': {
                'pre_session': [
                    'python3 /Users/roble/Documents/Python/claude_flow/scripts/automation/claude_startup_hook.py'
                ]
            }
        }
        
        # Merge with existing settings if they exist
        existing_settings = {}
        if settings_file.exists():
            try:
                with open(settings_file, 'r') as f:
                    existing_settings = json.load(f)
            except:
                pass
        
        # Update settings
        existing_settings.update(startup_settings)
        
        with open(settings_file, 'w') as f:
            json.dump(existing_settings, f, indent=2)
    
    def _update_last_check_record(self, verification_type: str):
        """Update record of last verification"""
        now = datetime.now().isoformat()
        
        record = {}
        if self.last_check_file.exists():
            try:
                with open(self.last_check_file, 'r') as f:
                    record = json.load(f)
            except:
                pass
        
        if verification_type == 'full':
            record['last_full_verification'] = now
        elif verification_type == 'quick':
            record['last_quick_check'] = now
        elif verification_type == 'first_run':
            record['last_full_verification'] = now
            record['first_run_completed'] = now
        
        record['last_startup_check'] = now
        
        with open(self.last_check_file, 'w') as f:
            json.dump(record, f, indent=2)
    
    def _log_startup_verification(self, result: Dict[str, Any]):
        """Log startup verification result"""
        log_entry = {
            'timestamp': result['timestamp'],
            'type': result['verification_type'],
            'status': result['status'],
            'duration_ms': result['duration_ms'],
            'enhancement_count': result['enhancement_count'],
            'health_score': result['health_score'],
            'issues_count': len(result['issues'])
        }
        
        # Append to log file
        with open(self.startup_log, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')
        
        # Keep log file manageable (last 100 entries)
        self._trim_log_file()
    
    def _trim_log_file(self):
        """Keep startup log file manageable"""
        if not self.startup_log.exists():
            return
        
        try:
            with open(self.startup_log, 'r') as f:
                lines = f.readlines()
            
            if len(lines) > 100:
                # Keep last 50 lines
                with open(self.startup_log, 'w') as f:
                    f.writelines(lines[-50:])
        except:
            pass
    
    def generate_startup_summary(self) -> str:
        """Generate concise startup summary"""
        result = self.run_startup_verification()
        
        status_emoji = {
            'success': '✅',
            'issues': '⚠️',
            'error': '❌'
        }
        
        emoji = status_emoji.get(result['status'], '❓')
        
        summary = f"""
╭─────────────────────────────────────────────────────────╮
│            {emoji} CLAUDE STARTUP VERIFICATION                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🚀 Verification: {result['verification_type'].upper():<15} Duration: {result['duration_ms']:>6.0f}ms  │
│  📊 Enhancements: {result['enhancement_count']:>3} checked                        │
│  💯 Health Score: {result['health_score']:>6.1%}                          │
│                                                         │
"""
        
        if result['issues']:
            summary += "│  ⚠️  ISSUES DETECTED                                    │\n"
            for issue in result['issues'][:2]:
                issue_short = issue[:47] + '...' if len(issue) > 47 else issue
                summary += f"│     • {issue_short:<47}    │\n"
            if len(result['issues']) > 2:
                summary += f"│     ... and {len(result['issues']) - 2} more issues                        │\n"
            summary += "│                                                         │\n"
        
        if result['recommendations']:
            summary += "│  💡 RECOMMENDATIONS                                    │\n"
            for rec in result['recommendations'][:2]:
                rec_short = rec[:47] + '...' if len(rec) > 47 else rec
                summary += f"│     • {rec_short:<47}    │\n"
            summary += "│                                                         │\n"
        
        summary += "╰─────────────────────────────────────────────────────────╯"
        
        return summary
    
    def install_startup_hook(self) -> bool:
        """Install this script as a Claude startup hook"""
        try:
            # Create hook script in Claude directory
            hook_script = self.claude_dir / 'hooks' / 'startup_verification.py'
            hook_script.parent.mkdir(parents=True, exist_ok=True)
            
            # Create hook script that calls this verification
            hook_content = f'''#!/usr/bin/env python3
"""
Claude Startup Hook - Auto-verification of enhancements
"""
import sys
sys.path.append('/Users/roble/Documents/Python/claude_flow/scripts/automation')
from claude_startup_hook import ClaudeStartupHook

if __name__ == "__main__":
    hook = ClaudeStartupHook()
    summary = hook.generate_startup_summary()
    print(summary)
'''
            
            with open(hook_script, 'w') as f:
                f.write(hook_content)
            
            # Make executable
            hook_script.chmod(0o755)
            
            # Update Claude settings to include this hook
            self._create_startup_config()
            
            return True
            
        except Exception as e:
            print(f"Failed to install startup hook: {e}")
            return False

def main():
    """Main CLI interface"""
    hook = ClaudeStartupHook()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "install":
            if hook.install_startup_hook():
                print("✅ Startup hook installed successfully")
                print("Enhancement verification will run on Claude startup")
            else:
                print("❌ Failed to install startup hook")
                
        elif command == "test":
            result = hook.run_startup_verification()
            print(json.dumps(result, indent=2))
            
        elif command == "summary":
            print(hook.generate_startup_summary())
            
        elif command == "force-full":
            # Force full verification
            result = hook._run_full_verification()
            print(json.dumps(result, indent=2))
            
        else:
            print("Commands: install, test, summary, force-full")
    else:
        # Default: show startup summary
        print(hook.generate_startup_summary())

if __name__ == "__main__":
    main()