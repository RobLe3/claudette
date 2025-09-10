#!/usr/bin/env node

// Direct OpenAI Backend Test - bypassing health check
const fs = require('fs');
const path = require('path');

console.log('🔧 DIRECT OPENAI BACKEND TEST\n');

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

async function testDirectBackend() {
    try {
        loadEnvFile();
        
        // Import OpenAI directly and create a simple client
        const OpenAI = require('openai');
        
        console.log('✅ Creating OpenAI client with API key...');
        const client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            timeout: 30000
        });
        
        console.log('✅ Testing models list...');
        const models = await client.models.list();
        console.log('✅ Models retrieved:', models.data?.length || 0);
        
        console.log('\n💬 Testing chat completion...');
        const completion = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'user', content: 'Respond with exactly: "Backend working!"' }
            ],
            max_tokens: 10
        });
        
        console.log('✅ Chat completion successful');
        console.log('📋 Response:', completion.choices[0]?.message?.content);
        console.log('📋 Usage:', completion.usage);
        console.log('📋 Model:', completion.model);
        
        console.log('\n🎯 OpenAI SDK is working perfectly!');
        console.log('The issue is in the Claudette backend health check implementation.');
        
    } catch (error) {
        console.error('❌ Direct backend test error:', error.message);
        if (error.response) {
            console.error('📋 Response status:', error.response.status);
            console.error('📋 Response data:', error.response.data);
        }
    }
}

testDirectBackend();