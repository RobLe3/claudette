// Dependency validation and system requirements checking

import { exec } from 'child_process';
import { promisify } from 'util';
import { PlatformDetector } from '../credentials/platform-detector';
import { Platform } from '../credentials/types';

const execAsync = promisify(exec);

export interface DependencyStatus {
  name: string;
  required: boolean;
  installed: boolean;
  version?: string;
  requiredVersion?: string;
  compatible: boolean;
  installCommand?: string;
  error?: string;
}

export interface SystemRequirements {
  platform: Platform;
  nodeJs: DependencyStatus;
  npm: DependencyStatus;
  credentialStorage: DependencyStatus;
  additionalTools: DependencyStatus[];
  overallStatus: 'compatible' | 'issues' | 'incompatible';
  recommendations: string[];
}

export class DependencyValidator {
  private platformDetector: PlatformDetector;

  constructor() {
    this.platformDetector = PlatformDetector.getInstance();
  }

  /**
   * Validate all system dependencies and requirements
   */
  async validateSystem(): Promise<SystemRequirements> {
    const platformInfo = await this.platformDetector.detectPlatform();
    
    const nodeJs = await this.validateNodeJS();
    const npm = await this.validateNPM();
    const credentialStorage = await this.validateCredentialStorage();
    const additionalTools = await this.validateAdditionalTools();

    const requirements: SystemRequirements = {
      platform: platformInfo.platform,
      nodeJs,
      npm,
      credentialStorage,
      additionalTools,
      overallStatus: this.determineOverallStatus([nodeJs, npm, credentialStorage, ...additionalTools]),
      recommendations: this.generateRecommendations(platformInfo.platform, [nodeJs, npm, credentialStorage, ...additionalTools])
    };

    return requirements;
  }

  /**
   * Validate Node.js installation and version
   */
  async validateNodeJS(): Promise<DependencyStatus> {
    try {
      const { stdout } = await execAsync('node --version');
      const version = stdout.trim();
      const versionNumber = version.slice(1); // Remove 'v' prefix
      const majorVersion = parseInt(versionNumber.split('.')[0]);
      
      return {
        name: 'Node.js',
        required: true,
        installed: true,
        version,
        requiredVersion: '>=18.0.0',
        compatible: majorVersion >= 18,
        installCommand: await this.getNodeInstallCommand()
      };
    } catch (error) {
      return {
        name: 'Node.js',
        required: true,
        installed: false,
        compatible: false,
        requiredVersion: '>=18.0.0',
        installCommand: await this.getNodeInstallCommand(),
        error: 'Node.js not found in PATH'
      };
    }
  }

  /**
   * Validate npm installation and version
   */
  async validateNPM(): Promise<DependencyStatus> {
    try {
      const { stdout } = await execAsync('npm --version');
      const version = stdout.trim();
      const majorVersion = parseInt(version.split('.')[0]);
      
      return {
        name: 'npm',
        required: true,
        installed: true,
        version,
        requiredVersion: '>=8.0.0',
        compatible: majorVersion >= 8,
        installCommand: 'npm install -g npm@latest'
      };
    } catch (error) {
      return {
        name: 'npm',
        required: true,
        installed: false,
        compatible: false,
        requiredVersion: '>=8.0.0',
        installCommand: 'npm install -g npm@latest',
        error: 'npm not found in PATH'
      };
    }
  }

  /**
   * Validate credential storage availability
   */
  async validateCredentialStorage(): Promise<DependencyStatus> {
    const platformInfo = await this.platformDetector.detectPlatform();
    
    switch (platformInfo.platform) {
      case Platform.MACOS:
        return await this.validateKeychainAccess();
      case Platform.WINDOWS:
        return await this.validateWindowsCredentialManager();
      case Platform.LINUX:
        return await this.validateLibSecret();
      default:
        return {
          name: 'Credential Storage',
          required: false,
          installed: false,
          compatible: true, // Fallback to encrypted files
          installCommand: 'Encrypted file storage will be used as fallback',
          error: 'Platform-specific credential storage not available'
        };
    }
  }

