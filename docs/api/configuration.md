# Configuration API Reference

Complete reference for claudette-ai-tools configuration system.

## 📁 Configuration File

### Default Location
- **Path**: `~/.claudette/config.json`
- **Format**: JSON
- **Encoding**: UTF-8

### Alternative Locations
1. Environment variable: `CLAUDETTE_CONFIG`
2. Command line: `--config /path/to/config.json`
3. Current directory: `./claudette.json`

## 🔧 Configuration Schema

### Complete Configuration Example

```json
{
  "version": "1.0",
  "default_backend": "openai",
  "backends": {
    "openai": {
      "api_key": "${OPENAI_API_KEY}",
      "base_url": "https://api.openai.com/v1",
      "default_model": "gpt-3.5-turbo",
      "max_tokens": 1000,
      "temperature": 0.7,
      "timeout": 30,
      "retry_attempts": 3,
      "retry_delay": 1.0
    },
    "anthropic": {
      "api_key": "${ANTHROPIC_API_KEY}",
      "base_url": "https://api.anthropic.com",
      "default_model": "claude-3-sonnet-20240229",
      "max_tokens": 1000,
      "temperature": 0.7,
      "timeout": 30,
      "retry_attempts": 3,
      "retry_delay": 1.0
    },
    "mistral": {
      "api_key": "${MISTRAL_API_KEY}",
      "base_url": "https://api.mistral.ai/v1",
      "default_model": "mistral-medium",
      "max_tokens": 1000,
      "temperature": 0.7,
      "timeout": 30,
      "retry_attempts": 3,
      "retry_delay": 1.0
    },
    "ollama": {
      "base_url": "http://localhost:11434",
      "default_model": "llama2",
      "timeout": 60,
      "retry_attempts": 2,
      "retry_delay": 2.0
    }
  },
  "features": {
    "cache_enabled": true,
    "cache_ttl": 3600,
    "cache_max_size": "100MB",
    "cost_tracking": true,
    "session_memory": true,
    "session_max_history": 100,
    "auto_save_sessions": true,
    "performance_monitoring": true,
    "plugin_system": true,
    "auto_update_plugins": false
  },
  "cost_tracking": {
    "enabled": true,
    "track_tokens": true,
    "track_requests": true,
    "budget_alerts": true,
    "daily_budget": 10.00,
    "monthly_budget": 100.00,
    "currency": "USD"
  },
  "performance": {
    "max_concurrent_requests": 5,
    "request_timeout": 30,
    "connection_pool_size": 10,
    "enable_compression": true,
    "buffer_size": 8192
  },
  "logging": {
    "level": "INFO",
    "file": "~/.claudette/logs/claudette.log",
    "max_size": "10MB",
    "backup_count": 5,
    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
  },
  "plugins": {
    "mistral": {
      "enabled": true,
      "auto_load": true
    },
    "ollama": {
      "enabled": false,
      "auto_load": false
    },
    "performance_monitor": {
      "enabled": true,
      "auto_load": true,
      "settings": {
        "collection_interval": 60,
        "metric_retention": "30d"
      }
    }
  }
}
```

## 🔑 Configuration Sections

### 1. General Settings

```json
{
  "version": "1.0",
  "default_backend": "openai"
}
```

#### Fields
- **version** (string): Configuration schema version
- **default_backend** (string): Default AI backend to use

### 2. Backend Configuration

```json
{
  "backends": {
    "backend_name": {
      "api_key": "string",
      "base_url": "string", 
      "default_model": "string",
      "max_tokens": 1000,
      "temperature": 0.7,
      "timeout": 30,
      "retry_attempts": 3,
      "retry_delay": 1.0
    }
  }
}
```

#### Common Backend Fields
- **api_key** (string): API key for the service
- **base_url** (string): API endpoint URL
- **default_model** (string): Default model to use
- **max_tokens** (integer): Maximum tokens per request
- **temperature** (float): Response creativity (0.0-2.0)
- **timeout** (integer): Request timeout in seconds
- **retry_attempts** (integer): Number of retry attempts
- **retry_delay** (float): Delay between retries in seconds

### 3. Feature Configuration

```json
{
  "features": {
    "cache_enabled": true,
    "cache_ttl": 3600,
    "cache_max_size": "100MB",
    "cost_tracking": true,
    "session_memory": true,
    "session_max_history": 100,
    "auto_save_sessions": true,
    "performance_monitoring": true,
    "plugin_system": true,
    "auto_update_plugins": false
  }
}
```

