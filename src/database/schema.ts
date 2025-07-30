// Database schema definitions and migrations

export const SCHEMA_VERSION = 1;

export const CREATE_TABLES = {
  quota_ledger: `
    CREATE TABLE IF NOT EXISTS quota_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      backend TEXT NOT NULL,
      prompt_hash TEXT NOT NULL,
      tokens_input INTEGER DEFAULT 0,
      tokens_output INTEGER DEFAULT 0,
      cost_eur REAL DEFAULT 0.0,
      cache_hit BOOLEAN DEFAULT 0,
      latency_ms REAL DEFAULT 0.0,
      metadata TEXT DEFAULT '{}'
    )
  `,
  
  cache_entries: `
    CREATE TABLE IF NOT EXISTS cache_entries (
      cache_key TEXT PRIMARY KEY,
      prompt_hash TEXT NOT NULL,
      response TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      access_count INTEGER DEFAULT 0,
      last_accessed TEXT DEFAULT (datetime('now')),
      size_bytes INTEGER DEFAULT 0
    )
  `,
  
  cache_stats: `
    CREATE TABLE IF NOT EXISTS cache_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      total_requests INTEGER DEFAULT 0,
      cache_hits INTEGER DEFAULT 0,
      cache_misses INTEGER DEFAULT 0,
      hit_rate REAL DEFAULT 0.0,
      size_mb REAL DEFAULT 0.0,
      entries_count INTEGER DEFAULT 0
    )
  `,
  
  backend_metrics: `
    CREATE TABLE IF NOT EXISTS backend_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      backend TEXT NOT NULL,
      requests_count INTEGER DEFAULT 0,
      avg_latency_ms REAL DEFAULT 0.0,
      success_rate REAL DEFAULT 0.0,
      total_cost_eur REAL DEFAULT 0.0,
      availability_score REAL DEFAULT 1.0
    )
  `,
  
  compression_stats: `
    CREATE TABLE IF NOT EXISTS compression_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      method TEXT NOT NULL,
      original_size INTEGER NOT NULL,
      compressed_size INTEGER NOT NULL,
      compression_ratio REAL NOT NULL,
      processing_time_ms REAL DEFAULT 0.0
    )
  `,
  
  schema_version: `
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `
};

export const CREATE_INDEXES = {
  quota_ledger_timestamp: `
    CREATE INDEX IF NOT EXISTS idx_quota_ledger_timestamp 
    ON quota_ledger(timestamp)
  `,
  
  quota_ledger_backend: `
    CREATE INDEX IF NOT EXISTS idx_quota_ledger_backend 
    ON quota_ledger(backend)
  `,
  
  quota_ledger_prompt_hash: `
    CREATE INDEX IF NOT EXISTS idx_quota_ledger_prompt_hash 
    ON quota_ledger(prompt_hash)
  `,
  
  cache_entries_expires: `
    CREATE INDEX IF NOT EXISTS idx_cache_entries_expires 
    ON cache_entries(expires_at)
  `,
  
  cache_entries_accessed: `
    CREATE INDEX IF NOT EXISTS idx_cache_entries_accessed 
    ON cache_entries(last_accessed)
  `,
  
  backend_metrics_timestamp: `
    CREATE INDEX IF NOT EXISTS idx_backend_metrics_timestamp 
    ON backend_metrics(timestamp)
  `,
  
  backend_metrics_backend: `
    CREATE INDEX IF NOT EXISTS idx_backend_metrics_backend 
    ON backend_metrics(backend)
  `
};

export const MIGRATIONS = {
  1: {
    up: [
      ...Object.values(CREATE_TABLES),
      ...Object.values(CREATE_INDEXES),
      `INSERT OR IGNORE INTO schema_version (version) VALUES (1)`
    ],
    down: [
      'DROP TABLE IF EXISTS quota_ledger',
      'DROP TABLE IF EXISTS cache_entries', 
      'DROP TABLE IF EXISTS cache_stats',
      'DROP TABLE IF EXISTS backend_metrics',
      'DROP TABLE IF EXISTS compression_stats',
      'DELETE FROM schema_version WHERE version = 1'
    ]
  }
};

// Views for common queries
export const CREATE_VIEWS = {
  daily_costs: `
    CREATE VIEW IF NOT EXISTS daily_costs AS
    SELECT 
      DATE(timestamp) as date,
      backend,
      SUM(cost_eur) as total_cost,
      COUNT(*) as request_count,
      AVG(latency_ms) as avg_latency,
      SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) as cache_hits,
      ROUND(
        (SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) * 100.0) / COUNT(*), 
        2
      ) as cache_hit_rate
    FROM quota_ledger 
    GROUP BY DATE(timestamp), backend
    ORDER BY date DESC, backend
  `,
  
  hourly_performance: `
    CREATE VIEW IF NOT EXISTS hourly_performance AS
    SELECT 
      strftime('%Y-%m-%d %H:00:00', timestamp) as hour,
      backend,
      COUNT(*) as requests,
      AVG(latency_ms) as avg_latency,
      SUM(cost_eur) as total_cost,
      SUM(tokens_input) as total_input_tokens,
      SUM(tokens_output) as total_output_tokens
    FROM quota_ledger
    WHERE timestamp >= datetime('now', '-24 hours')
    GROUP BY strftime('%Y-%m-%d %H:00:00', timestamp), backend
    ORDER BY hour DESC
  `,
  
  cache_efficiency: `
    CREATE VIEW IF NOT EXISTS cache_efficiency AS
    SELECT 
      DATE(last_accessed) as date,
      COUNT(*) as active_entries,
      SUM(access_count) as total_accesses,
      AVG(access_count) as avg_accesses_per_entry,
      SUM(size_bytes) / 1024.0 / 1024.0 as size_mb
    FROM cache_entries
    WHERE expires_at > datetime('now')
    GROUP BY DATE(last_accessed)
    ORDER BY date DESC
  `
};

// Cleanup queries
export const CLEANUP_QUERIES = {
  expired_cache: `
    DELETE FROM cache_entries 
    WHERE expires_at < datetime('now')
  `,
  
  old_quota_entries: `
    DELETE FROM quota_ledger 
    WHERE timestamp < datetime('now', '-30 days')
  `,
  
  old_cache_stats: `
    DELETE FROM cache_stats 
    WHERE timestamp < datetime('now', '-7 days')
  `,
  
  old_backend_metrics: `
    DELETE FROM backend_metrics 
    WHERE timestamp < datetime('now', '-7 days')
  `,
  
  unused_cache_entries: `
    DELETE FROM cache_entries 
    WHERE access_count = 0 
    AND created_at < datetime('now', '-1 day')
  `
};