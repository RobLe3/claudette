#!/usr/bin/env python3
"""
Claude Plugin Manager
Advanced plugin management with dependency resolution and conflict detection
"""

import json
import os
import sys
import subprocess
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import importlib.util

class ClaudePluginManager:
    def __init__(self):
        self.home_dir = Path.home()
        self.claude_dir = self.home_dir / ".claude"
        self.project_claude_dir = Path(".claude")
        self.settings_file = self.claude_dir / "settings.json"
        self.project_settings_file = self.project_claude_dir / "settings.json"
        # Support both old and new plugin locations
        self.plugins_dir = Path("plugins")
        self.new_plugins_dir = Path("core") / "plugins"  # Future plugin location
        self.legacy_plugins_dir = Path("archive") / "legacy" / "plugins"
        self.backup_dir = self.claude_dir / "backups"
        
        # Ensure directories exist
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        self.discovered_plugins = {}
        self.plugin_dependencies = {}
        self.plugin_conflicts = {}
    
    def log(self, message: str, level: str = "INFO"):
        """Log message with timestamp"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
    
    def command_exists(self, command: str) -> bool:
        """Check if command exists in PATH"""
        return shutil.which(command) is not None
    
    def run_command(self, command: List[str], timeout: int = 30) -> Tuple[bool, str, str]:
        """Run command and return success, stdout, stderr"""
        try:
            result = subprocess.run(
                command, 
                capture_output=True, 
                text=True, 
                timeout=timeout
            )
            return result.returncode == 0, result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            return False, "", "Command timed out"
        except Exception as e:
            return False, "", str(e)
    
    def discover_npm_plugins(self) -> Dict[str, Dict]:
        """Discover NPM-based plugins"""
        plugins = {}
        
        # Check for Claude Flow
        if self.command_exists("npx"):
            success, stdout, stderr = self.run_command(["npx", "claude-flow@alpha", "--version"])
            if success:
                plugins["claude-flow"] = {
                    "type": "npm",
                    "command": "npx claude-flow@alpha mcp start",
                    "version": stdout.strip(),
                    "status": "available"
                }
                self.log("✅ Found claude-flow plugin")
            
            success, stdout, stderr = self.run_command(["npx", "ruv-swarm@latest", "--version"])
            if success:
                plugins["ruv-swarm"] = {
                    "type": "npm", 
                    "command": "npx ruv-swarm@latest mcp start",
                    "version": stdout.strip(),
                    "status": "available"
                }
                self.log("✅ Found ruv-swarm plugin")
        
        return plugins
    
    def discover_local_plugins(self) -> Dict[str, Dict]:
        """Discover local plugins in plugins/ directory"""
        plugins = {}
        
        if not self.plugins_dir.exists():
            return plugins
        
        for plugin_path in self.plugins_dir.iterdir():
            if plugin_path.is_dir():
                plugin_name = plugin_path.name
                
                # Check for MCP server files
                mcp_js = plugin_path / "mcp-server.js"
                mcp_py = plugin_path / "mcp-server.py"
                package_json = plugin_path / "package.json"
                
                if mcp_js.exists():
                    plugins[plugin_name] = {
                        "type": "local_js",
                        "command": f"node {mcp_js}",
                        "path": str(plugin_path),
                        "status": "available"
                    }
                    self.log(f"✅ Found local JS plugin: {plugin_name}")
                
                elif mcp_py.exists():
                    plugins[plugin_name] = {
                        "type": "local_python",
                        "command": f"python3 {mcp_py}",
                        "path": str(plugin_path),
                        "status": "available"
                    }
                    self.log(f"✅ Found local Python plugin: {plugin_name}")
                
                # Load plugin metadata if available
                if package_json.exists():
                    try:
                        with open(package_json) as f:
                            metadata = json.load(f)
                            if plugin_name in plugins:
                                plugins[plugin_name].update({
                                    "version": metadata.get("version", "unknown"),
                                    "description": metadata.get("description", ""),
                                    "dependencies": metadata.get("claudeDependencies", []),
                                    "conflicts": metadata.get("claudeConflicts", [])
                                })
                    except Exception as e:
                        self.log(f"⚠️ Could not read metadata for {plugin_name}: {e}", "WARNING")
        
        return plugins
    
    def discover_python_plugins(self) -> Dict[str, Dict]:
        """Discover Python package plugins"""
        plugins = {}
        
        # Common Python MCP packages to check
        python_packages = [
            "claude-mcp-server",
            "anthropic-mcp",
            "mcp-server-tools"
        ]
        
        for package in python_packages:
            try:
                spec = importlib.util.find_spec(package)
                if spec is not None:
                    plugins[package] = {
                        "type": "python_package",
                        "command": f"python3 -m {package}",
                        "status": "available"
                    }
                    self.log(f"✅ Found Python package: {package}")
            except ImportError:
                continue
        
        return plugins
    
    def discover_all_plugins(self) -> Dict[str, Dict]:
        """Discover all available plugins"""
        self.log("🔍 Discovering plugins...")
        
        all_plugins = {}
        all_plugins.update(self.discover_npm_plugins())
        all_plugins.update(self.discover_local_plugins())
        all_plugins.update(self.discover_python_plugins())
        
        self.discovered_plugins = all_plugins
        self.log(f"📦 Discovered {len(all_plugins)} plugin(s)")
        
        return all_plugins
    
    def validate_plugin(self, plugin_name: str, plugin_info: Dict) -> bool:
        """Validate that a plugin is functional"""
        self.log(f"🔍 Validating plugin: {plugin_name}")
        
        command = plugin_info["command"]
        
        # Try to run with --help or --version
        for flag in ["--help", "--version", "-h", "-v"]:
            cmd_parts = command.split() + [flag]
            success, stdout, stderr = self.run_command(cmd_parts, timeout=10)
            if success:
                self.log(f"✅ Plugin {plugin_name} validated")
                return True
        
        self.log(f"⚠️ Plugin {plugin_name} validation failed", "WARNING")
        return False
    
    def check_dependencies(self) -> Dict[str, List[str]]:
        """Check plugin dependencies"""
        issues = {}
        
        for plugin_name, plugin_info in self.discovered_plugins.items():
            dependencies = plugin_info.get("dependencies", [])
            missing_deps = []
            
            for dep in dependencies:
                if dep not in self.discovered_plugins:
                    missing_deps.append(dep)
            
            if missing_deps:
                issues[plugin_name] = missing_deps
        
        return issues
    
    def check_conflicts(self) -> Dict[str, List[str]]:
        """Check for plugin conflicts"""
        conflicts = {}
        
        for plugin_name, plugin_info in self.discovered_plugins.items():
            conflict_list = plugin_info.get("conflicts", [])
            active_conflicts = []
            
            for conflict in conflict_list:
                if conflict in self.discovered_plugins:
                    active_conflicts.append(conflict)
            
            if active_conflicts:
                conflicts[plugin_name] = active_conflicts
        
        return conflicts
    
    def backup_settings(self) -> str:
        """Backup current settings"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = self.backup_dir / f"settings_{timestamp}.json"
        
        if self.settings_file.exists():
            shutil.copy2(self.settings_file, backup_file)
            self.log(f"💾 Settings backed up to: {backup_file}")
        
        if self.project_settings_file.exists():
            project_backup = self.backup_dir / f"project_settings_{timestamp}.json"
            shutil.copy2(self.project_settings_file, project_backup)
            self.log(f"💾 Project settings backed up to: {project_backup}")
        
        return str(backup_file)
    
    def load_settings(self, settings_file: Path) -> Dict:
        """Load settings JSON file"""
        if not settings_file.exists():
            return {"enabledMcpjsonServers": []}
        
        try:
            with open(settings_file) as f:
                return json.load(f)
        except Exception as e:
            self.log(f"❌ Error loading settings: {e}", "ERROR")
            return {"enabledMcpjsonServers": []}
    
    def save_settings(self, settings_file: Path, settings: Dict):
        """Save settings JSON file"""
        try:
            with open(settings_file, 'w') as f:
                json.dump(settings, f, indent=2)
            self.log(f"💾 Settings saved to: {settings_file}")
        except Exception as e:
            self.log(f"❌ Error saving settings: {e}", "ERROR")
    
    def update_claude_settings(self, plugins_to_enable: List[str]):
        """Update Claude Code settings with enabled plugins"""
        
        # Update project settings if it exists
        if self.project_settings_file.exists():
            settings = self.load_settings(self.project_settings_file)
            settings["enabledMcpjsonServers"] = plugins_to_enable
            self.save_settings(self.project_settings_file, settings)
    
    def add_mcp_servers(self, plugins_to_add: List[str]):
        """Add MCP servers to Claude Code using CLI"""
        self.log("🔌 Adding MCP servers to Claude Code...")
        
        # Get current MCP servers
        success, stdout, stderr = self.run_command(["claude", "mcp", "list"])
        current_servers = set()
        if success:
            for line in stdout.strip().split('\n'):
                if ':' in line:
                    server_name = line.split(':')[0].strip()
                    current_servers.add(server_name)
        
        for plugin_name in plugins_to_add:
            if plugin_name in current_servers:
                self.log(f"ℹ️ MCP server '{plugin_name}' already configured")
                continue
            
            plugin_info = self.discovered_plugins[plugin_name]
            command_parts = plugin_info["command"].split()
            
            cmd = ["claude", "mcp", "add", plugin_name] + command_parts
            success, stdout, stderr = self.run_command(cmd)
            
            if success:
                self.log(f"✅ Added MCP server: {plugin_name}")
            else:
                self.log(f"❌ Failed to add MCP server {plugin_name}: {stderr}", "ERROR")
    
    def health_check(self) -> Dict[str, str]:
        """Perform comprehensive health check"""
        self.log("🏥 Performing health check...")
        
        health_status = {}
        
        # Check Claude Code CLI
        if self.command_exists("claude"):
            health_status["claude_cli"] = "✅ Available"
        else:
            health_status["claude_cli"] = "❌ Not found"
        
        # Check MCP servers
        success, stdout, stderr = self.run_command(["claude", "mcp", "list"])
        if success:
            health_status["mcp_integration"] = "✅ Working"
            health_status["mcp_servers"] = stdout.strip()
        else:
            health_status["mcp_integration"] = "❌ Issues detected"
        
        # Check individual plugins
        for plugin_name, plugin_info in self.discovered_plugins.items():
            if self.validate_plugin(plugin_name, plugin_info):
                health_status[f"plugin_{plugin_name}"] = "✅ Functional"
            else:
                health_status[f"plugin_{plugin_name}"] = "⚠️ Issues"
        
        return health_status
    
    def autoload_plugins(self, enable_all: bool = False):
        """Main autoload function"""
        self.log("🚀 Starting plugin autoload...")
        
        # Backup current settings
        self.backup_settings()
        
        # Discover all plugins
        plugins = self.discover_all_plugins()
        
        if not plugins:
            self.log("⚠️ No plugins discovered", "WARNING")
            return
        
        # Check dependencies and conflicts
        dep_issues = self.check_dependencies()
        conflicts = self.check_conflicts()
        
        if dep_issues:
            self.log("⚠️ Dependency issues found:", "WARNING")
            for plugin, missing in dep_issues.items():
                self.log(f"  {plugin} missing: {', '.join(missing)}")
        
        if conflicts:
            self.log("⚠️ Conflicts detected:", "WARNING")
            for plugin, conflicting in conflicts.items():
                self.log(f"  {plugin} conflicts with: {', '.join(conflicting)}")
        
        # Determine plugins to enable
        plugins_to_enable = []
        
        if enable_all:
            plugins_to_enable = list(plugins.keys())
        else:
            # Enable safe plugins (no conflicts, dependencies met)
            for plugin_name in plugins:
                if plugin_name not in dep_issues and plugin_name not in conflicts:
                    if self.validate_plugin(plugin_name, plugins[plugin_name]):
                        plugins_to_enable.append(plugin_name)
        
        self.log(f"📦 Enabling {len(plugins_to_enable)} plugin(s): {', '.join(plugins_to_enable)}")
        
        # Add MCP servers
        if plugins_to_enable:
            self.add_mcp_servers(plugins_to_enable)
            self.update_claude_settings(plugins_to_enable)
        
        # Final health check
        health = self.health_check()
        
        self.log("🎉 Plugin autoload complete!")
        return health

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Claude Plugin Manager")
    parser.add_argument("command", nargs="?", default="autoload", 
                       choices=["autoload", "discover", "health", "backup", "validate"],
                       help="Command to execute")
    parser.add_argument("--enable-all", action="store_true", 
                       help="Enable all discovered plugins (ignore conflicts)")
    parser.add_argument("--plugin", help="Specific plugin to operate on")
    
    args = parser.parse_args()
    
    manager = ClaudePluginManager()
    
    if args.command == "autoload":
        manager.autoload_plugins(enable_all=args.enable_all)
    elif args.command == "discover":
        plugins = manager.discover_all_plugins()
        print(json.dumps(plugins, indent=2))
    elif args.command == "health":
        health = manager.health_check()
        for check, status in health.items():
            print(f"{check}: {status}")
    elif args.command == "backup":
        backup_file = manager.backup_settings()
        print(f"Settings backed up to: {backup_file}")
    elif args.command == "validate":
        plugins = manager.discover_all_plugins()
        if args.plugin:
            if args.plugin in plugins:
                result = manager.validate_plugin(args.plugin, plugins[args.plugin])
                print(f"{args.plugin}: {'✅ Valid' if result else '❌ Invalid'}")
            else:
                print(f"Plugin '{args.plugin}' not found")
        else:
            for name, info in plugins.items():
                result = manager.validate_plugin(name, info)
                print(f"{name}: {'✅ Valid' if result else '❌ Invalid'}")

if __name__ == "__main__":
    main()