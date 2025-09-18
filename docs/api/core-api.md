# Core API Reference

Complete API documentation for Claudette v1.0.2 core functionality.

## Main Function: `optimize()`

The primary interface for Claudette's AI middleware functionality.

### Signature

```typescript
async function optimize(
  prompt: string,
  files?: string[],
  options?: RequestOptions
): Promise<ClaudetteResponse>
```

### Parameters

#### `prompt: string` (required)
The input text to send to the AI backend.

```typescript
// Simple prompt
await optimize('Explain quantum computing');

// Complex prompt
await optimize(`
  Write a Python function that:
  1. Takes a list of numbers
  2. Filters out negative numbers
  3. Returns the sum of remaining numbers
  
  Include error handling and type hints.
`);
```

**Validation:**
- Must be a string (not null/undefined)
- Cannot be empty after trimming
- Maximum length: 1MB
- Basic security: Warns about potential script injection

#### `files?: string[]` (optional)
Array of file paths to include as context.

```typescript
// Single file
await optimize('Explain this code', ['./src/utils.js']);

// Multiple files
await optimize('Review these files', [
  './README.md',
  './src/main.ts',
  './tests/unit.test.js'
]);
```

**Validation:**
- Must be an array if provided
- Maximum 100 files
- File paths cannot contain `..` or `~` for security
- Files are read and included in request context

#### `options?: RequestOptions` (optional)
Configuration options for the request.

```typescript
interface RequestOptions {
  backend?: string;              // Force specific backend
  max_tokens?: number;           // Token limit (default: varies by backend)
  temperature?: number;          // 0.0-1.0, creativity level (default: 0.7)
  model?: string;               // Override default model
  bypass_cache?: boolean;       // Skip response caching (default: false)
  bypass_optimization?: boolean; // Raw mode (default: false)
  timeout?: number;             // Request timeout in ms (default: 45000)
}
```

### Return Value: `ClaudetteResponse`

```typescript
interface ClaudetteResponse {
  content: string;           // AI response content
  backend_used: string;      // Backend that handled the request
  cost_eur: number;         // Cost in EUR (6 decimal precision)
  latency_ms: number;       // Response time in milliseconds
  tokens_input: number;     // Input tokens consumed
  tokens_output: number;    // Output tokens generated
  cache_hit: boolean;       // Whether response came from cache
  metadata?: {              // Backend-specific metadata
    model?: string;
    finish_reason?: string;
    response_id?: string;
    [key: string]: any;
  };
}
```

### Examples

#### Basic Usage

```typescript
import { optimize } from 'claudette';

const response = await optimize('What is the capital of France?');

console.log(response.content);      // "The capital of France is Paris."
console.log(response.backend_used); // "qwen"
console.log(response.cost_eur);     // 0.002100
console.log(response.latency_ms);   // 912
console.log(response.cache_hit);    // false
```

#### Advanced Usage

```typescript
const response = await optimize(
  'Analyze this code for potential improvements',
  ['./src/calculator.js'],
  {
    backend: 'openai',
    max_tokens: 500,
    temperature: 0.3,
    timeout: 30000
  }
);

console.log(`Analysis by ${response.backend_used}:`);
console.log(response.content);
console.log(`Cost: €${response.cost_eur}, Time: ${response.latency_ms}ms`);
```

#### Error Handling

```typescript
import { optimize, ClaudetteError } from 'claudette';

try {
  const response = await optimize('Your prompt here');
  console.log(response.content);
} catch (error) {
  if (error instanceof ClaudetteError) {
    console.error(`Claudette Error [${error.code}]: ${error.message}`);
    console.error(`Backend: ${error.backend || 'unknown'}`);
    
    // Handle specific error types
    switch (error.code) {
      case 'RATE_LIMIT_ERROR':
        console.log('Rate limited, retry in a few minutes');
        break;
      case 'BACKEND_TIMEOUT':
        console.log('Backend too slow, try different backend');
        break;
      case 'CONTEXT_LENGTH_ERROR':
        console.log('Prompt too long, reduce length');
        break;
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Claudette Class

For advanced usage requiring lifecycle management.

### Constructor

```typescript
import { Claudette } from 'claudette';

// Use default configuration
const claudette = new Claudette();

