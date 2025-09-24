#!/usr/bin/env node

/**
 * Comprehensive Claudette Benchmark Suite
 * Runs all three benchmarks (Native, HTTP API, MCP) and generates comparison report
 */

const { NativeBenchmark } = require('./benchmark-native.js');
const { ApiBenchmark } = require('./benchmark-api.js');
const { McpBenchmark } = require('./benchmark-mcp.js');
const { performance } = require('perf_hooks');

class ComprehensiveBenchmark {
  constructor() {
    this.results = {
      native: null,
      api: null,
      mcp: null,
      comparison: {},
      total_duration: 0,
      errors: []
    };
  }

  async run() {
    console.log('🏆 Claudette Comprehensive Benchmark Suite');
    console.log('===========================================\n');

    // Set benchmark environment variables for optimized performance
    process.env.CLAUDETTE_BENCHMARK = '1';
    process.env.NODE_ENV = 'test';
    process.env.CLAUDETTE_DEBUG = '0';

    const overallStart = performance.now();

    try {
      // Run Native Benchmark
      console.log('1️⃣ Starting Native Benchmark...\n');
      const native = new NativeBenchmark();
      await native.run();
      this.results.native = native.results;

      console.log('\n' + '='.repeat(60) + '\n');

      // Run HTTP API Benchmark
      console.log('2️⃣ Starting HTTP API Benchmark...\n');
      const api = new ApiBenchmark();
      await api.run();
      this.results.api = api.results;

      console.log('\n' + '='.repeat(60) + '\n');

      // Run MCP Benchmark
      console.log('3️⃣ Starting MCP Benchmark...\n');
      const mcp = new McpBenchmark();
      await mcp.run();
      this.results.mcp = mcp.results;

      // Calculate total duration
      this.results.total_duration = performance.now() - overallStart;

      console.log('\n' + '='.repeat(60) + '\n');

      // Generate comprehensive comparison report
      this.generateComparisonReport();

    } catch (error) {
      console.error('❌ Comprehensive benchmark failed:', error.message);
      this.results.errors.push(error.message);
    }
  }

  generateComparisonReport() {
    console.log('📊 Comprehensive Benchmark Comparison');
    console.log('=====================================\n');

    // Initialization/Startup Comparison
    console.log('🚀 Startup Performance:');
    const nativeInit = this.results.native?.initialization?.duration || 0;
    const apiStartup = this.results.api?.server_startup?.duration || 0;
    const mcpStartup = this.results.mcp?.server_startup?.duration || 0;

    console.log(`   Native (initialization): ${nativeInit.toFixed(2)}ms`);
    console.log(`   HTTP API (server startup): ${apiStartup.toFixed(2)}ms`);
    console.log(`   MCP (server startup): ${mcpStartup.toFixed(2)}ms`);

    const fastestStartup = Math.min(nativeInit, apiStartup, mcpStartup);
    const slowestStartup = Math.max(nativeInit, apiStartup, mcpStartup);
    console.log(`   Fastest: ${fastestStartup.toFixed(2)}ms`);
    console.log(`   Slowest: ${slowestStartup.toFixed(2)}ms`);
    console.log(`   Ratio: ${(slowestStartup / fastestStartup).toFixed(2)}x\n`);

    // Simple Request Performance
    console.log('💬 Simple Request Performance:');
    const nativeSimple = this.calculateAverage(this.results.native?.requests?.simple, 'duration');
    const apiSimple = this.calculateAverage(this.results.api?.api_requests?.simple, 'duration');
    const mcpSimple = this.calculateAverage(this.results.mcp?.tool_calls?.simple, 'duration');

    console.log(`   Native: ${nativeSimple.toFixed(2)}ms (avg of ${this.getSuccessfulCount(this.results.native?.requests?.simple)} requests)`);
    console.log(`   HTTP API: ${apiSimple.toFixed(2)}ms (avg of ${this.getSuccessfulCount(this.results.api?.api_requests?.simple)} requests)`);
    console.log(`   MCP: ${mcpSimple.toFixed(2)}ms (avg of ${this.getSuccessfulCount(this.results.mcp?.tool_calls?.simple)} requests)`);

    const fastestSimple = Math.min(nativeSimple, apiSimple, mcpSimple);
    console.log(`   Fastest: ${fastestSimple.toFixed(2)}ms`);
    console.log(`   API vs Native overhead: ${(apiSimple / nativeSimple).toFixed(2)}x`);
    console.log(`   MCP vs Native overhead: ${(mcpSimple / nativeSimple).toFixed(2)}x\n`);

    // Complex Request Performance
    console.log('🧠 Complex Request Performance:');
    const nativeComplex = this.calculateAverage(this.results.native?.requests?.complex, 'duration');
    const apiComplex = this.calculateAverage(this.results.api?.api_requests?.complex, 'duration');
    const mcpComplex = this.calculateAverage(this.results.mcp?.tool_calls?.complex, 'duration');

    console.log(`   Native: ${nativeComplex.toFixed(2)}ms (avg of ${this.getSuccessfulCount(this.results.native?.requests?.complex)} requests)`);
    console.log(`   HTTP API: ${apiComplex.toFixed(2)}ms (avg of ${this.getSuccessfulCount(this.results.api?.api_requests?.complex)} requests)`);
    console.log(`   MCP: ${mcpComplex.toFixed(2)}ms (avg of ${this.getSuccessfulCount(this.results.mcp?.tool_calls?.complex)} requests)`);

    const fastestComplex = Math.min(nativeComplex, apiComplex, mcpComplex);
    console.log(`   Fastest: ${fastestComplex.toFixed(2)}ms`);
    console.log(`   API vs Native overhead: ${(apiComplex / nativeComplex).toFixed(2)}x`);
    console.log(`   MCP vs Native overhead: ${(mcpComplex / nativeComplex).toFixed(2)}x\n`);

    // Memory Usage Comparison
    console.log('🧠 Memory Usage Comparison:');
    const nativeMemory = this.results.native?.memory;
    const apiMemory = this.results.api?.memory;
    const mcpMemory = this.results.mcp?.memory;

    if (nativeMemory) {
      console.log(`   Native growth: ${(nativeMemory.peak - nativeMemory.start).toFixed(2)}MB`);
    }
    if (apiMemory) {
      console.log(`   HTTP API growth: ${(apiMemory.peak - apiMemory.start).toFixed(2)}MB`);
    }
    if (mcpMemory) {
      console.log(`   MCP growth: ${(mcpMemory.peak - mcpMemory.start).toFixed(2)}MB`);
    }

    // Success Rates
    console.log('\n✅ Success Rates:');
    console.log(`   Native simple requests: ${this.getSuccessRate(this.results.native?.requests?.simple)}%`);
    console.log(`   HTTP API simple requests: ${this.getSuccessRate(this.results.api?.api_requests?.simple)}%`);
    console.log(`   MCP simple tool calls: ${this.getSuccessRate(this.results.mcp?.tool_calls?.simple)}%`);

    // Overall Assessment
    console.log('\n🎯 Performance Summary:');
    console.log(`   Fastest for startup: ${this.getFastestInterface('startup')}`);
    console.log(`   Fastest for simple requests: ${this.getFastestInterface('simple')}`);
    console.log(`   Fastest for complex requests: ${this.getFastestInterface('complex')}`);
    console.log(`   Most memory efficient: ${this.getMostMemoryEfficient()}`);

    // Recommendations
    console.log('\n💡 Recommendations:');
    console.log('   • Use Native interface for maximum performance');
    console.log('   • Use HTTP API for REST-based integrations');
    console.log('   • Use MCP for Claude Code integration');
    console.log('   • All interfaces provide reliable service with different trade-offs');

    console.log(`\n⏱️ Total benchmark duration: ${(this.results.total_duration / 1000).toFixed(2)}s`);
    console.log('✅ Comprehensive benchmark completed successfully!');
  }

  calculateAverage(requests, field) {
    if (!requests || requests.length === 0) return 0;
    const successful = requests.filter(r => r.success && r[field] !== undefined);
    if (successful.length === 0) return 0;
    return successful.reduce((sum, r) => sum + r[field], 0) / successful.length;
  }

  getSuccessfulCount(requests) {
    if (!requests) return 0;
    return requests.filter(r => r.success).length;
  }

  getSuccessRate(requests) {
    if (!requests || requests.length === 0) return 0;
    const successful = requests.filter(r => r.success).length;
    return ((successful / requests.length) * 100).toFixed(1);
  }

  getFastestInterface(type) {
    let native, api, mcp;

    if (type === 'startup') {
      native = this.results.native?.initialization?.duration || Infinity;
      api = this.results.api?.server_startup?.duration || Infinity;
      mcp = this.results.mcp?.server_startup?.duration || Infinity;
    } else if (type === 'simple') {
      native = this.calculateAverage(this.results.native?.requests?.simple, 'duration');
      api = this.calculateAverage(this.results.api?.api_requests?.simple, 'duration');
      mcp = this.calculateAverage(this.results.mcp?.tool_calls?.simple, 'duration');
    } else if (type === 'complex') {
      native = this.calculateAverage(this.results.native?.requests?.complex, 'duration');
      api = this.calculateAverage(this.results.api?.api_requests?.complex, 'duration');
      mcp = this.calculateAverage(this.results.mcp?.tool_calls?.complex, 'duration');
    }

    const min = Math.min(native, api, mcp);
    if (min === native) return 'Native';
    if (min === api) return 'HTTP API';
    if (min === mcp) return 'MCP';
    return 'Unknown';
  }

  getMostMemoryEfficient() {
    const nativeGrowth = this.results.native?.memory ? 
      (this.results.native.memory.peak - this.results.native.memory.start) : Infinity;
    const apiGrowth = this.results.api?.memory ? 
      (this.results.api.memory.peak - this.results.api.memory.start) : Infinity;
    const mcpGrowth = this.results.mcp?.memory ? 
      (this.results.mcp.memory.peak - this.results.mcp.memory.start) : Infinity;

    const min = Math.min(nativeGrowth, apiGrowth, mcpGrowth);
    if (min === nativeGrowth) return 'Native';
    if (min === apiGrowth) return 'HTTP API';
    if (min === mcpGrowth) return 'MCP';
    return 'Unknown';
  }
}

// Run comprehensive benchmark if called directly
if (require.main === module) {
  const benchmark = new ComprehensiveBenchmark();
  benchmark.run().catch(console.error);
}

module.exports = { ComprehensiveBenchmark };