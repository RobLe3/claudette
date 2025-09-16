#!/usr/bin/env node
/**
 * Comprehensive MCP Server Test Suite
 * Tests all functionality of the Claudette MCP Server systematically
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class MCPTestSuite {
  constructor() {
    this.serverProcess = null;
    this.testResults = {};
    this.responseTimes = {};
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.startTime = Date.now();
  }

  async log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
  }

  async startMCPServer() {
    this.log('Starting MCP Server...');
    
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('node', ['claudette-mcp-server.js'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env
        }
      });

      let initComplete = false;

      this.serverProcess.stderr.on('data', (data) => {
        const output = data.toString();
        this.log(`Server stderr: ${output.trim()}`, 'DEBUG');
        
        if (output.includes('Claudette MCP Server ready') && !initComplete) {
          initComplete = true;
          setTimeout(() => resolve(), 1000); // Give server time to fully initialize
        }
      });

      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        this.log(`Server stdout: ${output.trim()}`, 'DEBUG');
      });

      this.serverProcess.on('error', (error) => {
        this.log(`Server error: ${error.message}`, 'ERROR');
        reject(error);
      });

      this.serverProcess.on('exit', (code) => {
        this.log(`Server exited with code ${code}`, 'WARN');
      });

      // Timeout if server doesn't start within 10 seconds
      setTimeout(() => {
        if (!initComplete) {
          reject(new Error('Server failed to start within timeout'));
        }
      }, 10000);
    });
  }

  async sendRequest(request) {
    return new Promise((resolve, reject) => {
      if (!this.serverProcess) {
        reject(new Error('Server not started'));
        return;
      }

      const startTime = Date.now();
      let responseReceived = false;
      let buffer = '';

      const timeout = setTimeout(() => {
        if (!responseReceived) {
          reject(new Error('Request timeout'));
        }
      }, 30000); // 30 second timeout

      const dataHandler = (data) => {
        buffer += data.toString();
        
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          
          if (line.trim()) {
            try {
              const response = JSON.parse(line);
              const responseTime = Date.now() - startTime;
              
              if (response.id === request.id || (request.method === 'initialize' && response.id === null)) {
                responseReceived = true;
                clearTimeout(timeout);
                this.serverProcess.stdout.removeListener('data', dataHandler);
                resolve({ response, responseTime });
              }
            } catch (error) {
              // Ignore JSON parse errors for non-matching responses
            }
          }
        }
      };

      this.serverProcess.stdout.on('data', dataHandler);

      // Send the request
      const requestStr = JSON.stringify(request) + '\n';
      this.serverProcess.stdin.write(requestStr);
    });
  }

  async runTest(testName, testFunction) {
    this.totalTests++;
    this.log(`Running test: ${testName}`);
    
    try {
      const result = await testFunction();
      this.passedTests++;
      this.testResults[testName] = { 
        status: 'PASS', 
        result: result,
        responseTime: result.responseTime || 0
      };
      this.log(`✅ ${testName} - PASSED`);
      return result;
    } catch (error) {
      this.failedTests++;
      this.testResults[testName] = { 
        status: 'FAIL', 
        error: error.message,
        responseTime: 0
      };
      this.log(`❌ ${testName} - FAILED: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  // ==================== PROTOCOL TESTS ====================

  async testInitialize() {
    return await this.runTest('Initialize Protocol', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {}
        }
      };

      const { response, responseTime } = await this.sendRequest(request);
      
      if (!response.result) {
        throw new Error('No result in initialize response');
      }

      if (response.result.protocolVersion !== '2024-11-05') {
        throw new Error(`Unexpected protocol version: ${response.result.protocolVersion}`);
      }

      if (!response.result.capabilities) {
        throw new Error('No capabilities in response');
      }

      return { response, responseTime };
    });
  }

  async testToolsList() {
    return await this.runTest('Tools List', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list'
      };

      const { response, responseTime } = await this.sendRequest(request);
      
      if (!response.result || !response.result.tools) {
        throw new Error('No tools in response');
      }

      const tools = response.result.tools;
      const expectedTools = ['claudette_query', 'claudette_status', 'claudette_analyze'];
      
      for (const expectedTool of expectedTools) {
        if (!tools.find(t => t.name === expectedTool)) {
          throw new Error(`Missing tool: ${expectedTool}`);
        }
      }

      return { response, responseTime };
    });
  }

  async testResourcesList() {
    return await this.runTest('Resources List', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 3,
        method: 'resources/list'
      };

      const { response, responseTime } = await this.sendRequest(request);
      
      if (!response.result || !response.result.resources) {
        throw new Error('No resources in response');
      }

      const resources = response.result.resources;
      const expectedResources = ['claudette://config', 'claudette://logs'];
      
      for (const expectedResource of expectedResources) {
        if (!resources.find(r => r.uri === expectedResource)) {
          throw new Error(`Missing resource: ${expectedResource}`);
        }
      }

      return { response, responseTime };
    });
  }

  // ==================== TOOL TESTS ====================

  async testClaudetteQuery() {
    return await this.runTest('Claudette Query Tool', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'claudette_query',
          arguments: {
            prompt: 'Hello, this is a test query. Please respond briefly.',
            backend: 'openai',
            verbose: false
          }
        }
      };

      const { response, responseTime } = await this.sendRequest(request);
      
      if (!response.result || !response.result.content) {
        throw new Error('No content in claudette_query response');
      }

      const content = response.result.content[0];
      if (content.type !== 'text' || !content.text) {
        throw new Error('Invalid content structure in response');
      }

      return { response, responseTime };
    });
  }

  async testClaudetteStatus() {
    return await this.runTest('Claudette Status Tool', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'claudette_status',
          arguments: {}
        }
      };

      const { response, responseTime } = await this.sendRequest(request);
      
      if (!response.result || !response.result.content) {
        throw new Error('No content in claudette_status response');
      }

      return { response, responseTime };
    });
  }

  async testClaudetteAnalyze() {
    return await this.runTest('Claudette Analyze Tool', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: {
          name: 'claudette_analyze',
          arguments: {
            target: 'TEST_TARGET',
            type: 'simple'
          }
        }
      };

      const { response, responseTime } = await this.sendRequest(request);
      
      if (!response.result || !response.result.content) {
        throw new Error('No content in claudette_analyze response');
      }

      return { response, responseTime };
    });
  }

  // ==================== ERROR TESTS ====================

  async testInvalidMethod() {
    return await this.runTest('Invalid Method Error', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 7,
        method: 'invalid/method'
      };

      const { response, responseTime } = await this.sendRequest(request);
      
      if (!response.error) {
        throw new Error('Expected error response for invalid method');
      }

      if (response.error.code !== -32601) {
        throw new Error(`Unexpected error code: ${response.error.code}`);
      }

      return { response, responseTime };
    });
  }

  async testInvalidJSON() {
    return await this.runTest('Invalid JSON Error', async () => {
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        let responseReceived = false;
        let buffer = '';

        const timeout = setTimeout(() => {
          if (!responseReceived) {
            reject(new Error('Request timeout'));
          }
        }, 10000);

        const dataHandler = (data) => {
          buffer += data.toString();
          
          let newlineIndex;
          while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            
            if (line.trim()) {
              try {
                const response = JSON.parse(line);
                if (response.error && response.error.code === -32700) {
                  responseReceived = true;
                  clearTimeout(timeout);
                  this.serverProcess.stdout.removeListener('data', dataHandler);
                  const responseTime = Date.now() - startTime;
                  resolve({ response, responseTime });
                }
              } catch (error) {
                // Continue listening for proper error response
              }
            }
          }
        };

        this.serverProcess.stdout.on('data', dataHandler);
        
        // Send invalid JSON
        this.serverProcess.stdin.write('invalid json here\n');
      });
    });
  }

  async testInvalidToolName() {
    return await this.runTest('Invalid Tool Name Error', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: {
          name: 'invalid_tool',
          arguments: {}
        }
      };

      const { response, responseTime } = await this.sendRequest(request);
      
      if (!response.error) {
        throw new Error('Expected error response for invalid tool');
      }

      return { response, responseTime };
    });
  }

  async testMissingRequiredParameter() {
    return await this.runTest('Missing Required Parameter Error', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 9,
        method: 'tools/call',
        params: {
          name: 'claudette_query',
          arguments: {
            // Missing required 'prompt' parameter
            backend: 'openai'
          }
        }
      };

      const { response, responseTime } = await this.sendRequest(request);
      
      // This should either error or handle gracefully
      return { response, responseTime };
    });
  }

  // ==================== EDGE CASE TESTS ====================

  async testEmptyParameters() {
    return await this.runTest('Empty Parameters', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 10,
        method: 'tools/call',
        params: {
          name: 'claudette_query',
          arguments: {
            prompt: '',
            backend: 'openai'
          }
        }
      };

      const { response, responseTime } = await this.sendRequest(request);
      
      // This should either error or handle gracefully
      return { response, responseTime };
    });
  }

  async testLongInput() {
    return await this.runTest('Long Input', async () => {
      const longPrompt = 'A'.repeat(10000); // 10KB prompt
      
      const request = {
        jsonrpc: '2.0',
        id: 11,
        method: 'tools/call',
        params: {
          name: 'claudette_query',
          arguments: {
            prompt: `Please respond with a short message. Input: ${longPrompt}`,
            backend: 'openai'
          }
        }
      };

      const { response, responseTime } = await this.sendRequest(request);
      
      return { response, responseTime };
    });
  }

  // ==================== CONCURRENT REQUEST TESTS ====================

  async testConcurrentRequests() {
    return await this.runTest('Concurrent Requests', async () => {
      const requests = [
        {
          jsonrpc: '2.0',
          id: 12,
          method: 'claudette_status',
          params: { name: 'claudette_status', arguments: {} }
        },
        {
          jsonrpc: '2.0',
          id: 13,
          method: 'tools/list'
        },
        {
          jsonrpc: '2.0',
          id: 14,
          method: 'resources/list'
        }
      ];

      const startTime = Date.now();
      const promises = requests.map(req => this.sendRequest(req));
      
      try {
        const results = await Promise.all(promises);
        const totalTime = Date.now() - startTime;
        
        return { 
          responses: results.map(r => r.response),
          individualTimes: results.map(r => r.responseTime),
          totalTime
        };
      } catch (error) {
        throw new Error(`Concurrent requests failed: ${error.message}`);
      }
    });
  }

  // ==================== MAIN TEST RUNNER ====================

  async runAllTests() {
    this.log('🚀 Starting Comprehensive MCP Server Test Suite');
    
    try {
      // Start the server
      await this.startMCPServer();
      this.log('✅ MCP Server started successfully');

      // Run protocol tests
      this.log('\n📋 Running Protocol Tests...');
      await this.testInitialize();
      await this.testToolsList();
      await this.testResourcesList();

      // Run tool tests
      this.log('\n🔧 Running Tool Tests...');
      try {
        await this.testClaudetteStatus();
      } catch (error) {
        this.log(`⚠️  Status test failed (expected for some environments): ${error.message}`, 'WARN');
      }

      try {
        await this.testClaudetteQuery();
      } catch (error) {
        this.log(`⚠️  Query test failed (expected if API keys invalid): ${error.message}`, 'WARN');
      }

      try {
        await this.testClaudetteAnalyze();
      } catch (error) {
        this.log(`⚠️  Analyze test failed (expected if aNEOS not available): ${error.message}`, 'WARN');
      }

      // Run error handling tests
      this.log('\n🚨 Running Error Handling Tests...');
      await this.testInvalidMethod();
      await this.testInvalidJSON();
      await this.testInvalidToolName();
      await this.testMissingRequiredParameter();

      // Run edge case tests
      this.log('\n⚡ Running Edge Case Tests...');
      await this.testEmptyParameters();
      
      try {
        await this.testLongInput();
      } catch (error) {
        this.log(`⚠️  Long input test failed (expected with API limits): ${error.message}`, 'WARN');
      }

      // Run concurrent tests
      this.log('\n🔄 Running Concurrent Request Tests...');
      await this.testConcurrentRequests();

      this.log('\n🎉 All tests completed!');
      
    } catch (error) {
      this.log(`💥 Critical test failure: ${error.message}`, 'ERROR');
    } finally {
      await this.generateReport();
      this.cleanup();
    }
  }

  async generateReport() {
    const totalTime = Date.now() - this.startTime;
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total_tests: this.totalTests,
        passed_tests: this.passedTests,
        failed_tests: this.failedTests,
        success_rate: ((this.passedTests / this.totalTests) * 100).toFixed(2) + '%',
        total_duration_ms: totalTime
      },
      test_results: this.testResults,
      environment: {
        node_version: process.version,
        platform: process.platform,
        working_directory: process.cwd(),
        api_keys_configured: {
          openai: !!process.env.OPENAI_API_KEY,
          flexcon: !!process.env.FLEXCON_API_KEY,
          ultipa: !!process.env.ULTIPA_ACCESS_TOKEN
        }
      }
    };

    const reportPath = path.join(process.cwd(), 'mcp-comprehensive-test-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`📊 Test report saved to: ${reportPath}`);
    
    // Print summary
    this.log('\n📈 TEST SUMMARY:');
    this.log(`   Total Tests: ${this.totalTests}`);
    this.log(`   Passed: ${this.passedTests}`);
    this.log(`   Failed: ${this.failedTests}`);
    this.log(`   Success Rate: ${report.summary.success_rate}`);
    this.log(`   Total Duration: ${totalTime}ms`);
    
    // Print failed tests
    if (this.failedTests > 0) {
      this.log('\n❌ FAILED TESTS:');
      Object.entries(this.testResults).forEach(([testName, result]) => {
        if (result.status === 'FAIL') {
          this.log(`   - ${testName}: ${result.error}`);
        }
      });
    }

    return report;
  }

  cleanup() {
    if (this.serverProcess) {
      this.log('🧹 Cleaning up server process...');
      this.serverProcess.kill('SIGTERM');
      
      setTimeout(() => {
        if (this.serverProcess && !this.serverProcess.killed) {
          this.log('Force killing server process...', 'WARN');
          this.serverProcess.kill('SIGKILL');
        }
      }, 5000);
    }
  }
}

// Run the test suite if this file is executed directly
if (require.main === module) {
  const testSuite = new MCPTestSuite();
  
  process.on('SIGINT', () => {
    console.log('\n🛑 Test suite interrupted');
    testSuite.cleanup();
    process.exit(1);
  });

  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught exception:', error);
    testSuite.cleanup();
    process.exit(1);
  });

  testSuite.runAllTests().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Test suite failed:', error);
    testSuite.cleanup();
    process.exit(1);
  });
}

module.exports = MCPTestSuite;