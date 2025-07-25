#!/usr/bin/env python3
"""
Test script for Claudette's secure sudo functionality
Demonstrates how to use the sudo helper safely
"""

import os
import sys
from pathlib import Path

# Add claudette to path
sys.path.insert(0, str(Path(__file__).parent))

from claudette.sudo_helper import sudo_helper


def test_sudo_availability():
    """Test if sudo is available on the system"""
    print("🔍 Testing sudo availability...")
    
    available = sudo_helper.is_sudo_available()
    if available:
        print("✅ sudo is available on this system")
    else:
        print("❌ sudo is not available")
    
    return available


def test_permission_checking():
    """Test permission checking functionality"""
    print("\n🔍 Testing permission checking...")
    
    # Test with a file we can write to
    temp_file = "/tmp/claudette_test_file"
    with open(temp_file, 'w') as f:
        f.write("test")
    
    needs_sudo = sudo_helper.needs_sudo_for_path(temp_file)
    print(f"📝 Temp file {temp_file} needs sudo: {needs_sudo}")
    
    # Clean up
    os.unlink(temp_file)
    
    # Test with a system directory
    system_dir = "/etc"
    needs_sudo_system = sudo_helper.needs_sudo_for_path(system_dir)
    print(f"📁 System directory {system_dir} needs sudo: {needs_sudo_system}")
    
    return True


def test_cache_diagnostic():
    """Test cache diagnostic functionality"""
    print("\n🔍 Testing cache diagnostic...")
    
    cache_dir = Path.home() / '.cache' / 'claudette'
    if cache_dir.exists():
        # Check for root-owned files
        root_files = []
        for file_path in cache_dir.rglob('*'):
            if file_path.is_file() and sudo_helper.needs_sudo_for_path(str(file_path)):
                root_files.append(str(file_path))
        
        if root_files:
            print(f"🔍 Found {len(root_files)} root-owned cache files:")
            for file_path in root_files[:3]:  # Show first 3
                print(f"  - {file_path}")
            if len(root_files) > 3:
                print(f"  ... and {len(root_files) - 3} more")
        else:
            print("✅ No root-owned cache files found")
    else:
        print("📂 No cache directory found")
    
    return True


def simulate_sudo_request():
    """Simulate a sudo request (without actually executing)"""
    print("\n🔍 Simulating sudo request process...")
    
    # This would normally prompt for password, but we'll just test the logic
    print("🔐 This is where Claudette would request administrator access:")
    print("📝 Reason: Clean up root-owned cache files")
    print("⚠️  This will only be used for the specific operation mentioned above.")
    print("💡 You can decline and the operation will be skipped.")
    print("🤔 Grant temporary sudo access? [y/N]: [SIMULATED - NOT ACTUAL]")
    print("✅ Simulation complete - no actual sudo request made")
    
    return True


def main():
    """Run all sudo functionality tests"""
    print("🧪 Testing Claudette Secure Sudo Functionality")
    print("=" * 50)
    
    tests = [
        test_sudo_availability,
        test_permission_checking,
        test_cache_diagnostic,
        simulate_sudo_request
    ]
    
    passed = 0
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ Test {test.__name__} failed: {e}")
    
    print(f"\n📊 Results: {passed}/{len(tests)} tests passed")
    
    print("\n💡 Usage Examples:")
    print("  python3 -m claudette diagnose    # Diagnose system issues")
    print("  python3 -m claudette fix         # Auto-fix issues with sudo if needed")
    print("  ./claudette-launcher diagnose    # Using launcher script")
    
    print("\n🔐 Security Features:")
    print("  - User consent required before any sudo operation")
    print("  - Clear explanation of why sudo is needed")
    print("  - Secure password input (no echo)")
    print("  - Limited scope operations only")
    print("  - Automatic timeout and cleanup")


if __name__ == '__main__':
    main()