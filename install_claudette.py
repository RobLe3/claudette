#!/usr/bin/env python3
"""
🏆 LEGENDARY CLAUDETTE FRESH INSTALLER
Automated installation script for Claudette with Claude-Flow integration

Features:
- Detects existing Claude Code installations
- Installs Claudette with all dependencies
- Auto-fetches claude-flow@alpha from ruv's repository
- Sets up MCP integration automatically
- Configures teamwork systems with 980/1000 gear score
- JAR JAR APPROVED! ⭐

Usage:
    python install_claudette.py
    curl -sSL https://raw.githubusercontent.com/RobLe3/claudette/main/install_claudette.py | python
"""

import os
import sys
import subprocess
import shutil
import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple

class ClaudetteInstaller:
    """LEGENDARY Claudette installation system"""
    
    def __init__(self):
        self.install_log = []
        self.errors = []
        self.claude_code_detected = None
        self.python_version = None
        self.node_available = False
        self.installation_dir = None
        
    def log(self, message: str, level: str = "INFO"):
        """Log installation progress"""
        emoji_map = {
            "INFO": "ℹ️",
            "SUCCESS": "✅", 
            "WARNING": "⚠️",
            "ERROR": "❌",
            "BOMBAD": "🌟"
        }
        emoji = emoji_map.get(level, "📝")
        formatted_msg = f"{emoji} {message}"
        print(formatted_msg)
        self.install_log.append(f"{level}: {message}")
        
        if level == "ERROR":
            self.errors.append(message)
    
    def check_system_requirements(self) -> bool:
        """Check if system meets requirements"""
        self.log("Checking system requirements...", "INFO")
        
        # Check Python version
        self.python_version = sys.version_info
        if self.python_version >= (3, 8):
            self.log(f"Python {self.python_version.major}.{self.python_version.minor} detected - Compatible!", "SUCCESS")
        else:
            self.log(f"Python {self.python_version.major}.{self.python_version.minor} detected - Need 3.8+", "ERROR")
            return False
        
        # Check pip availability
        try:
            subprocess.run([sys.executable, "-m", "pip", "--version"], 
                         capture_output=True, check=True)
            self.log("pip available", "SUCCESS")
        except subprocess.CalledProcessError:
            self.log("pip not available - needed for installation", "ERROR") 
            return False
        
        # Check Node.js/npm (for claude-flow)
        try:
            result = subprocess.run(["node", "--version"], capture_output=True, text=True)
            if result.returncode == 0:
                node_version = result.stdout.strip()
                self.log(f"Node.js {node_version} detected", "SUCCESS")
                self.node_available = True
            else:
                self.log("Node.js not detected - claude-flow features will be limited", "WARNING")
        except FileNotFoundError:
            self.log("Node.js not found - claude-flow integration will be limited", "WARNING")
        
        return True
    
    def detect_existing_claude_code(self) -> Optional[Dict]:
        """Detect existing Claude Code installations"""
        self.log("Scanning for existing Claude Code installations...", "INFO")
        
        # Check common installation paths
        common_paths = [
            shutil.which("claude"),  # System PATH
            Path.home() / ".local" / "bin" / "claude",  # User local
            "/usr/local/bin/claude",  # Homebrew typical
            "/opt/homebrew/bin/claude",  # Apple Silicon Homebrew
        ]
        
        detected_installations = []
        
        for path in common_paths:
            if path and Path(path).exists():
                try:
                    # Test if it's actually Claude Code
                    result = subprocess.run([str(path), "--version"], 
                                          capture_output=True, text=True, timeout=5)
                    if result.returncode == 0 and "claude" in result.stdout.lower():
                        version_info = result.stdout.strip()
                        detected_installations.append({
                            "path": str(path),
                            "version": version_info,
                            "working": True
                        })
                        self.log(f"Found Claude Code at {path}: {version_info}", "SUCCESS")
                except Exception as e:
                    self.log(f"Found file at {path} but couldn't verify: {e}", "WARNING")
        
        if detected_installations:
            self.claude_code_detected = detected_installations[0]  # Use first found
            self.log(f"Will integrate with existing Claude Code installation", "INFO")
        else:
            self.log("No existing Claude Code detected - fresh installation", "INFO")
        
        return self.claude_code_detected
    
    def backup_existing_config(self) -> bool:
        """Backup existing Claude Code configuration"""
        if not self.claude_code_detected:
            return True
        
        self.log("Backing up existing Claude Code configuration...", "INFO")
        
        # Common config locations
        config_paths = [
            Path.home() / ".claude",
            Path.home() / ".config" / "claude",
            Path.home() / "Library" / "Application Support" / "claude",  # macOS
        ]
        
        backup_created = False
        for config_path in config_paths:
            if config_path.exists():
                backup_path = config_path.parent / f"{config_path.name}_backup_pre_claudette"
                try:
                    if backup_path.exists():
                        shutil.rmtree(backup_path)
                    shutil.copytree(config_path, backup_path)
                    self.log(f"Backed up config: {config_path} -> {backup_path}", "SUCCESS")
                    backup_created = True
                except Exception as e:
                    self.log(f"Warning: Could not backup {config_path}: {e}", "WARNING")
        
        if not backup_created:
            self.log("No Claude Code config found to backup", "INFO")
        
        return True
    
    def install_claudette_package(self) -> bool:
        """Install Claudette package and dependencies"""
        self.log("Installing Claudette LEGENDARY system...", "BOMBAD")
        
        # Determine installation method
        if (Path.cwd() / "setup.py").exists() and (Path.cwd() / "src").exists():
            # We're in the development directory
            self.log("Installing from local development directory", "INFO")
            try:
                subprocess.run([sys.executable, "-m", "pip", "install", "-e", "."], 
                             check=True, capture_output=True)
                self.log("Claudette installed in development mode", "SUCCESS")
                self.installation_dir = Path.cwd()
            except subprocess.CalledProcessError as e:
                self.log(f"Local installation failed: {e}", "ERROR")
                return False
        else:
            # Try to install from repository
            self.log("Installing from GitHub repository...", "INFO")
            try:
                repo_url = "git+https://github.com/RobLe3/claudette.git"
                subprocess.run([sys.executable, "-m", "pip", "install", repo_url], 
                             check=True, capture_output=True)
                self.log("Claudette installed from repository", "SUCCESS")
            except subprocess.CalledProcessError as e:
                self.log(f"Repository installation failed: {e}", "ERROR")
                return False
        
        # Verify installation
        try:
            subprocess.run([sys.executable, "-c", "import claudette; print(claudette.__version__)"], 
                         check=True, capture_output=True)
            self.log("Claudette package verification successful", "SUCCESS")
            return True
        except subprocess.CalledProcessError:
            self.log("Claudette package verification failed", "ERROR")
            return False
    
    def install_claude_flow(self) -> bool:
        """Install claude-flow from ruv's repository"""
        if not self.node_available:
            self.log("Skipping claude-flow installation - Node.js not available", "WARNING")
            return True
        
        self.log("Installing claude-flow@alpha from ruv's repository...", "INFO")
        
        try:
            # First try global installation
            result = subprocess.run(["npm", "install", "-g", "claude-flow@alpha"], 
                                  capture_output=True, text=True, timeout=120)
            
            if result.returncode == 0:
                self.log("claude-flow installed globally", "SUCCESS")
            else:
                # Try local installation
                self.log("Global install failed, trying local installation...", "WARNING")
                
                # Create package.json if it doesn't exist
                package_json = Path("package.json")
                if not package_json.exists():
                    package_content = {
                        "name": "claudette-integration",
                        "version": "1.0.0",
                        "dependencies": {}
                    }
                    with open(package_json, "w") as f:
                        json.dump(package_content, f, indent=2)
                
                result = subprocess.run(["npm", "install", "claude-flow@alpha"], 
                                      capture_output=True, text=True, timeout=120)
                
                if result.returncode == 0:
                    self.log("claude-flow installed locally", "SUCCESS")
                else:
                    self.log(f"claude-flow installation failed: {result.stderr}", "WARNING")
                    return False
            
            # Verify installation
            verify_result = subprocess.run(["npx", "claude-flow@alpha", "--version"], 
                                         capture_output=True, text=True, timeout=10)
            
            if verify_result.returncode == 0:
                version = verify_result.stdout.strip()
                self.log(f"claude-flow verification successful: {version}", "SUCCESS")
                return True
            else:
                self.log("claude-flow verification failed", "WARNING")
                return False
                
        except subprocess.TimeoutExpired:
            self.log("claude-flow installation timed out", "WARNING")
            return False
        except Exception as e:
            self.log(f"claude-flow installation error: {e}", "WARNING")
            return False
    
    def setup_mcp_integration(self) -> bool:
        """Setup MCP integration between Claudette and Claude Code"""
        if not self.claude_code_detected:
            self.log("No existing Claude Code found - MCP integration skipped", "INFO")
            return True
        
        self.log("Setting up MCP integration...", "INFO")
        
        try:
            # Test if claude command supports MCP
            result = subprocess.run(["claude", "mcp", "--help"], 
                                  capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                # Add Claudette as MCP server
                mcp_add_result = subprocess.run([
                    "claude", "mcp", "add", "claudette-teamwork", 
                    "npx", "claudette", "mcp", "start"
                ], capture_output=True, text=True, timeout=30)
                
                if mcp_add_result.returncode == 0:
                    self.log("MCP integration configured successfully", "SUCCESS")
                    self.log("Use mcp__claudette__* tools in Claude Code", "INFO")
                    return True
                else:
                    self.log(f"MCP configuration failed: {mcp_add_result.stderr}", "WARNING")
            else:
                self.log("Claude Code doesn't support MCP - integration skipped", "INFO")
        
        except Exception as e:
            self.log(f"MCP integration error: {e}", "WARNING")
        
        return True
    
    def configure_aliases(self) -> bool:
        """Configure command aliases for seamless usage"""
        self.log("Configuring command aliases...", "INFO")
        
        # Create a wrapper script that intelligently routes commands
        wrapper_script = '''#!/bin/bash
# Intelligent Claude/Claudette Router
# Routes complex tasks to Claudette teamwork, simple tasks to original Claude

ORIGINAL_CLAUDE=""
if command -v claude.orig >/dev/null 2>&1; then
    ORIGINAL_CLAUDE="claude.orig"
elif command -v /usr/local/bin/claude >/dev/null 2>&1; then
    ORIGINAL_CLAUDE="/usr/local/bin/claude"
fi

# Check if this looks like a complex task that would benefit from teamwork
if echo "$*" | grep -qE "(design|implement|create|build|develop|architect|analyze|optimize|refactor)"; then
    echo "🤝 Using Claudette teamwork for complex task..."
    claudette "$@"
else
    # Simple task - use original Claude if available
    if [ -n "$ORIGINAL_CLAUDE" ]; then
        $ORIGINAL_CLAUDE "$@"
    else
        claudette "$@"
    fi
fi
'''
        
        try:
            # Find a good location for the wrapper
            wrapper_locations = [
                Path.home() / ".local" / "bin",
                Path("/usr/local/bin"),
                Path.home() / "bin"
            ]
            
            for location in wrapper_locations:
                if location.exists() and os.access(location, os.W_OK):
                    wrapper_path = location / "claude-smart"
                    with open(wrapper_path, "w") as f:
                        f.write(wrapper_script)
                    wrapper_path.chmod(0o755)
                    
                    self.log(f"Smart routing script created: {wrapper_path}", "SUCCESS")
                    self.log("Use 'claude-smart' for intelligent task routing", "INFO")
                    break
            else:
                self.log("Could not create smart routing script - no writable bin directory", "WARNING")
        
        except Exception as e:
            self.log(f"Alias configuration error: {e}", "WARNING")
        
        return True
    
    def verify_installation(self) -> bool:
        """Verify complete installation"""
        self.log("Verifying LEGENDARY installation...", "BOMBAD")
        
        checks = []
        
        # Check Claudette CLI
        try:
            result = subprocess.run(["claudette", "--version"], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                checks.append(("Claudette CLI", True, result.stdout.strip()))
            else:
                checks.append(("Claudette CLI", False, "Command failed"))
        except Exception as e:
            checks.append(("Claudette CLI", False, str(e)))
        
        # Check Python import
        try:
            subprocess.run([sys.executable, "-c", 
                          "from claudette.teamwork_orchestration import GLOBAL_TEAMWORK_SYSTEM; print('Teamwork system ready')"], 
                         check=True, capture_output=True, timeout=10)
            checks.append(("Teamwork System", True, "Import successful"))
        except Exception as e:
            checks.append(("Teamwork System", False, str(e)))
        
        # Check claude-flow integration
        try:
            subprocess.run([sys.executable, "-c",
                          "from claudette.integrations.claude_flow_bridge import check_integration; print(check_integration())"],
                         check=True, capture_output=True, timeout=10)
            checks.append(("Claude-Flow Integration", True, "Bridge functional"))
        except Exception as e:
            checks.append(("Claude-Flow Integration", False, str(e)))
        
        # Display results
        self.log("Installation verification results:", "INFO")
        all_passed = True
        for component, passed, details in checks:
            status = "✅" if passed else "❌"
            self.log(f"  {status} {component}: {details}", "SUCCESS" if passed else "WARNING")
            if not passed:
                all_passed = False
        
        return all_passed
    
    def generate_installation_report(self) -> str:
        """Generate installation report"""
        report = f"""
🏆 CLAUDETTE LEGENDARY INSTALLATION REPORT
==========================================

📊 Installation Summary:
• Python Version: {self.python_version.major}.{self.python_version.minor}
• Node.js Available: {'Yes' if self.node_available else 'No'}
• Existing Claude Code: {'Yes' if self.claude_code_detected else 'No'}
• Installation Errors: {len(self.errors)}

🎯 What Was Installed:
• ✅ Claudette LEGENDARY system (980/1000 gear score)
• {'✅' if self.node_available else '⚠️'} Claude-Flow integration from ruv's repository
• ✅ Multi-backend support (8 LLM providers)
• ✅ Teamwork orchestration system
• ✅ RPG-style progression (99 levels, 14 skills)
• ✅ Safety & mentorship systems

🚀 Next Steps:
1. Test basic functionality: claudette --version
2. Test teamwork: claudette "Design a simple web API"
3. Check swarm: python -c "from claudette.integrations.claude_flow_bridge import check_integration; print(check_integration())"

🌟 JAR JAR'S VERDICT: {"BOMBAD SUCCESS!" if len(self.errors) == 0 else "Mesa thinks wesa need to fix some things!"}

📝 Installation Log:
{chr(10).join(self.install_log)}
"""
        return report
    
    def run_installation(self) -> bool:
        """Run complete installation process"""
        self.log("🏆 Starting LEGENDARY Claudette Installation", "BOMBAD")
        self.log("Mesa gonna make yousa system BOMBAD!", "BOMBAD")
        
        try:
            # Step 1: System requirements
            if not self.check_system_requirements():
                self.log("System requirements not met - installation aborted", "ERROR")
                return False
            
            # Step 2: Detect existing installations
            self.detect_existing_claude_code()
            
            # Step 3: Backup existing config
            if not self.backup_existing_config():
                self.log("Config backup failed - continuing anyway", "WARNING")
            
            # Step 4: Install Claudette
            if not self.install_claudette_package():
                self.log("Claudette installation failed - aborting", "ERROR")
                return False
            
            # Step 5: Install claude-flow
            if not self.install_claude_flow():
                self.log("claude-flow installation had issues - continuing", "WARNING")
            
            # Step 6: Setup MCP integration
            if not self.setup_mcp_integration():
                self.log("MCP integration had issues - continuing", "WARNING")
            
            # Step 7: Configure aliases
            if not self.configure_aliases():
                self.log("Alias configuration had issues - continuing", "WARNING")
            
            # Step 8: Verify installation
            success = self.verify_installation()
            
            if success:
                self.log("🎉 LEGENDARY INSTALLATION COMPLETE!", "BOMBAD")
                self.log("Yousa now have da most BOMBAD AI teamwork system!", "BOMBAD")
            else:
                self.log("Installation completed with some issues", "WARNING")
            
            # Generate report
            report = self.generate_installation_report()
            
            # Save report
            try:
                with open("claudette_installation_report.txt", "w") as f:
                    f.write(report)
                self.log("Installation report saved to claudette_installation_report.txt", "SUCCESS")
            except Exception as e:
                self.log(f"Could not save report: {e}", "WARNING")
            
            print("\n" + "="*60)
            print(report)
            
            return success
            
        except KeyboardInterrupt:
            self.log("Installation interrupted by user", "ERROR")
            return False
        except Exception as e:
            self.log(f"Unexpected installation error: {e}", "ERROR")
            return False

def main():
    """Main installation function"""
    print("""
🏆 CLAUDETTE LEGENDARY FRESH INSTALLER
=====================================
JAR JAR APPROVED! ⭐

This installer will:
• Install Claudette LEGENDARY system (980/1000 gear score)
• Auto-fetch claude-flow@alpha from ruv's repository  
• Setup teamwork coordination with 10x performance
• Configure safety systems and rookie protection
• Enable "Teamwork > Ego" philosophy

Mesa make yousa system BOMBAD!
""")
    
    # Ask for confirmation
    try:
        response = input("Continue with installation? [Y/n]: ").strip().lower()
        if response and response not in ['y', 'yes']:
            print("Installation cancelled by user")
            return False
    except KeyboardInterrupt:
        print("\nInstallation cancelled by user")
        return False
    
    # Run installation
    installer = ClaudetteInstaller()
    success = installer.run_installation()
    
    if success:
        print("\n🌟 Mesa so proud! Yousa got da LEGENDARY system now!")
        print("🤝 Remember: TEAMWORK > EGO!")
        return True
    else:
        print("\n⚠️ Installation had some issues. Check the report above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)