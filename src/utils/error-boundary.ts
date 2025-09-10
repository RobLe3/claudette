/**
 * Error Boundary and Standardized Error Handling for Claudette
 * Provides consistent error handling patterns across the system
 */

export enum ErrorCategory {
  CONFIGURATION = 'configuration',
  BACKEND = 'backend',
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  RATE_LIMIT = 'rate_limit',
  QUOTA = 'quota',
  INTERNAL = 'internal',
  SECURITY = 'security'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorContext {
  operation: string;
  backend?: string;
  requestId?: string;
  userId?: string;
  timestamp: string;
  stack?: string;
  metadata?: Record<string, any>;
}

export interface RecoveryAction {
  type: 'retry' | 'fallback' | 'circuit_breaker' | 'manual' | 'none';
  description: string;
  autoExecute: boolean;
  maxAttempts?: number;
  retryDelay?: number;
}

export class ClaudetteError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly recovery: RecoveryAction;
  public readonly isRetryable: boolean;
  public readonly userMessage: string;

  constructor(
    message: string,
    code: string,
    category: ErrorCategory = ErrorCategory.INTERNAL,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: Partial<ErrorContext> = {},
    recovery: Partial<RecoveryAction> = {}
  ) {
    super(message);
    this.name = 'ClaudetteError';
    this.code = code;
    this.category = category;
    this.severity = severity;
    
    this.context = {
      operation: 'unknown',
      timestamp: new Date().toISOString(),
      stack: this.stack,
      ...context
    };
    
    this.recovery = {
      type: 'none',
      description: 'No automatic recovery available',
      autoExecute: false,
      ...recovery
    };
    
    this.isRetryable = recovery.type === 'retry' || recovery.type === 'fallback';
    this.userMessage = this.generateUserMessage();
  }

  private generateUserMessage(): string {
    switch (this.category) {
      case ErrorCategory.CONFIGURATION:
        return `Configuration issue: ${this.message}. Please check your settings.`;
      
      case ErrorCategory.BACKEND:
        return `Backend service temporarily unavailable. ${this.recovery.description}`;
      
      case ErrorCategory.NETWORK:
        return `Network connection issue. Please check your internet connection and try again.`;
      
      case ErrorCategory.AUTHENTICATION:
        return `Authentication failed. Please verify your API credentials.`;
      
      case ErrorCategory.RATE_LIMIT:
        return `Rate limit exceeded. Please wait before making more requests.`;
      
      case ErrorCategory.QUOTA:
        return `Usage quota exceeded. Please check your plan limits.`;
      
      case ErrorCategory.VALIDATION:
        return `Invalid input: ${this.message}`;
      
      case ErrorCategory.SECURITY:
        return `Security violation detected. Request has been blocked.`;
      
      default:
        return `An error occurred: ${this.message}`;
    }
  }

  public toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      context: this.context,
      recovery: this.recovery,
      isRetryable: this.isRetryable,
      userMessage: this.userMessage
    };
  }

  public static fromError(
    error: Error,
    code: string = 'UNKNOWN_ERROR',
    category: ErrorCategory = ErrorCategory.INTERNAL,
    context: Partial<ErrorContext> = {}
  ): ClaudetteError {
    if (error instanceof ClaudetteError) {
      return error;
    }

    // Detect common error patterns
    const detectedInfo = this.detectErrorPattern(error);
    
    return new ClaudetteError(
      error.message,
      code,
      detectedInfo.category || category,
      detectedInfo.severity,
      {
        stack: error.stack,
        ...context
      },
      detectedInfo.recovery
    );
  }

  private static detectErrorPattern(error: Error): {
    category: ErrorCategory;
    severity: ErrorSeverity;
    recovery: Partial<RecoveryAction>;
  } {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Network errors
    if (message.includes('econnrefused') || message.includes('enotfound') || 
        message.includes('network') || message.includes('timeout')) {
      return {
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
        recovery: {
          type: 'retry',
          description: 'Network issue detected - automatic retry in progress',
          autoExecute: true,
          maxAttempts: 3,
          retryDelay: 2000
        }
      };
    }

    // Authentication errors
    if (message.includes('unauthorized') || message.includes('401') || 
        message.includes('forbidden') || message.includes('403') ||
        message.includes('api key') || message.includes('invalid key')) {
      return {
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.CRITICAL,
        recovery: {
          type: 'manual',
          description: 'Please verify your API credentials',
          autoExecute: false
        }
      };
    }

    // Rate limit errors
    if (message.includes('rate limit') || message.includes('429') ||
        message.includes('too many requests')) {
      return {
        category: ErrorCategory.RATE_LIMIT,
        severity: ErrorSeverity.MEDIUM,
        recovery: {
          type: 'retry',
          description: 'Rate limit exceeded - waiting before retry',
          autoExecute: true,
          maxAttempts: 5,
          retryDelay: 5000
        }
      };
    }

    // Validation errors
    if (name.includes('validation') || message.includes('invalid') ||
        message.includes('required') || message.includes('format')) {
      return {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        recovery: {
          type: 'none',
          description: 'Please check your input and try again',
          autoExecute: false
        }
      };
    }

    // Default internal error
    return {
      category: ErrorCategory.INTERNAL,
      severity: ErrorSeverity.MEDIUM,
      recovery: {
        type: 'none',
        description: 'Internal error - please try again or contact support',
        autoExecute: false
      }
    };
  }
}

export class ErrorBoundary {
  private static errorHandlers = new Map<ErrorCategory, (error: ClaudetteError) => Promise<void>>();
  private static globalErrorHandler: ((error: ClaudetteError) => Promise<void>) | null = null;

  /**
   * Register a category-specific error handler
   */
  static registerHandler(category: ErrorCategory, handler: (error: ClaudetteError) => Promise<void>): void {
    this.errorHandlers.set(category, handler);
  }

