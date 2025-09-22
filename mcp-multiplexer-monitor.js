#!/usr/bin/env node
/**
 * MCP Multiplexer Monitor
 * Provides monitoring, management, and diagnostic tools for the MCP multiplexer
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class MCPMultiplexerMonitor {
  constructor() {
    this.multiplexerPath = path.join(__dirname, 'claudette-mcp-multiplexer.js');
    this.configPath = path.join(__dirname, 'mcp-multiplexer-config.json');
    this.logPath = path.join(__dirname, 'logs', 'mcp-multiplexer.log');
  }

  async getStatus() {
    try {
      // Send status request to multiplexer
      const statusRequest = {
        jsonrpc: '2.0',
        id: 'monitor_status',
        method: 'tools/call',
        params: {
          name: 'claudette_status'
        }
      };

      const response = await this.sendRequest(statusRequest);
      return this.parseStatusResponse(response);
    } catch (error) {
      return {
        error: error.message,
        multiplexer_running: false
      };
    }
  }

  async sendRequest(request, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [this.multiplexerPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';
      let responseReceived = false;

      const timeoutHandle = setTimeout(() => {
        if (!responseReceived) {
          child.kill('SIGTERM');
          reject(new Error('Monitor request timeout'));
        }
      }, timeout);

      child.stdout.on('data', (data) => {
        output += data.toString();
        
        // Try to parse JSON response
        const lines = output.split('\n');
        for (const line of lines) {
          if (line.trim() && line.trim().startsWith('{')) {
            try {
              const response = JSON.parse(line.trim());
              if (response.jsonrpc && response.id === request.id) {
                clearTimeout(timeoutHandle);
                responseReceived = true;
                child.kill('SIGTERM');
                resolve(response);
                return;
              }
            } catch (error) {
              // Continue processing
            }
          }
        }
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timeoutHandle);
        if (!responseReceived) {
          reject(new Error(`Monitor process closed with code ${code}: ${errorOutput}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeoutHandle);
        reject(error);
      });

      // Send request
      child.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  parseStatusResponse(response) {
    if (response.error) {
      return {
        error: response.error.message,
        multiplexer_running: false
      };
    }

    try {
      // Parse the status content
      const content = response.result.content[0].text;
      const lines = content.split('\n');
      
      const status = {
        multiplexer_running: true,
        instances: [],
        system_info: {},
        performance: {}
      };

      let section = 'general';
      for (const line of lines) {
        if (line.includes('MCP Server Status:')) {
          section = 'mcp_server';
        } else if (line.includes('Circuit State:')) {
          status.system_info.circuit_state = line.split(':')[1].trim();
        } else if (line.includes('Failure Count:')) {
          status.system_info.failure_count = parseInt(line.split(':')[1].trim());
        } else if (line.includes('Uptime:')) {
          status.system_info.uptime = line.split(':')[1].trim();
        }
      }

      return status;
    } catch (error) {
      return {
        error: 'Failed to parse status response',
        multiplexer_running: true,
        raw_response: response
      };
    }
  }

  async checkHealth() {
    try {
      const healthRequest = {
        jsonrpc: '2.0',
        id: 'monitor_health',
        method: 'tools/call',
        params: {
          name: 'claudette_health'
        }
      };

      const response = await this.sendRequest(healthRequest);
      
      if (response.error) {
        return {
          overall_health: 'unhealthy',
          error: response.error.message
        };
      }

      const healthData = JSON.parse(response.result.content[0].text);
      return {
        overall_health: healthData.overall_health,
        components: healthData.components,
        timestamp: healthData.timestamp,
        multiplexer_responsive: true
      };
    } catch (error) {
      return {
        overall_health: 'unknown',
        error: error.message,
        multiplexer_responsive: false
      };
    }
  }

  async testLoadBalancing(numRequests = 10) {
    console.log(`Testing load balancing with ${numRequests} concurrent requests...`);
    
    const testRequest = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'claudette_version'
      }
    };

    const startTime = Date.now();
    const promises = [];

    for (let i = 0; i < numRequests; i++) {
      promises.push(
        this.sendRequest({ ...testRequest, id: `test_${i}` })
          .then(response => ({ success: true, response, requestId: `test_${i}` }))
          .catch(error => ({ success: false, error: error.message, requestId: `test_${i}` }))
      );
    }

    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return {
      total_requests: numRequests,
      successful_requests: successful,
      failed_requests: failed,
      success_rate: (successful / numRequests * 100).toFixed(2),
      total_duration_ms: duration,
      average_duration_ms: Math.round(duration / numRequests),
      requests_per_second: Math.round(numRequests / (duration / 1000)),
      results: results
    };
  }

  async getConfiguration() {
    try {
      const configContent = await fs.readFile(this.configPath, 'utf8');
      return JSON.parse(configContent);
    } catch (error) {
      return {
        error: `Failed to read configuration: ${error.message}`
      };
    }
  }

  async updateConfiguration(newConfig) {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(newConfig, null, 2));
      return {
        success: true,
        message: 'Configuration updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update configuration: ${error.message}`
      };
    }
  }

  async getLogs(lines = 100) {
    try {
      const logContent = await fs.readFile(this.logPath, 'utf8');
      const logLines = logContent.split('\n');
      return logLines.slice(-lines).filter(line => line.trim());
    } catch (error) {
      return [`Log file not found: ${error.message}`];
    }
  }

  generateReport() {
    return {
      timestamp: new Date().toISOString(),
      report_type: 'mcp_multiplexer_status',
      checks: [
        this.getStatus(),
        this.checkHealth(),
        this.getConfiguration()
      ]
    };
  }

  async runDiagnostics() {
    console.log('Running MCP Multiplexer Diagnostics...\n');
    
    // 1. Check if multiplexer files exist
    console.log('1. File System Check:');
    try {
      await fs.access(this.multiplexerPath);
      console.log('✅ Multiplexer script exists');
    } catch (error) {
      console.log('❌ Multiplexer script missing');
    }

    try {
      await fs.access(this.configPath);
      console.log('✅ Configuration file exists');
    } catch (error) {
      console.log('❌ Configuration file missing');
    }

    // 2. Check configuration validity
    console.log('\n2. Configuration Check:');
    const config = await this.getConfiguration();
    if (config.error) {
      console.log('❌ Configuration error:', config.error);
    } else {
      console.log('✅ Configuration loaded successfully');
      console.log(`   - Min instances: ${config.multiplexer.minInstances}`);
      console.log(`   - Max instances: ${config.multiplexer.maxInstances}`);
      console.log(`   - Request timeout: ${config.multiplexer.requestTimeout}ms`);
    }

    // 3. Test multiplexer startup
    console.log('\n3. Startup Test:');
    try {
      const status = await this.getStatus();
      if (status.error) {
        console.log('❌ Multiplexer startup failed:', status.error);
      } else {
        console.log('✅ Multiplexer starts successfully');
      }
    } catch (error) {
      console.log('❌ Startup test failed:', error.message);
    }

    // 4. Health check
    console.log('\n4. Health Check:');
    try {
      const health = await this.checkHealth();
      if (health.overall_health === 'healthy') {
        console.log('✅ System is healthy');
      } else {
        console.log(`⚠️  System health: ${health.overall_health}`);
        if (health.error) console.log(`   Error: ${health.error}`);
      }
    } catch (error) {
      console.log('❌ Health check failed:', error.message);
    }

    // 5. Load balancing test
    console.log('\n5. Load Balancing Test:');
    try {
      const loadTest = await this.testLoadBalancing(5);
      console.log(`✅ Load balancing test completed`);
      console.log(`   - Success rate: ${loadTest.success_rate}%`);
      console.log(`   - Average response time: ${loadTest.average_duration_ms}ms`);
      console.log(`   - Requests per second: ${loadTest.requests_per_second}`);
    } catch (error) {
      console.log('❌ Load balancing test failed:', error.message);
    }

    console.log('\nDiagnostics complete!');
  }
}

// CLI interface
async function main() {
  const monitor = new MCPMultiplexerMonitor();
  const command = process.argv[2];

  switch (command) {
    case 'status':
      const status = await monitor.getStatus();
      console.log(JSON.stringify(status, null, 2));
      break;

    case 'health':
      const health = await monitor.checkHealth();
      console.log(JSON.stringify(health, null, 2));
      break;

    case 'test':
      const numRequests = parseInt(process.argv[3]) || 10;
      const testResults = await monitor.testLoadBalancing(numRequests);
      console.log(JSON.stringify(testResults, null, 2));
      break;

    case 'config':
      const config = await monitor.getConfiguration();
      console.log(JSON.stringify(config, null, 2));
      break;

    case 'logs':
      const lines = parseInt(process.argv[3]) || 100;
      const logs = await monitor.getLogs(lines);
      logs.forEach(line => console.log(line));
      break;

    case 'diagnostics':
      await monitor.runDiagnostics();
      break;

    case 'report':
      const report = await monitor.generateReport();
      console.log(JSON.stringify(report, null, 2));
      break;

    default:
      console.log('MCP Multiplexer Monitor');
      console.log('Usage: node mcp-multiplexer-monitor.js <command>');
      console.log('');
      console.log('Commands:');
      console.log('  status      - Get multiplexer status');
      console.log('  health      - Check system health');
      console.log('  test [n]    - Test load balancing with n requests (default: 10)');
      console.log('  config      - Show configuration');
      console.log('  logs [n]    - Show last n log lines (default: 100)');
      console.log('  diagnostics - Run full diagnostic suite');
      console.log('  report      - Generate status report');
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Monitor error:', error);
    process.exit(1);
  });
}

module.exports = MCPMultiplexerMonitor;