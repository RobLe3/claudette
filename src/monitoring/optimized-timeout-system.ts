/**
 * Optimized Timeout System for Claudette
 * Fixes API timeout errors and multiplexing issues through intelligent timeout management
 */

import { EventEmitter } from 'events';
import { TimeoutManager, STANDARD_TIMEOUTS, TimeoutType } from './timeout-manager';

// Optimized timeout configurations based on real-world performance analysis
export const OPTIMIZED_TIMEOUTS = {
  // Health checks - increased for reliability
  BACKEND_HEALTH_CHECK: 8000,        // 8s (was 5.5s) - prevent premature failures
  HEALTH_CHECK_BACKGROUND: 12000,    // 12s for background checks
  
  // Backend operations - balanced for performance and reliability
  BACKEND_REQUEST: 60000,            // 60s (was 15-45s) - allow complex queries
  BACKEND_STREAMING: 180000,         // 3 minutes for streaming responses
  BACKEND_CONNECTION: 15000,         // 15s for connection establishment
  
  // MCP operations - optimized for server startup reliability
  MCP_REQUEST: 90000,                // 90s (was 60s) - accommodate server processing
  MCP_SERVER_START: 25000,           // 25s (was 15s) - more time for startup
  MCP_TOOL_EXECUTION: 75000,         // 75s for complex tool operations
  
  // API calls - differentiated by complexity
  API_CALL_SIMPLE: 20000,            // 20s for simple API calls
  API_CALL_COMPLEX: 45000,           // 45s for complex operations
  
  // Cache operations - optimized for performance
  CACHE_READ: 1000,                  // 1s for cache reads
  CACHE_WRITE: 2000,                 // 2s for cache writes
  
  // Database operations - realistic timeouts
  DATABASE_QUERY: 8000,              // 8s for database queries
  DATABASE_MIGRATION: 120000,        // 2 minutes for migrations
} as const;

export interface OptimizedRetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  backoffStrategy: 'linear' | 'exponential' | 'adaptive';
  jitterFactor: number;
  circuitBreakerEnabled: boolean;
  priorityBoost: boolean;
}

export interface ConnectionPoolConfig {
  maxConcurrentPerBackend: number;
  maxTotalConcurrent: number;
  keepAlive: boolean;
  connectionTimeout: number;
  idleTimeout: number;
  retryDelay: number;
}

export interface OptimizedTimeoutContext {
  operationId: string;
  operationType: string;
  component: string;
  priority: 'high' | 'medium' | 'low';
  retryCount: number;
  startTime: number;
  metadata: Record<string, any>;
}

export class OptimizedTimeoutSystem extends EventEmitter {
  private static instance: OptimizedTimeoutSystem | null = null;
  private timeoutManager: TimeoutManager;
  private activeOperations = new Map<string, OptimizedTimeoutContext>();
  private retryConfigs = new Map<string, OptimizedRetryConfig>();
  private connectionPools = new Map<string, any>();
  private circuitBreakers = new Map<string, any>();
  private performanceMetrics = new Map<string, any>();

  static getInstance(): OptimizedTimeoutSystem {
    if (!OptimizedTimeoutSystem.instance) {
      OptimizedTimeoutSystem.instance = new OptimizedTimeoutSystem();
    }
    return OptimizedTimeoutSystem.instance;
  }

  private constructor() {
    super();
    this.timeoutManager = TimeoutManager.getInstance();
    this.setupOptimizedConfigurations();
    this.setupEventHandlers();
    
    console.log('🚀 Optimized Timeout System initialized');
  }

  /**
   * Setup optimized timeout and retry configurations
   */
  private setupOptimizedConfigurations(): void {
    // Update timeout manager with optimized values
    Object.entries(OPTIMIZED_TIMEOUTS).forEach(([operation, timeout]) => {
      if (operation in STANDARD_TIMEOUTS) {
        this.timeoutManager.updateTimeoutConfig(operation as TimeoutType, {
          duration: timeout,
          retryOnTimeout: true,
          maxRetries: this.getOptimalRetryCount(operation),
          backoffStrategy: 'adaptive' as any,
          baseDelay: this.getOptimalBaseDelay(operation),
          warningThreshold: 0.75
        });
      }
    });

    // Setup retry configurations for different operation types
    this.setupRetryConfigurations();
    
    // Setup connection pool configurations
    this.setupConnectionPools();
    
    // Setup circuit breakers
    this.setupCircuitBreakers();
  }

  /**
   * Setup intelligent retry configurations
   */
  private setupRetryConfigurations(): void {
    const configs: Record<string, OptimizedRetryConfig> = {
      'health_check': {
        maxRetries: 2,
        baseDelayMs: 1500,
        backoffStrategy: 'linear',
        jitterFactor: 0.1,
        circuitBreakerEnabled: false,
        priorityBoost: true
      },
      'backend_request': {
        maxRetries: 3,
        baseDelayMs: 3000,
        backoffStrategy: 'adaptive',
        jitterFactor: 0.2,
        circuitBreakerEnabled: true,
        priorityBoost: false
      },
      'mcp_operation': {
        maxRetries: 2,
        baseDelayMs: 5000,
        backoffStrategy: 'exponential',
        jitterFactor: 0.15,
        circuitBreakerEnabled: true,
        priorityBoost: false
      },
      'api_call': {
        maxRetries: 3,
        baseDelayMs: 2000,
        backoffStrategy: 'adaptive',
        jitterFactor: 0.2,
        circuitBreakerEnabled: true,
        priorityBoost: false
      }
    };

    Object.entries(configs).forEach(([operation, config]) => {
      this.retryConfigs.set(operation, config);
    });
  }

  /**
   * Setup connection pools for different backends
   */
  private setupConnectionPools(): void {
    const poolConfig: ConnectionPoolConfig = {
      maxConcurrentPerBackend: 3,
      maxTotalConcurrent: 8,
      keepAlive: true,
      connectionTimeout: 15000,
      idleTimeout: 60000,
      retryDelay: 5000
    };

    ['openai', 'qwen', 'claude', 'ollama'].forEach(backend => {
      this.connectionPools.set(backend, {
        ...poolConfig,
        backend,
        activeConnections: 0,
        queuedRequests: [],
        lastActivity: Date.now()
      });
    });
  }

  /**
   * Setup circuit breakers for reliability
   */
  private setupCircuitBreakers(): void {
    ['openai', 'qwen', 'claude', 'ollama', 'mcp'].forEach(component => {
      this.circuitBreakers.set(component, {
        state: 'closed', // closed, open, half-open
        failureCount: 0,
        failureThreshold: 3,
        recoveryTimeMs: 30000,
        lastFailureTime: 0,
        halfOpenMaxCalls: 1,
        halfOpenCalls: 0
      });
    });
  }

