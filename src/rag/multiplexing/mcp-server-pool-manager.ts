// MCP Server Pool Manager - Advanced Multiplexing System
// Handles multiple concurrent MCP server instances with intelligent load balancing

import { EventEmitter } from 'events';
import { SystemOptimizer } from '../../optimization/system-optimizer';
import { PerformanceAnalytics } from '../../analytics/performance/performance-analytics';
import { RAGRequest, RAGResponse, RAGError } from '../types';

export interface MCPServerInstance {
  id: string;
  host: string;
  port: number;
  capabilities: string[];
  status: 'healthy' | 'degraded' | 'unhealthy' | 'initializing';
  connection?: any;
  lastHealthCheck: number;
  consecutiveFailures: number;
  responseTime: number;
  loadScore: number;
  activeRequests: number;
  totalRequests: number;
  successRate: number;
  avgResponseTime: number;
  metadata: {
    startTime: number;
    version: string;
    memoryUsage: number;
    cpuUsage: number;
  };
}

export interface PoolConfiguration {
  minServers: number;
  maxServers: number;
  healthCheckInterval: number;
  maxConsecutiveFailures: number;
  connectionTimeout: number;
  requestTimeout: number;
  maxRequestsPerServer: number;
  loadBalancingStrategy: 'round-robin' | 'least-connections' | 'weighted-response-time' | 'capability-based';
  circuitBreakerThreshold: number;
  autoscaling: {
    enabled: boolean;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
    cooldownPeriod: number;
  };
  retryPolicy: {
    maxRetries: number;
    backoffStrategy: 'linear' | 'exponential' | 'fixed';
    initialDelay: number;
    maxDelay: number;
  };
}

export interface RequestQueueItem {
  id: string;
  request: RAGRequest;
  priority: number;
  timestamp: number;
  retryCount: number;
  resolve: (response: RAGResponse) => void;
  reject: (error: Error) => void;
}

export class MCPServerPoolManager extends EventEmitter {
  private config: PoolConfiguration;
  private servers: Map<string, MCPServerInstance> = new Map();
  private requestQueue: RequestQueueItem[] = [];
  private optimizer: SystemOptimizer;
  private analytics: PerformanceAnalytics;
  private healthCheckTimer?: NodeJS.Timeout;
  private queueProcessorTimer?: NodeJS.Timeout;
  private autoscaleTimer?: NodeJS.Timeout;
  private isShutdown: boolean = false;
  private connectionPools: Map<string, any[]> = new Map();

  constructor(
    config: Partial<PoolConfiguration> = {},
    optimizer?: SystemOptimizer,
    analytics?: PerformanceAnalytics
  ) {
    super();
    
    this.config = {
      minServers: 2,
      maxServers: 8,
      healthCheckInterval: 10000, // 10 seconds
      maxConsecutiveFailures: 3,
      connectionTimeout: 5000,
      requestTimeout: 30000,
      maxRequestsPerServer: 100,
      loadBalancingStrategy: 'weighted-response-time',
      circuitBreakerThreshold: 0.5,
      autoscaling: {
        enabled: true,
        scaleUpThreshold: 0.8, // 80% capacity
        scaleDownThreshold: 0.3, // 30% capacity
        cooldownPeriod: 300000 // 5 minutes
      },
      retryPolicy: {
        maxRetries: 3,
        backoffStrategy: 'exponential',
        initialDelay: 1000,
        maxDelay: 10000
      },
      ...config
    };

    this.optimizer = optimizer || new SystemOptimizer();
    this.analytics = analytics || new PerformanceAnalytics();

    console.log('🏊‍♂️ MCP Server Pool Manager initialized');
    this.startHealthChecking();
    this.startQueueProcessor();
    
    if (this.config.autoscaling.enabled) {
      this.startAutoscaling();
    }
  }

  /**
   * Add a new MCP server to the pool
   */
  async addServer(serverConfig: {
    host: string;
    port: number;
    capabilities: string[];
    priority?: number;
  }): Promise<void> {
    const serverId = `${serverConfig.host}:${serverConfig.port}`;
    
    if (this.servers.has(serverId)) {
      throw new Error(`Server ${serverId} already exists in pool`);
    }

    const server: MCPServerInstance = {
      id: serverId,
      host: serverConfig.host,
      port: serverConfig.port,
      capabilities: serverConfig.capabilities,
      status: 'initializing',
      lastHealthCheck: 0,
      consecutiveFailures: 0,
      responseTime: 0,
      loadScore: 0,
      activeRequests: 0,
      totalRequests: 0,
      successRate: 1.0,
      avgResponseTime: 0,
      metadata: {
        startTime: Date.now(),
        version: '1.0.0',
        memoryUsage: 0,
        cpuUsage: 0
      }
    };

    this.servers.set(serverId, server);
    console.log(`📡 Added MCP server to pool: ${serverId}`);

    // Initialize connection
    try {
      await this.initializeServerConnection(server);
      server.status = 'healthy';
      this.emit('serverAdded', server);
      
      console.log(`✅ MCP server ${serverId} initialized successfully`);
    } catch (error) {
      console.error(`❌ Failed to initialize MCP server ${serverId}:`, error);
      server.status = 'unhealthy';
    }
  }

