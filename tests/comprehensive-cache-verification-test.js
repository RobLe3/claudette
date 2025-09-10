#!/usr/bin/env node

/**
 * COMPREHENSIVE CACHE SYSTEM VERIFICATION TEST SUITE
 * 
 * This test suite thoroughly validates the cache system fixes implemented in Claudette.
 * It tests both memory and persistent cache layers, performance, concurrency, and
 * integration with the actual Claudette optimize() function.
 * 
 * Author: Cache System Verification Swarm Agent
 * Date: 2025-09-08
 * Version: 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const crypto = require('crypto');

// Initialize test environment
const testResults = {
    summary: {
        testRunId: crypto.randomUUID(),
        startTime: new Date().toISOString(),
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        successRate: 0,
        duration: 0
    },
    testCategories: {
        basicOperations: [],
        memoryCache: [],
        persistentCache: [],
        performance: [],
        concurrency: [],
        integration: [],
        statistics: []
    },
    performanceMetrics: [],
    cacheAnalysis: {
        hitRateImprovement: 0,
        averageResponseTime: 0,
        memoryEfficiency: 0,
        persistenceReliability: 0
    },
    recommendations: []
};

let testStartTime;
let cacheSystem;
let databaseManager;

/**
 * Setup test environment and dependencies
 */
async function setupTestEnvironment() {
    console.log('🔧 Setting up comprehensive cache verification test environment...');
    
    try {
        // Import compiled JavaScript modules
        const { CacheSystem } = require('./dist/cache/index.js');
        const { DatabaseManager } = require('./dist/database/index.js');
        
        // Initialize database
        databaseManager = new DatabaseManager();
        
        // Initialize cache system with test configuration
        const cacheConfig = {
            ttl: 300, // 5 minutes
            maxSize: 100,
            enablePersistent: true,
            enableMemory: true,
            compressionEnabled: false
        };
        
        cacheSystem = new CacheSystem(databaseManager, cacheConfig);
        
        console.log('✅ Test environment setup complete');
        return true;
        
    } catch (error) {
        console.error('❌ Failed to setup test environment:', error.message);
        return false;
    }
}

/**
 * Test basic cache operations (set/get)
 */
