#!/usr/bin/env node
// Comprehensive Connection Test Suite
// Tests all LLM backends and GraphDB connectivity

const fs = require('fs');
require('dotenv').config();

class ComprehensiveConnectionTest {
  constructor() {
    this.results = {
      llm_backends: {},
      graphdb: {},
      overall: {
        passed: 0,
        failed: 0,
        total: 0
      }
    };
    this.startTime = Date.now();
  }

  log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  success(category, test, message) {
    this.log(`✅ ${category} - ${test}: ${message}`);
    this.results.overall.passed++;
    this.results.overall.total++;
  }

  failure(category, test, error) {
    this.log(`❌ ${category} - ${test}: ${error}`);
    this.results.overall.failed++;
    this.results.overall.total++;
  }

  async runAllTests() {
    this.log('🚀 Starting Comprehensive Connection Tests');
    this.log('==========================================');
    
    // Test LLM Backends
    await this.testLLMBackends();
    
    // Test GraphDB
    await this.testGraphDB();
    
    // Generate final report
    this.generateReport();
  }

  async testLLMBackends() {
    this.log('\n🧠 Testing LLM Backend Connections...');
    this.results.llm_backends = {};
    
    // Test OpenAI
    await this.testOpenAI();
    
    // Test Flexcon
    await this.testFlexcon();
  }

  async testOpenAI() {
    this.log('\n🔵 Testing OpenAI Connection...');
    
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY not found in environment');
      }

      if (!apiKey.startsWith('sk-')) {
        throw new Error('Invalid OpenAI API key format');
      }

      // Test API call
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'Claudette-Test/3.0.0'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const modelCount = data.data ? data.data.length : 0;
      
      this.results.llm_backends.openai = {
        status: 'connected',
        models_available: modelCount,
        response_time: Date.now() - this.startTime
      };
      
      this.success('OpenAI', 'Connection', `Connected successfully - ${modelCount} models available`);
      
