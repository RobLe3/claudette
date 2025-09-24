#!/usr/bin/env node

/**
 * HTTP API Benchmark
 * Tests Claudette HTTP server performance with REST API calls
 */

const { startHttpServer } = require('./dist/server/http-server.js');
const { performance } = require('perf_hooks');

class ApiBenchmark {
  constructor() {
    this.server = null;
    this.port = 3456; // Use different port to avoid conflicts
    this.baseUrl = `http://localhost:${this.port}`;
    this.results = {
      server_startup: {},
      health_checks: [],
      api_requests: {
        simple: [],
        complex: [],
        concurrent: []
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
    console.log('🌐 Claudette HTTP API Benchmark');
    console.log('=================================\n');

    try {
      // Memory baseline
      this.results.memory.start = this.getMemoryUsage();

      // Test 1: Server Startup
      await this.benchmarkServerStartup();

      // Test 2: Health Check Performance
      await this.benchmarkHealthChecks();

      // Test 3: API Request Performance
      await this.benchmarkApiRequests();

      // Test 4: Concurrent Request Handling
      await this.benchmarkConcurrentRequests();

      // Memory peak
      this.results.memory.peak = this.getMemoryUsage();

      // Generate report
      this.generateReport();

      // Cleanup
      await this.cleanup();
      this.results.memory.end = this.getMemoryUsage();

    } catch (error) {
      console.error('❌ API Benchmark failed:', error.message);
      this.results.errors.push(error.message);
    }
  }

  async benchmarkServerStartup() {
    console.log('🚀 Testing HTTP Server Startup...');
    const start = performance.now();
    
    try {
      this.server = await startHttpServer(this.port);
      const duration = performance.now() - start;
      
      this.results.server_startup = {
        duration,
        success: true
      };
      
      console.log(`   ✅ Server startup: ${duration.toFixed(2)}ms\n`);
      
      // Wait for server to be fully ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      const duration = performance.now() - start;
      this.results.server_startup = {
        duration,
        error: error.message,
        success: false
      };
      throw error;
    }
  }

  async benchmarkHealthChecks() {
    console.log('❤️ Testing Health Check Performance...');
    
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      
      try {
        const response = await fetch(`${this.baseUrl}/health`, {
          signal: AbortSignal.timeout(5000)
        });
        
        const duration = performance.now() - start;
        const data = await response.json();
        
        this.results.health_checks.push({
          duration,
          status: response.status,
          healthy: data.status === 'ok',
          success: true
        });
        
        console.log(`   ✅ Health check ${i+1}: ${duration.toFixed(2)}ms (${data.status})`);
        
      } catch (error) {
        const duration = performance.now() - start;
        this.results.health_checks.push({
          duration,
          error: error.message,
          success: false
        });
        console.log(`   ❌ Health check ${i+1}: Failed (${duration.toFixed(2)}ms)`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    console.log();
  }

  async benchmarkApiRequests() {
    console.log('💬 Testing API Request Performance...');
    
    const testRequests = [
      {
        type: 'simple',
        payload: {
          prompt: "What is 2+2?",
          options: { timeout: 10000 }
        }
      },
      {
        type: 'simple',
        payload: {
          prompt: "Hello world",
          options: { timeout: 10000 }
        }
      },
      {
        type: 'complex',
        payload: {
          prompt: "Explain the architecture of modern web applications including frontend frameworks, backend APIs, databases, and deployment strategies.",
          options: { timeout: 15000 }
        }
      }
    ];

    for (let i = 0; i < testRequests.length; i++) {
      const request = testRequests[i];
      const start = performance.now();
      
      try {
        const response = await fetch(`${this.baseUrl}/api/optimize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(request.payload),
          signal: AbortSignal.timeout(request.payload.options?.timeout || 10000)
        });
        
        const duration = performance.now() - start;
        const data = await response.json();
        
        this.results.api_requests[request.type].push({
          prompt: request.payload.prompt.substring(0, 30) + '...',
          duration,
          status: response.status,
          backend: data.backend_used || 'unknown',
          tokens_input: data.tokens_input || 0,
          tokens_output: data.tokens_output || 0,
          success: response.ok
        });
        
        console.log(`   ✅ ${request.type} request ${i+1}: ${duration.toFixed(2)}ms (${data.backend_used || 'unknown'})`);
        
      } catch (error) {
        const duration = performance.now() - start;
        this.results.api_requests[request.type].push({
          prompt: request.payload.prompt.substring(0, 30) + '...',
          duration,
          error: error.message,
          success: false
        });
        console.log(`   ❌ ${request.type} request ${i+1}: Failed (${duration.toFixed(2)}ms) - ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    console.log();
  }

  async benchmarkConcurrentRequests() {
    console.log('⚡ Testing Concurrent Request Handling...');
    
    const concurrentCount = 3;
    const promises = [];
    const startTime = performance.now();
    
    for (let i = 0; i < concurrentCount; i++) {
      const promise = this.makeConcurrentRequest(i + 1);
      promises.push(promise);
    }
    
    try {
      const results = await Promise.all(promises);
      const totalDuration = performance.now() - startTime;
      
      this.results.api_requests.concurrent = results;
      
      const successful = results.filter(r => r.success).length;
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      
      console.log(`   ✅ Concurrent requests: ${successful}/${concurrentCount} successful`);
      console.log(`   ✅ Total time: ${totalDuration.toFixed(2)}ms`);
      console.log(`   ✅ Average per request: ${avgDuration.toFixed(2)}ms`);
      
    } catch (error) {
      console.log(`   ❌ Concurrent test failed: ${error.message}`);
      this.results.errors.push(error.message);
    }
    console.log();
  }

  async makeConcurrentRequest(id) {
    const start = performance.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/api/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: `Concurrent test request ${id}: What is the meaning of life?`,
          options: { timeout: 10000 }
        }),
        signal: AbortSignal.timeout(10000)
      });
      
      const duration = performance.now() - start;
      const data = await response.json();
      
      return {
        id,
        duration,
        status: response.status,
        backend: data.backend_used || 'unknown',
        success: response.ok
      };
      
    } catch (error) {
      const duration = performance.now() - start;
      return {
        id,
        duration,
        error: error.message,
        success: false
      };
    }
  }

  generateReport() {
    console.log('📊 HTTP API Benchmark Results');
    console.log('=============================\n');

    // Server startup
    console.log('🚀 Server Startup:');
    console.log(`   Duration: ${this.results.server_startup.duration?.toFixed(2) || 'N/A'}ms\n`);

    // Health checks
    const healthSuccessful = this.results.health_checks.filter(h => h.success);
    if (healthSuccessful.length > 0) {
      const avgHealth = healthSuccessful.reduce((sum, h) => sum + h.duration, 0) / healthSuccessful.length;
      console.log('❤️ Health Checks:');
      console.log(`   Count: ${healthSuccessful.length}/${this.results.health_checks.length}`);
      console.log(`   Average: ${avgHealth.toFixed(2)}ms\n`);
    }

    // API requests
    const simpleSuccessful = this.results.api_requests.simple.filter(r => r.success);
    if (simpleSuccessful.length > 0) {
      const avgSimple = simpleSuccessful.reduce((sum, r) => sum + r.duration, 0) / simpleSuccessful.length;
      console.log('💬 Simple API Requests:');
      console.log(`   Count: ${simpleSuccessful.length}/${this.results.api_requests.simple.length}`);
      console.log(`   Average: ${avgSimple.toFixed(2)}ms`);
    }

    const complexSuccessful = this.results.api_requests.complex.filter(r => r.success);
    if (complexSuccessful.length > 0) {
      const avgComplex = complexSuccessful.reduce((sum, r) => sum + r.duration, 0) / complexSuccessful.length;
      console.log('🧠 Complex API Requests:');
      console.log(`   Count: ${complexSuccessful.length}/${this.results.api_requests.complex.length}`);
      console.log(`   Average: ${avgComplex.toFixed(2)}ms`);
    }

    // Concurrent requests
    const concurrentSuccessful = this.results.api_requests.concurrent.filter(r => r.success);
    if (concurrentSuccessful.length > 0) {
      const avgConcurrent = concurrentSuccessful.reduce((sum, r) => sum + r.duration, 0) / concurrentSuccessful.length;
      console.log('⚡ Concurrent Requests:');
      console.log(`   Count: ${concurrentSuccessful.length}/${this.results.api_requests.concurrent.length}`);
      console.log(`   Average: ${avgConcurrent.toFixed(2)}ms`);
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

    console.log('\n✅ HTTP API benchmark completed successfully!');
  }

  getMemoryUsage() {
    const used = process.memoryUsage();
    return used.rss / 1024 / 1024; // Convert to MB
  }

  async cleanup() {
    if (this.server) {
      await this.server.stop();
    }
  }
}

// Run benchmark if called directly
if (require.main === module) {
  const benchmark = new ApiBenchmark();
  benchmark.run().catch(console.error);
}

module.exports = { ApiBenchmark };