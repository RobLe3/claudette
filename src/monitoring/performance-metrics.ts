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
        this.initMetrics.platformDetectionTime = duration || this.endTiming('platform-detection');
        break;
      case 'credential-manager':
        this.initMetrics.credentialManagerTime = duration || this.endTiming('credential-manager');
        break;
      case 'backend-health-checks':
        this.initMetrics.backendHealthChecksTime = duration || this.endTiming('backend-health-checks');
        break;
      case 'cache-setup':
        this.initMetrics.cacheSetupTime = duration || this.endTiming('cache-setup');
        break;
      case 'background-tasks':
        this.initMetrics.backgroundTasksTime = duration || this.endTiming('background-tasks');
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