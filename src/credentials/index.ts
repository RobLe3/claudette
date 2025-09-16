// Credential management system exports

export * from './types';
export * from './platform-detector';
export * from './credential-manager';

// Storage implementations
export { KeychainStorage } from './storages/keychain-storage';
export { WindowsCredentialStorage } from './storages/windows-storage';
export { LibSecretStorage } from './storages/libsecret-storage';
export { EncryptedFileStorage } from './storages/encrypted-file-storage';

// Convenience functions
export { getCredentialManager, resetCredentialManager } from './credential-manager';