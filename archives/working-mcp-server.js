#!/usr/bin/env node
/**
 * Working Claudette MCP Server
 * Bypasses the problematic routing system and uses backends directly
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
function loadEnvironment() {
  const envFile = path.join(__dirname, '.env');
  try {
    const envContent = fs.readFileSync(envFile, 'utf8');
    const envLines = envContent.split('\n');
    
    for (const line of envLines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...values] = trimmed.split('=');
        if (key && values.length > 0) {
          const value = values.join('=');
          process.env[key] = value;
        }
      }
    }
    return true;
  } catch (error) {
    console.error('[MCP] Could not load .env file:', error.message);
    return false;
  }
}

class WorkingClaudetteMCPServer {
  constructor() {
    // Load environment variables first
    loadEnvironment();
    
    this.name = 'claudette-mcp-working';
    this.version = '1.0.1';
    this.capabilities = {
      tools: ['claudette_query', 'claudette_status', 'claudette_analyze'],
      resources: ['claudette_config', 'claudette_logs']
    };
    
    // Initialize OpenAI and Axios clients
    this.initializeClients();
  }

  initializeClients() {
    try {
      const OpenAI = require('openai');
      const axios = require('axios');
      
      // OpenAI client
      if (process.env.OPENAI_API_KEY) {
        this.openaiClient = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          timeout: 30000
        });
        console.error('[MCP] OpenAI client initialized');
      }
      
      // Flexcon client (via axios)
      if (process.env.FLEXCON_API_URL && process.env.FLEXCON_API_KEY) {
        this.flexconConfig = {
          url: process.env.FLEXCON_API_URL,
          apiKey: process.env.FLEXCON_API_KEY,
          model: process.env.FLEXCON_MODEL || 'gpt-oss:20b-gpu16-ctx3072'
        };
        this.axiosClient = axios;
        console.error('[MCP] Flexcon client initialized');
      }
      
    } catch (error) {
      console.error('[MCP] Client initialization error:', error.message);
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
    
    console.error('[MCP] Working Claudette MCP Server initialized');
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
                  description: 'Execute a query through Claudette AI system (Direct API)',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      prompt: { type: 'string', description: 'The prompt to send to the AI' },
                      backend: { type: 'string', description: 'Backend to use (openai, flexcon)', default: 'openai' },
                      max_tokens: { type: 'number', description: 'Maximum tokens in response', default: 150 },
                      temperature: { type: 'number', description: 'Response randomness (0.0-1.0)', default: 0.7 }
                    },
                    required: ['prompt']
                  }
                },
                {
                  name: 'claudette_status',
                  description: 'Get working MCP server status',
                  inputSchema: {
                    type: 'object',
                    properties: {}
                  }
                },
                {
                  name: 'claudette_analyze',
                  description: 'Perform analysis (mock implementation)',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      target: { type: 'string', description: 'Analysis target' },
                      type: { type: 'string', description: 'Analysis type', default: 'simple' }
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
                  name: 'Working Claudette Configuration',
                  mimeType: 'application/json'
                },
                {
                  uri: 'claudette://status',
                  name: 'Working Server Status',
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
          result = await this.executeDirectQuery(args.prompt, args.backend || 'openai', args);
          break;
          
        case 'claudette_status':
          result = await this.getWorkingStatus();
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

  async executeDirectQuery(prompt, backend, options = {}) {
    if (!prompt || prompt.trim() === '') {
      throw new Error('Prompt cannot be empty');
    }
    
    const maxTokens = options.max_tokens || 150;
    const temperature = options.temperature || 0.7;
    
    console.error(`[MCP] Executing direct query with ${backend}: ${prompt.substring(0, 50)}...`);
    
    if (backend === 'openai' && this.openaiClient) {
      return await this.queryOpenAI(prompt, maxTokens, temperature);
    } else if (backend === 'flexcon' && this.flexconConfig) {
      return await this.queryFlexcon(prompt, maxTokens, temperature);
    } else {
      // Fallback to mock
      return await this.queryMock(prompt);
    }
  }

  async queryOpenAI(prompt, maxTokens, temperature) {
    try {
      const completion = await this.openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: temperature
      });
      
      const content = completion.choices[0]?.message?.content || 'No response from OpenAI';
      const usage = completion.usage;
      
      return `${content}\n\n---\nBackend: OpenAI (gpt-4o-mini)\nTokens: ${usage?.prompt_tokens || 0} input, ${usage?.completion_tokens || 0} output\nFinish Reason: ${completion.choices[0]?.finish_reason || 'unknown'}`;
      
    } catch (error) {
      throw new Error(`OpenAI query failed: ${error.message}`);
    }
  }

  async queryFlexcon(prompt, maxTokens, temperature) {
    try {
      const requestData = {
        model: this.flexconConfig.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: temperature
      };
      
      const response = await this.axiosClient.post(`${this.flexconConfig.url}/v1/chat/completions`, requestData, {
        headers: {
          'Authorization': `Bearer ${this.flexconConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      const content = response.data.choices[0]?.message?.content || 'No response from Flexcon';
      const usage = response.data.usage;
      
      return `${content}\n\n---\nBackend: Flexcon (${this.flexconConfig.model})\nTokens: ${usage?.prompt_tokens || 0} input, ${usage?.completion_tokens || 0} output\nFinish Reason: ${response.data.choices[0]?.finish_reason || 'unknown'}`;
      
    } catch (error) {
      if (error.response) {
        throw new Error(`Flexcon query failed: ${error.response.status} - ${error.response.data?.error?.message || error.message}`);
      } else {
        throw new Error(`Flexcon query failed: ${error.message}`);
      }
    }
  }

  async queryMock(prompt) {
    const responses = [
      `Mock response to: "${prompt}"\n\nThis is a simulated AI response for testing purposes. The query was processed successfully by the mock backend.`,
      `Processed query: "${prompt}"\n\nMock backend is functioning correctly. This response demonstrates that the MCP server routing and communication layers are working as expected.`,
      `Query received: "${prompt}"\n\nMock AI response generated. All system components are operational and the message flow is functioning properly.`
    ];
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
    
    const response = responses[Math.floor(Math.random() * responses.length)];
    
    return `${response}\n\n---\nBackend: Mock\nTokens: ${prompt.length} input, ${response.length} output\nFinish Reason: completed`;
  }

  async getWorkingStatus() {
    const status = {
      server_version: this.version,
      server_name: this.name,
      timestamp: new Date().toISOString(),
      backends: {
        openai: {
          available: !!this.openaiClient,
          api_key_configured: !!process.env.OPENAI_API_KEY,
          status: this.openaiClient ? 'ready' : 'not configured'
        },
        flexcon: {
          available: !!(this.flexconConfig && this.axiosClient),
          api_key_configured: !!process.env.FLEXCON_API_KEY,
          api_url: process.env.FLEXCON_API_URL || 'not configured',
          model: this.flexconConfig?.model || 'not configured',
          status: this.flexconConfig ? 'ready' : 'not configured'
        },
        mock: {
          available: true,
          status: 'always ready'
        }
      },
      environment: {
        node_version: process.version,
        platform: process.platform,
        env_loaded: !!process.env.OPENAI_API_KEY || !!process.env.FLEXCON_API_KEY
      }
    };
    
    const availableBackends = Object.entries(status.backends)
      .filter(([name, config]) => config.available)
      .map(([name]) => name);
    
    return `Working Claudette MCP Server Status
${'='.repeat(50)}

✅ Server Status: OPERATIONAL
📡 Protocol Version: 2024-11-05
🖥️  Server Version: ${status.server_version}
🕐 Timestamp: ${status.timestamp}

Backend Status:
${Object.entries(status.backends).map(([name, config]) => 
  `  ${config.available ? '✅' : '❌'} ${name.toUpperCase()}: ${config.status}`
).join('\n')}

Available Backends: ${availableBackends.join(', ')}
Environment: ${status.environment.platform} ${status.environment.node_version}
Environment Variables Loaded: ${status.environment.env_loaded ? '✅' : '❌'}

🎉 This MCP server bypasses the problematic Claudette routing system 
   and uses direct API calls to provide reliable AI functionality.`;
  }

  async executeAnalysis(target, type) {
    // Mock analysis since aNEOS is not available
    const analysisTypes = {
      simple: `Simple Analysis of "${target}"\n\nBasic parameter analysis completed.\nTarget appears to be a test case.\nNo anomalies detected.`,
      complex: `Complex Analysis of "${target}"\n\nAdvanced multi-parameter analysis:\n- Spectral analysis: Normal\n- Trajectory analysis: Stable\n- Composition estimate: Standard\n- Risk assessment: Low`,
      artificial: `Artificial Analysis Results\n\nSimulated deep analysis of artificial targets:\n- AI-generated data patterns detected\n- Model confidence: High\n- Synthetic data signatures identified`
    };
    
    const result = analysisTypes[type] || analysisTypes.simple;
    
    return `${result}\n\n---\nAnalysis Type: ${type}\nTarget: ${target}\nTimestamp: ${new Date().toISOString()}\nStatus: Completed (Mock Implementation)`;
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
    console.error('[MCP] Working Claudette MCP Server starting...');
    
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
    
    console.error('[MCP] Working Claudette MCP Server ready');
  }
}

// Start the server
const server = new WorkingClaudetteMCPServer();
server.start();