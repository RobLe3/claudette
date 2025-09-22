// Cache System for Claudette - Multi-layer caching with performance optimization
import { createHash } from 'crypto';
import { DatabaseManager } from '../database/index';
import { ClaudetteRequest, ClaudetteResponse, CacheError } from '../types/index';
import { AdaptiveMemoryManager, MemoryPressureMetrics } from './adaptive-memory-manager';

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  maxSize: number; // Maximum cache size
  enablePersistent?: boolean; // Enable database persistence
  enableMemory?: boolean; // Enable in-memory cache
  compressionEnabled?: boolean; // Enable response compression
}

export interface CacheStats {
  hit_rate: number;
  total_requests: number;
  cache_hits: number;
  cache_misses: number;
  memory_usage: number;
  persistent_entries: number;
  size_mb?: number;
  entries_count?: number;
  memory_pressure?: MemoryPressureMetrics;
  adaptive_stats?: {
    evictions_performed: number;
    entries_tracked: number;
    last_strategy: string;
  };
}

export interface CacheEntry {
  key: string;
  value: ClaudetteResponse;
  timestamp: number;
  ttl: number;
  access_count: number;
  compressed?: boolean;
}

export class CacheSystem {
  private memoryCache: Map<string, CacheEntry>;
  private config: CacheConfig;
  private db: DatabaseManager;
  private stats: CacheStats;
  private memoryManager: AdaptiveMemoryManager;
  private accessPatterns: Map<string, { lastAccess: number; hitCount: number; size: number }>;
  private adaptiveStats: { evictions_performed: number; last_strategy: string };

  constructor(db: DatabaseManager, config: CacheConfig) {
    this.db = db;
    this.config = {
      enableMemory: true,
      enablePersistent: true,
      compressionEnabled: false,
      ...config
    };
    
    this.memoryCache = new Map();
    this.accessPatterns = new Map();
    this.memoryManager = new AdaptiveMemoryManager({
      maxMemoryPercent: 75, // More conservative for cache system
      smartEvictionEnabled: true
    });
    
    this.adaptiveStats = {
      evictions_performed: 0,
      last_strategy: 'none'
    };
    
    this.stats = {
      hit_rate: 0,
      total_requests: 0,
      cache_hits: 0,
      cache_misses: 0,
      memory_usage: 0,
      persistent_entries: 0
    };

    // Initialize cache cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Get cached response for request
   */
  async get(request: ClaudetteRequest): Promise<ClaudetteResponse | null> {
    const key = this.generateCacheKey(request);
    this.stats.total_requests++;

    try {
      // Try memory cache first
      if (this.config.enableMemory) {
        const memoryEntry = this.memoryCache.get(key);
        if (memoryEntry && this.isValidEntry(memoryEntry)) {
          memoryEntry.access_count++;
          this.stats.cache_hits++;
          this.updateHitRate();
          
          // Track access patterns for adaptive eviction
          this.updateAccessPattern(key, memoryEntry);
          
          // Mark as cache hit
          const response = { ...memoryEntry.value };
          response.cache_hit = true;
          return response;
        }
      }

      // Try persistent cache if enabled
      if (this.config.enablePersistent) {
        const persistentEntry = await this.getPersistentEntry(key);
        if (persistentEntry && this.isValidEntry(persistentEntry)) {
          // Promote to memory cache
          if (this.config.enableMemory) {
            this.memoryCache.set(key, persistentEntry);
          }
          
          this.stats.cache_hits++;
          this.updateHitRate();
          
          const response = { ...persistentEntry.value };
          response.cache_hit = true;
          return response;
        }
      }

      // Cache miss
      this.stats.cache_misses++;
      this.updateHitRate();
      return null;

    } catch (error) {
      console.warn(`Cache get error for key ${key}:`, error);
      this.stats.cache_misses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * Store response in cache
   */
  async set(request: ClaudetteRequest, response: ClaudetteResponse): Promise<void> {
    const key = this.generateCacheKey(request);
    const timestamp = Date.now();
    
    const entry: CacheEntry = {
      key,
      value: { ...response, cache_hit: false }, // Store original without cache flag
      timestamp,
      ttl: this.config.ttl * 1000, // Convert to milliseconds
      access_count: 0,
      compressed: false
    };

    try {
      // Store in memory cache if enabled
      if (this.config.enableMemory) {
        // Check memory limit
        // Use adaptive memory management instead of simple size check
        this.performAdaptiveEviction();
        this.memoryCache.set(key, entry);
        
        // Initialize access pattern for new entries
        this.updateAccessPattern(key, entry);
      }

      // Store in persistent cache if enabled
      if (this.config.enablePersistent) {
        await this.setPersistentEntry(entry);
      }

      this.updateMemoryUsage();

    } catch (error) {
      console.warn(`Cache set error for key ${key}:`, error);
      throw new CacheError(`Failed to cache response: ${error}`);
    }
  }

  /**
   * Generate cache key from request
   */
  private generateCacheKey(request: ClaudetteRequest): string {
    const content = JSON.stringify({
      prompt: request.prompt,
      files: request.files,
      options: request.options
    });
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Check if cache entry is still valid
   */
  private isValidEntry(entry: CacheEntry): boolean {
    const now = Date.now();
    return (now - entry.timestamp) < entry.ttl;
  }

  /**
   * Get entry from persistent storage
   */
  private async getPersistentEntry(key: string): Promise<CacheEntry | null> {
    try {
      const dbEntry = this.db.getCacheEntry(key);
      if (!dbEntry) return null;

      const entry: CacheEntry = {
        key: dbEntry.cache_key,
        value: dbEntry.response,
        timestamp: dbEntry.created_at,
        ttl: dbEntry.expires_at - dbEntry.created_at,
        access_count: 0,
        compressed: false
      };

      return entry;
    } catch (error) {
      console.warn(`Persistent cache get error:`, error);
      return null;
    }
  }

  /**
   * Store entry in persistent storage
   */
  private async setPersistentEntry(entry: CacheEntry): Promise<void> {
    try {
      const promptHash = createHash('md5').update(JSON.stringify(entry.value)).digest('hex');
      
      this.db.setCacheEntry({
        cache_key: entry.key,
        prompt_hash: promptHash,
        response: entry.value,
        created_at: entry.timestamp,
        expires_at: entry.timestamp + entry.ttl,
        size_bytes: JSON.stringify(entry.value).length
      });
    } catch (error) {
      console.warn(`Persistent cache set error:`, error);
    }
  }

  /**
   * Evict oldest entries from memory cache
   */
  /**
   * Perform adaptive memory-based eviction using intelligent patterns
   */
  private performAdaptiveEviction(): void {
    const currentSize = this.memoryCache.size;
    
    // Skip if cache is small or under simple size limit
    if (currentSize < this.config.maxSize * 0.8) {
      return;
    }

    const strategy = this.memoryManager.calculateEvictionStrategy(
      currentSize,
      this.accessPatterns
    );

    if (strategy.strategy === 'none') {
      return;
    }

    console.log(`[AdaptiveCache] Performing ${strategy.strategy} eviction: removing ${strategy.evictionCandidates.length} entries`);

    // Remove candidates identified by adaptive algorithm
    for (const key of strategy.evictionCandidates) {
      this.memoryCache.delete(key);
      this.accessPatterns.delete(key);
    }

    // Update adaptive stats
    this.adaptiveStats.evictions_performed++;
    this.adaptiveStats.last_strategy = strategy.strategy;

    // Force garbage collection in emergency scenarios
    if (strategy.strategy === 'emergency') {
      this.memoryManager.forceGarbageCollection();
    }
  }

  /**
   * Legacy method kept for compatibility (now uses adaptive logic)
   */
  private evictOldestMemoryEntries(): void {
    this.performAdaptiveEviction();
  }

  /**
   * Update access patterns for adaptive eviction
   */
  private updateAccessPattern(key: string, entry: CacheEntry): void {
    const entrySize = JSON.stringify(entry.value).length;
    
    this.accessPatterns.set(key, {
      lastAccess: Date.now(),
      hitCount: entry.access_count,
      size: entrySize
    });
  }

  /**
   * Update hit rate statistics
   */
  private updateHitRate(): void {
    if (this.stats.total_requests > 0) {
      this.stats.hit_rate = this.stats.cache_hits / this.stats.total_requests;
    }
  }

  /**
   * Update memory usage statistics
   */
  private updateMemoryUsage(): void {
    let memoryUsage = 0;
    for (const entry of this.memoryCache.values()) {
      memoryUsage += JSON.stringify(entry).length;
    }
    this.stats.memory_usage = memoryUsage;
  }

  /**
   * Start cleanup interval for expired entries
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000); // Cleanup every minute
  }

  /**
   * Remove expired entries from memory cache
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (!this.isValidEntry(entry)) {
        this.memoryCache.delete(key);
      }
    }
    this.updateMemoryUsage();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const memoryPressure = this.memoryManager.getMemoryPressure();
    
    return { 
      ...this.stats,
      memory_pressure: memoryPressure,
      adaptive_stats: {
        evictions_performed: this.adaptiveStats.evictions_performed,
        entries_tracked: this.accessPatterns.size,
        last_strategy: this.adaptiveStats.last_strategy
      }
    };
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.accessPatterns.clear();
    this.adaptiveStats = {
      evictions_performed: 0,
      last_strategy: 'none'
    };
    this.stats = {
      hit_rate: 0,
      total_requests: 0,
      cache_hits: 0,
      cache_misses: 0,
      memory_usage: 0,
      persistent_entries: 0
    };
  }

  /**
   * Cleanup method for proper shutdown
   */
  cleanup(): void {
    this.memoryManager.stop();
    this.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.memoryCache.size;
  }

  /**
   * Check if cache contains key
   */
  has(request: ClaudetteRequest): boolean {
    const key = this.generateCacheKey(request);
    return this.memoryCache.has(key);
  }
}