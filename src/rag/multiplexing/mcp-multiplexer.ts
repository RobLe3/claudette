// MCP Multiplexer - Main Coordination System
// Integrates all multiplexing components with failover and recovery logic

import { EventEmitter } from 'events';
import { MCPServerPoolManager, PoolConfiguration } from './mcp-server-pool-manager';
import { IntelligentRequestRouter } from './intelligent-request-router';
import { HealthMonitor, CircuitBreakerConfig, CircuitBreakerState } from './health-monitor';
import { AdvancedLoadBalancer, LoadBalancerConfig, LoadBalancingStrategy } from './load-balancer';
import { SystemOptimizer } from '../../optimization/system-optimizer';
import { PerformanceAnalytics } from '../../analytics/performance/performance-analytics';
import { RAGRequest, RAGResponse, RAGError } from '../types';

export interface MultiplexerConfiguration {
  pool: Partial<PoolConfiguration>;
  router: {
    enableIntelligentRouting: boolean;
    defaultTimeout: number;
    maxRetries: number;
  };
  healthMonitoring: Partial<CircuitBreakerConfig>;
  loadBalancing: Partial<LoadBalancerConfig>;
  failover: {
    enabled: boolean;
    maxFailoverAttempts: number;
    failoverDelay: number;
    autoRecovery: boolean;
    recoveryCheckInterval: number;
  };
  performance: {
    metricsEnabled: boolean;
    optimizationEnabled: boolean;
    adaptiveScaling: boolean;
  };
}

export interface MultiplexerStatus {
  isHealthy: boolean;
  totalServers: number;
  healthyServers: number;
  degradedServers: number;
  unhealthyServers: number;
  currentStrategy: LoadBalancingStrategy;
  queueSize: number;
  avgResponseTime: number;
  throughput: number;
  errorRate: number;
  uptime: number;
}

export interface FailoverEvent {
  timestamp: number;
  triggeredBy: 'server_failure' | 'circuit_breaker' | 'timeout' | 'manual';
  fromServerId: string;
  toServerId?: string;
  requestId: string;
  success: boolean;
  recoveryTime: number;
}

export class MCPMultiplexer extends EventEmitter {
  private config: MultiplexerConfiguration;
  private poolManager!: MCPServerPoolManager;
  private router!: IntelligentRequestRouter;
  private healthMonitor!: HealthMonitor;
  private loadBalancer!: AdvancedLoadBalancer;
  private optimizer!: SystemOptimizer;
  private analytics!: PerformanceAnalytics;
  private isInitialized: boolean = false;
  private isShutdown: boolean = false;
  private startTime: number = Date.now();
  private failoverHistory: FailoverEvent[] = [];
  private recoveryTimer?: NodeJS.Timeout;
  private metricsTimer?: NodeJS.Timeout;

  constructor(config: Partial<MultiplexerConfiguration> = {}) {
    super();

    this.config = {
      pool: {
        minServers: 2,
        maxServers: 8,
        healthCheckInterval: 10000,
        maxConsecutiveFailures: 3,
        ...config.pool
      },
      router: {
        enableIntelligentRouting: true,
        defaultTimeout: 30000,
        maxRetries: 3,
        ...config.router
      },
      healthMonitoring: {
        failureThreshold: 5,
        timeoutMs: 10000,
        recoveryTimeMs: 60000,
        ...config.healthMonitoring
      },
      loadBalancing: {
        strategy: LoadBalancingStrategy.ADAPTIVE,
        adaptiveEnabled: true,
        adaptationInterval: 60000,
        ...config.loadBalancing
      },
      failover: {
        enabled: true,
        maxFailoverAttempts: 3,
        failoverDelay: 1000,
        autoRecovery: true,
        recoveryCheckInterval: 30000,
        ...config.failover
      },
      performance: {
        metricsEnabled: true,
        optimizationEnabled: true,
        adaptiveScaling: true,
        ...config.performance
      }
    };

    this.initializeComponents();
    console.log('🚀 MCP Multiplexer initialized');
  }

  /**
   * Initialize the multiplexer with server configurations
   */
  async initialize(serverConfigs: Array<{
    host: string;
    port: number;
    capabilities: string[];
  }>): Promise<void> {
    if (this.isInitialized) {
      throw new Error('Multiplexer is already initialized');
    }

    console.log(`🔧 Initializing MCP Multiplexer with ${serverConfigs.length} servers`);

    try {
      // Add servers to pool
      for (const serverConfig of serverConfigs) {
        await this.poolManager.addServer(serverConfig);
      }

      // Register servers with health monitor
      const servers = this.poolManager.getAllServersInfo();
      for (const server of servers) {
        this.healthMonitor.registerServer(server);
      }

      // Register servers with load balancer
      this.loadBalancer.registerServers(servers);

      // Start recovery monitoring if enabled
      if (this.config.failover.autoRecovery) {
        this.startRecoveryMonitoring();
      }

      // Start performance monitoring if enabled
      if (this.config.performance.metricsEnabled) {
        this.startPerformanceMonitoring();
      }

      this.isInitialized = true;
      console.log('✅ MCP Multiplexer initialization completed');
      this.emit('initialized', { serverCount: servers.length });

    } catch (error) {
      console.error('❌ MCP Multiplexer initialization failed:', error);
      throw error;
    }
  }

  /**
   * Execute a RAG request with multiplexing
   */
  async executeRequest(request: RAGRequest, priority: number = 0): Promise<RAGResponse> {
    if (!this.isInitialized) {
      throw new Error('Multiplexer not initialized');
    }

    if (this.isShutdown) {
      throw new Error('Multiplexer is shut down');
    }

    const requestId = this.generateRequestId();
    const startTime = Date.now();

    console.log(`🎯 Executing multiplexed request ${requestId} with priority ${priority}`);

    try {
      // Use intelligent router if enabled, otherwise use pool manager directly
      let response: RAGResponse;

      if (this.config.router.enableIntelligentRouting) {
        response = await this.executeWithIntelligentRouting(request, priority, requestId);
      } else {
        response = await this.executeWithBasicRouting(request, priority, requestId);
      }

      const duration = Date.now() - startTime;
      
      // Record performance metrics
      this.recordSuccessMetrics(requestId, duration, response);
      
      console.log(`✅ Request ${requestId} completed successfully in ${duration}ms`);
      this.emit('requestCompleted', { requestId, duration, success: true });

      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record failure metrics
      this.recordFailureMetrics(requestId, duration, error as Error);
      
      console.error(`❌ Request ${requestId} failed after ${duration}ms:`, error);
      this.emit('requestCompleted', { requestId, duration, success: false, error: (error as Error).message });
      
      throw error;
    }
  }

