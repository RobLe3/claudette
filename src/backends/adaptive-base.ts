// Adaptive Backend with Dynamic Timeouts and Async Pipeline Contribution
// Enhanced for self-hosted LLMs with slower response times but valuable contributions

import { 
  Backend, 
  BackendSettings, 
  BackendInfo,
  ClaudetteRequest, 
  ClaudetteResponse, 
  BackendError 
} from '../types/index';
import {
  createErrorResponse,
  determineRetryability,
  estimateTokens as sharedEstimateTokens,
  prepareStandardRequest
} from './shared-utils';

export interface AdaptiveBackendSettings extends BackendSettings {
  // Timeout configuration
  base_timeout_ms?: number;        // Base timeout (default: 30s)
  max_timeout_ms?: number;         // Maximum timeout (default: 180s)
  timeout_multiplier?: number;     // Multiplier for adaptive timeout (default: 1.5)
  
  // Health checking
  health_check_interval_ms?: number; // Health check frequency (default: 30s)
  health_check_timeout_ms?: number;  // Health check timeout (default: 10s)
  consecutive_failures_threshold?: number; // Failures before marking unhealthy (default: 3)
  
  // Async contribution
  async_contribution_enabled?: boolean; // Enable async pipeline contribution (default: true)
  contribution_timeout_ms?: number;     // Max time to wait for async contribution (default: 300s)
  priority_boost_on_success?: number;   // Priority boost for successful contributions (default: 0.1)
  
  // Performance adaptation
  latency_adaptation_enabled?: boolean; // Enable timeout adaptation based on latency (default: true)
  success_rate_threshold?: number;      // Minimum success rate to maintain (default: 0.7)
  
  // Backend type
  backend_type?: 'cloud' | 'self_hosted'; // Backend classification
}

export interface HealthCheckResult {
  healthy: boolean;
  latency_ms: number;
  error?: string;
  timestamp: number;
  consecutive_failures: number;
}

export interface AsyncContribution {
  request_id: string;
  backend_name: string;
  start_time: number;
  timeout_ms: number;
  promise: Promise<ClaudetteResponse>;
  priority: number;
}

export abstract class AdaptiveBaseBackend implements Backend {
  public readonly name: string;
  protected config: AdaptiveBackendSettings;
  protected recentLatencies: number[] = [];
  protected healthHistory: HealthCheckResult[] = [];
  protected asyncContributions: Map<string, AsyncContribution> = new Map();
  
  // Memory management for async contributions
  private readonly MAX_ASYNC_CONTRIBUTIONS = 1000;
  private readonly CONTRIBUTION_CLEANUP_INTERVAL = 60000; // 1 minute
  private contributionCleanupTimer?: NodeJS.Timeout;
  
  // Health tracking
  protected lastHealthCheck: number = 0;
  protected isHealthy: boolean = true;
  protected consecutiveFailures: number = 0;
  
  // Adaptive timeout tracking
  protected currentTimeoutMs: number;
  protected successfulRequests: number = 0;
  protected totalRequests: number = 0;

  constructor(name: string, config: AdaptiveBackendSettings) {
    this.name = name;
    this.config = {
      base_timeout_ms: 30000,
      max_timeout_ms: 180000,
      timeout_multiplier: 1.5,
      health_check_interval_ms: 30000,
      health_check_timeout_ms: 10000,
      consecutive_failures_threshold: 3,
      async_contribution_enabled: true,
      contribution_timeout_ms: 300000,
      priority_boost_on_success: 0.1,
      latency_adaptation_enabled: true,
      success_rate_threshold: 0.7,
      backend_type: 'self_hosted',
      ...config
    };
    
    this.currentTimeoutMs = this.config.base_timeout_ms!;
    
    // Start periodic cleanup of stale async contributions
    this.startContributionCleanup();
  }

  /**
   * Enhanced availability check with health monitoring
   */
  async isAvailable(): Promise<boolean> {
    const now = Date.now();
    const healthCheckInterval = this.config.health_check_interval_ms!;
    
    // Use cached result if recent
    if (now - this.lastHealthCheck < healthCheckInterval && this.healthHistory.length > 0) {
      return this.isHealthy;
    }

    try {
      const healthResult = await this.performHealthCheck();
      this.updateHealthStatus(healthResult);
      this.lastHealthCheck = now;
      
      return this.isHealthy;
    } catch (error) {
      const healthResult: HealthCheckResult = {
        healthy: false,
        latency_ms: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: now,
        consecutive_failures: this.consecutiveFailures + 1
      };
      
      this.updateHealthStatus(healthResult);
      this.lastHealthCheck = now;
      return false;
    }
  }

  /**
   * Perform health check with timeout
   */
  protected async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const timeout = this.config.health_check_timeout_ms!;
    
