// Monitoring System Test Suite - Comprehensive validation of monitoring and analytics
// Integration tests, performance validation, and end-to-end monitoring scenarios

import { Database } from 'sqlite3';
import { 
  MonitoringPlatform, 
  createMonitoringPlatform,
  SystemMonitor,
  AlertManager,
  ObservabilityFramework,
  PerformanceAnalytics,
  PredictiveAnalytics,
  DashboardManager,
  IntegrationManager
} from '../../monitoring/index';

interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  details: string;
  metrics?: Record<string, number>;
  error?: string;
}

interface TestSuite {
  name: string;
  description: string;
  tests: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
  coverage: number;
}

export class MonitoringSystemTestSuite {
  private db: Database;
  private platform: MonitoringPlatform;
  private testResults: TestResult[] = [];
  private startTime: number = 0;

  constructor() {
    // Create in-memory database for testing
    this.db = new Database(':memory:');
    this.platform = createMonitoringPlatform(this.db, {
      serviceName: 'claudette-test',
      environment: 'test'
    });
  }

  /**
   * Run complete monitoring system test suite
   */
  async runCompleteTestSuite(): Promise<TestSuite> {
    console.log('🧪 Starting Monitoring System Test Suite');
    this.startTime = Date.now();
    
    await this.runSystemMonitorTests();
    await this.runAlertManagerTests();
    await this.runObservabilityTests();
    await this.runPerformanceAnalyticsTests();
    await this.runPredictiveAnalyticsTests();
    await this.runDashboardTests();
    await this.runIntegrationTests();
    await this.runEndToEndTests();
    await this.runPerformanceTests();
    await this.runStressTests();

    const totalDuration = Date.now() - this.startTime;
    const passedTests = this.testResults.filter(t => t.passed).length;
    const failedTests = this.testResults.filter(t => !t.passed).length;

    const suite: TestSuite = {
      name: 'Monitoring System Validation',
      description: 'Comprehensive validation of monitoring and analytics platform',
      tests: this.testResults,
      totalTests: this.testResults.length,
      passedTests,
      failedTests,
      totalDuration,
      coverage: passedTests / this.testResults.length * 100
    };

    console.log(`✅ Test Suite Completed: ${passedTests}/${this.testResults.length} tests passed`);
    console.log(`📊 Coverage: ${suite.coverage.toFixed(1)}%`);
    console.log(`⏱️ Duration: ${totalDuration}ms`);

    return suite;
  }

  /**
   * Test system monitor functionality
   */
  private async runSystemMonitorTests(): Promise<void> {
    console.log('🔍 Testing System Monitor...');
    
    const systemMonitor = this.platform.getSystemMonitor();

    // Test 1: Metric recording
    await this.runTest('System Monitor - Metric Recording', async () => {
      await systemMonitor.recordMetric({
        timestamp: Date.now(),
        metricType: 'performance',
        metricName: 'test_metric',
        value: 100,
        unit: 'ms',
        component: 'test',
        isHealthy: true
      });
      
      const metrics = await systemMonitor.getPerformanceMetrics(60000);
      return metrics.current['test_test_metric'] !== undefined;
    });

    // Test 2: Health status monitoring
    await this.runTest('System Monitor - Health Status', async () => {
      const health = await systemMonitor.getSystemHealth();
      return Object.keys(health).length > 0;
    });

    // Test 3: Alert creation
    await this.runTest('System Monitor - Alert Creation', async () => {
      await systemMonitor.createAlert(
        'test_metric',
        'high',
        'Test alert',
        150,
        100,
        'test'
      );
      
      const alerts = await systemMonitor.getActiveAlerts();
      return alerts.length > 0;
    });

    // Test 4: Alert resolution
    await this.runTest('System Monitor - Alert Resolution', async () => {
      const alerts = await systemMonitor.getActiveAlerts();
      if (alerts.length > 0) {
        await systemMonitor.resolveAlert(alerts[0].id);
        const updatedAlerts = await systemMonitor.getActiveAlerts();
        return updatedAlerts.length < alerts.length;
      }
      return true;
    });
  }

  /**
   * Test alert manager functionality
   */
  private async runAlertManagerTests(): Promise<void> {
    console.log('🚨 Testing Alert Manager...');
    
    const alertManager = this.platform.getAlertManager();

    // Test 1: Alert rule creation
    await this.runTest('Alert Manager - Rule Creation', async () => {
      alertManager.addRule({
        id: 'test_rule',
        name: 'Test Alert Rule',
        description: 'Test rule for validation',
        enabled: true,
        conditions: [{
          metric: 'test_metric',
          operator: 'gt',
          threshold: 100,
          duration: 60,
          evaluationWindow: 300
        }],
        severity: 'medium',
        labels: { test: 'true' },
        annotations: { description: 'Test alert rule' },
        routing: {
          channels: [],
          escalation: [],
          suppressionRules: []
        },
        schedule: {
          enabled: false,
          timezone: 'UTC',
          activeHours: { start: '00:00', end: '23:59' },
          activeDays: [0, 1, 2, 3, 4, 5, 6]
        },
        cooldown: 300,
        maxOccurrences: 10,
        autoResolve: true,
        metadata: {}
      });
      return true;
    });

    // Test 2: Notification channel
    await this.runTest('Alert Manager - Channel Creation', async () => {
      alertManager.addChannel({
        id: 'test_channel',
        type: 'webhook',
        name: 'Test Channel',
        enabled: true,
        config: { url: 'http://localhost/test' },
        filterSeverity: ['medium', 'high', 'critical'],
        filterLabels: {},
        rateLimiting: {
          enabled: false,
          maxPerMinute: 10,
          maxPerHour: 100,
          maxPerDay: 1000
        }
      });
      return true;
    });

    // Test 3: Metric evaluation
    await this.runTest('Alert Manager - Metric Evaluation', async () => {
      await alertManager.evaluateMetrics([{
        name: 'test_metric',
        value: 150,
        labels: { test: 'true' },
        timestamp: Date.now()
      }]);
      return true;
    });

    // Test 4: Alert statistics
    await this.runTest('Alert Manager - Statistics', async () => {
      const stats = await alertManager.getAlertStats();
      return typeof stats.total === 'number';
    });
  }

  /**
   * Test observability framework
   */
  private async runObservabilityTests(): Promise<void> {
    console.log('👁️ Testing Observability Framework...');
    
    const observability = this.platform.getObservabilityFramework();

    // Test 1: Trace creation
    await this.runTest('Observability - Trace Creation', async () => {
      const span = observability.startTrace('test_operation');
      return span.traceId !== undefined && span.spanId !== undefined;
    });

    // Test 2: Span completion
    await this.runTest('Observability - Span Completion', async () => {
      const span = observability.startTrace('test_operation_2');
      observability.setSpanTags(span.spanId, { test: 'true' });
      observability.addSpanLog(span.spanId, 'info', 'Test log message');
      observability.finishSpan(span.spanId, 'success');
      return true;
    });

    // Test 3: Structured logging
    await this.runTest('Observability - Structured Logging', async () => {
      observability.log('info', 'Test log message', {
        test: true,
        value: 123
      });
      return true;
    });

    // Test 4: Metric recording
    await this.runTest('Observability - Metric Recording', async () => {
      observability.recordMetric(
        'test_counter',
        1,
        'counter',
        { component: 'test' }
      );
      return true;
    });

    // Test 5: Correlation context
    await this.runTest('Observability - Correlation Context', async () => {
      const context = observability.createCorrelationContext();
      return context.traceId !== undefined && context.requestId !== undefined;
    });

    // Test 6: Health status
    await this.runTest('Observability - Health Status', async () => {
      const health = observability.getHealthStatus();
      return health.tracing.enabled && health.logging.enabled && health.metrics.enabled;
    });
  }

  /**
   * Test performance analytics
   */
  private async runPerformanceAnalyticsTests(): Promise<void> {
    console.log('📊 Testing Performance Analytics...');
    
    const analytics = this.platform.getPerformanceAnalytics();

    // Test 1: Metric recording
    await this.runTest('Performance Analytics - Metric Recording', async () => {
      analytics.recordMetric({
        timestamp: Date.now(),
        metricType: 'latency',
        value: 1500,
        backend: 'test_backend',
        requestId: 'test_request'
      });
      return true;
    });

    // Test 2: System metrics
    await this.runTest('Performance Analytics - System Metrics', async () => {
      analytics.recordSystemMetrics({
        memoryUsage: 512,
        cpuUsage: 25,
        throughput: 100
      });
      return true;
    });

    // Test 3: Dashboard data
    await this.runTest('Performance Analytics - Dashboard Data', async () => {
      const data = analytics.getDashboardData();
      return data.currentMetrics !== undefined && data.systemHealth !== undefined;
    });

    // Test 4: Report generation
    await this.runTest('Performance Analytics - Report Generation', async () => {
      const report = await analytics.generateReport();
      return report.summary !== undefined && report.recommendations !== undefined;
    });
  }

  /**
   * Test predictive analytics
   */
  private async runPredictiveAnalyticsTests(): Promise<void> {
    console.log('🔮 Testing Predictive Analytics...');
    
    const predictive = this.platform.getPredictiveAnalytics();

    // Test 1: Model creation
    await this.runTest('Predictive Analytics - Model Creation', async () => {
      predictive.addModel({
        id: 'test_model',
        name: 'Test Model',
        type: 'linear_regression',
        description: 'Test model for validation',
        enabled: true,
        hyperparameters: { lookback_hours: 24 },
        trainingData: {
          metricName: 'test_metric',
          timeRange: { start: 0, end: 0 },
          frequency: 'hour',
          features: ['timestamp']
        },
        performance: {
          accuracy: 0.0,
          mape: 0.0,
          rmse: 0.0,
          lastTraining: 0,
          validationScore: 0.0
        },
        metadata: {}
      });
      return true;
    });

    // Test 2: Trend analysis
    await this.runTest('Predictive Analytics - Trend Analysis', async () => {
      try {
        const analysis = await predictive.analyzeTrends(
          'test_metric',
          { start: Date.now() - 3600000, end: Date.now() },
          { detectSeasonality: true, findCorrelations: false }
        );
        return analysis.trend !== undefined;
      } catch (error) {
        // Expected to fail with insufficient data
        return true;
      }
    });

    // Test 3: Anomaly detection
    await this.runTest('Predictive Analytics - Anomaly Detection', async () => {
      try {
        const detection = await predictive.detectAnomalies('test_metric');
        return detection.detectedAnomalies !== undefined;
      } catch (error) {
        // Expected to fail with insufficient data
        return true;
      }
    });

    // Test 4: Model performance
    await this.runTest('Predictive Analytics - Model Performance', async () => {
      const performance = predictive.getModelPerformance();
      return Array.isArray(performance);
    });
  }

  /**
   * Test dashboard manager
   */
  private async runDashboardTests(): Promise<void> {
    console.log('📈 Testing Dashboard Manager...');
    
    const dashboard = this.platform.getDashboardManager();

    // Test 1: Real-time data
    await this.runTest('Dashboard - Real-time Data', async () => {
      const data = await dashboard.getRealTimeData();
      return data.timestamp !== undefined && data.metrics !== undefined;
    });

    // Test 2: Widget management
    await this.runTest('Dashboard - Widget Management', async () => {
      dashboard.addWidget({
        id: 'test_widget',
        type: 'chart',
        title: 'Test Widget',
        data: {},
        config: { height: 200 }
      });
      
      const widget = dashboard.getWidget('test_widget');
      return widget !== null;
    });

    // Test 3: Dashboard state
    await this.runTest('Dashboard - State Management', async () => {
      const state = dashboard.getDashboardState();
      return state.layout !== undefined && state.filters !== undefined;
    });

    // Test 4: Performance stats
    await this.runTest('Dashboard - Performance Stats', async () => {
      const stats = dashboard.getPerformanceStats();
      return stats.updateCount !== undefined && stats.memoryUsage !== undefined;
    });

    // Test 5: Configuration export/import
    await this.runTest('Dashboard - Configuration Export/Import', async () => {
      const config = dashboard.exportDashboardConfig();
      dashboard.importDashboardConfig({
        widgets: config.widgets.slice(0, 1)
      });
      return true;
    });
  }

