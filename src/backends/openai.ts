// OpenAI backend implementation

import OpenAI from 'openai';
import { BaseBackend } from './base';
import { getCredentialManager } from '../credentials';
import { 
  BackendSettings, 
  ClaudetteRequest, 
  ClaudetteResponse, 
  BackendError 
} from '../types/index';

export class OpenAIBackend extends BaseBackend {
  private client: OpenAI;
  private readonly defaultModel = 'gpt-4o-mini';

  constructor(config: BackendSettings) {
    super('openai', config);
    
    // Will be initialized in the first API call
    this.client = null as any;
  }

  async validateConfig(): Promise<boolean> {
    const apiKey = await this.getApiKey();
    return await super.validateConfig() && !!apiKey;
  }

  /**
   * Get API key from config, environment, or credential storage
   */
  private async getApiKey(): Promise<string | null> {
    // Try config first
    if (this.config.api_key) {
      return this.config.api_key;
    }

    // Try environment variable
    if (process.env.OPENAI_API_KEY) {
      return process.env.OPENAI_API_KEY;
    }

    // Try credential storage
    try {
      const credentialManager = getCredentialManager();
      const stored = await credentialManager.retrieve('openai-api-key');
      return stored;
    } catch (error) {
      console.warn('Failed to retrieve OpenAI API key from credential storage:', error);
      return null;
    }
  }

  /**
   * Initialize OpenAI client with API key
   */
  private async initializeClient(): Promise<void> {
    if (this.client) {
      return; // Already initialized
    }

    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new BackendError('OpenAI API key not found in config, environment, or credential storage', 'openai', false);
    }

    this.client = new OpenAI({
      apiKey,
      baseURL: this.config.base_url,
      timeout: 30000  // XO Claudette fix: 30 second timeout
    });
  }

  protected async healthCheck(): Promise<boolean> {
    try {
      await this.initializeClient();
      
      // Simple health check - try to list models
      await this.client.models.list();
      return true;
    } catch (error: any) {
      if (!error.message?.includes('authentication')) {
        console.warn(`OpenAI health check failed: ${error.message}`);
      }
      return false;
    }
  }

  async send(request: ClaudetteRequest): Promise<ClaudetteResponse> {
    await this.initializeClient();
    
    const startTime = Date.now();
    
    try {
      const { prompt, maxTokens, temperature, model } = this.prepareRequest(request);
      
      // Build messages array
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
      
      // Add file content as system message if provided
      if (request.files && request.files.length > 0) {
        const fileContent = request.files.join('\n\n');
        messages.push({
          role: 'system',
          content: `Files provided for context:\n\n${fileContent}`
        });
      }
      
      messages.push({
        role: 'user',
        content: prompt
      });

      const response = await this.client.chat.completions.create({
        model: model || this.config.model || this.defaultModel,
        messages,
        max_tokens: maxTokens,
        temperature,
        stream: false
      }) as OpenAI.Chat.Completions.ChatCompletion;

      const latencyMs = Date.now() - startTime;
      
      // Extract content from response
      const content = response.choices[0]?.message?.content || '';
      
      // Get token usage
      const tokensInput = response.usage?.prompt_tokens || this.estimateTokens(
        messages.map(m => m.content).join(' ')
      );
      const tokensOutput = response.usage?.completion_tokens || this.estimateTokens(content);

      return this.createSuccessResponse(
        content,
        tokensInput,
        tokensOutput,
        latencyMs,
        {
          model: response.model,
          finish_reason: response.choices[0]?.finish_reason,
          response_id: response.id
        }
      );

    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      
      // Handle rate limiting
      if (error.status === 429) {
        throw new BackendError(
          `OpenAI rate limited: ${error.message}`, 
          'openai', 
          true
        );
      }
      
      // Handle context length errors
      if (error.message?.includes('maximum context length') || error.message?.includes('token limit')) {
        throw new BackendError(
          'OpenAI context length exceeded - consider using compression',
          'openai',
          false
        );
      }
      
      this.createErrorResponse(error, request, latencyMs);
    }
  }

  /**
   * Get available OpenAI models
   */
  getAvailableModels(): string[] {
    return [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo'
    ];
  }

  /**
   * Estimate cost more precisely based on model
   */
  estimateCost(tokens: number): number {
    const model = this.config.model || this.defaultModel;
    
    // Cost per 1K tokens in EUR (approximate, input + output average)
    const costs: Record<string, number> = {
      'gpt-4o': 0.005,
      'gpt-4o-mini': 0.0002,
      'gpt-4-turbo': 0.01,
      'gpt-4': 0.03,
      'gpt-3.5-turbo': 0.001
    };
    
    const costPer1K = costs[model] || this.config.cost_per_token * 1000;
    return (tokens / 1000) * costPer1K;
  }

  /**
   * Support for streaming responses
   */
  async sendStream(request: ClaudetteRequest): Promise<AsyncIterable<string>> {
    await this.initializeClient();
    
    try {
      const { prompt, maxTokens, temperature, model } = this.prepareRequest(request);
      
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
      
      if (request.files && request.files.length > 0) {
        const fileContent = request.files.join('\n\n');
        messages.push({
          role: 'system',
          content: `Files provided for context:\n\n${fileContent}`
        });
      }
      
      messages.push({
        role: 'user',
        content: prompt
      });

      const stream = await this.client.chat.completions.create({
        model: model || this.config.model || this.defaultModel,
        messages,
        max_tokens: maxTokens,
        temperature,
        stream: true
      });

      return this.processStream(stream);
    } catch (error: any) {
      this.createErrorResponse(error, request);
    }
  }

  private async* processStream(stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>): AsyncIterable<string> {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}