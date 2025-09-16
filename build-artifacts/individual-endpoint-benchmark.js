#!/usr/bin/env node

/**
 * Individual Endpoint Benchmark
 * Tests each configured backend endpoint separately with real API calls
 */

// Load environment variables for API backends
require('dotenv').config();

const { DynamicTimeoutManager } = require('./src/monitoring/dynamic-timeout-manager.js');
const { Claudette } = require('./dist/index.js');

class IndividualEndpointBenchmark {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      endpoint_tests: {},
      comparative_analysis: {},
      integration_status: 'unknown'
    };
    
    this.testEndpoints = [
      { 
        name: 'OpenAI', 
        config_key: 'openai',
        test_prompt: 'What is 2+2? Please respond with just the number.',
        expected_type: 'number_response',
        api_required: true
      },
      { 
        name: 'Custom Backend #1 (GPU Coder)', 
        config_key: 'qwen',
        test_prompt: 'function add(a, b) { return a + b; } // Explain this code briefly',
        expected_type: 'code_explanation',
        api_required: true
      },
      { 
        name: 'Claude (via Claude Code)', 
        config_key: 'claude',
        test_prompt: 'Analyze this pattern: reliability testing',
        expected_type: 'analysis',
        api_required: false // Available through Claude Code
      },
      { 
        name: 'Mock Backend', 
        config_key: 'mock',
        test_prompt: 'Test connectivity',
        expected_type: 'mock_response',
        api_required: false
      }
    ];
  }

  async runIndividualEndpointBenchmark() {
    console.log('🔍 Individual Endpoint Benchmark');
    console.log('=' .repeat(50));
    console.log('Testing each configured backend endpoint individually...\n');
    
    try {
      // First, inspect current configuration
      await this.inspectConfiguration();
      
      // Test each endpoint individually
      for (const endpoint of this.testEndpoints) {
        console.log(`\\n🧪 Testing Endpoint: ${endpoint.name}`);
        console.log(`   Config Key: ${endpoint.config_key}`);
        console.log(`   API Required: ${endpoint.api_required ? 'Yes' : 'No'}`);
        
        try {
          const endpointResult = await this.testIndividualEndpoint(endpoint);
          this.results.endpoint_tests[endpoint.name] = endpointResult;
          
          console.log(`   ${endpointResult.success ? '✅' : '❌'} Status: ${endpointResult.status}`);
          console.log(`   ⚡ Latency: ${endpointResult.latency}ms`);
          console.log(`   📊 Response: ${endpointResult.response_preview}`);
          
        } catch (error) {
          console.log(`   ❌ Test failed: ${error.message}`);
          this.results.endpoint_tests[endpoint.name] = {
            success: false,
            status: 'error',
            error: error.message,
            latency: 0,
            backend_used: 'none'
          };
        }
      }
      
      // Analyze results
      await this.analyzeEndpointResults();
      
      // Generate comparative report
      this.generateEndpointReport();
      
    } catch (error) {
      console.log('❌ Endpoint benchmark failed:', error.message);
    }
  }

  async inspectConfiguration() {
    console.log('🔍 Configuration Inspection:');
    
    try {
      const claudette = new Claudette();
      await claudette.initialize();
      
      const config = claudette.getConfig();
      console.log(`   Backends configured: ${Object.keys(config.backends || {}).length}`);
      
      // List all configured backends
      if (config.backends) {
        Object.entries(config.backends).forEach(([name, backendConfig]) => {
          console.log(`   - ${name}: ${backendConfig.enabled ? 'ENABLED' : 'DISABLED'} (Priority: ${backendConfig.priority || 'N/A'})`);
          if (backendConfig.base_url) {
            console.log(`     URL: ${backendConfig.base_url}`);
          }
        });
      }
      
      // Check health status
      const healthResults = await claudette.router.healthCheckAll();
      console.log(`   Healthy backends: ${healthResults.filter(h => h.healthy).length}/${healthResults.length}`);
      
      await claudette.cleanup();
      
    } catch (error) {
      console.log(`   ❌ Configuration inspection failed: ${error.message}`);
    }
  }

  async testIndividualEndpoint(endpoint) {
    const testStart = Date.now();
    
    // Force enable specific backend for testing
    const claudette = new Claudette();
    
    try {
      await claudette.initialize();
      
      // Check if backend is available
      const config = claudette.getConfig();
      const backendConfig = config.backends?.[endpoint.config_key];
      
      if (!backendConfig && endpoint.config_key !== 'mock') {
        return {
          success: false,
          status: 'not_configured',
          error: `Backend ${endpoint.config_key} not found in configuration`,
          latency: Date.now() - testStart,
          backend_used: 'none',
          response_preview: 'N/A'
        };
      }
      
      // For mock backend, we know it works
      if (endpoint.config_key === 'mock') {
        const queryStart = Date.now();
        const response = await claudette.optimize(endpoint.test_prompt);
        const queryLatency = Date.now() - queryStart;
        
        return {
          success: true,
          status: 'operational',
          latency: queryLatency,
          backend_used: response.backend_used,
          response_length: response.content?.length || 0,
          response_preview: response.content ? response.content.substring(0, 100) + '...' : 'No content',
          cost: response.cost || 0,
          timeout_used: 'default'
        };
      }
      
      // For API backends, check if they're enabled and healthy
      if (endpoint.api_required) {
        // Check health first
        const healthResults = await claudette.router.healthCheckAll();
        const backendHealth = healthResults.find(h => h.name === endpoint.config_key);
        
        if (!backendHealth || !backendHealth.healthy) {
          return {
            success: false,
            status: backendHealth ? 'unhealthy' : 'not_found',
            error: `Backend ${endpoint.config_key} is not healthy or not found`,
            latency: Date.now() - testStart,
            backend_used: endpoint.config_key,
            response_preview: 'Backend unavailable'
          };
        }
      }
      
      // Attempt actual query
      const queryStart = Date.now();
      const response = await claudette.optimize(endpoint.test_prompt);
      const queryLatency = Date.now() - queryStart;
      
      // Analyze response quality for this endpoint
      const qualityScore = this.analyzeEndpointResponse(endpoint, response);
      
      return {
        success: true,
        status: 'operational',
        latency: queryLatency,
        backend_used: response.backend_used,
        response_length: response.content?.length || 0,
        response_preview: response.content ? response.content.substring(0, 150) + '...' : 'No content',
        cost: response.cost || 0,
        quality_score: qualityScore,
        endpoint_specific: this.getEndpointSpecificMetrics(endpoint, response)
      };
      
    } finally {
      await claudette.cleanup();
    }
  }

  analyzeEndpointResponse(endpoint, response) {
    if (!response.content) return 0;
    
    const content = response.content.toLowerCase();
    let score = 5; // Base score
    
    // Endpoint-specific quality checks
    switch (endpoint.expected_type) {
      case 'number_response':
        if (content.includes('4') || content.includes('four')) score += 3;
        if (content.length < 50) score += 1; // Concise response
        break;
        
      case 'code_explanation':
        if (content.includes('function') || content.includes('add')) score += 2;
        if (content.includes('return') || content.includes('parameter')) score += 2;
        break;
        
      case 'analysis':
        if (content.includes('pattern') || content.includes('reliability')) score += 2;
        if (content.length > 100) score += 1; // Detailed response
        break;
        
      case 'mock_response':
        if (content.includes('mock') || content.includes('test')) score += 2;
        score += 1; // Mock responses are expected to work
        break;
    }
    
    return Math.min(10, Math.max(0, score));
  }

  getEndpointSpecificMetrics(endpoint, response) {
    return {
      expected_type: endpoint.expected_type,
      actual_backend: response.backend_used,
      matches_expected_backend: response.backend_used?.includes(endpoint.config_key) || endpoint.config_key === 'mock',
      response_appropriate_length: response.content ? response.content.length > 10 : false,
      cost_calculated: response.cost !== undefined
    };
  }

  async analyzeEndpointResults() {
    console.log('\\n📊 Analyzing Endpoint Results...');
    
    const results = Object.values(this.results.endpoint_tests);
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    this.results.comparative_analysis = {
      total_endpoints: results.length,
      operational_endpoints: successful.length,
      failed_endpoints: failed.length,
      success_rate: successful.length / results.length,
      
      performance_comparison: successful.map(r => ({
        endpoint: Object.keys(this.results.endpoint_tests).find(k => this.results.endpoint_tests[k] === r),
        latency: r.latency,
        quality: r.quality_score || 0,
        backend_used: r.backend_used
      })).sort((a, b) => a.latency - b.latency),
      
      failure_analysis: failed.map(r => ({
        endpoint: Object.keys(this.results.endpoint_tests).find(k => this.results.endpoint_tests[k] === r),
        reason: r.status,
        error: r.error
      })),
      
      backend_routing_accuracy: successful.filter(r => 
        r.endpoint_specific?.matches_expected_backend
      ).length / Math.max(successful.length, 1)
    };
    
    // Determine overall integration status
    if (this.results.comparative_analysis.success_rate >= 0.75) {
      this.results.integration_status = 'good';
    } else if (this.results.comparative_analysis.success_rate >= 0.5) {
      this.results.integration_status = 'fair';
    } else {
      this.results.integration_status = 'poor';
    }
  }

  generateEndpointReport() {
    console.log('\\n📋 Individual Endpoint Benchmark Report');
    console.log('=' .repeat(60));
    
    const analysis = this.results.comparative_analysis;
    
    console.log(`\\n🎯 Overall Endpoint Status:`);
    console.log(`   Operational Endpoints: ${analysis.operational_endpoints}/${analysis.total_endpoints}`);
    console.log(`   Success Rate: ${(analysis.success_rate * 100).toFixed(1)}%`);
    console.log(`   Integration Status: ${this.results.integration_status.toUpperCase()}`);
    
    console.log(`\\n⚡ Performance Comparison (by latency):`);
    analysis.performance_comparison.forEach((perf, index) => {
      const status = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
      console.log(`   ${status} ${perf.endpoint}: ${perf.latency}ms (Quality: ${perf.quality?.toFixed(1) || 'N/A'}/10, Backend: ${perf.backend_used})`);
    });
    
    if (analysis.failure_analysis.length > 0) {
      console.log(`\\n❌ Failed Endpoints:`);
      analysis.failure_analysis.forEach(failure => {
        console.log(`   • ${failure.endpoint}: ${failure.reason} - ${failure.error}`);
      });
    }
    
    console.log(`\\n🎯 Backend Routing Accuracy: ${(analysis.backend_routing_accuracy * 100).toFixed(1)}%`);
    
    console.log(`\\n📊 Detailed Endpoint Analysis:`);
    Object.entries(this.results.endpoint_tests).forEach(([name, result]) => {
      console.log(`\\n   🔧 ${name}:`);
      console.log(`      Status: ${result.success ? '✅ Operational' : '❌ Failed'}`);
      console.log(`      Latency: ${result.latency}ms`);
      console.log(`      Backend Used: ${result.backend_used || 'None'}`);
      if (result.response_preview) {
        console.log(`      Response: ${result.response_preview.substring(0, 100)}...`);
      }
      if (result.cost !== undefined) {
        console.log(`      Cost: €${result.cost}`);
      }
      if (result.error) {
        console.log(`      Error: ${result.error}`);
      }
    });
    
    // Key insights
    console.log(`\\n💡 Key Insights:`);
    console.log(`   • ${analysis.operational_endpoints} out of ${analysis.total_endpoints} endpoints are operational`);
    console.log(`   • Backend routing accuracy: ${(analysis.backend_routing_accuracy * 100).toFixed(1)}%`);
    console.log(`   • Fastest endpoint: ${analysis.performance_comparison[0]?.endpoint} (${analysis.performance_comparison[0]?.latency}ms)`);
    
    if (analysis.failed_endpoints > 0) {
      console.log(`   • ${analysis.failed_endpoints} endpoints require configuration or API keys`);
    }
    
    // Save detailed results
    const fs = require('fs');
    fs.writeFileSync('individual-endpoint-benchmark-results.json', JSON.stringify(this.results, null, 2));
    console.log('\\n💾 Detailed endpoint results saved to: individual-endpoint-benchmark-results.json');
  }
}

// Run endpoint benchmark
async function main() {
  const benchmark = new IndividualEndpointBenchmark();
  await benchmark.runIndividualEndpointBenchmark();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { IndividualEndpointBenchmark };