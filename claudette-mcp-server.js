#!/usr/bin/env node
/**
 * Claudette MCP Server
 * Enables seamless integration with Claude Code for background task execution
 * 
 * This MCP server allows Claude Code to invoke Claudette operations without
 * requiring manual confirmation for each task.
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class ClaudetteMCPServer {
  constructor() {
    this.name = 'claudette-mcp';
    this.version = '1.0.0';
    this.capabilities = {
      tools: ['claudette_query', 'claudette_status', 'claudette_analyze'],
      resources: ['claudette_config', 'claudette_logs']
    };
    
    this.apiKeys = null;
    this.setupKeychain();
  }

  async setupKeychain() {
    try {
      // Load API keys from keychain
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const openaiKey = await execAsync('security find-generic-password -s "openai-api-key" -a "openai" -w').catch(() => ({ stdout: '' }));
      const codellmKey = await execAsync('security find-generic-password -s "codellm-api-key" -a "codellm" -w').catch(() => ({ stdout: '' }));
      
      this.apiKeys = {
        OPENAI_API_KEY: openaiKey.stdout.trim(),
        CODELLM_API_KEY: codellmKey.stdout.trim()
      };
      
      console.error('[MCP] Keychain API keys loaded successfully');
    } catch (error) {
      console.error('[MCP] Warning: Could not load keychain API keys:', error.message);
    }
  }

  async initialize() {
    // Send initialization response
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
    
    console.error('[MCP] Claudette MCP Server initialized');
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
                  name: 'claudette_query',
                  description: 'Execute a query through Claudette AI system',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      prompt: { type: 'string', description: 'The prompt to send to Claudette' },
                      backend: { type: 'string', description: 'Backend to use (openai, qwen, etc.)', default: 'openai' },
                      verbose: { type: 'boolean', description: 'Enable verbose output', default: false }
                    },
                    required: ['prompt']
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
                  name: 'claudette_analyze',
                  description: 'Perform aNEOS analysis through Claudette',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      target: { type: 'string', description: 'NEO designation or analysis target' },
                      type: { type: 'string', description: 'Analysis type (simple, complex, artificial)', default: 'simple' }
                    },
                    required: ['target']
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
                  name: 'Claudette Logs',
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
        case 'claudette_query':
          result = await this.executeClaudetteQuery(args.prompt, args.backend || 'openai', args.verbose || false);
          break;
          
        case 'claudette_status':
          result = await this.getClaudetteStatus();
          break;
          
        case 'claudette_analyze':
          result = await this.executeAnalysis(args.target, args.type || 'simple');
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

  async executeClaudetteQuery(prompt, backend, verbose) {
    const projectRoot = process.cwd();
    
    const args = [
      'npx', 'ts-node', 'src/cli/index.ts',
      '--backend', backend,
      prompt
    ];
    
    if (verbose) {
      args.push('--verbose');
    }
    
    console.error(`[MCP] Executing Claudette query: ${prompt.substring(0, 50)}...`);
    
    return new Promise((resolve, reject) => {
      const child = spawn('bash', ['-c', args.join(' ')], {
        cwd: projectRoot,
        env: {
          ...process.env,
          ...this.apiKeys
        },
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
          // Extract the actual response from Claudette output
          const lines = output.split('\n');
          const responseStart = lines.findIndex(line => line.includes('Backend:') || line.includes('Response Metadata:'));
          
          if (responseStart > 0) {
            const actualResponse = lines.slice(0, responseStart).join('\n').trim();
            resolve(actualResponse || output);
          } else {
            resolve(output);
          }
        } else {
          reject(new Error(`Claudette execution failed (code ${code}): ${errorOutput || output}`));
        }
      });
      
      child.on('error', (error) => {
        reject(new Error(`Failed to start Claudette: ${error.message}`));
      });
      
      // Set timeout
      setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error('Claudette query timeout (30s)'));
      }, 30000);
    });
  }

  async getClaudetteStatus() {
    const projectRoot = process.cwd();
    
    return new Promise((resolve, reject) => {
      const child = spawn('npx', ['ts-node', 'src/cli/index.ts', 'status'], {
        cwd: projectRoot,
        env: {
          ...process.env,
          ...this.apiKeys
        },
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
          resolve(output);
        } else {
          reject(new Error(`Status check failed (code ${code}): ${errorOutput || output}`));
        }
      });
      
      child.on('error', (error) => {
        reject(new Error(`Failed to get status: ${error.message}`));
      });
    });
  }

  async executeAnalysis(target, type) {
    const projectRoot = '/Users/roble/Documents/Python/claude_flow/aneos-project';
    
    let command;
    switch (type) {
      case 'simple':
        command = `python3 aneos.py simple "${target}"`;
        break;
      case 'complex':
        command = `python3 aneos.py analyze "${target}"`;
        break;
      case 'artificial':
        command = `python3 aneos_test_interface.py`;
        break;
      default:
        command = `python3 aneos.py simple "${target}"`;
    }
    
    console.error(`[MCP] Executing aNEOS analysis: ${command}`);
    
    return new Promise((resolve, reject) => {
      const child = spawn('bash', ['-c', command], {
        cwd: projectRoot,
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
          resolve(output);
        } else {
          resolve(`Analysis completed with warnings (code ${code}):\n${output}\n\nErrors:\n${errorOutput}`);
        }
      });
      
      child.on('error', (error) => {
        reject(new Error(`Failed to run analysis: ${error.message}`));
      });
    });
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
    console.error('[MCP] Claudette MCP Server starting...');
    
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
    
    console.error('[MCP] Claudette MCP Server ready');
  }
}

// Start the server
const server = new ClaudetteMCPServer();
server.start();