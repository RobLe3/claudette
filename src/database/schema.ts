// Database schema definitions and migrations

export const SCHEMA_VERSION = 2;

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
  `,

  // System monitoring tables
  system_metrics: `
    CREATE TABLE IF NOT EXISTS system_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      metric_type TEXT NOT NULL,
      metric_name TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT DEFAULT '',
      component TEXT,
      metadata TEXT DEFAULT '{}',
      alert_threshold REAL,
      is_healthy BOOLEAN DEFAULT 1
    )
  `,

  performance_alerts: `
    CREATE TABLE IF NOT EXISTS performance_alerts (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      metric_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      description TEXT NOT NULL,
      current_value REAL NOT NULL,
      baseline_value REAL,
      percentage_change REAL,
      confidence REAL DEFAULT 0.0,
      backend TEXT,
      component TEXT,
      status TEXT DEFAULT 'active',
      resolved_at TEXT,
      metadata TEXT DEFAULT '{}'
    )
  `,

  // Community analytics tables
  community_metrics: `
    CREATE TABLE IF NOT EXISTS community_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      metric_type TEXT NOT NULL,
      user_id TEXT,
      session_id TEXT,
      event_type TEXT NOT NULL,
      event_data TEXT DEFAULT '{}',
      success BOOLEAN DEFAULT 1,
      duration_ms REAL,
      metadata TEXT DEFAULT '{}'
    )
  `,

  developer_onboarding: `
    CREATE TABLE IF NOT EXISTS developer_onboarding (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      user_id TEXT NOT NULL,
      step_name TEXT NOT NULL,
      step_type TEXT NOT NULL,
      status TEXT DEFAULT 'started',
      completion_time_ms REAL,
      error_details TEXT,
      help_used BOOLEAN DEFAULT 0,
      metadata TEXT DEFAULT '{}'
    )
  `,

  contribution_tracking: `
    CREATE TABLE IF NOT EXISTS contribution_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      contributor_id TEXT NOT NULL,
      contribution_type TEXT NOT NULL,
      component TEXT NOT NULL,
      lines_added INTEGER DEFAULT 0,
      lines_removed INTEGER DEFAULT 0,
      files_changed INTEGER DEFAULT 0,
      test_coverage_delta REAL DEFAULT 0.0,
      review_time_hours REAL,
      merge_time_hours REAL,
      quality_score REAL,
      metadata TEXT DEFAULT '{}'
    )
  `,

  // Technical performance analytics tables
  rag_performance: `
    CREATE TABLE IF NOT EXISTS rag_performance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      query_hash TEXT NOT NULL,
      retrieval_time_ms REAL NOT NULL,
      generation_time_ms REAL NOT NULL,
      total_time_ms REAL NOT NULL,
      documents_retrieved INTEGER DEFAULT 0,
      relevance_score REAL,
      accuracy_score REAL,
      backend_used TEXT,
      cache_hit BOOLEAN DEFAULT 0,
      token_count INTEGER DEFAULT 0,
      cost_eur REAL DEFAULT 0.0,
      quality_rating INTEGER,
      metadata TEXT DEFAULT '{}'
    )
  `,

  ml_routing_analytics: `
    CREATE TABLE IF NOT EXISTS ml_routing_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      request_hash TEXT NOT NULL,
      predicted_backend TEXT NOT NULL,
      actual_backend TEXT NOT NULL,
      prediction_confidence REAL NOT NULL,
      predicted_latency REAL,
      actual_latency REAL,
      predicted_cost REAL,
      actual_cost REAL,
      predicted_quality REAL,
      actual_quality REAL,
      optimization_score REAL,
      routing_accuracy BOOLEAN DEFAULT 0,
      metadata TEXT DEFAULT '{}'
    )
  `,

  // Business intelligence tables
  usage_analytics: `
    CREATE TABLE IF NOT EXISTS usage_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      session_id TEXT NOT NULL,
      user_type TEXT DEFAULT 'anonymous',
      feature_used TEXT NOT NULL,
      usage_duration_ms REAL,
      success_rate REAL DEFAULT 1.0,
      user_satisfaction INTEGER,
      retention_indicator BOOLEAN DEFAULT 0,
      conversion_event BOOLEAN DEFAULT 0,
      geographic_region TEXT,
      platform TEXT,
      metadata TEXT DEFAULT '{}'
    )
  `,

  growth_metrics: `
    CREATE TABLE IF NOT EXISTS growth_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      metric_name TEXT NOT NULL,
      value REAL NOT NULL,
      period TEXT NOT NULL,
      growth_rate REAL,
      trend_direction TEXT,
      forecast_value REAL,
      confidence_interval REAL,
      data_quality REAL DEFAULT 1.0,
      metadata TEXT DEFAULT '{}'
    )
  `,

  predictive_forecasts: `
    CREATE TABLE IF NOT EXISTS predictive_forecasts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      metric_name TEXT NOT NULL,
      forecast_horizon_hours INTEGER NOT NULL,
      predicted_value REAL NOT NULL,
      confidence REAL NOT NULL,
      upper_bound REAL,
      lower_bound REAL,
      model_used TEXT NOT NULL,
      model_accuracy REAL,
      actual_value REAL,
      prediction_error REAL,
      metadata TEXT DEFAULT '{}'
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
  `,

  // System monitoring indexes
  system_metrics_timestamp: `
    CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp 
    ON system_metrics(timestamp)
  `,
  
  system_metrics_type: `
    CREATE INDEX IF NOT EXISTS idx_system_metrics_type 
    ON system_metrics(metric_type, metric_name)
  `,

  performance_alerts_timestamp: `
    CREATE INDEX IF NOT EXISTS idx_performance_alerts_timestamp 
    ON performance_alerts(timestamp)
  `,

  performance_alerts_severity: `
    CREATE INDEX IF NOT EXISTS idx_performance_alerts_severity 
    ON performance_alerts(severity, status)
  `,

  // Community analytics indexes
  community_metrics_timestamp: `
    CREATE INDEX IF NOT EXISTS idx_community_metrics_timestamp 
    ON community_metrics(timestamp)
  `,

  community_metrics_type: `
    CREATE INDEX IF NOT EXISTS idx_community_metrics_type 
    ON community_metrics(metric_type, event_type)
  `,

  developer_onboarding_user: `
    CREATE INDEX IF NOT EXISTS idx_developer_onboarding_user 
    ON developer_onboarding(user_id, timestamp)
  `,

  contribution_tracking_contributor: `
    CREATE INDEX IF NOT EXISTS idx_contribution_tracking_contributor 
    ON contribution_tracking(contributor_id, timestamp)
  `,

  // Technical performance indexes
  rag_performance_timestamp: `
    CREATE INDEX IF NOT EXISTS idx_rag_performance_timestamp 
    ON rag_performance(timestamp)
  `,

  rag_performance_quality: `
    CREATE INDEX IF NOT EXISTS idx_rag_performance_quality 
    ON rag_performance(relevance_score, accuracy_score)
  `,

  ml_routing_timestamp: `
    CREATE INDEX IF NOT EXISTS idx_ml_routing_timestamp 
    ON ml_routing_analytics(timestamp)
  `,

  ml_routing_accuracy: `
    CREATE INDEX IF NOT EXISTS idx_ml_routing_accuracy 
    ON ml_routing_analytics(routing_accuracy, prediction_confidence)
  `,

  // Business intelligence indexes
  usage_analytics_timestamp: `
    CREATE INDEX IF NOT EXISTS idx_usage_analytics_timestamp 
    ON usage_analytics(timestamp)
  `,

  usage_analytics_feature: `
    CREATE INDEX IF NOT EXISTS idx_usage_analytics_feature 
    ON usage_analytics(feature_used, user_type)
  `,

  growth_metrics_timestamp: `
    CREATE INDEX IF NOT EXISTS idx_growth_metrics_timestamp 
    ON growth_metrics(timestamp)
  `,

  predictive_forecasts_timestamp: `
    CREATE INDEX IF NOT EXISTS idx_predictive_forecasts_timestamp 
    ON predictive_forecasts(timestamp)
  `,

  predictive_forecasts_metric: `
    CREATE INDEX IF NOT EXISTS idx_predictive_forecasts_metric 
    ON predictive_forecasts(metric_name, forecast_horizon_hours)
  `
};

export const MIGRATIONS = {
  1: {
    up: [
      ...Object.values(CREATE_TABLES).slice(0, 5), // Original tables only
      ...Object.values(CREATE_INDEXES).slice(0, 7), // Original indexes only
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
  },
  2: {
    up: [
      // Add new monitoring and analytics tables
      CREATE_TABLES.system_metrics,
      CREATE_TABLES.performance_alerts,
      CREATE_TABLES.community_metrics,
      CREATE_TABLES.developer_onboarding,
      CREATE_TABLES.contribution_tracking,
      CREATE_TABLES.rag_performance,
      CREATE_TABLES.ml_routing_analytics,
      CREATE_TABLES.usage_analytics,
      CREATE_TABLES.growth_metrics,
      CREATE_TABLES.predictive_forecasts,
      // Add new indexes
      ...Object.values(CREATE_INDEXES).slice(7), // New indexes only
      `INSERT OR IGNORE INTO schema_version (version) VALUES (2)`
    ],
    down: [
      'DROP TABLE IF EXISTS system_metrics',
      'DROP TABLE IF EXISTS performance_alerts',
      'DROP TABLE IF EXISTS community_metrics',
      'DROP TABLE IF EXISTS developer_onboarding',
      'DROP TABLE IF EXISTS contribution_tracking',
      'DROP TABLE IF EXISTS rag_performance',
      'DROP TABLE IF EXISTS ml_routing_analytics',
      'DROP TABLE IF EXISTS usage_analytics',
      'DROP TABLE IF EXISTS growth_metrics',
      'DROP TABLE IF EXISTS predictive_forecasts',
      'DELETE FROM schema_version WHERE version = 2'
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
  `,

  // System monitoring views
  system_health_dashboard: `
    CREATE VIEW IF NOT EXISTS system_health_dashboard AS
    SELECT 
      component,
      COUNT(*) as total_metrics,
      SUM(CASE WHEN is_healthy = 1 THEN 1 ELSE 0 END) as healthy_metrics,
      AVG(value) as avg_value,
      MAX(value) as max_value,
      MIN(value) as min_value,
      MAX(timestamp) as last_updated
    FROM system_metrics
    WHERE timestamp >= datetime('now', '-1 hour')
    GROUP BY component
    ORDER BY component
  `,

  performance_summary: `
    CREATE VIEW IF NOT EXISTS performance_summary AS
    SELECT 
      DATE(timestamp) as date,
      metric_type,
      COUNT(*) as measurement_count,
      AVG(value) as avg_value,
      MAX(value) as max_value,
      MIN(value) as min_value,
      STDDEV(value) as value_stddev
    FROM system_metrics
    GROUP BY DATE(timestamp), metric_type
    ORDER BY date DESC, metric_type
  `,

  active_alerts_summary: `
    CREATE VIEW IF NOT EXISTS active_alerts_summary AS
    SELECT 
      severity,
      COUNT(*) as alert_count,
      AVG(confidence) as avg_confidence,
      MIN(timestamp) as oldest_alert,
      MAX(timestamp) as newest_alert
    FROM performance_alerts
    WHERE status = 'active'
    GROUP BY severity
    ORDER BY CASE severity 
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2  
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END
  `,

  // Community analytics views
  developer_onboarding_funnel: `
    CREATE VIEW IF NOT EXISTS developer_onboarding_funnel AS
    SELECT 
      step_name,
      step_type,
      COUNT(*) as total_attempts,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      AVG(completion_time_ms) as avg_completion_time_ms,
      SUM(CASE WHEN help_used = 1 THEN 1 ELSE 0 END) as help_requests,
      ROUND(
        (SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) * 100.0) / COUNT(*), 
        2
      ) as completion_rate
    FROM developer_onboarding
    WHERE timestamp >= datetime('now', '-30 days')
    GROUP BY step_name, step_type
    ORDER BY completion_rate DESC
  `,

  community_engagement: `
    CREATE VIEW IF NOT EXISTS community_engagement AS
    SELECT 
      DATE(timestamp) as date,
      event_type,
      COUNT(*) as event_count,
      COUNT(DISTINCT user_id) as unique_users,
      COUNT(DISTINCT session_id) as unique_sessions,
      AVG(duration_ms) as avg_duration_ms,
      SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_events
    FROM community_metrics
    WHERE timestamp >= datetime('now', '-30 days')
    GROUP BY DATE(timestamp), event_type
    ORDER BY date DESC, event_count DESC
  `,

  contribution_analytics: `
    CREATE VIEW IF NOT EXISTS contribution_analytics AS
    SELECT 
      contributor_id,
      contribution_type,
      COUNT(*) as total_contributions,
      SUM(lines_added) as total_lines_added,
      SUM(lines_removed) as total_lines_removed,
      SUM(files_changed) as total_files_changed,
      AVG(quality_score) as avg_quality_score,
      AVG(review_time_hours) as avg_review_time_hours,
      AVG(merge_time_hours) as avg_merge_time_hours,
      MAX(timestamp) as last_contribution
    FROM contribution_tracking
    WHERE timestamp >= datetime('now', '-90 days')
    GROUP BY contributor_id, contribution_type
    ORDER BY total_contributions DESC, avg_quality_score DESC
  `,

  // Technical performance views
  rag_performance_analytics: `
    CREATE VIEW IF NOT EXISTS rag_performance_analytics AS
    SELECT 
      backend_used,
      DATE(timestamp) as date,
      COUNT(*) as total_queries,
      AVG(retrieval_time_ms) as avg_retrieval_time,
      AVG(generation_time_ms) as avg_generation_time,
      AVG(total_time_ms) as avg_total_time,
      AVG(relevance_score) as avg_relevance_score,
      AVG(accuracy_score) as avg_accuracy_score,
      SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) as cache_hits,
      SUM(cost_eur) as total_cost,
      AVG(quality_rating) as avg_quality_rating
    FROM rag_performance
    WHERE timestamp >= datetime('now', '-7 days')
    GROUP BY backend_used, DATE(timestamp)
    ORDER BY date DESC, backend_used
  `,

  ml_routing_effectiveness: `
    CREATE VIEW IF NOT EXISTS ml_routing_effectiveness AS
    SELECT 
      predicted_backend,
      actual_backend,
      COUNT(*) as routing_decisions,
      SUM(CASE WHEN routing_accuracy = 1 THEN 1 ELSE 0 END) as accurate_predictions,
      AVG(prediction_confidence) as avg_confidence,
      AVG(optimization_score) as avg_optimization_score,
      ABS(AVG(predicted_latency - actual_latency)) as avg_latency_error,
      ABS(AVG(predicted_cost - actual_cost)) as avg_cost_error,
      ABS(AVG(predicted_quality - actual_quality)) as avg_quality_error,
      ROUND(
        (SUM(CASE WHEN routing_accuracy = 1 THEN 1 ELSE 0 END) * 100.0) / COUNT(*), 
        2
      ) as accuracy_percentage
    FROM ml_routing_analytics
    WHERE timestamp >= datetime('now', '-7 days')
    GROUP BY predicted_backend, actual_backend
    ORDER BY accuracy_percentage DESC, routing_decisions DESC
  `,

  // Business intelligence views
  feature_adoption: `
    CREATE VIEW IF NOT EXISTS feature_adoption AS
    SELECT 
      feature_used,
      user_type,
      COUNT(*) as usage_count,
      COUNT(DISTINCT session_id) as unique_sessions,
      AVG(usage_duration_ms) as avg_usage_duration,
      AVG(success_rate) as avg_success_rate,
      AVG(user_satisfaction) as avg_satisfaction,
      SUM(CASE WHEN retention_indicator = 1 THEN 1 ELSE 0 END) as retention_events,
      SUM(CASE WHEN conversion_event = 1 THEN 1 ELSE 0 END) as conversion_events
    FROM usage_analytics
    WHERE timestamp >= datetime('now', '-30 days')
    GROUP BY feature_used, user_type
    ORDER BY usage_count DESC, avg_success_rate DESC
  `,

  growth_trends: `
    CREATE VIEW IF NOT EXISTS growth_trends AS
    SELECT 
      metric_name,
      period,
      COUNT(*) as data_points,
      AVG(value) as avg_value,
      AVG(growth_rate) as avg_growth_rate,
      trend_direction,
      COUNT(CASE WHEN trend_direction = 'up' THEN 1 END) as positive_periods,
      COUNT(CASE WHEN trend_direction = 'down' THEN 1 END) as negative_periods,
      AVG(data_quality) as avg_data_quality,
      MAX(timestamp) as latest_measurement
    FROM growth_metrics
    WHERE timestamp >= datetime('now', '-90 days')
    GROUP BY metric_name, period, trend_direction
    ORDER BY metric_name, avg_growth_rate DESC
  `,

  forecast_accuracy_report: `
    CREATE VIEW IF NOT EXISTS forecast_accuracy_report AS
    SELECT 
      metric_name,
      model_used,
      forecast_horizon_hours,
      COUNT(*) as total_forecasts,
      COUNT(CASE WHEN actual_value IS NOT NULL THEN 1 END) as validated_forecasts,
      AVG(confidence) as avg_confidence,
      AVG(model_accuracy) as avg_model_accuracy,
      AVG(ABS(prediction_error)) as avg_absolute_error,
      ROUND(
        AVG(CASE WHEN ABS(prediction_error) / predicted_value < 0.1 THEN 1.0 ELSE 0.0 END) * 100,
        2
      ) as accuracy_within_10_percent
    FROM predictive_forecasts
    WHERE timestamp >= datetime('now', '-30 days')
      AND actual_value IS NOT NULL
    GROUP BY metric_name, model_used, forecast_horizon_hours
    ORDER BY accuracy_within_10_percent DESC, avg_absolute_error ASC
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
  `,

  // System monitoring cleanup
  old_system_metrics: `
    DELETE FROM system_metrics 
    WHERE timestamp < datetime('now', '-7 days')
  `,

  resolved_alerts: `
    DELETE FROM performance_alerts 
    WHERE status = 'resolved' 
    AND resolved_at < datetime('now', '-7 days')
  `,

  // Community analytics cleanup
  old_community_metrics: `
    DELETE FROM community_metrics 
    WHERE timestamp < datetime('now', '-90 days')
  `,

  old_onboarding_data: `
    DELETE FROM developer_onboarding 
    WHERE timestamp < datetime('now', '-180 days')
  `,

  old_contribution_data: `
    DELETE FROM contribution_tracking 
    WHERE timestamp < datetime('now', '-365 days')
  `,

  // Technical performance cleanup
  old_rag_performance: `
    DELETE FROM rag_performance 
    WHERE timestamp < datetime('now', '-30 days')
  `,

  old_ml_routing_data: `
    DELETE FROM ml_routing_analytics 
    WHERE timestamp < datetime('now', '-30 days')
  `,

  // Business intelligence cleanup
  old_usage_analytics: `
    DELETE FROM usage_analytics 
    WHERE timestamp < datetime('now', '-90 days')
  `,

  old_growth_metrics: `
    DELETE FROM growth_metrics 
    WHERE timestamp < datetime('now', '-365 days')
  `,

  outdated_forecasts: `
    DELETE FROM predictive_forecasts 
    WHERE timestamp < datetime('now', '-30 days')
    AND actual_value IS NOT NULL
  `
};