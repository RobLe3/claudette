#!/usr/bin/env node

/**
 * Comprehensive Multi-Iteration Claudette Benchmark Suite
 * Tests performance, quality, and efficiency across multiple scenarios and iterations
 */

// Load environment variables for API backends
require('dotenv').config();

const { Claudette } = require('./dist/index.js');
const fs = require('fs');

class ComprehensiveClaudetteBenchmark {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      benchmark_config: {
        iterations: 10,
        scenarios: 8,
        quality_scoring: true,
        efficiency_analysis: true
      },
      iterations: [],
      aggregate_metrics: {},
      quality_analysis: {},
      efficiency_metrics: {},
      trend_analysis: {}
    };
    
    this.testScenarios = [
      {
        name: 'Simple Query',
        prompt: 'What is 2+2? Please respond with just the number.',
        expected_keywords: ['4', 'four'],
        complexity: 'low',
        expected_length_range: [1, 50],
        quality_criteria: {
          accuracy: 0.4,      // 40% - correct answer
          conciseness: 0.3,   // 30% - brief response  
          relevance: 0.3      // 30% - stays on topic
        }
      },
      {
        name: 'Code Analysis',
        prompt: 'Explain this JavaScript function: function fibonacci(n) { return n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2); }',
        expected_keywords: ['fibonacci', 'recursive', 'sequence', 'base case'],
        complexity: 'medium',
        expected_length_range: [100, 500],
        quality_criteria: {
          technical_accuracy: 0.4,  // 40% - correct explanation
          completeness: 0.3,        // 30% - covers key concepts
          clarity: 0.3              // 30% - clear explanation
        }
      },
      {
        name: 'Problem Solving',
        prompt: 'How would you design a scalable chat application architecture? Provide key components and considerations.',
        expected_keywords: ['websocket', 'database', 'scaling', 'real-time', 'authentication'],
        complexity: 'high',
        expected_length_range: [300, 1000],
        quality_criteria: {
          architectural_thinking: 0.4, // 40% - system design concepts
          scalability_awareness: 0.3,  // 30% - scaling considerations
          technical_depth: 0.3         // 30% - implementation details
        }
      },
      {
        name: 'Creative Writing',
        prompt: 'Write a short story about a robot learning to paint, in exactly 100 words.',
        expected_keywords: ['robot', 'paint', 'learn', 'art'],
        complexity: 'medium',
        expected_length_range: [80, 120],
        quality_criteria: {
          creativity: 0.4,      // 40% - original and imaginative
          word_count_accuracy: 0.3, // 30% - close to 100 words
          narrative_structure: 0.3  // 30% - coherent story
        }
      },
      {
        name: 'Data Analysis',
        prompt: 'Given sales data: Q1: $100k, Q2: $120k, Q3: $110k, Q4: $140k. Analyze trends and provide insights.',
        expected_keywords: ['trend', 'growth', 'seasonal', 'increase', 'analysis'],
        complexity: 'medium',
        expected_length_range: [150, 400],
        quality_criteria: {
          data_interpretation: 0.4, // 40% - correct analysis
          insight_quality: 0.3,     // 30% - meaningful insights
          quantitative_reasoning: 0.3 // 30% - numerical understanding
        }
      },
      {
        name: 'Technical Documentation',
        prompt: 'Write API documentation for a function: getUserProfile(userId). Include parameters, return values, and examples.',
        expected_keywords: ['parameter', 'return', 'example', 'userId', 'profile'],
        complexity: 'medium',
        expected_length_range: [200, 600],
        quality_criteria: {
          documentation_structure: 0.4, // 40% - proper doc format
          completeness: 0.3,            // 30% - all required sections
          example_quality: 0.3          // 30% - useful examples
        }
      },
      {
        name: 'Reasoning Challenge',
        prompt: 'If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?',
        expected_keywords: ['5 minutes', 'same time', 'parallel', 'rate'],
        complexity: 'high',
        expected_length_range: [50, 200],
        quality_criteria: {
          logical_reasoning: 0.5,   // 50% - correct logic
          explanation_clarity: 0.3, // 30% - clear explanation
          answer_accuracy: 0.2      // 20% - correct final answer
        }
      },
      {
        name: 'System Integration',
        prompt: 'Describe how to integrate a payment gateway into an e-commerce platform. Include security considerations.',
        expected_keywords: ['API', 'security', 'token', 'webhook', 'SSL', 'PCI'],
        complexity: 'high',
        expected_length_range: [400, 800],
        quality_criteria: {
          technical_completeness: 0.4, // 40% - covers key aspects
          security_awareness: 0.3,     // 30% - security considerations
          implementation_detail: 0.3   // 30% - practical guidance
        }
      }
    ];
  }

  async runComprehensiveBenchmark() {
    console.log('🚀 Comprehensive Multi-Iteration Claudette Benchmark Suite');
    console.log('=' .repeat(70));
    console.log(`Testing ${this.testScenarios.length} scenarios across ${this.results.benchmark_config.iterations} iterations...`);
    console.log(`Total queries: ${this.testScenarios.length * this.results.benchmark_config.iterations}`);
    console.log();

    try {
      // Initialize benchmark
      await this.initializeBenchmark();
      
      // Run multiple iterations
      for (let iteration = 1; iteration <= this.results.benchmark_config.iterations; iteration++) {
        console.log(`\n🔄 Iteration ${iteration}/${this.results.benchmark_config.iterations}`);
        console.log('-'.repeat(50));
        
        const iterationResult = await this.runSingleIteration(iteration);
        this.results.iterations.push(iterationResult);
        
        // Show iteration summary
        console.log(`   ✅ Iteration ${iteration} Complete:`);
        console.log(`      Success Rate: ${(iterationResult.metrics.success_rate * 100).toFixed(1)}%`);
        console.log(`      Avg Latency: ${iterationResult.metrics.avg_latency}ms`);
        console.log(`      Avg Quality: ${iterationResult.metrics.avg_quality_score.toFixed(2)}/10`);
        console.log(`      Avg Efficiency: ${iterationResult.metrics.avg_efficiency_score.toFixed(2)}/10`);
      }
      
      // Analyze results
      await this.analyzeAggregateMetrics();
      await this.analyzeQualityTrends();
      await this.analyzeEfficiencyMetrics();
      await this.analyzeTrendPatterns();
      
      // Generate comprehensive report
      this.generateBenchmarkReport();
      
    } catch (error) {
      console.log('❌ Benchmark failed:', error.message);
    }
  }

  async initializeBenchmark() {
    console.log('🔧 Initializing benchmark environment...');
    
    // Test Claudette initialization
    const claudette = new Claudette();
    try {
      await claudette.initialize();
      const config = claudette.getConfig();
      
      this.results.environment = {
        claudette_version: '3.0.0',
        backends_configured: Object.keys(config.backends || {}).length,
        backends_enabled: Object.values(config.backends || {}).filter(b => b.enabled).length,
        initialization_time: Date.now()
      };
      
      console.log(`   📊 Environment: ${this.results.environment.backends_enabled}/${this.results.environment.backends_configured} backends enabled`);
      
      await claudette.cleanup();
    } catch (error) {
      console.log(`   ⚠️  Initialization warning: ${error.message}`);
    }
  }

  async runSingleIteration(iteration) {
    const iterationStart = Date.now();
    const iterationResult = {
      iteration,
      timestamp: new Date().toISOString(),
      scenarios: [],
      metrics: {
        total_queries: 0,
        successful_queries: 0,
        success_rate: 0,
        avg_latency: 0,
        avg_quality_score: 0,
        avg_efficiency_score: 0,
        total_cost: 0
      }
    };

    // Run each scenario in the iteration
    for (const scenario of this.testScenarios) {
      try {
        const scenarioResult = await this.runScenario(scenario, iteration);
        iterationResult.scenarios.push(scenarioResult);
        
        // Update iteration metrics
        iterationResult.metrics.total_queries++;
        if (scenarioResult.success) {
          iterationResult.metrics.successful_queries++;
        }
        
      } catch (error) {
        console.log(`   ❌ Scenario "${scenario.name}" failed: ${error.message}`);
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
    const successfulScenarios = iterationResult.scenarios.filter(s => s.success);
    
    iterationResult.metrics.success_rate = successfulScenarios.length / iterationResult.scenarios.length;
    iterationResult.metrics.avg_latency = successfulScenarios.length > 0 ? 
      Math.round(successfulScenarios.reduce((sum, s) => sum + s.latency, 0) / successfulScenarios.length) : 0;
    iterationResult.metrics.avg_quality_score = successfulScenarios.length > 0 ?
      successfulScenarios.reduce((sum, s) => sum + s.quality_score, 0) / successfulScenarios.length : 0;
    iterationResult.metrics.avg_efficiency_score = successfulScenarios.length > 0 ?
      successfulScenarios.reduce((sum, s) => sum + s.efficiency_score, 0) / successfulScenarios.length : 0;
    iterationResult.metrics.total_cost = successfulScenarios.reduce((sum, s) => sum + (s.cost || 0), 0);

    return iterationResult;
  }

  async runScenario(scenario, iteration) {
    const scenarioStart = Date.now();
    
    const claudette = new Claudette();
    
    try {
      await claudette.initialize();
      
      // Execute query
      const queryStart = Date.now();
      const response = await claudette.optimize(scenario.prompt);
      const queryLatency = Date.now() - queryStart;
      
      // Calculate quality score
      const qualityScore = this.calculateQualityScore(scenario, response);
      
      // Calculate efficiency score
      const efficiencyScore = this.calculateEfficiencyScore(scenario, response, queryLatency);
      
      return {
        scenario: scenario.name,
        success: true,
        latency: queryLatency,
        response_length: response.content?.length || 0,
        backend_used: response.backend_used,
        cost: response.cost || 0,
        quality_score: qualityScore,
        efficiency_score: efficiencyScore,
        response_preview: response.content ? response.content.substring(0, 100) + '...' : 'No content',
        complexity: scenario.complexity,
        iteration: iteration
      };
      
    } finally {
      await claudette.cleanup();
    }
  }

  calculateQualityScore(scenario, response) {
    if (!response.content) return 0;
    
    const content = response.content.toLowerCase();
    let qualityScore = 0;
    
    // Check for expected keywords (baseline quality)
    const keywordMatches = scenario.expected_keywords.filter(keyword => 
      content.includes(keyword.toLowerCase())
    ).length;
    const keywordScore = (keywordMatches / scenario.expected_keywords.length) * 3; // 0-3 points
    
    // Check length appropriateness (1 point)
    const responseLength = response.content.length;
    const lengthScore = (responseLength >= scenario.expected_length_range[0] && 
                       responseLength <= scenario.expected_length_range[1]) ? 1 : 0;
    
    // Check complexity handling (scenario-specific scoring)
    let complexityScore = 0;
    switch (scenario.complexity) {
      case 'low':
        complexityScore = content.length < 200 ? 2 : 1; // Reward conciseness for simple queries
        break;
      case 'medium':
        complexityScore = content.length >= 100 && content.length <= 600 ? 2 : 1;
        break;
      case 'high':
        complexityScore = content.length >= 200 ? 2 : 1; // Reward thoroughness for complex queries
        break;
    }
    
    // Content structure and coherence (subjective - basic heuristics)
    let coherenceScore = 1; // Base score
    if (content.includes('.') || content.includes('!') || content.includes('?')) coherenceScore += 0.5; // Has punctuation
    if (content.split(' ').length >= 10) coherenceScore += 0.5; // Substantial content
    if (content.includes('\n') || content.includes('  ')) coherenceScore += 0.5; // Formatted content
    coherenceScore = Math.min(2, coherenceScore); // Cap at 2 points
    
    qualityScore = keywordScore + lengthScore + complexityScore + coherenceScore;
    
    return Math.min(10, Math.max(0, qualityScore));
  }

  calculateEfficiencyScore(scenario, response, latency) {
    let efficiencyScore = 5; // Base efficiency
    
    // Latency efficiency (0-3 points)
    if (latency < 1000) efficiencyScore += 3;      // Excellent: < 1s
    else if (latency < 3000) efficiencyScore += 2; // Good: 1-3s
    else if (latency < 5000) efficiencyScore += 1; // Fair: 3-5s
    // Poor: > 5s gets no bonus points
    
    // Cost efficiency (0-2 points)
    const cost = response.cost || 0;
    if (cost === 0) efficiencyScore += 2;      // Free (mock backend)
    else if (cost < 0.01) efficiencyScore += 2; // Very cheap
    else if (cost < 0.05) efficiencyScore += 1; // Reasonable
    // Expensive gets no bonus points
    
    // Backend routing efficiency (0-1 point)
    if (response.backend_used && response.backend_used !== 'undefined') {
      efficiencyScore += 1; // Successfully routed to a backend
    }
    
    return Math.min(10, Math.max(0, efficiencyScore));
  }

  async analyzeAggregateMetrics() {
    console.log('\n📊 Analyzing aggregate metrics...');
    
    const allScenarios = this.results.iterations.flatMap(iter => iter.scenarios);
    const successfulScenarios = allScenarios.filter(s => s.success);
    
    this.results.aggregate_metrics = {
      total_scenarios_executed: allScenarios.length,
      successful_scenarios: successfulScenarios.length,
      overall_success_rate: successfulScenarios.length / allScenarios.length,
      
      performance_metrics: {
        avg_latency: successfulScenarios.length > 0 ? 
          Math.round(successfulScenarios.reduce((sum, s) => sum + s.latency, 0) / successfulScenarios.length) : 0,
        min_latency: successfulScenarios.length > 0 ? 
          Math.min(...successfulScenarios.map(s => s.latency)) : 0,
        max_latency: successfulScenarios.length > 0 ? 
          Math.max(...successfulScenarios.map(s => s.latency)) : 0,
        latency_std_dev: this.calculateStandardDeviation(successfulScenarios.map(s => s.latency))
      },
      
      quality_metrics: {
        avg_quality_score: successfulScenarios.length > 0 ?
          successfulScenarios.reduce((sum, s) => sum + s.quality_score, 0) / successfulScenarios.length : 0,
        min_quality_score: successfulScenarios.length > 0 ?
          Math.min(...successfulScenarios.map(s => s.quality_score)) : 0,
        max_quality_score: successfulScenarios.length > 0 ?
          Math.max(...successfulScenarios.map(s => s.quality_score)) : 0,
        quality_std_dev: this.calculateStandardDeviation(successfulScenarios.map(s => s.quality_score))
      },
      
      efficiency_metrics: {
        avg_efficiency_score: successfulScenarios.length > 0 ?
          successfulScenarios.reduce((sum, s) => sum + s.efficiency_score, 0) / successfulScenarios.length : 0,
        total_cost: successfulScenarios.reduce((sum, s) => sum + (s.cost || 0), 0),
        cost_per_query: successfulScenarios.length > 0 ?
          successfulScenarios.reduce((sum, s) => sum + (s.cost || 0), 0) / successfulScenarios.length : 0
      }
    };
  }

  async analyzeQualityTrends() {
    console.log('📈 Analyzing quality trends...');
    
    // Quality by scenario complexity
    const qualityByComplexity = {};
    const allScenarios = this.results.iterations.flatMap(iter => iter.scenarios);
    
    ['low', 'medium', 'high'].forEach(complexity => {
      const complexityScenarios = allScenarios.filter(s => s.complexity === complexity && s.success);
      qualityByComplexity[complexity] = {
        count: complexityScenarios.length,
        avg_quality: complexityScenarios.length > 0 ?
          complexityScenarios.reduce((sum, s) => sum + s.quality_score, 0) / complexityScenarios.length : 0,
        avg_latency: complexityScenarios.length > 0 ?
          complexityScenarios.reduce((sum, s) => sum + s.latency, 0) / complexityScenarios.length : 0
      };
    });
    
    // Quality progression over iterations
    const qualityProgression = this.results.iterations.map(iter => ({
      iteration: iter.iteration,
      avg_quality: iter.metrics.avg_quality_score,
      avg_latency: iter.metrics.avg_latency,
      success_rate: iter.metrics.success_rate
    }));
    
    this.results.quality_analysis = {
      quality_by_complexity: qualityByComplexity,
      quality_progression: qualityProgression,
      quality_consistency: this.calculateStandardDeviation(this.results.iterations.map(i => i.metrics.avg_quality_score))
    };
  }

  async analyzeEfficiencyMetrics() {
    console.log('⚡ Analyzing efficiency patterns...');
    
    const allScenarios = this.results.iterations.flatMap(iter => iter.scenarios.filter(s => s.success));
    
    // Backend usage analysis
    const backendUsage = {};
    allScenarios.forEach(scenario => {
      const backend = scenario.backend_used || 'unknown';
      if (!backendUsage[backend]) {
        backendUsage[backend] = {
          count: 0,
          avg_latency: 0,
          avg_quality: 0,
          total_cost: 0
        };
      }
      backendUsage[backend].count++;
      backendUsage[backend].avg_latency += scenario.latency;
      backendUsage[backend].avg_quality += scenario.quality_score;
      backendUsage[backend].total_cost += (scenario.cost || 0);
    });
    
    // Calculate averages for backend usage
    Object.keys(backendUsage).forEach(backend => {
      const usage = backendUsage[backend];
      usage.avg_latency = Math.round(usage.avg_latency / usage.count);
      usage.avg_quality = usage.avg_quality / usage.count;
    });
    
    // Efficiency distribution
    const efficiencyDistribution = {
      excellent: allScenarios.filter(s => s.efficiency_score >= 8).length,
      good: allScenarios.filter(s => s.efficiency_score >= 6 && s.efficiency_score < 8).length,
      fair: allScenarios.filter(s => s.efficiency_score >= 4 && s.efficiency_score < 6).length,
      poor: allScenarios.filter(s => s.efficiency_score < 4).length
    };
    
    this.results.efficiency_metrics = {
      backend_usage_analysis: backendUsage,
      efficiency_distribution: efficiencyDistribution,
      cost_analysis: {
        total_cost: allScenarios.reduce((sum, s) => sum + (s.cost || 0), 0),
        avg_cost_per_query: allScenarios.reduce((sum, s) => sum + (s.cost || 0), 0) / allScenarios.length,
        cost_efficiency_ratio: this.results.aggregate_metrics.quality_metrics.avg_quality_score / 
                              (allScenarios.reduce((sum, s) => sum + (s.cost || 0), 0) / allScenarios.length || 0.001)
      }
    };
  }

  async analyzeTrendPatterns() {
    console.log('📊 Analyzing trend patterns...');
    
    const iterations = this.results.iterations;
    
    // Calculate trends using linear regression (simplified)
    const qualityTrend = this.calculateTrend(iterations.map((iter, i) => [i + 1, iter.metrics.avg_quality_score]));
    const latencyTrend = this.calculateTrend(iterations.map((iter, i) => [i + 1, iter.metrics.avg_latency]));
    const efficiencyTrend = this.calculateTrend(iterations.map((iter, i) => [i + 1, iter.metrics.avg_efficiency_score]));
    
    this.results.trend_analysis = {
      quality_trend: {
        direction: qualityTrend > 0.01 ? 'improving' : qualityTrend < -0.01 ? 'declining' : 'stable',
        slope: qualityTrend,
        stability: this.calculateStandardDeviation(iterations.map(i => i.metrics.avg_quality_score)) < 0.5 ? 'high' : 'moderate'
      },
      latency_trend: {
        direction: latencyTrend > 5 ? 'increasing' : latencyTrend < -5 ? 'decreasing' : 'stable',
        slope: latencyTrend,
        stability: this.calculateStandardDeviation(iterations.map(i => i.metrics.avg_latency)) < 50 ? 'high' : 'moderate'
      },
      efficiency_trend: {
        direction: efficiencyTrend > 0.01 ? 'improving' : efficiencyTrend < -0.01 ? 'declining' : 'stable',
        slope: efficiencyTrend,
        stability: this.calculateStandardDeviation(iterations.map(i => i.metrics.avg_efficiency_score)) < 0.5 ? 'high' : 'moderate'
      }
    };
  }

  calculateStandardDeviation(values) {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    
    return Math.sqrt(avgSquaredDiff);
  }

  calculateTrend(points) {
    // Simple linear regression slope calculation
    if (points.length < 2) return 0;
    
    const n = points.length;
    const sumX = points.reduce((sum, point) => sum + point[0], 0);
    const sumY = points.reduce((sum, point) => sum + point[1], 0);
    const sumXY = points.reduce((sum, point) => sum + (point[0] * point[1]), 0);
    const sumXX = points.reduce((sum, point) => sum + (point[0] * point[0]), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope || 0;
  }

  generateBenchmarkReport() {
    console.log('\n📋 Comprehensive Multi-Iteration Benchmark Report');
    console.log('=' .repeat(80));
    
    const agg = this.results.aggregate_metrics;
    const qual = this.results.quality_analysis;
    const eff = this.results.efficiency_metrics;
    const trends = this.results.trend_analysis;
    
    console.log(`\n🎯 Executive Summary:`);
    console.log(`   Total Scenarios: ${agg.total_scenarios_executed} (across ${this.results.iterations.length} iterations)`);
    console.log(`   Overall Success Rate: ${(agg.overall_success_rate * 100).toFixed(1)}%`);
    console.log(`   Average Quality Score: ${agg.quality_metrics.avg_quality_score.toFixed(2)}/10`);
    console.log(`   Average Efficiency Score: ${agg.efficiency_metrics.avg_efficiency_score.toFixed(2)}/10`);
    console.log(`   Average Latency: ${agg.performance_metrics.avg_latency}ms`);
    
    console.log(`\n⚡ Performance Analysis:`);
    console.log(`   Latency Range: ${agg.performance_metrics.min_latency}ms - ${agg.performance_metrics.max_latency}ms`);
    console.log(`   Latency Consistency: ${agg.performance_metrics.latency_std_dev.toFixed(1)}ms std dev`);
    console.log(`   Performance Trend: ${trends.latency_trend.direction} (${trends.latency_trend.stability} stability)`);
    
    console.log(`\n📊 Quality Analysis:`);
    console.log(`   Quality Range: ${agg.quality_metrics.min_quality_score.toFixed(1)} - ${agg.quality_metrics.max_quality_score.toFixed(1)}`);
    console.log(`   Quality Consistency: ${agg.quality_metrics.quality_std_dev.toFixed(2)} std dev`);
    console.log(`   Quality Trend: ${trends.quality_trend.direction} (${trends.quality_trend.stability} stability)`);
    
    console.log(`\n🎯 Quality by Complexity:`);
    Object.entries(qual.quality_by_complexity).forEach(([complexity, metrics]) => {
      console.log(`   ${complexity.toUpperCase()}: ${metrics.avg_quality.toFixed(2)}/10 quality, ${metrics.avg_latency}ms latency (${metrics.count} scenarios)`);
    });
    
    console.log(`\n💰 Cost & Efficiency:`);
    console.log(`   Total Cost: €${eff.cost_analysis.total_cost.toFixed(4)}`);
    console.log(`   Cost per Query: €${eff.cost_analysis.avg_cost_per_query.toFixed(4)}`);
    console.log(`   Efficiency Trend: ${trends.efficiency_trend.direction} (${trends.efficiency_trend.stability} stability)`);
    
    console.log(`\n🔧 Backend Performance:`);
    Object.entries(eff.backend_usage_analysis).forEach(([backend, stats]) => {
      const percentage = ((stats.count / agg.successful_scenarios) * 100).toFixed(1);
      console.log(`   ${backend}: ${stats.count} queries (${percentage}%), ${stats.avg_latency}ms avg, ${stats.avg_quality.toFixed(2)}/10 quality`);
    });
    
    console.log(`\n📈 Efficiency Distribution:`);
    const effDist = eff.efficiency_distribution;
    const total = effDist.excellent + effDist.good + effDist.fair + effDist.poor;
    console.log(`   Excellent (8-10): ${effDist.excellent} (${((effDist.excellent/total)*100).toFixed(1)}%)`);
    console.log(`   Good (6-8):       ${effDist.good} (${((effDist.good/total)*100).toFixed(1)}%)`);
    console.log(`   Fair (4-6):       ${effDist.fair} (${((effDist.fair/total)*100).toFixed(1)}%)`);
    console.log(`   Poor (0-4):       ${effDist.poor} (${((effDist.poor/total)*100).toFixed(1)}%)`);
    
    console.log(`\n📊 Iteration Performance Progression:`);
    this.results.iterations.forEach(iter => {
      console.log(`   Iteration ${iter.iteration}: ${(iter.metrics.success_rate * 100).toFixed(1)}% success, ` +
                 `${iter.metrics.avg_latency}ms latency, ${iter.metrics.avg_quality_score.toFixed(2)}/10 quality`);
    });
    
    // Overall assessment
    const overallScore = (agg.overall_success_rate * 0.2 + 
                         (agg.quality_metrics.avg_quality_score / 10) * 0.4 +
                         (agg.efficiency_metrics.avg_efficiency_score / 10) * 0.4) * 100;
    
    console.log(`\n🏆 Overall Benchmark Score: ${overallScore.toFixed(1)}/100`);
    
    if (overallScore >= 85) console.log(`   Assessment: EXCELLENT - Production ready with exceptional performance`);
    else if (overallScore >= 70) console.log(`   Assessment: GOOD - Production ready with solid performance`);
    else if (overallScore >= 55) console.log(`   Assessment: FAIR - Ready for staging with some optimization needed`);
    else console.log(`   Assessment: POOR - Requires significant improvements before deployment`);
    
    // Save detailed results
    fs.writeFileSync('comprehensive-benchmark-results.json', JSON.stringify(this.results, null, 2));
    console.log('\n💾 Detailed benchmark results saved to: comprehensive-benchmark-results.json');
  }
}

// Run comprehensive benchmark
async function main() {
  const benchmark = new ComprehensiveClaudetteBenchmark();
  await benchmark.runComprehensiveBenchmark();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ComprehensiveClaudetteBenchmark };