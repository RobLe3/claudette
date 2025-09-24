#!/usr/bin/env node

/**
 * Native Claudette Benchmark
 * Tests direct library usage performance with comprehensive metrics
 */

const { Claudette } = require('./dist/index.js');
const { performance } = require('perf_hooks');

class NativeBenchmark {
  constructor() {
    this.claudette = new Claudette();
    this.results = {
      initialization: {},
      requests: {
        simple: [],
        complex: [],
        cached: []
      },
      memory: {
        start: 0,
        peak: 0,
        end: 0
      },
      errors: []
    };
  }

  async run() {
    console.log('🚀 Claudette Native Benchmark');
    console.log('==============================\n');

    // Set benchmark environment variables for optimized performance
    process.env.CLAUDETTE_BENCHMARK = '1';
    process.env.NODE_ENV = 'test';
    process.env.CLAUDETTE_DEBUG = '0';

    try {
      // Memory baseline
      this.results.memory.start = this.getMemoryUsage();

      // Test 1: Initialization Performance
      await this.benchmarkInitialization();

      // Test 2: Simple Requests
      await this.benchmarkSimpleRequests();

      // Test 3: Complex Requests
      await this.benchmarkComplexRequests();

      // Test 4: Cache Performance
      await this.benchmarkCachePerformance();

      // Memory peak
      this.results.memory.peak = this.getMemoryUsage();

      // Generate report
      this.generateReport();

      // Cleanup
      await this.cleanup();
      this.results.memory.end = this.getMemoryUsage();

    } catch (error) {
      console.error('❌ Benchmark failed:', error.message);
      this.results.errors.push(error.message);
    }
  }

  async benchmarkInitialization() {
    console.log('🔧 Testing Initialization Performance...');
    const start = performance.now();
    
    await this.claudette.initialize();
    
    const duration = performance.now() - start;
    this.results.initialization = {
      duration,
      success: true
    };
    
    console.log(`   ✅ Initialization: ${duration.toFixed(2)}ms\n`);
  }

