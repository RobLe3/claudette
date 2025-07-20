#!/usr/bin/env python3
"""
Project Automation Daemon - Dynamic project tracking and diary generation
Automatically detects projects, updates state files, and generates diary entries
"""

import asyncio
import json
import sqlite3
import os
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
import re
import hashlib

class ProjectAutomationDaemon:
    """Main daemon that orchestrates all automated project tracking"""
    
    def __init__(self, config_path=None):
        self.config_path = config_path or Path.home() / '.claude' / 'automation_config.json'
        self.config = self.load_automation_config()
        self.db_path = Path.home() / '.claude' / 'project_automation.db'
        self.activity_buffer = []
        self.current_project = None
        self.session_start = datetime.now()
        self.last_update_times = {
            'state': datetime.now(),
            'diary': datetime.now(),
            'lessons': datetime.now()
        }
        
        # Initialize database
        self.init_database()
        
    def load_automation_config(self) -> Dict[str, Any]:
        """Load automation configuration with defaults"""
        default_config = {
            "enabled": True,
            "intervals": {
                "state_update": 300,      # 5 minutes
                "diary_generation": 1800, # 30 minutes  
                "lesson_extraction": 3600, # 60 minutes
                "project_detection": 60    # 1 minute
            },
            "detection_thresholds": {
                "new_project_file_count": 5,
                "new_project_operation_count": 20,
                "context_switch_confidence": 0.8
            },
            "diary_generation": {
                "min_activity_for_entry": 3,
                "include_technical_details": True,
                "include_cost_metrics": True,
                "include_lesson_extraction": True
            },
            "user_style": {
                "currency": "EUR",
                "emoji_headers": True,
                "technical_depth": "detailed",
                "metrics_focus": True
            }
        }
        
        if self.config_path.exists():
            with open(self.config_path, 'r') as f:
                user_config = json.load(f)
                # Merge with defaults
                default_config.update(user_config)
                
        return default_config
    
    def init_database(self):
        """Initialize SQLite database for tracking"""
        os.makedirs(self.db_path.parent, exist_ok=True)
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY,
                    name TEXT,
                    type TEXT,
                    directory TEXT,
                    created_date TEXT,
                    last_activity TEXT,
                    status TEXT
                )
            ''')
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS activities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id TEXT,
                    timestamp TEXT,
                    operation_type TEXT,
                    files TEXT,
                    tokens_used INTEGER,
                    cost_eur REAL,
                    context TEXT,
                    FOREIGN KEY (project_id) REFERENCES projects (id)
                )
            ''')
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS diary_entries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id TEXT,
                    timestamp TEXT,
                    duration_minutes INTEGER,
                    achievements TEXT,
                    challenges TEXT,
                    insights TEXT,
                    cost_eur REAL,
                    tokens_used INTEGER,
                    FOREIGN KEY (project_id) REFERENCES projects (id)
                )
            ''')
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS lessons_learned (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id TEXT,
                    timestamp TEXT,
                    lesson_type TEXT,
                    title TEXT,
                    description TEXT,
                    impact_score INTEGER,
                    FOREIGN KEY (project_id) REFERENCES projects (id)
                )
            ''')

    def detect_project_from_directory(self, working_dir: str) -> Dict[str, Any]:
        """Detect project type and details from directory structure"""
        working_path = Path(working_dir)
        
        if not working_path.exists():
            return None
            
        # Project type detection patterns
        project_indicators = {
            'claude_flow': ['CLAUDE.md', '.claude/', 'mcp', 'scripts/cost-tracking/'],
            'python_package': ['setup.py', 'pyproject.toml', 'requirements.txt', '__init__.py'],
            'web_frontend': ['package.json', 'src/', 'public/', 'index.html', 'components/'],
            'data_science': ['*.ipynb', 'data/', 'models/', 'analysis/', '*.csv'],
            'documentation': ['*.md', 'docs/', 'README.md', 'mkdocs.yml'],
            'automation': ['scripts/', '*.py', 'cron', 'automation/']
        }
        
        # Scan directory structure
        files_found = []
        for root, dirs, files in os.walk(working_dir):
            rel_root = os.path.relpath(root, working_dir)
            for file in files:
                if rel_root == '.':
                    files_found.append(file)
                else:
                    files_found.append(f"{rel_root}/{file}")
            
            # Add directory patterns
            for dir_name in dirs:
                if rel_root == '.':
                    files_found.append(f"{dir_name}/")
                else:
                    files_found.append(f"{rel_root}/{dir_name}/")
        
        # Score each project type
        scores = {}
        for project_type, patterns in project_indicators.items():
            score = 0
            for pattern in patterns:
                if '*' in pattern:
                    # Wildcard pattern
                    regex = pattern.replace('*', '.*')
                    if any(re.match(regex, f) for f in files_found):
                        score += 1
                else:
                    # Exact match
                    if pattern in files_found:
                        score += 2  # Exact matches score higher
            scores[project_type] = score
        
        # Determine best match
        if not scores or max(scores.values()) == 0:
            detected_type = 'general'
            confidence = 0.3
        else:
            detected_type = max(scores, key=scores.get)
            confidence = min(scores[detected_type] / len(project_indicators[detected_type]), 1.0)
        
        # Generate project ID and name
        project_id = hashlib.md5(working_dir.encode()).hexdigest()[:12]
        project_name = working_path.name
        
        return {
            'id': project_id,
            'name': project_name,
            'type': detected_type,
            'directory': working_dir,
            'confidence': confidence,
            'files_analyzed': len(files_found)
        }

    def log_activity(self, operation_type: str, working_dir: str, files: List[str], 
                    tokens_used: int, cost_eur: float, context: str = ""):
        """Log a Claude Code activity"""
        
        # Detect or update current project
        project_info = self.detect_project_from_directory(working_dir)
        if project_info and project_info['confidence'] > 0.5:
            self.ensure_project_exists(project_info)
            project_id = project_info['id']
        else:
            project_id = 'unknown'
        
        # Add to activity buffer
        activity = {
            'project_id': project_id,
            'timestamp': datetime.now().isoformat(),
            'operation_type': operation_type,
            'files': ','.join(files) if files else '',
            'tokens_used': tokens_used,
            'cost_eur': cost_eur,
            'context': context
        }
        
        self.activity_buffer.append(activity)
        
        # Store in database
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT INTO activities 
                (project_id, timestamp, operation_type, files, tokens_used, cost_eur, context)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (project_id, activity['timestamp'], operation_type, 
                 activity['files'], tokens_used, cost_eur, context))
        
        # Update current project
        if project_id != 'unknown':
            self.current_project = project_id
            self.update_project_last_activity(project_id)

    def ensure_project_exists(self, project_info: Dict[str, Any]):
        """Ensure project exists in database"""
        with sqlite3.connect(self.db_path) as conn:
            # Check if project exists
            cursor = conn.execute('SELECT id FROM projects WHERE id = ?', (project_info['id'],))
            if not cursor.fetchone():
                # Create new project
                conn.execute('''
                    INSERT INTO projects (id, name, type, directory, created_date, last_activity, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (project_info['id'], project_info['name'], project_info['type'],
                     project_info['directory'], datetime.now().isoformat(),
                     datetime.now().isoformat(), 'active'))
                
                # Create project state directory
                self.create_project_state_directory(project_info)

    def create_project_state_directory(self, project_info: Dict[str, Any]):
        """Create PROJECT_STATE directory and files for new project"""
        project_dir = Path(project_info['directory'])
        state_dir = project_dir / 'PROJECT_STATE'
        state_dir.mkdir(exist_ok=True)
        
        # Create CURRENT_STATE.md from template
        template_path = Path(__file__).parent.parent / 'project-state-framework' / 'templates' / 'CURRENT_STATE_TEMPLATE.md'
        current_state_path = state_dir / 'CURRENT_STATE.md'
        
        if template_path.exists() and not current_state_path.exists():
            with open(template_path, 'r') as f:
                template = f.read()
            
            # Customize template
            content = template.replace('[PROJECT_NAME]', project_info['name'])
            content = content.replace('[AUTO_GENERATED_ID]', project_info['id'])
            content = content.replace('[YYYY-MM-DD]', datetime.now().strftime('%Y-%m-%d'))
            content = content.replace('[HH:MM]', datetime.now().strftime('%H:%M'))
            
            with open(current_state_path, 'w') as f:
                f.write(content)
        
        # Create PROJECT_DIARY.md from template
        diary_template_path = Path(__file__).parent.parent / 'project-state-framework' / 'templates' / 'PROJECT_DIARY_TEMPLATE.md'
        diary_path = state_dir / 'PROJECT_DIARY.md'
        
        if diary_template_path.exists() and not diary_path.exists():
            with open(diary_template_path, 'r') as f:
                template = f.read()
            
            content = template.replace('[PROJECT_NAME]', project_info['name'])
            content = content.replace('[YYYY-MM-DD]', datetime.now().strftime('%Y-%m-%d'))
            content = content.replace('[Full project name]', project_info['name'])
            
            with open(diary_path, 'w') as f:
                f.write(content)

    def update_project_last_activity(self, project_id: str):
        """Update last activity time for project"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                UPDATE projects SET last_activity = ? WHERE id = ?
            ''', (datetime.now().isoformat(), project_id))

    def update_current_state(self, project_id: str):
        """Update CURRENT_STATE.md with recent activity"""
        if not project_id or project_id == 'unknown':
            return
            
        # Get project info
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute('SELECT * FROM projects WHERE id = ?', (project_id,))
            project = cursor.fetchone()
            
            if not project:
                return
                
            # Get recent activities (last 5 minutes)
            since_time = (datetime.now() - timedelta(minutes=5)).isoformat()
            cursor = conn.execute('''
                SELECT * FROM activities 
                WHERE project_id = ? AND timestamp > ?
                ORDER BY timestamp DESC
            ''', (project_id, since_time))
            recent_activities = cursor.fetchall()
        
        if not recent_activities:
            return
            
        # Update CURRENT_STATE.md
        project_dir = Path(project[3])  # directory column
        current_state_path = project_dir / 'PROJECT_STATE' / 'CURRENT_STATE.md'
        
        if current_state_path.exists():
            # Read current file
            with open(current_state_path, 'r') as f:
                content = f.read()
            
            # Update last activity and token usage
            now = datetime.now()
            total_tokens = sum(activity[5] for activity in recent_activities if activity[5])
            total_cost = sum(activity[6] for activity in recent_activities if activity[6])
            
            # Update timestamp
            content = re.sub(
                r'\*\*Last Updated:\*\* .*',
                f'**Last Updated:** {now.strftime("%Y-%m-%d %H:%M:%S")}',
                content
            )
            
            # Update session metrics if section exists
            if '## 💰 **Resource Usage**' in content:
                # Extract current session tokens and add new ones
                # This is a simplified update - in production, you'd parse more carefully
                updated_content = content
                
                # Add activity summary
                activity_summary = f"\n\n**Recent Activity (last 5 min):**\n"
                for activity in recent_activities[:3]:  # Last 3 activities
                    activity_summary += f"- {activity[3]} on {activity[4][:50]}... ({activity[5]} tokens)\n"
                
                # Insert before final separator
                if '---' in content:
                    parts = content.rsplit('---', 1)
                    updated_content = parts[0] + activity_summary + '\n---' + parts[1]
                
                with open(current_state_path, 'w') as f:
                    f.write(updated_content)

    def generate_diary_entry(self, project_id: str):
        """Generate automated diary entry for last 30 minutes"""
        if not project_id or project_id == 'unknown':
            return
            
        # Get activities from last 30 minutes
        since_time = (datetime.now() - timedelta(minutes=30)).isoformat()
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute('SELECT * FROM projects WHERE id = ?', (project_id,))
            project = cursor.fetchone()
            
            if not project:
                return
                
            cursor = conn.execute('''
                SELECT * FROM activities 
                WHERE project_id = ? AND timestamp > ?
                ORDER BY timestamp ASC
            ''', (project_id, since_time))
            activities = cursor.fetchall()
        
        if len(activities) < self.config['diary_generation']['min_activity_for_entry']:
            return
            
        # Analyze activities
        total_tokens = sum(activity[5] for activity in activities if activity[5])
        total_cost = sum(activity[6] for activity in activities if activity[6])
        operation_types = [activity[3] for activity in activities]
        files_touched = set()
        for activity in activities:
            if activity[4]:  # files column
                files_touched.update(activity[4].split(','))
        
        # Generate entry content
        now = datetime.now()
        entry_content = f"""
### {now.strftime('%Y-%m-%d')} - Auto-Generated Entry: {now.strftime('%H:%M')}
**Duration:** 30 minutes | **Cost:** €{total_cost:.4f} | **Status:** AUTO_TRACKED

#### 🎯 **Activities Detected**
- **Operations:** {len(activities)} total ({', '.join(set(operation_types))})
- **Files Modified:** {len(files_touched)} files
- **Token Usage:** {total_tokens:,} tokens

#### ✅ **Automated Achievements**
"""
        
        # Analyze achievements based on operation patterns
        achievements = []
        if 'Write' in operation_types:
            achievements.append(f"**File Creation** - Created {operation_types.count('Write')} new files")
        if 'Edit' in operation_types:
            achievements.append(f"**File Modifications** - Updated {operation_types.count('Edit')} files")
        if 'TodoWrite' in operation_types:
            achievements.append(f"**Task Management** - Updated project todos")
        if 'Bash' in operation_types:
            achievements.append(f"**System Operations** - Executed {operation_types.count('Bash')} commands")
        
        for achievement in achievements:
            entry_content += f"- {achievement}\n"
        
        entry_content += f"""
#### 📊 **Session Metrics**
- **Token Efficiency:** {total_tokens/len(activities):.0f} tokens per operation
- **Cost Efficiency:** €{total_cost/len(activities):.4f} per operation
- **Activity Rate:** {len(activities)/30:.1f} operations per minute

#### 🔄 **Current State**
- **Last Operation:** {activities[-1][3]} at {activities[-1][2][-8:-3]}
- **Active Files:** {', '.join(list(files_touched)[:3])}{'...' if len(files_touched) > 3 else ''}

---
"""
        
        # Append to PROJECT_DIARY.md
        project_dir = Path(project[3])  # directory column
        diary_path = project_dir / 'PROJECT_STATE' / 'PROJECT_DIARY.md'
        
        if diary_path.exists():
            with open(diary_path, 'r') as f:
                content = f.read()
            
            # Insert after "## 📅 **Session Log**" section
            if '## 📅 **Session Log**' in content:
                parts = content.split('## 📅 **Session Log**', 1)
                if len(parts) == 2:
                    header = parts[0] + '## 📅 **Session Log**'
                    rest = parts[1]
                    
                    # Find where to insert (after existing entries)
                    if '---\n\n## 🧠 **Cumulative Learnings**' in rest:
                        session_part, learning_part = rest.split('---\n\n## 🧠 **Cumulative Learnings**', 1)
                        updated_content = header + session_part + entry_content + '\n---\n\n## 🧠 **Cumulative Learnings**' + learning_part
                    else:
                        updated_content = header + entry_content + rest
                    
                    with open(diary_path, 'w') as f:
                        f.write(updated_content)
        
        # Store in database
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT INTO diary_entries 
                (project_id, timestamp, duration_minutes, achievements, cost_eur, tokens_used)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (project_id, now.isoformat(), 30, 
                 f"{len(achievements)} achievements", total_cost, total_tokens))

    async def run_automation_loop(self):
        """Main automation loop"""
        print("🤖 Starting Project Automation Daemon...")
        print(f"📊 Intervals: State={self.config['intervals']['state_update']}s, "
              f"Diary={self.config['intervals']['diary_generation']}s")
        
        while True:
            try:
                now = datetime.now()
                
                # State updates (every 5 minutes)
                if (now - self.last_update_times['state']).seconds >= self.config['intervals']['state_update']:
                    if self.current_project:
                        self.update_current_state(self.current_project)
                        self.last_update_times['state'] = now
                
                # Diary generation (every 30 minutes)
                if (now - self.last_update_times['diary']).seconds >= self.config['intervals']['diary_generation']:
                    if self.current_project:
                        self.generate_diary_entry(self.current_project)
                        self.last_update_times['diary'] = now
                
                # Sleep for 1 minute before next check
                await asyncio.sleep(60)
                
            except Exception as e:
                print(f"❌ Error in automation loop: {e}")
                await asyncio.sleep(60)

def main():
    """Main entry point"""
    daemon = ProjectAutomationDaemon()
    asyncio.run(daemon.run_automation_loop())

if __name__ == "__main__":
    main()