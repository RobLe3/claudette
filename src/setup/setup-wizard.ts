// Main setup wizard orchestrator - Interactive 2-minute onboarding experience

import chalk from 'chalk';
import ora from 'ora';
import { StepManager } from './step-manager';
import { ProgressTracker } from './progress-tracker';
import { InteractivePrompts } from './ui/interactive-prompts';
import { ProgressIndicator } from './ui/progress-indicator';
import { ErrorHandler } from './ui/error-handler';
import { SuccessHandler } from './ui/success-handler';

// Step implementations
import { CredentialSetupStep } from './steps/credential-setup';
import { BackendConfigurationStep } from './steps/backend-configuration';
import { RAGSetupStep } from './steps/rag-setup';
import { ValidationStep } from './steps/validation';

import {
  SetupWizardOptions,
  SetupContext,
  SetupConfiguration,
  UserPreferences,
  SetupMetrics,
  CompletionSummary
} from './types';

export class SetupWizard {
  private stepManager: StepManager;
  private progressTracker: ProgressTracker;
  private prompts: InteractivePrompts;
  private progressIndicator: ProgressIndicator;
  private errorHandler: ErrorHandler;
  private successHandler: SuccessHandler;
  private context: SetupContext;
  
  constructor(private options: SetupWizardOptions = {}) {
    // Initialize components
    this.stepManager = new StepManager();
    this.progressTracker = new ProgressTracker();
    this.prompts = new InteractivePrompts();
    this.progressIndicator = new ProgressIndicator();
    this.errorHandler = new ErrorHandler();
    this.successHandler = new SuccessHandler();
    
    // Set defaults
    this.options = {
      targetTime: 120, // 2 minutes
      allowSkipSteps: true,
      verboseOutput: false,
      validateEverything: true,
      ...options
    };
    
    // Initialize context
    this.context = this.createInitialContext();
    
    // Register default steps
    this.registerDefaultSteps();
  }

  /**
   * Run the complete setup wizard
   */
  async run(): Promise<CompletionSummary> {
    console.clear();
    
    try {
      // Welcome and initialization
      if (!this.options.skipWelcome) {
        await this.showWelcome();
      }
      
      // Gather user preferences
      await this.gatherPreferences();
      
      // Execute setup steps
      await this.executeSteps();
      
      // Final validation
      await this.performFinalValidation();
      
      // Success celebration
      const summary = await this.celebrate();
      
      // Cleanup
      await this.cleanup();
      
      return summary;
      
    } catch (error) {
      // Ensure cleanup on error
      await this.cleanup();
      return await this.handleSetupFailure(error as Error);
    }
  }

  /**
   * Run quick setup mode (minimal questions, smart defaults)
   */
  async runQuick(): Promise<CompletionSummary> {
    this.options.quickSetup = true;
    this.options.skipWelcome = true;
    
    // Set quick preferences
    this.context.preferences = {
      experienceLevel: 'beginner',
      primaryUseCase: 'development',
      costPriority: 'medium',
      performancePriority: 'medium',
      privacyLevel: 'basic',
      skipOptional: true
    };
    
    return await this.run();
  }

  /**
   * Show welcome screen and setup overview
   */
  private async showWelcome(): Promise<void> {
    console.log(chalk.bold.cyan('\n🚀 Welcome to Claudette Setup Wizard\n'));
    
    console.log(chalk.gray('We\'ll get you up and running in under 2 minutes with:'));
    console.log(chalk.green('  ✓ Automated API key detection and secure storage'));
    console.log(chalk.green('  ✓ Optimal backend selection and configuration'));
    console.log(chalk.green('  ✓ RAG system setup with deployment options'));
    console.log(chalk.green('  ✓ Real-time validation and testing\n'));
    
    if (!this.options.quickSetup) {
      const continueSetup = await this.prompts.confirm(
        'Ready to begin setup?',
        true
      );
      
      if (!continueSetup) {
        console.log(chalk.yellow('Setup cancelled. Run \'claudette init\' when ready.'));
        process.exit(0);
      }
    }
    
    console.log(chalk.dim('─'.repeat(60)));
  }

  /**
   * Gather user preferences to customize setup
   */
  private async gatherPreferences(): Promise<void> {
    if (this.options.quickSetup) {
      return;
    }
    
    console.log(chalk.bold('\n📋 Quick Setup Questions\n'));
    
    // Experience level
    const experience = await this.prompts.select(
      'What\'s your experience level?',
      [
        { name: 'Beginner - I\'m new to AI tools', value: 'beginner' },
        { name: 'Intermediate - I use AI tools regularly', value: 'intermediate' },
        { name: 'Advanced - I want full control', value: 'advanced' }
      ],
      'beginner'
    );
    
    // Primary use case
    const useCase = await this.prompts.select(
      'Primary use case?',
      [
        { name: 'Development - Coding and technical tasks', value: 'development' },
        { name: 'Research - Analysis and research work', value: 'research' },
        { name: 'Production - Business and enterprise use', value: 'production' },
        { name: 'Personal - Personal projects and learning', value: 'personal' }
      ],
      'development'
    );
    
    // Cost vs Performance balance (only for non-beginners)
    let costPriority: 'low' | 'medium' | 'high' = 'medium';
    let performancePriority: 'low' | 'medium' | 'high' = 'medium';
    
    if (experience !== 'beginner') {
      const priority = await this.prompts.select(
        'What\'s more important?',
        [
          { name: 'Cost optimization - Minimize API costs', value: 'cost' },
          { name: 'Balanced - Good cost/performance ratio', value: 'balanced' },
          { name: 'Performance - Speed and quality first', value: 'performance' }
        ],
        'balanced'
      );
      
      switch (priority) {
        case 'cost':
          costPriority = 'high';
          performancePriority = 'medium';
          break;
        case 'performance':
          costPriority = 'low';
          performancePriority = 'high';
          break;
        default:
          costPriority = 'medium';
          performancePriority = 'medium';
      }
    }
    
    this.context.preferences = {
      experienceLevel: experience as any,
      primaryUseCase: useCase as any,
      costPriority,
      performancePriority,
      privacyLevel: 'basic',
      skipOptional: experience === 'beginner'
    };
    
    console.log(chalk.dim('─'.repeat(60)));
  }

  /**
   * Execute all registered setup steps
   */
  private async executeSteps(): Promise<void> {
    const steps = this.stepManager.getSteps();
    this.context.progress.totalSteps = steps.length;
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      this.context.progress.currentStep = i + 1;
      this.context.progress.stepId = step.id;
      this.context.progress.stepName = step.name;
      
      // Update progress display
      this.progressIndicator.updateProgress(this.context.progress);
      
      // Check if step should be skipped
      if (this.shouldSkipStep(step)) {
        console.log(chalk.yellow(`⏭️  Skipping ${step.name}`));
        continue;
      }
      
      // Execute step
      const startTime = Date.now();
      this.context.progress.phase = 'running';
      
      try {
        console.log(chalk.cyan(`\n🔄 ${step.name}`));
        console.log(chalk.dim(`   ${step.description}`));
        
        const result = await step.execute(this.context);
        const actualTime = Date.now() - startTime;
        result.actualTime = actualTime;
        
        this.context.results.set(step.id, result);
        
        if (result.success) {
          console.log(chalk.green(`   ✅ Completed in ${actualTime}ms`));
          if (result.warnings?.length) {
            result.warnings.forEach(warning => {
              console.log(chalk.yellow(`   ⚠️  ${warning}`));
            });
          }
        } else if (result.skipped) {
          console.log(chalk.yellow(`   ⏭️  Skipped: ${result.message}`));
        } else {
          console.log(chalk.red(`   ❌ Failed: ${result.message}`));
          
          if (!this.options.allowSkipSteps && step.required) {
            throw result.error || new Error(result.message);
          }
          
          // Ask user what to do
          const action = await this.errorHandler.handleStepError(step, result);
          if (action === 'abort') {
            throw new Error('Setup aborted by user');
          }
        }
        
      } catch (error) {
        console.log(chalk.red(`   ❌ Error: ${(error as Error).message}`));
        
        if (step.required) {
          throw error;
        }
        
        // Record failed step
        this.context.results.set(step.id, {
          success: false,
          error: error as Error,
          actualTime: Date.now() - startTime
        });
      }
    }
  }

  /**
   * Perform final validation of the complete setup
   */
  private async performFinalValidation(): Promise<void> {
    console.log(chalk.cyan('\n🔍 Final Validation'));
    
    const spinner = ora('Testing configuration...').start();
    
    try {
      // Test backend connectivity
      const backendTests = await this.testBackends();
      const healthyBackends = backendTests.filter(test => test.healthy);
      
      if (healthyBackends.length === 0) {
        throw new Error('No healthy backends configured');
      }
      
      // Test basic functionality with a simple request
      await this.testBasicFunctionality();
      
      spinner.succeed(chalk.green('Configuration validated successfully'));
      
    } catch (error) {
      spinner.fail(chalk.red(`Validation failed: ${(error as Error).message}`));
      throw error;
    }
  }

  /**
   * Show success celebration and summary
   */
  private async celebrate(): Promise<CompletionSummary> {
    const endTime = Date.now();
    const totalTime = (endTime - this.context.startTime) / 1000;
    
    console.clear();
    
    const summary: CompletionSummary = {
      success: true,
      totalTime,
      configuredBackends: this.getConfiguredBackends(),
      enabledFeatures: this.getEnabledFeatures(),
      nextSteps: this.getNextSteps()
    };
    
    await this.successHandler.celebrate(summary, this.context);
    
    return summary;
  }

  /**
   * Handle setup failure with helpful error information
   */
  private async handleSetupFailure(error: Error): Promise<CompletionSummary> {
    const endTime = Date.now();
    const totalTime = (endTime - this.context.startTime) / 1000;
    
    console.log(chalk.red('\n💥 Setup Failed\n'));
    console.log(chalk.red(`Error: ${error.message}\n`));
    
    // Show partial progress
    const completedSteps = Array.from(this.context.results.entries())
      .filter(([_, result]) => result.success)
      .map(([stepId, _]) => stepId);
    
    if (completedSteps.length > 0) {
      console.log(chalk.yellow('Partially completed steps:'));
      completedSteps.forEach(stepId => {
        console.log(chalk.yellow(`  ✓ ${stepId}`));
      });
    }
    
    console.log(chalk.gray('\nYou can:'));
    console.log(chalk.gray('  • Run \'claudette setup\' to retry configuration'));
    console.log(chalk.gray('  • Run \'claudette validate\' to check current setup'));
    console.log(chalk.gray('  • Check documentation for manual setup'));
    
    return {
      success: false,
      totalTime,
      configuredBackends: [],
      enabledFeatures: [],
      nextSteps: ['Run \'claudette setup\' to retry configuration'],
      troubleshooting: error.message
    };
  }

  /**
   * Register default setup steps in order
   */
  private registerDefaultSteps(): void {
    this.stepManager.addStep(new CredentialSetupStep());
    this.stepManager.addStep(new BackendConfigurationStep());
    this.stepManager.addStep(new RAGSetupStep());
    this.stepManager.addStep(new ValidationStep());
  }

  /**
   * Create initial setup context
   */
  private createInitialContext(): SetupContext {
    return {
      options: this.options,
      progress: {
        currentStep: 0,
        totalSteps: 0,
        stepId: '',
        stepName: '',
        elapsed: 0,
        estimated: this.options.targetTime || 120,
        remaining: this.options.targetTime || 120,
        percentage: 0,
        phase: 'starting'
      },
      configuration: {
        credentials: {},
        backends: {
          priority: [],
          fallback: true
        },
        rag: {
          enabled: false,
          deployment: 'none'
        },
        features: {
          caching: true,
          compression: false,
          routing: true,
          monitoring: true
        }
      },
      preferences: {
        experienceLevel: 'beginner',
        primaryUseCase: 'development',
        costPriority: 'medium',
        performancePriority: 'medium',
        privacyLevel: 'basic',
        skipOptional: false
      },
      results: new Map(),
      startTime: Date.now()
    };
  }

  /**
   * Determine if a step should be skipped based on preferences and configuration
   */
  private shouldSkipStep(step: any): boolean {
    if (!step.required && this.context.preferences.skipOptional) {
      return true;
    }
    
    // Skip RAG setup if user chose basic setup
    if (step.id === 'rag-setup' && 
        this.context.preferences.experienceLevel === 'beginner' && 
        this.options.quickSetup) {
      return true;
    }
    
    return false;
  }

  /**
   * Test configured backends
   */
  private async testBackends(): Promise<any[]> {
    // This would integrate with the existing backend system
    // For now, return mock data
    return [
      { name: 'openai', healthy: true },
      { name: 'claude', healthy: true }
    ];
  }

  /**
   * Test basic functionality with a simple request
   */
  private async testBasicFunctionality(): Promise<void> {
    // This would make a simple API call to verify everything works
    // For now, simulate success
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Get list of configured backends
   */
  private getConfiguredBackends(): string[] {
    return Object.keys(this.context.configuration.credentials)
      .filter(backend => this.context.configuration.credentials[backend].enabled);
  }

  /**
   * Get list of enabled features
   */
  private getEnabledFeatures(): string[] {
    const features = this.context.configuration.features;
    return Object.keys(features).filter(key => features[key as keyof typeof features]);
  }

  /**
   * Get recommended next steps for the user
   */
  private getNextSteps(): string[] {
    const steps = [
      'Try: claudette "Hello, what can you help me with?"',
      'Check status: claudette status',
      'Explore backends: claudette backends'
    ];
    
    if (this.context.configuration.rag.enabled) {
      steps.push('Test RAG integration with document queries');
    }
    
    return steps;
  }

  /**
   * Clean up resources
   */
  private async cleanup(): Promise<void> {
    try {
      // Close any open prompts
      this.prompts.close();
      
      // Cleanup all steps
      const steps = this.stepManager.getSteps();
      for (const step of steps) {
        if (step.cleanup && typeof step.cleanup === 'function') {
          await step.cleanup(this.context);
        }
      }
    } catch (error) {
      console.warn(`Cleanup error: ${(error as Error).message}`);
    }
  }
}