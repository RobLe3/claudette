// Adaptive Router with Pipeline Contribution Support
// Enhanced routing for self-hosted and cloud backends with async processing

import { BaseRouter } from './base-router';
import { Backend, ClaudetteRequest, ClaudetteResponse, BackendError } from '../types/index';
import { AdaptiveBaseBackend, AsyncContribution } from '../backends/adaptive-base';

export interface PipelineResult {
  primary: ClaudetteResponse;
  contributions: ClaudetteResponse[];
  totalTime: number;
  backendsUsed: string[];
}

export interface AdaptiveRoutingStrategy {
  // Primary routing
  primary_selection: 'fastest' | 'cheapest' | 'best_quality' | 'hybrid';
  
  // Pipeline contribution
  enable_async_contributions: boolean;
  max_concurrent_contributions: number;
  contribution_timeout_ms: number;
  
  // Quality assessment
  quality_threshold: number;
  fallback_on_poor_quality: boolean;
  
  // Performance optimization
  adaptive_backend_scoring: boolean;
  penalize_slow_backends: boolean;
  boost_self_hosted_success: boolean;
}

export class AdaptiveRouter extends BaseRouter {
  private strategy: AdaptiveRoutingStrategy;
  private backendScores: Map<string, number> = new Map();
  private requestHistory: Array<{
    backend: string;
    latency: number;
    success: boolean;
    timestamp: number;
  }> = [];

  constructor(strategy: Partial<AdaptiveRoutingStrategy> = {}) {
    super(); // Call BaseRouter constructor
    
    this.strategy = {
      primary_selection: 'hybrid',
      enable_async_contributions: true,
      max_concurrent_contributions: 3,
      contribution_timeout_ms: 120000, // 2 minutes
      quality_threshold: 0.7,
      fallback_on_poor_quality: true,
      adaptive_backend_scoring: true,
      penalize_slow_backends: true,
      boost_self_hosted_success: true,
      ...strategy
    };
  }

  /**
   * Register backend with adaptive scoring
   */
  registerBackend(name: string, backend: Backend): void {
    this.backends.set(name, backend);
    
    // Initialize score based on backend type
    const info = backend.getInfo();
    let initialScore = info.priority;
    
    // Boost self-hosted backends when strategy enables it
    if (this.strategy.boost_self_hosted_success && 
        'backendType' in info && info.backendType === 'self_hosted') {
      initialScore *= 1.2;
    }
    
    this.backendScores.set(name, initialScore);
    console.log(`📝 Registered ${name} with initial score: ${initialScore.toFixed(2)}`);
  }

  /**
   * Select the best backend for a request
   */
  async selectBackend(request: ClaudetteRequest): Promise<string> {
    const availableBackends = Array.from(this.backends.keys()).filter(name => {
      const backend = this.backends.get(name);
      return backend && this.backendScores.get(name)! > 0;
    });

    if (availableBackends.length === 0) {
      throw new Error('No available backends');
    }

    // Simple selection based on scores for now
    const scores = availableBackends.map(name => ({
      name,
      score: this.backendScores.get(name)!
    }));

    scores.sort((a, b) => b.score - a.score);
    return scores[0].name;
  }

