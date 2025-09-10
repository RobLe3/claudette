#!/usr/bin/env node

/**
 * Comprehensive Claudette Suite Benchmark
 * Multi-iteration testing with output quality scoring and efficiency measurement
 */

const { DynamicTimeoutManager } = require('./src/monitoring/dynamic-timeout-manager.js');
const { Claudette } = require('./dist/index.js');
const crypto = require('crypto');

class ComprehensiveClaudetteBenchmark {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      benchmark_config: {
        iterations: 10,
        test_scenarios: 8,
        quality_metrics: ['relevance', 'completeness', 'accuracy', 'coherence'],
        efficiency_metrics: ['latency', 'throughput', 'resource_usage', 'timeout_effectiveness']
      },
      iteration_results: [],
      quality_analysis: {},
      efficiency_analysis: {},
      system_performance: {},
      overall_score: 0
    };
    
    this.testScenarios = [
      { name: 'Simple Query', prompt: 'What is 2+2?', complexity: 1, expected_length: [1, 50] },
      { name: 'Code Analysis', prompt: 'Explain this JavaScript function: function add(a, b) { return a + b; }', complexity: 3, expected_length: [100, 300] },
      { name: 'Complex Reasoning', prompt: 'Compare the pros and cons of microservices vs monolithic architecture', complexity: 5, expected_length: [300, 800] },
      { name: 'Technical Documentation', prompt: 'Write API documentation for a REST endpoint that creates users', complexity: 4, expected_length: [200, 500] },
      { name: 'Problem Solving', prompt: 'How would you debug a memory leak in a Node.js application?', complexity: 4, expected_length: [200, 600] },
      { name: 'Data Analysis', prompt: 'Analyze this dataset pattern: [1, 2, 4, 8, 16, 32]', complexity: 2, expected_length: [50, 200] },
      { name: 'System Design', prompt: 'Design a scalable chat application architecture', complexity: 5, expected_length: [400, 1000] },
      { name: 'Error Handling', prompt: 'What are best practices for error handling in distributed systems?', complexity: 4, expected_length: [300, 700] }
    ];
  }

  async runComprehensiveBenchmark() {
    console.log('🚀 Comprehensive Claudette Suite Benchmark');
    console.log('=' .repeat(60));
    console.log(`Iterations: ${this.results.benchmark_config.iterations}`);
    console.log(`Test Scenarios: ${this.results.benchmark_config.test_scenarios}`);
    console.log(`Quality Metrics: ${this.results.benchmark_config.quality_metrics.join(', ')}`);
    console.log('=' .repeat(60));
    
    try {
      // Initialize systems
      const timeoutManager = new DynamicTimeoutManager();
      const systemMetrics = {
        total_requests: 0,
        successful_requests: 0,
        failed_requests: 0,
        total_latency: 0,
        timeout_calibrations: 0
      };
      
      // Run multiple iterations
      for (let iteration = 1; iteration <= this.results.benchmark_config.iterations; iteration++) {
        console.log(`\\n🔄 Iteration ${iteration}/${this.results.benchmark_config.iterations}`);
        
        const iterationResult = await this.runSingleIteration(iteration, timeoutManager, systemMetrics);
        this.results.iteration_results.push(iterationResult);
        
        // Progress indicator
        const progress = (iteration / this.results.benchmark_config.iterations * 100).toFixed(1);
        console.log(`   📊 Progress: ${progress}% - Quality: ${iterationResult.avg_quality_score.toFixed(1)}/10 - Efficiency: ${iterationResult.avg_efficiency_score.toFixed(1)}/10`);
      }
      
      // Analyze results
      await this.analyzeResults();
      
      // Generate final report
      this.generateComprehensiveReport();
      
    } catch (error) {
      console.log('❌ Comprehensive benchmark failed:', error.message);
      this.results.overall_score = 0;
    }
  }

  async runSingleIteration(iterationNumber, timeoutManager, systemMetrics) {
    const iterationStart = Date.now();
    const iterationResult = {
      iteration: iterationNumber,
      timestamp: new Date().toISOString(),
      scenario_results: [],
      iteration_metrics: {
        total_duration: 0,
        avg_latency: 0,
        avg_quality_score: 0,
        avg_efficiency_score: 0,
        success_rate: 0,
        timeout_improvements: 0
      }
    };
    
    // Test each scenario
    for (let i = 0; i < this.testScenarios.length; i++) {
      const scenario = this.testScenarios[i];
      console.log(`   🧪 Testing: ${scenario.name}`);
      
      try {
        const scenarioResult = await this.testScenario(scenario, timeoutManager, systemMetrics);
        iterationResult.scenario_results.push(scenarioResult);
        
        console.log(`      ⚡ ${scenarioResult.latency}ms | Quality: ${scenarioResult.quality_score.toFixed(1)}/10 | Efficiency: ${scenarioResult.efficiency_score.toFixed(1)}/10`);
        
      } catch (error) {
        console.log(`      ❌ Scenario failed: ${error.message}`);
        iterationResult.scenario_results.push({
          scenario: scenario.name,
          success: false,
          error: error.message,
          quality_score: 0,
          efficiency_score: 0,
          latency: 0
        });
      }
    }
    
    // Calculate iteration metrics
    const successfulScenarios = iterationResult.scenario_results.filter(r => r.success);
    iterationResult.iteration_metrics = {
      total_duration: Date.now() - iterationStart,
      avg_latency: successfulScenarios.reduce((sum, r) => sum + r.latency, 0) / Math.max(successfulScenarios.length, 1),
      avg_quality_score: successfulScenarios.reduce((sum, r) => sum + r.quality_score, 0) / Math.max(successfulScenarios.length, 1),
      avg_efficiency_score: successfulScenarios.reduce((sum, r) => sum + r.efficiency_score, 0) / Math.max(successfulScenarios.length, 1),
      success_rate: successfulScenarios.length / iterationResult.scenario_results.length,
      timeout_improvements: this.calculateTimeoutImprovements(iterationResult.scenario_results)
    };
    
    return iterationResult;
  }

  async testScenario(scenario, timeoutManager, systemMetrics) {
    const testStart = Date.now();
    const backendName = `scenario-${scenario.name.replace(/\\s+/g, '-').toLowerCase()}`;
    
    // Get dynamic timeout
    const dynamicTimeout = timeoutManager.getTimeoutForBackend(backendName, {
      complexityScore: scenario.complexity / 5,
      requestSize: scenario.prompt.length
    });
    
    // Execute test
    const claudette = new Claudette();
    try {
      await claudette.initialize();
      
      const queryStart = Date.now();
      const response = await claudette.optimize(scenario.prompt);
      const queryDuration = Date.now() - queryStart;
      
      // Record performance for timeout calibration
      timeoutManager.recordPerformance(backendName, {
        latency: queryDuration,
        success: true,
        timeout: false,
        requestSize: scenario.prompt.length,
        responseSize: response.content ? response.content.length : 0
      });
      
      // Update system metrics
      systemMetrics.total_requests++;
      systemMetrics.successful_requests++;
      systemMetrics.total_latency += queryDuration;
      
      // Calculate scores
      const qualityScore = this.calculateQualityScore(scenario, response);
      const efficiencyScore = this.calculateEfficiencyScore(scenario, response, queryDuration, dynamicTimeout);
      
      return {
        scenario: scenario.name,
        success: true,
        latency: queryDuration,
        response_length: response.content ? response.content.length : 0,
        backend_used: response.backend_used,
        dynamic_timeout_used: dynamicTimeout,
        quality_score: qualityScore,
        efficiency_score: efficiencyScore,
        quality_breakdown: this.getQualityBreakdown(scenario, response),
        efficiency_breakdown: this.getEfficiencyBreakdown(scenario, response, queryDuration, dynamicTimeout)
      };
      
    } finally {
      await claudette.cleanup();
    }
  }

  calculateQualityScore(scenario, response) {
    if (!response.content) return 0;
    
    const content = response.content;
    const contentLength = content.length;
    const [minExpected, maxExpected] = scenario.expected_length;
    
    let score = 0;
    
    // Relevance (25%): Check if response addresses the prompt
    const relevanceScore = this.assessRelevance(scenario.prompt, content);
    score += relevanceScore * 0.25;
    
    // Completeness (25%): Check response length appropriateness
    let completenessScore = 10;
    if (contentLength < minExpected * 0.7) completenessScore -= 3;
    if (contentLength > maxExpected * 1.5) completenessScore -= 2;
    score += (completenessScore / 10) * 0.25 * 10;
    
    // Accuracy (25%): Basic content quality indicators
    const accuracyScore = this.assessAccuracy(scenario, content);
    score += accuracyScore * 0.25;
    
    // Coherence (25%): Response structure and readability
    const coherenceScore = this.assessCoherence(content);
    score += coherenceScore * 0.25;
    
    return Math.min(10, Math.max(0, score));
  }

  calculateEfficiencyScore(scenario, response, latency, dynamicTimeout) {
    let score = 0;
    
    // Latency efficiency (40%): Faster is better
    const expectedLatency = 1000 + (scenario.complexity * 200); // Base expectation
    let latencyScore = Math.max(0, 10 - ((latency - expectedLatency) / expectedLatency * 5));
    score += (latencyScore / 10) * 0.4 * 10;
    
    // Timeout effectiveness (30%): How well timeout was calibrated
    const timeoutEffectiveness = latency < dynamicTimeout * 0.8 ? 10 : Math.max(0, 10 - ((latency / dynamicTimeout) * 5));
    score += (timeoutEffectiveness / 10) * 0.3 * 10;
    
    // Resource usage (20%): Response quality per unit time
    const resourceScore = response.content ? Math.min(10, (response.content.length / latency) * 1000) : 0;
    score += (resourceScore / 10) * 0.2 * 10;
    
    // Throughput (10%): Overall processing speed
    const throughputScore = Math.min(10, Math.max(0, 10 - (latency / 1000)));
    score += (throughputScore / 10) * 0.1 * 10;
    
    return Math.min(10, Math.max(0, score));
  }

  assessRelevance(prompt, content) {
    // Simple keyword-based relevance assessment
    const promptWords = prompt.toLowerCase().match(/\\w+/g) || [];
    const contentWords = content.toLowerCase().match(/\\w+/g) || [];
    
    const commonWords = promptWords.filter(word => contentWords.includes(word));
    const relevanceRatio = commonWords.length / Math.max(promptWords.length, 1);
    
    return Math.min(10, relevanceRatio * 15); // Scale to 0-10
  }

  assessAccuracy(scenario, content) {
    // Basic accuracy heuristics based on scenario type
    let score = 7; // Base score
    
    if (scenario.name.includes('Code') && content.includes('function')) score += 1;
    if (scenario.name.includes('API') && content.includes('endpoint')) score += 1;
    if (scenario.name.includes('Architecture') && content.includes('system')) score += 1;
    if (scenario.name.includes('Error') && content.includes('handling')) score += 1;
    
    // Check for completeness indicators
    if (content.length > 50) score += 1;
    if (content.includes('.') && content.includes(',')) score += 0.5; // Basic structure
    
    return Math.min(10, score);
  }

  assessCoherence(content) {
    let score = 5; // Base score
    
    // Basic coherence indicators
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 1) score += 2; // Multiple sentences
    if (content.includes('\\n') || content.includes('\\n\\n')) score += 1; // Structure
    if (content.match(/^[A-Z]/) && content.match(/[.!?]$/)) score += 1; // Proper start/end
    
    // Penalize very short or very fragmented responses
    if (content.length < 20) score -= 3;
    if (sentences.length > 50) score -= 1; // Too fragmented
    
    return Math.min(10, Math.max(0, score));
  }

  getQualityBreakdown(scenario, response) {
    return {
      relevance: this.assessRelevance(scenario.prompt, response.content || ''),
      completeness: Math.min(10, (response.content?.length || 0) / scenario.expected_length[1] * 10),
      accuracy: this.assessAccuracy(scenario, response.content || ''),
      coherence: this.assessCoherence(response.content || '')
    };
  }

  getEfficiencyBreakdown(scenario, response, latency, dynamicTimeout) {
    return {
      latency_score: Math.max(0, 10 - (latency / 1000)),
      timeout_effectiveness: Math.min(10, dynamicTimeout / latency * 5),
      resource_efficiency: response.content ? Math.min(10, (response.content.length / latency) * 1000) : 0,
      throughput_score: Math.min(10, Math.max(0, 10 - (latency / 1000)))
    };
  }

  calculateTimeoutImprovements(scenarioResults) {
    // Count how many scenarios had optimal timeout usage
    return scenarioResults.filter(r => 
      r.success && r.latency < r.dynamic_timeout_used * 0.8
    ).length;
  }

  async analyzeResults() {
    console.log('\\n📊 Analyzing Results...');
    
    // Quality Analysis
    this.results.quality_analysis = this.analyzeQuality();
    
    // Efficiency Analysis  
    this.results.efficiency_analysis = this.analyzeEfficiency();
    
    // System Performance
    this.results.system_performance = this.analyzeSystemPerformance();
    
    // Overall Score
    this.results.overall_score = this.calculateOverallScore();
  }

  analyzeQuality() {
    const allScenarios = this.results.iteration_results.flatMap(ir => ir.scenario_results);
    const successfulScenarios = allScenarios.filter(s => s.success);
    
    if (successfulScenarios.length === 0) return { average: 0, distribution: {}, trends: {} };
    
    const qualityScores = successfulScenarios.map(s => s.quality_score);
    const avgQuality = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
    
    // Quality distribution
    const distribution = {
      excellent: qualityScores.filter(s => s >= 8).length,
      good: qualityScores.filter(s => s >= 6 && s < 8).length,
      fair: qualityScores.filter(s => s >= 4 && s < 6).length,
      poor: qualityScores.filter(s => s < 4).length
    };
    
    // Quality trends across iterations
    const iterationAverages = this.results.iteration_results.map(ir => ir.iteration_metrics.avg_quality_score);
    const trend = this.calculateTrend(iterationAverages);
    
    return {
      average: avgQuality,
      min: Math.min(...qualityScores),
      max: Math.max(...qualityScores),
      distribution,
      trend,
      consistency: this.calculateConsistency(qualityScores)
    };
  }

  analyzeEfficiency() {
    const allScenarios = this.results.iteration_results.flatMap(ir => ir.scenario_results);
    const successfulScenarios = allScenarios.filter(s => s.success);
    
    if (successfulScenarios.length === 0) return { average: 0, latency: {}, throughput: {} };
    
    const efficiencyScores = successfulScenarios.map(s => s.efficiency_score);
    const latencies = successfulScenarios.map(s => s.latency);
    
    return {
      average: efficiencyScores.reduce((sum, score) => sum + score, 0) / efficiencyScores.length,
      latency: {
        average: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
        min: Math.min(...latencies),
        max: Math.max(...latencies),
        p95: this.calculatePercentile(latencies, 0.95)
      },
      throughput: {
        requests_per_second: 1000 / (latencies.reduce((sum, l) => sum + l, 0) / latencies.length),
        total_processed: successfulScenarios.length
      },
      timeout_effectiveness: successfulScenarios.filter(s => s.latency < s.dynamic_timeout_used * 0.8).length / successfulScenarios.length
    };
  }

  analyzeSystemPerformance() {
    const totalRequests = this.results.iteration_results.reduce((sum, ir) => sum + ir.scenario_results.length, 0);
    const successfulRequests = this.results.iteration_results.reduce((sum, ir) => sum + ir.scenario_results.filter(s => s.success).length, 0);
    const totalLatency = this.results.iteration_results.reduce((sum, ir) => sum + ir.iteration_metrics.total_duration, 0);
    
    return {
      total_requests: totalRequests,
      successful_requests: successfulRequests,
      success_rate: successfulRequests / totalRequests,
      total_test_duration: totalLatency,
      avg_iteration_duration: totalLatency / this.results.iteration_results.length,
      system_reliability: this.calculateSystemReliability(),
      performance_stability: this.calculatePerformanceStability()
    };
  }

  calculateOverallScore() {
    const qualityWeight = 0.4;
    const efficiencyWeight = 0.3;
    const reliabilityWeight = 0.3;
    
    const qualityScore = this.results.quality_analysis.average || 0;
    const efficiencyScore = this.results.efficiency_analysis.average || 0;
    const reliabilityScore = (this.results.system_performance.success_rate || 0) * 10;
    
    return (qualityScore * qualityWeight) + (efficiencyScore * efficiencyWeight) + (reliabilityScore * reliabilityWeight);
  }

  calculateTrend(values) {
    if (values.length < 2) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;
    
    const change = (secondAvg - firstAvg) / firstAvg;
    
    if (change > 0.1) return 'improving';
    if (change < -0.1) return 'degrading';
    return 'stable';
  }

  calculateConsistency(values) {
    if (values.length < 2) return 1;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Consistency score: lower standard deviation = higher consistency
    return Math.max(0, 1 - (stdDev / mean));
  }

  calculatePercentile(values, percentile) {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = percentile * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    
    if (upper >= sorted.length) return sorted[sorted.length - 1];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  calculateSystemReliability() {
    const iterationReliabilities = this.results.iteration_results.map(ir => ir.iteration_metrics.success_rate);
    return iterationReliabilities.reduce((sum, r) => sum + r, 0) / iterationReliabilities.length;
  }

  calculatePerformanceStability() {
    const iterationLatencies = this.results.iteration_results.map(ir => ir.iteration_metrics.avg_latency);
    return this.calculateConsistency(iterationLatencies);
  }

  generateComprehensiveReport() {
    console.log('\\n📋 Comprehensive Claudette Suite Benchmark Report');
    console.log('=' .repeat(70));
    
    console.log(`\\n🎯 Overall Score: ${this.results.overall_score.toFixed(1)}/10`);
    
    const scoreLevel = this.results.overall_score >= 8 ? 'EXCELLENT' : 
                     this.results.overall_score >= 6 ? 'GOOD' :
                     this.results.overall_score >= 4 ? 'FAIR' : 'POOR';
    console.log(`🏆 Performance Level: ${scoreLevel}`);
    
    console.log('\\n📊 Quality Analysis:');
    console.log(`   Average Quality: ${this.results.quality_analysis.average?.toFixed(1)}/10`);
    console.log(`   Quality Range: ${this.results.quality_analysis.min?.toFixed(1)} - ${this.results.quality_analysis.max?.toFixed(1)}`);
    console.log(`   Quality Trend: ${this.results.quality_analysis.trend}`);
    console.log(`   Consistency: ${(this.results.quality_analysis.consistency * 100)?.toFixed(1)}%`);
    
    console.log('\\n⚡ Efficiency Analysis:');
    console.log(`   Average Efficiency: ${this.results.efficiency_analysis.average?.toFixed(1)}/10`);
    console.log(`   Average Latency: ${Math.round(this.results.efficiency_analysis.latency?.average)}ms`);
    console.log(`   P95 Latency: ${Math.round(this.results.efficiency_analysis.latency?.p95)}ms`);
    console.log(`   Throughput: ${this.results.efficiency_analysis.throughput?.requests_per_second?.toFixed(1)} req/s`);
    console.log(`   Timeout Effectiveness: ${(this.results.efficiency_analysis.timeout_effectiveness * 100)?.toFixed(1)}%`);
    
    console.log('\\n🔧 System Performance:');
    console.log(`   Success Rate: ${(this.results.system_performance.success_rate * 100)?.toFixed(1)}%`);
    console.log(`   Total Requests: ${this.results.system_performance.total_requests}`);
    console.log(`   System Reliability: ${(this.results.system_performance.system_reliability * 100)?.toFixed(1)}%`);
    console.log(`   Performance Stability: ${(this.results.system_performance.performance_stability * 100)?.toFixed(1)}%`);
    
    console.log('\\n📈 Quality Distribution:');
    const dist = this.results.quality_analysis.distribution;
    if (dist) {
      console.log(`   Excellent (8-10): ${dist.excellent} responses`);
      console.log(`   Good (6-8): ${dist.good} responses`);
      console.log(`   Fair (4-6): ${dist.fair} responses`);
      console.log(`   Poor (0-4): ${dist.poor} responses`);
    }
    
    console.log('\\n🎯 Key Insights:');
    console.log(`   • Dynamic timeouts optimized ${Math.round(this.results.efficiency_analysis.timeout_effectiveness * 100)}% of requests`);
    console.log(`   • Quality ${this.results.quality_analysis.trend} across iterations`);
    console.log(`   • System maintained ${Math.round(this.results.system_performance.system_reliability * 100)}% reliability`);
    console.log(`   • Performance consistency: ${Math.round(this.results.system_performance.performance_stability * 100)}%`);
    
    // Save detailed results
    const fs = require('fs');
    fs.writeFileSync('comprehensive-claudette-benchmark-results.json', JSON.stringify(this.results, null, 2));
    console.log('\\n💾 Detailed results saved to: comprehensive-claudette-benchmark-results.json');
  }
}

// Run benchmark if called directly
async function main() {
  const benchmark = new ComprehensiveClaudetteBenchmark();
  await benchmark.runComprehensiveBenchmark();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ComprehensiveClaudetteBenchmark };