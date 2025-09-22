# Backend Architecture Documentation

> **Intelligent Backend Routing and Provider Management**
>
> Comprehensive guide to Claudette's backend architecture, including the router system, backend implementations, and plugin development.

## Table of Contents

- [Overview](#overview)
- [Backend Router System](#backend-router-system)
- [Backend Interface](#backend-interface)
- [Backend Implementations](#backend-implementations)
- [Circuit Breaker Pattern](#circuit-breaker-pattern)
- [Performance Optimization](#performance-optimization)
- [Plugin Development](#plugin-development)
- [Advanced Patterns](#advanced-patterns)

---

## Overview

Claudette's backend architecture provides intelligent routing across multiple AI providers with automatic fallback, cost optimization, and performance monitoring. The system is designed for reliability, extensibility, and optimal resource utilization.

### Key Components

```typescript
import {
  BackendRouter,       // Intelligent routing system
  BaseBackend,         // Backend interface
  Backend,            // Backend contract
  BackendSettings,    // Configuration interface
  BackendInfo,        // Backend metadata
  BackendScore,       // Routing algorithm
  BackendError       // Error handling
} from 'claudette';
```

### Architecture Principles

1. **Intelligent Routing**: Multi-factor scoring algorithm for optimal backend selection
2. **Circuit Breaker**: Automatic failure detection and recovery
3. **Cost Optimization**: Real-time cost analysis and routing decisions
4. **Performance Monitoring**: Latency tracking and health checks
5. **Graceful Degradation**: Fallback chains and error recovery

---

## Backend Router System

The `BackendRouter` class manages intelligent routing across all registered backends using a sophisticated scoring algorithm.

### Constructor

```typescript
class BackendRouter {
  constructor(options: RouterOptions = {
    cost_weight: 0.4,
    latency_weight: 0.4,
    availability_weight: 0.2,
    fallback_enabled: true
  })
}
```

**RouterOptions Interface:**
```typescript
interface RouterOptions {
  cost_weight: number;         // Weight for cost in scoring (0-1)
  latency_weight: number;      // Weight for latency in scoring (0-1)
  availability_weight: number; // Weight for availability in scoring (0-1)
  fallback_enabled: boolean;   // Enable automatic fallback
}
```

### Core Methods

#### registerBackend()

Register a backend with the router.

```typescript
registerBackend(backend: Backend): void
```

**Example:**
```typescript
import { BackendRouter, OpenAIBackend, ClaudeBackend } from 'claudette';

const router = new BackendRouter({
  cost_weight: 0.5,
  latency_weight: 0.3,
  availability_weight: 0.2
});

// Register backends
const openaiBackend = new OpenAIBackend({
  enabled: true,
  priority: 1,
  cost_per_token: 0.000015,
  model: 'gpt-4o-mini'
});

const claudeBackend = new ClaudeBackend({
  enabled: true,
  priority: 2,
  cost_per_token: 0.0003,
  model: 'claude-3-sonnet-20240229'
});

router.registerBackend(openaiBackend);
router.registerBackend(claudeBackend);
```

#### selectBackend()

Select the optimal backend for a request.

```typescript
async selectBackend(
  request: ClaudetteRequest, 
  excludeBackends: string[] = []
): Promise<Backend>
```

**Parameters:**
- `request` - The optimization request
- `excludeBackends` - Backends to exclude from selection

**Selection Algorithm:**
1. **Forced Selection**: If `request.backend` is specified, use it if available
2. **Health Filtering**: Remove unhealthy or circuit-broken backends
3. **Scoring**: Calculate weighted scores for remaining backends
4. **Selection**: Choose backend with lowest (best) score

**Scoring Formula:**
```typescript
score = (cost_score * cost_weight) + 
        (latency_score * latency_weight) + 
        (availability_score * availability_weight)
```

**Example:**
```typescript
const request: ClaudetteRequest = {
  prompt: 'Explain TypeScript interfaces',
  options: {
    max_tokens: 1000,
    temperature: 0.7
  }
};

const selectedBackend = await router.selectBackend(request);
console.log('Selected backend:', selectedBackend.name);
```

#### routeRequest()

Route request with automatic fallback handling.

```typescript
async routeRequest(request: ClaudetteRequest): Promise<ClaudetteResponse>
```

**Flow:**
1. Select optimal backend
2. Check circuit breaker status
3. Execute request
4. Handle failures with fallback
5. Record success/failure metrics

**Example:**
```typescript
try {
  const response = await router.routeRequest({
    prompt: 'Generate a REST API design',
    options: { max_tokens: 2000 }
  });
  
  console.log('Response from:', response.backend_used);
  console.log('Cost:', response.cost_eur, 'EUR');
  console.log('Latency:', response.latency_ms, 'ms');
  
} catch (error) {
  if (error instanceof BackendError) {
    console.error('All backends failed:', error.message);
  }
}
```

### Scoring System Details

#### Cost Scoring

```typescript
// Cost scoring implementation
private calculateCostScore(backend: Backend, estimatedTokens: number): number {
  const estimatedCost = backend.estimateCost(estimatedTokens);
  
  // Normalize cost to 0-1 scale (lower cost = lower score = better)
  const maxCost = 0.01; // €0.01 per request as reference
  return Math.min(estimatedCost / maxCost, 1.0);
}
```

#### Latency Scoring

```typescript
// Latency scoring implementation  
private async calculateLatencyScore(backend: Backend): Promise<number> {
  const avgLatency = await backend.getLatencyScore();
  
  // Normalize latency to 0-1 scale (lower latency = lower score = better)
  const maxLatency = 10.0; // 10 seconds as reference
  return Math.min(avgLatency / maxLatency, 1.0);
}
```

#### Availability Scoring

```typescript
// Availability scoring implementation
private calculateAvailabilityScore(backendName: string): number {
  const failures = this.failureCount.get(backendName) || 0;
  const lastFailureTime = this.lastFailure.get(backendName) || 0;
  const timeSinceFailure = Date.now() - lastFailureTime;
  
  // Base score from failure count
  let score = Math.min(failures / 10, 1.0);
  
  // Decay score over time since last failure
  if (timeSinceFailure > 60000) { // 1 minute
    score *= Math.max(0.1, 1 - (timeSinceFailure / 3600000)); // Decay over 1 hour
  }
  
  return score;
}
```

### Router Configuration Examples

#### Cost-Optimized Configuration
```typescript
const costOptimizedRouter = new BackendRouter({
  cost_weight: 0.7,        // Prioritize cost
  latency_weight: 0.2,     // Secondary consideration
  availability_weight: 0.1, // Minimal weight
  fallback_enabled: true
});
```

#### Performance-Optimized Configuration
```typescript
const performanceRouter = new BackendRouter({
  cost_weight: 0.1,        // Minimal cost consideration
  latency_weight: 0.7,     // Prioritize speed
  availability_weight: 0.2, // Important for reliability
  fallback_enabled: true
});
```

#### Balanced Configuration
```typescript
const balancedRouter = new BackendRouter({
  cost_weight: 0.4,        // Balanced cost consideration
  latency_weight: 0.4,     // Balanced performance
  availability_weight: 0.2, // Reliability baseline
  fallback_enabled: true
});
```

---

## Backend Interface

All backends must implement the `Backend` interface to ensure consistent behavior and interoperability.

### Backend Interface Definition

```typescript
interface Backend {
  readonly name: string;                           // Unique backend identifier
  
  // Health & Capability
  isAvailable(): Promise<boolean>;                 // Health check
  estimateCost(tokens: number): number;           // Cost estimation
  getLatencyScore(): Promise<number>;             // Latency metric
  
  // Core Functionality
  send(request: ClaudetteRequest): Promise<ClaudetteResponse>; // Main operation
  
  // Configuration & Metadata
  validateConfig(): Promise<boolean>;             // Validate configuration
  getInfo(): BackendInfo;                        // Get backend information
}
```

### BackendInfo Interface

```typescript
interface BackendInfo {
  name: string;              // Backend name
  type: 'cloud' | 'self_hosted'; // Deployment type
  model: string;             // Default model
  priority: number;          // Configuration priority
  cost_per_token: number;    // Cost per 1000 tokens
  healthy: boolean;          // Current health status
  avg_latency?: number;      // Average latency in ms
  current_timeout?: number;  // Current timeout setting
  success_rate?: number;     // Success rate percentage
}
```

### BaseBackend Abstract Class

The `BaseBackend` class provides common functionality for all backend implementations:

```typescript
abstract class BaseBackend implements Backend {
  public readonly name: string;
  protected config: BackendSettings;
  protected recentLatencies: number[] = [];
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number = 60000;
  private isHealthy: boolean = true;

  constructor(name: string, config: BackendSettings) {
    this.name = name;
    this.config = config;
  }

  // Abstract methods that must be implemented
  abstract send(request: ClaudetteRequest): Promise<ClaudetteResponse>;
  
  // Provided implementations
  async isAvailable(): Promise<boolean> { /* ... */ }
  estimateCost(tokens: number): number { /* ... */ }
  async getLatencyScore(): Promise<number> { /* ... */ }
  async validateConfig(): Promise<boolean> { /* ... */ }
  getInfo(): BackendInfo { /* ... */ }
  
  // Utility methods
  protected recordLatency(latencyMs: number): void { /* ... */ }
  protected createSuccessResponse(/* ... */): ClaudetteResponse { /* ... */ }
  protected createErrorResponse(/* ... */): never { /* ... */ }
  protected estimateTokens(text: string): number { /* ... */ }
}
```

### Backend Implementation Example

```typescript
import { BaseBackend } from 'claudette';
import { OpenAI } from 'openai';

class OpenAIBackend extends BaseBackend {
  private client: OpenAI;

  constructor(config: BackendSettings) {
    super('openai', config);
    this.client = new OpenAI({
      apiKey: config.api_key || process.env.OPENAI_API_KEY,
      baseURL: config.base_url
    });
  }

  async send(request: ClaudetteRequest): Promise<ClaudetteResponse> {
    const startTime = Date.now();
    
    try {
      const { prompt, maxTokens, temperature, model } = this.prepareRequest(request);
      
      const completion = await this.client.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: temperature
      });

      const latencyMs = Date.now() - startTime;
      const tokensInput = this.estimateTokens(prompt);
      const tokensOutput = completion.usage?.completion_tokens || 0;

      return this.createSuccessResponse(
        completion.choices[0]?.message?.content || '',
        tokensInput,
        tokensOutput,
        latencyMs,
        {
          model: completion.model,
          finish_reason: completion.choices[0]?.finish_reason
        }
      );

    } catch (error) {
      const latencyMs = Date.now() - startTime;
      this.createErrorResponse(error as Error, request, latencyMs);
    }
  }

  protected async healthCheck(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  async validateConfig(): Promise<boolean> {
    return !!(
      await super.validateConfig() &&
      (this.config.api_key || process.env.OPENAI_API_KEY)
    );
  }
}
```

---

## Backend Implementations

Claudette includes several built-in backend implementations with specific optimizations for each provider.

### OpenAI Backend

Optimized for OpenAI's API with comprehensive model support and error handling.

```typescript
import { OpenAIBackend } from 'claudette';

const openaiBackend = new OpenAIBackend({
  enabled: true,
  priority: 1,
  cost_per_token: 0.000015,  // GPT-4o-mini pricing
  model: 'gpt-4o-mini',
  max_tokens: 4000,
  temperature: 0.7,
  api_key: process.env.OPENAI_API_KEY // Optional if using env
});

// Supported models
const models = [
  'gpt-4o',
  'gpt-4o-mini', 
  'gpt-4-turbo',
  'gpt-4',
  'gpt-3.5-turbo'
];
```

### Claude Backend

Optimized for Anthropic's Claude with advanced reasoning capabilities.

```typescript
import { ClaudeBackend } from 'claudette';

const claudeBackend = new ClaudeBackend({
  enabled: true,
  priority: 2,
  cost_per_token: 0.0003,    // Claude-3-Sonnet pricing
  model: 'claude-3-sonnet-20240229',
  max_tokens: 4000,
  temperature: 0.7,
  api_key: process.env.ANTHROPIC_API_KEY
});

// Supported models
const claudeModels = [
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307'
];
```

### Qwen Backend

Specialized for code generation and technical tasks.

```typescript
import { QwenBackend } from 'claudette';

const qwenBackend = new QwenBackend({
  enabled: true,
  priority: 3,
  cost_per_token: 0.0001,    // Self-hosted or API pricing
  model: 'Qwen2.5-Coder-7B-Instruct-AWQ',
  backend_type: 'self_hosted',
  base_url: 'http://localhost:8000/v1',
  max_tokens: 8000,
  temperature: 0.3           // Lower for code generation
});

// Optimized for
const qwenUseCase = [
  'Code generation',
  'Code review',
  'Technical documentation',
  'Algorithm implementation',
  'Debugging assistance'
];
```

### Ollama Backend

For local model deployment with privacy and cost benefits.

```typescript
import { OllamaBackend } from 'claudette';

const ollamaBackend = new OllamaBackend({
  enabled: true,
  priority: 4,
  cost_per_token: 0,         // No cost for local deployment
  model: 'llama2:70b',
  backend_type: 'self_hosted',
  base_url: 'http://localhost:11434',
  max_tokens: 4000
});

// Popular Ollama models
const ollamaModels = [
  'llama2:7b',
  'llama2:13b', 
  'llama2:70b',
  'codellama:7b',
  'mistral:7b',
  'mixtral:8x7b'
];
```

---

## Circuit Breaker Pattern

Claudette implements a circuit breaker pattern to handle backend failures gracefully and prevent cascade failures.

### Circuit Breaker States

```typescript
enum CircuitBreakerState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Blocking requests
  HALF_OPEN = 'HALF_OPEN' // Testing recovery
}
```

### Implementation

```typescript
class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly threshold = 5;              // Failure threshold
  private readonly resetTimeout = 300000;     // 5 minutes
  private readonly retryTimeout = 60000;      // 1 minute

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    switch (this.state) {
      case CircuitBreakerState.CLOSED:
        return this.executeClosed(operation);
      
      case CircuitBreakerState.OPEN:
        return this.executeOpen(operation);
      
      case CircuitBreakerState.HALF_OPEN:
        return this.executeHalfOpen(operation);
    }
  }

  private async executeClosed<T>(operation: () => Promise<T>): Promise<T> {
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private async executeOpen<T>(operation: () => Promise<T>): Promise<T> {
    if (this.shouldAttemptReset()) {
      this.state = CircuitBreakerState.HALF_OPEN;
      return this.executeHalfOpen(operation);
    }
    
    throw new BackendError(
      'Circuit breaker is OPEN',
      'circuit_breaker',
      false
    );
  }

  private async executeHalfOpen<T>(operation: () => Promise<T>): Promise<T> {
    try {
      const result = await operation();
      this.onSuccess();
      this.state = CircuitBreakerState.CLOSED;
      return result;
    } catch (error) {
      this.onFailure();
      this.state = CircuitBreakerState.OPEN;
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = CircuitBreakerState.OPEN;
    }
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.resetTimeout;
  }

  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}
```

### Usage in Backend Router

```typescript
class BackendRouter {
  private circuitBreakers = new Map<string, CircuitBreaker>();

  async routeRequest(request: ClaudetteRequest): Promise<ClaudetteResponse> {
    const excludeBackends: string[] = [];
    let lastError: Error | null = null;

    // Try up to 3 different backends
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const backend = await this.selectBackend(request, excludeBackends);
        const breaker = this.getCircuitBreaker(backend.name);

        const response = await breaker.execute(() => backend.send(request));
        return response;

      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof BackendError && error.retryable) {
          excludeBackends.push(error.backend || 'unknown');
          continue;
        }
        
        break; // Non-retryable error
      }
    }

    throw lastError || new BackendError('All backends failed', 'router');
  }

  private getCircuitBreaker(backendName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(backendName)) {
      this.circuitBreakers.set(backendName, new CircuitBreaker());
    }
    return this.circuitBreakers.get(backendName)!;
  }
}
```

---

## Performance Optimization

### Latency Optimization

#### Connection Pooling

```typescript
class OptimizedBackend extends BaseBackend {
  private connectionPool: ConnectionPool;

  constructor(config: BackendSettings) {
    super('optimized', config);
    this.connectionPool = new ConnectionPool({
      maxConnections: 10,
      keepAlive: true,
      timeout: 30000
    });
  }

  async send(request: ClaudetteRequest): Promise<ClaudetteResponse> {
    const connection = await this.connectionPool.acquire();
    
    try {
      return await this.executeRequest(connection, request);
    } finally {
      this.connectionPool.release(connection);
    }
  }
}
```

#### Request Batching

```typescript
class BatchingBackend extends BaseBackend {
  private requestQueue: ClaudetteRequest[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;

  async send(request: ClaudetteRequest): Promise<ClaudetteResponse> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ 
        ...request, 
        resolve, 
        reject 
      });

      if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => {
          this.processBatch();
        }, 100); // 100ms batch window
      }
    });
  }

  private async processBatch(): Promise<void> {
    const batch = this.requestQueue.splice(0);
    this.batchTimeout = null;

    if (batch.length === 0) return;

    try {
      const responses = await this.executeBatch(batch);
      
      batch.forEach((request, index) => {
        request.resolve(responses[index]);
      });
    } catch (error) {
      batch.forEach(request => {
        request.reject(error);
      });
    }
  }
}
```

### Memory Optimization

#### Response Streaming

```typescript
class StreamingBackend extends BaseBackend {
  async sendStream(
    request: ClaudetteRequest,
    onChunk: (chunk: string) => void
  ): Promise<ClaudetteResponse> {
    
    const startTime = Date.now();
    let fullContent = '';

    const stream = await this.createStream(request);
    
    for await (const chunk of stream) {
      const content = this.extractContent(chunk);
      fullContent += content;
      onChunk(content);
    }

    const latencyMs = Date.now() - startTime;
    return this.createSuccessResponse(
      fullContent,
      this.estimateTokens(request.prompt),
      this.estimateTokens(fullContent),
      latencyMs
    );
  }
}
```

#### Memory Management

```typescript
class MemoryOptimizedBackend extends BaseBackend {
  private responseCache = new LRUCache<string, ClaudetteResponse>(1000);
  private memoryMonitor: MemoryMonitor;

  constructor(config: BackendSettings) {
    super('memory-optimized', config);
    this.memoryMonitor = new MemoryMonitor();
    
    // Periodic cleanup
    setInterval(() => {
      this.cleanupMemory();
    }, 60000); // Every minute
  }

  private cleanupMemory(): void {
    const memUsage = process.memoryUsage();
    
    if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB threshold
      this.responseCache.clear();
      
      if (global.gc) {
        global.gc();
      }
    }
  }

  async send(request: ClaudetteRequest): Promise<ClaudetteResponse> {
    // Check cache first
    const cacheKey = this.generateCacheKey(request);
    const cached = this.responseCache.get(cacheKey);
    
    if (cached) {
      return { ...cached, cache_hit: true };
    }

    // Execute request
    const response = await super.send(request);
    
    // Cache response
    this.responseCache.set(cacheKey, response);
    
    return response;
  }
}
```

---

## Plugin Development

### Creating Custom Backends

#### 1. Basic Backend Plugin

```typescript
// custom-backend.ts
import { BaseBackend, BackendSettings, ClaudetteRequest, ClaudetteResponse } from 'claudette';

export class CustomBackend extends BaseBackend {
  constructor(config: BackendSettings) {
    super('custom', config);
  }

  async send(request: ClaudetteRequest): Promise<ClaudetteResponse> {
    const startTime = Date.now();
    
    try {
      // Implement your custom logic here
      const response = await this.callCustomAPI(request);
      
      const latencyMs = Date.now() - startTime;
      return this.createSuccessResponse(
        response.content,
        response.tokensInput,
        response.tokensOutput,
        latencyMs
      );
      
    } catch (error) {
      this.createErrorResponse(error as Error, request, Date.now() - startTime);
    }
  }

  private async callCustomAPI(request: ClaudetteRequest): Promise<any> {
    // Your API implementation
    const response = await fetch(`${this.config.base_url}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.api_key}`
      },
      body: JSON.stringify({
        prompt: request.prompt,
        max_tokens: request.options?.max_tokens || 1000,
        temperature: request.options?.temperature || 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  protected async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.base_url}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
```

#### 2. Advanced Backend with Features

```typescript
import { BaseBackend } from 'claudette';

export class AdvancedCustomBackend extends BaseBackend {
  private rateLimiter: RateLimiter;
  private retryHandler: RetryHandler;

  constructor(config: BackendSettings & { 
    rateLimit?: number;
    retryConfig?: RetryConfig;
  }) {
    super('advanced-custom', config);
    
    this.rateLimiter = new RateLimiter(config.rateLimit || 10); // 10 requests/sec
    this.retryHandler = new RetryHandler(config.retryConfig);
  }

  async send(request: ClaudetteRequest): Promise<ClaudetteResponse> {
    // Rate limiting
    await this.rateLimiter.acquire();
    
    // Retry with exponential backoff
    return this.retryHandler.execute(async () => {
      return this.executeRequest(request);
    });
  }

  private async executeRequest(request: ClaudetteRequest): Promise<ClaudetteResponse> {
    const startTime = Date.now();
    
    // Add request preprocessing
    const processedRequest = await this.preprocessRequest(request);
    
    // Execute with monitoring
    const response = await this.monitoredAPICall(processedRequest);
    
    // Add response postprocessing
    const processedResponse = await this.postprocessResponse(response);
    
    const latencyMs = Date.now() - startTime;
    return this.createSuccessResponse(
      processedResponse.content,
      processedResponse.tokensInput,
      processedResponse.tokensOutput,
      latencyMs,
      {
        preprocessed: true,
        postprocessed: true
      }
    );
  }

  private async preprocessRequest(request: ClaudetteRequest): Promise<ClaudetteRequest> {
    // Add custom preprocessing logic
    return {
      ...request,
      prompt: this.optimizePrompt(request.prompt)
    };
  }

  private async postprocessResponse(response: any): Promise<any> {
    // Add custom postprocessing logic
    return {
      ...response,
      content: this.formatResponse(response.content)
    };
  }
}
```

#### 3. Plugin Registration

```typescript
// plugin-registry.ts
export class BackendPluginRegistry {
  private plugins = new Map<string, typeof BaseBackend>();

  register(name: string, backendClass: typeof BaseBackend): void {
    this.plugins.set(name, backendClass);
  }

  create(name: string, config: BackendSettings): BaseBackend {
    const BackendClass = this.plugins.get(name);
    if (!BackendClass) {
      throw new Error(`Backend plugin '${name}' not found`);
    }
    
    return new BackendClass(config);
  }

  list(): string[] {
    return Array.from(this.plugins.keys());
  }
}

// Usage
const registry = new BackendPluginRegistry();

// Register custom backends
registry.register('custom', CustomBackend);
registry.register('advanced-custom', AdvancedCustomBackend);

// Create and use
const customBackend = registry.create('custom', {
  enabled: true,
  priority: 1,
  cost_per_token: 0.0001,
  base_url: 'https://api.custom.com',
  api_key: 'your-key'
});

const router = new BackendRouter();
router.registerBackend(customBackend);
```

### Plugin Package Structure

```
my-claudette-plugin/
├── package.json
├── src/
│   ├── index.ts              # Main exports
│   ├── backends/
│   │   ├── custom-backend.ts # Backend implementation
│   │   └── index.ts         # Backend exports
│   ├── types/
│   │   └── index.ts         # Type definitions
│   └── utils/
│       └── helpers.ts       # Utility functions
├── tests/
│   ├── backend.test.ts      # Unit tests
│   └── integration.test.ts  # Integration tests
├── docs/
│   └── README.md           # Plugin documentation
└── examples/
    └── usage.ts            # Usage examples
```

#### Package.json Example

```json
{
  "name": "claudette-custom-backend",
  "version": "1.0.0",
  "description": "Custom backend plugin for Claudette",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "prepublishOnly": "npm run build"
  },
  "keywords": ["claudette", "ai", "backend", "plugin"],
  "peerDependencies": {
    "claudette": "^2.1.5"
  },
  "devDependencies": {
    "@types/node": "^18.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0"
  }
}
```

---

## Advanced Patterns

### 1. Load Balancing

```typescript
class LoadBalancingRouter extends BackendRouter {
  private requestCount = new Map<string, number>();

  async selectBackend(request: ClaudetteRequest, excludeBackends: string[] = []): Promise<Backend> {
    // Get healthy backends
    const healthyBackends = await this.getHealthyBackends(excludeBackends);
    
    if (healthyBackends.length === 0) {
      throw new BackendError('No healthy backends available', 'router');
    }

    // Use round-robin for load balancing
    const sortedByLoad = healthyBackends.sort((a, b) => {
      const aCount = this.requestCount.get(a.name) || 0;
      const bCount = this.requestCount.get(b.name) || 0;
      return aCount - bCount;
    });

    const selected = sortedByLoad[0];
    
    // Increment request count
    const currentCount = this.requestCount.get(selected.name) || 0;
    this.requestCount.set(selected.name, currentCount + 1);

    return selected;
  }
}
```

### 2. Multi-Region Routing

```typescript
class MultiRegionRouter extends BackendRouter {
  private regionBackends = new Map<string, Backend[]>();

  registerBackendInRegion(region: string, backend: Backend): void {
    if (!this.regionBackends.has(region)) {
      this.regionBackends.set(region, []);
    }
    this.regionBackends.get(region)!.push(backend);
    this.registerBackend(backend);
  }

  async selectBackendByRegion(
    request: ClaudetteRequest,
    preferredRegion?: string
  ): Promise<Backend> {
    
    // Try preferred region first
    if (preferredRegion && this.regionBackends.has(preferredRegion)) {
      const regionBackends = this.regionBackends.get(preferredRegion)!;
      const healthyRegionalBackends = await this.filterHealthy(regionBackends);
      
      if (healthyRegionalBackends.length > 0) {
        return this.selectOptimalFromList(request, healthyRegionalBackends);
      }
    }

    // Fallback to global selection
    return this.selectBackend(request);
  }
}

// Usage
const multiRegionRouter = new MultiRegionRouter();

// Register backends by region
multiRegionRouter.registerBackendInRegion('us-east-1', openaiUSEast);
multiRegionRouter.registerBackendInRegion('eu-west-1', openaiEUWest);
multiRegionRouter.registerBackendInRegion('ap-south-1', openaiAPSouth);

// Route with region preference
const backend = await multiRegionRouter.selectBackendByRegion(
  request,
  'us-east-1'
);
```

### 3. Adaptive Routing

```typescript
class AdaptiveRouter extends BackendRouter {
  private performanceHistory = new Map<string, PerformanceMetrics[]>();
  private adaptiveWeights: RouterOptions;

  constructor(initialWeights: RouterOptions) {
    super(initialWeights);
    this.adaptiveWeights = { ...initialWeights };
    
    // Periodically adapt weights based on performance
    setInterval(() => {
      this.adaptWeights();
    }, 300000); // Every 5 minutes
  }

  async routeRequest(request: ClaudetteRequest): Promise<ClaudetteResponse> {
    const startTime = Date.now();
    
    // Update weights before routing
    this.updateRouterWeights();
    
    const response = await super.routeRequest(request);
    
    // Record performance metrics
    this.recordPerformance(response.backend_used, {
      latency: response.latency_ms,
      cost: response.cost_eur,
      success: true,
      timestamp: startTime
    });

    return response;
  }

  private adaptWeights(): void {
    const avgLatency = this.calculateAverageLatency();
    const avgCost = this.calculateAverageCost();
    const failureRate = this.calculateFailureRate();

    // Adapt weights based on system performance
    if (avgLatency > 5000) { // High latency
      this.adaptiveWeights.latency_weight = Math.min(0.8, this.adaptiveWeights.latency_weight + 0.1);
      this.adaptiveWeights.cost_weight = Math.max(0.1, this.adaptiveWeights.cost_weight - 0.1);
    }

    if (avgCost > 0.01) { // High cost
      this.adaptiveWeights.cost_weight = Math.min(0.8, this.adaptiveWeights.cost_weight + 0.1);
      this.adaptiveWeights.latency_weight = Math.max(0.1, this.adaptiveWeights.latency_weight - 0.1);
    }

    if (failureRate > 0.1) { // High failure rate
      this.adaptiveWeights.availability_weight = Math.min(0.5, this.adaptiveWeights.availability_weight + 0.1);
    }

    this.updateOptions(this.adaptiveWeights);
  }
}
```

### 4. Intelligent Caching

```typescript
class IntelligentBackendCache {
  private cache = new Map<string, CacheEntry>();
  private accessPatterns = new Map<string, AccessPattern>();

  async getCachedResponse(
    request: ClaudetteRequest,
    backend: Backend
  ): Promise<ClaudetteResponse | null> {
    
    const key = this.generateCacheKey(request, backend);
    const entry = this.cache.get(key);

    if (!entry || this.isExpired(entry)) {
      return null;
    }

    // Update access pattern
    this.updateAccessPattern(key);

    return {
      ...entry.response,
      cache_hit: true
    };
  }

  async setCachedResponse(
    request: ClaudetteRequest,
    backend: Backend,
    response: ClaudetteResponse
  ): Promise<void> {
    
    const key = this.generateCacheKey(request, backend);
    const ttl = this.calculateAdaptiveTTL(request, response);

    this.cache.set(key, {
      response,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl,
      accessCount: 0
    });
  }

  private calculateAdaptiveTTL(
    request: ClaudetteRequest,
    response: ClaudetteResponse
  ): number {
    
    let baseTTL = 3600000; // 1 hour

    // Longer TTL for expensive responses
    if (response.cost_eur > 0.001) {
      baseTTL *= 2;
    }

    // Shorter TTL for time-sensitive content
    if (this.isTimeSensitive(request.prompt)) {
      baseTTL /= 2;
    }

    // Longer TTL for frequently accessed content
    const accessPattern = this.accessPatterns.get(
      this.generateCacheKey(request, { name: response.backend_used } as Backend)
    );
    
    if (accessPattern && accessPattern.frequency > 5) {
      baseTTL *= 1.5;
    }

    return baseTTL;
  }
}
```

---

*This comprehensive backend architecture documentation covers all aspects of Claudette's intelligent routing system. For specific implementation examples and advanced use cases, see the related documentation sections.*