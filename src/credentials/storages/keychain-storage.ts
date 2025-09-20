// macOS Keychain credential storage implementation

import { exec } from 'child_process';
import { promisify } from 'util';
import { CredentialStorage, CredentialData, CredentialError, Platform } from '../types';

const execAsync = promisify(exec);

export class KeychainStorage implements CredentialStorage {
  private readonly serviceDomain = 'com.claudette.credentials';

  getStorageName(): string {
    return 'macOS Keychain';
  }

  async isAvailable(): Promise<boolean> {
    if (process.platform !== 'darwin') {
      return false;
    }

    try {
      await execAsync('security -h');
      return true;
    } catch {
      return false;
    }
  }

  async store(credential: CredentialData): Promise<void> {
    if (!await this.isAvailable()) {
      throw new CredentialError(
        'macOS Keychain not available',
        Platform.MACOS,
        'keychain',
        false
      );
    }

    const serviceName = this.getServiceName(credential.service);
    const account = credential.account || 'default';

    try {
      // Remove existing credential if it exists
      await this.delete(credential.service, credential.account);

      // Add new credential
      const cmd = [
        'security', 'add-generic-password',
        '-s', `"${serviceName}"`,
        '-a', `"${account}"`,
        '-w', `"${credential.key}"`,
        '-D', `"${credential.description || 'Claudette API Key'}"`
      ].join(' ');

      await execAsync(cmd);
    } catch (error: any) {
      throw new CredentialError(
        `Failed to store credential in Keychain: ${error.message}`,
        Platform.MACOS,
        'keychain',
        true
      );
    }
  }

  async retrieve(service: string, account?: string): Promise<string | null> {
    if (!await this.isAvailable()) {
      return null;
    }

    const serviceName = this.getServiceName(service);
    const accountName = account || 'default';

    try {
      const cmd = [
        'security', 'find-generic-password',
        '-s', `"${serviceName}"`,
        '-a', `"${accountName}"`,
        '-w'
      ].join(' ');

      const { stdout } = await execAsync(cmd);
      return stdout.trim() || null;
    } catch (error: any) {
      // Not found is not an error, return null
      if (error.message?.includes('could not be found')) {
        return null;
      }
      throw new CredentialError(
        `Failed to retrieve credential from Keychain: ${error.message}`,
        Platform.MACOS,
        'keychain',
        true
      );
    }
  }

  async delete(service: string, account?: string): Promise<boolean> {
    if (!await this.isAvailable()) {
      return false;
    }

    const serviceName = this.getServiceName(service);
    const accountName = account || 'default';

    try {
      const cmd = [
        'security', 'delete-generic-password',
        '-s', `"${serviceName}"`,
        '-a', `"${accountName}"`
      ].join(' ');

      await execAsync(cmd);
      return true;
    } catch (error: any) {
      // Not found is not an error for deletion
      if (error.message?.includes('could not be found')) {
        return false;
      }
      throw new CredentialError(
        `Failed to delete credential from Keychain: ${error.message}`,
        Platform.MACOS,
        'keychain',
        true
      );
    }
  }

  async exists(service: string, account?: string): Promise<boolean> {
    const credential = await this.retrieve(service, account);
    return credential !== null;
  }

  async listServices(): Promise<string[]> {
    if (!await this.isAvailable()) {
      return [];
    }

    try {
      const cmd = [
        'security', 'dump-keychain',
        '| grep', `"${this.serviceDomain}"`,
        '| sed', `'s/.*"${this.serviceDomain}\\.//'`,
        '| sed', "'s/\".*//'",
        '| sort -u'
      ].join(' ');

      const { stdout } = await execAsync(cmd);
      return stdout.trim().split('\n').filter(Boolean);
    } catch {
      // If dump fails, try alternative approach
      return this.listServicesAlternative();
    }
  }

  private async listServicesAlternative(): Promise<string[]> {
    // Common service names to check for
    const commonServices = [
      'openai-api-key',
      'claude-api-key', 
      'anthropic-api-key',
      'qwen-api-key',
      'codellm-api-key'
    ];

    const services: string[] = [];
    for (const service of commonServices) {
      if (await this.exists(service)) {
        services.push(service);
      }
    }

    return services;
  }

  private getServiceName(service: string): string {
    return `${this.serviceDomain}.${service}`;
  }
}