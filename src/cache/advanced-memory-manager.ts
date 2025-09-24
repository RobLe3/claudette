/**
 * Advanced Scalable Memory Manager
 * Dynamic memory allocation with pressure-based scaling and predictive algorithms
 */

export interface MemoryPool {
  id: string;
  allocated: number;
  used: number;
  maxSize: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  elasticity: number; // 0-1, how much it can shrink/grow
  cleanup: () => Promise<number>; // Returns bytes freed
}

export interface ScalabilityMetrics {
  totalAllocated: number;
  totalUsed: number;
  utilizationRatio: number;
  pressureTrend: 'increasing' | 'decreasing' | 'stable';
  predictedPressureIn5min: number;
  recommendedAction: 'scale_up' | 'scale_down' | 'maintain' | 'emergency_scale';
  availableHeadroom: number;
}

export interface DynamicThresholds {
  low: number;
  medium: number;
  high: number;
  critical: number;
  emergency: number;
  adaptive: boolean;
}

export class AdvancedMemoryManager {
  private memoryPools: Map<string, MemoryPool> = new Map();
  private pressureHistory: Array<{ timestamp: number; pressure: number; heapUsed: number }> = [];
  private dynamicThresholds: DynamicThresholds;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private scalingCallbacks: Map<string, (action: string, intensity: number) => Promise<void>> = new Map();
  private systemMaxMemory: number;
  private emergencyReserve: number; // Always keep this much memory free
  private predictionModel: MemoryPredictionModel;

  constructor(config: {
    baseThresholds?: Partial<DynamicThresholds>;
    emergencyReservePercent?: number;
    monitoringInterval?: number;
    adaptiveThresholds?: boolean;
  } = {}) {
    // Detect system memory capacity
    this.systemMaxMemory = this.detectSystemMemory();
    this.emergencyReserve = Math.floor(this.systemMaxMemory * (config.emergencyReservePercent || 0.15)); // 15% reserve

    this.dynamicThresholds = {
      low: 40,
      medium: 60,
      high: 75,
      critical: 85,
      emergency: 95,
      adaptive: config.adaptiveThresholds !== false,
      ...config.baseThresholds
    };

    this.predictionModel = new MemoryPredictionModel();
    this.startMonitoring(config.monitoringInterval || 15000); // 15s default
  }

  /**
   * Register a memory pool for dynamic management
   */
  registerMemoryPool(pool: MemoryPool): void {
    this.memoryPools.set(pool.id, pool);
    console.log(`[AdvancedMemoryManager] Registered memory pool: ${pool.id} (${pool.maxSize} bytes, priority: ${pool.priority})`);
  }

  /**
   * Register callback for scaling actions
   */
  onScalingAction(poolId: string, callback: (action: string, intensity: number) => Promise<void>): void {
    this.scalingCallbacks.set(poolId, callback);
  }

  /**
   * Get comprehensive scalability metrics
   */
  getScalabilityMetrics(): ScalabilityMetrics {
    const memUsage = process.memoryUsage();
    const heapPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    const totalAllocated = Array.from(this.memoryPools.values())
      .reduce((sum, pool) => sum + pool.allocated, 0);
    
    const totalUsed = Array.from(this.memoryPools.values())
      .reduce((sum, pool) => sum + pool.used, 0);

    const utilizationRatio = totalAllocated > 0 ? totalUsed / totalAllocated : 0;
    const pressureTrend = this.analyzePressureTrend();
    const predictedPressure = this.predictionModel.predictPressure(this.pressureHistory);
    const availableHeadroom = this.systemMaxMemory - memUsage.heapUsed - this.emergencyReserve;

    let recommendedAction: ScalabilityMetrics['recommendedAction'] = 'maintain';
    
    if (heapPercent >= this.dynamicThresholds.emergency) {
      recommendedAction = 'emergency_scale';
    } else if (heapPercent >= this.dynamicThresholds.critical || predictedPressure > this.dynamicThresholds.critical) {
      recommendedAction = 'scale_down';
    } else if (heapPercent <= this.dynamicThresholds.low && availableHeadroom > this.systemMaxMemory * 0.3) {
      recommendedAction = 'scale_up';
    } else if (pressureTrend === 'increasing' && heapPercent > this.dynamicThresholds.medium) {
      recommendedAction = 'scale_down';
    }

    return {
      totalAllocated,
      totalUsed,
      utilizationRatio,
      pressureTrend,
      predictedPressureIn5min: predictedPressure,
      recommendedAction,
      availableHeadroom: Math.max(0, availableHeadroom)
    };
  }

