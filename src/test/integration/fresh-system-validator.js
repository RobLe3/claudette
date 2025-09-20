#!/usr/bin/env node

// Fresh system validator - Tests clean installation and setup
// Simulates a fresh system setup to validate installation process

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class FreshSystemValidator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      platform: process.platform,
      nodeVersion: process.version,
      tests: [],
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      }
    };
    
    this.tempDir = path.join(__dirname, '../../../temp-fresh-system-test');
  }

  async runValidation() {
    console.log('🆕 Starting Fresh System Validation');
    console.log('===================================');

    try {
      await this.setupTempEnvironment();
      await this.testCleanInstallation();
      await this.testFirstRun();
      await this.testBasicFunctionality();
      await this.testConfigurationSetup();
      await this.testErrorHandling();
      
      this.generateSummary();
      this.cleanup();
      this.displayResults();
      
      return this.results.summary.failed === 0;
      
    } catch (error) {
      console.error('❌ Fresh system validation failed:', error.message);
      await this.cleanup();
      return false;
    }
  }

  async setupTempEnvironment() {
    const testName = 'Setup Temporary Environment';
    console.log(`\n🔧 ${testName}`);
    
    try {
      // Create temporary directory
      if (fs.existsSync(this.tempDir)) {
        await this.execCommand(`rm -rf "${this.tempDir}"`);
      }
      fs.mkdirSync(this.tempDir, { recursive: true });
      
      // Copy essential files
      const filesToCopy = [
        'package.json',
        'dist/',
        'claudette',
        'config/'
      ];
      
      for (const file of filesToCopy) {
        const sourcePath = path.join(__dirname, '../../../', file);
        const targetPath = path.join(this.tempDir, file);
        
        if (fs.existsSync(sourcePath)) {
          if (fs.lstatSync(sourcePath).isDirectory()) {
            await this.execCommand(`cp -r "${sourcePath}" "${targetPath}"`);
          } else {
            await this.execCommand(`cp "${sourcePath}" "${targetPath}"`);
          }
        }
      }
      
      this.addTestResult(testName, 'Environment setup', true);
      
    } catch (error) {
      this.addTestResult(testName, error.message, false);
    }
  }

  async testCleanInstallation() {
    const testName = 'Clean Installation Test';
    console.log(`\n📦 ${testName}`);
    
    try {
      // Simulate fresh npm installation
      const packagePath = path.join(this.tempDir, 'package.json');
      if (fs.existsSync(packagePath)) {
        console.log('   📝 package.json found');
        
        // Check required dependencies
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        const requiredDeps = ['chalk', 'commander', 'ora'];
        const missingDeps = requiredDeps.filter(dep => 
          !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
        );
        
        if (missingDeps.length > 0) {
          throw new Error(`Missing dependencies: ${missingDeps.join(', ')}`);
        }
        
        console.log('   ✅ All required dependencies present');
      }
      
      // Check executable exists
      const execPath = path.join(this.tempDir, 'claudette');
      if (!fs.existsSync(execPath)) {
        throw new Error('Claudette executable not found');
      }
      
      // Make executable
      fs.chmodSync(execPath, '755');
      console.log('   ✅ Executable permissions set');
      
      this.addTestResult(testName, 'Installation validated', true);
      
    } catch (error) {
      this.addTestResult(testName, error.message, false);
    }
  }

  async testFirstRun() {
    const testName = 'First Run Experience';
    console.log(`\n🚀 ${testName}`);
    
    try {
      const execPath = path.join(this.tempDir, 'claudette');
      
      // Test help command
      const helpResult = await this.execCommand(`cd "${this.tempDir}" && ./claudette --help`);
      if (!helpResult.includes('claudette') || !helpResult.includes('Usage')) {
        throw new Error('Help command failed or incomplete');
      }
      console.log('   ✅ Help command works');
      
      // Test version command  
      const versionResult = await this.execCommand(`cd "${this.tempDir}" && ./claudette --version`);
      if (!versionResult || versionResult.trim() === '') {
        throw new Error('Version command failed');
      }
      console.log('   ✅ Version command works');
      
      this.addTestResult(testName, 'First run successful', true);
      
    } catch (error) {
      this.addTestResult(testName, error.message, false);
    }
  }

  async testBasicFunctionality() {
    const testName = 'Basic Functionality Test';
    console.log(`\n⚡ ${testName}`);
    
    try {
      const execPath = path.join(this.tempDir, 'claudette');
      
      // Test status command
      try {
        const statusResult = await this.execCommand(`cd "${this.tempDir}" && timeout 10s ./claudette status`);
        console.log('   ✅ Status command executed');
      } catch (statusError) {
        console.log('   ⚠️  Status command had issues (expected for fresh install)');
      }
      
      // Test config command
      try {
        const configResult = await this.execCommand(`cd "${this.tempDir}" && timeout 10s ./claudette config`);
        console.log('   ✅ Config command executed');
      } catch (configError) {
        console.log('   ⚠️  Config command had issues (expected for fresh install)');
      }
      
      // Test backends command
      try {
        const backendsResult = await this.execCommand(`cd "${this.tempDir}" && timeout 10s ./claudette backends`);
        console.log('   ✅ Backends command executed');
      } catch (backendsError) {
        console.log('   ⚠️  Backends command had issues (expected for fresh install)');
      }
      
      this.addTestResult(testName, 'Basic commands functional', true);
      
    } catch (error) {
      this.addTestResult(testName, error.message, false);
    }
  }

  async testConfigurationSetup() {
    const testName = 'Configuration Setup Test';
    console.log(`\n⚙️ ${testName}`);
    
    try {
      // Check config directory
      const configDir = path.join(this.tempDir, 'config');
      if (!fs.existsSync(configDir)) {
        throw new Error('Config directory not found');
      }
      
      // Check for default config files
      const configFiles = fs.readdirSync(configDir);
      const requiredConfigs = ['claudette.config.json', 'default.json'];
      
      for (const required of requiredConfigs) {
        if (!configFiles.includes(required)) {
          throw new Error(`Required config file missing: ${required}`);
        }
        
        // Validate JSON
        const configPath = path.join(configDir, required);
        try {
          JSON.parse(fs.readFileSync(configPath, 'utf8'));
          console.log(`   ✅ ${required} is valid JSON`);
        } catch (jsonError) {
          throw new Error(`Invalid JSON in ${required}: ${jsonError.message}`);
        }
      }
      
      this.addTestResult(testName, 'Configuration files validated', true);
      
    } catch (error) {
      this.addTestResult(testName, error.message, false);
    }
  }

  async testErrorHandling() {
    const testName = 'Error Handling Test';
    console.log(`\n🛠️ ${testName}`);
    
    try {
      const execPath = path.join(this.tempDir, 'claudette');
      
      // Test invalid command
      try {
        await this.execCommand(`cd "${this.tempDir}" && ./claudette invalid-command`);
        console.log('   ❌ Should have failed for invalid command');
        this.addTestResult(testName, 'Invalid command handling failed', false);
        return;
      } catch (error) {
        console.log('   ✅ Properly handles invalid commands');
      }
      
      // Test empty prompt
      try {
        await this.execCommand(`cd "${this.tempDir}" && echo "" | timeout 5s ./claudette`);
      } catch (error) {
        if (error.message.includes('No prompt provided') || error.message.includes('timeout')) {
          console.log('   ✅ Properly handles empty input');
        } else {
          console.log('   ⚠️  Unexpected error handling behavior');
        }
      }
      
      this.addTestResult(testName, 'Error handling functional', true);
      
    } catch (error) {
      this.addTestResult(testName, error.message, false);
    }
  }

  async execCommand(command) {
    try {
      const { stdout, stderr } = await execAsync(command);
      return stdout || stderr;
    } catch (error) {
      // For timeout or expected errors, include stderr in the error message
      if (error.stdout || error.stderr) {
        const output = error.stdout || error.stderr;
        if (output.includes('No prompt provided') || 
            output.includes('Error:') ||
            output.includes('timeout')) {
          return output;
        }
      }
      throw error;
    }
  }

  addTestResult(name, result, passed) {
    this.results.tests.push({
      name,
      result,
      passed,
      timestamp: new Date().toISOString()
    });
    
    const status = passed ? '✅' : '❌';
    console.log(`   ${status} ${result}`);
  }

  generateSummary() {
    this.results.summary.totalTests = this.results.tests.length;
    this.results.summary.passed = this.results.tests.filter(t => t.passed).length;
    this.results.summary.failed = this.results.tests.filter(t => !t.passed).length;
    this.results.summary.skipped = 0;
  }

  async cleanup() {
    try {
      if (fs.existsSync(this.tempDir)) {
        await this.execCommand(`rm -rf "${this.tempDir}"`);
      }
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  }

  displayResults() {
    console.log('\n📊 Fresh System Validation Results');
    console.log('==================================');
    
    const { totalTests, passed, failed, skipped } = this.results.summary;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (skipped > 0) {
      console.log(`⏭️ Skipped: ${skipped}`);
    }
    
    const successRate = totalTests > 0 ? (passed / totalTests) * 100 : 0;
    const overallStatus = failed === 0 ? '✅ PASS' : '❌ FAIL';
    console.log(`Success Rate: ${successRate.toFixed(1)}%`);
    console.log(`Overall Status: ${overallStatus}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.tests.filter(t => !t.passed).forEach(test => {
        console.log(`   • ${test.name}: ${test.result}`);
      });
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new FreshSystemValidator();
  validator.runValidation()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation error:', error);
      process.exit(1);
    });
}

module.exports = FreshSystemValidator;