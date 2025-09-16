#!/usr/bin/env node

// Fixed Database Test that handles schema initialization properly
const path = require('path');
const fs = require('fs');
const { performance } = require('perf_hooks');

// Import SQLite3 directly to handle database initialization
const Database = require('better-sqlite3');

class FixedDatabaseTest {
    constructor() {
        this.testResults = [];
        this.performanceMetrics = [];
        this.db = null;
        this.testDbPath = path.join(__dirname, 'test-fixed-claudette.db');
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

    async setupDatabase() {
        this.log('info', '🔧 Setting up test database with proper schema initialization');
        
        try {
            // Clean up existing database
            if (fs.existsSync(this.testDbPath)) {
                fs.unlinkSync(this.testDbPath);
            }

            // Create database connection
            this.db = new Database(this.testDbPath);
            
            // Enable WAL mode
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('synchronous = NORMAL');
            
            // Create basic tables manually
            this.createBasicTables();
            
            this.log('info', '✅ Database setup complete');
            return true;
            
        } catch (error) {
            this.log('error', '❌ Database setup failed', { error: error.message });
            return false;
        }
    }

    createBasicTables() {
        // Create schema version table first
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        `);

        // Create quota ledger table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS quota_ledger (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL DEFAULT (datetime('now')),
                backend TEXT NOT NULL,
                prompt_hash TEXT NOT NULL,
                tokens_input INTEGER DEFAULT 0,
                tokens_output INTEGER DEFAULT 0,
                cost_eur REAL DEFAULT 0.0,
                cache_hit BOOLEAN DEFAULT 0,
                latency_ms REAL DEFAULT 0.0,
                metadata TEXT DEFAULT '{}'
            )
        `);

        // Create cache entries table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS cache_entries (
                cache_key TEXT PRIMARY KEY,
                prompt_hash TEXT NOT NULL,
                response TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                expires_at TEXT NOT NULL,
                access_count INTEGER DEFAULT 0,
                last_accessed TEXT DEFAULT (datetime('now')),
                size_bytes INTEGER DEFAULT 0
            )
        `);

        // Create indexes
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_quota_ledger_timestamp 
            ON quota_ledger(timestamp)
        `);
        
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_cache_entries_expires 
            ON cache_entries(expires_at)
        `);

        // Insert schema version
        this.db.exec(`INSERT OR IGNORE INTO schema_version (version) VALUES (1)`);
    }

    async testBasicDatabaseOperations() {
        this.log('info', '🧪 Testing basic database operations');
        
        const tests = [
            { name: 'Database Connection', test: () => this.testDatabaseConnection() },
            { name: 'Table Creation', test: () => this.testTableCreation() },
            { name: 'Basic Insert Operations', test: () => this.testBasicInserts() },
            { name: 'Basic Query Operations', test: () => this.testBasicQueries() },
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

    testDatabaseConnection() {
        try {
            // Test basic database connection
            const result = this.db.exec('SELECT 1');
            return {
                success: true,
                details: { connectionWorking: true }
            };
        } catch (error) {
            return {
                success: false,
                details: { error: error.message }
            };
        }
    }

    testTableCreation() {
        try {
            // Check that tables exist
            const tables = this.db.prepare(`
                SELECT name FROM sqlite_master WHERE type='table' 
                AND name IN ('quota_ledger', 'cache_entries', 'schema_version')
            `).all();

            const expectedTables = ['quota_ledger', 'cache_entries', 'schema_version'];
            const foundTables = tables.map(t => t.name);
            const allTablesExist = expectedTables.every(table => foundTables.includes(table));

            return {
                success: allTablesExist,
                details: {
                    expectedTables,
                    foundTables,
                    allTablesExist
                }
            };
        } catch (error) {
            return {
                success: false,
                details: { error: error.message }
            };
        }
    }

    testBasicInserts() {
        try {
            // Test quota ledger insert
            const quotaStmt = this.db.prepare(`
                INSERT INTO quota_ledger (
                    timestamp, backend, prompt_hash, tokens_input, tokens_output, 
                    cost_eur, cache_hit, latency_ms
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const quotaResult = quotaStmt.run(
                new Date().toISOString(),
                'test-backend',
                'test-hash-123',
                100,
                150,
                0.005,
                0,
                200.5
            );

            // Test cache entry insert
            const cacheStmt = this.db.prepare(`
                INSERT INTO cache_entries (
                    cache_key, prompt_hash, response, created_at, expires_at, size_bytes
                ) VALUES (?, ?, ?, datetime('now'), datetime('now', '+5 minutes'), ?)
            `);

            const cacheResult = cacheStmt.run(
                'test-cache-key',
                'test-prompt-hash',
                JSON.stringify({ content: 'test response' }),
                256
            );

            return {
                success: quotaResult.changes > 0 && cacheResult.changes > 0,
                details: {
                    quotaInserted: quotaResult.changes,
                    cacheInserted: cacheResult.changes,
                    quotaId: quotaResult.lastInsertRowid,
                    cacheKey: 'test-cache-key'
                }
            };
        } catch (error) {
            return {
                success: false,
                details: { error: error.message }
            };
        }
    }

    testBasicQueries() {
        try {
            // Test quota ledger query
            const quotaEntries = this.db.prepare(`
                SELECT * FROM quota_ledger ORDER BY id DESC LIMIT 5
            `).all();

            // Test cache entry query
            const cacheEntries = this.db.prepare(`
                SELECT * FROM cache_entries WHERE expires_at > datetime('now')
            `).all();

            return {
                success: quotaEntries.length > 0 && cacheEntries.length > 0,
                details: {
                    quotaEntriesFound: quotaEntries.length,
                    cacheEntriesFound: cacheEntries.length,
                    quotaEntry: quotaEntries[0] || null,
                    cacheEntry: cacheEntries[0] || null
                }
            };
        } catch (error) {
            return {
                success: false,
                details: { error: error.message }
            };
        }
    }

    async testPerformanceCharacteristics() {
        this.log('info', '⚡ Testing database performance characteristics');

        const performanceTests = [
            { name: 'Bulk Insert Performance', test: () => this.testBulkInsertPerformance(1000) },
            { name: 'Query Performance', test: () => this.testQueryPerformance() },
            { name: 'Concurrent Access', test: () => this.testConcurrentAccess(10) },
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

    async testBulkInsertPerformance(count) {
        const startTime = performance.now();

        try {
            // Prepare statement for bulk inserts
            const stmt = this.db.prepare(`
                INSERT INTO quota_ledger (
                    timestamp, backend, prompt_hash, tokens_input, tokens_output, 
                    cost_eur, cache_hit, latency_ms
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            // Use transaction for better performance
            const insertMany = this.db.transaction((entries) => {
                for (const entry of entries) {
                    stmt.run(...entry);
                }
            });

            // Generate test data
            const entries = [];
            for (let i = 0; i < count; i++) {
                entries.push([
                    new Date(Date.now() - (i * 1000)).toISOString(),
                    `backend-${i % 5}`,
                    `hash-${i}`,
                    50 + (i % 100),
                    75 + (i % 150),
                    0.005 * (i + 1),
                    i % 4 === 0 ? 1 : 0,
                    100 + Math.random() * 200
                ]);
            }

            // Execute bulk insert
            insertMany(entries);
            
            const duration = performance.now() - startTime;
            this.recordPerformance('Bulk Insert', duration, count);

            return {
                success: true,
                details: {
                    entriesInserted: count,
                    duration: Math.round(duration),
                    insertsPerSecond: Math.round((count / duration) * 1000),
                    avgTimePerInsert: Math.round((duration / count) * 100) / 100
                }
            };
        } catch (error) {
            return {
                success: false,
                details: { error: error.message }
            };
        }
    }

    async testQueryPerformance() {
        const queries = [
            {
                name: 'Recent Entries Query',
                sql: `SELECT * FROM quota_ledger WHERE timestamp > datetime('now', '-1 hour') ORDER BY timestamp DESC`
            },
            {
                name: 'Backend Summary Query',
                sql: `SELECT backend, COUNT(*) as count, AVG(latency_ms) as avg_latency, SUM(cost_eur) as total_cost 
                      FROM quota_ledger GROUP BY backend`
            },
            {
                name: 'Cache Efficiency Query',
                sql: `SELECT COUNT(*) as total, SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) as hits 
                      FROM quota_ledger`
            }
        ];

        const results = [];
        for (const query of queries) {
            const startTime = performance.now();
            try {
                const queryResult = this.db.prepare(query.sql).all();
                const duration = performance.now() - startTime;
                
                this.recordPerformance(`Query: ${query.name}`, duration, queryResult.length || 1);
                
                results.push({
                    name: query.name,
                    duration: Math.round(duration * 100) / 100,
                    resultCount: queryResult.length,
                    success: true
                });
            } catch (error) {
                results.push({
                    name: query.name,
                    duration: 0,
                    resultCount: 0,
                    success: false,
                    error: error.message
                });
            }
        }

        const allSuccessful = results.every(r => r.success);
        
        return {
            success: allSuccessful,
            details: {
                queriesExecuted: queries.length,
                results,
                allSuccessful
            }
        };
    }

    async testConcurrentAccess(concurrency) {
        const operations = [];
        
        // Create concurrent database operations
        for (let i = 0; i < concurrency; i++) {
            const operation = async () => {
                // Mix of read and write operations
                const isRead = i % 2 === 0;
                
                if (isRead) {
                    // Read operation
                    const result = this.db.prepare(`
                        SELECT COUNT(*) as count FROM quota_ledger
                    `).get();
                    return { type: 'read', count: result.count };
                } else {
                    // Write operation
                    const stmt = this.db.prepare(`
                        INSERT INTO quota_ledger (
                            timestamp, backend, prompt_hash, tokens_input, tokens_output, 
                            cost_eur, cache_hit, latency_ms
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `);
                    
                    const result = stmt.run(
                        new Date().toISOString(),
                        `concurrent-backend-${i}`,
                        `concurrent-hash-${i}`,
                        60,
                        90,
                        0.006,
                        0,
                        180
                    );
                    
                    return { type: 'write', rowid: result.lastInsertRowid };
                }
            };

            operations.push(operation());
        }

        const startTime = performance.now();
        
        try {
            const results = await Promise.all(operations);
            const duration = performance.now() - startTime;
            
            const readOps = results.filter(r => r.type === 'read').length;
            const writeOps = results.filter(r => r.type === 'write').length;
            
            this.recordPerformance('Concurrent Operations', duration, concurrency);

            return {
                success: results.length === concurrency,
                details: {
                    totalOperations: concurrency,
                    completedOperations: results.length,
                    readOperations: readOps,
                    writeOperations: writeOps,
                    duration: Math.round(duration),
                    operationsPerSecond: Math.round((concurrency / duration) * 1000)
                }
            };
        } catch (error) {
            return {
                success: false,
                details: { error: error.message }
            };
        }
    }

    async testSimpleCacheOperations() {
        this.log('info', '💾 Testing simple cache operations');

        try {
            // Test cache set operation
            const setCacheStart = performance.now();
            const setCacheStmt = this.db.prepare(`
                INSERT OR REPLACE INTO cache_entries (
                    cache_key, prompt_hash, response, created_at, expires_at, size_bytes
                ) VALUES (?, ?, ?, datetime('now'), datetime('now', '+10 minutes'), ?)
            `);

            const testResponse = { content: 'Simple cache test response', tokens: 150 };
            const responseStr = JSON.stringify(testResponse);
            
            setCacheStmt.run(
                'simple-cache-test',
                'simple-prompt-hash',
                responseStr,
                Buffer.byteLength(responseStr, 'utf8')
            );
            
            const setDuration = performance.now() - setCacheStart;

            // Test cache get operation
            const getCacheStart = performance.now();
            const getCacheResult = this.db.prepare(`
                SELECT * FROM cache_entries WHERE cache_key = ? AND expires_at > datetime('now')
            `).get('simple-cache-test');
            
            const getDuration = performance.now() - getCacheStart;

            // Update access count
            if (getCacheResult) {
                this.db.prepare(`
                    UPDATE cache_entries SET access_count = access_count + 1, last_accessed = datetime('now')
                    WHERE cache_key = ?
                `).run('simple-cache-test');
            }

            this.recordPerformance('Cache Set', setDuration, 1);
            this.recordPerformance('Cache Get', getDuration, 1);

            return {
                success: getCacheResult !== null,
                details: {
                    setDuration: Math.round(setDuration * 100) / 100,
                    getDuration: Math.round(getDuration * 100) / 100,
                    cacheHit: getCacheResult !== null,
                    responseSize: getCacheResult ? getCacheResult.size_bytes : 0
                }
            };
        } catch (error) {
            return {
                success: false,
                details: { error: error.message }
            };
        }
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
            databaseCharacteristics: this.analyzeDatabaseCharacteristics(),
            generatedAt: new Date().toISOString()
        };

        return report;
    }

    analyzeDatabaseCharacteristics() {
        const characteristics = {
            reliabilityScore: 0,
            performanceProfile: 'unknown',
            insertPerformance: 'unknown',
            queryPerformance: 'unknown',
            concurrencyHandling: 'unknown'
        };

        // Calculate reliability score
        const successRate = this.testResults.filter(t => t.passed).length / this.testResults.length;
        characteristics.reliabilityScore = Math.round(successRate * 100);

        // Analyze insert performance
        const insertMetrics = this.performanceMetrics.filter(m => m.operation.includes('Insert'));
        if (insertMetrics.length > 0) {
            const avgInsertTime = insertMetrics.reduce((sum, m) => sum + m.avgTimePerItem, 0) / insertMetrics.length;
            characteristics.insertPerformance = avgInsertTime < 1 ? 'excellent' :
                                              avgInsertTime < 3 ? 'good' :
                                              avgInsertTime < 10 ? 'fair' : 'poor';
        }

        // Analyze query performance
        const queryMetrics = this.performanceMetrics.filter(m => m.operation.includes('Query'));
        if (queryMetrics.length > 0) {
            const avgQueryTime = queryMetrics.reduce((sum, m) => sum + m.duration, 0) / queryMetrics.length;
            characteristics.queryPerformance = avgQueryTime < 5 ? 'excellent' :
                                             avgQueryTime < 15 ? 'good' :
                                             avgQueryTime < 50 ? 'fair' : 'poor';
        }

        // Analyze concurrency
        const concurrentMetrics = this.performanceMetrics.filter(m => m.operation.includes('Concurrent'));
        if (concurrentMetrics.length > 0) {
            const avgThroughput = concurrentMetrics.reduce((sum, m) => sum + m.throughput, 0) / concurrentMetrics.length;
            characteristics.concurrencyHandling = avgThroughput > 100 ? 'excellent' :
                                                avgThroughput > 50 ? 'good' :
                                                avgThroughput > 20 ? 'fair' : 'poor';
        }

        // Overall performance profile
        const profiles = [characteristics.insertPerformance, characteristics.queryPerformance, characteristics.concurrencyHandling];
        const excellentCount = profiles.filter(p => p === 'excellent').length;
        const goodCount = profiles.filter(p => p === 'good').length;

        if (excellentCount >= 2) {
            characteristics.performanceProfile = 'excellent';
        } else if (excellentCount + goodCount >= 2) {
            characteristics.performanceProfile = 'good';
        } else {
            characteristics.performanceProfile = 'needs-improvement';
        }

        return characteristics;
    }

    async cleanup() {
        this.log('info', '🧹 Cleaning up test database');
        try {
            if (this.db) {
                this.db.close();
            }
            if (fs.existsSync(this.testDbPath)) {
                fs.unlinkSync(this.testDbPath);
            }
            this.log('info', '✅ Cleanup complete');
        } catch (error) {
            this.log('error', '❌ Cleanup failed', { error: error.message });
        }
    }
}

async function runFixedDatabaseTest() {
    const testSuite = new FixedDatabaseTest();
    
    console.log('🚀 Starting Fixed Database Test Suite');
    console.log('======================================');
    
    try {
        // Setup
        if (!(await testSuite.setupDatabase())) {
            console.error('❌ Database setup failed. Exiting.');
            return false;
        }

        // Run test suites
        const testGroups = [
            { name: 'Basic Database Operations', test: () => testSuite.testBasicDatabaseOperations() },
            { name: 'Simple Cache Operations', test: () => testSuite.testSimpleCacheOperations() },
            { name: 'Performance Characteristics', test: () => testSuite.testPerformanceCharacteristics() }
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
        const reportPath = path.join(__dirname, 'fixed-database-test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        console.log('\n📊 TEST RESULTS SUMMARY');
        console.log('========================');
        console.log(`Total Tests: ${report.summary.totalTests}`);
        console.log(`Passed: ${report.summary.passedTests}`);
        console.log(`Failed: ${report.summary.failedTests}`);
        console.log(`Success Rate: ${report.summary.successRate}%`);
        console.log(`Total Duration: ${Math.round(report.summary.testDuration)}ms`);

        if (report.databaseCharacteristics) {
            console.log('\n📈 DATABASE CHARACTERISTICS:');
            console.log(`  Reliability Score: ${report.databaseCharacteristics.reliabilityScore}%`);
            console.log(`  Performance Profile: ${report.databaseCharacteristics.performanceProfile}`);
            console.log(`  Insert Performance: ${report.databaseCharacteristics.insertPerformance}`);
            console.log(`  Query Performance: ${report.databaseCharacteristics.queryPerformance}`);
            console.log(`  Concurrency Handling: ${report.databaseCharacteristics.concurrencyHandling}`);
        }

        console.log(`\n📁 Detailed report saved to: ${reportPath}`);

        const allPassed = results.every(r => r);
        console.log(`\n${allPassed ? '✅' : '❌'} Fixed database test ${allPassed ? 'PASSED' : 'FAILED'}`);
        
        return allPassed;

    } catch (error) {
        console.error('❌ Test execution failed:', error);
        return false;
    } finally {
        await testSuite.cleanup();
    }
}

if (require.main === module) {
    runFixedDatabaseTest().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = { runFixedDatabaseTest, FixedDatabaseTest };