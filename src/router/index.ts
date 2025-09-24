// Intelligent backend routing system

import { 
  Backend, 
  BackendScore, 
  RouterOptions, 
  ClaudetteRequest, 
  ClaudetteResponse, 
  BackendError 
} from '../types/index';
import { secureLogger, logBackendSelection, logCircuitBreaker } from '../utils/secure-logger';
import { AdvancedCircuitBreaker, CircuitBreakerConfig, CircuitState } from './advanced-circuit-breaker';
import { modelSelector } from '../intelligence/model-selector';
import { TIMEOUT_HIERARCHY, getHarmonizedTimeout } from '../config/harmonized-timeouts';

export class BackendRouter {
  private backends: Map<string, Backend> = new Map();
  private options: RouterOptions;
  private failureCount: Map<string, number> = new Map();
  private lastFailure: Map<string, number> = new Map();
  private healthCache: Map<string, { healthy: boolean; expiry: number }> = new Map();
  private circuitBreakers: Map<string, AdvancedCircuitBreaker> = new Map();
  private circuitBreakerThreshold = 5;
  private circuitBreakerResetTime = 300000; // 5 minutes
  private readonly HEALTH_CACHE_TTL = 60000; // 60 seconds cache for health checks - reduced frequency
  // HARMONIZED TIMEOUTS - Claude Code Compatible
  private readonly HEALTH_CHECK_TIMEOUT = TIMEOUT_HIERARCHY.HEALTH_CHECK_BASE; // 8s - harmonized for all backends
  private readonly AVAILABILITY_CHECK_TIMEOUT = getHarmonizedTimeout('health_check', undefined, true); // 8s + retries
  private readonly BACKGROUND_HEALTH_CHECK_TIMEOUT = TIMEOUT_HIERARCHY.HEALTH_CHECK_MAX; // 12s - prevents interference
  private backgroundHealthCheckInterval: NodeJS.Timeout | null = null;
  
  // Performance optimization: Circuit breaker state cache
  private circuitBreakerCache = new Map<string, { open: boolean, lastCheck: number }>();

  constructor(options: RouterOptions = {
    cost_weight: 0.4,
    latency_weight: 0.4,
    availability_weight: 0.2,
    fallback_enabled: true
  }) {
    this.options = options;
    
    // Start background health checking to warm cache
    this.startBackgroundHealthChecks();
  }

  /**
   * Register a backend with the router
   */
  registerBackend(backend: Backend): void {
    this.backends.set(backend.name, backend);
    this.failureCount.set(backend.name, 0);
    
    // Initialize advanced circuit breaker for this backend - HARMONIZED
    const circuitBreakerConfig: CircuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeout: TIMEOUT_HIERARCHY.SIMPLE_REQUEST_BASE, // 30s - harmonized reset timeout
      halfOpenMaxCalls: 3,
      failureRateThreshold: 50, // 50% failure rate
      slowCallThreshold: TIMEOUT_HIERARCHY.CONNECTION_ESTABLISHMENT, // 15s - harmonized slow call threshold
      slowCallRateThreshold: 80, // 80% slow calls
      slidingWindowSize: 20
    };
    
    const circuitBreaker = new AdvancedCircuitBreaker(backend.name, circuitBreakerConfig);
    
    // Log circuit breaker state changes
    circuitBreaker.onStateChange((state, reason) => {
      // Map CircuitState to logger expected type
      const loggerState = state === CircuitState.CLOSED ? 'closed' : 
                         state === CircuitState.OPEN ? 'opened' : 'half_open';
      logCircuitBreaker(backend.name, loggerState);
    });
    
