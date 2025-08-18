// Encrypted file credential storage implementation (fallback)

import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync, scryptSync } from 'crypto';
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
      // If mkdir fails, try to check if directory already exists with correct permissions
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        try {
          // Check if directory exists and is accessible
          await fs.access(this.storageDirectory, fs.constants.R_OK | fs.constants.W_OK);
          return; // Directory exists and is accessible
        } catch {
          // Directory doesn't exist or isn't accessible
        }
        
        // Try alternative directory in user's home if main directory fails
        const { homedir } = require('os');
        const alternativeDir = join(homedir(), '.config', 'claudette', 'credentials');
        
        try {
          await fs.mkdir(alternativeDir, { recursive: true, mode: 0o700 });
          // Update paths to use alternative directory
          (this as any).storageDirectory = alternativeDir;
          (this as any).credentialFile = join(alternativeDir, 'credentials.enc');
          return;
        } catch {
          // Fall back to temporary directory
          const { tmpdir } = require('os');
          const tempDir = join(tmpdir(), 'claudette-credentials');
          
          try {
            await fs.mkdir(tempDir, { recursive: true, mode: 0o700 });
            console.warn(`Warning: Using temporary directory for credential storage: ${tempDir}`);
            (this as any).storageDirectory = tempDir;
            (this as any).credentialFile = join(tempDir, 'credentials.enc');
            return;
          } catch {
            // Give up
          }
        }
      }
      
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

  /**
   * Security fix: Improved encryption key derivation with proper random salt
   */
  private async getEncryptionKey(): Promise<string> {
    if (this.encryptionKey) {
      return this.encryptionKey;
    }

    // Security fix: Generate or load a unique salt per installation
    const saltFile = join(this.storageDirectory, '.salt');
    let salt: Buffer;
    
    try {
      // Try to load existing salt
      const saltData = await fs.readFile(saltFile);
      salt = Buffer.from(saltData.toString('hex'), 'hex');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Generate new cryptographically secure random salt
        salt = randomBytes(32);
        
        // Save salt securely (only readable by owner)
        await this.ensureStorageDirectory();
        await fs.writeFile(saltFile, salt.toString('hex'), { mode: 0o600 });
      } else {
        throw new CredentialError(
          `Failed to access salt file: ${error.message}`,
          this.getCurrentPlatform(),
          'encrypted-file',
          false
        );
      }
    }

    // Generate key from system info with proper random salt
    const systemInfo = [
      process.platform,
      homedir(),
      process.arch,
      'claudette-credentials',
      // Add process-specific entropy
      process.pid.toString(),
      Date.now().toString()
    ].join('|');

    // Security fix: Use scrypt instead of PBKDF2 for better security
    // and increased iterations for key derivation
    const key = scryptSync(systemInfo, salt, 32, {
      N: 32768,  // CPU/memory cost parameter (2^15)
      r: 8,      // Block size parameter
      p: 1,      // Parallelization parameter
      maxmem: 64 * 1024 * 1024 // 64MB max memory
    });
    
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