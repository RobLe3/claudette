/**
 * Unified Performance Monitoring System
 * Harmonizes timing, metrics, and performance monitoring across all Claudette components
 */

import { EventEmitter } from 'events';
import { performanceMonitor } from './performance-metrics';

// Standardized timing categories
export enum TimingCategory {
  INITIALIZATION = 'initialization',
  BACKEND_OPERATION = 'backend_operation',
  CACHE_OPERATION = 'cache_operation',
  DATABASE_OPERATION = 'database_operation',
  NETWORK_REQUEST = 'network_request',
  AUTHENTICATION = 'authentication',
  ROUTING = 'routing',
  HEALTH_CHECK = 'health_check',
  MCP_OPERATION = 'mcp_operation',
  RAG_OPERATION = 'rag_operation',
  SYSTEM_OPERATION = 'system_operation'
}

// Standardized timing thresholds (in milliseconds)
export const PERFORMANCE_THRESHOLDS = {
  [TimingCategory.INITIALIZATION]: {
    excellent: 1000,
    good: 3000,
    acceptable: 10000,
    slow: 30000
  },
  [TimingCategory.BACKEND_OPERATION]: {
    excellent: 500,
    good: 2000,
    acceptable: 5000,
    slow: 15000
  },
  [TimingCategory.CACHE_OPERATION]: {
    excellent: 10,
    good: 50,
    acceptable: 200,
    slow: 1000
  },
  [TimingCategory.DATABASE_OPERATION]: {
    excellent: 50,
    good: 200,
    acceptable: 1000,
    slow: 5000
  },
  [TimingCategory.NETWORK_REQUEST]: {
    excellent: 200,
    good: 1000,
    acceptable: 3000,
    slow: 10000
  },
  [TimingCategory.AUTHENTICATION]: {
    excellent: 100,
    good: 500,
    acceptable: 2000,
    slow: 5000
  },
  [TimingCategory.ROUTING]: {
    excellent: 10,
    good: 50,
    acceptable: 200,
    slow: 1000
  },
  [TimingCategory.HEALTH_CHECK]: {
    excellent: 500,
    good: 2000,
    acceptable: 5500,
    slow: 11000
  },
  [TimingCategory.MCP_OPERATION]: {
    excellent: 1000,
    good: 5000,
    acceptable: 15000,
    slow: 45000
  },
  [TimingCategory.RAG_OPERATION]: {
    excellent: 2000,
    good: 8000,
    acceptable: 20000,
    slow: 60000
  },
  [TimingCategory.SYSTEM_OPERATION]: {
    excellent: 100,
    good: 500,
    acceptable: 2000,
    slow: 10000
  }
} as const;

export type PerformanceLevel = 'excellent' | 'good' | 'acceptable' | 'slow' | 'timeout';

export interface UnifiedTimer {
  id: string;
  name: string;
  category: TimingCategory;
  startTime: number;
  endTime?: number;
  duration?: number;
  level?: PerformanceLevel;
  metadata: Record<string, any>;
  context: {
    component: string;
    operation: string;
    correlationId?: string;
    parentTimerId?: string;
  };
}

export interface PerformanceSnapshot {
  timestamp: number;
  component: string;
  metrics: {
    activeTimers: number;
    completedTimers: number;
    averageTime: number;
    slowOperations: number;
    errorRate: number;
  };
  breakdown: Record<TimingCategory, {
    count: number;
    totalTime: number;
    averageTime: number;
    distribution: Record<PerformanceLevel, number>;
  }>;
}

export interface ComponentPerformanceProfile {
  component: string;
  expectedOperations: Array<{
    name: string;
    category: TimingCategory;
    expectedDuration: number;
    tolerance: number;
  }>;
  healthThresholds: {
    maxConcurrentOps: number;
    maxAverageTime: number;
    maxErrorRate: number;
  };
}

export class UnifiedPerformanceSystem extends EventEmitter {
  private static instance: UnifiedPerformanceSystem | null = null;
  private activeTimers = new Map<string, UnifiedTimer>();
  private completedTimers: UnifiedTimer[] = [];
  private componentProfiles = new Map<string, ComponentPerformanceProfile>();
  private performanceHistory: PerformanceSnapshot[] = [];
  private correlationMap = new Map<string, string[]>(); // Parent -> Children timers
  private nextTimerId = 1;

  static getInstance(): UnifiedPerformanceSystem {
    if (!UnifiedPerformanceSystem.instance) {
      UnifiedPerformanceSystem.instance = new UnifiedPerformanceSystem();
    }
    return UnifiedPerformanceSystem.instance;
  }

  private constructor() {
    super();
    this.startPerformanceCollection();
  }

