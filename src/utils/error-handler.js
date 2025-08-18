#!/usr/bin/env node

/**
 * Consolidated Error Handler for Claudette Platform
 * Eliminates duplicate error handling patterns across modules
 */

const fs = require('fs').promises;
const path = require('path');

class ErrorHandler {
  constructor(options = {}) {
    this.options = {
      logToFile: options.logToFile || false,
      logFilePath: options.logFilePath || path.join(process.cwd(), 'claudette-errors.log'),
      logLevel: options.logLevel || 'info',
      enableStackTrace: options.enableStackTrace !== false,
      maxLogFileSize: options.maxLogFileSize || 10 * 1024 * 1024, // 10MB
      ...options
    };

    this.logLevels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  }

  /**
   * Main error handling method
   */
  async handleError(error, context = {}) {
    const errorInfo = this.analyzeError(error);
    const formattedError = this.formatError(errorInfo, context);
    
    await this.logError(formattedError);
    
    if (context.rethrow !== false) {
      throw this.createContextualError(errorInfo, context);
    }
    
    return formattedError;
  }

  /**
   * Analyze error type and characteristics
   */
  analyzeError(error) {
    const errorInfo = {
      type: error.constructor.name,
      message: error.message || 'Unknown error',
      stack: error.stack,
      code: error.code,
      syscall: error.syscall,
      path: error.path,
      timestamp: new Date().toISOString(),
      retryable: this.isRetryable(error),
      severity: this.determineSeverity(error)
    };

    // Add specific analysis for common error types
    if (error.code === 'ENOENT') {
      errorInfo.category = 'file_not_found';
      errorInfo.suggestion = 'Check if the file or directory exists';
    } else if (error.code === 'ECONNREFUSED') {
      errorInfo.category = 'connection_refused';
      errorInfo.suggestion = 'Check if the service is running and accessible';
    } else if (error.code === 'ETIMEDOUT') {
      errorInfo.category = 'timeout';
      errorInfo.suggestion = 'Increase timeout or check network connectivity';
    } else if (error.message?.includes('API key')) {
      errorInfo.category = 'authentication';
      errorInfo.suggestion = 'Verify API key configuration';
    } else if (error.message?.includes('rate limit')) {
      errorInfo.category = 'rate_limit';
      errorInfo.suggestion = 'Implement retry with backoff';
    }

    return errorInfo;
  }

  /**
   * Determine if error is retryable
   */
  isRetryable(error) {
    const retryableCodes = [
      'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN',
      'ECONNRESET', 'EPIPE', 'EHOSTUNREACH'
    ];
    
    const retryableMessages = [
      'rate limit', 'timeout', 'temporary failure',
      'service unavailable', 'try again later'
    ];

    if (retryableCodes.includes(error.code)) {
      return true;
    }

    const message = error.message?.toLowerCase() || '';
    return retryableMessages.some(msg => message.includes(msg));
  }

