/**
 * Performance Harmonization System
 * Integrates unified performance monitoring across all Claudette components
 */

import { 
  unifiedPerformance, 
  TimingCategory, 
  createTimer, 
  completeTimer,
  ComponentPerformanceProfile 
} from './unified-performance-system';
import { 
  timeoutManager, 
  withTimeout, 
  TimeoutType,
  STANDARD_TIMEOUTS 
} from './timeout-manager';
import { performanceMonitor } from './performance-metrics';

// Component registration and profiling
export const COMPONENT_PROFILES: Record<string, ComponentPerformanceProfile> = {
  'claudette-core': {
    component: 'claudette-core',
    expectedOperations: [
      { name: 'initialization', category: TimingCategory.INITIALIZATION, expectedDuration: 3000, tolerance: 0.5 },
      { name: 'request-processing', category: TimingCategory.SYSTEM_OPERATION, expectedDuration: 1000, tolerance: 0.3 },
      { name: 'backend-routing', category: TimingCategory.ROUTING, expectedDuration: 50, tolerance: 0.2 }
    ],
    healthThresholds: {
      maxConcurrentOps: 50,
      maxAverageTime: 5000,
      maxErrorRate: 0.05
    }
  },
  'backend-manager': {
    component: 'backend-manager',
    expectedOperations: [
      { name: 'health-check', category: TimingCategory.HEALTH_CHECK, expectedDuration: 2000, tolerance: 0.4 },
      { name: 'api-request', category: TimingCategory.BACKEND_OPERATION, expectedDuration: 5000, tolerance: 0.6 },
      { name: 'connection-setup', category: TimingCategory.NETWORK_REQUEST, expectedDuration: 1000, tolerance: 0.3 }
    ],
    healthThresholds: {
      maxConcurrentOps: 20,
      maxAverageTime: 10000,
      maxErrorRate: 0.1
    }
  },
  'cache-system': {
    component: 'cache-system',
    expectedOperations: [
      { name: 'cache-read', category: TimingCategory.CACHE_OPERATION, expectedDuration: 50, tolerance: 0.2 },
      { name: 'cache-write', category: TimingCategory.CACHE_OPERATION, expectedDuration: 100, tolerance: 0.3 },
      { name: 'cache-invalidate', category: TimingCategory.CACHE_OPERATION, expectedDuration: 200, tolerance: 0.4 }
    ],
    healthThresholds: {
      maxConcurrentOps: 100,
      maxAverageTime: 500,
      maxErrorRate: 0.01
    }
  },
  'database-manager': {
    component: 'database-manager',
    expectedOperations: [
      { name: 'query-execution', category: TimingCategory.DATABASE_OPERATION, expectedDuration: 1000, tolerance: 0.5 },
      { name: 'connection-pool', category: TimingCategory.DATABASE_OPERATION, expectedDuration: 200, tolerance: 0.3 },
      { name: 'migration', category: TimingCategory.DATABASE_OPERATION, expectedDuration: 30000, tolerance: 1.0 }
    ],
    healthThresholds: {
      maxConcurrentOps: 30,
      maxAverageTime: 3000,
      maxErrorRate: 0.02
    }
  },
  'mcp-server': {
    component: 'mcp-server',
    expectedOperations: [
      { name: 'server-startup', category: TimingCategory.MCP_OPERATION, expectedDuration: 5000, tolerance: 0.6 },
      { name: 'tool-execution', category: TimingCategory.MCP_OPERATION, expectedDuration: 15000, tolerance: 1.0 },
      { name: 'request-processing', category: TimingCategory.MCP_OPERATION, expectedDuration: 10000, tolerance: 0.8 }
    ],
    healthThresholds: {
      maxConcurrentOps: 10,
      maxAverageTime: 20000,
      maxErrorRate: 0.15
    }
  },
  'credential-manager': {
    component: 'credential-manager',
    expectedOperations: [
      { name: 'keychain-access', category: TimingCategory.AUTHENTICATION, expectedDuration: 500, tolerance: 0.4 },
      { name: 'credential-retrieval', category: TimingCategory.AUTHENTICATION, expectedDuration: 1000, tolerance: 0.5 },
      { name: 'storage-init', category: TimingCategory.AUTHENTICATION, expectedDuration: 2000, tolerance: 0.6 }
    ],
    healthThresholds: {
      maxConcurrentOps: 15,
      maxAverageTime: 2000,
      maxErrorRate: 0.05
    }
  },
  'environment-loader': {
    component: 'environment-loader',
    expectedOperations: [
      { name: 'env-file-load', category: TimingCategory.SYSTEM_OPERATION, expectedDuration: 100, tolerance: 0.3 },
      { name: 'credential-discovery', category: TimingCategory.SYSTEM_OPERATION, expectedDuration: 1000, tolerance: 0.5 },
      { name: 'variable-validation', category: TimingCategory.SYSTEM_OPERATION, expectedDuration: 50, tolerance: 0.2 }
    ],
    healthThresholds: {
      maxConcurrentOps: 5,
      maxAverageTime: 1000,
      maxErrorRate: 0.02
    }
  }
};

