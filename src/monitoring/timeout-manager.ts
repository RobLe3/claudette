/**
 * Unified Timeout Management System - HARMONIZED FOR CLAUDE CODE
 * Standardizes timeout handling across all Claudette components
 * Updated to work seamlessly with Claude Code's 120s timeout limit
 */

import { EventEmitter } from 'events';
import { TimingCategory, unifiedPerformance } from './unified-performance-system';
import { 
  TIMEOUT_HIERARCHY, 
  getHarmonizedTimeout, 
  timeoutCalculator,
  BACKEND_TIMEOUTS,
  MCP_TIMEOUTS 
} from '../config/harmonized-timeouts';

// HARMONIZED timeout configurations - designed for Claude Code compatibility
export const STANDARD_TIMEOUTS = {
  // Core system operations - Level 1 (5-10s)
  INITIALIZATION: TIMEOUT_HIERARCHY.HEALTH_CHECK_MAX,           // 12s for system startup
  BACKEND_HEALTH_CHECK: TIMEOUT_HIERARCHY.HEALTH_CHECK_BASE,   // 8s for health checks (harmonized)
  CREDENTIAL_LOADING: TIMEOUT_HIERARCHY.QUICK_OPERATION,       // 10s for credential operations
  ENVIRONMENT_LOADING: TIMEOUT_HIERARCHY.QUICK_OPERATION,      // 10s for environment setup
  
  // Backend operations - Level 2-4 (15-75s)
  BACKEND_REQUEST: TIMEOUT_HIERARCHY.COMPLEX_REQUEST_BASE,     // 60s for AI requests (Claude Code compatible)
  BACKEND_STREAMING: TIMEOUT_HIERARCHY.MCP_OPERATION_BASE,    // 90s for streaming responses
  BACKEND_CONNECTION: TIMEOUT_HIERARCHY.CONNECTION_ESTABLISHMENT, // 15s for connection establishment
  
  // Cache operations - Level 1 (Quick)
  CACHE_READ: 1000,                                            // 1s for cache reads (increased)
  CACHE_WRITE: 2000,                                           // 2s for cache writes (increased)
  CACHE_INVALIDATION: 5000,                                    // 5s for cache cleanup (increased)
  
  // Database operations - Level 2-3
  DATABASE_QUERY: TIMEOUT_HIERARCHY.CONNECTION_WITH_RETRY,     // 20s for database queries
  DATABASE_MIGRATION: TIMEOUT_HIERARCHY.COMPLEX_REQUEST_BASE, // 60s for migrations
  DATABASE_BACKUP: TIMEOUT_HIERARCHY.MCP_OPERATION_MAX,       // 105s for backups
  
  // Network operations - Level 2-3
  HTTP_REQUEST: TIMEOUT_HIERARCHY.SIMPLE_REQUEST_BASE,        // 30s for HTTP requests
  WEBHOOK_DELIVERY: TIMEOUT_HIERARCHY.CONNECTION_ESTABLISHMENT, // 15s for webhook calls
  API_CALL: TIMEOUT_HIERARCHY.CONNECTION_WITH_RETRY,          // 20s for external API calls
  
  // MCP operations - Level 5 (90-105s) - CRITICAL FOR CLAUDE CODE
  MCP_REQUEST: MCP_TIMEOUTS.REQUEST_PROCESSING,               // 90s for MCP requests (Claude Code optimized)
  MCP_SERVER_START: MCP_TIMEOUTS.SERVER_STARTUP,             // 25s for MCP server startup
  MCP_TOOL_EXECUTION: MCP_TIMEOUTS.TOOL_EXECUTION,           // 60s for tool execution
  
  // RAG operations - Level 3-4
  RAG_QUERY: TIMEOUT_HIERARCHY.SIMPLE_REQUEST_BASE,          // 30s for RAG queries
  RAG_INDEXING: TIMEOUT_HIERARCHY.COMPLEX_REQUEST_BASE,      // 60s for indexing
  RAG_EMBEDDING: TIMEOUT_HIERARCHY.CONNECTION_WITH_RETRY,     // 20s for embeddings
  
  // Authentication operations - Level 1-2
  AUTH_LOGIN: TIMEOUT_HIERARCHY.QUICK_OPERATION,             // 10s for login
  AUTH_TOKEN_REFRESH: TIMEOUT_HIERARCHY.HEALTH_CHECK_BASE,   // 8s for token refresh
  AUTH_VALIDATION: TIMEOUT_HIERARCHY.HEALTH_CHECK_BASE,      // 8s for token validation
  
  // File operations
  FILE_READ: 5000,                // 5 seconds for file reads
  FILE_WRITE: 10000,              // 10 seconds for file writes
  FILE_UPLOAD: 60000,             // 1 minute for uploads
  
  // System operations
  SYSTEM_OPERATION: 10000,        // 10 seconds for general system operations
  GRACEFUL_SHUTDOWN: 30000,       // 30 seconds for shutdown
  RESOURCE_CLEANUP: 10000,        // 10 seconds for cleanup
  HEALTH_CHECK_BACKGROUND: 11000  // 11 seconds for background health checks
} as const;