    this.circuitBreakers.set(backend.name, circuitBreaker);
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
    try {
      // If specific backend requested, use it (if available)
      if (request.backend) {
        const backend = this.backends.get(request.backend);
        if (backend) {
          try {
            // Use cached health data if available for faster response
            let isAvailable: boolean;
            const cached = this.getHealthFromCache(request.backend);
            if (cached !== null) {
              isAvailable = cached;
            } else {
              isAvailable = await Promise.race([
                backend.isAvailable(),
                new Promise<boolean>((_, reject) => 
                  setTimeout(() => reject(new Error('Backend availability timeout')), this.AVAILABILITY_CHECK_TIMEOUT)
                )
              ]);
              this.cacheHealth(request.backend, isAvailable);
            }
            
            if (isAvailable && !excludeBackends.includes(backend.name)) {
              return backend;
            }
          } catch (availabilityError) {
            const { SecureLogger } = await import('../utils/secure-logger');
            SecureLogger.secureLog('error', `Error checking backend availability for ${request.backend}:`, availabilityError);
            this.cacheHealth(request.backend, false);
            throw new BackendError(
              `Failed to check availability for backend '${request.backend}': ${(availabilityError as Error).message}`, 
              request.backend
            );
          }
        }
        throw new BackendError(`Requested backend '${request.backend}' is not available`, request.backend);
      }

      // Use intelligent model selector for backend choice
      const availableBackendNames = Array.from(this.backends.keys())
        .filter(name => !excludeBackends.includes(name));
      
      // Filter by health/availability
      const healthyBackends = [];
      for (const backendName of availableBackendNames) {
        const backend = this.backends.get(backendName);
        if (backend) {
          try {
            let isAvailable: boolean;
            const cached = this.getHealthFromCache(backendName);
            if (cached !== null) {
              isAvailable = cached;
            } else {
              isAvailable = await Promise.race([
                backend.isAvailable(),
                new Promise<boolean>((_, reject) => 
                  setTimeout(() => reject(new Error('Backend availability timeout')), this.AVAILABILITY_CHECK_TIMEOUT)
                )
              ]);
              this.cacheHealth(backendName, isAvailable);
            }
            
            if (isAvailable) {
              healthyBackends.push(backendName);
            }
          } catch (error) {
            const { SecureLogger } = await import('../utils/secure-logger');
            SecureLogger.secureLog('warn', `Backend ${backendName} availability check failed:`, (error as Error).message);
            this.cacheHealth(backendName, false);
          }
        }
      }
      
      if (healthyBackends.length === 0) {
        throw new BackendError('No healthy backends available', 'router');
      }

      // Use intelligent model selector
      const taskAnalysis = modelSelector.analyzeTask(request);
      const optimalBackendName = modelSelector.selectOptimalBackend(taskAnalysis, healthyBackends);
      
      const selectedBackend = this.backends.get(optimalBackendName);
      if (!selectedBackend) {
        throw new BackendError('Optimal backend not found', optimalBackendName);
      }

      // Log intelligent selection decision
      const reasoning = modelSelector.getSelectionReasoning(taskAnalysis, optimalBackendName);
      console.log(`[IntelligentRouter] ${reasoning.split('\n')[0]}`); // First line only for conciseness
      
      logBackendSelection(
        optimalBackendName,
        healthyBackends,
        [{
          backend: optimalBackendName,
          score: 0, // Score not applicable with intelligent selection
          reason: `task: ${taskAnalysis.task_type}, lang: ${taskAnalysis.language_detected}, complexity: ${taskAnalysis.complexity_score.toFixed(2)}`
        }]
      );

      return selectedBackend;
    } catch (error) {
      // Log the error with secure logging
      secureLogger.error('Backend selection failed', {
        operation: 'selectBackend',
        error_message: (error as Error).message,
        excluded_backends: excludeBackends,
        request_backend: request.backend
      });
      
      // Re-throw if it's already a BackendError, otherwise wrap it
      if (error instanceof BackendError) {
        throw error;
      }
      
      throw new BackendError(
        `Backend selection failed: ${(error as Error).message}`, 
        'router'
      );
    }
  }

  /**
   * Route request to best available backend with fallback
   */
  async routeRequest(request: ClaudetteRequest): Promise<ClaudetteResponse> {
    const excludeBackends: string[] = [];
    let lastError: Error | null = null;

    try {
      // Try up to 3 different backends
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const backend = await this.selectBackend(request, excludeBackends);
          
          // Use advanced circuit breaker
          const circuitBreaker = this.circuitBreakers.get(backend.name);
          if (!circuitBreaker || !circuitBreaker.isCallAllowed()) {
            excludeBackends.push(backend.name);
            continue;
          }

          // Execute request through circuit breaker
          let response: ClaudetteResponse;
          try {
            response = await circuitBreaker.execute(
              () => backend.send(request),
              `send_request_${request.prompt?.substring(0, 50) || 'unknown'}`
            );
          } catch (sendError) {
            const { SecureLogger } = await import('../utils/secure-logger');
            SecureLogger.secureLog('error', `Backend send error for ${backend.name}:`, sendError);
            
            // Create a BackendError for send failures
            const backendError = new BackendError(
              `Backend send failed: ${(sendError as Error).message}`,
              backend.name,
              true // retryable
            );
            
            throw backendError;
          }
          
          // Reset failure count on success
          this.failureCount.set(backend.name, 0);
          
          // Update intelligent model selector with performance data
          const qualityScore = this.estimateResponseQuality(response);
          modelSelector.updateBackendPerformance(
            backend.name,
            response.latency_ms,
            true, // success
            qualityScore
          );
          
          return response;
          
        } catch (error) {
          lastError = error as Error;
          
          if (error instanceof BackendError) {
            // Record failure
            this.recordFailure(error.backend || 'unknown');
            
            // Update intelligent model selector with failure data
            if (error.backend) {
              modelSelector.updateBackendPerformance(
                error.backend,
                0, // No latency data for failures
                false // failure
              );
            }
            
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
      
    } catch (error) {
      // Top-level error handling for the entire routing process
      const { SecureLogger } = await import('../utils/secure-logger');
      SecureLogger.secureLog('error', 'Critical error in routeRequest:', error);
      
      if (error instanceof BackendError) {
        throw error;
      }
      
      throw new BackendError(
        `Routing failed: ${(error as Error).message}`,
        'router'
      );
    }
  }

  /**
   * Score backends based on cost, latency, and availability
   */
  private async scoreBackends(request: ClaudetteRequest, excludeBackends: string[]): Promise<BackendScore[]> {
    const scores: BackendScore[] = [];
    const estimatedTokens = this.estimateRequestTokens(request);

    try {
      for (const [name, backend] of this.backends) {
        try {
          // Skip if excluded
          if (excludeBackends.includes(name)) {
            continue;
          }

          // Check availability using cache first for better performance
          let isAvailable: boolean;
          const cached = this.getHealthFromCache(name);
          if (cached !== null) {
            isAvailable = cached;
          } else {
            try {
              isAvailable = await Promise.race([
                backend.isAvailable(),
                new Promise<boolean>((_, reject) => 
                  setTimeout(() => reject(new Error('Availability timeout')), this.HEALTH_CHECK_TIMEOUT)
                )
              ]);
              this.cacheHealth(name, isAvailable);
            } catch (availabilityError) {
              const { SecureLogger } = await import('../utils/secure-logger');
              SecureLogger.secureLog('warn', `Error checking availability for backend ${name}:`, availabilityError);
              this.cacheHealth(name, false);
              continue; // Skip this backend if availability check fails
            }
          }

          if (!isAvailable) {
            continue;
          }

          // Skip if circuit breaker is open
          if (this.isCircuitBreakerOpen(name)) {
            continue;
          }

          // Get scores with error handling
          let costScore: number;
          let latencyScore: number;
          
          try {
            costScore = backend.estimateCost(estimatedTokens);
          } catch (costError) {
            const { SecureLogger } = await import('../utils/secure-logger');
            SecureLogger.secureLog('warn', `Error estimating cost for backend ${name}:`, costError);
            continue; // Skip this backend if cost estimation fails
          }

          try {
            latencyScore = await backend.getLatencyScore();
          } catch (latencyError) {
            const { SecureLogger } = await import('../utils/secure-logger');
            SecureLogger.secureLog('warn', `Error getting latency score for backend ${name}:`, latencyError);
            continue; // Skip this backend if latency score fails
          }

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
          
        } catch (backendError) {
          const { SecureLogger } = await import('../utils/secure-logger');
          SecureLogger.secureLog('warn', `Error processing backend ${name} during scoring:`, backendError);
          continue; // Skip this backend and continue with others
        }
      }

      return scores;
      
    } catch (error) {
      const { SecureLogger } = await import('../utils/secure-logger');
      SecureLogger.secureLog('error', 'Error in scoreBackends:', error);
      throw new BackendError(
        `Backend scoring failed: ${(error as Error).message}`,
        'router'
      );
    }
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
    const newCount = currentCount + 1;
    this.failureCount.set(backendName, newCount);
    this.lastFailure.set(backendName, Date.now());

    // Log circuit breaker opening
    if (newCount >= this.circuitBreakerThreshold) {
      logCircuitBreaker(backendName, 'opened', newCount);
    }
  }

  /**
   * Check if circuit breaker is open for a backend with progressive recovery
   */
  private isCircuitBreakerOpen(backendName: string): boolean {
    // Performance optimization: Use cached circuit breaker state
    const cached = this.circuitBreakerCache.get(backendName);
    const now = Date.now();
    
    // Use cache if recent (within 10 seconds for performance)
    if (cached && (now - cached.lastCheck) < 10000) {
      return cached.open;
    }
    
    const failures = this.failureCount.get(backendName) || 0;
    const lastFailureTime = this.lastFailure.get(backendName) || 0;
    
    if (failures < this.circuitBreakerThreshold) {
      this.circuitBreakerCache.set(backendName, { open: false, lastCheck: now });
      return false;
    }
    
    // Progressive recovery: longer wait times for more failures
    const timeSinceFailure = now - lastFailureTime;
    const progressiveResetTime = Math.min(
      this.circuitBreakerResetTime * Math.pow(1.5, failures - this.circuitBreakerThreshold),
      30 * 60 * 1000 // Max 30 minutes
    );
    
    const isOpen = timeSinceFailure <= progressiveResetTime;
    
    if (!isOpen) {
      // Gradual recovery: reduce failure count instead of complete reset
      const newFailureCount = Math.max(0, failures - 1);
      this.failureCount.set(backendName, newFailureCount);
      
      if (newFailureCount < this.circuitBreakerThreshold) {
        logCircuitBreaker(backendName, 'closed', newFailureCount);
      }
    }
    
    // Cache the result
    this.circuitBreakerCache.set(backendName, { open: isOpen, lastCheck: now });
    return isOpen;
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
    this.healthCache.clear();
  }

  /**
   * Force recovery test for a specific backend (useful for manual intervention)
   */
  async forceRecoveryTest(backendName: string): Promise<boolean> {
    const backend = this.backends.get(backendName);
    if (!backend) {
      const { SecureLogger } = await import('../utils/secure-logger');
      SecureLogger.secureLog('warn', `Backend ${backendName} not found for recovery test`);
      return false;
    }

    console.log(`🔄 Forcing recovery test for ${backendName}...`);
    
    try {
      const isHealthy = await Promise.race([
        backend.isAvailable(),
        new Promise<boolean>((_, reject) => 
          setTimeout(() => reject(new Error('Recovery test timeout')), this.AVAILABILITY_CHECK_TIMEOUT * 2)
        )
      ]);

      if (isHealthy) {
        // Reset failure count on successful recovery
        this.failureCount.set(backendName, 0);
        this.cacheHealth(backendName, true);
        console.log(`✅ ${backendName} backend recovery successful`);
        return true;
      } else {
        console.log(`❌ ${backendName} backend still unhealthy`);
        this.cacheHealth(backendName, false);
        return false;
      }
    } catch (error) {
      console.log(`❌ ${backendName} recovery test failed: ${(error as Error).message}`);
      this.cacheHealth(backendName, false);
      return false;
    }
  }

  /**
   * Get circuit breaker status for all backends
   */
  getCircuitBreakerStatus(): Array<{
    name: string;
    failures: number;
    circuitOpen: boolean;
    lastFailure?: Date;
    nextRetryTime?: Date;
  }> {
    return Array.from(this.backends.keys()).map(name => {
      const failures = this.failureCount.get(name) || 0;
      const lastFailureTime = this.lastFailure.get(name);
      const circuitOpen = this.isCircuitBreakerOpen(name);
      
      let nextRetryTime: Date | undefined;
      if (circuitOpen && lastFailureTime) {
        const progressiveResetTime = Math.min(
          this.circuitBreakerResetTime * Math.pow(1.5, failures - this.circuitBreakerThreshold),
          30 * 60 * 1000
        );
        nextRetryTime = new Date(lastFailureTime + progressiveResetTime);
      }

      return {
        name,
        failures,
        circuitOpen,
        lastFailure: lastFailureTime ? new Date(lastFailureTime) : undefined,
        nextRetryTime
      };
    });
  }

  /**
   * Update routing options
   */
  updateOptions(options: Partial<RouterOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Start background health checks to warm cache and reduce startup latency
   */
  private startBackgroundHealthChecks(): void {
    // Run immediately
    this.backgroundHealthCheckAll();
    
    // Schedule periodic background checks
    this.backgroundHealthCheckInterval = setInterval(() => {
      this.backgroundHealthCheckAll();
    }, this.HEALTH_CACHE_TTL);
  }

  /**
   * Stop background health checks
   */
  stopBackgroundHealthChecks(): void {
    if (this.backgroundHealthCheckInterval) {
      clearInterval(this.backgroundHealthCheckInterval);
      this.backgroundHealthCheckInterval = null;
    }
  }

  /**
   * Background health check for all backends (non-blocking)
   */
  private async backgroundHealthCheckAll(): Promise<void> {
    const healthPromises = Array.from(this.backends.entries()).map(async ([name, backend]) => {
      try {
        // Use cached result if available and fresh
        const cached = this.getHealthFromCache(name);
        if (cached !== null) {
          return;
        }

        // Perform health check with timeout
        const healthy = await Promise.race([
          backend.isAvailable(),
          new Promise<boolean>((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), this.BACKGROUND_HEALTH_CHECK_TIMEOUT)
          )
        ]);

        this.cacheHealth(name, healthy);
      } catch (error) {
        this.cacheHealth(name, false);
      }
    });

    // Run all health checks in parallel
    await Promise.allSettled(healthPromises);
  }

  /**
   * Get health status from cache if available and fresh
   */
  private getHealthFromCache(backendName: string): boolean | null {
    const cached = this.healthCache.get(backendName);
    if (cached && Date.now() < cached.expiry) {
      return cached.healthy;
    }
    return null;
  }

  /**
   * Cache health status for a backend
   */
  private cacheHealth(backendName: string, healthy: boolean): void {
    this.healthCache.set(backendName, {
      healthy,
      expiry: Date.now() + this.HEALTH_CACHE_TTL
    });
  }

  /**
   * Health check for all backends with parallel execution and caching
   */
  async healthCheckAll(): Promise<{ name: string; healthy: boolean; error?: string }[]> {
    const healthPromises = Array.from(this.backends.entries()).map(async ([name, backend]) => {
      try {
        // Try cache first for faster response
        const cached = this.getHealthFromCache(name);
        if (cached !== null) {
          return { name, healthy: cached };
        }

        // Perform health check with timeout
        const healthy = await Promise.race([
          backend.isAvailable(),
          new Promise<boolean>((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), this.AVAILABILITY_CHECK_TIMEOUT)
          )
        ]);

        this.cacheHealth(name, healthy);
        return { name, healthy };
      } catch (error) {
        const errorMessage = (error as Error).message;
        this.cacheHealth(name, false);
        return { 
          name, 
          healthy: false, 
          error: errorMessage
        };
      }
    });

    // Execute all health checks in parallel
    const results = await Promise.all(healthPromises);
    return results;
  }

  /**
   * Estimate response quality for performance tracking
   */
  private estimateResponseQuality(response: ClaudetteResponse): number {
    let qualityScore = 0.7; // Base quality score
    
    // Factor in response length (reasonable responses are better)
    const contentLength = response.content.length;
    if (contentLength > 50 && contentLength < 2000) {
      qualityScore += 0.1;
    } else if (contentLength >= 2000) {
      qualityScore += 0.05;
    }
    
    // Factor in token efficiency (good input/output ratio)
    if (response.tokens_output > 0 && response.tokens_input > 0) {
      const tokenRatio = response.tokens_output / response.tokens_input;
      if (tokenRatio > 0.5 && tokenRatio < 3.0) {
        qualityScore += 0.1;
      }
    }
    
    // Factor in latency (faster responses within reason are better)
    if (response.latency_ms > 0) {
      if (response.latency_ms < 1000) {
        qualityScore += 0.05;
      } else if (response.latency_ms > 5000) {
        qualityScore -= 0.05;
      }
    }
    
    // Factor in cost efficiency
    if (response.cost_eur < 0.01) {
      qualityScore += 0.05;
    }
    
    return Math.max(0.1, Math.min(1.0, qualityScore));
  }
}