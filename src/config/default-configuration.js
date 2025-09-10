#!/usr/bin/env node

/**
 * Default Configuration Provider for Claudette Platform
 * Consolidates duplicate configuration patterns across the system
 */

class DefaultConfigurationProvider {
  constructor() {
    this.configurations = new Map();
    this.loadDefaultConfigurations();
  }

  /**
   * Load all default configurations
   */
  loadDefaultConfigurations() {
    // Backend default settings - harmonized with MCP server timeout (60s)
    this.configurations.set('backend.defaults', {
      timeout: 45000,           // 45 seconds (15s buffer under MCP timeout)
      retryCount: 3,
      retryDelay: 1000,         // 1 second
      healthCheckInterval: 60000, // 1 minute
      maxConcurrentRequests: 10,
      rateLimit: {
        requests: 100,
        window: 60000           // 1 minute
      }
    });

    // OpenAI specific settings - ENABLED with adaptive behavior
    this.configurations.set('backend.openai', {
      ...this.get('backend.defaults'),
      enabled: true,              // Enable OpenAI backend
      baseURL: 'https://api.openai.com/v1',
      defaultModel: 'gpt-4o-mini',  // More cost-effective model
      cost_per_token: 0.00015,    // GPT-4o-mini pricing
      contextLimit: 8192,
      timeout: 50000,             // Initial timeout - will be dynamically adjusted
      adaptive_timeout: true,     // Enable dynamic timeout calibration
      quality_tier: 'good',       // Expected quality tier
      specialization: ['general', 'reasoning', 'analysis']
    });

    // Claude/Anthropic specific settings  
    this.configurations.set('backend.claude', {
      ...this.get('backend.defaults'),
      baseURL: 'https://api.anthropic.com',
      defaultModel: 'claude-3-sonnet-20240229',
      cost_per_token: 0.000015,   // Claude pricing
      contextLimit: 200000,     // Claude's large context
      timeout: 45000
    });

    // Custom Backend #1 (Qwen/Flexcon) - ENABLED with adaptive behavior
    this.configurations.set('backend.qwen', {
      ...this.get('backend.defaults'),
      enabled: true,              // Enable custom backend
      baseURL: 'https://tools.flexcon-ai.de',
      defaultModel: 'gpt-oss:20b-gpu16-ctx3072',  // Full model specification
      cost_per_token: 0.001,      // Cost per 1K tokens
      contextLimit: 3072,         // Context window from model spec
      timeout: 45000,             // Initial timeout - will be dynamically adjusted
      adaptive_timeout: true,     // Enable dynamic timeout calibration
      quality_tier: 'fair',       // Expected quality tier (fine-tunable)
      specialization: ['coding', 'technical', 'cost-effective'],
      hardware_acceleration: true, // 16x GPU acceleration
      streaming_support: true,    // Real-time responses
      custom_headers: {
        'User-Agent': 'Claudette/3.0.0',
        'X-Request-Priority': 'high'
      }
    });

    // Database settings
    this.configurations.set('database.defaults', {
      connectionTimeout: 5000,
      queryTimeout: 30000,
      maxConnections: 20,
      idleTimeout: 60000,
      retryAttempts: 3,
      backupInterval: 86400000  // 24 hours
    });

    // Cache settings
    this.configurations.set('cache.defaults', {
      maxSize: 1000,            // Max entries
      ttl: 3600000,             // 1 hour
      cleanupInterval: 300000,  // 5 minutes
      compressionThreshold: 1024, // 1KB
      persistToDisk: true
    });

    // Setup wizard settings
    this.configurations.set('setup.defaults', {
      timeout: 30000,
      maxRetries: 3,
      validationTimeout: 10000,
      backendTestTimeout: 15000,
      credentialTestTimeout: 5000,
      autoAdvance: false
    });

    // Test framework settings
    this.configurations.set('test.defaults', {
      timeout: 30000,
      retryCount: 2,
      parallelExecution: false,
      verboseOutput: false,
      generateReports: true,
      cleanupAfter: true
    });

    // Security settings
    this.configurations.set('security.defaults', {
      encryptionAlgorithm: 'aes-256-gcm',
      keyDerivationIterations: 100000,
      saltLength: 32,
      nonceLength: 16,
      sessionTimeout: 3600000,  // 1 hour
      maxLoginAttempts: 5
    });

    // Performance monitoring
    this.configurations.set('monitoring.defaults', {
      metricsInterval: 60000,   // 1 minute
      alertThresholds: {
        cpuUsage: 80,           // 80%
        memoryUsage: 85,        // 85%
        responseTime: 5000,     // 5 seconds
        errorRate: 0.05         // 5%
      },
      retentionPeriod: 2592000000, // 30 days
      enableDetailedLogs: false
    });
  }

  /**
   * Get configuration by key
   */
  get(key) {
    if (this.configurations.has(key)) {
      return { ...this.configurations.get(key) };
    }
    
    console.warn(`Configuration key '${key}' not found`);
    return {};
  }

  /**
   * Get backend-specific configuration
   */
  getBackendConfig(backendName) {
    const key = `backend.${backendName}`;
    return this.get(key);
  }

  /**
   * Get configuration with environment variable overrides
   */
  getWithEnvironmentOverrides(key, envPrefix = 'CLAUDETTE') {
    const config = this.get(key);
    
    // Apply environment variable overrides
    for (const [configKey, value] of Object.entries(config)) {
      const envKey = `${envPrefix}_${key.toUpperCase().replace('.', '_')}_${configKey.toUpperCase()}`;
      const envValue = process.env[envKey];
      
      if (envValue !== undefined) {
        // Parse environment value based on original type
        if (typeof value === 'number') {
          config[configKey] = parseInt(envValue) || parseFloat(envValue) || value;
        } else if (typeof value === 'boolean') {
          config[configKey] = envValue.toLowerCase() === 'true';
        } else {
          config[configKey] = envValue;
        }
      }
    }
    
    return config;
  }

  /**
   * Merge configurations
   */
  merge(...configs) {
    return configs.reduce((merged, config) => {
      return { ...merged, ...config };
    }, {});
  }

  /**
   * Set custom configuration
   */
  set(key, config) {
    this.configurations.set(key, config);
  }

  /**
   * Get all configuration keys
   */
  getKeys() {
    return Array.from(this.configurations.keys());
  }

  /**
   * Validate configuration values
   */
  validate(key) {
    const config = this.get(key);
    const errors = [];

    // Basic validation rules
    if (key.startsWith('backend.')) {
      if (!config.timeout || config.timeout < 1000) {
        errors.push('Backend timeout must be at least 1000ms');
      }
      if (!config.retryCount || config.retryCount < 0) {
        errors.push('Backend retry count must be non-negative');
      }
    }

    if (key.startsWith('cache.')) {
      if (!config.maxSize || config.maxSize < 1) {
        errors.push('Cache max size must be at least 1');
      }
      if (!config.ttl || config.ttl < 1000) {
        errors.push('Cache TTL must be at least 1000ms');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Singleton instance
let instance = null;

function getDefaultConfiguration() {
  if (!instance) {
    instance = new DefaultConfigurationProvider();
  }
  return instance;
}

function resetConfiguration() {
  instance = null;
}

module.exports = {
  DefaultConfigurationProvider,
  getDefaultConfiguration,
  resetConfiguration
};