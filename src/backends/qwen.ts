// Qwen (CodeLLM) backend implementation

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
import { globalConnectionPool } from '../utils/connection-pool';

export class QwenBackend extends BaseBackend {
  private readonly baseURL: string;
  private readonly defaultModel = 'qwen-plus';

  constructor(config: BackendSettings) {
    super('qwen', config);
    
    // Use Qwen/Dashscope official API endpoint by default
    this.baseURL = config.base_url || 
                   process.env.QWEN_BASE_URL || 
                   'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
  }

  /**
   * Get HTTP status text for status codes
   */
  private getStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout'
    };
    return statusTexts[status] || 'Unknown';
  }

  /**
   * Get the default model for Qwen backend
   */
  protected getDefaultModel(): string {
    return this.defaultModel;
  }

  async validateConfig(): Promise<boolean> {
    const apiKey = await this.getApiKey();
    const hasBaseURL = !!this.baseURL;
    return await super.validateConfig() && !!apiKey && hasBaseURL;
  }

  /**
   * Get API key using unified retrieval method
   */
  protected async getApiKey(): Promise<string | null> {
    return await retrieveApiKey(
      {
        credentialKey: 'qwen-api-key',
        environmentKeys: ['QWEN_API_KEY', 'DASHSCOPE_API_KEY', 'CODELLM_API_KEY'],
        backendName: 'qwen'
      },
      this.config.api_key
    );
  }

  protected async healthCheck(): Promise<boolean> {
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        return false;
      }
      
      // Direct fetch call for health check to bypass connection pool issues
      const response = await fetch(`${this.baseURL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      return response.ok;
    } catch (error) {
      console.warn(`[QwenBackend] Health check failed:`, (error as Error).message);
      return false;
    }
  }

  private async makeRequest(endpoint: string, method: string = 'POST', body?: any): Promise<Response> {
    const apiKey = await this.getApiKey();
    
    if (!apiKey) {
      throw new BackendError('Qwen API key not found in config, environment, or credential storage', 'qwen', false);
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
    
    // Use connection pool for better performance
    try {
      const response = await globalConnectionPool.request(url, {
        method: options.method as string,
        headers: options.headers as Record<string, string>,
        body: options.body as string,
        timeout: 30000
      });
      
      // Convert connection pool response to fetch-like response
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: this.getStatusText(response.status),
        headers: new Headers(response.headers),
        json: async () => JSON.parse(response.body),
        text: async () => response.body,
        url
      } as Response;
    } catch (error) {
      // Fallback to fetch if connection pool fails
      console.warn(`[QwenBackend] Connection pool failed, falling back to fetch:`, (error as Error).message);
      return fetch(url, options);
    }
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

      const response = await this.makeRequest('/chat/completions', 'POST', requestBody);

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
      if (isRateLimitError(error)) {
        throw createRateLimitError('Qwen', error);
      }
      
      // Handle context length errors
      if (isContextLengthError(error)) {
        throw createContextLengthError('Qwen');
      }
      
      createErrorResponse(error, 'qwen', request, latencyMs);
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

      const response = await this.makeRequest('/chat/completions', 'POST', requestBody);

      if (!response.ok) {
        throw new Error(`Qwen streaming API error: ${response.status}`);
      }

      return this.processStream(response);
    } catch (error: any) {
      createErrorResponse(error, 'qwen', request);
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