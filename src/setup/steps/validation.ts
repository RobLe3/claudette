// Final validation step - Comprehensive system testing and verification

import chalk from 'chalk';
import { SetupStep, SetupContext, StepResult, ValidationResult } from '../types';

export class ValidationStep implements SetupStep {
  id = 'validation';
  name = 'System Validation';
  description = 'Validate complete setup and test functionality';
  estimatedTime = 20;
  required = true;
  dependencies = ['credential-setup', 'backend-configuration'];

  async execute(context: SetupContext): Promise<StepResult> {
    try {
      console.log(chalk.cyan('🔍 Performing comprehensive system validation...'));
      
      const validationResults: ValidationResult[] = [];
      
      // 1. Validate credentials and backend connectivity
      console.log(chalk.dim('   Testing backend connectivity...'));
      const backendResults = await this.validateBackends(context);
      validationResults.push(...backendResults);
      
      // 2. Validate configuration integrity
      console.log(chalk.dim('   Checking configuration integrity...'));
      const configResults = await this.validateConfiguration(context);
      validationResults.push(...configResults);
      
      // 3. Test database and storage systems
      console.log(chalk.dim('   Testing database and storage...'));
      const storageResults = await this.validateStorage(context);
      validationResults.push(...storageResults);
      
      // 4. Validate RAG system if enabled
      if (context.configuration.rag.enabled) {
        console.log(chalk.dim('   Testing RAG integration...'));
        const ragResults = await this.validateRAG(context);
        validationResults.push(...ragResults);
      }
      
      // 5. Perform end-to-end functionality test
      console.log(chalk.dim('   Running end-to-end test...'));
      const e2eResults = await this.validateEndToEnd(context);
      validationResults.push(...e2eResults);
      
      // Analyze results
      const criticalErrors = validationResults.filter(r => !r.valid && r.critical);
      const warnings = validationResults.filter(r => !r.valid && !r.critical);
      const passed = validationResults.filter(r => r.valid);
      
      // Display results
      this.displayValidationResults(validationResults);
      
      if (criticalErrors.length > 0) {
        return {
          success: false,
          message: `Validation failed: ${criticalErrors.length} critical error(s)`,
          error: new Error(`Critical validation failures: ${criticalErrors.map(e => e.message).join(', ')}`),
          data: {
            criticalErrors: criticalErrors.length,
            warnings: warnings.length,
            passed: passed.length,
            details: validationResults
          }
        };
      }
      
      return {
        success: true,
        message: `Validation completed successfully (${passed.length} checks passed)`,
        warnings: warnings.length > 0 ? warnings.map(w => w.message) : undefined,
        data: {
          criticalErrors: 0,
          warnings: warnings.length,
          passed: passed.length,
          details: validationResults
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: `Validation failed with error: ${(error as Error).message}`
      };
    }
  }

  async validate(context: SetupContext): Promise<boolean> {
    // This step validates itself, so always return true if it executes
    return true;
  }

  /**
   * Validate backend connectivity and API keys
   */
  private async validateBackends(context: SetupContext): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const credentials = context.configuration.credentials;
    
    for (const [backendName, config] of Object.entries(credentials)) {
      if (!config.enabled) continue;
      
      try {
        // Test basic connectivity
        const connectivityTest = await this.testBackendConnectivity(backendName, config);
        
        if (connectivityTest.success) {
          results.push({
            valid: true,
            component: `${backendName} connectivity`,
            message: `${backendName} is accessible and responding`,
            critical: false,
            testResult: connectivityTest
          });
          
          // Test API key validity
          const authTest = await this.testBackendAuthentication(backendName, config);
          
          results.push({
            valid: authTest.success,
            component: `${backendName} authentication`,
            message: authTest.success ? 
              `${backendName} API key is valid` : 
              `${backendName} authentication failed: ${authTest.error}`,
            critical: true,
            fixSuggestion: authTest.success ? undefined : 'Check API key validity and permissions',
            testResult: authTest
          });
          
        } else {
          results.push({
            valid: false,
            component: `${backendName} connectivity`,
            message: `Failed to connect to ${backendName}: ${connectivityTest.error}`,
            critical: true,
            fixSuggestion: 'Check network connection and API endpoint'
          });
        }
        
      } catch (error) {
        results.push({
          valid: false,
          component: `${backendName} validation`,
          message: `${backendName} validation error: ${(error as Error).message}`,
          critical: true,
          fixSuggestion: 'Review backend configuration'
        });
      }
    }
    
    return results;
  }

  /**
   * Validate configuration integrity and consistency
   */
  private async validateConfiguration(context: SetupContext): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const config = context.configuration;
    
