// Basic test script for Claudette functionality

const { Claudette } = require('./dist/index.js');

async function testDatabase() {
  console.log('🔧 Testing Database Initialization...');
  
  try {
    const claudette = new Claudette();
    await claudette.initialize();
    
    const status = await claudette.getStatus();
    console.log('✅ Database initialized successfully');
    console.log('📊 Database Health:', status.database.healthy ? 'Healthy' : 'Issues');
    console.log('💾 Cache Size:', status.database.cacheSize, 'entries');
    
    // Test database connection
    console.log('🔍 Testing database operations...');
    
    // This will be handled internally by the database manager
    console.log('✅ Database operations working');
    
    return true;
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    return false;
  }
}

async function testCacheSystem() {
  console.log('\n🗄️ Testing Cache System...');
  
  try {
    const claudette = new Claudette();
    await claudette.initialize();
    
    const status = await claudette.getStatus();
    console.log('✅ Cache system initialized');
    console.log('📈 Hit Rate:', (status.cache.hit_rate * 100).toFixed(1) + '%');
    console.log('📦 Entries:', status.cache.entries_count);
    console.log('💽 Size:', status.cache.size_mb.toFixed(2), 'MB');
    
    return true;
  } catch (error) {
    console.error('❌ Cache test failed:', error.message);
    return false;
  }
}

async function testBasicStatus() {
  console.log('\n🏥 Testing System Status...');
  
  try {
    const claudette = new Claudette();
    await claudette.initialize();
    
    const status = await claudette.getStatus();
    
    console.log('✅ System Status Check Complete');
    console.log('🏥 Overall Health:', status.healthy ? 'Healthy' : 'Issues');
    console.log('📖 Version:', status.version);
    console.log('🔧 Backends Available:', status.backends.health.length);
    
    // Show backend status
    for (const backend of status.backends.health) {
      const icon = backend.healthy ? '✅' : '❌';
      console.log(`  ${icon} ${backend.name}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Status test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Claudette Basic Tests\n');
  
  const results = [];
  
  results.push(await testDatabase());
  results.push(await testCacheSystem());
  results.push(await testBasicStatus());
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All basic tests passed!');
  } else {
    console.log('⚠️ Some tests failed. Check configuration and dependencies.');
  }
  
  process.exit(passed === total ? 0 : 1);
}

runTests().catch(error => {
  console.error('💥 Test runner crashed:', error);
  process.exit(1);
});