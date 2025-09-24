// Cache System for Claudette - Multi-layer caching with performance optimization
import { createHash } from 'crypto';
import { DatabaseManager } from '../database/index';
import { ClaudetteRequest, ClaudetteResponse, CacheError } from '../types/index';
import { AdaptiveMemoryManager, MemoryPressureMetrics } from './adaptive-memory-manager';
import AdvancedMemoryManager, { MemoryPool, ScalabilityMetrics } from './advanced-memory-manager';
import MemoryPressureOptimizer, { OptimizationResult } from './memory-optimizer';

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
  private advancedMemoryManager?: AdvancedMemoryManager;
  private memoryOptimizer: MemoryPressureOptimizer;
  private useAdvancedMemoryManagement: boolean;
  private accessPatterns: Map<string, { lastAccess: number; hitCount: number; size: number }>;
  private adaptiveStats: { evictions_performed: number; last_strategy: string };

  constructor(db: DatabaseManager, config: CacheConfig) {
    this.db = db;
    this.config = {
      enableMemory: true,
      enablePersistent: !process.env.CLAUDETTE_BENCHMARK, // Disable persistent cache in benchmark mode
      compressionEnabled: false,
      ...config,
      maxSize: process.env.CLAUDETTE_BENCHMARK ? Math.min(config.maxSize, 50) : config.maxSize // Limit cache size in benchmark mode
    };
    
    this.memoryCache = new Map();
    this.accessPatterns = new Map();
    this.memoryManager = new AdaptiveMemoryManager({
      maxMemoryPercent: process.env.CLAUDETTE_BENCHMARK ? 60 : 75, // More conservative in benchmark mode
      warningThreshold: process.env.CLAUDETTE_BENCHMARK ? 50 : 70, // Earlier warning in benchmark mode
      emergencyThreshold: process.env.CLAUDETTE_BENCHMARK ? 70 : 90, // Earlier emergency cleanup in benchmark mode
      smartEvictionEnabled: true,
      optimizationInterval: process.env.CLAUDETTE_BENCHMARK ? 60000 : 30000 // Less frequent in benchmark mode
    });

    // Initialize memory pressure optimizer
    this.memoryOptimizer = new MemoryPressureOptimizer({
      emergencyThreshold: process.env.CLAUDETTE_BENCHMARK ? 85 : 90,
      criticalThreshold: process.env.CLAUDETTE_BENCHMARK ? 70 : 80,
      warningThreshold: process.env.CLAUDETTE_BENCHMARK ? 60 : 70,
      maxMemoryGrowth: process.env.CLAUDETTE_BENCHMARK ? 100 * 1024 * 1024 : 200 * 1024 * 1024,
      complexTaskMemoryLimit: process.env.CLAUDETTE_BENCHMARK ? 75 * 1024 * 1024 : 150 * 1024 * 1024
    });

    // Register for emergency cleanup notifications
    this.memoryManager.onEmergencyCleanup(() => {
      this.performEmergencyCleanup();
    });

    // Initialize advanced memory management for production/high-load scenarios
    this.useAdvancedMemoryManagement = !process.env.CLAUDETTE_BENCHMARK && process.env.CLAUDETTE_ADVANCED_MEMORY === '1';
    
    if (this.useAdvancedMemoryManagement) {
      this.advancedMemoryManager = new AdvancedMemoryManager({
        baseThresholds: {
          low: 40,
          medium: 60, 
          high: 75,
          critical: 85,
          emergency: 95
        },
        emergencyReservePercent: 0.15, // 15% emergency reserve
        adaptiveThresholds: true
      });

      // Register cache as a memory pool
      const cachePool: MemoryPool = {
        id: 'claudette-cache',
        allocated: this.config.maxSize * 1024, // Estimate 1KB per entry
        used: 0,
        maxSize: this.config.maxSize * 2048, // Max 2KB per entry
        priority: 'medium',
        elasticity: 0.7, // Can shrink/grow by 70%
        cleanup: async () => this.performAdvancedCleanup()
      };

      this.advancedMemoryManager.registerMemoryPool(cachePool);
      
      // Register scaling callback
      this.advancedMemoryManager.onScalingAction('claudette-cache', async (action, intensity) => {
        await this.handleScalingAction(action, intensity);
      });

      console.log('[CacheSystem] Advanced memory management enabled');
    }
    
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
   * Prepare cache for complex task execution
   */
  async prepareForComplexTask(): Promise<OptimizationResult | null> {
    const status = this.memoryOptimizer.getMemoryStatus();
    
    if (!status.canHandleComplexTask) {
      console.log(`[CacheSystem] Optimizing memory for complex task (${(status.availableMemory/1024/1024).toFixed(1)}MB available)`);
      return await this.memoryOptimizer.optimizeForComplexTask();
    }
    
    // Preventive optimization if pressure is high
    if (status.currentPressure > 75) {
      return await this.memoryOptimizer.monitorAndOptimize();
    }
    
    return null;
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
        // Check memory pressure before storing
        const optimizationResult = await this.memoryOptimizer.monitorAndOptimize();
        if (optimizationResult) {
          console.log(`[CacheSystem] Pre-storage optimization: freed ${(optimizationResult.memoryFreed/1024/1024).toFixed(1)}MB`);
        }
        
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
  getStats(): CacheStats & { scalability_metrics?: ScalabilityMetrics } {
    const memoryPressure = this.memoryManager.getMemoryPressure();
    
    let scalabilityMetrics: ScalabilityMetrics | undefined;
    if (this.useAdvancedMemoryManagement && this.advancedMemoryManager) {
      scalabilityMetrics = this.advancedMemoryManager.getScalabilityMetrics();
    }
    
    return { 
      ...this.stats,
      memory_pressure: memoryPressure,
      adaptive_stats: {
        evictions_performed: this.adaptiveStats.evictions_performed,
        entries_tracked: this.accessPatterns.size,
        last_strategy: this.adaptiveStats.last_strategy
      },
      scalability_metrics: scalabilityMetrics
    };
  }

  /**
   * Get detailed scalability status (only available with advanced memory management)
   */
  getScalabilityStatus() {
    if (!this.useAdvancedMemoryManagement || !this.advancedMemoryManager) {
      return { error: 'Advanced memory management not enabled. Set CLAUDETTE_ADVANCED_MEMORY=1' };
    }
    
    return this.advancedMemoryManager.getDetailedStatus();
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
   * Emergency cleanup for critical memory pressure
   */
  private performEmergencyCleanup(): void {
    const currentSize = this.memoryCache.size;
    
    if (currentSize === 0) return;

    // Emergency: Clear 75% of cache immediately
    const targetSize = Math.floor(currentSize * 0.25);
    const entries = Array.from(this.memoryCache.entries());
    
    // Sort by least recently used and least hit count
    entries.sort((a, b) => {
      const aPattern = this.accessPatterns.get(a[0]);
      const bPattern = this.accessPatterns.get(b[0]);
      
      if (!aPattern && !bPattern) return 0;
      if (!aPattern) return -1;
      if (!bPattern) return 1;
      
      // Prioritize by last access time, then hit count
      const accessDiff = aPattern.lastAccess - bPattern.lastAccess;
      if (accessDiff !== 0) return accessDiff;
      
      return aPattern.hitCount - bPattern.hitCount;
    });

    // Remove entries starting from least important
    const toRemove = entries.slice(0, currentSize - targetSize);
    for (const [key] of toRemove) {
      this.memoryCache.delete(key);
      this.accessPatterns.delete(key);
    }

    this.adaptiveStats.evictions_performed++;
    this.adaptiveStats.last_strategy = 'emergency-auto';
    this.updateMemoryUsage();

    console.log(`[CacheSystem] Emergency cleanup: removed ${toRemove.length} entries (${currentSize} -> ${this.memoryCache.size})`);
  }

  /**
   * Advanced cleanup for scalable memory management
   */
  private async performAdvancedCleanup(): Promise<number> {
    const beforeSize = this.memoryCache.size;
    const beforeMemory = this.calculateMemoryUsage();
    
    // More intelligent cleanup based on access patterns and memory pressure
    const entries = Array.from(this.memoryCache.entries());
    const cutoff = Date.now() - (30 * 60 * 1000); // 30 minutes
    
    // Score entries for cleanup (lower score = higher cleanup priority)
    const scoredEntries = entries.map(([key, entry]) => {
      const pattern = this.accessPatterns.get(key);
      let score = 0;
      
      // Age factor (older = lower score)
      const age = Date.now() - entry.timestamp;
      score += Math.max(0, 10 - (age / (60 * 60 * 1000))); // Decay over hours
      
      // Access pattern factor
      if (pattern) {
        score += pattern.hitCount * 2; // Boost for frequently accessed
        score += Math.max(0, 5 - ((Date.now() - pattern.lastAccess) / (60 * 1000))); // Recent access boost
      }
      
      // Size factor (larger entries slightly penalized for cleanup)
      const entrySize = JSON.stringify(entry.value).length;
      score -= entrySize / 10000; // Small penalty for large entries
      
      return { key, entry, score, size: entrySize };
    });
    
    // Sort by score (lowest first for cleanup)
    scoredEntries.sort((a, b) => a.score - b.score);
    
    // Remove bottom 30% based on scoring
    const removeCount = Math.floor(scoredEntries.length * 0.3);
    let memoryFreed = 0;
    
    for (let i = 0; i < removeCount && i < scoredEntries.length; i++) {
      const { key, size } = scoredEntries[i];
      this.memoryCache.delete(key);
      this.accessPatterns.delete(key);
      memoryFreed += size;
    }
    
    this.updateMemoryUsage();
    
    console.log(`[CacheSystem] Advanced cleanup: removed ${removeCount} entries, freed ~${(memoryFreed / 1024).toFixed(1)}KB`);
    return memoryFreed;
  }

  /**
   * Handle scaling actions from advanced memory manager
   */
  private async handleScalingAction(action: string, intensity: number): Promise<void> {
    console.log(`[CacheSystem] Scaling action: ${action} (intensity: ${intensity.toFixed(2)})`);
    
    switch (action) {
      case 'emergency_reduce':
        await this.performAdvancedCleanup();
        // Reduce cache size limit temporarily
        this.config.maxSize = Math.floor(this.config.maxSize * (1 - intensity));
        break;
        
      case 'reduce':
        // Gradual reduction based on intensity
        const reductionTarget = Math.floor(this.memoryCache.size * intensity);
        await this.performTargetedReduction(reductionTarget);
        break;
        
      case 'expand':
        // Increase cache size limit if memory is available
        this.config.maxSize = Math.floor(this.config.maxSize * (1 + intensity));
        console.log(`[CacheSystem] Cache size expanded to ${this.config.maxSize} entries`);
        break;
    }
  }

  /**
   * Perform targeted reduction of cache entries
   */
  private async performTargetedReduction(targetReduction: number): Promise<void> {
    if (targetReduction <= 0 || this.memoryCache.size === 0) return;
    
    const entries = Array.from(this.memoryCache.entries());
    
    // Sort by utility score (least useful first)
    entries.sort(([aKey, aEntry], [bKey, bEntry]) => {
      const aPattern = this.accessPatterns.get(aKey) || { lastAccess: 0, hitCount: 0, size: 0 };
      const bPattern = this.accessPatterns.get(bKey) || { lastAccess: 0, hitCount: 0, size: 0 };
      
      // Utility = hit count / age in hours
      const aUtility = aPattern.hitCount / Math.max(1, (Date.now() - aPattern.lastAccess) / (60 * 60 * 1000));
      const bUtility = bPattern.hitCount / Math.max(1, (Date.now() - bPattern.lastAccess) / (60 * 60 * 1000));
      
      return aUtility - bUtility; // Ascending order (least useful first)
    });
    
    // Remove least useful entries
    const actualReduction = Math.min(targetReduction, entries.length);
    for (let i = 0; i < actualReduction; i++) {
      const [key] = entries[i];
      this.memoryCache.delete(key);
      this.accessPatterns.delete(key);
    }
    
    this.updateMemoryUsage();
    console.log(`[CacheSystem] Targeted reduction: removed ${actualReduction} entries`);
  }

  /**
   * Calculate current memory usage of the cache
   */
  private calculateMemoryUsage(): number {
    let totalSize = 0;
    for (const entry of this.memoryCache.values()) {
      totalSize += JSON.stringify(entry).length;
    }
    return totalSize;
  }

  /**
   * Cleanup method for proper shutdown
   */
  cleanup(): void {
    this.memoryManager.stop();
    if (this.useAdvancedMemoryManagement && this.advancedMemoryManager) {
      this.advancedMemoryManager.stop();
    }
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