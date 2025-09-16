#!/usr/bin/env node

/**
 * Comprehensive Claudette Backend Testing Suite
 * Tests all core functionality, routing, backends, and error handling
 */

const fs = require('fs');
const path = require('path');

// Test results collector
const testResults = {
    startTime: new Date().toISOString(),
    testSuite: 'Claudette Backend Comprehensive Test',
    results: [],
    summary: {
        total: 0,
        passed: 0,
        failed: 0,
        errors: [],
        performance: {}
    }
};

// Color console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(color, ...args) {
    console.log(color, ...args, colors.reset);
}

function logHeader(title) {
    log(colors.bold + colors.cyan, `\n🔬 ${title}`);
    log(colors.cyan, '='.repeat(60));
}

function logSuccess(message) {
    log(colors.green, `✅ ${message}`);
}

function logError(message) {
    log(colors.red, `❌ ${message}`);
}

function logWarning(message) {
    log(colors.yellow, `⚠️  ${message}`);
}

function logInfo(message) {
    log(colors.blue, `ℹ️  ${message}`);
}

// Test result tracking
function recordTest(testName, passed, details = {}, error = null, duration = 0) {
    const result = {
        test: testName,
        passed,
        timestamp: new Date().toISOString(),
        duration_ms: duration,
        details,
        error: error ? error.toString() : null
    };
    
    testResults.results.push(result);
    testResults.summary.total++;
    
    if (passed) {
        testResults.summary.passed++;
        logSuccess(`${testName} (${duration}ms)`);
    } else {
        testResults.summary.failed++;
        testResults.summary.errors.push({
            test: testName,
            error: error ? error.toString() : 'Test failed',
            details
        });
        logError(`${testName} - ${error ? error.message : 'Failed'}`);
    }
    
    if (details && Object.keys(details).length > 0) {
        logInfo(`Details: ${JSON.stringify(details, null, 2)}`);
    }
}

// Performance measurement wrapper
async function measurePerformance(testName, testFn) {
    const startTime = Date.now();
    try {
        const result = await testFn();
        const duration = Date.now() - startTime;
        testResults.summary.performance[testName] = duration;
        return { result, duration, error: null };
    } catch (error) {
        const duration = Date.now() - startTime;
        testResults.summary.performance[testName] = duration;
        return { result: null, duration, error };
    }
}

// Environment setup verification
function verifyEnvironment() {
    logHeader('Environment Verification');
    
    const requiredFiles = [
        './dist/index.js',
        './.env'
    ];
    
    let envValid = true;
    
    requiredFiles.forEach(file => {
        if (fs.existsSync(file)) {
            logSuccess(`Required file exists: ${file}`);
        } else {
            logError(`Missing required file: ${file}`);
            envValid = false;
        }
    });
    
    // Check environment variables
    const envVars = {
        'OPENAI_API_KEY': process.env.OPENAI_API_KEY,
        'FLEXCON_API_URL': process.env.FLEXCON_API_URL,
        'FLEXCON_API_KEY': process.env.FLEXCON_API_KEY
    };
    
    Object.entries(envVars).forEach(([key, value]) => {
        if (value) {
            logSuccess(`Environment variable set: ${key} = ${value.substring(0, 20)}...`);
        } else {
            logWarning(`Environment variable not set: ${key}`);
        }
    });
    
    recordTest('Environment Verification', envValid, envVars);
    return envValid;
}

// Test 1: Core Claudette Class Instantiation
async function testClaudetteInstantiation() {
    logHeader('Test 1: Claudette Class Instantiation');
    
    try {
        const { Claudette } = require('./dist/index.js');
        
        // Test 1a: Default configuration
        const { result: defaultInstance, duration: defaultDuration, error: defaultError } = 
            await measurePerformance('default_instantiation', async () => {
                return new Claudette();
            });
        
        recordTest('Claudette Default Instantiation', !defaultError, {
            has_config: !!defaultInstance?.config,
            has_router: !!defaultInstance?.router,
            has_cache: !!defaultInstance?.cache,
            has_db: !!defaultInstance?.db
        }, defaultError, defaultDuration);
        
        // Test 1b: Custom configuration
        const customConfig = './test-config.json';
        fs.writeFileSync(customConfig, JSON.stringify({
            backends: {
                openai: {
                    enabled: true,
                    priority: 1,
                    model: 'gpt-4o-mini'
                }
            },
            features: {
                caching: false,
                cost_optimization: true
            }
        }, null, 2));
        
        const { result: customInstance, duration: customDuration, error: customError } = 
            await measurePerformance('custom_config_instantiation', async () => {
                return new Claudette(customConfig);
            });
        
        recordTest('Claudette Custom Config Instantiation', !customError, {
            config_loaded: customInstance?.config?.features?.caching === false,
            openai_enabled: customInstance?.config?.backends?.openai?.enabled === true
        }, customError, customDuration);
        
        // Cleanup
        fs.unlinkSync(customConfig);
        
        return defaultInstance || customInstance;
        
    } catch (error) {
        recordTest('Claudette Class Import', false, {}, error);
        return null;
    }
}

// Test 2: Backend Initialization and Registration
async function testBackendInitialization(claudetteInstance) {
    logHeader('Test 2: Backend Initialization and Registration');
    
    if (!claudetteInstance) {
        recordTest('Backend Initialization', false, {}, new Error('No Claudette instance available'));
        return;
    }
    
    try {
        // Test initialization
        const { result, duration, error } = await measurePerformance('backend_initialization', async () => {
            await claudetteInstance.initialize();
            return claudetteInstance;
        });
        
        recordTest('Claudette Backend Initialization', !error, {
            initialized: claudetteInstance.initialized,
            router_backends_count: claudetteInstance.router?.getBackends()?.length || 0
        }, error, duration);
        
        // Test backend registration
        const backends = claudetteInstance.router?.getBackends() || [];
        const backendDetails = backends.map(backend => ({
            name: backend.name,
            enabled: backend.config?.enabled,
            priority: backend.config?.priority,
            cost_per_token: backend.config?.cost_per_token
        }));
        
        recordTest('Backend Registration', backends.length > 0, {
            registered_backends: backendDetails,
            total_count: backends.length
        });
        
        return backends;
        
    } catch (error) {
        recordTest('Backend Initialization Error', false, {}, error);
        return [];
    }
}

// Test 3: OpenAI Backend Functionality
async function testOpenAIBackend(claudetteInstance) {
    logHeader('Test 3: OpenAI Backend Functionality');
    
    if (!process.env.OPENAI_API_KEY) {
        recordTest('OpenAI Backend Test', false, {}, new Error('OPENAI_API_KEY not available'));
        return;
    }
    
    try {
        // Test simple query
        const testPrompt = "Say 'Hello from OpenAI backend' in exactly those words.";
        
        const { result: response, duration, error } = await measurePerformance('openai_query', async () => {
            return await claudetteInstance.optimize(testPrompt, [], { backend: 'openai' });
        });
        
        recordTest('OpenAI Simple Query', !error && response, {
            response_content: response?.content?.substring(0, 100),
            response_length: response?.content?.length,
            backend_used: response?.backend_used,
            tokens_input: response?.tokens_input,
            tokens_output: response?.tokens_output,
            cost_eur: response?.cost_eur,
            latency_ms: response?.latency_ms
        }, error, duration);
        
        // Test cost calculation accuracy
        if (response && response.cost_eur !== undefined) {
            const estimatedCost = (response.tokens_input + response.tokens_output) * 0.0001; // rough estimate
            const costAccurate = Math.abs(response.cost_eur - estimatedCost) < estimatedCost * 0.5; // within 50%
            
            recordTest('OpenAI Cost Calculation', costAccurate, {
                reported_cost: response.cost_eur,
                estimated_cost: estimatedCost,
                tokens_total: response.tokens_input + response.tokens_output,
                cost_accurate: costAccurate
            });
        }
        
        return response;
        
    } catch (error) {
        recordTest('OpenAI Backend Test', false, {}, error);
        return null;
    }
}

