#!/usr/bin/env node
/**
 * Refined Claudette System Test
 * Focuses on real-world functionality and use cases
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;

class RefinedSystemTest {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      testResults: [],
      summary: { total: 0, passed: 0, failed: 0, warnings: 0 }
    };
  }

  async runAllTests() {
    console.log('🔬 Refined Claudette System Test\n');

    await this.testGroup('Core Functionality', [
      () => this.testBasicQuery(),
      () => this.testCLICommands(),
      () => this.testMCPBasicFunctionality(),
    ]);

    await this.testGroup('MCP Integration', [
      () => this.testMCPTools(),
      () => this.testMCPHealthChecks(),
      () => this.testMCPQueryExecution(),
    ]);

    await this.testGroup('System Architecture', [
      () => this.testConfigurationFiles(),
      () => this.testTimeoutSettings(),
      () => this.testMultiplexerConfiguration(),
    ]);

    await this.testGroup('Real-world Use Cases', [
      () => this.testSimpleMathQuery(),
      () => this.testSystemStatusInquiry(), 
      () => this.testBackendSelectionLogic(),
    ]);

    this.generateReport();
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

  async testBasicQuery() {
    const testName = 'Basic AI Query';
    console.log(`🧪 Testing: ${testName}`);
    
    try {
      const result = await this.executeCommand('./claudette', ['What is the capital of France?'], 30000);
      
      if (result.success && result.stderr.includes('Paris')) {
        this.recordResult(testName, 'PASS', 'AI query executed successfully with correct answer');
        console.log('   ✅ AI query works correctly');
      } else {
        this.recordResult(testName, 'FAIL', 'AI query failed or incorrect answer');
        console.log('   ❌ AI query failed');
      }
    } catch (error) {
      this.recordResult(testName, 'FAIL', error.message);
      console.log(`   ❌ ${error.message}`);
    }
  }

  async testCLICommands() {
    const testName = 'CLI Commands';
    console.log(`🧪 Testing: ${testName}`);
    
    try {
      const commands = [
        { cmd: ['--version'], expect: '1.0.4' },
        { cmd: ['status'], expect: 'Overall Health' },
        { cmd: ['backends'], expect: 'backend' }
      ];
      
      let passed = 0;
      for (const { cmd, expect } of commands) {
        const result = await this.executeCommand('./claudette', cmd, 15000);
        if (result.success && (result.stdout.includes(expect) || result.stderr.includes(expect))) {
          passed++;
        }
      }
      
      if (passed === commands.length) {
        this.recordResult(testName, 'PASS', `All ${commands.length} CLI commands work`);
        console.log(`   ✅ All CLI commands functional`);
      } else {
        this.recordResult(testName, 'PARTIAL', `${passed}/${commands.length} CLI commands work`);
        console.log(`   ⚠️  ${passed}/${commands.length} CLI commands work`);
      }
    } catch (error) {
      this.recordResult(testName, 'FAIL', error.message);
      console.log(`   ❌ ${error.message}`);
    }
  }

  async testMCPBasicFunctionality() {
    const testName = 'MCP Server Startup';
    console.log(`🧪 Testing: ${testName}`);
    
    try {
      const result = await this.executeCommand('node', ['claudette-mcp-server-unified.js'], 10000);
      
      if (result.stderr.includes('MCP_RAG_READY')) {
        this.recordResult(testName, 'PASS', 'MCP server starts and signals readiness');
        console.log('   ✅ MCP server startup works');
      } else {
        this.recordResult(testName, 'FAIL', 'MCP server startup failed');
        console.log('   ❌ MCP server startup failed');
      }
    } catch (error) {
      this.recordResult(testName, 'FAIL', error.message);
      console.log(`   ❌ ${error.message}`);
    }
  }

  async testMCPTools() {
    const testName = 'MCP Tools';
    console.log(`🧪 Testing: ${testName}`);
    
    try {
      const response = await this.sendMCPRequest({
        jsonrpc: '2.0',
        id: 'tools_test',
        method: 'tools/list'
      });
      
      if (response && response.result && response.result.tools && response.result.tools.length > 0) {
        const toolNames = response.result.tools.map(t => t.name);
        this.recordResult(testName, 'PASS', `Found ${toolNames.length} tools: ${toolNames.join(', ')}`);
        console.log(`   ✅ Found ${toolNames.length} MCP tools`);
      } else {
        this.recordResult(testName, 'FAIL', 'No MCP tools found');
        console.log('   ❌ No MCP tools found');
      }
    } catch (error) {
      this.recordResult(testName, 'FAIL', error.message);
      console.log(`   ❌ ${error.message}`);
    }
  }

  async testMCPHealthChecks() {
    const testName = 'MCP Health Checks';
    console.log(`🧪 Testing: ${testName}`);
    
    try {
      const response = await this.sendMCPRequest({
        jsonrpc: '2.0',
        id: 'health_test',
        method: 'tools/call',
        params: {
          name: 'claudette_health'
        }
      });
      
      if (response && response.result && response.result.content) {
        const healthData = JSON.parse(response.result.content[0].text);
        this.recordResult(testName, 'PASS', `Health check: ${healthData.overall_health}`);
        console.log(`   ✅ Health check works: ${healthData.overall_health}`);
      } else {
        this.recordResult(testName, 'FAIL', 'Health check failed');
        console.log('   ❌ Health check failed');
      }
    } catch (error) {
      this.recordResult(testName, 'FAIL', error.message);
      console.log(`   ❌ ${error.message}`);
    }
  }

  async testMCPQueryExecution() {
    const testName = 'MCP Query Execution';
    console.log(`🧪 Testing: ${testName}`);
    
    try {
      const response = await this.sendMCPRequest({
        jsonrpc: '2.0',
        id: 'query_test',
        method: 'tools/call',
        params: {
          name: 'claudette_query',
          arguments: {
            prompt: 'What is 5+3?',
            backend: 'auto',
            timeout: 30
          }
        }
      }, 45000);
      
      if (response && response.result) {
        this.recordResult(testName, 'PASS', 'MCP query execution works');
        console.log('   ✅ MCP query execution works');
      } else {
        this.recordResult(testName, 'FAIL', 'MCP query execution failed');
        console.log('   ❌ MCP query execution failed');
      }
    } catch (error) {
      this.recordResult(testName, 'FAIL', error.message);
      console.log(`   ❌ ${error.message}`);
    }
  }

  async testConfigurationFiles() {
    const testName = 'Configuration Files';
    console.log(`🧪 Testing: ${testName}`);
    
    try {
      const files = [
        'mcp-multiplexer-config.json',
        'example-claude-settings.json',
        '.env'
      ];
      
      let found = 0;
      for (const file of files) {
        try {
          await fs.access(file);
          found++;
        } catch (error) {
          // File doesn't exist
        }
      }
      
      if (found === files.length) {
        this.recordResult(testName, 'PASS', `All ${files.length} configuration files present`);
        console.log('   ✅ All configuration files present');
      } else {
        this.recordResult(testName, 'PARTIAL', `${found}/${files.length} configuration files present`);
        console.log(`   ⚠️  ${found}/${files.length} configuration files present`);
      }
    } catch (error) {
      this.recordResult(testName, 'FAIL', error.message);
      console.log(`   ❌ ${error.message}`);
    }
  }

  async testTimeoutSettings() {
    const testName = 'Timeout Configuration';
    console.log(`🧪 Testing: ${testName}`);
    
    try {
      const configContent = await fs.readFile('mcp-multiplexer-config.json', 'utf8');
      const config = JSON.parse(configContent);
      
      if (config.multiplexer && config.multiplexer.requestTimeout) {
        const timeout = config.multiplexer.requestTimeout;
        this.recordResult(testName, 'PASS', `Request timeout: ${timeout}ms`);
        console.log(`   ✅ Timeout configured: ${timeout}ms`);
      } else {
        this.recordResult(testName, 'FAIL', 'Timeout configuration missing');
        console.log('   ❌ Timeout configuration missing');
      }
    } catch (error) {
      this.recordResult(testName, 'FAIL', error.message);
      console.log(`   ❌ ${error.message}`);
    }
  }

  async testMultiplexerConfiguration() {
    const testName = 'Multiplexer Configuration';
    console.log(`🧪 Testing: ${testName}`);
    
    try {
      const configContent = await fs.readFile('mcp-multiplexer-config.json', 'utf8');
      const config = JSON.parse(configContent);
      
      const expected = ['minInstances', 'maxInstances', 'maxConcurrentRequests'];
      const present = expected.filter(key => config.multiplexer && config.multiplexer[key]);
      
      if (present.length === expected.length) {
        this.recordResult(testName, 'PASS', 'Multiplexer fully configured');
        console.log('   ✅ Multiplexer fully configured');
      } else {
        this.recordResult(testName, 'PARTIAL', `${present.length}/${expected.length} settings configured`);
        console.log(`   ⚠️  ${present.length}/${expected.length} settings configured`);
      }
    } catch (error) {
      this.recordResult(testName, 'FAIL', error.message);
      console.log(`   ❌ ${error.message}`);
    }
  }

  async testSimpleMathQuery() {
    const testName = 'Math Query Use Case';
    console.log(`🧪 Testing: ${testName}`);
    
    try {
      const result = await this.executeCommand('./claudette', ['Calculate: 15 * 8 + 12'], 30000);
      
      if (result.success && (result.stderr.includes('132') || result.stdout.includes('132'))) {
        this.recordResult(testName, 'PASS', 'Math calculation executed correctly');
        console.log('   ✅ Math query works correctly');
      } else {
        this.recordResult(testName, 'FAIL', 'Math query failed or incorrect');
        console.log('   ❌ Math query failed');
      }
    } catch (error) {
      this.recordResult(testName, 'FAIL', error.message);
      console.log(`   ❌ ${error.message}`);
    }
  }

  async testSystemStatusInquiry() {
    const testName = 'System Status Use Case';
    console.log(`🧪 Testing: ${testName}`);
    
    try {
      const result = await this.executeCommand('./claudette', ['status'], 15000);
      
      if (result.success && result.stderr.includes('Overall Health')) {
        this.recordResult(testName, 'PASS', 'System status inquiry works');
        console.log('   ✅ System status inquiry works');
      } else {
        this.recordResult(testName, 'FAIL', 'System status inquiry failed');
        console.log('   ❌ System status inquiry failed');
      }
    } catch (error) {
      this.recordResult(testName, 'FAIL', error.message);
      console.log(`   ❌ ${error.message}`);
    }
  }

  async testBackendSelectionLogic() {
    const testName = 'Backend Selection Logic';
    console.log(`🧪 Testing: ${testName}`);
    
    try {
      const result = await this.executeCommand('./claudette', ['backends'], 15000);
      
      if (result.success && (result.stdout.includes('backend') || result.stderr.includes('backend'))) {
        this.recordResult(testName, 'PASS', 'Backend selection works');
        console.log('   ✅ Backend selection works');
      } else {
        this.recordResult(testName, 'FAIL', 'Backend selection failed');
        console.log('   ❌ Backend selection failed');
      }
    } catch (error) {
      this.recordResult(testName, 'FAIL', error.message);
      console.log(`   ❌ ${error.message}`);
    }
  }

  // Helper methods
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
      
      child.on('error', () => {
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

  recordResult(testName, status, message, data = null) {
    this.results.testResults.push({
      testName,
      status,
      message,
      data,
      timestamp: new Date().toISOString()
    });
    
    this.results.summary.total++;
    if (status === 'PASS') {
      this.results.summary.passed++;
    } else if (status === 'FAIL') {
      this.results.summary.failed++;
    } else if (status === 'PARTIAL') {
      this.results.summary.warnings++;
    }
  }

  generateReport() {
    const { summary, testResults } = this.results;
    const successRate = summary.total > 0 ? ((summary.passed / summary.total) * 100).toFixed(1) : '0';
    
    console.log('\n' + '═'.repeat(60));
    console.log('📊 REFINED SYSTEM TEST REPORT');
    console.log('═'.repeat(60));
    
    console.log(`📈 Results Summary:`);
    console.log(`   Total Tests: ${summary.total}`);
    console.log(`   ✅ Passed: ${summary.passed}`);
    console.log(`   ❌ Failed: ${summary.failed}`);
    console.log(`   ⚠️  Warnings: ${summary.warnings}`);
    console.log(`   📊 Success Rate: ${successRate}%`);
    
    console.log('\n🔍 Test Details:');
    testResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`   ${icon} ${result.testName}: ${result.message}`);
    });
    
    console.log('\n🎯 System Assessment:');
    if (successRate >= 85) {
      console.log('🟢 EXCELLENT: Claudette system is highly functional');
    } else if (successRate >= 70) {
      console.log('🟡 GOOD: Claudette system is mostly functional');
    } else if (successRate >= 50) {
      console.log('🟠 FAIR: Claudette system has some issues');
    } else {
      console.log('🔴 NEEDS WORK: Claudette system requires attention');
    }
    
    // Save results
    this.saveReport();
  }

  async saveReport() {
    try {
      await fs.writeFile('refined-test-report.json', JSON.stringify(this.results, null, 2));
      console.log('\n💾 Detailed report saved to: refined-test-report.json');
    } catch (error) {
      console.log('\n⚠️  Could not save report:', error.message);
    }
  }
}

if (require.main === module) {
  const tester = new RefinedSystemTest();
  tester.runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = RefinedSystemTest;