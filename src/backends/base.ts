// Base backend interface and abstract implementation

import { 
  Backend, 
  BackendSettings, 
  BackendInfo,
  ClaudetteRequest, 
  ClaudetteResponse, 
  BackendError 
} from '../types/index';
import { getCredentialManager } from '../credentials';

export abstract class BaseBackend implements Backend {
  public readonly name: string;
  protected config: BackendSettings;
  protected recentLatencies: number[] = [];
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number = 60000; // 1 minute
  private isHealthy: boolean = true;

  constructor(name: string, config: BackendSettings) {
    this.name = name;
    this.config = config;
  }

  /**
   * Check if backend is available and properly configured
   */
  async isAvailable(): Promise<boolean> {
    // Cache health checks to avoid excessive API calls
    const now = Date.now();
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return this.isHealthy;
    }

    try {
      this.isHealthy = this.config.enabled && await this.validateConfig() && await this.healthCheck();
      this.lastHealthCheck = now;
      return this.isHealthy;
    } catch (error) {
      this.isHealthy = false;
      this.lastHealthCheck = now;
      return false;
    }
  }

  /**
   * Estimate cost for given number of tokens
   */
  estimateCost(tokens: number): number {
    return (tokens / 1000) * this.config.cost_per_token;
  }

  /**
   * Get recent average latency score (lower is better)
   */
  async getLatencyScore(): Promise<number> {
    if (this.recentLatencies.length === 0) {
      return 1.0; // Default neutral score
    }

    const avgLatency = this.recentLatencies.reduce((a, b) => a + b) / this.recentLatencies.length;
    return avgLatency / 1000; // Convert to seconds
  }

  /**
   * Record latency for scoring
   */
  protected recordLatency(latencyMs: number): void {
    this.recentLatencies.push(latencyMs);
    
    // Keep only recent latencies (last 10 requests)
    if (this.recentLatencies.length > 10) {
      this.recentLatencies.shift();
    }
  }

  /**
   * Validate backend configuration
   */
  async validateConfig(): Promise<boolean> {
    return this.config.enabled && 
           this.config.cost_per_token >= 0 &&
           this.config.priority > 0;
  }

  /**
   * Health check implementation - should be overridden by concrete backends
   */
  protected async healthCheck(): Promise<boolean> {
    return true;
  }

  /**
   * Send request to backend - must be implemented by concrete backends
   */
  abstract send(request: ClaudetteRequest): Promise<ClaudetteResponse>;

  /**
   * Get backend-specific information
   */
  getInfo(): BackendInfo {
    const avgLatency = this.recentLatencies.length > 0
      ? this.recentLatencies.reduce((a, b) => a + b) / this.recentLatencies.length
      : undefined;

    return {
      name: this.name,
      type: (this.config.backend_type === 'self_hosted') ? 'self_hosted' : 'cloud',
      model: this.config.model || 'unknown',
      priority: this.config.priority,
      cost_per_token: this.config.cost_per_token,
      healthy: this.isHealthy,
      avg_latency: avgLatency
    };
  }

  /**
   * Reset health status (useful for retry logic)
   */
  resetHealth(): void {
    this.lastHealthCheck = 0;
    this.isHealthy = true;
  }

  /**
   * Utility method to create standardized error responses
   */
  protected createErrorResponse(
    error: Error, 
    request: ClaudetteRequest,
    latencyMs: number = 0
  ): never {
    throw new BackendError(
      `${this.name} backend error: ${error.message}`,
      this.name,
      this.isRetryableError(error)
    );
  }

  /**
   * Determine if an error is retryable
   */
  protected isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'ECONNRESET',
      'ENOTFOUND', 
      'ETIMEDOUT',
      'rate_limited',
      'server_error',
      'timeout'
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(retryable => errorMessage.includes(retryable));
  }

  /**
   * Create successful response with common fields
   */
  protected createSuccessResponse(
    content: string,
    tokensInput: number,
    tokensOutput: number,
    latencyMs: number,
    metadata?: Record<string, any>
  ): ClaudetteResponse {
    this.recordLatency(latencyMs);

    return {
      content,
      backend_used: this.name,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      cost_eur: this.estimateCost(tokensInput + tokensOutput),
      latency_ms: latencyMs,
      cache_hit: false,
      metadata
    };
  }

  /**
   * Utility to count tokens (rough estimate)
   */
  protected estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Unified API key retrieval method for all backends
   * Follows standardized fallback hierarchy:
   * 1. Configuration file
   * 2. Environment variables
   * 3. Credential storage
   */
  protected async getApiKey(keyName: string, envVars: string[] = []): Promise<string | null> {
    // Try config first
    if (this.config.api_key) {
      return this.config.api_key;
    }

    // Try environment variables
    for (const envVar of envVars) {
      if (process.env[envVar]) {
        return process.env[envVar];
      }
    }

    // Try credential storage with standardized naming
    try {
      const credentialManager = getCredentialManager();
      const stored = await credentialManager.retrieve(`claudette-${this.name}`) ||
                     await credentialManager.retrieve(keyName);
      return stored;
    } catch (error) {
      console.warn(`Failed to retrieve ${this.name} API key from credential storage:`, error);
      return null;
    }
  }

  /**
   * Prepare request with backend-specific options
   */
  protected prepareRequest(request: ClaudetteRequest): {
    prompt: string;
    maxTokens: number;
    temperature: number;
    model: string;
  } {
    return {
      prompt: request.prompt,
      maxTokens: request.options?.max_tokens || this.config.max_tokens || 4000,
      temperature: request.options?.temperature || this.config.temperature || 0.7,
      model: request.options?.model || this.config.model || 'default'
    };
  }
}