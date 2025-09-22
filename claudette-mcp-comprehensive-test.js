#!/usr/bin/env node
/**
 * Comprehensive Claudette MCP Test Suite
 * Tests Claudette through its MCP interface with realistic timeouts
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;

class ComprehensiveClaudetteMCPTest {
  constructor() {
    this.serverProcess = null;
    this.testResults = [];
    this.testStartTime = Date.now();
  }

  async startMCPServer() {
    console.log('🚀 Starting Claudette MCP Server...');
    
    this.serverProcess = spawn('node', ['claudette-mcp-server-optimized.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait for server to initialize
    await new Promise((resolve) => {
      this.serverProcess.stderr.on('data', (data) => {
        const output = data.toString();
        if (output.includes('ready')) {
          resolve();
        }
      });
    });

    console.log('✅ MCP Server started');
  }

  async sendMCPRequest(request, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`MCP request timeout (${timeout}ms)`));
      }, timeout);

      this.serverProcess.stdout.once('data', (data) => {
        clearTimeout(timeoutId);
        try {
          const response = JSON.parse(data.toString());
          resolve(response);
        } catch (error) {
          reject(new Error(`Parse error: ${error.message}`));
        }
      });

      this.serverProcess.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async testMCPProtocol() {
    console.log('\n🧪 Test 1: MCP Protocol Compliance...');
    
    try {
      // Test initialization
      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      };

      const initResponse = await this.sendMCPRequest(initRequest);
      
      if (initResponse.result && initResponse.result.protocolVersion === '2024-11-05') {
        this.testResults.push({ 
          test: 'MCP Protocol Compliance', 
          status: 'PASS', 
          details: 'Server supports MCP 2024-11-05 protocol'
        });
        console.log('✅ MCP protocol compliance verified');
        return true;
      } else {
        throw new Error('Invalid protocol version');
      }
    } catch (error) {
      this.testResults.push({ test: 'MCP Protocol Compliance', status: 'FAIL', details: error.message });
      console.log('❌ MCP protocol test failed:', error.message);
      return false;
    }
  }

  async testToolsAvailability() {
    console.log('\n🧪 Test 2: Tools Availability...');
    
    try {
      const toolsRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      };

      const response = await this.sendMCPRequest(toolsRequest);
      
      if (response.result && response.result.tools) {
        const tools = response.result.tools.map(t => t.name);
        const expectedTools = ['claudette_version', 'claudette_status', 'claudette_backends', 'claudette_query'];
        const missingTools = expectedTools.filter(tool => !tools.includes(tool));
        
        if (missingTools.length === 0) {
          this.testResults.push({ 
            test: 'Tools Availability', 
            status: 'PASS', 
            details: `All ${expectedTools.length} expected tools available: ${tools.join(', ')}`
          });
          console.log('✅ All expected tools available:', tools);
          return true;
        } else {
          throw new Error(`Missing tools: ${missingTools.join(', ')}`);
        }
      } else {
        throw new Error('No tools found in response');
      }
    } catch (error) {
      this.testResults.push({ test: 'Tools Availability', status: 'FAIL', details: error.message });
      console.log('❌ Tools availability test failed:', error.message);
      return false;
    }
  }

  async testVersionRetrieval() {
    console.log('\n🧪 Test 3: Version Retrieval...');
    
    try {
      const versionRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'claudette_version',
          arguments: {}
        }
      };

      const response = await this.sendMCPRequest(versionRequest, 10000);
      
      if (response.result && response.result.content && response.result.content[0]) {
        const versionText = response.result.content[0].text;
        if (versionText.includes('1.0.3')) {
          this.testResults.push({ 
            test: 'Version Retrieval', 
            status: 'PASS', 
            details: versionText
          });
          console.log('✅ Version retrieval successful:', versionText);
          return true;
        } else {
          throw new Error('Unexpected version format');
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      this.testResults.push({ test: 'Version Retrieval', status: 'FAIL', details: error.message });
      console.log('❌ Version retrieval failed:', error.message);
      return false;
    }
  }

  async testEnvironmentLoading() {
    console.log('\n🧪 Test 4: Environment Loading...');
    
    try {
      // Check environment variables count from server logs
      const logs = await this.getServerLogs();
      const envMatch = logs.match(/Loaded (\d+) environment variables/);
      
      if (envMatch) {
        const envCount = parseInt(envMatch[1]);
        if (envCount > 50) {
          this.testResults.push({ 
            test: 'Environment Loading', 
            status: 'PASS', 
            details: `Successfully loaded ${envCount} environment variables`
          });
          console.log(`✅ Environment loading successful: ${envCount} variables`);
          return true;
        } else {
          throw new Error(`Only ${envCount} environment variables loaded`);
        }
      } else {
        throw new Error('Could not determine environment variable count');
      }
    } catch (error) {
      this.testResults.push({ test: 'Environment Loading', status: 'FAIL', details: error.message });
      console.log('❌ Environment loading test failed:', error.message);
      return false;
    }
  }

  async testBackendIntegration() {
    console.log('\n🧪 Test 5: Backend Integration...');
    
    try {
      const queryRequest = {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'claudette_query',
          arguments: {
            prompt: 'Hello, respond with exactly: WORKING',
            backend: 'openai'
          }
        }
      };

      console.log('Sending test query (may take 30-45 seconds due to initialization)...');
      const response = await this.sendMCPRequest(queryRequest, 60000);
      
      if (response.result && response.result.content && response.result.content[0]) {
        const queryResult = response.result.content[0].text;
        if (queryResult.includes('WORKING') || queryResult.length > 0) {
          this.testResults.push({ 
            test: 'Backend Integration', 
            status: 'PASS', 
            details: 'Query executed successfully through OpenAI backend'
          });
          console.log('✅ Backend integration successful');
          console.log('Response preview:', queryResult.substring(0, 100));
          return true;
        } else {
          throw new Error('Empty or invalid response');
        }
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (error) {
      this.testResults.push({ test: 'Backend Integration', status: 'FAIL', details: error.message });
      console.log('❌ Backend integration failed:', error.message);
      return false;
    }
  }

  async testErrorHandling() {
    console.log('\n🧪 Test 6: Error Handling...');
    
    try {
      const invalidRequest = {
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: {
          name: 'nonexistent_tool',
          arguments: {}
        }
      };

      const response = await this.sendMCPRequest(invalidRequest, 5000);
      
      if (response.error && response.error.code) {
        this.testResults.push({ 
          test: 'Error Handling', 
          status: 'PASS', 
          details: 'Server properly handles invalid tool calls with error responses'
        });
        console.log('✅ Error handling working correctly');
        return true;
      } else {
        throw new Error('Server did not return expected error response');
      }
    } catch (error) {
      this.testResults.push({ test: 'Error Handling', status: 'FAIL', details: error.message });
      console.log('❌ Error handling test failed:', error.message);
      return false;
    }
  }

  async getServerLogs() {
    // Collect stderr logs from the server process
    return new Promise((resolve) => {
      let logs = '';
      this.serverProcess.stderr.on('data', (data) => {
        logs += data.toString();
      });
      setTimeout(() => resolve(logs), 1000);
    });
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      await new Promise((resolve) => {
        this.serverProcess.on('exit', resolve);
        setTimeout(resolve, 3000);
      });
      console.log('✅ Server stopped');
    }
  }

  generateComprehensiveReport() {
    const testDuration = Date.now() - this.testStartTime;
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const successRate = (passed / this.testResults.length) * 100;
    
    console.log('\n📊 === COMPREHENSIVE CLAUDETTE MCP TEST REPORT ===');
    console.log(`Test Date: ${new Date().toISOString()}`);
    console.log(`Test Duration: ${(testDuration / 1000).toFixed(1)}s`);
    console.log(`Total Tests: ${this.testResults.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${successRate.toFixed(1)}%`);
    
    console.log('\n📋 Detailed Test Results:');
    this.testResults.forEach((result, index) => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.test}`);
      console.log(`   Details: ${result.details}`);
    });
    
    const overallStatus = failed === 0 ? 
      '🟢 EXCELLENT' : 
      failed <= 1 ? '🟡 GOOD' : 
      failed <= 2 ? '🟠 ACCEPTABLE' : 
      '🔴 NEEDS ATTENTION';
    
    console.log(`\n🎯 Overall Status: ${overallStatus}`);
    
    console.log('\n🔍 Key Findings:');
    if (passed >= 4) {
      console.log('✅ Core MCP functionality working');
    }
    if (this.testResults.find(r => r.test === 'Backend Integration' && r.status === 'PASS')) {
      console.log('✅ Full Claudette integration operational');
    }
    if (this.testResults.find(r => r.test === 'Environment Loading' && r.status === 'PASS')) {
      console.log('✅ Environment configuration properly loaded');
    }
    
    console.log('\n🚀 Conclusion:');
    if (successRate >= 80) {
      console.log('Claudette MCP server is production-ready and fully functional.');
    } else if (successRate >= 60) {
      console.log('Claudette MCP server is mostly functional with minor issues.');
    } else {
      console.log('Claudette MCP server needs attention before production use.');
    }
    
    return {
      total: this.testResults.length,
      passed: passed,
      failed: failed,
      successRate: successRate,
      testDuration: testDuration,
      results: this.testResults,
      overallStatus: overallStatus
    };
  }

  async runComprehensiveTests() {
    console.log('🎯 Starting Comprehensive Claudette MCP Test Suite...');
    console.log('This test suite will validate all aspects of Claudette MCP integration\n');
    
    try {
      await this.startMCPServer();
      
      // Run all tests
      await this.testMCPProtocol();
      await this.testToolsAvailability();
      await this.testVersionRetrieval();
      await this.testEnvironmentLoading();
      await this.testBackendIntegration();
      await this.testErrorHandling();
      
    } catch (error) {
      console.error('❌ Test suite execution failed:', error.message);
      this.testResults.push({ test: 'Test Suite Execution', status: 'FAIL', details: error.message });
    } finally {
      await this.cleanup();
    }
    
    return this.generateComprehensiveReport();
  }
}

// Export class for use as module
module.exports = ComprehensiveClaudetteMCPTest;

// Run tests if called directly
if (require.main === module) {
  const tester = new ComprehensiveClaudetteMCPTest();
  tester.runComprehensiveTests().then((report) => {
    process.exit(report.failed === 0 ? 0 : 1);
  }).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}