export type TimeoutType = keyof typeof STANDARD_TIMEOUTS;

export interface TimeoutConfig {
  /** The timeout duration in milliseconds */
  duration: number;
  /** Whether to retry on timeout */
  retryOnTimeout: boolean;
  /** Maximum number of retries */
  maxRetries: number;
  /** Backoff strategy for retries */
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  /** Base delay for retries in milliseconds */
  baseDelay: number;
  /** Custom timeout handler */
  onTimeout?: (context: TimeoutContext) => void;
  /** Warning threshold (percentage of timeout) */
  warningThreshold: number;
}

export interface TimeoutContext {
  operationId: string;
  operationType: TimeoutType;
  component: string;
  startTime: number;
  duration: number;
  attempt: number;
  metadata: Record<string, any>;
}

export interface ActiveTimeout {
  id: string;
  type: TimeoutType;
  config: TimeoutConfig;
  context: TimeoutContext;
  timeoutHandle: NodeJS.Timeout;
  warningHandle?: NodeJS.Timeout;
  promise?: Promise<any>;
  resolve?: (value: any) => void;
  reject?: (error: Error) => void;
}

export class TimeoutManager extends EventEmitter {
  private static instance: TimeoutManager | null = null;
  private activeTimeouts = new Map<string, ActiveTimeout>();
  private defaultConfigs = new Map<TimeoutType, TimeoutConfig>();
  private nextOperationId = 1;

  static getInstance(): TimeoutManager {
    if (!TimeoutManager.instance) {
      TimeoutManager.instance = new TimeoutManager();
    }
    return TimeoutManager.instance;
  }

  private constructor() {
    super();
    this.setupDefaultConfigs();
  }

  /**
   * Setup default timeout configurations
   */
  private setupDefaultConfigs(): void {
    const defaultConfig: TimeoutConfig = {
      duration: 30000,
      retryOnTimeout: false,
      maxRetries: 0,
      backoffStrategy: 'exponential',
      baseDelay: 1000,
      warningThreshold: 0.8
    };

    // Set specific configurations for different operation types
    const specificConfigs: Partial<Record<TimeoutType, Partial<TimeoutConfig>>> = {
      BACKEND_REQUEST: {
        retryOnTimeout: true,
        maxRetries: 2,
        warningThreshold: 0.7
      },
      BACKEND_HEALTH_CHECK: {
        retryOnTimeout: true,
        maxRetries: 1,
        backoffStrategy: 'fixed',
        baseDelay: 500
      },
      CACHE_READ: {
        retryOnTimeout: false,
        warningThreshold: 0.6
      },
      DATABASE_QUERY: {
        retryOnTimeout: true,
        maxRetries: 1,
        warningThreshold: 0.75
      },
      MCP_REQUEST: {
        retryOnTimeout: false,
        warningThreshold: 0.8
      }
    };

    // Apply configurations
    for (const [type, timeout] of Object.entries(STANDARD_TIMEOUTS)) {
      const config = {
        ...defaultConfig,
        duration: timeout,
        ...specificConfigs[type as TimeoutType]
      };
      this.defaultConfigs.set(type as TimeoutType, config);
    }
  }

