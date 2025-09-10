#!/usr/bin/env node

/**
 * Base Test Class for Claudette Test Suite  
 * Eliminates duplicate test structure patterns across test files
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class TestBase {
  constructor(testName = 'Base Test') {
    this.testName = testName;
    this.results = {
      passed: 0,
      failed: 0,
      errors: [],
      startTime: Date.now()
    };
    
    this.setupTeardownCallbacks = {
      beforeAll: [],
      afterAll: [],
      beforeEach: [],
      afterEach: []
    };
  }

  // Lifecycle hooks
  beforeAll(callback) {
    this.setupTeardownCallbacks.beforeAll.push(callback);
  }

  afterAll(callback) {
    this.setupTeardownCallbacks.afterAll.push(callback);
  }

  beforeEach(callback) {
    this.setupTeardownCallbacks.beforeEach.push(callback);
  }

  afterEach(callback) {
    this.setupTeardownCallbacks.afterEach.push(callback);
  }

  // Execute lifecycle callbacks
  async executeCallbacks(type) {
    for (const callback of this.setupTeardownCallbacks[type]) {
      try {
        await callback();
      } catch (error) {
        console.error(`${type} callback failed: ${error.message}`);
        throw error;
      }
    }
  }

  // Test execution framework
  describe(testName, testFn) {
    console.log(`\n📋 Testing: ${testName}`);
    console.log('─'.repeat(50));
    
    try {
      testFn();
    } catch (error) {
      this.results.failed++;
      this.results.errors.push(`${testName}: ${error.message}`);
      console.log(`❌ ${testName} failed: ${error.message}`);
    }
  }

  async it(description, testFn) {
    try {
      await this.executeCallbacks('beforeEach');
      
      if (typeof testFn === 'function') {
        await testFn();
      }
      
      await this.executeCallbacks('afterEach');
      
      this.results.passed++;
      console.log(`✅ ${description}`);
    } catch (error) {
      this.results.failed++;
      this.results.errors.push(`${description}: ${error.message}`);
      console.log(`❌ ${description}: ${error.message}`);
    }
  }

  // Assertion framework
  expect(actual) {
    return {
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, got ${actual}`);
        }
      },
      toEqual: (expected) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
      },
      toBeGreaterThan: (expected) => {
        if (actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
      },
      toBeLessThan: (expected) => {
        if (actual >= expected) {
          throw new Error(`Expected ${actual} to be less than ${expected}`);
        }
      },
      toBeTruthy: () => {
        if (!actual) {
          throw new Error(`Expected ${actual} to be truthy`);
        }
      },
      toBeFalsy: () => {
        if (actual) {
          throw new Error(`Expected ${actual} to be falsy`);
        }
      },
      toThrow: () => {
        let threw = false;
        try {
          if (typeof actual === 'function') {
            actual();
          }
        } catch (error) {
          threw = true;
        }
        if (!threw) {
          throw new Error('Expected function to throw an error');
        }
      },
      toContain: (expected) => {
        if (!actual || !actual.includes || !actual.includes(expected)) {
          throw new Error(`Expected ${actual} to contain ${expected}`);
        }
      },
      toBeCloseTo: (expected, precision = 2) => {
        const diff = Math.abs(actual - expected);
        const tolerance = Math.pow(10, -precision);
        if (diff > tolerance) {
          throw new Error(`Expected ${actual} to be close to ${expected} within ${precision} decimal places`);
        }
      }
    };
  }

  // Mock creation utilities
  createMock(name, methods = {}) {
    const mock = {
      name,
      calls: [],
      callCount: 0
    };

    for (const [methodName, implementation] of Object.entries(methods)) {
      mock[methodName] = (...args) => {
        mock.calls.push({ method: methodName, args });
        mock.callCount++;
        return typeof implementation === 'function' ? implementation(...args) : implementation;
      };
    }

    return mock;
  }

  createMockBackend(name, options = {}) {
    return {
      name,
      isAvailable: () => Promise.resolve(options.available !== false),
      estimateCost: (tokens) => tokens * (options.costPerToken || 0.0001),
      getLatencyScore: () => Promise.resolve(options.latency || 1000),
      send: (request) => Promise.resolve({
        content: `Mock response from ${name}`,
        backend_used: name,
        tokens_input: 100,
        tokens_output: 200,
        cost_eur: 0.03,
        latency_ms: options.latency || 1000,
        cache_hit: false
      }),
      validateConfig: () => true,
      getInfo: () => ({
        name,
        type: options.type || 'cloud',
        model: options.model || 'mock-model',
        priority: options.priority || 1,
        cost_per_token: options.costPerToken || 0.0001,
        healthy: options.available !== false,
        avg_latency: options.latency || 1000
      })
    };
  }

  // Utility methods for common test operations
  generateTestId() {
    return crypto.randomBytes(16).toString('hex');
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async timeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
      )
    ]);
  }

  // Test execution and results
  async runAllTests() {
    try {
      await this.executeCallbacks('beforeAll');
      
      console.log(`🧪 ${this.testName}`);
      console.log('='.repeat(60));
      
      // Run test implementation - to be overridden by subclasses
      await this.runTests();
      
      await this.executeCallbacks('afterAll');
      
    } catch (error) {
      console.error(`Test execution failed: ${error.message}`);
      this.results.failed++;
    }
    
    this.displayResults();
    return this.results;
  }

  // To be overridden by subclasses
  async runTests() {
    console.log('No tests defined. Override runTests() method.');
  }

  displayResults() {
    console.log('\n' + '='.repeat(60));
    console.log(`📊 ${this.testName.toUpperCase()} - RESULTS`);
    console.log('='.repeat(60));
    
    const total = this.results.passed + this.results.failed;
    const passRate = total > 0 ? (this.results.passed / total * 100).toFixed(1) : 0;
    const duration = Date.now() - this.results.startTime;
    
    console.log(`\n🎯 SUMMARY:`);
    console.log(`   Total Tests: ${total}`);
    console.log(`   Passed: ${this.results.passed}`);
    console.log(`   Failed: ${this.results.failed}`);
    console.log(`   Pass Rate: ${passRate}%`);
    console.log(`   Duration: ${duration}ms`);
    
    if (this.results.errors.length > 0) {
      console.log(`\n❌ FAILURES:`);
      this.results.errors.forEach(error => {
        console.log(`   • ${error}`);
      });
    }
    
    if (this.results.failed === 0) {
      console.log(`\n✅ ALL TESTS PASSED!`);
    } else {
      console.log(`\n⚠️ ${this.results.failed} TESTS NEED ATTENTION`);
    }
    
    console.log('='.repeat(60));
  }

  // Standard test result exit
  exit() {
    const exitCode = this.results.failed === 0 ? 0 : 1;
    process.exit(exitCode);
  }
}

module.exports = { TestBase };