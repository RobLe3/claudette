// Error handling and recovery system for setup wizard

import chalk from 'chalk';
import { SetupStep, StepResult } from '../types';
import { InteractivePrompts } from './interactive-prompts';

export type ErrorAction = 'retry' | 'skip' | 'abort' | 'fix';

export interface ErrorRecoveryOptions {
  canRetry: boolean;
  canSkip: boolean;
  canFix: boolean;
  fixInstructions?: string;
  skipWarning?: string;
}

export class ErrorHandler {
  private prompts: InteractivePrompts;

  constructor() {
    this.prompts = new InteractivePrompts();
  }

  /**
   * Handle step execution error with recovery options
   */
  async handleStepError(step: SetupStep, result: StepResult): Promise<ErrorAction> {
    console.log(chalk.red(`\n❌ ${step.name} failed`));
    
    if (result.error) {
      console.log(chalk.red(`Error: ${result.error.message}`));
    }
    
    if (result.message) {
      console.log(chalk.yellow(`Details: ${result.message}`));
    }

    const options = this.getRecoveryOptions(step, result);
    return await this.promptRecoveryAction(step, options);
  }

  /**
   * Handle validation errors
   */
  async handleValidationError(component: string, error: string, fixSuggestion?: string): Promise<ErrorAction> {
    console.log(chalk.red(`\n❌ Validation failed: ${component}`));
    console.log(chalk.red(`Error: ${error}`));
    
    if (fixSuggestion) {
      console.log(chalk.yellow(`💡 Suggestion: ${fixSuggestion}`));
    }

    const actions = [
      { name: 'Try to fix automatically', value: 'fix' },
      { name: 'Retry validation', value: 'retry' },
      { name: 'Skip this validation', value: 'skip' },
      { name: 'Abort setup', value: 'abort' }
    ];

    return await this.prompts.select('How would you like to proceed?', actions);
  }

  /**
   * Handle network/connectivity errors
   */
  async handleNetworkError(operation: string, error: Error): Promise<ErrorAction> {
    console.log(chalk.red(`\n❌ Network error during ${operation}`));
    console.log(chalk.red(`Error: ${error.message}`));
    
    // Provide specific guidance for common network issues
    const guidance = this.getNetworkErrorGuidance(error);
    if (guidance) {
      console.log(chalk.yellow(`💡 ${guidance}`));
    }

    const actions = [
      { name: 'Retry operation', value: 'retry' },
      { name: 'Skip this step', value: 'skip' },
      { name: 'Abort setup', value: 'abort' }
    ];

    return await this.prompts.select('Network issue detected. How would you like to proceed?', actions);
  }

  /**
   * Handle credential/authentication errors
   */
  async handleCredentialError(backend: string, error: string): Promise<ErrorAction> {
    console.log(chalk.red(`\n❌ Authentication failed: ${backend}`));
    console.log(chalk.red(`Error: ${error}`));
    
    const isApiKeyIssue = error.toLowerCase().includes('api key') || 
                         error.toLowerCase().includes('authentication') ||
                         error.toLowerCase().includes('unauthorized');
    
    if (isApiKeyIssue) {
      console.log(chalk.yellow('💡 This looks like an API key issue. Common solutions:'));
      console.log(chalk.yellow('   • Verify your API key is correct'));
      console.log(chalk.yellow('   • Check if API key has necessary permissions'));
      console.log(chalk.yellow('   • Ensure API key hasn\'t expired'));
    }

    const actions = [
      { name: 'Re-enter credentials', value: 'fix' },
      { name: 'Skip this backend', value: 'skip' },
      { name: 'Retry with current credentials', value: 'retry' },
      { name: 'Abort setup', value: 'abort' }
    ];

    return await this.prompts.select('Credential issue detected. How would you like to proceed?', actions);
  }

  /**
   * Handle permission/access errors
   */
  async handlePermissionError(resource: string, operation: string): Promise<ErrorAction> {
    console.log(chalk.red(`\n❌ Permission denied: ${operation} on ${resource}`));
    
    console.log(chalk.yellow('💡 Possible solutions:'));
    console.log(chalk.yellow('   • Run with appropriate permissions (sudo/admin)'));
    console.log(chalk.yellow('   • Check file/directory ownership'));
    console.log(chalk.yellow('   • Verify write access to target location'));

    const actions = [
      { name: 'Retry operation', value: 'retry' },
      { name: 'Try alternative location', value: 'fix' },
      { name: 'Skip this operation', value: 'skip' },
      { name: 'Abort setup', value: 'abort' }
    ];

    return await this.prompts.select('Permission issue detected. How would you like to proceed?', actions);
  }

  /**
   * Handle dependency missing errors
   */
  async handleDependencyError(dependency: string, installInstructions?: string): Promise<ErrorAction> {
    console.log(chalk.red(`\n❌ Missing dependency: ${dependency}`));
    
    if (installInstructions) {
      console.log(chalk.yellow(`💡 Installation instructions:`));
      console.log(chalk.yellow(`   ${installInstructions}`));
    }

    const actions = [
      { name: 'Try to install automatically', value: 'fix' },
      { name: 'I\'ve installed it manually, retry', value: 'retry' },
      { name: 'Skip features requiring this dependency', value: 'skip' },
      { name: 'Abort setup', value: 'abort' }
    ];

    return await this.prompts.select('Missing dependency detected. How would you like to proceed?', actions);
  }

  /**
   * Display error summary at the end of failed setup
   */
  displayErrorSummary(errors: Array<{ step: string; error: string; action: ErrorAction }>): void {
    if (errors.length === 0) return;

    console.log(chalk.red('\n📋 Setup Issues Summary\n'));
    
    errors.forEach((error, index) => {
      const icon = this.getActionIcon(error.action);
      console.log(`${index + 1}. ${chalk.red(error.step)}: ${error.error}`);
      console.log(`   ${icon} Action: ${this.getActionDescription(error.action)}\n`);
    });
  }

  /**
   * Get recovery options based on step and error type
   */
  private getRecoveryOptions(step: SetupStep, result: StepResult): ErrorRecoveryOptions {
    const options: ErrorRecoveryOptions = {
      canRetry: true,
      canSkip: !step.required,
      canFix: false
    };

    // Determine if error is fixable
    if (result.error) {
      const errorMsg = result.error.message.toLowerCase();
      
      if (errorMsg.includes('permission') || errorMsg.includes('access')) {
        options.canFix = true;
        options.fixInstructions = 'Try running with appropriate permissions';
      } else if (errorMsg.includes('network') || errorMsg.includes('timeout')) {
        options.canFix = true;
        options.fixInstructions = 'Check network connection and try again';
      } else if (errorMsg.includes('api key') || errorMsg.includes('credential')) {
        options.canFix = true;
        options.fixInstructions = 'Re-enter credentials';
      } else if (errorMsg.includes('dependency') || errorMsg.includes('not found')) {
        options.canFix = true;
        options.fixInstructions = 'Install missing dependencies';
      }
    }

    if (options.canSkip && step.required === false) {
      options.skipWarning = `Skipping ${step.name} may limit functionality`;
    }

    return options;
  }

  /**
   * Prompt user for recovery action
   */
  private async promptRecoveryAction(step: SetupStep, options: ErrorRecoveryOptions): Promise<ErrorAction> {
    const actions: Array<{ name: string; value: ErrorAction }> = [];

    if (options.canFix) {
      actions.push({ name: `Try to fix - ${options.fixInstructions || 'Attempt automatic fix'}`, value: 'fix' });
    }

    if (options.canRetry) {
      actions.push({ name: 'Retry this step', value: 'retry' });
    }

    if (options.canSkip) {
      const skipText = options.skipWarning 
        ? `Skip (${options.skipWarning})`
        : 'Skip this step';
      actions.push({ name: skipText, value: 'skip' });
    }

    actions.push({ name: 'Abort setup', value: 'abort' });

    try {
      return await this.prompts.select('How would you like to proceed?', actions);
    } catch (error) {
      // If prompts fail, default to abort for safety
      console.log(chalk.yellow('   ⚠️  Unable to get user input, aborting setup'));
      return 'abort';
    }
  }

  /**
   * Get network error guidance
   */
  private getNetworkErrorGuidance(error: Error): string | null {
    const message = error.message.toLowerCase();

    if (message.includes('timeout')) {
      return 'Network timeout - check your internet connection';
    } else if (message.includes('dns') || message.includes('resolve')) {
      return 'DNS resolution failed - check your DNS settings';
    } else if (message.includes('connection refused')) {
      return 'Connection refused - service may be down or blocked by firewall';
    } else if (message.includes('ssl') || message.includes('certificate')) {
      return 'SSL/Certificate issue - check system time and certificate store';
    }

    return null;
  }

  /**
   * Get icon for action type
   */
  private getActionIcon(action: ErrorAction): string {
    switch (action) {
      case 'retry': return chalk.blue('🔄');
      case 'skip': return chalk.yellow('⏭️');
      case 'fix': return chalk.green('🔧');
      case 'abort': return chalk.red('🚫');
      default: return chalk.gray('❓');
    }
  }

  /**
   * Get human-readable description for action
   */
  private getActionDescription(action: ErrorAction): string {
    switch (action) {
      case 'retry': return 'Retried operation';
      case 'skip': return 'Skipped step';
      case 'fix': return 'Attempted fix';
      case 'abort': return 'Aborted setup';
      default: return 'Unknown action';
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.prompts.close();
  }
}