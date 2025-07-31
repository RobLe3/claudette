#!/usr/bin/env node

// Focused Qwen vs ChatGPT Coding Comparison
// Specialized test for self-hosted coding LLM evaluation

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================================================
// FOCUSED CODING TEST SCENARIOS
// ============================================================================

const FOCUSED_CODING_TESTS = [
  {
    category: 'Algorithm Implementation',
    weight: 0.35,
    tests: [
      {
        name: 'Binary Search Tree with Balancing',
        difficulty: 'Hard',
        prompt: `Implement a self-balancing binary search tree (AVL Tree) in Python with the following requirements:
1. Insert, delete, and search operations
2. Automatic rebalancing with rotations
3. Height calculation and balance factor tracking
4. In-order traversal for sorted output
5. Include comprehensive test cases

Focus on correct implementation with clear comments explaining the balancing logic.`,
        expectedElements: ['avl', 'balance', 'rotation', 'height', 'insert', 'delete', 'search', 'traversal'],
        specialty: 'data_structures'
      },
      {
        name: 'Dynamic Programming - Edit Distance',
        difficulty: 'Medium-Hard',
        prompt: `Implement the edit distance (Levenshtein distance) algorithm using dynamic programming:
1. Calculate minimum operations to transform one string to another
2. Support insert, delete, and replace operations
3. Include the actual sequence of operations, not just the count
4. Optimize for both time and space complexity
5. Handle edge cases (empty strings, identical strings)

Provide both recursive and iterative solutions with memoization.`,
        expectedElements: ['edit', 'distance', 'levenshtein', 'dp', 'operations', 'insert', 'delete', 'replace'],
        specialty: 'algorithms'
      }
    ]
  },
  {
    category: 'Code Optimization & Performance',
    weight: 0.30,
    tests: [
      {
        name: 'Parallel Matrix Processing',
        difficulty: 'Hard',
        prompt: `Create an optimized matrix multiplication implementation in C++ that:
1. Uses multiple threads for parallel processing
2. Implements cache-friendly block matrix multiplication
3. Supports different data types (int, float, double)
4. Includes performance benchmarking against naive implementation
5. Handles matrices of different sizes efficiently

Focus on modern C++ practices and parallel computing techniques.`,
        expectedElements: ['thread', 'parallel', 'block', 'cache', 'benchmark', 'template', 'mutex'],
        specialty: 'performance'
      }
    ]
  },
  {
    category: 'Modern Web Development',
    weight: 0.20,
    tests: [
      {
        name: 'RESTful API with Authentication',
        difficulty: 'Medium',
        prompt: `Build a secure RESTful API in Node.js/Express with:
1. JWT-based authentication and authorization
2. Rate limiting and request validation
3. Database integration (MongoDB/PostgreSQL)
4. Comprehensive error handling and logging
5. OpenAPI/Swagger documentation
6. Unit and integration tests

Include middleware for security, validation, and monitoring.`,
        expectedElements: ['express', 'jwt', 'auth', 'rate', 'limit', 'validation', 'middleware', 'swagger'],
        specialty: 'web_development'
      }
    ]
  },
  {
    category: 'System Design Implementation',
    weight: 0.15,
    tests: [
      {
        name: 'Microservices Communication Pattern',
        difficulty: 'Hard',
        prompt: `Design and implement a microservices communication system with:
1. Service discovery and registration
2. Circuit breaker pattern for fault tolerance
3. Message queue for asynchronous communication
4. Health checks and monitoring endpoints
5. Configuration management and secrets handling

Use Docker containers and include deployment configurations.`,
        expectedElements: ['service', 'discovery', 'circuit', 'breaker', 'queue', 'health', 'docker', 'monitoring'],
        specialty: 'system_design'
      }
    ]
  }
];

// ============================================================================
// FOCUSED EVALUATION ENGINE
// ============================================================================

class QwenVsChatGPTEngine {
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
    
