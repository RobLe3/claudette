#!/usr/bin/env python3
"""
Claude Code Update Protection System
Protects custom enhancements from being lost during Claude Code updates
"""

import json
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

class ClaudeCodeUpdateProtector:
    """Protect custom configurations and enhancements from Claude Code updates"""
    
    def __init__(self):
        self.claude_dir = Path.home() / '.claude'
        self.project_dir = Path('/Users/roble/Documents/Python/claude_flow')
        self.backup_dir = self.claude_dir / 'backups' / 'update_protection'
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Critical files to protect
        self.critical_files = {
            # Claude configuration files
            'settings.json': self.claude_dir / 'settings.json',
            'openai_usage.json': self.claude_dir / 'openai_usage.json',
            'session_guard_config.json': self.claude_dir / 'session_guard_config.json',
            
            # Databases
            'cost_tracker.db': self.claude_dir / 'cost_tracker.db',
            'enhancement_inventory.db': self.claude_dir / 'enhancement_inventory.db',
            'unified_costs.db': self.claude_dir / 'unified_costs.db',
            'project_automation.db': self.claude_dir / 'project_automation.db',
            
            # Configuration files
            'claude-flow.config.json': self.project_dir / 'claude-flow.config.json',
            'CLAUDE.md': self.project_dir / 'CLAUDE.md',
            
            # Log files with important data
            'swarm_execution_history.json': self.claude_dir / 'swarm_execution_history.json',
            'token_distribution_metrics.json': self.claude_dir / 'token_distribution_metrics.json',
            'usage_monitoring.json': self.claude_dir / 'usage_monitoring.json'
        }
        
        # Directories to preserve
        self.critical_directories = {
            'hooks': self.claude_dir / 'hooks',
            'local': self.claude_dir / 'local',
            'security': self.claude_dir / 'security',
            'shell-snapshots': self.claude_dir / 'shell-snapshots',
            'todos': self.claude_dir / 'todos',
            'projects': self.claude_dir / 'projects',
            'statsig': self.claude_dir / 'statsig'
        }
        
        # MCP server configuration
        self.mcp_servers = {
            'claude-flow': 'npx claude-flow@alpha mcp start'
        }
        
    def create_comprehensive_backup(self) -> Dict[str, Any]:
        """Create a comprehensive backup of all critical configurations"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_info = {
            'timestamp': timestamp,
            'claude_flow_version': self._get_claude_flow_version(),
            'backup_location': str(self.backup_dir / f'backup_{timestamp}'),
            'files_backed_up': [],
            'directories_backed_up': [],
            'mcp_configuration': {},
            'database_schemas': {}
        }
        
        backup_location = Path(backup_info['backup_location'])
        backup_location.mkdir(parents=True, exist_ok=True)
        
        # Backup critical files
        for name, file_path in self.critical_files.items():
            if file_path.exists():
                dest = backup_location / name
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(file_path, dest)
                backup_info['files_backed_up'].append(name)
                print(f"✅ Backed up: {name}")
            else:
                print(f"⚠️  Missing: {name} ({file_path})")
        
        # Backup critical directories
        for name, dir_path in self.critical_directories.items():
            if dir_path.exists():
                dest = backup_location / 'directories' / name
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copytree(dir_path, dest, dirs_exist_ok=True)
                backup_info['directories_backed_up'].append(name)
                print(f"✅ Backed up directory: {name}")
        
        # Backup MCP configuration
        backup_info['mcp_configuration'] = self._backup_mcp_configuration(backup_location)
        
        # Export database schemas
        backup_info['database_schemas'] = self._export_database_schemas(backup_location)
        
        # Save backup info
        with open(backup_location / 'backup_info.json', 'w') as f:
            json.dump(backup_info, f, indent=2)
        
        print(f"🎯 Comprehensive backup completed: {backup_location}")
        return backup_info
    
    def verify_post_update_integrity(self) -> Dict[str, Any]:
        """Verify system integrity after Claude Code update"""
        verification_results = {
            'timestamp': datetime.now().isoformat(),
            'claude_flow_version': self._get_claude_flow_version(),
            'missing_files': [],
            'corrupted_files': [],
            'mcp_status': {},
            'database_status': {},
            'hook_status': {},
            'overall_status': 'unknown'
        }
        
        # Check critical files
        for name, file_path in self.critical_files.items():
            if not file_path.exists():
                verification_results['missing_files'].append(name)
                print(f"❌ Missing after update: {name}")
            elif self._is_file_corrupted(file_path):
                verification_results['corrupted_files'].append(name)
                print(f"⚠️  Potentially corrupted: {name}")
            else:
                print(f"✅ Verified: {name}")
        
        # Check MCP servers
        verification_results['mcp_status'] = self._verify_mcp_servers()
        
        # Check databases
        verification_results['database_status'] = self._verify_databases()
        
        # Check hooks
        verification_results['hook_status'] = self._verify_hooks()
        
        # Determine overall status
        if (not verification_results['missing_files'] and 
            not verification_results['corrupted_files'] and
            verification_results['mcp_status'].get('claude-flow', {}).get('status') == 'working'):
            verification_results['overall_status'] = 'healthy'
        elif verification_results['missing_files'] or verification_results['corrupted_files']:
            verification_results['overall_status'] = 'critical'
        else:
            verification_results['overall_status'] = 'warning'
        
        return verification_results
    
    def restore_from_backup(self, backup_path: Optional[str] = None) -> Dict[str, Any]:
        """Restore configuration from backup"""
        if not backup_path:
            # Find most recent backup
            backups = list(self.backup_dir.glob('backup_*'))
            if not backups:
                return {'error': 'No backups found'}
            backup_path = max(backups, key=lambda p: p.stat().st_mtime)
        
        backup_location = Path(backup_path)
        if not backup_location.exists():
            return {'error': f'Backup not found: {backup_location}'}
        
        # Load backup info
        backup_info_file = backup_location / 'backup_info.json'
        if backup_info_file.exists():
            with open(backup_info_file, 'r') as f:
                backup_info = json.load(f)
        else:
            backup_info = {}
        
        restore_results = {
            'timestamp': datetime.now().isoformat(),
            'backup_used': str(backup_location),
            'files_restored': [],
            'directories_restored': [],
            'mcp_restored': False,
            'errors': []
        }
        
        # Restore files
        for name in backup_info.get('files_backed_up', []):
            src = backup_location / name
            dest = self.critical_files.get(name)
            if src.exists() and dest:
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dest)
                restore_results['files_restored'].append(name)
                print(f"✅ Restored: {name}")
            else:
                error = f"Cannot restore {name}: source or destination invalid"
                restore_results['errors'].append(error)
                print(f"❌ {error}")
        
        # Restore directories
        for name in backup_info.get('directories_backed_up', []):
            src = backup_location / 'directories' / name
            dest = self.critical_directories.get(name)
            if src.exists() and dest:
                if dest.exists():
                    shutil.rmtree(dest)
                shutil.copytree(src, dest)
                restore_results['directories_restored'].append(name)
                print(f"✅ Restored directory: {name}")
        
        # Restore MCP configuration
        mcp_result = self._restore_mcp_configuration(backup_location)
        restore_results['mcp_restored'] = mcp_result.get('success', False)
        if not restore_results['mcp_restored']:
            restore_results['errors'].append(f"MCP restore failed: {mcp_result.get('error')}")
        
        print(f"🎯 Restore completed from: {backup_location}")
        return restore_results
    
    def create_update_protection_script(self) -> str:
        """Create a script to run before Claude Code updates"""
        script_content = f'''#!/bin/bash
# Claude Code Update Protection Script
# Generated: {datetime.now().isoformat()}

echo "🛡️  Claude Code Update Protection System"
echo "======================================="

# Create pre-update backup
echo "📦 Creating comprehensive backup..."
python3 "{__file__}" backup

# Verify current system health
echo "🔍 Verifying current system health..."
python3 "{__file__}" verify

# Save current MCP configuration
echo "⚙️  Saving MCP configuration..."
claude mcp list > ~/.claude/backups/update_protection/pre_update_mcp_list.txt

echo "✅ Update protection setup complete!"
echo "    You can now proceed with the Claude Code update."
echo "    After update, run: python3 {__file__} post-update"
'''
        
        script_path = self.backup_dir / 'pre_update_protection.sh'
        with open(script_path, 'w') as f:
            f.write(script_content)
        
        script_path.chmod(0o755)
        print(f"✅ Update protection script created: {script_path}")
        return str(script_path)
    
    def _get_claude_flow_version(self) -> str:
        """Get current claude-flow version"""
        try:
            result = subprocess.run(['npx', 'claude-flow@alpha', '--version'], 
                                  capture_output=True, text=True, timeout=30)
            return result.stdout.strip() if result.returncode == 0 else 'unknown'
        except Exception:
            return 'unknown'
    
    def _backup_mcp_configuration(self, backup_location: Path) -> Dict[str, Any]:
        """Backup MCP server configuration"""
        mcp_backup = {
            'servers': {},
            'claude_mcp_list': None
        }
        
        # Get current MCP list
        try:
            result = subprocess.run(['claude', 'mcp', 'list'], 
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                mcp_backup['claude_mcp_list'] = result.stdout
                # Save to file
                with open(backup_location / 'mcp_list.txt', 'w') as f:
                    f.write(result.stdout)
        except Exception as e:
            mcp_backup['error'] = str(e)
        
        # Backup known servers configuration
        for name, command in self.mcp_servers.items():
            mcp_backup['servers'][name] = {
                'command': command,
                'version': self._get_claude_flow_version() if name == 'claude-flow' else 'unknown'
            }
        
        return mcp_backup
    
    def _export_database_schemas(self, backup_location: Path) -> Dict[str, Any]:
        """Export database schemas and sample data"""
        schemas = {}
        
        for name, file_path in self.critical_files.items():
            if name.endswith('.db') and file_path.exists():
                try:
                    conn = sqlite3.connect(file_path)
                    cursor = conn.cursor()
                    
                    # Get schema
                    cursor.execute("SELECT sql FROM sqlite_master WHERE type='table'")
                    schema = cursor.fetchall()
                    
                    # Get table names and row counts
                    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                    tables = cursor.fetchall()
                    
                    schemas[name] = {
                        'schema': [s[0] for s in schema if s[0]],
                        'tables': {}
                    }
                    
                    for table in tables:
                        table_name = table[0]
                        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                        count = cursor.fetchone()[0]
                        schemas[name]['tables'][table_name] = {'row_count': count}
                    
                    conn.close()
                    
                    # Save schema to file
                    with open(backup_location / f'{name}_schema.json', 'w') as f:
                        json.dump(schemas[name], f, indent=2)
                        
                except Exception as e:
                    schemas[name] = {'error': str(e)}
        
        return schemas
    
    def _is_file_corrupted(self, file_path: Path) -> bool:
        """Check if file is corrupted (basic checks)"""
        try:
            if file_path.suffix == '.json':
                with open(file_path, 'r') as f:
                    json.load(f)
            elif file_path.suffix == '.db':
                conn = sqlite3.connect(file_path)
                conn.execute('PRAGMA integrity_check')
                conn.close()
            return False
        except Exception:
            return True
    
    def _verify_mcp_servers(self) -> Dict[str, Any]:
        """Verify MCP servers are working"""
        mcp_status = {}
        
        try:
            # Check if claude-flow MCP server is working
            result = subprocess.run(['claude', 'mcp', 'list'], 
                                  capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0 and 'claude-flow' in result.stdout:
                mcp_status['claude-flow'] = {'status': 'working', 'output': result.stdout}
            else:
                mcp_status['claude-flow'] = {'status': 'missing', 'output': result.stdout}
                
        except Exception as e:
            mcp_status['claude-flow'] = {'status': 'error', 'error': str(e)}
        
        return mcp_status
    
    def _verify_databases(self) -> Dict[str, Any]:
        """Verify database integrity"""
        db_status = {}
        
        for name, file_path in self.critical_files.items():
            if name.endswith('.db') and file_path.exists():
                try:
                    conn = sqlite3.connect(file_path)
                    result = conn.execute('PRAGMA integrity_check').fetchone()
                    conn.close()
                    
                    db_status[name] = {
                        'status': 'healthy' if result[0] == 'ok' else 'corrupted',
                        'integrity_check': result[0]
                    }
                except Exception as e:
                    db_status[name] = {'status': 'error', 'error': str(e)}
        
        return db_status
    
    def _verify_hooks(self) -> Dict[str, Any]:
        """Verify automation hooks are working"""
        hook_status = {}
        
        # Check settings.json hooks
        settings_file = self.claude_dir / 'settings.json'
        if settings_file.exists():
            try:
                with open(settings_file, 'r') as f:
                    settings = json.load(f)
                
                hooks = settings.get('hooks', {})
                for hook_type, hook_list in hooks.items():
                    for hook_cmd in hook_list:
                        hook_path = Path(hook_cmd.split()[1] if len(hook_cmd.split()) > 1 else hook_cmd)
                        hook_status[f"{hook_type}_{hook_path.name}"] = {
                            'exists': hook_path.exists(),
                            'command': hook_cmd
                        }
                        
            except Exception as e:
                hook_status['settings_error'] = str(e)
        
        return hook_status
    
    def _restore_mcp_configuration(self, backup_location: Path) -> Dict[str, Any]:
        """Restore MCP server configuration"""
        try:
            # Try to add claude-flow MCP server
            result = subprocess.run([
                'claude', 'mcp', 'add', 'claude-flow', 
                'npx', 'claude-flow@alpha', 'mcp', 'start'
            ], capture_output=True, text=True, timeout=60)
            
            if result.returncode == 0:
                return {'success': True, 'output': result.stdout}
            else:
                return {'success': False, 'error': result.stderr}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}

def main():
    """Main CLI interface"""
    if len(sys.argv) < 2:
        print("Usage: python3 update_protection_system.py [backup|verify|restore|post-update|create-script]")
        return
    
    command = sys.argv[1]
    protector = ClaudeCodeUpdateProtector()
    
    if command == "backup":
        print("🛡️  Creating comprehensive backup for update protection...")
        result = protector.create_comprehensive_backup()
        print(f"✅ Backup completed: {result['backup_location']}")
        
    elif command == "verify":
        print("🔍 Verifying system integrity...")
        result = protector.verify_post_update_integrity()
        print(f"📊 Overall status: {result['overall_status']}")
        
        if result['missing_files']:
            print(f"❌ Missing files: {', '.join(result['missing_files'])}")
        if result['corrupted_files']:
            print(f"⚠️  Corrupted files: {', '.join(result['corrupted_files'])}")
            
        print(json.dumps(result, indent=2))
        
    elif command == "restore":
        backup_path = sys.argv[2] if len(sys.argv) > 2 else None
        print("🔄 Restoring from backup...")
        result = protector.restore_from_backup(backup_path)
        
        if result.get('errors'):
            print(f"❌ Errors during restore: {result['errors']}")
        else:
            print("✅ Restore completed successfully")
            
        print(json.dumps(result, indent=2))
        
    elif command == "post-update":
        print("🔍 Post-update verification and recovery...")
        
        # Verify system
        verification = protector.verify_post_update_integrity()
        print(f"📊 System status: {verification['overall_status']}")
        
        # If critical issues, offer to restore
        if verification['overall_status'] == 'critical':
            print("🚨 Critical issues detected. Attempting automatic restore...")
            restore_result = protector.restore_from_backup()
            if restore_result.get('errors'):
                print("❌ Automatic restore failed. Manual intervention required.")
            else:
                print("✅ Automatic restore completed")
        
    elif command == "create-script":
        script_path = protector.create_update_protection_script()
        print(f"✅ Protection script created: {script_path}")
        print(f"   Run before update: {script_path}")
        
    else:
        print("Commands: backup, verify, restore, post-update, create-script")

if __name__ == "__main__":
    main()