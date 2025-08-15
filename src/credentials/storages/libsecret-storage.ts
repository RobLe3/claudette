// Linux libsecret credential storage implementation

import { exec } from 'child_process';
import { promisify } from 'util';
import { CredentialStorage, CredentialData, CredentialError, Platform } from '../types';

const execAsync = promisify(exec);

export class LibSecretStorage implements CredentialStorage {
  private readonly schema = 'com.claudette.credentials';

  getStorageName(): string {
    return 'Linux libsecret (GNOME Keyring)';
  }

  async isAvailable(): Promise<boolean> {
    if (process.platform !== 'linux') {
      return false;
    }

    try {
      await execAsync('command -v secret-tool >/dev/null 2>&1');
      return true;
    } catch {
      return false;
    }
  }

  async store(credential: CredentialData): Promise<void> {
    if (!await this.isAvailable()) {
      throw new CredentialError(
        'libsecret (secret-tool) not available',
        Platform.LINUX,
        'libsecret',
        false
      );
    }

    const account = credential.account || 'default';
    const description = credential.description || `Claudette ${credential.service} API Key`;

    try {
      // Store credential using secret-tool
      const cmd = [
        'secret-tool', 'store',
        '--label', `"${description}"`,
        'schema', this.schema,
        'service', credential.service,
        'account', account
      ].join(' ');

      // secret-tool expects password via stdin
      const process = exec(cmd);
      process.stdin?.write(credential.key);
      process.stdin?.end();

      await new Promise((resolve, reject) => {
        process.on('exit', (code) => {
          if (code === 0) {
            resolve(void 0);
          } else {
            reject(new Error(`secret-tool exited with code ${code}`));
          }
        });
        process.on('error', reject);
      });
    } catch (error: any) {
      throw new CredentialError(
        `Failed to store credential in libsecret: ${error.message}`,
        Platform.LINUX,
        'libsecret',
        true
      );
    }
  }

  async retrieve(service: string, account?: string): Promise<string | null> {
    if (!await this.isAvailable()) {
      return null;
    }

    const accountName = account || 'default';

    try {
      const cmd = [
        'secret-tool', 'lookup',
        'schema', this.schema,
        'service', service,
        'account', accountName
      ].join(' ');

      const { stdout } = await execAsync(cmd);
      return stdout.trim() || null;
    } catch (error: any) {
      // Check if it's just not found
      if (error.message?.includes('No such secret') || 
          error.message?.includes('not found') ||
          error.code === 1) {
        return null;
      }
      throw new CredentialError(
        `Failed to retrieve credential from libsecret: ${error.message}`,
        Platform.LINUX,
        'libsecret',
        true
      );
    }
  }

  async delete(service: string, account?: string): Promise<boolean> {
    if (!await this.isAvailable()) {
      return false;
    }

    const accountName = account || 'default';

    try {
      const cmd = [
        'secret-tool', 'clear',
        'schema', this.schema,
        'service', service,
        'account', accountName
      ].join(' ');

      await execAsync(cmd);
      return true;
    } catch (error: any) {
      // Check if it's just not found
      if (error.message?.includes('No such secret') || 
          error.message?.includes('not found') ||
          error.code === 1) {
        return false;
      }
      throw new CredentialError(
        `Failed to delete credential from libsecret: ${error.message}`,
        Platform.LINUX,
        'libsecret',
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
      // Use secret-tool search to find all our credentials
      const cmd = [
        'secret-tool', 'search',
        'schema', this.schema
      ].join(' ');

      const { stdout } = await execAsync(cmd);
      const lines = stdout.split('\n');
      const services = new Set<string>();

      for (const line of lines) {
        const match = line.match(/^service = (.+)$/);
        if (match && match[1]) {
          services.add(match[1]);
        }
      }

      return Array.from(services);
    } catch (error: any) {
      // If search fails, try common services individually
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
}