  /**
   * Remove a server from the pool
   */
  async removeServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found in pool`);
    }

    console.log(`🗑️ Removing MCP server from pool: ${serverId}`);

    // Wait for active requests to complete
    while (server.activeRequests > 0) {
      await this.sleep(1000);
      console.log(`⏳ Waiting for ${server.activeRequests} active requests to complete on ${serverId}`);
    }

    // Close connection
    await this.closeServerConnection(server);
    this.servers.delete(serverId);
    
    this.emit('serverRemoved', serverId);
    console.log(`✅ MCP server ${serverId} removed from pool`);
  }

  /**
   * Execute a request using the pool with intelligent routing
   */
  async executeRequest(request: RAGRequest, priority: number = 0): Promise<RAGResponse> {
    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();
      const queueItem: RequestQueueItem = {
        id: requestId,
        request,
        priority,
        timestamp: Date.now(),
        retryCount: 0,
        resolve,
        reject
      };

      // Add to queue with priority sorting
      this.requestQueue.push(queueItem);
      this.requestQueue.sort((a, b) => b.priority - a.priority || a.timestamp - b.timestamp);

      console.log(`🎯 Queued request ${requestId} with priority ${priority} (queue size: ${this.requestQueue.length})`);

      // Emit queue metrics
      this.analytics.recordSystemMetrics({
        activeConnections: this.getActiveConnections(),
        throughput: this.getThroughput()
      });
    });
  }

  /**
   * Get pool statistics
   */
  getPoolStatistics(): {
    totalServers: number;
    healthyServers: number;
    degradedServers: number;
    unhealthyServers: number;
    queueSize: number;
    totalActiveRequests: number;
    avgResponseTime: number;
    poolUtilization: number;
    capacity: {
      current: number;
      maximum: number;
      utilization: number;
    };
  } {
    const servers = Array.from(this.servers.values());
    const healthyServers = servers.filter(s => s.status === 'healthy').length;
    const degradedServers = servers.filter(s => s.status === 'degraded').length;
    const unhealthyServers = servers.filter(s => s.status === 'unhealthy').length;
    
    const totalActiveRequests = servers.reduce((sum, s) => sum + s.activeRequests, 0);
    const avgResponseTime = servers.length > 0 
      ? servers.reduce((sum, s) => sum + s.avgResponseTime, 0) / servers.length 
      : 0;
    
    const maxCapacity = servers.length * this.config.maxRequestsPerServer;
    const currentCapacity = totalActiveRequests;
    const utilization = maxCapacity > 0 ? currentCapacity / maxCapacity : 0;

    return {
      totalServers: servers.length,
      healthyServers,
      degradedServers,
      unhealthyServers,
      queueSize: this.requestQueue.length,
      totalActiveRequests,
      avgResponseTime,
      poolUtilization: utilization,
      capacity: {
        current: currentCapacity,
        maximum: maxCapacity,
        utilization
      }
    };
  }

  /**
   * Get server information
   */
  getServerInfo(serverId: string): MCPServerInstance | null {
    return this.servers.get(serverId) || null;
  }

  /**
   * Get all servers information
   */
  getAllServersInfo(): MCPServerInstance[] {
    return Array.from(this.servers.values());
  }

  /**
   * Update pool configuration
   */
  updateConfiguration(newConfig: Partial<PoolConfiguration>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ MCP Pool configuration updated');
    this.emit('configurationUpdated', this.config);
  }

  /**
   * Shutdown the pool gracefully
   */
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down MCP Server Pool Manager');
    this.isShutdown = true;

    // Clear timers
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);
    if (this.queueProcessorTimer) clearInterval(this.queueProcessorTimer);
    if (this.autoscaleTimer) clearInterval(this.autoscaleTimer);

    // Wait for queue to empty or timeout
    const shutdownTimeout = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.requestQueue.length > 0 && (Date.now() - startTime) < shutdownTimeout) {
      await this.sleep(1000);
      console.log(`⏳ Waiting for ${this.requestQueue.length} requests to complete`);
    }

    // Force reject remaining requests
    for (const item of this.requestQueue) {
      item.reject(new Error('Service shutting down'));
    }
    this.requestQueue = [];

    // Close all server connections
    const closePromises = Array.from(this.servers.values()).map(server =>
      this.closeServerConnection(server).catch(error =>
        console.warn(`Warning closing server ${server.id}:`, error)
      )
    );

    await Promise.all(closePromises);
    this.servers.clear();

    console.log('✅ MCP Server Pool Manager shutdown completed');
    this.emit('shutdown');
  }

  // Private methods
  private async initializeServerConnection(server: MCPServerInstance): Promise<void> {
    const { spawn } = await import('child_process');
    const net = await import('net');

    console.log(`🔌 Initializing connection to MCP server ${server.id}`);

    // Create connection pool for this server
    if (!this.connectionPools.has(server.id)) {
      this.connectionPools.set(server.id, []);
    }

    // Establish connection
    server.connection = await this.createConnection(server);
    
    // Perform initial health check
    await this.performHealthCheck(server);
  }

  private async createConnection(server: MCPServerInstance): Promise<any> {
    return new Promise((resolve, reject) => {
      const net = require('net');
      const connection = net.createConnection(server.port, server.host);
      
      const timeout = setTimeout(() => {
        connection.destroy();
        reject(new Error(`Connection timeout to ${server.id}`));
      }, this.config.connectionTimeout);

      connection.on('connect', () => {
        clearTimeout(timeout);
        console.log(`✅ Connected to MCP server ${server.id}`);
        resolve(connection);
      });

      connection.on('error', (error: Error) => {
        clearTimeout(timeout);
        reject(new Error(`Connection failed to ${server.id}: ${error.message}`));
      });
    });
  }

  private async closeServerConnection(server: MCPServerInstance): Promise<void> {
    if (server.connection) {
      try {
        server.connection.end();
        server.connection = null;
      } catch (error) {
        console.warn(`Warning closing connection to ${server.id}:`, error);
      }
    }

    // Clean up connection pool
    this.connectionPools.delete(server.id);
  }

  private startHealthChecking(): void {
    this.healthCheckTimer = setInterval(async () => {
      if (this.isShutdown) return;

      const healthChecks = Array.from(this.servers.values()).map(server =>
        this.performHealthCheck(server).catch(error =>
          console.warn(`Health check failed for ${server.id}:`, error)
        )
      );

      await Promise.all(healthChecks);
    }, this.config.healthCheckInterval);

    console.log('❤️ Health checking started');
  }

  private async performHealthCheck(server: MCPServerInstance): Promise<void> {
    const startTime = Date.now();
    server.lastHealthCheck = startTime;

    try {
      // Send ping request
      const pingRequest = {
        method: 'ping',
        params: {},
        id: 'health_check'
      };

      const response = await this.sendServerRequest(server, pingRequest, 5000);
      
      if (response.result === 'pong') {
        server.responseTime = Date.now() - startTime;
        server.consecutiveFailures = 0;
        
        // Update server status based on performance
        if (server.responseTime > 10000) {
          server.status = 'degraded';
        } else if (server.status !== 'healthy') {
          server.status = 'healthy';
        }

        // Update performance metrics
        this.updateServerMetrics(server, response);
        
      } else {
        throw new Error('Invalid ping response');
      }

    } catch (error) {
      console.warn(`❌ Health check failed for ${server.id}:`, error);
      server.consecutiveFailures++;
      
      // Update server status based on failures
      if (server.consecutiveFailures >= this.config.maxConsecutiveFailures) {
        server.status = 'unhealthy';
        this.emit('serverUnhealthy', server);
      } else {
        server.status = 'degraded';
      }
    }
  }

  private updateServerMetrics(server: MCPServerInstance, response: any): void {
    // Update average response time with exponential moving average
    const alpha = 0.1;
    server.avgResponseTime = server.avgResponseTime === 0 
      ? server.responseTime
      : alpha * server.responseTime + (1 - alpha) * server.avgResponseTime;

    // Update success rate
    server.totalRequests++;
    server.successRate = (server.successRate * (server.totalRequests - 1) + 1) / server.totalRequests;

    // Update load score (weighted combination of factors)
    const loadFactor = server.activeRequests / this.config.maxRequestsPerServer;
    const responseFactor = server.avgResponseTime / 10000; // Normalize to 10 seconds
    const failureFactor = server.consecutiveFailures / this.config.maxConsecutiveFailures;
    
    server.loadScore = (loadFactor * 0.4) + (responseFactor * 0.4) + (failureFactor * 0.2);

    // Record metrics for analytics
    this.analytics.recordSystemMetrics({
      memoryUsage: server.metadata.memoryUsage,
      cpuUsage: server.metadata.cpuUsage
    });
  }

  private startQueueProcessor(): void {
    this.queueProcessorTimer = setInterval(async () => {
      if (this.isShutdown || this.requestQueue.length === 0) return;

      const availableServers = this.getAvailableServers();
      if (availableServers.length === 0) return;

      // Process requests based on available capacity
      const maxConcurrentRequests = Math.min(
        this.requestQueue.length,
        availableServers.reduce((sum, server) => 
          sum + Math.max(0, this.config.maxRequestsPerServer - server.activeRequests), 0
        )
      );

      const requestsToProcess = this.requestQueue.splice(0, maxConcurrentRequests);
      
      for (const queueItem of requestsToProcess) {
        this.processQueueItem(queueItem);
      }

    }, 100); // Process every 100ms

    console.log('🔄 Queue processor started');
  }

  private async processQueueItem(queueItem: RequestQueueItem): Promise<void> {
    const server = this.selectServer(queueItem.request);
    
    if (!server) {
      queueItem.reject(new Error('No available servers'));
      return;
    }

    server.activeRequests++;
    const startTime = Date.now();

    try {
      console.log(`🎯 Processing request ${queueItem.id} on server ${server.id}`);

      const mcpRequest = {
        method: 'rag/query',
        params: {
          query: queueItem.request.query,
          context: queueItem.request.context,
          maxResults: queueItem.request.maxResults || 5,
          threshold: queueItem.request.threshold || 0.7
        },
        id: queueItem.id
      };

      const response = await this.sendServerRequest(server, mcpRequest, this.config.requestTimeout);
      const duration = Date.now() - startTime;

      // Build response
      const ragResponse: RAGResponse = {
        results: response.results || [],
        metadata: {
          totalResults: response.results?.length || 0,
          processingTime: duration,
          source: response.source || 'vector',
          queryId: queueItem.id,
          serverId: server.id
        }
      };

      // Record performance metrics
      this.analytics.recordMetric({
        timestamp: Date.now(),
        metricType: 'latency',
        value: duration,
        backend: server.id,
        requestId: queueItem.id
      });

      queueItem.resolve(ragResponse);
      console.log(`✅ Request ${queueItem.id} completed in ${duration}ms`);

    } catch (error) {
      console.error(`❌ Request ${queueItem.id} failed on server ${server.id}:`, error);
      
      // Implement retry logic
      if (queueItem.retryCount < this.config.retryPolicy.maxRetries) {
        queueItem.retryCount++;
        const delay = this.calculateRetryDelay(queueItem.retryCount);
        
        setTimeout(() => {
          this.requestQueue.unshift(queueItem); // Add back to front of queue
        }, delay);
        
        console.log(`🔄 Retrying request ${queueItem.id} in ${delay}ms (attempt ${queueItem.retryCount + 1})`);
      } else {
        queueItem.reject(new Error(`Request failed after ${this.config.retryPolicy.maxRetries} retries: ${error instanceof Error ? error.message : String(error)}`));
      }
      
      // Update server failure metrics
      server.consecutiveFailures++;
    } finally {
      server.activeRequests = Math.max(0, server.activeRequests - 1);
    }
  }

  private selectServer(request: RAGRequest): MCPServerInstance | null {
    const availableServers = this.getAvailableServers();
    if (availableServers.length === 0) return null;

    switch (this.config.loadBalancingStrategy) {
      case 'round-robin':
        return this.selectRoundRobin(availableServers);
      
      case 'least-connections':
        return this.selectLeastConnections(availableServers);
      
      case 'weighted-response-time':
        return this.selectWeightedResponseTime(availableServers);
      
      case 'capability-based':
        return this.selectCapabilityBased(availableServers, request);
      
      default:
        return availableServers[0];
    }
  }

  private getAvailableServers(): MCPServerInstance[] {
    return Array.from(this.servers.values()).filter(server => 
      (server.status === 'healthy' || server.status === 'degraded') &&
      server.activeRequests < this.config.maxRequestsPerServer &&
      server.successRate >= this.config.circuitBreakerThreshold
    );
  }

  private selectRoundRobin(servers: MCPServerInstance[]): MCPServerInstance {
    // Simple round-robin based on total requests
    return servers.reduce((min, server) => 
      server.totalRequests < min.totalRequests ? server : min
    );
  }

  private selectLeastConnections(servers: MCPServerInstance[]): MCPServerInstance {
    return servers.reduce((min, server) => 
      server.activeRequests < min.activeRequests ? server : min
    );
  }

  private selectWeightedResponseTime(servers: MCPServerInstance[]): MCPServerInstance {
    // Select server with lowest load score
    return servers.reduce((best, server) => 
      server.loadScore < best.loadScore ? server : best
    );
  }

  private selectCapabilityBased(servers: MCPServerInstance[], request: RAGRequest): MCPServerInstance {
    // Filter servers by capability and then select by load
    const capableServers = servers.filter(server => {
      // Check if server has required capabilities based on request type
      if (request.context?.includes('vector')) {
        return server.capabilities.includes('vector_search');
      }
      if (request.context?.includes('graph')) {
        return server.capabilities.includes('graph_query');
      }
      return true; // Default to all servers if no specific capability needed
    });

    if (capableServers.length === 0) return servers[0];
    return this.selectWeightedResponseTime(capableServers);
  }

  private calculateRetryDelay(retryCount: number): number {
    const { initialDelay, maxDelay, backoffStrategy } = this.config.retryPolicy;
    
    let delay: number;
    switch (backoffStrategy) {
      case 'linear':
        delay = initialDelay * retryCount;
        break;
      case 'exponential':
        delay = initialDelay * Math.pow(2, retryCount - 1);
        break;
      case 'fixed':
      default:
        delay = initialDelay;
        break;
    }
    
    return Math.min(delay, maxDelay);
  }

  private startAutoscaling(): void {
    this.autoscaleTimer = setInterval(() => {
      if (this.isShutdown) return;
      
      const stats = this.getPoolStatistics();
      const utilization = stats.capacity.utilization;

      // Scale up if utilization is high
      if (utilization > this.config.autoscaling.scaleUpThreshold && 
          stats.totalServers < this.config.maxServers) {
        console.log(`📈 High utilization detected (${(utilization * 100).toFixed(1)}%), considering scale-up`);
        this.emit('scaleUpNeeded', { utilization, currentServers: stats.totalServers });
      }

      // Scale down if utilization is low
      if (utilization < this.config.autoscaling.scaleDownThreshold && 
          stats.totalServers > this.config.minServers) {
        console.log(`📉 Low utilization detected (${(utilization * 100).toFixed(1)}%), considering scale-down`);
        this.emit('scaleDownNeeded', { utilization, currentServers: stats.totalServers });
      }

    }, this.config.autoscaling.cooldownPeriod);

    console.log('📊 Autoscaling monitoring started');
  }

  private async sendServerRequest(server: MCPServerInstance, request: any, timeout: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Request timeout'));
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

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getActiveConnections(): number {
    return Array.from(this.servers.values())
      .filter(s => s.connection)
      .reduce((sum, s) => sum + s.activeRequests, 0);
  }

  private getThroughput(): number {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    return Array.from(this.servers.values())
      .reduce((sum, server) => {
        // Simplified throughput calculation
        return sum + (server.totalRequests / ((now - server.metadata.startTime) / 1000 / 60));
      }, 0);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}