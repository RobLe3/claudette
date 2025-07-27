#!/usr/bin/env python3
"""
Claude Code Integration Test - Test and validate the fixed Claude Code installation
"""

import subprocess
import json
import sys
from pathlib import Path
from typing import Dict, Any, Optional

class ClaudeCodeIntegrationTest:
    """Test Claude Code installation and integration"""
    
    def __init__(self):
        self.claude_binary = "/usr/local/bin/claude"
        
    def test_binary_availability(self) -> Dict[str, Any]:
        """Test if Claude binary is available and functioning"""
        test_results = {
            'binary_exists': False,
            'binary_executable': False,
            'version_check': None,
            'config_accessible': False,
            'error_messages': []
        }
        
        # Check if binary exists
        if Path(self.claude_binary).exists():
            test_results['binary_exists'] = True
            
            # Check if executable
            if Path(self.claude_binary).stat().st_mode & 0o111:
                test_results['binary_executable'] = True
                
                # Test version command
                try:
                    result = subprocess.run([self.claude_binary, '--version'], 
                                          capture_output=True, text=True, timeout=10)
                    if result.returncode == 0:
                        test_results['version_check'] = result.stdout.strip()
                    else:
                        test_results['error_messages'].append(f"Version check failed: {result.stderr}")
                except subprocess.TimeoutExpired:
                    test_results['error_messages'].append("Version check timed out")
                except Exception as e:
                    test_results['error_messages'].append(f"Version check error: {str(e)}")
                
                # Test config command
                try:
                    result = subprocess.run([self.claude_binary, 'config', 'list'], 
                                          capture_output=True, text=True, timeout=10)
                    if result.returncode == 0:
                        test_results['config_accessible'] = True
                        try:
                            config_data = json.loads(result.stdout)
                            test_results['config_data'] = config_data
                        except json.JSONDecodeError:
                            test_results['config_data'] = result.stdout
                    else:
                        test_results['error_messages'].append(f"Config check failed: {result.stderr}")
                except subprocess.TimeoutExpired:
                    test_results['error_messages'].append("Config check timed out")
                except Exception as e:
                    test_results['error_messages'].append(f"Config check error: {str(e)}")
            else:
                test_results['error_messages'].append("Binary is not executable")
        else:
            test_results['error_messages'].append("Binary does not exist at expected location")
            
        return test_results
    
    def test_basic_functionality(self) -> Dict[str, Any]:
        """Test basic Claude Code functionality without authentication"""
        functionality_tests = {
            'help_command': False,
            'config_commands': False,
            'tools_available': False,
            'mcp_functionality': False,
            'error_messages': []
        }
        
        # Test help command
        try:
            result = subprocess.run([self.claude_binary, '--help'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0 and 'Usage:' in result.stdout:
                functionality_tests['help_command'] = True
            else:
                functionality_tests['error_messages'].append(f"Help command failed: {result.stderr}")
        except Exception as e:
            functionality_tests['error_messages'].append(f"Help command error: {str(e)}")
        
        # Test config list (already tested above)
        try:
            result = subprocess.run([self.claude_binary, 'config', 'list'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                functionality_tests['config_commands'] = True
        except Exception as e:
            functionality_tests['error_messages'].append(f"Config command error: {str(e)}")
        
        # Test tools list
        try:
            result = subprocess.run([self.claude_binary, 'tools', 'list'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                functionality_tests['tools_available'] = True
            else:
                functionality_tests['error_messages'].append(f"Tools command failed: {result.stderr}")
        except Exception as e:
            functionality_tests['error_messages'].append(f"Tools command error: {str(e)}")
        
        # Test MCP functionality
        try:
            result = subprocess.run([self.claude_binary, 'mcp', 'list'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                functionality_tests['mcp_functionality'] = True
            else:
                functionality_tests['error_messages'].append(f"MCP command failed: {result.stderr}")
        except Exception as e:
            functionality_tests['error_messages'].append(f"MCP command error: {str(e)}")
            
        return functionality_tests
    
    def check_integration_compatibility(self) -> Dict[str, Any]:
        """Check compatibility with our integration systems"""
        compatibility = {
            'cost_tracking_compatible': False,
            'mcp_ruv_swarm_compatible': False,
            'hook_system_compatible': False,
            'integration_suggestions': [],
            'error_messages': []
        }
        
        # Check for cost tracking compatibility
        claude_dir = Path.home() / '.claude'
        if claude_dir.exists():
            compatibility['cost_tracking_compatible'] = True
            
            # Check for our custom databases
            custom_dbs = ['cost_tracker.db', 'unified_costs.db', 'project_automation.db']
            for db in custom_dbs:
                if (claude_dir / db).exists():
                    compatibility['integration_suggestions'].append(f"Found custom database: {db}")
        
        # Check MCP integration
        try:
            result = subprocess.run([self.claude_binary, 'mcp', 'list'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                compatibility['mcp_ruv_swarm_compatible'] = True
                if 'ruv-swarm' in result.stdout or 'claude-flow' in result.stdout:
                    compatibility['integration_suggestions'].append("MCP swarm integration detected")
        except Exception as e:
            compatibility['error_messages'].append(f"MCP integration check failed: {str(e)}")
        
        # Check for hook system compatibility
        hook_files = ['.claude/settings.json', '.claude/commands/']
        for hook_file in hook_files:
            if (Path.home() / hook_file).exists():
                compatibility['hook_system_compatible'] = True
                compatibility['integration_suggestions'].append(f"Hook system file found: {hook_file}")
        
        return compatibility
    
    def generate_integration_status_report(self) -> str:
        """Generate comprehensive integration status report"""
        
        binary_test = self.test_binary_availability()
        functionality_test = self.test_basic_functionality()
        compatibility_test = self.check_integration_compatibility()
        
        report = f"""
╭─────────────────────────────────────────────────────────╮
│            🔧 CLAUDE CODE INTEGRATION STATUS             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📦 BINARY STATUS                                       │
│     Binary Exists: {'✅ Yes' if binary_test['binary_exists'] else '❌ No':>12}                     │
│     Executable: {'✅ Yes' if binary_test['binary_executable'] else '❌ No':>15}                     │
│     Version: {binary_test.get('version_check', 'Unknown'):<20}              │
│     Config Access: {'✅ Yes' if binary_test['config_accessible'] else '❌ No':>12}                  │
│                                                         │
│  ⚙️  FUNCTIONALITY                                      │
│     Help Command: {'✅ Works' if functionality_test['help_command'] else '❌ Failed':>13}                 │
│     Config Commands: {'✅ Works' if functionality_test['config_commands'] else '❌ Failed':>10}              │
│     Tools Available: {'✅ Works' if functionality_test['tools_available'] else '❌ Failed':>10}              │
│     MCP Support: {'✅ Works' if functionality_test['mcp_functionality'] else '❌ Failed':>13}                 │
│                                                         │
│  🔗 INTEGRATION                                         │
│     Cost Tracking: {'✅ Compatible' if compatibility_test['cost_tracking_compatible'] else '❌ Issues':>11}             │
│     MCP Swarms: {'✅ Compatible' if compatibility_test['mcp_ruv_swarm_compatible'] else '❌ Issues':>14}                │
│     Hook System: {'✅ Compatible' if compatibility_test['hook_system_compatible'] else '❌ Issues':>13}               │
│                                                         │
"""
        
        # Add error messages if any
        all_errors = (binary_test.get('error_messages', []) + 
                     functionality_test.get('error_messages', []) + 
                     compatibility_test.get('error_messages', []))
        
        if all_errors:
            report += "│  ⚠️  ISSUES DETECTED                                    │\n"
            for error in all_errors[:3]:  # Show top 3 errors
                error_short = error[:45] + '...' if len(error) > 45 else error
                report += f"│     • {error_short:<47}    │\n"
            if len(all_errors) > 3:
                report += f"│     ... and {len(all_errors) - 3} more issues                        │\n"
            report += "│                                                         │\n"
        
        # Add integration suggestions
        suggestions = compatibility_test.get('integration_suggestions', [])
        if suggestions:
            report += "│  💡 INTEGRATION STATUS                                 │\n"
            for suggestion in suggestions[:3]:
                suggestion_short = suggestion[:45] + '...' if len(suggestion) > 45 else suggestion
                report += f"│     • {suggestion_short:<47}    │\n"
            report += "│                                                         │\n"
        
        report += "╰─────────────────────────────────────────────────────────╯"
        
        return report
    
    def suggest_fixes(self) -> list:
        """Suggest fixes for any detected issues"""
        suggestions = []
        
        binary_test = self.test_binary_availability()
        functionality_test = self.test_basic_functionality()
        
        if not binary_test['binary_exists']:
            suggestions.append("Reinstall Claude Code: npm install -g @anthropic-ai/claude-code")
        
        if not binary_test['binary_executable']:
            suggestions.append("Fix permissions: chmod +x /usr/local/bin/claude")
        
        if not binary_test['config_accessible']:
            suggestions.append("Initialize Claude config: claude config set")
        
        if not functionality_test['mcp_functionality']:
            suggestions.append("Check MCP configuration: claude mcp list")
        
        # Check if authentication might be needed
        if binary_test['config_accessible'] and binary_test.get('config_data'):
            config = binary_test.get('config_data', {})
            if isinstance(config, dict) and not config.get('hasTrustDialogAccepted', False):
                suggestions.append("Accept Claude trust dialog for authentication")
        
        return suggestions

def main():
    """Main test interface"""
    tester = ClaudeCodeIntegrationTest()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "binary":
            result = tester.test_binary_availability()
            print(json.dumps(result, indent=2))
            
        elif command == "functionality":
            result = tester.test_basic_functionality()
            print(json.dumps(result, indent=2))
            
        elif command == "compatibility":
            result = tester.check_integration_compatibility()
            print(json.dumps(result, indent=2))
            
        elif command == "fixes":
            fixes = tester.suggest_fixes()
            print("🔧 SUGGESTED FIXES:")
            for i, fix in enumerate(fixes, 1):
                print(f"  {i}. {fix}")
                
        else:
            print("Commands: binary, functionality, compatibility, fixes, report")
    else:
        # Default: show full report
        print(tester.generate_integration_status_report())
        
        fixes = tester.suggest_fixes()
        if fixes:
            print("\n🔧 SUGGESTED ACTIONS:")
            for i, fix in enumerate(fixes, 1):
                print(f"  {i}. {fix}")

if __name__ == "__main__":
    main()