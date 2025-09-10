// Secure Logger - Enhanced logging with API key masking and detailed debugging
// Provides secure logging for backend operations with sensitive data protection

export interface LogContext {
  backend?: string;
  operation?: string;
  timestamp?: string;
  requestId?: string;
  [key: string]: any;
}

export interface BackendErrorDetails {
  backend: string;
  operation: string;
  error: Error;
  context?: LogContext;
  apiKeyMasked?: boolean;
  retryable?: boolean;
  circuitBreakerOpen?: boolean;
}

export class SecureLogger {
  private static instance: SecureLogger;
  private logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';
  private maskSensitiveData: boolean = true;

  private constructor() {}

  static getInstance(): SecureLogger {
    if (!SecureLogger.instance) {
      SecureLogger.instance = new SecureLogger();
    }
    return SecureLogger.instance;
  }

  /**
   * Set logging level
   */
  setLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
    this.logLevel = level;
  }

  /**
   * Enable/disable sensitive data masking
   */
  setMaskSensitiveData(mask: boolean): void {
    this.maskSensitiveData = mask;
  }

  /**
   * Mask sensitive information in strings
   */
  private maskSensitive(text: string): string {
    if (!this.maskSensitiveData) {
      return text;
    }

    // Mask API keys (various patterns)
    let masked = text
      .replace(/sk-[a-zA-Z0-9]{48}/g, 'sk-***MASKED***') // OpenAI keys
      .replace(/xoxb-[a-zA-Z0-9-]+/g, 'xoxb-***MASKED***') // Slack bot tokens
      .replace(/Bearer\s+([a-zA-Z0-9+/=]{32,})/g, 'Bearer ***MASKED***') // Bearer tokens
      .replace(/"api_key":\s*"[^"]+"/g, '"api_key": "***MASKED***"') // JSON API keys
      .replace(/'api_key':\s*'[^']+'/g, "'api_key': '***MASKED***'") // Single quote JSON
      .replace(/Authorization:\s*[a-zA-Z0-9+/=]{20,}/g, 'Authorization: ***MASKED***') // Auth headers
      .replace(/token["\s]*[:=]["\s]*[a-zA-Z0-9+/=]{20,}/gi, 'token: "***MASKED***"') // Generic tokens
      .replace(/password["\s]*[:=]["\s]*[^"\s,}]+/gi, 'password: "***MASKED***"') // Passwords
      .replace(/secret["\s]*[:=]["\s]*[^"\s,}]+/gi, 'secret: "***MASKED***"'); // Secrets

    // Mask URLs with credentials
    masked = masked.replace(
      /(https?:\/\/)([^:]+):([^@]+)@/g,
      '$1***MASKED***:***MASKED***@'
    );

    return masked;
  }

  /**
   * Mask sensitive data in objects
   */
  private maskObject(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const masked = Array.isArray(obj) ? [...obj] : { ...obj };

    for (const key in masked) {
      const lowerKey = key.toLowerCase();
      
      // Mask sensitive keys
      if (lowerKey.includes('key') || 
          lowerKey.includes('token') || 
          lowerKey.includes('secret') || 
          lowerKey.includes('password') ||
          lowerKey.includes('auth')) {
        masked[key] = '***MASKED***';
      } else if (typeof masked[key] === 'string') {
        masked[key] = this.maskSensitive(masked[key]);
      } else if (typeof masked[key] === 'object') {
        masked[key] = this.maskObject(masked[key]);
      }
    }

    return masked;
  }

  /**
   * Format log message with context
   */
  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? JSON.stringify(this.maskObject(context), null, 2) : '';
    
    let formatted = `[${timestamp}] [${level.toUpperCase()}] ${this.maskSensitive(message)}`;
    
    if (contextStr) {
      formatted += `\nContext: ${contextStr}`;
    }

    return formatted;
  }

  /**
   * Check if log level should be output
   */
  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.logLevel];
  }

  /**
   * Debug logging (lowest level)
   */
  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  /**
   * Info logging
   */
  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  /**
   * Warning logging
   */
  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  /**
   * Error logging (highest level)
   */
  error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, context));
    }
  }

  /**
   * Specialized backend error logging
   */
  logBackendError(details: BackendErrorDetails): void {
    const context: LogContext = {
      backend: details.backend,
      operation: details.operation,
      error_name: details.error.name,
      error_message: details.error.message,
      retryable: details.retryable,
      circuit_breaker_open: details.circuitBreakerOpen,
      stack_trace: process.env.NODE_ENV === 'development' ? details.error.stack : undefined,
      ...details.context
    };

    this.error(
      `Backend operation failed: ${details.backend}.${details.operation}`,
      context
    );
  }

  /**
   * Log backend health check results
   */
  logHealthCheck(backend: string, healthy: boolean, error?: Error, latency?: number): void {
    const level = healthy ? 'debug' : 'warn';
    const message = `Backend health check: ${backend} ${healthy ? 'HEALTHY' : 'UNHEALTHY'}`;
    
    const context: LogContext = {
      backend,
      operation: 'health_check',
      healthy,
      latency_ms: latency,
      error_message: error?.message
    };

    if (level === 'debug') {
      this.debug(message, context);
    } else {
      this.warn(message, context);
    }
  }

  /**
   * Log backend request/response
   */
  logBackendRequest(
    backend: string, 
    success: boolean, 
    latency: number,
    tokens?: { input: number; output: number },
    cost?: number,
    error?: Error
  ): void {
    const level = success ? 'info' : 'error';
    const message = `Backend request: ${backend} ${success ? 'SUCCESS' : 'FAILED'}`;
    
    const context: LogContext = {
      backend,
      operation: 'send_request',
      success,
      latency_ms: latency,
      tokens_input: tokens?.input,
      tokens_output: tokens?.output,
      cost_eur: cost,
      error_message: error?.message
    };

    if (level === 'info') {
      this.info(message, context);
    } else {
      this.error(message, context);
    }
  }

  /**
   * Log circuit breaker events
   */
  logCircuitBreaker(
    backend: string, 
    event: 'opened' | 'closed' | 'half_open',
    failures?: number,
    nextRetry?: Date
  ): void {
    const message = `Circuit breaker ${event}: ${backend}`;
    
    const context: LogContext = {
      backend,
      operation: 'circuit_breaker',
      event,
      failure_count: failures,
      next_retry: nextRetry?.toISOString()
    };

    this.warn(message, context);
  }

  /**
   * Log router selection decisions
   */
  logBackendSelection(
    selectedBackend: string,
    availableBackends: string[],
    scores?: Array<{ backend: string; score: number; reason?: string }>,
    fallback?: boolean
  ): void {
    const message = `Backend selected: ${selectedBackend}${fallback ? ' (fallback)' : ''}`;
    
    const context: LogContext = {
      operation: 'backend_selection',
      selected_backend: selectedBackend,
      available_backends: availableBackends,
      backend_scores: scores,
      is_fallback: fallback
    };

    this.debug(message, context);
  }

  /**
   * Create a timestamped log entry for debugging
   */
  timestamp(label: string): void {
    if (this.shouldLog('debug')) {
      console.time(this.maskSensitive(label));
    }
  }

  /**
   * End a timestamped log entry
   */
  timeEnd(label: string): void {
    if (this.shouldLog('debug')) {
      console.timeEnd(this.maskSensitive(label));
    }
  }
}

// Export singleton instance
export const secureLogger = SecureLogger.getInstance();

// Convenience functions
export const logBackendError = (details: BackendErrorDetails) => secureLogger.logBackendError(details);
export const logHealthCheck = (backend: string, healthy: boolean, error?: Error, latency?: number) => 
  secureLogger.logHealthCheck(backend, healthy, error, latency);
export const logBackendRequest = (
  backend: string, 
  success: boolean, 
  latency: number,
  tokens?: { input: number; output: number },
  cost?: number,
  error?: Error
) => secureLogger.logBackendRequest(backend, success, latency, tokens, cost, error);
export const logCircuitBreaker = (
  backend: string, 
  event: 'opened' | 'closed' | 'half_open',
  failures?: number,
  nextRetry?: Date
) => secureLogger.logCircuitBreaker(backend, event, failures, nextRetry);
export const logBackendSelection = (
  selectedBackend: string,
  availableBackends: string[],
  scores?: Array<{ backend: string; score: number; reason?: string }>,
  fallback?: boolean
) => secureLogger.logBackendSelection(selectedBackend, availableBackends, scores, fallback);