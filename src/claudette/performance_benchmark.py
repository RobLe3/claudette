"""
Comprehensive performance benchmarking system for claudette
Measures and validates all performance optimizations
"""

import time
import sys
import os
import subprocess
import statistics
import json
import psutil
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import threading


@dataclass
class BenchmarkResult:
    """Result of a single benchmark test"""
    test_name: str
    duration_ms: float
    memory_mb: float
    cpu_percent: float
    success: bool
    error: Optional[str] = None
    metadata: Dict[str, Any] = None


@dataclass
class PerformanceMetrics:
    """Complete performance metrics"""
    startup_time_ms: float
    memory_peak_mb: float
    memory_baseline_mb: float
    import_time_ms: float
    fast_path_time_ms: float
    full_pipeline_time_ms: float
    cache_hit_rate: float
    optimization_effectiveness: float


class BenchmarkSuite:
    """Comprehensive benchmark suite for claudette performance"""
    
    def __init__(self):
        self.results: List[BenchmarkResult] = []
        self.baseline_results: Optional[Dict[str, Any]] = None
        self.benchmark_dir = Path.home() / '.claudette' / 'benchmarks'
        self.benchmark_dir.mkdir(parents=True, exist_ok=True)
    
    def run_full_benchmark(self) -> Dict[str, Any]:
        """Run complete benchmark suite"""
        print("🚀 Running Claudette Performance Benchmark Suite")
        print("=" * 50)
        
        benchmark_start = time.time()
        
        # Core performance tests
        self._benchmark_startup_performance()
        self._benchmark_memory_usage()
        self._benchmark_import_performance()
        self._benchmark_command_routing()
        self._benchmark_cache_performance()
        self._benchmark_optimization_effectiveness()
        
        # Stress tests
        self._benchmark_concurrent_requests()
        self._benchmark_memory_pressure()
        
        benchmark_duration = time.time() - benchmark_start
        
        # Generate report
        report = self._generate_benchmark_report(benchmark_duration)
        
        # Save results
        self._save_benchmark_results()
        
        return report
    
    def _benchmark_startup_performance(self):
        """Benchmark startup time for different command types"""
        print("\n⏱️  Benchmarking Startup Performance...")
        
        commands_to_test = [
            (["--help"], "help_command"),
            (["--version"], "version_command"),
            (["edit", "--help"], "edit_help"),
            (["status"], "status_command"),
        ]
        
        for cmd_args, test_name in commands_to_test:
            times = []
            memory_usage = []
            
            for _ in range(5):  # 5 runs per test
                start_time = time.time()
                start_memory = self._get_memory_usage()
                
                try:
                    result = subprocess.run(
                        [sys.executable, '-m', 'claudette'] + cmd_args,
                        capture_output=True,
                        text=True,
                        timeout=10
                    )
                    
                    duration = (time.time() - start_time) * 1000
                    memory_peak = self._get_memory_usage()
                    
                    times.append(duration)
                    memory_usage.append(memory_peak - start_memory)
                    
                    success = result.returncode == 0
                    
                except Exception as e:
                    success = False
                    duration = 0
                    memory_peak = 0
            
            if times:
                avg_time = statistics.mean(times)
                avg_memory = statistics.mean(memory_usage)
                
                self.results.append(BenchmarkResult(
                    test_name=f"startup_{test_name}",
                    duration_ms=avg_time,
                    memory_mb=avg_memory,
                    cpu_percent=0,
                    success=success,
                    metadata={
                        'times': times,
                        'memory_usage': memory_usage,
                        'std_dev': statistics.stdev(times) if len(times) > 1 else 0
                    }
                ))
                
                print(f"  {test_name}: {avg_time:.1f}ms ± {statistics.stdev(times) if len(times) > 1 else 0:.1f}ms")
    
    def _benchmark_memory_usage(self):
        """Benchmark memory usage patterns"""
        print("\n💾 Benchmarking Memory Usage...")
        
        # Test memory usage for different operations
        operations = [
            ("import_claudette", lambda: __import__('claudette')),
            ("create_cli_instance", lambda: self._create_cli_instance()),
            ("load_config", lambda: self._load_config()),
            ("initialize_cache", lambda: self._initialize_cache()),
        ]
        
        for op_name, operation in operations:
            memory_before = self._get_memory_usage()
            
            try:
                start_time = time.time()
                operation()
                duration = (time.time() - start_time) * 1000
                memory_after = self._get_memory_usage()
                memory_delta = memory_after - memory_before
                
                self.results.append(BenchmarkResult(
                    test_name=f"memory_{op_name}",
                    duration_ms=duration,
                    memory_mb=memory_delta,
                    cpu_percent=0,
                    success=True,
                    metadata={'memory_before': memory_before, 'memory_after': memory_after}
                ))
                
                print(f"  {op_name}: +{memory_delta:.1f}MB in {duration:.1f}ms")
                
            except Exception as e:
                self.results.append(BenchmarkResult(
                    test_name=f"memory_{op_name}",
                    duration_ms=0,
                    memory_mb=0,
                    cpu_percent=0,
                    success=False,
                    error=str(e)
                ))
    
    def _benchmark_import_performance(self):
        """Benchmark import times for heavy modules"""
        print("\n📦 Benchmarking Import Performance...")
        
        modules_to_test = [
            'openai',
            'tiktoken', 
            'yaml',
            'anthropic'
        ]
        
        for module_name in modules_to_test:
            # Test direct import
            times = []
            
            for _ in range(3):
                # Fresh Python process for each test
                start_time = time.time()
                
                try:
                    result = subprocess.run([
                        sys.executable, '-c',
                        f'import {module_name}'
                    ], capture_output=True, timeout=10)
                    
                    duration = (time.time() - start_time) * 1000
                    times.append(duration)
                    success = result.returncode == 0
                    
                except Exception:
                    success = False
                    duration = 0
            
            if times:
                avg_time = statistics.mean(times)
                
                self.results.append(BenchmarkResult(
                    test_name=f"import_{module_name}",
                    duration_ms=avg_time,
                    memory_mb=0,
                    cpu_percent=0,
                    success=success,
                    metadata={'times': times, 'module': module_name}
                ))
                
                status = "✅" if success else "❌"
                print(f"  {module_name}: {status} {avg_time:.1f}ms")
    
    def _benchmark_command_routing(self):
        """Benchmark command routing performance"""
        print("\n🚦 Benchmarking Command Routing...")
        
        from claudette.startup_optimizer import FastestPathRouter
        
        router = FastestPathRouter()
        
        test_commands = [
            ['--help'],
            ['edit', 'file.py'],
            ['commit'],
            ['ask', 'question'],
            ['status'],
            ['version'],
        ]
        
        for cmd in test_commands:
            times = []
            
            for _ in range(1000):  # Many iterations for precise timing
                start_time = time.time()
                route = router.get_optimal_route(cmd)
                duration = (time.time() - start_time) * 1000
                times.append(duration)
            
            avg_time = statistics.mean(times)
            
            self.results.append(BenchmarkResult(
                test_name=f"routing_{cmd[0]}",
                duration_ms=avg_time,
                memory_mb=0,
                cpu_percent=0,
                success=True,
                metadata={
                    'command': cmd,
                    'route': route,
                    'iterations': len(times)
                }
            ))
            
            print(f"  {' '.join(cmd)}: {avg_time:.3f}ms per route decision")
    
    def _benchmark_cache_performance(self):
        """Benchmark cache hit/miss performance"""
        print("\n🗄️  Benchmarking Cache Performance...")
        
        try:
            from claudette.cache import CacheManager
            
            cache = CacheManager()
            
            # Test cache operations
            cache_ops = [
                ("cache_write", lambda: cache.set("test_key", {"data": "test_value"})),
                ("cache_read_hit", lambda: cache.get("test_key")),
                ("cache_read_miss", lambda: cache.get("nonexistent_key")),
            ]
            
            for op_name, operation in cache_ops:
                times = []
                
                for _ in range(100):
                    start_time = time.time()
                    result = operation()
                    duration = (time.time() - start_time) * 1000
                    times.append(duration)
                
                avg_time = statistics.mean(times)
                
                self.results.append(BenchmarkResult(
                    test_name=f"cache_{op_name}",
                    duration_ms=avg_time,
                    memory_mb=0,
                    cpu_percent=0,
                    success=True,
                    metadata={'iterations': len(times)}
                ))
                
                print(f"  {op_name}: {avg_time:.3f}ms average")
                
        except ImportError:
            print("  ⚠️  Cache module not available for benchmarking")
    
    def _benchmark_optimization_effectiveness(self):
        """Benchmark optimization effectiveness"""
        print("\n⚡ Benchmarking Optimization Effectiveness...")
        
        try:
            from claudette.memory_optimizer import get_memory_optimizer
            from claudette.advanced_lazy_loader import get_advanced_loader
            
            optimizer = get_memory_optimizer()
            loader = get_advanced_loader()
            
            # Test memory optimization
            memory_before = self._get_memory_usage()
            start_time = time.time()
            
            optimization_stats = optimizer.optimize_runtime_memory()
            
            optimization_time = (time.time() - start_time) * 1000
            memory_after = self._get_memory_usage()
            memory_saved = memory_before - memory_after
            
            self.results.append(BenchmarkResult(
                test_name="memory_optimization",
                duration_ms=optimization_time,
                memory_mb=memory_saved,
                cpu_percent=0,
                success=True,
                metadata=optimization_stats
            ))
            
            print(f"  Memory optimization: {memory_saved:.1f}MB saved in {optimization_time:.1f}ms")
            
            # Test lazy loading effectiveness
            lazy_modules = ['openai', 'tiktoken', 'yaml']
            lazy_times = []
            
            for module in lazy_modules:
                lazy_import = loader.lazy_import_with_daemon(module)
                
                start_time = time.time()
                available = bool(lazy_import)  # Check availability without loading
                check_time = (time.time() - start_time) * 1000
                lazy_times.append(check_time)
            
            avg_lazy_time = statistics.mean(lazy_times)
            
            self.results.append(BenchmarkResult(
                test_name="lazy_loading_check",
                duration_ms=avg_lazy_time,
                memory_mb=0,
                cpu_percent=0,
                success=True,
                metadata={'modules_tested': lazy_modules}
            ))
            
            print(f"  Lazy loading check: {avg_lazy_time:.3f}ms average")
            
        except ImportError as e:
            print(f"  ⚠️  Optimization modules not available: {e}")
    
    def _benchmark_concurrent_requests(self):
        """Benchmark concurrent request handling"""
        print("\n🔄 Benchmarking Concurrent Performance...")
        
        def run_command():
            start_time = time.time()
            try:
                result = subprocess.run([
                    sys.executable, '-m', 'claudette', '--version'
                ], capture_output=True, timeout=5)
                duration = (time.time() - start_time) * 1000
                return duration, result.returncode == 0
            except Exception:
                return 0, False
        
        # Test concurrent execution
        with ThreadPoolExecutor(max_workers=5) as executor:
            start_time = time.time()
            futures = [executor.submit(run_command) for _ in range(10)]
            results = [future.result() for future in futures]
            total_time = (time.time() - start_time) * 1000
        
        successful_runs = [r for r in results if r[1]]
        avg_concurrent_time = statistics.mean([r[0] for r in successful_runs]) if successful_runs else 0
        
        self.results.append(BenchmarkResult(
            test_name="concurrent_requests",
            duration_ms=avg_concurrent_time,
            memory_mb=0,
            cpu_percent=0,
            success=len(successful_runs) == len(results),
            metadata={
                'total_requests': len(results),
                'successful_requests': len(successful_runs),
                'total_time': total_time,
                'throughput': len(results) / (total_time / 1000)
            }
        ))
        
        print(f"  Concurrent requests: {len(successful_runs)}/{len(results)} successful")
        print(f"  Average time: {avg_concurrent_time:.1f}ms")
        print(f"  Throughput: {len(results) / (total_time / 1000):.1f} requests/second")
    
    def _benchmark_memory_pressure(self):
        """Benchmark performance under memory pressure"""
        print("\n🔥 Benchmarking Memory Pressure Handling...")
        
        # Create memory pressure
        memory_hogs = []
        try:
            # Allocate memory to create pressure
            for i in range(5):
                memory_hog = [0] * (10 * 1024 * 1024)  # 10M integers ≈ 80MB
                memory_hogs.append(memory_hog)
            
            # Test performance under pressure
            start_time = time.time()
            result = subprocess.run([
                sys.executable, '-m', 'claudette', '--help'
            ], capture_output=True, timeout=10)
            
            duration = (time.time() - start_time) * 1000
            success = result.returncode == 0
            
            self.results.append(BenchmarkResult(
                test_name="memory_pressure",
                duration_ms=duration,
                memory_mb=self._get_memory_usage(),
                cpu_percent=0,
                success=success,
                metadata={'pressure_created': True}
            ))
            
            print(f"  Under memory pressure: {duration:.1f}ms ({'✅' if success else '❌'})")
            
        except Exception as e:
            self.results.append(BenchmarkResult(
                test_name="memory_pressure",
                duration_ms=0,
                memory_mb=0,
                cpu_percent=0,
                success=False,
                error=str(e)
            ))
        finally:
            # Clean up memory
            del memory_hogs
    
    def _generate_benchmark_report(self, total_time: float) -> Dict[str, Any]:
        """Generate comprehensive benchmark report"""
        
        # Calculate key metrics
        startup_results = [r for r in self.results if r.test_name.startswith('startup_')]
        memory_results = [r for r in self.results if r.test_name.startswith('memory_')]
        import_results = [r for r in self.results if r.test_name.startswith('import_')]
        
        avg_startup = statistics.mean([r.duration_ms for r in startup_results if r.success])
        total_memory = sum([r.memory_mb for r in memory_results if r.success])
        total_import_time = sum([r.duration_ms for r in import_results if r.success])
        
        # Performance targets
        targets = {
            'startup_time_target_ms': 1000,
            'memory_target_mb': 100,
            'import_time_target_ms': 2000
        }
        
        # Calculate performance scores
        startup_score = min(100, (targets['startup_time_target_ms'] / max(avg_startup, 1)) * 100)
        memory_score = min(100, (targets['memory_target_mb'] / max(total_memory, 1)) * 100)
        import_score = min(100, (targets['import_time_target_ms'] / max(total_import_time, 1)) * 100)
        
        overall_score = (startup_score + memory_score + import_score) / 3
        
        report = {
            'timestamp': time.time(),
            'total_benchmark_time_s': total_time,
            'results': [asdict(r) for r in self.results],
            'summary': {
                'total_tests': len(self.results),
                'successful_tests': len([r for r in self.results if r.success]),
                'failed_tests': len([r for r in self.results if not r.success]),
                'avg_startup_time_ms': avg_startup,
                'total_memory_usage_mb': total_memory,
                'total_import_time_ms': total_import_time
            },
            'performance_scores': {
                'startup_score': startup_score,
                'memory_score': memory_score,
                'import_score': import_score,
                'overall_score': overall_score
            },
            'targets': targets
        }
        
        return report
    
    def _save_benchmark_results(self):
        """Save benchmark results to file"""
        timestamp = int(time.time())
        results_file = self.benchmark_dir / f'benchmark_results_{timestamp}.json'
        
        report = self._generate_benchmark_report(0)
        
        with open(results_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Also save as latest results
        latest_file = self.benchmark_dir / 'latest_benchmark.json'
        with open(latest_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\n📊 Benchmark results saved to: {results_file}")
    
    def _get_memory_usage(self) -> float:
        """Get current memory usage in MB"""
        try:
            return psutil.Process().memory_info().rss / 1024 / 1024
        except Exception:
            return 0
    
    def _create_cli_instance(self):
        """Create CLI instance for testing"""
        try:
            from claudette.main import ClaudetteCLI
            return ClaudetteCLI()
        except ImportError:
            return None
    
    def _load_config(self):
        """Load config for testing"""
        try:
            from claudette.config import Config
            return Config({})
        except ImportError:
            return None
    
    def _initialize_cache(self):
        """Initialize cache for testing"""
        try:
            from claudette.cache import CacheManager
            return CacheManager()
        except ImportError:
            return None


def run_performance_benchmark() -> Dict[str, Any]:
    """Run complete performance benchmark suite"""
    suite = BenchmarkSuite()
    return suite.run_full_benchmark()


def print_benchmark_summary(results: Dict[str, Any]):
    """Print formatted benchmark summary"""
    summary = results.get('summary', {})
    scores = results.get('performance_scores', {})
    
    print("\n" + "=" * 60)
    print("🏆 CLAUDETTE PERFORMANCE BENCHMARK RESULTS")
    print("=" * 60)
    
    print(f"\n📊 Test Summary:")
    print(f"  • Total Tests: {summary.get('total_tests', 0)}")
    print(f"  • Successful: {summary.get('successful_tests', 0)}")
    print(f"  • Failed: {summary.get('failed_tests', 0)}")
    
    print(f"\n⏱️  Performance Metrics:")
    print(f"  • Average Startup: {summary.get('avg_startup_time_ms', 0):.1f}ms")
    print(f"  • Memory Usage: {summary.get('total_memory_usage_mb', 0):.1f}MB")
    print(f"  • Import Time: {summary.get('total_import_time_ms', 0):.1f}ms")
    
    print(f"\n🎯 Performance Scores:")
    print(f"  • Startup Score: {scores.get('startup_score', 0):.1f}/100")
    print(f"  • Memory Score: {scores.get('memory_score', 0):.1f}/100")
    print(f"  • Import Score: {scores.get('import_score', 0):.1f}/100")
    print(f"  • Overall Score: {scores.get('overall_score', 0):.1f}/100")
    
    overall = scores.get('overall_score', 0)
    if overall >= 90:
        status = "🚀 EXCELLENT"
    elif overall >= 75:
        status = "✅ GOOD"
    elif overall >= 60:
        status = "⚠️  NEEDS IMPROVEMENT"
    else:
        status = "🔴 POOR"
    
    print(f"\n🏆 Overall Performance: {status}")


if __name__ == "__main__":
    results = run_performance_benchmark()
    print_benchmark_summary(results)