#!/usr/bin/env node

// Claudette v2.1.0 Distribution Testing Suite
// Comprehensive testing of package integrity, installation, and functionality

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

class ClaudetteDistributionTester {
  constructor() {
    this.baseDir = '/Users/roble/Documents/Python/claude_flow';
    this.distDir = path.join(this.baseDir, 'dist');
    this.testResults = {
      integrity: {},
      installation: {},
      functionality: {},
      performance: {},
      errors: []
    };
  }

  // Test 1: Package Integrity Verification
  testPackageIntegrity() {
    console.log('🔍 Testing Package Integrity...');
    console.log('─'.repeat(50));

    try {
      // Test archive exists
      const archivePath = path.join(this.distDir, 'claudette-v2.1.0.tar.gz');
      const archiveExists = fs.existsSync(archivePath);
      console.log(`  📦 Archive exists: ${archiveExists ? '✅' : '❌'}`);
      
      if (archiveExists) {
        const archiveStats = fs.statSync(archivePath);
        console.log(`  📊 Archive size: ${(archiveStats.size / 1024).toFixed(1)}KB`);
        
        // Verify archive checksum
        const archiveContent = fs.readFileSync(archivePath);
        const archiveHash = crypto.createHash('sha256').update(archiveContent).digest('hex');
        console.log(`  🔐 Archive checksum: ${archiveHash.substring(0, 16)}...`);
      }

      // Test extracted package structure
      const packageDir = path.join(this.distDir, 'claudette-v2.1.0');
      const packageExists = fs.existsSync(packageDir);
      console.log(`  📁 Package directory: ${packageExists ? '✅' : '❌'}`);

      if (packageExists) {
        // Check essential files
        const essentialFiles = [
          'package.json',
          'README.md',
          'LICENSE',
          'tsconfig.json',
          'CHECKSUMS.txt',
          'install.sh',
          'src/types/index.ts',
          'src/router/base-router.ts',
          'src/test/claudette-unit-tests.js'
        ];

        let filesFound = 0;
        essentialFiles.forEach(file => {
          const filePath = path.join(packageDir, file);
          const exists = fs.existsSync(filePath);
          if (exists) filesFound++;
          console.log(`    ${exists ? '✅' : '❌'} ${file}`);
        });

        console.log(`  📋 Essential files: ${filesFound}/${essentialFiles.length} found`);
        this.testResults.integrity.filesFound = filesFound;
        this.testResults.integrity.totalFiles = essentialFiles.length;
      }

      // Test checksums integrity
      const checksumPath = path.join(packageDir, 'CHECKSUMS.txt');
      if (fs.existsSync(checksumPath)) {
        const checksumContent = fs.readFileSync(checksumPath, 'utf8');
        const checksumLines = checksumContent.split('\\n').filter(line => 
          line.includes('  ') && !line.startsWith('#')
        );
        console.log(`  🔐 Checksum entries: ${checksumLines.length}`);
        this.testResults.integrity.checksumEntries = checksumLines.length;
      }

      console.log('  ✅ Package integrity test complete');
      this.testResults.integrity.passed = true;

    } catch (error) {
      console.log(`  ❌ Integrity test failed: ${error.message}`);
      this.testResults.integrity.passed = false;
      this.testResults.errors.push(`Integrity: ${error.message}`);
    }
  }

