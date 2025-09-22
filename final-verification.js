#!/usr/bin/env node

// Final verification of all backends from .env file
const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '.env') });

async function finalVerification() {
    console.log('🎯 FINAL VERIFICATION: ALL BACKENDS FROM .ENV');
    console.log('='.repeat(47));
    
    const results = {
        environment: {},
        direct_api_tests: {},
        claudette_integration: {}
    };
    
    // 1. Environment Check
    console.log('\n📋 ENVIRONMENT CONFIGURATION:');
    console.log('-'.repeat(27));
    
    const envKeys = [
        'OPENAI_API_KEY',
        'QWEN_API_KEY', 
        'DASHSCOPE_API_KEY',
        'ANTHROPIC_API_KEY',
        'CUSTOM_BACKEND_1_API_KEY'
    ];
    
    envKeys.forEach(key => {
        const present = !!process.env[key];
        const status = present ? '✅' : '❌';
        console.log(`${key}: ${status}`);
        results.environment[key] = present;
    });
    
    // 2. Direct API Tests
    console.log('\n🔌 DIRECT API CONNECTIVITY:');
    console.log('-'.repeat(25));
    
    // OpenAI Test
    if (process.env.OPENAI_API_KEY) {
        try {
            const openaiStart = Date.now();
            const openaiResponse = await fetch('https://api.openai.com/v1/models', {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                }
            });
            const openaiDuration = Date.now() - openaiStart;
            
            if (openaiResponse.ok) {
                console.log(`✅ OpenAI API: Connected (${openaiDuration}ms)`);
                results.direct_api_tests.openai = { success: true, latency: openaiDuration };
            } else {
                console.log(`❌ OpenAI API: Failed (${openaiResponse.status})`);
                results.direct_api_tests.openai = { success: false, status: openaiResponse.status };
            }
        } catch (error) {
            console.log(`❌ OpenAI API: Error - ${error.message}`);
            results.direct_api_tests.openai = { success: false, error: error.message };
        }
    } else {
        console.log('⚠️ OpenAI API: No key configured');
        results.direct_api_tests.openai = { success: false, reason: 'no_key' };
    }
    
    // Qwen Test
    if (process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY) {
        try {
            const qwenStart = Date.now();
            const apiKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;
            const baseUrl = process.env.QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
            
            const qwenResponse = await fetch(`${baseUrl}/models`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                }
            });
            const qwenDuration = Date.now() - qwenStart;
            
            if (qwenResponse.ok) {
                console.log(`✅ Qwen API: Connected (${qwenDuration}ms)`);
                results.direct_api_tests.qwen = { success: true, latency: qwenDuration };
            } else {
                console.log(`❌ Qwen API: Failed (${qwenResponse.status})`);
                results.direct_api_tests.qwen = { success: false, status: qwenResponse.status };
            }
        } catch (error) {
            console.log(`❌ Qwen API: Error - ${error.message}`);
            results.direct_api_tests.qwen = { success: false, error: error.message };
        }
    } else {
        console.log('⚠️ Qwen API: No key configured');
        results.direct_api_tests.qwen = { success: false, reason: 'no_key' };
    }
    
    // 3. Claudette Integration Test
    console.log('\n🚀 CLAUDETTE INTEGRATION:');
    console.log('-'.repeat(22));
    
    try {
        const { Claudette } = require('./dist/index.js');
        const claudette = new Claudette();
        
        console.log('Initializing Claudette...');
        await claudette.initialize();
        
        const status = await claudette.getStatus();
        
        console.log('\nBackend Health Status:');
        status.backends.health.forEach(backend => {
            const icon = backend.healthy ? '✅' : '❌';
            console.log(`  ${icon} ${backend.name}: ${backend.healthy ? 'HEALTHY' : 'UNHEALTHY'}`);
            results.claudette_integration[backend.name] = {
                healthy: backend.healthy,
                error: backend.error
            };
        });
        
        // Test actual request
        console.log('\nTesting live request...');
        const testResponse = await claudette.optimize('Quick test: 2+3=?', [], { bypass_cache: true });
        
        console.log(`✅ Request successful via ${testResponse.backend_used}`);
        console.log(`Cost: €${testResponse.cost_eur.toFixed(6)}`);
        console.log(`Response: ${testResponse.content}`);
        
        results.claudette_integration.request_test = {
            success: true,
            backend_used: testResponse.backend_used,
            cost: testResponse.cost_eur,
            latency: testResponse.latency_ms
        };
        
        await claudette.cleanup();
        
    } catch (error) {
        console.log(`❌ Claudette integration failed: ${error.message}`);
        results.claudette_integration.error = error.message;
    }
    
    // 4. Final Assessment
    console.log('\n📊 FINAL ASSESSMENT:');
    console.log('-'.repeat(17));
    
    const workingAPIs = Object.values(results.direct_api_tests).filter(r => r.success).length;
    const configuredKeys = Object.values(results.environment).filter(Boolean).length;
    const healthyBackends = Object.values(results.claudette_integration)
        .filter(r => typeof r === 'object' && r.healthy).length;
    
    console.log(`✅ API Keys Configured: ${configuredKeys}/5`);
    console.log(`✅ Direct API Connections: ${workingAPIs}`);
    console.log(`✅ Healthy Backends in Claudette: ${healthyBackends}`);
    
    const systemScore = Math.round(
        (configuredKeys / 5) * 30 +
        (workingAPIs / 2) * 40 +
        (healthyBackends / 3) * 30
    );
    
    console.log(`\n🎯 SYSTEM READINESS SCORE: ${systemScore}/100`);
    
    if (systemScore >= 80) {
        console.log('🟢 STATUS: PRODUCTION READY');
    } else if (systemScore >= 60) {
        console.log('🟡 STATUS: PARTIALLY FUNCTIONAL');
    } else {
        console.log('🔴 STATUS: REQUIRES ATTENTION');
    }
    
    // Export results
    require('fs').writeFileSync('final-verification.json', JSON.stringify(results, null, 2));
    console.log('\nDetailed results saved to: final-verification.json');
    
    return results;
}

finalVerification().catch(console.error);