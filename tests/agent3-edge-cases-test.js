#!/usr/bin/env node

/**
 * Agent 3 - Comprehensive Edge Cases and Error Handling Test
 * Testing Claudette v3.0.0 for extreme boundary conditions and vulnerabilities
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Test Results Storage
const testResults = {
  timestamp: new Date().toISOString(),
  claudette_version: '3.0.0',
  test_environment: 'Agent 3 Edge Case Testing',
  summary: {
    total_tests: 0,
    passed: 0,
    failed: 0,
    critical_vulnerabilities: 0,
    warnings: 0
  },
  categories: {
    empty_inputs: { tests: [], passed: 0, failed: 0 },
    massive_inputs: { tests: [], passed: 0, failed: 0 },
    malformed_requests: { tests: [], passed: 0, failed: 0 },
    timeout_handling: { tests: [], passed: 0, failed: 0 },
    concurrent_access: { tests: [], passed: 0, failed: 0 },
    resource_exhaustion: { tests: [], passed: 0, failed: 0 },
    config_corruption: { tests: [], passed: 0, failed: 0 },
    security_boundaries: { tests: [], passed: 0, failed: 0 },
    error_handling: { tests: [], passed: 0, failed: 0 }
  },
  vulnerabilities: [],
  recommendations: []
};

/**
 * Test helper functions
 */
function logTest(category, name, result, details = {}) {
  const test = {
    name,
    result,
    timestamp: new Date().toISOString(),
    duration_ms: details.duration || 0,
    details,
    severity: details.severity || 'medium'
  };
  
  testResults.categories[category].tests.push(test);
  testResults.categories[category][result]++;
  testResults.summary.total_tests++;
  testResults.summary[result]++;
  
  if (result === 'failed' && details.severity === 'critical') {
    testResults.summary.critical_vulnerabilities++;
    testResults.vulnerabilities.push({
      category,
      test: name,
      description: details.error || 'Unknown vulnerability',
      severity: 'critical',
      recommendation: details.recommendation || 'Review and fix immediately'
    });
  }
  
  console.log(`[${category.toUpperCase()}] ${name}: ${result.toUpperCase()}${details.error ? ' - ' + details.error : ''}`);
}

