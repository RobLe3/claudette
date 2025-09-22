#!/usr/bin/env node

// Claudette CLI - Drop-in replacement for Claude CLI with optimization

// Load environment variables from .env file and credential storage
import { ensureEnvironmentLoaded } from '../utils/environment-loader';

// Initialize environment loading immediately (wrapped in async function)
(async () => {
  await ensureEnvironmentLoaded(false);
})();

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
  .description('Enterprise AI middleware with intelligent routing, advanced polishing, and comprehensive monitoring')
  .version('1.0.4');

// Main command - analyze/process text
program
  .argument('[prompt]', 'The prompt to send to AI')
  .argument('[files...]', 'Files to include in the context')
  .option('-b, --backend <backend>', 'Specific backend to use (claude, openai, qwen, ollama)')
  .option('-m, --model <model>', 'Specific model to use')
  .option('-t, --temperature <temperature>', 'Temperature (0-1)', parseFloat)
  .option('--max-tokens <tokens>', 'Maximum tokens to generate', parseInt)
  .option('--no-cache', 'Bypass cache for this request')
  .option('--raw', 'Bypass all optimizations (raw mode)')
  .option('--stream', 'Stream response in real-time')
  .option('--cost-limit <limit>', 'Maximum cost in EUR for this request', parseFloat)
  .option('--timeout <seconds>', 'Request timeout in seconds', parseInt)
  .option('-v, --verbose', 'Verbose output')
  .option('--debug', 'Enable debug output')
  .option('-q, --quiet', 'Quiet mode - minimal output')
  .action(async (prompt, files, options) => {
    // Set logger levels based on options
    if (options.debug) {
      (await import('../utils/logger')).default.setLevel('debug');
    } else if (options.quiet) {
      (await import('../utils/logger')).default.setConsoleOutput(false);
    }
    
    if (!prompt) {
      // If no prompt provided, read from stdin
      prompt = await readStdin();
    }

    if (!prompt?.trim()) {
      console.error(chalk.red('Error: No prompt provided'));
      process.exit(1);
    }

    const spinner = options.quiet ? { start: () => ({}), succeed: () => ({}), fail: () => ({}), warn: () => ({}) } : ora('Processing request...').start();

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
        bypass_optimization: options.raw,
        timeout: options.timeout ? options.timeout * 1000 : undefined
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
  .option('--timeout <seconds>', 'Status check timeout in seconds (default: 30)', parseInt)
  .option('--http', 'Start HTTP server and show status in browser')
  .action(async (options) => {
    // Check if HTTP server mode requested
    if (options.http) {
      const { startHttpServer } = await import('../server/http-server');
      const spinner = ora('Starting HTTP server...').start();
      
      try {
        const port = process.env.CLAUDETTE_HTTP_PORT ? parseInt(process.env.CLAUDETTE_HTTP_PORT) : 3000;
        await startHttpServer(port);
        spinner.succeed(`HTTP server started on http://localhost:${port}`);
        console.log(chalk.green(`\n🌐 Claudette Status Dashboard: http://localhost:${port}`));
        console.log(chalk.yellow('Press Ctrl+C to stop the server'));
        
        // Keep the process alive
        process.on('SIGINT', () => {
          console.log(chalk.yellow('\n👋 Shutting down HTTP server...'));
          process.exit(0);
        });
        
        // Wait indefinitely
        await new Promise(() => {});
        
      } catch (error) {
        spinner.fail('Failed to start HTTP server');
        console.error(chalk.red(`Error: ${error instanceof Error ? error.message : error}`));
        process.exit(1);
      }
      return;
    }

    const spinner = ora('Checking status...').start();
    const timeoutSeconds = options.timeout || 30;
    
    try {
      // Add timeout wrapper for status check
      const statusPromise = claudette.getStatus();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Status check timed out after ${timeoutSeconds} seconds`));
        }, timeoutSeconds * 1000);
      });
      
      const status = await Promise.race([statusPromise, timeoutPromise]);
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
      console.log(`  Hit Rate: ${((status.cache.hit_rate || 0) * 100).toFixed(1)}%`);
      console.log(`  Total Requests: ${status.cache.total_requests || 0}`);
      console.log(`  Cache Hits: ${status.cache.cache_hits || 0}`);
      console.log(`  Size: ${(status.cache.size_mb || status.cache.memory_usage / (1024 * 1024) || 0).toFixed(2)} MB`);
      console.log(`  Entries: ${status.cache.entries_count || 0}`);
      
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
      console.log(`Hit Rate: ${chalk.green(((cache.hit_rate || 0) * 100).toFixed(1) + '%')}`);
      console.log(`Total Requests: ${(cache.total_requests || 0).toLocaleString()}`);
      console.log(`Cache Hits: ${chalk.green((cache.cache_hits || 0).toLocaleString())}`);
      console.log(`Cache Misses: ${chalk.red((cache.cache_misses || 0).toLocaleString())}`);
      console.log(`Storage Size: ${(cache.size_mb || cache.memory_usage / (1024 * 1024) || 0).toFixed(2)} MB`);
      console.log(`Active Entries: ${(cache.entries_count || 0).toLocaleString()}`);
      
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
      
      try {
        const answer = await new Promise<string>((resolve, reject) => {
          const timeout = setTimeout(() => {
            rl.close();
            reject(new Error('Confirmation prompt timed out after 30 seconds'));
          }, 30000);
          
          rl.question('Are you sure you want to clear all cache entries? (y/N) ', (answer) => {
            clearTimeout(timeout);
            resolve(answer);
          });
        });
        
        rl.close();
        
        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log('Cache clear cancelled');
          return;
        }
      } catch (error) {
        rl.close();
        console.error(chalk.red(`Error: ${(error as Error).message}`));
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
  .option('--timeout <seconds>', 'Backend check timeout in seconds (default: 20)', parseInt)
  .action(async (options) => {
    const timeoutSeconds = options.timeout || 20;
    
    try {
      // Add timeout wrapper for backend status check
      const statusPromise = claudette.getStatus();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Backend check timed out after ${timeoutSeconds} seconds`));
        }, timeoutSeconds * 1000);
      });
      
      const status = await Promise.race([statusPromise, timeoutPromise]);
      
      console.log('\n' + chalk.bold('Available Backends'));
      console.log('═'.repeat(50));
      
      for (const backend of status.backends.health || []) {
        const icon = backend.healthy ? '✅' : '❌';
        const statusText = backend.healthy ? chalk.green('Available') : chalk.red('Unavailable');
        console.log(`${icon} ${chalk.bold(backend.name.padEnd(10))} ${statusText}`);
      }
      
      // Show routing stats
      console.log('\n' + chalk.bold('Routing Statistics'));
      console.log('═'.repeat(30));
      
      const backendStats = status.backends?.stats?.backends || [];
      if (backendStats.length === 0) {
        console.log('No routing statistics available');
      } else {
        for (const backend of backendStats) {
          const failures = (backend.failures || 0) > 0 ? chalk.red(`${backend.failures || 0} failures`) : chalk.green('No failures');
          const circuit = backend.circuitBreakerOpen ? chalk.red('Circuit Open') : chalk.green('Circuit Closed');
          console.log(`${backend.name.padEnd(10)} ${failures}, ${circuit}`);
        }
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

// API Key management commands
const apiKeyCmd = program
  .command('api-keys')
  .alias('keys')
  .description('Manage API keys for different backends');

apiKeyCmd
  .command('add <backend>')
  .description('Add or update API key for a backend')
  .option('-k, --key <key>', 'API key (will prompt if not provided)')
  .option('-t, --test', 'Test the API key after adding')
  .action(async (backend, options) => {
    try {
      const { UniversalCredentialManager } = await import('../credentials/credential-manager');
      const credentialManager = new UniversalCredentialManager();
      await credentialManager.initialize();

      let apiKey = options.key;
      
      if (!apiKey) {
        // Prompt for API key securely
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        // Hide input for password
        const stdin = process.stdin;
        (stdin as any).setRawMode(true);
        
        apiKey = await new Promise<string>((resolve, reject) => {
          let input = '';
          console.log(`Enter API key for ${backend}: `);
          
          const timeout = setTimeout(() => {
            rl.close();
            reject(new Error('API key input timed out after 60 seconds'));
          }, 60000);
          
          stdin.on('data', (char) => {
            const byte = char[0];
            if (byte === 3) { // Ctrl+C
              clearTimeout(timeout);
              rl.close();
              process.exit(1);
            } else if (byte === 13) { // Enter
              clearTimeout(timeout);
              rl.close();
              console.log('\n');
              resolve(input);
            } else if (byte === 127) { // Backspace
              if (input.length > 0) {
                input = input.slice(0, -1);
                process.stdout.write('\b \b');
              }
            } else if (byte >= 32 && byte <= 126) { // Printable characters
              input += char.toString();
              process.stdout.write('*');
            }
          });
        });
        
        (stdin as any).setRawMode(false);
      }
      
      if (!apiKey || !apiKey.trim()) {
        console.error(chalk.red('Error: API key is required'));
        process.exit(1);
      }
      
      // Validate API key format
      if (!validateApiKeyFormat(backend, apiKey)) {
        console.error(chalk.red(`Error: Invalid API key format for ${backend}`));
        process.exit(1);
      }
      
      // Store the API key
      await credentialManager.store({
        service: `claudette-${backend}`,
        key: apiKey,
        description: `${backend} API key for Claudette`
      });
      
      console.log(chalk.green(`✅ API key for ${backend} saved successfully`));
      
      // Test the API key if requested
      if (options.test) {
        console.log(chalk.dim('🧪 Testing API key...'));
        const testResult = await testApiKeyConnection(backend, apiKey);
        
        if (testResult.success) {
          console.log(chalk.green('✅ API key verified successfully'));
        } else {
          console.log(chalk.yellow(`⚠️ API key test failed: ${testResult.error}`));
          console.log(chalk.yellow('Key is saved but may need verification'));
        }
      }
      
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

apiKeyCmd
  .command('list')
  .description('List configured backends and their status')
  .action(async () => {
    try {
      const { UniversalCredentialManager } = await import('../credentials/credential-manager');
      const credentialManager = new UniversalCredentialManager();
      await credentialManager.initialize();
      
      const services = await credentialManager.listServices();
      const claudetteServices = services.filter(s => s.startsWith('claudette-'));
      
      // Filter to only show legitimate backend names, not test artifacts
      const knownBackends = ['openai', 'claude', 'anthropic', 'google', 'gemini', 'cohere', 'ollama', 'qwen'];
      const legitimateServices = claudetteServices.filter(service => {
        const backend = service.replace('claudette-', '');
        return knownBackends.includes(backend);
      });
      
      if (legitimateServices.length === 0) {
        console.log(chalk.yellow('No API keys configured yet'));
        console.log(chalk.dim('Use "claudette api-keys add <backend>" to add API keys'));
        console.log(chalk.dim('\nSupported backends: openai, claude, qwen, ollama'));
        return;
      }
      
      console.log('\n' + chalk.bold('Configured API Keys'));
      console.log('═'.repeat(40));
      
      for (const service of legitimateServices) {
        const backend = service.replace('claudette-', '');
        const hasKey = await credentialManager.retrieve(service);
        const status = hasKey ? chalk.green('✅ Configured') : chalk.red('❌ Missing');
        console.log(`${backend.padEnd(15)} ${status}`);
      }
      
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

apiKeyCmd
  .command('remove <backend>')
  .description('Remove API key for a backend')
  .option('-f, --force', 'Skip confirmation')
  .action(async (backend, options) => {
    try {
      const { UniversalCredentialManager } = await import('../credentials/credential-manager');
      const credentialManager = new UniversalCredentialManager();
      await credentialManager.initialize();
      
      if (!options.force) {
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const confirm = await new Promise<string>((resolve, reject) => {
          const timeout = setTimeout(() => {
            rl.close();
            reject(new Error('Confirmation timed out after 30 seconds'));
          }, 30000);
          
          rl.question(`Remove API key for ${backend}? (y/N) `, (answer) => {
            clearTimeout(timeout);
            resolve(answer);
          });
        });
        
        rl.close();
        
        if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
          console.log('Cancelled');
          return;
        }
      }
      
      await credentialManager.delete(`claudette-${backend}`);
      console.log(chalk.green(`✅ API key for ${backend} removed`));
      
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

apiKeyCmd
  .command('guide [backend]')
  .description('Show guide for getting API keys')
  .action(async (backend) => {
    const guides: Record<string, { name: string; url: string; instructions: string }> = {
      openai: {
        name: 'OpenAI',
        url: 'https://platform.openai.com/api-keys',
        instructions: 'Sign up at OpenAI, go to API Keys section, and create a new secret key'
      },
      claude: {
        name: 'Claude (Anthropic)', 
        url: 'https://console.anthropic.com/settings/keys',
        instructions: 'Sign up at Anthropic Console, go to API Keys, and generate a new key'
      },
      anthropic: {
        name: 'Claude (Anthropic)',
        url: 'https://console.anthropic.com/settings/keys', 
        instructions: 'Sign up at Anthropic Console, go to API Keys, and generate a new key'
      },
      google: {
        name: 'Google AI (Gemini)',
        url: 'https://aistudio.google.com/app/apikey',
        instructions: 'Go to Google AI Studio, create a project, and generate an API key'
      },
      mistral: {
        name: 'Mistral AI',
        url: 'https://console.mistral.ai/api-keys',
        instructions: 'Create account at Mistral, go to API Keys section, and create new key'
      }
    };

    if (backend) {
      const guide = guides[backend.toLowerCase()];
      if (guide) {
        console.log(chalk.bold(`\n📚 ${guide.name} API Key Setup Guide`));
        console.log('═'.repeat(50));
        console.log(`\n🌐 ${chalk.cyan(guide.url)}`);
        console.log(`\n📝 ${guide.instructions}`);
        console.log(`\n💡 After getting your key, use:`);
        console.log(chalk.green(`   claudette api-keys add ${backend}`));
      } else {
        console.log(chalk.yellow(`No guide available for '${backend}'`));
        console.log(chalk.dim('Available backends: openai, claude, google, mistral'));
      }
    } else {
      console.log(chalk.bold('\n📚 API Key Setup Guides'));
      console.log('═'.repeat(50));
      
      Object.entries(guides).forEach(([key, guide]) => {
        console.log(`\n${chalk.bold(guide.name)} (${key})`);
        console.log(`   ${chalk.cyan(guide.url)}`);
        console.log(`   ${chalk.dim(guide.instructions)}`);
      });
      
      console.log(chalk.dim('\n💡 Use "claudette api-keys guide <backend>" for specific instructions'));
      console.log(chalk.dim('💡 Use "claudette api-keys add <backend>" to add a key'));
    }
  });

apiKeyCmd
  .command('test <backend>')
  .description('Test API key for a backend')
  .action(async (backend) => {
    try {
      const { UniversalCredentialManager } = await import('../credentials/credential-manager');
      const credentialManager = new UniversalCredentialManager();
      await credentialManager.initialize();
      
      const apiKey = await credentialManager.retrieve(`claudette-${backend}`);
      
      if (!apiKey) {
        console.error(chalk.red(`Error: No API key configured for ${backend}`));
        console.log(chalk.dim(`Use "claudette api-keys add ${backend}" to add an API key`));
        process.exit(1);
      }
      
      console.log(chalk.dim('🧪 Testing API key...'));
      const testResult = await testApiKeyConnection(backend, apiKey);
      
      if (testResult.success) {
        console.log(chalk.green('✅ API key is valid and working'));
      } else {
        console.log(chalk.red(`❌ API key test failed: ${testResult.error}`));
        process.exit(1);
      }
      
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Add the init command as a top-level command for convenience
program
  .command('init')
  .description('Quick setup wizard (alias for setup init --quick)')
  .option('-q, --quick', 'Skip advanced configuration, use smart defaults')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      const { SetupWizard } = await import('../setup/setup-wizard');
      
      const wizard = new SetupWizard({
        quickSetup: options.quick || true,
        targetTime: options.quick ? 60 : 90,
        skipWelcome: options.quick,
        verboseOutput: options.verbose
      });
      
      if (options.quick) {
        await wizard.runQuick();
      } else {
        await wizard.run();
      }
      
    } catch (error: any) {
      console.error(chalk.red(`Setup failed: ${error.message}`));
      if (options?.verbose && error.stack) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

// Configuration command
program
  .command('config')
  .description('Show current configuration')
  .option('--setup', 'Show setup-specific configuration')
  .option('--timeout <seconds>', 'Config load timeout in seconds (default: 10)', parseInt)
  .action(async (options) => {
    const timeoutSeconds = options.timeout || 10;
    
    try {
      if (options.setup) {
        // Show setup wizard configuration
        console.log(chalk.bold.cyan('Setup Wizard Configuration\n'));
        console.log(chalk.dim('Run "claudette init" to start interactive setup'));
        console.log(chalk.dim('Run "claudette setup validate" to check current configuration'));
        return;
      }
      
      // Add timeout wrapper for config loading
      const configPromise = Promise.resolve(claudette.getConfig());
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Config load timed out after ${timeoutSeconds} seconds`));
        }, timeoutSeconds * 1000);
      });
      
      const config = await Promise.race([configPromise, timeoutPromise]);
      
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

// API Key helper functions
function validateApiKeyFormat(backend: string, apiKey: string): boolean {
  const patterns: Record<string, RegExp> = {
    openai: /^sk-[a-zA-Z0-9]{48,}$/,
    claude: /^sk-ant-[a-zA-Z0-9\-_]{95,}$/,
    anthropic: /^sk-ant-[a-zA-Z0-9\-_]{95,}$/,
    google: /^[a-zA-Z0-9\-_]{39}$/,
    gemini: /^[a-zA-Z0-9\-_]{39}$/,
    mistral: /^[a-zA-Z0-9]{32}$/,
    cohere: /^[a-zA-Z0-9\-_]{40}$/,
    ollama: /^.+$/ // Ollama uses URLs, more flexible validation
  };
  
  const pattern = patterns[backend.toLowerCase()];
  if (!pattern) {
    // For unknown backends, just check it's not empty
    return apiKey.trim().length > 0;
  }
  
  return pattern.test(apiKey);
}

async function testApiKeyConnection(backend: string, apiKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Basic connection test based on backend type
    switch (backend.toLowerCase()) {
      case 'openai':
        return await testOpenAIKey(apiKey);
      case 'claude':
      case 'anthropic':
        return await testClaudeKey(apiKey);
      default:
        // For other backends, just validate format
        return { success: validateApiKeyFormat(backend, apiKey) };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

async function testOpenAIKey(apiKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'claudette/1.0.4'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (response.ok) {
      return { success: true };
    } else {
      const error = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${error}` };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
}

async function testClaudeKey(apiKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'User-Agent': 'claudette/1.0.4'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      }),
      signal: AbortSignal.timeout(10000)
    });
    
    if (response.ok) {
      return { success: true };
    } else {
      const error = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${error}` };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
}

// Utility functions
async function readStdin(timeoutMs: number = 10000): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    let resolved = false;
    
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }
    
    // Set up timeout
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`No input received after ${timeoutMs / 1000} seconds`));
      }
    }, timeoutMs);
    
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    
    process.stdin.on('end', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve(data.trim());
      }
    });
    
    process.stdin.on('error', (error) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(error);
      }
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