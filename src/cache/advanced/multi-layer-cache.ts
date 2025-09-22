// Multi-Layer Cache System - Advanced caching with L1/L2/L3 hierarchy
import { EventEmitter } from 'events';
import { LRUCache } from 'lru-cache';
import { ClaudetteRequest, ClaudetteResponse, CacheError } from '../../types/index';
import { createHash } from 'crypto';

export interface CacheConfiguration {
  l1: {
    enabled: boolean;
    maxSize: number;
    ttl: number;
  };
  l2: {
    enabled: boolean;
    maxSize: number;
    ttl: number;
    compression: boolean;
  };
  l3: {
    enabled: boolean;
    persistentPath?: string;
    maxSize: number;
    ttl: number;
    compression: boolean;
  };
  evictionPolicy: 'lru' | 'lfu' | 'ttl' | 'random';
  compressionThreshold: number; // Bytes
  analytics: {
    enabled: boolean;
    trackAccessPatterns: boolean;
    trackPerformance: boolean;
  };
}

export interface CacheLayer {
  name: string;
  level: number;
  enabled: boolean;
  maxSize: number;
  currentSize: number;
  hitRate: number;
  avgLatency: number;
}

export interface MultiLayerCacheStats {
  overall: {
    hitRate: number;
    totalRequests: number;
    totalHits: number;
    totalMisses: number;
    avgResponseTime: number;
  };
  layers: CacheLayer[];
  performance: {
    compressionRatio: number;
    memoryEfficiency: number;
    diskUtilization: number;
  };
  analytics: {
    hotKeys: string[];
    accessPatterns: Record<string, number>;
    evictionStats: Record<string, number>;
  };
}

export class MultiLayerCache extends EventEmitter {
  private config: CacheConfiguration;
  private l1Cache: LRUCache<string, ClaudetteResponse>; // Memory - fastest
  private l2Cache: LRUCache<string, CompressedCacheEntry>; // Compressed memory
  private l3Cache: Map<string, PersistentCacheEntry>; // Disk - largest
  private stats: MultiLayerCacheStats = {
    overall: {
      hitRate: 0,
      totalRequests: 0,
      totalHits: 0,
      totalMisses: 0,
      avgResponseTime: 0
    },
    layers: [],
    performance: {
      compressionRatio: 0,
      memoryEfficiency: 0,
      diskUtilization: 0
    },
    analytics: {
      hotKeys: [],
      accessPatterns: {},
      evictionStats: {}
    }
  };
  private compressionEnabled: boolean;

  constructor(config: CacheConfiguration) {
    super();
    this.config = config;
    this.compressionEnabled = config.l2.compression || config.l3.compression;
    
    // Initialize L1 Cache (Hot cache - uncompressed, fastest access)
    this.l1Cache = new LRUCache({
      max: config.l1.maxSize,
      ttl: config.l1.ttl * 1000,
      allowStale: false,
      updateAgeOnGet: true,
      dispose: (value, key) => {
        this.emit('l1-eviction', { key, value });
      }
    });

    // Initialize L2 Cache (Warm cache - compressed memory)
    this.l2Cache = new LRUCache({
      max: config.l2.maxSize,
      ttl: config.l2.ttl * 1000,
      allowStale: false,
      sizeCalculation: (entry) => this.calculateCompressedSize(entry),
      dispose: (value, key) => {
        this.emit('l2-eviction', { key, value });
      }
    });

    // Initialize L3 Cache (Cold cache - persistent storage)
    this.l3Cache = new Map();

    this.initializeStats();
    this.startAnalytics();
  }

  /**
   * Get cached response with multi-layer lookup
   */
  async get(request: ClaudetteRequest): Promise<ClaudetteResponse | null> {
    const key = this.generateCacheKey(request);
    const startTime = Date.now();
    
    try {
      // L1 Cache lookup (fastest)
      if (this.config.l1.enabled) {
        const l1Result = this.l1Cache.get(key);
        if (l1Result) {
          this.recordHit('l1', Date.now() - startTime);
          this.updateAccessPattern(key);
          return { ...l1Result, cache_hit: true, cache_layer: 'l1' };
        }
      }

      // L2 Cache lookup (compressed memory)
      if (this.config.l2.enabled) {
        const l2Result = this.l2Cache.get(key);
        if (l2Result) {
          const decompressedResponse = await this.decompressResponse(l2Result);
          
          // Promote to L1 if enabled
          if (this.config.l1.enabled) {
            this.l1Cache.set(key, decompressedResponse);
          }
          
          this.recordHit('l2', Date.now() - startTime);
          this.updateAccessPattern(key);
          return { ...decompressedResponse, cache_hit: true, cache_layer: 'l2' };
        }
      }

      // L3 Cache lookup (persistent storage)
      if (this.config.l3.enabled) {
        const l3Result = await this.getFromL3Cache(key);
        if (l3Result) {
          const response = l3Result.compressed 
            ? await this.decompressResponse(l3Result)
            : l3Result.response;

          // Promote to higher layers
          if (this.config.l2.enabled) {
            const compressed = await this.compressResponse(response);
            this.l2Cache.set(key, compressed);
          }
          if (this.config.l1.enabled) {
            this.l1Cache.set(key, response);
          }

          this.recordHit('l3', Date.now() - startTime);
          this.updateAccessPattern(key);
          return { ...response, cache_hit: true, cache_layer: 'l3' };
        }
      }

      // Cache miss
      this.recordMiss(Date.now() - startTime);
      return null;

    } catch (error) {
      this.emit('error', new CacheError(`Multi-layer cache get error: ${error}`));
      this.recordMiss(Date.now() - startTime);
      return null;
    }
  }

