# Getting Started with Claudette v1.0.5

This guide walks you through using Claudette for the first time.

## Quick Start

### 1. Basic Request

The simplest way to use Claudette:

```typescript
import { optimize } from 'claudette';

const response = await optimize('Explain photosynthesis in simple terms');

console.log(response.content);
// Output: Photosynthesis is the process plants use to convert sunlight into energy...

console.log(`Backend: ${response.backend_used}`);
// Output: Backend: qwen

console.log(`Cost: €${response.cost_eur}`);
// Output: Cost: €0.002100

console.log(`Latency: ${response.latency_ms}ms`);
// Output: Latency: 912ms
```

### 2. With Options

```typescript
const response = await optimize(
  'Write a Python function to calculate prime numbers',
  [], // No file context
  {
    max_tokens: 200,
    temperature: 0.3,
    backend: 'openai'
  }
);
```

### 3. With File Context

```typescript
const response = await optimize(
  'Explain what this code does and suggest improvements',
  ['./src/utils/helper.js', './README.md'],
  {
    backend: 'qwen',
    max_tokens: 500
  }
);
```

## Understanding Responses

Every Claudette response includes:

```typescript
interface ClaudetteResponse {
  content: string;           // The AI's response
  backend_used: string;      // Which backend was used
  cost_eur: number;         // Cost in EUR (6 decimal places)
  latency_ms: number;       // Response time in milliseconds
  tokens_input: number;     // Input tokens used
  tokens_output: number;    // Output tokens generated
  cache_hit: boolean;       // Whether response was cached
  metadata?: any;           // Additional backend-specific data
}
```

## Backend Selection

Claudette automatically selects the best backend based on:

1. **Health**: Is the backend currently healthy?
2. **Performance**: Recent latency and success rates
3. **Cost**: Token cost for the request
4. **Availability**: Circuit breaker status

### Manual Backend Selection

```typescript
// Force specific backend
const response = await optimize('Hello', [], { backend: 'openai' });

// Let Claudette choose (recommended)
const response = await optimize('Hello');
```

### Current Backend Performance

| Backend | Health Check | Request Time | Cost/1K Tokens | Best For |
|---------|-------------|--------------|----------------|----------|
| **Qwen** | 302ms | 912ms | €0.10 | Fast, cost-effective |
| **OpenAI** | 758ms | 1,102ms | €0.60 | Reliable, high quality |
| **FlexCon** | 74ms | 22,351ms | €0.00 | GPU models (slow startup) |

## Configuration Options

### Request Options

```typescript
interface RequestOptions {
  backend?: string;          // Force specific backend
  max_tokens?: number;       // Maximum response tokens (default: 1000)
  temperature?: number;      // Creativity 0.0-1.0 (default: 0.7)
  model?: string;           // Override default model
  bypass_cache?: boolean;   // Skip response caching
  bypass_optimization?: boolean; // Raw mode - no middleware
  timeout?: number;         // Request timeout in ms (default: 45000)
}
```

### Environment Configuration

```bash
# In your .env file

# Backend API Keys
OPENAI_API_KEY=sk-your-openai-key
QWEN_API_KEY=sk-your-qwen-key
CUSTOM_BACKEND_1_API_KEY=your-flexcon-key
CUSTOM_BACKEND_1_API_URL=https://your-flexcon-endpoint.com

# System Settings
CLAUDETTE_TIMEOUT=45000              # Request timeout (45s)
NODE_ENV=development                 # Environment mode
CLAUDETTE_ALLOW_MOCK=1              # Allow mock backend in dev
```

## Error Handling

```typescript
import { optimize, ClaudetteError } from 'claudette';

try {
  const response = await optimize('Your prompt here');
  console.log(response.content);
} catch (error) {
  if (error instanceof ClaudetteError) {
    console.error(`Claudette Error: ${error.message}`);
    console.error(`Error Code: ${error.code}`);
    console.error(`Backend: ${error.backend}`);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Common Error Types

- **`INVALID_INPUT`**: Invalid prompt or parameters
- **`BACKEND_TIMEOUT`**: Backend took too long to respond
- **`RATE_LIMIT_ERROR`**: API rate limit exceeded  
- **`CONTEXT_LENGTH_ERROR`**: Request too long for backend
- **`BACKEND_ERROR`**: Backend-specific error
- **`INIT_ERROR`**: System initialization failed

## Caching

Claudette automatically caches responses to improve performance and reduce costs:

```typescript
// First request - hits backend
const response1 = await optimize('What is the capital of France?');
console.log(response1.cache_hit); // false

// Second identical request - from cache
const response2 = await optimize('What is the capital of France?');
console.log(response2.cache_hit); // true

// Bypass cache when needed
const response3 = await optimize('What is the capital of France?', [], {
  bypass_cache: true
});
console.log(response3.cache_hit); // false
```

### Cache Configuration

- **TTL**: 1 hour by default
- **Storage**: SQLite database
- **Key**: MD5 hash of prompt + options
- **Size**: 10,000 entries maximum

## Monitoring

### System Health

```typescript
import { Claudette } from 'claudette';

const claudette = new Claudette();
await claudette.initialize();

const status = await claudette.getStatus();
console.log(status);
```

Output:
```json
{
  "healthy": true,
  "database": { "healthy": true, "path": "./claudette.db" },
  "cache": { "hit_rate": 0.23, "size": 145 },
  "backends": {
    "stats": { "total_requests": 87, "total_cost": 0.123 },
    "health": [
      { "name": "openai", "healthy": true, "latency_ms": 756 },
      { "name": "qwen", "healthy": true, "latency_ms": 302 },
      { "name": "ollama", "healthy": true, "latency_ms": 74 }
    ]
  },
  "version": "1.0.5"
}
```

### Cost Tracking

Claudette tracks costs across all backends:

```typescript
// Cost is included in every response
const response = await optimize('Hello');
console.log(`This request cost: €${response.cost_eur}`);

// Get total system costs
const status = await claudette.getStatus();
console.log(`Total costs: €${status.backends.stats.total_cost}`);
```

## Advanced Usage

### Raw Mode

Bypass all Claudette middleware and go directly to a backend:

```typescript
const response = await optimize('Hello', [], {
  bypass_optimization: true,
  backend: 'claude'  // Must specify backend in raw mode
});
```

### Custom Timeout

```typescript
const response = await optimize('Complex analysis task', [], {
  timeout: 120000  // 2 minute timeout for long-running tasks
});
```

### Programmatic Backend Management

```typescript
import { Claudette } from 'claudette';

const claudette = new Claudette();
await claudette.initialize();

// Get backend statistics
const stats = claudette.router.getStats();

// Force health check on all backends
const healthResults = await claudette.router.healthCheckAll();

// Cleanup resources
await claudette.cleanup();
```

## Next Steps

- **[Configuration Guide](configuration.md)** - Advanced configuration options
- **[API Reference](../api/core-api.md)** - Complete API documentation
- **[Backend Documentation](../api/backends.md)** - Backend-specific details
- **[Architecture Overview](../technical/architecture.md)** - How Claudette works internally