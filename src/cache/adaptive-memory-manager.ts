/**
 * Adaptive Memory Manager for Claudette Cache System
 * Provides intelligent memory pressure detection and cache optimization
 */

export interface MemoryPressureMetrics {
  heapUsed: number;
  heapTotal: number;
  heapPercent: number;
  external: number;
  pressure: 'low' | 'medium' | 'high' | 'critical';
  recommendation: 'expand' | 'maintain' | 'reduce' | 'emergency';
}

export interface AdaptiveCacheConfig {
  maxMemoryPercent: number;
  warningThreshold: number;
  emergencyThreshold: number;
  optimizationInterval: number;
  smartEvictionEnabled: boolean;
}

export class AdaptiveMemoryManager {
  private config: AdaptiveCacheConfig;
  private memoryHistory: MemoryPressureMetrics[] = [];
  private lastOptimization: number = 0;
  private optimizationInterval: NodeJS.Timeout | null = null;
  private emergencyCleanupCallbacks: Array<() => void> = [];

  constructor(config: Partial<AdaptiveCacheConfig> = {}) {
    this.config = {
      maxMemoryPercent: 80, // Use up to 80% of available heap
      warningThreshold: 70, // Start optimization at 70%
      emergencyThreshold: 90, // Emergency cleanup at 90%
      optimizationInterval: process.env.CLAUDETTE_BENCHMARK ? 60000 : 30000, // Less frequent monitoring in benchmark mode
      smartEvictionEnabled: true,
      ...config
    };

    this.startOptimizationMonitoring();
  }

  /**
   * Get current memory pressure metrics
   */
  getMemoryPressure(): MemoryPressureMetrics {
    const memUsage = process.memoryUsage();
    const heapPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    let pressure: MemoryPressureMetrics['pressure'];
    let recommendation: MemoryPressureMetrics['recommendation'];

    if (heapPercent >= this.config.emergencyThreshold) {
      pressure = 'critical';
      recommendation = 'emergency';
    } else if (heapPercent >= this.config.maxMemoryPercent) {
      pressure = 'high';
      recommendation = 'reduce';
    } else if (heapPercent >= this.config.warningThreshold) {
      pressure = 'medium';
      recommendation = 'maintain';
    } else {
      pressure = 'low';
      recommendation = 'expand';
    }

    const metrics: MemoryPressureMetrics = {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      heapPercent,
      external: memUsage.external,
      pressure,
      recommendation
    };

    // Track history for trend analysis
    this.memoryHistory.push(metrics);
    if (this.memoryHistory.length > 100) {
      this.memoryHistory = this.memoryHistory.slice(-50); // Keep last 50 readings
    }

    return metrics;
  }

  /**
   * Calculate smart eviction strategy based on memory pressure and access patterns
   */
  calculateEvictionStrategy(
    currentSize: number,
    accessPatterns: Map<string, { lastAccess: number; hitCount: number; size: number }>
  ): {
    targetSize: number;
    evictionCandidates: string[];
    strategy: 'none' | 'gentle' | 'moderate' | 'aggressive' | 'emergency';
  } {
    const pressure = this.getMemoryPressure();
    
    let targetReduction = 0;
    let strategy: 'none' | 'gentle' | 'moderate' | 'aggressive' | 'emergency' = 'none';

    switch (pressure.recommendation) {
      case 'emergency':
        targetReduction = 0.5; // Remove 50% immediately
        strategy = 'emergency';
        break;
      case 'reduce':
        targetReduction = 0.3; // Remove 30%
        strategy = 'aggressive';
        break;
      case 'maintain':
        // Gentle cleanup of least recently used items
        targetReduction = 0.1; // Remove 10%
        strategy = 'gentle';
        break;
      case 'expand':
      default:
        return {
          targetSize: currentSize,
          evictionCandidates: [],
          strategy: 'none'
        };
    }

    // Smart eviction: prioritize by access patterns
    const candidates = Array.from(accessPatterns.entries())
      .map(([key, stats]) => ({
        key,
        score: this.calculateEvictionScore(stats),
        size: stats.size
      }))
      .sort((a, b) => a.score - b.score); // Lower score = better eviction candidate

    const targetSize = Math.floor(currentSize * (1 - targetReduction));
    const evictionCandidates: string[] = [];
    let removedSize = 0;
    let currentIndex = 0;

    while (removedSize < (currentSize - targetSize) && currentIndex < candidates.length) {
      const candidate = candidates[currentIndex];
      evictionCandidates.push(candidate.key);
      removedSize += candidate.size;
      currentIndex++;
    }

    return {
      targetSize,
      evictionCandidates,
      strategy
    };
  }

  /**
   * Calculate eviction score for cache entry (lower = more likely to be evicted)
   */
  private calculateEvictionScore(stats: { lastAccess: number; hitCount: number; size: number }): number {
    const now = Date.now();
    const timeSinceAccess = now - stats.lastAccess;
    const hoursSinceAccess = timeSinceAccess / (1000 * 60 * 60);
    
    // Scoring factors (lower score = higher eviction priority)
    const recencyScore = Math.min(hoursSinceAccess, 168); // Cap at 1 week
    const popularityScore = Math.max(1, Math.log(stats.hitCount + 1)); // Logarithmic popularity
    const sizeScore = Math.log(stats.size + 1); // Larger items slightly preferred for eviction
    
    // Combined score: balance recency, popularity, and size
    return popularityScore * 0.4 - recencyScore * 0.4 + sizeScore * 0.2;
  }

