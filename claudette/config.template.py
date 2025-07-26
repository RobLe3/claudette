#!/usr/bin/env python3
"""
Claudette Configuration Template
Copy this to config.py and update with your settings
DO NOT commit config.py with real credentials
"""

import os
from pathlib import Path

class ClaudetteConfig:
    """Secure configuration management for Claudette"""
    
    def __init__(self):
        # API Keys - Always use environment variables
        self.openai_key = os.getenv('OPENAI_API_KEY')
        self.anthropic_key = os.getenv('ANTHROPIC_API_KEY') 
        self.mistral_key = os.getenv('MISTRAL_API_KEY')
        
        # Validate required keys
        if not self.openai_key:
            print("⚠️  Warning: OPENAI_API_KEY not set in environment")
        
        # Cost Conservation Settings
        self.cost_conservation_enabled = True
        self.claude_usage_target = 8.3  # Target 8.3% Claude usage
        self.daily_budget_usd = 5.00
        self.aggressive_mode = True
        
        # Model Selection Priority
        self.model_priority = [
            'gpt-4o-mini',    # Primary: Most cost-effective
            'gpt-3.5-turbo',  # Fallback: Good balance  
            'gpt-4o',         # Complex tasks only
            'claude'          # Reserved for orchestration
        ]
        
        # Performance Settings
        self.max_tokens = 4000
        self.temperature = 0.7
        self.timeout = 30
        
        # Security Settings
        self.mask_api_keys = True
        self.log_level = "INFO"  # Set to "DEBUG" only for troubleshooting
        self.max_log_size_mb = 10
        
        # Paths (use relative paths when possible)
        self.base_path = Path(__file__).parent.parent
        self.cache_dir = self.base_path / "cache"
        self.logs_dir = self.base_path / "logs"
        
        # Ensure directories exist
        self.cache_dir.mkdir(exist_ok=True)
        self.logs_dir.mkdir(exist_ok=True)
    
    def get_masked_key(self, key_name: str) -> str:
        """Return masked version of API key for logging"""
        key = getattr(self, key_name, None)
        if not key:
            return "NOT_SET"
        return f"{key[:8]}...{key[-4:]}" if len(key) > 12 else "***"
    
    def validate_config(self) -> bool:
        """Validate configuration is complete and secure"""
        issues = []
        
        # Check required API keys
        if not self.openai_key:
            issues.append("OPENAI_API_KEY not set")
            
        # Check for hardcoded keys (security check)
        for attr_name in dir(self):
            if 'key' in attr_name.lower():
                attr_value = getattr(self, attr_name)
                if isinstance(attr_value, str) and len(attr_value) > 10:
                    if not attr_value.startswith('$') and 'sk-' in attr_value:
                        issues.append(f"Potential hardcoded key in {attr_name}")
        
        if issues:
            print("❌ Configuration Issues:")
            for issue in issues:
                print(f"   - {issue}")
            return False
        
        return True
    
    def __repr__(self):
        """Safe representation that doesn't expose keys"""
        return f"ClaudetteConfig(models={len(self.model_priority)}, budget=${self.daily_budget_usd})"

# Example usage:
if __name__ == "__main__":
    config = ClaudetteConfig()
    print(f"Configuration: {config}")
    print(f"OpenAI Key: {config.get_masked_key('openai_key')}")
    print(f"Valid: {config.validate_config()}")