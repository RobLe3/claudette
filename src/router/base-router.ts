// Base Router Implementation for Claudette
// Provides foundational routing logic for multi-backend AI systems

import { 
  ClaudetteRequest, 
  ClaudetteResponse, 
  BackendScore, 
  RouterOptions,
  Backend,
  ClaudetteError
} from '../types/index';

export interface BaseRouterConfig {
  cost_weight: number;
  latency_weight: number;
  availability_weight: number;
  fallback_enabled: boolean;
  max_retries: number;
  retry_delay_ms: number;
}

export abstract class BaseRouter {
  protected config: BaseRouterConfig;
  protected backends: Map<string, Backend>;

  constructor(config: Partial<BaseRouterConfig> = {}) {
    this.config = {
      cost_weight: 0.4,
      latency_weight: 0.4,
      availability_weight: 0.2,
      fallback_enabled: true,
      max_retries: 2,
      retry_delay_ms: 1000,
      ...config
    };
    this.backends = new Map();
  }

  /**
   * Register a backend with the router
   */
  registerBackend(name: string, backend: Backend): void {
    this.backends.set(name, backend);
  }

  /**
   * Remove a backend from the router
   */
  unregisterBackend(name: string): boolean {
    return this.backends.delete(name);
  }

  /**
   * Get all registered backends
   */
  getBackends(): Map<string, Backend> {
    return new Map(this.backends);
  }

  /**
   * Abstract method to select the best backend for a request
   * Must be implemented by concrete router classes
   */
  abstract selectBackend(request: ClaudetteRequest): Promise<string>;

  /**
   * Abstract method to route a request to the selected backend
   * Must be implemented by concrete router classes
   */
  abstract route(request: ClaudetteRequest): Promise<ClaudetteResponse>;

  /**
   * Calculate backend scores based on cost, latency, and availability
   */
  protected async calculateBackendScores(
    request: ClaudetteRequest
  ): Promise<BackendScore[]> {
    const scores: BackendScore[] = [];
    const estimatedTokens = this.estimateTokens(request.prompt);

    for (const [name, backend] of this.backends) {
      try {
        const availability = await backend.isAvailable();
        const estimatedCost = backend.estimateCost(estimatedTokens);
        const latencyScore = await backend.getLatencyScore();

        // Normalize scores (lower is better for cost and latency)
        const costScore = this.normalizeCostScore(estimatedCost);
        const normalizedLatencyScore = this.normalizeLatencyScore(latencyScore);

        // Calculate weighted score
        const score = (
          costScore * this.config.cost_weight +
          normalizedLatencyScore * this.config.latency_weight +
          (availability ? 1 : 0) * this.config.availability_weight
        );

        scores.push({
          backend: name,
          score,
          cost_score: costScore,
          latency_score: normalizedLatencyScore,
          availability,
          estimated_cost: estimatedCost,
          estimated_latency: latencyScore
        });

      } catch (error) {
        // Backend unavailable or error in scoring
        scores.push({
          backend: name,
          score: 0,
          cost_score: 0,
          latency_score: 0,
          availability: false,
          estimated_cost: Infinity,
          estimated_latency: Infinity
        });
      }
    }

    // Sort by score (descending - higher is better)
    return scores.sort((a, b) => b.score - a.score);
  }

  /**
   * Normalize cost score (0-1, where 1 is best/cheapest)
   */
  protected normalizeCostScore(cost: number): number {
    if (cost === 0) return 1;
    if (cost === Infinity) return 0;
    
    // Exponential decay function for cost scoring
    // Lower costs get exponentially higher scores
    const baseCost = 0.001; // €0.001 as reference
    return Math.exp(-cost / baseCost);
  }

  /**
   * Normalize latency score (0-1, where 1 is best/fastest)
   */
  protected normalizeLatencyScore(latency: number): number {
    if (latency === 0) return 1;
    if (latency === Infinity) return 0;
    
    // Exponential decay function for latency scoring
    // Lower latencies get exponentially higher scores
    const baseLatency = 1000; // 1000ms as reference
    return Math.exp(-latency / baseLatency);
  }

  /**
   * Estimate token count from prompt (simple approximation)
   */
  protected estimateTokens(prompt: string): number {
    // Rough approximation: 1 token ≈ 4 characters for English text
    return Math.ceil(prompt.length / 4);
  }

  /**
   * Execute request with retry logic
   */
  protected async executeWithRetry(
    backend: Backend,
    request: ClaudetteRequest,
    maxRetries: number = this.config.max_retries
  ): Promise<ClaudetteResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await backend.send(request);
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry if it's not a retryable error
        if (error instanceof ClaudetteError && !error.retryable) {
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Wait before retrying
        await this.delay(this.config.retry_delay_ms * (attempt + 1));
      }
    }

    throw new ClaudetteError(
      `Backend request failed after ${maxRetries + 1} attempts: ${lastError?.message}`,
      'MAX_RETRIES_EXCEEDED',
      backend.name,
      false
    );
  }

  /**
   * Delay utility for retry logic
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get fallback backends in order of preference
   */
  protected async getFallbackBackends(
    primaryBackend: string,
    request: ClaudetteRequest
  ): Promise<string[]> {
    if (!this.config.fallback_enabled) {
      return [];
    }

    const scores = await this.calculateBackendScores(request);
    return scores
      .filter(score => score.backend !== primaryBackend && score.availability)
      .map(score => score.backend);
  }

  /**
   * Update router configuration
   */
  updateConfig(newConfig: Partial<BaseRouterConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current router configuration
   */
  getConfig(): BaseRouterConfig {
    return { ...this.config };
  }

  /**
   * Get router statistics
   */
  async getStats(): Promise<{
    registered_backends: number;
    available_backends: number;
    backend_scores: BackendScore[];
  }> {
    const testRequest: ClaudetteRequest = {
      prompt: "test",
      files: []
    };

    const scores = await this.calculateBackendScores(testRequest);
    const availableBackends = scores.filter(s => s.availability).length;

    return {
      registered_backends: this.backends.size,
      available_backends: availableBackends,
      backend_scores: scores
    };
  }

  /**
   * Health check for all registered backends
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};
    
    for (const [name, backend] of this.backends) {
      try {
        health[name] = await backend.isAvailable();
      } catch (error) {
        health[name] = false;
      }
    }

    return health;
  }

  /**
   * Validate router configuration
   */
  validateConfig(): boolean {
    // Check that weights sum to approximately 1.0
    const totalWeight = this.config.cost_weight + 
                       this.config.latency_weight + 
                       this.config.availability_weight;
    
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      throw new ClaudetteError(
        `Router weights must sum to 1.0, got ${totalWeight}`,
        'INVALID_CONFIG'
      );
    }

    // Check that we have at least one backend
    if (this.backends.size === 0) {
      throw new ClaudetteError(
        'Router must have at least one registered backend',
        'NO_BACKENDS'
      );
    }

    return true;
  }
}

export default BaseRouter;