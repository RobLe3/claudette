#!/usr/bin/env node

/**
 * Unified Test Runner for Claudette Test Suite
 * Eliminates duplicate test execution patterns across all test files
 */

const fs = require('fs').promises;
const path = require('path');

class TestRunner {
  constructor(suiteName = 'Test Suite', options = {}) {
    this.suiteName = suiteName;
    this.options = {
      verbose: options.verbose || false,
      outputFile: options.outputFile || null,
      timeout: options.timeout || 30000,
      ...options
    };
    
    this.results = {
      timestamp: new Date().toISOString(),
      suiteName,
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      },
      performance: {
        startTime: null,
        endTime: null,
        duration: 0
      }
    };
  }

  /**
   * Unified test execution with consistent logging
   */
  async runTest(testName, testFunction) {
    const testStart = Date.now();
    let testResult;

    try {
      console.log(`🧪 Running: ${testName}`);
      
      const result = await Promise.race([
        testFunction(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout')), this.options.timeout)
        )
      ]);

      testResult = {
        name: testName,
        status: 'passed',
        duration: Date.now() - testStart,
        result: result || true
      };

      this.results.summary.passed++;
      console.log(`✅ PASSED: ${testName} (${testResult.duration}ms)`);

    } catch (error) {
      testResult = {
        name: testName,
        status: 'failed', 
        duration: Date.now() - testStart,
        error: error.message,
        stack: error.stack
      };

      this.results.summary.failed++;
      console.log(`❌ FAILED: ${testName} - ${error.message}`);
      
      if (this.options.verbose) {
        console.log(`   Stack: ${error.stack}`);
      }
    }

    this.results.tests.push(testResult);
    this.results.summary.total++;
    return testResult.status === 'passed';
  }

  /**
   * Run a group of related tests
   */
  async runTestGroup(groupName, tests) {
    console.log(`\n📋 Test Group: ${groupName}`);
    console.log('─'.repeat(60));

    let groupPassed = 0;
    let groupFailed = 0;

    for (const [testName, testFunction] of Object.entries(tests)) {
      const passed = await this.runTest(`${groupName} → ${testName}`, testFunction);
      passed ? groupPassed++ : groupFailed++;
    }

    console.log(`📊 Group Summary: ${groupPassed} passed, ${groupFailed} failed\n`);
    return groupFailed === 0;
  }

  /**
   * Execute complete test suite
   */
  async runSuite(testSuiteFunction) {
    this.results.performance.startTime = Date.now();
    console.log(`🚀 Starting ${this.suiteName}`);
    console.log('='.repeat(80));

    try {
      await testSuiteFunction(this);
    } catch (error) {
      console.error(`💥 Test suite failed: ${error.message}`);
      this.results.summary.failed++;
    }

    this.results.performance.endTime = Date.now();
    this.results.performance.duration = this.results.performance.endTime - this.results.performance.startTime;

    await this.generateReport();
    this.printSummary();
    
    return this.getExitCode();
  }

  /**
   * Unified exit code determination
   */
  getExitCode() {
    return this.results.summary.failed === 0 ? 0 : 1;
  }

  /**
   * Consistent test result reporting
   */
  printSummary() {
    console.log('\n' + '='.repeat(80));
    console.log(`📊 ${this.suiteName.toUpperCase()} - TEST RESULTS`);
    console.log('='.repeat(80));

    const { summary, performance } = this.results;
    const successRate = summary.total > 0 ? ((summary.passed / summary.total) * 100).toFixed(1) : 0;

    console.log(`\n🎯 SUMMARY:`);
    console.log(`   Total Tests: ${summary.total}`);
    console.log(`   Passed: ${summary.passed}`);
    console.log(`   Failed: ${summary.failed}`);
    console.log(`   Success Rate: ${successRate}%`);
    console.log(`   Duration: ${performance.duration}ms`);

    if (summary.failed > 0) {
      console.log(`\n❌ FAILED TESTS:`);
      this.results.tests
        .filter(t => t.status === 'failed')
        .forEach(t => console.log(`   • ${t.name}: ${t.error}`));
    }

    const status = summary.failed === 0 ? '✅ ALL TESTS PASSED!' : `⚠️ ${summary.failed} TESTS FAILED`;
    console.log(`\n${status}`);
    console.log('='.repeat(80));
  }

  /**
   * Generate detailed test report
   */
  async generateReport() {
    if (this.options.outputFile) {
      try {
        const reportPath = path.resolve(this.options.outputFile);
        await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
        console.log(`📄 Test report saved: ${reportPath}`);
      } catch (error) {
        console.warn(`⚠️ Could not save test report: ${error.message}`);
      }
    }
  }

  /**
   * Process exit with proper code
   */
  exit() {
    const exitCode = this.getExitCode();
    console.log(`\n🚪 Exiting with code: ${exitCode}`);
    process.exit(exitCode);
  }
}

/**
 * Utility function for creating and running test suites
 */
async function runTestSuite(suiteName, testSuiteFunction, options = {}) {
  const runner = new TestRunner(suiteName, options);
  
  try {
    const exitCode = await runner.runSuite(testSuiteFunction);
    
    if (options.autoExit !== false) {
      process.exit(exitCode);
    }
    
    return exitCode;
  } catch (error) {
    console.error(`💥 Test suite execution failed: ${error.message}`);
    
    if (options.autoExit !== false) {
      process.exit(1);
    }
    
    return 1;
  }
}

module.exports = {
  TestRunner,
  runTestSuite
};