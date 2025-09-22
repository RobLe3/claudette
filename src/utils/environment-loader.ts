/**
 * Unified Environment Loading System
 * Ensures consistent environment variable loading across all Claudette components
 * Fixes the mismatch between .env file loading and credential storage
 */

import { config as dotenvConfig } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';
import { getCredentialManager } from '../credentials';

export interface EnvironmentConfig {
  /** Path to .env file (defaults to project root) */
  envPath?: string;
  /** Whether to load from credential storage */
  useCredentialStorage?: boolean;
  /** Whether to override existing environment variables */
  override?: boolean;
  /** Silent mode (suppress logs) */
  silent?: boolean;
}

export class EnvironmentLoader {
  private static instance: EnvironmentLoader | null = null;
  private loaded = false;
  private loadedSources: string[] = [];

  private constructor() {}

  static getInstance(): EnvironmentLoader {
    if (!EnvironmentLoader.instance) {
      EnvironmentLoader.instance = new EnvironmentLoader();
    }
    return EnvironmentLoader.instance;
  }

  /**
   * Load environment variables from all available sources
   * Priority order:
   * 1. Existing process.env (if override = false)
   * 2. .env file
   * 3. Credential storage (keychain/secure storage)
   * 4. System environment
   */
  async loadEnvironment(config: EnvironmentConfig = {}): Promise<{
    loaded: boolean;
    sources: string[];
    variablesLoaded: number;
    apiKeysFound: string[];
  }> {
    if (this.loaded && !config.override) {
      return {
        loaded: true,
        sources: this.loadedSources,
        variablesLoaded: Object.keys(process.env).length,
        apiKeysFound: this.getApiKeysFromEnv()
      };
    }

    const sources: string[] = [];
    let variablesLoaded = 0;
    const originalEnvCount = Object.keys(process.env).length;

    try {
      // 1. Load from .env file
      const envLoaded = await this.loadFromDotEnv(config);
      if (envLoaded.loaded) {
        sources.push('.env file');
        variablesLoaded += envLoaded.count;
        if (!config.silent) {
          console.log(`[EnvLoader] Loaded ${envLoaded.count} variables from .env file`);
        }
      }

      // 2. Load from credential storage
      if (config.useCredentialStorage !== false) {
        const credLoaded = await this.loadFromCredentialStorage(config);
        if (credLoaded.loaded) {
          sources.push('credential storage');
          variablesLoaded += credLoaded.count;
          if (!config.silent) {
            console.log(`[EnvLoader] Loaded ${credLoaded.count} credentials from secure storage`);
          }
        }
      }

      // 3. Validate critical API keys
      const apiKeys = this.getApiKeysFromEnv();
      if (!config.silent && apiKeys.length > 0) {
        console.log(`[EnvLoader] Found ${apiKeys.length} API keys: ${apiKeys.join(', ')}`);
      }

      this.loaded = true;
      this.loadedSources = sources;

      return {
        loaded: sources.length > 0,
        sources,
        variablesLoaded,
        apiKeysFound: apiKeys
      };

    } catch (error) {
      if (!config.silent) {
        console.error('[EnvLoader] Environment loading failed:', error);
      }
      return {
        loaded: false,
        sources: [],
        variablesLoaded: 0,
        apiKeysFound: []
      };
    }
  }

  /**
   * Load environment variables from .env file
   */
  private async loadFromDotEnv(config: EnvironmentConfig): Promise<{ loaded: boolean; count: number }> {
    const envPath = config.envPath || join(process.cwd(), '.env');
    
    if (!existsSync(envPath)) {
      return { loaded: false, count: 0 };
    }

    try {
      const beforeCount = Object.keys(process.env).length;
      
      const result = dotenvConfig({ 
        path: envPath,
        override: config.override || false 
      });

      const afterCount = Object.keys(process.env).length;
      const newVarsCount = afterCount - beforeCount;

      if (result.error) {
        throw result.error;
      }

      return { loaded: true, count: newVarsCount };
    } catch (error) {
      console.warn(`[EnvLoader] Failed to load .env file: ${error}`);
      return { loaded: false, count: 0 };
    }
  }

  /**
   * Load API keys from credential storage and set as environment variables
   */
  private async loadFromCredentialStorage(config: EnvironmentConfig): Promise<{ loaded: boolean; count: number }> {
    // Skip credential storage in CI environments
    if (process.env.CI || process.env.GITHUB_ACTIONS) {
      return { loaded: false, count: 0 };
    }
    
    try {
      const credentialManager = getCredentialManager();
      await credentialManager.initialize();

      // Map of credential keys to environment variable names
      const credentialMappings = {
        'openai-api-key': 'OPENAI_API_KEY',
        'claudette-openai': 'OPENAI_API_KEY',
        'claude-api-key': 'CLAUDE_API_KEY',
        'claudette-claude': 'CLAUDE_API_KEY',
        'anthropic-api-key': 'CLAUDE_API_KEY',
        'claudette-anthropic': 'CLAUDE_API_KEY',
        'qwen-api-key': 'QWEN_API_KEY',
        'claudette-qwen': 'QWEN_API_KEY',
        'dashscope-api-key': 'DASHSCOPE_API_KEY',
        'claudette-dashscope': 'DASHSCOPE_API_KEY',
        'codellm-api-key': 'CODELLM_API_KEY',
        'claudette-codellm': 'CODELLM_API_KEY',
        'ollama-api-key': 'OLLAMA_API_KEY',
        'claudette-ollama': 'OLLAMA_API_KEY'
      };

      let credentialsLoaded = 0;

      for (const [credKey, envVar] of Object.entries(credentialMappings)) {
        try {
          // Only set if environment variable doesn't exist or override is enabled
          if (!process.env[envVar] || config.override) {
            const credential = await credentialManager.retrieve(credKey);
            if (credential) {
              process.env[envVar] = credential;
              credentialsLoaded++;
            }
          }
        } catch (error) {
          // Continue with other credentials if one fails
          continue;
        }
      }

      return { loaded: credentialsLoaded > 0, count: credentialsLoaded };
    } catch (error) {
      console.warn(`[EnvLoader] Failed to load from credential storage: ${error}`);
      return { loaded: false, count: 0 };
    }
  }

  /**
   * Get list of API keys currently in environment
   */
  private getApiKeysFromEnv(): string[] {
    const apiKeyPatterns = [
      'OPENAI_API_KEY',
      'CLAUDE_API_KEY',
      'ANTHROPIC_API_KEY',
      'QWEN_API_KEY',
      'DASHSCOPE_API_KEY',
      'CODELLM_API_KEY',
      'OLLAMA_API_KEY',
      'CUSTOM_BACKEND_1_API_KEY',
      'CUSTOM_BACKEND_2_API_KEY',
      'CUSTOM_BACKEND_3_API_KEY'
    ];

    return apiKeyPatterns.filter(key => !!process.env[key]);
  }

  /**
   * Get environment loading status
   */
  getStatus(): {
    loaded: boolean;
    sources: string[];
    totalVariables: number;
    apiKeys: string[];
  } {
    return {
      loaded: this.loaded,
      sources: [...this.loadedSources],
      totalVariables: Object.keys(process.env).length,
      apiKeys: this.getApiKeysFromEnv()
    };
  }

  /**
   * Force reload environment (useful for testing)
   */
  async reload(config: EnvironmentConfig = {}): Promise<void> {
    this.loaded = false;
    this.loadedSources = [];
    await this.loadEnvironment({ ...config, override: true });
  }

  /**
   * Validate that required API keys are available
   */
  validateApiKeys(requiredKeys: string[]): {
    valid: boolean;
    missing: string[];
    present: string[];
  } {
    const present: string[] = [];
    const missing: string[] = [];

    for (const key of requiredKeys) {
      if (process.env[key]) {
        present.push(key);
      } else {
        missing.push(key);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
      present
    };
  }
}

// Convenience functions for easy usage
export async function loadEnvironment(config?: EnvironmentConfig) {
  const loader = EnvironmentLoader.getInstance();
  return await loader.loadEnvironment(config);
}

export function getEnvironmentStatus() {
  const loader = EnvironmentLoader.getInstance();
  return loader.getStatus();
}

export function validateRequiredKeys(keys: string[]) {
  const loader = EnvironmentLoader.getInstance();
  return loader.validateApiKeys(keys);
}

// Auto-load environment on module import (with minimal configuration)
let autoLoaded = false;

export async function ensureEnvironmentLoaded(silent = true): Promise<void> {
  if (autoLoaded) return;
  
  try {
    const loader = EnvironmentLoader.getInstance();
    await loader.loadEnvironment({ 
      useCredentialStorage: true, 
      silent 
    });
    autoLoaded = true;
  } catch (error) {
    if (!silent) {
      console.warn('[EnvLoader] Auto-load failed:', error);
    }
  }
}

// Export the singleton instance for advanced usage
export const environmentLoader = EnvironmentLoader.getInstance();