#!/usr/bin/env node
/**
 * Debug Backend Configuration Test
 * Tests backend initialization and environment variable handling
 */

const { spawn } = require('child_process');

async function testBackendConfiguration() {
  console.log('🔧 Testing Backend Configuration...');
  
  // Test 1: Check environment variables in subprocess
  console.log('\n1. Testing environment variables in subprocess:');
  
  const child = spawn('npx', ['ts-node', '-e', `
    console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
    console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);
    console.log('FLEXCON_API_KEY exists:', !!process.env.FLEXCON_API_KEY);
    console.log('FLEXCON_API_URL:', process.env.FLEXCON_API_URL);
    console.log('ULTIPA_ACCESS_TOKEN exists:', !!process.env.ULTIPA_ACCESS_TOKEN);
  `], {
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe']
  });

  let output = '';
  let errorOutput = '';

  child.stdout.on('data', (data) => {
    output += data.toString();
  });

  child.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });

  await new Promise((resolve) => {
    child.on('close', () => {
      console.log('Subprocess output:');
      console.log(output);
      if (errorOutput) {
        console.log('Subprocess errors:');
        console.log(errorOutput);
      }
      resolve();
    });
  });

  // Test 2: Check current process environment
  console.log('\n2. Testing environment in current process:');
  console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
  console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);
  console.log('FLEXCON_API_KEY exists:', !!process.env.FLEXCON_API_KEY);
  console.log('FLEXCON_API_URL:', process.env.FLEXCON_API_URL);
  console.log('ULTIPA_ACCESS_TOKEN exists:', !!process.env.ULTIPA_ACCESS_TOKEN);
  
  // Test 3: Try to initialize backends manually
  console.log('\n3. Testing manual backend initialization:');
  
  try {
    const backendTestChild = spawn('npx', ['ts-node', '-e', `
      import { Claudette } from './src/index';
      
      async function test() {
        try {
          const claudette = new Claudette();
          await claudette.initialize();
          console.log('✅ Claudette initialized successfully');
          
          // Try a simple query
          const response = await claudette.optimize('Hello world', [], { backend: 'openai' });
          console.log('✅ Query successful:', response.content.substring(0, 100));
        } catch (error) {
          console.log('❌ Claudette initialization failed:', error.message);
        }
      }
      
      test().catch(console.error);
    `], {
      env: process.env,
      stdio: ['inherit', 'pipe', 'pipe']
    });

    let backendOutput = '';
    let backendError = '';

    backendTestChild.stdout.on('data', (data) => {
      backendOutput += data.toString();
    });

    backendTestChild.stderr.on('data', (data) => {
      backendError += data.toString();
    });

    await new Promise((resolve) => {
      backendTestChild.on('close', () => {
        console.log('Backend test output:');
        console.log(backendOutput);
        if (backendError) {
          console.log('Backend test errors:');
          console.log(backendError);
        }
        resolve();
      });
    });

  } catch (error) {
    console.error('Backend initialization test failed:', error);
  }
}

// Test 4: Test MCP server keychain loading
async function testKeychainLoading() {
  console.log('\n4. Testing keychain loading (like MCP server does):');
  
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  try {
    const openaiKey = await execAsync('security find-generic-password -s "openai-api-key" -a "openai" -w').catch(() => ({ stdout: '' }));
    const codellmKey = await execAsync('security find-generic-password -s "codellm-api-key" -a "codellm" -w').catch(() => ({ stdout: '' }));
    
    console.log('Keychain OpenAI key found:', !!openaiKey.stdout.trim());
    console.log('Keychain CodeLLM key found:', !!codellmKey.stdout.trim());
    
    if (openaiKey.stdout.trim()) {
      console.log('Keychain OpenAI key length:', openaiKey.stdout.trim().length);
    }
  } catch (error) {
    console.log('Keychain loading failed:', error.message);
  }
}

if (require.main === module) {
  console.log('🚀 Starting Backend Configuration Debug Test');
  
  testBackendConfiguration().then(() => {
    return testKeychainLoading();
  }).then(() => {
    console.log('\n✅ Debug tests completed');
  }).catch((error) => {
    console.error('❌ Debug tests failed:', error);
  });
}

module.exports = { testBackendConfiguration, testKeychainLoading };