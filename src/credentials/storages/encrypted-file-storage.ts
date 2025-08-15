// Encrypted file credential storage implementation (fallback)

import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { CredentialStorage, CredentialData, CredentialError, Platform } from '../types';

interface EncryptedCredential {
  service: string;
  account: string;
  encryptedData: string;
  salt: string;
  iv: string;
  description?: string;
  timestamp: number;
}

interface CredentialFile {
  version: string;
  credentials: EncryptedCredential[];
  masterHash: string;
}

export class EncryptedFileStorage implements CredentialStorage {
  private readonly storageDirectory: string;
  private readonly credentialFile: string;
  private encryptionKey: string | null = null;

  constructor(options?: { storageDirectory?: string; encryptionKey?: string }) {
    this.storageDirectory = options?.storageDirectory || 
      join(homedir(), '.claudette', 'credentials');
    this.credentialFile = join(this.storageDirectory, 'credentials.enc');
    this.encryptionKey = options?.encryptionKey || null;
  }

  getStorageName(): string {
    return 'Encrypted File Storage';
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.ensureStorageDirectory();
      return true;
    } catch {
      return false;
    }
  }

  async store(credential: CredentialData): Promise<void> {
    const key = await this.getEncryptionKey();
    const credentialFile = await this.loadCredentialFile();
    
    // Remove existing credential for same service/account
    const existingIndex = credentialFile.credentials.findIndex(
      c => c.service === credential.service && 
           c.account === (credential.account || 'default')
    );
    
    if (existingIndex >= 0) {
      credentialFile.credentials.splice(existingIndex, 1);
    }

    // Encrypt new credential
    const salt = randomBytes(32);
    const iv = randomBytes(16);
    const derivedKey = pbkdf2Sync(key, salt, 100000, 32, 'sha256');
    
    const cipher = createCipheriv('aes-256-cbc', derivedKey, iv);
    let encrypted = cipher.update(credential.key, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Add encrypted credential
    credentialFile.credentials.push({
      service: credential.service,
      account: credential.account || 'default',
      encryptedData: encrypted,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      description: credential.description,
      timestamp: Date.now()
    });

    await this.saveCredentialFile(credentialFile);
  }

  async retrieve(service: string, account?: string): Promise<string | null> {
    try {
      const key = await this.getEncryptionKey();
      const credentialFile = await this.loadCredentialFile();
      
      const accountName = account || 'default';
      const credential = credentialFile.credentials.find(
        c => c.service === service && c.account === accountName
      );
      
      if (!credential) {
        return null;
      }

      // Decrypt credential
      const salt = Buffer.from(credential.salt, 'hex');
      const iv = Buffer.from(credential.iv, 'hex');
      const derivedKey = pbkdf2Sync(key, salt, 100000, 32, 'sha256');
      
      const decipher = createDecipheriv('aes-256-cbc', derivedKey, iv);
      let decrypted = decipher.update(credential.encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw new CredentialError(
        `Failed to retrieve credential from encrypted file: ${error.message}`,
        this.getCurrentPlatform(),
        'encrypted-file',
        true
      );
    }
  }

  async delete(service: string, account?: string): Promise<boolean> {
    try {
      const credentialFile = await this.loadCredentialFile();
      const accountName = account || 'default';
      
      const initialLength = credentialFile.credentials.length;
      credentialFile.credentials = credentialFile.credentials.filter(
        c => !(c.service === service && c.account === accountName)
      );
      
      if (credentialFile.credentials.length < initialLength) {
        await this.saveCredentialFile(credentialFile);
        return true;
      }
      
      return false;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw new CredentialError(
        `Failed to delete credential from encrypted file: ${error.message}`,
        this.getCurrentPlatform(),
        'encrypted-file',
        true
      );
    }
  }

  async exists(service: string, account?: string): Promise<boolean> {
    const credential = await this.retrieve(service, account);
    return credential !== null;
  }

  async listServices(): Promise<string[]> {
    try {
      const credentialFile = await this.loadCredentialFile();
      const services = [...new Set(credentialFile.credentials.map(c => c.service))];
      return services;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw new CredentialError(
        `Failed to list services from encrypted file: ${error.message}`,
        this.getCurrentPlatform(),
        'encrypted-file',
        true
      );
    }
  }

  /**
   * Set custom encryption key
   */
  setEncryptionKey(key: string): void {
    this.encryptionKey = key;
  }

  /**
   * Clear all stored credentials (for security)
   */
  async clearAll(): Promise<void> {
    try {
      await fs.unlink(this.credentialFile);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw new CredentialError(
          `Failed to clear credential file: ${error.message}`,
          this.getCurrentPlatform(),
          'encrypted-file',
          true
        );
      }
    }
  }

  /**
   * Get file storage info
   */
  async getStorageInfo(): Promise<{
    location: string;
    credentialCount: number;
    lastModified?: Date;
  }> {
    try {
      const stats = await fs.stat(this.credentialFile);
      const credentialFile = await this.loadCredentialFile();
      
      return {
        location: this.credentialFile,
        credentialCount: credentialFile.credentials.length,
        lastModified: stats.mtime
      };
    } catch (error: any) {
      return {
        location: this.credentialFile,
        credentialCount: 0
      };
    }
  }

  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.storageDirectory, { recursive: true, mode: 0o700 });
    } catch (error: any) {
      throw new CredentialError(
        `Failed to create storage directory: ${error.message}`,
        this.getCurrentPlatform(),
        'encrypted-file',
        false
      );
    }
  }

  private async loadCredentialFile(): Promise<CredentialFile> {
    try {
      const data = await fs.readFile(this.credentialFile, 'utf8');
      const parsed = JSON.parse(data) as CredentialFile;
      
      // Validate file structure
      if (!parsed.version || !Array.isArray(parsed.credentials)) {
        throw new Error('Invalid credential file format');
      }
      
      return parsed;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Create new file
        return {
          version: '1.0.0',
          credentials: [],
          masterHash: ''
        };
      }
      throw error;
    }
  }

  private async saveCredentialFile(credentialFile: CredentialFile): Promise<void> {
    await this.ensureStorageDirectory();
    
    // Generate master hash for integrity checking
    credentialFile.masterHash = this.generateFileHash(credentialFile);
    
    const data = JSON.stringify(credentialFile, null, 2);
    
    // Write to temp file first, then move (atomic operation)
    const tempFile = `${this.credentialFile}.tmp`;
    try {
      await fs.writeFile(tempFile, data, { mode: 0o600 });
      await fs.rename(tempFile, this.credentialFile);
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempFile);
      } catch {}
      throw error;
    }
  }

  private async getEncryptionKey(): Promise<string> {
    if (this.encryptionKey) {
      return this.encryptionKey;
    }

    // Generate key from system info (not ideal but better than hardcoded)
    const systemInfo = [
      process.platform,
      homedir(),
      process.arch,
      'claudette-credentials'
    ].join('|');

    // Use PBKDF2 to derive key
    const salt = Buffer.from('claudette-salt-2024', 'utf8');
    const key = pbkdf2Sync(systemInfo, salt, 100000, 32, 'sha256');
    
    return key.toString('hex');
  }

  private generateFileHash(credentialFile: CredentialFile): string {
    const content = credentialFile.credentials
      .map(c => `${c.service}:${c.account}:${c.timestamp}`)
      .sort()
      .join('|');
    
    return Buffer.from(content).toString('base64');
  }

  private getCurrentPlatform(): Platform {
    switch (process.platform) {
      case 'darwin': return Platform.MACOS;
      case 'win32': return Platform.WINDOWS;
      case 'linux': return Platform.LINUX;
      default: return Platform.OTHER;
    }
  }
}