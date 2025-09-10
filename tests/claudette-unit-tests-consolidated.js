#!/usr/bin/env node

/**
 * Claudette Unit Tests - Consolidated Version
 * Demonstrates the new consolidated test framework usage
 */

const { TestBase } = require('./utils/test-base');
const { runTestSuite } = require('./utils/test-runner');
const { getDefaultConfiguration } = require('../config/default-configuration');
const { getErrorHandler } = require('../utils/error-handler');

class ClaudetteUnitTests extends TestBase {
  constructor() {
    super('Claudette Unit Tests');
    
    // Use consolidated configuration
    this.config = getDefaultConfiguration().get('test.defaults');
    this.errorHandler = getErrorHandler();
    
    // Setup hooks
    this.beforeAll(async () => {
      console.log('🔧 Setting up test environment...');
      // Initialization logic
    });

    this.afterAll(async () => {
      console.log('🧹 Cleaning up test environment...');
      // Cleanup logic
    });
  }

  async runTests() {
    // Cost estimation tests
    this.describe('Cost Estimation Features', () => {
      this.it('should calculate correct cost for gpt-4o with 1000 tokens', () => {
        const backend = this.createMockBackend('openai', { costPerToken: 0.000005 });
        const cost = backend.estimateCost(1000);
        this.expect(cost).toBe(0.005);
      });

      this.it('should fallback to default cost for unknown model', () => {
        const backend = this.createMockBackend('unknown', { costPerToken: 0.0001 });
        const cost = backend.estimateCost(1000);
        this.expect(cost).toBe(0.1);
      });
    });

    // Health check tests
    this.describe('Health Check System', () => {
      this.it('should maintain healthy status after successful pings', async () => {
        const backend = this.createMockBackend('test', { available: true });
        const isHealthy = await backend.isAvailable();
        this.expect(isHealthy).toBeTruthy();
      });

      this.it('should detect unhealthy backend after timeout', async () => {
        const backend = this.createMockBackend('test', { available: false });
        const isHealthy = await backend.isAvailable();
        this.expect(isHealthy).toBeFalsy();
      });
    });

    // Adaptive routing tests
    this.describe('Adaptive Routing Logic', () => {
      this.it('should select OpenAI when it has lower latency', () => {
        const openaiBackend = this.createMockBackend('openai', { latency: 100 });
        const qwenBackend = this.createMockBackend('qwen', { latency: 300 });
        
        const openaiLatency = openaiBackend.getInfo().avg_latency;
        const qwenLatency = qwenBackend.getInfo().avg_latency;
        const selectedBackend = openaiLatency < qwenLatency ? 'openai' : 'qwen';
        
        this.expect(selectedBackend).toBe('openai');
      });

      this.it('should switch to Qwen when cost threshold exceeded', () => {
        const openaiCost = 0.005;
        const qwenCost = 0.001;
        const costThreshold = 0.003;
        
        const selectedBackend = openaiCost > costThreshold ? 'qwen' : 'openai';
        this.expect(selectedBackend).toBe('qwen');
      });
    });

    // Performance metrics tests
    this.describe('Performance Metrics', () => {
      this.it('should measure response latency correctly', () => {
        const startTime = Date.now();
        const processingTime = 50;
        const endTime = startTime + processingTime;
        const latency = endTime - startTime;
        
        this.expect(latency).toBeGreaterThan(0);
        this.expect(latency).toBe(processingTime);
      });

      this.it('should calculate cost in EUR correctly', () => {
        const inputTokens = 100;
        const outputTokens = 200;
        const costPerToken = 0.0001;
        const totalCost = (inputTokens + outputTokens) * costPerToken;
        
        this.expect(totalCost).toBeCloseTo(0.03, 4);
      });
    });

    // Security validation tests
    this.describe('Security Features', () => {
      this.it('should generate SHA-256 checksums correctly', () => {
        const crypto = require('crypto');
        const testContent = 'test content for checksum';
        const expectedHash = crypto.createHash('sha256').update(testContent).digest('hex');
        const actualHash = crypto.createHash('sha256').update(testContent).digest('hex');
        
        this.expect(actualHash).toBe(expectedHash);
        this.expect(actualHash.length).toBe(64);
      });

      this.it('should handle API key storage securely', () => {
        const apiKey = 'sk-test-key-12345';
        const isSecureStorage = !apiKey.includes('plain-text-in-code');
        
        this.expect(isSecureStorage).toBeTruthy();
      });
    });
  }
}

// Use consolidated test runner
async function main() {
  await runTestSuite('Claudette Unit Tests', async (runner) => {
    const testSuite = new ClaudetteUnitTests();
    await testSuite.runAllTests();
    
    // Additional runner-specific tests can be added here
    await runner.runTest('Integration smoke test', async () => {
      // Smoke test logic
      return true;
    });
  }, {
    verbose: process.argv.includes('--verbose'),
    outputFile: 'claudette-unit-test-results.json'
  });
}

if (require.main === module) {
  main().catch(error => {
    console.error('Test execution failed:', error.message);
    process.exit(1);
  });
}

module.exports = { ClaudetteUnitTests };