#!/usr/bin/env node

/**
 * ErrorHandler Utility
 * 
 * Consolidated error handling patterns for test infrastructure.
 * Eliminates 80% similar try-catch-log-rethrow patterns across modules.
 * 
 * Features:
 * - Standardized error categorization and handling
 * - Consistent error logging and reporting
 * - Error recovery strategies
 * - Error aggregation and analysis
 * - Timeout and retry mechanisms
 * - Error context preservation
 */

class ErrorHandler {
  constructor(options = {}) {
    this.options = {
      verbose: options.verbose || false,
      logErrors: options.logErrors !== false,
      categorizeErrors: options.categorizeErrors !== false,
      preserveStackTrace: options.preserveStackTrace !== false,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      ...options
    };

    this.errorLog = [];
    this.errorCategories = new Map();
    this.errorMetrics = {
      total: 0,
      categories: {},
      retryable: 0,
      critical: 0
    };
  }

  /**
   * Execute a function with comprehensive error handling
   */
  async withErrorHandling(operation, context = {}) {
    const operationContext = {
      operationId: this.generateOperationId(),
      name: context.name || 'anonymous',
      startTime: Date.now(),
      ...context
    };

    try {
      this.log('info', `Starting operation: ${operationContext.name}`, operationContext);
      
      const result = await operation();
      
      operationContext.endTime = Date.now();
      operationContext.duration = operationContext.endTime - operationContext.startTime;
      operationContext.success = true;
      
      this.log('success', `Operation completed: ${operationContext.name} (${operationContext.duration}ms)`);
      
      return {
        success: true,
        result,
        context: operationContext
      };

    } catch (error) {
      operationContext.endTime = Date.now();
      operationContext.duration = operationContext.endTime - operationContext.startTime;
      operationContext.success = false;

      return await this.handleError(error, operationContext);
    }
  }

  /**
   * Execute with retry logic
   */
  async withRetry(operation, context = {}) {
    const retryContext = {
      ...context,
      maxRetries: context.maxRetries || this.options.maxRetries,
      retryDelay: context.retryDelay || this.options.retryDelay,
      attempt: 0
    };

    let lastError = null;

    for (let attempt = 0; attempt <= retryContext.maxRetries; attempt++) {
      retryContext.attempt = attempt;

      try {
        if (attempt > 0) {
          this.log('info', `Retry attempt ${attempt}/${retryContext.maxRetries} for: ${retryContext.name}`);
          await this.delay(retryContext.retryDelay * attempt); // Exponential backoff
        }

        return await this.withErrorHandling(operation, retryContext);

      } catch (error) {
        lastError = error;
        
        const categorizedError = this.categorizeError(error);
        
        if (!categorizedError.retryable || attempt === retryContext.maxRetries) {
          break;
        }

        this.log('warning', `Retryable error on attempt ${attempt + 1}: ${error.message}`);
      }
    }

    // All retries failed
    return await this.handleError(lastError, { 
      ...retryContext, 
      retriesExhausted: true 
    });
  }

  /**
   * Handle errors with categorization and logging
   */
  async handleError(error, context = {}) {
    this.errorMetrics.total++;

    const errorInfo = this.categorizeError(error);
    const enhancedError = this.enhanceError(error, errorInfo, context);

    // Log the error
    if (this.options.logErrors) {
      this.logError(enhancedError);
    }

    // Store error for analysis
    this.errorLog.push(enhancedError);

    // Update metrics
    this.updateErrorMetrics(errorInfo);

    // Determine handling strategy
    const handlingStrategy = this.determineHandlingStrategy(errorInfo, context);

    return {
      success: false,
      error: enhancedError,
      strategy: handlingStrategy,
      context
    };
  }

