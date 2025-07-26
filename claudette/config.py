"""
Configuration management for Claudette
Handles loading and validation of config.yaml with enhanced validation and defaults
"""

try:
    import yaml
except ImportError:
    try:
        import ruamel.yaml as yaml
    except ImportError:
        # Minimal YAML replacement for basic config parsing
        class MinimalYAML:
            @staticmethod
            def safe_load(content):
                if isinstance(content, str):
                    # Basic YAML parsing
                    result = {}
                    for line in content.split('\n'):
                        line = line.strip()
                        if ':' in line and not line.startswith('#'):
                            key, value = line.split(':', 1)
                            key = key.strip()
                            value = value.strip().strip('\'"')
                            # Convert basic types
                            if value.lower() == 'true':
                                value = True
                            elif value.lower() == 'false':
                                value = False
                            elif value.isdigit():
                                value = int(value)
                            result[key] = value
                    return result
                return content if content else {}
                
            @staticmethod
            def dump(data, *args, **kwargs):
                # Basic YAML output
                result = []
                for key, value in data.items():
                    result.append(f"{key}: {value}")
                return '\n'.join(result)
        
        yaml = MinimalYAML()
import os
from pathlib import Path
from typing import Dict, Any, Optional, List
from .config_validator import (
    validate_command,
    validate_url, 
    validate_backend_name,
    get_config_suggestions
)


class Config:
    """Configuration handler for Claudette"""
    
    def __init__(self, config_data: Dict[str, Any]):
        self.claude_cmd = config_data.get('claude_cmd', 'claude')
        self.default_backend = config_data.get('default_backend', 'auto')
        self.openai_key = config_data.get('openai_key') or os.getenv('OPENAI_API_KEY')
        self.openai_model = config_data.get('openai_model', 'gpt-3.5-turbo')
        self.mistral_key = config_data.get('mistral_key') or os.getenv('MISTRAL_API_KEY')
        self.mistral_model = config_data.get('mistral_model', 'mistral-tiny')
        self.ollama_model = config_data.get('ollama_model') or os.getenv('OLLAMA_MODEL', 'llama2')
        self.ollama_url = config_data.get('ollama_url', 'http://localhost:11434')
        self.fallback_enabled = config_data.get('fallback_enabled', True)
        
        # Claude-flow integration settings
        self.claude_flow_enabled = config_data.get('claude_flow_enabled', True)
        self.claude_flow_auto_install = config_data.get('claude_flow_auto_install', False)
        self.swarm_topology = config_data.get('swarm_topology', 'hierarchical')
        self.max_agents = config_data.get('max_agents', 8)
    
    @classmethod
    def load(cls, config_path: Optional[Path] = None) -> 'Config':
        """
        Load configuration from config.yaml
        
        Args:
            config_path: Path to config file, defaults to ./config.yaml
            
        Returns:
            Config instance
        """
        if config_path is None:
            # Look for config.yaml in current directory or repo root
            candidates = [
                Path.cwd() / "config.yaml",
                Path(__file__).parent.parent / "config.yaml"
            ]
            
            config_path = None
            for candidate in candidates:
                if candidate.exists():
                    config_path = candidate
                    break
        
        if config_path and config_path.exists():
            try:
                with open(config_path, 'r') as f:
                    content = f.read()
                    config_data = yaml.safe_load(content) or {}
            except Exception as e:
                print(f"Warning: Failed to load config from {config_path}: {e}")
                config_data = {}
        else:
            # Use defaults
            config_data = {}
        
        return cls(config_data)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary"""
        return {
            'claude_cmd': self.claude_cmd,
            'default_backend': self.default_backend,
            'openai_key': self.openai_key,
            'openai_model': self.openai_model,
            'mistral_key': self.mistral_key,
            'mistral_model': self.mistral_model,
            'ollama_model': self.ollama_model,
            'ollama_url': self.ollama_url,
            'fallback_enabled': self.fallback_enabled,
            'claude_flow_enabled': self.claude_flow_enabled,
            'claude_flow_auto_install': self.claude_flow_auto_install,
            'swarm_topology': self.swarm_topology,
            'max_agents': self.max_agents
        }


# Add ClaudetteConfig for backward compatibility
class ClaudetteConfig:
    """Backward compatibility wrapper for Config class"""
    
    def __init__(self):
        # Load using the Config class
        self._config = Config.load()
        
        # Map Config attributes to ClaudetteConfig format
        self.openai_key = self._config.openai_key
        self.anthropic_key = os.getenv('ANTHROPIC_API_KEY')
        self.mistral_key = self._config.mistral_key
        
        # Cost Conservation Settings (defaults for compatibility)
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
        self.log_level = "INFO"
        self.max_log_size_mb = 10
        
        # Paths
        self.base_path = Path(__file__).parent.parent
        self.cache_dir = self.base_path / "cache"
        self.logs_dir = self.base_path / "logs"
        
        # Claude Flow Integration Settings
        self.claude_flow_enabled = True
        self.claude_flow_auto_install = True
        self.claude_flow_check_interval = 300  # 5 minutes
        
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
        
        # Check Claude Flow integration if enabled
        if self.claude_flow_enabled:
            try:
                from .integrations.claude_flow_bridge import get_claude_flow_status
                status = get_claude_flow_status()
                if not status["claude_flow_installed"]:
                    issues.append("claude-flow not installed (run 'claudette --install-claude-flow')")
            except ImportError:
                issues.append("claude-flow bridge not available")
            
        if issues:
            print("❌ Configuration Issues:")
            for issue in issues:
                print(f"   - {issue}")
            return False
        
        return True
    
    def __repr__(self):
        """Safe representation that doesn't expose keys"""
        return f"ClaudetteConfig(models={len(self.model_priority)}, budget=${self.daily_budget_usd})"