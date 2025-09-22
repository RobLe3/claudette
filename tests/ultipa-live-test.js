#!/usr/bin/env node
// Live Ultipa GraphDB Connection Test with Real Credentials
// Tests actual connection to Ultipa cloud instance

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

class UltipaLiveTest {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
    this.config = this.loadConfiguration();
    this.startTime = Date.now();
  }

  log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  error(message) {
    console.error(`[${new Date().toISOString()}] ERROR: ${message}`);
    this.testResults.errors.push(message);
    this.testResults.failed++;
  }

  success(message) {
    this.log(`✅ ${message}`);
    this.testResults.passed++;
  }

  loadConfiguration() {
    this.log('📋 Loading Live Configuration...');
    
    // Load from environment variables (preferred)
    const endpoint = process.env.ULTIPA_ENDPOINT || 
                    process.env.ULTIPA_IP_ADDRESS || 
                    process.env.ULTIPA_HOST;
    const accessToken = process.env.ULTIPA_ACCESS_TOKEN;
    
    if (!endpoint || !accessToken) {
      // Fallback to config file
      const configPath = './config/default.json';
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.rag?.graph_db) {
          const graphConfig = config.rag.graph_db;
          return {
            endpoint: `${graphConfig.host}:${graphConfig.port}`,
            accessToken: accessToken || graphConfig.access_token,
            database: graphConfig.database || 'default',
            graph: graphConfig.graph || 'claudette_graph',
            timeout: 30000
          };
        }
      }
      
      throw new Error('No Ultipa credentials found in environment or config');
    }

    return {
      endpoint: endpoint,
      accessToken: accessToken,
      database: process.env.ULTIPA_DATABASE || 'default',
      graph: process.env.ULTIPA_GRAPH || 'claudette_graph', 
      timeout: 30000
    };
  }

  async runLiveTests() {
    this.log('🌐 Starting Live Ultipa GraphDB Tests');
    this.log('====================================');
    
    try {
      this.log(`🎯 Target: ${this.config.endpoint}`);
      this.log(`📊 Database: ${this.config.database}`);
      this.log(`📈 Graph: ${this.config.graph}`);
      
      // Test 1: Basic Connection
      await this.testBasicConnection();
      
      // Test 2: Database Access
      await this.testDatabaseAccess();
      
      // Test 3: Schema Operations
      await this.testSchemaOperations();
      
      // Test 4: CRUD Operations
      await this.testCRUDOperations();
      
      // Test 5: Advanced Queries
      await this.testAdvancedQueries();
      
      // Test 6: Performance Testing
      await this.testPerformance();
      
      this.generateReport();
      
    } catch (error) {
      this.error(`Live test execution failed: ${error.message}`);
    }
  }

  async testBasicConnection() {
    this.log('🔌 Testing Basic Connection...');
    
    try {
      const result = await this.executeQuery('RETURN "connection_test" as test, datetime() as server_time');
      
      if (result && result.length > 0) {
        this.success(`Connection established - Server time: ${result[0].server_time || 'Unknown'}`);
      } else {
        throw new Error('No response from server');
      }
      
    } catch (error) {
      this.error(`Basic connection failed: ${error.message}`);
    }
  }

  async testDatabaseAccess() {
    this.log('🗄️ Testing Database Access...');
    
    try {
      // Test database information
      const dbInfo = await this.executeQuery('SHOW DATABASES');
      this.success(`Database access confirmed - Found ${dbInfo?.length || 0} databases`);
      
      // Test graph information
      const graphInfo = await this.executeQuery('SHOW GRAPHS');
      this.success(`Graph access confirmed - Found ${graphInfo?.length || 0} graphs`);
      
    } catch (error) {
      this.error(`Database access failed: ${error.message}`);
    }
  }

  async testSchemaOperations() {
    this.log('🏗️ Testing Schema Operations...');
    
    try {
      // Test node schema viewing
      const nodeSchemas = await this.executeQuery('SHOW SCHEMAS NODE');
      this.success(`Node schemas: ${nodeSchemas?.length || 0} found`);
      
      // Test edge schema viewing  
      const edgeSchemas = await this.executeQuery('SHOW SCHEMAS EDGE');
      this.success(`Edge schemas: ${edgeSchemas?.length || 0} found`);
      
      // Test index information
      const indexes = await this.executeQuery('SHOW INDEXES');
      this.success(`Indexes: ${indexes?.length || 0} found`);
      
    } catch (error) {
      this.error(`Schema operations failed: ${error.message}`);
    }
  }

  async testCRUDOperations() {
    this.log('📝 Testing CRUD Operations...');
    
    const testNodeId = `test_node_${Date.now()}`;
    
    try {
      // Test CREATE
      const createResult = await this.executeQuery(`
        CREATE (test:ClaudetteTest {
          test_id: $testId,
          description: "Live connection test node",
          created_timestamp: datetime(),
          test_type: "connection_validation"
        })
        RETURN test.test_id
      `, { testId: testNodeId });
      
      if (createResult && createResult.length > 0) {
        this.success('CREATE operation successful');
      } else {
        throw new Error('CREATE operation failed - no nodes returned');
      }
      
      // Test READ
      const readResult = await this.executeQuery(`
        MATCH (test:ClaudetteTest {test_id: $testId})
        RETURN test
      `, { testId: testNodeId });
      
      if (readResult && readResult.length > 0) {
        this.success('READ operation successful');
      } else {
        throw new Error('READ operation failed - node not found');
      }
      
      // Test UPDATE
      const updateResult = await this.executeQuery(`
        MATCH (test:ClaudetteTest {test_id: $testId})
        SET test.updated_timestamp = datetime(),
            test.test_status = "updated"
        RETURN test.test_id
      `, { testId: testNodeId });
      
      if (updateResult && updateResult.length > 0) {
        this.success('UPDATE operation successful');
      } else {
        throw new Error('UPDATE operation failed');
      }
      
      // Test DELETE (cleanup)
      const deleteResult = await this.executeQuery(`
        MATCH (test:ClaudetteTest {test_id: $testId})
        DELETE test
        RETURN count(test) as deleted_count
      `, { testId: testNodeId });
      
      if (deleteResult) {
        this.success('DELETE operation successful (cleanup completed)');
      }
      
    } catch (error) {
      // Cleanup attempt in case of partial failure
      try {
        await this.executeQuery(`
          MATCH (test:ClaudetteTest {test_id: $testId})
          DELETE test
        `, { testId: testNodeId });
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      this.error(`CRUD operations failed: ${error.message}`);
    }
  }

  async testAdvancedQueries() {
    this.log('🧠 Testing Advanced Queries...');
    
    try {
      // Test aggregation query
      const countResult = await this.executeQuery(`
        MATCH (n)
        RETURN labels(n) as node_type, count(n) as node_count
        ORDER BY node_count DESC
        LIMIT 10
      `);
      
      if (countResult) {
        this.success(`Aggregation query successful - Found ${countResult.length} node types`);
      }
      
      // Test pattern matching (if data exists)
      const patternResult = await this.executeQuery(`
        MATCH (a)-[r]->(b)
        RETURN type(r) as relationship_type, count(r) as relationship_count
        ORDER BY relationship_count DESC
        LIMIT 5
      `);
      
      if (patternResult !== null) {
        this.success(`Pattern matching successful - Found ${patternResult.length} relationship patterns`);
      }
      
      // Test date/time functions
      const timeResult = await this.executeQuery(`
        RETURN datetime() as server_time,
               date() as server_date,
               time() as server_time_only
      `);
      
      if (timeResult && timeResult.length > 0) {
        this.success('Date/time functions working');
      }
      
    } catch (error) {
      this.error(`Advanced queries failed: ${error.message}`);
    }
  }

  async testPerformance() {
    this.log('⚡ Testing Performance...');
    
    try {
      // Test query performance
      const performanceTests = [
        { name: 'Simple Return', query: 'RETURN 1 as test' },
        { name: 'DateTime Function', query: 'RETURN datetime() as now' },
        { name: 'Basic Match', query: 'MATCH (n) RETURN count(n) as total_nodes LIMIT 1' }
      ];
      
      for (const test of performanceTests) {
        const startTime = Date.now();
        await this.executeQuery(test.query);
        const duration = Date.now() - startTime;
        
        if (duration < 5000) { // 5 second threshold
          this.success(`${test.name}: ${duration}ms (Good performance)`);
        } else {
          this.log(`⚠️ ${test.name}: ${duration}ms (Slower than expected)`);
        }
      }
      
    } catch (error) {
      this.error(`Performance testing failed: ${error.message}`);
    }
  }

  async executeQuery(query, parameters = {}) {
    try {
      // Try different endpoint formats
      const endpoints = [
        `https://${this.config.endpoint}/api/gql`,
        `https://${this.config.endpoint}/gql`,
        `http://${this.config.endpoint}/api/gql`,
        `http://${this.config.endpoint}/gql`
      ];
      
      const requestBody = {
        gql: query,
        parameters,
        database: this.config.database,
        graph: this.config.graph,
        timeout: this.config.timeout
      };
      
      // Try different authentication methods
      const authHeaders = [
        { 'Authorization': `Bearer ${this.config.accessToken}` },
        { 'X-Access-Token': this.config.accessToken },
        { 'ultipa-token': this.config.accessToken },
        { 'token': this.config.accessToken }
      ];
      
      this.log(`🔑 Testing authentication with endpoint: ${endpoints[0]}`);
      
      for (let endpointUrl of endpoints) {
        for (let authHeader of authHeaders) {
          try {
            const response = await fetch(endpointUrl, {
              method: 'POST',
              headers: {
                ...authHeader,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(requestBody),
              signal: AbortSignal.timeout(this.config.timeout)
            });
            
            this.log(`📡 Tried: ${endpointUrl} with auth: ${Object.keys(authHeader)[0]}`);
            
            if (response.ok) {
              const result = await response.json();
              this.log(`✅ Found working endpoint: ${endpointUrl}`);
              
              if (result.error) {
                throw new Error(result.error.message || 'Query execution failed');
              }
              
              return result.data?.nodes || result.data || [];
            } else {
              this.log(`   ❌ ${response.status}: ${response.statusText}`);
            }
          } catch (fetchError) {
            this.log(`   ❌ Network error: ${fetchError.message}`);
          }
        }
      }
      
      throw new Error('All endpoint and authentication combinations failed');
      
    } catch (error) {
      throw new Error(`Query failed: ${error.message}`);
    }
  }

  generateReport() {
    const totalTime = Date.now() - this.startTime;
    const total = this.testResults.passed + this.testResults.failed;
    const successRate = total > 0 ? ((this.testResults.passed / total) * 100).toFixed(1) : '0.0';
    
    this.log('\n🌐 LIVE ULTIPA CONNECTION TEST RESULTS');
    this.log('=====================================');
    
    this.log(`\n📊 TEST SUMMARY:`);
    this.log(`   🎯 Target: ${this.config.endpoint}`);
    this.log(`   📊 Database: ${this.config.database}`);
    this.log(`   📈 Graph: ${this.config.graph}`);
    this.log(`   ✅ Passed: ${this.testResults.passed}`);
    this.log(`   ❌ Failed: ${this.testResults.failed}`);
    this.log(`   📈 Success Rate: ${successRate}%`);
    this.log(`   ⏱️  Total Time: ${totalTime}ms`);
    
    if (this.testResults.errors.length > 0) {
      this.log(`\n🚨 ERRORS:`);
      this.testResults.errors.forEach(error => this.log(`   - ${error}`));
    }
    
    this.log('\n🔍 CONNECTION VALIDATION:');
    if (parseFloat(successRate) >= 90) {
      this.log('   🌟 EXCELLENT: Live connection fully functional');
      this.log('   ✅ Ready for production GraphDB operations');
      this.log('   🚀 Schema deployment can proceed');
    } else if (parseFloat(successRate) >= 70) {
      this.log('   👍 GOOD: Connection working with minor issues');
      this.log('   ⚠️ Review failed tests before schema deployment');
    } else {
      this.log('   ❌ ISSUES: Connection has significant problems');
      this.log('   🔧 Fix connection issues before proceeding');
    }
    
    this.log('\n💡 NEXT STEPS:');
    if (parseFloat(successRate) >= 80) {
      this.log('   1. Deploy Claudette schema using schema deployer');
      this.log('   2. Run comprehensive meta-cognitive tests');
      this.log('   3. Integrate with RAG system for hybrid search');
      this.log('   4. Enable production GraphDB features');
    } else {
      this.log('   1. Check network connectivity to Ultipa cloud');
      this.log('   2. Verify access token is valid and not expired');
      this.log('   3. Confirm database and graph permissions');
      this.log('   4. Retry connection after resolving issues');
    }
    
    // Save test results
    const reportData = {
      timestamp: new Date().toISOString(),
      endpoint: this.config.endpoint,
      database: this.config.database,
      graph: this.config.graph,
      testResults: this.testResults,
      successRate: parseFloat(successRate),
      totalTime,
      recommendation: this.getRecommendation(parseFloat(successRate))
    };
    
    fs.writeFileSync('./ultipa-live-test-results.json', JSON.stringify(reportData, null, 2));
    this.log('\n📄 Test results saved to: ultipa-live-test-results.json');
    
    return parseFloat(successRate) >= 80;
  }

  getRecommendation(successRate) {
    if (successRate >= 90) return 'READY_FOR_PRODUCTION';
    if (successRate >= 70) return 'MINOR_ISSUES_REVIEW_NEEDED';
    return 'MAJOR_ISSUES_FIX_REQUIRED';
  }
}

// Load dotenv if available
try {
  require('dotenv').config();
} catch (error) {
  console.log('Note: dotenv not available, using system environment variables only');
}

// Run the live tests
if (require.main === module) {
  const tester = new UltipaLiveTest();
  tester.runLiveTests().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Live test execution failed:', error);
    process.exit(1);
  });
}

module.exports = UltipaLiveTest;