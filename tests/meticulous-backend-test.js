#!/usr/bin/env node

console.log('🔍 METICULOUS BACKEND VERIFICATION TEST');
console.log('======================================');
console.log('Testing EXACTLY what is configured in .env file\n');

// Load environment
require('dotenv').config();

const testResults = {
  openai: { tests: [], passed: 0, failed: 0 },
  flexcon: { tests: [], passed: 0, failed: 0 },
  ultipa: { tests: [], passed: 0, failed: 0 }
};

function logTest(backend, test, success, details) {
  const status = success ? '✅' : '❌';
  console.log(`${status} ${backend.toUpperCase()}: ${test}`);
  if (details) console.log(`   ${details}`);
  
  testResults[backend].tests.push({ test, success, details });
  if (success) {
    testResults[backend].passed++;
  } else {
    testResults[backend].failed++;
  }
}

async function testOpenAI() {
  console.log('📊 Testing OpenAI Backend (as configured in .env)');
  console.log('--------------------------------------------------');
  
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    logTest('openai', 'API Key Configuration', false, 'No OPENAI_API_KEY in environment');
    return;
  }
  
  logTest('openai', 'API Key Configuration', true, `Key present (${apiKey.length} chars)`);
  
  // Test direct API call
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      logTest('openai', 'API Connectivity', true, `${data.data?.length || 0} models available`);
      
      // Test chat completion
      try {
        const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Say "test successful"' }],
            max_tokens: 10
          })
        });
        
        if (chatResponse.ok) {
          const chatData = await chatResponse.json();
          const content = chatData.choices?.[0]?.message?.content;
          logTest('openai', 'Chat Completion', true, `Response: "${content}"`);
        } else {
          const error = await chatResponse.text();
          logTest('openai', 'Chat Completion', false, `HTTP ${chatResponse.status}: ${error}`);
        }
      } catch (error) {
        logTest('openai', 'Chat Completion', false, `Error: ${error.message}`);
      }
      
    } else {
      const error = await response.text();
      logTest('openai', 'API Connectivity', false, `HTTP ${response.status}: ${error}`);
    }
  } catch (error) {
    logTest('openai', 'API Connectivity', false, `Network error: ${error.message}`);
  }
  
  // Test through Claudette
  try {
    const { Claudette } = require('./dist/index.js');
    const claudette = new Claudette({
      openai: { apiKey: apiKey }
    });
    
    // Force initialization and test
    await claudette.initialize();
    logTest('openai', 'Claudette Integration', true, 'Claudette instance initialized with OpenAI');
    
  } catch (error) {
    logTest('openai', 'Claudette Integration', false, `Error: ${error.message}`);
  }
}

async function testFlexcon() {
  console.log('\n🔧 Testing Flexcon Backend (as configured in .env)');
  console.log('---------------------------------------------------');
  
  const apiUrl = process.env.FLEXCON_API_URL;
  const apiKey = process.env.FLEXCON_API_KEY;
  const model = process.env.FLEXCON_MODEL;
  
  if (!apiUrl || !apiKey || !model) {
    logTest('flexcon', 'Configuration Check', false, 
           `Missing: URL=${!!apiUrl}, KEY=${!!apiKey}, MODEL=${!!model}`);
    return;
  }
  
  logTest('flexcon', 'Configuration Check', true, 
         `URL=${apiUrl}, MODEL=${model}, KEY=${apiKey.substring(0,10)}...`);
  
  // Test API connectivity
  try {
    const response = await fetch(`${apiUrl}/health`, {
      timeout: 10000
    });
    
    if (response.ok) {
      logTest('flexcon', 'Health Check', true, `HTTP ${response.status}`);
    } else {
      logTest('flexcon', 'Health Check', false, `HTTP ${response.status}`);
    }
  } catch (error) {
    logTest('flexcon', 'Health Check', false, `Error: ${error.message}`);
  }
  
  // Test model endpoint
  try {
    const response = await fetch(`${apiUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'Say "flexcon test successful"' }],
        max_tokens: 10
      }),
      timeout: 15000
    });
    
    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      logTest('flexcon', 'Model Inference', true, `Response: "${content}"`);
    } else {
      const error = await response.text();
      logTest('flexcon', 'Model Inference', false, `HTTP ${response.status}: ${error}`);
    }
  } catch (error) {
    logTest('flexcon', 'Model Inference', false, `Error: ${error.message}`);
  }
  
  // Test through Claudette
  try {
    const { Claudette } = require('./dist/index.js');
    const claudette = new Claudette({
      flexcon: {
        apiUrl: apiUrl,
        apiKey: apiKey,
        model: model
      }
    });
    
    logTest('flexcon', 'Claudette Integration', true, 'Claudette instance configured with Flexcon');
    
  } catch (error) {
    logTest('flexcon', 'Claudette Integration', false, `Error: ${error.message}`);
  }
}

async function testUltipa() {
  console.log('\n🗄️ Testing Ultipa GraphDB (as configured in .env)');
  console.log('--------------------------------------------------');
  
  const endpoint = process.env.ULTIPA_ENDPOINT;
  const accessToken = process.env.ULTIPA_ACCESS_TOKEN;
  const username = process.env.ULTIPA_DB_USERNAME;
  const password = process.env.ULTIPA_DB_PASSWORD;
  const apiUser = process.env.ULTIPA_API_USER;
  
  if (!endpoint || !accessToken) {
    logTest('ultipa', 'Configuration Check', false, 
           `Missing: ENDPOINT=${!!endpoint}, TOKEN=${!!accessToken}`);
    return;
  }
  
  logTest('ultipa', 'Configuration Check', true, 
         `Endpoint=${endpoint}, Token=${accessToken.substring(0,10)}..., User=${username}`);
  
  // Test GraphDB connectivity
  try {
    const url = `https://${endpoint}/api/v1/server/info`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    if (response.ok) {
      const data = await response.json();
      logTest('ultipa', 'Server Info', true, `Status: ${data.status || 'connected'}`);
    } else {
      const error = await response.text();
      logTest('ultipa', 'Server Info', false, `HTTP ${response.status}: ${error}`);
    }
  } catch (error) {
    logTest('ultipa', 'Server Info', false, `Error: ${error.message}`);
  }
  
  // Test database list
  try {
    const url = `https://${endpoint}/api/v1/databases`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    if (response.ok) {
      const data = await response.json();
      logTest('ultipa', 'Database List', true, `Databases available: ${data.length || 'unknown'}`);
    } else {
      const error = await response.text();
      logTest('ultipa', 'Database List', false, `HTTP ${response.status}: ${error}`);
    }
  } catch (error) {
    logTest('ultipa', 'Database List', false, `Error: ${error.message}`);
  }
  
  // Test through Claudette if GraphDB module exists
  try {
    const graphModule = require('./dist/graph/index.js');
    logTest('ultipa', 'Claudette GraphDB Module', true, 'Graph module available in Claudette');
  } catch (error) {
    logTest('ultipa', 'Claudette GraphDB Module', false, `Module not found: ${error.message}`);
  }
}

