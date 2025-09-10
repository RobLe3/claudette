#!/usr/bin/env node

/**
 * Debug OpenAI Configuration Issues
 */

require('dotenv').config();

async function debugOpenAIConfig() {
    console.log('🔍 Debugging OpenAI Configuration');
    console.log('=================================');
    
    try {
        // Check environment
        console.log('\n📋 Environment Check:');
        console.log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'Set (' + process.env.OPENAI_API_KEY.substring(0, 20) + '...)' : 'Not set'}`);
        
        // Load Claudette and check config
        const { Claudette } = require('./dist/index.js');
        const claudette = new Claudette();
        const config = claudette.getConfig();
        
        console.log('\n⚙️ Configuration Check:');
        console.log(`OpenAI enabled: ${config.backends?.openai?.enabled}`);
        console.log(`OpenAI model: ${config.backends?.openai?.model}`);
        console.log(`OpenAI priority: ${config.backends?.openai?.priority}`);
        console.log(`OpenAI cost per token: ${config.backends?.openai?.cost_per_token}`);
        console.log(`OpenAI API key in config: ${config.backends?.openai?.api_key ? 'Set' : 'Not set'}`);
        
        await claudette.initialize();
        
        // Check backend registration
        const backends = claudette.router.getBackends();
        const openaiBackend = backends.find(b => b.name === 'openai');
        
        console.log('\n🔧 Backend Registration:');
        console.log(`OpenAI backend registered: ${!!openaiBackend}`);
        if (openaiBackend) {
            console.log(`OpenAI backend config: ${JSON.stringify(openaiBackend.config, null, 2)}`);
        }
        
        // Try direct OpenAI API test
        console.log('\n🧪 Direct OpenAI API Test:');
        try {
            const OpenAI = require('openai');
            const client = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
                timeout: 10000
            });
            
            // Test models endpoint
            console.log('Testing models.list()...');
            const models = await client.models.list();
            console.log(`✅ Models API works, found ${models.data.length} models`);
            console.log(`Available models: ${models.data.slice(0, 5).map(m => m.id).join(', ')}...`);
            
            // Test completion with gpt-4o-mini
            console.log('\nTesting chat completion with gpt-4o-mini...');
            const completion = await client.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: 'Say "API test successful"' }],
                max_tokens: 50
            });
            
            console.log(`✅ Chat completion works`);
            console.log(`Response: "${completion.choices[0]?.message?.content}"`);
            console.log(`Model used: ${completion.model}`);
            console.log(`Tokens: ${completion.usage?.prompt_tokens}+${completion.usage?.completion_tokens}`);
            
        } catch (apiError) {
            console.log(`❌ Direct OpenAI API test failed: ${apiError.message}`);
            
            // Check if it's a 404 model error
            if (apiError.message.includes('404') && apiError.message.includes('model')) {
                console.log('🔍 This appears to be a model selection issue');
                
                // Try with different models
                const testModels = ['gpt-4o-mini', 'gpt-3.5-turbo', 'gpt-4'];
                for (const testModel of testModels) {
                    try {
                        console.log(`   Testing model: ${testModel}...`);
                        const OpenAI = require('openai');
                        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
                        
                        const testCompletion = await client.chat.completions.create({
                            model: testModel,
                            messages: [{ role: 'user', content: 'test' }],
                            max_tokens: 5
                        });
                        
                        console.log(`   ✅ ${testModel} works!`);
                        break;
                        
                    } catch (modelError) {
                        console.log(`   ❌ ${testModel}: ${modelError.message}`);
                    }
                }
            }
        }
        
        // Test Claudette's OpenAI backend health check
        console.log('\n🏥 Backend Health Check:');
        try {
            const healthResults = await claudette.router.healthCheckAll();
            const openaiHealth = healthResults.find(h => h.name === 'openai');
            console.log(`OpenAI health check result: ${JSON.stringify(openaiHealth, null, 2)}`);
        } catch (healthError) {
            console.log(`❌ Health check failed: ${healthError.message}`);
        }
        
        await claudette.cleanup();
        
    } catch (error) {
        console.log(`❌ Debug failed: ${error.message}`);
        console.log(`Stack: ${error.stack}`);
    }
}

if (require.main === module) {
    debugOpenAIConfig().catch(console.error);
}

module.exports = { debugOpenAIConfig };