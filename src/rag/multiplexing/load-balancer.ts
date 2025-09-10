// Advanced Load Balancer - Sophisticated MCP Multiplexing System
// Implements multiple load balancing strategies with adaptive selection

import { EventEmitter } from 'events';
import { MCPServerInstance } from './mcp-server-pool-manager';
import { PerformanceAnalytics } from '../../analytics/performance/performance-analytics';
import { RAGRequest } from '../types';

export enum LoadBalancingStrategy {
  ROUND_ROBIN = 'round-robin',
  LEAST_CONNECTIONS = 'least-connections',
  WEIGHTED_RESPONSE_TIME = 'weighted-response-time',
  RESOURCE_AWARE = 'resource-aware',
  CAPABILITY_BASED = 'capability-based',
  PREDICTIVE = 'predictive',
  ADAPTIVE = 'adaptive'
}

export interface LoadBalancerConfig {
  strategy: LoadBalancingStrategy;
  adaptiveEnabled: boolean;
  adaptationInterval: number;
  strategyWeights: Map<LoadBalancingStrategy, number>;
  performanceThresholds: {
    maxResponseTime: number;
    maxErrorRate: number;
    maxUtilization: number;
  };
  predictiveModel: {
    enabled: boolean;
    historyWindow: number;
    predictionHorizon: number;
    confidenceThreshold: number;
  };
}

export interface LoadBalancingDecision {
  serverId: string;
  strategy: LoadBalancingStrategy;
  confidence: number;
  reasoning: string[];
  expectedMetrics: {
    responseTime: number;
    successProbability: number;
    utilizationAfter: number;
  };
}

export interface StrategyPerformance {
  strategy: LoadBalancingStrategy;
  totalDecisions: number;
  successfulDecisions: number;
  avgResponseTime: number;
  avgUtilization: number;
  effectiveness: number;
  recentTrend: 'improving' | 'stable' | 'degrading';
}

export interface RequestQueueItem {
  id: string;
  request: RAGRequest;
  priority: number;
  timestamp: number;
  deadline?: number;
  retryCount: number;
  queuePosition: number;
  estimatedWaitTime: number;
}

export interface QueueMetrics {
  totalItems: number;
  highPriorityItems: number;
  mediumPriorityItems: number;
  lowPriorityItems: number;
  avgWaitTime: number;
  maxWaitTime: number;
  throughput: number;
  backpressureLevel: number;
}

export class AdvancedLoadBalancer extends EventEmitter {
  private config: LoadBalancerConfig;
  private analytics: PerformanceAnalytics;
  private servers: Map<string, MCPServerInstance> = new Map();
  private strategyPerformance: Map<LoadBalancingStrategy, StrategyPerformance> = new Map();
  private requestQueue: RequestQueueItem[] = [];
  private currentStrategy: LoadBalancingStrategy;
  private roundRobinCounter: number = 0;
  private decisionHistory: Array<{ timestamp: number; decision: LoadBalancingDecision; outcome: 'success' | 'failure' }> = [];
  private adaptationTimer?: NodeJS.Timeout;
  private queueProcessor?: NodeJS.Timeout;
  private isShutdown: boolean = false;

  constructor(
    config: Partial<LoadBalancerConfig> = {},
    analytics: PerformanceAnalytics
  ) {
    super();

    this.config = {
      strategy: LoadBalancingStrategy.ADAPTIVE,
      adaptiveEnabled: true,
      adaptationInterval: 60000, // 1 minute
      strategyWeights: new Map([
        [LoadBalancingStrategy.ROUND_ROBIN, 1.0],
        [LoadBalancingStrategy.LEAST_CONNECTIONS, 1.2],
        [LoadBalancingStrategy.WEIGHTED_RESPONSE_TIME, 1.5],
        [LoadBalancingStrategy.RESOURCE_AWARE, 1.8],
        [LoadBalancingStrategy.CAPABILITY_BASED, 1.3],
        [LoadBalancingStrategy.PREDICTIVE, 2.0],
        [LoadBalancingStrategy.ADAPTIVE, 2.2]
      ]),
      performanceThresholds: {
        maxResponseTime: 10000,
        maxErrorRate: 0.05,
        maxUtilization: 0.8
      },
      predictiveModel: {
        enabled: true,
        historyWindow: 300000, // 5 minutes
        predictionHorizon: 60000, // 1 minute
        confidenceThreshold: 0.7
      },
      ...config
    };

    this.analytics = analytics;
    this.currentStrategy = this.config.strategy;

    this.initializeStrategyPerformance();
    this.startAdaptiveOptimization();
    this.startQueueProcessor();

    console.log('⚖️ Advanced Load Balancer initialized with strategy:', this.currentStrategy);
  }

  /**
   * Register servers for load balancing
   */
  registerServers(servers: MCPServerInstance[]): void {
    for (const server of servers) {
      this.servers.set(server.id, server);
      console.log(`📝 Registered server for load balancing: ${server.id}`);
    }

    this.emit('serversRegistered', servers.map(s => s.id));
  }

  /**
   * Unregister a server from load balancing
   */
  unregisterServer(serverId: string): void {
    if (this.servers.delete(serverId)) {
      console.log(`🗑️ Unregistered server from load balancing: ${serverId}`);
      this.emit('serverUnregistered', serverId);
    }
  }

  /**
   * Make load balancing decision
   */
  async selectServer(request: RAGRequest, availableServers: MCPServerInstance[]): Promise<LoadBalancingDecision> {
    if (availableServers.length === 0) {
      throw new Error('No available servers for load balancing');
    }

    // Update local server references
    for (const server of availableServers) {
      this.servers.set(server.id, server);
    }

    let decision: LoadBalancingDecision;
    const startTime = Date.now();

    try {
      switch (this.currentStrategy) {
        case LoadBalancingStrategy.ROUND_ROBIN:
          decision = this.roundRobinSelection(availableServers, request);
          break;

        case LoadBalancingStrategy.LEAST_CONNECTIONS:
          decision = this.leastConnectionsSelection(availableServers, request);
          break;

        case LoadBalancingStrategy.WEIGHTED_RESPONSE_TIME:
          decision = this.weightedResponseTimeSelection(availableServers, request);
          break;

        case LoadBalancingStrategy.RESOURCE_AWARE:
          decision = await this.resourceAwareSelection(availableServers, request);
          break;

        case LoadBalancingStrategy.CAPABILITY_BASED:
          decision = this.capabilityBasedSelection(availableServers, request);
          break;

        case LoadBalancingStrategy.PREDICTIVE:
          decision = await this.predictiveSelection(availableServers, request);
          break;

        case LoadBalancingStrategy.ADAPTIVE:
          decision = await this.adaptiveSelection(availableServers, request);
          break;

        default:
          decision = this.roundRobinSelection(availableServers, request);
      }

      const decisionTime = Date.now() - startTime;
      console.log(`⚖️ Load balancing decision made in ${decisionTime}ms: ${decision.serverId} (${decision.strategy})`);

      this.emit('loadBalancingDecision', decision);
      return decision;

    } catch (error) {
      console.error('❌ Load balancing decision failed:', error);
      // Fallback to simple round-robin
      return this.roundRobinSelection(availableServers, request);
    }
  }

  /**
   * Record the outcome of a load balancing decision
   */
  recordDecisionOutcome(decision: LoadBalancingDecision, success: boolean, responseTime: number): void {
    // Update strategy performance
    const performance = this.strategyPerformance.get(decision.strategy);
    if (performance) {
      performance.totalDecisions++;
      if (success) {
        performance.successfulDecisions++;
      }

      // Update average response time with exponential moving average
      const alpha = 0.1;
      performance.avgResponseTime = performance.avgResponseTime === 0
        ? responseTime
        : alpha * responseTime + (1 - alpha) * performance.avgResponseTime;

      // Update effectiveness score
      const successRate = performance.successfulDecisions / performance.totalDecisions;
      const responseTimeScore = Math.max(0, 1 - (performance.avgResponseTime / this.config.performanceThresholds.maxResponseTime));
      performance.effectiveness = (successRate * 0.7) + (responseTimeScore * 0.3);
    }

    // Record decision outcome
    this.decisionHistory.push({
      timestamp: Date.now(),
      decision,
      outcome: success ? 'success' : 'failure'
    });

    // Keep only recent history
    if (this.decisionHistory.length > 1000) {
      this.decisionHistory.splice(0, 100);
    }

    // Emit performance update
    this.emit('performanceUpdated', { strategy: decision.strategy, performance });
  }

