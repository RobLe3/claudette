// RAG (Retrieval-Augmented Generation) and GraphRAG type definitions
// Support for Vector DB, LightRAG, and GraphDB scenarios

export interface RAGRequest {
  query: string;
  context?: string;
  maxResults?: number;
  threshold?: number;
  metadata?: Record<string, any>;
}

export interface RAGResponse {
  results: RAGResult[];
  metadata: {
    totalResults: number;
    processingTime: number;
    source: 'vector' | 'graph' | 'hybrid';
    queryId: string;
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
  deployment: 'mcp' | 'local_docker' | 'remote_docker';
  connection: MCPConnection | DockerConnection | RemoteConnection;
  vectorDB?: VectorDBConfig;
  graphDB?: GraphDBConfig;
  hybrid?: boolean;
}

export interface MCPConnection {
  type: 'mcp';
  pluginPath: string;
  serverPort?: number;
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
  provider: 'chroma' | 'pinecone' | 'weaviate' | 'qdrant';
  collection: string;
  dimensions?: number;
  similarity?: 'cosine' | 'euclidean' | 'dot';
}

export interface GraphDBConfig {
  provider: 'lightrag' | 'neo4j' | 'ultipa';
  database: string;
  schema?: string;
  maxDepth?: number;
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
  code: 'CONNECTION_FAILED' | 'TIMEOUT' | 'INVALID_CONFIG' | 'RAG_SERVICE_ERROR';
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