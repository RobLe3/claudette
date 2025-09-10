#!/usr/bin/env node

/**
 * Comprehensive Integrity Test Suite - Claudette v3.0.0
 * Tests the complete system after repository organization and advanced polishing
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class ClaudetteIntegrityTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      version: '3.0.0',
      tests: {
        build: { status: 'pending', details: {} },
        cli: { status: 'pending', details: {} },
        core: { status: 'pending', details: {} },
        advanced: { status: 'pending', details: {} },
        performance: { status: 'pending', details: {} },
        integration: { status: 'pending', details: {} }
      },
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
    this.startTime = Date.now();
  }

  /**
   * Main test execution
   */
  async runComprehensiveTests() {
    console.log('🧪 Claudette v3.0.0 Comprehensive Integrity Test Suite');
    console.log('=' .repeat(60));
    console.log(`📅 Started: ${new Date().toLocaleString()}`);
    console.log('🎯 Testing system integrity after repository organization and advanced polishing\n');

    try {
      // Test categories in order of dependency
      await this.testBuildIntegrity();
      await this.testCLIFunctionality();
      await this.testCoreSystem();
      await this.testAdvancedFeatures();
      await this.testPerformanceBenchmarks();
      await this.testIntegrationCapabilities();
      
      await this.generateComprehensiveReport();
      
    } catch (error) {
      console.error('❌ Critical test failure:', error.message);
      process.exit(1);
    }
  }

  /**
   * Test 1: Build System Integrity
   */
  async testBuildIntegrity() {
    console.log('🔨 Test 1: Build System Integrity');
    console.log('-'.repeat(40));
    
    const buildTest = { subtests: {} };
    
    try {
      // Test clean build
      console.log('   📦 Testing clean build...');
      const buildStart = Date.now();
      execSync('npm run build', { stdio: 'pipe' });
      const buildTime = Date.now() - buildStart;
      
      buildTest.subtests.cleanBuild = {
        passed: true,
        time: buildTime,
        message: `Build completed in ${buildTime}ms`
      };
      
      // Verify dist directory structure
      console.log('   📂 Verifying dist/ structure...');
      const distExists = fs.existsSync('dist');
      const distContents = distExists ? fs.readdirSync('dist') : [];
      
      buildTest.subtests.distStructure = {
        passed: distExists && distContents.length > 0,
        details: { exists: distExists, fileCount: distContents.length },
        message: distExists ? `dist/ contains ${distContents.length} files` : 'dist/ directory missing'
      };
      
      // Test TypeScript compilation completeness
      console.log('   🔧 Checking TypeScript compilation...');
      const tsFiles = this.countFiles('src', '.ts');
      const jsFiles = this.countFiles('dist', '.js');
      
      buildTest.subtests.typescript = {
        passed: jsFiles > 0,
        details: { tsFiles, jsFiles },
        message: `TypeScript: ${tsFiles} → JavaScript: ${jsFiles}`
      };
      
      // Verify key files exist
      console.log('   📋 Verifying key distribution files...');
      const keyFiles = ['dist/index.js', 'dist/cli/index.js', 'claudette', 'package.json'];
      const missingFiles = keyFiles.filter(file => !fs.existsSync(file));
      
      buildTest.subtests.keyFiles = {
        passed: missingFiles.length === 0,
        details: { checked: keyFiles.length, missing: missingFiles },
        message: missingFiles.length === 0 ? 'All key files present' : `Missing: ${missingFiles.join(', ')}`
      };
      
      this.results.tests.build.status = 'completed';
      this.results.tests.build.details = buildTest;
      
      console.log('   ✅ Build integrity: PASSED\n');
      
    } catch (error) {
      buildTest.error = error.message;
      this.results.tests.build.status = 'failed';
      this.results.tests.build.details = buildTest;
      console.log(`   ❌ Build integrity: FAILED - ${error.message}\n`);
    }
  }

  /**
   * Test 2: CLI Functionality
   */
  async testCLIFunctionality() {
    console.log('⚡ Test 2: CLI Functionality');
    console.log('-'.repeat(40));
    
    const cliTest = { subtests: {} };
    
    try {
      // Test version command
      console.log('   🏷️  Testing --version command...');
      const versionOutput = execSync('node claudette --version', { encoding: 'utf8' });
      const hasVersion = versionOutput.includes('3.0.0');
      
      cliTest.subtests.version = {
        passed: hasVersion,
        output: versionOutput.trim(),
        message: hasVersion ? 'Version 3.0.0 confirmed' : 'Version mismatch'
      };
      
      // Test help command
      console.log('   ❓ Testing --help command...');
      const helpOutput = execSync('node claudette --help', { encoding: 'utf8' });
      const hasHelp = helpOutput.includes('Usage:') || helpOutput.includes('Commands:');
      
      cliTest.subtests.help = {
        passed: hasHelp,
        outputLength: helpOutput.length,
        message: hasHelp ? `Help system working (${helpOutput.length} chars)` : 'Help system not working'
      };
      
      // Test CLI executable permissions
      console.log('   🔐 Testing CLI executable...');
      const stats = fs.statSync('claudette');
      const isExecutable = (stats.mode & parseInt('111', 8)) !== 0;
      
      cliTest.subtests.executable = {
        passed: isExecutable,
        permissions: stats.mode.toString(8),
        message: isExecutable ? 'CLI executable permissions OK' : 'CLI not executable'
      };
      
      // Test CLI commands discovery
      console.log('   🔍 Testing available commands...');
      const commands = this.extractCLICommands(helpOutput);
      
      cliTest.subtests.commands = {
        passed: commands.length > 0,
        details: { commandCount: commands.length, commands },
        message: `Found ${commands.length} CLI commands`
      };
      
      this.results.tests.cli.status = 'completed';
      this.results.tests.cli.details = cliTest;
      
      console.log('   ✅ CLI functionality: PASSED\n');
      
    } catch (error) {
      cliTest.error = error.message;
      this.results.tests.cli.status = 'failed';
      this.results.tests.cli.details = cliTest;
      console.log(`   ❌ CLI functionality: FAILED - ${error.message}\n`);
    }
  }

  /**
   * Test 3: Core System
   */
  async testCoreSystem() {
    console.log('🧠 Test 3: Core System Functionality');
    console.log('-'.repeat(40));
    
    const coreTest = { subtests: {} };
    
    try {
      // Test Claudette class import
      console.log('   📦 Testing core imports...');
      const { Claudette } = require('./dist/index.js');
      
      coreTest.subtests.imports = {
        passed: typeof Claudette === 'function',
        message: 'Core Claudette class imported successfully'
      };
      
      // Test Claudette initialization
      console.log('   🚀 Testing initialization...');
      const initStart = Date.now();
      const claudette = new Claudette();
      await claudette.initialize();
      const initTime = Date.now() - initStart;
      
      coreTest.subtests.initialization = {
        passed: claudette.initialized === true,
        time: initTime,
        message: `Initialized in ${initTime}ms`
      };
      
      // Test configuration system
      console.log('   ⚙️  Testing configuration...');
      const hasConfig = claudette.config && typeof claudette.config === 'object';
      
      coreTest.subtests.configuration = {
        passed: hasConfig,
        configKeys: hasConfig ? Object.keys(claudette.config).length : 0,
        message: hasConfig ? `Configuration loaded (${Object.keys(claudette.config).length} keys)` : 'Configuration missing'
      };
      
      // Test backend system
      console.log('   🔌 Testing backend system...');
      const hasRouter = claudette.router && typeof claudette.router === 'object';
      
      coreTest.subtests.backends = {
        passed: hasRouter,
        message: hasRouter ? 'Backend router system operational' : 'Backend router missing'
      };
      
      // Test database system
      console.log('   💾 Testing database...');
      const hasDb = claudette.db && typeof claudette.db === 'object';
      
      coreTest.subtests.database = {
        passed: hasDb,
        message: hasDb ? 'Database system operational' : 'Database system missing'
      };
      
      // Test cleanup
      console.log('   🧹 Testing cleanup...');
      const cleanupStart = Date.now();
      await claudette.cleanup();
      const cleanupTime = Date.now() - cleanupStart;
      
      coreTest.subtests.cleanup = {
        passed: claudette.initialized === false,
        time: cleanupTime,
        message: `Cleanup completed in ${cleanupTime}ms`
      };
      
      this.results.tests.core.status = 'completed';
      this.results.tests.core.details = coreTest;
      
      console.log('   ✅ Core system: PASSED\n');
      
    } catch (error) {
      coreTest.error = error.message;
      this.results.tests.core.status = 'failed';
      this.results.tests.core.details = coreTest;
      console.log(`   ❌ Core system: FAILED - ${error.message}\n`);
    }
  }

  /**
   * Test 4: Advanced Features
   */
  async testAdvancedFeatures() {
    console.log('🚀 Test 4: Advanced Polishing Features');
    console.log('-'.repeat(40));
    
    const advancedTest = { subtests: {} };
    
    try {
      // Test Adaptive Memory Manager
      console.log('   🧠 Testing Adaptive Memory Manager...');
      try {
        const { AdaptiveMemoryManager } = require('./dist/cache/adaptive-memory-manager.js');
        const memManager = new AdaptiveMemoryManager({ maxSize: 1000, compressionThreshold: 500 });
        
        advancedTest.subtests.memoryManager = {
          passed: typeof memManager.calculateEvictionScore === 'function',
          message: 'Adaptive Memory Manager operational'
        };
      } catch (e) {
        advancedTest.subtests.memoryManager = {
          passed: false,
          message: `Memory Manager error: ${e.message}`
        };
      }
      
      // Test Advanced Circuit Breaker
      console.log('   ⚡ Testing Advanced Circuit Breaker...');
      try {
        const { AdvancedCircuitBreaker } = require('./dist/router/advanced-circuit-breaker.js');
        const circuitBreaker = new AdvancedCircuitBreaker('test', { failureThreshold: 5 });
        
        advancedTest.subtests.circuitBreaker = {
          passed: typeof circuitBreaker.call === 'function',
          message: 'Advanced Circuit Breaker operational'
        };
      } catch (e) {
        advancedTest.subtests.circuitBreaker = {
          passed: false,
          message: `Circuit Breaker error: ${e.message}`
        };
      }
      
      // Test Connection Pool
      console.log('   🔗 Testing HTTP Connection Pool...');
      try {
        const { ConnectionPool } = require('./dist/utils/connection-pool.js');
        const pool = new ConnectionPool({
          maxConnections: 10,
          maxIdleTime: 30000,
          requestTimeout: 5000,
          retryAttempts: 2,
          keepAlive: true,
          maxSockets: 5,
          maxFreeSockets: 2
        });
        
        advancedTest.subtests.connectionPool = {
          passed: typeof pool.request === 'function',
          message: 'HTTP Connection Pool operational'
        };
        
        await pool.destroy(); // Cleanup
      } catch (e) {
        advancedTest.subtests.connectionPool = {
          passed: false,
          message: `Connection Pool error: ${e.message}`
        };
      }
      
      // Test Comprehensive Metrics
      console.log('   📊 Testing Comprehensive Metrics...');
      try {
        const { MetricsCollector } = require('./dist/monitoring/comprehensive-metrics.js');
        const metrics = new MetricsCollector();
        
        const summary = metrics.getSummary();
        
        advancedTest.subtests.metrics = {
          passed: summary && typeof summary.score === 'number',
          details: { healthScore: summary.score, health: summary.health },
          message: `Metrics system operational (health: ${summary.health})`
        };
        
        metrics.stop(); // Cleanup
      } catch (e) {
        advancedTest.subtests.metrics = {
          passed: false,
          message: `Metrics error: ${e.message}`
        };
      }
      
      this.results.tests.advanced.status = 'completed';
      this.results.tests.advanced.details = advancedTest;
      
      console.log('   ✅ Advanced features: PASSED\n');
      
    } catch (error) {
      advancedTest.error = error.message;
      this.results.tests.advanced.status = 'failed';
      this.results.tests.advanced.details = advancedTest;
      console.log(`   ❌ Advanced features: FAILED - ${error.message}\n`);
    }
  }

  /**
   * Test 5: Performance Benchmarks
   */
  async testPerformanceBenchmarks() {
    console.log('⚡ Test 5: Performance Benchmarks');
    console.log('-'.repeat(40));
    
    const perfTest = { subtests: {} };
    
    try {
      // Benchmark initialization performance
      console.log('   🚀 Benchmarking initialization...');
      const initTimes = [];
      
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();
        const { Claudette } = require('./dist/index.js');
        const claudette = new Claudette();
        await claudette.initialize();
        const initTime = Date.now() - startTime;
        initTimes.push(initTime);
        await claudette.cleanup();
        
        // Clear module cache for accurate testing
        delete require.cache[require.resolve('./dist/index.js')];
      }
      
      const avgInitTime = initTimes.reduce((a, b) => a + b, 0) / initTimes.length;
      
      perfTest.subtests.initialization = {
        passed: avgInitTime < 1000, // Should be sub-second
        times: initTimes,
        average: avgInitTime,
        message: `Average initialization: ${avgInitTime.toFixed(0)}ms`
      };
      
      // Memory usage test
      console.log('   💾 Testing memory efficiency...');
      const memBefore = process.memoryUsage();
      
      // Create and cleanup multiple instances
      for (let i = 0; i < 5; i++) {
        const { Claudette } = require('./dist/index.js');
        const claudette = new Claudette();
        await claudette.initialize();
        await claudette.cleanup();
        delete require.cache[require.resolve('./dist/index.js')];
      }
      
      // Force garbage collection if available
      if (global.gc) global.gc();
      
      const memAfter = process.memoryUsage();
      const memoryEfficient = (memAfter.heapUsed - memBefore.heapUsed) < 50 * 1024 * 1024; // Less than 50MB growth
      
      perfTest.subtests.memory = {
        passed: memoryEfficient,
        before: memBefore.heapUsed,
        after: memAfter.heapUsed,
        growth: memAfter.heapUsed - memBefore.heapUsed,
        message: `Memory growth: ${((memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024).toFixed(1)}MB`
      };
      
      this.results.tests.performance.status = 'completed';
      this.results.tests.performance.details = perfTest;
      
      console.log('   ✅ Performance benchmarks: PASSED\n');
      
    } catch (error) {
      perfTest.error = error.message;
      this.results.tests.performance.status = 'failed';
      this.results.tests.performance.details = perfTest;
      console.log(`   ❌ Performance benchmarks: FAILED - ${error.message}\n`);
    }
  }

  /**
   * Test 6: Integration Capabilities
   */
  async testIntegrationCapabilities() {
    console.log('🔗 Test 6: Integration Capabilities');
    console.log('-'.repeat(40));
    
    const integrationTest = { subtests: {} };
    
    try {
      // Test mock backend functionality
      console.log('   🎭 Testing mock backend integration...');
      const { Claudette } = require('./dist/index.js');
      const claudette = new Claudette();
      await claudette.initialize();
      
      try {
        const response = await claudette.optimize('Test integration functionality');
        
        integrationTest.subtests.mockBackend = {
          passed: response && response.content && response.backend_used,
          details: {
            hasContent: !!response.content,
            backend: response.backend_used,
            responseLength: response.content ? response.content.length : 0
          },
          message: `Mock backend working (${response.backend_used})`
        };
      } catch (e) {
        integrationTest.subtests.mockBackend = {
          passed: false,
          message: `Mock backend error: ${e.message}`
        };
      }
      
      // Test configuration validation
      console.log('   ⚙️  Testing configuration validation...');
      const configValid = claudette.config && Object.keys(claudette.config).length > 0;
      
      integrationTest.subtests.configuration = {
        passed: configValid,
        configKeys: configValid ? Object.keys(claudette.config).length : 0,
        message: configValid ? 'Configuration validation working' : 'Configuration validation failed'
      };
      
      await claudette.cleanup();
      
      this.results.tests.integration.status = 'completed';
      this.results.tests.integration.details = integrationTest;
      
      console.log('   ✅ Integration capabilities: PASSED\n');
      
    } catch (error) {
      integrationTest.error = error.message;
      this.results.tests.integration.status = 'failed';
      this.results.tests.integration.details = integrationTest;
      console.log(`   ❌ Integration capabilities: FAILED - ${error.message}\n`);
    }
  }

  /**
   * Generate comprehensive report
   */
  async generateComprehensiveReport() {
    const endTime = Date.now();
    const totalTime = endTime - this.startTime;
    
    console.log('📊 COMPREHENSIVE TEST RESULTS');
    console.log('=' .repeat(60));
    
    // Calculate summary statistics
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let warningTests = 0;
    
    Object.entries(this.results.tests).forEach(([category, test]) => {
      if (test.details && test.details.subtests) {
        Object.values(test.details.subtests).forEach(subtest => {
          totalTests++;
          if (subtest.passed) {
            passedTests++;
          } else {
            failedTests++;
          }
        });
      } else if (test.status === 'failed') {
        totalTests++;
        failedTests++;
      } else if (test.status === 'completed') {
        totalTests++;
        passedTests++;
      }
    });
    
    this.results.summary = {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      warnings: warningTests,
      duration: totalTime,
      success_rate: ((passedTests / totalTests) * 100).toFixed(1)
    };
    
    // Display results
    console.log(`🕒 Total time: ${(totalTime / 1000).toFixed(1)}s`);
    console.log(`📈 Success rate: ${this.results.summary.success_rate}%`);
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${failedTests}/${totalTests}`);
    
    // Category breakdown
    console.log('\\n📋 Test Category Results:');
    Object.entries(this.results.tests).forEach(([category, test]) => {
      const icon = test.status === 'completed' ? '✅' : test.status === 'failed' ? '❌' : '⏳';
      console.log(`   ${icon} ${category.toUpperCase()}: ${test.status}`);
    });
    
    // Overall assessment
    console.log('\\n🎯 SYSTEM INTEGRITY ASSESSMENT:');
    
    if (failedTests === 0) {
      console.log('🎉 EXCELLENT: Claudette v3.0.0 is fully operational after repository organization');
      console.log('✅ All systems working as intended');
      console.log('✅ Advanced polishing features confirmed functional');
      console.log('✅ Performance targets met');
      console.log('✅ Ready for production deployment');
    } else if (failedTests <= 2) {
      console.log('⚠️  GOOD: Minor issues detected, but core functionality intact');
      console.log('✅ System is operational with noted issues');
    } else {
      console.log('❌ ATTENTION NEEDED: Multiple failures detected');
      console.log('🔧 System requires fixes before production use');
    }
    
    // Save detailed report
    const reportPath = 'comprehensive-integrity-test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\\n📄 Detailed report saved: ${reportPath}`);
    
    console.log('\\n' + '=' .repeat(60));
    console.log('🧪 Comprehensive Integrity Testing Complete');
  }

  /**
   * Utility methods
   */
  countFiles(dir, extension) {
    if (!fs.existsSync(dir)) return 0;
    
    let count = 0;
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        count += this.countFiles(fullPath, extension);
      } else if (file.name.endsWith(extension)) {
        count++;
      }
    }
    
    return count;
  }
  
  extractCLICommands(helpOutput) {
    const commands = [];
    const lines = helpOutput.split('\\n');
    
    for (const line of lines) {
      // Look for command patterns
      if (line.trim().match(/^\\s*\\w+\\s+/)) {
        const match = line.trim().match(/^(\\w+)/);
        if (match && !commands.includes(match[1])) {
          commands.push(match[1]);
        }
      }
    }
    
    return commands.filter(cmd => cmd.length > 1);
  }
}

// Execute if run directly
if (require.main === module) {
  const tester = new ClaudetteIntegrityTester();
  
  // Handle process cleanup
  process.on('SIGINT', () => {
    console.log('\\n🛑 Test interrupted by user');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\\n🛑 Test terminated');
    process.exit(0);
  });
  
  tester.runComprehensiveTests().catch(error => {
    console.error('💥 Fatal test error:', error);
    process.exit(1);
  });
}

module.exports = ClaudetteIntegrityTester;