async function testBasicCacheOperations() {
    console.log('\n📋 Testing basic cache operations...');
    
    const tests = [
        {
            name: 'Cache Set Operation',
            test: async () => {
                const request = {
                    prompt: 'Test prompt for cache verification',
                    files: [],
                    options: { temperature: 0.7 }
                };
                
                const response = {
                    content: 'This is a test response for cache verification',
                    usage: { prompt_tokens: 10, completion_tokens: 20 },
                    model: 'claude-3-sonnet'
                };
                
                const startTime = performance.now();
                await cacheSystem.set(request, response);
                const duration = performance.now() - startTime;
                
                return {
                    success: true,
                    duration,
                    details: {
                        cacheSize: cacheSystem.size(),
                        memoryUsage: cacheSystem.getStats().memory_usage
                    }
                };
            }
        },
        {
            name: 'Cache Get Hit Operation',
            test: async () => {
                const request = {
                    prompt: 'Test prompt for cache verification',
                    files: [],
                    options: { temperature: 0.7 }
                };
                
                const startTime = performance.now();
                const cachedResponse = await cacheSystem.get(request);
                const duration = performance.now() - startTime;
                
                const success = cachedResponse !== null && cachedResponse.cache_hit === true;
                
                return {
                    success,
                    duration,
                    details: {
                        cacheHit: cachedResponse?.cache_hit || false,
                        responseContent: cachedResponse?.content?.substring(0, 50) + '...'
                    }
                };
            }
        },
        {
            name: 'Cache Get Miss Operation',
            test: async () => {
                const request = {
                    prompt: 'Non-existent prompt for cache miss test',
                    files: [],
                    options: { temperature: 0.5 }
                };
                
                const startTime = performance.now();
                const cachedResponse = await cacheSystem.get(request);
                const duration = performance.now() - startTime;
                
                const success = cachedResponse === null;
                
                return {
                    success,
                    duration,
                    details: {
                        cacheMiss: cachedResponse === null,
                        stats: cacheSystem.getStats()
                    }
                };
            }
        }
    ];
    
    for (const testCase of tests) {
        try {
            const result = await testCase.test();
            testResults.testCategories.basicOperations.push({
                name: testCase.name,
                passed: result.success,
                duration: result.duration,
                details: result.details,
                timestamp: new Date().toISOString()
            });
            
            if (result.success) {
                testResults.summary.passedTests++;
                console.log(`  ✅ ${testCase.name} - ${result.duration.toFixed(2)}ms`);
            } else {
                testResults.summary.failedTests++;
                console.log(`  ❌ ${testCase.name} - FAILED`);
            }
            
            testResults.summary.totalTests++;
            
        } catch (error) {
            console.log(`  ❌ ${testCase.name} - ERROR: ${error.message}`);
            testResults.testCategories.basicOperations.push({
                name: testCase.name,
                passed: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            testResults.summary.failedTests++;
            testResults.summary.totalTests++;
        }
    }
}

/**
 * Test memory cache layer specifically
 */
async function testMemoryCacheLayer() {
    console.log('\n🧠 Testing memory cache layer...');
    
    const tests = [
        {
            name: 'Memory Cache Isolation Test',
            test: async () => {
                // Clear cache and test memory-only operations
                await cacheSystem.clear();
                
                const requests = [];
                const responses = [];
                
                // Create multiple unique requests
                for (let i = 0; i < 5; i++) {
                    requests.push({
                        prompt: `Memory cache test prompt ${i}`,
                        files: [],
                        options: { temperature: 0.1 + i * 0.1 }
                    });
                    responses.push({
                        content: `Memory cache response ${i}`,
                        usage: { prompt_tokens: 10 + i, completion_tokens: 15 + i },
                        model: 'claude-3-sonnet'
                    });
                }
                
                // Store in cache
                const setStartTime = performance.now();
                for (let i = 0; i < 5; i++) {
                    await cacheSystem.set(requests[i], responses[i]);
                }
                const setDuration = performance.now() - setStartTime;
                
                // Retrieve from cache
                const getStartTime = performance.now();
                let hits = 0;
                for (let i = 0; i < 5; i++) {
                    const cached = await cacheSystem.get(requests[i]);
                    if (cached && cached.cache_hit) hits++;
                }
                const getDuration = performance.now() - getStartTime;
                
                const stats = cacheSystem.getStats();
                
                return {
                    success: hits === 5,
                    duration: setDuration + getDuration,
                    details: {
                        entriesStored: 5,
                        cacheHits: hits,
                        hitRate: hits / 5,
                        setDuration,
                        getDuration,
                        memoryUsage: stats.memory_usage,
                        cacheSize: cacheSystem.size()
                    }
                };
            }
        },
        {
            name: 'Memory Cache Eviction Test',
            test: async () => {
                await cacheSystem.clear();
                
                // Fill cache beyond capacity
                const maxSize = 100;
                const overflowSize = 120;
                
                for (let i = 0; i < overflowSize; i++) {
                    const request = {
                        prompt: `Eviction test prompt ${i}`,
                        files: [],
                        options: { temperature: Math.random() }
                    };
                    const response = {
                        content: `Eviction test response ${i}`,
                        usage: { prompt_tokens: 10, completion_tokens: 15 }
                    };
                    await cacheSystem.set(request, response);
                }
                
                const finalSize = cacheSystem.size();
                const stats = cacheSystem.getStats();
                
                return {
                    success: finalSize <= maxSize,
                    duration: 0,
                    details: {
                        entriesAdded: overflowSize,
                        finalCacheSize: finalSize,
                        evictionOccurred: finalSize < overflowSize,
                        memoryUsage: stats.memory_usage
                    }
                };
            }
        }
    ];
    
    for (const testCase of tests) {
        try {
            const result = await testCase.test();
            testResults.testCategories.memoryCache.push({
                name: testCase.name,
                passed: result.success,
                duration: result.duration,
                details: result.details,
                timestamp: new Date().toISOString()
            });
            
            if (result.success) {
                testResults.summary.passedTests++;
                console.log(`  ✅ ${testCase.name} - ${result.duration.toFixed(2)}ms`);
            } else {
                testResults.summary.failedTests++;
                console.log(`  ❌ ${testCase.name} - FAILED`);
            }
            
            testResults.summary.totalTests++;
            
        } catch (error) {
            console.log(`  ❌ ${testCase.name} - ERROR: ${error.message}`);
            testResults.testCategories.memoryCache.push({
                name: testCase.name,
                passed: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            testResults.summary.failedTests++;
            testResults.summary.totalTests++;
        }
    }
}

/**
 * Test persistent cache integration with database
 */
async function testPersistentCacheIntegration() {
    console.log('\n💾 Testing persistent cache integration...');
    
    const tests = [
        {
            name: 'Persistent Storage Test',
            test: async () => {
                await cacheSystem.clear();
                
                const request = {
                    prompt: 'Persistent cache test prompt',
                    files: [],
                    options: { temperature: 0.8 }
                };
                const response = {
                    content: 'This response should be stored persistently',
                    usage: { prompt_tokens: 15, completion_tokens: 25 },
                    model: 'claude-3-sonnet'
                };
                
                // Store in cache
                await cacheSystem.set(request, response);
                
                // Clear memory cache to test persistence
                cacheSystem.memoryCache.clear();
                
                // Try to retrieve from persistent storage
                const startTime = performance.now();
                const cached = await cacheSystem.get(request);
                const duration = performance.now() - startTime;
                
                const success = cached !== null && cached.content === response.content;
                
                return {
                    success,
                    duration,
                    details: {
                        persistentHit: cached !== null,
                        contentMatch: cached?.content === response.content,
                        promotedToMemory: cacheSystem.size() > 0
                    }
                };
            }
        },
        {
            name: 'Database Integration Test',
            test: async () => {
                // Test direct database cache operations
                const testKey = 'database_integration_test_key';
                const testData = {
                    cache_key: testKey,
                    prompt_hash: crypto.createHash('md5').update('test').digest('hex'),
                    response: {
                        content: 'Database integration test response',
                        usage: { prompt_tokens: 10, completion_tokens: 20 }
                    },
                    created_at: Date.now(),
                    expires_at: Date.now() + 300000,
                    size_bytes: 100
                };
                
                try {
                    // Store directly in database
                    databaseManager.setCacheEntry(testData);
                    
                    // Retrieve from database
                    const retrieved = databaseManager.getCacheEntry(testKey);
                    
                    const success = retrieved !== null && retrieved.response.content === testData.response.content;
                    
                    return {
                        success,
                        duration: 0,
                        details: {
                            dataStored: true,
                            dataRetrieved: retrieved !== null,
                            contentMatch: retrieved?.response.content === testData.response.content
                        }
                    };
                } catch (error) {
                    return {
                        success: false,
                        duration: 0,
                        details: {
                            error: error.message
                        }
                    };
                }
            }
        }
    ];
    
    for (const testCase of tests) {
        try {
            const result = await testCase.test();
            testResults.testCategories.persistentCache.push({
                name: testCase.name,
                passed: result.success,
                duration: result.duration,
                details: result.details,
                timestamp: new Date().toISOString()
            });
            
            if (result.success) {
                testResults.summary.passedTests++;
                console.log(`  ✅ ${testCase.name} - ${result.duration.toFixed(2)}ms`);
            } else {
                testResults.summary.failedTests++;
                console.log(`  ❌ ${testCase.name} - FAILED`);
            }
            
            testResults.summary.totalTests++;
            
        } catch (error) {
            console.log(`  ❌ ${testCase.name} - ERROR: ${error.message}`);
            testResults.testCategories.persistentCache.push({
                name: testCase.name,
                passed: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            testResults.summary.failedTests++;
            testResults.summary.totalTests++;
        }
    }
}

/**
 * Test cache performance and benchmarking
 */
async function testCachePerformance() {
    console.log('\n⚡ Testing cache performance...');
    
    const tests = [
        {
            name: 'Sequential Access Performance',
            test: async () => {
                await cacheSystem.clear();
                
                const numOperations = 100;
                const requests = [];
                const responses = [];
                
                // Prepare test data
                for (let i = 0; i < numOperations; i++) {
                    requests.push({
                        prompt: `Performance test prompt ${i}`,
                        files: [],
                        options: { temperature: 0.5 }
                    });
                    responses.push({
                        content: `Performance test response ${i}`,
                        usage: { prompt_tokens: 10, completion_tokens: 15 }
                    });
                }
                
                // Measure set operations
                const setStartTime = performance.now();
                for (let i = 0; i < numOperations; i++) {
                    await cacheSystem.set(requests[i], responses[i]);
                }
                const setDuration = performance.now() - setStartTime;
                
                // Measure get operations
                const getStartTime = performance.now();
                let hits = 0;
                for (let i = 0; i < numOperations; i++) {
                    const cached = await cacheSystem.get(requests[i]);
                    if (cached && cached.cache_hit) hits++;
                }
                const getDuration = performance.now() - getStartTime;
                
                const totalDuration = setDuration + getDuration;
                const opsPerSecond = (numOperations * 2) / (totalDuration / 1000);
                
                return {
                    success: hits === numOperations,
                    duration: totalDuration,
                    details: {
                        numOperations,
                        setDuration,
                        getDuration,
                        totalDuration,
                        cacheHits: hits,
                        hitRate: hits / numOperations,
                        opsPerSecond,
                        avgSetTime: setDuration / numOperations,
                        avgGetTime: getDuration / numOperations
                    }
                };
            }
        },
        {
            name: 'Large Entry Performance',
            test: async () => {
                await cacheSystem.clear();
                
                // Test with different payload sizes
                const sizes = [1, 10, 100, 500]; // KB
                const results = [];
                
                for (const sizeKB of sizes) {
                    const largeContent = 'x'.repeat(sizeKB * 1024);
                    const request = {
                        prompt: `Large entry test ${sizeKB}KB`,
                        files: [],
                        options: { temperature: 0.5 }
                    };
                    const response = {
                        content: largeContent,
                        usage: { prompt_tokens: 100, completion_tokens: 500 }
                    };
                    
                    // Measure set operation
                    const setStartTime = performance.now();
                    await cacheSystem.set(request, response);
                    const setDuration = performance.now() - setStartTime;
                    
                    // Measure get operation
                    const getStartTime = performance.now();
                    const cached = await cacheSystem.get(request);
                    const getDuration = performance.now() - getStartTime;
                    
                    results.push({
                        sizeKB,
                        setDuration,
                        getDuration,
                        success: cached !== null && cached.cache_hit
                    });
                }
                
                const allSuccessful = results.every(r => r.success);
                const totalDuration = results.reduce((sum, r) => sum + r.setDuration + r.getDuration, 0);
                
                return {
                    success: allSuccessful,
                    duration: totalDuration,
                    details: {
                        results,
                        allSuccessful,
                        sizesTestedKB: sizes
                    }
                };
            }
        }
    ];
    
    for (const testCase of tests) {
        try {
            const result = await testCase.test();
            testResults.testCategories.performance.push({
                name: testCase.name,
                passed: result.success,
                duration: result.duration,
                details: result.details,
                timestamp: new Date().toISOString()
            });
            
            if (result.success) {
                testResults.summary.passedTests++;
                console.log(`  ✅ ${testCase.name} - ${result.duration.toFixed(2)}ms`);
            } else {
                testResults.summary.failedTests++;
                console.log(`  ❌ ${testCase.name} - FAILED`);
            }
            
            testResults.summary.totalTests++;
            
        } catch (error) {
            console.log(`  ❌ ${testCase.name} - ERROR: ${error.message}`);
            testResults.testCategories.performance.push({
                name: testCase.name,
                passed: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            testResults.summary.failedTests++;
            testResults.summary.totalTests++;
        }
    }
}

/**
 * Test concurrent cache access and thread safety
 */
async function testConcurrentCacheAccess() {
    console.log('\n🔄 Testing concurrent cache access...');
    
    const tests = [
        {
            name: 'Concurrent Set Operations',
            test: async () => {
                await cacheSystem.clear();
                
                const numConcurrent = 20;
                const promises = [];
                
                const startTime = performance.now();
                
                // Create concurrent set operations
                for (let i = 0; i < numConcurrent; i++) {
                    const request = {
                        prompt: `Concurrent set test ${i}`,
                        files: [],
                        options: { temperature: Math.random() }
                    };
                    const response = {
                        content: `Concurrent response ${i}`,
                        usage: { prompt_tokens: 10, completion_tokens: 15 }
                    };
                    
                    promises.push(cacheSystem.set(request, response));
                }
                
                // Wait for all operations to complete
                await Promise.all(promises);
                const duration = performance.now() - startTime;
                
                const finalSize = cacheSystem.size();
                const stats = cacheSystem.getStats();
                
                return {
                    success: finalSize === numConcurrent,
                    duration,
                    details: {
                        concurrentOperations: numConcurrent,
                        finalCacheSize: finalSize,
                        allStored: finalSize === numConcurrent,
                        stats
                    }
                };
            }
        },
        {
            name: 'Concurrent Get Operations',
            test: async () => {
                // Use existing cache entries from previous test
                const numConcurrent = 20;
                const promises = [];
                
                const startTime = performance.now();
                
                // Create concurrent get operations
                for (let i = 0; i < numConcurrent; i++) {
                    const request = {
                        prompt: `Concurrent set test ${i}`,
                        files: [],
                        options: { temperature: Math.random() }
                    };
                    
                    promises.push(cacheSystem.get(request));
                }
                
                // Wait for all operations to complete
                const results = await Promise.all(promises);
                const duration = performance.now() - startTime;
                
                const hits = results.filter(r => r && r.cache_hit).length;
                const hitRate = hits / numConcurrent;
                
                return {
                    success: hits > 0, // At least some hits expected
                    duration,
                    details: {
                        concurrentOperations: numConcurrent,
                        cacheHits: hits,
                        hitRate,
                        allCompleted: results.length === numConcurrent
                    }
                };
            }
        }
    ];
    
    for (const testCase of tests) {
        try {
            const result = await testCase.test();
            testResults.testCategories.concurrency.push({
                name: testCase.name,
                passed: result.success,
                duration: result.duration,
                details: result.details,
                timestamp: new Date().toISOString()
            });
            
            if (result.success) {
                testResults.summary.passedTests++;
                console.log(`  ✅ ${testCase.name} - ${result.duration.toFixed(2)}ms`);
            } else {
                testResults.summary.failedTests++;
                console.log(`  ❌ ${testCase.name} - FAILED`);
            }
            
            testResults.summary.totalTests++;
            
        } catch (error) {
            console.log(`  ❌ ${testCase.name} - ERROR: ${error.message}`);
            testResults.testCategories.concurrency.push({
                name: testCase.name,
                passed: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            testResults.summary.failedTests++;
            testResults.summary.totalTests++;
        }
    }
}

/**
 * Test real Claudette optimize() function with cache integration
 */
async function testClaudetteIntegration() {
    console.log('\n🤖 Testing Claudette optimize() function cache integration...');
    
    try {
        // Import Claudette's optimize function
        const { optimize } = require('./dist/index.js');
        
        const tests = [
            {
                name: 'Claudette Optimize Cache Integration',
                test: async () => {
                    const testPrompt = 'Explain the concept of caching in simple terms';
                    
                    // Clear cache and make first request
                    await cacheSystem.clear();
                    
                    const startTime1 = performance.now();
                    const response1 = await optimize({
                        prompt: testPrompt,
                        options: { 
                            temperature: 0.7,
                            max_tokens: 100
                        }
                    });
                    const duration1 = performance.now() - startTime1;
                    
                    // Make identical request (should hit cache)
                    const startTime2 = performance.now();
                    const response2 = await optimize({
                        prompt: testPrompt,
                        options: { 
                            temperature: 0.7,
                            max_tokens: 100
                        }
                    });
                    const duration2 = performance.now() - startTime2;
                    
                    const stats = cacheSystem.getStats();
                    
                    // Cache hit should be faster than initial request
                    const speedImprovement = duration1 / duration2;
                    const cacheWorking = response2.cache_hit === true;
                    
                    return {
                        success: cacheWorking && speedImprovement > 2,
                        duration: duration1 + duration2,
                        details: {
                            firstRequestDuration: duration1,
                            secondRequestDuration: duration2,
                            speedImprovement,
                            cacheHit: response2.cache_hit,
                            responseMatches: response1.content === response2.content,
                            cacheStats: stats
                        }
                    };
                }
            }
        ];
        
        for (const testCase of tests) {
            try {
                const result = await testCase.test();
                testResults.testCategories.integration.push({
                    name: testCase.name,
                    passed: result.success,
                    duration: result.duration,
                    details: result.details,
                    timestamp: new Date().toISOString()
                });
                
                if (result.success) {
                    testResults.summary.passedTests++;
                    console.log(`  ✅ ${testCase.name} - ${result.duration.toFixed(2)}ms`);
                } else {
                    testResults.summary.failedTests++;
                    console.log(`  ❌ ${testCase.name} - FAILED`);
                }
                
                testResults.summary.totalTests++;
                
            } catch (error) {
                console.log(`  ❌ ${testCase.name} - ERROR: ${error.message}`);
                testResults.testCategories.integration.push({
                    name: testCase.name,
                    passed: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
                testResults.summary.failedTests++;
                testResults.summary.totalTests++;
            }
        }
    } catch (error) {
        console.log('  ❌ Could not test Claudette integration:', error.message);
        testResults.testCategories.integration.push({
            name: 'Claudette Integration Test',
            passed: false,
            error: `Failed to import Claudette: ${error.message}`,
            timestamp: new Date().toISOString()
        });
        testResults.summary.failedTests++;
        testResults.summary.totalTests++;
    }
}

/**
 * Validate cache statistics accuracy
 */
async function validateCacheStatistics() {
    console.log('\n📊 Validating cache statistics accuracy...');
    
    const tests = [
        {
            name: 'Statistics Accuracy Test',
            test: async () => {
                await cacheSystem.clear();
                
                // Perform known operations and track manually
                let expectedHits = 0;
                let expectedMisses = 0;
                let expectedRequests = 0;
                
                // Test 1: Cache miss
                const request1 = { prompt: 'Stats test 1', files: [], options: {} };
                const result1 = await cacheSystem.get(request1);
                expectedMisses++;
                expectedRequests++;
                
                // Test 2: Cache set
                const response1 = { content: 'Stats response 1', usage: {} };
                await cacheSystem.set(request1, response1);
                
                // Test 3: Cache hit
                const result2 = await cacheSystem.get(request1);
                expectedHits++;
                expectedRequests++;
                
                // Test 4: Another miss
                const request2 = { prompt: 'Stats test 2', files: [], options: {} };
                const result3 = await cacheSystem.get(request2);
                expectedMisses++;
                expectedRequests++;
                
                const stats = cacheSystem.getStats();
                const expectedHitRate = expectedHits / expectedRequests;
                
                const statsAccurate = 
                    stats.cache_hits === expectedHits &&
                    stats.cache_misses === expectedMisses &&
                    stats.total_requests === expectedRequests &&
                    Math.abs(stats.hit_rate - expectedHitRate) < 0.001;
                
                return {
                    success: statsAccurate,
                    duration: 0,
                    details: {
                        expected: {
                            hits: expectedHits,
                            misses: expectedMisses,
                            requests: expectedRequests,
                            hitRate: expectedHitRate
                        },
                        actual: stats,
                        accurate: statsAccurate
                    }
                };
            }
        }
    ];
    
    for (const testCase of tests) {
        try {
            const result = await testCase.test();
            testResults.testCategories.statistics.push({
                name: testCase.name,
                passed: result.success,
                duration: result.duration,
                details: result.details,
                timestamp: new Date().toISOString()
            });
            
            if (result.success) {
                testResults.summary.passedTests++;
                console.log(`  ✅ ${testCase.name} - ${result.duration.toFixed(2)}ms`);
            } else {
                testResults.summary.failedTests++;
                console.log(`  ❌ ${testCase.name} - FAILED`);
            }
            
            testResults.summary.totalTests++;
            
        } catch (error) {
            console.log(`  ❌ ${testCase.name} - ERROR: ${error.message}`);
            testResults.testCategories.statistics.push({
                name: testCase.name,
                passed: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            testResults.summary.failedTests++;
            testResults.summary.totalTests++;
        }
    }
}

/**
 * Generate cache analysis and recommendations
 */
function generateCacheAnalysis() {
    console.log('\n📈 Generating cache analysis and recommendations...');
    
    const finalStats = cacheSystem.getStats();
    
    // Calculate cache effectiveness
    testResults.cacheAnalysis = {
        hitRateImprovement: finalStats.hit_rate * 100,
        averageResponseTime: testResults.testCategories.performance.reduce((sum, test) => 
            sum + (test.duration || 0), 0) / testResults.testCategories.performance.length || 0,
        memoryEfficiency: finalStats.memory_usage / (1024 * 1024), // MB
        persistenceReliability: testResults.testCategories.persistentCache.filter(t => t.passed).length /
                                Math.max(testResults.testCategories.persistentCache.length, 1) * 100
    };
    
    // Generate recommendations
    testResults.recommendations = [];
    
    if (finalStats.hit_rate < 0.7) {
        testResults.recommendations.push({
            category: 'Performance',
            priority: 'high',
            message: `Cache hit rate is ${(finalStats.hit_rate * 100).toFixed(1)}%. Consider increasing TTL or cache size.`
        });
    } else {
        testResults.recommendations.push({
            category: 'Performance',
            priority: 'info',
            message: `Excellent cache hit rate: ${(finalStats.hit_rate * 100).toFixed(1)}%`
        });
    }
    
    if (testResults.cacheAnalysis.memoryEfficiency > 100) {
        testResults.recommendations.push({
            category: 'Memory',
            priority: 'medium',
            message: `High memory usage detected: ${testResults.cacheAnalysis.memoryEfficiency.toFixed(1)}MB. Consider enabling compression.`
        });
    }
    
    if (testResults.cacheAnalysis.persistenceReliability < 90) {
        testResults.recommendations.push({
            category: 'Reliability',
            priority: 'high',
            message: `Persistent cache reliability is ${testResults.cacheAnalysis.persistenceReliability.toFixed(1)}%. Database issues detected.`
        });
    }
    
    const overallSuccessRate = (testResults.summary.passedTests / testResults.summary.totalTests) * 100;
    
    if (overallSuccessRate >= 90) {
        testResults.recommendations.push({
            category: 'Overall',
            priority: 'info',
            message: `Cache system is performing excellently with ${overallSuccessRate.toFixed(1)}% test success rate.`
        });
    } else if (overallSuccessRate >= 75) {
        testResults.recommendations.push({
            category: 'Overall',
            priority: 'medium',
            message: `Cache system is performing well with ${overallSuccessRate.toFixed(1)}% test success rate. Minor optimizations recommended.`
        });
    } else {
        testResults.recommendations.push({
            category: 'Overall',
            priority: 'critical',
            message: `Cache system has significant issues with only ${overallSuccessRate.toFixed(1)}% test success rate. Immediate fixes required.`
        });
    }
}

/**
 * Generate comprehensive test report
 */
async function generateTestReport() {
    console.log('\n📄 Generating comprehensive test report...');
    
    const endTime = performance.now();
    testResults.summary.duration = endTime - testStartTime;
    testResults.summary.successRate = (testResults.summary.passedTests / testResults.summary.totalTests) * 100;
    testResults.summary.endTime = new Date().toISOString();
    
    // Add system information
    testResults.systemInfo = {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memoryUsage: process.memoryUsage()
    };
    
    // Save detailed results
    const reportPath = path.join(__dirname, 'comprehensive-cache-verification-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    
    // Generate human-readable report
    const humanReadableReport = generateHumanReadableReport();
    const mdReportPath = path.join(__dirname, 'CACHE_VERIFICATION_REPORT.md');
    fs.writeFileSync(mdReportPath, humanReadableReport);
    
    console.log(`\n✅ Test report generated:`);
    console.log(`  📋 Detailed: ${reportPath}`);
    console.log(`  📖 Summary: ${mdReportPath}`);
    
    return { reportPath, mdReportPath };
}

/**
 * Generate human-readable markdown report
 */
function generateHumanReadableReport() {
    const { summary, testCategories, cacheAnalysis, recommendations } = testResults;
    
    let report = `# Comprehensive Cache System Verification Report

**Test Run ID:** ${summary.testRunId}
**Execution Date:** ${summary.startTime}
**Total Duration:** ${(summary.duration / 1000).toFixed(2)}s
**Overall Result:** ${summary.successRate >= 90 ? '✅ EXCELLENT' : summary.successRate >= 75 ? '⚠️ GOOD' : '❌ NEEDS IMPROVEMENT'}

## Executive Summary

This comprehensive verification tested the Claudette cache system across ${summary.totalTests} individual tests spanning 7 major categories.

**Overall Success Rate:** ${summary.successRate.toFixed(1)}% (${summary.passedTests}/${summary.totalTests} tests passed)
**Cache System Status:** ${summary.successRate >= 90 ? 'FULLY FUNCTIONAL' : summary.successRate >= 75 ? 'MOSTLY FUNCTIONAL' : 'REQUIRES FIXES'}

## Test Category Results

| Category | Tests | Passed | Failed | Success Rate |
|----------|--------|--------|--------|--------------|
`;

    Object.entries(testCategories).forEach(([category, tests]) => {
        const passed = tests.filter(t => t.passed).length;
        const total = tests.length;
        const rate = total > 0 ? (passed / total * 100).toFixed(1) : 'N/A';
        report += `| ${category} | ${total} | ${passed} | ${total - passed} | ${rate}% |\n`;
    });

    report += `
## Cache Performance Analysis

### Key Metrics
- **Hit Rate Improvement:** ${cacheAnalysis.hitRateImprovement.toFixed(1)}%
- **Average Response Time:** ${cacheAnalysis.averageResponseTime.toFixed(2)}ms
- **Memory Efficiency:** ${cacheAnalysis.memoryEfficiency.toFixed(2)}MB
- **Persistence Reliability:** ${cacheAnalysis.persistenceReliability.toFixed(1)}%

## Recommendations

`;

    recommendations.forEach(rec => {
        const icon = rec.priority === 'critical' ? '🚨' : rec.priority === 'high' ? '⚠️' : rec.priority === 'medium' ? '📋' : 'ℹ️';
        report += `### ${icon} ${rec.priority.toUpperCase()}: ${rec.category}
${rec.message}

`;
    });

    report += `## Detailed Test Results

`;

    Object.entries(testCategories).forEach(([category, tests]) => {
        if (tests.length === 0) return;
        
        report += `### ${category.charAt(0).toUpperCase() + category.slice(1)} Tests

`;
        tests.forEach(test => {
            const status = test.passed ? '✅' : '❌';
            const duration = test.duration ? `${test.duration.toFixed(2)}ms` : 'N/A';
            report += `- ${status} **${test.name}** (${duration})
`;
            if (!test.passed && test.error) {
                report += `  - Error: ${test.error}
`;
            }
        });
        report += `
`;
    });

    report += `## Conclusion

${summary.successRate >= 90 ? 
    '✅ **The cache system is fully functional and performing excellently.** All major components are working as expected with high performance and reliability.' :
    summary.successRate >= 75 ?
    '⚠️ **The cache system is mostly functional with room for improvement.** Most components are working well, but some optimizations are recommended.' :
    '❌ **The cache system requires immediate attention.** Significant issues have been identified that need to be addressed before production use.'
}

---

*Report generated on ${new Date().toISOString()}*
*Test Duration: ${(summary.duration / 1000).toFixed(2)} seconds*
`;

    return report;
}

/**
 * Main test execution function
 */
async function runCacheVerificationTests() {
    console.log('🚀 Starting Comprehensive Cache System Verification Tests');
    console.log('=' .repeat(70));
    
    testStartTime = performance.now();
    
    // Setup test environment
    const setupSuccess = await setupTestEnvironment();
    if (!setupSuccess) {
        console.error('❌ Failed to setup test environment. Exiting.');
        process.exit(1);
    }
    
    // Run all test suites
    await testBasicCacheOperations();
    await testMemoryCacheLayer();
    await testPersistentCacheIntegration();
    await testCachePerformance();
    await testConcurrentCacheAccess();
    await testClaudetteIntegration();
    await validateCacheStatistics();
    
    // Generate analysis and report
    generateCacheAnalysis();
    const { reportPath, mdReportPath } = await generateTestReport();
    
    // Display final summary
    console.log('\n' + '='.repeat(70));
    console.log('🎯 CACHE VERIFICATION TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Tests Passed: ${testResults.summary.passedTests}`);
    console.log(`❌ Tests Failed: ${testResults.summary.failedTests}`);
    console.log(`📊 Success Rate: ${testResults.summary.successRate.toFixed(1)}%`);
    console.log(`⏱️  Total Duration: ${(testResults.summary.duration / 1000).toFixed(2)}s`);
    console.log(`📄 Report: ${mdReportPath}`);
    
    if (testResults.summary.successRate >= 90) {
        console.log('\n🎉 CACHE SYSTEM VERIFICATION SUCCESSFUL! 🎉');
        console.log('The cache system is fully functional and ready for production use.');
    } else if (testResults.summary.successRate >= 75) {
        console.log('\n⚠️  CACHE SYSTEM MOSTLY FUNCTIONAL');
        console.log('The cache system is working but could benefit from optimizations.');
    } else {
        console.log('\n❌ CACHE SYSTEM NEEDS ATTENTION');
        console.log('Significant issues detected. Please review the detailed report.');
    }
    
    console.log('='.repeat(70));
}

// Run the tests if this file is executed directly
if (require.main === module) {
    runCacheVerificationTests().catch(error => {
        console.error('Fatal error during cache verification tests:', error);
        process.exit(1);
    });
}

module.exports = {
    runCacheVerificationTests,
    setupTestEnvironment,
    testBasicCacheOperations,
    testMemoryCacheLayer,
    testPersistentCacheIntegration,
    testCachePerformance,
    testConcurrentCacheAccess,
    testClaudetteIntegration,
    validateCacheStatistics
};