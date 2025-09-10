#!/usr/bin/env node

// Direct OpenAI API Test
const fs = require('fs');
const path = require('path');

console.log('🔑 DIRECT OPENAI API TEST\n');

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

async function testOpenAIDirect() {
    try {
        loadEnvFile();
        console.log('✅ Environment loaded');
        
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.log('❌ No OpenAI API key found');
            return;
        }
        
        console.log('✅ API key found:', apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 10));
        
        // Test with direct fetch
        console.log('\n📡 Testing direct API call...');
        
        const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📊 Response status:', response.status);
        console.log('📊 Response headers:', Object.fromEntries([...response.headers]));
        
        if (response.status === 200) {
            const data = await response.json();
            console.log('✅ API call successful');
            console.log('📋 Available models:', data.data?.length || 0);
            if (data.data && data.data.length > 0) {
                console.log('📋 Sample models:', data.data.slice(0, 3).map(m => m.id));
            }
        } else {
            const errorText = await response.text();
            console.log('❌ API call failed');
            console.log('📋 Error:', errorText);
        }
        
        // Test chat completion
        console.log('\n💬 Testing chat completion...');
        
        const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'user', content: 'Say "Hello, World!" and nothing else.' }
                ],
                max_tokens: 10
            })
        });
        
        console.log('📊 Chat response status:', chatResponse.status);
        
        if (chatResponse.status === 200) {
            const chatData = await chatResponse.json();
            console.log('✅ Chat completion successful');
            console.log('📋 Response:', chatData.choices[0]?.message?.content);
            console.log('📋 Usage:', chatData.usage);
        } else {
            const errorText = await chatResponse.text();
            console.log('❌ Chat completion failed');
            console.log('📋 Error:', errorText);
        }
        
    } catch (error) {
        console.error('💥 Direct test error:', error.message);
    }
}

testOpenAIDirect();