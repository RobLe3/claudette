// Types for MCP multiplexing system
export * from '../types';

// Additional types specific to multiplexing
export interface LoadBalancingStrategy {
  type: 'round-robin' | 'weighted' | 'least-connections' | 'random' | 'capability-based';
  options?: {
    weights?: Record<string, number>;
    enableFailover?: boolean;
  };
}

export interface MultiplexerStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  activeConnections: number;
}

export interface ServerHealth {
  id: string;
  healthy: boolean;
  lastCheck: Date;
  consecutiveFailures: number;
  responseTime?: number;
}