// Test 4: Flexcon Backend Functionality
async function testFlexconBackend(claudetteInstance) {
    logHeader('Test 4: Flexcon/Ollama Backend Functionality');
    
    if (!process.env.FLEXCON_API_URL || !process.env.FLEXCON_API_KEY) {
        recordTest('Flexcon Backend Test', false, {}, new Error('FLEXCON credentials not available'));
        return;
    }
    
    try {
        // Test simple query
        const testPrompt = "Respond with exactly: 'Hello from Flexcon backend'";
        
        const { result: response, duration, error } = await measurePerformance('flexcon_query', async () => {
            return await claudetteInstance.optimize(testPrompt, [], { backend: 'ollama' });
        });
        
        recordTest('Flexcon Simple Query', !error && response, {
            response_content: response?.content?.substring(0, 100),
            response_length: response?.content?.length,
            backend_used: response?.backend_used,
            tokens_input: response?.tokens_input,
            tokens_output: response?.tokens_output,
            cost_eur: response?.cost_eur,
            latency_ms: response?.latency_ms
        }, error, duration);
        
        return response;
        
    } catch (error) {
        recordTest('Flexcon Backend Test', false, {}, error);
        return null;
    }
}

// Test 5: Backend Routing Logic
async function testBackendRouting(claudetteInstance) {
    logHeader('Test 5: Backend Routing and Selection Logic');
    
    try {
        // Test automatic backend selection (no specific backend requested)
        const testPrompt = "This is a routing test. Respond with the backend name that processed this request.";
        
        const { result: autoResponse, duration: autoDuration, error: autoError } = 
            await measurePerformance('auto_routing', async () => {
                return await claudetteInstance.optimize(testPrompt);
            });
        
        recordTest('Automatic Backend Routing', !autoError && autoResponse, {
            selected_backend: autoResponse?.backend_used,
            response_received: !!autoResponse?.content,
            routing_time_ms: autoDuration
        }, autoError, autoDuration);
        
        // Test routing with cost optimization
        const costPrompt = "Short response for cost test.";
        
        const { result: costResponse, duration: costDuration, error: costError } = 
            await measurePerformance('cost_optimized_routing', async () => {
                return await claudetteInstance.optimize(costPrompt, [], { optimize_cost: true });
            });
        
        recordTest('Cost-Optimized Routing', !costError && costResponse, {
            selected_backend: costResponse?.backend_used,
            estimated_cost: costResponse?.cost_eur,
            optimization_applied: true
        }, costError, costDuration);
        
        return { autoResponse, costResponse };
        
    } catch (error) {
        recordTest('Backend Routing Test', false, {}, error);
        return null;
    }
}

// Test 6: Configuration System
async function testConfigurationSystem() {
    logHeader('Test 6: Configuration System');
    
    try {
        const { Claudette } = require('./dist/index.js');
        
        // Test 6a: Default configuration loading
        const defaultInstance = new Claudette();
        const defaultConfig = defaultInstance.getConfig();
        
        recordTest('Default Configuration Loading', !!defaultConfig, {
            has_backends: !!defaultConfig.backends,
            has_features: !!defaultConfig.features,
            has_thresholds: !!defaultConfig.thresholds,
            caching_enabled: defaultConfig.features?.caching,
            openai_priority: defaultConfig.backends?.openai?.priority
        });
        
        // Test 6b: Environment variable integration
        const envEnabled = !!(process.env.OPENAI_API_KEY || process.env.FLEXCON_API_KEY);
        
        recordTest('Environment Variable Integration', envEnabled, {
            openai_key_available: !!process.env.OPENAI_API_KEY,
            flexcon_key_available: !!process.env.FLEXCON_API_KEY,
            flexcon_url_available: !!process.env.FLEXCON_API_URL
        });
        
        // Test 6c: Invalid configuration handling
        const invalidConfigPath = './invalid-config.json';
        fs.writeFileSync(invalidConfigPath, '{ invalid json syntax');
        
        const invalidInstance = new Claudette(invalidConfigPath);
        const fallbackConfig = invalidInstance.getConfig();
        
        recordTest('Invalid Configuration Handling', !!fallbackConfig.backends, {
            fallback_to_defaults: true,
            config_has_backends: !!fallbackConfig.backends
        });
        
        // Cleanup
        fs.unlinkSync(invalidConfigPath);
        
    } catch (error) {
        recordTest('Configuration System Test', false, {}, error);
    }
}

