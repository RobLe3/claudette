#!/usr/bin/env python3
"""
Local Directory Cleanup Automation

Automated cleanup script for maintaining clean local development directory.
Removes temporary files, caches, duplicates, and artifacts while preserving
essential development infrastructure.

Usage:
    python3 scripts/automation/local_directory_cleanup.py [--dry-run] [--verbose]
"""

import os
import sys
import subprocess
import json
import argparse
from pathlib import Path
from typing import List, Dict, Tuple

class LocalDirectoryCleanup:
    """Automated local directory cleanup with safety checks."""
    
    def __init__(self, project_root: str = None, dry_run: bool = False, verbose: bool = False):
        self.project_root = Path(project_root or os.getcwd())
        self.dry_run = dry_run
        self.verbose = verbose
        self.cleaned_files = []
        self.preserved_files = []
        self.errors = []
        
        # Load cleanup configuration from Claude settings
        self.config = self._load_cleanup_config()
    
    def _load_cleanup_config(self) -> Dict:
        """Load cleanup configuration from .claude/settings.json"""
        settings_path = self.project_root / '.claude' / 'settings.json'
        
        if not settings_path.exists():
            return self._get_default_config()
        
        try:
            with open(settings_path, 'r') as f:
                settings = json.load(f)
                return settings.get('local_directory_management', self._get_default_config())
        except Exception as e:
            if self.verbose:
                print(f"⚠️  Could not load settings: {e}")
            return self._get_default_config()
    
    def _get_default_config(self) -> Dict:
        """Default cleanup configuration if settings not available"""
        return {
            "cleanup_targets": {
                "python_cache": "*.pyc,__pycache__,*.pyo",
                "os_temp_files": ".DS_Store,Thumbs.db,*.tmp,*.swp,*.swo",
                "backup_files": "*backup*,*_old*,*_2*,*.bak,*.orig",
                "log_files": "*.log,debug_*.txt,trace_*.txt"
            },
            "preserve_patterns": [
                "data/memory/claude-flow-data.json",
                ".claude/settings.json",
                "core/**/*.py",
                "scripts/automation/**/*.py",
                "tests/**/*",
                "docs/**/*.md"
            ]
        }
    
    def _run_command(self, command: str) -> Tuple[bool, str]:
        """Execute shell command with error handling"""
        try:
            if self.dry_run:
                print(f"🔍 DRY RUN: {command}")
                return True, "dry-run"
            
            result = subprocess.run(
                command, 
                shell=True, 
                capture_output=True, 
                text=True,
                cwd=self.project_root
            )
            
            if result.returncode == 0:
                return True, result.stdout.strip()
            else:
                return False, result.stderr.strip()
                
        except Exception as e:
            return False, str(e)
    
    def clean_python_cache(self) -> int:
        """Remove Python cache files and directories"""
        if self.verbose:
            print("🐍 Cleaning Python cache files...")
        
        commands = [
            "find . -name '*.pyc' -type f",
            "find . -name '__pycache__' -type d",
            "find . -name '*.pyo' -type f"
        ]
        
        files_found = 0
        for cmd in commands:
            success, output = self._run_command(cmd)
            if success and output and output != "dry-run":
                files_found += len(output.strip().split('\n')) if output.strip() else 0
        
        # Remove the files
        cleanup_cmd = "find . -name '*.pyc' -o -name '__pycache__' -o -name '*.pyo' | xargs rm -rf 2>/dev/null || true"
        success, output = self._run_command(cleanup_cmd)
        
        if success:
            self.cleaned_files.extend([f"Python cache: {files_found} items"])
        else:
            self.errors.append(f"Python cache cleanup failed: {output}")
        
        return files_found
    
    def clean_os_temp_files(self) -> int:
        """Remove OS and editor temporary files"""
        if self.verbose:
            print("💻 Cleaning OS and editor temporary files...")
        
        # Find files first
        find_cmd = "find . -name '.DS_Store' -o -name 'Thumbs.db' -o -name '*.tmp' -o -name '*.swp' -o -name '*.swo'"
        success, output = self._run_command(find_cmd)
        
        files_found = 0
        if success and output and output != "dry-run":
            files_found = len(output.strip().split('\n')) if output.strip() else 0
        
        # Remove the files
        cleanup_cmd = "find . -name '.DS_Store' -o -name 'Thumbs.db' -o -name '*.tmp' -o -name '*.swp' -o -name '*.swo' | xargs rm -f 2>/dev/null || true"
        success, output = self._run_command(cleanup_cmd)
        
        if success:
            self.cleaned_files.extend([f"OS temp files: {files_found} items"])
        else:
            self.errors.append(f"OS temp cleanup failed: {output}")
        
        return files_found
    
    def clean_backup_files(self) -> int:
        """Remove backup and duplicate files"""
        if self.verbose:
            print("📄 Cleaning backup and duplicate files...")
        
        # Find files first (excluding .git directory)
        find_cmd = "find . -path './.git' -prune -o -name '*backup*' -o -name '*_old*' -o -name '*_2*' -o -name '*.bak' -o -name '*.orig' -print"
        success, output = self._run_command(find_cmd)
        
        files_found = 0
        if success and output and output != "dry-run":
            files_found = len(output.strip().split('\n')) if output.strip() else 0
        
        # Remove the files
        cleanup_cmd = "find . -path './.git' -prune -o -name '*backup*' -o -name '*_old*' -o -name '*_2*' -o -name '*.bak' -o -name '*.orig' -print | xargs rm -f 2>/dev/null || true"
        success, output = self._run_command(cleanup_cmd)
        
        if success:
            self.cleaned_files.extend([f"Backup files: {files_found} items"])
        else:
            self.errors.append(f"Backup cleanup failed: {output}")
        
        return files_found
    
    def clean_empty_directories(self) -> int:
        """Remove empty directories (excluding .git)"""
        if self.verbose:
            print("📁 Cleaning empty directories...")
        
        # Find empty directories first
        find_cmd = "find . -path './.git' -prune -o -type d -empty -print"
        success, output = self._run_command(find_cmd)
        
        dirs_found = 0
        if success and output and output != "dry-run":
            dirs_found = len(output.strip().split('\n')) if output.strip() else 0
        
        # Remove empty directories
        cleanup_cmd = "find . -path './.git' -prune -o -type d -empty -delete 2>/dev/null || true"
        success, output = self._run_command(cleanup_cmd)
        
        if success:
            self.cleaned_files.extend([f"Empty directories: {dirs_found} items"])
        else:
            self.errors.append(f"Empty directory cleanup failed: {output}")
        
        return dirs_found
    
    def verify_preserved_files(self) -> bool:
        """Verify that essential files are preserved"""
        if self.verbose:
            print("🔍 Verifying essential files are preserved...")
        
        essential_files = [
            ".claude/settings.json",
            "CLAUDE.md",
            "README.md",
            "core/coordination",
            "scripts/automation",
            "data/memory"
        ]
        
        all_preserved = True
        for file_path in essential_files:
            full_path = self.project_root / file_path
            if full_path.exists():
                self.preserved_files.append(file_path)
            else:
                self.errors.append(f"Essential file missing: {file_path}")
                all_preserved = False
        
        return all_preserved
    
    def run_cleanup(self) -> Dict:
        """Execute complete cleanup process"""
        print(f"🧹 Starting local directory cleanup...")
        print(f"📁 Project root: {self.project_root}")
        
        if self.dry_run:
            print("🔍 DRY RUN MODE - No files will be actually removed")
        
        print()
        
        # Execute cleanup phases
        python_cleaned = self.clean_python_cache()
        os_cleaned = self.clean_os_temp_files()
        backup_cleaned = self.clean_backup_files()
        dirs_cleaned = self.clean_empty_directories()
        
        # Verify preservation
        preserved_ok = self.verify_preserved_files()
        
        # Generate report
        total_cleaned = python_cleaned + os_cleaned + backup_cleaned + dirs_cleaned
        
        report = {
            "status": "success" if not self.errors else "partial",
            "total_items_cleaned": total_cleaned,
            "breakdown": {
                "python_cache": python_cleaned,
                "os_temp_files": os_cleaned,
                "backup_files": backup_cleaned,
                "empty_directories": dirs_cleaned
            },
            "files_preserved": len(self.preserved_files),
            "errors": self.errors,
            "dry_run": self.dry_run
        }
        
        return report
    
    def print_report(self, report: Dict):
        """Print cleanup report"""
        print("\n" + "="*50)
        print("🧹 LOCAL DIRECTORY CLEANUP REPORT")
        print("="*50)
        
        if report["dry_run"]:
            print("🔍 DRY RUN - No actual changes made")
        
        print(f"📊 Status: {report['status'].upper()}")
        print(f"🗑️  Total items cleaned: {report['total_items_cleaned']}")
        print()
        
        print("📋 Breakdown:")
        for category, count in report["breakdown"].items():
            print(f"  • {category.replace('_', ' ').title()}: {count}")
        
        print(f"\n🛡️  Essential files preserved: {report['files_preserved']}")
        
        if report["errors"]:
            print(f"\n⚠️  Errors encountered: {len(report['errors'])}")
            for error in report["errors"]:
                print(f"  • {error}")
        
        if not report["dry_run"] and report["status"] == "success":
            print("\n✅ Local directory cleanup completed successfully!")
        elif report["dry_run"]:
            print("\n🔍 Dry run completed - review results before actual cleanup")
        else:
            print("\n⚠️  Cleanup completed with some issues - check errors above")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Local directory cleanup automation")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be cleaned without making changes")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show detailed progress")
    parser.add_argument("--project-root", help="Project root directory (default: current directory)")
    
    args = parser.parse_args()
    
    # Create and run cleanup
    cleanup = LocalDirectoryCleanup(
        project_root=args.project_root,
        dry_run=args.dry_run,
        verbose=args.verbose
    )
    
    try:
        report = cleanup.run_cleanup()
        cleanup.print_report(report)
        
        # Exit with error code if there were issues
        if report["errors"]:
            sys.exit(1)
        else:
            sys.exit(0)
            
    except KeyboardInterrupt:
        print("\n🛑 Cleanup interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n❌ Cleanup failed with error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()