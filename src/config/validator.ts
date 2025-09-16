// Backend Configuration Validator
// Validates and auto-corrects common backend configuration issues

import { BackendSettings, ClaudetteConfig } from '../types/index';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  corrected: boolean;
  correctedConfig?: BackendSettings;
}

export interface ConfigValidationResult {
  valid: boolean;
  backendResults: Record<string, ValidationResult>;
  globalErrors: string[];
  globalWarnings: string[];
  totalIssues: number;
  correctedConfig?: ClaudetteConfig;
}

export class BackendConfigValidator {
  // Configuration validation cache for performance optimization
  private static validationCache = new Map<string, { result: ConfigValidationResult; timestamp: number }>();
  private static readonly CACHE_TTL = 300000; // 5 minutes cache

  private static readonly DEFAULT_MODELS = {
    claude: 'claude-3-sonnet-20240229',
    openai: 'gpt-4o-mini',
    ollama: 'llama2',
    qwen: 'Qwen/Qwen2.5-Coder-7B-Instruct-AWQ',
    mistral: 'mistral-large-latest'
  };

  private static readonly DEFAULT_COSTS = {
    claude: 0.0003,
    openai: 0.0001,
    ollama: 0,
    qwen: 0.0001,
    mistral: 0.0002
  };

  private static readonly DEFAULT_PRIORITIES = {
    claude: 1,
    openai: 2,
    mistral: 3,
    ollama: 4,
    qwen: 5
  };

  private static readonly DEFAULT_MAX_TOKENS = {
    claude: 100000,
    openai: 128000,
    ollama: 4096,
    qwen: 32000,
    mistral: 32000
  };

  private static readonly COMMON_BASE_URLS = {
    claude: null, // Uses Anthropic's default
    openai: null, // Uses OpenAI's default
    ollama: 'http://localhost:11434',
    qwen: 'https://tools.flexcon-ai.de',
    mistral: null
  };

  /**
   * Validate a single backend configuration
   */
  static validateBackend(backendName: string, config: BackendSettings): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      corrected: false,
      correctedConfig: { ...config }
    };

    // Validate and correct model
    if (!config.model || config.model === 'default' || config.model.trim() === '') {
      const defaultModel = this.DEFAULT_MODELS[backendName as keyof typeof this.DEFAULT_MODELS];
      if (defaultModel) {
        result.warnings.push(`Missing or invalid model '${config.model}', using default: ${defaultModel}`);
        result.correctedConfig!.model = defaultModel;
        result.corrected = true;
      } else {
        result.errors.push(`Missing model configuration for ${backendName} backend`);
        result.valid = false;
      }
    }

    // Validate and correct cost_per_token
    if (typeof config.cost_per_token !== 'number' || config.cost_per_token < 0) {
      const defaultCost = this.DEFAULT_COSTS[backendName as keyof typeof this.DEFAULT_COSTS];
      if (defaultCost !== undefined) {
        result.warnings.push(`Invalid cost_per_token (${config.cost_per_token}), using default: ${defaultCost}`);
        result.correctedConfig!.cost_per_token = defaultCost;
        result.corrected = true;
      } else {
        result.errors.push(`Invalid cost_per_token for ${backendName} backend`);
        result.valid = false;
      }
    }

    // Validate and correct priority
    if (typeof config.priority !== 'number' || config.priority <= 0 || config.priority > 100) {
      const defaultPriority = this.DEFAULT_PRIORITIES[backendName as keyof typeof this.DEFAULT_PRIORITIES];
      if (defaultPriority) {
        result.warnings.push(`Invalid priority (${config.priority}), using default: ${defaultPriority}`);
        result.correctedConfig!.priority = defaultPriority;
        result.corrected = true;
      }
    }

    // Validate and correct max_tokens
    if (config.max_tokens && (typeof config.max_tokens !== 'number' || config.max_tokens <= 0)) {
      const defaultMaxTokens = this.DEFAULT_MAX_TOKENS[backendName as keyof typeof this.DEFAULT_MAX_TOKENS];
      if (defaultMaxTokens) {
        result.warnings.push(`Invalid max_tokens (${config.max_tokens}), using default: ${defaultMaxTokens}`);
        result.correctedConfig!.max_tokens = defaultMaxTokens;
        result.corrected = true;
      }
    }

    // Validate and correct base_url for backends that need it
    if (backendName === 'ollama' && !config.base_url) {
      const defaultUrl = this.COMMON_BASE_URLS.ollama!;
      result.warnings.push(`Missing base_url for Ollama, using default: ${defaultUrl}`);
      result.correctedConfig!.base_url = defaultUrl;
      result.corrected = true;
    }

    if (backendName === 'qwen' && !config.base_url) {
      const defaultUrl = this.COMMON_BASE_URLS.qwen!;
      result.warnings.push(`Missing base_url for Qwen, using default: ${defaultUrl}`);
      result.correctedConfig!.base_url = defaultUrl;
      result.corrected = true;
    }

    // Validate temperature
    if (config.temperature !== undefined && 
        (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 2)) {
      result.warnings.push(`Invalid temperature (${config.temperature}), should be between 0 and 2`);
      result.correctedConfig!.temperature = 0.7; // Safe default
      result.corrected = true;
    }

    // Backend-specific validations
    switch (backendName) {
      case 'openai':
        this.validateOpenAIConfig(result);
        break;
      case 'claude':
        this.validateClaudeConfig(result);
        break;
      case 'ollama':
        this.validateOllamaConfig(result);
        break;
      case 'qwen':
        this.validateQwenConfig(result);
        break;
    }

    return result;
  }

  private static validateOpenAIConfig(result: ValidationResult) {
    const config = result.correctedConfig!;
    
    // Validate OpenAI model names
    const validModels = ['gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'];
    if (config.model && !validModels.some(model => config.model!.startsWith(model))) {
      result.warnings.push(`Unusual OpenAI model '${config.model}'. Common models: ${validModels.join(', ')}`);
    }

    // Validate max_tokens for OpenAI
    if (config.max_tokens && config.max_tokens > 128000) {
      result.warnings.push(`max_tokens (${config.max_tokens}) exceeds OpenAI's typical limit of 128k`);
    }
  }

  private static validateClaudeConfig(result: ValidationResult) {
    const config = result.correctedConfig!;
    
    // Validate Claude model names
    const validModels = ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'claude-3-5-sonnet'];
    if (config.model && !validModels.some(model => config.model!.startsWith(model))) {
      result.warnings.push(`Unusual Claude model '${config.model}'. Common models: ${validModels.join(', ')}`);
    }

    // Claude has very high token limits
    if (config.max_tokens && config.max_tokens > 200000) {
      result.warnings.push(`max_tokens (${config.max_tokens}) is very high for Claude`);
    }
  }

  private static validateOllamaConfig(result: ValidationResult) {
    const config = result.correctedConfig!;
    
    // Validate base_url format
    if (config.base_url) {
      try {
        const url = new URL(config.base_url);
        if (!['http:', 'https:'].includes(url.protocol)) {
          result.errors.push(`Invalid Ollama base_url protocol: ${url.protocol}. Must be http: or https:`);
          result.valid = false;
        }
      } catch {
        result.errors.push(`Invalid Ollama base_url format: ${config.base_url}`);
        result.valid = false;
      }
    }

    // Ollama typically has lower token limits
    if (config.max_tokens && config.max_tokens > 32000) {
      result.warnings.push(`max_tokens (${config.max_tokens}) may be too high for local Ollama models`);
    }
  }

  private static validateQwenConfig(result: ValidationResult) {
    const config = result.correctedConfig!;
    
    // Validate base_url for Qwen
    if (config.base_url) {
      try {
        const url = new URL(config.base_url);
        if (url.protocol !== 'https:') {
          result.warnings.push(`Qwen base_url should typically use HTTPS: ${config.base_url}`);
        }
      } catch {
        result.errors.push(`Invalid Qwen base_url format: ${config.base_url}`);
        result.valid = false;
      }
    }
  }

  /**
   * Validate complete Claudette configuration
   */
  static validateConfig(config: ClaudetteConfig): ConfigValidationResult {
    // Performance optimization: Check cache first
    const configHash = JSON.stringify(config);
    const cached = this.validationCache.get(configHash);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      // Return cached result if still valid
      return cached.result;
    }

    const result: ConfigValidationResult = {
      valid: true,
      backendResults: {},
      globalErrors: [],
      globalWarnings: [],
      totalIssues: 0,
      correctedConfig: JSON.parse(JSON.stringify(config)) // Deep clone
    };

    // Validate each backend
    for (const [backendName, backendConfig] of Object.entries(config.backends)) {
      const backendResult = this.validateBackend(backendName, backendConfig);
      result.backendResults[backendName] = backendResult;

      if (!backendResult.valid) {
        result.valid = false;
      }

      result.totalIssues += backendResult.errors.length + backendResult.warnings.length;

      // Apply corrections to main config
      if (backendResult.corrected && backendResult.correctedConfig) {
        (result.correctedConfig!.backends as any)[backendName] = backendResult.correctedConfig;
      }
    }

    // Global configuration validation
    this.validateGlobalConfig(config, result);

    // Cache the result for performance optimization
    this.validationCache.set(configHash, {
      result: JSON.parse(JSON.stringify(result)), // Deep clone for immutability
      timestamp: now
    });
    
    // Clean up old cache entries (keep cache size manageable)
    this.cleanupCache();

    return result;
  }

  private static validateGlobalConfig(config: ClaudetteConfig, result: ConfigValidationResult) {
    // Validate thresholds
    if (config.thresholds) {
      const thresholds = config.thresholds;
      
      if (thresholds.cache_ttl && (thresholds.cache_ttl < 60 || thresholds.cache_ttl > 86400)) {
        result.globalWarnings.push(`cache_ttl (${thresholds.cache_ttl}) should be between 60 and 86400 seconds`);
      }

      if (thresholds.max_cache_size && (thresholds.max_cache_size < 100 || thresholds.max_cache_size > 100000)) {
        result.globalWarnings.push(`max_cache_size (${thresholds.max_cache_size}) should be between 100 and 100000`);
      }

      if (thresholds.max_context_tokens && thresholds.max_context_tokens < 1000) {
        result.globalWarnings.push(`max_context_tokens (${thresholds.max_context_tokens}) seems very low`);
      }
    }

    // Check for at least one enabled backend
    const enabledBackends = Object.entries(config.backends).filter(([_, backend]) => backend.enabled);
    if (enabledBackends.length === 0) {
      result.globalWarnings.push('No backends are enabled - system will use mock backend only');
    }

    // Check for duplicate priorities
    const priorities = Object.entries(config.backends)
      .filter(([_, backend]) => backend.enabled)
      .map(([name, backend]) => ({ name, priority: backend.priority }));
    
    const priorityMap = new Map<number, string[]>();
    priorities.forEach(({ name, priority }) => {
      if (!priorityMap.has(priority)) {
        priorityMap.set(priority, []);
      }
      priorityMap.get(priority)!.push(name);
    });

    priorityMap.forEach((names, priority) => {
      if (names.length > 1) {
        result.globalWarnings.push(`Multiple backends have same priority ${priority}: ${names.join(', ')}`);
      }
    });

    result.totalIssues += result.globalErrors.length + result.globalWarnings.length;
  }

  /**
   * Clean up expired cache entries
   */
  private static cleanupCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, cached] of this.validationCache.entries()) {
      if ((now - cached.timestamp) > this.CACHE_TTL) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.validationCache.delete(key));
    
    // Keep cache size under control (max 100 entries)
    if (this.validationCache.size > 100) {
      const entries = Array.from(this.validationCache.entries())
        .sort(([,a], [,b]) => a.timestamp - b.timestamp);
      
      // Remove oldest 20 entries
      for (let i = 0; i < 20 && entries.length > 0; i++) {
        this.validationCache.delete(entries[i][0]);
      }
    }
  }

  /**
   * Clear validation cache (useful for testing)
   */
  static clearCache(): void {
    this.validationCache.clear();
  }

  /**
   * Generate a human-readable validation report
   */
  static generateReport(validationResult: ConfigValidationResult): string {
    const lines = ['# Backend Configuration Validation Report', ''];
    
    if (validationResult.valid) {
      lines.push('✅ **Overall Status: VALID**');
    } else {
      lines.push('❌ **Overall Status: INVALID**');
    }
    
    lines.push(`📊 **Total Issues: ${validationResult.totalIssues}**`, '');

    // Global issues
    if (validationResult.globalErrors.length > 0) {
      lines.push('## Global Errors', '');
      validationResult.globalErrors.forEach(error => lines.push(`❌ ${error}`));
      lines.push('');
    }

    if (validationResult.globalWarnings.length > 0) {
      lines.push('## Global Warnings', '');
      validationResult.globalWarnings.forEach(warning => lines.push(`⚠️ ${warning}`));
      lines.push('');
    }

    // Backend-specific issues
    for (const [backendName, backendResult] of Object.entries(validationResult.backendResults)) {
      const hasIssues = backendResult.errors.length > 0 || backendResult.warnings.length > 0;
      if (!hasIssues) continue;

      lines.push(`## ${backendName.toUpperCase()} Backend`);
      lines.push(`**Status: ${backendResult.valid ? 'Valid' : 'Invalid'}** | **Corrected: ${backendResult.corrected ? 'Yes' : 'No'}**`, '');

      if (backendResult.errors.length > 0) {
        lines.push('### Errors');
        backendResult.errors.forEach(error => lines.push(`❌ ${error}`));
        lines.push('');
      }

      if (backendResult.warnings.length > 0) {
        lines.push('### Warnings');
        backendResult.warnings.forEach(warning => lines.push(`⚠️ ${warning}`));
        lines.push('');
      }
    }

    return lines.join('\n');
  }
}