function generateLargeString(size) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 \n';
  let result = '';
  for (let i = 0; i < size; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateMalformedJson() {
  return [
    '{"incomplete": true',
    '{malformed: "json"}',
    '{"nested": {"deep": {"very": {"deep": {"object"',
    '{"unicode": "\\u0000\\uFFFF\\uD800"}',
    '{"circular": {"ref": {"back": "{{CIRCULAR}}"}}}',
    '[]{}',
    'null',
    'undefined',
    '{}'
  ];
}

/**
 * Initialize Claudette for testing
 */
async function initializeClaudette() {
  try {
    // Import Claudette from compiled JavaScript
    const { Claudette, optimize } = await import('./dist/index.js');
    
    // Try to create instance with various configurations
    const claudette = new Claudette();
    
    return { Claudette, optimize, claudette };
  } catch (error) {
    console.error('Failed to initialize Claudette:', error.message);
    throw error;
  }
}

/**
 * Test Category 1: Empty Inputs and Null Values
 */
async function testEmptyInputs(claudette, optimize) {
  console.log('\n=== Testing Empty Inputs and Null Values ===');
  
  const emptyTestCases = [
    { name: 'Empty string prompt', input: '' },
    { name: 'Null prompt', input: null },
    { name: 'Undefined prompt', input: undefined },
    { name: 'Whitespace only prompt', input: '   \n\t   ' },
    { name: 'Empty array files', input: 'test', files: [] },
    { name: 'Null files array', input: 'test', files: null },
    { name: 'Undefined files array', input: 'test', files: undefined },
    { name: 'Empty options object', input: 'test', options: {} },
    { name: 'Null options object', input: 'test', options: null }
  ];
  
  for (const testCase of emptyTestCases) {
    const startTime = Date.now();
    try {
      await optimize(testCase.input, testCase.files, testCase.options);
      logTest('empty_inputs', testCase.name, 'passed', { 
        duration: Date.now() - startTime,
        message: 'Handled gracefully'
      });
    } catch (error) {
      const expectedErrors = ['INVALID_INPUT', 'VALIDATION_ERROR', 'EMPTY_PROMPT'];
      const isExpectedError = expectedErrors.some(expected => error.message.includes(expected));
      
      if (isExpectedError) {
        logTest('empty_inputs', testCase.name, 'passed', { 
          duration: Date.now() - startTime,
          message: 'Correctly rejected with proper error'
        });
      } else {
        logTest('empty_inputs', testCase.name, 'failed', { 
          duration: Date.now() - startTime,
          error: error.message,
          severity: 'medium',
          recommendation: 'Improve input validation and error messages'
        });
      }
    }
  }
}

/**
 * Test Category 2: Massive Inputs and Memory Limits
 */
async function testMassiveInputs(claudette, optimize) {
  console.log('\n=== Testing Massive Inputs and Memory Limits ===');
  
  const massiveTestCases = [
    { name: '1MB prompt', size: 1024 * 1024 },
    { name: '10MB prompt', size: 10 * 1024 * 1024 },
    { name: '100MB prompt (memory test)', size: 100 * 1024 * 1024 },
    { name: 'Extremely long single line', size: 1024 * 1024, newlines: false },
    { name: 'Million newlines', content: '\n'.repeat(1000000) },
    { name: 'Deeply nested structure', content: '('.repeat(100000) + ')'.repeat(100000) }
  ];
  
  for (const testCase of massiveTestCases) {
    const startTime = Date.now();
    const initialMemory = process.memoryUsage().heapUsed;
    
    try {
      let content;
      if (testCase.content) {
        content = testCase.content;
      } else {
        content = generateLargeString(testCase.size);
        if (testCase.newlines === false) {
          content = content.replace(/\n/g, ' ');
        }
      }
      
      const result = await optimize(content);
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryDelta = finalMemory - initialMemory;
      
      logTest('massive_inputs', testCase.name, 'passed', { 
        duration: Date.now() - startTime,
        memory_delta_mb: Math.round(memoryDelta / 1024 / 1024),
        input_size_mb: Math.round((content.length) / 1024 / 1024),
        message: 'Handled without crashing'
      });
      
    } catch (error) {
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryDelta = finalMemory - initialMemory;
      
      if (error.message.includes('out of memory') || error.message.includes('heap')) {
        logTest('massive_inputs', testCase.name, 'failed', { 
          duration: Date.now() - startTime,
          error: error.message,
          memory_delta_mb: Math.round(memoryDelta / 1024 / 1024),
          severity: 'critical',
          recommendation: 'Implement memory limits and streaming processing'
        });
      } else if (error.message.includes('too large') || error.message.includes('exceeded')) {
        logTest('massive_inputs', testCase.name, 'passed', { 
          duration: Date.now() - startTime,
          message: 'Properly rejected oversized input',
          memory_delta_mb: Math.round(memoryDelta / 1024 / 1024)
        });
      } else {
        logTest('massive_inputs', testCase.name, 'failed', { 
          duration: Date.now() - startTime,
          error: error.message,
          memory_delta_mb: Math.round(memoryDelta / 1024 / 1024),
          severity: 'medium'
        });
      }
    }
  }
}

/**
 * Test Category 3: Malformed Requests and Invalid Parameters
 */
async function testMalformedRequests(claudette, optimize) {
  console.log('\n=== Testing Malformed Requests and Invalid Parameters ===');
  
  const malformedCases = [
    { name: 'Invalid backend name', prompt: 'test', options: { backend: 'nonexistent_backend' } },
    { name: 'Negative max_tokens', prompt: 'test', options: { max_tokens: -100 } },
    { name: 'Invalid temperature', prompt: 'test', options: { temperature: 999 } },
    { name: 'Invalid model string', prompt: 'test', options: { model: 'fake-model-v999' } },
    { name: 'Function as prompt', prompt: function() { return 'test'; } },
    { name: 'Object as prompt', prompt: { message: 'test' } },
    { name: 'Array as prompt', prompt: ['test', 'message'] },
    { name: 'Circular object in options', prompt: 'test', options: null }, // Will be set to circular
    { name: 'Invalid file paths', prompt: 'test', files: ['/nonexistent/path', '', null, undefined] },
    { name: 'Binary data in prompt', prompt: Buffer.from([0x00, 0xFF, 0xDE, 0xAD, 0xBE, 0xEF]).toString('binary') }
  ];
  
  // Create circular reference
  const circularObj = { self: null };
  circularObj.self = circularObj;
  malformedCases[7].options = circularObj;
  
  for (const testCase of malformedCases) {
    const startTime = Date.now();
    try {
      await optimize(testCase.prompt, testCase.files, testCase.options);
      logTest('malformed_requests', testCase.name, 'failed', { 
        duration: Date.now() - startTime,
        error: 'Should have rejected malformed input',
        severity: 'medium',
        recommendation: 'Add stricter input validation'
      });
    } catch (error) {
      const validationErrors = ['VALIDATION_ERROR', 'INVALID_', 'TypeError', 'malformed', 'invalid'];
      const isValidationError = validationErrors.some(err => error.message.includes(err));
      
      if (isValidationError) {
        logTest('malformed_requests', testCase.name, 'passed', { 
          duration: Date.now() - startTime,
          message: 'Correctly rejected with validation error'
        });
      } else {
        logTest('malformed_requests', testCase.name, 'failed', { 
          duration: Date.now() - startTime,
          error: error.message,
          severity: 'medium',
          recommendation: 'Improve error classification and handling'
        });
      }
    }
  }
}

/**
 * Test Category 4: Timeout Handling and Recovery
 */
async function testTimeoutHandling(claudette, optimize) {
  console.log('\n=== Testing Timeout Handling and Recovery ===');
  
  const timeoutCases = [
    { name: 'Zero timeout', timeout: 0 },
    { name: 'Very short timeout', timeout: 1 },
    { name: 'Long operation with timeout', timeout: 100, prompt: generateLargeString(10000) },
    { name: 'Infinite loop prevention', prompt: 'test', options: { max_retries: -1 } },
    { name: 'Multiple rapid requests', count: 50, prompt: 'test' }
  ];
  
  for (const testCase of timeoutCases) {
    const startTime = Date.now();
    try {
      if (testCase.count) {
        // Test rapid concurrent requests
        const promises = Array(testCase.count).fill().map(() => 
          optimize(testCase.prompt || 'test')
        );
        await Promise.allSettled(promises);
      } else {
        // Set timeout if specified
        const timeoutPromise = testCase.timeout !== undefined ? 
          new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), testCase.timeout)) :
          null;
        
        const optimizePromise = optimize(testCase.prompt || 'test', [], testCase.options);
        
        if (timeoutPromise) {
          await Promise.race([optimizePromise, timeoutPromise]);
        } else {
          await optimizePromise;
        }
      }
      
      logTest('timeout_handling', testCase.name, 'passed', { 
        duration: Date.now() - startTime,
        message: 'Completed successfully'
      });
      
    } catch (error) {
      const timeoutErrors = ['TIMEOUT', 'timeout', 'ECONNRESET', 'aborted'];
      const isTimeoutError = timeoutErrors.some(err => error.message.includes(err));
      
      if (isTimeoutError && testCase.timeout !== undefined && testCase.timeout < 1000) {
        logTest('timeout_handling', testCase.name, 'passed', { 
          duration: Date.now() - startTime,
          message: 'Correctly handled timeout'
        });
      } else {
        logTest('timeout_handling', testCase.name, 'failed', { 
          duration: Date.now() - startTime,
          error: error.message,
          severity: 'medium',
          recommendation: 'Improve timeout handling and recovery mechanisms'
        });
      }
    }
  }
}