  /**
   * Validate additional platform-specific tools
   */
  async validateAdditionalTools(): Promise<DependencyStatus[]> {
    const platformInfo = await this.platformDetector.detectPlatform();
    const tools: DependencyStatus[] = [];

    // Git (recommended but not required)
    tools.push(await this.validateGit());

    // Platform-specific tools
    switch (platformInfo.platform) {
      case Platform.MACOS:
        tools.push(await this.validateXcodeCLI());
        break;
      case Platform.LINUX:
        tools.push(await this.validateBuildEssentials());
        break;
      case Platform.WINDOWS:
        tools.push(await this.validateWindowsBuildTools());
        break;
    }

    return tools;
  }

  private async validateKeychainAccess(): Promise<DependencyStatus> {
    try {
      await execAsync('security -h');
      // Test basic keychain operation
      await execAsync('security find-generic-password -s "claudette-test-probe" 2>/dev/null || true');
      
      return {
        name: 'macOS Keychain',
        required: false,
        installed: true,
        compatible: true,
        installCommand: 'Built into macOS'
      };
    } catch (error) {
      return {
        name: 'macOS Keychain',
        required: false,
        installed: false,
        compatible: false,
        installCommand: 'Update to macOS 10.9+ for Keychain support',
        error: 'Keychain access not available'
      };
    }
  }

  private async validateWindowsCredentialManager(): Promise<DependencyStatus> {
    try {
      await execAsync('cmdkey /list >nul 2>nul');
      
      return {
        name: 'Windows Credential Manager',
        required: false,
        installed: true,
        compatible: true,
        installCommand: 'Built into Windows'
      };
    } catch (error) {
      return {
        name: 'Windows Credential Manager',
        required: false,
        installed: false,
        compatible: false,
        installCommand: 'Update to Windows 7+ for Credential Manager',
        error: 'Credential Manager not accessible'
      };
    }
  }

  private async validateLibSecret(): Promise<DependencyStatus> {
    try {
      await execAsync('command -v secret-tool >/dev/null 2>&1');
      
      return {
        name: 'libsecret (GNOME Keyring)',
        required: false,
        installed: true,
        compatible: true,
        installCommand: 'Already installed'
      };
    } catch (error) {
      const installCommands = [
        'Ubuntu/Debian: sudo apt install libsecret-tools',
        'Fedora: sudo dnf install libsecret',
        'Arch: sudo pacman -S libsecret',
        'SUSE: sudo zypper install libsecret-tools'
      ];

      return {
        name: 'libsecret (GNOME Keyring)',
        required: false,
        installed: false,
        compatible: false,
        installCommand: installCommands.join(' | '),
        error: 'secret-tool not found'
      };
    }
  }

  private async validateGit(): Promise<DependencyStatus> {
    try {
      const { stdout } = await execAsync('git --version');
      const version = stdout.match(/git version ([^\s]+)/)?.[1] || 'unknown';
      
      return {
        name: 'Git',
        required: false,
        installed: true,
        version,
        compatible: true,
        installCommand: 'Already installed'
      };
    } catch (error) {
      return {
        name: 'Git',
        required: false,
        installed: false,
        compatible: true, // Not required
        installCommand: await this.getGitInstallCommand(),
        error: 'Git not found (recommended for updates)'
      };
    }
  }

  private async validateXcodeCLI(): Promise<DependencyStatus> {
    try {
      await execAsync('xcode-select --version');
      
      return {
        name: 'Xcode Command Line Tools',
        required: false,
        installed: true,
        compatible: true,
        installCommand: 'Already installed'
      };
    } catch (error) {
      return {
        name: 'Xcode Command Line Tools',
        required: false,
        installed: false,
        compatible: true, // Not required
        installCommand: 'xcode-select --install',
        error: 'Not installed (recommended for native modules)'
      };
    }
  }

  private async validateBuildEssentials(): Promise<DependencyStatus> {
    try {
      await execAsync('command -v gcc >/dev/null && command -v g++ >/dev/null && command -v make >/dev/null');
      
      return {
        name: 'Build Essentials',
        required: false,
        installed: true,
        compatible: true,
        installCommand: 'Already installed'
      };
    } catch (error) {
      return {
        name: 'Build Essentials',
        required: false,
        installed: false,
        compatible: true, // Not required
        installCommand: 'sudo apt install build-essential (Ubuntu) | sudo dnf groupinstall "Development Tools" (Fedora)',
        error: 'Not installed (recommended for native modules)'
      };
    }
  }

