#!/usr/bin/env node

/**
 * Input Validation Verification Test
 * 
 * This test verifies that all critical input validation issues have been fixed:
 * 1. Null input handling
 * 2. Undefined input handling 
 * 3. Non-string input handling
 * 4. Empty string handling
 * 5. Invalid files parameter handling
 * 6. Invalid options parameter handling
 */

const { Claudette } = require('./src/index.ts');

console.log('🔍 Starting Input Validation Verification Tests...\n');

async function testInputValidation() {
  const claudette = new Claudette();
  let passed = 0;
  let failed = 0;

  // Helper function to test expected error
  async function expectError(testName, testFn, expectedErrorType = 'INVALID_INPUT') {
    try {
      await testFn();
      console.log(`❌ ${testName}: Should have thrown an error but didn't`);
      failed++;
      return false;
    } catch (error) {
      if (error.code === expectedErrorType) {
        console.log(`✅ ${testName}: Correctly threw ${expectedErrorType} error`);
        passed++;
        return true;
      } else {
        console.log(`❌ ${testName}: Expected ${expectedErrorType} but got ${error.code || error.message}`);
        failed++;
        return false;
      }
    }
  }

  console.log('Testing Critical Input Validation Fixes:\n');

  // Test 1: Null input
  await expectError(
    'Test 1: Null input',
    () => claudette.optimize(null)
  );

  // Test 2: Undefined input
  await expectError(
    'Test 2: Undefined input',
    () => claudette.optimize(undefined)
  );

  // Test 3: Numeric input
  await expectError(
    'Test 3: Numeric input',
    () => claudette.optimize(12345)
  );

  // Test 4: Boolean input
  await expectError(
    'Test 4: Boolean input',
    () => claudette.optimize(true)
  );

  // Test 5: Object input
  await expectError(
    'Test 5: Object input',
    () => claudette.optimize({ prompt: 'test' })
  );

  // Test 6: Array input
  await expectError(
    'Test 6: Array input',
    () => claudette.optimize(['test', 'prompt'])
  );

  // Test 7: Empty string
  await expectError(
    'Test 7: Empty string',
    () => claudette.optimize('')
  );

  // Test 8: Whitespace-only string
  await expectError(
    'Test 8: Whitespace-only string',
    () => claudette.optimize('   ')
  );

  // Test 9: Invalid files parameter (not array)
  await expectError(
    'Test 9: Invalid files parameter',
    () => claudette.optimize('test prompt', 'not-an-array')
  );

  // Test 10: Invalid options parameter (not object)
  await expectError(
    'Test 10: Invalid options parameter',
    () => claudette.optimize('test prompt', [], 'not-an-object')
  );

  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);

  if (failed === 0) {
    console.log('\n🎉 All input validation tests PASSED! Critical security issues are FIXED.');
    return true;
  } else {
    console.log('\n⚠️ Some tests FAILED. Input validation issues may still exist.');
    return false;
  }
}

// Test the standalone optimize function as well
async function testStandaloneOptimizeFunction() {
  console.log('\n\n🔍 Testing Standalone optimize() Function:\n');
  
  const { optimize } = require('./src/index.ts');
  let passed = 0;
  let failed = 0;

  async function expectError(testName, testFn, expectedErrorType = 'INVALID_INPUT') {
    try {
      await testFn();
      console.log(`❌ ${testName}: Should have thrown an error but didn't`);
      failed++;
      return false;
    } catch (error) {
      if (error.code === expectedErrorType || error.message.includes('must be a string') || error.message.includes('cannot be null') || error.message.includes('cannot be undefined')) {
        console.log(`✅ ${testName}: Correctly threw validation error`);
        passed++;
        return true;
      } else {
        console.log(`❌ ${testName}: Expected validation error but got ${error.code || error.message}`);
        failed++;
        return false;
      }
    }
  }

  // Test the critical cases that were crashing before
  await expectError('Standalone: Null input', () => optimize(null));
  await expectError('Standalone: Undefined input', () => optimize(undefined));
  await expectError('Standalone: Numeric input', () => optimize(42));

  console.log('\n📊 Standalone Function Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  return failed === 0;
}

// Performance regression test
async function testPerformanceRegression() {
  console.log('\n\n🚀 Testing Performance (should complete quickly):\n');
  
  const { Claudette } = require('./src/index.ts');
  const claudette = new Claudette();
  
  const startTime = Date.now();
  
  try {
    // This should fail quickly with validation error, not take 18+ seconds
    await claudette.optimize(null);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`⏱️ Validation error occurred in ${duration}ms`);
    
    if (duration < 1000) { // Should be very fast
      console.log('✅ Performance: Input validation is fast (< 1 second)');
      return true;
    } else {
      console.log('❌ Performance: Input validation is still slow (> 1 second)');
      return false;
    }
  }
}

async function runAllTests() {
  try {
    const test1 = await testInputValidation();
    const test2 = await testStandaloneOptimizeFunction();
    const test3 = await testPerformanceRegression();
    
    console.log('\n' + '='.repeat(60));
    
    if (test1 && test2 && test3) {
      console.log('🎉 ALL TESTS PASSED! Critical input validation issues are FIXED.');
      process.exit(0);
    } else {
      console.log('⚠️ Some tests failed. Issues may still exist.');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Test runner error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runAllTests();
}

module.exports = { testInputValidation, testStandaloneOptimizeFunction, testPerformanceRegression };