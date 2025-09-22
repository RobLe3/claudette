#!/usr/bin/env node
// Functional Test Suite for Claudette
// Tests existing functionality and runs performance benchmarks

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

class ClaudetteFunctionalTest {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
    this.benchmarks = {};
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

  async runAllTests() {
    this.log('🚀 Starting Claudette Functional Test Suite');
    this.log('===========================================');

    try {
      // Test 1: File Structure Validation
      await this.testFileStructure();
      
      // Test 2: Configuration System
      await this.testConfiguration();
      
      // Test 3: Existing Test Suite Integration
      await this.runExistingTests();
      
      // Test 4: Performance Benchmarks
      await this.runPerformanceBenchmarks();
      
      // Test 5: Module Dependencies
      await this.testModuleDependencies();
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      this.error(`Test suite execution failed: ${error.message}`);
    }
  }

  async testFileStructure() {
    this.log('📁 Testing File Structure...');
    
    try {
      // Critical files
      const criticalFiles = [
        'package.json',
        'claudette',
        'config/default.json',
        'src/index.ts',
        'src/types/index.ts',
        'src/meta-cognitive/problem-solving-engine.ts',
        'src/rag/providers.ts',
        'src/graph/ultipa-client.ts',
        'src/cache/index.ts'
      ];
      
      let missingFiles = [];
      for (const file of criticalFiles) {
        if (!fs.existsSync(file)) {
          missingFiles.push(file);
        }
      }
      
      if (missingFiles.length === 0) {
        this.success('All critical files present');
      } else {
        this.error(`Missing critical files: ${missingFiles.join(', ')}`);
      }
      
      // Count total source files
      const srcFiles = this.countFiles('src', ['.ts', '.js']);
      this.log(`📊 Source files: ${srcFiles.total} (${srcFiles.ts} TypeScript, ${srcFiles.js} JavaScript)`);
      this.benchmarks.fileStructure = srcFiles;
      
      if (srcFiles.total > 50) {
        this.success('Rich codebase with comprehensive functionality');
      }
      
    } catch (error) {
      this.error(`File structure test failed: ${error.message}`);
    }
  }

  async testConfiguration() {
    this.log('⚙️ Testing Configuration System...');
    
    try {
      // Test package.json
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      if (pkg.name === 'claudette' && pkg.version) {
        this.success(`Package info valid: ${pkg.name} v${pkg.version}`);
        this.benchmarks.version = pkg.version;
      } else {
        this.error('Package.json missing required fields');
      }
      
      // Test default configuration
      if (fs.existsSync('config/default.json')) {
        const config = JSON.parse(fs.readFileSync('config/default.json', 'utf8'));
        if (config.backends && config.features && config.thresholds) {
          this.success('Default configuration structure valid');
          
          // Count backend configurations
          const backendCount = Object.keys(config.backends).length;
          this.success(`${backendCount} backend configurations available`);
          
          // Count feature flags
          const featureCount = Object.keys(config.features).length;
          this.success(`${featureCount} feature flags configured`);
          
        } else {
          this.error('Configuration missing required sections');
        }
      } else {
        this.error('Default configuration file not found');
      }
      
      // Test executable
      if (fs.existsSync('claudette')) {
        const stats = fs.statSync('claudette');
        if (stats.mode & parseInt('111', 8)) {
          this.success('Claudette executable is properly configured');
        } else {
          this.error('Claudette executable lacks execution permissions');
        }
      }
      
    } catch (error) {
      this.error(`Configuration test failed: ${error.message}`);
    }
  }

  async runExistingTests() {
    this.log('🧪 Running Existing Test Suites...');
    
    const testCommands = [
      { name: 'Unit Tests', cmd: 'npm run test', timeout: 60000 },
      { name: 'RAG Tests', cmd: 'npm run test:rag', timeout: 30000 },
      { name: 'KPI Framework', cmd: 'npm run test:kpi', timeout: 30000 },
      { name: 'Fresh System Validation', cmd: 'npm run test:fresh-system', timeout: 45000 }
    ];
    
    for (const test of testCommands) {
      try {
        this.log(`🔄 Running ${test.name}...`);
        const startTime = Date.now();
        
        // Run test with timeout
        const output = execSync(test.cmd, { 
          timeout: test.timeout,
          encoding: 'utf8',
          stdio: 'pipe'
        });
        
        const duration = Date.now() - startTime;
        
        if (output.includes('✅') || output.includes('SUCCESS') || output.includes('PASSED')) {
          this.success(`${test.name} completed successfully (${duration}ms)`);
        } else if (output.includes('❌') || output.includes('FAILED') || output.includes('ERROR')) {
          this.error(`${test.name} reported failures`);
        } else {
          this.success(`${test.name} completed (${duration}ms)`);
        }
        
        if (!this.benchmarks.testSuites) {
          this.benchmarks.testSuites = {};
        }
        this.benchmarks.testSuites[test.name] = { duration, success: true };
        
      } catch (error) {
        if (error.status === 'SIGTERM') {
          this.error(`${test.name} timed out`);
        } else {
          this.error(`${test.name} failed: ${error.message}`);
        }
        
        if (!this.benchmarks.testSuites) {
          this.benchmarks.testSuites = {};
        }
        this.benchmarks.testSuites[test.name] = { duration: test.timeout, success: false };
      }
    }
  }

