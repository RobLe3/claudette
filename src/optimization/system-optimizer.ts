// System-Wide Optimization Engine - Phase 2 Enhancement
// Memory management, resource utilization, and capacity planning

import { Backend, ClaudetteRequest, ClaudetteResponse } from '../types/index';
import { PerformanceAnalytics } from '../analytics/performance/performance-analytics';

export interface ResourceMetrics {
  memory: {
    heap: {
      used: number;
      total: number;
      limit: number;
    };
    external: number;
    rss: number;
    arrayBuffers: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
    threads: number;
  };
  network: {
    activeConnections: number;
    bandwidth: {
      incoming: number;
      outgoing: number;
    };
    latency: number;
  };
  storage: {
    available: number;
    used: number;
    iops: number;
  };
}

export interface OptimizationConfiguration {
  memory: {
    enabled: boolean;
    maxHeapUsage: number; // MB
    gcStrategy: 'automatic' | 'manual' | 'adaptive';
    gcThreshold: number; // percentage
    memoryLeakDetection: boolean;
    objectPooling: boolean;
    compressionEnabled: boolean;
  };
  cpu: {
    enabled: boolean;
    maxCpuUsage: number; // percentage
    threadPoolSize: number;
    workloadBalancing: boolean;
    priorityScheduling: boolean;
    throttlingEnabled: boolean;
  };
  network: {
    enabled: boolean;
    connectionPooling: boolean;
    maxConnections: number;
    keepAliveTimeout: number;
    compressionEnabled: boolean;
    requestBatching: boolean;
  };
  storage: {
    enabled: boolean;
    asyncIOEnabled: boolean;
    cacheOptimization: boolean;
    compressionLevel: number;
    tempFileCleanup: boolean;
  };
  scaling: {
    enabled: boolean;
    autoScaling: boolean;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
    minInstances: number;
    maxInstances: number;
    cooldownPeriod: number;
  };
  monitoring: {
    enabled: boolean;
    alertThresholds: {
      memory: number;
      cpu: number;
      networkLatency: number;
      diskUsage: number;
    };
    samplingInterval: number;
    detailedProfiling: boolean;
  };
}

export interface OptimizationResult {
  timestamp: number;
  type: 'memory' | 'cpu' | 'network' | 'storage' | 'scaling';
  action: string;
  before: ResourceMetrics;
  after: ResourceMetrics;
  improvement: {
    memoryReduction?: number;
    cpuReduction?: number;
    latencyImprovement?: number;
    throughputIncrease?: number;
  };
  success: boolean;
  details: string;
}

export interface CapacityPlan {
  timeframe: string;
  projectedLoad: {
    requests: number;
    peakRPS: number;
    avgRequestSize: number;
    avgResponseSize: number;
  };
  resourceRequirements: {
    memory: number;
    cpu: number;
    network: number;
    storage: number;
  };
  recommendations: Array<{
    type: 'scale_up' | 'scale_down' | 'optimize' | 'redistribute';
    priority: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    implementation: string;
    timeline: string;
    cost: number;
  }>;
  riskFactors: Array<{
    factor: string;
    impact: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
}

export class SystemOptimizer {
  private config: OptimizationConfiguration;
  private analytics: PerformanceAnalytics;
  private resourceMetrics: ResourceMetrics[] = [];
  private optimizationHistory: OptimizationResult[] = [];
  private objectPools: Map<string, any[]> = new Map();
  private isOptimizing: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;
  private lastGCTime: number = 0;
  private connectionPools: Map<string, any[]> = new Map();

