// RAG module exports - Central access point for all RAG functionality

export { BaseRAGProvider } from './base-rag';
export { MCPRAGProvider } from './mcp-rag';
export { DockerRAGProvider } from './docker-rag';
export { RAGManager } from './rag-manager';

export {
  RAGError
} from './types';

export type {
  RAGRequest,
  RAGResponse,
  RAGResult,
  RAGConfig,
  GraphRelationship,
  MCPConnection,
  DockerConnection,
  RemoteConnection,
  VectorDBConfig,
  GraphDBConfig,
  ClaudetteRAGRequest,
  ClaudetteRAGResponse
} from './types';

// Import classes for convenience functions
import { RAGManager } from './rag-manager';
import { MCPRAGProvider } from './mcp-rag';
import { DockerRAGProvider } from './docker-rag';

// Convenience factory functions
export function createRAGManager() {
  return new RAGManager();
}

export async function createMCPProvider(config: {
  pluginPath: string;
  serverPort?: number;
  vectorDB?: any;
  graphDB?: any;
  hybrid?: boolean;
}) {
  const ragConfig = {
    deployment: 'mcp' as const,
    connection: {
      type: 'mcp' as const,
      pluginPath: config.pluginPath,
      serverPort: config.serverPort
    },
    vectorDB: config.vectorDB,
    graphDB: config.graphDB,
    hybrid: config.hybrid
  };
  
  const provider = new MCPRAGProvider(ragConfig);
  await provider.connect();
  return provider;
}

export async function createDockerProvider(config: {
  containerName: string;
  port: number;
  host?: string;
  vectorDB?: any;
  graphDB?: any;
  hybrid?: boolean;
}) {
  const ragConfig = {
    deployment: 'local_docker' as const,
    connection: {
      type: 'docker' as const,
      containerName: config.containerName,
      port: config.port,
      host: config.host
    },
    vectorDB: config.vectorDB,
    graphDB: config.graphDB,
    hybrid: config.hybrid
  };
  
  const provider = new DockerRAGProvider(ragConfig);
  await provider.connect();
  return provider;
}

export async function createRemoteProvider(config: {
  baseURL: string;
  apiKey?: string;
  headers?: Record<string, string>;
  timeout?: number;
  vectorDB?: any;
  graphDB?: any;
  hybrid?: boolean;
}) {
  const ragConfig = {
    deployment: 'remote_docker' as const,
    connection: {
      type: 'remote' as const,
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      headers: config.headers,
      timeout: config.timeout
    },
    vectorDB: config.vectorDB,
    graphDB: config.graphDB,
    hybrid: config.hybrid
  };
  
  const provider = new DockerRAGProvider(ragConfig);
  await provider.connect();
  return provider;
}