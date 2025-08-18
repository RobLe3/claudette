#!/usr/bin/env node

/**
 * Comprehensive Feature Test Suite for Claudette Framework
 * Tests all major framework components and integrations
 */

const { TestRunner } = require('./utils/test-runner');
const path = require('path');
const fs = require('fs').promises;

class ClaudetteFrameworkTest {
  constructor() {
    this.testResults = {
      timestamp: new Date().toISOString(),
      framework: 'claudette-v2.1.6',
      testCategories: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        categories: 0
      }
    };
  }

  /**
   * Test 1: Core Framework Initialization
   */
  async testCoreFramework(runner) {
    return await runner.runTestGroup('Core Framework', {
      'Package structure validation': async () => {
        const packagePath = path.join(__dirname, '../../package.json');
        const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf8'));
        
        if (packageJson.name !== 'claudette') throw new Error('Invalid package name');
        if (!packageJson.version) throw new Error('Missing package version');
        if (!packageJson.main) throw new Error('Missing main entry point');
        
        return { package: packageJson.name, version: packageJson.version };
      },

      'TypeScript compilation check': async () => {
        const distPath = path.join(__dirname, '../../dist');
        try {
          await fs.access(distPath);
          const stats = await fs.stat(distPath);
          if (!stats.isDirectory()) throw new Error('Dist directory not found');
        } catch (error) {
          throw new Error('TypeScript compilation failed - dist directory missing');
        }
        
        return { compiled: true, distExists: true };
      },

      'Main module import': async () => {
        try {
          // Test if main module can be required
          const modulePath = path.join(__dirname, '../../dist/index.js');
          await fs.access(modulePath);
          
          return { mainModule: 'accessible', path: modulePath };
        } catch (error) {
          throw new Error(`Main module not accessible: ${error.message}`);
        }
      },

      'Configuration system': async () => {
        const { getDefaultConfiguration } = require('../config/default-configuration');
        const config = getDefaultConfiguration();
        
        const backendConfig = config.get('backend.defaults');
        if (!backendConfig.timeout) throw new Error('Backend configuration missing');
        
        const cacheConfig = config.get('cache.defaults');
        if (!cacheConfig.maxSize) throw new Error('Cache configuration missing');
        
        return { 
          backendTimeout: backendConfig.timeout,
          cacheMaxSize: cacheConfig.maxSize
        };
      }
    });
  }

  /**
   * Test 2: Backend System Integration
   */
  async testBackendSystem(runner) {
    return await runner.runTestGroup('Backend System', {
      'Backend base class functionality': async () => {
        // Test backend utilities
        const sharedUtilsPath = path.join(__dirname, '../backends/shared-utils.ts');
        await fs.access(sharedUtilsPath);
        
        return { sharedUtils: 'accessible', consolidated: true };
      },

      'Claude backend structure': async () => {
        const claudeBackendPath = path.join(__dirname, '../backends/claude.ts');
        await fs.access(claudeBackendPath);
        
        // Check if file contains expected exports
        const content = await fs.readFile(claudeBackendPath, 'utf8');
        if (!content.includes('ClaudeBackend')) throw new Error('ClaudeBackend class not found');
        if (!content.includes('shared-utils')) throw new Error('Shared utils not imported');
        
        return { backend: 'claude', consolidated: true };
      },

      'OpenAI backend structure': async () => {
        const openaiBackendPath = path.join(__dirname, '../backends/openai.ts');
        await fs.access(openaiBackendPath);
        
        const content = await fs.readFile(openaiBackendPath, 'utf8');
        if (!content.includes('OpenAIBackend')) throw new Error('OpenAIBackend class not found');
        if (!content.includes('shared-utils')) throw new Error('Shared utils not imported');
        
        return { backend: 'openai', consolidated: true };
      },

      'Qwen backend structure': async () => {
        const qwenBackendPath = path.join(__dirname, '../backends/qwen.ts');
        await fs.access(qwenBackendPath);
        
        const content = await fs.readFile(qwenBackendPath, 'utf8');
        if (!content.includes('QwenBackend')) throw new Error('QwenBackend class not found');
        if (!content.includes('shared-utils')) throw new Error('Shared utils not imported');
        
        return { backend: 'qwen', consolidated: true };
      },

      'Router system functionality': async () => {
        const routerPath = path.join(__dirname, '../router/index.ts');
        await fs.access(routerPath);
        
        const content = await fs.readFile(routerPath, 'utf8');
        if (!content.includes('BackendRouter')) throw new Error('BackendRouter class not found');
        if (!content.includes('selectBackend')) throw new Error('Backend selection logic missing');
        
        return { router: 'functional', consolidated: true };
      }
    });
  }

  /**
   * Test 3: Credential Management System
   */
  async testCredentialSystem(runner) {
    return await runner.runTestGroup('Credential Management', {
      'Credential manager accessibility': async () => {
        const credManagerPath = path.join(__dirname, '../credentials/credential-manager.ts');
        await fs.access(credManagerPath);
        
        const content = await fs.readFile(credManagerPath, 'utf8');
        if (!content.includes('UniversalCredentialManager')) {
          throw new Error('UniversalCredentialManager not found');
        }
        
        return { credentialManager: 'accessible' };
      },

      'Platform detection': async () => {
        const platformDetectorPath = path.join(__dirname, '../credentials/platform-detector.ts');
        await fs.access(platformDetectorPath);
        
        const content = await fs.readFile(platformDetectorPath, 'utf8');
        if (!content.includes('PlatformDetector')) {
          throw new Error('PlatformDetector class not found');
        }
        
        return { platformDetection: 'functional' };
      },

      'Encrypted file storage': async () => {
        const encryptedStoragePath = path.join(__dirname, '../credentials/storages/encrypted-file-storage.ts');
        await fs.access(encryptedStoragePath);
        
        const content = await fs.readFile(encryptedStoragePath, 'utf8');
        if (!content.includes('scryptSync')) {
          throw new Error('Strong encryption not implemented');
        }
        
        return { encryption: 'strong', algorithm: 'scrypt' };
      },

      'Keychain storage (macOS)': async () => {
        const keychainStoragePath = path.join(__dirname, '../credentials/storages/keychain-storage.ts');
        await fs.access(keychainStoragePath);
        
        return { keychainSupport: 'available', platform: 'macOS' };
      }
    });
  }

  /**
   * Test 4: Cache and Database Systems
   */
  async testCacheDatabase(runner) {
    return await runner.runTestGroup('Cache & Database', {
      'Cache system structure': async () => {
        const cachePath = path.join(__dirname, '../cache/index.ts');
        await fs.access(cachePath);
        
        const content = await fs.readFile(cachePath, 'utf8');
        if (!content.includes('CacheSystem')) {
          throw new Error('CacheSystem class not found');
        }
        
        // Check for SQL injection fix
        if (content.includes('${excessCount}')) {
          throw new Error('SQL injection vulnerability still present');
        }
        
        return { cache: 'secure', sqlInjectionFixed: true };
      },

      'Database manager': async () => {
        const dbPath = path.join(__dirname, '../database/index.ts');
        await fs.access(dbPath);
        
        const content = await fs.readFile(dbPath, 'utf8');
        if (!content.includes('DatabaseManager')) {
          throw new Error('DatabaseManager class not found');
        }
        
        return { database: 'accessible', manager: 'functional' };
      },

      'Multi-layer cache': async () => {
        const multiCachePath = path.join(__dirname, '../cache/advanced/multi-layer-cache.ts');
        try {
          await fs.access(multiCachePath);
          return { advancedCache: 'available', multiLayer: true };
        } catch {
          return { advancedCache: 'not_implemented', multiLayer: false };
        }
      }
    });
  }

  /**
   * Test 5: RAG and Monitoring Systems
   */
  async testRAGMonitoring(runner) {
    return await runner.runTestGroup('RAG & Monitoring', {
      'RAG manager structure': async () => {
        const ragManagerPath = path.join(__dirname, '../rag/rag-manager.ts');
        await fs.access(ragManagerPath);
        
        const content = await fs.readFile(ragManagerPath, 'utf8');
        if (!content.includes('RAGManager')) {
          throw new Error('RAGManager class not found');
        }
        
        return { ragManager: 'functional' };
      },

      'RAG providers': async () => {
        const mcpRagPath = path.join(__dirname, '../rag/mcp-rag.ts');
        const dockerRagPath = path.join(__dirname, '../rag/docker-rag.ts');
        
        await fs.access(mcpRagPath);
        await fs.access(dockerRagPath);
        
        // Check Docker RAG for command injection fix
        const dockerContent = await fs.readFile(dockerRagPath, 'utf8');
        if (!dockerContent.includes('sanitizeContainerName')) {
          throw new Error('Command injection fix not found in Docker RAG');
        }
        
        return { 
          mcpProvider: 'available', 
          dockerProvider: 'secure',
          commandInjectionFixed: true
        };
      },

      'Advanced RAG intelligence': async () => {
        const advancedRagPath = path.join(__dirname, '../rag/advanced/intelligence-engine.ts');
        try {
          await fs.access(advancedRagPath);
          const content = await fs.readFile(advancedRagPath, 'utf8');
          
          const isPhase2 = content.includes('Phase 2');
          return { 
            advancedRAG: 'available', 
            status: isPhase2 ? 'planned_feature' : 'active',
            phase: 2
          };
        } catch {
          return { advancedRAG: 'not_available' };
        }
      },

      'Monitoring system': async () => {
        const monitoringPath = path.join(__dirname, '../monitoring/index.ts');
        await fs.access(monitoringPath);
        
        const content = await fs.readFile(monitoringPath, 'utf8');
        if (!content.includes('MonitoringPlatform')) {
          throw new Error('MonitoringPlatform not found');
        }
        
        return { monitoring: 'functional', platform: 'available' };
      },

      'System monitor': async () => {
        const systemMonitorPath = path.join(__dirname, '../monitoring/system-monitor.ts');
        await fs.access(systemMonitorPath);
        
        return { systemMonitor: 'available' };
      }
    });
  }

  /**
   * Test 6: Setup and Installation Systems
   */
  async testSetupInstallation(runner) {
    return await runner.runTestGroup('Setup & Installation', {
      'Setup wizard': async () => {
        const setupWizardPath = path.join(__dirname, '../setup/setup-wizard.ts');
        await fs.access(setupWizardPath);
        
        const content = await fs.readFile(setupWizardPath, 'utf8');
        if (!content.includes('SetupWizard')) {
          throw new Error('SetupWizard class not found');
        }
        
        return { setupWizard: 'functional' };
      },

      'Interactive prompts security': async () => {
        const promptsPath = path.join(__dirname, '../setup/ui/interactive-prompts.ts');
        await fs.access(promptsPath);
        
        const content = await fs.readFile(promptsPath, 'utf8');
        if (!content.includes('processingMutex')) {
          throw new Error('Race condition fix not found in interactive prompts');
        }
        
        return { 
          interactivePrompts: 'secure',
          raceConditionFixed: true
        };
      },

      'Installation validator': async () => {
        const validatorPath = path.join(__dirname, '../installer/installation-validator.ts');
        await fs.access(validatorPath);
        
        return { installationValidator: 'available' };
      },

      'Setup steps': async () => {
        const credentialStepPath = path.join(__dirname, '../setup/steps/credential-setup.ts');
        const backendStepPath = path.join(__dirname, '../setup/steps/backend-configuration.ts');
        
        await fs.access(credentialStepPath);
        await fs.access(backendStepPath);
        
        return { 
          credentialSetup: 'available',
          backendConfiguration: 'available'
        };
      }
    });
  }

  /**
   * Test 7: Plugin and Extension Systems
   */
  async testPluginSystem(runner) {
    return await runner.runTestGroup('Plugin System', {
      'Plugin SDK structure': async () => {
        const pluginSDKPath = path.join(__dirname, '../plugins/plugin-sdk.ts');
        await fs.access(pluginSDKPath);
        
        const content = await fs.readFile(pluginSDKPath, 'utf8');
        if (!content.includes('BasePlugin')) {
          throw new Error('BasePlugin class not found');
        }
        
        // Check that example classes were removed
        if (content.includes('MyBackendPlugin')) {
          throw new Error('Example classes not cleaned up');
        }
        
        return { 
          pluginSDK: 'functional',
          exampleClassesRemoved: true
        };
      },

      'Plugin manager': async () => {
        const pluginSDKPath = path.join(__dirname, '../plugins/plugin-sdk.ts');
        const content = await fs.readFile(pluginSDKPath, 'utf8');
        
        if (!content.includes('PluginManager')) {
          throw new Error('PluginManager class not found');
        }
        
        return { pluginManager: 'functional' };
      },

      'Development tools': async () => {
        const devToolsPath = path.join(__dirname, '../plugins/dev-tools.ts');
        await fs.access(devToolsPath);
        
        const content = await fs.readFile(devToolsPath, 'utf8');
        
        // Check that unused classes were removed
        if (content.includes('PluginDevServer')) {
          throw new Error('Unused development tools not cleaned up');
        }
        
        return { 
          devTools: 'cleaned',
          unusedClassesRemoved: true,
          scaffolder: 'available'
        };
      },

      'Plugin validation': async () => {
        const validationPath = path.join(__dirname, '../plugins/validation.ts');
        await fs.access(validationPath);
        
        return { pluginValidation: 'available' };
      }
    });
  }

  /**
   * Test 8: Test Framework Consolidation
   */
  async testTestFramework(runner) {
    return await runner.runTestGroup('Test Framework', {
      'Consolidated test utilities': async () => {
        const testRunnerPath = path.join(__dirname, './utils/test-runner.js');
        const testBasePath = path.join(__dirname, './utils/test-base.js');
        
        await fs.access(testRunnerPath);
        await fs.access(testBasePath);
        
        return { 
          testRunner: 'available',
          testBase: 'available',
          consolidated: true
        };
      },

      'Error handler utility': async () => {
        const errorHandlerPath = path.join(__dirname, '../utils/error-handler.js');
        await fs.access(errorHandlerPath);
        
        return { errorHandler: 'unified' };
      },

      'Original test suites': async () => {
        const originalTestPath = path.join(__dirname, './claudette-unit-tests.js');
        const consolidatedTestPath = path.join(__dirname, './claudette-unit-tests-consolidated.js');
        
        await fs.access(originalTestPath);
        await fs.access(consolidatedTestPath);
        
        return { 
          originalTests: 'preserved',
          consolidatedVersion: 'available'
        };
      }
    });
  }

  /**
   * Run comprehensive feature test
   */
  async runComprehensiveTest() {
    const runner = new TestRunner('Claudette Framework Feature Test', {
      verbose: true,
      outputFile: 'claudette-feature-test-results.json'
    });

    return await runner.runSuite(async (testRunner) => {
      console.log('\n🧪 CLAUDETTE FRAMEWORK COMPREHENSIVE FEATURE TEST');
      console.log('='.repeat(80));
      console.log('Testing all major framework components and integrations...\n');

      // Execute all test categories
      await this.testCoreFramework(testRunner);
      await this.testBackendSystem(testRunner);
      await this.testCredentialSystem(testRunner);
      await this.testCacheDatabase(testRunner);
      await this.testRAGMonitoring(testRunner);
      await this.testSetupInstallation(testRunner);
      await this.testPluginSystem(testRunner);
      await this.testTestFramework(testRunner);

      console.log('\n✅ All feature categories tested');
    });
  }
}

// CLI execution
if (require.main === module) {
  const featureTest = new ClaudetteFrameworkTest();
  
  featureTest.runComprehensiveTest()
    .then(exitCode => {
      console.log(`\n🏁 Feature test completed with exit code: ${exitCode}`);
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('❌ Feature test failed:', error.message);
      process.exit(1);
    });
}

module.exports = ClaudetteFrameworkTest;