#!/usr/bin/env node

/**
 * Simple Cache Integration Test
 * Tests the actual Claudette optimize function with cache integration
 */

const { performance } = require('perf_hooks');

async function testClaudetteCache() {
    console.log('🤖 Testing Claudette optimize() function with cache...');
    
    try {
        // Import Claudette
        const claudette = require('./dist/index.js');
        console.log('✅ Claudette imported successfully');
        console.log('Available exports:', Object.keys(claudette));
        
        // Check if optimize function exists
        if (!claudette.optimize) {
            console.log('❌ optimize function not found');
            console.log('Available functions:', Object.keys(claudette));
            return;
        }
        
        // Test simple prompt
        const testPrompt = 'What is caching in computer science?';
        
        console.log('\n📋 Test 1: First request (should miss cache)');
        const start1 = performance.now();
        try {
            const response1 = await claudette.optimize(testPrompt);
            const duration1 = performance.now() - start1;
            console.log(`✅ First request completed in ${duration1.toFixed(2)}ms`);
            console.log(`Response length: ${response1.content?.length || 'unknown'} characters`);
            console.log(`Cache hit: ${response1.cache_hit || false}`);
        } catch (error) {
            console.log(`❌ First request failed: ${error.message}`);
            return;
        }
        
        console.log('\n📋 Test 2: Identical request (should hit cache)');
        const start2 = performance.now();
        try {
            const response2 = await claudette.optimize(testPrompt);
            const duration2 = performance.now() - start2;
            console.log(`✅ Second request completed in ${duration2.toFixed(2)}ms`);
            console.log(`Response length: ${response2.content?.length || 'unknown'} characters`);
            console.log(`Cache hit: ${response2.cache_hit || false}`);
            
            // Check if cache is working
            const speedImprovement = duration1 / duration2;
            const cacheWorking = response2.cache_hit === true || speedImprovement > 2;
            
            console.log(`\n🎯 Cache Performance Analysis:`);
            console.log(`Speed improvement: ${speedImprovement.toFixed(1)}x`);
            console.log(`Cache working: ${cacheWorking ? '✅ YES' : '❌ NO'}`);
            
            if (cacheWorking) {
                console.log('\n🎉 CACHE SYSTEM IS FUNCTIONAL! 🎉');
            } else {
                console.log('\n⚠️ Cache system may need attention');
            }
            
        } catch (error) {
            console.log(`❌ Second request failed: ${error.message}`);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Run the test
if (require.main === module) {
    testClaudetteCache().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { testClaudetteCache };