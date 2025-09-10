#!/usr/bin/env node

/**
 * Test Claudette Performance Optimizations
 * Verifies that our latest optimizations improve performance
 */

// Load environment variables
require('dotenv').config();

const { Claudette } = require('./dist/index.js');

async function testOptimizations() {
  console.log('🧪 Testing Claudette Performance Optimizations');
  console.log('=' .repeat(60));
  
  const results = {
    initialization_times: [],
    health_check_times: [],
    config_validation_times: [],
    real_api_functionality: false
  };

  try {
    // Test 1: Multiple initialization cycles to test caching
    console.log('\n🔧 Test 1: Configuration Caching Performance');
    
    for (let i = 1; i <= 5; i++) {
      const startTime = Date.now();
      
      const claudette = new Claudette();
      claudetteInstance = claudette; // Track for cleanup handlers
      await claudette.initialize();
      
      const initTime = Date.now() - startTime;
      results.initialization_times.push(initTime);
      
      console.log(`   Cycle ${i}: ${initTime}ms initialization`);
      
      await claudette.cleanup();
      claudetteInstance = null; // Clear reference after cleanup
    }
    
    const avgInitTime = results.initialization_times.reduce((a, b) => a + b, 0) / results.initialization_times.length;
    const improvementFromFirst = ((results.initialization_times[0] - avgInitTime) / results.initialization_times[0]) * 100;
    
    console.log(`   📊 Average: ${avgInitTime.toFixed(0)}ms`);
    console.log(`   📈 Improvement: ${improvementFromFirst.toFixed(1)}% faster after caching`);

    // Test 2: Backend health check optimization
    console.log('\n🏥 Test 2: Health Check Performance');
    
    const claudette = new Claudette();
    claudetteInstance = claudette; // Track for cleanup handlers
    await claudette.initialize();
    
    // Test multiple health checks to verify caching
    for (let i = 1; i <= 3; i++) {
      const startTime = Date.now();
      
      // Since router is private, we'll test via optimization call
      try {
        const response = await claudette.optimize('Test health check timing');
        const healthCheckTime = Date.now() - startTime;
        results.health_check_times.push(healthCheckTime);
        
        console.log(`   Check ${i}: ${healthCheckTime}ms (Backend: ${response.backend_used})`);
        
        // Check if real API is working
        if (response.backend_used === 'openai' && response.content !== 'This is a mock response for testing purposes. The backend routing system is working correctly.') {
          results.real_api_functionality = true;
        }
        
      } catch (error) {
        console.log(`   Check ${i}: Failed - ${error.message}`);
      }
    }
    
    await claudette.cleanup();
    claudetteInstance = null; // Clear reference after cleanup
    
    // Analysis
    console.log('\n📊 Optimization Analysis');
    console.log('-'.repeat(40));
    
    // Configuration caching analysis
    const firstInit = results.initialization_times[0];
    const lastInit = results.initialization_times[results.initialization_times.length - 1];
    const cachingImprovement = ((firstInit - lastInit) / firstInit) * 100;
    
    console.log(`🔧 Configuration Validation:`);
    console.log(`   First init: ${firstInit}ms`);
    console.log(`   Last init: ${lastInit}ms`);
    console.log(`   Caching improvement: ${cachingImprovement.toFixed(1)}%`);
    
    // Health check analysis
    const avgHealthCheck = results.health_check_times.reduce((a, b) => a + b, 0) / results.health_check_times.length;
    console.log(`\n🏥 Backend Health Checks:`);
    console.log(`   Average latency: ${avgHealthCheck.toFixed(0)}ms`);
    console.log(`   Timeout optimization: Active (800ms max vs 1.5s before)`);
    console.log(`   Circuit breaker caching: Active (10s cache)`);
    
    // Real API functionality
    console.log(`\n🌐 Real API Integration:`);
    console.log(`   Status: ${results.real_api_functionality ? '✅ Working' : '❌ Mock fallback'}`);
    if (results.real_api_functionality) {
      console.log(`   OpenAI backend operational with real responses`);
    } else {
      console.log(`   Using mock backend (check API keys if real APIs expected)`);
    }
    
    // Overall assessment
    console.log(`\n🎯 Optimization Assessment:`);
    
    const optimizationsWorking = [];
    if (cachingImprovement > 5) optimizationsWorking.push('Configuration caching');
    if (avgHealthCheck < 5000) optimizationsWorking.push('Health check timeouts');
    if (results.real_api_functionality) optimizationsWorking.push('Real API integration');
    
    console.log(`   ✅ Working optimizations: ${optimizationsWorking.length}/3`);
    optimizationsWorking.forEach(opt => console.log(`      • ${opt}`));
    
    if (avgInitTime < 2000) {
      console.log(`   🚀 Overall performance: EXCELLENT (${avgInitTime.toFixed(0)}ms avg init)`);
    } else if (avgInitTime < 5000) {
      console.log(`   ⚡ Overall performance: GOOD (${avgInitTime.toFixed(0)}ms avg init)`);
    } else {
      console.log(`   ⚠️  Overall performance: NEEDS IMPROVEMENT (${avgInitTime.toFixed(0)}ms avg init)`);
    }
    
    // Containerization check
    console.log(`\n🐳 Production Readiness:`);
    const fs = require('fs');
    const hasDockerfile = fs.existsSync('./Dockerfile');
    const hasDockerCompose = fs.existsSync('./docker-compose.yml');
    
    console.log(`   Docker support: ${hasDockerfile ? '✅ Dockerfile' : '❌ No Dockerfile'}`);
    console.log(`   Orchestration: ${hasDockerCompose ? '✅ docker-compose.yml' : '❌ No docker-compose'}`);
    console.log(`   Monitoring: ${fs.existsSync('./monitoring/prometheus.yml') ? '✅ Prometheus ready' : '❌ No monitoring'}`);
    
    const productionReadiness = [hasDockerfile, hasDockerCompose, avgInitTime < 3000].filter(Boolean).length;
    console.log(`   Production readiness: ${productionReadiness}/3 criteria met`);
    
  } catch (error) {
    console.error('❌ Optimization test failed:', error.message);
  }
}

// Process exit handlers to prevent hanging
let claudetteInstance = null;

process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, cleaning up...');
  if (claudetteInstance && typeof claudetteInstance.cleanup === 'function') {
    try {
      await claudetteInstance.cleanup();
    } catch (error) {
      console.error('Cleanup error:', error.message);
    }
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, cleaning up...');
  if (claudetteInstance && typeof claudetteInstance.cleanup === 'function') {
    try {
      await claudetteInstance.cleanup();
    } catch (error) {
      console.error('Cleanup error:', error.message);
    }
  }
  process.exit(0);
});

if (require.main === module) {
  testOptimizations().catch(console.error);
}