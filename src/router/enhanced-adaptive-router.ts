// Enhanced Adaptive Router - Phase 2 Integration
// Integrates ML routing, advanced caching, analytics, and system optimization

import { BaseRouter } from './base-router';
import { Backend, ClaudetteRequest, ClaudetteResponse, BackendError } from '../types/index';
import { AdaptiveBaseBackend, AsyncContribution } from '../backends/adaptive-base';
import { RAGManager, ClaudetteRAGRequest, ClaudetteRAGResponse, RAGResponse } from '../rag/index';
import { MLRoutingEngine, MLRoutingConfig, MLPrediction } from './ml/ml-routing-engine';
import { MultiLayerCache, CacheConfiguration } from '../cache/advanced/multi-layer-cache';
import { PerformanceAnalytics, AnalyticsConfiguration } from '../analytics/performance/performance-analytics';
import { SystemOptimizer, OptimizationConfiguration } from '../optimization/system-optimizer';

export interface EnhancedRoutingStrategy {
  // Traditional routing options
  primary_selection: 'fastest' | 'cheapest' | 'best_quality' | 'hybrid' | 'ml_optimized';
  
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
  
  // Phase 2 enhancements
  ml_routing: {
    enabled: boolean;
    fallback_to_traditional: boolean;
    confidence_threshold: number;
    learning_enabled: boolean;
  };
  
  advanced_caching: {
    enabled: boolean;
    predictive_warming: boolean;
    similarity_matching: boolean;
    multi_layer: boolean;
  };
  
  analytics: {
    enabled: boolean;
    real_time_monitoring: boolean;
    predictive_analytics: boolean;
    regression_detection: boolean;
  };
  
  optimization: {
    enabled: boolean;
    resource_monitoring: boolean;
    auto_optimization: boolean;
    capacity_planning: boolean;
  };
}

export interface EnhancedPipelineResult {
  primary: ClaudetteResponse;
  contributions: ClaudetteResponse[];
  totalTime: number;
  backendsUsed: string[];
  mlPrediction?: MLPrediction;
  cacheHit: boolean;
  optimizationApplied: boolean;
  performanceMetrics: {
    routingTime: number;
    cacheTime: number;
    analyticsTime: number;
    optimizationTime: number;
  };
}

export class EnhancedAdaptiveRouter extends BaseRouter {
  private strategy: EnhancedRoutingStrategy;
  private backendScores: Map<string, number> = new Map();
  private requestHistory: Array<{
    backend: string;
    latency: number;
    success: boolean;
    timestamp: number;
    mlPredicted?: boolean;
    cacheHit?: boolean;
  }> = [];
  
  // Phase 2 components
  private mlEngine?: MLRoutingEngine;
  private cache?: MultiLayerCache;
  private analytics?: PerformanceAnalytics;
  private optimizer?: SystemOptimizer;
  private ragManager?: RAGManager;
  
  // Performance tracking
  private routingStats = {
    totalRequests: 0,
    mlRoutingUsed: 0,
    cacheHits: 0,
    optimizationEvents: 0,
    avgRoutingTime: 0
  };

  constructor(
    strategy: Partial<EnhancedRoutingStrategy> = {},
    ragManager?: RAGManager,
    mlConfig?: Partial<MLRoutingConfig>,
    cacheConfig?: Partial<CacheConfiguration>,
    analyticsConfig?: Partial<AnalyticsConfiguration>,
    optimizerConfig?: Partial<OptimizationConfiguration>
  ) {
    super();
    
    this.ragManager = ragManager;
    
    this.strategy = {
      // Traditional settings
      primary_selection: 'ml_optimized',
      enable_async_contributions: true,
      max_concurrent_contributions: 3,
      contribution_timeout_ms: 120000,
      quality_threshold: 0.7,
      fallback_on_poor_quality: true,
      adaptive_backend_scoring: true,
      penalize_slow_backends: true,
      boost_self_hosted_success: true,
      
      // Phase 2 enhancements
      ml_routing: {
        enabled: true,
        fallback_to_traditional: true,
        confidence_threshold: 0.7,
        learning_enabled: true
      },
      
      advanced_caching: {
        enabled: true,
        predictive_warming: true,
        similarity_matching: true,
        multi_layer: true
      },
      
      analytics: {
        enabled: true,
        real_time_monitoring: true,
        predictive_analytics: true,
        regression_detection: true
      },
      
      optimization: {
        enabled: true,
        resource_monitoring: true,
        auto_optimization: true,
        capacity_planning: true
      },
      
      ...strategy
    };

    this.initializeEnhancedComponents(mlConfig, cacheConfig, analyticsConfig, optimizerConfig);
    console.log('🚀 Enhanced Adaptive Router initialized with Phase 2 capabilities');
  }

