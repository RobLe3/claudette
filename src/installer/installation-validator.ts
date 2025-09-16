// Installation validation and health checking framework

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { DependencyValidator } from './dependency-validator';
import { getCredentialManager } from '../credentials';
import { PlatformDetector } from '../credentials/platform-detector';

const execAsync = promisify(exec);

export interface InstallationCheck {
  name: string;
  category: 'files' | 'dependencies' | 'configuration' | 'connectivity' | 'credentials';
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
  fixCommand?: string;
}

export interface InstallationReport {
  timestamp: Date;
  platform: string;
  overallStatus: 'healthy' | 'issues' | 'broken';
  checks: InstallationCheck[];
  recommendations: string[];
  installationPath?: string;
  version?: string;
  successRate: number;
}

export class InstallationValidator {
  private dependencyValidator: DependencyValidator;
  private platformDetector: PlatformDetector;

  constructor(private installPath?: string) {
    this.dependencyValidator = new DependencyValidator();
    this.platformDetector = PlatformDetector.getInstance();
    
    // Auto-detect installation path if not provided
    if (!this.installPath) {
      this.installPath = this.detectInstallationPath();
    }
  }

  /**
   * Run complete installation validation
   */
  async validateInstallation(): Promise<InstallationReport> {
    const checks: InstallationCheck[] = [];
    const startTime = Date.now();

    try {
      // File system checks
      checks.push(...await this.validateFiles());
      
      // Dependency checks
      checks.push(...await this.validateDependencies());
      
      // Configuration checks
      checks.push(...await this.validateConfiguration());
      
      // Connectivity checks
      checks.push(...await this.validateConnectivity());
      
      // Credential storage checks
      checks.push(...await this.validateCredentials());

    } catch (error) {
      checks.push({
        name: 'Validation Process',
        category: 'files',
        status: 'fail',
        message: 'Validation process failed',
        details: (error as Error).message
      });
    }

    // Calculate metrics
    const passCount = checks.filter(c => c.status === 'pass').length;
    const successRate = (passCount / checks.length) * 100;
    
    const overallStatus = this.determineOverallStatus(checks);
    const recommendations = this.generateRecommendations(checks);

    const report: InstallationReport = {
      timestamp: new Date(),
      platform: (await this.platformDetector.detectPlatform()).platform,
      overallStatus,
      checks,
      recommendations,
      installationPath: this.installPath,
      version: await this.getInstalledVersion(),
      successRate
    };

    return report;
  }

  /**
   * Validate critical files and directory structure
   */
  private async validateFiles(): Promise<InstallationCheck[]> {
    const checks: InstallationCheck[] = [];

    if (!this.installPath) {
      checks.push({
        name: 'Installation Path Detection',
        category: 'files',
        status: 'fail',
        message: 'Could not detect Claudette installation path',
        fixCommand: 'Reinstall Claudette or specify installation path'
      });
      return checks;
    }

    // Check main files
    const criticalFiles = [
      'package.json',
      'claudette',
      'src/index.ts',
      'src/cli/index.ts'
    ];

    for (const file of criticalFiles) {
      const filePath = join(this.installPath, file);
      try {
        await fs.access(filePath);
        checks.push({
          name: `File: ${file}`,
          category: 'files',
          status: 'pass',
          message: 'File exists and accessible'
        });
      } catch {
        checks.push({
          name: `File: ${file}`,
          category: 'files',
          status: 'fail',
          message: 'Critical file missing',
          details: `Expected at: ${filePath}`,
          fixCommand: 'Reinstall Claudette'
        });
      }
    }

    // Check directory structure
    const requiredDirs = [
      'src',
      'src/backends',
      'src/credentials',
      'src/cli'
    ];

    for (const dir of requiredDirs) {
      const dirPath = join(this.installPath, dir);
      try {
        const stat = await fs.stat(dirPath);
        if (stat.isDirectory()) {
          checks.push({
            name: `Directory: ${dir}`,
            category: 'files',
            status: 'pass',
            message: 'Directory exists'
          });
        } else {
          checks.push({
            name: `Directory: ${dir}`,
            category: 'files',
            status: 'fail',
            message: 'Path exists but is not a directory',
            details: dirPath
          });
        }
      } catch {
        checks.push({
          name: `Directory: ${dir}`,
          category: 'files',
          status: 'fail',
          message: 'Required directory missing',
          details: `Expected at: ${dirPath}`,
          fixCommand: 'Reinstall Claudette'
        });
      }
    }

    // Check permissions
    try {
      const mainScript = join(this.installPath, 'claudette');
      const stat = await fs.stat(mainScript);
      const isExecutable = !!(stat.mode & parseInt('111', 8));
      
      checks.push({
        name: 'Executable Permissions',
        category: 'files',
        status: isExecutable ? 'pass' : 'fail',
        message: isExecutable ? 'Main script is executable' : 'Main script not executable',
        fixCommand: isExecutable ? undefined : `chmod +x ${mainScript}`
      });
    } catch {
      checks.push({
        name: 'Executable Permissions',
        category: 'files',
        status: 'fail',
        message: 'Cannot check executable permissions',
        fixCommand: 'Reinstall Claudette'
      });
    }

    return checks;
  }

