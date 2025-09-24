/**
 * HTTP Server for Claudette AI Middleware
 * Provides health checks, metrics, and API endpoints
 */

import * as http from 'http';
import * as url from 'url';
import { Claudette } from '../index';
import { ClaudetteRequest, ClaudetteResponse } from '../types';

export interface ServerMetrics {
  requests_total: number;
  requests_success: number;
  requests_error: number;
  latency_histogram: number[];
  backend_health: Map<string, boolean>;
  cache_hits: number;
  cache_misses: number;
  cost_total: number;
  start_time: number;
}

export class ClaudetteHttpServer {
  private server: http.Server;
  private claudette: Claudette;
  private metrics: ServerMetrics;
  private port: number;

  constructor(port: number = 3000) {
    this.port = port;
    this.claudette = new Claudette();
    this.metrics = {
      requests_total: 0,
      requests_success: 0,
      requests_error: 0,
      latency_histogram: [],
      backend_health: new Map(),
      cache_hits: 0,
      cache_misses: 0,
      cost_total: 0,
      start_time: Date.now()
    };

    this.server = http.createServer(this.handleRequest.bind(this));
  }

  async start(): Promise<void> {
    // Initialize Claudette
    await this.claudette.initialize();
    
    // Start periodic health checks
    this.startHealthChecks();

    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`🚀 Claudette HTTP Server running on port ${this.port}`);
        console.log(`📊 Health check: http://localhost:${this.port}/health`);
        console.log(`📈 Metrics: http://localhost:${this.port}/metrics`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    await this.claudette.cleanup();
    
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('🛑 Claudette HTTP Server stopped');
        resolve();
      });
    });
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const parsedUrl = url.parse(req.url || '', true);
    const path = parsedUrl.pathname || '';
    const method = req.method || 'GET';

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      switch (path) {
        case '/health':
          await this.handleHealthCheck(res);
          break;
        
        case '/metrics':
          await this.handleMetrics(res);
          break;
        
        case '/api/optimize':
          if (method === 'POST') {
            await this.handleOptimize(req, res);
          } else {
            this.send405(res, ['POST']);
          }
          break;
        
        case '/api/status':
          await this.handleStatus(res);
          break;
        
        case '/':
          this.handleRoot(res);
          break;
        
        default:
          this.send404(res);
      }
    } catch (error) {
      console.error('Server error:', error);
      this.send500(res, error instanceof Error ? error.message : 'Internal server error');
    }
  }

  private async handleHealthCheck(res: http.ServerResponse): Promise<void> {
    try {
      const healthResults = await this.getHealthResults();
      const healthyBackends = healthResults.filter(b => b.healthy).length;
      const totalBackends = healthResults.length;
      
      const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.metrics.start_time,
        backends: {
          healthy: healthyBackends,
          total: totalBackends,
          details: healthResults
        },
        metrics: {
          requests_total: this.metrics.requests_total,
          success_rate: this.metrics.requests_total > 0 
            ? this.metrics.requests_success / this.metrics.requests_total 
            : 0,
          avg_latency: this.metrics.latency_histogram.length > 0
            ? this.metrics.latency_histogram.reduce((a, b) => a + b, 0) / this.metrics.latency_histogram.length
            : 0
        }
      };

      // Determine overall health status
      if (healthyBackends === 0) {
        health.status = 'critical';
        res.writeHead(503, { 'Content-Type': 'application/json' });
      } else if (healthyBackends < totalBackends) {
        health.status = 'degraded';
        res.writeHead(200, { 'Content-Type': 'application/json' });
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
      }

      res.end(JSON.stringify(health, null, 2));
    } catch (error) {
      console.error('Health check error:', error);
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'error',
        error: error instanceof Error ? error.message : 'Health check failed'
      }));
    }
  }

  private async handleMetrics(res: http.ServerResponse): Promise<void> {
    try {
      const healthResults = await this.getHealthResults();
      const uptime = Date.now() - this.metrics.start_time;
      
      // Prometheus format metrics
      const prometheusMetrics = [
        '# HELP claudette_requests_total Total number of requests',
        '# TYPE claudette_requests_total counter',
        `claudette_requests_total ${this.metrics.requests_total}`,
        '',
        '# HELP claudette_requests_success_total Total number of successful requests',  
        '# TYPE claudette_requests_success_total counter',
        `claudette_requests_success_total ${this.metrics.requests_success}`,
        '',
        '# HELP claudette_requests_error_total Total number of failed requests',
        '# TYPE claudette_requests_error_total counter', 
        `claudette_requests_error_total ${this.metrics.requests_error}`,
        '',
        '# HELP claudette_uptime_seconds Uptime in seconds',
        '# TYPE claudette_uptime_seconds gauge',
        `claudette_uptime_seconds ${uptime / 1000}`,
        '',
        '# HELP claudette_backend_healthy Backend health status',
        '# TYPE claudette_backend_healthy gauge'
      ];

      // Add backend health metrics
      healthResults.forEach(backend => {
        prometheusMetrics.push(
          `claudette_backend_healthy{backend="${backend.name}",healthy="${backend.healthy}"} ${backend.healthy ? 1 : 0}`
        );
      });

      prometheusMetrics.push('');

      // Add latency metrics
      if (this.metrics.latency_histogram.length > 0) {
        const avgLatency = this.metrics.latency_histogram.reduce((a, b) => a + b, 0) / this.metrics.latency_histogram.length;
        prometheusMetrics.push(
          '# HELP claudette_request_duration_seconds Request duration in seconds',
          '# TYPE claudette_request_duration_seconds gauge',
          `claudette_request_duration_seconds ${avgLatency / 1000}`,
          ''
        );
      }

      // Add cache metrics
      const totalCacheRequests = this.metrics.cache_hits + this.metrics.cache_misses;
      if (totalCacheRequests > 0) {
        prometheusMetrics.push(
          '# HELP claudette_cache_hit_rate Cache hit rate',
          '# TYPE claudette_cache_hit_rate gauge',
          `claudette_cache_hit_rate ${this.metrics.cache_hits / totalCacheRequests}`,
          ''
        );
      }

      // Add cost metrics
      prometheusMetrics.push(
        '# HELP claudette_cost_total Total cost in EUR',
        '# TYPE claudette_cost_total gauge',
        `claudette_cost_total ${this.metrics.cost_total}`,
        ''
      );

      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(prometheusMetrics.join('\n'));
    } catch (error) {
      console.error('Metrics error:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error generating metrics');
    }
  }

  private async handleOptimize(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const startTime = Date.now();
    this.metrics.requests_total++;

    try {
      // Parse request body
      const body = await this.parseRequestBody(req);
      const requestData = JSON.parse(body);
      
      if (!requestData.prompt) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Prompt is required' }));
        this.metrics.requests_error++;
        return;
      }

      // Make request to Claudette
      const response = await this.claudette.optimize(
        requestData.prompt,
        requestData.files || [],
        requestData.options || {}
      );

      // Update metrics
      const latency = Date.now() - startTime;
      this.metrics.latency_histogram.push(latency);
      this.metrics.requests_success++;
      this.metrics.cost_total += response.cost_eur || 0;

      // Update cache metrics (simplified)
      if (response.cache_hit) {
        this.metrics.cache_hits++;
      } else {
        this.metrics.cache_misses++;
      }

      // Keep histogram size manageable
      if (this.metrics.latency_histogram.length > 1000) {
        this.metrics.latency_histogram = this.metrics.latency_histogram.slice(-500);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response, null, 2));
    } catch (error) {
      console.error('Optimize error:', error);
      this.metrics.requests_error++;
      
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: error instanceof Error ? error.message : 'Optimization failed'
      }));
    }
  }

  private async handleStatus(res: http.ServerResponse): Promise<void> {
    try {
      const config = this.claudette.getConfig();
      const healthResults = await this.getHealthResults();
      const routerStats = await this.getRouterStats();

      const status = {
        version: '1.0.5',
        status: 'running',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.metrics.start_time,
        configuration: {
          backends_configured: Object.keys(config.backends || {}).length,
          backends_enabled: Object.values(config.backends || {}).filter(b => b.enabled).length,
          cache_enabled: true // Assume cache is enabled
        },
        health: healthResults,
        router: routerStats,
        metrics: this.metrics
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(status, null, 2));
    } catch (error) {
      console.error('Status error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: error instanceof Error ? error.message : 'Status check failed'
      }));
    }
  }

  private handleRoot(res: http.ServerResponse): void {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Claudette AI Middleware</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 2px solid #007acc; padding-bottom: 10px; }
    .endpoint { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #007acc; }
    .method { color: #007acc; font-weight: bold; }
    .status { color: #28a745; }
    .link { color: #007acc; text-decoration: none; }
    .link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Claudette AI Middleware v1.0.5</h1>
    <p>Enterprise AI middleware with intelligent backend routing, cost optimization, and performance monitoring</p>
    
    <h2>Available Endpoints</h2>
    
    <div class="endpoint">
      <strong class="method">GET</strong> <a href="/health" class="link">/health</a>
      <p>Health check and system status</p>
    </div>
    
    <div class="endpoint">
      <strong class="method">GET</strong> <a href="/metrics" class="link">/metrics</a>
      <p>Prometheus metrics for monitoring</p>
    </div>
    
    <div class="endpoint">
      <strong class="method">POST</strong> <span>/api/optimize</span>
      <p>AI request routing endpoint with intelligent backend selection (requires JSON body with 'prompt' field)</p>
    </div>
    
    <div class="endpoint">
      <strong class="method">GET</strong> <a href="/api/status" class="link">/api/status</a>
      <p>Detailed system status and configuration</p>
    </div>
    
    <p><strong class="status">Status:</strong> <span class="status">Running</span></p>
    <p><strong>Repository:</strong> <a href="https://github.com/RobLe3/claudette" class="link">GitHub - claudette</a></p>
  </div>
</body>
</html>`;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  private send404(res: http.ServerResponse): void {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  private send405(res: http.ServerResponse, allowedMethods: string[]): void {
    res.writeHead(405, { 
      'Content-Type': 'application/json',
      'Allow': allowedMethods.join(', ')
    });
    res.end(JSON.stringify({ 
      error: 'Method not allowed',
      allowed_methods: allowedMethods 
    }));
  }

  private send500(res: http.ServerResponse, message: string): void {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: message }));
  }

  private parseRequestBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });
  }

  private startHealthChecks(): void {
    // Update backend health metrics every 30 seconds
    setInterval(async () => {
      try {
        const healthResults = await this.getHealthResults();
        this.metrics.backend_health.clear();
        healthResults.forEach(backend => {
          this.metrics.backend_health.set(backend.name, backend.healthy);
        });
      } catch (error) {
        console.error('Background health check error:', error);
      }
    }, 30000);
  }

  private async getHealthResults(): Promise<{ name: string; healthy: boolean; error?: string }[]> {
    // Use a public method or create a wrapper - for now, simulate the structure
    try {
      // This would need to be exposed through a public method on Claudette
      return Array.from(this.metrics.backend_health.entries()).map(([name, healthy]) => ({
        name,
        healthy
      }));
    } catch (error) {
      console.error('Health check error:', error);
      return [];
    }
  }

  private async getRouterStats(): Promise<any> {
    // Return basic stats - would need proper router access
    return {
      backends: Array.from(this.metrics.backend_health.entries()).map(([name, healthy]) => ({
        name,
        failures: 0,
        circuitBreakerOpen: !healthy
      })),
      routingOptions: {
        cost_weight: 0.4,
        latency_weight: 0.4,
        availability_weight: 0.2,
        fallback_enabled: true
      }
    };
  }
}

/**
 * Convenience function to start HTTP server
 */
export async function startHttpServer(port: number = 3000): Promise<ClaudetteHttpServer> {
  const server = new ClaudetteHttpServer(port);
  await server.start();
  return server;
}