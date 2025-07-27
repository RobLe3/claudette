#!/usr/bin/env python3
"""
Claude Integration Coordinator - Unified Claude Code Integration System
Consolidates hook integration, status management, and reminder functionality
Following CLAUDE.md parallel execution patterns
"""

import json
import sqlite3
import os
import sys
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any, Union
import subprocess

class ClaudeIntegrationCoordinator:
    """Unified system for Claude Code integration with parallel execution support"""
    
    def __init__(self):
        self.project_dir = Path('/Users/roble/Documents/Python/claude_flow')
        self.claude_dir = Path.home() / '.claude'
        
        # Initialize sub-managers
        self.hook_manager = HookManager(self.project_dir, self.claude_dir)
        self.status_manager = StatusManager(self.project_dir, self.claude_dir)
        self.reminder_manager = ReminderManager(self.project_dir, self.claude_dir)
        
        # Parallel execution tracking
        self.batch_operations = []
        self.operation_results = {}
        
    def execute_parallel_integration(self, operations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Execute multiple integration operations in parallel following CLAUDE.md patterns
        Implements "1 MESSAGE = ALL RELATED OPERATIONS" principle
        """
        start_time = datetime.now()
        results = {
            'timestamp': start_time.isoformat(),
            'operations_count': len(operations),
            'results': {},
            'errors': [],
            'performance': {}
        }
        
        # Group operations by type for parallel execution
        operation_groups = self._group_operations(operations)
        
        # Execute all operation groups in parallel
        for group_type, group_ops in operation_groups.items():
            try:
                if group_type == 'hook_operations':
                    group_result = self.hook_manager.execute_parallel_hooks(group_ops)
                elif group_type == 'status_operations':
                    group_result = self.status_manager.execute_parallel_status(group_ops)
                elif group_type == 'reminder_operations':
                    group_result = self.reminder_manager.execute_parallel_reminders(group_ops)
                elif group_type == 'mixed_operations':
                    group_result = self._execute_mixed_operations(group_ops)
                
                results['results'][group_type] = group_result
                
            except Exception as e:
                error = {
                    'group_type': group_type,
                    'error': str(e),
                    'timestamp': datetime.now().isoformat()
                }
                results['errors'].append(error)
        
        # Calculate performance metrics
        end_time = datetime.now()
        results['performance'] = {
            'duration_seconds': (end_time - start_time).total_seconds(),
            'operations_per_second': len(operations) / max((end_time - start_time).total_seconds(), 0.001),
            'parallel_efficiency': self._calculate_parallel_efficiency(operations, results)
        }
        
        return results
    
    def _group_operations(self, operations: List[Dict[str, Any]]) -> Dict[str, List]:
        """Group operations by type for parallel execution"""
        groups = {
            'hook_operations': [],
            'status_operations': [],
            'reminder_operations': [],
            'mixed_operations': []
        }
        
        for op in operations:
            op_type = op.get('type', 'unknown')
            
            if op_type in ['hook', 'activity_log', 'operation_track']:
                groups['hook_operations'].append(op)
            elif op_type in ['status', 'project_analysis', 'maturity_check']:
                groups['status_operations'].append(op)
            elif op_type in ['reminder', 'notification', 'alert']:
                groups['reminder_operations'].append(op)
            else:
                groups['mixed_operations'].append(op)
        
        return groups
    
    def _execute_mixed_operations(self, operations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Execute mixed operations that span multiple managers"""
        results = {'mixed_results': []}
        
        for op in operations:
            op_result = {
                'operation': op,
                'timestamp': datetime.now().isoformat()
            }
            
            try:
                # Route to appropriate manager based on operation content
                if 'hook' in op.get('description', '').lower():
                    op_result['result'] = self.hook_manager.process_single_operation(op)
                elif 'status' in op.get('description', '').lower():
                    op_result['result'] = self.status_manager.process_single_operation(op)
                elif 'reminder' in op.get('description', '').lower():
                    op_result['result'] = self.reminder_manager.process_single_operation(op)
                else:
                    op_result['result'] = self._process_generic_operation(op)
                    
            except Exception as e:
                op_result['error'] = str(e)
            
            results['mixed_results'].append(op_result)
        
        return results
    
    def _calculate_parallel_efficiency(self, operations: List, results: Dict) -> float:
        """Calculate parallel execution efficiency"""
        total_ops = len(operations)
        successful_ops = sum(len(group_result.get('successful', [])) 
                           for group_result in results.get('results', {}).values() 
                           if isinstance(group_result, dict))
        
        return successful_ops / max(total_ops, 1)
    
    def _process_generic_operation(self, operation: Dict[str, Any]) -> Any:
        """Process generic operation that doesn't fit specific categories"""
        return {
            'status': 'processed',
            'operation_type': 'generic',
            'timestamp': datetime.now().isoformat()
        }
    
    # Unified interface methods
    def get_comprehensive_status(self) -> Dict[str, Any]:
        """Get comprehensive Claude Code status from all managers"""
        return {
            'claude_pro_status': self.status_manager.get_claude_pro_status(),
            'project_maturity': self.status_manager.analyze_project_maturity(self.project_dir),
            'recent_activities': self.hook_manager.get_recent_activities(),
            'active_reminders': self.reminder_manager.check_all_reminders(),
            'integration_health': self._check_integration_health()
        }
    
    def log_batch_activity(self, activities: List[Dict[str, Any]]):
        """Log multiple activities in parallel"""
        batch_ops = [{'type': 'hook', 'data': activity} for activity in activities]
        return self.execute_parallel_integration(batch_ops)
    
    def generate_unified_status_message(self) -> str:
        """Generate unified status message combining all systems"""
        status = self.get_comprehensive_status()
        return self.status_manager.format_comprehensive_message(status)
    
    def _check_integration_health(self) -> Dict[str, Any]:
        """Check health of all integration components"""
        return {
            'hook_manager_healthy': self.hook_manager.is_healthy(),
            'status_manager_healthy': self.status_manager.is_healthy(),
            'reminder_manager_healthy': self.reminder_manager.is_healthy(),
            'last_health_check': datetime.now().isoformat()
        }

class HookManager:
    """Manages Claude Code hook integration and activity tracking"""
    
    def __init__(self, project_dir: Path, claude_dir: Path):
        self.project_dir = project_dir
        self.claude_dir = claude_dir
        self.log_file = claude_dir / 'automation_activity.log'
        self.automation_db = claude_dir / 'project_automation.db'
        
        # Ensure directories exist
        self.log_file.parent.mkdir(exist_ok=True)
    
    def execute_parallel_hooks(self, operations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Execute multiple hook operations in parallel"""
        results = {
            'successful': [],
            'failed': [],
            'total_processed': len(operations)
        }
        
        for op in operations:
            try:
                result = self.process_hook_operation(op)
                results['successful'].append(result)
            except Exception as e:
                results['failed'].append({
                    'operation': op,
                    'error': str(e)
                })
        
        return results
    
    def process_hook_operation(self, operation: Dict[str, Any]) -> Dict[str, Any]:
        """Process individual hook operation"""
        op_data = operation.get('data', {})
        
        # Parse Claude operation data
        parsed_data = self.parse_claude_operation(op_data)
        
        # Log to automation daemon
        self.log_activity_to_daemon(parsed_data)
        
        return {
            'operation_type': parsed_data['operation_type'],
            'tokens_used': parsed_data['tokens_used'],
            'cost_eur': parsed_data['cost_eur'],
            'timestamp': parsed_data['timestamp']
        }
    
    def parse_claude_operation(self, operation_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse Claude Code operation data into standardized format"""
        operation_type = operation_data.get('tool', 'unknown')
        working_dir = os.getcwd()
        files_touched = []
        tokens_used = 0
        cost_eur = 0.0
        context = ""
        
        # Parse based on operation type with optimized logic
        if operation_type == 'Read':
            files_touched = [operation_data.get('file_path', '')]
            tokens_used = self.estimate_tokens_for_read(operation_data.get('file_path', ''))
            context = "file_reading"
        elif operation_type == 'Write':
            files_touched = [operation_data.get('file_path', '')]
            content_length = len(operation_data.get('content', ''))
            tokens_used = max(content_length // 4, 10)
            context = "file_creation"
        elif operation_type == 'Edit':
            files_touched = [operation_data.get('file_path', '')]
            old_string_length = len(operation_data.get('old_string', ''))
            new_string_length = len(operation_data.get('new_string', ''))
            tokens_used = max((old_string_length + new_string_length) // 4, 5)
            context = "file_modification"
        elif operation_type == 'MultiEdit':
            files_touched = [operation_data.get('file_path', '')]
            edits = operation_data.get('edits', [])
            tokens_used = max(sum(len(edit.get('old_string', '')) + len(edit.get('new_string', '')) 
                                for edit in edits) // 4, 10)
            context = "multi_file_edit"
        elif operation_type == 'Bash':
            command = operation_data.get('command', '')
            tokens_used = max(len(command) // 4, 5)
            context = f"command_execution: {command[:50]}"
        elif operation_type == 'TodoWrite':
            todos = operation_data.get('todos', [])
            tokens_used = max(sum(len(todo.get('content', '')) for todo in todos) // 4, 5)
            context = f"task_management: {len(todos)} todos"
        
        # Calculate cost (€0.000015 per 1000 input tokens)
        cost_eur = (tokens_used / 1000) * 0.000015
        
        return {
            'operation_type': operation_type,
            'working_dir': working_dir,
            'files_touched': files_touched,
            'tokens_used': tokens_used,
            'cost_eur': cost_eur,
            'context': context,
            'timestamp': datetime.now().isoformat()
        }
    
    def estimate_tokens_for_read(self, file_path: str) -> int:
        """Estimate tokens used for reading a file"""
        try:
            if file_path and Path(file_path).exists():
                file_size = Path(file_path).stat().st_size
                return max(file_size // 4, 10)
        except:
            pass
        return 50
    
    def log_activity_to_daemon(self, activity_data: Dict[str, Any]):
        """Send activity data to automation daemon"""
        try:
            # Import daemon from the same directory
            sys.path.append(str(self.project_dir / 'scripts' / 'automation'))
            from project_automation_daemon import ProjectAutomationDaemon
            
            daemon = ProjectAutomationDaemon()
            daemon.log_activity(
                operation_type=activity_data['operation_type'],
                working_dir=activity_data['working_dir'],
                files=activity_data['files_touched'],
                tokens_used=activity_data['tokens_used'],
                cost_eur=activity_data['cost_eur'],
                context=activity_data['context']
            )
        except Exception as e:
            self.log_to_file(activity_data, error=str(e))
    
    def log_to_file(self, activity_data: Dict[str, Any], error: str = None):
        """Fallback logging to file"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'activity': activity_data,
            'error': error
        }
        
        with open(self.log_file, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')
    
    def get_recent_activities(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent activities from log file"""
        activities = []
        
        try:
            if self.log_file.exists():
                with open(self.log_file, 'r') as f:
                    lines = f.readlines()
                    for line in lines[-limit:]:
                        try:
                            activity = json.loads(line.strip())
                            activities.append(activity)
                        except:
                            continue
        except Exception:
            pass
        
        return activities
    
    def process_single_operation(self, operation: Dict[str, Any]) -> Any:
        """Process single operation for mixed operation handling"""
        return self.process_hook_operation(operation)
    
    def is_healthy(self) -> bool:
        """Check if hook manager is healthy"""
        try:
            # Check if log file is writable
            test_entry = {'test': True, 'timestamp': datetime.now().isoformat()}
            with open(self.log_file, 'a') as f:
                f.write(json.dumps(test_entry) + '\n')
            return True
        except:
            return False

class StatusManager:
    """Manages Claude Code status integration and project maturity analysis"""
    
    def __init__(self, project_dir: Path, claude_dir: Path):
        self.project_dir = project_dir
        self.claude_dir = claude_dir
        self.cost_tracker = project_dir / 'scripts' / 'cost-tracking' / 'claude-cost-tracker.py'
        self.automation_db = claude_dir / 'project_automation.db'
        
        # Project maturity framework
        self.maturity_levels = {
            'prototype': {'min_files': 1, 'min_commits': 0, 'min_features': 1},
            'alpha': {'min_files': 5, 'min_commits': 5, 'min_features': 3},
            'beta': {'min_files': 10, 'min_commits': 15, 'min_features': 5},
            'stable': {'min_files': 15, 'min_commits': 30, 'min_features': 8},
            'mature': {'min_files': 25, 'min_commits': 50, 'min_features': 12}
        }
    
    def execute_parallel_status(self, operations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Execute multiple status operations in parallel"""
        results = {
            'successful': [],
            'failed': [],
            'total_processed': len(operations)
        }
        
        for op in operations:
            try:
                result = self.process_status_operation(op)
                results['successful'].append(result)
            except Exception as e:
                results['failed'].append({
                    'operation': op,
                    'error': str(e)
                })
        
        return results
    
    def process_status_operation(self, operation: Dict[str, Any]) -> Dict[str, Any]:
        """Process individual status operation"""
        op_type = operation.get('subtype', 'general_status')
        
        if op_type == 'claude_pro_status':
            return self.get_claude_pro_status()
        elif op_type == 'project_maturity':
            return self.analyze_project_maturity(self.project_dir)
        elif op_type == 'comprehensive_status':
            return self.get_comprehensive_project_status()
        else:
            return self.get_basic_status()
    
    def get_claude_pro_status(self) -> Dict[str, Any]:
        """Get current Claude Pro token usage and limits"""
        try:
            result = subprocess.run([
                'python3', str(self.cost_tracker), '--action', 'summary'
            ], capture_output=True, text=True, cwd=str(self.project_dir))
            
            if result.returncode == 0:
                output = result.stdout
                
                status = {
                    'timestamp': datetime.now().isoformat(),
                    'session_cost_eur': 0.0,
                    'billing_period_eur': 0.0,
                    'daily_usage_tokens': 0,
                    'daily_limit_tokens': 2000000,
                    'monthly_usage_tokens': 0,
                    'monthly_limit_tokens': 60000000,
                    'subscription_tier': 'PRO',
                    'usage_status': 'included'
                }
                
                # Extract values using regex (optimized patterns)
                patterns = {
                    'session_cost_eur': r'Session Cost: ([\d.]+)€',
                    'billing_period_eur': r'Billing Period.*?: ([\d.]+)€',
                    'daily_usage': r'Daily Usage: ([\d,]+) / ([\d,]+) tokens',
                    'monthly_usage': r'Monthly Usage: ([\d,]+) / ([\d,]+) tokens'
                }
                
                for key, pattern in patterns.items():
                    match = re.search(pattern, output)
                    if match:
                        if key == 'session_cost_eur':
                            status['session_cost_eur'] = float(match.group(1))
                        elif key == 'billing_period_eur':
                            status['billing_period_eur'] = float(match.group(1))
                        elif key == 'daily_usage':
                            status['daily_usage_tokens'] = int(match.group(1).replace(',', ''))
                            status['daily_limit_tokens'] = int(match.group(2).replace(',', ''))
                        elif key == 'monthly_usage':
                            status['monthly_usage_tokens'] = int(match.group(1).replace(',', ''))
                            status['monthly_limit_tokens'] = int(match.group(2).replace(',', ''))
                
                # Calculate percentages and timing
                status['daily_usage_percent'] = (status['daily_usage_tokens'] / status['daily_limit_tokens']) * 100
                status['monthly_usage_percent'] = (status['monthly_usage_tokens'] / status['monthly_limit_tokens']) * 100
                
                # Time to reset (2am Claude Pro reset)
                now = datetime.now()
                if now.hour < 2:
                    tomorrow_2am = now.replace(hour=2, minute=0, second=0, microsecond=0)
                else:
                    tomorrow_2am = now.replace(hour=2, minute=0, second=0, microsecond=0) + timedelta(days=1)
                
                time_to_reset = tomorrow_2am - now
                status['hours_to_reset'] = time_to_reset.total_seconds() / 3600
                
                return status
                
        except Exception as e:
            print(f"Error getting Claude Pro status: {e}")
            
        return None
    
    def analyze_project_maturity(self, project_path: Path) -> Dict[str, Any]:
        """Analyze project maturity based on multiple factors"""
        if not project_path.exists():
            return None
            
        analysis = {
            'project_path': str(project_path),
            'project_name': project_path.name,
            'analysis_timestamp': datetime.now().isoformat(),
            'maturity_level': 'prototype',
            'version': '0.1.0',
            'confidence': 0.0
        }
        
        # Parallel analysis of different aspects
        analysis_tasks = [
            ('file_count', self.count_project_files, project_path),
            ('git_stats', self.analyze_git_history, project_path),
            ('features', self.analyze_features, project_path),
            ('documentation', self.analyze_documentation, project_path),
            ('tests', self.analyze_test_coverage, project_path)
        ]
        
        # Execute all analysis tasks
        for task_name, task_func, task_arg in analysis_tasks:
            try:
                analysis[task_name] = task_func(task_arg)
            except Exception as e:
                analysis[task_name] = {'error': str(e)}
        
        # Calculate maturity level and version
        maturity_level, confidence = self.calculate_maturity_level(analysis)
        analysis['maturity_level'] = maturity_level
        analysis['confidence'] = confidence
        analysis['version'] = self.detect_or_suggest_version(project_path, maturity_level)
        
        return analysis
    
    def count_project_files(self, project_path: Path) -> Dict[str, int]:
        """Count different types of files in project"""
        counts = {
            'total_files': 0, 'source_files': 0, 'config_files': 0,
            'doc_files': 0, 'test_files': 0, 'script_files': 0
        }
        
        extensions = {
            'source': {'.py', '.js', '.ts', '.java', '.cpp', '.c', '.go', '.rs', '.php'},
            'config': {'.json', '.yaml', '.yml', '.toml', '.ini', '.cfg'},
            'doc': {'.md', '.rst', '.txt', '.doc', '.pdf'},
            'script': {'.sh', '.bash', '.zsh', '.ps1', '.bat'}
        }
        
        test_patterns = {'test_', '_test.', 'tests/', 'spec_', '_spec.'}
        
        try:
            for file_path in project_path.rglob('*'):
                if file_path.is_file():
                    counts['total_files'] += 1
                    
                    file_ext = file_path.suffix.lower()
                    file_name = file_path.name.lower()
                    
                    # Categorize files
                    for category, exts in extensions.items():
                        if file_ext in exts:
                            counts[f'{category}_files'] += 1
                            break
                    
                    # Check for test files
                    if any(pattern in file_name or pattern in str(file_path).lower() 
                          for pattern in test_patterns):
                        counts['test_files'] += 1
                        
        except Exception as e:
            print(f"Error counting files: {e}")
            
        return counts
    
    def analyze_git_history(self, project_path: Path) -> Dict[str, Any]:
        """Analyze git history for maturity indicators"""
        git_stats = {
            'is_git_repo': False, 'commit_count': 0, 'contributor_count': 0,
            'branch_count': 0, 'tag_count': 0, 'last_commit_date': None, 'project_age_days': 0
        }
        
        try:
            git_dir = project_path / '.git'
            if git_dir.exists():
                git_stats['is_git_repo'] = True
                
                # Parallel git command execution
                git_commands = [
                    ('commit_count', ['git', 'rev-list', '--count', 'HEAD']),
                    ('contributors', ['git', 'shortlog', '-sn']),
                    ('branches', ['git', 'branch', '-a']),
                    ('tags', ['git', 'tag']),
                    ('last_commit', ['git', 'log', '-1', '--format=%ci']),
                    ('first_commit', ['git', 'log', '--reverse', '--format=%ci', '-1'])
                ]
                
                for cmd_name, cmd in git_commands:
                    try:
                        result = subprocess.run(cmd, cwd=project_path, capture_output=True, text=True)
                        if result.returncode == 0:
                            if cmd_name == 'commit_count':
                                git_stats['commit_count'] = int(result.stdout.strip())
                            elif cmd_name == 'contributors':
                                git_stats['contributor_count'] = len(result.stdout.strip().split('\n'))
                            elif cmd_name == 'branches':
                                git_stats['branch_count'] = len([line for line in result.stdout.split('\n') if line.strip()])
                            elif cmd_name == 'tags':
                                git_stats['tag_count'] = len([line for line in result.stdout.split('\n') if line.strip()])
                            elif cmd_name == 'last_commit':
                                git_stats['last_commit_date'] = result.stdout.strip()
                            elif cmd_name == 'first_commit':
                                first_commit = result.stdout.strip()
                                if first_commit:
                                    first_date = datetime.fromisoformat(first_commit.replace(' +', '+'))
                                    git_stats['project_age_days'] = (datetime.now() - first_date).days
                    except:
                        continue
                        
        except Exception as e:
            print(f"Error analyzing git history: {e}")
            
        return git_stats
    
    def analyze_features(self, project_path: Path) -> Dict[str, Any]:
        """Analyze implemented features and functionality"""
        features = {
            'estimated_features': 0, 'feature_categories': [], 'complexity_score': 0.0,
            'has_api': False, 'has_ui': False, 'has_database': False,
            'has_tests': False, 'has_automation': False
        }
        
        try:
            feature_indicators = {
                'api': ['api/', 'routes/', 'endpoints/', 'server.', 'app.py', 'main.py'],
                'ui': ['components/', 'views/', 'pages/', 'templates/', 'static/', 'public/'],
                'database': ['models/', 'schema/', 'migrations/', '.db', 'database.'],
                'automation': ['scripts/', 'automation/', 'deploy/', 'ci/', '.github/'],
                'monitoring': ['dashboard/', 'metrics/', 'monitoring/', 'logs/'],
                'testing': ['tests/', 'test_', '_test.', 'spec_'],
                'documentation': ['docs/', 'README', 'wiki/'],
                'configuration': ['config/', 'settings/', '.env', 'docker'],
                'security': ['auth/', 'security/', 'permissions/', 'oauth'],
                'performance': ['cache/', 'optimization/', 'performance/']
            }
            
            detected_categories = []
            all_files = list(project_path.rglob('*'))
            
            for category, patterns in feature_indicators.items():
                category_score = sum(1 for f in all_files for pattern in patterns 
                                   if pattern.lower() in str(f).lower())
                
                if category_score > 0:
                    detected_categories.append(category)
                    
                    # Set specific flags
                    if category == 'api':
                        features['has_api'] = True
                    elif category == 'ui':
                        features['has_ui'] = True
                    elif category == 'database':
                        features['has_database'] = True
                    elif category == 'testing':
                        features['has_tests'] = True
                    elif category == 'automation':
                        features['has_automation'] = True
            
            features['feature_categories'] = detected_categories
            features['estimated_features'] = len(detected_categories)
            
            # Calculate complexity score
            complexity_factors = [
                len(detected_categories) * 0.2,
                min(len(all_files) / 50, 1.0) * 0.3,
                (1.0 if features['has_api'] else 0.0) * 0.2,
                (1.0 if features['has_database'] else 0.0) * 0.15,
                (1.0 if features['has_tests'] else 0.0) * 0.15
            ]
            
            features['complexity_score'] = sum(complexity_factors)
            
        except Exception as e:
            print(f"Error analyzing features: {e}")
            
        return features
    
    def analyze_documentation(self, project_path: Path) -> Dict[str, Any]:
        """Analyze documentation quality and coverage"""
        doc_analysis = {
            'has_readme': False, 'readme_quality_score': 0.0, 'doc_file_count': 0,
            'code_comment_ratio': 0.0, 'has_api_docs': False, 'has_user_guide': False
        }
        
        try:
            # Check for README
            readme_files = list(project_path.glob('README*'))
            if readme_files:
                doc_analysis['has_readme'] = True
                readme_path = readme_files[0]
                
                with open(readme_path, 'r', encoding='utf-8', errors='ignore') as f:
                    readme_content = f.read()
                    
                quality_indicators = [
                    'installation' in readme_content.lower(),
                    'usage' in readme_content.lower(),
                    'example' in readme_content.lower(),
                    'api' in readme_content.lower(),
                    'license' in readme_content.lower(),
                    len(readme_content) > 500,
                    readme_content.count('#') > 3
                ]
                
                doc_analysis['readme_quality_score'] = sum(quality_indicators) / len(quality_indicators)
            
            # Count documentation files
            doc_patterns = ['*.md', '*.rst', '*.txt']
            doc_files = []
            for pattern in doc_patterns:
                doc_files.extend(project_path.rglob(pattern))
            
            doc_analysis['doc_file_count'] = len(doc_files)
            
            # Check for specific documentation types
            all_files_lower = [str(f).lower() for f in doc_files]
            doc_analysis['has_api_docs'] = any('api' in f for f in all_files_lower)
            doc_analysis['has_user_guide'] = any(guide in f for f in all_files_lower 
                                               for guide in ['guide', 'tutorial', 'manual'])
            
        except Exception as e:
            print(f"Error analyzing documentation: {e}")
            
        return doc_analysis
    
    def analyze_test_coverage(self, project_path: Path) -> Dict[str, Any]:
        """Analyze test coverage and quality"""
        test_analysis = {
            'test_file_count': 0, 'has_unit_tests': False, 'has_integration_tests': False,
            'test_to_source_ratio': 0.0, 'test_quality_score': 0.0
        }
        
        try:
            # Find test files
            test_patterns = ['test_*.py', '*_test.py', 'tests/**/*.py', 'spec/**/*']
            test_files = []
            for pattern in test_patterns:
                test_files.extend(project_path.rglob(pattern))
            
            test_analysis['test_file_count'] = len(test_files)
            
            if test_files:
                # Sample test file contents
                test_contents = []
                for test_file in test_files[:10]:
                    try:
                        with open(test_file, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read().lower()
                            test_contents.append(content)
                    except:
                        continue
                
                all_test_content = ' '.join(test_contents)
                
                # Detect test types
                test_analysis['has_unit_tests'] = 'unittest' in all_test_content or 'pytest' in all_test_content
                test_analysis['has_integration_tests'] = 'integration' in all_test_content
                
                # Calculate test to source ratio
                source_files = [f for f in project_path.rglob('*.py') if 'test' not in str(f).lower()]
                
                if source_files:
                    test_analysis['test_to_source_ratio'] = len(test_files) / len(source_files)
                
                # Test quality indicators
                quality_indicators = [
                    test_analysis['has_unit_tests'],
                    test_analysis['has_integration_tests'],
                    test_analysis['test_to_source_ratio'] > 0.3,
                    len(test_files) > 5,
                    'mock' in all_test_content or 'patch' in all_test_content
                ]
                
                test_analysis['test_quality_score'] = sum(quality_indicators) / len(quality_indicators)
            
        except Exception as e:
            print(f"Error analyzing test coverage: {e}")
            
        return test_analysis
    
    def calculate_maturity_level(self, analysis: Dict[str, Any]) -> tuple:
        """Calculate overall project maturity level and confidence"""
        scores = {}
        
        for level, requirements in self.maturity_levels.items():
            score = 0.0
            total_checks = 0
            
            # File count check
            if analysis.get('file_count', {}).get('total_files', 0) >= requirements['min_files']:
                score += 1.0
            total_checks += 1
            
            # Commit count check
            if analysis.get('git_stats', {}).get('commit_count', 0) >= requirements['min_commits']:
                score += 1.0
            total_checks += 1
            
            # Feature count check
            if analysis.get('features', {}).get('estimated_features', 0) >= requirements['min_features']:
                score += 1.0
            total_checks += 1
            
            # Quality factors
            quality_factors = [
                analysis.get('documentation', {}).get('has_readme', False),
                analysis.get('tests', {}).get('has_unit_tests', False),
                analysis.get('tests', {}).get('test_quality_score', 0.0) > 0.5,
                analysis.get('documentation', {}).get('readme_quality_score', 0.0) > 0.6,
                analysis.get('git_stats', {}).get('is_git_repo', False)
            ]
            
            quality_score = sum(quality_factors) / len(quality_factors)
            score += quality_score
            total_checks += 1
            
            scores[level] = score / total_checks
        
        best_level = max(scores, key=scores.get)
        confidence = scores[best_level]
        
        return best_level, confidence
    
    def detect_or_suggest_version(self, project_path: Path, maturity_level: str) -> str:
        """Detect current version or suggest one based on maturity"""
        version_files = [
            project_path / 'package.json',
            project_path / 'pyproject.toml',
            project_path / 'setup.py',
            project_path / 'VERSION'
        ]
        
        version_patterns = {
            'semantic': r'(\d+)\.(\d+)\.(\d+)',
            'simple': r'v?(\d+)\.(\d+)',
            'date': r'(\d{4})\.(\d{2})\.(\d{2})'
        }
        
        # Try to find existing version
        for version_file in version_files:
            if version_file.exists():
                try:
                    content = version_file.read_text()
                    for pattern_name, pattern in version_patterns.items():
                        matches = re.findall(pattern, content)
                        if matches:
                            if pattern_name == 'semantic':
                                return f"{matches[0][0]}.{matches[0][1]}.{matches[0][2]}"
                            elif pattern_name == 'simple':
                                return f"{matches[0][0]}.{matches[0][1]}.0"
                except Exception:
                    continue
        
        # Suggest version based on maturity
        version_suggestions = {
            'prototype': '0.1.0', 'alpha': '0.5.0', 'beta': '0.9.0',
            'stable': '1.0.0', 'mature': '2.0.0'
        }
        
        return version_suggestions.get(maturity_level, '0.1.0')
    
    def get_comprehensive_project_status(self) -> Dict[str, Any]:
        """Get comprehensive project status"""
        return {
            'claude_pro_status': self.get_claude_pro_status(),
            'project_maturity': self.analyze_project_maturity(self.project_dir),
            'timestamp': datetime.now().isoformat()
        }
    
    def get_basic_status(self) -> Dict[str, Any]:
        """Get basic status information"""
        return {
            'timestamp': datetime.now().isoformat(),
            'project_name': self.project_dir.name,
            'status': 'operational'
        }
    
    def format_comprehensive_message(self, status: Dict[str, Any]) -> str:
        """Format comprehensive status message"""
        claude_status = status.get('claude_pro_status')
        project_maturity = status.get('project_maturity')
        
        msg = f"🤖 **Claude Integration Status** - {datetime.now().strftime('%H:%M')}\n"
        
        if claude_status:
            daily_percent = claude_status['daily_usage_percent']
            status_emoji = "🟢" if daily_percent < 50 else "🟡" if daily_percent < 80 else "🔴"
            capacity = "High" if daily_percent < 50 else "Moderate" if daily_percent < 80 else "Limited"
            
            msg += f"{status_emoji} **Capacity:** {capacity} ({daily_percent:.0f}% used)\n"
            msg += f"⏰ **Reset in:** {claude_status['hours_to_reset']:.1f}h | 💰 **Cost:** €{claude_status['billing_period_eur']:.2f}\n"
        
        if project_maturity:
            maturity_emoji = {'prototype': '🧪', 'alpha': '🔬', 'beta': '🧪', 'stable': '✅', 'mature': '🏆'}
            emoji = maturity_emoji.get(project_maturity['maturity_level'], '📦')
            msg += f"🎯 **Project:** {project_maturity['project_name']} {emoji} {project_maturity['maturity_level']} v{project_maturity['version']}\n"
        
        return msg
    
    def generate_development_suggestions(self, project_maturity: Dict) -> List[str]:
        """Generate development suggestions based on project analysis"""
        suggestions = []
        
        if project_maturity['maturity_level'] == 'prototype':
            suggestions.extend([
                "🎯 Add more core features to advance to alpha stage",
                "📝 Improve README with installation and usage instructions"
            ])
        elif project_maturity['maturity_level'] == 'alpha':
            suggestions.extend([
                "🧪 Add unit tests to improve code quality",
                "🔧 Consider adding CI/CD pipeline"
            ])
        
        if not project_maturity.get('has_tests', False):
            suggestions.append("🧪 Implement testing framework for better reliability")
        
        if project_maturity.get('readme_quality_score', 0) < 0.5:
            suggestions.append("📝 Enhance README with examples and better structure")
        
        return suggestions
    
    def process_single_operation(self, operation: Dict[str, Any]) -> Any:
        """Process single operation for mixed operation handling"""
        return self.process_status_operation(operation)
    
    def is_healthy(self) -> bool:
        """Check if status manager is healthy"""
        try:
            # Test cost tracker availability
            result = subprocess.run([
                'python3', str(self.cost_tracker), '--action', 'status'
            ], capture_output=True, text=True, cwd=str(self.project_dir), timeout=5)
            return result.returncode == 0
        except:
            return False

class ReminderManager:
    """Manages Claude Code reminder system and notifications"""
    
    def __init__(self, project_dir: Path, claude_dir: Path):
        self.project_dir = project_dir
        self.claude_dir = claude_dir
        self.reminder_config_file = claude_dir / 'reminder_config.json'
        self.last_reminder_file = claude_dir / 'last_reminder.json'
        
        # Load configuration
        self.config = self.load_reminder_config()
        
        # Initialize status integration
        self.status_manager = None  # Will be set by coordinator to avoid circular import
    
    def set_status_manager(self, status_manager):
        """Set status manager reference"""
        self.status_manager = status_manager
    
    def load_reminder_config(self) -> Dict[str, Any]:
        """Load reminder configuration with defaults"""
        default_config = {
            "enabled": True,
            "reminder_intervals": {
                "status_update": 3600,
                "token_warning": 1800,
                "project_suggestion": 7200,
                "break_reminder": 5400
            },
            "token_thresholds": {
                "yellow_warning": 60,
                "red_warning": 80,
                "critical_warning": 90
            },
            "reminder_types": {
                "status_messages": True,
                "usage_warnings": True,
                "development_suggestions": True,
                "break_reminders": True,
                "project_opportunities": True
            },
            "display_preferences": {
                "show_emoji": True,
                "compact_mode": False,
                "show_suggestions": True,
                "max_message_length": 1000
            }
        }
        
        if self.reminder_config_file.exists():
            try:
                with open(self.reminder_config_file, 'r') as f:
                    user_config = json.load(f)
                    default_config.update(user_config)
            except Exception:
                pass
                
        return default_config
    
    def execute_parallel_reminders(self, operations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Execute multiple reminder operations in parallel"""
        results = {
            'successful': [],
            'failed': [],
            'total_processed': len(operations),
            'active_reminders': []
        }
        
        for op in operations:
            try:
                result = self.process_reminder_operation(op)
                results['successful'].append(result)
                if result.get('reminder_message'):
                    results['active_reminders'].append(result['reminder_message'])
            except Exception as e:
                results['failed'].append({
                    'operation': op,
                    'error': str(e)
                })
        
        return results
    
    def process_reminder_operation(self, operation: Dict[str, Any]) -> Dict[str, Any]:
        """Process individual reminder operation"""
        op_type = operation.get('subtype', 'check_reminders')
        
        if op_type == 'status_reminder':
            reminder = self.generate_status_reminder()
        elif op_type == 'token_warning':
            reminder = self.generate_token_warning()
        elif op_type == 'project_suggestion':
            reminder = self.generate_project_suggestion()
        elif op_type == 'break_reminder':
            reminder = self.generate_break_reminder()
        else:
            reminder = self.check_all_reminders()
        
        return {
            'operation_type': op_type,
            'reminder_message': reminder,
            'timestamp': datetime.now().isoformat()
        }
    
    def check_all_reminders(self) -> List[str]:
        """Check all reminder types and return any that should be shown"""
        if not self.status_manager:
            return []
        
        reminders = []
        
        # Check each reminder type
        reminder_funcs = [
            self.generate_status_reminder,
            self.generate_token_warning,
            self.generate_project_suggestion,
            self.generate_break_reminder
        ]
        
        for reminder_func in reminder_funcs:
            try:
                reminder = reminder_func()
                if reminder:
                    reminders.append(reminder)
            except Exception:
                continue
        
        return reminders
    
    def generate_status_reminder(self) -> Optional[str]:
        """Generate status update reminder"""
        if not self.should_show_reminder('status_update') or not self.status_manager:
            return None
            
        claude_status = self.status_manager.get_claude_pro_status()
        project_maturity = self.status_manager.analyze_project_maturity(self.project_dir)
        
        if not claude_status:
            return None
            
        now = datetime.now()
        daily_percent = claude_status['daily_usage_percent']
        hours_to_reset = claude_status['hours_to_reset']
        
        status_emoji = "🟢" if daily_percent < 50 else "🟡" if daily_percent < 80 else "🔴"
        capacity = "High" if daily_percent < 50 else "Moderate" if daily_percent < 80 else "Limited"
        
        message = f"""📊 **Claude Status Update** ({now.strftime('%H:%M')})
{status_emoji} **Capacity:** {capacity} ({daily_percent:.0f}% used)
⏰ **Reset in:** {hours_to_reset:.1f}h | 💰 **Cost:** €{claude_status['billing_period_eur']:.2f}"""
        
        if project_maturity:
            maturity_emoji = {'prototype': '🧪', 'alpha': '🔬', 'beta': '🧪', 'stable': '✅', 'mature': '🏆'}
            emoji = maturity_emoji.get(project_maturity['maturity_level'], '📦')
            message += f"\n🎯 **Project:** {project_maturity['project_name']} {emoji} {project_maturity['maturity_level']} v{project_maturity['version']}"
        
        self.update_last_reminder_time('status_update')
        return message.strip()
    
    def generate_token_warning(self) -> Optional[str]:
        """Generate token usage warning if needed"""
        if not self.should_show_reminder('token_warning') or not self.status_manager:
            return None
            
        claude_status = self.status_manager.get_claude_pro_status()
        if not claude_status:
            return None
            
        daily_percent = claude_status['daily_usage_percent']
        thresholds = self.config['token_thresholds']
        
        warning_level = None
        if daily_percent >= thresholds['critical_warning']:
            warning_level = "critical"
        elif daily_percent >= thresholds['red_warning']:
            warning_level = "high"
        elif daily_percent >= thresholds['yellow_warning']:
            warning_level = "moderate"
        
        if not warning_level:
            return None
            
        warnings = {
            "moderate": {
                "emoji": "🟡", "title": "Moderate Usage Alert",
                "message": "Consider batching operations to optimize token usage.",
                "suggestions": ["Use MultiEdit for multiple file changes", "Batch related operations together"]
            },
            "high": {
                "emoji": "🔴", "title": "High Usage Warning",
                "message": "Approaching daily limits. Switch to lighter operations.",
                "suggestions": ["Focus on planning and documentation", "Use simple edits over complex operations"]
            },
            "critical": {
                "emoji": "🚨", "title": "Critical Usage Alert",
                "message": "Very close to daily limit! Consider pausing until reset.",
                "suggestions": ["Wait for 2am reset", "Use read-only operations only"]
            }
        }
        
        warning = warnings[warning_level]
        hours_to_reset = claude_status['hours_to_reset']
        
        message = f"""{warning['emoji']} **{warning['title']}**
📊 **Usage:** {daily_percent:.0f}% of daily limit
⏰ **Reset in:** {hours_to_reset:.1f} hours
💡 **Recommendation:** {warning['message']}"""
        
        if self.config['display_preferences']['show_suggestions']:
            message += "\n**Suggestions:**\n"
            for suggestion in warning['suggestions']:
                message += f"- {suggestion}\n"
        
        self.update_last_reminder_time('token_warning')
        return message.strip()
    
    def generate_project_suggestion(self) -> Optional[str]:
        """Generate project improvement suggestions"""
        if not self.should_show_reminder('project_suggestion') or not self.status_manager:
            return None
            
        project_maturity = self.status_manager.analyze_project_maturity(self.project_dir)
        if not project_maturity:
            return None
            
        suggestions = self.status_manager.generate_development_suggestions(project_maturity)
        if not suggestions:
            return None
            
        maturity_level = project_maturity['maturity_level']
        confidence = project_maturity['confidence']
        
        message = f"""💡 **Development Suggestions**
🎯 **Project:** {project_maturity['project_name']} ({maturity_level} - {confidence:.0%} confidence)

**Next Steps:**"""
        
        for i, suggestion in enumerate(suggestions[:3], 1):
            message += f"\n{i}. {suggestion}"
        
        self.update_last_reminder_time('project_suggestion')
        return message.strip()
    
    def generate_break_reminder(self) -> Optional[str]:
        """Generate break reminder for healthy development habits"""
        if not self.should_show_reminder('break_reminder'):
            return None
            
        now = datetime.now()
        
        message = f"""☕ **Take a Break Reminder**
🕐 **Time:** {now.strftime('%H:%M')} - You've been coding for a while!

**Healthy Development Tips:**
- 👀 Rest your eyes (20-20-20 rule)
- 🚶 Take a short walk
- 💧 Stay hydrated
- 🧠 Let your mind process what you've built

**Ready to continue with fresh energy!** 🚀"""
        
        self.update_last_reminder_time('break_reminder')
        return message.strip()
    
    def should_show_reminder(self, reminder_type: str) -> bool:
        """Check if it's time to show a specific reminder type"""
        if not self.config.get('enabled', True):
            return False
            
        if not self.config['reminder_types'].get(f"{reminder_type}_reminders", True):
            return False
            
        last_times = self.get_last_reminder_times()
        last_time_str = last_times.get(reminder_type, "2025-01-01T00:00:00")
        
        try:
            last_time = datetime.fromisoformat(last_time_str)
            interval = self.config['reminder_intervals'].get(reminder_type, 3600)
            return (datetime.now() - last_time).total_seconds() >= interval
        except Exception:
            return True
    
    def get_last_reminder_times(self) -> Dict[str, str]:
        """Get timestamps of last reminders"""
        default_times = {
            "status_update": "2025-01-01T00:00:00",
            "token_warning": "2025-01-01T00:00:00",
            "project_suggestion": "2025-01-01T00:00:00",
            "break_reminder": "2025-01-01T00:00:00"
        }
        
        if self.last_reminder_file.exists():
            try:
                with open(self.last_reminder_file, 'r') as f:
                    return json.load(f)
            except Exception:
                pass
                
        return default_times
    
    def update_last_reminder_time(self, reminder_type: str):
        """Update the last reminder time for a specific type"""
        last_times = self.get_last_reminder_times()
        last_times[reminder_type] = datetime.now().isoformat()
        
        try:
            os.makedirs(self.last_reminder_file.parent, exist_ok=True)
            with open(self.last_reminder_file, 'w') as f:
                json.dump(last_times, f, indent=2)
        except Exception:
            pass
    
    def process_single_operation(self, operation: Dict[str, Any]) -> Any:
        """Process single operation for mixed operation handling"""
        return self.process_reminder_operation(operation)
    
    def is_healthy(self) -> bool:
        """Check if reminder manager is healthy"""
        try:
            # Test configuration file access
            test_config = self.load_reminder_config()
            return isinstance(test_config, dict) and test_config.get('enabled') is not None
        except:
            return False

# Factory functions for backwards compatibility
def create_hook_integration():
    """Factory function for hook integration (backwards compatibility)"""
    coordinator = ClaudeIntegrationCoordinator()
    return coordinator.hook_manager

def create_status_integration():
    """Factory function for status integration (backwards compatibility)"""
    coordinator = ClaudeIntegrationCoordinator()
    return coordinator.status_manager

def create_reminder_system():
    """Factory function for reminder system (backwards compatibility)"""
    coordinator = ClaudeIntegrationCoordinator()
    return coordinator.reminder_manager

# Command line interface functions
def hook_pre_operation(operation_type: str, **kwargs):
    """Called before Claude Code operation (backwards compatibility)"""
    coordinator = ClaudeIntegrationCoordinator()
    operation_data = {'tool': operation_type, **kwargs}
    activity = coordinator.hook_manager.parse_claude_operation(operation_data)
    coordinator.hook_manager.log_activity_to_daemon(activity)

def display_status_in_terminal():
    """Display status message in terminal"""
    coordinator = ClaudeIntegrationCoordinator()
    status = coordinator.get_comprehensive_status()
    message = coordinator.status_manager.format_comprehensive_message(status)
    
    if message:
        print("\n" + "="*60)
        print(message)
        print("="*60 + "\n")
    else:
        print("Status information not available.")

def main():
    """Main entry point for command line usage"""
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "status":
            display_status_in_terminal()
        elif command == "test":
            # Test parallel integration
            coordinator = ClaudeIntegrationCoordinator()
            test_operations = [
                {'type': 'status', 'subtype': 'claude_pro_status'},
                {'type': 'reminder', 'subtype': 'check_reminders'},
                {'type': 'hook', 'data': {'tool': 'Read', 'file_path': '/test/file.py'}}
            ]
            result = coordinator.execute_parallel_integration(test_operations)
            print(json.dumps(result, indent=2))
        elif command == "parallel":
            # Demonstrate parallel execution
            coordinator = ClaudeIntegrationCoordinator()
            operations = [
                {'type': 'status', 'subtype': 'comprehensive_status'},
                {'type': 'reminder', 'subtype': 'status_reminder'},
                {'type': 'hook', 'data': {'tool': 'Write', 'file_path': '/test/new.py', 'content': 'test'}}
            ]
            start_time = datetime.now()
            result = coordinator.execute_parallel_integration(operations)
            end_time = datetime.now()
            
            print(f"Parallel execution completed in {(end_time - start_time).total_seconds():.3f}s")
            print(f"Operations processed: {result['operations_count']}")
            print(f"Parallel efficiency: {result['performance']['parallel_efficiency']:.2%}")
            
        else:
            print("Usage: python3 claude_integration_coordinator.py [status|test|parallel]")
    else:
        display_status_in_terminal()

if __name__ == "__main__":
    main()