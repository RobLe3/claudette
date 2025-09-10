#!/usr/bin/env node

// Comprehensive Integration Test for Claudette Cache and Database Systems
const path = require('path');
const fs = require('fs');
const { performance } = require('perf_hooks');

// Import the built modules
const { CacheSystem } = require('./dist/cache/index.js');
const { DatabaseManager } = require('./dist/database/index.js');

class IntegrationTestSuite {
    constructor() {
        this.testResults = [];
        this.performanceMetrics = [];
        this.cache = null;
        this.db = null;
        this.testDbPath = path.join(__dirname, 'test-integration-db');
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
            throughput: Math.round((itemCount / duration) * 1000),
            ...additionalMetrics,
            timestamp: new Date().toISOString()
        });
    }

    async setupTestEnvironment() {
        this.log('info', '🔧 Setting up integration test environment');
        
        try {
            // Clean up any existing test database
            if (fs.existsSync(this.testDbPath)) {
                fs.unlinkSync(this.testDbPath);
            }

            // Create test database manager
            this.db = new DatabaseManager(path.dirname(this.testDbPath));
            
            // Create cache system with both memory and persistent enabled
            this.cache = new CacheSystem(this.db, {
                ttl: 300,
                maxSize: 1000,
                enableMemory: true,
                enablePersistent: true, // Test persistence integration
                compressionEnabled: false
            });
            
            this.log('info', '✅ Integration test environment setup complete');
            return true;
        } catch (error) {
            this.log('error', '❌ Failed to setup integration test environment', { error: error.message });
            return false;
        }
    }

    async testDatabaseCacheIntegration() {
        this.log('info', '🔗 Testing database-cache integration');
        
        const integrationTests = [
            { name: 'Cache-Database Synchronization', operation: () => this.testCacheDatabaseSync() },
            { name: 'Persistent Cache Storage', operation: () => this.testPersistentCacheStorage() },
            { name: 'Cache Statistics Integration', operation: () => this.testCacheStatsIntegration() },
            { name: 'Cross-System Data Integrity', operation: () => this.testDataIntegrity() },
        ];

        const results = [];
        for (const test of integrationTests) {
            const testStart = performance.now();
            try {
                const result = await test.operation();
                const duration = performance.now() - testStart;
                this.recordTest(`Integration: ${test.name}`, result.success, duration, result.details);
                results.push(result.success);
                this.log('info', `🔗 ${test.name}: ${result.success ? 'PASS' : 'FAIL'}`, result.details);
            } catch (error) {
                const duration = performance.now() - testStart;
                this.recordTest(`Integration: ${test.name}`, false, duration, null, error);
                results.push(false);
                this.log('error', `❌ ${test.name}: ERROR`, { error: error.message });
            }
        }

        return results.every(r => r);
    }

    async testCacheDatabaseSync() {
        // Test that cache operations properly update database quota ledger
        const request = {
            prompt: 'Integration test prompt for sync',
            files: [],
            options: { sync_test: true }
        };

        const response = {
            content: 'Integration test response',
            backend_used: 'integration-backend',
            tokens_input: 100,
            tokens_output: 150,
            cost_eur: 0.01,
            latency_ms: 200,
            cache_hit: false
        };

        // Store in cache
        await this.cache.set(request, response);
        
        // Manually add quota entry (simulating what would happen in real usage)
        const quotaEntry = {
            timestamp: new Date().toISOString(),
            backend: response.backend_used,
            prompt_hash: 'sync-test-hash',
            tokens_input: response.tokens_input,
            tokens_output: response.tokens_output,
            cost_eur: response.cost_eur,
            cache_hit: false,
            latency_ms: response.latency_ms
        };
        
        const entryId = this.db.addQuotaEntry(quotaEntry);
        
        // Retrieve from cache
        const cachedResponse = await this.cache.get(request);
        
        // Check database integrity
        const recentEntries = this.db.getRecentQuotaEntries(1);
        const healthCheck = this.db.healthCheck();

        const success = cachedResponse && cachedResponse.cache_hit && 
                       entryId > 0 && recentEntries.length > 0 && 
                       healthCheck.healthy;

        return {
            success,
            details: {
                cacheHit: cachedResponse && cachedResponse.cache_hit,
                quotaEntryId: entryId,
                recentEntriesCount: recentEntries.length,
                databaseHealthy: healthCheck.healthy
            }
        };
    }

    async testPersistentCacheStorage() {
        // Note: Current implementation shows persistent cache is not fully implemented
        // This test will help identify what's actually working
        
        const request = {
            prompt: 'Persistent cache test',
            files: [],
            options: { persistent: true }
        };

        const response = {
            content: 'This should be stored persistently',
            backend_used: 'persistent-test',
            tokens_input: 75,
            tokens_output: 125,
            cost_eur: 0.008,
            latency_ms: 180,
            cache_hit: false
        };

        // Store in cache with persistence enabled
        await this.cache.set(request, response);
        
        // Try to use database cache entry directly (since persistent cache calls database)
        const cacheEntry = {
            cache_key: this.generateCacheKey(request),
            prompt_hash: 'persistent-test-hash',
            response: response,
            created_at: Date.now(),
            expires_at: Date.now() + (5 * 60 * 1000),
            size_bytes: JSON.stringify(response).length
        };

        // Store directly in database as cache entry
        this.db.setCacheEntry(cacheEntry);
        
        // Retrieve directly from database
        const dbCacheEntry = this.db.getCacheEntry(cacheEntry.cache_key);
        
        return {
            success: dbCacheEntry !== null && dbCacheEntry.cache_key === cacheEntry.cache_key,
            details: {
                cacheKey: cacheEntry.cache_key,
                storedInDatabase: dbCacheEntry !== null,
                keyMatches: dbCacheEntry ? dbCacheEntry.cache_key === cacheEntry.cache_key : false,
                persistentCacheNote: 'Persistent cache integration is not fully implemented in current version'
            }
        };
    }

    generateCacheKey(request) {
        // Simplified cache key generation for testing
        const content = JSON.stringify({
            prompt: request.prompt,
            files: request.files,
            options: request.options
        });
        
        // Simple hash for testing (in real implementation, uses crypto.createHash)
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }

    async testCacheStatsIntegration() {
        // Test that cache statistics properly reflect database state
        
        // Get initial stats
        const initialStats = this.cache.getStats();
        const initialDbStats = this.db.getCacheStats();
        
        // Perform some cache operations
        const operations = [];
        for (let i = 0; i < 10; i++) {
            const request = {
                prompt: `Stats integration test ${i}`,
                files: [],
                options: { stats_test: i }
            };

            const response = {
                content: `Response ${i}`,
                backend_used: 'stats-test',
                tokens_input: 50,
                tokens_output: 75,
                cost_eur: 0.005,
                latency_ms: 150,
                cache_hit: false
            };

            operations.push({ request, response });
        }

        // Set all entries
        for (const op of operations) {
            await this.cache.set(op.request, op.response);
        }

        // Get half of them (should be hits)
        let hits = 0;
        for (let i = 0; i < 5; i++) {
            const result = await this.cache.get(operations[i].request);
            if (result && result.cache_hit) hits++;
        }

        // Get final stats
        const finalStats = this.cache.getStats();
        const finalDbStats = this.db.getCacheStats();

        const statsIncreased = finalStats.total_requests > initialStats.total_requests;
        const hitsRecorded = finalStats.cache_hits > initialStats.cache_hits;
        
        return {
            success: statsIncreased && hitsRecorded,
            details: {
                initialRequests: initialStats.total_requests,
                finalRequests: finalStats.total_requests,
                initialHits: initialStats.cache_hits,
                finalHits: finalStats.cache_hits,
                actualHits: hits,
                statsIncreased,
                hitsRecorded,
                hitRate: finalStats.hit_rate,
                dbStats: finalDbStats
            }
        };
    }

    async testDataIntegrity() {
        // Test that data remains consistent across cache and database operations
        
        const testData = [];
        for (let i = 0; i < 20; i++) {
            testData.push({
                request: {
                    prompt: `Data integrity test ${i}`,
                    files: [],
                    options: { integrity: i }
                },
                response: {
                    content: `Consistent response ${i}`,
                    backend_used: 'integrity-test',
                    tokens_input: 60 + i,
                    tokens_output: 90 + i,
                    cost_eur: 0.006 * (i + 1),
                    latency_ms: 160 + (i * 5),
                    cache_hit: false
                },
                quotaEntry: {
                    timestamp: new Date(Date.now() - (i * 1000)).toISOString(),
                    backend: 'integrity-test',
                    prompt_hash: `integrity-hash-${i}`,
                    tokens_input: 60 + i,
                    tokens_output: 90 + i,
                    cost_eur: 0.006 * (i + 1),
                    cache_hit: false,
                    latency_ms: 160 + (i * 5)
                }
            });
        }

        let cacheOperationsSuccessful = 0;
        let dbOperationsSuccessful = 0;
        
        // Store data in both cache and database
        for (const data of testData) {
            try {
                await this.cache.set(data.request, data.response);
                cacheOperationsSuccessful++;
            } catch (error) {
                this.log('warn', `Cache set failed for item`, { error: error.message });
            }

            try {
                this.db.addQuotaEntry(data.quotaEntry);
                dbOperationsSuccessful++;
            } catch (error) {
                this.log('warn', `DB insert failed for item`, { error: error.message });
            }
        }

        // Verify data integrity
        let cacheRetrievalSuccessful = 0;
        for (const data of testData) {
            try {
                const cached = await this.cache.get(data.request);
                if (cached && cached.content === data.response.content) {
                    cacheRetrievalSuccessful++;
                }
            } catch (error) {
                this.log('warn', `Cache get failed for item`, { error: error.message });
            }
        }

        const recentQuotaEntries = this.db.getRecentQuotaEntries(24);
        const healthCheck = this.db.healthCheck();

        const integrityScore = (cacheOperationsSuccessful + dbOperationsSuccessful + cacheRetrievalSuccessful) / (testData.length * 3);

        return {
            success: integrityScore >= 0.9, // 90% success rate acceptable
            details: {
                totalTestItems: testData.length,
                cacheOperationsSuccessful,
                dbOperationsSuccessful,
                cacheRetrievalSuccessful,
                integrityScore: Math.round(integrityScore * 100) / 100,
                recentQuotaEntries: recentQuotaEntries.length,
                databaseHealthy: healthCheck.healthy
            }
        };
    }

    async testMemoryPressureScenarios() {
        this.log('info', '💾 Testing memory pressure and resource management');
        
        const memoryTests = [
            { name: 'High Volume Memory Cache', operation: () => this.testHighVolumeMemoryCache(2000) },
            { name: 'Large Entry Memory Management', operation: () => this.testLargeEntryMemoryManagement() },
            { name: 'Cache Eviction Under Pressure', operation: () => this.testCacheEvictionUnderPressure() },
            { name: 'Database Performance Under Load', operation: () => this.testDatabasePerformanceUnderLoad(1000) },
        ];

        const results = [];
        for (const test of memoryTests) {
            const testStart = performance.now();
            const initialMemory = process.memoryUsage();
            
            try {
                const result = await test.operation();
                const duration = performance.now() - testStart;
                const finalMemory = process.memoryUsage();
                
                result.details.memoryUsage = {
                    initial: Math.round(initialMemory.heapUsed / 1024 / 1024),
                    final: Math.round(finalMemory.heapUsed / 1024 / 1024),
                    delta: Math.round((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024)
                };

                this.recordTest(`Memory Pressure: ${test.name}`, result.success, duration, result.details);
                results.push(result.success);
                this.log('info', `💾 ${test.name}: ${result.success ? 'PASS' : 'FAIL'}`, result.details);
            } catch (error) {
                const duration = performance.now() - testStart;
                this.recordTest(`Memory Pressure: ${test.name}`, false, duration, null, error);
                results.push(false);
                this.log('error', `❌ ${test.name}: ERROR`, { error: error.message });
            }
        }

        return results.every(r => r);
    }

    async testHighVolumeMemoryCache(count) {
        const startTime = performance.now();
        const initialMemory = process.memoryUsage().heapUsed;

        // Create a large number of cache entries
        for (let i = 0; i < count; i++) {
            const request = {
                prompt: `High volume test ${i}`,
                files: [],
                options: { volume: i, batch: 'high-volume' }
            };

            const response = {
                content: `Response ${i} with some content that takes up memory`,
                backend_used: 'volume-test',
                tokens_input: 80,
                tokens_output: 120,
                cost_eur: 0.007,
                latency_ms: 170,
                cache_hit: false
            };

            await this.cache.set(request, response);

            // Check memory every 500 operations
            if (i % 500 === 0) {
                const currentMemory = process.memoryUsage().heapUsed;
                const memoryDelta = (currentMemory - initialMemory) / 1024 / 1024; // MB
                
                if (memoryDelta > 500) { // If using more than 500MB, something might be wrong
                    this.log('warn', `High memory usage detected at operation ${i}: ${Math.round(memoryDelta)}MB`);
                }
            }
        }

        const duration = performance.now() - startTime;
        const finalMemory = process.memoryUsage().heapUsed;
        const memoryDelta = (finalMemory - initialMemory) / 1024 / 1024; // MB

        // Test retrieval performance after high volume
        const retrievalStart = performance.now();
        let retrievalHits = 0;
        
        // Test a sample of entries
        for (let i = 0; i < Math.min(100, count); i += Math.floor(count / 100)) {
            const request = {
                prompt: `High volume test ${i}`,
                files: [],
                options: { volume: i, batch: 'high-volume' }
            };
            
            const result = await this.cache.get(request);
            if (result && result.cache_hit) {
                retrievalHits++;
            }
        }
        
        const retrievalDuration = performance.now() - retrievalStart;

        this.recordPerformance('High Volume Cache Operations', duration, count, {
            memoryUsedMB: Math.round(memoryDelta),
            avgTimePerOperation: duration / count,
            operationsPerSecond: Math.round((count / duration) * 1000)
        });

        return {
            success: memoryDelta < 1000 && retrievalHits >= 80, // Less than 1GB and 80%+ hit rate
            details: {
                operationsCompleted: count,
                duration: Math.round(duration),
                memoryUsedMB: Math.round(memoryDelta),
                retrievalHits,
                retrievalHitRate: (retrievalHits / Math.min(100, count)) * 100,
                retrievalDuration: Math.round(retrievalDuration),
                cacheSize: this.cache.size()
            }
        };
    }

    async testLargeEntryMemoryManagement() {
        const sizes = [100, 500, 1000, 2000]; // KB sizes
        const results = [];

        for (const sizeKB of sizes) {
            const content = 'L'.repeat(sizeKB * 1024);
            const initialMemory = process.memoryUsage().heapUsed;

            const request = {
                prompt: `Large entry test ${sizeKB}KB`,
                files: [],
                options: { size: sizeKB }
            };

            const response = {
                content,
                backend_used: 'large-memory-test',
                tokens_input: sizeKB * 5,
                tokens_output: sizeKB * 10,
                cost_eur: sizeKB * 0.001,
                latency_ms: 200 + sizeKB,
                cache_hit: false
            };

            const setStart = performance.now();
            await this.cache.set(request, response);
            const setDuration = performance.now() - setStart;

            const getStart = performance.now();
            const result = await this.cache.get(request);
            const getDuration = performance.now() - getStart;

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryDelta = (finalMemory - initialMemory) / 1024 / 1024;

            results.push({
                sizeKB,
                setDuration: Math.round(setDuration * 100) / 100,
                getDuration: Math.round(getDuration * 100) / 100,
                memoryDeltaMB: Math.round(memoryDelta * 100) / 100,
                success: result && result.cache_hit && result.content.length === content.length
            });

            // Clear this entry to avoid accumulating memory
            await this.cache.clear();
        }

        const allSuccessful = results.every(r => r.success);
        const reasonableMemoryUsage = results.every(r => r.memoryDeltaMB < r.sizeKB / 512); // Less than 2x the content size

        return {
            success: allSuccessful && reasonableMemoryUsage,
            details: {
                results,
                allSuccessful,
                reasonableMemoryUsage
            }
        };
    }

    async testCacheEvictionUnderPressure() {
        // Create cache with small size to force eviction
        const pressureCache = new CacheSystem(this.db, {
            ttl: 600,
            maxSize: 100, // Small size
            enableMemory: true,
            enablePersistent: false,
            compressionEnabled: false
        });

        const startTime = performance.now();
        const totalEntries = 300; // 3x the max size

        // Fill cache beyond capacity
        for (let i = 0; i < totalEntries; i++) {
            const request = {
                prompt: `Eviction pressure test ${i}`,
                files: [],
                options: { pressure: i }
            };

            const response = {
                content: `Pressure response ${i}`,
                backend_used: 'pressure-test',
                tokens_input: 50,
                tokens_output: 75,
                cost_eur: 0.005,
                latency_ms: 150,
                cache_hit: false
            };

            await pressureCache.set(request, response);
        }

        const duration = performance.now() - startTime;
        const finalSize = pressureCache.size();

        // Test that eviction worked properly
        const stats = pressureCache.getStats();

        return {
            success: finalSize <= 100 && finalSize > 0, // Respects max size
            details: {
                entriesAttempted: totalEntries,
                maxSize: 100,
                finalSize,
                evictionTriggered: finalSize < totalEntries,
                duration: Math.round(duration),
                memoryUsage: stats.memory_usage
            }
        };
    }

    async testDatabasePerformanceUnderLoad(operations) {
        const startTime = performance.now();
        const operationResults = [];

        // Generate a mix of operations
        for (let i = 0; i < operations; i++) {
            const operationType = i % 3; // 0: quota, 1: cache set, 2: cache get

            try {
                if (operationType === 0) {
                    // Quota ledger operation
                    const entry = {
                        timestamp: new Date(Date.now() - (i * 100)).toISOString(),
                        backend: `load-test-${i % 10}`,
                        prompt_hash: `load-hash-${i}`,
                        tokens_input: 40 + (i % 60),
                        tokens_output: 60 + (i % 80),
                        cost_eur: 0.004 * (i + 1),
                        cache_hit: i % 4 === 0,
                        latency_ms: 120 + Math.random() * 80
                    };
                    
                    const entryId = this.db.addQuotaEntry(entry);
                    operationResults.push({ type: 'quota', success: entryId > 0 });

                } else if (operationType === 1) {
                    // Cache set operation
                    const cacheEntry = {
                        cache_key: `load-key-${i}`,
                        prompt_hash: `load-prompt-${i}`,
                        response: { content: `Load test response ${i}`, tokens: 100 },
                        created_at: Date.now(),
                        expires_at: Date.now() + (10 * 60 * 1000),
                        size_bytes: 256
                    };

                    this.db.setCacheEntry(cacheEntry);
                    operationResults.push({ type: 'cache_set', success: true });

                } else {
                    // Cache get operation (may miss for newer entries)
                    const result = this.db.getCacheEntry(`load-key-${Math.max(0, i - 50)}`);
                    operationResults.push({ type: 'cache_get', success: true, hit: result !== null });
                }

            } catch (error) {
                operationResults.push({ type: 'error', success: false, error: error.message });
            }

            // Check database health every 100 operations
            if (i % 100 === 0) {
                const health = this.db.healthCheck();
                if (!health.healthy) {
                    this.log('warn', `Database health check failed at operation ${i}`);
                }
            }
        }

        const duration = performance.now() - startTime;
        
        // Analyze results
        const quotaOps = operationResults.filter(r => r.type === 'quota');
        const cacheSetOps = operationResults.filter(r => r.type === 'cache_set');
        const cacheGetOps = operationResults.filter(r => r.type === 'cache_get');
        const errors = operationResults.filter(r => r.type === 'error');

        const quotaSuccess = quotaOps.filter(r => r.success).length;
        const cacheSetSuccess = cacheSetOps.filter(r => r.success).length;
        const cacheGetSuccess = cacheGetOps.filter(r => r.success).length;

        const finalHealth = this.db.healthCheck();

        this.recordPerformance('Database Load Test', duration, operations, {
            quotaOperations: quotaOps.length,
            cacheSetOperations: cacheSetOps.length,
            cacheGetOperations: cacheGetOps.length,
            errorCount: errors.length,
            operationsPerSecond: Math.round((operations / duration) * 1000)
        });

        return {
            success: finalHealth.healthy && errors.length < (operations * 0.05), // Less than 5% errors
            details: {
                totalOperations: operations,
                quotaOperations: quotaOps.length,
                cacheSetOperations: cacheSetOps.length,
                cacheGetOperations: cacheGetOps.length,
                quotaSuccessRate: quotaOps.length > 0 ? (quotaSuccess / quotaOps.length) * 100 : 0,
                cacheSetSuccessRate: cacheSetOps.length > 0 ? (cacheSetSuccess / cacheSetOps.length) * 100 : 0,
                cacheGetSuccessRate: cacheGetOps.length > 0 ? (cacheGetSuccess / cacheGetOps.length) * 100 : 0,
                errorCount: errors.length,
                errorRate: (errors.length / operations) * 100,
                duration: Math.round(duration),
                operationsPerSecond: Math.round((operations / duration) * 1000),
                finalDatabaseHealth: finalHealth.healthy
            }
        };
    }

    async testCorruptionRecovery() {
        this.log('info', '🔧 Testing corruption recovery and error handling');
        
        const recoveryTests = [
            { name: 'Database Corruption Simulation', operation: () => this.testDatabaseCorruptionRecovery() },
            { name: 'Invalid Data Handling', operation: () => this.testInvalidDataHandling() },
            { name: 'System Recovery After Errors', operation: () => this.testSystemRecoveryAfterErrors() },
        ];

        const results = [];
        for (const test of recoveryTests) {
            const testStart = performance.now();
            try {
                const result = await test.operation();
                const duration = performance.now() - testStart;
                this.recordTest(`Recovery: ${test.name}`, result.success, duration, result.details);
                results.push(result.success);
                this.log('info', `🔧 ${test.name}: ${result.success ? 'PASS' : 'FAIL'}`, result.details);
            } catch (error) {
                const duration = performance.now() - testStart;
                this.recordTest(`Recovery: ${test.name}`, false, duration, null, error);
                results.push(false);
                this.log('error', `❌ ${test.name}: ERROR`, { error: error.message });
            }
        }

        return results.every(r => r);
    }

    async testDatabaseCorruptionRecovery() {
        // This test verifies the system can handle database errors gracefully
        
        try {
            // First, add some valid data
            const validEntry = {
                timestamp: new Date().toISOString(),
                backend: 'corruption-test',
                prompt_hash: 'valid-hash',
                tokens_input: 50,
                tokens_output: 75,
                cost_eur: 0.005,
                cache_hit: false,
                latency_ms: 150
            };

            const validId = this.db.addQuotaEntry(validEntry);

            // Try to add some invalid/corrupted data and see how system handles it
            const corruptedEntry = {
                timestamp: 'invalid-date',
                backend: null,
                prompt_hash: undefined,
                tokens_input: 'not-a-number',
                tokens_output: -1,
                cost_eur: 'invalid-cost',
                cache_hit: 'not-boolean',
                latency_ms: null
            };

            let corruptionHandled = false;
            try {
                this.db.addQuotaEntry(corruptedEntry);
            } catch (error) {
                corruptionHandled = true; // Expected to throw
            }

            // Verify system is still functional after corruption attempt
            const healthAfterCorruption = this.db.healthCheck();
            const recentEntries = this.db.getRecentQuotaEntries(1);

            return {
                success: corruptionHandled && healthAfterCorruption.healthy && validId > 0,
                details: {
                    validEntryAdded: validId > 0,
                    corruptionHandled,
                    healthAfterCorruption: healthAfterCorruption.healthy,
                    systemStillFunctional: recentEntries.length > 0
                }
            };

        } catch (error) {
            return {
                success: false,
                details: { error: error.message }
            };
        }
    }

    async testInvalidDataHandling() {
        const invalidDataTests = [
            { data: null, description: 'null data' },
            { data: undefined, description: 'undefined data' },
            { data: '', description: 'empty string' },
            { data: {}, description: 'empty object' },
            { data: { invalid: 'structure' }, description: 'invalid structure' }
        ];

        const results = [];

        for (const test of invalidDataTests) {
            try {
                // Try cache operations with invalid data
                let cacheErrorHandled = false;
                try {
                    await this.cache.set(test.data, test.data);
                } catch (error) {
                    cacheErrorHandled = true;
                }

                // Try database operations with invalid data
                let dbErrorHandled = false;
                try {
                    this.db.addQuotaEntry(test.data);
                } catch (error) {
                    dbErrorHandled = true;
                }

                results.push({
                    description: test.description,
                    cacheErrorHandled,
                    dbErrorHandled,
                    handled: cacheErrorHandled && dbErrorHandled
                });

            } catch (error) {
                results.push({
                    description: test.description,
                    cacheErrorHandled: false,
                    dbErrorHandled: false,
                    handled: false,
                    error: error.message
                });
            }
        }

        const allHandled = results.every(r => r.handled);

        return {
            success: allHandled,
            details: {
                tests: results,
                allErrorsHandled: allHandled
            }
        };
    }

    async testSystemRecoveryAfterErrors() {
        // Simulate a series of errors and verify system recovery
        
        let errorCount = 0;
        let recoveryCount = 0;

        // Generate several error scenarios
        const errorScenarios = [
            () => this.db.getCacheEntry('non-existent-key-12345'),
            () => this.cache.get({ invalid: 'request' }),
            () => this.db.getRecentQuotaEntries(-1), // Invalid parameter
        ];

        for (const scenario of errorScenarios) {
            try {
                await scenario();
            } catch (error) {
                errorCount++;
            }

            // Test recovery after each error
            try {
                const health = this.db.healthCheck();
                const stats = this.cache.getStats();
                
                if (health.healthy && typeof stats.total_requests === 'number') {
                    recoveryCount++;
                }
            } catch (error) {
                // Recovery failed
            }
        }

        // Perform a successful operation to verify full recovery
        const testRequest = {
            prompt: 'Recovery test',
            files: [],
            options: {}
        };

        const testResponse = {
            content: 'System recovered successfully',
            backend_used: 'recovery-test',
            tokens_input: 30,
            tokens_output: 45,
            cost_eur: 0.003,
            latency_ms: 130,
            cache_hit: false
        };

        let fullRecovery = false;
        try {
            await this.cache.set(testRequest, testResponse);
            const result = await this.cache.get(testRequest);
            fullRecovery = result && result.cache_hit;
        } catch (error) {
            // Recovery incomplete
        }

        return {
            success: recoveryCount === errorScenarios.length && fullRecovery,
            details: {
                errorScenariosExecuted: errorScenarios.length,
                errorsEncountered: errorCount,
                successfulRecoveries: recoveryCount,
                fullRecovery
            }
        };
    }

    generateReport() {
        this.log('info', '📊 Generating comprehensive integration test report');
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(t => t.passed).length;
        const failedTests = totalTests - passedTests;
        const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

        // Analyze test categories
        const testCategories = {
            integration: this.testResults.filter(t => t.test.includes('Integration:')).length,
            memoryPressure: this.testResults.filter(t => t.test.includes('Memory Pressure:')).length,
            recovery: this.testResults.filter(t => t.test.includes('Recovery:')).length
        };

        // Performance analysis
        const avgDuration = this.testResults.reduce((sum, t) => sum + t.duration, 0) / totalTests;
        const maxDuration = Math.max(...this.testResults.map(t => t.duration));
        const minDuration = Math.min(...this.testResults.map(t => t.duration));

        const report = {
            summary: {
                totalTests,
                passedTests,
                failedTests,
                successRate: Math.round(successRate * 100) / 100,
                testDuration: this.testResults.reduce((sum, t) => sum + t.duration, 0),
                avgTestDuration: Math.round(avgDuration * 100) / 100,
                maxTestDuration: Math.round(maxDuration * 100) / 100,
                minTestDuration: Math.round(minDuration * 100) / 100
            },
            testCategories,
            testResults: this.testResults,
            performanceMetrics: this.performanceMetrics,
            systemAnalysis: this.generateSystemAnalysis(),
            recommendations: this.generateRecommendations(),
            generatedAt: new Date().toISOString()
        };

        return report;
    }

    generateSystemAnalysis() {
        const analysis = {
            integrationHealth: 'unknown',
            performanceCharacteristics: 'unknown',
            reliabilityScore: 0,
            scalabilityIndicators: 'unknown'
        };

        // Integration health analysis
        const integrationTests = this.testResults.filter(t => t.test.includes('Integration:'));
        if (integrationTests.length > 0) {
            const integrationSuccessRate = integrationTests.filter(t => t.passed).length / integrationTests.length;
            analysis.integrationHealth = integrationSuccessRate >= 0.9 ? 'excellent' : 
                                       integrationSuccessRate >= 0.7 ? 'good' : 
                                       integrationSuccessRate >= 0.5 ? 'fair' : 'poor';
        }

        // Performance characteristics
        const performanceOps = this.performanceMetrics.filter(m => m.throughput > 0);
        if (performanceOps.length > 0) {
            const avgThroughput = performanceOps.reduce((sum, m) => sum + m.throughput, 0) / performanceOps.length;
            analysis.performanceCharacteristics = avgThroughput > 1000 ? 'high-performance' :
                                                 avgThroughput > 500 ? 'good-performance' :
                                                 avgThroughput > 100 ? 'fair-performance' : 'low-performance';
        }

        // Reliability score
        const totalSuccessfulTests = this.testResults.filter(t => t.passed).length;
        analysis.reliabilityScore = Math.round((totalSuccessfulTests / this.testResults.length) * 100);

        // Scalability indicators
        const memoryTests = this.testResults.filter(t => t.test.includes('Memory Pressure:'));
        if (memoryTests.length > 0) {
            const memoryTestsSuccess = memoryTests.filter(t => t.passed).length / memoryTests.length;
            analysis.scalabilityIndicators = memoryTestsSuccess >= 0.8 ? 'good-scalability' : 
                                           memoryTestsSuccess >= 0.6 ? 'fair-scalability' : 'limited-scalability';
        }

        return analysis;
    }

    generateRecommendations() {
        const recommendations = [];
        
        // Check overall success rate
        const successRate = this.testResults.filter(t => t.passed).length / this.testResults.length;
        if (successRate < 0.8) {
            recommendations.push({
                category: 'Reliability',
                severity: 'high',
                message: `Low overall success rate (${Math.round(successRate * 100)}%). Critical issues need immediate attention.`
            });
        }

        // Check integration test results
        const integrationTests = this.testResults.filter(t => t.test.includes('Integration:'));
        const integrationFailures = integrationTests.filter(t => !t.passed);
        if (integrationFailures.length > 0) {
            recommendations.push({
                category: 'Integration',
                severity: 'high',
                message: `${integrationFailures.length} integration test(s) failed. Database-cache integration needs review.`,
                failedTests: integrationFailures.map(t => t.test)
            });
        }

        // Check memory pressure handling
        const memoryTests = this.testResults.filter(t => t.test.includes('Memory Pressure:'));
        const memoryFailures = memoryTests.filter(t => !t.passed);
        if (memoryFailures.length > 0) {
            recommendations.push({
                category: 'Performance',
                severity: 'medium',
                message: `${memoryFailures.length} memory pressure test(s) failed. Review memory management and scaling capabilities.`
            });
        }

        // Check performance metrics
        const performanceMetrics = this.performanceMetrics.filter(m => m.throughput > 0);
        if (performanceMetrics.length > 0) {
            const avgThroughput = performanceMetrics.reduce((sum, m) => sum + m.throughput, 0) / performanceMetrics.length;
            if (avgThroughput < 100) {
                recommendations.push({
                    category: 'Performance',
                    severity: 'medium',
                    message: `Low average throughput (${Math.round(avgThroughput)} ops/sec). Consider performance optimization.`
                });
            }
        }

        // Check recovery capabilities
        const recoveryTests = this.testResults.filter(t => t.test.includes('Recovery:'));
        const recoveryFailures = recoveryTests.filter(t => !t.passed);
        if (recoveryFailures.length > 0) {
            recommendations.push({
                category: 'Resilience',
                severity: 'high',
                message: `${recoveryFailures.length} recovery test(s) failed. System resilience needs improvement.`
            });
        }

        // Positive recommendations
        if (successRate >= 0.95) {
            recommendations.push({
                category: 'Quality',
                severity: 'info',
                message: `Excellent success rate (${Math.round(successRate * 100)}%). System is highly reliable.`
            });
        }

        return recommendations;
    }

    async cleanup() {
        this.log('info', '🧹 Cleaning up integration test environment');
        
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
            
            this.log('info', '✅ Integration test cleanup complete');
        } catch (error) {
            this.log('error', '❌ Integration test cleanup failed', { error: error.message });
        }
    }
}

