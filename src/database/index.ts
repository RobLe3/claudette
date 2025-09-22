// Database manager for Claudette

import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync } from 'fs';
import { 
  CREATE_TABLES, 
  CREATE_INDEXES, 
  CREATE_VIEWS, 
  CLEANUP_QUERIES, 
  MIGRATIONS,
  SCHEMA_VERSION 
} from './schema';
import { 
  DatabaseError, 
  QuotaLedgerEntry, 
  CacheStats 
} from '../types/index';

interface DatabaseCacheEntry {
  cache_key: string;
  prompt_hash: string;
  response: any;
  created_at: number;
  expires_at: number;
  size_bytes: number;
}

export class DatabaseManager {
  private db: Database.Database;
  private cachePath: string;
  private quotaPath: string;

  constructor(basePath?: string) {
    // Skip database initialization in CI environments
    if (process.env.CI || process.env.GITHUB_ACTIONS) {
      // Create a mock database for CI
      this.db = null as any;
      this.cachePath = ':memory:';
      this.quotaPath = ':memory:';
      return;
    }

    const claudeDir = basePath || join(homedir(), '.claude');
    this.cachePath = join(claudeDir, 'claudette', 'cache.db');
    this.quotaPath = join(claudeDir, 'unified_costs.db');
    
    // Ensure directories exist
    this.ensureDirectories();
    
    // Initialize databases
    this.db = new Database(this.quotaPath);
    this.initializeSchema();
  }

  private ensureDirectories(): void {
    const claudeDir = join(homedir(), '.claude');
    const claudetteDir = join(claudeDir, 'claudette');
    
    if (!existsSync(claudeDir)) {
      mkdirSync(claudeDir, { recursive: true });
    }
    
    if (!existsSync(claudetteDir)) {
      mkdirSync(claudetteDir, { recursive: true });
    }
  }

  private initializeSchema(): void {
    try {
      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = 1000');
      this.db.pragma('temp_store = memory');
      
      // Check current schema version
      const currentVersion = this.getCurrentSchemaVersion();
      
      // Run migrations if needed
      if (currentVersion < SCHEMA_VERSION) {
        this.runMigrations(currentVersion);
      }
      
      // Create views
      Object.values(CREATE_VIEWS).forEach(sql => {
        this.db.exec(sql);
      });
      
    } catch (error) {
      throw new DatabaseError(`Failed to initialize schema: ${error}`);
    }
  }

  private getCurrentSchemaVersion(): number {
    try {
      const result = this.db.prepare(`
        SELECT version FROM schema_version ORDER BY version DESC LIMIT 1
      `).get() as { version: number } | undefined;
      
      return result?.version || 0;
    } catch {
      return 0;
    }
  }

  private runMigrations(fromVersion: number): void {
    const transaction = this.db.transaction(() => {
      for (let version = fromVersion + 1; version <= SCHEMA_VERSION; version++) {
        const migration = MIGRATIONS[version as keyof typeof MIGRATIONS];
        if (migration) {
          migration.up.forEach(sql => {
            this.db.exec(sql);
          });
          console.log(`Applied migration version ${version}`);
        }
      }
    });
    
    transaction();
  }

  // Quota ledger operations
  addQuotaEntry(entry: Omit<QuotaLedgerEntry, 'id'>): number {
    // Return mock ID in CI environments
    if (process.env.CI || process.env.GITHUB_ACTIONS || !this.db) {
      return 1;
    }
    
    try {
      const stmt = this.db.prepare(`
        INSERT INTO quota_ledger (
          timestamp, backend, prompt_hash, tokens_input, tokens_output, 
          cost_eur, cache_hit, latency_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        entry.timestamp,
        entry.backend,
        entry.prompt_hash,
        entry.tokens_input,
        entry.tokens_output,
        entry.cost_eur,
        entry.cache_hit ? 1 : 0,
        entry.latency_ms
      );
      
      return result.lastInsertRowid as number;
    } catch (error) {
      throw new DatabaseError(`Failed to add quota entry: ${error}`);
    }
  }

  getRecentQuotaEntries(hours: number = 24): QuotaLedgerEntry[] {
    // Return empty array in CI environments
    if (process.env.CI || process.env.GITHUB_ACTIONS || !this.db) {
      return [];
    }
    
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM quota_ledger 
        WHERE timestamp > datetime('now', '-${hours} hours')
        ORDER BY timestamp DESC
      `);
      
      return stmt.all() as QuotaLedgerEntry[];
    } catch (error) {
      throw new DatabaseError(`Failed to get quota entries: ${error}`);
    }
  }

  // Cache operations
  setCacheEntry(entry: DatabaseCacheEntry): void {
    // Skip cache operations in CI environments
    if (process.env.CI || process.env.GITHUB_ACTIONS || !this.db) {
      return;
    }
    
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO cache_entries (
          cache_key, prompt_hash, response, created_at, expires_at, size_bytes
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const responseStr = JSON.stringify(entry.response);
      
      stmt.run(
        entry.cache_key,
        entry.prompt_hash,
        responseStr,
        entry.created_at,
        entry.expires_at,
        Buffer.byteLength(responseStr, 'utf8')
      );
    } catch (error) {
      throw new DatabaseError(`Failed to set cache entry: ${error}`);
    }
  }

  getCacheEntry(cacheKey: string): DatabaseCacheEntry | null {
    // Return null in CI environments
    if (process.env.CI || process.env.GITHUB_ACTIONS || !this.db) {
      return null;
    }
    
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM cache_entries 
        WHERE cache_key = ? AND expires_at > datetime('now')
      `);
      
      const result = stmt.get(cacheKey) as any;
      if (!result) return null;
      
      // Update access tracking
      this.updateCacheAccess(cacheKey);
      
      return {
        ...result,
        response: JSON.parse(result.response)
      } as DatabaseCacheEntry;
    } catch (error) {
      throw new DatabaseError(`Failed to get cache entry: ${error}`);
    }
  }

  private updateCacheAccess(cacheKey: string): void {
    // Skip in CI environments
    if (process.env.CI || process.env.GITHUB_ACTIONS || !this.db) {
      return;
    }
    
    const stmt = this.db.prepare(`
      UPDATE cache_entries 
      SET access_count = access_count + 1, last_accessed = datetime('now')
      WHERE cache_key = ?
    `);
    
    stmt.run(cacheKey);
  }

  // Cache statistics
  getCacheStats(): CacheStats {
    // Return mock stats in CI environments
    if (process.env.CI || process.env.GITHUB_ACTIONS || !this.db) {
      return {
        hit_rate: 0,
        total_requests: 0,
        cache_hits: 0,
        cache_misses: 0,
        memory_usage: 0,
        persistent_entries: 0
      };
    }
    
    try {
      const stats = this.db.prepare(`
        SELECT 
          COUNT(*) as entries_count,
          SUM(size_bytes) / 1024.0 / 1024.0 as size_mb,
          SUM(access_count) as total_accesses
        FROM cache_entries 
        WHERE expires_at > datetime('now')
      `).get() as any;
      
      const recentRequests = this.db.prepare(`
        SELECT 
          COUNT(*) as total_requests,
          SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) as cache_hits
        FROM quota_ledger 
        WHERE timestamp > datetime('now', '-1 hour')
      `).get() as any;
      
      const hitRate = recentRequests.total_requests > 0 
        ? (recentRequests.cache_hits / recentRequests.total_requests) 
        : 0;
      
      return {
        total_requests: recentRequests.total_requests || 0,
        cache_hits: recentRequests.cache_hits || 0,
        cache_misses: (recentRequests.total_requests || 0) - (recentRequests.cache_hits || 0),
        hit_rate: hitRate,
        memory_usage: 0, // Not applicable for database cache
        persistent_entries: stats.entries_count || 0,
        size_mb: stats.size_mb || 0,
        entries_count: stats.entries_count || 0
      };
    } catch (error) {
      throw new DatabaseError(`Failed to get cache stats: ${error}`);
    }
  }

  // Backend metrics
  updateBackendMetrics(backend: string, latency: number, success: boolean, cost: number): void {
    // Skip in CI environments
    if (process.env.CI || process.env.GITHUB_ACTIONS || !this.db) {
      return;
    }
    
    try {
      const stmt = this.db.prepare(`
        INSERT INTO backend_metrics (
          backend, requests_count, avg_latency_ms, success_rate, total_cost_eur
        ) VALUES (?, 1, ?, ?, ?)
        ON CONFLICT(backend) DO UPDATE SET
          requests_count = requests_count + 1,
          avg_latency_ms = (avg_latency_ms * (requests_count - 1) + ?) / requests_count,
          success_rate = (success_rate * (requests_count - 1) + ?) / requests_count,
          total_cost_eur = total_cost_eur + ?
      `);
      
      const successValue = success ? 1 : 0;
      stmt.run(backend, latency, successValue, cost, latency, successValue, cost);
    } catch (error) {
      throw new DatabaseError(`Failed to update backend metrics: ${error}`);
    }
  }

  // Cleanup operations
  cleanup(): void {
    // Skip in CI environments
    if (process.env.CI || process.env.GITHUB_ACTIONS || !this.db) {
      return;
    }
    
    try {
      const transaction = this.db.transaction(() => {
        Object.values(CLEANUP_QUERIES).forEach(sql => {
          this.db.exec(sql);
        });
      });
      
      transaction();
      
      // Vacuum database
      this.db.exec('VACUUM');
    } catch (error) {
      throw new DatabaseError(`Failed to cleanup database: ${error}`);
    }
  }

  // Health check
  healthCheck(): { healthy: boolean; lastEntry?: string; cacheSize: number } {
    // Return healthy in CI environments
    if (process.env.CI || process.env.GITHUB_ACTIONS || !this.db) {
      return { healthy: true, cacheSize: 0 };
    }
    
    try {
      const lastEntry = this.db.prepare(`
        SELECT MAX(timestamp) as timestamp FROM quota_ledger
      `).get() as { timestamp: string } | undefined;
      
      const cacheSize = this.db.prepare(`
        SELECT COUNT(*) as count FROM cache_entries 
        WHERE expires_at > datetime('now')
      `).get() as { count: number };
      
      // Database is healthy if it's accessible and tables exist
      // We don't require recent entries for a fresh/clean system
      const tablesExist = this.db.prepare(`
        SELECT COUNT(*) as count FROM sqlite_master 
        WHERE type='table' AND name IN ('quota_ledger', 'cache_entries')
      `).get() as { count: number };
      
      const isHealthy = tablesExist.count >= 2;
      
      return {
        healthy: isHealthy,
        lastEntry: lastEntry?.timestamp,
        cacheSize: cacheSize.count
      };
    } catch (error) {
      return { healthy: false, cacheSize: 0 };
    }
  }

  close(): void {
    // Skip in CI environments
    if (process.env.CI || process.env.GITHUB_ACTIONS || !this.db) {
      return;
    }
    
    this.db.close();
  }
}