  /**
   * Get multiplexer status
   */
  getStatus(): MultiplexerStatus {
    const poolStats = this.poolManager.getPoolStatistics();
    const queueMetrics = this.loadBalancer.getQueueMetrics();
    const healthDashboard = this.healthMonitor.getHealthDashboard();

    return {
      isHealthy: healthDashboard.systemHealth === 'healthy',
      totalServers: poolStats.totalServers,
      healthyServers: poolStats.healthyServers,
      degradedServers: poolStats.degradedServers,
      unhealthyServers: poolStats.unhealthyServers,
      currentStrategy: this.loadBalancer.getCurrentStrategy(),
      queueSize: queueMetrics.totalItems,
      avgResponseTime: poolStats.avgResponseTime,
      throughput: queueMetrics.throughput,
      errorRate: this.calculateErrorRate(),
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Add a new server to the multiplexer
   */
  async addServer(serverConfig: {
    host: string;
    port: number;
    capabilities: string[];
  }): Promise<void> {
    console.log(`➕ Adding new server to multiplexer: ${serverConfig.host}:${serverConfig.port}`);

    // Add to pool
    await this.poolManager.addServer(serverConfig);

    // Get server instance
    const serverId = `${serverConfig.host}:${serverConfig.port}`;
    const server = this.poolManager.getServerInfo(serverId);

    if (server) {
      // Register with health monitor
      this.healthMonitor.registerServer(server);

      // Register with load balancer
      this.loadBalancer.registerServers([server]);

      console.log(`✅ Server ${serverId} successfully added to multiplexer`);
      this.emit('serverAdded', server);
    }
  }

  /**
   * Remove a server from the multiplexer
   */
  async removeServer(serverId: string): Promise<void> {
    console.log(`➖ Removing server from multiplexer: ${serverId}`);

    // Unregister from components
    this.healthMonitor.unregisterServer(serverId);
    this.loadBalancer.unregisterServer(serverId);

    // Remove from pool
    await this.poolManager.removeServer(serverId);

    console.log(`✅ Server ${serverId} successfully removed from multiplexer`);
    this.emit('serverRemoved', serverId);
  }

  /**
   * Force failover for a specific server
   */
  async forceFailover(serverId: string, reason: string = 'Manual failover'): Promise<void> {
    console.log(`🔄 Forcing failover for server ${serverId}: ${reason}`);

    // Force circuit breaker open
    this.healthMonitor.forceCircuitBreakerState(serverId, CircuitBreakerState.OPEN, reason);

    // Record failover event
    const failoverEvent: FailoverEvent = {
      timestamp: Date.now(),
      triggeredBy: 'manual',
      fromServerId: serverId,
      requestId: 'manual_failover',
      success: true,
      recoveryTime: 0
    };

    this.failoverHistory.push(failoverEvent);
    this.emit('failoverTriggered', failoverEvent);
  }

  /**
   * Get performance analytics
   */
  getPerformanceAnalytics(): {
    dashboard: any;
    optimization: any;
    failoverHistory: FailoverEvent[];
  } {
    return {
      dashboard: this.analytics.getDashboardData(),
      optimization: this.optimizer.getOptimizationStats(),
      failoverHistory: this.failoverHistory.slice(-50) // Last 50 failover events
    };
  }

  /**
   * Update multiplexer configuration
   */
  updateConfiguration(newConfig: Partial<MultiplexerConfiguration>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update component configurations
    if (newConfig.pool) {
      this.poolManager.updateConfiguration(newConfig.pool);
    }
    
    if (newConfig.loadBalancing) {
      if (newConfig.loadBalancing.strategy) {
        this.loadBalancer.setStrategy(newConfig.loadBalancing.strategy);
      }
    }

    console.log('⚙️ Multiplexer configuration updated');
    this.emit('configurationUpdated', this.config);
  }

  /**
   * Shutdown the multiplexer gracefully
   */
  async shutdown(): Promise<void> {
    if (this.isShutdown) return;

    console.log('🔄 Shutting down MCP Multiplexer');
    this.isShutdown = true;

    // Clear timers
    if (this.recoveryTimer) clearInterval(this.recoveryTimer);
    if (this.metricsTimer) clearInterval(this.metricsTimer);

    // Shutdown components in reverse order
    await this.loadBalancer.shutdown();
    await this.healthMonitor.shutdown();
    await this.poolManager.shutdown();
    
    if (this.optimizer) {
      this.optimizer.stop();
    }

    console.log('✅ MCP Multiplexer shutdown completed');
    this.emit('shutdown');
  }

  // Private methods
  private initializeComponents(): void {
    // Initialize analytics and optimizer first
    this.analytics = new PerformanceAnalytics();
    this.optimizer = new SystemOptimizer({}, this.analytics);

    // Initialize multiplexing components
    this.poolManager = new MCPServerPoolManager(this.config.pool, this.optimizer, this.analytics);
    this.healthMonitor = new HealthMonitor(this.config.healthMonitoring, this.analytics);
    this.loadBalancer = new AdvancedLoadBalancer(this.config.loadBalancing, this.analytics);
    this.router = new IntelligentRequestRouter(this.poolManager, this.analytics);

    // Set up event handlers
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Pool manager events
    this.poolManager.on('serverUnhealthy', (server) => {
      console.warn(`⚠️ Server became unhealthy: ${server.id}`);
      this.handleServerFailure(server.id, 'server_failure');
    });

    // Health monitor events
    this.healthMonitor.on('circuitBreakerStateChanged', (event) => {
      if (event.to === CircuitBreakerState.OPEN) {
        this.handleServerFailure(event.serverId, 'circuit_breaker');
      } else if (event.to === CircuitBreakerState.CLOSED) {
        this.handleServerRecovery(event.serverId);
      }
    });

    // Router events
    this.router.on('routingFailure', (event) => {
      console.warn(`⚠️ Routing failure: ${event.error}`);
      this.emit('routingFailure', event);
    });

    // Load balancer events
    this.loadBalancer.on('strategyChanged', (event) => {
      console.log(`📊 Load balancing strategy changed: ${event.from} → ${event.to}`);
      this.emit('strategyChanged', event);
    });
  }

  private async executeWithIntelligentRouting(request: RAGRequest, priority: number, requestId: string): Promise<RAGResponse> {
    try {
      return await this.router.routeRequest(request, priority);
    } catch (error) {
      console.warn(`⚠️ Intelligent routing failed for ${requestId}, falling back to basic routing`);
      return await this.executeWithBasicRouting(request, priority, requestId);
    }
  }

  private async executeWithBasicRouting(request: RAGRequest, priority: number, requestId: string): Promise<RAGResponse> {
    const availableServers = this.poolManager.getAllServersInfo()
      .filter(server => this.healthMonitor.canExecuteRequest(server.id));

    if (availableServers.length === 0) {
      throw new RAGError('No available servers for request', 'NO_SERVERS_AVAILABLE', 'all_servers', false);
    }

    // Use load balancer to select server
    const decision = await this.loadBalancer.selectServer(request, availableServers);
    
    // Execute request with failover
    return await this.executeWithFailover(request, decision.serverId, requestId);
  }

  private async executeWithFailover(request: RAGRequest, serverId: string, requestId: string): Promise<RAGResponse> {
    let lastError: Error;
    let failoverCount = 0;

    while (failoverCount <= this.config.failover.maxFailoverAttempts) {
      try {
        const startTime = Date.now();
        
        // Check if server can handle request
        if (!this.healthMonitor.canExecuteRequest(serverId)) {
          throw new Error(`Server ${serverId} circuit breaker is open`);
        }

        // Execute request
        const response = await this.poolManager.executeRequest(request, 0);
        
        // Record successful execution
        this.healthMonitor.recordRequestResult(serverId, true, Date.now() - startTime);
        
        // Record load balancing outcome
        const decision = { serverId, strategy: this.loadBalancer.getCurrentStrategy() } as any;
        this.loadBalancer.recordDecisionOutcome(decision, true, Date.now() - startTime);

        return response;

      } catch (error) {
        lastError = error as Error;
        const duration = Date.now();
        
        console.warn(`⚠️ Request failed on server ${serverId}: ${lastError.message}`);
        
        // Record failure
        this.healthMonitor.recordRequestResult(serverId, false, duration, lastError.message);
        
        if (failoverCount < this.config.failover.maxFailoverAttempts) {
          // Attempt failover
          const newServerId = await this.performFailover(serverId, requestId, failoverCount);
          if (newServerId) {
            serverId = newServerId;
            failoverCount++;
            
            // Wait before retry
            await this.sleep(this.config.failover.failoverDelay * (failoverCount + 1));
            continue;
          }
        }
        
        break;
      }
    }

    throw new RAGError(
      `Request failed after ${failoverCount} failover attempts: ${lastError!.message}`,
      'FAILOVER_EXHAUSTED',
      serverId,
      false
    );
  }

  private async performFailover(failedServerId: string, requestId: string, attemptNumber: number): Promise<string | null> {
    const startTime = Date.now();
    
    console.log(`🔄 Performing failover attempt ${attemptNumber + 1} for request ${requestId}`);

    // Get available servers excluding the failed one
    const availableServers = this.poolManager.getAllServersInfo()
      .filter(server => server.id !== failedServerId && this.healthMonitor.canExecuteRequest(server.id));

    if (availableServers.length === 0) {
      console.error(`❌ No servers available for failover attempt ${attemptNumber + 1}`);
      return null;
    }

    // Select alternative server
    const decision = await this.loadBalancer.selectServer({} as RAGRequest, availableServers);
    const newServerId = decision.serverId;

    // Record failover event
    const failoverEvent: FailoverEvent = {
      timestamp: Date.now(),
      triggeredBy: 'server_failure',
      fromServerId: failedServerId,
      toServerId: newServerId,
      requestId,
      success: true,
      recoveryTime: Date.now() - startTime
    };

    this.failoverHistory.push(failoverEvent);
    this.emit('failoverTriggered', failoverEvent);

    console.log(`✅ Failover successful: ${failedServerId} → ${newServerId}`);
    return newServerId;
  }

  private handleServerFailure(serverId: string, trigger: FailoverEvent['triggeredBy']): void {
    console.warn(`⚠️ Handling server failure: ${serverId} (trigger: ${trigger})`);

    // Record failure event
    const failoverEvent: FailoverEvent = {
      timestamp: Date.now(),
      triggeredBy: trigger,
      fromServerId: serverId,
      requestId: 'system_failure',
      success: true,
      recoveryTime: 0
    };

    this.failoverHistory.push(failoverEvent);
    this.emit('serverFailure', { serverId, trigger });
  }

  private handleServerRecovery(serverId: string): void {
    console.log(`✅ Server recovered: ${serverId}`);
    this.emit('serverRecovery', serverId);
  }

  private startRecoveryMonitoring(): void {
    this.recoveryTimer = setInterval(() => {
      if (this.isShutdown) return;
      
      this.checkServerRecovery();
    }, this.config.failover.recoveryCheckInterval);

    console.log('🔄 Recovery monitoring started');
  }

  private checkServerRecovery(): void {
    const servers = this.poolManager.getAllServersInfo();
    
    for (const server of servers) {
      if (server.status === 'unhealthy') {
        // Attempt to recover unhealthy servers
        this.attemptServerRecovery(server.id);
      }
    }
  }

  private async attemptServerRecovery(serverId: string): Promise<void> {
    console.log(`🔄 Attempting recovery for server: ${serverId}`);
    
    try {
      // Reset circuit breaker to allow recovery attempts
      this.healthMonitor.resetCircuitBreaker(serverId);
      
      // Perform health check
      const server = this.poolManager.getServerInfo(serverId);
      if (server) {
        await this.healthMonitor.performHealthCheck(server);
      }
      
    } catch (error) {
      console.warn(`⚠️ Recovery attempt failed for ${serverId}: ${(error as Error).message}`);
    }
  }

  private startPerformanceMonitoring(): void {
    this.metricsTimer = setInterval(() => {
      if (this.isShutdown) return;
      
      this.collectPerformanceMetrics();
    }, 30000); // Every 30 seconds

    console.log('📊 Performance monitoring started');
  }

  private collectPerformanceMetrics(): void {
    const status = this.getStatus();
    
    // Record system metrics
    this.analytics.recordSystemMetrics({
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      cpuUsage: process.cpuUsage().user / 1000, // Simplified CPU usage
      activeConnections: status.totalServers,
      throughput: status.throughput
    });

    // Emit metrics update
    this.emit('metricsUpdated', status);
  }

  private recordSuccessMetrics(requestId: string, duration: number, response: RAGResponse): void {
    this.analytics.recordMetric({
      timestamp: Date.now(),
      metricType: 'latency',
      value: duration,
      requestId,
      metadata: {
        success: true,
        resultCount: response.results.length
      }
    });
  }

  private recordFailureMetrics(requestId: string, duration: number, error: Error): void {
    this.analytics.recordMetric({
      timestamp: Date.now(),
      metricType: 'latency',
      value: duration,
      requestId,
      metadata: {
        success: false,
        error: error.message
      }
    });
  }

  private calculateErrorRate(): number {
    const recentFailures = this.failoverHistory.filter(event => 
      Date.now() - event.timestamp <= 300000 // Last 5 minutes
    ).length;
    
    const totalRequests = Math.max(recentFailures + 10, 1); // Approximate total requests
    return recentFailures / totalRequests;
  }

  private generateRequestId(): string {
    return `mux_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}