#!/usr/bin/env node
/**
 * Optimized Claudette MCP Server
 * Uses the built claudette binary for faster execution
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class OptimizedClaudetteMCPServer {
  constructor() {
    this.name = 'claudette-mcp-optimized';
    this.version = '1.0.0';
    this.capabilities = {
      tools: ['claudette_query', 'claudette_status', 'claudette_version', 'claudette_backends'],
      resources: ['claudette_config', 'claudette_logs']
    };
    
    this.claudettePath = path.join(process.cwd(), 'claudette');
    this.setupEnvironment();
  }

  async setupEnvironment() {
    try {
      // Load environment from .env file
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
    } catch (error) {
      console.error('[MCP] Warning: Environment setup failed:', error.message);
      this.environment = process.env;
    }
  }

  async initialize() {
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
    
    console.error('[MCP] Optimized Claudette MCP Server initialized');
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
                  description: 'Get Claudette version',
                  inputSchema: {
                    type: 'object',
                    properties: {}
                  }
                },
                {
                  name: 'claudette_status',
                  description: 'Get Claudette system status',
                  inputSchema: {
                    type: 'object',
                    properties: {}
                  }
                },
                {
                  name: 'claudette_backends',
                  description: 'Get available backends information',
                  inputSchema: {
                    type: 'object',
                    properties: {}
                  }
                },
                {
                  name: 'claudette_query',
                  description: 'Execute a query through Claudette AI system',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      prompt: { type: 'string', description: 'The prompt to send to Claudette' },
                      backend: { type: 'string', description: 'Backend to use (openai, qwen, etc.)', default: 'openai' }
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
                  mimeType: 'application/json'
                },
                {
                  uri: 'claudette://logs',
                  name: 'Claudette System Logs',
                  mimeType: 'text/plain'
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
      let result;
      
      switch (name) {
        case 'claudette_version':
          result = await this.getVersion();
          break;
          
        case 'claudette_status':
          result = await this.getStatus();
          break;
          
        case 'claudette_backends':
          result = await this.getBackends();
          break;
          
        case 'claudette_query':
          result = await this.executeQuery(args.prompt, args.backend || 'openai');
          break;
          
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
      
      this.sendResponse({
        jsonrpc: '2.0',
        id: request.id,
        result: {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
            }
          ]
        }
      });
      
    } catch (error) {
      console.error(`[MCP] Tool call error for ${name}:`, error);
      this.sendError(request.id, -32603, `Tool execution failed: ${error.message}`);
    }
  }

  async executeClaudetteCommand(args, timeout = 10000) {
    console.error(`[MCP] Executing: ${this.claudettePath} ${args.join(' ')}`);
    
    return new Promise((resolve, reject) => {
      const child = spawn(this.claudettePath, args, {
        env: this.environment,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      let errorOutput = '';
      
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`Command failed (code ${code}): ${errorOutput || output}`));
        }
      });
      
      child.on('error', (error) => {
        reject(new Error(`Failed to execute command: ${error.message}`));
      });
      
      // Set timeout
      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timeout (${timeout}ms)`));
      }, timeout);
      
      child.on('close', () => clearTimeout(timeoutId));
    });
  }

  async getVersion() {
    try {
      const result = await this.executeClaudetteCommand(['--version'], 3000);
      return `Claudette version: ${result}`;
    } catch (error) {
      throw new Error(`Version check failed: ${error.message}`);
    }
  }

  async getStatus() {
    try {
      const result = await this.executeClaudetteCommand(['status'], 15000);
      return result;
    } catch (error) {
      throw new Error(`Status check failed: ${error.message}`);
    }
  }

  async getBackends() {
    try {
      const result = await this.executeClaudetteCommand(['backends'], 10000);
      return result;
    } catch (error) {
      throw new Error(`Backends check failed: ${error.message}`);
    }
  }

  async executeQuery(prompt, backend) {
    try {
      const args = ['--backend', backend, prompt];
      const result = await this.executeClaudetteCommand(args, 30000);
      
      // Clean up the output to remove metadata lines
      const lines = result.split('\n');
      const responseStart = lines.findIndex(line => 
        line.includes('Backend:') || 
        line.includes('Response Metadata:') ||
        line.includes('---')
      );
      
      if (responseStart > 0) {
        return lines.slice(0, responseStart).join('\n').trim();
      }
      
      return result;
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

  start() {
    console.error('[MCP] Optimized Claudette MCP Server starting...');
    
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
    
    process.on('SIGINT', () => {
      console.error('[MCP] Received SIGINT, shutting down');
      process.exit(0);
    });
    
    console.error('[MCP] Optimized Claudette MCP Server ready');
  }
}

// Start the server
const server = new OptimizedClaudetteMCPServer();
server.start();