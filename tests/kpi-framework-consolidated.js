#!/usr/bin/env node

/**
 * KPI Framework Test Suite - CONSOLIDATED VERSION
 * 
 * Refactored to use consolidated test utilities, demonstrating:
 * - TestBase for common test structure patterns
 * - TestRunner for consistent execution and exit handling
 * - ErrorHandler for standardized error handling
 * - DefaultConfiguration for shared config patterns
 * 
 * This eliminates duplicate boilerplate and provides consistent behavior.
 */

const { TestBase, TestRunner, ErrorHandler, DefaultConfiguration } = require('./utils');

class KPIFrameworkConsolidated extends TestBase {
  constructor(options = {}) {
    // Get default configuration for this test type
    const config = DefaultConfiguration.forTestType('unit', {
      verbose: options.verbose || false,
      generateReport: true,
      outputDir: 'test-results/kpi',
      ...options
    });
    
    super(config);
    
    this.errorHandler = new ErrorHandler({
      verbose: config.verbose,
      categorizeErrors: true
    });
  }

  /**
   * Override the runTests method from TestBase
   */
  async runTests() {
    this.log('info', '📊 Starting KPI Framework Tests');
    
    // Use TestBase's describe/test pattern instead of manual test tracking
    this.describe('KPI Collection Framework', () => {
      this.test('KPI data collection validation', async () => {
        await this.testKPICollection();
      });
    });

    this.describe('Metrics Validation', () => {
      this.test('Metrics structure and validation logic', async () => {
        await this.testMetricsValidation();
      });
    });
  }

  /**
   * Test KPI collection with error handling
   */
  async testKPICollection() {
    const result = await this.errorHandler.withErrorHandling(async () => {
      // Mock KPI data collection
      const mockKPIs = {
        responseTime: Math.random() * 1000 + 500,
        successRate: 95 + Math.random() * 5,
        costPerRequest: Math.random() * 0.01,
        cacheHitRate: Math.random() * 100
      };

      // Validate KPI structure using TestBase's expect helper
      const requiredKPIs = ['responseTime', 'successRate', 'costPerRequest', 'cacheHitRate'];
      
      for (const kpi of requiredKPIs) {
        this.expect(typeof mockKPIs[kpi]).toBe('number');
        this.expect(mockKPIs[kpi]).toBeGreaterThan(0);
      }

      this.log('success', 'KPI collection validation passed', mockKPIs);
      return mockKPIs;
      
    }, { name: 'KPI Collection Test' });

    if (!result.success) {
      throw new Error(`KPI collection failed: ${result.error.message}`);
    }

    return result.result;
  }

  /**
   * Test metrics validation with retry logic
   */
  async testMetricsValidation() {
    const result = await this.errorHandler.withRetry(async () => {
      // Test metrics validation logic
      const testMetrics = [
        { name: 'response_time', value: 250, unit: 'ms', valid: true },
        { name: 'success_rate', value: 99.5, unit: '%', valid: true },
        { name: 'invalid_metric', value: -1, unit: 'invalid', valid: false }
      ];

      const validMetrics = testMetrics.filter(m => m.valid && m.value >= 0);
      
      // Use TestBase assertions
      this.expect(validMetrics.length).toBeGreaterThan(1);
      this.expect(testMetrics).toContain(testMetrics.find(m => m.name === 'response_time'));
      
      this.log('success', 'Metrics validation passed', {
        validMetrics: validMetrics.length,
        totalMetrics: testMetrics.length
      });

      return {
        validMetrics: validMetrics.length,
        totalMetrics: testMetrics.length,
        metrics: validMetrics
      };
      
    }, { 
      name: 'Metrics Validation Test',
      maxRetries: 2 // Override default retries for this specific test
    });

    if (!result.success) {
      throw new Error(`Metrics validation failed: ${result.error.message}`);
    }

    return result.result;
  }

  /**
   * Override generateReport to include KPI-specific data
   */
  async generateReport() {
    await super.generateReport();
    
    // Generate KPI-specific report
    const kpiReportPath = `${this.options.outputDir}/kpi-detailed-${this.testId}.json`;
    
    const kpiReport = {
      metadata: {
        testId: this.testId,
        testSuite: 'KPIFrameworkConsolidated',
        tool: 'KPI-TestBase-Consolidated',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      },
      kpiMetrics: {
        frameworkValidation: this.results.success,
        collectionTested: this.results.tests.some(t => t.name.includes('collection')),
        validationTested: this.results.tests.some(t => t.name.includes('validation'))
      },
      errorAnalysis: this.errorHandler.analyzeErrors(),
      results: this.results
    };

    try {
      const fs = require('fs').promises;
      await fs.writeFile(kpiReportPath, JSON.stringify(kpiReport, null, 2));
      this.log('success', `KPI detailed report generated: ${kpiReportPath}`);
    } catch (error) {
      this.log('error', `Failed to generate KPI report: ${error.message}`);
    }
  }
}

// CLI interface using TestRunner for consistent execution and exit handling
if (require.main === module) {
  const testSuite = new KPIFrameworkConsolidated({
    verbose: process.argv.includes('--verbose'),
    cleanup: !process.argv.includes('--no-cleanup')
  });
  
  // Use TestRunner for consistent execution and exit handling
  TestRunner.run(testSuite, {
    verbose: process.argv.includes('--verbose'),
    generateReport: true,
    exitOnCompletion: true
  });
}

module.exports = KPIFrameworkConsolidated;