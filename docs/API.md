# Claudette API Documentation 📚

> **Complete API reference for Claudette v1.0.5**
> 
> Enterprise AI middleware platform with intelligent routing, cost optimization, and monitoring capabilities.

![API Version](https://img.shields.io/badge/API-v1.0.5-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue)
![Stability](https://img.shields.io/badge/stability-stable-brightgreen)

## Table of Contents

- [Quick Start](#quick-start)
- [Core API](#core-api)
- [Configuration](#configuration)
- [Backend Management](#backend-management)
- [RAG Integration](#rag-integration)
- [Monitoring & Analytics](#monitoring--analytics)
- [Error Handling](#error-handling)
- [TypeScript Types](#typescript-types)
- [CLI Commands](#cli-commands)
- [Examples](#examples)

---

## 🚀 Quick Start

### Installation

```bash
# NPM Installation
npm install -g claudette

# Initialize configuration
claudette init
```

### Basic Usage

```typescript
import { Claudette } from 'claudette';

// Initialize Claudette
const claudette = new Claudette();
await claudette.initialize();

// Make an optimized request
const response = await claudette.optimize(
  "Explain quantum computing in simple terms",
  [], // files (optional)
  { 
    backend: "claude",
    max_tokens: 500,
    temperature: 0.7 
  }
);

console.log(response.content);
console.log(`Cost: €${response.cost_eur}`);
console.log(`Backend: ${response.backend_used}`);
```

---

## 🎯 Core API

### `Claudette` Class

The main Claudette class provides the primary interface for AI middleware operations.

#### Constructor

```typescript
new Claudette(configPath?: string)
```

**Parameters:**
- `configPath` (optional): Path to configuration file

**Example:**
```typescript
// Use default configuration
const claudette = new Claudette();

// Use custom config file
const claudette = new Claudette('./config/custom-config.json');
```

#### `initialize()` 

Initializes the Claudette instance with backends and monitoring.

```typescript
async initialize(): Promise<void>
```

**Example:**
```typescript
await claudette.initialize();
// Claudette is now ready to process requests
```

#### `optimize()` 

Main optimization function for AI requests with intelligent routing.

```typescript
async optimize(
  prompt: string,
  files?: string[],
  options?: OptimizeOptions
): Promise<ClaudetteResponse>
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | `string` | ✅ | The prompt text to send to AI |
| `files` | `string[]` | ❌ | Array of file paths to include as context |
| `options` | `OptimizeOptions` | ❌ | Request configuration options |

**Options Interface:**
```typescript
interface OptimizeOptions {
  backend?: string;           // Specific backend to use
  max_tokens?: number;        // Maximum tokens in response
  temperature?: number;       // Randomness (0.0-2.0)
  model?: string;            // Specific model to use
  bypass_cache?: boolean;    // Skip cache lookup
  bypass_optimization?: boolean; // Use raw mode
  timeout?: number;          // Request timeout in ms
}
```

**Returns:** [`ClaudetteResponse`](#claudetteresponse)

**Example:**
```typescript
const response = await claudette.optimize(
  "Write a Python function to calculate fibonacci numbers",
  ["./examples/math_utils.py"], // context files
  {
    backend: "claude",
    max_tokens: 1000,
    temperature: 0.3,
    timeout: 30000
  }
);
```

#### `getStatus()`

Get system status and health information.

```typescript
async getStatus(): Promise<SystemStatus>
```

**Returns:**
```typescript
interface SystemStatus {
  healthy: boolean;
  database: DatabaseHealth;
  cache: CacheStats;
  backends: BackendHealthInfo;
  version: string;
}
```

**Example:**
```typescript
const status = await claudette.getStatus();
console.log(`System Health: ${status.healthy ? 'Healthy' : 'Unhealthy'}`);
console.log(`Cache Hit Rate: ${status.cache.hit_rate}%`);
console.log(`Active Backends: ${status.backends.health.filter(b => b.healthy).length}`);
```

#### `cleanup()`

Clean up resources and connections.

```typescript
async cleanup(): Promise<void>
```

**Example:**
```typescript
// Graceful shutdown
await claudette.cleanup();
```

---

## ⚙️ Configuration

### Configuration File Structure

```typescript
interface ClaudetteConfig {
  backends: BackendConfig;
  features: FeatureConfig;
  thresholds: ThresholdConfig;
  database?: DatabaseConfig;
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
  enabled: boolean;           // Enable this backend
  priority: number;          // Priority (1-10, lower = higher priority)
  cost_per_token: number;    // Cost per token in EUR
  api_key?: string;          // API key (or use environment)
  base_url?: string;         // Custom base URL
  model?: string;            // Default model
  max_tokens?: number;       // Default max tokens
  temperature?: number;      // Default temperature
  backend_type?: 'cloud' | 'self_hosted';
}
```

**Example Configuration:**
```json
{
  "backends": {
    "claude": {
      "enabled": true,
      "priority": 1,
      "cost_per_token": 0.0003,
      "model": "claude-3-sonnet-20240229"
    },
    "openai": {
      "enabled": true,
      "priority": 2,
      "cost_per_token": 0.0001,
      "model": "gpt-4o-mini"
    },
    "qwen": {
      "enabled": true,
      "priority": 3,
      "cost_per_token": 0.0001,
      "base_url": "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    }
  },
  "features": {
    "caching": true,
    "cost_optimization": true,
    "performance_monitoring": true,
    "smart_routing": true,
    "compression": true,
    "summarization": true
  },
  "thresholds": {
    "cache_ttl": 3600,
    "max_cache_size": 10000,
    "cost_warning": 0.1,
    "max_context_tokens": 32000,
    "request_timeout": 60000
  }
}
```

### Environment Variables

```bash
# API Keys
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-openai-key
QWEN_API_KEY=your-qwen-key
MISTRAL_API_KEY=your-mistral-key

# Custom URLs
QWEN_BASE_URL=https://custom-qwen-endpoint.com
OLLAMA_API_URL=http://localhost:11434

# Feature Toggles
CLAUDETTE_RAW=1              # Disable optimization
CLAUDETTE_ALLOW_MOCK=1       # Allow mock backend in production
```

---

## 🔄 Backend Management

### Available Backends

| Backend | Provider | Type | Models |
|---------|----------|------|--------|
| `claude` | Anthropic | Cloud | claude-3-sonnet, claude-3-opus |
| `openai` | OpenAI | Cloud | gpt-4, gpt-4o-mini, gpt-3.5-turbo |
| `qwen` | Alibaba | Cloud | qwen-plus, qwen-max, qwen-turbo |
| `mistral` | Mistral AI | Cloud | mistral-medium, mistral-large |
| `ollama` | Local | Self-hosted | llama2, codellama, mistral |

### Backend Selection Algorithm

Claudette automatically selects the optimal backend based on:

1. **Availability** (40% weight) - Is the backend healthy?
2. **Cost** (30% weight) - Cost per token for the request
3. **Performance** (20% weight) - Average latency and reliability
4. **User Preference** (10% weight) - Explicit backend specification

### Manual Backend Selection

```typescript
// Force specific backend
const response = await claudette.optimize(
  "Your prompt here",
  [],
  { backend: "claude" }
);

// Fallback chain
const response = await claudette.optimize(
  "Your prompt here",
  [],
  { 
    backend: "claude",
    fallback: ["openai", "qwen"]
  }
);
```

### Backend Health Monitoring

```typescript
// Get backend health information
const status = await claudette.getStatus();
const backends = status.backends.health;

backends.forEach(backend => {
  console.log(`${backend.name}: ${backend.healthy ? 'Healthy' : 'Unhealthy'}`);
  console.log(`  Latency: ${backend.avg_latency}ms`);
  console.log(`  Success Rate: ${backend.success_rate}%`);
});
```

---

## 🧠 RAG Integration

### RAG Provider Types

Claudette supports multiple RAG providers:

| Provider | Type | Description |
|----------|------|-------------|
| `MCPRAGProvider` | Cloud/Local | Model Context Protocol integration |
| `DockerRAGProvider` | Local | Docker-based RAG containers |
| `VectorRAGProvider` | Cloud/Local | Vector database integration |

### RAG Configuration

```typescript
import { RAGManager, MCPRAGProvider } from 'claudette';

// Initialize RAG manager
const ragManager = new RAGManager();

// Add MCP provider
const mcpProvider = new MCPRAGProvider({
  serverPath: './mcp-server',
  config: {
    maxResults: 10,
    similarityThreshold: 0.8
  }
});

await ragManager.addProvider('mcp', mcpProvider);

// Use RAG in requests
const response = await claudette.optimize(
  "What are the latest trends in AI?",
  [],
  {
    rag: {
      provider: 'mcp',
      query: 'AI trends 2024',
      maxResults: 5
    }
  }
);
```

### RAG Query Options

```typescript
interface RAGOptions {
  provider: string;           // Which RAG provider to use
  query?: string;            // Custom query (defaults to prompt)
  maxResults?: number;       // Maximum results to retrieve
  similarityThreshold?: number; // Minimum similarity score
  contextSize?: number;      // Maximum context tokens
  includeMetadata?: boolean; // Include source metadata
}
```

---

## 📊 Monitoring & Analytics

### Performance Metrics

```typescript
// Get performance metrics
const metrics = await claudette.getPerformanceMetrics();

console.log(`Total Requests: ${metrics.totalRequests}`);
console.log(`Average Latency: ${metrics.averageLatency}ms`);
console.log(`Cost per Request: €${metrics.averageCost}`);
console.log(`Cache Hit Rate: ${metrics.cacheHitRate}%`);
```

### Cost Tracking

```typescript
// Get cost breakdown
const costs = await claudette.getCostAnalysis();

costs.byBackend.forEach(cost => {
  console.log(`${cost.backend}: €${cost.total} (${cost.requests} requests)`);
});

console.log(`Total Spend: €${costs.total}`);
console.log(`Projected Monthly: €${costs.projectedMonthly}`);
```

### Usage Analytics

```typescript
// Get usage analytics
const analytics = await claudette.getUsageAnalytics();

console.log(`Peak Usage: ${analytics.peakRequestsPerHour}/hour`);
console.log(`Most Used Backend: ${analytics.topBackend}`);
console.log(`Success Rate: ${analytics.successRate}%`);
```

---

## 🎯 Response Types

### `ClaudetteResponse`

The main response object returned by all API calls:

```typescript
interface ClaudetteResponse {
  content: string;              // AI-generated response
  backend_used: string;         // Which backend processed the request
  tokens_input: number;         // Input tokens consumed
  tokens_output: number;        // Output tokens generated
  cost_eur: number;            // Cost in EUR
  latency_ms: number;          // Request latency in milliseconds
  cache_hit: boolean;          // Whether response came from cache
  compression_ratio?: number;   // If compression was applied
  metadata?: Record<string, any>; // Additional metadata
  usage?: {                    // Detailed token usage
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
  };
  error?: string;              // Error message if request failed
}
```

### `SystemStatus`

System health and status information:

```typescript
interface SystemStatus {
  healthy: boolean;            // Overall system health
  database: DatabaseHealth;    // Database status
  cache: CacheStats;          // Cache performance
  backends: BackendHealthInfo; // Backend health
  version: string;            // Claudette version
}
```

### `BackendInfo`

Information about individual backends:

```typescript
interface BackendInfo {
  name: string;                        // Backend name
  type: 'cloud' | 'self_hosted';     // Backend type
  model: string;                      // Current model
  priority: number;                   // Priority (1-10)
  cost_per_token: number;            // Cost per token
  healthy: boolean;                  // Health status
  avg_latency?: number;              // Average latency
  success_rate?: number;             // Success rate percentage
  quality_tier?: 'excellent' | 'good' | 'fair' | 'poor';
}
```

---

## ❌ Error Handling

### Error Types

```typescript
// Custom error types
class ClaudetteError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

class BackendError extends ClaudetteError {
  constructor(message: string, public backend: string, public retryable: boolean) {
    super(message, 'BACKEND_ERROR');
  }
}

class SecurityError extends ClaudetteError {
  constructor(message: string) {
    super(message, 'SECURITY_ERROR');
  }
}
```

### Error Handling Patterns

```typescript
try {
  const response = await claudette.optimize(prompt);
  return response;
} catch (error) {
  if (error instanceof BackendError) {
    console.error(`Backend ${error.backend} failed:`, error.message);
    
    if (error.retryable) {
      // Retry with different backend
      return await claudette.optimize(prompt, [], { 
        backend: 'fallback' 
      });
    }
  } else if (error instanceof SecurityError) {
    console.error('Security error:', error.message);
    // Handle security errors
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

### Common Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `INIT_ERROR` | Initialization failed | Check configuration |
| `BACKEND_ERROR` | Backend request failed | Try different backend |
| `SECURITY_ERROR` | Security validation failed | Check input |
| `INVALID_INPUT` | Input validation failed | Correct input format |
| `REQUEST_TIMEOUT` | Request timed out | Increase timeout |
| `RATE_LIMIT` | Rate limit exceeded | Wait and retry |

---

## 🖥️ CLI Commands

### Core Commands

```bash
# Initialize Claudette
claudette init [--quick]

# Setup wizard
claudette setup [init|validate|credentials]

# Make a request
claudette "Your prompt here" [options]

# System information
claudette --version
claudette --help
claudette status
claudette status --http              # Start HTTP dashboard server

# Configuration
claudette config [show|edit|validate]
```

### Advanced Commands

```bash
# Backend management
claudette backends list
claudette backends test [backend-name]
claudette backends health

# Cache management
claudette cache stats
claudette cache clear
claudette cache cleanup

# Analytics
claudette analytics [costs|usage|performance]

# Testing
claudette test [unit|integration|performance]
```

### CLI Options

```bash
# Backend selection
claudette "prompt" --backend claude
claudette "prompt" --backend openai --model gpt-4

# Output options
claudette "prompt" --verbose          # Detailed output
claudette "prompt" --json            # JSON output
claudette "prompt" --quiet           # Minimal output

# Request options
claudette "prompt" --max-tokens 1000
claudette "prompt" --temperature 0.7
claudette "prompt" --timeout 30000

# Files and context
claudette "prompt" --file ./context.txt
claudette "prompt" --files file1.txt,file2.txt

# Cache options
claudette "prompt" --no-cache        # Bypass cache
claudette "prompt" --cache-key custom # Custom cache key
```

---

## 🔧 Advanced Features

### Streaming Responses

```typescript
// Stream responses for real-time output
const stream = await claudette.optimizeStream(
  "Write a long article about AI",
  [],
  { max_tokens: 2000 }
);

for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

### Batch Processing

```typescript
// Process multiple requests efficiently
const requests = [
  { prompt: "Explain quantum computing" },
  { prompt: "What is machine learning?" },
  { prompt: "Define artificial intelligence" }
];

const responses = await claudette.optimizeBatch(requests, {
  max_concurrent: 3,
  backend: "claude"
});
```

### Custom Hooks

```typescript
// Add custom hooks for monitoring
claudette.addHook('pre-request', async (context) => {
  console.log(`Processing request: ${context.prompt.substring(0, 50)}...`);
});

claudette.addHook('post-request', async (context, response) => {
  console.log(`Completed in ${response.latency_ms}ms with ${response.backend_used}`);
});
```

### Plugin System

```typescript
// Load plugins
import { YourCustomPlugin } from './plugins/your-plugin';

claudette.loadPlugin(new YourCustomPlugin({
  customOption: 'value'
}));
```

---

## 📝 Examples

### Basic Chat Application

```typescript
import { Claudette } from 'claudette';

class ChatBot {
  private claudette: Claudette;
  
  constructor() {
    this.claudette = new Claudette();
  }
  
  async initialize() {
    await this.claudette.initialize();
  }
  
  async chat(message: string, history: string[] = []): Promise<string> {
    const context = history.length > 0 ? 
      `Previous conversation:\n${history.join('\n')}\n\nUser: ` : 
      'User: ';
    
    const response = await this.claudette.optimize(
      context + message,
      [],
      {
        max_tokens: 500,
        temperature: 0.7
      }
    );
    
    return response.content;
  }
}

// Usage
const bot = new ChatBot();
await bot.initialize();

const response = await bot.chat("Hello, how are you?");
console.log(response);
```

### Cost-Optimized Content Generation

```typescript
async function generateContent(topic: string, length: 'short' | 'medium' | 'long') {
  const config = {
    short: { max_tokens: 200, backend: 'qwen' },      // Use cheaper backend
    medium: { max_tokens: 500, backend: 'openai' },   // Balanced option
    long: { max_tokens: 1500, backend: 'claude' }     // Premium for quality
  };
  
  const response = await claudette.optimize(
    `Write a ${length} article about ${topic}`,
    [],
    config[length]
  );
  
  console.log(`Generated ${response.tokens_output} tokens for €${response.cost_eur}`);
  return response.content;
}
```

### RAG-Enhanced Q&A System

```typescript
import { RAGManager, MCPRAGProvider } from 'claudette';

class QASystem {
  private claudette: Claudette;
  private ragManager: RAGManager;
  
  async initialize() {
    this.claudette = new Claudette();
    await this.claudette.initialize();
    
    this.ragManager = new RAGManager();
    const mcpProvider = new MCPRAGProvider({
      serverPath: './knowledge-base'
    });
    
    await this.ragManager.addProvider('kb', mcpProvider);
  }
  
  async answer(question: string): Promise<{
    answer: string;
    sources: string[];
    confidence: number;
  }> {
    // Get relevant context from RAG
    const ragResults = await this.ragManager.query('kb', question);
    
    // Enhanced prompt with context
    const prompt = `
Context from knowledge base:
${ragResults.map(r => r.content).join('\n\n')}

Question: ${question}

Please provide a comprehensive answer based on the context above.
`;
    
    const response = await this.claudette.optimize(prompt, [], {
      backend: 'claude',
      max_tokens: 800
    });
    
    return {
      answer: response.content,
      sources: ragResults.map(r => r.source),
      confidence: ragResults[0]?.similarity || 0
    };
  }
}
```

### Multi-Backend Comparison

```typescript
async function compareBackends(prompt: string) {
  const backends = ['claude', 'openai', 'qwen'];
  const results = await Promise.all(
    backends.map(async backend => {
      const start = Date.now();
      const response = await claudette.optimize(prompt, [], { backend });
      
      return {
        backend,
        content: response.content,
        cost: response.cost_eur,
        latency: Date.now() - start,
        tokens: response.tokens_output
      };
    })
  );
  
  // Analyze results
  const cheapest = results.reduce((min, curr) => 
    curr.cost < min.cost ? curr : min
  );
  
  const fastest = results.reduce((min, curr) => 
    curr.latency < min.latency ? curr : min
  );
  
  console.log(`Cheapest: ${cheapest.backend} (€${cheapest.cost})`);
  console.log(`Fastest: ${fastest.backend} (${fastest.latency}ms)`);
  
  return results;
}
```

---

## 🔍 Debugging & Troubleshooting

### Debug Mode

```bash
# Enable debug logging
DEBUG=claudette:* claudette "your prompt"

# Specific debug categories
DEBUG=claudette:backend claudette "your prompt"
DEBUG=claudette:cache claudette "your prompt"
DEBUG=claudette:routing claudette "your prompt"
```

### Health Checks

```typescript
// Comprehensive health check
const health = await claudette.healthCheck();

if (!health.overall.healthy) {
  console.log('System issues detected:');
  
  // Check individual components
  if (!health.database.healthy) {
    console.log('Database issue:', health.database.error);
  }
  
  if (!health.cache.healthy) {
    console.log('Cache issue:', health.cache.error);
  }
  
  health.backends.forEach(backend => {
    if (!backend.healthy) {
      console.log(`${backend.name} issue:`, backend.error);
    }
  });
}
```

### Performance Analysis

```typescript
// Enable performance monitoring
const monitor = await claudette.startPerformanceMonitoring();

// Your operations here
await claudette.optimize("test prompt");

// Get performance report
const report = await monitor.getReport();
console.log('Performance Report:', report);
```

---

## 🚀 Migration Guide

### From v1.0.5 to v1.0.5

```typescript
// v1.0.5
const claudette = new Claudette();
const response = await claudette.optimize(prompt, files, {
  backend: 'claude',
  maxTokens: 500  // Old parameter name
});

// v1.0.5
const claudette = new Claudette();
await claudette.initialize(); // Now required
const response = await claudette.optimize(prompt, files, {
  backend: 'claude',
  max_tokens: 500  // Updated parameter name
});
```

### Breaking Changes

- `initialize()` is now required before using the instance
- Parameter names changed from camelCase to snake_case for consistency
- Enhanced error handling with specific error types
- Updated configuration schema

---

## 📚 SDK Integration

### Express.js Integration

```typescript
import express from 'express';
import { Claudette } from 'claudette';

const app = express();
const claudette = new Claudette();

app.use(express.json());

app.post('/api/chat', async (req, res) => {
  try {
    const { prompt, options } = req.body;
    const response = await claudette.optimize(prompt, [], options);
    
    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

await claudette.initialize();
app.listen(3000);
```

### Next.js API Route

```typescript
// pages/api/ai.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Claudette } from 'claudette';

let claudette: Claudette | null = null;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!claudette) {
    claudette = new Claudette();
    await claudette.initialize();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { prompt } = req.body;
    const response = await claudette.optimize(prompt);
    
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## 📋 Best Practices

### Configuration Management

```typescript
// Use environment-specific configs
const configPath = process.env.NODE_ENV === 'production' 
  ? './config/production.json'
  : './config/development.json';

const claudette = new Claudette(configPath);
```

### Error Handling

```typescript
// Implement proper error boundaries
async function safeOptimize(prompt: string, retries = 3): Promise<ClaudetteResponse> {
  for (let i = 0; i < retries; i++) {
    try {
      return await claudette.optimize(prompt);
    } catch (error) {
      if (error instanceof BackendError && error.retryable && i < retries - 1) {
        console.log(`Retry ${i + 1}/${retries} after error:`, error.message);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
}
```

### Resource Management

```typescript
// Proper cleanup in applications
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await claudette.cleanup();
  process.exit(0);
});
```

### Performance Optimization

```typescript
// Use caching strategically
const cacheKey = `user:${userId}:conversation:${conversationId}`;
const response = await claudette.optimize(prompt, [], {
  cache_key: cacheKey,
  max_tokens: 500
});

// Batch similar requests
const prompts = ['prompt1', 'prompt2', 'prompt3'];
const responses = await Promise.all(
  prompts.map(prompt => claudette.optimize(prompt, [], { backend: 'qwen' }))
);
```

---

## 🆘 Support & Community

### Getting Help

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and community support
- **Documentation**: This API reference and guides
- **Discord** (coming soon): Real-time community chat

### Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.

### License

Claudette is released under the MIT License. See [LICENSE](../LICENSE) for details.

---

*This API documentation is for Claudette v1.0.5. For older versions, see the [changelog](../CHANGELOG.md).*