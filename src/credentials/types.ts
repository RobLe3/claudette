// Cross-platform credential storage types

export interface CredentialData {
  key: string;
  service: string;
  account?: string;
  description?: string;
}

export interface CredentialStorage {
  /**
   * Store a credential securely
   */
  store(credential: CredentialData): Promise<void>;
  
  /**
   * Retrieve a credential
   */
  retrieve(service: string, account?: string): Promise<string | null>;
  
  /**
   * Delete a credential
   */
  delete(service: string, account?: string): Promise<boolean>;
  
  /**
   * Check if credential exists
   */
  exists(service: string, account?: string): Promise<boolean>;
  
  /**
   * List all services with stored credentials
   */
  listServices(): Promise<string[]>;
  
  /**
   * Test if the storage system is available
   */
  isAvailable(): Promise<boolean>;
  
  /**
   * Get the name of this storage system
   */
  getStorageName(): string;
}

export interface StoredCredential {
  service: string;
  account?: string;
  key: string;
  metadata?: CredentialMetadata;
  created?: Date;
  accessed?: Date;
}

export interface CredentialMetadata {
  created: Date;
  accessed: Date;
  description?: string;
  tags?: string[];
}

export enum Platform {
  MACOS = 'darwin',
  WINDOWS = 'win32',
  LINUX = 'linux',
  OTHER = 'other'
}

export interface PlatformInfo {
  platform: Platform;
  arch: string;
  version: string;
  hasKeychainAccess?: boolean;
  hasCredentialManager?: boolean;
  hasLibSecret?: boolean;
}

export interface CredentialManagerOptions {
  fallbackToFile?: boolean;
  encryptionKey?: string;
  storageDirectory?: string;
}

export class CredentialError extends Error {
  constructor(
    message: string,
    public platform: Platform,
    public storageType: string,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'CredentialError';
  }
}