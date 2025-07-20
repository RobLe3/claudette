#!/usr/bin/env python3
"""
Intelligent Project Categorization & Context Detection
Advanced analysis of project activities to automatically categorize and understand projects
"""

import re
import json
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from collections import Counter, defaultdict

class IntelligentProjectCategorizer:
    """Advanced project categorization based on activity patterns and content analysis"""
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or str(Path.home() / '.claude' / 'project_automation.db')
        
        # Advanced project type patterns
        self.project_signatures = {
            'claude_integration': {
                'files': ['CLAUDE.md', '.claude/', 'mcp', 'hooks/', 'claude-flow'],
                'keywords': ['claude', 'mcp', 'swarm', 'coordination', 'hooks', 'anthropic'],
                'operations': ['mcp__', 'swarm', 'agent', 'coordination'],
                'weight': 1.0
            },
            'cost_optimization': {
                'files': ['cost-tracking/', 'billing/', 'dashboard/', 'claude-cost-tracker'],
                'keywords': ['cost', 'billing', 'token', 'usage', 'tracking', 'euro', 'pricing'],
                'operations': ['cost', 'tracking', 'billing', 'dashboard'],
                'weight': 0.9
            },
            'web_development': {
                'files': ['package.json', 'src/', 'public/', 'components/', 'index.html', 'webpack'],
                'keywords': ['react', 'vue', 'angular', 'html', 'css', 'javascript', 'frontend'],
                'operations': ['npm', 'yarn', 'build', 'serve'],
                'weight': 0.8
            },
            'data_science': {
                'files': ['*.ipynb', 'data/', 'models/', 'analysis/', '*.csv', 'requirements.txt'],
                'keywords': ['pandas', 'numpy', 'matplotlib', 'jupyter', 'analysis', 'data'],
                'operations': ['python', 'pip', 'conda', 'jupyter'],
                'weight': 0.8
            },
            'backend_api': {
                'files': ['api/', 'routes/', 'models/', 'controllers/', 'server.js', 'app.py'],
                'keywords': ['api', 'endpoint', 'route', 'database', 'server', 'backend'],
                'operations': ['uvicorn', 'gunicorn', 'flask', 'fastapi', 'express'],
                'weight': 0.8
            },
            'automation': {
                'files': ['scripts/', 'automation/', '*.py', 'cron', 'Makefile'],
                'keywords': ['script', 'automation', 'batch', 'workflow', 'pipeline'],
                'operations': ['bash', 'python', 'cron', 'make'],
                'weight': 0.7
            },
            'documentation': {
                'files': ['docs/', '*.md', 'README.md', 'mkdocs.yml', '*.rst'],
                'keywords': ['documentation', 'readme', 'guide', 'tutorial', 'manual'],
                'operations': ['markdown', 'docs', 'sphinx', 'mkdocs'],
                'weight': 0.6
            },
            'devops': {
                'files': ['Dockerfile', 'docker-compose.yml', '.github/', 'deploy/', 'kubernetes/'],
                'keywords': ['docker', 'kubernetes', 'deployment', 'ci', 'cd', 'devops'],
                'operations': ['docker', 'kubectl', 'terraform', 'ansible'],
                'weight': 0.8
            },
            'testing': {
                'files': ['tests/', 'test_*.py', '*.test.js', 'spec/', 'cypress/'],
                'keywords': ['test', 'testing', 'unit', 'integration', 'coverage'],
                'operations': ['pytest', 'jest', 'mocha', 'cypress'],
                'weight': 0.5
            }
        }
        
        # Activity pattern analysis
        self.activity_patterns = {
            'development_phase': {
                'setup': ['mkdir', 'init', 'create', 'new'],
                'implementation': ['write', 'edit', 'code', 'implement'],
                'testing': ['test', 'debug', 'fix', 'error'],
                'optimization': ['optimize', 'improve', 'enhance', 'refactor'],
                'documentation': ['readme', 'docs', 'comment', 'document'],
                'deployment': ['deploy', 'build', 'release', 'publish']
            },
            'complexity_indicators': {
                'high': ['architecture', 'framework', 'system', 'integration'],
                'medium': ['feature', 'module', 'component', 'service'],
                'low': ['fix', 'update', 'simple', 'quick']
            },
            'collaboration_level': {
                'solo': ['personal', 'experiment', 'prototype', 'learning'],
                'team': ['shared', 'team', 'collaboration', 'review'],
                'public': ['open', 'github', 'community', 'public']
            }
        }

    def analyze_project_from_activities(self, project_id: str) -> Dict[str, Any]:
        """Comprehensive project analysis from activity history"""
        
        with sqlite3.connect(self.db_path) as conn:
            # Get project basic info
            cursor = conn.execute('SELECT * FROM projects WHERE id = ?', (project_id,))
            project = cursor.fetchone()
            
            if not project:
                return None
                
            # Get all activities for this project
            cursor = conn.execute('''
                SELECT * FROM activities 
                WHERE project_id = ? 
                ORDER BY timestamp ASC
            ''', (project_id,))
            activities = cursor.fetchall()
        
        if not activities:
            return None
            
        # Analyze different aspects
        analysis = {
            'project_id': project_id,
            'project_name': project[1],  # name column
            'directory': project[3],      # directory column
            'basic_type': project[2],     # type column
            'created_date': project[4],   # created_date column
            'analysis_timestamp': datetime.now().isoformat(),
            'activity_count': len(activities),
            'analysis_confidence': 0.0
        }
        
        # Advanced categorization
        analysis.update(self.categorize_project_advanced(activities, project[3]))
        
        # Development phase analysis
        analysis.update(self.analyze_development_phase(activities))
        
        # Complexity analysis
        analysis.update(self.analyze_project_complexity(activities))
        
        # Objective inference
        analysis.update(self.infer_project_objectives(activities))
        
        # Timeline analysis
        analysis.update(self.analyze_project_timeline(activities))
        
        # Technology stack detection
        analysis.update(self.detect_technology_stack(activities))
        
        return analysis

    def categorize_project_advanced(self, activities: List, project_dir: str) -> Dict[str, Any]:
        """Advanced project categorization using multiple signals"""
        
        # Collect all signals
        all_files = set()
        all_keywords = []
        all_operations = []
        
        for activity in activities:
            # Files (column 4)
            if activity[4]:
                files = activity[4].split(',')
                all_files.update(files)
                
            # Context (column 7) contains keywords
            if activity[7]:
                all_keywords.append(activity[7].lower())
                
            # Operation type (column 3)
            if activity[3]:
                all_operations.append(activity[3].lower())
        
        # Scan project directory for additional files
        try:
            project_path = Path(project_dir)
            if project_path.exists():
                for file_path in project_path.rglob('*'):
                    if file_path.is_file():
                        rel_path = file_path.relative_to(project_path)
                        all_files.add(str(rel_path))
        except:
            pass
        
        # Score each project type
        type_scores = {}
        for project_type, signature in self.project_signatures.items():
            score = 0.0
            
            # File pattern matching
            for pattern in signature['files']:
                if '*' in pattern:
                    regex = pattern.replace('*', '.*')
                    matches = sum(1 for f in all_files if re.search(regex, f))
                    score += matches * 0.3
                else:
                    if any(pattern in f for f in all_files):
                        score += 1.0
            
            # Keyword matching
            keyword_text = ' '.join(all_keywords)
            for keyword in signature['keywords']:
                if keyword in keyword_text:
                    score += 0.5
            
            # Operation matching
            operation_text = ' '.join(all_operations)
            for operation in signature['operations']:
                if operation in operation_text:
                    score += 0.3
            
            # Apply weight
            type_scores[project_type] = score * signature['weight']
        
        # Determine best match
        if type_scores:
            best_type = max(type_scores, key=type_scores.get)
            confidence = min(type_scores[best_type] / 5.0, 1.0)  # Normalize to 0-1
        else:
            best_type = 'general'
            confidence = 0.1
        
        return {
            'advanced_type': best_type,
            'type_confidence': confidence,
            'type_scores': type_scores,
            'detected_files': len(all_files),
            'detected_keywords': len(set(all_keywords)),
            'detected_operations': len(set(all_operations))
        }

    def analyze_development_phase(self, activities: List) -> Dict[str, Any]:
        """Analyze what development phase the project is in"""
        
        # Get recent activities (last 7 days)
        recent_threshold = (datetime.now() - timedelta(days=7)).isoformat()
        recent_activities = [a for a in activities if a[2] > recent_threshold]  # timestamp column
        
        if not recent_activities:
            recent_activities = activities[-10:] if activities else []  # Last 10 activities
        
        # Analyze operations and contexts
        operation_types = [a[3].lower() for a in recent_activities if a[3]]
        contexts = [a[7].lower() for a in recent_activities if a[7]]
        
        phase_scores = {}
        for phase, keywords in self.activity_patterns['development_phase'].items():
            score = 0
            all_text = ' '.join(operation_types + contexts)
            
            for keyword in keywords:
                score += all_text.count(keyword)
            
            phase_scores[phase] = score
        
        # Determine primary phase
        if phase_scores:
            primary_phase = max(phase_scores, key=phase_scores.get)
            phase_confidence = min(phase_scores[primary_phase] / 5.0, 1.0)
        else:
            primary_phase = 'unknown'
            phase_confidence = 0.0
        
        return {
            'development_phase': primary_phase,
            'phase_confidence': phase_confidence,
            'phase_indicators': phase_scores,
            'recent_activity_count': len(recent_activities)
        }

    def analyze_project_complexity(self, activities: List) -> Dict[str, Any]:
        """Analyze project complexity based on various indicators"""
        
        # Complexity indicators
        file_count = len(set(a[4] for a in activities if a[4]))
        operation_variety = len(set(a[3] for a in activities if a[3]))
        total_tokens = sum(a[5] for a in activities if a[5])
        activity_span_days = 1
        
        if len(activities) > 1:
            start_time = datetime.fromisoformat(activities[0][2])
            end_time = datetime.fromisoformat(activities[-1][2])
            activity_span_days = max((end_time - start_time).days, 1)
        
        # Calculate complexity score
        complexity_score = 0
        complexity_score += min(file_count / 10, 1.0) * 0.3       # File diversity
        complexity_score += min(operation_variety / 8, 1.0) * 0.2 # Operation variety
        complexity_score += min(total_tokens / 100000, 1.0) * 0.3 # Token usage
        complexity_score += min(activity_span_days / 30, 1.0) * 0.2 # Time span
        
        # Determine complexity level
        if complexity_score >= 0.7:
            complexity_level = 'high'
        elif complexity_score >= 0.4:
            complexity_level = 'medium'
        else:
            complexity_level = 'low'
        
        return {
            'complexity_level': complexity_level,
            'complexity_score': complexity_score,
            'complexity_indicators': {
                'file_count': file_count,
                'operation_variety': operation_variety,
                'total_tokens': total_tokens,
                'activity_span_days': activity_span_days
            }
        }

    def infer_project_objectives(self, activities: List) -> Dict[str, Any]:
        """Infer project objectives from activity patterns"""
        
        # Analyze contexts and operations for objective keywords
        all_contexts = [a[7].lower() for a in activities if a[7]]
        all_operations = [a[3].lower() for a in activities if a[3]]
        
        objective_keywords = {
            'cost_optimization': ['cost', 'billing', 'tracking', 'optimization', 'token', 'usage'],
            'system_integration': ['integration', 'api', 'connect', 'interface', 'service'],
            'automation': ['automation', 'script', 'workflow', 'pipeline', 'batch'],
            'monitoring': ['monitoring', 'dashboard', 'metrics', 'analytics', 'tracking'],
            'development_tools': ['tools', 'framework', 'utility', 'helper', 'cli'],
            'data_analysis': ['analysis', 'data', 'report', 'visualization', 'insights'],
            'documentation': ['documentation', 'guide', 'tutorial', 'manual', 'readme'],
            'testing': ['testing', 'test', 'validation', 'verification', 'quality'],
            'performance': ['performance', 'optimization', 'speed', 'efficiency', 'scaling']
        }
        
        objective_scores = {}
        all_text = ' '.join(all_contexts + all_operations)
        
        for objective, keywords in objective_keywords.items():
            score = sum(all_text.count(keyword) for keyword in keywords)
            if score > 0:
                objective_scores[objective] = score
        
        # Get top objectives
        sorted_objectives = sorted(objective_scores.items(), key=lambda x: x[1], reverse=True)
        primary_objectives = [obj for obj, score in sorted_objectives[:3]]
        
        return {
            'inferred_objectives': primary_objectives,
            'objective_scores': objective_scores,
            'primary_objective': primary_objectives[0] if primary_objectives else 'general_development'
        }

    def analyze_project_timeline(self, activities: List) -> Dict[str, Any]:
        """Analyze project timeline and activity patterns"""
        
        if len(activities) < 2:
            return {
                'timeline_analysis': 'insufficient_data',
                'activity_pattern': 'single_session',
                'development_velocity': 0.0
            }
        
        # Parse timestamps
        timestamps = [datetime.fromisoformat(a[2]) for a in activities]
        start_time = min(timestamps)
        end_time = max(timestamps)
        
        project_duration = (end_time - start_time).total_seconds() / 3600  # hours
        
        # Activity distribution analysis
        activity_by_hour = defaultdict(int)
        for ts in timestamps:
            hour_key = ts.strftime('%Y-%m-%d %H')
            activity_by_hour[hour_key] += 1
        
        # Calculate development velocity (activities per hour)
        if project_duration > 0:
            velocity = len(activities) / project_duration
        else:
            velocity = 0.0
        
        # Determine activity pattern
        if project_duration < 1:  # Less than 1 hour
            pattern = 'single_session'
        elif project_duration < 24:  # Same day
            pattern = 'intensive_session'
        elif len(set(ts.date() for ts in timestamps)) > 1:
            pattern = 'multi_day'
        else:
            pattern = 'extended_session'
        
        return {
            'timeline_analysis': {
                'start_time': start_time.isoformat(),
                'end_time': end_time.isoformat(),
                'duration_hours': project_duration,
                'activity_pattern': pattern,
                'development_velocity': velocity,
                'active_days': len(set(ts.date() for ts in timestamps))
            }
        }

    def detect_technology_stack(self, activities: List) -> Dict[str, Any]:
        """Detect technology stack from activities"""
        
        # Technology indicators
        tech_indicators = {
            'python': ['python', '.py', 'pip', 'conda', 'virtualenv'],
            'javascript': ['javascript', '.js', 'npm', 'node', 'yarn'],
            'web': ['html', 'css', 'react', 'vue', 'angular'],
            'database': ['sqlite', 'postgres', 'mysql', 'mongodb'],
            'cloud': ['aws', 'azure', 'gcp', 'docker', 'kubernetes'],
            'ml': ['tensorflow', 'pytorch', 'sklearn', 'pandas', 'numpy'],
            'devops': ['docker', 'ci', 'cd', 'jenkins', 'github']
        }
        
        # Analyze all activity data
        all_text = []
        for activity in activities:
            if activity[4]:  # files
                all_text.extend(activity[4].split(','))
            if activity[7]:  # context
                all_text.append(activity[7])
            if activity[3]:  # operation
                all_text.append(activity[3])
        
        text_content = ' '.join(all_text).lower()
        
        detected_technologies = {}
        for tech, indicators in tech_indicators.items():
            score = sum(text_content.count(indicator) for indicator in indicators)
            if score > 0:
                detected_technologies[tech] = score
        
        # Sort by relevance
        primary_stack = sorted(detected_technologies.items(), key=lambda x: x[1], reverse=True)
        
        return {
            'technology_stack': [tech for tech, score in primary_stack[:5]],
            'tech_scores': detected_technologies,
            'primary_technology': primary_stack[0][0] if primary_stack else 'unknown'
        }

    def generate_project_summary(self, project_id: str) -> str:
        """Generate human-readable project summary"""
        
        analysis = self.analyze_project_from_activities(project_id)
        if not analysis:
            return "No analysis available for this project."
        
        summary = f"""
# 📊 **Project Analysis: {analysis['project_name']}**

## 🎯 **Project Overview**
- **Type:** {analysis['advanced_type'].title()} (confidence: {analysis['type_confidence']:.1%})
- **Complexity:** {analysis['complexity_level'].title()} ({analysis['complexity_score']:.1%})
- **Phase:** {analysis['development_phase'].title()}
- **Primary Objective:** {analysis['primary_objective'].replace('_', ' ').title()}

## 📈 **Activity Metrics**
- **Total Activities:** {analysis['activity_count']}
- **Files Involved:** {analysis['detected_files']}
- **Technology Stack:** {', '.join(analysis['technology_stack'][:3])}
- **Development Velocity:** {analysis['timeline_analysis']['development_velocity']:.1f} operations/hour

## 🔍 **Key Insights**
"""
        
        # Add specific insights based on analysis
        if analysis['type_confidence'] > 0.8:
            summary += f"- ✅ **High Confidence Classification:** This is clearly a {analysis['advanced_type']} project\n"
        
        if analysis['complexity_level'] == 'high':
            summary += f"- 🎯 **Complex Project:** Involves {analysis['complexity_indicators']['file_count']} files over {analysis['timeline_analysis']['active_days']} days\n"
        
        if analysis['development_phase'] == 'implementation':
            summary += "- 🔧 **Active Development:** Currently in implementation phase\n"
        
        return summary

def main():
    """Test the intelligent categorization system"""
    categorizer = IntelligentProjectCategorizer()
    
    # Get all projects from database
    with sqlite3.connect(categorizer.db_path) as conn:
        cursor = conn.execute('SELECT id, name FROM projects')
        projects = cursor.fetchall()
    
    if not projects:
        print("No projects found in database.")
        return
    
    for project_id, project_name in projects:
        print(f"\n{'='*60}")
        print(f"Analyzing Project: {project_name}")
        print('='*60)
        
        summary = categorizer.generate_project_summary(project_id)
        print(summary)

if __name__ == "__main__":
    main()