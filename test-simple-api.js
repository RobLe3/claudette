#!/usr/bin/env node

// Simple API Test with Current Build
const fs = require('fs');
const path = require('path');

console.log('🧪 SIMPLE API TEST WITH CLAUDETTE\n');

// Load environment variables
function loadEnvFile() {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const [key, value] = line.split('=', 2);
                if (key && value) {
                    process.env[key.trim()] = value.trim();
                }
            }
        });
    }
}

async function testSimpleAPI() {
    try {
        loadEnvFile();
        console.log('✅ Environment loaded, API key present:', !!process.env.OPENAI_API_KEY);
        
        // Import the compiled backend directly
        const { OpenAIBackend } = require('./dist/backends/openai.js');
        console.log('✅ OpenAI backend imported');
        
        // Create backend instance with minimal config
        const backend = new OpenAIBackend({
            enabled: true,
            priority: 1,
            cost_per_token: 0.0001,
            model: 'gpt-4o-mini'
        });
        console.log('✅ OpenAI backend created');
        
        // Test availability check
        console.log('\n📊 Testing availability...');
        const available = await backend.isAvailable();
        console.log('📊 Backend available:', available);
        
        if (available) {
            // Test sending a request
            console.log('\n📨 Testing request...');
            const testRequest = {
                prompt: 'Say hello in exactly 3 words.',
                files: [],
                options: {},
                metadata: {
                    timestamp: new Date().toISOString(),
                    request_id: 'test-request'
                }
            };
            
            const response = await backend.send(testRequest);
            console.log('✅ Request successful!');
            console.log('📋 Response content:', response.content);
            console.log('📋 Backend used:', response.backend_used);
            console.log('📋 Tokens:', `${response.tokens_input}→${response.tokens_output}`);
            console.log('📋 Cost:', `€${response.cost_eur}`);
            console.log('📋 Latency:', `${response.latency_ms}ms`);
        } else {
            console.log('❌ Backend not available');
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
        console.error('Stack:', error.stack);
    }
}

testSimpleAPI();