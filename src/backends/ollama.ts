// Ollama backend implementation for local and remote Ollama instances
// Supports both standard Ollama API and custom endpoints like Flexcon

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

export interface OllamaBackendSettings extends BackendSettings {
  api_key?: string;
  model: string;
  temperature?: number;
  stream?: boolean;
  context_length?: number;
  num_predict?: number;
  top_k?: number;
  top_p?: number;
  repeat_penalty?: number;
  seed?: number;
  stop?: string[];
}

export class OllamaBackend extends BaseBackend {
  private readonly defaultApiUrl = 'http://localhost:11434';
  private readonly apiUrl: string;
  private readonly apiKey?: string;
  private readonly defaultModel = 'llama2';

  constructor(config: OllamaBackendSettings) {
    super('ollama', config);
    
    this.apiUrl = config.base_url || this.defaultApiUrl;
    this.apiKey = config.api_key;
    
    // Validate required configuration
    if (!config.model) {
      throw new BackendError('Ollama backend requires a model to be specified', 'ollama', false);
    }
  }

  /**
   * Get the default model for Ollama backend
   */
  protected getDefaultModel(): string {
    return (this.config as OllamaBackendSettings).model || this.defaultModel;
  }

  async validateConfig(): Promise<boolean> {
    const hasModel = !!(this.config as OllamaBackendSettings).model;
    const hasValidUrl = this.isValidUrl(this.apiUrl);
    return await super.validateConfig() && hasModel && hasValidUrl;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get API key if required (for custom Ollama endpoints like Flexcon)
   */
  protected async getApiKeyAsync(): Promise<string | null> {
    if (!this.apiKey) {
      return null; // Standard Ollama doesn't require API key
    }

    return await retrieveApiKey(
      {
        credentialKey: 'ollama-api-key',
        environmentKeys: ['OLLAMA_API_KEY', 'FLEXCON_API_KEY'],
        backendName: 'ollama'
      },
      this.apiKey
    );
  }

  /**
   * Health check - test connectivity to Ollama API
   */
  protected async healthCheck(): Promise<boolean> {
    const healthCheckFunction = async () => {
      // For standard Ollama, check /api/tags endpoint
      // For custom endpoints, check models or health endpoint
      const endpoint = this.apiUrl.includes('localhost') || this.apiUrl.includes('127.0.0.1') 
        ? '/api/tags' 
        : '/v1/models';
      
      const response = await this.makeRequest('GET', endpoint);
      
      if (this.apiUrl.includes('localhost') || this.apiUrl.includes('127.0.0.1')) {
        // Standard Ollama response format
        return Array.isArray(response.models) && response.models.length > 0;
      } else {
        // OpenAI-compatible format (like Flexcon)
        return Array.isArray(response.data) && response.data.length > 0;
      }
    };

    return await performStandardHealthCheck({
      backendName: 'Ollama',
      checkFunction: healthCheckFunction,
      suppressAuthErrors: false
    });
  }

  /**
   * Send request to Ollama API
   */
  async send(request: ClaudetteRequest): Promise<ClaudetteResponse> {
    const startTime = Date.now();
    
    try {
      const { prompt, maxTokens, temperature, model } = this.prepareRequest(request);
      const ollamaConfig = this.config as OllamaBackendSettings;
      
      // Build the request payload
      let requestPayload: any;
      let endpoint: string;

      if (this.isOpenAICompatible()) {
        // OpenAI-compatible format (like Flexcon)
        endpoint = '/v1/chat/completions';
        requestPayload = await this.buildOpenAICompatibleRequest(request, prompt, maxTokens, temperature, model);
      } else {
        // Standard Ollama format
        endpoint = '/api/generate';
        requestPayload = await this.buildOllamaRequest(request, prompt, maxTokens, temperature, model);
      }

      const response = await this.makeRequest('POST', endpoint, requestPayload);
      const latencyMs = Date.now() - startTime;

      return this.processResponse(response, latencyMs, prompt);

    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      
      // Handle rate limiting
      if (isRateLimitError(error)) {
        throw createRateLimitError('Ollama', error);
      }
      
      // Handle context length errors
      if (isContextLengthError(error)) {
        throw createContextLengthError('Ollama');
      }
      
      return createErrorResponse(error, 'ollama', request, latencyMs);
    }
  }

  /**
   * Determine if this is an OpenAI-compatible endpoint
   */
  private isOpenAICompatible(): boolean {
    return !this.apiUrl.includes('localhost') && 
           !this.apiUrl.includes('127.0.0.1') &&
           (this.apiUrl.includes('flexcon') || !!this.apiKey);
  }

  /**
   * Build OpenAI-compatible request (for Flexcon and similar)
   */
  private async buildOpenAICompatibleRequest(
    request: ClaudetteRequest,
    prompt: string,
    maxTokens: number,
    temperature: number,
    model: string
  ): Promise<any> {
    const messages: Array<{role: string, content: string}> = [];
    
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

    return {
      model: model || (this.config as OllamaBackendSettings).model,
      messages,
      max_tokens: maxTokens,
      temperature: temperature || (this.config as OllamaBackendSettings).temperature || 0.7,
      stream: false
    };
  }

  /**
   * Build standard Ollama request
   */
  private async buildOllamaRequest(
    request: ClaudetteRequest,
    prompt: string,
    maxTokens: number,
    temperature: number,
    model: string
  ): Promise<any> {
    const ollamaConfig = this.config as OllamaBackendSettings;
    let fullPrompt = prompt;
    
    // Add file content to prompt if provided
    if (request.files && request.files.length > 0) {
      const fileContent = request.files.join('\n\n');
      fullPrompt = `Files provided for context:\n\n${fileContent}\n\nUser request: ${prompt}`;
    }

    return {
      model: model || ollamaConfig.model,
      prompt: fullPrompt,
      stream: false,
      options: {
        temperature: temperature || ollamaConfig.temperature || 0.7,
        num_predict: maxTokens || ollamaConfig.num_predict || 500,
        top_k: ollamaConfig.top_k || 40,
        top_p: ollamaConfig.top_p || 0.9,
        repeat_penalty: ollamaConfig.repeat_penalty || 1.1,
        seed: ollamaConfig.seed,
        stop: ollamaConfig.stop
      }
    };
  }

  /**
   * Make HTTP request to Ollama API
   */
  private async makeRequest(method: string, endpoint: string, body?: any): Promise<any> {
    const url = `${this.apiUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authentication header if API key is available
    const apiKey = await this.getApiKeyAsync();
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const options: RequestInit = {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) })
    };

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Ollama API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorMessage;
      } catch {
        if (errorText) {
          errorMessage = errorText;
        }
      }
      
      throw new BackendError(errorMessage, 'ollama', response.status >= 500);
    }

    return await response.json();
  }

  /**
   * Process API response and convert to ClaudetteResponse
   */
  private processResponse(response: any, latencyMs: number, prompt: string): ClaudetteResponse {
    let content: string;
    let tokensInput: number;
    let tokensOutput: number;
    let model: string;
    let finishReason: string | undefined;

    if (this.isOpenAICompatible() && response.choices) {
      // OpenAI-compatible response format
      content = response.choices[0]?.message?.content || '';
      tokensInput = response.usage?.prompt_tokens || this.estimateTokens(prompt);
      tokensOutput = response.usage?.completion_tokens || this.estimateTokens(content);
      model = response.model || (this.config as OllamaBackendSettings).model;
      finishReason = response.choices[0]?.finish_reason;
    } else {
      // Standard Ollama response format
      content = response.response || '';
      tokensInput = response.prompt_eval_count || this.estimateTokens(prompt);
      tokensOutput = response.eval_count || this.estimateTokens(content);
      model = response.model || (this.config as OllamaBackendSettings).model;
      finishReason = response.done ? 'stop' : 'length';
    }

    return this.createSuccessResponse(
      content,
      tokensInput,
      tokensOutput,
      latencyMs,
      {
        model,
        finish_reason: finishReason,
        api_url: this.apiUrl,
        ollama_format: !this.isOpenAICompatible()
      }
    );
  }

  /**
   * Get available models from Ollama instance
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const endpoint = this.isOpenAICompatible() ? '/v1/models' : '/api/tags';
      const response = await this.makeRequest('GET', endpoint);
      
      if (this.isOpenAICompatible()) {
        return response.data?.map((model: any) => model.id) || [];
      } else {
        return response.models?.map((model: any) => model.name) || [];
      }
    } catch (error) {
      console.warn(`Failed to fetch models from Ollama: ${error}`);
      return [(this.config as OllamaBackendSettings).model || this.defaultModel];
    }
  }

  /**
   * Estimate cost for Ollama (usually free for local, varies for hosted)
   */
  estimateCost(tokens: number): number {
    if (this.apiUrl.includes('localhost') || this.apiUrl.includes('127.0.0.1')) {
      return 0; // Local Ollama is free
    }
    
    // Use configured cost per token for hosted services
    return tokens * (this.config.cost_per_token || 0);
  }

  /**
   * Support for streaming responses (Ollama native feature)
   */
  async sendStream(request: ClaudetteRequest): Promise<AsyncIterable<string>> {
    const { prompt, maxTokens, temperature, model } = this.prepareRequest(request);
    
    try {
      let requestPayload: any;
      let endpoint: string;

      if (this.isOpenAICompatible()) {
        endpoint = '/v1/chat/completions';
        requestPayload = await this.buildOpenAICompatibleRequest(request, prompt, maxTokens, temperature, model);
        requestPayload.stream = true;
      } else {
        endpoint = '/api/generate';
        requestPayload = await this.buildOllamaRequest(request, prompt, maxTokens, temperature, model);
        requestPayload.stream = true;
      }

      return this.processStreamResponse(endpoint, requestPayload);
    } catch (error: any) {
      throw createErrorResponse(error, 'ollama', request);
    }
  }

  /**
   * Process streaming response
   */
  private async* processStreamResponse(endpoint: string, payload: any): AsyncIterable<string> {
    const url = `${this.apiUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const apiKey = await this.getApiKeyAsync();
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new BackendError(`Streaming failed: ${response.status}`, 'ollama', true);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new BackendError('Failed to create stream reader', 'ollama', true);
    }

    const decoder = new TextDecoder();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            if (this.isOpenAICompatible()) {
              // OpenAI-compatible streaming format
              const content = data.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } else {
              // Standard Ollama streaming format
              if (data.response) {
                yield data.response;
              }
            }
          } catch (parseError) {
            // Skip unparseable lines
            continue;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Get backend information
   */
  getInfo() {
    return {
      name: this.name,
      type: 'self_hosted' as const,
      model: (this.config as OllamaBackendSettings).model,
      priority: this.config.priority || 5,
      healthy: true,
      available: true,
      api_url: this.apiUrl,
      openai_compatible: this.isOpenAICompatible(),
      cost_per_token: this.config.cost_per_token,
      local: this.apiUrl.includes('localhost') || this.apiUrl.includes('127.0.0.1')
    };
  }

  /**
   * Test the Ollama backend
   */
  async test(): Promise<boolean> {
    try {
      const testRequest: ClaudetteRequest = {
        prompt: 'Test prompt for Ollama backend - respond with "OK"',
        files: [],
        options: {},
        metadata: { test: true }
      };

      const response = await this.send(testRequest);
      return response.content.length > 0 && response.backend_used === this.name;
    } catch (error) {
      return false;
    }
  }
}