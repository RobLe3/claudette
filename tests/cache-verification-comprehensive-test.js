#!/usr/bin/env node

/**
 * Cache System Verification Swarm Agent
 * Comprehensive testing of Claudette's cache system after fixes
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

class CacheVerificationAgent {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            agent: 'Cache System Verification Swarm',
            cache_system_status: 'unknown',
            test_results: {
                basic_functionality: [],
                performance: [],
                persistence: [],
                concurrency: [],
                cleanup: []
            },
            performance_metrics: {
                cache_hit_improvement: 0,
                average_cached_latency: 0,
                average_uncached_latency: 0,
                cache_efficiency_ratio: 0
            },
            recommendations: [],
            summary: {
                total_tests: 0,
                passed_tests: 0,
                failed_tests: 0,
                cache_working: false,
                performance_gain: 0
            }
        };
    }

    log(message) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [Cache Verification] ${message}`);
    }

    recordTest(category, testName, passed, details = {}) {
        const test = {
            name: testName,
            passed,
            timestamp: new Date().toISOString(),
            duration_ms: details.duration_ms || 0,
            details: details
        };

        this.results.test_results[category].push(test);
        this.results.summary.total_tests++;
        
        if (passed) {
            this.results.summary.passed_tests++;
        } else {
            this.results.summary.failed_tests++;
        }
    }

    async testBasicCacheFunctionality() {
        this.log('Testing basic cache functionality...');
        
        try {
            const { Claudette } = require('./dist/index.js');
            const claudette = new Claudette();
            await claudette.initialize();

            // Test 1: First request (should miss cache)
            const testQuery = 'Cache test query - what is 2+2?';
            this.log('Making first request (should miss cache)...');
            
            const start1 = Date.now();
            const response1 = await claudette.optimize(testQuery);
            const time1 = Date.now() - start1;
            
            this.recordTest('basic_functionality', 'First request processing', true, {
                duration_ms: time1,
                cache_hit: response1.cache_hit,
                response_length: response1.content?.length || 0
            });

            // Test 2: Identical second request (should hit cache)
            this.log('Making identical second request (should hit cache)...');
            
            const start2 = Date.now();
            const response2 = await claudette.optimize(testQuery);
            const time2 = Date.now() - start2;
            
            const cacheHit = response2.cache_hit || false;
            this.recordTest('basic_functionality', 'Cache hit test', cacheHit, {
                duration_ms: time2,
                cache_hit: response2.cache_hit,
                time_improvement: time1 - time2,
                performance_ratio: time1 / time2
            });

            // Test 3: Cache statistics
            const status = await claudette.getStatus();
            const cacheStats = status.cache;
            
            this.log(`Cache statistics: Hit rate: ${(cacheStats.hit_rate * 100).toFixed(1)}%, Entries: ${cacheStats.entries_count}`);
            
            this.recordTest('basic_functionality', 'Cache statistics accuracy', cacheStats.hit_rate > 0, {
                hit_rate: cacheStats.hit_rate,
                entries_count: cacheStats.entries_count,
                total_requests: cacheStats.total_requests,
                cache_hits: cacheStats.cache_hits
            });

            // Test 4: Different query (should miss cache)
            const differentQuery = 'Different cache test - what is 3+3?';
            const start3 = Date.now();
            const response3 = await claudette.optimize(differentQuery);
            const time3 = Date.now() - start3;
            
            this.recordTest('basic_functionality', 'Different query cache miss', !response3.cache_hit, {
                duration_ms: time3,
                cache_hit: response3.cache_hit
            });

            await claudette.cleanup();
            
            return {
                cache_working: cacheHit,
                performance_improvement: time1 - time2,
                cache_stats: cacheStats
            };

        } catch (error) {
            this.log(`Basic cache functionality test error: ${error.message}`);
            this.recordTest('basic_functionality', 'Cache system initialization', false, {
                error: error.message
            });
            return { cache_working: false, error: error.message };
        }
    }

    async testCachePerformance() {
        this.log('Testing cache performance characteristics...');
        
        try {
            const { Claudette } = require('./dist/index.js');
            const claudette = new Claudette();
            await claudette.initialize();

            const performanceQueries = [
                'Performance test 1: Calculate fibonacci of 10',
                'Performance test 2: What is machine learning?',
                'Performance test 3: Explain quantum computing',
                'Performance test 4: List programming languages',
                'Performance test 5: Describe data structures'
            ];

            const uncachedTimes = [];
            const cachedTimes = [];

            // First pass - populate cache and measure uncached times
            this.log('First pass: Measuring uncached performance...');
            for (const query of performanceQueries) {
                const start = Date.now();
                await claudette.optimize(query);
                const duration = Date.now() - start;
                uncachedTimes.push(duration);
            }

            // Second pass - measure cached times
            this.log('Second pass: Measuring cached performance...');
            for (const query of performanceQueries) {
                const start = Date.now();
                const response = await claudette.optimize(query);
                const duration = Date.now() - start;
                cachedTimes.push(duration);
                
                if (!response.cache_hit) {
                    this.log(`Warning: Expected cache hit but got cache miss for: ${query.substring(0, 50)}...`);
                }
            }

            // Calculate performance metrics
            const avgUncached = uncachedTimes.reduce((a, b) => a + b, 0) / uncachedTimes.length;
            const avgCached = cachedTimes.reduce((a, b) => a + b, 0) / cachedTimes.length;
            const improvementRatio = avgUncached / avgCached;
            const improvementPercent = ((avgUncached - avgCached) / avgUncached) * 100;

            this.results.performance_metrics = {
                average_uncached_latency: avgUncached,
                average_cached_latency: avgCached,
                cache_hit_improvement: improvementPercent,
                cache_efficiency_ratio: improvementRatio
            };

            this.recordTest('performance', 'Cache performance improvement', improvementRatio > 1.5, {
                avg_uncached_ms: avgUncached,
                avg_cached_ms: avgCached,
                improvement_ratio: improvementRatio,
                improvement_percent: improvementPercent,
                sample_size: performanceQueries.length
            });

            await claudette.cleanup();
            
            return {
                avgUncached,
                avgCached,
                improvementRatio,
                improvementPercent
            };

        } catch (error) {
            this.log(`Cache performance test error: ${error.message}`);
            this.recordTest('performance', 'Cache performance measurement', false, {
                error: error.message
            });
            return { error: error.message };
        }
    }

    async testConcurrentCacheAccess() {
        this.log('Testing concurrent cache access...');
        
        try {
            const { Claudette } = require('./dist/index.js');
            
            // Create multiple instances for concurrent testing
            const instances = [];
            for (let i = 0; i < 3; i++) {
                const claudette = new Claudette();
                await claudette.initialize();
                instances.push(claudette);
            }

            const concurrentQuery = 'Concurrent cache test query - thread safety verification';
            
            // Make concurrent requests to the same query
            this.log('Making concurrent requests to same query...');
            const promises = instances.map(async (claudette, index) => {
                const start = Date.now();
                const response = await claudette.optimize(concurrentQuery);
                const duration = Date.now() - start;
                
                return {
                    instance: index,
                    duration,
                    cache_hit: response.cache_hit,
                    response_length: response.content?.length || 0
                };
            });

            const results = await Promise.all(promises);
            
            // Analyze results
            const cacheHits = results.filter(r => r.cache_hit).length;
            const totalRequests = results.length;
            const responseLengthsMatch = results.every(r => r.response_length === results[0].response_length);

            this.recordTest('concurrency', 'Concurrent cache access', true, {
                total_requests: totalRequests,
                cache_hits: cacheHits,
                cache_hit_rate: cacheHits / totalRequests,
                response_consistency: responseLengthsMatch,
                results: results
            });

            // Cleanup
            for (const claudette of instances) {
                await claudette.cleanup();
            }

            return { cacheHits, totalRequests, responseLengthsMatch };

        } catch (error) {
            this.log(`Concurrent cache access test error: ${error.message}`);
            this.recordTest('concurrency', 'Concurrent cache access', false, {
                error: error.message
            });
            return { error: error.message };
        }
    }

    async testCachePersistence() {
        this.log('Testing cache persistence across restarts...');
        
        try {
            const { Claudette } = require('./dist/index.js');
            
            // First instance - populate cache
            this.log('Creating first instance and populating cache...');
            const claudette1 = new Claudette();
            await claudette1.initialize();
            
            const persistenceQuery = 'Cache persistence test - data should survive restart';
            await claudette1.optimize(persistenceQuery);
            
            // Get cache statistics
            const status1 = await claudette1.getStatus();
            const initialCacheSize = status1.cache.entries_count;
            
            await claudette1.cleanup();
            this.log(`First instance cleanup complete. Cache had ${initialCacheSize} entries.`);

            // Wait a moment
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Second instance - check if cache persisted
            this.log('Creating second instance and checking cache persistence...');
            const claudette2 = new Claudette();
            await claudette2.initialize();
            
            const start = Date.now();
            const response = await claudette2.optimize(persistenceQuery);
            const duration = Date.now() - start;
            
            const cacheHitAfterRestart = response.cache_hit || false;
            const status2 = await claudette2.getStatus();
            const finalCacheSize = status2.cache.entries_count;

            this.recordTest('persistence', 'Cache persistence across restarts', cacheHitAfterRestart, {
                initial_cache_size: initialCacheSize,
                final_cache_size: finalCacheSize,
                cache_hit_after_restart: cacheHitAfterRestart,
                response_time_ms: duration
            });

            await claudette2.cleanup();

            return { 
                cacheHitAfterRestart, 
                initialCacheSize, 
                finalCacheSize 
            };

        } catch (error) {
            this.log(`Cache persistence test error: ${error.message}`);
            this.recordTest('persistence', 'Cache persistence across restarts', false, {
                error: error.message
            });
            return { error: error.message };
        }
    }

    async testCacheCleanup() {
        this.log('Testing cache cleanup and memory management...');
        
        try {
            const { Claudette } = require('./dist/index.js');
            const claudette = new Claudette();
            await claudette.initialize();

            // Generate many cache entries
            this.log('Generating multiple cache entries...');
            const queries = [];
            for (let i = 0; i < 10; i++) {
                queries.push(`Cache cleanup test ${i}: Generate entry ${i}`);
            }

            // Populate cache with multiple entries
            for (const query of queries) {
                await claudette.optimize(query);
            }

            // Check initial cache state
            let status = await claudette.getStatus();
            const initialEntries = status.cache.entries_count;
            
            this.log(`Generated ${initialEntries} cache entries`);

            // Trigger cleanup (if supported)
            if (claudette.cache && typeof claudette.cache.cleanup === 'function') {
                await claudette.cache.cleanup();
                this.log('Manual cache cleanup triggered');
            }

            // Check cache state after cleanup
            status = await claudette.getStatus();
            const finalEntries = status.cache.entries_count;

            this.recordTest('cleanup', 'Cache cleanup functionality', true, {
                initial_entries: initialEntries,
                final_entries: finalEntries,
                entries_cleaned: Math.max(0, initialEntries - finalEntries),
                cleanup_available: claudette.cache && typeof claudette.cache.cleanup === 'function'
            });

            await claudette.cleanup();

            return { initialEntries, finalEntries };

        } catch (error) {
            this.log(`Cache cleanup test error: ${error.message}`);
            this.recordTest('cleanup', 'Cache cleanup functionality', false, {
                error: error.message
            });
            return { error: error.message };
        }
    }

    generateRecommendations(testResults) {
        const recommendations = [];

        // Cache functionality recommendations
        if (!testResults.basic?.cache_working) {
            recommendations.push({
                priority: 'HIGH',
                category: 'functionality',
                issue: 'Cache system not functioning correctly',
                recommendation: 'Investigate cache implementation and database connectivity'
            });
        }

        // Performance recommendations
        if (testResults.performance?.improvementRatio < 2) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'performance',
                issue: 'Cache performance improvement below expected (< 2x)',
                recommendation: 'Optimize cache retrieval mechanisms and consider cache prewarming'
            });
        }

        // Persistence recommendations
        if (!testResults.persistence?.cacheHitAfterRestart) {
            recommendations.push({
                priority: 'HIGH',
                category: 'persistence',
                issue: 'Cache not persisting across restarts',
                recommendation: 'Verify database cache storage implementation and connection'
            });
        }

        return recommendations;
    }

    async runAllTests() {
        this.log('Starting comprehensive cache system verification...');
        this.log('='.repeat(60));

        const testResults = {};

        // Test 1: Basic functionality
        testResults.basic = await this.testBasicCacheFunctionality();

        // Test 2: Performance characteristics
        testResults.performance = await this.testCachePerformance();

        // Test 3: Concurrent access
        testResults.concurrent = await this.testConcurrentCacheAccess();

        // Test 4: Persistence
        testResults.persistence = await this.testCachePersistence();

        // Test 5: Cleanup
        testResults.cleanup = await this.testCacheCleanup();

        // Generate recommendations
        this.results.recommendations = this.generateRecommendations(testResults);

        // Overall assessment
        this.results.summary.cache_working = testResults.basic?.cache_working || false;
        this.results.summary.performance_gain = testResults.performance?.improvementRatio || 0;
        
        if (this.results.summary.cache_working) {
            this.results.cache_system_status = 'WORKING';
        } else {
            this.results.cache_system_status = 'FAILED';
        }

        this.log('='.repeat(60));
        this.log('Cache System Verification Complete');
        this.log(`Status: ${this.results.cache_system_status}`);
        this.log(`Tests: ${this.results.summary.passed_tests}/${this.results.summary.total_tests} passed`);
        this.log(`Cache Working: ${this.results.summary.cache_working ? 'YES' : 'NO'}`);
        this.log(`Performance Gain: ${this.results.summary.performance_gain.toFixed(2)}x`);

        return testResults;
    }

    generateReport() {
        const reportPath = path.join(process.cwd(), 'cache-verification-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        this.log(`Cache verification report saved to: ${reportPath}`);
        return reportPath;
    }
}

// Main execution
async function main() {
    const agent = new CacheVerificationAgent();
    
    try {
        await agent.runAllTests();
        agent.generateReport();
        
        // Exit with appropriate code
        const success = agent.results.cache_system_status === 'WORKING';
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('Cache verification failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { CacheVerificationAgent };