  /**
   * Dynamically adjust memory allocations based on pressure
   */
  async performDynamicScaling(): Promise<{
    action: string;
    poolsAffected: string[];
    memoryFreed: number;
    memoryAllocated: number;
  }> {
    const metrics = this.getScalabilityMetrics();
    const memUsage = process.memoryUsage();
    const currentPressure = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    let memoryFreed = 0;
    let memoryAllocated = 0;
    const poolsAffected: string[] = [];

    switch (metrics.recommendedAction) {
      case 'emergency_scale':
        // Emergency: Aggressive cleanup from all pools
        console.log(`[AdvancedMemoryManager] EMERGENCY SCALING: ${currentPressure.toFixed(1)}% pressure`);
        for (const [poolId, pool] of this.memoryPools) {
          try {
            const freed = await pool.cleanup();
            memoryFreed += freed;
            poolsAffected.push(poolId);
            
            // Reduce pool allocation by elasticity factor
            const reduction = Math.floor(pool.allocated * pool.elasticity * 0.8); // 80% of elasticity in emergency
            pool.allocated = Math.max(pool.allocated - reduction, pool.used);
            
            // Trigger scaling callback
            const callback = this.scalingCallbacks.get(poolId);
            if (callback) {
              await callback('emergency_reduce', 0.8);
            }
          } catch (error) {
            console.warn(`[AdvancedMemoryManager] Emergency cleanup failed for ${poolId}:`, error);
          }
        }
        break;

      case 'scale_down':
        // Scale down based on priority and elasticity
        const intensity = this.calculateScalingIntensity(currentPressure);
        console.log(`[AdvancedMemoryManager] Scaling down with intensity ${intensity}`);
        
        // Sort pools by priority (critical last) and elasticity (high first)
        const poolsToReduce = Array.from(this.memoryPools.entries())
          .sort(([,a], [,b]) => {
            const priorityWeight = { low: 1, medium: 2, high: 3, critical: 4 };
            return (priorityWeight[a.priority] - priorityWeight[b.priority]) || (b.elasticity - a.elasticity);
          });

        for (const [poolId, pool] of poolsToReduce) {
          if (memoryFreed >= this.calculateTargetReduction(currentPressure)) break;

          const reductionFactor = Math.min(intensity * pool.elasticity, 0.6); // Max 60% reduction
          const targetReduction = Math.floor(pool.allocated * reductionFactor);
          
          try {
            const freed = await pool.cleanup();
            memoryFreed += freed;
            pool.allocated = Math.max(pool.allocated - targetReduction, pool.used);
            poolsAffected.push(poolId);

            const callback = this.scalingCallbacks.get(poolId);
            if (callback) {
              await callback('reduce', reductionFactor);
            }
          } catch (error) {
            console.warn(`[AdvancedMemoryManager] Scale down failed for ${poolId}:`, error);
          }
        }
        break;

      case 'scale_up':
        // Scale up low priority pools first if we have headroom
        console.log(`[AdvancedMemoryManager] Scaling up - Available headroom: ${(metrics.availableHeadroom / 1024 / 1024).toFixed(1)}MB`);
        
        const poolsToExpand = Array.from(this.memoryPools.entries())
          .filter(([, pool]) => pool.used / pool.allocated > 0.8) // Only expand heavily used pools
          .sort(([,a], [,b]) => {
            const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
            return priorityWeight[b.priority] - priorityWeight[a.priority]; // High priority first
          });

        for (const [poolId, pool] of poolsToExpand) {
          const growthFactor = Math.min(0.5, pool.elasticity); // Max 50% growth
          const targetGrowth = Math.floor(pool.allocated * growthFactor);
          
          if (memoryAllocated + targetGrowth <= metrics.availableHeadroom * 0.5) { // Use max 50% of available
            pool.allocated += targetGrowth;
            memoryAllocated += targetGrowth;
            poolsAffected.push(poolId);

            const callback = this.scalingCallbacks.get(poolId);
            if (callback) {
              await callback('expand', growthFactor);
            }
          }
        }
        break;
    }

    // Update adaptive thresholds based on performance
    if (this.dynamicThresholds.adaptive) {
      this.adjustAdaptiveThresholds(currentPressure, metrics.pressureTrend);
    }

    // Force garbage collection if significant memory was freed
    if (memoryFreed > this.systemMaxMemory * 0.05) { // 5% of system memory
      this.forceGarbageCollection();
    }

    return {
      action: metrics.recommendedAction,
      poolsAffected,
      memoryFreed,
      memoryAllocated
    };
  }

  /**
   * Calculate scaling intensity based on current pressure
   */
  private calculateScalingIntensity(pressure: number): number {
    if (pressure >= this.dynamicThresholds.emergency) return 1.0;
    if (pressure >= this.dynamicThresholds.critical) return 0.8;
    if (pressure >= this.dynamicThresholds.high) return 0.6;
    if (pressure >= this.dynamicThresholds.medium) return 0.4;
    return 0.2;
  }

  /**
   * Calculate target memory reduction based on pressure
   */
  private calculateTargetReduction(pressure: number): number {
    const excessPressure = Math.max(0, pressure - this.dynamicThresholds.medium);
    const targetReduction = (excessPressure / 100) * this.systemMaxMemory;
    return Math.min(targetReduction, this.systemMaxMemory * 0.3); // Max 30% reduction
  }

