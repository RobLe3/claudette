# Claudette API Documentation

> **API documentation for Claudette v1.0.1**
> 
> This documentation covers the current stable release and available functionality.

## Table of Contents

- [Core Classes](#core-classes)
- [Backend Interfaces](#backend-interfaces)
- [RAG System](#rag-system)
- [Router & Optimization](#router--optimization)
- [Configuration](#configuration)
- [Error Handling](#error-handling)
- [Type Definitions](#type-definitions)

---

## Core Classes

### Claudette

The main entry point for the Claudette AI middleware system.

```typescript
import { Claudette } from 'claudette';

const claudette = new Claudette(config?: ClaudetteConfig);
```

#### Constructor Options

```typescript
interface ClaudetteConfig {
  backends?: BackendConfig[];
  rag?: RAGConfig;
  cache?: CacheConfig;
  performance?: PerformanceConfig;
}
```

#### Methods

##### `optimize(prompt: string, files?: string[], options?: OptimizeOptions): Promise<ClaudetteResponse>`

Optimizes AI requests across multiple backends with intelligent routing.

**Parameters:**
- `prompt` - The main prompt text (required)
- `files` - Optional array of file paths to include in context
- `options` - Optional configuration for this request

**Options:**
- `backend?: string` - Specific backend to use
- `max_tokens?: number` - Maximum tokens to generate
- `temperature?: number` - Temperature (0-1)
- `model?: string` - Specific model to use
- `bypass_cache?: boolean` - Skip cache for this request
- `timeout?: number` - Request timeout in milliseconds

**Returns:** `Promise<ClaudetteResponse>` containing:
- `content: string` - AI response text
- `backend_used: string` - Backend that processed the request
- `cost_eur: number` - Cost in euros
- `tokens_input: number` - Input tokens used
- `tokens_output: number` - Output tokens generated
- `latency_ms: number` - Response time in milliseconds

**Example:**
```typescript
const response = await claudette.optimize(
  "Explain quantum computing",
  [], // No files
  {
    backend: "openai",
    max_tokens: 500,
    temperature: 0.7
  }
);

console.log(response.content); // AI response text
console.log(response.backend_used); // "openai"
console.log(response.cost_eur); // 0.0123
```

##### `getStatus(): Promise<StatusResponse>`

Returns current system status and health information.

**Returns:** Promise with system status including:
- `healthy: boolean` - Overall system health
- `version: string` - Current version
- `database: object` - Database health info
- `cache: object` - Cache statistics
- `backends: object` - Backend health and statistics

**Example:**
```typescript
const status = await claudette.getStatus();
console.log(`System Health: ${status.healthy}`);
console.log(`Version: ${status.version}`);
console.log(`Cache Hit Rate: ${status.cache.hit_rate}`);
```

##### `getConfig(): ClaudetteConfig`

Returns the current configuration object.

##### `getConfigValidationReport(): string`

Returns a detailed validation report of the current configuration.

---

## Backend Interfaces

### Backend (Base Interface)

All AI backends implement this interface for consistent interaction.

```typescript
interface Backend {
  name: string;
  isHealthy(): Promise<boolean>;
  getModels(): Promise<string[]>;
  complete(prompt: string, options: CompletionOptions): Promise<CompletionResult>;
  getCostEstimate(tokens: number, model?: string): number;
}
```

### OpenAI Backend

```typescript
import { OpenAIBackend } from 'claudette/backends';

const openai = new OpenAIBackend({
  apiKey: 'your-api-key',
  models: ['gpt-4o', 'gpt-4o-mini'],
  defaultModel: 'gpt-4o-mini'
});
```

**Supported Models:**
- `gpt-4o` - Latest GPT-4 Optimized
- `gpt-4o-mini` - Smaller, faster GPT-4
- `gpt-4-turbo` - Previous generation turbo
- `gpt-3.5-turbo` - Fast and cost-effective

### Claude Backend

```typescript
import { ClaudeBackend } from 'claudette/backends';

const claude = new ClaudeBackend({
  apiKey: 'your-api-key',
  models: ['claude-3-sonnet', 'claude-3-haiku'],
  defaultModel: 'claude-3-sonnet'
});
```

**Supported Models:**
- `claude-3-sonnet` - Balanced performance and speed
- `claude-3-haiku` - Fast responses
- `claude-3-opus` - Highest capability

### Qwen Backend

```typescript
import { QwenBackend } from 'claudette/backends';

const qwen = new QwenBackend({
  apiKey: 'your-api-key',
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  models: ['Qwen2.5-Coder-7B-Instruct-AWQ']
});
```

---

## RAG System

### RAGManager

Central coordinator for Retrieval-Augmented Generation functionality.

```typescript
import { RAGManager, createDockerProvider } from 'claudette/rag';

const ragManager = new RAGManager();
```

#### Methods

##### `registerProvider(name: string, config: RAGProviderConfig): Promise<void>`

Registers a new RAG provider.

**Example:**
```typescript
await ragManager.registerProvider('vector-db', {
  deployment: 'local_docker',
  connection: {
    type: 'docker',
    containerName: 'chroma-rag',
    port: 8000
  },
  vectorDB: {
    provider: 'chroma',
    collection: 'documentation'
  }
});
```

##### `query(query: string, options?: RAGQueryOptions): Promise<RAGResult>`

Retrieves relevant context for a query.

**Example:**
```typescript
const ragResult = await ragManager.query(
  "How to configure backends?",
  {
    maxResults: 5,
    minScore: 0.7,
    strategy: 'hybrid'
  }
);
```

### RAG Provider Types

#### Docker Provider

```typescript
interface DockerRAGConfig {
  deployment: 'local_docker';
  connection: {
    type: 'docker';
    containerName: string;
    port: number;
    protocol?: 'http' | 'https';
  };
  vectorDB: VectorDBConfig;
  graphDB?: GraphDBConfig;
}
```

#### MCP Provider

```typescript
interface MCPRAGConfig {
  deployment: 'mcp_plugin';
  connection: {
    type: 'mcp';
    pluginPath: string;
    args?: string[];
  };
  vectorDB: VectorDBConfig;
  hybrid?: boolean;
}
```

#### Remote Provider

```typescript
interface RemoteRAGConfig {
  deployment: 'remote_api';
  connection: {
    type: 'http';
    baseURL: string;
    apiKey?: string;
    headers?: Record<string, string>;
  };
  vectorDB: VectorDBConfig;
}
```

---

## Router & Optimization

### AdaptiveRouter

Intelligent routing system that selects optimal backends based on multiple factors.

```typescript
interface RouterWeights {
  cost: number;     // 0-1, importance of cost optimization
  latency: number;  // 0-1, importance of response speed
  quality: number;  // 0-1, importance of response quality
  context: number;  // 0-1, importance of context relevance (RAG)
}
```

#### Methods

##### `setWeights(weights: Partial<RouterWeights>): void`

Configure routing priorities.

##### `selectBackend(request: OptimizeOptions): Promise<Backend>`

Select optimal backend for a request.

##### `setRAGManager(ragManager: RAGManager): void`

Enable RAG-aware routing.

---

## Configuration

### Main Configuration

```typescript
interface ClaudetteConfig {
  // Backend configuration
  backends: {
    openai?: OpenAIConfig;
    claude?: ClaudeConfig;
    qwen?: QwenConfig;
    ollama?: OllamaConfig;
  };
  
  // RAG configuration
  rag?: {
    enabled: boolean;
    providers: Record<string, RAGProviderConfig>;
    defaultProvider?: string;
    fallbackChain?: string[];
  };
  
  // Caching configuration
  cache?: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
    strategy: 'lru' | 'fifo';
  };
  
  // Performance monitoring
  performance?: {
    enableMetrics: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    costTracking: boolean;
  };
  
  // Router configuration
  router?: {
    weights: RouterWeights;
    circuitBreaker: {
      enabled: boolean;
      failureThreshold: number;
      resetTimeout: number;
    };
  };
}
```

### Environment Variables

```bash
# API Keys
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-claude-key
QWEN_API_KEY=your-qwen-key

# RAG Configuration
CHROMA_URL=http://localhost:8000
PINECONE_API_KEY=your-pinecone-key
WEAVIATE_URL=http://localhost:8080

# Performance
CLAUDETTE_CACHE_TTL=3600
CLAUDETTE_LOG_LEVEL=info
CLAUDETTE_ENABLE_METRICS=true
```

---

## Error Handling

### Error Types

```typescript
class ClaudetteError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public context?: any
  )
}
```

#### Backend Errors

```typescript
class BackendError extends ClaudetteError {
  constructor(
    message: string,
    public backend: string,
    public originalError?: Error
  )
}
```

#### RAG Errors

```typescript
class RAGError extends ClaudetteError {
  constructor(
    message: string,
    public provider: string,
    public operation: 'query' | 'index' | 'connect'
  )
}
```

### Error Handling Patterns

```typescript
try {
  const result = await claudette.optimize(prompt, messages);
} catch (error) {
  if (error instanceof BackendError) {
    console.error(`Backend ${error.backend} failed:`, error.message);
    // Fallback to different backend
  } else if (error instanceof RAGError) {
    console.error(`RAG provider ${error.provider} failed:`, error.message);
    // Continue without RAG enhancement
  } else {
    console.error('Unexpected error:', error);
  }
}
```

---

## Type Definitions

### Core Types

```typescript
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
}

interface OptimizeOptions {
  backend?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  useRAG?: boolean;
  ragQuery?: string;
  ragProvider?: string;
  contextStrategy?: 'prepend' | 'append' | 'inject';
}

interface OptimizeResult {
  response: string;
  metadata: {
    selectedBackend: string;
    model: string;
    tokenUsage: {
      prompt: number;
      completion: number;
      total: number;
    };
    cost: {
      eur: number;
      usd: number;
    };
    ragUsed: boolean;
    ragContext?: string[];
  };
  performance: {
    latencyMs: number;
    cacheHit: boolean;
    ragLatencyMs?: number;
  };
}
```

### RAG Types

```typescript
interface RAGResult {
  contexts: string[];
  scores: number[];
  metadata: {
    provider: string;
    retrievalTimeMs: number;
    totalResults: number;
    strategy: string;
  };
}

interface VectorDBConfig {
  provider: 'chroma' | 'pinecone' | 'weaviate' | 'qdrant';
  collection: string;
  embedding?: {
    model: string;
    dimensions: number;
  };
}
```

---

## Performance Metrics

### Metrics Collection

```typescript
interface PerformanceMetrics {
  backend: {
    [backendName: string]: {
      requestCount: number;
      totalLatency: number;
      averageLatency: number;
      successRate: number;
      totalCost: number;
      lastUsed: Date;
    };
  };
  
  rag: {
    [providerName: string]: {
      queryCount: number;
      averageRetrievalTime: number;
      averageRelevanceScore: number;
      hitRate: number;
      lastUsed: Date;
    };
  };
  
  cache: {
    hitRate: number;
    totalRequests: number;
    cacheSize: number;
    evictionCount: number;
  };
}
```

### Accessing Metrics

```typescript
const metrics = await claudette.getMetrics();
console.log(`OpenAI average latency: ${metrics.backend.openai.averageLatency}ms`);
console.log(`Cache hit rate: ${metrics.cache.hitRate}%`);
```

---

## Advanced Usage

### Custom Backend Implementation

```typescript
import { Backend, CompletionOptions, CompletionResult } from 'claudette/backends';

class CustomBackend implements Backend {
  name = 'custom';
  
  async isHealthy(): Promise<boolean> {
    // Health check implementation
    return true;
  }
  
  async getModels(): Promise<string[]> {
    return ['custom-model-1', 'custom-model-2'];
  }
  
  async complete(prompt: string, options: CompletionOptions): Promise<CompletionResult> {
    // Custom completion logic
    return {
      text: 'Custom response',
      usage: { promptTokens: 10, completionTokens: 20 }
    };
  }
  
  getCostEstimate(tokens: number, model?: string): number {
    return tokens * 0.001; // $0.001 per token
  }
}

// Register custom backend
claudette.registerBackend(new CustomBackend());
```

### Custom RAG Provider

```typescript
import { RAGProvider, RAGQueryOptions, RAGResult } from 'claudette/rag';

class CustomRAGProvider implements RAGProvider {
  name = 'custom-rag';
  
  async query(query: string, options?: RAGQueryOptions): Promise<RAGResult> {
    // Custom retrieval logic
    return {
      contexts: ['Retrieved context 1', 'Retrieved context 2'],
      scores: [0.9, 0.8],
      metadata: {
        provider: this.name,
        retrievalTimeMs: 150,
        totalResults: 2,
        strategy: 'custom'
      }
    };
  }
  
  async isHealthy(): Promise<boolean> {
    return true;
  }
}

// Register custom RAG provider
await ragManager.registerProvider('custom', new CustomRAGProvider());
```

---

## Migration Guide

### Upgrading to v1.0.1

This is the first stable release of Claudette with full production capabilities.

#### New Configuration Options

```typescript
// Add RAG configuration to existing config
const config = {
  // ... existing backend config
  rag: {
    enabled: true,
    providers: {
      'default': {
        deployment: 'local_docker',
        connection: { /* ... */ },
        vectorDB: { /* ... */ }
      }
    }
  }
};
```

#### API Changes

This is the initial stable release with comprehensive API coverage.

---

## Development and Testing

### Running Tests

```bash
# Core functionality tests
npm test

# RAG integration tests
npm run test:rag

# All tests
npm run test:all

# Performance benchmarks
npm run test:performance
```

### Development Mode

```bash
# Watch mode compilation
npm run dev

# Type checking
npm run validate

# Build project
npm run build
```

---

*This documentation is automatically updated with each release. For the latest API changes, see the [CHANGELOG.md](../CHANGELOG.md).*