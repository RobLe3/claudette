#!/usr/bin/env node
/**
 * Unified Claudette MCP Server - Optimized for Reliability
 * Fixes timeout issues and implements intelligent retry logic
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class UnifiedClaudetteMCPServer {
  constructor() {
    this.name = 'claudette-mcp-unified';
    this.version = '1.0.4';
    this.capabilities = {
      tools: ['claudette_query', 'claudette_status', 'claudette_version', 'claudette_backends', 'claudette_health'],
      resources: ['claudette_config', 'claudette_logs', 'claudette_metrics']
    };
    
    // Optimized configuration
    this.config = {
      timeouts: {
        startup: 20000,          // 20s startup timeout
        command: 45000,          // 45s command timeout (was 30s)
        health: 8000,            // 8s health check timeout
        query: 75000,            // 75s query timeout for complex operations
        connection: 10000        // 10s connection timeout
      },
      retry: {
        maxAttempts: 3,          // 3 retry attempts
        baseDelay: 2000,         // 2s base delay
        backoffMultiplier: 1.5,  // Moderate backoff
        jitterFactor: 0.1        // 10% jitter
      },
      circuit: {
        failureThreshold: 3,     // 3 failures before opening
        recoveryTime: 30000,     // 30s recovery time
        halfOpenTimeout: 10000   // 10s half-open timeout
      }
    };
    
    this.claudettePath = path.join(process.cwd(), 'claudette');
    this.circuitState = 'closed'; // closed, open, half-open
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.environment = {};
    
    this.setupEnvironment();
    this.setupSignalHandlers();
  }

  async setupEnvironment() {
    try {
      // Load environment from .env file with error handling
      const envPath = path.join(process.cwd(), '.env');
      try {
        const envContent = await fs.readFile(envPath, 'utf8');
        const envVars = {};
        
        envContent.split('\n').forEach(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [key, ...valueParts] = trimmed.split('=');
            const value = valueParts.join('=').replace(/^["']|["']$/g, '');
            envVars[key] = value;
          }
        });
        
        // Merge with existing environment
        this.environment = { ...process.env, ...envVars };
        console.error(`[MCP] Loaded ${Object.keys(envVars).length} environment variables`);
      } catch (error) {
        console.error('[MCP] Warning: Could not load .env file:', error.message);
        this.environment = process.env;
      }

      // Validate Claudette binary exists
      try {
        await fs.access(this.claudettePath);
        console.error('[MCP] Claudette binary found and accessible');
      } catch (error) {
        console.error('[MCP] Warning: Claudette binary not found at', this.claudettePath);
        this.claudettePath = 'node dist/cli/index.js'; // Fallback to built JS
      }

    } catch (error) {
      console.error('[MCP] Warning: Environment setup failed:', error.message);
      this.environment = process.env;
    }
  }

  setupSignalHandlers() {
    const gracefulShutdown = (signal) => {
      console.error(`[MCP] Received ${signal}, shutting down gracefully`);
      process.exit(0);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));
  }

  async initialize() {
    // Send startup signal for MCP detection
    console.error('[MCP] Unified Claudette MCP Server starting...');
    console.error('[MCP] MCP_RAG_READY'); // Signal for startup detection
    
    this.sendResponse({
      jsonrpc: '2.0',
      id: null,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: this.capabilities,
        serverInfo: {
          name: this.name,
          version: this.version
        }
      }
    });
    
    console.error('[MCP] Unified Claudette MCP Server initialized and ready');
  }

  async handleRequest(request) {
    try {
      switch (request.method) {
        case 'initialize':
          await this.initialize();
          break;
          
        case 'tools/list':
          this.sendResponse({
            jsonrpc: '2.0',
            id: request.id,
            result: {
              tools: [
                {
                  name: 'claudette_version',
                  description: 'Get Claudette version information',
                  inputSchema: {
                    type: 'object',
                    properties: {}
                  }
                },
                {
                  name: 'claudette_status',
                  description: 'Get comprehensive Claudette system status',
                  inputSchema: {
                    type: 'object',
                    properties: {}
                  }
                },
                {
                  name: 'claudette_health',
                  description: 'Perform health check of all Claudette components',
                  inputSchema: {
                    type: 'object',
                    properties: {}
                  }
                },
                {
                  name: 'claudette_backends',
                  description: 'Get information about available AI backends',
                  inputSchema: {
                    type: 'object',
                    properties: {}
                  }
                },
                {
                  name: 'claudette_query',
                  description: 'Execute an AI query through Claudette with intelligent routing',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      prompt: { 
                        type: 'string', 
                        description: 'The prompt to send to Claudette AI system' 
                      },
                      backend: { 
                        type: 'string', 
                        description: 'Preferred backend (openai, qwen, claude, ollama)', 
                        default: 'auto' 
                      },
                      priority: {
                        type: 'string',
                        description: 'Request priority (high, medium, low)',
                        default: 'medium'
                      },
                      timeout: {
                        type: 'number',
                        description: 'Custom timeout in seconds',
                        default: 60
                      }
                    },
                    required: ['prompt']
                  }
                }
              ]
            }
          });
          break;
          
        case 'tools/call':
          await this.handleToolCall(request);
          break;
          
        case 'resources/list':
          this.sendResponse({
            jsonrpc: '2.0',
            id: request.id,
            result: {
              resources: [
                {
                  uri: 'claudette://config',
                  name: 'Claudette Configuration',
                  mimeType: 'application/json',
                  description: 'Current Claudette system configuration'
                },
                {
                  uri: 'claudette://logs',
                  name: 'Claudette System Logs',
                  mimeType: 'text/plain',
                  description: 'Recent system logs and error messages'
                },
                {
                  uri: 'claudette://metrics',
                  name: 'Performance Metrics',
                  mimeType: 'application/json',
                  description: 'Real-time performance and health metrics'
                }
              ]
            }
          });
          break;
          
        default:
          this.sendError(request.id, -32601, 'Method not found');
      }
    } catch (error) {
      console.error('[MCP] Request handling error:', error);
      this.sendError(request.id, -32603, 'Internal error: ' + error.message);
    }
  }

  async handleToolCall(request) {
    const { name, arguments: args } = request.params;
    
    try {
      // Check circuit breaker
      if (!this.canExecuteCommand()) {
        throw new Error(`Circuit breaker open - system temporarily unavailable (${this.failureCount} recent failures)`);
      }

      let result;
      const startTime = Date.now();
      
      switch (name) {
        case 'claudette_version':
          result = await this.executeWithRetry(() => this.getVersion());
          break;
          
        case 'claudette_status':
          result = await this.executeWithRetry(() => this.getStatus());
          break;

        case 'claudette_health':
          result = await this.executeWithRetry(() => this.getHealth());
          break;
          
        case 'claudette_backends':
          result = await this.executeWithRetry(() => this.getBackends());
          break;
          
        case 'claudette_query':
          result = await this.executeWithRetry(() => 
            this.executeQuery(
              args.prompt, 
              args.backend || 'auto',
              args.priority || 'medium',
              args.timeout || 60
            )
          );
          break;
          
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      const duration = Date.now() - startTime;
      
      // Record success
      this.recordSuccess();
      
      this.sendResponse({
        jsonrpc: '2.0',
        id: request.id,
        result: {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
            }
          ],
          metadata: {
            duration_ms: duration,
            tool: name,
            timestamp: new Date().toISOString(),
            circuit_state: this.circuitState
          }
        }
      });
      
    } catch (error) {
      console.error(`[MCP] Tool call error for ${name}:`, error);
      
      // Record failure
      this.recordFailure(error);
      
      this.sendError(request.id, -32603, `Tool execution failed: ${error.message}`);
    }
  }

  /**
   * Execute command with intelligent retry logic
   */
  async executeWithRetry(operation) {
    let lastError;
    const maxAttempts = this.config.retry.maxAttempts;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        // Success - reset failure tracking
        if (attempt > 1) {
          console.error(`[MCP] Operation succeeded on attempt ${attempt}`);
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        
        if (attempt < maxAttempts) {
          const delay = this.calculateRetryDelay(attempt);
          console.error(`[MCP] Attempt ${attempt} failed, retrying in ${delay}ms: ${error.message}`);
          await this.sleep(delay);
        } else {
          console.error(`[MCP] All ${maxAttempts} attempts failed: ${error.message}`);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Calculate retry delay with backoff and jitter
   */
  calculateRetryDelay(attempt) {
    const { baseDelay, backoffMultiplier, jitterFactor } = this.config.retry;
    const delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
    const jitter = delay * jitterFactor * (Math.random() - 0.5);
    return Math.round(delay + jitter);
  }

  /**
   * Circuit breaker logic
   */
  canExecuteCommand() {
    const now = Date.now();
    
    switch (this.circuitState) {
      case 'closed':
        return true;
        
      case 'open':
        // Check if recovery time has passed
        if (now - this.lastFailureTime >= this.config.circuit.recoveryTime) {
          this.circuitState = 'half-open';
          console.error('[MCP] Circuit breaker transitioning to half-open');
          return true;
        }
        return false;
        
      case 'half-open':
        return true;
        
      default:
        return true;
    }
  }

  recordSuccess() {
    if (this.circuitState === 'half-open') {
      this.circuitState = 'closed';
      this.failureCount = 0;
      console.error('[MCP] Circuit breaker closed - system recovered');
    } else if (this.circuitState === 'closed' && this.failureCount > 0) {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  recordFailure(error) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.circuitState === 'half-open') {
      this.circuitState = 'open';
      console.error('[MCP] Circuit breaker opened - back to failure state');
    } else if (this.circuitState === 'closed' && this.failureCount >= this.config.circuit.failureThreshold) {
      this.circuitState = 'open';
      console.error(`[MCP] Circuit breaker opened - ${this.failureCount} failures exceeded threshold`);
    }
  }

  /**
   * Execute Claudette command with optimized timeouts
   */
  async executeClaudetteCommand(args, timeoutMs = null) {
    timeoutMs = timeoutMs || this.config.timeouts.command;
    
    console.error(`[MCP] Executing: ${this.claudettePath} ${args.join(' ')} (timeout: ${timeoutMs}ms)`);
    
    return new Promise((resolve, reject) => {
      const child = spawn(this.claudettePath, args, {
        env: this.environment,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: timeoutMs
      });
      
      let output = '';
      let errorOutput = '';
      let outputReceived = false;
      
      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        if (!outputReceived) {
          child.kill('SIGTERM');
          setTimeout(() => child.kill('SIGKILL'), 5000); // Force kill after 5s
          reject(new Error(`Command timeout after ${timeoutMs}ms`));
        }
      }, timeoutMs);
      
      child.stdout.on('data', (data) => {
        output += data.toString();
        outputReceived = true;
      });
      
      child.stderr.on('data', (data) => {
        const errorText = data.toString();
        errorOutput += errorText;
        
        // Don't treat all stderr as errors - some are just info messages
        if (!errorText.includes('[PerformanceHarmonizer]') && 
            !errorText.includes('[EnvLoader]') &&
            !errorText.includes('[CLAUDETTE] INFO')) {
          console.error(`[MCP] Command stderr: ${errorText.trim()}`);
        }
      });
      
      child.on('close', (code) => {
        clearTimeout(timeoutHandle);
        outputReceived = true;
        
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`Command failed with code ${code}: ${errorOutput || output}`));
        }
      });
      
      child.on('error', (error) => {
        clearTimeout(timeoutHandle);
        outputReceived = true;
        reject(new Error(`Failed to execute command: ${error.message}`));
      });
    });
  }

  async getVersion() {
    try {
      const result = await this.executeClaudetteCommand(['--version'], this.config.timeouts.health);
      return `Claudette MCP Server v${this.version}\nClaudette CLI: ${result}`;
    } catch (error) {
      return `Claudette MCP Server v${this.version}\nCLI Error: ${error.message}`;
    }
  }

  async getStatus() {
    try {
      const result = await this.executeClaudetteCommand(['status'], this.config.timeouts.command);
      return `${result}\n\nMCP Server Status:\n- Circuit State: ${this.circuitState}\n- Failure Count: ${this.failureCount}\n- Uptime: ${Math.round((Date.now() - this.startTime) / 1000)}s`;
    } catch (error) {
      throw new Error(`Status check failed: ${error.message}`);
    }
  }

  async getHealth() {
    try {
      // Run multiple health checks in parallel
      const checks = await Promise.allSettled([
        this.executeClaudetteCommand(['--version'], this.config.timeouts.health),
        this.executeClaudetteCommand(['status'], this.config.timeouts.health * 2)
      ]);

      const results = {
        version_check: checks[0].status === 'fulfilled' ? 'healthy' : 'failed',
        status_check: checks[1].status === 'fulfilled' ? 'healthy' : 'failed',
        circuit_breaker: this.circuitState,
        failure_count: this.failureCount,
        uptime_seconds: Math.round((Date.now() - (this.startTime || Date.now())) / 1000)
      };

      const overallHealth = results.version_check === 'healthy' && 
                           results.status_check === 'healthy' && 
                           this.circuitState !== 'open' ? 'healthy' : 'degraded';

      return JSON.stringify({
        overall_health: overallHealth,
        components: results,
        timestamp: new Date().toISOString()
      }, null, 2);
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }

  async getBackends() {
    try {
      const result = await this.executeClaudetteCommand(['backends'], this.config.timeouts.command);
      return result;
    } catch (error) {
      throw new Error(`Backends check failed: ${error.message}`);
    }
  }

  async executeQuery(prompt, backend = 'auto', priority = 'medium', timeoutSeconds = 60) {
    try {
      // Calculate timeout based on priority and complexity
      let timeoutMs = timeoutSeconds * 1000;
      if (priority === 'high') {
        timeoutMs *= 1.5; // 50% more time for high priority
      } else if (priority === 'low') {
        timeoutMs *= 0.8; // 20% less time for low priority
      }

      // Estimate complexity and adjust timeout
      const promptLength = prompt.length;
      if (promptLength > 2000) {
        timeoutMs *= 1.5; // Complex queries get more time
      }

      const args = backend === 'auto' ? [prompt] : ['--backend', backend, prompt];
      
      console.error(`[MCP] Executing query (${priority} priority, ${Math.round(timeoutMs/1000)}s timeout): ${prompt.substring(0, 100)}...`);
      
      const result = await this.executeClaudetteCommand(args, timeoutMs);
      
      // Clean up the output to remove metadata lines
      const lines = result.split('\n');
      let responseStart = -1;
      
      // Find where the actual response starts (after metadata)
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Backend:') || 
            lines[i].includes('Response Metadata:') ||
            lines[i].includes('─'.repeat(10))) {
          responseStart = i;
          break;
        }
      }
      
      let cleanResponse;
      if (responseStart > 0) {
        cleanResponse = lines.slice(0, responseStart).join('\n').trim();
      } else {
        cleanResponse = result;
      }
      
      // If response is empty, return the full output
      if (!cleanResponse) {
        cleanResponse = result;
      }
      
      return cleanResponse;
    } catch (error) {
      throw new Error(`Query execution failed: ${error.message}`);
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

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  start() {
    this.startTime = Date.now();
    console.error('[MCP] Unified Claudette MCP Server starting...');
    
    let buffer = '';
    
    process.stdin.on('data', (data) => {
      buffer += data.toString();
      
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        
        if (line.trim()) {
          try {
            const request = JSON.parse(line);
            this.handleRequest(request);
          } catch (error) {
            console.error('[MCP] JSON parse error:', error);
            this.sendError(null, -32700, 'Parse error');
          }
        }
      }
    });
    
    process.stdin.on('end', () => {
      console.error('[MCP] Input stream ended, shutting down');
      process.exit(0);
    });
    
    console.error('[MCP] Unified Claudette MCP Server ready');
    console.error('[MCP] MCP_RAG_READY'); // Final ready signal
  }
}

// Start the server
const server = new UnifiedClaudetteMCPServer();
server.start();