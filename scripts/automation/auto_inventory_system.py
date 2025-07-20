#!/usr/bin/env python3
"""
Auto-Inventory System for Claude Code Enhancements and Plugins
Periodically scans for developments, checks harmonization, and prevents splintered growth
"""

import os
import json
import sqlite3
import re
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any, Set, Tuple
import subprocess
import ast
import importlib.util

class AutoInventorySystem:
    """System for automatically inventorying and harmonizing Claude Code enhancements"""
    
    def __init__(self, project_root: str = None):
        self.project_root = Path(project_root or '/Users/roble/Documents/Python/claude_flow')
        self.inventory_db = Path.home() / '.claude' / 'enhancement_inventory.db'
        self.config_file = Path.home() / '.claude' / 'inventory_config.json'
        
        # Initialize database and configuration
        self.init_database()
        self.config = self.load_config()
        
        # Known enhancement categories
        self.enhancement_categories = {
            'cost_tracking': {
                'description': 'Cost and usage monitoring systems',
                'patterns': ['cost', 'billing', 'tracking', 'usage', 'token', 'euro'],
                'locations': ['scripts/cost-tracking/', 'tools/dashboard/'],
                'core_files': ['claude-cost-tracker.py', 'cost-dashboard.zsh']
            },
            'automation': {
                'description': 'Automation and daemon systems',
                'patterns': ['automation', 'daemon', 'background', 'scheduler', 'periodic'],
                'locations': ['scripts/automation/', '.hive-mind/', '.swarm/'],
                'core_files': ['project_automation_daemon.py', 'automation_control.sh']
            },
            'project_management': {
                'description': 'Project state and diary management',
                'patterns': ['project', 'state', 'diary', 'todo', 'session', 'continuation'],
                'locations': ['project-state-framework/', 'PROJECT_STATE/'],
                'core_files': ['CURRENT_STATE.md', 'PROJECT_DIARY.md', 'LESSONS_LEARNED.md']
            },
            'claude_integration': {
                'description': 'Claude Code hooks and integration',
                'patterns': ['claude', 'hook', 'integration', 'mcp', 'settings'],
                'locations': ['.claude/', 'scripts/automation/'],
                'core_files': ['settings.json', 'claude_hook_integration.py']
            },
            'swarm_coordination': {
                'description': 'Swarm and multi-agent coordination',
                'patterns': ['swarm', 'agent', 'coordination', 'hive', 'orchestration'],
                'locations': ['coordination/', 'memory/', '.swarm/', '.hive-mind/'],
                'core_files': ['CLAUDE.md', 'claude-flow.config.json']
            },
            'monitoring': {
                'description': 'Status monitoring and reporting',
                'patterns': ['monitor', 'status', 'dashboard', 'report', 'metrics'],
                'locations': ['tools/monitoring/', 'tools/dashboard/'],
                'core_files': ['claude_status_integration.py', 'claude_reminder_system.py']
            },
            'intelligence': {
                'description': 'AI intelligence and categorization',
                'patterns': ['intelligent', 'categorization', 'analysis', 'neural', 'learning'],
                'locations': ['scripts/automation/'],
                'core_files': ['intelligent_categorization.py']
            }
        }

    def init_database(self):
        """Initialize SQLite database for inventory tracking"""
        os.makedirs(self.inventory_db.parent, exist_ok=True)
        
        with sqlite3.connect(self.inventory_db) as conn:
            # Enhancement inventory table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS enhancements (
                    id TEXT PRIMARY KEY,
                    name TEXT,
                    category TEXT,
                    file_path TEXT,
                    description TEXT,
                    functionality TEXT,
                    dependencies TEXT,
                    created_date TEXT,
                    last_modified TEXT,
                    file_hash TEXT,
                    status TEXT,
                    harmony_score REAL
                )
            ''')
            
            # Harmony relationships table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS harmony_relationships (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    enhancement_id_1 TEXT,
                    enhancement_id_2 TEXT,
                    relationship_type TEXT,
                    overlap_score REAL,
                    integration_suggestion TEXT,
                    discovered_date TEXT,
                    FOREIGN KEY (enhancement_id_1) REFERENCES enhancements (id),
                    FOREIGN KEY (enhancement_id_2) REFERENCES enhancements (id)
                )
            ''')
            
            # Splintering alerts table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS splintering_alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    alert_type TEXT,
                    description TEXT,
                    affected_enhancements TEXT,
                    severity TEXT,
                    suggested_action TEXT,
                    created_date TEXT,
                    resolved_date TEXT,
                    status TEXT
                )
            ''')
            
            # Inventory scans table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS inventory_scans (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scan_date TEXT,
                    enhancements_found INTEGER,
                    new_enhancements INTEGER,
                    harmony_issues INTEGER,
                    splintering_alerts INTEGER,
                    scan_duration_seconds REAL
                )
            ''')

    def load_config(self) -> Dict[str, Any]:
        """Load inventory configuration with defaults"""
        default_config = {
            "scan_intervals": {
                "full_scan": 86400,      # 24 hours
                "quick_scan": 3600,      # 1 hour
                "harmony_check": 7200    # 2 hours
            },
            "detection_thresholds": {
                "min_file_size": 100,           # Minimum file size to consider
                "min_lines_of_code": 10,        # Minimum LOC for code files
                "duplicate_threshold": 0.8,     # Similarity threshold for duplicates
                "harmony_threshold": 0.6        # Minimum harmony score
            },
            "scan_locations": [
                "scripts/",
                "tools/",
                "plugins/",
                "coordination/",
                "memory/",
                ".claude/",
                ".swarm/",
                ".hive-mind/",
                "project-state-framework/"
            ],
            "file_patterns": {
                "python": ["*.py"],
                "shell": ["*.sh", "*.zsh", "*.bash"],
                "config": ["*.json", "*.yaml", "*.yml", "*.toml"],
                "docs": ["*.md", "*.rst", "*.txt"]
            },
            "exclusions": [
                "__pycache__/",
                ".git/",
                "node_modules/",
                "*.pyc",
                "*.log"
            ]
        }
        
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r') as f:
                    user_config = json.load(f)
                    default_config.update(user_config)
            except Exception as e:
                print(f"Error loading config: {e}")
                
        return default_config

    def scan_for_enhancements(self) -> List[Dict[str, Any]]:
        """Scan project for Claude Code enhancements and plugins"""
        print("🔍 Scanning for Claude Code enhancements...")
        
        enhancements = []
        scan_locations = [self.project_root / loc for loc in self.config['scan_locations']]
        
        for location in scan_locations:
            if not location.exists():
                continue
                
            print(f"  📂 Scanning: {location}")
            
            # Scan all files in location
            for pattern_type, patterns in self.config['file_patterns'].items():
                for pattern in patterns:
                    for file_path in location.rglob(pattern):
                        if self.should_exclude_file(file_path):
                            continue
                            
                        enhancement = self.analyze_file_for_enhancements(file_path, pattern_type)
                        if enhancement:
                            enhancements.append(enhancement)
        
        print(f"  ✅ Found {len(enhancements)} potential enhancements")
        return enhancements

    def should_exclude_file(self, file_path: Path) -> bool:
        """Check if file should be excluded from scanning"""
        file_str = str(file_path)
        
        for exclusion in self.config['exclusions']:
            if exclusion.endswith('/'):
                if exclusion[:-1] in file_str:
                    return True
            else:
                if file_str.endswith(exclusion):
                    return True
        
        # Check file size
        try:
            if file_path.stat().st_size < self.config['detection_thresholds']['min_file_size']:
                return True
        except:
            return True
            
        return False

    def analyze_file_for_enhancements(self, file_path: Path, file_type: str) -> Optional[Dict[str, Any]]:
        """Analyze a file to determine if it's a Claude Code enhancement"""
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                
            # Skip if too small
            lines = content.split('\n')
            if len(lines) < self.config['detection_thresholds']['min_lines_of_code']:
                return None
            
            # Analyze content for enhancement indicators
            enhancement_indicators = self.detect_enhancement_indicators(content, file_path)
            
            if not enhancement_indicators['is_enhancement']:
                return None
            
            # Generate file hash for change detection
            file_hash = hashlib.md5(content.encode()).hexdigest()
            
            # Extract functionality description
            functionality = enhancement_indicators['description']
            
            # Determine category
            category = self.categorize_enhancement(file_path, content, enhancement_indicators)
            
            # Calculate initial harmony score
            harmony_score = self.calculate_initial_harmony_score(file_path, content, category)
            
            enhancement = {
                'id': self.generate_enhancement_id(file_path),
                'name': file_path.name,
                'category': category,
                'file_path': str(file_path.relative_to(self.project_root)),
                'description': enhancement_indicators['description'],
                'functionality': functionality,
                'dependencies': enhancement_indicators['dependencies'],
                'created_date': datetime.fromtimestamp(file_path.stat().st_ctime).isoformat(),
                'last_modified': datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
                'file_hash': file_hash,
                'status': 'active',
                'harmony_score': harmony_score
            }
            
            return enhancement
            
        except Exception as e:
            print(f"  ⚠️ Error analyzing {file_path}: {e}")
            return None

    def detect_enhancement_indicators(self, content: str, file_path: Path) -> Dict[str, Any]:
        """Detect if content represents a Claude Code enhancement"""
        
        indicators = {
            'is_enhancement': False,
            'description': '',
            'dependencies': [],
            'enhancement_type': '',
            'claude_integration': False
        }
        
        content_lower = content.lower()
        
        # Claude-specific indicators
        claude_keywords = [
            'claude', 'anthropic', 'claude code', 'claude-code',
            'mcp', 'swarm', 'coordination', 'hive-mind',
            'cost tracking', 'token usage', 'automation',
            'project state', 'diary', 'todo', 'hook'
        ]
        
        keyword_count = sum(1 for keyword in claude_keywords if keyword in content_lower)
        
        # Enhancement patterns
        enhancement_patterns = [
            r'class.*(?:System|Manager|Integration|Tracker|Monitor)',
            r'def.*(?:track|monitor|analyze|coordinate|automate)',
            r'#!/usr/bin/env python3.*(?:automation|tracking|integration)',
            r'@hook|pre-tool|post-tool',
            r'mcp__.*__',
            r'claude.*(?:integration|hook|automation)'
        ]
        
        pattern_matches = sum(1 for pattern in enhancement_patterns 
                            if re.search(pattern, content, re.IGNORECASE))
        
        # Check for specific functionality
        functionality_indicators = {
            'cost_tracking': ['cost', 'billing', 'token', 'usage', 'euro', 'pricing'],
            'automation': ['daemon', 'background', 'scheduler', 'automated', 'periodic'],
            'integration': ['hook', 'integration', 'claude code', 'mcp'],
            'monitoring': ['monitor', 'status', 'dashboard', 'metrics', 'alert'],
            'project_management': ['project', 'state', 'diary', 'todo', 'session']
        }
        
        detected_functionality = []
        for func_type, keywords in functionality_indicators.items():
            if any(keyword in content_lower for keyword in keywords):
                detected_functionality.append(func_type)
        
        # Determine if it's an enhancement
        if (keyword_count >= 2 or pattern_matches >= 1 or 
            len(detected_functionality) >= 2 or
            'claude' in str(file_path).lower()):
            indicators['is_enhancement'] = True
            
        # Extract description from docstring or comments
        description = self.extract_description(content)
        indicators['description'] = description
        
        # Extract dependencies
        dependencies = self.extract_dependencies(content)
        indicators['dependencies'] = dependencies
        
        # Set enhancement type
        if detected_functionality:
            indicators['enhancement_type'] = detected_functionality[0]
        
        # Check Claude integration
        indicators['claude_integration'] = any(keyword in content_lower 
                                             for keyword in ['claude', 'hook', 'mcp'])
        
        return indicators

    def extract_description(self, content: str) -> str:
        """Extract description from file content"""
        lines = content.split('\n')
        
        # Try to find docstring
        for i, line in enumerate(lines[:20]):  # Check first 20 lines
            line = line.strip()
            if line.startswith('"""') or line.startswith("'''"):
                # Multi-line docstring
                docstring_lines = []
                for j in range(i + 1, min(i + 10, len(lines))):
                    if lines[j].strip().endswith('"""') or lines[j].strip().endswith("'''"):
                        break
                    docstring_lines.append(lines[j].strip())
                return ' '.join(docstring_lines)
            elif line.startswith('#') and len(line) > 5:
                # Comment description
                return line[1:].strip()
        
        # Fallback: try to find class or function with docstring
        try:
            tree = ast.parse(content)
            for node in ast.walk(tree):
                if isinstance(node, (ast.ClassDef, ast.FunctionDef)):
                    if ast.get_docstring(node):
                        return ast.get_docstring(node).split('\n')[0]
        except:
            pass
        
        return "Claude Code enhancement"

    def extract_dependencies(self, content: str) -> List[str]:
        """Extract dependencies from file content"""
        dependencies = []
        
        # Python imports
        import_patterns = [
            r'import\s+(\w+)',
            r'from\s+(\w+)\s+import',
            r'from\s+([\w.]+)\s+import'
        ]
        
        for pattern in import_patterns:
            matches = re.findall(pattern, content)
            dependencies.extend(matches)
        
        # Remove standard library modules
        standard_modules = {
            'os', 'sys', 'json', 'sqlite3', 'datetime', 'pathlib',
            're', 'subprocess', 'ast', 'hashlib', 'importlib'
        }
        
        dependencies = [dep for dep in dependencies if dep not in standard_modules]
        
        return list(set(dependencies))

    def categorize_enhancement(self, file_path: Path, content: str, indicators: Dict) -> str:
        """Categorize the enhancement based on content and location"""
        
        content_lower = content.lower()
        path_str = str(file_path).lower()
        
        # Score each category
        category_scores = {}
        
        for category, info in self.enhancement_categories.items():
            score = 0.0
            
            # Pattern matching in content
            for pattern in info['patterns']:
                if pattern in content_lower:
                    score += 1.0
            
            # Location matching
            for location in info['locations']:
                if location.lower() in path_str:
                    score += 2.0
            
            # Core file matching
            for core_file in info['core_files']:
                if core_file.lower() in file_path.name.lower():
                    score += 3.0
            
            category_scores[category] = score
        
        # Return category with highest score, or 'general' if none
        if category_scores:
            best_category = max(category_scores, key=category_scores.get)
            if category_scores[best_category] > 0:
                return best_category
        
        return 'general'

    def calculate_initial_harmony_score(self, file_path: Path, content: str, category: str) -> float:
        """Calculate initial harmony score for the enhancement"""
        
        score = 1.0  # Start with perfect harmony
        
        # Check for proper location
        expected_locations = self.enhancement_categories.get(category, {}).get('locations', [])
        path_str = str(file_path)
        
        location_match = any(loc in path_str for loc in expected_locations)
        if not location_match:
            score -= 0.2  # Reduce score for unexpected location
        
        # Check for proper naming conventions
        if category == 'cost_tracking' and 'cost' not in file_path.name.lower():
            score -= 0.1
        elif category == 'automation' and 'automation' not in file_path.name.lower():
            score -= 0.1
        
        # Check for dependencies alignment
        content_lower = content.lower()
        if 'sqlite3' in content_lower and category not in ['cost_tracking', 'automation']:
            score -= 0.1  # Database usage outside expected categories
        
        # Check for documentation
        if len(content.split('\n')) > 50 and '"""' not in content:
            score -= 0.15  # Large file without docstrings
        
        return max(0.0, score)

    def generate_enhancement_id(self, file_path: Path) -> str:
        """Generate unique ID for enhancement"""
        rel_path = str(file_path.relative_to(self.project_root))
        return hashlib.md5(rel_path.encode()).hexdigest()[:12]

    def check_harmony_and_splintering(self, enhancements: List[Dict]) -> Dict[str, Any]:
        """Check for harmony issues and potential splintering"""
        
        print("🔍 Checking for harmony issues and splintering...")
        
        harmony_report = {
            'harmony_issues': [],
            'splintering_alerts': [],
            'duplicate_functionality': [],
            'integration_opportunities': [],
            'overall_harmony_score': 0.0
        }
        
        # Group enhancements by category
        by_category = {}
        for enhancement in enhancements:
            category = enhancement['category']
            if category not in by_category:
                by_category[category] = []
            by_category[category].append(enhancement)
        
        # Check for splintering within categories
        for category, items in by_category.items():
            if len(items) > 1:
                splintering_issues = self.detect_category_splintering(category, items)
                harmony_report['splintering_alerts'].extend(splintering_issues)
        
        # Check for duplicate functionality
        duplicates = self.detect_duplicate_functionality(enhancements)
        harmony_report['duplicate_functionality'] = duplicates
        
        # Check for integration opportunities
        opportunities = self.identify_integration_opportunities(enhancements)
        harmony_report['integration_opportunities'] = opportunities
        
        # Calculate overall harmony score
        total_score = sum(e['harmony_score'] for e in enhancements)
        harmony_report['overall_harmony_score'] = total_score / len(enhancements) if enhancements else 0.0
        
        print(f"  📊 Overall harmony score: {harmony_report['overall_harmony_score']:.2f}")
        print(f"  ⚠️ Found {len(harmony_report['splintering_alerts'])} splintering alerts")
        print(f"  🔄 Found {len(harmony_report['duplicate_functionality'])} duplicate functionality issues")
        
        return harmony_report

    def detect_category_splintering(self, category: str, items: List[Dict]) -> List[Dict]:
        """Detect splintering within a category"""
        
        splintering_alerts = []
        
        # Check for multiple files doing similar things
        functionality_groups = {}
        for item in items:
            func_key = self.extract_functionality_key(item['functionality'])
            if func_key not in functionality_groups:
                functionality_groups[func_key] = []
            functionality_groups[func_key].append(item)
        
        # Alert on groups with multiple implementations
        for func_key, group_items in functionality_groups.items():
            if len(group_items) > 1:
                alert = {
                    'alert_type': 'category_splintering',
                    'description': f"Multiple implementations of {func_key} in {category}",
                    'affected_enhancements': [item['id'] for item in group_items],
                    'severity': 'medium' if len(group_items) == 2 else 'high',
                    'suggested_action': f"Consider consolidating {func_key} functionality",
                    'created_date': datetime.now().isoformat(),
                    'status': 'active'
                }
                splintering_alerts.append(alert)
        
        return splintering_alerts

    def extract_functionality_key(self, functionality: str) -> str:
        """Extract key functionality identifier"""
        # Simplified functionality extraction
        func_lower = functionality.lower()
        
        key_functions = [
            'cost tracking', 'billing', 'monitoring',
            'automation', 'daemon', 'scheduling',
            'project management', 'state tracking',
            'integration', 'hooks', 'coordination'
        ]
        
        for key_func in key_functions:
            if key_func in func_lower:
                return key_func
        
        return 'general'

    def detect_duplicate_functionality(self, enhancements: List[Dict]) -> List[Dict]:
        """Detect duplicate or overlapping functionality"""
        
        duplicates = []
        
        for i, enhancement1 in enumerate(enhancements):
            for j, enhancement2 in enumerate(enhancements[i+1:], i+1):
                similarity = self.calculate_functionality_similarity(enhancement1, enhancement2)
                
                if similarity > self.config['detection_thresholds']['duplicate_threshold']:
                    duplicate = {
                        'enhancement_1': enhancement1['id'],
                        'enhancement_2': enhancement2['id'],
                        'similarity_score': similarity,
                        'overlap_description': self.describe_overlap(enhancement1, enhancement2),
                        'consolidation_suggestion': self.suggest_consolidation(enhancement1, enhancement2)
                    }
                    duplicates.append(duplicate)
        
        return duplicates

    def calculate_functionality_similarity(self, e1: Dict, e2: Dict) -> float:
        """Calculate similarity between two enhancements"""
        
        # Compare descriptions
        desc1_words = set(e1['description'].lower().split())
        desc2_words = set(e2['description'].lower().split())
        
        if desc1_words and desc2_words:
            desc_similarity = len(desc1_words & desc2_words) / len(desc1_words | desc2_words)
        else:
            desc_similarity = 0.0
        
        # Compare functionality
        func1_words = set(e1['functionality'].lower().split())
        func2_words = set(e2['functionality'].lower().split())
        
        if func1_words and func2_words:
            func_similarity = len(func1_words & func2_words) / len(func1_words | func2_words)
        else:
            func_similarity = 0.0
        
        # Compare category
        category_similarity = 1.0 if e1['category'] == e2['category'] else 0.0
        
        # Compare dependencies
        deps1 = set(e1['dependencies'])
        deps2 = set(e2['dependencies'])
        
        if deps1 and deps2:
            deps_similarity = len(deps1 & deps2) / len(deps1 | deps2)
        else:
            deps_similarity = 0.0
        
        # Weighted average
        similarity = (
            desc_similarity * 0.3 +
            func_similarity * 0.4 +
            category_similarity * 0.2 +
            deps_similarity * 0.1
        )
        
        return similarity

    def describe_overlap(self, e1: Dict, e2: Dict) -> str:
        """Describe the overlap between two enhancements"""
        
        overlaps = []
        
        if e1['category'] == e2['category']:
            overlaps.append(f"Same category: {e1['category']}")
        
        # Check for common keywords
        desc1_words = set(e1['description'].lower().split())
        desc2_words = set(e2['description'].lower().split())
        common_desc = desc1_words & desc2_words
        
        if common_desc:
            overlaps.append(f"Common description terms: {', '.join(list(common_desc)[:3])}")
        
        # Check for common dependencies
        deps1 = set(e1['dependencies'])
        deps2 = set(e2['dependencies'])
        common_deps = deps1 & deps2
        
        if common_deps:
            overlaps.append(f"Shared dependencies: {', '.join(list(common_deps)[:3])}")
        
        return '; '.join(overlaps) if overlaps else "Similar functionality patterns"

    def suggest_consolidation(self, e1: Dict, e2: Dict) -> str:
        """Suggest how to consolidate two similar enhancements"""
        
        # Determine which is newer/better
        e1_date = datetime.fromisoformat(e1['last_modified'])
        e2_date = datetime.fromisoformat(e2['last_modified'])
        
        if e1_date > e2_date:
            primary, secondary = e1, e2
        else:
            primary, secondary = e2, e1
        
        suggestions = []
        
        # Location-based suggestions
        if primary['category'] == secondary['category']:
            expected_locations = self.enhancement_categories.get(primary['category'], {}).get('locations', [])
            if expected_locations:
                suggestions.append(f"Consolidate into {expected_locations[0]} directory")
        
        # Functionality-based suggestions
        if 'tracking' in primary['functionality'].lower() and 'tracking' in secondary['functionality'].lower():
            suggestions.append("Merge tracking functionality into single comprehensive tracker")
        elif 'automation' in primary['functionality'].lower():
            suggestions.append("Integrate into main automation system")
        elif 'integration' in primary['functionality'].lower():
            suggestions.append("Merge into unified Claude Code integration layer")
        
        # Default suggestion
        if not suggestions:
            suggestions.append(f"Consider merging {secondary['name']} functionality into {primary['name']}")
        
        return '; '.join(suggestions)

    def identify_integration_opportunities(self, enhancements: List[Dict]) -> List[Dict]:
        """Identify opportunities for better integration"""
        
        opportunities = []
        
        # Look for enhancements that could benefit from integration
        categories = set(e['category'] for e in enhancements)
        
        # Check for missing integration between related categories
        integration_patterns = [
            (['cost_tracking', 'monitoring'], 'Cost tracking could be integrated with monitoring dashboard'),
            (['automation', 'project_management'], 'Automation could update project management automatically'),
            (['claude_integration', 'monitoring'], 'Claude integration could provide monitoring data'),
            (['intelligence', 'project_management'], 'Intelligence system could enhance project analysis')
        ]
        
        for pattern_categories, suggestion in integration_patterns:
            if all(cat in categories for cat in pattern_categories):
                # Check if integration already exists
                integration_exists = self.check_existing_integration(enhancements, pattern_categories)
                
                if not integration_exists:
                    opportunity = {
                        'categories': pattern_categories,
                        'description': suggestion,
                        'priority': 'high' if len(pattern_categories) == 2 else 'medium',
                        'implementation_suggestion': self.suggest_integration_implementation(
                            enhancements, pattern_categories
                        )
                    }
                    opportunities.append(opportunity)
        
        return opportunities

    def check_existing_integration(self, enhancements: List[Dict], categories: List[str]) -> bool:
        """Check if integration already exists between categories"""
        
        # Look for enhancements that reference multiple categories
        for enhancement in enhancements:
            desc_lower = enhancement['description'].lower()
            func_lower = enhancement['functionality'].lower()
            
            category_mentions = sum(1 for cat in categories 
                                  if any(pattern in desc_lower or pattern in func_lower 
                                       for pattern in self.enhancement_categories[cat]['patterns']))
            
            if category_mentions >= len(categories):
                return True
        
        return False

    def suggest_integration_implementation(self, enhancements: List[Dict], categories: List[str]) -> str:
        """Suggest how to implement integration between categories"""
        
        # Find representative enhancements from each category
        category_reps = {}
        for enhancement in enhancements:
            if enhancement['category'] in categories:
                if enhancement['category'] not in category_reps:
                    category_reps[enhancement['category']] = enhancement
        
        suggestions = []
        
        if 'cost_tracking' in categories and 'monitoring' in categories:
            suggestions.append("Add cost metrics to monitoring dashboard")
        
        if 'automation' in categories and 'project_management' in categories:
            suggestions.append("Configure automation to update project state files automatically")
        
        if 'claude_integration' in categories and 'monitoring' in categories:
            suggestions.append("Integrate Claude hook data into monitoring system")
        
        # Default suggestion
        if not suggestions:
            cat_names = ', '.join(categories)
            suggestions.append(f"Create integration layer between {cat_names}")
        
        return '; '.join(suggestions)

    def store_inventory_results(self, enhancements: List[Dict], harmony_report: Dict):
        """Store inventory results in database"""
        
        with sqlite3.connect(self.inventory_db) as conn:
            # Store/update enhancements
            for enhancement in enhancements:
                conn.execute('''
                    INSERT OR REPLACE INTO enhancements 
                    (id, name, category, file_path, description, functionality, dependencies,
                     created_date, last_modified, file_hash, status, harmony_score)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    enhancement['id'], enhancement['name'], enhancement['category'],
                    enhancement['file_path'], enhancement['description'], 
                    enhancement['functionality'], json.dumps(enhancement['dependencies']),
                    enhancement['created_date'], enhancement['last_modified'],
                    enhancement['file_hash'], enhancement['status'], enhancement['harmony_score']
                ))
            
            # Store splintering alerts
            for alert in harmony_report['splintering_alerts']:
                conn.execute('''
                    INSERT INTO splintering_alerts 
                    (alert_type, description, affected_enhancements, severity, 
                     suggested_action, created_date, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    alert['alert_type'], alert['description'], 
                    json.dumps(alert['affected_enhancements']), alert['severity'],
                    alert['suggested_action'], alert['created_date'], alert['status']
                ))
            
            # Store harmony relationships
            for duplicate in harmony_report['duplicate_functionality']:
                conn.execute('''
                    INSERT OR REPLACE INTO harmony_relationships 
                    (enhancement_id_1, enhancement_id_2, relationship_type, overlap_score,
                     integration_suggestion, discovered_date)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    duplicate['enhancement_1'], duplicate['enhancement_2'],
                    'duplicate_functionality', duplicate['similarity_score'],
                    duplicate['consolidation_suggestion'], datetime.now().isoformat()
                ))
            
            # Store scan record
            conn.execute('''
                INSERT INTO inventory_scans 
                (scan_date, enhancements_found, new_enhancements, harmony_issues, splintering_alerts)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                datetime.now().isoformat(), len(enhancements), 
                0,  # TODO: Calculate new enhancements
                len(harmony_report['duplicate_functionality']),
                len(harmony_report['splintering_alerts'])
            ))

    def run_full_inventory_scan(self) -> Dict[str, Any]:
        """Run complete inventory scan"""
        
        start_time = datetime.now()
        print("🚀 Starting full Claude Code enhancement inventory scan...")
        
        # Scan for enhancements
        enhancements = self.scan_for_enhancements()
        
        # Check harmony and splintering
        harmony_report = self.check_harmony_and_splintering(enhancements)
        
        # Store results
        self.store_inventory_results(enhancements, harmony_report)
        
        # Generate report
        scan_duration = (datetime.now() - start_time).total_seconds()
        
        report = {
            'scan_timestamp': start_time.isoformat(),
            'scan_duration_seconds': scan_duration,
            'enhancements_found': len(enhancements),
            'harmony_score': harmony_report['overall_harmony_score'],
            'splintering_alerts': len(harmony_report['splintering_alerts']),
            'duplicate_functionality': len(harmony_report['duplicate_functionality']),
            'integration_opportunities': len(harmony_report['integration_opportunities']),
            'enhancements': enhancements,
            'harmony_report': harmony_report
        }
        
        print(f"✅ Inventory scan completed in {scan_duration:.1f} seconds")
        return report

def main():
    """Run inventory scan"""
    inventory = AutoInventorySystem()
    report = inventory.run_full_inventory_scan()
    
    print("\n📊 Inventory Summary:")
    print(f"  Enhancements found: {report['enhancements_found']}")
    print(f"  Harmony score: {report['harmony_score']:.2f}")
    print(f"  Splintering alerts: {report['splintering_alerts']}")
    print(f"  Integration opportunities: {report['integration_opportunities']}")

if __name__ == "__main__":
    main()