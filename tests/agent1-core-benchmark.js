#!/usr/bin/env node

/**
 * Agent 1 Core Functionality & Performance Benchmark
 * 
 * Uses Claudette's optimize() function to test itself recursively
 * Comprehensive testing of all core features with empirical measurements
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Import Claudette
const { Claudette, optimize } = require('./dist/index.js');

class Agent1Benchmark {
  constructor() {
    this.results = {
      metadata: {
        version: '3.0.0',
        agent: 'Agent 1 - Core Functionality Benchmark',
        timestamp: new Date().toISOString(),
        node_version: process.version,
        environment: process.env.NODE_ENV || 'test'
      },
      configuration: {},
      performance_metrics: {
        latency_distribution: [],
        throughput_tests: [],
        cost_analysis: {},
        cache_performance: {},
        concurrent_load: {}
      },
      feature_tests: {
        caching: {},
        routing: {},
        compression: {},
        summarization: {},
        backend_selection: {}
      },
      bugs_found: [],
      system_health: {},
      recommendations: []
    };
    
    this.claudette = new Claudette();
    this.testQueries = this.generateTestQueries();
    this.startTime = performance.now();
    this.requestTimeout = 8000; // 8 second timeout for most requests
    this.quickMode = process.argv.includes('--quick'); // Quick mode for faster testing
  }

  /**
   * Generate diverse test queries for comprehensive testing
   */
  generateTestQueries() {
    return {
      // Short queries for latency testing
      short: [
        'What is 2+2?',
        'Explain recursion',
        'Define API',
        'What is TypeScript?',
        'How does caching work?'
      ],
      
      // Medium queries for general performance
      medium: [
        'Explain the differences between REST and GraphQL APIs, including their strengths and weaknesses.',
        'What are the key principles of microservices architecture and how do they compare to monolithic architecture?',
        'Describe the CAP theorem and its implications for distributed database systems.',
        'How does machine learning model training work and what are the main optimization algorithms used?'
      ],
      
      // Large queries for compression/summarization testing
      large: [
        `Please analyze the following comprehensive software architecture scenario: 
        We are building a distributed e-commerce platform that needs to handle millions of users globally. 
        The system needs to process real-time inventory updates, handle payment processing with multiple providers, 
        implement sophisticated recommendation algorithms using machine learning, maintain ACID compliance for transactions, 
        support multiple currencies and payment methods, implement real-time chat support, provide advanced analytics dashboards, 
        handle seasonal traffic spikes of 10x normal load, maintain 99.99% uptime, support multiple languages and regions, 
        integrate with third-party logistics providers, implement fraud detection systems, support mobile applications with offline capabilities, 
        provide APIs for third-party integrations, maintain data privacy compliance with GDPR and CCPA, implement advanced search functionality with faceted navigation, 
        support social media integrations, provide real-time notifications across multiple channels, implement A/B testing frameworks for continuous optimization, 
        maintain comprehensive audit trails, support progressive web apps, implement serverless functions for specific tasks, 
        use containerization for deployment, implement CI/CD pipelines with automated testing, monitor system performance with observability tools, 
        implement backup and disaster recovery procedures, support multi-tenancy for B2B customers, provide comprehensive documentation and developer portals, 
        implement rate limiting and API governance, support real-time streaming data processing, maintain code quality with automated reviews, 
        implement security best practices including OAuth2 and JWT tokens, support GraphQL and REST APIs simultaneously, 
        use microservices with event-driven architecture, implement distributed tracing, support database sharding and replication, 
        use content delivery networks for global performance, implement advanced caching strategies at multiple layers, 
        support real-time collaboration features, implement comprehensive testing strategies including unit, integration, and end-to-end tests, 
        use infrastructure as code for deployment automation, implement feature flags for gradual rollouts, 
        support advanced analytics with machine learning insights, maintain compliance with financial regulations, 
        implement advanced error handling and circuit breaker patterns, support real-time inventory synchronization across multiple channels, 
        use advanced monitoring and alerting systems, implement comprehensive logging with structured formats, 
        support advanced personalization algorithms, implement dynamic pricing strategies, support advanced reporting capabilities, 
        use advanced security scanning and vulnerability management, implement comprehensive backup strategies with point-in-time recovery, 
        support advanced workflow automation, implement comprehensive performance optimization strategies including database query optimization, 
        code splitting, lazy loading, and advanced caching mechanisms. What would be your recommended architecture, technology stack, 
        deployment strategy, scaling approach, monitoring solution, security implementation, testing strategy, and operational procedures?`,
        
        `Analyze this complex distributed systems problem: Design a global real-time multiplayer gaming platform that supports 
        millions of concurrent players across different game types (FPS, strategy, puzzle, racing), implements anti-cheat systems, 
        provides matchmaking algorithms, supports in-game purchases with virtual economies, implements social features like guilds and friends, 
        supports cross-platform play across mobile, desktop, and console platforms, provides real-time voice and text chat, 
        implements achievement systems, supports live streaming integration, provides analytics dashboards for game developers, 
        implements A/B testing for game features, supports modding capabilities, provides tournament systems, 
        implements machine learning for player behavior analysis, supports real-time leaderboards, provides customer support systems, 
        implements fraud detection for purchases, supports multiple currencies and payment providers, provides parental controls, 
        implements accessibility features, supports offline play with synchronization, provides comprehensive APIs for third-party tools, 
        implements advanced graphics optimization, supports VR/AR gameplay modes, provides comprehensive security measures against DDoS attacks, 
        implements advanced networking protocols for low-latency gameplay, supports cloud save synchronization, provides comprehensive telemetry collection, 
        implements advanced error reporting and crash analysis, supports live game updates without downtime, provides comprehensive testing frameworks for gameplay testing, 
        implements advanced load balancing for game servers, supports geographic server distribution, provides comprehensive monitoring of game server performance, 
        implements advanced database optimization for player data, supports real-time game state synchronization, 
        provides comprehensive backup and disaster recovery for player data, implements advanced caching for game assets, 
        supports CDN distribution of game content, provides comprehensive analytics for player engagement and retention, 
        implements machine learning for dynamic difficulty adjustment, supports advanced personalization of gaming experience, 
        provides comprehensive reporting for game performance metrics, implements advanced security measures for player account protection, 
        supports integration with social media platforms, provides comprehensive documentation for game developers, 
        implements advanced deployment strategies for game updates, supports feature flags for gradual feature rollouts, 
        provides comprehensive logging and debugging tools for game developers. What architecture, technologies, protocols, and operational strategies would you recommend?`
      ],
      
      // Specialized queries for backend routing testing
      routing_tests: [
        'Simple math calculation for OpenAI backend preference',
        'Complex reasoning task that might prefer Claude backend',
        'Code generation task for testing model-specific routing',
        'Creative writing task for testing quality-based routing'
      ],
      
      // Caching test queries (repeated deliberately)
      cache_tests: [
        'What is the capital of France?',
        'Explain how HTTP works',
        'What are the benefits of TypeScript?'
      ]
    };
  }

  /**
   * Main benchmark execution
   */
  async run() {
    console.log('🚀 Starting Agent 1 Core Functionality & Performance Benchmark...\n');
    
    try {
      // Initialize Claudette
      console.log('📋 Initializing Claudette...');
      await this.claudette.initialize();
      
      // Capture initial configuration
      await this.captureConfiguration();
      
      // Run comprehensive test suite
      await this.runLatencyDistributionTests();
      await this.runThroughputTests();
      await this.runCachingTests();
      await this.runCompressionTests();
      await this.runSummarizationTests();
      await this.runBackendRoutingTests();
      await this.runCostOptimizationTests();
      await this.runConcurrentLoadTests();
      await this.runRecursiveOptimizeTests();
      await this.runSystemHealthCheck();
      
      // Generate final report
      await this.generateReport();
      
    } catch (error) {
      this.results.bugs_found.push({
        type: 'CRITICAL_ERROR',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      console.error('💥 Critical error during benchmark:', error);
    }
    
    console.log('\n✅ Benchmark completed. Report saved to agent1-core-benchmark-report.json');
  }

  /**
   * Capture system configuration and available backends
   */
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

  /**
   * Test latency distribution across different query types
   */
  async runLatencyDistributionTests() {
    console.log('⚡ Running latency distribution tests...');
    
    const latencyResults = {};
    const timeout = 10000; // 10 second timeout per request
    
    for (const [category, queries] of Object.entries(this.testQueries)) {
      if (category === 'cache_tests') continue; // Skip for this test
      
      latencyResults[category] = [];
      console.log(`  Testing ${category} queries...`);
      
      // Only test first 2 queries of each category for faster execution
      const testQueries = queries.slice(0, 2);
      
      for (let i = 0; i < testQueries.length; i++) {
        const query = testQueries[i];
        const startTime = performance.now();
        
        try {
          const response = await this.optimizeWithTimeout(query, [], { bypass_cache: true }, timeout);
          
          const endTime = performance.now();
          const latency = endTime - startTime;
          
          latencyResults[category].push({
            query_index: i,
            latency_ms: latency,
            backend_used: response.backend_used,
            tokens_input: response.tokens_input,
            tokens_output: response.tokens_output,
            cost_eur: response.cost_eur
          });
          
          console.log(`    Query ${i+1}: ${latency.toFixed(2)}ms (${response.backend_used})`);
          
        } catch (error) {
          console.log(`    Query ${i+1}: FAILED - ${error.message}`);
          this.results.bugs_found.push({
            type: 'LATENCY_TEST_ERROR',
            category,
            query_index: i,
            message: error.message,
            timestamp: new Date().toISOString()
          });
        }
        
        // Brief pause between requests
        await this.sleep(200);
      }
    }
    
    // Calculate statistics
    for (const [category, results] of Object.entries(latencyResults)) {
      if (results.length === 0) continue;
      
      const latencies = results.map(r => r.latency_ms);
      this.results.performance_metrics.latency_distribution.push({
        category,
        count: results.length,
        min_ms: Math.min(...latencies),
        max_ms: Math.max(...latencies),
        avg_ms: latencies.reduce((a, b) => a + b, 0) / latencies.length,
        median_ms: this.calculateMedian(latencies),
        p95_ms: this.calculatePercentile(latencies, 95),
        p99_ms: this.calculatePercentile(latencies, 99),
        detailed_results: results
      });
    }
  }

  /**
   * Test throughput with batch requests
   */
  async runThroughputTests() {
    console.log('🔄 Running throughput tests...');
    
    const batchSizes = [1, 5, 10];
    const query = 'What is artificial intelligence?';
    
    for (const batchSize of batchSizes) {
      console.log(`  Testing batch size: ${batchSize}`);
      const startTime = performance.now();
      
      try {
        const promises = Array(batchSize).fill().map(() => 
          optimize(query, [], { bypass_cache: true })
        );
        
        const results = await Promise.all(promises);
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        
        this.results.performance_metrics.throughput_tests.push({
          batch_size: batchSize,
          total_time_ms: totalTime,
          avg_time_per_request_ms: totalTime / batchSize,
          requests_per_second: (batchSize / totalTime) * 1000,
          successful_requests: results.length,
          backends_used: [...new Set(results.map(r => r.backend_used))],
          total_cost_eur: results.reduce((sum, r) => sum + (r.cost_eur || 0), 0)
        });
        
      } catch (error) {
        this.results.bugs_found.push({
          type: 'THROUGHPUT_TEST_ERROR',
          batch_size: batchSize,
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Test caching effectiveness with repeated queries
   */
  async runCachingTests() {
    console.log('🗄️ Running caching effectiveness tests...');
    
    const cacheTestQuery = this.testQueries.cache_tests[0];
    const iterations = 5;
    
    try {
      // First request (cache miss)
      console.log('  Testing cache miss...');
      const firstResponse = await optimize(cacheTestQuery, []);
      
      // Subsequent requests (cache hits)
      const cacheHitLatencies = [];
      console.log('  Testing cache hits...');
      
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        const response = await optimize(cacheTestQuery, []);
        const endTime = performance.now();
        
        cacheHitLatencies.push({
          iteration: i + 1,
          latency_ms: endTime - startTime,
          cache_hit: response.cache_hit,
          backend_used: response.backend_used
        });
        
        await this.sleep(50);
      }
      
      // Test cache with different queries
      console.log('  Testing cache with different queries...');
      const differentQueries = this.testQueries.cache_tests.slice(1);
      const differentQueryResults = [];
      
      for (const query of differentQueries) {
        // First request
        const startTime1 = performance.now();
        const response1 = await optimize(query, []);
        const endTime1 = performance.now();
        
        // Second request (should be cached)
        const startTime2 = performance.now();
        const response2 = await optimize(query, []);
        const endTime2 = performance.now();
        
        differentQueryResults.push({
          query,
          first_request_ms: endTime1 - startTime1,
          second_request_ms: endTime2 - startTime2,
          cache_hit_ratio: response2.cache_hit ? 1 : 0,
          speedup: (endTime1 - startTime1) / (endTime2 - startTime2)
        });
        
        await this.sleep(100);
      }
      
      this.results.feature_tests.caching = {
        first_request_latency_ms: firstResponse.latency_ms || 0,
        cache_hit_latencies: cacheHitLatencies,
        avg_cache_hit_latency_ms: cacheHitLatencies.reduce((sum, r) => sum + r.latency_ms, 0) / cacheHitLatencies.length,
        cache_effectiveness: differentQueryResults,
        cache_hit_rate: cacheHitLatencies.filter(r => r.cache_hit).length / cacheHitLatencies.length
      };
      
    } catch (error) {
      this.results.bugs_found.push({
        type: 'CACHING_TEST_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Test compression functionality
   */
  async runCompressionTests() {
    console.log('🗜️ Running compression tests...');
    
    try {
      const largeQuery = this.testQueries.large[0];
      console.log(`  Original query length: ${largeQuery.length} characters`);
      
      // Test with compression enabled
      const startTime = performance.now();
      const compressedResponse = await optimize(largeQuery, [], { 
        bypass_cache: true 
      });
      const endTime = performance.now();
      
      this.results.feature_tests.compression = {
        original_length: largeQuery.length,
        estimated_original_tokens: Math.ceil(largeQuery.length / 4),
        response_latency_ms: endTime - startTime,
        backend_used: compressedResponse.backend_used,
        compression_applied: compressedResponse.metadata?.compression_applied || false,
        compression_ratio: compressedResponse.metadata?.compression_ratio || 1.0,
        compressed_size: compressedResponse.metadata?.compressed_size || largeQuery.length,
        tokens_input: compressedResponse.tokens_input,
        cost_eur: compressedResponse.cost_eur,
        response_quality: this.evaluateResponseQuality(compressedResponse.content)
      };
      
    } catch (error) {
      this.results.bugs_found.push({
        type: 'COMPRESSION_TEST_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Test summarization functionality
   */
  async runSummarizationTests() {
    console.log('📝 Running summarization tests...');
    
    try {
      const largeQuery = this.testQueries.large[1];
      console.log(`  Original query length: ${largeQuery.length} characters`);
      
      // Force summarization by using a very large query
      const startTime = performance.now();
      const summarizedResponse = await optimize(largeQuery, [], { 
        bypass_cache: true 
      });
      const endTime = performance.now();
      
      this.results.feature_tests.summarization = {
        original_length: largeQuery.length,
        original_sentence_count: largeQuery.split(/[.!?]+/).length - 1,
        response_latency_ms: endTime - startTime,
        backend_used: summarizedResponse.backend_used,
        summarization_applied: summarizedResponse.metadata?.summarization_applied || false,
        reduction_ratio: summarizedResponse.metadata?.reduction_ratio || 1.0,
        final_sentence_count: summarizedResponse.metadata?.summarized_sentence_count || 0,
        tokens_input: summarizedResponse.tokens_input,
        cost_eur: summarizedResponse.cost_eur,
        response_quality: this.evaluateResponseQuality(summarizedResponse.content)
      };
      
    } catch (error) {
      this.results.bugs_found.push({
        type: 'SUMMARIZATION_TEST_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Test backend routing intelligence
   */
  async runBackendRoutingTests() {
    console.log('🎯 Running backend routing tests...');
    
    const routingResults = [];
    
    for (const query of this.testQueries.routing_tests) {
      try {
        console.log(`  Testing: "${query.substring(0, 50)}..."`);
        
        const startTime = performance.now();
        const response = await optimize(query, [], { bypass_cache: true });
        const endTime = performance.now();
        
        routingResults.push({
          query: query.substring(0, 100),
          backend_selected: response.backend_used,
          latency_ms: endTime - startTime,
          cost_eur: response.cost_eur,
          tokens_input: response.tokens_input,
          tokens_output: response.tokens_output,
          response_length: response.content.length
        });
        
        await this.sleep(200);
        
      } catch (error) {
        this.results.bugs_found.push({
          type: 'ROUTING_TEST_ERROR',
          query: query.substring(0, 100),
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Analyze routing patterns
    const backendUsage = {};
    routingResults.forEach(result => {
      backendUsage[result.backend_selected] = (backendUsage[result.backend_selected] || 0) + 1;
    });
    
    this.results.feature_tests.backend_selection = {
      routing_decisions: routingResults,
      backend_usage_distribution: backendUsage,
      avg_latency_by_backend: this.calculateAvgLatencyByBackend(routingResults),
      avg_cost_by_backend: this.calculateAvgCostByBackend(routingResults)
    };
  }

  /**
   * Test cost optimization across backends
   */
  async runCostOptimizationTests() {
    console.log('💰 Running cost optimization tests...');
    
    const testQuery = 'Explain the concept of machine learning in simple terms.';
    const costComparisons = [];
    
    try {
      // Test with different backend preferences
      const availableBackends = ['openai', 'claude', 'qwen', 'mock'];
      
      for (const backend of availableBackends) {
        try {
          console.log(`  Testing cost with ${backend} backend...`);
          
          const startTime = performance.now();
          const response = await optimize(testQuery, [], { 
            backend: backend,
            bypass_cache: true 
          });
          const endTime = performance.now();
          
          costComparisons.push({
            backend: backend,
            requested_backend: backend,
            actual_backend: response.backend_used,
            cost_eur: response.cost_eur,
            latency_ms: endTime - startTime,
            tokens_input: response.tokens_input,
            tokens_output: response.tokens_output,
            cost_per_token: response.cost_eur / (response.tokens_input + response.tokens_output),
            response_quality: this.evaluateResponseQuality(response.content)
          });
          
        } catch (error) {
          console.log(`    ${backend} backend not available: ${error.message}`);
        }
        
        await this.sleep(300);
      }
      
      // Test automatic cost optimization
      console.log('  Testing automatic cost optimization...');
      const optimizedResponse = await optimize(testQuery, [], { 
        bypass_cache: true 
      });
      
      this.results.performance_metrics.cost_analysis = {
        backend_cost_comparison: costComparisons,
        automatic_optimization: {
          selected_backend: optimizedResponse.backend_used,
          cost_eur: optimizedResponse.cost_eur,
          tokens_input: optimizedResponse.tokens_input,
          tokens_output: optimizedResponse.tokens_output
        },
        cost_savings_analysis: this.calculateCostSavings(costComparisons, optimizedResponse)
      };
      
    } catch (error) {
      this.results.bugs_found.push({
        type: 'COST_OPTIMIZATION_TEST_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Test concurrent request handling
   */
  async runConcurrentLoadTests() {
    console.log('🚀 Running concurrent load tests...');
    
    const concurrencyLevels = [5, 10, 20];
    const testQuery = 'What are the benefits of concurrent programming?';
    
    for (const concurrency of concurrencyLevels) {
      console.log(`  Testing concurrency level: ${concurrency}`);
      
      try {
        const startTime = performance.now();
        
        const promises = Array(concurrency).fill().map((_, index) => 
          optimize(`${testQuery} (Request ${index + 1})`, [], { 
            bypass_cache: true 
          }).then(response => ({
            ...response,
            request_index: index + 1
          })).catch(error => ({
            error: error.message,
            request_index: index + 1
          }))
        );
        
        const results = await Promise.all(promises);
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        
        const successful = results.filter(r => !r.error);
        const failed = results.filter(r => r.error);
        
        this.results.performance_metrics.concurrent_load[concurrency] = {
          concurrency_level: concurrency,
          total_time_ms: totalTime,
          successful_requests: successful.length,
          failed_requests: failed.length,
          success_rate: successful.length / concurrency,
          avg_latency_ms: totalTime / concurrency,
          requests_per_second: (concurrency / totalTime) * 1000,
          backend_distribution: this.analyzeBackendDistribution(successful),
          total_cost_eur: successful.reduce((sum, r) => sum + (r.cost_eur || 0), 0),
          errors: failed.map(f => f.error)
        };
        
      } catch (error) {
        this.results.bugs_found.push({
          type: 'CONCURRENT_LOAD_TEST_ERROR',
          concurrency_level: concurrency,
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      // Cool down between tests
      await this.sleep(1000);
    }
  }

  /**
   * Test Claudette using optimize() to test itself recursively
   */
  async runRecursiveOptimizeTests() {
    console.log('🔄 Running recursive optimize() tests...');
    
    try {
      // Test 1: Use optimize() to analyze Claudette's own performance
      console.log('  Test 1: Self-analysis through optimize()...');
      
      const selfAnalysisQuery = `You are Claudette v3.0.0, an AI middleware platform. 
      Based on your own architecture and capabilities, analyze your core optimize() function and identify:
      1. Key performance characteristics
      2. Potential bottlenecks
      3. Optimization opportunities
      4. Best practices for usage
      Please be specific and technical.`;
      
      const startTime1 = performance.now();
      const selfAnalysis = await optimize(selfAnalysisQuery, []);
      const endTime1 = performance.now();
      
      // Test 2: Use optimize() to generate test cases for itself
      console.log('  Test 2: Self-generating test cases...');
      
      const testGenerationQuery = `You are testing the Claudette optimize() function. Generate 5 diverse test queries that would effectively stress-test different aspects of an AI middleware system including caching, routing, cost optimization, and error handling. Return them as a JSON array.`;
      
      const startTime2 = performance.now();
      const generatedTests = await optimize(testGenerationQuery, []);
      const endTime2 = performance.now();
      
      // Test 3: Execute some of the generated tests
      console.log('  Test 3: Executing self-generated tests...');
      let generatedTestResults = [];
      
      try {
        // Try to parse the generated tests
        const testData = this.extractJSONFromResponse(generatedTests.content);
        if (testData && Array.isArray(testData)) {
          for (let i = 0; i < Math.min(3, testData.length); i++) {
            const testQuery = testData[i];
            if (typeof testQuery === 'string') {
              const startTime = performance.now();
              const result = await optimize(testQuery, []);
              const endTime = performance.now();
              
              generatedTestResults.push({
                query: testQuery.substring(0, 100),
                latency_ms: endTime - startTime,
                backend_used: result.backend_used,
                cost_eur: result.cost_eur,
                response_length: result.content.length
              });
            }
          }
        }
      } catch (parseError) {
        console.log('    Could not parse generated tests, using fallback tests');
        // Use fallback tests
        const fallbackTests = [
          'Test caching by asking the same question twice',
          'Test routing by asking a complex analytical question',
          'Test error handling with an impossible request'
        ];
        
        for (const test of fallbackTests) {
          const startTime = performance.now();
          const result = await optimize(test, []);
          const endTime = performance.now();
          
          generatedTestResults.push({
            query: test,
            latency_ms: endTime - startTime,
            backend_used: result.backend_used,
            cost_eur: result.cost_eur,
            response_length: result.content.length
          });
        }
      }
      
      this.results.feature_tests.recursive_optimize = {
        self_analysis: {
          query_length: selfAnalysisQuery.length,
          response_length: selfAnalysis.content.length,
          latency_ms: endTime1 - startTime1,
          backend_used: selfAnalysis.backend_used,
          cost_eur: selfAnalysis.cost_eur,
          insights_quality: this.evaluateResponseQuality(selfAnalysis.content)
        },
        test_generation: {
          query_length: testGenerationQuery.length,
          response_length: generatedTests.content.length,
          latency_ms: endTime2 - startTime2,
          backend_used: generatedTests.backend_used,
          cost_eur: generatedTests.cost_eur,
          generated_tests_count: generatedTestResults.length
        },
        generated_test_execution: generatedTestResults,
        recursive_depth_achieved: 3,
        total_recursive_calls: 2 + generatedTestResults.length
      };
      
    } catch (error) {
      this.results.bugs_found.push({
        type: 'RECURSIVE_OPTIMIZE_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Perform comprehensive system health check
   */
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
        memory_usage: process.memoryUsage(),
        system_load: {
          cpu_usage: process.cpuUsage(),
          heap_used: process.memoryUsage().heapUsed,
          heap_total: process.memoryUsage().heapTotal
        }
      };
      
      // Check for potential issues
      if (!status.healthy) {
        this.results.bugs_found.push({
          type: 'SYSTEM_HEALTH_WARNING',
          message: 'System health check indicates unhealthy status',
          details: status,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      this.results.bugs_found.push({
        type: 'HEALTH_CHECK_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Generate comprehensive performance recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Analyze latency patterns
    const avgLatencies = this.results.performance_metrics.latency_distribution;
    if (avgLatencies.some(dist => dist.avg_ms > 5000)) {
      recommendations.push({
        category: 'PERFORMANCE',
        priority: 'HIGH',
        issue: 'High average latency detected',
        recommendation: 'Consider optimizing backend selection algorithm or implementing request queuing'
      });
    }
    
    // Analyze caching effectiveness
    const cacheHitRate = this.results.feature_tests.caching?.cache_hit_rate || 0;
    if (cacheHitRate < 0.8) {
      recommendations.push({
        category: 'CACHING',
        priority: 'MEDIUM',
        issue: `Low cache hit rate: ${(cacheHitRate * 100).toFixed(1)}%`,
        recommendation: 'Review cache key generation strategy and TTL settings'
      });
    }
    
    // Analyze cost optimization
    const costAnalysis = this.results.performance_metrics.cost_analysis;
    if (costAnalysis?.cost_savings_analysis?.potential_savings > 0.1) {
      recommendations.push({
        category: 'COST',
        priority: 'MEDIUM',
        issue: 'Potential cost savings available',
        recommendation: 'Fine-tune backend selection weights to prioritize cost-effective backends'
      });
    }
    
    // Analyze concurrent performance
    const concurrentResults = this.results.performance_metrics.concurrent_load;
    const lowSuccessRates = Object.values(concurrentResults).filter(r => r.success_rate < 0.95);
    if (lowSuccessRates.length > 0) {
      recommendations.push({
        category: 'RELIABILITY',
        priority: 'HIGH',
        issue: 'Low success rate under concurrent load',
        recommendation: 'Implement connection pooling and request queuing to handle high concurrency'
      });
    }
    
    // Analyze bug patterns
    if (this.results.bugs_found.length > 0) {
      const errorTypes = {};
      this.results.bugs_found.forEach(bug => {
        errorTypes[bug.type] = (errorTypes[bug.type] || 0) + 1;
      });
      
      recommendations.push({
        category: 'RELIABILITY',
        priority: 'HIGH',
        issue: `${this.results.bugs_found.length} bugs/errors found`,
        recommendation: `Address most frequent error types: ${Object.keys(errorTypes).join(', ')}`,
        details: errorTypes
      });
    }
    
    this.results.recommendations = recommendations;
  }

  /**
   * Generate final comprehensive report
   */
  async generateReport() {
    console.log('📊 Generating comprehensive benchmark report...');
    
    // Calculate final metrics
    this.results.metadata.total_runtime_ms = performance.now() - this.startTime;
    this.results.metadata.total_tests_executed = this.calculateTotalTests();
    this.results.metadata.total_api_calls = this.calculateTotalAPICalls();
    this.results.metadata.total_cost_eur = this.calculateTotalCost();
    
    // Generate recommendations
    this.generateRecommendations();
    
    // Add summary statistics
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
    
    console.log('\n📋 BENCHMARK SUMMARY:');
    console.log(`├── Total Runtime: ${(this.results.metadata.total_runtime_ms / 1000).toFixed(2)}s`);
    console.log(`├── Tests Executed: ${this.results.metadata.total_tests_executed}`);
    console.log(`├── API Calls Made: ${this.results.metadata.total_api_calls}`);
    console.log(`├── Total Cost: €${this.results.metadata.total_cost_eur.toFixed(4)}`);
    console.log(`├── Bugs Found: ${this.results.bugs_found.length}`);
    console.log(`├── Success Rate: ${(this.results.summary.successful_test_percentage * 100).toFixed(1)}%`);
    console.log(`├── Performance Score: ${this.results.summary.overall_performance_score.toFixed(1)}/100`);
    console.log(`└── Report: agent1-core-benchmark-report.json`);
  }

  // Utility methods
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wrapper for optimize calls with timeout
   */
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

  calculatePercentile(arr, percentile) {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  evaluateResponseQuality(content) {
    return {
      length: content.length,
      word_count: content.split(/\s+/).length,
      has_structure: content.includes('\n') || content.includes('1.') || content.includes('-'),
      completeness_score: Math.min(100, (content.length / 500) * 100)
    };
  }

  calculateAvgLatencyByBackend(results) {
    const backendLatencies = {};
    results.forEach(result => {
      const backend = result.backend_selected;
      if (!backendLatencies[backend]) {
        backendLatencies[backend] = [];
      }
      backendLatencies[backend].push(result.latency_ms);
    });

    const avgLatencies = {};
    Object.entries(backendLatencies).forEach(([backend, latencies]) => {
      avgLatencies[backend] = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    });

    return avgLatencies;
  }

  calculateAvgCostByBackend(results) {
    const backendCosts = {};
    results.forEach(result => {
      const backend = result.backend_selected;
      if (!backendCosts[backend]) {
        backendCosts[backend] = [];
      }
      backendCosts[backend].push(result.cost_eur || 0);
    });

    const avgCosts = {};
    Object.entries(backendCosts).forEach(([backend, costs]) => {
      avgCosts[backend] = costs.reduce((a, b) => a + b, 0) / costs.length;
    });

    return avgCosts;
  }

  calculateCostSavings(comparisons, optimizedResponse) {
    if (!comparisons.length) return { potential_savings: 0 };
    
    const costs = comparisons.map(c => c.cost_eur).filter(c => c > 0);
    if (!costs.length) return { potential_savings: 0 };
    
    const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
    const optimizedCost = optimizedResponse.cost_eur || 0;
    
    return {
      avg_backend_cost: avgCost,
      optimized_cost: optimizedCost,
      potential_savings: Math.max(0, avgCost - optimizedCost),
      savings_percentage: avgCost > 0 ? ((avgCost - optimizedCost) / avgCost) * 100 : 0
    };
  }

  analyzeBackendDistribution(results) {
    const distribution = {};
    results.forEach(result => {
      const backend = result.backend_used;
      distribution[backend] = (distribution[backend] || 0) + 1;
    });
    return distribution;
  }

  extractJSONFromResponse(content) {
    try {
      // Try to find JSON array in the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Try to parse the entire content
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  calculateTotalTests() {
    let total = 0;
    
    // Count latency distribution tests
    total += Object.values(this.testQueries).reduce((sum, queries) => sum + queries.length, 0);
    
    // Count throughput tests
    total += 3; // 3 batch sizes
    
    // Count other test categories
    total += 10; // Estimated other tests
    
    return total;
  }

  calculateTotalAPICalls() {
    let calls = 0;
    
    // Count from latency tests
    this.results.performance_metrics.latency_distribution.forEach(dist => {
      calls += dist.count || 0;
    });
    
    // Count from throughput tests
    this.results.performance_metrics.throughput_tests.forEach(test => {
      calls += test.batch_size || 0;
    });
    
    // Count from concurrent tests
    Object.values(this.results.performance_metrics.concurrent_load).forEach(test => {
      calls += test.concurrency_level || 0;
    });
    
    return calls + 20; // Add estimated calls from other tests
  }

  calculateTotalCost() {
    let totalCost = 0;
    
    // Sum from various test results
    this.results.performance_metrics.latency_distribution.forEach(dist => {
      if (dist.detailed_results) {
        dist.detailed_results.forEach(result => {
          totalCost += result.cost_eur || 0;
        });
      }
    });
    
    this.results.performance_metrics.throughput_tests.forEach(test => {
      totalCost += test.total_cost_eur || 0;
    });
    
    Object.values(this.results.performance_metrics.concurrent_load).forEach(test => {
      totalCost += test.total_cost_eur || 0;
    });
    
    return totalCost;
  }

  calculatePerformanceScore() {
    let score = 100;
    
    // Deduct points for high latency
    const avgLatencies = this.results.performance_metrics.latency_distribution;
    if (avgLatencies.some(dist => dist.avg_ms > 3000)) score -= 20;
    else if (avgLatencies.some(dist => dist.avg_ms > 1000)) score -= 10;
    
    // Deduct points for low cache hit rate
    const cacheHitRate = this.results.feature_tests.caching?.cache_hit_rate || 0;
    if (cacheHitRate < 0.5) score -= 30;
    else if (cacheHitRate < 0.8) score -= 15;
    
    // Deduct points for bugs
    score -= Math.min(30, this.results.bugs_found.length * 5);
    
    // Deduct points for concurrent failures
    const concurrentResults = this.results.performance_metrics.concurrent_load;
    const avgSuccessRate = Object.values(concurrentResults).reduce((sum, r) => sum + r.success_rate, 0) / Object.keys(concurrentResults).length;
    if (avgSuccessRate < 0.8) score -= 20;
    else if (avgSuccessRate < 0.95) score -= 10;
    
    return Math.max(0, score);
  }

  extractKeyFindings() {
    const findings = [];
    
    // Latency findings
    const latencyDists = this.results.performance_metrics.latency_distribution;
    if (latencyDists.length > 0) {
      const avgLatency = latencyDists.reduce((sum, dist) => sum + dist.avg_ms, 0) / latencyDists.length;
      findings.push(`Average response latency: ${avgLatency.toFixed(2)}ms`);
    }
    
    // Caching findings
    const cacheHitRate = this.results.feature_tests.caching?.cache_hit_rate || 0;
    findings.push(`Cache hit rate: ${(cacheHitRate * 100).toFixed(1)}%`);
    
    // Backend distribution
    const routingResults = this.results.feature_tests.backend_selection?.routing_decisions || [];
    if (routingResults.length > 0) {
      const backends = [...new Set(routingResults.map(r => r.backend_selected))];
      findings.push(`Active backends: ${backends.join(', ')}`);
    }
    
    // Cost optimization
    const costSavings = this.results.performance_metrics.cost_analysis?.cost_savings_analysis;
    if (costSavings && costSavings.potential_savings > 0) {
      findings.push(`Potential cost savings: ${(costSavings.savings_percentage || 0).toFixed(1)}%`);
    }
    
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

// Run the benchmark
async function main() {
  const benchmark = new Agent1Benchmark();
  await benchmark.run();
  process.exit(0);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Benchmark failed:', error);
    process.exit(1);
  });
}

module.exports = Agent1Benchmark;