  /**
   * Execute operation with optimized timeout and retry logic
   */
  async executeWithOptimizedTimeout<T>(
    operationType: string,
    component: string,
    operation: () => Promise<T>,
    priority: 'high' | 'medium' | 'low' = 'medium',
    metadata: Record<string, any> = {}
  ): Promise<T> {
    const operationId = this.generateOperationId(operationType, component);
    const context: OptimizedTimeoutContext = {
      operationId,
      operationType,
      component,
      priority,
      retryCount: 0,
      startTime: Date.now(),
      metadata
    };

    this.activeOperations.set(operationId, context);

    try {
      // Check circuit breaker
      if (!this.canExecuteOperation(component)) {
        throw new Error(`Circuit breaker open for ${component}`);
      }

      // Acquire connection from pool
      await this.acquireConnection(component, priority);

      const result = await this.executeWithRetry(context, operation);
      
      // Record success
      this.recordOperationSuccess(component, Date.now() - context.startTime);
      
      return result;
    } catch (error) {
      // Record failure
      this.recordOperationFailure(component, error as Error);
      throw error;
    } finally {
      // Release connection
      this.releaseConnection(component);
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * Execute operation with intelligent retry logic
   */
  private async executeWithRetry<T>(
    context: OptimizedTimeoutContext,
    operation: () => Promise<T>
  ): Promise<T> {
    const retryConfig = this.getRetryConfig(context.operationType);
    let lastError: Error;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      context.retryCount = attempt;

      try {
        // Calculate timeout for this attempt
        const timeoutMs = this.calculateTimeoutForAttempt(context, attempt);
        
        // Execute with timeout
        const result = await this.executeWithTimeout(operation, timeoutMs, context);
        
        // Success - update metrics and return
        this.updatePerformanceMetrics(context, attempt, true);
        return result;

      } catch (error) {
        lastError = error as Error;
        
        // Update metrics
        this.updatePerformanceMetrics(context, attempt, false, lastError);

        // Check if we should retry
        if (attempt < retryConfig.maxRetries && this.shouldRetry(lastError, context)) {
          const delay = this.calculateRetryDelay(retryConfig, attempt);
          
          console.warn(`[OptimizedTimeout] ${context.operationType} attempt ${attempt + 1} failed, retrying in ${delay}ms: ${lastError.message}`);
          
          this.emit('retryAttempt', { context, attempt, delay, error: lastError.message });
          
          await this.sleep(delay);
          continue;
        }

        // No more retries or shouldn't retry
        break;
      }
    }

    // All attempts failed
    console.error(`[OptimizedTimeout] ${context.operationType} failed after ${retryConfig.maxRetries + 1} attempts: ${lastError!.message}`);
    
    this.emit('operationFailed', { 
      context, 
      totalAttempts: retryConfig.maxRetries + 1, 
      error: lastError!.message 
    });

    throw lastError!;
  }

  /**
   * Execute operation with timeout protection
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    context: OptimizedTimeoutContext
  ): Promise<T> {
    return new Promise<T>(async (resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        const elapsed = Date.now() - context.startTime;
        const error = new Error(`Operation ${context.operationType} in ${context.component} timed out after ${elapsed}ms (limit: ${timeoutMs}ms)`);
        
        this.emit('operationTimeout', { context, elapsed, limit: timeoutMs });
        reject(error);
      }, timeoutMs);

      try {
        const result = await operation();
        clearTimeout(timeoutHandle);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutHandle);
        reject(error);
      }
    });
  }

  /**
   * Calculate optimal timeout for current attempt
   */
  private calculateTimeoutForAttempt(context: OptimizedTimeoutContext, attempt: number): number {
    const baseTimeout = this.getBaseTimeout(context.operationType);
    
    // Increase timeout for retries (adaptive strategy)
    const multiplier = 1 + (attempt * 0.5); // 50% increase per retry
    const adaptiveTimeout = Math.round(baseTimeout * multiplier);
    
    // Apply priority boost for high priority operations
    const priorityMultiplier = context.priority === 'high' ? 1.5 : 
                              context.priority === 'low' ? 0.8 : 1.0;
    
    return Math.round(adaptiveTimeout * priorityMultiplier);
  }

  /**
   * Calculate retry delay with jitter and backoff
   */
  private calculateRetryDelay(config: OptimizedRetryConfig, attempt: number): number {
    let delay: number;

    switch (config.backoffStrategy) {
      case 'linear':
        delay = config.baseDelayMs * (attempt + 1);
        break;
      case 'exponential':
        delay = config.baseDelayMs * Math.pow(2, attempt);
        break;
      case 'adaptive':
        // Adaptive strategy: exponential with cap and jitter
        delay = Math.min(
          config.baseDelayMs * Math.pow(1.8, attempt),
          30000 // Cap at 30 seconds
        );
        break;
      default:
        delay = config.baseDelayMs;
    }

    // Add jitter to prevent thundering herd
    const jitter = delay * config.jitterFactor * (Math.random() - 0.5);
    return Math.max(1000, Math.round(delay + jitter)); // Minimum 1 second
  }

  /**
   * Determine if operation should be retried
   */
  private shouldRetry(error: Error, context: OptimizedTimeoutContext): boolean {
    const retryConfig = this.getRetryConfig(context.operationType);
    
    // Don't retry if circuit breaker is open
    if (!this.canExecuteOperation(context.component)) {
      return false;
    }

    // Check error type
    const errorMessage = error.message.toLowerCase();
    
    // Retry on timeout and connection errors
    if (errorMessage.includes('timeout') || 
        errorMessage.includes('connection') ||
        errorMessage.includes('network') ||
        errorMessage.includes('fetch failed')) {
      return true;
    }

    // Don't retry on client errors (4xx)
    if (errorMessage.includes('unauthorized') ||
        errorMessage.includes('forbidden') ||
        errorMessage.includes('bad request')) {
      return false;
    }

    // Retry on server errors (5xx) and other network issues
    return true;
  }

  /**
   * Connection pool management
   */
  private async acquireConnection(component: string, priority: 'high' | 'medium' | 'low'): Promise<void> {
    const pool = this.connectionPools.get(component);
    if (!pool) return;

    // Check if we can make a new connection
    if (pool.activeConnections >= pool.maxConcurrentPerBackend) {
      // Queue the request
      return new Promise((resolve, reject) => {
        const timeoutHandle = setTimeout(() => {
          reject(new Error(`Connection timeout for ${component}`));
        }, pool.connectionTimeout);

        pool.queuedRequests.push({
          resolve: () => {
            clearTimeout(timeoutHandle);
            resolve();
          },
          reject,
          priority,
          timestamp: Date.now()
        });

        // Sort queue by priority and timestamp
        pool.queuedRequests.sort((a: any, b: any) => {
          const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
          const priorityDiff = (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
          return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
        });
      });
    }

    pool.activeConnections++;
    pool.lastActivity = Date.now();
  }

  private releaseConnection(component: string): void {
    const pool = this.connectionPools.get(component);
    if (!pool) return;

    pool.activeConnections--;
    pool.lastActivity = Date.now();

    // Process queued requests
    if (pool.queuedRequests.length > 0) {
      const nextRequest = pool.queuedRequests.shift();
      if (nextRequest) {
        pool.activeConnections++;
        nextRequest.resolve();
      }
    }
  }

  /**
   * Circuit breaker logic
   */
  private canExecuteOperation(component: string): boolean {
    const breaker = this.circuitBreakers.get(component);
    if (!breaker) return true;

    const now = Date.now();

    switch (breaker.state) {
      case 'closed':
        return true;

      case 'open':
        // Check if recovery time has passed
        if (now - breaker.lastFailureTime >= breaker.recoveryTimeMs) {
          breaker.state = 'half-open';
          breaker.halfOpenCalls = 0;
          console.log(`[CircuitBreaker] ${component} transitioning to half-open`);
          return true;
        }
        return false;

      case 'half-open':
        return breaker.halfOpenCalls < breaker.halfOpenMaxCalls;

      default:
        return true;
    }
  }

  private recordOperationSuccess(component: string, duration: number): void {
    const breaker = this.circuitBreakers.get(component);
    if (!breaker) return;

    if (breaker.state === 'half-open') {
      breaker.state = 'closed';
      breaker.failureCount = 0;
      console.log(`[CircuitBreaker] ${component} recovered to closed state`);
    } else if (breaker.state === 'closed') {
      breaker.failureCount = Math.max(0, breaker.failureCount - 1);
    }

    this.updatePerformanceMetrics(component, duration, true);
  }

  private recordOperationFailure(component: string, error: Error): void {
    const breaker = this.circuitBreakers.get(component);
    if (!breaker) return;

    breaker.failureCount++;
    breaker.lastFailureTime = Date.now();

    if (breaker.state === 'half-open') {
      breaker.state = 'open';
      console.warn(`[CircuitBreaker] ${component} back to open state after half-open failure`);
    } else if (breaker.state === 'closed' && breaker.failureCount >= breaker.failureThreshold) {
      breaker.state = 'open';
      console.warn(`[CircuitBreaker] ${component} opened due to ${breaker.failureCount} failures`);
    }

    this.updatePerformanceMetrics(component, 0, false, error);
  }

  /**
   * Performance metrics tracking
   */
  private updatePerformanceMetrics(
    componentOrContext: string | OptimizedTimeoutContext, 
    durationOrAttempt: number, 
    success: boolean, 
    error?: Error
  ): void {
    let component: string;
    let duration: number;

    if (typeof componentOrContext === 'string') {
      component = componentOrContext;
      duration = durationOrAttempt;
    } else {
      component = componentOrContext.component;
      duration = Date.now() - componentOrContext.startTime;
    }

    if (!this.performanceMetrics.has(component)) {
      this.performanceMetrics.set(component, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalDuration: 0,
        avgDuration: 0,
        lastActivity: Date.now(),
        recentErrors: []
      });
    }

    const metrics = this.performanceMetrics.get(component);
    metrics.totalRequests++;
    metrics.lastActivity = Date.now();

    if (success) {
      metrics.successfulRequests++;
      metrics.totalDuration += duration;
      metrics.avgDuration = metrics.totalDuration / metrics.successfulRequests;
    } else {
      metrics.failedRequests++;
      if (error) {
        metrics.recentErrors.push({
          timestamp: Date.now(),
          message: error.message,
          duration
        });
        // Keep only last 10 errors
        if (metrics.recentErrors.length > 10) {
          metrics.recentErrors.shift();
        }
      }
    }
  }

  /**
   * Utility methods
   */
  private getRetryConfig(operationType: string): OptimizedRetryConfig {
    // Map operation types to retry configurations
    if (operationType.includes('health')) return this.retryConfigs.get('health_check')!;
    if (operationType.includes('backend') || operationType.includes('api')) return this.retryConfigs.get('backend_request')!;
    if (operationType.includes('mcp')) return this.retryConfigs.get('mcp_operation')!;
    return this.retryConfigs.get('api_call')!;
  }

  private getBaseTimeout(operationType: string): number {
    // Map operation types to base timeouts
    const timeoutMap: Record<string, number> = {
      'health_check': OPTIMIZED_TIMEOUTS.BACKEND_HEALTH_CHECK,
      'backend_request': OPTIMIZED_TIMEOUTS.BACKEND_REQUEST,
      'mcp_request': OPTIMIZED_TIMEOUTS.MCP_REQUEST,
      'api_call': OPTIMIZED_TIMEOUTS.API_CALL_SIMPLE,
      'mcp_server_start': OPTIMIZED_TIMEOUTS.MCP_SERVER_START,
    };

    return timeoutMap[operationType] || OPTIMIZED_TIMEOUTS.API_CALL_SIMPLE;
  }

  private getOptimalRetryCount(operation: string): number {
    if (operation.includes('health')) return 2;
    if (operation.includes('mcp')) return 2;
    return 3;
  }

  private getOptimalBaseDelay(operation: string): number {
    if (operation.includes('health')) return 1500;
    if (operation.includes('mcp')) return 5000;
    return 3000;
  }

  private generateOperationId(operationType: string, component: string): string {
    return `opt_${component}_${operationType}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private setupEventHandlers(): void {
    this.on('operationTimeout', (event) => {
      console.warn(`[OptimizedTimeout] Operation timeout: ${event.context.operationType} in ${event.context.component} (${event.elapsed}ms)`);
    });

    this.on('retryAttempt', (event) => {
      console.log(`[OptimizedTimeout] Retry attempt ${event.attempt + 1} for ${event.context.operationType} in ${event.delay}ms`);
    });

    this.on('operationFailed', (event) => {
      console.error(`[OptimizedTimeout] Operation failed after ${event.totalAttempts} attempts: ${event.context.operationType}`);
    });
  }

  /**
   * Get system status and metrics
   */
  getSystemStatus(): {
    activeOperations: number;
    circuitBreakerStates: Record<string, string>;
    connectionPoolStatus: Record<string, any>;
    performanceMetrics: Record<string, any>;
  } {
    const circuitBreakerStates: Record<string, string> = {};
    this.circuitBreakers.forEach((breaker, component) => {
      circuitBreakerStates[component] = breaker.state;
    });

    const connectionPoolStatus: Record<string, any> = {};
    this.connectionPools.forEach((pool, component) => {
      connectionPoolStatus[component] = {
        activeConnections: pool.activeConnections,
        queuedRequests: pool.queuedRequests.length,
        lastActivity: pool.lastActivity
      };
    });

    const performanceMetrics: Record<string, any> = {};
    this.performanceMetrics.forEach((metrics, component) => {
      performanceMetrics[component] = {
        totalRequests: metrics.totalRequests,
        successRate: metrics.totalRequests > 0 ? metrics.successfulRequests / metrics.totalRequests : 0,
        avgDuration: metrics.avgDuration,
        recentErrorCount: metrics.recentErrors.length
      };
    });

    return {
      activeOperations: this.activeOperations.size,
      circuitBreakerStates,
      connectionPoolStatus,
      performanceMetrics
    };
  }

  /**
   * Force reset a circuit breaker
   */
  resetCircuitBreaker(component: string): void {
    const breaker = this.circuitBreakers.get(component);
    if (breaker) {
      breaker.state = 'closed';
      breaker.failureCount = 0;
      breaker.halfOpenCalls = 0;
      console.log(`[CircuitBreaker] ${component} manually reset to closed state`);
    }
  }
}

// Export singleton instance and convenience functions
export const optimizedTimeoutSystem = OptimizedTimeoutSystem.getInstance();

/**
 * Convenience function for executing operations with optimized timeout handling
 */
export async function withOptimizedTimeout<T>(
  operationType: string,
  component: string,
  operation: () => Promise<T>,
  priority: 'high' | 'medium' | 'low' = 'medium',
  metadata: Record<string, any> = {}
): Promise<T> {
  return optimizedTimeoutSystem.executeWithOptimizedTimeout(
    operationType,
    component,
    operation,
    priority,
    metadata
  );
}