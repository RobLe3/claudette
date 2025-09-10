#!/usr/bin/env node

/**
 * Quick Claudette Backend Test - Focused Test Suite
 * Tests core functionality quickly with timeouts
 */

const fs = require('fs');

// Load environment
require('dotenv').config();

// Test results
const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    summary: { total: 0, passed: 0, failed: 0 },
    findings: []
};

function logTest(name, passed, details, error = null) {
    results.tests.push({
        name,
        passed,
        details,
        error: error ? error.toString() : null,
        timestamp: new Date().toISOString()
    });
    
    results.summary.total++;
    if (passed) {
        results.summary.passed++;
        console.log(`✅ ${name}`);
    } else {
        results.summary.failed++;
        console.log(`❌ ${name}: ${error ? error.message : 'Failed'}`);
    }
    
    if (details && Object.keys(details).length > 0) {
        console.log(`   Details: ${JSON.stringify(details)}`);
    }
}

async function runQuickTests() {
    console.log('\n🔬 Claudette Quick Backend Test');
    console.log('================================');
    
    try {
        // Test 1: Module Import
        console.log('\n1. Testing Module Import...');
        const { Claudette } = require('./dist/index.js');
        logTest('Module Import', true, { claudette_class: typeof Claudette });
        
        // Test 2: Instance Creation
        console.log('\n2. Testing Instance Creation...');
        const claudette = new Claudette();
        logTest('Instance Creation', !!claudette, {
            has_config: !!claudette.config,
            has_router: !!claudette.router,
            has_cache: !!claudette.cache
        });
        
        // Test 3: Backend Initialization
        console.log('\n3. Testing Backend Initialization...');
        const start = Date.now();
        await claudette.initialize();
        const initTime = Date.now() - start;
        
        const backends = claudette.router.getBackends();
        logTest('Backend Initialization', claudette.initialized && backends.length > 0, {
            initialized: claudette.initialized,
            backend_count: backends.length,
            backends: backends.map(b => ({ name: b.name, enabled: b.config?.enabled })),
            init_time_ms: initTime
        });
        
        // Test 4: Configuration Test
        console.log('\n4. Testing Configuration...');
        const config = claudette.getConfig();
        logTest('Configuration Loading', !!config.backends, {
            has_openai: !!config.backends?.openai,
            has_ollama: !!config.backends?.ollama,
            caching_enabled: config.features?.caching,
            openai_key_available: !!process.env.OPENAI_API_KEY,
            flexcon_key_available: !!process.env.FLEXCON_API_KEY
        });
        
        // Test 5: Simple Query (with timeout)
        console.log('\n5. Testing Simple Query with Timeout...');
        const queryPromise = claudette.optimize("Say hello in exactly 5 words.");
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Query timeout after 30s')), 30000);
        });
        
        try {
            const queryStart = Date.now();
            const response = await Promise.race([queryPromise, timeoutPromise]);
            const queryTime = Date.now() - queryStart;
            
            logTest('Simple Query', !!response?.content, {
                response_length: response?.content?.length,
                backend_used: response?.backend_used,
                tokens_input: response?.tokens_input,
                tokens_output: response?.tokens_output,
                cost_eur: response?.cost_eur,
                query_time_ms: queryTime,
                response_preview: response?.content?.substring(0, 50)
            });
            
            // Verify response content makes sense
            const hasValidResponse = response?.content && response.content.length > 0;
            logTest('Response Validation', hasValidResponse, {
                has_content: !!response?.content,
                content_length: response?.content?.length || 0,
                seems_valid: hasValidResponse
            });
            
        } catch (queryError) {
            logTest('Simple Query', false, {}, queryError);
        }
        
        // Test 6: Backend Health Check
        console.log('\n6. Testing Backend Health...');
        try {
            const healthResults = await claudette.router.healthCheckAll();
            const healthyCount = healthResults.filter(h => h.healthy).length;
            
            logTest('Backend Health Check', healthResults.length > 0, {
                total_backends: healthResults.length,
                healthy_backends: healthyCount,
                backend_health: healthResults
            });
        } catch (healthError) {
            logTest('Backend Health Check', false, {}, healthError);
        }
        
        // Test 7: System Status
        console.log('\n7. Testing System Status...');
        try {
            const status = await claudette.getStatus();
            logTest('System Status', !!status, {
                system_healthy: status?.healthy,
                database_healthy: status?.database?.healthy,
                version: status?.version,
                backend_count: status?.backends?.health?.length
            });
        } catch (statusError) {
            logTest('System Status', false, {}, statusError);
        }
        
        // Test 8: Error Handling
        console.log('\n8. Testing Error Handling...');
        try {
            await claudette.optimize("Test", [], { backend: 'nonexistent' });
            logTest('Error Handling', false, { should_have_errored: true });
        } catch (expectedError) {
            logTest('Error Handling', true, {
                error_caught: true,
                error_type: expectedError.constructor.name,
                error_message: expectedError.message
            });
        }
        
        // Cleanup
        await claudette.cleanup();
        
    } catch (error) {
        logTest('Test Suite Execution', false, {}, error);
        console.error('Critical error:', error);
    }
    
    // Generate Summary
    console.log('\n📊 Test Summary');
    console.log('===============');
    console.log(`Total Tests: ${results.summary.total}`);
    console.log(`Passed: ${results.summary.passed}`);
    console.log(`Failed: ${results.summary.failed}`);
    console.log(`Success Rate: ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%`);
    
    // Key Findings
    console.log('\n🔍 Key Findings:');
    
    // Backend functionality
    const backendTest = results.tests.find(t => t.name === 'Backend Initialization');
    if (backendTest && backendTest.passed) {
        console.log(`✅ Backend system working - ${backendTest.details.backend_count} backends registered`);
        results.findings.push('Backend initialization successful');
    } else {
        console.log('❌ Backend system issues detected');
        results.findings.push('Backend initialization failed');
    }
    
    // Query functionality  
    const queryTest = results.tests.find(t => t.name === 'Simple Query');
    if (queryTest && queryTest.passed) {
        console.log(`✅ Query processing working - ${queryTest.details.backend_used} backend responded`);
        results.findings.push(`Query processing functional using ${queryTest.details.backend_used}`);
    } else {
        console.log('❌ Query processing issues detected');
        results.findings.push('Query processing failed');
    }
    
    // Cost tracking
    const costTest = results.tests.find(t => t.name === 'Simple Query');
    if (costTest && costTest.details?.cost_eur !== undefined) {
        console.log(`💰 Cost tracking: ${costTest.details.cost_eur} EUR`);
        results.findings.push(`Cost tracking implemented (${costTest.details.cost_eur} EUR)`);
    } else {
        console.log('⚠️  Cost tracking not functioning');
        results.findings.push('Cost tracking issues detected');
    }
    
    // Configuration
    const configTest = results.tests.find(t => t.name === 'Configuration Loading');
    if (configTest && configTest.passed) {
        console.log('✅ Configuration system working');
        results.findings.push('Configuration system functional');
    }
    
    // Error handling
    const errorTest = results.tests.find(t => t.name === 'Error Handling');
    if (errorTest && errorTest.passed) {
        console.log('✅ Error handling working');
        results.findings.push('Error handling functional');
    } else {
        console.log('⚠️  Error handling issues');
        results.findings.push('Error handling needs improvement');
    }
    
    // Save report
    const reportPath = './quick-test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}`);
    
    return results;
}

if (require.main === module) {
    runQuickTests().catch(console.error);
}

module.exports = { runQuickTests };