  /**
   * Enhanced route with pipeline contribution support
   */
  async route(request: ClaudetteRequest): Promise<ClaudetteResponse> {
    const startTime = Date.now();
    
    try {
      // Get available backends
      const availableBackends = await this.getAvailableBackends();
      
      if (availableBackends.length === 0) {
        throw new BackendError('No backends available', 'router', false);
      }

      // Select primary backend
      const primaryBackend = this.selectPrimaryBackend(availableBackends, request);
      console.log(`🎯 Selected primary backend: ${primaryBackend.name}`);

      // Start primary request
      const primaryPromise = this.executeWithTracking(primaryBackend, request);

      // Setup async contributions if enabled
      const contributionPromises: Promise<ClaudetteResponse>[] = [];
      
      if (this.strategy.enable_async_contributions && availableBackends.length > 1) {
        const contributingBackends = this.selectContributingBackends(
          availableBackends, 
          primaryBackend, 
          request
        );
        
        contributionPromises.push(
          ...contributingBackends.map(backend => 
            this.executeAsyncContribution(backend, request)
          )
        );
      }

      // Wait for primary response
      const primaryResponse = await primaryPromise;
      
      // If no async contributions, return primary response
      if (contributionPromises.length === 0) {
        return primaryResponse;
      }

      // Wait for contributions with timeout
      const contributions = await this.waitForContributions(contributionPromises);
      
      // Create pipeline result
      const pipelineResult: PipelineResult = {
        primary: primaryResponse,
        contributions: contributions.filter(c => c !== null) as ClaudetteResponse[],
        totalTime: Date.now() - startTime,
        backendsUsed: [
          primaryResponse.backend_used,
          ...contributions.filter(c => c !== null).map(c => c!.backend_used)
        ]
      };

      // Apply quality assessment and potential fallback
      if (this.strategy.fallback_on_poor_quality) {
        const bestResponse = this.selectBestResponse(pipelineResult);
        if (bestResponse !== primaryResponse) {
          console.log(`🔄 Fallback: Using ${bestResponse.backend_used} instead of ${primaryResponse.backend_used}`);
          return bestResponse;
        }
      }

      return primaryResponse;

    } catch (error) {
      console.error('❌ Adaptive routing failed:', error);
      throw error;
    }
  }

  /**
   * Get available backends with health checks
   */
  private async getAvailableBackends(): Promise<Backend[]> {
    const availabilityChecks = Array.from(this.backends.values()).map(async backend => {
      const isAvailable = await backend.isAvailable();
      return isAvailable ? backend : null;
    });

    const results = await Promise.all(availabilityChecks);
    return results.filter(backend => backend !== null) as Backend[];
  }

  /**
   * Select primary backend based on strategy
   */
  private selectPrimaryBackend(backends: Backend[], request: ClaudetteRequest): Backend {
    switch (this.strategy.primary_selection) {
      case 'fastest':
        return this.selectFastestBackend(backends);
      
      case 'cheapest':
        return this.selectCheapestBackend(backends);
      
      case 'best_quality':
        return this.selectBestQualityBackend(backends);
      
      case 'hybrid':
      default:
        return this.selectHybridBackend(backends, request);
    }
  }

  /**
   * Select fastest backend based on recent latencies
   */
  private selectFastestBackend(backends: Backend[]): Backend {
    let fastestBackend = backends[0];
    let lowestLatency = Infinity;

    for (const backend of backends) {
      const info = backend.getInfo();
      const avgLatency = info.avg_latency || Infinity;
      
      if (avgLatency < lowestLatency) {
        lowestLatency = avgLatency;
        fastestBackend = backend;
      }
    }

    return fastestBackend;
  }

  /**
   * Select cheapest backend
   */
  private selectCheapestBackend(backends: Backend[]): Backend {
    return backends.reduce((cheapest, current) => {
      const cheapestCost = cheapest.getInfo().cost_per_token;
      const currentCost = current.getInfo().cost_per_token;
      return currentCost < cheapestCost ? current : cheapest;
    });
  }

  /**
   * Select best quality backend based on adaptive scoring
   */
  private selectBestQualityBackend(backends: Backend[]): Backend {
    if (!this.strategy.adaptive_backend_scoring) {
      return backends.reduce((best, current) => {
        const bestPriority = best.getInfo().priority;
        const currentPriority = current.getInfo().priority;
        return currentPriority > bestPriority ? current : best;
      });
    }

    let bestBackend = backends[0];
    let highestScore = this.backendScores.get(bestBackend.name) || 0;

    for (const backend of backends) {
      const score = this.backendScores.get(backend.name) || 0;
      if (score > highestScore) {
        highestScore = score;
        bestBackend = backend;
      }
    }

    return bestBackend;
  }

