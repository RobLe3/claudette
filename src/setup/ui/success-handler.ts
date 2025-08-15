// Success celebration and completion handler for setup wizard

import chalk from 'chalk';
import { CompletionSummary, SetupContext } from '../types';

export class SuccessHandler {
  
  /**
   * Main celebration and summary display
   */
  async celebrate(summary: CompletionSummary, context: SetupContext): Promise<void> {
    // Clear screen for clean celebration
    console.clear();
    
    // Celebration animation
    await this.displayCelebration();
    
    // Success header
    this.displaySuccessHeader(summary);
    
    // Configuration summary
    this.displayConfigurationSummary(summary, context);
    
    // Performance metrics
    this.displayPerformanceMetrics(summary, context);
    
    // Next steps
    this.displayNextSteps(summary);
    
    // Support information
    this.displaySupportInfo();
  }

  /**
   * Display celebration animation
   */
  private async displayCelebration(): Promise<void> {
    const frames = [
      '     🎉    ✨    🚀    ',
      '   ✨  🎉  🚀  ✨    ',
      ' 🚀    ✨    🎉    🚀',
      '   ✨  🚀  ✨  🎉    ',
      '     🎉    🚀    ✨  '
    ];
    
    console.log('\n');
    for (let i = 0; i < 3; i++) {
      for (const frame of frames) {
        process.stdout.write(`\r${chalk.magenta(frame)}`);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log('\n');
  }

  /**
   * Display success header
   */
  private displaySuccessHeader(summary: CompletionSummary): void {
    const width = 60;
    const border = '═'.repeat(width);
    
    console.log(chalk.green(`╔${border}╗`));
    console.log(chalk.green(`║${' '.repeat(width)}║`));
    console.log(chalk.green(`║${chalk.bold.white('🎉 CLAUDETTE SETUP COMPLETE! 🎉').padStart((width + 33) / 2).padEnd(width)}║`));
    console.log(chalk.green(`║${' '.repeat(width)}║`));
    console.log(chalk.green(`║${chalk.dim(`Setup completed in ${this.formatTime(summary.totalTime)}`).padStart((width + 25) / 2).padEnd(width)}║`));
    console.log(chalk.green(`║${' '.repeat(width)}║`));
    console.log(chalk.green(`╚${border}╝`));
    
    console.log('\n');
  }

  /**
   * Display configuration summary
   */
  private displayConfigurationSummary(summary: CompletionSummary, context: SetupContext): void {
    console.log(chalk.bold.cyan('📋 Configuration Summary\n'));
    
    // Configured backends
    if (summary.configuredBackends.length > 0) {
      console.log(chalk.green('✅ Configured Backends:'));
      summary.configuredBackends.forEach(backend => {
        const config = context.configuration.credentials[backend];
        const model = config?.model ? chalk.dim(` (${config.model})`) : '';
        console.log(`   • ${chalk.cyan(backend)}${model}`);
      });
      console.log();
    }
    
    // Enabled features
    if (summary.enabledFeatures.length > 0) {
      console.log(chalk.green('✅ Enabled Features:'));
      summary.enabledFeatures.forEach(feature => {
        const description = this.getFeatureDescription(feature);
        console.log(`   • ${chalk.cyan(feature)}${description ? chalk.dim(` - ${description}`) : ''}`);
      });
      console.log();
    }
    
    // RAG configuration
    if (context.configuration.rag.enabled) {
      console.log(chalk.green('✅ RAG System:'));
      console.log(`   • Mode: ${chalk.cyan(context.configuration.rag.deployment)}`);
      if (context.configuration.rag.hybrid) {
        console.log(`   • Type: ${chalk.cyan('Hybrid (Vector + Graph)')}`);
      }
      console.log();
    }
    
    // User preferences applied
    console.log(chalk.blue('⚙️  Applied Settings:'));
    console.log(`   • Experience Level: ${chalk.cyan(context.preferences.experienceLevel)}`);
    console.log(`   • Use Case: ${chalk.cyan(context.preferences.primaryUseCase)}`);
    console.log(`   • Cost Priority: ${chalk.cyan(context.preferences.costPriority)}`);
    console.log(`   • Performance Priority: ${chalk.cyan(context.preferences.performancePriority)}`);
    
    console.log(chalk.dim('\n─'.repeat(60)));
  }

  /**
   * Display performance metrics
   */
  private displayPerformanceMetrics(summary: CompletionSummary, context: SetupContext): void {
    console.log(chalk.bold.magenta('📊 Setup Performance\n'));
    
    // Time breakdown
    const steps = Array.from(context.results.entries()).filter(([_, result]) => result.success);
    const totalStepTime = steps.reduce((total, [_, result]) => total + (result.actualTime || 0), 0) / 1000;
    const userTime = Math.max(0, summary.totalTime - totalStepTime);
    
    console.log(`⏱️  Total Time: ${chalk.green(this.formatTime(summary.totalTime))}`);
    console.log(`🤖 Automation: ${chalk.cyan(this.formatTime(totalStepTime))} (${Math.round((totalStepTime / summary.totalTime) * 100)}%)`);
    console.log(`👤 User Input: ${chalk.yellow(this.formatTime(userTime))} (${Math.round((userTime / summary.totalTime) * 100)}%)`);
    
    // Achievement badges
    const achievements = this.getAchievements(summary, context);
    if (achievements.length > 0) {
      console.log('\n🏆 Achievements:');
      achievements.forEach(achievement => {
        console.log(`   ${achievement.icon} ${chalk.bold(achievement.title)} - ${chalk.dim(achievement.description)}`);
      });
    }
    
    console.log(chalk.dim('\n─'.repeat(60)));
  }

  /**
   * Display next steps
   */
  private displayNextSteps(summary: CompletionSummary): void {
    console.log(chalk.bold.green('🚀 Ready to Go! Next Steps\n'));
    
    summary.nextSteps.forEach((step, index) => {
      console.log(`${chalk.green((index + 1).toString())}. ${step}`);
    });
    
    console.log(chalk.dim('\n💡 Pro Tips:'));
    console.log(chalk.dim('   • Run "claudette status" to check your setup anytime'));
    console.log(chalk.dim('   • Use "claudette --help" to see all available commands'));
    console.log(chalk.dim('   • Check "claudette backends" to see backend performance'));
    
    console.log(chalk.dim('\n─'.repeat(60)));
  }

  /**
   * Display support and documentation info
   */
  private displaySupportInfo(): void {
    console.log(chalk.bold.blue('📚 Support & Resources\n'));
    
    console.log(chalk.blue('Documentation:'));
    console.log(`   • Quick Start: ${chalk.underline('https://claudette.dev/quickstart')}`);
    console.log(`   • API Reference: ${chalk.underline('https://claudette.dev/api')}`);
    console.log(`   • Examples: ${chalk.underline('https://claudette.dev/examples')}`);
    
    console.log(chalk.blue('\nCommunity:'));
    console.log(`   • GitHub Issues: ${chalk.underline('https://github.com/claudette/issues')}`);
    console.log(`   • Discord: ${chalk.underline('https://discord.gg/claudette')}`);
    console.log(`   • Forums: ${chalk.underline('https://forums.claudette.dev')}`);
    
    console.log(chalk.dim('\nHappy coding! 🎉'));
  }

  /**
   * Get feature descriptions
   */
  private getFeatureDescription(feature: string): string | null {
    const descriptions: Record<string, string> = {
      'caching': 'Intelligent response caching for faster responses',
      'compression': 'Request compression to reduce API costs',
      'routing': 'Smart backend routing for optimal performance',
      'monitoring': 'Real-time performance and cost monitoring'
    };
    
    return descriptions[feature] || null;
  }

  /**
   * Get achievement badges based on setup performance
   */
  private getAchievements(summary: CompletionSummary, context: SetupContext): Array<{
    icon: string;
    title: string;
    description: string;
  }> {
    const achievements = [];
    
    // Speed achievements
    if (summary.totalTime < 60) {
      achievements.push({
        icon: '⚡',
        title: 'Speed Demon',
        description: 'Completed setup in under 1 minute!'
      });
    } else if (summary.totalTime < 90) {
      achievements.push({
        icon: '🏃',
        title: 'Quick Setup',
        description: 'Completed setup under target time'
      });
    }
    
    // Configuration achievements
    if (summary.configuredBackends.length >= 3) {
      achievements.push({
        icon: '🌐',
        title: 'Multi-Backend Master',
        description: 'Configured multiple AI backends'
      });
    }
    
    if (context.configuration.rag.enabled) {
      achievements.push({
        icon: '🧠',
        title: 'RAG Pioneer',
        description: 'Set up advanced RAG capabilities'
      });
    }
    
    // Experience achievements
    if (context.preferences.experienceLevel === 'advanced') {
      achievements.push({
        icon: '🎯',
        title: 'Power User',
        description: 'Chose advanced configuration options'
      });
    }
    
    return achievements;
  }

  /**
   * Format time duration
   */
  private formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    
    if (minutes < 60) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
  }

  /**
   * Display first request celebration (called after successful test)
   */
  displayFirstRequestSuccess(responseTime: number, backend: string): void {
    console.log(chalk.green('\n🎉 First Request Successful!\n'));
    console.log(`Backend: ${chalk.cyan(backend)}`);
    console.log(`Response Time: ${chalk.green(responseTime + 'ms')}`);
    console.log(chalk.dim('Everything is working perfectly! 🚀\n'));
  }

  /**
   * Display quick tips based on configuration
   */
  displayQuickTips(context: SetupContext): void {
    console.log(chalk.bold.yellow('💡 Quick Tips for Your Setup\n'));
    
    // Tips based on user preferences
    if (context.preferences.costPriority === 'high') {
      console.log(chalk.yellow('💰 Cost Optimization:'));
      console.log(chalk.yellow('   • Monitor costs with "claudette status"'));
      console.log(chalk.yellow('   • Use caching to reduce API calls'));
    }
    
    if (context.preferences.performancePriority === 'high') {
      console.log(chalk.yellow('⚡ Performance Tips:'));
      console.log(chalk.yellow('   • Check latency with "claudette backends"'));
      console.log(chalk.yellow('   • Use streaming for real-time responses'));
    }
    
    if (context.configuration.rag.enabled) {
      console.log(chalk.yellow('🧠 RAG Usage:'));
      console.log(chalk.yellow('   • Try document queries for enhanced responses'));
      console.log(chalk.yellow('   • Use context injection for better results'));
    }
  }
}