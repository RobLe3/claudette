# Claudette Core API

> **Main Orchestrator Class and Core Functions**
>
> The Claudette class is the central entry point for all AI optimization operations, providing intelligent routing, caching, and RAG integration.

## Table of Contents

- [Overview](#overview)
- [Claudette Class](#claudette-class)
- [Core Methods](#core-methods)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [Error Handling](#error-handling)
- [Performance Considerations](#performance-considerations)

---

## Overview

The Claudette core API provides a unified interface for:

- **Multi-backend AI routing** with cost and performance optimization
- **Intelligent caching** for response optimization
- **RAG integration** for context-enhanced generation
- **Performance monitoring** and metrics collection
- **Graceful error handling** with circuit breaker patterns

### Key Components

```typescript
import { 
  Claudette,           // Main orchestrator class
  optimize,           // Singleton function for simple usage
  ClaudetteConfig,    // Configuration interface
  ClaudetteRequest,   // Request structure
  ClaudetteResponse   // Response structure
} from 'claudette';
```

---

## Claudette Class

### Constructor

```typescript
class Claudette {
  constructor(configPath?: string)
}
```

Creates a new Claudette instance with optional configuration file path.

**Parameters:**
- `configPath` (optional): Path to configuration file (JSON format)

**Example:**
```typescript
// Default configuration
const claudette = new Claudette();

// Custom configuration file
const claudette = new Claudette('./my-config.json');

// Programmatic configuration
const claudette = new Claudette();
// Configuration will be loaded from standard locations
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `initialized` | `boolean` | Whether the instance has been initialized |
| `config` | `ClaudetteConfig` | Current configuration |

---

## Core Methods

### initialize()

Initialize Claudette with backends and perform health checks.

```typescript
async initialize(): Promise<void>
```

**Description:**
- Initializes all enabled backends based on configuration
- Performs database health checks
- Sets up caching and routing systems
- Must be called before using optimize()

**Example:**
```typescript
const claudette = new Claudette();
await claudette.initialize();

// Now ready to use
const result = await claudette.optimize('Your prompt');
```

**Throws:**
- `ClaudetteError` - If initialization fails

---

### optimize()

Main optimization function that replaces direct AI provider calls.

```typescript
async optimize(
  prompt: string,
  files: string[] = [],
  options: OptimizeOptions = {}
): Promise<ClaudetteResponse>
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `prompt` | `string` | - | The main prompt text |
| `files` | `string[]` | `[]` | Array of file paths to include as context |
| `options` | `OptimizeOptions` | `{}` | Request configuration options |

**OptimizeOptions Interface:**

```typescript
interface OptimizeOptions {
  // Backend selection
  backend?: string;              // Force specific backend
  model?: string;               // Specific model to use
  
  // Generation parameters
  max_tokens?: number;          // Maximum response tokens
  temperature?: number;         // Creativity level (0-2)
  
  // Cache control
  bypass_cache?: boolean;       // Skip cache lookup/storage
  
  // RAG options
  useRAG?: boolean;            // Enable RAG enhancement
  ragQuery?: string;           // RAG-specific query
  ragProvider?: string;        // Specific RAG provider
  contextStrategy?: 'prepend' | 'append' | 'inject';
  
  // Advanced options
  bypass_optimization?: boolean; // Skip all optimization (raw mode)
}
```

**Returns:**
- `Promise<ClaudetteResponse>` - Complete response with metadata

**ClaudetteResponse Interface:**

```typescript
interface ClaudetteResponse {
  content: string;              // Generated response content
  backend_used: string;         // Backend that processed the request
  tokens_input: number;         // Input tokens consumed
  tokens_output: number;        // Output tokens generated
  cost_eur: number;            // Total cost in EUR
  latency_ms: number;          // Response time in milliseconds
  cache_hit: boolean;          // Whether response came from cache
  compression_ratio?: number;   // If compression was applied
  metadata?: Record<string, any>; // Additional metadata
}
```

**Examples:**

#### Basic Usage
```typescript
const result = await claudette.optimize(
  'Explain TypeScript interfaces with examples'
);

console.log('Response:', result.content);
console.log('Cost:', result.cost_eur, 'EUR');
console.log('Backend:', result.backend_used);
```

#### Backend-Specific Routing
```typescript
const result = await claudette.optimize(
  'Generate Python code for sorting algorithms',
  [],
  {
    backend: 'qwen',
    model: 'Qwen2.5-Coder-7B-Instruct-AWQ',
    max_tokens: 2000,
    temperature: 0.3
  }
);
```

#### RAG-Enhanced Generation
```typescript
const result = await claudette.optimize(
  'How do I implement user authentication in Express.js?',
  [],
  {
    useRAG: true,
    ragQuery: 'Express.js authentication middleware JWT session',
    contextStrategy: 'prepend',
    max_tokens: 1500
  }
);

// Check if RAG was used
if (result.metadata?.ragUsed) {
  console.log('Context sources:', result.metadata.ragSources);
}
```

#### File Context Integration
```typescript
const result = await claudette.optimize(
  'Review this code and suggest improvements',
  ['./src/user-service.ts', './src/auth.ts'],
  {
    backend: 'claude',
    temperature: 0.2
  }
);
```

**Error Handling:**
```typescript
try {
  const result = await claudette.optimize(prompt, files, options);
  // Handle success
} catch (error) {
  if (error instanceof BackendError) {
    console.error('Backend failed:', error.backend, error.message);
    if (error.retryable) {
      // Retry logic
    }
  } else if (error instanceof CacheError) {
    console.error('Cache error:', error.message);
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

---

### getStatus()

Get comprehensive system status and health information.

```typescript
async getStatus(): Promise<SystemStatus>
```

**Returns:**

```typescript
interface SystemStatus {
  healthy: boolean;             // Overall system health
  database: DatabaseHealth;     // Database status
  cache: CacheStats;           // Cache performance metrics
  backends: BackendStats;      // Backend health and stats
  version: string;             // Claudette version
}

interface DatabaseHealth {
  healthy: boolean;
  latency_ms?: number;
  error?: string;
}

interface CacheStats {
  total_requests: number;
  cache_hits: number;
  cache_misses: number;
  hit_rate: number;           // Percentage (0-100)
  size_mb: number;
  entries_count: number;
}

interface BackendStats {
  stats: RouterStats;
  health: BackendHealth[];
}
```

**Example:**
```typescript
const status = await claudette.getStatus();

console.log('System healthy:', status.healthy);
console.log('Cache hit rate:', status.cache.hit_rate, '%');
console.log('Available backends:', status.backends.health.filter(b => b.healthy).length);

// Health monitoring
if (!status.healthy) {
  console.error('System unhealthy:', status);
  // Alert or recovery logic
}
```

---

### getConfig()

Get the current configuration object.

```typescript
getConfig(): ClaudetteConfig
```

**Returns:**
- `ClaudetteConfig` - Current configuration settings

**Example:**
```typescript
const config = claudette.getConfig();

console.log('Enabled backends:', 
  Object.entries(config.backends)
    .filter(([_, backend]) => backend.enabled)
    .map(([name, _]) => name)
);

console.log('Cache TTL:', config.thresholds.cache_ttl);
console.log('Features:', config.features);
```

---

### cleanup()

Cleanup resources and close connections.

```typescript
async cleanup(): Promise<void>
```

**Description:**
- Closes database connections
- Clears caches
- Disconnects from backends
- Should be called when shutting down

**Example:**
```typescript
// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down Claudette...');
  await claudette.cleanup();
  process.exit(0);
});
```

---

## Configuration

### ClaudetteConfig Interface

```typescript
interface ClaudetteConfig {
  backends: BackendConfig;      // Backend configurations
  features: FeatureConfig;      // Feature toggles
  thresholds: ThresholdConfig;  // Performance thresholds
  database?: DatabaseConfig;    // Optional database config
}
```

### Backend Configuration

```typescript
interface BackendConfig {
  claude: BackendSettings;
  openai: BackendSettings;
  mistral: BackendSettings;
  ollama: BackendSettings;
  qwen: BackendSettings;
}

interface BackendSettings {
  enabled: boolean;             // Enable this backend
  priority: number;             // Priority for routing (1 = highest)
  cost_per_token: number;       // Cost per 1000 tokens in EUR
  api_key?: string;            // API key (if not in keychain)
  base_url?: string;           // Custom base URL
  model?: string;              // Default model
  max_tokens?: number;         // Default max tokens
  temperature?: number;        // Default temperature
  backend_type?: 'cloud' | 'self_hosted';
}
```

### Feature Configuration

```typescript
interface FeatureConfig {
  caching: boolean;             // Enable response caching
  cost_optimization: boolean;   // Enable cost-based routing
  performance_monitoring: boolean; // Enable metrics collection
  smart_routing: boolean;       // Enable intelligent routing
  mcp_integration: boolean;     // Enable MCP plugin support
  compression: boolean;         // Enable request compression
  summarization: boolean;       // Enable response summarization
}
```

### Threshold Configuration

```typescript
interface ThresholdConfig {
  cache_ttl: number;           // Cache time-to-live (seconds)
  max_cache_size: number;      // Maximum cache entries
  cost_warning: number;        // Cost warning threshold (EUR)
  max_context_tokens: number;  // Maximum context size
  compression_threshold: number; // Compression trigger size
}
```

### Configuration Loading

Claudette loads configuration from multiple sources in order:

1. **Provided config path** (constructor parameter)
2. **Current directory**: `./claudette.config.json`
3. **User home**: `~/.claude/claudette/config.json`
4. **Default configuration** (built-in fallback)

**Example Configuration File:**

```json
{
  "backends": {
    "openai": {
      "enabled": true,
      "priority": 1,
      "cost_per_token": 0.000015,
      "model": "gpt-4o-mini",
      "max_tokens": 4000,
      "temperature": 0.7
    },
    "claude": {
      "enabled": true,
      "priority": 2,
      "cost_per_token": 0.0003,
      "model": "claude-3-sonnet-20240229"
    },
    "qwen": {
      "enabled": false,
      "priority": 3,
      "cost_per_token": 0.0001,
      "model": "Qwen2.5-Coder-7B-Instruct-AWQ"
    }
  },
  "features": {
    "caching": true,
    "cost_optimization": true,
    "performance_monitoring": true,
    "smart_routing": true,
    "mcp_integration": true,
    "compression": false,
    "summarization": false
  },
  "thresholds": {
    "cache_ttl": 3600,
    "max_cache_size": 10000,
    "cost_warning": 0.1,
    "max_context_tokens": 32000,
    "compression_threshold": 50000
  }
}
```

---

## Usage Examples

### 1. Simple Setup and Usage

```typescript
import { Claudette } from 'claudette';

async function main() {
  // Initialize with defaults
  const claudette = new Claudette();
  await claudette.initialize();
  
  // Basic request
  const result = await claudette.optimize(
    'Write a TypeScript function to validate email addresses'
  );
  
  console.log('Generated code:', result.content);
  console.log('Cost:', result.cost_eur, 'EUR');
  
  await claudette.cleanup();
}

main().catch(console.error);
```

### 2. Advanced Configuration

```typescript
import { Claudette, ClaudetteConfig } from 'claudette';

const config: ClaudetteConfig = {
  backends: {
    openai: {
      enabled: true,
      priority: 1,
      cost_per_token: 0.000015,
      model: 'gpt-4o-mini'
    },
    claude: {
      enabled: true,
      priority: 2,
      cost_per_token: 0.0003,
      model: 'claude-3-sonnet-20240229'
    },
    qwen: {
      enabled: true,
      priority: 3,
      cost_per_token: 0.0001,
      model: 'Qwen2.5-Coder-7B-Instruct-AWQ',
      backend_type: 'self_hosted',
      base_url: 'http://localhost:8000'
    }
  },
  features: {
    caching: true,
    cost_optimization: true,
    smart_routing: true,
    performance_monitoring: true,
    mcp_integration: true,
    compression: false,
    summarization: false
  },
  thresholds: {
    cache_ttl: 7200,        // 2 hours
    max_cache_size: 50000,  // Large cache
    cost_warning: 0.05,     // Lower warning threshold
    max_context_tokens: 64000,
    compression_threshold: 100000
  }
};

async function advancedUsage() {
  const claudette = new Claudette();
  
  // Apply configuration
  claudette.config = config;
  await claudette.initialize();
  
  // Cost-optimized request
  const result = await claudette.optimize(
    'Generate comprehensive API documentation for a REST service',
    ['./api-schema.json', './examples.md'],
    {
      max_tokens: 3000,
      temperature: 0.3
    }
  );
  
  console.log('Backend selected:', result.backend_used);
  console.log('Total cost:', result.cost_eur, 'EUR');
  console.log('Cache hit:', result.cache_hit);
}
```

### 3. RAG Integration

```typescript
import { Claudette, RAGManager, createDockerProvider } from 'claudette';

async function ragIntegration() {
  const claudette = new Claudette();
  const ragManager = new RAGManager();
  
  // Setup RAG provider
  await ragManager.registerProvider('docs', {
    deployment: 'local_docker',
    connection: {
      type: 'docker',
      containerName: 'chroma-docs',
      port: 8000
    },
    vectorDB: {
      provider: 'chroma',
      collection: 'documentation',
      similarity: 'cosine'
    }
  });
  
  await claudette.initialize();
  
  // Configure RAG
  const router = claudette.getRouter();
  router.setRAGManager(ragManager);
  
  // RAG-enhanced request
  const result = await claudette.optimize(
    'How do I implement rate limiting in my API?',
    [],
    {
      useRAG: true,
      ragQuery: 'rate limiting API middleware implementation patterns',
      contextStrategy: 'prepend',
      backend: 'claude'  // Use Claude for complex reasoning
    }
  );
  
  if (result.metadata?.ragUsed) {
    console.log('RAG context provided:', result.metadata.ragSources?.length);
  }
  
  await ragManager.cleanup();
  await claudette.cleanup();
}
```

### 4. Production Monitoring

```typescript
import { Claudette } from 'claudette';

async function productionMonitoring() {
  const claudette = new Claudette();
  await claudette.initialize();
  
  // Performance monitoring
  setInterval(async () => {
    const status = await claudette.getStatus();
    
    // Log key metrics
    console.log('System Status:', {
      healthy: status.healthy,
      cacheHitRate: status.cache.hit_rate,
      healthyBackends: status.backends.health.filter(b => b.healthy).length,
      totalRequests: status.cache.total_requests
    });
    
    // Alert on issues
    if (!status.healthy) {
      console.error('System unhealthy - investigate immediately');
      // Send alerts, trigger recovery, etc.
    }
    
    if (status.cache.hit_rate < 50) {
      console.warn('Low cache hit rate - check cache configuration');
    }
    
  }, 60000); // Every minute
  
  // Cost monitoring
  let totalCost = 0;
  const originalOptimize = claudette.optimize.bind(claudette);
  
  claudette.optimize = async (prompt, files, options) => {
    const result = await originalOptimize(prompt, files, options);
    totalCost += result.cost_eur;
    
    console.log(`Request cost: €${result.cost_eur.toFixed(6)}, Total: €${totalCost.toFixed(6)}`);
    
    if (totalCost > 1.0) { // €1 threshold
      console.warn('Daily cost threshold exceeded!');
    }
    
    return result;
  };
}
```

---

## Error Handling

### Error Types

Claudette defines specific error types for different failure scenarios:

```typescript
class ClaudetteError extends Error {
  constructor(
    message: string,
    public code: string,
    public backend?: string,
    public retryable: boolean = false
  )
}

class BackendError extends ClaudetteError {
  // Backend-specific failures
}

class CacheError extends ClaudetteError {
  // Cache-related failures  
}

class DatabaseError extends ClaudetteError {
  // Database connectivity issues
}

class RAGError extends ClaudetteError {
  // RAG provider failures
}
```

### Error Handling Patterns

#### 1. Basic Error Handling

```typescript
try {
  const result = await claudette.optimize('Your prompt');
  console.log(result.content);
} catch (error) {
  if (error instanceof BackendError) {
    console.error(`Backend ${error.backend} failed: ${error.message}`);
    
    if (error.retryable) {
      // Implement retry logic
      console.log('Error is retryable, will retry...');
    }
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

#### 2. Graceful Degradation

```typescript
async function robustOptimize(prompt: string, options?: OptimizeOptions) {
  try {
    // Try with RAG enhancement
    return await claudette.optimize(prompt, [], {
      ...options,
      useRAG: true,
      ragQuery: extractKeywords(prompt)
    });
  } catch (error) {
    if (error instanceof RAGError) {
      console.warn('RAG failed, falling back to direct optimization');
      
      // Fallback to direct optimization
      return await claudette.optimize(prompt, [], {
        ...options,
        useRAG: false
      });
    }
    throw error;
  }
}
```

#### 3. Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private readonly threshold = 5;
  private readonly resetTime = 300000; // 5 minutes
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is open');
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private isOpen(): boolean {
    return this.failures >= this.threshold && 
           (Date.now() - this.lastFailure) < this.resetTime;
  }
  
  private onSuccess(): void {
    this.failures = 0;
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
  }
}

// Usage
const breaker = new CircuitBreaker();

async function protectedOptimize(prompt: string) {
  return breaker.execute(() => claudette.optimize(prompt));
}
```

---

## Performance Considerations

### 1. Cache Optimization

```typescript
// Configure cache for optimal performance
const config = {
  thresholds: {
    cache_ttl: 7200,        // 2 hours for stable content
    max_cache_size: 50000,  // Large cache for high-traffic apps
  }
};

// Use cache-friendly patterns
const result = await claudette.optimize(
  'Standardized prompt template',  // Consistent prompts cache better
  [],
  {
    temperature: 0.3,  // Lower temperature = more consistent = better caching
    max_tokens: 1000   // Consistent parameters improve cache hits
  }
);
```

### 2. Backend Selection Optimization

```typescript
// Let router optimize automatically
const result = await claudette.optimize(
  'Simple text completion task',
  [],
  {
    max_tokens: 500,     // Small tasks can use cheaper backends
    temperature: 0.7
  }
);

// Force expensive backend only when needed
const complexResult = await claudette.optimize(
  'Complex reasoning and analysis task',
  [],
  {
    backend: 'claude',   // Force high-quality backend
    max_tokens: 3000,
    temperature: 0.3
  }
);
```

### 3. Memory Management

```typescript
// Cleanup for long-running applications
async function longRunningApp() {
  const claudette = new Claudette();
  await claudette.initialize();
  
  // Periodic cleanup
  setInterval(async () => {
    const status = await claudette.getStatus();
    
    if (status.cache.size_mb > 100) { // If cache > 100MB
      console.log('Clearing cache to free memory');
      await claudette.clearCache();
    }
  }, 3600000); // Every hour
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await claudette.cleanup();
    process.exit(0);
  });
}
```

### 4. Concurrent Request Handling

```typescript
// Handle multiple requests efficiently
async function batchProcessing(prompts: string[]) {
  const claudette = new Claudette();
  await claudette.initialize();
  
  // Process in parallel (up to backend limits)
  const results = await Promise.all(
    prompts.map(prompt => 
      claudette.optimize(prompt, [], { max_tokens: 500 })
    )
  );
  
  return results;
}

// Rate limiting for API protection
const rateLimiter = new Map<string, number>();

async function rateLimitedOptimize(prompt: string, userId: string) {
  const now = Date.now();
  const lastRequest = rateLimiter.get(userId) || 0;
  
  if (now - lastRequest < 1000) { // 1 request per second per user
    throw new Error('Rate limit exceeded');
  }
  
  rateLimiter.set(userId, now);
  return claudette.optimize(prompt);
}
```

---

*This documentation covers the complete Claudette Core API. For advanced topics like RAG integration, backend development, and deployment patterns, see the related documentation sections.*