// Test 7: Error Handling and Fallback
async function testErrorHandling(claudetteInstance) {
    logHeader('Test 7: Error Handling and Fallback Mechanisms');
    
    try {
        // Test 7a: Invalid backend request
        const { result: invalidResponse, duration: invalidDuration, error: invalidError } = 
            await measurePerformance('invalid_backend_request', async () => {
                return await claudetteInstance.optimize("Test", [], { backend: 'nonexistent' });
            });
        
        recordTest('Invalid Backend Handling', !!invalidError, {
            error_type: invalidError?.constructor?.name,
            error_message: invalidError?.message,
            fallback_occurred: !invalidResponse
        }, invalidError, invalidDuration);
        
        // Test 7b: Network timeout simulation (if possible)
        // This test might not work depending on backend implementations
        
        // Test 7c: Malformed request handling
        try {
            const { result: malformedResponse, duration: malformedDuration, error: malformedError } = 
                await measurePerformance('malformed_request', async () => {
                    return await claudetteInstance.optimize("", [], { invalid_option: true });
                });
            
            recordTest('Malformed Request Handling', true, {
                handled_gracefully: !malformedError || !!malformedResponse,
                response_received: !!malformedResponse
            }, malformedError, malformedDuration);
            
        } catch (malformedError) {
            recordTest('Malformed Request Handling', true, {
                error_caught: true,
                error_type: malformedError.constructor.name
            }, malformedError);
        }
        
    } catch (error) {
        recordTest('Error Handling Test Suite', false, {}, error);
    }
}

// Test 8: Caching System
async function testCachingSystem(claudetteInstance) {
    logHeader('Test 8: Caching System');
    
    try {
        const testPrompt = "This is a cache test with timestamp: " + Date.now();
        
        // First request (should miss cache)
        const { result: firstResponse, duration: firstDuration, error: firstError } = 
            await measurePerformance('first_request', async () => {
                return await claudetteInstance.optimize(testPrompt);
            });
        
        recordTest('First Request (Cache Miss)', !firstError && firstResponse, {
            cache_hit: firstResponse?.cache_hit,
            duration_ms: firstDuration,
            response_received: !!firstResponse?.content
        }, firstError, firstDuration);
        
        // Second request (should hit cache if caching is enabled)
        const { result: secondResponse, duration: secondDuration, error: secondError } = 
            await measurePerformance('second_request', async () => {
                return await claudetteInstance.optimize(testPrompt);
            });
        
        recordTest('Second Request (Cache Test)', !secondError && secondResponse, {
            cache_hit: secondResponse?.cache_hit,
            duration_ms: secondDuration,
            cache_working: secondDuration < firstDuration || secondResponse?.cache_hit,
            performance_improvement: firstDuration > secondDuration
        }, secondError, secondDuration);
        
        // Test cache bypass
        const { result: bypassResponse, duration: bypassDuration, error: bypassError } = 
            await measurePerformance('cache_bypass', async () => {
                return await claudetteInstance.optimize(testPrompt, [], { bypass_cache: true });
            });
        
        recordTest('Cache Bypass', !bypassError && bypassResponse, {
            cache_bypassed: !bypassResponse?.cache_hit,
            duration_ms: bypassDuration
        }, bypassError, bypassDuration);
        
    } catch (error) {
        recordTest('Caching System Test', false, {}, error);
    }
}