  private async validateWindowsBuildTools(): Promise<DependencyStatus> {
    try {
      // Check for Visual Studio Build Tools or Visual Studio
      const { stdout } = await execAsync('npm config get msvs_version 2>nul || echo "not-set"');
      
      if (stdout.includes('not-set')) {
        return {
          name: 'Visual Studio Build Tools',
          required: false,
          installed: false,
          compatible: true, // Not required
          installCommand: 'npm install -g windows-build-tools (deprecated) or install Visual Studio Community',
          error: 'Not configured (may be needed for native modules)'
        };
      }
      
      return {
        name: 'Visual Studio Build Tools',
        required: false,
        installed: true,
        compatible: true,
        installCommand: 'Already configured'
      };
    } catch (error) {
      return {
        name: 'Visual Studio Build Tools',
        required: false,
        installed: false,
        compatible: true,
        installCommand: 'Install Visual Studio Community with C++ tools',
        error: 'Build tools not available (may be needed for native modules)'
      };
    }
  }

  private async getNodeInstallCommand(): Promise<string> {
    const platformInfo = await this.platformDetector.detectPlatform();
    
    switch (platformInfo.platform) {
      case Platform.MACOS:
        return 'brew install node (Homebrew) | Download from https://nodejs.org';
      case Platform.WINDOWS:
        return 'winget install OpenJS.NodeJS | Download from https://nodejs.org';
      case Platform.LINUX:
        return 'curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs';
      default:
        return 'Download from https://nodejs.org';
    }
  }

  private async getGitInstallCommand(): Promise<string> {
    const platformInfo = await this.platformDetector.detectPlatform();
    
    switch (platformInfo.platform) {
      case Platform.MACOS:
        return 'brew install git | xcode-select --install';
      case Platform.WINDOWS:
        return 'winget install Git.Git | Download from https://git-scm.com';
      case Platform.LINUX:
        return 'sudo apt install git (Ubuntu) | sudo dnf install git (Fedora)';
      default:
        return 'Download from https://git-scm.com';
    }
  }

  private determineOverallStatus(dependencies: DependencyStatus[]): 'compatible' | 'issues' | 'incompatible' {
    const required = dependencies.filter(dep => dep.required);
    const requiredIncompatible = required.filter(dep => !dep.compatible);
    
    if (requiredIncompatible.length > 0) {
      return 'incompatible';
    }
    
    const hasIssues = dependencies.some(dep => dep.installed && !dep.compatible);
    if (hasIssues) {
      return 'issues';
    }
    
    return 'compatible';
  }

  private generateRecommendations(platform: Platform, dependencies: DependencyStatus[]): string[] {
    const recommendations: string[] = [];
    
    // Check for missing required dependencies
    const missingRequired = dependencies.filter(dep => dep.required && !dep.installed);
    if (missingRequired.length > 0) {
      recommendations.push(`Install required dependencies: ${missingRequired.map(d => d.name).join(', ')}`);
    }
    
    // Check for incompatible versions
    const incompatible = dependencies.filter(dep => dep.installed && !dep.compatible);
    if (incompatible.length > 0) {
      recommendations.push(`Update incompatible versions: ${incompatible.map(d => d.name).join(', ')}`);
    }
    
    // Platform-specific recommendations
    switch (platform) {
      case Platform.MACOS:
        if (!dependencies.find(d => d.name === 'Xcode Command Line Tools')?.installed) {
          recommendations.push('Install Xcode Command Line Tools for better native module support');
        }
        break;
      case Platform.LINUX:
        if (!dependencies.find(d => d.name === 'libsecret (GNOME Keyring)')?.installed) {
          recommendations.push('Install libsecret-tools for secure credential storage');
        }
        if (!dependencies.find(d => d.name === 'Build Essentials')?.installed) {
          recommendations.push('Install build-essential for native module compilation');
        }
        break;
      case Platform.WINDOWS:
        if (!dependencies.find(d => d.name === 'Visual Studio Build Tools')?.installed) {
          recommendations.push('Install Visual Studio Build Tools for native module support');
        }
        break;
    }
    
    // General recommendations
    if (!dependencies.find(d => d.name === 'Git')?.installed) {
      recommendations.push('Install Git for easier updates and development');
    }
    
    return recommendations;
  }
}