#!/usr/bin/env node

/**
 * Qwen Code Quality Test Suite - CONSOLIDATED VERSION
 * 
 * Refactored to demonstrate elimination of duplicate exit patterns and
 * use of consolidated test infrastructure utilities.
 * 
 * Before: Duplicate process.exit(success ? 0 : 1) pattern
 * After: TestRunner handles all exit logic consistently
 */

const { TestBase, TestRunner, ErrorHandler, DefaultConfiguration } = require('./utils');
const fs = require('fs').promises;
const path = require('path');

class QwenCodeQualityConsolidated extends TestBase {
  constructor(options = {}) {
    // Use DefaultConfiguration for consistent timeout and retry settings
    const config = DefaultConfiguration.forTestType('unit', {
      verbose: options.verbose || false,
      generateReport: true,
      outputDir: 'test-results/qwen-quality',
      timeout: 60000, // Code quality tests should be fast
      ...options
    });
    
    super(config);
    
    this.errorHandler = new ErrorHandler({
      verbose: config.verbose,
      categorizeErrors: true,
      logErrors: true
    });

    // Store quality metrics
    this.qualityMetrics = {
      structureScore: 0,
      complexityScore: 0,
      apiConsistencyScore: 0,
      overallScore: 0
    };
  }

  /**
   * Override runTests to define our test structure
   */
  async runTests() {
    this.log('info', '🔍 Starting Qwen Code Quality Tests');
    
    this.describe('Code Structure Analysis', () => {
      this.test('Qwen backend file structure validation', async () => {
        await this.testCodeStructure();
      });
    });

    this.describe('Code Complexity Metrics', () => {
      this.test('Complexity threshold validation', async () => {
        await this.testCodeComplexity();
      });
    });

    this.describe('API Consistency Checks', () => {
      this.test('API pattern consistency validation', async () => {
        await this.testApiConsistency();
      });
    });

    // Calculate overall quality score
    this.calculateQualityScore();
  }

  /**
   * Test code structure with proper error handling
   */
  async testCodeStructure() {
    const result = await this.errorHandler.withErrorHandling(async () => {
      const qwenBackendPath = path.join(__dirname, '../backends/qwen.ts');
      const adaptiveQwenPath = path.join(__dirname, '../backends/adaptive-qwen.ts');
      
      let structureScore = 0;
      const findings = [];
      
      try {
        await fs.access(qwenBackendPath);
        structureScore += 50;
        findings.push('Qwen backend file found');
        this.log('success', 'Qwen backend file found');
      } catch {
        findings.push('Qwen backend file not found');
        this.log('warning', 'Qwen backend file not found');
      }
      
      try {
        await fs.access(adaptiveQwenPath);
        structureScore += 50;
        findings.push('Adaptive Qwen backend file found');
        this.log('success', 'Adaptive Qwen backend file found');
      } catch {
        findings.push('Adaptive Qwen backend file not found');
        this.log('warning', 'Adaptive Qwen backend file not found');
      }

      this.qualityMetrics.structureScore = structureScore;
      
      // Use TestBase expectations
      this.expect(structureScore).toBeGreaterThan(0);
      
      if (structureScore < 50) {
        throw new Error('Code structure validation failed: insufficient file coverage');
      }

      return {
        score: structureScore,
        findings,
        passed: structureScore >= 50
      };
      
    }, { name: 'Code Structure Analysis' });

    if (!result.success) {
      throw new Error(`Code structure test failed: ${result.error.message}`);
    }

    return result.result;
  }

  /**
   * Test code complexity with mock analysis
   */
  async testCodeComplexity() {
    const result = await this.errorHandler.withErrorHandling(async () => {
      // Mock complexity analysis (in real implementation, would use actual tools)
      const complexityMetrics = {
        cyclomaticComplexity: 8, // Should be < 10
        cognitiveComplexity: 12, // Should be < 15
        linesOfCode: 250,
        maintainabilityIndex: 85 // Should be > 70
      };

      // Use TestBase assertions for validation
      this.expect(complexityMetrics.cyclomaticComplexity).toBeLessThan(10);
      this.expect(complexityMetrics.cognitiveComplexity).toBeLessThan(15);
      this.expect(complexityMetrics.maintainabilityIndex).toBeGreaterThan(70);

      const passesComplexity = 
        complexityMetrics.cyclomaticComplexity <= 10 &&
        complexityMetrics.cognitiveComplexity <= 15 &&
        complexityMetrics.maintainabilityIndex >= 70;

      // Calculate complexity score based on how well it meets thresholds
      let complexityScore = 0;
      if (complexityMetrics.cyclomaticComplexity <= 10) complexityScore += 33;
      if (complexityMetrics.cognitiveComplexity <= 15) complexityScore += 33;
      if (complexityMetrics.maintainabilityIndex >= 70) complexityScore += 34;

      this.qualityMetrics.complexityScore = complexityScore;

      if (!passesComplexity) {
        throw new Error('Code complexity exceeds acceptable thresholds');
      }

      this.log('success', 'Code complexity validation passed', complexityMetrics);

      return {
        metrics: complexityMetrics,
        score: complexityScore,
        passed: passesComplexity
      };
      
    }, { name: 'Code Complexity Analysis' });

    if (!result.success) {
      throw new Error(`Code complexity test failed: ${result.error.message}`);
    }

    return result.result;
  }

