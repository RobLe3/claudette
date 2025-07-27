#!/usr/bin/env python3
"""
Configure Existing Claude Flow Swarm
Uses the already-active Hive Mind and adds the specific agents, memory, and tasks
Following BatchTool pattern for parallel operations
"""

import subprocess
import json
import concurrent.futures
import sys
from typing import Dict, List, Any

class SwarmConfigurator:
    """Configure existing swarm with specific requirements"""
    
    def __init__(self):
        # Map our desired agents to existing worker types
        self.agent_mappings = [
            {"desired_id": "SwarmLead", "worker_type": "Queen Coordinator", "role": "coordinator"},
            {"desired_id": "RequirementsAnalyst", "worker_type": "Researcher Worker 1", "role": "researcher"}, 
            {"desired_id": "SystemDesigner", "worker_type": "Analyst Worker 3", "role": "architect"},
            {"desired_id": "BackendDev", "worker_type": "Coder Worker 2", "role": "coder"},
            {"desired_id": "QAEngineer", "worker_type": "Tester Worker 4", "role": "tester"}
        ]
        
        self.memory_items = [
            {"key": "swarm/objective", "value": "init", "type": "objective"},
            {"key": "swarm/config", "value": "centralized_auto_hierarchical", "type": "configuration"}, 
            {"key": "swarm/status", "value": "initializing", "type": "status"},
            {"key": "agents/SwarmLead/role", "value": "coordinator", "type": "agent_role"},
            {"key": "agents/RequirementsAnalyst/role", "value": "researcher", "type": "agent_role"},
            {"key": "agents/SystemDesigner/role", "value": "architect", "type": "agent_role"},
            {"key": "agents/BackendDev/role", "value": "coder", "type": "agent_role"},
            {"key": "agents/QAEngineer/role", "value": "tester", "type": "agent_role"}
        ]
        
        self.tasks = [
            {
                "id": "main_init", 
                "title": "Initialize System",
                "description": "Main initialization task for the entire system setup",
                "assignee": "SwarmLead",
                "priority": "high",
                "status": "pending"
            },
            {
                "id": "analyze_requirements", 
                "title": "Analyze Requirements",
                "description": "Gather and analyze system requirements for initialization",
                "assignee": "RequirementsAnalyst", 
                "priority": "high",
                "status": "pending"
            },
            {
                "id": "design_architecture", 
                "title": "Design Architecture", 
                "description": "Design system architecture based on requirements analysis",
                "assignee": "SystemDesigner",
                "priority": "high", 
                "status": "pending"
            },
            {
                "id": "implement_core",
                "title": "Implement Core",
                "description": "Implement core system components based on architecture design", 
                "assignee": "BackendDev",
                "priority": "medium",
                "status": "pending"
            },
            {
                "id": "test_validate",
                "title": "Test & Validate",
                "description": "Test and validate the implemented core system",
                "assignee": "QAEngineer", 
                "priority": "medium",
                "status": "pending"
            }
        ]
    
    def run_claude_flow_cmd(self, cmd_args: List[str], timeout: int = 10) -> Dict[str, Any]:
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
                "stdout": result.stdout.strip(),
                "stderr": result.stderr.strip(),
                "returncode": result.returncode
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "timeout"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def store_memory_item(self, memory_item: Dict[str, Any]) -> Dict[str, Any]:
        """Store single memory item"""
        cmd = ["memory", "store", "--key", memory_item["key"], "--value", memory_item["value"]]
        result = self.run_claude_flow_cmd(cmd)
        return {
            "key": memory_item["key"],
            "type": memory_item.get("type", "general"),
            "operation": "store_memory",
            **result
        }
    
    def assign_task(self, task_config: Dict[str, Any]) -> Dict[str, Any]:
        """Assign task to agent"""
        task_desc = f"{task_config['title']}: {task_config['description']} (Priority: {task_config['priority']})"
        cmd = ["task", "assign", "--description", task_desc, "--agent", task_config["assignee"]]
        result = self.run_claude_flow_cmd(cmd)
        return {
            "task_id": task_config["id"],
            "assignee": task_config["assignee"],
            "operation": "assign_task",
            **result
        }
    
    def register_agent_role(self, agent_mapping: Dict[str, Any]) -> Dict[str, Any]:
        """Register agent role in memory"""
        memory_key = f"agents/{agent_mapping['desired_id']}/mapping"
        memory_value = f"{agent_mapping['worker_type']}:{agent_mapping['role']}"
        cmd = ["memory", "store", "--key", memory_key, "--value", memory_value]
        result = self.run_claude_flow_cmd(cmd)
        return {
            "agent_id": agent_mapping["desired_id"],
            "worker_type": agent_mapping["worker_type"],
            "operation": "register_agent",
            **result
        }
    
    def configure_swarm_parallel(self) -> Dict[str, Any]:
        """Configure existing swarm using BatchTool pattern"""
        print("🔧 Configuring Existing Claude Flow Swarm")
        print("📋 Using BatchTool Pattern for Parallel Configuration")
        print("=" * 60)
        
        results = {
            "agent_registrations": [],
            "memory_storage": [],
            "task_assignments": [],
            "summary": {"total": 0, "successful": 0, "failed": 0}
        }
        
        # Use ThreadPoolExecutor for parallel execution (BatchTool pattern)
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = []
            
            # 1. Register agent roles in parallel
            print("👥 Registering 5 agent roles in parallel...")
            for agent_mapping in self.agent_mappings:
                future = executor.submit(self.register_agent_role, agent_mapping)
                futures.append(("agent_registrations", future))
            
            # 2. Store memory items in parallel
            print("💾 Storing memory configuration in parallel...")
            for memory_item in self.memory_items:
                future = executor.submit(self.store_memory_item, memory_item)
                futures.append(("memory_storage", future))
            
            # 3. Assign tasks in parallel
            print("📝 Assigning tasks in parallel...")
            for task_config in self.tasks:
                future = executor.submit(self.assign_task, task_config)
                futures.append(("task_assignments", future))
            
            # Collect results
            results["summary"]["total"] = len(futures)
            
            for category, future in futures:
                try:
                    result = future.result(timeout=20)
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
        
        # Update swarm status to operational
        print("\n🔄 Updating swarm status to operational...")
        status_update = self.run_claude_flow_cmd(["memory", "store", "--key", "swarm/status", "--value", "operational"])
        
        # Get final swarm status
        print("🔍 Getting final swarm status...")
        swarm_status_result = self.run_claude_flow_cmd(["hive-mind", "status"])
        results["swarm_status"] = swarm_status_result
        
        # Calculate metrics
        total = results["summary"]["total"]
        successful = results["summary"]["successful"]
        success_rate = (successful / total * 100) if total > 0 else 0
        results["summary"]["success_rate"] = success_rate
        
        print(f"\n📊 Configuration Complete:")
        print(f"   Total Operations: {total}")
        print(f"   Successful: {successful}")
        print(f"   Failed: {results['summary']['failed']}")
        print(f"   Success Rate: {success_rate:.1f}%")
        print(f"   Status Update: {'✅' if status_update.get('success') else '❌'}")
        
        results["overall_success"] = success_rate >= 70  # 70% threshold for success
        return results