      // Test a simple completion
      await this.testOpenAICompletion(apiKey);
      
    } catch (error) {
      this.results.llm_backends.openai = {
        status: 'failed',
        error: error.message
      };
      this.failure('OpenAI', 'Connection', error.message);
    }
  }

  async testOpenAICompletion(apiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 5
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        throw new Error(`Completion test failed: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      this.results.llm_backends.openai.completion_test = 'passed';
      this.success('OpenAI', 'Completion', `Test completion successful`);
      
    } catch (error) {
      this.results.llm_backends.openai.completion_test = 'failed';
      this.failure('OpenAI', 'Completion', error.message);
    }
  }

  async testFlexcon() {
    this.log('\n🟠 Testing Flexcon Backend Connection...');
    
    try {
      const apiUrl = process.env.FLEXCON_API_URL;
      const apiKey = process.env.FLEXCON_API_KEY;
      const model = process.env.FLEXCON_MODEL;

      if (!apiUrl || !apiKey || !model) {
        throw new Error('Flexcon configuration incomplete (missing URL, key, or model)');
      }

      // Test health endpoint first
      const healthResponse = await fetch(`${apiUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'Claudette-Test/3.0.0'
        },
        signal: AbortSignal.timeout(10000)
      });

      let healthStatus = 'unknown';
      try {
        if (healthResponse.ok) {
          healthStatus = 'healthy';
        } else {
          healthStatus = `unhealthy (${healthResponse.status})`;
        }
      } catch (e) {
        healthStatus = 'no health endpoint';
      }

      // Test completion endpoint
      const completionResponse = await fetch(`${apiUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: 'Test' }],
          max_tokens: 5
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (!completionResponse.ok) {
        throw new Error(`HTTP ${completionResponse.status}: ${completionResponse.statusText}`);
      }

      const data = await completionResponse.json();
      
      this.results.llm_backends.flexcon = {
        status: 'connected',
        health_status: healthStatus,
        model: model,
        endpoint: apiUrl,
        completion_test: 'passed'
      };
      
      this.success('Flexcon', 'Connection', `Connected to ${model} - Health: ${healthStatus}`);
      this.success('Flexcon', 'Completion', 'Test completion successful');
      
    } catch (error) {
      this.results.llm_backends.flexcon = {
        status: 'failed',
        error: error.message
      };
      this.failure('Flexcon', 'Connection', error.message);
    }
  }

  async testGraphDB() {
    this.log('\n🔗 Testing GraphDB Connection...');
    
    try {
      const endpoint = process.env.ULTIPA_ENDPOINT;
      const accessToken = process.env.ULTIPA_ACCESS_TOKEN;
      
      if (!endpoint || !accessToken) {
        throw new Error('Ultipa configuration incomplete');
      }

      // Use the same comprehensive testing as before
      const testResults = await this.testUltipaConnection(endpoint, accessToken);
      
      this.results.graphdb = testResults;
      
      if (testResults.status === 'connected') {
        this.success('Ultipa', 'Connection', 'GraphDB connected successfully');
      } else {
        this.failure('Ultipa', 'Connection', testResults.error || 'Connection failed');
      }
      
    } catch (error) {
      this.results.graphdb = {
        status: 'failed',
        error: error.message
      };
      this.failure('Ultipa', 'Connection', error.message);
    }
  }

  async testUltipaConnection(endpoint, accessToken) {
    const dbUsername = process.env.ULTIPA_DB_USERNAME;
    const dbPassword = process.env.ULTIPA_DB_PASSWORD;
    const apiUser = process.env.ULTIPA_API_USER;
    
    const endpoints = [
      `https://${endpoint}/api/gql`,
      `https://${endpoint}/gql`,
      `https://${endpoint}/api/v1/gql`,
      `https://${endpoint}/query`,
      `https://${endpoint}/graphql`
    ];
    
    // Build authentication methods including username/password combinations
    const authHeaders = [
      { 'Authorization': `Bearer ${accessToken}` },
      { 'X-Access-Token': accessToken },
      { 'ultipa-token': accessToken },
      { 'token': accessToken }
    ];

    // Add Basic Auth combinations if credentials are available
    if (dbUsername && dbPassword) {
      const basicAuth = Buffer.from(`${dbUsername}:${dbPassword}`).toString('base64');
      authHeaders.push({ 'Authorization': `Basic ${basicAuth}` });
    }
    
    // Add API user with token as Basic Auth
    if (apiUser && accessToken) {
      const apiBasicAuth = Buffer.from(`${apiUser}:${accessToken}`).toString('base64');
      authHeaders.push({ 'Authorization': `Basic ${apiBasicAuth}` });
    }

    // Add username/password as headers
    if (dbUsername && dbPassword) {
      authHeaders.push({
        'X-Username': dbUsername,
        'X-Password': dbPassword
      });
      authHeaders.push({
        'ultipa-username': dbUsername,
        'ultipa-password': dbPassword
      });
    }
    
    // Add API user as header
    if (apiUser) {
      authHeaders.push({
        'ultipa-api-user': apiUser
      });
    }

    const requestBody = {
      gql: 'RETURN datetime() as test_time',
      parameters: {},
      database: process.env.ULTIPA_DATABASE || 'default',
      graph: process.env.ULTIPA_GRAPH || 'claudette_graph'
    };

    // Alternative request formats for different APIs
    const requestVariations = [
      requestBody,
      {
        query: 'RETURN datetime() as test_time',
        database: requestBody.database,
        graph: requestBody.graph
      },
      {
        gql: 'RETURN datetime() as test_time',
        username: dbUsername,
        password: dbPassword,
        database: requestBody.database,
        graph: requestBody.graph
      }
    ];

    let attemptCount = 0;
    const maxAttempts = endpoints.length * authHeaders.length * requestVariations.length;

    this.log(`🔍 Testing ${maxAttempts} endpoint/auth/format combinations...`);

    for (let endpointUrl of endpoints) {
      for (let authHeader of authHeaders) {
        for (let requestData of requestVariations) {
          attemptCount++;
          try {
            this.log(`   📡 Attempt ${attemptCount}/${maxAttempts}: ${endpointUrl.replace(endpoint, '[ENDPOINT]')} with ${Object.keys(authHeader)[0]}`);
            
            const response = await fetch(endpointUrl, {
              method: 'POST',
              headers: {
                ...authHeader,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(requestData),
              signal: AbortSignal.timeout(10000)
            });

            if (response.ok) {
              const result = await response.json();
              return {
                status: 'connected',
                endpoint: endpointUrl,
                auth_method: Object.keys(authHeader)[0],
                request_format: Object.keys(requestData)[0],
                response_data: result,
                attempts_needed: attemptCount
              };
            } else {
              this.log(`      ❌ ${response.status}: ${response.statusText}`);
            }
          } catch (error) {
            this.log(`      ❌ Network error: ${error.message}`);
          }
        }
      }
    }

    return {
      status: 'failed',
      error: 'All endpoint, authentication, and format combinations failed',
      endpoints_tried: endpoints.length,
      auth_methods_tried: authHeaders.length,
      request_formats_tried: requestVariations.length,
      total_attempts: attemptCount
    };
  }

  generateReport() {
    const totalTime = Date.now() - this.startTime;
    const successRate = this.results.overall.total > 0 
      ? ((this.results.overall.passed / this.results.overall.total) * 100).toFixed(1)
      : '0.0';

    this.log('\n🌟 COMPREHENSIVE CONNECTION TEST RESULTS');
    this.log('========================================');
    
    this.log(`\n📊 OVERALL SUMMARY:`);
    this.log(`   ✅ Passed: ${this.results.overall.passed}`);
    this.log(`   ❌ Failed: ${this.results.overall.failed}`);
    this.log(`   📈 Success Rate: ${successRate}%`);
    this.log(`   ⏱️  Total Time: ${totalTime}ms`);

    this.log(`\n🧠 LLM BACKEND RESULTS:`);
    
    // OpenAI Results
    const openai = this.results.llm_backends.openai;
    if (openai) {
      if (openai.status === 'connected') {
        this.log(`   🔵 OpenAI: ✅ Connected (${openai.models_available} models)`);
        this.log(`      • Completion Test: ${openai.completion_test === 'passed' ? '✅' : '❌'}`);
      } else {
        this.log(`   🔵 OpenAI: ❌ ${openai.error}`);
      }
    }

    // Flexcon Results
    const flexcon = this.results.llm_backends.flexcon;
    if (flexcon) {
      if (flexcon.status === 'connected') {
        this.log(`   🟠 Flexcon: ✅ Connected (${flexcon.model})`);
        this.log(`      • Health Status: ${flexcon.health_status}`);
        this.log(`      • Completion Test: ${flexcon.completion_test === 'passed' ? '✅' : '❌'}`);
      } else {
        this.log(`   🟠 Flexcon: ❌ ${flexcon.error}`);
      }
    }

    this.log(`\n🔗 GRAPHDB RESULTS:`);
    const graphdb = this.results.graphdb;
    if (graphdb.status === 'connected') {
      this.log(`   🟢 Ultipa: ✅ Connected`);
      this.log(`      • Endpoint: ${graphdb.endpoint}`);
      this.log(`      • Auth Method: ${graphdb.auth_method}`);
    } else {
      this.log(`   🔴 Ultipa: ❌ ${graphdb.error}`);
      if (graphdb.endpoints_tried) {
        this.log(`      • Endpoints Tried: ${graphdb.endpoints_tried}`);
        this.log(`      • Auth Methods Tried: ${graphdb.auth_methods_tried}`);
      }
    }

    this.log(`\n💡 RECOMMENDATIONS:`);
    if (parseFloat(successRate) >= 80) {
      this.log('   🌟 EXCELLENT: Most connections working properly');
      this.log('   ✅ Ready for production use with available backends');
    } else if (parseFloat(successRate) >= 50) {
      this.log('   👍 PARTIAL: Some connections working');
      this.log('   ⚠️  Review failed connections before full deployment');
    } else {
      this.log('   ❌ ISSUES: Multiple connection problems detected');
      this.log('   🔧 Resolve connection issues before proceeding');
    }

    // Save results
    const reportData = {
      timestamp: new Date().toISOString(),
      version: '3.0.0',
      results: this.results,
      successRate: parseFloat(successRate),
      totalTime,
      recommendations: this.getRecommendations(parseFloat(successRate))
    };

    fs.writeFileSync('./comprehensive-connection-results.json', JSON.stringify(reportData, null, 2));
    this.log('\n📄 Test results saved to: comprehensive-connection-results.json');
    
    return parseFloat(successRate) >= 75;
  }

  getRecommendations(successRate) {
    if (successRate >= 80) return 'READY_FOR_PRODUCTION';
    if (successRate >= 50) return 'PARTIAL_SUCCESS_REVIEW_NEEDED';
    return 'MAJOR_ISSUES_FIX_REQUIRED';
  }
}

// Run the comprehensive tests
if (require.main === module) {
  const tester = new ComprehensiveConnectionTest();
  tester.runAllTests().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Comprehensive test execution failed:', error);
    process.exit(1);
  });
}

module.exports = ComprehensiveConnectionTest;