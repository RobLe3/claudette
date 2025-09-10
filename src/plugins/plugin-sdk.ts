/**
 * Claudette Plugin SDK
 * Comprehensive framework for developing Claudette plugins
 * 
 * This SDK provides interfaces, utilities, and tools for creating:
 * - Custom AI backend providers
 * - RAG system extensions
 * - Router algorithms
 * - Cache implementations
 * - Middleware components
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import { 
  Backend, 
  BackendInfo,
  BackendSettings,
  ClaudetteRequest,
  ClaudetteResponse,
  RAGProvider,
  CacheProvider
} from '../types/index';

// Plugin System Types
export interface PluginMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
  license?: string;
  homepage?: string;
  repository?: string;
  keywords?: string[];
  dependencies?: Record<string, string>;
  claudetteVersion?: string;
  category: PluginCategory;
}

export enum PluginCategory {
  BACKEND = 'backend',
  RAG = 'rag',
  CACHE = 'cache',
  ROUTER = 'router',
  MIDDLEWARE = 'middleware',
  UTILITY = 'utility'
}

export interface PluginConfig {
  enabled: boolean;
  settings?: Record<string, any>;
}

export interface PluginContext {
  logger: Logger;
  config: PluginConfig;
  events: EventEmitter;
  claudetteVersion: string;
  environment: 'development' | 'production' | 'test';
}

// Base Plugin Interface
export abstract class BasePlugin {
  public readonly metadata: PluginMetadata;
  protected context!: PluginContext;
  protected logger: Logger;
  private _initialized: boolean = false;

  constructor(metadata: PluginMetadata) {
    this.metadata = metadata;
    this.logger = new Logger();
  }

  /**
   * Initialize the plugin with context
   */
  async initialize(context: PluginContext): Promise<void> {
    if (this._initialized) {
      throw new Error(`Plugin ${this.metadata.name} already initialized`);
    }

    this.context = context;
    this.logger = context.logger;
    
    await this.onInitialize(context);
    this._initialized = true;
    
    this.logger.info(`Plugin ${this.metadata.name} v${this.metadata.version} initialized`);
  }

  /**
   * Cleanup plugin resources
   */
  async cleanup(): Promise<void> {
    if (!this._initialized) {
      return;
    }

    await this.onCleanup();
    this._initialized = false;
    
    this.logger.info(`Plugin ${this.metadata.name} cleaned up`);
  }

  /**
   * Check if plugin is initialized
   */
  get isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Plugin-specific initialization logic
   */
  protected abstract onInitialize(context: PluginContext): Promise<void>;

  /**
   * Plugin-specific cleanup logic
   */
  protected abstract onCleanup(): Promise<void>;

  /**
   * Validate plugin configuration
   */
  abstract validateConfig(config: PluginConfig): Promise<boolean>;
}

// Backend Plugin Interface
export abstract class BackendPlugin extends BasePlugin implements Backend {
  public abstract readonly name: string;

  constructor(metadata: PluginMetadata) {
    super(metadata);
    if (metadata.category !== PluginCategory.BACKEND) {
      throw new Error('BackendPlugin must have category BACKEND');
    }
  }

  // Backend interface implementation
  abstract isAvailable(): Promise<boolean>;
  abstract estimateCost(tokens: number): number;
  abstract getLatencyScore(): Promise<number>;
  abstract validateConfig(): Promise<boolean>;
  abstract getInfo(): BackendInfo;
  abstract send(request: ClaudetteRequest): Promise<ClaudetteResponse>;
  abstract processRequest(request: ClaudetteRequest): Promise<ClaudetteResponse>;
  abstract healthCheck(): Promise<boolean>;
}

// RAG Plugin Interface
export abstract class RAGPlugin extends BasePlugin {
  constructor(metadata: PluginMetadata) {
    super(metadata);
    if (metadata.category !== PluginCategory.RAG) {
      throw new Error('RAGPlugin must have category RAG');
    }
  }

  /**
   * Create RAG provider instance
   */
  abstract createProvider(config: any): Promise<RAGProvider>;

  /**
   * Get supported vector database types
   */
  abstract getSupportedVectorDBs(): string[];

  /**
   * Get supported deployment scenarios
   */
  abstract getSupportedDeployments(): string[];
}

// Cache Plugin Interface
export abstract class CachePlugin extends BasePlugin {
  constructor(metadata: PluginMetadata) {
    super(metadata);
    if (metadata.category !== PluginCategory.CACHE) {
      throw new Error('CachePlugin must have category CACHE');
    }
  }

  /**
   * Create cache provider instance
   */
  abstract createProvider(config: any): Promise<CacheProvider>;

  /**
   * Get supported cache backends
   */
  abstract getSupportedBackends(): string[];
}

// Plugin Manager
export class PluginManager extends EventEmitter {
  private plugins: Map<string, BasePlugin> = new Map();
  private pluginConfigs: Map<string, PluginConfig> = new Map();
  private logger: Logger;

  constructor() {
    super();
    this.logger = new Logger();
  }

