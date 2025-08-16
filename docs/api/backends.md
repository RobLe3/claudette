# Backend System API - Claudette v2.1.6

Comprehensive API documentation for Claudette's intelligent multi-backend routing system with adaptive optimization and enterprise-grade reliability.

## Overview

Claudette's backend system provides intelligent routing across multiple AI providers with:
- **Adaptive Backend Routing**: ML-enhanced selection with self-healing capabilities
- **Cost Optimization**: Real-time cost tracking and intelligent provider selection
- **Health Monitoring**: Circuit breaker patterns with automatic recovery
- **Performance Analytics**: Latency tracking and quality assessment
- **Secure Credential Management**: Platform-specific encrypted storage

## Supported Backends

### OpenAI Backend
```typescript
import { OpenAIBackend } from 'claudette';

const openaiBackend = new OpenAIBackend({
  api_key: 'your-api-key', // Or use credential storage
  model: 'gpt-4o-mini',
  base_url: 'https://api.openai.com/v1', // Optional
  cost_per_token: 0.0002 // EUR per 1K tokens
});
```

**Supported Models:**
- `gpt-4o` - Latest GPT-4 Omni model
- `gpt-4o-mini` - Cost-optimized GPT-4 variant
- `gpt-4-turbo` - High-performance GPT-4
- `gpt-4` - Standard GPT-4
- `gpt-3.5-turbo` - Cost-effective option

### Claude Backend (Anthropic)
```typescript
import { ClaudeBackend } from 'claudette';

const claudeBackend = new ClaudeBackend({
  api_key: 'your-claude-key',
  model: 'claude-3-sonnet-20240229',
  base_url: 'https://api.anthropic.com', // Optional
  cost_per_token: 0.003
});
```

**Supported Models:**
- `claude-3-opus-20240229` - Most capable model
- `claude-3-sonnet-20240229` - Balanced performance
- `claude-3-haiku-20240307` - Fast and cost-effective

### Adaptive Qwen Backend
```typescript
import { AdaptiveQwenBackend } from 'claudette';

const qwenBackend = new AdaptiveQwenBackend({
  api_key: 'your-qwen-key',
  base_url: 'https://tools.flexcon-ai.de',
  model: 'Qwen/Qwen2.5-Coder-7B-Instruct-AWQ',
  base_timeout_ms: 30000,
  max_timeout_ms: 120000,
  async_contribution_enabled: true
});
```

**Features:**
- **Adaptive Timeouts**: Dynamic timeout adjustment based on performance
- **Self-Hosted Optimization**: Optimized for self-hosted deployments
- **Async Contribution**: Extended timeout for pipeline processing
- **Health Monitoring**: Continuous availability checking

## Backend Router

### Intelligent Routing Engine
```typescript
import { AdaptiveRouter, Claudette } from 'claudette';

const claudette = new Claudette();
const router = claudette.getRouter();

// Configure routing preferences
router.setPreferences({
  costWeight: 0.4,      // 40% weight for cost optimization
  latencyWeight: 0.3,   // 30% weight for response speed
  qualityWeight: 0.2,   // 20% weight for response quality
  availabilityWeight: 0.1 // 10% weight for backend health
});

// Send optimized request
const response = await router.optimizeRequest({
  prompt: 'Explain machine learning concepts',
  maxTokens: 500,
  temperature: 0.7
});
```

### Enhanced ML Routing
```typescript
import { EnhancedAdaptiveRouter } from 'claudette';

const mlRouter = new EnhancedAdaptiveRouter({
  learningEnabled: true,
  predictionEnabled: true,
  optimizationTarget: 'balanced' // 'cost', 'speed', 'quality', 'balanced'
});

// The router learns from each request to improve future decisions
await mlRouter.processRequest(request);
```

## Backend Configuration

### Credential Management
```typescript
import { getCredentialManager } from 'claudette';

const credManager = getCredentialManager();

// Store credentials securely
await credManager.store('openai-api-key', 'your-key');
await credManager.store('claude-api-key', 'your-claude-key');

// Retrieve credentials
const openaiKey = await credManager.retrieve('openai-api-key');
```

### Backend Settings Interface
```typescript
interface BackendSettings {
  api_key: string;
  model?: string;
  base_url?: string;
  cost_per_token?: number;
  timeout_ms?: number;
  max_retries?: number;
  enable_streaming?: boolean;
}

interface AdaptiveBackendSettings extends BackendSettings {
  base_timeout_ms?: number;
  max_timeout_ms?: number;
  timeout_multiplier?: number;
  health_check_interval_ms?: number;
  consecutive_failures_threshold?: number;
  async_contribution_enabled?: boolean;
  latency_adaptation_enabled?: boolean;
}
```

## Health Monitoring