#### Feature Fields
- **cache_enabled** (boolean): Enable response caching
- **cache_ttl** (integer): Cache time-to-live in seconds
- **cache_max_size** (string): Maximum cache size
- **cost_tracking** (boolean): Enable cost tracking
- **session_memory** (boolean): Enable session memory
- **session_max_history** (integer): Maximum history entries
- **auto_save_sessions** (boolean): Automatically save sessions
- **performance_monitoring** (boolean): Enable performance monitoring
- **plugin_system** (boolean): Enable plugin system
- **auto_update_plugins** (boolean): Automatically update plugins

### 4. Cost Tracking Configuration

```json
{
  "cost_tracking": {
    "enabled": true,
    "track_tokens": true,
    "track_requests": true,
    "budget_alerts": true,
    "daily_budget": 10.00,
    "monthly_budget": 100.00,
    "currency": "USD"
  }
}
```

#### Cost Tracking Fields
- **enabled** (boolean): Enable cost tracking
- **track_tokens** (boolean): Track token usage
- **track_requests** (boolean): Track request count
- **budget_alerts** (boolean): Enable budget alerts
- **daily_budget** (float): Daily spending limit
- **monthly_budget** (float): Monthly spending limit
- **currency** (string): Currency code (USD, EUR, etc.)

### 5. Performance Configuration

```json
{
  "performance": {
    "max_concurrent_requests": 5,
    "request_timeout": 30,
    "connection_pool_size": 10,
    "enable_compression": true,
    "buffer_size": 8192
  }
}
```

#### Performance Fields
- **max_concurrent_requests** (integer): Maximum concurrent API requests
- **request_timeout** (integer): Request timeout in seconds
- **connection_pool_size** (integer): HTTP connection pool size
- **enable_compression** (boolean): Enable response compression
- **buffer_size** (integer): I/O buffer size in bytes

### 6. Logging Configuration

```json
{
  "logging": {
    "level": "INFO",
    "file": "~/.claudette/logs/claudette.log",
    "max_size": "10MB",
    "backup_count": 5,
    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
  }
}
```

#### Logging Fields
- **level** (string): Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- **file** (string): Log file path
- **max_size** (string): Maximum log file size
- **backup_count** (integer): Number of backup log files
- **format** (string): Log message format

### 7. Plugin Configuration

```json
{
  "plugins": {
    "plugin_name": {
      "enabled": true,
      "auto_load": true,
      "settings": {
        "custom_setting": "value"
      }
    }
  }
}
```

#### Plugin Fields
- **enabled** (boolean): Enable the plugin
- **auto_load** (boolean): Load plugin automatically
- **settings** (object): Plugin-specific settings

## 🔄 Configuration Management API

### Configuration Commands

```bash
# Initialize default configuration
claudette config init

# Show entire configuration
claudette config show

# Show specific section
claudette config show backends

# Get specific value
claudette config get default_backend
claudette config get backends.openai.api_key

# Set configuration value
claudette config set default_backend anthropic
claudette config set backends.openai.max_tokens 2000

# Remove configuration value
claudette config unset backends.mistral.api_key

# Validate configuration
claudette config validate

# Reset to defaults
claudette config reset --confirm

# Import configuration
claudette config import config.json

# Export configuration
claudette config export config.json
```

### Programmatic Configuration Access

```python
from claudette.config import Config

# Load configuration
config = Config.load()

# Access values
backend = config.get('default_backend')
api_key = config.get('backends.openai.api_key')

# Set values
config.set('default_backend', 'anthropic')
config.set('backends.openai.max_tokens', 2000)

# Save configuration
config.save()

# Validate configuration
is_valid, errors = config.validate()
```

## 🌍 Environment Variables

### Supported Environment Variables

```bash
# Configuration file path
export CLAUDETTE_CONFIG="/path/to/config.json"

# Default backend
export CLAUDETTE_BACKEND="anthropic"

# Default model
export CLAUDETTE_MODEL="claude-3-sonnet"

# API keys
export OPENAI_API_KEY="your-openai-key"
export ANTHROPIC_API_KEY="your-anthropic-key"
export MISTRAL_API_KEY="your-mistral-key"

# Ollama configuration
export OLLAMA_BASE_URL="http://localhost:11434"

# Feature toggles
export CLAUDETTE_CACHE_ENABLED="true"
export CLAUDETTE_COST_TRACKING="true"
export CLAUDETTE_DEBUG="false"

# Logging
export CLAUDETTE_LOG_LEVEL="INFO"
export CLAUDETTE_LOG_FILE="/path/to/logfile.log"
```

### Environment Variable Priority

1. Command line arguments (highest priority)
2. Environment variables
3. Configuration file
4. Default values (lowest priority)

## 🔧 Backend-Specific Configuration

### OpenAI Configuration