  /**
   * Validate system dependencies
   */
  private async validateDependencies(): Promise<InstallationCheck[]> {
    const checks: InstallationCheck[] = [];
    
    try {
      const sysReqs = await this.dependencyValidator.validateSystem();
      
      // Convert dependency statuses to checks
      const allDeps = [sysReqs.nodeJs, sysReqs.npm, sysReqs.credentialStorage, ...sysReqs.additionalTools];
      
      for (const dep of allDeps) {
        let status: 'pass' | 'fail' | 'warning';
        let message: string;
        
        if (!dep.installed && dep.required) {
          status = 'fail';
          message = `Required dependency not installed`;
        } else if (!dep.installed && !dep.required) {
          status = 'warning';
          message = `Optional dependency not installed`;
        } else if (!dep.compatible) {
          status = dep.required ? 'fail' : 'warning';
          message = `Incompatible version: ${dep.version} (need ${dep.requiredVersion})`;
        } else {
          status = 'pass';
          message = dep.version ? `Version ${dep.version} installed` : 'Available';
        }

        checks.push({
          name: dep.name,
          category: 'dependencies',
          status,
          message,
          details: dep.error,
          fixCommand: dep.installCommand
        });
      }

      // Check node_modules
      if (this.installPath) {
        const nodeModulesPath = join(this.installPath, 'node_modules');
        try {
          await fs.access(nodeModulesPath);
          const moduleCount = (await fs.readdir(nodeModulesPath)).length;
          
          checks.push({
            name: 'NPM Dependencies',
            category: 'dependencies',
            status: moduleCount > 0 ? 'pass' : 'warning',
            message: `${moduleCount} modules installed`,
            fixCommand: moduleCount > 0 ? undefined : 'npm install'
          });
        } catch {
          checks.push({
            name: 'NPM Dependencies',
            category: 'dependencies',
            status: 'fail',
            message: 'node_modules directory not found',
            fixCommand: 'npm install'
          });
        }
      }

    } catch (error) {
      checks.push({
        name: 'Dependency Validation',
        category: 'dependencies',
        status: 'fail',
        message: 'Failed to validate dependencies',
        details: (error as Error).message
      });
    }

    return checks;
  }

  /**
   * Validate configuration files and settings
   */
  private async validateConfiguration(): Promise<InstallationCheck[]> {
    const checks: InstallationCheck[] = [];

    if (!this.installPath) {
      return checks;
    }

    // Check package.json
    try {
      const packagePath = join(this.installPath, 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);
      
      checks.push({
        name: 'package.json',
        category: 'configuration',
        status: 'pass',
        message: `Valid package.json v${packageJson.version}`
      });

      // Check required fields
      const requiredFields = ['name', 'version', 'main', 'dependencies'];
      for (const field of requiredFields) {
        if (packageJson[field]) {
          checks.push({
            name: `package.json.${field}`,
            category: 'configuration',
            status: 'pass',
            message: 'Field present'
          });
        } else {
          checks.push({
            name: `package.json.${field}`,
            category: 'configuration',
            status: 'fail',
            message: 'Required field missing'
          });
        }
      }

    } catch (error) {
      checks.push({
        name: 'package.json',
        category: 'configuration',
        status: 'fail',
        message: 'Cannot read or parse package.json',
        details: (error as Error).message
      });
    }

    // Check TypeScript configuration
    try {
      const tsconfigPath = join(this.installPath, 'tsconfig.json');
      await fs.access(tsconfigPath);
      
      checks.push({
        name: 'TypeScript Config',
        category: 'configuration',
        status: 'pass',
        message: 'tsconfig.json exists'
      });
    } catch {
      checks.push({
        name: 'TypeScript Config',
        category: 'configuration',
        status: 'warning',
        message: 'tsconfig.json not found (may affect development)'
      });
    }

    return checks;
  }

  /**
   * Validate network connectivity to required services
   */
  private async validateConnectivity(): Promise<InstallationCheck[]> {
    const checks: InstallationCheck[] = [];

    const endpoints = [
      { name: 'OpenAI API', url: 'https://api.openai.com', timeout: 5000 },
      { name: 'Anthropic API', url: 'https://api.anthropic.com', timeout: 5000 },
      { name: 'GitHub API', url: 'https://api.github.com', timeout: 5000 },
      { name: 'NPM Registry', url: 'https://registry.npmjs.org', timeout: 5000 }
    ];

    for (const endpoint of endpoints) {
      try {
        await execAsync(`curl -sSf --connect-timeout 5 --max-time 10 "${endpoint.url}" >/dev/null 2>&1`);
        
        checks.push({
          name: endpoint.name,
          category: 'connectivity',
          status: 'pass',
          message: 'Endpoint accessible'
        });
      } catch (error) {
        checks.push({
          name: endpoint.name,
          category: 'connectivity',
          status: 'warning',
          message: 'Endpoint not accessible',
          details: 'Network connectivity issues or firewall restrictions'
        });
      }
    }

    return checks;
  }

