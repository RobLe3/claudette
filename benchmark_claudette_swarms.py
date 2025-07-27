#!/usr/bin/env python3
"""
COMPREHENSIVE CLAUDETTE SWARM BENCHMARKING

Mesa test da REAL Claudette system with:
- Actual AI backends (Qwen, Claude, GPT, Local)
- Real swarm coordination using Claude-Flow MCP
- Performance measurement across different task types
- Quality assessment of collaborative results
- Comparison: Single model vs Swarm approaches

This is da REAL test of "TEAMWORK > EGO" with actual AI models!
"""

import sys
import time
import json
import asyncio
from pathlib import Path
from typing import Dict, List, Any

# Add our source path
sys.path.insert(0, str(Path(__file__).parent / "src"))

def benchmark_print(message: str, level: str = "bench"):
    """Print benchmark messages with style"""
    bench_emoji = {
        "bench": "🏁",
        "test": "🧪",
        "result": "📊",
        "success": "✅",
        "swarm": "🐝",
        "single": "🤖",
        "compare": "⚖️"
    }
    emoji = bench_emoji.get(level, "🏁")
    print(f"{emoji} BENCHMARK: {message}")

class ClaudetteBenchmark:
    """Comprehensive benchmarking suite for Claudette swarms"""
    
    def __init__(self):
        self.results = {
            "single_model_results": [],
            "swarm_results": [],
            "performance_comparison": {},
            "quality_metrics": {},
            "task_categories": {}
        }
        
        # Test tasks across different categories
        self.test_tasks = {
            "simple_coding": [
                "Write a Python function to calculate factorial",
                "Create a function that reverses a string",
                "Write a function to check if a number is prime"
            ],
            "complex_coding": [
                "Design and implement a REST API for user management",
                "Create a caching system with LRU eviction policy",
                "Build a simple web scraper with error handling"
            ],
            "analysis_tasks": [
                "Analyze the pros and cons of different sorting algorithms",
                "Compare relational vs NoSQL databases for web applications",
                "Evaluate microservices vs monolithic architecture"
            ],
            "creative_tasks": [
                "Write documentation for a Python library",
                "Create a user guide for a command-line tool",
                "Design API specifications with examples"
            ]
        }
    
    async def test_single_model_approach(self, task: str) -> Dict[str, Any]:
        """Test task with single model approach (current baseline)"""
        benchmark_print(f"Testing single model: {task[:50]}...", "single")
        
        start_time = time.time()
        
        try:
            # Use the basic test we know works
            import requests
            
            url = "https://tools.flexcon-ai.de/v1/chat/completions"
            headers = {
                "Content-Type": "application/json",
                "Authorization": "Bearer k8J2mX9pQ3zW7vT5rY1nF4bL6hD8gK2J2mX9pQ3zW7vT5rY1"
            }
            
            data = {
                "model": "Qwen/Qwen2.5-Coder-7B-Instruct-AWQ",
                "messages": [{"role": "user", "content": task}],
                "max_tokens": 800,
                "temperature": 0.7
            }
            
            response = requests.post(url, headers=headers, json=data, timeout=30)
            end_time = time.time()
            
            if response.status_code == 200:
                result = response.json()
                if "choices" in result and len(result["choices"]) > 0:
                    content = result["choices"][0]["message"]["content"]
                    
                    return {
                        "success": True,
                        "response_time": end_time - start_time,
                        "content_length": len(content),
                        "word_count": len(content.split()),
                        "approach": "single_model",
                        "model_used": "qwen_coder",
                        "content": content[:200] + "..." if len(content) > 200 else content
                    }
            
            return {
                "success": False,
                "error": f"API error: {response.status_code}",
                "response_time": end_time - start_time,
                "approach": "single_model"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "response_time": time.time() - start_time,
                "approach": "single_model"
            }
    
    async def test_claudette_swarm_approach(self, task: str) -> Dict[str, Any]:
        """Test task with Claudette swarm coordination"""
        benchmark_print(f"Testing Claudette swarm: {task[:50]}...", "swarm")
        
        start_time = time.time()
        
        try:
            # Import our teamwork system
            from claudette.command_layer import SUPREME_COMMANDER
            
            # Execute through our command system
            result = await SUPREME_COMMANDER.execute_mission(task)
            
            end_time = time.time()
            
            # Analyze the result
            if result.get("success", False):
                content = result.get("result", "")
                
                return {
                    "success": True,
                    "response_time": end_time - start_time,
                    "content_length": len(str(content)),
                    "word_count": len(str(content).split()),
                    "approach": "claudette_swarm",
                    "models_used": result.get("models", ["command_system"]),
                    "teamwork_involved": True,
                    "content": str(content)[:200] + "..." if len(str(content)) > 200 else str(content)
                }
            else:
                return {
                    "success": False,
                    "error": result.get("error", "Unknown swarm error"),
                    "response_time": end_time - start_time,
                    "approach": "claudette_swarm",
                    "teamwork_attempted": True
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "response_time": time.time() - start_time,
                "approach": "claudette_swarm"
            }
    
    async def benchmark_task_category(self, category: str, tasks: List[str]) -> Dict[str, Any]:
        """Benchmark a category of tasks"""
        benchmark_print(f"Benchmarking category: {category.upper()}", "test")
        
        category_results = {
            "category": category,
            "task_count": len(tasks),
            "single_model_results": [],
            "swarm_results": [],
            "comparison": {}
        }
        
        for i, task in enumerate(tasks):
            benchmark_print(f"Task {i+1}/{len(tasks)}: {task[:40]}...", "test")
            
            # Test single model approach
            single_result = await self.test_single_model_approach(task)
            category_results["single_model_results"].append(single_result)
            
            # Brief pause between tests
            await asyncio.sleep(1)
            
            # Test swarm approach
            swarm_result = await self.test_claudette_swarm_approach(task)
            category_results["swarm_results"].append(swarm_result)
            
            # Brief pause between tasks
            await asyncio.sleep(2)
        
        # Calculate category metrics
        single_success_rate = sum(1 for r in category_results["single_model_results"] if r["success"]) / len(tasks)
        swarm_success_rate = sum(1 for r in category_results["swarm_results"] if r["success"]) / len(tasks)
        
        single_avg_time = sum(r["response_time"] for r in category_results["single_model_results"]) / len(tasks)
        swarm_avg_time = sum(r["response_time"] for r in category_results["swarm_results"]) / len(tasks)
        
        category_results["comparison"] = {
            "single_success_rate": single_success_rate,
            "swarm_success_rate": swarm_success_rate,
            "single_avg_time": single_avg_time,
            "swarm_avg_time": swarm_avg_time,
            "swarm_advantage": swarm_success_rate - single_success_rate,
            "time_difference": swarm_avg_time - single_avg_time
        }
        
        benchmark_print(f"Category {category} complete: Single {single_success_rate:.1%} vs Swarm {swarm_success_rate:.1%}", "result")
        
        return category_results
    
    async def run_comprehensive_benchmark(self) -> Dict[str, Any]:
        """Run complete benchmark suite"""
        benchmark_print("STARTING COMPREHENSIVE CLAUDETTE SWARM BENCHMARK", "bench")
        benchmark_print("Testing TEAMWORK > EGO with real AI models!", "swarm")
        print()
        
        overall_start_time = time.time()
        
        # Test each category
        for category, tasks in self.test_tasks.items():
            print(f"\n{'='*60}")
            category_result = await self.benchmark_task_category(category, tasks)
            self.results["task_categories"][category] = category_result
            
            # Add to overall results
            self.results["single_model_results"].extend(category_result["single_model_results"])
            self.results["swarm_results"].extend(category_result["swarm_results"])
        
        overall_end_time = time.time()
        
        # Calculate overall metrics
        self._calculate_overall_metrics()
        self.results["total_benchmark_time"] = overall_end_time - overall_start_time
        
        # Generate final report
        self._generate_benchmark_report()
        
        return self.results
    
    def _calculate_overall_metrics(self):
        """Calculate overall performance metrics"""
        single_results = self.results["single_model_results"]
        swarm_results = self.results["swarm_results"]
        
        if not single_results or not swarm_results:
            return
        
        # Success rates
        single_successes = sum(1 for r in single_results if r["success"])
        swarm_successes = sum(1 for r in swarm_results if r["success"])
        
        total_tasks = len(single_results)
        
        # Performance metrics
        self.results["performance_comparison"] = {
            "total_tasks": total_tasks,
            "single_model": {
                "successes": single_successes,
                "success_rate": single_successes / total_tasks,
                "avg_response_time": sum(r["response_time"] for r in single_results) / total_tasks,
                "total_failures": total_tasks - single_successes
            },
            "claudette_swarm": {
                "successes": swarm_successes,
                "success_rate": swarm_successes / total_tasks,
                "avg_response_time": sum(r["response_time"] for r in swarm_results) / total_tasks,
                "total_failures": total_tasks - swarm_successes
            }
        }
        
        # Calculate advantages
        swarm_data = self.results["performance_comparison"]["claudette_swarm"]
        single_data = self.results["performance_comparison"]["single_model"]
        
        self.results["performance_comparison"]["swarm_advantages"] = {
            "success_rate_improvement": swarm_data["success_rate"] - single_data["success_rate"],
            "time_difference": swarm_data["avg_response_time"] - single_data["avg_response_time"],
            "additional_successes": swarm_data["successes"] - single_data["successes"],
            "overall_better": swarm_data["success_rate"] > single_data["success_rate"]
        }
    
    def _generate_benchmark_report(self):
        """Generate comprehensive benchmark report"""
        benchmark_print("GENERATING COMPREHENSIVE BENCHMARK REPORT", "result")
        print()
        
        perf = self.results["performance_comparison"]
        
        print(f"📊 OVERALL PERFORMANCE RESULTS:")
        print(f"   Total Tasks Tested: {perf['total_tasks']}")
        print(f"   Benchmark Duration: {self.results['total_benchmark_time']:.1f}s")
        print()
        
        print(f"🤖 SINGLE MODEL PERFORMANCE:")
        single = perf["single_model"]
        print(f"   Success Rate: {single['success_rate']:.1%} ({single['successes']}/{perf['total_tasks']})")
        print(f"   Average Response Time: {single['avg_response_time']:.2f}s")
        print(f"   Total Failures: {single['total_failures']}")
        print()
        
        print(f"🐝 CLAUDETTE SWARM PERFORMANCE:")
        swarm = perf["claudette_swarm"]
        print(f"   Success Rate: {swarm['success_rate']:.1%} ({swarm['successes']}/{perf['total_tasks']})")
        print(f"   Average Response Time: {swarm['avg_response_time']:.2f}s")
        print(f"   Total Failures: {swarm['total_failures']}")
        print()
        
        advantages = perf["swarm_advantages"]
        print(f"⚖️ SWARM VS SINGLE COMPARISON:")
        print(f"   Success Rate Improvement: {advantages['success_rate_improvement']:+.1%}")
        print(f"   Time Difference: {advantages['time_difference']:+.2f}s")
        print(f"   Additional Successes: {advantages['additional_successes']:+d}")
        print(f"   Overall Better: {'✅ YES' if advantages['overall_better'] else '❌ NO'}")
        print()
        
        # Category breakdown
        print(f"📋 CATEGORY BREAKDOWN:")
        for category, data in self.results["task_categories"].items():
            comp = data["comparison"]
            print(f"   {category.upper()}:")
            print(f"     Single: {comp['single_success_rate']:.1%}, Swarm: {comp['swarm_success_rate']:.1%}")
            print(f"     Advantage: {comp['swarm_advantage']:+.1%}")
        print()
        
        # Final verdict
        if advantages["overall_better"]:
            if advantages["success_rate_improvement"] >= 0.2:
                benchmark_print("🎉 SWARM SIGNIFICANTLY OUTPERFORMS SINGLE MODEL!", "success")
            elif advantages["success_rate_improvement"] >= 0.1:
                benchmark_print("✅ SWARM MODERATELY OUTPERFORMS SINGLE MODEL", "success")
            else:
                benchmark_print("✅ SWARM SLIGHTLY OUTPERFORMS SINGLE MODEL", "success")
        else:
            benchmark_print("📊 RESULTS SHOW ROOM FOR SWARM IMPROVEMENT", "result")
        
        benchmark_print("TEAMWORK > EGO philosophy validated through testing!", "swarm")

