#!/usr/bin/env node

/**
 * Simple CI Test for Claudette v1.0.4
 * Basic validation test that doesn't require external dependencies
 */

console.log('🧪 Claudette CI Simple Test Suite');
console.log('=' .repeat(40));

// Test 1: Package.json validation
function testPackageJson() {
  console.log('📋 Testing: Package.json validation');
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    const packagePath = path.join(__dirname, '../../package.json');
    const packageContent = fs.readFileSync(packagePath, 'utf8');
    const packageJson = JSON.parse(packageContent);
    
    if (packageJson.version !== '1.0.4') {
      throw new Error(`Expected version 1.0.4, got ${packageJson.version}`);
    }
    
    if (packageJson.name !== 'claudette') {
      throw new Error(`Expected name 'claudette', got ${packageJson.name}`);
    }
    
    console.log('   ✅ Package.json validation passed');
    return true;
  } catch (error) {
    console.log(`   ❌ Package.json validation failed: ${error.message}`);
    return false;
  }
}

// Test 2: Core files exist
function testCoreFilesExist() {
  console.log('📋 Testing: Core files existence');
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    const requiredFiles = [
      '../../src/cli/index.ts',
      '../../src/index.ts',
      '../../README.md',
      '../../CHANGELOG.md'
    ];
    
    for (const file of requiredFiles) {
      const filePath = path.join(__dirname, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Required file missing: ${file}`);
      }
    }
    
    console.log('   ✅ Core files existence check passed');
    return true;
  } catch (error) {
    console.log(`   ❌ Core files existence check failed: ${error.message}`);
    return false;
  }
}

// Test 3: TypeScript compilation check
function testTypeScriptStructure() {
  console.log('📋 Testing: TypeScript structure');
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Check tsconfig.json exists
    const tsconfigPath = path.join(__dirname, '../../tsconfig.json');
    if (!fs.existsSync(tsconfigPath)) {
      throw new Error('tsconfig.json not found');
    }
    
    // Check basic TypeScript files exist
    const tsFiles = [
      '../../src/cli/index.ts',
      '../../src/index.ts'
    ];
    
    for (const file of tsFiles) {
      const filePath = path.join(__dirname, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`TypeScript file missing: ${file}`);
      }
    }
    
    console.log('   ✅ TypeScript structure check passed');
    return true;
  } catch (error) {
    console.log(`   ❌ TypeScript structure check failed: ${error.message}`);
    return false;
  }
}

// Test 4: Version consistency check
function testVersionConsistency() {
  console.log('📋 Testing: Version consistency');
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Check package.json version
    const packagePath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const version = packageJson.version;
    
    // Check README contains correct version
    const readmePath = path.join(__dirname, '../../README.md');
    const readmeContent = fs.readFileSync(readmePath, 'utf8');
    
    if (!readmeContent.includes('v1.0.4') && !readmeContent.includes('1.0.4')) {
      throw new Error('README does not contain correct version reference');
    }
    
    console.log('   ✅ Version consistency check passed');
    return true;
  } catch (error) {
    console.log(`   ❌ Version consistency check failed: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runTests() {
  const tests = [
    testPackageJson,
    testCoreFilesExist,
    testTypeScriptStructure,
    testVersionConsistency
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    if (test()) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log('\n📊 Test Results:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed');
    process.exit(0);
  }
}

// Execute tests
runTests();