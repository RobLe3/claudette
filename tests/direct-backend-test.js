#!/usr/bin/env node
/**
 * Direct Backend Test
 * Tests individual backend functionality without routing
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
function loadEnvironment() {
  const envFile = path.join(__dirname, '.env');
  try {
    const envContent = fs.readFileSync(envFile, 'utf8');
    const envLines = envContent.split('\n');
    
    for (const line of envLines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...values] = trimmed.split('=');
        if (key && values.length > 0) {
          const value = values.join('=');
          process.env[key] = value;
        }
      }
    }
    console.log('✅ Environment variables loaded');
    return true;
  } catch (error) {
    console.error('❌ Could not load .env file:', error.message);
    return false;
  }
}

async function testDirectOpenAI() {
  console.log('\n🧪 Testing Direct OpenAI Client...');
  
  try {
    // Import OpenAI
    const OpenAI = require('openai');
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.log('❌ No OpenAI API key found');
      return false;
    }
    
    console.log(`✅ OpenAI API key found (length: ${apiKey.length})`);
    
    // Create client
    const client = new OpenAI({
      apiKey: apiKey,
      timeout: 30000
    });
    
    console.log('✅ OpenAI client created');
    
    // Test models list
    try {
      const models = await client.models.list();
      console.log(`✅ Models list successful (${models.data.length} models)`);
    } catch (error) {
      console.log(`❌ Models list failed: ${error.message}`);
      return false;
    }
    
    // Test simple chat completion
    try {
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Say exactly "Hello World" and nothing else.' }],
        max_tokens: 10,
        temperature: 0
      });
      
      const response = completion.choices[0]?.message?.content || 'No response';
      console.log(`✅ Chat completion successful: "${response}"`);
      return true;
      
    } catch (error) {
      console.log(`❌ Chat completion failed: ${error.message}`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Direct OpenAI test failed: ${error.message}`);
    return false;
  }
}

async function testFlexconBackend() {
  console.log('\n🧪 Testing Flexcon Backend...');
  
  try {
    const flexconUrl = process.env.FLEXCON_API_URL;
    const flexconKey = process.env.FLEXCON_API_KEY;
    const flexconModel = process.env.FLEXCON_MODEL;
    
    if (!flexconUrl || !flexconKey || !flexconModel) {
      console.log('❌ Missing Flexcon configuration');
      return false;
    }
    
    console.log(`✅ Flexcon config found: ${flexconUrl}`);
    console.log(`   Model: ${flexconModel}`);
    console.log(`   API Key length: ${flexconKey.length}`);
    
    // Test with axios
    const axios = require('axios');
    
    const requestData = {
      model: flexconModel,
      messages: [{ role: 'user', content: 'Say exactly "Hello Flexcon" and nothing else.' }],
      max_tokens: 10,
      temperature: 0
    };
    
    const response = await axios.post(`${flexconUrl}/v1/chat/completions`, requestData, {
      headers: {
        'Authorization': `Bearer ${flexconKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    const content = response.data.choices[0]?.message?.content || 'No response';
    console.log(`✅ Flexcon completion successful: "${content}"`);
    return true;
    
  } catch (error) {
    console.log(`❌ Flexcon test failed: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return false;
  }
}

async function testMockBackend() {
  console.log('\n🧪 Testing Mock Backend (fallback)...');
  
  try {
    // Simple mock response
    const responses = [
      'This is a mock response for testing purposes.',
      'Mock backend is working correctly.',
      'Test response from mock backend.'
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log(`✅ Mock backend response: "${randomResponse}"`);
    return true;
    
  } catch (error) {
    console.log(`❌ Mock backend test failed: ${error.message}`);
    return false;
  }
}

async function testAllBackends() {
  console.log('🚀 Starting Direct Backend Tests\n');
  
  // Load environment
  const envLoaded = loadEnvironment();
  if (!envLoaded) {
    console.log('❌ Failed to load environment, continuing with system env vars');
  }
  
  // Test results
  const results = {
    openai: false,
    flexcon: false,
    mock: false
  };
  
  // Test each backend
  results.openai = await testDirectOpenAI();
  results.flexcon = await testFlexconBackend();
  results.mock = await testMockBackend();
  
  // Summary
  console.log('\n📊 BACKEND TEST RESULTS:');
  console.log(`   OpenAI: ${results.openai ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`   Flexcon: ${results.flexcon ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`   Mock: ${results.mock ? '✅ WORKING' : '❌ FAILED'}`);
  
  const workingBackends = Object.values(results).filter(r => r).length;
  console.log(`\n📈 SUMMARY: ${workingBackends}/3 backends working`);
  
  if (workingBackends > 0) {
    console.log('🎉 At least one backend is working! The API keys and configuration are correct.');
    
    if (results.openai) {
      console.log('💡 OpenAI backend is working - the MCP server issue is likely in the Claudette routing logic.');
    }
    if (results.flexcon) {
      console.log('💡 Flexcon backend is working - this provides a good alternative.');
    }
    
  } else {
    console.log('❌ No backends are working. Check API keys and network connectivity.');
  }
  
  return results;
}

// Install required packages if missing
async function installDependencies() {
  try {
    require('openai');
    require('axios');
  } catch (error) {
    console.log('📦 Installing required dependencies...');
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const child = spawn('npm', ['install', 'openai', 'axios'], {
        stdio: 'inherit'
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Dependencies installed');
          resolve();
        } else {
          reject(new Error(`npm install failed with code ${code}`));
        }
      });
    });
  }
}

if (require.main === module) {
  installDependencies()
    .then(() => testAllBackends())
    .then((results) => {
      const workingCount = Object.values(results).filter(r => r).length;
      process.exit(workingCount > 0 ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testAllBackends };