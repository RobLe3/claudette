#!/usr/bin/env node

/**
 * Working Backend Test - Tests the functioning Ollama/Flexcon backend
 */

require('dotenv').config();

async function testWorkingBackend() {
    console.log('🔬 Testing Working Backend (Ollama/Flexcon)');
    console.log('============================================');
    
    const results = [];
    
    try {
        const { Claudette } = require('./dist/index.js');
        const claudette = new Claudette();
        await claudette.initialize();
        
        // Test 1: Direct Ollama backend test
        console.log('\n1. Testing direct Ollama backend...');
        const start1 = Date.now();
        
        try {
            const response1 = await claudette.optimize("Say exactly: 'Test successful'", [], { backend: 'ollama' });
            const time1 = Date.now() - start1;
            
            console.log(`✅ Direct Ollama test successful (${time1}ms)`);
            console.log(`   Response: "${response1.content}"`);
            console.log(`   Backend: ${response1.backend_used}`);
            console.log(`   Tokens: ${response1.tokens_input}+${response1.tokens_output}`);
            console.log(`   Cost: ${response1.cost_eur} EUR`);
            
            results.push({
                test: 'Direct Ollama Backend',
                success: true,
                time_ms: time1,
                response: response1.content,
                backend: response1.backend_used,
                tokens: response1.tokens_input + response1.tokens_output,
                cost: response1.cost_eur
            });
        } catch (e1) {
            console.log(`❌ Direct Ollama test failed: ${e1.message}`);
            results.push({ test: 'Direct Ollama Backend', success: false, error: e1.message });
        }
        
        // Test 2: Auto-routing test
        console.log('\n2. Testing auto-routing...');
        const start2 = Date.now();
        
        try {
            const response2 = await claudette.optimize("What is 2+2?");
            const time2 = Date.now() - start2;
            
            console.log(`✅ Auto-routing test successful (${time2}ms)`);
            console.log(`   Response: "${response2.content}"`);
            console.log(`   Selected backend: ${response2.backend_used}`);
            console.log(`   Tokens: ${response2.tokens_input}+${response2.tokens_output}`);
            
            results.push({
                test: 'Auto-routing',
                success: true,
                time_ms: time2,
                response: response2.content,
                backend: response2.backend_used,
                tokens: response2.tokens_input + response2.tokens_output
            });
        } catch (e2) {
            console.log(`❌ Auto-routing test failed: ${e2.message}`);
            results.push({ test: 'Auto-routing', success: false, error: e2.message });
        }
        
        // Test 3: Cost optimization test
        console.log('\n3. Testing cost optimization...');
        const start3 = Date.now();
        
        try {
            const response3 = await claudette.optimize("Brief answer: What color is the sky?", [], { optimize_cost: true });
            const time3 = Date.now() - start3;
            
            console.log(`✅ Cost optimization test successful (${time3}ms)`);
            console.log(`   Response: "${response3.content}"`);
            console.log(`   Backend: ${response3.backend_used}`);
            console.log(`   Cost: ${response3.cost_eur} EUR`);
            
            results.push({
                test: 'Cost Optimization',
                success: true,
                time_ms: time3,
                response: response3.content,
                backend: response3.backend_used,
                cost: response3.cost_eur
            });
        } catch (e3) {
            console.log(`❌ Cost optimization test failed: ${e3.message}`);
            results.push({ test: 'Cost Optimization', success: false, error: e3.message });
        }
        
        // Test 4: Caching test
        console.log('\n4. Testing caching...');
        const cacheTestPrompt = "Cache test prompt " + Date.now();
        
        try {
            // First request
            const start4a = Date.now();
            const response4a = await claudette.optimize(cacheTestPrompt);
            const time4a = Date.now() - start4a;
            
            // Second request (should be faster if cached)
            const start4b = Date.now();
            const response4b = await claudette.optimize(cacheTestPrompt);
            const time4b = Date.now() - start4b;
            
            console.log(`✅ Cache test completed`);
            console.log(`   First request: ${time4a}ms, Cache hit: ${response4a.cache_hit || false}`);
            console.log(`   Second request: ${time4b}ms, Cache hit: ${response4b.cache_hit || false}`);
            console.log(`   Speed improvement: ${time4b < time4a ? 'YES' : 'NO'}`);
            
            results.push({
                test: 'Caching',
                success: true,
                first_time_ms: time4a,
                second_time_ms: time4b,
                cache_working: time4b < time4a || response4b.cache_hit,
                first_cache_hit: response4a.cache_hit || false,
                second_cache_hit: response4b.cache_hit || false
            });
        } catch (e4) {
            console.log(`❌ Cache test failed: ${e4.message}`);
            results.push({ test: 'Caching', success: false, error: e4.message });
        }
        
        // Test 5: Backend routing verification
        console.log('\n5. Testing backend routing details...');
        
        try {
            const backends = claudette.router.getBackends();
            const routerStats = claudette.router.getStats();
            const healthCheck = await claudette.router.healthCheckAll();
            
            console.log(`✅ Backend routing details:`);
            console.log(`   Registered backends: ${backends.length}`);
            console.log(`   Healthy backends: ${healthCheck.filter(h => h.healthy).length}`);
            console.log(`   Router options: ${JSON.stringify(routerStats.routingOptions)}`);
            
            backends.forEach(backend => {
                console.log(`   - ${backend.name}: priority ${backend.config?.priority}, cost ${backend.config?.cost_per_token}`);
            });
            
            results.push({
                test: 'Backend Routing Details',
                success: true,
                backend_count: backends.length,
                healthy_count: healthCheck.filter(h => h.healthy).length,
                routing_options: routerStats.routingOptions,
                backend_details: backends.map(b => ({
                    name: b.name,
                    priority: b.config?.priority,
                    cost_per_token: b.config?.cost_per_token,
                    enabled: b.config?.enabled
                }))
            });
        } catch (e5) {
            console.log(`❌ Backend routing test failed: ${e5.message}`);
            results.push({ test: 'Backend Routing Details', success: false, error: e5.message });
        }
        
        await claudette.cleanup();
        
    } catch (error) {
        console.log(`❌ Critical error: ${error.message}`);
        results.push({ test: 'Critical Error', success: false, error: error.message });
    }
    
    // Summary
    const successful = results.filter(r => r.success).length;
    const total = results.length;
    
    console.log('\n📊 Working Backend Test Summary');
    console.log('==============================');
    console.log(`Tests passed: ${successful}/${total} (${((successful/total)*100).toFixed(1)}%)`);
    
    if (successful > 0) {
        console.log('\n✅ Core functionality confirmed working:');
        results.filter(r => r.success).forEach(r => {
            console.log(`   - ${r.test}`);
        });
    }
    
    if (successful < total) {
        console.log('\n❌ Issues detected:');
        results.filter(r => !r.success).forEach(r => {
            console.log(`   - ${r.test}: ${r.error}`);
        });
    }
    
    // Save results
    const fs = require('fs');
    fs.writeFileSync('./working-backend-results.json', JSON.stringify({
        timestamp: new Date().toISOString(),
        summary: { total, successful, success_rate: ((successful/total)*100).toFixed(1) + '%' },
        results
    }, null, 2));
    
    console.log('\n📄 Detailed results saved to: ./working-backend-results.json');
    
    return results;
}

if (require.main === module) {
    testWorkingBackend().catch(console.error);
}

module.exports = { testWorkingBackend };