"""
Dependency Checker for Claude Flow Integration
Validates all dependencies and provides installation guidance
"""

import sys
import subprocess
import importlib
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional


class DependencyChecker:
    """Comprehensive dependency checking for claudette-ai-tools"""
    
    def __init__(self):
        self.required_python_packages = [
            'openai',
            'yaml',
            'click',
            'requests'
        ]
        
        self.optional_python_packages = [
            'pydantic',
            'aiohttp',
            'rich',
            'flask',
            'pandas',
            'numpy'
        ]
        
        self.system_requirements = [
            'node',
            'npm'
        ]
        
    def check_python_package(self, package_name: str) -> Tuple[bool, Optional[str]]:
        """
        Check if a Python package is available
        
        Returns:
            (available, version)
        """
        try:
            module = importlib.import_module(package_name)
            version = getattr(module, '__version__', 'unknown')
            return True, version
        except ImportError:
            return False, None
    
    def check_system_command(self, command: str) -> Tuple[bool, Optional[str]]:
        """
        Check if a system command is available
        
        Returns:
            (available, version)
        """
        try:
            result = subprocess.run(
                [command, '--version'],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                version = result.stdout.strip().split('\n')[0]
                return True, version
            return False, None
        except (subprocess.SubprocessError, FileNotFoundError):
            return False, None
    
    def check_claude_flow_availability(self) -> Dict[str, Any]:
        """Check claude-flow specific availability"""
        try:
            from .claude_flow_bridge import get_claude_flow_bridge
            bridge = get_claude_flow_bridge()
            return bridge.get_dependency_status()
        except ImportError:
            return {
                "claude_flow_installed": False,
                "error": "claude-flow bridge not available"
            }
    
    def get_comprehensive_status(self) -> Dict[str, Any]:
        """Get comprehensive dependency status"""
        status = {
            "python_packages": {
                "required": {},
                "optional": {}
            },
            "system_commands": {},
            "claude_flow": {},
            "summary": {
                "required_missing": 0,
                "optional_missing": 0,
                "system_missing": 0,
                "claude_flow_ready": False
            }
        }
        
        # Check required Python packages
        for package in self.required_python_packages:
            available, version = self.check_python_package(package)
            status["python_packages"]["required"][package] = {
                "available": available,
                "version": version
            }
            if not available:
                status["summary"]["required_missing"] += 1
        
        # Check optional Python packages
        for package in self.optional_python_packages:
            available, version = self.check_python_package(package)
            status["python_packages"]["optional"][package] = {
                "available": available,
                "version": version
            }
            if not available:
                status["summary"]["optional_missing"] += 1
        
        # Check system commands
        for command in self.system_requirements:
            available, version = self.check_system_command(command)
            status["system_commands"][command] = {
                "available": available,
                "version": version
            }
            if not available:
                status["summary"]["system_missing"] += 1
        
        # Check Claude Flow
        cf_status = self.check_claude_flow_availability()
        status["claude_flow"] = cf_status
        status["summary"]["claude_flow_ready"] = cf_status.get("claude_flow_installed", False)
        
        return status
    
    def get_installation_instructions(self, status: Optional[Dict[str, Any]] = None) -> List[str]:
        """Get installation instructions based on current status"""
        if status is None:
            status = self.get_comprehensive_status()
        
        instructions = []
        
        # Python package instructions
        missing_required = [
            pkg for pkg, info in status["python_packages"]["required"].items()
            if not info["available"]
        ]
        
        if missing_required:
            instructions.append("📦 Install missing Python packages:")
            instructions.append(f"   pip install {' '.join(missing_required)}")
            instructions.append("   Or: pip install -r requirements.txt")
        
        # System requirements
        missing_system = [
            cmd for cmd, info in status["system_commands"].items()
            if not info["available"]
        ]
        
        if missing_system:
            instructions.append("🖥️  Install missing system requirements:")
            for cmd in missing_system:
                if cmd == 'node':
                    instructions.append("   • Node.js: https://nodejs.org/ (version 18+)")
                elif cmd == 'npm':
                    instructions.append("   • NPM: Included with Node.js installer")
        
        # Claude Flow instructions
        if not status["summary"]["claude_flow_ready"]:
            if status["summary"]["system_missing"] == 0:
                instructions.append("🔗 Install Claude Flow integration:")
                instructions.append("   claudette install-claude-flow")
            else:
                instructions.append("🔗 Claude Flow requires Node.js and NPM first")
        
        if not instructions:
            instructions.append("✅ All dependencies are properly installed!")
        
        return instructions
    
    def validate_environment(self) -> Tuple[bool, List[str]]:
        """
        Validate environment for claudette operation
        
        Returns:
            (is_valid, issues)
        """
        status = self.get_comprehensive_status()
        issues = []
        
        # Critical issues
        if status["summary"]["required_missing"] > 0:
            missing = [
                pkg for pkg, info in status["python_packages"]["required"].items()
                if not info["available"]
            ]
            issues.append(f"Missing required packages: {', '.join(missing)}")
        
        # Warnings
        if status["summary"]["system_missing"] > 0:
            missing = [
                cmd for cmd, info in status["system_commands"].items()
                if not info["available"]
            ]
            issues.append(f"Missing system commands: {', '.join(missing)} (claude-flow features unavailable)")
        
        # Environment is valid if no required packages are missing
        is_valid = status["summary"]["required_missing"] == 0
        
        return is_valid, issues


# Global checker instance
_checker_instance = None

def get_dependency_checker() -> DependencyChecker:
    """Get global DependencyChecker instance"""
    global _checker_instance
    if _checker_instance is None:
        _checker_instance = DependencyChecker()
    return _checker_instance


def quick_dependency_check() -> bool:
    """Quick check if basic dependencies are available"""
    checker = get_dependency_checker()
    status = checker.get_comprehensive_status()
    return status["summary"]["required_missing"] == 0


def validate_claudette_environment() -> Tuple[bool, List[str]]:
    """Validate claudette environment"""
    checker = get_dependency_checker()
    return checker.validate_environment()