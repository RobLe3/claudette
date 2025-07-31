#!/usr/bin/env node

// Quick Qwen vs ChatGPT Coding Comparison
// Focused evaluation for self-hosted coding LLM

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================================================
// QUICK CODING TEST SCENARIOS
// ============================================================================

const QUICK_CODING_TESTS = [
  {
    category: 'Algorithm Implementation',
    weight: 0.4,
    test: {
      name: 'Binary Search Implementation',
      difficulty: 'Medium',
      prompt: `Implement binary search in Python with these requirements:
1. Recursive and iterative versions
2. Handle edge cases (empty array, not found)
3. Include time complexity analysis
4. Add test cases with different scenarios
5. Use proper error handling and documentation`,
      expectedElements: ['binary', 'search', 'recursive', 'iterative', 'left', 'right', 'mid', 'test'],
      specialty: 'algorithms'
    }
  },
  {
    category: 'Data Structures',
    weight: 0.3,
    test: {
      name: 'Stack with Min Operation',
      difficulty: 'Medium',
      prompt: `Create a stack data structure that supports push, pop, top, and getMin operations in O(1) time:
1. All operations must be O(1) time complexity
2. Use auxiliary space efficiently
3. Handle empty stack edge cases
4. Include comprehensive testing
5. Provide clear documentation and examples`,
      expectedElements: ['stack', 'push', 'pop', 'min', 'auxiliary', 'O(1)', 'empty', 'test'],
      specialty: 'data_structures'
    }
  },
  {
    category: 'Web Development',
    weight: 0.3,
    test: {
      name: 'API Rate Limiter',
      difficulty: 'Medium',
      prompt: `Implement a rate limiter for API endpoints in JavaScript/Node.js:
1. Support different rate limiting strategies (fixed window, sliding window)
2. Configure limits per user/IP
3. Return appropriate HTTP status codes
4. Include middleware for Express.js
5. Add monitoring and metrics collection`,
      expectedElements: ['rate', 'limit', 'window', 'middleware', 'express', 'status', 'user', 'monitoring'],
      specialty: 'web_development'
    }
  }
];

// ============================================================================
// QUICK EVALUATION ENGINE
// ============================================================================

