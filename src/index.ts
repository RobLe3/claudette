// Main Claudette orchestrator - the core optimize() function

import { join } from 'path';
import { homedir } from 'os';
import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';

import { DatabaseManager } from './database/index';
import { CacheSystem } from './cache/index';
import { BackendRouter } from './router/index';
import { ClaudeBackend } from './backends/claude';
import { OpenAIBackend } from './backends/openai';
import { QwenBackend } from './backends/qwen';
import { AdaptiveQwenBackend } from './backends/adaptive-qwen';
import { OllamaBackend } from './backends/ollama';
import { MockBackend } from './backends/mock-backend';

import {
  ClaudetteConfig,
  ClaudetteRequest,
  ClaudetteResponse,
  BackendSettings,
  ClaudetteError,
  HookContext,
  HookResult
} from './types/index';

export class Claudette {
  private db: DatabaseManager;
  private cache: CacheSystem;
  private router: BackendRouter;
  private config: ClaudetteConfig;
  private initialized: boolean = false;

  constructor(configPath?: string) {
    this.config = this.loadConfig(configPath);
    this.db = new DatabaseManager();
    this.cache = new CacheSystem(this.db, {
      ttl: this.config.thresholds.cache_ttl,
      maxSize: this.config.thresholds.max_cache_size
    });
    this.router = new BackendRouter({
      cost_weight: 0.4,
      latency_weight: 0.4,
      availability_weight: 0.2,
      fallback_enabled: true
    });
  }

  /**
   * Initialize Claudette with backends
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize backends based on config
      await this.initializeBackends();
      
      // Verify database health
      const dbHealth = this.db.healthCheck();
      if (!dbHealth.healthy) {
        console.warn('Database health check failed, some features may not work');
      }

      this.initialized = true;
    } catch (error) {
      throw new ClaudetteError(`Failed to initialize Claudette: ${error}`, 'INIT_ERROR');
    }
  }

  /**
   * Main optimization function - single async optimize() that replaces anthropic.chat()
   */
  async optimize(
    prompt: string,
    files: string[] = [],
    options: {
      backend?: string;
      max_tokens?: number;
      temperature?: number;
      model?: string;
      bypass_cache?: boolean;
      bypass_optimization?: boolean;
    } = {}
  ): Promise<ClaudetteResponse> {
    // Check for raw mode bypass
    if (process.env.CLAUDETTE_RAW === '1' || options.bypass_optimization) {
      return this.directClaudeCall(prompt, files, options);
    }

    if (!this.initialized) {
      await this.initialize();
    }

    const request: ClaudetteRequest = {
      prompt,
      files,
      options,
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: this.generateRequestId()
      }
    };

    try {
      // Execute hook sequence
      await this.executeHook('pre-task', { 
        hook_name: 'pre-task',
        task_description: prompt.substring(0, 100) + '...',
        metadata: request.metadata
      });

      // Try cache first (unless bypassed)
      if (!options.bypass_cache) {
        const cachedResponse = await this.cache.get(request);
        if (cachedResponse) {
          await this.recordQuotaEntry(request, cachedResponse);
          return cachedResponse;
        }
      }

      // Check if compression/summarization is needed
      const processedRequest = await this.preprocessRequest(request);

      // Route to best backend
      const response = await this.router.routeRequest(processedRequest);

      // Cache the response
      if (!options.bypass_cache) {
        await this.cache.set(processedRequest, response);
      }

      // Record in quota ledger
      await this.recordQuotaEntry(processedRequest, response);

      // Execute post-task hook
      await this.executeHook('post-task', {
        hook_name: 'post-task',
        task_description: prompt.substring(0, 100) + '...',
        metadata: { ...request.metadata, response_length: response.content.length }
      });

      return response;

    } catch (error) {
      // Execute notification hook for errors
      await this.executeHook('notify', {
        hook_name: 'notify',
        metadata: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          level: 'error'
        }
      });