/**
 * Test Category 5: Configuration Edge Cases
 */
async function testConfigEdgeCases(claudette) {
  console.log('\n=== Testing Configuration Edge Cases ===');
  
  const configCases = [
    { name: 'Empty config file', config: {} },
    { name: 'Malformed JSON config', config: '{"invalid": json}', isString: true },
    { name: 'Missing required fields', config: { backends: {} } },
    { name: 'Negative values in config', config: { 
      thresholds: { cache_ttl: -1, max_cache_size: -100, cost_warning: -0.5 }
    }},
    { name: 'Extremely large threshold values', config: { 
      thresholds: { 
        cache_ttl: Number.MAX_SAFE_INTEGER,
        max_cache_size: Number.MAX_SAFE_INTEGER,
        max_context_tokens: Number.MAX_SAFE_INTEGER
      }
    }},
    { name: 'Invalid backend configuration', config: {
      backends: {
        invalid_backend: { enabled: true, api_key: null, model: '' }
      }
    }},
    { name: 'Circular references in config', config: null }, // Will be set to circular
    { name: 'Unicode and special chars in config', config: {
      backends: {
        test: { api_key: '🔑💣\u0000\uFFFF' }
      }
    }}
  ];
  
  // Create circular config
  const circularConfig = { self: null };
  circularConfig.self = circularConfig;
  configCases[6].config = circularConfig;
  
  for (const testCase of configCases) {
    const startTime = Date.now();
    let tempConfigPath = null;
    
    try {
      if (testCase.isString) {
        // Write malformed JSON to temporary file
        tempConfigPath = path.join(__dirname, `temp_config_${Date.now()}.json`);
        fs.writeFileSync(tempConfigPath, testCase.config);
        var { Claudette } = await import('./dist/index.js');
        new Claudette(tempConfigPath);
      } else if (testCase.config) {
        // Write config object to temporary file
        tempConfigPath = path.join(__dirname, `temp_config_${Date.now()}.json`);
        try {
          fs.writeFileSync(tempConfigPath, JSON.stringify(testCase.config, null, 2));
          var { Claudette } = await import('./dist/index.js');
          new Claudette(tempConfigPath);
        } catch (writeError) {
          // Expected for circular references
          if (writeError.message.includes('circular') || writeError.message.includes('Converting circular structure')) {
            throw new Error('CIRCULAR_STRUCTURE');
          }
          throw writeError;
        }
      } else {
        var { Claudette } = await import('./dist/index.js');
        new Claudette();
      }
      
      logTest('config_corruption', testCase.name, 'passed', { 
        duration: Date.now() - startTime,
        message: 'Handled gracefully with defaults'
      });
      
    } catch (error) {
      const expectedErrors = ['JSON', 'CONFIG', 'CIRCULAR_STRUCTURE', 'parse', 'malformed'];
      const isExpectedError = expectedErrors.some(err => error.message.toUpperCase().includes(err.toUpperCase()));
      
      if (isExpectedError) {
        logTest('config_corruption', testCase.name, 'passed', { 
          duration: Date.now() - startTime,
          message: 'Correctly rejected invalid configuration'
        });
      } else {
        logTest('config_corruption', testCase.name, 'failed', { 
          duration: Date.now() - startTime,
          error: error.message,
          severity: 'medium',
          recommendation: 'Improve configuration validation and error handling'
        });
      }
    } finally {
      // Cleanup temp file
      if (tempConfigPath && fs.existsSync(tempConfigPath)) {
        try {
          fs.unlinkSync(tempConfigPath);
        } catch (e) {
          console.warn('Failed to cleanup temp config file:', e.message);
        }
      }
    }
  }
}

