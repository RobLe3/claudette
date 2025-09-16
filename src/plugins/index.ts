/**
 * Claudette Plugin System
 * 
 * Main entry point for the Claudette plugin system.
 * Provides comprehensive plugin development and management capabilities.
 */

// Export plugin SDK components
export {
  BasePlugin,
  BackendPlugin,
  RAGPlugin,
  CachePlugin,
  PluginManager,
  PluginUtils,
  PluginTemplates,
  pluginManager
} from './plugin-sdk';

// Export all types
export * from './types';

// Export development tools
export * from './dev-tools';

// Export validation utilities
export * from './validation';

// Export testing framework
export * from './testing';

// Plugin System Version
export const PLUGIN_SYSTEM_VERSION = '1.0.0';

// Default plugin configurations
export const DEFAULT_PLUGIN_CONFIGS = {
  backend: {
    enabled: false,
    priority: 100,
    settings: {
      timeout: 30000,
      retries: 3,
      rateLimit: {
        requestsPerMinute: 60,
        tokensPerMinute: 10000
      }
    }
  },
  rag: {
    enabled: false,
    priority: 100,
    settings: {
      topK: 5,
      scoreThreshold: 0.7,
      chunkSize: 1000,
      overlap: 200
    }
  },
  cache: {
    enabled: false,
    priority: 100,
    settings: {
      ttl: 3600,
      maxSize: 1000,
      evictionPolicy: 'lru'
    }
  }
};