  /**
   * Validate credential storage systems
   */
  private async validateCredentials(): Promise<InstallationCheck[]> {
    const checks: InstallationCheck[] = [];

    try {
      const credentialManager = getCredentialManager();
      const status = await credentialManager.getStatus();
      
      checks.push({
        name: 'Credential Manager',
        category: 'credentials',
        status: 'pass',
        message: 'Credential manager initialized'
      });

      if (status.primaryStorage) {
        checks.push({
          name: 'Primary Storage',
          category: 'credentials',
          status: 'pass',
          message: `Using ${status.primaryStorage}`
        });
      }

      if (status.fallbackStorage) {
        checks.push({
          name: 'Fallback Storage',
          category: 'credentials',
          status: 'pass',
          message: `${status.fallbackStorage} available`
        });
      }

      // Test storage functionality
      try {
        const testService = 'claudette-install-test';
        const testKey = 'test-key-' + Date.now();
        
        await credentialManager.store({
          service: testService,
          key: testKey,
          description: 'Installation test credential'
        });

        const retrieved = await credentialManager.retrieve(testService);
        const testPassed = retrieved === testKey;
        
        // Clean up test credential
        await credentialManager.delete(testService);

        checks.push({
          name: 'Credential Storage Test',
          category: 'credentials',
          status: testPassed ? 'pass' : 'fail',
          message: testPassed ? 'Store/retrieve test passed' : 'Store/retrieve test failed'
        });

      } catch (error) {
        checks.push({
          name: 'Credential Storage Test',
          category: 'credentials',
          status: 'warning',
          message: 'Could not test credential storage',
          details: (error as Error).message
        });
      }

    } catch (error) {
      checks.push({
        name: 'Credential Manager',
        category: 'credentials',
        status: 'fail',
        message: 'Failed to initialize credential manager',
        details: (error as Error).message
      });
    }

    return checks;
  }

  /**
   * Detect installation path automatically
   */
  private detectInstallationPath(): string | undefined {
    // Try common installation paths
    const commonPaths = [
      process.cwd(),
      join(process.env.HOME || '', '.local', 'lib', 'claudette'),
      join(process.env.LOCALAPPDATA || '', 'Claudette'),
      '/usr/local/lib/claudette',
      '/opt/claudette'
    ];

    for (const path of commonPaths) {
      try {
        const packageJsonPath = join(path, 'package.json');
        if (require('fs').existsSync(packageJsonPath)) {
          const packageJson = require(packageJsonPath);
          if (packageJson.name === 'claudette') {
            return path;
          }
        }
      } catch {
        continue;
      }
    }

    return undefined;
  }

  /**
   * Get installed version from package.json
   */
  private async getInstalledVersion(): Promise<string | undefined> {
    if (!this.installPath) {
      return undefined;
    }

    try {
      const packagePath = join(this.installPath, 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);
      return packageJson.version;
    } catch {
      return undefined;
    }
  }

  /**
   * Determine overall installation status
   */
  private determineOverallStatus(checks: InstallationCheck[]): 'healthy' | 'issues' | 'broken' {
    const criticalFailures = checks.filter(c => 
      c.status === 'fail' && 
      (c.category === 'files' || c.category === 'dependencies')
    );

    if (criticalFailures.length > 0) {
      return 'broken';
    }

    const hasWarningsOrFailures = checks.some(c => c.status === 'fail' || c.status === 'warning');
    if (hasWarningsOrFailures) {
      return 'issues';
    }

    return 'healthy';
  }

  /**
   * Generate recommendations based on check results
   */
  private generateRecommendations(checks: InstallationCheck[]): string[] {
    const recommendations: string[] = [];

    // Group checks by status and category
    const failures = checks.filter(c => c.status === 'fail');
    const warnings = checks.filter(c => c.status === 'warning');

    // Critical fixes first
    const criticalFailures = failures.filter(c => 
      c.category === 'files' || c.category === 'dependencies'
    );

    if (criticalFailures.length > 0) {
      recommendations.push('🚨 Critical issues detected - Claudette may not work properly');
      recommendations.push('Run the installer again or manually fix the issues listed above');
    }

    // Dependency issues
    const depFailures = failures.filter(c => c.category === 'dependencies');
    if (depFailures.length > 0) {
      recommendations.push('Install missing dependencies using the fix commands provided');
    }

    // Configuration issues
    const configIssues = [...failures, ...warnings].filter(c => c.category === 'configuration');
    if (configIssues.length > 0) {
      recommendations.push('Review configuration files and fix any syntax errors');
    }

    // Connectivity issues
    const connectivityIssues = warnings.filter(c => c.category === 'connectivity');
    if (connectivityIssues.length > 0) {
      recommendations.push('Check internet connection and firewall settings');
      recommendations.push('Some features may not work without internet access');
    }

    // Credential issues
    const credentialIssues = [...failures, ...warnings].filter(c => c.category === 'credentials');
    if (credentialIssues.length > 0) {
      recommendations.push('Set up credential storage using: claudette setup-credentials');
    }

    // Performance recommendations
    if (warnings.length > 3) {
      recommendations.push('Consider resolving warnings to improve performance and reliability');
    }

    return recommendations;
  }
}