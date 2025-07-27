"""
Enhanced CLI commands for Claudette
Provides user-friendly subcommands for configuration, diagnostics, and performance
"""

import sys
import json
import shutil
from pathlib import Path
from typing import Dict, Any, List, Optional
import argparse

from .config import Config
from .config_validator import save_example_config, get_config_suggestions, create_example_config
from .performance_monitor import get_performance_stats
from .error_handler import check_system_requirements, validate_environment
from .cache import get_cache_manager

# Claude Flow integration imports (with graceful fallback)
try:
    from .integrations.claude_flow_bridge import claude_flow, check_integration
    from .integrations.dependency_manager import DependencyManager
    CLAUDE_FLOW_AVAILABLE = True
except ImportError:
    CLAUDE_FLOW_AVAILABLE = False


def cmd_config(args) -> int:
    """Handle config subcommand"""
    try:
        if args.example:
            # Generate example config
            if args.example == '-' or args.example == 'stdout':
                config_data = create_example_config()
                import yaml
                print(yaml.dump(config_data, default_flow_style=False, sort_keys=False))
                return 0
            else:
                output_path = Path(args.example)
                save_example_config(output_path)
                print(f"✅ Example configuration saved to {output_path}")
                return 0
        
        if args.validate:
            # Validate current configuration
            try:
                config = Config.load()
                print("✅ Configuration is valid")
                
                # Get suggestions for improvement
                config_dict = {
                    'claude_cmd': config.claude_cmd,
                    'default_backend': config.default_backend,
                    'openai_key': bool(config.openai_key),  # Don't show actual key
                    'mistral_key': bool(config.mistral_key),
                }
                
                suggestions = get_config_suggestions(config_dict)
                if suggestions:
                    print("\n💡 Configuration suggestions:")
                    for i, suggestion in enumerate(suggestions, 1):
                        print(f"   {i}. {suggestion}")
                
                return 0
                
            except Exception as e:
                print(f"❌ Configuration validation failed: {e}", file=sys.stderr)
                return 1
        
        if args.show:
            # Show current configuration (sanitized)
            try:
                config = Config.load()
                config_display = {
                    'claude_cmd': config.claude_cmd,
                    'default_backend': config.default_backend,
                    'fallback_enabled': config.fallback_enabled,
                    'openai_configured': bool(config.openai_key),
                    'openai_model': config.openai_model,
                    'mistral_configured': bool(config.mistral_key),
                    'mistral_model': config.mistral_model,
                    'ollama_model': config.ollama_model,
                    'ollama_url': config.ollama_url,
                }
                
                print("Current Configuration:")
                import yaml
                print(yaml.dump(config_display, default_flow_style=False))
                return 0
                
            except Exception as e:
                print(f"❌ Failed to load configuration: {e}", file=sys.stderr)
                return 1
        
        # Default: show help
        args.func = lambda x: x  # Placeholder
        return 0
        
    except KeyboardInterrupt:
        print("\n🛑 Interrupted by user", file=sys.stderr)
        return 130


