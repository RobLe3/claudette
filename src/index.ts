// Main Claudette orchestrator - the core optimize() function

import { join } from 'path';
import { homedir } from 'os';
import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { BackendConfigValidator } from './config/validator';
import logger from './utils/logger';
import { ensureEnvironmentLoaded } from './utils/environment-loader';
import { performanceHarmonizer, harmonizedBackendOperation } from './monitoring/performance-harmonizer';
import { TimingCategory, completeTimer } from './monitoring/unified-performance-system';

import { DatabaseManager } from './database/index';
import { CacheSystem } from './cache/index';
import { BackendRouter } from './router/index';
import { ClaudeBackend } from './backends/claude';
import { performanceMonitor } from './monitoring/performance-metrics';
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
    
    // Validate and auto-correct configuration
    const validationResult = BackendConfigValidator.validateConfig(this.config);
    if (validationResult.totalIssues > 0) {
      // Only show configuration validation in debug mode or if there are actual errors
      const errorCount = validationResult.backendResults ? Object.values(validationResult.backendResults).filter(r => !r.valid).length : 0;
      
      if (errorCount > 0) {
        logger.info('🔧 Configuration validation found issues:');
        logger.info(`   Total: ${validationResult.totalIssues} issues (${errorCount} errors)`);
        
        // Log critical errors only
        validationResult.globalErrors.forEach(error => logger.error(`❌ ${error}`));
        Object.values(validationResult.backendResults).forEach(result => {
          result.errors.forEach(error => logger.error(`❌ ${error}`));
        });
      }
      
      if (validationResult.correctedConfig) {
        this.config = validationResult.correctedConfig;
        // Only log auto-correction if there were actual errors
        if (errorCount > 0) {
          logger.info('✅ Configuration auto-corrected');
        }
      }
    }
    
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
   * Initialize Claudette with backends and performance monitoring
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize harmonized performance monitoring
    await performanceHarmonizer.initialize();

    // Load environment variables from all sources (CRITICAL: Must be first!)
    const envTimer = performanceHarmonizer.createHarmonizedTimer(
      'environment-loader', 'load_environment', TimingCategory.INITIALIZATION
    );
    await ensureEnvironmentLoaded(false); // Show loading messages for debugging
    completeTimer(envTimer);

    // Start performance monitoring (legacy support)
    performanceMonitor.startInitialization();

    try {
      // Initialize backends based on config
      performanceMonitor.startTiming('backend-initialization');
      await this.initializeBackends();
      performanceMonitor.recordInitializationStep('backend-health-checks');
      
      // Verify database health
      performanceMonitor.startTiming('database-health-check');
      const dbHealth = this.db.healthCheck();
      if (!dbHealth.healthy) {
        console.warn('Database health check failed, some features may not work');
      }
      performanceMonitor.endTiming('database-health-check');

      // Mark cache setup as complete
      performanceMonitor.recordInitializationStep('cache-setup', 0); // Cache is initialized in constructor

      this.initialized = true;
      
      // Complete initialization monitoring
      const initMetrics = performanceMonitor.endInitialization();
      
      // Log performance improvement
      if (initMetrics.totalInitializationTime < 1000) {
        logger.info('✅ Claudette initialized successfully with sub-second startup!');
      }
      
    } catch (error) {
      performanceMonitor.endInitialization();
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
      timeout?: number;
    } = {}
  ): Promise<ClaudetteResponse> {
    // Critical input validation - fixes null/undefined/non-string crashes
    if (prompt === null) {
      throw new ClaudetteError('Prompt cannot be null', 'INVALID_INPUT');
    }
    if (prompt === undefined) {
      throw new ClaudetteError('Prompt cannot be undefined', 'INVALID_INPUT');
    }
    if (typeof prompt !== 'string') {
      throw new ClaudetteError(`Prompt must be a string, received ${typeof prompt}`, 'INVALID_INPUT');
    }
    if (prompt.trim().length === 0) {
      throw new ClaudetteError('Prompt cannot be empty', 'INVALID_INPUT');
    }

    // Security: Check prompt length to prevent DoS
    if (prompt.length > 1000000) { // 1MB limit
      throw new ClaudetteError('Prompt too large (max 1MB)', 'INVALID_INPUT');
    }

    // Security: Basic sanitization check for potential script injection
    if (prompt.includes('<script>') || prompt.includes('javascript:')) {
      logger.warn('Potentially unsafe content detected in prompt');
    }

    // Validate files array
    if (files && !Array.isArray(files)) {
      throw new ClaudetteError('Files parameter must be an array', 'INVALID_INPUT');
    }

    // Security: Validate file paths to prevent directory traversal
    if (files && files.length > 0) {
      if (files.length > 100) {
        throw new ClaudetteError('Too many files (max 100)', 'INVALID_INPUT');
      }
      for (const file of files) {
        if (typeof file !== 'string') {
          throw new ClaudetteError('File paths must be strings', 'INVALID_INPUT');
        }
        if (file.includes('..') || file.includes('~')) {
          throw new ClaudetteError('File paths cannot contain .. or ~ for security', 'INVALID_INPUT');
        }
      }
    }

    // Validate options
    if (options && typeof options !== 'object') {
      throw new ClaudetteError('Options parameter must be an object', 'INVALID_INPUT');
    }

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

    // Set up timeout wrapper with security limits
    const maxTimeout = 300000; // 5 minutes maximum to prevent resource exhaustion
    const defaultTimeout = this.config.thresholds?.request_timeout || 45000; // Default 45 seconds
    const userTimeout = options.timeout ? Math.min(options.timeout, maxTimeout) : defaultTimeout;
    const requestTimeout = Math.max(1000, userTimeout); // Minimum 1 second
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new ClaudetteError(`Request timed out after ${requestTimeout}ms`, 'REQUEST_TIMEOUT'));
      }, requestTimeout);
    });

    try {
      // Wrap the entire request processing with timeout
      const requestProcessing = async (): Promise<ClaudetteResponse> => {
        // Execute hook sequence
        await this.executeHook('pre-task', { 
          hook_name: 'pre-task',
          task_description: this.createSafeTaskDescription(prompt),
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
          task_description: this.createSafeTaskDescription(prompt),
          metadata: { ...request.metadata, response_length: response.content.length }
        });

        return response;
      };

      // Race between request processing and timeout
      return await Promise.race([requestProcessing(), timeoutPromise]);

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
    // Apply same input validation as optimize() method
    if (prompt === null) {
      throw new ClaudetteError('Prompt cannot be null', 'INVALID_INPUT');
    }
    if (prompt === undefined) {
      throw new ClaudetteError('Prompt cannot be undefined', 'INVALID_INPUT');
    }
    if (typeof prompt !== 'string') {
      throw new ClaudetteError(`Prompt must be a string, received ${typeof prompt}`, 'INVALID_INPUT');
    }
    if (prompt.trim().length === 0) {
      throw new ClaudetteError('Prompt cannot be empty', 'INVALID_INPUT');
    }

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
          cost_per_token: 0.0001,
          model: 'qwen-plus',
          base_url: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'
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
        compression_threshold: 50000,
        request_timeout: 60000
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
   * Validate backend configuration before registration
   */
  private async validateBackendConfig(backendName: string, config: any, requiresApiKey: boolean = true): Promise<boolean> {
    try {
      // Check if API key is present and valid format (if required)
      if (requiresApiKey) {
        if (!config.api_key) {
          console.warn(`❌ ${backendName}: No API key provided`);
          return false;
        }
        
        // Basic API key format validation
        if (typeof config.api_key !== 'string' || config.api_key.length < 10) {
          console.warn(`❌ ${backendName}: Invalid API key format`);
          return false;
        }
      }

      // For backends with custom URLs, validate URL format
      if (config.base_url) {
        try {
          new URL(config.base_url);
        } catch {
          console.warn(`❌ ${backendName}: Invalid base URL format: ${config.base_url}`);
          return false;
        }
      }

      console.log(`✅ ${backendName}: Configuration validation passed`);
      return true;
    } catch (error) {
      console.warn(`❌ ${backendName}: Configuration validation failed:`, error);
      return false;
    }
  }

  /**
   * Initialize backends based on configuration - only register properly configured backends
   */
  private async initializeBackends(): Promise<void> {
    const registeredBackends: string[] = [];
    
    // Initialize Claude backend with proper validation
    const claudeApiKey = this.config.backends.claude.api_key || 
                        process.env.ANTHROPIC_API_KEY || 
                        process.env.CLAUDE_API_KEY;
    
    if ((this.config.backends.claude.enabled || claudeApiKey) && claudeApiKey) {
      const claudeConfig = {
        ...this.config.backends.claude,
        enabled: true,
        api_key: claudeApiKey
      };
      
      if (await this.validateBackendConfig('Claude', claudeConfig)) {
        try {
          const claude = new ClaudeBackend(claudeConfig);
          this.router.registerBackend(claude);
          registeredBackends.push('Claude');
          logger.info('✅ Claude backend registered');
        } catch (error) {
          logger.warn('⚠️ Claude backend registration failed:', error instanceof Error ? error.message : String(error));
        }
      }
    }

    // Initialize OpenAI backend with proper validation  
    const openaiApiKey = this.config.backends.openai.api_key || process.env.OPENAI_API_KEY;
    
    if ((this.config.backends.openai.enabled || openaiApiKey) && openaiApiKey) {
      const openaiConfig = {
        ...this.config.backends.openai,
        enabled: true,
        api_key: openaiApiKey
      };
      
      if (await this.validateBackendConfig('OpenAI', openaiConfig)) {
        try {
          const openai = new OpenAIBackend(openaiConfig);
          this.router.registerBackend(openai);
          registeredBackends.push('OpenAI');
          logger.info('✅ OpenAI backend registered');
        } catch (error) {
          logger.warn('⚠️ OpenAI backend registration failed:', error instanceof Error ? error.message : String(error));
        }
      }
    }

    // Initialize Qwen backend with proper validation
    const qwenApiKey = this.config.backends.qwen.api_key || 
                      process.env.QWEN_API_KEY || 
                      process.env.DASHSCOPE_API_KEY ||
                      process.env.CODELLM_API_KEY;
    
    if ((this.config.backends.qwen.enabled || qwenApiKey) && qwenApiKey) {
      const qwenConfig = {
        ...this.config.backends.qwen,
        enabled: true,
        api_key: qwenApiKey,
        base_url: this.config.backends.qwen.base_url ||
                 process.env.QWEN_BASE_URL ||
                 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'
      };
      
      if (await this.validateBackendConfig('Qwen', qwenConfig)) {
        try {
          const qwen = new QwenBackend(qwenConfig);
          this.router.registerBackend(qwen);
          registeredBackends.push('Qwen');
          console.log('✅ Qwen backend registered');
        } catch (error) {
          const { SecureLogger } = await import('./utils/secure-logger');
          SecureLogger.secureLog('warn', '⚠️ Qwen backend registration failed:', error instanceof Error ? error.message : String(error));
        }
      }
    }

    // Initialize FlexCon/Custom backend as Ollama backend with proper validation
    const flexconApiKey = process.env.CUSTOM_BACKEND_1_API_KEY || process.env.FLEXCON_API_KEY;
    const flexconUrl = process.env.CUSTOM_BACKEND_1_API_URL || process.env.FLEXCON_API_URL;
    
    if (flexconApiKey && flexconUrl) {
      const flexconConfig = {
        ...this.config.backends.ollama,
        enabled: true,
        api_key: flexconApiKey,
        base_url: flexconUrl,
        model: process.env.CUSTOM_BACKEND_1_MODEL || 
               process.env.FLEXCON_MODEL || 
               'gpt-oss:20b-gpu16-ctx3072'
      };
      
      if (await this.validateBackendConfig('FlexCon', flexconConfig)) {
        try {
          const flexcon = new OllamaBackend(flexconConfig as any);
          this.router.registerBackend(flexcon);
          registeredBackends.push('FlexCon');
          console.log('✅ FlexCon backend registered');
        } catch (error) {
          const { SecureLogger } = await import('./utils/secure-logger');
          SecureLogger.secureLog('warn', '⚠️ FlexCon backend registration failed:', error instanceof Error ? error.message : String(error));
        }
      }
    }

    // Initialize standard Ollama backend only if no FlexCon and Ollama URL exists
    if (!flexconApiKey && (this.config.backends.ollama.enabled || process.env.OLLAMA_API_URL)) {
      const ollamaConfig = {
        ...this.config.backends.ollama,
        enabled: true,
        base_url: this.config.backends.ollama.base_url || 
                 process.env.OLLAMA_API_URL || 
                 'http://localhost:11434',
        api_key: this.config.backends.ollama.api_key || process.env.OLLAMA_API_KEY,
        model: this.config.backends.ollama.model || 
               process.env.OLLAMA_MODEL || 
               'llama2'
      };
      
      // Ollama doesn't require API key validation
      if (await this.validateBackendConfig('Ollama', ollamaConfig, false)) {
        try {
          const ollama = new OllamaBackend(ollamaConfig as any);
          this.router.registerBackend(ollama);
          registeredBackends.push('Ollama');
          console.log('✅ Ollama backend registered');
        } catch (error) {
          console.warn('⚠️ Ollama backend registration failed:', error instanceof Error ? error.message : String(error));
        }
      }
    }

    console.log(`📋 Backend registration complete: ${registeredBackends.length} backends registered [${registeredBackends.join(', ')}]`);

    // Perform health checks with appropriate timeouts AFTER all registrations
    console.log('🔍 Performing backend health checks...');
    const healthChecks = await this.router.healthCheckAll();
    const healthyBackends = healthChecks.filter(h => h.healthy);
    
    // Always show health check results to user
    console.log(`🏥 Backend health summary: ${healthyBackends.length}/${healthChecks.length} healthy`);
    healthChecks.forEach(check => {
      const icon = check.healthy ? '✅' : '❌';
      const errorInfo = check.error ? ` (${check.error})` : '';
      console.log(`   ${icon} ${check.name}: ${check.healthy ? 'healthy' : 'unhealthy'}${errorInfo}`);
    });
    
    // Only initialize mock backend if NO backends are healthy AND we want to prevent complete failure
    if (healthyBackends.length === 0) {
      console.warn('⚠️  WARNING: No healthy backends found! This should not happen in production.');
      console.warn('⚠️  Possible causes:');
      console.warn('⚠️    - Network connectivity issues');
      console.warn('⚠️    - Invalid API keys');
      console.warn('⚠️    - API service outages');
      console.warn('⚠️    - Firewall blocking requests');
      
      if (process.env.NODE_ENV === 'development' || process.env.CLAUDETTE_ALLOW_MOCK === '1') {
        console.log('🎭 Development mode: Initializing mock backend as fallback');
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
        console.log('✅ Mock backend registered (development fallback)');
      } else {
        throw new Error('No healthy backends available and mock backend disabled in production mode');
      }
    } else {
      console.log(`🚀 Claudette ready with ${healthyBackends.length} healthy backend(s): ${healthyBackends.map(h => h.name).join(', ')}`);
    }
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
      const { SecureLogger } = await import('./utils/secure-logger');
      SecureLogger.secureLog('warn', `Failed to record quota entry:`, error);
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
   * Safely create task description from prompt (prevents null/undefined crashes)
   */
  private createSafeTaskDescription(prompt: string): string {
    try {
      if (typeof prompt !== 'string') {
        return `[Non-string prompt: ${typeof prompt}]`;
      }
      if (prompt.length <= 100) {
        return prompt;
      }
      return prompt.substring(0, 100) + '...';
    } catch (error) {
      return '[Error creating task description]';
    }
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
      version: '1.0.4'
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): ClaudetteConfig {
    return this.config;
  }

  /**
   * Generate configuration validation report
   */
  getConfigValidationReport(): string {
    const validationResult = BackendConfigValidator.validateConfig(this.config);
    return BackendConfigValidator.generateReport(validationResult);
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
      const { SecureLogger } = await import('./utils/secure-logger');
      SecureLogger.secureLog('warn', `Compression failed, using original request:`, error);
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
      const { SecureLogger } = await import('./utils/secure-logger');
      SecureLogger.secureLog('warn', `Summarization failed, using original request:`, error);
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
    // Stop background health checks to prevent hanging
    if (this.router && typeof this.router.stopBackgroundHealthChecks === 'function') {
      this.router.stopBackgroundHealthChecks();
    }
    
    // Stop metrics collection to prevent hanging
    try {
      const { globalMetrics } = await import('./monitoring/comprehensive-metrics');
      globalMetrics.stop();
    } catch (error) {
      // Ignore if metrics module not available
    }
    
    // Cleanup connection pool
    try {
      const { globalConnectionPool } = await import('./utils/connection-pool');
      await globalConnectionPool.destroy();
    } catch (error) {
      // Ignore if connection pool module not available
    }
    
    // Cleanup database connections
    this.db.cleanup();
    this.db.close();
    
    // Mark as uninitialized to allow re-initialization if needed
    this.initialized = false;
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
// RAG provider factories temporarily disabled during build fixes
// export {
//   createConfiguredMCPProvider as createMCPProvider,
//   createConfiguredDockerProvider as createDockerProvider,
//   createConfiguredRemoteProvider as createRemoteProvider,
//   createConfiguredRAGManager as createRAGManager,
//   autoConfigureRAG
// } from './rag/providers';
export * from './setup/index';