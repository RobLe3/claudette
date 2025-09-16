# RAG System API Documentation

> **Retrieval-Augmented Generation (RAG) System for Claudette**
>
> Comprehensive documentation for Claudette's RAG capabilities, including provider management, context integration, and deployment scenarios.

## Table of Contents

- [Overview](#overview)
- [RAG Manager](#rag-manager)
- [RAG Providers](#rag-providers)
- [Deployment Scenarios](#deployment-scenarios)
- [Context Integration](#context-integration)
- [Usage Examples](#usage-examples)
- [Advanced Patterns](#advanced-patterns)
- [Troubleshooting](#troubleshooting)

---

## Overview

Claudette's RAG system provides intelligent context retrieval and integration capabilities to enhance AI responses with relevant information from knowledge bases, documentation, and data sources.

### Key Features

- **Multi-Provider Support**: MCP plugins, Docker containers, remote APIs
- **Vector Database Integration**: Chroma, Pinecone, Weaviate, Qdrant
- **Graph Database Support**: LightRAG, Neo4j for relationship-aware retrieval
- **Hybrid Search**: Combine vector similarity with graph relationships
- **Fallback Chains**: Robust error recovery across providers
- **Context Strategies**: Flexible context integration methods

### Architecture Components

```typescript
import {
  RAGManager,           // Central orchestration
  BaseRAGProvider,      // Provider interface
  MCPRAGProvider,       // MCP plugin provider
  DockerRAGProvider,    // Docker container provider
  createMCPProvider,    // MCP factory function
  createDockerProvider, // Docker factory function
  createRemoteProvider, // Remote API factory function
  RAGConfig,            // Configuration interfaces
  RAGRequest,           // Request structure
  RAGResponse,          // Response structure
  RAGError              // Error handling
} from 'claudette/rag';
```

---

## RAG Manager

The `RAGManager` class provides central orchestration for all RAG providers, handling registration, fallback chains, and intelligent routing.

### Constructor

```typescript
class RAGManager {
  constructor()
}
```

Creates a new RAG manager instance with no providers registered.

**Example:**
```typescript
import { RAGManager } from 'claudette';

const ragManager = new RAGManager();
```

### Core Methods

#### registerProvider()

Register a new RAG provider with the manager.

```typescript
async registerProvider(name: string, config: RAGConfig): Promise<void>
```

**Parameters:**
- `name` (string): Unique identifier for the provider
- `config` (RAGConfig): Provider configuration

**RAGConfig Interface:**
```typescript
interface RAGConfig {
  deployment: 'mcp' | 'local_docker' | 'remote_docker';
  connection: MCPConnection | DockerConnection | RemoteConnection;
  vectorDB?: VectorDBConfig;
  graphDB?: GraphDBConfig;
  hybrid?: boolean;
}
```

**Examples:**

##### MCP Provider Registration
```typescript
await ragManager.registerProvider('mcp-docs', {
  deployment: 'mcp',
  connection: {
    type: 'mcp',
    pluginPath: './plugins/docs-mcp-server.js',
    serverPort: 8001,
    timeout: 30000
  },
  vectorDB: {
    provider: 'weaviate',
    collection: 'documentation',
    similarity: 'cosine'
  },
  hybrid: true
});
```

##### Docker Provider Registration
```typescript
await ragManager.registerProvider('vector-db', {
  deployment: 'local_docker',
  connection: {
    type: 'docker',
    containerName: 'chroma-rag',
    port: 8000,
    host: 'localhost',
    healthCheck: '/api/v1/heartbeat'
  },
  vectorDB: {
    provider: 'chroma',
    collection: 'knowledge-base',
    dimensions: 1536,
    similarity: 'cosine'
  }
});
```

##### Remote Provider Registration
```typescript
await ragManager.registerProvider('pinecone-prod', {
  deployment: 'remote_docker',
  connection: {
    type: 'remote',
    baseURL: 'https://api.pinecone.io',
    apiKey: process.env.PINECONE_API_KEY,
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 10000
  },
  vectorDB: {
    provider: 'pinecone',
    collection: 'production-docs',
    dimensions: 1536
  }
});
```

#### query()

Perform a RAG query using the specified or default provider.

```typescript
async query(request: RAGRequest, providerName?: string): Promise<RAGResponse>
```

**RAGRequest Interface:**
```typescript
interface RAGRequest {
  query: string;              // Search query
  context?: string;           // Additional context
  maxResults?: number;        // Maximum results to return
  threshold?: number;         // Similarity threshold (0-1)
  metadata?: Record<string, any>; // Additional metadata
}
```

**RAGResponse Interface:**
```typescript
interface RAGResponse {
  results: RAGResult[];       // Retrieved results
  metadata: {
    totalResults: number;     // Total matches found
    processingTime: number;   // Query time in ms
    source: 'vector' | 'graph' | 'hybrid'; // Search type
    queryId: string;          // Unique query identifier
  };
}

interface RAGResult {
  content: string;            // Retrieved content
  score: number;              // Relevance score (0-1)
  source: string;             // Source identifier
  metadata?: Record<string, any>; // Additional metadata
  relationships?: GraphRelationship[]; // Graph relationships
}
```

**Examples:**

##### Basic Query
```typescript
const response = await ragManager.query({
  query: 'authentication middleware patterns',
  maxResults: 5,
  threshold: 0.7
});

console.log(`Found ${response.results.length} relevant documents:`);
response.results.forEach((result, index) => {
  console.log(`${index + 1}. [${result.score.toFixed(2)}] ${result.content.substring(0, 100)}...`);
});
```

##### Provider-Specific Query
```typescript
const response = await ragManager.query({
  query: 'TypeScript interface design patterns',
  context: 'Looking for advanced patterns for large applications',
  maxResults: 3,
  threshold: 0.8
}, 'mcp-docs'); // Use specific provider

if (response.metadata.source === 'hybrid') {
  console.log('Used hybrid vector + graph search');
}
```

#### setFallbackChain()

Configure fallback chain for provider failures.

```typescript
setFallbackChain(chain: string[]): void
```

**Parameters:**
- `chain` (string[]): Array of provider names in fallback order

**Example:**
```typescript
// Configure fallback: primary -> backup -> emergency
ragManager.setFallbackChain([
  'pinecone-prod',    // Primary (fastest, most reliable)
  'vector-db',        // Backup (local Docker)
  'mcp-docs'          // Emergency (MCP plugin)
]);

// Now queries will automatically fallback on failures
const response = await ragManager.query({
  query: 'error handling patterns'
});
```

#### enhanceWithRAG()

Enhanced Claudette request integration with RAG.

```typescript
async enhanceWithRAG(request: ClaudetteRAGRequest): Promise<ClaudetteRAGResponse>
```

**ClaudetteRAGRequest Interface:**
```typescript
interface ClaudetteRAGRequest {
  prompt: string;             // Original prompt
  ragConfig?: RAGConfig;      // RAG configuration
  useRAG?: boolean;           // Enable RAG enhancement
  ragQuery?: string;          // RAG-specific query
  enhanceWithGraph?: boolean; // Use graph relationships
  contextStrategy?: 'prepend' | 'append' | 'inject'; // Context integration
}
```

**Example:**
```typescript
const enhanced = await ragManager.enhanceWithRAG({
  prompt: 'How do I implement user authentication in Express.js?',
  useRAG: true,
  ragQuery: 'Express.js authentication middleware JWT passport session',
  contextStrategy: 'prepend'
});

console.log('Enhanced prompt:', enhanced.content);
console.log('RAG context used:', enhanced.ragMetadata?.contextUsed);
console.log('Sources:', enhanced.ragContext?.map(r => r.source));
```

#### Health and Status Methods

```typescript
// Get status of all providers
getProvidersStatus(): Record<string, any>

// Get list of available providers  
getAvailableProviders(): string[]

// Health check all providers
async healthCheckAll(): Promise<Record<string, boolean>>

// Cleanup all providers
async cleanup(): Promise<void>
```

---

## RAG Providers

### BaseRAGProvider Interface

All RAG providers implement the `BaseRAGProvider` interface:

```typescript
abstract class BaseRAGProvider {
  abstract name: string;
  abstract query(request: RAGRequest): Promise<RAGResponse>;
  abstract healthCheck(): Promise<boolean>;
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract getStatus(): ProviderStatus;
  abstract ensureHealthy(): Promise<void>;
}
```

### MCP RAG Provider

The `MCPRAGProvider` integrates with Model Context Protocol plugins for local, privacy-focused RAG.

```typescript
class MCPRAGProvider extends BaseRAGProvider {
  constructor(config: RAGConfig & { deployment: 'mcp' })
}
```

**Configuration:**
```typescript
interface MCPConnection {
  type: 'mcp';
  pluginPath: string;    // Path to MCP plugin
  serverPort?: number;   // Plugin server port
  timeout?: number;      // Connection timeout
}
```

**Example:**
```typescript
import { MCPRAGProvider } from 'claudette';

const mcpConfig = {
  deployment: 'mcp' as const,
  connection: {
    type: 'mcp' as const,
    pluginPath: './plugins/knowledge-base-mcp.js',
    serverPort: 8002,
    timeout: 15000
  },
  vectorDB: {
    provider: 'weaviate',
    collection: 'company-docs',
    similarity: 'cosine'
  },
  graphDB: {
    provider: 'lightrag',
    database: 'knowledge-graph',
    maxDepth: 3
  },
  hybrid: true
};

const provider = new MCPRAGProvider(mcpConfig);
await provider.connect();

const response = await provider.query({
  query: 'company policy on remote work',
  maxResults: 5
});
```

### Docker RAG Provider

The `DockerRAGProvider` connects to containerized RAG services for scalable deployment.

```typescript
class DockerRAGProvider extends BaseRAGProvider {
  constructor(config: RAGConfig & { deployment: 'local_docker' | 'remote_docker' })
}
```

**Configuration:**
```typescript
interface DockerConnection {
  type: 'docker';
  containerName: string;  // Container name
  port: number;          // Service port
  host?: string;         // Host (default: localhost)
  healthCheck?: string;  // Health check endpoint
}

interface RemoteConnection {
  type: 'remote';
  baseURL: string;       // API base URL
  apiKey?: string;       // Authentication key
  headers?: Record<string, string>; // Custom headers
  timeout?: number;      // Request timeout
}
```

**Examples:**

##### Local Docker Provider
```typescript
import { DockerRAGProvider } from 'claudette';

const dockerProvider = new DockerRAGProvider({
  deployment: 'local_docker',
  connection: {
    type: 'docker',
    containerName: 'qdrant-rag',
    port: 6333,
    healthCheck: '/health'
  },
  vectorDB: {
    provider: 'qdrant',
    collection: 'documentation',
    dimensions: 768
  }
});

await dockerProvider.connect();
```

##### Remote Docker Provider
```typescript
const remoteProvider = new DockerRAGProvider({
  deployment: 'remote_docker',
  connection: {
    type: 'remote',
    baseURL: 'https://rag-api.company.com',
    apiKey: process.env.RAG_API_KEY,
    headers: {
      'X-Client-Version': '2.1.5'
    },
    timeout: 5000
  },
  vectorDB: {
    provider: 'pinecone',
    collection: 'enterprise-knowledge'
  }
});
```

---

## Deployment Scenarios

### 1. MCP Plugin Deployment (Privacy-Focused)

Best for: Local development, sensitive data, maximum privacy

```typescript
import { createMCPProvider } from 'claudette';

const mcpProvider = await createMCPProvider({
  pluginPath: './plugins/secure-docs-mcp.js',
  serverPort: 8003,
  vectorDB: {
    provider: 'weaviate',
    collection: 'confidential-docs',
    dimensions: 1536
  },
  graphDB: {
    provider: 'lightrag',
    database: 'secure-graph',
    maxDepth: 2
  },
  hybrid: true
});

// All data stays local, no external API calls
const results = await mcpProvider.query({
  query: 'confidential project specifications',
  threshold: 0.85
});
```

### 2. Local Docker Deployment (Development)

Best for: Development environments, testing, offline usage

```typescript
import { createDockerProvider } from 'claudette';

// Start containers first:
// docker run -d --name chroma-rag -p 8000:8000 chromadb/chroma
// docker run -d --name weaviate-rag -p 8080:8080 semitechnologies/weaviate

const dockerProvider = await createDockerProvider({
  containerName: 'chroma-rag',
  port: 8000,
  vectorDB: {
    provider: 'chroma',
    collection: 'dev-docs',
    similarity: 'cosine'
  }
});

// Fast local queries
const results = await dockerProvider.query({
  query: 'API endpoint documentation',
  maxResults: 10
});
```

### 3. Remote API Deployment (Production)

Best for: Production environments, high availability, scalability

```typescript
import { createRemoteProvider } from 'claudette';

const prodProvider = await createRemoteProvider({
  baseURL: 'https://rag.prod.company.com',
  apiKey: process.env.PROD_RAG_API_KEY,
  headers: {
    'X-Environment': 'production',
    'X-Region': 'us-east-1'
  },
  timeout: 3000,
  vectorDB: {
    provider: 'pinecone',
    collection: 'production-knowledge-base',
    dimensions: 1536
  }
});

// High-availability production queries
const results = await prodProvider.query({
  query: 'production deployment procedures',
  threshold: 0.75,
  maxResults: 5
});
```

### 4. Multi-Provider Setup (Enterprise)

Best for: Enterprise environments requiring redundancy and optimization

```typescript
import { RAGManager } from 'claudette';

async function setupEnterpriseRAG() {
  const ragManager = new RAGManager();
  
  // Primary: High-performance cloud service
  await ragManager.registerProvider('primary-cloud', {
    deployment: 'remote_docker',
    connection: {
      type: 'remote',
      baseURL: 'https://rag-primary.company.com',
      apiKey: process.env.PRIMARY_RAG_KEY,
      timeout: 2000
    },
    vectorDB: {
      provider: 'pinecone',
      collection: 'enterprise-primary'
    }
  });
  
  // Secondary: Regional backup
  await ragManager.registerProvider('backup-cloud', {
    deployment: 'remote_docker',
    connection: {
      type: 'remote',
      baseURL: 'https://rag-backup.company.com',
      apiKey: process.env.BACKUP_RAG_KEY,
      timeout: 3000
    },
    vectorDB: {
      provider: 'weaviate',
      collection: 'enterprise-backup'
    }
  });
  
  // Emergency: Local fallback
  await ragManager.registerProvider('local-emergency', {
    deployment: 'local_docker',
    connection: {
      type: 'docker',
      containerName: 'emergency-rag',
      port: 8001
    },
    vectorDB: {
      provider: 'chroma',
      collection: 'emergency-docs'
    }
  });
  
  // Configure intelligent fallback
  ragManager.setFallbackChain([
    'primary-cloud',
    'backup-cloud', 
    'local-emergency'
  ]);
  
  return ragManager;
}
```

---

## Context Integration

### Context Strategies

Claudette provides three strategies for integrating RAG context with user prompts:

#### 1. Prepend Strategy

Adds retrieved context before the user prompt.

```typescript
const enhanced = await ragManager.enhanceWithRAG({
  prompt: 'How do I implement caching?',
  ragQuery: 'caching strategies Redis memcached',
  contextStrategy: 'prepend'
});

// Result format:
// "Based on the following context:
//  [Context 1]: Redis provides in-memory caching...
//  [Context 2]: Memcached is a distributed caching system...
//  
//  How do I implement caching?"
```

#### 2. Append Strategy

Adds retrieved context after the user prompt.

```typescript
const enhanced = await ragManager.enhanceWithRAG({
  prompt: 'Explain microservices architecture',
  ragQuery: 'microservices patterns design principles',
  contextStrategy: 'append'
});

// Result format:
// "Explain microservices architecture
//  
//  Relevant context:
//  [Context 1]: Microservices architecture pattern...
//  [Context 2]: Service decomposition strategies..."
```

#### 3. Inject Strategy

Injects context at placeholder locations in the prompt.

```typescript
const enhanced = await ragManager.enhanceWithRAG({
  prompt: 'Based on {context}, explain the best practices for API design',
  ragQuery: 'REST API design principles best practices',
  contextStrategy: 'inject'
});

// Result format:
// "Based on 
//  [Retrieved Context]:
//  API design follows REST principles...
//  Resource naming conventions...
//  , explain the best practices for API design"
```

### Advanced Context Processing

```typescript
class AdvancedContextProcessor {
  async processContext(
    prompt: string,
    ragResults: RAGResult[],
    strategy: ContextStrategy,
    options: {
      maxContextLength?: number;
      scoreThreshold?: number;
      deduplicate?: boolean;
      summarize?: boolean;
    } = {}
  ): Promise<string> {
    
    // Filter by score threshold
    let filteredResults = ragResults;
    if (options.scoreThreshold) {
      filteredResults = ragResults.filter(r => r.score >= options.scoreThreshold);
    }
    
    // Remove duplicates
    if (options.deduplicate) {
      filteredResults = this.deduplicateResults(filteredResults);
    }
    
    // Summarize if needed
    if (options.summarize) {
      filteredResults = await this.summarizeResults(filteredResults);
    }
    
    // Apply length limits
    if (options.maxContextLength) {
      filteredResults = this.truncateContext(filteredResults, options.maxContextLength);
    }
    
    return this.applyStrategy(prompt, filteredResults, strategy);
  }
  
  private deduplicateResults(results: RAGResult[]): RAGResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const normalized = result.content.toLowerCase().trim();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  }
  
  private async summarizeResults(results: RAGResult[]): Promise<RAGResult[]> {
    // Implement summarization logic
    return results.map(result => ({
      ...result,
      content: this.summarizeText(result.content)
    }));
  }
}

// Usage
const processor = new AdvancedContextProcessor();

const enhancedPrompt = await processor.processContext(
  'Explain authentication patterns',
  ragResults,
  'prepend',
  {
    maxContextLength: 2000,
    scoreThreshold: 0.8,
    deduplicate: true,
    summarize: false
  }
);
```

---

## Usage Examples

### 1. Basic RAG Setup

```typescript
import { RAGManager, createDockerProvider } from 'claudette';

async function basicRAGSetup() {
  const ragManager = new RAGManager();
  
  // Simple Docker provider
  const provider = await createDockerProvider({
    containerName: 'chroma-docs',
    port: 8000,
    vectorDB: {
      provider: 'chroma',
      collection: 'documentation'
    }
  });
  
  await ragManager.registerProvider('docs', provider.config);
  
  // Basic query
  const response = await ragManager.query({
    query: 'getting started guide',
    maxResults: 3
  });
  
  console.log('Found documents:', response.results.length);
  return ragManager;
}
```

### 2. Multi-Provider with Fallback

```typescript
async function multiProviderSetup() {
  const ragManager = new RAGManager();
  
  // Register multiple providers
  await ragManager.registerProvider('fast-cache', {
    deployment: 'local_docker',
    connection: {
      type: 'docker',
      containerName: 'redis-vector',
      port: 6379
    },
    vectorDB: {
      provider: 'redis',
      collection: 'cache'
    }
  });
  
  await ragManager.registerProvider('main-db', {
    deployment: 'remote_docker',
    connection: {
      type: 'remote',
      baseURL: 'https://vector-db.company.com',
      apiKey: process.env.VECTOR_DB_KEY
    },
    vectorDB: {
      provider: 'pinecone',
      collection: 'main'
    }
  });
  
  await ragManager.registerProvider('backup-local', {
    deployment: 'local_docker',
    connection: {
      type: 'docker',
      containerName: 'backup-chroma',
      port: 8001
    },
    vectorDB: {
      provider: 'chroma',
      collection: 'backup'
    }
  });
  
  // Configure intelligent fallback
  ragManager.setFallbackChain([
    'fast-cache',     // Try cache first
    'main-db',        // Then main database
    'backup-local'    // Finally local backup
  ]);
  
  return ragManager;
}
```

### 3. Integration with Claudette

```typescript
import { Claudette, RAGManager } from 'claudette';

async function claudetteRAGIntegration() {
  const claudette = new Claudette();
  const ragManager = new RAGManager();
  
  // Setup RAG
  await ragManager.registerProvider('knowledge-base', {
    deployment: 'local_docker',
    connection: {
      type: 'docker',
      containerName: 'weaviate-kb',
      port: 8080
    },
    vectorDB: {
      provider: 'weaviate',
      collection: 'technical-docs'
    }
  });
  
  await claudette.initialize();
  
  // Connect RAG to router
  const router = claudette.getRouter();
  router.setRAGManager(ragManager);
  
  // Enhanced request
  const result = await claudette.optimize(
    'How do I optimize database queries for better performance?',
    [],
    {
      useRAG: true,
      ragQuery: 'database optimization query performance indexing',
      contextStrategy: 'prepend',
      backend: 'claude'  // Use Claude for complex reasoning
    }
  );
  
  console.log('Response with RAG context:', result.content);
  
  if (result.metadata?.ragUsed) {
    console.log('RAG provided context from:', result.metadata.ragSources);
  }
  
  // Cleanup
  await ragManager.cleanup();
  await claudette.cleanup();
}
```

### 4. Custom RAG Provider

```typescript
import { BaseRAGProvider, RAGRequest, RAGResponse } from 'claudette';

class CustomElasticsearchRAGProvider extends BaseRAGProvider {
  name = 'elasticsearch-rag';
  private client: ElasticsearchClient;
  
  constructor(config: ElasticsearchConfig) {
    super();
    this.client = new ElasticsearchClient(config);
  }
  
  async connect(): Promise<void> {
    await this.client.ping();
    console.log('Connected to Elasticsearch');
  }
  
  async query(request: RAGRequest): Promise<RAGResponse> {
    const startTime = Date.now();
    
    const searchResponse = await this.client.search({
      index: 'documents',
      body: {
        query: {
          multi_match: {
            query: request.query,
            fields: ['title^2', 'content'],
            fuzziness: 'AUTO'
          }
        },
        size: request.maxResults || 5,
        min_score: request.threshold || 0.1
      }
    });
    
    const results = searchResponse.body.hits.hits.map(hit => ({
      content: hit._source.content,
      score: hit._score / searchResponse.body.max_score, // Normalize
      source: hit._source.source || 'elasticsearch',
      metadata: {
        id: hit._id,
        index: hit._index
      }
    }));
    
    return {
      results,
      metadata: {
        totalResults: searchResponse.body.hits.total.value,
        processingTime: Date.now() - startTime,
        source: 'vector',
        queryId: `es_${Date.now()}`
      }
    };
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }
  
  async disconnect(): Promise<void> {
    await this.client.close();
  }
  
  getStatus() {
    return {
      name: this.name,
      healthy: true,
      provider: 'elasticsearch',
      lastQuery: Date.now()
    };
  }
  
  async ensureHealthy(): Promise<void> {
    if (!await this.healthCheck()) {
      throw new Error('Elasticsearch provider is unhealthy');
    }
  }
}

// Usage
const customProvider = new CustomElasticsearchRAGProvider({
  host: 'localhost:9200',
  apiKey: process.env.ELASTICSEARCH_KEY
});

await ragManager.registerProvider('elasticsearch', customProvider.config);
```

---

## Advanced Patterns

### 1. Semantic Routing

Route queries to different providers based on content type:

```typescript
class SemanticRAGRouter {
  private ragManager: RAGManager;
  private routingRules: Map<RegExp, string>;
  
  constructor(ragManager: RAGManager) {
    this.ragManager = ragManager;
    this.routingRules = new Map([
      [/code|programming|typescript|javascript/i, 'code-docs'],
      [/api|endpoint|rest|graphql/i, 'api-docs'],
      [/design|ui|ux|frontend/i, 'design-docs'],
      [/deploy|infrastructure|docker|kubernetes/i, 'ops-docs']
    ]);
  }
  
  async smartQuery(request: RAGRequest): Promise<RAGResponse> {
    // Determine best provider based on query content
    const provider = this.selectProvider(request.query);
    
    if (provider) {
      console.log(`Routing to specialized provider: ${provider}`);
      return this.ragManager.query(request, provider);
    }
    
    // Fall back to default routing
    return this.ragManager.query(request);
  }
  
  private selectProvider(query: string): string | null {
    for (const [pattern, provider] of this.routingRules) {
      if (pattern.test(query)) {
        return provider;
      }
    }
    return null;
  }
}

// Usage
const router = new SemanticRAGRouter(ragManager);
const response = await router.smartQuery({
  query: 'TypeScript interface design patterns'  // Routes to 'code-docs'
});
```

### 2. RAG Result Caching

Cache RAG results for improved performance:

```typescript
class RAGCache {
  private cache = new Map<string, { response: RAGResponse; expires: number }>();
  private readonly ttl: number;
  
  constructor(ttlSeconds: number = 3600) {
    this.ttl = ttlSeconds * 1000;
  }
  
  private generateKey(request: RAGRequest, provider?: string): string {
    const keyData = {
      query: request.query,
      context: request.context,
      maxResults: request.maxResults,
      threshold: request.threshold,
      provider
    };
    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }
  
  async query(
    ragManager: RAGManager,
    request: RAGRequest,
    provider?: string
  ): Promise<RAGResponse> {
    const key = this.generateKey(request, provider);
    const cached = this.cache.get(key);
    
    // Check cache
    if (cached && Date.now() < cached.expires) {
      console.log('RAG cache hit');
      return {
        ...cached.response,
        metadata: {
          ...cached.response.metadata,
          cached: true
        }
      };
    }
    
    // Query and cache
    const response = await ragManager.query(request, provider);
    this.cache.set(key, {
      response,
      expires: Date.now() + this.ttl
    });
    
    return response;
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  getStats() {
    return {
      entries: this.cache.size,
      hitRate: this.calculateHitRate()
    };
  }
  
  private calculateHitRate(): number {
    // Implementation for hit rate calculation
    return 0; // Placeholder
  }
}

// Usage
const ragCache = new RAGCache(7200); // 2 hours

const response = await ragCache.query(
  ragManager,
  { query: 'authentication patterns' }
);
```

### 3. Dynamic Context Scoring

Improve context relevance with custom scoring:

```typescript
class ContextScorer {
  async scoreResults(
    query: string,
    results: RAGResult[],
    options: {
      semanticWeight?: number;
      recencyWeight?: number;
      authorityWeight?: number;
    } = {}
  ): Promise<RAGResult[]> {
    
    const {
      semanticWeight = 0.6,
      recencyWeight = 0.2,
      authorityWeight = 0.2
    } = options;
    
    return results.map(result => {
      const semanticScore = this.calculateSemanticScore(query, result);
      const recencyScore = this.calculateRecencyScore(result);
      const authorityScore = this.calculateAuthorityScore(result);
      
      const combinedScore = 
        (semanticScore * semanticWeight) +
        (recencyScore * recencyWeight) +
        (authorityScore * authorityWeight);
      
      return {
        ...result,
        score: combinedScore,
        metadata: {
          ...result.metadata,
          scoringBreakdown: {
            semantic: semanticScore,
            recency: recencyScore,
            authority: authorityScore
          }
        }
      };
    }).sort((a, b) => b.score - a.score);
  }
  
  private calculateSemanticScore(query: string, result: RAGResult): number {
    // Implement semantic similarity calculation
    // Could use cosine similarity, TF-IDF, etc.
    return result.score; // Placeholder
  }
  
  private calculateRecencyScore(result: RAGResult): number {
    const lastModified = result.metadata?.lastModified;
    if (!lastModified) return 0.5;
    
    const daysSince = (Date.now() - new Date(lastModified).getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, 1 - (daysSince / 365)); // Decay over a year
  }
  
  private calculateAuthorityScore(result: RAGResult): number {
    const authority = result.metadata?.authority || 'medium';
    const scores = { high: 1.0, medium: 0.7, low: 0.4 };
    return scores[authority] || 0.5;
  }
}

// Usage
const scorer = new ContextScorer();

const scoredResults = await scorer.scoreResults(
  'authentication security',
  ragResults,
  {
    semanticWeight: 0.5,
    recencyWeight: 0.3,
    authorityWeight: 0.2
  }
);
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Connection Failures

**Problem**: RAG provider connection fails

```typescript
// Diagnostic function
async function diagnoseFAGConnection(provider: BaseRAGProvider) {
  console.log(`Diagnosing provider: ${provider.name}`);
  
  try {
    // Test basic connectivity
    const isHealthy = await provider.healthCheck();
    console.log('Health check:', isHealthy ? 'PASS' : 'FAIL');
    
    if (!isHealthy) {
      // Detailed diagnostics
      const status = provider.getStatus();
      console.log('Provider status:', status);
      
      // Test network connectivity
      if (status.connection?.type === 'remote') {
        const response = await fetch(status.connection.baseURL + '/health');
        console.log('Network response:', response.status);
      }
    }
    
  } catch (error) {
    console.error('Diagnostic error:', error.message);
    
    // Suggest solutions
    if (error.message.includes('ECONNREFUSED')) {
      console.log('Solution: Check if the service is running and port is correct');
    } else if (error.message.includes('timeout')) {
      console.log('Solution: Increase timeout or check network latency');
    }
  }
}
```

#### 2. Poor Query Results

**Problem**: RAG returns irrelevant results

```typescript
// Query optimization helper
class QueryOptimizer {
  optimizeQuery(originalQuery: string, context?: string): string {
    let optimized = originalQuery;
    
    // Expand acronyms
    optimized = this.expandAcronyms(optimized);
    
    // Add synonyms
    optimized = this.addSynonyms(optimized);
    
    // Include context keywords
    if (context) {
      const keywords = this.extractKeywords(context);
      optimized += ' ' + keywords.join(' ');
    }
    
    return optimized;
  }
  
  private expandAcronyms(query: string): string {
    const acronyms = {
      'API': 'API application programming interface',
      'DB': 'database',
      'UI': 'user interface',
      'UX': 'user experience'
    };
    
    for (const [acronym, expansion] of Object.entries(acronyms)) {
      query = query.replace(new RegExp(`\\b${acronym}\\b`, 'gi'), expansion);
    }
    
    return query;
  }
  
  private addSynonyms(query: string): string {
    const synonyms = {
      'authentication': 'auth login signin',
      'database': 'db storage persistence',
      'performance': 'speed optimization efficiency'
    };
    
    for (const [word, syns] of Object.entries(synonyms)) {
      if (query.toLowerCase().includes(word)) {
        query += ' ' + syns;
      }
    }
    
    return query;
  }
  
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction
    return text.toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3)
      .slice(0, 5);
  }
}

// Usage
const optimizer = new QueryOptimizer();
const optimizedQuery = optimizer.optimizeQuery(
  'API auth',
  'Looking for authentication patterns in REST APIs'
);
```

#### 3. Performance Issues

**Problem**: RAG queries are slow

```typescript
// Performance monitoring
class RAGPerformanceMonitor {
  private metrics = {
    queryTimes: [] as number[],
    providerPerformance: new Map<string, number[]>()
  };
  
  async monitoredQuery(
    ragManager: RAGManager,
    request: RAGRequest,
    provider?: string
  ): Promise<RAGResponse> {
    const startTime = Date.now();
    
    try {
      const response = await ragManager.query(request, provider);
      const queryTime = Date.now() - startTime;
      
      // Record metrics
      this.metrics.queryTimes.push(queryTime);
      if (provider) {
        const providerTimes = this.metrics.providerPerformance.get(provider) || [];
        providerTimes.push(queryTime);
        this.metrics.providerPerformance.set(provider, providerTimes);
      }
      
      // Alert on slow queries
      if (queryTime > 5000) {
        console.warn(`Slow RAG query detected: ${queryTime}ms`);
      }
      
      return response;
      
    } catch (error) {
      const errorTime = Date.now() - startTime;
      console.error(`RAG query failed after ${errorTime}ms:`, error.message);
      throw error;
    }
  }
  
  getPerformanceReport() {
    const avgTime = this.metrics.queryTimes.reduce((a, b) => a + b, 0) / this.metrics.queryTimes.length;
    
    return {
      averageQueryTime: avgTime,
      totalQueries: this.metrics.queryTimes.length,
      slowQueries: this.metrics.queryTimes.filter(t => t > 3000).length,
      providerPerformance: Object.fromEntries(
        Array.from(this.metrics.providerPerformance.entries()).map(([provider, times]) => [
          provider,
          times.reduce((a, b) => a + b, 0) / times.length
        ])
      )
    };
  }
}

// Usage
const monitor = new RAGPerformanceMonitor();

const response = await monitor.monitoredQuery(
  ragManager,
  { query: 'complex technical query' }
);

// Regular performance reports
setInterval(() => {
  const report = monitor.getPerformanceReport();
  console.log('RAG Performance Report:', report);
}, 300000); // Every 5 minutes
```

### Error Recovery Patterns

```typescript
// Robust RAG query with retry and fallback
async function robustRAGQuery(
  ragManager: RAGManager,
  request: RAGRequest,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    fallbackToSimple?: boolean;
  } = {}
): Promise<RAGResponse> {
  
  const { maxRetries = 3, retryDelay = 1000, fallbackToSimple = true } = options;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await ragManager.query(request);
      
    } catch (error) {
      console.warn(`RAG query attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        if (fallbackToSimple && error instanceof RAGError) {
          console.log('Falling back to simple text search');
          
          // Fallback to simple keyword matching
          return {
            results: [{
              content: `Fallback result for: ${request.query}`,
              score: 0.5,
              source: 'fallback',
              metadata: { fallback: true }
            }],
            metadata: {
              totalResults: 1,
              processingTime: 0,
              source: 'fallback',
              queryId: `fallback_${Date.now()}`
            }
          };
        }
        
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }
  
  throw new Error('This should never be reached');
}
```

---

*This comprehensive RAG system documentation covers all aspects of Claudette's retrieval-augmented generation capabilities. For integration examples and production deployment patterns, see the related documentation sections.*