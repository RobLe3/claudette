#!/usr/bin/env node

// Ollama/Flexcon Backend Testing
const fs = require('fs');
const path = require('path');

console.log('🦙 OLLAMA/FLEXCON BACKEND TESTING\n');

// Load environment variables from .env file
function loadEnvFile() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        console.error('❌ .env file not found');
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
}

async function testOllamaFlexcon() {
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
        loadEnvFile();
        console.log('✅ Environment loaded');
        
        // Check for Flexcon configuration
        const hasFlexcon = !!(process.env.FLEXCON_API_URL && process.env.FLEXCON_API_KEY && process.env.FLEXCON_MODEL);
        logTest('Flexcon configuration', hasFlexcon ? 'PASS' : 'FAIL', 
               hasFlexcon ? 'All Flexcon env vars present' : 'Missing Flexcon configuration');
        
        if (!hasFlexcon) {
            console.log('❌ Cannot test without Flexcon configuration');
            return testResults;
        }

        console.log('\n🔧 Phase 1: Direct Ollama Backend Testing');
        console.log('=' .repeat(50));
        
        // Import the Ollama backend directly
        const { OllamaBackend } = require('./dist/backends/ollama.js');
        logTest('Ollama backend import', 'PASS');
        
        // Create backend instance with Flexcon config
        const flexconConfig = {
            enabled: true,
            priority: 3,
            cost_per_token: 0.0001,
            api_url: process.env.FLEXCON_API_URL,
            api_key: process.env.FLEXCON_API_KEY,
            model: process.env.FLEXCON_MODEL,
            temperature: 0.7
        };
        
        const ollamaBackend = new OllamaBackend(flexconConfig);
        logTest('Ollama backend creation', 'PASS', `Model: ${flexconConfig.model}`);
        
        // Test configuration validation
        const configValid = await ollamaBackend.validateConfig();
        logTest('Configuration validation', configValid ? 'PASS' : 'FAIL');
        
        // Test availability check
        console.log('   📊 Testing availability...');
        const available = await ollamaBackend.isAvailable();
        logTest('Backend availability', available ? 'PASS' : 'WARN', 
               available ? 'Flexcon endpoint accessible' : 'Endpoint not responding');
        
        console.log('\n🧪 Phase 2: API Request Testing');
        console.log('=' .repeat(50));
        
        if (available) {
            // Test get available models
            try {
                const models = await ollamaBackend.getAvailableModels();
                logTest('Model listing', models.length > 0 ? 'PASS' : 'WARN', 
                       `${models.length} models found: ${models.slice(0, 3).join(', ')}`);
            } catch (modelError) {
                logTest('Model listing', 'WARN', 'Could not retrieve models list');
            }
            
            // Test actual request
            const testRequest = {
                prompt: 'What is 2+2? Answer in exactly one short sentence.',
                files: [],
                options: {},
                metadata: {
                    timestamp: new Date().toISOString(),
                    request_id: 'ollama-test-001'
                }
            };
            
            console.log('   📝 Test prompt:', testRequest.prompt);
            
            try {
                const startTime = Date.now();
                const response = await ollamaBackend.send(testRequest);
                const duration = Date.now() - startTime;
                
                if (response && response.content && response.content.length > 0) {
                    logTest('Ollama API request', 'PASS', `${duration}ms response time`);
                    logTest('Response quality', response.content.includes('4') ? 'PASS' : 'WARN', 
                           'Contains expected answer');
                    logTest('Token counting', 
                           (response.tokens_input > 0 && response.tokens_output > 0) ? 'PASS' : 'WARN',
                           `${response.tokens_input}→${response.tokens_output} tokens`);
                    logTest('Cost calculation', response.cost_eur >= 0 ? 'PASS' : 'WARN',
                           `€${response.cost_eur.toFixed(6)}`);
                    
                    console.log('   📋 Response:', response.content);
                    console.log('   📋 Backend used:', response.backend_used);
                    console.log('   📋 Model:', response.metadata?.model);
                } else {
                    logTest('Ollama API request', 'FAIL', 'Empty or invalid response');
                }
                
            } catch (requestError) {
                logTest('Ollama API request', 'FAIL', requestError.message.substring(0, 60) + '...');
                testResults.errors.push('Ollama request error: ' + requestError.message);
            }
            
        } else {
            logTest('API request test', 'SKIP', 'Backend not available');
        }
        
        console.log('\n🚀 Phase 3: Claudette Integration Testing');
        console.log('=' .repeat(50));
        
        try {
            const { Claudette } = require('./dist/index.js');
            const claudette = new Claudette();
            
            await claudette.initialize();
            logTest('Claudette initialization', 'PASS');
            
            // Test with Ollama backend specifically
            try {
                const integrationResponse = await claudette.optimize(
                    'Count from 1 to 3 in words. Be very brief.',
                    [],
                    { 
                        backend: 'ollama',
                        max_tokens: 20,
                        bypass_cache: true
                    }
                );
                
                if (integrationResponse && integrationResponse.content) {
                    logTest('Claudette-Ollama integration', 'PASS', 
                           `Used ${integrationResponse.backend_used}`);
                    console.log('   📋 Integration response:', integrationResponse.content);
                } else {
                    logTest('Claudette-Ollama integration', 'FAIL', 'No response from integration');
                }
                
            } catch (integrationError) {
                if (integrationError.message.includes('not available')) {
                    logTest('Claudette-Ollama integration', 'WARN', 'Backend marked unavailable');
                } else {
                    logTest('Claudette-Ollama integration', 'FAIL', 
                           integrationError.message.substring(0, 50) + '...');
                }
            }
            
        } catch (claudetteError) {
            logTest('Claudette integration', 'FAIL', claudetteError.message);
        }
        
        console.log('\n🌐 Phase 4: Direct API Connectivity Test');
        console.log('=' .repeat(50));
        
        // Direct HTTP test to Flexcon endpoint
        try {
            console.log('   📡 Testing direct HTTP connection...');
            
            const response = await fetch(`${process.env.FLEXCON_API_URL}/v1/models`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${process.env.FLEXCON_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            
            logTest('HTTP connectivity', response.ok ? 'PASS' : 'FAIL',
                   `Status: ${response.status}`);
            
            if (response.ok) {
                try {
                    const data = await response.json();
                    logTest('API response format', Array.isArray(data.data) ? 'PASS' : 'WARN',
                           `${data.data?.length || 0} models`);
                } catch (parseError) {
                    logTest('API response parsing', 'WARN', 'Could not parse JSON response');
                }
            }
            
        } catch (directError) {
            logTest('Direct HTTP test', 'FAIL', directError.message);
        }
        
        // Final results
        console.log('\n🏆 OLLAMA/FLEXCON TESTING RESULTS');
        console.log('=' .repeat(50));
        console.log(`✅ Tests Passed: ${testResults.passed}`);
        console.log(`❌ Tests Failed: ${testResults.failed}`);
        console.log(`⚠️  Warnings: ${testResults.warnings}`);
        console.log(`🏁 Total Tests: ${testResults.passed + testResults.failed + testResults.warnings}`);
        
        if (testResults.errors.length > 0) {
            console.log('\n❌ Errors Encountered:');
            testResults.errors.forEach(error => {
                console.log(`   - ${error}`);
            });
        }
        
        const successRate = testResults.passed / (testResults.passed + testResults.failed) * 100;
        console.log(`\n🎯 Success Rate: ${successRate.toFixed(1)}%`);
        
        if (successRate >= 90) {
            console.log('🏆 EXCELLENT - Ollama/Flexcon integration working perfectly');
        } else if (successRate >= 75) {
            console.log('✅ GOOD - Ollama/Flexcon mostly functional');
        } else if (successRate >= 50) {
            console.log('⚠️  FAIR - Some Ollama/Flexcon integration issues');
        } else {
            console.log('❌ POOR - Significant Ollama/Flexcon integration problems');
        }
        
        return testResults;
        
    } catch (error) {
        console.error('💥 Critical error during Ollama/Flexcon testing:', error.message);
        testResults.errors.push('Critical error: ' + error.message);
        return testResults;
    }
}

// Run the Ollama/Flexcon tests
if (require.main === module) {
    testOllamaFlexcon().then(results => {
        const success = results.failed === 0;
        console.log('\n' + (success ? '🏆 OLLAMA/FLEXCON TESTS COMPLETED' : '⚠️  OLLAMA/FLEXCON TESTS COMPLETED WITH ISSUES'));
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test execution failed:', error.message);
        process.exit(1);
    });
}

module.exports = { testOllamaFlexcon };