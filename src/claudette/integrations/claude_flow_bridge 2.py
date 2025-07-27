#!/usr/bin/env python3
"""
Claude-Flow Integration Bridge

Provides seamless integration between claudette-ai-tools (Python) and 
ruvnet claude-flow (Node.js) for advanced AI orchestration capabilities.
"""

import subprocess
import json
import os
import sys
from typing import Dict, List, Optional, Any
from pathlib import Path


class ClaudeFlowBridge:
    """Bridge between Python claudette and Node.js claude-flow"""
    
    def __init__(self):
        self.claude_flow_version = None
        self._check_claude_flow_availability()
    
    def _check_claude_flow_availability(self) -> bool:
        """Check if claude-flow is available via npx"""
        try:
            result = subprocess.run(
                ["npx", "claude-flow@alpha", "--version"],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                self.claude_flow_version = result.stdout.strip()
                return True
            return False
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return False
    
    def is_available(self) -> bool:
        """Check if claude-flow integration is available"""
        return self.claude_flow_version is not None
    
    def get_version(self) -> Optional[str]:
        """Get claude-flow version"""
        return self.claude_flow_version
    
    def initialize_swarm(self, topology: str = "hierarchical", max_agents: int = 8) -> Dict[str, Any]:
        """Initialize a claude-flow swarm"""
        if not self.is_available():
            raise RuntimeError("Claude-flow is not available. Please install with: npm install claude-flow@alpha")
        
        try:
            cmd = [
                "npx", "claude-flow@alpha", "swarm", "init",
                "--topology", topology,
                "--max-agents", str(max_agents),
                "--output", "json"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                return {"success": True, "output": result.stdout, "swarm_initialized": True}
            else:
                return {"success": False, "error": result.stderr, "swarm_initialized": False}
                
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Swarm initialization timeout", "swarm_initialized": False}
        except Exception as e:
            return {"success": False, "error": str(e), "swarm_initialized": False}
    
    def spawn_agent(self, agent_type: str, name: str = None, capabilities: List[str] = None) -> Dict[str, Any]:
        """Spawn a specialized agent"""
        if not self.is_available():
            raise RuntimeError("Claude-flow is not available")
        
        cmd = ["npx", "claude-flow@alpha", "agents", "spawn", "--type", agent_type]
        
        if name:
            cmd.extend(["--name", name])
        
        if capabilities:
            cmd.extend(["--capabilities", ",".join(capabilities)])
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
            return {
                "success": result.returncode == 0,
                "output": result.stdout if result.returncode == 0 else result.stderr,
                "agent_spawned": result.returncode == 0
            }
        except Exception as e:
            return {"success": False, "error": str(e), "agent_spawned": False}
    
    def orchestrate_task(self, task_description: str, strategy: str = "adaptive") -> Dict[str, Any]:
        """Orchestrate a complex task using claude-flow"""
        if not self.is_available():
            return {"success": False, "error": "Claude-flow not available", "fallback": True}
        
        cmd = [
            "npx", "claude-flow@alpha", "task", "orchestrate",
            "--description", task_description,
            "--strategy", strategy
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            return {
                "success": result.returncode == 0,
                "output": result.stdout if result.returncode == 0 else result.stderr,
                "task_orchestrated": result.returncode == 0
            }
        except Exception as e:
            return {"success": False, "error": str(e), "task_orchestrated": False}
    
    def get_swarm_status(self) -> Dict[str, Any]:
        """Get current swarm status"""
        if not self.is_available():
            return {"available": False, "status": "claude-flow not installed"}
        
        try:
            result = subprocess.run(
                ["npx", "claude-flow@alpha", "swarm", "status"],
                capture_output=True, text=True, timeout=15
            )
            
            return {
                "available": True,
                "status": "active" if result.returncode == 0 else "inactive",
                "output": result.stdout if result.returncode == 0 else result.stderr
            }
        except Exception as e:
            return {"available": True, "status": "error", "error": str(e)}
    
    def use_memory(self, action: str, key: str, value: str = None) -> Dict[str, Any]:
        """Use claude-flow memory system"""
        if not self.is_available():
            return {"success": False, "error": "Claude-flow not available"}
        
        cmd = ["npx", "claude-flow@alpha", "memory", action, "--key", key]
        
        if value and action in ["store", "update"]:
            cmd.extend(["--value", value])
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            return {
                "success": result.returncode == 0,
                "output": result.stdout if result.returncode == 0 else result.stderr
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def install_claude_flow(self) -> Dict[str, Any]:
        """Install claude-flow dependency"""
        try:
            # Check if we're in a directory with package.json
            package_json_path = Path("package.json")
            if not package_json_path.exists():
                return {
                    "success": False, 
                    "error": "No package.json found. Please run from claudette-ai-tools directory."
                }
            
            # Install claude-flow
            result = subprocess.run(
                ["npm", "install", "claude-flow@alpha"],
                capture_output=True, text=True, timeout=120
            )
            
            if result.returncode == 0:
                # Re-check availability
                self._check_claude_flow_availability()
                return {
                    "success": True,
                    "message": "Claude-flow installed successfully",
                    "version": self.claude_flow_version
                }
            else:
                return {
                    "success": False,
                    "error": f"Installation failed: {result.stderr}"
                }
                
        except Exception as e:
            return {"success": False, "error": str(e)}


# Singleton instance for easy access
claude_flow = ClaudeFlowBridge()


def check_integration() -> Dict[str, Any]:
    """Check claude-flow integration status"""
    return {
        "claude_flow_available": claude_flow.is_available(),
        "claude_flow_version": claude_flow.get_version(),
        "swarm_status": claude_flow.get_swarm_status(),
        "integration_ready": claude_flow.is_available()
    }


def ensure_claude_flow() -> bool:
    """Ensure claude-flow is available, install if needed"""
    if claude_flow.is_available():
        return True
    
    print("Claude-flow not found. Installing...")
    result = claude_flow.install_claude_flow()
    
    if result["success"]:
        print(f"✅ Claude-flow installed: {result.get('version', 'unknown version')}")
        return True
    else:
        print(f"❌ Failed to install claude-flow: {result['error']}")
        return False


if __name__ == "__main__":
    # Test the integration
    print("🔍 Testing Claude-Flow Integration")
    print("=" * 40)
    
    status = check_integration()
    
    print(f"Claude-flow available: {status['claude_flow_available']}")
    if status['claude_flow_version']:
        print(f"Version: {status['claude_flow_version']}")
    
    print(f"Integration ready: {status['integration_ready']}")
    
    if status['integration_ready']:
        print("\n✅ Claude-flow integration is ready!")
        
        # Test swarm status
        swarm_status = claude_flow.get_swarm_status()
        print(f"Swarm status: {swarm_status['status']}")
        
    else:
        print("\n⚠️  Claude-flow integration needs setup")
        print("Run: npm install claude-flow@alpha")