  /**
   * Analyze memory trends and predict optimal cache size
   */
  analyzeTrends(): {
    trendDirection: 'increasing' | 'decreasing' | 'stable';
    recommendedCacheSize: number;
    confidence: number;
  } {
    if (this.memoryHistory.length < 10) {
      return {
        trendDirection: 'stable',
        recommendedCacheSize: 1000, // Default size
        confidence: 0.1
      };
    }

    const recent = this.memoryHistory.slice(-10);
    const older = this.memoryHistory.slice(-20, -10);
    
    const recentAvg = recent.reduce((sum, m) => sum + m.heapPercent, 0) / recent.length;
    const olderAvg = older.length > 0 
      ? older.reduce((sum, m) => sum + m.heapPercent, 0) / older.length 
      : recentAvg;

    const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    let trendDirection: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(percentChange) < 5) {
      trendDirection = 'stable';
    } else if (percentChange > 0) {
      trendDirection = 'increasing';
    } else {
      trendDirection = 'decreasing';
    }

    // Calculate recommended cache size based on available memory
    const availableMemoryPercent = 100 - recentAvg;
    const safeCachePercent = Math.min(availableMemoryPercent * 0.6, 30); // Use max 30% for cache
    const recommendedCacheSize = Math.floor(1000 * (safeCachePercent / 20)); // Scale from baseline

    const confidence = Math.min(this.memoryHistory.length / 50, 1); // More history = higher confidence

    return {
      trendDirection,
      recommendedCacheSize: Math.max(100, recommendedCacheSize), // Minimum 100 entries
      confidence
    };
  }

  /**
   * Force garbage collection if available (Node.js with --expose-gc)
   */
  forceGarbageCollection(): boolean {
    try {
      if (global.gc) {
        global.gc();
        return true;
      }
    } catch (error) {
      // gc not available
    }
    return false;
  }

  /**
   * Get memory optimization recommendations
   */
  getOptimizationRecommendations(): {
    action: string;
    reason: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    expectedImpact: string;
  }[] {
    const pressure = this.getMemoryPressure();
    const trends = this.analyzeTrends();
    const recommendations: any[] = [];

    if (pressure.pressure === 'critical') {
      recommendations.push({
        action: 'Emergency cache cleanup - remove 50% of entries',
        reason: 'Memory usage is critical (>90%)',
        priority: 'urgent',
        expectedImpact: 'Immediate 30-50% memory reduction'
      });
    }

    if (pressure.pressure === 'high') {
      recommendations.push({
        action: 'Aggressive cache cleanup - remove 30% of least used entries',
        reason: 'Memory usage is high (>80%)',
        priority: 'high',
        expectedImpact: '20-30% memory reduction'
      });
    }

    if (trends.trendDirection === 'increasing' && pressure.pressure !== 'low') {
      recommendations.push({
        action: 'Reduce cache size proactively',
        reason: 'Memory usage trending upward',
        priority: 'medium',
        expectedImpact: 'Prevent future memory pressure'
      });
    }

    if (pressure.pressure === 'low' && trends.trendDirection === 'stable') {
      recommendations.push({
        action: 'Consider increasing cache size for better performance',
        reason: 'Memory usage is low and stable',
        priority: 'low',
        expectedImpact: '10-20% performance improvement'
      });
    }

    if (!this.forceGarbageCollection() && pressure.pressure !== 'low') {
      recommendations.push({
        action: 'Consider running Node.js with --expose-gc for better memory management',
        reason: 'Garbage collection control not available',
        priority: 'low',
        expectedImpact: 'More precise memory management'
      });
    }

    return recommendations;
  }

  /**
   * Start monitoring memory pressure and automatic optimization
   */
  private startOptimizationMonitoring(): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
    }

    this.optimizationInterval = setInterval(() => {
      const pressure = this.getMemoryPressure();
      
      // Only log memory pressure in development mode or if it's critical
      if (pressure.pressure === 'critical' && process.env.NODE_ENV === 'development') {
        console.log(`[AdaptiveMemoryManager] Memory pressure: ${pressure.pressure} (${pressure.heapPercent.toFixed(1)}%) - Recommendation: ${pressure.recommendation}`);
      }
      
      // Auto-trigger garbage collection for emergency situations
      if (pressure.pressure === 'critical') {
        this.forceGarbageCollection();
        this.notifyEmergencyCleanup();
      }
    }, this.config.optimizationInterval);
  }

  /**
   * Register callback for emergency cleanup
   */
  onEmergencyCleanup(callback: () => void): void {
    this.emergencyCleanupCallbacks.push(callback);
  }

  /**
   * Notify registered callbacks of emergency cleanup need
   */
  private notifyEmergencyCleanup(): void {
    this.emergencyCleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.warn('[AdaptiveMemoryManager] Emergency cleanup callback failed:', error);
      }
    });
  }

  /**
   * Stop memory monitoring
   */
  stop(): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }
    this.emergencyCleanupCallbacks = [];
  }

  /**
   * Get detailed memory statistics
   */
  getDetailedStats(): {
    current: MemoryPressureMetrics;
    trends: ReturnType<AdaptiveMemoryManager['analyzeTrends']>;
    recommendations: ReturnType<AdaptiveMemoryManager['getOptimizationRecommendations']>;
    history: MemoryPressureMetrics[];
  } {
    return {
      current: this.getMemoryPressure(),
      trends: this.analyzeTrends(),
      recommendations: this.getOptimizationRecommendations(),
      history: [...this.memoryHistory]
    };
  }
}

export default AdaptiveMemoryManager;