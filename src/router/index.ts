// Intelligent backend routing system

import { 
  Backend, 
  BackendScore, 
  RouterOptions, 
  ClaudetteRequest, 
  ClaudetteResponse, 
  BackendError 
} from '../types/index';

export class BackendRouter {
  private backends: Map<string, Backend> = new Map();
  private options: RouterOptions;
  private failureCount: Map<string, number> = new Map();
  private lastFailure: Map<string, number> = new Map();
  private circuitBreakerThreshold = 5;
  private circuitBreakerResetTime = 300000; // 5 minutes

  constructor(options: RouterOptions = {
    cost_weight: 0.4,
    latency_weight: 0.4,
    availability_weight: 0.2,
    fallback_enabled: true
  }) {
    this.options = options;
  }

  /**
   * Register a backend with the router
   */
  registerBackend(backend: Backend): void {
    this.backends.set(backend.name, backend);
    this.failureCount.set(backend.name, 0);
  }

  /**
   * Get all registered backends
   */
  getBackends(): Backend[] {
    return Array.from(this.backends.values());
  }

  /**
   * Get a specific backend by name
   */
  getBackend(name: string): Backend | undefined {
    return this.backends.get(name);
  }

  /**
   * Select the best backend for a request
   */
  async selectBackend(request: ClaudetteRequest, excludeBackends: string[] = []): Promise<Backend> {
    // If specific backend requested, use it (if available)
    if (request.backend) {
      const backend = this.backends.get(request.backend);
      if (backend && await backend.isAvailable() && !excludeBackends.includes(backend.name)) {
        return backend;
      }
      throw new BackendError(`Requested backend '${request.backend}' is not available`, request.backend);
    }

    // Score all available backends
    const scores = await this.scoreBackends(request, excludeBackends);
    
    if (scores.length === 0) {
      throw new BackendError('No available backends', 'router');
    }

    // Sort by score (lower is better)
    scores.sort((a, b) => a.score - b.score);
    
    const selectedBackend = this.backends.get(scores[0]!.backend);
    if (!selectedBackend) {
      throw new BackendError('Selected backend not found', scores[0]!.backend);
    }

    return selectedBackend;
  }

  /**
   * Route request to best available backend with fallback
   */
  async routeRequest(request: ClaudetteRequest): Promise<ClaudetteResponse> {
    const excludeBackends: string[] = [];
    let lastError: Error | null = null;

    // Try up to 3 different backends
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const backend = await this.selectBackend(request, excludeBackends);
        
        // Check circuit breaker
        if (this.isCircuitBreakerOpen(backend.name)) {
          excludeBackends.push(backend.name);
          continue;
        }

        const response = await backend.send(request);
        
        // Reset failure count on success
        this.failureCount.set(backend.name, 0);
        
        return response;
        
      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof BackendError) {
          // Record failure
          this.recordFailure(error.backend || 'unknown');
          
          // Add to exclude list if retryable
          if (error.retryable && error.backend) {
            excludeBackends.push(error.backend);
            continue;
          }
        }
        
        // Non-retryable error, stop trying
        break;
      }
    }

    // All backends failed
    throw lastError || new BackendError('All backends failed', 'router');
  }

  /**
   * Score backends based on cost, latency, and availability
   */
  private async scoreBackends(request: ClaudetteRequest, excludeBackends: string[]): Promise<BackendScore[]> {
    const scores: BackendScore[] = [];
    const estimatedTokens = this.estimateRequestTokens(request);

    for (const [name, backend] of this.backends) {
      // Skip if excluded or not available
      if (excludeBackends.includes(name) || !await backend.isAvailable()) {
        continue;
      }

      // Skip if circuit breaker is open
      if (this.isCircuitBreakerOpen(name)) {
        continue;
      }

      const costScore = backend.estimateCost(estimatedTokens);
      const latencyScore = await backend.getLatencyScore();
      const availabilityScore = this.getAvailabilityScore(name);

      // Weighted composite score (lower is better)
      const totalScore = 
        (costScore * this.options.cost_weight) +
        (latencyScore * this.options.latency_weight) +
        (availabilityScore * this.options.availability_weight);

      scores.push({
        backend: name,
        score: totalScore,
        cost_score: costScore,
        latency_score: latencyScore,
        availability: availabilityScore < 0.5, // True if score is low (good)
        estimated_cost: costScore,
        estimated_latency: latencyScore * 1000 // Convert to ms
      });
    }

    return scores;
  }

  /**
   * Estimate tokens for request (for cost calculation)
   */
  private estimateRequestTokens(request: ClaudetteRequest): number {
    let totalLength = request.prompt.length;
    
    if (request.files) {
      totalLength += request.files.join('').length;
    }
    
    // Rough estimation: ~4 characters per token
    // Add estimated response tokens (assume similar length to prompt)
    return Math.ceil(totalLength / 4) * 2;
  }

  /**
   * Get availability score based on recent failures
   */
  private getAvailabilityScore(backendName: string): number {
    const failures = this.failureCount.get(backendName) || 0;
    const lastFailureTime = this.lastFailure.get(backendName) || 0;
    const timeSinceFailure = Date.now() - lastFailureTime;
    
    // Base score from failure count (0-1, lower is better)
    let score = Math.min(failures / 10, 1.0);
    
    // Reduce score over time since last failure
    if (timeSinceFailure > 60000) { // 1 minute
      score *= Math.max(0.1, 1 - (timeSinceFailure / 3600000)); // Decay over 1 hour
    }
    
    return score;
  }

  /**
   * Record a backend failure
   */
  private recordFailure(backendName: string): void {
    const currentCount = this.failureCount.get(backendName) || 0;
    this.failureCount.set(backendName, currentCount + 1);
    this.lastFailure.set(backendName, Date.now());
  }

  /**
   * Check if circuit breaker is open for a backend
   */
  private isCircuitBreakerOpen(backendName: string): boolean {
    const failures = this.failureCount.get(backendName) || 0;
    const lastFailureTime = this.lastFailure.get(backendName) || 0;
    
    if (failures < this.circuitBreakerThreshold) {
      return false;
    }
    
    // Check if enough time has passed to reset
    const timeSinceFailure = Date.now() - lastFailureTime;
    if (timeSinceFailure > this.circuitBreakerResetTime) {
      this.failureCount.set(backendName, 0);
      return false;
    }
    
    return true;
  }

  /**
   * Get router statistics
   */
  getStats(): {
    backends: { name: string; failures: number; circuitBreakerOpen: boolean }[];
    routingOptions: RouterOptions;
  } {
    const backends = Array.from(this.backends.keys()).map(name => ({
      name,
      failures: this.failureCount.get(name) || 0,
      circuitBreakerOpen: this.isCircuitBreakerOpen(name)
    }));

    return {
      backends,
      routingOptions: this.options
    };
  }

  /**
   * Reset all failure counts (useful for testing)
   */
  resetFailures(): void {
    this.failureCount.clear();
    this.lastFailure.clear();
  }

  /**
   * Update routing options
   */
  updateOptions(options: Partial<RouterOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Health check for all backends
   */
  async healthCheckAll(): Promise<{ name: string; healthy: boolean }[]> {
    const results = [];
    
    for (const [name, backend] of this.backends) {
      const healthy = await backend.isAvailable();
      results.push({ name, healthy });
    }
    
    return results;
  }
}