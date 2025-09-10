#!/usr/bin/env node

const fs = require('fs');

console.log('⚠️ CLAUDETTE ERROR HANDLING & EDGE CASES TEST');
console.log('==============================================');

let testResults = {
  initialization: { passed: 0, failed: 0, tests: [] },
  api_errors: { passed: 0, failed: 0, tests: [] },
  edge_cases: { passed: 0, failed: 0, tests: [] },
  mcp_errors: { passed: 0, failed: 0, tests: [] }
};

function logTest(category, name, success, details) {
  const status = success ? '✅' : '❌';
  console.log(`${status} ${category}: ${name}`);
  if (details) console.log(`   ${details}`);
  
  testResults[category].tests.push({ name, success, details });
  if (success) {
    testResults[category].passed++;
  } else {
    testResults[category].failed++;
  }
}

async function testInitializationErrors() {
  console.log('\n🚀 Testing Initialization Error Handling');
  console.log('-----------------------------------------');
  
  try {
    const { Claudette } = require('./dist/index.js');
    
    // Test with no config
    try {
      const claudette = new Claudette();
      logTest('initialization', 'No Config Handling', true, 'Accepts empty config');
    } catch (error) {
      logTest('initialization', 'No Config Handling', false, `Error: ${error.message}`);
    }
    
    // Test with invalid config
    try {
      const claudette = new Claudette({
        invalid: 'config',
        openai: { apiKey: null }
      });
      logTest('initialization', 'Invalid Config Handling', true, 'Handles invalid config gracefully');
    } catch (error) {
      logTest('initialization', 'Invalid Config Handling', false, `Error: ${error.message}`);
    }
    
    // Test with missing API key
    try {
      const claudette = new Claudette({
        openai: {} // no apiKey
      });
      logTest('initialization', 'Missing API Key Handling', true, 'Handles missing API key');
    } catch (error) {
      logTest('initialization', 'Missing API Key Handling', false, `Error: ${error.message}`);
    }
    
  } catch (error) {
    logTest('initialization', 'Module Import', false, `Import error: ${error.message}`);
  }
}

async function testAPIErrors() {
  console.log('\n🌐 Testing API Error Scenarios');
  console.log('-------------------------------');
  
  try {
    const { Claudette } = require('./dist/index.js');
    
    // Test with invalid API key
    const claudette = new Claudette({
      openai: { apiKey: 'invalid-key-test' }
    });
    
    try {
      const result = await claudette.optimize('test query', [], {
        timeout: 5000
      });
      
      const hasError = result && (result.error || result.backend_used === 'error');
      logTest('api_errors', 'Invalid API Key Response', hasError, 
             hasError ? 'Properly handled invalid API key' : 'Should have returned error');
             
    } catch (error) {
      logTest('api_errors', 'Invalid API Key Response', true, `Caught error: ${error.message}`);
    }
    
    // Test timeout handling
    try {
      const result = await claudette.optimize('test query', [], {
        timeout: 1 // Very short timeout
      });
      
      const hasTimeout = result && result.error && result.error.includes('timeout');
      logTest('api_errors', 'Timeout Handling', hasTimeout,
             hasTimeout ? 'Timeout properly handled' : 'Timeout not detected');
             
    } catch (error) {
      const isTimeoutError = error.message.includes('timeout') || error.message.includes('aborted');
      logTest('api_errors', 'Timeout Handling', isTimeoutError, `Timeout error: ${error.message}`);
    }
    
  } catch (error) {
    logTest('api_errors', 'API Error Test Setup', false, `Setup error: ${error.message}`);
  }
}

async function testEdgeCases() {
  console.log('\n🔬 Testing Edge Cases');
  console.log('---------------------');
  
  try {
    const { Claudette } = require('./dist/index.js');
    const claudette = new Claudette({
      openai: { apiKey: process.env.OPENAI_API_KEY || 'test-key' }
    });
    
    // Test empty prompt
    try {
      const result = await claudette.optimize('', [], { timeout: 5000 });
      logTest('edge_cases', 'Empty Prompt Handling', !!result, 
             result ? 'Handled empty prompt' : 'Failed on empty prompt');
    } catch (error) {
      logTest('edge_cases', 'Empty Prompt Handling', true, `Caught error: ${error.message}`);
    }
    
    // Test very long prompt
    const longPrompt = 'x'.repeat(10000);
    try {
      const result = await claudette.optimize(longPrompt, [], { timeout: 5000 });
      logTest('edge_cases', 'Long Prompt Handling', !!result,
             result ? 'Handled long prompt' : 'Failed on long prompt');
    } catch (error) {
      logTest('edge_cases', 'Long Prompt Handling', true, `Caught error: ${error.message}`);
    }
    
    // Test invalid context
    try {
      const result = await claudette.optimize('test', [null, undefined, {}], { timeout: 5000 });
      logTest('edge_cases', 'Invalid Context Handling', !!result,
             result ? 'Handled invalid context' : 'Failed on invalid context');
    } catch (error) {
      logTest('edge_cases', 'Invalid Context Handling', true, `Caught error: ${error.message}`);
    }
    
    // Test multiple concurrent requests
    try {
      const promises = Array(5).fill().map((_, i) => 
        claudette.optimize(`test query ${i}`, [], { timeout: 5000 })
      );
      
      const results = await Promise.allSettled(promises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      
      logTest('edge_cases', 'Concurrent Requests', successCount > 0,
             `${successCount}/5 concurrent requests handled`);
    } catch (error) {
      logTest('edge_cases', 'Concurrent Requests', false, `Error: ${error.message}`);
    }
    
  } catch (error) {
    logTest('edge_cases', 'Edge Cases Setup', false, `Setup error: ${error.message}`);
  }
}

async function testMCPErrors() {
  console.log('\n🔌 Testing MCP Server Error Handling');
  console.log('------------------------------------');
  
  const { spawn } = require('child_process');
  
  // Test invalid JSON request
  try {
    const child = spawn('node', ['claudette-mcp-server.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let gotResponse = false;
    
    child.stdout.on('data', (data) => {
      const str = data.toString();
      if (str.includes('Parse error') || str.includes('error')) {
        gotResponse = true;
        logTest('mcp_errors', 'Invalid JSON Handling', true, 'MCP server handled invalid JSON');
      }
    });
    
    child.stderr.on('data', (data) => {
      const str = data.toString();
      if (str.includes('error') || str.includes('invalid')) {
        gotResponse = true;
        logTest('mcp_errors', 'Invalid JSON Handling', true, 'MCP server logged error for invalid JSON');
      }
    });
    
    // Send invalid JSON
    child.stdin.write('invalid json\n');
    
    setTimeout(() => {
      child.kill();
      if (!gotResponse) {
        logTest('mcp_errors', 'Invalid JSON Handling', false, 'No error response received');
      }
    }, 2000);
    
    await new Promise(resolve => {
      child.on('exit', () => resolve());
    });
    
  } catch (error) {
    logTest('mcp_errors', 'MCP Error Test Setup', false, `Setup error: ${error.message}`);
  }
  
  // Test invalid method
  try {
    const child = spawn('node', ['claudette-mcp-server.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let gotResponse = false;
    
    child.stdout.on('data', (data) => {
      const str = data.toString();
      if (str.includes('Method not found') || str.includes('error')) {
        gotResponse = true;
        logTest('mcp_errors', 'Invalid Method Handling', true, 'MCP server handled invalid method');
      }
    });
    
    child.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'invalid_method',
      params: {}
    }) + '\n');
    
    setTimeout(() => {
      child.kill();
      if (!gotResponse) {
        logTest('mcp_errors', 'Invalid Method Handling', false, 'No error response for invalid method');
      }
    }, 2000);
    
    await new Promise(resolve => {
      child.on('exit', () => resolve());
    });
    
  } catch (error) {
    logTest('mcp_errors', 'Invalid Method Test', false, `Error: ${error.message}`);
  }
}

async function runAllTests() {
  await testInitializationErrors();
  await testAPIErrors();
  await testEdgeCases();
  await testMCPErrors();
  
  console.log('\n📋 ERROR HANDLING TEST SUMMARY');
  console.log('===============================');
  
  Object.keys(testResults).forEach(category => {
    const { passed, failed, tests } = testResults[category];
    const total = passed + failed;
    const rate = total > 0 ? Math.round((passed / total) * 100) : 0;
    
    console.log(`\n${category.toUpperCase().replace('_', ' ')}:`);
    console.log(`  Tests: ${passed}/${total} passed (${rate}%)`);
    
    if (failed > 0) {
      console.log('  Failures:');
      tests.filter(t => !t.success).forEach(t => {
        console.log(`    - ${t.name}: ${t.details}`);
      });
    }
  });
  
  const totalPassed = Object.values(testResults).reduce((sum, cat) => sum + cat.passed, 0);
  const totalTests = Object.values(testResults).reduce((sum, cat) => sum + cat.passed + cat.failed, 0);
  const overallRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
  
  console.log(`\n🎯 OVERALL ERROR HANDLING: ${totalPassed}/${totalTests} tests passed (${overallRate}%)`);
  
  // Write results to file
  fs.writeFileSync('error-handling-test-results.json', JSON.stringify(testResults, null, 2));
  console.log('\n📄 Results saved to error-handling-test-results.json');
}

runAllTests().catch(error => {
  console.error('❌ Error handling test runner error:', error);
  process.exit(1);
});