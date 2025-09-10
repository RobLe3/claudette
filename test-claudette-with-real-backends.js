#!/usr/bin/env node

console.log('🎯 TESTING CLAUDETTE WITH ACTUAL CONFIGURED BACKENDS');
console.log('=====================================================');

require('dotenv').config();

async function testClaudetteWithRealBackends() {
  try {
    const { Claudette } = require('./dist/index.js');
    
    console.log('\n📋 Testing Claudette Backend Integration');
    console.log('-----------------------------------------');
    
    // Create Claudette instance with actual configured backends
    const claudette = new Claudette({
      openai: {
        apiKey: process.env.OPENAI_API_KEY
      },
      flexcon: {
        apiUrl: process.env.FLEXCON_API_URL,
        apiKey: process.env.FLEXCON_API_KEY,
        model: process.env.FLEXCON_MODEL
      },
      ultipa: {
        endpoint: process.env.ULTIPA_ENDPOINT,
        accessToken: process.env.ULTIPA_ACCESS_TOKEN,
        username: process.env.ULTIPA_DB_USERNAME,
        password: process.env.ULTIPA_DB_PASSWORD
      }
    });
    
    console.log('✅ Claudette instance created with all configured backends');
    
    // Test initialization
    try {
      await claudette.initialize();
      console.log('✅ Claudette initialization completed');
    } catch (error) {
      console.log('❌ Claudette initialization failed:', error.message);
    }
    
    // Test getting status
    try {
      const status = claudette.getStatus();
      console.log('✅ Claudette status retrieved:', status);
    } catch (error) {
      console.log('❌ Status retrieval failed:', error.message);
    }
    
    // Test actual query with timeout
    console.log('\n🚀 Testing actual AI query through Claudette...');
    try {
      const result = await claudette.optimize('Say "backend test successful" in exactly 3 words', [], {
        timeout: 30000,
        maxRetries: 1
      });
      
      if (result) {
        console.log('✅ Query successful!');
        console.log('   Response:', result.content || result.response || 'No content');
        console.log('   Backend used:', result.backend_used || 'Unknown');
        console.log('   Cost:', result.cost_eur || 'Unknown');
        console.log('   Tokens:', result.tokens_input, '→', result.tokens_output);
        console.log('   Latency:', result.latency_ms, 'ms');
      } else {
        console.log('❌ Query returned null/undefined result');
      }
      
    } catch (error) {
      console.log('❌ Query failed:', error.message);
      console.log('   Stack:', error.stack?.split('\n')[0]);
    }
    
    // Test with different query to trigger backend selection
    console.log('\n🔄 Testing backend selection with second query...');
    try {
      const result2 = await claudette.optimize('Test 2', [], {
        timeout: 20000
      });
      
      if (result2) {
        console.log('✅ Second query successful!');
        console.log('   Backend used:', result2.backend_used || 'Unknown');
        console.log('   Response length:', (result2.content || result2.response || '').length, 'chars');
      } else {
        console.log('❌ Second query returned null');
      }
      
    } catch (error) {
      console.log('❌ Second query failed:', error.message);
    }
    
    console.log('\n📊 Backend Status Summary:');
    console.log('---------------------------');
    
    // Check what backends are actually registered/available
    try {
      const config = claudette.getConfig();
      if (config && config.backends) {
        console.log('Configured backends in Claudette:');
        Object.keys(config.backends).forEach(backend => {
          console.log(`  - ${backend}: ${config.backends[backend] ? 'configured' : 'not configured'}`);
        });
      }
    } catch (error) {
      console.log('Could not retrieve backend configuration');
    }
    
  } catch (error) {
    console.error('❌ Failed to load Claudette:', error.message);
  }
}

testClaudetteWithRealBackends().catch(console.error);