      throw error;
    }
  }

  /**
   * Direct Claude call for raw mode
   */
  private async directClaudeCall(
    prompt: string, 
    files: string[] = [], 
    options: any = {}
  ): Promise<ClaudetteResponse> {
    const claudeBackend = new ClaudeBackend(this.config.backends.claude);
    
    const request: ClaudetteRequest = {
      prompt,
      files,
      options,
      metadata: { raw_mode: true }
    };

    return await claudeBackend.send(request);
  }

  /**
   * Preprocess request (compression, summarization)
   */
  private async preprocessRequest(request: ClaudetteRequest): Promise<ClaudetteRequest> {
    const totalLength = request.prompt.length + (request.files?.join('').length || 0);
    const estimatedTokens = Math.ceil(totalLength / 4);

    // If under threshold, return as-is
    if (estimatedTokens < this.config.thresholds.max_context_tokens) {
      return request;
    }

    // Implement intelligent compression and summarization
    if (this.config.features.compression) {
      request = await this.compressRequest(request);
    }
    
    if (this.config.features.summarization && estimatedTokens > this.config.thresholds.max_context_tokens * 0.8) {
      request = await this.summarizeRequest(request);
    }
    
    // Fallback: truncate if still too long
    const finalTokens = Math.ceil((request.prompt.length + (request.files?.join('').length || 0)) / 4);
    if (finalTokens > this.config.thresholds.max_context_tokens) {
      console.warn(`Request tokens (${finalTokens}) still exceed threshold after processing, truncating...`);
      const maxChars = this.config.thresholds.max_context_tokens * 4;
      if (request.prompt.length > maxChars) {
        request.prompt = request.prompt.substring(0, maxChars) + '\n\n[Content truncated after compression/summarization...]';
      }
    }

    return request;
  }

  /**
   * Load configuration from file or use defaults
   */
  private loadConfig(configPath?: string): ClaudetteConfig {
    const defaultConfig: ClaudetteConfig = {
      backends: {
        claude: {
          enabled: false, // Disabled by default - requires API key
          priority: 1,
          cost_per_token: 0.0003,
          model: 'claude-3-sonnet-20240229'
        },
        openai: {
          enabled: false, // Disabled by default - requires API key
          priority: 2,
          cost_per_token: 0.0001,
          model: 'gpt-4o-mini'
        },
        mistral: {
          enabled: false,
          priority: 3,
          cost_per_token: 0.0002
        },
        ollama: {
          enabled: false,
          priority: 4,
          cost_per_token: 0,
          base_url: 'http://localhost:11434',
          model: 'llama2'
        },
        qwen: {
          enabled: false, // Disabled by default - requires API key
          priority: 5,
          cost_per_token: 0.0001
        }
      },
      features: {
        caching: true,
        cost_optimization: true,
        performance_monitoring: true,
        smart_routing: true,
        mcp_integration: true,
        compression: true,
        summarization: true
      },
      thresholds: {
        cache_ttl: 3600,
        max_cache_size: 10000,
        cost_warning: 0.1,
        max_context_tokens: 32000,
        compression_threshold: 50000
      }
    };

    if (configPath && existsSync(configPath)) {
      try {
        const configFile = JSON.parse(readFileSync(configPath, 'utf8'));
        return { ...defaultConfig, ...configFile };
      } catch (error) {
        console.warn(`Failed to load config from ${configPath}, using defaults`);
      }
    }

    // Try to load from standard locations
    const standardPaths = [
      join(process.cwd(), 'claudette.config.json'),
      join(homedir(), '.claude', 'claudette', 'config.json')
    ];

    for (const path of standardPaths) {
      if (existsSync(path)) {
        try {
          const configFile = JSON.parse(readFileSync(path, 'utf8'));
          return { ...defaultConfig, ...configFile };
        } catch (error) {
          console.warn(`Failed to load config from ${path}`);
        }
      }
    }

    return defaultConfig;
  }

  /**
   * Initialize backends based on configuration
   */
  private async initializeBackends(): Promise<void> {
    // Initialize Claude backend
    if (this.config.backends.claude.enabled) {
      const claude = new ClaudeBackend(this.config.backends.claude);
      this.router.registerBackend(claude);
    }

    // Initialize OpenAI backend with availability check
    if (this.config.backends.openai.enabled || process.env.OPENAI_API_KEY) {
      try {
        // Enable OpenAI backend if API key is available in environment
        const openaiConfig = {
          ...this.config.backends.openai,
          enabled: true,
          api_key: this.config.backends.openai.api_key || process.env.OPENAI_API_KEY
        };
        const openai = new OpenAIBackend(openaiConfig);
        this.router.registerBackend(openai);
        console.log('✅ OpenAI backend registered');
      } catch (error) {
        console.warn('⚠️ OpenAI backend registration failed:', error instanceof Error ? error.message : String(error));
      }
    }

    // Initialize Qwen backend with availability check
    if (this.config.backends.qwen.enabled) {
      try {
        const qwen = new QwenBackend(this.config.backends.qwen);
        this.router.registerBackend(qwen);
        console.log('✅ Qwen backend registered');
      } catch (error) {
        console.warn('⚠️ Qwen backend registration failed:', error instanceof Error ? error.message : String(error));
      }
    }

    // Initialize Adaptive Qwen backend if configured
    if (this.config.backends.qwen.enabled && (this.config.backends.qwen as any).backend_type === 'adaptive') {
      try {
        const adaptiveQwen = new AdaptiveQwenBackend(this.config.backends.qwen as any);
        this.router.registerBackend(adaptiveQwen);
        console.log('✅ Adaptive Qwen backend registered');
      } catch (error) {
        console.warn('⚠️ Adaptive Qwen backend registration failed:', error instanceof Error ? error.message : String(error));
      }
    }

    // Initialize mock backend for testing when no API keys are available
    if (this.router.getBackends().length === 0) {
      const mockBackend = new MockBackend({
        enabled: true,
        priority: 999,
        cost_per_token: 0,
        model: 'mock-backend-v1',
        simulateLatency: 50,
        simulateFailure: false,
        mockResponses: [
          'This is a mock response for testing purposes. The backend routing system is working correctly.',
          'Mock backend successfully handled the request. All system components are functioning.',
          'Test response from mock backend. The AI middleware is operational.'
        ]
      });
      this.router.registerBackend(mockBackend);
      console.log('✅ Mock backend registered (no API backends available)');
    }

    // Initialize Ollama backend with availability check
    if (this.config.backends.ollama.enabled || process.env.OLLAMA_API_URL || process.env.FLEXCON_API_URL) {
      try {
        // Enable Ollama backend if environment variables are available
        const ollamaConfig = {
          ...this.config.backends.ollama,
          enabled: true,
          base_url: this.config.backends.ollama.base_url || 
                   process.env.FLEXCON_API_URL || 
                   process.env.OLLAMA_API_URL || 
                   'http://localhost:11434',
          api_key: this.config.backends.ollama.api_key || 
                   process.env.FLEXCON_API_KEY || 
                   process.env.OLLAMA_API_KEY,
          model: this.config.backends.ollama.model || 
                 process.env.FLEXCON_MODEL || 
                 process.env.OLLAMA_MODEL || 
                 'llama2'
        };
        
        const ollama = new OllamaBackend(ollamaConfig as any);
        this.router.registerBackend(ollama);
        console.log('✅ Ollama backend registered');
      } catch (error) {
        console.warn('⚠️ Ollama backend registration failed:', error instanceof Error ? error.message : String(error));
      }
    }

    // TODO: Initialize Mistral backend
  }

  /**
   * Record entry in quota ledger
   */
  private async recordQuotaEntry(
    request: ClaudetteRequest, 
    response: ClaudetteResponse
  ): Promise<void> {
    try {
      const promptHash = createHash('md5').update(request.prompt).digest('hex');
      
      this.db.addQuotaEntry({
        timestamp: new Date().toISOString(),
        backend: response.backend_used,
        prompt_hash: promptHash,
        tokens_input: response.tokens_input,
        tokens_output: response.tokens_output,
        cost_eur: response.cost_eur,
        cache_hit: response.cache_hit,
        latency_ms: response.latency_ms
      });
    } catch (error) {
      console.warn(`Failed to record quota entry: ${error}`);
    }
  }

  /**
   * Execute hook with error handling
   */
  private async executeHook(hookName: string, context: HookContext): Promise<HookResult> {
    const startTime = Date.now();
    
    try {
      // Hook execution not implemented yet
      // For now, just log
      console.log(`Hook ${hookName} executed with context:`, context);
      
      return {
        success: true,
        duration_ms: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Hook execution failed',
        duration_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get system status and statistics
   */
  async getStatus(): Promise<{
    healthy: boolean;
    database: any;
    cache: any;
    backends: any;
    version: string;
  }> {
    const dbHealth = this.db.healthCheck();
    const cacheStats = this.cache.getStats();
    const routerStats = this.router.getStats();
    const backendHealth = await this.router.healthCheckAll();

    return {
      healthy: dbHealth.healthy && cacheStats.hit_rate >= 0,
      database: dbHealth,
      cache: cacheStats,
      backends: {
        stats: routerStats,
        health: backendHealth
      },
      version: '3.0.0'
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): ClaudetteConfig {
    return this.config;
  }

  /**
   * Compress request content using intelligent algorithms
   */
  private async compressRequest(request: ClaudetteRequest): Promise<ClaudetteRequest> {
    try {
      // Simple compression strategy: remove redundant whitespace and comments
      let compressedPrompt = request.prompt
        .replace(/\s+/g, ' ') // Multiple spaces to single space
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
        .replace(/\/\/.*$/gm, '') // Remove line comments
        .replace(/^\s+|\s+$/gm, '') // Trim lines
        .trim();

      // Compress file contents if present
      const compressedFiles = request.files?.map(file => {
        return file
          .replace(/\s+/g, ' ')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*$/gm, '')
          .replace(/^\s+|\s+$/gm, '')
          .trim();
      });

      const originalSize = request.prompt.length + (request.files?.join('').length || 0);
      const compressedSize = compressedPrompt.length + (compressedFiles?.join('').length || 0);
      const compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1;

      console.log(`Compression: ${originalSize} → ${compressedSize} bytes (${(compressionRatio * 100).toFixed(1)}%)`);

      return {
        ...request,
        prompt: compressedPrompt,
        files: compressedFiles,
        metadata: {
          ...request.metadata,
          compression_applied: true,
          compression_ratio: compressionRatio,
          original_size: originalSize
        }
      };
    } catch (error) {
      console.warn(`Compression failed: ${error}, using original request`);
      return request;
    }
  }

  /**
   * Summarize request content using extractive summarization
   */
  private async summarizeRequest(request: ClaudetteRequest): Promise<ClaudetteRequest> {
    try {
      // Simple extractive summarization: keep most important sentences
      const sentences = request.prompt.split(/[.!?]+/).filter(s => s.trim().length > 10);
      
      if (sentences.length <= 3) {
        return request; // Already short enough
      }

      // Score sentences by keyword density and position
      const keywords = this.extractKeywords(request.prompt);
      const scoredSentences = sentences.map((sentence, index) => {
        let score = 0;
        
        // Position score (earlier sentences are more important)
        score += Math.max(0, 10 - index);
        
        // Keyword score
        keywords.forEach(keyword => {
          if (sentence.toLowerCase().includes(keyword.toLowerCase())) {
            score += keyword.length;
          }
        });
        
        // Length penalty for very long sentences
        if (sentence.length > 200) {
          score -= sentence.length * 0.01;
        }
        
        return { sentence: sentence.trim(), score, index };
      });

      // Keep top 50% of sentences, maintaining order
      const keepCount = Math.max(2, Math.floor(sentences.length * 0.5));
      const selectedSentences = scoredSentences
        .sort((a, b) => b.score - a.score)
        .slice(0, keepCount)
        .sort((a, b) => a.index - b.index)
        .map(s => s.sentence);

      const summarizedPrompt = selectedSentences.join('. ') + 
        `\n\n[Summarized from ${sentences.length} to ${selectedSentences.length} sentences]`;

      const originalSize = request.prompt.length;
      const summarizedSize = summarizedPrompt.length;
      const reductionRatio = originalSize > 0 ? summarizedSize / originalSize : 1;

      console.log(`Summarization: ${originalSize} → ${summarizedSize} chars (${(reductionRatio * 100).toFixed(1)}%)`);

      return {
        ...request,
        prompt: summarizedPrompt,
        metadata: {
          ...request.metadata,
          summarization_applied: true,
          reduction_ratio: reductionRatio,
          original_sentence_count: sentences.length,
          summarized_sentence_count: selectedSentences.length
        }
      };
    } catch (error) {
      console.warn(`Summarization failed: ${error}, using original request`);
      return request;
    }
  }

  /**
   * Extract key terms from text for summarization scoring
   */
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction: remove stop words and get frequent terms
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
    ]);

    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));

    // Count word frequency
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });

    // Return top 10 most frequent words
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.db.cleanup();
    this.db.close();
  }
}

// Export the main optimize function as a singleton
let claudetteInstance: Claudette | null = null;

export async function optimize(
  prompt: string,
  files: string[] = [],
  options: any = {}
): Promise<ClaudetteResponse> {
  if (!claudetteInstance) {
    claudetteInstance = new Claudette();
  }
  
  return claudetteInstance.optimize(prompt, files, options);
}

// Export other utilities
export * from './types/index';
export { 
  RAGManager,
  DockerRAGProvider,
  MCPRAGProvider,
  BaseRAGProvider 
} from './rag/index';
export {
  createMCPProvider,
  createDockerProvider,
  createRemoteProvider,
  createRAGManager,
  autoConfigureRAG
} from './rag/providers';
export * from './setup/index';