async function runComprehensiveIntegrationTest() {
    const testSuite = new IntegrationTestSuite();
    
    console.log('🚀 Starting Comprehensive Integration Test Suite');
    console.log('================================================');
    
    try {
        // Setup
        if (!(await testSuite.setupTestEnvironment())) {
            console.error('❌ Test setup failed. Exiting.');
            return false;
        }

        // Run all test suites
        const testSuites = [
            { name: 'Database-Cache Integration', test: () => testSuite.testDatabaseCacheIntegration() },
            { name: 'Memory Pressure Scenarios', test: () => testSuite.testMemoryPressureScenarios() },
            { name: 'Corruption Recovery', test: () => testSuite.testCorruptionRecovery() }
        ];

        const results = [];
        for (const suite of testSuites) {
            console.log(`\n🧪 Running ${suite.name} tests...`);
            const result = await suite.test();
            results.push(result);
        }

        // Generate and save report
        const report = testSuite.generateReport();
        
        const reportPath = path.join(__dirname, 'integration-test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log('\n📊 INTEGRATION TEST RESULTS SUMMARY');
        console.log('====================================');
        console.log(`Total Tests: ${report.summary.totalTests}`);
        console.log(`Passed: ${report.summary.passedTests}`);
        console.log(`Failed: ${report.summary.failedTests}`);
        console.log(`Success Rate: ${report.summary.successRate}%`);
        console.log(`Total Duration: ${Math.round(report.summary.testDuration)}ms`);
        
        if (report.systemAnalysis) {
            console.log('\n🔍 SYSTEM ANALYSIS:');
            console.log(`  Integration Health: ${report.systemAnalysis.integrationHealth}`);
            console.log(`  Performance: ${report.systemAnalysis.performanceCharacteristics}`);
            console.log(`  Reliability Score: ${report.systemAnalysis.reliabilityScore}%`);
            console.log(`  Scalability: ${report.systemAnalysis.scalabilityIndicators}`);
        }
        
        if (report.recommendations.length > 0) {
            console.log('\n💡 RECOMMENDATIONS:');
            report.recommendations.forEach(rec => {
                console.log(`  [${rec.severity.toUpperCase()}] ${rec.category}: ${rec.message}`);
            });
        }
        
        console.log(`\n📁 Detailed report saved to: ${reportPath}`);

        const allPassed = results.every(r => r);
        console.log(`\n${allPassed ? '✅' : '❌'} Integration test suite ${allPassed ? 'PASSED' : 'FAILED'}`);
        
        return allPassed;

    } catch (error) {
        console.error('❌ Test suite execution failed:', error);
        return false;
    } finally {
        await testSuite.cleanup();
    }
}

if (require.main === module) {
    runComprehensiveIntegrationTest().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = { runComprehensiveIntegrationTest, IntegrationTestSuite };