  /**
   * Register a plugin
   */
  async registerPlugin(plugin: BasePlugin, config: PluginConfig): Promise<void> {
    const pluginName = plugin.metadata.name;

    if (this.plugins.has(pluginName)) {
      throw new Error(`Plugin ${pluginName} already registered`);
    }

    // Validate configuration
    const isValidConfig = await plugin.validateConfig(config);
    if (!isValidConfig) {
      throw new Error(`Invalid configuration for plugin ${pluginName}`);
    }

    // Store plugin and config
    this.plugins.set(pluginName, plugin);
    this.pluginConfigs.set(pluginName, config);

    // Initialize if enabled
    if (config.enabled) {
      await this.initializePlugin(pluginName);
    }

    this.emit('plugin:registered', { plugin: pluginName, config });
    this.logger.info(`Plugin ${pluginName} registered`);
  }

  /**
   * Unregister a plugin
   */
  async unregisterPlugin(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    // Cleanup if initialized
    if (plugin.isInitialized) {
      await plugin.cleanup();
    }

    this.plugins.delete(pluginName);
    this.pluginConfigs.delete(pluginName);

    this.emit('plugin:unregistered', { plugin: pluginName });
    this.logger.info(`Plugin ${pluginName} unregistered`);
  }

  /**
   * Initialize a plugin
   */
  private async initializePlugin(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    const config = this.pluginConfigs.get(pluginName);

    if (!plugin || !config) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    const context: PluginContext = {
      logger: new Logger(),
      config,
      events: this,
      claudetteVersion: process.env.CLAUDETTE_VERSION || '3.0.0', // Version from env or default
      environment: process.env.NODE_ENV as any || 'development'
    };

    await plugin.initialize(context);
    this.emit('plugin:initialized', { plugin: pluginName });
  }

  /**
   * Get plugin by name
   */
  getPlugin(pluginName: string): BasePlugin | undefined {
    return this.plugins.get(pluginName);
  }

  /**
   * Get all plugins by category
   */
  getPluginsByCategory(category: PluginCategory): BasePlugin[] {
    return Array.from(this.plugins.values())
      .filter(plugin => plugin.metadata.category === category);
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): Map<string, BasePlugin> {
    return new Map(this.plugins);
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(pluginName: string): Promise<void> {
    const config = this.pluginConfigs.get(pluginName);
    if (!config) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    if (!config.enabled) {
      config.enabled = true;
      await this.initializePlugin(pluginName);
      this.emit('plugin:enabled', { plugin: pluginName });
    }
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    const config = this.pluginConfigs.get(pluginName);

    if (!plugin || !config) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    if (config.enabled && plugin.isInitialized) {
      await plugin.cleanup();
      config.enabled = false;
      this.emit('plugin:disabled', { plugin: pluginName });
    }
  }

  /**
   * Cleanup all plugins
   */
  async cleanup(): Promise<void> {
    const cleanupPromises = Array.from(this.plugins.values())
      .filter(plugin => plugin.isInitialized)
      .map(plugin => plugin.cleanup());

    await Promise.all(cleanupPromises);
    this.logger.info('All plugins cleaned up');
  }
}

// Plugin Development Utilities
export class PluginUtils {
  /**
   * Create plugin metadata with defaults
   */
  static createMetadata(partial: Partial<PluginMetadata> & Pick<PluginMetadata, 'name' | 'version' | 'category'>): PluginMetadata {
    return {
      description: '',
      author: 'Unknown',
      license: 'MIT',
      claudetteVersion: '^2.0.0',
      keywords: [],
      ...partial
    };
  }

  /**
   * Validate metadata
   */
  static validateMetadata(metadata: PluginMetadata): string[] {
    const errors: string[] = [];

    if (!metadata.name || metadata.name.trim() === '') {
      errors.push('Plugin name is required');
    }

    if (!metadata.version || !/^\d+\.\d+\.\d+/.test(metadata.version)) {
      errors.push('Plugin version must follow semantic versioning');
    }

    if (!Object.values(PluginCategory).includes(metadata.category)) {
      errors.push('Plugin category must be one of: ' + Object.values(PluginCategory).join(', '));
    }

    return errors;
  }

  /**
   * Create development logger
   */
  static createLogger(pluginName: string): Logger {
    return new Logger();
  }
}

// Plugin Development Templates
export namespace PluginTemplates {
  /**
   * Basic backend plugin template
   */
  export const backendTemplate = `
import { BackendPlugin, PluginMetadata, PluginContext, PluginConfig, PluginUtils } from 'claudette/plugins';
import { ClaudetteRequest, ClaudetteResponse } from 'claudette/types';

  `;

  /**
   * Basic RAG plugin template
   */
  export const ragTemplate = `
import { RAGPlugin, PluginMetadata, PluginContext, PluginConfig, PluginUtils } from 'claudette/plugins';
import { RAGProvider } from 'claudette/types';

  `;
}

// Export singleton plugin manager
export const pluginManager = new PluginManager();

// Export all types and utilities
export * from './types';
export { Logger } from '../utils/logger';
