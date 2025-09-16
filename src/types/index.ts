// Core type definitions for Claudette

// Cache types defined locally to avoid import issues
export interface CacheStats {
  hit_rate: number;
  total_requests: number;
  cache_hits: number;
  cache_misses: number;
  memory_usage: number;
  persistent_entries: number;
  size_mb?: number;
  entries_count?: number;
}

export interface CacheEntry {
  key: string;
  value: ClaudetteResponse;
  timestamp: number;
  ttl: number;
  access_count: number;
  compressed?: boolean;
}

export interface ClaudetteConfig {
  backends: BackendConfig;
  features: FeatureConfig;
  thresholds: ThresholdConfig;
  database?: DatabaseConfig;
}

export interface BackendConfig {
  claude: BackendSettings;
  openai: BackendSettings;
  mistral: BackendSettings;
  ollama: BackendSettings;
  qwen: BackendSettings;
}

export interface BackendSettings {
  enabled: boolean;
  priority: number;
  cost_per_token: number;
  api_key?: string;
  base_url?: string;
  model?: string;
  max_tokens?: number;
  temperature?: number;
  backend_type?: 'cloud' | 'self_hosted';
}

export interface FeatureConfig {
  caching: boolean;
  cost_optimization: boolean;
  performance_monitoring: boolean;
  smart_routing: boolean;
  mcp_integration: boolean;
  compression: boolean;
  summarization: boolean;
}

export interface ThresholdConfig {
  cache_ttl: number;
  max_cache_size: number;
  cost_warning: number;
  max_context_tokens: number;
  compression_threshold: number;
  request_timeout?: number;
}

export interface DatabaseConfig {
  path: string;
  cache_path: string;
  backup_enabled: boolean;
  auto_vacuum: boolean;
}

// Request/Response types
export interface ClaudetteRequest {
  prompt: string;
  files?: string[];
  backend?: string;
  options?: RequestOptions;
  metadata?: Record<string, any>;
  model?: string;
  context?: string;
  temperature?: number;
}

export interface RequestOptions {
  max_tokens?: number;
  temperature?: number;
  model?: string;
  stream?: boolean;
  cache_key?: string;
  bypass_cache?: boolean;
  bypass_optimization?: boolean;
}

export interface ClaudetteResponse {
  content: string;
  backend_used: string;
  tokens_input: number;
  tokens_output: number;
  cost_eur: number;
  latency_ms: number;
  cache_hit: boolean;
  compression_ratio?: number;
  metadata?: Record<string, any>;
  usage?: {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
  };
  error?: string;
  cache_layer?: string;
  _compressed_data?: string;
}

// Database schema types
export interface QuotaLedgerEntry {
  id: number;
  timestamp: string;
  backend: string;
  prompt_hash: string;
  tokens_input: number;
  tokens_output: number;
  cost_eur: number;
  cache_hit: boolean;
  latency_ms: number;
}

// Cache types are exported from cache/index.ts to avoid duplication

// Backend interface
export interface Backend {
  name: string;
  isAvailable(): Promise<boolean>;
  estimateCost(tokens: number): number;
  getLatencyScore(): Promise<number>;
  send(request: ClaudetteRequest): Promise<ClaudetteResponse>;
  validateConfig(): Promise<boolean>;
  getInfo(): BackendInfo;
}

// Backend info interface
export interface BackendInfo {
  name: string;
  type: 'cloud' | 'self_hosted';
  model: string;
  priority: number;
  cost_per_token: number;
  healthy: boolean;
  avg_latency?: number;
  current_timeout?: number;
  success_rate?: number;
  quality_tier?: 'excellent' | 'good' | 'fair' | 'poor';
  calibration_confidence?: number;
  performance_trend?: 'improving' | 'stable' | 'degrading';
  last_calibration?: number;
}

// Hook system types
export interface HookContext {
  hook_name: string;
  task_description?: string;
  file_path?: string;
  task_id?: string;
  session_id?: string;
  metadata?: Record<string, any>;
}

export interface HookResult {
  success: boolean;
  message?: string;
  data?: any;
  duration_ms: number;
}

// Router types
export interface BackendScore {
  backend: string;
  score: number;
  cost_score: number;
  latency_score: number;
  availability: boolean;
  estimated_cost: number;
  estimated_latency: number;
}

export interface RouterOptions {
  cost_weight: number;
  latency_weight: number;
  availability_weight: number;
  fallback_enabled: boolean;
}

// Compression types
export interface CompressionResult {
  compressed_content: string;
  original_size: number;
  compressed_size: number;
  compression_ratio: number;
  method: 'zstd' | 'summarization' | 'hybrid';
}

// Error types
export class ClaudetteError extends Error {
  constructor(
    message: string,
    public code: string,
    public backend?: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ClaudetteError';
  }
}

export class BackendError extends ClaudetteError {
  constructor(message: string, backend: string, retryable: boolean = true) {
    super(message, 'BACKEND_ERROR', backend, retryable);
    this.name = 'BackendError';
  }
}

export class CacheError extends ClaudetteError {
  constructor(message: string, retryable: boolean = false) {
    super(message, 'CACHE_ERROR', undefined, retryable);
    this.name = 'CacheError';
  }
}

export class DatabaseError extends ClaudetteError {
  constructor(message: string, retryable: boolean = false) {
    super(message, 'DATABASE_ERROR', undefined, retryable);
    this.name = 'DatabaseError';
  }
}

// RAG System types
export interface RAGProvider {
  name: string;
  initialize(): Promise<void>;
  query(request: RAGQuery): Promise<RAGResult[]>;
  isAvailable(): Promise<boolean>;
  getMetadata(): RAGProviderMetadata;
}

export interface RAGQuery {
  query: string;
  context?: string;
  maxResults?: number;
  threshold?: number;
  metadata?: Record<string, any>;
}

export interface RAGResult {
  content: string;
  score: number;
  source: string;
  metadata?: Record<string, any>;
  relationships?: GraphRelationship[];
}

export interface RAGProviderMetadata {
  name: string;
  version: string;
  type: 'vector' | 'graph' | 'hybrid';
  capabilities: string[];
}

export interface GraphRelationship {
  type: string;
  target: string;
  weight: number;
  properties?: Record<string, any>;
}

// Cache Provider types
export interface CacheProvider {
  name: string;
  initialize(): Promise<void>;
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  getStats(): Promise<CacheStats>;
  isAvailable(): Promise<boolean>;
}

// Logger interface
export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  fatal(message: string, ...args: any[]): void;
}

