#!/usr/bin/env node

/**
 * Recheck Critical Results from Swarm Testing
 * Validates the critical issues identified by the 5-agent swarm
 */

require('dotenv').config();

async function recheckCriticalResults() {
    console.log('🔍 RECHECKING CRITICAL RESULTS FROM SWARM TESTING');
    console.log('================================================');

    const results = {
        timestamp: new Date().toISOString(),
        recheck_results: {
            input_validation: { status: 'unknown', details: [] },
            backend_availability: { status: 'unknown', details: [] },
            performance: { status: 'unknown', details: [] },
            security: { status: 'unknown', details: [] },
            cache_system: { status: 'unknown', details: [] }
        },
        confirmed_critical_issues: [],
        false_positives: [],
        new_findings: []
    };

    // Test 1: Input validation vulnerability recheck
    console.log('\n1. INPUT VALIDATION VULNERABILITY RECHECK:');
    try {
        const { optimize } = require('./dist/index.js');
        
        // Test null input
        console.log('   Testing null input...');
        try {
            await optimize(null);
            results.confirmed_critical_issues.push('Null input accepted without validation');
            console.log('   ❌ CRITICAL CONFIRMED: Null input accepted - vulnerability exists');
        } catch (error) {
            if (error.message.includes('Cannot read properties of null')) {
                results.confirmed_critical_issues.push('System crashes on null input - no validation');
                console.log('   ❌ CRITICAL CONFIRMED: System crashes on null input');
            } else {
                results.false_positives.push('Null input properly handled');
                console.log('   ✅ FALSE POSITIVE: Null input properly rejected:', error.message);
            }
        }
        
        // Test undefined input  
        console.log('   Testing undefined input...');
        try {
            await optimize(undefined);
            results.confirmed_critical_issues.push('Undefined input accepted without validation');
            console.log('   ❌ CRITICAL CONFIRMED: Undefined input accepted');
        } catch (error) {
            if (error.message.includes('Cannot read properties of undefined')) {
                results.confirmed_critical_issues.push('System crashes on undefined input - no validation');
                console.log('   ❌ CRITICAL CONFIRMED: System crashes on undefined input');
            } else {
                results.false_positives.push('Undefined input properly handled');
                console.log('   ✅ FALSE POSITIVE: Undefined input properly rejected:', error.message);
            }
        }

        // Test non-string input
        console.log('   Testing numeric input...');
        try {
            await optimize(12345);
            results.confirmed_critical_issues.push('Non-string input accepted without validation');
            console.log('   ❌ CRITICAL CONFIRMED: Numeric input accepted');
        } catch (error) {
            if (error.message.includes('substring is not a function')) {
                results.confirmed_critical_issues.push('System crashes on non-string input');
                console.log('   ❌ CRITICAL CONFIRMED: System crashes on numeric input');
            } else {
                results.false_positives.push('Numeric input properly handled');
                console.log('   ✅ FALSE POSITIVE: Numeric input properly rejected');
            }
        }
        
        results.recheck_results.input_validation.status = 'critical_confirmed';
    } catch (error) {
        console.log('   Input validation recheck error:', error.message);
        results.recheck_results.input_validation.status = 'error';
        results.recheck_results.input_validation.details.push(error.message);
    }

    // Test 2: Backend availability recheck
    console.log('\n2. BACKEND AVAILABILITY RECHECK:');
    try {
        const { Claudette } = require('./dist/index.js');
        const claudette = new Claudette();
        
        console.log('   Initializing Claudette...');
        await claudette.initialize();
        
        const backends = claudette.router.getBackends();
        console.log('   Available backends:', backends.length);
        
        if (backends.length === 0) {
            results.confirmed_critical_issues.push('No backends available after initialization');
            console.log('   ❌ CRITICAL CONFIRMED: No backends available');
        } else {
            console.log('   ✅ GOOD: Backends are available:');
            backends.forEach(backend => {
                console.log('     - ' + backend.name + ': ' + backend.constructor.name);
            });
            results.false_positives.push('Backend availability issue was false positive');
        }
        
        // Test backend health
        const healthResults = await claudette.router.healthCheckAll();
        const healthyBackends = healthResults.filter(b => b.healthy).length;
        console.log('   Healthy backends:', healthyBackends + '/' + backends.length);
        
        if (healthyBackends === 0) {
            results.confirmed_critical_issues.push('No healthy backends available');
            console.log('   ❌ CRITICAL CONFIRMED: No healthy backends');
        } else {
            console.log('   ✅ GOOD: ' + healthyBackends + ' healthy backends available');
        }
        
        results.recheck_results.backend_availability.status = backends.length > 0 ? 'good' : 'critical_confirmed';
        await claudette.cleanup();
    } catch (error) {
        console.log('   Backend availability recheck error:', error.message);
        results.recheck_results.backend_availability.status = 'error';
        results.recheck_results.backend_availability.details.push(error.message);
    }

    // Test 3: Performance recheck
    console.log('\n3. PERFORMANCE RECHECK:');
    try {
        const { optimize } = require('./dist/index.js');
        const startTime = Date.now();
        
        console.log('   Testing performance with simple query...');
        const response = await optimize('What is 2+2?');
        const latency = Date.now() - startTime;
        
        console.log('   Response received in:', latency + 'ms');
        console.log('   Backend used:', response.backend_used);
        console.log('   Response length:', response.content?.length || 0, 'chars');
        
        if (latency > 5000) {
            results.confirmed_critical_issues.push(`Extremely high latency: ${latency}ms`);
            console.log('   ❌ CRITICAL CONFIRMED: Extremely high latency (' + latency + 'ms)');
        } else if (latency > 2000) {
            results.confirmed_critical_issues.push(`High latency: ${latency}ms`);
            console.log('   ⚠️ WARNING CONFIRMED: High latency (' + latency + 'ms)');
        } else {
            results.false_positives.push('Performance issue was false positive');
            console.log('   ✅ GOOD: Acceptable latency (' + latency + 'ms)');
        }
        
        results.recheck_results.performance.status = latency > 2000 ? 'confirmed' : 'good';
        results.recheck_results.performance.details.push(`Latency: ${latency}ms`);
        
    } catch (error) {
        console.log('   Performance recheck error:', error.message);
        results.recheck_results.performance.status = 'error';
        results.recheck_results.performance.details.push(error.message);
    }

    // Test 4: Cache system recheck
    console.log('\n4. CACHE SYSTEM RECHECK:');
    try {
        const { Claudette } = require('./dist/index.js');
        const claudette = new Claudette();
        await claudette.initialize();
        
        // First request
        console.log('   Making first request...');
        const start1 = Date.now();
        const response1 = await claudette.optimize('Test cache query');
        const time1 = Date.now() - start1;
        
        // Second identical request (should be cached)
        console.log('   Making identical second request...');
        const start2 = Date.now();
        const response2 = await claudette.optimize('Test cache query');
        const time2 = Date.now() - start2;
        
        console.log('   First request:', time1 + 'ms');
        console.log('   Second request:', time2 + 'ms');
        console.log('   Cache hit (response 2):', response2.cache_hit);
        
        if (response2.cache_hit) {
            results.false_positives.push('Cache system is working');
            console.log('   ✅ GOOD: Cache system is working');
        } else {
            results.confirmed_critical_issues.push('Cache system not functioning');
            console.log('   ❌ CRITICAL CONFIRMED: Cache system not functioning');
        }
        
        // Check cache stats
        const status = await claudette.getStatus();
        const cacheStats = status.cache;
        console.log('   Cache hit rate:', (cacheStats.hit_rate * 100).toFixed(1) + '%');
        console.log('   Cache entries:', cacheStats.entries_count);
        
        results.recheck_results.cache_system.status = response2.cache_hit ? 'good' : 'critical_confirmed';
        results.recheck_results.cache_system.details.push(`Hit rate: ${cacheStats.hit_rate * 100}%`);
        
        await claudette.cleanup();
    } catch (error) {
        console.log('   Cache system recheck error:', error.message);
        results.recheck_results.cache_system.status = 'error';
        results.recheck_results.cache_system.details.push(error.message);
    }

    // Test 5: Memory amplification recheck
    console.log('\n5. MEMORY AMPLIFICATION RECHECK:');
    try {
        const { optimize } = require('./dist/index.js');
        
        // Test with large input
        console.log('   Testing with large input (1MB)...');
        const largeInput = 'A'.repeat(1024 * 1024); // 1MB
        
        const memBefore = process.memoryUsage().heapUsed;
        console.log('   Memory before:', Math.round(memBefore / 1024 / 1024) + 'MB');
        
        try {
            await optimize(largeInput);
            
            const memAfter = process.memoryUsage().heapUsed;
            console.log('   Memory after:', Math.round(memAfter / 1024 / 1024) + 'MB');
            
            const amplification = memAfter / memBefore;
            console.log('   Memory amplification:', amplification.toFixed(1) + 'x');
            
            if (amplification > 10) {
                results.confirmed_critical_issues.push(`Memory amplification: ${amplification.toFixed(1)}x`);
                console.log('   ❌ CRITICAL CONFIRMED: High memory amplification');
            } else {
                results.false_positives.push('Memory amplification within acceptable limits');
                console.log('   ✅ GOOD: Acceptable memory usage');
            }
        } catch (error) {
            console.log('   Large input handling error:', error.message);
        }
        
    } catch (error) {
        console.log('   Memory amplification recheck error:', error.message);
    }

    // Summary
    console.log('\n📊 RECHECK SUMMARY:');
    console.log('==================');
    console.log('Critical issues confirmed:', results.confirmed_critical_issues.length);
    console.log('False positives identified:', results.false_positives.length);
    console.log('New findings:', results.new_findings.length);
    
    console.log('\n🔴 CONFIRMED CRITICAL ISSUES:');
    results.confirmed_critical_issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
    });
    
    console.log('\n✅ FALSE POSITIVES IDENTIFIED:');
    results.false_positives.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
    });

    // Save results
    const fs = require('fs');
    fs.writeFileSync('recheck-critical-results.json', JSON.stringify(results, null, 2));
    console.log('\n📋 Results saved to: recheck-critical-results.json');
    
    return results;
}

// Run the recheck
if (require.main === module) {
    recheckCriticalResults().catch(error => {
        console.error('Recheck failed:', error);
        process.exit(1);
    });
}

module.exports = { recheckCriticalResults };