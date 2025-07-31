#!/usr/bin/env node

// Extensive Coding Test Suite - Qwen vs ChatGPT vs Claude Comparison
// Specialized evaluation for self-hosted coding LLM capabilities

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================================================
// ADVANCED CODING TEST SCENARIOS
// ============================================================================

const CODING_TEST_SCENARIOS = [
  {
    category: 'Algorithm Implementation',
    weight: 0.25,
    description: 'Complex algorithmic challenges requiring optimization',
    tests: [
      {
        name: 'Dynamic Programming - LCS',
        difficulty: 'Hard',
        prompt: `Implement the Longest Common Subsequence (LCS) algorithm in Python with the following requirements:
1. Use dynamic programming with memoization
2. Include time and space complexity analysis in comments
3. Handle edge cases (empty strings, single characters)
4. Provide example usage and test cases
5. Optimize for both time and space efficiency`,
        expectedElements: ['def', 'lcs', 'memo', 'dp', 'len', 'max', 'recursive', 'O(n*m)', 'test'],
        qualityCriteria: {
          correctness: 'Algorithm produces correct LCS',
          optimization: 'Uses memoization effectively', 
          documentation: 'Clear complexity analysis',
          testing: 'Includes comprehensive test cases'
        }
      },
      {
        name: 'Graph Algorithms - Dijkstra',
        difficulty: 'Hard',
        prompt: `Implement Dijkstra's shortest path algorithm in JavaScript with these specifications:
1. Use a priority queue (binary heap) for efficiency
2. Support both adjacency list and adjacency matrix representations
3. Return both the shortest distances and the actual paths
4. Include visualization output for debugging
5. Handle negative weights gracefully (detect and warn)`,
        expectedElements: ['dijkstra', 'heap', 'priority', 'graph', 'distance', 'path', 'infinity', 'visited'],
        qualityCriteria: {
          correctness: 'Correct shortest path calculation',
          efficiency: 'Proper priority queue implementation',
          robustness: 'Handles edge cases and invalid inputs',
          usability: 'Clear API and visualization'
        }
      },
      {
        name: 'Tree Traversal - Serialization',
        difficulty: 'Medium-Hard',
        prompt: `Create a binary tree serialization/deserialization system in Java:
1. Support both preorder and level-order serialization
2. Handle null nodes correctly in serialization
3. Implement both recursive and iterative approaches
4. Include validation to ensure deserialized tree matches original
5. Optimize for space efficiency in serialization format`,
        expectedElements: ['serialize', 'deserialize', 'TreeNode', 'Queue', 'preorder', 'level', 'null', 'validation'],
        qualityCriteria: {
          correctness: 'Perfect serialization/deserialization',
          completeness: 'Both traversal methods implemented',
          validation: 'Includes integrity checking',
          efficiency: 'Space-optimized format'
        }
      }
    ]
  },
  {
    category: 'System Design & Architecture',
    weight: 0.20,
    description: 'Large-scale system design and architectural patterns',
    tests: [
      {
        name: 'Distributed Cache System',
        difficulty: 'Hard',
        prompt: `Design and implement a distributed cache system in Go with these features:
1. Consistent hashing for node distribution
2. Replication factor of 3 for fault tolerance
3. Read/write operations with quorum consensus
4. Automatic node discovery and failure detection
5. LRU eviction policy with TTL support
6. Metrics collection and health monitoring

Provide the core interfaces, data structures, and key algorithms.`,
        expectedElements: ['consistent', 'hash', 'replica', 'quorum', 'LRU', 'TTL', 'node', 'discovery', 'health'],
        qualityCriteria: {
          architecture: 'Well-designed distributed system',
          scalability: 'Handles node addition/removal',
          reliability: 'Fault tolerance mechanisms',
          monitoring: 'Comprehensive observability'
        }
      },
      {
        name: 'Event-Driven Microservices',
        difficulty: 'Hard',
        prompt: `Design a event-driven microservices architecture for an e-commerce platform using TypeScript:
1. Event sourcing with CQRS pattern
2. Saga pattern for distributed transactions
3. Circuit breaker for service resilience
4. Event bus with guaranteed delivery
5. Service discovery and load balancing
6. Observability with distributed tracing

Include interfaces, event schemas, and service interaction patterns.`,
        expectedElements: ['event', 'sourcing', 'CQRS', 'saga', 'circuit', 'breaker', 'bus', 'discovery', 'tracing'],
        qualityCriteria: {
          patterns: 'Proper architectural patterns',
          resilience: 'Fault tolerance design',
          observability: 'Monitoring and tracing',
          scalability: 'Handles high throughput'
        }
      }
    ]
  },
  {
    category: 'Advanced Data Structures',
    weight: 0.20,
    description: 'Complex data structure implementation and optimization',
    tests: [
      {
        name: 'B+ Tree Implementation',
        difficulty: 'Very Hard',
        prompt: `Implement a B+ Tree in C++ with the following requirements:
1. Support for generic key-value pairs with custom comparators
2. Efficient range queries and bulk operations
3. Thread-safe operations with read-write locks
4. Persistence support with crash recovery
5. Memory pool allocation for nodes
6. Comprehensive unit tests with edge cases

Focus on production-ready code with proper error handling.`,
        expectedElements: ['BPlusTree', 'template', 'comparator', 'range', 'lock', 'persistence', 'memory', 'pool'],
        qualityCriteria: {
          correctness: 'All B+ tree operations work correctly',
          performance: 'Optimized for large datasets',
          safety: 'Thread-safe implementation',
          robustness: 'Production-ready error handling'
        }
      },
      {
        name: 'Lock-Free Queue',
        difficulty: 'Very Hard',
        prompt: `Create a lock-free concurrent queue in Rust using atomic operations:
1. Multiple producer, multiple consumer (MPMC) support
2. Memory ordering guarantees for correctness
3. ABA problem prevention
4. Bounded and unbounded variants
5. Efficient memory reclamation (hazard pointers or epochs)
6. Benchmarking against standard library implementations

Include detailed comments on memory ordering decisions.`,
        expectedElements: ['atomic', 'ordering', 'CAS', 'ABA', 'hazard', 'epoch', 'MPMC', 'memory'],
        qualityCriteria: {
          correctness: 'Lock-free correctness guarantees',
          performance: 'Outperforms locked alternatives',
          safety: 'Memory safety in concurrent context',
          documentation: 'Clear explanation of techniques'
        }
      }
    ]
  },
  {
    category: 'Code Optimization & Performance',
    weight: 0.15,
    description: 'Performance-critical code optimization challenges',
    tests: [
      {
        name: 'Matrix Multiplication Optimization',
        difficulty: 'Hard',
        prompt: `Optimize matrix multiplication for large matrices (1000x1000+) in C:
1. Implement cache-friendly blocked algorithm
2. SIMD vectorization where applicable
3. Multi-threading with optimal thread count
4. Memory alignment and prefetching hints
5. Compare against naive implementation with benchmarks
6. Support for different data types (float, double, int)

Provide both the optimized implementation and performance analysis.`,
        expectedElements: ['block', 'cache', 'SIMD', 'thread', 'alignment', 'prefetch', 'benchmark', 'vectorize'],
        qualityCriteria: {
          performance: 'Significant speedup over naive version',
          techniques: 'Multiple optimization strategies',
          portability: 'Works across different architectures',
          measurement: 'Thorough performance analysis'
        }
      },
      {
        name: 'Database Query Optimizer',
        difficulty: 'Very Hard',
        prompt: `Build a cost-based query optimizer for SQL queries in Python:
1. Parse SQL into abstract syntax tree (AST)
2. Generate multiple execution plans
3. Cost estimation based on table statistics
4. Index selection and join ordering optimization
5. Predicate pushdown and projection pruning
6. Support for common SQL operations (SELECT, JOIN, WHERE, GROUP BY)

Include query plan visualization and cost breakdown.`,
        expectedElements: ['AST', 'parse', 'cost', 'statistics', 'index', 'join', 'pushdown', 'pruning', 'plan'],
        qualityCriteria: {
          correctness: 'Generates valid execution plans',
          optimization: 'Chooses efficient plans',
          completeness: 'Handles common SQL features',
          insight: 'Provides cost analysis and visualization'
        }
      }
    ]
  },
  {
    category: 'Web Development & APIs',
    weight: 0.10,
    description: 'Modern web development and API design challenges',
    tests: [
      {
        name: 'GraphQL Federation Gateway',
        difficulty: 'Hard',
        prompt: `Design and implement a GraphQL federation gateway in Node.js:
1. Schema stitching from multiple microservices
2. Query planning and execution across services
3. Caching layer with intelligent invalidation
4. Rate limiting and authentication middleware
5. Real-time subscriptions support
6. Comprehensive error handling and logging

Include schema definition language (SDL) and resolver patterns.`,
        expectedElements: ['federation', 'schema', 'stitching', 'resolver', 'subscription', 'rate', 'limit', 'auth'],
        qualityCriteria: {
          architecture: 'Well-designed federation system',
          performance: 'Efficient query execution',
          scalability: 'Handles multiple services',
          features: 'Complete GraphQL feature set'
        }
      }
    ]
  },
  {
    category: 'Machine Learning & AI',
    weight: 0.10,
    description: 'ML algorithm implementation and optimization',
    tests: [
      {
        name: 'Neural Network from Scratch',
        difficulty: 'Hard',
        prompt: `Implement a neural network framework in Python without using existing ML libraries:
1. Support for multiple layer types (dense, convolutional, LSTM)
2. Backpropagation with automatic differentiation
3. Various activation functions and optimizers
4. Batch processing and mini-batch gradient descent
5. Model serialization and loading
6. Example training on a real dataset (MNIST or similar)

Focus on educational clarity while maintaining efficiency.`,
        expectedElements: ['neural', 'backprop', 'gradient', 'activation', 'optimizer', 'batch', 'serialize', 'MNIST'],
        qualityCriteria: {
          correctness: 'Proper neural network implementation',
          completeness: 'Multiple layer types supported',
          educational: 'Clear, understandable code',
          practical: 'Works on real datasets'
        }
      }
    ]
  }
];

