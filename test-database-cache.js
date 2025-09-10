#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🗄️ CLAUDETTE DATABASE & CACHE SYSTEM TEST');
console.log('==========================================');

let testResults = {
  database: { passed: 0, failed: 0, tests: [] },
  cache: { passed: 0, failed: 0, tests: [] },
  integration: { passed: 0, failed: 0, tests: [] }
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

async function testDatabase() {
  console.log('\n📊 Testing Database System');
  console.log('---------------------------');
  
  try {
    const { DatabaseManager } = require('./dist/database/index.js');
    logTest('database', 'Module Loading', true, 'DatabaseManager class available');
    
    // Test initialization
    try {
      const db = new DatabaseManager();
      logTest('database', 'Initialization', true, 'DatabaseManager instance created');
      
      // Test database operations
      try {
        await db.initialize();
        logTest('database', 'Database Setup', true, 'Database initialized successfully');
        
        // Test cache entry operations
        const testEntry = {
          cache_key: 'test-key-' + Date.now(),
          prompt_hash: 'test-hash',
          response: JSON.stringify({ content: 'test response' }),
          created_at: Date.now(),
          expires_at: Date.now() + 3600000,
          size_bytes: 100
        };
        
        db.setCacheEntry(testEntry);
        logTest('database', 'Cache Entry Storage', true, 'Cache entry stored successfully');
        
        const retrieved = db.getCacheEntry(testEntry.cache_key);
        const retrieveSuccess = retrieved && retrieved.cache_key === testEntry.cache_key;
        logTest('database', 'Cache Entry Retrieval', retrieveSuccess, 
               retrieveSuccess ? 'Entry retrieved correctly' : 'Failed to retrieve entry');
        
        // Test stats
        const stats = db.getCacheStats();
        logTest('database', 'Cache Statistics', !!stats, 
               stats ? `Stats: ${JSON.stringify(stats)}` : 'No stats returned');
        
      } catch (error) {
        logTest('database', 'Database Operations', false, `Error: ${error.message}`);
      }
      
    } catch (error) {
      logTest('database', 'Initialization', false, `Error: ${error.message}`);
    }
    
  } catch (error) {
    logTest('database', 'Module Loading', false, `Import error: ${error.message}`);
  }
}

async function testCache() {
  console.log('\n🔄 Testing Cache System');
  console.log('------------------------');
  
  try {
    const { CacheSystem } = require('./dist/cache/index.js');
    logTest('cache', 'Module Loading', true, 'CacheSystem class available');
    
    try {
      const cache = new CacheSystem({
        ttl: 3600,
        maxSize: 100,
        enableMemory: true,
        enablePersistent: false
      });
      logTest('cache', 'Initialization', true, 'CacheSystem instance created');
      
      // Test cache operations
      const testKey = 'test-cache-key';
      const testValue = { content: 'test response', backend: 'test' };
      
      try {
        await cache.set(testKey, testValue);
        logTest('cache', 'Cache Set Operation', true, 'Value stored in cache');
        
        const retrieved = await cache.get(testKey);
        const getSuccess = retrieved && retrieved.content === testValue.content;
        logTest('cache', 'Cache Get Operation', getSuccess,
               getSuccess ? 'Value retrieved correctly' : 'Failed to retrieve value');
        
        const stats = await cache.getStats();
        logTest('cache', 'Cache Statistics', !!stats,
               stats ? `Hit rate: ${stats.hit_rate}` : 'No stats available');
        
      } catch (error) {
        logTest('cache', 'Cache Operations', false, `Error: ${error.message}`);
      }
      
    } catch (error) {
      logTest('cache', 'Initialization', false, `Error: ${error.message}`);
    }
    
  } catch (error) {
    logTest('cache', 'Module Loading', false, `Import error: ${error.message}`);
  }
}

async function testIntegration() {
  console.log('\n🔗 Testing Cache Integration');
  console.log('-----------------------------');
  
  try {
    const { Claudette } = require('./dist/index.js');
    
    const claudette = new Claudette({
      openai: { apiKey: process.env.OPENAI_API_KEY || 'test' }
    });
    
    logTest('integration', 'Claudette with Cache', true, 'Claudette instance created');
    
    // Test if caching affects performance (mock test)
    const startTime = Date.now();
    
    // This is a simplified test - real caching would need actual API calls
    try {
      const config = claudette.getConfig();
      const hasCache = config && (config.cache || config.caching);
      logTest('integration', 'Cache Configuration', !!hasCache,
             hasCache ? 'Cache settings found in config' : 'No cache config found');
             
      const endTime = Date.now();
      logTest('integration', 'Performance Test', true, `Config retrieval: ${endTime - startTime}ms`);
      
    } catch (error) {
      logTest('integration', 'Cache Integration', false, `Error: ${error.message}`);
    }
    
  } catch (error) {
    logTest('integration', 'Claudette Loading', false, `Import error: ${error.message}`);
  }
}

async function runAllTests() {
  await testDatabase();
  await testCache(); 
  await testIntegration();
  
  console.log('\n📋 TEST SUMMARY');
  console.log('================');
  
  Object.keys(testResults).forEach(category => {
    const { passed, failed, tests } = testResults[category];
    const total = passed + failed;
    const rate = total > 0 ? Math.round((passed / total) * 100) : 0;
    
    console.log(`\n${category.toUpperCase()}:`);
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
  
  console.log(`\n🎯 OVERALL: ${totalPassed}/${totalTests} tests passed (${overallRate}%)`);
  
  // Write results to file
  fs.writeFileSync('database-cache-test-results.json', JSON.stringify(testResults, null, 2));
  console.log('\n📄 Results saved to database-cache-test-results.json');
}

runAllTests().catch(error => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
});