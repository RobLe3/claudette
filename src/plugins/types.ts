/**
 * Plugin System Type Definitions
 * 
 * This file contains all type definitions for the Claudette plugin system,
 * providing a comprehensive type-safe interface for plugin development.
 */

// Import core types that plugins need
import {
  Backend,
  BackendSettings,
  BackendInfo,
  ClaudetteRequest,
  ClaudetteResponse,
  BackendError,
  RAGProvider,
  RAGQuery,
  RAGResult,
  CacheProvider,
  CacheEntry
} from '../types/index';

import { BasePlugin } from './plugin-sdk';

// Re-export core types that plugins need
export {
  Backend,
  BackendSettings,
  BackendInfo,
  ClaudetteRequest,
  ClaudetteResponse,
  BackendError,
  RAGProvider,
  RAGQuery,
  RAGResult,
  CacheProvider,
  CacheEntry
};

// Basic Plugin interface
export interface Plugin {
  name: string;
  version: string;
  initialize(context: PluginContext): Promise<void>;
  cleanup?(): Promise<void>;
}

export interface PluginContext {
  logger: any;
  config: any;
  events?: any;
  claudetteVersion?: string;
  environment?: string;
}

export interface PluginConfig {
  enabled?: boolean;
  settings?: Record<string, any>;
}

// Plugin-specific types
export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  license?: string;
  homepage?: string;
  repository?: {
    type: string;
    url: string;
  };
  bugs?: {
    url: string;
    email?: string;
  };
  keywords?: string[];
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  claudette: {
    version: string;
    category: PluginCategory;
    permissions?: PluginPermission[];
  };
}

export enum PluginCategory {
  BACKEND = 'backend',
  RAG = 'rag',
  CACHE = 'cache',
  ROUTER = 'router',
  MIDDLEWARE = 'middleware',
  UTILITY = 'utility',
  EXTENSION = 'extension'
}

export enum PluginPermission {
  NETWORK_ACCESS = 'network:access',
  FILE_SYSTEM_READ = 'fs:read',
  FILE_SYSTEM_WRITE = 'fs:write',
  ENVIRONMENT_VARS = 'env:read',
  PROCESS_SPAWN = 'process:spawn',
  DATABASE_ACCESS = 'db:access'
}

export interface PluginConfiguration {
  enabled: boolean;
  priority?: number;
  settings?: Record<string, any>;
  environmentOverrides?: Record<string, any>;
}

export interface PluginRuntime {
  pluginId: string;
  version: string;
  initializationTime: number;
  status: PluginStatus;
  metrics: PluginMetrics;
  lastError?: Error;
}

export enum PluginStatus {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  DISABLED = 'disabled'
}

export interface PluginMetrics {
  requestsProcessed: number;
  averageLatency: number;
  errorRate: number;
  memoryUsage: number;
  lastRequestTime?: number;
}

export interface PluginHooks {
  beforeRequest?: (request: ClaudetteRequest) => Promise<ClaudetteRequest>;
  afterResponse?: (response: ClaudetteResponse) => Promise<ClaudetteResponse>;
  onError?: (error: Error, context: any) => Promise<void>;
  onMetrics?: (metrics: PluginMetrics) => Promise<void>;
}

// Backend Plugin Types
export interface BackendPluginConfig extends PluginConfiguration {
  apiEndpoint?: string;
  apiKey?: string;
  modelSettings?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  rateLimiting?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  timeout?: number;
  retryConfig?: {
    maxRetries: number;
    backoffMs: number;
  };
}

export interface BackendCapabilities {
  supportsStreaming: boolean;
  supportsImageInput: boolean;
  supportsImageOutput: boolean;
  supportsAudioInput: boolean;
  supportsAudioOutput: boolean;
  supportsFunctionCalling: boolean;
  supportsEmbeddings: boolean;
  maxContextLength: number;
  supportedModels: string[];
}

// RAG Plugin Types
export interface RAGPluginConfig extends PluginConfiguration {
  vectorDatabase: {
    type: string;
    connectionString?: string;
    collection: string;
    dimensions?: number;
  };
  embedding: {
    model: string;
    provider: string;
    dimensions: number;
  };
  retrieval: {
    topK: number;
    scoreThreshold?: number;
    mmrLambda?: number; // For Maximum Marginal Relevance
  };
  chunking: {
    strategy: 'fixed' | 'semantic' | 'recursive';
    chunkSize: number;
    overlap: number;
  };
}

export interface RAGCapabilities {
  supportedVectorDBs: string[];
  supportedEmbeddingModels: string[];
  supportsDocumentUpload: boolean;
  supportsRealTimeIndexing: boolean;
  supportsSemanticSearch: boolean;
  supportsHybridSearch: boolean;
  supportsGraphRAG: boolean;
  maxDocumentSize: number;
}

