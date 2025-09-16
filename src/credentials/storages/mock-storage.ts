// Mock storage implementation for testing and fallback
import { CredentialStorage, StoredCredential, CredentialMetadata } from '../types';

export class MockStorage implements CredentialStorage {
  private credentials: Map<string, StoredCredential> = new Map();
  private available: boolean = true;

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  async store(credential: StoredCredential): Promise<void> {
    const key = this.getKey(credential.service, credential.account);
    this.credentials.set(key, { ...credential });
  }

  async retrieve(service: string, account?: string): Promise<string | null> {
    const key = this.getKey(service, account);
    const credential = this.credentials.get(key);
    return credential ? credential.key : null;
  }

  async delete(service: string, account?: string): Promise<boolean> {
    const key = this.getKey(service, account);
    return this.credentials.delete(key);
  }

  async exists(service: string, account?: string): Promise<boolean> {
    const key = this.getKey(service, account);
    return this.credentials.has(key);
  }

  async listServices(): Promise<string[]> {
    const services = new Set<string>();
    for (const [key] of this.credentials.entries()) {
      const service = key.split(':')[0];
      services.add(service);
    }
    return Array.from(services);
  }

  getStorageName(): string {
    return 'mock';
  }

  private getKey(service: string, account?: string): string {
    return account ? `${service}:${account}` : service;
  }

  // Mock-specific methods
  setAvailable(available: boolean): void {
    this.available = available;
  }

  clear(): void {
    this.credentials.clear();
  }

  size(): number {
    return this.credentials.size;
  }
}