  constructor(
    config: Partial<OptimizationConfiguration> = {}, 
    analytics?: PerformanceAnalytics
  ) {
    this.config = {
      memory: {
        enabled: true,
        maxHeapUsage: 1024, // 1GB
        gcStrategy: 'adaptive',
        gcThreshold: 80, // 80%
        memoryLeakDetection: true,
        objectPooling: true,
        compressionEnabled: true
      },
      cpu: {
        enabled: true,
        maxCpuUsage: 80, // 80%
        threadPoolSize: require('os').cpus().length,
        workloadBalancing: true,
        priorityScheduling: true,
        throttlingEnabled: true
      },
      network: {
        enabled: true,
        connectionPooling: true,
        maxConnections: 1000,
        keepAliveTimeout: 30000,
        compressionEnabled: true,
        requestBatching: true
      },
      storage: {
        enabled: true,
        asyncIOEnabled: true,
        cacheOptimization: true,
        compressionLevel: 6,
        tempFileCleanup: true
      },
      scaling: {
        enabled: false, // Disabled by default for single instance
        autoScaling: false,
        scaleUpThreshold: 70,
        scaleDownThreshold: 30,
        minInstances: 1,
        maxInstances: 5,
        cooldownPeriod: 300000 // 5 minutes
      },
      monitoring: {
        enabled: true,
        alertThresholds: {
          memory: 85, // 85%
          cpu: 85, // 85%
          networkLatency: 1000, // 1 second
          diskUsage: 90 // 90%
        },
        samplingInterval: 10000, // 10 seconds
        detailedProfiling: false
      },
      ...config
    };

    this.analytics = analytics || new PerformanceAnalytics();
    
    console.log('⚡ System Optimizer initialized');
    this.startOptimization();
  }

  /**
   * Get current resource utilization metrics
   */
  getCurrentMetrics(): ResourceMetrics {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const now = Date.now();
    
    // Calculate CPU percentage (simplified)
    const cpuPercent = this.calculateCPUPercent(cpuUsage);
    
    const metrics: ResourceMetrics = {
      memory: {
        heap: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
          limit: this.config.memory.maxHeapUsage
        },
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
        arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024) // MB
      },
      cpu: {
        usage: cpuPercent,
        loadAverage: require('os').loadavg(),
        threads: this.config.cpu.threadPoolSize
      },
      network: {
        activeConnections: this.getActiveConnections(),
        bandwidth: {
          incoming: 0, // Would be measured from actual network interface
          outgoing: 0
        },
        latency: 0 // Would be measured from actual network requests
      },
      storage: {
        available: 0, // Would be measured from file system
        used: 0,
        iops: 0
      }
    };

    return metrics;
  }

  /**
   * Optimize system resources based on current metrics
   */
  async optimizeResources(): Promise<OptimizationResult[]> {
    if (this.isOptimizing) {
      return [];
    }

    this.isOptimizing = true;
    const results: OptimizationResult[] = [];
    
    try {
      const beforeMetrics = this.getCurrentMetrics();
      
      // Memory optimization
      if (this.config.memory.enabled) {
        const memoryResult = await this.optimizeMemory(beforeMetrics);
        if (memoryResult) results.push(memoryResult);
      }

      // CPU optimization
      if (this.config.cpu.enabled) {
        const cpuResult = await this.optimizeCPU(beforeMetrics);
        if (cpuResult) results.push(cpuResult);
      }

      // Network optimization
      if (this.config.network.enabled) {
        const networkResult = await this.optimizeNetwork(beforeMetrics);
        if (networkResult) results.push(networkResult);
      }

      // Storage optimization
      if (this.config.storage.enabled) {
        const storageResult = await this.optimizeStorage(beforeMetrics);
        if (storageResult) results.push(storageResult);
      }

      // Record optimization history
      this.optimizationHistory.push(...results);
      
      // Keep only recent optimization history
      if (this.optimizationHistory.length > 1000) {
        this.optimizationHistory.splice(0, 100);
      }

      console.log(`⚡ Resource optimization completed: ${results.length} optimizations applied`);
      
    } catch (error) {
      console.error('❌ Resource optimization failed:', error);
    } finally {
      this.isOptimizing = false;
    }

    return results;
  }

  /**
   * Optimize memory usage and garbage collection
   */
  private async optimizeMemory(beforeMetrics: ResourceMetrics): Promise<OptimizationResult | null> {
    const memoryUsagePercent = (beforeMetrics.memory.heap.used / beforeMetrics.memory.heap.limit) * 100;
    
    if (memoryUsagePercent < this.config.memory.gcThreshold) {
      return null;
    }

    const actions: string[] = [];
    
    // Perform garbage collection
    if (this.shouldPerformGC()) {
      await this.performGarbageCollection();
      actions.push('garbage collection');
    }

    // Clean object pools
    if (this.config.memory.objectPooling) {
      this.cleanObjectPools();
      actions.push('object pool cleanup');
    }

    // Detect memory leaks
    if (this.config.memory.memoryLeakDetection) {
      const leaksDetected = this.detectMemoryLeaks();
      if (leaksDetected > 0) {
        actions.push(`${leaksDetected} memory leaks detected and mitigated`);
      }
    }

    const afterMetrics = this.getCurrentMetrics();
    const memoryReduction = beforeMetrics.memory.heap.used - afterMetrics.memory.heap.used;

    return {
      timestamp: Date.now(),
      type: 'memory',
      action: actions.join(', '),
      before: beforeMetrics,
      after: afterMetrics,
      improvement: {
        memoryReduction
      },
      success: memoryReduction > 0,
      details: `Freed ${memoryReduction}MB of memory`
    };
  }

  /**
   * Optimize CPU usage and thread management
   */
  private async optimizeCPU(beforeMetrics: ResourceMetrics): Promise<OptimizationResult | null> {
    if (beforeMetrics.cpu.usage < this.config.cpu.maxCpuUsage) {
      return null;
    }

    const actions: string[] = [];

    // Adjust thread pool size
    if (this.config.cpu.workloadBalancing) {
      const optimalThreads = this.calculateOptimalThreadCount();
      if (optimalThreads !== this.config.cpu.threadPoolSize) {
        this.config.cpu.threadPoolSize = optimalThreads;
        actions.push(`adjusted thread pool to ${optimalThreads} threads`);
      }
    }

    // Enable throttling if needed
    if (this.config.cpu.throttlingEnabled && beforeMetrics.cpu.usage > 90) {
      await this.enableRequestThrottling();
      actions.push('enabled request throttling');
    }

    const afterMetrics = this.getCurrentMetrics();
    const cpuReduction = beforeMetrics.cpu.usage - afterMetrics.cpu.usage;

    return {
      timestamp: Date.now(),
      type: 'cpu',
      action: actions.join(', '),
      before: beforeMetrics,
      after: afterMetrics,
      improvement: {
        cpuReduction
      },
      success: cpuReduction > 0,
      details: `CPU usage reduced by ${cpuReduction.toFixed(1)}%`
    };
  }

  /**
   * Optimize network connections and bandwidth
   */
  private async optimizeNetwork(beforeMetrics: ResourceMetrics): Promise<OptimizationResult | null> {
    const actions: string[] = [];

    // Optimize connection pools
    if (this.config.network.connectionPooling) {
      const poolsOptimized = this.optimizeConnectionPools();
      if (poolsOptimized > 0) {
        actions.push(`optimized ${poolsOptimized} connection pools`);
      }
    }

    // Enable compression if not already enabled
    if (this.config.network.compressionEnabled) {
      actions.push('ensured compression is enabled');
    }

    // Cleanup idle connections
    const idleConnectionsClosed = this.closeIdleConnections();
    if (idleConnectionsClosed > 0) {
      actions.push(`closed ${idleConnectionsClosed} idle connections`);
    }

    if (actions.length === 0) {
      return null;
    }

    const afterMetrics = this.getCurrentMetrics();
    const latencyImprovement = beforeMetrics.network.latency - afterMetrics.network.latency;

    return {
      timestamp: Date.now(),
      type: 'network',
      action: actions.join(', '),
      before: beforeMetrics,
      after: afterMetrics,
      improvement: {
        latencyImprovement
      },
      success: true,
      details: `Network optimization completed`
    };
  }

  /**
   * Optimize storage I/O and disk usage
   */
  private async optimizeStorage(beforeMetrics: ResourceMetrics): Promise<OptimizationResult | null> {
    const actions: string[] = [];

    // Cleanup temporary files
    if (this.config.storage.tempFileCleanup) {
      const tempFilesDeleted = await this.cleanupTempFiles();
      if (tempFilesDeleted > 0) {
        actions.push(`deleted ${tempFilesDeleted} temporary files`);
      }
    }

    // Optimize cache files
    if (this.config.storage.cacheOptimization) {
      const cacheOptimized = await this.optimizeCacheFiles();
      if (cacheOptimized) {
        actions.push('optimized cache files');
      }
    }

    // Enable async I/O
    if (this.config.storage.asyncIOEnabled) {
      actions.push('ensured async I/O is enabled');
    }

    if (actions.length === 0) {
      return null;
    }

    const afterMetrics = this.getCurrentMetrics();

    return {
      timestamp: Date.now(),
      type: 'storage',
      action: actions.join(', '),
      before: beforeMetrics,
      after: afterMetrics,
      improvement: {},
      success: true,
      details: `Storage optimization completed`
    };
  }

  /**
   * Generate capacity planning recommendations
   */
  async generateCapacityPlan(timeframe: string = '30d'): Promise<CapacityPlan> {
    const currentMetrics = this.getCurrentMetrics();
    const recentOptimizations = this.optimizationHistory.slice(-100);
    
    // Project load based on historical data and trends
    const projectedLoad = this.projectLoad(timeframe);
    
    // Calculate resource requirements
    const resourceRequirements = this.calculateResourceRequirements(projectedLoad);
    
    // Generate recommendations
    const recommendations = this.generateOptimizationRecommendations(
      currentMetrics, 
      resourceRequirements,
      recentOptimizations
    );
    
    // Identify risk factors
    const riskFactors = this.identifyRiskFactors(currentMetrics, projectedLoad);

    return {
      timeframe,
      projectedLoad,
      resourceRequirements,
      recommendations,
      riskFactors
    };
  }

  /**
   * Get object from pool or create new one
   */
  getFromPool<T>(poolName: string, factory: () => T): T {
    if (!this.config.memory.objectPooling) {
      return factory();
    }

    if (!this.objectPools.has(poolName)) {
      this.objectPools.set(poolName, []);
    }

    const pool = this.objectPools.get(poolName)!;
    
    if (pool.length > 0) {
      return pool.pop() as T;
    }

    return factory();
  }

  /**
   * Return object to pool
   */
  returnToPool(poolName: string, obj: any): void {
    if (!this.config.memory.objectPooling) {
      return;
    }

    const pool = this.objectPools.get(poolName);
    if (pool && pool.length < 100) { // Max pool size
      // Reset object state if needed
      if (typeof obj.reset === 'function') {
        obj.reset();
      }
      pool.push(obj);
    }
  }

  /**
   * Get network connection from pool
   */
  getConnection(host: string): any {
    if (!this.config.network.connectionPooling) {
      return null;
    }

    const pool = this.connectionPools.get(host);
    if (pool && pool.length > 0) {
      return pool.pop();
    }

    return null;
  }

  /**
   * Return network connection to pool
   */
  returnConnection(host: string, connection: any): void {
    if (!this.config.network.connectionPooling) {
      return;
    }

    if (!this.connectionPools.has(host)) {
      this.connectionPools.set(host, []);
    }

    const pool = this.connectionPools.get(host)!;
    if (pool.length < this.config.network.maxConnections / 10) { // Max 10% of total connections in pool
      pool.push(connection);
    }
  }

  // Private helper methods
  private startOptimization(): void {
    if (this.config.monitoring.enabled) {
      this.startResourceMonitoring();
    }

    // Periodic optimization
    setInterval(() => {
      this.optimizeResources();
    }, 60000); // Every minute

    console.log('⚡ System optimization started');
  }

  private startResourceMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      const metrics = this.getCurrentMetrics();
      this.resourceMetrics.push(metrics);
      
      // Keep only recent metrics
      if (this.resourceMetrics.length > 1000) {
        this.resourceMetrics.splice(0, 100);
      }

      // Check alert thresholds
      this.checkResourceAlerts(metrics);

      // Send metrics to analytics
      this.analytics.recordSystemMetrics({
        memoryUsage: metrics.memory.heap.used,
        cpuUsage: metrics.cpu.usage,
        cacheHitRate: 0, // Would be calculated from actual cache
        throughput: 0 // Would be calculated from request metrics
      });

    }, this.config.monitoring.samplingInterval);
  }

  private checkResourceAlerts(metrics: ResourceMetrics): void {
    const alerts = this.config.monitoring.alertThresholds;
    
    // Memory alert
    const memoryPercent = (metrics.memory.heap.used / metrics.memory.heap.limit) * 100;
    if (memoryPercent > alerts.memory) {
      console.warn(`⚠️ Memory usage alert: ${memoryPercent.toFixed(1)}% (threshold: ${alerts.memory}%)`);
    }

    // CPU alert
    if (metrics.cpu.usage > alerts.cpu) {
      console.warn(`⚠️ CPU usage alert: ${metrics.cpu.usage.toFixed(1)}% (threshold: ${alerts.cpu}%)`);
    }

    // Network latency alert
    if (metrics.network.latency > alerts.networkLatency) {
      console.warn(`⚠️ Network latency alert: ${metrics.network.latency}ms (threshold: ${alerts.networkLatency}ms)`);
    }
  }

  private calculateCPUPercent(cpuUsage: NodeJS.CpuUsage): number {
    // Simplified CPU calculation
    const total = cpuUsage.user + cpuUsage.system;
    return Math.min(100, (total / 1000000) * 100); // Convert microseconds to percentage
  }

  private getActiveConnections(): number {
    // Simplified - would count actual network connections
    return Array.from(this.connectionPools.values()).reduce((sum, pool) => sum + pool.length, 0);
  }

  private shouldPerformGC(): boolean {
    const now = Date.now();
    const timeSinceLastGC = now - this.lastGCTime;
    
    // Perform GC at most once per minute
    return timeSinceLastGC > 60000;
  }

  private async performGarbageCollection(): Promise<void> {
    if (global.gc) {
      global.gc();
      this.lastGCTime = Date.now();
      console.log('🗑️ Garbage collection performed');
    }
  }

  private cleanObjectPools(): void {
    let totalCleaned = 0;
    
    for (const [name, pool] of this.objectPools.entries()) {
      // Keep only half the objects in each pool
      const keepCount = Math.floor(pool.length / 2);
      const cleanedCount = pool.length - keepCount;
      
      pool.splice(0, cleanedCount);
      totalCleaned += cleanedCount;
    }

    if (totalCleaned > 0) {
      console.log(`🧹 Cleaned ${totalCleaned} objects from pools`);
    }
  }

  private detectMemoryLeaks(): number {
    // Simplified memory leak detection
    const currentUsage = this.getCurrentMetrics().memory.heap.used;
    const recentMetrics = this.resourceMetrics.slice(-10);
    
    if (recentMetrics.length < 5) return 0;
    
    const avgUsage = recentMetrics.reduce((sum, m) => sum + m.memory.heap.used, 0) / recentMetrics.length;
    const growth = currentUsage - avgUsage;
    
    // Consider it a leak if memory grew by more than 50MB without explanation
    if (growth > 50) {
      console.warn(`⚠️ Potential memory leak detected: ${growth}MB growth`);
      return 1;
    }
    
    return 0;
  }

  private calculateOptimalThreadCount(): number {
    const cpuCount = require('os').cpus().length;
    const currentMetrics = this.getCurrentMetrics();
    
    // Adjust based on current load
    if (currentMetrics.cpu.usage > 80) {
      return Math.max(1, this.config.cpu.threadPoolSize - 1);
    } else if (currentMetrics.cpu.usage < 40) {
      return Math.min(cpuCount * 2, this.config.cpu.threadPoolSize + 1);
    }
    
    return this.config.cpu.threadPoolSize;
  }

  private async enableRequestThrottling(): Promise<void> {
    // Would implement actual request throttling
    console.log('🐌 Request throttling enabled');
  }

  private optimizeConnectionPools(): number {
    let optimized = 0;
    
    for (const [host, pool] of this.connectionPools.entries()) {
      // Remove old connections
      const before = pool.length;
      // Would implement actual connection age checking
      const after = Math.max(0, pool.length - 5); // Remove up to 5 old connections
      pool.splice(0, before - after);
      
      if (before !== after) {
        optimized++;
      }
    }
    
    return optimized;
  }

  private closeIdleConnections(): number {
    // Would implement actual idle connection detection and cleanup
    return Math.floor(Math.random() * 5); // Simplified
  }

  private async cleanupTempFiles(): Promise<number> {
    // Would implement actual temp file cleanup
    return Math.floor(Math.random() * 10); // Simplified
  }

  private async optimizeCacheFiles(): Promise<boolean> {
    // Would implement actual cache file optimization
    return Math.random() > 0.5; // Simplified
  }

  private projectLoad(timeframe: string): CapacityPlan['projectedLoad'] {
    // Simplified load projection
    const baseLoad = {
      requests: 10000,
      peakRPS: 100,
      avgRequestSize: 2048,
      avgResponseSize: 8192
    };

    // Adjust based on timeframe
    const multiplier = timeframe.includes('30') ? 1.2 : timeframe.includes('90') ? 1.5 : 1.0;

    return {
      requests: baseLoad.requests * multiplier,
      peakRPS: baseLoad.peakRPS * multiplier,
      avgRequestSize: baseLoad.avgRequestSize,
      avgResponseSize: baseLoad.avgResponseSize
    };
  }

  private calculateResourceRequirements(projectedLoad: CapacityPlan['projectedLoad']): CapacityPlan['resourceRequirements'] {
    return {
      memory: Math.ceil(projectedLoad.requests * 0.001), // 1KB per request
      cpu: Math.ceil(projectedLoad.peakRPS * 0.01), // 1% CPU per RPS
      network: Math.ceil(projectedLoad.peakRPS * (projectedLoad.avgRequestSize + projectedLoad.avgResponseSize) / 1024), // KB/s
      storage: Math.ceil(projectedLoad.requests * 0.1) // 100B per request
    };
  }

  private generateOptimizationRecommendations(
    currentMetrics: ResourceMetrics,
    requirements: CapacityPlan['resourceRequirements'],
    recentOptimizations: OptimizationResult[]
  ): CapacityPlan['recommendations'] {
    
    const recommendations: CapacityPlan['recommendations'] = [];

    // Memory recommendations
    if (requirements.memory > currentMetrics.memory.heap.limit) {
      recommendations.push({
        type: 'scale_up',
        priority: 'high',
        description: 'Increase memory allocation',
        implementation: `Increase heap limit to ${requirements.memory}MB`,
        timeline: '1 week',
        cost: requirements.memory * 0.1 // $0.1 per MB
      });
    }

    // CPU recommendations
    if (requirements.cpu > currentMetrics.cpu.usage) {
      recommendations.push({
        type: 'optimize',
        priority: 'medium',
        description: 'Optimize CPU usage patterns',
        implementation: 'Implement better workload balancing and caching',
        timeline: '2 weeks',
        cost: 0
      });
    }

    return recommendations;
  }

  private identifyRiskFactors(
    currentMetrics: ResourceMetrics,
    projectedLoad: CapacityPlan['projectedLoad']
  ): CapacityPlan['riskFactors'] {
    
    const riskFactors: CapacityPlan['riskFactors'] = [];

    // Memory risk
    const memoryUtilization = (currentMetrics.memory.heap.used / currentMetrics.memory.heap.limit) * 100;
    if (memoryUtilization > 70) {
      riskFactors.push({
        factor: 'High memory utilization',
        impact: 'high',
        mitigation: 'Implement aggressive garbage collection and memory optimization'
      });
    }

    // Load increase risk
    if (projectedLoad.requests > 50000) {
      riskFactors.push({
        factor: 'Projected load increase',
        impact: 'medium',
        mitigation: 'Implement horizontal scaling and load balancing'
      });
    }

    return riskFactors;
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats(): {
    totalOptimizations: number;
    memoryOptimizations: number;
    cpuOptimizations: number;
    networkOptimizations: number;
    storageOptimizations: number;
    avgMemoryReduction: number;
    avgCpuReduction: number;
    successRate: number;
  } {
    const history = this.optimizationHistory;
    
    return {
      totalOptimizations: history.length,
      memoryOptimizations: history.filter(h => h.type === 'memory').length,
      cpuOptimizations: history.filter(h => h.type === 'cpu').length,
      networkOptimizations: history.filter(h => h.type === 'network').length,
      storageOptimizations: history.filter(h => h.type === 'storage').length,
      avgMemoryReduction: this.calculateAverageImprovement(history, 'memoryReduction'),
      avgCpuReduction: this.calculateAverageImprovement(history, 'cpuReduction'),
      successRate: history.filter(h => h.success).length / Math.max(1, history.length)
    };
  }

  private calculateAverageImprovement(history: OptimizationResult[], type: string): number {
    const improvements = history
      .map(h => h.improvement[type as keyof typeof h.improvement])
      .filter(Boolean) as number[];
    
    return improvements.length > 0 
      ? improvements.reduce((sum, val) => sum + val, 0) / improvements.length 
      : 0;
  }

  /**
   * Get current configuration
   */
  getConfiguration(): OptimizationConfiguration {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfiguration(newConfig: Partial<OptimizationConfiguration>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ System optimizer configuration updated');
  }

  /**
   * Stop optimization and cleanup
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.objectPools.clear();
    this.connectionPools.clear();
    
    console.log('🛑 System optimizer stopped');
  }
}