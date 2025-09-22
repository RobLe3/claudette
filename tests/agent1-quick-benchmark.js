#!/usr/bin/env node

/**
 * Agent 1 Quick Core Benchmark - Fast testing with Mock Backend
 * Uses Claudette's optimize() function to test itself recursively with timeout protection
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Import Claudette
const { Claudette, optimize } = require('./dist/index.js');

class Agent1QuickBenchmark {
  constructor() {
    this.results = {
      metadata: {
        version: '3.0.0',
        agent: 'Agent 1 - Quick Core Benchmark',
        timestamp: new Date().toISOString(),
        node_version: process.version,
        environment: process.env.NODE_ENV || 'test',
        test_mode: 'quick'
      },
      configuration: {},
      performance_metrics: {
        latency_tests: [],
        throughput_tests: [],
        cost_analysis: {},
        concurrent_load: {}
      },
      feature_tests: {
        caching: {},
        routing: {},
        compression: {},
        recursive_optimize: {}
      },
      bugs_found: [],
      system_health: {},
      recommendations: []
    };
    
    this.claudette = new Claudette();
    this.startTime = performance.now();
    this.requestTimeout = 5000; // 5 second timeout
  }

  async run() {
    console.log('🚀 Starting Agent 1 Quick Core Benchmark...\n');
    
    try {
      // Initialize Claudette
      console.log('📋 Initializing Claudette...');
      await this.claudette.initialize();
      
      // Capture configuration
      await this.captureConfiguration();
      
      // Run quick test suite
      await this.runQuickLatencyTests();
      await this.runQuickCachingTests();
      await this.runQuickThroughputTests();
      await this.runRecursiveOptimizeTests();
      await this.runSystemHealthCheck();
      
      // Generate report
      await this.generateQuickReport();
      
    } catch (error) {
      this.results.bugs_found.push({
        type: 'CRITICAL_ERROR',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      console.error('💥 Critical error during benchmark:', error);
    }
    
    console.log('\n✅ Quick benchmark completed. Report saved to agent1-core-benchmark-report.json');
  }

  async captureConfiguration() {
    console.log('📊 Capturing system configuration...');
    
    try {
      const status = await this.claudette.getStatus();
      this.results.configuration = {
        claudette_config: this.claudette.getConfig(),
        system_status: status,
        environment_variables: {
          openai_configured: !!process.env.OPENAI_API_KEY,
          flexcon_configured: !!process.env.FLEXCON_API_URL,
          ultipa_configured: !!process.env.ULTIPA_ENDPOINT,
          node_env: process.env.NODE_ENV
        }
      };
    } catch (error) {
      this.results.bugs_found.push({
        type: 'CONFIGURATION_ERROR',
        message: `Failed to capture configuration: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  async runQuickLatencyTests() {
    console.log('⚡ Running quick latency tests...');
    
    const testQueries = [
      'What is 2+2?',
      'Explain AI briefly',
      'Hello world'
    ];
    
    const results = [];
    
    for (let i = 0; i < testQueries.length; i++) {
      const query = testQueries[i];
      console.log(`  Testing query ${i+1}: "${query}"`);
      
      try {
        const startTime = performance.now();
        const response = await this.optimizeWithTimeout(query, [], { bypass_cache: true });
        const endTime = performance.now();
        const latency = endTime - startTime;
        
        results.push({
          query_index: i,
          query: query,
          latency_ms: latency,
          backend_used: response.backend_used,
          tokens_input: response.tokens_input || 0,
          tokens_output: response.tokens_output || 0,
          cost_eur: response.cost_eur || 0,
          response_length: response.content.length
        });
        
        console.log(`    ✅ ${latency.toFixed(2)}ms (${response.backend_used})`);
        
      } catch (error) {
        console.log(`    ❌ FAILED: ${error.message}`);
        this.results.bugs_found.push({
          type: 'LATENCY_TEST_ERROR',
          query_index: i,
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      await this.sleep(100);
    }
    
    if (results.length > 0) {
      const latencies = results.map(r => r.latency_ms);
      this.results.performance_metrics.latency_tests = {
        test_count: results.length,
        min_ms: Math.min(...latencies),
        max_ms: Math.max(...latencies),
        avg_ms: latencies.reduce((a, b) => a + b, 0) / latencies.length,
        median_ms: this.calculateMedian(latencies),
        detailed_results: results
      };
    }
  }

  async runQuickCachingTests() {
    console.log('🗄️ Running quick caching tests...');
    
    const testQuery = 'What is caching?';
    
    try {
      console.log('  Testing cache miss...');
      const startTime1 = performance.now();
      const response1 = await this.optimizeWithTimeout(testQuery, []);
      const endTime1 = performance.now();
      const firstLatency = endTime1 - startTime1;
      
      console.log(`    First request: ${firstLatency.toFixed(2)}ms (${response1.backend_used})`);
      
      // Wait a moment then test cache hit
      await this.sleep(200);
      
      console.log('  Testing cache hit...');
      const startTime2 = performance.now();
      const response2 = await this.optimizeWithTimeout(testQuery, []);
      const endTime2 = performance.now();
      const secondLatency = endTime2 - startTime2;
      
      console.log(`    Second request: ${secondLatency.toFixed(2)}ms (cache hit: ${response2.cache_hit})`);
      
      this.results.feature_tests.caching = {
        first_request_ms: firstLatency,
        second_request_ms: secondLatency,
        cache_hit: response2.cache_hit || false,
        speedup_ratio: firstLatency / secondLatency,
        cache_effectiveness: (firstLatency - secondLatency) / firstLatency
      };
      
    } catch (error) {
      this.results.bugs_found.push({
        type: 'CACHING_TEST_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async runQuickThroughputTests() {
    console.log('🔄 Running quick throughput tests...');
    
    const batchSize = 3;
    const query = 'Brief AI explanation';
    
    try {
      console.log(`  Testing batch of ${batchSize} concurrent requests...`);
      const startTime = performance.now();
      
      const promises = Array(batchSize).fill().map((_, index) => 
        this.optimizeWithTimeout(`${query} (${index + 1})`, [], { bypass_cache: true })
          .then(response => ({ ...response, request_index: index + 1 }))
          .catch(error => ({ error: error.message, request_index: index + 1 }))
      );
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      const successful = results.filter(r => !r.error);
      const failed = results.filter(r => r.error);
      
      console.log(`    ✅ ${successful.length}/${batchSize} successful in ${totalTime.toFixed(2)}ms`);
      
      this.results.performance_metrics.throughput_tests = {
        batch_size: batchSize,
        total_time_ms: totalTime,
        successful_requests: successful.length,
        failed_requests: failed.length,
        success_rate: successful.length / batchSize,
        avg_time_per_request_ms: totalTime / batchSize,
        requests_per_second: (batchSize / totalTime) * 1000,
        backends_used: [...new Set(successful.map(r => r.backend_used))],
        total_cost_eur: successful.reduce((sum, r) => sum + (r.cost_eur || 0), 0)
      };
      
    } catch (error) {
      this.results.bugs_found.push({
        type: 'THROUGHPUT_TEST_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async runRecursiveOptimizeTests() {
    console.log('🔄 Running recursive optimize() tests...');
    
    try {
      console.log('  Using optimize() to analyze itself...');
      
      const selfAnalysisQuery = `You are Claudette v3.0.0. Analyze your optimize() function performance and list 3 key optimization opportunities in under 100 words.`;
      
      const startTime = performance.now();
      const selfAnalysis = await this.optimizeWithTimeout(selfAnalysisQuery, [], {}, 10000);
      const endTime = performance.now();
      
      console.log(`    Self-analysis completed in ${(endTime - startTime).toFixed(2)}ms`);
      console.log(`    Response: ${selfAnalysis.content.substring(0, 100)}...`);
      
      this.results.feature_tests.recursive_optimize = {
        self_analysis: {
          query_length: selfAnalysisQuery.length,
          response_length: selfAnalysis.content.length,
          latency_ms: endTime - startTime,
          backend_used: selfAnalysis.backend_used,
          cost_eur: selfAnalysis.cost_eur || 0,
          recursive_depth: 1
        }
      };
      
    } catch (error) {
      this.results.bugs_found.push({
        type: 'RECURSIVE_OPTIMIZE_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async runSystemHealthCheck() {
    console.log('🏥 Running system health check...');
    
    try {
      const status = await this.claudette.getStatus();
      
      this.results.system_health = {
        overall_healthy: status.healthy,
        database_status: status.database,
        cache_status: status.cache,
        backend_status: status.backends,
        version: status.version,
        uptime_ms: performance.now() - this.startTime,
        memory_usage: process.memoryUsage()
      };
      
      console.log(`    System health: ${status.healthy ? '✅ Healthy' : '❌ Issues detected'}`);
      
    } catch (error) {
      this.results.bugs_found.push({
        type: 'HEALTH_CHECK_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async generateQuickReport() {
    console.log('📊 Generating quick benchmark report...');
    
    // Calculate final metrics
    this.results.metadata.total_runtime_ms = performance.now() - this.startTime;
    this.results.metadata.total_tests_executed = this.calculateTotalTests();
    this.results.metadata.total_api_calls = this.calculateTotalAPICalls();
    this.results.metadata.total_cost_eur = this.calculateTotalCost();
    
    // Generate simple recommendations
    this.generateQuickRecommendations();
    
    // Add summary
    this.results.summary = {
      overall_performance_score: this.calculatePerformanceScore(),
      key_findings: this.extractKeyFindings(),
      critical_issues: this.results.bugs_found.filter(bug => 
        bug.type.includes('CRITICAL') || bug.type.includes('ERROR')
      ).length,
      recommendations_count: this.results.recommendations.length,
      successful_test_percentage: this.calculateSuccessRate()
    };
    
    // Save report
    const reportPath = path.join(__dirname, 'agent1-core-benchmark-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    // Display summary
    console.log('\n📋 QUICK BENCHMARK SUMMARY:');
    console.log(`├── Total Runtime: ${(this.results.metadata.total_runtime_ms / 1000).toFixed(2)}s`);
    console.log(`├── Tests Executed: ${this.results.metadata.total_tests_executed}`);
    console.log(`├── API Calls Made: ${this.results.metadata.total_api_calls}`);
    console.log(`├── Total Cost: €${this.results.metadata.total_cost_eur.toFixed(4)}`);
    console.log(`├── Bugs Found: ${this.results.bugs_found.length}`);
    console.log(`├── Success Rate: ${(this.results.summary.successful_test_percentage * 100).toFixed(1)}%`);
    console.log(`├── Performance Score: ${this.results.summary.overall_performance_score.toFixed(1)}/100`);
    console.log(`└── Report: agent1-core-benchmark-report.json`);
    
    if (this.results.recommendations.length > 0) {
      console.log('\n🔧 TOP RECOMMENDATIONS:');
      this.results.recommendations.slice(0, 3).forEach((rec, i) => {
        console.log(`${i + 1}. [${rec.priority}] ${rec.issue}: ${rec.recommendation}`);
      });
    }
  }

  // Utility methods
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async optimizeWithTimeout(prompt, files = [], options = {}, timeout = this.requestTimeout) {
    return Promise.race([
      optimize(prompt, files, options),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Request timeout after ${timeout}ms`)), timeout)
      )
    ]);
  }

  calculateMedian(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  generateQuickRecommendations() {
    const recommendations = [];
    
    // Check latency
    const latencyTests = this.results.performance_metrics.latency_tests;
    if (latencyTests && latencyTests.avg_ms > 3000) {
      recommendations.push({
        category: 'PERFORMANCE',
        priority: 'HIGH',
        issue: `High average latency: ${latencyTests.avg_ms.toFixed(0)}ms`,
        recommendation: 'Consider optimizing backend selection or using faster backends'
      });
    }
    
    // Check caching
    const cacheTests = this.results.feature_tests.caching;
    if (cacheTests && !cacheTests.cache_hit) {
      recommendations.push({
        category: 'CACHING',
        priority: 'MEDIUM',
        issue: 'Cache not working as expected',
        recommendation: 'Review cache configuration and key generation'
      });
    }
    
    // Check errors
    if (this.results.bugs_found.length > 2) {
      recommendations.push({
        category: 'RELIABILITY',
        priority: 'HIGH',
        issue: `Multiple errors found: ${this.results.bugs_found.length}`,
        recommendation: 'Review error handling and backend availability'
      });
    }
    
    this.results.recommendations = recommendations;
  }

  calculateTotalTests() {
    let total = 0;
    total += this.results.performance_metrics.latency_tests?.test_count || 0;
    total += this.results.performance_metrics.throughput_tests?.batch_size || 0;
    total += 2; // caching tests
    total += 1; // recursive test
    total += 1; // health check
    return total;
  }

  calculateTotalAPICalls() {
    let calls = 0;
    calls += this.results.performance_metrics.latency_tests?.test_count || 0;
    calls += this.results.performance_metrics.throughput_tests?.batch_size || 0;
    calls += 2; // caching tests
    calls += 1; // recursive test
    return calls;
  }

  calculateTotalCost() {
    let totalCost = 0;
    
    if (this.results.performance_metrics.latency_tests?.detailed_results) {
      totalCost += this.results.performance_metrics.latency_tests.detailed_results
        .reduce((sum, r) => sum + (r.cost_eur || 0), 0);
    }
    
    totalCost += this.results.performance_metrics.throughput_tests?.total_cost_eur || 0;
    totalCost += this.results.feature_tests.recursive_optimize?.self_analysis?.cost_eur || 0;
    
    return totalCost;
  }

  calculatePerformanceScore() {
    let score = 100;
    
    // Deduct for high latency
    const avgLatency = this.results.performance_metrics.latency_tests?.avg_ms || 0;
    if (avgLatency > 5000) score -= 30;
    else if (avgLatency > 2000) score -= 15;
    
    // Deduct for cache issues
    if (!this.results.feature_tests.caching?.cache_hit) score -= 20;
    
    // Deduct for errors
    score -= Math.min(40, this.results.bugs_found.length * 10);
    
    // Deduct for throughput issues
    const successRate = this.results.performance_metrics.throughput_tests?.success_rate || 1;
    if (successRate < 0.8) score -= 20;
    
    return Math.max(0, score);
  }

  extractKeyFindings() {
    const findings = [];
    
    const latencyTests = this.results.performance_metrics.latency_tests;
    if (latencyTests) {
      findings.push(`Average latency: ${latencyTests.avg_ms.toFixed(0)}ms`);
    }
    
    const cacheTests = this.results.feature_tests.caching;
    if (cacheTests) {
      findings.push(`Cache working: ${cacheTests.cache_hit ? 'Yes' : 'No'}`);
    }
    
    const throughputTests = this.results.performance_metrics.throughput_tests;
    if (throughputTests) {
      findings.push(`Throughput success rate: ${(throughputTests.success_rate * 100).toFixed(0)}%`);
    }
    
    findings.push(`System health: ${this.results.system_health.overall_healthy ? 'Good' : 'Issues'}`);
    
    return findings;
  }

  calculateSuccessRate() {
    const totalTests = this.calculateTotalTests();
    const failedTests = this.results.bugs_found.filter(bug => 
      bug.type.includes('ERROR')
    ).length;
    
    return Math.max(0, (totalTests - failedTests) / totalTests);
  }
}

// Run the quick benchmark
async function main() {
  const benchmark = new Agent1QuickBenchmark();
  await benchmark.run();
  process.exit(0);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Quick benchmark failed:', error);
    process.exit(1);
  });
}

module.exports = Agent1QuickBenchmark;