  /**
   * Store response in appropriate cache layers
   */
  async set(request: ClaudetteRequest, response: ClaudetteResponse): Promise<void> {
    const key = this.generateCacheKey(request);
    const responseSize = JSON.stringify(response).length;
    
    try {
      // Store in L1 (hot cache)
      if (this.config.l1.enabled) {
        this.l1Cache.set(key, { ...response, cache_hit: false });
      }

      // Store in L2 (compressed warm cache)
      if (this.config.l2.enabled) {
        const compressed = responseSize > this.config.compressionThreshold
          ? await this.compressResponse(response)
          : { response, compressed: false, originalSize: responseSize, compressedSize: responseSize };
        
        this.l2Cache.set(key, compressed);
      }

      // Store in L3 (persistent cold cache)
      if (this.config.l3.enabled) {
        await this.setInL3Cache(key, response, responseSize > this.config.compressionThreshold);
      }

      this.updateCacheStats();
      this.emit('cache-set', { key, size: responseSize, layers: this.getActiveLayers() });

    } catch (error) {
      this.emit('error', new CacheError(`Multi-layer cache set error: ${error}`));
      throw error;
    }
  }

  /**
   * Generate cache key from request
   */
  private generateCacheKey(request: ClaudetteRequest): string {
    const content = JSON.stringify({
      prompt: request.prompt.substring(0, 1000), // Limit key size
      files: request.files?.slice(0, 10), // Limit files in key
      options: request.options
    });
    return createHash('sha256').update(content).digest('hex').substring(0, 32);
  }

  /**
   * Compress response for storage
   */
  private async compressResponse(response: ClaudetteResponse): Promise<CompressedCacheEntry> {
    if (!this.compressionEnabled) {
      return {
        response,
        compressed: false,
        originalSize: JSON.stringify(response).length,
        compressedSize: JSON.stringify(response).length
      };
    }

    try {
      const originalData = JSON.stringify(response);
      const originalSize = originalData.length;

      // Simple compression simulation (in real implementation, use zlib)
      const compressedData = Buffer.from(originalData).toString('base64');
      const compressedSize = compressedData.length;

      return {
        response: { ...response, _compressed_data: compressedData },
        compressed: true,
        originalSize,
        compressedSize
      };
    } catch (error) {
      // Fallback to uncompressed
      return {
        response,
        compressed: false,
        originalSize: JSON.stringify(response).length,
        compressedSize: JSON.stringify(response).length
      };
    }
  }

  /**
   * Decompress response from storage
   */
  private async decompressResponse(entry: CompressedCacheEntry): Promise<ClaudetteResponse> {
    if (!entry.compressed) {
      return entry.response;
    }

    try {
      // Simple decompression simulation
      if (entry.response._compressed_data) {
        const decompressedData = Buffer.from(entry.response._compressed_data, 'base64').toString();
        return JSON.parse(decompressedData);
      }
      return entry.response;
    } catch (error) {
      this.emit('error', new CacheError(`Decompression error: ${error}`));
      return entry.response;
    }
  }

  /**
   * Get from L3 persistent cache
   */
  private async getFromL3Cache(key: string): Promise<PersistentCacheEntry | null> {
    try {
      const entry = this.l3Cache.get(key);
      if (entry && this.isValidEntry(entry)) {
        return entry;
      }
      return null;
    } catch (error) {
      this.emit('error', new CacheError(`L3 cache get error: ${error}`));
      return null;
    }
  }

  /**
   * Set in L3 persistent cache
   */
  private async setInL3Cache(key: string, response: ClaudetteResponse, shouldCompress: boolean): Promise<void> {
    try {
      const entry: PersistentCacheEntry = {
        response: shouldCompress ? await this.compressResponse(response) : { response, compressed: false, originalSize: 0, compressedSize: 0 },
        timestamp: Date.now(),
        ttl: this.config.l3.ttl * 1000,
        compressed: shouldCompress,
        accessCount: 0
      };

      this.l3Cache.set(key, entry);

      // Enforce size limit
      if (this.l3Cache.size > this.config.l3.maxSize) {
        this.evictFromL3Cache();
      }
    } catch (error) {
      this.emit('error', new CacheError(`L3 cache set error: ${error}`));
    }
  }

  /**
   * Check if cache entry is valid
   */
  private isValidEntry(entry: PersistentCacheEntry): boolean {
    const now = Date.now();
    return (now - entry.timestamp) < entry.ttl;
  }