  /**
   * Create a timeout for an operation
   */
  createTimeout<T>(
    type: TimeoutType,
    component: string,
    operation: () => Promise<T>,
    customConfig?: Partial<TimeoutConfig>,
    metadata: Record<string, any> = {}
  ): Promise<T> {
    const operationId = `${component}_${type}_${this.nextOperationId++}`;
    const config = {
      ...this.defaultConfigs.get(type)!,
      ...customConfig
    };

    return this.executeWithTimeout(operationId, type, component, operation, config, metadata);
  }

  /**
   * Execute operation with timeout and retry logic
   */
  private async executeWithTimeout<T>(
    operationId: string,
    type: TimeoutType,
    component: string,
    operation: () => Promise<T>,
    config: TimeoutConfig,
    metadata: Record<string, any>,
    attempt: number = 1
  ): Promise<T> {
    const context: TimeoutContext = {
      operationId,
      operationType: type,
      component,
      startTime: Date.now(),
      duration: config.duration,
      attempt,
      metadata
    };

    // Start performance timing
    const timerId = unifiedPerformance.createTimer(
      `${type}_timeout`,
      this.mapTimeoutToCategory(type),
      component,
      type,
      { ...metadata, attempt, maxRetries: config.maxRetries }
    );

    const timeoutPromise = new Promise<T>((resolve, reject) => {
      const activeTimeout: ActiveTimeout = {
        id: operationId,
        type,
        config,
        context,
        timeoutHandle: setTimeout(() => {
          this.handleTimeout(activeTimeout);
        }, config.duration),
        promise: undefined,
        resolve,
        reject
      };

      // Set warning timer
      if (config.warningThreshold > 0) {
        activeTimeout.warningHandle = setTimeout(() => {
          this.handleTimeoutWarning(activeTimeout);
        }, config.duration * config.warningThreshold);
      }

      activeTimeout.resolve = resolve;
      activeTimeout.reject = reject;
      this.activeTimeouts.set(operationId, activeTimeout);
    });

    try {
      // Race between operation and timeout
      const result = await Promise.race([
        operation(),
        timeoutPromise
      ]);

      // Operation completed successfully
      this.clearTimeout(operationId);
      unifiedPerformance.completeTimer(timerId, { 
        success: true, 
        attempt, 
        completed: 'within_timeout' 
      });

      return result;
    } catch (error) {
      this.clearTimeout(operationId);

      // Check if this was a timeout error and retry is enabled
      if (error instanceof TimeoutError && config.retryOnTimeout && attempt <= config.maxRetries) {
        unifiedPerformance.completeTimer(timerId, { 
          success: false, 
          attempt, 
          retry: true,
          error: error.message 
        });

        // Calculate retry delay
        const delay = this.calculateRetryDelay(config, attempt);
        await this.sleep(delay);

        // Retry the operation
        return this.executeWithTimeout(
          operationId,
          type,
          component,
          operation,
          config,
          metadata,
          attempt + 1
        );
      }

      unifiedPerformance.completeTimer(timerId, { 
        success: false, 
        attempt, 
        final_failure: true 
      }, error as Error);

      throw error;
    }
  }

  /**
   * Handle timeout occurrence
   */
  private handleTimeout(activeTimeout: ActiveTimeout): void {
    const { context, config } = activeTimeout;
    const elapsed = Date.now() - context.startTime;

    const timeoutError = new TimeoutError(
      `Operation ${context.operationType} in ${context.component} timed out after ${elapsed}ms (limit: ${config.duration}ms)`,
      context.operationType,
      context.component,
      elapsed,
      config.duration
    );

    // Custom timeout handler
    if (config.onTimeout) {
      try {
        config.onTimeout(context);
      } catch (error) {
        console.warn('[TimeoutManager] Custom timeout handler failed:', error);
      }
    }

    // Emit timeout event
    this.emit('timeout', {
      ...context,
      elapsed,
      canRetry: config.retryOnTimeout && context.attempt <= config.maxRetries
    });

    // Reject the promise
    if (activeTimeout.reject) {
      activeTimeout.reject(timeoutError);
    }
  }

  /**
   * Handle timeout warning (operation taking longer than expected)
   */
  private handleTimeoutWarning(activeTimeout: ActiveTimeout): void {
    const { context } = activeTimeout;
    const elapsed = Date.now() - context.startTime;

    this.emit('timeout_warning', {
      ...context,
      elapsed,
      remainingTime: context.duration - elapsed
    });
  }

