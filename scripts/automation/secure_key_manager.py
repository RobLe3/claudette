#!/usr/bin/env python3
"""
Secure Key Manager - Encrypted storage for API keys
Uses system keyring for secure storage
"""

import keyring
import os
import json
from cryptography.fernet import Fernet
from pathlib import Path
from typing import Optional, Dict, Any
import base64
import hashlib
from datetime import datetime

class SecureKeyManager:
    """Secure storage and retrieval of API keys using system keyring"""
    
    def __init__(self):
        self.service_name = "claude-flow-api-keys"
        self.key_file = Path.home() / '.claude' / 'security' / 'key_metadata.json'
        self.key_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Initialize encryption key from system
        self._ensure_encryption_key()
        
    def _ensure_encryption_key(self):
        """Ensure we have an encryption key in system keyring"""
        encryption_key = keyring.get_password(self.service_name, "encryption_key")
        if not encryption_key:
            # Generate new encryption key
            key = Fernet.generate_key()
            encryption_key = key.decode()
            keyring.set_password(self.service_name, "encryption_key", encryption_key)
        
        self.fernet = Fernet(encryption_key.encode())
    
    def store_api_key(self, provider: str, api_key: str, metadata: Optional[Dict] = None) -> bool:
        """Store API key securely with optional metadata"""
        try:
            # Encrypt the API key
            encrypted_key = self.fernet.encrypt(api_key.encode()).decode()
            
            # Store in system keyring
            keyring.set_password(self.service_name, f"{provider}_api_key", encrypted_key)
            
            # Store metadata
            if metadata is None:
                metadata = {}
                
            metadata.update({
                'provider': provider,
                'stored_at': datetime.now().isoformat(),
                'key_hash': hashlib.sha256(api_key.encode()).hexdigest()[:8]  # For verification
            })
            
            self._store_metadata(provider, metadata)
            
            print(f"✅ API key for {provider} stored securely")
            return True
            
        except Exception as e:
            print(f"❌ Failed to store API key for {provider}: {e}")
            return False
    
    def retrieve_api_key(self, provider: str) -> Optional[str]:
        """Retrieve and decrypt API key"""
        try:
            encrypted_key = keyring.get_password(self.service_name, f"{provider}_api_key")
            if not encrypted_key:
                return None
                
            # Decrypt the API key
            decrypted_key = self.fernet.decrypt(encrypted_key.encode()).decode()
            return decrypted_key
            
        except Exception as e:
            print(f"❌ Failed to retrieve API key for {provider}: {e}")
            return None
    
    def list_stored_keys(self) -> Dict[str, Dict]:
        """List all stored API keys with metadata"""
        try:
            if not self.key_file.exists():
                return {}
                
            with open(self.key_file, 'r') as f:
                metadata = json.load(f)
                
            # Verify keys still exist in keyring
            verified_keys = {}
            for provider, data in metadata.items():
                if keyring.get_password(self.service_name, f"{provider}_api_key"):
                    verified_keys[provider] = data
                    
            return verified_keys
            
        except Exception as e:
            print(f"❌ Failed to list stored keys: {e}")
            return {}
    
    def delete_api_key(self, provider: str) -> bool:
        """Delete API key and metadata"""
        try:
            # Remove from keyring
            keyring.delete_password(self.service_name, f"{provider}_api_key")
            
            # Remove metadata
            if self.key_file.exists():
                with open(self.key_file, 'r') as f:
                    metadata = json.load(f)
                
                if provider in metadata:
                    del metadata[provider]
                    
                with open(self.key_file, 'w') as f:
                    json.dump(metadata, f, indent=2)
            
            print(f"✅ API key for {provider} deleted")
            return True
            
        except Exception as e:
            print(f"❌ Failed to delete API key for {provider}: {e}")
            return False
    
    def _store_metadata(self, provider: str, metadata: Dict):
        """Store metadata for API key"""
        try:
            existing_metadata = {}
            if self.key_file.exists():
                with open(self.key_file, 'r') as f:
                    existing_metadata = json.load(f)
            
            existing_metadata[provider] = metadata
            
            with open(self.key_file, 'w') as f:
                json.dump(existing_metadata, f, indent=2)
                
        except Exception as e:
            print(f"❌ Failed to store metadata: {e}")
    
    def setup_openai_key(self, api_key: str) -> bool:
        """Setup OpenAI API key with validation"""
        # Basic validation
        if not api_key.startswith('sk-'):
            print("❌ Invalid OpenAI API key format (should start with 'sk-')")
            return False
            
        if len(api_key) < 45:  # OpenAI keys are typically 51 chars
            print("❌ OpenAI API key appears to be too short")
            return False
        
        # Store with metadata
        metadata = {
            'description': 'OpenAI ChatGPT API key for Claude Code offloading',
            'capabilities': ['gpt-4', 'gpt-3.5-turbo', 'text-generation'],
            'usage_limits': {
                'daily_budget_usd': 10.0,  # Default $10/day limit
                'monthly_budget_usd': 100.0  # Default $100/month limit
            },
            'security_level': 'high'
        }
        
        return self.store_api_key('openai', api_key, metadata)
    
    def validate_key_access(self, provider: str) -> bool:
        """Validate that we can access a stored key"""
        key = self.retrieve_api_key(provider)
        return key is not None and len(key) > 0

def main():
    """Interactive setup for API keys"""
    import sys
    
    manager = SecureKeyManager()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "setup-openai":
            if len(sys.argv) > 2:
                api_key = sys.argv[2]
                manager.setup_openai_key(api_key)
            else:
                print("Usage: python3 secure_key_manager.py setup-openai <api_key>")
                
        elif command == "list":
            keys = manager.list_stored_keys()
            if keys:
                print("🔐 Stored API Keys:")
                for provider, metadata in keys.items():
                    print(f"  📌 {provider}: {metadata.get('description', 'No description')}")
                    print(f"     Hash: {metadata.get('key_hash', 'Unknown')}")
                    print(f"     Stored: {metadata.get('stored_at', 'Unknown')}")
            else:
                print("No API keys stored")
                
        elif command == "delete":
            if len(sys.argv) > 2:
                provider = sys.argv[2]
                manager.delete_api_key(provider)
            else:
                print("Usage: python3 secure_key_manager.py delete <provider>")
                
        elif command == "test":
            if len(sys.argv) > 2:
                provider = sys.argv[2]
                if manager.validate_key_access(provider):
                    print(f"✅ {provider} API key is accessible")
                else:
                    print(f"❌ {provider} API key is not accessible")
            else:
                print("Usage: python3 secure_key_manager.py test <provider>")
        else:
            print("Commands: setup-openai, list, delete, test")
    else:
        # Interactive setup
        print("🔐 Secure Key Manager - Claude Flow")
        print("Available commands:")
        print("  setup-openai <key> - Store OpenAI API key")
        print("  list - List stored keys") 
        print("  delete <provider> - Delete a key")
        print("  test <provider> - Test key access")

if __name__ == "__main__":
    main()