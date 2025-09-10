// Shared utilities for backend implementations
// Consolidates duplicate code across all backend implementations

import { getCredentialManager } from '../credentials';
import { BackendError, ClaudetteRequest, ClaudetteResponse } from '../types/index';
import { secureLogger, logBackendError } from '../utils/secure-logger';

/**
 * Configuration for API key retrieval
 */
export interface ApiKeyConfig {
  /** The credential storage key name */
  credentialKey: string;
  /** Environment variable names to check (in order of preference) */
  environmentKeys: string[];
  /** Backend name for error messages */
  backendName: string;
}

/**
 * Configuration for health check implementation
 */
export interface HealthCheckConfig {
  /** Backend name for logging */
  backendName: string;
  /** Custom health check function */
  checkFunction: () => Promise<boolean>;
  /** Whether to suppress authentication errors in logs */
  suppressAuthErrors?: boolean;
}

/**
 * Unified API key retrieval system
 * Eliminates duplication across Claude, OpenAI, and Qwen backends
 * 
 * Follows standardized fallback hierarchy:
 * 1. Configuration file (via config.api_key)
 * 2. Environment variables (in order of preference)
 * 3. Credential storage (with standardized naming)
 * 
 * @param config Configuration object containing fallback keys and backend name
 * @param configApiKey The API key from configuration (first priority)
 * @returns The retrieved API key or null if not found
 */
export async function retrieveApiKey(
  config: ApiKeyConfig,
  configApiKey?: string
): Promise<string | null> {
  // Try config first (highest priority)
  if (configApiKey) {
    return configApiKey;
  }

  // Try environment variables (second priority)
  for (const envVar of config.environmentKeys) {
    const envValue = process.env[envVar];
    if (envValue) {
      return envValue;
    }
  }

  // Try credential storage (third priority)
  try {
    const credentialManager = getCredentialManager();
    
    // Try standardized naming first: claudette-{backend}
    const standardizedKey = `claudette-${config.backendName}`;
    let stored = await credentialManager.retrieve(standardizedKey);
    
    // Fallback to specific credential key
    if (!stored) {
      stored = await credentialManager.retrieve(config.credentialKey);
    }
    
    return stored;
  } catch (error) {
    console.warn(
      `Failed to retrieve ${config.backendName} API key from credential storage:`, 
      error
    );
    return null;
  }
}

/**
 * Unified error response creation system
 * Consolidates error handling logic from BaseBackend and AdaptiveBaseBackend
 * 
 * @param error The error that occurred
 * @param backendName The name of the backend that generated the error
 * @param request The original request that caused the error
 * @param latencyMs The request latency in milliseconds
 * @param isRetryable Optional override for retryability determination
 * @throws BackendError with standardized error handling
 */
export function createErrorResponse(
  error: Error,
  backendName: string,
  request: ClaudetteRequest,
  latencyMs: number = 0,
  isRetryable?: boolean
): never {
  const retryable = isRetryable !== undefined ? isRetryable : determineRetryability(error);
  
  // Log backend error with secure logging
  logBackendError({
    backend: backendName,
    operation: 'send_request',
    error,
    retryable,
    context: {
      latency_ms: latencyMs,
      prompt_length: request.prompt?.length,
      files_count: request.files?.length
    }
  });
  
  throw new BackendError(
    `${backendName} backend error: ${error.message}`,
    backendName,
    retryable
  );
}

/**
 * Determine if an error is retryable based on error type and message
 * Used by unified error response creation
 * 
 * @param error The error to analyze
 * @returns True if the error is retryable, false otherwise
 */
export function determineRetryability(error: Error): boolean {
  const retryablePatterns = [
    // Network errors
    'ECONNRESET',
    'ENOTFOUND', 
    'ETIMEDOUT',
    'ECONNREFUSED',
    
    // Service errors
    'rate_limited',
    'server_error',
    'timeout',
    'network_error',
    'connection_error',
    'service_unavailable',
    
    // HTTP status patterns
    '429', // Rate limiting
    '502', // Bad Gateway
    '503', // Service Unavailable
    '504'  // Gateway Timeout
  ];

  const errorMessage = error.message.toLowerCase();
  return retryablePatterns.some(pattern => errorMessage.includes(pattern));
}

