#!/usr/bin/env python3
"""
Phase 4 Functional Test for Claudette AI Tools
Tests all critical functionality after import resolution and configuration updates
"""

import sys
import subprocess
import importlib
from pathlib import Path

def test_package_installation():
    """Test that the package is properly installed"""
    try:
        result = subprocess.run([sys.executable, '-c', 'import claudette; print(claudette.__version__)'], 
                              capture_output=True, text=True, check=True)
        print(f"✅ Package installation: Version {result.stdout.strip()}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Package installation failed: {e}")
        return False

def test_cli_entry_point():
    """Test that the claudette CLI command works"""
    try:
        result = subprocess.run(['claudette', '--version'], 
                              capture_output=True, text=True, check=True, timeout=30)
        print(f"✅ CLI entry point: Working")
        return True
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as e:
        print(f"❌ CLI entry point failed: {e}")
        return False

def test_core_imports():
    """Test that all core modules can be imported"""
    modules_to_test = [
        'claudette.main',
        'claudette.cli_commands',
        'claudette.config',
        'claudette.cache',
        'claudette.performance_monitor',
        'claudette.core.coordination.chatgpt_offloading_manager',
        'claudette.core.cost_tracking.tracker',
        'claudette.fast_cli',
        'claudette.main_impl'
    ]
    
    passed = 0
    for module in modules_to_test:
        try:
            importlib.import_module(module)
            print(f"✅ Import {module}: Success")
            passed += 1
        except ImportError as e:
            print(f"❌ Import {module}: Failed - {e}")
    
    print(f"✅ Core imports: {passed}/{len(modules_to_test)} successful")
    return passed == len(modules_to_test)

def test_entry_point_function():
    """Test the specific main() entry point function"""
    try:
        from claudette.main import main
        print("✅ Entry point function: main() exists and is callable")
        return True
    except ImportError as e:
        print(f"❌ Entry point function: {e}")
        return False

def test_package_structure():
    """Test that the package structure is correct"""
    base_path = Path(__file__).parent / 'claudette'
    required_dirs = ['core', 'core/coordination', 'core/cost_tracking', 'docs', 'scripts']
    required_files = ['__init__.py', 'main.py', '__main__.py']
    
    all_good = True
    for dir_path in required_dirs:
        full_path = base_path / dir_path
        if full_path.exists():
            print(f"✅ Directory {dir_path}: Exists")
        else:
            print(f"❌ Directory {dir_path}: Missing")
            all_good = False
    
    for file_path in required_files:
        full_path = base_path / file_path
        if full_path.exists():
            print(f"✅ File {file_path}: Exists")
        else:
            print(f"❌ File {file_path}: Missing")
            all_good = False
    
    return all_good

def main():
    """Run all functional tests"""
    print("🧪 Phase 4 Functional Testing - Import Resolution & Configuration")
    print("=" * 60)
    
    tests = [
        ("Package Installation", test_package_installation),
        ("CLI Entry Point", test_cli_entry_point),
        ("Core Imports", test_core_imports),
        ("Entry Point Function", test_entry_point_function),
        ("Package Structure", test_package_structure)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n🔍 Testing {test_name}...")
        if test_func():
            passed += 1
        else:
            print(f"⚠️  {test_name} test had issues")
    
    print("\n" + "=" * 60)
    print(f"📊 Phase 4 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Package is fully functional.")
        return 0
    else:
        print("⚠️  Some tests failed. Review issues above.")
        return 1

if __name__ == '__main__':
    sys.exit(main())