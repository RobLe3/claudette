// Adaptive Qwen Backend for Self-hosted Coding LLM
// Enhanced with dynamic timeouts and async pipeline contribution

import fetch from 'node-fetch';
import { ClaudetteRequest, ClaudetteResponse } from '../types/index';
import { AdaptiveBaseBackend, AdaptiveBackendSettings } from './adaptive-base';

export interface QwenBackendSettings extends AdaptiveBackendSettings {
  base_url?: string;
  api_key: string;
  model?: string;
  custom_headers?: Record<string, string>;
}

export interface QwenResponse {
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
  model?: string;
}

export interface QwenModelsResponse {
  data?: Array<{
    id: string;
  }>;
}

export class AdaptiveQwenBackend extends AdaptiveBaseBackend {
  private readonly baseURL: string;
  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly customHeaders: Record<string, string>;

  constructor(config: QwenBackendSettings) {
    // Enhanced configuration for self-hosted Qwen
    const adaptiveConfig: AdaptiveBackendSettings = {
      base_timeout_ms: 30000,        // 30s base timeout - XO Claudette fix
      max_timeout_ms: 120000,        // 2 minutes max timeout - reduced  
      timeout_multiplier: 1.5,       // Less aggressive timeout scaling
      health_check_interval_ms: 45000, // Check health every 45s
      health_check_timeout_ms: 10000,  // 10s health check timeout - optimized
      consecutive_failures_threshold: 2, // Lower threshold for self-hosted
      async_contribution_enabled: true,  // Enable async contribution
      contribution_timeout_ms: 600000,   // 10 minutes for async contribution
      priority_boost_on_success: 0.2,    // Higher boost for successful self-hosted
      latency_adaptation_enabled: true,
      success_rate_threshold: 0.6,       // Lower threshold for self-hosted
      backend_type: 'self_hosted',
      ...config
    };

    super('qwen', adaptiveConfig);
    
    this.baseURL = config.base_url || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
    this.apiKey = config.api_key;
    this.defaultModel = config.model || 'qwen-plus';
    this.customHeaders = config.custom_headers || {};
  }

