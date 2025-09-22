#!/usr/bin/env node
// Ultipa Cloud Specific Authentication Test
// Based on Ultipa manager settings provided

const fs = require('fs');
require('dotenv').config();

class UltipaCloudTest {
  constructor() {
    this.config = {
      endpoint: '66c01daf81eb4288ad01d0f0b3445781s.eu-south-1.cloud.ultipa.com:8443',
      dbUsername: 'flexcon',           // Database username from manager
      dbPassword: '4DBTender2025!!!',  // Database password from manager  
      apiUser: 'claudette',            // API user for the access token
      accessToken: process.env.ULTIPA_ACCESS_TOKEN
    };
    this.startTime = Date.now();
  }

  log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  async runCloudTests() {
    this.log('🌐 Ultipa Cloud Specific Authentication Tests');
    this.log('===========================================');
    this.log(`🎯 Endpoint: ${this.config.endpoint}`);
    this.log(`👤 DB Username: ${this.config.dbUsername}`);
    this.log(`🎭 API User: ${this.config.apiUser}`);
    this.log(`🔑 Has Token: ${!!this.config.accessToken}`);
    
    // Test different authentication methods specific to Ultipa cloud
    const results = [];
    
    // Method 1: Basic Auth with username/password  
    results.push(await this.testBasicAuth());
    
    // Method 2: Token + Basic Auth combination
    results.push(await this.testTokenWithBasicAuth());
    
    // Method 3: Username/password in request body
    results.push(await this.testCredentialsInBody());
    
    // Method 4: Ultipa-specific authentication headers
    results.push(await this.testUltipaSpecificAuth());
    
    // Method 5: API user with token authentication  
    results.push(await this.testApiUserAuth());
    
    // Method 6: Try different endpoints with auth
    results.push(await this.testAlternativeEndpoints());
    
    this.generateCloudReport(results);
  }

