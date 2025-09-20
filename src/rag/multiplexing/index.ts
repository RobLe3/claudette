// MCP Multiplexing System - Main Export Module
// Exports all multiplexing components and provides easy access to the system

// Core multiplexing components
export { MCPServerPoolManager, MCPServerInstance, PoolConfiguration, RequestQueueItem } from './mcp-server-pool-manager';
export { IntelligentRequestRouter, RoutingRule, RoutingDecision, RequestContext, RoutingMetrics } from './intelligent-request-router';
export { HealthMonitor, CircuitBreakerState, CircuitBreakerConfig, HealthCheckResult, CircuitBreakerMetrics, HealthDashboard } from './health-monitor';
export { AdvancedLoadBalancer, LoadBalancingStrategy, LoadBalancerConfig, LoadBalancingDecision, StrategyPerformance, QueueMetrics } from './load-balancer';

// Main multiplexer and enhanced RAG provider
export { MCPMultiplexer, MultiplexerConfiguration, MultiplexerStatus, FailoverEvent } from './mcp-multiplexer';
export { EnhancedMCPRAGProvider, EnhancedMCPConfig } from './enhanced-mcp-rag';

// Configuration factory and helpers
export { MultiplexingConfigFactory } from './config-factory';

// Re-export types from base RAG
export { RAGRequest, RAGResponse, RAGError } from '../types';