export class PerformanceHarmonizer {
  private static instance: PerformanceHarmonizer | null = null;
  private initialized = false;

  static getInstance(): PerformanceHarmonizer {
    if (!PerformanceHarmonizer.instance) {
      PerformanceHarmonizer.instance = new PerformanceHarmonizer();
    }
    return PerformanceHarmonizer.instance;
  }

  /**
   * Initialize performance harmonization across all components
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[PerformanceHarmonizer] Initializing unified performance monitoring...');

    // Register all component profiles
    for (const profile of Object.values(COMPONENT_PROFILES)) {
      unifiedPerformance.registerComponent(profile);
    }

    // Setup performance event handlers
    this.setupEventHandlers();

    // Start system-wide performance monitoring
    this.startSystemMonitoring();

    this.initialized = true;
    console.log('[PerformanceHarmonizer] Performance harmonization initialized successfully');
  }

  /**
   * Setup event handlers for performance monitoring
   */
  private setupEventHandlers(): void {
    // Handle performance warnings
    unifiedPerformance.on('performance_warning', (event) => {
      console.warn(`[PerformanceWarning] ${event.timer.context.component}:${event.timer.context.operation} - ${event.timer.duration}ms (${event.timer.level})`);
      console.warn(`[PerformanceWarning] Recommendation: ${event.recommendation}`);
    });

    // Handle timeout events
    timeoutManager.on('timeout', (event) => {
      console.error(`[PerformanceTimeout] ${event.component}:${event.operationType} timed out after ${event.elapsed}ms`);
    });

    timeoutManager.on('timeout_warning', (event) => {
      console.warn(`[PerformanceWarning] ${event.component}:${event.operationType} running slow (${event.elapsed}ms, ${event.remainingTime}ms remaining)`);
    });

    // Handle performance snapshots
    unifiedPerformance.on('performance_snapshot', (snapshot) => {
      // Safely destructure snapshot with fallback
      if (!snapshot || typeof snapshot !== 'object') {
        console.warn('[PerformanceHealth] Invalid snapshot received');
        return;
      }

      const component = snapshot.component;
      const metrics = snapshot.metrics;
      
      if (!component || !metrics) {
        console.warn('[PerformanceHealth] Snapshot missing component or metrics');
        return;
      }
      
      // Check component health against thresholds
      const profile = COMPONENT_PROFILES[component];
      if (profile) {
        const { healthThresholds } = profile;
        
        if (metrics.activeTimers > healthThresholds.maxConcurrentOps) {
          console.warn(`[PerformanceHealth] ${component} has high concurrent operations: ${metrics.activeTimers}/${healthThresholds.maxConcurrentOps}`);
        }
        
        if (metrics.averageTime > healthThresholds.maxAverageTime) {
          console.warn(`[PerformanceHealth] ${component} has high average response time: ${metrics.averageTime}ms/${healthThresholds.maxAverageTime}ms`);
        }
        
        if (metrics.errorRate > healthThresholds.maxErrorRate) {
          console.warn(`[PerformanceHealth] ${component} has high error rate: ${(metrics.errorRate * 100).toFixed(1)}%/${(healthThresholds.maxErrorRate * 100).toFixed(1)}%`);
        }
      }
    });
  }