```json
{
  "backends": {
    "openai": {
      "api_key": "${OPENAI_API_KEY}",
      "organization": "org-123456789",
      "base_url": "https://api.openai.com/v1",
      "default_model": "gpt-3.5-turbo",
      "max_tokens": 1000,
      "temperature": 0.7,
      "top_p": 1.0,
      "frequency_penalty": 0.0,
      "presence_penalty": 0.0,
      "timeout": 30,
      "retry_attempts": 3
    }
  }
}
```

### Anthropic Configuration

```json
{
  "backends": {
    "anthropic": {
      "api_key": "${ANTHROPIC_API_KEY}",
      "base_url": "https://api.anthropic.com",
      "default_model": "claude-3-sonnet-20240229",
      "max_tokens": 1000,
      "temperature": 0.7,
      "timeout": 30,
      "retry_attempts": 3
    }
  }
}
```

### Mistral Configuration

```json
{
  "backends": {
    "mistral": {
      "api_key": "${MISTRAL_API_KEY}",
      "base_url": "https://api.mistral.ai/v1",
      "default_model": "mistral-medium",
      "max_tokens": 1000,
      "temperature": 0.7,
      "timeout": 30,
      "retry_attempts": 3
    }
  }
}
```

### Ollama Configuration

```json
{
  "backends": {
    "ollama": {
      "base_url": "http://localhost:11434",
      "default_model": "llama2",
      "timeout": 60,
      "keep_alive": "5m",
      "num_ctx": 2048,
      "temperature": 0.7,
      "top_p": 0.9,
      "top_k": 40
    }
  }
}
```

## 🛡️ Security Considerations

### API Key Security

1. **Never hardcode API keys** in configuration files
2. **Use environment variables**: `${ENV_VAR_NAME}` syntax
3. **Set file permissions**: `chmod 600 ~/.claudette/config.json`
4. **Use .env files** for local development
5. **Rotate keys regularly**

### Configuration File Security

```bash
# Set secure permissions
chmod 600 ~/.claudette/config.json
chmod 700 ~/.claudette/

# Verify permissions
ls -la ~/.claudette/
```

### Environment Security

```bash
# Use a secure .env file
echo "OPENAI_API_KEY=your-key" > ~/.claudette/.env
chmod 600 ~/.claudette/.env

# Load in shell
source ~/.claudette/.env
```

## 🔄 Migration and Upgrades

### Configuration Migration

```bash
# Backup current configuration
cp ~/.claudette/config.json ~/.claudette/config.json.backup

# Migrate from old format
claudette config migrate --from-version 0.9

# Validate after migration
claudette config validate
```

### Schema Versioning

Configuration files include a version field for compatibility:

```json
{
  "version": "1.0",
  "migration": {
    "from_version": "0.9",
    "migrated_at": "2025-01-26T12:00:00Z"
  }
}
```

## ✅ Validation and Testing

### Configuration Validation

```bash
# Validate configuration
claudette config validate

# Validate specific section
claudette config validate backends

# Validate with verbose output
claudette config validate --verbose
```

### Connection Testing

```bash
# Test all backend connections
claudette config test-connection

# Test specific backend
claudette config test-connection openai

# Test with detailed output
claudette config test-connection --verbose
```

## 📚 Examples

### Minimal Configuration

```json
{
  "version": "1.0",
  "default_backend": "openai",
  "backends": {
    "openai": {
      "api_key": "${OPENAI_API_KEY}"
    }
  }
}
```

### Multi-Backend Configuration

```json
{
  "version": "1.0",
  "default_backend": "openai",
  "backends": {
    "openai": {
      "api_key": "${OPENAI_API_KEY}",
      "default_model": "gpt-4"
    },
    "anthropic": {
      "api_key": "${ANTHROPIC_API_KEY}",
      "default_model": "claude-3-sonnet"
    },
    "ollama": {
      "base_url": "http://localhost:11434",
      "default_model": "llama2"
    }
  },
  "features": {
    "cost_tracking": true,
    "cache_enabled": true
  }
}
```

### Enterprise Configuration

```json
{
  "version": "1.0",
  "default_backend": "openai",
  "backends": {
    "openai": {
      "api_key": "${OPENAI_API_KEY}",
      "organization": "${OPENAI_ORG_ID}",
      "base_url": "https://api.openai.com/v1",
      "default_model": "gpt-4",
      "max_tokens": 2000,
      "timeout": 60,
      "retry_attempts": 5
    }
  },
  "cost_tracking": {
    "enabled": true,
    "daily_budget": 50.00,
    "monthly_budget": 1000.00,
    "budget_alerts": true
  },
  "performance": {
    "max_concurrent_requests": 10,
    "connection_pool_size": 20
  },
  "logging": {
    "level": "INFO",
    "file": "/var/log/claudette/claudette.log"
  }
}
```

---

**📖 For more details**, see the [Usage Guide](../guides/usage.md) and [Installation Guide](../guides/installation.md).