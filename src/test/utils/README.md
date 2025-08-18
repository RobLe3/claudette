# Test Infrastructure Consolidation Utilities

This directory contains consolidated test infrastructure utilities that eliminate duplicate code patterns across the Claudette test framework. These utilities address the specific duplications identified in the test infrastructure audit.

## 🎯 Consolidation Targets Addressed

### 1. Test Exit Pattern Duplication (100% identical) ✅ ELIMINATED
- **Problem**: 10+ test files with identical `process.exit(result.success ? 0 : 1)` pattern
- **Files Affected**: `claudette-unit-tests.js`, `rag-integration-tests.js`, `qwen-code-quality.js`, etc.
- **Solution**: `TestRunner` utility provides unified test execution and exit handling

### 2. Test Structure Boilerplate (95% identical) ✅ CONSOLIDATED
- **Problem**: Multiple test files with identical setup/teardown patterns
- **Common Structure**: initialization, mock setup, result validation, cleanup
- **Solution**: `TestBase` class with common methods and lifecycle management

### 3. Error Handling Pattern Duplication (80% similar) ✅ STANDARDIZED
- **Problem**: Multiple files with try-catch-log-rethrow patterns
- **Issue**: Repeated error handling structure across modules
- **Solution**: `ErrorHandler` decorator/utility with categorization and retry logic

### 4. Backend Default Settings Duplication (90% identical) ✅ CENTRALIZED
- **Problem**: Configuration patterns across setup and backend files
- **Issue**: Repeated timeout values, retry counts, health check intervals
- **Solution**: `DefaultConfiguration` provider with environment-aware settings

## 🛠️ Utilities

### TestRunner (`TestRunner.js`)
Unified test execution and exit handling for all test suites.

```javascript
const { TestRunner } = require('./utils');

// Eliminates duplicate process.exit() patterns
TestRunner.run(testSuite, {
  verbose: true,
  timeout: 300000,
  exitOnCompletion: true
});
```

**Features:**
- Consistent test execution flow
- Standardized exit code handling (0 for success, 1 for failure)
- Error capturing and reporting
- Result aggregation and normalization
- Timeout management
- Report generation

### TestBase (`TestBase.js`)
Base class for common test structure patterns.

```javascript
const { TestBase } = require('./utils');

class MyTestSuite extends TestBase {
  async runTests() {
    this.describe('Feature Tests', () => {
      this.test('should work correctly', async () => {
        const result = await myFunction();
        this.expect(result).toBeTruthy();
      });
    });
  }
}
```

**Features:**
- Common test lifecycle methods (setup, teardown, cleanup)
- Standardized result tracking and reporting
- Mock creation and management utilities
- Environment detection and configuration
- Consistent logging and output formatting
- Temporary directory management
- Built-in assertion helpers

### ErrorHandler (`ErrorHandler.js`)
Standardized error handling with categorization and retry logic.

```javascript
const { ErrorHandler } = require('./utils');

const handler = new ErrorHandler();

// Automatic error categorization and handling
const result = await handler.withErrorHandling(async () => {
  return await riskyOperation();
}, { name: 'Risky Operation' });

// Retry logic with exponential backoff
const retryResult = await handler.withRetry(async () => {
  return await flakyOperation();
}, { maxRetries: 3, retryDelay: 1000 });
```

**Features:**
- Error categorization (network, filesystem, validation, timeout, etc.)
- Retry logic with exponential backoff
- Error recovery strategies
- Error aggregation and analysis
- Timeout and retry mechanisms
- Error context preservation
- Detailed error reporting

### DefaultConfiguration (`DefaultConfiguration.js`)
Centralized configuration management with environment awareness.

```javascript
const { DefaultConfiguration } = require('./utils');

// Get configuration for specific test types
const unitConfig = DefaultConfiguration.forTestType('unit');
const e2eConfig = DefaultConfiguration.forTestType('e2e');
const backendConfig = DefaultConfiguration.forBackend('openai');
```

**Features:**
- Environment-specific configuration overrides
- Configuration validation and normalization
- Dynamic configuration based on system capabilities
- Configuration inheritance and merging
- Type-safe configuration access
- Platform-specific optimizations (Windows, macOS, Linux)
- CI environment adjustments
- Resource constraint detection

## 📊 Configuration Defaults