  async testBasicAuth() {
    this.log('\n🔐 Testing Basic Authentication...');
    
    try {
      const basicAuth = Buffer.from(`${this.config.dbUsername}:${this.config.dbPassword}`).toString('base64');
      
      const response = await fetch(`https://${this.config.endpoint}/api/gql`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gql: 'RETURN "test" as message, datetime() as time',
          database: 'default'
        }),
        signal: AbortSignal.timeout(15000)
      });

      this.log(`📡 Basic Auth Response: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        this.log(`✅ Basic Auth Success: ${JSON.stringify(data)}`);
        return { method: 'Basic Auth', status: 'success', data };
      } else {
        const errorText = await response.text();
        this.log(`❌ Basic Auth Failed: ${errorText}`);
        return { method: 'Basic Auth', status: 'failed', error: `${response.status}: ${errorText}` };
      }
    } catch (error) {
      this.log(`❌ Basic Auth Error: ${error.message}`);
      return { method: 'Basic Auth', status: 'error', error: error.message };
    }
  }

  async testTokenWithBasicAuth() {
    this.log('\n🔗 Testing Token + Basic Auth Combination...');
    
    try {
      const basicAuth = Buffer.from(`${this.config.dbUsername}:${this.config.dbPassword}`).toString('base64');
      
      const response = await fetch(`https://${this.config.endpoint}/api/gql`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'X-Access-Token': this.config.accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gql: 'RETURN "test" as message, datetime() as time',
          database: 'default'
        }),
        signal: AbortSignal.timeout(15000)
      });

      this.log(`📡 Token+Basic Response: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        this.log(`✅ Token+Basic Success: ${JSON.stringify(data)}`);
        return { method: 'Token + Basic Auth', status: 'success', data };
      } else {
        const errorText = await response.text();
        this.log(`❌ Token+Basic Failed: ${errorText}`);
        return { method: 'Token + Basic Auth', status: 'failed', error: `${response.status}: ${errorText}` };
      }
    } catch (error) {
      this.log(`❌ Token+Basic Error: ${error.message}`);
      return { method: 'Token + Basic Auth', status: 'error', error: error.message };
    }
  }

  async testCredentialsInBody() {
    this.log('\n📝 Testing Credentials in Request Body...');
    
    try {
      const response = await fetch(`https://${this.config.endpoint}/api/gql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gql: 'RETURN "test" as message, datetime() as time',
          database: 'default',
          username: this.config.dbUsername,
          password: this.config.dbPassword,
          accessToken: this.config.accessToken
        }),
        signal: AbortSignal.timeout(15000)
      });

      this.log(`📡 Body Credentials Response: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        this.log(`✅ Body Credentials Success: ${JSON.stringify(data)}`);
        return { method: 'Credentials in Body', status: 'success', data };
      } else {
        const errorText = await response.text();
        this.log(`❌ Body Credentials Failed: ${errorText}`);
        return { method: 'Credentials in Body', status: 'failed', error: `${response.status}: ${errorText}` };
      }
    } catch (error) {
      this.log(`❌ Body Credentials Error: ${error.message}`);
      return { method: 'Credentials in Body', status: 'error', error: error.message };
    }
  }

  async testUltipaSpecificAuth() {
    this.log('\n🏢 Testing Ultipa-Specific Headers...');
    
    try {
      const response = await fetch(`https://${this.config.endpoint}/api/gql`, {
        method: 'POST',
        headers: {
          'ultipa-username': this.config.dbUsername,
          'ultipa-password': this.config.dbPassword,
          'ultipa-token': this.config.accessToken,
          'ultipa-api-user': this.config.apiUser,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gql: 'RETURN "test" as message, datetime() as time',
          database: 'default'
        }),
        signal: AbortSignal.timeout(15000)
      });

      this.log(`📡 Ultipa Headers Response: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        this.log(`✅ Ultipa Headers Success: ${JSON.stringify(data)}`);
        return { method: 'Ultipa Headers', status: 'success', data };
      } else {
        const errorText = await response.text();
        this.log(`❌ Ultipa Headers Failed: ${errorText}`);
        return { method: 'Ultipa Headers', status: 'failed', error: `${response.status}: ${errorText}` };
      }
    } catch (error) {
      this.log(`❌ Ultipa Headers Error: ${error.message}`);
      return { method: 'Ultipa Headers', status: 'error', error: error.message };
    }
  }

  async testApiUserAuth() {
    this.log('\n🎭 Testing API User Authentication...');
    
    try {
      // Try API user with Basic Auth
      const apiBasicAuth = Buffer.from(`${this.config.apiUser}:${this.config.accessToken}`).toString('base64');
      
      const response = await fetch(`https://${this.config.endpoint}/api/gql`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${apiBasicAuth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gql: 'RETURN "test" as message, datetime() as time',
          database: 'default'
        }),
        signal: AbortSignal.timeout(15000)
      });

      this.log(`📡 API User Auth Response: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        this.log(`✅ API User Auth Success: ${JSON.stringify(data)}`);
        return { method: 'API User Auth', status: 'success', data };
      } else {
        const errorText = await response.text();
        this.log(`❌ API User Auth Failed: ${errorText}`);
        return { method: 'API User Auth', status: 'failed', error: `${response.status}: ${errorText}` };
      }
    } catch (error) {
      this.log(`❌ API User Auth Error: ${error.message}`);
      return { method: 'API User Auth', status: 'error', error: error.message };
    }
  }

  async testAlternativeEndpoints() {
    this.log('\n🎯 Testing Alternative Endpoints...');
    
    const endpoints = [
      '/api/v1/gql',
      '/gql', 
      '/query',
      '/api/query',
      '/ultipa/gql',
      '/db/gql'
    ];
    
    const basicAuth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
    
    for (const endpoint of endpoints) {
      try {
        this.log(`   🔍 Trying: ${endpoint}`);
        
        const response = await fetch(`https://${this.config.endpoint}${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${basicAuth}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            gql: 'RETURN "test" as message',
            database: 'default'
          }),
          signal: AbortSignal.timeout(10000)
        });

        this.log(`      📡 ${endpoint}: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          this.log(`      ✅ SUCCESS with endpoint: ${endpoint}`);
          return { method: `Alternative Endpoint: ${endpoint}`, status: 'success', data, endpoint };
        }
        
      } catch (error) {
        this.log(`      ❌ ${endpoint}: ${error.message}`);
      }
    }
    
    return { method: 'Alternative Endpoints', status: 'failed', error: 'No alternative endpoints worked' };
  }

  generateCloudReport(results) {
    const totalTime = Date.now() - this.startTime;
    const successfulMethods = results.filter(r => r.status === 'success');
    
    this.log('\n🌟 ULTIPA CLOUD TEST RESULTS');
    this.log('============================');
    
    this.log(`\n📊 SUMMARY:`);
    this.log(`   🎯 Endpoint: ${this.config.endpoint}`);
    this.log(`   👤 DB Username: ${this.config.dbUsername}`);
    this.log(`   🎭 API User: ${this.config.apiUser}`);
    this.log(`   ✅ Successful Methods: ${successfulMethods.length}/${results.length}`);
    this.log(`   ⏱️  Total Time: ${totalTime}ms`);
    
    this.log(`\n🔍 DETAILED RESULTS:`);
    results.forEach((result, index) => {
      const status = result.status === 'success' ? '✅' : '❌';
      this.log(`   ${status} ${result.method}: ${result.status}`);
      if (result.error) {
        this.log(`      Error: ${result.error}`);
      }
      if (result.data) {
        this.log(`      Data: ${JSON.stringify(result.data).substring(0, 100)}...`);
      }
    });

    if (successfulMethods.length > 0) {
      this.log(`\n🎉 SUCCESS! Working authentication found:`);
      successfulMethods.forEach(method => {
        this.log(`   ✅ ${method.method}`);
        if (method.endpoint) {
          this.log(`      Endpoint: ${method.endpoint}`);
        }
      });
      
      this.log(`\n💡 NEXT STEPS:`);
      this.log(`   1. Update connection client with working method`);
      this.log(`   2. Deploy schema to database`);
      this.log(`   3. Enable production GraphDB features`);
    } else {
      this.log(`\n❌ NO WORKING AUTHENTICATION FOUND`);
      this.log(`\n🔧 TROUBLESHOOTING:`);
      this.log(`   1. Verify credentials are correct in Ultipa manager`);
      this.log(`   2. Check if database is running and accessible`);
      this.log(`   3. Confirm network connectivity to cloud instance`);
      this.log(`   4. Contact Ultipa support for authentication help`);
    }

    // Save detailed results
    const reportData = {
      timestamp: new Date().toISOString(),
      endpoint: this.config.endpoint,
      dbUsername: this.config.dbUsername,
      apiUser: this.config.apiUser,
      results,
      successCount: successfulMethods.length,
      totalTests: results.length,
      totalTime
    };

    fs.writeFileSync('./ultipa-cloud-test-results.json', JSON.stringify(reportData, null, 2));
    this.log('\n📄 Detailed results saved to: ultipa-cloud-test-results.json');
    
    return successfulMethods.length > 0;
  }
}

// Run the cloud-specific tests
if (require.main === module) {
  const tester = new UltipaCloudTest();
  tester.runCloudTests().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Cloud test execution failed:', error);
    process.exit(1);
  });
}

module.exports = UltipaCloudTest;