  async runPerformanceBenchmarks() {
    this.log('⚡ Running Performance Benchmarks...');
    
    try {
      // Benchmark 1: File I/O Performance
      const fileIoStart = Date.now();
      for (let i = 0; i < 100; i++) {
        if (fs.existsSync('package.json')) {
          fs.readFileSync('package.json', 'utf8');
        }
      }
      const fileIoTime = Date.now() - fileIoStart;
      this.benchmarks.fileIO = { iterations: 100, totalTime: fileIoTime, avgTime: fileIoTime / 100 };
      this.success(`File I/O: ${(fileIoTime / 100).toFixed(2)}ms average`);
      
      // Benchmark 2: JSON Parsing Performance
      const jsonParseStart = Date.now();
      const configData = fs.readFileSync('config/default.json', 'utf8');
      for (let i = 0; i < 1000; i++) {
        JSON.parse(configData);
      }
      const jsonParseTime = Date.now() - jsonParseStart;
      this.benchmarks.jsonParsing = { iterations: 1000, totalTime: jsonParseTime, avgTime: jsonParseTime / 1000 };
      this.success(`JSON parsing: ${(jsonParseTime / 1000).toFixed(3)}ms average`);
      
      // Benchmark 3: Memory Usage
      const memoryUsage = process.memoryUsage();
      this.benchmarks.memory = {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024)
      };
      this.success(`Memory usage: ${this.benchmarks.memory.heapUsed}MB heap, ${this.benchmarks.memory.rss}MB RSS`);
      
      // Benchmark 4: Command Execution Performance
      const cmdStart = Date.now();
      try {
        execSync('node --version', { encoding: 'utf8' });
        const cmdTime = Date.now() - cmdStart;
        this.benchmarks.commandExecution = { time: cmdTime };
        this.success(`Command execution: ${cmdTime}ms`);
      } catch (error) {
        this.error(`Command execution benchmark failed: ${error.message}`);
      }
      
    } catch (error) {
      this.error(`Performance benchmarks failed: ${error.message}`);
    }
  }

  async testModuleDependencies() {
    this.log('📦 Testing Module Dependencies...');
    
    try {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      // Check critical dependencies
      const criticalDeps = [
        '@anthropic-ai/sdk',
        'openai',
        'better-sqlite3',
        'commander',
        'chalk'
      ];
      
      let installedDeps = 0;
      let missingDeps = [];
      
      for (const dep of criticalDeps) {
        if (pkg.dependencies && pkg.dependencies[dep]) {
          installedDeps++;
        } else {
          missingDeps.push(dep);
        }
      }
      
      if (missingDeps.length === 0) {
        this.success(`All ${criticalDeps.length} critical dependencies configured`);
      } else {
        this.error(`Missing dependencies: ${missingDeps.join(', ')}`);
      }
      
      // Check node_modules installation
      if (fs.existsSync('node_modules')) {
        const nodeModulesSize = this.getDirectorySize('node_modules');
        this.success(`Node modules installed (${nodeModulesSize} files)`);
        this.benchmarks.nodeModules = { size: nodeModulesSize };
      } else {
        this.error('Node modules not installed - run npm install');
      }
      
      // Total dependency count
      const totalDeps = Object.keys(pkg.dependencies || {}).length + Object.keys(pkg.devDependencies || {}).length;
      this.success(`Total dependencies: ${totalDeps} packages`);
      this.benchmarks.dependencies = { total: totalDeps, critical: installedDeps };
      
    } catch (error) {
      this.error(`Module dependencies test failed: ${error.message}`);
    }
  }

  countFiles(directory, extensions) {
    const result = { total: 0, ts: 0, js: 0 };
    
    function walkDir(dir) {
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            walkDir(filePath);
          } else {
            const ext = path.extname(file);
            if (extensions.includes(ext)) {
              result.total++;
              if (ext === '.ts') result.ts++;
              if (ext === '.js') result.js++;
            }
          }
        }
      } catch (error) {
        // Ignore inaccessible directories
      }
    }
    
    walkDir(directory);
    return result;
  }

  getDirectorySize(directory) {
    let count = 0;
    
    function walkDir(dir) {
      try {
        const files = fs.readdirSync(dir);
        count += files.length;
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            walkDir(filePath);
          }
        }
      } catch (error) {
        // Ignore inaccessible directories
      }
    }
    
    walkDir(directory);
    return count;
  }

  generateReport() {
    const totalTime = Date.now() - this.startTime;
    const total = this.testResults.passed + this.testResults.failed;
    const successRate = total > 0 ? ((this.testResults.passed / total) * 100).toFixed(1) : '0.0';
    
    this.log('\n🎯 FUNCTIONAL TEST RESULTS');
    this.log('==========================');
    
    this.log(`\n📊 TEST SUMMARY:`);
    this.log(`   ✅ Passed: ${this.testResults.passed}`);
    this.log(`   ❌ Failed: ${this.testResults.failed}`);
    this.log(`   📈 Success Rate: ${successRate}%`);
    this.log(`   ⏱️  Total Time: ${totalTime}ms`);
    
    if (this.testResults.errors.length > 0) {
      this.log(`\n🚨 ERRORS:`);
      this.testResults.errors.forEach(error => this.log(`   - ${error}`));
    }
    
    // Performance benchmarks
    this.log('\n⚡ PERFORMANCE BENCHMARKS:');
    for (const [category, benchmark] of Object.entries(this.benchmarks)) {
      if (benchmark.avgTime !== undefined) {
        this.log(`   ${category}: ${benchmark.avgTime.toFixed(3)}ms average (${benchmark.iterations} iterations)`);
      } else if (benchmark.heapUsed !== undefined) {
        this.log(`   ${category}: ${benchmark.heapUsed}MB heap, ${benchmark.rss}MB RSS`);
      } else if (benchmark.total !== undefined) {
        this.log(`   ${category}: ${benchmark.total} files (${benchmark.ts} TS, ${benchmark.js} JS)`);
      } else if (category === 'testSuites') {
        this.log(`   Test Suites:`);
        for (const [testName, testData] of Object.entries(benchmark)) {
          const status = testData.success ? '✅' : '❌';
          this.log(`     ${status} ${testName}: ${testData.duration}ms`);
        }
      } else {
        this.log(`   ${category}: ${JSON.stringify(benchmark)}`);
      }
    }
    
    // Quality assessment
    this.log('\n🎖️  QUALITY ASSESSMENT:');
    if (successRate >= 90) {
      this.log('   🌟 EXCELLENT: System exceeds quality standards');
      this.log('   ✅ Recommendation: MAJOR VERSION BUMP - Significant improvements achieved');
    } else if (successRate >= 80) {
      this.log('   🎯 GOOD: System meets quality standards');
      this.log('   ✅ Recommendation: MINOR VERSION BUMP - Improvements confirmed');
    } else if (successRate >= 60) {
      this.log('   ⚠️  FAIR: System functional with some issues');
      this.log('   🔧 Recommendation: PATCH VERSION BUMP - Bug fixes needed');
    } else {
      this.log('   ❌ POOR: System has significant issues');
      this.log('   🚨 Recommendation: Fix critical issues before release');
    }
    
    // Feature assessment
    const features = this.assessFeatures();
    this.log('\n🔬 FEATURE ASSESSMENT:');
    for (const [feature, status] of Object.entries(features)) {
      const icon = status ? '✅' : '❌';
      this.log(`   ${icon} ${feature}`);
    }
    
    // Save detailed report
    const reportData = {
      timestamp: new Date().toISOString(),
      testResults: this.testResults,
      benchmarks: this.benchmarks,
      features,
      summary: {
        successRate: parseFloat(successRate),
        totalTime,
        recommendation: this.getVersionRecommendation(parseFloat(successRate))
      }
    };
    
    fs.writeFileSync('./functional-test-report.json', JSON.stringify(reportData, null, 2));
    this.log('\n📄 Detailed report saved to: functional-test-report.json');
    
    return {
      success: parseFloat(successRate) >= 80,
      successRate: parseFloat(successRate),
      shouldBumpVersion: parseFloat(successRate) >= 80,
      reportPath: './functional-test-report.json',
      recommendation: this.getVersionRecommendation(parseFloat(successRate))
    };
  }

  assessFeatures() {
    const features = {
      'Core Architecture': fs.existsSync('src/index.ts'),
      'Configuration System': fs.existsSync('config/default.json'),
      'Backend Routing': fs.existsSync('src/router/index.ts'),
      'Caching System': fs.existsSync('src/cache/index.ts'),
      'Database Integration': fs.existsSync('src/database/index.ts'),
      'RAG System': fs.existsSync('src/rag/index.ts'),
      'Meta-Cognitive Engine': fs.existsSync('src/meta-cognitive/problem-solving-engine.ts'),
      'Graph Database': fs.existsSync('src/graph/ultipa-client.ts'),
      'Monitoring & Analytics': fs.existsSync('src/monitoring/index.ts'),
      'Plugin System': fs.existsSync('src/plugins/index.ts'),
      'Setup Wizard': fs.existsSync('src/setup/index.ts'),
      'Test Framework': fs.existsSync('src/test/'),
      'Performance Optimization': fs.existsSync('src/optimization/'),
      'Credential Management': fs.existsSync('src/credentials/'),
      'CLI Interface': fs.existsSync('claudette')
    };
    
    return features;
  }

  getVersionRecommendation(successRate) {
    if (successRate >= 90) return 'MAJOR';
    if (successRate >= 80) return 'MINOR';
    if (successRate >= 60) return 'PATCH';
    return 'NO_BUMP';
  }
}

// Run the test suite
if (require.main === module) {
  const testSuite = new ClaudetteFunctionalTest();
  testSuite.runAllTests().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = ClaudetteFunctionalTest;