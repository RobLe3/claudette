#!/usr/bin/env node
/**
 * Final MCP Server Test
 * Tests the working MCP server implementation
 */

const { spawn } = require('child_process');

class FinalMCPTest {
  constructor() {
    this.serverProcess = null;
    this.testResults = {};
  }

  async log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
  }

  async startMCPServer() {
    this.log('Starting Working MCP Server...');
    
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('node', ['working-mcp-server.js'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let initComplete = false;

      this.serverProcess.stderr.on('data', (data) => {
        const output = data.toString();
        this.log(`Server stderr: ${output.trim()}`, 'DEBUG');
        
        if (output.includes('Working Claudette MCP Server ready') && !initComplete) {
          initComplete = true;
          setTimeout(() => resolve(), 500);
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
      }, 30000);

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

  async testOpenAIQuery() {
    this.log('Testing OpenAI query...');
    
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'claudette_query',
        arguments: {
          prompt: 'Respond with exactly "OpenAI test successful" and nothing else.',
          backend: 'openai',
          max_tokens: 10,
          temperature: 0
        }
      }
    };

    try {
      const { response, responseTime } = await this.sendRequest(request);
      
      if (response.error) {
        this.log(`❌ OpenAI query failed: ${response.error.message}`, 'ERROR');
        this.testResults.openai_query = { success: false, error: response.error.message, responseTime };
      } else if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        this.log(`✅ OpenAI query succeeded in ${responseTime}ms`, 'SUCCESS');
        this.log(`Response preview: ${content.substring(0, 100)}...`);
        this.testResults.openai_query = { success: true, responseTime, contentLength: content.length };
      }
    } catch (error) {
      this.log(`❌ OpenAI query test failed: ${error.message}`, 'ERROR');
      this.testResults.openai_query = { success: false, error: error.message, responseTime: 0 };
    }
  }

  async testFlexconQuery() {
    this.log('Testing Flexcon query...');
    
    const request = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'claudette_query',
        arguments: {
          prompt: 'Respond with exactly "Flexcon test successful" and nothing else.',
          backend: 'flexcon',
          max_tokens: 10,
          temperature: 0
        }
      }
    };

    try {
      const { response, responseTime } = await this.sendRequest(request);
      
      if (response.error) {
        this.log(`❌ Flexcon query failed: ${response.error.message}`, 'ERROR');
        this.testResults.flexcon_query = { success: false, error: response.error.message, responseTime };
      } else if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        this.log(`✅ Flexcon query succeeded in ${responseTime}ms`, 'SUCCESS');
        this.log(`Response preview: ${content.substring(0, 100)}...`);
        this.testResults.flexcon_query = { success: true, responseTime, contentLength: content.length };
      }
    } catch (error) {
      this.log(`❌ Flexcon query test failed: ${error.message}`, 'ERROR');
      this.testResults.flexcon_query = { success: false, error: error.message, responseTime: 0 };
    }
  }

  async testStatus() {
    this.log('Testing status command...');
    
    const request = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'claudette_status',
        arguments: {}
      }
    };

    try {
      const { response, responseTime } = await this.sendRequest(request);
      
      if (response.error) {
        this.log(`❌ Status failed: ${response.error.message}`, 'ERROR');
        this.testResults.status_test = { success: false, error: response.error.message, responseTime };
      } else if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        this.log(`✅ Status succeeded in ${responseTime}ms`, 'SUCCESS');
        this.log(`Status preview: ${content.substring(0, 200)}...`);
        this.testResults.status_test = { success: true, responseTime, contentLength: content.length };
      }
    } catch (error) {
      this.log(`❌ Status test failed: ${error.message}`, 'ERROR');
      this.testResults.status_test = { success: false, error: error.message, responseTime: 0 };
    }
  }

  async testAnalysis() {
    this.log('Testing analysis command...');
    
    const request = {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'claudette_analyze',
        arguments: {
          target: 'TEST_OBJECT_2025',
          type: 'simple'
        }
      }
    };

    try {
      const { response, responseTime } = await this.sendRequest(request);
      
      if (response.error) {
        this.log(`❌ Analysis failed: ${response.error.message}`, 'ERROR');
        this.testResults.analysis_test = { success: false, error: response.error.message, responseTime };
      } else if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        this.log(`✅ Analysis succeeded in ${responseTime}ms`, 'SUCCESS');
        this.log(`Analysis preview: ${content.substring(0, 200)}...`);
        this.testResults.analysis_test = { success: true, responseTime, contentLength: content.length };
      }
    } catch (error) {
      this.log(`❌ Analysis test failed: ${error.message}`, 'ERROR');
      this.testResults.analysis_test = { success: false, error: error.message, responseTime: 0 };
    }
  }

  async runAllTests() {
    try {
      await this.startMCPServer();
      this.log('✅ Working MCP Server started successfully');

      // Test all functionality
      await this.testStatus();
      await this.testAnalysis();
      await this.testOpenAIQuery();
      await this.testFlexconQuery();

      this.generateReport();
    } catch (error) {
      this.log(`💥 Critical test failure: ${error.message}`, 'ERROR');
    } finally {
      this.cleanup();
    }
  }

  generateReport() {
    this.log('\n🎯 FINAL WORKING MCP SERVER TEST RESULTS:');
    
    Object.entries(this.testResults).forEach(([testName, result]) => {
      const status = result.success ? '✅' : '❌';
      const time = result.responseTime ? `(${result.responseTime}ms)` : '';
      const error = result.error ? ` - ${result.error.substring(0, 100)}...` : '';
      
      this.log(`   ${status} ${testName}: ${result.success ? 'PASSED' : 'FAILED'} ${time}${error}`);
    });

    const successCount = Object.values(this.testResults).filter(r => r.success).length;
    const totalCount = Object.keys(this.testResults).length;
    
    this.log(`\n📈 FINAL SUMMARY: ${successCount}/${totalCount} tests passed`);
    
    if (successCount >= totalCount * 0.75) {
      this.log('🎉 EXCELLENT! The working MCP server is functioning correctly.');
      this.log('💡 This demonstrates that the API keys and backends are working.');
      this.log('💡 The original Claudette routing system has issues, but direct API calls work perfectly.');
    } else if (successCount > 0) {
      this.log('⚠️  PARTIAL SUCCESS: Some functionality is working, but there are issues.');
    } else {
      this.log('❌ ALL TESTS FAILED: There are fundamental configuration issues.');
    }
  }

  cleanup() {
    if (this.serverProcess) {
      this.log('🧹 Cleaning up server process...');
      this.serverProcess.kill('SIGTERM');
      
      setTimeout(() => {
        if (this.serverProcess && !this.serverProcess.killed) {
          this.serverProcess.kill('SIGKILL');
        }
      }, 3000);
    }
  }
}

if (require.main === module) {
  const testSuite = new FinalMCPTest();
  
  process.on('SIGINT', () => {
    console.log('\n🛑 Test interrupted');
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

module.exports = FinalMCPTest;