  /**
   * Start system-wide performance monitoring
   */
  private startSystemMonitoring(): void {
    // Monitor overall system health every minute
    setInterval(() => {
      const systemHealth = unifiedPerformance.getSystemHealth();
      
      if (systemHealth.status === 'degraded' || systemHealth.status === 'critical') {
        console.warn(`[SystemHealth] Status: ${systemHealth.status.toUpperCase()}`);
        console.warn(`[SystemHealth] Active operations: ${systemHealth.activeOperations}`);
        console.warn(`[SystemHealth] Average response time: ${systemHealth.averageResponseTime.toFixed(2)}ms`);
        console.warn(`[SystemHealth] Error rate: ${(systemHealth.errorRate * 100).toFixed(2)}%`);
        console.warn(`[SystemHealth] Slow operations: ${systemHealth.slowOperations}`);
        
        if (systemHealth.recommendations.length > 0) {
          console.warn('[SystemHealth] Recommendations:');
          systemHealth.recommendations.forEach(rec => console.warn(`  - ${rec}`));
        }
      }
    }, 60000); // Every minute
  }

  /**
   * Create a harmonized timer for any component operation
   */
  createHarmonizedTimer(
    component: string,
    operation: string,
    category: TimingCategory,
    metadata: Record<string, any> = {}
  ): string {
    return createTimer(`${component}_${operation}`, category, component, operation, metadata);
  }

  /**
   * Create a harmonized timed operation with timeout
   */
  async executeHarmonizedOperation<T>(
    component: string,
    operation: string,
    category: TimingCategory,
    timeoutType: TimeoutType,
    fn: () => Promise<T>,
    metadata: Record<string, any> = {}
  ): Promise<T> {
    const timerId = this.createHarmonizedTimer(component, operation, category, metadata);
    
    try {
      const result = await withTimeout(timeoutType, component, fn, undefined, metadata);
      completeTimer(timerId, { success: true });
      return result;
    } catch (error) {
      completeTimer(timerId, { success: false }, error as Error);
      throw error;
    }
  }

  /**
   * Harmonize backend operations
   */
  createBackendTimer(backendName: string, operation: string, metadata: Record<string, any> = {}): string {
    return this.createHarmonizedTimer(
      'backend-manager', 
      `${backendName}_${operation}`, 
      TimingCategory.BACKEND_OPERATION, 
      metadata
    );
  }

  /**
   * Harmonize cache operations
   */
  createCacheTimer(operation: string, metadata: Record<string, any> = {}): string {
    return this.createHarmonizedTimer(
      'cache-system', 
      operation, 
      TimingCategory.CACHE_OPERATION, 
      metadata
    );
  }

  /**
   * Harmonize database operations
   */
  createDatabaseTimer(operation: string, metadata: Record<string, any> = {}): string {
    return this.createHarmonizedTimer(
      'database-manager', 
      operation, 
      TimingCategory.DATABASE_OPERATION, 
      metadata
    );
  }

  /**
   * Harmonize MCP operations
   */
  createMCPTimer(operation: string, metadata: Record<string, any> = {}): string {
    return this.createHarmonizedTimer(
      'mcp-server', 
      operation, 
      TimingCategory.MCP_OPERATION, 
      metadata
    );
  }

  /**
   * Harmonize authentication operations
   */
  createAuthTimer(operation: string, metadata: Record<string, any> = {}): string {
    return this.createHarmonizedTimer(
      'credential-manager', 
      operation, 
      TimingCategory.AUTHENTICATION, 
      metadata
    );
  }

  /**
   * Get harmonized performance report
   */
  getPerformanceReport(): {
    systemHealth: ReturnType<typeof unifiedPerformance.getSystemHealth>;
    componentSnapshots: Record<string, ReturnType<typeof unifiedPerformance.getComponentSnapshot>>;
    timeoutStatistics: ReturnType<typeof timeoutManager.getStatistics>;
    recommendations: string[];
  } {
    const systemHealth = unifiedPerformance.getSystemHealth();
    const componentSnapshots: Record<string, any> = {};
    
    // Get snapshots for all registered components
    for (const componentName of Object.keys(COMPONENT_PROFILES)) {
      componentSnapshots[componentName] = unifiedPerformance.getComponentSnapshot(componentName);
    }
    
    const timeoutStatistics = timeoutManager.getStatistics();
    
    // Generate recommendations based on current state
    const recommendations: string[] = [...systemHealth.recommendations];
    
    // Add component-specific recommendations
    for (const [componentName, snapshot] of Object.entries(componentSnapshots)) {
      const profile = COMPONENT_PROFILES[componentName];
      if (profile && snapshot.metrics.slowOperations > 0) {
        recommendations.push(`Optimize ${componentName} - ${snapshot.metrics.slowOperations} slow operations detected`);
      }
    }
    
    return {
      systemHealth,
      componentSnapshots,
      timeoutStatistics,
      recommendations
    };
  }

