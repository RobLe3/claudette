# Claudette API Documentation

> **Complete TypeScript API Reference for Claudette v2.1.5**
> 
> This documentation provides comprehensive API coverage for Claudette's intelligent AI middleware platform with RAG integration.

## 📚 Documentation Structure

### Core API Documentation
- **[Claudette Core](core/claudette-api.md)** - Main orchestrator class and optimize() function
- **[Types & Interfaces](core/types.md)** - Complete TypeScript type definitions
- **[Configuration](core/configuration.md)** - Configuration management and setup

### RAG System Documentation  
- **[RAG Manager](rag/rag-manager.md)** - Central RAG provider orchestration
- **[RAG Providers](rag/providers.md)** - MCP, Docker, and Remote provider implementations
- **[RAG Types](rag/types.md)** - RAG-specific interfaces and configurations

### Backend & Router Documentation
- **[Router System](router/adaptive-router.md)** - Intelligent backend selection and routing
- **[Backend Architecture](backends/backend-architecture.md)** - Backend interface and implementations
- **[Backend Plugins](backends/plugins.md)** - Creating custom backend providers

### Setup & Installation
- **[Setup Wizard](setup/setup-wizard.md)** - Interactive setup and configuration
- **[Installation Validator](setup/installation-validator.md)** - System validation and requirements

## 🚀 Quick Start

### Basic Usage

```typescript
import { Claudette, RAGManager, createDockerProvider } from 'claudette';

// Initialize Claudette
const claudette = new Claudette();
await claudette.initialize();

// Basic optimization request
const result = await claudette.optimize(
  'Explain TypeScript interfaces',
  [],
  { backend: 'openai', model: 'gpt-4o-mini' }
);

console.log(result.content);
```

### RAG-Enhanced Usage

```typescript
import { Claudette, RAGManager, createDockerProvider } from 'claudette';

// Create RAG-enhanced setup
const claudette = new Claudette();
const ragManager = new RAGManager();

// Register Docker RAG provider
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

// Configure Claudette with RAG
const router = claudette.getRouter();
router.setRAGManager(ragManager);

// RAG-enhanced request
const result = await claudette.optimize(
  'How do I implement authentication?',
  [],
  {
    useRAG: true,
    ragQuery: 'authentication patterns security best practices',
    contextStrategy: 'prepend'
  }
);
```

## 🔗 API Reference Categories

### Core Interfaces

| Interface | Description | Example Usage |
|-----------|-------------|---------------|
| `Claudette` | Main orchestrator class | `new Claudette(config)` |
| `ClaudetteRequest` | Request structure | `{ prompt, files, options }` |
| `ClaudetteResponse` | Response structure | `{ content, backend_used, cost_eur }` |
| `ClaudetteConfig` | Configuration schema | `{ backends, features, thresholds }` |

### RAG System Interfaces

| Interface | Description | Example Usage |
|-----------|-------------|---------------|
| `RAGManager` | Central RAG orchestration | `new RAGManager()` |
| `RAGProvider` | Provider interface | `implements RAGProvider` |
| `RAGRequest` | RAG query structure | `{ query, context, maxResults }` |
| `RAGResponse` | RAG result structure | `{ results, metadata }` |

### Backend System Interfaces

| Interface | Description | Example Usage |
|-----------|-------------|---------------|
| `Backend` | Backend interface | `implements Backend` |
| `BackendRouter` | Intelligent routing | `new BackendRouter(options)` |
| `BackendScore` | Scoring algorithm | `{ score, cost_score, latency_score }` |
| `BackendInfo` | Backend metadata | `{ name, type, model, priority }` |

## 📖 Usage Patterns

### 1. Simple Optimization
```typescript
// Minimal setup for basic use
const claudette = new Claudette();
const result = await claudette.optimize('Your prompt here');
```

### 2. Backend-Specific Routing
```typescript
// Route to specific backend
const result = await claudette.optimize(
  'Code generation task',
  [],
  { backend: 'qwen', model: 'Qwen2.5-Coder-7B-Instruct-AWQ' }
);
```