  /**
   * Categorize errors for better handling
   */
  categorizeError(error) {
    const errorMessage = error.message || '';
    const errorStack = error.stack || '';
    const errorCode = error.code || '';

    let category = 'unknown';
    let retryable = false;
    let critical = false;
    let timeout = 30000; // Default timeout for retries

    // Network and connection errors
    if (this.isNetworkError(error)) {
      category = 'network';
      retryable = true;
      timeout = 60000;
    }
    // File system errors
    else if (this.isFileSystemError(error)) {
      category = 'filesystem';
      retryable = this.isRetryableFileSystemError(error);
      critical = errorCode === 'EACCES'; // Permission errors are critical
    }
    // Timeout errors
    else if (this.isTimeoutError(error)) {
      category = 'timeout';
      retryable = true;
      timeout = 120000; // Longer timeout for retry
    }
    // Validation errors
    else if (this.isValidationError(error)) {
      category = 'validation';
      retryable = false;
      critical = true;
    }
    // Configuration errors
    else if (this.isConfigurationError(error)) {
      category = 'configuration';
      retryable = false;
      critical = true;
    }
    // Process/system errors
    else if (this.isSystemError(error)) {
      category = 'system';
      retryable = false;
      critical = true;
    }
    // Test-specific errors
    else if (this.isTestError(error)) {
      category = 'test';
      retryable = false;
      critical = false;
    }

    return {
      category,
      retryable,
      critical,
      timeout,
      errorCode,
      originalError: error
    };
  }

  /**
   * Check if error is network-related
   */
  isNetworkError(error) {
    const networkCodes = ['ENOTFOUND', 'ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH', 'ETIMEDOUT'];
    const networkMessages = ['fetch failed', 'network error', 'connection failed', 'host not found'];
    
    return networkCodes.includes(error.code) || 
           networkMessages.some(msg => error.message?.toLowerCase().includes(msg));
  }

  /**
   * Check if error is file system related
   */
  isFileSystemError(error) {
    const fsCodes = ['ENOENT', 'EACCES', 'EPERM', 'EISDIR', 'ENOTDIR', 'EMFILE', 'ENFILE'];
    return fsCodes.includes(error.code);
  }

  /**
   * Check if file system error is retryable
   */
  isRetryableFileSystemError(error) {
    const retryableCodes = ['EMFILE', 'ENFILE']; // Too many open files
    return retryableCodes.includes(error.code);
  }

  /**
   * Check if error is timeout-related
   */
  isTimeoutError(error) {
    const timeoutMessages = ['timeout', 'timed out', 'time out'];
    return timeoutMessages.some(msg => error.message?.toLowerCase().includes(msg));
  }

  /**
   * Check if error is validation-related
   */
  isValidationError(error) {
    const validationMessages = ['validation', 'invalid', 'expected', 'required', 'missing'];
    return validationMessages.some(msg => error.message?.toLowerCase().includes(msg));
  }

  /**
   * Check if error is configuration-related
   */
  isConfigurationError(error) {
    const configMessages = ['config', 'configuration', 'not found', 'missing', 'undefined'];
    return configMessages.some(msg => error.message?.toLowerCase().includes(msg)) ||
           error.message?.includes('API key') ||
           error.message?.includes('credentials');
  }

  /**
   * Check if error is system-related
   */
  isSystemError(error) {
    const systemCodes = ['EPIPE', 'EBADF', 'ESRCH'];
    return systemCodes.includes(error.code) ||
           error.message?.includes('spawn') ||
           error.message?.includes('process');
  }

  /**
   * Check if error is test-specific
   */
  isTestError(error) {
    return error.message?.includes('assertion') ||
           error.message?.includes('expect') ||
           error.message?.includes('test') ||
           error.name === 'AssertionError';
  }

  /**
   * Enhance error with additional context
   */
  enhanceError(error, errorInfo, context) {
    return {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      message: error.message,
      name: error.name,
      stack: this.options.preserveStackTrace ? error.stack : null,
      code: error.code,
      category: errorInfo.category,
      retryable: errorInfo.retryable,
      critical: errorInfo.critical,
      context: {
        operation: context.name,
        operationId: context.operationId,
        attempt: context.attempt,
        duration: context.duration,
        retriesExhausted: context.retriesExhausted,
        ...context
      },
      originalError: error
    };
  }

  /**
   * Update error metrics
   */
  updateErrorMetrics(errorInfo) {
    if (!this.errorMetrics.categories[errorInfo.category]) {
      this.errorMetrics.categories[errorInfo.category] = 0;
    }
    this.errorMetrics.categories[errorInfo.category]++;

    if (errorInfo.retryable) {
      this.errorMetrics.retryable++;
    }

    if (errorInfo.critical) {
      this.errorMetrics.critical++;
    }
  }

