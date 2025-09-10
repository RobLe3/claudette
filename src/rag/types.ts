// RAG (Retrieval-Augmented Generation) and GraphRAG type definitions
// Support for Vector DB, LightRAG, and GraphDB scenarios

export interface RAGRequest {
  query: string;
  context?: string;
  maxResults?: number;
  threshold?: number;
  metadata?: Record<string, any>;
  priority?: 'high' | 'medium' | 'low';
}

export interface RAGResponse {
  results: RAGResult[];
  metadata: {
    totalResults: number;
    processingTime: number;
    source: 'vector' | 'graph' | 'hybrid';
    queryId: string;
    serverId?: string;
  };
}

export interface RAGResult {
  content: string;
  score: number;
  source: string;
  metadata?: Record<string, any>;
  relationships?: GraphRelationship[];
}

export interface GraphRelationship {
  type: string;
  target: string;
  weight: number;
  properties?: Record<string, any>;
}

// Deployment scenario configurations
export interface RAGConfig {
  name?: string;
  type?: 'mcp' | 'docker' | 'remote';
  deployment: 'mcp' | 'local_docker' | 'remote_docker';
  connection: MCPConnection | DockerConnection | RemoteConnection;
  config?: any; // Additional configuration
  vectorDB?: VectorDBConfig;
  graphDB?: GraphDBConfig;
  hybrid?: boolean;
  enabled?: boolean;
  priority?: number;
}

export interface MCPConnection {
  type: 'mcp';
  pluginPath: string;
  serverPort?: number;
  serverHost?: string;
  timeout?: number;
}

export interface DockerConnection {
  type: 'docker';
  containerName: string;
  port: number;
  host?: string;
  healthCheck?: string;
}

export interface RemoteConnection {
  type: 'remote';
  baseURL: string;
  apiKey?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface VectorDBConfig {
  provider: 'chroma' | 'pinecone' | 'weaviate' | 'qdrant' | 'local';
  collection: string;
  dimensions?: number;
  similarity?: 'cosine' | 'euclidean' | 'dot';
  enabled?: boolean;
}

export interface GraphDBConfig {
  provider: 'lightrag' | 'neo4j' | 'ultipa';
  database: string;
  schema?: string;
  maxDepth?: number;
  enabled?: boolean;
}

export interface RAGProviderConfig {
  type: 'mcp' | 'docker' | 'remote';
  config: any;
  priority?: number;
  enabled?: boolean;
}

export interface MCPProviderConfig {
  type?: 'mcp';
  pluginPath?: string;
  timeout?: number;
  maxRetries?: number;
  priority?: number;
  vectorDB?: VectorDBConfig;
  graphDB?: GraphDBConfig;
  hybrid?: boolean;
  contextStrategy?: 'prepend' | 'append' | 'inject' | 'hybrid';
}

export interface DockerProviderConfig {
  type?: 'docker';
  containerName?: string;
  port?: number;
  host?: string;
  healthCheckPath?: string;
  timeout?: number;
  maxRetries?: number;
  priority?: number;
  vectorDB?: VectorDBConfig;
  contextStrategy?: 'prepend' | 'append' | 'inject' | 'hybrid';
}

export interface RemoteProviderConfig {
  type?: 'remote';
  baseURL?: string;
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
  headers?: Record<string, string>;
  priority?: number;
  vectorDB?: VectorDBConfig;
  contextStrategy?: 'prepend' | 'append' | 'inject' | 'hybrid';
}

// Enhanced Claudette request with RAG capabilities
export interface ClaudetteRAGRequest {
  prompt: string;
  ragConfig?: RAGConfig;
  useRAG?: boolean;
  ragQuery?: string;
  enhanceWithGraph?: boolean;
  contextStrategy?: 'prepend' | 'append' | 'inject';
}

export interface ClaudetteRAGResponse {
  content: string;
  ragContext?: RAGResult[];
  ragMetadata?: {
    contextUsed: boolean;
    resultsCount: number;
    processingTime: number;
    strategy: string;
  };
}

export class RAGError extends Error {
  code: 'CONNECTION_FAILED' | 'TIMEOUT' | 'INVALID_CONFIG' | 'RAG_SERVICE_ERROR' | 'NO_SERVERS_AVAILABLE' | 'FAILOVER_EXHAUSTED';
  deployment: string;
  retryable: boolean;

  constructor(message: string, code: RAGError['code'], deployment: string, retryable: boolean) {
    super(message);
    this.name = 'RAGError';
    this.code = code;
    this.deployment = deployment;
    this.retryable = retryable;
  }
}