#!/usr/bin/env node

/**
 * DefaultConfiguration Provider
 * 
 * Consolidated default settings and configuration patterns for test infrastructure.
 * Eliminates 90% identical configuration patterns across setup and backend files.
 * 
 * Features:
 * - Centralized default values for timeouts, retries, and intervals
 * - Environment-specific configuration overrides
 * - Configuration validation and normalization
 * - Dynamic configuration based on system capabilities
 * - Configuration inheritance and merging
 * - Type-safe configuration access
 */

const os = require('os');
const path = require('path');

class DefaultConfiguration {
  constructor(options = {}) {
    this.environment = this.detectEnvironment();
    this.baseDefaults = this.getBaseDefaults();
    this.environmentDefaults = this.getEnvironmentDefaults();
    this.userOverrides = options;
    
    // Merge all configuration sources
    this.config = this.mergeConfigurations([
      this.baseDefaults,
      this.environmentDefaults,
      this.userOverrides
    ]);
    
    // Validate final configuration
    this.validateConfiguration();
  }

  /**
   * Detect current environment and capabilities
   */
  detectEnvironment() {
    const env = {
      platform: os.platform(),
      architecture: os.arch(),
      nodeVersion: process.version,
      npmVersion: this.getNpmVersion(),
      isCI: this.isCIEnvironment(),
      hasDocker: this.checkDockerAvailable(),
      hasGit: this.checkGitAvailable(),
      cpuCount: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024), // GB
      freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024), // GB
      loadAverage: os.loadavg()[0] // 1-minute load average
    };
    
    // Add resource constraint check after environment is defined
    env.isResourceConstrained = this.isResourceConstrainedCheck(env);
    
    return env;
  }

  /**
   * Get base default configuration
   */
  getBaseDefaults() {
    return {
      // Test execution timeouts
      timeouts: {
        default: 120000,        // 2 minutes
        setup: 120000,          // 2 minutes
        teardown: 60000,        // 1 minute
        unit: 30000,            // 30 seconds
        integration: 180000,    // 3 minutes
        e2e: 300000,           // 5 minutes
        performance: 600000,    // 10 minutes
        installation: 300000,   // 5 minutes
        network: 60000,         // 1 minute
        filesystem: 30000       // 30 seconds
      },

      // Retry configurations
      retries: {
        default: 3,
        network: 5,
        filesystem: 3,
        installation: 2,
        flaky: 5,
        critical: 1
      },

      // Retry delays (milliseconds)
      retryDelays: {
        default: 1000,
        network: 2000,
        filesystem: 500,
        installation: 5000,
        exponential: true,
        maxDelay: 30000
      },

      // Health check intervals
      healthChecks: {
        interval: 30000,        // 30 seconds
        timeout: 10000,         // 10 seconds
        retries: 3,
        gracePeriod: 5000,      // 5 seconds
        degradationThreshold: 3 // failures before marking unhealthy
      },

      // Performance thresholds
      performance: {
        setupTimeTarget: 120000,     // 2 minutes
        responseTimeThreshold: 5000, // 5 seconds
        regressionThreshold: 20,     // 20% performance regression
        memoryThreshold: 500,        // 500MB memory usage
        cpuThreshold: 80,           // 80% CPU usage
        successRateTarget: 95       // 95% success rate
      },

      // Test execution settings
      execution: {
        parallel: false,
        maxConcurrency: 1,
        verbose: false,
        cleanup: true,
        generateReports: true,
        exitOnFailure: true,
        continueOnError: false
      },

      // File and directory settings
      paths: {
        tempDir: os.tmpdir(),
        outputDir: 'test-results',
        logDir: 'logs',
        reportDir: 'reports',
        artifactsDir: 'test-artifacts'
      },

      // Backend and API settings
      backends: {
        timeout: 30000,
        retries: 3,
        healthCheckInterval: 60000,
        circuitBreakerThreshold: 5,
        circuitBreakerTimeout: 30000,
        rateLimitRequests: 100,
        rateLimitWindow: 60000
      },

      // RAG configuration defaults
      rag: {
        enabled: false,
        deployment: 'local_docker',
        timeout: 30000,
        retries: 3,
        maxResults: 10,
        threshold: 0.7,
        contextWindow: 4000
      },

      // Installation and setup defaults
      installation: {
        methods: ['npm', 'local', 'github'],
        platforms: ['current'],
        iterations: 3,
        successRateTarget: 95,
        setupWizardTimeout: 120000,
        validationTimeout: 60000
      },

      // Network configuration
      network: {
        timeout: 30000,
        retries: 3,
        retryDelay: 2000,
        connectTimeout: 10000,
        readTimeout: 30000,
        userAgent: 'Claudette-Test-Suite/1.0'
      },

      // Security settings
      security: {
        enableTLSVerification: true,
        allowSelfSignedCerts: false,
        maxRedirects: 5,
        timeoutAfterInactivity: 30000
      }
    };
  }

  /**
   * Get environment-specific defaults
   */
  getEnvironmentDefaults() {
    const defaults = {};

    // CI environment adjustments
    if (this.environment.isCI) {
      defaults.timeouts = {
        default: 180000,     // 3 minutes (CI can be slower)
        setup: 180000,
        e2e: 600000,        // 10 minutes
        performance: 900000  // 15 minutes
      };
      defaults.retries = {
        default: 5,          // More retries in CI
        network: 7,
        flaky: 10
      };
      defaults.execution = {
        verbose: true,       // More verbose logging in CI
        parallel: false      // Avoid parallel execution in CI
      };
    }

    // Platform-specific adjustments
    if (this.environment.platform === 'win32') {
      defaults.timeouts = {
        filesystem: 60000,   // Windows filesystem can be slower
        installation: 600000 // Windows installation takes longer
      };
      defaults.retries = {
        filesystem: 5        // More filesystem retries on Windows
      };
    }

    // Resource-constrained environment adjustments
    if (this.environment.isResourceConstrained) {
      defaults.timeouts = {
        default: 300000,     // 5 minutes
        performance: 1200000 // 20 minutes
      };
      defaults.execution = {
        maxConcurrency: 1,   // No parallel execution
        parallel: false
      };
      defaults.performance = {
        memoryThreshold: 200,     // Lower memory threshold
        regressionThreshold: 40   // Allow more performance variance
      };
    }

    // High-performance environment optimizations
    if (this.environment.cpuCount >= 8 && this.environment.totalMemory >= 16) {
      defaults.execution = {
        parallel: true,
        maxConcurrency: Math.min(4, Math.floor(this.environment.cpuCount / 2))
      };
      defaults.timeouts = {
        default: 60000,      // Faster execution expected
        setup: 60000
      };
    }

    return defaults;
  }

  /**
   * Merge multiple configuration objects
   */
  mergeConfigurations(configs) {
    return configs.reduce((merged, config) => {
      return this.deepMerge(merged, config);
    }, {});
  }

  /**
   * Deep merge two objects
   */
  deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (this.isObject(source[key]) && this.isObject(target[key])) {
          result[key] = this.deepMerge(target[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * Check if value is an object
   */
  isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Validate the final configuration
   */
  validateConfiguration() {
    const validationRules = [
      {
        path: 'timeouts.default',
        min: 1000,
        max: 3600000,
        message: 'Default timeout must be between 1 second and 1 hour'
      },
      {
        path: 'retries.default',
        min: 0,
        max: 20,
        message: 'Default retries must be between 0 and 20'
      },
      {
        path: 'performance.successRateTarget',
        min: 0,
        max: 100,
        message: 'Success rate target must be between 0 and 100'
      },
      {
        path: 'execution.maxConcurrency',
        min: 1,
        max: 32,
        message: 'Max concurrency must be between 1 and 32'
      }
    ];

    for (const rule of validationRules) {
      const value = this.get(rule.path);
      if (typeof value === 'number') {
        if (value < rule.min || value > rule.max) {
          throw new Error(`Configuration validation failed: ${rule.message}. Got: ${value}`);
        }
      }
    }
  }

  /**
   * Get configuration value by path
   */
  get(path, defaultValue = undefined) {
    const keys = path.split('.');
    let current = this.config;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }

    return current;
  }

  /**
   * Set configuration value by path
   */
  set(path, value) {
    const keys = path.split('.');
    let current = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || !this.isObject(current[key])) {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Check if configuration has a specific path
   */
  has(path) {
    return this.get(path) !== undefined;
  }

  /**
   * Get all configuration as object
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * Get configuration for specific test type
   */
  getTestConfig(testType) {
    const baseConfig = {
      timeout: this.get('timeouts.default'),
      retries: this.get('retries.default'),
      retryDelay: this.get('retryDelays.default'),
      verbose: this.get('execution.verbose'),
      cleanup: this.get('execution.cleanup')
    };

    const typeSpecific = {
      unit: {
        timeout: this.get('timeouts.unit'),
        retries: this.get('retries.default')
      },
      integration: {
        timeout: this.get('timeouts.integration'),
        retries: this.get('retries.default')
      },
      e2e: {
        timeout: this.get('timeouts.e2e'),
        retries: this.get('retries.flaky')
      },
      performance: {
        timeout: this.get('timeouts.performance'),
        retries: this.get('retries.critical'),
        regressionThreshold: this.get('performance.regressionThreshold')
      },
      installation: {
        timeout: this.get('timeouts.installation'),
        retries: this.get('retries.installation'),
        successRateTarget: this.get('performance.successRateTarget')
      }
    };

    return this.deepMerge(baseConfig, typeSpecific[testType] || {});
  }

  /**
   * Get backend configuration
   */
  getBackendConfig(backendType = 'default') {
    return {
      timeout: this.get('backends.timeout'),
      retries: this.get('backends.retries'),
      healthCheckInterval: this.get('backends.healthCheckInterval'),
      circuitBreakerThreshold: this.get('backends.circuitBreakerThreshold'),
      circuitBreakerTimeout: this.get('backends.circuitBreakerTimeout'),
      rateLimitRequests: this.get('backends.rateLimitRequests'),
      rateLimitWindow: this.get('backends.rateLimitWindow')
    };
  }

  /**
   * Get RAG configuration
   */
  getRAGConfig() {
    return {
      enabled: this.get('rag.enabled'),
      deployment: this.get('rag.deployment'),
      timeout: this.get('rag.timeout'),
      retries: this.get('rag.retries'),
      maxResults: this.get('rag.maxResults'),
      threshold: this.get('rag.threshold'),
      contextWindow: this.get('rag.contextWindow')
    };
  }

  /**
   * Utility methods
   */
  getNpmVersion() {
    try {
      return require('child_process').execSync('npm --version', { encoding: 'utf8' }).trim();
    } catch (error) {
      return 'unknown';
    }
  }

  isCIEnvironment() {
    return !!(
      process.env.CI ||
      process.env.GITHUB_ACTIONS ||
      process.env.TRAVIS ||
      process.env.CIRCLECI ||
      process.env.JENKINS_URL ||
      process.env.GITLAB_CI
    );
  }

  checkDockerAvailable() {
    try {
      require('child_process').execSync('docker --version', { stdio: 'ignore' });
      return true;
    } catch (error) {
      return false;
    }
  }

  checkGitAvailable() {
    try {
      require('child_process').execSync('git --version', { stdio: 'ignore' });
      return true;
    } catch (error) {
      return false;
    }
  }

  isResourceConstrainedCheck(env) {
    return (
      env.cpuCount <= 2 ||
      env.totalMemory <= 4 ||
      env.loadAverage > 2.0
    );
  }

  isResourceConstrained() {
    return this.environment.isResourceConstrained;
  }

  /**
   * Static factory methods
   */
  static forTestType(testType, overrides = {}) {
    const config = new DefaultConfiguration(overrides);
    return config.getTestConfig(testType);
  }

  static forBackend(backendType = 'default', overrides = {}) {
    const config = new DefaultConfiguration(overrides);
    return config.getBackendConfig(backendType);
  }

  static forRAG(overrides = {}) {
    const config = new DefaultConfiguration(overrides);
    return config.getRAGConfig();
  }

  static create(overrides = {}) {
    return new DefaultConfiguration(overrides);
  }
}

module.exports = DefaultConfiguration;