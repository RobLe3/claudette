#!/usr/bin/env node

/**
 * Test Real Backend Registration
 * Verify that API backends are properly loaded with environment variables
 */

// Load environment variables
require('dotenv').config();

const { Claudette } = require('./dist/index.js');

async function testRealBackendRegistration() {
  console.log('🔧 Testing Real Backend Registration');
  console.log('=' .repeat(50));
  
  // Check environment variables
  console.log('\n📊 Environment Variables:');
  console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'Set' : 'Not set'}`);
  console.log(`   ENABLE_LIVE_BACKENDS: ${process.env.ENABLE_LIVE_BACKENDS}`);
  console.log(`   CUSTOM_BACKEND_1_API_KEY: ${process.env.CUSTOM_BACKEND_1_API_KEY ? 'Set' : 'Not set'}`);
  
  try {
    const claudette = new Claudette();
    
    console.log('\n🔧 Initializing Claudette...');
    await claudette.initialize();
    
    // Get backend information
    const config = claudette.getConfig();
    const backends = claudette.router.getRegisteredBackends();
    
    console.log('\n📋 Backend Configuration:');
    Object.entries(config.backends || {}).forEach(([name, backendConfig]) => {
      console.log(`   ${name}: ${backendConfig.enabled ? 'ENABLED' : 'DISABLED'} (Priority: ${backendConfig.priority})`);
    });
    
    console.log('\n🔗 Registered Backends:');
    backends.forEach(backend => {
      console.log(`   ${backend.name}: ${backend.config.enabled ? 'REGISTERED' : 'NOT REGISTERED'}`);
    });
    
    // Test health checks
    console.log('\n🏥 Backend Health Check:');
    const healthResults = await claudette.router.healthCheckAll();
    healthResults.forEach(result => {
      const icon = result.healthy ? '✅' : '❌';
      console.log(`   ${icon} ${result.name}: ${result.healthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    });
    
    // Test a simple query to see which backend responds
    console.log('\n🧪 Testing Simple Query:');
    const testResponse = await claudette.optimize('What is 2+2? Respond with just the number.');
    
    console.log(`   Response: "${testResponse.content}"`);
    console.log(`   Backend Used: ${testResponse.backend_used}`);
    console.log(`   Latency: ${testResponse.latency_ms}ms`);
    console.log(`   Cost: €${testResponse.cost_eur}`);
    
    await claudette.cleanup();
    
    // Determine if real backends are working
    const realBackendsWorking = testResponse.backend_used && !testResponse.backend_used.includes('mock');
    
    console.log('\n🎯 Result:');
    if (realBackendsWorking) {
      console.log('✅ SUCCESS: Real API backends are working!');
      console.log(`   Active backend: ${testResponse.backend_used}`);
    } else {
      console.log('❌ ISSUE: Still falling back to mock backend');
      console.log('   Possible causes:');
      console.log('   • API key invalid or expired');
      console.log('   • Backend health check failing');
      console.log('   • Network connectivity issues');
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

if (require.main === module) {
  testRealBackendRegistration().catch(console.error);
}

module.exports = { testRealBackendRegistration };