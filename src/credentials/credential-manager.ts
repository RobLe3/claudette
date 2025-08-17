// Universal credential manager with platform abstraction

import { PlatformDetector } from './platform-detector';
import { KeychainStorage } from './storages/keychain-storage';
import { WindowsCredentialStorage } from './storages/windows-storage';
import { LibSecretStorage } from './storages/libsecret-storage';
import { EncryptedFileStorage } from './storages/encrypted-file-storage';
import { 
  CredentialStorage, 
  CredentialData, 
  CredentialError, 
  Platform,
  CredentialManagerOptions 
} from './types';

export class UniversalCredentialManager {
  private primaryStorage: CredentialStorage | null = null;
  private fallbackStorage: EncryptedFileStorage;
  private platformDetector: PlatformDetector;
  private initialized = false;

  constructor(private options: CredentialManagerOptions = {}) {
    this.platformDetector = PlatformDetector.getInstance();
    this.fallbackStorage = new EncryptedFileStorage({
      storageDirectory: options.storageDirectory,
      encryptionKey: options.encryptionKey
    });
  }

  /**
   * Initialize the credential manager with best available storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const platformInfo = await this.platformDetector.detectPlatform();
    const storageOptions = await this.platformDetector.getRecommendedStorage();

    // Try to initialize primary storage based on platform
    for (const storageType of storageOptions) {
      try {
        const storage = this.createStorage(storageType);
        if (storage && await storage.isAvailable()) {
          this.primaryStorage = storage;
          break;
        }
      } catch (error) {
        // Continue to next storage option
        continue;
      }
    }

    // Check if we have at least one working storage system
    const hasPrimaryStorage = this.primaryStorage !== null;
    const hasFallbackStorage = this.options.fallbackToFile !== false && 
                              await this.fallbackStorage.isAvailable();
    
    if (!hasPrimaryStorage && !hasFallbackStorage) {
      throw new CredentialError(
        'No credential storage systems available',
        platformInfo.platform,
        'none',
        false
      );
    }
    
    // If fallback is enabled but not available, log a warning
    if (this.options.fallbackToFile !== false && !hasFallbackStorage) {
      console.warn('Warning: Fallback file storage not available, using primary storage only');
    }

    this.initialized = true;
  }

  /**
   * Store a credential using the best available storage
   */
  async store(credential: CredentialData): Promise<void> {
    await this.initialize();

    const errors: Error[] = [];

    // Try primary storage first
    if (this.primaryStorage) {
      try {
        await this.primaryStorage.store(credential);
        return;
      } catch (error) {
        errors.push(error as Error);
      }
    }

    // Try fallback storage if available
    if (this.options.fallbackToFile !== false && await this.fallbackStorage.isAvailable()) {
      try {
        await this.fallbackStorage.store(credential);
        return;
      } catch (error) {
        errors.push(error as Error);
      }
    }

    // All storage methods failed
    const errorMessages = errors.map(e => e.message).join('; ');
    throw new CredentialError(
      `Failed to store credential: ${errorMessages}`,
      await this.getCurrentPlatform(),
      'all',
      true
    );
  }

  /**
   * Retrieve a credential from available storage
   */
  async retrieve(service: string, account?: string): Promise<string | null> {
    await this.initialize();

    // Try primary storage first
    if (this.primaryStorage) {
      try {
        const credential = await this.primaryStorage.retrieve(service, account);
        if (credential !== null) {
          return credential;
        }
      } catch (error) {
        // Log but continue to fallback
        console.warn(`Primary storage retrieval failed: ${(error as Error).message}`);
      }
    }

    // Try fallback storage if available
    if (this.options.fallbackToFile !== false && await this.fallbackStorage.isAvailable()) {
      try {
        return await this.fallbackStorage.retrieve(service, account);
      } catch (error) {
        console.warn(`Fallback storage retrieval failed: ${(error as Error).message}`);
      }
    }

    return null;
  }

  /**
   * Delete a credential from all storage systems
   */
  async delete(service: string, account?: string): Promise<boolean> {
    await this.initialize();

    let deleted = false;

    // Delete from primary storage
    if (this.primaryStorage) {
      try {
        const primaryDeleted = await this.primaryStorage.delete(service, account);
        deleted = deleted || primaryDeleted;
      } catch (error) {
        console.warn(`Primary storage deletion failed: ${(error as Error).message}`);
      }
    }

    // Delete from fallback storage if available
    if (this.options.fallbackToFile !== false && await this.fallbackStorage.isAvailable()) {
      try {
        const fallbackDeleted = await this.fallbackStorage.delete(service, account);
        deleted = deleted || fallbackDeleted;
      } catch (error) {
        console.warn(`Fallback storage deletion failed: ${(error as Error).message}`);
      }
    }

    return deleted;
  }

  /**
   * Check if a credential exists in any storage
   */
  async exists(service: string, account?: string): Promise<boolean> {
    await this.initialize();

    // Check primary storage first
    if (this.primaryStorage) {
      try {
        if (await this.primaryStorage.exists(service, account)) {
          return true;
        }
      } catch (error) {
        // Continue to fallback
      }
    }

    // Check fallback storage if available
    if (this.options.fallbackToFile !== false && await this.fallbackStorage.isAvailable()) {
      try {
        return await this.fallbackStorage.exists(service, account);
      } catch (error) {
        // Ignore errors in existence checking
      }
    }

    return false;
  }

  /**
   * List all services with stored credentials
   */
  async listServices(): Promise<string[]> {
    await this.initialize();

    const services = new Set<string>();

    // Get services from primary storage
    if (this.primaryStorage) {
      try {
        const primaryServices = await this.primaryStorage.listServices();
        primaryServices.forEach(service => services.add(service));
      } catch (error) {
        console.warn(`Primary storage service listing failed: ${(error as Error).message}`);
      }
    }

    // Get services from fallback storage if available
    if (this.options.fallbackToFile !== false && await this.fallbackStorage.isAvailable()) {
      try {
        const fallbackServices = await this.fallbackStorage.listServices();
        fallbackServices.forEach(service => services.add(service));
      } catch (error) {
        console.warn(`Fallback storage service listing failed: ${(error as Error).message}`);
      }
    }

    return Array.from(services).sort();
  }

  /**
   * Get status information about credential storage
   */
  async getStatus(): Promise<{
    platform: Platform;
    primaryStorage?: string;
    fallbackStorage?: string;
    availableStorages: string[];
    credentialCount: number;
    errors?: string[];
  }> {
    await this.initialize();

    const platform = await this.getCurrentPlatform();
    const availableStorages = await this.platformDetector.getRecommendedStorage();
    const credentialCount = (await this.listServices()).length;

    const status = {
      platform,
      availableStorages,
      credentialCount,
      primaryStorage: this.primaryStorage?.getStorageName(),
      fallbackStorage: (this.options.fallbackToFile !== false && await this.fallbackStorage.isAvailable()) ? 
        this.fallbackStorage.getStorageName() : undefined
    };

    return status;
  }

  /**
   * Migrate credentials between storage systems
   */
  async migrate(fromStorage: CredentialStorage, toStorage: CredentialStorage): Promise<{
    migrated: number;
    errors: string[];
  }> {
    const services = await fromStorage.listServices();
    const errors: string[] = [];
    let migrated = 0;

    for (const service of services) {
      try {
        // Get all accounts for this service (simplified approach)
        const credential = await fromStorage.retrieve(service);
        if (credential) {
          await toStorage.store({
            key: credential,
            service,
            description: `Migrated ${service} credential`
          });
          migrated++;
        }
      } catch (error) {
        errors.push(`Failed to migrate ${service}: ${(error as Error).message}`);
      }
    }

    return { migrated, errors };
  }

  /**
   * Test all available storage systems
   */
  async testStorage(): Promise<{
    storage: string;
    available: boolean;
    error?: string;
  }[]> {
    const storageOptions = await this.platformDetector.getRecommendedStorage();
    const results = [];

    for (const storageType of storageOptions) {
      try {
        const storage = this.createStorage(storageType);
        const available = storage ? await storage.isAvailable() : false;
        results.push({
          storage: storageType,
          available,
          error: available ? undefined : 'Not available'
        });
      } catch (error) {
        results.push({
          storage: storageType,
          available: false,
          error: (error as Error).message
        });
      }
    }

    return results;
  }

  /**
   * Set custom encryption key for fallback storage
   */
  setEncryptionKey(key: string): void {
    this.fallbackStorage.setEncryptionKey(key);
  }

  /**
   * Get detailed storage information
   */
  async getStorageInfo(): Promise<{
    primary?: any;
    fallback?: any;
  }> {
    const info: any = {};

    if (this.primaryStorage && 'getStorageInfo' in this.primaryStorage) {
      try {
        info.primary = await (this.primaryStorage as any).getStorageInfo();
      } catch {
        // Ignore
      }
    }

    if (this.options.fallbackToFile !== false && await this.fallbackStorage.isAvailable()) {
      try {
        info.fallback = await this.fallbackStorage.getStorageInfo();
      } catch {
        // Ignore
      }
    }

    return info;
  }

  private createStorage(storageType: string): CredentialStorage | null {
    switch (storageType) {
      case 'keychain':
        return new KeychainStorage();
      case 'windows-credential-manager':
        return new WindowsCredentialStorage();
      case 'libsecret':
        return new LibSecretStorage();
      case 'encrypted-file':
        return this.fallbackStorage;
      default:
        return null;
    }
  }

  private async getCurrentPlatform(): Promise<Platform> {
    const info = await this.platformDetector.detectPlatform();
    return info.platform;
  }
}

// Export singleton instance for convenience
let defaultManager: UniversalCredentialManager | null = null;

export function getCredentialManager(options?: CredentialManagerOptions): UniversalCredentialManager {
  if (!defaultManager) {
    defaultManager = new UniversalCredentialManager(options);
  }
  return defaultManager;
}

export function resetCredentialManager(): void {
  defaultManager = null;
}