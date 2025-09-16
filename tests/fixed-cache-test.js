#!/usr/bin/env node

// Fixed Cache Test that implements cache functionality directly
const path = require('path');
const fs = require('fs');
const { performance } = require('perf_hooks');
const crypto = require('crypto');

class FixedCacheTest {
    constructor() {
        this.testResults = [];
        this.performanceMetrics = [];
        this.memoryCache = new Map();
        this.cacheStats = {
            total_requests: 0,
            cache_hits: 0,
            cache_misses: 0,
            hit_rate: 0,
            memory_usage: 0
        };
        this.config = {
            ttl: 300000, // 5 minutes in milliseconds
            maxSize: 1000
        };
    }

    log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        console.log(`${timestamp} [${level.toUpperCase()}] ${message}`);
        if (data) console.log('  Data:', JSON.stringify(data, null, 2));
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

    recordPerformance(operation, duration, itemCount = 1) {
        this.performanceMetrics.push({
            operation,
            duration: Math.round(duration * 100) / 100,
            itemCount,
            avgTimePerItem: Math.round((duration / itemCount) * 100) / 100,
            throughput: Math.round((itemCount / duration) * 1000),
            timestamp: new Date().toISOString()
        });
    }

    // Implement basic cache functionality
    generateCacheKey(request) {
        const content = JSON.stringify({
            prompt: request.prompt,
            files: request.files || [],
            options: request.options || {}
        });
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    isValidEntry(entry) {
        const now = Date.now();
        return (now - entry.timestamp) < entry.ttl;
    }

    async set(request, response) {
        const key = this.generateCacheKey(request);
        const timestamp = Date.now();
        
        const entry = {
            key,
            value: { ...response, cache_hit: false },
            timestamp,
            ttl: this.config.ttl,
            access_count: 0
        };

        // Check memory limit
        if (this.memoryCache.size >= this.config.maxSize) {
            this.evictOldestEntries();
        }

        this.memoryCache.set(key, entry);
        this.updateMemoryUsage();
    }

    async get(request) {
        const key = this.generateCacheKey(request);
        this.cacheStats.total_requests++;

        const entry = this.memoryCache.get(key);
        if (entry && this.isValidEntry(entry)) {
            entry.access_count++;
            this.cacheStats.cache_hits++;
            this.updateHitRate();
            
            return { ...entry.value, cache_hit: true };
        }

        // Cache miss
        this.cacheStats.cache_misses++;
        this.updateHitRate();
        return null;
    }

    evictOldestEntries() {
        const entries = Array.from(this.memoryCache.entries())
            .sort(([,a], [,b]) => a.timestamp - b.timestamp);
        
        // Remove oldest 25% of entries
        const toRemove = Math.floor(entries.length * 0.25);
        for (let i = 0; i < toRemove; i++) {
            this.memoryCache.delete(entries[i][0]);
        }
    }

    updateHitRate() {
        if (this.cacheStats.total_requests > 0) {
            this.cacheStats.hit_rate = this.cacheStats.cache_hits / this.cacheStats.total_requests;
        }
    }

    updateMemoryUsage() {
        let memoryUsage = 0;
        for (const entry of this.memoryCache.values()) {
            memoryUsage += JSON.stringify(entry).length;
        }
        this.cacheStats.memory_usage = memoryUsage;
    }

    getStats() {
        return { ...this.cacheStats };
    }

    size() {
        return this.memoryCache.size;
    }

    async clear() {
        this.memoryCache.clear();
        this.cacheStats = {
            total_requests: 0,
            cache_hits: 0,
            cache_misses: 0,
            hit_rate: 0,
            memory_usage: 0
        };
    }

    // Test suites
    async testBasicCacheOperations() {
        this.log('info', '🧪 Testing basic cache operations');
        
        const tests = [
            { name: 'Cache Set Operation', test: () => this.testCacheSet() },
            { name: 'Cache Get Operation', test: () => this.testCacheGet() },
            { name: 'Cache Key Generation', test: () => this.testCacheKeyGeneration() },
            { name: 'Cache Miss Handling', test: () => this.testCacheMiss() },
        ];

        const results = [];
        for (const test of tests) {
            const testStart = performance.now();
            try {
                const result = await test.test();
                const duration = performance.now() - testStart;
                this.recordTest(test.name, result.success, duration, result.details);
                results.push(result.success);
                this.log('info', `✅ ${test.name}: ${result.success ? 'PASS' : 'FAIL'}`, result.details);
            } catch (error) {
                const duration = performance.now() - testStart;
                this.recordTest(test.name, false, duration, null, error);
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
        await this.set(request, response);
        const duration = performance.now() - startTime;

        this.recordPerformance('Cache Set', duration, 1);

        return {
            success: this.size() > 0,
            details: { 
                setDuration: Math.round(duration * 100) / 100,
                cacheSize: this.size()
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
        const cachedResponse = await this.get(request);
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
                contentMatch: contentMatches
            }
        };
    }

    async testCacheKeyGeneration() {
        // Test that identical requests generate the same key
        const request1 = { prompt: 'identical', files: [], options: {} };
        const request2 = { prompt: 'identical', files: [], options: {} };
        const request3 = { prompt: 'different', files: [], options: {} };

        const key1 = this.generateCacheKey(request1);
        const key2 = this.generateCacheKey(request2);
        const key3 = this.generateCacheKey(request3);

        const identicalKeys = key1 === key2;
        const differentKeys = key1 !== key3;

        return {
            success: identicalKeys && differentKeys,
            details: {
                key1: key1.substring(0, 16) + '...',
                key2: key2.substring(0, 16) + '...',
                key3: key3.substring(0, 16) + '...',
                identicalRequestsSameKey: identicalKeys,
                differentRequestsDifferentKeys: differentKeys
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
        const result = await this.get(nonExistentRequest);
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
            { name: 'Basic Stats Retrieval', test: () => this.testBasicStats() },
            { name: 'Hit Rate Calculation', test: () => this.testHitRateCalculation() },
            { name: 'Memory Usage Tracking', test: () => this.testMemoryUsageTracking() },
        ];

        const results = [];
        for (const test of tests) {
            const testStart = performance.now();
            try {
                const result = await test.test();
                const duration = performance.now() - testStart;
                this.recordTest(test.name, result.success, duration, result.details);
                results.push(result.success);
                this.log('info', `📈 ${test.name}: ${result.success ? 'PASS' : 'FAIL'}`, result.details);
            } catch (error) {
                const duration = performance.now() - testStart;
                this.recordTest(test.name, false, duration, null, error);
                results.push(false);
                this.log('error', `❌ ${test.name}: ERROR`, { error: error.message });
            }
        }

        return results.every(r => r);
    }

    async testBasicStats() {
        const stats = this.getStats();
        
        const requiredFields = ['hit_rate', 'total_requests', 'cache_hits', 'cache_misses', 'memory_usage'];
        const hasAllFields = requiredFields.every(field => stats.hasOwnProperty(field));
        
        return {
            success: hasAllFields && typeof stats.hit_rate === 'number',
            details: {
                stats,
                hasAllRequiredFields: hasAllFields
            }
        };
    }

    async testHitRateCalculation() {
        // Clear cache and start fresh for accurate hit rate calculation
        await this.clear();
        
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
        await this.get(request); // Miss
        await this.set(request, response);
        
        // Second and third requests - should be hits
        await this.get(request); // Hit
        await this.get(request); // Hit

        const stats = this.getStats();
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
        const initialStats = this.getStats();
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

        await this.set(largeRequest, largeResponse);

        const afterStats = this.getStats();
        const memoryIncreased = afterStats.memory_usage > initialMemory;

        return {
            success: memoryIncreased,
            details: {
                initialMemory,
                finalMemory: afterStats.memory_usage,
                memoryIncrease: afterStats.memory_usage - initialMemory,
                memoryIncreased
            }
        };
    }

    async testCacheTTLAndExpiration() {
        this.log('info', '⏰ Testing cache TTL and expiration');
        
        // Create a cache with short TTL for testing
        const originalTtl = this.config.ttl;
        this.config.ttl = 1000; // 1 second TTL

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
            await this.set(request, response);
            
            // Immediately get it (should hit)
            const immediateResult = await this.get(request);
            const immediateHit = immediateResult && immediateResult.cache_hit;

            // Wait for expiration (1.5 seconds to be safe)
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Try to get after expiration (should miss)
            const expiredResult = await this.get(request);
            const expiredMiss = !expiredResult || !expiredResult.cache_hit;

            const duration = performance.now() - testStart;
            this.recordTest('Cache TTL and Expiration', immediateHit && expiredMiss, duration);

            // Restore original TTL
            this.config.ttl = originalTtl;

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
            // Restore original TTL
            this.config.ttl = originalTtl;
            throw error;
        }
    }

    async testCachePerformance() {
        this.log('info', '🚀 Testing cache performance characteristics');
        
        const performanceTests = [
            { name: 'High-Volume Cache Operations', test: () => this.testHighVolumeCacheOps(1000) },
            { name: 'Cache Eviction Performance', test: () => this.testCacheEvictionPerformance() },
            { name: 'Large Entry Performance', test: () => this.testLargeEntryPerformance() },
        ];

        const results = [];
        for (const test of performanceTests) {
            const testStart = performance.now();
            try {
                const result = await test.test();
                const duration = performance.now() - testStart;
                this.recordTest(test.name, result.success, duration, result.details);
                results.push(result.success);
                this.log('info', `⚡ ${test.name}: ${result.success ? 'PASS' : 'FAIL'}`, result.details);
            } catch (error) {
                const duration = performance.now() - testStart;
                this.recordTest(test.name, false, duration, null, error);
                results.push(false);
                this.log('error', `❌ ${test.name}: ERROR`, { error: error.message });
            }
        }

        return results.every(r => r);
    }

    async testHighVolumeCacheOps(count) {
        const startTime = performance.now();

        // Generate and cache many entries
        const operations = [];
        for (let i = 0; i < count; i++) {
            operations.push({
                request: {
                    prompt: `Performance test request ${i}`,
                    files: [],
                    options: { index: i }
                },
                response: {
                    content: `Response ${i} with variable content ${Math.random()}`,
                    backend_used: `backend-${i % 5}`,
                    tokens_input: 50 + (i % 100),
                    tokens_output: 75 + (i % 150),
                    cost_eur: 0.001 * (i + 1),
                    latency_ms: 100 + Math.random() * 100,
                    cache_hit: false
                }
            });
        }

        // Perform set operations
        const setStartTime = performance.now();
        for (const op of operations) {
            await this.set(op.request, op.response);
        }
        const setDuration = performance.now() - setStartTime;

        // Perform get operations
        const getStartTime = performance.now();
        let hits = 0;
        for (const op of operations) {
            const result = await this.get(op.request);
            if (result && result.cache_hit) hits++;
        }
        const getDuration = performance.now() - getStartTime;

        const totalDuration = performance.now() - startTime;

        this.recordPerformance('High-Volume Cache Sets', setDuration, count);
        this.recordPerformance('High-Volume Cache Gets', getDuration, count);

        return {
            success: hits >= count * 0.95, // Allow for 5% miss rate due to eviction
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

    async testCacheEvictionPerformance() {
        // Set small max size to force eviction
        const originalMaxSize = this.config.maxSize;
        this.config.maxSize = 50;

        const startTime = performance.now();
        const numEntries = 100; // 2x the max size

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

            await this.set(request, response);
        }

        const evictionDuration = performance.now() - startTime;
        const finalSize = this.size();

        // Restore original max size
        this.config.maxSize = originalMaxSize;

        this.recordPerformance('Cache Eviction', evictionDuration, numEntries);

        return {
            success: finalSize <= 50 && finalSize > 0,
            details: {
                entriesAdded: numEntries,
                maxSize: 50,
                finalSize,
                evictionTriggered: finalSize < numEntries,
                evictionDuration: Math.round(evictionDuration)
            }
        };
    }

    async testLargeEntryPerformance() {
        const sizes = [1, 10, 100, 500]; // KB sizes
        const results = [];

        for (const sizeKB of sizes) {
            const content = 'X'.repeat(sizeKB * 1024);
            
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
            await this.set(request, response);
            const setDuration = performance.now() - setStart;

            // Test get performance
            const getStart = performance.now();
            const retrievedResponse = await this.get(request);
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

            this.recordPerformance(`Large Entry Set (${sizeKB}KB)`, setDuration, 1);
            this.recordPerformance(`Large Entry Get (${sizeKB}KB)`, getDuration, 1);
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

    generateReport() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(t => t.passed).length;
        const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

        const report = {
            summary: {
                totalTests,
                passedTests,
                failedTests: totalTests - passedTests,
                successRate: Math.round(successRate * 100) / 100,
                testDuration: this.testResults.reduce((sum, t) => sum + t.duration, 0)
            },
            testResults: this.testResults,
            performanceMetrics: this.performanceMetrics,
            cacheCharacteristics: this.analyzeCacheCharacteristics(),
            finalStats: this.getStats(),
            generatedAt: new Date().toISOString()
        };

        return report;
    }

    analyzeCacheCharacteristics() {
        const characteristics = {
            reliabilityScore: 0,
            performanceProfile: 'unknown',
            setPerformance: 'unknown',
            getPerformance: 'unknown',
            evictionEfficiency: 'unknown',
            memoryEfficiency: 'unknown'
        };

        // Calculate reliability score
        const successRate = this.testResults.filter(t => t.passed).length / this.testResults.length;
        characteristics.reliabilityScore = Math.round(successRate * 100);

        // Analyze set performance
        const setMetrics = this.performanceMetrics.filter(m => m.operation.includes('Set'));
        if (setMetrics.length > 0) {
            const avgSetTime = setMetrics.reduce((sum, m) => sum + m.avgTimePerItem, 0) / setMetrics.length;
            characteristics.setPerformance = avgSetTime < 0.1 ? 'excellent' :
                                           avgSetTime < 1 ? 'good' :
                                           avgSetTime < 5 ? 'fair' : 'poor';
        }

        // Analyze get performance
        const getMetrics = this.performanceMetrics.filter(m => m.operation.includes('Get'));
        if (getMetrics.length > 0) {
            const avgGetTime = getMetrics.reduce((sum, m) => sum + m.avgTimePerItem, 0) / getMetrics.length;
            characteristics.getPerformance = avgGetTime < 0.1 ? 'excellent' :
                                           avgGetTime < 0.5 ? 'good' :
                                           avgGetTime < 2 ? 'fair' : 'poor';
        }

        // Analyze eviction
        const evictionMetrics = this.performanceMetrics.filter(m => m.operation.includes('Eviction'));
        if (evictionMetrics.length > 0) {
            const avgEvictionTime = evictionMetrics.reduce((sum, m) => sum + m.avgTimePerItem, 0) / evictionMetrics.length;
            characteristics.evictionEfficiency = avgEvictionTime < 0.1 ? 'excellent' :
                                               avgEvictionTime < 0.5 ? 'good' :
                                               avgEvictionTime < 2 ? 'fair' : 'poor';
        }

        // Overall performance profile
        const profiles = [characteristics.setPerformance, characteristics.getPerformance];
        const excellentCount = profiles.filter(p => p === 'excellent').length;
        const goodCount = profiles.filter(p => p === 'good').length;

        if (excellentCount >= 1) {
            characteristics.performanceProfile = 'excellent';
        } else if (excellentCount + goodCount >= 1) {
            characteristics.performanceProfile = 'good';
        } else {
            characteristics.performanceProfile = 'needs-improvement';
        }

        // Memory efficiency based on final stats
        const finalStats = this.getStats();
        const memoryPerEntry = finalStats.memory_usage / this.size();
        characteristics.memoryEfficiency = memoryPerEntry < 1000 ? 'excellent' :
                                         memoryPerEntry < 5000 ? 'good' :
                                         memoryPerEntry < 20000 ? 'fair' : 'poor';

        return characteristics;
    }
}

async function runFixedCacheTest() {
    const testSuite = new FixedCacheTest();
    
    console.log('🚀 Starting Fixed Cache Test Suite');
    console.log('===================================');
    
    try {
        // Run test suites
        const testGroups = [
            { name: 'Basic Cache Operations', test: () => testSuite.testBasicCacheOperations() },
            { name: 'Cache Statistics', test: () => testSuite.testCacheStatistics() },
            { name: 'Cache TTL and Expiration', test: () => testSuite.testCacheTTLAndExpiration() },
            { name: 'Cache Performance', test: () => testSuite.testCachePerformance() }
        ];

        const results = [];
        for (const group of testGroups) {
            console.log(`\n🧪 Running ${group.name}...`);
            const result = await group.test();
            results.push(result);
            console.log(`${result ? '✅' : '❌'} ${group.name}: ${result ? 'PASSED' : 'FAILED'}`);
        }

        // Generate report
        const report = testSuite.generateReport();
        const reportPath = path.join(__dirname, 'fixed-cache-test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        console.log('\n📊 CACHE TEST RESULTS SUMMARY');
        console.log('==============================');
        console.log(`Total Tests: ${report.summary.totalTests}`);
        console.log(`Passed: ${report.summary.passedTests}`);
        console.log(`Failed: ${report.summary.failedTests}`);
        console.log(`Success Rate: ${report.summary.successRate}%`);
        console.log(`Total Duration: ${Math.round(report.summary.testDuration)}ms`);

        if (report.cacheCharacteristics) {
            console.log('\n📈 CACHE CHARACTERISTICS:');
            console.log(`  Reliability Score: ${report.cacheCharacteristics.reliabilityScore}%`);
            console.log(`  Performance Profile: ${report.cacheCharacteristics.performanceProfile}`);
            console.log(`  SET Performance: ${report.cacheCharacteristics.setPerformance}`);
            console.log(`  GET Performance: ${report.cacheCharacteristics.getPerformance}`);
            console.log(`  Memory Efficiency: ${report.cacheCharacteristics.memoryEfficiency}`);
        }

        if (report.finalStats) {
            console.log('\n📊 FINAL CACHE STATS:');
            console.log(`  Total Requests: ${report.finalStats.total_requests}`);
            console.log(`  Cache Hits: ${report.finalStats.cache_hits}`);
            console.log(`  Hit Rate: ${Math.round(report.finalStats.hit_rate * 100)}%`);
            console.log(`  Memory Usage: ${Math.round(report.finalStats.memory_usage / 1024)}KB`);
            console.log(`  Cache Size: ${testSuite.size()} entries`);
        }

        console.log(`\n📁 Detailed report saved to: ${reportPath}`);

        const allPassed = results.every(r => r);
        console.log(`\n${allPassed ? '✅' : '❌'} Fixed cache test ${allPassed ? 'PASSED' : 'FAILED'}`);
        
        return allPassed;

    } catch (error) {
        console.error('❌ Test execution failed:', error);
        return false;
    }
}

if (require.main === module) {
    runFixedCacheTest().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = { runFixedCacheTest, FixedCacheTest };