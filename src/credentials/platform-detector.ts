// Platform detection and capability checking

import { exec } from 'child_process';
import { promisify } from 'util';
import { Platform, PlatformInfo } from './types';

const execAsync = promisify(exec);

export class PlatformDetector {
  private static instance: PlatformDetector;
  private platformInfo: PlatformInfo | null = null;

  static getInstance(): PlatformDetector {
    if (!PlatformDetector.instance) {
      PlatformDetector.instance = new PlatformDetector();
    }
    return PlatformDetector.instance;
  }

  /**
   * Detect current platform and capabilities
   */
  async detectPlatform(): Promise<PlatformInfo> {
    if (this.platformInfo) {
      return this.platformInfo;
    }

    const platform = this.getPlatformType();
    const arch = process.arch;
    const version = process.version;

    const platformInfo: PlatformInfo = {
      platform,
      arch,
      version
    };

    // Check platform-specific capabilities
    switch (platform) {
      case Platform.MACOS:
        platformInfo.hasKeychainAccess = await this.checkKeychainAccess();
        break;
      case Platform.WINDOWS:
        platformInfo.hasCredentialManager = await this.checkWindowsCredentialManager();
        break;
      case Platform.LINUX:
        platformInfo.hasLibSecret = await this.checkLibSecret();
        break;
    }

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
   * Check if macOS Keychain is accessible
   */
  private async checkKeychainAccess(): Promise<boolean> {
    try {
      await execAsync('security -h');
      // Test basic keychain operation
      await execAsync('security find-generic-password -s "claudette-test-probe" 2>/dev/null || true');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if Windows Credential Manager is accessible
   */
  private async checkWindowsCredentialManager(): Promise<boolean> {
    try {
      // Test if cmdkey (Windows credential utility) is available
      await execAsync('cmdkey /list >nul 2>nul');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if Linux libsecret is available
   */
  private async checkLibSecret(): Promise<boolean> {
    try {
      // Check for secret-tool (part of libsecret)
      await execAsync('command -v secret-tool >/dev/null 2>&1');
      return true;
    } catch (error) {
      // Fallback: check for libsecret-tools package
      try {
        await execAsync('dpkg -l | grep libsecret-tools >/dev/null 2>&1');
        return true;
      } catch {
        // Check for other package managers
        try {
          await execAsync('rpm -qa | grep libsecret >/dev/null 2>&1');
          return true;
        } catch {
          return false;
        }
      }
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