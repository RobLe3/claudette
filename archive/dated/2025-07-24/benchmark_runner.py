#!/usr/bin/env python3
"""Benchmark runner CLI for claudette performance testing."""

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, Any, Optional

class BenchmarkRunner:
    """CLI for running and comparing benchmarks."""
    
    def __init__(self):
        self.baseline_file = "baseline.json"
        self.output_file = "benchmark_results.json"
    
    def run_benchmarks(self, save_baseline: bool = False) -> Dict[str, Any]:
        """Run all benchmark tests and collect results."""
        print("🚀 Running claudette benchmarks...")
        
        # Run pytest-benchmark on benchmarks directory
        cmd = [
            sys.executable, "-m", "pytest", 
            "benchmarks/", 
            "--benchmark-json", self.output_file,
            "--benchmark-only",
            "-v"
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            print("✅ Benchmarks completed successfully")
            print(result.stdout)
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Benchmark execution failed: {e}")
            print("STDOUT:", e.stdout)
            print("STDERR:", e.stderr)
            return {}
        
        # Load results
        if Path(self.output_file).exists():
            with open(self.output_file, 'r') as f:
                benchmark_data = json.load(f)
            
            # Extract key metrics
            metrics = self._extract_metrics(benchmark_data)
            
            if save_baseline:
                self._save_baseline(metrics)
                print(f"💾 Baseline saved to {self.baseline_file}")
            
            return metrics
        else:
            print("❌ Benchmark results file not found")
            return {}
    
    def _extract_metrics(self, benchmark_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract key metrics from pytest-benchmark data."""
        metrics = {
            'timestamp': time.time(),
            'benchmarks': {},
            'summary': {
                'total_tests': 0,
                'avg_latency_ms': 0,
                'peak_memory_mb': 0,
                'cache_hit_ms': 0,
                'backend_switch_ms': 0,
                'compression_ms': 0
            }
        }
        
        if 'benchmarks' not in benchmark_data:
            return metrics
        
        latencies = []
        
        for benchmark in benchmark_data['benchmarks']:
            name = benchmark['name']
            stats = benchmark['stats']
            
            # Extract mean time in milliseconds
            mean_time_ms = stats['mean'] * 1000  # Convert from seconds
            latencies.append(mean_time_ms)
            
            metrics['benchmarks'][name] = {
                'mean_ms': mean_time_ms,
                'min_ms': stats['min'] * 1000,
                'max_ms': stats['max'] * 1000,
                'stddev_ms': stats['stddev'] * 1000,
                'median_ms': stats['median'] * 1000
            }
            
            # Categorize by benchmark type
            if 'cache' in name.lower():
                metrics['summary']['cache_hit_ms'] = mean_time_ms
            elif 'backend' in name.lower():
                metrics['summary']['backend_switch_ms'] = mean_time_ms
            elif 'compress' in name.lower():
                metrics['summary']['compression_ms'] = mean_time_ms
        
        metrics['summary']['total_tests'] = len(benchmark_data['benchmarks'])
        metrics['summary']['avg_latency_ms'] = sum(latencies) / len(latencies) if latencies else 0
        
        # Note: Memory metrics would need to be collected separately
        # as pytest-benchmark doesn't track memory by default
        
        return metrics
    
    def _save_baseline(self, metrics: Dict[str, Any]) -> None:
        """Save metrics as baseline for future comparisons."""
        with open(self.baseline_file, 'w') as f:
            json.dump(metrics, f, indent=2)
    
    def compare_with_baseline(self, current_file: str) -> Dict[str, Any]:
        """Compare current results with baseline."""
        if not Path(self.baseline_file).exists():
            print(f"❌ Baseline file {self.baseline_file} not found")
            return {}
        
        if not Path(current_file).exists():
            print(f"❌ Current results file {current_file} not found")
            return {}
        
        # Load baseline and current results
        with open(self.baseline_file, 'r') as f:
            baseline = json.load(f)
        
        with open(current_file, 'r') as f:
            current_data = json.load(f)
        
        current = self._extract_metrics(current_data)
        
        # Compare metrics
        comparison = {
            'baseline_timestamp': baseline.get('timestamp', 0),
            'current_timestamp': current.get('timestamp', 0),
            'summary_comparison': {},
            'benchmark_comparison': {},
            'status': 'PASS'
        }
        
        # Compare summary metrics
        baseline_summary = baseline.get('summary', {})
        current_summary = current.get('summary', {})
        
        for metric, current_value in current_summary.items():
            if metric in baseline_summary:
                baseline_value = baseline_summary[metric]
                if baseline_value > 0:
                    change_percent = ((current_value - baseline_value) / baseline_value) * 100
                    comparison['summary_comparison'][metric] = {
                        'baseline': baseline_value,
                        'current': current_value,
                        'change_percent': change_percent,
                        'status': self._evaluate_change(metric, change_percent)
                    }
        
        # Compare individual benchmarks
        baseline_benchmarks = baseline.get('benchmarks', {})
        current_benchmarks = current.get('benchmarks', {})
        
        for name, current_bench in current_benchmarks.items():
            if name in baseline_benchmarks:
                baseline_bench = baseline_benchmarks[name]
                current_mean = current_bench['mean_ms']
                baseline_mean = baseline_bench['mean_ms']
                
                if baseline_mean > 0:
                    change_percent = ((current_mean - baseline_mean) / baseline_mean) * 100
                    comparison['benchmark_comparison'][name] = {
                        'baseline_ms': baseline_mean,
                        'current_ms': current_mean,
                        'change_percent': change_percent,
                        'status': self._evaluate_performance_change(change_percent)
                    }
        
        # Determine overall status
        all_statuses = []
        for comp in comparison['summary_comparison'].values():
            all_statuses.append(comp['status'])
        for comp in comparison['benchmark_comparison'].values():
            all_statuses.append(comp['status'])
        
        if 'FAIL' in all_statuses:
            comparison['status'] = 'FAIL'
        elif 'WARN' in all_statuses:
            comparison['status'] = 'WARN'
        
        return comparison
    
    def _evaluate_change(self, metric: str, change_percent: float) -> str:
        """Evaluate if a metric change is acceptable."""
        # Memory metrics - stricter limits
        if 'memory' in metric.lower():
            if change_percent > 15:  # +15% memory increase = FAIL
                return 'FAIL'
            elif change_percent > 10:  # +10% memory increase = WARN
                return 'WARN'
        
        # Latency metrics - stricter limits
        elif any(term in metric.lower() for term in ['latency', 'time', 'ms']):
            if change_percent > 20:  # +20% latency increase = FAIL
                return 'FAIL'
            elif change_percent > 10:  # +10% latency increase = WARN
                return 'WARN'
        
        return 'PASS'
    
    def _evaluate_performance_change(self, change_percent: float) -> str:
        """Evaluate performance change for individual benchmarks."""
        if change_percent > 20:  # +20% = FAIL
            return 'FAIL'
        elif change_percent > 10:  # +10% = WARN
            return 'WARN'
        return 'PASS'
    
    def print_comparison_report(self, comparison: Dict[str, Any]) -> None:
        """Print formatted comparison report."""
        print("\n📊 Benchmark Comparison Report")
        print("=" * 50)
        
        status = comparison['status']
        status_icon = "✅" if status == "PASS" else "⚠️" if status == "WARN" else "❌"
        print(f"Overall Status: {status_icon} {status}")
        
        # Summary comparison
        if comparison.get('summary_comparison'):
            print("\n📈 Summary Metrics:")
            for metric, data in comparison['summary_comparison'].items():
                status_icon = "✅" if data['status'] == "PASS" else "⚠️" if data['status'] == "WARN" else "❌"
                print(f"  {status_icon} {metric}: {data['current']:.2f} "
                      f"({data['change_percent']:+.1f}% vs baseline)")
        
        # Individual benchmark comparison
        if comparison.get('benchmark_comparison'):
            print("\n🔬 Individual Benchmarks:")
            for name, data in comparison['benchmark_comparison'].items():
                status_icon = "✅" if data['status'] == "PASS" else "⚠️" if data['status'] == "WARN" else "❌"
                short_name = name.split('::')[-1] if '::' in name else name
                print(f"  {status_icon} {short_name}: {data['current_ms']:.2f}ms "
                      f"({data['change_percent']:+.1f}%)")
        
        # Thresholds info
        print("\n📋 Performance Thresholds:")
        print("  • Latency degradation > 20% = FAIL")
        print("  • Memory increase > 15% = FAIL")
        print("  • Latency degradation > 10% = WARN")
        print("  • Memory increase > 10% = WARN")

def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(description="Claudette benchmark runner")
    parser.add_argument('--save', metavar='FILE', help='Save results as baseline')
    parser.add_argument('--compare', metavar='FILE', help='Compare results with baseline')
    parser.add_argument('--output', default='benchmark_results.json', help='Output file for results')
    
    args = parser.parse_args()
    
    runner = BenchmarkRunner()
    runner.output_file = args.output
    
    if args.save:
        runner.baseline_file = args.save
        metrics = runner.run_benchmarks(save_baseline=True)
        if metrics:
            print(f"\n📊 Benchmark Summary:")
            summary = metrics.get('summary', {})
            print(f"  Tests run: {summary.get('total_tests', 0)}")
            print(f"  Avg latency: {summary.get('avg_latency_ms', 0):.2f}ms")
            print(f"  Cache hit: {summary.get('cache_hit_ms', 0):.2f}ms")
            print(f"  Backend switch: {summary.get('backend_switch_ms', 0):.2f}ms")
            print(f"  Compression: {summary.get('compression_ms', 0):.2f}ms")
    
    elif args.compare:
        comparison = runner.compare_with_baseline(args.compare)
        if comparison:
            runner.print_comparison_report(comparison)
            
            # Exit with error code if benchmarks failed
            if comparison['status'] == 'FAIL':
                sys.exit(1)
        else:
            print("❌ Comparison failed")
            sys.exit(1)
    
    else:
        # Just run benchmarks
        metrics = runner.run_benchmarks()
        if metrics:
            print(f"\n📊 Benchmark Results saved to {args.output}")
        else:
            print("❌ Benchmark run failed")
            sys.exit(1)

if __name__ == '__main__':
    main()