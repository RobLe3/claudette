#!/usr/bin/env node

// Comprehensive KPI Framework for Model Quality Assessment and Development Savings

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================================================
// KPI FRAMEWORK CONFIGURATION
// ============================================================================

const KPI_CONFIG = {
  // Quality assessment weights
  qualityWeights: {
    accuracy: 0.30,        // Correctness of responses
    relevance: 0.25,       // Task-specific appropriateness
    completeness: 0.20,    // Thoroughness of answers
    efficiency: 0.15,      // Token efficiency
    creativity: 0.10       // Creative problem solving
  },
  
  // Performance thresholds
  performanceThresholds: {
    excellent: 90,
    good: 75,
    acceptable: 60,
    poor: 40
  },
  
  // Cost benchmarks (EUR per 1K tokens)
  costBenchmarks: {
    budget: 0.0001,
    standard: 0.0005,
    premium: 0.002,
    luxury: 0.01
  },
  
  // Development productivity metrics
  productivityMetrics: {
    timeToValue: {        // Time to first useful output
      excellent: 2,       // 2 seconds
      good: 5,
      acceptable: 10,
      poor: 30
    },
    iterationsNeeded: {   // Average iterations to satisfaction
      excellent: 1,
      good: 2,
      acceptable: 3,
      poor: 5
    }
  }
};

// ============================================================================
// STANDARDIZED TEST SCENARIOS
// ============================================================================

const TEST_SCENARIOS = [
  {
    category: 'Code Generation',
    weight: 0.25,
    tests: [
      {
        name: 'Simple Function',
        prompt: 'Write a Python function that calculates the factorial of a number with error handling',
        expectedElements: ['def', 'factorial', 'return', 'if', 'error', 'exception'],
        qualityCriteria: {
          accuracy: 'Function works correctly',
          completeness: 'Includes error handling',
          efficiency: 'Concise implementation'
        }
      },
      {
        name: 'Complex Algorithm',
        prompt: 'Implement a binary search tree with insert, delete, and search operations in JavaScript',
        expectedElements: ['class', 'insert', 'delete', 'search', 'node'],
        qualityCriteria: {
          accuracy: 'All operations work correctly',
          completeness: 'Full BST implementation',
          efficiency: 'Optimal time complexity'
        }
      },
      {
        name: 'API Integration',
        prompt: 'Create a REST API client in TypeScript that handles authentication and error retry logic',
        expectedElements: ['async', 'fetch', 'auth', 'retry', 'error', 'typescript'],
        qualityCriteria: {
          accuracy: 'Proper TypeScript types',
          completeness: 'Auth and retry logic',
          efficiency: 'Clean async/await usage'
        }
      }
    ]
  },
  {
    category: 'Problem Solving',
    weight: 0.20,
    tests: [
      {
        name: 'Mathematical Reasoning',
        prompt: 'Solve: If a train travels 120km in 1.5 hours, and then 180km in 2 hours, what is the average speed for the entire journey?',
        expectedElements: ['300', 'km', '3.5', 'hours', '85.7', 'average'],
        qualityCriteria: {
          accuracy: 'Correct calculation (85.7 km/h)',
          completeness: 'Shows working steps',
          efficiency: 'Clear explanation'
        }
      },
      {
        name: 'Logical Analysis',
        prompt: 'Debug this logic: A system processes 1000 requests/second but customers report slow responses during peak hours despite CPU being only 40% utilized.',
        expectedElements: ['bottleneck', 'I/O', 'database', 'network', 'queue', 'scaling'],
        qualityCriteria: {
          accuracy: 'Identifies likely bottlenecks',
          completeness: 'Multiple potential causes',
          efficiency: 'Practical solutions'
        }
      }
    ]
  },
  {
    category: 'Technical Writing',
    weight: 0.15,
    tests: [
      {
        name: 'Documentation',
        prompt: 'Write API documentation for a user authentication endpoint including request/response examples',
        expectedElements: ['POST', 'endpoint', 'request', 'response', 'example', 'authentication'],
        qualityCriteria: {
          accuracy: 'Technically correct',
          completeness: 'Full documentation',
          efficiency: 'Clear and concise'
        }
      },
      {
        name: 'Architecture Explanation',
        prompt: 'Explain microservices architecture benefits and drawbacks in 200 words',
        expectedElements: ['microservices', 'benefits', 'drawbacks', 'scalability', 'complexity'],
        qualityCriteria: {
          accuracy: 'Balanced perspective',
          completeness: 'Covers key points',
          efficiency: 'Within word limit'
        }
      }
    ]
  },
  {
    category: 'Creative Tasks', 
    weight: 0.10,
    tests: [
      {
        name: 'Content Creation',
        prompt: 'Write a compelling product description for an AI-powered development tool',
        expectedElements: ['AI', 'development', 'productivity', 'features', 'benefits'],
        qualityCriteria: {
          accuracy: 'Relevant to AI tools',
          completeness: 'Compelling narrative',
          creativity: 'Engaging language'
        }
      }
    ]
  },
  {
    category: 'Data Analysis',
    weight: 0.15,
    tests: [
      {
        name: 'Performance Analysis',
        prompt: 'Analyze this data: API response times: [120ms, 145ms, 2300ms, 156ms, 134ms, 3100ms, 128ms]. Identify issues and recommend solutions.',
        expectedElements: ['outliers', '2300ms', '3100ms', 'average', 'recommendations', 'monitoring'],
        qualityCriteria: {
          accuracy: 'Identifies outliers correctly',
          completeness: 'Provides recommendations',
          efficiency: 'Clear analysis'
        }
      }
    ]
  },
  {
    category: 'System Design',
    weight: 0.15,
    tests: [
      {
        name: 'Architecture Design',
        prompt: 'Design a scalable chat application architecture that supports 1M concurrent users',
        expectedElements: ['websockets', 'load balancer', 'database', 'caching', 'scaling', 'microservices'],
        qualityCriteria: {
          accuracy: 'Scalable design',
          completeness: 'All components covered',
          efficiency: 'Practical approach'
        }
      }
    ]
  }
];