### 3. Cost-Optimized Routing
```typescript
// Let router select best backend based on cost/performance
const result = await claudette.optimize(
  'Analysis task',
  [],
  { max_tokens: 1000, temperature: 0.3 }
);
```

### 4. RAG-Enhanced Generation
```typescript
// Use RAG for context-aware responses
const result = await claudette.optimize(
  'Generate API documentation',
  [],
  {
    useRAG: true,
    ragQuery: 'API documentation patterns and examples',
    contextStrategy: 'inject'
  }
);
```

## 🧪 Testing & Validation

### API Testing Examples

```typescript
import { Claudette } from 'claudette';

describe('Claudette API', () => {
  let claudette: Claudette;

  beforeEach(async () => {
    claudette = new Claudette({
      backends: {
        openai: { enabled: true, priority: 1 },
        claude: { enabled: true, priority: 2 }
      }
    });
    await claudette.initialize();
  });

  it('should optimize requests successfully', async () => {
    const result = await claudette.optimize('Test prompt');
    
    expect(result.content).toBeTruthy();
    expect(result.backend_used).toBeDefined();
    expect(result.cost_eur).toBeGreaterThan(0);
    expect(result.latency_ms).toBeGreaterThan(0);
  });

  it('should handle RAG enhancement', async () => {
    const result = await claudette.optimize(
      'Explain TypeScript',
      [],
      { useRAG: true, ragQuery: 'TypeScript documentation' }
    );
    
    expect(result.metadata?.ragUsed).toBe(true);
  });
});
```

## 🔧 Configuration Examples

### Basic Configuration
```typescript
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
    }
  },
  features: {
    caching: true,
    cost_optimization: true,
    smart_routing: true,
    mcp_integration: true
  },
  thresholds: {
    cache_ttl: 3600,
    max_cache_size: 10000,
    cost_warning: 0.1
  }
};
```

### RAG Configuration
```typescript
const ragConfig: RAGConfig = {
  deployment: 'local_docker',
  connection: {
    type: 'docker',
    containerName: 'vector-db',
    port: 8000,
    healthCheck: '/health'
  },
  vectorDB: {
    provider: 'chroma',
    collection: 'knowledge-base',
    similarity: 'cosine'
  },
  hybrid: false
};
```

## 📊 Performance Metrics

### Key Performance Indicators

| Metric | Description | Target Value |
|--------|-------------|--------------|
| Cache Hit Rate | Percentage of cached responses | >70% |
| Backend Selection Time | Time to select optimal backend | <50ms |
| RAG Query Time | Time for context retrieval | <200ms |
| Total Request Latency | End-to-end response time | <3000ms |
| Cost Optimization Ratio | Cost savings vs direct usage | 5x-10x |

### Monitoring Examples

```typescript
// Get system status
const status = await claudette.getStatus();
console.log('Cache hit rate:', status.cache.hit_rate);
console.log('Backend health:', status.backends.health);

// Get detailed metrics
const metrics = await claudette.getMetrics();
console.log('Total requests:', metrics.totalRequests);
console.log('Average cost:', metrics.averageCost);
console.log('Performance:', metrics.performance);
```

## 🔗 Related Documentation

- **[Architecture Overview](../technical/ARCHITECTURE.md)** - System design and patterns
- **[Contributing Guide](../technical/CONTRIBUTING.md)** - Development workflow
- **[Setup Guide](../setup/getting-started.md)** - Installation and configuration
- **[Examples](../examples/)** - Practical usage examples
- **[Troubleshooting](../troubleshooting/)** - Common issues and solutions

## 📚 Advanced Topics

- **[Plugin Development](../development/plugins.md)** - Creating custom backends and RAG providers
- **[Performance Optimization](../development/performance.md)** - Tuning for production use
- **[Security](../security/)** - Security considerations and best practices
- **[Deployment](../deployment/)** - Production deployment patterns

---

*This API documentation is automatically generated from TypeScript source code and kept in sync with each release. For the most current information, see the generated documentation in the `/docs/api/generated/` directory.*