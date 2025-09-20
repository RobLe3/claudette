# Backend System Documentation

Complete documentation for Claudette v1.0.2's multi-backend system.

## Overview

Claudette supports three AI backends with intelligent routing:

| Backend | Provider | Speed | Cost | Use Case |
|---------|----------|-------|------|----------|
| **Qwen** | Alibaba Cloud | ⚡ Fastest (912ms) | 💰 Low cost | General purpose |
| **OpenAI** | OpenAI | 🚀 Fast (1,102ms) | 💰💰 Medium cost | High quality |
| **FlexCon** | Custom GPU | 🐌 Slow (22s+) | 🆓 Free | Specialized models |

## Backend Configuration

### OpenAI Backend

#### Configuration
```bash
# Required
OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# Optional (uses defaults)
OPENAI_MODEL=gpt-4o-mini                    # Default model
OPENAI_BASE_URL=https://api.openai.com/v1  # Custom endpoint
```

#### Performance Characteristics
- **Health Check**: 758ms average, 964ms P95
- **Request Latency**: 1,102ms average
- **Success Rate**: 100%
- **Cost**: ~€0.000006 per request
- **Available Models**: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-4, gpt-3.5-turbo

#### Usage
```typescript
// Force OpenAI backend
const response = await optimize('Hello', [], { backend: 'openai' });

// Use specific OpenAI model
const response = await optimize('Hello', [], { 
  backend: 'openai',
  model: 'gpt-4o'
});
```

#### Error Handling
Common OpenAI-specific errors:
- Rate limiting (429)
- Context length exceeded
- Invalid API key
- Model not found

### Qwen Backend (Alibaba Cloud)

#### Configuration
```bash
# Required
QWEN_API_KEY=sk-your-qwen-api-key-here

# Optional
DASHSCOPE_API_KEY=sk-alternative-key-name
QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-plus
```

#### Performance Characteristics
- **Health Check**: 302ms average, 1,056ms P95
- **Request Latency**: 912ms average (fastest)
- **Success Rate**: 100%
- **Cost**: ~€0.004420 per request
- **Available Models**: qwen-plus, qwen3-next-80b-a3b-thinking, various Qwen models

#### Usage
```typescript
// Force Qwen backend
const response = await optimize('Hello', [], { backend: 'qwen' });

// Use specific Qwen model
const response = await optimize('Hello', [], { 
  backend: 'qwen',
  model: 'qwen3-next-80b-a3b-thinking'
});
```

#### Regional Endpoints
- **International**: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` (recommended)
- **China Domestic**: `https://dashscope.aliyuncs.com/compatible-mode/v1`
- **US Specific**: `https://dashscope-us.aliyuncs.com/compatible-mode/v1`

### FlexCon Backend (Custom GPU)

#### Configuration
```bash
# Required
CUSTOM_BACKEND_1_API_KEY=your-flexcon-api-key
CUSTOM_BACKEND_1_API_URL=https://tools.flexcon.ai

# Optional
CUSTOM_BACKEND_1_MODEL=gpt-oss:20b-gpu16-ctx3072
CUSTOM_BACKEND_1_EXPECTED_LATENCY_MS=800
CUSTOM_BACKEND_1_REQUEST_TIMEOUT=50000
CUSTOM_BACKEND_1_GPU_COUNT=16
CUSTOM_BACKEND_1_INFERENCE_TYPE=gpu_accelerated
```

#### Performance Characteristics
- **Health Check**: 74ms average, 244ms P95 (very fast)
- **Request Latency**: 22,351ms average (slow due to model loading)
- **Success Rate**: 100% health, variable for requests
- **Cost**: €0.000000 (free)
- **Model**: 20B parameter GPU-accelerated model

#### Usage
```typescript
// Force FlexCon backend (mapped to 'ollama' internally)
const response = await optimize('Complex coding task', [], { 
  backend: 'ollama',
  timeout: 60000  // Longer timeout for GPU model loading
});
```

#### Notes
- Excellent for health checks (41ms)
- Slow for actual requests due to 20B model cold start
- Best for specialized GPU-accelerated tasks
- Free to use but limited availability