/**
 * Standardized health check implementation
 * Provides consistent error handling and logging across all backends
 * 
 * @param config Health check configuration
 * @returns Promise that resolves to health status
 */
export async function performStandardHealthCheck(config: HealthCheckConfig): Promise<boolean> {
  try {
    const isHealthy = await config.checkFunction();
    return isHealthy;
  } catch (error: any) {
    // Only log non-authentication errors to avoid spam during setup
    const shouldSuppressError = config.suppressAuthErrors !== false && 
                               error.message?.toLowerCase().includes('authentication');
    
    if (!shouldSuppressError) {
      console.warn(`${config.backendName} health check failed: ${error.message}`);
    }
    
    return false;
  }
}

/**
 * Standard health check patterns for different backend types
 */
export class HealthCheckPatterns {
  /**
   * Health check for REST API backends using model list endpoint
   * Used by OpenAI-compatible APIs
   */
  static createModelListHealthCheck(
    makeRequest: (endpoint: string, method?: string) => Promise<Response>
  ): () => Promise<boolean> {
    return async () => {
      const response = await makeRequest('/v1/models', 'GET');
      return response.ok;
    };
  }

  /**
   * Health check for SDK-based backends using minimal API call
   * Used by Anthropic and similar clients
   */
  static createMinimalCallHealthCheck<T>(
    client: T,
    testCall: (client: T) => Promise<any>
  ): () => Promise<boolean> {
    return async () => {
      await testCall(client);
      return true;
    };
  }
}

/**
 * Shared request preparation logic
 * Standardizes request parameter extraction and defaults
 */
export function prepareStandardRequest(
  request: ClaudetteRequest,
  config: {
    max_tokens?: number;
    temperature?: number;
    model?: string;
  },
  defaultModel: string = 'default'
): {
  prompt: string;
  maxTokens: number;
  temperature: number;
  model: string;
} {
  return {
    prompt: request.prompt,
    maxTokens: request.options?.max_tokens || config.max_tokens || 4000,
    temperature: request.options?.temperature || config.temperature || 0.7,
    model: request.options?.model || config.model || defaultModel
  };
}

/**
 * Standard token estimation
 * Provides consistent token counting across all backends
 */
export function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token for English text
  // This is used consistently across all backends
  return Math.ceil(text.length / 4);
}

/**
 * Standard cost estimation
 * Provides consistent cost calculation with fallback to config values
 */
export function estimateStandardCost(
  tokens: number,
  costPer1000Tokens: number,
  configCostPerToken: number
): number {
  const costPer1K = costPer1000Tokens || (configCostPerToken * 1000);
  return (tokens / 1000) * costPer1K;
}

/**
 * Rate limiting error detection
 * Standardizes rate limit error identification across backends
 */
export function isRateLimitError(error: any): boolean {
  return error.status === 429 || 
         error.message?.toLowerCase().includes('rate limit') ||
         error.message?.toLowerCase().includes('429');
}

/**
 * Context length error detection
 * Standardizes context length error identification across backends
 */
export function isContextLengthError(error: any): boolean {
  const message = error.message?.toLowerCase() || '';
  return message.includes('maximum context length') ||
         message.includes('context length exceeded') ||
         message.includes('token limit') ||
         message.includes('context');
}

/**
 * Creates a standardized rate limit error
 */
export function createRateLimitError(backendName: string, error: any): BackendError {
  return new BackendError(
    `${backendName} rate limited: ${error.message}`,
    backendName,
    true // Rate limit errors are retryable
  );
}

/**
 * Creates a standardized context length error
 */
export function createContextLengthError(backendName: string): BackendError {
  return new BackendError(
    `${backendName} context length exceeded - consider using compression`,
    backendName,
    false // Context length errors are not retryable
  );
}