async function runMeticulousTests() {
  console.log('Environment Variables Found:');
  console.log(`- OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET'}`);
  console.log(`- FLEXCON_API_URL: ${process.env.FLEXCON_API_URL || 'NOT SET'}`);
  console.log(`- FLEXCON_API_KEY: ${process.env.FLEXCON_API_KEY ? 'SET' : 'NOT SET'}`);
  console.log(`- FLEXCON_MODEL: ${process.env.FLEXCON_MODEL || 'NOT SET'}`);
  console.log(`- ULTIPA_ENDPOINT: ${process.env.ULTIPA_ENDPOINT || 'NOT SET'}`);
  console.log(`- ULTIPA_ACCESS_TOKEN: ${process.env.ULTIPA_ACCESS_TOKEN ? 'SET' : 'NOT SET'}\n`);
  
  await testOpenAI();
  await testFlexcon();
  await testUltipa();
  
  console.log('\n📋 METICULOUS BACKEND TEST SUMMARY');
  console.log('===================================');
  
  let totalPassed = 0;
  let totalTests = 0;
  
  Object.keys(testResults).forEach(backend => {
    const { passed, failed } = testResults[backend];
    const total = passed + failed;
    const rate = total > 0 ? Math.round((passed / total) * 100) : 0;
    
    console.log(`\n${backend.toUpperCase()} Backend:`);
    console.log(`  Tests: ${passed}/${total} passed (${rate}%)`);
    
    if (failed > 0) {
      console.log('  Failures:');
      testResults[backend].tests.filter(t => !t.success).forEach(t => {
        console.log(`    - ${t.test}: ${t.details}`);
      });
    }
    
    totalPassed += passed;
    totalTests += total;
  });
  
  const overallRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
  console.log(`\n🎯 OVERALL BACKEND STATUS: ${totalPassed}/${totalTests} tests passed (${overallRate}%)`);
  
  console.log('\n🔍 METICULOUS FINDINGS:');
  console.log('========================');
  
  // Determine which backends are actually working
  Object.keys(testResults).forEach(backend => {
    const { passed, failed } = testResults[backend];
    const total = passed + failed;
    
    if (total === 0) {
      console.log(`❓ ${backend.toUpperCase()}: Not tested (missing configuration)`);
    } else if (passed === total) {
      console.log(`✅ ${backend.toUpperCase()}: FULLY FUNCTIONAL`);
    } else if (passed > 0) {
      console.log(`⚠️ ${backend.toUpperCase()}: PARTIALLY FUNCTIONAL (${passed}/${total} working)`);
    } else {
      console.log(`❌ ${backend.toUpperCase()}: NOT FUNCTIONAL`);
    }
  });
  
  // Save results
  require('fs').writeFileSync('meticulous-backend-results.json', JSON.stringify(testResults, null, 2));
  console.log('\n📄 Detailed results saved to meticulous-backend-results.json');
}

runMeticulousTests().catch(error => {
  console.error('❌ Meticulous test error:', error);
  process.exit(1);
});