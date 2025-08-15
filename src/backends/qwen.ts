// Qwen (CodeLLM) backend implementation

import { BaseBackend } from './base';
import { getCredentialManager } from '../credentials';
import { 
  BackendSettings, 
  ClaudetteRequest, 
  ClaudetteResponse, 
  BackendError 
} from '../types/index';

export class QwenBackend extends BaseBackend {
  private readonly baseURL: string;
  private readonly defaultModel = 'Qwen/Qwen2.5-Coder-7B-Instruct-AWQ';

  constructor(config: BackendSettings) {
    super('qwen', config);
    
    this.baseURL = config.base_url || 'https://tools.flexcon-ai.de';
  }

  async validateConfig(): Promise<boolean> {
    const apiKey = await this.getApiKey();
    const hasBaseURL = !!this.baseURL;
    return await super.validateConfig() && !!apiKey && hasBaseURL;
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
    if (process.env.CODELLM_API_KEY) {
      return process.env.CODELLM_API_KEY;
    }

    // Try credential storage with multiple key names
    try {
      const credentialManager = getCredentialManager();
      const stored = await credentialManager.retrieve('codellm-api-key') ||
                     await credentialManager.retrieve('qwen-api-key');
      return stored;
    } catch (error) {
      console.warn('Failed to retrieve Qwen/CodeLLM API key from credential storage:', error);
      return null;
    }
  }

  protected async healthCheck(): Promise<boolean> {
    try {
      // Simple health check - try to make a basic request
      const response = await this.makeRequest('/v1/models', 'GET');
      return response.ok;
    } catch (error: any) {
      if (!error.message?.includes('authentication')) {
        console.warn(`Qwen health check failed: ${error.message}`);
      }
      return false;
    }
  }

  private async makeRequest(endpoint: string, method: string = 'POST', body?: any): Promise<Response> {
    const apiKey = await this.getApiKey();
    
    if (!apiKey) {
      throw new BackendError('CodeLLM API key not found in config, environment, or credential storage', 'qwen', false);
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const url = `${this.baseURL}${endpoint}`;
    return fetch(url, options);
  }

  async send(request: ClaudetteRequest): Promise<ClaudetteResponse> {
    const startTime = Date.now();
    
    try {
      const { prompt, maxTokens, temperature, model } = this.prepareRequest(request);
      
      // Build messages array for Qwen
      const messages = [];
      
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

      // Prepare request body for Qwen API
      const requestBody = {
        model: model || this.config.model || this.defaultModel,
        messages,
        max_tokens: maxTokens,
        temperature,
        stream: false
      };

      const response = await this.makeRequest('/v1/chat/completions', 'POST', requestBody);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Qwen API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as any;
      const latencyMs = Date.now() - startTime;
      
      // Extract content from response
      const content = data.choices?.[0]?.message?.content || '';
      
      // Calculate token usage (estimate if not provided)
      const tokensInput = data.usage?.prompt_tokens || this.estimateTokens(
        messages.map((m: any) => m.content).join(' ')
      );
      const tokensOutput = data.usage?.completion_tokens || this.estimateTokens(content);

      return this.createSuccessResponse(
        content,
        tokensInput,
        tokensOutput,
        latencyMs,
        {
          model: data.model || requestBody.model,
          finish_reason: data.choices?.[0]?.finish_reason,
          response_id: data.id
        }
      );

    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      
      // Handle rate limiting
      if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        throw new BackendError(
          `Qwen rate limited: ${error.message}`, 
          'qwen', 
          true
        );
      }
      
      // Handle context length errors
      if (error.message?.includes('context') || error.message?.includes('token limit')) {
        throw new BackendError(
          'Qwen context length exceeded - consider using compression',
          'qwen',
          false
        );
      }
      
      this.createErrorResponse(error, request, latencyMs);
    }
  }

  /**
   * Get available Qwen models
   */
  getAvailableModels(): string[] {
    return [
      'Qwen/Qwen2.5-Coder-7B-Instruct-AWQ'
    ];
  }

  /**
   * Estimate cost more precisely based on model
   */
  estimateCost(tokens: number): number {
    const model = this.config.model || this.defaultModel;
    
    // Cost per 1K tokens in EUR (approximate, adjust based on actual pricing)
    const costs: Record<string, number> = {
      'qwen2.5-coder': 0.0001,  // Assumed competitive pricing
      'qwen2.5-7b': 0.0001,
      'qwen2.5-14b': 0.0002,
      'qwen2.5-32b': 0.0003
    };
    
    const costPer1K = costs[model] || this.config.cost_per_token * 1000;
    return (tokens / 1000) * costPer1K;
  }

  /**
   * Support for streaming responses (if supported by API)
   */
  async sendStream(request: ClaudetteRequest): Promise<AsyncIterable<string>> {
    try {
      const { prompt, maxTokens, temperature, model } = this.prepareRequest(request);
      
      const messages = [];
      
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

      const requestBody = {
        model: model || this.config.model || this.defaultModel,
        messages,
        max_tokens: maxTokens,
        temperature,
        stream: true
      };

      const response = await this.makeRequest('/v1/chat/completions', 'POST', requestBody);

      if (!response.ok) {
        throw new Error(`Qwen streaming API error: ${response.status}`);
      }

      return this.processStream(response);
    } catch (error: any) {
      this.createErrorResponse(error, request);
    }
  }

  private async* processStream(response: Response): AsyncIterable<string> {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body available for streaming');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const data = JSON.parse(line.slice(6)) as any;
              const content = data.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}