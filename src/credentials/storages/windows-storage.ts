// Windows Credential Manager storage implementation

import { exec } from 'child_process';
import { promisify } from 'util';
import { CredentialStorage, CredentialData, CredentialError, Platform } from '../types';

const execAsync = promisify(exec);

export class WindowsCredentialStorage implements CredentialStorage {
  private readonly targetPrefix = 'claudette_credentials';

  getStorageName(): string {
    return 'Windows Credential Manager';
  }

  async isAvailable(): Promise<boolean> {
    if (process.platform !== 'win32') {
      return false;
    }

    try {
      await execAsync('cmdkey /list >nul 2>nul');
      return true;
    } catch {
      return false;
    }
  }

  async store(credential: CredentialData): Promise<void> {
    if (!await this.isAvailable()) {
      throw new CredentialError(
        'Windows Credential Manager not available',
        Platform.WINDOWS,
        'windows-credential-manager',
        false
      );
    }

    const targetName = this.getTargetName(credential.service, credential.account);
    const userName = credential.account || 'claudette';

    try {
      // Remove existing credential if it exists
      await this.delete(credential.service, credential.account);

      // Add new credential using cmdkey
      const cmd = `cmdkey /generic:"${targetName}" /user:"${userName}" /pass:"${credential.key}"`;
      await execAsync(cmd);
    } catch (error: any) {
      throw new CredentialError(
        `Failed to store credential in Windows Credential Manager: ${error.message}`,
        Platform.WINDOWS,
        'windows-credential-manager',
        true
      );
    }
  }

  async retrieve(service: string, account?: string): Promise<string | null> {
    if (!await this.isAvailable()) {
      return null;
    }

    const targetName = this.getTargetName(service, account);

    try {
      // Use PowerShell to read credential since cmdkey doesn't support reading passwords
      const psScript = `
        try {
          $cred = Get-StoredCredential -Target "${targetName}" -ErrorAction Stop
          Write-Output $cred.GetNetworkCredential().Password
        } catch {
          # Fallback to Windows API
          Add-Type -AssemblyName System.Security
          $target = "${targetName}"
          $cred = [System.Security.Cryptography.ProtectedData]::Unprotect(
            [System.Convert]::FromBase64String($env:TEMP), 
            $null, 
            [System.Security.Cryptography.DataProtectionScope]::CurrentUser
          )
          # This is a simplified fallback - actual implementation would need Windows API calls
          throw "Credential not found"
        }
      `;

      // Try PowerShell approach first
      try {
        const { stdout } = await execAsync(`powershell -Command "${psScript}"`);
        const password = stdout.trim();
        return password || null;
      } catch {
        // Fallback to cmdkey list parsing (less secure but more compatible)
        return await this.retrieveFromCmdKeyList(targetName);
      }
    } catch (error: any) {
      if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
        return null;
      }
      throw new CredentialError(
        `Failed to retrieve credential from Windows Credential Manager: ${error.message}`,
        Platform.WINDOWS,
        'windows-credential-manager',
        true
      );
    }
  }

  private async retrieveFromCmdKeyList(targetName: string): Promise<string | null> {
    try {
      const { stdout } = await execAsync('cmdkey /list');
      const lines = stdout.split('\n');
      
      let foundTarget = false;
      for (const line of lines) {
        if (line.includes(targetName)) {
          foundTarget = true;
        }
        // Note: cmdkey /list doesn't show passwords for security reasons
        // This is a limitation - we'd need to use Windows API for full functionality
      }
      
      if (foundTarget) {
        // In a real implementation, we'd need to use Windows Credential API
        // For now, return a placeholder to indicate the credential exists
        // but cannot be retrieved via cmdkey
        throw new CredentialError(
          'Credential found but cannot retrieve password via cmdkey - use Windows API',
          Platform.WINDOWS,
          'windows-credential-manager',
          false
        );
      }
      
      return null;
    } catch {
      return null;
    }
  }

  async delete(service: string, account?: string): Promise<boolean> {
    if (!await this.isAvailable()) {
      return false;
    }

    const targetName = this.getTargetName(service, account);

    try {
      const cmd = `cmdkey /delete:"${targetName}"`;
      await execAsync(cmd);
      return true;
    } catch (error: any) {
      // Not found is not an error for deletion
      if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
        return false;
      }
      throw new CredentialError(
        `Failed to delete credential from Windows Credential Manager: ${error.message}`,
        Platform.WINDOWS,
        'windows-credential-manager',
        true
      );
    }
  }

  async exists(service: string, account?: string): Promise<boolean> {
    if (!await this.isAvailable()) {
      return false;
    }

    const targetName = this.getTargetName(service, account);

    try {
      const { stdout } = await execAsync('cmdkey /list');
      return stdout.includes(targetName);
    } catch {
      return false;
    }
  }

  async listServices(): Promise<string[]> {
    if (!await this.isAvailable()) {
      return [];
    }

    try {
      const { stdout } = await execAsync('cmdkey /list');
      const lines = stdout.split('\n');
      const services: string[] = [];

      for (const line of lines) {
        if (line.includes(this.targetPrefix)) {
          // Extract service name from target
          const match = line.match(new RegExp(`${this.targetPrefix}_(.+?)(?:_|$)`));
          if (match && match[1]) {
            services.push(match[1]);
          }
        }
      }

      return [...new Set(services)]; // Remove duplicates
    } catch {
      return [];
    }
  }

  private getTargetName(service: string, account?: string): string {
    const accountSuffix = account ? `_${account}` : '';
    return `${this.targetPrefix}_${service}${accountSuffix}`;
  }
}