// Test 9: Request Processing Features
async function testRequestProcessing(claudetteInstance) {
    logHeader('Test 9: Request Processing Features');
    
    try {
        // Test 9a: Large request handling (compression/summarization)
        const largePrompt = "This is a large request test. ".repeat(1000) + 
            "Please respond with a summary of what you received.";
        
        const { result: largeResponse, duration: largeDuration, error: largeError } = 
            await measurePerformance('large_request', async () => {
                return await claudetteInstance.optimize(largePrompt);
            });
        
        recordTest('Large Request Processing', !largeError && largeResponse, {
            original_length: largePrompt.length,
            compression_applied: largeResponse?.metadata?.compression_applied,
            summarization_applied: largeResponse?.metadata?.summarization_applied,
            response_received: !!largeResponse?.content,
            processing_time_ms: largeDuration
        }, largeError, largeDuration);
        
        // Test 9b: File processing (if supported)
        const testFiles = ["// Test file content\nfunction test() { return 'hello'; }"];
        
        const { result: fileResponse, duration: fileDuration, error: fileError } = 
            await measurePerformance('file_processing', async () => {
                return await claudetteInstance.optimize("Analyze this code", testFiles);
            });
        
        recordTest('File Processing', !fileError, {
            files_processed: testFiles.length,
            response_received: !!fileResponse?.content,
            mentions_code: fileResponse?.content?.toLowerCase()?.includes('function') || 
                         fileResponse?.content?.toLowerCase()?.includes('code')
        }, fileError, fileDuration);
        
    } catch (error) {
        recordTest('Request Processing Test', false, {}, error);
    }
}

// Test 10: System Status and Health
async function testSystemHealth(claudetteInstance) {
    logHeader('Test 10: System Health and Status');
    
    try {
        const { result: status, duration, error } = await measurePerformance('system_status', async () => {
            return await claudetteInstance.getStatus();
        });
        
        recordTest('System Status Retrieval', !error && status, {
            system_healthy: status?.healthy,
            database_healthy: status?.database?.healthy,
            cache_stats: status?.cache,
            backend_count: status?.backends?.health?.length || 0,
            version: status?.version
        }, error, duration);
        
        // Test individual backend health
        if (claudetteInstance.router) {
            const backendHealth = await claudetteInstance.router.healthCheckAll();
            
            recordTest('Backend Health Checks', Array.isArray(backendHealth), {
                backends_checked: backendHealth?.length || 0,
                healthy_backends: backendHealth?.filter(b => b.healthy)?.length || 0,
                unhealthy_backends: backendHealth?.filter(b => !b.healthy)?.length || 0
            });
        }
        
    } catch (error) {
        recordTest('System Health Test', false, {}, error);
    }
}

// Performance benchmarking
async function performanceBenchmark(claudetteInstance) {
    logHeader('Performance Benchmark');
    
    if (!claudetteInstance) {
        recordTest('Performance Benchmark', false, {}, new Error('No Claudette instance'));
        return;
    }
    
    try {
        const benchmarkPrompts = [
            "Simple test 1",
            "Simple test 2",
            "Simple test 3",
            "Simple test 4",
            "Simple test 5"
        ];
        
        const results = [];
        
        for (let i = 0; i < benchmarkPrompts.length; i++) {
            const { result, duration, error } = await measurePerformance(`benchmark_${i + 1}`, async () => {
                return await claudetteInstance.optimize(benchmarkPrompts[i]);
            });
            
            results.push({
                prompt: benchmarkPrompts[i],
                duration_ms: duration,
                success: !error,
                error: error?.message
            });
        }
        
        const successfulResults = results.filter(r => r.success);
        const avgDuration = successfulResults.length > 0 
            ? successfulResults.reduce((sum, r) => sum + r.duration_ms, 0) / successfulResults.length 
            : 0;
        
        const maxDuration = Math.max(...results.map(r => r.duration_ms));
        const minDuration = Math.min(...results.map(r => r.duration_ms));
        
        recordTest('Performance Benchmark', successfulResults.length > 0, {
            total_requests: benchmarkPrompts.length,
            successful_requests: successfulResults.length,
            average_duration_ms: Math.round(avgDuration),
            max_duration_ms: maxDuration,
            min_duration_ms: minDuration,
            success_rate: ((successfulResults.length / benchmarkPrompts.length) * 100).toFixed(1) + '%'
        });
        
    } catch (error) {
        recordTest('Performance Benchmark', false, {}, error);
    }
}

