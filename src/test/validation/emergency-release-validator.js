#!/usr/bin/env node

// Emergency release validator - Critical system validation for emergency releases
// Performs rapid but comprehensive validation for urgent deployments

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class EmergencyReleaseValidator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      platform: process.platform,
      nodeVersion: process.version,
      validationLevel: 'emergency',
      tests: [],
      criticalIssues: [],
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        critical: 0,
        blocker: false
      }
    };
    
    this.emergencyMode = process.argv.includes('--emergency');
    this.timeoutMs = this.emergencyMode ? 5000 : 10000;
  }

  async runValidation() {
    console.log('🚨 Starting Emergency Release Validation');
    console.log('========================================');
    
    if (this.emergencyMode) {
      console.log('🔥 EMERGENCY MODE: Fast validation only');
    }

    try {
      await this.validateCriticalComponents();
      await this.validateBuildArtifacts();
      await this.validateConfiguration();
      await this.validateStartupSequence();
      await this.validateSecurityBasics();
      
      if (!this.emergencyMode) {
        await this.validateBasicFunctionality();
      }
      
      this.generateSummary();
      this.saveResults();
      this.displayResults();
      
      return !this.results.summary.blocker && this.results.summary.critical === 0;
      
    } catch (error) {
      console.error('❌ Emergency validation failed:', error.message);
      return false;
    }
  }

  async validateCriticalComponents() {
    const testName = 'Critical Components Check';
    console.log(`\n🎯 ${testName}`);
    
    try {
      // Check essential files exist
      const criticalFiles = [
        'package.json',
        'claudette',
        'dist/index.js',
        'config/claudette.config.json'
      ];
      
      const missingFiles = [];
      for (const file of criticalFiles) {
        const filePath = path.join(process.cwd(), file);
        if (!fs.existsSync(filePath)) {
          missingFiles.push(file);
        }
      }
      
      if (missingFiles.length > 0) {
        this.addCriticalIssue('Missing critical files', missingFiles.join(', '));
        this.addTestResult(testName, `Missing files: ${missingFiles.join(', ')}`, false, true);
        return;
      }
      
      // Check executable permissions
      const execPath = path.join(process.cwd(), 'claudette');
      const stats = fs.statSync(execPath);
      const isExecutable = (stats.mode & parseInt('111', 8)) !== 0;
      
      if (!isExecutable) {
        this.addCriticalIssue('Executable permissions', 'claudette file not executable');
        this.addTestResult(testName, 'Not executable', false, true);
        return;
      }
      
      console.log('   ✅ All critical files present and executable');
      this.addTestResult(testName, 'All critical components validated', true);
      
    } catch (error) {
      this.addCriticalIssue('Component validation error', error.message);
      this.addTestResult(testName, error.message, false, true);
    }
  }

  async validateBuildArtifacts() {
    const testName = 'Build Artifacts Validation';
    console.log(`\n📦 ${testName}`);
    
    try {
      // Check dist directory
      const distPath = path.join(process.cwd(), 'dist');
      if (!fs.existsSync(distPath)) {
        this.addCriticalIssue('Missing build artifacts', 'dist directory not found');
        this.addTestResult(testName, 'Missing dist directory', false, true);
        return;
      }
      
      // Check key build files
      const buildFiles = [
        'dist/index.js',
        'dist/cli/index.js',
        'dist/core/router.js',
        'dist/setup/setup-wizard.js'
      ];
      
      const missingBuildFiles = [];
      for (const file of buildFiles) {
        if (!fs.existsSync(path.join(process.cwd(), file))) {
          missingBuildFiles.push(file);
        }
      }
      
      if (missingBuildFiles.length > 0) {
        this.addCriticalIssue('Incomplete build', missingBuildFiles.join(', '));
        this.addTestResult(testName, `Missing: ${missingBuildFiles.join(', ')}`, false, true);
        return;
      }
      
      // Quick syntax check on main files
      try {
        require(path.resolve('./dist/index.js'));
        console.log('   ✅ Main module loads without syntax errors');
      } catch (syntaxError) {
        this.addCriticalIssue('Build syntax error', syntaxError.message);
        this.addTestResult(testName, `Syntax error: ${syntaxError.message}`, false, true);
        return;
      }
      
      console.log('   ✅ Build artifacts validated');
      this.addTestResult(testName, 'Build artifacts complete and valid', true);
      
    } catch (error) {
      this.addCriticalIssue('Build validation error', error.message);
      this.addTestResult(testName, error.message, false, true);
    }
  }

  async validateConfiguration() {
    const testName = 'Configuration Validation';
    console.log(`\n⚙️ ${testName}`);
    
    try {
      // Check package.json
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      const requiredFields = ['name', 'version', 'main', 'bin'];
      const missingFields = requiredFields.filter(field => !packageJson[field]);
      
      if (missingFields.length > 0) {
        this.addCriticalIssue('Invalid package.json', `Missing: ${missingFields.join(', ')}`);
        this.addTestResult(testName, `Package.json missing: ${missingFields.join(', ')}`, false, true);
        return;
      }
      
      // Check config files
      const configPath = path.join(process.cwd(), 'config/claudette.config.json');
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        // Basic config validation
        if (!config.routing || !config.backends) {
          this.addCriticalIssue('Invalid config structure', 'Missing routing or backends configuration');
          this.addTestResult(testName, 'Invalid config structure', false, true);
          return;
        }
      } catch (configError) {
        this.addCriticalIssue('Config file error', configError.message);
        this.addTestResult(testName, `Config error: ${configError.message}`, false, true);
        return;
      }
      
      console.log('   ✅ Configuration files validated');
      this.addTestResult(testName, 'Configuration valid', true);
      
    } catch (error) {
      this.addCriticalIssue('Configuration validation error', error.message);
      this.addTestResult(testName, error.message, false, true);
    }
  }

  async validateStartupSequence() {
    const testName = 'Startup Sequence Validation';
    console.log(`\n🚀 ${testName}`);
    
    try {
      // Test basic help command (fastest startup test)
      const helpResult = await this.runCommandWithTimeout('./claudette --help', this.timeoutMs);
      
      if (!helpResult.includes('claudette') || !helpResult.includes('Usage')) {
        this.addCriticalIssue('Startup failure', 'Help command failed or incomplete');
        this.addTestResult(testName, 'Help command failed', false, true);
        return;
      }
      
      // Test version command
      const versionResult = await this.runCommandWithTimeout('./claudette --version', this.timeoutMs);
      
      if (!versionResult || versionResult.trim() === '') {
        this.addCriticalIssue('Version command failure', 'Version not displayed');
        this.addTestResult(testName, 'Version command failed', false, true);
        return;
      }
      
      console.log('   ✅ Basic startup sequence working');
      this.addTestResult(testName, 'Startup sequence validated', true);
      
    } catch (error) {
      this.addCriticalIssue('Startup sequence failure', error.message);
      this.addTestResult(testName, error.message, false, true);
    }
  }

  async validateSecurityBasics() {
    const testName = 'Security Basics Check';
    console.log(`\n🔒 ${testName}`);
    
    try {
      // Check for sensitive files that shouldn't be included
      const sensitiveFiles = ['.env', '.env.local', '.env.production', 'secrets.json'];
      const foundSensitiveFiles = [];
      
      for (const file of sensitiveFiles) {
        if (fs.existsSync(path.join(process.cwd(), file))) {
          foundSensitiveFiles.push(file);
        }
      }
      
      if (foundSensitiveFiles.length > 0) {
        this.addCriticalIssue('Security risk', `Sensitive files included: ${foundSensitiveFiles.join(', ')}`);
        this.addTestResult(testName, `Found sensitive files: ${foundSensitiveFiles.join(', ')}`, false, true);
        return;
      }
      
      // Check file permissions on executable
      const execPath = path.join(process.cwd(), 'claudette');
      const stats = fs.statSync(execPath);
      const mode = stats.mode & parseInt('777', 8);
      
      // Should not be world-writable
      if ((mode & parseInt('002', 8)) !== 0) {
        this.addCriticalIssue('Security permissions', 'Executable is world-writable');
        this.addTestResult(testName, 'Unsafe file permissions', false, true);
        return;
      }
      
      console.log('   ✅ Basic security checks passed');
      this.addTestResult(testName, 'Security basics validated', true);
      
    } catch (error) {
      this.addCriticalIssue('Security validation error', error.message);
      this.addTestResult(testName, error.message, false, true);
    }
  }

  async validateBasicFunctionality() {
    const testName = 'Basic Functionality Check';
    console.log(`\n⚡ ${testName}`);
    
    try {
      // Test status command (non-critical if it fails due to no setup)
      try {
        await this.runCommandWithTimeout('./claudette status', this.timeoutMs);
        console.log('   ✅ Status command executed');
      } catch (statusError) {
        console.log('   ⚠️  Status command issues (expected without setup)');
      }
      
      // Test config command (non-critical if it fails due to no setup) 
      try {
        await this.runCommandWithTimeout('./claudette config', this.timeoutMs);
        console.log('   ✅ Config command executed');
      } catch (configError) {
        console.log('   ⚠️  Config command issues (expected without setup)');
      }
      
      // Test invalid command handling
      try {
        await this.runCommandWithTimeout('./claudette invalid-command', this.timeoutMs);
        // Should have failed
        this.addTestResult(testName, 'Invalid command handling failed', false);
        return;
      } catch (error) {
        console.log('   ✅ Invalid commands properly rejected');
      }
      
      this.addTestResult(testName, 'Basic functionality validated', true);
      
    } catch (error) {
      this.addTestResult(testName, error.message, false);
    }
  }

  async runCommandWithTimeout(command, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Command timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      
      exec(command, (error, stdout, stderr) => {
        clearTimeout(timer);
        
        if (error) {
          error.stdout = stdout;
          error.stderr = stderr;
          reject(error);
        } else {
          resolve(stdout || stderr || '');
        }
      });
    });
  }

  addCriticalIssue(type, description) {
    this.results.criticalIssues.push({
      type,
      description,
      timestamp: new Date().toISOString()
    });
  }

  addTestResult(name, result, passed, critical = false) {
    this.results.tests.push({
      name,
      result,
      passed,
      critical,
      timestamp: new Date().toISOString()
    });
    
    const status = passed ? '✅' : (critical ? '🔴' : '❌');
    console.log(`   ${status} ${result}`);
    
    if (critical && !passed) {
      this.results.summary.blocker = true;
    }
  }

  generateSummary() {
    this.results.summary.totalTests = this.results.tests.length;
    this.results.summary.passed = this.results.tests.filter(t => t.passed).length;
    this.results.summary.failed = this.results.tests.filter(t => !t.passed).length;
    this.results.summary.critical = this.results.criticalIssues.length;
  }

  saveResults() {
    const outputDir = path.join(__dirname, '../../build-artifacts');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const resultsFile = path.join(outputDir, 'emergency-release-validation.json');
    fs.writeFileSync(resultsFile, JSON.stringify(this.results, null, 2));
  }

  displayResults() {
    console.log('\n🚨 Emergency Release Validation Results');
    console.log('========================================');
    
    const { totalTests, passed, failed, critical, blocker } = this.results.summary;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`🔴 Critical Issues: ${critical}`);
    
    const overallStatus = blocker ? '🚫 BLOCKED' : 
                         critical > 0 ? '🔴 CRITICAL ISSUES' :
                         failed === 0 ? '✅ SAFE TO RELEASE' : '⚠️ REVIEW NEEDED';
                         
    console.log(`\nRelease Status: ${overallStatus}`);
    
    if (critical > 0) {
      console.log('\n🔴 CRITICAL ISSUES FOUND:');
      this.results.criticalIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue.type}: ${issue.description}`);
      });
      console.log('\n⚠️  DO NOT RELEASE until critical issues are resolved!');
    }
    
    if (blocker) {
      console.log('\n🚫 RELEASE BLOCKED');
      console.log('   Critical system components failed validation.');
      console.log('   This release MUST NOT proceed to production.');
    } else if (critical === 0 && failed === 0) {
      console.log('\n✅ RELEASE APPROVED');
      console.log('   All emergency validation checks passed.');
      console.log('   Safe to proceed with release.');
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new EmergencyReleaseValidator();
  validator.runValidation()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Emergency validation error:', error);
      process.exit(1);
    });
}

module.exports = EmergencyReleaseValidator;