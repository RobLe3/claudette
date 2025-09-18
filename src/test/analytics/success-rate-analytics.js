#!/usr/bin/env node

// Success rate analytics for monitoring system health
// Analyzes request success rates and identifies patterns

const fs = require('fs');
const path = require('path');

class SuccessRateAnalytics {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      platform: process.platform,
      nodeVersion: process.version,
      analytics: {
        overallSuccessRate: 0,
        backendSuccessRates: {},
        errorPatterns: [],
        recommendations: []
      },
      tests: []
    };
    
    this.mockData = this.generateMockData();
  }

  async runAnalytics() {
    console.log('📊 Starting Success Rate Analytics');
    console.log('==================================');

    try {
      await this.analyzeOverallSuccessRate();
      await this.analyzeBackendSuccessRates();
      await this.analyzeErrorPatterns();
      await this.generateRecommendations();
      
      this.saveResults();
      this.displayResults();
      
      return this.results.analytics.overallSuccessRate >= 0.95;
      
    } catch (error) {
      console.error('❌ Analytics failed:', error.message);
      return false;
    }
  }

  generateMockData() {
    // Generate mock request data for analytics
    const requests = [];
    const backends = ['openai', 'claude', 'qwen', 'mock'];
    const errorTypes = ['timeout', 'auth_error', 'rate_limit', 'network_error', null];
    
    for (let i = 0; i < 1000; i++) {
      const backend = backends[Math.floor(Math.random() * backends.length)];
      const success = Math.random() > 0.1; // 90% success rate baseline
      
      requests.push({
        id: `req_${i}`,
        backend,
        success,
        error: success ? null : errorTypes[Math.floor(Math.random() * errorTypes.length)],
        latency: Math.random() * 2000 + 100,
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        tokens: Math.floor(Math.random() * 1000) + 100
      });
    }
    
    return requests;
  }

  async analyzeOverallSuccessRate() {
    console.log('\n📈 Analyzing Overall Success Rate');
    
    const totalRequests = this.mockData.length;
    const successfulRequests = this.mockData.filter(r => r.success).length;
    const successRate = successfulRequests / totalRequests;
    
    this.results.analytics.overallSuccessRate = successRate;
    
    const status = successRate >= 0.95 ? '✅' : successRate >= 0.90 ? '⚠️' : '❌';
    console.log(`   ${status} Success Rate: ${(successRate * 100).toFixed(2)}% (${successfulRequests}/${totalRequests})`);
    
    this.addTestResult('Overall Success Rate', successRate, 0.95, successRate >= 0.95);
  }

  async analyzeBackendSuccessRates() {
    console.log('\n🎯 Analyzing Backend Success Rates');
    
    const backendStats = {};
    
    // Group by backend
    this.mockData.forEach(request => {
      if (!backendStats[request.backend]) {
        backendStats[request.backend] = {
          total: 0,
          successful: 0,
          errors: {}
        };
      }
      
      backendStats[request.backend].total++;
      if (request.success) {
        backendStats[request.backend].successful++;
      } else {
        const errorType = request.error || 'unknown';
        backendStats[request.backend].errors[errorType] = 
          (backendStats[request.backend].errors[errorType] || 0) + 1;
      }
    });
    
    // Calculate success rates
    Object.keys(backendStats).forEach(backend => {
      const stats = backendStats[backend];
      const successRate = stats.successful / stats.total;
      
      this.results.analytics.backendSuccessRates[backend] = {
        successRate,
        total: stats.total,
        successful: stats.successful,
        failed: stats.total - stats.successful,
        topErrors: Object.entries(stats.errors)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([error, count]) => ({ error, count }))
      };
      
      const status = successRate >= 0.95 ? '✅' : successRate >= 0.90 ? '⚠️' : '❌';
      console.log(`   ${status} ${backend}: ${(successRate * 100).toFixed(2)}% (${stats.successful}/${stats.total})`);
      
      if (stats.errors && Object.keys(stats.errors).length > 0) {
        const topError = Object.entries(stats.errors).sort(([,a], [,b]) => b - a)[0];
        console.log(`      Top error: ${topError[0]} (${topError[1]} occurrences)`);
      }
    });
    
    // Test each backend
    Object.keys(backendStats).forEach(backend => {
      const successRate = backendStats[backend].successful / backendStats[backend].total;
      this.addTestResult(`${backend} Success Rate`, successRate, 0.90, successRate >= 0.90);
    });
  }

  async analyzeErrorPatterns() {
    console.log('\n🔍 Analyzing Error Patterns');
    
    const errors = this.mockData.filter(r => !r.success);
    const errorPatterns = {};
    
    errors.forEach(request => {
      const error = request.error || 'unknown';
      if (!errorPatterns[error]) {
        errorPatterns[error] = {
          count: 0,
          backends: {},
          avgLatency: 0,
          latencies: []
        };
      }
      
      errorPatterns[error].count++;
      errorPatterns[error].backends[request.backend] = 
        (errorPatterns[error].backends[request.backend] || 0) + 1;
      errorPatterns[error].latencies.push(request.latency);
    });
    
    // Calculate average latencies and sort by frequency
    Object.keys(errorPatterns).forEach(error => {
      const pattern = errorPatterns[error];
      pattern.avgLatency = pattern.latencies.reduce((a, b) => a + b, 0) / pattern.latencies.length;
    });
    
    const sortedPatterns = Object.entries(errorPatterns)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 5);
    
    this.results.analytics.errorPatterns = sortedPatterns.map(([error, data]) => ({
      error,
      count: data.count,
      percentage: (data.count / errors.length) * 100,
      avgLatency: data.avgLatency,
      affectedBackends: Object.keys(data.backends).length
    }));
    
    sortedPatterns.forEach(([error, data]) => {
      const percentage = (data.count / errors.length) * 100;
      console.log(`   🔸 ${error}: ${data.count} occurrences (${percentage.toFixed(1)}%)`);
      console.log(`      Avg latency: ${data.avgLatency.toFixed(0)}ms`);
      console.log(`      Affects ${Object.keys(data.backends).length} backend(s)`);
    });
    
    this.addTestResult('Error Pattern Analysis', sortedPatterns.length, 5, true);
  }

  async generateRecommendations() {
    console.log('\n💡 Generating Recommendations');
    
    const recommendations = [];
    const analytics = this.results.analytics;
    
    // Overall success rate recommendations
    if (analytics.overallSuccessRate < 0.95) {
      if (analytics.overallSuccessRate < 0.85) {
        recommendations.push({
          priority: 'high',
          category: 'reliability',
          title: 'Critical Success Rate Issue',
          description: `Success rate is ${(analytics.overallSuccessRate * 100).toFixed(1)}%, well below target of 95%`,
          actions: [
            'Investigate top error patterns immediately',
            'Consider enabling circuit breakers',
            'Review backend health monitoring'
          ]
        });
      } else {
        recommendations.push({
          priority: 'medium',
          category: 'reliability',
          title: 'Success Rate Below Target',
          description: `Success rate is ${(analytics.overallSuccessRate * 100).toFixed(1)}%, target is 95%`,
          actions: [
            'Analyze error patterns for improvement opportunities',
            'Consider retry logic enhancements'
          ]
        });
      }
    }
    
    // Backend-specific recommendations
    Object.entries(analytics.backendSuccessRates).forEach(([backend, stats]) => {
      if (stats.successRate < 0.90) {
        recommendations.push({
          priority: stats.successRate < 0.80 ? 'high' : 'medium',
          category: 'backend',
          title: `${backend} Backend Issues`,
          description: `${backend} success rate is ${(stats.successRate * 100).toFixed(1)}%`,
          actions: [
            `Review ${backend} configuration`,
            'Check API key validity and permissions',
            'Monitor rate limiting issues'
          ]
        });
      }
    });
    
    // Error pattern recommendations
    analytics.errorPatterns.forEach(pattern => {
      if (pattern.percentage > 20) {
        let actions = [];
        switch (pattern.error) {
          case 'timeout':
            actions = [
              'Increase timeout thresholds',
              'Implement timeout optimization',
              'Consider backend load balancing'
            ];
            break;
          case 'auth_error':
            actions = [
              'Verify API key validity',
              'Check credential rotation schedule',
              'Review authentication configuration'
            ];
            break;
          case 'rate_limit':
            actions = [
              'Implement request throttling',
              'Review rate limit configurations',
              'Consider load distribution'
            ];
            break;
          case 'network_error':
            actions = [
              'Check network connectivity',
              'Implement retry with exponential backoff',
              'Review DNS and proxy settings'
            ];
            break;
          default:
            actions = ['Investigate root cause', 'Review error logs'];
        }
        
        recommendations.push({
          priority: pattern.percentage > 30 ? 'high' : 'medium',
          category: 'errors',
          title: `High ${pattern.error} Error Rate`,
          description: `${pattern.error} represents ${pattern.percentage.toFixed(1)}% of all errors`,
          actions
        });
      }
    });
    
    this.results.analytics.recommendations = recommendations;
    
    console.log(`   Generated ${recommendations.length} recommendations`);
    recommendations.forEach(rec => {
      const priority = rec.priority === 'high' ? '🔴' : '🟡';
      console.log(`   ${priority} ${rec.title}`);
      console.log(`      ${rec.description}`);
    });
  }

  addTestResult(name, value, threshold, passed, unit = '') {
    this.results.tests.push({
      name,
      value,
      threshold,
      passed,
      unit,
      timestamp: new Date().toISOString()
    });
  }

  saveResults() {
    const outputDir = path.join(__dirname, '../../build-artifacts');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const resultsFile = path.join(outputDir, 'success-rate-analytics-results.json');
    fs.writeFileSync(resultsFile, JSON.stringify(this.results, null, 2));
  }

  displayResults() {
    console.log('\n📊 Success Rate Analytics Summary');
    console.log('=================================');
    
    const analytics = this.results.analytics;
    
    console.log(`Overall Success Rate: ${(analytics.overallSuccessRate * 100).toFixed(2)}%`);
    console.log(`Backend Analysis: ${Object.keys(analytics.backendSuccessRates).length} backends`);
    console.log(`Error Patterns: ${analytics.errorPatterns.length} patterns identified`);
    console.log(`Recommendations: ${analytics.recommendations.length} generated`);
    
    const highPriorityRecs = analytics.recommendations.filter(r => r.priority === 'high').length;
    if (highPriorityRecs > 0) {
      console.log(`🔴 High Priority Issues: ${highPriorityRecs}`);
    }
    
    const overallStatus = analytics.overallSuccessRate >= 0.95 ? '✅ EXCELLENT' : 
                         analytics.overallSuccessRate >= 0.90 ? '⚠️ GOOD' : '❌ NEEDS ATTENTION';
    console.log(`\nOverall Status: ${overallStatus}`);
  }
}

// Run analytics if called directly
if (require.main === module) {
  const analytics = new SuccessRateAnalytics();
  analytics.runAnalytics()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Analytics error:', error);
      process.exit(1);
    });
}

module.exports = SuccessRateAnalytics;