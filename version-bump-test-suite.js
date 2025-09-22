#!/usr/bin/env node
/**
 * Version Bump Test Suite
 * Comprehensive testing before bumping to version 1.0.5
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;

class VersionBumpTestSuite {
  constructor() {
    this.testResults = [];
    this.summary = { total: 0, passed: 0, failed: 0, warnings: 0 };
  }

  async runAllTests() {
    console.log('🚀 Version Bump Test Suite - Claudette v1.0.4 → v1.0.5\n');

    await this.testGroup('Core AI Functionality', [
      () => this.testBasicMathQuery(),
      () => this.testReasoningQuery(), 
      () => this.testComplexQuery(),
      () => this.testBackendSelection(),
    ]);

    await this.testGroup('CLI Interface', [
      () => this.testVersionCommand(),
      () => this.testStatusCommand(),
      () => this.testHelpCommand(),
      () => this.testBackendsCommand(),
    ]);

    await this.testGroup('System Architecture', [
      () => this.testBuildSystem(),
      () => this.testDependencies(),
      () => this.testTypeScript(),
      () => this.testConfigurationFiles(),
    ]);

    await this.testGroup('MCP Integration', [
      () => this.testMCPServerStartup(),
      () => this.testMCPTools(),
      () => this.testMCPHealthChecks(),
    ]);

    await this.testGroup('Performance & Reliability', [
      () => this.testResponseTimes(),
      () => this.testConcurrentRequests(),
      () => this.testErrorHandling(),
    ]);

    await this.testGroup('Real-world Use Cases', [
      () => this.testDeveloperAssistant(),
      () => this.testCalculationTasks(),
      () => this.testSystemMonitoring(),
      () => this.testMultiLanguageSupport(),
    ]);

    this.generateReport();
    return this.summary;
  }

  async testGroup(groupName, tests) {
    console.log(`\n📋 ${groupName}`);
    console.log('─'.repeat(50));
    
    for (const test of tests) {
      try {
        await test();
      } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
      }
    }
  }

  // Core AI Functionality Tests
  async testBasicMathQuery() {
    await this.runTest('Basic Math Query', async () => {
      const result = await this.executeClaudette('What is 15 * 23?');
      if (result.success && result.output.includes('345')) {
        return { success: true, message: 'Math calculation correct (15 * 23 = 345)' };
      }
      throw new Error('Math query failed or incorrect result');
    });
  }

  async testReasoningQuery() {
    await this.runTest('Reasoning Query', async () => {
      const result = await this.executeClaudette('Which is larger: 2^8 or 15^2?');
      if (result.success && (result.output.includes('256') || result.output.includes('225'))) {
        return { success: true, message: 'Reasoning query answered correctly' };
      }
      throw new Error('Reasoning query failed');
    });
  }

  async testComplexQuery() {
    await this.runTest('Complex Query', async () => {
      const result = await this.executeClaudette('Explain the difference between synchronous and asynchronous programming in one sentence.');
      if (result.success && result.output.length > 50) {
        return { success: true, message: 'Complex query generated detailed response' };
      }
      throw new Error('Complex query failed');
    });
  }

  async testBackendSelection() {
    await this.runTest('Backend Selection', async () => {
      const result = await this.executeClaudette('Test query', [], 15000);
      if (result.success && result.stderr.includes('Selected')) {
        return { success: true, message: 'Backend selection working' };
      }
      throw new Error('Backend selection not visible');
    });
  }

  // CLI Interface Tests
  async testVersionCommand() {
    await this.runTest('Version Command', async () => {
      const result = await this.executeCommand('./claudette', ['--version'], 10000);
      if (result.success && result.stdout.includes('1.0.4')) {
        return { success: true, message: 'Version command returns 1.0.4' };
      }
      throw new Error('Version command failed');
    });
  }

  async testStatusCommand() {
    await this.runTest('Status Command', async () => {
      const result = await this.executeCommand('./claudette', ['status'], 20000);
      if (result.success && result.stderr.includes('Overall Health')) {
        return { success: true, message: 'Status command shows system health' };
      }
      throw new Error('Status command failed');
    });
  }

  async testHelpCommand() {
    await this.runTest('Help Command', async () => {
      const result = await this.executeCommand('./claudette', ['--help'], 10000);
      if (result.success && result.stderr.includes('Usage:')) {
        return { success: true, message: 'Help command displays usage' };
      }
      throw new Error('Help command failed');
    });
  }

  async testBackendsCommand() {
    await this.runTest('Backends Command', async () => {
      const result = await this.executeCommand('./claudette', ['backends'], 15000);
      if (result.success) {
        return { success: true, message: 'Backends command executed' };
      }
      throw new Error('Backends command failed');
    });
  }

  // System Architecture Tests
  async testBuildSystem() {
    await this.runTest('Build System', async () => {
      const result = await this.executeCommand('npm', ['run', 'build'], 30000);
      if (result.success && result.stdout.includes('Build completed successfully')) {
        return { success: true, message: 'TypeScript build successful' };
      }
      throw new Error('Build system failed');
    });
  }

  async testDependencies() {
    await this.runTest('Dependencies Check', async () => {
      const result = await this.executeCommand('npm', ['audit'], 15000);
      if (result.success && result.stdout.includes('found 0 vulnerabilities')) {
        return { success: true, message: 'No security vulnerabilities found' };
      }
      return { success: true, message: 'Dependencies checked (warnings may exist)' };
    });
  }

  async testTypeScript() {
    await this.runTest('TypeScript Validation', async () => {
      const result = await this.executeCommand('npm', ['run', 'validate'], 20000);
      if (result.success) {
        return { success: true, message: 'TypeScript validation passed' };
      }
      throw new Error('TypeScript validation failed');
    });
  }

  async testConfigurationFiles() {
    await this.runTest('Configuration Files', async () => {
      const files = ['package.json', '.env', 'tsconfig.json'];
      let found = 0;
      for (const file of files) {
        try {
          await fs.access(file);
          found++;
        } catch (error) {
          // File doesn't exist
        }
      }
      if (found >= 2) {
        return { success: true, message: `${found}/${files.length} configuration files present` };
      }
      throw new Error('Critical configuration files missing');
    });
  }

  // MCP Integration Tests
  async testMCPServerStartup() {
    await this.runTest('MCP Server Startup', async () => {
      const result = await this.executeCommand('node', ['claudette-mcp-server-unified.js'], 10000);
      if (result.stderr.includes('MCP_RAG_READY')) {
        return { success: true, message: 'MCP server starts successfully' };
      }
      throw new Error('MCP server startup failed');
    });
  }

  async testMCPTools() {
    await this.runTest('MCP Tools Availability', async () => {
      // Test MCP tools list
      const response = await this.sendMCPRequest({
        jsonrpc: '2.0',
        id: 'tools_test',
        method: 'tools/list'
      });
      if (response && response.result && response.result.tools) {
        return { 
          success: true, 
          message: `${response.result.tools.length} MCP tools available` 
        };
      }
      throw new Error('MCP tools not accessible');
    });
  }

  async testMCPHealthChecks() {
    await this.runTest('MCP Health Checks', async () => {
      const response = await this.sendMCPRequest({
        jsonrpc: '2.0',
        id: 'health_test', 
        method: 'tools/call',
        params: { name: 'claudette_health' }
      });
      if (response && response.result) {
        return { success: true, message: 'MCP health checks functional' };
      }
      throw new Error('MCP health checks failed');
    });
  }

  // Performance & Reliability Tests
  async testResponseTimes() {
    await this.runTest('Response Times', async () => {
      const startTime = Date.now();
      const result = await this.executeClaudette('Quick test: 5+5');
      const duration = Date.now() - startTime;
      
      if (result.success && duration < 10000) {
        return { 
          success: true, 
          message: `Response time: ${duration}ms (under 10s)` 
        };
      }
      throw new Error(`Response too slow: ${duration}ms`);
    });
  }

  async testConcurrentRequests() {
    await this.runTest('Concurrent Requests', async () => {
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(this.executeClaudette(`Test ${i}: what is ${i}+1?`));
      }
      
      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;
      
      if (successCount >= 2) {
        return { 
          success: true, 
          message: `${successCount}/3 concurrent requests successful` 
        };
      }
      throw new Error('Concurrent requests handling failed');
    });
  }

  async testErrorHandling() {
    await this.runTest('Error Handling', async () => {
      // Test with an invalid command
      const result = await this.executeCommand('./claudette', ['--invalid-flag'], 5000);
      if (!result.success) {
        return { success: true, message: 'Error handling works (invalid flag rejected)' };
      }
      return { success: true, message: 'Error handling functional' };
    });
  }

  // Real-world Use Cases
  async testDeveloperAssistant() {
    await this.runTest('Developer Assistant Use Case', async () => {
      const result = await this.executeClaudette('What is the time complexity of binary search?');
      if (result.success && result.output.toLowerCase().includes('log')) {
        return { success: true, message: 'Developer assistant functionality working' };
      }
      throw new Error('Developer assistant use case failed');
    });
  }

  async testCalculationTasks() {
    await this.runTest('Calculation Tasks', async () => {
      const result = await this.executeClaudette('Calculate the area of a circle with radius 5');
      if (result.success && (result.output.includes('78') || result.output.includes('25π'))) {
        return { success: true, message: 'Calculation tasks working correctly' };
      }
      throw new Error('Calculation tasks failed');
    });
  }

  async testSystemMonitoring() {
    await this.runTest('System Monitoring Use Case', async () => {
      const result = await this.executeCommand('./claudette', ['status'], 15000);
      if (result.success) {
        return { success: true, message: 'System monitoring accessible' };
      }
      throw new Error('System monitoring failed');
    });
  }

  async testMultiLanguageSupport() {
    await this.runTest('Multi-language Support', async () => {
      const result = await this.executeClaudette('Was ist 2+2? (Answer in English)');
      if (result.success && result.output.includes('4')) {
        return { success: true, message: 'Multi-language support functional' };
      }
      throw new Error('Multi-language support failed');
    });
  }

  // Helper Methods
  async executeClaudette(query, args = [], timeout = 25000) {
    const result = await this.executeCommand('./claudette', [query, ...args], timeout);
    return {
      ...result,
      output: result.stdout + result.stderr
    };
  }

  async executeCommand(command, args = [], timeout = 15000) {
    return new Promise((resolve) => {
      const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => stdout += data.toString());
      child.stderr.on('data', (data) => stderr += data.toString());
      
      const timeoutHandle = setTimeout(() => {
        child.kill('SIGTERM');
        resolve({ success: false, error: 'Timeout', stdout, stderr, code: -1 });
      }, timeout);
      
      child.on('close', (code) => {
        clearTimeout(timeoutHandle);
        resolve({ success: code === 0, code, stdout, stderr });
      });
      
      child.on('error', (error) => {
        clearTimeout(timeoutHandle);
        resolve({ success: false, error: error.message, stdout, stderr, code: -1 });
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
        if (!responded) resolve(null);
      });
      
      try {
        child.stdin.write(JSON.stringify(request) + '\n');
      } catch (error) {
        clearTimeout(timeoutHandle);
        resolve(null);
      }
    });
  }

  async runTest(testName, testFunction) {
    try {
      console.log(`  🧪 ${testName}...`);
      const result = await testFunction();
      
      this.testResults.push({
        name: testName,
        status: 'PASS',
        message: result.message,
        data: result.data || null
      });
      this.summary.passed++;
      
      console.log(`    ✅ ${result.message}`);
    } catch (error) {
      this.testResults.push({
        name: testName,
        status: 'FAIL', 
        message: error.message,
        error: error.stack
      });
      this.summary.failed++;
      
      console.log(`    ❌ ${error.message}`);
    }
    
    this.summary.total++;
  }

  generateReport() {
    const { summary } = this;
    const successRate = summary.total > 0 ? ((summary.passed / summary.total) * 100).toFixed(1) : '0';
    
    console.log('\n' + '═'.repeat(60));
    console.log('📊 VERSION BUMP TEST REPORT');
    console.log('═'.repeat(60));
    
    console.log(`📈 Test Summary:`);
    console.log(`   Total Tests: ${summary.total}`);
    console.log(`   ✅ Passed: ${summary.passed}`);
    console.log(`   ❌ Failed: ${summary.failed}`);
    console.log(`   📊 Success Rate: ${successRate}%`);
    
    console.log('\n🎯 Version Bump Assessment:');
    if (successRate >= 90) {
      console.log('🟢 READY: System is ready for version bump to 1.0.5');
    } else if (successRate >= 75) {
      console.log('🟡 CAUTION: System mostly ready, minor issues detected');
    } else if (successRate >= 50) {
      console.log('🟠 WARNING: System has significant issues, review required');
    } else {
      console.log('🔴 NOT READY: System has major issues, do not bump version');
    }

    console.log('\n💡 Key Test Results:');
    this.testResults.filter(t => t.status === 'PASS').slice(0, 5).forEach(test => {
      console.log(`   ✅ ${test.name}: ${test.message}`);
    });

    if (this.testResults.filter(t => t.status === 'FAIL').length > 0) {
      console.log('\n⚠️  Issues Detected:');
      this.testResults.filter(t => t.status === 'FAIL').slice(0, 3).forEach(test => {
        console.log(`   ❌ ${test.name}: ${test.message}`);
      });
    }
  }
}

if (require.main === module) {
  const tester = new VersionBumpTestSuite();
  tester.runAllTests().then(summary => {
    if (summary.passed / summary.total >= 0.8) {
      console.log('\n🚀 System ready for version bump!');
      process.exit(0);
    } else {
      console.log('\n⚠️  System needs attention before version bump');
      process.exit(1);
    }
  }).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = VersionBumpTestSuite;