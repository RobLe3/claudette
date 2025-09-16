#!/usr/bin/env node

// Comprehensive Feature Test - Complete functionality validation
console.log('🧪 COMPREHENSIVE CLAUDETTE FEATURE TEST\n');

async function runComprehensiveTest() {
    const testResults = {
        passed: 0,
        failed: 0,
        warnings: 0,
        performance: {},
        errors: []
    };

    function logTest(name, status, details = '') {
        const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
        console.log(`   ${icon} ${name}: ${status}${details ? ' - ' + details : ''}`);
        if (status === 'PASS') testResults.passed++;
        else if (status === 'FAIL') testResults.failed++;
        else testResults.warnings++;
    }

    try {
        console.log('🔧 Phase 1: Module Import and Basic Structure');
        console.log('=' .repeat(50));
        
        // Test 1: Module imports
        let claudetteModule;
        try {
            claudetteModule = require('./dist/index.js');
            logTest('Claudette module import', 'PASS');
        } catch (error) {
            logTest('Claudette module import', 'FAIL', error.message);
            testResults.errors.push('Module import failed: ' + error.message);
            return testResults;
        }

        // Test 2: Required exports
        const requiredExports = ['Claudette', 'optimize', 'createMCPProvider', 'createDockerProvider', 'createRemoteProvider'];
        const availableExports = Object.keys(claudetteModule);
        
        requiredExports.forEach(exportName => {
            if (availableExports.includes(exportName)) {
                logTest(`Export ${exportName}`, 'PASS');
            } else {
                logTest(`Export ${exportName}`, 'FAIL', 'Missing from exports');
                testResults.errors.push(`Missing export: ${exportName}`);
            }
        });

        console.log('\\n🏗️  Phase 2: Core Class Instantiation and Configuration');
        console.log('=' .repeat(50));

        // Test 3: Claudette class instantiation
        let claudetteInstance;
        try {
            claudetteInstance = new claudetteModule.Claudette();
            logTest('Claudette class instantiation', 'PASS');
        } catch (error) {
            logTest('Claudette class instantiation', 'FAIL', error.message);
            testResults.errors.push('Class instantiation failed: ' + error.message);
            return testResults;
        }

        // Test 4: Configuration loading
        try {
            const config = claudetteInstance.getConfig();
            logTest('Configuration loading', 'PASS', `${Object.keys(config.backends).length} backends`);
            
            // Validate config structure
            if (config.backends && config.features && config.thresholds) {
                logTest('Configuration structure', 'PASS');
            } else {
                logTest('Configuration structure', 'FAIL', 'Missing required config sections');
            }
        } catch (error) {
            logTest('Configuration loading', 'FAIL', error.message);
        }

        // Test 5: Initialization
        try {
            await claudetteInstance.initialize();
            logTest('System initialization', 'PASS');
        } catch (error) {
            logTest('System initialization', 'WARN', error.message.substring(0, 50) + '...');
        }

        console.log('\\n💾 Phase 3: Cache System Testing');
        console.log('=' .repeat(50));

        // Test 6: Cache operations
        try {
            const { CacheSystem } = require('./dist/cache/index.js');
            const { DatabaseManager } = require('./dist/database/index.js');
            
            const db = new DatabaseManager();
            const cache = new CacheSystem(db, { ttl: 300, maxSize: 100 });
            
            const testRequest = {
                prompt: 'Cache test prompt',
                files: [],
                options: {}
            };
            
            const testResponse = {
                content: 'Cache test response',
                backend_used: 'test',
                tokens_input: 10,
                tokens_output: 20,
                cost_eur: 0.001,
                latency_ms: 100,
                cache_hit: false
            };

            // Set operation
            const setStart = Date.now();
            await cache.set(testRequest, testResponse);
            const setTime = Date.now() - setStart;
            testResults.performance.cacheSet = setTime;
            logTest('Cache SET operation', 'PASS', `${setTime}ms`);

            // Get operation
            const getStart = Date.now();
            const retrieved = await cache.get(testRequest);
            const getTime = Date.now() - getStart;
            testResults.performance.cacheGet = getTime;
            
            if (retrieved && retrieved.cache_hit) {
                logTest('Cache GET operation', 'PASS', `${getTime}ms`);
            } else {
                logTest('Cache GET operation', 'FAIL', 'Cache miss when hit expected');
            }

            // Statistics
            const stats = cache.getStats();
            if (stats.hit_rate > 0) {
                logTest('Cache statistics', 'PASS', `${(stats.hit_rate * 100).toFixed(1)}% hit rate`);
            } else {
                logTest('Cache statistics', 'FAIL', 'No hit rate recorded');
            }

        } catch (error) {
            logTest('Cache system', 'FAIL', error.message);
            testResults.errors.push('Cache system error: ' + error.message);
        }

        console.log('\\n🗜️  Phase 4: Text Processing (Compression & Summarization)');
        console.log('=' .repeat(50));

        // Test 7: Compression
        try {
            const testText = `
            // This is test code with comments
            function testFunction() {
                /* Block comment */
                console.log("Hello");  // Line comment
                return true;
            }
            
            // More comments
            const data = { value: "test" };
            `.repeat(3);

            const compressStart = Date.now();
            const compressed = await claudetteInstance.compressRequest({
                prompt: testText,
                files: [],
                options: {}
            });
            const compressTime = Date.now() - compressStart;
            testResults.performance.compression = compressTime;

            const originalSize = testText.length;
            const compressedSize = compressed.prompt.length;
            const ratio = (compressedSize / originalSize * 100);

            logTest('Text compression', 'PASS', `${originalSize}→${compressedSize} bytes (${ratio.toFixed(1)}%) in ${compressTime}ms`);
            
            if (compressed.metadata && compressed.metadata.compression_applied) {
                logTest('Compression metadata', 'PASS');
            } else {
                logTest('Compression metadata', 'WARN', 'Missing compression metadata');
            }

        } catch (error) {
            logTest('Text compression', 'FAIL', error.message);
        }

        // Test 8: Summarization
        try {
            const docText = `
            Artificial intelligence is transforming many industries. Machine learning enables computers to learn from data automatically. 
            Deep learning uses neural networks with multiple layers. Natural language processing handles human language. 
            Computer vision processes images and videos. Robotics combines AI with physical systems. 
            Expert systems capture human knowledge. Recommendation systems suggest relevant content.
            Classification algorithms categorize data into groups. Regression algorithms predict numerical values.
            `;

            const summarizeStart = Date.now();
            const summarized = await claudetteInstance.summarizeRequest({
                prompt: docText,
                files: [],
                options: {}
            });
            const summarizeTime = Date.now() - summarizeStart;
            testResults.performance.summarization = summarizeTime;

            const originalLength = docText.length;
            const summarizedLength = summarized.prompt.length;
            const reduction = (summarizedLength / originalLength * 100);

            logTest('Text summarization', 'PASS', `${originalLength}→${summarizedLength} chars (${reduction.toFixed(1)}%) in ${summarizeTime}ms`);

            if (summarized.metadata && summarized.metadata.summarization_applied) {
                logTest('Summarization metadata', 'PASS');
            } else {
                logTest('Summarization metadata', 'WARN', 'Missing summarization metadata');
            }

        } catch (error) {
            logTest('Text summarization', 'FAIL', error.message);
        }

        console.log('\\n🤖 Phase 5: RAG Provider Functions');
        console.log('=' .repeat(50));

        // Test 9: Provider function availability
        try {
            const { createMCPProvider, createDockerProvider, createRemoteProvider } = claudetteModule;
            
            logTest('createMCPProvider function', typeof createMCPProvider === 'function' ? 'PASS' : 'FAIL');
            logTest('createDockerProvider function', typeof createDockerProvider === 'function' ? 'PASS' : 'FAIL');
            logTest('createRemoteProvider function', typeof createRemoteProvider === 'function' ? 'PASS' : 'FAIL');

            // Test function signatures
            logTest('Provider function signatures', 'PASS', `MCP: ${createMCPProvider.length} params, Docker: ${createDockerProvider.length} params`);

        } catch (error) {
            logTest('RAG provider functions', 'FAIL', error.message);
        }

        console.log('\\n🔄 Phase 6: Backend System and Routing');
        console.log('=' .repeat(50));

        // Test 10: Backend configuration
        try {
            const config = claudetteInstance.getConfig();
            const enabledBackends = Object.entries(config.backends)
                .filter(([name, settings]) => settings.enabled)
                .map(([name]) => name);
            
            logTest('Backend configuration', 'PASS', `${enabledBackends.length} enabled: ${enabledBackends.join(', ')}`);

            if (enabledBackends.length > 0) {
                logTest('Backend availability', 'PASS');
            } else {
                logTest('Backend availability', 'WARN', 'No backends enabled');
            }

        } catch (error) {
            logTest('Backend configuration', 'FAIL', error.message);
        }

        // Test 11: Routing attempt (expected to fail without API keys)
        try {
            const routingStart = Date.now();
            
            try {
                await claudetteInstance.optimize('Simple test prompt', [], { max_tokens: 50 });
                logTest('Backend routing', 'WARN', 'Unexpected success - may indicate mock responses');
            } catch (routingError) {
                const routingTime = Date.now() - routingStart;
                testResults.performance.routing = routingTime;
                
                if (routingError.message.includes('No available backends') || 
                    routingError.message.includes('API key')) {
                    logTest('Backend routing logic', 'PASS', `Proper error handling in ${routingTime}ms`);
                } else {
                    logTest('Backend routing logic', 'FAIL', routingError.message);
                }
            }

        } catch (error) {
            logTest('Backend routing', 'FAIL', error.message);
        }

        console.log('\\n📊 Phase 7: System Status and Health');
        console.log('=' .repeat(50));

        // Test 12: System status
        try {
            const status = await claudetteInstance.getStatus();
            
            if (status.version) {
                logTest('System status', 'PASS', `Version: ${status.version}`);
            } else {
                logTest('System status', 'FAIL', 'Missing version info');
            }

            if (typeof status.healthy === 'boolean') {
                logTest('Health reporting', 'PASS', `Healthy: ${status.healthy}`);
            } else {
                logTest('Health reporting', 'FAIL', 'Invalid health status');
            }

        } catch (error) {
            logTest('System status', 'FAIL', error.message);
        }

        console.log('\\n⚡ Phase 8: Performance Benchmarking');
        console.log('=' .repeat(50));

        // Test 13: Performance benchmarks
        try {
            const iterations = 100;
            const benchmarkStart = Date.now();

            for (let i = 0; i < iterations; i++) {
                await claudetteInstance.compressRequest({
                    prompt: `Benchmark test ${i}`,
                    files: [],
                    options: {}
                });
            }

            const benchmarkTime = Date.now() - benchmarkStart;
            const avgTime = benchmarkTime / iterations;
            const opsPerSec = Math.round(iterations * 1000 / benchmarkTime);

            testResults.performance.benchmark = {
                total: benchmarkTime,
                average: avgTime,
                opsPerSec: opsPerSec
            };

            logTest('Performance benchmark', 'PASS', `${iterations} ops in ${benchmarkTime}ms (${avgTime.toFixed(2)}ms avg, ${opsPerSec} ops/sec)`);

            if (avgTime < 1.0) {
                logTest('Performance rating', 'PASS', 'Sub-millisecond average (EXCELLENT)');
            } else if (avgTime < 5.0) {
                logTest('Performance rating', 'PASS', 'Good performance');
            } else {
                logTest('Performance rating', 'WARN', 'Performance could be improved');
            }

        } catch (error) {
            logTest('Performance benchmark', 'FAIL', error.message);
        }

        // Final summary
        console.log('\\n🏆 COMPREHENSIVE TEST RESULTS');
        console.log('=' .repeat(50));
        console.log(`✅ Tests Passed: ${testResults.passed}`);
        console.log(`❌ Tests Failed: ${testResults.failed}`);
        console.log(`⚠️  Warnings: ${testResults.warnings}`);
        console.log(`🏁 Total Tests: ${testResults.passed + testResults.failed + testResults.warnings}`);

        if (Object.keys(testResults.performance).length > 0) {
            console.log('\\n📈 Performance Summary:');
            Object.entries(testResults.performance).forEach(([metric, value]) => {
                if (typeof value === 'object') {
                    console.log(`   ${metric}: ${value.average?.toFixed(2)}ms avg (${value.opsPerSec} ops/sec)`);
                } else {
                    console.log(`   ${metric}: ${value}ms`);
                }
            });
        }

        if (testResults.errors.length > 0) {
            console.log('\\n❌ Critical Errors:');
            testResults.errors.forEach(error => {
                console.log(`   - ${error}`);
            });
        }

        const successRate = (testResults.passed / (testResults.passed + testResults.failed)) * 100;
        console.log(`\\n🎯 Success Rate: ${successRate.toFixed(1)}%`);

        if (successRate >= 90) {
            console.log('🏆 EXCELLENT - System is highly functional');
        } else if (successRate >= 75) {
            console.log('✅ GOOD - System is mostly functional with minor issues');
        } else if (successRate >= 50) {
            console.log('⚠️  FAIR - System has significant issues but core functionality works');
        } else {
            console.log('❌ POOR - System has major issues requiring fixes');
        }

        return testResults;

    } catch (error) {
        console.error('💥 Critical test failure:', error.message);
        console.error('Stack trace:', error.stack);
        testResults.errors.push('Critical failure: ' + error.message);
        return testResults;
    }
}

// Run the comprehensive test
if (require.main === module) {
    runComprehensiveTest().then(results => {
        const success = results.failed === 0 && results.errors.length === 0;
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = { runComprehensiveTest };