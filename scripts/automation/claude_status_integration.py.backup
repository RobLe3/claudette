#!/usr/bin/env python3
"""
Claude Code Status Integration System
Provides regular status messages about token usage, project maturity, and development opportunities
"""

import json
import sqlite3
import os
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
import subprocess

class ClaudeStatusIntegration:
    """Integrated status system for Claude Code with project maturity tracking"""
    
    def __init__(self):
        self.claude_dir = Path.home() / '.claude'
        self.project_dir = Path('/Users/roble/Documents/Python/claude_flow')
        self.cost_tracker = self.project_dir / 'scripts' / 'cost-tracking' / 'claude-cost-tracker.py'
        self.automation_db = Path.home() / '.claude' / 'project_automation.db'
        
        # Project maturity framework
        self.maturity_levels = {
            'prototype': {'min_files': 1, 'min_commits': 0, 'min_features': 1, 'stability': 'experimental'},
            'alpha': {'min_files': 5, 'min_commits': 5, 'min_features': 3, 'stability': 'unstable'},
            'beta': {'min_files': 10, 'min_commits': 15, 'min_features': 5, 'stability': 'testing'},
            'stable': {'min_files': 15, 'min_commits': 30, 'min_features': 8, 'stability': 'production'},
            'mature': {'min_files': 25, 'min_commits': 50, 'min_features': 12, 'stability': 'enterprise'}
        }
        
        # Project version tracking
        self.version_patterns = {
            'semantic': r'(\d+)\.(\d+)\.(\d+)',  # 1.2.3
            'simple': r'v?(\d+)\.(\d+)',         # v1.2
            'date': r'(\d{4})\.(\d{2})\.(\d{2})'  # 2025.07.19
        }

    def get_claude_pro_status(self) -> Dict[str, Any]:
        """Get current Claude Pro token usage and limits"""
        try:
            # Run cost tracker to get current status
            result = subprocess.run([
                'python3', str(self.cost_tracker), '--action', 'summary'
            ], capture_output=True, text=True, cwd=str(self.project_dir))
            
            if result.returncode == 0:
                output = result.stdout
                
                # Parse output for key metrics
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
                
                # Extract values using regex
                session_cost_match = re.search(r'Session Cost: ([\d.]+)€', output)
                if session_cost_match:
                    status['session_cost_eur'] = float(session_cost_match.group(1))
                
                billing_match = re.search(r'Billing Period.*?: \$([\d.]+) \(([\d.]+)€\)', output)
                if billing_match:
                    status['billing_period_eur'] = float(billing_match.group(2))
                
                daily_usage_match = re.search(r'Daily Usage: ([\d,]+) / ([\d,]+) tokens', output)
                if daily_usage_match:
                    status['daily_usage_tokens'] = int(daily_usage_match.group(1).replace(',', ''))
                    status['daily_limit_tokens'] = int(daily_usage_match.group(2).replace(',', ''))
                
                monthly_usage_match = re.search(r'Monthly Usage: ([\d,]+) / ([\d,]+) tokens', output)
                if monthly_usage_match:
                    status['monthly_usage_tokens'] = int(monthly_usage_match.group(1).replace(',', ''))
                    status['monthly_limit_tokens'] = int(monthly_usage_match.group(2).replace(',', ''))
                
                # Calculate percentages and time remaining
                status['daily_usage_percent'] = (status['daily_usage_tokens'] / status['daily_limit_tokens']) * 100
                status['monthly_usage_percent'] = (status['monthly_usage_tokens'] / status['monthly_limit_tokens']) * 100
                
                # Estimate time to reset (Claude Pro resets at 2am)
                now = datetime.now()
                tomorrow_2am = now.replace(hour=2, minute=0, second=0, microsecond=0) + timedelta(days=1)
                if now.hour < 2:
                    tomorrow_2am = now.replace(hour=2, minute=0, second=0, microsecond=0)
                
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
            
        maturity_analysis = {
            'project_path': str(project_path),
            'project_name': project_path.name,
            'analysis_timestamp': datetime.now().isoformat(),
            'maturity_level': 'prototype',
            'version': '0.1.0',
            'confidence': 0.0
        }
        
        # File analysis
        file_count = self.count_project_files(project_path)
        maturity_analysis['file_count'] = file_count
        
        # Git analysis
        git_stats = self.analyze_git_history(project_path)
        maturity_analysis.update(git_stats)
        
        # Feature analysis
        feature_analysis = self.analyze_features(project_path)
        maturity_analysis.update(feature_analysis)
        
        # Documentation analysis
        doc_analysis = self.analyze_documentation(project_path)
        maturity_analysis.update(doc_analysis)
        
        # Test coverage analysis
        test_analysis = self.analyze_test_coverage(project_path)
        maturity_analysis.update(test_analysis)
        
        # Determine maturity level
        maturity_level, confidence = self.calculate_maturity_level(maturity_analysis)
        maturity_analysis['maturity_level'] = maturity_level
        maturity_analysis['confidence'] = confidence
        
        # Version detection/suggestion
        version = self.detect_or_suggest_version(project_path, maturity_level)
        maturity_analysis['version'] = version
        
        return maturity_analysis

    def count_project_files(self, project_path: Path) -> Dict[str, int]:
        """Count different types of files in project"""
        counts = {
            'total_files': 0,
            'source_files': 0,
            'config_files': 0,
            'doc_files': 0,
            'test_files': 0,
            'script_files': 0
        }
        
        source_extensions = {'.py', '.js', '.ts', '.java', '.cpp', '.c', '.go', '.rs', '.php'}
        config_extensions = {'.json', '.yaml', '.yml', '.toml', '.ini', '.cfg'}
        doc_extensions = {'.md', '.rst', '.txt', '.doc', '.pdf'}
        test_patterns = {'test_', '_test.', 'tests/', 'spec_', '_spec.'}
        script_extensions = {'.sh', '.bash', '.zsh', '.ps1', '.bat'}
        
        try:
            for file_path in project_path.rglob('*'):
                if file_path.is_file():
                    counts['total_files'] += 1
                    
                    file_name = file_path.name.lower()
                    file_ext = file_path.suffix.lower()
                    
                    if file_ext in source_extensions:
                        counts['source_files'] += 1
                    elif file_ext in config_extensions:
                        counts['config_files'] += 1
                    elif file_ext in doc_extensions:
                        counts['doc_files'] += 1
                    elif file_ext in script_extensions:
                        counts['script_files'] += 1
                    
                    # Check for test files
                    if any(pattern in file_name or pattern in str(file_path).lower() for pattern in test_patterns):
                        counts['test_files'] += 1
                        
        except Exception as e:
            print(f"Error counting files: {e}")
            
        return counts

    def analyze_git_history(self, project_path: Path) -> Dict[str, Any]:
        """Analyze git history for maturity indicators"""
        git_stats = {
            'is_git_repo': False,
            'commit_count': 0,
            'contributor_count': 0,
            'branch_count': 0,
            'tag_count': 0,
            'last_commit_date': None,
            'project_age_days': 0
        }
        
        try:
            git_dir = project_path / '.git'
            if git_dir.exists():
                git_stats['is_git_repo'] = True
                
                # Get commit count
                result = subprocess.run(['git', 'rev-list', '--count', 'HEAD'], 
                                      cwd=project_path, capture_output=True, text=True)
                if result.returncode == 0:
                    git_stats['commit_count'] = int(result.stdout.strip())
                
                # Get contributor count
                result = subprocess.run(['git', 'shortlog', '-sn'], 
                                      cwd=project_path, capture_output=True, text=True)
                if result.returncode == 0:
                    git_stats['contributor_count'] = len(result.stdout.strip().split('\n'))
                
                # Get branch count
                result = subprocess.run(['git', 'branch', '-a'], 
                                      cwd=project_path, capture_output=True, text=True)
                if result.returncode == 0:
                    git_stats['branch_count'] = len([line for line in result.stdout.split('\n') if line.strip()])
                
                # Get tag count
                result = subprocess.run(['git', 'tag'], 
                                      cwd=project_path, capture_output=True, text=True)
                if result.returncode == 0:
                    tags = [line for line in result.stdout.split('\n') if line.strip()]
                    git_stats['tag_count'] = len(tags)
                
                # Get last commit date
                result = subprocess.run(['git', 'log', '-1', '--format=%ci'], 
                                      cwd=project_path, capture_output=True, text=True)
                if result.returncode == 0:
                    git_stats['last_commit_date'] = result.stdout.strip()
                
                # Get first commit date to calculate age
                result = subprocess.run(['git', 'log', '--reverse', '--format=%ci', '-1'], 
                                      cwd=project_path, capture_output=True, text=True)
                if result.returncode == 0:
                    first_commit = result.stdout.strip()
                    if first_commit:
                        first_date = datetime.fromisoformat(first_commit.replace(' +', '+'))
                        git_stats['project_age_days'] = (datetime.now() - first_date).days
                        
        except Exception as e:
            print(f"Error analyzing git history: {e}")
            
        return git_stats

    def analyze_features(self, project_path: Path) -> Dict[str, Any]:
        """Analyze implemented features and functionality"""
        features = {
            'estimated_features': 0,
            'feature_categories': [],
            'complexity_score': 0.0,
            'has_api': False,
            'has_ui': False,
            'has_database': False,
            'has_tests': False,
            'has_automation': False
        }
        
        try:
            # Feature detection patterns
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
                category_score = 0
                for pattern in patterns:
                    matches = sum(1 for f in all_files if pattern.lower() in str(f).lower())
                    if matches > 0:
                        category_score += matches
                
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
                len(detected_categories) * 0.2,  # Feature diversity
                min(len(all_files) / 50, 1.0) * 0.3,  # File count
                (1.0 if features['has_api'] else 0.0) * 0.2,  # API complexity
                (1.0 if features['has_database'] else 0.0) * 0.15,  # Data complexity
                (1.0 if features['has_tests'] else 0.0) * 0.15   # Quality practices
            ]
            
            features['complexity_score'] = sum(complexity_factors)
            
        except Exception as e:
            print(f"Error analyzing features: {e}")
            
        return features

    def analyze_documentation(self, project_path: Path) -> Dict[str, Any]:
        """Analyze documentation quality and coverage"""
        doc_analysis = {
            'has_readme': False,
            'readme_quality_score': 0.0,
            'doc_file_count': 0,
            'code_comment_ratio': 0.0,
            'has_api_docs': False,
            'has_user_guide': False
        }
        
        try:
            # Check for README
            readme_files = list(project_path.glob('README*'))
            if readme_files:
                doc_analysis['has_readme'] = True
                readme_path = readme_files[0]
                
                # Analyze README quality
                with open(readme_path, 'r', encoding='utf-8', errors='ignore') as f:
                    readme_content = f.read()
                    
                quality_indicators = [
                    'installation' in readme_content.lower(),
                    'usage' in readme_content.lower(),
                    'example' in readme_content.lower(),
                    'api' in readme_content.lower(),
                    'license' in readme_content.lower(),
                    len(readme_content) > 500,  # Substantial content
                    readme_content.count('#') > 3  # Multiple sections
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
            'test_file_count': 0,
            'has_unit_tests': False,
            'has_integration_tests': False,
            'test_to_source_ratio': 0.0,
            'test_quality_score': 0.0
        }
        
        try:
            # Find test files
            test_patterns = ['test_*.py', '*_test.py', 'tests/**/*.py', 'spec/**/*']
            test_files = []
            for pattern in test_patterns:
                test_files.extend(project_path.rglob(pattern))
            
            test_analysis['test_file_count'] = len(test_files)
            
            if test_files:
                # Analyze test types
                test_contents = []
                for test_file in test_files[:10]:  # Sample first 10 test files
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
                source_files = list(project_path.rglob('*.py'))
                source_files = [f for f in source_files if 'test' not in str(f).lower()]
                
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
            if analysis.get('commit_count', 0) >= requirements['min_commits']:
                score += 1.0
            total_checks += 1
            
            # Feature count check
            if analysis.get('estimated_features', 0) >= requirements['min_features']:
                score += 1.0
            total_checks += 1
            
            # Additional quality factors
            quality_factors = [
                analysis.get('has_readme', False),
                analysis.get('has_tests', False),
                analysis.get('test_quality_score', 0.0) > 0.5,
                analysis.get('readme_quality_score', 0.0) > 0.6,
                analysis.get('is_git_repo', False)
            ]
            
            quality_score = sum(quality_factors) / len(quality_factors)
            score += quality_score
            total_checks += 1
            
            scores[level] = score / total_checks
        
        # Find best matching level
        best_level = max(scores, key=scores.get)
        confidence = scores[best_level]
        
        return best_level, confidence

    def detect_or_suggest_version(self, project_path: Path, maturity_level: str) -> str:
        """Detect current version or suggest one based on maturity"""
        
        # Try to find existing version in common files
        version_files = [
            project_path / 'package.json',
            project_path / 'pyproject.toml',
            project_path / 'setup.py',
            project_path / 'VERSION',
            project_path / 'version.txt'
        ]
        
        for version_file in version_files:
            if version_file.exists():
                try:
                    content = version_file.read_text()
                    
                    # Look for version patterns
                    for pattern_name, pattern in self.version_patterns.items():
                        matches = re.findall(pattern, content)
                        if matches:
                            if pattern_name == 'semantic':
                                return f"{matches[0][0]}.{matches[0][1]}.{matches[0][2]}"
                            elif pattern_name == 'simple':
                                return f"{matches[0][0]}.{matches[0][1]}.0"
                            elif pattern_name == 'date':
                                return f"{matches[0][0]}.{matches[0][1]}.{matches[0][2]}"
                                
                except Exception:
                    continue
        
        # Suggest version based on maturity level
        version_suggestions = {
            'prototype': '0.1.0',
            'alpha': '0.5.0',
            'beta': '0.9.0',
            'stable': '1.0.0',
            'mature': '2.0.0'
        }
        
        return version_suggestions.get(maturity_level, '0.1.0')

    def generate_status_message(self) -> str:
        """Generate comprehensive status message for Claude Code"""
        
        # Get Claude Pro status
        claude_status = self.get_claude_pro_status()
        
        # Analyze current project
        project_maturity = self.analyze_project_maturity(self.project_dir)
        
        # Get active projects from automation database
        active_projects = self.get_active_projects()
        
        # Generate status message
        status_msg = self.format_status_message(claude_status, project_maturity, active_projects)
        
        return status_msg

    def get_active_projects(self) -> List[Dict[str, Any]]:
        """Get list of active projects from automation database"""
        projects = []
        
        try:
            if self.automation_db.exists():
                with sqlite3.connect(self.automation_db) as conn:
                    cursor = conn.execute('''
                        SELECT p.*, COUNT(a.id) as activity_count,
                               MAX(a.timestamp) as last_activity
                        FROM projects p
                        LEFT JOIN activities a ON p.id = a.project_id
                        WHERE p.status = 'active'
                        GROUP BY p.id
                        ORDER BY last_activity DESC
                    ''')
                    
                    for row in cursor.fetchall():
                        project = {
                            'id': row[0],
                            'name': row[1],
                            'type': row[2],
                            'directory': row[3],
                            'created_date': row[4],
                            'last_activity': row[5],
                            'status': row[6],
                            'activity_count': row[7]
                        }
                        projects.append(project)
        except Exception as e:
            print(f"Error getting active projects: {e}")
            
        return projects

    def format_status_message(self, claude_status: Dict, project_maturity: Dict, active_projects: List) -> str:
        """Format comprehensive status message"""
        
        now = datetime.now()
        
        # Header with current time and status
        msg = f"""
🤖 **Claude Code Status Report** - {now.strftime('%Y-%m-%d %H:%M')}
{'='*60}

## 📊 **Token Usage & Limits**
"""
        
        if claude_status:
            daily_percent = claude_status['daily_usage_percent']
            monthly_percent = claude_status['monthly_usage_percent']
            hours_to_reset = claude_status['hours_to_reset']
            
            # Color coding based on usage
            daily_indicator = "🟢" if daily_percent < 50 else "🟡" if daily_percent < 80 else "🔴"
            monthly_indicator = "🟢" if monthly_percent < 50 else "🟡" if monthly_percent < 80 else "🔴"
            
            msg += f"""
**Claude Pro 5-Hour Cycle:**
- {daily_indicator} **Daily Usage:** {claude_status['daily_usage_tokens']:,} / {claude_status['daily_limit_tokens']:,} tokens ({daily_percent:.1f}%)
- ⏰ **Reset in:** {hours_to_reset:.1f} hours (2am reset)
- 💰 **Session Cost:** €{claude_status['session_cost_eur']:.4f}

**Billing Period (July 2025):**
- {monthly_indicator} **Monthly Usage:** {claude_status['monthly_usage_tokens']:,} / {claude_status['monthly_limit_tokens']:,} tokens ({monthly_percent:.1f}%)
- 💳 **Total Cost:** €{claude_status['billing_period_eur']:.2f}

"""
            
            # Usage recommendations
            if daily_percent > 80:
                msg += "⚠️ **High Usage Warning:** Consider pausing until reset or switching to lighter operations.\n\n"
            elif daily_percent > 60:
                msg += "🟡 **Moderate Usage:** Monitor operations carefully to avoid hitting limits.\n\n"
            else:
                msg += "✅ **Good Usage Level:** Plenty of capacity for complex operations.\n\n"
        
        # Project maturity section
        if project_maturity:
            maturity_emoji = {
                'prototype': '🧪', 'alpha': '🔬', 'beta': '🧪', 'stable': '✅', 'mature': '🏆'
            }
            
            emoji = maturity_emoji.get(project_maturity['maturity_level'], '📦')
            confidence_stars = "⭐" * int(project_maturity['confidence'] * 5)
            
            msg += f"""## 🎯 **Current Project: {project_maturity['project_name']}**

**Maturity Assessment:**
- {emoji} **Level:** {project_maturity['maturity_level'].title()} (v{project_maturity['version']})
- 🎯 **Confidence:** {project_maturity['confidence']:.1%} {confidence_stars}
- 📁 **Files:** {project_maturity['file_count']['total_files']} total ({project_maturity['file_count']['source_files']} source)
- 🔧 **Features:** {project_maturity['estimated_features']} categories detected
- 📝 **Documentation:** {"✅" if project_maturity['has_readme'] else "❌"} README quality: {project_maturity['readme_quality_score']:.1%}

"""
            
            # Development suggestions
            suggestions = self.generate_development_suggestions(project_maturity)
            if suggestions:
                msg += "**💡 Development Suggestions:**\n"
                for suggestion in suggestions[:3]:  # Top 3 suggestions
                    msg += f"- {suggestion}\n"
                msg += "\n"
        
        # Active projects overview
        if active_projects:
            msg += "## 📋 **Active Projects Overview**\n\n"
            for i, project in enumerate(active_projects[:5], 1):  # Show top 5
                last_activity = project['last_activity']
                if last_activity:
                    activity_date = datetime.fromisoformat(last_activity)
                    days_ago = (now - activity_date).days
                    activity_status = f"{days_ago} days ago" if days_ago > 0 else "today"
                else:
                    activity_status = "no recent activity"
                
                msg += f"{i}. **{project['name']}** ({project['type']}) - {activity_status}\n"
            
            msg += "\n"
        
        # Current possibilities and recommendations
        msg += self.generate_possibilities_section(claude_status, project_maturity, active_projects)
        
        msg += f"""
---
*Generated at {now.strftime('%Y-%m-%d %H:%M:%S')} by Claude Status Integration*
"""
        
        return msg

    def generate_development_suggestions(self, project_maturity: Dict) -> List[str]:
        """Generate development suggestions based on project analysis"""
        suggestions = []
        
        # Maturity-based suggestions
        if project_maturity['maturity_level'] == 'prototype':
            suggestions.append("🎯 Add more core features to advance to alpha stage")
            suggestions.append("📝 Improve README with installation and usage instructions")
        elif project_maturity['maturity_level'] == 'alpha':
            suggestions.append("🧪 Add unit tests to improve code quality")
            suggestions.append("🔧 Consider adding CI/CD pipeline")
        elif project_maturity['maturity_level'] == 'beta':
            suggestions.append("📊 Add performance monitoring and optimization")
            suggestions.append("📚 Create comprehensive documentation")
        
        # Feature-based suggestions
        if not project_maturity.get('has_tests', False):
            suggestions.append("🧪 Implement testing framework for better reliability")
        
        if project_maturity.get('readme_quality_score', 0) < 0.5:
            suggestions.append("📝 Enhance README with examples and better structure")
        
        if not project_maturity.get('is_git_repo', False):
            suggestions.append("📦 Initialize git repository for version control")
        
        if project_maturity.get('estimated_features', 0) < 3:
            suggestions.append("🚀 Expand functionality with additional features")
        
        return suggestions

    def generate_possibilities_section(self, claude_status: Dict, project_maturity: Dict, active_projects: List) -> str:
        """Generate current possibilities and opportunities section"""
        
        possibilities = "## 🚀 **Current Development Possibilities**\n\n"
        
        # Based on token availability
        if claude_status and claude_status['daily_usage_percent'] < 50:
            possibilities += "**High Capacity Operations Available:**\n"
            possibilities += "- 🧠 Complex refactoring or architectural changes\n"
            possibilities += "- 🎯 Multi-file feature implementation\n"
            possibilities += "- 📊 Comprehensive code analysis and optimization\n"
            possibilities += "- 🔄 Large-scale project reorganization\n\n"
        elif claude_status and claude_status['daily_usage_percent'] < 80:
            possibilities += "**Moderate Capacity Operations:**\n"
            possibilities += "- 🔧 Feature additions and enhancements\n"
            possibilities += "- 📝 Documentation improvements\n"
            possibilities += "- 🐛 Bug fixes and optimizations\n"
            possibilities += "- 🧪 Test implementation\n\n"
        else:
            possibilities += "**Light Operations Recommended:**\n"
            possibilities += "- 📖 Code review and planning\n"
            possibilities += "- 📝 Documentation updates\n"
            possibilities += "- 🎯 Small bug fixes\n"
            possibilities += "- 📋 Project planning and organization\n\n"
        
        # Project-specific opportunities
        if project_maturity:
            possibilities += "**Project-Specific Opportunities:**\n"
            
            maturity_level = project_maturity['maturity_level']
            if maturity_level == 'prototype':
                possibilities += "- 🎯 Define core architecture and main features\n"
                possibilities += "- 📝 Create comprehensive project documentation\n"
                possibilities += "- 🧪 Set up testing framework\n"
            elif maturity_level == 'alpha':
                possibilities += "- 🚀 Implement additional features for beta\n"
                possibilities += "- 🔧 Improve error handling and edge cases\n"
                possibilities += "- 📊 Add monitoring and logging\n"
            elif maturity_level == 'beta':
                possibilities += "- 🎯 Performance optimization and scaling\n"
                possibilities += "- 📚 Complete documentation and guides\n"
                possibilities += "- 🔒 Security audit and improvements\n"
            elif maturity_level == 'stable':
                possibilities += "- 🚀 Plan next major version features\n"
                possibilities += "- 🔄 Continuous improvement and maintenance\n"
                possibilities += "- 📦 Consider packaging and distribution\n"
            
            possibilities += "\n"
        
        # Cross-project opportunities
        if len(active_projects) > 1:
            possibilities += "**Cross-Project Opportunities:**\n"
            possibilities += "- 🔄 Extract common patterns into reusable libraries\n"
            possibilities += "- 📊 Compare approaches across projects\n"
            possibilities += "- 🧠 Apply learnings from one project to others\n"
            possibilities += "- 🎯 Standardize tooling and processes\n\n"
        
        return possibilities

def main():
    """Generate and display status message"""
    status_system = ClaudeStatusIntegration()
    status_message = status_system.generate_status_message()
    print(status_message)

if __name__ == "__main__":
    main()