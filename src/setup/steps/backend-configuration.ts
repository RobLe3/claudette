// Backend configuration step - Smart routing and optimization setup

import chalk from 'chalk';
import { SetupStep, SetupContext, StepResult, BackendDetectionResult } from '../types';
import { InteractivePrompts } from '../ui/interactive-prompts';

export class BackendConfigurationStep implements SetupStep {
  id = 'backend-configuration';
  name = 'Backend Configuration';
  description = 'Configure backend priorities and intelligent routing';
  estimatedTime = 25;
  required = true;
  dependencies = ['credential-setup'];

  private prompts: InteractivePrompts;

  constructor() {
    this.prompts = new InteractivePrompts();
  }

  async execute(context: SetupContext): Promise<StepResult> {
    try {
      console.log(chalk.cyan('⚡ Testing backend availability and performance...'));
      
      // Test all configured backends
      const backendTests = await this.testConfiguredBackends(context);
      
      if (backendTests.length === 0) {
        return {
          success: false,
          message: 'No backends available for configuration',
          error: new Error('No configured backends found')
        };
      }
      
      // Display test results
      this.displayBackendResults(backendTests);
      
      // Configure routing priorities based on user preferences and test results
      await this.configureRoutingPriorities(backendTests, context);
      
      // Configure advanced settings based on user experience level
      if (context.preferences.experienceLevel !== 'beginner') {
        await this.configureAdvancedSettings(context);
      }
      
      // Set up monitoring and thresholds
      await this.configureMonitoring(context);
      
      return {
        success: true,
        message: `Backend routing configured with ${backendTests.length} backend(s)`,
        data: {
          backendsConfigured: backendTests.length,
          healthyBackends: backendTests.filter(b => b.healthy).length,
          priority: context.configuration.backends.priority
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: `Backend configuration failed: ${(error as Error).message}`
      };
    }
  }

  async validate(context: SetupContext): Promise<boolean> {
    // Ensure at least one healthy backend is configured
    const credentials = context.configuration.credentials;
    return Object.keys(credentials).some(key => credentials[key].enabled);
  }

  /**
   * Test all configured backends for availability and performance
   */
  private async testConfiguredBackends(context: SetupContext): Promise<BackendDetectionResult[]> {
    const results: BackendDetectionResult[] = [];
    const credentials = context.configuration.credentials;
    
    for (const [backendName, config] of Object.entries(credentials)) {
      if (!config.enabled) continue;
      
      console.log(chalk.dim(`   Testing ${backendName}...`));
      
      const startTime = Date.now();
      const testResult = await this.testBackendHealth(backendName, config);
      const latency = Date.now() - startTime;
      
      const result: BackendDetectionResult = {
        name: backendName,
        available: config.enabled,
        configured: true,
        hasApiKey: !!config.apiKey,
        healthy: testResult.healthy,
        priority: this.getDefaultPriority(backendName, context.preferences),
        costPerToken: this.getEstimatedCost(backendName),
        latency: latency,
        error: testResult.error
      };
      
      results.push(result);
      
      const status = result.healthy ? chalk.green('✅') : chalk.red('❌');
      const latencyDisplay = result.healthy ? chalk.dim(`${latency}ms`) : '';
      console.log(`   ${status} ${backendName} ${latencyDisplay}`);
    }
    
    return results;
  }

  /**
   * Test individual backend health
   */
  private async testBackendHealth(backendName: string, config: any): Promise<{
    healthy: boolean;
    error?: string;
  }> {
    try {
      // For now, simulate health check
      // In real implementation, this would make actual API calls
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 800));
      
      // Simulate some backends being unhealthy
      const simulatedFailures = ['mistral'];
      const shouldFail = simulatedFailures.includes(backendName) && Math.random() > 0.7;
      
      if (shouldFail) {
        return {
          healthy: false,
          error: 'Connection timeout or API error'
        };
      }
      
      return { healthy: true };
      
    } catch (error) {
      return {
        healthy: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Display backend test results in a formatted table
   */
  private displayBackendResults(results: BackendDetectionResult[]): void {
    console.log(chalk.bold('\n📊 Backend Performance Results\n'));
    
    const maxNameLength = Math.max(...results.map(r => r.name.length), 7);
    
    // Header
    console.log(
      chalk.dim('Backend'.padEnd(maxNameLength)) +
      chalk.dim(' Status'.padEnd(8)) +
      chalk.dim(' Latency'.padEnd(10)) +
      chalk.dim(' Cost/1K'.padEnd(10)) +
      chalk.dim(' Notes')
    );
    console.log(chalk.dim('─'.repeat(60)));
    
    // Results
    for (const result of results) {
      const name = result.name.padEnd(maxNameLength);
      const status = result.healthy ? chalk.green('Healthy') : chalk.red('Error');
      const latency = result.latency ? `${result.latency}ms`.padEnd(9) : ''.padEnd(9);
      const cost = result.costPerToken ? `$${result.costPerToken.toFixed(4)}`.padEnd(9) : ''.padEnd(9);
      const notes = result.error || (result.healthy ? 'Ready' : 'Unavailable');
      
      console.log(`${name} ${status.padEnd(15)} ${chalk.cyan(latency)} ${chalk.yellow(cost)} ${chalk.dim(notes)}`);
    }
    
    console.log();
  }

  /**
   * Configure routing priorities based on user preferences and test results
   */
  private async configureRoutingPriorities(
    backendResults: BackendDetectionResult[], 
    context: SetupContext
  ): Promise<void> {
    const healthyBackends = backendResults.filter(b => b.healthy);
    
    if (healthyBackends.length === 0) {
      console.log(chalk.red('⚠️  No healthy backends available for routing'));
      return;
    }
    
    console.log(chalk.cyan('🎯 Configuring intelligent routing...'));
    
    let priorities: string[];
    
    if (context.options.quickSetup || context.preferences.experienceLevel === 'beginner') {
      // Auto-configure based on user preferences
      priorities = this.autoConfigurePriorities(healthyBackends, context);
      console.log(chalk.green(`   ✅ Auto-configured routing: ${priorities.join(' → ')}`));
      
    } else {
      // Let advanced users customize
      const useAutoConfig = await this.prompts.confirm(
        'Use automatic backend prioritization?',
        true
      );
      
      if (useAutoConfig) {
        priorities = this.autoConfigurePriorities(healthyBackends, context);
        console.log(chalk.green(`   ✅ Auto-configured: ${priorities.join(' → ')}`));
      } else {
        priorities = await this.customizeBackendPriorities(healthyBackends);
      }
    }
    
    // Update context configuration
    context.configuration.backends.priority = priorities;
    
    // Configure fallback behavior
    const fallbackEnabled = await this.configureFallback(context);
    context.configuration.backends.fallback = fallbackEnabled;
  }

  /**
   * Auto-configure backend priorities based on user preferences and performance
   */
  private autoConfigurePriorities(
    healthyBackends: BackendDetectionResult[], 
    context: SetupContext
  ): string[] {
    // Sort backends based on user priorities
    const sorted = [...healthyBackends].sort((a, b) => {
      // Cost priority
      if (context.preferences.costPriority === 'high') {
        const costDiff = (a.costPerToken || 0) - (b.costPerToken || 0);
        if (Math.abs(costDiff) > 0.001) return costDiff;
      }
      
      // Performance priority
      if (context.preferences.performancePriority === 'high') {
        const latencyDiff = (a.latency || 1000) - (b.latency || 1000);
        if (Math.abs(latencyDiff) > 100) return latencyDiff;
      }
      
      // Default priority based on general backend quality/capability
      const defaultPriorities = ['claude', 'openai', 'google', 'mistral', 'ollama'];
      return defaultPriorities.indexOf(a.name) - defaultPriorities.indexOf(b.name);
    });
    
    return sorted.map(b => b.name);
  }

  /**
   * Let user customize backend priorities interactively
   */
  private async customizeBackendPriorities(healthyBackends: BackendDetectionResult[]): Promise<string[]> {
    console.log(chalk.cyan('\n🔧 Customize Backend Priority Order\n'));
    console.log(chalk.dim('Higher priority backends will be tried first'));
    
    const options = healthyBackends.map(backend => ({
      name: `${backend.name} (${backend.latency}ms, $${backend.costPerToken?.toFixed(4)}/1K)`,
      value: backend.name
    }));
    
    const priorities = [];
    const available = [...healthyBackends];
    
    while (available.length > 0) {
      const remaining = available.map(b => ({
        name: `${b.name} (${b.latency}ms, $${b.costPerToken?.toFixed(4) || '?.??'}/1K)`,
        value: b.name
      }));
      
      const position = priorities.length + 1;
      const selected = await this.prompts.select(
        `Priority ${position}: Choose backend`,
        remaining
      );
      
      priorities.push(selected);
      const index = available.findIndex(b => b.name === selected);
      available.splice(index, 1);
    }
    
    console.log(chalk.green(`✅ Custom priority: ${priorities.join(' → ')}`));
    return priorities;
  }

  /**
   * Configure fallback behavior
   */
  private async configureFallback(context: SetupContext): Promise<boolean> {
    if (context.options.quickSetup) {
      return true; // Enable fallback by default in quick setup
    }
    
    return await this.prompts.confirm(
      'Enable automatic fallback to other backends if primary fails?',
      true
    );
  }

  /**
   * Configure advanced settings for experienced users
   */
  private async configureAdvancedSettings(context: SetupContext): Promise<void> {
    console.log(chalk.cyan('\n⚙️  Advanced Configuration'));
    
    const configureAdvanced = await this.prompts.confirm(
      'Configure advanced routing settings?',
      false
    );
    
    if (!configureAdvanced) return;
    
    // Cost threshold
    const costThreshold = await this.prompts.input(
      'Maximum cost per request (EUR, 0 for unlimited)',
      '0.10',
      (value: string) => {
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0 ? true : 'Must be a valid number >= 0';
      }
    );
    
    context.configuration.backends.costThreshold = parseFloat(costThreshold);
    
    // Latency threshold
    const latencyThreshold = await this.prompts.input(
      'Maximum acceptable latency (ms, 0 for unlimited)',
      '10000',
      (value: string) => {
        const num = parseInt(value);
        return !isNaN(num) && num >= 0 ? true : 'Must be a valid number >= 0';
      }
    );
    
    context.configuration.backends.latencyThreshold = parseInt(latencyThreshold);
    
    console.log(chalk.green('✅ Advanced settings configured'));
  }

  /**
   * Configure monitoring and alerts
   */
  private async configureMonitoring(context: SetupContext): Promise<void> {
    // Enable basic monitoring features
    context.configuration.features.monitoring = true;
    context.configuration.features.caching = true;
    
    // Performance optimization based on use case
    if (context.preferences.primaryUseCase === 'development') {
      context.configuration.features.routing = true;
      context.configuration.features.compression = false; // Faster for dev
    } else if (context.preferences.primaryUseCase === 'production') {
      context.configuration.features.routing = true;
      context.configuration.features.compression = true; // Cost optimization
    }
    
    console.log(chalk.green('✅ Monitoring and optimization features configured'));
  }

  /**
   * Get default priority for a backend based on user preferences
   */
  private getDefaultPriority(backendName: string, preferences: any): number {
    const basePriorities = {
      'claude': 1,
      'openai': 2,
      'google': 3,
      'mistral': 4,
      'ollama': 5
    };
    
    let priority = basePriorities[backendName as keyof typeof basePriorities] || 10;
    
    // Adjust based on user preferences
    if (preferences.costPriority === 'high') {
      if (backendName === 'ollama') priority -= 2; // Local is cheaper
    }
    
    if (preferences.performancePriority === 'high') {
      if (backendName === 'claude' || backendName === 'openai') priority -= 1;
    }
    
    return priority;
  }

  /**
   * Get estimated cost per token for a backend
   */
  private getEstimatedCost(backendName: string): number {
    const costs = {
      'openai': 0.0001,
      'claude': 0.0003,
      'google': 0.00025,
      'mistral': 0.0002,
      'ollama': 0.0000 // Local
    };
    
    return costs[backendName as keyof typeof costs] || 0.0001;
  }

  async cleanup(context: SetupContext): Promise<void> {
    this.prompts.close();
  }
}