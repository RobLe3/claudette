#!/usr/bin/env node

// Comprehensive Database System Test for Claudette
const path = require('path');
const fs = require('fs');
const { performance } = require('perf_hooks');

// Import the built modules
const { DatabaseManager } = require('./dist/database/index.js');

class DatabaseTestSuite {
    constructor() {
        this.testResults = [];
        this.performanceMetrics = [];
        this.testDB = null;
        this.testDbPath = path.join(__dirname, 'test-claudette-db');
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
            ...additionalMetrics,
            timestamp: new Date().toISOString()
        });
    }

    async setupTestEnvironment() {
        this.log('info', '🔧 Setting up test environment');
        
        try {
            // Clean up any existing test database
            if (fs.existsSync(this.testDbPath)) {
                fs.unlinkSync(this.testDbPath);
            }

            // Create test database manager
            this.testDB = new DatabaseManager(path.dirname(this.testDbPath));
            
            this.log('info', '✅ Test environment setup complete');
            return true;
        } catch (error) {
            this.log('error', '❌ Failed to setup test environment', { error: error.message });
            return false;
        }
    }

    async testDatabaseInitialization() {
        const testStart = performance.now();
        this.log('info', '🧪 Testing database initialization');

        try {
            // Test database health check
            const healthCheck = this.testDB.healthCheck();
            const duration = performance.now() - testStart;

            if (healthCheck.healthy) {
                this.recordTest('Database Initialization', true, duration, healthCheck);
                this.log('info', '✅ Database initialized successfully', healthCheck);
                return true;
            } else {
                this.recordTest('Database Initialization', false, duration, healthCheck);
                this.log('error', '❌ Database health check failed', healthCheck);
                return false;
            }
        } catch (error) {
            const duration = performance.now() - testStart;
            this.recordTest('Database Initialization', false, duration, null, error);
            this.log('error', '❌ Database initialization failed', { error: error.message });
            return false;
        }
    }

    async testQuotaLedgerOperations() {
        this.log('info', '🧪 Testing quota ledger operations');
        
        const tests = [
            {
                name: 'Single Quota Entry',
                operation: () => this.testSingleQuotaEntry(),
            },
            {
                name: 'Bulk Quota Entries',
                operation: () => this.testBulkQuotaEntries(100),
            },
            {
                name: 'Quota Entry Retrieval',
                operation: () => this.testQuotaEntryRetrieval(),
            }
        ];

        const results = [];
        for (const test of tests) {
            const testStart = performance.now();
            try {
                const result = await test.operation();
                const duration = performance.now() - testStart;
                this.recordTest(`Quota Ledger: ${test.name}`, result.success, duration, result.details);
                results.push(result.success);
                this.log('info', `✅ ${test.name}: ${result.success ? 'PASS' : 'FAIL'}`, result.details);
            } catch (error) {
                const duration = performance.now() - testStart;
                this.recordTest(`Quota Ledger: ${test.name}`, false, duration, null, error);
                results.push(false);
                this.log('error', `❌ ${test.name}: ERROR`, { error: error.message });
            }
        }

        return results.every(r => r);
    }

    async testSingleQuotaEntry() {
        const entry = {
            timestamp: new Date().toISOString(),
            backend: 'test-backend',
            prompt_hash: 'test-hash-123',
            tokens_input: 100,
            tokens_output: 50,
            cost_eur: 0.005,
            cache_hit: false,
            latency_ms: 150.5
        };

        const entryId = this.testDB.addQuotaEntry(entry);
        
        return {
            success: entryId > 0,
            details: { entryId, originalEntry: entry }
        };
    }

    async testBulkQuotaEntries(count) {
        const startTime = performance.now();
        const entries = [];
        
        for (let i = 0; i < count; i++) {
            const entry = {
                timestamp: new Date(Date.now() - i * 1000).toISOString(),
                backend: `backend-${i % 3}`,
                prompt_hash: `hash-${i}`,
                tokens_input: 50 + (i % 100),
                tokens_output: 25 + (i % 50),
                cost_eur: 0.001 * (i + 1),
                cache_hit: i % 4 === 0, // 25% cache hit rate
                latency_ms: 100 + Math.random() * 200
            };
            
            const entryId = this.testDB.addQuotaEntry(entry);
            entries.push(entryId);
        }
        
        const duration = performance.now() - startTime;
        this.recordPerformance('Bulk Quota Insert', duration, count, {
            avgInsertTime: duration / count,
            successfulInserts: entries.filter(id => id > 0).length
        });

        return {
            success: entries.every(id => id > 0),
            details: { 
                totalEntries: count, 
                successfulInserts: entries.filter(id => id > 0).length,
                avgInsertTime: Math.round((duration / count) * 100) / 100
            }
        };
    }

    async testQuotaEntryRetrieval() {
        const startTime = performance.now();
        
        // Test recent entries retrieval
        const recentEntries = this.testDB.getRecentQuotaEntries(24);
        const duration = performance.now() - startTime;
        
        this.recordPerformance('Quota Retrieval', duration, recentEntries.length);

        return {
            success: Array.isArray(recentEntries) && recentEntries.length > 0,
            details: { 
                entriesRetrieved: recentEntries.length,
                retrievalTime: Math.round(duration * 100) / 100,
                firstEntry: recentEntries[0] || null
            }
        };
    }

    async testCacheOperations() {
        this.log('info', '🧪 Testing cache operations');
        
        const tests = [
            {
                name: 'Cache Entry Storage',
                operation: () => this.testCacheStorage(),
            },
            {
                name: 'Cache Entry Retrieval',
                operation: () => this.testCacheRetrieval(),
            },
            {
                name: 'Cache Statistics',
                operation: () => this.testCacheStatistics(),
            },
            {
                name: 'Cache Expiration',
                operation: () => this.testCacheExpiration(),
            }
        ];

        const results = [];
        for (const test of tests) {
            const testStart = performance.now();
            try {
                const result = await test.operation();
                const duration = performance.now() - testStart;
                this.recordTest(`Cache: ${test.name}`, result.success, duration, result.details);
                results.push(result.success);
                this.log('info', `✅ ${test.name}: ${result.success ? 'PASS' : 'FAIL'}`, result.details);
            } catch (error) {
                const duration = performance.now() - testStart;
                this.recordTest(`Cache: ${test.name}`, false, duration, null, error);
                results.push(false);
                this.log('error', `❌ ${test.name}: ERROR`, { error: error.message });
            }
        }

        return results.every(r => r);
    }

    async testCacheStorage() {
        const cacheEntry = {
            cache_key: 'test-key-123',
            prompt_hash: 'prompt-hash-123',
            response: {
                content: 'Test response content',
                backend_used: 'test-backend',
                tokens: 100,
                cost: 0.005
            },
            created_at: Date.now(),
            expires_at: Date.now() + (5 * 60 * 1000), // 5 minutes from now
            size_bytes: 1024
        };

        this.testDB.setCacheEntry(cacheEntry);
        
        return {
            success: true,
            details: { cacheKey: cacheEntry.cache_key, size: cacheEntry.size_bytes }
        };
    }

    async testCacheRetrieval() {
        const cacheKey = 'test-key-123';
        const startTime = performance.now();
        
        const cachedEntry = this.testDB.getCacheEntry(cacheKey);
        const duration = performance.now() - startTime;
        
        this.recordPerformance('Cache Retrieval', duration, 1);

        return {
            success: cachedEntry !== null && cachedEntry.cache_key === cacheKey,
            details: { 
                cacheKey, 
                found: cachedEntry !== null,
                retrievalTime: Math.round(duration * 100) / 100,
                entry: cachedEntry
            }
        };
    }

    async testCacheStatistics() {
        const startTime = performance.now();
        const stats = this.testDB.getCacheStats();
        const duration = performance.now() - startTime;
        
        this.recordPerformance('Cache Stats Query', duration, 1);

        const expectedFields = ['total_requests', 'cache_hits', 'cache_misses', 'hit_rate', 'entries_count'];
        const hasAllFields = expectedFields.every(field => stats.hasOwnProperty(field));

        return {
            success: hasAllFields && typeof stats.hit_rate === 'number',
            details: { 
                stats, 
                hasAllFields,
                statsQueryTime: Math.round(duration * 100) / 100
            }
        };
    }

    async testCacheExpiration() {
        // Create an expired cache entry
        const expiredEntry = {
            cache_key: 'expired-test-key',
            prompt_hash: 'expired-prompt-hash',
            response: { content: 'This should expire' },
            created_at: Date.now() - (10 * 60 * 1000), // 10 minutes ago
            expires_at: Date.now() - (5 * 60 * 1000),  // Expired 5 minutes ago
            size_bytes: 512
        };

        this.testDB.setCacheEntry(expiredEntry);
        
        // Try to retrieve the expired entry
        const retrievedEntry = this.testDB.getCacheEntry(expiredEntry.cache_key);

        return {
            success: retrievedEntry === null, // Should be null because it's expired
            details: { 
                cacheKey: expiredEntry.cache_key,
                wasExpired: retrievedEntry === null,
                expectedExpired: true
            }
        };
    }

    async testDatabasePerformance() {
        this.log('info', '🚀 Testing database performance');
        
        const performanceTests = [
            {
                name: 'High-Volume Quota Inserts',
                operation: () => this.performanceTestQuotaInserts(1000),
            },
            {
                name: 'Concurrent Cache Operations',
                operation: () => this.performanceTestConcurrentCache(50),
            },
            {
                name: 'Large Query Performance',
                operation: () => this.performanceTestLargeQueries(),
            }
        ];

        const results = [];
        for (const test of performanceTests) {
            const testStart = performance.now();
            try {
                const result = await test.operation();
                const duration = performance.now() - testStart;
                this.recordTest(`Performance: ${test.name}`, result.success, duration, result.details);
                results.push(result.success);
                this.log('info', `⚡ ${test.name}: ${result.success ? 'PASS' : 'FAIL'}`, result.details);
            } catch (error) {
                const duration = performance.now() - testStart;
                this.recordTest(`Performance: ${test.name}`, false, duration, null, error);
                results.push(false);
                this.log('error', `❌ ${test.name}: ERROR`, { error: error.message });
            }
        }

        return results.every(r => r);
    }

    async performanceTestQuotaInserts(count) {
        const startTime = performance.now();
        const entries = [];

        for (let i = 0; i < count; i++) {
            const entry = {
                timestamp: new Date(Date.now() - i * 100).toISOString(),
                backend: `perf-backend-${i % 5}`,
                prompt_hash: `perf-hash-${i}`,
                tokens_input: 100 + (i % 200),
                tokens_output: 50 + (i % 100),
                cost_eur: 0.002 * (i + 1),
                cache_hit: i % 3 === 0,
                latency_ms: 80 + Math.random() * 120
            };
            
            const entryId = this.testDB.addQuotaEntry(entry);
            entries.push(entryId);
        }

        const duration = performance.now() - startTime;
        this.recordPerformance('High-Volume Quota Inserts', duration, count, {
            insertsPerSecond: Math.round((count / duration) * 1000),
            successRate: entries.filter(id => id > 0).length / count
        });

        return {
            success: entries.every(id => id > 0),
            details: {
                totalInserts: count,
                duration: Math.round(duration),
                insertsPerSecond: Math.round((count / duration) * 1000),
                avgTimePerInsert: Math.round((duration / count) * 100) / 100
            }
        };
    }

    async performanceTestConcurrentCache(concurrency) {
        const operations = [];
        const startTime = performance.now();

        // Create concurrent cache operations
        for (let i = 0; i < concurrency; i++) {
            const operation = async () => {
                const cacheEntry = {
                    cache_key: `concurrent-key-${i}`,
                    prompt_hash: `concurrent-hash-${i}`,
                    response: { content: `Concurrent response ${i}`, data: new Array(100).fill(i) },
                    created_at: Date.now(),
                    expires_at: Date.now() + (10 * 60 * 1000),
                    size_bytes: 2048
                };

                // Set and then immediately get
                this.testDB.setCacheEntry(cacheEntry);
                return this.testDB.getCacheEntry(cacheEntry.cache_key);
            };

            operations.push(operation());
        }

        const results = await Promise.all(operations);
        const duration = performance.now() - startTime;

        this.recordPerformance('Concurrent Cache Operations', duration, concurrency, {
            operationsPerSecond: Math.round((concurrency * 2) / duration * 1000), // *2 for set+get
            successRate: results.filter(r => r !== null).length / concurrency
        });

        return {
            success: results.every(r => r !== null),
            details: {
                concurrentOperations: concurrency,
                duration: Math.round(duration),
                operationsPerSecond: Math.round((concurrency * 2) / duration * 1000),
                successfulOperations: results.filter(r => r !== null).length
            }
        };
    }

    async performanceTestLargeQueries() {
        const startTime = performance.now();
        
        // Query recent entries (should have lots from previous tests)
        const recentEntries = this.testDB.getRecentQuotaEntries(24);
        const stats = this.testDB.getCacheStats();
        const healthCheck = this.testDB.healthCheck();
        
        const duration = performance.now() - startTime;

        this.recordPerformance('Large Query Performance', duration, recentEntries.length, {
            queriesExecuted: 3,
            entriesRetrieved: recentEntries.length
        });

        return {
            success: recentEntries.length > 0 && stats && healthCheck.healthy,
            details: {
                recentEntriesCount: recentEntries.length,
                queryDuration: Math.round(duration),
                avgQueryTime: Math.round(duration / 3),
                healthStatus: healthCheck.healthy
            }
        };
    }

    async testErrorHandling() {
        this.log('info', '🧪 Testing error handling and edge cases');
        
        const errorTests = [
            {
                name: 'Invalid Cache Entry',
                operation: () => this.testInvalidCacheEntry(),
            },
            {
                name: 'Invalid Quota Entry',
                operation: () => this.testInvalidQuotaEntry(),
            },
            {
                name: 'Non-existent Cache Retrieval',
                operation: () => this.testNonExistentCacheRetrieval(),
            }
        ];

        const results = [];
        for (const test of errorTests) {
            const testStart = performance.now();
            try {
                const result = await test.operation();
                const duration = performance.now() - testStart;
                this.recordTest(`Error Handling: ${test.name}`, result.success, duration, result.details);
                results.push(result.success);
                this.log('info', `✅ ${test.name}: ${result.success ? 'PASS' : 'FAIL'}`, result.details);
            } catch (error) {
                const duration = performance.now() - testStart;
                this.recordTest(`Error Handling: ${test.name}`, false, duration, null, error);
                results.push(false);
                this.log('error', `❌ ${test.name}: ERROR`, { error: error.message });
            }
        }

        return results.every(r => r);
    }

    async testInvalidCacheEntry() {
        try {
            // Try to set cache entry with missing required fields
            const invalidEntry = {
                cache_key: null, // Invalid key
                response: 'not an object',
                created_at: 'invalid date'
            };

            this.testDB.setCacheEntry(invalidEntry);
            
            return {
                success: false, // Should have thrown an error
                details: { message: 'Expected error was not thrown' }
            };
        } catch (error) {
            return {
                success: true, // Error was expected
                details: { errorMessage: error.message, errorHandled: true }
            };
        }
    }

    async testInvalidQuotaEntry() {
        try {
            // Try to add quota entry with invalid data
            const invalidEntry = {
                backend: null,
                tokens_input: 'not a number',
                cost_eur: 'invalid cost'
            };

            this.testDB.addQuotaEntry(invalidEntry);
            
            return {
                success: false, // Should have thrown an error
                details: { message: 'Expected error was not thrown' }
            };
        } catch (error) {
            return {
                success: true, // Error was expected
                details: { errorMessage: error.message, errorHandled: true }
            };
        }
    }

    async testNonExistentCacheRetrieval() {
        const result = this.testDB.getCacheEntry('non-existent-key-12345');
        
        return {
            success: result === null, // Should return null for non-existent key
            details: { 
                result, 
                expectedNull: true,
                actuallyNull: result === null
            }
        };
    }

    async testDatabaseCleanup() {
        this.log('info', '🧪 Testing database cleanup operations');
        
        const testStart = performance.now();
        
        try {
            // Run cleanup
            this.testDB.cleanup();
            const duration = performance.now() - testStart;
            
            // Verify database is still healthy after cleanup
            const healthCheck = this.testDB.healthCheck();
            
            this.recordTest('Database Cleanup', healthCheck.healthy, duration, healthCheck);
            this.recordPerformance('Database Cleanup', duration, 1);
            
            return {
                success: healthCheck.healthy,
                details: { 
                    cleanupTime: Math.round(duration),
                    healthAfterCleanup: healthCheck.healthy,
                    cacheSize: healthCheck.cacheSize
                }
            };
        } catch (error) {
            const duration = performance.now() - testStart;
            this.recordTest('Database Cleanup', false, duration, null, error);
            return {
                success: false,
                details: { error: error.message }
            };
        }
    }

    generateReport() {
        this.log('info', '📊 Generating comprehensive test report');
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(t => t.passed).length;
        const failedTests = totalTests - passedTests;
        const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

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
            recommendations: this.generateRecommendations(),
            generatedAt: new Date().toISOString()
        };

        return report;
    }

    generateRecommendations() {
        const recommendations = [];
        
        // Analyze performance metrics
        const avgQuotaInsertTime = this.performanceMetrics
            .filter(m => m.operation.includes('Quota'))
            .reduce((sum, m) => sum + m.avgTimePerItem, 0) / 
            this.performanceMetrics.filter(m => m.operation.includes('Quota')).length;

        if (avgQuotaInsertTime > 1) {
            recommendations.push({
                category: 'Performance',
                severity: 'medium',
                message: `Average quota insert time (${avgQuotaInsertTime}ms) is above optimal threshold. Consider optimizing database indexes or batch operations.`
            });
        }

        // Check for failed tests
        const failedTests = this.testResults.filter(t => !t.passed);
        if (failedTests.length > 0) {
            recommendations.push({
                category: 'Reliability',
                severity: 'high',
                message: `${failedTests.length} test(s) failed. Review error logs and fix underlying issues.`
            });
        }

        // Analyze cache performance
        const cacheMetrics = this.performanceMetrics.filter(m => m.operation.includes('Cache'));
        if (cacheMetrics.length > 0) {
            const avgCacheTime = cacheMetrics.reduce((sum, m) => sum + m.avgTimePerItem, 0) / cacheMetrics.length;
            if (avgCacheTime < 1) {
                recommendations.push({
                    category: 'Performance',
                    severity: 'info',
                    message: `Cache operations are performing well (avg: ${avgCacheTime}ms). Consider expanding cache usage.`
                });
            }
        }

        return recommendations;
    }

    async cleanup() {
        this.log('info', '🧹 Cleaning up test environment');
        
        try {
            if (this.testDB) {
                this.testDB.close();
            }
            
            if (fs.existsSync(this.testDbPath)) {
                fs.unlinkSync(this.testDbPath);
            }
            
            this.log('info', '✅ Test cleanup complete');
        } catch (error) {
            this.log('error', '❌ Cleanup failed', { error: error.message });
        }
    }
}

async function runComprehensiveDatabaseTest() {
    const testSuite = new DatabaseTestSuite();
    
    console.log('🚀 Starting Comprehensive Database Test Suite');
    console.log('================================================');
    
    try {
        // Setup
        if (!(await testSuite.setupTestEnvironment())) {
            console.error('❌ Test setup failed. Exiting.');
            return false;
        }

        // Run all test suites
        const testSuites = [
            { name: 'Database Initialization', test: () => testSuite.testDatabaseInitialization() },
            { name: 'Quota Ledger Operations', test: () => testSuite.testQuotaLedgerOperations() },
            { name: 'Cache Operations', test: () => testSuite.testCacheOperations() },
            { name: 'Database Performance', test: () => testSuite.testDatabasePerformance() },
            { name: 'Error Handling', test: () => testSuite.testErrorHandling() },
            { name: 'Database Cleanup', test: () => testSuite.testDatabaseCleanup() }
        ];

        const results = [];
        for (const suite of testSuites) {
            console.log(`\n🧪 Running ${suite.name} tests...`);
            const result = await suite.test();
            results.push(result);
        }

        // Generate and save report
        const report = testSuite.generateReport();
        
        const reportPath = path.join(__dirname, 'database-test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log('\n📊 TEST RESULTS SUMMARY');
        console.log('========================');
        console.log(`Total Tests: ${report.summary.totalTests}`);
        console.log(`Passed: ${report.summary.passedTests}`);
        console.log(`Failed: ${report.summary.failedTests}`);
        console.log(`Success Rate: ${report.summary.successRate}%`);
        console.log(`Total Duration: ${Math.round(report.summary.testDuration)}ms`);
        
        if (report.recommendations.length > 0) {
            console.log('\n💡 RECOMMENDATIONS:');
            report.recommendations.forEach(rec => {
                console.log(`  [${rec.severity.toUpperCase()}] ${rec.category}: ${rec.message}`);
            });
        }
        
        console.log(`\n📁 Detailed report saved to: ${reportPath}`);

        const allPassed = results.every(r => r);
        console.log(`\n${allPassed ? '✅' : '❌'} Database test suite ${allPassed ? 'PASSED' : 'FAILED'}`);
        
        return allPassed;

    } catch (error) {
        console.error('❌ Test suite execution failed:', error);
        return false;
    } finally {
        await testSuite.cleanup();
    }
}

if (require.main === module) {
    runComprehensiveDatabaseTest().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = { runComprehensiveDatabaseTest, DatabaseTestSuite };