## Backend Selection Algorithm

Claudette automatically selects backends using weighted scoring:

### Selection Criteria (Default Weights)
- **Cost**: 40% weight
- **Latency**: 40% weight  
- **Availability**: 20% weight

### Selection Process
1. **Health Check**: Eliminate unhealthy backends
2. **Circuit Breaker**: Skip backends in open circuit state
3. **Performance Scoring**: Calculate weighted score for each backend
4. **Best Match**: Select highest scoring backend
5. **Fallback**: If selected backend fails, try next best

### Performance Scoring Example
```typescript
// For a general request, typical scores:
{
  qwen: 0.85,    // Fast + cheap = high score
  openai: 0.75,  // Reliable but more expensive
  ollama: 0.45   // Free but very slow
}
// Result: Qwen selected
```

## Manual Backend Selection

### Force Specific Backend
```typescript
// Always use OpenAI
const response = await optimize('prompt', [], { backend: 'openai' });

// Always use Qwen
const response = await optimize('prompt', [], { backend: 'qwen' });

// Always use FlexCon (via 'ollama' name)
const response = await optimize('prompt', [], { backend: 'ollama' });
```

### Backend Validation
```typescript
// Check which backends are available
import { Claudette } from 'claudette';

const claudette = new Claudette();
await claudette.initialize();

const status = await claudette.getStatus();
status.backends.health.forEach(backend => {
  console.log(`${backend.name}: ${backend.healthy ? 'healthy' : 'unhealthy'}`);
});
```

## Health Monitoring

### Health Check Frequency
- **Background checks**: Every 60 seconds
- **On-demand checks**: Before each request if cache expired
- **Circuit breaker**: After failures for recovery detection

### Health Check Process
Each backend implements:
1. **API Connectivity**: Test basic API endpoint
2. **Authentication**: Verify API key validity
3. **Response Quality**: Check for expected response format
4. **Latency Measurement**: Track response times

### Circuit Breaker Pattern

Claudette implements circuit breakers for each backend:

```typescript
// Circuit breaker states
enum CircuitState {
  CLOSED,    // Normal operation
  OPEN,      // Failures detected, requests blocked
  HALF_OPEN  // Testing recovery
}

// Circuit breaker configuration
{
  failureThreshold: 5,        // Failures before opening
  resetTimeout: 45000,        // Time before retry (45s)
  halfOpenMaxCalls: 3,        // Test calls in half-open state
  failureRateThreshold: 50,   // 50% failure rate threshold
  slowCallThreshold: 5000,    // 5s = slow call
  slowCallRateThreshold: 80   // 80% slow calls threshold
}
```

### Health Check Results
```typescript
interface HealthResult {
  name: string;           // Backend name
  healthy: boolean;       // Current health status
  latency_ms?: number;    // Response time
  error?: string;         // Error message if unhealthy
  lastCheck: number;      // Timestamp of last check
}
```

## Cost Tracking

### Cost Calculation
Each backend tracks costs in EUR with 6-decimal precision:

```typescript
// Cost per backend (approximate)
const costPer1KTokens = {
  openai: 0.60,    // €0.0006 per 1K tokens
  qwen: 0.10,      // €0.0001 per 1K tokens  
  ollama: 0.00     // Free
};
```

### Cost Monitoring
```typescript
// Get total costs across all backends
const status = await claudette.getStatus();
console.log(`Total spent: €${status.backends.stats.total_cost}`);

// Per-request cost
const response = await optimize('Hello');
console.log(`This request: €${response.cost_eur}`);
```

## Error Handling

### Backend-Specific Errors

#### OpenAI Errors
```typescript
// Rate limiting
{
  code: 'RATE_LIMIT_ERROR',
  message: 'OpenAI rate limit exceeded',
  backend: 'openai',
  retryAfter: 60000  // Retry after 60s
}

// Context length
{
  code: 'CONTEXT_LENGTH_ERROR', 
  message: 'OpenAI context length exceeded',
  backend: 'openai'
}
```