  /**
   * Determine error severity
   */
  determineSeverity(error) {
    if (error.type === 'TypeError' || error.type === 'ReferenceError') {
      return 'critical';
    }
    
    if (error.code === 'ENOENT' || error.code === 'EACCES') {
      return 'high';
    }
    
    if (error.code?.startsWith('E') && error.syscall) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Format error for consistent logging
   */
  formatError(errorInfo, context) {
    return {
      ...errorInfo,
      context: {
        operation: context.operation || 'unknown',
        component: context.component || 'unknown',
        userId: context.userId || null,
        sessionId: context.sessionId || null,
        requestId: context.requestId || null,
        ...context
      }
    };
  }

  /**
   * Create contextual error with additional information
   */
  createContextualError(errorInfo, context) {
    const message = context.operation 
      ? `${context.operation} failed: ${errorInfo.message}`
      : errorInfo.message;

    const error = new Error(message);
    error.originalError = errorInfo;
    error.context = context;
    error.retryable = errorInfo.retryable;
    error.severity = errorInfo.severity;
    
    return error;
  }

  /**
   * Log error to console and/or file
   */
  async logError(errorInfo) {
    const logLevel = this.logLevels[errorInfo.severity] || this.logLevels.info;
    const currentLevel = this.logLevels[this.options.logLevel];
    
    if (logLevel > currentLevel) {
      return; // Skip logging if below threshold
    }

    const logEntry = this.formatLogEntry(errorInfo);
    
    // Console logging
    this.logToConsole(errorInfo, logEntry);
    
    // File logging
    if (this.options.logToFile) {
      await this.logToFile(logEntry);
    }
  }

  /**
   * Format log entry
   */
  formatLogEntry(errorInfo) {
    const entry = {
      timestamp: errorInfo.timestamp,
      level: errorInfo.severity.toUpperCase(),
      type: errorInfo.type,
      message: errorInfo.message,
      context: errorInfo.context,
      retryable: errorInfo.retryable
    };

    if (this.options.enableStackTrace && errorInfo.stack) {
      entry.stack = errorInfo.stack;
    }

    return entry;
  }

  /**
   * Console logging with colors
   */
  logToConsole(errorInfo, logEntry) {
    const colors = {
      critical: '\x1b[31m',  // Red
      high: '\x1b[33m',      // Yellow
      medium: '\x1b[36m',    // Cyan
      low: '\x1b[37m',       // White
      reset: '\x1b[0m'
    };

    const color = colors[errorInfo.severity] || colors.low;
    const prefix = `${color}[${errorInfo.severity.toUpperCase()}]${colors.reset}`;
    
    console.error(`${prefix} ${logEntry.message}`);
    
    if (logEntry.context.operation !== 'unknown') {
      console.error(`  Operation: ${logEntry.context.operation}`);
    }
    
    if (errorInfo.suggestion) {
      console.error(`  Suggestion: ${errorInfo.suggestion}`);
    }
    
    if (this.options.enableStackTrace && errorInfo.stack) {
      console.error(`  Stack: ${errorInfo.stack}`);
    }
  }

  /**
   * File logging
   */
  async logToFile(logEntry) {
    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      
      // Check file size and rotate if needed
      await this.rotateLogIfNeeded();
      
      await fs.appendFile(this.options.logFilePath, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  /**
   * Rotate log file if it exceeds max size
   */
  async rotateLogIfNeeded() {
    try {
      const stats = await fs.stat(this.options.logFilePath);
      
      if (stats.size > this.options.maxLogFileSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedPath = `${this.options.logFilePath}.${timestamp}`;
        
        await fs.rename(this.options.logFilePath, rotatedPath);
      }
    } catch (error) {
      // File doesn't exist yet or other error - ignore
    }
  }

  /**
   * Wrap function with error handling
   */
  wrap(fn, context = {}) {
    const self = this;
    
    if (fn.constructor.name === 'AsyncFunction') {
      return async function(...args) {
        try {
          return await fn.apply(this, args);
        } catch (error) {
          await self.handleError(error, { ...context, rethrow: true });
        }
      };
    } else {
      return function(...args) {
        try {
          return fn.apply(this, args);
        } catch (error) {
          throw self.handleError(error, { ...context, rethrow: true });
        }
      };
    }
  }

  /**
   * Create error handling decorator
   */
  decorator(context = {}) {
    const self = this;
    
    return function(target, propertyKey, descriptor) {
      const originalMethod = descriptor.value;
      
      descriptor.value = self.wrap(originalMethod, {
        ...context,
        component: target.constructor.name,
        operation: propertyKey
      });
      
      return descriptor;
    };
  }
}

// Singleton instance
let instance = null;

function getErrorHandler(options = {}) {
  if (!instance) {
    instance = new ErrorHandler(options);
  }
  return instance;
}

function resetErrorHandler() {
  instance = null;
}

// Convenience functions for common error handling patterns
async function withErrorHandling(fn, context = {}) {
  const handler = getErrorHandler();
  const wrappedFn = handler.wrap(fn, context);
  return wrappedFn();
}

function tryWithDefault(fn, defaultValue, context = {}) {
  try {
    return fn();
  } catch (error) {
    const handler = getErrorHandler();
    handler.handleError(error, { ...context, rethrow: false });
    return defaultValue;
  }
}

module.exports = {
  ErrorHandler,
  getErrorHandler,
  resetErrorHandler,
  withErrorHandling,
  tryWithDefault
};