  /**
   * Optimize system performance based on current metrics
   */
  async optimizeSystemPerformance(): Promise<{
    optimizationsApplied: string[];
    performanceGains: Record<string, number>;
  }> {
    const report = this.getPerformanceReport();
    const optimizationsApplied: string[] = [];
    const performanceGains: Record<string, number> = {};

    // Analyze and apply optimizations
    if (report.systemHealth.status === 'degraded' || report.systemHealth.status === 'critical') {
      // Increase health check timeouts if there are many slow health checks
      const healthCheckIssues = Object.values(report.componentSnapshots).some(
        snapshot => snapshot.breakdown[TimingCategory.HEALTH_CHECK]?.distribution?.slow > 0
      );

      if (healthCheckIssues) {
        timeoutManager.updateTimeoutConfig('BACKEND_HEALTH_CHECK', {
          duration: STANDARD_TIMEOUTS.BACKEND_HEALTH_CHECK * 1.5
        });
        optimizationsApplied.push('Increased health check timeouts by 50%');
        performanceGains['health_check_timeout'] = 1.5;
      }

      // Reduce cache operation timeouts if cache is performing well
      const cacheSnapshot = report.componentSnapshots['cache-system'];
      if (cacheSnapshot && cacheSnapshot.metrics.averageTime < 100) {
        timeoutManager.updateTimeoutConfig('CACHE_READ', {
          duration: Math.max(100, STANDARD_TIMEOUTS.CACHE_READ * 0.8)
        });
        optimizationsApplied.push('Optimized cache read timeouts');
        performanceGains['cache_optimization'] = 0.8;
      }
    }

    return { optimizationsApplied, performanceGains };
  }

  /**
   * Reset all performance data
   */
  reset(): void {
    unifiedPerformance.clear();
    timeoutManager.clearAllTimeouts();
    performanceMonitor.clear();
  }
}

// Export singleton instance and convenience functions
export const performanceHarmonizer = PerformanceHarmonizer.getInstance();

// Convenience functions for common operations
export function harmonizedBackendOperation<T>(
  backendName: string,
  operation: string,
  fn: () => Promise<T>,
  metadata: Record<string, any> = {}
): Promise<T> {
  return performanceHarmonizer.executeHarmonizedOperation(
    'backend-manager',
    `${backendName}_${operation}`,
    TimingCategory.BACKEND_OPERATION,
    'BACKEND_REQUEST',
    fn,
    { backend: backendName, ...metadata }
  );
}

export function harmonizedCacheOperation<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata: Record<string, any> = {}
): Promise<T> {
  const timeoutType = operation.includes('read') ? 'CACHE_READ' : 'CACHE_WRITE';
  return performanceHarmonizer.executeHarmonizedOperation(
    'cache-system',
    operation,
    TimingCategory.CACHE_OPERATION,
    timeoutType as TimeoutType,
    fn,
    metadata
  );
}

export function harmonizedDatabaseOperation<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata: Record<string, any> = {}
): Promise<T> {
  return performanceHarmonizer.executeHarmonizedOperation(
    'database-manager',
    operation,
    TimingCategory.DATABASE_OPERATION,
    'DATABASE_QUERY',
    fn,
    metadata
  );
}

export function harmonizedMCPOperation<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata: Record<string, any> = {}
): Promise<T> {
  return performanceHarmonizer.executeHarmonizedOperation(
    'mcp-server',
    operation,
    TimingCategory.MCP_OPERATION,
    'MCP_REQUEST',
    fn,
    metadata
  );
}

export function harmonizedAuthOperation<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata: Record<string, any> = {}
): Promise<T> {
  const timeoutType = operation.includes('login') ? 'AUTH_LOGIN' : 'AUTH_VALIDATION';
  return performanceHarmonizer.executeHarmonizedOperation(
    'credential-manager',
    operation,
    TimingCategory.AUTHENTICATION,
    timeoutType as TimeoutType,
    fn,
    metadata
  );
}

// Auto-initialize on module load
performanceHarmonizer.initialize().catch(error => {
  console.error('[PerformanceHarmonizer] Failed to initialize:', error);
});