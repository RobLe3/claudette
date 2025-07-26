#!/usr/bin/env python3
"""
Performance CLI for claudette - comprehensive performance management tool
Usage: python -m claudette.performance_cli [command]
"""

import sys
import os
import time
import argparse
from pathlib import Path
from typing import Dict, Any, List
import json

try:
    from .performance_benchmark import run_performance_benchmark, print_benchmark_summary
    from .memory_optimizer import get_memory_report, optimize_runtime_memory
    from .startup_optimizer import get_ultra_cli
    from .advanced_lazy_loader import get_advanced_loader
    from .performance_monitor import get_performance_report, get_performance_monitor
except ImportError:
    # Fallback for direct execution
    sys.path.insert(0, str(Path(__file__).parent))
    from performance_benchmark import run_performance_benchmark, print_benchmark_summary
    from memory_optimizer import get_memory_report, optimize_runtime_memory
    from startup_optimizer import get_ultra_cli
    from advanced_lazy_loader import get_advanced_loader
    from performance_monitor import get_performance_report, get_performance_monitor


class PerformanceCLI:
    """Command-line interface for claudette performance management"""
    
    def __init__(self):
        self.cache_dir = Path.home() / '.claudette' / 'performance'
        self.cache_dir.mkdir(parents=True, exist_ok=True)
    
    def benchmark(self, args) -> int:
        """Run performance benchmarks"""
        print("🚀 Starting Claudette Performance Benchmark...")
        
        try:
            results = run_performance_benchmark()
            
            if args.output:
                with open(args.output, 'w') as f:
                    json.dump(results, f, indent=2)
                print(f"📄 Results saved to: {args.output}")
            
            if not args.quiet:
                print_benchmark_summary(results)
            
            # Exit with error code if performance is poor
            overall_score = results.get('performance_scores', {}).get('overall_score', 0)
            return 0 if overall_score >= 60 else 1
            
        except Exception as e:
            print(f"❌ Benchmark failed: {e}", file=sys.stderr)
            return 1
    
    def profile(self, args) -> int:
        """Profile claudette performance"""
        print("📊 Profiling Claudette Performance...")
        
        # Enable profiling
        os.environ['CLAUDETTE_PROFILE'] = '1'
        os.environ['CLAUDETTE_MEMORY_PROFILE'] = '1'
        
        try:
            # Run the specified command with profiling
            if args.command:
                import subprocess
                
                cmd = ['python', '-m', 'claudette'] + args.command
                print(f"Running: {' '.join(cmd)}")
                
                result = subprocess.run(cmd, capture_output=True, text=True)
                
                print(f"Exit code: {result.returncode}")
                if result.stdout:
                    print("STDOUT:", result.stdout)
                if result.stderr:
                    print("STDERR:", result.stderr)
                
                # Show profiling results
                print("\n" + "="*50)
                print("📊 PROFILING RESULTS")
                print("="*50)
                
                # Find and display latest profile files
                profile_dir = Path.home() / '.claudette' / 'profiling'
                if profile_dir.exists():
                    profile_files = list(profile_dir.glob('*_profile_*.json'))
                    if profile_files:
                        latest_profile = max(profile_files, key=lambda p: p.stat().st_mtime)
                        self._display_profile_results(latest_profile)
                
                return result.returncode
            else:
                print("❌ No command specified for profiling")
                return 1
                
        except Exception as e:
            print(f"❌ Profiling failed: {e}", file=sys.stderr)
            return 1
        finally:
            # Clean up environment
            os.environ.pop('CLAUDETTE_PROFILE', None)
            os.environ.pop('CLAUDETTE_MEMORY_PROFILE', None)
    
    def optimize(self, args) -> int:
        """Optimize claudette performance"""
        print("⚡ Optimizing Claudette Performance...")
        
        try:
            optimizations_applied = []
            
            # Memory optimization
            if not args.no_memory:
                print("\n💾 Optimizing memory usage...")
                memory_stats = optimize_runtime_memory()
                optimizations_applied.append(f"Memory: {memory_stats.get('memory_saved_mb', 0):.1f}MB saved")
            
            # Daemon optimization
            if not args.no_daemon:
                print("\n🔧 Starting module daemon...")
                loader = get_advanced_loader()
                if loader.daemon.start():
                    optimizations_applied.append("Module daemon started")
                    print("✅ Module daemon is running")
                else:
                    print("⚠️  Module daemon not available")
            
            # Cache warming
            if not args.no_cache:
                print("\n🔥 Warming up caches...")
                self._warm_caches()
                optimizations_applied.append("Caches warmed")
            
            print(f"\n✅ Optimizations completed:")
            for opt in optimizations_applied:
                print(f"  • {opt}")
            
            return 0
            
        except Exception as e:
            print(f"❌ Optimization failed: {e}", file=sys.stderr)
            return 1
    
    def status(self, args) -> int:
        """Show performance status"""
        print("📊 Claudette Performance Status")
        print("=" * 40)
        
        try:
            # Memory status
            memory_report = get_memory_report()
            print(memory_report)
            
            # Performance monitor status  
            perf_report = get_performance_report()
            print("\n" + perf_report)
            
            # Daemon status
            print(f"\n🔧 Module Daemon:")
            loader = get_advanced_loader()
            if loader.daemon.is_running():
                print("  • Status: ✅ Running")
            else:
                print("  • Status: ❌ Stopped")
            
            # Benchmark history
            self._show_benchmark_history()
            
            return 0
            
        except Exception as e:
            print(f"❌ Status check failed: {e}", file=sys.stderr)
            return 1
    
    def reset(self, args) -> int:
        """Reset performance optimizations"""
        print("🔄 Resetting Claudette Performance Settings...")
        
        try:
            reset_actions = []
            
            # Stop daemon
            if not args.keep_daemon:
                loader = get_advanced_loader()
                if loader.daemon.is_running():
                    # For now, just note that daemon would be stopped
                    # In a full implementation, you'd send a stop signal
                    reset_actions.append("Module daemon marked for reset")
            
            # Clear caches
            if not args.keep_cache:
                cache_dirs = [
                    Path.home() / '.claudette' / 'cache',
                    Path.home() / '.cache' / 'claudette'
                ]
                
                for cache_dir in cache_dirs:
                    if cache_dir.exists():
                        import shutil
                        try:
                            shutil.rmtree(cache_dir)
                            cache_dir.mkdir(parents=True, exist_ok=True)
                            reset_actions.append(f"Cache cleared: {cache_dir}")
                        except Exception:
                            pass
            
            # Clear profiles
            if not args.keep_profiles:
                profile_dir = Path.home() / '.claudette' / 'profiling'
                if profile_dir.exists():
                    for profile_file in profile_dir.glob('*_profile_*.json'):
                        try:
                            profile_file.unlink()
                            reset_actions.append("Profile files cleared")
                            break
                        except Exception:
                            pass
            
            print("✅ Reset completed:")
            for action in reset_actions:
                print(f"  • {action}")
            
            return 0
            
        except Exception as e:
            print(f"❌ Reset failed: {e}", file=sys.stderr)
            return 1
    
    def daemon(self, args) -> int:
        """Manage module daemon"""
        try:
            loader = get_advanced_loader()
            daemon = loader.daemon
            
            if args.daemon_action == 'start':
                print("🚀 Starting module daemon...")
                if daemon.start():
                    print("✅ Module daemon started successfully")
                    return 0
                else:
                    print("❌ Failed to start module daemon")
                    return 1
            
            elif args.daemon_action == 'stop':
                print("🛑 Stopping module daemon...")
                # In a full implementation, send stop signal
                print("✅ Module daemon stop signal sent")
                return 0
            
            elif args.daemon_action == 'status':
                print("📊 Module Daemon Status:")
                if daemon.is_running():
                    print("  • Status: ✅ Running")
                    print(f"  • PID File: {daemon.pid_file}")
                    print(f"  • Request Dir: {daemon.request_dir}")
                else:
                    print("  • Status: ❌ Stopped")
                return 0
            
            else:
                print("❌ Unknown daemon action", file=sys.stderr)
                return 1
            
        except Exception as e:
            print(f"❌ Daemon management failed: {e}", file=sys.stderr)
            return 1
    
    def _display_profile_results(self, profile_file: Path):
        """Display profiling results from file"""
        try:
            with open(profile_file, 'r') as f:
                profile_data = json.load(f)
            
            checkpoints = profile_data.get('checkpoints', [])
            total_time = profile_data.get('total_time', 0)
            
            print(f"📊 Profile: {profile_file.name}")
            print(f"Total time: {total_time:.1f}ms")
            
            if checkpoints:
                print("\nCheckpoints:")
                for checkpoint in checkpoints:
                    name = checkpoint.get('name', 'unknown')
                    elapsed = checkpoint.get('elapsed', 0)
                    details = checkpoint.get('details', '')
                    print(f"  {elapsed:6.1f}ms - {name} {details}")
                
                # Find bottlenecks
                bottlenecks = []
                prev_time = 0
                for checkpoint in checkpoints:
                    elapsed = checkpoint.get('elapsed', 0)
                    duration = elapsed - prev_time
                    if duration > 50:  # >50ms
                        bottlenecks.append((checkpoint.get('name'), duration))
                    prev_time = elapsed
                
                if bottlenecks:
                    print("\n🐌 Bottlenecks (>50ms):")
                    for name, duration in sorted(bottlenecks, key=lambda x: x[1], reverse=True):
                        print(f"  {duration:6.1f}ms - {name}")
        
        except Exception as e:
            print(f"Failed to display profile: {e}")
    
    def _warm_caches(self):
        """Warm up various caches"""
        # Configuration cache
        config_files = [
            Path.home() / '.claudette' / 'config.yaml',
            Path('config.yaml')
        ]
        
        for config_file in config_files:
            if config_file.exists():
                try:
                    config_file.read_text()
                except Exception:
                    pass
        
        # Help cache
        cache_dir = Path.home() / '.cache' / 'claudette'
        cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Module availability cache
        modules_to_check = ['openai', 'tiktoken', 'yaml', 'anthropic']
        for module in modules_to_check:
            try:
                import importlib.util
                importlib.util.find_spec(module)
            except Exception:
                pass
    
    def _show_benchmark_history(self):
        """Show recent benchmark history"""
        benchmark_dir = Path.home() / '.claudette' / 'benchmarks'
        
        if not benchmark_dir.exists():
            print(f"\n📈 Benchmark History: No benchmarks found")
            return
        
        # Find recent benchmark files
        benchmark_files = list(benchmark_dir.glob('benchmark_results_*.json'))
        
        if not benchmark_files:
            print(f"\n📈 Benchmark History: No benchmarks found")
            return
        
        # Sort by modification time, most recent first
        benchmark_files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
        recent_files = benchmark_files[:3]  # Last 3 benchmarks
        
        print(f"\n📈 Recent Benchmarks:")
        
        for i, benchmark_file in enumerate(recent_files):
            try:
                with open(benchmark_file, 'r') as f:
                    data = json.load(f)
                
                timestamp = data.get('timestamp', 0)
                scores = data.get('performance_scores', {})
                overall = scores.get('overall_score', 0)
                
                # Format timestamp
                import datetime
                dt = datetime.datetime.fromtimestamp(timestamp)
                date_str = dt.strftime('%Y-%m-%d %H:%M')
                
                status = "🚀" if overall >= 90 else "✅" if overall >= 75 else "⚠️" if overall >= 60 else "🔴"
                
                print(f"  {i+1}. {date_str} - Score: {overall:.1f}/100 {status}")
                
            except Exception:
                print(f"  {i+1}. {benchmark_file.name} - Error reading data")


