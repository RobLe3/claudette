#!/usr/bin/env node

/**
 * Focused Claudette Suite Benchmark
 * Streamlined multi-iteration testing with quality scoring
 */

const { DynamicTimeoutManager } = require('./src/monitoring/dynamic-timeout-manager.js');
const { Claudette } = require('./dist/index.js');

class FocusedClaudetteBenchmark {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      iterations: 5,
      scenarios: 4,
      results: []
    };
    
    this.testScenarios = [
      { name: 'Simple Query', prompt: 'What is 2+2?', complexity: 1, expected_length: 20 },
      { name: 'Code Analysis', prompt: 'Explain this function: function add(a, b) { return a + b; }', complexity: 2, expected_length: 100 },
      { name: 'Problem Solving', prompt: 'How to debug memory leaks?', complexity: 3, expected_length: 200 },
      { name: 'Architecture', prompt: 'Design a REST API structure', complexity: 4, expected_length: 300 }
    ];
  }

  async runFocusedBenchmark() {
    console.log('🎯 Focused Claudette Suite Benchmark');
    console.log('=' .repeat(50));
    console.log(`Iterations: ${this.results.iterations}, Scenarios: ${this.results.scenarios}`);
    
    const timeoutManager = new DynamicTimeoutManager();
    
    for (let iteration = 1; iteration <= this.results.iterations; iteration++) {
      console.log(`\\n🔄 Iteration ${iteration}/${this.results.iterations}`);
      
      const iterationResult = {
        iteration,
        timestamp: new Date().toISOString(),
        scenarios: [],
        metrics: { avg_latency: 0, avg_quality: 0, avg_efficiency: 0, success_rate: 0 }
      };
      
      for (let i = 0; i < this.testScenarios.length; i++) {
        const scenario = this.testScenarios[i];
        console.log(`   🧪 Testing: ${scenario.name}`);
        
        try {
          const result = await this.testScenario(scenario, timeoutManager);
          iterationResult.scenarios.push(result);
          console.log(`      ⚡ ${result.latency}ms | Quality: ${result.quality_score.toFixed(1)}/10 | Efficiency: ${result.efficiency_score.toFixed(1)}/10`);
          
        } catch (error) {
          console.log(`      ❌ Failed: ${error.message}`);
          iterationResult.scenarios.push({
            scenario: scenario.name,
            success: false,
            error: error.message,
            latency: 0,
            quality_score: 0,
            efficiency_score: 0
          });
        }
      }
      
      // Calculate iteration metrics
      const successful = iterationResult.scenarios.filter(s => s.success);
      iterationResult.metrics = {
        avg_latency: successful.length > 0 ? successful.reduce((sum, s) => sum + s.latency, 0) / successful.length : 0,
        avg_quality: successful.length > 0 ? successful.reduce((sum, s) => sum + s.quality_score, 0) / successful.length : 0,
        avg_efficiency: successful.length > 0 ? successful.reduce((sum, s) => sum + s.efficiency_score, 0) / successful.length : 0,
        success_rate: successful.length / iterationResult.scenarios.length
      };
      
      this.results.results.push(iterationResult);
      
      console.log(`   📊 Iteration Avg - Latency: ${Math.round(iterationResult.metrics.avg_latency)}ms, Quality: ${iterationResult.metrics.avg_quality.toFixed(1)}/10, Success: ${(iterationResult.metrics.success_rate * 100).toFixed(1)}%`);
    }
    
    this.generateFinalReport();
  }

  async testScenario(scenario, timeoutManager) {
    const backendName = `test-${scenario.name.replace(/\\s+/g, '-').toLowerCase()}`;
    
    const dynamicTimeout = timeoutManager.getTimeoutForBackend(backendName, {
      complexityScore: scenario.complexity / 5,
      requestSize: scenario.prompt.length
    });
    
    const claudette = new Claudette();
    try {
      await claudette.initialize();
      
      const queryStart = Date.now();
      const response = await claudette.optimize(scenario.prompt);
      const queryDuration = Date.now() - queryStart;
      
      // Record performance
      timeoutManager.recordPerformance(backendName, {
        latency: queryDuration,
        success: true,
        timeout: false,
        requestSize: scenario.prompt.length,
        responseSize: response.content ? response.content.length : 0
      });
      
      const qualityScore = this.calculateQualityScore(scenario, response);
      const efficiencyScore = this.calculateEfficiencyScore(queryDuration, dynamicTimeout);
      
      return {
        scenario: scenario.name,
        success: true,
        latency: queryDuration,
        response_length: response.content ? response.content.length : 0,
        backend_used: response.backend_used,
        dynamic_timeout: dynamicTimeout,
        quality_score: qualityScore,
        efficiency_score: efficiencyScore,
        response_content: response.content ? response.content.substring(0, 100) + '...' : 'No content'
      };
      
    } finally {
      await claudette.cleanup();
    }
  }

  calculateQualityScore(scenario, response) {
    if (!response.content) return 0;
    
    let score = 5; // Base score
    
    // Length appropriateness (0-3 points)
    const contentLength = response.content.length;
    if (contentLength >= scenario.expected_length * 0.5) score += 1;
    if (contentLength >= scenario.expected_length) score += 1;
    if (contentLength <= scenario.expected_length * 3) score += 1; // Not too long
    
    // Content relevance (0-2 points)
    const prompt = scenario.prompt.toLowerCase();
    const content = response.content.toLowerCase();
    const promptWords = prompt.match(/\\w+/g) || [];
    const relevantWords = promptWords.filter(word => content.includes(word)).length;
    if (relevantWords >= promptWords.length * 0.3) score += 1;
    if (relevantWords >= promptWords.length * 0.6) score += 1;
    
    return Math.min(10, Math.max(0, score));
  }

  calculateEfficiencyScore(latency, timeout) {
    let score = 10;
    
    // Latency penalty
    if (latency > 1000) score -= 2;
    if (latency > 2000) score -= 2;
    if (latency > 5000) score -= 3;
    
    // Timeout utilization bonus
    const utilization = latency / timeout;
    if (utilization < 0.5) score += 1; // Efficient use of timeout
    if (utilization < 0.3) score += 1; // Very efficient
    
    return Math.min(10, Math.max(0, score));
  }

  generateFinalReport() {
    console.log('\\n📋 Focused Benchmark Report');
    console.log('=' .repeat(50));
    
    // Calculate overall metrics
    const allSuccessful = this.results.results.flatMap(r => r.scenarios.filter(s => s.success));
    const totalRequests = this.results.results.reduce((sum, r) => sum + r.scenarios.length, 0);
    
    const overallMetrics = {
      total_requests: totalRequests,
      successful_requests: allSuccessful.length,
      success_rate: allSuccessful.length / totalRequests,
      avg_latency: allSuccessful.length > 0 ? allSuccessful.reduce((sum, s) => sum + s.latency, 0) / allSuccessful.length : 0,
      avg_quality: allSuccessful.length > 0 ? allSuccessful.reduce((sum, s) => sum + s.quality_score, 0) / allSuccessful.length : 0,
      avg_efficiency: allSuccessful.length > 0 ? allSuccessful.reduce((sum, s) => sum + s.efficiency_score, 0) / allSuccessful.length : 0
    };
    
    console.log(`\\n🎯 Overall Performance:`);
    console.log(`   Success Rate: ${(overallMetrics.success_rate * 100).toFixed(1)}% (${overallMetrics.successful_requests}/${overallMetrics.total_requests})`);
    console.log(`   Average Latency: ${Math.round(overallMetrics.avg_latency)}ms`);
    console.log(`   Average Quality: ${overallMetrics.avg_quality.toFixed(1)}/10`);
    console.log(`   Average Efficiency: ${overallMetrics.avg_efficiency.toFixed(1)}/10`);
    
    // Iteration analysis
    console.log(`\\n📊 Iteration Performance:`);
    this.results.results.forEach((result, index) => {
      const status = result.metrics.success_rate === 1 ? '✅' : result.metrics.success_rate >= 0.75 ? '⚠️' : '❌';
      console.log(`   ${status} Iteration ${index + 1}: ${Math.round(result.metrics.avg_latency)}ms avg, ${result.metrics.avg_quality.toFixed(1)} quality, ${(result.metrics.success_rate * 100).toFixed(0)}% success`);
    });
    
    // Quality distribution
    const qualityScores = allSuccessful.map(s => s.quality_score);
    const qualityDistribution = {
      excellent: qualityScores.filter(s => s >= 8).length,
      good: qualityScores.filter(s => s >= 6 && s < 8).length,
      fair: qualityScores.filter(s => s >= 4 && s < 6).length,
      poor: qualityScores.filter(s => s < 4).length
    };
    
    console.log(`\\n📈 Quality Distribution:`);
    console.log(`   Excellent (8-10): ${qualityDistribution.excellent} responses`);
    console.log(`   Good (6-8): ${qualityDistribution.good} responses`);
    console.log(`   Fair (4-6): ${qualityDistribution.fair} responses`);
    console.log(`   Poor (0-4): ${qualityDistribution.poor} responses`);
    
    // Performance trends
    const iterationQualities = this.results.results.map(r => r.metrics.avg_quality);
    const iterationLatencies = this.results.results.map(r => r.metrics.avg_latency);
    
    const qualityTrend = this.calculateTrend(iterationQualities);
    const latencyTrend = this.calculateTrend(iterationLatencies);
    
    console.log(`\\n🔄 Performance Trends:`);
    console.log(`   Quality Trend: ${qualityTrend}`);
    console.log(`   Latency Trend: ${latencyTrend}`);
    
    // Overall score calculation
    const overallScore = (overallMetrics.avg_quality * 0.4) + (overallMetrics.avg_efficiency * 0.3) + (overallMetrics.success_rate * 10 * 0.3);
    const scoreLevel = overallScore >= 8 ? 'EXCELLENT' : overallScore >= 6 ? 'GOOD' : overallScore >= 4 ? 'FAIR' : 'POOR';
    
    console.log(`\\n🏆 Final Assessment:`);
    console.log(`   Overall Score: ${overallScore.toFixed(1)}/10`);
    console.log(`   Performance Level: ${scoreLevel}`);
    
    // Key insights
    console.log(`\\n💡 Key Insights:`);
    console.log(`   • Dynamic timeout system processed ${overallMetrics.total_requests} requests`);
    console.log(`   • Average response time: ${Math.round(overallMetrics.avg_latency)}ms`);
    console.log(`   • Quality consistency across ${this.results.iterations} iterations`);
    console.log(`   • System maintained ${(overallMetrics.success_rate * 100).toFixed(1)}% reliability`);
    
    // Enhanced results object
    this.results.final_metrics = overallMetrics;
    this.results.quality_distribution = qualityDistribution;
    this.results.trends = { quality: qualityTrend, latency: latencyTrend };
    this.results.overall_score = overallScore;
    this.results.performance_level = scoreLevel;
    
    // Save results
    const fs = require('fs');
    fs.writeFileSync('focused-claudette-benchmark-results.json', JSON.stringify(this.results, null, 2));
    console.log('\\n💾 Results saved to: focused-claudette-benchmark-results.json');
  }

  calculateTrend(values) {
    if (values.length < 2) return 'insufficient_data';
    
    const firstHalf = values.slice(0, Math.ceil(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;
    
    const change = (secondAvg - firstAvg) / firstAvg;
    
    if (Math.abs(change) < 0.05) return 'stable';
    return change > 0 ? 'improving' : 'degrading';
  }
}

// Run benchmark
async function main() {
  const benchmark = new FocusedClaudetteBenchmark();
  await benchmark.runFocusedBenchmark();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { FocusedClaudetteBenchmark };