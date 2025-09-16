/**
 * Comprehensive Metrics System for Claudette
 * Provides detailed system metrics with Prometheus export capabilities
 */

export interface BusinessMetrics {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_response_time: number;
  tokens_processed: number;
  cost_total: number;
  cost_by_backend: Record<string, number>;
  requests_by_backend: Record<string, number>;
  user_sessions: number;
  cache_hit_rate: number;
}

export interface SecurityMetrics {
  authentication_attempts: number;
  authentication_failures: number;
  rate_limit_violations: number;
  api_key_rotations: number;
  suspicious_requests: number;
  blocked_requests: number;
  security_violations: Array<{
    type: string;
    timestamp: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
}

export interface PerformanceMetrics {
  initialization_time: number;
  memory_usage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  cpu_usage: number;
  connection_pool_stats: {
    active_connections: number;
    idle_connections: number;
    connection_reuse_rate: number;
  };
  circuit_breaker_stats: Record<string, {
    state: string;
    failure_count: number;
    success_rate: number;
  }>;
}

export interface OperationalMetrics {
  uptime: number;
  restart_count: number;
  error_rate: number;
  availability: number;
  backend_health: Record<string, {
    healthy: boolean;
    last_check: number;
    response_time: number;
  }>;
  alert_count: number;
  maintenance_windows: number;
}

export interface ComprehensiveMetrics {
  timestamp: number;
  business: BusinessMetrics;
  security: SecurityMetrics;
  performance: PerformanceMetrics;
  operational: OperationalMetrics;
}

export class MetricsCollector {
  private metrics: ComprehensiveMetrics;
  private startTime: number = Date.now();
  private restartCount: number = 0;
  private collectionInterval: NodeJS.Timeout | null = null;
  private listeners: Array<(metrics: ComprehensiveMetrics) => void> = [];

  constructor() {
    this.metrics = this.initializeMetrics();
    this.startCollection();
  }

  /**
   * Initialize metrics with default values
   */
  private initializeMetrics(): ComprehensiveMetrics {
    return {
      timestamp: Date.now(),
      business: {
        total_requests: 0,
        successful_requests: 0,
        failed_requests: 0,
        average_response_time: 0,
        tokens_processed: 0,
        cost_total: 0,
        cost_by_backend: {},
        requests_by_backend: {},
        user_sessions: 0,
        cache_hit_rate: 0
      },
      security: {
        authentication_attempts: 0,
        authentication_failures: 0,
        rate_limit_violations: 0,
        api_key_rotations: 0,
        suspicious_requests: 0,
        blocked_requests: 0,
        security_violations: []
      },
      performance: {
        initialization_time: 0,
        memory_usage: {
          heapUsed: 0,
          heapTotal: 0,
          external: 0,
          rss: 0
        },
        cpu_usage: 0,
        connection_pool_stats: {
          active_connections: 0,
          idle_connections: 0,
          connection_reuse_rate: 0
        },
        circuit_breaker_stats: {}
      },
      operational: {
        uptime: 0,
        restart_count: 0,
        error_rate: 0,
        availability: 100,
        backend_health: {},
        alert_count: 0,
        maintenance_windows: 0
      }
    };
  }

  /**
   * Record a business request
   */
  recordRequest(
    backend: string,
    success: boolean,
    responseTime: number,
    tokens?: { input: number; output: number },
    cost?: number
  ): void {
    this.metrics.business.total_requests++;
    
    if (success) {
      this.metrics.business.successful_requests++;
    } else {
      this.metrics.business.failed_requests++;
    }

    // Update average response time
    const totalTime = this.metrics.business.average_response_time * (this.metrics.business.total_requests - 1) + responseTime;
    this.metrics.business.average_response_time = totalTime / this.metrics.business.total_requests;

    // Update backend-specific metrics
    if (!this.metrics.business.requests_by_backend[backend]) {
      this.metrics.business.requests_by_backend[backend] = 0;
      this.metrics.business.cost_by_backend[backend] = 0;
    }
    this.metrics.business.requests_by_backend[backend]++;

    // Update tokens and cost
    if (tokens) {
      this.metrics.business.tokens_processed += tokens.input + tokens.output;
    }
    if (cost) {
      this.metrics.business.cost_total += cost;
      this.metrics.business.cost_by_backend[backend] += cost;
    }
  }