  /**
   * Analyze pressure trend from history
   */
  private analyzePressureTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this.pressureHistory.length < 5) return 'stable';

    const recent = this.pressureHistory.slice(-5);
    const older = this.pressureHistory.slice(-10, -5);
    
    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, h) => sum + h.pressure, 0) / recent.length;
    const olderAvg = older.reduce((sum, h) => sum + h.pressure, 0) / older.length;
    
    const difference = recentAvg - olderAvg;
    const threshold = 5; // 5% change threshold

    if (difference > threshold) return 'increasing';
    if (difference < -threshold) return 'decreasing';
    return 'stable';
  }

  /**
   * Adjust adaptive thresholds based on system performance
   */
  private adjustAdaptiveThresholds(currentPressure: number, trend: string): void {
    const adjustment = 2; // 2% adjustment steps

    // If we're consistently hitting high pressure, lower thresholds
    if (trend === 'increasing' && currentPressure > this.dynamicThresholds.high) {
      this.dynamicThresholds.high = Math.max(50, this.dynamicThresholds.high - adjustment);
      this.dynamicThresholds.critical = Math.max(60, this.dynamicThresholds.critical - adjustment);
    }
    
    // If pressure is consistently low, we can raise thresholds
    if (trend === 'stable' && currentPressure < this.dynamicThresholds.low) {
      this.dynamicThresholds.high = Math.min(85, this.dynamicThresholds.high + adjustment);
      this.dynamicThresholds.critical = Math.min(90, this.dynamicThresholds.critical + adjustment);
    }
  }

  /**
   * Detect system memory capacity
   */
  private detectSystemMemory(): number {
    const memUsage = process.memoryUsage();
    // Estimate system memory as 4x current heap total (conservative estimate)
    return memUsage.heapTotal * 4;
  }

  /**
   * Force garbage collection
   */
  private forceGarbageCollection(): boolean {
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
   * Start monitoring and automatic scaling
   */
  private startMonitoring(interval: number): void {
    this.monitoringInterval = setInterval(async () => {
      const memUsage = process.memoryUsage();
      const pressure = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      // Record pressure history
      this.pressureHistory.push({
        timestamp: Date.now(),
        pressure,
        heapUsed: memUsage.heapUsed
      });

      // Keep last 100 readings
      if (this.pressureHistory.length > 100) {
        this.pressureHistory = this.pressureHistory.slice(-50);
      }

      // Perform scaling if needed
      if (pressure > this.dynamicThresholds.medium) {
        try {
          const result = await this.performDynamicScaling();
          if (result.poolsAffected.length > 0) {
            console.log(`[AdvancedMemoryManager] Scaling complete: ${result.action}, affected ${result.poolsAffected.length} pools, freed ${(result.memoryFreed / 1024 / 1024).toFixed(1)}MB`);
          }
        } catch (error) {
          console.warn('[AdvancedMemoryManager] Scaling operation failed:', error);
        }
      }
    }, interval);
  }

  /**
   * Stop monitoring and cleanup
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.memoryPools.clear();
    this.scalingCallbacks.clear();
    this.pressureHistory = [];
  }

  /**
   * Get detailed status report
   */
  getDetailedStatus(): {
    thresholds: DynamicThresholds;
    pools: Array<{ id: string; allocated: number; used: number; utilization: number; priority: string }>;
    metrics: ScalabilityMetrics;
    systemInfo: { maxMemory: number; emergencyReserve: number; currentHeapUsed: number };
  } {
    const memUsage = process.memoryUsage();
    
    return {
      thresholds: { ...this.dynamicThresholds },
      pools: Array.from(this.memoryPools.entries()).map(([id, pool]) => ({
        id,
        allocated: pool.allocated,
        used: pool.used,
        utilization: pool.allocated > 0 ? pool.used / pool.allocated : 0,
        priority: pool.priority
      })),
      metrics: this.getScalabilityMetrics(),
      systemInfo: {
        maxMemory: this.systemMaxMemory,
        emergencyReserve: this.emergencyReserve,
        currentHeapUsed: memUsage.heapUsed
      }
    };
  }
}

/**
 * Memory prediction model using simple trend analysis
 */
class MemoryPredictionModel {
  predictPressure(history: Array<{ timestamp: number; pressure: number; heapUsed: number }>): number {
    if (history.length < 3) return 0;

    // Simple linear regression on recent data
    const recent = history.slice(-10);
    const n = recent.length;
    
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    recent.forEach((point, index) => {
      const x = index;
      const y = point.pressure;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict pressure in 5 minutes (20 monitoring cycles at 15s intervals)
    const futureX = n + 20;
    const predictedPressure = slope * futureX + intercept;

    return Math.max(0, Math.min(100, predictedPressure));
  }
}

export default AdvancedMemoryManager;