// Cache Plugin Types
export interface CachePluginConfig extends PluginConfiguration {
  provider: string;
  connectionString?: string;
  ttl: number; // Time to live in seconds
  maxSize: number; // Maximum cache size
  evictionPolicy: 'lru' | 'fifo' | 'ttl';
  compression: boolean;
  serialization: 'json' | 'messagepack' | 'protobuf';
}

export interface CacheCapabilities {
  supportedProviders: string[];
  supportsDistributed: boolean;
  supportsPersistence: boolean;
  supportsPartitioning: boolean;
  supportsCompression: boolean;
  supportsEncryption: boolean;
  maxValueSize: number;
}

// Router Plugin Types
export interface RouterPluginConfig extends PluginConfiguration {
  algorithm: 'round-robin' | 'weighted' | 'cost-optimized' | 'latency-optimized' | 'custom';
  weights?: Record<string, number>;
  fallbackStrategy: 'fail' | 'retry' | 'fallback-backend';
  healthCheckInterval: number;
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;
    recoveryTimeout: number;
  };
}

export interface RoutingDecision {
  selectedBackend: string;
  reason: string;
  confidence: number;
  alternatives: Array<{
    backend: string;
    score: number;
  }>;
  estimatedCost: number;
  estimatedLatency: number;
}

// Middleware Plugin Types
export interface MiddlewarePluginConfig extends PluginConfiguration {
  order: number; // Execution order in middleware chain
  conditions?: {
    requestPatterns?: string[];
    backendTypes?: string[];
    userTypes?: string[];
  };
}

export interface MiddlewareContext {
  request: ClaudetteRequest;
  response?: ClaudetteResponse;
  backend?: string;
  startTime: number;
  metadata: Record<string, any>;
}

// Plugin Events
export interface PluginEvent {
  type: PluginEventType;
  pluginId: string;
  timestamp: number;
  data?: any;
}

export enum PluginEventType {
  REGISTERED = 'plugin:registered',
  UNREGISTERED = 'plugin:unregistered',
  INITIALIZED = 'plugin:initialized',
  STARTED = 'plugin:started',
  STOPPED = 'plugin:stopped',
  ERROR = 'plugin:error',
  CONFIG_CHANGED = 'plugin:config-changed',
  METRICS_UPDATED = 'plugin:metrics-updated'
}

// Plugin Security Types
export interface PluginSecurity {
  sandbox: boolean;
  permissions: PluginPermission[];
  allowedNetworkHosts?: string[];
  allowedFileSystemPaths?: string[];
  resourceLimits: {
    maxMemoryMB: number;
    maxCpuPercent: number;
    maxExecutionTimeMs: number;
  };
}

// Plugin Development Types
export interface PluginDevelopmentConfig {
  hotReload: boolean;
  debugMode: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  mockData?: Record<string, any>;
  testMode?: boolean;
}

// Plugin Registry Types
export interface PluginRegistryEntry {
  manifest: PluginManifest;
  downloadUrl: string;
  checksum: string;
  publishedAt: string;
  downloads: number;
  rating: number;
  tags: string[];
  verified: boolean;
}

export interface PluginSearchQuery {
  query?: string;
  category?: PluginCategory;
  tags?: string[];
  author?: string;
  verified?: boolean;
  minRating?: number;
  limit?: number;
  offset?: number;
}

// Plugin Validation Types
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
  suggestion?: string;
}

// Plugin Testing Types
export interface PluginTestSuite {
  name: string;
  tests: PluginTest[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

export interface PluginTest {
  name: string;
  description: string;
  test: () => Promise<void>;
  timeout?: number;
  skip?: boolean;
}

// Utility Types
export type PluginConstructor<T = any> = new (...args: any[]) => T;

export interface PluginFactory<T = any> {
  create(config: any): T;
  validate(config: any): ValidationResult;
  getCapabilities(): any;
}

// Advanced Plugin Types
export interface CompositePlugin {
  plugins: BasePlugin[];
  orchestration: 'sequential' | 'parallel' | 'conditional';
  errorHandling: 'fail-fast' | 'continue-on-error' | 'best-effort';
}

export interface PluginPipeline {
  stages: PluginPipelineStage[];
  name: string;
  description: string;
}

export interface PluginPipelineStage {
  name: string;
  plugins: string[];
  condition?: (context: any) => boolean;
  timeout?: number;
  retries?: number;
}

// Export all enums and interfaces
export * from './plugin-sdk';