def main():
    """Main execution"""
    print("🌊 Claude Flow Swarm Configuration")
    print("=" * 60)
    
    # Check existing swarm status
    configurator = SwarmConfigurator()
    status_result = configurator.run_claude_flow_cmd(["hive-mind", "status"])
    
    if not status_result.get("success"):
        print("❌ No active Hive Mind found. Please run initialization first.")
        return 1
    
    print("✅ Active Hive Mind found - proceeding with configuration")
    print("🎯 Mapping desired agents to existing workers:")
    
    for mapping in configurator.agent_mappings:
        print(f"   {mapping['desired_id']} → {mapping['worker_type']} ({mapping['role']})")
    
    # Configure the swarm
    results = configurator.configure_swarm_parallel()
    
    # Output summary
    print(f"\n📋 Configuration Results Summary:")
    print(f"Agent Registrations: {len(results['agent_registrations'])} operations")
    print(f"Memory Storage: {len(results['memory_storage'])} operations") 
    print(f"Task Assignments: {len(results['task_assignments'])} operations")
    
    if results["overall_success"]:
        print("\n🎉 Swarm configuration completed successfully!")
        print("🚀 The swarm is now ready with:")
        print("   • 5 mapped agents (SwarmLead, RequirementsAnalyst, SystemDesigner, BackendDev, QAEngineer)")
        print("   • Centralized coordination memory")
        print("   • Hierarchical task structure (main_init → analyze_requirements → design_architecture → implement_core → test_validate)")
        print("   • 'init' objective with auto strategy")
    else:
        print("\n⚠️ Swarm configuration completed with some issues")
        print("   Check the detailed results for specific failures")
    
    # Output detailed results
    print(f"\n📋 Detailed Results:")
    print(json.dumps(results, indent=2, default=str))
    
    return 0 if results["overall_success"] else 1


if __name__ == "__main__":
    sys.exit(main())