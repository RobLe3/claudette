// Quick test to verify backend reliability fixes
const { Claudette } = require('./dist/index.js');

async function quickTest() {
    console.log('🔍 Quick Backend Fix Verification Test');
    console.log('=' .repeat(50));
    
    try {
        const claudette = new Claudette();
        console.log('1. Initializing Claudette...');
        
        await claudette.initialize();
        
        console.log('2. Checking system status...');
        const status = await claudette.getStatus();
        
        console.log(`   Registered backends: ${status.backends.health.length}`);
        console.log(`   Healthy backends: ${status.backends.health.filter(b => b.healthy).length}`);
        
        console.log('3. Testing optimize function...');
        const response = await claudette.optimize('Hello, test message', []);
        
        console.log(`✅ Test successful!`);
        console.log(`   Response: ${response.content.substring(0, 100)}...`);
        console.log(`   Backend: ${response.backend_used}`);
        console.log(`   Cost: ${response.cost_eur} EUR`);
        console.log(`   Tokens: ${response.tokens_input}+${response.tokens_output}`);
        
        return true;
        
    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
        return false;
    }
}

quickTest().then(success => {
    console.log(`\nTest result: ${success ? 'PASS' : 'FAIL'}`);
    process.exit(success ? 0 : 1);
});