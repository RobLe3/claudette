// Performance monitoring system for tracking initialization and operation metrics

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface InitializationMetrics {
  totalInitializationTime: number;
  platformDetectionTime: number;
  credentialManagerTime: number;
  backendHealthChecksTime: number;
  cacheSetupTime: number;
  backgroundTasksTime: number;
  componentsInitialized: string[];
  timestamp: Date;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor | null = null;
  private metrics: PerformanceMetric[] = [];
  private activeTimers: Map<string, number> = new Map();
  private initMetrics: Partial<InitializationMetrics> = {};

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start timing a performance metric
   */
  startTiming(name: string): void {
    this.activeTimers.set(name, performance.now());
  }

  /**
   * End timing and record the metric
   */
  endTiming(name: string, metadata?: Record<string, any>): number {
    const startTime = this.activeTimers.get(name);
    if (!startTime) {
      // Only show this warning in debug mode
      if (process.env.NODE_ENV === 'development' || process.env.CLAUDETTE_DEBUG === '1') {
        console.warn(`No start time found for metric: ${name}`);
      }
      return 0;
    }

    const duration = performance.now() - startTime;
    this.activeTimers.delete(name);

    this.recordMetric({
      name,
      duration,
      timestamp: new Date(),
      metadata
    });

    return duration;
  }

  /**
   * Record a performance metric directly
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only last 1000 metrics to prevent memory issues
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Start initialization timing
   */
  startInitialization(): void {
    this.initMetrics = {
      timestamp: new Date(),
      componentsInitialized: []
    };
    this.startTiming('total-initialization');
  }

  /**
   * Safe fallback timing that handles missing start times
   */
  private safeFallbackTiming(name: string): number {
    if (this.activeTimers.has(name)) {
      return this.endTiming(name);
    }
    // Return 0 if no timer was started (prevents errors)
    return 0;
  }

  /**
   * Record initialization component timing
   */
  recordInitializationStep(component: string, duration?: number): void {
    if (!this.initMetrics.componentsInitialized) {
      this.initMetrics.componentsInitialized = [];
    }
    
    this.initMetrics.componentsInitialized.push(component);

    // Record component-specific timing
    switch (component) {
      case 'platform-detection':
        this.initMetrics.platformDetectionTime = duration !== undefined ? duration : this.safeFallbackTiming('platform-detection');
        break;
      case 'credential-manager':
        this.initMetrics.credentialManagerTime = duration !== undefined ? duration : this.safeFallbackTiming('credential-manager');
        break;
      case 'backend-health-checks':
        this.initMetrics.backendHealthChecksTime = duration !== undefined ? duration : this.safeFallbackTiming('backend-health-checks');
        break;
      case 'cache-setup':
        this.initMetrics.cacheSetupTime = duration !== undefined ? duration : this.safeFallbackTiming('cache-setup');
        break;
      case 'background-tasks':
        this.initMetrics.backgroundTasksTime = duration !== undefined ? duration : this.safeFallbackTiming('background-tasks');
        break;
    }
  }

  /**
   * Complete initialization timing
   */
  endInitialization(): InitializationMetrics {
    this.initMetrics.totalInitializationTime = this.endTiming('total-initialization');
    
    const metrics = this.initMetrics as InitializationMetrics;
    
    // Log performance summary
    console.log('🚀 Claudette Initialization Complete:', {
      totalTime: `${metrics.totalInitializationTime.toFixed(2)}ms`,
      breakdown: {
        platformDetection: `${(metrics.platformDetectionTime || 0).toFixed(2)}ms`,
        credentialManager: `${(metrics.credentialManagerTime || 0).toFixed(2)}ms`,
        backendHealthChecks: `${(metrics.backendHealthChecksTime || 0).toFixed(2)}ms`,
        cacheSetup: `${(metrics.cacheSetupTime || 0).toFixed(2)}ms`,
        backgroundTasks: `${(metrics.backgroundTasksTime || 0).toFixed(2)}ms`
      },
      componentsInitialized: metrics.componentsInitialized.length
    });

    return metrics;
  }

  /**
   * Get performance metrics for analysis
   */
  getMetrics(filter?: { name?: string; since?: Date }): PerformanceMetric[] {
    let filtered = this.metrics;

    if (filter?.name) {
      filtered = filtered.filter(m => m.name.includes(filter.name!));
    }

    if (filter?.since) {
      filtered = filtered.filter(m => m.timestamp >= filter.since!);
    }

    return filtered;
  }

  /**
   * Get initialization metrics
   */
  getInitializationMetrics(): Partial<InitializationMetrics> {
    return { ...this.initMetrics };
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    totalMetrics: number;
    averageInitTime: number;
    lastInitTime: number;
    healthCheckPerformance: {
      average: number;
      min: number;
      max: number;
    };
  } {
    const healthCheckMetrics = this.metrics.filter(m => 
      m.name.includes('health-check') || m.name.includes('availability')
    );

    const healthDurations = healthCheckMetrics.map(m => m.duration);
    
    return {
      totalMetrics: this.metrics.length,
      averageInitTime: this.initMetrics.totalInitializationTime || 0,
      lastInitTime: this.initMetrics.totalInitializationTime || 0,
      healthCheckPerformance: {
        average: healthDurations.length > 0 
          ? healthDurations.reduce((a, b) => a + b) / healthDurations.length 
          : 0,
        min: healthDurations.length > 0 ? Math.min(...healthDurations) : 0,
        max: healthDurations.length > 0 ? Math.max(...healthDurations) : 0
      }
    };
  }

  /**
   * Record a metric with specific type
   */
  recordNamedMetric(name: string, type: 'gauge' | 'counter', value: number, metadata?: Record<string, any>): void {
    this.metrics.push({
      name: `${name}_${type}`,
      duration: value,
      timestamp: new Date(),
      metadata: { ...metadata, type }
    });
  }

  /**
   * Get snapshot of current metrics
   */
  getSnapshot(): Record<string, any> {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(m => 
      now - m.timestamp.getTime() < 300000 // Last 5 minutes
    );

    const metricsByType = recentMetrics.reduce((acc, metric) => {
      const type = metric.metadata?.type || 'unknown';
      if (!acc[type]) acc[type] = [];
      acc[type].push(metric);
      return acc;
    }, {} as Record<string, PerformanceMetric[]>);

    return {
      totalMetrics: this.metrics.length,
      recentMetrics: recentMetrics.length,
      activeTimers: this.activeTimers.size,
      metricsByType,
      breakdown: {
        gauges: metricsByType.gauge?.length || 0,
        counters: metricsByType.counter?.length || 0,
        timings: metricsByType.unknown?.length || 0
      },
      lastUpdate: now
    };
  }

  /**
   * Clear metrics (useful for testing)
   */
  clear(): void {
    this.metrics = [];
    this.activeTimers.clear();
    this.initMetrics = {};
  }

  /**
   * Create a timer function for easy use
   */
  createTimer(name: string) {
    this.startTiming(name);
    return () => this.endTiming(name);
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();