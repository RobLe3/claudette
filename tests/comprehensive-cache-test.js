#!/usr/bin/env node

// Comprehensive Cache System Test for Claudette
const path = require('path');
const fs = require('fs');
const { performance } = require('perf_hooks');

// Import the built modules
const { CacheSystem } = require('./dist/cache/index.js');
const { DatabaseManager } = require('./dist/database/index.js');

class CacheTestSuite {
    constructor() {
        this.testResults = [];
        this.performanceMetrics = [];
        this.cache = null;
        this.db = null;
        this.testDbPath = path.join(__dirname, 'test-cache-db');
    }

    log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, level, message, data };
        console.log(`${timestamp} [${level.toUpperCase()}] ${message}`);
        if (data) console.log('  Data:', JSON.stringify(data, null, 2));
        return logEntry;
    }

    recordTest(testName, passed, duration, details = null, error = null) {
        this.testResults.push({
            test: testName,
            passed,
            duration: Math.round(duration * 100) / 100,
            details,
            error: error ? error.message : null,
            timestamp: new Date().toISOString()
        });
    }

    recordPerformance(operation, duration, itemCount = 1, additionalMetrics = {}) {
        this.performanceMetrics.push({
            operation,
            duration: Math.round(duration * 100) / 100,
            itemCount,
            avgTimePerItem: Math.round((duration / itemCount) * 100) / 100,
            throughput: Math.round((itemCount / duration) * 1000), // items per second
            ...additionalMetrics,
            timestamp: new Date().toISOString()
        });
    }

    async setupTestEnvironment() {
        this.log('info', '🔧 Setting up cache test environment');
        
        try {
            // Clean up any existing test database
            if (fs.existsSync(this.testDbPath)) {
                fs.unlinkSync(this.testDbPath);
            }

            // Create test database manager
            this.db = new DatabaseManager(path.dirname(this.testDbPath));
            
            // Create cache system with different configurations
            this.cache = new CacheSystem(this.db, {
                ttl: 300, // 5 minutes
                maxSize: 1000,
                enableMemory: true,
                enablePersistent: false, // Start with memory only for basic tests
                compressionEnabled: false
            });
            
            this.log('info', '✅ Cache test environment setup complete');
            return true;
        } catch (error) {
            this.log('error', '❌ Failed to setup cache test environment', { error: error.message });
            return false;
        }
    }

    async testBasicCacheOperations() {
        this.log('info', '🧪 Testing basic cache operations');
        
        const tests = [
            { name: 'Cache Set Operation', operation: () => this.testCacheSet() },
            { name: 'Cache Get Operation', operation: () => this.testCacheGet() },
            { name: 'Cache Key Generation', operation: () => this.testCacheKeyGeneration() },
            { name: 'Cache Miss Handling', operation: () => this.testCacheMiss() },
        ];

        const results = [];
        for (const test of tests) {
            const testStart = performance.now();
            try {
                const result = await test.operation();
                const duration = performance.now() - testStart;
                this.recordTest(`Basic Cache: ${test.name}`, result.success, duration, result.details);
                results.push(result.success);
                this.log('info', `✅ ${test.name}: ${result.success ? 'PASS' : 'FAIL'}`, result.details);
            } catch (error) {
                const duration = performance.now() - testStart;
                this.recordTest(`Basic Cache: ${test.name}`, false, duration, null, error);
                results.push(false);
                this.log('error', `❌ ${test.name}: ERROR`, { error: error.message });
            }
        }

        return results.every(r => r);
    }

    async testCacheSet() {
        const request = {
            prompt: 'Test cache set operation',
            files: [],
            options: { temperature: 0.7 }
        };

        const response = {
            content: 'This is a test response for cache set operation',
            backend_used: 'test-backend',
            tokens_input: 50,
            tokens_output: 100,
            cost_eur: 0.005,
            latency_ms: 120,
            cache_hit: false
        };

        const startTime = performance.now();
        await this.cache.set(request, response);
        const duration = performance.now() - startTime;

        this.recordPerformance('Cache Set', duration, 1);

        return {
            success: true,
            details: { 
                setDuration: Math.round(duration * 100) / 100,
                cacheSize: this.cache.size()
            }
        };
    }

    async testCacheGet() {
        const request = {
            prompt: 'Test cache set operation', // Same as previous test
            files: [],
            options: { temperature: 0.7 }
        };

        const startTime = performance.now();
        const cachedResponse = await this.cache.get(request);
        const duration = performance.now() - startTime;

        this.recordPerformance('Cache Get Hit', duration, 1);

        const isHit = cachedResponse && cachedResponse.cache_hit;
        const contentMatches = cachedResponse && 
            cachedResponse.content === 'This is a test response for cache set operation';

        return {
            success: isHit && contentMatches,
            details: { 
                getDuration: Math.round(duration * 100) / 100,
                cacheHit: isHit,
                contentMatch: contentMatches,
                response: cachedResponse ? {
                    backend: cachedResponse.backend_used,
                    tokens: cachedResponse.tokens_input + cachedResponse.tokens_output
                } : null
            }
        };
    }

    async testCacheKeyGeneration() {
        // Test that identical requests generate the same key
        const request1 = { prompt: 'identical', files: [], options: {} };
        const request2 = { prompt: 'identical', files: [], options: {} };
        const request3 = { prompt: 'different', files: [], options: {} };

        const response = {
            content: 'test response',
            backend_used: 'test',
            tokens_input: 10,
            tokens_output: 10,
            cost_eur: 0.001,
            latency_ms: 100,
            cache_hit: false
        };

        // Set cache for request1
        await this.cache.set(request1, response);
        
        // Try to get with request2 (should hit)
        const result2 = await this.cache.get(request2);
        
        // Try to get with request3 (should miss)
        const result3 = await this.cache.get(request3);

        const identicalHit = result2 && result2.cache_hit;
        const differentMiss = !result3 || !result3.cache_hit;

        return {
            success: identicalHit && differentMiss,
            details: {
                identicalRequestHit: identicalHit,
                differentRequestMiss: differentMiss,
                cacheSize: this.cache.size()
            }
        };
    }

    async testCacheMiss() {
        const nonExistentRequest = {
            prompt: 'This request has never been cached before',
            files: [],
            options: { unique: Math.random() }
        };

        const startTime = performance.now();
        const result = await this.cache.get(nonExistentRequest);
        const duration = performance.now() - startTime;

        this.recordPerformance('Cache Get Miss', duration, 1);

        return {
            success: result === null,
            details: {
                result: result,
                expectedNull: true,
                missDuration: Math.round(duration * 100) / 100
            }
        };
    }

    async testCacheStatistics() {
        this.log('info', '📊 Testing cache statistics and metrics');
        
        const tests = [
            { name: 'Basic Stats Retrieval', operation: () => this.testBasicStats() },
            { name: 'Hit Rate Calculation', operation: () => this.testHitRateCalculation() },
            { name: 'Memory Usage Tracking', operation: () => this.testMemoryUsageTracking() },
        ];

        const results = [];
        for (const test of tests) {
            const testStart = performance.now();
            try {
                const result = await test.operation();
                const duration = performance.now() - testStart;
                this.recordTest(`Cache Stats: ${test.name}`, result.success, duration, result.details);
                results.push(result.success);
                this.log('info', `📈 ${test.name}: ${result.success ? 'PASS' : 'FAIL'}`, result.details);
            } catch (error) {
                const duration = performance.now() - testStart;
                this.recordTest(`Cache Stats: ${test.name}`, false, duration, null, error);
                results.push(false);
                this.log('error', `❌ ${test.name}: ERROR`, { error: error.message });
            }
        }

        return results.every(r => r);
    }

    async testBasicStats() {
        const stats = this.cache.getStats();
        
        const requiredFields = ['hit_rate', 'total_requests', 'cache_hits', 'cache_misses', 'memory_usage'];
        const hasAllFields = requiredFields.every(field => stats.hasOwnProperty(field));
        
        return {
            success: hasAllFields && typeof stats.hit_rate === 'number',
            details: {
                stats,
                hasAllRequiredFields: hasAllFields,
                statsType: typeof stats
            }
        };
    }

    async testHitRateCalculation() {
        // Clear cache and start fresh
        await this.cache.clear();
        
        const request = {
            prompt: 'Hit rate test request',
            files: [],
            options: {}
        };

        const response = {
            content: 'Hit rate test response',
            backend_used: 'test',
            tokens_input: 20,
            tokens_output: 30,
            cost_eur: 0.002,
            latency_ms: 110,
            cache_hit: false
        };

        // First request - should be a miss
        await this.cache.get(request); // Miss
        await this.cache.set(request, response);
        
        // Second request - should be a hit
        await this.cache.get(request); // Hit
        
        // Third request - should be a hit
        await this.cache.get(request); // Hit

        const stats = this.cache.getStats();
        const expectedHitRate = 2 / 3; // 2 hits out of 3 requests
        const hitRateClose = Math.abs(stats.hit_rate - expectedHitRate) < 0.01;

        return {
            success: hitRateClose && stats.cache_hits === 2 && stats.total_requests === 3,
            details: {
                actualHitRate: stats.hit_rate,
                expectedHitRate: expectedHitRate,
                totalRequests: stats.total_requests,
                cacheHits: stats.cache_hits,
                cacheMisses: stats.cache_misses
            }
        };
    }

    async testMemoryUsageTracking() {
        const initialStats = this.cache.getStats();
        const initialMemory = initialStats.memory_usage;

        // Add a large cache entry
        const largeRequest = {
            prompt: 'Large cache entry test',
            files: [],
            options: { size: 'large' }
        };

        const largeResponse = {
            content: 'A'.repeat(10000), // 10KB of 'A' characters
            backend_used: 'test',
            tokens_input: 100,
            tokens_output: 200,
            cost_eur: 0.01,
            latency_ms: 200,
            cache_hit: false
        };

        await this.cache.set(largeRequest, largeResponse);

        const afterStats = this.cache.getStats();
        const memoryIncreased = afterStats.memory_usage > initialMemory;

        return {
            success: memoryIncreased,
            details: {
                initialMemory,
                finalMemory: afterStats.memory_usage,
                memoryIncreased,
                memoryIncrease: afterStats.memory_usage - initialMemory
            }
        };
    }

    async testCacheTTLAndExpiration() {
        this.log('info', '⏰ Testing cache TTL and expiration');
        
        // Create a cache with short TTL for testing
        const shortTtlCache = new CacheSystem(this.db, {
            ttl: 1, // 1 second TTL
            maxSize: 100,
            enableMemory: true,
            enablePersistent: false,
            compressionEnabled: false
        });

        const request = {
            prompt: 'TTL test request',
            files: [],
            options: {}
        };

        const response = {
            content: 'This should expire quickly',
            backend_used: 'test',
            tokens_input: 30,
            tokens_output: 40,
            cost_eur: 0.003,
            latency_ms: 130,
            cache_hit: false
        };

        const testStart = performance.now();

        try {
            // Set cache entry
            await shortTtlCache.set(request, response);
            
            // Immediately get it (should hit)
            const immediateResult = await shortTtlCache.get(request);
            const immediateHit = immediateResult && immediateResult.cache_hit;

            // Wait for expiration (1.5 seconds to be safe)
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Try to get after expiration (should miss)
            const expiredResult = await shortTtlCache.get(request);
            const expiredMiss = !expiredResult || !expiredResult.cache_hit;

            const duration = performance.now() - testStart;
            this.recordTest('Cache TTL and Expiration', immediateHit && expiredMiss, duration);

            return {
                success: immediateHit && expiredMiss,
                details: {
                    immediateHit,
                    expiredMiss,
                    ttlSeconds: 1,
                    testDuration: Math.round(duration)
                }
            };
        } catch (error) {
            const duration = performance.now() - testStart;
            this.recordTest('Cache TTL and Expiration', false, duration, null, error);
            return {
                success: false,
                details: { error: error.message }
            };
        }
    }

    async testCachePerformance() {
        this.log('info', '🚀 Testing cache performance characteristics');
        
        const performanceTests = [
            { name: 'High-Volume Cache Operations', operation: () => this.testHighVolumeCacheOps(1000) },
            { name: 'Concurrent Cache Access', operation: () => this.testConcurrentCacheAccess(50) },
            { name: 'Large Entry Performance', operation: () => this.testLargeEntryPerformance() },
            { name: 'Cache Eviction Performance', operation: () => this.testCacheEvictionPerformance() },
        ];

        const results = [];
        for (const test of performanceTests) {
            const testStart = performance.now();
            try {
                const result = await test.operation();
                const duration = performance.now() - testStart;
                this.recordTest(`Cache Performance: ${test.name}`, result.success, duration, result.details);
                results.push(result.success);
                this.log('info', `⚡ ${test.name}: ${result.success ? 'PASS' : 'FAIL'}`, result.details);
            } catch (error) {
                const duration = performance.now() - testStart;
                this.recordTest(`Cache Performance: ${test.name}`, false, duration, null, error);
                results.push(false);
                this.log('error', `❌ ${test.name}: ERROR`, { error: error.message });
            }
        }

        return results.every(r => r);
    }

    async testHighVolumeCacheOps(count) {
        // Create a fresh cache for this test
        const perfCache = new CacheSystem(this.db, {
            ttl: 600,
            maxSize: count + 100, // Ensure we don't hit size limits
            enableMemory: true,
            enablePersistent: false,
            compressionEnabled: false
        });

        const startTime = performance.now();
        const operations = [];

        // Generate and cache many entries
        for (let i = 0; i < count; i++) {
            const request = {
                prompt: `Performance test request ${i}`,
                files: [],
                options: { index: i }
            };

            const response = {
                content: `Response ${i} with some variable content based on ${Math.random()}`,
                backend_used: `backend-${i % 5}`,
                tokens_input: 50 + (i % 100),
                tokens_output: 75 + (i % 150),
                cost_eur: 0.001 * (i + 1),
                latency_ms: 100 + Math.random() * 100,
                cache_hit: false
            };

            operations.push({ request, response });
        }

        // Perform set operations
        const setStartTime = performance.now();
        for (const op of operations) {
            await perfCache.set(op.request, op.response);
        }
        const setDuration = performance.now() - setStartTime;

        // Perform get operations
        const getStartTime = performance.now();
        let hits = 0;
        for (const op of operations) {
            const result = await perfCache.get(op.request);
            if (result && result.cache_hit) hits++;
        }
        const getDuration = performance.now() - getStartTime;

        const totalDuration = performance.now() - startTime;

        this.recordPerformance('High-Volume Cache Sets', setDuration, count);
        this.recordPerformance('High-Volume Cache Gets', getDuration, count);

        return {
            success: hits >= count * 0.95, // Allow for 5% miss rate due to potential issues
            details: {
                totalOperations: count * 2,
                setOperations: count,
                getOperations: count,
                cacheHits: hits,
                hitRate: (hits / count) * 100,
                setDuration: Math.round(setDuration),
                getDuration: Math.round(getDuration),
                totalDuration: Math.round(totalDuration),
                avgSetTime: Math.round((setDuration / count) * 100) / 100,
                avgGetTime: Math.round((getDuration / count) * 100) / 100,
                opsPerSecond: Math.round((count * 2) / totalDuration * 1000)
            }
        };
    }

    async testConcurrentCacheAccess(concurrency) {
        const concurrentOps = [];
        const startTime = performance.now();

        // Create concurrent operations
        for (let i = 0; i < concurrency; i++) {
            const operation = async () => {
                const request = {
                    prompt: `Concurrent request ${i}`,
                    files: [],
                    options: { concurrentId: i }
                };

                const response = {
                    content: `Concurrent response ${i}`,
                    backend_used: 'concurrent-test',
                    tokens_input: 40,
                    tokens_output: 60,
                    cost_eur: 0.004,
                    latency_ms: 90,
                    cache_hit: false
                };

                // Perform set then get
                await this.cache.set(request, response);
                return await this.cache.get(request);
            };

            concurrentOps.push(operation());
        }

        // Execute all operations concurrently
        const results = await Promise.all(concurrentOps);
        const duration = performance.now() - startTime;

        const successfulOps = results.filter(r => r && r.cache_hit).length;

        this.recordPerformance('Concurrent Cache Access', duration, concurrency, {
            concurrentOperations: concurrency,
            successfulOperations: successfulOps
        });

        return {
            success: successfulOps >= concurrency * 0.9, // Allow for 10% failure in concurrent ops
            details: {
                concurrentOperations: concurrency,
                successfulOperations: successfulOps,
                successRate: (successfulOps / concurrency) * 100,
                totalDuration: Math.round(duration),
                avgTimePerOperation: Math.round(duration / concurrency),
                operationsPerSecond: Math.round((concurrency * 2) / duration * 1000) // *2 for set+get
            }
        };
    }

    async testLargeEntryPerformance() {
        const sizes = [1, 10, 100, 500]; // KB sizes
        const results = [];

        for (const sizeKB of sizes) {
            const content = 'X'.repeat(sizeKB * 1024); // Create content of specified size
            
            const request = {
                prompt: `Large entry test ${sizeKB}KB`,
                files: [],
                options: { size: `${sizeKB}KB` }
            };

            const response = {
                content,
                backend_used: 'large-test',
                tokens_input: sizeKB * 10,
                tokens_output: sizeKB * 20,
                cost_eur: sizeKB * 0.001,
                latency_ms: 150,
                cache_hit: false
            };

            // Test set performance
            const setStart = performance.now();
            await this.cache.set(request, response);
            const setDuration = performance.now() - setStart;

            // Test get performance
            const getStart = performance.now();
            const retrievedResponse = await this.cache.get(request);
            const getDuration = performance.now() - getStart;

            const success = retrievedResponse && 
                            retrievedResponse.cache_hit && 
                            retrievedResponse.content.length === content.length;

            results.push({
                sizeKB,
                success,
                setDuration: Math.round(setDuration * 100) / 100,
                getDuration: Math.round(getDuration * 100) / 100
            });

            this.recordPerformance(`Large Entry Set (${sizeKB}KB)`, setDuration, 1, { sizeKB });
            this.recordPerformance(`Large Entry Get (${sizeKB}KB)`, getDuration, 1, { sizeKB });
        }

        const allSuccessful = results.every(r => r.success);

        return {
            success: allSuccessful,
            details: {
                sizesTestedKB: sizes,
                results,
                allSuccessful
            }
        };
    }

    async testCacheEvictionPerformance() {
        // Create cache with small max size to trigger eviction
        const evictionCache = new CacheSystem(this.db, {
            ttl: 600,
            maxSize: 50, // Small size to force eviction
            enableMemory: true,
            enablePersistent: false,
            compressionEnabled: false
        });

        const startTime = performance.now();
        
        // Add more entries than maxSize to trigger eviction
        const numEntries = 100;
        for (let i = 0; i < numEntries; i++) {
            const request = {
                prompt: `Eviction test ${i}`,
                files: [],
                options: { evictionIndex: i }
            };

            const response = {
                content: `Response for eviction test ${i}`,
                backend_used: 'eviction-test',
                tokens_input: 30,
                tokens_output: 40,
                cost_eur: 0.002,
                latency_ms: 100,
                cache_hit: false
            };

            await evictionCache.set(request, response);
        }

        const evictionDuration = performance.now() - startTime;
        const finalSize = evictionCache.size();

        this.recordPerformance('Cache Eviction', evictionDuration, numEntries, {
            entriesAdded: numEntries,
            finalCacheSize: finalSize,
            evictionTriggered: finalSize < numEntries
        });

        return {
            success: finalSize <= 50 && finalSize > 0, // Should respect maxSize
            details: {
                entriesAdded: numEntries,
                maxSize: 50,
                finalSize,
                evictionTriggered: finalSize < numEntries,
                evictionDuration: Math.round(evictionDuration)
            }
        };
    }

    async testEdgeCases() {
        this.log('info', '🧪 Testing edge cases and error conditions');
        
        const edgeTests = [
            { name: 'Empty Request Handling', operation: () => this.testEmptyRequest() },
            { name: 'Null Response Handling', operation: () => this.testNullResponse() },
            { name: 'Very Large Entries', operation: () => this.testVeryLargeEntries() },
            { name: 'Special Characters in Content', operation: () => this.testSpecialCharacters() },
        ];

        const results = [];
        for (const test of edgeTests) {
            const testStart = performance.now();
            try {
                const result = await test.operation();
                const duration = performance.now() - testStart;
                this.recordTest(`Edge Cases: ${test.name}`, result.success, duration, result.details);
                results.push(result.success);
                this.log('info', `🔍 ${test.name}: ${result.success ? 'PASS' : 'FAIL'}`, result.details);
            } catch (error) {
                const duration = performance.now() - testStart;
                this.recordTest(`Edge Cases: ${test.name}`, false, duration, null, error);
                results.push(false);
                this.log('error', `❌ ${test.name}: ERROR`, { error: error.message });
            }
        }

        return results.every(r => r);
    }

    async testEmptyRequest() {
        try {
            const emptyRequest = { prompt: '', files: [], options: {} };
            const response = {
                content: 'Empty prompt response',
                backend_used: 'test',
                tokens_input: 1,
                tokens_output: 10,
                cost_eur: 0.0001,
                latency_ms: 50,
                cache_hit: false
            };

            await this.cache.set(emptyRequest, response);
            const result = await this.cache.get(emptyRequest);
            
            return {
                success: result && result.cache_hit,
                details: { handled: true, cacheHit: result && result.cache_hit }
            };
        } catch (error) {
            return {
                success: false,
                details: { error: error.message }
            };
        }
    }

    async testNullResponse() {
        try {
            const request = { prompt: 'null response test', files: [], options: {} };
            
            // This should handle gracefully or throw appropriate error
            await this.cache.set(request, null);
            
            return {
                success: false, // Should have thrown an error
                details: { shouldHaveThrown: true }
            };
        } catch (error) {
            return {
                success: true, // Expected to throw
                details: { errorHandled: true, errorMessage: error.message }
            };
        }
    }

    async testVeryLargeEntries() {
        try {
            const largeContent = 'A'.repeat(5 * 1024 * 1024); // 5MB content
            
            const request = {
                prompt: 'Very large entry test',
                files: [],
                options: { size: 'very-large' }
            };

            const response = {
                content: largeContent,
                backend_used: 'large-test',
                tokens_input: 100000,
                tokens_output: 200000,
                cost_eur: 10.0,
                latency_ms: 5000,
                cache_hit: false
            };

            const setStart = performance.now();
            await this.cache.set(request, response);
            const setDuration = performance.now() - setStart;

            const getStart = performance.now();
            const result = await this.cache.get(request);
            const getDuration = performance.now() - getStart;

            const success = result && result.cache_hit && result.content.length === largeContent.length;

            return {
                success,
                details: {
                    contentSize: largeContent.length,
                    setDuration: Math.round(setDuration),
                    getDuration: Math.round(getDuration),
                    retrieved: success
                }
            };
        } catch (error) {
            return {
                success: false,
                details: { error: error.message }
            };
        }
    }

    async testSpecialCharacters() {
        const specialContent = 'Special chars: 你好 🚀 ñáéíóú àèìòù äëïöü ßø €£¥ \n\t\r \\"\' {}[]()';
        
        const request = {
            prompt: 'Special characters test: 测试 🧪 émojis',
            files: [],
            options: { special: true }
        };

        const response = {
            content: specialContent,
            backend_used: 'special-test',
            tokens_input: 50,
            tokens_output: 80,
            cost_eur: 0.005,
            latency_ms: 120,
            cache_hit: false
        };

        await this.cache.set(request, response);
        const result = await this.cache.get(request);

        const success = result && result.cache_hit && result.content === specialContent;

        return {
            success,
            details: {
                originalLength: specialContent.length,
                retrievedLength: result ? result.content.length : 0,
                contentMatch: result ? result.content === specialContent : false
            }
        };
    }

    generateReport() {
        this.log('info', '📊 Generating comprehensive cache test report');
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(t => t.passed).length;
        const failedTests = totalTests - passedTests;
        const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

        // Analyze performance metrics
        const performanceAnalysis = this.analyzePerformanceMetrics();

        const report = {
            summary: {
                totalTests,
                passedTests,
                failedTests,
                successRate: Math.round(successRate * 100) / 100,
                testDuration: this.testResults.reduce((sum, t) => sum + t.duration, 0)
            },
            testResults: this.testResults,
            performanceMetrics: this.performanceMetrics,
            performanceAnalysis,
            recommendations: this.generateRecommendations(),
            generatedAt: new Date().toISOString()
        };

        return report;
    }

    analyzePerformanceMetrics() {
        const analysis = {
            cacheOperations: {
                set: { times: [], avgTime: 0, throughput: 0 },
                get: { times: [], avgTime: 0, throughput: 0 }
            },
            memoryUsage: {
                efficiency: 'unknown',
                growthPattern: 'unknown'
            },
            concurrency: {
                maxConcurrency: 0,
                concurrencyEfficiency: 'unknown'
            }
        };

        // Analyze cache set operations
        const setOps = this.performanceMetrics.filter(m => m.operation.includes('Set'));
        if (setOps.length > 0) {
            analysis.cacheOperations.set.times = setOps.map(m => m.avgTimePerItem);
            analysis.cacheOperations.set.avgTime = setOps.reduce((sum, m) => sum + m.avgTimePerItem, 0) / setOps.length;
            analysis.cacheOperations.set.throughput = setOps.reduce((sum, m) => sum + m.throughput, 0) / setOps.length;
        }

        // Analyze cache get operations
        const getOps = this.performanceMetrics.filter(m => m.operation.includes('Get'));
        if (getOps.length > 0) {
            analysis.cacheOperations.get.times = getOps.map(m => m.avgTimePerItem);
            analysis.cacheOperations.get.avgTime = getOps.reduce((sum, m) => sum + m.avgTimePerItem, 0) / getOps.length;
            analysis.cacheOperations.get.throughput = getOps.reduce((sum, m) => sum + m.throughput, 0) / getOps.length;
        }

        // Analyze concurrency
        const concurrentOps = this.performanceMetrics.filter(m => m.operation.includes('Concurrent'));
        if (concurrentOps.length > 0) {
            analysis.concurrency.maxConcurrency = Math.max(...concurrentOps.map(m => m.itemCount));
            const avgThroughput = concurrentOps.reduce((sum, m) => sum + m.throughput, 0) / concurrentOps.length;
            analysis.concurrency.concurrencyEfficiency = avgThroughput > 100 ? 'good' : avgThroughput > 50 ? 'fair' : 'poor';
        }

        return analysis;
    }

    generateRecommendations() {
        const recommendations = [];
        
        // Check for failed tests
        const failedTests = this.testResults.filter(t => !t.passed);
        if (failedTests.length > 0) {
            recommendations.push({
                category: 'Reliability',
                severity: 'high',
                message: `${failedTests.length} test(s) failed. Critical issues that need attention.`,
                details: failedTests.map(t => t.test)
            });
        }

        // Performance analysis
        const setMetrics = this.performanceMetrics.filter(m => m.operation.includes('Set'));
        if (setMetrics.length > 0) {
            const avgSetTime = setMetrics.reduce((sum, m) => sum + m.avgTimePerItem, 0) / setMetrics.length;
            if (avgSetTime > 5) {
                recommendations.push({
                    category: 'Performance',
                    severity: 'medium',
                    message: `Cache SET operations averaging ${avgSetTime.toFixed(2)}ms. Consider optimization.`
                });
            }
        }

        const getMetrics = this.performanceMetrics.filter(m => m.operation.includes('Get'));
        if (getMetrics.length > 0) {
            const avgGetTime = getMetrics.reduce((sum, m) => sum + m.avgTimePerItem, 0) / getMetrics.length;
            if (avgGetTime > 2) {
                recommendations.push({
                    category: 'Performance',
                    severity: 'medium',
                    message: `Cache GET operations averaging ${avgGetTime.toFixed(2)}ms. Consider optimization.`
                });
            } else if (avgGetTime < 1) {
                recommendations.push({
                    category: 'Performance',
                    severity: 'info',
                    message: `Excellent cache GET performance (${avgGetTime.toFixed(2)}ms avg). Consider expanding cache usage.`
                });
            }
        }

        // Success rate analysis
        const successRate = this.testResults.filter(t => t.passed).length / this.testResults.length * 100;
        if (successRate >= 95) {
            recommendations.push({
                category: 'Quality',
                severity: 'info',
                message: `Excellent test success rate (${successRate.toFixed(1)}%). Cache system is highly reliable.`
            });
        } else if (successRate < 80) {
            recommendations.push({
                category: 'Quality',
                severity: 'high',
                message: `Low test success rate (${successRate.toFixed(1)}%). Significant reliability issues detected.`
            });
        }

        return recommendations;
    }

    async cleanup() {
        this.log('info', '🧹 Cleaning up cache test environment');
        
        try {
            if (this.cache) {
                await this.cache.clear();
            }
            
            if (this.db) {
                this.db.close();
            }
            
            if (fs.existsSync(this.testDbPath)) {
                fs.unlinkSync(this.testDbPath);
            }
            
            this.log('info', '✅ Cache test cleanup complete');
        } catch (error) {
            this.log('error', '❌ Cache test cleanup failed', { error: error.message });
        }
    }
}