    // ChatGPT (OpenAI GPT-4o)
    const openaiKey = this.getApiKeyFromKeychain('openai-api-key', 'openai');
    if (openaiKey) {
      const { OpenAIBackend } = require('./dist/backends/openai.js');
      backends.chatgpt = new OpenAIBackend({
        enabled: true,
        priority: 1,
        cost_per_token: 0.0001,
        api_key: openaiKey,
        model: 'gpt-4o'
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

  // Enhanced coding evaluation for self-hosted LLM comparison
  evaluateAdvancedCoding(response, test) {
    const scores = {};
    const content = response.toLowerCase();
    
    // Code Completeness (35%) - More detailed for complex tasks
    const hasMainLogic = test.expectedElements.filter(elem => content.includes(elem.toLowerCase())).length;
    const completenessRatio = hasMainLogic / test.expectedElements.length;
    const hasProperStructure = /class |def |function |impl /.test(content);
    const hasErrorHandling = /try|catch|except|error|throw|assert/.test(content);
    const hasDocumentation = /\/\/|\/\*|\#|'''|"""|@param|@return/.test(response);
    
    scores.completeness = (completenessRatio * 60 + 
                          (hasProperStructure ? 1 : 0) * 20 + 
                          (hasErrorHandling ? 1 : 0) * 10 + 
                          (hasDocumentation ? 1 : 0) * 10) * 100;

    // Technical Accuracy (30%) - Algorithm correctness
    const algorithmKeywords = ['algorithm', 'complexity', 'optimization', 'efficient'];
    const hasAlgorithmicThinking = algorithmKeywords.some(kw => content.includes(kw));
    const hasComplexityAnalysis = /o\(|time complexity|space complexity|big.?o/i.test(response);
    const implementsRequiredFeatures = completenessRatio;
    
    scores.accuracy = ((implementsRequiredFeatures * 60) + 
                      (hasAlgorithmicThinking ? 1 : 0) * 25 + 
                      (hasComplexityAnalysis ? 1 : 0) * 15) * 100;

    // Code Quality & Best Practices (25%)
    const hasTypeAnnotations = /: int|: str|: list|: dict|<.*>|\w+\s*:\s*\w+/.test(response);
    const followsNaming = /[a-z_][a-z0-9_]*|[A-Z][a-zA-Z0-9]*/.test(response);
    const hasModularDesign = /class |module |import |from /.test(content);
    const hasTestCases = /test|assert|expect|describe|it\(|unittest/.test(content);
    
    scores.quality = ((hasTypeAnnotations ? 1 : 0) * 25 + 
                     (followsNaming ? 1 : 0) * 25 + 
                     (hasModularDesign ? 1 : 0) * 25 + 
                     (hasTestCases ? 1 : 0) * 25) * 100;

    // Innovation & Advanced Features (10%)
    const usesAdvancedFeatures = /async|await|decorator|generator|lambda|comprehension/.test(content);
    const showsOptimizationThinking = /cache|memo|optimize|performance|efficient/.test(content);
    const includesSecurityConsiderations = /security|validation|sanitize|auth/.test(content);
    
    scores.innovation = ((usesAdvancedFeatures ? 1 : 0) * 40 + 
                        (showsOptimizationThinking ? 1 : 0) * 35 + 
                        (includesSecurityConsiderations ? 1 : 0) * 25) * 100;

    return scores;
  }

  calculateAdvancedCodingScore(scores) {
    return (scores.completeness * 0.35 + 
            scores.accuracy * 0.30 + 
            scores.quality * 0.25 + 
            scores.innovation * 0.10);
  }

  getAdvancedCodingRating(score) {
    if (score >= 95) return 'Elite Coder';
    if (score >= 85) return 'Expert';
    if (score >= 75) return 'Advanced';
    if (score >= 65) return 'Proficient';
    if (score >= 55) return 'Intermediate';
    return 'Developing';
  }

  async testModelOnCoding(modelName, backend) {
    const modelResults = {
      name: modelName,
      categories: {},
      overallScore: 0,
      totalCost: 0,
      totalLatency: 0,
      totalTests: 0,
      passedTests: 0,
      specializations: {
        data_structures: 0,
        algorithms: 0,
        performance: 0,
        web_development: 0,
        system_design: 0
      }
    };

    console.log(`\n🤖 Testing ${modelName.toUpperCase()} on Advanced Coding Tasks...`);

    for (const category of FOCUSED_CODING_TESTS) {
      console.log(`\n  📁 ${category.category}:`);
      
      const categoryResults = {
        name: category.category,
        weight: category.weight,
        tests: [],
        avgScore: 0,
        avgCost: 0,
        avgLatency: 0
      };

      for (const test of category.tests) {
        console.log(`    🧪 ${test.name} [${test.difficulty}]...`);
        
        try {
          const startTime = Date.now();
          const response = await backend.send({
            prompt: test.prompt,
            files: [],
            options: { 
              max_tokens: 2000,
              temperature: 0.1
            }
          });
          const endTime = Date.now();

          const advancedScores = this.evaluateAdvancedCoding(response.content, test);
          const compositeScore = this.calculateAdvancedCodingScore(advancedScores);
          const codingRating = this.getAdvancedCodingRating(compositeScore);

          const testResult = {
            name: test.name,
            difficulty: test.difficulty,
            specialty: test.specialty,
            advancedScores,
            compositeScore,
            codingRating,
            cost: response.cost_eur,
            latency: response.latency_ms,
            tokens: {
              input: response.tokens_input,
              output: response.tokens_output,
              total: response.tokens_input + response.tokens_output
            },
            responsePreview: response.content.substring(0, 200) + '...',
            passed: compositeScore >= 70
          };

          categoryResults.tests.push(testResult);
          modelResults.totalCost += response.cost_eur;
          modelResults.totalLatency += response.latency_ms;
          modelResults.totalTests += 1;
          
          // Track specialization scores
          if (modelResults.specializations[test.specialty] !== undefined) {
            modelResults.specializations[test.specialty] += compositeScore;
          }
          
          if (testResult.passed) {
            modelResults.passedTests += 1;
          }

          console.log(`      ✅ Score: ${compositeScore.toFixed(1)} (${codingRating})`);
          console.log(`      📊 Completeness: ${advancedScores.completeness.toFixed(1)}, Accuracy: ${advancedScores.accuracy.toFixed(1)}`);
          console.log(`      💰 Cost: €${response.cost_eur.toFixed(6)}, ⏱️ Latency: ${response.latency_ms}ms`);

        } catch (error) {
          console.log(`      ❌ Failed: ${error.message}`);
          categoryResults.tests.push({
            name: test.name,
            difficulty: test.difficulty,
            error: error.message,
            compositeScore: 0,
            cost: 0,
            latency: 0,
            passed: false
          });
          modelResults.totalTests += 1;
        }
      }

      // Calculate category averages
      const validTests = categoryResults.tests.filter(t => !t.error);
      if (validTests.length > 0) {
        categoryResults.avgScore = validTests.reduce((sum, t) => sum + t.compositeScore, 0) / validTests.length;
        categoryResults.avgCost = validTests.reduce((sum, t) => sum + t.cost, 0) / validTests.length;
        categoryResults.avgLatency = validTests.reduce((sum, t) => sum + t.latency, 0) / validTests.length;
      }

      modelResults.categories[category.category] = categoryResults;
      console.log(`    📊 Category Average: ${categoryResults.avgScore.toFixed(1)}`);
    }

    // Calculate overall scores
    let totalWeight = 0;
    let weightedScore = 0;
    
    Object.values(modelResults.categories).forEach(category => {
      weightedScore += category.avgScore * category.weight;
      totalWeight += category.weight;
    });
    
    modelResults.overallScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
    modelResults.successRate = (modelResults.passedTests / modelResults.totalTests) * 100;
    modelResults.avgLatency = modelResults.totalLatency / modelResults.totalTests;

    // Calculate specialization averages
    Object.keys(modelResults.specializations).forEach(spec => {
      const specTests = [];
      Object.values(modelResults.categories).forEach(cat => {
        cat.tests.forEach(test => {
          if (test.specialty === spec && !test.error) {
            specTests.push(test.compositeScore);
          }
        });
      });
      modelResults.specializations[spec] = specTests.length > 0 ? 
        specTests.reduce((sum, score) => sum + score, 0) / specTests.length : 0;
    });

    return modelResults;
  }

  generateQwenChatGPTComparison(results) {
    const comparison = {
      winner: null,
      strengths: {},
      differences: {},
      recommendations: []
    };

    const models = Object.keys(results);
    if (models.length < 2) return comparison;

    const qwen = results.qwen;
    const chatgpt = results.chatgpt;

    if (!qwen || !chatgpt) return comparison;

    // Overall winner
    if (qwen.overallScore > chatgpt.overallScore) {
      comparison.winner = { model: 'qwen', advantage: qwen.overallScore - chatgpt.overallScore };
    } else {
      comparison.winner = { model: 'chatgpt', advantage: chatgpt.overallScore - qwen.overallScore };
    }

    // Analyze strengths
    comparison.strengths.qwen = [];
    comparison.strengths.chatgpt = [];

    // Category comparisons
    Object.keys(qwen.categories).forEach(category => {
      const qwenScore = qwen.categories[category].avgScore;
      const chatgptScore = chatgpt.categories[category]?.avgScore || 0;
      
      if (qwenScore > chatgptScore + 5) {
        comparison.strengths.qwen.push(`${category}: ${qwenScore.toFixed(1)} vs ${chatgptScore.toFixed(1)}`);
      } else if (chatgptScore > qwenScore + 5) {
        comparison.strengths.chatgpt.push(`${category}: ${chatgptScore.toFixed(1)} vs ${qwenScore.toFixed(1)}`);
      }
    });

    // Specialization comparisons
    Object.keys(qwen.specializations).forEach(spec => {
      const qwenSpec = qwen.specializations[spec];
      const chatgptSpec = chatgpt.specializations[spec];
      
      if (qwenSpec > chatgptSpec + 5) {
        comparison.strengths.qwen.push(`${spec.replace('_', ' ')}: ${qwenSpec.toFixed(1)} vs ${chatgptSpec.toFixed(1)}`);
      } else if (chatgptSpec > qwenSpec + 5) {
        comparison.strengths.chatgpt.push(`${spec.replace('_', ' ')}: ${chatgptSpec.toFixed(1)} vs ${qwenSpec.toFixed(1)}`);
      }
    });

    // Key differences
    comparison.differences = {
      cost: {
        qwen: qwen.totalCost,
        chatgpt: chatgpt.totalCost,
        winner: qwen.totalCost < chatgpt.totalCost ? 'qwen' : 'chatgpt'
      },
      speed: {
        qwen: qwen.avgLatency,
        chatgpt: chatgpt.avgLatency,
        winner: qwen.avgLatency < chatgpt.avgLatency ? 'qwen' : 'chatgpt'
      },
      successRate: {
        qwen: qwen.successRate,
        chatgpt: chatgpt.successRate,
        winner: qwen.successRate > chatgpt.successRate ? 'qwen' : 'chatgpt'
      }
    };

    // Generate recommendations
    if (comparison.winner.model === 'qwen') {
      comparison.recommendations.push({
        type: 'primary',
        priority: 'high',
        text: `Qwen (self-hosted) outperforms ChatGPT by ${comparison.winner.advantage.toFixed(1)} points - excellent choice for specialized coding tasks`
      });
    } else {
      comparison.recommendations.push({
        type: 'primary',
        priority: 'high',
        text: `ChatGPT leads by ${comparison.winner.advantage.toFixed(1)} points - better general-purpose coding capabilities`
      });
    }

    // Cost recommendation
    if (comparison.differences.cost.winner === 'qwen') {
      comparison.recommendations.push({
        type: 'cost',
        priority: 'medium',
        text: `Qwen is more cost-effective (€${qwen.totalCost.toFixed(6)} vs €${chatgpt.totalCost.toFixed(6)}) - ideal for budget-conscious development`
      });
    } else {
      comparison.recommendations.push({
        type: 'cost',
        priority: 'medium',
        text: `ChatGPT is more cost-effective despite higher capability - good value for general coding`
      });
    }

    // Speed recommendation
    if (comparison.differences.speed.winner === 'qwen') {
      comparison.recommendations.push({
        type: 'performance',
        priority: 'medium',
        text: `Qwen responds faster (${qwen.avgLatency}ms vs ${chatgpt.avgLatency}ms) - better for interactive development`
      });
    } else {
      comparison.recommendations.push({
        type: 'performance',
        priority: 'medium',
        text: `ChatGPT has faster response times - more suitable for real-time development assistance`
      });
    }

    return comparison;
  }

  async runFocusedComparison() {
    console.log('🚀 Qwen vs ChatGPT Focused Coding Comparison');
    console.log('='.repeat(60));
    console.log('🎯 Self-hosted Qwen-2.5-Coder vs ChatGPT-4o');
    console.log('💻 Advanced coding challenges and specialization analysis');
    console.log('');

    try {
      const backends = await this.initializeBackends();
      const results = {};

      // Test each backend
      for (const [backendName, backend] of Object.entries(backends)) {
        results[backendName] = await this.testModelOnCoding(backendName, backend);
      }

      // Generate comparison
      const comparison = this.generateQwenChatGPTComparison(results);
      
      // Display results
      this.displayFocusedResults(results, comparison);
      
      // Save report
      const reportPath = path.join(__dirname, `qwen-vs-chatgpt-${Date.now()}.json`);
      const report = {
        metadata: {
          timestamp: new Date().toISOString(),
          framework: 'Qwen vs ChatGPT Focused Coding Comparison',
          testDuration: Date.now() - this.startTime
        },
        results,
        comparison,
        testScenarios: FOCUSED_CODING_TESTS
      };
      
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n💾 Detailed report: ${reportPath}`);
      
      return report;

    } catch (error) {
      console.error('💥 Comparison failed:', error.message);
      throw error;
    }
  }

  displayFocusedResults(results, comparison) {
    console.log('\n' + '='.repeat(60));
    console.log('🏆 QWEN vs CHATGPT CODING COMPARISON');
    console.log('='.repeat(60));

    // Head-to-head comparison
    const qwen = results.qwen;
    const chatgpt = results.chatgpt;

    console.log('\n📊 HEAD-TO-HEAD RESULTS:');
    console.log(`🤖 Qwen (Self-hosted):     ${qwen.overallScore.toFixed(1)} (${this.getAdvancedCodingRating(qwen.overallScore)})`);
    console.log(`💬 ChatGPT-4o:             ${chatgpt.overallScore.toFixed(1)} (${this.getAdvancedCodingRating(chatgpt.overallScore)})`);
    console.log(`🏆 Winner: ${comparison.winner.model.toUpperCase()} by ${comparison.winner.advantage.toFixed(1)} points`);

    console.log('\n💰 COST & PERFORMANCE:');
    console.log(`💵 Qwen Cost:              €${qwen.totalCost.toFixed(6)}`);
    console.log(`💵 ChatGPT Cost:           €${chatgpt.totalCost.toFixed(6)}`);
    console.log(`⏱️ Qwen Avg Latency:       ${qwen.avgLatency.toFixed(0)}ms`);
    console.log(`⏱️ ChatGPT Avg Latency:    ${chatgpt.avgLatency.toFixed(0)}ms`);
    console.log(`✅ Qwen Success Rate:      ${qwen.successRate.toFixed(1)}%`);
    console.log(`✅ ChatGPT Success Rate:   ${chatgpt.successRate.toFixed(1)}%`);

    console.log('\n🎯 SPECIALIZATION BREAKDOWN:');
    Object.keys(qwen.specializations).forEach(spec => {
      const qwenScore = qwen.specializations[spec];
      const chatgptScore = chatgpt.specializations[spec];
      const winner = qwenScore > chatgptScore ? '🤖 Qwen' : '💬 ChatGPT';
      console.log(`${spec.replace('_', ' ').padEnd(20)}: Qwen ${qwenScore.toFixed(1)} vs ChatGPT ${chatgptScore.toFixed(1)} → ${winner}`);
    });

    if (comparison.strengths.qwen.length > 0) {
      console.log('\n🚀 QWEN STRENGTHS:');
      comparison.strengths.qwen.forEach(strength => {
        console.log(`  • ${strength}`);
      });
    }

    if (comparison.strengths.chatgpt.length > 0) {
      console.log('\n⭐ CHATGPT STRENGTHS:');
      comparison.strengths.chatgpt.forEach(strength => {
        console.log(`  • ${strength}`);
      });
    }

    console.log('\n💡 RECOMMENDATIONS:');
    comparison.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.text}`);
    });

    console.log('\n' + '='.repeat(60));
  }
}

// Execute the focused comparison
async function main() {
  const engine = new QwenVsChatGPTEngine();
  
  try {
    await engine.runFocusedComparison();
    process.exit(0);
  } catch (error) {
    console.error('Comparison failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { QwenVsChatGPTEngine, FOCUSED_CODING_TESTS };