  /**
   * Hybrid selection combining multiple factors
   */
  private selectHybridBackend(backends: Backend[], request: ClaudetteRequest): Backend {
    const scores = backends.map(backend => {
      const info = backend.getInfo();
      const adaptiveScore = this.backendScores.get(backend.name) || info.priority;
      
      // Calculate composite score
      let compositeScore = adaptiveScore;
      
      // Factor in latency (penalize slow backends if enabled)
      if (this.strategy.penalize_slow_backends && info.avg_latency) {
        const latencyPenalty = Math.min(info.avg_latency / 10000, 0.5); // Max 50% penalty
        compositeScore *= (1 - latencyPenalty);
      }
      
      // Factor in cost (prefer cheaper backends slightly)
      const costBonus = Math.max(0, (0.001 - info.cost_per_token) / 0.001 * 0.1);
      compositeScore += costBonus;
      
      // Boost healthy backends
      if (info.healthy) {
        compositeScore *= 1.1;
      }

      return { backend, score: compositeScore };
    });

    scores.sort((a, b) => b.score - a.score);
    return scores[0].backend;
  }

  /**
   * Select backends for async contributions
   */
  private selectContributingBackends(
    availableBackends: Backend[], 
    primaryBackend: Backend, 
    request: ClaudetteRequest
  ): Backend[] {
    const otherBackends = availableBackends.filter(b => b.name !== primaryBackend.name);
    const maxContributions = Math.min(
      this.strategy.max_concurrent_contributions,
      otherBackends.length
    );

    // Prioritize self-hosted backends for contributions if strategy enables
    if (this.strategy.boost_self_hosted_success) {
      const selfHosted = otherBackends.filter(b => {
        const info = b.getInfo();
        return 'backendType' in info && info.backendType === 'self_hosted';
      });
      
      const cloudBased = otherBackends.filter(b => {
        const info = b.getInfo();
        return !('backendType' in info) || info.backendType !== 'self_hosted';
      });

      return [...selfHosted, ...cloudBased].slice(0, maxContributions);
    }

    return otherBackends.slice(0, maxContributions);
  }

  /**
   * Execute request with performance tracking
   */
  private async executeWithTracking(backend: Backend, request: ClaudetteRequest): Promise<ClaudetteResponse> {
    const startTime = Date.now();
    
    try {
      const response = await backend.send(request);
      const latency = Date.now() - startTime;
      
      // Update performance tracking
      this.recordRequestResult(backend.name, latency, true);
      this.updateBackendScore(backend.name, true, latency);
      
      return response;
    } catch (error) {
      const latency = Date.now() - startTime;
      
      // Update performance tracking
      this.recordRequestResult(backend.name, latency, false);
      this.updateBackendScore(backend.name, false, latency);
      
      throw error;
    }
  }

  /**
   * Execute async contribution
   */
  private async executeAsyncContribution(backend: Backend, request: ClaudetteRequest): Promise<ClaudetteResponse> {
    console.log(`🔄 Starting async contribution from ${backend.name}`);
    
    try {
      // Use enhanced timeout for async contributions if supported
      if (backend instanceof AdaptiveBaseBackend) {
        return await (backend as any).contributeAsync?.(request) || await backend.send(request);
      }
      
      return await backend.send(request);
    } catch (error) {
      console.warn(`⚠️ Async contribution from ${backend.name} failed:`, error);
      throw error;
    }
  }

  /**
   * Wait for async contributions with timeout
   */
  private async waitForContributions(promises: Promise<ClaudetteResponse>[]): Promise<(ClaudetteResponse | null)[]> {
    const timeout = this.strategy.contribution_timeout_ms;
    
    const timeoutPromise = new Promise<null>(resolve => 
      setTimeout(() => resolve(null), timeout)
    );

    const contributionPromises = promises.map(async promise => {
      try {
        return await Promise.race([promise, timeoutPromise]);
      } catch (error) {
        console.warn('⚠️ Contribution failed:', error);
        return null;
      }
    });

    return await Promise.all(contributionPromises);
  }