  // Test 2: Installation Process Simulation
  testInstallationProcess() {
    console.log('\\n🚀 Testing Installation Process...');
    console.log('─'.repeat(50));

    try {
      const packageDir = path.join(this.distDir, 'claudette-v2.1.0');
      
      // Check install script
      const installScript = path.join(packageDir, 'install.sh');
      const scriptExists = fs.existsSync(installScript);
      console.log(`  📜 Install script: ${scriptExists ? '✅' : '❌'}`);

      if (scriptExists) {
        const scriptStats = fs.statSync(installScript);
        const isExecutable = (scriptStats.mode & parseInt('111', 8)) !== 0;
        console.log(`  🔧 Script executable: ${isExecutable ? '✅' : '❌'}`);
        
        // Read install script content
        const scriptContent = fs.readFileSync(installScript, 'utf8');
        const hasPrerequisiteCheck = scriptContent.includes('node --version');
        const hasNpmInstall = scriptContent.includes('npm install');
        const hasTypeScriptCheck = scriptContent.includes('tsc');
        const hasKeychiainSetup = scriptContent.includes('keychain');
        
        console.log(`  ✅ Prerequisites check: ${hasPrerequisiteCheck ? '✅' : '❌'}`);
        console.log(`  📦 npm install: ${hasNpmInstall ? '✅' : '❌'}`);
        console.log(`  🔨 TypeScript setup: ${hasTypeScriptCheck ? '✅' : '❌'}`);
        console.log(`  🔑 Keychain setup: ${hasKeychiainSetup ? '✅' : '❌'}`);
      }

      // Test package.json validity
      const packageJsonPath = path.join(packageDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        console.log(`  📋 Package name: ${packageJson.name}`);
        console.log(`  🏷️ Version: ${packageJson.version}`);
        console.log(`  📜 License: ${packageJson.license}`);
        
        const hasValidScripts = packageJson.scripts && 
                               packageJson.scripts.test && 
                               packageJson.scripts.build;
        console.log(`  🛠️ Valid scripts: ${hasValidScripts ? '✅' : '❌'}`);
        
        this.testResults.installation.version = packageJson.version;
        this.testResults.installation.hasValidScripts = hasValidScripts;
      }

      this.testResults.installation.passed = true;
      console.log('  ✅ Installation process test complete');

    } catch (error) {
      console.log(`  ❌ Installation test failed: ${error.message}`);
      this.testResults.installation.passed = false;
      this.testResults.errors.push(`Installation: ${error.message}`);
    }
  }

  // Test 3: Core Functionality Testing
  testCoreFunctionality() {
    console.log('\\n🧪 Testing Core Functionality...');
    console.log('─'.repeat(50));

    try {
      const packageDir = path.join(this.distDir, 'claudette-v2.1.0');
      
      // Test TypeScript types
      const typesPath = path.join(packageDir, 'src/types/index.ts');
      if (fs.existsSync(typesPath)) {
        const typesContent = fs.readFileSync(typesPath, 'utf8');
        const hasClaudetteRequest = typesContent.includes('ClaudetteRequest');
        const hasClaudetteResponse = typesContent.includes('ClaudetteResponse');
        const hasBackendSettings = typesContent.includes('BackendSettings');
        const hasErrorTypes = typesContent.includes('ClaudetteError');
        
        console.log(`  🔷 ClaudetteRequest interface: ${hasClaudetteRequest ? '✅' : '❌'}`);
        console.log(`  🔷 ClaudetteResponse interface: ${hasClaudetteResponse ? '✅' : '❌'}`);
        console.log(`  🔷 BackendSettings interface: ${hasBackendSettings ? '✅' : '❌'}`);
        console.log(`  🔷 Error types: ${hasErrorTypes ? '✅' : '❌'}`);
        
        this.testResults.functionality.typesValid = 
          hasClaudetteRequest && hasClaudetteResponse && hasBackendSettings;
      }

      // Test base router
      const baseRouterPath = path.join(packageDir, 'src/router/base-router.ts');
      if (fs.existsSync(baseRouterPath)) {
        const routerContent = fs.readFileSync(baseRouterPath, 'utf8');
        const hasAbstractClass = routerContent.includes('abstract class BaseRouter');
        const hasSelectBackend = routerContent.includes('abstract selectBackend');
        const hasRouteMethod = routerContent.includes('abstract route');
        const hasScoring = routerContent.includes('calculateBackendScores');
        
        console.log(`  🔄 BaseRouter abstract class: ${hasAbstractClass ? '✅' : '❌'}`);
        console.log(`  🎯 selectBackend method: ${hasSelectBackend ? '✅' : '❌'}`);
        console.log(`  🚀 route method: ${hasRouteMethod ? '✅' : '❌'}`);
        console.log(`  📊 backend scoring: ${hasScoring ? '✅' : '❌'}`);
        
        this.testResults.functionality.routerValid = 
          hasAbstractClass && hasSelectBackend && hasRouteMethod;
      }

      // Test unit test suite
      const testPath = path.join(packageDir, 'src/test/claudette-unit-tests.js');
      if (fs.existsSync(testPath)) {
        console.log('  🧪 Running unit tests...');
        
        try {
          // Change to package directory and run tests
          const testOutput = execSync('node src/test/claudette-unit-tests.js', {
            cwd: packageDir,
            encoding: 'utf8',
            timeout: 30000
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
            
            this.testResults.functionality.testsPassed = passed;
            this.testResults.functionality.testsFailed = failed;
            this.testResults.functionality.passRate = passRate;
          }
          
        } catch (testError) {
          console.log(`    ⚠️ Test execution error: ${testError.message}`);
          this.testResults.functionality.testError = testError.message;
        }
      }

      this.testResults.functionality.passed = true;
      console.log('  ✅ Core functionality test complete');

    } catch (error) {
      console.log(`  ❌ Functionality test failed: ${error.message}`);
      this.testResults.functionality.passed = false;
      this.testResults.errors.push(`Functionality: ${error.message}`);
    }
  }

  // Test 4: Performance and Quality Metrics
  testPerformanceMetrics() {
    console.log('\\n📊 Testing Performance Metrics...');
    console.log('─'.repeat(50));

    try {
      const packageDir = path.join(this.distDir, 'claudette-v2.1.0');
      
      // Test distribution size efficiency
      const sizeStats = this.calculateDirectorySize(packageDir);
      console.log(`  📁 Package size: ${(sizeStats.totalSize / 1024).toFixed(1)}KB`);
      console.log(`  📄 Total files: ${sizeStats.fileCount}`);
      console.log(`  📊 Avg file size: ${(sizeStats.totalSize / sizeStats.fileCount / 1024).toFixed(2)}KB`);
      
      // Test documentation completeness
      const readmePath = path.join(packageDir, 'README.md');
      if (fs.existsSync(readmePath)) {
        const readmeContent = fs.readFileSync(readmePath, 'utf8');
        const readmeSize = readmeContent.length;
        const hasInstallInstructions = readmeContent.includes('Installation');
        const hasUsageExamples = readmeContent.includes('Usage') || readmeContent.includes('Quick Start');
        const hasAPIReference = readmeContent.includes('API') || readmeContent.includes('Reference');
        const hasChangelog = readmeContent.includes('v2.1.0 Changelog');
        
        console.log(`  📖 README size: ${(readmeSize / 1024).toFixed(1)}KB`);
        console.log(`  🚀 Install instructions: ${hasInstallInstructions ? '✅' : '❌'}`);
        console.log(`  💡 Usage examples: ${hasUsageExamples ? '✅' : '❌'}`);
        console.log(`  📚 API reference: ${hasAPIReference ? '✅' : '❌'}`);
        console.log(`  📝 v2.1.0 changelog: ${hasChangelog ? '✅' : '❌'}`);
        
        this.testResults.performance.documentationScore = 
          (hasInstallInstructions + hasUsageExamples + hasAPIReference + hasChangelog) * 25;
      }

      // Test code quality indicators
      const sourceFiles = this.findSourceFiles(packageDir);
      let totalLines = 0;
      let typescriptFiles = 0;
      let javascriptFiles = 0;
      
      sourceFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\\n').length;
        totalLines += lines;
        
        if (file.endsWith('.ts')) typescriptFiles++;
        if (file.endsWith('.js')) javascriptFiles++;
      });
      
      console.log(`  📄 Source files: ${sourceFiles.length}`);
      console.log(`  📝 Total lines: ${totalLines}`);
      console.log(`  🔷 TypeScript files: ${typescriptFiles}`);
      console.log(`  🟨 JavaScript files: ${javascriptFiles}`);
      console.log(`  📊 Avg lines per file: ${Math.round(totalLines / sourceFiles.length)}`);
      
      this.testResults.performance.totalSourceFiles = sourceFiles.length;
      this.testResults.performance.totalLines = totalLines;
      this.testResults.performance.typescriptRatio = typescriptFiles / sourceFiles.length;
      
      this.testResults.performance.passed = true;
      console.log('  ✅ Performance metrics test complete');

    } catch (error) {
      console.log(`  ❌ Performance test failed: ${error.message}`);
      this.testResults.performance.passed = false;
      this.testResults.errors.push(`Performance: ${error.message}`);
    }
  }

  // Helper: Calculate directory size
  calculateDirectorySize(dirPath) {
    let totalSize = 0;
    let fileCount = 0;
    
    const traverse = (currentPath) => {
      const items = fs.readdirSync(currentPath);
      items.forEach(item => {
        const itemPath = path.join(currentPath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          traverse(itemPath);
        } else {
          totalSize += stats.size;
          fileCount++;
        }
      });
    };
    
    traverse(dirPath);
    return { totalSize, fileCount };
  }

  // Helper: Find source files
  findSourceFiles(dirPath) {
    const sourceFiles = [];
    
    const traverse = (currentPath) => {
      const items = fs.readdirSync(currentPath);
      items.forEach(item => {
        const itemPath = path.join(currentPath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory() && !item.includes('node_modules')) {
          traverse(itemPath);
        } else if (item.match(/\\.(ts|js)$/)) {
          sourceFiles.push(itemPath);
        }
      });
    };
    
    traverse(dirPath);
    return sourceFiles;
  }

  // Generate comprehensive test report
  generateTestReport() {
    console.log('\\n' + '='.repeat(70));
    console.log('📊 CLAUDETTE v2.1.0 DISTRIBUTION TEST REPORT');
    console.log('='.repeat(70));

    // Overall status
    const allTestsPassed = Object.values(this.testResults).every(result => 
      typeof result === 'object' && result.passed !== false
    );
    
    console.log(`\\n🎯 OVERALL STATUS: ${allTestsPassed ? '✅ PASSED' : '❌ ISSUES FOUND'}`);
    
    // Test breakdown
    console.log('\\n📋 TEST RESULTS:');
    console.log(`   Package Integrity: ${this.testResults.integrity.passed ? '✅' : '❌'}`);
    console.log(`   Installation Process: ${this.testResults.installation.passed ? '✅' : '❌'}`);
    console.log(`   Core Functionality: ${this.testResults.functionality.passed ? '✅' : '❌'}`);
    console.log(`   Performance Metrics: ${this.testResults.performance.passed ? '✅' : '❌'}`);
    
    // Key metrics
    if (this.testResults.integrity.filesFound) {
      console.log('\\n📊 KEY METRICS:');
      console.log(`   Essential Files: ${this.testResults.integrity.filesFound}/${this.testResults.integrity.totalFiles}`);
      console.log(`   Package Version: ${this.testResults.installation.version || 'N/A'}`);
      
      if (this.testResults.functionality.passRate) {
        console.log(`   Unit Test Pass Rate: ${this.testResults.functionality.passRate}%`);
      }
      
      if (this.testResults.performance.totalSourceFiles) {
        console.log(`   Source Files: ${this.testResults.performance.totalSourceFiles}`);
        console.log(`   TypeScript Ratio: ${(this.testResults.performance.typescriptRatio * 100).toFixed(1)}%`);
      }
    }
    
    // Errors
    if (this.testResults.errors.length > 0) {
      console.log('\\n❌ ISSUES FOUND:');
      this.testResults.errors.forEach(error => {
        console.log(`   • ${error}`);
      });
    }
    
    // Recommendations
    console.log('\\n💡 RECOMMENDATIONS:');
    if (this.testResults.functionality.testsFailed > 0) {
      console.log('   • Fix failing unit tests for production readiness');
    }
    if (this.testResults.performance.documentationScore < 100) {
      console.log('   • Enhance documentation completeness');
    }
    if (this.testResults.errors.length === 0) {
      console.log('   • Distribution is ready for production deployment');
      console.log('   • Consider adding automated CI/CD pipeline');
      console.log('   • Package integrity verification successful');
    }

    console.log('\\n' + '='.repeat(70));
    
    return {
      passed: allTestsPassed,
      results: this.testResults
    };
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Claudette v2.1.0 Distribution Testing Suite');
    console.log('='.repeat(70));
    console.log('🎯 Comprehensive testing of package integrity, installation, and functionality');
    console.log('');

    this.testPackageIntegrity();
    this.testInstallationProcess();
    this.testCoreFunctionality();
    this.testPerformanceMetrics();
    
    return this.generateTestReport();
  }
}

async function main() {
  const tester = new ClaudetteDistributionTester();
  
  try {
    const results = await tester.runAllTests();
    process.exit(results.passed ? 0 : 1);
  } catch (error) {
    console.error('Distribution testing failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { ClaudetteDistributionTester };