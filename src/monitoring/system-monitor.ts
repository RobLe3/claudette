// Comprehensive System Monitoring Infrastructure
// Real-time performance tracking, health monitoring, and alerting

import { Database } from 'sqlite3';
import * as fs from 'fs';
import * as os from 'os';

export interface SystemMetric {
  timestamp: number;
  metricType: 'performance' | 'health' | 'resource' | 'availability';
  metricName: string;
  value: number;
  unit: string;
  component?: string;
  metadata?: Record<string, any>;
  alertThreshold?: number;
  isHealthy: boolean;
}

export interface AlertConfiguration {
  metricName: string;
  warningThreshold: number;
  criticalThreshold: number;
  evaluationWindow: number; // minutes
  cooldownPeriod: number; // minutes
  enabled: boolean;
}

export interface HealthStatus {
  component: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  lastCheck: number;
  metrics: Record<string, number>;
  issues: string[];
}

export interface MonitoringConfiguration {
  enabled: boolean;
  collectionInterval: number; // seconds
  retentionDays: number;
  alerting: {
    enabled: boolean;
    webhookUrl?: string;
    emailRecipients?: string[];
    slackChannel?: string;
  };
  thresholds: {
    cpu: { warning: number; critical: number };
    memory: { warning: number; critical: number };
    disk: { warning: number; critical: number };
    latency: { warning: number; critical: number };
    errorRate: { warning: number; critical: number };
  };
  components: string[];
}

export class SystemMonitor {
  private db: Database;
  private config: MonitoringConfiguration;
  private alertConfigs: Map<string, AlertConfiguration> = new Map();
  private lastAlerts: Map<string, number> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private healthCheckers: Map<string, () => Promise<HealthStatus>> = new Map();

  constructor(db: Database, config: Partial<MonitoringConfiguration> = {}) {
    this.db = db;
    this.config = {
      enabled: true,
      collectionInterval: 30, // 30 seconds
      retentionDays: 7,
      alerting: {
        enabled: true
      },
      thresholds: {
        cpu: { warning: 70, critical: 90 },
        memory: { warning: 80, critical: 95 },
        disk: { warning: 85, critical: 95 },
        latency: { warning: 5000, critical: 10000 },
        errorRate: { warning: 5, critical: 10 }
      },
      components: ['system', 'database', 'cache', 'backends', 'rag'],
      ...config
    };

    this.initializeAlertConfigurations();
    this.setupHealthCheckers();
    
    if (this.config.enabled) {
      this.startMonitoring();
    }

    console.log('🔍 System Monitor initialized with comprehensive tracking');
  }

  /**
   * Record a system metric
   */
  async recordMetric(metric: SystemMetric): Promise<void> {
    const query = `
      INSERT INTO system_metrics (
        timestamp, metric_type, metric_name, value, unit, 
        component, metadata, alert_threshold, is_healthy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    return new Promise((resolve, reject) => {
      this.db.run(
        query,
        [
          new Date(metric.timestamp).toISOString(),
          metric.metricType,
          metric.metricName,
          metric.value,
          metric.unit,
          metric.component || null,
          JSON.stringify(metric.metadata || {}),
          metric.alertThreshold || null,
          metric.isHealthy ? 1 : 0
        ],
        function(err) {
          if (err) {
            console.error('Failed to record system metric:', err);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * Get current system health status
   */
  async getSystemHealth(): Promise<Record<string, HealthStatus>> {
    const healthStatuses: Record<string, HealthStatus> = {};

    for (const [component, checker] of this.healthCheckers) {
      try {
        const status = await checker();
        healthStatuses[component] = status;
      } catch (error) {
        healthStatuses[component] = {
          component,
          status: 'unknown',
          lastCheck: Date.now(),
          metrics: {},
          issues: [`Health check failed: ${error}`]
        };
      }
    }

    return healthStatuses;
  }

  /**
   * Get performance metrics for dashboard
   */
  async getPerformanceMetrics(timeRange: number = 3600000): Promise<{
    current: Record<string, SystemMetric[]>;
    trends: Record<string, Array<{ timestamp: number; value: number }>>;
  }> {
    const since = new Date(Date.now() - timeRange).toISOString();
    
    const query = `
      SELECT * FROM system_metrics 
      WHERE timestamp >= ? 
      ORDER BY timestamp DESC
    `;

    return new Promise((resolve, reject) => {
      this.db.all(query, [since], (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        const current: Record<string, SystemMetric[]> = {};
        const trends: Record<string, Array<{ timestamp: number; value: number }>> = {};

        rows.forEach(row => {
          const metric: SystemMetric = {
            timestamp: new Date(row.timestamp).getTime(),
            metricType: row.metric_type,
            metricName: row.metric_name,
            value: row.value,
            unit: row.unit,
            component: row.component,
            metadata: JSON.parse(row.metadata || '{}'),
            alertThreshold: row.alert_threshold,
            isHealthy: row.is_healthy === 1
          };

          const key = `${metric.component || 'system'}_${metric.metricName}`;
          
          if (!current[key]) {
            current[key] = [];
            trends[key] = [];
          }
          
          current[key].push(metric);
          trends[key].push({
            timestamp: metric.timestamp,
            value: metric.value
          });
        });

        resolve({ current, trends });
      });
    });
  }

  /**
   * Create performance alert
   */
  async createAlert(
    metricType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string,
    currentValue: number,
    baselineValue?: number,
    component?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const percentageChange = baselineValue ? 
      ((currentValue - baselineValue) / baselineValue) * 100 : 0;

    const query = `
      INSERT INTO performance_alerts (
        id, timestamp, metric_type, severity, description,
        current_value, baseline_value, percentage_change,
        confidence, backend, component, status, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    return new Promise((resolve, reject) => {
      this.db.run(
        query,
        [
          alertId,
          new Date().toISOString(),
          metricType,
          severity,
          description,
          currentValue,
          baselineValue || null,
          percentageChange,
          0.9, // confidence
          null, // backend
          component || null,
          'active',
          JSON.stringify(metadata || {})
        ],
        function(err) {
          if (err) {
            console.error('Failed to create alert:', err);
            reject(err);
          } else {
            console.warn(`⚠️ Alert Created [${severity.toUpperCase()}]: ${description}`);
            resolve();
          }
        }
      );
    });

    // Send notification if configured
    if (this.config.alerting.enabled) {
      await this.sendAlertNotification(severity, description, currentValue, component);
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<Array<{
    id: string;
    timestamp: number;
    metricType: string;
    severity: string;
    description: string;
    currentValue: number;
    component?: string;
  }>> {
    const query = `
      SELECT * FROM performance_alerts 
      WHERE status = 'active' 
      ORDER BY severity DESC, timestamp DESC
    `;

    return new Promise((resolve, reject) => {
      this.db.all(query, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        const alerts = rows.map(row => ({
          id: row.id,
          timestamp: new Date(row.timestamp).getTime(),
          metricType: row.metric_type,
          severity: row.severity,
          description: row.description,
          currentValue: row.current_value,
          component: row.component
        }));

        resolve(alerts);
      });
    });
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string): Promise<void> {
    const query = `
      UPDATE performance_alerts 
      SET status = 'resolved', resolved_at = ? 
      WHERE id = ?
    `;

    return new Promise((resolve, reject) => {
      this.db.run(query, [new Date().toISOString(), alertId], function(err) {
        if (err) {
          reject(err);
        } else {
          console.log(`✅ Alert resolved: ${alertId}`);
          resolve();
        }
      });
    });
  }

  /**
   * Start continuous monitoring
   */
  private startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      await this.collectSystemMetrics();
      await this.evaluateAlerts();
    }, this.config.collectionInterval * 1000);