  /**
   * Select best response from pipeline results
   */
  private selectBestResponse(pipelineResult: PipelineResult): ClaudetteResponse {
    const allResponses = [pipelineResult.primary, ...pipelineResult.contributions];
    
    // Simple quality assessment based on response length and metadata
    return allResponses.reduce((best, current) => {
      const bestQuality = this.assessResponseQuality(best);
      const currentQuality = this.assessResponseQuality(current);
      
      return currentQuality > bestQuality ? current : best;
    });
  }

  /**
   * Assess response quality (simplified)
   */
  private assessResponseQuality(response: ClaudetteResponse): number {
    let quality = 0.5; // Base quality
    
    // Factor in response length (reasonable responses are better)
    const length = response.content.length;
    if (length > 100 && length < 5000) {
      quality += 0.2;
    }
    
    // Factor in cost efficiency
    if (response.cost_eur < 0.01) {
      quality += 0.1;
    }
    
    // Factor in response time
    if (response.latency_ms < 10000) {
      quality += 0.2;
    }
    
    return quality;
  }

  /**
   * Record request result for performance tracking
   */
  private recordRequestResult(backendName: string, latency: number, success: boolean): void {
    this.requestHistory.push({
      backend: backendName,
      latency,
      success,
      timestamp: Date.now()
    });

    // Keep only recent history (last 100 requests)
    if (this.requestHistory.length > 100) {
      this.requestHistory.shift();
    }
  }

  /**
   * Update backend score based on performance
   */
  private updateBackendScore(backendName: string, success: boolean, latency: number): void {
    if (!this.strategy.adaptive_backend_scoring) return;

    const currentScore = this.backendScores.get(backendName) || 1.0;
    let adjustment = 0;

    if (success) {
      // Boost score for success
      adjustment = 0.05;
      
      // Extra boost for fast responses
      if (latency < 5000) {
        adjustment += 0.02;
      }
      
      // Extra boost for self-hosted success if strategy enables
      const backend = this.backends.get(backendName);
      if (backend && this.strategy.boost_self_hosted_success) {
        const info = backend.getInfo();
        if ('backendType' in info && info.backendType === 'self_hosted') {
          adjustment += 0.03;
        }
      }
    } else {
      // Penalize score for failure
      adjustment = -0.1;
      
      // Extra penalty for slow failures
      if (latency > 30000) {
        adjustment -= 0.05;
      }
    }

    const newScore = Math.max(0.1, Math.min(5.0, currentScore + adjustment));
    this.backendScores.set(backendName, newScore);
    
    console.log(`📊 Updated ${backendName} score: ${currentScore.toFixed(2)} → ${newScore.toFixed(2)}`);
  }

  /**
   * Get router performance statistics
   */
  getPerformanceStats(): {
    totalRequests: number;
    backendScores: Record<string, number>;
    recentPerformance: Record<string, {
      requests: number;
      successRate: number;
      avgLatency: number;
    }>;
    strategy: AdaptiveRoutingStrategy;
  } {
    const recentHistory = this.requestHistory.slice(-50);
    const recentPerformance: Record<string, any> = {};

    // Calculate recent performance per backend
    this.backends.forEach((_, name) => {
      const backendHistory = recentHistory.filter(h => h.backend === name);
      
      if (backendHistory.length > 0) {
        recentPerformance[name] = {
          requests: backendHistory.length,
          successRate: backendHistory.filter(h => h.success).length / backendHistory.length,
          avgLatency: backendHistory.reduce((sum, h) => sum + h.latency, 0) / backendHistory.length
        };
      }
    });

    return {
      totalRequests: this.requestHistory.length,
      backendScores: Object.fromEntries(this.backendScores),
      recentPerformance,
      strategy: this.strategy
    };
  }

  /**
   * Reset adaptive scores and history
   */
  resetPerformanceTracking(): void {
    this.backendScores.clear();
    this.requestHistory = [];
    
    // Reinitialize scores
    this.backends.forEach(backend => {
      const info = backend.getInfo();
      this.backendScores.set(backend.name, info.priority);
    });
    
    console.log('🔄 Router performance tracking reset');
  }

  // Implement remaining Router interface methods

  getBackendByName(name: string): Backend | undefined {
    return this.backends.get(name);
  }
}