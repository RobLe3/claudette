/**
 * Advanced Circuit Breaker for Claudette Backend Router
 * Provides intelligent failure pattern detection and progressive recovery
 */

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenMaxCalls: number;
  failureRateThreshold: number; // Percentage of failures to trigger circuit
  slowCallThreshold: number; // Milliseconds to consider a call slow
  slowCallRateThreshold: number; // Percentage of slow calls to trigger circuit
  slidingWindowSize: number; // Number of calls to track
}

export interface CallResult {
  success: boolean;
  duration: number;
  error?: string;
  timestamp: number;
}

export interface FailurePattern {
  type: 'timeout' | 'connection' | 'rate_limit' | 'server_error' | 'unknown';
  frequency: number;
  averageDuration: number;
  firstOccurrence: number;
  lastOccurrence: number;
  recoveryStrategy: 'exponential_backoff' | 'linear_backoff' | 'immediate_retry' | 'circuit_open';
}

export enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing, blocking calls
  HALF_OPEN = 'half_open' // Testing recovery
}

export class AdvancedCircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private halfOpenCalls: number = 0;
  private callHistory: CallResult[] = [];
  private failurePatterns: Map<string, FailurePattern> = new Map();
  private stateChangeListeners: ((state: CircuitState, reason: string) => void)[] = [];

  constructor(
    private backendName: string,
    private config: CircuitBreakerConfig
  ) {}

  /**
   * Execute a call through the circuit breaker
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName: string = 'unknown'
  ): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        throw new Error(`Circuit breaker is OPEN for ${this.backendName}. ${this.getRecoveryMessage()}`);
      }
    }

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        throw new Error(`Circuit breaker is HALF_OPEN and max calls exceeded for ${this.backendName}`);
      }
      this.halfOpenCalls++;
    }

    const startTime = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      this.recordSuccess(duration, operationName);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordFailure(duration, error instanceof Error ? error.message : String(error), operationName);
      throw error;
    }
  }

  /**
   * Record a successful call
   */
  private recordSuccess(duration: number, operationName: string): void {
    const callResult: CallResult = {
      success: true,
      duration,
      timestamp: Date.now()
    };

    this.addToHistory(callResult);

    if (this.state === CircuitState.HALF_OPEN) {
      const recentCalls = this.getRecentCalls();
      const successRate = recentCalls.filter(c => c.success).length / recentCalls.length;
      
      if (successRate >= (1 - this.config.failureRateThreshold / 100)) {
        this.transitionToClosed();
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  /**
   * Record a failed call
   */
  private recordFailure(duration: number, error: string, operationName: string): void {
    const callResult: CallResult = {
      success: false,
      duration,
      error,
      timestamp: Date.now()
    };

    this.addToHistory(callResult);
    this.analyzeFailurePattern(error, duration);

    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionToOpen('Failure in half-open state');
    } else if (this.shouldOpenCircuit()) {
      this.transitionToOpen('Failure threshold exceeded');
    }
  }

  /**
   * Analyze failure patterns for intelligent recovery
   */
  private analyzeFailurePattern(error: string, duration: number): void {
    const patternType = this.classifyError(error);
    const existing = this.failurePatterns.get(patternType);
    const now = Date.now();

    if (existing) {
      existing.frequency++;
      existing.averageDuration = (existing.averageDuration + duration) / 2;
      existing.lastOccurrence = now;
      existing.recoveryStrategy = this.determineRecoveryStrategy(existing, patternType);
    } else {
      this.failurePatterns.set(patternType, {
        type: patternType as any,
        frequency: 1,
        averageDuration: duration,
        firstOccurrence: now,
        lastOccurrence: now,
        recoveryStrategy: this.determineRecoveryStrategy(null, patternType)
      });
    }
  }

  /**
   * Classify error type for pattern analysis
   */
  private classifyError(error: string): string {
    const errorLower = error.toLowerCase();
    
    if (errorLower.includes('timeout') || errorLower.includes('timed out')) {
      return 'timeout';
    } else if (errorLower.includes('connection') || errorLower.includes('econnrefused') || errorLower.includes('enotfound')) {
      return 'connection';
    } else if (errorLower.includes('rate limit') || errorLower.includes('429')) {
      return 'rate_limit';
    } else if (errorLower.includes('500') || errorLower.includes('502') || errorLower.includes('503') || errorLower.includes('504')) {
      return 'server_error';
    } else {
      return 'unknown';
    }
  }

  /**
   * Determine optimal recovery strategy based on failure patterns
   */
  private determineRecoveryStrategy(existing: FailurePattern | null, errorType: string): FailurePattern['recoveryStrategy'] {
    if (errorType === 'rate_limit') {
      return 'exponential_backoff';
    } else if (errorType === 'timeout' && existing && existing.frequency > 3) {
      return 'exponential_backoff';
    } else if (errorType === 'connection') {
      return 'linear_backoff';
    } else if (errorType === 'server_error' && existing && existing.frequency > 5) {
      return 'circuit_open';
    } else {
      return 'immediate_retry';
    }
  }

  /**
   * Check if circuit should be opened
   */
  private shouldOpenCircuit(): boolean {
    const recentCalls = this.getRecentCalls();
    if (recentCalls.length < 5) return false; // Need minimum calls for analysis

    const failureRate = (recentCalls.filter(c => !c.success).length / recentCalls.length) * 100;
    const slowCallRate = (recentCalls.filter(c => c.duration > this.config.slowCallThreshold).length / recentCalls.length) * 100;

    return (
      this.failureCount >= this.config.failureThreshold ||
      failureRate >= this.config.failureRateThreshold ||
      slowCallRate >= this.config.slowCallRateThreshold
    );
  }

  /**
   * Check if circuit should attempt reset
   */
  private shouldAttemptReset(): boolean {
    const timeSinceLastFailure = Date.now() - this.lastFailureTime;
    const baseTimeout = this.config.resetTimeout;
    
    // Use failure patterns to determine optimal reset time
    const dominantPattern = this.getDominantFailurePattern();
    let adjustedTimeout = baseTimeout;

    if (dominantPattern) {
      switch (dominantPattern.recoveryStrategy) {
        case 'exponential_backoff':
          adjustedTimeout = baseTimeout * Math.pow(2, Math.min(dominantPattern.frequency - 1, 4));
          break;
        case 'linear_backoff':
          adjustedTimeout = baseTimeout * (1 + dominantPattern.frequency * 0.5);
          break;
        case 'circuit_open':
          adjustedTimeout = baseTimeout * 3; // Longer wait for persistent issues
          break;
        default:
          adjustedTimeout = baseTimeout;
      }
    }

    return timeSinceLastFailure >= adjustedTimeout;
  }

  /**
   * Get the most frequent failure pattern
   */
  private getDominantFailurePattern(): FailurePattern | null {
    if (this.failurePatterns.size === 0) return null;

    return Array.from(this.failurePatterns.values())
      .sort((a, b) => b.frequency - a.frequency)[0];
  }

  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(): void {
    const previousState = this.state;
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.halfOpenCalls = 0;
    
    // Clear old failure patterns on successful recovery
    const now = Date.now();
    for (const [key, pattern] of this.failurePatterns.entries()) {
      if (now - pattern.lastOccurrence > 300000) { // 5 minutes
        this.failurePatterns.delete(key);
      }
    }

    this.notifyStateChange(previousState, 'Circuit recovered - successful calls in half-open state');
  }

  /**
   * Transition to OPEN state
   */
  private transitionToOpen(reason: string): void {
    const previousState = this.state;
    this.state = CircuitState.OPEN;
    this.notifyStateChange(previousState, reason);
  }

  /**
   * Transition to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    const previousState = this.state;
    this.state = CircuitState.HALF_OPEN;
    this.halfOpenCalls = 0;
    this.notifyStateChange(previousState, 'Attempting recovery - testing backend health');
  }

  /**
   * Add call result to history and maintain sliding window
   */
  private addToHistory(result: CallResult): void {
    this.callHistory.push(result);
    if (this.callHistory.length > this.config.slidingWindowSize) {
      this.callHistory = this.callHistory.slice(-this.config.slidingWindowSize);
    }
  }

  /**
   * Get recent calls within the sliding window
   */
  private getRecentCalls(): CallResult[] {
    const cutoff = Date.now() - (5 * 60 * 1000); // Last 5 minutes
    return this.callHistory.filter(call => call.timestamp > cutoff);
  }

  /**
   * Get recovery message based on failure patterns
   */
  private getRecoveryMessage(): string {
    const dominantPattern = this.getDominantFailurePattern();
    if (!dominantPattern) {
      return 'Will retry shortly.';
    }

    const timeToWait = this.getTimeUntilNextAttempt();
    
    switch (dominantPattern.type) {
      case 'rate_limit':
        return `Rate limit detected. Will retry in ${Math.ceil(timeToWait / 1000)}s.`;
      case 'timeout':
        return `Timeout pattern detected. Using extended backoff. Next attempt in ${Math.ceil(timeToWait / 1000)}s.`;
      case 'connection':
        return `Connection issues detected. Will retry with progressive backoff.`;
      case 'server_error':
        return `Server errors detected. Extended circuit open period.`;
      default:
        return `Circuit temporarily open. Next attempt in ${Math.ceil(timeToWait / 1000)}s.`;
    }
  }

  /**
   * Calculate time until next attempt
   */
  private getTimeUntilNextAttempt(): number {
    const timeSinceLastFailure = Date.now() - this.lastFailureTime;
    const dominantPattern = this.getDominantFailurePattern();
    let adjustedTimeout = this.config.resetTimeout;

    if (dominantPattern) {
      switch (dominantPattern.recoveryStrategy) {
        case 'exponential_backoff':
          adjustedTimeout = this.config.resetTimeout * Math.pow(2, Math.min(dominantPattern.frequency - 1, 4));
          break;
        case 'linear_backoff':
          adjustedTimeout = this.config.resetTimeout * (1 + dominantPattern.frequency * 0.5);
          break;
        case 'circuit_open':
          adjustedTimeout = this.config.resetTimeout * 3;
          break;
      }
    }

    return Math.max(0, adjustedTimeout - timeSinceLastFailure);
  }

  /**
   * Register state change listener
   */
  onStateChange(listener: (state: CircuitState, reason: string) => void): void {
    this.stateChangeListeners.push(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private notifyStateChange(previousState: CircuitState, reason: string): void {
    console.log(`[CircuitBreaker:${this.backendName}] ${previousState} → ${this.state}: ${reason}`);
    
    for (const listener of this.stateChangeListeners) {
      try {
        listener(this.state, reason);
      } catch (error) {
        // Internal debug logging - no user input involved
        console.error('Error in circuit breaker state change listener:', error);
      }
    }
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): {
    state: CircuitState;
    failureCount: number;
    callHistory: CallResult[];
    failurePatterns: FailurePattern[];
    timeUntilNextAttempt?: number;
    recoveryStrategy?: string;
  } {
    const stats = {
      state: this.state,
      failureCount: this.failureCount,
      callHistory: [...this.callHistory],
      failurePatterns: Array.from(this.failurePatterns.values())
    };

    if (this.state === CircuitState.OPEN) {
      return {
        ...stats,
        timeUntilNextAttempt: this.getTimeUntilNextAttempt(),
        recoveryStrategy: this.getDominantFailurePattern()?.recoveryStrategy
      };
    }

    return stats;
  }

  /**
   * Manually reset circuit breaker (for testing/maintenance)
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.halfOpenCalls = 0;
    this.callHistory = [];
    this.failurePatterns.clear();
    console.log(`[CircuitBreaker:${this.backendName}] Manually reset to CLOSED state`);
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Check if circuit is allowing calls
   */
  isCallAllowed(): boolean {
    if (this.state === CircuitState.CLOSED) return true;
    if (this.state === CircuitState.HALF_OPEN && this.halfOpenCalls < this.config.halfOpenMaxCalls) return true;
    if (this.state === CircuitState.OPEN && this.shouldAttemptReset()) return true;
    return false;
  }
}

export default AdvancedCircuitBreaker;