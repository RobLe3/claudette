/**
 * Aggressive Memory Pressure Optimizer
 * Implements emergency memory management and complex task scaling
 */

export interface MemoryOptimizationConfig {
  emergencyThreshold: number; // 90% - trigger emergency cleanup
  criticalThreshold: number;  // 80% - start aggressive cleanup  
  warningThreshold: number;   // 70% - start preventive cleanup
  maxMemoryGrowth: number;    // 200MB - max memory growth before cleanup
  complexTaskMemoryLimit: number; // 150MB - memory limit for complex tasks
}

export interface OptimizationResult {
  memoryFreed: number;
  entriesRemoved: number;
  strategy: 'emergency' | 'aggressive' | 'preventive' | 'none';
  beforePressure: number;
  afterPressure: number;
}

export class MemoryPressureOptimizer {
  private config: MemoryOptimizationConfig;
  private baselineMemory: number = 0;
  private lastCleanupTime: number = 0;
  private cleanupInProgress: boolean = false;

  constructor(config: Partial<MemoryOptimizationConfig> = {}) {
    this.config = {
      emergencyThreshold: 90,
      criticalThreshold: 80,
      warningThreshold: 70,
      maxMemoryGrowth: 200 * 1024 * 1024, // 200MB
      complexTaskMemoryLimit: 150 * 1024 * 1024, // 150MB
      ...config
    };
    
    this.baselineMemory = process.memoryUsage().heapUsed;
  }

  /**
   * Get current memory pressure percentage
   */
  getCurrentPressure(): number {
    const memUsage = process.memoryUsage();
    return (memUsage.heapUsed / memUsage.heapTotal) * 100;
  }

  /**
   * Get memory growth since baseline
   */
  getMemoryGrowth(): number {
    return process.memoryUsage().heapUsed - this.baselineMemory;
  }

  /**
   * Check if memory optimization is needed
   */
  shouldOptimize(): { needed: boolean; strategy: string; reason: string } {
    if (this.cleanupInProgress) {
      return { needed: false, strategy: 'none', reason: 'Cleanup already in progress' };
    }

    const pressure = this.getCurrentPressure();
    const growth = this.getMemoryGrowth();
    const timeSinceLastCleanup = Date.now() - this.lastCleanupTime;

    // Emergency optimization
    if (pressure >= this.config.emergencyThreshold) {
      return { 
        needed: true, 
        strategy: 'emergency', 
        reason: `Critical memory pressure: ${pressure.toFixed(1)}%` 
      };
    }

    // Aggressive optimization
    if (pressure >= this.config.criticalThreshold || growth > this.config.maxMemoryGrowth) {
      return { 
        needed: true, 
        strategy: 'aggressive', 
        reason: `High pressure: ${pressure.toFixed(1)}% or growth: ${(growth/1024/1024).toFixed(1)}MB` 
      };
    }

    // Preventive optimization
    if (pressure >= this.config.warningThreshold && timeSinceLastCleanup > 60000) { // 1 minute
      return { 
        needed: true, 
        strategy: 'preventive', 
        reason: `Preventive cleanup: ${pressure.toFixed(1)}%` 
      };
    }

    return { needed: false, strategy: 'none', reason: 'Memory pressure acceptable' };
  }

  /**
   * Optimize memory for complex task execution
   */
  async optimizeForComplexTask(): Promise<OptimizationResult> {
    const beforePressure = this.getCurrentPressure();
    const beforeMemory = process.memoryUsage().heapUsed;
    
    console.log(`[MemoryOptimizer] Pre-complex-task optimization: ${beforePressure.toFixed(1)}% pressure`);
    
    this.cleanupInProgress = true;
    let memoryFreed = 0;
    let entriesRemoved = 0;

    try {
      // Force garbage collection first
      if (global.gc) {
        global.gc();
        const afterGc = process.memoryUsage().heapUsed;
        memoryFreed += beforeMemory - afterGc;
        console.log(`[MemoryOptimizer] GC freed ${((beforeMemory - afterGc) / 1024 / 1024).toFixed(1)}MB`);
      }

      // Aggressive cache cleanup
      const availableMemory = this.getAvailableMemory();
      if (availableMemory < this.config.complexTaskMemoryLimit) {
        console.log(`[MemoryOptimizer] Insufficient memory for complex task: ${(availableMemory/1024/1024).toFixed(1)}MB available`);
        
        // Emergency cleanup to make room
        const cleanupResult = await this.performEmergencyCleanup();
        memoryFreed += cleanupResult.memoryFreed;
        entriesRemoved += cleanupResult.entriesRemoved;
      }

      const afterPressure = this.getCurrentPressure();
      
      return {
        memoryFreed,
        entriesRemoved,
        strategy: 'aggressive',
        beforePressure,
        afterPressure
      };
      
    } finally {
      this.cleanupInProgress = false;
      this.lastCleanupTime = Date.now();
    }
  }

  /**
   * Perform emergency memory cleanup
   */
  private async performEmergencyCleanup(): Promise<{ memoryFreed: number; entriesRemoved: number }> {
    const beforeMemory = process.memoryUsage().heapUsed;
    let entriesRemoved = 0;

    // Clear Node.js module cache for unused modules (aggressive)
    const moduleKeys = Object.keys(require.cache);
    const nonCriticalModules = moduleKeys.filter(key => 
      !key.includes('claudette') && 
      !key.includes('node_modules/typescript') &&
      !key.includes('dist/') &&
      key.includes('node_modules')
    );

    // Remove 50% of non-critical modules
    const toRemove = nonCriticalModules.slice(0, Math.floor(nonCriticalModules.length * 0.5));
    toRemove.forEach(key => {
      try {
        delete require.cache[key];
        entriesRemoved++;
      } catch (error) {
        // Ignore errors
      }
    });

    // Clear setImmediate and setTimeout callbacks (if any)
    if (typeof global.clearImmediate === 'function' && global.clearImmediate.length) {
      // This is a Node.js internal, handle carefully
    }

    // Force multiple GC cycles
    if (global.gc) {
      for (let i = 0; i < 3; i++) {
        global.gc();
        await new Promise(resolve => setImmediate(resolve)); // Allow event loop
      }
    }

    const afterMemory = process.memoryUsage().heapUsed;
    const memoryFreed = Math.max(0, beforeMemory - afterMemory);

    console.log(`[MemoryOptimizer] Emergency cleanup: freed ${(memoryFreed/1024/1024).toFixed(1)}MB, removed ${entriesRemoved} entries`);
    
    return { memoryFreed, entriesRemoved };
  }

  /**
   * Get available memory for operations
   */
  private getAvailableMemory(): number {
    const memUsage = process.memoryUsage();
    const usedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    // Conservative estimate: assume heap can grow to 1.5x current total
    const estimatedMaxHeap = memUsage.heapTotal * 1.5;
    return Math.max(0, estimatedMaxHeap - memUsage.heapUsed);
  }

  /**
   * Optimize memory with specific strategy
   */
  async optimizeMemory(strategy: 'emergency' | 'aggressive' | 'preventive' = 'aggressive'): Promise<OptimizationResult> {
    const beforePressure = this.getCurrentPressure();
    const beforeMemory = process.memoryUsage().heapUsed;
    
    console.log(`[MemoryOptimizer] Starting ${strategy} optimization: ${beforePressure.toFixed(1)}% pressure`);
    
    this.cleanupInProgress = true;
    let memoryFreed = 0;
    let entriesRemoved = 0;

    try {
      // Strategy-specific cleanup
      switch (strategy) {
        case 'emergency':
          const emergencyResult = await this.performEmergencyCleanup();
          memoryFreed += emergencyResult.memoryFreed;
          entriesRemoved += emergencyResult.entriesRemoved;
          
          // Additional emergency measures
          if (global.gc) {
            // Multiple GC cycles for emergency
            for (let i = 0; i < 5; i++) {
              global.gc();
              await new Promise(resolve => setTimeout(resolve, 10));
            }
          }
          break;

        case 'aggressive':
          // Force GC
          if (global.gc) {
            global.gc();
            const afterGc = process.memoryUsage().heapUsed;
            memoryFreed += Math.max(0, beforeMemory - afterGc);
          }
          break;

        case 'preventive':
          // Gentle cleanup
          if (global.gc) {
            global.gc();
          }
          break;
      }

      const afterMemory = process.memoryUsage().heapUsed;
      const totalFreed = Math.max(memoryFreed, beforeMemory - afterMemory);
      const afterPressure = this.getCurrentPressure();
      
      console.log(`[MemoryOptimizer] ${strategy} optimization complete: ${beforePressure.toFixed(1)}% -> ${afterPressure.toFixed(1)}% pressure`);
      
      return {
        memoryFreed: totalFreed,
        entriesRemoved,
        strategy,
        beforePressure,
        afterPressure
      };
      
    } finally {
      this.cleanupInProgress = false;
      this.lastCleanupTime = Date.now();
    }
  }

  /**
   * Monitor memory and trigger cleanup if needed
   */
  async monitorAndOptimize(): Promise<OptimizationResult | null> {
    const check = this.shouldOptimize();
    
    if (!check.needed) {
      return null;
    }

    console.log(`[MemoryOptimizer] Triggering optimization: ${check.reason}`);
    return await this.optimizeMemory(check.strategy as any);
  }

  /**
   * Reset baseline memory (call after major operations)
   */
  resetBaseline(): void {
    this.baselineMemory = process.memoryUsage().heapUsed;
  }

  /**
   * Get memory status report
   */
  getMemoryStatus(): {
    currentPressure: number;
    memoryGrowth: number;
    availableMemory: number;
    recommendedAction: string;
    canHandleComplexTask: boolean;
  } {
    const pressure = this.getCurrentPressure();
    const growth = this.getMemoryGrowth();
    const available = this.getAvailableMemory();
    const check = this.shouldOptimize();
    
    return {
      currentPressure: pressure,
      memoryGrowth: growth,
      availableMemory: available,
      recommendedAction: check.reason,
      canHandleComplexTask: available >= this.config.complexTaskMemoryLimit
    };
  }
}

export default MemoryPressureOptimizer;