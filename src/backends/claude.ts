// Claude (Anthropic) backend implementation

import Anthropic from '@anthropic-ai/sdk';
import { BaseBackend } from './base';
import {
  retrieveApiKey,
  performStandardHealthCheck,
  HealthCheckPatterns,
  isRateLimitError,
  isContextLengthError,
  createRateLimitError,
  createContextLengthError,
  createErrorResponse
} from './shared-utils';
import { 
  BackendSettings, 
  ClaudetteRequest, 
  ClaudetteResponse, 
  BackendError 
} from '../types/index';

export class ClaudeBackend extends BaseBackend {
  private client: Anthropic;
  private readonly defaultModel = 'claude-3-sonnet-20240229';

  constructor(config: BackendSettings) {
    super('claude', config);
    
    // Will be initialized in the first API call
    this.client = null as any;
  }

  /**
   * Get the default model for Claude backend
   */
  protected getDefaultModel(): string {
    return this.defaultModel;
  }

  async validateConfig(): Promise<boolean> {
    const apiKey = await this.getApiKey();
    return await super.validateConfig() && !!apiKey;
  }

  /**
   * Get API key using unified retrieval method
   */
  protected async getApiKey(): Promise<string | null> {
    return await retrieveApiKey(
      {
        credentialKey: 'claude-api-key',
        environmentKeys: ['ANTHROPIC_API_KEY', 'CLAUDE_API_KEY'],
        backendName: 'claude'
      },
      this.config.api_key
    );
  }

  /**
   * Initialize Anthropic client with API key
   */
  private async initializeClient(): Promise<void> {
    if (this.client) {
      return; // Already initialized
    }

    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new BackendError('Claude API key not found in config, environment, or credential storage', 'claude', false);
    }

    this.client = new Anthropic({
      apiKey,
      baseURL: this.config.base_url
    });
  }

  protected async healthCheck(): Promise<boolean> {
    const healthCheckFunction = async () => {
      try {
        // Initialize client first before attempting health check
        await this.initializeClient();
        
        // Simple health check - try to get model info with minimal request
        await this.client.messages.create({
          model: this.config.model || this.defaultModel,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }]
        });
        
        return true;
      } catch (error) {
        throw error;
      }
    };

    return await performStandardHealthCheck({
      backendName: 'Claude',
      checkFunction: healthCheckFunction,
      suppressAuthErrors: true
    });
  }

  async send(request: ClaudetteRequest): Promise<ClaudetteResponse> {
    await this.initializeClient();
    
    const startTime = Date.now();
    
    try {
      const { prompt, maxTokens, temperature, model } = this.prepareRequest(request);
      
      // Include file content in prompt if provided
      let fullPrompt = prompt;
      if (request.files && request.files.length > 0) {
        const fileContent = request.files.join('\n\n');
        fullPrompt = `${prompt}\n\nFiles:\n${fileContent}`;
      }

      const response = await this.client.messages.create({
        model: model || this.config.model || this.defaultModel,
        max_tokens: maxTokens,
        temperature,
        messages: [
          {
            role: 'user',
            content: fullPrompt
          }
        ]
      });

      const latencyMs = Date.now() - startTime;
      
      // Extract content from response
      const content = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as any).text)
        .join('');

      // Calculate token usage
      const tokensInput = response.usage?.input_tokens || this.estimateTokens(fullPrompt);
      const tokensOutput = response.usage?.output_tokens || this.estimateTokens(content);

      return this.createSuccessResponse(
        content,
        tokensInput,
        tokensOutput,
        latencyMs,
        {
          model: response.model,
          stop_reason: response.stop_reason,
          response_id: response.id
        }
      );

    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      
      // Handle rate limiting
      if (isRateLimitError(error)) {
        throw createRateLimitError('Claude', error);
      }
      
      // Handle context length errors
      if (isContextLengthError(error)) {
        throw createContextLengthError('Claude');
      }
      
      createErrorResponse(error, 'claude', request, latencyMs);
    }
  }

  /**
   * Get available Claude models
   */
  getAvailableModels(): string[] {
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229', 
      'claude-3-haiku-20240307',
      'claude-3-5-sonnet-20241022'
    ];
  }

  /**
   * Estimate cost more precisely based on model
   */
  estimateCost(tokens: number): number {
    const model = this.config.model || this.defaultModel;
    
    // Cost per 1K tokens in EUR (approximate)
    const costs: Record<string, number> = {
      'claude-3-opus-20240229': 0.015,
      'claude-3-sonnet-20240229': 0.003,
      'claude-3-haiku-20240307': 0.00025,
      'claude-3-5-sonnet-20241022': 0.003
    };
    
    const costPer1K = costs[model] || this.config.cost_per_token * 1000;
    return (tokens / 1000) * costPer1K;
  }
}