### Circuit Breaker Pattern
```typescript
// Automatic health monitoring with circuit breaker
const backend = new OpenAIBackend(config);

// Check backend health
const isHealthy = await backend.isHealthy();

// Get detailed health status
const healthStatus = await backend.getHealthStatus();
console.log(healthStatus);
// {
//   healthy: true,
//   consecutiveFailures: 0,
//   lastSuccessfulRequest: '2025-08-16T10:30:00Z',
//   circuitBreakerState: 'closed'
// }
```

### Performance Metrics
```typescript
// Get performance analytics
const metrics = backend.getPerformanceMetrics();
console.log(metrics);
// {
//   avgLatency: 1250,
//   maxLatency: 3000,
//   minLatency: 500,
//   successRate: 0.98,
//   totalRequests: 150,
//   costEfficiency: 0.85
// }
```

## Advanced Features

### Streaming Support
```typescript
// Enable streaming for real-time responses
const stream = await backend.sendStream({
  prompt: 'Write a long article about AI',
  maxTokens: 2000,
  temperature: 0.7
});

for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

### Batch Processing
```typescript
// Process multiple requests efficiently
const requests = [
  { prompt: 'Summarize this text...', maxTokens: 200 },
  { prompt: 'Translate to Spanish...', maxTokens: 300 },
  { prompt: 'Generate code for...', maxTokens: 500 }
];

const responses = await router.processBatch(requests);
```

### Cost Analysis
```typescript
// Get detailed cost breakdown
const costAnalysis = await router.analyzeCosts({
  timeframe: '24h',
  groupBy: 'backend',
  includeProjections: true
});

console.log(costAnalysis);
// {
//   totalCost: 2.45, // EUR
//   breakdown: {
//     openai: { cost: 1.20, requests: 45, tokens: 125000 },
//     claude: { cost: 0.95, requests: 23, tokens: 58000 },
//     qwen: { cost: 0.30, requests: 67, tokens: 180000 }
//   },
//   projectedMonthlyCost: 73.50
// }
```

## Error Handling

### Backend Errors
```typescript
import { BackendError, RateLimitError, TimeoutError } from 'claudette';

try {
  const response = await backend.send(request);
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log('Rate limited, retrying in', error.retryAfter, 'seconds');
  } else if (error instanceof TimeoutError) {
    console.log('Request timed out, switching to faster backend');
  } else if (error instanceof BackendError) {
    console.log('Backend error:', error.message);
  }
}
```

### Automatic Failover
```typescript
// Configure automatic failover chain
router.setFailoverChain(['openai', 'claude', 'qwen']);

// If OpenAI fails, automatically try Claude, then Qwen
const response = await router.optimizeWithFailover(request);
```

## API Reference

### BaseBackend Class
Base class for all backend implementations.

#### Methods
- `send(request: ClaudetteRequest): Promise<ClaudetteResponse>`
- `healthCheck(): Promise<boolean>`
- `getAvailableModels(): string[]`
- `estimateCost(tokens: number): number`
- `validateConfig(): Promise<boolean>`

### AdaptiveRouter Class
Intelligent routing engine with ML capabilities.

#### Methods
- `optimizeRequest(request: ClaudetteRequest): Promise<ClaudetteResponse>`
- `setPreferences(preferences: RoutingPreferences): void`
- `getPerformanceMetrics(): PerformanceMetrics`
- `analyzeCosts(options: CostAnalysisOptions): Promise<CostAnalysis>`

## Best Practices

### 1. Credential Security
```typescript
// ✅ Good: Use credential manager
const credManager = getCredentialManager();
await credManager.store('api-key', key);

// ❌ Bad: Hardcode credentials
const backend = new OpenAIBackend({ api_key: 'sk-...' });
```

### 2. Error Handling
```typescript
// ✅ Good: Comprehensive error handling
try {
  const response = await router.optimizeRequest(request);
  return response;
} catch (error) {
  logger.error('Request failed', { error, request });
  throw error;
}
```

### 3. Performance Monitoring
```typescript
// ✅ Good: Monitor performance
const startTime = Date.now();
const response = await backend.send(request);
const latency = Date.now() - startTime;
metrics.recordLatency(latency);
```

## Integration Examples

### Express.js Integration
```typescript
import express from 'express';
import { Claudette } from 'claudette';

const app = express();
const claudette = new Claudette();

app.post('/api/chat', async (req, res) => {
  try {
    const response = await claudette.optimize(req.body.message);
    res.json({ response: response.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Next.js API Route
```typescript
import { Claudette } from 'claudette';

const claudette = new Claudette();

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const response = await claudette.optimize(req.body.prompt);
      res.status(200).json({ result: response.content });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
```

---

For more information, see:
- [Core API Reference](core/claudette-api.md)
- [RAG System Integration](rag/rag-system.md)
- [Backend Architecture Guide](backends/backend-architecture.md)