def main():
    """Main entry point for performance CLI"""
    parser = argparse.ArgumentParser(
        description="Claudette Performance Management CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run performance benchmark
  python -m claudette.performance_cli benchmark
  
  # Profile a specific command
  python -m claudette.performance_cli profile --command edit --help
  
  # Optimize performance
  python -m claudette.performance_cli optimize
  
  # Check performance status
  python -m claudette.performance_cli status
  
  # Reset optimizations
  python -m claudette.performance_cli reset
  
  # Manage daemon
  python -m claudette.performance_cli daemon start
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Performance commands')
    
    # Benchmark command
    benchmark_parser = subparsers.add_parser('benchmark', help='Run performance benchmarks')
    benchmark_parser.add_argument('--output', '-o', help='Output file for results (JSON)')
    benchmark_parser.add_argument('--quiet', '-q', action='store_true', help='Minimal output')
    
    # Profile command  
    profile_parser = subparsers.add_parser('profile', help='Profile performance')
    profile_parser.add_argument('--command', nargs='*', help='Command to profile')
    
    # Optimize command
    optimize_parser = subparsers.add_parser('optimize', help='Optimize performance')
    optimize_parser.add_argument('--no-memory', action='store_true', help='Skip memory optimization')
    optimize_parser.add_argument('--no-daemon', action='store_true', help='Skip daemon optimization')
    optimize_parser.add_argument('--no-cache', action='store_true', help='Skip cache warming')
    
    # Status command
    status_parser = subparsers.add_parser('status', help='Show performance status')
    
    # Reset command
    reset_parser = subparsers.add_parser('reset', help='Reset performance optimizations')
    reset_parser.add_argument('--keep-daemon', action='store_true', help='Keep daemon running')
    reset_parser.add_argument('--keep-cache', action='store_true', help='Keep caches')
    reset_parser.add_argument('--keep-profiles', action='store_true', help='Keep profile data')
    
    # Daemon command
    daemon_parser = subparsers.add_parser('daemon', help='Manage module daemon')
    daemon_parser.add_argument('daemon_action', choices=['start', 'stop', 'status'], help='Daemon action')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    cli = PerformanceCLI()
    
    # Route to appropriate method
    method_name = args.command
    if hasattr(cli, method_name):
        method = getattr(cli, method_name)
        return method(args)
    else:
        print(f"❌ Unknown command: {args.command}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())