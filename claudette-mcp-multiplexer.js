#!/usr/bin/env node
/**
 * Claudette MCP Server Multiplexer
 * Spawns and manages multiple MCP server instances for high availability
 * and load distribution when instances are busy
 */

const { spawn, fork } = require('child_process');
const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class MCPServerInstance {
  constructor(id, serverPath, config) {
    this.id = id;
    this.serverPath = serverPath;
    this.config = config;
    this.process = null;
    this.status = 'stopped'; // stopped, starting, ready, busy, error, stopping
    this.health = 'unknown'; // healthy, degraded, unhealthy
    this.startTime = null;
    this.lastActivity = null;
    this.activeRequests = 0;
    this.totalRequests = 0;
    this.failureCount = 0;
    this.averageResponseTime = 0;
    this.responseTimes = [];
    this.inputBuffer = '';
    this.pendingRequests = new Map();
    this.nextRequestId = 1;
  }

  async start() {
    if (this.status !== 'stopped') {
      throw new Error(`Cannot start instance ${this.id} - current status: ${this.status}`);
    }

    console.log(`[MCP-Multiplexer] Starting instance ${this.id}`);
    this.status = 'starting';
    this.startTime = Date.now();

    try {
      this.process = spawn('node', [this.serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, MCP_INSTANCE_ID: this.id }
      });

      this.setupProcessHandlers();
      
      // Wait for ready signal
      await this.waitForReady();
      
      this.status = 'ready';
      this.health = 'healthy';
      console.log(`[MCP-Multiplexer] Instance ${this.id} is ready`);
      
      return true;
    } catch (error) {
      console.error(`[MCP-Multiplexer] Failed to start instance ${this.id}:`, error);
      this.status = 'error';
      this.health = 'unhealthy';
      this.failureCount++;
      throw error;
    }
  }

  async stop() {
    if (this.status === 'stopped' || this.status === 'stopping') {
      return;
    }

    console.log(`[MCP-Multiplexer] Stopping instance ${this.id}`);
    this.status = 'stopping';

    if (this.process) {
      // Graceful shutdown
      this.process.kill('SIGTERM');
      
      // Force kill after timeout
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          console.warn(`[MCP-Multiplexer] Force killing instance ${this.id}`);
          this.process.kill('SIGKILL');
        }
      }, this.config.shutdownTimeout || 10000);
    }

    this.status = 'stopped';
    this.health = 'unknown';
  }

  async sendRequest(request) {
    if (this.status !== 'ready') {
      throw new Error(`Instance ${this.id} not ready (status: ${this.status})`);
    }

    return new Promise((resolve, reject) => {
      const requestId = this.nextRequestId++;
      const startTime = Date.now();
      
      // Add internal request tracking
      const internalRequest = {
        ...request,
        id: requestId
      };

      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        startTime,
        originalId: request.id
      });

      this.activeRequests++;
      this.status = this.activeRequests >= this.config.maxConcurrentRequests ? 'busy' : 'ready';

      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        this.activeRequests = Math.max(0, this.activeRequests - 1);
        this.updateStatus();
        reject(new Error(`Request timeout after ${this.config.requestTimeout}ms`));
      }, this.config.requestTimeout || 60000);

      this.pendingRequests.get(requestId).timeout = timeout;

      // Send request
      try {
        this.process.stdin.write(JSON.stringify(internalRequest) + '\n');
        this.lastActivity = Date.now();
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        this.activeRequests = Math.max(0, this.activeRequests - 1);
        this.updateStatus();
        reject(error);
      }
    });
  }

  setupProcessHandlers() {
    this.process.stdout.on('data', (data) => {
      this.inputBuffer += data.toString();
      this.processMessages();
    });

    this.process.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message.includes('[MCP] MCP_RAG_READY')) {
        this.emit('ready');
      }
      // Log other stderr messages
      if (!message.includes('[MCP]')) {
        console.error(`[MCP-Instance-${this.id}] ${message}`);
      }
    });

    this.process.on('close', (code) => {
      console.log(`[MCP-Multiplexer] Instance ${this.id} closed with code ${code}`);
      this.status = 'stopped';
      this.health = code === 0 ? 'unknown' : 'unhealthy';
      
      // Reject all pending requests
      for (const [reqId, pending] of this.pendingRequests) {
        clearTimeout(pending.timeout);
        pending.reject(new Error(`Instance ${this.id} terminated`));
      }
      this.pendingRequests.clear();
      this.activeRequests = 0;
      
      this.emit('closed', code);
    });

    this.process.on('error', (error) => {
      console.error(`[MCP-Multiplexer] Instance ${this.id} error:`, error);
      this.status = 'error';
      this.health = 'unhealthy';
      this.failureCount++;
      this.emit('error', error);
    });
  }

  processMessages() {
    let newlineIndex;
    while ((newlineIndex = this.inputBuffer.indexOf('\n')) !== -1) {
      const line = this.inputBuffer.slice(0, newlineIndex);
      this.inputBuffer = this.inputBuffer.slice(newlineIndex + 1);
      
      if (line.trim()) {
        try {
          const response = JSON.parse(line);
          this.handleResponse(response);
        } catch (error) {
          console.error(`[MCP-Instance-${this.id}] JSON parse error:`, error);
        }
      }
    }
  }

  handleResponse(response) {
    const requestId = response.id;
    const pending = this.pendingRequests.get(requestId);
    
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(requestId);
      
      const duration = Date.now() - pending.startTime;
      this.updateMetrics(duration);
      
      this.activeRequests = Math.max(0, this.activeRequests - 1);
      this.updateStatus();
      
      // Restore original request ID
      if (pending.originalId !== undefined) {
        response.id = pending.originalId;
      }
      
      if (response.error) {
        this.failureCount++;
        pending.reject(new Error(response.error.message || 'Request failed'));
      } else {
        pending.resolve(response);
      }
      
      this.lastActivity = Date.now();
    }
  }

  updateMetrics(duration) {
    this.totalRequests++;
    this.responseTimes.push(duration);
    
    // Keep only last 100 response times
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }
    
    this.averageResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
  }

  updateStatus() {
    if (this.activeRequests >= this.config.maxConcurrentRequests) {
      this.status = 'busy';
    } else if (this.activeRequests > 0) {
      this.status = 'ready';
    } else {
      this.status = 'ready';
    }
  }

  async waitForReady(timeout = 30000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Instance ${this.id} startup timeout`));
      }, timeout);

      const onReady = () => {
        clearTimeout(timer);
        this.removeListener('error', onError);
        resolve();
      };

      const onError = (error) => {
        clearTimeout(timer);
        this.removeListener('ready', onReady);
        reject(error);
      };

      this.once('ready', onReady);
      this.once('error', onError);
    });
  }

  getMetrics() {
    return {
      id: this.id,
      status: this.status,
      health: this.health,
      activeRequests: this.activeRequests,
      totalRequests: this.totalRequests,
      failureCount: this.failureCount,
      averageResponseTime: this.averageResponseTime,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      lastActivity: this.lastActivity
    };
  }
}

// Make MCPServerInstance inherit from EventEmitter
Object.setPrototypeOf(MCPServerInstance.prototype, EventEmitter.prototype);

class MCPMultiplexer extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      minInstances: 2,
      maxInstances: os.cpus().length,
      maxConcurrentRequests: 3,
      requestTimeout: 90000,
      healthCheckInterval: 30000,
      scaleUpThreshold: 0.8,
      scaleDownThreshold: 0.3,
      shutdownTimeout: 10000,
      serverPath: path.join(__dirname, 'claudette-mcp-server-unified.js'),
      ...config
    };
    
    this.instances = new Map();
    this.nextInstanceId = 1;
    this.requestQueue = [];
    this.healthCheckTimer = null;
    this.isShuttingDown = false;
    this.totalRequests = 0;
    this.failedRequests = 0;
    
    console.log(`[MCP-Multiplexer] Initialized with config:`, this.config);
  }

  async start() {
    console.log(`[MCP-Multiplexer] Starting multiplexer...`);
    
    // Start minimum instances
    for (let i = 0; i < this.config.minInstances; i++) {
      await this.createInstance();
    }
    
    // Start health monitoring
    this.startHealthChecking();
    
    console.log(`[MCP-Multiplexer] Started with ${this.instances.size} instances`);
    this.emit('ready');
  }

  async stop() {
    if (this.isShuttingDown) return;
    
    console.log(`[MCP-Multiplexer] Shutting down multiplexer...`);
    this.isShuttingDown = true;
    
    // Stop health checking
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    // Stop all instances
    const shutdownPromises = Array.from(this.instances.values()).map(instance => 
      instance.stop().catch(err => console.error(`Error stopping instance ${instance.id}:`, err))
    );
    
    await Promise.allSettled(shutdownPromises);
    this.instances.clear();
    
    console.log(`[MCP-Multiplexer] Shutdown complete`);
    this.emit('shutdown');
  }

  async handleRequest(request) {
    if (this.isShuttingDown) {
      throw new Error('Multiplexer is shutting down');
    }

    this.totalRequests++;
    const startTime = Date.now();

    try {
      // Find available instance
      let instance = this.findAvailableInstance();
      
      if (!instance) {
        // Try to scale up if possible
        if (this.instances.size < this.config.maxInstances) {
          console.log(`[MCP-Multiplexer] Scaling up - creating new instance`);
          instance = await this.createInstance();
        } else {
          // Wait for an instance to become available
          instance = await this.waitForAvailableInstance();
        }
      }

      if (!instance) {
        throw new Error('No available instances');
      }

      // Send request to instance
      const response = await instance.sendRequest(request);
      
      const duration = Date.now() - startTime;
      console.log(`[MCP-Multiplexer] Request completed by instance ${instance.id} in ${duration}ms`);
      
      // Check if we should scale down
      this.checkScaleDown();
      
      return response;
      
    } catch (error) {
      this.failedRequests++;
      console.error(`[MCP-Multiplexer] Request failed:`, error.message);
      throw error;
    }
  }

  findAvailableInstance() {
    const availableInstances = Array.from(this.instances.values())
      .filter(instance => instance.status === 'ready')
      .sort((a, b) => a.activeRequests - b.activeRequests);
      
    return availableInstances[0] || null;
  }

  async waitForAvailableInstance(timeout = 30000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const check = () => {
        if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for available instance'));
          return;
        }
        
        const instance = this.findAvailableInstance();
        if (instance) {
          resolve(instance);
        } else {
          setTimeout(check, 100);
        }
      };
      
      check();
    });
  }

  async createInstance() {
    const instanceId = `mcp-${this.nextInstanceId++}`;
    const instance = new MCPServerInstance(instanceId, this.config.serverPath, this.config);
    
    // Set up event handlers
    instance.on('closed', (code) => {
      console.log(`[MCP-Multiplexer] Instance ${instanceId} closed, removing from pool`);
      this.instances.delete(instanceId);
      
      // Ensure minimum instances
      if (!this.isShuttingDown && this.instances.size < this.config.minInstances) {
        console.log(`[MCP-Multiplexer] Below minimum instances, creating replacement`);
        setTimeout(() => this.createInstance().catch(console.error), 1000);
      }
    });

    instance.on('error', (error) => {
      console.error(`[MCP-Multiplexer] Instance ${instanceId} error:`, error);
      // Instance will be removed when it closes
    });
    
    try {
      await instance.start();
      this.instances.set(instanceId, instance);
      console.log(`[MCP-Multiplexer] Created instance ${instanceId}`);
      return instance;
    } catch (error) {
      console.error(`[MCP-Multiplexer] Failed to create instance ${instanceId}:`, error);
      throw error;
    }
  }

  checkScaleDown() {
    const activeInstances = Array.from(this.instances.values())
      .filter(instance => instance.status === 'ready' || instance.status === 'busy');
    
    if (activeInstances.length <= this.config.minInstances) {
      return; // Don't scale below minimum
    }
    
    // Calculate average load
    const totalActiveRequests = activeInstances.reduce((sum, instance) => sum + instance.activeRequests, 0);
    const averageLoad = totalActiveRequests / activeInstances.length;
    const maxPossibleRequests = activeInstances.length * this.config.maxConcurrentRequests;
    const loadRatio = totalActiveRequests / maxPossibleRequests;
    
    if (loadRatio < this.config.scaleDownThreshold) {
      // Find least active instance to remove
      const leastActiveInstance = activeInstances
        .filter(instance => instance.activeRequests === 0)
        .sort((a, b) => (a.lastActivity || 0) - (b.lastActivity || 0))[0];
      
      if (leastActiveInstance) {
        console.log(`[MCP-Multiplexer] Scaling down - removing instance ${leastActiveInstance.id}`);
        leastActiveInstance.stop();
      }
    }
  }

  startHealthChecking() {
    this.healthCheckTimer = setInterval(() => {
      if (!this.isShuttingDown) {
        this.performHealthChecks();
      }
    }, this.config.healthCheckInterval);
  }

  async performHealthChecks() {
    const promises = Array.from(this.instances.values()).map(async (instance) => {
      try {
        if (instance.status === 'ready' || instance.status === 'busy') {
          // Simple health check - send version request
          const healthRequest = {
            jsonrpc: '2.0',
            id: 'health_check',
            method: 'tools/call',
            params: {
              name: 'claudette_version'
            }
          };
          
          const response = await Promise.race([
            instance.sendRequest(healthRequest),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 5000))
          ]);
          
          if (response && !response.error) {
            instance.health = 'healthy';
            instance.failureCount = Math.max(0, instance.failureCount - 1);
          }
        }
      } catch (error) {
        instance.health = 'degraded';
        instance.failureCount++;
        
        if (instance.failureCount > 3) {
          console.warn(`[MCP-Multiplexer] Instance ${instance.id} failing health checks, restarting`);
          instance.stop();
        }
      }
    });
    
    await Promise.allSettled(promises);
  }

  getStatus() {
    const instances = Array.from(this.instances.values());
    const metrics = instances.map(instance => instance.getMetrics());
    
    return {
      totalInstances: instances.length,
      readyInstances: instances.filter(i => i.status === 'ready').length,
      busyInstances: instances.filter(i => i.status === 'busy').length,
      errorInstances: instances.filter(i => i.status === 'error').length,
      totalRequests: this.totalRequests,
      failedRequests: this.failedRequests,
      successRate: this.totalRequests > 0 ? (this.totalRequests - this.failedRequests) / this.totalRequests : 0,
      instances: metrics
    };
  }
}

// Main multiplexer coordinator
class MCPCoordinator {
  constructor() {
    this.multiplexer = new MCPMultiplexer();
    this.inputBuffer = '';
    
    this.setupProcessHandlers();
  }

  async start() {
    console.log('[MCP-Coordinator] Starting MCP Coordinator...');
    
    try {
      await this.multiplexer.start();
      console.log('[MCP-Coordinator] MCP Coordinator ready');
      console.error('[MCP] MCP_RAG_READY'); // Signal readiness to Claude Code
    } catch (error) {
      console.error('[MCP-Coordinator] Failed to start:', error);
      process.exit(1);
    }
  }

  setupProcessHandlers() {
    // Handle incoming requests
    process.stdin.on('data', (data) => {
      this.inputBuffer += data.toString();
      this.processMessages();
    });

    process.stdin.on('end', () => {
      console.log('[MCP-Coordinator] Input stream ended, shutting down');
      this.shutdown();
    });

    // Handle shutdown signals
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGHUP', () => this.shutdown());
  }

  processMessages() {
    let newlineIndex;
    while ((newlineIndex = this.inputBuffer.indexOf('\n')) !== -1) {
      const line = this.inputBuffer.slice(0, newlineIndex);
      this.inputBuffer = this.inputBuffer.slice(newlineIndex + 1);
      
      if (line.trim()) {
        try {
          const request = JSON.parse(line);
          this.handleRequest(request);
        } catch (error) {
          console.error('[MCP-Coordinator] JSON parse error:', error);
          this.sendError(null, -32700, 'Parse error');
        }
      }
    }
  }

  async handleRequest(request) {
    try {
      const response = await this.multiplexer.handleRequest(request);
      this.sendResponse(response);
    } catch (error) {
      console.error('[MCP-Coordinator] Request handling error:', error);
      this.sendError(request.id, -32603, 'Internal error: ' + error.message);
    }
  }

  sendResponse(response) {
    console.log(JSON.stringify(response));
  }

  sendError(id, code, message) {
    this.sendResponse({
      jsonrpc: '2.0',
      id: id,
      error: {
        code: code,
        message: message
      }
    });
  }

  async shutdown() {
    console.log('[MCP-Coordinator] Shutting down...');
    
    try {
      await this.multiplexer.stop();
      console.log('[MCP-Coordinator] Shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('[MCP-Coordinator] Shutdown error:', error);
      process.exit(1);
    }
  }
}

// Start the coordinator if this file is run directly
if (require.main === module) {
  const coordinator = new MCPCoordinator();
  coordinator.start().catch(error => {
    console.error('[MCP-Coordinator] Startup failed:', error);
    process.exit(1);
  });
}

module.exports = { MCPMultiplexer, MCPServerInstance, MCPCoordinator };