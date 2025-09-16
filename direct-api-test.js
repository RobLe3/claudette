#!/usr/bin/env node

// Direct API verification - bypass all Claudette layers to verify raw API connectivity
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function directAPITest() {
    console.log('🔬 DIRECT API VERIFICATION - BYPASS ALL LAYERS');
    console.log('='.repeat(50));
    
    // Test 1: Direct OpenAI API call (no Claudette involved)
    console.log('\n1. DIRECT OPENAI API TEST');
    console.log('-'.repeat(25));
    
    if (!process.env.OPENAI_API_KEY) {
        console.log('❌ OPENAI_API_KEY not found in environment');
        return;
    }
    
    console.log(`✅ API Key present (length: ${process.env.OPENAI_API_KEY.length})`);
    
    try {
        const startTime = Date.now();
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
                'User-Agent': 'claudette-direct-test/1.0'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: 'Test: What is 2+2?' }],
                max_tokens: 50
            })
        });
        
        const duration = Date.now() - startTime;
        
        if (!response.ok) {
            console.log(`❌ API call failed: ${response.status} ${response.statusText}`);
            const errorText = await response.text();
            console.log(`Error details: ${errorText}`);
            return;
        }
        
        const data = await response.json();
        
        console.log(`✅ API call successful (${duration}ms)`);
        console.log(`Model used: ${data.model}`);
        console.log(`Input tokens: ${data.usage.prompt_tokens}`);
        console.log(`Output tokens: ${data.usage.completion_tokens}`);
        console.log(`Total tokens: ${data.usage.total_tokens}`);
        console.log(`Response: ${data.choices[0].message.content}`);
        
        // Calculate actual cost
        const inputCost = (data.usage.prompt_tokens / 1000) * 0.00015; // $0.15 per 1K input tokens
        const outputCost = (data.usage.completion_tokens / 1000) * 0.0006; // $0.60 per 1K output tokens
        const totalCost = inputCost + outputCost;
        
        console.log(`Calculated cost: $${totalCost.toFixed(6)}`);
        
    } catch (error) {
        console.log(`❌ Direct API test failed: ${error.message}`);
        return;
    }
    
    // Test 2: Test Claudette with forced OpenAI backend
    console.log('\n2. CLAUDETTE WITH FORCED OPENAI');
    console.log('-'.repeat(31));
    
    try {
        const { Claudette } = require('./dist/index.js');
        const claudette = new Claudette();
        
        // Force initialization without health checks timing out
        console.log('Initializing Claudette...');
        await claudette.initialize();
        
        console.log('Testing with forced OpenAI backend...');
        const response = await claudette.optimize('Test: What is 3+3?', [], {
            backend: 'openai',
            bypass_cache: true
        });
        
        console.log(`✅ Claudette request successful`);
        console.log(`Backend used: ${response.backend_used}`);
        console.log(`Input tokens: ${response.tokens_input}`);
        console.log(`Output tokens: ${response.tokens_output}`);
        console.log(`Cost: €${response.cost_eur.toFixed(6)}`);
        console.log(`Latency: ${response.latency_ms}ms`);
        console.log(`Response: ${response.content}`);
        
        await claudette.cleanup();
        
    } catch (error) {
        console.log(`❌ Claudette test failed: ${error.message}`);
        console.log(`Stack trace: ${error.stack}`);
    }
    
    // Test 3: Health check timeout investigation
    console.log('\n3. HEALTH CHECK TIMEOUT INVESTIGATION');
    console.log('-'.repeat(37));
    
    try {
        // Test direct health check to OpenAI models endpoint
        const healthStart = Date.now();
        
        const healthResponse = await fetch('https://api.openai.com/v1/models', {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'User-Agent': 'claudette-health-check/1.0'
            }
        });
        
        const healthDuration = Date.now() - healthStart;
        
        if (healthResponse.ok) {
            console.log(`✅ OpenAI models endpoint reachable (${healthDuration}ms)`);
            const models = await healthResponse.json();
            console.log(`Available models: ${models.data.length}`);
        } else {
            console.log(`❌ Health check failed: ${healthResponse.status}`);
        }
        
    } catch (error) {
        console.log(`❌ Health check investigation failed: ${error.message}`);
    }
}

directAPITest().catch(console.error);