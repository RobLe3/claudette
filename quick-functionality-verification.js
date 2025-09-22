#!/usr/bin/env node
/**
 * Quick Functionality Verification for Version Bump
 */

const { spawn } = require('child_process');

async function quickTest() {
  console.log('🔍 Quick Functionality Verification for v1.0.5\n');
  
  const tests = [
    {
      name: 'Basic Math',
      command: './claudette',
      args: ['What is 7*6?'],
      expect: '42',
      timeout: 25000
    },
    {
      name: 'Version Check', 
      command: './claudette',
      args: ['--version'],
      expect: '1.0.4',
      timeout: 10000
    },
    {
      name: 'Build System',
      command: 'npm',
      args: ['run', 'validate'],
      expect: null, // Just check success
      timeout: 20000
    },
    {
      name: 'MCP Server',
      command: 'node',
      args: ['claudette-mcp-server-unified.js'],
      expect: 'MCP_RAG_READY',
      timeout: 10000
    }
  ];

  let passed = 0;
  let total = tests.length;

  for (const test of tests) {
    process.stdout.write(`  Testing ${test.name}... `);
    
    try {
      const result = await executeTest(test);
      if (result.success) {
        console.log('✅');
        passed++;
      } else {
        console.log('❌');
      }
    } catch (error) {
      console.log('❌');
    }
  }

  console.log(`\n📊 Results: ${passed}/${total} tests passed (${((passed/total)*100).toFixed(1)}%)`);
  
  if (passed >= 3) {
    console.log('🟢 SYSTEM READY for version bump to 1.0.5\n');
    return true;
  } else {
    console.log('🔴 SYSTEM NOT READY for version bump\n');
    return false;
  }
}

async function executeTest(test) {
  return new Promise((resolve) => {
    const child = spawn(test.command, test.args, { 
      stdio: ['pipe', 'pipe', 'pipe'] 
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => stdout += data.toString());
    child.stderr.on('data', (data) => stderr += data.toString());
    
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({ success: false, reason: 'timeout' });
    }, test.timeout);
    
    child.on('close', (code) => {
      clearTimeout(timer);
      const output = stdout + stderr;
      const success = test.expect ? output.includes(test.expect) : code === 0;
      resolve({ success, code, output });
    });
    
    child.on('error', () => {
      clearTimeout(timer);
      resolve({ success: false, reason: 'error' });
    });
  });
}

if (require.main === module) {
  quickTest().then(ready => {
    process.exit(ready ? 0 : 1);
  });
}

module.exports = { quickTest };