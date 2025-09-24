#!/usr/bin/env node

/**
 * MCP Server Benchmark
 * Tests Claudette MCP server performance with Model Context Protocol
 */

const { spawn } = require('child_process');
const { performance } = require('perf_hooks');
const { existsSync } = require('fs');
const path = require('path');

class McpBenchmark {
  constructor() {
    this.mcpServer = null;
    this.mcpProcess = null;
    this.serverReady = false;
    this.results = {
      server_startup: {},
      tool_calls: {
        simple: [],
        complex: [],
        concurrent: []
      },
      memory: {
        start: 0,
        peak: 0,
        end: 0
      },
      errors: []
    };
  }

  async run() {
    console.log('🔗 Claudette MCP Server Benchmark');
    console.log('===================================\n');

    try {
      // Memory baseline
      this.results.memory.start = this.getMemoryUsage();

      // Test 1: MCP Server Startup
      await this.benchmarkServerStartup();

      // Test 2: Tool Call Performance
      await this.benchmarkToolCalls();

      // Test 3: Concurrent Tool Calls
      await this.benchmarkConcurrentToolCalls();

      // Memory peak
      this.results.memory.peak = this.getMemoryUsage();

      // Generate report
      this.generateReport();

      // Cleanup
      await this.cleanup();
      this.results.memory.end = this.getMemoryUsage();

    } catch (error) {
      console.error('❌ MCP Benchmark failed:', error.message);
      this.results.errors.push(error.message);
    }
  }

  async benchmarkServerStartup() {
    console.log('🚀 Testing MCP Server Startup...');
    const start = performance.now();
    
    try {
      await this.startMcpServer();
      const duration = performance.now() - start;
      
      this.results.server_startup = {
        duration,
        success: true
      };
      
      console.log(`   ✅ MCP server startup: ${duration.toFixed(2)}ms\n`);
      
    } catch (error) {
      const duration = performance.now() - start;
      this.results.server_startup = {
        duration,
        error: error.message,
        success: false
      };
      throw error;
    }
  }

  async startMcpServer() {
    return new Promise((resolve, reject) => {
      // Try fast MCP server first, fallback to unified
      const mcpCandidates = [
        path.join(__dirname, 'claudette-mcp-server-fast.js'),      // Ultra-fast (preferred)
        path.join(__dirname, 'claudette-mcp-server-unified.js'),   // Unified fallback
        path.join(__dirname, 'claudette-mcp-server.js')           // Basic fallback
      ];
      
      let mcpServerPath = null;
      for (const candidate of mcpCandidates) {
        if (existsSync(candidate)) {
          mcpServerPath = candidate;
          console.log(`[MCP Benchmark] Using MCP server: ${path.basename(candidate)}`);
          break;
        }
      }
      
      if (!mcpServerPath) {
        reject(new Error('No MCP server file found'));
        return;
      }

      // Start MCP server process with optimized environment
      this.mcpProcess = spawn('node', [mcpServerPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'production',          // Production mode for speed
          CLAUDETTE_DEBUG: '0',            // Reduce noise
          CLAUDETTE_BENCHMARK: '1',        // Benchmark mode
          CLAUDETTE_MCP_MODE: '1'          // MCP optimizations
        }
      });

      let startupOutput = '';
      let stderrOutput = '';
      
      // Reduced timeout for fast server (5s instead of 30s)
      const timeoutMs = mcpServerPath.includes('fast') ? 5000 : 15000;
      let startupTimeout = setTimeout(() => {
        reject(new Error(`MCP server startup timeout (${timeoutMs/1000}s)`));
      }, timeoutMs);

      this.mcpProcess.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        stderrOutput += errorOutput;
        
        // Enhanced ready signal detection
        if (errorOutput.includes('MCP_RAG_READY') ||
            errorOutput.includes('Server ready') ||
            errorOutput.includes('MCP Server ready') ||
            errorOutput.includes('Fast Claudette MCP Server ready')) {
          clearTimeout(startupTimeout);
          this.serverReady = true;
          console.log(`   ✅ MCP server ready signal detected`);
          resolve();
        }
        
        // Log critical errors only
        if (errorOutput.includes('Error:') && 
            !errorOutput.includes('Warning') && 
            !errorOutput.includes('[EnvLoader]')) {
          console.error('MCP Server Error:', errorOutput.trim());
        }
      });

      this.mcpProcess.stdout.on('data', (data) => {
        startupOutput += data.toString();
      });

      this.mcpProcess.on('error', (error) => {
        clearTimeout(startupTimeout);
        reject(new Error(`Failed to start MCP process: ${error.message}`));
      });

      this.mcpProcess.on('exit', (code) => {
        if (code !== 0 && !this.serverReady) {
          clearTimeout(startupTimeout);
          reject(new Error(`MCP server exited with code ${code}\nStderr: ${stderrOutput.slice(-500)}`));
        }
      });
    });
  }

  async benchmarkToolCalls() {
    console.log('🛠️ Testing MCP Tool Call Performance...');
    
    if (!this.serverReady || !this.mcpProcess) {
      console.log('   ❌ MCP server not ready, skipping tool calls');
      return;
    }

    const toolCalls = [
      {
        type: 'simple',
        tool: 'claudette_version',
        args: {}
      },
      {
        type: 'simple', 
        tool: 'claudette_health',
        args: {}
      },
      {
        type: 'simple',
        tool: 'claudette_query',
        args: { prompt: 'What is 2+2?', backend: 'auto', priority: 'high' }
      },
      {
        type: 'complex',
        tool: 'claudette_query',
        args: { 
          prompt: 'Explain the principles of software architecture including modularity, scalability, and maintainability.',
          backend: 'auto',
          priority: 'medium'
        }
      }
    ];

    for (let i = 0; i < toolCalls.length; i++) {
      const toolCall = toolCalls[i];
      const start = performance.now();
      
      try {
        const result = await this.callMcpTool(toolCall.tool, toolCall.args);
        const duration = performance.now() - start;
        
        this.results.tool_calls[toolCall.type].push({
          tool: toolCall.tool,
          prompt: toolCall.args.prompt?.substring(0, 30) + '...',
          duration,
          success: result.success,
          response_length: result.response?.length || 0
        });
        
        console.log(`   ✅ ${toolCall.type} tool call ${i+1}: ${duration.toFixed(2)}ms`);
        
      } catch (error) {
        const duration = performance.now() - start;
        this.results.tool_calls[toolCall.type].push({
          tool: toolCall.tool,
          prompt: toolCall.args.prompt?.substring(0, 30) + '...',
          duration,
          error: error.message,
          success: false
        });
        console.log(`   ❌ ${toolCall.type} tool call ${i+1}: Failed (${duration.toFixed(2)}ms) - ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log();
  }

  async benchmarkConcurrentToolCalls() {
    console.log('⚡ Testing Concurrent MCP Tool Calls...');
    
    if (!this.serverReady || !this.mcpProcess) {
      console.log('   ❌ MCP server not ready, skipping concurrent calls');
      return;
    }

    const concurrentCount = 2; // Keep low to avoid overwhelming
    const promises = [];
    const startTime = performance.now();
    
    for (let i = 0; i < concurrentCount; i++) {
      const promise = this.makeConcurrentToolCall(i + 1);
      promises.push(promise);
    }
    
    try {
      const results = await Promise.all(promises);
      const totalDuration = performance.now() - startTime;
      
      this.results.tool_calls.concurrent = results;
      
      const successful = results.filter(r => r.success).length;
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      
      console.log(`   ✅ Concurrent tool calls: ${successful}/${concurrentCount} successful`);
      console.log(`   ✅ Total time: ${totalDuration.toFixed(2)}ms`);
      console.log(`   ✅ Average per call: ${avgDuration.toFixed(2)}ms`);
      
    } catch (error) {
      console.log(`   ❌ Concurrent test failed: ${error.message}`);
      this.results.errors.push(error.message);
    }
    console.log();
  }

  async makeConcurrentToolCall(id) {
    const start = performance.now();
    
    try {
      const result = await this.callMcpTool('claudette_optimize', {
        prompt: `Concurrent MCP test ${id}: What is artificial intelligence?`
      });
      
      const duration = performance.now() - start;
      
      return {
        id,
        duration,
        success: result.success,
        response_length: result.response?.length || 0
      };
      
    } catch (error) {
      const duration = performance.now() - start;
      return {
        id,
        duration,
        error: error.message,
        success: false
      };
    }
  }

  async callMcpTool(toolName, args) {
    return new Promise((resolve, reject) => {
      if (!this.mcpProcess || !this.serverReady) {
        reject(new Error('MCP server not ready'));
        return;
      }

      // Create MCP request
      const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        }
      };

      let responseData = '';
      let timeout = setTimeout(() => {
        reject(new Error('MCP tool call timeout'));
      }, 60000);

      const dataHandler = (data) => {
        responseData += data.toString();
        
        // Try to parse JSON response
        try {
          const lines = responseData.split('\n').filter(line => line.trim());
          for (const line of lines) {
            if (line.startsWith('{')) {
              const response = JSON.parse(line);
              if (response.id === request.id) {
                clearTimeout(timeout);
                this.mcpProcess.stdout.removeListener('data', dataHandler);
                
                if (response.error) {
                  reject(new Error(response.error.message || 'MCP tool error'));
                } else {
                  resolve({
                    success: true,
                    response: response.result?.content || response.result
                  });
                }
                return;
              }
            }
          }
        } catch (e) {
          // Continue collecting data
        }
      };

      this.mcpProcess.stdout.on('data', dataHandler);
      
      // Send request
      this.mcpProcess.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  generateReport() {
    console.log('📊 MCP Server Benchmark Results');
    console.log('===============================\n');

    // Server startup
    console.log('🚀 MCP Server Startup:');
    console.log(`   Duration: ${this.results.server_startup.duration?.toFixed(2) || 'N/A'}ms\n`);

    // Tool calls
    const simpleSuccessful = this.results.tool_calls.simple.filter(r => r.success);
    if (simpleSuccessful.length > 0) {
      const avgSimple = simpleSuccessful.reduce((sum, r) => sum + r.duration, 0) / simpleSuccessful.length;
      console.log('🛠️ Simple Tool Calls:');
      console.log(`   Count: ${simpleSuccessful.length}/${this.results.tool_calls.simple.length}`);
      console.log(`   Average: ${avgSimple.toFixed(2)}ms`);
    }

    const complexSuccessful = this.results.tool_calls.complex.filter(r => r.success);
    if (complexSuccessful.length > 0) {
      const avgComplex = complexSuccessful.reduce((sum, r) => sum + r.duration, 0) / complexSuccessful.length;
      console.log('🧠 Complex Tool Calls:');
      console.log(`   Count: ${complexSuccessful.length}/${this.results.tool_calls.complex.length}`);
      console.log(`   Average: ${avgComplex.toFixed(2)}ms`);
    }

    // Concurrent calls
    const concurrentSuccessful = this.results.tool_calls.concurrent.filter(r => r.success);
    if (concurrentSuccessful.length > 0) {
      const avgConcurrent = concurrentSuccessful.reduce((sum, r) => sum + r.duration, 0) / concurrentSuccessful.length;
      console.log('⚡ Concurrent Tool Calls:');
      console.log(`   Count: ${concurrentSuccessful.length}/${this.results.tool_calls.concurrent.length}`);
      console.log(`   Average: ${avgConcurrent.toFixed(2)}ms`);
    }

    // Memory usage
    console.log('🧠 Memory Usage:');
    console.log(`   Start: ${this.results.memory.start.toFixed(2)}MB`);
    console.log(`   Peak: ${this.results.memory.peak.toFixed(2)}MB`);
    console.log(`   End: ${this.results.memory.end.toFixed(2)}MB`);
    console.log(`   Growth: ${(this.results.memory.peak - this.results.memory.start).toFixed(2)}MB`);

    // Errors
    if (this.results.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    console.log('\n✅ MCP server benchmark completed successfully!');
  }

  getMemoryUsage() {
    const used = process.memoryUsage();
    return used.rss / 1024 / 1024; // Convert to MB
  }

  async cleanup() {
    if (this.mcpProcess && !this.mcpProcess.killed) {
      this.mcpProcess.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise(resolve => {
        setTimeout(() => {
          if (!this.mcpProcess.killed) {
            this.mcpProcess.kill('SIGKILL');
          }
          resolve();
        }, 2000);
      });
    }
  }
}

// Run benchmark if called directly
if (require.main === module) {
  const benchmark = new McpBenchmark();
  benchmark.run().catch(console.error);
}

module.exports = { McpBenchmark };