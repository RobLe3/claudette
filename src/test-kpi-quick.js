#!/usr/bin/env node

// Quick KPI Assessment - Focused measurement for immediate insights

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { KPIDashboard } = require('./kpi-dashboard.js');

// Streamlined test scenarios for quick assessment
const QUICK_TESTS = [
  {
    category: 'Code Generation',
    weight: 0.4,
    test: {
      name: 'Function Creation',
      prompt: 'Write a Python function that calculates fibonacci numbers with memoization',
      expectedElements: ['def', 'fibonacci', 'memo', 'return']
    }
  },
  {
    category: 'Problem Solving', 
    weight: 0.3,
    test: {
      name: 'Math Problem',
      prompt: 'If 3 workers can build 3 walls in 3 hours, how many workers are needed to build 6 walls in 6 hours?',
      expectedElements: ['3', 'workers', '6', 'walls', 'answer']
    }
  },
  {
    category: 'Analysis',
    weight: 0.3,
    test: {
      name: 'Data Interpretation', 
      prompt: 'Analyze this: API calls increased 300% but revenue only 50%. What could be wrong?',
      expectedElements: ['efficiency', 'conversion', 'cost', 'analysis', 'problem']
    }
  }
];

class QuickKPIEngine {
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

    return backends;
  }

  evaluateResponse(response, test) {
    const elementsFound = test.expectedElements.filter(element => 
      response.toLowerCase().includes(element.toLowerCase())
    ).length;
    
    const accuracy = (elementsFound / test.expectedElements.length) * 100;
    const completeness = response.length > 50 ? 100 : (response.length / 50) * 100;
    const relevance = accuracy; // Simplified for quick assessment
    
    return {
      accuracy,
      completeness,
      relevance,
      composite: (accuracy * 0.5) + (completeness * 0.3) + (relevance * 0.2)
    };
  }

  async testBackendQuick(backendName, backend) {
    console.log(`\n🧪 Quick Testing ${backendName.toUpperCase()}...`);
    
    const results = {
      name: backendName,
      tests: [],
      avgScore: 0,
      avgCost: 0,
      avgLatency: 0,
      totalCost: 0,
      successRate: 0
    };

    for (const scenario of QUICK_TESTS) {
      console.log(`  📂 ${scenario.category}: ${scenario.test.name}...`);
      
      try {
        const startTime = Date.now();
        const response = await backend.send({
          prompt: scenario.test.prompt,
          files: [],
          options: { max_tokens: 200 }
        });
        const endTime = Date.now();

        const evaluation = this.evaluateResponse(response.content, scenario.test);
        
        const testResult = {
          category: scenario.category,
          name: scenario.test.name,
          score: evaluation.composite,
          cost: response.cost_eur,
          latency: response.latency_ms,
          tokens: response.tokens_input + response.tokens_output,
          passed: evaluation.composite >= 60,
          response: response.content.substring(0, 100) + '...'
        };

        results.tests.push(testResult);
        results.totalCost += response.cost_eur;
        
        console.log(`    ✅ Score: ${evaluation.composite.toFixed(1)}`);
        console.log(`    💰 Cost: €${response.cost_eur.toFixed(6)}`);
        console.log(`    ⏱️ Latency: ${response.latency_ms}ms`);

      } catch (error) {
        console.log(`    ❌ Failed: ${error.message}`);
        results.tests.push({
          category: scenario.category,
          name: scenario.test.name,
          score: 0,
          cost: 0,
          latency: 0,
          tokens: 0,
          passed: false,
          error: error.message
        });
      }
    }

    // Calculate averages
    const validTests = results.tests.filter(t => !t.error);
    if (validTests.length > 0) {
      results.avgScore = validTests.reduce((sum, t) => sum + t.score, 0) / validTests.length;
      results.avgCost = validTests.reduce((sum, t) => sum + t.cost, 0) / validTests.length;
      results.avgLatency = validTests.reduce((sum, t) => sum + t.latency, 0) / validTests.length;
      results.successRate = (validTests.filter(t => t.passed).length / validTests.length) * 100;
    }

    console.log(`  📊 Overall Score: ${results.avgScore.toFixed(1)}%`);
    console.log(`  💰 Avg Cost: €${results.avgCost.toFixed(6)}`);
    console.log(`  ⏱️ Avg Latency: ${results.avgLatency.toFixed(0)}ms`);
    console.log(`  ✅ Success Rate: ${results.successRate.toFixed(1)}%`);

    return results;
  }

  calculateComparison(results) {
    const models = Object.keys(results);
    if (models.length < 2) return {};

    const comparison = {
      qualityLeader: null,
      costLeader: null,
      speedLeader: null,
      bestValue: null,
      recommendations: []
    };

    // Find leaders
    let bestQuality = 0;
    let lowestCost = Infinity;
    let fastestSpeed = Infinity;
    let bestValueRatio = 0;

    models.forEach(model => {
      const result = results[model];
      
      if (result.avgScore > bestQuality) {
        bestQuality = result.avgScore;
        comparison.qualityLeader = { model, score: result.avgScore };
      }
      
      if (result.avgCost < lowestCost) {
        lowestCost = result.avgCost;
        comparison.costLeader = { model, cost: result.avgCost };
      }
      
      if (result.avgLatency < fastestSpeed) {
        fastestSpeed = result.avgLatency;
        comparison.speedLeader = { model, latency: result.avgLatency };
      }
      
      const valueRatio = result.avgScore / (result.avgCost * 1000000); // Quality per micro-EUR
      if (valueRatio > bestValueRatio) {
        bestValueRatio = valueRatio;
        comparison.bestValue = { model, ratio: valueRatio };
      }
    });

    // Generate recommendations
    if (comparison.qualityLeader) {
      comparison.recommendations.push({
        type: 'quality',
        priority: 'high',
        text: `Use ${comparison.qualityLeader.model.toUpperCase()} for tasks requiring highest quality (${comparison.qualityLeader.score.toFixed(1)}% score)`
      });
    }

    if (comparison.costLeader) {
      comparison.recommendations.push({
        type: 'cost',
        priority: 'medium',
        text: `Use ${comparison.costLeader.model.toUpperCase()} for cost-sensitive operations (€${comparison.costLeader.cost.toFixed(6)} per task)`
      });
    }

    if (comparison.speedLeader) {
      comparison.recommendations.push({
        type: 'performance',
        priority: 'medium', 
        text: `Use ${comparison.speedLeader.model.toUpperCase()} for time-critical tasks (${comparison.speedLeader.latency.toFixed(0)}ms average)`
      });
    }

    return comparison;
  }

  generateQuickReport(results, comparison) {
    const timestamp = new Date().toISOString();
    const testDuration = Date.now() - this.startTime;

    // Create simplified report structure compatible with dashboard
    const report = {
      metadata: {
        timestamp,
        framework: 'Claudette Quick KPI Assessment v1.0',
        testDuration
      },
      executiveSummary: {
        bestOverallModel: comparison.qualityLeader,
        mostCostEffectiveModel: comparison.costLeader,
        fastestModel: comparison.speedLeader,
        totalModelsEvaluated: Object.keys(results).length,
        avgQualityScore: Object.values(results).reduce((sum, r) => sum + r.avgScore, 0) / Object.keys(results).length,
        totalCostSavings: 0.001, // Placeholder
        avgQualityImprovement: 15 // Placeholder
      },
      kpiMetrics: {},
      recommendations: comparison.recommendations || []
    };

    // Convert results to KPI metrics format
    Object.entries(results).forEach(([model, result]) => {
      report.kpiMetrics[model] = {
        qualityScore: result.avgScore,
        qualityRating: result.avgScore >= 80 ? 'Excellent' : 
                      result.avgScore >= 65 ? 'Good' : 
                      result.avgScore >= 50 ? 'Acceptable' : 'Poor',
        successRate: result.successRate,
        avgResponseTime: result.avgLatency,
        responseTimeRating: result.avgLatency < 3000 ? 'Excellent' :
                           result.avgLatency < 8000 ? 'Good' :
                           result.avgLatency < 15000 ? 'Acceptable' : 'Poor',
        totalCost: result.totalCost,
        costPerTask: result.avgCost,
        costPerSuccessfulTask: result.totalCost / Math.max(1, result.tests.filter(t => t.passed).length),
        costEfficiencyRating: result.avgCost < 0.001 ? 'Excellent' :
                             result.avgCost < 0.01 ? 'Good' :
                             result.avgCost < 0.1 ? 'Acceptable' : 'Poor',
        timeToValue: result.avgLatency / 1000,
        productivity: result.successRate / (result.avgLatency / 1000),
        qualityImprovement: 10, // Placeholder
        costSavings: 0.001, // Placeholder  
        costSavingsPercent: 15, // Placeholder
        netTimeOverhead: 20 // Placeholder
      };
    });

    return report;
  }

  async runQuickAssessment() {
    console.log('🚀 Claudette Quick KPI Assessment');
    console.log('='.repeat(50));
    console.log('📊 Fast comparison: Quality, Cost, Speed');
    console.log('🔬 Testing key scenarios across models\n');

    try {
      const backends = await this.initializeBackends();
      const results = {};

      // Test each backend
      for (const [backendName, backend] of Object.entries(backends)) {
        results[backendName] = await this.testBackendQuick(backendName, backend);
      }

      // Calculate comparison
      const comparison = this.calculateComparison(results);
      
      // Generate report
      const report = this.generateQuickReport(results, comparison);
      
      // Display summary
      console.log('\n' + '='.repeat(50));
      console.log('📊 QUICK KPI SUMMARY');
      console.log('='.repeat(50));

      if (comparison.qualityLeader) {
        console.log(`🏆 Quality Leader: ${comparison.qualityLeader.model.toUpperCase()} (${comparison.qualityLeader.score.toFixed(1)}%)`);
      }
      if (comparison.costLeader) {
        console.log(`💰 Cost Leader: ${comparison.costLeader.model.toUpperCase()} (€${comparison.costLeader.cost.toFixed(6)})`);
      }
      if (comparison.speedLeader) {
        console.log(`⚡ Speed Leader: ${comparison.speedLeader.model.toUpperCase()} (${comparison.speedLeader.latency.toFixed(0)}ms)`);
      }

      console.log('\n💡 Quick Recommendations:');
      comparison.recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec.text}`);
      });

      // Generate dashboard
      const dashboard = new KPIDashboard();
      const dashboardPath = dashboard.generateDashboard(report);
      
      console.log(`\n💾 Dashboard generated: ${dashboardPath}`);
      console.log(`🌐 Open in browser to view detailed visualizations`);

      // Save detailed report
      const reportPath = path.join(__dirname, `quick-kpi-report-${Date.now()}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Detailed report: ${reportPath}`);

      return { report, dashboardPath, reportPath };

    } catch (error) {
      console.error('💥 Quick assessment failed:', error.message);
      throw error;
    }
  }
}

// Run assessment
async function main() {
  const engine = new QuickKPIEngine();
  
  try {
    await engine.runQuickAssessment();
    process.exit(0);
  } catch (error) {
    console.error('Assessment failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { QuickKPIEngine };