  /**
   * Add request to queue
   */
  enqueueRequest(request: RAGRequest, priority: number = 0, deadline?: number): Promise<string> {
    const queueItem: RequestQueueItem = {
      id: this.generateRequestId(),
      request,
      priority,
      timestamp: Date.now(),
      deadline,
      retryCount: 0,
      queuePosition: this.requestQueue.length,
      estimatedWaitTime: this.calculateEstimatedWaitTime()
    };

    this.requestQueue.push(queueItem);
    this.sortQueue();

    console.log(`📥 Request queued: ${queueItem.id} (priority: ${priority}, position: ${queueItem.queuePosition})`);
    this.emit('requestQueued', queueItem);

    return Promise.resolve(queueItem.id);
  }

  /**
   * Get queue metrics
   */
  getQueueMetrics(): QueueMetrics {
    const highPriority = this.requestQueue.filter(item => item.priority >= 8).length;
    const mediumPriority = this.requestQueue.filter(item => item.priority >= 4 && item.priority < 8).length;
    const lowPriority = this.requestQueue.filter(item => item.priority < 4).length;

    const waitTimes = this.requestQueue.map(item => Date.now() - item.timestamp);
    const avgWaitTime = waitTimes.length > 0 ? waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length : 0;
    const maxWaitTime = waitTimes.length > 0 ? Math.max(...waitTimes) : 0;

    const backpressureLevel = Math.min(this.requestQueue.length / 1000, 1.0); // Normalize to 1000 max queue size

    return {
      totalItems: this.requestQueue.length,
      highPriorityItems: highPriority,
      mediumPriorityItems: mediumPriority,
      lowPriorityItems: lowPriority,
      avgWaitTime,
      maxWaitTime,
      throughput: this.calculateThroughput(),
      backpressureLevel
    };
  }

  /**
   * Get strategy performance statistics
   */
  getStrategyPerformance(): Map<LoadBalancingStrategy, StrategyPerformance> {
    return new Map(this.strategyPerformance);
  }

  /**
   * Get current load balancing strategy
   */
  getCurrentStrategy(): LoadBalancingStrategy {
    return this.currentStrategy;
  }

  /**
   * Set load balancing strategy
   */
  setStrategy(strategy: LoadBalancingStrategy): void {
    if (this.currentStrategy !== strategy) {
      const oldStrategy = this.currentStrategy;
      this.currentStrategy = strategy;
      
      console.log(`⚖️ Load balancing strategy changed: ${oldStrategy} → ${strategy}`);
      this.emit('strategyChanged', { from: oldStrategy, to: strategy });
    }
  }

  /**
   * Shutdown load balancer
   */
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down Advanced Load Balancer');
    this.isShutdown = true;

    if (this.adaptationTimer) clearInterval(this.adaptationTimer);
    if (this.queueProcessor) clearInterval(this.queueProcessor);

    // Reject remaining queued requests
    for (const item of this.requestQueue) {
      this.emit('requestRejected', { id: item.id, reason: 'Service shutting down' });
    }
    this.requestQueue = [];