  async benchmarkSimpleRequests() {
    console.log('💬 Testing Simple Requests (mock backend)...');
    
    const simplePrompts = [
      "What is 2+2?",
      "Hello world",
      "Explain AI in one sentence",
      "What time is it?",
      "Generate a random number"
    ];

    for (let i = 0; i < simplePrompts.length; i++) {
      const prompt = simplePrompts[i];
      const start = performance.now();
      
      try {
        const response = await this.claudette.optimize(prompt, [], {
          bypass_cache: true,
          timeout: 10000
        });
        
        const duration = performance.now() - start;
        
        this.results.requests.simple.push({
          prompt: prompt.substring(0, 30) + '...',
          duration,
          tokens_input: response.tokens_input || 0,
          tokens_output: response.tokens_output || 0,
          backend: response.backend_used,
          success: true
        });
        
        console.log(`   ✅ Request ${i+1}: ${duration.toFixed(2)}ms (${response.backend_used})`);
        
      } catch (error) {
        const duration = performance.now() - start;
        this.results.requests.simple.push({
          prompt: prompt.substring(0, 30) + '...',
          duration,
          error: error.message,
          success: false
        });
        console.log(`   ❌ Request ${i+1}: Failed (${duration.toFixed(2)}ms) - ${error.message}`);
      }
      
      // Brief pause between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.log();
  }

  async benchmarkComplexRequests() {
    console.log('🧠 Testing Complex Requests...');
    
    const complexPrompts = [
      "Analyze the performance characteristics of distributed systems and explain the CAP theorem with practical examples.",
      "Write a detailed technical specification for a microservices architecture including API design, data consistency patterns, and monitoring strategies."
    ];

    for (let i = 0; i < complexPrompts.length; i++) {
      const prompt = complexPrompts[i];
      const start = performance.now();
      
      try {
        const response = await this.claudette.optimize(prompt, [], {
          bypass_cache: true,
          timeout: 60000
        });
        
        const duration = performance.now() - start;
        
        this.results.requests.complex.push({
          prompt: prompt.substring(0, 50) + '...',
          duration,
          tokens_input: response.tokens_input || 0,
          tokens_output: response.tokens_output || 0,
          backend: response.backend_used,
          success: true
        });
        
        console.log(`   ✅ Complex ${i+1}: ${duration.toFixed(2)}ms (${response.backend_used})`);
        
      } catch (error) {
        const duration = performance.now() - start;
        this.results.requests.complex.push({
          prompt: prompt.substring(0, 50) + '...',
          duration,
          error: error.message,
          success: false
        });
        console.log(`   ❌ Complex ${i+1}: Failed (${duration.toFixed(2)}ms) - ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    console.log();
  }

  async benchmarkCachePerformance() {
    console.log('🗄️ Testing Cache Performance...');
    
    const cachePrompt = "Test cache performance with this specific prompt";
    
    // First request (miss)
    console.log('   Testing cache miss...');
    let start = performance.now();
    
    try {
      const response1 = await this.claudette.optimize(cachePrompt, [], {
        bypass_cache: false,
        timeout: 10000
      });
      
      const duration1 = performance.now() - start;
      console.log(`   ✅ Cache miss: ${duration1.toFixed(2)}ms`);
      
      // Second request (should be hit)
      console.log('   Testing cache hit...');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      start = performance.now();
      const response2 = await this.claudette.optimize(cachePrompt, [], {
        bypass_cache: false,
        timeout: 10000
      });
      
      const duration2 = performance.now() - start;
      
      this.results.requests.cached.push({
        cache_miss_duration: duration1,
        cache_hit_duration: duration2,
        improvement_ratio: duration1 / duration2,
        cache_hit: response2.cache_hit || false,
        success: true
      });
      
      console.log(`   ✅ Cache hit: ${duration2.toFixed(2)}ms (${(duration1/duration2).toFixed(2)}x faster)`);
      
    } catch (error) {
      this.results.requests.cached.push({
        error: error.message,
        success: false
      });
      console.log(`   ❌ Cache test failed: ${error.message}`);
    }
    console.log();
  }

  generateReport() {
    console.log('📊 Benchmark Results');
    console.log('====================\n');

    // Initialization
    console.log('🔧 Initialization:');
    console.log(`   Duration: ${this.results.initialization.duration?.toFixed(2) || 'N/A'}ms\n`);

    // Simple requests
    const simpleSuccessful = this.results.requests.simple.filter(r => r.success);
    if (simpleSuccessful.length > 0) {
      const avgSimple = simpleSuccessful.reduce((sum, r) => sum + r.duration, 0) / simpleSuccessful.length;
      const minSimple = Math.min(...simpleSuccessful.map(r => r.duration));
      const maxSimple = Math.max(...simpleSuccessful.map(r => r.duration));
      
      console.log('💬 Simple Requests:');
      console.log(`   Count: ${simpleSuccessful.length}/${this.results.requests.simple.length}`);
      console.log(`   Average: ${avgSimple.toFixed(2)}ms`);
      console.log(`   Min: ${minSimple.toFixed(2)}ms`);
      console.log(`   Max: ${maxSimple.toFixed(2)}ms`);
    }

    // Complex requests
    const complexSuccessful = this.results.requests.complex.filter(r => r.success);
    if (complexSuccessful.length > 0) {
      const avgComplex = complexSuccessful.reduce((sum, r) => sum + r.duration, 0) / complexSuccessful.length;
      
      console.log('🧠 Complex Requests:');
      console.log(`   Count: ${complexSuccessful.length}/${this.results.requests.complex.length}`);
      console.log(`   Average: ${avgComplex.toFixed(2)}ms`);
    }

    // Cache performance
    const cacheSuccessful = this.results.requests.cached.filter(r => r.success);
    if (cacheSuccessful.length > 0) {
      const cache = cacheSuccessful[0];
      console.log('🗄️ Cache Performance:');
      console.log(`   Cache miss: ${cache.cache_miss_duration?.toFixed(2) || 'N/A'}ms`);
      console.log(`   Cache hit: ${cache.cache_hit_duration?.toFixed(2) || 'N/A'}ms`);
      console.log(`   Speed improvement: ${cache.improvement_ratio?.toFixed(2) || 'N/A'}x`);
    }

    // Memory usage
    console.log('🧠 Memory Usage:');
    console.log(`   Start: ${this.results.memory.start.toFixed(2)}MB`);
    console.log(`   Peak: ${this.results.memory.peak.toFixed(2)}MB`);
    console.log(`   End: ${this.results.memory.end.toFixed(2)}MB`);
    console.log(`   Growth: ${(this.results.memory.peak - this.results.memory.start).toFixed(2)}MB`);

    // Errors
    if (this.results.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    console.log('\n✅ Native benchmark completed successfully!');
  }

  getMemoryUsage() {
    const used = process.memoryUsage();
    return used.rss / 1024 / 1024; // Convert to MB
  }

  async cleanup() {
    await this.claudette.cleanup();
  }
}

// Run benchmark if called directly
if (require.main === module) {
  const benchmark = new NativeBenchmark();
  benchmark.run().catch(console.error);
}

module.exports = { NativeBenchmark };