  /**
   * Enhanced health check for self-hosted Qwen
   */
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.health_check_timeout_ms);
      
      const response = await fetch(`${this.baseURL}/v1/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...this.customHeaders
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`Qwen health check failed: ${response.status} ${response.statusText}`);
        return false;
      }

      const data = await response.json() as QwenModelsResponse;
      const hasModel = data.data?.some((model) => model.id === this.defaultModel);
      
      if (!hasModel) {
        console.warn(`Qwen model ${this.defaultModel} not available`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Qwen health check error:', error);
      return false;
    }
  }

  /**
   * Send request to Qwen with adaptive timeout handling
   */
  async sendRequest(request: ClaudetteRequest): Promise<ClaudetteResponse> {
    const startTime = Date.now();
    const { prompt, maxTokens, temperature, model } = this.prepareRequest(request);
    
    try {
      // Prepare Qwen-specific request
      const qwenRequest = {
        model: model || this.defaultModel,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature: temperature,
        stream: false
      };

      console.log(`🤖 Qwen request with ${this.currentTimeoutMs}ms timeout...`);
      
      // Make request with current adaptive timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.currentTimeoutMs);
      
      const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...this.customHeaders
        },
        body: JSON.stringify(qwenRequest),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      const endTime = Date.now();
      const latency = endTime - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Qwen API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as QwenResponse;
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from Qwen API');
      }

      const content = data.choices[0].message.content;
      const tokensInput = data.usage?.prompt_tokens || this.estimateTokens(prompt);
      const tokensOutput = data.usage?.completion_tokens || this.estimateTokens(content);

      console.log(`✅ Qwen response received in ${latency}ms`);

      return this.createSuccessResponse(
        content,
        tokensInput,
        tokensOutput,
        latency,
        {
          model_used: data.model || this.defaultModel,
          finish_reason: data.choices[0].finish_reason,
          self_hosted: true,
          adaptive_timeout_used: this.currentTimeoutMs,
          usage: data.usage
        }
      );

    } catch (error) {
      const latency = Date.now() - startTime;
      console.error(`❌ Qwen request failed after ${latency}ms:`, error);
      
      // Handle specific timeout scenarios
      const errorObj = error as Error;
      if (errorObj.message?.includes('timeout') || (error as any).code === 'ETIMEDOUT') {
        console.log(`⏱️ Qwen timeout after ${this.currentTimeoutMs}ms - adapting for next request`);
      }
      
      this.createErrorResponse(error as Error, request, latency);
    }
  }

  /**
   * Enhanced async contribution method for pipeline processing
   */
  async contributeAsync(request: ClaudetteRequest): Promise<ClaudetteResponse> {
    const requestId = this.generateRequestId();
    console.log(`🔄 Starting async Qwen contribution for request ${requestId}`);
    
    try {
      // Use extended timeout for async contributions
      const originalTimeout = this.currentTimeoutMs;
      this.currentTimeoutMs = this.config.contribution_timeout_ms!;
      
      const response = await this.sendRequest(request);
      
      // Restore original timeout
      this.currentTimeoutMs = originalTimeout;
      
      console.log(`✅ Async Qwen contribution completed for ${requestId}`);
      return {
        ...response,
        metadata: {
          ...response.metadata,
          async_contribution: true,
          contribution_id: requestId
        }
      };
      
    } catch (error) {
      console.error(`❌ Async Qwen contribution failed for ${requestId}:`, error);
      throw error;
    }
  }

  /**
   * Get Qwen-specific performance metrics
   */
  getPerformanceMetrics(): {
    avgLatency: number;
    maxLatency: number;
    minLatency: number;
    currentTimeout: number;
    successRate: number;
    selfHostedOptimizations: {
      adaptiveTimeout: boolean;
      asyncContribution: boolean;
      healthMonitoring: boolean;
    };
  } {
    const latencies = this.recentLatencies;
    
    return {
      avgLatency: latencies.length > 0 ? latencies.reduce((a, b) => a + b) / latencies.length : 0,
      maxLatency: latencies.length > 0 ? Math.max(...latencies) : 0,
      minLatency: latencies.length > 0 ? Math.min(...latencies) : 0,
      currentTimeout: this.currentTimeoutMs,
      successRate: this.getSuccessRate(),
      selfHostedOptimizations: {
        adaptiveTimeout: this.config.latency_adaptation_enabled || false,
        asyncContribution: this.config.async_contribution_enabled || false,
        healthMonitoring: true
      }
    };
  }

  /**
   * Optimize for self-hosted performance
   */
  optimizeForSelfHosted(): void {
    // Increase timeouts for better reliability
    this.config.base_timeout_ms = Math.max(this.config.base_timeout_ms!, 90000); // 90s minimum
    this.config.max_timeout_ms = Math.max(this.config.max_timeout_ms!, 600000); // 10 minutes max
    
    // Enable all adaptive features
    this.config.latency_adaptation_enabled = true;
    this.config.async_contribution_enabled = true;
    
    // Adjust health checking for self-hosted stability
    this.config.health_check_interval_ms = 60000; // Check every minute
    this.config.consecutive_failures_threshold = 2; // More lenient failure threshold
    
    console.log('🔧 Qwen backend optimized for self-hosted performance');
  }

  /**
   * Get detailed backend status
   */
  getDetailedStatus(): {
    name: string;
    type: string;
    healthy: boolean;
    performance: any;
    configuration: {
      baseUrl: string;
      model: string;
      adaptiveTimeouts: boolean;
      asyncContribution: boolean;
    };
    recentActivity: {
      totalRequests: number;
      successfulRequests: number;
      avgLatency: number;
    };
  } {
    const performance = this.getPerformanceMetrics();
    
    return {
      name: this.name,
      type: 'Self-hosted Coding LLM',
      healthy: this.isHealthy,
      performance,
      configuration: {
        baseUrl: this.baseURL,
        model: this.defaultModel,
        adaptiveTimeouts: this.config.latency_adaptation_enabled || false,
        asyncContribution: this.config.async_contribution_enabled || false
      },
      recentActivity: {
        totalRequests: this.totalRequests,
        successfulRequests: this.successfulRequests,
        avgLatency: performance.avgLatency
      }
    };
  }
}