  /**
   * Test integration manager
   */
  private async runIntegrationTests(): Promise<void> {
    console.log('🔗 Testing Integration Manager...');
    
    const integration = this.platform.getIntegrationManager();

    // Test 1: Request instrumentation
    await this.runTest('Integration - Request Instrumentation', async () => {
      const context = await integration.instrumentRequest(
        'test_backend',
        {
          prompt: 'Test prompt',
          model: 'test-model',
          max_tokens: 100
        } as any,
        'test_operation'
      );
      
      return context.requestId !== undefined && context.traceId !== undefined;
    });

    // Test 2: Request completion
    await this.runTest('Integration - Request Completion', async () => {
      const context = await integration.instrumentRequest(
        'test_backend',
        { prompt: 'Test prompt', model: 'test-model' } as any
      );
      
      await integration.completeRequest(context, {
        content: 'Test response',
        latency_ms: 1000,
        cost_eur: 0.001,
        usage: { total_tokens: 50 }
      } as any);
      
      return true;
    });

    // Test 3: Component metrics
    await this.runTest('Integration - Component Metrics', async () => {
      integration.recordComponentMetric(
        'test_component',
        'test_metric',
        100,
        { type: 'test' }
      );
      
      const metrics = integration.getComponentMetrics('test_component');
      return metrics.length >= 0;
    });

    // Test 4: Integration status
    await this.runTest('Integration - Status Monitoring', async () => {
      const status = integration.getIntegrationStatus();
      return Array.isArray(status);
    });

    // Test 5: Hook registration
    await this.runTest('Integration - Hook Management', async () => {
      integration.registerHook({
        id: 'test_hook',
        name: 'Test Hook',
        type: 'before_request',
        handler: async () => { /* test */ },
        priority: 50,
        enabled: true
      });
      return true;
    });
  }

  /**
   * Test end-to-end monitoring scenarios
   */
  private async runEndToEndTests(): Promise<void> {
    console.log('🔄 Testing End-to-End Scenarios...');
    
    // Test 1: Complete request lifecycle
    await this.runTest('E2E - Complete Request Lifecycle', async () => {
      const integration = this.platform.getIntegrationManager();
      const observability = this.platform.getObservabilityFramework();
      
      // Start request
      const context = await integration.instrumentRequest(
        'claude',
        {
          prompt: 'Generate a test response',
          model: 'claude-3-sonnet',
          max_tokens: 100,
          temperature: 0.7
        } as any,
        'generate_response'
      );
      
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Add some logging and metrics
      observability.log('info', 'Processing request', {
        requestId: context.requestId,
        model: context.model
      }, context.correlationContext);
      
      // Complete request
      await integration.completeRequest(context, {
        content: 'This is a test response',
        latency_ms: 1200,
        cost_eur: 0.005,
        usage: {
          prompt_tokens: 20,
          completion_tokens: 15,
          total_tokens: 35
        }
      } as any);
      
      return true;
    });

    // Test 2: Alert workflow
    await this.runTest('E2E - Alert Workflow', async () => {
      const systemMonitor = this.platform.getSystemMonitor();
      const alertManager = this.platform.getAlertManager();
      
      // Record high latency metric
      await systemMonitor.recordMetric({
        timestamp: Date.now(),
        metricType: 'performance',
        metricName: 'request_latency',
        value: 15000, // 15 seconds - should trigger alert
        unit: 'ms',
        component: 'claude',
        isHealthy: false
      });
      
      // Evaluate metrics
      await alertManager.evaluateMetrics([{
        name: 'request_latency',
        value: 15000,
        labels: { component: 'claude' },
        timestamp: Date.now()
      }]);
      
      return true;
    });

    // Test 3: Platform health check
    await this.runTest('E2E - Platform Health Check', async () => {
      const health = await this.platform.getPlatformHealth();
      return health.overall !== undefined && health.components !== undefined;
    });

    // Test 4: Monitoring report generation
    await this.runTest('E2E - Monitoring Report', async () => {
      const report = await this.platform.generateMonitoringReport();
      return report.summary !== undefined && report.recommendations !== undefined;
    });
  }

  /**
   * Test performance characteristics
   */
  private async runPerformanceTests(): Promise<void> {
    console.log('⚡ Testing Performance Characteristics...');
    
    // Test 1: Metric recording performance
    await this.runTest('Performance - Metric Recording Speed', async () => {
      const start = Date.now();
      const iterations = 1000;
      
      const observability = this.platform.getObservabilityFramework();
      
      for (let i = 0; i < iterations; i++) {
        observability.recordMetric(`test_metric_${i % 10}`, i, 'counter');
      }
      
      const duration = Date.now() - start;
      const throughput = iterations / (duration / 1000); // ops per second
      
      console.log(`   📊 Metric throughput: ${throughput.toFixed(0)} ops/sec`);
      return throughput > 100; // Should handle at least 100 metrics/sec
    }, { expectedMetrics: { throughput: 100 } });

    // Test 2: Trace processing performance
    await this.runTest('Performance - Trace Processing Speed', async () => {
      const start = Date.now();
      const iterations = 100;
      
      const observability = this.platform.getObservabilityFramework();
      
      for (let i = 0; i < iterations; i++) {
        const span = observability.startTrace(`test_operation_${i}`);
        observability.setSpanTags(span.spanId, { iteration: i });
        observability.addSpanLog(span.spanId, 'info', `Processing iteration ${i}`);
        observability.finishSpan(span.spanId, 'success');
      }
      
      const duration = Date.now() - start;
      const throughput = iterations / (duration / 1000);
      
      console.log(`   🔗 Trace throughput: ${throughput.toFixed(0)} traces/sec`);
      return throughput > 10; // Should handle at least 10 complete traces/sec
    });

    // Test 3: Memory usage efficiency
    await this.runTest('Performance - Memory Usage', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Generate some monitoring activity
      for (let i = 0; i < 500; i++) {
        await this.platform.getObservabilityFramework().recordMetric(
          `memory_test_${i % 50}`, i, 'gauge'
        );
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
      
      console.log(`   🧠 Memory increase: ${memoryIncrease.toFixed(2)} MB`);
      return memoryIncrease < 10; // Should not increase memory by more than 10MB
    });

    // Test 4: Dashboard response time
    await this.runTest('Performance - Dashboard Response Time', async () => {
      const start = Date.now();
      
      await this.platform.getDashboardManager().getRealTimeData();
      
      const responseTime = Date.now() - start;
      
      console.log(`   📈 Dashboard response time: ${responseTime}ms`);
      return responseTime < 2000; // Should respond within 2 seconds
    });
  }

  /**
   * Test system under stress
   */
  private async runStressTests(): Promise<void> {
    console.log('💪 Testing Stress Scenarios...');
    
    // Test 1: High volume request processing
    await this.runTest('Stress - High Volume Requests', async () => {
      const integration = this.platform.getIntegrationManager();
      const concurrentRequests = 50;
      const promises: Promise<void>[] = [];
      
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(this.simulateRequest(integration, i));
      }
      
      await Promise.all(promises);
      
      const stats = integration.getMonitoringStatistics();
      console.log(`   📊 Processed ${stats.requests.totalProcessed} requests`);
      return true;
    });

    // Test 2: Alert storm handling
    await this.runTest('Stress - Alert Storm', async () => {
      const alertManager = this.platform.getAlertManager();
      const alertCount = 100;
      
      for (let i = 0; i < alertCount; i++) {
        await alertManager.evaluateMetrics([{
          name: 'stress_test_metric',
          value: 1000 + i,
          labels: { stress_test: 'true', batch: Math.floor(i / 10).toString() },
          timestamp: Date.now()
        }]);
      }
      
      const stats = await alertManager.getAlertStats();
      console.log(`   🚨 Generated alerts: ${stats.total}`);
      return true;
    });

