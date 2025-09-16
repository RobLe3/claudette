// Universal credential manager with platform abstraction

import { PlatformDetector } from './platform-detector';
// Import storage with fallbacks for platform compatibility  
import { MockStorage } from './storages/mock-storage';

// Platform-specific imports with fallbacks
let KeychainStorage: any;
let WindowsCredentialStorage: any;
let LibSecretStorage: any;
let EncryptedFileStorage: any;

try {
  KeychainStorage = require('./storages/keychain-storage').KeychainStorage;
} catch (e) {
  console.warn('Keychain storage not available, using mock storage');
  KeychainStorage = MockStorage;
}

try {
  WindowsCredentialStorage = require('./storages/windows-storage').WindowsCredentialStorage;
} catch (e) {
  console.warn('Windows storage not available, using mock storage');
  WindowsCredentialStorage = MockStorage;
}

try {
  LibSecretStorage = require('./storages/libsecret-storage').LibSecretStorage;
} catch (e) {
  console.warn('LibSecret storage not available, using mock storage');
  LibSecretStorage = MockStorage;
}

try {
  EncryptedFileStorage = require('./storages/encrypted-file-storage').EncryptedFileStorage;
} catch (e) {
  console.warn('Encrypted file storage not available, using mock storage');
  EncryptedFileStorage = MockStorage;
}
import { 
  CredentialStorage, 
  CredentialData, 
  CredentialError, 
  Platform,
  CredentialManagerOptions 
} from './types';

export class UniversalCredentialManager {
  private primaryStorage: CredentialStorage | null = null;
  private fallbackStorage: InstanceType<typeof EncryptedFileStorage>;
  private platformDetector: PlatformDetector;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;
  private storageAvailabilityCache = new Map<string, { available: boolean; expiry: number }>();
  private readonly STORAGE_CACHE_TTL = 30 * 1000; // 30 seconds cache for storage availability (reduced from 2 minutes to prevent startup delays)

  constructor(private options: CredentialManagerOptions = {}) {
    this.platformDetector = PlatformDetector.getInstance();
    this.fallbackStorage = new EncryptedFileStorage({
      storageDirectory: options.storageDirectory,
      encryptionKey: options.encryptionKey
    });
  }

  /**
   * Initialize the credential manager with async queue and storage caching
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // If initialization is already in progress, wait for it
    if (this.initializationPromise) {
      return await this.initializationPromise;
    }

    // Start new initialization
    this.initializationPromise = this.performInitialization();
    
    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  /**
   * Perform actual initialization with parallel storage checks
   */
  private async performInitialization(): Promise<void> {
    const platformInfo = await this.platformDetector.detectPlatform();
    const storageOptions = await this.platformDetector.getRecommendedStorage();

    // Check all storage options in parallel instead of sequentially
    const storagePromises = storageOptions.map(async (storageType) => {
      try {
        const storage = this.createStorage(storageType);
        if (!storage) return { storageType, storage: null, available: false };

        // Check cache first
        const cached = this.getStorageAvailabilityFromCache(storageType);
        if (cached !== null) {
          return { storageType, storage, available: cached };
        }

        // Check availability with timeout
        const isAvailable = await Promise.race([
          storage.isAvailable(),
          new Promise<boolean>((_, reject) => 
            setTimeout(() => reject(new Error('Storage check timeout')), 1000)
          )
        ]);

        // Cache the result
        this.cacheStorageAvailability(storageType, isAvailable);
        return { storageType, storage, available: isAvailable };
      } catch (error) {
        this.cacheStorageAvailability(storageType, false);
        return { storageType, storage: null, available: false };
      }
    });

    const storageResults = await Promise.all(storagePromises);

    // Select the first available primary storage
    for (const result of storageResults) {
      if (result.available && result.storage) {
        this.primaryStorage = result.storage;
        break;
      }
    }

    // Check fallback storage availability with caching
    let hasFallbackStorage = false;
    if (this.options.fallbackToFile !== false) {
      const cached = this.getStorageAvailabilityFromCache('encrypted-file');
      if (cached !== null) {
        hasFallbackStorage = cached;
      } else {
        try {
          hasFallbackStorage = await Promise.race([
            this.fallbackStorage.isAvailable(),
            new Promise<boolean>((_, reject) => 
              setTimeout(() => reject(new Error('Fallback storage timeout')), 1000)
            )
          ]);
          this.cacheStorageAvailability('encrypted-file', hasFallbackStorage);
        } catch (error) {
          hasFallbackStorage = false;
          this.cacheStorageAvailability('encrypted-file', false);
        }
      }
    }

    const hasPrimaryStorage = this.primaryStorage !== null;
    
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
   * Get storage availability from cache if still valid
   */
  private getStorageAvailabilityFromCache(storageType: string): boolean | null {
    const cached = this.storageAvailabilityCache.get(storageType);
    if (cached && Date.now() < cached.expiry) {
      return cached.available;
    }
    return null;
  }

  /**
   * Cache storage availability result
   */
  private cacheStorageAvailability(storageType: string, available: boolean): void {
    this.storageAvailabilityCache.set(storageType, {
      available,
      expiry: Date.now() + this.STORAGE_CACHE_TTL
    });
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
        fallbackServices.forEach((service: string) => services.add(service));
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