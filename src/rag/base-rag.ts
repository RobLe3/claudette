// Base RAG implementation for all deployment scenarios

import { 
  RAGRequest, 
  RAGResponse, 
  RAGConfig, 
  RAGError 
} from './types';

export abstract class BaseRAGProvider {
  protected config: RAGConfig;
  protected isHealthy: boolean = false;
  protected lastHealthCheck: number = 0;
  protected healthCheckInterval: number = 30000; // 30 seconds

  constructor(config: RAGConfig) {
    this.config = config;
  }

  /**
   * Abstract methods that must be implemented by concrete providers
   */
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract query(request: RAGRequest): Promise<RAGResponse>;
  abstract healthCheck(): Promise<boolean>;

  /**
   * Check if the provider is healthy and perform health check if needed
   */
  async ensureHealthy(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastHealthCheck > this.healthCheckInterval) {
      this.isHealthy = await this.healthCheck();
      this.lastHealthCheck = now;
    }
    return this.isHealthy;
  }

  /**
   * Validate the configuration
   */
  validateConfig(): boolean {
    if (!this.config.deployment) {
      throw new RAGError(
        'Deployment type is required',
        'INVALID_CONFIG',
        this.config.deployment || 'unknown',
        false
      );
    }
    return true;
  }

  /**
   * Create a standardized error
   */
  protected createError(
    message: string, 
    code: RAGError['code'], 
    retryable: boolean = false
  ): RAGError {
    const error = new Error(message) as RAGError;
    error.code = code;
    error.deployment = this.config.deployment;
    error.retryable = retryable;
    return error;
  }

  /**
   * Generate a unique query ID for tracking
   */
  protected generateQueryId(): string {
    return `rag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Estimate processing time for metrics
   */
  protected measureTime<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    return operation().then(result => ({
      result,
      duration: Date.now() - start
    }));
  }

  /**
   * Get provider status information
   */
  getStatus(): {
    deployment: string;
    healthy: boolean;
    lastHealthCheck: Date;
    config: Partial<RAGConfig>;
  } {
    return {
      deployment: this.config.deployment,
      healthy: this.isHealthy,
      lastHealthCheck: new Date(this.lastHealthCheck),
      config: {
        deployment: this.config.deployment,
        vectorDB: this.config.vectorDB,
        graphDB: this.config.graphDB,
        hybrid: this.config.hybrid
      }
    };
  }
}