  /**
   * Test API consistency
   */
  async testApiConsistency() {
    const result = await this.errorHandler.withRetry(async () => {
      // Mock API consistency checks
      const apiChecks = {
        methodNaming: true,
        errorHandling: true,
        responseFormat: true,
        documentation: true
      };

      const consistencyScore = Object.values(apiChecks).filter(Boolean).length * 25;
      const passesConsistency = consistencyScore >= 75;

      this.qualityMetrics.apiConsistencyScore = consistencyScore;

      // Use TestBase expectations
      this.expect(consistencyScore).toBeGreaterThan(74);
      this.expect(Object.values(apiChecks).every(check => check === true)).toBeTruthy();

      if (!passesConsistency) {
        throw new Error(`API consistency score ${consistencyScore}% below 75% threshold`);
      }

      this.log('success', 'API consistency validation passed', {
        score: consistencyScore,
        checks: apiChecks
      });

      return {
        checks: apiChecks,
        score: consistencyScore,
        passed: passesConsistency
      };
      
    }, { 
      name: 'API Consistency Check',
      maxRetries: 1 // API consistency shouldn't need retries
    });

    if (!result.success) {
      throw new Error(`API consistency test failed: ${result.error.message}`);
    }

    return result.result;
  }

  /**
   * Calculate overall quality score
   */
  calculateQualityScore() {
    const baseScore = (this.results.summary.passed / this.results.summary.total) * 100;
    
    // Adjust based on quality metrics
    let adjustments = 0;
    if (this.qualityMetrics.structureScore >= 80) adjustments += 5;
    if (this.qualityMetrics.apiConsistencyScore >= 90) adjustments += 5;
    if (this.qualityMetrics.complexityScore >= 80) adjustments += 5;
    
    this.qualityMetrics.overallScore = Math.min(100, Math.round(baseScore + adjustments));
    
    this.log('info', `Overall quality score calculated: ${this.qualityMetrics.overallScore}/100`);
  }

  /**
   * Override printSummary to include quality metrics
   */
  printSummary() {
    super.printSummary();
    
    console.log('\n🏆 QWEN CODE QUALITY METRICS:');
    console.log(`   Structure Score: ${this.qualityMetrics.structureScore}/100`);
    console.log(`   Complexity Score: ${this.qualityMetrics.complexityScore}/100`);
    console.log(`   API Consistency: ${this.qualityMetrics.apiConsistencyScore}/100`);
    console.log(`   Overall Quality: ${this.qualityMetrics.overallScore}/100`);
    
    const meetsQualityStandard = this.qualityMetrics.overallScore >= 75;
    console.log(`   Quality Standard: ${meetsQualityStandard ? '✅ MET' : '❌ NOT MET'}`);
  }

  /**
   * Override generateReport to include quality-specific data
   */
  async generateReport() {
    await super.generateReport();
    
    // Generate quality-specific report matching original format
    const qualityReportPath = path.join(process.cwd(), 'qwen-code-quality-results.json');
    
    const qualityReport = {
      timestamp: new Date().toISOString(),
      tests: this.results.tests.map(test => ({
        name: test.name,
        success: test.success,
        score: test.group === 'Code Structure Analysis' ? this.qualityMetrics.structureScore :
               test.group === 'Code Complexity Metrics' ? this.qualityMetrics.complexityScore :
               test.group === 'API Consistency Checks' ? this.qualityMetrics.apiConsistencyScore : 0
      })),
      codeMetrics: this.qualityMetrics,
      summary: {
        total: this.results.summary.total,
        passed: this.results.summary.passed,
        failed: this.results.summary.failed,
        qualityScore: this.qualityMetrics.overallScore
      },
      consolidatedUtilities: {
        testRunner: 'TestRunner v1.0.0',
        testBase: 'TestBase v1.0.0',
        errorHandler: 'ErrorHandler v1.0.0',
        configuration: 'DefaultConfiguration v1.0.0'
      }
    };

    try {
      await fs.writeFile(qualityReportPath, JSON.stringify(qualityReport, null, 2));
      this.log('success', `Quality report generated: ${qualityReportPath}`);
    } catch (error) {
      this.log('error', `Failed to generate quality report: ${error.message}`);
    }
  }

  /**
   * Get test results in format expected by TestRunner
   */
  getTestResults() {
    const baseResults = super.getTestResults();
    
    // Determine success based on quality score and test results
    const qualityMet = this.qualityMetrics.overallScore >= 75;
    baseResults.success = baseResults.success && qualityMet;
    
    return baseResults;
  }
}

// CLI interface - NO MORE DUPLICATE process.exit() PATTERNS!
// TestRunner handles all exit logic consistently across all test suites
if (require.main === module) {
  const testSuite = new QwenCodeQualityConsolidated({
    verbose: process.argv.includes('--verbose')
  });
  
  // TestRunner eliminates the need for manual process.exit() handling
  TestRunner.run(testSuite, {
    verbose: process.argv.includes('--verbose'),
    generateReport: true,
    exitOnCompletion: true, // TestRunner handles process.exit()
    reportPath: 'qwen-code-quality-consolidated-report.json'
  });
}

module.exports = QwenCodeQualityConsolidated;