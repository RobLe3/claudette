// Base backend interface and abstract implementation

import { 
  Backend, 
  BackendSettings, 
  BackendInfo,
  ClaudetteRequest, 
  ClaudetteResponse, 
  BackendError 
} from '../types/index';
import {
  retrieveApiKey,
  createErrorResponse,
  determineRetryability,
  estimateTokens as sharedEstimateTokens,
  prepareStandardRequest
} from './shared-utils';
import { secureLogger, logHealthCheck, logBackendRequest } from '../utils/secure-logger';

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
    const startTime = Date.now();
    
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return this.isHealthy;
    }

    try {
      this.isHealthy = this.config.enabled && await this.validateConfig() && await this.healthCheck();
      this.lastHealthCheck = now;
      
      // Log health check result
      const latency = Date.now() - startTime;
      logHealthCheck(this.name, this.isHealthy, undefined, latency);
      
      return this.isHealthy;
    } catch (error) {
      this.isHealthy = false;
      this.lastHealthCheck = now;
      
      // Log health check failure
      const latency = Date.now() - startTime;
      logHealthCheck(this.name, false, error as Error, latency);
      
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
   * Uses shared utilities for consistent error handling
   */
  protected createErrorResponse(
    error: Error, 
    request: ClaudetteRequest,
    latencyMs: number = 0
  ): never {
    createErrorResponse(error, this.name, request, latencyMs);
  }

  /**
   * Determine if an error is retryable
   * Uses shared utilities for consistent retryability logic
   */
  protected isRetryableError(error: Error): boolean {
    return determineRetryability(error);
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

    const cost = this.estimateCost(tokensInput + tokensOutput);
    
    // Log successful backend request
    logBackendRequest(
      this.name,
      true,
      latencyMs,
      { input: tokensInput, output: tokensOutput },
      cost
    );

    return {
      content,
      backend_used: this.name,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      cost_eur: cost,
      latency_ms: latencyMs,
      cache_hit: false,
      metadata
    };
  }

  /**
   * Utility to count tokens (rough estimate)
   * Uses shared utilities for consistent token estimation
   */
  protected estimateTokens(text: string): number {
    return sharedEstimateTokens(text);
  }

  /**
   * Unified API key retrieval method for all backends
   * Uses shared utilities for consistent API key retrieval
   * Follows standardized fallback hierarchy:
   * 1. Configuration file
   * 2. Environment variables
   * 3. Credential storage
   */
  protected async getApiKey(keyName: string, envVars: string[] = []): Promise<string | null> {
    return await retrieveApiKey(
      {
        credentialKey: keyName,
        environmentKeys: envVars,
        backendName: this.name
      },
      this.config.api_key
    );
  }

  /**
   * Prepare request with backend-specific options
   * Uses shared utilities for consistent request preparation
   */
  protected prepareRequest(request: ClaudetteRequest): {
    prompt: string;
    maxTokens: number;
    temperature: number;
    model: string;
  } {
    // Use backend-specific default model instead of 'default'
    const defaultModel = this.config.model || this.getDefaultModel();
    return prepareStandardRequest(request, this.config, defaultModel);
  }

  /**
   * Get the default model for this backend - to be overridden by concrete implementations
   */
  protected getDefaultModel(): string {
    return 'unknown'; // Safe fallback
  }
}