def cmd_doctor(args) -> int:
    """Handle doctor subcommand - system diagnostics"""
    print("🔍 Claudette System Diagnostics")
    print("=" * 40)
    
    issues_found = 0
    
    # Environment validation
    env_valid, env_warnings = validate_environment()
    if not env_valid:
        print("❌ Environment validation failed")
        issues_found += 1
    else:
        print("✅ Environment validation passed")
    
    if env_warnings:
        print("\n⚠️  Environment warnings:")
        for warning in env_warnings:
            print(f"   • {warning}")
    
    # System requirements
    sys_warnings = check_system_requirements()
    if sys_warnings:
        print("\n⚠️  System warnings:")
        for warning in sys_warnings:
            print(f"   • {warning}")
    
    # Configuration check
    print(f"\n📋 Configuration Check")
    try:
        config = Config.load()
        print("✅ Configuration loaded successfully")
        
        # Test Claude CLI
        import subprocess
        try:
            result = subprocess.run([config.claude_cmd, '--version'], 
                                 capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                print("✅ Claude CLI is accessible")
            else:
                print("❌ Claude CLI test failed")
                issues_found += 1
        except Exception as e:
            print(f"❌ Claude CLI not found: {e}")
            issues_found += 1
        
    except Exception as e:
        print(f"❌ Configuration error: {e}")
        issues_found += 1
    
    # Cache system check
    print(f"\n💾 Cache System Check")
    try:
        cache_manager = get_cache_manager()
        cache_stats = cache_manager.get_stats()
        print(f"✅ Cache system operational")
        print(f"   Database: {cache_stats['db_path']}")
        print(f"   Size: {cache_stats['db_size_mb']:.1f} MB")
        print(f"   Events: {cache_stats['total_events']:,}")
    except Exception as e:
        print(f"❌ Cache system error: {e}")
        issues_found += 1
    
    # Performance check
    print(f"\n⚡ Performance Status")
    try:
        perf_stats = get_performance_stats()
        if 'error' not in perf_stats:
            avg_startup = perf_stats.get('avg_startup_time', 0)
            if avg_startup > 0:
                print(f"📊 Average startup time: {avg_startup:.2f}s")
                if avg_startup > 3.0:
                    print("⚠️  Startup time above recommended 3s threshold")
            
            hit_rate = perf_stats.get('cache_hit_rate', 0)
            print(f"📊 Cache hit rate: {hit_rate:.1f}%")
            
            fast_path_rate = perf_stats.get('fast_path_usage_rate', 0)
            print(f"📊 Fast path usage: {fast_path_rate:.1f}%")
        else:
            print("ℹ️  No performance data available yet")
    except Exception as e:
        print(f"⚠️  Performance data unavailable: {e}")
    
    # Disk space check
    print(f"\n💾 Disk Space Check")
    try:
        cache_dir = Path.home() / '.claudette'
        if cache_dir.exists():
            total, used, free = shutil.disk_usage(cache_dir)
            free_gb = free / (1024**3)
            print(f"💾 Available space: {free_gb:.1f} GB")
            if free_gb < 0.1:  # Less than 100MB
                print("⚠️  Low disk space - consider clearing cache")
        else:
            print("ℹ️  Cache directory not created yet")
    except Exception as e:
        print(f"⚠️  Disk space check failed: {e}")
    
    # Summary
    print(f"\n🎯 Diagnostic Summary")
    if issues_found == 0:
        print("✅ All systems operational")
        return 0
    else:
        print(f"❌ {issues_found} issue(s) found")
        print("\n💡 Run 'claudette config --validate' for configuration issues")
        print("💡 Run 'claudette --help' for usage information")
        return 1


def cmd_performance(args) -> int:
    """Handle performance subcommand"""
    try:
        perf_stats = get_performance_stats()
        
        if 'error' in perf_stats:
            print(f"❌ {perf_stats['error']}", file=sys.stderr)
            return 1
        
        print("⚡ Claudette Performance Statistics")
        print("=" * 40)
        
        # Basic stats
        print(f"📊 Sessions tracked: {perf_stats.get('total_sessions', 0):,}")
        print(f"📊 Last updated: {perf_stats.get('last_updated', 'never')}")
        
        # Startup performance
        avg_startup = perf_stats.get('avg_startup_time', 0)
        min_startup = perf_stats.get('min_startup_time', 0)
        max_startup = perf_stats.get('max_startup_time', 0)
        
        if avg_startup > 0:
            print(f"\n🚀 Startup Performance:")
            print(f"   Average: {avg_startup:.2f}s")
            print(f"   Best: {min_startup:.2f}s")
            print(f"   Worst: {max_startup:.2f}s")
            
            if avg_startup > 3.0:
                print("   ⚠️  Above recommended 3s threshold")
            elif avg_startup < 1.0:
                print("   ✅ Excellent startup performance")
        
        # Execution performance
        avg_execution = perf_stats.get('avg_execution_time', 0)
        if avg_execution > 0:
            print(f"\n⏱️  Execution Performance:")
            print(f"   Average: {avg_execution:.2f}s")
        
        # Memory usage
        avg_memory = perf_stats.get('avg_memory_usage', 0)
        if avg_memory > 0:
            print(f"\n🧠 Memory Usage:")
            print(f"   Average: {avg_memory:.1f} MB")
            
            if avg_memory > 500:
                print("   ⚠️  High memory usage")
            elif avg_memory < 100:
                print("   ✅ Efficient memory usage")
        
        # Cache performance
        cache_hit_rate = perf_stats.get('cache_hit_rate', 0)
        print(f"\n💾 Cache Performance:")
        print(f"   Hit rate: {cache_hit_rate:.1f}%")
        
        if cache_hit_rate > 80:
            print("   ✅ Excellent cache performance")
        elif cache_hit_rate < 50:
            print("   ⚠️  Consider warming up cache")
        
        # Fast path usage
        fast_path_rate = perf_stats.get('fast_path_usage_rate', 0)
        print(f"\n⚡ Fast Path Optimization:")
        print(f"   Usage rate: {fast_path_rate:.1f}%")
        
        # Backend usage
        backend_usage = perf_stats.get('backend_usage', {})
        if backend_usage:
            print(f"\n🔄 Backend Usage:")
            total_backend_calls = sum(backend_usage.values())
            for backend, count in sorted(backend_usage.items(), key=lambda x: x[1], reverse=True):
                percentage = (count / total_backend_calls * 100) if total_backend_calls > 0 else 0
                print(f"   {backend}: {count:,} ({percentage:.1f}%)")
        
        # Recommendations
        recommendations = []
        if avg_startup > 3.0:
            recommendations.append("Enable fast path for better startup times")
        if cache_hit_rate < 60:
            recommendations.append("Increase cache usage with repeated operations")
        if avg_memory > 300:
            recommendations.append("Consider periodic restarts for long sessions")
        
        if recommendations:
            print(f"\n💡 Recommendations:")
            for i, rec in enumerate(recommendations, 1):
                print(f"   {i}. {rec}")
        
        return 0
        
    except Exception as e:
        print(f"❌ Performance analysis failed: {e}", file=sys.stderr)
        return 1


# Helper function for getting claude flow bridge
def get_claude_flow_bridge():
    """Get the claude flow bridge instance"""
    if not CLAUDE_FLOW_AVAILABLE:
        raise RuntimeError("Claude Flow integration not available")
    return claude_flow


def cmd_claude_flow_status(args) -> int:
    """Check claude-flow integration status"""
    if not CLAUDE_FLOW_AVAILABLE:
        print("❌ Claude-flow integration not available")
        print("   Install with: pip install -e .[dev]")
        return 1
    
    try:
        # Check integration status
        status = check_integration()
        
        print("🔍 Claude-Flow Integration Status")
        print("=" * 35)
        
        # Claude-flow availability
        if status['claude_flow_available']:
            print(f"✅ Claude-flow: {status['claude_flow_version']}")
        else:
            print("❌ Claude-flow: Not available")
            print("   Install with: npm install claude-flow@alpha")
        
        # Swarm status
        swarm_status = status['swarm_status']
        print(f"🐝 Swarm: {swarm_status['status']}")
        
        # Overall integration
        if status['integration_ready']:
            print("\n🎉 Integration is ready for use!")
            print("   Try: claudette swarm-init")
        else:
            print("\n⚠️  Integration needs setup")
            print("   Run: claudette install-claude-flow")
        
        return 0 if status['integration_ready'] else 1
        
    except Exception as e:
        print(f"❌ Error checking claude-flow status: {e}")
        return 1


def cmd_install_claude_flow(args) -> int:
    """Install claude-flow integration"""
    if not CLAUDE_FLOW_AVAILABLE:
        print("❌ Claude-flow integration module not available")
        return 1
    
    try:
        print("🚀 Installing claude-flow integration...")
        
        # Install claude-flow
        result = claude_flow.install_claude_flow()
        
        if result['success']:
            print(f"✅ {result['message']}")
            if 'version' in result:
                print(f"   Version: {result['version']}")
            return 0
        else:
            print(f"❌ Installation failed: {result['error']}")
            return 1
            
    except Exception as e:
        print(f"❌ Error during installation: {e}")
        return 1


def cmd_check_dependencies(args) -> int:
    """Check all dependencies"""
    if not CLAUDE_FLOW_AVAILABLE:
        print("❌ Dependency manager not available")
        return 1
    
    try:
        manager = DependencyManager()
        status = manager.comprehensive_check()
        
        print("📋 Dependency Status Report")
        print("=" * 30)
        
        # System dependencies
        node_status = status['system']['node_js']
        npm_status = status['system']['npm']
        
        print(f"Node.js: {'✅' if node_status['available'] else '❌'}")
        if node_status['available']:
            print(f"  Version: {node_status['version']}")
            if not node_status.get('supported', True):
                print(f"  ⚠️  {node_status.get('recommendation', '')}")
        else:
            print(f"  Issue: {node_status.get('reason', 'Unknown')}")
        
        print(f"npm: {'✅' if npm_status['available'] else '❌'}")
        if npm_status['available']:
            print(f"  Version: {npm_status['version']}")
        
        # Package dependencies
        cf_status = status['packages']['claude_flow']
        py_status = status['packages']['python_packages']
        
        print(f"Claude-flow: {'✅' if cf_status['available'] else '❌'}")
        if cf_status['available']:
            print(f"  Version: {cf_status['version']}")
        
        print(f"Python packages: {'✅' if py_status['all_available'] else '⚠️'}")
        if not py_status['all_available']:
            missing = py_status.get('missing_packages', [])
            print(f"  Missing: {', '.join(missing)}")
        
        # Recommendations
        actions = status['status']['recommended_actions']
        if actions and not (len(actions) == 1 and 'All dependencies' in actions[0]):
            print("\n📋 Recommended Actions:")
            for action in actions:
                print(f"  {action}")
        
        # Overall status
        print(f"\n🎯 Integration Ready: {'✅' if status['status']['integration_ready'] else '❌'}")
        
        return 0 if status['status']['integration_ready'] else 1
        
    except Exception as e:
        print(f"❌ Error checking dependencies: {e}")
        return 1


def cmd_swarm_init(args) -> int:
    """Initialize claude-flow swarm"""
    if not CLAUDE_FLOW_AVAILABLE:
        print("❌ Claude-flow integration not available")
        return 1
    
    try:
        topology = getattr(args, 'topology', 'hierarchical')
        max_agents = getattr(args, 'max_agents', 8)
        
        print(f"🐝 Initializing swarm (topology: {topology}, max_agents: {max_agents})...")
        
        result = claude_flow.initialize_swarm(topology=topology, max_agents=max_agents)
        
        if result['success']:
            print("✅ Swarm initialized successfully!")
            if 'output' in result:
                print(f"   {result['output']}")
            return 0
        else:
            print(f"❌ Swarm initialization failed: {result['error']}")
            return 1
            
    except Exception as e:
        print(f"❌ Error initializing swarm: {e}")
        return 1


def setup_cli_commands(parser) -> None:
    """Setup enhanced CLI subcommands"""
    subparsers = parser.add_subparsers(dest='subcommand', help='Available commands')
    
    # Config command
    config_parser = subparsers.add_parser('config', help='Configuration management')
    config_group = config_parser.add_mutually_exclusive_group()
    config_group.add_argument('--example', metavar='FILE', help='Generate example config (use "-" for stdout)')
    config_group.add_argument('--validate', action='store_true', help='Validate current configuration')
    config_group.add_argument('--show', action='store_true', help='Show current configuration')
    config_parser.set_defaults(func=cmd_config)
    
    # Doctor command
    doctor_parser = subparsers.add_parser('doctor', help='System diagnostics')
    doctor_parser.set_defaults(func=cmd_doctor)
    
    # Performance command
    perf_parser = subparsers.add_parser('performance', help='Performance statistics')
    perf_parser.set_defaults(func=cmd_performance)
    
    # Claude Flow integration commands
    cf_status_parser = subparsers.add_parser('claude-flow-status', help='Check claude-flow integration status')
    cf_status_parser.set_defaults(func=cmd_claude_flow_status)
    
    cf_install_parser = subparsers.add_parser('install-claude-flow', help='Install claude-flow integration')
    cf_install_parser.set_defaults(func=cmd_install_claude_flow)
    
    deps_parser = subparsers.add_parser('check-dependencies', help='Check all dependencies')
    deps_parser.set_defaults(func=cmd_check_dependencies)
    
    # Swarm initialization command
    swarm_parser = subparsers.add_parser('swarm-init', help='Initialize claude-flow swarm')
    swarm_parser.add_argument('--topology', choices=['hierarchical', 'mesh', 'ring', 'star'], 
                             default='hierarchical', help='Swarm topology')
    swarm_parser.add_argument('--max-agents', type=int, default=8, help='Maximum number of agents')
    swarm_parser.set_defaults(func=cmd_swarm_init)
    
    return subparsers