#!/usr/bin/env node
/**
 * Test the fixed MCP server with proper environment loading
 */

const { spawn } = require('child_process');

class FixedMCPTest {
  constructor() {
    this.serverProcess = null;
    this.testResults = {};
  }

  async log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
  }

  async startMCPServer() {
    this.log('Starting Fixed MCP Server...');
    
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('node', ['mcp-server-with-env.js'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: process.env
      });

      let initComplete = false;

      this.serverProcess.stderr.on('data', (data) => {
        const output = data.toString();
        this.log(`Server stderr: ${output.trim()}`, 'DEBUG');
        
        if (output.includes('Claudette MCP Server ready with environment loaded') && !initComplete) {
          initComplete = true;
          setTimeout(() => resolve(), 1000);
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
      }, 45000); // 45 second timeout for longer queries

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

  async testQuickQuery() {
    this.log('Testing quick query with environment variables...');
    
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'claudette_query',
        arguments: {
          prompt: 'Say hello world in exactly 3 words',
          backend: 'openai',
          verbose: false
        }
      }
    };

    try {
      const { response, responseTime } = await this.sendRequest(request);
      
      if (response.error) {
        this.log(`❌ Query failed: ${response.error.message}`, 'ERROR');
        this.testResults.query_test = { success: false, error: response.error.message, responseTime };
      } else if (response.result && response.result.content) {
        this.log(`✅ Query succeeded in ${responseTime}ms`, 'SUCCESS');
        this.log(`Response: ${response.result.content[0].text.substring(0, 100)}...`);
        this.testResults.query_test = { success: true, responseTime, contentLength: response.result.content[0].text.length };
      } else {
        this.log('❌ Unexpected response format', 'ERROR');
        this.testResults.query_test = { success: false, error: 'Unexpected response format', responseTime };
      }
    } catch (error) {
      this.log(`❌ Query test failed: ${error.message}`, 'ERROR');
      this.testResults.query_test = { success: false, error: error.message, responseTime: 0 };
    }
  }

  async testStatus() {
    this.log('Testing status command...');
    
    const request = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'claudette_status',
        arguments: {}
      }
    };

    try {
      const { response, responseTime } = await this.sendRequest(request);
      
      if (response.error) {
        this.log(`⚠️  Status failed but may be expected: ${response.error.message}`, 'WARN');
        this.testResults.status_test = { success: false, error: response.error.message, responseTime };
      } else if (response.result && response.result.content) {
        this.log(`✅ Status succeeded in ${responseTime}ms`, 'SUCCESS');
        this.log(`Status info: ${response.result.content[0].text.substring(0, 200)}...`);
        this.testResults.status_test = { success: true, responseTime, contentLength: response.result.content[0].text.length };
      } else {
        this.log('❌ Unexpected response format', 'ERROR');
        this.testResults.status_test = { success: false, error: 'Unexpected response format', responseTime };
      }
    } catch (error) {
      this.log(`❌ Status test failed: ${error.message}`, 'ERROR');
      this.testResults.status_test = { success: false, error: error.message, responseTime: 0 };
    }
  }

  async testInitialize() {
    this.log('Testing initialize...');
    
    const request = {
      jsonrpc: '2.0',
      id: 3,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {}
      }
    };

    try {
      const { response, responseTime } = await this.sendRequest(request);
      
      if (response.result) {
        this.log(`✅ Initialize succeeded in ${responseTime}ms`, 'SUCCESS');
        this.testResults.initialize_test = { success: true, responseTime };
      } else {
        this.log('❌ Initialize failed', 'ERROR');
        this.testResults.initialize_test = { success: false, error: 'No result', responseTime };
      }
    } catch (error) {
      this.log(`❌ Initialize test failed: ${error.message}`, 'ERROR');
      this.testResults.initialize_test = { success: false, error: error.message, responseTime: 0 };
    }
  }

  async runTests() {
    try {
      await this.startMCPServer();
      this.log('✅ MCP Server started successfully');

      await this.testInitialize();
      await this.testStatus();
      await this.testQuickQuery();

      this.generateReport();
    } catch (error) {
      this.log(`💥 Critical test failure: ${error.message}`, 'ERROR');
    } finally {
      this.cleanup();
    }
  }

  generateReport() {
    this.log('\n📊 FIXED MCP SERVER TEST RESULTS:');
    
    Object.entries(this.testResults).forEach(([testName, result]) => {
      const status = result.success ? '✅' : '❌';
      const time = result.responseTime ? `(${result.responseTime}ms)` : '';
      const error = result.error ? ` - ${result.error}` : '';
      
      this.log(`   ${status} ${testName}: ${result.success ? 'PASSED' : 'FAILED'} ${time}${error}`);
    });

    const successCount = Object.values(this.testResults).filter(r => r.success).length;
    const totalCount = Object.keys(this.testResults).length;
    
    this.log(`\n📈 SUMMARY: ${successCount}/${totalCount} tests passed`);
    
    if (successCount === totalCount) {
      this.log('🎉 All tests passed! The MCP server is working correctly.');
    } else {
      this.log('⚠️  Some tests failed. Check the detailed output above.');
    }
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

if (require.main === module) {
  const testSuite = new FixedMCPTest();
  
  process.on('SIGINT', () => {
    console.log('\n🛑 Test interrupted');
    testSuite.cleanup();
    process.exit(1);
  });

  testSuite.runTests().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Test suite failed:', error);
    testSuite.cleanup();
    process.exit(1);
  });
}

module.exports = FixedMCPTest;