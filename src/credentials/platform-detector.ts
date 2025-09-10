// Platform detection and capability checking

import { exec } from 'child_process';
import { promisify } from 'util';
import { Platform, PlatformInfo } from './types';

const execAsync = promisify(exec);

export class PlatformDetector {
  private static instance: PlatformDetector;
  private platformInfo: PlatformInfo | null = null;
  private initializationPromise: Promise<PlatformInfo> | null = null;
  private platformCacheExpiry: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

  static getInstance(): PlatformDetector {
    if (!PlatformDetector.instance) {
      PlatformDetector.instance = new PlatformDetector();
    }
    return PlatformDetector.instance;
  }

  /**
   * Detect current platform and capabilities with caching and async optimization
   */
  async detectPlatform(): Promise<PlatformInfo> {
    const now = Date.now();
    
    // Return cached result if still valid
    if (this.platformInfo && now < this.platformCacheExpiry) {
      return this.platformInfo;
    }

    // If initialization is already in progress, wait for it
    if (this.initializationPromise) {
      return await this.initializationPromise;
    }

    // Start new initialization
    this.initializationPromise = this.performPlatformDetection();
    
    try {
      const result = await this.initializationPromise;
      this.platformCacheExpiry = now + this.CACHE_TTL;
      return result;
    } finally {
      this.initializationPromise = null;
    }
  }

  /**
   * Perform actual platform detection with parallel capability checks
   */
  private async performPlatformDetection(): Promise<PlatformInfo> {
    const platform = this.getPlatformType();
    const arch = process.arch;
    const version = process.version;

    const platformInfo: PlatformInfo = {
      platform,
      arch,
      version
    };

    // Run capability checks in parallel instead of sequentially
    const capabilityPromises: Promise<void>[] = [];

    switch (platform) {
      case Platform.MACOS:
        capabilityPromises.push(
          this.checkKeychainAccess().then(result => {
            platformInfo.hasKeychainAccess = result;
          }).catch(() => {
            platformInfo.hasKeychainAccess = false;
          })
        );
        break;
      case Platform.WINDOWS:
        capabilityPromises.push(
          this.checkWindowsCredentialManager().then(result => {
            platformInfo.hasCredentialManager = result;
          }).catch(() => {
            platformInfo.hasCredentialManager = false;
          })
        );
        break;
      case Platform.LINUX:
        capabilityPromises.push(
          this.checkLibSecret().then(result => {
            platformInfo.hasLibSecret = result;
          }).catch(() => {
            platformInfo.hasLibSecret = false;
          })
        );
        break;
    }

    // Wait for all capability checks to complete in parallel
    await Promise.all(capabilityPromises);

    this.platformInfo = platformInfo;
    return platformInfo;
  }

  /**
   * Get platform type from process.platform
   */
  private getPlatformType(): Platform {
    switch (process.platform) {
      case 'darwin':
        return Platform.MACOS;
      case 'win32':
        return Platform.WINDOWS;
      case 'linux':
        return Platform.LINUX;
      default:
        return Platform.OTHER;
    }
  }

  /**
   * Check if macOS Keychain is accessible with timeout and caching
   */
  private async checkKeychainAccess(): Promise<boolean> {
    try {
      // Fast timeout for capability checks to prevent blocking
      const timeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 2000)
      );
      
      const check = execAsync('security -h').then(() => true);
      
      return await Promise.race([check, timeout]);
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if Windows Credential Manager is accessible with timeout
   */
  private async checkWindowsCredentialManager(): Promise<boolean> {
    try {
      const timeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 2000)
      );
      
      const check = execAsync('cmdkey /list >nul 2>nul').then(() => true);
      
      return await Promise.race([check, timeout]);
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if Linux libsecret is available with timeout and parallel checks
   */
  private async checkLibSecret(): Promise<boolean> {
    try {
      const timeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 2000)
      );
      
      // Run all package checks in parallel
      const checks = [
        execAsync('command -v secret-tool >/dev/null 2>&1').then(() => true).catch(() => false),
        execAsync('dpkg -l | grep libsecret-tools >/dev/null 2>&1').then(() => true).catch(() => false),
        execAsync('rpm -qa | grep libsecret >/dev/null 2>&1').then(() => true).catch(() => false)
      ];
      
      const parallelCheck = Promise.all(checks).then(results => results.some(r => r));
      
      return await Promise.race([parallelCheck, timeout]);
    } catch (error) {
      return false;
    }
  }

  /**
   * Check Node.js version compatibility
   */
  async checkNodeCompatibility(): Promise<{ compatible: boolean; version: string; required: string }> {
    const current = process.version;
    const required = '18.0.0';
    
    const currentNumbers = current.slice(1).split('.').map(Number);
    const requiredNumbers = required.split('.').map(Number);
    
    let compatible = true;
    for (let i = 0; i < requiredNumbers.length; i++) {
      if (currentNumbers[i] > requiredNumbers[i]) {
        break;
      } else if (currentNumbers[i] < requiredNumbers[i]) {
        compatible = false;
        break;
      }
    }

    return {
      compatible,
      version: current,
      required: `>=${required}`
    };
  }

  /**
   * Get recommended credential storage for current platform
   */
  async getRecommendedStorage(): Promise<string[]> {
    const info = await this.detectPlatform();
    const storageOptions: string[] = [];

    switch (info.platform) {
      case Platform.MACOS:
        if (info.hasKeychainAccess) {
          storageOptions.push('keychain');
        }
        break;
      case Platform.WINDOWS:
        if (info.hasCredentialManager) {
          storageOptions.push('windows-credential-manager');
        }
        break;
      case Platform.LINUX:
        if (info.hasLibSecret) {
          storageOptions.push('libsecret');
        }
        break;
    }

    // Always add encrypted file as fallback
    storageOptions.push('encrypted-file');

    return storageOptions;
  }

  /**
   * Clear cached platform info (for testing)
   */
  clearCache(): void {
    this.platformInfo = null;
  }
}