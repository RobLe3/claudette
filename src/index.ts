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

    // TODO: Implement compression and summarization
    // For now, just truncate if too long
    console.warn(`Request tokens (${estimatedTokens}) exceed threshold, truncating...`);
    
    const maxChars = this.config.thresholds.max_context_tokens * 4;
    if (request.prompt.length > maxChars) {
      request.prompt = request.prompt.substring(0, maxChars) + '\n\n[Content truncated...]';
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
          enabled: true,
          priority: 1,
          cost_per_token: 0.0003,
          model: 'claude-3-sonnet-20240229'
        },
        openai: {
          enabled: false,
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
          cost_per_token: 0
        },
        qwen: {
          enabled: false,
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
        compression: false, // TODO: Implement
        summarization: false // TODO: Implement
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

    // Initialize OpenAI backend
    if (this.config.backends.openai.enabled) {
      const openai = new OpenAIBackend(this.config.backends.openai);
      this.router.registerBackend(openai);
    }

    // TODO: Initialize other backends (Mistral, Ollama, Qwen)
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
      // TODO: Implement actual hook execution
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
      version: '2.1.5'
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): ClaudetteConfig {
    return this.config;
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
export * from './rag/index';