#### Qwen Errors
```typescript
// Authentication
{
  code: 'BACKEND_ERROR',
  message: 'Qwen authentication failed',
  backend: 'qwen'
}

// Regional restrictions
{
  code: 'BACKEND_ERROR',
  message: 'Qwen service not available in region',
  backend: 'qwen'
}
```

#### FlexCon Errors
```typescript
// Model loading timeout
{
  code: 'BACKEND_TIMEOUT',
  message: 'FlexCon model loading timeout',
  backend: 'ollama'
}

// GPU unavailable
{
  code: 'BACKEND_ERROR',
  message: 'FlexCon GPU resources unavailable',
  backend: 'ollama'
}
```

### Error Recovery

```typescript
// Automatic retry with different backend
try {
  const response = await optimize('Hello', [], { backend: 'qwen' });
} catch (error) {
  if (error.code === 'BACKEND_TIMEOUT') {
    // Claudette automatically tries next available backend
    console.log('Qwen timed out, trying OpenAI...');
  }
}
```

## Advanced Backend Management

### Programmatic Backend Control

```typescript
import { Claudette } from 'claudette';

const claudette = new Claudette();
await claudette.initialize();

// Force health check on all backends
const healthResults = await claudette.router.healthCheckAll();

// Get router statistics
const stats = claudette.router.getStats();
console.log(`Total requests: ${stats.totalRequests}`);
console.log(`Success rate: ${stats.successRate}%`);

// Get circuit breaker states
for (const [name, backend] of claudette.router.backends) {
  const breaker = claudette.router.circuitBreakers.get(name);
  console.log(`${name}: ${breaker.getState()}`);
}
```

### Custom Backend Configuration

While v1.0.2 doesn't support runtime backend registration, you can configure existing backends:

```json
// claudette.config.json
{
  "backends": {
    "openai": {
      "enabled": true,
      "priority": 2,
      "cost_per_token": 0.0006,
      "model": "gpt-4o-mini"
    },
    "qwen": {
      "enabled": true,
      "priority": 1,
      "cost_per_token": 0.0001,
      "model": "qwen-plus"
    },
    "ollama": {
      "enabled": false,  // Disable FlexCon
      "priority": 4
    }
  }
}
```

## Performance Optimization

### Backend Selection Tips

1. **For Speed**: Use Qwen (912ms average)
2. **For Quality**: Use OpenAI (reliable, well-tested)
3. **For Cost**: Use Qwen (cheapest per token)
4. **For Specialized Tasks**: Use FlexCon (if time allows)

### Timeout Optimization

Current optimized timeouts based on empirical testing:
- **Health checks**: 5.5s (accommodates all backends)
- **Requests**: 45s (adequate for normal operations)
- **FlexCon requests**: Consider 60s+ timeout for model loading

### Caching Strategy

```typescript
// Cache expensive operations
const expensivePrompt = "Analyze this 10,000 line codebase...";

// First call - hits backend
const response1 = await optimize(expensivePrompt);

// Second call - from cache (saves cost + time)
const response2 = await optimize(expensivePrompt);
console.log(response2.cache_hit); // true
```

## Troubleshooting

### Common Issues

#### "No healthy backends found"
1. Check API keys in environment
2. Verify network connectivity
3. Check regional restrictions (Qwen)
4. Run health diagnostics

#### Backend constantly failing
1. Check API key validity
2. Verify API endpoint URLs
3. Check rate limiting
4. Review circuit breaker status

#### Slow performance
1. Check which backend is being selected
2. Consider forcing faster backend (Qwen)
3. Optimize prompts for shorter responses
4. Use caching for repeated requests

### Diagnostic Commands

```bash
# Check backend health
./claudette health

# Check specific backend
./claudette health --backend qwen

# Performance benchmark
./claudette benchmark --requests 5 --concurrent 1
```

## Next Steps

- **[Core API](core-api.md)** - Main API usage
- **[Types Reference](types.md)** - TypeScript definitions  
- **[Configuration Guide](../guides/configuration.md)** - Advanced configuration
- **[Architecture](../technical/architecture.md)** - System design