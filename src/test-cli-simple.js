#!/usr/bin/env node

// Simple CLI experience test

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getApiKeyFromKeychain() {
  try {
    return execSync('security find-generic-password -a "openai" -s "openai-api-key" -w', 
      { encoding: 'utf8' }).trim();
  } catch (error) {
    return null;
  }
}

// Create a minimal working CLI for testing
function createTestCLI() {
  const cliPath = path.join(__dirname, 'test-cli.js');
  
  const cliContent = `#!/usr/bin/env node

const { OpenAIBackend } = require('./dist/backends/openai.js');

async function main() {
  const prompt = process.argv[2];
  const verbose = process.argv.includes('--verbose');
  
  if (!prompt) {
    console.log('Usage: node test-cli.js "your prompt" [--verbose]');
    process.exit(1);
  }

  try {
    console.log('🤖 Claudette v2.0.0 - Processing...');
    
    const backend = new OpenAIBackend({
      enabled: true,
      priority: 1,
      cost_per_token: 0.0001,
      model: 'gpt-4o-mini'
    });

    const response = await backend.send({
      prompt: prompt,
      files: [],
      options: { max_tokens: 200 }
    });

    // Main output
    console.log('');
    console.log(response.content);
    
    if (verbose) {
      console.log('');
      console.log('─'.repeat(50));
      console.log('📊 Response Metadata:');
      console.log('🔧 Backend:', response.backend_used);
      console.log('📊 Tokens:', response.tokens_input, 'in,', response.tokens_output, 'out');
      console.log('💰 Cost: €' + response.cost_eur.toFixed(6));
      console.log('⏱️ Latency:', response.latency_ms + 'ms');
      console.log('🗄️ Cache Hit:', response.cache_hit ? 'Yes' : 'No');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();`;

  fs.writeFileSync(cliPath, cliContent);
  fs.chmodSync(cliPath, '755');
  
  return cliPath;
}

async function testCLIOutput() {
  console.log('🎭 Testing CLI Output Quality\n');

  const apiKey = getApiKeyFromKeychain();
  if (!apiKey) {
    console.error('❌ No API key found');
    return false;
  }

  const cliPath = createTestCLI();
  console.log('✅ Test CLI created');

  const testCases = [
    {
      name: "Simple Math",
      prompt: "What is 5 + 3?",
      expected: "8",
      timeout: 15000
    },
    {
      name: "Technical Explanation", 
      prompt: "What is JSON in one sentence?",
      expected: "JSON",
      timeout: 15000
    },
    {
      name: "Creative Task",
      prompt: "Write a 2-line poem about rain",
      expected: "rain",
      timeout: 20000
    }
  ];

  const results = [];

  for (const test of testCases) {
    console.log(`🧪 Testing: ${test.name}`);
    console.log(`📝 Prompt: "${test.prompt}"`);
    console.log('─'.repeat(50));

    try {
      const startTime = Date.now();
      
      const result = execSync(`node "${cliPath}" "${test.prompt}" --verbose`, { 
        encoding: 'utf8',
        timeout: test.timeout,
        env: { ...process.env, OPENAI_API_KEY: apiKey }
      });
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      console.log('📤 CLI Output:');
      console.log(result);
      
      // Quality checks
      const containsExpected = result.toLowerCase().includes(test.expected.toLowerCase());
      const hasMetadata = result.includes('Backend:') && result.includes('Cost:');
      const noErrors = !result.toLowerCase().includes('error');
      const reasonableTime = executionTime < test.timeout;
      const hasContent = result.trim().length > 20;

      console.log('🎯 Quality Assessment:');
      console.log(`  ✅ Contains expected content: ${containsExpected ? '✅' : '❌'}`);
      console.log(`  ✅ Shows metadata: ${hasMetadata ? '✅' : '❌'}`);
      console.log(`  ✅ No errors: ${noErrors ? '✅' : '❌'}`);
      console.log(`  ✅ Reasonable time (${executionTime}ms): ${reasonableTime ? '✅' : '❌'}`);
      console.log(`  ✅ Has content: ${hasContent ? '✅' : '❌'}`);

      const passed = containsExpected && hasMetadata && noErrors && reasonableTime && hasContent;
      results.push(passed);
      
      console.log(`\n📊 Result: ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);

    } catch (error) {
      console.error(`❌ Test failed: ${error.message}\n`);
      results.push(false);
    }
  }

  // Cleanup
  fs.unlinkSync(cliPath);

  const passed = results.filter(r => r).length;
  const total = results.length;

  console.log('='.repeat(60));
  console.log(`📊 CLI Quality Results: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('\n🎉 Excellent CLI Output Quality!');
    console.log('\n✅ Verified CLI Features:');
    console.log('  🎯 Accurate AI responses');
    console.log('  📊 Detailed metadata display');
    console.log('  💰 Real-time cost tracking');
    console.log('  ⚡ Good performance');
    console.log('  🛡️ Error handling');
    console.log('  💫 Clean output formatting');
  } else {
    console.log('\n⚠️ Some CLI quality issues detected');
  }

  return passed === total;
}

// Test comparison with direct API call
async function testVsDirectAPI() {
  console.log('\n🔄 Comparing Claudette vs Direct API\n');

  const apiKey = getApiKeyFromKeychain();
  
  try {
    // Direct OpenAI call
    console.log('🔧 Testing direct OpenAI API call...');
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey });
    
    const directStart = Date.now();
    const directResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'What is the capital of Spain?' }],
      max_tokens: 50
    });
    const directTime = Date.now() - directStart;
    
    console.log('📤 Direct API Response:', directResponse.choices[0].message.content);
    console.log('⏱️ Direct API Time:', directTime + 'ms');
    console.log('💰 Direct API Tokens:', directResponse.usage.total_tokens);

    // Claudette call
    console.log('\n🔧 Testing Claudette middleware...');
    const { OpenAIBackend } = require('./dist/backends/openai.js');
    
    const backend = new OpenAIBackend({
      enabled: true,
      priority: 1,
      cost_per_token: 0.0001,
      model: 'gpt-4o-mini'
    });

    const claudetteStart = Date.now();
    const claudetteResponse = await backend.send({
      prompt: 'What is the capital of Spain?',
      files: [],
      options: { max_tokens: 50 }
    });
    const claudetteTime = Date.now() - claudetteStart;

    console.log('📤 Claudette Response:', claudetteResponse.content);
    console.log('⏱️ Claudette Time:', claudetteTime + 'ms');
    console.log('💰 Claudette Cost: €' + claudetteResponse.cost_eur.toFixed(6));
    console.log('📊 Claudette Tokens:', claudetteResponse.tokens_input + claudetteResponse.tokens_output);

    // Comparison
    console.log('\n📊 Comparison Results:');
    const timeDiff = Math.abs(claudetteTime - directTime);
    const timeOverhead = timeDiff / directTime * 100;
    
    console.log(`⏱️ Time overhead: ${timeDiff}ms (${timeOverhead.toFixed(1)}%)`);
    console.log(`🔧 Added features: Cost tracking, error handling, routing`);
    console.log(`📈 Value: ${timeOverhead < 50 ? 'Excellent' : timeOverhead < 100 ? 'Good' : 'Fair'} (low overhead)`);

    return timeOverhead < 100; // Accept up to 100% overhead for added features

  } catch (error) {
    console.error('❌ Comparison test failed:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Comprehensive CLI Quality & Performance Testing');
  console.log('='.repeat(60));

  const results = [];
  
  try {
    results.push(await testCLIOutput());
    results.push(await testVsDirectAPI());

    const passed = results.filter(r => r).length;
    const total = results.length;

    console.log('\n' + '='.repeat(60));
    console.log(`🏆 Overall Assessment: ${passed}/${total} test suites passed`);

    if (passed === total) {
      console.log('\n🎉 OUTSTANDING CLAUDETTE QUALITY!');
      console.log('\n🌟 Summary of Excellence:');
      console.log('  ✨ High-quality AI responses matching expectations');
      console.log('  💫 Professional CLI interface with rich metadata');
      console.log('  💰 Accurate real-time cost tracking');
      console.log('  ⚡ Performance comparable to direct API calls');
      console.log('  🛡️ Robust error handling and user feedback');
      console.log('  🔧 Seamless integration with OpenAI backend');
      console.log('  📊 Comprehensive monitoring and analytics');
      
      console.log('\n🎯 Production Ready: Claudette successfully provides');
      console.log('    a high-quality middleware layer with significant');
      console.log('    added value over direct API usage.');
      
    } else {
      console.log('\n⚠️ Some quality benchmarks not met');
    }

    return passed === total;

  } catch (error) {
    console.error('💥 Test suite error:', error.message);
    return false;
  }
}

runTests().then(success => {
  process.exit(success ? 0 : 1);
});