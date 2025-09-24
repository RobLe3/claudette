/**
 * Harmonized Timeout Configuration for Claudette Suite
 * 
 * This configuration ensures all timeouts work harmoniously with Claude Code's 120s limit
 * and provides optimal user experience across all use cases.
 * 
 * Design Principles:
 * - Cascading tolerance: Each layer has 25-30% more time than the layer below
 * - Claude Code compatibility: All operations complete within 120s
 * - Use case optimization: Different profiles for different scenarios
 * - Graceful degradation: Progressive timeout increases with retries
 */

export interface TimeoutProfile {
  name: string;
  description: string;
  healthChecks: number;
  quickOperations: number;
  simpleRequests: number;
  complexRequests: number;
  mcpOperations: number;
  totalAllowance: number;
}

/**
 * Core timeout hierarchy - foundation for all timeout calculations
 */
export const TIMEOUT_HIERARCHY = {
  // Level 1: Health Checks & Quick Operations (5-10s)
  HEALTH_CHECK_BASE: 8000,           // 8s - Base health check time
  HEALTH_CHECK_MAX: 12000,           // 12s - Maximum for complex health checks
  QUICK_OPERATION: 10000,            // 10s - Quick database/cache operations
  
  // Level 2: Backend Connections (15-20s)
  CONNECTION_ESTABLISHMENT: 15000,   // 15s - Backend connection setup
  CONNECTION_WITH_RETRY: 20000,      // 20s - Connection with one retry
  
  // Level 3: Simple AI Requests (30-40s)
  SIMPLE_REQUEST_BASE: 30000,        // 30s - Simple AI queries
  SIMPLE_REQUEST_WITH_RETRY: 40000,  // 40s - Simple queries with retry
  
  // Level 4: Complex AI Requests (60-75s)  
  COMPLEX_REQUEST_BASE: 60000,       // 60s - Complex AI operations
  COMPLEX_REQUEST_WITH_RETRY: 75000, // 75s - Complex operations with retry
  
  // Level 5: MCP Operations (90-105s)
  MCP_OPERATION_BASE: 90000,         // 90s - MCP operations
  MCP_OPERATION_MAX: 105000,         // 105s - Maximum MCP time
  
  // Level 6: Claude Code Total (120s)
  CLAUDE_CODE_LIMIT: 120000,         // 120s - Claude Code's timeout limit
  SAFETY_MARGIN: 115000              // 115s - Safe completion target
} as const;

/**
 * Use Case-Specific Timeout Profiles
 */
export const TIMEOUT_PROFILES: Record<string, TimeoutProfile> = {
  /**
   * Profile A: Quick Interactive (CLI)
   * Optimized for fast CLI interactions and simple queries
   */
  QUICK_INTERACTIVE: {
    name: 'Quick Interactive',
    description: 'Optimized for fast CLI interactions and simple queries',
    healthChecks: 8000,              // 8s
    quickOperations: 10000,          // 10s  
    simpleRequests: 35000,           // 35s
    complexRequests: 60000,          // 60s
    mcpOperations: 90000,            // 90s
    totalAllowance: 105000           // 105s total
  },

  /**
   * Profile B: Development Assistant  
   * Balanced for code analysis and development tasks
   */
  DEVELOPMENT_ASSISTANT: {
    name: 'Development Assistant',
    description: 'Balanced for code analysis and development tasks',
    healthChecks: 10000,             // 10s
    quickOperations: 12000,          // 12s
    simpleRequests: 40000,           // 40s
    complexRequests: 70000,          // 70s
    mcpOperations: 100000,           // 100s
    totalAllowance: 115000           // 115s total
  },

  /**
   * Profile C: Batch Processing
   * Optimized for longer-running batch operations
   */
  BATCH_PROCESSING: {
    name: 'Batch Processing', 
    description: 'Optimized for longer-running batch operations',
    healthChecks: 12000,             // 12s
    quickOperations: 15000,          // 15s
    simpleRequests: 45000,           // 45s
    complexRequests: 80000,          // 80s
    mcpOperations: 110000,           // 110s
    totalAllowance: 120000           // 120s total
  },

  /**
   * Profile D: Emergency Mode
   * Ultra-fast timeouts for quick responses only
   */
  EMERGENCY_MODE: {
    name: 'Emergency Mode',
    description: 'Ultra-fast timeouts for quick responses only',
    healthChecks: 5000,              // 5s
    quickOperations: 8000,           // 8s
    simpleRequests: 20000,           // 20s
    complexRequests: 30000,          // 30s
    mcpOperations: 45000,            // 45s
    totalAllowance: 60000            // 60s total
  }
};

/**
 * Backend-Specific Timeout Configurations
 * Each backend gets optimized timeouts based on typical performance
 */
export const BACKEND_TIMEOUTS = {
  OPENAI: {
    connection: 15000,               // 15s - Usually fast
    healthCheck: 8000,               // 8s
    simpleRequest: 25000,            // 25s - Optimized for speed
    complexRequest: 45000,           // 45s
    streaming: 60000                 // 60s - Streaming responses
  },
  
  QWEN: {
    connection: 18000,               // 18s - Slightly slower connection
    healthCheck: 10000,              // 10s
    simpleRequest: 30000,            // 30s
    complexRequest: 60000,           // 60s - Good for complex queries
    streaming: 90000                 // 90s - Longer streaming
  },
  
  CLAUDE: {
    connection: 20000,               // 20s - Can be slower
    healthCheck: 12000,              // 12s
    simpleRequest: 35000,            // 35s
    complexRequest: 70000,           // 70s - Excellent for complex work
    streaming: 100000                // 100s - Long-form responses
  },
  
  OLLAMA: {
    connection: 25000,               // 25s - Local deployment variation
    healthCheck: 15000,              // 15s - Local model loading
    simpleRequest: 40000,            // 40s - Local processing time
    complexRequest: 80000,           // 80s
    streaming: 120000                // 120s - Full local processing
  },
  
  CUSTOM: {
    connection: 20000,               // 20s - Conservative default
    healthCheck: 10000,              // 10s
    simpleRequest: 35000,            // 35s
    complexRequest: 65000,           // 65s
    streaming: 90000                 // 90s
  }
} as const;

/**
 * MCP-Specific Timeout Configuration
 */
export const MCP_TIMEOUTS = {
  SERVER_STARTUP: 25000,             // 25s - MCP server initialization
  TOOL_EXECUTION: 60000,             // 60s - Individual tool execution
  MULTIPLEXER_COORDINATION: 15000,   // 15s - Instance coordination
  HEALTH_CHECK: 10000,               // 10s - MCP health monitoring
  REQUEST_PROCESSING: 90000,         // 90s - Complete MCP request
  GRACEFUL_SHUTDOWN: 10000,          // 10s - Clean shutdown time
  
  // Multiplexer-specific
  INSTANCE_SPAWN: 20000,             // 20s - New instance creation
  LOAD_BALANCING: 5000,              // 5s - Load balancing decisions
  CIRCUIT_BREAKER_RESET: 30000       // 30s - Circuit breaker recovery
} as const;

/**
 * Retry Configuration with Harmonized Timeouts
 */
export const RETRY_CONFIGURATION = {
  HEALTH_CHECK: {
    maxRetries: 2,
    baseDelay: 1500,                 // 1.5s
    maxDelay: 5000,                  // 5s
    backoffMultiplier: 1.5,
    jitterFactor: 0.1
  },
  
  BACKEND_REQUEST: {
    maxRetries: 3,
    baseDelay: 3000,                 // 3s
    maxDelay: 12000,                 // 12s
    backoffMultiplier: 2.0,
    jitterFactor: 0.2
  },
  
  MCP_OPERATION: {
    maxRetries: 2,
    baseDelay: 5000,                 // 5s
    maxDelay: 15000,                 // 15s
    backoffMultiplier: 2.0,
    jitterFactor: 0.15
  },
  
  CONNECTION: {
    maxRetries: 3,
    baseDelay: 2000,                 // 2s
    maxDelay: 8000,                  // 8s
    backoffMultiplier: 1.8,
    jitterFactor: 0.25
  }
} as const;

/**
 * Environment Variable Overrides
 * Allows runtime configuration of timeout values
 */
export function getTimeoutFromEnv(key: string, defaultValue: number): number {
  const envValue = process.env[`CLAUDETTE_TIMEOUT_${key.toUpperCase()}`];
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return defaultValue;
}

/**
 * Dynamic Timeout Calculator
 * Calculates optimal timeouts based on current profile and backend
 */
export class HarmonizedTimeoutCalculator {
  private currentProfile: TimeoutProfile;
  
  constructor(profileName: keyof typeof TIMEOUT_PROFILES = 'DEVELOPMENT_ASSISTANT') {
    this.currentProfile = TIMEOUT_PROFILES[profileName];
  }
  
  /**
   * Set the active timeout profile
   */
  setProfile(profileName: keyof typeof TIMEOUT_PROFILES): void {
    this.currentProfile = TIMEOUT_PROFILES[profileName];
  }
  
  /**
   * Get timeout for a specific operation type
   */
  getTimeout(operation: string, backend?: keyof typeof BACKEND_TIMEOUTS): number {
    const baseTimeout = this.getBaseTimeout(operation);
    const backendMultiplier = this.getBackendMultiplier(backend);
    const envOverride = getTimeoutFromEnv(operation, 0);
    
    if (envOverride > 0) {
      return Math.min(envOverride, this.currentProfile.totalAllowance);
    }
    
    const calculatedTimeout = Math.floor(baseTimeout * backendMultiplier);
    return Math.min(calculatedTimeout, this.currentProfile.totalAllowance);
  }
  
  /**
   * Get base timeout for operation type
   */
  private getBaseTimeout(operation: string): number {
    switch (operation.toLowerCase()) {
      case 'health_check':
      case 'health-check':
        return this.currentProfile.healthChecks;
      
      case 'quick_operation':
      case 'quick-operation':
      case 'cache':
      case 'database':
        return this.currentProfile.quickOperations;
      
      case 'simple_request':
      case 'simple-request':
      case 'simple':
        return this.currentProfile.simpleRequests;
      
      case 'complex_request':
      case 'complex-request':
      case 'complex':
        return this.currentProfile.complexRequests;
      
      case 'mcp_operation':
      case 'mcp-operation':
      case 'mcp':
        return this.currentProfile.mcpOperations;
      
      default:
        return this.currentProfile.simpleRequests;
    }
  }
  
  /**
   * Get backend-specific multiplier
   */
  private getBackendMultiplier(backend?: keyof typeof BACKEND_TIMEOUTS): number {
    if (!backend) return 1.0;
    
    // Backend speed multipliers (faster = lower multiplier)
    const multipliers = {
      OPENAI: 0.85,    // 15% faster
      QWEN: 1.0,       // Baseline
      CLAUDE: 1.15,    // 15% slower
      OLLAMA: 1.4,     // 40% slower (local processing)
      CUSTOM: 1.1      // 10% slower (conservative)
    };
    
    return multipliers[backend] || 1.0;
  }
  
  /**
   * Calculate timeout with retry overhead
   */
  getTimeoutWithRetries(operation: string, backend?: keyof typeof BACKEND_TIMEOUTS): number {
    const baseTimeout = this.getTimeout(operation, backend);
    const retryConfig = this.getRetryConfig(operation);
    
    // Calculate total time including all retries
    let totalTime = baseTimeout;
    let delay = retryConfig.baseDelay;
    
    for (let i = 0; i < retryConfig.maxRetries; i++) {
      totalTime += baseTimeout + delay;
      delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelay);
    }
    
    return Math.min(totalTime, this.currentProfile.totalAllowance);
  }
  
  /**
   * Get retry configuration for operation type
   */
  private getRetryConfig(operation: string): { maxRetries: number; baseDelay: number; maxDelay: number; backoffMultiplier: number; jitterFactor: number } {
    if (operation.includes('health')) return RETRY_CONFIGURATION.HEALTH_CHECK;
    if (operation.includes('mcp')) return RETRY_CONFIGURATION.MCP_OPERATION;
    if (operation.includes('connection')) return RETRY_CONFIGURATION.CONNECTION;
    return RETRY_CONFIGURATION.BACKEND_REQUEST;
  }
  
  /**
   * Check if operation can complete within Claude Code's limit
   */
  canCompleteWithinLimit(operation: string, backend?: keyof typeof BACKEND_TIMEOUTS): boolean {
    const timeoutWithRetries = this.getTimeoutWithRetries(operation, backend);
    return timeoutWithRetries <= TIMEOUT_HIERARCHY.CLAUDE_CODE_LIMIT;
  }
  
  /**
   * Get recommended timeout profile for use case
   */
  static getRecommendedProfile(useCase: string): keyof typeof TIMEOUT_PROFILES {
    const normalized = useCase.toLowerCase();
    
    if (normalized.includes('cli') || normalized.includes('quick') || normalized.includes('interactive')) {
      return 'QUICK_INTERACTIVE';
    }
    
    if (normalized.includes('develop') || normalized.includes('code') || normalized.includes('assistant')) {
      return 'DEVELOPMENT_ASSISTANT';
    }
    
    if (normalized.includes('batch') || normalized.includes('process') || normalized.includes('bulk')) {
      return 'BATCH_PROCESSING';
    }
    
    if (normalized.includes('emergency') || normalized.includes('fast') || normalized.includes('urgent')) {
      return 'EMERGENCY_MODE';
    }
    
    return 'DEVELOPMENT_ASSISTANT'; // Default
  }
}

/**
 * Global timeout calculator instance
 */
export const timeoutCalculator = new HarmonizedTimeoutCalculator();

/**
 * Convenience function to get harmonized timeout
 */
export function getHarmonizedTimeout(
  operation: string, 
  backend?: keyof typeof BACKEND_TIMEOUTS,
  includeRetries: boolean = false
): number {
  if (includeRetries) {
    return timeoutCalculator.getTimeoutWithRetries(operation, backend);
  }
  return timeoutCalculator.getTimeout(operation, backend);
}

/**
 * Set timeout profile based on environment or use case
 */
export function initializeTimeoutProfile(): void {
  const envProfile = process.env.CLAUDETTE_TIMEOUT_PROFILE;
  if (envProfile && envProfile in TIMEOUT_PROFILES) {
    timeoutCalculator.setProfile(envProfile as keyof typeof TIMEOUT_PROFILES);
    return;
  }
  
  // Auto-detect based on environment
  if (process.env.NODE_ENV === 'production') {
    timeoutCalculator.setProfile('DEVELOPMENT_ASSISTANT');
  } else if (process.env.CLAUDETTE_CLI_MODE === 'true') {
    timeoutCalculator.setProfile('QUICK_INTERACTIVE');
  } else {
    timeoutCalculator.setProfile('DEVELOPMENT_ASSISTANT');
  }
}

// Initialize timeout profile on module load
initializeTimeoutProfile();