#!/usr/bin/env node
/**
 * Comprehensive Claudette System Test
 * Tests the complete Claudette suite including CLI, MCP integration, 
 * multiplexing, timeout optimizations, and abstract use cases
 */

const { spawn, fork } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class ComprehensiveSystemTest {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      testSuites: {},
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
  }

  async runAllTests() {
    console.log('🧪 Starting Comprehensive Claudette System Test\n');

    // Test Suite 1: Basic CLI Functionality
    await this.testBasicCLI();
    
    // Test Suite 2: MCP Server Functionality
    await this.testMCPServer();
    
    // Test Suite 3: Multiplexer System
    await this.testMultiplexer();
    
    // Test Suite 4: Timeout and Retry Systems
    await this.testTimeoutSystems();
    
    // Test Suite 5: Load Balancing and Scaling
    await this.testLoadBalancing();
    
    // Test Suite 6: Fault Tolerance
    await this.testFaultTolerance();
    
    // Test Suite 7: Abstract Use Cases
    await this.testAbstractUseCases();

    // Generate final report
    this.generateReport();
  }

  async testBasicCLI() {
    console.log('📋 Test Suite 1: Basic CLI Functionality');
    const suite = 'basicCLI';
    this.results.testSuites[suite] = { tests: [], passed: 0, failed: 0 };

    // Test 1.1: Version Command
    await this.runTest(suite, 'Version Command', async () => {
      const result = await this.executeCommand('./claudette', ['--version'], 10000);
      if (result.success && result.stderr.includes('Performance')) {
        return { success: true, message: 'Version command works with performance monitoring' };
      }
      throw new Error('Version command failed or missing performance monitoring');
    });

    // Test 1.2: Help Command
    await this.runTest(suite, 'Help Command', async () => {
      const result = await this.executeCommand('./claudette', ['--help'], 10000);
      if (result.success && result.stderr.includes('Usage:')) {
        return { success: true, message: 'Help command displays usage information' };
      }
      throw new Error('Help command failed or incomplete');
    });

    // Test 1.3: Status Command
    await this.runTest(suite, 'Status Command', async () => {
      const result = await this.executeCommand('./claudette', ['status'], 15000);
      if (result.success && result.stderr.includes('Overall Health')) {
        return { success: true, message: 'Status command shows system health' };
      }
      throw new Error('Status command failed or incomplete health check');
    });

    // Test 1.4: Backend Detection
    await this.runTest(suite, 'Backend Detection', async () => {
      const result = await this.executeCommand('./claudette', ['backends'], 15000);
      if (result.success) {
        return { success: true, message: 'Backend detection working' };
      }
      throw new Error('Backend detection failed');
    });

    console.log(`✅ CLI Tests: ${this.results.testSuites[suite].passed}/${this.results.testSuites[suite].tests.length} passed\n`);
  }

  async testMCPServer() {
    console.log('🌐 Test Suite 2: MCP Server Functionality');
    const suite = 'mcpServer';
    this.results.testSuites[suite] = { tests: [], passed: 0, failed: 0 };

    // Test 2.1: MCP Server Startup
    await this.runTest(suite, 'MCP Server Startup', async () => {
      const result = await this.testMCPStartup();
      if (result.includes('MCP_RAG_READY')) {
        return { success: true, message: 'MCP server starts successfully' };
      }
      throw new Error('MCP server startup failed');
    });

    // Test 2.2: Tools List
    await this.runTest(suite, 'Tools List', async () => {
      const response = await this.sendMCPRequest({
        jsonrpc: '2.0',
        id: 'test_tools_list',
        method: 'tools/list'
      });
      if (response && response.result && response.result.tools) {
        return { 
          success: true, 
          message: `Found ${response.result.tools.length} tools available`,
          data: response.result.tools.map(t => t.name)
        };
      }
      throw new Error('Tools list request failed');
    });

    // Test 2.3: Version Tool
    await this.runTest(suite, 'Version Tool', async () => {
      const response = await this.sendMCPRequest({
        jsonrpc: '2.0',
        id: 'test_version',
        method: 'tools/call',
        params: {
          name: 'claudette_version'
        }
      });
      if (response && response.result) {
        return { success: true, message: 'Version tool executed successfully' };
      }
      throw new Error('Version tool execution failed');
    });

    // Test 2.4: Health Tool
    await this.runTest(suite, 'Health Tool', async () => {
      const response = await this.sendMCPRequest({
        jsonrpc: '2.0',
        id: 'test_health',
        method: 'tools/call',
        params: {
          name: 'claudette_health'
        }
      });
      if (response && response.result) {
        return { success: true, message: 'Health tool executed successfully' };
      }
      throw new Error('Health tool execution failed');
    });

    console.log(`✅ MCP Server Tests: ${this.results.testSuites[suite].passed}/${this.results.testSuites[suite].tests.length} passed\n`);
  }

  async testMultiplexer() {
    console.log('🔄 Test Suite 3: Multiplexer System');
    const suite = 'multiplexer';
    this.results.testSuites[suite] = { tests: [], passed: 0, failed: 0 };

    // Test 3.1: Multiplexer Startup
    await this.runTest(suite, 'Multiplexer Startup', async () => {
      const result = await this.testMultiplexerStartup();
      if (result.includes('Started with') && result.includes('instances')) {
        return { success: true, message: 'Multiplexer starts with multiple instances' };
      }
      throw new Error('Multiplexer startup failed');
    });

    // Test 3.2: Instance Management
    await this.runTest(suite, 'Instance Management', async () => {
      const status = await this.getMultiplexerStatus();
      if (status && status.totalInstances >= 2) {
        return { 
          success: true, 
          message: `Managing ${status.totalInstances} instances`,
          data: status
        };
      }
      throw new Error('Instance management failed');
    });

    // Test 3.3: Load Distribution
    await this.runTest(suite, 'Load Distribution', async () => {
      const loadTest = await this.runMultiplexerLoadTest(10);
      if (loadTest && loadTest.success_rate >= 80) {
        return { 
          success: true, 
          message: `Load test: ${loadTest.success_rate}% success rate`,
          data: loadTest
        };
      }
      throw new Error(`Load distribution failed: ${loadTest?.success_rate || 0}% success rate`);
    });

    console.log(`✅ Multiplexer Tests: ${this.results.testSuites[suite].passed}/${this.results.testSuites[suite].tests.length} passed\n`);
  }

  async testTimeoutSystems() {
    console.log('⏱️  Test Suite 4: Timeout and Retry Systems');
    const suite = 'timeoutSystems';
    this.results.testSuites[suite] = { tests: [], passed: 0, failed: 0 };

    // Test 4.1: Timeout Configuration
    await this.runTest(suite, 'Timeout Configuration', async () => {
      const config = await this.getMultiplexerConfig();
      if (config && config.multiplexer && config.multiplexer.requestTimeout) {
        return { 
          success: true, 
          message: `Timeout configured: ${config.multiplexer.requestTimeout}ms`,
          data: config.multiplexer
        };
      }
      throw new Error('Timeout configuration missing');
    });

    // Test 4.2: Circuit Breaker
    await this.runTest(suite, 'Circuit Breaker Configuration', async () => {
      const config = await this.getMultiplexerConfig();
      if (config && config.loadBalancing && config.loadBalancing.circuitBreakerEnabled) {
        return { success: true, message: 'Circuit breaker is enabled' };
      }
      throw new Error('Circuit breaker not configured');
    });

    // Test 4.3: Retry Logic
    await this.runTest(suite, 'Retry Logic Test', async () => {
      // This would require sending a failing request to test retries
      // For now, just verify the configuration exists
      const config = await this.getMultiplexerConfig();
      if (config && config.failover) {
        return { success: true, message: 'Failover and retry configured' };
      }
      throw new Error('Retry logic not configured');
    });

    console.log(`✅ Timeout System Tests: ${this.results.testSuites[suite].passed}/${this.results.testSuites[suite].tests.length} passed\n`);
  }

  async testLoadBalancing() {
    console.log('⚖️  Test Suite 5: Load Balancing and Scaling');
    const suite = 'loadBalancing';
    this.results.testSuites[suite] = { tests: [], passed: 0, failed: 0 };

    // Test 5.1: Load Balancing Strategy
    await this.runTest(suite, 'Load Balancing Strategy', async () => {
      const config = await this.getMultiplexerConfig();
      if (config && config.loadBalancing && config.loadBalancing.strategy) {
        return { 
          success: true, 
          message: `Strategy: ${config.loadBalancing.strategy}` 
        };
      }
      throw new Error('Load balancing strategy not configured');
    });

    // Test 5.2: Scaling Configuration
    await this.runTest(suite, 'Auto-scaling Configuration', async () => {
      const config = await this.getMultiplexerConfig();
      if (config && config.multiplexer && config.multiplexer.scaleUpThreshold) {
        return { 
          success: true, 
          message: `Scale up: ${config.multiplexer.scaleUpThreshold}, Scale down: ${config.multiplexer.scaleDownThreshold}` 
        };
      }
      throw new Error('Auto-scaling not configured');
    });

    // Test 5.3: Concurrent Request Handling
    await this.runTest(suite, 'Concurrent Request Handling', async () => {
      const loadTest = await this.runMultiplexerLoadTest(20);
      if (loadTest && loadTest.requests_per_second > 5) {
        return { 
          success: true, 
          message: `Handling ${loadTest.requests_per_second} req/sec`,
          data: loadTest
        };
      }
      throw new Error('Concurrent request handling insufficient');
    });

    console.log(`✅ Load Balancing Tests: ${this.results.testSuites[suite].passed}/${this.results.testSuites[suite].tests.length} passed\n`);
  }

  async testFaultTolerance() {
    console.log('🛡️  Test Suite 6: Fault Tolerance');
    const suite = 'faultTolerance';
    this.results.testSuites[suite] = { tests: [], passed: 0, failed: 0 };

    // Test 6.1: Health Monitoring
    await this.runTest(suite, 'Health Monitoring', async () => {
      const config = await this.getMultiplexerConfig();
      if (config && config.multiplexer && config.multiplexer.healthCheckInterval) {
        return { 
          success: true, 
          message: `Health checks every ${config.multiplexer.healthCheckInterval}ms` 
        };
      }
      throw new Error('Health monitoring not configured');
    });

    // Test 6.2: Failover Configuration
    await this.runTest(suite, 'Failover Configuration', async () => {
      const config = await this.getMultiplexerConfig();
      if (config && config.failover && config.failover.enabled) {
        return { 
          success: true, 
          message: `Failover enabled with ${config.failover.maxFailoverAttempts} max attempts` 
        };
      }
      throw new Error('Failover not configured');
    });

    // Test 6.3: Recovery Mechanisms
    await this.runTest(suite, 'Auto-recovery', async () => {
      const config = await this.getMultiplexerConfig();
      if (config && config.failover && config.failover.autoRecovery) {
        return { 
          success: true, 
          message: `Auto-recovery enabled with ${config.failover.recoveryCheckInterval}ms interval` 
        };
      }
      throw new Error('Auto-recovery not configured');
    });

    console.log(`✅ Fault Tolerance Tests: ${this.results.testSuites[suite].passed}/${this.results.testSuites[suite].tests.length} passed\n`);
  }

  async testAbstractUseCases() {
    console.log('🎯 Test Suite 7: Abstract Use Cases');
    const suite = 'abstractUseCases';
    this.results.testSuites[suite] = { tests: [], passed: 0, failed: 0 };

    // Test 7.1: Simple AI Query
    await this.runTest(suite, 'Simple AI Query via MCP', async () => {
      const response = await this.sendMCPRequest({
        jsonrpc: '2.0',
        id: 'test_simple_query',
        method: 'tools/call',
        params: {
          name: 'claudette_query',
          arguments: {
            prompt: 'What is 2+2?',
            backend: 'auto',
            timeout: 30
          }
        }
      });
      if (response && response.result && response.result.content) {
        return { success: true, message: 'Simple AI query executed via MCP' };
      }
      throw new Error('Simple AI query failed');
    });

    // Test 7.2: System Status Check
    await this.runTest(suite, 'System Status via MCP', async () => {
      const response = await this.sendMCPRequest({
        jsonrpc: '2.0',
        id: 'test_status_query',
        method: 'tools/call',
        params: {
          name: 'claudette_status'
        }
      });
      if (response && response.result) {
        return { success: true, message: 'System status accessible via MCP' };
      }
      throw new Error('System status query failed');
    });

    // Test 7.3: Health Check Workflow
    await this.runTest(suite, 'Health Check Workflow', async () => {
      const response = await this.sendMCPRequest({
        jsonrpc: '2.0',
        id: 'test_health_workflow',
        method: 'tools/call',
        params: {
          name: 'claudette_health'
        }
      });
      if (response && response.result) {
        const healthData = JSON.parse(response.result.content[0].text);
        return { 
          success: true, 
          message: `Health check workflow: ${healthData.overall_health}`,
          data: healthData
        };
      }
      throw new Error('Health check workflow failed');
    });

    // Test 7.4: Backend Information
    await this.runTest(suite, 'Backend Information via MCP', async () => {
      const response = await this.sendMCPRequest({
        jsonrpc: '2.0',
        id: 'test_backends',
        method: 'tools/call',
        params: {
          name: 'claudette_backends'
        }
      });
      if (response && response.result) {
        return { success: true, message: 'Backend information accessible via MCP' };
      }
      throw new Error('Backend information query failed');
    });

    console.log(`✅ Abstract Use Case Tests: ${this.results.testSuites[suite].passed}/${this.results.testSuites[suite].tests.length} passed\n`);
  }

  // Helper Methods

  async runTest(suite, name, testFunction) {
    try {
      console.log(`  🧪 ${name}...`);
      const result = await testFunction();
      
      this.results.testSuites[suite].tests.push({
        name,
        status: 'PASSED',
        message: result.message,
        data: result.data || null,
        duration: result.duration || null
      });
      this.results.testSuites[suite].passed++;
      this.results.summary.passed++;
      
      console.log(`    ✅ ${result.message}`);
      if (result.data && typeof result.data === 'object' && Object.keys(result.data).length < 5) {
        console.log(`    📊 ${JSON.stringify(result.data)}`);
      }
    } catch (error) {
      this.results.testSuites[suite].tests.push({
        name,
        status: 'FAILED',
        message: error.message,
        error: error.stack
      });
      this.results.testSuites[suite].failed++;
      this.results.summary.failed++;
      
      console.log(`    ❌ ${error.message}`);
    }
    
    this.results.summary.totalTests++;
  }

  async executeCommand(command, args = [], timeout = 10000) {
    return new Promise((resolve) => {
      const child = spawn(command, args, { 
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout 
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      const timeoutHandle = setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          success: false,
          error: 'Command timeout',
          stdout,
          stderr,
          code: -1
        });
      }, timeout);
      
      child.on('close', (code) => {
        clearTimeout(timeoutHandle);
        resolve({
          success: code === 0,
          code,
          stdout,
          stderr
        });
      });
      
      child.on('error', (error) => {
        clearTimeout(timeoutHandle);
        resolve({
          success: false,
          error: error.message,
          stdout,
          stderr,
          code: -1
        });
      });
    });
  }

  async sendMCPRequest(request, timeout = 15000) {
    return new Promise((resolve) => {
      const child = spawn('node', ['claudette-mcp-server-unified.js'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      let responded = false;
      
      const timeoutHandle = setTimeout(() => {
        if (!responded) {
          child.kill('SIGTERM');
          resolve(null);
        }
      }, timeout);
      
      child.stdout.on('data', (data) => {
        output += data.toString();
        
        // Try to parse JSON responses
        const lines = output.split('\n');
        for (const line of lines) {
          if (line.trim() && line.trim().startsWith('{')) {
            try {
              const response = JSON.parse(line.trim());
              if (response.jsonrpc && response.id === request.id) {
                clearTimeout(timeoutHandle);
                responded = true;
                child.kill('SIGTERM');
                resolve(response);
                return;
              }
            } catch (error) {
              // Continue processing
            }
          }
        }
      });
      
      child.on('close', () => {
        clearTimeout(timeoutHandle);
        if (!responded) {
          resolve(null);
        }
      });
      
      child.on('error', () => {
        clearTimeout(timeoutHandle);
        if (!responded) {
          resolve(null);
        }
      });
      
      // Send request
      try {
        child.stdin.write(JSON.stringify(request) + '\n');
      } catch (error) {
        clearTimeout(timeoutHandle);
        resolve(null);
      }
    });
  }

  async testMCPStartup() {
    const result = await this.executeCommand('node', ['claudette-mcp-server-unified.js'], 10000);
    return result.stderr || '';
  }

  async testMultiplexerStartup() {
    const result = await this.executeCommand('node', ['claudette-mcp-multiplexer.js'], 15000);
    return result.stderr || '';
  }

  async getMultiplexerStatus() {
    const result = await this.executeCommand('node', ['mcp-multiplexer-monitor.js', 'status'], 15000);
    try {
      return JSON.parse(result.stdout);
    } catch (error) {
      return null;
    }
  }

  async runMultiplexerLoadTest(requests = 10) {
    const result = await this.executeCommand('node', ['mcp-multiplexer-monitor.js', 'test', requests.toString()], 30000);
    try {
      return JSON.parse(result.stdout);
    } catch (error) {
      return null;
    }
  }

  async getMultiplexerConfig() {
    try {
      const configContent = await fs.readFile('mcp-multiplexer-config.json', 'utf8');
      return JSON.parse(configContent);
    } catch (error) {
      return null;
    }
  }

  generateReport() {
    console.log('\n📊 COMPREHENSIVE TEST REPORT');
    console.log('═'.repeat(50));
    
    const { summary, testSuites } = this.results;
    const successRate = ((summary.passed / summary.totalTests) * 100).toFixed(1);
    
    console.log(`📈 Overall Results:`);
    console.log(`   Total Tests: ${summary.totalTests}`);
    console.log(`   ✅ Passed: ${summary.passed}`);
    console.log(`   ❌ Failed: ${summary.failed}`);
    console.log(`   📊 Success Rate: ${successRate}%\n`);
    
    // Individual suite results
    Object.entries(testSuites).forEach(([suiteName, suite]) => {
      const suiteSuccessRate = suite.tests.length > 0 ? 
        ((suite.passed / suite.tests.length) * 100).toFixed(1) : '0';
      
      console.log(`🧪 ${suiteName.toUpperCase()}: ${suite.passed}/${suite.tests.length} (${suiteSuccessRate}%)`);
      
      suite.tests.forEach(test => {
        const icon = test.status === 'PASSED' ? '✅' : '❌';
        console.log(`   ${icon} ${test.name}: ${test.message}`);
      });
      console.log('');
    });

    // System Assessment
    console.log('🎯 SYSTEM ASSESSMENT');
    console.log('═'.repeat(30));
    
    if (successRate >= 90) {
      console.log('🟢 EXCELLENT: System is performing optimally');
    } else if (successRate >= 75) {
      console.log('🟡 GOOD: System is mostly functional with minor issues');
    } else if (successRate >= 50) {
      console.log('🟠 FAIR: System has significant issues requiring attention');
    } else {
      console.log('🔴 POOR: System has major issues requiring immediate attention');
    }

    // Save report to file
    this.saveReport();
  }

  async saveReport() {
    try {
      const reportPath = 'comprehensive-test-report.json';
      await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
      console.log(`\n💾 Detailed report saved to: ${reportPath}`);
    } catch (error) {
      console.log('\n⚠️  Could not save detailed report:', error.message);
    }
  }
}

// Run tests if executed directly
if (require.main === module) {
  const tester = new ComprehensiveSystemTest();
  tester.runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = ComprehensiveSystemTest;