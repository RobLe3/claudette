# Configuration Guide

Complete guide to configuring Claudette v1.0.2 for your environment.

## Environment Variables

### Backend Configuration

#### OpenAI
```bash
OPENAI_API_KEY=sk-proj-your-api-key-here    # Required
```

#### Qwen (Alibaba Cloud)
```bash
QWEN_API_KEY=sk-your-qwen-api-key           # Required  
DASHSCOPE_API_KEY=sk-your-qwen-api-key      # Alternative key name
QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1  # Optional
QWEN_MODEL=qwen-plus                        # Optional (default: qwen-plus)
```

#### FlexCon (Custom Backend)
```bash
CUSTOM_BACKEND_1_API_KEY=your-flexcon-key              # Required
CUSTOM_BACKEND_1_API_URL=https://tools.flexcon.ai     # Required
CUSTOM_BACKEND_1_MODEL=gpt-oss:20b-gpu16-ctx3072      # Optional
CUSTOM_BACKEND_1_EXPECTED_LATENCY_MS=800               # Optional
CUSTOM_BACKEND_1_REQUEST_TIMEOUT=50000                 # Optional
```

### System Configuration

```bash
# Timeouts
CLAUDETTE_TIMEOUT=45000                     # Main request timeout (45s)
DYNAMIC_TIMEOUT_ENABLED=true               # Enable adaptive timeouts
DYNAMIC_TIMEOUT_MIN_TIMEOUT=5000           # Minimum timeout (5s)
DYNAMIC_TIMEOUT_MAX_TIMEOUT=55000          # Maximum timeout (55s)

# Environment
NODE_ENV=development                        # development|production
DEBUG=claudette:*                          # Enable debug logging
CLAUDETTE_ALLOW_MOCK=1                     # Allow mock backend (dev only)

# Cache Settings
CLAUDETTE_CACHE_TTL=3600                   # Cache TTL in seconds (1 hour)
CLAUDETTE_MAX_RETRIES=3                    # Max retry attempts
```

## Backend Priority and Weights

Claudette uses these weights for backend selection:

```typescript
// Default router configuration (not user-configurable in v1.0.2)
const routerOptions = {
  cost_weight: 0.4,        // 40% weight on cost optimization
  latency_weight: 0.4,     // 40% weight on speed
  availability_weight: 0.2, // 20% weight on reliability
  fallback_enabled: true   // Enable fallback to other backends
};
```

## Timeout Configuration

### Current Optimized Timeouts (v1.0.2)

These timeouts are calibrated based on real backend performance:

```typescript
// Health check timeouts
HEALTH_CHECK_TIMEOUT = 5500ms          // Individual health checks
AVAILABILITY_CHECK_TIMEOUT = 8300ms    // Availability verification  
BACKGROUND_HEALTH_CHECK_TIMEOUT = 11000ms // Background health monitoring

// Circuit breaker
CIRCUIT_BREAKER_RESET_TIMEOUT = 45000ms // Circuit breaker recovery

// Request timeouts
REQUEST_TIMEOUT = 45000ms              // Main request timeout
OPENAI_CLIENT_TIMEOUT = 15000ms        // OpenAI SDK timeout
```

### Backend-Specific Performance

| Backend | Health Check P95 | Recommended Min Timeout | Status |
|---------|------------------|------------------------|--------|
| OpenAI  | 964ms           | 4000ms                 | ✅ Covered |
| Qwen    | 1056ms          | 4500ms                 | ✅ Covered |  
| FlexCon | 244ms           | 1000ms                 | ✅ Covered |

### Timeout Hierarchy

```
Request (45s)
  └── Circuit Breaker Reset (45s)
      └── Background Health (11s)
          └── Availability Check (8.3s)
              └── Health Check (5.5s)
                  └── OpenAI Client (15s)
```

## Advanced Configuration

### Custom Configuration File

Create `claudette.config.json` in your project root:

```json
{
  "backends": {
    "openai": {
      "enabled": true,
      "priority": 2,
      "cost_per_token": 0.0001,
      "model": "gpt-4o-mini"
    },
    "qwen": {
      "enabled": true,
      "priority": 1,
      "cost_per_token": 0.0001,
      "model": "qwen-plus",
      "base_url": "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    },
    "ollama": {
      "enabled": true,
      "priority": 4,
      "cost_per_token": 0,
      "base_url": "http://localhost:11434",
      "model": "llama2"
    }
  },
  "features": {
    "caching": true,
    "cost_optimization": true,
    "performance_monitoring": true,
    "smart_routing": true
  },
  "thresholds": {
    "cache_ttl": 3600,
    "max_cache_size": 10000,
    "cost_warning": 0.1,
    "max_context_tokens": 32000,
    "request_timeout": 45000
  }
}
```

### Programmatic Configuration

```typescript
import { Claudette } from 'claudette';

const claudette = new Claudette('./custom-config.json');
await claudette.initialize();
```

## Security Configuration

### API Key Storage

Claudette supports multiple secure storage methods:

1. **Environment Variables** (recommended for development)
2. **macOS Keychain** (automatic on macOS)
3. **Encrypted File Storage** (fallback)

### Best Practices

```bash
# Use .env file for development
echo "OPENAI_API_KEY=your-key-here" >> .env
echo ".env" >> .gitignore

# Use environment variables in production
export OPENAI_API_KEY="your-production-key"

# Never commit API keys to version control
git add .gitignore
```

## Development Configuration

### Development Mode

```bash
NODE_ENV=development
CLAUDETTE_ALLOW_MOCK=1
DEBUG=claudette:*
```

Benefits in development mode:
- Mock backend available as fallback
- Detailed debug logging
- Relaxed validation
- Additional error details

### Testing Configuration

```bash
NODE_ENV=test
CLAUDETTE_TIMEOUT=30000
CLAUDETTE_CACHE_TTL=60
```

## Production Configuration

### Production Mode

```bash
NODE_ENV=production
CLAUDETTE_TIMEOUT=45000
CLAUDETTE_MAX_RETRIES=3
```

Production optimizations:
- No mock backend fallback
- Reduced logging
- Strict validation
- Performance monitoring enabled

### Environment-Specific Settings

```bash
# staging.env
NODE_ENV=staging
OPENAI_API_KEY=sk-staging-key
QWEN_API_KEY=sk-staging-qwen-key
CLAUDETTE_TIMEOUT=60000

# production.env  
NODE_ENV=production
OPENAI_API_KEY=sk-production-key
QWEN_API_KEY=sk-production-qwen-key
CLAUDETTE_TIMEOUT=45000
```

## Monitoring Configuration

### Health Check Configuration

```bash
# Health check frequency
HEALTH_CACHE_TTL=60000                 # Check every 60 seconds

# Circuit breaker thresholds
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5   # Failures before opening
CIRCUIT_BREAKER_RESET_TIMEOUT=45000   # Recovery time
```

### Cost Monitoring

```bash
# Cost tracking
COST_WARNING_THRESHOLD=0.10           # Warn at €0.10
COST_TRACKING_ENABLED=true            # Enable cost tracking
```

## Troubleshooting Configuration

### Debug Logging

```bash
# Enable all claudette debug logs
DEBUG=claudette:*

# Specific component logging
DEBUG=claudette:router
DEBUG=claudette:backend:*
DEBUG=claudette:health
```

### Performance Debugging

```bash
# Extended timeouts for debugging
CLAUDETTE_TIMEOUT=120000
DYNAMIC_TIMEOUT_MAX_TIMEOUT=180000

# Disable optimizations
CLAUDETTE_CACHE_TTL=0
CLAUDETTE_ALLOW_MOCK=1
```

### Health Check Debugging

```bash
# More frequent health checks
HEALTH_CACHE_TTL=10000                # Every 10 seconds

# Verbose health reporting
DEBUG=claudette:health,claudette:circuit-breaker
```

## Validation

Claudette validates configuration on startup:

```typescript
// Check configuration
import { Claudette } from 'claudette';

const claudette = new Claudette();
const report = claudette.getConfigValidationReport();
console.log(report);
```

Example validation output:
```
🔧 Configuration validation found issues:
   Total: 2 issues (0 errors)
❌ OpenAI: No API key provided
❌ Qwen: Invalid base URL format
✅ Configuration auto-corrected
```

## Next Steps

- **[API Reference](../api/core-api.md)** - Use the configured system
- **[Backend Documentation](../api/backends.md)** - Backend-specific configuration
- **[Architecture Guide](../technical/architecture.md)** - Understanding the system