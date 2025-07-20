#!/usr/bin/env python3
"""
Enhancement Index Manager - Comprehensive indexing of local and foreign enhancements
Automatically loads and verifies on Claude startup
"""

import json
import sqlite3
import hashlib
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional
import sys
import re

class EnhancementIndexManager:
    """Manage comprehensive index of all Claude Code enhancements"""
    
    def __init__(self):
        self.claude_dir = Path.home() / '.claude'
        self.project_dir = Path('/Users/roble/Documents/Python/claude_flow')
        self.index_db = self.claude_dir / 'enhancement_index.db'
        self.registry_file = self.claude_dir / 'enhancement_registry.json'
        
        # Ensure directories exist
        self.claude_dir.mkdir(parents=True, exist_ok=True)
        
        self._init_database()
        self._init_registry()
        
    def _init_database(self):
        """Initialize enhancement index database"""
        with sqlite3.connect(self.index_db) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS enhancements (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    category TEXT NOT NULL,
                    source TEXT NOT NULL,
                    version TEXT,
                    file_path TEXT,
                    file_hash TEXT,
                    last_verified TEXT,
                    status TEXT DEFAULT 'active',
                    dependencies TEXT,
                    description TEXT,
                    installation_date TEXT,
                    last_modified TEXT,
                    size_bytes INTEGER,
                    health_score REAL DEFAULT 1.0
                )
            ''')
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS enhancement_sources (
                    source_id TEXT PRIMARY KEY,
                    source_name TEXT NOT NULL,
                    source_type TEXT NOT NULL,
                    repository_url TEXT,
                    local_path TEXT,
                    last_sync TEXT,
                    version TEXT,
                    trusted BOOLEAN DEFAULT 1,
                    health_check_url TEXT
                )
            ''')
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS verification_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT,
                    enhancement_id TEXT,
                    verification_type TEXT,
                    status TEXT,
                    details TEXT,
                    performance_ms REAL
                )
            ''')
    
    def _init_registry(self):
        """Initialize enhancement registry file"""
        if not self.registry_file.exists():
            default_registry = {
                'version': '1.0.0',
                'last_updated': datetime.now().isoformat(),
                'enhancement_sources': {},
                'categories': {
                    'local_automation': 'Custom automation scripts',
                    'cost_tracking': 'Cost monitoring and optimization',
                    'openai_integration': 'OpenAI ChatGPT integration',
                    'session_optimization': 'Extended session management',
                    'foreign_mcp': 'External MCP servers',
                    'foreign_tools': 'External tool integrations',
                    'foreign_plugins': 'Third-party plugins'
                },
                'startup_verification_enabled': True,
                'auto_discovery_enabled': True
            }
            
            with open(self.registry_file, 'w') as f:
                json.dump(default_registry, f, indent=2)
    
    def discover_local_enhancements(self) -> List[Dict[str, Any]]:
        """Discover all local enhancements in the project"""
        enhancements = []
        
        # Define search patterns for different enhancement types
        patterns = {
            'automation_scripts': {
                'paths': [self.project_dir / 'scripts' / 'automation'],
                'extensions': ['.py'],
                'category': 'local_automation'
            },
            'cost_tracking': {
                'paths': [self.project_dir / 'scripts' / 'cost-tracking'],
                'extensions': ['.py'],
                'category': 'cost_tracking'
            },
            'tools': {
                'paths': [self.project_dir / 'tools'],
                'extensions': ['.py', '.sh', '.zsh'],
                'category': 'local_tools'
            },
            'coordination': {
                'paths': [self.project_dir / 'coordination'],
                'extensions': ['.py', '.json'],
                'category': 'swarm_coordination'
            },
            'memory': {
                'paths': [self.project_dir / 'memory'],
                'extensions': ['.py', '.json'],
                'category': 'memory_management'
            },
            'plugins': {
                'paths': [self.project_dir / 'plugins'],
                'extensions': ['.py', '.js'],
                'category': 'local_plugins'
            }
        }
        
        for enhancement_type, config in patterns.items():
            for search_path in config['paths']:
                if search_path.exists():
                    for ext in config['extensions']:
                        for file_path in search_path.rglob(f'*{ext}'):
                            if file_path.is_file() and not file_path.name.startswith('.'):
                                enhancement = self._analyze_file_enhancement(
                                    file_path, config['category'], 'local'
                                )
                                if enhancement:
                                    enhancements.append(enhancement)
        
        return enhancements
    
    def discover_foreign_enhancements(self) -> List[Dict[str, Any]]:
        """Discover foreign enhancements (MCP servers, external tools)"""
        enhancements = []
        
        # Check MCP servers
        mcp_enhancements = self._discover_mcp_servers()
        enhancements.extend(mcp_enhancements)
        
        # Check npm global packages related to Claude
        npm_enhancements = self._discover_npm_enhancements()
        enhancements.extend(npm_enhancements)
        
        # Check known external repositories
        repo_enhancements = self._discover_repo_enhancements()
        enhancements.extend(repo_enhancements)
        
        return enhancements
    
    def _analyze_file_enhancement(self, file_path: Path, category: str, source: str) -> Optional[Dict[str, Any]]:
        """Analyze a file to extract enhancement metadata"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Calculate file hash
            file_hash = hashlib.sha256(content.encode()).hexdigest()[:16]
            
            # Extract metadata from file content
            name = file_path.stem
            version = self._extract_version(content)
            description = self._extract_description(content)
            dependencies = self._extract_dependencies(content)
            
            # Get file stats
            stat = file_path.stat()
            
            return {
                'id': f"{source}_{category}_{name}_{file_hash[:8]}",
                'name': name,
                'type': 'script' if file_path.suffix == '.py' else 'tool',
                'category': category,
                'source': source,
                'version': version,
                'file_path': str(file_path),
                'file_hash': file_hash,
                'last_verified': datetime.now().isoformat(),
                'status': 'active',
                'dependencies': json.dumps(dependencies),
                'description': description,
                'installation_date': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                'last_modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                'size_bytes': stat.st_size,
                'health_score': 1.0
            }
            
        except Exception as e:
            print(f"Error analyzing {file_path}: {e}")
            return None
    
    def _extract_version(self, content: str) -> str:
        """Extract version from file content"""
        # Look for version patterns
        patterns = [
            r'__version__\s*=\s*["\']([^"\']+)["\']',
            r'version\s*=\s*["\']([^"\']+)["\']',
            r'VERSION\s*=\s*["\']([^"\']+)["\']',
            r'@version\s+([^\s]+)',
            r'Version:\s*([^\s]+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return '1.0.0'  # default version
    
    def _extract_description(self, content: str) -> str:
        """Extract description from file content"""
        # Look for docstring or comments
        docstring_match = re.search(r'"""([^"]+)"""', content, re.DOTALL)
        if docstring_match:
            return docstring_match.group(1).strip().split('\n')[0]
        
        # Look for first comment
        comment_match = re.search(r'^#\s*(.+)', content, re.MULTILINE)
        if comment_match:
            return comment_match.group(1).strip()
        
        return 'No description available'
    
    def _extract_dependencies(self, content: str) -> List[str]:
        """Extract dependencies from file content"""
        dependencies = []
        
        # Python imports
        import_matches = re.findall(r'^(?:from|import)\s+([^\s]+)', content, re.MULTILINE)
        for match in import_matches:
            if '.' not in match and match not in ['sys', 'os', 'json', 'sqlite3', 'datetime', 'pathlib']:
                dependencies.append(match)
        
        # Requirements in comments
        req_matches = re.findall(r'#\s*requires?:?\s*([^\n]+)', content, re.IGNORECASE)
        for match in req_matches:
            dependencies.extend([dep.strip() for dep in match.split(',')])
        
        return list(set(dependencies))
    
    def _discover_mcp_servers(self) -> List[Dict[str, Any]]:
        """Discover MCP servers"""
        enhancements = []
        
        try:
            # Get Claude MCP list
            result = subprocess.run(['claude', 'mcp', 'list'], 
                                  capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                for line in lines:
                    if ':' in line and not line.startswith('No MCP'):
                        server_name, command = line.split(':', 1)
                        server_name = server_name.strip()
                        command = command.strip()
                        
                        enhancement = {
                            'id': f"mcp_{server_name}_{hashlib.sha256(command.encode()).hexdigest()[:8]}",
                            'name': server_name,
                            'type': 'mcp_server',
                            'category': 'foreign_mcp',
                            'source': 'external',
                            'version': self._get_mcp_version(command),
                            'file_path': command,
                            'file_hash': hashlib.sha256(command.encode()).hexdigest()[:16],
                            'last_verified': datetime.now().isoformat(),
                            'status': 'active',
                            'dependencies': json.dumps([]),
                            'description': f"MCP server: {server_name}",
                            'installation_date': datetime.now().isoformat(),
                            'last_modified': datetime.now().isoformat(),
                            'size_bytes': len(command),
                            'health_score': 1.0
                        }
                        enhancements.append(enhancement)
                        
        except Exception as e:
            print(f"Error discovering MCP servers: {e}")
        
        return enhancements
    
    def _discover_npm_enhancements(self) -> List[Dict[str, Any]]:
        """Discover npm-based enhancements"""
        enhancements = []
        
        try:
            # Get global npm packages
            result = subprocess.run(['npm', 'list', '-g', '--depth=0'], 
                                  capture_output=True, text=True, timeout=15)
            
            if result.returncode == 0:
                lines = result.stdout.split('\n')
                for line in lines:
                    # Look for Claude-related packages
                    if any(keyword in line.lower() for keyword in ['claude', 'anthropic', 'mcp']):
                        parts = line.split()
                        if len(parts) >= 2:
                            package_info = parts[-1]
                            if '@' in package_info:
                                name, version = package_info.split('@', 1)
                                
                                enhancement = {
                                    'id': f"npm_{name.replace('/', '_')}_{version}",
                                    'name': name,
                                    'type': 'npm_package',
                                    'category': 'foreign_npm',
                                    'source': 'npm',
                                    'version': version,
                                    'file_path': f"npm global: {name}",
                                    'file_hash': hashlib.sha256(f"{name}@{version}".encode()).hexdigest()[:16],
                                    'last_verified': datetime.now().isoformat(),
                                    'status': 'active',
                                    'dependencies': json.dumps([]),
                                    'description': f"NPM package: {name}",
                                    'installation_date': datetime.now().isoformat(),
                                    'last_modified': datetime.now().isoformat(),
                                    'size_bytes': 0,
                                    'health_score': 1.0
                                }
                                enhancements.append(enhancement)
                                
        except Exception as e:
            print(f"Error discovering npm enhancements: {e}")
        
        return enhancements
    
    def _discover_repo_enhancements(self) -> List[Dict[str, Any]]:
        """Discover enhancements from known repositories"""
        enhancements = []
        
        # Known external enhancement sources
        known_sources = {
            'ruv-swarm': {
                'repo': 'https://github.com/ruvnet/ruv-swarm',
                'category': 'foreign_swarm',
                'description': 'RUV Swarm coordination system'
            },
            'claude-flow': {
                'repo': 'https://github.com/ruvnet/claude-flow', 
                'category': 'foreign_flow',
                'description': 'Claude Flow automation framework'
            }
        }
        
        for source_name, config in known_sources.items():
            # Check if source is referenced in our system
            if self._is_source_referenced(source_name):
                enhancement = {
                    'id': f"repo_{source_name}_{datetime.now().strftime('%Y%m%d')}",
                    'name': source_name,
                    'type': 'repository',
                    'category': config['category'],
                    'source': 'github',
                    'version': 'latest',
                    'file_path': config['repo'],
                    'file_hash': hashlib.sha256(config['repo'].encode()).hexdigest()[:16],
                    'last_verified': datetime.now().isoformat(),
                    'status': 'referenced',
                    'dependencies': json.dumps([]),
                    'description': config['description'],
                    'installation_date': datetime.now().isoformat(),
                    'last_modified': datetime.now().isoformat(),
                    'size_bytes': 0,
                    'health_score': 0.8  # Lower score for external repos
                }
                enhancements.append(enhancement)
        
        return enhancements
    
    def _get_mcp_version(self, command: str) -> str:
        """Extract version from MCP command"""
        if '@' in command:
            # Extract version from npm package reference
            parts = command.split('@')
            if len(parts) > 1:
                version_part = parts[-1].split()[0]
                return version_part
        return 'latest'
    
    def _is_source_referenced(self, source_name: str) -> bool:
        """Check if a source is referenced in our system"""
        # Check in our project files
        search_paths = [
            self.project_dir / 'scripts',
            self.project_dir / 'tools',
            self.claude_dir
        ]
        
        for search_path in search_paths:
            if search_path.exists():
                for file_path in search_path.rglob('*'):
                    if file_path.is_file() and file_path.suffix in ['.py', '.md', '.json']:
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                                if source_name.lower() in content.lower():
                                    return True
                        except:
                            continue
        return False
    
    def rebuild_index(self) -> Dict[str, Any]:
        """Rebuild complete enhancement index"""
        start_time = datetime.now()
        
        # Clear existing index
        with sqlite3.connect(self.index_db) as conn:
            conn.execute('DELETE FROM enhancements')
            conn.execute('DELETE FROM verification_logs')
        
        # Discover all enhancements
        local_enhancements = self.discover_local_enhancements()
        foreign_enhancements = self.discover_foreign_enhancements()
        
        all_enhancements = local_enhancements + foreign_enhancements
        
        # Insert into database
        with sqlite3.connect(self.index_db) as conn:
            for enhancement in all_enhancements:
                placeholders = ', '.join(['?' for _ in enhancement.keys()])
                columns = ', '.join(enhancement.keys())
                
                conn.execute(
                    f'INSERT OR REPLACE INTO enhancements ({columns}) VALUES ({placeholders})',
                    list(enhancement.values())
                )
        
        # Log the rebuild
        duration = (datetime.now() - start_time).total_seconds() * 1000
        self._log_verification('index_rebuild', 'success', 
                             f"Rebuilt index with {len(all_enhancements)} enhancements", duration)
        
        return {
            'timestamp': datetime.now().isoformat(),
            'total_enhancements': len(all_enhancements),
            'local_enhancements': len(local_enhancements),
            'foreign_enhancements': len(foreign_enhancements),
            'categories': self._get_category_counts(),
            'duration_ms': duration,
            'health_status': 'healthy'
        }
    
    def verify_enhancements(self) -> Dict[str, Any]:
        """Verify all enhancements are healthy and accessible"""
        verification_results = {
            'timestamp': datetime.now().isoformat(),
            'total_checked': 0,
            'healthy': 0,
            'issues': 0,
            'missing': 0,
            'details': [],
            'overall_health': 0.0
        }
        
        with sqlite3.connect(self.index_db) as conn:
            cursor = conn.execute('SELECT * FROM enhancements')
            enhancements = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
        
        for row in enhancements:
            enhancement = dict(zip(columns, row))
            verification_results['total_checked'] += 1
            
            health_check = self._verify_single_enhancement(enhancement)
            verification_results['details'].append(health_check)
            
            if health_check['status'] == 'healthy':
                verification_results['healthy'] += 1
            elif health_check['status'] == 'missing':
                verification_results['missing'] += 1
            else:
                verification_results['issues'] += 1
        
        # Calculate overall health
        if verification_results['total_checked'] > 0:
            verification_results['overall_health'] = verification_results['healthy'] / verification_results['total_checked']
        
        return verification_results
    
    def _verify_single_enhancement(self, enhancement: Dict[str, Any]) -> Dict[str, Any]:
        """Verify a single enhancement"""
        result = {
            'id': enhancement['id'],
            'name': enhancement['name'],
            'status': 'healthy',
            'issues': []
        }
        
        # Check file existence for local files
        if enhancement['source'] == 'local' and enhancement['file_path']:
            file_path = Path(enhancement['file_path'])
            if not file_path.exists():
                result['status'] = 'missing'
                result['issues'].append('File not found')
                return result
            
            # Check file hash for integrity
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                current_hash = hashlib.sha256(content.encode()).hexdigest()[:16]
                
                if current_hash != enhancement['file_hash']:
                    result['status'] = 'modified'
                    result['issues'].append('File hash mismatch - content changed')
            except Exception as e:
                result['status'] = 'error'
                result['issues'].append(f'Cannot read file: {str(e)}')
        
        # Check MCP server availability
        elif enhancement['type'] == 'mcp_server':
            try:
                # Quick MCP availability check
                mcp_result = subprocess.run(['claude', 'mcp', 'list'], 
                                          capture_output=True, text=True, timeout=5)
                if enhancement['name'] not in mcp_result.stdout:
                    result['status'] = 'missing'
                    result['issues'].append('MCP server not configured')
            except Exception:
                result['status'] = 'error'
                result['issues'].append('Cannot verify MCP server')
        
        return result
    
    def _log_verification(self, enhancement_id: str, status: str, details: str, performance_ms: float):
        """Log verification result"""
        with sqlite3.connect(self.index_db) as conn:
            conn.execute('''
                INSERT INTO verification_logs 
                (timestamp, enhancement_id, verification_type, status, details, performance_ms)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                datetime.now().isoformat(),
                enhancement_id,
                'startup_verification',
                status,
                details,
                performance_ms
            ))
    
    def _get_category_counts(self) -> Dict[str, int]:
        """Get count of enhancements by category"""
        with sqlite3.connect(self.index_db) as conn:
            cursor = conn.execute('''
                SELECT category, COUNT(*) 
                FROM enhancements 
                GROUP BY category
            ''')
            return dict(cursor.fetchall())
    
    def generate_startup_report(self) -> str:
        """Generate startup verification report"""
        # Rebuild index
        index_result = self.rebuild_index()
        
        # Verify enhancements
        verification_result = self.verify_enhancements()
        
        report = f"""
╭─────────────────────────────────────────────────────────╮
│            🔍 ENHANCEMENT INDEX - STARTUP REPORT         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📊 INDEX STATUS                                        │
│     Total Enhancements: {index_result['total_enhancements']:>3}                      │
│     Local Components: {index_result['local_enhancements']:>5}                        │
│     Foreign Components: {index_result['foreign_enhancements']:>3}                      │
│     Index Rebuild: {index_result['duration_ms']:>6.1f}ms                    │
│                                                         │
│  🔍 VERIFICATION RESULTS                                │
│     Healthy: {verification_result['healthy']:>3} | Issues: {verification_result['issues']:>3} | Missing: {verification_result['missing']:>3}    │
│     Overall Health: {verification_result['overall_health']:>6.1%}                      │
│     Status: {'🟢 EXCELLENT' if verification_result['overall_health'] > 0.9 else '🟡 GOOD' if verification_result['overall_health'] > 0.7 else '🔴 ISSUES'}                           │
│                                                         │
│  📋 CATEGORIES                                          │
"""
        
        categories = index_result['categories']
        for category, count in sorted(categories.items()):
            category_display = category.replace('_', ' ').title()[:35]
            report += f"│     {category_display:<35}: {count:>3}    │\n"
        
        report += "│                                                         │\n"
        
        # Show critical issues if any
        critical_issues = [d for d in verification_result['details'] if d['status'] != 'healthy']
        if critical_issues:
            report += "│  ⚠️  CRITICAL ISSUES                                    │\n"
            for issue in critical_issues[:3]:  # Show top 3
                name = issue['name'][:35] + '...' if len(issue['name']) > 35 else issue['name']
                status = issue['status'].upper()
                report += f"│     {name:<35}: {status:>8}    │\n"
            if len(critical_issues) > 3:
                report += f"│     ... and {len(critical_issues) - 3} more issues                        │\n"
            report += "│                                                         │\n"
        
        report += "╰─────────────────────────────────────────────────────────╯"
        
        return report

def main():
    """Main CLI interface"""
    manager = EnhancementIndexManager()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "rebuild":
            result = manager.rebuild_index()
            print(json.dumps(result, indent=2))
            
        elif command == "verify":
            result = manager.verify_enhancements()
            print(json.dumps(result, indent=2))
            
        elif command == "startup":
            print(manager.generate_startup_report())
            
        elif command == "local":
            enhancements = manager.discover_local_enhancements()
            print(f"Found {len(enhancements)} local enhancements")
            for enh in enhancements[:5]:
                print(f"  • {enh['name']} ({enh['category']})")
                
        elif command == "foreign":
            enhancements = manager.discover_foreign_enhancements()
            print(f"Found {len(enhancements)} foreign enhancements")
            for enh in enhancements:
                print(f"  • {enh['name']} ({enh['category']})")
                
        else:
            print("Commands: rebuild, verify, startup, local, foreign")
    else:
        print(manager.generate_startup_report())

if __name__ == "__main__":
    main()