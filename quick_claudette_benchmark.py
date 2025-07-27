#!/usr/bin/env python3
"""
QUICK CLAUDETTE BENCHMARK - Focus on Working Components

Mesa test what actually works:
- Individual Qwen API calls (known working)
- Teamwork coordination (working)
- XP system progression (working) 
- Compare approaches for realistic assessment
"""

import time
import json
import asyncio
import requests
from pathlib import Path

def quick_print(message: str, level: str = "test"):
    """Quick benchmark messages"""
    emoji = {"test": "⚡", "result": "📊", "success": "✅", "compare": "⚖️"}
    print(f"{emoji.get(level, '⚡')} QUICK: {message}")

async def test_single_qwen_call(task: str) -> dict:
    """Test single Qwen API call"""
    start_time = time.time()
    
    try:
        url = "https://tools.flexcon-ai.de/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": "Bearer k8J2mX9pQ3zW7vT5rY1nF4bL6hD8gK2J2mX9pQ3zW7vT5rY1"
        }
        
        data = {
            "model": "Qwen/Qwen2.5-Coder-7B-Instruct-AWQ",
            "messages": [{"role": "user", "content": task}],
            "max_tokens": 300,
            "temperature": 0.7
        }
        
        response = requests.post(url, headers=headers, json=data, timeout=15)
        end_time = time.time()
        
        if response.status_code == 200:
            result = response.json()
            if "choices" in result and len(result["choices"]) > 0:
                content = result["choices"][0]["message"]["content"]
                return {
                    "success": True,
                    "time": end_time - start_time,
                    "content_length": len(content),
                    "approach": "single_qwen"
                }
        
        return {"success": False, "time": end_time - start_time, "error": f"Status {response.status_code}", "approach": "single_qwen"}
        
    except Exception as e:
        return {"success": False, "time": time.time() - start_time, "error": str(e), "approach": "single_qwen"}

async def test_teamwork_simulation(task: str) -> dict:
    """Test our teamwork system (simulated)"""
    start_time = time.time()
    
    try:
        # Import our teamwork system
        import sys
        sys.path.insert(0, str(Path(__file__).parent / "src"))
        
        from claudette.teamwork_orchestration import GLOBAL_TEAMWORK_SYSTEM, TeamMission, CollaborationStyle
        
        mission = TeamMission(
            description=task,
            complexity_level=2,
            collaboration_style=CollaborationStyle.SEQUENTIAL
        )
        
        result = await GLOBAL_TEAMWORK_SYSTEM.execute_team_mission(mission)
        end_time = time.time()
        
        return {
            "success": result["success"],
            "time": end_time - start_time,
            "teamwork_quality": result["teamwork_quality"],
            "team_members": len(result["team_members"]),
            "approach": "teamwork_simulation"
        }
        
    except Exception as e:
        return {"success": False, "time": time.time() - start_time, "error": str(e), "approach": "teamwork_simulation"}

async def run_quick_benchmark():
    """Run quick benchmark comparing approaches"""
    quick_print("QUICK CLAUDETTE BENCHMARK STARTING!", "test")
    
    # Simple test tasks
    test_tasks = [
        "Write a hello world program",
        "Create a simple function to add two numbers",
        "Explain what Python is"
    ]
    
    results = {"single_qwen": [], "teamwork_sim": [], "comparison": {}}
    
    for i, task in enumerate(test_tasks):
        quick_print(f"Testing task {i+1}: {task}", "test")
        
        # Test single Qwen approach
        single_result = await test_single_qwen_call(task)
        results["single_qwen"].append(single_result)
        quick_print(f"Single Qwen: {'✅' if single_result['success'] else '❌'} ({single_result['time']:.2f}s)", "result")
        
        # Brief pause
        await asyncio.sleep(1)
        
        # Test teamwork approach 
        team_result = await test_teamwork_simulation(task)
        results["teamwork_sim"].append(team_result)
        quick_print(f"Teamwork: {'✅' if team_result['success'] else '❌'} ({team_result['time']:.2f}s)", "result")
        
        await asyncio.sleep(1)
    
    # Calculate comparison
    single_successes = sum(1 for r in results["single_qwen"] if r["success"])
    team_successes = sum(1 for r in results["teamwork_sim"] if r["success"])
    
    single_avg_time = sum(r["time"] for r in results["single_qwen"]) / len(test_tasks)
    team_avg_time = sum(r["time"] for r in results["teamwork_sim"]) / len(test_tasks)
    
    results["comparison"] = {
        "total_tasks": len(test_tasks),
        "single_qwen_success_rate": single_successes / len(test_tasks),
        "teamwork_success_rate": team_successes / len(test_tasks),
        "single_avg_time": single_avg_time,
        "teamwork_avg_time": team_avg_time,
        "teamwork_advantage": (team_successes - single_successes) / len(test_tasks)
    }
    
    # Report results
    quick_print("QUICK BENCHMARK RESULTS:", "result")
    comp = results["comparison"]
    print(f"   Total Tasks: {comp['total_tasks']}")
    print(f"   Single Qwen Success: {comp['single_qwen_success_rate']:.1%}")
    print(f"   Teamwork Success: {comp['teamwork_success_rate']:.1%}")
    print(f"   Single Avg Time: {comp['single_avg_time']:.2f}s")
    print(f"   Teamwork Avg Time: {comp['teamwork_avg_time']:.2f}s")
    print(f"   Teamwork Advantage: {comp['teamwork_advantage']:+.1%}")
    
    if comp["teamwork_advantage"] > 0:
        quick_print("✅ TEAMWORK SHOWS ADVANTAGE!", "success")
    elif comp["teamwork_advantage"] == 0:
        quick_print("⚖️ BOTH APPROACHES PERFORM EQUALLY", "compare")
    else:
        quick_print("📊 SINGLE MODEL CURRENTLY MORE RELIABLE", "result")
    
    # Save results
    with open("quick_claudette_benchmark.json", "w") as f:
        json.dump(results, f, indent=2)
    
    quick_print("Results saved to quick_claudette_benchmark.json", "result")
    
    return results