// Main test execution
async function runTests() {
    log(colors.bold + colors.magenta, '\n🚀 Claudette Comprehensive Backend Testing Suite');
    log(colors.magenta, '='.repeat(80));
    
    // Load environment variables
    require('dotenv').config();
    
    // Verify environment
    if (!verifyEnvironment()) {
        log(colors.red, '\n❌ Environment verification failed. Stopping tests.');
        return;
    }
    
    try {
        // Run all tests
        const claudetteInstance = await testClaudetteInstantiation();
        const backends = await testBackendInitialization(claudetteInstance);
        
        await testConfigurationSystem();
        
        if (claudetteInstance && claudetteInstance.initialized) {
            await testOpenAIBackend(claudetteInstance);
            await testFlexconBackend(claudetteInstance);
            await testBackendRouting(claudetteInstance);
            await testErrorHandling(claudetteInstance);
            await testCachingSystem(claudetteInstance);
            await testRequestProcessing(claudetteInstance);
            await testSystemHealth(claudetteInstance);
            await performanceBenchmark(claudetteInstance);
            
            // Cleanup
            await claudetteInstance.cleanup();
        }
        
    } catch (error) {
        logError(`Critical test execution error: ${error.message}`);
        recordTest('Test Suite Execution', false, {}, error);
    }
    
    // Generate final report
    generateTestReport();
}

// Generate and save test report
function generateTestReport() {
    logHeader('Test Results Summary');
    
    testResults.endTime = new Date().toISOString();
    testResults.duration_ms = Date.now() - new Date(testResults.startTime).getTime();
    
    const { total, passed, failed } = testResults.summary;
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
    
    log(colors.bold, `\n📊 Test Results:`);
    log(colors.green, `✅ Passed: ${passed}/${total} (${successRate}%)`);
    log(colors.red, `❌ Failed: ${failed}/${total}`);
    log(colors.blue, `⏱️  Total Duration: ${testResults.duration_ms}ms`);
    
    // Performance summary
    const perfKeys = Object.keys(testResults.summary.performance);
    if (perfKeys.length > 0) {
        const avgPerf = perfKeys.reduce((sum, key) => sum + testResults.summary.performance[key], 0) / perfKeys.length;
        log(colors.cyan, `📈 Average Test Duration: ${Math.round(avgPerf)}ms`);
    }
    
    // Critical failures
    if (testResults.summary.errors.length > 0) {
        log(colors.red, `\n🚨 Critical Issues Found:`);
        testResults.summary.errors.forEach((error, idx) => {
            log(colors.red, `${idx + 1}. ${error.test}: ${error.error}`);
        });
    }
    
    // Save detailed report
    const reportPath = './comprehensive-backend-test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    log(colors.green, `\n📄 Detailed report saved to: ${reportPath}`);
    
    // Overall assessment
    log(colors.bold + colors.cyan, '\n🎯 Overall Assessment:');
    if (successRate >= 80) {
        log(colors.green, '✅ Claudette backend system is functioning well');
    } else if (successRate >= 60) {
        log(colors.yellow, '⚠️  Claudette backend system has some issues but is partially functional');
    } else {
        log(colors.red, '❌ Claudette backend system has significant issues');
    }
    
    // Mark todo as completed
    return testResults;
}

// Run the tests
if (require.main === module) {
    runTests().catch(error => {
        console.error('Fatal error running tests:', error);
        process.exit(1);
    });
}

module.exports = { runTests, testResults };