  /**
   * Clear a timeout
   */
  private clearTimeout(operationId: string): void {
    const activeTimeout = this.activeTimeouts.get(operationId);
    if (activeTimeout) {
      clearTimeout(activeTimeout.timeoutHandle);
      if (activeTimeout.warningHandle) {
        clearTimeout(activeTimeout.warningHandle);
      }
      this.activeTimeouts.delete(operationId);
    }
  }

  /**
   * Calculate retry delay based on strategy
   */
  private calculateRetryDelay(config: TimeoutConfig, attempt: number): number {
    switch (config.backoffStrategy) {
      case 'linear':
        return config.baseDelay * attempt;
      case 'exponential':
        return config.baseDelay * Math.pow(2, attempt - 1);
      case 'fixed':
      default:
        return config.baseDelay;
    }
  }

  /**
   * Map timeout type to performance category
   */
  private mapTimeoutToCategory(type: TimeoutType): TimingCategory {
    if (type.includes('BACKEND')) return TimingCategory.BACKEND_OPERATION;
    if (type.includes('CACHE')) return TimingCategory.CACHE_OPERATION;
    if (type.includes('DATABASE')) return TimingCategory.DATABASE_OPERATION;
    if (type.includes('HTTP') || type.includes('API')) return TimingCategory.NETWORK_REQUEST;
    if (type.includes('AUTH')) return TimingCategory.AUTHENTICATION;
    if (type.includes('MCP')) return TimingCategory.MCP_OPERATION;
    if (type.includes('RAG')) return TimingCategory.RAG_OPERATION;
    if (type.includes('HEALTH')) return TimingCategory.HEALTH_CHECK;
    return TimingCategory.SYSTEM_OPERATION;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get timeout statistics
   */
  getStatistics(): {
    activeTimeouts: number;
    totalTimeouts: number;
    averageTimeoutRate: number;
    retryRate: number;
    componentBreakdown: Record<string, number>;
  } {
    const activeTimeouts = this.activeTimeouts.size;
    
    // These would be tracked over time in a real implementation
    return {
      activeTimeouts,
      totalTimeouts: 0,
      averageTimeoutRate: 0,
      retryRate: 0,
      componentBreakdown: {}
    };
  }

  /**
   * Update timeout configuration for a specific type
   */
  updateTimeoutConfig(type: TimeoutType, config: Partial<TimeoutConfig>): void {
    const currentConfig = this.defaultConfigs.get(type);
    if (currentConfig) {
      this.defaultConfigs.set(type, { ...currentConfig, ...config });
    }
  }

  /**
   * Clear all active timeouts (useful for shutdown)
   */
  clearAllTimeouts(): void {
    for (const [operationId] of this.activeTimeouts) {
      this.clearTimeout(operationId);
    }
  }
}

export class TimeoutError extends Error {
  constructor(
    message: string,
    public operationType: TimeoutType,
    public component: string,
    public elapsed: number,
    public limit: number
  ) {
    super(message);
    this.name = 'TimeoutError';
  }
}

// Export singleton instance and convenience functions
export const timeoutManager = TimeoutManager.getInstance();

// Convenience functions
export function withTimeout<T>(
  type: TimeoutType,
  component: string,
  operation: () => Promise<T>,
  customConfig?: Partial<TimeoutConfig>,
  metadata?: Record<string, any>
): Promise<T> {
  return timeoutManager.createTimeout(type, component, operation, customConfig, metadata);
}

export function setTimeoutConfig(type: TimeoutType, config: Partial<TimeoutConfig>): void {
  timeoutManager.updateTimeoutConfig(type, config);
}

// Performance monitoring integration
timeoutManager.on('timeout', (event) => {
  console.warn(`[TimeoutManager] Operation timeout: ${event.operationType} in ${event.component} (${event.elapsed}ms)`);
});

timeoutManager.on('timeout_warning', (event) => {
  console.warn(`[TimeoutManager] Operation slow: ${event.operationType} in ${event.component} (${event.elapsed}ms, ${event.remainingTime}ms remaining)`);
});