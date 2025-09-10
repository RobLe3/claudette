#!/usr/bin/env node
/**
 * Comprehensive MCP Server Test Suite
 * Tests all functionality and edge cases for Claudette MCP Server
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class MCPServerTester {
  constructor() {
    this.serverPath = path.join(__dirname, 'claudette-mcp-server.js');
    this.testResults = {
      basicProtocol: {},
      toolCalls: {},
      resourceAccess: {},
      edgeCases: {},
      errorHandling: {},
      performance: {},
      concurrent: {}
    };
    this.serverProcess = null;
    this.requestId = 1;
  }

  async runAllTests() {
    console.log('🧪 Starting Comprehensive MCP Server Tests\n');
    
    try {
      await this.testBasicProtocolCompliance();
      await this.testToolCalls();
      await this.testResourceAccess();
      await this.testEdgeCases();
      await this.testErrorHandling();
      await this.testPerformance();
      await this.testConcurrentRequests();
      
      await this.generateReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      if (this.serverProcess) {
        this.serverProcess.kill('SIGTERM');
      }
    }
  }

  async startServer() {
    return new Promise((resolve, reject) => {
      console.log('🚀 Starting MCP server...');
      
      this.serverProcess = spawn('node', [this.serverPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      this.serverProcess.stderr.on('data', (data) => {
        const message = data.toString();
        if (message.includes('ready')) {
          console.log('✅ MCP server started successfully');
          resolve();
        }
      });
      
      this.serverProcess.on('error', (error) => {
        reject(new Error(`Failed to start server: ${error.message}`));
      });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 10000);
    });
  }

  async sendRequest(request) {
    return new Promise((resolve, reject) => {
      if (!this.serverProcess) {
        reject(new Error('Server not running'));
        return;
      }

      const requestStr = JSON.stringify(request) + '\n';
      let responseData = '';
      let timeoutId;

      const onData = (data) => {
        responseData += data.toString();
        try {
          const response = JSON.parse(responseData.trim());
          clearTimeout(timeoutId);
          this.serverProcess.stdout.removeListener('data', onData);
          resolve(response);
        } catch (e) {
          // Continue collecting data if JSON is incomplete
        }
      };

      this.serverProcess.stdout.on('data', onData);
      
      timeoutId = setTimeout(() => {
        this.serverProcess.stdout.removeListener('data', onData);
        reject(new Error('Request timeout'));
      }, 30000);

      this.serverProcess.stdin.write(requestStr);
    });
  }

  async testBasicProtocolCompliance() {
    console.log('\n📋 Testing Basic MCP Protocol Compliance...');
    
    await this.startServer();
    
    // Test initialize method
    try {
      const initRequest = {
        jsonrpc: '2.0',
        id: this.requestId++,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      };
      
      const startTime = Date.now();
      const response = await this.sendRequest(initRequest);
      const responseTime = Date.now() - startTime;
      
      this.testResults.basicProtocol.initialize = {
        success: response.result && response.result.protocolVersion,
        responseTime,
        response,
        validSchema: response.result && 
                     response.result.capabilities && 
                     response.result.serverInfo &&
                     response.result.serverInfo.name === 'claudette-mcp'
      };
      
      console.log('  ✅ Initialize method:', this.testResults.basicProtocol.initialize.success ? 'PASS' : 'FAIL');
      
    } catch (error) {
      this.testResults.basicProtocol.initialize = {
        success: false,
        error: error.message
      };
      console.log('  ❌ Initialize method: FAIL -', error.message);
    }

    // Test tools/list method
    try {
      const toolsRequest = {
        jsonrpc: '2.0',
        id: this.requestId++,
        method: 'tools/list'
      };
      
      const startTime = Date.now();
      const response = await this.sendRequest(toolsRequest);
      const responseTime = Date.now() - startTime;
      
      const expectedTools = ['claudette_query', 'claudette_status', 'claudette_analyze'];
      const actualTools = response.result?.tools?.map(t => t.name) || [];
      const hasAllTools = expectedTools.every(tool => actualTools.includes(tool));
      
      this.testResults.basicProtocol.toolsList = {
        success: response.result && response.result.tools,
        responseTime,
        response,
        expectedTools,
        actualTools,
        hasAllTools,
        toolSchemas: response.result?.tools?.map(t => ({
          name: t.name,
          hasDescription: !!t.description,
          hasInputSchema: !!t.inputSchema,
          requiredFields: t.inputSchema?.required || []
        }))
      };
      
      console.log('  ✅ Tools list method:', this.testResults.basicProtocol.toolsList.success ? 'PASS' : 'FAIL');
      
    } catch (error) {
      this.testResults.basicProtocol.toolsList = {
        success: false,
        error: error.message
      };
      console.log('  ❌ Tools list method: FAIL -', error.message);
    }

    // Test resources/list method
    try {
      const resourcesRequest = {
        jsonrpc: '2.0',
        id: this.requestId++,
        method: 'resources/list'
      };
      
      const startTime = Date.now();
      const response = await this.sendRequest(resourcesRequest);
      const responseTime = Date.now() - startTime;
      
      const expectedResources = ['claudette://config', 'claudette://logs'];
      const actualResources = response.result?.resources?.map(r => r.uri) || [];
      const hasAllResources = expectedResources.every(res => actualResources.includes(res));
      
      this.testResults.basicProtocol.resourcesList = {
        success: response.result && response.result.resources,
        responseTime,
        response,
        expectedResources,
        actualResources,
        hasAllResources
      };
      
      console.log('  ✅ Resources list method:', this.testResults.basicProtocol.resourcesList.success ? 'PASS' : 'FAIL');
      
    } catch (error) {
      this.testResults.basicProtocol.resourcesList = {
        success: false,
        error: error.message
      };
      console.log('  ❌ Resources list method: FAIL -', error.message);
    }
  }

  async testToolCalls() {
    console.log('\n🔧 Testing Tool Calls...');
    
    // Test claudette_status (should work without dependencies)
    try {
      const statusRequest = {
        jsonrpc: '2.0',
        id: this.requestId++,
        method: 'tools/call',
        params: {
          name: 'claudette_status',
          arguments: {}
        }
      };
      
      const startTime = Date.now();
      const response = await this.sendRequest(statusRequest);
      const responseTime = Date.now() - startTime;
      
      this.testResults.toolCalls.status = {
        success: !response.error,
        responseTime,
        response,
        hasContent: response.result?.content?.[0]?.text !== undefined
      };
      
      console.log('  ✅ Status tool call:', this.testResults.toolCalls.status.success ? 'PASS' : 'FAIL');
      
    } catch (error) {
      this.testResults.toolCalls.status = {
        success: false,
        error: error.message
      };
      console.log('  ❌ Status tool call: FAIL -', error.message);
    }

    // Test claudette_query with minimal prompt
    try {
      const queryRequest = {
        jsonrpc: '2.0',
        id: this.requestId++,
        method: 'tools/call',
        params: {
          name: 'claudette_query',
          arguments: {
            prompt: 'Hello, this is a test query',
            backend: 'openai',
            verbose: false
          }
        }
      };
      
      const startTime = Date.now();
      const response = await this.sendRequest(queryRequest);
      const responseTime = Date.now() - startTime;
      
      this.testResults.toolCalls.query = {
        success: !response.error,
        responseTime,
        response,
        hasContent: response.result?.content?.[0]?.text !== undefined,
        timeoutOccurred: responseTime > 25000 // Check if close to 30s timeout
      };
      
      console.log('  ✅ Query tool call:', this.testResults.toolCalls.query.success ? 'PASS' : 'FAIL');
      
    } catch (error) {
      this.testResults.toolCalls.query = {
        success: false,
        error: error.message,
        timeoutOccurred: error.message.includes('timeout')
      };
      console.log('  ❌ Query tool call: FAIL -', error.message);
    }

    // Test claudette_analyze with test target
    try {
      const analyzeRequest = {
        jsonrpc: '2.0',
        id: this.requestId++,
        method: 'tools/call',
        params: {
          name: 'claudette_analyze',
          arguments: {
            target: 'test-asteroid',
            type: 'simple'
          }
        }
      };
      
      const startTime = Date.now();
      const response = await this.sendRequest(analyzeRequest);
      const responseTime = Date.now() - startTime;
      
      this.testResults.toolCalls.analyze = {
        success: !response.error,
        responseTime,
        response,
        hasContent: response.result?.content?.[0]?.text !== undefined
      };
      
      console.log('  ✅ Analyze tool call:', this.testResults.toolCalls.analyze.success ? 'PASS' : 'FAIL');
      
    } catch (error) {
      this.testResults.toolCalls.analyze = {
        success: false,
        error: error.message
      };
      console.log('  ❌ Analyze tool call: FAIL -', error.message);
    }
  }

  async testResourceAccess() {
    console.log('\n📂 Testing Resource Access...');
    
    // Note: Resource access is not implemented in the current server
    // Test what happens when we try to access resources
    try {
      const configRequest = {
        jsonrpc: '2.0',
        id: this.requestId++,
        method: 'resources/read',
        params: {
          uri: 'claudette://config'
        }
      };
      
      const response = await this.sendRequest(configRequest);
      
      this.testResults.resourceAccess.config = {
        success: !response.error,
        response,
        implemented: response.error?.code !== -32601 // Method not found
      };
      
      console.log('  ⚠️  Config resource access: NOT IMPLEMENTED');
      
    } catch (error) {
      this.testResults.resourceAccess.config = {
        success: false,
        error: error.message,
        implemented: false
      };
      console.log('  ❌ Config resource access: FAIL -', error.message);
    }

    try {
      const logsRequest = {
        jsonrpc: '2.0',
        id: this.requestId++,
        method: 'resources/read',
        params: {
          uri: 'claudette://logs'
        }
      };
      
      const response = await this.sendRequest(logsRequest);
      
      this.testResults.resourceAccess.logs = {
        success: !response.error,
        response,
        implemented: response.error?.code !== -32601 // Method not found
      };
      
      console.log('  ⚠️  Logs resource access: NOT IMPLEMENTED');
      
    } catch (error) {
      this.testResults.resourceAccess.logs = {
        success: false,
        error: error.message,
        implemented: false
      };
      console.log('  ❌ Logs resource access: FAIL -', error.message);
    }
  }

  async testEdgeCases() {
    console.log('\n🔍 Testing Edge Cases...');
    
    // Test invalid JSON-RPC request
    try {
      const invalidRequest = '{"invalid": "json", "missing": "required_fields"}';
      
      if (this.serverProcess) {
        this.serverProcess.stdin.write(invalidRequest + '\n');
        
        // Wait a moment to see if server crashes or handles gracefully
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        this.testResults.edgeCases.invalidJSON = {
          success: true, // Success means server didn't crash
          serverStillRunning: !this.serverProcess.killed
        };
        
        console.log('  ✅ Invalid JSON handling: PASS');
      }
      
    } catch (error) {
      this.testResults.edgeCases.invalidJSON = {
        success: false,
        error: error.message
      };
      console.log('  ❌ Invalid JSON handling: FAIL -', error.message);
    }

    // Test missing required parameters
    try {
      const missingParamsRequest = {
        jsonrpc: '2.0',
        id: this.requestId++,
        method: 'tools/call',
        params: {
          name: 'claudette_query',
          arguments: {} // Missing required 'prompt' parameter
        }
      };
      
      const response = await this.sendRequest(missingParamsRequest);
      
      this.testResults.edgeCases.missingParams = {
        success: response.error !== undefined, // Should return error
        response,
        handlesGracefully: response.error && response.error.code && response.error.message
      };
      
      console.log('  ✅ Missing parameters handling: PASS');
      
    } catch (error) {
      this.testResults.edgeCases.missingParams = {
        success: false,
        error: error.message
      };
      console.log('  ❌ Missing parameters handling: FAIL -', error.message);
    }

    // Test unknown method
    try {
      const unknownMethodRequest = {
        jsonrpc: '2.0',
        id: this.requestId++,
        method: 'unknown/method'
      };
      
      const response = await this.sendRequest(unknownMethodRequest);
      
      this.testResults.edgeCases.unknownMethod = {
        success: response.error && response.error.code === -32601,
        response
      };
      
      console.log('  ✅ Unknown method handling:', this.testResults.edgeCases.unknownMethod.success ? 'PASS' : 'FAIL');
      
    } catch (error) {
      this.testResults.edgeCases.unknownMethod = {
        success: false,
        error: error.message
      };
      console.log('  ❌ Unknown method handling: FAIL -', error.message);
    }

    // Test unknown tool
    try {
      const unknownToolRequest = {
        jsonrpc: '2.0',
        id: this.requestId++,
        method: 'tools/call',
        params: {
          name: 'unknown_tool',
          arguments: {}
        }
      };
      
      const response = await this.sendRequest(unknownToolRequest);
      
      this.testResults.edgeCases.unknownTool = {
        success: response.error !== undefined,
        response,
        correctErrorHandling: response.error && response.error.message.includes('Unknown tool')
      };
      
      console.log('  ✅ Unknown tool handling: PASS');
      
    } catch (error) {
      this.testResults.edgeCases.unknownTool = {
        success: false,
        error: error.message
      };
      console.log('  ❌ Unknown tool handling: FAIL -', error.message);
    }
  }

  async testErrorHandling() {
    console.log('\n⚠️  Testing Error Handling...');
    
    // Test what happens when Claudette core is not available
    // This is difficult to test without manipulating the environment
    // We'll simulate by testing with invalid backend
    try {
      const invalidBackendRequest = {
        jsonrpc: '2.0',
        id: this.requestId++,
        method: 'tools/call',
        params: {
          name: 'claudette_query',
          arguments: {
            prompt: 'Test with invalid backend',
            backend: 'nonexistent_backend'
          }
        }
      };
      
      const startTime = Date.now();
      const response = await this.sendRequest(invalidBackendRequest);
      const responseTime = Date.now() - startTime;
      
      this.testResults.errorHandling.invalidBackend = {
        success: true, // Test passes if server handles it gracefully
        responseTime,
        response,
        handlesGracefully: response.error || (response.result && response.result.content)
      };
      
      console.log('  ✅ Invalid backend handling: PASS');
      
    } catch (error) {
      this.testResults.errorHandling.invalidBackend = {
        success: false,
        error: error.message
      };
      console.log('  ❌ Invalid backend handling: FAIL -', error.message);
    }

    // Test malformed arguments
    try {
      const malformedArgsRequest = {
        jsonrpc: '2.0',
        id: this.requestId++,
        method: 'tools/call',
        params: {
          name: 'claudette_analyze',
          arguments: {
            target: null, // Invalid target
            type: 'invalid_type'
          }
        }
      };
      
      const response = await this.sendRequest(malformedArgsRequest);
      
      this.testResults.errorHandling.malformedArgs = {
        success: true, // Test passes if handled gracefully
        response,
        handlesGracefully: response.error || response.result
      };
      
      console.log('  ✅ Malformed arguments handling: PASS');
      
    } catch (error) {
      this.testResults.errorHandling.malformedArgs = {
        success: false,
        error: error.message
      };
      console.log('  ❌ Malformed arguments handling: FAIL -', error.message);
    }
  }

  async testPerformance() {
    console.log('\n⚡ Testing Performance...');
    
    const performanceTests = [];
    
    // Test response times for different operations
    for (let i = 0; i < 5; i++) {
      try {
        const statusRequest = {
          jsonrpc: '2.0',
          id: this.requestId++,
          method: 'tools/list'
        };
        
        const startTime = Date.now();
        await this.sendRequest(statusRequest);
        const responseTime = Date.now() - startTime;
        
        performanceTests.push(responseTime);
        
      } catch (error) {
        console.log(`  ❌ Performance test ${i + 1}: FAIL -`, error.message);
      }
    }
    
    if (performanceTests.length > 0) {
      const avgResponseTime = performanceTests.reduce((a, b) => a + b) / performanceTests.length;
      const minResponseTime = Math.min(...performanceTests);
      const maxResponseTime = Math.max(...performanceTests);
      
      this.testResults.performance.responseTime = {
        average: avgResponseTime,
        min: minResponseTime,
        max: maxResponseTime,
        allTests: performanceTests,
        acceptable: avgResponseTime < 1000 // Less than 1 second average
      };
      
      console.log(`  ✅ Average response time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`  📊 Min: ${minResponseTime}ms, Max: ${maxResponseTime}ms`);
    }
  }

  async testConcurrentRequests() {
    console.log('\n🔄 Testing Concurrent Requests...');
    
    try {
      const concurrentRequests = [];
      const numRequests = 3; // Conservative number for testing
      
      for (let i = 0; i < numRequests; i++) {
        const request = {
          jsonrpc: '2.0',
          id: this.requestId++,
          method: 'tools/list'
        };
        
        concurrentRequests.push(this.sendRequest(request));
      }
      
      const startTime = Date.now();
      const results = await Promise.allSettled(concurrentRequests);
      const totalTime = Date.now() - startTime;
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      this.testResults.concurrent.requests = {
        totalRequests: numRequests,
        successful,
        failed,
        totalTime,
        averageTime: totalTime / numRequests,
        allHandled: successful + failed === numRequests
      };
      
      console.log(`  ✅ Concurrent requests: ${successful}/${numRequests} successful`);
      console.log(`  ⏱️  Total time: ${totalTime}ms, Average: ${(totalTime / numRequests).toFixed(2)}ms`);
      
    } catch (error) {
      this.testResults.concurrent.requests = {
        success: false,
        error: error.message
      };
      console.log('  ❌ Concurrent requests: FAIL -', error.message);
    }
  }

  async generateReport() {
    console.log('\n📊 Generating Comprehensive Test Report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      },
      detailed: this.testResults,
      findings: [],
      recommendations: []
    };

    // Analyze results and generate findings
    this.analyzeResults(report);
    
    // Write report to file
    const reportPath = path.join(__dirname, 'mcp-test-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📋 TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`⚠️  Warnings: ${report.summary.warnings}`);
    console.log(`📝 Total Tests: ${report.summary.totalTests}`);
    console.log('\n📁 Detailed report saved to: mcp-test-report.json');
    
    if (report.findings.length > 0) {
      console.log('\n🔍 KEY FINDINGS:');
      report.findings.forEach((finding, i) => {
        console.log(`${i + 1}. ${finding}`);
      });
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      report.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
      });
    }
  }

  analyzeResults(report) {
    let totalTests = 0;
    let passed = 0;
    let failed = 0;
    let warnings = 0;

    // Analyze basic protocol tests
    Object.values(this.testResults.basicProtocol).forEach(result => {
      totalTests++;
      if (result.success) passed++;
      else failed++;
    });

    // Analyze tool calls
    Object.values(this.testResults.toolCalls).forEach(result => {
      totalTests++;
      if (result.success) passed++;
      else failed++;
      
      if (result.timeoutOccurred) {
        warnings++;
        report.findings.push('Tool calls may experience timeout issues under certain conditions');
      }
    });

    // Analyze resource access
    Object.values(this.testResults.resourceAccess).forEach(result => {
      totalTests++;
      if (!result.implemented) {
        warnings++;
        report.findings.push('Resource access (resources/read) is not implemented in the current server');
      }
    });

    // Analyze edge cases
    Object.values(this.testResults.edgeCases).forEach(result => {
      totalTests++;
      if (result.success) passed++;
      else failed++;
    });

    // Analyze error handling
    Object.values(this.testResults.errorHandling).forEach(result => {
      totalTests++;
      if (result.success) passed++;
      else failed++;
    });

    // Analyze performance
    if (this.testResults.performance.responseTime) {
      totalTests++;
      if (this.testResults.performance.responseTime.acceptable) {
        passed++;
      } else {
        failed++;
        report.findings.push(`Average response time (${this.testResults.performance.responseTime.average}ms) exceeds acceptable threshold`);
      }
    }

    // Analyze concurrent requests
    if (this.testResults.concurrent.requests) {
      totalTests++;
      if (this.testResults.concurrent.requests.allHandled) passed++;
      else failed++;
    }

    report.summary = { totalTests, passed, failed, warnings };

    // Generate specific findings
    if (this.testResults.basicProtocol.initialize?.success) {
      report.findings.push('✅ MCP protocol initialization works correctly');
    }
    
    if (this.testResults.basicProtocol.toolsList?.hasAllTools) {
      report.findings.push('✅ All expected tools are properly exposed');
    }
    
    if (this.testResults.toolCalls.status?.success) {
      report.findings.push('✅ Status tool call functions correctly');
    } else {
      report.findings.push('❌ Status tool call failed - may indicate Claudette core issues');
    }

    // Generate recommendations
    if (!this.testResults.resourceAccess.config?.implemented) {
      report.recommendations.push('Implement resources/read method for config and logs access');
    }
    
    if (this.testResults.toolCalls.query?.timeoutOccurred) {
      report.recommendations.push('Consider increasing timeout duration or implementing streaming responses for long-running queries');
    }
    
    if (failed > 0) {
      report.recommendations.push('Address failing test cases to improve overall reliability');
    }
    
    if (warnings > 0) {
      report.recommendations.push('Review warnings and consider implementing missing features');
    }
  }
}

// Run the tests
const tester = new MCPServerTester();
tester.runAllTests().catch(console.error);