// ============================================================================
// CODING EVALUATION ENGINE
// ============================================================================

class CodingSpecialistEngine {
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
    
    // OpenAI Backend (ChatGPT)
    const openaiKey = this.getApiKeyFromKeychain('openai-api-key', 'openai');
    if (openaiKey) {
      const { OpenAIBackend } = require('./dist/backends/openai.js');
      backends.chatgpt = new OpenAIBackend({
        enabled: true,
        priority: 1,
        cost_per_token: 0.0001,
        api_key: openaiKey,
        model: 'gpt-4o' // Use GPT-4o for coding tasks
      });
    }

    // Qwen Backend (Self-hosted Coding LLM)
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

    // Claude Backend (placeholder - will be added)
    backends.claude = {
      name: 'claude',
      available: false,
      reason: 'Backend integration pending - will be added for comparison'
    };

    return backends;
  }

  // Advanced coding evaluation metrics
  evaluateCodingResponse(response, test) {
    const scores = {};
    const content = response.toLowerCase();
    
    // Code Structure Score (40%)
    const hasFunction = /def |function |class |impl |struct /.test(content);
    const hasComments = /\/\/|\/\*|\#|'''|"""/.test(response);
    const hasErrorHandling = /try|catch|except|error|throw/.test(content);
    const hasTests = /test|assert|expect|describe|it\(/.test(content);
    
    scores.structure = ((hasFunction ? 1 : 0) * 40 + 
                      (hasComments ? 1 : 0) * 30 + 
                      (hasErrorHandling ? 1 : 0) * 20 + 
                      (hasTests ? 1 : 0) * 10);

    // Algorithm Correctness (30%)
    const elementsFound = test.expectedElements.filter(element => 
      content.includes(element.toLowerCase())
    ).length;
    scores.correctness = (elementsFound / test.expectedElements.length) * 100;

    // Code Quality & Best Practices (20%)
    const hasTypeHints = /: int|: str|: list|: dict|<.*>|\w+\s*:\s*\w+/.test(response);
    const hasDocstrings = /'''|"""|\/\*\*|@param|@return/.test(response);
    const followsNaming = /[a-z_][a-z0-9_]*|[A-Z][a-zA-Z0-9]*/.test(response);
    const properIndentation = response.includes('    ') || response.includes('\t');
    
    scores.quality = ((hasTypeHints ? 1 : 0) * 30 + 
                     (hasDocstrings ? 1 : 0) * 30 + 
                     (followsNaming ? 1 : 0) * 20 + 
                     (properIndentation ? 1 : 0) * 20);

    // Performance Considerations (10%)
    const hasComplexity = /O\(|time complexity|space complexity|big.?o/i.test(response);
    const hasOptimization = /optimize|efficient|performance|cache|memo/.test(content);
    const considersEdgeCases = /edge case|boundary|null|empty|zero/.test(content);
    
    scores.performance = ((hasComplexity ? 1 : 0) * 40 + 
                         (hasOptimization ? 1 : 0) * 35 + 
                         (considersEdgeCases ? 1 : 0) * 25);

    return scores;
  }

  calculateCodingScore(scores) {
    return (scores.structure * 0.4 + 
            scores.correctness * 0.3 + 
            scores.quality * 0.2 + 
            scores.performance * 0.1);
  }

  getCodingRating(score) {
    if (score >= 90) return 'Expert';
    if (score >= 80) return 'Advanced';
    if (score >= 70) return 'Proficient';
    if (score >= 60) return 'Intermediate';
    if (score >= 50) return 'Beginner';
    return 'Needs Improvement';
  }

  async testBackendCoding(backendName, backend, testScenarios) {
    const backendResults = {
      name: backendName,
      available: true,
      categories: {},
      overallScore: 0,
      totalCost: 0,
      totalLatency: 0,
      totalTests: 0,
      passedTests: 0,
      codingSpecialization: {
        structureScore: 0,
        correctnessScore: 0,
        qualityScore: 0,
        performanceScore: 0
      }
    };

    console.log(`\n🚀 Testing ${backendName.toUpperCase()} Coding Specialist...`);

    for (const category of testScenarios) {
      console.log(`\n  📁 ${category.category} (${category.description}):`);
      
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
              max_tokens: 1500, // More tokens for coding responses
              temperature: 0.1  // Lower temperature for more consistent code
            }
          });
          const endTime = Date.now();

          const codingScores = this.evaluateCodingResponse(response.content, test);
          const compositeScore = this.calculateCodingScore(codingScores);
          const codingRating = this.getCodingRating(compositeScore);

          const testResult = {
            name: test.name,
            difficulty: test.difficulty,
            prompt: test.prompt.substring(0, 100) + '...',
            response: response.content.substring(0, 300) + '...',
            codingScores,
            compositeScore,
            codingRating,
            cost: response.cost_eur,
            latency: response.latency_ms,
            tokens: {
              input: response.tokens_input,
              output: response.tokens_output,
              total: response.tokens_input + response.tokens_output
            },
            passed: compositeScore >= 70 // Higher threshold for coding tasks
          };

          categoryResults.tests.push(testResult);
          backendResults.totalCost += response.cost_eur;
          backendResults.totalLatency += response.latency_ms;
          backendResults.totalTests += 1;
          
          // Accumulate coding specialization scores
          backendResults.codingSpecialization.structureScore += codingScores.structure;
          backendResults.codingSpecialization.correctnessScore += codingScores.correctness;
          backendResults.codingSpecialization.qualityScore += codingScores.quality;
          backendResults.codingSpecialization.performanceScore += codingScores.performance;
          
          if (testResult.passed) {
            backendResults.passedTests += 1;
          }

          console.log(`      ✅ Score: ${compositeScore.toFixed(1)} (${codingRating})`);
          console.log(`      📊 Structure: ${codingScores.structure.toFixed(1)}, Correctness: ${codingScores.correctness.toFixed(1)}`);
          console.log(`      💰 Cost: €${response.cost_eur.toFixed(6)}`);
          console.log(`      ⏱️ Latency: ${response.latency_ms}ms`);

        } catch (error) {
          console.log(`      ❌ Test failed: ${error.message}`);
          categoryResults.tests.push({
            name: test.name,
            difficulty: test.difficulty,
            error: error.message,
            compositeScore: 0,
            cost: 0,
            latency: 0,
            passed: false
          });
          backendResults.totalTests += 1;
        }
      }

      // Calculate category averages
      const validTests = categoryResults.tests.filter(t => !t.error);
      if (validTests.length > 0) {
        categoryResults.avgScore = validTests.reduce((sum, t) => sum + t.compositeScore, 0) / validTests.length;
        categoryResults.avgCost = validTests.reduce((sum, t) => sum + t.cost, 0) / validTests.length;
        categoryResults.avgLatency = validTests.reduce((sum, t) => sum + t.latency, 0) / validTests.length;
      }

      backendResults.categories[category.category] = categoryResults;
      console.log(`    📊 Category Average: ${categoryResults.avgScore.toFixed(1)} (${this.getCodingRating(categoryResults.avgScore)})`);
    }

    // Calculate overall weighted score and averages
    let totalWeight = 0;
    let weightedScore = 0;
    
    Object.values(backendResults.categories).forEach(category => {
      weightedScore += category.avgScore * category.weight;
      totalWeight += category.weight;
    });
    
    backendResults.overallScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
    backendResults.successRate = (backendResults.passedTests / backendResults.totalTests) * 100;
    backendResults.avgLatency = backendResults.totalLatency / backendResults.totalTests;

    // Calculate average coding specialization scores
    if (backendResults.totalTests > 0) {
      backendResults.codingSpecialization.structureScore /= backendResults.totalTests;
      backendResults.codingSpecialization.correctnessScore /= backendResults.totalTests;
      backendResults.codingSpecialization.qualityScore /= backendResults.totalTests;
      backendResults.codingSpecialization.performanceScore /= backendResults.totalTests;
    }

    return backendResults;
  }

  generateCodingComparison(results) {
    const comparison = {
      bestCoder: null,
      mostEfficient: null,
      bestStructure: null,
      bestCorrectness: null,
      bestQuality: null,
      bestPerformance: null,
      recommendations: []
    };

    const availableModels = Object.entries(results).filter(([_, r]) => r.available !== false);
    
    if (availableModels.length === 0) return comparison;

    // Find leaders in different categories
    let bestOverall = 0;
    let bestStructureScore = 0;
    let bestCorrectnessScore = 0;
    let bestQualityScore = 0;
    let bestPerformanceScore = 0;
    let lowestCost = Infinity;

    availableModels.forEach(([modelName, result]) => {
      if (result.overallScore > bestOverall) {
        bestOverall = result.overallScore;
        comparison.bestCoder = { model: modelName, score: result.overallScore };
      }
      
      if (result.totalCost < lowestCost) {
        lowestCost = result.totalCost;
        comparison.mostEfficient = { model: modelName, cost: result.totalCost };
      }

      const spec = result.codingSpecialization;
      if (spec.structureScore > bestStructureScore) {
        bestStructureScore = spec.structureScore;
        comparison.bestStructure = { model: modelName, score: spec.structureScore };
      }

      if (spec.correctnessScore > bestCorrectnessScore) {
        bestCorrectnessScore = spec.correctnessScore;
        comparison.bestCorrectness = { model: modelName, score: spec.correctnessScore };
      }

      if (spec.qualityScore > bestQualityScore) {
        bestQualityScore = spec.qualityScore;
        comparison.bestQuality = { model: modelName, score: spec.qualityScore };
      }

      if (spec.performanceScore > bestPerformanceScore) {
        bestPerformanceScore = spec.performanceScore;
        comparison.bestPerformance = { model: modelName, score: spec.performanceScore };
      }
    });

    // Generate coding-specific recommendations
    if (comparison.bestCoder && comparison.bestCoder.score >= 80) {
      comparison.recommendations.push({
        type: 'coding-excellence',
        priority: 'high',
        text: `${comparison.bestCoder.model.toUpperCase()} shows expert-level coding capabilities (${comparison.bestCoder.score.toFixed(1)}) - ideal for complex algorithmic tasks`
      });
    }

    if (comparison.bestStructure) {
      comparison.recommendations.push({
        type: 'code-organization',
        priority: 'medium',
        text: `${comparison.bestStructure.model.toUpperCase()} excels at code structure and organization - best for large codebases and maintainable solutions`
      });
    }

    if (comparison.bestCorrectness) {
      comparison.recommendations.push({
        type: 'algorithm-accuracy',
        priority: 'high',
        text: `${comparison.bestCorrectness.model.toUpperCase()} provides most accurate algorithmic implementations - preferred for mission-critical code`
      });
    }

    return comparison;
  }

  async runCodingSpecialistTest() {
    console.log('🚀 Claudette Coding Specialist Assessment');
    console.log('='.repeat(70));
    console.log('💻 Evaluating: Qwen (Self-hosted) vs ChatGPT vs Claude');
    console.log('🧪 Focus: Advanced coding challenges and algorithm implementation');
    console.log('');

    try {
      const backends = await this.initializeBackends();
      const results = {};

      // Test each available backend
      for (const [backendName, backend] of Object.entries(backends)) {
        if (backend.available === false) {
          results[backendName] = {
            name: backendName,
            available: false,
            reason: backend.reason || 'Not available'
          };
          console.log(`❌ ${backendName}: ${results[backendName].reason}`);
          continue;
        }

        results[backendName] = await this.testBackendCoding(backendName, backend, CODING_TEST_SCENARIOS);
      }

      // Generate coding comparison
      const comparison = this.generateCodingComparison(results);
      
      // Display results
      this.displayCodingResults(results, comparison);
      
      // Save detailed report
      const reportPath = path.join(__dirname, `coding-specialist-report-${Date.now()}.json`);
      const report = {
        metadata: {
          timestamp: new Date().toISOString(),
          framework: 'Claudette Coding Specialist Assessment v1.0',
          testDuration: Date.now() - this.startTime,
          focus: 'Self-hosted Qwen vs ChatGPT vs Claude coding capabilities'
        },
        results,
        comparison,
        scenarios: CODING_TEST_SCENARIOS
      };
      
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n💾 Detailed report saved: ${reportPath}`);
      
      return report;

    } catch (error) {
      console.error('💥 Coding assessment failed:', error.message);
      throw error;
    }
  }

  displayCodingResults(results, comparison) {
    console.log('\n' + '='.repeat(70));
    console.log('💻 CODING SPECIALIST ASSESSMENT RESULTS');
    console.log('='.repeat(70));

    // Available models summary
    const availableModels = Object.entries(results).filter(([_, r]) => r.available !== false);
    
    console.log('\n🏆 CODING EXCELLENCE RANKINGS:');
    availableModels
      .sort(([,a], [,b]) => b.overallScore - a.overallScore)
      .forEach(([model, result], index) => {
        const rank = ['🥇', '🥈', '🥉'][index] || `${index + 1}.`;
        console.log(`${rank} ${model.toUpperCase()}: ${result.overallScore.toFixed(1)} (${this.getCodingRating(result.overallScore)})`);
        console.log(`   📊 Structure: ${result.codingSpecialization.structureScore.toFixed(1)}, Correctness: ${result.codingSpecialization.correctnessScore.toFixed(1)}`);
        console.log(`   🎯 Quality: ${result.codingSpecialization.qualityScore.toFixed(1)}, Performance: ${result.codingSpecialization.performanceScore.toFixed(1)}`);
        console.log(`   💰 Cost: €${result.totalCost.toFixed(6)}, ⏱️ Speed: ${result.avgLatency.toFixed(0)}ms`);
        console.log(`   ✅ Success Rate: ${result.successRate.toFixed(1)}%\n`);
      });

    console.log('🎯 SPECIALIZATION LEADERS:');
    if (comparison.bestStructure) {
      console.log(`📋 Best Structure: ${comparison.bestStructure.model.toUpperCase()} (${comparison.bestStructure.score.toFixed(1)})`);
    }
    if (comparison.bestCorrectness) {
      console.log(`🎯 Best Correctness: ${comparison.bestCorrectness.model.toUpperCase()} (${comparison.bestCorrectness.score.toFixed(1)})`);
    }
    if (comparison.bestQuality) {
      console.log(`⭐ Best Quality: ${comparison.bestQuality.model.toUpperCase()} (${comparison.bestQuality.score.toFixed(1)})`);
    }
    if (comparison.bestPerformance) {
      console.log(`⚡ Best Performance: ${comparison.bestPerformance.model.toUpperCase()} (${comparison.bestPerformance.score.toFixed(1)})`);
    }

    console.log('\n💡 CODING RECOMMENDATIONS:');
    comparison.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.text}`);
    });

    console.log('\n' + '='.repeat(70));
  }
}

// ============================================================================
// EXECUTION
// ============================================================================

async function main() {
  const codingEngine = new CodingSpecialistEngine();
  
  try {
    await codingEngine.runCodingSpecialistTest();
    process.exit(0);
  } catch (error) {
    console.error('Coding assessment failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { CodingSpecialistEngine, CODING_TEST_SCENARIOS };