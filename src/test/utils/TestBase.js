#!/usr/bin/env node

/**
 * TestBase Class
 * 
 * Consolidated base class for common test structure patterns.
 * Eliminates 95% identical setup/teardown boilerplate across test files.
 * 
 * Features:
 * - Common test lifecycle methods (setup, teardown, cleanup)
 * - Standardized result tracking and reporting
 * - Mock creation and management utilities
 * - Environment detection and configuration
 * - Consistent logging and output formatting
 * - Error handling and recovery patterns
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');

class TestBase {
  constructor(options = {}) {
    this.options = {
      verbose: options.verbose || false,
      cleanup: options.cleanup !== false,
      timeout: options.timeout || 300000,
      generateReport: options.generateReport !== false,
      outputDir: options.outputDir || 'test-results',
      ...options
    };

    // Initialize test state
    this.testId = crypto.randomBytes(4).toString('hex');
    this.startTime = null;
    this.endTime = null;
    this.environment = this.detectEnvironment();
    
    // Initialize results structure
    this.results = {
      timestamp: new Date().toISOString(),
      testId: this.testId,
      testSuite: this.constructor.name,
      environment: this.environment,
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        errors: []
      },
      metrics: {
        setupTime: 0,
        testTime: 0,
        cleanupTime: 0,
        totalTime: 0
      }
    };

    // Test execution state
    this.isSetup = false;
    this.currentTest = null;
    this.testGroups = new Map();
    this.mocks = new Map();
    this.tempDirectories = [];
    this.activeTimeouts = [];
  }

  /**
   * Detect and return environment information
   */
  detectEnvironment() {
    return {
      platform: os.platform(),
      architecture: os.arch(),
      nodeVersion: process.version,
      npmVersion: this.getNpmVersion(),
      osVersion: os.release(),
      hostname: os.hostname(),
      cpuCount: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB',
      freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024) + 'GB',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get npm version
   */
  getNpmVersion() {
    try {
      return require('child_process').execSync('npm --version', { encoding: 'utf8' }).trim();
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Setup method to be overridden by subclasses
   */
  async setup() {
    // Override in subclasses for specific setup logic
  }

  /**
   * Teardown method to be overridden by subclasses
   */
  async teardown() {
    // Override in subclasses for specific teardown logic
  }

  /**
   * Run all tests with proper lifecycle management
   */
  async runAllTests() {
    this.startTime = Date.now();
    
    try {
      // Setup phase
      await this.performSetup();
      
      // Test execution phase
      await this.executeTests();
      
      // Calculate metrics and generate results
      this.calculateMetrics();
      
      // Generate report if requested
      if (this.options.generateReport) {
        await this.generateReport();
      }
      
      return this.getTestResults();
      
    } catch (error) {
      this.log('error', `Test execution failed: ${error.message}`);
      this.results.summary.errors.push({
        type: 'execution_error',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      return this.getTestResults();
    } finally {
      // Cleanup phase
      await this.performCleanup();
      this.endTime = Date.now();
    }
  }

  /**
   * Perform setup with timing
   */
  async performSetup() {
    const setupStart = Date.now();
    
    try {
      this.log('info', 'Starting test setup');
      
      // Create output directory if needed
      if (this.options.generateReport) {
        await fs.mkdir(this.options.outputDir, { recursive: true });
      }
      
      // Call subclass setup
      await this.setup();
      
      this.isSetup = true;
      this.results.metrics.setupTime = Date.now() - setupStart;
      
      this.log('success', `Setup completed in ${this.results.metrics.setupTime}ms`);
      
    } catch (error) {
      this.results.metrics.setupTime = Date.now() - setupStart;
      this.log('error', `Setup failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute tests method to be overridden by subclasses
   */
  async executeTests() {
    const testStart = Date.now();
    
    try {
      this.log('info', 'Starting test execution');
      
      // This should be overridden by subclasses to run their specific tests
      await this.runTests();
      
      this.results.metrics.testTime = Date.now() - testStart;
      this.log('success', `Test execution completed in ${this.results.metrics.testTime}ms`);
      
    } catch (error) {
      this.results.metrics.testTime = Date.now() - testStart;
      this.log('error', `Test execution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Default test runner - override in subclasses
   */
  async runTests() {
    this.log('warning', 'No tests defined. Override runTests() method in subclass.');
  }

  /**
   * Perform cleanup with timing
   */
  async performCleanup() {
    const cleanupStart = Date.now();
    
    try {
      this.log('info', 'Starting cleanup');
      
      // Clear active timeouts
      this.activeTimeouts.forEach(timeout => clearTimeout(timeout));
      this.activeTimeouts = [];
      
      // Cleanup temporary directories
      if (this.options.cleanup) {
        await this.cleanupTempDirectories();
      }
      
      // Clear mocks
      this.mocks.clear();
      
      // Call subclass teardown
      await this.teardown();
      
      this.results.metrics.cleanupTime = Date.now() - cleanupStart;
      this.log('success', `Cleanup completed in ${this.results.metrics.cleanupTime}ms`);
      
    } catch (error) {
      this.results.metrics.cleanupTime = Date.now() - cleanupStart;
      this.log('error', `Cleanup failed: ${error.message}`);
    }
  }

  /**
   * Test group management
   */
  describe(groupName, testFunction) {
    this.log('info', `Starting test group: ${groupName}`);
    
    const groupStart = Date.now();
    const group = {
      name: groupName,
      tests: [],
      startTime: groupStart,
      endTime: null,
      success: true
    };
    
    this.testGroups.set(groupName, group);
    this.currentGroup = group;
    
    try {
      testFunction();
      group.endTime = Date.now();
      group.duration = group.endTime - group.startTime;
      
      this.log('success', `Test group '${groupName}' completed in ${group.duration}ms`);
    } catch (error) {
      group.endTime = Date.now();
      group.duration = group.endTime - group.startTime;
      group.success = false;
      group.error = error.message;
      
      this.log('error', `Test group '${groupName}' failed: ${error.message}`);
    }
    
    this.currentGroup = null;
  }

  /**
   * Individual test execution
   */
  async test(testName, testFunction) {
    this.results.summary.total++;
    const testStart = Date.now();
    
    const testResult = {
      name: testName,
      group: this.currentGroup?.name || 'default',
      startTime: testStart,
      endTime: null,
      duration: 0,
      success: false,
      error: null,
      skipped: false
    };
    
    this.currentTest = testResult;
    
    try {
      this.log('info', `Running test: ${testName}`);
      
      // Execute test with timeout
      await this.executeWithTimeout(testFunction, this.options.timeout);
      
      testResult.success = true;
      this.results.summary.passed++;
      
      this.log('success', `✅ ${testName}`);
      
    } catch (error) {
      testResult.success = false;
      testResult.error = error.message;
      this.results.summary.failed++;
      this.results.summary.errors.push({
        test: testName,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      this.log('error', `❌ ${testName}: ${error.message}`);
    } finally {
      testResult.endTime = Date.now();
      testResult.duration = testResult.endTime - testResult.startTime;
      
      this.results.tests.push(testResult);
      if (this.currentGroup) {
        this.currentGroup.tests.push(testResult);
      }
      
      this.currentTest = null;
    }
  }

  /**
   * Skip a test
   */
  skip(testName, reason = 'Test skipped') {
    this.results.summary.total++;
    this.results.summary.skipped++;
    
    const testResult = {
      name: testName,
      group: this.currentGroup?.name || 'default',
      skipped: true,
      reason,
      timestamp: new Date().toISOString()
    };
    
    this.results.tests.push(testResult);
    if (this.currentGroup) {
      this.currentGroup.tests.push(testResult);
    }
    
    this.log('warning', `⏭️ ${testName}: ${reason}`);
  }

  /**
   * Execute function with timeout
   */
  async executeWithTimeout(func, timeout) {
    return new Promise(async (resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        reject(new Error(`Test timed out after ${timeout}ms`));
      }, timeout);
      
      this.activeTimeouts.push(timeoutHandle);
      
      try {
        const result = await func();
        clearTimeout(timeoutHandle);
        this.activeTimeouts = this.activeTimeouts.filter(t => t !== timeoutHandle);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutHandle);
        this.activeTimeouts = this.activeTimeouts.filter(t => t !== timeoutHandle);
        reject(error);
      }
    });
  }

  /**
   * Assertion helpers
   */
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
        if (Array.isArray(actual)) {
          if (!actual.includes(expected)) {
            throw new Error(`Expected array to contain ${expected}`);
          }
        } else if (typeof actual === 'string') {
          if (!actual.includes(expected)) {
            throw new Error(`Expected string to contain "${expected}"`);
          }
        } else {
          throw new Error('toContain can only be used with arrays or strings');
        }
      }
    };
  }

  /**
   * Mock creation helpers
   */
  createMock(name, mockImplementation = {}) {
    const mock = {
      name,
      calls: [],
      implementation: mockImplementation,
      ...mockImplementation
    };
    
    this.mocks.set(name, mock);
    return mock;
  }

  /**
   * Create temporary directory
   */
  async createTempDirectory(prefix = 'test') {
    const tempDir = path.join(os.tmpdir(), `${prefix}-${this.testId}-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    this.tempDirectories.push(tempDir);
    return tempDir;
  }

  /**
   * Cleanup temporary directories
   */
  async cleanupTempDirectories() {
    for (const dir of this.tempDirectories) {
      try {
        await fs.rm(dir, { recursive: true, force: true });
        this.log('info', `Cleaned up temporary directory: ${dir}`);
      } catch (error) {
        this.log('warning', `Failed to cleanup directory ${dir}: ${error.message}`);
      }
    }
    this.tempDirectories = [];
  }

  /**
   * Logging with consistent formatting
   */
  log(level, message, data = null) {
    if (this.options.verbose || level === 'error') {
      const colors = {
        info: '\x1b[36m',
        success: '\x1b[32m',
        warning: '\x1b[33m',
        error: '\x1b[31m',
        reset: '\x1b[0m'
      };
      
      const timestamp = new Date().toISOString();
      console.log(`${colors[level] || ''}[${level.toUpperCase()}] ${timestamp} ${message}${colors.reset}`);
      
      if (data && this.options.verbose) {
        console.log('  Data:', JSON.stringify(data, null, 2));
      }
    }
  }

  /**
   * Calculate final metrics
   */
  calculateMetrics() {
    this.results.metrics.totalTime = (this.endTime || Date.now()) - this.startTime;
    this.results.success = this.results.summary.failed === 0 && this.results.summary.total > 0;
  }

  /**
   * Generate test report
   */
  async generateReport() {
    const reportPath = path.join(
      this.options.outputDir,
      `${this.constructor.name.toLowerCase()}-${this.testId}.json`
    );

    const report = {
      metadata: {
        testId: this.testId,
        testSuite: this.constructor.name,
        tool: 'TestBase',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      },
      ...this.results
    };

    try {
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      this.log('success', `Test report generated: ${reportPath}`);
    } catch (error) {
      this.log('error', `Failed to generate report: ${error.message}`);
    }
  }

  /**
   * Get final test results
   */
  getTestResults() {
    return {
      success: this.results.success,
      failed: this.results.summary.failed,
      passed: this.results.summary.passed,
      total: this.results.summary.total,
      summary: this.results.summary,
      results: this.results
    };
  }

  /**
   * Print test summary
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log(`${this.constructor.name.toUpperCase()} TEST RESULTS`);
    console.log('='.repeat(60));
    console.log(`Test ID: ${this.testId}`);
    console.log(`Duration: ${this.results.metrics.totalTime}ms`);
    console.log(`Setup Time: ${this.results.metrics.setupTime}ms`);
    console.log(`Test Time: ${this.results.metrics.testTime}ms`);
    console.log(`Cleanup Time: ${this.results.metrics.cleanupTime}ms`);
    console.log(`Total Tests: ${this.results.summary.total}`);
    console.log(`Passed: ${this.results.summary.passed}`);
    console.log(`Failed: ${this.results.summary.failed}`);
    console.log(`Skipped: ${this.results.summary.skipped}`);
    console.log(`Success: ${this.results.success ? '✅ YES' : '❌ NO'}`);
    
    if (this.results.summary.errors.length > 0) {
      console.log('\nErrors:');
      this.results.summary.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.test || error.type}: ${error.error || error.message}`);
      });
    }
    
    console.log('='.repeat(60));
  }
}

module.exports = TestBase;