#!/usr/bin/env node

/**
 * Installation Success Rate Analytics and Reporting
 * 
 * Provides comprehensive analytics and reporting for Claudette installation
 * success rates across all platforms, methods, and user journeys to ensure
 * >95% success rate target for emergency foundation deployment.
 * 
 * Features:
 * - Cross-platform success rate aggregation and analysis
 * - Historical trend analysis and regression detection
 * - Platform-specific failure pattern identification
 * - Real-time success rate monitoring and alerting
 * - Comprehensive reporting and visualization data export
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');

class SuccessRateAnalytics {
  constructor(options = {}) {
    this.options = {
      verbose: options.verbose || false,
      outputDir: options.outputDir || 'test-results/analytics',
      historyFile: options.historyFile || 'success-rate-history.json',
      targetSuccessRate: options.targetSuccessRate || 95,
      alertThreshold: options.alertThreshold || 90,
      reportFormat: options.reportFormat || 'json', // json, csv, html
      ...options
    };

    this.analysisId = crypto.randomBytes(4).toString('hex');
    this.results = {
      timestamp: new Date().toISOString(),
      analysisId: this.analysisId,
      environment: this.detectEnvironment(),
      aggregatedMetrics: {},
      platformAnalysis: {},
      methodAnalysis: {},
      journeyAnalysis: {},
      trendAnalysis: {},
      summary: {
        overallSuccessRate: 0,
        platformSuccessRates: {},
        methodSuccessRates: {},
        journeySuccessRates: {},
        targetMet: false,
        regressionDetected: false,
        alertsGenerated: []
      }
    };

    this.testDataSources = [
      'fresh-system-validation',
      'e2e-user-journey',
      'performance-regression',
      'cross-platform-validation'
    ];
  }

  detectEnvironment() {
    return {
      platform: os.platform(),
      architecture: os.arch(),
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
      analysisTarget: 'emergency-foundation-deployment'
    };
  }

  log(level, message, data = null) {
    if (this.options.verbose || level === 'error') {
      const colors = {
        info: '\x1b[36m',
        success: '\x1b[32m',
        warning: '\x1b[33m',
        error: '\x1b[31m',
        analytics: '\x1b[35m',
        reset: '\x1b[0m'
      };
      
      console.log(`${colors[level] || ''}[${level.toUpperCase()}] ${message}${colors.reset}`);
      if (data && this.options.verbose) {
        console.log('  Data:', JSON.stringify(data, null, 2));
      }
    }
  }

  async loadTestResults() {
    this.log('info', 'Loading test results for analysis');
    
    const testResults = {
      freshSystem: [],
      userJourney: [],
      performance: [],
      crossPlatform: []
    };

    try {
      // Load fresh system validation results
      const freshSystemFiles = await this.findResultFiles('fresh-system-validation-*.json');
      for (const file of freshSystemFiles) {
        const data = JSON.parse(await fs.readFile(file, 'utf8'));
        testResults.freshSystem.push(this.normalizeFreshSystemData(data));
      }

      // Load user journey results
      const userJourneyFiles = await this.findResultFiles('e2e-user-journey-*.json');
      for (const file of userJourneyFiles) {
        const data = JSON.parse(await fs.readFile(file, 'utf8'));
        testResults.userJourney.push(this.normalizeUserJourneyData(data));
      }

      // Load performance regression results
      const performanceFiles = await this.findResultFiles('performance-regression-*.json');
      for (const file of performanceFiles) {
        const data = JSON.parse(await fs.readFile(file, 'utf8'));
        testResults.performance.push(this.normalizePerformanceData(data));
      }

      this.log('success', `Loaded ${Object.values(testResults).flat().length} test result files`);
      return testResults;

    } catch (error) {
      this.log('error', `Failed to load test results: ${error.message}`);
      throw error;
    }
  }

  async findResultFiles(pattern) {
    try {
      const currentDir = process.cwd();
      const files = await fs.readdir(currentDir);
      
      // Convert glob pattern to regex
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      const matchingFiles = files
        .filter(file => regex.test(file))
        .map(file => path.join(currentDir, file));

      return matchingFiles;
    } catch (error) {
      return [];
    }
  }

  normalizeFreshSystemData(data) {
    return {
      source: 'fresh-system',
      timestamp: data.timestamp,
      testId: data.testId || data.metadata?.testId,
      environment: data.environment,
      successRate: data.summary?.successRate || 0,
      totalTests: data.summary?.total || 0,
      passedTests: data.summary?.passed || 0,
      failedTests: data.summary?.failed || 0,
      methods: data.methodSummary || {},
      platform: data.environment?.platform,
      architecture: data.environment?.architecture,
      nodeVersion: data.environment?.nodeVersion
    };
  }

  normalizeUserJourneyData(data) {
    return {
      source: 'user-journey',
      timestamp: data.timestamp,
      journeyId: data.journeyId || data.metadata?.journeyId,
      environment: data.environment,
      successRate: data.metrics?.journeySuccessRate || 0,
      setupSuccessRate: data.metrics?.setupSuccessRate || 0,
      totalJourneys: data.summary?.totalJourneys || 0,
      completedJourneys: data.summary?.completedJourneys || 0,
      failedJourneys: data.summary?.failedJourneys || 0,
      averageSetupTime: data.summary?.averageSetupTime || 0,
      setupTargetMet: data.summary?.setupTargetMet || false,
      journeys: data.journeys || {},
      platform: data.environment?.platform,
      architecture: data.environment?.architecture
    };
  }

  normalizePerformanceData(data) {
    return {
      source: 'performance',
      timestamp: data.timestamp,
      testSuiteId: data.testSuiteId || data.metadata?.testSuiteId,
      environment: data.environment,
      totalBenchmarks: data.summary?.totalBenchmarks || 0,
      passedBenchmarks: data.summary?.passedBenchmarks || 0,
      failedBenchmarks: data.summary?.failedBenchmarks || 0,
      regressions: data.summary?.regressions || 0,
      improvements: data.summary?.improvements || 0,
      benchmarks: data.benchmarks || {},
      regressionAnalysis: data.regressionAnalysis || {},
      platform: data.environment?.platform,
      architecture: data.environment?.architecture
    };
  }

  async analyzeSuccessRates(testResults) {
    this.log('analytics', 'Analyzing success rates across all test dimensions');

    // Aggregate overall success rate
    await this.calculateOverallSuccessRate(testResults);

    // Platform-specific analysis
    await this.analyzePlatformSuccessRates(testResults);

    // Method-specific analysis
    await this.analyzeMethodSuccessRates(testResults);

    // Journey-specific analysis
    await this.analyzeJourneySuccessRates(testResults);

    // Calculate weighted success rate
    await this.calculateWeightedSuccessRate();

    // Analyze trends and regressions
    await this.analyzeTrends();

    // Generate alerts
    await this.generateAlerts();
  }

  async calculateOverallSuccessRate(testResults) {
    const allResults = Object.values(testResults).flat();
    
    if (allResults.length === 0) {
      this.results.summary.overallSuccessRate = 0;
      return;
    }

    let totalTests = 0;
    let passedTests = 0;
    let weightedSum = 0;
    let totalWeight = 0;

    for (const result of allResults) {
      const weight = this.getResultWeight(result.source);
      const successRate = result.successRate || 0;
      
      weightedSum += successRate * weight;
      totalWeight += weight;
      
      totalTests += result.totalTests || result.totalJourneys || result.totalBenchmarks || 0;
      passedTests += result.passedTests || result.completedJourneys || result.passedBenchmarks || 0;
    }

    this.results.summary.overallSuccessRate = totalWeight > 0 
      ? Math.round((weightedSum / totalWeight) * 100) / 100
      : 0;

    this.results.aggregatedMetrics = {
      totalTestRuns: allResults.length,
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      weightedSuccessRate: this.results.summary.overallSuccessRate,
      simpleSuccessRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100 * 100) / 100 : 0
    };

    this.results.summary.targetMet = this.results.summary.overallSuccessRate >= this.options.targetSuccessRate;

    this.log('success', `Overall success rate: ${this.results.summary.overallSuccessRate}% (target: ${this.options.targetSuccessRate}%)`);
  }

  getResultWeight(source) {
    // Weights for different test types (emergency deployment priorities)
    const weights = {
      'fresh-system': 40, // Highest priority - installation success
      'user-journey': 30, // User experience critical
      'performance': 20,  // Performance important but not critical
      'cross-platform': 10 // Platform coverage important
    };
    
    return weights[source] || 10;
  }

  async analyzePlatformSuccessRates(testResults) {
    this.log('analytics', 'Analyzing platform-specific success rates');

    const platformData = {};
    
    for (const resultGroup of Object.values(testResults)) {
      for (const result of resultGroup) {
        const platform = result.platform || 'unknown';
        
        if (!platformData[platform]) {
          platformData[platform] = {
            platform,
            tests: [],
            totalTests: 0,
            passedTests: 0,
            successRates: []
          };
        }
        
        platformData[platform].tests.push(result);
        platformData[platform].totalTests += result.totalTests || result.totalJourneys || result.totalBenchmarks || 0;
        platformData[platform].passedTests += result.passedTests || result.completedJourneys || result.passedBenchmarks || 0;
        platformData[platform].successRates.push(result.successRate || 0);
      }
    }

    // Calculate platform success rates and statistics
    for (const [platform, data] of Object.entries(platformData)) {
      const successRate = data.totalTests > 0 
        ? Math.round((data.passedTests / data.totalTests) * 100 * 100) / 100
        : 0;
      
      const avgSuccessRate = data.successRates.length > 0
        ? Math.round((data.successRates.reduce((sum, rate) => sum + rate, 0) / data.successRates.length) * 100) / 100
        : 0;

      this.results.platformAnalysis[platform] = {
        platform,
        testRuns: data.tests.length,
        totalTests: data.totalTests,
        passedTests: data.passedTests,
        failedTests: data.totalTests - data.passedTests,
        successRate,
        averageSuccessRate: avgSuccessRate,
        targetMet: successRate >= this.options.targetSuccessRate,
        stability: this.calculateStability(data.successRates)
      };

      this.results.summary.platformSuccessRates[platform] = successRate;
    }
  }

  async analyzeMethodSuccessRates(testResults) {
    this.log('analytics', 'Analyzing installation method success rates');

    const methodData = {};
    
    // Extract method data from fresh system tests
    for (const result of testResults.freshSystem) {
      if (result.methods) {
        for (const [method, stats] of Object.entries(result.methods)) {
          if (!methodData[method]) {
            methodData[method] = {
              method,
              tests: [],
              totalTests: 0,
              passedTests: 0,
              successRates: []
            };
          }
          
          methodData[method].tests.push({ ...stats, source: result });
          methodData[method].totalTests += stats.total || 0;
          methodData[method].passedTests += stats.passed || 0;
          methodData[method].successRates.push(stats.successRate || 0);
        }
      }
    }

    // Calculate method success rates
    for (const [method, data] of Object.entries(methodData)) {
      const successRate = data.totalTests > 0 
        ? Math.round((data.passedTests / data.totalTests) * 100 * 100) / 100
        : 0;
      
      const avgSuccessRate = data.successRates.length > 0
        ? Math.round((data.successRates.reduce((sum, rate) => sum + rate, 0) / data.successRates.length) * 100) / 100
        : 0;

      this.results.methodAnalysis[method] = {
        method,
        testRuns: data.tests.length,
        totalTests: data.totalTests,
        passedTests: data.passedTests,
        failedTests: data.totalTests - data.passedTests,
        successRate,
        averageSuccessRate: avgSuccessRate,
        targetMet: successRate >= this.options.targetSuccessRate,
        reliability: this.calculateReliability(data.successRates)
      };

      this.results.summary.methodSuccessRates[method] = successRate;
    }
  }

  async analyzeJourneySuccessRates(testResults) {
    this.log('analytics', 'Analyzing user journey success rates');

    const journeyData = {};
    
    // Extract journey data from user journey tests
    for (const result of testResults.userJourney) {
      if (result.journeys) {
        for (const [journeyKey, journey] of Object.entries(result.journeys)) {
          const [journeyType] = journeyKey.split('-');
          
          if (!journeyData[journeyType]) {
            journeyData[journeyType] = {
              journeyType,
              tests: [],
              totalJourneys: 0,
              completedJourneys: 0,
              successRates: [],
              setupTimes: [],
              setupTargetsMet: []
            };
          }
          
          journeyData[journeyType].tests.push(journey);
          journeyData[journeyType].totalJourneys += 1;
          journeyData[journeyType].completedJourneys += journey.success ? 1 : 0;
          journeyData[journeyType].successRates.push(journey.success ? 100 : 0);
          
          if (journey.userExperience) {
            journeyData[journeyType].setupTimes.push(journey.userExperience.setupTime || 0);
            journeyData[journeyType].setupTargetsMet.push(journey.userExperience.setupWithinTarget || false);
          }
        }
      }
    }

    // Calculate journey success rates and metrics
    for (const [journeyType, data] of Object.entries(journeyData)) {
      const successRate = data.totalJourneys > 0 
        ? Math.round((data.completedJourneys / data.totalJourneys) * 100 * 100) / 100
        : 0;
      
      const avgSetupTime = data.setupTimes.length > 0
        ? Math.round(data.setupTimes.reduce((sum, time) => sum + time, 0) / data.setupTimes.length)
        : 0;

      const setupTargetMetRate = data.setupTargetsMet.length > 0
        ? Math.round((data.setupTargetsMet.filter(met => met).length / data.setupTargetsMet.length) * 100 * 100) / 100
        : 0;

      this.results.journeyAnalysis[journeyType] = {
        journeyType,
        testRuns: data.tests.length,
        totalJourneys: data.totalJourneys,
        completedJourneys: data.completedJourneys,
        failedJourneys: data.totalJourneys - data.completedJourneys,
        successRate,
        averageSetupTime: avgSetupTime,
        setupTargetMetRate,
        targetMet: successRate >= this.options.targetSuccessRate,
        userExperience: this.calculateUserExperienceScore(data)
      };

      this.results.summary.journeySuccessRates[journeyType] = successRate;
    }
  }

  calculateStability(successRates) {
    if (successRates.length < 2) return 100;
    
    const mean = successRates.reduce((sum, rate) => sum + rate, 0) / successRates.length;
    const variance = successRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / successRates.length;
    const stdDev = Math.sqrt(variance);
    
    // Stability score: lower standard deviation = higher stability
    return Math.max(0, Math.round((100 - stdDev) * 100) / 100);
  }

  calculateReliability(successRates) {
    if (successRates.length === 0) return 0;
    
    // Reliability based on consistency of high success rates
    const highSuccessCount = successRates.filter(rate => rate >= this.options.targetSuccessRate).length;
    return Math.round((highSuccessCount / successRates.length) * 100 * 100) / 100;
  }

  calculateUserExperienceScore(journeyData) {
    let score = 0;
    const factors = [];
    
    // Success rate factor (40%)
    const successRate = journeyData.totalJourneys > 0 
      ? (journeyData.completedJourneys / journeyData.totalJourneys) * 100
      : 0;
    factors.push(successRate * 0.4);
    
    // Setup time factor (30%)
    const avgSetupTime = journeyData.setupTimes.length > 0
      ? journeyData.setupTimes.reduce((sum, time) => sum + time, 0) / journeyData.setupTimes.length
      : 120000;
    const setupScore = Math.max(0, 100 - (avgSetupTime / 1200)); // Penalty for >2min setup
    factors.push(setupScore * 0.3);
    
    // Setup target met factor (20%)
    const setupTargetMetRate = journeyData.setupTargetsMet.length > 0
      ? (journeyData.setupTargetsMet.filter(met => met).length / journeyData.setupTargetsMet.length) * 100
      : 0;
    factors.push(setupTargetMetRate * 0.2);
    
    // Consistency factor (10%)
    const consistency = this.calculateStability(journeyData.successRates);
    factors.push(consistency * 0.1);
    
    return Math.round(factors.reduce((sum, factor) => sum + factor, 0) * 100) / 100;
  }

  async calculateWeightedSuccessRate() {
    // Recalculate with platform and method weights
    let weightedSum = 0;
    let totalWeight = 0;

    // Platform weights (critical platforms get higher weight)
    const platformWeights = {
      'linux': 35,   // Primary deployment target
      'darwin': 30,  // Developer workstations
      'win32': 25,   // Windows support important
      'unknown': 10
    };

    // Method weights (reliability priority)
    const methodWeights = {
      'npm': 40,     // Primary installation method
      'local': 35,   // Development/testing
      'github': 25   // Release distribution
    };

    for (const [platform, analysis] of Object.entries(this.results.platformAnalysis)) {
      const weight = platformWeights[platform] || 10;
      weightedSum += analysis.successRate * weight;
      totalWeight += weight;
    }

    if (totalWeight > 0) {
      this.results.aggregatedMetrics.platformWeightedSuccessRate = 
        Math.round((weightedSum / totalWeight) * 100) / 100;
    }

    // Method-weighted success rate
    weightedSum = 0;
    totalWeight = 0;

    for (const [method, analysis] of Object.entries(this.results.methodAnalysis)) {
      const weight = methodWeights[method] || 10;
      weightedSum += analysis.successRate * weight;
      totalWeight += weight;
    }

    if (totalWeight > 0) {
      this.results.aggregatedMetrics.methodWeightedSuccessRate = 
        Math.round((weightedSum / totalWeight) * 100) / 100;
    }
  }

  async analyzeTrends() {
    this.log('analytics', 'Analyzing success rate trends');

    try {
      const historyPath = path.join(this.options.outputDir, this.options.historyFile);
      const historyData = await this.loadHistoricalData(historyPath);
      
      if (historyData.analyses && historyData.analyses.length > 0) {
        const recent = historyData.analyses.slice(-5); // Last 5 analyses
        const successRates = recent.map(analysis => analysis.summary.overallSuccessRate);
        
        this.results.trendAnalysis = {
          historicalDataPoints: recent.length,
          successRateTrend: this.calculateTrend(successRates),
          averageSuccessRate: this.calculateAverage(successRates),
          volatility: this.calculateVolatility(successRates),
          regressionDetected: this.detectRegression(successRates),
          lastAnalysis: recent[recent.length - 1]?.timestamp
        };

        this.results.summary.regressionDetected = this.results.trendAnalysis.regressionDetected;
      }

      // Update historical data
      historyData.analyses = historyData.analyses || [];
      historyData.analyses.push({
        timestamp: this.results.timestamp,
        analysisId: this.analysisId,
        summary: this.results.summary
      });

      // Keep only last 50 analyses
      if (historyData.analyses.length > 50) {
        historyData.analyses = historyData.analyses.slice(-50);
      }

      await this.saveHistoricalData(historyPath, historyData);

    } catch (error) {
      this.log('warning', `Trend analysis failed: ${error.message}`);
      this.results.trendAnalysis = { available: false, error: error.message };
    }
  }

  async loadHistoricalData(historyPath) {
    try {
      await fs.mkdir(path.dirname(historyPath), { recursive: true });
      const data = await fs.readFile(historyPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return { analyses: [] };
    }
  }

  async saveHistoricalData(historyPath, data) {
    await fs.writeFile(historyPath, JSON.stringify(data, null, 2));
  }

  calculateTrend(values) {
    if (values.length < 2) return 'insufficient-data';
    
    const first = values[0];
    const last = values[values.length - 1];
    const change = last - first;
    
    if (change > 2) return 'improving';
    if (change < -2) return 'declining';
    return 'stable';
  }

  calculateAverage(values) {
    return values.length > 0 
      ? Math.round((values.reduce((sum, val) => sum + val, 0) / values.length) * 100) / 100
      : 0;
  }

  calculateVolatility(values) {
    if (values.length < 2) return 0;
    
    const mean = this.calculateAverage(values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.round(Math.sqrt(variance) * 100) / 100;
  }

  detectRegression(values) {
    if (values.length < 3) return false;
    
    const recent = values.slice(-3);
    const isDecreasing = recent.every((val, i) => i === 0 || val <= recent[i - 1]);
    const significantDrop = recent[0] - recent[recent.length - 1] > 5;
    
    return isDecreasing && significantDrop;
  }

  async generateAlerts() {
    this.log('analytics', 'Generating alerts based on success rate analysis');

    const alerts = [];

    // Overall success rate alert
    if (this.results.summary.overallSuccessRate < this.options.targetSuccessRate) {
      alerts.push({
        level: 'critical',
        type: 'success_rate_below_target',
        message: `Overall success rate ${this.results.summary.overallSuccessRate}% below target ${this.options.targetSuccessRate}%`,
        impact: 'emergency_deployment_blocked',
        recommendation: 'Review and fix failing tests before deployment'
      });
    } else if (this.results.summary.overallSuccessRate < this.options.alertThreshold) {
      alerts.push({
        level: 'warning',
        type: 'success_rate_approaching_threshold',
        message: `Overall success rate ${this.results.summary.overallSuccessRate}% approaching alert threshold ${this.options.alertThreshold}%`,
        impact: 'deployment_risk',
        recommendation: 'Monitor closely and investigate potential issues'
      });
    }

    // Platform-specific alerts
    for (const [platform, analysis] of Object.entries(this.results.platformAnalysis)) {
      if (analysis.successRate < this.options.targetSuccessRate) {
        alerts.push({
          level: 'warning',
          type: 'platform_success_rate_low',
          platform,
          message: `${platform} success rate ${analysis.successRate}% below target`,
          impact: 'platform_deployment_risk',
          recommendation: `Review ${platform}-specific test failures`
        });
      }
    }

    // Method-specific alerts
    for (const [method, analysis] of Object.entries(this.results.methodAnalysis)) {
      if (analysis.successRate < this.options.targetSuccessRate) {
        alerts.push({
          level: 'warning',
          type: 'method_success_rate_low',
          method,
          message: `${method} installation method success rate ${analysis.successRate}% below target`,
          impact: 'installation_method_risk',
          recommendation: `Review ${method} installation process and dependencies`
        });
      }
    }

    // Trend alerts
    if (this.results.trendAnalysis?.regressionDetected) {
      alerts.push({
        level: 'critical',
        type: 'success_rate_regression',
        message: 'Success rate regression detected in recent analyses',
        impact: 'deployment_quality_degradation',
        recommendation: 'Investigate recent changes causing regression'
      });
    }

    this.results.summary.alertsGenerated = alerts;
    
    this.log('info', `Generated ${alerts.length} alerts`);
    alerts.forEach(alert => {
      this.log(alert.level === 'critical' ? 'error' : 'warning', 
        `${alert.level.toUpperCase()}: ${alert.message}`);
    });
  }

  async runAnalysis() {
    this.log('info', '📊 Starting Success Rate Analytics and Reporting');
    this.log('info', `Analysis ID: ${this.analysisId}`);
    this.log('info', `Target success rate: ${this.options.targetSuccessRate}%`);

    const startTime = Date.now();

    try {
      await fs.mkdir(this.options.outputDir, { recursive: true });

      // Load test results
      const testResults = await this.loadTestResults();

      // Analyze success rates
      await this.analyzeSuccessRates(testResults);

      // Generate comprehensive report
      const report = await this.generateReport();

      const totalTime = Date.now() - startTime;
      this.log('info', `Analysis completed in ${totalTime}ms`);

      return {
        success: this.results.summary.targetMet && this.results.summary.alertsGenerated.filter(a => a.level === 'critical').length === 0,
        results: this.results,
        report
      };

    } catch (error) {
      this.log('error', `Analytics failed: ${error.message}`);
      throw error;
    }
  }

  async generateReport() {
    const reportPath = path.join(
      this.options.outputDir,
      `success-rate-analytics-${this.analysisId}.json`
    );

    const report = {
      metadata: {
        analysisId: this.analysisId,
        tool: 'SuccessRateAnalytics',
        version: '1.0.0',
        targetSuccessRate: this.options.targetSuccessRate,
        alertThreshold: this.options.alertThreshold,
        emergencyFoundationDeployment: true
      },
      ...this.results
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Generate additional formats if requested
    if (this.options.reportFormat === 'csv' || this.options.reportFormat === 'all') {
      await this.generateCSVReport();
    }

    if (this.options.reportFormat === 'html' || this.options.reportFormat === 'all') {
      await this.generateHTMLReport();
    }

    this.log('success', `Analytics report generated: ${reportPath}`);

    return {
      path: reportPath,
      data: report
    };
  }

  async generateCSVReport() {
    const csvPath = path.join(
      this.options.outputDir,
      `success-rate-analytics-${this.analysisId}.csv`
    );

    const csvData = [];
    
    // Headers
    csvData.push([
      'Category', 'Item', 'Success Rate (%)', 'Total Tests', 'Passed Tests', 
      'Failed Tests', 'Target Met', 'Notes'
    ]);

    // Overall metrics
    csvData.push([
      'Overall', 'All Tests', this.results.summary.overallSuccessRate,
      this.results.aggregatedMetrics.totalTests,
      this.results.aggregatedMetrics.passedTests,
      this.results.aggregatedMetrics.failedTests,
      this.results.summary.targetMet,
      'Emergency deployment target'
    ]);

    // Platform data
    for (const [platform, analysis] of Object.entries(this.results.platformAnalysis)) {
      csvData.push([
        'Platform', platform, analysis.successRate, analysis.totalTests,
        analysis.passedTests, analysis.failedTests, analysis.targetMet,
        `Stability: ${analysis.stability}%`
      ]);
    }

    // Method data
    for (const [method, analysis] of Object.entries(this.results.methodAnalysis)) {
      csvData.push([
        'Method', method, analysis.successRate, analysis.totalTests,
        analysis.passedTests, analysis.failedTests, analysis.targetMet,
        `Reliability: ${analysis.reliability}%`
      ]);
    }

    // Journey data
    for (const [journey, analysis] of Object.entries(this.results.journeyAnalysis)) {
      csvData.push([
        'Journey', journey, analysis.successRate, analysis.totalJourneys,
        analysis.completedJourneys, analysis.failedJourneys, analysis.targetMet,
        `UX Score: ${analysis.userExperience}%`
      ]);
    }

    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    await fs.writeFile(csvPath, csvContent);

    this.log('success', `CSV report generated: ${csvPath}`);
  }

  async generateHTMLReport() {
    const htmlPath = path.join(
      this.options.outputDir,
      `success-rate-analytics-${this.analysisId}.html`
    );

    const html = this.generateHTMLContent();
    await fs.writeFile(htmlPath, html);

    this.log('success', `HTML report generated: ${htmlPath}`);
  }

  generateHTMLContent() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claudette Success Rate Analytics - ${this.analysisId}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; border-radius: 5px; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; }
        .warning { background: #fff3cd; border: 1px solid #ffeeba; }
        .danger { background: #f8d7da; border: 1px solid #f5c6cb; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        .table th { background: #f8f9fa; }
        .alert { padding: 15px; margin: 10px 0; border-radius: 5px; }
        .alert-critical { background: #f8d7da; border: 1px solid #f5c6cb; }
        .alert-warning { background: #fff3cd; border: 1px solid #ffeeba; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Claudette Success Rate Analytics</h1>
        <p>Emergency Foundation Deployment Validation</p>
        <p>Analysis ID: ${this.analysisId} | Generated: ${new Date(this.results.timestamp).toLocaleString()}</p>
    </div>

    <div class="metric ${this.results.summary.targetMet ? 'success' : 'danger'}">
        <h3>Overall Success Rate</h3>
        <h2>${this.results.summary.overallSuccessRate}%</h2>
        <p>Target: ${this.options.targetSuccessRate}% | ${this.results.summary.targetMet ? '✅ MET' : '❌ NOT MET'}</p>
    </div>

    ${this.results.summary.alertsGenerated.length > 0 ? `
    <div class="alerts">
        <h2>🚨 Alerts Generated</h2>
        ${this.results.summary.alertsGenerated.map(alert => `
        <div class="alert alert-${alert.level === 'critical' ? 'critical' : 'warning'}">
            <strong>${alert.level.toUpperCase()}:</strong> ${alert.message}
            <br><em>Recommendation: ${alert.recommendation}</em>
        </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="section">
        <h2>📊 Platform Analysis</h2>
        <table class="table">
            <tr>
                <th>Platform</th>
                <th>Success Rate</th>
                <th>Test Runs</th>
                <th>Total Tests</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Stability</th>
            </tr>
            ${Object.entries(this.results.platformAnalysis).map(([platform, analysis]) => `
            <tr>
                <td>${platform}</td>
                <td class="${analysis.targetMet ? 'success' : 'danger'}">${analysis.successRate}%</td>
                <td>${analysis.testRuns}</td>
                <td>${analysis.totalTests}</td>
                <td>${analysis.passedTests}</td>
                <td>${analysis.failedTests}</td>
                <td>${analysis.stability}%</td>
            </tr>
            `).join('')}
        </table>
    </div>

    <div class="section">
        <h2>🔧 Installation Method Analysis</h2>
        <table class="table">
            <tr>
                <th>Method</th>
                <th>Success Rate</th>
                <th>Test Runs</th>
                <th>Total Tests</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Reliability</th>
            </tr>
            ${Object.entries(this.results.methodAnalysis).map(([method, analysis]) => `
            <tr>
                <td>${method}</td>
                <td class="${analysis.targetMet ? 'success' : 'danger'}">${analysis.successRate}%</td>
                <td>${analysis.testRuns}</td>
                <td>${analysis.totalTests}</td>
                <td>${analysis.passedTests}</td>
                <td>${analysis.failedTests}</td>
                <td>${analysis.reliability}%</td>
            </tr>
            `).join('')}
        </table>
    </div>

    <div class="section">
        <h2>🎭 User Journey Analysis</h2>
        <table class="table">
            <tr>
                <th>Journey Type</th>
                <th>Success Rate</th>
                <th>Total Journeys</th>
                <th>Completed</th>
                <th>Failed</th>
                <th>Avg Setup Time</th>
                <th>UX Score</th>
            </tr>
            ${Object.entries(this.results.journeyAnalysis).map(([journey, analysis]) => `
            <tr>
                <td>${journey}</td>
                <td class="${analysis.targetMet ? 'success' : 'danger'}">${analysis.successRate}%</td>
                <td>${analysis.totalJourneys}</td>
                <td>${analysis.completedJourneys}</td>
                <td>${analysis.failedJourneys}</td>
                <td>${analysis.averageSetupTime}ms</td>
                <td>${analysis.userExperience}%</td>
            </tr>
            `).join('')}
        </table>
    </div>

    ${this.results.trendAnalysis?.available !== false ? `
    <div class="section">
        <h2>📈 Trend Analysis</h2>
        <div class="metric">
            <h3>Success Rate Trend</h3>
            <p>${this.results.trendAnalysis.successRateTrend}</p>
        </div>
        <div class="metric">
            <h3>Historical Average</h3>
            <p>${this.results.trendAnalysis.averageSuccessRate}%</p>
        </div>
        <div class="metric ${this.results.trendAnalysis.regressionDetected ? 'danger' : 'success'}">
            <h3>Regression Status</h3>
            <p>${this.results.trendAnalysis.regressionDetected ? '⚠️ Detected' : '✅ None'}</p>
        </div>
    </div>
    ` : ''}

    <div class="section">
        <h2>🌍 Environment Information</h2>
        <table class="table">
            <tr><th>Property</th><th>Value</th></tr>
            <tr><td>Platform</td><td>${this.results.environment.platform}</td></tr>
            <tr><td>Architecture</td><td>${this.results.environment.architecture}</td></tr>
            <tr><td>Node.js Version</td><td>${this.results.environment.nodeVersion}</td></tr>
            <tr><td>Analysis Target</td><td>${this.results.environment.analysisTarget}</td></tr>
        </table>
    </div>

    <div class="footer">
        <p><em>Generated by Claudette Success Rate Analytics v1.0.0</em></p>
        <p><em>Emergency Foundation Deployment Validation Framework</em></p>
    </div>
</body>
</html>`;
  }

  printSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 CLAUDETTE SUCCESS RATE ANALYTICS RESULTS');
    console.log('='.repeat(80));
    
    console.log(`\n🎯 OVERALL METRICS:`);
    console.log(`   Analysis ID: ${this.analysisId}`);
    console.log(`   Overall Success Rate: ${this.results.summary.overallSuccessRate}%`);
    console.log(`   Target Success Rate: ${this.options.targetSuccessRate}%`);
    console.log(`   Target Met: ${this.results.summary.targetMet ? '✅ YES' : '❌ NO'}`);
    
    if (this.results.aggregatedMetrics.totalTests > 0) {
      console.log(`   Total Tests: ${this.results.aggregatedMetrics.totalTests}`);
      console.log(`   Passed Tests: ${this.results.aggregatedMetrics.passedTests}`);
      console.log(`   Failed Tests: ${this.results.aggregatedMetrics.failedTests}`);
    }
    
    console.log(`\n🖥️  PLATFORM BREAKDOWN:`);
    for (const [platform, analysis] of Object.entries(this.results.platformAnalysis)) {
      const status = analysis.targetMet ? '✅' : '❌';
      console.log(`   ${status} ${platform}: ${analysis.successRate}% (${analysis.testRuns} runs, stability: ${analysis.stability}%)`);
    }
    
    console.log(`\n🔧 INSTALLATION METHOD BREAKDOWN:`);
    for (const [method, analysis] of Object.entries(this.results.methodAnalysis)) {
      const status = analysis.targetMet ? '✅' : '❌';
      console.log(`   ${status} ${method}: ${analysis.successRate}% (${analysis.testRuns} runs, reliability: ${analysis.reliability}%)`);
    }
    
    console.log(`\n🎭 USER JOURNEY BREAKDOWN:`);
    for (const [journey, analysis] of Object.entries(this.results.journeyAnalysis)) {
      const status = analysis.targetMet ? '✅' : '❌';
      console.log(`   ${status} ${journey}: ${analysis.successRate}% (setup: ${analysis.averageSetupTime}ms, UX: ${analysis.userExperience}%)`);
    }
    
    if (this.results.summary.alertsGenerated.length > 0) {
      console.log(`\n🚨 ALERTS GENERATED:`);
      this.results.summary.alertsGenerated.forEach(alert => {
        const icon = alert.level === 'critical' ? '🔴' : '🟡';
        console.log(`   ${icon} ${alert.type}: ${alert.message}`);
      });
    }
    
    if (this.results.trendAnalysis?.available !== false) {
      console.log(`\n📈 TREND ANALYSIS:`);
      console.log(`   Success Rate Trend: ${this.results.trendAnalysis.successRateTrend}`);
      console.log(`   Historical Average: ${this.results.trendAnalysis.averageSuccessRate}%`);
      console.log(`   Volatility: ${this.results.trendAnalysis.volatility}%`);
      console.log(`   Regression Detected: ${this.results.trendAnalysis.regressionDetected ? '⚠️ YES' : '✅ NO'}`);
    }
    
    console.log('\n' + '='.repeat(80));
    
    const emergencyReady = this.results.summary.targetMet && 
      this.results.summary.alertsGenerated.filter(a => a.level === 'critical').length === 0;
    
    if (emergencyReady) {
      console.log('🎉 SUCCESS RATE VALIDATION PASSED - EMERGENCY DEPLOYMENT APPROVED');
    } else {
      console.log('⚠️ SUCCESS RATE VALIDATION FAILED - REVIEW ISSUES BEFORE DEPLOYMENT');
    }
    
    console.log('='.repeat(80));
  }
}

// CLI interface
if (require.main === module) {
  const analytics = new SuccessRateAnalytics({
    verbose: process.argv.includes('--verbose'),
    targetSuccessRate: 95,
    alertThreshold: 90,
    reportFormat: process.argv.includes('--format=all') ? 'all' : 'json',
    outputDir: 'test-results/analytics'
  });

  analytics.runAnalysis()
    .then(result => {
      analytics.printSummary();
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Success rate analytics failed:', error.message);
      process.exit(1);
    });
}

module.exports = SuccessRateAnalytics;