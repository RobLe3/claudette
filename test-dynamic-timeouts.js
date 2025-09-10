#!/usr/bin/env node

/**
 * Dynamic Timeout Calibration Test
 * Tests the adaptive timeout system with simulated backend performance
 */

const { DynamicTimeoutManager } = require('./src/monitoring/dynamic-timeout-manager.js');

async function testDynamicTimeouts() {
  console.log('🧪 Testing Dynamic Timeout Calibration System\n');
  
  const timeoutManager = new DynamicTimeoutManager();
  
  // Test 1: Simulate reliable backend (OpenAI-like)
  console.log('📊 Test 1: Simulating reliable backend...');
  const reliableBackend = 'openai-test';
  
  for (let i = 0; i < 15; i++) {
    const latency = 2000 + Math.random() * 1000; // 2-3s latency
    const success = Math.random() > 0.05; // 95% success rate
    
    timeoutManager.recordPerformance(reliableBackend, {
      latency,
      success,
      timeout: false,
      requestSize: 1000 + Math.random() * 2000
    });
  }
  
  let timeout1 = timeoutManager.getTimeoutForBackend(reliableBackend);
  console.log(`Initial timeout for ${reliableBackend}: ${timeout1}ms`);
  
  // Test 2: Simulate unreliable backend
  console.log('\n📊 Test 2: Simulating unreliable backend...');
  const unreliableBackend = 'custom-unreliable';
  
  for (let i = 0; i < 15; i++) {
    const latency = 5000 + Math.random() * 10000; // 5-15s latency
    const success = Math.random() > 0.3; // 70% success rate
    const timeout = Math.random() < 0.1; // 10% timeout rate
    
    timeoutManager.recordPerformance(unreliableBackend, {
      latency: timeout ? 30000 : latency,
      success: !timeout && success,
      timeout,
      requestSize: 1000 + Math.random() * 2000
    });
  }
  
  let timeout2 = timeoutManager.getTimeoutForBackend(unreliableBackend);
  console.log(`Initial timeout for ${unreliableBackend}: ${timeout2}ms`);
  
  // Test 3: Simulate improving backend
  console.log('\n📊 Test 3: Simulating improving backend...');
  const improvingBackend = 'custom-improving';
  
  // Start poor, then improve
  for (let i = 0; i < 20; i++) {
    const progress = i / 20;
    const baseLatency = 8000 - progress * 5000; // 8s -> 3s
    const latency = baseLatency + Math.random() * 1000;
    const successRate = 0.6 + progress * 0.3; // 60% -> 90%
    const success = Math.random() < successRate;
    
    timeoutManager.recordPerformance(improvingBackend, {
      latency,
      success,
      timeout: false,
      requestSize: 1000 + Math.random() * 2000
    });
  }
  
  let timeout3 = timeoutManager.getTimeoutForBackend(improvingBackend);
  console.log(`Final timeout for ${improvingBackend}: ${timeout3}ms`);
  
  // Test 4: Show calibration status
  console.log('\n📈 Calibration Status Summary:');
  const status = timeoutManager.getCalibrationStatus();
  
  for (const [backend, info] of Object.entries(status)) {
    console.log(`\n🔧 ${backend}:`);
    console.log(`  - Current Timeout: ${info.currentTimeout}ms`);
    console.log(`  - Quality Tier: ${info.qualityTier}`);
    console.log(`  - Confidence: ${(info.confidence * 100).toFixed(1)}%`);
    console.log(`  - Success Rate: ${(info.performanceStats.successRate * 100).toFixed(1)}%`);
    console.log(`  - Avg Latency: ${Math.round(info.performanceStats.avgLatency)}ms`);
    console.log(`  - Trend: ${info.performanceStats.trend}`);
    console.log(`  - Sample Size: ${info.sampleSize} requests`);
  }
  
  // Test 5: Context-aware timeout adjustment
  console.log('\n🎯 Test 5: Context-aware timeout adjustment:');
  
  const contexts = [
    { name: 'Simple query', complexityScore: 0.1, requestSize: 500 },
    { name: 'Complex analysis', complexityScore: 0.8, requestSize: 5000 },
    { name: 'Large document', complexityScore: 0.3, requestSize: 50000 }
  ];
  
  contexts.forEach(context => {
    const timeout = timeoutManager.getTimeoutForBackend(reliableBackend, context);
    console.log(`  - ${context.name}: ${timeout}ms`);
  });
  
  console.log('\n✅ Dynamic Timeout Calibration Test Complete!');
  console.log('\n🎯 Key Benefits:');
  console.log('  • Reliable backends get shorter timeouts (faster failure detection)');
  console.log('  • Unreliable backends get longer timeouts (reduced false timeouts)');
  console.log('  • System learns and adapts to backend behavior over time');
  console.log('  • Context-aware adjustments for different request types');
  console.log('  • Automatic quality tier classification');
}

// Run test if called directly
if (require.main === module) {
  testDynamicTimeouts().catch(console.error);
}

module.exports = { testDynamicTimeouts };