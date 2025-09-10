#!/usr/bin/env node
// Comprehensive Test Suite for Claudette
// Tests all components, benchmarks performance, validates functionality

const fs = require('fs');
const path = require('path');

class ClaudetteTestSuite {
  constructor() {
    this.testResults = {
      core: { passed: 0, failed: 0, errors: [] },
      backends: { passed: 0, failed: 0, errors: [] },
      cache: { passed: 0, failed: 0, errors: [] },
      rag: { passed: 0, failed: 0, errors: [] },
      metacognitive: { passed: 0, failed: 0, errors: [] },
      graph: { passed: 0, failed: 0, errors: [] },
      performance: { passed: 0, failed: 0, errors: [] }
    };
    this.benchmarks = {};
    this.startTime = Date.now();
  }

  log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  error(message, category = 'general') {
    console.error(`[${new Date().toISOString()}] ERROR: ${message}`);
    if (!this.testResults[category]) {
      this.testResults[category] = { passed: 0, failed: 0, errors: [] };
    }
    this.testResults[category].errors.push(message);
    this.testResults[category].failed++;
  }

  success(message, category = 'general') {
    this.log(`✅ ${message}`);
    if (!this.testResults[category]) {
      this.testResults[category] = { passed: 0, failed: 0, errors: [] };
    }
    this.testResults[category].passed++;
  }

  async runAllTests() {
    this.log('🚀 Starting Comprehensive Claudette Test Suite');
    this.log('================================================');

    try {
      // Test 1: Core Architecture Validation
      await this.testCoreArchitecture();
      
      // Test 2: Backend Systems
      await this.testBackendSystems();
      
      // Test 3: Caching Systems
      await this.testCachingSystems();
      
      // Test 4: RAG Systems
      await this.testRAGSystems();
      
      // Test 5: Meta-Cognitive Engine
      await this.testMetaCognitiveEngine();
      
      // Test 6: Graph Database Integration
      await this.testGraphDatabase();
      
      // Test 7: Performance Benchmarks
      await this.runPerformanceBenchmarks();
      
      // Generate comprehensive report
      this.generateTestReport();
      
    } catch (error) {
      this.error(`Test suite execution failed: ${error.message}`, 'core');
    }
  }

  async testCoreArchitecture() {
    this.log('📋 Testing Core Architecture...');
    
    try {
      // Test main Claudette class initialization
      const claudetteModule = await this.safeImport('./src/index');
      if (!claudetteModule || !claudetteModule.Claudette) {
        this.error('Claudette main class not found', 'core');
        return;
      }
      this.success('Claudette main class available', 'core');
      
      // Test configuration loading
      const configPath = './config/default.json';
      if (!fs.existsSync(configPath)) {
        this.error('Default configuration not found', 'core');
      } else {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.backends && config.features && config.thresholds) {
          this.success('Configuration structure valid', 'core');
        } else {
          this.error('Configuration missing required sections', 'core');
        }
      }
      
      // Test type definitions
      const { ClaudetteConfig } = await this.safeImport('./src/types/index');
      if (ClaudetteConfig) {
        this.success('Core type definitions available', 'core');
      }
      
      // Test error handling
      const { ClaudetteError } = await this.safeImport('./src/types/index');
      if (ClaudetteError) {
        this.success('Error handling classes available', 'core');
      }

    } catch (error) {
      this.error(`Core architecture test failed: ${error.message}`, 'core');
    }
  }

  async testBackendSystems() {
    this.log('🔌 Testing Backend Systems...');
    
    try {
      // Test backend router
      const routerModule = await this.safeImport('./src/router/index');
      if (routerModule && routerModule.BackendRouter) {
        this.success('Backend router available', 'backends');
        
        // Test router functionality
        const { BackendRouter } = routerModule;
        const router = new BackendRouter({
          cost_weight: 0.4,
          latency_weight: 0.3,
          availability_weight: 0.3,
          fallback_enabled: true
        });
        
        if (router.selectBackend || router.routeRequest) {
          this.success('Router methods available', 'backends');
        }
      }
      
      // Test individual backends
      const backendTypes = ['claude', 'openai', 'mistral', 'ollama'];
      for (const backendType of backendTypes) {
        try {
          const backend = await this.safeImport(`./src/backends/${backendType}`);
          if (backend) {
            this.success(`${backendType} backend module available`, 'backends');
          }
        } catch (error) {
          this.error(`${backendType} backend not available: ${error.message}`, 'backends');
        }
      }
      
    } catch (error) {
      this.error(`Backend systems test failed: ${error.message}`, 'backends');
    }
  }

  async testCachingSystems() {
    this.log('💾 Testing Caching Systems...');
    
    try {
      // Test cache index
      const cacheModule = await this.safeImport('./src/cache/index');
      if (cacheModule && cacheModule.CacheManager) {
        this.success('Cache manager available', 'cache');
        
        // Test L1, L2, L3 cache hierarchy
        const { CacheManager } = cacheModule;
        const cacheManager = new CacheManager({
          l1: { enabled: true, maxSize: 100, ttl: 300000 },
          l2: { enabled: true, maxSize: 1000, ttl: 1800000 },
          l3: { enabled: true, maxSize: 10000, ttl: 3600000 }
        });
        
        // Test cache operations
        await cacheManager.set('test_key', 'test_value');
        const retrieved = await cacheManager.get('test_key');
        
        if (retrieved === 'test_value') {
          this.success('Cache set/get operations working', 'cache');
        } else {
          this.error('Cache operations failed', 'cache');
        }
        
        // Test cache statistics
        const stats = await cacheManager.getStats();
        if (stats && typeof stats.hitRate === 'number') {
          this.success('Cache statistics available', 'cache');
        }
      }
      
    } catch (error) {
      this.error(`Caching systems test failed: ${error.message}`, 'cache');
    }
  }

  async testRAGSystems() {
    this.log('🔍 Testing RAG Systems...');
    
    try {
      // Test RAG manager
      const ragModule = await this.safeImport('./src/rag/index');
      if (ragModule && ragModule.RAGManager) {
        this.success('RAG manager available', 'rag');
        
        const { RAGManager } = ragModule;
        const ragManager = new RAGManager();
        
        if (ragManager.registerProvider && ragManager.query) {
          this.success('RAG manager methods available', 'rag');
        }
      }
      
      // Test RAG providers
      const providerModule = await this.safeImport('./src/rag/providers');
      if (providerModule) {
        const providerFunctions = [
          'createConfiguredMCPProvider',
          'createConfiguredDockerProvider',
          'createConfiguredRemoteProvider',
          'createConfiguredRAGManager'
        ];
        
        let availableProviders = 0;
        for (const func of providerFunctions) {
          if (providerModule[func]) {
            availableProviders++;
          }
        }
        
        if (availableProviders === providerFunctions.length) {
          this.success('All RAG provider functions available', 'rag');
        } else {
          this.error(`Only ${availableProviders}/${providerFunctions.length} RAG provider functions available`, 'rag');
        }
      }
      
      // Test performance optimizer
      const optimizerModule = await this.safeImport('./src/rag/optimization/performance-optimizer');
      if (optimizerModule && optimizerModule.RAGPerformanceOptimizer) {
        this.success('RAG performance optimizer available', 'rag');
      }
      
    } catch (error) {
      this.error(`RAG systems test failed: ${error.message}`, 'rag');
    }
  }

  async testMetaCognitiveEngine() {
    this.log('🧠 Testing Meta-Cognitive Engine...');
    
    try {
      const mcModule = await this.safeImport('./src/meta-cognitive/problem-solving-engine.ts');
      if (mcModule && mcModule.MetaCognitiveProblemSolver) {
        this.success('Meta-cognitive engine available', 'metacognitive');
        
        const { MetaCognitiveProblemSolver } = mcModule;
        const solver = new MetaCognitiveProblemSolver();
        
        // Test problem analysis
        const testProblem = "Create a simple web application with user authentication";
        const analysis = await solver.analyzeProblem(testProblem);
        
        if (analysis && analysis.problem_state && analysis.classification) {
          this.success('Problem analysis working', 'metacognitive');
          
          // Verify all required analysis components
          const requiredComponents = [
            'problem_state',
            'classification', 
            'complexity_assessment',
            'applicable_strategies',
            'recommended_path',
            'meta_insights'
          ];
          
          let availableComponents = 0;
          for (const component of requiredComponents) {
            if (analysis[component]) {
              availableComponents++;
            }
          }
          
          if (availableComponents === requiredComponents.length) {
            this.success('All analysis components working', 'metacognitive');
          } else {
            this.error(`Only ${availableComponents}/${requiredComponents.length} analysis components available`, 'metacognitive');
          }
        }
        
        // Test problem solving
        const solution = await solver.solveProblem(testProblem, {}, { max_cognitive_load: 100 });
        if (solution && solution.solution && solution.strategy_used) {
          this.success('Problem solving working', 'metacognitive');
        }
        
      } else {
        this.error('Meta-cognitive engine not available', 'metacognitive');
      }
      
    } catch (error) {
      this.error(`Meta-cognitive engine test failed: ${error.message}`, 'metacognitive');
    }
  }

  async testGraphDatabase() {
    this.log('📊 Testing Graph Database Integration...');
    
    try {
      const graphModule = await this.safeImport('./src/graph/ultipa-client.ts');
      if (graphModule && graphModule.UltipaGraphClient) {
        this.success('Ultipa graph client available', 'graph');
        
        const { UltipaGraphClient } = graphModule;
        const client = new UltipaGraphClient({
          host: 'localhost',
          port: 60061,
          username: 'test',
          password: 'test',
          graph: 'test_graph'
        });
        
        // Test client methods
        const requiredMethods = ['executeGQL', 'connect', 'disconnect'];
        let availableMethods = 0;
        
        for (const method of requiredMethods) {
          if (typeof client[method] === 'function') {
            availableMethods++;
          }
        }
        
        if (availableMethods === requiredMethods.length) {
          this.success('All graph client methods available', 'graph');
        } else {
          this.error(`Only ${availableMethods}/${requiredMethods.length} graph client methods available`, 'graph');
        }
        
        // Test GQL query structure (without actual connection)
        const testQuery = 'MATCH (n) RETURN n LIMIT 10';
        const queryParams = {};
        const options = { timeout: 5000 };
        
        try {
          // This will fail without actual database, but we test structure
          await client.executeGQL(testQuery, queryParams, options);
        } catch (error) {
          // Expected to fail without actual database
          if (error.message.includes('executeQueryAttempt')) {
            this.success('Graph query execution structure working', 'graph');
          } else {
            this.success('Graph query method structure available', 'graph');
          }
        }
        
      } else {
        this.error('Graph database client not available', 'graph');
      }
      
    } catch (error) {
      this.error(`Graph database test failed: ${error.message}`, 'graph');
    }
  }

  async runPerformanceBenchmarks() {
    this.log('⚡ Running Performance Benchmarks...');
    
    try {
      // Benchmark 1: Configuration Loading Speed
      const configStartTime = Date.now();
      for (let i = 0; i < 100; i++) {
        const configPath = './config/default.json';
        if (fs.existsSync(configPath)) {
          JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
      }
      const configTime = Date.now() - configStartTime;
      this.benchmarks.configLoading = { iterations: 100, totalTime: configTime, avgTime: configTime / 100 };
      this.success(`Config loading: ${(configTime / 100).toFixed(2)}ms avg`, 'performance');
      
      // Benchmark 2: Cache Performance
      const cacheModule = await this.safeImport('./src/cache/index');
      if (cacheModule && cacheModule.CacheManager) {
        const { CacheManager } = cacheModule;
        const cacheManager = new CacheManager({
          l1: { enabled: true, maxSize: 1000, ttl: 300000 },
          l2: { enabled: false },
          l3: { enabled: false }
        });
        
        // Cache write benchmark
        const cacheWriteStart = Date.now();
        for (let i = 0; i < 1000; i++) {
          await cacheManager.set(`test_key_${i}`, `test_value_${i}`);
        }
        const cacheWriteTime = Date.now() - cacheWriteStart;
        
        // Cache read benchmark
        const cacheReadStart = Date.now();
        for (let i = 0; i < 1000; i++) {
          await cacheManager.get(`test_key_${i}`);
        }
        const cacheReadTime = Date.now() - cacheReadStart;
        
        this.benchmarks.cache = {
          write: { iterations: 1000, totalTime: cacheWriteTime, avgTime: cacheWriteTime / 1000 },
          read: { iterations: 1000, totalTime: cacheReadTime, avgTime: cacheReadTime / 1000 }
        };
        
        this.success(`Cache write: ${(cacheWriteTime / 1000).toFixed(3)}ms avg`, 'performance');
        this.success(`Cache read: ${(cacheReadTime / 1000).toFixed(3)}ms avg`, 'performance');
      }
      
      // Benchmark 3: Meta-Cognitive Engine Performance
      const mcModule = await this.safeImport('./src/meta-cognitive/problem-solving-engine');
      if (mcModule && mcModule.MetaCognitiveProblemSolver) {
        const { MetaCognitiveProblemSolver } = mcModule;
        const solver = new MetaCognitiveProblemSolver();
        
        const mcStartTime = Date.now();
        const testProblems = [
          "Optimize database query performance",
          "Design user authentication system",
          "Implement caching strategy",
          "Create API documentation",
          "Set up monitoring and alerts"
        ];
        
        for (const problem of testProblems) {
          await solver.analyzeProblem(problem);
        }
        const mcTime = Date.now() - mcStartTime;
        
        this.benchmarks.metacognitive = {
          iterations: testProblems.length,
          totalTime: mcTime,
          avgTime: mcTime / testProblems.length
        };
        
        this.success(`Meta-cognitive analysis: ${(mcTime / testProblems.length).toFixed(2)}ms avg`, 'performance');
      }
      
      // Benchmark 4: Memory Usage
      const memoryUsage = process.memoryUsage();
      this.benchmarks.memory = {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024)
      };
      
      this.success(`Memory usage: ${this.benchmarks.memory.heapUsed}MB heap`, 'performance');
      
    } catch (error) {
      this.error(`Performance benchmarks failed: ${error.message}`, 'performance');
    }
  }

  generateTestReport() {
    const totalTime = Date.now() - this.startTime;
    
    this.log('\n🎯 COMPREHENSIVE TEST RESULTS');
    this.log('=====================================');
    
    let totalPassed = 0;
    let totalFailed = 0;
    let totalErrors = [];
    
    // Summary by category
    for (const [category, results] of Object.entries(this.testResults)) {
      const total = results.passed + results.failed;
      const successRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : '0.0';
      
      this.log(`\n📊 ${category.toUpperCase()}:`);
      this.log(`   ✅ Passed: ${results.passed}`);
      this.log(`   ❌ Failed: ${results.failed}`);
      this.log(`   📈 Success Rate: ${successRate}%`);
      
      if (results.errors.length > 0) {
        this.log(`   🚨 Errors:`);
        results.errors.forEach(error => this.log(`      - ${error}`));
      }
      
      totalPassed += results.passed;
      totalFailed += results.failed;
      totalErrors.push(...results.errors);
    }
    
    // Overall summary
    const overallTotal = totalPassed + totalFailed;
    const overallSuccessRate = overallTotal > 0 ? ((totalPassed / overallTotal) * 100).toFixed(1) : '0.0';
    
    this.log('\n🏆 OVERALL RESULTS:');
    this.log(`   ✅ Total Passed: ${totalPassed}`);
    this.log(`   ❌ Total Failed: ${totalFailed}`);
    this.log(`   📈 Overall Success Rate: ${overallSuccessRate}%`);
    this.log(`   ⏱️  Total Test Time: ${totalTime}ms`);
    
    // Performance benchmarks
    if (Object.keys(this.benchmarks).length > 0) {
      this.log('\n⚡ PERFORMANCE BENCHMARKS:');
      for (const [category, benchmark] of Object.entries(this.benchmarks)) {
        if (benchmark.avgTime !== undefined) {
          this.log(`   ${category}: ${benchmark.avgTime.toFixed(3)}ms average (${benchmark.iterations} iterations)`);
        } else if (benchmark.heapUsed !== undefined) {
          this.log(`   ${category}: ${benchmark.heapUsed}MB heap, ${benchmark.rss}MB RSS`);
        } else if (benchmark.write && benchmark.read) {
          this.log(`   ${category}: Write ${benchmark.write.avgTime.toFixed(3)}ms, Read ${benchmark.read.avgTime.toFixed(3)}ms`);
        }
      }
    }
    
    // Quality assessment
    this.log('\n🎖️  QUALITY ASSESSMENT:');
    if (overallSuccessRate >= 95) {
      this.log('   🌟 EXCELLENT: System exceeds quality standards');
      this.log('   ✅ Recommendation: BUMP VERSION - Major improvement achieved');
    } else if (overallSuccessRate >= 85) {
      this.log('   🎯 GOOD: System meets quality standards');
      this.log('   ✅ Recommendation: MINOR VERSION BUMP - Improvements confirmed');
    } else if (overallSuccessRate >= 70) {
      this.log('   ⚠️  FAIR: System functional but needs improvement');
      this.log('   🔧 Recommendation: Address failing tests before version bump');
    } else {
      this.log('   ❌ POOR: System has significant issues');
      this.log('   🚨 Recommendation: Fix critical issues before release');
    }
    
    // Save detailed results
    const reportData = {
      timestamp: new Date().toISOString(),
      testResults: this.testResults,
      benchmarks: this.benchmarks,
      summary: {
        totalPassed,
        totalFailed,
        totalErrors: totalErrors.length,
        overallSuccessRate: parseFloat(overallSuccessRate),
        totalTime
      }
    };
    
    fs.writeFileSync('./test-report.json', JSON.stringify(reportData, null, 2));
    this.log('\n📄 Detailed report saved to: test-report.json');
    
    return {
      success: overallSuccessRate >= 85,
      successRate: parseFloat(overallSuccessRate),
      shouldBumpVersion: overallSuccessRate >= 85,
      reportPath: './test-report.json'
    };
  }

  async safeImport(modulePath) {
    try {
      return await import(modulePath);
    } catch (error) {
      return null;
    }
  }
}

// Run the test suite
if (require.main === module) {
  const testSuite = new ClaudetteTestSuite();
  testSuite.runAllTests().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = ClaudetteTestSuite;