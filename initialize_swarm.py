#!/usr/bin/env python3
"""
Claude Flow Swarm Initialization Script
Implements the BatchTool pattern for parallel agent spawning and coordination setup
"""

import sys
import json
import asyncio
import concurrent.futures
from typing import Dict, List, Any
from claudette.integrations.claude_flow_bridge import claude_flow

class SwarmInitializer:
    """Handles parallel initialization of Claude Flow swarm with specific agents"""
    
    def __init__(self):
        self.results = {}
        self.agents_config = [
            {
                "id": "SwarmLead",
                "type": "coordinator", 
                "name": "SwarmLead",
                "capabilities": ["task_coordination", "resource_allocation", "progress_monitoring", "decision_making"],
                "priority": "high"
            },
            {
                "id": "RequirementsAnalyst",
                "type": "researcher",
                "name": "RequirementsAnalyst", 
                "capabilities": ["requirement_gathering", "stakeholder_analysis", "documentation", "feasibility_assessment"],
                "priority": "medium"
            },
            {
                "id": "SystemDesigner",
                "type": "architect",
                "name": "SystemDesigner",
                "capabilities": ["system_architecture", "design_patterns", "scalability_planning", "technology_selection"], 
                "priority": "medium"
            },
            {
                "id": "BackendDev", 
                "type": "coder",
                "name": "BackendDev",
                "capabilities": ["backend_development", "api_design", "database_management", "code_optimization"],
                "priority": "medium"
            },
            {
                "id": "QAEngineer",
                "type": "tester", 
                "name": "QAEngineer",
                "capabilities": ["test_planning", "automation", "quality_assurance", "performance_testing"],
                "priority": "medium"
            }
        ]
        
        self.memory_config = [
            {"key": "swarm/objective", "value": "init", "metadata": {"type": "objective", "created_by": "user"}},
            {"key": "swarm/config", "value": {"mode": "centralized", "strategy": "auto", "coordination_type": "hierarchical"}},
            {"key": "swarm/status", "value": "initializing", "metadata": {"type": "status", "updated_by": "system"}}
        ]
        
        self.tasks_config = [
            {
                "id": "main_init",
                "title": "Initialize System", 
                "description": "Main initialization task for the entire system setup",
                "assignee": "SwarmLead",
                "priority": "high",
                "dependencies": []
            },
            {
                "id": "analyze_requirements",
                "title": "Analyze Requirements",
                "description": "Gather and analyze system requirements for initialization", 
                "assignee": "RequirementsAnalyst",
                "priority": "high",
                "dependencies": ["main_init"]
            },
            {
                "id": "design_architecture", 
                "title": "Design Architecture",
                "description": "Design system architecture based on requirements analysis",
                "assignee": "SystemDesigner", 
                "priority": "high",
                "dependencies": ["analyze_requirements"]
            },
            {
                "id": "implement_core",
                "title": "Implement Core",
                "description": "Implement core system components based on architecture design",
                "assignee": "BackendDev",
                "priority": "medium", 
                "dependencies": ["design_architecture"]
            },
            {
                "id": "test_validate",
                "title": "Test & Validate", 
                "description": "Test and validate the implemented core system",
                "assignee": "QAEngineer",
                "priority": "medium",
                "dependencies": ["implement_core"]
            }
        ]
    
    def spawn_agent_batch(self, agent_config: Dict[str, Any]) -> Dict[str, Any]:
        """Spawn a single agent with error handling"""
        try:
            result = claude_flow.spawn_agent(
                agent_type=agent_config["type"],
                name=agent_config["name"], 
                capabilities=agent_config["capabilities"]
            )
            return {
                "agent_id": agent_config["id"],
                "success": result.get("success", False),
                "details": result
            }
        except Exception as e:
            return {
                "agent_id": agent_config["id"], 
                "success": False,
                "error": str(e)
            }
    
    def store_memory_batch(self, memory_item: Dict[str, Any]) -> Dict[str, Any]:
        """Store memory item with error handling"""
        try:
            result = claude_flow.use_memory(
                action="store",
                key=memory_item["key"],
                value=json.dumps(memory_item["value"]) if isinstance(memory_item["value"], dict) else str(memory_item["value"])
            )
            return {
                "key": memory_item["key"],
                "success": result.get("success", False),
                "details": result
            }
        except Exception as e:
            return {
                "key": memory_item["key"],
                "success": False, 
                "error": str(e)
            }
    
    def create_task_batch(self, task_config: Dict[str, Any]) -> Dict[str, Any]:
        """Create task using orchestration with error handling"""
        try:
            task_description = f"Task: {task_config['title']} - {task_config['description']} (Assigned to: {task_config['assignee']})"
            result = claude_flow.orchestrate_task(
                task_description=task_description,
                strategy="adaptive"
            )
            return {
                "task_id": task_config["id"],
                "success": result.get("success", False),
                "details": result
            }
        except Exception as e:
            return {
                "task_id": task_config["id"],
                "success": False,
                "error": str(e)
            }
    
    def initialize_parallel(self) -> Dict[str, Any]:
        """Initialize swarm using BatchTool pattern - everything in parallel"""
        print("🚀 Initializing Claude Flow Swarm with 5 Agents...")
        print("=" * 60)
        
        # Check claude-flow availability
        if not claude_flow.is_available():
            return {
                "success": False,
                "error": "Claude-flow is not available. Please install with: npm install claude-flow@alpha"
            }
        
        # Use ThreadPoolExecutor for parallel execution (BatchTool pattern)
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            
            # Submit all operations in parallel
            futures = []
            
            # 1. Spawn agents in parallel
            print("📋 Spawning 5 agents in parallel...")
            for agent_config in self.agents_config:
                future = executor.submit(self.spawn_agent_batch, agent_config)
                futures.append(("agent", future))
            
            # 2. Store memory in parallel  
            print("💾 Storing memory configuration in parallel...")
            for memory_item in self.memory_config:
                future = executor.submit(self.store_memory_batch, memory_item)
                futures.append(("memory", future))
            
            # 3. Create tasks in parallel
            print("📝 Creating task hierarchy in parallel...")
            for task_config in self.tasks_config:
                future = executor.submit(self.create_task_batch, task_config)
                futures.append(("task", future))
            
            # Collect all results
            results = {
                "agents": [],
                "memory": [],
                "tasks": [],
                "summary": {"total": len(futures), "successful": 0, "failed": 0}
            }
            
            # Wait for all operations to complete
            for operation_type, future in futures:
                try:
                    result = future.result(timeout=30)
                    results[operation_type + "s"].append(result)
                    
                    if result.get("success", False):
                        results["summary"]["successful"] += 1
                        print(f"✅ {operation_type.title()}: {result.get('agent_id', result.get('key', result.get('task_id', 'Unknown')))}")
                    else:
                        results["summary"]["failed"] += 1
                        print(f"❌ {operation_type.title()}: {result.get('agent_id', result.get('key', result.get('task_id', 'Unknown')))} - {result.get('error', 'Unknown error')}")
                        
                except concurrent.futures.TimeoutError:
                    results["summary"]["failed"] += 1
                    print(f"⏰ {operation_type.title()}: Timeout")
                except Exception as e:
                    results["summary"]["failed"] += 1
                    print(f"💥 {operation_type.title()}: Exception - {str(e)}")
        
        # Get final swarm status
        print("\n🔍 Checking swarm status...")
        swarm_status = claude_flow.get_swarm_status()
        results["swarm_status"] = swarm_status
        
        # Calculate success rate
        success_rate = (results["summary"]["successful"] / results["summary"]["total"]) * 100 if results["summary"]["total"] > 0 else 0
        results["summary"]["success_rate"] = success_rate
        
        # Final summary
        print(f"\n📊 Initialization Summary:")
        print(f"   Total Operations: {results['summary']['total']}")
        print(f"   Successful: {results['summary']['successful']}")
        print(f"   Failed: {results['summary']['failed']}")
        print(f"   Success Rate: {success_rate:.1f}%")
        print(f"   Swarm Status: {swarm_status.get('status', 'unknown')}")
        
        results["success"] = success_rate >= 80  # Consider successful if 80%+ operations succeed
        return results


def main():
    """Main execution function"""
    print("🌊 Claude Flow Swarm Initialization")
    print("Using BatchTool Pattern for Parallel Operations")
    print("=" * 60)
    
    initializer = SwarmInitializer()
    results = initializer.initialize_parallel()
    
    # Output final results as JSON for programmatic access
    print(f"\n📋 Final Results:")
    print(json.dumps(results, indent=2, default=str))
    
    return 0 if results["success"] else 1


if __name__ == "__main__":
    sys.exit(main())