// Claude (Anthropic) backend implementation

import Anthropic from '@anthropic-ai/sdk';
import { BaseBackend } from './base';
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
    
    const apiKey = config.api_key || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new BackendError('Claude API key not found', 'claude', false);
    }

    this.client = new Anthropic({
      apiKey,
      baseURL: config.base_url
    });
  }

  validateConfig(): boolean {
    const hasApiKey = !!(this.config.api_key || process.env.ANTHROPIC_API_KEY);
    return super.validateConfig() && hasApiKey;
  }

  protected async healthCheck(): Promise<boolean> {
    try {
      // Simple health check - try to get model info
      await this.client.messages.create({
        model: this.config.model || this.defaultModel,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }]
      });
      return true;
    } catch (error: any) {
      // Don't log auth errors as they're expected during setup
      if (!error.message?.includes('authentication')) {
        console.warn(`Claude health check failed: ${error.message}`);
      }
      return false;
    }
  }

  async send(request: ClaudetteRequest): Promise<ClaudetteResponse> {
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
      if (error.status === 429) {
        throw new BackendError(
          `Claude rate limited: ${error.message}`, 
          'claude', 
          true
        );
      }
      
      // Handle context length errors
      if (error.message?.includes('maximum context length')) {
        throw new BackendError(
          'Claude context length exceeded - consider using compression',
          'claude',
          false
        );
      }
      
      this.createErrorResponse(error, request, latencyMs);
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