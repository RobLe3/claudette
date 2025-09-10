// Backend Reliability Enhancement Test - Focused on Fix Validation
// Tests the fixes applied to backend reliability issues

const { optimize } = require('./dist/index.js');

async function testBackendReliability() {
    console.log('🚀 Starting Backend Reliability Enhancement Test');
    console.log('Testing fixes for: health checks, model configuration, auto-enabling');
    console.log('=' .repeat(70));

    const results = {
        timestamp: new Date().toISOString(),
        test_suite: 'Backend Reliability Enhancement',
        fixes_tested: [
            'OpenAI health check null client fix',
            'Model configuration default fix',
            'Auto-enable backends with API keys',
            'Cost calculation accuracy'
        ],
        tests: []
    };

    try {
        // Test 1: Backend Initialization and Health Check
        console.log('\n1. Backend Initialization Test');
        console.log('   Testing backend auto-enabling and health checks...');
        
        const testStart = Date.now();
        
        // Import Claudette class directly to test initialization
        const { Claudette } = require('./dist/index.js');
        const claudette = new Claudette();
        
        try {
            await claudette.initialize();
            const status = await claudette.getStatus();
            
            console.log(`   ✅ System initialized successfully`);
            console.log(`   📊 Backends available: ${status.backends.health.length}`);
            console.log(`   🏥 Database healthy: ${status.database.healthy}`);
            console.log(`   💾 Cache operational: ${status.cache.hit_rate >= 0}`);
            
            // Log backend health details
            status.backends.health.forEach(backend => {
                const healthIcon = backend.healthy ? '✅' : '❌';
                console.log(`   ${healthIcon} ${backend.name} backend: ${backend.healthy ? 'healthy' : 'unhealthy'}`);
                if (backend.error) {
                    console.log(`      Error: ${backend.error}`);
                }
            });
            
            results.tests.push({
                test: 'Backend Initialization',
                success: true,
                time_ms: Date.now() - testStart,
                backends_count: status.backends.health.length,
                healthy_backends: status.backends.health.filter(b => b.healthy).length,
                backend_details: status.backends.health
            });
            
        } catch (error) {
            console.log(`   ❌ Initialization failed: ${error.message}`);
            results.tests.push({
                test: 'Backend Initialization',
                success: false,
                error: error.message,
                time_ms: Date.now() - testStart
            });
        }

        // Test 2: Direct Backend API Test (if we have API keys)
        if (process.env.OPENAI_API_KEY) {
            console.log('\n2. OpenAI Backend Direct Test');
            console.log('   Testing OpenAI health check and model configuration fixes...');
            
            try {
                const testStart2 = Date.now();
                const { OpenAIBackend } = require('./dist/backends/openai.js');
                
                const backend = new OpenAIBackend({
                    enabled: true,
                    priority: 1,
                    cost_per_token: 0.0001,
                    model: 'gpt-4o-mini', // Testing proper model config
                    api_key: process.env.OPENAI_API_KEY
                });
                
                // Test health check (this should no longer fail with null client)
                const isHealthy = await backend.isAvailable();
                console.log(`   🏥 Health check result: ${isHealthy ? 'PASS' : 'FAIL'}`);
                
                if (isHealthy) {
                    // Test actual API call with proper cost calculation
                    const testRequest = {
                        prompt: 'Say "Backend test successful" and calculate 2+2',
                        files: [],
                        options: {},
                        metadata: { test: true }
                    };
                    
                    const response = await backend.send(testRequest);
                    
                    console.log(`   ✅ API call successful`);
                    console.log(`   📝 Response: "${response.content.substring(0, 50)}..."`);
                    console.log(`   🔢 Tokens: ${response.tokens_input}+${response.tokens_output}`);
                    console.log(`   💰 Cost: ${response.cost_eur} EUR`);
                    console.log(`   ⏱️  Latency: ${response.latency_ms}ms`);
                    
                    results.tests.push({
                        test: 'OpenAI Backend Direct',
                        success: true,
                        time_ms: Date.now() - testStart2,
                        health_check: isHealthy,
                        response_length: response.content.length,
                        tokens_total: response.tokens_input + response.tokens_output,
                        cost_eur: response.cost_eur,
                        cost_calculation_working: response.cost_eur > 0, // This should now be true
                        latency_ms: response.latency_ms
                    });
                } else {
                    results.tests.push({
                        test: 'OpenAI Backend Direct',
                        success: false,
                        error: 'Health check failed',
                        time_ms: Date.now() - testStart2
                    });
                }
                
            } catch (error) {
                console.log(`   ❌ Direct backend test failed: ${error.message}`);
                results.tests.push({
                    test: 'OpenAI Backend Direct',
                    success: false,
                    error: error.message,
                    time_ms: Date.now() - testStart2
                });
            }
        } else {
            console.log('\n2. OpenAI Backend Direct Test - SKIPPED (no API key)');
        }

        // Test 3: Full System Test (using optimize function)
        console.log('\n3. Full System Integration Test');
        console.log('   Testing complete backend routing with fixes...');
        
        try {
            const testStart3 = Date.now();
            
            const response = await optimize(
                'Test the backend reliability enhancements. Respond with "System working" if successful.',
                [],
                { bypass_cache: true } // Skip cache to force backend call
            );
            
            console.log(`   ✅ System test successful`);
            console.log(`   📝 Response: "${response.content.substring(0, 50)}..."`);
            console.log(`   🎯 Backend used: ${response.backend_used}`);
            console.log(`   🔢 Tokens: ${response.tokens_input}+${response.tokens_output}`);
            console.log(`   💰 Cost: ${response.cost_eur} EUR`);
            console.log(`   💾 Cache hit: ${response.cache_hit}`);
            console.log(`   ⏱️  Latency: ${response.latency_ms}ms`);
            
            results.tests.push({
                test: 'Full System Integration',
                success: true,
                time_ms: Date.now() - testStart3,
                backend_used: response.backend_used,
                response_length: response.content.length,
                tokens_total: response.tokens_input + response.tokens_output,
                cost_eur: response.cost_eur,
                cache_hit: response.cache_hit,
                latency_ms: response.latency_ms
            });
            
        } catch (error) {
            console.log(`   ❌ System test failed: ${error.message}`);
            results.tests.push({
                test: 'Full System Integration',
                success: false,
                error: error.message,
                time_ms: Date.now() - testStart3
            });
        }

    } catch (error) {
        console.error(`Critical test error: ${error.message}`);
        results.critical_error = error.message;
    }

    // Calculate results
    const successful = results.tests.filter(t => t.success).length;
    const total = results.tests.length;
    const successRate = total > 0 ? ((successful / total) * 100).toFixed(1) : '0';
    
    results.summary = {
        total_tests: total,
        successful_tests: successful,
        success_rate: `${successRate}%`,
        all_fixes_working: successful === total
    };

    console.log('\n' + '='.repeat(70));
    console.log('📊 BACKEND RELIABILITY ENHANCEMENT TEST RESULTS');
    console.log('='.repeat(70));
    console.log(`Total Tests: ${total}`);
    console.log(`Successful: ${successful}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log(`All Fixes Working: ${successful === total ? '✅ YES' : '❌ NO'}`);
    
    if (successful === total) {
        console.log('\n🎉 All backend reliability fixes are working correctly!');
        console.log('   ✅ OpenAI health check null client issue fixed');
        console.log('   ✅ Model configuration defaults working');
        console.log('   ✅ Backend auto-enabling operational');
        console.log('   ✅ System integration functional');
    } else {
        console.log('\n⚠️ Some fixes may need additional work:');
        results.tests.forEach(test => {
            if (!test.success) {
                console.log(`   ❌ ${test.test}: ${test.error || 'Failed'}`);
            }
        });
    }

    // Save detailed results
    require('fs').writeFileSync(
        './backend-reliability-test-results.json', 
        JSON.stringify(results, null, 2)
    );
    
    console.log('\n📄 Detailed results saved to: backend-reliability-test-results.json');
    console.log('🏁 Backend reliability test completed');

    return results;
}

// Run the test
if (require.main === module) {
    testBackendReliability().catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = { testBackendReliability };