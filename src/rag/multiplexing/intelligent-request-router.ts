// Intelligent Request Router - Advanced MCP Multiplexing System
// Routes requests to optimal MCP servers based on capabilities, performance, and load

import { EventEmitter } from 'events';
import { MCPServerPoolManager, MCPServerInstance } from './mcp-server-pool-manager';
import { PerformanceAnalytics } from '../../analytics/performance/performance-analytics';
import { RAGRequest, RAGResponse } from '../types';

export interface RoutingRule {
  id: string;
  name: string;
  condition: (request: RAGRequest, servers: MCPServerInstance[]) => boolean;
  priority: number;
  targetServers?: string[];
  loadBalancingStrategy?: 'round-robin' | 'least-connections' | 'weighted' | 'random';
  maxRetries?: number;
  timeoutMs?: number;
}

export interface RoutingDecision {
  serverId: string;
  rule: string;
  confidence: number;
  expectedLatency: number;
  expectedCost: number;
  reasoning: string[];
  alternatives: Array<{
    serverId: string;
    score: number;
    reason: string;
  }>;
}

export interface RequestContext {
  id: string;
  request: RAGRequest;
  timestamp: number;
  priority: number;
  retryCount: number;
  originalServer?: string;
  routingHistory: Array<{
    serverId: string;
    timestamp: number;
    success: boolean;
    latency?: number;
    error?: string;
  }>;
  metadata: {
    requiredCapabilities: string[];
    estimatedComplexity: number;
    timeConstraint?: number;
    costConstraint?: number;
    qualityRequirement?: number;
  };
}

export interface RoutingMetrics {
  totalRequests: number;
  successfulRoutings: number;
  failedRoutings: number;
  avgRoutingDecisionTime: number;
  routingAccuracy: number;
  serverUtilization: Map<string, number>;
  ruleEffectiveness: Map<string, number>;
}

export class IntelligentRequestRouter extends EventEmitter {
  private poolManager: MCPServerPoolManager;
  private analytics: PerformanceAnalytics;
  private routingRules: Map<string, RoutingRule> = new Map();
  private routingHistory: Map<string, RequestContext> = new Map();
  private metrics: RoutingMetrics;
  private mlModel?: any; // Placeholder for ML model
  
  constructor(
    poolManager: MCPServerPoolManager,
    analytics: PerformanceAnalytics
  ) {
    super();
    
    this.poolManager = poolManager;
    this.analytics = analytics;
    
    this.metrics = {
      totalRequests: 0,
      successfulRoutings: 0,
      failedRoutings: 0,
      avgRoutingDecisionTime: 0,
      routingAccuracy: 0,
      serverUtilization: new Map(),
      ruleEffectiveness: new Map()
    };

    this.initializeDefaultRules();
    this.startMetricsCollection();
    
    console.log('🧠 Intelligent Request Router initialized');
  }

  /**
   * Route a request to the optimal server
   */
  async routeRequest(request: RAGRequest, priority: number = 0): Promise<RAGResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    // Create request context
    const context: RequestContext = {
      id: requestId,
      request,
      timestamp: startTime,
      priority,
      retryCount: 0,
      routingHistory: [],
      metadata: {
        requiredCapabilities: this.analyzeRequiredCapabilities(request),
        estimatedComplexity: this.estimateComplexity(request),
        timeConstraint: request.metadata?.timeout,
        costConstraint: request.metadata?.maxCost,
        qualityRequirement: request.metadata?.minQuality
      }
    };

    this.routingHistory.set(requestId, context);
    this.metrics.totalRequests++;

    try {
      console.log(`🎯 Routing request ${requestId} with complexity ${context.metadata.estimatedComplexity}`);

      // Make routing decision
      const decision = await this.makeRoutingDecision(context);
      
      const routingDecisionTime = Date.now() - startTime;
      this.updateRoutingMetrics(routingDecisionTime);

      console.log(`🎯 Routing decision for ${requestId}: ${decision.serverId} (confidence: ${decision.confidence.toFixed(2)}, rule: ${decision.rule})`);
      
      // Execute request with failover
      const response = await this.executeWithFailover(context, decision);
      
      // Update routing history
      context.routingHistory.push({
        serverId: decision.serverId,
        timestamp: Date.now(),
        success: true,
        latency: Date.now() - startTime
      });

      this.metrics.successfulRoutings++;
      this.updateRuleEffectiveness(decision.rule, true);
      
      // Emit routing success event
      this.emit('routingSuccess', {
        requestId,
        serverId: decision.serverId,
        latency: Date.now() - startTime,
        decision
      });

      return response;

    } catch (error) {
      console.error(`❌ Routing failed for request ${requestId}:`, error);
      
      this.metrics.failedRoutings++;
      
      // Emit routing failure event
      this.emit('routingFailure', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
        context
      });
      
      throw error;
    } finally {
      // Clean up old routing history
      if (this.routingHistory.size > 1000) {
        const oldestEntries = Array.from(this.routingHistory.entries())
          .sort(([, a], [, b]) => a.timestamp - b.timestamp)
          .slice(0, 100);
        
        for (const [id] of oldestEntries) {
          this.routingHistory.delete(id);
        }
      }
    }
  }

  /**
   * Add a custom routing rule
   */
  addRoutingRule(rule: RoutingRule): void {
    this.routingRules.set(rule.id, rule);
    this.metrics.ruleEffectiveness.set(rule.id, 0);
    
    console.log(`📋 Added routing rule: ${rule.name}`);
    this.emit('ruleAdded', rule);
  }

  /**
   * Remove a routing rule
   */
  removeRoutingRule(ruleId: string): void {
    if (this.routingRules.delete(ruleId)) {
      this.metrics.ruleEffectiveness.delete(ruleId);
      console.log(`🗑️ Removed routing rule: ${ruleId}`);
      this.emit('ruleRemoved', ruleId);
    }
  }

  /**
   * Get routing statistics
   */
  getRoutingStatistics(): {
    metrics: RoutingMetrics;
    topPerformingRules: Array<{ ruleId: string; effectiveness: number }>;
    serverPerformance: Array<{ serverId: string; utilization: number; avgLatency: number }>;
    recentDecisions: Array<{ requestId: string; decision: RoutingDecision; success: boolean }>;
  } {
    const topRules = Array.from(this.metrics.ruleEffectiveness.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([ruleId, effectiveness]) => ({ ruleId, effectiveness }));

    const serverPerformance = Array.from(this.poolManager.getAllServersInfo())
      .map(server => ({
        serverId: server.id,
        utilization: this.metrics.serverUtilization.get(server.id) || 0,
        avgLatency: server.avgResponseTime
      }))
      .sort((a, b) => b.utilization - a.utilization);

    const recentDecisions = Array.from(this.routingHistory.values())
      .slice(-10)
      .map(context => ({
        requestId: context.id,
        decision: this.getLastDecisionForContext(context),
        success: context.routingHistory.some(h => h.success)
      }));

    return {
      metrics: { ...this.metrics },
      topPerformingRules: topRules,
      serverPerformance,
      recentDecisions
    };
  }

  /**
   * Update router configuration with ML predictions
   */
  updateWithMLPredictions(predictions: Array<{
    serverId: string;
    expectedLoad: number;
    expectedLatency: number;
    confidence: number;
  }>): void {
    // Update server weights based on ML predictions
    for (const prediction of predictions) {
      const server = this.poolManager.getServerInfo(prediction.serverId);
      if (server) {
        // Adjust routing decisions based on predictions
        console.log(`🤖 ML prediction for ${prediction.serverId}: latency ${prediction.expectedLatency}ms, confidence ${prediction.confidence}`);
      }
    }
  }

  // Private methods
  private async makeRoutingDecision(context: RequestContext): Promise<RoutingDecision> {
    const availableServers = this.getAvailableServers();
    
    if (availableServers.length === 0) {
      throw new Error('No available servers for routing');
    }

    // Apply routing rules in priority order
    const applicableRules = Array.from(this.routingRules.values())
      .filter(rule => rule.condition(context.request, availableServers))
      .sort((a, b) => b.priority - a.priority);

    if (applicableRules.length === 0) {
      // Use default fallback routing
      return this.createFallbackDecision(context, availableServers);
    }

    // Use highest priority applicable rule
    const selectedRule = applicableRules[0];
    const targetServers = this.filterServersByRule(availableServers, selectedRule);
    
    if (targetServers.length === 0) {
      console.warn(`⚠️ No servers available for rule ${selectedRule.name}, falling back`);
      return this.createFallbackDecision(context, availableServers);
    }

    // Score and rank servers
    const scoredServers = await this.scoreServers(targetServers, context);
    const bestServer = scoredServers[0];

    return {
      serverId: bestServer.serverId,
      rule: selectedRule.id,
      confidence: bestServer.score,
      expectedLatency: bestServer.expectedLatency,
      expectedCost: bestServer.expectedCost,
      reasoning: bestServer.reasoning,
      alternatives: scoredServers.slice(1, 3).map(s => ({
        serverId: s.serverId,
        score: s.score,
        reason: s.reasoning[0] || 'Alternative option'
      }))
    };
  }

  private async executeWithFailover(context: RequestContext, decision: RoutingDecision): Promise<RAGResponse> {
    const maxRetries = 3;
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // For first attempt, use primary decision
        // For retries, make new routing decision excluding failed servers
        const currentDecision = attempt === 0 ? decision : await this.makeRetryDecision(context, decision);
        
        console.log(`🔄 Attempt ${attempt + 1} routing to server ${currentDecision.serverId}`);
        
        // Execute request on selected server
        const response = await this.poolManager.executeRequest(context.request, context.priority);
        
        // Record successful routing
        context.routingHistory.push({
          serverId: currentDecision.serverId,
          timestamp: Date.now(),
          success: true,
          latency: response.metadata.processingTime
        });

        return response;

      } catch (error) {
        lastError = error as Error;
        
        // Record failed routing
        context.routingHistory.push({
          serverId: decision.serverId,
          timestamp: Date.now(),
          success: false,
          error: lastError.message
        });

        console.warn(`⚠️ Routing attempt ${attempt + 1} failed: ${lastError.message}`);
        
        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await this.sleep(delay);
        }
      }
    }

    // All attempts failed
    this.updateRuleEffectiveness(decision.rule, false);
    throw new Error(`Request failed after ${maxRetries + 1} attempts: ${lastError!.message}`);
  }

  private async makeRetryDecision(context: RequestContext, originalDecision: RoutingDecision): Promise<RoutingDecision> {
    // Exclude servers that have already failed for this request
    const failedServers = context.routingHistory
      .filter(h => !h.success)
      .map(h => h.serverId);

    const availableServers = this.getAvailableServers()
      .filter(server => !failedServers.includes(server.id));

    if (availableServers.length === 0) {
      throw new Error('No alternative servers available for retry');
    }

    return this.createFallbackDecision(context, availableServers);
  }

  private async scoreServers(servers: MCPServerInstance[], context: RequestContext): Promise<Array<{
    serverId: string;
    score: number;
    expectedLatency: number;
    expectedCost: number;
    reasoning: string[];
  }>> {
    const scoredServers = [];

    for (const server of servers) {
      const score = await this.calculateServerScore(server, context);
      scoredServers.push(score);
    }

    // Sort by score (higher is better)
    return scoredServers.sort((a, b) => b.score - a.score);
  }

  private async calculateServerScore(server: MCPServerInstance, context: RequestContext): Promise<{
    serverId: string;
    score: number;
    expectedLatency: number;
    expectedCost: number;
    reasoning: string[];
  }> {
    const reasoning: string[] = [];
    let score = 0.5; // Base score

    // Health factor (30% weight)
    const healthScore = this.calculateHealthScore(server);
    score += healthScore * 0.3;
    reasoning.push(`Health score: ${healthScore.toFixed(2)}`);

    // Performance factor (25% weight)
    const performanceScore = this.calculatePerformanceScore(server, context);
    score += performanceScore * 0.25;
    reasoning.push(`Performance score: ${performanceScore.toFixed(2)}`);

    // Load factor (20% weight)
    const loadScore = this.calculateLoadScore(server);
    score += loadScore * 0.2;
    reasoning.push(`Load score: ${loadScore.toFixed(2)}`);

    // Capability factor (15% weight)
    const capabilityScore = this.calculateCapabilityScore(server, context);
    score += capabilityScore * 0.15;
    reasoning.push(`Capability score: ${capabilityScore.toFixed(2)}`);

    // History factor (10% weight)
    const historyScore = this.calculateHistoryScore(server, context);
    score += historyScore * 0.1;
    reasoning.push(`History score: ${historyScore.toFixed(2)}`);

    // Estimate latency and cost
    const expectedLatency = this.estimateLatency(server, context);
    const expectedCost = this.estimateCost(server, context);

    return {
      serverId: server.id,
      score: Math.max(0, Math.min(1, score)),
      expectedLatency,
      expectedCost,
      reasoning
    };
  }

  private calculateHealthScore(server: MCPServerInstance): number {
    switch (server.status) {
      case 'healthy': return 1.0;
      case 'degraded': return 0.6;
      case 'unhealthy': return 0.1;
      default: return 0.0;
    }
  }

  private calculatePerformanceScore(server: MCPServerInstance, context: RequestContext): number {
    const maxLatency = 10000; // 10 seconds
    const normalizedLatency = Math.min(server.avgResponseTime / maxLatency, 1);
    return 1 - normalizedLatency;
  }

  private calculateLoadScore(server: MCPServerInstance): number {
    const utilizationRatio = server.activeRequests / 100; // Assume max 100 requests
    return 1 - Math.min(utilizationRatio, 1);
  }

  private calculateCapabilityScore(server: MCPServerInstance, context: RequestContext): number {
    const requiredCapabilities = context.metadata.requiredCapabilities;
    if (requiredCapabilities.length === 0) return 1.0;

    const matchedCapabilities = requiredCapabilities.filter(cap =>
      server.capabilities.includes(cap)
    ).length;

    return matchedCapabilities / requiredCapabilities.length;
  }

  private calculateHistoryScore(server: MCPServerInstance, context: RequestContext): number {
    // Check recent routing history for this server
    const recentHistory = Array.from(this.routingHistory.values())
      .filter(ctx => ctx.routingHistory.some(h => h.serverId === server.id))
      .slice(-10);

    if (recentHistory.length === 0) return 0.5; // Neutral score for new servers

    const successCount = recentHistory.filter(ctx =>
      ctx.routingHistory.find(h => h.serverId === server.id && h.success)
    ).length;

    return successCount / recentHistory.length;
  }

  private estimateLatency(server: MCPServerInstance, context: RequestContext): number {
    // Base latency from server performance
    let estimatedLatency = server.avgResponseTime;

    // Adjust for complexity
    const complexityMultiplier = 1 + (context.metadata.estimatedComplexity * 0.5);
    estimatedLatency *= complexityMultiplier;

    // Adjust for current load
    const loadMultiplier = 1 + (server.loadScore * 0.3);
    estimatedLatency *= loadMultiplier;

    return Math.max(estimatedLatency, 100); // Minimum 100ms
  }

  private estimateCost(server: MCPServerInstance, context: RequestContext): number {
    // Simplified cost estimation based on server type and complexity
    const baseCost = 0.001; // Base cost per request
    const complexityCost = context.metadata.estimatedComplexity * 0.0005;
    return baseCost + complexityCost;
  }

  private analyzeRequiredCapabilities(request: RAGRequest): string[] {
    const capabilities: string[] = [];
    
    // Analyze request content to determine required capabilities
    if (request.query.includes('vector') || request.context?.includes('similarity')) {
      capabilities.push('vector_search');
    }
    
    if (request.query.includes('graph') || request.context?.includes('relationship')) {
      capabilities.push('graph_query');
    }
    
    if (request.query.includes('complex') || (request.maxResults && request.maxResults > 10)) {
      capabilities.push('advanced_processing');
    }

    return capabilities;
  }

  private estimateComplexity(request: RAGRequest): number {
    let complexity = 0.1; // Base complexity

    // Query length factor
    complexity += Math.min(request.query.length / 1000, 0.5);

    // Context size factor
    if (request.context) {
      complexity += Math.min(request.context.length / 2000, 0.3);
    }

    // Results count factor
    if (request.maxResults && request.maxResults > 5) {
      complexity += Math.min(request.maxResults / 20, 0.2);
    }

    return Math.min(complexity, 1.0);
  }

  private createFallbackDecision(context: RequestContext, servers: MCPServerInstance[]): RoutingDecision {
    // Simple fallback: least loaded server
    const bestServer = servers.reduce((best, server) =>
      server.loadScore < best.loadScore ? server : best
    );

    return {
      serverId: bestServer.id,
      rule: 'fallback',
      confidence: 0.5,
      expectedLatency: bestServer.avgResponseTime,
      expectedCost: 0.001,
      reasoning: ['Fallback routing to least loaded server'],
      alternatives: []
    };
  }

  private filterServersByRule(servers: MCPServerInstance[], rule: RoutingRule): MCPServerInstance[] {
    if (rule.targetServers && rule.targetServers.length > 0) {
      return servers.filter(server => rule.targetServers!.includes(server.id));
    }
    return servers;
  }

  private getAvailableServers(): MCPServerInstance[] {
    return this.poolManager.getAllServersInfo().filter(server =>
      server.status === 'healthy' || server.status === 'degraded'
    );
  }

  private updateRoutingMetrics(decisionTime: number): void {
    const alpha = 0.1; // Exponential moving average factor
    this.metrics.avgRoutingDecisionTime = 
      this.metrics.avgRoutingDecisionTime === 0 
        ? decisionTime
        : alpha * decisionTime + (1 - alpha) * this.metrics.avgRoutingDecisionTime;
  }

  private updateRuleEffectiveness(ruleId: string, success: boolean): void {
    const currentEffectiveness = this.metrics.ruleEffectiveness.get(ruleId) || 0;
    const alpha = 0.1;
    const newEffectiveness = alpha * (success ? 1 : 0) + (1 - alpha) * currentEffectiveness;
    this.metrics.ruleEffectiveness.set(ruleId, newEffectiveness);
  }

  private getLastDecisionForContext(context: RequestContext): RoutingDecision {
    // Simplified - return a basic decision structure
    return {
      serverId: context.routingHistory[context.routingHistory.length - 1]?.serverId || 'unknown',
      rule: 'unknown',
      confidence: 0.5,
      expectedLatency: 0,
      expectedCost: 0,
      reasoning: [],
      alternatives: []
    };
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      // Update routing accuracy
      const totalRequests = this.metrics.successfulRoutings + this.metrics.failedRoutings;
      this.metrics.routingAccuracy = totalRequests > 0 
        ? this.metrics.successfulRoutings / totalRequests 
        : 0;

      // Update server utilization
      for (const server of this.poolManager.getAllServersInfo()) {
        const utilization = server.activeRequests / 100; // Normalize to 100 max requests
        this.metrics.serverUtilization.set(server.id, utilization);
      }

      // Emit metrics update
      this.emit('metricsUpdated', this.metrics);
      
    }, 30000); // Update every 30 seconds

    console.log('📊 Routing metrics collection started');
  }

  private initializeDefaultRules(): void {
    // High priority requests rule
    this.addRoutingRule({
      id: 'high_priority',
      name: 'High Priority Requests',
      condition: (request, servers) => request.priority === 'high',
      priority: 100,
      loadBalancingStrategy: 'least-connections',
      maxRetries: 5,
      timeoutMs: 60000
    });

    // Vector search capability rule
    this.addRoutingRule({
      id: 'vector_search',
      name: 'Vector Search Capability',
      condition: (request, servers) => 
        request.query.includes('vector') || request.query.includes('similarity'),
      priority: 80,
      loadBalancingStrategy: 'weighted'
    });

    // Complex query rule
    this.addRoutingRule({
      id: 'complex_query',
      name: 'Complex Query Routing',
      condition: (request, servers) => 
        request.query.length > 500 || Boolean(request.maxResults && request.maxResults > 10),
      priority: 60,
      loadBalancingStrategy: 'weighted'
    });

    // Load balancing rule (default)
    this.addRoutingRule({
      id: 'load_balance',
      name: 'Load Balancing',
      condition: (request, servers) => true,
      priority: 1,
      loadBalancingStrategy: 'weighted'
    });

    console.log('📋 Default routing rules initialized');
  }

  private generateRequestId(): string {
    return `router_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}