async def test_xp_and_learning():
    """Test the XP and learning systems"""
    quick_print("TESTING XP AND LEARNING SYSTEMS", "test")
    
    try:
        import sys
        sys.path.insert(0, str(Path(__file__).parent / "src"))
        
        from claudette.soldier_xp_system import GLOBAL_XP_SYSTEM
        from claudette.mentorship_system import GLOBAL_PROTECTION_SYSTEM
        
        # Test soldier registration and XP
        soldier_name = "BenchmarkTestSoldier"
        profile = GLOBAL_XP_SYSTEM.register_soldier(soldier_name)
        
        # Simulate some missions to show learning
        missions = [
            ("Hello world task", True, 2.5),
            ("Simple function task", True, 3.2),
            ("Basic algorithm task", False, 8.1),  # Failure
            ("Retry algorithm task", True, 4.7),   # Success after learning
        ]
        
        quick_print("Simulating soldier learning progression...", "test")
        
        for task, success, time_taken in missions:
            xp_before = profile.total_xp
            
            GLOBAL_XP_SYSTEM.complete_mission(soldier_name, task, success, time_taken)
            
            xp_gained = profile.total_xp - xp_before
            quick_print(f"  Task: {task[:30]}... | Success: {'✅' if success else '❌'} | XP: +{xp_gained}", "result")
        
        # Show final stats
        best_skills = profile.get_best_skills(3)
        quick_print(f"Final soldier stats: Level {profile.overall_level}, Rank {profile.rank}", "success")
        for skill in best_skills:
            quick_print(f"  {skill.category.value}: Level {skill.level} ({skill.success_rate:.1%} success)", "result")
        
        # Test protection system
        wellbeing = GLOBAL_PROTECTION_SYSTEM.get_wellbeing(soldier_name)
        status = GLOBAL_PROTECTION_SYSTEM.get_mentorship_status(soldier_name)
        
        quick_print(f"Protection status: {status.value}, Morale: {wellbeing.morale:.1%}", "result")
        
        return True
        
    except Exception as e:
        quick_print(f"XP system test failed: {e}", "result")
        return False

async def main():
    """Main quick benchmark"""
    quick_print("CLAUDETTE QUICK BENCHMARK INITIATED! ⚡", "test")
    print()
    
    # Test 1: Quick performance comparison
    benchmark_results = await run_quick_benchmark()
    
    print("\n" + "="*50)
    
    # Test 2: XP and learning systems
    xp_success = await test_xp_and_learning()
    
    print("\n" + "="*50)
    
    # Final assessment
    quick_print("QUICK BENCHMARK COMPLETE!", "success")
    
    working_systems = []
    if benchmark_results["comparison"]["single_qwen_success_rate"] > 0:
        working_systems.append("✅ Qwen API integration")
    if benchmark_results["comparison"]["teamwork_success_rate"] > 0:
        working_systems.append("✅ Teamwork coordination")
    if xp_success:
        working_systems.append("✅ XP and learning systems")
    
    quick_print("WORKING SYSTEMS:", "success")
    for system in working_systems:
        print(f"   {system}")
    
    # Overall assessment
    teamwork_advantage = benchmark_results["comparison"]["teamwork_advantage"]
    if teamwork_advantage > 0:
        quick_print("🎉 TEAMWORK > EGO ADVANTAGE DETECTED!", "success")
    elif len(working_systems) >= 2:
        quick_print("💪 SOLID FOUNDATION - READY FOR ENHANCEMENT!", "success")
    else:
        quick_print("📈 GOOD PROGRESS - CONTINUE DEVELOPMENT!", "result")

if __name__ == "__main__":
    asyncio.run(main())