  /**
   * Register a global error handler that catches all errors
   */
  static registerGlobalHandler(handler: (error: ClaudetteError) => Promise<void>): void {
    this.globalErrorHandler = handler;
  }

  /**
   * Handle an error with appropriate category handler or global handler
   */
  static async handleError(error: Error | ClaudetteError, context: Partial<ErrorContext> = {}): Promise<ClaudetteError> {
    const claudetteError = error instanceof ClaudetteError 
      ? error 
      : ClaudetteError.fromError(error, 'UNHANDLED_ERROR', ErrorCategory.INTERNAL, context);

    // Execute category-specific handler
    const categoryHandler = this.errorHandlers.get(claudetteError.category);
    if (categoryHandler) {
      try {
        await categoryHandler(claudetteError);
      } catch (handlerError) {
        console.error('Error in category handler:', handlerError);
      }
    }

    // Execute global handler
    if (this.globalErrorHandler) {
      try {
        await this.globalErrorHandler(claudetteError);
      } catch (handlerError) {
        console.error('Error in global handler:', handlerError);
      }
    }

    // Log error with structured format
    this.logError(claudetteError);

    return claudetteError;
  }

  /**
   * Wrap an async function with error boundary
   */
  static wrapAsync<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    operation: string,
    category: ErrorCategory = ErrorCategory.INTERNAL
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args);
      } catch (error) {
        const claudetteError = await this.handleError(error as Error, {
          operation,
          metadata: { args: args.length > 0 ? args : undefined }
        });
        throw claudetteError;
      }
    };
  }

  /**
   * Execute a function with retry logic based on error recovery settings
   */
  static async executeWithRetry<T>(
    fn: () => Promise<T>,
    operation: string,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: ClaudetteError | null = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = await this.handleError(error as Error, {
          operation,
          metadata: { attempt, maxAttempts }
        });

        // Don't retry if error is not retryable
        if (!lastError.isRetryable || attempt === maxAttempts) {
          throw lastError;
        }

        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  private static logError(error: ClaudetteError): void {
    const logLevel = this.getLogLevel(error.severity);
    const logMessage = {
      timestamp: error.context.timestamp,
      level: logLevel,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        category: error.category,
        severity: error.severity
      },
      context: error.context,
      recovery: error.recovery
    };

    switch (logLevel) {
      case 'error':
        console.error('🚨 [CLAUDETTE ERROR]', JSON.stringify(logMessage, null, 2));
        break;
      case 'warn':
        console.warn('⚠️  [CLAUDETTE WARN]', JSON.stringify(logMessage, null, 2));
        break;
      default:
        console.info('ℹ️  [CLAUDETTE INFO]', JSON.stringify(logMessage, null, 2));
    }
  }

  private static getLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      default:
        return 'info';
    }
  }
}

// Pre-configured error types for common scenarios
export const Errors = {
  // Configuration errors
  ConfigurationInvalid: (message: string, context?: Partial<ErrorContext>) => 
    new ClaudetteError(message, 'CONFIG_INVALID', ErrorCategory.CONFIGURATION, ErrorSeverity.HIGH, context),
  
  ConfigurationMissing: (field: string, context?: Partial<ErrorContext>) => 
    new ClaudetteError(`Required configuration missing: ${field}`, 'CONFIG_MISSING', ErrorCategory.CONFIGURATION, ErrorSeverity.HIGH, context),

  // Backend errors
  BackendUnavailable: (backend: string, context?: Partial<ErrorContext>) => 
    new ClaudetteError(`Backend ${backend} is unavailable`, 'BACKEND_UNAVAILABLE', ErrorCategory.BACKEND, ErrorSeverity.HIGH, context, {
      type: 'fallback',
      description: 'Attempting to use alternative backend',
      autoExecute: true
    }),

  BackendTimeout: (backend: string, timeout: number, context?: Partial<ErrorContext>) => 
    new ClaudetteError(`Backend ${backend} timed out after ${timeout}ms`, 'BACKEND_TIMEOUT', ErrorCategory.BACKEND, ErrorSeverity.MEDIUM, context, {
      type: 'retry',
      description: 'Network timeout - retrying with increased timeout',
      autoExecute: true,
      maxAttempts: 2,
      retryDelay: 3000
    }),

  // Authentication errors  
  InvalidApiKey: (backend: string, context?: Partial<ErrorContext>) => 
    new ClaudetteError(`Invalid API key for ${backend}`, 'INVALID_API_KEY', ErrorCategory.AUTHENTICATION, ErrorSeverity.CRITICAL, context),

  // Validation errors
  InvalidInput: (message: string, context?: Partial<ErrorContext>) => 
    new ClaudetteError(message, 'INVALID_INPUT', ErrorCategory.VALIDATION, ErrorSeverity.MEDIUM, context),

  // Rate limit errors
  RateLimitExceeded: (backend: string, resetTime?: number, context?: Partial<ErrorContext>) => 
    new ClaudetteError(`Rate limit exceeded for ${backend}`, 'RATE_LIMIT_EXCEEDED', ErrorCategory.RATE_LIMIT, ErrorSeverity.MEDIUM, context, {
      type: 'retry',
      description: resetTime ? `Rate limit resets in ${resetTime}s` : 'Rate limit exceeded - waiting before retry',
      autoExecute: true,
      maxAttempts: 3,
      retryDelay: resetTime ? resetTime * 1000 : 30000
    }),

  // Security errors
  SecurityViolation: (message: string, context?: Partial<ErrorContext>) => 
    new ClaudetteError(message, 'SECURITY_VIOLATION', ErrorCategory.SECURITY, ErrorSeverity.CRITICAL, context)
};

export default ErrorBoundary;