class QuickQwenChatGPTEngine {
  constructor() {
    this.results = {};
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

  async initializeBackends() {
    const backends = {};
    
    // ChatGPT (OpenAI GPT-4o-mini for speed)
    const openaiKey = this.getApiKeyFromKeychain('openai-api-key', 'openai');
    if (openaiKey) {
      const { OpenAIBackend } = require('./dist/backends/openai.js');
      backends.chatgpt = new OpenAIBackend({
        enabled: true,
        priority: 1,
        cost_per_token: 0.0001,
        api_key: openaiKey,
        model: 'gpt-4o-mini'
      });
    }

    // Qwen (Self-hosted Coding LLM)
    const qwenKey = this.getApiKeyFromKeychain('codellm-api-key', 'codellm');  
    if (qwenKey) {
      const { QwenBackend } = require('./dist/backends/qwen.js');
      backends.qwen = new QwenBackend({
        enabled: true,
        priority: 1,
        cost_per_token: 0.0001,
        api_key: qwenKey,
        base_url: 'https://tools.flexcon-ai.de',
        model: 'Qwen/Qwen2.5-Coder-7B-Instruct-AWQ'
      });
    }

    return backends;
  }

  // Simplified but focused coding evaluation
  evaluateQuickCoding(response, test) {
    const scores = {};
    const content = response.toLowerCase();
    
    // Core Implementation (50%)
    const expectedFound = test.expectedElements.filter(element => 
      content.includes(element.toLowerCase())
    ).length;
    const implementationScore = (expectedFound / test.expectedElements.length) * 100;
    
    // Code Structure (25%)
    const hasFunction = /def |function |class /.test(content);
    const hasComments = /\/\/|\/\*|\#|'''|"""/.test(response);
    const hasErrorHandling = /try|catch|except|error|throw/.test(content);
    const structureScore = ((hasFunction ? 1 : 0) * 50 + 
                           (hasComments ? 1 : 0) * 30 + 
                           (hasErrorHandling ? 1 : 0) * 20);

    // Best Practices (15%)
    const hasTests = /test|assert|expect|describe/.test(content);
    const hasDocumentation = /\/\*\*|'''|"""|@param|@return/.test(response);
    const practicesScore = ((hasTests ? 1 : 0) * 60 + (hasDocumentation ? 1 : 0) * 40);

    // Technical Quality (10%)
    const hasComplexity = /O\(|time complexity|space complexity/i.test(response);
    const hasOptimization = /optimize|efficient|performance/.test(content);
    const qualityScore = ((hasComplexity ? 1 : 0) * 60 + (hasOptimization ? 1 : 0) * 40);

    scores.implementation = implementationScore;
    scores.structure = structureScore;
    scores.practices = practicesScore;
    scores.quality = qualityScore;

    return scores;
  }

  calculateQuickCodingScore(scores) {
    return (scores.implementation * 0.50 + 
            scores.structure * 0.25 + 
            scores.practices * 0.15 + 
            scores.quality * 0.10);
  }

  getQuickCodingRating(score) {
    if (score >= 90) return 'Expert';
    if (score >= 80) return 'Advanced';
    if (score >= 70) return 'Proficient';
    if (score >= 60) return 'Competent';
    if (score >= 50) return 'Beginner';
    return 'Learning';
  }

  async testModelQuick(modelName, backend) {
    const modelResults = {
      name: modelName,
      tests: [],
      overallScore: 0,
      totalCost: 0,
      totalLatency: 0,
      totalTests: 0,
      passedTests: 0,
      specialties: {}
    };

    console.log(`\n🤖 Quick Testing ${modelName.toUpperCase()}...`);

    for (const scenario of QUICK_CODING_TESTS) {
      console.log(`  📁 ${scenario.category}: ${scenario.test.name}...`);
      
      try {
        const startTime = Date.now();
        const response = await backend.send({
          prompt: scenario.test.prompt,
          files: [],
          options: { 
            max_tokens: 800,
            temperature: 0.1
          }
        });
        const endTime = Date.now();

        const quickScores = this.evaluateQuickCoding(response.content, scenario.test);
        const compositeScore = this.calculateQuickCodingScore(quickScores);
        const codingRating = this.getQuickCodingRating(compositeScore);

        const testResult = {
          category: scenario.category,
          name: scenario.test.name,
          difficulty: scenario.test.difficulty,
          specialty: scenario.test.specialty,
          weight: scenario.weight,
          quickScores,
          compositeScore,
          codingRating,
          cost: response.cost_eur,
          latency: response.latency_ms,
          tokens: {
            input: response.tokens_input,
            output: response.tokens_output,
            total: response.tokens_input + response.tokens_output
          },
          responsePreview: response.content.substring(0, 150) + '...',
          passed: compositeScore >= 65
        };

        modelResults.tests.push(testResult);
        modelResults.totalCost += response.cost_eur;
        modelResults.totalLatency += response.latency_ms;
        modelResults.totalTests += 1;
        
        // Track specialty scores
        if (!modelResults.specialties[scenario.test.specialty]) {
          modelResults.specialties[scenario.test.specialty] = [];
        }
        modelResults.specialties[scenario.test.specialty].push(compositeScore);
        
        if (testResult.passed) {
          modelResults.passedTests += 1;
        }

        console.log(`    ✅ Score: ${compositeScore.toFixed(1)} (${codingRating})`);
        console.log(`    📊 Implementation: ${quickScores.implementation.toFixed(1)}, Structure: ${quickScores.structure.toFixed(1)}`);
        console.log(`    💰 Cost: €${response.cost_eur.toFixed(6)}, ⏱️ Latency: ${response.latency_ms}ms`);

      } catch (error) {
        console.log(`    ❌ Failed: ${error.message}`);
        modelResults.tests.push({
          category: scenario.category,
          name: scenario.test.name,
          error: error.message,
          compositeScore: 0,
          cost: 0,
          latency: 0,
          passed: false
        });
        modelResults.totalTests += 1;
      }
    }

    // Calculate overall weighted score
    let totalWeight = 0;
    let weightedScore = 0;
    
    modelResults.tests.forEach(test => {
      if (!test.error) {
        weightedScore += test.compositeScore * test.weight;
        totalWeight += test.weight;
      }
    });
    
    modelResults.overallScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
    modelResults.successRate = (modelResults.passedTests / modelResults.totalTests) * 100;
    modelResults.avgLatency = modelResults.totalLatency / modelResults.totalTests;

    // Calculate specialty averages
    Object.keys(modelResults.specialties).forEach(specialty => {
      const scores = modelResults.specialties[specialty];
      modelResults.specialties[specialty] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    });

    return modelResults;
  }

  generateQuickComparison(results) {
    const comparison = {
      winner: null,
      advantages: {},
      summary: {}
    };

    const qwen = results.qwen;
    const chatgpt = results.chatgpt;

    if (!qwen || !chatgpt) return comparison;

    // Overall winner
    comparison.winner = qwen.overallScore > chatgpt.overallScore ? 
      { model: 'Qwen', margin: qwen.overallScore - chatgpt.overallScore } :
      { model: 'ChatGPT', margin: chatgpt.overallScore - qwen.overallScore };

    // Analyze advantages
    comparison.advantages.qwen = [];
    comparison.advantages.chatgpt = [];

    // Cost comparison
    if (qwen.totalCost < chatgpt.totalCost) {
      const savings = ((chatgpt.totalCost - qwen.totalCost) / chatgpt.totalCost * 100).toFixed(1);
      comparison.advantages.qwen.push(`${savings}% more cost-effective`);
    } else {
      const savings = ((qwen.totalCost - chatgpt.totalCost) / qwen.totalCost * 100).toFixed(1);
      comparison.advantages.chatgpt.push(`${savings}% more cost-effective`);
    }

    // Speed comparison
    if (qwen.avgLatency < chatgpt.avgLatency) {
      const speedup = ((chatgpt.avgLatency - qwen.avgLatency) / chatgpt.avgLatency * 100).toFixed(1);
      comparison.advantages.qwen.push(`${speedup}% faster response time`);
    } else {
      const speedup = ((qwen.avgLatency - chatgpt.avgLatency) / qwen.avgLatency * 100).toFixed(1);
      comparison.advantages.chatgpt.push(`${speedup}% faster response time`);
    }

    // Success rate comparison
    if (qwen.successRate > chatgpt.successRate) {
      comparison.advantages.qwen.push(`Higher success rate (${qwen.successRate.toFixed(1)}% vs ${chatgpt.successRate.toFixed(1)}%)`);
    } else if (chatgpt.successRate > qwen.successRate) {
      comparison.advantages.chatgpt.push(`Higher success rate (${chatgpt.successRate.toFixed(1)}% vs ${qwen.successRate.toFixed(1)}%)`);
    }

    // Specialty comparisons
    Object.keys(qwen.specialties).forEach(specialty => {
      const qwenScore = qwen.specialties[specialty];
      const chatgptScore = chatgpt.specialties[specialty] || 0;
      
      if (qwenScore > chatgptScore + 5) {
        comparison.advantages.qwen.push(`Better at ${specialty.replace('_', ' ')} (${qwenScore.toFixed(1)} vs ${chatgptScore.toFixed(1)})`);
      } else if (chatgptScore > qwenScore + 5) {
        comparison.advantages.chatgpt.push(`Better at ${specialty.replace('_', ' ')} (${chatgptScore.toFixed(1)} vs ${qwenScore.toFixed(1)})`);
      }
    });

    // Summary metrics
    comparison.summary = {
      qwen: {
        score: qwen.overallScore,
        cost: qwen.totalCost,
        latency: qwen.avgLatency,
        successRate: qwen.successRate
      },
      chatgpt: {
        score: chatgpt.overallScore,
        cost: chatgpt.totalCost,
        latency: chatgpt.avgLatency,
        successRate: chatgpt.successRate
      }
    };

    return comparison;
  }

  async runQuickComparison() {
    console.log('🚀 Quick Qwen vs ChatGPT Coding Comparison');
    console.log('='.repeat(55));
    console.log('⚡ Fast evaluation: Self-hosted Qwen vs ChatGPT');
    console.log('💻 Focus: Core coding capabilities assessment');
    console.log('');

    try {
      const backends = await this.initializeBackends();
      const results = {};

      // Test each backend
      for (const [backendName, backend] of Object.entries(backends)) {
        results[backendName] = await this.testModelQuick(backendName, backend);
      }

      // Generate comparison
      const comparison = this.generateQuickComparison(results);
      
      // Display results
      this.displayQuickResults(results, comparison);
      
      // Save report
      const reportPath = path.join(__dirname, `quick-qwen-chatgpt-${Date.now()}.json`);
      const report = {
        metadata: {
          timestamp: new Date().toISOString(),
          framework: 'Quick Qwen vs ChatGPT Coding Comparison',
          testDuration: Date.now() - this.startTime
        },
        results,
        comparison,
        testScenarios: QUICK_CODING_TESTS
      };
      
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n💾 Report saved: ${reportPath}`);
      
      return report;

    } catch (error) {
      console.error('💥 Quick comparison failed:', error.message);
      throw error;
    }
  }

  displayQuickResults(results, comparison) {
    console.log('\n' + '='.repeat(55));
    console.log('🏆 QUICK CODING COMPARISON RESULTS');
    console.log('='.repeat(55));

    const { qwen, chatgpt } = results;

    console.log('\n📊 OVERALL PERFORMANCE:');
    console.log(`🤖 Qwen (Self-hosted):  ${qwen.overallScore.toFixed(1)} (${this.getQuickCodingRating(qwen.overallScore)})`);
    console.log(`💬 ChatGPT-4o-mini:     ${chatgpt.overallScore.toFixed(1)} (${this.getQuickCodingRating(chatgpt.overallScore)})`);
    console.log(`🏆 Winner: ${comparison.winner.model} by ${comparison.winner.margin.toFixed(1)} points`);

    console.log('\n⚡ PERFORMANCE METRICS:');
    console.log(`💰 Cost - Qwen: €${qwen.totalCost.toFixed(6)}, ChatGPT: €${chatgpt.totalCost.toFixed(6)}`);
    console.log(`⏱️ Speed - Qwen: ${qwen.avgLatency}ms, ChatGPT: ${chatgpt.avgLatency}ms`);
    console.log(`✅ Success - Qwen: ${qwen.successRate.toFixed(1)}%, ChatGPT: ${chatgpt.successRate.toFixed(1)}%`);

    console.log('\n📋 DETAILED TEST RESULTS:');
    qwen.tests.forEach((qwenTest, index) => {
      const chatgptTest = chatgpt.tests[index];
      if (qwenTest && chatgptTest && !qwenTest.error && !chatgptTest.error) {
        const winner = qwenTest.compositeScore > chatgptTest.compositeScore ? '🤖' : '💬';
        console.log(`${qwenTest.category}:`);
        console.log(`  Qwen: ${qwenTest.compositeScore.toFixed(1)} vs ChatGPT: ${chatgptTest.compositeScore.toFixed(1)} ${winner}`);
      }
    });

    console.log('\n🎯 SPECIALIZATION SCORES:');
    Object.keys(qwen.specialties).forEach(specialty => {
      const qwenScore = qwen.specialties[specialty];
      const chatgptScore = chatgpt.specialties[specialty] || 0;
      const winner = qwenScore > chatgptScore ? '🤖 Qwen' : '💬 ChatGPT';
      console.log(`${specialty.replace('_', ' ').padEnd(18)}: ${qwenScore.toFixed(1)} vs ${chatgptScore.toFixed(1)} → ${winner}`);
    });

    if (comparison.advantages.qwen.length > 0) {
      console.log('\n🚀 QWEN ADVANTAGES:');
      comparison.advantages.qwen.forEach(advantage => {
        console.log(`  • ${advantage}`);
      });
    }

    if (comparison.advantages.chatgpt.length > 0) {
      console.log('\n⭐ CHATGPT ADVANTAGES:');
      comparison.advantages.chatgpt.forEach(advantage => {
        console.log(`  • ${advantage}`);
      });
    }

    console.log('\n💡 QUICK RECOMMENDATIONS:');
    if (comparison.winner.model === 'Qwen') {
      console.log('  1. Qwen excels as a self-hosted coding specialist');
      console.log('  2. Ideal for cost-sensitive development environments');
      console.log('  3. Best for specialized coding tasks and algorithms');
    } else {
      console.log('  1. ChatGPT provides more well-rounded coding assistance');
      console.log('  2. Better for general-purpose development tasks');
      console.log('  3. More consistent across different coding domains');
    }

    console.log('\n' + '='.repeat(55));
  }
}

// Execute the quick comparison
async function main() {
  const engine = new QuickQwenChatGPTEngine();
  
  try {
    await engine.runQuickComparison();
    process.exit(0);
  } catch (error) {
    console.error('Quick comparison failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { QuickQwenChatGPTEngine, QUICK_CODING_TESTS };