// Use custom config file
const claudette = new Claudette('./my-config.json');
```

### Methods

#### `initialize(): Promise<void>`

Initialize the Claudette system. Must be called before other methods.

```typescript
const claudette = new Claudette();
await claudette.initialize();
```

**What it does:**
- Loads configuration from environment/config file
- Validates backend configurations
- Registers available backends
- Performs initial health checks
- Sets up caching and monitoring

#### `optimize(): Promise<ClaudetteResponse>`

Same as the standalone function, but on a specific instance.

```typescript
const response = await claudette.optimize('Hello, world!');
```

#### `getStatus(): Promise<SystemStatus>`

Get comprehensive system status and health information.

```typescript
interface SystemStatus {
  healthy: boolean;
  database: {
    healthy: boolean;
    path: string;
  };
  cache: {
    hit_rate: number;
    size: number;
  };
  backends: {
    stats: {
      total_requests: number;
      total_cost: number;
    };
    health: Array<{
      name: string;
      healthy: boolean;
      latency_ms?: number;
      error?: string;
    }>;
  };
  version: string;
}

const status = await claudette.getStatus();
console.log(`System health: ${status.healthy}`);
console.log(`Cache hit rate: ${status.cache.hit_rate}`);
console.log(`Total cost: €${status.backends.stats.total_cost}`);
```

#### `cleanup(): Promise<void>`

Clean up resources and close connections. Important for graceful shutdown.

```typescript
// Cleanup when done
await claudette.cleanup();

// Or use in process handlers
process.on('SIGINT', async () => {
  await claudette.cleanup();
  process.exit(0);
});
```

## Error Types

### `ClaudetteError`

Base error class for all Claudette-specific errors.

```typescript
class ClaudetteError extends Error {
  code: string;           // Error code identifier
  backend?: string;       // Backend that caused error (if applicable)
  retryable: boolean;     // Whether error might succeed on retry
}
```

### Error Codes

| Code | Description | Retryable |
|------|-------------|-----------|
| `INVALID_INPUT` | Invalid prompt or parameters | ❌ |
| `BACKEND_TIMEOUT` | Backend response timeout | ✅ |
| `RATE_LIMIT_ERROR` | API rate limit exceeded | ✅ |
| `CONTEXT_LENGTH_ERROR` | Input too long for backend | ❌ |
| `BACKEND_ERROR` | Backend-specific error | ⚠️ |
| `INIT_ERROR` | Initialization failed | ❌ |
| `REQUEST_TIMEOUT` | Overall request timeout | ✅ |

## Types Reference

### Complete Type Definitions

```typescript
// Main types
export interface ClaudetteRequest {
  prompt: string;
  files?: string[];
  options?: RequestOptions;
  metadata?: {
    timestamp?: string;
    request_id?: string;
    [key: string]: any;
  };
}

export interface RequestOptions {
  backend?: string;
  max_tokens?: number;
  temperature?: number;
  model?: string;
  bypass_cache?: boolean;
  bypass_optimization?: boolean;
  timeout?: number;
}

export interface ClaudetteResponse {
  content: string;
  backend_used: string;
  cost_eur: number;
  latency_ms: number;
  tokens_input: number;
  tokens_output: number;
  cache_hit: boolean;
  metadata?: any;
}

// Configuration types
export interface BackendSettings {
  enabled: boolean;
  priority: number;
  cost_per_token: number;
  model?: string;
  base_url?: string;
  api_key?: string;
}

export interface ClaudetteConfig {
  backends: {
    openai: BackendSettings;
    qwen: BackendSettings;
    ollama: BackendSettings;
    [key: string]: BackendSettings;
  };
  features: {
    caching: boolean;
    cost_optimization: boolean;
    performance_monitoring: boolean;
    smart_routing: boolean;
  };
  thresholds: {
    cache_ttl: number;
    max_cache_size: number;
    cost_warning: number;
    max_context_tokens: number;
    request_timeout: number;
  };
}
```

## Performance Considerations

### Caching

- Responses are automatically cached for 1 hour
- Cache key includes prompt + options hash
- Use `bypass_cache: true` for real-time data
- Cache size limited to 10,000 entries

### Timeouts

- Default request timeout: 45 seconds
- Health check timeout: 5.5 seconds
- Can be overridden per request
- Backend-specific timeouts are optimized

### Cost Optimization

- Qwen is typically fastest and cheapest
- OpenAI provides highest quality
- FlexCon is free but slow for large models
- Backend selection considers all factors

### Memory Usage

- File content is loaded into memory temporarily
- Large files may impact performance
- Cleanup regularly with `claudette.cleanup()`

## Next Steps

- **[Backend API](backends.md)** - Backend-specific documentation
- **[Types Reference](types.md)** - Complete TypeScript types
- **[Configuration Guide](../guides/configuration.md)** - Advanced configuration