    try {
      const healthPromise = this.healthCheck();
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), timeout)
      );
      
      const isHealthy = await Promise.race([healthPromise, timeoutPromise]);
      const latency = Date.now() - startTime;
      
      return {
        healthy: isHealthy,
        latency_ms: latency,
        timestamp: startTime,
        consecutive_failures: isHealthy ? 0 : this.consecutiveFailures + 1
      };
    } catch (error) {
      return {
        healthy: false,
        latency_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: startTime,
        consecutive_failures: this.consecutiveFailures + 1
      };
    }
  }

  /**
   * Update health status based on check result
   */
  protected updateHealthStatus(result: HealthCheckResult): void {
    this.healthHistory.push(result);
    
    // Keep only recent health checks (last 20)
    if (this.healthHistory.length > 20) {
      this.healthHistory.shift();
    }
    
    this.consecutiveFailures = result.consecutive_failures;
    this.isHealthy = result.healthy && 
                    this.consecutiveFailures < this.config.consecutive_failures_threshold!;
    
    // Adapt timeout based on health and performance
    if (this.config.latency_adaptation_enabled) {
      this.adaptTimeout(result);
    }
  }

  /**
   * Adapt timeout based on performance metrics
   */
  protected adaptTimeout(healthResult: HealthCheckResult): void {
    const baseTimeout = this.config.base_timeout_ms!;
    const maxTimeout = this.config.max_timeout_ms!;
    const multiplier = this.config.timeout_multiplier!;
    
    if (healthResult.healthy && healthResult.latency_ms > 0) {
      // Increase timeout based on observed latency
      const adaptedTimeout = Math.min(
        healthResult.latency_ms * multiplier,
        maxTimeout
      );
      
      this.currentTimeoutMs = Math.max(adaptedTimeout, baseTimeout);
    } else if (!healthResult.healthy) {
      // Increase timeout on failures to give more time
      this.currentTimeoutMs = Math.min(
        this.currentTimeoutMs * multiplier,
        maxTimeout
      );
    }
  }

  /**
   * Send request with adaptive timeout and async contribution support
   */
  async send(request: ClaudetteRequest): Promise<ClaudetteResponse> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    
    this.totalRequests++;
    
    try {
      // Create main request promise with adaptive timeout
      const requestPromise = this.sendRequest(request);
      const timeoutPromise = this.createTimeoutPromise(requestId);
      
      // Handle async contribution if enabled
      if (this.config.async_contribution_enabled) {
        this.setupAsyncContribution(requestId, request, startTime);
      }
      
      // Race between request and timeout
      const response = await Promise.race([requestPromise, timeoutPromise]);
      
      this.onRequestSuccess(startTime);
      return response;
      
    } catch (error) {
      this.onRequestFailure(error, startTime);
      throw error;
    } finally {
      this.cleanupAsyncContribution(requestId);
    }
  }

  /**
   * Setup async contribution for pipeline processing
   */
  protected setupAsyncContribution(
    requestId: string, 
    request: ClaudetteRequest, 
    startTime: number
  ): void {
    const contributionTimeout = this.config.contribution_timeout_ms!;
    const requestPromise = this.sendRequest(request);
    
    // Security fix: Enforce memory limits on async contributions
    if (this.asyncContributions.size >= this.MAX_ASYNC_CONTRIBUTIONS) {
      this.cleanupStaleContributions();
    }
    
    const contribution: AsyncContribution = {
      request_id: requestId,
      backend_name: this.name,
      start_time: startTime,
      timeout_ms: contributionTimeout,
      promise: requestPromise,
      priority: this.config.priority
    };
    
    this.asyncContributions.set(requestId, contribution);
    
    // Setup contribution timeout cleanup
    setTimeout(() => {
      this.cleanupAsyncContribution(requestId);
    }, contributionTimeout);
  }

  /**
   * Create timeout promise with adaptive timing
   */
  protected createTimeoutPromise(requestId: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new BackendError(
          `Request ${requestId} timed out after ${this.currentTimeoutMs}ms`,
          this.name,
          true // Timeout errors are retryable
        ));
      }, this.currentTimeoutMs);
    });
  }

  /**
   * Handle successful request
   */
  protected onRequestSuccess(startTime: number): void {
    const latency = Date.now() - startTime;
    this.recordLatency(latency);
    this.successfulRequests++;
    this.consecutiveFailures = 0;
    
    // Boost priority on consistent success
    if (this.getSuccessRate() > this.config.success_rate_threshold!) {
      this.config.priority += this.config.priority_boost_on_success!;
    }
  }

  /**
   * Handle failed request
   */
  protected onRequestFailure(error: any, startTime: number): void {
    const latency = Date.now() - startTime;
    this.recordLatency(latency);
    this.consecutiveFailures++;
    
    // Reduce priority on failures
    if (this.consecutiveFailures > 1) {
      this.config.priority = Math.max(0.1, this.config.priority * 0.9);
    }
  }

  /**
   * Get current success rate
   */
  protected getSuccessRate(): number {
    return this.totalRequests > 0 ? this.successfulRequests / this.totalRequests : 0;
  }

  /**
   * Cleanup async contribution
   */
  protected cleanupAsyncContribution(requestId: string): void {
    this.asyncContributions.delete(requestId);
  }
  
  /**
   * Security fix: Start periodic cleanup of stale async contributions
   */
  private startContributionCleanup(): void {
    this.contributionCleanupTimer = setInterval(() => {
      this.cleanupStaleContributions();
    }, this.CONTRIBUTION_CLEANUP_INTERVAL);
    
    // Ensure cleanup happens on process exit
    process.on('exit', () => this.stopContributionCleanup());
    process.on('SIGINT', () => this.stopContributionCleanup());
    process.on('SIGTERM', () => this.stopContributionCleanup());
  }
  
  /**
   * Security fix: Clean up stale async contributions to prevent memory leaks
   */
  private cleanupStaleContributions(): void {
    const now = Date.now();
    const stalledContributions: string[] = [];
    
    for (const [requestId, contribution] of this.asyncContributions.entries()) {
      const age = now - contribution.start_time;
      // Remove contributions older than their timeout + 30 seconds grace period
      if (age > contribution.timeout_ms + 30000) {
        stalledContributions.push(requestId);
      }
    }
    
    // Remove stalled contributions
    stalledContributions.forEach(requestId => {
      this.asyncContributions.delete(requestId);
    });
    
    // If we still have too many, remove oldest ones
    if (this.asyncContributions.size >= this.MAX_ASYNC_CONTRIBUTIONS) {
      const sortedByAge = Array.from(this.asyncContributions.entries())
        .sort(([, a], [, b]) => a.start_time - b.start_time);
      
      const toRemove = sortedByAge.slice(0, Math.floor(this.MAX_ASYNC_CONTRIBUTIONS * 0.1));
      toRemove.forEach(([requestId]) => {
        this.asyncContributions.delete(requestId);
      });
    }
  }
  
  /**
   * Security fix: Stop contribution cleanup timer
   */
  private stopContributionCleanup(): void {
    if (this.contributionCleanupTimer) {
      clearInterval(this.contributionCleanupTimer);
      this.contributionCleanupTimer = undefined;
    }
  }

  /**
   * Generate unique request ID
   */
  protected generateRequestId(): string {
    return `${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Record latency for scoring and adaptation
   */
  protected recordLatency(latencyMs: number): void {
    this.recentLatencies.push(latencyMs);
    
    // Keep only recent latencies (last 20 requests)
    if (this.recentLatencies.length > 20) {
      this.recentLatencies.shift();
    }
  }


  /**
   * Get pending async contributions
   */
  getAsyncContributions(): AsyncContribution[] {
    return Array.from(this.asyncContributions.values());
  }

  /**
   * Reset health and performance metrics
   */
  resetHealth(): void {
    this.lastHealthCheck = 0;
    this.isHealthy = true;
    this.consecutiveFailures = 0;
    this.currentTimeoutMs = this.config.base_timeout_ms!;
    this.healthHistory = [];
    
    // Security fix: Properly cleanup async contributions and timers
    this.asyncContributions.clear();
    this.stopContributionCleanup();
    this.startContributionCleanup();
  }

  // Abstract methods to be implemented by concrete backends
  abstract healthCheck(): Promise<boolean>;
  abstract sendRequest(request: ClaudetteRequest): Promise<ClaudetteResponse>;

  // Utility methods
  estimateCost(tokens: number): number {
    return (tokens / 1000) * this.config.cost_per_token;
  }

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
      avg_latency: avgLatency,
      current_timeout: this.currentTimeoutMs,
      success_rate: this.totalRequests > 0 ? this.successfulRequests / this.totalRequests : 0
    };
  }

  async getLatencyScore(): Promise<number> {
    if (this.recentLatencies.length === 0) {
      return 1.0;
    }
    const avgLatency = this.recentLatencies.reduce((a, b) => a + b) / this.recentLatencies.length;
    return avgLatency / 1000;
  }

  async validateConfig(): Promise<boolean> {
    return this.config.enabled && 
           this.config.cost_per_token >= 0 &&
           this.config.priority > 0;
  }

  protected createSuccessResponse(
    content: string,
    tokensInput: number,
    tokensOutput: number,
    latencyMs: number,
    metadata?: Record<string, any>
  ): ClaudetteResponse {
    return {
      content,
      backend_used: this.name,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      cost_eur: this.estimateCost(tokensInput + tokensOutput),
      latency_ms: latencyMs,
      cache_hit: false,
      metadata: {
        ...metadata,
        adaptive_timeout: this.currentTimeoutMs,
        success_rate: this.getSuccessRate(),
        backend_type: this.config.backend_type
      }
    };
  }

  /**
   * Create standardized error response using shared utilities
   */
  protected createErrorResponse(error: Error, request: ClaudetteRequest, latencyMs: number = 0): never {
    createErrorResponse(error, this.name, request, latencyMs);
  }

  /**
   * Determine error retryability using shared utilities
   */
  protected isRetryableError(error: Error): boolean {
    return determineRetryability(error);
  }

  /**
   * Estimate tokens using shared utilities
   */
  protected estimateTokens(text: string): number {
    return sharedEstimateTokens(text);
  }

  /**
   * Prepare request using shared utilities for consistency
   */
  protected prepareRequest(request: ClaudetteRequest): {
    prompt: string;
    maxTokens: number;
    temperature: number;
    model: string;
  } {
    return prepareStandardRequest(request, this.config, 'default');
  }
}