// Health Monitor with Circuit Breaker Pattern
// Advanced health monitoring and circuit breaker implementation for MCP multiplexing

import { EventEmitter } from 'events';
import { MCPServerInstance } from './mcp-server-pool-manager';
import { PerformanceAnalytics } from '../../analytics/performance/performance-analytics';

export enum CircuitBreakerState {
  CLOSED = 'closed',           // Normal operation
  OPEN = 'open',              // Circuit is open, requests fail fast
  HALF_OPEN = 'half-open'     // Testing if service is recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening
  timeoutMs: number;            // Request timeout in milliseconds
  recoveryTimeMs: number;       // Time before attempting half-open
  successThreshold: number;     // Successes needed in half-open to close
  monitoringWindow: number;     // Time window for failure counting (ms)
  healthCheckInterval: number;  // Interval for health checks (ms)
}

export interface HealthCheckResult {
  serverId: string;
  timestamp: number;
  success: boolean;
  responseTime: number;
  error?: string;
  metrics: {
    memoryUsage?: number;
    cpuUsage?: number;
    diskUsage?: number;
    connectionCount?: number;
    queueSize?: number;
  };
}

export interface CircuitBreakerMetrics {
  serverId: string;
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  totalRequests: number;
  errorRate: number;
  avgResponseTime: number;
  stateTransitions: Array<{
    from: CircuitBreakerState;
    to: CircuitBreakerState;
    timestamp: number;
    reason: string;
  }>;
}

export interface HealthDashboard {
  overall: {
    totalServers: number;
    healthyServers: number;
    degradedServers: number;
    unhealthyServers: number;
    circuitBreakersClosed: number;
    circuitBreakersOpen: number;
    circuitBreakersHalfOpen: number;
  };
  servers: Map<string, {
    health: HealthCheckResult;
    circuitBreaker: CircuitBreakerMetrics;
    trends: {
      responseTime: number[];
      errorRate: number[];
      throughput: number[];
    };
    alerts: Array<{
      level: 'info' | 'warning' | 'error' | 'critical';
      message: string;
      timestamp: number;
    }>;
  }>;
  systemHealth: 'healthy' | 'degraded' | 'critical';
}

export class HealthMonitor extends EventEmitter {
  private config: CircuitBreakerConfig;
  private analytics: PerformanceAnalytics;
  private circuitBreakers: Map<string, CircuitBreakerMetrics> = new Map();
  private healthHistory: Map<string, HealthCheckResult[]> = new Map();
  private monitoringTimer?: NodeJS.Timeout;
  private isShutdown: boolean = false;
  
  constructor(
    config: Partial<CircuitBreakerConfig> = {},
    analytics: PerformanceAnalytics
  ) {
    super();
    
    this.config = {
      failureThreshold: 5,          // 5 failures to open circuit
      timeoutMs: 10000,            // 10 second timeout
      recoveryTimeMs: 60000,       // 1 minute recovery time
      successThreshold: 3,         // 3 successes to close circuit
      monitoringWindow: 300000,    // 5 minute window
      healthCheckInterval: 10000,  // 10 second intervals
      ...config
    };
    
    this.analytics = analytics;
    
    console.log('❤️ Health Monitor with Circuit Breaker initialized');
    this.startMonitoring();
  }

  /**
   * Register a server for health monitoring
   */
  registerServer(server: MCPServerInstance): void {
    console.log(`📋 Registering server for health monitoring: ${server.id}`);
    
    // Initialize circuit breaker metrics
    const metrics: CircuitBreakerMetrics = {
      serverId: server.id,
      state: CircuitBreakerState.CLOSED,
      failureCount: 0,
      successCount: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      totalRequests: 0,
      errorRate: 0,
      avgResponseTime: 0,
      stateTransitions: []
    };
    
    this.circuitBreakers.set(server.id, metrics);
    this.healthHistory.set(server.id, []);
    
    this.emit('serverRegistered', server.id);
  }

  /**
   * Unregister a server from health monitoring
   */
  unregisterServer(serverId: string): void {
    console.log(`🗑️ Unregistering server from health monitoring: ${serverId}`);
    
    this.circuitBreakers.delete(serverId);
    this.healthHistory.delete(serverId);
    
    this.emit('serverUnregistered', serverId);
  }