### Timeouts
```javascript
{
  default: 120000,        // 2 minutes
  setup: 120000,          // 2 minutes
  unit: 30000,            // 30 seconds
  integration: 180000,    // 3 minutes
  e2e: 300000,           // 5 minutes
  performance: 600000,    // 10 minutes
  installation: 300000    // 5 minutes
}
```

### Retries
```javascript
{
  default: 3,
  network: 5,
  filesystem: 3,
  installation: 2,
  flaky: 5,
  critical: 1
}
```

### Performance Thresholds
```javascript
{
  setupTimeTarget: 120000,     // 2 minutes
  responseTimeThreshold: 5000, // 5 seconds
  regressionThreshold: 20,     // 20% performance regression
  successRateTarget: 95        // 95% success rate
}
```

## 🚀 Migration Guide

### Before (Duplicate Pattern)
```javascript
// DUPLICATE across 10+ test files
class OldTestSuite {
  constructor() {
    this.results = { passed: 0, failed: 0 };
  }
  
  async runAllTests() {
    // ... test logic
    return this.results.failed === 0;
  }
}

// DUPLICATE exit handling
if (require.main === module) {
  const testSuite = new OldTestSuite();
  testSuite.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);  // DUPLICATE PATTERN
    })
    .catch(error => {
      console.error('Test failed:', error.message);
      process.exit(1);  // DUPLICATE ERROR HANDLING
    });
}
```

### After (Consolidated)
```javascript
const { TestBase, TestRunner } = require('./utils');

class NewTestSuite extends TestBase {
  async runTests() {
    this.describe('Feature Tests', () => {
      this.test('should work', async () => {
        // Test implementation
      });
    });
  }
}

// UNIFIED exit handling
if (require.main === module) {
  const testSuite = new NewTestSuite();
  TestRunner.run(testSuite, { exitOnCompletion: true });
}
```

## 🧪 Example Usage

See the following files for complete migration examples:
- `kpi-framework-consolidated.js` - Simple test suite migration
- `qwen-code-quality-consolidated.js` - Complex test with quality metrics
- `consolidation-demo.js` - Demonstration of all utilities

## 🎯 Benefits

1. **Code Deduplication**: Eliminated 100% identical patterns across 10+ files
2. **Consistency**: Uniform behavior across all test suites
3. **Maintainability**: Single source of truth for test infrastructure
4. **Reliability**: Improved error handling and recovery
5. **Flexibility**: Environment-aware configuration
6. **Scalability**: Easy to extend and modify test behavior

## 📝 API Reference

### TestRunner Static Methods
- `TestRunner.run(testSuite, options)` - Execute test suite with unified handling

### TestBase Methods
- `describe(name, testFunction)` - Group related tests
- `test(name, testFunction)` - Define individual test
- `expect(value)` - Assertion helper
- `createMock(name, implementation)` - Create mock objects
- `createTempDirectory(prefix)` - Create temporary directories

### ErrorHandler Methods
- `withErrorHandling(operation, context)` - Execute with error handling
- `withRetry(operation, context)` - Execute with retry logic
- `withRecovery(operation, recoveryFunction)` - Execute with recovery
- `categorizeError(error)` - Categorize error types
- `analyzeErrors()` - Analyze error patterns

### DefaultConfiguration Methods
- `get(path, defaultValue)` - Get configuration value
- `getTestConfig(testType)` - Get test-specific configuration
- `getBackendConfig(backendType)` - Get backend configuration
- `getRAGConfig()` - Get RAG configuration

## 🔧 Environment Variables

The utilities respect the following environment variables:
- `CI` - Adjusts timeouts and retries for CI environments
- `EMERGENCY_MODE` - Enables emergency mode bypasses
- `NODE_ENV` - Adjusts logging and behavior
- `VERBOSE` - Controls logging verbosity

## 📦 Installation

These utilities are part of the Claudette test infrastructure and are automatically available when running tests within the project.

```javascript
// Import all utilities
const { TestRunner, TestBase, ErrorHandler, DefaultConfiguration } = require('./utils');

// Or import individually
const TestRunner = require('./utils/TestRunner');
```

---

*This consolidation work addresses the specific duplication patterns identified in the Claudette test infrastructure audit and provides a unified, maintainable foundation for all test suites.*