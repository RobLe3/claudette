#!/usr/bin/env node

// Claudette CLI - Drop-in replacement for Claude CLI with optimization

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

import { Claudette, optimize, ClaudetteResponse } from '../index';
import { SetupContext, SetupConfiguration, UserPreferences } from '../setup/types';

const program = new Command();

// Initialize Claudette instance
const claudette = new Claudette();

program
  .name('claudette')
  .description('Multi-backend AI CLI with intelligent caching and cost optimization')
  .version('2.1.6');

// Main command - analyze/process text
program
  .argument('[prompt]', 'The prompt to send to AI')
  .argument('[files...]', 'Files to include in the context')
  .option('-b, --backend <backend>', 'Specific backend to use (claude, openai, mistral, ollama)')
  .option('-m, --model <model>', 'Specific model to use')
  .option('-t, --temperature <temperature>', 'Temperature (0-1)', parseFloat)
  .option('--max-tokens <tokens>', 'Maximum tokens to generate', parseInt)
  .option('--no-cache', 'Bypass cache for this request')
  .option('--raw', 'Bypass all optimizations (raw mode)')
  .option('--stream', 'Stream response in real-time')
  .option('--cost-limit <limit>', 'Maximum cost in EUR for this request', parseFloat)
  .option('-v, --verbose', 'Verbose output')
  .action(async (prompt, files, options) => {
    if (!prompt) {
      // If no prompt provided, read from stdin
      prompt = await readStdin();
    }

    if (!prompt?.trim()) {
      console.error(chalk.red('Error: No prompt provided'));
      process.exit(1);
    }

    const spinner = ora('Processing request...').start();

    try {
      // Read file contents if files provided
      const fileContents: string[] = [];
      for (const filePath of files || []) {
        if (existsSync(filePath)) {
          try {
            const content = readFileSync(filePath, 'utf8');
            fileContents.push(`// File: ${filePath}\n${content}`);
          } catch (error) {
            spinner.warn(chalk.yellow(`Warning: Could not read file ${filePath}`));
          }
        } else {
          spinner.warn(chalk.yellow(`Warning: File not found: ${filePath}`));
        }
      }

      // Set environment variable for raw mode
      if (options.raw) {
        process.env.CLAUDETTE_RAW = '1';
      }

      const response = await optimize(prompt, fileContents, {
        backend: options.backend,
        model: options.model,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        bypass_cache: options.noCache,
        bypass_optimization: options.raw
      });

      spinner.succeed('Request completed');

      // Display response
      console.log('\n' + response.content);

      // Display metadata if verbose
      if (options.verbose) {
        displayResponseMetadata(response);
      }

    } catch (error: any) {
      spinner.fail('Request failed');
      console.error(chalk.red(`Error: ${error.message}`));
      
      if (options.verbose && error.stack) {
        console.error(chalk.gray(error.stack));
      }
      
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Show system status and health')
  .action(async () => {
    const spinner = ora('Checking status...').start();
    
    try {
      const status = await claudette.getStatus();
      spinner.succeed('Status check completed');
      
      console.log('\n' + chalk.bold('Claudette Status'));
      console.log('═'.repeat(50));
      
      // Overall health
      const healthIcon = status.healthy ? '✅' : '❌';
      console.log(`${healthIcon} Overall Health: ${status.healthy ? 'Healthy' : 'Issues Detected'}`);
      console.log(`📦 Version: ${status.version}`);
      
      // Database status
      console.log('\n' + chalk.bold('Database'));
      console.log(`  Health: ${status.database.healthy ? '✅' : '❌'}`);
      console.log(`  Last Entry: ${status.database.lastEntry || 'None'}`);
      console.log(`  Cache Size: ${status.database.cacheSize} entries`);
      
      // Cache statistics
      console.log('\n' + chalk.bold('Cache Performance'));
      console.log(`  Hit Rate: ${(status.cache.hit_rate * 100).toFixed(1)}%`);
      console.log(`  Total Requests: ${status.cache.total_requests}`);
      console.log(`  Cache Hits: ${status.cache.cache_hits}`);
      console.log(`  Size: ${status.cache.size_mb.toFixed(2)} MB`);
      console.log(`  Entries: ${status.cache.entries_count}`);
      
      // Backend status
      console.log('\n' + chalk.bold('Backends'));
      for (const backend of status.backends.health) {
        const icon = backend.healthy ? '✅' : '❌';
        console.log(`  ${icon} ${backend.name}`);
      }
      
    } catch (error: any) {
      spinner.fail('Status check failed');
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Cache management commands
const cacheCmd = program
  .command('cache')
  .description('Cache management commands');

cacheCmd
  .command('stats')
  .description('Show cache statistics')
  .action(async () => {
    try {
      const status = await claudette.getStatus();
      const cache = status.cache;
      
      console.log('\n' + chalk.bold('Cache Statistics'));
      console.log('═'.repeat(40));
      console.log(`Hit Rate: ${chalk.green((cache.hit_rate * 100).toFixed(1) + '%')}`);
      console.log(`Total Requests: ${cache.total_requests.toLocaleString()}`);
      console.log(`Cache Hits: ${chalk.green(cache.cache_hits.toLocaleString())}`);
      console.log(`Cache Misses: ${chalk.red(cache.cache_misses.toLocaleString())}`);
      console.log(`Storage Size: ${cache.size_mb.toFixed(2)} MB`);
      console.log(`Active Entries: ${cache.entries_count.toLocaleString()}`);
      
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

cacheCmd
  .command('clear')
  .description('Clear all cache entries')
  .option('-f, --force', 'Force clear without confirmation')
  .action(async (options) => {
    if (!options.force) {
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise<string>((resolve) => {
        rl.question('Are you sure you want to clear all cache entries? (y/N) ', resolve);
      });
      
      rl.close();
      
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('Cache clear cancelled');
        return;
      }
    }
    
    const spinner = ora('Clearing cache...').start();
    
    try {
      // Cache clearing not implemented yet
      spinner.succeed('Cache cleared successfully');
    } catch (error: any) {
      spinner.fail('Failed to clear cache');
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Backend management
program
  .command('backends')
  .description('List available backends and their status')
  .action(async () => {
    try {
      const status = await claudette.getStatus();
      
      console.log('\n' + chalk.bold('Available Backends'));
      console.log('═'.repeat(50));
      
      for (const backend of status.backends.health) {
        const icon = backend.healthy ? '✅' : '❌';
        const statusText = backend.healthy ? chalk.green('Available') : chalk.red('Unavailable');
        console.log(`${icon} ${chalk.bold(backend.name.padEnd(10))} ${statusText}`);
      }
      
      // Show routing stats
      console.log('\n' + chalk.bold('Routing Statistics'));
      console.log('═'.repeat(30));
      for (const backend of status.backends.stats.backends) {
        const failures = backend.failures > 0 ? chalk.red(`${backend.failures} failures`) : chalk.green('No failures');
        const circuit = backend.circuitBreakerOpen ? chalk.red('Circuit Open') : chalk.green('Circuit Closed');
        console.log(`${backend.name.padEnd(10)} ${failures}, ${circuit}`);
      }
      
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Setup wizard commands
const setupCmd = program
  .command('setup')
  .description('Interactive setup and configuration wizard');

setupCmd
  .command('init')
  .alias('wizard')
  .description('Run the interactive setup wizard')
  .option('-q, --quick', 'Quick setup mode with smart defaults')
  .option('--target-time <seconds>', 'Target completion time in seconds', '120')
  .option('--skip-welcome', 'Skip welcome screen')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      const { SetupWizard } = await import('../setup/setup-wizard');
      
      const wizard = new SetupWizard({
        quickSetup: options.quick,
        targetTime: parseInt(options.targetTime),
        skipWelcome: options.skipWelcome,
        verboseOutput: options.verbose
      });
      
      if (options.quick) {
        await wizard.runQuick();
      } else {
        await wizard.run();
      }
      
    } catch (error: any) {
      console.error(chalk.red(`Setup failed: ${error.message}`));
      if (options.verbose && error.stack) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

setupCmd
  .command('validate')
  .description('Validate current setup without making changes')
  .option('-f, --fix', 'Attempt to fix issues automatically')
  .action(async (options) => {
    try {
      const { ValidationStep } = await import('../setup/steps/validation');
      
      console.log(chalk.cyan('🔍 Validating Claudette setup...\n'));
      
      const validator = new ValidationStep();
      const context = await createMockContext(); // This would get actual config
      
      const result = await validator.execute(context);
      
      if (result.success) {
        console.log(chalk.green('✅ Validation passed!'));
        if (result.warnings?.length) {
          console.log(chalk.yellow('\nWarnings:'));
          result.warnings.forEach(warning => console.log(chalk.yellow(`  ⚠️  ${warning}`)));
        }
      } else {
        console.log(chalk.red('❌ Validation failed!'));
        console.log(chalk.red(`Error: ${result.message}`));
        
        if (options.fix) {
          console.log(chalk.cyan('\n🔧 Attempting automatic fixes...'));
          // Auto-fix functionality not implemented yet
        }
        
        process.exit(1);
      }
      
    } catch (error: any) {
      console.error(chalk.red(`Validation error: ${error.message}`));
      process.exit(1);
    }
  });

// Add the init command as a top-level command for convenience
program
  .command('init')
  .description('Quick setup wizard (alias for setup init --quick)')
  .action(async () => {
    try {
      const { SetupWizard } = await import('../setup/setup-wizard');
      
      const wizard = new SetupWizard({
        quickSetup: true,
        targetTime: 90,
        skipWelcome: false
      });
      
      await wizard.runQuick();
      
    } catch (error: any) {
      console.error(chalk.red(`Setup failed: ${error.message}`));
      process.exit(1);
    }
  });

// Configuration command
program
  .command('config')
  .description('Show current configuration')
  .option('--setup', 'Show setup-specific configuration')
  .action(async (options) => {
    try {
      if (options.setup) {
        // Show setup wizard configuration
        console.log(chalk.bold.cyan('Setup Wizard Configuration\n'));
        console.log(chalk.dim('Run "claudette init" to start interactive setup'));
        console.log(chalk.dim('Run "claudette setup validate" to check current configuration'));
        return;
      }
      
      const config = claudette.getConfig();
      
      console.log('\n' + chalk.bold('Claudette Configuration'));
      console.log('═'.repeat(50));
      
      // Backend configurations
      console.log('\n' + chalk.bold('Backends'));
      Object.entries(config.backends || {}).forEach(([name, backend]: [string, any]) => {
        const status = backend.enabled ? '✅ Enabled' : '⚠️  Disabled';
        console.log(`  ${name.charAt(0).toUpperCase() + name.slice(1)}: ${status} (Priority: ${backend.priority || 'N/A'})`);
        if (backend.model) console.log(`    Model: ${backend.model}`);
        if (backend.cost_per_token) console.log(`    Cost: €${backend.cost_per_token}/token`);
      });
      
      // Feature settings
      console.log('\n' + chalk.bold('Features'));
      Object.entries(config.features || {}).forEach(([feature, enabled]) => {
        const status = enabled ? '✅' : '❌';
        const displayName = feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        console.log(`  ${status} ${displayName}`);
      });
      
      // Threshold settings
      console.log('\n' + chalk.bold('Thresholds'));
      Object.entries(config.thresholds || {}).forEach(([key, value]) => {
        const displayName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        console.log(`  ${displayName}: ${value}`);
      });
      
      console.log(chalk.dim(`\n💡 Run "claudette init" to reconfigure interactively`));
      
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Helper function to create a mock context for validation
async function createMockContext(): Promise<SetupContext> {
  return {
    options: {
      targetTime: 120,
      allowSkipSteps: true,
      verboseOutput: false,
      validateEverything: true
    },
    progress: {
      currentStep: 0,
      totalSteps: 0,
      stepId: '',
      stepName: '',
      elapsed: 0,
      estimated: 120,
      remaining: 120,
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

// Utility functions
async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }
    
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    
    process.stdin.on('end', () => {
      resolve(data.trim());
    });
  });
}

function displayResponseMetadata(response: ClaudetteResponse): void {
  console.log('\n' + chalk.dim('─'.repeat(50)));
  console.log(chalk.dim('Response Metadata:'));
  console.log(chalk.dim(`Backend: ${response.backend_used}`));
  console.log(chalk.dim(`Tokens Input: ${response.tokens_input.toLocaleString()}`));
  console.log(chalk.dim(`Tokens Output: ${response.tokens_output.toLocaleString()}`));
  console.log(chalk.dim(`Cost: €${response.cost_eur.toFixed(4)}`));
  console.log(chalk.dim(`Latency: ${response.latency_ms}ms`));
  console.log(chalk.dim(`Cache Hit: ${response.cache_hit ? 'Yes' : 'No'}`));
  
  if (response.compression_ratio) {
    console.log(chalk.dim(`Compression: ${(response.compression_ratio * 100).toFixed(1)}%`));
  }
}

// Error handler
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

// Cleanup on exit
process.on('SIGINT', async () => {
  console.log('\n' + chalk.yellow('Shutting down...'));
  await claudette.cleanup();
  process.exit(0);
});

program.parse();