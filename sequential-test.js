#!/usr/bin/env node

// Sequential testing protocol - no hallucinations, only verified measurements
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '.env') });

// Test logging with timestamps
function logTest(phase, test, result, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        phase,
        test,
        result,
        data
    };
    console.log(`[${timestamp}] ${phase}: ${test} = ${result}`);
    if (Object.keys(data).length > 0) {
        console.log(`  Data: ${JSON.stringify(data, null, 2)}`);
    }
    return logEntry;
}

async function sequentialTest() {
    const results = [];
    
    console.log('🔬 SEQUENTIAL TESTING PROTOCOL - VERIFICATION ONLY');
    console.log('='.repeat(60));
    
    // PHASE 1: Environment Verification
    console.log('\nPHASE 1: ENVIRONMENT VERIFICATION');
    console.log('-'.repeat(30));
    
    results.push(logTest('ENV', 'OPENAI_API_KEY exists', 
        !!process.env.OPENAI_API_KEY, 
        { length: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0 }
    ));
    
    results.push(logTest('ENV', 'ANTHROPIC_API_KEY exists', 
        !!process.env.ANTHROPIC_API_KEY
    ));
    
    results.push(logTest('ENV', 'CUSTOM_BACKEND_1_API_URL exists', 
        !!process.env.CUSTOM_BACKEND_1_API_URL,
        { url: process.env.CUSTOM_BACKEND_1_API_URL || 'undefined' }
    ));
    
    // PHASE 2: Module Loading
    console.log('\nPHASE 2: MODULE LOADING');
    console.log('-'.repeat(20));
    
    let claudetteModule, claudetteInstance;
    
    try {
        claudetteModule = require('./dist/index.js');
        results.push(logTest('MODULE', 'Claudette module load', 'SUCCESS'));
    } catch (error) {
        results.push(logTest('MODULE', 'Claudette module load', 'FAILED', 
            { error: error.message }
        ));
        throw error;
    }
    
    try {
        claudetteInstance = new claudetteModule.Claudette();
        results.push(logTest('MODULE', 'Claudette instantiation', 'SUCCESS'));
    } catch (error) {
        results.push(logTest('MODULE', 'Claudette instantiation', 'FAILED', 
            { error: error.message }
        ));
        throw error;
    }
    
    // PHASE 3: Initialization
    console.log('\nPHASE 3: INITIALIZATION');
    console.log('-'.repeat(18));
    
    const initStart = Date.now();
    try {
        await claudetteInstance.initialize();
        const initTime = Date.now() - initStart;
        results.push(logTest('INIT', 'Claudette initialization', 'SUCCESS', 
            { duration_ms: initTime }
        ));
    } catch (error) {
        results.push(logTest('INIT', 'Claudette initialization', 'FAILED', 
            { error: error.message }
        ));
        throw error;
    }
    
    // PHASE 4: Backend Health Assessment
    console.log('\nPHASE 4: BACKEND HEALTH ASSESSMENT');
    console.log('-'.repeat(33));
    
    let systemStatus;
    try {
        systemStatus = await claudetteInstance.getStatus();
        results.push(logTest('HEALTH', 'Status retrieval', 'SUCCESS'));
        
        // Verify each backend individually
        systemStatus.backends.health.forEach(backend => {
            results.push(logTest('HEALTH', `${backend.name} backend health`, 
                backend.healthy ? 'HEALTHY' : 'UNHEALTHY',
                { error: backend.error || 'none' }
            ));
        });
        
        const healthyCount = systemStatus.backends.health.filter(b => b.healthy).length;
        const totalCount = systemStatus.backends.health.length;
        results.push(logTest('HEALTH', 'Overall backend availability', `${healthyCount}/${totalCount}`));
        
    } catch (error) {
        results.push(logTest('HEALTH', 'Status retrieval', 'FAILED', 
            { error: error.message }
        ));
        throw error;
    }
    
    // PHASE 5: Request Testing
    console.log('\nPHASE 5: REQUEST TESTING');
    console.log('-'.repeat(21));
    
    const testPrompt = 'Test prompt: What is 1+1?';
    
    // Test 1: Basic request
    const test1Start = Date.now();
    try {
        const response1 = await claudetteInstance.optimize(testPrompt);
        const test1Duration = Date.now() - test1Start;
        
        results.push(logTest('REQUEST', 'Basic request', 'SUCCESS', {
            backend_used: response1.backend_used,
            duration_ms: test1Duration,
            tokens_input: response1.tokens_input,
            tokens_output: response1.tokens_output,
            cost_eur: response1.cost_eur,
            cache_hit: response1.cache_hit,
            content_length: response1.content.length
        }));
        
        // Verify response structure
        const requiredFields = ['content', 'backend_used', 'tokens_input', 'tokens_output', 'cost_eur', 'cache_hit'];
        requiredFields.forEach(field => {
            results.push(logTest('VERIFY', `Response has ${field}`, 
                response1[field] !== undefined ? 'PRESENT' : 'MISSING',
                { value: response1[field] }
            ));
        });
        
    } catch (error) {
        results.push(logTest('REQUEST', 'Basic request', 'FAILED', 
            { error: error.message }
        ));
    }
    
    // Test 2: Cache test (same prompt)
    const test2Start = Date.now();
    try {
        const response2 = await claudetteInstance.optimize(testPrompt);
        const test2Duration = Date.now() - test2Start;
        
        results.push(logTest('CACHE', 'Cache hit test', response2.cache_hit ? 'HIT' : 'MISS', {
            duration_ms: test2Duration,
            backend_used: response2.backend_used
        }));
        
    } catch (error) {
        results.push(logTest('CACHE', 'Cache hit test', 'FAILED', 
            { error: error.message }
        ));
    }
    
    // Test 3: Different prompt (cache miss)
    const uniquePrompt = `Unique test ${Date.now()}: Calculate 7 * 8`;
    const test3Start = Date.now();
    try {
        const response3 = await claudetteInstance.optimize(uniquePrompt);
        const test3Duration = Date.now() - test3Start;
        
        results.push(logTest('CACHE', 'Cache miss test', response3.cache_hit ? 'HIT' : 'MISS', {
            duration_ms: test3Duration,
            backend_used: response3.backend_used
        }));
        
    } catch (error) {
        results.push(logTest('CACHE', 'Cache miss test', 'FAILED', 
            { error: error.message }
        ));
    }
    
    // PHASE 6: Final System State
    console.log('\nPHASE 6: FINAL SYSTEM STATE');
    console.log('-'.repeat(24));
    
    try {
        const finalStatus = await claudetteInstance.getStatus();
        
        results.push(logTest('FINAL', 'System health', finalStatus.healthy ? 'HEALTHY' : 'UNHEALTHY'));
        results.push(logTest('FINAL', 'Database health', finalStatus.database.healthy ? 'HEALTHY' : 'UNHEALTHY'));
        results.push(logTest('FINAL', 'Cache hit rate', 
            `${((finalStatus.cache.hit_rate || 0) * 100).toFixed(1)}%`,
            { 
                total_requests: finalStatus.cache.total_requests || 0,
                cache_hits: finalStatus.cache.cache_hits || 0 
            }
        ));
        
    } catch (error) {
        results.push(logTest('FINAL', 'Final status check', 'FAILED', 
            { error: error.message }
        ));
    }
    
    // PHASE 7: Cleanup
    console.log('\nPHASE 7: CLEANUP');
    console.log('-'.repeat(14));
    
    try {
        await claudetteInstance.cleanup();
        results.push(logTest('CLEANUP', 'Resource cleanup', 'SUCCESS'));
    } catch (error) {
        results.push(logTest('CLEANUP', 'Resource cleanup', 'FAILED', 
            { error: error.message }
        ));
    }
    
    // ASSESSMENT & SCORING
    console.log('\nASSESSMENT & SCORING');
    console.log('='.repeat(20));
    
    const assessment = {
        total_tests: results.length,
        successful_tests: results.filter(r => !['FAILED', 'UNHEALTHY', 'MISSING'].includes(r.result)).length,
        failed_tests: results.filter(r => ['FAILED'].includes(r.result)).length,
        unhealthy_components: results.filter(r => r.result === 'UNHEALTHY').length,
        missing_components: results.filter(r => r.result === 'MISSING').length
    };
    
    const success_rate = (assessment.successful_tests / assessment.total_tests) * 100;
    
    console.log(`Total Tests: ${assessment.total_tests}`);
    console.log(`Successful: ${assessment.successful_tests}`);
    console.log(`Failed: ${assessment.failed_tests}`);
    console.log(`Unhealthy: ${assessment.unhealthy_components}`);
    console.log(`Missing: ${assessment.missing_components}`);
    console.log(`Success Rate: ${success_rate.toFixed(1)}%`);
    
    // Score calculation (no hallucination - only based on measured results)
    let score = 0;
    
    // Environment (20 points max)
    if (results.find(r => r.test === 'OPENAI_API_KEY exists' && r.result === true)) score += 15;
    if (results.find(r => r.test === 'ANTHROPIC_API_KEY exists' && r.result === true)) score += 5;
    
    // Module Loading (10 points max)
    if (results.find(r => r.test === 'Claudette module load' && r.result === 'SUCCESS')) score += 5;
    if (results.find(r => r.test === 'Claudette instantiation' && r.result === 'SUCCESS')) score += 5;
    
    // Initialization (15 points max)
    if (results.find(r => r.test === 'Claudette initialization' && r.result === 'SUCCESS')) score += 15;
    
    // Backend Health (25 points max)
    const healthyBackends = results.filter(r => r.test.includes('backend health') && r.result === 'HEALTHY').length;
    score += healthyBackends * 12.5; // 12.5 points per healthy backend (max 2 backends = 25 points)
    
    // Request Functionality (20 points max)
    if (results.find(r => r.test === 'Basic request' && r.result === 'SUCCESS')) score += 20;
    
    // Cache Functionality (10 points max)
    const cacheHit = results.find(r => r.test === 'Cache hit test' && r.result === 'HIT');
    const cacheMiss = results.find(r => r.test === 'Cache miss test' && r.result === 'MISS');
    if (cacheHit) score += 5;
    if (cacheMiss) score += 5;
    
    console.log(`\nFINAL SCORE: ${score.toFixed(0)}/100`);
    
    // Write results to file for verification
    const resultsFile = {
        timestamp: new Date().toISOString(),
        assessment,
        score: score,
        success_rate: success_rate,
        detailed_results: results
    };
    
    fs.writeFileSync('test-results.json', JSON.stringify(resultsFile, null, 2));
    console.log('\nDetailed results written to: test-results.json');
    
    return { score, assessment, results };
}

sequentialTest().catch(console.error);