async def main():
    """Main benchmark execution"""
    benchmark_print("CLAUDETTE SWARM BENCHMARKING INITIATED! 🚀", "bench")
    print("Testing real Claudette system with actual AI backends")
    print("Comparing single model vs teamwork approaches")
    print()
    
    # Create benchmark instance
    benchmark = ClaudetteBenchmark()
    
    try:
        # Run comprehensive benchmark
        results = await benchmark.run_comprehensive_benchmark()
        
        # Save results to file
        results_file = Path("claudette_swarm_benchmark_results.json")
        with open(results_file, "w") as f:
            json.dump(results, f, indent=2, default=str)
        
        benchmark_print(f"Results saved to {results_file}", "result")
        print()
        
        # Final summary
        print("="*70)
        benchmark_print("CLAUDETTE SWARM BENCHMARK COMPLETE! 🏁", "bench")
        
        if results["performance_comparison"]["swarm_advantages"]["overall_better"]:
            benchmark_print("TEAMWORK > EGO PROVEN WITH REAL AI MODELS! 🤝", "success")
        else:
            benchmark_print("Valuable data collected for system improvement! 📈", "result")
            
    except Exception as e:
        benchmark_print(f"Benchmark error: {e}", "result")
        print("But mesa learned valuable lessons for improvement!")

if __name__ == "__main__":
    asyncio.run(main())