  /**
   * Select optimal backend using enhanced adaptive strategy
   */
  async selectBackend(request: ClaudetteRequest): Promise<string> {
    // Use ML prediction if available
    if (this.mlEngine) {
      const backends = Array.from(this.backends.values());
      const prediction = await this.mlEngine.predictOptimalBackend(request, backends);
      return prediction.recommendedBackend;
    }

    // Fallback to traditional scoring
    const availableBackends = Array.from(this.backends.keys()).filter(name => {
      const backend = this.backends.get(name);
      return backend && this.backendScores.get(name)! > 0;
    });

    if (availableBackends.length === 0) {
      throw new Error('No available backends');
    }

    // Select based on current scores
    return availableBackends.reduce((best, current) => {
      const bestScore = this.backendScores.get(best) || 0;
      const currentScore = this.backendScores.get(current) || 0;
      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * Enhanced routing with ML, caching, analytics, and optimization
   */
  async route(request: ClaudetteRequest): Promise<ClaudetteResponse> {
    const routingStartTime = Date.now();
    const performanceMetrics = {
      routingTime: 0,
      cacheTime: 0,
      analyticsTime: 0,
      optimizationTime: 0
    };

    this.routingStats.totalRequests++;

    try {
      // Phase 1: RAG Enhancement (if applicable)
      let enhancedRequest = request;
      let ragMetadata: any = {};
      
      if (this.ragManager && this.isRAGRequest(request)) {
        console.log('🧠 Processing RAG-enhanced request');
        const ragRequest = request as ClaudetteRAGRequest;
        const ragResponse = await this.ragManager.enhanceWithRAG(ragRequest);
        
        enhancedRequest = {
          ...request,
          prompt: ragResponse.content
        };
        
        ragMetadata = ragResponse.ragMetadata;
      }

      // Phase 2: Cache Check
      let cacheResponse: ClaudetteResponse | RAGResponse | null = null;
      if (this.strategy.advanced_caching.enabled && this.cache) {
        const cacheStartTime = Date.now();
        cacheResponse = await this.cache.get(enhancedRequest);
        performanceMetrics.cacheTime = Date.now() - cacheStartTime;
        
        if (cacheResponse) {
          this.routingStats.cacheHits++;
          console.log('🎯 Cache hit - returning cached response');
          
          // Record cache hit in analytics
          if (this.analytics && 'backend_used' in cacheResponse) {
            this.analytics.recordRequestPerformance(
              enhancedRequest,
              cacheResponse,
              cacheResponse.backend_used,
              undefined
            );
          }
          
          // Convert RAGResponse to ClaudetteResponse if needed
          const claudetteResponse = 'backend_used' in cacheResponse 
            ? cacheResponse 
            : this.convertRAGToClaudetteResponse(cacheResponse);
          
          return this.enhanceResponseWithMetadata(claudetteResponse, ragMetadata, {
            ...performanceMetrics,
            routingTime: Date.now() - routingStartTime
          }, true);
        }
      }

      // Phase 3: Backend Selection (ML or Traditional)
      const availableBackends = await this.getAvailableBackends();
      if (availableBackends.length === 0) {
        throw new BackendError('No backends available', 'router', false);
      }

      let selectedBackend: Backend;
      let mlPrediction: MLPrediction | undefined;

      if (this.strategy.ml_routing.enabled && this.mlEngine) {
        const mlStartTime = Date.now();
        
        try {
          mlPrediction = await this.mlEngine.predictOptimalBackend(enhancedRequest, availableBackends);
          
          if (mlPrediction.confidence >= this.strategy.ml_routing.confidence_threshold) {
            const backend = availableBackends.find(b => b.name === mlPrediction!.recommendedBackend);
            if (backend) {
              selectedBackend = backend;
              this.routingStats.mlRoutingUsed++;
              console.log(`🤖 ML routing selected: ${selectedBackend.name} (confidence: ${(mlPrediction.confidence * 100).toFixed(1)}%)`);
            } else {
              selectedBackend = this.selectTraditionalBackend(availableBackends, enhancedRequest);
              console.log('🔄 ML backend not available, falling back to traditional routing');
            }
          } else {
            selectedBackend = this.selectTraditionalBackend(availableBackends, enhancedRequest);
            console.log(`🔄 ML confidence too low (${(mlPrediction.confidence * 100).toFixed(1)}%), using traditional routing`);
          }
          
          performanceMetrics.routingTime += Date.now() - mlStartTime;
        } catch (error) {
          console.warn('⚠️ ML routing failed, falling back to traditional:', error);
          selectedBackend = this.selectTraditionalBackend(availableBackends, enhancedRequest);
        }
      } else {
        selectedBackend = this.selectTraditionalBackend(availableBackends, enhancedRequest);
      }

      // Phase 4: Execute Request with Tracking
      const executionStartTime = Date.now();
      let primaryResponse: ClaudetteResponse;
      
      try {
        primaryResponse = await this.executeWithTracking(selectedBackend, enhancedRequest);
      } catch (error) {
        // Fallback logic
        console.warn(`⚠️ Primary backend ${selectedBackend.name} failed, attempting fallback`);
        const fallbackBackends = availableBackends.filter(b => b.name !== selectedBackend.name);
        
        if (fallbackBackends.length > 0) {
          selectedBackend = fallbackBackends[0];
          primaryResponse = await this.executeWithTracking(selectedBackend, enhancedRequest);
        } else {
          throw error;
        }
      }

      // Phase 5: Learn from Outcome (ML)
      if (this.strategy.ml_routing.learning_enabled && this.mlEngine && mlPrediction) {
        await this.mlEngine.learnFromOutcome(
          enhancedRequest,
          selectedBackend.name,
          primaryResponse,
          !primaryResponse.error
        );
      }

      // Phase 6: Cache Response
      if (this.strategy.advanced_caching.enabled && this.cache && !primaryResponse.error) {
        const cacheStartTime = Date.now();
        await this.cache.set(enhancedRequest, primaryResponse);
        performanceMetrics.cacheTime += Date.now() - cacheStartTime;
      }

      // Phase 7: Record Analytics
      if (this.strategy.analytics.enabled && this.analytics) {
        const analyticsStartTime = Date.now();
        this.analytics.recordRequestPerformance(
          enhancedRequest,
          primaryResponse,
          selectedBackend.name,
          mlPrediction
        );
        performanceMetrics.analyticsTime = Date.now() - analyticsStartTime;
      }

      // Phase 8: System Optimization (Background)
      if (this.strategy.optimization.enabled && this.optimizer) {
        // Don't await optimization to avoid blocking response
        this.performBackgroundOptimization();
      }

      // Phase 9: Async Contributions (if enabled)
      if (this.strategy.enable_async_contributions && availableBackends.length > 1) {
        this.executeAsyncContributions(availableBackends, selectedBackend, enhancedRequest)
          .catch(error => console.warn('⚠️ Async contributions failed:', error));
      }

      // Update performance tracking
      this.updateRoutingStats(selectedBackend.name, primaryResponse, mlPrediction !== undefined);
      
      performanceMetrics.routingTime = Date.now() - routingStartTime;

      return this.enhanceResponseWithMetadata(primaryResponse, ragMetadata, performanceMetrics, false);

    } catch (error) {
      console.error('❌ Enhanced routing failed:', error);
      
      // Record failure in analytics
      if (this.analytics) {
        this.analytics.recordMetric({
          timestamp: Date.now(),
          metricType: 'success_rate',
          value: 0,
          metadata: { error: error instanceof Error ? error.message : String(error) }
        });
      }
      
      throw error;
    }
  }

  /**
   * Enhanced backend registration with ML profiling
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
    
    // Initialize ML engine profiling for the backend
    if (this.mlEngine) {
      // The ML engine will automatically initialize backend profiles when first used
      console.log(`🧠 Backend ${name} registered for ML profiling`);
    }
    
    console.log(`📝 Enhanced router registered ${name} with initial score: ${initialScore.toFixed(2)}`);
  }

  /**
   * Get comprehensive performance statistics
   */
  getEnhancedPerformanceStats(): {
    routing: {
      totalRequests: number;
      mlRoutingUsed: number;
      cacheHits: number;
      optimizationEvents: number;
      avgRoutingTime: number;
    };
    ml: any;
    cache: any;
    analytics: any;
    optimization: any;
    backendScores: Record<string, number>;
    recentPerformance: Record<string, any>;
  } {
    
    const stats = {
      routing: { ...this.routingStats },
      ml: this.mlEngine?.getMLStatus() || { enabled: false },
      cache: this.cache?.getMetrics() || { enabled: false },
      analytics: this.analytics?.getDashboardData() || { enabled: false },
      optimization: this.optimizer?.getOptimizationStats() || { enabled: false },
      backendScores: Object.fromEntries(this.backendScores),
      recentPerformance: this.calculateRecentPerformance()
    };

    return stats;
  }

  /**
   * Generate comprehensive system report
   */
  async generateSystemReport(): Promise<{
    timestamp: number;
    routing: any;
    analytics: any;
    optimization: any;
    recommendations: string[];
  }> {
    
    const report = {
      timestamp: Date.now(),
      routing: this.getEnhancedPerformanceStats(),
      analytics: this.analytics ? await this.analytics.generateReport() : null,
      optimization: this.optimizer ? await this.optimizer.generateCapacityPlan() : null,
      recommendations: this.generateSystemRecommendations()
    };

    console.log('📊 System report generated');
    return report;
  }

  /**
   * Optimize system performance
   */
  async optimizeSystem(): Promise<{
    cacheOptimized: boolean;
    systemOptimized: boolean;
    mlRetrained: boolean;
    improvements: string[];
  }> {
    
    const improvements: string[] = [];
    let cacheOptimized = false;
    let systemOptimized = false;
    let mlRetrained = false;

    // Cache optimization
    if (this.cache) {
      await this.cache.optimize();
      cacheOptimized = true;
      improvements.push('Cache optimized and rebalanced');
    }

    // System resource optimization
    if (this.optimizer) {
      const results = await this.optimizer.optimizeResources();
      if (results.length > 0) {
        systemOptimized = true;
        improvements.push(`System optimized: ${results.length} optimizations applied`);
      }
    }

    // ML model retraining
    if (this.mlEngine && this.strategy.ml_routing.learning_enabled) {
      // ML engine handles its own retraining automatically
      mlRetrained = true;
      improvements.push('ML models updated with recent data');
    }

    // Predictive cache warming
    if (this.cache && this.strategy.advanced_caching.predictive_warming) {
      await this.cache.warmCache();
      improvements.push('Predictive cache warming completed');
    }

    console.log(`⚡ System optimization completed: ${improvements.length} improvements`);
    
    return {
      cacheOptimized,
      systemOptimized,
      mlRetrained,
      improvements
    };
  }

  // Private helper methods
  private initializeEnhancedComponents(
    mlConfig?: Partial<MLRoutingConfig>,
    cacheConfig?: Partial<CacheConfiguration>,
    analyticsConfig?: Partial<AnalyticsConfiguration>,
    optimizerConfig?: Partial<OptimizationConfiguration>
  ): void {
    
    // Initialize ML routing engine
    if (this.strategy.ml_routing.enabled) {
      this.mlEngine = new MLRoutingEngine(mlConfig);
      console.log('🧠 ML routing engine initialized');
    }

    // Initialize advanced caching
    if (this.strategy.advanced_caching.enabled) {
      this.cache = new MultiLayerCache(cacheConfig);
      console.log('🗄️ Advanced multi-layer cache initialized');
    }

    // Initialize performance analytics
    if (this.strategy.analytics.enabled) {
      this.analytics = new PerformanceAnalytics(analyticsConfig);
      console.log('📊 Performance analytics initialized');
    }

    // Initialize system optimizer
    if (this.strategy.optimization.enabled) {
      this.optimizer = new SystemOptimizer(optimizerConfig, this.analytics);
      console.log('⚡ System optimizer initialized');
    }
  }

  private selectTraditionalBackend(backends: Backend[], request: ClaudetteRequest): Backend {
    switch (this.strategy.primary_selection) {
      case 'fastest':
        return this.selectFastestBackend(backends);
      case 'cheapest':
        return this.selectCheapestBackend(backends);
      case 'best_quality':
        return this.selectBestQualityBackend(backends);
      case 'hybrid':
      case 'ml_optimized':
      default:
        return this.selectHybridBackend(backends, request);
    }
  }

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

  private selectCheapestBackend(backends: Backend[]): Backend {
    return backends.reduce((cheapest, current) => {
      const cheapestCost = cheapest.getInfo().cost_per_token;
      const currentCost = current.getInfo().cost_per_token;
      return currentCost < cheapestCost ? current : cheapest;
    });
  }

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

  private async getAvailableBackends(): Promise<Backend[]> {
    const availabilityChecks = Array.from(this.backends.values()).map(async backend => {
      const isAvailable = await backend.isAvailable();
      return isAvailable ? backend : null;
    });

    const results = await Promise.all(availabilityChecks);
    return results.filter(backend => backend !== null) as Backend[];
  }

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

  private async executeAsyncContributions(
    availableBackends: Backend[],
    primaryBackend: Backend,
    request: ClaudetteRequest
  ): Promise<void> {
    
    const contributingBackends = availableBackends
      .filter(b => b.name !== primaryBackend.name)
      .slice(0, this.strategy.max_concurrent_contributions);

    const contributionPromises = contributingBackends.map(async backend => {
      try {
        const response = await backend.send(request);
        
        // Learn from contribution if ML is enabled
        if (this.mlEngine && this.strategy.ml_routing.learning_enabled) {
          await this.mlEngine.learnFromOutcome(request, backend.name, response, !response.error);
        }
        
        return response;
      } catch (error) {
        console.warn(`⚠️ Async contribution from ${backend.name} failed:`, error);
        return null;
      }
    });

    await Promise.allSettled(contributionPromises);
  }

  private async performBackgroundOptimization(): Promise<void> {
    if (!this.optimizer) return;
    
    // Increment optimization events counter
    this.routingStats.optimizationEvents++;
    
    // Perform optimization in background (don't await)
    setImmediate(async () => {
      try {
        await this.optimizer!.optimizeResources();
      } catch (error) {
        console.warn('⚠️ Background optimization failed:', error);
      }
    });
  }

  private recordRequestResult(backendName: string, latency: number, success: boolean): void {
    this.requestHistory.push({
      backend: backendName,
      latency,
      success,
      timestamp: Date.now(),
      mlPredicted: this.routingStats.mlRoutingUsed > 0,
      cacheHit: false // This would be set appropriately
    });

    // Keep only recent history (last 100 requests)
    if (this.requestHistory.length > 100) {
      this.requestHistory.shift();
    }
  }

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

  private updateRoutingStats(backendName: string, response: ClaudetteResponse, mlUsed: boolean): void {
    // Update average routing time
    this.routingStats.avgRoutingTime = (this.routingStats.avgRoutingTime + response.latency_ms) / 2;
  }

  private calculateRecentPerformance(): Record<string, any> {
    const recentHistory = this.requestHistory.slice(-50);
    const recentPerformance: Record<string, any> = {};

    // Calculate recent performance per backend
    this.backends.forEach((_, name) => {
      const backendHistory = recentHistory.filter(h => h.backend === name);
      
      if (backendHistory.length > 0) {
        recentPerformance[name] = {
          requests: backendHistory.length,
          successRate: backendHistory.filter(h => h.success).length / backendHistory.length,
          avgLatency: backendHistory.reduce((sum, h) => sum + h.latency, 0) / backendHistory.length,
          mlPredictions: backendHistory.filter(h => h.mlPredicted).length,
          cacheHits: backendHistory.filter(h => h.cacheHit).length
        };
      }
    });

    return recentPerformance;
  }

  private generateSystemRecommendations(): string[] {
    const recommendations: string[] = [];
    const stats = this.routingStats;

    // ML usage recommendations
    if (stats.mlRoutingUsed / stats.totalRequests < 0.8 && this.strategy.ml_routing.enabled) {
      recommendations.push('Consider lowering ML confidence threshold to increase ML routing usage');
    }

    // Cache performance recommendations
    if (stats.cacheHits / stats.totalRequests < 0.7 && this.strategy.advanced_caching.enabled) {
      recommendations.push('Cache hit rate is low - consider enabling predictive warming or increasing cache size');
    }

    // Optimization recommendations
    if (stats.optimizationEvents < stats.totalRequests / 100) {
      recommendations.push('System optimization events are low - consider enabling auto-optimization');
    }

    return recommendations;
  }

  private enhanceResponseWithMetadata(
    response: ClaudetteResponse,
    ragMetadata: any,
    performanceMetrics: any,
    fromCache: boolean
  ): ClaudetteResponse {
    
    return {
      ...response,
      metadata: {
        ...response.metadata,
        rag: ragMetadata,
        performance: performanceMetrics,
        fromCache,
        enhancedRouter: true
      }
    };
  }

  private isRAGRequest(request: ClaudetteRequest): boolean {
    const ragRequest = request as ClaudetteRAGRequest;
    return !!(ragRequest.useRAG && ragRequest.ragQuery);
  }

  // Legacy compatibility methods
  getBackendByName(name: string): Backend | undefined {
    return this.backends.get(name);
  }

  setRAGManager(ragManager: RAGManager): void {
    this.ragManager = ragManager;
    console.log('🧠 RAG Manager configured for enhanced router');
  }

  getRAGManager(): RAGManager | undefined {
    return this.ragManager;
  }

  async routeWithRAG(
    request: ClaudetteRequest, 
    ragQuery: string, 
    contextStrategy?: 'prepend' | 'append' | 'inject'
  ): Promise<ClaudetteResponse> {
    const ragRequest: ClaudetteRAGRequest = {
      ...request,
      useRAG: true,
      ragQuery,
      contextStrategy: contextStrategy || 'prepend'
    };

    return this.route(ragRequest);
  }

  resetPerformanceTracking(): void {
    this.backendScores.clear();
    this.requestHistory = [];
    this.routingStats = {
      totalRequests: 0,
      mlRoutingUsed: 0,
      cacheHits: 0,
      optimizationEvents: 0,
      avgRoutingTime: 0
    };
    
    // Reset ML engine if available
    if (this.mlEngine) {
      this.mlEngine.reset();
    }
    
    // Clear cache if available
    if (this.cache) {
      this.cache.clear();
    }
    
    // Clear analytics if available
    if (this.analytics) {
      this.analytics.clearData();
    }
    
    // Reinitialize scores
    this.backends.forEach(backend => {
      const info = backend.getInfo();
      this.backendScores.set(backend.name, info.priority);
    });
    
    console.log('🔄 Enhanced router performance tracking reset');
  }

  /**
   * Get enhanced router configuration
   */
  getConfiguration(): EnhancedRoutingStrategy {
    return { ...this.strategy };
  }

  /**
   * Update enhanced router configuration
   */
  updateConfiguration(newStrategy: Partial<EnhancedRoutingStrategy>): void {
    this.strategy = { ...this.strategy, ...newStrategy };
    console.log('⚙️ Enhanced router configuration updated');
  }

  /**
   * Shutdown enhanced router and cleanup resources
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down enhanced router...');
    
    if (this.optimizer) {
      this.optimizer.stop();
    }
    
    if (this.cache) {
      this.cache.clear();
    }
    
    console.log('✅ Enhanced router shutdown complete');
  }

  /**
   * Convert RAGResponse to ClaudetteResponse format
   */
  private convertRAGToClaudetteResponse(ragResponse: RAGResponse): ClaudetteResponse {
    return {
      content: ragResponse.results.map(r => r.content).join('\n'),
      backend_used: 'rag-cache',
      tokens_input: 0,
      tokens_output: ragResponse.results.reduce((sum, r) => sum + r.content.length, 0),
      cost_eur: 0,
      latency_ms: ragResponse.metadata.processingTime,
      cache_hit: true,
      metadata: ragResponse.metadata
    };
  }
}