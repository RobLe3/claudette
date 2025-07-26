#!/usr/bin/env python3
"""
Dependency Manager for Claudette AI Tools

Manages external dependencies including Node.js packages and Python requirements.
Provides automatic installation and validation of claude-flow integration.
"""

import subprocess
import sys
import os
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path


class DependencyManager:
    """Manages external dependencies for claudette-ai-tools"""
    
    def __init__(self):
        self.required_dependencies = {
            'node_packages': {
                'claude-flow': '^2.0.0-alpha'
            },
            'python_packages': {
                'subprocess32': '>=3.5.4',
                'psutil': '>=5.8.0'
            }
        }
    
    def check_node_js(self) -> Dict[str, Any]:
        """Check if Node.js is available"""
        try:
            result = subprocess.run(
                ["node", "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                version = result.stdout.strip()
                # Extract version number (remove 'v' prefix)
                version_number = version.lstrip('v')
                major_version = int(version_number.split('.')[0])
                
                return {
                    "available": True,
                    "version": version,
                    "supported": major_version >= 18,
                    "recommendation": "✅ Node.js is available and supported" if major_version >= 18 
                                   else "⚠️ Node.js version should be 18+ for best compatibility"
                }
            return {"available": False, "reason": "Node.js command failed"}
        except (subprocess.TimeoutExpired, FileNotFoundError, ValueError):
            return {
                "available": False,
                "reason": "Node.js not found",
                "installation_guide": "Install Node.js from https://nodejs.org/ (version 18+ recommended)"
            }
    
    def check_npm(self) -> Dict[str, Any]:
        """Check if npm is available"""
        try:
            result = subprocess.run(
                ["npm", "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                return {
                    "available": True,
                    "version": result.stdout.strip(),
                    "recommendation": "✅ npm is available"
                }
            return {"available": False, "reason": "npm command failed"}
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return {
                "available": False,
                "reason": "npm not found",
                "installation_guide": "npm is usually installed with Node.js"
            }
    
    def check_claude_flow(self) -> Dict[str, Any]:
        """Check claude-flow availability and version"""
        try:
            result = subprocess.run(
                ["npx", "claude-flow@alpha", "--version"],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                version = result.stdout.strip()
                return {
                    "available": True,
                    "version": version,
                    "status": "✅ Claude-flow is ready for use",
                    "integration_ready": True
                }
            return {
                "available": False,
                "reason": "claude-flow command failed",
                "integration_ready": False
            }
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return {
                "available": False,
                "reason": "claude-flow not found",
                "installation_guide": "Run: npm install claude-flow@alpha",
                "integration_ready": False
            }
    
    def check_python_packages(self) -> Dict[str, Any]:
        """Check required Python packages"""
        results = {}
        missing_packages = []
        
        for package, version_spec in self.required_dependencies['python_packages'].items():
            try:
                # Try to import the package
                __import__(package)
                results[package] = {
                    "available": True,
                    "status": f"✅ {package} is available"
                }
            except ImportError:
                results[package] = {
                    "available": False,
                    "reason": f"{package} not found",
                    "installation_guide": f"pip install '{package}{version_spec}'"
                }
                missing_packages.append(f"{package}{version_spec}")
        
        return {
            "packages": results,
            "missing_packages": missing_packages,
            "all_available": len(missing_packages) == 0
        }
    
    def install_claude_flow(self) -> Dict[str, Any]:
        """Install claude-flow via npm"""
        # Check if package.json exists
        package_json_path = Path("package.json")
        if not package_json_path.exists():
            return {
                "success": False,
                "error": "No package.json found. Please run from claudette-ai-tools directory."
            }
        
        try:
            print("📦 Installing claude-flow...")
            result = subprocess.run(
                ["npm", "install", "claude-flow@alpha"],
                capture_output=True,
                text=True,
                timeout=120
            )
            
            if result.returncode == 0:
                # Verify installation
                verification = self.check_claude_flow()
                if verification["available"]:
                    return {
                        "success": True,
                        "message": "✅ Claude-flow installed successfully",
                        "version": verification["version"]
                    }
                else:
                    return {
                        "success": False,
                        "error": "Installation completed but claude-flow is not accessible"
                    }
            else:
                return {
                    "success": False,
                    "error": f"npm install failed: {result.stderr}"
                }
                
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": "Installation timeout (>120s). Check your internet connection."
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def install_python_packages(self) -> Dict[str, Any]:
        """Install missing Python packages"""
        python_check = self.check_python_packages()
        
        if python_check["all_available"]:
            return {
                "success": True,
                "message": "✅ All Python packages are already installed"
            }
        
        missing = python_check["missing_packages"]
        installed = []
        failed = []
        
        for package_spec in missing:
            try:
                print(f"📦 Installing {package_spec}...")
                result = subprocess.run(
                    [sys.executable, "-m", "pip", "install", package_spec],
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                
                if result.returncode == 0:
                    installed.append(package_spec)
                    print(f"✅ {package_spec} installed successfully")
                else:
                    failed.append({"package": package_spec, "error": result.stderr})
                    print(f"❌ Failed to install {package_spec}: {result.stderr}")
                    
            except subprocess.TimeoutExpired:
                failed.append({"package": package_spec, "error": "Installation timeout"})
            except Exception as e:
                failed.append({"package": package_spec, "error": str(e)})
        
        return {
            "success": len(failed) == 0,
            "installed": installed,
            "failed": failed,
            "message": f"✅ Installed {len(installed)} packages" if len(failed) == 0 
                      else f"⚠️ Installed {len(installed)}, failed {len(failed)} packages"
        }
    
    def comprehensive_check(self) -> Dict[str, Any]:
        """Perform comprehensive dependency check"""
        print("🔍 Checking claudette-ai-tools dependencies...")
        print("=" * 50)
        
        # Check system dependencies
        node_status = self.check_node_js()
        npm_status = self.check_npm()
        
        # Check package dependencies
        claude_flow_status = self.check_claude_flow()
        python_status = self.check_python_packages()
        
        # Determine overall status
        critical_dependencies = [
            node_status.get("available", False),
            npm_status.get("available", False)
        ]
        
        optional_dependencies = [
            claude_flow_status.get("available", False),
            python_status.get("all_available", False)
        ]
        
        system_ready = all(critical_dependencies)
        integration_ready = system_ready and claude_flow_status.get("available", False)
        
        return {
            "system": {
                "node_js": node_status,
                "npm": npm_status
            },
            "packages": {
                "claude_flow": claude_flow_status,
                "python_packages": python_status
            },
            "status": {
                "system_ready": system_ready,
                "integration_ready": integration_ready,
                "recommended_actions": self._get_recommended_actions(
                    node_status, npm_status, claude_flow_status, python_status
                )
            }
        }
    
    def _get_recommended_actions(self, node_status, npm_status, claude_flow_status, python_status) -> List[str]:
        """Get recommended actions based on dependency status"""
        actions = []
        
        if not node_status.get("available"):
            actions.append("📥 Install Node.js from https://nodejs.org/ (version 18+ recommended)")
        
        if not npm_status.get("available"):
            actions.append("📥 Install npm (usually comes with Node.js)")
        
        if not claude_flow_status.get("available"):
            actions.append("📦 Run: npm install claude-flow@alpha")
        
        if not python_status.get("all_available"):
            missing = python_status.get("missing_packages", [])
            if missing:
                actions.append(f"🐍 Install Python packages: pip install {' '.join(missing)}")
        
        if not actions:
            actions.append("✅ All dependencies are satisfied!")
        
        return actions
    
    def auto_install_missing(self) -> Dict[str, Any]:
        """Automatically install missing dependencies where possible"""
        print("🚀 Auto-installing missing dependencies...")
        
        results = {"actions": [], "success": True}
        
        # Check current status
        status = self.comprehensive_check()
        
        # Install Python packages if missing
        if not status["packages"]["python_packages"]["all_available"]:
            python_result = self.install_python_packages()
            results["actions"].append({
                "type": "python_packages",
                "result": python_result
            })
            if not python_result["success"]:
                results["success"] = False
        
        # Install claude-flow if missing (and npm is available)
        if (status["system"]["npm"]["available"] and 
            not status["packages"]["claude_flow"]["available"]):
            
            claude_flow_result = self.install_claude_flow()
            results["actions"].append({
                "type": "claude_flow",
                "result": claude_flow_result
            })
            if not claude_flow_result["success"]:
                results["success"] = False
        
        return results


def main():
    """Main dependency checking and installation"""
    manager = DependencyManager()
    
    # Perform comprehensive check
    status = manager.comprehensive_check()
    
    # Display results
    print("\n📊 DEPENDENCY STATUS REPORT")
    print("=" * 30)
    
    # System dependencies
    print(f"Node.js: {'✅' if status['system']['node_js']['available'] else '❌'}")
    if status['system']['node_js']['available']:
        print(f"  Version: {status['system']['node_js']['version']}")
    
    print(f"npm: {'✅' if status['system']['npm']['available'] else '❌'}")
    if status['system']['npm']['available']:
        print(f"  Version: {status['system']['npm']['version']}")
    
    # Package dependencies
    print(f"Claude-flow: {'✅' if status['packages']['claude_flow']['available'] else '❌'}")
    if status['packages']['claude_flow']['available']:
        print(f"  Version: {status['packages']['claude_flow']['version']}")
    
    print(f"Python packages: {'✅' if status['packages']['python_packages']['all_available'] else '⚠️'}")
    
    # Overall status
    print(f"\n🎯 Integration Ready: {'✅' if status['status']['integration_ready'] else '❌'}")
    
    # Recommended actions
    if status['status']['recommended_actions']:
        print("\n📋 RECOMMENDED ACTIONS:")
        for action in status['status']['recommended_actions']:
            print(f"  {action}")
    
    return status['status']['integration_ready']


if __name__ == "__main__":
    main()