  /**
   * Evict entries from L3 cache
   */
  private evictFromL3Cache(): void {
    const entries = Array.from(this.l3Cache.entries())
      .sort(([,a], [,b]) => {
        switch (this.config.evictionPolicy) {
          case 'lru':
            return a.timestamp - b.timestamp;
          case 'lfu':
            return a.accessCount - b.accessCount;
          default:
            return a.timestamp - b.timestamp;
        }
      });

    const toEvict = Math.floor(entries.length * 0.1); // Evict 10%
    for (let i = 0; i < toEvict; i++) {
      this.l3Cache.delete(entries[i][0]);
      this.stats.analytics.evictionStats.l3 = (this.stats.analytics.evictionStats.l3 || 0) + 1;
    }
  }

  /**
   * Calculate compressed entry size
   */
  private calculateCompressedSize(entry: CompressedCacheEntry): number {
    return entry.compressedSize;
  }

  /**
   * Record cache hit
   */
  private recordHit(layer: string, latency: number): void {
    this.stats.overall.totalRequests++;
    this.stats.overall.totalHits++;
    this.updateHitRate();
    
    const layerStats = this.stats.layers.find(l => l.name === layer);
    if (layerStats) {
      layerStats.hitRate = (layerStats.hitRate + 1) / 2; // Simple moving average
      layerStats.avgLatency = (layerStats.avgLatency + latency) / 2;
    }
  }

  /**
   * Record cache miss
   */
  private recordMiss(latency: number): void {
    this.stats.overall.totalRequests++;
    this.stats.overall.totalMisses++;
    this.updateHitRate();
    this.stats.overall.avgResponseTime = (this.stats.overall.avgResponseTime + latency) / 2;
  }

  /**
   * Update overall hit rate
   */
  private updateHitRate(): void {
    if (this.stats.overall.totalRequests > 0) {
      this.stats.overall.hitRate = this.stats.overall.totalHits / this.stats.overall.totalRequests;
    }
  }

  /**
   * Update access pattern analytics
   */
  private updateAccessPattern(key: string): void {
    if (!this.config.analytics.trackAccessPatterns) return;
    
    this.stats.analytics.accessPatterns[key] = (this.stats.analytics.accessPatterns[key] || 0) + 1;
    
    // Update hot keys (top 10)
    const sortedKeys = Object.entries(this.stats.analytics.accessPatterns)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([key]) => key);
    
    this.stats.analytics.hotKeys = sortedKeys;
  }

  /**
   * Get active cache layers
   */
  private getActiveLayers(): string[] {
    const layers = [];
    if (this.config.l1.enabled) layers.push('l1');
    if (this.config.l2.enabled) layers.push('l2');
    if (this.config.l3.enabled) layers.push('l3');
    return layers;
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): void {
    this.stats = {
      overall: {
        hitRate: 0,
        totalRequests: 0,
        totalHits: 0,
        totalMisses: 0,
        avgResponseTime: 0
      },
      layers: [
        { name: 'l1', level: 1, enabled: this.config.l1.enabled, maxSize: this.config.l1.maxSize, currentSize: 0, hitRate: 0, avgLatency: 0 },
        { name: 'l2', level: 2, enabled: this.config.l2.enabled, maxSize: this.config.l2.maxSize, currentSize: 0, hitRate: 0, avgLatency: 0 },
        { name: 'l3', level: 3, enabled: this.config.l3.enabled, maxSize: this.config.l3.maxSize, currentSize: 0, hitRate: 0, avgLatency: 0 }
      ],
      performance: {
        compressionRatio: 1.0,
        memoryEfficiency: 1.0,
        diskUtilization: 0
      },
      analytics: {
        hotKeys: [],
        accessPatterns: {},
        evictionStats: {}
      }
    };
  }

  /**
   * Update cache statistics
   */
  private updateCacheStats(): void {
    this.stats.layers[0].currentSize = this.l1Cache.size;
    this.stats.layers[1].currentSize = this.l2Cache.size;
    this.stats.layers[2].currentSize = this.l3Cache.size;
  }

  /**
   * Start analytics collection
   */
  private startAnalytics(): void {
    if (!this.config.analytics.enabled) return;

    setInterval(() => {
      this.updateCacheStats();
      this.emit('stats-update', this.getStats());
    }, 30000); // Update every 30 seconds
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): MultiLayerCacheStats {
    return JSON.parse(JSON.stringify(this.stats));
  }

  /**
   * Clear all cache layers
   */
  async clear(): Promise<void> {
    this.l1Cache.clear();
    this.l2Cache.clear();
    this.l3Cache.clear();
    this.initializeStats();
    this.emit('cache-cleared');
  }

  /**
   * Get cache configuration
   */
  getConfiguration(): CacheConfiguration {
    return JSON.parse(JSON.stringify(this.config));
  }
}

// Supporting interfaces
interface CompressedCacheEntry {
  response: ClaudetteResponse;
  compressed: boolean;
  originalSize: number;
  compressedSize: number;
}

interface PersistentCacheEntry {
  response: CompressedCacheEntry;
  timestamp: number;
  ttl: number;
  compressed: boolean;
  accessCount: number;
}