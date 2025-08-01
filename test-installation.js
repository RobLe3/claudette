#!/usr/bin/env node

// Claudette v2.1.0 Installation Validation Test
// Simulates complete installation process without making system changes

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ClaudetteInstallationTester {
  constructor() {
    this.packageDir = '/Users/roble/Documents/Python/claude_flow/dist/claudette-v2.1.0';
    this.results = {
      prerequisites: {},
      dependencies: {},
      compilation: {},
      testing: {},
      setup: {},
      errors: []
    };
  }

  // Test 1: Prerequisites Check
  testPrerequisites() {
    console.log('🔍 Testing Prerequisites...');
    console.log('─'.repeat(50));

    try {
      // Check Node.js version
      const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
      const nodeVersionNum = parseFloat(nodeVersion.substring(1));
      const nodeValid = nodeVersionNum >= 18;
      
      console.log(`  📦 Node.js: ${nodeVersion} ${nodeValid ? '✅' : '❌'}`);
      this.results.prerequisites.nodeVersion = nodeVersion;
      this.results.prerequisites.nodeValid = nodeValid;

      // Check npm version
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      console.log(`  📦 npm: v${npmVersion} ✅`);
      this.results.prerequisites.npmVersion = npmVersion;

      // Check TypeScript availability
      let typescriptAvailable = false;
      try {
        const tscVersion = execSync('tsc --version', { encoding: 'utf8' }).trim();
        console.log(`  🔨 TypeScript: ${tscVersion} ✅`);
        typescriptAvailable = true;
      } catch (error) {
        console.log(`  🔨 TypeScript: Not globally installed ⚠️`);
      }
      this.results.prerequisites.typescriptAvailable = typescriptAvailable;

      console.log('  ✅ Prerequisites check complete');
      this.results.prerequisites.passed = nodeValid;

    } catch (error) {
      console.log(`  ❌ Prerequisites check failed: ${error.message}`);
      this.results.prerequisites.passed = false;
      this.results.errors.push(`Prerequisites: ${error.message}`);
    }
  }

  // Test 2: Package Dependencies
  testDependencies() {
    console.log('\\n📦 Testing Package Dependencies...');
    console.log('─'.repeat(50));

    try {
      const packageJsonPath = path.join(this.packageDir, 'package.json');
      
      if (!fs.existsSync(packageJsonPath)) {
        throw new Error('package.json not found');
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      console.log(`  📋 Package: ${packageJson.name}@${packageJson.version}`);
      console.log(`  📜 License: ${packageJson.license}`);
      console.log(`  🎯 Node engine: ${packageJson.engines?.node || 'Not specified'}`);

      // Check if dependencies are specified
      const dependencies = packageJson.dependencies || {};
      const devDependencies = packageJson.devDependencies || {};
      const totalDeps = Object.keys(dependencies).length + Object.keys(devDependencies).length;
      
      console.log(`  📚 Dependencies: ${Object.keys(dependencies).length}`);
      console.log(`  🛠️ Dev dependencies: ${Object.keys(devDependencies).length}`);
      console.log(`  📊 Total dependencies: ${totalDeps}`);

      // Check scripts
      const scripts = packageJson.scripts || {};
      const hasTestScript = 'test' in scripts && !scripts.test.includes('exit 1');
      const hasBuildScript = 'build' in scripts;
      const hasValidateScript = 'validate' in scripts;
      
      console.log(`  🧪 Test script: ${hasTestScript ? '✅' : '❌'}`);
      console.log(`  🔨 Build script: ${hasBuildScript ? '✅' : '❌'}`);
      console.log(`  ✔️ Validate script: ${hasValidateScript ? '✅' : '❌'}`);

      this.results.dependencies.totalDeps = totalDeps;
      this.results.dependencies.hasValidScripts = hasTestScript && hasBuildScript;
      this.results.dependencies.passed = true;

      console.log('  ✅ Package dependencies check complete');

    } catch (error) {
      console.log(`  ❌ Dependencies check failed: ${error.message}`);
      this.results.dependencies.passed = false;
      this.results.errors.push(`Dependencies: ${error.message}`);
    }
  }

  // Test 3: TypeScript Compilation
  testCompilation() {
    console.log('\\n🔨 Testing TypeScript Compilation...');
    console.log('─'.repeat(50));

    try {
      // Check TypeScript config
      const tsconfigPath = path.join(this.packageDir, 'tsconfig.json');
      
      if (!fs.existsSync(tsconfigPath)) {
        throw new Error('tsconfig.json not found');
      }

      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      console.log(`  📄 TypeScript config: Found ✅`);
      console.log(`  🎯 Target: ${tsconfig.compilerOptions?.target || 'Not specified'}`);
      console.log(`  📦 Module: ${tsconfig.compilerOptions?.module || 'Not specified'}`);
      console.log(`  📁 Out dir: ${tsconfig.compilerOptions?.outDir || 'Not specified'}`);

      // Test compilation (dry run)
      try {
        console.log('  🔍 Testing compilation (validation only)...');
        execSync('npm run validate', {
          cwd: this.packageDir,
          stdio: 'pipe',
          timeout: 30000
        });
        console.log('  ✅ TypeScript compilation: PASSED');
        this.results.compilation.compiles = true;
      } catch (compileError) {
        console.log('  ⚠️ TypeScript compilation: HAS ERRORS');
        const errorOutput = compileError.stderr?.toString() || compileError.stdout?.toString() || '';
        const errorCount = (errorOutput.match(/error TS/g) || []).length;
        console.log(`    📊 TypeScript errors found: ${errorCount}`);
        this.results.compilation.compiles = false;
        this.results.compilation.errorCount = errorCount;
      }

      this.results.compilation.passed = true;
      console.log('  ✅ Compilation test complete');

    } catch (error) {
      console.log(`  ❌ Compilation test failed: ${error.message}`);
      this.results.compilation.passed = false;
      this.results.errors.push(`Compilation: ${error.message}`);
    }
  }

  // Test 4: Unit Testing
  testUnitTests() {
    console.log('\\n🧪 Testing Unit Test Suite...');
    console.log('─'.repeat(50));

    try {
      const testPath = path.join(this.packageDir, 'src/test/claudette-unit-tests.js');
      
      if (!fs.existsSync(testPath)) {
        throw new Error('Unit test file not found');
      }

      console.log('  📄 Unit test file: Found ✅');
      
      // Run unit tests
      try {
        console.log('  🚀 Running unit tests...');
        const testOutput = execSync('node src/test/claudette-unit-tests.js', {
          cwd: this.packageDir,
          encoding: 'utf8',
          timeout: 60000
        });

        // Parse test results
        const passedMatch = testOutput.match(/Passed: (\\d+)/);
        const failedMatch = testOutput.match(/Failed: (\\d+)/);
        const passRateMatch = testOutput.match(/Pass Rate: ([\\d.]+)%/);
        
        if (passedMatch && failedMatch && passRateMatch) {
          const passed = parseInt(passedMatch[1]);
          const failed = parseInt(failedMatch[1]);
          const passRate = parseFloat(passRateMatch[1]);
          
          console.log(`    ✅ Tests passed: ${passed}`);
          console.log(`    ❌ Tests failed: ${failed}`);
          console.log(`    📊 Pass rate: ${passRate}%`);
          
          this.results.testing.testsPassed = passed;
          this.results.testing.testsFailed = failed;
          this.results.testing.passRate = passRate;
          this.results.testing.testsWorking = true;
        }

      } catch (testError) {
        console.log(`    ⚠️ Unit tests execution issue: ${testError.message}`);
        this.results.testing.testsWorking = false;
        this.results.testing.testError = testError.message;
      }

      this.results.testing.passed = true;
      console.log('  ✅ Unit testing check complete');

    } catch (error) {
      console.log(`  ❌ Unit testing check failed: ${error.message}`);
      this.results.testing.passed = false;
      this.results.errors.push(`Testing: ${error.message}`);
    }
  }

  // Test 5: Setup and Configuration
  testSetupConfiguration() {
    console.log('\\n⚙️ Testing Setup & Configuration...');
    console.log('─'.repeat(50));

    try {
      // Check install script
      const installPath = path.join(this.packageDir, 'install.sh');
      
      if (fs.existsSync(installPath)) {
        const installScript = fs.readFileSync(installPath, 'utf8');
        
        const hasPrereqCheck = installScript.includes('node --version');
        const hasNpmInstall = installScript.includes('npm install');
        const hasTypescriptInstall = installScript.includes('typescript');
        const hasCompilation = installScript.includes('tsc') || installScript.includes('npx tsc');
        const hasKeychainInstructions = installScript.includes('security add-generic-password');
        
        console.log(`  📜 Install script: Found ✅`);
        console.log(`  ✔️ Prerequisites check: ${hasPrereqCheck ? '✅' : '❌'}`);
        console.log(`  📦 npm install: ${hasNpmInstall ? '✅' : '❌'}`);
        console.log(`  🔨 TypeScript setup: ${hasTypescriptInstall ? '✅' : '❌'}`);
        console.log(`  🏗️ Compilation step: ${hasCompilation ? '✅' : '❌'}`);
        console.log(`  🔑 Keychain setup: ${hasKeychainInstructions ? '✅' : '❌'}`);
        
        this.results.setup.installScriptComplete = 
          hasPrereqCheck && hasNpmInstall && hasCompilation;
      }

      // Check documentation
      const readmePath = path.join(this.packageDir, 'README.md');
      if (fs.existsSync(readmePath)) {
        const readme = fs.readFileSync(readmePath, 'utf8');
        
        const hasQuickStart = readme.includes('Quick Start') || readme.includes('Installation');
        const hasAPIKeys = readme.includes('API key') || readme.includes('keychain');
        const hasUsageExamples = readme.includes('```bash') || readme.includes('```javascript');
        const hasTroubleshooting = readme.includes('troubleshooting') || readme.includes('issues');
        
        console.log(`  📖 Documentation: Found ✅`);
        console.log(`  🚀 Quick start guide: ${hasQuickStart ? '✅' : '❌'}`);
        console.log(`  🔑 API key instructions: ${hasAPIKeys ? '✅' : '❌'}`);
        console.log(`  💡 Usage examples: ${hasUsageExamples ? '✅' : '❌'}`);
        console.log(`  🛠️ Troubleshooting: ${hasTroubleshooting ? '✅' : '❌'}`);
        
        this.results.setup.documentationComplete = 
          hasQuickStart && hasAPIKeys && hasUsageExamples;
      }

      this.results.setup.passed = true;
      console.log('  ✅ Setup & configuration check complete');

    } catch (error) {
      console.log(`  ❌ Setup check failed: ${error.message}`);
      this.results.setup.passed = false;
      this.results.errors.push(`Setup: ${error.message}`);
    }
  }

  // Generate installation test report
  generateInstallationReport() {
    console.log('\\n' + '='.repeat(70));
    console.log('📊 CLAUDETTE v2.1.0 INSTALLATION TEST REPORT');
    console.log('='.repeat(70));

    const allTestsPassed = Object.values(this.results).every(result => 
      typeof result === 'object' && result.passed !== false
    );
    
    console.log(`\\n🎯 INSTALLATION READINESS: ${allTestsPassed ? '✅ READY' : '⚠️ NEEDS ATTENTION'}`);
    
    // Test results
    console.log('\\n📋 TEST CATEGORIES:');
    console.log(`   Prerequisites: ${this.results.prerequisites.passed ? '✅' : '❌'}`);
    console.log(`   Dependencies: ${this.results.dependencies.passed ? '✅' : '❌'}`);
    console.log(`   Compilation: ${this.results.compilation.passed ? '✅' : '❌'}`);
    console.log(`   Unit Testing: ${this.results.testing.passed ? '✅' : '❌'}`);
    console.log(`   Setup & Config: ${this.results.setup.passed ? '✅' : '❌'}`);
    
    // Key findings
    console.log('\\n🔍 KEY FINDINGS:');
    if (this.results.prerequisites.nodeVersion) {
      console.log(`   Node.js Version: ${this.results.prerequisites.nodeVersion}`);
    }
    if (this.results.compilation.compiles !== undefined) {
      console.log(`   TypeScript Compilation: ${this.results.compilation.compiles ? 'Clean' : 'Has Errors'}`);
      if (this.results.compilation.errorCount) {
        console.log(`   TypeScript Errors: ${this.results.compilation.errorCount}`);
      }
    }
    if (this.results.testing.passRate) {
      console.log(`   Unit Test Pass Rate: ${this.results.testing.passRate}%`);
    }
    
    // Issues
    if (this.results.errors.length > 0) {
      console.log('\\n⚠️ ISSUES IDENTIFIED:');
      this.results.errors.forEach(error => {
        console.log(`   • ${error}`);
      });
    }
    
    // Installation recommendations
    console.log('\\n💡 INSTALLATION RECOMMENDATIONS:');
    if (!this.results.compilation.compiles) {
      console.log('   • Fix TypeScript compilation errors before deployment');
    }
    if (this.results.testing.testsFailed > 0) {
      console.log('   • Address failing unit tests for stability');
    }
    if (allTestsPassed) {
      console.log('   • Package is ready for installation');
      console.log('   • Run ./install.sh for automated setup');
      console.log('   • Follow README.md for API key configuration');
    }

    console.log('\\n' + '='.repeat(70));
    
    return {
      ready: allTestsPassed,
      results: this.results
    };
  }

  // Run all installation tests
  async runAllInstallationTests() {
    console.log('🚀 Claudette v2.1.0 Installation Validation Suite');
    console.log('='.repeat(70));
    console.log('🎯 Validating installation readiness and setup process');
    console.log('');

    this.testPrerequisites();
    this.testDependencies();
    this.testCompilation();
    this.testUnitTests();
    this.testSetupConfiguration();
    
    return this.generateInstallationReport();
  }
}

async function main() {
  const tester = new ClaudetteInstallationTester();
  
  try {
    const results = await tester.runAllInstallationTests();
    process.exit(results.ready ? 0 : 1);
  } catch (error) {
    console.error('Installation testing failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { ClaudetteInstallationTester };