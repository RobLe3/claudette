#!/usr/bin/env node

/**
 * TestRunner Utility
 * 
 * Consolidated test execution and exit handling for all test suites.
 * Eliminates the duplicate process.exit() pattern across 10+ test files.
 * 
 * Features:
 * - Consistent test execution flow
 * - Standardized exit code handling
 * - Error capturing and reporting
 * - Result aggregation
 * - Timeout management
 */

const crypto = require('crypto');

class TestRunner {
  constructor(options = {}) {
    this.options = {
      verbose: options.verbose || false,
      timeout: options.timeout || 300000, // 5 minutes default
      exitOnCompletion: options.exitOnCompletion !== false,
      generateReport: options.generateReport !== false,
      reportPath: options.reportPath || null,
      ...options
    };

    this.testId = crypto.randomBytes(4).toString('hex');
    this.startTime = null;
    this.endTime = null;
    this.results = null;
    this.exitCode = null;
  }

  /**
   * Execute a test suite with consistent error handling and exit patterns
   */
  async runTest(testSuite, options = {}) {
    this.startTime = Date.now();
    
    try {
      this.log('info', `Starting test suite: ${testSuite.constructor.name || 'Unknown'}`);
      this.log('info', `Test ID: ${this.testId}`);

      // Set up timeout if specified
      let timeoutHandle = null;
      if (this.options.timeout > 0) {
        timeoutHandle = setTimeout(() => {
          throw new Error(`Test suite timed out after ${this.options.timeout}ms`);
        }, this.options.timeout);
      }

      try {
        // Execute the test suite
        let results;
        if (typeof testSuite.runAllTests === 'function') {
          results = await testSuite.runAllTests();
        } else if (typeof testSuite.run === 'function') {
          results = await testSuite.run();
        } else {
          throw new Error('Test suite must implement runAllTests() or run() method');
        }

        // Clear timeout
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }

        this.endTime = Date.now();
        this.results = this.normalizeResults(results, testSuite);
        this.exitCode = this.determineExitCode(this.results);

        this.log('info', `Test suite completed in ${this.endTime - this.startTime}ms`);
        this.logSummary();

        if (this.options.generateReport) {
          await this.generateReport();
        }

        if (this.options.exitOnCompletion) {
          process.exit(this.exitCode);
        }

        return {
          success: this.exitCode === 0,
          exitCode: this.exitCode,
          results: this.results,
          duration: this.endTime - this.startTime
        };

      } catch (executionError) {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        throw executionError;
      }

    } catch (error) {
      this.endTime = Date.now();
      this.exitCode = 1;
      
      this.log('error', `Test suite failed: ${error.message}`);
      this.log('error', `Stack trace: ${error.stack}`);

      if (this.options.generateReport) {
        await this.generateErrorReport(error);
      }

      if (this.options.exitOnCompletion) {
        process.exit(this.exitCode);
      }

      return {
        success: false,
        exitCode: this.exitCode,
        error: error.message,
        duration: this.endTime - this.startTime
      };
    }
  }

  /**
   * Normalize different result formats into a consistent structure
   */
  normalizeResults(results, testSuite) {
    const normalized = {
      timestamp: new Date().toISOString(),
      testId: this.testId,
      testSuite: testSuite.constructor.name || 'Unknown',
      duration: this.endTime - this.startTime,
      success: false,
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      },
      rawResults: results
    };

    // Handle boolean results (simple pass/fail)
    if (typeof results === 'boolean') {
      normalized.success = results;
      normalized.summary.total = 1;
      normalized.summary.passed = results ? 1 : 0;
      normalized.summary.failed = results ? 0 : 1;
      return normalized;
    }

    // Handle object results with various patterns
    if (typeof results === 'object' && results !== null) {
      // Pattern 1: results.success or results.failed === 0
      if (typeof results.success === 'boolean') {
        normalized.success = results.success;
      } else if (typeof results.failed === 'number') {
        normalized.success = results.failed === 0;
      }

      // Pattern 2: Extract summary statistics
      if (results.summary) {
        normalized.summary = {
          total: results.summary.total || results.summary.totalTests || 0,
          passed: results.summary.passed || results.summary.passedTests || 0,
          failed: results.summary.failed || results.summary.failedTests || 0,
          skipped: results.summary.skipped || results.summary.skippedTests || 0
        };
      } else if (results.results) {
        // Pattern 3: nested results object
        normalized.summary = {
          total: results.results.passed + results.results.failed || 0,
          passed: results.results.passed || 0,
          failed: results.results.failed || 0,
          skipped: 0
        };
      } else {
        // Pattern 4: direct properties
        normalized.summary = {
          total: (results.passed || 0) + (results.failed || 0),
          passed: results.passed || 0,
          failed: results.failed || 0,
          skipped: results.skipped || 0
        };
      }

      // Ensure success is determined if not already set
      if (normalized.success === false && normalized.summary.failed === 0 && normalized.summary.total > 0) {
        normalized.success = true;
      }
    }

    return normalized;
  }

  /**
   * Determine exit code based on results
   */
  determineExitCode(results) {
    if (!results) return 1;
    if (results.success === true) return 0;
    if (results.summary.failed > 0) return 1;
    if (results.summary.total === 0) return 1; // No tests ran
    return 0; // Default to success if we have passing tests
  }

  /**
   * Log a message with consistent formatting
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
   * Log test summary
   */
  logSummary() {
    if (!this.results) return;

    console.log('\n' + '='.repeat(60));
    console.log('TEST RUNNER SUMMARY');
    console.log('='.repeat(60));
    console.log(`Test Suite: ${this.results.testSuite}`);
    console.log(`Test ID: ${this.testId}`);
    console.log(`Duration: ${this.results.duration}ms`);
    console.log(`Success: ${this.results.success ? '✅ YES' : '❌ NO'}`);
    console.log(`Total Tests: ${this.results.summary.total}`);
    console.log(`Passed: ${this.results.summary.passed}`);
    console.log(`Failed: ${this.results.summary.failed}`);
    console.log(`Skipped: ${this.results.summary.skipped}`);
    console.log(`Exit Code: ${this.exitCode}`);
    console.log('='.repeat(60));
  }

  /**
   * Generate test report
   */
  async generateReport() {
    if (!this.results) return;

    const fs = require('fs').promises;
    const path = require('path');

    const reportPath = this.options.reportPath || 
                      path.join(process.cwd(), `test-report-${this.testId}.json`);

    const report = {
      metadata: {
        testId: this.testId,
        tool: 'TestRunner',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      },
      execution: {
        startTime: this.startTime,
        endTime: this.endTime,
        duration: this.results.duration,
        exitCode: this.exitCode
      },
      results: this.results
    };

    try {
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      this.log('success', `Test report generated: ${reportPath}`);
    } catch (error) {
      this.log('error', `Failed to generate report: ${error.message}`);
    }
  }

  /**
   * Generate error report
   */
  async generateErrorReport(error) {
    const fs = require('fs').promises;
    const path = require('path');

    const reportPath = this.options.reportPath || 
                      path.join(process.cwd(), `test-error-${this.testId}.json`);

    const report = {
      metadata: {
        testId: this.testId,
        tool: 'TestRunner',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      },
      execution: {
        startTime: this.startTime,
        endTime: this.endTime,
        duration: this.endTime - this.startTime,
        exitCode: this.exitCode
      },
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    };

    try {
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      this.log('success', `Error report generated: ${reportPath}`);
    } catch (writeError) {
      this.log('error', `Failed to generate error report: ${writeError.message}`);
    }
  }

  /**
   * Static helper method for simple test execution
   */
  static async run(testSuite, options = {}) {
    const runner = new TestRunner(options);
    return await runner.runTest(testSuite, options);
  }
}

module.exports = TestRunner;