  /**
   * Register a component performance profile
   */
  registerComponent(profile: ComponentPerformanceProfile): void {
    this.componentProfiles.set(profile.component, profile);
    this.emit('component_registered', profile);
  }

  /**
   * Create a high-performance timer with automatic categorization
   */
  createTimer(
    name: string,
    category: TimingCategory,
    component: string,
    operation: string,
    metadata: Record<string, any> = {},
    parentTimerId?: string
  ): string {
    const id = `timer_${this.nextTimerId++}_${Date.now()}`;
    const correlationId = this.generateCorrelationId();

    const timer: UnifiedTimer = {
      id,
      name,
      category,
      startTime: performance.now(),
      metadata,
      context: {
        component,
        operation,
        correlationId,
        parentTimerId
      }
    };

    this.activeTimers.set(id, timer);

    // Track parent-child relationships
    if (parentTimerId) {
      const children = this.correlationMap.get(parentTimerId) || [];
      children.push(id);
      this.correlationMap.set(parentTimerId, children);
    }

    // Also use the legacy performance monitor for backward compatibility
    performanceMonitor.startTiming(`${component}:${operation}`);

    this.emit('timer_started', timer);
    return id;
  }

  /**
   * Complete a timer with automatic performance level calculation
   */
  completeTimer(
    timerId: string,
    metadata: Record<string, any> = {},
    error?: Error
  ): UnifiedTimer | null {
    const timer = this.activeTimers.get(timerId);
    if (!timer) {
      console.warn(`[UnifiedPerformance] Timer ${timerId} not found`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - timer.startTime;
    const level = this.calculatePerformanceLevel(timer.category, duration);

    // Complete the timer
    timer.endTime = endTime;
    timer.duration = duration;
    timer.level = level;
    timer.metadata = { ...timer.metadata, ...metadata };

    if (error) {
      timer.metadata.error = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
    }

    // Move to completed timers
    this.activeTimers.delete(timerId);
    this.completedTimers.push(timer);

    // Cleanup correlation mapping
    this.correlationMap.delete(timerId);

    // Maintain completed timers limit
    if (this.completedTimers.length > 10000) {
      this.completedTimers = this.completedTimers.slice(-5000);
    }

    // Complete legacy timer
    performanceMonitor.endTiming(`${timer.context.component}:${timer.context.operation}`, {
      category: timer.category,
      level: timer.level,
      ...timer.metadata
    });

    this.emit('timer_completed', timer);

    // Check if this indicates a performance issue
    if (level === 'slow' || level === 'timeout') {
      this.emit('performance_warning', {
        timer,
        threshold: PERFORMANCE_THRESHOLDS[timer.category],
        recommendation: this.getPerformanceRecommendation(timer)
      });
    }

    return timer;
  }

  /**
   * Create a convenient timer wrapper function
   */
  createTimerFunction<T>(
    name: string,
    category: TimingCategory,
    component: string,
    operation: string,
    fn: () => Promise<T>,
    metadata: Record<string, any> = {}
  ): () => Promise<T> {
    return async () => {
      const timerId = this.createTimer(name, category, component, operation, metadata);
      try {
        const result = await fn();
        this.completeTimer(timerId, { success: true });
        return result;
      } catch (error) {
        this.completeTimer(timerId, { success: false }, error as Error);
        throw error;
      }
    };
  }

  /**
   * Create a synchronous timer wrapper
   */
  createSyncTimerFunction<T>(
    name: string,
    category: TimingCategory,
    component: string,
    operation: string,
    fn: () => T,
    metadata: Record<string, any> = {}
  ): () => T {
    return () => {
      const timerId = this.createTimer(name, category, component, operation, metadata);
      try {
        const result = fn();
        this.completeTimer(timerId, { success: true });
        return result;
      } catch (error) {
        this.completeTimer(timerId, { success: false }, error as Error);
        throw error;
      }
    };
  }

  /**
   * Calculate performance level based on duration and category
   */
  private calculatePerformanceLevel(category: TimingCategory, duration: number): PerformanceLevel {
    const thresholds = PERFORMANCE_THRESHOLDS[category];
    
    if (duration <= thresholds.excellent) return 'excellent';
    if (duration <= thresholds.good) return 'good';
    if (duration <= thresholds.acceptable) return 'acceptable';
    if (duration <= thresholds.slow) return 'slow';
    return 'timeout';
  }

  /**
   * Get performance recommendations for slow operations
   */
  private getPerformanceRecommendation(timer: UnifiedTimer): string {
    const { category, duration, context } = timer;
    const thresholds = PERFORMANCE_THRESHOLDS[category];

    switch (category) {
      case TimingCategory.INITIALIZATION:
        if ((duration ?? 0) > thresholds.slow) {
          return 'Consider implementing lazy loading for non-critical components';
        }
        return 'Optimize component initialization order';

      case TimingCategory.BACKEND_OPERATION:
        if ((duration ?? 0) > thresholds.slow) {
          return 'Check network connectivity and consider circuit breaker patterns';
        }
        return 'Consider caching or request optimization';

      case TimingCategory.CACHE_OPERATION:
        return 'Review cache implementation and consider memory cache';

      case TimingCategory.DATABASE_OPERATION:
        return 'Optimize database queries and consider connection pooling';

      case TimingCategory.NETWORK_REQUEST:
        return 'Check network latency and implement retry logic';

      case TimingCategory.HEALTH_CHECK:
        return 'Simplify health check logic or increase timeout';

      case TimingCategory.MCP_OPERATION:
        return 'Optimize MCP server initialization and consider connection reuse';

      default:
        return 'Review operation implementation for optimization opportunities';
    }
  }

  /**
   * Get performance snapshot for a component
   */
  getComponentSnapshot(component: string): PerformanceSnapshot {
    const now = performance.now();
    const componentTimers = this.completedTimers.filter(t => 
      t.context.component === component && 
      (now - t.startTime) < 300000 // Last 5 minutes
    );

    const activeCount = Array.from(this.activeTimers.values())
      .filter(t => t.context.component === component).length;

    const metrics = {
      activeTimers: activeCount,
      completedTimers: componentTimers.length,
      averageTime: componentTimers.length > 0 
        ? componentTimers.reduce((sum, t) => sum + (t.duration || 0), 0) / componentTimers.length
        : 0,
      slowOperations: componentTimers.filter(t => 
        t.level === 'slow' || t.level === 'timeout'
      ).length,
      errorRate: componentTimers.length > 0
        ? componentTimers.filter(t => t.metadata.error).length / componentTimers.length
        : 0
    };

    const breakdown = this.createPerformanceBreakdown(componentTimers);

    return {
      timestamp: Date.now(),
      component,
      metrics,
      breakdown
    };
  }

  /**
   * Create performance breakdown by category
   */
  private createPerformanceBreakdown(timers: UnifiedTimer[]): Record<TimingCategory, any> {
    const breakdown = {} as any;

    for (const category of Object.values(TimingCategory)) {
      const categoryTimers = timers.filter(t => t.category === category);
      const distribution = {
        excellent: categoryTimers.filter(t => t.level === 'excellent').length,
        good: categoryTimers.filter(t => t.level === 'good').length,
        acceptable: categoryTimers.filter(t => t.level === 'acceptable').length,
        slow: categoryTimers.filter(t => t.level === 'slow').length,
        timeout: categoryTimers.filter(t => t.level === 'timeout').length
      };

      breakdown[category] = {
        count: categoryTimers.length,
        totalTime: categoryTimers.reduce((sum, t) => sum + (t.duration ?? 0), 0),
        averageTime: categoryTimers.length > 0
          ? categoryTimers.reduce((sum, t) => sum + (t.duration ?? 0), 0) / categoryTimers.length
          : 0,
        distribution
      };
    }

    return breakdown;
  }

  /**
   * Get overall system performance health
   */
  getSystemHealth(): {
    status: 'excellent' | 'good' | 'degraded' | 'critical';
    activeOperations: number;
    averageResponseTime: number;
    errorRate: number;
    slowOperations: number;
    recommendations: string[];
  } {
    const recentTimers = this.completedTimers.filter(t => 
      (Date.now() - t.startTime) < 600000 // Last 10 minutes
    );

    const activeOperations = this.activeTimers.size;
    const averageResponseTime = recentTimers.length > 0
      ? recentTimers.reduce((sum, t) => sum + (t.duration || 0), 0) / recentTimers.length
      : 0;
    const errorRate = recentTimers.length > 0
      ? recentTimers.filter(t => t.metadata.error).length / recentTimers.length
      : 0;
    const slowOperations = recentTimers.filter(t => 
      t.level === 'slow' || t.level === 'timeout'
    ).length;

    let status: 'excellent' | 'good' | 'degraded' | 'critical' = 'excellent';
    const recommendations: string[] = [];

    if (errorRate > 0.1) {
      status = 'critical';
      recommendations.push('High error rate detected - investigate failing operations');
    } else if (slowOperations > recentTimers.length * 0.2) {
      status = 'degraded';
      recommendations.push('High number of slow operations - review performance bottlenecks');
    } else if (averageResponseTime > 5000) {
      status = 'degraded';
      recommendations.push('High average response time - optimize critical paths');
    } else if (activeOperations > 50) {
      status = 'good';
      recommendations.push('High number of concurrent operations - monitor for resource exhaustion');
    }

    return {
      status,
      activeOperations,
      averageResponseTime,
      errorRate,
      slowOperations,
      recommendations
    };
  }

  /**
   * Start automatic performance data collection
   */
  private startPerformanceCollection(): void {
    setInterval(() => {
      const components = new Set([
        ...Array.from(this.activeTimers.values()).map(t => t.context.component),
        ...this.completedTimers.slice(-100).map(t => t.context.component)
      ]);

      for (const component of components) {
        const snapshot = this.getComponentSnapshot(component);
        this.performanceHistory.push(snapshot);
      }

      // Maintain history limit
      if (this.performanceHistory.length > 1000) {
        this.performanceHistory = this.performanceHistory.slice(-500);
      }

      // Only emit snapshot if we have data
      const latestSnapshot = this.performanceHistory.slice(-1)[0];
      if (latestSnapshot) {
        this.emit('performance_snapshot', latestSnapshot);
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Generate correlation ID for tracing
   */
  private generateCorrelationId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get detailed timing analysis
   */
  getTimingAnalysis(filters?: {
    component?: string;
    category?: TimingCategory;
    timeRange?: { start: number; end: number };
  }): {
    summary: {
      totalOperations: number;
      averageTime: number;
      medianTime: number;
      p95Time: number;
      p99Time: number;
    };
    trends: {
      improving: boolean;
      degrading: boolean;
      stable: boolean;
    };
    outliers: UnifiedTimer[];
  } {
    let timers = this.completedTimers;

    // Apply filters
    if (filters?.component) {
      timers = timers.filter(t => t.context.component === filters.component);
    }
    if (filters?.category) {
      timers = timers.filter(t => t.category === filters.category);
    }
    if (filters?.timeRange) {
      timers = timers.filter(t => 
        t.startTime >= filters.timeRange!.start && 
        t.startTime <= filters.timeRange!.end
      );
    }

    const durations = timers.map(t => t.duration || 0).sort((a, b) => a - b);
    const outliers = timers.filter(t => 
      t.level === 'slow' || t.level === 'timeout'
    );

    const summary = {
      totalOperations: durations.length,
      averageTime: durations.length > 0 
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
        : 0,
      medianTime: durations.length > 0 
        ? durations[Math.floor(durations.length / 2)] 
        : 0,
      p95Time: durations.length > 0 
        ? durations[Math.floor(durations.length * 0.95)] 
        : 0,
      p99Time: durations.length > 0 
        ? durations[Math.floor(durations.length * 0.99)] 
        : 0
    };

    // Simple trend analysis
    const recent = timers.slice(-50);
    const older = timers.slice(-100, -50);
    const recentAvg = recent.length > 0 
      ? recent.reduce((sum, t) => sum + (t.duration || 0), 0) / recent.length 
      : 0;
    const olderAvg = older.length > 0 
      ? older.reduce((sum, t) => sum + (t.duration || 0), 0) / older.length 
      : 0;

    const trends = {
      improving: recentAvg < olderAvg * 0.9,
      degrading: recentAvg > olderAvg * 1.1,
      stable: Math.abs(recentAvg - olderAvg) <= olderAvg * 0.1
    };

    return { summary, trends, outliers };
  }

  /**
   * Clear all performance data (useful for testing)
   */
  clear(): void {
    this.activeTimers.clear();
    this.completedTimers = [];
    this.performanceHistory = [];
    this.correlationMap.clear();
    this.nextTimerId = 1;
    performanceMonitor.clear();
  }
}

// Export singleton instance and convenience functions
export const unifiedPerformance = UnifiedPerformanceSystem.getInstance();

// Convenience functions for common operations
export function createTimer(
  name: string,
  category: TimingCategory,
  component: string,
  operation: string,
  metadata?: Record<string, any>
): string {
  return unifiedPerformance.createTimer(name, category, component, operation, metadata);
}

export function completeTimer(timerId: string, metadata?: Record<string, any>, error?: Error): void {
  unifiedPerformance.completeTimer(timerId, metadata, error);
}

export function timedOperation<T>(
  name: string,
  category: TimingCategory,
  component: string,
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  return unifiedPerformance.createTimerFunction(name, category, component, operation, fn, metadata)();
}

export function timedSyncOperation<T>(
  name: string,
  category: TimingCategory,
  component: string,
  operation: string,
  fn: () => T,
  metadata?: Record<string, any>
): T {
  return unifiedPerformance.createSyncTimerFunction(name, category, component, operation, fn, metadata)();
}