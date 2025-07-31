#!/usr/bin/env node

// Direct Qwen Assessment with Adaptive Timeouts
// Focused test for self-hosted Qwen performance evaluation

const { execSync } = require('child_process');

class DirectQwenAssessment {
  constructor() {
    this.startTime = Date.now();
  }

  getApiKeyFromKeychain(service, account) {
    try {
      return execSync(`security find-generic-password -a "${account}" -s "${service}" -w`, 
        { encoding: 'utf8' }).trim();
    } catch (error) {
      return null;
    }
  }

  async testQwenWithTimeout(prompt, timeoutMs = 120000) {
    console.log(`\n🤖 Testing Qwen with ${timeoutMs/1000}s timeout...`);
    console.log(`📝 Prompt: ${prompt.substring(0, 80)}...`);
    
    const qwenKey = this.getApiKeyFromKeychain('codellm-api-key', 'codellm');
    
    if (!qwenKey) {
      console.log('❌ No Qwen API key found in keychain');
      return null;
    }

    try {
      const { QwenBackend } = require('./dist/backends/qwen.js');
      const qwenBackend = new QwenBackend({
        enabled: true,
        priority: 1,
        cost_per_token: 0.0001,
        api_key: qwenKey,
        base_url: 'https://tools.flexcon-ai.de',
        model: 'Qwen/Qwen2.5-Coder-7B-Instruct-AWQ'
      });

      const startTime = Date.now();
      
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Qwen timeout after ${timeoutMs}ms`)), timeoutMs)
      );

      // Race between request and timeout
      const response = await Promise.race([
        qwenBackend.send({
          prompt,
          files: [],
          options: { max_tokens: 800, temperature: 0.1 }
        }),
        timeoutPromise
      ]);

      const latency = Date.now() - startTime;
      
      console.log(`✅ Qwen Success in ${latency}ms`);
      console.log(`📊 Response length: ${response.content.length} chars`);
      console.log(`💰 Cost: €${response.cost_eur.toFixed(6)}`);
      console.log(`🔢 Tokens: ${response.tokens_input} in, ${response.tokens_output} out`);
      
      return {
        success: true,
        latency,
        cost: response.cost_eur,
        tokens: response.tokens_input + response.tokens_output,
        responseLength: response.content.length,
        response: response.content.substring(0, 200) + '...'
      };

    } catch (error) {
      const latency = Date.now() - startTime;
      const isTimeout = error.message.includes('timeout');
      
      console.log(`❌ Qwen ${isTimeout ? 'Timeout' : 'Error'} after ${latency}ms`);
      console.log(`🔍 Error: ${error.message}`);
      
      return {
        success: false,
        latency,
        error: error.message,
        timeout: isTimeout
      };
    }
  }

  async testChatGPTComparison(prompt) {
    console.log(`\n💬 Testing ChatGPT for comparison...`);
    
    const openaiKey = this.getApiKeyFromKeychain('openai-api-key', 'openai');
    
    if (!openaiKey) {
      console.log('❌ No OpenAI API key found in keychain');
      return null;
    }

    try {
      const { OpenAIBackend } = require('./dist/backends/openai.js');
      const openaiBackend = new OpenAIBackend({
        enabled: true,
        priority: 1,
        cost_per_token: 0.0001,
        api_key: openaiKey,
        model: 'gpt-4o-mini'
      });

      const startTime = Date.now();
      const response = await openaiBackend.send({
        prompt,
        files: [],
        options: { max_tokens: 800, temperature: 0.1 }
      });

      const latency = Date.now() - startTime;
      
      console.log(`✅ ChatGPT Success in ${latency}ms`);
      console.log(`📊 Response length: ${response.content.length} chars`);
      console.log(`💰 Cost: €${response.cost_eur.toFixed(6)}`);
      
      return {
        success: true,
        latency,
        cost: response.cost_eur,
        tokens: response.tokens_input + response.tokens_output,
        responseLength: response.content.length,
        response: response.content.substring(0, 200) + '...'
      };

    } catch (error) {
      const latency = Date.now() - startTime;
      
      console.log(`❌ ChatGPT Error after ${latency}ms: ${error.message}`);
      
      return {
        success: false,
        latency,
        error: error.message
      };
    }
  }

  async runDirectAssessment() {
    console.log('🚀 Direct Qwen Assessment with Adaptive Timeouts');
    console.log('='.repeat(55));
    console.log('🎯 Testing self-hosted Qwen with enhanced timeout handling');
    console.log('');

    const testCases = [
      {
        name: 'Simple Algorithm',
        prompt: 'Write a Python function to implement binary search on a sorted array. Include error handling and comments.',
        timeout: 60000 // 1 minute
      },
      {
        name: 'Data Structure',
        prompt: 'Create a Python class for a stack that supports push, pop, and getMin operations in O(1) time complexity.',
        timeout: 90000 // 1.5 minutes
      },
      {
        name: 'Complex Implementation',
        prompt: 'Implement a REST API endpoint in Python using FastAPI for user authentication with JWT tokens, including input validation and error handling.',
        timeout: 180000 // 3 minutes
      }
    ];

    const results = {
      qwen: [],
      chatgpt: [],
      comparison: {}
    };

    for (const testCase of testCases) {
      console.log(`\n📋 Testing: ${testCase.name}`);
      console.log('─'.repeat(40));

      // Test Qwen with adaptive timeout
      const qwenResult = await this.testQwenWithTimeout(testCase.prompt, testCase.timeout);
      if (qwenResult) {
        results.qwen.push({ ...qwenResult, testName: testCase.name });
      }

      // Test ChatGPT for comparison
      const chatgptResult = await this.testChatGPTComparison(testCase.prompt);
      if (chatgptResult) {
        results.chatgpt.push({ ...chatgptResult, testName: testCase.name });
      }

      // Brief pause between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Generate comparison
    this.generateComparison(results);
    
    return results;
  }

  generateComparison(results) {
    console.log('\n' + '='.repeat(55));
    console.log('📊 DIRECT QWEN ASSESSMENT RESULTS');
    console.log('='.repeat(55));

    const qwenSuccessful = results.qwen.filter(r => r.success);
    const chatgptSuccessful = results.chatgpt.filter(r => r.success);

    console.log('\n🎯 SUCCESS RATES:');
    console.log(`🤖 Qwen: ${qwenSuccessful.length}/${results.qwen.length} (${(qwenSuccessful.length/results.qwen.length*100).toFixed(1)}%)`);
    console.log(`💬 ChatGPT: ${chatgptSuccessful.length}/${results.chatgpt.length} (${(chatgptSuccessful.length/results.chatgpt.length*100).toFixed(1)}%)`);

    if (qwenSuccessful.length > 0) {
      const avgQwenLatency = qwenSuccessful.reduce((sum, r) => sum + r.latency, 0) / qwenSuccessful.length;
      const avgQwenCost = qwenSuccessful.reduce((sum, r) => sum + r.cost, 0) / qwenSuccessful.length;
      
      console.log('\n🤖 QWEN PERFORMANCE:');
      console.log(`   Average Latency: ${avgQwenLatency.toFixed(0)}ms`);
      console.log(`   Average Cost: €${avgQwenCost.toFixed(6)}`);
      console.log(`   Response Quality: ${qwenSuccessful.every(r => r.responseLength > 100) ? 'Good' : 'Variable'}`);
    }

    if (chatgptSuccessful.length > 0) {
      const avgChatGPTLatency = chatgptSuccessful.reduce((sum, r) => sum + r.latency, 0) / chatgptSuccessful.length;
      const avgChatGPTCost = chatgptSuccessful.reduce((sum, r) => sum + r.cost, 0) / chatgptSuccessful.length;
      
      console.log('\n💬 CHATGPT PERFORMANCE:');
      console.log(`   Average Latency: ${avgChatGPTLatency.toFixed(0)}ms`);
      console.log(`   Average Cost: €${avgChatGPTCost.toFixed(6)}`);
      console.log(`   Response Quality: ${chatgptSuccessful.every(r => r.responseLength > 100) ? 'Good' : 'Variable'}`);
    }

    // Timeout analysis
    const qwenTimeouts = results.qwen.filter(r => !r.success && r.timeout);
    if (qwenTimeouts.length > 0) {
      console.log('\n⏰ QWEN TIMEOUT ANALYSIS:');
      console.log(`   Timeouts: ${qwenTimeouts.length}/${results.qwen.length}`);
      console.log(`   Average timeout latency: ${qwenTimeouts.reduce((sum, r) => sum + r.latency, 0) / qwenTimeouts.length}ms`);
    }

    // Performance comparison
    if (qwenSuccessful.length > 0 && chatgptSuccessful.length > 0) {
      const qwenAvgLatency = qwenSuccessful.reduce((sum, r) => sum + r.latency, 0) / qwenSuccessful.length;
      const chatgptAvgLatency = chatgptSuccessful.reduce((sum, r) => sum + r.latency, 0) / chatgptSuccessful.length;
      const qwenAvgCost = qwenSuccessful.reduce((sum, r) => sum + r.cost, 0) / qwenSuccessful.length;
      const chatgptAvgCost = chatgptSuccessful.reduce((sum, r) => sum + r.cost, 0) / chatgptSuccessful.length;

      console.log('\n🔍 COMPARATIVE ANALYSIS:');
      console.log(`   Speed: ChatGPT is ${(qwenAvgLatency / chatgptAvgLatency).toFixed(1)}x faster`);
      
      if (qwenAvgCost > chatgptAvgCost) {
        console.log(`   Cost: ChatGPT is ${(qwenAvgCost / chatgptAvgCost).toFixed(1)}x more cost-effective`);
      } else {
        console.log(`   Cost: Qwen is ${(chatgptAvgCost / qwenAvgCost).toFixed(1)}x more cost-effective`);
      }
    }

    console.log('\n💡 ASSESSMENT VERDICT:');
    
    if (qwenSuccessful.length === 0) {
      console.log('   ❌ Qwen: Not viable - All requests failed or timed out');
      console.log('   💡 Recommendation: Investigate connectivity or increase timeouts significantly');
    } else if (qwenSuccessful.length < results.qwen.length / 2) {
      console.log('   ⚠️ Qwen: Unreliable - High failure rate');
      console.log('   💡 Recommendation: Use only for non-critical tasks with extended timeouts');
    } else {
      console.log('   ✅ Qwen: Viable for specialized coding tasks');
      console.log('   💡 Recommendation: Use with adaptive timeouts and async contribution patterns');
    }

    console.log('\n' + '='.repeat(55));
  }
}

async function main() {
  const assessment = new DirectQwenAssessment();
  
  try {
    await assessment.runDirectAssessment();
    process.exit(0);
  } catch (error) {
    console.error('Direct assessment failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { DirectQwenAssessment };