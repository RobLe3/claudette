#!/usr/bin/env python3
"""
Direct Claude Flow Swarm Initialization 
Bypasses bridge and uses direct subprocess calls following BatchTool pattern
"""

import subprocess
import json
import concurrent.futures
import sys
from typing import Dict, List, Any

class DirectSwarmInitializer:
    """Direct initialization using subprocess calls"""
    
    def __init__(self):
        self.agents_config = [
            {"id": "SwarmLead", "type": "coordinator", "role": "coordinator"},
            {"id": "RequirementsAnalyst", "type": "researcher", "role": "researcher"}, 
            {"id": "SystemDesigner", "type": "architect", "role": "architect"},
            {"id": "BackendDev", "type": "coder", "role": "coder"},
            {"id": "QAEngineer", "type": "tester", "role": "tester"}
        ]
        
        self.memory_items = [
            {"key": "swarm/objective", "value": "init"},
            {"key": "swarm/config", "value": "centralized_auto_hierarchical"}, 
            {"key": "swarm/status", "value": "initializing"}
        ]
        
        self.tasks = [
            {"id": "main_init", "title": "Initialize System", "assignee": "SwarmLead"},
            {"id": "analyze_requirements", "title": "Analyze Requirements", "assignee": "RequirementsAnalyst"},
            {"id": "design_architecture", "title": "Design Architecture", "assignee": "SystemDesigner"},
            {"id": "implement_core", "title": "Implement Core", "assignee": "BackendDev"},
            {"id": "test_validate", "title": "Test & Validate", "assignee": "QAEngineer"}
        ]
    
    def run_claude_flow_cmd(self, cmd_args: List[str], timeout: int = 15) -> Dict[str, Any]:
        """Run claude-flow command with error handling"""
        try:
            full_cmd = ["npx", "claude-flow@alpha"] + cmd_args
            result = subprocess.run(
                full_cmd,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            return {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "returncode": result.returncode,
                "command": " ".join(full_cmd)
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Command timeout", "command": " ".join(cmd_args)}
        except Exception as e:
            return {"success": False, "error": str(e), "command": " ".join(cmd_args)}
    
    def spawn_agent(self, agent_config: Dict[str, Any]) -> Dict[str, Any]:
        """Spawn agent using direct claude-flow command"""
        cmd = ["agent", "spawn", "--type", agent_config["type"], "--name", agent_config["id"]]
        result = self.run_claude_flow_cmd(cmd)
        return {
            "agent_id": agent_config["id"],
            "operation": "spawn_agent",
            **result
        }
    
    def store_memory(self, memory_item: Dict[str, Any]) -> Dict[str, Any]:
        """Store memory using direct claude-flow command"""
        cmd = ["memory", "store", "--key", memory_item["key"], "--value", memory_item["value"]]
        result = self.run_claude_flow_cmd(cmd)
        return {
            "key": memory_item["key"],
            "operation": "store_memory", 
            **result
        }
    
    def create_task(self, task_config: Dict[str, Any]) -> Dict[str, Any]:
        """Create task using direct claude-flow command"""
        cmd = ["task", "create", "--title", task_config["title"], "--assignee", task_config["assignee"]]
        result = self.run_claude_flow_cmd(cmd)
        return {
            "task_id": task_config["id"],
            "operation": "create_task",
            **result
        }
    
    def initialize_swarm_parallel(self) -> Dict[str, Any]:
        """Initialize swarm using BatchTool pattern - all operations in parallel"""
        print("🚀 Direct Claude Flow Swarm Initialization")
        print("📋 Using BatchTool Pattern for Parallel Operations")
        print("=" * 60)
        
        results = {
            "agents": [],
            "memory": [],
            "tasks": [],
            "summary": {"total": 0, "successful": 0, "failed": 0}
        }
        
        # Use ThreadPoolExecutor for parallel execution (BatchTool pattern)
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
            futures = []
            
            # 1. Spawn all agents in parallel
            print("👥 Spawning 5 agents in parallel...")
            for agent_config in self.agents_config:
                future = executor.submit(self.spawn_agent, agent_config)
                futures.append(("agents", future))
            
            # 2. Store all memory items in parallel
            print("💾 Storing memory configuration in parallel...")
            for memory_item in self.memory_items:
                future = executor.submit(self.store_memory, memory_item)
                futures.append(("memory", future))
            
            # 3. Create all tasks in parallel
            print("📝 Creating task hierarchy in parallel...")
            for task_config in self.tasks:
                future = executor.submit(self.create_task, task_config)
                futures.append(("tasks", future))
            
            # Collect results
            results["summary"]["total"] = len(futures)
            
            for category, future in futures:
                try:
                    result = future.result(timeout=30)
                    results[category].append(result)
                    
                    if result.get("success", False):
                        results["summary"]["successful"] += 1
                        entity_id = result.get("agent_id", result.get("key", result.get("task_id", "Unknown")))
                        print(f"✅ {result['operation']}: {entity_id}")
                    else:
                        results["summary"]["failed"] += 1
                        entity_id = result.get("agent_id", result.get("key", result.get("task_id", "Unknown")))
                        error = result.get("error", result.get("stderr", "Unknown error"))
                        print(f"❌ {result['operation']}: {entity_id} - {error}")
                        
                except concurrent.futures.TimeoutError:
                    results["summary"]["failed"] += 1
                    print(f"⏰ Operation timeout")
                except Exception as e:
                    results["summary"]["failed"] += 1
                    print(f"💥 Operation exception: {str(e)}")
        
        # Get swarm status
        print("\n🔍 Getting final swarm status...")
        swarm_status_result = self.run_claude_flow_cmd(["hive-mind", "status"])
        results["swarm_status"] = swarm_status_result
        
        # Calculate metrics
        total = results["summary"]["total"]
        successful = results["summary"]["successful"]
        success_rate = (successful / total * 100) if total > 0 else 0
        results["summary"]["success_rate"] = success_rate
        
        print(f"\n📊 Initialization Complete:")
        print(f"   Total Operations: {total}")
        print(f"   Successful: {successful}")
        print(f"   Failed: {results['summary']['failed']}")
        print(f"   Success Rate: {success_rate:.1f}%")
        
        if swarm_status_result.get("success"):
            print(f"   Swarm Status: Active")
        else:
            print(f"   Swarm Status: Check required")
        
        results["overall_success"] = success_rate >= 60  # 60% threshold for success
        return results


def main():
    """Main execution"""
    print("🌊 Claude Flow Direct Swarm Initialization")
    print("=" * 60)
    
    # First check if we have an active hive mind
    initializer = DirectSwarmInitializer()
    check_result = initializer.run_claude_flow_cmd(["hive-mind", "status"])
    
    if not check_result.get("success"):
        print("⚠️  No active Hive Mind found. Spawning new swarm first...")
        spawn_result = initializer.run_claude_flow_cmd(["hive-mind", "spawn", "init"])
        if not spawn_result.get("success"):
            print(f"❌ Failed to spawn hive mind: {spawn_result.get('error', 'Unknown error')}")
            return 1
        print("✅ Hive Mind spawned successfully")
    else:
        print("✅ Active Hive Mind found")
    
    # Initialize the swarm with specific agents and coordination
    results = initializer.initialize_swarm_parallel()
    
    # Output results
    print(f"\n📋 Final Results:")
    print(json.dumps(results, indent=2, default=str))
    
    return 0 if results["overall_success"] else 1


if __name__ == "__main__":
    sys.exit(main())