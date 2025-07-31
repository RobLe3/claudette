#!/usr/bin/env node

// Test Adaptive System with Self-hosted Backend Support
// Demonstrates enhanced timeout handling and async contribution methods

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================================================
// ADAPTIVE SYSTEM TEST SCENARIOS
// ============================================================================

const ADAPTIVE_TEST_SCENARIOS = [
  {
    name: 'Quick Response Test',
    description: 'Test fast responses with standard timeout',
    prompt: 'Write a simple Python hello world function',
    expectedTimeoutRange: [5000, 30000], // 5-30 seconds
    testType: 'standard'
  },
  {
    name: 'Complex Code Generation',
    description: 'Test complex task requiring longer processing',
    prompt: `Create a comprehensive REST API in Python using FastAPI with the following features:
1. User authentication with JWT tokens
2. CRUD operations for a Task model
3. Database integration with SQLAlchemy
4. Input validation and error handling
5. API documentation with automatic OpenAPI schema
6. Unit tests for all endpoints

Include proper project structure and configuration files.`,
    expectedTimeoutRange: [30000, 180000], // 30s - 3 minutes
    testType: 'complex'
  },
  {
    name: 'System Design Challenge',
    description: 'Test very complex task that may require extended timeout',
    prompt: `Design and implement a distributed microservices architecture for a real-time chat application:
1. Service decomposition and boundaries
2. Inter-service communication patterns
3. Data consistency and event sourcing
4. Scalability and load balancing strategies
5. Monitoring and observability
6. Docker containerization and Kubernetes deployment
7. Security considerations and implementation

Provide detailed architecture diagrams, code examples, and deployment configurations.`,
    expectedTimeoutRange: [60000, 300000], // 1-5 minutes
    testType: 'extended'
  }
];

// ============================================================================
// ADAPTIVE SYSTEM TEST ENGINE
// ============================================================================

class AdaptiveSystemTestEngine {
  constructor() {
    this.results = {
      adaptiveTimeouts: {},
      asyncContributions: {},
      healthChecks: {},
      performanceMetrics: {}
    };
    this.startTime = Date.now();
  }

  getApiKeyFromKeychain(service, account) {
    try {
      return execSync(`security find-generic-password -a "${account}" -s "${service}" -w`, 
        { encoding: 'utf8' }).trim();
    } catch (error) {
      return null;
    }
  }

  async initializeAdaptiveBackends() {
    const backends = {};
    
    // Standard OpenAI Backend for comparison
    const openaiKey = this.getApiKeyFromKeychain('openai-api-key', 'openai');
    if (openaiKey) {
      const { OpenAIBackend } = require('./dist/backends/openai.js');
      backends.chatgpt_standard = new OpenAIBackend({
        enabled: true,
        priority: 1,
        cost_per_token: 0.0001,
        api_key: openaiKey,
        model: 'gpt-4o-mini'
      });
    }

    // Adaptive Qwen Backend (if available)
    const qwenKey = this.getApiKeyFromKeychain('codellm-api-key', 'codellm');
    if (qwenKey) {
      try {
        // For this test, we'll simulate the adaptive backend behavior
        // In production, this would use the actual AdaptiveQwenBackend
        backends.qwen_adaptive = {
          name: 'qwen_adaptive',
          adaptive: true,
          config: {
            base_timeout_ms: 60000,
            max_timeout_ms: 300000,
            timeout_multiplier: 2.0,
            async_contribution_enabled: true,
            backend_type: 'self_hosted'
          },
          send: async (request) => {
            // Simulate adaptive timeout behavior
            const timeout = this.calculateAdaptiveTimeout(request, backends.qwen_adaptive.config);
            console.log(`🤖 Qwen using adaptive timeout: ${timeout}ms`);
            
            try {
              // Use standard Qwen backend with enhanced timeout handling
              const { QwenBackend } = require('./dist/backends/qwen.js');
              const qwenBackend = new QwenBackend({
                enabled: true,
                priority: 1,
                cost_per_token: 0.0001,
                api_key: qwenKey,
                base_url: 'https://tools.flexcon-ai.de',
                model: 'Qwen/Qwen2.5-Coder-7B-Instruct-AWQ'
              });
              
              const requestStartTime = Date.now();
              const response = await Promise.race([
                qwenBackend.send(request),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error(`Adaptive timeout after ${timeout}ms`)), timeout)
                )
              ]);
              
              const latency = Date.now() - requestStartTime;
              
              // Update adaptive timeout for next request
              this.updateAdaptiveTimeout(backends.qwen_adaptive, latency, true);
              
              return {
                ...response,
                metadata: {
                  ...response.metadata,
                  adaptive_timeout_used: timeout,
                  backend_type: 'self_hosted_adaptive'
                }
              };
            } catch (error) {
              const latency = Date.now() - requestStartTime;
              this.updateAdaptiveTimeout(backends.qwen_adaptive, latency, false);
              throw error;
            }
          },
          getInfo: () => ({
            name: 'qwen_adaptive',
            enabled: true,
            priority: 1,
            costPerToken: 0.0001,
            backendType: 'self_hosted',
            adaptiveFeatures: true
          })
        };
      } catch (error) {
        console.warn('⚠️ Could not initialize adaptive Qwen backend:', error.message);
      }
    }

    return backends;
  }

  calculateAdaptiveTimeout(request, config) {
    const promptLength = request.prompt.length;
    const maxTokens = request.options?.max_tokens || 1000;
    
    // Base timeout calculation
    let timeout = config.base_timeout_ms;
    
    // Adjust based on prompt complexity
    if (promptLength > 1000) {
      timeout *= config.timeout_multiplier;
    }
    if (promptLength > 3000) {
      timeout *= config.timeout_multiplier;
    }
    
    // Adjust based on expected output length
    if (maxTokens > 1500) {
      timeout *= 1.5;
    }
    
    // Ensure within bounds
    return Math.min(timeout, config.max_timeout_ms);
  }

  updateAdaptiveTimeout(backend, latency, success) {
    if (!backend.adaptiveData) {
      backend.adaptiveData = {
        recentLatencies: [],
        successRate: 1.0,
        consecutiveFailures: 0
      };
    }

    const data = backend.adaptiveData;
    data.recentLatencies.push(latency);
    
    // Keep only recent latencies
    if (data.recentLatencies.length > 10) {
      data.recentLatencies.shift();
    }

    if (success) {
      data.consecutiveFailures = 0;
      // Optimize timeout based on actual performance
      const avgLatency = data.recentLatencies.reduce((a, b) => a + b) / data.recentLatencies.length;
      backend.config.base_timeout_ms = Math.max(
        backend.config.base_timeout_ms * 0.95, // Gradually reduce
        avgLatency * 2 // But keep it reasonable
      );
    } else {
      data.consecutiveFailures++;
      // Increase timeout on failures
      backend.config.base_timeout_ms = Math.min(
        backend.config.base_timeout_ms * 1.2,
        backend.config.max_timeout_ms
      );
    }
  }

  async testAdaptiveTimeouts(backends) {
    console.log('\n🕒 Testing Adaptive Timeout System...');
    
    const timeoutResults = {};
    
    for (const scenario of ADAPTIVE_TEST_SCENARIOS) {
      console.log(`\n  📋 ${scenario.name}:`);
      console.log(`     ${scenario.description}`);
      
      timeoutResults[scenario.name] = {};
      
      for (const [backendName, backend] of Object.entries(backends)) {
        console.log(`\n    🤖 Testing ${backendName}...`);
        
        try {
          const startTime = Date.now();
          const response = await backend.send({
            prompt: scenario.prompt,
            files: [],
            options: { 
              max_tokens: scenario.testType === 'extended' ? 2000 : 
                         scenario.testType === 'complex' ? 1500 : 800
            }
          });
          const endTime = Date.now();
          const latency = endTime - startTime;

          const withinExpectedRange = latency >= scenario.expectedTimeoutRange[0] && 
                                    latency <= scenario.expectedTimeoutRange[1];

          timeoutResults[scenario.name][backendName] = {
            success: true,
            latency,
            withinExpectedRange,
            adaptiveTimeoutUsed: response.metadata?.adaptive_timeout_used || 'N/A',
            responseLength: response.content.length,
            tokensUsed: response.tokens_input + response.tokens_output,
            cost: response.cost_eur
          };

          console.log(`      ✅ Success in ${latency}ms`);
          console.log(`      📊 Expected: ${scenario.expectedTimeoutRange[0]}-${scenario.expectedTimeoutRange[1]}ms`);
          console.log(`      🎯 Within range: ${withinExpectedRange ? 'Yes' : 'No'}`);
          
          if (response.metadata?.adaptive_timeout_used) {
            console.log(`      ⚙️ Adaptive timeout: ${response.metadata.adaptive_timeout_used}ms`);
          }

        } catch (error) {
          const latency = Date.now() - startTime;
          
          timeoutResults[scenario.name][backendName] = {
            success: false,
            latency,
            error: error.message,
            timeout: error.message.includes('timeout'),
            adaptiveTimeoutUsed: error.message.match(/timeout after (\d+)ms/)?.[1] || 'N/A'
          };

          console.log(`      ❌ Failed after ${latency}ms: ${error.message}`);
          
          if (error.message.includes('Adaptive timeout')) {
            console.log(`      ⚙️ Adaptive timeout triggered`);
          }
        }
      }
    }

    this.results.adaptiveTimeouts = timeoutResults;
    return timeoutResults;
  }

  async testAsyncContributions(backends) {
    console.log('\n🔄 Testing Async Pipeline Contributions...');
    
    const contributionResults = {};
    const testPrompt = `Create a Python class for managing a simple task queue with the following features:
1. Add tasks to the queue
2. Process tasks in FIFO order  
3. Handle task priorities
4. Include error handling and logging
5. Support for concurrent processing`;

    // Test async contributions between backends
    console.log(`\n  📤 Starting parallel requests...`);
    
    const parallelPromises = [];
    const startTimes = {};
    
    for (const [backendName, backend] of Object.entries(backends)) {
      startTimes[backendName] = Date.now();
      
      const promise = backend.send({
        prompt: testPrompt,
        files: [],
        options: { max_tokens: 1000 }
      }).then(response => ({
        backend: backendName,
        response,
        latency: Date.now() - startTimes[backendName],
        success: true
      })).catch(error => ({
        backend: backendName,
        error: error.message,
        latency: Date.now() - startTimes[backendName],
        success: false
      }));
      
      parallelPromises.push(promise);
    }

    // Wait for all contributions with a reasonable timeout
    console.log(`  ⏳ Waiting for contributions (max 3 minutes)...`);
    
    const timeoutPromise = new Promise(resolve => 
      setTimeout(() => resolve({ timeout: true }), 180000)
    );

    const raceResult = await Promise.race([
      Promise.all(parallelPromises),
      timeoutPromise
    ]);

    if (raceResult.timeout) {
      console.log(`  ⏰ Some contributions timed out - collecting partial results`);
      
      // Collect partial results
      const partialResults = await Promise.allSettled(parallelPromises);
      contributionResults.contributions = partialResults.map(result => 
        result.status === 'fulfilled' ? result.value : { 
          error: 'Promise timeout',
          success: false 
        }
      );
    } else {
      contributionResults.contributions = raceResult;
    }

    // Analyze contribution performance
    const successful = contributionResults.contributions.filter(c => c.success);
    const failed = contributionResults.contributions.filter(c => !c.success);

    contributionResults.summary = {
      totalContributions: contributionResults.contributions.length,
      successful: successful.length,
      failed: failed.length,
      successRate: (successful.length / contributionResults.contributions.length) * 100,
      avgLatency: successful.length > 0 ? 
        successful.reduce((sum, c) => sum + c.latency, 0) / successful.length : 0,
      fastestContribution: successful.length > 0 ? 
        successful.reduce((fastest, current) => current.latency < fastest.latency ? current : fastest) : null,
      slowestContribution: successful.length > 0 ? 
        successful.reduce((slowest, current) => current.latency > slowest.latency ? current : slowest) : null
    };

    console.log(`\n  📊 Contribution Results:`);
    console.log(`     Total: ${contributionResults.summary.totalContributions}`);
    console.log(`     Successful: ${contributionResults.summary.successful}`);
    console.log(`     Failed: ${contributionResults.summary.failed}`);
    console.log(`     Success Rate: ${contributionResults.summary.successRate.toFixed(1)}%`);
    
    if (contributionResults.summary.fastestContribution) {
      console.log(`     Fastest: ${contributionResults.summary.fastestContribution.backend} (${contributionResults.summary.fastestContribution.latency}ms)`);
    }
    
    if (contributionResults.summary.slowestContribution) {
      console.log(`     Slowest: ${contributionResults.summary.slowestContribution.backend} (${contributionResults.summary.slowestContribution.latency}ms)`);
    }

    this.results.asyncContributions = contributionResults;
    return contributionResults;
  }

  async testHealthCheckingSystem(backends) {
    console.log('\n🏥 Testing Health Checking System...');
    
    const healthResults = {};
    
    for (const [backendName, backend] of Object.entries(backends)) {
      console.log(`\n  🔍 Health checking ${backendName}...`);
      
      const healthChecks = [];
      
      // Perform multiple health checks to test consistency
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();
        
        try {
          let isHealthy;
          
          if (backend.isAvailable) {
            isHealthy = await backend.isAvailable();
          } else {
            // Simulate health check for mock backends
            isHealthy = true;
          }
          
          const latency = Date.now() - startTime;
          
          healthChecks.push({
            check: i + 1,
            healthy: isHealthy,
            latency,
            timestamp: new Date().toISOString()
          });
          
          console.log(`    Check ${i + 1}: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'} (${latency}ms)`);
          
        } catch (error) {
          const latency = Date.now() - startTime;
          
          healthChecks.push({
            check: i + 1,
            healthy: false,
            latency,
            error: error.message,
            timestamp: new Date().toISOString()
          });
          
          console.log(`    Check ${i + 1}: ❌ Error (${latency}ms) - ${error.message}`);
        }
      }
      
      healthResults[backendName] = {
        checks: healthChecks,
        overallHealthy: healthChecks.every(check => check.healthy),
        avgHealthCheckLatency: healthChecks.reduce((sum, check) => sum + check.latency, 0) / healthChecks.length,
        consistentHealth: healthChecks.every(check => check.healthy === healthChecks[0].healthy)
      };
    }

    this.results.healthChecks = healthResults;
    return healthResults;
  }

  generateAdaptiveSystemReport() {
    const reportPath = path.join(__dirname, `adaptive-system-test-${Date.now()}.json`);
    
    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        framework: 'Claudette Adaptive System Test v1.0',
        testDuration: Date.now() - this.startTime,
        focus: 'Self-hosted backend timeout adaptation and async contributions'
      },
      testResults: this.results,
      summary: this.generateSummary(),
      recommendations: this.generateRecommendations()
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    return reportPath;
  }

  generateSummary() {
    const summary = {
      adaptiveTimeouts: {
        totalScenarios: ADAPTIVE_TEST_SCENARIOS.length,
        successfulAdaptations: 0,
        timeoutImprovements: 0
      },
      asyncContributions: {
        enabled: false,
        totalContributions: 0,
        successRate: 0
      },
      healthChecking: {
        backendsMonitored: Object.keys(this.results.healthChecks || {}).length,
        healthyBackends: 0,
        consistentHealth: 0
      }
    };

    // Analyze adaptive timeout results
    if (this.results.adaptiveTimeouts) {
      Object.values(this.results.adaptiveTimeouts).forEach(scenario => {
        Object.values(scenario).forEach(result => {
          if (result.success && result.withinExpectedRange) {
            summary.adaptiveTimeouts.successfulAdaptations++;
          }
        });
      });
    }

    // Analyze async contribution results
    if (this.results.asyncContributions) {
      summary.asyncContributions.enabled = true;
      summary.asyncContributions.totalContributions = this.results.asyncContributions.summary?.totalContributions || 0;
      summary.asyncContributions.successRate = this.results.asyncContributions.summary?.successRate || 0;
    }

    // Analyze health check results
    if (this.results.healthChecks) {
      Object.values(this.results.healthChecks).forEach(result => {
        if (result.overallHealthy) {
          summary.healthChecking.healthyBackends++;
        }
        if (result.consistentHealth) {
          summary.healthChecking.consistentHealth++;
        }
      });
    }

    return summary;
  }

  generateRecommendations() {
    const recommendations = [];

    // Timeout recommendations
    if (this.results.adaptiveTimeouts) {
      const hasTimeouts = Object.values(this.results.adaptiveTimeouts).some(scenario =>
        Object.values(scenario).some(result => result.error && result.timeout)
      );

      if (hasTimeouts) {
        recommendations.push({
          type: 'timeout',
          priority: 'high',
          message: 'Consider increasing base timeout values for self-hosted backends'
        });
      }
    }

    // Async contribution recommendations
    if (this.results.asyncContributions && this.results.asyncContributions.summary) {
      const successRate = this.results.asyncContributions.summary.successRate;
      
      if (successRate < 70) {
        recommendations.push({
          type: 'async',
          priority: 'medium',
          message: 'Async contribution success rate is low - consider optimizing timeout values'
        });
      } else if (successRate > 90) {
        recommendations.push({
          type: 'async',
          priority: 'low',
          message: 'Excellent async contribution performance - system is well-tuned'
        });
      }
    }

    // Health check recommendations  
    if (this.results.healthChecks) {
      const unhealthyBackends = Object.entries(this.results.healthChecks)
        .filter(([_, result]) => !result.overallHealthy);

      if (unhealthyBackends.length > 0) {
        recommendations.push({
          type: 'health',
          priority: 'high',
          message: `${unhealthyBackends.length} backend(s) showing health issues: ${unhealthyBackends.map(([name]) => name).join(', ')}`
        });
      }
    }

    return recommendations;
  }

  async runAdaptiveSystemTest() {
    console.log('🚀 Claudette Adaptive System Test');
    console.log('='.repeat(60));
    console.log('🎯 Testing: Dynamic timeouts, async contributions, health monitoring');
    console.log('💻 Focus: Self-hosted backend optimization and pipeline processing');
    console.log('');

    try {
      const backends = await this.initializeAdaptiveBackends();
      
      if (Object.keys(backends).length === 0) {
        throw new Error('No backends available for testing');
      }

      console.log(`📋 Initialized ${Object.keys(backends).length} backend(s): ${Object.keys(backends).join(', ')}`);

      // Run test suites
      await this.testAdaptiveTimeouts(backends);
      await this.testAsyncContributions(backends);
      await this.testHealthCheckingSystem(backends);

      // Generate report
      const reportPath = this.generateAdaptiveSystemReport();
      
      // Display summary
      this.displayTestSummary();
      
      console.log(`\n💾 Detailed report saved: ${reportPath}`);
      
      return this.results;

    } catch (error) {
      console.error('💥 Adaptive system test failed:', error.message);
      throw error;
    }
  }

  displayTestSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 ADAPTIVE SYSTEM TEST SUMMARY');
    console.log('='.repeat(60));

    const summary = this.generateSummary();

    console.log('\n🕒 ADAPTIVE TIMEOUTS:');
    console.log(`   Scenarios tested: ${summary.adaptiveTimeouts.totalScenarios}`);
    console.log(`   Successful adaptations: ${summary.adaptiveTimeouts.successfulAdaptations}`);

    console.log('\n🔄 ASYNC CONTRIBUTIONS:');
    console.log(`   Feature enabled: ${summary.asyncContributions.enabled ? 'Yes' : 'No'}`);
    if (summary.asyncContributions.enabled) {
      console.log(`   Total contributions: ${summary.asyncContributions.totalContributions}`);
      console.log(`   Success rate: ${summary.asyncContributions.successRate.toFixed(1)}%`);
    }

    console.log('\n🏥 HEALTH MONITORING:');
    console.log(`   Backends monitored: ${summary.healthChecking.backendsMonitored}`);
    console.log(`   Healthy backends: ${summary.healthChecking.healthyBackends}`);
    console.log(`   Consistent health: ${summary.healthChecking.consistentHealth}`);

    const recommendations = this.generateRecommendations();
    if (recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
      });
    }

    console.log('\n' + '='.repeat(60));
  }
}

// Execute the adaptive system test
async function main() {
  const testEngine = new AdaptiveSystemTestEngine();
  
  try {
    await testEngine.runAdaptiveSystemTest();
    process.exit(0);
  } catch (error) {
    console.error('Adaptive system test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { AdaptiveSystemTestEngine, ADAPTIVE_TEST_SCENARIOS };