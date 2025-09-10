/**
 * HTTP Connection Pool for Claudette Backend Requests
 * Provides connection reuse and performance optimization for HTTP requests
 */

import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

export interface ConnectionPoolConfig {
  maxConnections: number;
  maxIdleTime: number; // milliseconds
  requestTimeout: number;
  retryAttempts: number;
  keepAlive: boolean;
  maxSockets: number;
  maxFreeSockets: number;
}

export interface PoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  requestsServed: number;
  connectionReuse: number;
  averageLatency: number;
  errorRate: number;
}

export class ConnectionPool {
  private httpAgent: http.Agent;
  private httpsAgent: https.Agent;
  private stats: PoolStats;
  private requestHistory: Array<{ timestamp: number; duration: number; success: boolean }> = [];
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private config: ConnectionPoolConfig) {
    // Initialize HTTP agent with connection pooling
    this.httpAgent = new http.Agent({
      keepAlive: config.keepAlive,
      maxSockets: config.maxSockets,
      maxFreeSockets: config.maxFreeSockets,
      timeout: config.requestTimeout,
      scheduling: 'fifo' // First in, first out scheduling
    });

    // Initialize HTTPS agent with connection pooling
    this.httpsAgent = new https.Agent({
      keepAlive: config.keepAlive,
      maxSockets: config.maxSockets,
      maxFreeSockets: config.maxFreeSockets,
      timeout: config.requestTimeout,
      scheduling: 'fifo'
    });

    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      requestsServed: 0,
      connectionReuse: 0,
      averageLatency: 0,
      errorRate: 0
    };

    this.startCleanupInterval();
  }

  /**
   * Get appropriate agent for URL
   */
  getAgent(url: string): http.Agent | https.Agent {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'https:' ? this.httpsAgent : this.httpAgent;
  }

  /**
   * Make HTTP request using connection pool
   */
  async request(
    url: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
      timeout?: number;
    } = {}
  ): Promise<{
    status: number;
    headers: Record<string, string>;
    body: string;
    connectionReused: boolean;
    latency: number;
  }> {
    const startTime = Date.now();
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount <= this.config.retryAttempts) {
      try {
        const result = await this.makeRequest(url, options, startTime);
        
        // Track successful request
        const latency = Date.now() - startTime;
        this.recordRequest(latency, true);
        
        return result;
      } catch (error) {
        lastError = error as Error;
        retryCount++;
        
        if (retryCount <= this.config.retryAttempts) {
          // Exponential backoff for retries
          const backoffTime = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
          await this.delay(backoffTime);
        }
      }
    }

    // Track failed request
    const latency = Date.now() - startTime;
    this.recordRequest(latency, false);
    
    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Internal request implementation
   */
  private async makeRequest(
    url: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
      timeout?: number;
    },
    startTime: number
  ): Promise<{
    status: number;
    headers: Record<string, string>;
    body: string;
    connectionReused: boolean;
    latency: number;
  }> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const agent = this.getAgent(url);
      
      const requestOptions: http.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'Claudette/3.0.0',
          'Connection': 'keep-alive',
          ...options.headers
        },
        agent,
        timeout: options.timeout || this.config.requestTimeout
      };

      // Add content length for POST requests
      if (options.body) {
        (requestOptions.headers as any)['Content-Length'] = Buffer.byteLength(options.body);
      }

      const moduleToUse = isHttps ? https : http;
      let connectionReused = false;

      const request = moduleToUse.request(requestOptions, (response) => {
        let responseBody = '';
        
        response.on('data', (chunk) => {
          responseBody += chunk;
        });

        response.on('end', () => {
          const latency = Date.now() - startTime;
          
          // Check if connection was reused
          connectionReused = response.socket && (response.socket as any).reusedSocket === true;
          if (connectionReused) {
            this.stats.connectionReuse++;
          }

          this.stats.requestsServed++;

          resolve({
            status: response.statusCode || 0,
            headers: response.headers as Record<string, string>,
            body: responseBody,
            connectionReused,
            latency
          });
        });
      });

      request.on('error', (error) => {
        reject(error);
      });

      request.on('timeout', () => {
        request.destroy();
        reject(new Error(`Request timeout after ${requestOptions.timeout}ms`));
      });

      // Write request body if provided
      if (options.body) {
        request.write(options.body);
      }

      request.end();
    });
  }

  /**
   * Record request statistics
   */
  private recordRequest(latency: number, success: boolean): void {
    this.requestHistory.push({
      timestamp: Date.now(),
      duration: latency,
      success
    });

    // Keep history manageable (last 1000 requests)
    if (this.requestHistory.length > 1000) {
      this.requestHistory = this.requestHistory.slice(-500);
    }

    this.updateStats();
  }

  /**
   * Update aggregated statistics
   */
  private updateStats(): void {
    const recentHistory = this.requestHistory.slice(-100); // Last 100 requests
    
    if (recentHistory.length > 0) {
      this.stats.averageLatency = recentHistory.reduce((sum, req) => sum + req.duration, 0) / recentHistory.length;
      this.stats.errorRate = (recentHistory.filter(req => !req.success).length / recentHistory.length) * 100;
    }

    // Update connection counts from agents
    this.updateConnectionCounts();
  }

  /**
   * Update connection count statistics from agents
   */
  private updateConnectionCounts(): void {
    // Get socket counts from HTTP agent
    const httpSockets = (this.httpAgent as any).getCurrentConnections ? (this.httpAgent as any).getCurrentConnections() : 0;
    const httpFreeSockets = Object.keys((this.httpAgent as any).freeSockets || {}).length;
    
    // Get socket counts from HTTPS agent  
    const httpsSockets = (this.httpsAgent as any).getCurrentConnections ? (this.httpsAgent as any).getCurrentConnections() : 0;
    const httpsFreeSockets = Object.keys((this.httpsAgent as any).freeSockets || {}).length;

    this.stats.totalConnections = httpSockets + httpsSockets;
    this.stats.activeConnections = (httpSockets - httpFreeSockets) + (httpsSockets - httpsFreeSockets);
    this.stats.idleConnections = httpFreeSockets + httpsFreeSockets;
  }

  /**
   * Get current pool statistics
   */
  getStats(): PoolStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get detailed connection information
   */
  getDetailedStats(): {
    config: ConnectionPoolConfig;
    stats: PoolStats;
    recentRequests: Array<{ timestamp: number; duration: number; success: boolean }>;
    agentInfo: {
      http: {
        maxSockets: number;
        maxFreeSockets: number;
        keepAlive: boolean;
      };
      https: {
        maxSockets: number;
        maxFreeSockets: number;
        keepAlive: boolean;
      };
    };
  } {
    return {
      config: { ...this.config },
      stats: this.getStats(),
      recentRequests: this.requestHistory.slice(-20), // Last 20 requests
      agentInfo: {
        http: {
          maxSockets: this.httpAgent.maxSockets,
          maxFreeSockets: this.httpAgent.maxFreeSockets,
          keepAlive: (this.httpAgent as any).keepAlive
        },
        https: {
          maxSockets: this.httpsAgent.maxSockets,
          maxFreeSockets: this.httpsAgent.maxFreeSockets,
          keepAlive: (this.httpsAgent as any).keepAlive
        }
      }
    };
  }

  /**
   * Warm up connections to specific hosts
   */
  async warmup(urls: string[]): Promise<void> {
    console.log(`[ConnectionPool] Warming up connections to ${urls.length} hosts...`);
    
    const warmupPromises = urls.map(async (url) => {
      try {
        await this.request(url, {
          method: 'HEAD',
          timeout: 5000
        });
      } catch (error) {
        // Ignore warmup failures
        console.warn(`[ConnectionPool] Warmup failed for ${url}:`, (error as Error).message);
      }
    });

    await Promise.allSettled(warmupPromises);
    console.log(`[ConnectionPool] Warmup completed. Active connections: ${this.stats.activeConnections}`);
  }

  /**
   * Close all connections and cleanup
   */
  async destroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Close all agent connections
    this.httpAgent.destroy();
    this.httpsAgent.destroy();

    console.log('[ConnectionPool] Connection pool destroyed');
  }

  /**
   * Start periodic cleanup of idle connections
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, this.config.maxIdleTime);
  }

  /**
   * Cleanup idle connections that exceed max idle time
   */
  private cleanupIdleConnections(): void {
    // HTTP agent cleanup
    const httpFreeSockets = (this.httpAgent as any).freeSockets || {};
    const now = Date.now();
    
    for (const [key, sockets] of Object.entries(httpFreeSockets)) {
      const socketsArray = sockets as any[];
      for (let i = socketsArray.length - 1; i >= 0; i--) {
        const socket = socketsArray[i];
        if (socket._idleStart && (now - socket._idleStart) > this.config.maxIdleTime) {
          socket.destroy();
          socketsArray.splice(i, 1);
        }
      }
    }

    // HTTPS agent cleanup (similar logic)
    const httpsFreeSockets = (this.httpsAgent as any).freeSockets || {};
    for (const [key, sockets] of Object.entries(httpsFreeSockets)) {
      const socketsArray = sockets as any[];
      for (let i = socketsArray.length - 1; i >= 0; i--) {
        const socket = socketsArray[i];
        if (socket._idleStart && (now - socket._idleStart) > this.config.maxIdleTime) {
          socket.destroy();
          socketsArray.splice(i, 1);
        }
      }
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get performance recommendations
   */
  getRecommendations(): Array<{
    type: 'optimization' | 'warning' | 'info';
    message: string;
    impact: 'low' | 'medium' | 'high';
  }> {
    const recommendations: Array<{
      type: 'optimization' | 'warning' | 'info';
      message: string;
      impact: 'low' | 'medium' | 'high';
    }> = [];

    const stats = this.getStats();

    if (stats.connectionReuse / Math.max(stats.requestsServed, 1) < 0.5) {
      recommendations.push({
        type: 'optimization',
        message: 'Low connection reuse rate. Consider increasing maxFreeSockets.',
        impact: 'medium'
      });
    }

    if (stats.errorRate > 5) {
      recommendations.push({
        type: 'warning',
        message: `High error rate (${stats.errorRate.toFixed(1)}%). Check network conditions.`,
        impact: 'high'
      });
    }

    if (stats.averageLatency > 5000) {
      recommendations.push({
        type: 'warning',
        message: 'High average latency detected. Consider timeout optimization.',
        impact: 'medium'
      });
    }

    if (stats.totalConnections > this.config.maxSockets * 0.8) {
      recommendations.push({
        type: 'optimization',
        message: 'Approaching max connection limit. Consider increasing maxSockets.',
        impact: 'medium'
      });
    }

    return recommendations;
  }
}

// Global connection pool instance
export const globalConnectionPool = new ConnectionPool({
  maxConnections: 100,
  maxIdleTime: 60000, // 1 minute
  requestTimeout: 30000, // 30 seconds
  retryAttempts: 2,
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10
});

export default ConnectionPool;