    console.log(`🔄 System monitoring started (interval: ${this.config.collectionInterval}s)`);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('⏹️ System monitoring stopped');
    }
  }

  /**
   * Collect comprehensive system metrics
   */
  private async collectSystemMetrics(): Promise<void> {
    const timestamp = Date.now();

    try {
      // System resource metrics
      await this.collectResourceMetrics(timestamp);
      
      // Application-specific metrics
      await this.collectApplicationMetrics(timestamp);
      
      // Database metrics
      await this.collectDatabaseMetrics(timestamp);
      
      // Cache metrics
      await this.collectCacheMetrics(timestamp);

    } catch (error) {
      console.error('Error collecting system metrics:', error);
    }
  }

  /**
   * Collect system resource metrics
   */
  private async collectResourceMetrics(timestamp: number): Promise<void> {
    // CPU Usage
    const cpuUsage = await this.getCPUUsage();
    await this.recordMetric({
      timestamp,
      metricType: 'resource',
      metricName: 'cpu_usage',
      value: cpuUsage,
      unit: 'percent',
      component: 'system',
      alertThreshold: this.config.thresholds.cpu.warning,
      isHealthy: cpuUsage < this.config.thresholds.cpu.warning
    });

    // Memory Usage
    const memoryUsage = (1 - (os.freemem() / os.totalmem())) * 100;
    await this.recordMetric({
      timestamp,
      metricType: 'resource',
      metricName: 'memory_usage',
      value: memoryUsage,
      unit: 'percent',
      component: 'system',
      alertThreshold: this.config.thresholds.memory.warning,
      isHealthy: memoryUsage < this.config.thresholds.memory.warning
    });

    // Disk Usage
    try {
      const diskUsage = await this.getDiskUsage();
      await this.recordMetric({
        timestamp,
        metricType: 'resource',
        metricName: 'disk_usage',
        value: diskUsage,
        unit: 'percent',
        component: 'system',
        alertThreshold: this.config.thresholds.disk.warning,
        isHealthy: diskUsage < this.config.thresholds.disk.warning
      });
    } catch (error) {
      console.warn('Could not collect disk usage metrics:', error);
    }

    // Load Average
    const loadAverage = os.loadavg()[0];
    await this.recordMetric({
      timestamp,
      metricType: 'performance',
      metricName: 'load_average',
      value: loadAverage,
      unit: 'load',
      component: 'system',
      isHealthy: loadAverage < os.cpus().length
    });
  }

  /**
   * Collect application-specific metrics
   */
  private async collectApplicationMetrics(timestamp: number): Promise<void> {
    // Process memory usage
    const memoryUsage = process.memoryUsage();
    
    await this.recordMetric({
      timestamp,
      metricType: 'performance',
      metricName: 'heap_used',
      value: memoryUsage.heapUsed / 1024 / 1024,
      unit: 'MB',
      component: 'application',
      isHealthy: memoryUsage.heapUsed < memoryUsage.heapTotal * 0.8
    });

    await this.recordMetric({
      timestamp,
      metricType: 'performance',
      metricName: 'heap_total',
      value: memoryUsage.heapTotal / 1024 / 1024,
      unit: 'MB',
      component: 'application',
      isHealthy: true
    });

    // Process uptime
    await this.recordMetric({
      timestamp,
      metricType: 'availability',
      metricName: 'uptime',
      value: process.uptime(),
      unit: 'seconds',
      component: 'application',
      isHealthy: true
    });
  }

  /**
   * Collect database metrics
   */
  private async collectDatabaseMetrics(timestamp: number): Promise<void> {
    try {
      // Database connection status
      const isConnected = await this.testDatabaseConnection();
      await this.recordMetric({
        timestamp,
        metricType: 'availability',
        metricName: 'database_connection',
        value: isConnected ? 1 : 0,
        unit: 'boolean',
        component: 'database',
        isHealthy: isConnected
      });

      if (isConnected) {
        // Database size
        const dbSize = await this.getDatabaseSize();
        await this.recordMetric({
          timestamp,
          metricType: 'resource',
          metricName: 'database_size',
          value: dbSize,
          unit: 'MB',
          component: 'database',
          isHealthy: true
        });
      }
    } catch (error) {
      console.warn('Could not collect database metrics:', error);
    }
  }

  /**
   * Collect cache metrics
   */
  private async collectCacheMetrics(timestamp: number): Promise<void> {
    try {
      // Get cache statistics from database
      const cacheStats = await this.getCacheStatistics();
      
      if (cacheStats) {
        await this.recordMetric({
          timestamp,
          metricType: 'performance',
          metricName: 'cache_hit_rate',
          value: cacheStats.hit_rate,
          unit: 'percent',
          component: 'cache',
          isHealthy: cacheStats.hit_rate > 60
        });

        await this.recordMetric({
          timestamp,
          metricType: 'resource',
          metricName: 'cache_size',
          value: cacheStats.size_mb,
          unit: 'MB',
          component: 'cache',
          isHealthy: true
        });

        await this.recordMetric({
          timestamp,
          metricType: 'performance',
          metricName: 'cache_entries',
          value: cacheStats.entries_count,
          unit: 'count',
          component: 'cache',
          isHealthy: true
        });
      }
    } catch (error) {
      console.warn('Could not collect cache metrics:', error);
    }
  }

  /**
   * Evaluate alerts based on current metrics
   */
  private async evaluateAlerts(): Promise<void> {
    const recentMetrics = await this.getRecentMetrics(5 * 60 * 1000); // Last 5 minutes

    for (const [key, metrics] of Object.entries(recentMetrics)) {
      if (metrics.length === 0) continue;

      const latestMetric = metrics[0];
      const alertConfig = this.alertConfigs.get(latestMetric.metricName);
      
      if (!alertConfig || !alertConfig.enabled) continue;

      const lastAlertTime = this.lastAlerts.get(key) || 0;
      const cooldownMs = alertConfig.cooldownPeriod * 60 * 1000;
      
      if (Date.now() - lastAlertTime < cooldownMs) continue;

      // Check thresholds
      if (latestMetric.value >= alertConfig.criticalThreshold) {
        await this.createAlert(
          latestMetric.metricType,
          'critical',
          `${latestMetric.metricName} critical threshold exceeded: ${latestMetric.value} ${latestMetric.unit}`,
          latestMetric.value,
          alertConfig.criticalThreshold,
          latestMetric.component
        );
        this.lastAlerts.set(key, Date.now());
        
      } else if (latestMetric.value >= alertConfig.warningThreshold) {
        await this.createAlert(
          latestMetric.metricType,
          'medium',
          `${latestMetric.metricName} warning threshold exceeded: ${latestMetric.value} ${latestMetric.unit}`,
          latestMetric.value,
          alertConfig.warningThreshold,
          latestMetric.component
        );
        this.lastAlerts.set(key, Date.now());
      }
    }
  }

  /**
   * Get recent metrics for evaluation
   */
  private async getRecentMetrics(timeRange: number): Promise<Record<string, SystemMetric[]>> {
    const since = new Date(Date.now() - timeRange).toISOString();
    
    const query = `
      SELECT * FROM system_metrics 
      WHERE timestamp >= ? 
      ORDER BY timestamp DESC
    `;

    return new Promise((resolve, reject) => {
      this.db.all(query, [since], (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        const grouped: Record<string, SystemMetric[]> = {};

        rows.forEach(row => {
          const metric: SystemMetric = {
            timestamp: new Date(row.timestamp).getTime(),
            metricType: row.metric_type,
            metricName: row.metric_name,
            value: row.value,
            unit: row.unit,
            component: row.component,
            metadata: JSON.parse(row.metadata || '{}'),
            alertThreshold: row.alert_threshold,
            isHealthy: row.is_healthy === 1
          };

          const key = `${metric.component || 'system'}_${metric.metricName}`;
          
          if (!grouped[key]) {
            grouped[key] = [];
          }
          
          grouped[key].push(metric);
        });

        resolve(grouped);
      });
    });
  }

  /**
   * Initialize alert configurations
   */
  private initializeAlertConfigurations(): void {
    const configs: Array<Partial<AlertConfiguration>> = [
      {
        metricName: 'cpu_usage',
        warningThreshold: this.config.thresholds.cpu.warning,
        criticalThreshold: this.config.thresholds.cpu.critical,
        evaluationWindow: 5,
        cooldownPeriod: 15,
        enabled: true
      },
      {
        metricName: 'memory_usage',
        warningThreshold: this.config.thresholds.memory.warning,
        criticalThreshold: this.config.thresholds.memory.critical,
        evaluationWindow: 5,
        cooldownPeriod: 15,
        enabled: true
      },
      {
        metricName: 'disk_usage',
        warningThreshold: this.config.thresholds.disk.warning,
        criticalThreshold: this.config.thresholds.disk.critical,
        evaluationWindow: 60,
        cooldownPeriod: 60,
        enabled: true
      }
    ];

    configs.forEach(config => {
      if (config.metricName) {
        this.alertConfigs.set(config.metricName, config as AlertConfiguration);
      }
    });
  }

  /**
   * Setup health checkers for different components
   */
  private setupHealthCheckers(): void {
    // System health checker
    this.healthCheckers.set('system', async (): Promise<HealthStatus> => {
      const cpuUsage = await this.getCPUUsage();
      const memoryUsage = (1 - (os.freemem() / os.totalmem())) * 100;
      
      const issues: string[] = [];
      let status: HealthStatus['status'] = 'healthy';
      
      if (cpuUsage > this.config.thresholds.cpu.critical) {
        status = 'critical';
        issues.push(`Critical CPU usage: ${cpuUsage.toFixed(1)}%`);
      } else if (cpuUsage > this.config.thresholds.cpu.warning) {
        status = 'warning';
        issues.push(`High CPU usage: ${cpuUsage.toFixed(1)}%`);
      }
      
      if (memoryUsage > this.config.thresholds.memory.critical) {
        status = 'critical';
        issues.push(`Critical memory usage: ${memoryUsage.toFixed(1)}%`);
      } else if (memoryUsage > this.config.thresholds.memory.warning) {
        status = status === 'critical' ? 'critical' : 'warning';
        issues.push(`High memory usage: ${memoryUsage.toFixed(1)}%`);
      }

      return {
        component: 'system',
        status,
        lastCheck: Date.now(),
        metrics: {
          cpu_usage: cpuUsage,
          memory_usage: memoryUsage,
          load_average: os.loadavg()[0]
        },
        issues
      };
    });

    // Database health checker
    this.healthCheckers.set('database', async (): Promise<HealthStatus> => {
      const isConnected = await this.testDatabaseConnection();
      
      return {
        component: 'database',
        status: isConnected ? 'healthy' : 'critical',
        lastCheck: Date.now(),
        metrics: {
          connection_status: isConnected ? 1 : 0
        },
        issues: isConnected ? [] : ['Database connection failed']
      };
    });
  }

  /**
   * Helper methods
   */
  private async getCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = process.hrtime.bigint();
      
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const endTime = process.hrtime.bigint();
        
        const totalTime = Number(endTime - startTime) / 1000000; // Convert to ms
        const totalCPU = (endUsage.user + endUsage.system) / 1000; // Convert to ms
        
        const usage = (totalCPU / totalTime) * 100;
        resolve(Math.min(100, Math.max(0, usage)));
      }, 100);
    });
  }

  private async getDiskUsage(): Promise<number> {
    return new Promise((resolve, reject) => {
      fs.stat(process.cwd(), (err, stats) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Simplified disk usage calculation
        // In production, you might want to use a more sophisticated approach
        resolve(75); // Placeholder value
      });
    });
  }

  private async testDatabaseConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      this.db.get("SELECT 1", (err) => {
        resolve(!err);
      });
    });
  }

  private async getDatabaseSize(): Promise<number> {
    return new Promise((resolve) => {
      this.db.get(
        "SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()",
        (err, row: any) => {
          if (err) {
            resolve(0);
          } else {
            resolve((row?.size || 0) / 1024 / 1024); // Convert to MB
          }
        }
      );
    });
  }

  private async getCacheStatistics(): Promise<{
    hit_rate: number;
    size_mb: number;
    entries_count: number;
  } | null> {
    return new Promise((resolve) => {
      this.db.get(
        "SELECT * FROM cache_stats ORDER BY timestamp DESC LIMIT 1",
        (err, row: any) => {
          if (err || !row) {
            resolve(null);
          } else {
            resolve({
              hit_rate: row.hit_rate || 0,
              size_mb: row.size_mb || 0,
              entries_count: row.entries_count || 0
            });
          }
        }
      );
    });
  }

  private async sendAlertNotification(
    severity: string,
    description: string,
    value: number,
    component?: string
  ): Promise<void> {
    // Placeholder for alert notification logic
    // In production, implement webhook, email, or Slack notifications
    const message = `[${severity.toUpperCase()}] ${component || 'System'}: ${description} (Value: ${value})`;
    console.warn(`📢 Alert Notification: ${message}`);
  }

  /**
   * Get configuration
   */
  getConfiguration(): MonitoringConfiguration {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfiguration(newConfig: Partial<MonitoringConfiguration>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.enabled && !this.monitoringInterval) {
      this.startMonitoring();
    } else if (!this.config.enabled && this.monitoringInterval) {
      this.stopMonitoring();
    }
    
    console.log('⚙️ System monitoring configuration updated');
  }
}