    this.servers.clear();
    console.log('✅ Advanced Load Balancer shutdown completed');
  }

  // Private methods
  private roundRobinSelection(servers: MCPServerInstance[], request: RAGRequest): LoadBalancingDecision {
    this.roundRobinCounter = (this.roundRobinCounter + 1) % servers.length;
    const selectedServer = servers[this.roundRobinCounter];

    return {
      serverId: selectedServer.id,
      strategy: LoadBalancingStrategy.ROUND_ROBIN,
      confidence: 0.7,
      reasoning: [`Round-robin selection (position ${this.roundRobinCounter})`],
      expectedMetrics: {
        responseTime: selectedServer.avgResponseTime,
        successProbability: selectedServer.successRate,
        utilizationAfter: (selectedServer.activeRequests + 1) / 100
      }
    };
  }

  private leastConnectionsSelection(servers: MCPServerInstance[], request: RAGRequest): LoadBalancingDecision {
    const selectedServer = servers.reduce((min, server) =>
      server.activeRequests < min.activeRequests ? server : min
    );

    return {
      serverId: selectedServer.id,
      strategy: LoadBalancingStrategy.LEAST_CONNECTIONS,
      confidence: 0.8,
      reasoning: [`Least connections (${selectedServer.activeRequests} active)`],
      expectedMetrics: {
        responseTime: selectedServer.avgResponseTime,
        successProbability: selectedServer.successRate,
        utilizationAfter: (selectedServer.activeRequests + 1) / 100
      }
    };
  }

  private weightedResponseTimeSelection(servers: MCPServerInstance[], request: RAGRequest): LoadBalancingDecision {
    // Calculate weighted scores based on response time and current load
    const scoredServers = servers.map(server => {
      const responseTimeScore = server.avgResponseTime > 0 ? 1 / server.avgResponseTime : 1;
      const loadScore = 1 / (1 + server.loadScore);
      const healthScore = server.status === 'healthy' ? 1 : 0.5;
      const totalScore = responseTimeScore * loadScore * healthScore;

      return { server, score: totalScore };
    });

    // Select server with highest score
    const selected = scoredServers.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    return {
      serverId: selected.server.id,
      strategy: LoadBalancingStrategy.WEIGHTED_RESPONSE_TIME,
      confidence: 0.85,
      reasoning: [
        `Weighted selection based on response time (${selected.server.avgResponseTime.toFixed(0)}ms)`,
        `Load score: ${selected.server.loadScore.toFixed(2)}`
      ],
      expectedMetrics: {
        responseTime: selected.server.avgResponseTime,
        successProbability: selected.server.successRate,
        utilizationAfter: (selected.server.activeRequests + 1) / 100
      }
    };
  }

  private async resourceAwareSelection(servers: MCPServerInstance[], request: RAGRequest): Promise<LoadBalancingDecision> {
    // Score servers based on comprehensive resource utilization
    const scoredServers = servers.map(server => {
      const cpuScore = 1 - (server.metadata.cpuUsage / 100);
      const memoryScore = 1 - (server.metadata.memoryUsage / 1024); // Assume 1GB max
      const connectionScore = 1 - (server.activeRequests / 100);
      const healthScore = server.status === 'healthy' ? 1 : 0.3;

      const totalScore = (cpuScore * 0.3) + (memoryScore * 0.3) + (connectionScore * 0.3) + (healthScore * 0.1);

      return { server, score: totalScore };
    });

    const selected = scoredServers.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    return {
      serverId: selected.server.id,
      strategy: LoadBalancingStrategy.RESOURCE_AWARE,
      confidence: 0.9,
      reasoning: [
        `Resource-aware selection (CPU: ${selected.server.metadata.cpuUsage.toFixed(1)}%)`,
        `Memory: ${selected.server.metadata.memoryUsage.toFixed(0)}MB`,
        `Active requests: ${selected.server.activeRequests}`
      ],
      expectedMetrics: {
        responseTime: selected.server.avgResponseTime,
        successProbability: selected.server.successRate,
        utilizationAfter: (selected.server.activeRequests + 1) / 100
      }
    };
  }

  private capabilityBasedSelection(servers: MCPServerInstance[], request: RAGRequest): LoadBalancingDecision {
    // Analyze request requirements
    const requiredCapabilities = this.analyzeRequiredCapabilities(request);
    
    // Filter and score servers by capability match
    const capableServers = servers.filter(server => 
      requiredCapabilities.every(cap => server.capabilities.includes(cap))
    );

    if (capableServers.length === 0) {
      // Fallback to all servers if none match exactly
      return this.leastConnectionsSelection(servers, request);
    }

    // Among capable servers, select by load
    const selectedServer = capableServers.reduce((best, server) => {
      const capabilityScore = server.capabilities.length / 10; // Normalize capabilities
      const loadScore = 1 - server.loadScore;
      const totalScore = (capabilityScore * 0.3) + (loadScore * 0.7);

      return !best || totalScore > best.score ? { server, score: totalScore } : best;
    }, null as { server: MCPServerInstance; score: number } | null);

    return {
      serverId: selectedServer!.server.id,
      strategy: LoadBalancingStrategy.CAPABILITY_BASED,
      confidence: 0.85,
      reasoning: [
        `Capability match for: ${requiredCapabilities.join(', ')}`,
        `Server capabilities: ${selectedServer!.server.capabilities.join(', ')}`
      ],
      expectedMetrics: {
        responseTime: selectedServer!.server.avgResponseTime,
        successProbability: selectedServer!.server.successRate,
        utilizationAfter: (selectedServer!.server.activeRequests + 1) / 100
      }
    };
  }

  private async predictiveSelection(servers: MCPServerInstance[], request: RAGRequest): Promise<LoadBalancingDecision> {
    // Use historical data to predict server performance
    const predictions = servers.map(server => {
      const prediction = this.predictServerPerformance(server, request);
      return { server, prediction };
    });

    // Select server with best predicted performance
    const selected = predictions.reduce((best, current) =>
      current.prediction.score > best.prediction.score ? current : best
    );

    return {
      serverId: selected.server.id,
      strategy: LoadBalancingStrategy.PREDICTIVE,
      confidence: selected.prediction.confidence,
      reasoning: [
        `Predictive selection based on historical patterns`,
        `Predicted response time: ${selected.prediction.responseTime.toFixed(0)}ms`,
        `Confidence: ${(selected.prediction.confidence * 100).toFixed(1)}%`
      ],
      expectedMetrics: {
        responseTime: selected.prediction.responseTime,
        successProbability: selected.prediction.successProbability,
        utilizationAfter: selected.prediction.utilizationAfter
      }
    };
  }

  private async adaptiveSelection(servers: MCPServerInstance[], request: RAGRequest): Promise<LoadBalancingDecision> {
    // Combine multiple strategies based on their recent performance
    const strategies = [
      LoadBalancingStrategy.LEAST_CONNECTIONS,
      LoadBalancingStrategy.WEIGHTED_RESPONSE_TIME,
      LoadBalancingStrategy.RESOURCE_AWARE
    ];

    const decisions = await Promise.all(strategies.map(async strategy => {
      switch (strategy) {
        case LoadBalancingStrategy.LEAST_CONNECTIONS:
          return this.leastConnectionsSelection(servers, request);
        case LoadBalancingStrategy.WEIGHTED_RESPONSE_TIME:
          return this.weightedResponseTimeSelection(servers, request);
        case LoadBalancingStrategy.RESOURCE_AWARE:
          return await this.resourceAwareSelection(servers, request);
        default:
          return this.roundRobinSelection(servers, request);
      }
    }));

    // Weight decisions by strategy performance
    const weightedDecisions = decisions.map(decision => {
      const performance = this.strategyPerformance.get(decision.strategy);
      const weight = performance ? performance.effectiveness : 0.5;
      return { decision, weight };
    });

    // Select best weighted decision
    const selected = weightedDecisions.reduce((best, current) =>
      current.weight > best.weight ? current : best
    );

    return {
      serverId: selected.decision.serverId,
      strategy: LoadBalancingStrategy.ADAPTIVE,
      confidence: Math.min(selected.decision.confidence * selected.weight, 1.0),
      reasoning: [
        `Adaptive selection combined ${strategies.join(', ')}`,
        `Selected strategy: ${selected.decision.strategy}`,
        `Strategy effectiveness: ${(selected.weight * 100).toFixed(1)}%`
      ],
      expectedMetrics: selected.decision.expectedMetrics
    };
  }

  private predictServerPerformance(server: MCPServerInstance, request: RAGRequest): {
    score: number;
    responseTime: number;
    successProbability: number;
    utilizationAfter: number;
    confidence: number;
  } {
    // Simplified prediction based on historical patterns
    const baseResponseTime = server.avgResponseTime;
    const loadMultiplier = 1 + (server.loadScore * 0.3);
    const predictedResponseTime = baseResponseTime * loadMultiplier;

    const successProbability = server.successRate * (server.status === 'healthy' ? 1 : 0.5);
    const utilizationAfter = (server.activeRequests + 1) / 100;

    // Score combines response time and success probability
    const responseTimeScore = Math.max(0, 1 - (predictedResponseTime / this.config.performanceThresholds.maxResponseTime));
    const score = (responseTimeScore * 0.6) + (successProbability * 0.4);

    return {
      score,
      responseTime: predictedResponseTime,
      successProbability,
      utilizationAfter,
      confidence: 0.7 // Simplified confidence
    };
  }

  private analyzeRequiredCapabilities(request: RAGRequest): string[] {
    const capabilities: string[] = [];

    if (request.query.includes('vector') || request.query.includes('similarity')) {
      capabilities.push('vector_search');
    }
    if (request.query.includes('graph') || request.query.includes('relationship')) {
      capabilities.push('graph_query');
    }
    if (request.maxResults && request.maxResults > 10) {
      capabilities.push('high_volume');
    }

    return capabilities;
  }

  private initializeStrategyPerformance(): void {
    for (const strategy of Object.values(LoadBalancingStrategy)) {
      this.strategyPerformance.set(strategy, {
        strategy,
        totalDecisions: 0,
        successfulDecisions: 0,
        avgResponseTime: 0,
        avgUtilization: 0,
        effectiveness: 0.5,
        recentTrend: 'stable'
      });
    }
  }

  private startAdaptiveOptimization(): void {
    if (!this.config.adaptiveEnabled) return;

    this.adaptationTimer = setInterval(() => {
      if (this.isShutdown) return;

      this.adaptStrategy();
    }, this.config.adaptationInterval);

    console.log('🤖 Adaptive optimization started');
  }

  private adaptStrategy(): void {
    // Find best performing strategy
    const performances = Array.from(this.strategyPerformance.values())
      .filter(p => p.totalDecisions > 10) // Require minimum decisions
      .sort((a, b) => b.effectiveness - a.effectiveness);

    if (performances.length > 0 && performances[0].effectiveness > 0.8) {
      const bestStrategy = performances[0].strategy;
      
      if (this.currentStrategy !== bestStrategy) {
        console.log(`🎯 Adapting to best performing strategy: ${bestStrategy} (effectiveness: ${(performances[0].effectiveness * 100).toFixed(1)}%)`);
        this.setStrategy(bestStrategy);
      }
    }

    // Update trends
    this.updatePerformanceTrends();
  }

  private updatePerformanceTrends(): void {
    const recentHistory = this.decisionHistory.slice(-50); // Last 50 decisions
    
    for (const performance of this.strategyPerformance.values()) {
      const strategyDecisions = recentHistory.filter(h => h.decision.strategy === performance.strategy);
      
      if (strategyDecisions.length >= 10) {
        const recentHalf = strategyDecisions.slice(-Math.floor(strategyDecisions.length / 2));
        const olderHalf = strategyDecisions.slice(0, Math.floor(strategyDecisions.length / 2));
        
        const recentSuccessRate = recentHalf.filter(d => d.outcome === 'success').length / recentHalf.length;
        const olderSuccessRate = olderHalf.filter(d => d.outcome === 'success').length / olderHalf.length;
        
        const improvement = recentSuccessRate - olderSuccessRate;
        
        if (improvement > 0.05) {
          performance.recentTrend = 'improving';
        } else if (improvement < -0.05) {
          performance.recentTrend = 'degrading';
        } else {
          performance.recentTrend = 'stable';
        }
      }
    }
  }

  private startQueueProcessor(): void {
    this.queueProcessor = setInterval(() => {
      if (this.isShutdown) return;

      this.processQueue();
    }, 1000); // Process queue every second
  }

  private processQueue(): void {
    const now = Date.now();
    
    // Remove expired requests
    const expiredRequests = this.requestQueue.filter(item => 
      item.deadline && item.deadline < now
    );
    
    for (const expired of expiredRequests) {
      this.requestQueue = this.requestQueue.filter(item => item.id !== expired.id);
      this.emit('requestExpired', expired);
    }

    // Update queue positions and wait times
    this.requestQueue.forEach((item, index) => {
      item.queuePosition = index;
      item.estimatedWaitTime = this.calculateEstimatedWaitTime(index);
    });

    // Emit queue metrics
    const metrics = this.getQueueMetrics();
    this.emit('queueMetricsUpdated', metrics);
  }

  private sortQueue(): void {
    this.requestQueue.sort((a, b) => {
      // Sort by priority first, then by timestamp
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.timestamp - b.timestamp;
    });
  }

  private calculateEstimatedWaitTime(position: number = this.requestQueue.length): number {
    const avgProcessingTime = 5000; // 5 seconds average
    const throughputPerSecond = this.calculateThroughput() / 1000;
    
    if (throughputPerSecond > 0) {
      return (position / throughputPerSecond) * 1000;
    }
    
    return position * avgProcessingTime;
  }

  private calculateThroughput(): number {
    const windowMs = 60000; // 1 minute window
    const now = Date.now();
    const recentDecisions = this.decisionHistory.filter(d => 
      now - d.timestamp <= windowMs
    );
    
    return recentDecisions.length; // Decisions per minute
  }

  private generateRequestId(): string {
    return `lb_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}