// ============================================================================
// KPI MEASUREMENT ENGINE
// ============================================================================

class KPIMeasurementEngine {
  constructor() {
    this.results = {
      models: {},
      comparative: {},
      developmentSavings: {}
    };
    this.startTime = Date.now();
  }

  // API key retrieval
  getApiKeyFromKeychain(service, account) {
    try {
      return execSync(`security find-generic-password -a "${account}" -s "${service}" -w`, 
        { encoding: 'utf8' }).trim();
    } catch (error) {
      return null;
    }
  }

  // Initialize backends for testing
  async initializeBackends() {
    const backends = {};
    
    // OpenAI Backend
    const openaiKey = this.getApiKeyFromKeychain('openai-api-key', 'openai');
    if (openaiKey) {
      const { OpenAIBackend } = require('./dist/backends/openai.js');
      backends.openai = new OpenAIBackend({
        enabled: true,
        priority: 1,
        cost_per_token: 0.0001,
        api_key: openaiKey,
        model: 'gpt-4o-mini'
      });
    }

    // Qwen Backend
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

    // Claude Backend (placeholder - not implemented yet)
    backends.claude = {
      name: 'claude',
      available: false,
      reason: 'Not implemented in current version'
    };

    return backends;
  }

  // Evaluate response quality
  evaluateResponseQuality(response, test) {
    const scores = {};
    
    // Accuracy Score
    const elementsFound = test.expectedElements.filter(element => 
      response.toLowerCase().includes(element.toLowerCase())
    ).length;
    scores.accuracy = (elementsFound / test.expectedElements.length) * 100;

    // Relevance Score (keyword matching + length appropriateness)
    const relevanceKeywords = test.expectedElements.length;
    const responseLength = response.length;
    const optimalLength = test.expectedElements.join(' ').length * 10; // Rough estimate
    const lengthScore = Math.max(0, 100 - Math.abs(responseLength - optimalLength) / optimalLength * 100);
    scores.relevance = (scores.accuracy * 0.7) + (lengthScore * 0.3);

    // Completeness Score
    const hasStructure = response.includes('\n') || response.includes('.') || response.includes('```');
    const hasExplanation = response.length > 100;
    const hasExample = response.includes('example') || response.includes('```') || response.includes('function');
    scores.completeness = ((hasStructure ? 1 : 0) + (hasExplanation ? 1 : 0) + (hasExample ? 1 : 0)) / 3 * 100;

    // Efficiency Score (based on token-to-value ratio)
    const valueWords = test.expectedElements.filter(element => 
      response.toLowerCase().includes(element.toLowerCase())
    ).length;
    const estimatedTokens = response.split(' ').length * 1.3; // Rough token estimate
    scores.efficiency = Math.min(100, (valueWords / estimatedTokens) * 1000);

    // Creativity Score (for applicable tests)
    const hasVariety = new Set(response.toLowerCase().split(' ')).size / response.split(' ').length;
    const hasMetaphors = /like|as|similar to|analogous to/.test(response.toLowerCase());
    const hasExamples = response.includes('example') || response.includes('for instance');
    scores.creativity = (hasVariety * 50) + (hasMetaphors ? 25 : 0) + (hasExamples ? 25 : 0);

    return scores;
  }

