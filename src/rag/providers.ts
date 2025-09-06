// RAG Provider Factory Functions - Implementation of promised API functions
import { RAGManager, DockerRAGProvider, MCPRAGProvider, BaseRAGProvider } from './index';
import { RAGConfig, RAGProviderConfig } from './types';
import { ClaudetteError } from '../types/index';

/**
 * Create MCP (Model Context Protocol) RAG Provider
 * Implements the createMCPProvider function referenced in README
 */
export async function createConfiguredMCPProvider(config: MCPProviderConfig): Promise<MCPRAGProvider> {
  try {
    const mcpProvider = new MCPRAGProvider({
      name: 'mcp-rag-provider',
      type: 'mcp',
      config: {
        pluginPath: config.pluginPath || './plugins/rag-mcp-server.js',
        timeout: config.timeout || 30000,
        maxRetries: config.maxRetries || 3,
        vectorDB: config.vectorDB,
        graphDB: config.graphDB,
        hybrid: config.hybrid || false,
        contextStrategy: config.contextStrategy || 'append'
      },
      enabled: true,
      priority: config.priority || 1
    });

    await mcpProvider.initialize();
    return mcpProvider;
  } catch (error) {
    throw new ClaudetteError(`Failed to create MCP provider: ${error}`, 'RAG_PROVIDER_ERROR');
  }
}

/**
 * Create Docker RAG Provider
 * Implements the createDockerProvider function referenced in README
 */
export async function createConfiguredDockerProvider(config: DockerProviderConfig): Promise<DockerRAGProvider> {
  try {
    const dockerProvider = new DockerRAGProvider({
      name: 'docker-rag-provider',
      type: 'docker',
      config: {
        containerName: config.containerName || 'claudette-rag',
        port: config.port || 8000,
        host: config.host || 'localhost',
        healthCheckPath: config.healthCheckPath || '/health',
        timeout: config.timeout || 30000,
        maxRetries: config.maxRetries || 3,
        vectorDB: config.vectorDB,
        contextStrategy: config.contextStrategy || 'append'
      },
      enabled: true,
      priority: config.priority || 2
    });

    await dockerProvider.initialize();
    return dockerProvider;
  } catch (error) {
    throw new ClaudetteError(`Failed to create Docker provider: ${error}`, 'RAG_PROVIDER_ERROR');
  }
}

/**
 * Create Remote API RAG Provider
 * Implements the createRemoteProvider function referenced in README
 */
export async function createConfiguredRemoteProvider(config: RemoteProviderConfig): Promise<BaseRAGProvider> {
  try {
    const remoteProvider = new BaseRAGProvider({
      name: 'remote-rag-provider',
      type: 'remote',
      config: {
        baseURL: config.baseURL,
        apiKey: config.apiKey,
        timeout: config.timeout || 30000,
        maxRetries: config.maxRetries || 3,
        headers: config.headers || {},
        vectorDB: config.vectorDB,
        contextStrategy: config.contextStrategy || 'append'
      },
      enabled: true,
      priority: config.priority || 3
    });

    await remoteProvider.initialize();
    return remoteProvider;
  } catch (error) {
    throw new ClaudetteError(`Failed to create Remote provider: ${error}`, 'RAG_PROVIDER_ERROR');
  }
}

/**
 * Create comprehensive RAG manager with multiple providers
 */
export async function createConfiguredRAGManager(providers: RAGProviderConfig[]): Promise<RAGManager> {
  try {
    const ragManager = new RAGManager();

    // Register all provided providers
    for (const providerConfig of providers) {
      let provider: BaseRAGProvider;

      switch (providerConfig.type) {
        case 'mcp':
          provider = await createMCPProvider(providerConfig as MCPProviderConfig);
          break;
        case 'docker':
          provider = await createDockerProvider(providerConfig as DockerProviderConfig);
          break;
        case 'remote':
          provider = await createRemoteProvider(providerConfig as RemoteProviderConfig);
          break;
        default:
          throw new ClaudetteError(`Unknown provider type: ${providerConfig.type}`, 'RAG_CONFIG_ERROR');
      }

      await ragManager.registerProvider(provider.config.name, provider);
    }

    return ragManager;
  } catch (error) {
    throw new ClaudetteError(`Failed to create RAG manager: ${error}`, 'RAG_MANAGER_ERROR');
  }
}

/**
 * Auto-detect and configure RAG providers based on environment
 */
export async function autoConfigureRAG(): Promise<RAGManager> {
  const ragManager = new RAGManager();
  const detectedProviders: RAGProviderConfig[] = [];

  try {
    // Check for MCP plugin
    const mcpPluginPath = './plugins/rag-mcp-server.js';
    if (await checkFileExists(mcpPluginPath)) {
      detectedProviders.push({
        type: 'mcp',
        pluginPath: mcpPluginPath,
        vectorDB: { provider: 'chroma', collection: 'default' }
      });
    }

    // Check for Docker container
    if (await checkDockerContainer('claudette-rag')) {
      detectedProviders.push({
        type: 'docker',
        containerName: 'claudette-rag',
        port: 8000,
        vectorDB: { provider: 'chroma', collection: 'default' }
      });
    }

    // Check for remote RAG service
    const remoteUrl = process.env.CLAUDETTE_RAG_URL;
    if (remoteUrl) {
      detectedProviders.push({
        type: 'remote',
        baseURL: remoteUrl,
        apiKey: process.env.CLAUDETTE_RAG_API_KEY,
        vectorDB: { provider: 'remote', collection: 'default' }
      });
    }

    // Configure detected providers
    if (detectedProviders.length > 0) {
      return await createRAGManager(detectedProviders);
    } else {
      console.warn('No RAG providers detected. RAG functionality will be limited.');
      return ragManager;
    }

  } catch (error) {
    console.warn(`RAG auto-configuration failed: ${error}`);
    return ragManager;
  }
}

// Supporting interfaces
export interface MCPProviderConfig {
  type: 'mcp';
  pluginPath?: string;
  timeout?: number;
  maxRetries?: number;
  priority?: number;
  vectorDB: VectorDBConfig;
  graphDB?: GraphDBConfig;
  hybrid?: boolean;
  contextStrategy?: 'prepend' | 'append' | 'inject' | 'hybrid';
}

export interface DockerProviderConfig {
  type: 'docker';
  containerName?: string;
  port?: number;
  host?: string;
  healthCheckPath?: string;
  timeout?: number;
  maxRetries?: number;
  priority?: number;
  vectorDB: VectorDBConfig;
  contextStrategy?: 'prepend' | 'append' | 'inject' | 'hybrid';
}

export interface RemoteProviderConfig {
  type: 'remote';
  baseURL: string;
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
  headers?: Record<string, string>;
  priority?: number;
  vectorDB: VectorDBConfig;
  contextStrategy?: 'prepend' | 'append' | 'inject' | 'hybrid';
}

export interface VectorDBConfig {
  provider: 'chroma' | 'pinecone' | 'weaviate' | 'qdrant' | 'remote';
  collection: string;
  apiKey?: string;
  url?: string;
  namespace?: string;
  dimensions?: number;
}

export interface GraphDBConfig {
  provider: 'lightrag' | 'neo4j';
  maxDepth?: number;
  url?: string;
  username?: string;
  password?: string;
}

// Helper functions
async function checkFileExists(path: string): Promise<boolean> {
  try {
    const fs = await import('fs');
    return fs.existsSync(path);
  } catch {
    return false;
  }
}

async function checkDockerContainer(containerName: string): Promise<boolean> {
  try {
    const { exec } = await import('child_process');
    return new Promise((resolve) => {
      exec(`docker ps --format "{{.Names}}" | grep ${containerName}`, (error, stdout) => {
        resolve(!error && stdout.trim().includes(containerName));
      });
    });
  } catch {
    return false;
  }
}

// Export all provider functions for easy import
export {
  createMCPProvider as createMCPRAGProvider,
  createDockerProvider as createDockerRAGProvider,
  createRemoteProvider as createRemoteRAGProvider
};