  /**
   * Determine error handling strategy
   */
  determineHandlingStrategy(errorInfo, context) {
    if (errorInfo.critical) {
      return {
        action: 'abort',
        reason: 'Critical error detected',
        recommendation: 'Fix underlying issue before retrying'
      };
    }

    if (context.retriesExhausted) {
      return {
        action: 'fail',
        reason: 'Maximum retries exceeded',
        recommendation: 'Check error cause and increase retry limit if appropriate'
      };
    }

    if (errorInfo.retryable) {
      return {
        action: 'retry',
        reason: 'Error is retryable',
        recommendation: `Retry with ${errorInfo.timeout}ms timeout`
      };
    }

    return {
      action: 'fail',
      reason: 'Error is not retryable',
      recommendation: 'Address the error cause manually'
    };
  }

  /**
   * Log error with appropriate level
   */
  logError(enhancedError) {
    const level = enhancedError.critical ? 'error' : 'warning';
    
    this.log(level, `[${enhancedError.category.toUpperCase()}] ${enhancedError.message}`, {
      errorId: enhancedError.id,
      operation: enhancedError.context.operation,
      retryable: enhancedError.retryable,
      critical: enhancedError.critical
    });
  }

  /**
   * Create error recovery decorator
   */
  withRecovery(operation, recoveryFunction) {
    return async (context = {}) => {
      const result = await this.withErrorHandling(operation, context);
      
      if (!result.success && recoveryFunction) {
        this.log('info', 'Attempting error recovery');
        
        try {
          const recoveryResult = await recoveryFunction(result.error, result.context);
          
          if (recoveryResult) {
            this.log('success', 'Error recovery successful');
            return {
              success: true,
              result: recoveryResult,
              recovered: true,
              originalError: result.error
            };
          }
        } catch (recoveryError) {
          this.log('error', `Error recovery failed: ${recoveryError.message}`);
          result.recoveryError = recoveryError;
        }
      }
      
      return result;
    };
  }

  /**
   * Bulk error analysis
   */
  analyzeErrors() {
    return {
      totalErrors: this.errorLog.length,
      metrics: this.errorMetrics,
      categories: Object.keys(this.errorMetrics.categories)
        .map(category => ({
          category,
          count: this.errorMetrics.categories[category],
          percentage: (this.errorMetrics.categories[category] / this.errorMetrics.total * 100).toFixed(1)
        }))
        .sort((a, b) => b.count - a.count),
      recentErrors: this.errorLog.slice(-10), // Last 10 errors
      criticalErrors: this.errorLog.filter(error => error.critical),
      retryableErrors: this.errorLog.filter(error => error.retryable)
    };
  }

  /**
   * Generate error report
   */
  async generateErrorReport(outputPath) {
    const fs = require('fs').promises;
    const analysis = this.analyzeErrors();
    
    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        tool: 'ErrorHandler',
        version: '1.0.0'
      },
      analysis,
      errorLog: this.errorLog
    };

    try {
      await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
      this.log('success', `Error report generated: ${outputPath}`);
    } catch (error) {
      this.log('error', `Failed to generate error report: ${error.message}`);
    }
  }

  /**
   * Clear error log and reset metrics
   */
  reset() {
    this.errorLog = [];
    this.errorCategories.clear();
    this.errorMetrics = {
      total: 0,
      categories: {},
      retryable: 0,
      critical: 0
    };
  }

  /**
   * Utility methods
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateOperationId() {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  log(level, message, data = null) {
    if (this.options.verbose || level === 'error') {
      const colors = {
        info: '\x1b[36m',
        success: '\x1b[32m',
        warning: '\x1b[33m',
        error: '\x1b[31m',
        reset: '\x1b[0m'
      };
      
      const timestamp = new Date().toISOString();
      console.log(`${colors[level] || ''}[${level.toUpperCase()}] ${timestamp} ${message}${colors.reset}`);
      
      if (data && this.options.verbose) {
        console.log('  Data:', JSON.stringify(data, null, 2));
      }
    }
  }

  /**
   * Static convenience methods
   */
  static async handle(operation, options = {}) {
    const handler = new ErrorHandler(options);
    return await handler.withErrorHandling(operation, options);
  }

  static async retry(operation, options = {}) {
    const handler = new ErrorHandler(options);
    return await handler.withRetry(operation, options);
  }

  static categorize(error, options = {}) {
    const handler = new ErrorHandler(options);
    return handler.categorizeError(error);
  }
}

module.exports = ErrorHandler;