  // Calculate composite quality score
  calculateCompositeScore(scores) {
    return Object.entries(KPI_CONFIG.qualityWeights).reduce((total, [metric, weight]) => {
      return total + (scores[metric] || 0) * weight;
    }, 0);
  }

  // Performance rating classification
  getPerformanceRating(score) {
    if (score >= KPI_CONFIG.performanceThresholds.excellent) return 'Excellent';
    if (score >= KPI_CONFIG.performanceThresholds.good) return 'Good';
    if (score >= KPI_CONFIG.performanceThresholds.acceptable) return 'Acceptable';
    return 'Poor';
  }

  // Cost efficiency analysis
  analyzeCostEfficiency(cost, quality) {
    const valueRatio = quality / (cost * 1000000); // Quality per micro-EUR
    if (valueRatio > 200000) return 'Excellent';
    if (valueRatio > 100000) return 'Good';
    if (valueRatio > 50000) return 'Acceptable';
    return 'Poor';
  }

  // Test individual backend
  async testBackend(backendName, backend, testScenarios) {
    const backendResults = {
      name: backendName,
      available: true,
      categories: {},
      overallScore: 0,
      totalCost: 0,
      totalLatency: 0,
      totalTests: 0,
      passedTests: 0
    };

    console.log(`\n🧪 Testing ${backendName.toUpperCase()} Backend...`);

    for (const category of testScenarios) {
      console.log(`\n  📂 ${category.category}:`);
      
      const categoryResults = {
        name: category.category,
        weight: category.weight,
        tests: [],
        avgScore: 0,
        avgCost: 0,
        avgLatency: 0
      };

      for (const test of category.tests) {
        console.log(`    🧪 ${test.name}...`);
        
        try {
          const startTime = Date.now();
          const response = await backend.send({
            prompt: test.prompt,
            files: [],
            options: { max_tokens: 300 }
          });
          const endTime = Date.now();

          const qualityScores = this.evaluateResponseQuality(response.content, test);
          const compositeScore = this.calculateCompositeScore(qualityScores);
          const performanceRating = this.getPerformanceRating(compositeScore);
          const costEfficiency = this.analyzeCostEfficiency(response.cost_eur, compositeScore);

          const testResult = {
            name: test.name,
            prompt: test.prompt,
            response: response.content.substring(0, 200) + '...',
            qualityScores,
            compositeScore,
            performanceRating,
            cost: response.cost_eur,
            latency: response.latency_ms,
            tokens: {
              input: response.tokens_input,
              output: response.tokens_output,
              total: response.tokens_input + response.tokens_output
            },
            costEfficiency,
            passed: compositeScore >= KPI_CONFIG.performanceThresholds.acceptable
          };

          categoryResults.tests.push(testResult);
          backendResults.totalCost += response.cost_eur;
          backendResults.totalLatency += response.latency_ms;
          backendResults.totalTests += 1;
          
          if (testResult.passed) {
            backendResults.passedTests += 1;
          }

          console.log(`      ✅ Score: ${compositeScore.toFixed(1)} (${performanceRating})`);
          console.log(`      💰 Cost: €${response.cost_eur.toFixed(6)} (${costEfficiency})`);
          console.log(`      ⏱️ Latency: ${response.latency_ms}ms`);

        } catch (error) {
          console.log(`      ❌ Test failed: ${error.message}`);
          categoryResults.tests.push({
            name: test.name,
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
      console.log(`    📊 Category Average: ${categoryResults.avgScore.toFixed(1)}`);
    }

    // Calculate overall weighted score
    let totalWeight = 0;
    let weightedScore = 0;
    
    Object.values(backendResults.categories).forEach(category => {
      weightedScore += category.avgScore * category.weight;
      totalWeight += category.weight;
    });
    
    backendResults.overallScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
    backendResults.successRate = (backendResults.passedTests / backendResults.totalTests) * 100;
    backendResults.avgLatency = backendResults.totalLatency / backendResults.totalTests;

    return backendResults;
  }

  // Calculate development savings
  calculateDevelopmentSavings(results) {
    const savings = {
      directApiVsClaudette: {},
      timeToValue: {},
      qualityImprovement: {},
      costOptimization: {}
    };

    // Estimated direct API costs (without Claudette optimization)
    const directApiMultiplier = 1.3; // 30% higher due to no optimization
    const claudetteOverheadMs = 200; // Claudette processing overhead

    Object.entries(results).forEach(([modelName, result]) => {
      if (result.available === false) return;

      // Direct API vs Claudette comparison
      const directApiCost = result.totalCost * directApiMultiplier;
      const costSavings = directApiCost - result.totalCost;
      const costSavingsPercent = (costSavings / directApiCost) * 100;

      // Time efficiency (including Claudette features)
      const directApiTime = result.avgLatency - claudetteOverheadMs; // Remove Claudette overhead
      const claudetteValueAddTime = claudetteOverheadMs; // Time for optimization features
      const netTimeOverhead = (claudetteValueAddTime / directApiTime) * 100;

      // Quality improvement through routing
      const baselineQuality = 70; // Assumed baseline without optimization
      const qualityImprovement = result.overallScore - baselineQuality;
      const qualityImprovementPercent = (qualityImprovement / baselineQuality) * 100;

      savings.directApiVsClaudette[modelName] = {
        directApiCost,
        claudetteCost: result.totalCost,
        savings: costSavings,
        savingsPercent: costSavingsPercent,
        netTimeOverhead: netTimeOverhead
      };

      savings.timeToValue[modelName] = {
        avgResponseTime: result.avgLatency,
        successRate: result.successRate,
        timeToFirstValue: result.avgLatency / 1000, // seconds
        productivity: result.successRate / (result.avgLatency / 1000) // success per second
      };

      savings.qualityImprovement[modelName] = {
        overallScore: result.overallScore,
        baselineScore: baselineQuality,
        improvement: qualityImprovement,
        improvementPercent: qualityImprovementPercent
      };

      savings.costOptimization[modelName] = {
        costPerToken: result.totalCost / (result.totalTests * 100), // Rough estimate
        costPerSuccessfulTask: result.totalCost / result.passedTests,
        costEfficiencyRating: result.totalCost < 0.001 ? 'Excellent' : 
                             result.totalCost < 0.01 ? 'Good' : 
                             result.totalCost < 0.1 ? 'Acceptable' : 'Poor'
      };
    });

    return savings;
  }

  // Generate comprehensive KPI report
  generateKPIReport(results, savings) {
    const timestamp = new Date().toISOString();
    const reportPath = path.join(__dirname, `kpi-assessment-${Date.now()}.json`);

    const report = {
      metadata: {
        timestamp,
        framework: 'Claudette KPI Assessment v1.0',
        testDuration: Date.now() - this.startTime,
        configuration: KPI_CONFIG
      },
      executiveSummary: this.generateExecutiveSummary(results, savings),
      modelPerformance: results,
      developmentSavings: savings,
      recommendations: this.generateRecommendations(results, savings),
      kpiMetrics: this.calculateKPIMetrics(results, savings)
    };

    // Save detailed report
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return { report, reportPath };
  }

  // Generate executive summary
  generateExecutiveSummary(results, savings) {
    const availableModels = Object.entries(results).filter(([_, r]) => r.available !== false);
    const bestModel = availableModels.reduce((best, [name, result]) => 
      !best || result.overallScore > best.score ? { name, score: result.overallScore } : best, null);

    const mostCostEffective = availableModels.reduce((best, [name, result]) => 
      !best || result.totalCost < best.cost ? { name, cost: result.totalCost } : best, null);

    const fastestModel = availableModels.reduce((best, [name, result]) => 
      !best || result.avgLatency < best.latency ? { name, latency: result.avgLatency } : best, null);

    return {
      bestOverallModel: bestModel,
      mostCostEffectiveModel: mostCostEffective,
      fastestModel: fastestModel,
      totalModelsEvaluated: availableModels.length,
      avgQualityScore: availableModels.reduce((sum, [_, r]) => sum + r.overallScore, 0) / availableModels.length,
      totalCostSavings: Object.values(savings.directApiVsClaudette).reduce((sum, s) => sum + s.savings, 0),
      avgQualityImprovement: Object.values(savings.qualityImprovement).reduce((sum, q) => sum + q.improvementPercent, 0) / availableModels.length
    };
  }

  // Generate actionable recommendations
  generateRecommendations(results, savings) {
    const recommendations = [];

    // Quality-based recommendations
    Object.entries(results).forEach(([modelName, result]) => {
      if (result.available === false) return;

      if (result.overallScore >= 85) {
        recommendations.push({
          type: 'quality',
          priority: 'high',
          model: modelName,
          recommendation: `${modelName} shows excellent performance (${result.overallScore.toFixed(1)}) - consider as primary backend for production workloads`
        });
      } else if (result.overallScore < 60) {
        recommendations.push({
          type: 'quality',
          priority: 'medium',
          model: modelName,
          recommendation: `${modelName} quality below acceptable threshold (${result.overallScore.toFixed(1)}) - investigate model configuration or prompting strategies`
        });
      }

      // Cost-based recommendations
      if (result.totalCost > 0.01) {
        recommendations.push({
          type: 'cost',
          priority: 'high',
          model: modelName,
          recommendation: `${modelName} has high cost (€${result.totalCost.toFixed(4)}) - consider for complex tasks only or implement stricter token limits`
        });
      }

      // Performance-based recommendations
      if (result.avgLatency > 10000) {
        recommendations.push({
          type: 'performance',
          priority: 'medium',
          model: modelName,
          recommendation: `${modelName} has high latency (${result.avgLatency}ms) - consider timeout adjustments or use for non-real-time tasks`
        });
      }
    });

    // Strategic recommendations
    const modelScores = Object.entries(results)
      .filter(([_, r]) => r.available !== false)
      .map(([name, result]) => ({ name, score: result.overallScore, cost: result.totalCost }));

    if (modelScores.length > 1) {
      recommendations.push({
        type: 'strategy',
        priority: 'high',
        recommendation: 'Implement intelligent routing: use highest quality model for critical tasks, most cost-effective for bulk operations'
      });
    }

    return recommendations;
  }

  // Calculate standardized KPI metrics
  calculateKPIMetrics(results, savings) {
    const metrics = {};

    Object.entries(results).forEach(([modelName, result]) => {
      if (result.available === false) return;

      metrics[modelName] = {
        // Quality KPIs
        qualityScore: result.overallScore,
        qualityRating: this.getPerformanceRating(result.overallScore),
        successRate: result.successRate,
        
        // Performance KPIs
        avgResponseTime: result.avgLatency,
        responseTimeRating: result.avgLatency < 2000 ? 'Excellent' : 
                           result.avgLatency < 5000 ? 'Good' : 
                           result.avgLatency < 10000 ? 'Acceptable' : 'Poor',
        
        // Cost KPIs
        totalCost: result.totalCost,
        costPerTask: result.totalCost / result.totalTests,
        costPerSuccessfulTask: result.totalCost / result.passedTests,
        costEfficiencyRating: savings.costOptimization[modelName]?.costEfficiencyRating || 'Unknown',
        
        // Development KPIs
        timeToValue: savings.timeToValue[modelName]?.timeToFirstValue || 0,
        productivity: savings.timeToValue[modelName]?.productivity || 0,
        qualityImprovement: savings.qualityImprovement[modelName]?.improvementPercent || 0,
        
        // ROI KPIs
        costSavings: savings.directApiVsClaudette[modelName]?.savings || 0,
        costSavingsPercent: savings.directApiVsClaudette[modelName]?.savingsPercent || 0,
        netTimeOverhead: savings.directApiVsClaudette[modelName]?.netTimeOverhead || 0
      };
    });

    return metrics;
  }

  // Main execution method
  async runComprehensiveAssessment() {
    console.log('🚀 Claudette KPI Assessment Framework');
    console.log('='.repeat(70));
    console.log('📊 Measuring: Quality, Performance, Cost, Development Savings');
    console.log('🔬 Models: OpenAI, Qwen, Claude (when available)');
    console.log('');

    try {
      // Initialize backends
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

        results[backendName] = await this.testBackend(backendName, backend, TEST_SCENARIOS);
      }

      // Calculate development savings
      const savings = this.calculateDevelopmentSavings(results);

      // Generate comprehensive report
      const { report, reportPath } = this.generateKPIReport(results, savings);

      // Display summary
      this.displaySummaryReport(report);
      
      console.log(`\n💾 Detailed report saved to: ${reportPath}`);
      
      return report;

    } catch (error) {
      console.error('💥 Assessment failed:', error.message);
      throw error;
    }
  }

  // Display concise summary report
  displaySummaryReport(report) {
    console.log('\n' + '='.repeat(70));
    console.log('📊 KPI ASSESSMENT SUMMARY');
    console.log('='.repeat(70));

    const { executiveSummary, kpiMetrics } = report;

    console.log('\n🏆 EXECUTIVE SUMMARY:');
    console.log(`Best Overall Model: ${executiveSummary.bestOverallModel?.name || 'N/A'} (${executiveSummary.bestOverallModel?.score?.toFixed(1) || 0})`);
    console.log(`Most Cost Effective: ${executiveSummary.mostCostEffectiveModel?.name || 'N/A'} (€${executiveSummary.mostCostEffectiveModel?.cost?.toFixed(6) || 0})`);
    console.log(`Fastest Response: ${executiveSummary.fastestModel?.name || 'N/A'} (${executiveSummary.fastestModel?.latency || 0}ms)`);
    console.log(`Average Quality Score: ${executiveSummary.avgQualityScore?.toFixed(1) || 0}%`);
    console.log(`Total Cost Savings: €${executiveSummary.totalCostSavings?.toFixed(6) || 0}`);
    console.log(`Avg Quality Improvement: ${executiveSummary.avgQualityImprovement?.toFixed(1) || 0}%`);

    console.log('\n📈 DETAILED KPI METRICS:');
    Object.entries(kpiMetrics).forEach(([model, metrics]) => {
      console.log(`\n  🤖 ${model.toUpperCase()}:`);
      console.log(`    Quality: ${metrics.qualityScore.toFixed(1)}% (${metrics.qualityRating})`);
      console.log(`    Success Rate: ${metrics.successRate.toFixed(1)}%`);
      console.log(`    Avg Response: ${metrics.avgResponseTime}ms (${metrics.responseTimeRating})`);
      console.log(`    Cost per Task: €${metrics.costPerTask.toFixed(6)} (${metrics.costEfficiencyRating})`);
      console.log(`    Time to Value: ${metrics.timeToValue.toFixed(1)}s`);
      console.log(`    Cost Savings: €${metrics.costSavings.toFixed(6)} (${metrics.costSavingsPercent.toFixed(1)}%)`);
      console.log(`    Quality Gain: ${metrics.qualityImprovement.toFixed(1)}%`);
    });

    console.log('\n💡 TOP RECOMMENDATIONS:');
    report.recommendations.slice(0, 5).forEach((rec, index) => {
      console.log(`  ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.recommendation}`);
    });

    console.log('\n' + '='.repeat(70));
  }
}

// ============================================================================
// EXECUTION
// ============================================================================

async function main() {
  const kpiEngine = new KPIMeasurementEngine();
  
  try {
    const report = await kpiEngine.runComprehensiveAssessment();
    process.exit(0);
  } catch (error) {
    console.error('Assessment failed:', error.message);
    process.exit(1);
  }
}

// Run the assessment if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { KPIMeasurementEngine, KPI_CONFIG, TEST_SCENARIOS };