"""
Secure sudo password handling for Claudette
Provides safe methods to request elevated privileges when needed for system fixes
"""

import os
import sys
import subprocess
import getpass
from typing import Optional, List, Tuple
import tempfile
from pathlib import Path


class SecureSudoHelper:
    """Secure sudo password handling with validation and safety checks"""
    
    def __init__(self):
        self.sudo_timeout = 300  # 5 minutes
        self._sudo_validated = False
        self._temp_askpass_script = None
    
    def is_sudo_available(self) -> bool:
        """Check if sudo is available on the system"""
        try:
            result = subprocess.run(['which', 'sudo'], 
                                  capture_output=True, 
                                  text=True)
            return result.returncode == 0
        except Exception:
            return False
    
    def needs_sudo_for_path(self, path: str) -> bool:
        """Check if a path requires sudo access"""
        try:
            path_obj = Path(path)
            if not path_obj.exists():
                return False
            
            # Check if current user can write to the file/directory
            if path_obj.is_file():
                return not os.access(path, os.W_OK)
            elif path_obj.is_dir():
                return not os.access(path, os.W_OK)
            
            return False
        except Exception:
            return False
    
    def request_sudo_permission(self, reason: str) -> bool:
        """
        Request sudo permission with user explanation
        
        Args:
            reason: Clear explanation of why sudo is needed
            
        Returns:
            bool: True if permission granted, False otherwise
        """
        if not self.is_sudo_available():
            print("❌ sudo not available on this system", file=sys.stderr)
            return False
        
        print(f"\n🔐 Claudette needs temporary administrator access:")
        print(f"📝 Reason: {reason}")
        print(f"⚠️  This will only be used for the specific operation mentioned above.")
        print(f"💡 You can decline and the operation will be skipped.")
        
        # Ask for user consent
        while True:
            response = input("\n🤔 Grant temporary sudo access? [y/N]: ").strip().lower()
            if response in ['y', 'yes']:
                break
            elif response in ['n', 'no', '']:
                print("🚫 Sudo access declined. Operation will be skipped.")
                return False
            else:
                print("Please enter 'y' for yes or 'n' for no.")
        
        return self._validate_sudo_access()
    
    def _validate_sudo_access(self) -> bool:
        """Validate sudo access by testing with a safe command"""
        try:
            print("🔑 Please enter your password for temporary administrator access:")
            
            # Test sudo access with a safe command
            result = subprocess.run(['sudo', '-v'], 
                                  text=True,
                                  timeout=30)
            
            if result.returncode == 0:
                self._sudo_validated = True
                print("✅ Administrator access granted temporarily")
                return True
            else:
                print("❌ Failed to validate administrator access")
                return False
                
        except subprocess.TimeoutExpired:
            print("❌ Timeout waiting for password")
            return False
        except KeyboardInterrupt:
            print("\n❌ Operation cancelled by user")
            return False
        except Exception as e:
            print(f"❌ Error validating sudo access: {e}")
            return False
    
    def execute_sudo_command(self, command: List[str], reason: str = "") -> Tuple[bool, str]:
        """
        Execute a command with sudo privileges
        
        Args:
            command: List of command parts to execute
            reason: Reason for needing sudo (for logging)
            
        Returns:
            Tuple[bool, str]: Success status and output/error message
        """
        if not self._sudo_validated:
            if not self.request_sudo_permission(reason):
                return False, "Sudo access not granted"
        
        try:
            # Prepend sudo to the command
            sudo_command = ['sudo'] + command
            
            print(f"🔧 Executing with administrator privileges: {' '.join(command)}")
            
            result = subprocess.run(sudo_command,
                                  capture_output=True,
                                  text=True,
                                  timeout=60)
            
            if result.returncode == 0:
                return True, result.stdout
            else:
                return False, result.stderr
                
        except subprocess.TimeoutExpired:
            return False, "Command timed out"
        except Exception as e:
            return False, f"Error executing sudo command: {e}"
    
    def safe_remove_file(self, filepath: str, reason: str = "") -> bool:
        """
        Safely remove a file, using sudo if necessary
        
        Args:
            filepath: Path to file to remove
            reason: Reason for removal
            
        Returns:
            bool: True if successful
        """
        path_obj = Path(filepath)
        
        if not path_obj.exists():
            return True  # Already doesn't exist
        
        # Try normal removal first
        try:
            path_obj.unlink()
            print(f"✅ Removed file: {filepath}")
            return True
        except PermissionError:
            # Need sudo
            if not reason:
                reason = f"Remove system file: {filepath}"
            
            success, message = self.execute_sudo_command(['rm', '-f', filepath], reason)
            if success:
                print(f"✅ Removed file with admin privileges: {filepath}")
                return True
            else:
                print(f"❌ Failed to remove file: {message}")
                return False
        except Exception as e:
            print(f"❌ Error removing file {filepath}: {e}")
            return False
    
    def safe_change_ownership(self, filepath: str, user: str, reason: str = "") -> bool:
        """
        Safely change file ownership, using sudo if necessary
        
        Args:
            filepath: Path to file
            user: New owner username
            reason: Reason for ownership change
            
        Returns:
            bool: True if successful
        """
        if not Path(filepath).exists():
            return False
        
        if not reason:
            reason = f"Change ownership of {filepath} to {user}"
        
        success, message = self.execute_sudo_command(['chown', user, filepath], reason)
        if success:
            print(f"✅ Changed ownership of {filepath} to {user}")
            return True
        else:
            print(f"❌ Failed to change ownership: {message}")
            return False
    
    def cleanup_cache_files(self, cache_dir: str) -> bool:
        """
        Clean up cache files that may be owned by root
        
        Args:
            cache_dir: Path to cache directory
            
        Returns:
            bool: True if cleanup successful
        """
        cache_path = Path(cache_dir)
        if not cache_path.exists():
            return True
        
        # Find files that need sudo to remove
        root_owned_files = []
        
        try:
            for file_path in cache_path.rglob('*'):
                if file_path.is_file() and self.needs_sudo_for_path(str(file_path)):
                    root_owned_files.append(str(file_path))
        except Exception as e:
            print(f"❌ Error scanning cache directory: {e}")
            return False
        
        if not root_owned_files:
            print("✅ No root-owned cache files found")
            return True
        
        print(f"🔍 Found {len(root_owned_files)} root-owned cache files:")
        for file_path in root_owned_files[:5]:  # Show first 5
            print(f"  - {file_path}")
        if len(root_owned_files) > 5:
            print(f"  ... and {len(root_owned_files) - 5} more")
        
        reason = f"Clean up {len(root_owned_files)} root-owned cache files in {cache_dir}"
        
        if not self.request_sudo_permission(reason):
            return False
        
        # Remove root-owned files
        success_count = 0
        for file_path in root_owned_files:
            if self.safe_remove_file(file_path, "Clean up cache file"):
                success_count += 1
        
        print(f"✅ Successfully cleaned up {success_count}/{len(root_owned_files)} cache files")
        return success_count == len(root_owned_files)
    
    def __del__(self):
        """Cleanup when object is destroyed"""
        if self._temp_askpass_script and Path(self._temp_askpass_script).exists():
            try:
                os.unlink(self._temp_askpass_script)
            except Exception:
                pass


# Global instance for easy access
sudo_helper = SecureSudoHelper()