async function runComprehensiveCacheTest() {
    const testSuite = new CacheTestSuite();
    
    console.log('🚀 Starting Comprehensive Cache Test Suite');
    console.log('============================================');
    
    try {
        // Setup
        if (!(await testSuite.setupTestEnvironment())) {
            console.error('❌ Test setup failed. Exiting.');
            return false;
        }

        // Run all test suites
        const testSuites = [
            { name: 'Basic Cache Operations', test: () => testSuite.testBasicCacheOperations() },
            { name: 'Cache Statistics', test: () => testSuite.testCacheStatistics() },
            { name: 'Cache TTL and Expiration', test: () => testSuite.testCacheTTLAndExpiration() },
            { name: 'Cache Performance', test: () => testSuite.testCachePerformance() },
            { name: 'Edge Cases', test: () => testSuite.testEdgeCases() }
        ];

        const results = [];
        for (const suite of testSuites) {
            console.log(`\n🧪 Running ${suite.name} tests...`);
            const result = await suite.test();
            results.push(result);
        }

        // Generate and save report
        const report = testSuite.generateReport();
        
        const reportPath = path.join(__dirname, 'cache-test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log('\n📊 CACHE TEST RESULTS SUMMARY');
        console.log('==============================');
        console.log(`Total Tests: ${report.summary.totalTests}`);
        console.log(`Passed: ${report.summary.passedTests}`);
        console.log(`Failed: ${report.summary.failedTests}`);
        console.log(`Success Rate: ${report.summary.successRate}%`);
        console.log(`Total Duration: ${Math.round(report.summary.testDuration)}ms`);
        
        if (report.performanceAnalysis) {
            console.log('\n⚡ PERFORMANCE ANALYSIS:');
            console.log(`  Cache SET avg: ${report.performanceAnalysis.cacheOperations.set.avgTime.toFixed(2)}ms`);
            console.log(`  Cache GET avg: ${report.performanceAnalysis.cacheOperations.get.avgTime.toFixed(2)}ms`);
            console.log(`  SET throughput: ${Math.round(report.performanceAnalysis.cacheOperations.set.throughput)} ops/sec`);
            console.log(`  GET throughput: ${Math.round(report.performanceAnalysis.cacheOperations.get.throughput)} ops/sec`);
        }
        
        if (report.recommendations.length > 0) {
            console.log('\n💡 RECOMMENDATIONS:');
            report.recommendations.forEach(rec => {
                console.log(`  [${rec.severity.toUpperCase()}] ${rec.category}: ${rec.message}`);
            });
        }
        
        console.log(`\n📁 Detailed report saved to: ${reportPath}`);

        const allPassed = results.every(r => r);
        console.log(`\n${allPassed ? '✅' : '❌'} Cache test suite ${allPassed ? 'PASSED' : 'FAILED'}`);
        
        return allPassed;

    } catch (error) {
        console.error('❌ Test suite execution failed:', error);
        return false;
    } finally {
        await testSuite.cleanup();
    }
}

if (require.main === module) {
    runComprehensiveCacheTest().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = { runComprehensiveCacheTest, CacheTestSuite };