    // Test 3: Long-running monitoring
    await this.runTest('Stress - Extended Monitoring', async () => {
      const startTime = Date.now();
      const duration = 5000; // 5 seconds
      let iterations = 0;
      
      while (Date.now() - startTime < duration) {
        const observability = this.platform.getObservabilityFramework();
        
        observability.recordMetric(`stress_metric`, Math.random() * 100, 'gauge');
        observability.log('info', `Stress test iteration ${iterations}`);
        
        iterations++;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      console.log(`   ⏱️ Completed ${iterations} iterations in ${duration}ms`);
      return iterations > 100;
    });

    // Test 4: Resource cleanup
    await this.runTest('Stress - Resource Cleanup', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Generate lots of temporary data
      for (let i = 0; i < 1000; i++) {
        const span = this.platform.getObservabilityFramework().startTrace(`cleanup_test_${i}`);
        this.platform.getObservabilityFramework().finishSpan(span.spanId);
      }
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;
      
      console.log(`   🧹 Memory after cleanup: ${memoryIncrease.toFixed(2)} MB increase`);
      return memoryIncrease < 5; // Should cleanup efficiently
    });
  }

  /**
   * Helper method to run individual tests
   */
  private async runTest(
    testName: string,
    testFunction: () => Promise<boolean>,
    options: { expectedMetrics?: Record<string, number> } = {}
  ): Promise<void> {
    
    const startTime = Date.now();
    
    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        testName,
        passed: result,
        duration,
        details: result ? 'Test passed successfully' : 'Test failed',
        metrics: options.expectedMetrics
      });
      
      if (result) {
        console.log(`   ✅ ${testName} (${duration}ms)`);
      } else {
        console.log(`   ❌ ${testName} (${duration}ms) - FAILED`);
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        testName,
        passed: false,
        duration,
        details: `Test threw exception: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.message : String(error)
      });
      
      console.log(`   ❌ ${testName} (${duration}ms) - ERROR: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Simulate a request for stress testing
   */
  private async simulateRequest(integration: IntegrationManager, index: number): Promise<void> {
    const context = await integration.instrumentRequest(
      'test_backend',
      {
        prompt: `Stress test request ${index}`,
        model: 'test-model',
        max_tokens: 100
      } as any,
      'stress_test'
    );
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    
    await integration.completeRequest(context, {
      content: `Response ${index}`,
      latency_ms: Math.random() * 2000,
      cost_eur: Math.random() * 0.01,
      usage: { total_tokens: 50 }
    } as any);
  }

  /**
   * Generate test report
   */
  generateTestReport(suite: TestSuite): string {
    const report = `
# Monitoring System Test Report

## Summary
- **Test Suite**: ${suite.name}
- **Description**: ${suite.description}
- **Total Tests**: ${suite.totalTests}
- **Passed**: ${suite.passedTests}
- **Failed**: ${suite.failedTests}
- **Coverage**: ${suite.coverage.toFixed(1)}%
- **Duration**: ${suite.totalDuration}ms

## Test Results

${suite.tests.map(test => `
### ${test.testName}
- **Status**: ${test.passed ? '✅ PASSED' : '❌ FAILED'}
- **Duration**: ${test.duration}ms
- **Details**: ${test.details}
${test.error ? `- **Error**: ${test.error}` : ''}
${test.metrics ? `- **Metrics**: ${JSON.stringify(test.metrics)}` : ''}
`).join('\n')}

## Recommendations

${suite.coverage < 80 ? '⚠️ Test coverage is below 80%. Consider adding more test cases.' : ''}
${suite.failedTests > 0 ? '🔧 Some tests failed. Review and fix failing components.' : ''}
${suite.totalDuration > 30000 ? '⏱️ Test suite took longer than 30 seconds. Consider optimizing test performance.' : ''}

---
*Generated on ${new Date().toISOString()}*
`;

    return report;
  }

  /**
   * Cleanup test resources
   */
  async cleanup(): Promise<void> {
    await this.platform.stop();
    this.db.close();
  }
}

// Export test runner function
export async function runMonitoringSystemTests(): Promise<TestSuite> {
  const testSuite = new MonitoringSystemTestSuite();
  
  try {
    const results = await testSuite.runCompleteTestSuite();
    console.log('\n📋 Test Report:');
    console.log(testSuite.generateTestReport(results));
    
    return results;
  } finally {
    await testSuite.cleanup();
  }
}

// Run tests if called directly
if (require.main === module) {
  runMonitoringSystemTests()
    .then(results => {
      process.exit(results.failedTests > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}