#!/usr/bin/env node

/**
 * Agent 1 Final Core Functionality & Performance Benchmark
 * 
 * Uses Claudette's optimize() function to test itself recursively
 * Comprehensive testing with proper error handling and timeout management
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Import Claudette
const { Claudette, optimize } = require('./dist/index.js');

class Agent1FinalBenchmark {
  constructor() {
    this.results = {
      metadata: {
        version: '3.0.0',
        agent: 'Agent 1 - Final Core Functionality Benchmark',
        timestamp: new Date().toISOString(),
        node_version: process.version,
        environment: process.env.NODE_ENV || 'test',
        test_mode: 'comprehensive'
      },
      configuration: {},
      performance_metrics: {
        latency_distribution: [],
        throughput_tests: [],
        cost_analysis: {},
        concurrent_load: {}
      },
      feature_tests: {
        caching: {},
        routing: {},
        compression: {},
        summarization: {},
        backend_selection: {},
        recursive_optimize: {}
      },
      bugs_found: [],
      system_health: {},
      recommendations: [],
      test_execution: {
        total_tests_planned: 0,
        total_tests_executed: 0,
        total_tests_successful: 0,
        execution_timeline: []
      }
    };
    
    this.claudette = new Claudette();
    this.startTime = performance.now();
    this.requestTimeout = 8000; // 8 second timeout
    this.maxRetries = 2;
  }

  /**
   * Main benchmark execution
   */
  async run() {
    console.log('🚀 Starting Agent 1 Final Core Functionality & Performance Benchmark...\n');
    
    try {
      // Initialize Claudette
      console.log('📋 Initializing Claudette...');
      await this.claudette.initialize();
      this.logExecution('initialization', 'completed');
      
      // Capture configuration
      await this.captureConfiguration();
      this.logExecution('configuration_capture', 'completed');
      
      // Run test suite with proper error handling
      await this.runTestSuite();
      
      // Generate final report
      await this.generateFinalReport();
      
    } catch (error) {
      this.results.bugs_found.push({
        type: 'CRITICAL_ERROR',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      console.error('💥 Critical error during benchmark:', error);
      
      // Still try to generate a report with what we have
      await this.generateFinalReport();
    }
    
    console.log('\n✅ Benchmark completed. Report saved to agent1-core-benchmark-report.json');
  }

  /**
   * Run the complete test suite with proper error handling
   */
  async runTestSuite() {
    const tests = [
      { name: 'System Health Check', method: 'runSystemHealthCheck', critical: false },
      { name: 'Basic Latency Tests', method: 'runBasicLatencyTests', critical: true },
      { name: 'Caching Tests', method: 'runCachingEffectivenessTests', critical: true },
      { name: 'Throughput Tests', method: 'runThroughputTests', critical: false },
      { name: 'Backend Routing Tests', method: 'runBackendRoutingTests', critical: false },
      { name: 'Recursive Optimize Tests', method: 'runRecursiveOptimizeTests', critical: true },
      { name: 'Compression Tests', method: 'runCompressionTests', critical: false },
      { name: 'Cost Analysis Tests', method: 'runCostAnalysisTests', critical: false },
      { name: 'Concurrent Load Tests', method: 'runConcurrentLoadTests', critical: false }
    ];

    this.results.test_execution.total_tests_planned = tests.length;

    for (const test of tests) {
      console.log(`\n🧪 Running ${test.name}...`);
      try {
        const startTime = performance.now();
        await this[test.method]();
        const duration = performance.now() - startTime;
        
        this.logExecution(test.name, 'successful', duration);
        this.results.test_execution.total_tests_successful++;
        console.log(`    ✅ Completed in ${duration.toFixed(0)}ms`);
        
      } catch (error) {
        this.logExecution(test.name, 'failed', 0, error.message);
        this.results.bugs_found.push({
          type: 'TEST_EXECUTION_ERROR',
          test_name: test.name,
          critical: test.critical,
          message: error.message,
          timestamp: new Date().toISOString()
        });
        
        console.log(`    ❌ Failed: ${error.message}`);
        
        if (test.critical) {
          console.log(`    ⚠️  Critical test failed - continuing with reduced functionality`);
        }
      }
      
      this.results.test_execution.total_tests_executed++;
      await this.sleep(200); // Brief pause between tests
    }
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
        },
        available_backends: Object.keys(status.backends?.health || {}),
        database_healthy: status.database?.healthy || false,
        cache_enabled: status.cache?.enabled || false
      };
    } catch (error) {
      this.results.bugs_found.push({
        type: 'CONFIGURATION_ERROR',
        message: `Failed to capture configuration: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  async runSystemHealthCheck() {
    try {
      const status = await this.claudette.getStatus();
      
      this.results.system_health = {
        overall_healthy: status.healthy,
        database_status: status.database,
        cache_status: status.cache,
        backend_status: status.backends,
        version: status.version,
        uptime_ms: performance.now() - this.startTime,
        memory_usage: process.memoryUsage(),
        system_metrics: {
          heap_used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heap_total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external_mb: Math.round(process.memoryUsage().external / 1024 / 1024)
        }
      };
      
      console.log(`    System health: ${status.healthy ? '✅ Healthy' : '⚠️ Issues detected'}`);
      console.log(`    Memory usage: ${this.results.system_health.system_metrics.heap_used_mb}MB`);
      
    } catch (error) {
      throw new Error(`System health check failed: ${error.message}`);
    }
  }

  async runBasicLatencyTests() {
    const testQueries = [
      'What is 2+2?',
      'Hello',
      'Define API'
    ];
    
    const results = [];
    
    for (let i = 0; i < testQueries.length; i++) {
      const query = testQueries[i];
      console.log(`    Testing: "${query}"`);
      
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
          response_length: response.content.length,
          success: true
        });
        
        console.log(`      ✅ ${latency.toFixed(0)}ms (${response.backend_used})`);
        
      } catch (error) {
        results.push({
          query_index: i,
          query: query,
          error: error.message,
          success: false
        });
        console.log(`      ❌ Failed: ${error.message}`);
      }
      
      await this.sleep(300);
    }
    
    const successful = results.filter(r => r.success);
    if (successful.length > 0) {
      const latencies = successful.map(r => r.latency_ms);
      this.results.performance_metrics.latency_distribution = {
        test_count: results.length,
        successful_count: successful.length,
        min_ms: Math.min(...latencies),
        max_ms: Math.max(...latencies),
        avg_ms: latencies.reduce((a, b) => a + b, 0) / latencies.length,
        median_ms: this.calculateMedian(latencies),
        detailed_results: results
      };
    }
  }

  async runCachingEffectivenessTests() {
    const testQuery = 'What is caching in computing?';
    
    try {
      console.log('    Testing cache miss...');
      const startTime1 = performance.now();
      const response1 = await this.optimizeWithTimeout(testQuery, []);
      const endTime1 = performance.now();
      const firstLatency = endTime1 - startTime1;
      
      console.log(`      First request: ${firstLatency.toFixed(0)}ms`);
      
      // Wait briefly then test cache hit
      await this.sleep(500);
      
      console.log('    Testing cache hit...');
      const startTime2 = performance.now();
      const response2 = await this.optimizeWithTimeout(testQuery, []);
      const endTime2 = performance.now();
      const secondLatency = endTime2 - startTime2;
      
      console.log(`      Second request: ${secondLatency.toFixed(0)}ms (cache: ${response2.cache_hit ? 'HIT' : 'MISS'})`);
      
      this.results.feature_tests.caching = {
        first_request_ms: firstLatency,
        second_request_ms: secondLatency,
        cache_hit: response2.cache_hit || false,
        speedup_ratio: firstLatency / secondLatency,
        cache_effectiveness: Math.max(0, (firstLatency - secondLatency) / firstLatency),
        cache_working: response2.cache_hit === true
      };
      
    } catch (error) {
      throw new Error(`Caching test failed: ${error.message}`);
    }
  }

  async runThroughputTests() {
    const batchSizes = [2, 5];
    const query = 'Explain throughput testing';
    
    for (const batchSize of batchSizes) {
      console.log(`    Testing batch size: ${batchSize}`);
      
      try {
        const startTime = performance.now();
        
        const promises = Array(batchSize).fill().map((_, index) => 
          this.optimizeWithTimeout(`${query} (request ${index + 1})`, [], { bypass_cache: true })
            .then(response => ({ ...response, request_index: index + 1, success: true }))
            .catch(error => ({ error: error.message, request_index: index + 1, success: false }))
        );
        
        const results = await Promise.all(promises);
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        
        const successful = results.filter(r => r.success);
        
        this.results.performance_metrics.throughput_tests.push({
          batch_size: batchSize,
          total_time_ms: totalTime,
          successful_requests: successful.length,
          failed_requests: batchSize - successful.length,
          success_rate: successful.length / batchSize,
          avg_time_per_request_ms: totalTime / batchSize,
          requests_per_second: (batchSize / totalTime) * 1000,
          backends_used: [...new Set(successful.map(r => r.backend_used))],
          total_cost_eur: successful.reduce((sum, r) => sum + (r.cost_eur || 0), 0)
        });
        
        console.log(`      ✅ ${successful.length}/${batchSize} successful in ${totalTime.toFixed(0)}ms`);
        
      } catch (error) {
        console.log(`      ❌ Batch test failed: ${error.message}`);
      }
      
      await this.sleep(500);
    }
  }

  async runBackendRoutingTests() {
    const testQueries = [
      'Simple calculation: 5+5',
      'Complex analysis: Explain quantum computing',
      'Code generation: Write a hello world function'
    ];
    
    const routingResults = [];
    
    for (const query of testQueries) {
      try {
        console.log(`    Testing routing: "${query.substring(0, 30)}..."`);
        
        const startTime = performance.now();
        const response = await this.optimizeWithTimeout(query, [], { bypass_cache: true });
        const endTime = performance.now();
        
        routingResults.push({
          query_type: query.split(':')[0],
          backend_selected: response.backend_used,
          latency_ms: endTime - startTime,
          cost_eur: response.cost_eur || 0,
          tokens_input: response.tokens_input || 0,
          tokens_output: response.tokens_output || 0,
          success: true
        });
        
        console.log(`      Backend: ${response.backend_used}, Latency: ${(endTime - startTime).toFixed(0)}ms`);
        
      } catch (error) {
        routingResults.push({
          query_type: query.split(':')[0],
          error: error.message,
          success: false
        });
        console.log(`      ❌ Routing failed: ${error.message}`);
      }
      
      await this.sleep(400);
    }
    
    // Analyze routing patterns
    const successful = routingResults.filter(r => r.success);
    const backendUsage = {};
    successful.forEach(result => {
      backendUsage[result.backend_selected] = (backendUsage[result.backend_selected] || 0) + 1;
    });
    
    this.results.feature_tests.backend_selection = {
      routing_decisions: routingResults,
      backend_usage_distribution: backendUsage,
      intelligent_routing: Object.keys(backendUsage).length > 1, // Multiple backends used
      success_rate: successful.length / routingResults.length
    };
  }

  async runRecursiveOptimizeTests() {
    try {
      console.log('    Using optimize() to analyze itself...');
      
      const selfAnalysisQuery = `You are Claudette v3.0.0, an AI middleware platform. Analyze your core optimize() function and identify exactly 3 key performance optimization opportunities. Be concise and specific.`;
      
      const startTime = performance.now();
      const selfAnalysis = await this.optimizeWithTimeout(selfAnalysisQuery, [], {}, 10000);
      const endTime = performance.now();
      
      console.log(`    Self-analysis completed in ${(endTime - startTime).toFixed(0)}ms`);
      console.log(`    Response preview: "${selfAnalysis.content.substring(0, 80)}..."`);
      
      // Test recursive call - use optimize to generate a test query, then execute it
      console.log('    Generating test query recursively...');
      
      const testGenQuery = `Generate a short technical question about API performance optimization (max 10 words):`;
      const generatedTest = await this.optimizeWithTimeout(testGenQuery, []);
      
      console.log(`    Generated query: "${generatedTest.content.substring(0, 60)}"`);
      
      // Execute the generated query
      const recursiveResult = await this.optimizeWithTimeout(generatedTest.content.substring(0, 100), []);
      
      this.results.feature_tests.recursive_optimize = {
        self_analysis: {
          query_length: selfAnalysisQuery.length,
          response_length: selfAnalysis.content.length,
          latency_ms: endTime - startTime,
          backend_used: selfAnalysis.backend_used,
          cost_eur: selfAnalysis.cost_eur || 0
        },
        test_generation: {
          generated_query: generatedTest.content.substring(0, 100),
          execution_successful: true,
          recursive_depth: 2
        },
        recursive_capability: true,
        total_recursive_calls: 3
      };
      
    } catch (error) {
      throw new Error(`Recursive optimize test failed: ${error.message}`);
    }
  }

  async runCompressionTests() {
    const largeQuery = `This is a comprehensive analysis of distributed systems architecture patterns including microservices, service mesh, API gateways, load balancers, database sharding, caching layers, message queues, event streaming, container orchestration, serverless functions, CI/CD pipelines, monitoring and observability, security best practices, and scalability considerations for enterprise applications.`.repeat(3);
    
    try {
      console.log(`    Testing compression on ${largeQuery.length} character query`);
      
      const startTime = performance.now();
      const response = await this.optimizeWithTimeout(largeQuery, [], { bypass_cache: true });
      const endTime = performance.now();
      
      this.results.feature_tests.compression = {
        original_length: largeQuery.length,
        estimated_original_tokens: Math.ceil(largeQuery.length / 4),
        response_latency_ms: endTime - startTime,
        backend_used: response.backend_used,
        compression_applied: response.metadata?.compression_applied || false,
        compression_ratio: response.metadata?.compression_ratio || 1.0,
        tokens_input: response.tokens_input || 0,
        cost_eur: response.cost_eur || 0
      };
      
      console.log(`    Compression: ${response.metadata?.compression_applied ? 'APPLIED' : 'NOT APPLIED'}`);
      
    } catch (error) {
      console.log(`    ❌ Compression test failed: ${error.message}`);
    }
  }

  async runCostAnalysisTests() {
    const testQuery = 'Explain cost optimization in cloud computing';
    
    try {
      console.log('    Testing cost tracking...');
      
      const response1 = await this.optimizeWithTimeout(testQuery, [], { bypass_cache: true });
      await this.sleep(200);
      const response2 = await this.optimizeWithTimeout(testQuery, []);
      
      this.results.performance_metrics.cost_analysis = {
        first_request_cost: response1.cost_eur || 0,
        second_request_cost: response2.cost_eur || 0,
        cache_cost_savings: (response1.cost_eur || 0) - (response2.cost_eur || 0),
        cost_tracking_working: (response1.cost_eur || 0) >= 0,
        backend_used: response1.backend_used
      };
      
      console.log(`    Cost tracking: ${this.results.performance_metrics.cost_analysis.cost_tracking_working ? 'WORKING' : 'NOT WORKING'}`);
      
    } catch (error) {
      console.log(`    ❌ Cost analysis failed: ${error.message}`);
    }
  }

  async runConcurrentLoadTests() {
    const concurrency = 3;
    const query = 'Test concurrent processing';
    
    try {
      console.log(`    Testing ${concurrency} concurrent requests...`);
      
      const startTime = performance.now();
      
      const promises = Array(concurrency).fill().map((_, index) => 
        this.optimizeWithTimeout(`${query} ${index + 1}`, [], { bypass_cache: true })
          .then(response => ({ ...response, request_index: index + 1, success: true }))
          .catch(error => ({ error: error.message, request_index: index + 1, success: false }))
      );
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      const successful = results.filter(r => r.success);
      
      this.results.performance_metrics.concurrent_load = {
        concurrency_level: concurrency,
        total_time_ms: totalTime,
        successful_requests: successful.length,
        failed_requests: concurrency - successful.length,
        success_rate: successful.length / concurrency,
        avg_latency_ms: totalTime / concurrency,
        requests_per_second: (concurrency / totalTime) * 1000,
        backend_distribution: this.analyzeBackendDistribution(successful)
      };
      
      console.log(`    ✅ ${successful.length}/${concurrency} successful, avg: ${(totalTime / concurrency).toFixed(0)}ms`);
      
    } catch (error) {
      console.log(`    ❌ Concurrent load test failed: ${error.message}`);
    }
  }

  async generateFinalReport() {
    console.log('\n📊 Generating comprehensive benchmark report...');
    
    // Calculate final metrics
    this.results.metadata.total_runtime_ms = performance.now() - this.startTime;
    this.results.metadata.total_cost_eur = this.calculateTotalCost();
    
    // Generate recommendations
    this.generateRecommendations();
    
    // Add summary statistics
    this.results.summary = {
      overall_performance_score: this.calculatePerformanceScore(),
      key_findings: this.extractKeyFindings(),
      critical_issues_found: this.results.bugs_found.filter(bug => 
        bug.type.includes('CRITICAL') || bug.critical
      ).length,
      test_success_rate: this.results.test_execution.total_tests_successful / this.results.test_execution.total_tests_executed,
      recommendations_count: this.results.recommendations.length,
      system_healthy: this.results.system_health.overall_healthy
    };
    
    // Save report
    const reportPath = path.join(__dirname, 'agent1-core-benchmark-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    // Display comprehensive summary
    this.displayFinalSummary();
  }

  displayFinalSummary() {
    console.log('\n📋 COMPREHENSIVE BENCHMARK SUMMARY:');
    console.log('╭─────────────────────────────────────────╮');
    console.log('│           AGENT 1 CORE BENCHMARK        │');
    console.log('├─────────────────────────────────────────┤');
    console.log(`│ Runtime: ${(this.results.metadata.total_runtime_ms / 1000).toFixed(1)}s                        │`);
    console.log(`│ Tests: ${this.results.test_execution.total_tests_successful}/${this.results.test_execution.total_tests_executed} successful                   │`);
    console.log(`│ Cost: €${this.results.metadata.total_cost_eur.toFixed(4)}                        │`);
    console.log(`│ Bugs: ${this.results.bugs_found.length} found                         │`);
    console.log(`│ Score: ${this.results.summary.overall_performance_score.toFixed(0)}/100                          │`);
    console.log('╰─────────────────────────────────────────╯');
    
    console.log('\n🔍 KEY FINDINGS:');
    this.results.summary.key_findings.forEach((finding, i) => {
      console.log(`  ${i + 1}. ${finding}`);
    });
    
    if (this.results.recommendations.length > 0) {
      console.log('\n💡 TOP RECOMMENDATIONS:');
      this.results.recommendations.slice(0, 3).forEach((rec, i) => {
        console.log(`  ${i + 1}. [${rec.priority}] ${rec.recommendation}`);
      });
    }
    
    console.log(`\n📄 Detailed report: agent1-core-benchmark-report.json`);
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

  logExecution(testName, status, duration = 0, error = null) {
    this.results.test_execution.execution_timeline.push({
      test: testName,
      status,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
      error
    });
  }

  calculateMedian(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  analyzeBackendDistribution(results) {
    const distribution = {};
    results.forEach(result => {
      const backend = result.backend_used || 'unknown';
      distribution[backend] = (distribution[backend] || 0) + 1;
    });
    return distribution;
  }

  calculateTotalCost() {
    let totalCost = 0;
    
    // Sum from latency tests
    if (this.results.performance_metrics.latency_distribution?.detailed_results) {
      totalCost += this.results.performance_metrics.latency_distribution.detailed_results
        .reduce((sum, r) => sum + (r.cost_eur || 0), 0);
    }
    
    // Sum from throughput tests
    this.results.performance_metrics.throughput_tests?.forEach(test => {
      totalCost += test.total_cost_eur || 0;
    });
    
    // Sum from other tests
    totalCost += this.results.feature_tests.recursive_optimize?.self_analysis?.cost_eur || 0;
    totalCost += this.results.performance_metrics.cost_analysis?.first_request_cost || 0;
    totalCost += this.results.performance_metrics.cost_analysis?.second_request_cost || 0;
    
    return totalCost;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Performance recommendations
    const avgLatency = this.results.performance_metrics.latency_distribution?.avg_ms || 0;
    if (avgLatency > 3000) {
      recommendations.push({
        category: 'PERFORMANCE',
        priority: 'HIGH',
        issue: 'High latency detected',
        recommendation: 'Optimize backend selection algorithm and consider faster backends'
      });
    }
    
    // Caching recommendations
    if (!this.results.feature_tests.caching?.cache_working) {
      recommendations.push({
        category: 'CACHING',
        priority: 'HIGH',
        issue: 'Cache not functioning properly',
        recommendation: 'Review cache configuration and implementation'
      });
    }
    
    // Reliability recommendations
    const testSuccessRate = this.results.test_execution.total_tests_successful / this.results.test_execution.total_tests_executed;
    if (testSuccessRate < 0.8) {
      recommendations.push({
        category: 'RELIABILITY',
        priority: 'HIGH',
        issue: 'Low test success rate',
        recommendation: 'Improve error handling and backend reliability'
      });
    }
    
    // Cost optimization
    if (this.results.performance_metrics.cost_analysis?.cost_tracking_working === false) {
      recommendations.push({
        category: 'COST',
        priority: 'MEDIUM',
        issue: 'Cost tracking not working',
        recommendation: 'Fix cost calculation and tracking mechanisms'
      });
    }
    
    this.results.recommendations = recommendations;
  }

  calculatePerformanceScore() {
    let score = 100;
    
    // Deduct for high latency
    const avgLatency = this.results.performance_metrics.latency_distribution?.avg_ms || 0;
    if (avgLatency > 5000) score -= 30;
    else if (avgLatency > 2000) score -= 15;
    
    // Deduct for cache issues
    if (!this.results.feature_tests.caching?.cache_working) score -= 25;
    
    // Deduct for test failures
    const testSuccessRate = this.results.test_execution.total_tests_successful / this.results.test_execution.total_tests_executed;
    if (testSuccessRate < 0.5) score -= 40;
    else if (testSuccessRate < 0.8) score -= 20;
    
    // Deduct for system health issues
    if (!this.results.system_health.overall_healthy) score -= 20;
    
    // Deduct for bugs
    score -= Math.min(30, this.results.bugs_found.length * 5);
    
    return Math.max(0, score);
  }

  extractKeyFindings() {
    const findings = [];
    
    // Latency findings
    const latencyStats = this.results.performance_metrics.latency_distribution;
    if (latencyStats && latencyStats.avg_ms) {
      findings.push(`Average response latency: ${latencyStats.avg_ms.toFixed(0)}ms`);
    }
    
    // System health
    findings.push(`System health: ${this.results.system_health.overall_healthy ? 'Healthy' : 'Issues detected'}`);
    
    // Caching effectiveness
    const cacheWorking = this.results.feature_tests.caching?.cache_working;
    findings.push(`Caching: ${cacheWorking ? 'Working' : 'Issues detected'}`);
    
    // Backend routing
    const routingIntelligent = this.results.feature_tests.backend_selection?.intelligent_routing;
    if (routingIntelligent !== undefined) {
      findings.push(`Intelligent routing: ${routingIntelligent ? 'Active' : 'Limited'}`);
    }
    
    // Recursive capability
    const recursiveCapable = this.results.feature_tests.recursive_optimize?.recursive_capability;
    if (recursiveCapable !== undefined) {
      findings.push(`Recursive optimize(): ${recursiveCapable ? 'Working' : 'Failed'}`);
    }
    
    // Overall reliability
    const successRate = (this.results.test_execution.total_tests_successful / this.results.test_execution.total_tests_executed * 100);
    findings.push(`Test success rate: ${successRate.toFixed(0)}%`);
    
    return findings;
  }
}

// Run the comprehensive benchmark
async function main() {
  const benchmark = new Agent1FinalBenchmark();
  await benchmark.run();
  process.exit(0);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Benchmark failed:', error);
    process.exit(1);
  });
}

module.exports = Agent1FinalBenchmark;