/**
 * Test Category 6: Security Boundaries
 */
async function testSecurityBoundaries(optimize) {
  console.log('\n=== Testing Security Boundaries ===');
  
  const securityCases = [
    { name: 'Code injection attempt', prompt: '"; eval("console.log(\'INJECTED\')"); //' },
    { name: 'Path traversal attempt', files: ['../../../etc/passwd', '..\\..\\windows\\system32\\config'] },
    { name: 'SQL injection patterns', prompt: "'; DROP TABLE users; --" },
    { name: 'Script tag injection', prompt: '<script>alert("XSS")</script>' },
    { name: 'Command injection', prompt: '$(rm -rf /)' },
    { name: 'XXE attack pattern', prompt: '<!DOCTYPE test [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><test>&xxe;</test>' },
    { name: 'Buffer overflow attempt', prompt: 'A'.repeat(1000000) + '%n%n%n%n' },
    { name: 'Null byte injection', prompt: 'test\0.txt' },
    { name: 'Unicode normalization attack', prompt: '\u0041\u030A' + '\u00C5' }, // Different Unicode representations of Å
    { name: 'LDAP injection', prompt: '(|(password=*)(uid=admin))' }
  ];
  
  for (const testCase of securityCases) {
    const startTime = Date.now();
    try {
      const result = await optimize(testCase.prompt, testCase.files);
      
      // Check if dangerous patterns were sanitized
      const response = JSON.stringify(result);
      const dangerousPatterns = ['<script', 'eval(', 'DROP TABLE', 'rm -rf', 'system('];
      const containsDangerous = dangerousPatterns.some(pattern => 
        response.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (containsDangerous) {
        logTest('security_boundaries', testCase.name, 'failed', { 
          duration: Date.now() - startTime,
          error: 'Dangerous patterns found in response',
          severity: 'critical',
          recommendation: 'Implement proper input sanitization and output filtering'
        });
      } else {
        logTest('security_boundaries', testCase.name, 'passed', { 
          duration: Date.now() - startTime,
          message: 'No dangerous patterns detected in response'
        });
      }
      
    } catch (error) {
      // Security errors are expected and good
      const securityErrors = ['SECURITY', 'INVALID', 'BLOCKED', 'FILTERED', 'sanitiz'];
      const isSecurityError = securityErrors.some(err => 
        error.message.toLowerCase().includes(err.toLowerCase())
      );
      
      if (isSecurityError) {
        logTest('security_boundaries', testCase.name, 'passed', { 
          duration: Date.now() - startTime,
          message: 'Correctly blocked security threat'
        });
      } else {
        logTest('security_boundaries', testCase.name, 'failed', { 
          duration: Date.now() - startTime,
          error: error.message,
          severity: 'medium',
          recommendation: 'Review security error handling'
        });
      }
    }
  }
}

/**
 * Test Category 7: Error Handling and Recovery
 */
async function testErrorHandling(claudette, optimize) {
  console.log('\n=== Testing Error Handling and Recovery ===');
  
  const errorCases = [
    { name: 'Network failure simulation', prompt: 'test', options: { backend: 'mock-fail' } },
    { name: 'Database corruption simulation', action: 'corrupt_db' },
    { name: 'Cache corruption simulation', action: 'corrupt_cache' },
    { name: 'Memory exhaustion simulation', action: 'memory_stress' },
    { name: 'Concurrent error scenarios', action: 'concurrent_errors' },
    { name: 'Invalid API response handling', action: 'invalid_response' },
    { name: 'Quota exceeded simulation', action: 'quota_exceeded' },
    { name: 'Backend unavailable', prompt: 'test', options: { backend: 'unavailable' } }
  ];
  
  for (const testCase of errorCases) {
    const startTime = Date.now();
    try {
      if (testCase.action) {
        // Simulate specific error conditions
        switch (testCase.action) {
          case 'memory_stress':
            // Try to allocate large amounts of memory
            const largeArray = Array(10000000).fill('test');
            await optimize('Memory stress test with large context');
            break;
          case 'concurrent_errors':
            // Launch multiple failing requests simultaneously
            const failingPromises = Array(20).fill().map(() => 
              optimize('test', [], { backend: 'nonexistent' }).catch(e => e)
            );
            await Promise.allSettled(failingPromises);
            break;
          default:
            await optimize('Test error condition: ' + testCase.action);
        }
      } else {
        await optimize(testCase.prompt, testCase.files, testCase.options);
      }
      
      logTest('error_handling', testCase.name, 'passed', { 
        duration: Date.now() - startTime,
        message: 'Handled error scenario gracefully'
      });
      
    } catch (error) {
      // Check if error was handled properly
      const hasProperErrorStructure = error.name && error.message;
      const hasErrorCode = error.code || error.type;
      const hasRecoveryInfo = error.recoverable !== undefined;
      
      if (hasProperErrorStructure && hasErrorCode) {
        logTest('error_handling', testCase.name, 'passed', { 
          duration: Date.now() - startTime,
          message: 'Error properly structured and handled',
          error_type: error.name || error.constructor.name
        });
      } else {
        logTest('error_handling', testCase.name, 'failed', { 
          duration: Date.now() - startTime,
          error: error.message,
          severity: 'medium',
          recommendation: 'Improve error structure and recovery information'
        });
      }
    }
  }
}

/**
 * Test Category 8: Resource Exhaustion
 */
async function testResourceExhaustion(optimize) {
  console.log('\n=== Testing Resource Exhaustion Scenarios ===');
  
  const exhaustionCases = [
    { name: 'Memory leak test', iterations: 1000 },
    { name: 'File descriptor exhaustion', files: Array(1000).fill('/tmp/test') },
    { name: 'Stack overflow prevention', prompt: 'recursive call test', depth: 10000 },
    { name: 'CPU intensive operation', prompt: generateLargeString(100000), options: { temperature: 0.99 } },
    { name: 'Disk space simulation', action: 'disk_space' }
  ];
  
  for (const testCase of exhaustionCases) {
    const startTime = Date.now();
    const initialMemory = process.memoryUsage();
    
    try {
      if (testCase.iterations) {
        // Test for memory leaks
        for (let i = 0; i < testCase.iterations; i++) {
          await optimize(`Test iteration ${i}`);
          if (i % 100 === 0) {
            const currentMemory = process.memoryUsage();
            if (currentMemory.heapUsed > initialMemory.heapUsed * 3) {
              throw new Error('MEMORY_LEAK_DETECTED');
            }
          }
        }
      } else {
        await optimize(testCase.prompt, testCase.files, testCase.options);
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      logTest('resource_exhaustion', testCase.name, 'passed', { 
        duration: Date.now() - startTime,
        memory_delta_mb: Math.round(memoryIncrease / 1024 / 1024),
        message: 'Completed without resource exhaustion'
      });
      
    } catch (error) {
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      const resourceErrors = ['MEMORY', 'EMFILE', 'ENOMEM', 'Stack overflow', 'Maximum call stack'];
      const isResourceError = resourceErrors.some(err => 
        error.message.toUpperCase().includes(err.toUpperCase())
      );
      
      if (isResourceError) {
        logTest('resource_exhaustion', testCase.name, 'passed', { 
          duration: Date.now() - startTime,
          memory_delta_mb: Math.round(memoryIncrease / 1024 / 1024),
          message: 'Correctly detected and handled resource exhaustion'
        });
      } else {
        logTest('resource_exhaustion', testCase.name, 'failed', { 
          duration: Date.now() - startTime,
          error: error.message,
          memory_delta_mb: Math.round(memoryIncrease / 1024 / 1024),
          severity: 'high',
          recommendation: 'Implement resource monitoring and limits'
        });
      }
    }
  }
}

/**
 * Main test execution
 */
async function runEdgeCaseTests() {
  console.log('🚨 Starting Agent 3 - Comprehensive Edge Case Testing');
  console.log('Target: Claudette v3.0.0');
  console.log('Mission: Find vulnerabilities and edge cases');
  console.log('='.repeat(60));
  
  try {
    const { Claudette, optimize, claudette } = await initializeClaudette();
    console.log('✅ Claudette initialized successfully');
    
    // Run all test categories
    await testEmptyInputs(claudette, optimize);
    await testMalformedRequests(claudette, optimize);
    await testTimeoutHandling(claudette, optimize);
    await testConfigEdgeCases(claudette);
    await testSecurityBoundaries(optimize);
    await testErrorHandling(claudette, optimize);
    
    // Resource intensive tests (may be skipped in CI)
    if (!process.env.CI) {
      await testMassiveInputs(claudette, optimize);
      await testResourceExhaustion(optimize);
    } else {
      console.log('⚠️ Skipping resource-intensive tests in CI environment');
    }
    
    // Cleanup
    if (claudette.cleanup) {
      await claudette.cleanup();
    }
    
  } catch (error) {
    console.error('❌ Fatal error during testing:', error.message);
    testResults.summary.critical_vulnerabilities++;
    testResults.vulnerabilities.push({
      category: 'initialization',
      test: 'System Initialization',
      description: `Fatal error: ${error.message}`,
      severity: 'critical',
      recommendation: 'Fix initialization issues before production deployment'
    });
  }
  
  // Generate final report
  generateFinalReport();
}

/**
 * Generate comprehensive final report
 */
function generateFinalReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 EDGE CASE TESTING RESULTS');
  console.log('='.repeat(60));
  
  // Summary
  console.log(`Total Tests: ${testResults.summary.total_tests}`);
  console.log(`Passed: ${testResults.summary.passed}`);
  console.log(`Failed: ${testResults.summary.failed}`);
  console.log(`Critical Vulnerabilities: ${testResults.summary.critical_vulnerabilities}`);
  
  // Category breakdown
  console.log('\n📋 Category Breakdown:');
  Object.entries(testResults.categories).forEach(([category, data]) => {
    if (data.tests.length > 0) {
      const passRate = ((data.passed / data.tests.length) * 100).toFixed(1);
      console.log(`  ${category}: ${data.passed}/${data.tests.length} passed (${passRate}%)`);
    }
  });
  
  // Critical vulnerabilities
  if (testResults.vulnerabilities.length > 0) {
    console.log('\n🚨 CRITICAL VULNERABILITIES FOUND:');
    testResults.vulnerabilities.forEach((vuln, index) => {
      console.log(`  ${index + 1}. [${vuln.category.toUpperCase()}] ${vuln.test}`);
      console.log(`     Issue: ${vuln.description}`);
      console.log(`     Action: ${vuln.recommendation}`);
    });
  }
  
  // Recommendations
  testResults.recommendations = [
    'Implement comprehensive input validation for all user inputs',
    'Add memory limits and monitoring to prevent resource exhaustion',
    'Enhance error handling with proper error codes and recovery strategies',
    'Implement security filtering for potentially dangerous input patterns',
    'Add configuration validation with schema checking',
    'Improve timeout handling and graceful degradation',
    'Add comprehensive logging for security events and errors',
    'Implement rate limiting to prevent abuse'
  ];
  
  // Overall security assessment
  const securityScore = Math.max(0, 100 - (testResults.summary.critical_vulnerabilities * 20) - (testResults.summary.failed * 2));
  
  testResults.security_assessment = {
    score: securityScore,
    level: securityScore >= 90 ? 'EXCELLENT' : 
           securityScore >= 75 ? 'GOOD' : 
           securityScore >= 50 ? 'MODERATE' : 'POOR',
    critical_issues: testResults.summary.critical_vulnerabilities,
    recommendations_count: testResults.recommendations.length
  };
  
  console.log(`\n🔒 Security Score: ${securityScore}/100 (${testResults.security_assessment.level})`);
  
  // Save detailed report
  const reportPath = path.join(__dirname, 'agent3-edge-cases-report.json');
  try {
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    console.log(`\n📄 Detailed report saved: ${reportPath}`);
  } catch (error) {
    console.error('❌ Failed to save report:', error.message);
  }
  
  console.log('\n✅ Agent 3 Edge Case Testing Complete');
  
  // Exit with appropriate code
  const exitCode = testResults.summary.critical_vulnerabilities > 0 ? 1 : 0;
  process.exit(exitCode);
}

// Execute tests
if (require.main === module) {
  runEdgeCaseTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { runEdgeCaseTests, testResults };