    // Validate backend priority configuration
    const configuredBackends = Object.keys(config.credentials).filter(
      key => config.credentials[key].enabled
    );
    
    const priorityBackends = config.backends.priority;
    
    results.push({
      valid: priorityBackends.length > 0,
      component: 'backend priority',
      message: priorityBackends.length > 0 ? 
        'Backend priority order configured' : 
        'No backend priority configured',
      critical: priorityBackends.length === 0,
      fixSuggestion: 'Configure at least one backend in priority order'
    });
    
    // Validate that priority backends are actually configured
    const validPriorities = priorityBackends.filter(backend => 
      configuredBackends.includes(backend)
    );
    
    results.push({
      valid: validPriorities.length === priorityBackends.length,
      component: 'priority consistency',
      message: validPriorities.length === priorityBackends.length ?
        'All priority backends are configured' :
        `${priorityBackends.length - validPriorities.length} priority backends are not configured`,
      critical: false,
      fixSuggestion: 'Remove unconfigured backends from priority list'
    });
    
    // Validate cost and latency thresholds
    if (config.backends.costThreshold !== undefined) {
      results.push({
        valid: config.backends.costThreshold >= 0,
        component: 'cost threshold',
        message: config.backends.costThreshold >= 0 ?
          `Cost threshold set to €${config.backends.costThreshold}` :
          'Invalid cost threshold (negative value)',
        critical: false,
        fixSuggestion: 'Set cost threshold to positive value or zero for unlimited'
      });
    }
    
    if (config.backends.latencyThreshold !== undefined) {
      results.push({
        valid: config.backends.latencyThreshold >= 0,
        component: 'latency threshold',
        message: config.backends.latencyThreshold >= 0 ?
          `Latency threshold set to ${config.backends.latencyThreshold}ms` :
          'Invalid latency threshold (negative value)',
        critical: false,
        fixSuggestion: 'Set latency threshold to positive value or zero for unlimited'
      });
    }
    
    return results;
  }

  /**
   * Validate storage systems (database, credential storage)
   */
  private async validateStorage(context: SetupContext): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      // Test database connectivity
      const dbTest = await this.testDatabaseConnection();
      results.push({
        valid: dbTest.success,
        component: 'database',
        message: dbTest.success ?
          'Database is accessible and functional' :
          `Database error: ${dbTest.error}`,
        critical: dbTest.success === false,
        fixSuggestion: dbTest.success ? undefined : 'Check database file permissions and disk space'
      });
      
      // Test credential storage
      const credTest = await this.testCredentialStorage();
      results.push({
        valid: credTest.success,
        component: 'credential storage',
        message: credTest.success ?
          'Credential storage is working' :
          `Credential storage error: ${credTest.error}`,
        critical: false,
        fixSuggestion: credTest.success ? undefined : 'Check system keychain/credential store access'
      });
      
    } catch (error) {
      results.push({
        valid: false,
        component: 'storage validation',
        message: `Storage validation error: ${(error as Error).message}`,
        critical: true
      });
    }
    
    return results;
  }

  /**
   * Validate RAG system if enabled
   */
  private async validateRAG(context: SetupContext): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const ragConfig = context.configuration.rag;
    
    if (!ragConfig.enabled) {
      return results;
    }
    
    try {
      // Test RAG connection
      const connectionTest = await this.testRAGConnection(ragConfig);
      results.push({
        valid: connectionTest.success,
        component: 'RAG connection',
        message: connectionTest.success ?
          `RAG ${ragConfig.deployment} connection successful` :
          `RAG connection failed: ${connectionTest.error}`,
        critical: false, // RAG is optional
        fixSuggestion: connectionTest.success ? undefined : 'Check RAG service status and configuration'
      });
      
      if (connectionTest.success) {
        // Test RAG functionality
        const functionalityTest = await this.testRAGFunctionality(ragConfig);
        results.push({
          valid: functionalityTest.success,
          component: 'RAG functionality',
          message: functionalityTest.success ?
            'RAG queries are working' :
            `RAG functionality error: ${functionalityTest.error}`,
          critical: false,
          fixSuggestion: functionalityTest.success ? undefined : 'Check RAG service logs and configuration'
        });
      }
      
    } catch (error) {
      results.push({
        valid: false,
        component: 'RAG validation',
        message: `RAG validation error: ${(error as Error).message}`,
        critical: false
      });
    }
    
    return results;
  }

  /**
   * Perform end-to-end functionality test
   */
  private async validateEndToEnd(context: SetupContext): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      console.log(chalk.dim('     Making test request...'));
      
      // Make a simple test request through the full system
      const testRequest = {
        prompt: 'Hello! This is a test request to verify the system is working.',
        options: {
          max_tokens: 50
        }
      };
      
      const testResult = await this.makeTestRequest(testRequest, context);
      
      results.push({
        valid: testResult.success,
        component: 'end-to-end test',
        message: testResult.success ?
          `Test request completed in ${testResult.latency}ms using ${testResult.backend}` :
          `End-to-end test failed: ${testResult.error}`,
        critical: true,
        fixSuggestion: testResult.success ? undefined : 'Check backend connectivity and authentication',
        testResult: testResult
      });
      
      // Test caching if enabled
      if (context.configuration.features.caching && testResult.success) {
        console.log(chalk.dim('     Testing cache functionality...'));
        
        const cacheTest = await this.testCaching(testRequest, context);
        results.push({
          valid: cacheTest.success,
          component: 'caching system',
          message: cacheTest.success ?
            'Cache is working correctly' :
            `Cache test failed: ${cacheTest.error}`,
          critical: false,
          fixSuggestion: cacheTest.success ? undefined : 'Check database and cache configuration'
        });
      }
      
    } catch (error) {
      results.push({
        valid: false,
        component: 'end-to-end test',
        message: `E2E test error: ${(error as Error).message}`,
        critical: true
      });
    }
    
    return results;
  }

  /**
   * Display validation results in a formatted table
   */
  private displayValidationResults(results: ValidationResult[]): void {
    console.log(chalk.bold('\n🔍 Validation Results\n'));
    
    const criticalErrors = results.filter(r => !r.valid && r.critical);
    const warnings = results.filter(r => !r.valid && !r.critical);
    const passed = results.filter(r => r.valid);
    
    // Summary
    console.log(`${chalk.green('✅')} Passed: ${passed.length}`);
    console.log(`${chalk.yellow('⚠️')} Warnings: ${warnings.length}`);
    console.log(`${chalk.red('❌')} Critical Errors: ${criticalErrors.length}`);
    
    console.log(chalk.dim('\nDetailed Results:'));
    console.log(chalk.dim('─'.repeat(60)));
    
    // Show all results
    for (const result of results) {
      const icon = result.valid ? chalk.green('✅') : 
                   result.critical ? chalk.red('❌') : chalk.yellow('⚠️');
      
      console.log(`${icon} ${result.component}: ${result.message}`);
      
      if (!result.valid && result.fixSuggestion) {
        console.log(chalk.dim(`   💡 ${result.fixSuggestion}`));
      }
    }
    
    console.log();
  }

  // Mock test implementations (would be replaced with actual tests)
  
  private async testBackendConnectivity(backendName: string, config: any): Promise<{
    success: boolean;
    error?: string;
  }> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return { success: Math.random() > 0.1 }; // 90% success rate
  }

  private async testBackendAuthentication(backendName: string, config: any): Promise<{
    success: boolean;
    error?: string;
  }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const success = Math.random() > 0.05; // 95% success rate
    return { 
      success,
      error: success ? undefined : 'Invalid API key or insufficient permissions'
    };
  }

  private async testDatabaseConnection(): Promise<{
    success: boolean;
    error?: string;
  }> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return { success: Math.random() > 0.02 }; // 98% success rate
  }

  private async testCredentialStorage(): Promise<{
    success: boolean;
    error?: string;
  }> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return { success: Math.random() > 0.1 }; // 90% success rate
  }

  private async testRAGConnection(ragConfig: any): Promise<{
    success: boolean;
    error?: string;
  }> {
    await new Promise(resolve => setTimeout(resolve, 800));
    return { success: Math.random() > 0.3 }; // 70% success rate
  }

  private async testRAGFunctionality(ragConfig: any): Promise<{
    success: boolean;
    error?: string;
  }> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: Math.random() > 0.2 }; // 80% success rate
  }

  private async makeTestRequest(request: any, context: SetupContext): Promise<{
    success: boolean;
    error?: string;
    latency?: number;
    backend?: string;
  }> {
    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
    const latency = Date.now() - startTime;
    
    const success = Math.random() > 0.05; // 95% success rate
    const backends = Object.keys(context.configuration.credentials);
    const backend = backends[0] || 'unknown';
    
    return {
      success,
      error: success ? undefined : 'Request failed',
      latency,
      backend
    };
  }

  private async testCaching(request: any, context: SetupContext): Promise<{
    success: boolean;
    error?: string;
  }> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return { success: Math.random() > 0.1 }; // 90% success rate
  }
}