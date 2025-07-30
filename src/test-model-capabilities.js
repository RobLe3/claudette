#!/usr/bin/env node

// Model enumeration and capability assessment for calibration

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getApiKeyFromKeychain(service, account) {
  try {
    return execSync(`security find-generic-password -a "${account}" -s "${service}" -w`, 
      { encoding: 'utf8' }).trim();
  } catch (error) {
    return null;
  }
}

// Model enumeration test
async function enumerateAvailableModels() {
  console.log('📋 Enumerating Available Models Across All Backends\n');

  const results = {
    backends: [],
    totalModels: 0,
    modelsByBackend: {}
  };

  try {
    // Test OpenAI models
    const openaiKey = getApiKeyFromKeychain('openai-api-key', 'openai');
    if (openaiKey) {
      console.log('🔍 OpenAI Backend Models:');
      const { OpenAIBackend } = require('./dist/backends/openai.js');
      
      const openaiBackend = new OpenAIBackend({
        enabled: true,
        priority: 1,
        cost_per_token: 0.0001,
        api_key: openaiKey,
        model: 'gpt-4o-mini'
      });

      const openaiModels = openaiBackend.getAvailableModels();
      console.log(`  Available models: ${openaiModels.length}`);
      openaiModels.forEach(model => console.log(`    - ${model}`));
      
      results.backends.push({
        name: 'openai',
        models: openaiModels,
        count: openaiModels.length,
        available: true
      });
      results.modelsByBackend.openai = openaiModels;
      results.totalModels += openaiModels.length;

      // Test actual API for current default model
      try {
        console.log('\n  🧪 Testing default model connectivity...');
        const testResponse = await openaiBackend.send({
          prompt: "Hello, what model are you?",
          files: [],
          options: { max_tokens: 50 }
        });
        console.log(`    ✅ Model responded: ${testResponse.content.substring(0, 100)}...`);
        console.log(`    📊 Tokens used: ${testResponse.tokens_input + testResponse.tokens_output}`);
        console.log(`    💰 Cost: €${testResponse.cost_eur.toFixed(6)}`);
      } catch (error) {
        console.log(`    ❌ Model test failed: ${error.message}`);
      }
    } else {
      console.log('⚠️ OpenAI Backend: No API key found');
      results.backends.push({
        name: 'openai',
        models: [],
        count: 0,
        available: false,
        error: 'No API key'
      });
    }

    // Test Qwen/CodeLLM models
    console.log('\n🔍 Qwen/CodeLLM Backend Models:');
    const qwenKey = getApiKeyFromKeychain('codellm-api-key', 'codellm');
    if (qwenKey) {
      const { QwenBackend } = require('./dist/backends/qwen.js');
      
      const qwenBackend = new QwenBackend({
        enabled: true,
        priority: 1,
        cost_per_token: 0.0001,
        api_key: qwenKey,
        base_url: 'https://tools.flexcon-ai.de',
        model: 'Qwen/Qwen2.5-Coder-7B-Instruct-AWQ'
      });

      const qwenModels = qwenBackend.getAvailableModels();
      console.log(`  Available models: ${qwenModels.length}`);
      qwenModels.forEach(model => console.log(`    - ${model}`));

      results.backends.push({
        name: 'qwen',
        models: qwenModels,
        count: qwenModels.length,
        available: true
      });
      results.modelsByBackend.qwen = qwenModels;
      results.totalModels += qwenModels.length;

      // Test live API model enumeration
      try {
        console.log('\n  🌐 Fetching live model list from API...');
        const response = await fetch('https://tools.flexcon-ai.de/v1/models', {
          headers: {
            'Authorization': `Bearer ${qwenKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const liveModels = data.data.map(model => model.id);
          console.log(`    ✅ Live API reports ${liveModels.length} models:`);
          liveModels.forEach(model => console.log(`      - ${model}`));
          
          results.backends[results.backends.length - 1].liveModels = liveModels;
          results.backends[results.backends.length - 1].liveCount = liveModels.length;
        } else {
          console.log(`    ❌ API request failed: ${response.status}`);
        }
      } catch (error) {
        console.log(`    ❌ Live model enumeration failed: ${error.message}`);
      }

      // Test default model
      try {
        console.log('\n  🧪 Testing default Qwen model...');
        const testResponse = await qwenBackend.send({
          prompt: "What programming language are you optimized for?",
          files: [],
          options: { max_tokens: 50 }
        });
        console.log(`    ✅ Model responded: ${testResponse.content.substring(0, 100)}...`);
        console.log(`    📊 Tokens used: ${testResponse.tokens_input + testResponse.tokens_output}`);
        console.log(`    💰 Cost: €${testResponse.cost_eur.toFixed(6)}`);
      } catch (error) {
        console.log(`    ❌ Model test failed: ${error.message}`);
      }

    } else {
      console.log('⚠️ Qwen Backend: No API key found');
      results.backends.push({
        name: 'qwen',
        models: [],
        count: 0,
        available: false,
        error: 'No API key'
      });
    }

    // Claude backend (placeholder for future)
    console.log('\n🔍 Claude Backend Models:');
    try {
      // This would be implemented when Claude backend is added
      console.log('  📝 Not yet implemented - placeholder for Anthropic API');
      results.backends.push({
        name: 'claude',
        models: ['claude-3-sonnet', 'claude-3-haiku', 'claude-3-opus'],
        count: 3,
        available: false,
        error: 'Not implemented'
      });
    } catch (error) {
      console.log(`  ❌ Claude enumeration failed: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Model enumeration failed:', error.message);
    return null;
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Model Enumeration Summary:');
  console.log(`  Total backends: ${results.backends.length}`);
  console.log(`  Active backends: ${results.backends.filter(b => b.available).length}`);
  console.log(`  Total models: ${results.totalModels}`);
  console.log('');

  results.backends.forEach(backend => {
    const status = backend.available ? '✅' : '❌';
    const info = backend.available ? `${backend.count} models` : backend.error;
    console.log(`  ${status} ${backend.name}: ${info}`);
  });

  return results;
}

// Capability assessment framework
async function assessModelCapabilities() {
  console.log('\n🧪 Model Capability Assessment Framework\n');

  const capabilityTests = [
    {
      category: 'Mathematical Reasoning',
      tests: [
        {
          name: 'Basic Arithmetic',
          prompt: 'What is 127 * 83?',
          expectedAnswer: '10541',
          weight: 1.0,
          evaluator: (response, expected) => response.includes(expected)
        },
        {
          name: 'Word Problems',
          prompt: 'A store has 45 apples. If they sell 18 in the morning and 12 in the afternoon, how many apples are left?',
          expectedAnswer: '15',
          weight: 1.5,
          evaluator: (response, expected) => response.includes(expected)
        },
        {
          name: 'Algebraic Thinking',
          prompt: 'If x + 5 = 12, what is x?',
          expectedAnswer: '7',
          weight: 2.0,
          evaluator: (response, expected) => response.includes(expected) || response.includes('seven')
        }
      ]
    },
    {
      category: 'Code Generation',
      tests: [
        {
          name: 'Simple Function',
          prompt: 'Write a Python function that takes two numbers and returns their sum',
          expectedKeywords: ['def', 'return', '+'],
          weight: 1.0,
          evaluator: (response, expected) => expected.every(keyword => response.toLowerCase().includes(keyword.toLowerCase()))
        },
        {
          name: 'Algorithm Implementation',
          prompt: 'Write a Python function to find the factorial of a number',
          expectedKeywords: ['def', 'factorial', 'return'],
          weight: 2.0,
          evaluator: (response, expected) => expected.every(keyword => response.toLowerCase().includes(keyword.toLowerCase()))
        },
        {
          name: 'Data Structure Usage',
          prompt: 'Create a Python class for a simple stack with push and pop methods',
          expectedKeywords: ['class', 'def push', 'def pop'],
          weight: 2.5,
          evaluator: (response, expected) => expected.every(keyword => response.toLowerCase().includes(keyword.toLowerCase()))
        }
      ]
    },
    {
      category: 'Language Understanding',
      tests: [
        {
          name: 'Sentiment Analysis',
          prompt: 'What is the sentiment of this sentence: "I love sunny days!"',
          expectedKeywords: ['positive', 'happy', 'good'],
          weight: 1.0,
          evaluator: (response, expected) => expected.some(keyword => response.toLowerCase().includes(keyword.toLowerCase()))
        },
        {
          name: 'Text Summarization',
          prompt: 'Summarize in one sentence: "Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions from data without being explicitly programmed for every task."',
          expectedKeywords: ['machine learning', 'ai', 'data', 'learn'],
          weight: 1.5,
          evaluator: (response, expected) => expected.filter(keyword => response.toLowerCase().includes(keyword.toLowerCase())).length >= 2
        }
      ]
    },
    {
      category: 'Creative Tasks',
      tests: [
        {
          name: 'Simple Poetry',
          prompt: 'Write a 2-line rhyming poem about technology',
          expectedStructure: 'two_lines',
          weight: 1.0,
          evaluator: (response) => {
            const lines = response.split('\n').filter(line => line.trim().length > 0);
            return lines.length >= 2;
          }
        },
        {
          name: 'Story Beginning',
          prompt: 'Write the first paragraph of a short story about a robot',
          expectedKeywords: ['robot'],
          weight: 1.5,
          evaluator: (response, expected) => expected.every(keyword => response.toLowerCase().includes(keyword.toLowerCase())) && response.length > 50
        }
      ]
    }
  ];

  const backendResults = {};

  // Test OpenAI capabilities
  const openaiKey = getApiKeyFromKeychain('openai-api-key', 'openai');
  if (openaiKey) {
    console.log('🔬 Testing OpenAI Model Capabilities...');
    backendResults.openai = await testBackendCapabilities('openai', openaiKey, capabilityTests);
  }

  // Test Qwen capabilities  
  const qwenKey = getApiKeyFromKeychain('codellm-api-key', 'codellm');
  if (qwenKey) {
    console.log('\n🔬 Testing Qwen Model Capabilities...');
    backendResults.qwen = await testBackendCapabilities('qwen', qwenKey, capabilityTests);
  }

  return { capabilityTests, backendResults };
}

async function testBackendCapabilities(backendName, apiKey, capabilityTests) {
  const results = {
    backend: backendName,
    categories: {},
    overallScore: 0,
    totalTests: 0,
    passedTests: 0
  };

  try {
    let backend;
    if (backendName === 'openai') {
      const { OpenAIBackend } = require('./dist/backends/openai.js');
      backend = new OpenAIBackend({
        enabled: true,
        priority: 1,
        cost_per_token: 0.0001,
        api_key: apiKey,
        model: 'gpt-4o-mini'
      });
    } else if (backendName === 'qwen') {
      const { QwenBackend } = require('./dist/backends/qwen.js');
      backend = new QwenBackend({
        enabled: true,
        priority: 1,
        cost_per_token: 0.0001,
        api_key: apiKey,
        base_url: 'https://tools.flexcon-ai.de',
        model: 'Qwen/Qwen2.5-Coder-7B-Instruct-AWQ'
      });
    }

    for (const category of capabilityTests) {
      console.log(`\n  📂 ${category.category}:`);
      
      const categoryResults = {
        name: category.category,
        tests: [],
        score: 0,
        weightedScore: 0,
        totalWeight: 0
      };

      for (const test of category.tests) {
        console.log(`    🧪 ${test.name}...`);
        
        try {
          const response = await backend.send({
            prompt: test.prompt,
            files: [],
            options: { max_tokens: 150 }
          });

          let passed = false;
          if (test.expectedAnswer) {
            passed = test.evaluator(response.content, test.expectedAnswer);
          } else if (test.expectedKeywords) {
            passed = test.evaluator(response.content, test.expectedKeywords);
          } else {
            passed = test.evaluator(response.content);
          }

          const testResult = {
            name: test.name,
            prompt: test.prompt,
            response: response.content.substring(0, 200) + (response.content.length > 200 ? '...' : ''),
            passed,
            weight: test.weight,
            cost: response.cost_eur,
            latency: response.latency_ms
          };

          categoryResults.tests.push(testResult);
          categoryResults.totalWeight += test.weight;
          
          if (passed) {
            categoryResults.score += 1;
            categoryResults.weightedScore += test.weight;
            results.passedTests += 1;
          }
          
          results.totalTests += 1;

          console.log(`      ${passed ? '✅' : '❌'} Result: ${passed ? 'PASSED' : 'FAILED'}`);
          console.log(`      📝 Response: ${testResult.response}`);
          console.log(`      💰 Cost: €${response.cost_eur.toFixed(6)} | ⏱️ Latency: ${response.latency_ms}ms`);

        } catch (error) {
          console.log(`      ❌ Test failed: ${error.message}`);
          categoryResults.tests.push({
            name: test.name,
            prompt: test.prompt,
            response: `ERROR: ${error.message}`,
            passed: false,
            weight: test.weight,
            cost: 0,
            latency: 0
          });
          categoryResults.totalWeight += test.weight;
          results.totalTests += 1;
        }
      }

      // Calculate category percentage
      const categoryPercentage = categoryResults.totalWeight > 0 
        ? (categoryResults.weightedScore / categoryResults.totalWeight) * 100 
        : 0;
      
      categoryResults.percentage = categoryPercentage;
      results.categories[category.category] = categoryResults;

      console.log(`    📊 Category Score: ${categoryResults.score}/${categoryResults.tests.length} (${categoryPercentage.toFixed(1)}%)`);
    }

    // Calculate overall score
    results.overallScore = (results.passedTests / results.totalTests) * 100;

  } catch (error) {
    console.error(`❌ Backend capability testing failed: ${error.message}`);
  }

  return results;
}

// Generate calibration report
function generateCalibrationReport(modelEnum, capabilityResults) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 MODEL CALIBRATION REPORT');
  console.log('='.repeat(80));

  const timestamp = new Date().toISOString();
  console.log(`Generated: ${timestamp}`);
  console.log(`Testing Framework: Claudette v2.0.0\n`);

  // Model enumeration summary
  console.log('📋 AVAILABLE MODELS:');
  if (modelEnum) {
    modelEnum.backends.forEach(backend => {
      console.log(`\n  🔧 ${backend.name.toUpperCase()} Backend:`);
      console.log(`    Status: ${backend.available ? '✅ Available' : '❌ Unavailable'}`);
      console.log(`    Models: ${backend.count}`);
      if (backend.models && backend.models.length > 0) {
        backend.models.forEach(model => console.log(`      - ${model}`));
      }
      if (backend.liveModels && backend.liveModels.length > 0 && backend.liveModels.length !== backend.models.length) {
        console.log(`    Live API Models: ${backend.liveCount}`);
        backend.liveModels.forEach(model => console.log(`      - ${model}`));
      }
    });
  }

  // Capability assessment summary
  console.log('\n🧪 CAPABILITY ASSESSMENT:');
  if (capabilityResults && capabilityResults.backendResults) {
    Object.entries(capabilityResults.backendResults).forEach(([backendName, results]) => {
      console.log(`\n  🤖 ${backendName.toUpperCase()} Performance:`);
      console.log(`    Overall Score: ${results.overallScore.toFixed(1)}% (${results.passedTests}/${results.totalTests} tests)`);
      
      Object.entries(results.categories).forEach(([categoryName, category]) => {
        console.log(`    ${categoryName}: ${category.percentage.toFixed(1)}% (${category.score}/${category.tests.length})`);
      });
    });

    // Performance comparison
    const backends = Object.keys(capabilityResults.backendResults);
    if (backends.length > 1) {
      console.log('\n🏆 PERFORMANCE COMPARISON:');
      
      const comparisons = capabilityResults.capabilityTests.map(category => {
        const categoryName = category.category;
        const scores = backends.map(backend => ({
          backend,
          score: capabilityResults.backendResults[backend].categories[categoryName]?.percentage || 0
        }));
        scores.sort((a, b) => b.score - a.score);
        return { category: categoryName, scores };
      });

      comparisons.forEach(comp => {
        console.log(`\n  📂 ${comp.category}:`);
        comp.scores.forEach((score, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
          console.log(`    ${medal} ${score.backend}: ${score.score.toFixed(1)}%`);
        });
      });
    }
  }

  // Calibration recommendations
  console.log('\n🎯 CALIBRATION RECOMMENDATIONS:');
  
  if (capabilityResults && capabilityResults.backendResults) {
    Object.entries(capabilityResults.backendResults).forEach(([backendName, results]) => {
      console.log(`\n  🔧 ${backendName.toUpperCase()}:`);
      
      Object.entries(results.categories).forEach(([categoryName, category]) => {
        if (category.percentage < 70) {
          console.log(`    ⚠️ ${categoryName}: Below optimal (${category.percentage.toFixed(1)}%)`);
          console.log(`      💡 Consider model fine-tuning or parameter adjustment`);
        } else if (category.percentage >= 90) {
          console.log(`    ✨ ${categoryName}: Excellent performance (${category.percentage.toFixed(1)}%)`);
        }
      });

      // Cost efficiency analysis
      const totalCost = Object.values(results.categories)
        .flatMap(cat => cat.tests)
        .reduce((sum, test) => sum + test.cost, 0);
      
      console.log(`    💰 Total test cost: €${totalCost.toFixed(6)}`);
      console.log(`    📊 Cost per test: €${(totalCost / results.totalTests).toFixed(6)}`);
    });
  }

  console.log('\n' + '='.repeat(80));
  
  return {
    timestamp,
    modelEnumeration: modelEnum,
    capabilityResults,
    recommendations: 'See calibration recommendations above'
  };
}

// Main test runner
async function runModelCalibrationSuite() {
  console.log('🚀 Model & Capability Calibration Suite');
  console.log('='.repeat(70));

  try {
    // Step 1: Enumerate available models
    const modelEnum = await enumerateAvailableModels();
    
    // Step 2: Assess model capabilities
    const capabilityResults = await assessModelCapabilities();
    
    // Step 3: Generate calibration report
    const report = generateCalibrationReport(modelEnum, capabilityResults);
    
    // Save report to file
    const reportPath = path.join(__dirname, `calibration-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);

    return true;

  } catch (error) {
    console.error('💥 Calibration suite failed:', error.message);
    return false;
  }
}

runModelCalibrationSuite().then(success => {
  process.exit(success ? 0 : 1);
});