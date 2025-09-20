// Progress indicator and visual feedback for setup wizard

import chalk from 'chalk';
import { SetupProgress } from '../types';

export class ProgressIndicator {
  private lastDisplay: string = '';

  /**
   * Update and display progress
   */
  updateProgress(progress: SetupProgress): void {
    const display = this.formatProgress(progress);
    
    // Only update if display changed to reduce flicker
    if (display !== this.lastDisplay) {
      this.clearLastDisplay();
      console.log(display);
      this.lastDisplay = display;
    }
  }

  /**
   * Display step completion
   */
  displayStepCompletion(stepName: string, success: boolean, duration: number, message?: string): void {
    const icon = success ? chalk.green('✅') : chalk.red('❌');
    const time = chalk.dim(`${duration}ms`);
    const msg = message ? chalk.dim(` - ${message}`) : '';
    
    console.log(`${icon} ${stepName} ${time}${msg}`);
  }

  /**
   * Display step start
   */
  displayStepStart(stepName: string, description?: string): void {
    console.log(chalk.cyan(`\n🔄 ${stepName}`));
    if (description) {
      console.log(chalk.dim(`   ${description}`));
    }
  }

  /**
   * Display warning
   */
  displayWarning(message: string): void {
    console.log(chalk.yellow(`⚠️  ${message}`));
  }

  /**
   * Display error
   */
  displayError(message: string): void {
    console.log(chalk.red(`❌ ${message}`));
  }

  /**
   * Display success
   */
  displaySuccess(message: string): void {
    console.log(chalk.green(`✅ ${message}`));
  }

  /**
   * Display info message
   */
  displayInfo(message: string): void {
    console.log(chalk.blue(`ℹ️  ${message}`));
  }

  /**
   * Display a separator line
   */
  displaySeparator(title?: string): void {
    const line = '─'.repeat(60);
    
    if (title) {
      const padding = Math.max(0, (60 - title.length - 2) / 2);
      const leftPad = '─'.repeat(Math.floor(padding));
      const rightPad = '─'.repeat(Math.ceil(padding));
      console.log(chalk.dim(`${leftPad} ${title} ${rightPad}`));
    } else {
      console.log(chalk.dim(line));
    }
  }

  /**
   * Format progress bar
   */
  private formatProgress(progress: SetupProgress): string {
    const { currentStep, totalSteps, stepName, elapsed, remaining, percentage, phase } = progress;
    
    // Progress bar
    const barWidth = 30;
    const filled = Math.round((percentage / 100) * barWidth);
    const empty = barWidth - filled;
    const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
    
    // Phase indicator
    const phaseIcon = this.getPhaseIcon(phase);
    
    // Time display
    const timeDisplay = `${this.formatTime(elapsed)}/${this.formatTime(elapsed + remaining)}`;
    
    // Step counter
    const stepCounter = `(${currentStep}/${totalSteps})`;
    
    return `${phaseIcon} ${bar} ${chalk.bold(`${percentage}%`)} ${stepCounter} ${chalk.dim(timeDisplay)}`;
  }

  /**
   * Get icon for current phase
   */
  private getPhaseIcon(phase: string): string {
    switch (phase) {
      case 'starting': return chalk.blue('🚀');
      case 'running': return chalk.cyan('⚡');
      case 'validating': return chalk.yellow('🔍');
      case 'completed': return chalk.green('✨');
      case 'failed': return chalk.red('💥');
      default: return chalk.gray('⚫');
    }
  }

  /**
   * Format time in seconds
   */
  private formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    
    return `${minutes}m${remainingSeconds.toString().padStart(2, '0')}s`;
  }

  /**
   * Clear last display (for updates)
   */
  private clearLastDisplay(): void {
    if (this.lastDisplay) {
      // Move cursor up one line and clear it
      process.stdout.write('\r\x1b[1A\x1b[2K');
    }
  }

  /**
   * Display a fancy header
   */
  displayHeader(title: string, subtitle?: string): void {
    const width = Math.max(title.length + 4, 60);
    const border = '═'.repeat(width);
    
    console.log(chalk.cyan(`╔${border}╗`));
    console.log(chalk.cyan(`║ ${chalk.bold.white(title.padEnd(width - 2))} ║`));
    
    if (subtitle) {
      console.log(chalk.cyan(`║ ${chalk.dim(subtitle.padEnd(width - 2))} ║`));
    }
    
    console.log(chalk.cyan(`╚${border}╝`));
  }

  /**
   * Display a status table
   */
  displayStatusTable(items: Array<{ name: string; status: 'success' | 'warning' | 'error' | 'pending'; message?: string }>): void {
    const maxNameLength = Math.max(...items.map(item => item.name.length));
    
    for (const item of items) {
      const name = item.name.padEnd(maxNameLength);
      const icon = this.getStatusIcon(item.status);
      const message = item.message ? chalk.dim(` - ${item.message}`) : '';
      
      console.log(`${icon} ${name}${message}`);
    }
  }

  /**
   * Get status icon
   */
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'success': return chalk.green('✅');
      case 'warning': return chalk.yellow('⚠️');
      case 'error': return chalk.red('❌');
      case 'pending': return chalk.blue('⏳');
      default: return chalk.gray('⚫');
    }
  }

  /**
   * Display a countdown
   */
  async displayCountdown(seconds: number, message: string): Promise<void> {
    for (let i = seconds; i > 0; i--) {
      process.stdout.write(`\r${message} ${chalk.yellow(i.toString())}s`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    process.stdout.write(`\r${message} ${chalk.green('Now!')}   \n`);
  }

  /**
   * Display a real-time metrics panel
   */
  displayMetrics(metrics: {
    elapsed: string;
    velocity: string;
    efficiency: string;
    errors: number;
    warnings: number;
  }): void {
    console.log(chalk.dim('\n┌─ Setup Metrics ──────────────────┐'));
    console.log(chalk.dim('│') + ` Elapsed: ${chalk.cyan(metrics.elapsed.padEnd(8))}        ` + chalk.dim('│'));
    console.log(chalk.dim('│') + ` Speed: ${chalk.green(metrics.velocity.padEnd(10))}      ` + chalk.dim('│'));
    console.log(chalk.dim('│') + ` Success: ${chalk.blue(metrics.efficiency.padEnd(9))}     ` + chalk.dim('│'));
    console.log(chalk.dim('│') + ` Issues: ${chalk.red(`${metrics.errors} errors`).padEnd(17)} ` + chalk.dim('│'));
    console.log(chalk.dim('│') + `         ${chalk.yellow(`${metrics.warnings} warnings`).padEnd(17)} ` + chalk.dim('│'));
    console.log(chalk.dim('└───────────────────────────────────┘'));
  }

  /**
   * Clear screen and reset
   */
  clear(): void {
    console.clear();
    this.lastDisplay = '';
  }

  /**
   * Display a celebration animation
   */
  async celebrate(): Promise<void> {
    const frames = ['🎉', '✨', '🚀', '⭐', '🎯', '💫'];
    
    for (let i = 0; i < 3; i++) {
      for (const frame of frames) {
        process.stdout.write(`\r${frame} Setup Complete! ${frame}`);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    process.stdout.write('\r🎉 Setup Complete! 🎉\n\n');
  }
}