  /**
   * Record security event
   */
  recordSecurityEvent(
    type: 'auth_attempt' | 'auth_failure' | 'rate_limit' | 'api_rotation' | 'suspicious' | 'blocked' | 'violation',
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    details?: any
  ): void {
    const timestamp = Date.now();

    switch (type) {
      case 'auth_attempt':
        this.metrics.security.authentication_attempts++;
        break;
      case 'auth_failure':
        this.metrics.security.authentication_failures++;
        break;
      case 'rate_limit':
        this.metrics.security.rate_limit_violations++;
        break;
      case 'api_rotation':
        this.metrics.security.api_key_rotations++;
        break;
      case 'suspicious':
        this.metrics.security.suspicious_requests++;
        break;
      case 'blocked':
        this.metrics.security.blocked_requests++;
        break;
      case 'violation':
        this.metrics.security.security_violations.push({
          type: details?.violationType || 'unknown',
          timestamp,
          severity
        });
        break;
    }
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(data: {
    initTime?: number;
    memoryUsage?: NodeJS.MemoryUsage;
    cpuUsage?: number;
    connectionPoolStats?: any;
    circuitBreakerStats?: any;
  }): void {
    if (data.initTime) {
      this.metrics.performance.initialization_time = data.initTime;
    }

    if (data.memoryUsage) {
      this.metrics.performance.memory_usage = {
        heapUsed: data.memoryUsage.heapUsed,
        heapTotal: data.memoryUsage.heapTotal,
        external: data.memoryUsage.external,
        rss: data.memoryUsage.rss
      };
    }

    if (data.cpuUsage !== undefined) {
      this.metrics.performance.cpu_usage = data.cpuUsage;
    }

    if (data.connectionPoolStats) {
      this.metrics.performance.connection_pool_stats = {
        active_connections: data.connectionPoolStats.activeConnections || 0,
        idle_connections: data.connectionPoolStats.idleConnections || 0,
        connection_reuse_rate: data.connectionPoolStats.connectionReuse || 0
      };
    }

    if (data.circuitBreakerStats) {
      this.metrics.performance.circuit_breaker_stats = data.circuitBreakerStats;
    }
  }

  /**
   * Update operational metrics
   */
  updateOperationalMetrics(data: {
    errorRate?: number;
    availability?: number;
    backendHealth?: Record<string, { healthy: boolean; responseTime: number }>;
    alertCount?: number;
    maintenanceWindows?: number;
  }): void {
    this.metrics.operational.uptime = Date.now() - this.startTime;
    this.metrics.operational.restart_count = this.restartCount;

    if (data.errorRate !== undefined) {
      this.metrics.operational.error_rate = data.errorRate;
    }

    if (data.availability !== undefined) {
      this.metrics.operational.availability = data.availability;
    }

    if (data.backendHealth) {
      for (const [backend, health] of Object.entries(data.backendHealth)) {
        this.metrics.operational.backend_health[backend] = {
          healthy: health.healthy,
          last_check: Date.now(),
          response_time: health.responseTime
        };
      }
    }

    if (data.alertCount !== undefined) {
      this.metrics.operational.alert_count = data.alertCount;
    }

    if (data.maintenanceWindows !== undefined) {
      this.metrics.operational.maintenance_windows = data.maintenanceWindows;
    }
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics(): ComprehensiveMetrics {
    this.metrics.timestamp = Date.now();
    return JSON.parse(JSON.stringify(this.metrics));
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const timestamp = Date.now();
    const lines: string[] = [];

    // Business metrics
    lines.push('# HELP claudette_requests_total Total number of requests');
    lines.push('# TYPE claudette_requests_total counter');
    lines.push(`claudette_requests_total ${this.metrics.business.total_requests} ${timestamp}`);

    lines.push('# HELP claudette_requests_successful Successful requests');
    lines.push('# TYPE claudette_requests_successful counter');
    lines.push(`claudette_requests_successful ${this.metrics.business.successful_requests} ${timestamp}`);

    lines.push('# HELP claudette_requests_failed Failed requests');
    lines.push('# TYPE claudette_requests_failed counter');
    lines.push(`claudette_requests_failed ${this.metrics.business.failed_requests} ${timestamp}`);

    lines.push('# HELP claudette_response_time_avg Average response time in milliseconds');
    lines.push('# TYPE claudette_response_time_avg gauge');
    lines.push(`claudette_response_time_avg ${this.metrics.business.average_response_time} ${timestamp}`);

    lines.push('# HELP claudette_tokens_processed Total tokens processed');
    lines.push('# TYPE claudette_tokens_processed counter');
    lines.push(`claudette_tokens_processed ${this.metrics.business.tokens_processed} ${timestamp}`);

    lines.push('# HELP claudette_cost_total Total cost in EUR');
    lines.push('# TYPE claudette_cost_total gauge');
    lines.push(`claudette_cost_total ${this.metrics.business.cost_total} ${timestamp}`);

    lines.push('# HELP claudette_cache_hit_rate Cache hit rate percentage');
    lines.push('# TYPE claudette_cache_hit_rate gauge');
    lines.push(`claudette_cache_hit_rate ${this.metrics.business.cache_hit_rate} ${timestamp}`);

    // Backend-specific metrics
    for (const [backend, requests] of Object.entries(this.metrics.business.requests_by_backend)) {
      lines.push(`claudette_requests_by_backend{backend="${backend}"} ${requests} ${timestamp}`);
    }

    for (const [backend, cost] of Object.entries(this.metrics.business.cost_by_backend)) {
      lines.push(`claudette_cost_by_backend{backend="${backend}"} ${cost} ${timestamp}`);
    }

    // Security metrics
    lines.push('# HELP claudette_security_auth_attempts Authentication attempts');
    lines.push('# TYPE claudette_security_auth_attempts counter');
    lines.push(`claudette_security_auth_attempts ${this.metrics.security.authentication_attempts} ${timestamp}`);

    lines.push('# HELP claudette_security_auth_failures Authentication failures');
    lines.push('# TYPE claudette_security_auth_failures counter');
    lines.push(`claudette_security_auth_failures ${this.metrics.security.authentication_failures} ${timestamp}`);

    lines.push('# HELP claudette_security_rate_limit_violations Rate limit violations');
    lines.push('# TYPE claudette_security_rate_limit_violations counter');
    lines.push(`claudette_security_rate_limit_violations ${this.metrics.security.rate_limit_violations} ${timestamp}`);

    lines.push('# HELP claudette_security_blocked_requests Blocked requests');
    lines.push('# TYPE claudette_security_blocked_requests counter');
    lines.push(`claudette_security_blocked_requests ${this.metrics.security.blocked_requests} ${timestamp}`);

    // Performance metrics
    lines.push('# HELP claudette_memory_heap_used Heap memory used in bytes');
    lines.push('# TYPE claudette_memory_heap_used gauge');
    lines.push(`claudette_memory_heap_used ${this.metrics.performance.memory_usage.heapUsed} ${timestamp}`);

    lines.push('# HELP claudette_memory_heap_total Total heap memory in bytes');
    lines.push('# TYPE claudette_memory_heap_total gauge');
    lines.push(`claudette_memory_heap_total ${this.metrics.performance.memory_usage.heapTotal} ${timestamp}`);

    lines.push('# HELP claudette_cpu_usage CPU usage percentage');
    lines.push('# TYPE claudette_cpu_usage gauge');
    lines.push(`claudette_cpu_usage ${this.metrics.performance.cpu_usage} ${timestamp}`);

    lines.push('# HELP claudette_connections_active Active connections');
    lines.push('# TYPE claudette_connections_active gauge');
    lines.push(`claudette_connections_active ${this.metrics.performance.connection_pool_stats.active_connections} ${timestamp}`);

    // Operational metrics
    lines.push('# HELP claudette_uptime_seconds Uptime in seconds');
    lines.push('# TYPE claudette_uptime_seconds gauge');
    lines.push(`claudette_uptime_seconds ${Math.floor(this.metrics.operational.uptime / 1000)} ${timestamp}`);

    lines.push('# HELP claudette_error_rate Error rate percentage');
    lines.push('# TYPE claudette_error_rate gauge');
    lines.push(`claudette_error_rate ${this.metrics.operational.error_rate} ${timestamp}`);

    lines.push('# HELP claudette_availability Availability percentage');
    lines.push('# TYPE claudette_availability gauge');
    lines.push(`claudette_availability ${this.metrics.operational.availability} ${timestamp}`);

    // Backend health
    for (const [backend, health] of Object.entries(this.metrics.operational.backend_health)) {
      lines.push(`claudette_backend_healthy{backend="${backend}"} ${health.healthy ? 1 : 0} ${timestamp}`);
      lines.push(`claudette_backend_response_time{backend="${backend}"} ${health.response_time} ${timestamp}`);
    }

    return lines.join('\n') + '\n';
  }

  /**
   * Export metrics in JSON format
   */
  exportJSON(): string {
    return JSON.stringify(this.getMetrics(), null, 2);
  }

  /**
   * Get metrics summary for dashboard
   */
  getSummary(): {
    health: 'excellent' | 'good' | 'fair' | 'poor';
    score: number;
    key_metrics: {
      requests_per_minute: number;
      success_rate: number;
      average_response_time: number;
      memory_usage_percent: number;
      backend_availability: number;
    };
    alerts: Array<{
      level: 'info' | 'warning' | 'error';
      message: string;
    }>;
  } {
    const metrics = this.getMetrics();
    const alerts: Array<{ level: 'info' | 'warning' | 'error'; message: string }> = [];
    
    // Calculate key metrics
    const uptimeMinutes = metrics.operational.uptime / (1000 * 60);
    const requestsPerMinute = uptimeMinutes > 0 ? metrics.business.total_requests / uptimeMinutes : 0;
    const successRate = metrics.business.total_requests > 0 
      ? (metrics.business.successful_requests / metrics.business.total_requests) * 100 
      : 100;
    
    const memoryUsagePercent = metrics.performance.memory_usage.heapTotal > 0
      ? (metrics.performance.memory_usage.heapUsed / metrics.performance.memory_usage.heapTotal) * 100
      : 0;

    const healthyBackends = Object.values(metrics.operational.backend_health).filter(h => h.healthy).length;
    const totalBackends = Object.keys(metrics.operational.backend_health).length;
    const backendAvailability = totalBackends > 0 ? (healthyBackends / totalBackends) * 100 : 100;

    // Generate alerts
    if (successRate < 95) {
      alerts.push({ level: 'error', message: `Low success rate: ${successRate.toFixed(1)}%` });
    }
    if (memoryUsagePercent > 80) {
      alerts.push({ level: 'warning', message: `High memory usage: ${memoryUsagePercent.toFixed(1)}%` });
    }
    if (metrics.business.average_response_time > 5000) {
      alerts.push({ level: 'warning', message: `High response time: ${metrics.business.average_response_time.toFixed(0)}ms` });
    }
    if (backendAvailability < 100) {
      alerts.push({ level: 'error', message: `Backend availability: ${backendAvailability.toFixed(1)}%` });
    }
    if (metrics.security.security_violations.length > 0) {
      alerts.push({ level: 'error', message: `${metrics.security.security_violations.length} security violations` });
    }

    // Calculate overall health score
    let score = 100;
    score -= Math.max(0, (95 - successRate) * 2); // Success rate impact
    score -= Math.max(0, (memoryUsagePercent - 70) * 0.5); // Memory usage impact
    score -= Math.max(0, (metrics.business.average_response_time - 1000) / 100); // Response time impact
    score -= Math.max(0, (100 - backendAvailability) * 2); // Backend availability impact
    score = Math.max(0, Math.min(100, score));

    let health: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 90) health = 'excellent';
    else if (score >= 75) health = 'good';
    else if (score >= 60) health = 'fair';
    else health = 'poor';

    return {
      health,
      score: Math.round(score),
      key_metrics: {
        requests_per_minute: Math.round(requestsPerMinute * 10) / 10,
        success_rate: Math.round(successRate * 10) / 10,
        average_response_time: Math.round(metrics.business.average_response_time),
        memory_usage_percent: Math.round(memoryUsagePercent * 10) / 10,
        backend_availability: Math.round(backendAvailability * 10) / 10
      },
      alerts
    };
  }

  /**
   * Register metrics listener
   */
  onMetricsUpdate(listener: (metrics: ComprehensiveMetrics) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Start automatic metrics collection
   */
  private startCollection(): void {
    this.collectionInterval = setInterval(() => {
      // Update memory usage
      this.updatePerformanceMetrics({
        memoryUsage: process.memoryUsage()
      });

      // Update timestamp
      this.metrics.timestamp = Date.now();

      // Notify listeners
      for (const listener of this.listeners) {
        try {
          listener(this.getMetrics());
        } catch (error) {
          console.error('Error in metrics listener:', error);
        }
      }
    }, 30000); // Update every 30 seconds
  }

  /**
   * Stop metrics collection
   */
  stop(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
  }
}

// Global metrics collector instance
export const globalMetrics = new MetricsCollector();

export default MetricsCollector;