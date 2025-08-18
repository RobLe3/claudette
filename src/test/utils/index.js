#!/usr/bin/env node

/**
 * Test Utilities Index
 * 
 * Consolidated export of all test infrastructure utilities.
 * Provides a single entry point for accessing test consolidation tools.
 */

const TestRunner = require('./TestRunner');
const TestBase = require('./TestBase');
const ErrorHandler = require('./ErrorHandler');
const DefaultConfiguration = require('./DefaultConfiguration');

module.exports = {
  TestRunner,
  TestBase,
  ErrorHandler,
  DefaultConfiguration,
  
  // Convenience factory methods
  createTestRunner: (options) => new TestRunner(options),
  createTestBase: (options) => new TestBase(options),
  createErrorHandler: (options) => new ErrorHandler(options),
  createConfiguration: (options) => new DefaultConfiguration(options),
  
  // Static helper methods
  runTest: TestRunner.run,
  handleError: ErrorHandler.handle,
  retryOperation: ErrorHandler.retry,
  categorizeError: ErrorHandler.categorize,
  getTestConfig: DefaultConfiguration.forTestType,
  getBackendConfig: DefaultConfiguration.forBackend,
  getRAGConfig: DefaultConfiguration.forRAG
};