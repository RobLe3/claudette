/**
 * Dynamic Timeout Manager
 * Automatically adjusts backend timeouts based on performance history and quality metrics
 */

class DynamicTimeoutManager {
  constructor() {
    this.performanceHistory = new Map(); // backend -> performance data
    this.timeoutCurves = new Map(); // backend -> adaptive timeout curve
    this.calibrationWindow = 20; // Number of requests to analyze
    this.minTimeout = 5000; // 5s minimum
    this.maxTimeout = 55000; // 55s maximum (5s under MCP timeout)
    this.qualityThresholds = {
      excellent: 0.95, // 95%+ success rate
      good: 0.85,      // 85%+ success rate  
      fair: 0.70,      // 70%+ success rate
      poor: 0.50       // 50%+ success rate
    };
  }

  /**
   * Record backend performance metrics
   */
  recordPerformance(backendName, metrics) {
    if (!this.performanceHistory.has(backendName)) {
      this.performanceHistory.set(backendName, []);
    }

    const history = this.performanceHistory.get(backendName);
    const performanceRecord = {
      timestamp: Date.now(),
      latency: metrics.latency,
      success: metrics.success,
      error: metrics.error || null,
      timeout: metrics.timeout || false,
      requestSize: metrics.requestSize || 0,
      responseSize: metrics.responseSize || 0
    };

    history.push(performanceRecord);
    
    // Keep only recent history
    if (history.length > this.calibrationWindow * 2) {
      history.splice(0, history.length - this.calibrationWindow);
    }

    // Recalibrate timeout after sufficient data
    if (history.length >= Math.min(5, this.calibrationWindow / 4)) {
      this.calibrateTimeout(backendName);
    }
  }

  /**
   * Calibrate timeout based on performance history
   */
  calibrateTimeout(backendName) {
    const history = this.performanceHistory.get(backendName);
    if (!history || history.length < 3) return;

    const recentHistory = history.slice(-this.calibrationWindow);
    const analysis = this.analyzePerformance(recentHistory);
    
    // Calculate dynamic timeout based on quality tier
    const qualityTier = this.determineQualityTier(analysis);
    const baseTimeout = this.calculateBaseTimeout(analysis);
    const adaptiveTimeout = this.applyQualityModifier(baseTimeout, qualityTier, analysis);
    
    // Store calibrated timeout curve
    this.timeoutCurves.set(backendName, {
      currentTimeout: Math.max(this.minTimeout, Math.min(this.maxTimeout, adaptiveTimeout)),
      qualityTier,
      lastCalibration: Date.now(),
      confidence: analysis.confidence,
      performanceStats: analysis
    });

    console.log(`[TIMEOUT CALIBRATION] ${backendName}:`, {
      newTimeout: this.timeoutCurves.get(backendName).currentTimeout + 'ms',
      qualityTier,
      avgLatency: Math.round(analysis.avgLatency) + 'ms',
      successRate: (analysis.successRate * 100).toFixed(1) + '%',
      confidence: analysis.confidence
    });
  }

  /**
   * Analyze performance metrics
   */
  analyzePerformance(history) {
    const successful = history.filter(h => h.success);
    const failed = history.filter(h => !h.success);
    const timeouts = history.filter(h => h.timeout);
    
    const latencies = successful.map(h => h.latency);
    const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;
    const p95Latency = latencies.length > 0 ? this.calculatePercentile(latencies, 0.95) : 0;
    
    const successRate = history.length > 0 ? successful.length / history.length : 0;
    const timeoutRate = history.length > 0 ? timeouts.length / history.length : 0;
    
    // Calculate confidence based on sample size and consistency
    const confidence = Math.min(1.0, history.length / this.calibrationWindow);
    const latencyVariance = this.calculateVariance(latencies);
    const consistencyScore = latencyVariance > 0 ? 1 / (1 + latencyVariance / avgLatency) : 1;
    
    return {
      avgLatency,
      maxLatency,
      p95Latency,
      successRate,
      timeoutRate,
      confidence: confidence * consistencyScore,
      sampleSize: history.length,
      trend: this.calculateTrend(history)
    };
  }

  /**
   * Determine backend quality tier
   */
  determineQualityTier(analysis) {
    const score = analysis.successRate * (1 - analysis.timeoutRate) * analysis.confidence;
    
    if (score >= this.qualityThresholds.excellent) return 'excellent';
    if (score >= this.qualityThresholds.good) return 'good';
    if (score >= this.qualityThresholds.fair) return 'fair';
    return 'poor';
  }

  /**
   * Calculate base timeout from performance data
   */
  calculateBaseTimeout(analysis) {
    // Use P95 latency + buffer as baseline
    const p95Buffer = analysis.p95Latency * 1.5; // 50% buffer over P95
    const maxBuffer = analysis.maxLatency * 1.2; // 20% buffer over max
    const avgBuffer = analysis.avgLatency * 2.0; // 100% buffer over average
    
    // Choose conservative estimate
    return Math.max(p95Buffer, Math.min(maxBuffer, avgBuffer));
  }

  /**
   * Apply quality-based timeout modifier
   */
  applyQualityModifier(baseTimeout, qualityTier, analysis) {
    const modifiers = {
      excellent: 0.8, // Reduce timeout for reliable backends
      good: 0.9,      // Slightly reduce timeout
      fair: 1.0,      // Use base timeout
      poor: 1.3       // Increase timeout for unreliable backends
    };
    
    let adjustedTimeout = baseTimeout * modifiers[qualityTier];
    
    // Apply trend-based adjustment
    if (analysis.trend === 'improving') {
      adjustedTimeout *= 0.9; // Reduce timeout for improving backends
    } else if (analysis.trend === 'degrading') {
      adjustedTimeout *= 1.1; // Increase timeout for degrading backends
    }
    
    return adjustedTimeout;
  }

  /**
   * Get current timeout for backend
   */
  getTimeoutForBackend(backendName, requestContext = {}) {
    const curve = this.timeoutCurves.get(backendName);
    
    if (!curve) {
      // No calibration data - use intelligent default based on backend type
      return this.getIntelligentDefault(backendName, requestContext);
    }
    
    // Apply request-specific modifiers
    let timeout = curve.currentTimeout;
    
    // Adjust for request complexity
    if (requestContext.complexityScore) {
      timeout *= (1 + requestContext.complexityScore * 0.5);
    }
    
    // Adjust for request size
    if (requestContext.requestSize > 10000) { // Large requests
      timeout *= 1.2;
    }
    
    return Math.max(this.minTimeout, Math.min(this.maxTimeout, timeout));
  }

  /**
   * Get intelligent default timeout for new backends
   */
  getIntelligentDefault(backendName, requestContext) {
    const defaults = {
      'openai': 35000,    // OpenAI tends to be reliable
      'claude': 30000,    // Claude is generally fast
      'custom': 40000,    // Custom backends are less predictable
      'qwen': 45000,      // Qwen/external may be slower
      'local': 20000      // Local models should be fast
    };
    
    // Determine backend type
    const backendType = this.inferBackendType(backendName);
    return defaults[backendType] || 35000; // Default fallback
  }

  /**
   * Infer backend type from name
   */
  inferBackendType(backendName) {
    const name = backendName.toLowerCase();
    if (name.includes('openai') || name.includes('gpt')) return 'openai';
    if (name.includes('claude') || name.includes('anthropic')) return 'claude';
    if (name.includes('custom') || name.includes('flexcon')) return 'custom';
    if (name.includes('qwen') || name.includes('local')) return 'qwen';
    if (name.includes('ollama') || name.includes('localhost')) return 'local';
    return 'custom';
  }

  /**
   * Calculate performance trend
   */
  calculateTrend(history) {
    if (history.length < 5) return 'stable';
    
    const recent = history.slice(-5);
    const older = history.slice(-10, -5);
    
    if (older.length === 0) return 'stable';
    
    const recentAvgLatency = recent.reduce((sum, h) => sum + h.latency, 0) / recent.length;
    const olderAvgLatency = older.reduce((sum, h) => sum + h.latency, 0) / older.length;
    
    const recentSuccessRate = recent.filter(h => h.success).length / recent.length;
    const olderSuccessRate = older.filter(h => h.success).length / older.length;
    
    const latencyImprovement = (olderAvgLatency - recentAvgLatency) / olderAvgLatency;
    const successImprovement = recentSuccessRate - olderSuccessRate;
    
    if (latencyImprovement > 0.1 && successImprovement > 0.05) return 'improving';
    if (latencyImprovement < -0.1 || successImprovement < -0.05) return 'degrading';
    return 'stable';
  }

  /**
   * Calculate percentile
   */
  calculatePercentile(values, percentile) {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = percentile * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    
    if (upper >= sorted.length) return sorted[sorted.length - 1];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Calculate variance
   */
  calculateVariance(values) {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return variance;
  }

  /**
   * Get calibration status for all backends
   */
  getCalibrationStatus() {
    const status = {};
    
    for (const [backendName, curve] of this.timeoutCurves.entries()) {
      const history = this.performanceHistory.get(backendName) || [];
      status[backendName] = {
        currentTimeout: curve.currentTimeout,
        qualityTier: curve.qualityTier,
        confidence: curve.confidence,
        sampleSize: history.length,
        lastCalibration: curve.lastCalibration,
        performanceStats: curve.performanceStats
      };
    }
    
    return status;
  }

  /**
   * Reset calibration for a backend (useful for testing or after major changes)
   */
  resetCalibration(backendName) {
    this.performanceHistory.delete(backendName);
    this.timeoutCurves.delete(backendName);
  }
}

module.exports = { DynamicTimeoutManager };