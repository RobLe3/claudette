#!/usr/bin/env python3
"""
Security Audit Script for Claude Flow Repository
Run before committing to ensure no sensitive data is exposed
"""

import os
import re
import json
from pathlib import Path

class SecurityAuditor:
    def __init__(self, repo_path="."):
        self.repo_path = Path(repo_path)
        self.issues = []
        
        # Patterns to detect sensitive data
        self.sensitive_patterns = {
            'api_keys': [
                r'sk-[a-zA-Z0-9]{48,}',      # OpenAI API keys
                r'claude-[a-zA-Z0-9-]{48,}', # Claude API keys  
                r'mistral-[a-zA-Z0-9-]{48,}', # Mistral API keys
                r'["\']AKIA[0-9A-Z]{16}["\']', # AWS access keys
            ],
            'credentials': [
                r'password\s*[=:]\s*["\'][^"\']{3,}["\']',
                r'secret\s*[=:]\s*["\'][^"\']{8,}["\']',
                r'token\s*[=:]\s*["\'][^"\']{8,}["\']',
            ],
            'hardcoded_paths': [
                r'/Users/[^/\s]+',  # Hardcoded user paths
                r'C:\\Users\\[^\\s]+',  # Windows user paths
            ],
            'private_info': [
                r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?!\.(com|org|net|edu|gov))',  # Email addresses (except common domains in examples)
                r'\b\d{3}-\d{2}-\d{4}\b',  # SSN-like patterns
            ]
        }
        
        # Files to check
        self.file_extensions = ['.py', '.yaml', '.yml', '.json', '.md', '.txt', '.sh', '.js', '.ts']
        
        # Files/directories to skip
        self.skip_patterns = [
            '.git/', '__pycache__/', '.pytest_cache/', 'node_modules/',
            '.venv/', 'venv/', 'build/', 'dist/', '*.egg-info/',
            '.template', 'example', 'sample', 'test_', 'mock_'
        ]
    
    def should_skip(self, file_path):
        """Check if file should be skipped"""
        path_str = str(file_path)
        return any(pattern in path_str for pattern in self.skip_patterns)
    
    def scan_file(self, file_path):
        """Scan a single file for sensitive data"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                
            for category, patterns in self.sensitive_patterns.items():
                for pattern in patterns:
                    matches = re.finditer(pattern, content, re.IGNORECASE)
                    for match in matches:
                        # Calculate line number
                        line_num = content[:match.start()].count('\n') + 1
                        
                        self.issues.append({
                            'file': str(file_path),
                            'line': line_num,
                            'category': category,
                            'pattern': pattern,
                            'match': match.group()[:50] + '...' if len(match.group()) > 50 else match.group(),
                            'severity': self.get_severity(category)
                        })
                        
        except Exception as e:
            print(f"⚠️  Error scanning {file_path}: {e}")
    
    def get_severity(self, category):
        """Get severity level for category"""
        severity_map = {
            'api_keys': 'CRITICAL',
            'credentials': 'HIGH', 
            'hardcoded_paths': 'MEDIUM',
            'private_info': 'LOW'
        }
        return severity_map.get(category, 'LOW')
    
    def scan_repository(self):
        """Scan entire repository"""
        print("🔍 Starting security audit...")
        
        for file_path in self.repo_path.rglob('*'):
            if file_path.is_file() and not self.should_skip(file_path):
                if file_path.suffix in self.file_extensions:
                    self.scan_file(file_path)
        
        self.check_git_tracked_files()
    
    def check_git_tracked_files(self):
        """Check if sensitive files are tracked by git"""
        try:
            import subprocess
            result = subprocess.run(['git', 'ls-files'], 
                                 capture_output=True, text=True, cwd=self.repo_path)
            
            if result.returncode == 0:
                tracked_files = result.stdout.strip().split('\n')
                sensitive_files = []
                
                for file_name in tracked_files:
                    if any(pattern in file_name.lower() for pattern in 
                          ['secret', 'key', 'password', 'token', 'credential', '.env']):
                        if not any(safe in file_name for safe in ['template', 'example', 'sample']):
                            sensitive_files.append(file_name)
                
                if sensitive_files:
                    for file_name in sensitive_files:
                        self.issues.append({
                            'file': file_name,
                            'line': 0,
                            'category': 'git_tracking',
                            'pattern': 'sensitive_filename',
                            'match': file_name,
                            'severity': 'HIGH'
                        })
                        
        except Exception as e:
            print(f"⚠️  Could not check git status: {e}")
    
    def generate_report(self):
        """Generate security audit report"""
        if not self.issues:
            print("✅ Security audit passed - no issues found!")
            return True
        
        # Group issues by severity
        by_severity = {}
        for issue in self.issues:
            severity = issue['severity']
            if severity not in by_severity:
                by_severity[severity] = []
            by_severity[severity].append(issue)
        
        print(f"\n🚨 Security audit found {len(self.issues)} issues:")
        print("=" * 60)
        
        for severity in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
            if severity in by_severity:
                issues = by_severity[severity]
                print(f"\n{severity} ({len(issues)} issues):")
                print("-" * 40)
                
                for issue in issues:
                    print(f"📁 {issue['file']}:{issue['line']}")
                    print(f"   Category: {issue['category']}")
                    print(f"   Match: {issue['match']}")
                    print()
        
        # Recommendations
        print("\n🛠️  RECOMMENDATIONS:")
        if any(issue['severity'] in ['CRITICAL', 'HIGH'] for issue in self.issues):
            print("❌ DO NOT COMMIT - Critical security issues found")
            print("1. Remove or mask all API keys and credentials")
            print("2. Use environment variables instead of hardcoded values")
            print("3. Add sensitive files to .gitignore")
            print("4. Review all hardcoded paths for privacy concerns")
            return False
        else:
            print("⚠️  Review recommended - Minor issues found")
            print("Consider addressing medium/low priority issues before commit")
            return True
    
    def save_report(self, output_file="security_audit_report.json"):
        """Save detailed report to JSON file"""
        report = {
            'timestamp': str(Path.cwd()),
            'total_issues': len(self.issues),
            'issues_by_severity': {},
            'issues': self.issues
        }
        
        for issue in self.issues:
            severity = issue['severity']
            if severity not in report['issues_by_severity']:
                report['issues_by_severity'][severity] = 0
            report['issues_by_severity'][severity] += 1
        
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"📄 Detailed report saved to {output_file}")

def main():
    auditor = SecurityAuditor()
    auditor.scan_repository()
    
    is_safe = auditor.generate_report()
    auditor.save_report()
    
    exit_code = 0 if is_safe else 1
    exit(exit_code)

if __name__ == "__main__":
    main()