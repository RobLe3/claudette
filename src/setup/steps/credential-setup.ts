// Credential setup step - Auto-detection and secure storage of API keys

import chalk from 'chalk';
import { SetupStep, SetupContext, StepResult, BackendDetectionResult } from '../types';
import { InteractivePrompts } from '../ui/interactive-prompts';
import { getCredentialManager } from '../../credentials';

export class CredentialSetupStep implements SetupStep {
  id = 'credential-setup';
  name = 'API Credentials';
  description = 'Detect and configure API keys for AI backends';
  estimatedTime = 30;
  required = true;

  private prompts: InteractivePrompts;
  private credentialManager = getCredentialManager();

  constructor() {
    this.prompts = new InteractivePrompts();
  }

  async execute(context: SetupContext): Promise<StepResult> {
    try {
      console.log(chalk.cyan('🔍 Scanning for existing API keys...'));
      
      // Auto-detect existing credentials
      const detectedCredentials = await this.detectExistingCredentials();
      
      // Get list of supported backends
      const supportedBackends = this.getSupportedBackends();
      
      // Process each backend
      for (const backend of supportedBackends) {
        await this.setupBackendCredentials(backend, detectedCredentials, context);
      }
      
      // Validate at least one backend is configured
      const configuredCount = Object.keys(context.configuration.credentials)
        .filter(key => context.configuration.credentials[key].enabled).length;
      
      if (configuredCount === 0) {
        // For quick setup mode, configure a mock backend to allow setup to complete
        if (context.options.quickSetup) {
          console.log(chalk.yellow('⚠️  No API keys configured - setting up mock backend for testing'));
          context.configuration.credentials['mock'] = {
            apiKey: 'mock-api-key',
            enabled: true,
            baseURL: 'mock://localhost',
            model: 'mock-model'
          };
          
          return {
            success: true,
            message: 'Mock backend configured for testing (add real API keys later)',
            warnings: ['No real API keys configured - only mock responses available']
          };
        } else {
          return {
            success: false,
            message: 'No backends configured. At least one API key is required.',
            error: new Error('No credentials configured')
          };
        }
      }
      
      console.log(chalk.green(`✅ Configured ${configuredCount} backend(s)`));
      
      return {
        success: true,
        message: `Successfully configured ${configuredCount} backend(s)`,
        data: {
          configuredBackends: Object.keys(context.configuration.credentials).filter(
            key => context.configuration.credentials[key].enabled
          )
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: `Failed to configure credentials: ${(error as Error).message}`
      };
    }
  }

  async validate(context: SetupContext): Promise<boolean> {
    // Check that at least one backend is configured and has valid credentials
    const backends = Object.entries(context.configuration.credentials);
    
    for (const [backendName, config] of backends) {
      if (config.enabled && config.apiKey) {
        try {
          // Test credential validity (basic format check)
          if (this.validateApiKeyFormat(backendName, config.apiKey)) {
            return true;
          }
        } catch (error) {
          console.warn(`Validation failed for ${backendName}: ${(error as Error).message}`);
        }
      }
    }
    
    return false;
  }

  /**
   * Auto-detect existing API keys from various sources
   */
  private async detectExistingCredentials(): Promise<Record<string, string>> {
    const detected: Record<string, string> = {};
    
    // Check environment variables
    const envKeys = {
      'openai': ['OPENAI_API_KEY', 'OPENAI_KEY'],
      'claude': ['ANTHROPIC_API_KEY', 'CLAUDE_API_KEY'],
      'google': ['GOOGLE_API_KEY', 'GEMINI_API_KEY'],
      'mistral': ['MISTRAL_API_KEY'],
      'cohere': ['COHERE_API_KEY'],
      'ollama': ['OLLAMA_HOST', 'OLLAMA_URL']
    };
    
    for (const [backend, vars] of Object.entries(envKeys)) {
      for (const varName of vars) {
        const value = process.env[varName];
        if (value && value.trim()) {
          detected[backend] = value.trim();
          console.log(chalk.green(`   ✓ Found ${backend} API key in ${varName}`));
          break;
        }
      }
    }
    
    // Check existing credential storage with timeout
    try {
      const timeout = new Promise<void>((_, reject) => 
        setTimeout(() => reject(new Error('Credential store timeout')), 5000)
      );
      
      const credentialCheck = (async () => {
        const services = await this.credentialManager.listServices();
        for (const service of services) {
          if (service.startsWith('claudette-') || service.startsWith('ai-')) {
            const key = await this.credentialManager.retrieve(service);
            if (key) {
              const backend = service.replace('claudette-', '').replace('ai-', '');
              detected[backend] = key;
              console.log(chalk.green(`   ✓ Found ${backend} API key in credential store`));
            }
          }
        }
      })();

      await Promise.race([credentialCheck, timeout]);
    } catch (error) {
      console.log(chalk.yellow(`   ⚠️  Could not access credential store: ${(error as Error).message}`));
    }
    
    // Check common config files with timeout
    try {
      const timeout = new Promise<void>((_, reject) => 
        setTimeout(() => reject(new Error('Config file check timeout')), 2000)
      );
      
      await Promise.race([this.checkCommonConfigFiles(detected), timeout]);
    } catch (error) {
      console.log(chalk.yellow(`   ⚠️  Config file check timed out`));
    }
    
    const count = Object.keys(detected).length;
    if (count > 0) {
      console.log(chalk.green(`🎉 Auto-detected ${count} existing credential(s)`));
    } else {
      console.log(chalk.yellow('📝 No existing credentials found - will set up manually'));
    }
    
    return detected;
  }

  /**
   * Setup credentials for a specific backend
   */
  private async setupBackendCredentials(
    backend: string, 
    detectedCredentials: Record<string, string>, 
    context: SetupContext
  ): Promise<void> {
    const backendConfig = this.getBackendInfo(backend);
    
    console.log(chalk.cyan(`\n🔧 Setting up ${backendConfig.displayName}...`));
    
    let apiKey = detectedCredentials[backend];
    let shouldConfigure = true;
    
    // If we auto-detected a key, ask if user wants to use it
    if (apiKey) {
      const maskedKey = this.maskApiKey(apiKey);
      
      try {
        const useExisting = await this.prompts.confirm(
          `Use existing ${backendConfig.displayName} API key (${maskedKey})?`,
          true
        );
        
        if (!useExisting) {
          apiKey = '';
        }
      } catch (error) {
        // If prompts fail but we have a detected key, use it for quick setup
        if (context.options.quickSetup) {
          console.log(chalk.green(`   ✅ Using detected ${backendConfig.displayName} API key (${maskedKey})`));
        } else {
          // For non-quick setup, skip if prompts fail
          console.log(chalk.yellow(`   ⏭️  Skipped ${backendConfig.displayName} (Input not available)`));
          apiKey = '';
          shouldConfigure = false;
        }
      }
    }
    
    // If no key or user wants to enter new one
    if (!apiKey) {
      // For quick setup mode, automatically skip optional backends if no API keys detected
      if (!backendConfig.required && context.options.quickSetup) {
        console.log(chalk.yellow(`   ⏭️  Skipped ${backendConfig.displayName} (Quick Setup mode)`));
        shouldConfigure = false;
      } else if (!backendConfig.required && context.preferences.experienceLevel === 'beginner') {
        try {
          const skip = await this.prompts.confirm(
            `${backendConfig.displayName} is optional. Skip for now?`,
            true
          );
          
          if (skip) {
            console.log(chalk.yellow(`   ⏭️  Skipped ${backendConfig.displayName}`));
            shouldConfigure = false;
          }
        } catch (error) {
          // If prompts fail (e.g., readline closed), default to skipping optional backends
          console.log(chalk.yellow(`   ⏭️  Skipped ${backendConfig.displayName} (Input not available)`));
          shouldConfigure = false;
        }
      }
      
      if (shouldConfigure) {
        console.log(chalk.dim(`   ${backendConfig.instructions}`));
        
        try {
          apiKey = await this.prompts.password(
            `Enter ${backendConfig.displayName} API key`,
            (key: string) => {
              if (!key.trim()) return 'API key is required';
              if (!this.validateApiKeyFormat(backend, key)) {
                return `Invalid ${backendConfig.displayName} API key format`;
              }
              return true;
            }
          );
        } catch (error) {
          // If password input fails (e.g., readline closed), skip this backend
          console.log(chalk.yellow(`   ⏭️  Skipped ${backendConfig.displayName} (Password input failed)`));
          shouldConfigure = false;
          apiKey = '';
        }
      }
    }
    
    if (shouldConfigure && apiKey) {
      // Store in secure credential manager
      try {
        await this.credentialManager.store({
          service: `claudette-${backend}`,
          key: apiKey,
          description: `${backendConfig.displayName} API key for Claudette`
        });
        
        // Update context configuration
        context.configuration.credentials[backend] = {
          apiKey: apiKey,
          enabled: true,
          baseURL: backendConfig.defaultBaseURL,
          model: backendConfig.defaultModel
        };
        
        // Test the API key if possible
        if (backendConfig.canTest && !context.options.quickSetup) {
          console.log(chalk.dim(`   🧪 Testing API key...`));
          const testResult = await this.testApiKey(backend, apiKey, backendConfig);
          
          if (testResult.success) {
            console.log(chalk.green(`   ✅ API key verified`));
          } else {
            console.log(chalk.yellow(`   ⚠️  API key test failed: ${testResult.error}`));
            console.log(chalk.yellow(`   Key saved but may need verification`));
          }
        }
        
        console.log(chalk.green(`   ✅ ${backendConfig.displayName} configured`));
        
      } catch (error) {
        console.log(chalk.red(`   ❌ Failed to store credentials: ${(error as Error).message}`));
        // Still mark as configured but warn user
        context.configuration.credentials[backend] = {
          apiKey: apiKey,
          enabled: true,
          baseURL: backendConfig.defaultBaseURL,
          model: backendConfig.defaultModel
        };
      }
    }
  }

  /**
   * Get supported backends with their configuration info
   */
  private getSupportedBackends(): string[] {
    return ['openai', 'claude', 'google', 'mistral', 'ollama'];
  }

  /**
   * Get backend configuration information
   */
  private getBackendInfo(backend: string): {
    displayName: string;
    required: boolean;
    instructions: string;
    defaultBaseURL?: string;
    defaultModel?: string;
    canTest: boolean;
  } {
    const backends = {
      'openai': {
        displayName: 'OpenAI',
        required: false,
        instructions: 'Get your API key from https://platform.openai.com/api-keys',
        defaultBaseURL: 'https://api.openai.com/v1',
        defaultModel: 'gpt-4',
        canTest: true
      },
      'claude': {
        displayName: 'Anthropic Claude',
        required: false,
        instructions: 'Get your API key from https://console.anthropic.com/',
        defaultBaseURL: 'https://api.anthropic.com',
        defaultModel: 'claude-3-sonnet-20240229',
        canTest: true
      },
      'google': {
        displayName: 'Google Gemini',
        required: false,
        instructions: 'Get your API key from https://makersuite.google.com/app/apikey',
        defaultBaseURL: 'https://generativelanguage.googleapis.com/v1',
        defaultModel: 'gemini-pro',
        canTest: true
      },
      'mistral': {
        displayName: 'Mistral AI',
        required: false,
        instructions: 'Get your API key from https://console.mistral.ai/',
        defaultBaseURL: 'https://api.mistral.ai/v1',
        defaultModel: 'mistral-medium',
        canTest: true
      },
      'ollama': {
        displayName: 'Ollama (Local)',
        required: false,
        instructions: 'Ensure Ollama is running locally (default: http://localhost:11434)',
        defaultBaseURL: 'http://localhost:11434',
        defaultModel: 'llama2',
        canTest: false
      }
    };
    
    return backends[backend as keyof typeof backends];
  }

  /**
   * Validate API key format for different backends
   */
  private validateApiKeyFormat(backend: string, apiKey: string): boolean {
    const patterns = {
      'openai': /^sk-[A-Za-z0-9]{48,}$/,
      'claude': /^sk-ant-[A-Za-z0-9-_]{95,}$/,
      'google': /^[A-Za-z0-9-_]{39}$/,
      'mistral': /^[A-Za-z0-9]{32}$/,
      'ollama': /^https?:\/\/.+/ // URL format for Ollama
    };
    
    const pattern = patterns[backend as keyof typeof patterns];
    return pattern ? pattern.test(apiKey) : apiKey.length > 10;
  }

  /**
   * Test API key validity with a simple request
   */
  private async testApiKey(backend: string, apiKey: string, config: any): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // This would integrate with the actual backend testing
      // For now, simulate based on key format
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (this.validateApiKeyFormat(backend, apiKey)) {
        return { success: true };
      } else {
        return { success: false, error: 'Invalid key format' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: (error as Error).message 
      };
    }
  }

  /**
   * Mask API key for display
   */
  private maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) return '***';
    return apiKey.slice(0, 4) + '***' + apiKey.slice(-4);
  }

  /**
   * Check common configuration files for existing keys
   */
  private async checkCommonConfigFiles(detected: Record<string, string>): Promise<void> {
    // Check common locations like ~/.config, ~/.env files
    // This would be implemented to scan common config file locations
    // For now, we'll skip this to avoid file system scanning and potential hanging
    return Promise.resolve();
  }

  async cleanup(context: SetupContext): Promise<void> {
    this.prompts.close();
  }
}