  /**
   * Check if a request can be executed (circuit breaker check)
   */
  canExecuteRequest(serverId: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(serverId);
    if (!circuitBreaker) return false;

    switch (circuitBreaker.state) {
      case CircuitBreakerState.CLOSED:
        return true;
        
      case CircuitBreakerState.OPEN:
        // Check if recovery time has passed
        const now = Date.now();
        if (now - circuitBreaker.lastFailureTime >= this.config.recoveryTimeMs) {
          this.transitionToHalfOpen(serverId);
          return true;
        }
        return false;
        
      case CircuitBreakerState.HALF_OPEN:
        return true;
        
      default:
        return false;
    }
  }

  /**
   * Record request execution result
   */
  recordRequestResult(serverId: string, success: boolean, responseTime: number, error?: string): void {
    const circuitBreaker = this.circuitBreakers.get(serverId);
    if (!circuitBreaker) return;

    circuitBreaker.totalRequests++;
    
    if (success) {
      this.handleRequestSuccess(serverId, responseTime);
    } else {
      this.handleRequestFailure(serverId, error);
    }
    
    this.updateCircuitBreakerMetrics(serverId);
    this.checkCircuitBreakerState(serverId);
  }

  /**
   * Perform comprehensive health check on a server
   */
  async performHealthCheck(server: MCPServerInstance): Promise<HealthCheckResult> {
    const startTime = Date.now();
    let result: HealthCheckResult;
    
    try {
      console.log(`🔍 Performing health check on ${server.id}`);
      
      // Basic connectivity check
      const pingResult = await this.performPingCheck(server);
      
      // Advanced health metrics check
      const metricsResult = await this.collectHealthMetrics(server);
      
      const responseTime = Date.now() - startTime;
      
      result = {
        serverId: server.id,
        timestamp: Date.now(),
        success: pingResult.success,
        responseTime,
        error: pingResult.error,
        metrics: metricsResult
      };
      
      if (result.success) {
        this.recordRequestResult(server.id, true, responseTime);
      } else {
        this.recordRequestResult(server.id, false, responseTime, result.error);
      }
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      result = {
        serverId: server.id,
        timestamp: Date.now(),
        success: false,
        responseTime,
        error: (error as Error).message,
        metrics: {}
      };
      
      this.recordRequestResult(server.id, false, responseTime, result.error);
    }
    
    // Store health check result
    const history = this.healthHistory.get(server.id) || [];
    history.push(result);
    
    // Keep only recent history (last 100 checks)
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    this.healthHistory.set(server.id, history);
    
    // Emit health check result
    this.emit('healthCheckComplete', result);
    
    // Record analytics
    this.analytics.recordSystemMetrics({
      memoryUsage: result.metrics.memoryUsage,
      cpuUsage: result.metrics.cpuUsage,
      activeConnections: result.metrics.connectionCount
    });
    
    return result;
  }

  /**
   * Get health dashboard data
   */
  getHealthDashboard(): HealthDashboard {
    const dashboard: HealthDashboard = {
      overall: {
        totalServers: this.circuitBreakers.size,
        healthyServers: 0,
        degradedServers: 0,
        unhealthyServers: 0,
        circuitBreakersClosed: 0,
        circuitBreakersOpen: 0,
        circuitBreakersHalfOpen: 0
      },
      servers: new Map(),
      systemHealth: 'healthy'
    };
    
    for (const [serverId, circuitBreaker] of this.circuitBreakers.entries()) {
      const history = this.healthHistory.get(serverId) || [];
      const latestHealth = history[history.length - 1];
      
      if (latestHealth) {
        // Categorize server health
        if (circuitBreaker.state === CircuitBreakerState.CLOSED && circuitBreaker.errorRate < 0.05) {
          dashboard.overall.healthyServers++;
        } else if (circuitBreaker.state === CircuitBreakerState.OPEN) {
          dashboard.overall.unhealthyServers++;
        } else {
          dashboard.overall.degradedServers++;
        }
        
        // Count circuit breaker states
        switch (circuitBreaker.state) {
          case CircuitBreakerState.CLOSED:
            dashboard.overall.circuitBreakersClosed++;
            break;
          case CircuitBreakerState.OPEN:
            dashboard.overall.circuitBreakersOpen++;
            break;
          case CircuitBreakerState.HALF_OPEN:
            dashboard.overall.circuitBreakersHalfOpen++;
            break;
        }
        
        // Generate trends
        const recentHistory = history.slice(-20); // Last 20 checks
        const trends = {
          responseTime: recentHistory.map(h => h.responseTime),
          errorRate: this.calculateErrorRateTimeline(recentHistory),
          throughput: this.calculateThroughputTimeline(recentHistory)
        };
        
        // Generate alerts
        const alerts = this.generateServerAlerts(circuitBreaker, latestHealth);
        
        dashboard.servers.set(serverId, {
          health: latestHealth,
          circuitBreaker,
          trends,
          alerts
        });
      }
    }
    
    // Determine overall system health
    const unhealthyRatio = dashboard.overall.unhealthyServers / dashboard.overall.totalServers;
    const degradedRatio = dashboard.overall.degradedServers / dashboard.overall.totalServers;
    
    if (unhealthyRatio > 0.5 || dashboard.overall.totalServers === 0) {
      dashboard.systemHealth = 'critical';
    } else if (unhealthyRatio > 0.2 || degradedRatio > 0.3) {
      dashboard.systemHealth = 'degraded';
    }
    
    return dashboard;
  }

  /**
   * Get circuit breaker metrics for a specific server
   */
  getCircuitBreakerMetrics(serverId: string): CircuitBreakerMetrics | null {
    return this.circuitBreakers.get(serverId) || null;
  }

  /**
   * Force circuit breaker state change (for testing/emergency)
   */
  forceCircuitBreakerState(serverId: string, state: CircuitBreakerState, reason: string = 'Manual override'): void {
    const circuitBreaker = this.circuitBreakers.get(serverId);
    if (!circuitBreaker) return;
    
    const oldState = circuitBreaker.state;
    circuitBreaker.state = state;
    
    circuitBreaker.stateTransitions.push({
      from: oldState,
      to: state,
      timestamp: Date.now(),
      reason
    });
    
    console.log(`🔄 Forced circuit breaker state change for ${serverId}: ${oldState} → ${state} (${reason})`);
    this.emit('circuitBreakerStateChanged', { serverId, from: oldState, to: state, reason });
  }

  /**
   * Reset circuit breaker metrics
   */
  resetCircuitBreaker(serverId: string): void {
    const circuitBreaker = this.circuitBreakers.get(serverId);
    if (!circuitBreaker) return;
    
    const oldState = circuitBreaker.state;
    
    Object.assign(circuitBreaker, {
      state: CircuitBreakerState.CLOSED,
      failureCount: 0,
      successCount: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      errorRate: 0
    });
    
    circuitBreaker.stateTransitions.push({
      from: oldState,
      to: CircuitBreakerState.CLOSED,
      timestamp: Date.now(),
      reason: 'Manual reset'
    });
    
    console.log(`🔄 Reset circuit breaker for ${serverId}`);
    this.emit('circuitBreakerReset', serverId);
  }

  /**
   * Shutdown health monitoring
   */
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down Health Monitor');
    this.isShutdown = true;
    
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
    
    this.circuitBreakers.clear();
    this.healthHistory.clear();
    
    console.log('✅ Health Monitor shutdown completed');
    this.emit('shutdown');
  }

  // Private methods
  private startMonitoring(): void {
    this.monitoringTimer = setInterval(async () => {
      if (this.isShutdown) return;
      
      // Clean up old health history
      this.cleanupOldHistory();
      
      // Update circuit breaker metrics
      this.updateAllCircuitBreakerMetrics();
      
      // Emit dashboard update
      const dashboard = this.getHealthDashboard();
      this.emit('dashboardUpdated', dashboard);
      
    }, this.config.healthCheckInterval);
    
    console.log('📊 Health monitoring started');
  }

  private async performPingCheck(server: MCPServerInstance): Promise<{ success: boolean; error?: string }> {
    try {
      if (!server.connection) {
        return { success: false, error: 'No connection available' };
      }
      
      // Send ping request
      const pingRequest = {
        method: 'ping',
        params: {},
        id: 'health_ping'
      };
      
      const response = await this.sendRequestWithTimeout(server, pingRequest, this.config.timeoutMs);
      
      if (response && response.result === 'pong') {
        return { success: true };
      } else {
        return { success: false, error: 'Invalid ping response' };
      }
      
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private async collectHealthMetrics(server: MCPServerInstance): Promise<any> {
    try {
      // Send metrics request
      const metricsRequest = {
        method: 'system/metrics',
        params: {},
        id: 'health_metrics'
      };
      
      const response = await this.sendRequestWithTimeout(server, metricsRequest, 5000);
      
      return response?.result || {};
      
    } catch (error) {
      // Return empty metrics if collection fails
      return {};
    }
  }

  private async sendRequestWithTimeout(server: MCPServerInstance, request: any, timeout: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Health check timeout'));
      }, timeout);

      try {
        const requestData = JSON.stringify(request) + '\n';
        server.connection.write(requestData);

        const responseHandler = (data: Buffer) => {
          try {
            const response = JSON.parse(data.toString());
            clearTimeout(timeoutId);
            server.connection.removeListener('data', responseHandler);

            if (response.error) {
              reject(new Error(response.error.message));
            } else {
              resolve(response);
            }
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        };

        server.connection.on('data', responseHandler);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  private handleRequestSuccess(serverId: string, responseTime: number): void {
    const circuitBreaker = this.circuitBreakers.get(serverId);
    if (!circuitBreaker) return;

    circuitBreaker.successCount++;
    circuitBreaker.consecutiveSuccesses++;
    circuitBreaker.consecutiveFailures = 0;
    circuitBreaker.lastSuccessTime = Date.now();

    // Update average response time
    const alpha = 0.1;
    circuitBreaker.avgResponseTime = circuitBreaker.avgResponseTime === 0
      ? responseTime
      : alpha * responseTime + (1 - alpha) * circuitBreaker.avgResponseTime;
  }

  private handleRequestFailure(serverId: string, error?: string): void {
    const circuitBreaker = this.circuitBreakers.get(serverId);
    if (!circuitBreaker) return;

    circuitBreaker.failureCount++;
    circuitBreaker.consecutiveFailures++;
    circuitBreaker.consecutiveSuccesses = 0;
    circuitBreaker.lastFailureTime = Date.now();

    console.warn(`⚠️ Request failure recorded for ${serverId}: ${error || 'Unknown error'}`);
  }

  private updateCircuitBreakerMetrics(serverId: string): void {
    const circuitBreaker = this.circuitBreakers.get(serverId);
    if (!circuitBreaker || circuitBreaker.totalRequests === 0) return;

    // Calculate error rate over monitoring window
    const now = Date.now();
    const windowStart = now - this.config.monitoringWindow;
    const history = this.healthHistory.get(serverId) || [];
    
    const recentHistory = history.filter(h => h.timestamp >= windowStart);
    const failures = recentHistory.filter(h => !h.success).length;
    
    circuitBreaker.errorRate = recentHistory.length > 0 ? failures / recentHistory.length : 0;
  }

  private checkCircuitBreakerState(serverId: string): void {
    const circuitBreaker = this.circuitBreakers.get(serverId);
    if (!circuitBreaker) return;

    const oldState = circuitBreaker.state;
    let newState = oldState;
    let reason = '';

    switch (circuitBreaker.state) {
      case CircuitBreakerState.CLOSED:
        // Check if we should open the circuit
        if (circuitBreaker.consecutiveFailures >= this.config.failureThreshold ||
            circuitBreaker.errorRate > 0.5) {
          newState = CircuitBreakerState.OPEN;
          reason = `Failure threshold exceeded (${circuitBreaker.consecutiveFailures} consecutive failures)`;
        }
        break;

      case CircuitBreakerState.HALF_OPEN:
        // Check if we should close or open the circuit
        if (circuitBreaker.consecutiveSuccesses >= this.config.successThreshold) {
          newState = CircuitBreakerState.CLOSED;
          reason = `Recovery successful (${circuitBreaker.consecutiveSuccesses} consecutive successes)`;
        } else if (circuitBreaker.consecutiveFailures > 0) {
          newState = CircuitBreakerState.OPEN;
          reason = 'Failed during recovery attempt';
        }
        break;

      case CircuitBreakerState.OPEN:
        // State transitions for OPEN are handled in canExecuteRequest
        break;
    }

    if (newState !== oldState) {
      circuitBreaker.state = newState;
      
      circuitBreaker.stateTransitions.push({
        from: oldState,
        to: newState,
        timestamp: Date.now(),
        reason
      });

      console.log(`🔄 Circuit breaker state changed for ${serverId}: ${oldState} → ${newState} (${reason})`);
      this.emit('circuitBreakerStateChanged', { serverId, from: oldState, to: newState, reason });

      // Reset counters on state transition
      if (newState === CircuitBreakerState.CLOSED) {
        circuitBreaker.consecutiveFailures = 0;
        circuitBreaker.consecutiveSuccesses = 0;
      }
    }
  }

  private transitionToHalfOpen(serverId: string): void {
    const circuitBreaker = this.circuitBreakers.get(serverId);
    if (!circuitBreaker) return;

    const oldState = circuitBreaker.state;
    circuitBreaker.state = CircuitBreakerState.HALF_OPEN;
    circuitBreaker.consecutiveSuccesses = 0;
    circuitBreaker.consecutiveFailures = 0;

    circuitBreaker.stateTransitions.push({
      from: oldState,
      to: CircuitBreakerState.HALF_OPEN,
      timestamp: Date.now(),
      reason: 'Recovery timeout elapsed'
    });

    console.log(`🔄 Circuit breaker transitioned to HALF_OPEN for ${serverId}`);
    this.emit('circuitBreakerStateChanged', {
      serverId,
      from: oldState,
      to: CircuitBreakerState.HALF_OPEN,
      reason: 'Recovery timeout elapsed'
    });
  }

  private updateAllCircuitBreakerMetrics(): void {
    for (const serverId of this.circuitBreakers.keys()) {
      this.updateCircuitBreakerMetrics(serverId);
    }
  }

  private cleanupOldHistory(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    
    for (const [serverId, history] of this.healthHistory.entries()) {
      const filteredHistory = history.filter(h => h.timestamp > cutoffTime);
      this.healthHistory.set(serverId, filteredHistory);
    }
  }

  private calculateErrorRateTimeline(history: HealthCheckResult[]): number[] {
    return history.map((_, index) => {
      const recentResults = history.slice(Math.max(0, index - 4), index + 1);
      const failures = recentResults.filter(r => !r.success).length;
      return recentResults.length > 0 ? failures / recentResults.length : 0;
    });
  }

  private calculateThroughputTimeline(history: HealthCheckResult[]): number[] {
    return history.map((result, index) => {
      // Simplified throughput calculation based on response time
      return result.responseTime > 0 ? 1000 / result.responseTime : 0;
    });
  }

  private generateServerAlerts(circuitBreaker: CircuitBreakerMetrics, latestHealth: HealthCheckResult): Array<any> {
    const alerts: Array<any> = [];
    const now = Date.now();

    // Circuit breaker state alerts
    if (circuitBreaker.state === CircuitBreakerState.OPEN) {
      alerts.push({
        level: 'error',
        message: 'Circuit breaker is OPEN - requests will fail fast',
        timestamp: now
      });
    } else if (circuitBreaker.state === CircuitBreakerState.HALF_OPEN) {
      alerts.push({
        level: 'warning',
        message: 'Circuit breaker is HALF_OPEN - testing recovery',
        timestamp: now
      });
    }

    // High error rate alert
    if (circuitBreaker.errorRate > 0.1) {
      alerts.push({
        level: circuitBreaker.errorRate > 0.3 ? 'error' : 'warning',
        message: `High error rate: ${(circuitBreaker.errorRate * 100).toFixed(1)}%`,
        timestamp: now
      });
    }

    // High response time alert
    if (circuitBreaker.avgResponseTime > 10000) {
      alerts.push({
        level: circuitBreaker.avgResponseTime > 30000 ? 'error' : 'warning',
        message: `High average response time: ${circuitBreaker.avgResponseTime.toFixed(0)}ms`,
        timestamp: now
      });
    }

    // Health check failure alert
    if (!latestHealth.success) {
      alerts.push({
        level: 'error',
        message: `Health check failed: ${latestHealth.error}`,
        timestamp: latestHealth.timestamp
      });
    }

    return alerts;
  }
}