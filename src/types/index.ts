// Core type definitions for Claudette

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

export interface CacheEntry {
  cache_key: string;
  prompt_hash: string;
  response: ClaudetteResponse;
  created_at: string;
  expires_at: string;
  access_count: number;
  last_accessed: string;
}

export interface CacheStats {
  total_requests: number;
  cache_hits: number;
  cache_misses: number;
  hit_rate: number;
  size_mb: number;
  entries_count: number;
}

// Backend interface
export interface Backend {
  name: string;
  isAvailable(): Promise<boolean>;
  estimateCost(tokens: number): number;
  getLatencyScore(): Promise<number>;
  send(request: ClaudetteRequest): Promise<ClaudetteResponse>;
  validateConfig(): boolean;
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