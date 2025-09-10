/**
 * Validation Plugin for Claudette
 * Provides validation functionality for plugin system
 */

import { Plugin, PluginContext, PluginConfig } from './types';

export class ValidationPlugin implements Plugin {
  name = 'validation';
  version = '1.0.0';

  private context?: PluginContext;

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    context.logger.info(`ValidationPlugin v${this.version} initialized`);
  }

  async validate(data: any): Promise<boolean> {
    // Basic validation logic
    if (!data) return false;
    if (typeof data === 'object' && Object.keys(data).length === 0) return false;
    return true;
  }

  async cleanup(): Promise<void> {
    this.context?.logger.info('ValidationPlugin cleaned up');
  }
}

export default ValidationPlugin;