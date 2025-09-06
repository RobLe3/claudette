#!/usr/bin/env node

// Real API Backend Testing with Live API Keys
// This test loads API keys securely from .env file

const fs = require('fs');
const path = require('path');

console.log('🔑 LIVE API BACKEND TESTING\n');

// Load environment variables from .env file
function loadEnvFile() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        console.error('❌ .env file not found. Please create .env file with API keys.');
        process.exit(1);
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            const [key, value] = line.split('=', 2);
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        }
    });
    
    console.log('✅ Environment variables loaded from .env file');
}

async function testLiveBackends() {
    const testResults = {
        passed: 0,
        failed: 0,
        warnings: 0,
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
        // Load environment variables
        loadEnvFile();
        
        // Import Claudette after environment is set up
        const { Claudette } = require('./dist/index.js');
        
        console.log('🔧 Phase 1: Environment Setup and Security Check');
        console.log('=' .repeat(50));
        
        // Verify API keys are loaded (but don't log them)
        const hasOpenAI = !!process.env.OPENAI_API_KEY;
        const hasFlexcon = !!(process.env.FLEXCON_API_KEY && process.env.FLEXCON_API_URL);
        
        logTest('OpenAI API key loaded', hasOpenAI ? 'PASS' : 'FAIL', hasOpenAI ? 'Key present' : 'Missing key');
        logTest('Flexcon API config loaded', hasFlexcon ? 'PASS' : 'FAIL', hasFlexcon ? 'URL and key present' : 'Missing config');
        
        if (!hasOpenAI && !hasFlexcon) {
            console.error('❌ No API keys available for testing');
            return testResults;
        }
        
        console.log('\n🏗️  Phase 2: Backend Configuration with Live API Keys');
        console.log('=' .repeat(50));
        
        // Create Claudette instance (it will load default config)
        const claudette = new Claudette();
        
        // Environment variables are already loaded, 
        // Claudette will automatically detect OPENAI_API_KEY
        
        await claudette.initialize();
        logTest('Live backend initialization', 'PASS', 'Backends configured with API keys');
        
        console.log('\n🧪 Phase 3: Live OpenAI Backend Testing');
        console.log('=' .repeat(50));
        
        if (hasOpenAI) {
            try {
                const testPrompt = 'Write a simple "Hello, World!" function in Python. Keep it very short.';
                console.log('   📝 Test prompt:', testPrompt.substring(0, 50) + '...');
                
                const startTime = Date.now();
                const response = await claudette.optimize(testPrompt, [], {
                    backend: 'openai',
                    max_tokens: 100,
                    temperature: 0.1,
                    bypass_cache: true  // Force live API call
                });
                const duration = Date.now() - startTime;
                
                if (response && response.content && response.content.length > 10) {
                    logTest('OpenAI API call', 'PASS', `${duration}ms, ${response.content.length} chars`);
                    logTest('OpenAI response quality', response.content.includes('def') || response.content.includes('print') ? 'PASS' : 'WARN', 'Contains expected code elements');
                    logTest('OpenAI cost tracking', response.cost_eur > 0 ? 'PASS' : 'WARN', `€${response.cost_eur.toFixed(6)}`);
                    logTest('OpenAI token counting', (response.tokens_input > 0 && response.tokens_output > 0) ? 'PASS' : 'WARN', `${response.tokens_input}→${response.tokens_output} tokens`);
                    
                    console.log('   📋 Response preview:', response.content.substring(0, 100) + '...');
                } else {
                    logTest('OpenAI API call', 'FAIL', 'Empty or invalid response');
                }
                
            } catch (openaiError) {
                if (openaiError.message.includes('401') || openaiError.message.includes('authentication')) {
                    logTest('OpenAI API call', 'FAIL', 'Authentication failed - invalid API key');
                } else if (openaiError.message.includes('quota') || openaiError.message.includes('billing')) {
                    logTest('OpenAI API call', 'WARN', 'Quota/billing issue');
                } else {
                    logTest('OpenAI API call', 'FAIL', openaiError.message.substring(0, 50) + '...');
                }
                testResults.errors.push('OpenAI error: ' + openaiError.message);
            }
        }
        
        console.log('\n🔧 Phase 4: Live Flexcon/Ollama Backend Testing');
        console.log('=' .repeat(50));
        
        if (hasFlexcon) {
            try {
                const testPrompt = 'What is 2+2? Answer in one short sentence.';
                console.log('   📝 Test prompt:', testPrompt);
                
                // Create a simple HTTP client test first
                const https = require('https');
                const http = require('http');
                
                const testFlexconAPI = () => {
                    return new Promise((resolve, reject) => {
                        const url = new URL(process.env.FLEXCON_API_URL + '/v1/models');
                        const client = url.protocol === 'https:' ? https : http;
                        
                        const options = {
                            hostname: url.hostname,
                            port: url.port,
                            path: url.pathname,
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${process.env.FLEXCON_API_KEY}`,
                                'Content-Type': 'application/json'
                            },
                            timeout: 10000
                        };
                        
                        const req = client.request(options, (res) => {
                            let data = '';
                            res.on('data', chunk => data += chunk);
                            res.on('end', () => {
                                if (res.statusCode === 200) {
                                    resolve({ status: res.statusCode, data });
                                } else {
                                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                                }
                            });
                        });
                        
                        req.on('timeout', () => {
                            req.destroy();
                            reject(new Error('Request timeout'));
                        });
                        
                        req.on('error', reject);
                        req.end();
                    });
                };
                
                // Test API connectivity
                try {
                    const apiTest = await testFlexconAPI();
                    logTest('Flexcon API connectivity', 'PASS', `HTTP ${apiTest.status}`);
                } catch (connectError) {
                    if (connectError.message.includes('timeout')) {
                        logTest('Flexcon API connectivity', 'WARN', 'Connection timeout');
                    } else if (connectError.message.includes('401')) {
                        logTest('Flexcon API connectivity', 'FAIL', 'Authentication failed');
                    } else {
                        logTest('Flexcon API connectivity', 'FAIL', connectError.message.substring(0, 30) + '...');
                    }
                }
                
                // Note: Actual Claudette integration would require implementing Flexcon backend
                logTest('Flexcon backend integration', 'WARN', 'Requires custom backend implementation');
                
            } catch (flexconError) {
                logTest('Flexcon API test', 'FAIL', flexconError.message.substring(0, 50) + '...');
                testResults.errors.push('Flexcon error: ' + flexconError.message);
            }
        }
        
        console.log('\n🎯 Phase 5: Backend Routing with Live APIs');
        console.log('=' .repeat(50));
        
        if (hasOpenAI) {
            try {
                // Test intelligent routing
                const routingPrompt = 'Explain what machine learning is in one sentence.';
                console.log('   📝 Routing test prompt:', routingPrompt);
                
                const routingStartTime = Date.now();
                const routingResponse = await claudette.optimize(routingPrompt, [], {
                    max_tokens: 50,
                    bypass_cache: true,
                    // Let router choose best backend
                });
                const routingDuration = Date.now() - routingStartTime;
                
                if (routingResponse && routingResponse.content) {
                    logTest('Intelligent routing', 'PASS', `Used ${routingResponse.backend_used} in ${routingDuration}ms`);
                    logTest('Routing response quality', routingResponse.content.includes('learning') ? 'PASS' : 'WARN', 'Contains expected content');
                } else {
                    logTest('Intelligent routing', 'FAIL', 'No response from routing');
                }
                
            } catch (routingError) {
                logTest('Intelligent routing', 'FAIL', routingError.message.substring(0, 50) + '...');
            }
        }
        
        console.log('\n💾 Phase 6: Cache Integration with Live APIs');
        console.log('=' .repeat(50));
        
        if (hasOpenAI) {
            try {
                const cachePrompt = 'What is the capital of France?';
                
                // First call (should miss cache, hit API)
                const firstStartTime = Date.now();
                const firstResponse = await claudette.optimize(cachePrompt, [], {
                    max_tokens: 20,
                    backend: 'openai',
                    bypass_cache: false
                });
                const firstDuration = Date.now() - firstStartTime;
                
                // Second call (should hit cache)
                const secondStartTime = Date.now();
                const secondResponse = await claudette.optimize(cachePrompt, [], {
                    max_tokens: 20,
                    backend: 'openai',
                    bypass_cache: false
                });
                const secondDuration = Date.now() - secondStartTime;
                
                if (firstResponse && secondResponse) {
                    const cacheHit = secondResponse.cache_hit || secondDuration < firstDuration * 0.5;
                    logTest('Cache integration', cacheHit ? 'PASS' : 'WARN', `First: ${firstDuration}ms, Second: ${secondDuration}ms`);
                    logTest('Cache hit detection', secondResponse.cache_hit ? 'PASS' : 'WARN', `Cache hit flag: ${secondResponse.cache_hit}`);
                } else {
                    logTest('Cache integration', 'FAIL', 'Missing responses');
                }
                
            } catch (cacheError) {
                logTest('Cache integration', 'FAIL', cacheError.message.substring(0, 50) + '...');
            }
        }
        
        // Final results
        console.log('\n🏆 LIVE API TESTING RESULTS');
        console.log('=' .repeat(50));
        console.log(`✅ Tests Passed: ${testResults.passed}`);
        console.log(`❌ Tests Failed: ${testResults.failed}`);
        console.log(`⚠️  Warnings: ${testResults.warnings}`);
        console.log(`🏁 Total Tests: ${testResults.passed + testResults.failed + testResults.warnings}`);
        
        if (testResults.errors.length > 0) {
            console.log('\n❌ Errors Encountered:');
            testResults.errors.forEach(error => {
                console.log(`   - ${error.substring(0, 100)}...`);
            });
        }
        
        const successRate = testResults.passed / (testResults.passed + testResults.failed) * 100;
        console.log(`\n🎯 Success Rate: ${successRate.toFixed(1)}%`);
        
        if (successRate >= 90) {
            console.log('🏆 EXCELLENT - Live API integration working perfectly');
        } else if (successRate >= 75) {
            console.log('✅ GOOD - Live APIs mostly functional');
        } else if (successRate >= 50) {
            console.log('⚠️  FAIR - Some API integration issues');
        } else {
            console.log('❌ POOR - Significant API integration problems');
        }
        
        return testResults;
        
    } catch (error) {
        console.error('💥 Critical error during live API testing:', error.message);
        testResults.errors.push('Critical error: ' + error.message);
        return testResults;
    }
}

// Security check - ensure we don't accidentally log API keys
const originalConsoleLog = console.log;
console.log = (...args) => {
    const safeArgs = args.map(arg => {
        if (typeof arg === 'string') {
            // Mask potential API keys in logs
            return arg.replace(/sk-[a-zA-Z0-9_-]+/g, 'sk-***MASKED***')
                     .replace(/sk_[a-zA-Z0-9_-]+/g, 'sk_***MASKED***');
        }
        return arg;
    });
    originalConsoleLog(...safeArgs);
};

// Run the live API tests
if (require.main === module) {
    testLiveBackends().then(results => {
        const success = results.failed === 0 && results.errors.length === 0;
        console.log('\n' + (success ? '🏆 LIVE API TESTS COMPLETED' : '⚠️  LIVE API TESTS COMPLETED WITH ISSUES'));
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Live API test execution failed:', error.message);
        process.exit(1);
    });
}

module.exports = { testLiveBackends };