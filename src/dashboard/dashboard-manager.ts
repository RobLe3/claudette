// Dashboard Manager - Central orchestrator for monitoring and analytics dashboards
// Real-time visualization, performance tracking, and system health overview

import { Database } from 'sqlite3';
import { EventEmitter } from 'events';
import { SystemMonitor, SystemMetric, HealthStatus } from '../monitoring/system-monitor';
import { PerformanceAnalytics, PerformanceReport } from '../analytics/performance/performance-analytics';

export interface DashboardConfiguration {
  realTimeUpdates: {
    enabled: boolean;
    updateInterval: number; // milliseconds
    maxDataPoints: number;
    compressionEnabled: boolean;
  };
  visualization: {
    theme: 'light' | 'dark' | 'auto';
    refreshRate: number; // seconds
    animationsEnabled: boolean;
    responsiveLayout: boolean;
  };
  alerts: {
    enabled: boolean;
    soundNotifications: boolean;
    desktopNotifications: boolean;
    emailNotifications: boolean;
    webhookUrl?: string;
  };
  widgets: {
    systemHealth: boolean;
    performanceMetrics: boolean;
    costAnalytics: boolean;
    backendComparison: boolean;
    ragPerformance: boolean;
    mlRoutingEffectiveness: boolean;
    alertsPanel: boolean;
    forecastingPanel: boolean;
  };
  dataRetention: {
    realTimeMinutes: number;
    historicalDays: number;
    aggregationLevels: ('minute' | 'hour' | 'day' | 'week')[];
  };
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'alert' | 'map' | 'gauge';
  title: string;
  description?: string;
  data: any;
  config: {
    refreshInterval?: number;
    height?: number;
    width?: number;
    position?: { x: number; y: number };
    chartType?: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
    colorScheme?: string[];
    thresholds?: { warning: number; critical: number };
  };
  lastUpdated: number;
  status: 'healthy' | 'warning' | 'critical' | 'loading' | 'error';
}

export interface DashboardState {
  layout: {
    widgets: DashboardWidget[];
    columns: number;
    responsive: boolean;
  };
  filters: {
    timeRange: { start: number; end: number };
    backends: string[];
    metrics: string[];
    components: string[];
  };
  user: {
    preferences: Record<string, any>;
    customizations: Record<string, any>;
  };
  performance: {
    renderTime: number;
    dataFetchTime: number;
    updateCount: number;
    errorCount: number;
  };
}

export interface RealTimeData {
  timestamp: number;
  metrics: {
    system: Record<string, number>;
    performance: Record<string, number>;
    costs: Record<string, number>;
    alerts: number;
  };
  health: {
    overall: 'healthy' | 'warning' | 'critical';
    components: Record<string, 'healthy' | 'warning' | 'critical'>;
  };
  trends: {
    latency: Array<{ timestamp: number; value: number }>;
    cost: Array<{ timestamp: number; value: number }>;
    throughput: Array<{ timestamp: number; value: number }>;
    errorRate: Array<{ timestamp: number; value: number }>;
  };
}

export class DashboardManager extends EventEmitter {
  private db: Database;
  private systemMonitor: SystemMonitor;
  private performanceAnalytics: PerformanceAnalytics;
  private config: DashboardConfiguration;
  private state: DashboardState;
  private realTimeInterval: NodeJS.Timeout | null = null;
  private dataCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private widgets: Map<string, DashboardWidget> = new Map();
  private isStreaming: boolean = false;

  constructor(
    db: Database,
    systemMonitor: SystemMonitor,
    performanceAnalytics: PerformanceAnalytics,
    config: Partial<DashboardConfiguration> = {}
  ) {
    super();
    
    this.db = db;
    this.systemMonitor = systemMonitor;
    this.performanceAnalytics = performanceAnalytics;
    
    this.config = {
      realTimeUpdates: {
        enabled: true,
        updateInterval: 5000, // 5 seconds
        maxDataPoints: 100,
        compressionEnabled: true
      },
      visualization: {
        theme: 'dark',
        refreshRate: 30, // 30 seconds
        animationsEnabled: true,
        responsiveLayout: true
      },
      alerts: {
        enabled: true,
        soundNotifications: false,
        desktopNotifications: true,
        emailNotifications: false
      },
      widgets: {
        systemHealth: true,
        performanceMetrics: true,
        costAnalytics: true,
        backendComparison: true,
        ragPerformance: true,
        mlRoutingEffectiveness: true,
        alertsPanel: true,
        forecastingPanel: true
      },
      dataRetention: {
        realTimeMinutes: 60,
        historicalDays: 7,
        aggregationLevels: ['minute', 'hour', 'day']
      },
      ...config
    };

    this.state = {
      layout: {
        widgets: [],
        columns: 3,
        responsive: true
      },
      filters: {
        timeRange: { 
          start: Date.now() - 3600000, // Last hour
          end: Date.now() 
        },
        backends: [],
        metrics: [],
        components: []
      },
      user: {
        preferences: {},
        customizations: {}
      },
      performance: {
        renderTime: 0,
        dataFetchTime: 0,
        updateCount: 0,
        errorCount: 0
      }
    };

    this.initializeWidgets();
    
    if (this.config.realTimeUpdates.enabled) {
      this.startRealTimeUpdates();
    }

    console.log('📊 Dashboard Manager initialized with comprehensive monitoring');
  }

  /**
   * Get current dashboard state
   */
  getDashboardState(): DashboardState {
    return { ...this.state };
  }

  /**
   * Get real-time data for dashboard
   */
  async getRealTimeData(): Promise<RealTimeData> {
    const startTime = Date.now();
    
    try {
      // Get system health
      const systemHealth = await this.systemMonitor.getSystemHealth();
      
      // Get performance dashboard data
      const performanceData = this.performanceAnalytics.getDashboardData();
      
      // Get active alerts
      const activeAlerts = await this.systemMonitor.getActiveAlerts();
      
      // Calculate overall health
      const healthComponents = Object.values(systemHealth);
      let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
      
      if (healthComponents.some(h => h.status === 'critical')) {
        overallHealth = 'critical';
      } else if (healthComponents.some(h => h.status === 'warning')) {
        overallHealth = 'warning';
      }

      // Build component health map
      const componentHealthMap: Record<string, 'healthy' | 'warning' | 'critical'> = {};
      Object.values(systemHealth).forEach(health => {
        // Map 'unknown' to 'warning' for display purposes
        const mappedStatus = health.status === 'unknown' ? 'warning' : health.status;
        componentHealthMap[health.component] = mappedStatus;
      });

      // Get performance metrics for trends
      const performanceMetrics = await this.systemMonitor.getPerformanceMetrics(3600000); // Last hour
      
      const realTimeData: RealTimeData = {
        timestamp: Date.now(),
        metrics: {
          system: this.extractSystemMetrics(performanceMetrics.current),
          performance: performanceData.currentMetrics,
          costs: this.extractCostMetrics(performanceMetrics.current),
          alerts: activeAlerts.length
        },
        health: {
          overall: overallHealth,
          components: componentHealthMap
        },
        trends: {
          latency: this.extractTrendData(performanceMetrics.trends, 'latency'),
          cost: this.extractTrendData(performanceMetrics.trends, 'cost'),
          throughput: this.extractTrendData(performanceMetrics.trends, 'throughput'),
          errorRate: this.extractTrendData(performanceMetrics.trends, 'success_rate', true) // Invert for error rate
        }
      };

      // Update performance metrics
      this.state.performance.dataFetchTime = Date.now() - startTime;
      this.state.performance.updateCount++;

      // Cache the data
      this.cacheData('realTimeData', realTimeData, 30000); // Cache for 30 seconds

      return realTimeData;
    } catch (error) {
      this.state.performance.errorCount++;
      console.error('Error fetching real-time dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get widget by ID
   */
  getWidget(widgetId: string): DashboardWidget | null {
    return this.widgets.get(widgetId) || null;
  }

  /**
   * Update widget configuration
   */
  updateWidget(widgetId: string, updates: Partial<DashboardWidget>): void {
    const widget = this.widgets.get(widgetId);
    if (widget) {
      const updatedWidget = { ...widget, ...updates, lastUpdated: Date.now() };
      this.widgets.set(widgetId, updatedWidget);
      this.emit('widgetUpdated', updatedWidget);
    }
  }

  /**
   * Add custom widget
   */
  addWidget(widget: Omit<DashboardWidget, 'lastUpdated' | 'status'>): void {
    const fullWidget: DashboardWidget = {
      ...widget,
      lastUpdated: Date.now(),
      status: 'loading'
    };
    
    this.widgets.set(widget.id, fullWidget);
    this.state.layout.widgets.push(fullWidget);
    this.emit('widgetAdded', fullWidget);
  }

  /**
   * Remove widget
   */
  removeWidget(widgetId: string): void {
    this.widgets.delete(widgetId);
    this.state.layout.widgets = this.state.layout.widgets.filter(w => w.id !== widgetId);
    this.emit('widgetRemoved', widgetId);
  }

  /**
   * Update dashboard filters
   */
  updateFilters(filters: Partial<DashboardState['filters']>): void {
    this.state.filters = { ...this.state.filters, ...filters };
    this.emit('filtersUpdated', this.state.filters);
    
    // Refresh widgets that depend on filters
    this.refreshFilteredWidgets();
  }

  /**
   * Get historical data for charts
   */
  async getHistoricalData(
    metric: string,
    timeRange: { start: number; end: number },
    aggregation: 'minute' | 'hour' | 'day' = 'hour'
  ): Promise<Array<{ timestamp: number; value: number; metadata?: any }>> {
    
    const cacheKey = `historical_${metric}_${timeRange.start}_${timeRange.end}_${aggregation}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const query = this.buildHistoricalQuery(metric, timeRange, aggregation);
      const data = await this.executeQuery(query);
      
      const processed = data.map((row: any) => ({
        timestamp: new Date(row.timestamp).getTime(),
        value: parseFloat(row.value) || 0,
        metadata: row.metadata ? JSON.parse(row.metadata) : {}
      }));

      // Cache the data
      this.cacheData(cacheKey, processed, 300000); // Cache for 5 minutes
      
      return processed;
    } catch (error) {
      console.error(`Error fetching historical data for ${metric}:`, error);
      return [];
    }
  }

  /**
   * Generate performance report for dashboard
   */
  async generateDashboardReport(
    startTime?: number,
    endTime?: number
  ): Promise<PerformanceReport> {
    return await this.performanceAnalytics.generateReport(startTime, endTime);
  }

  /**
   * Export dashboard configuration
   */
  exportDashboardConfig(): {
    config: DashboardConfiguration;
    state: DashboardState;
    widgets: DashboardWidget[];
  } {
    return {
      config: this.config,
      state: this.state,
      widgets: Array.from(this.widgets.values())
    };
  }

  /**
   * Import dashboard configuration
   */
  importDashboardConfig(dashboardConfig: {
    config?: Partial<DashboardConfiguration>;
    state?: Partial<DashboardState>;
    widgets?: DashboardWidget[];
  }): void {
    
    if (dashboardConfig.config) {
      this.config = { ...this.config, ...dashboardConfig.config };
    }
    
    if (dashboardConfig.state) {
      this.state = { ...this.state, ...dashboardConfig.state };
    }
    
    if (dashboardConfig.widgets) {
      this.widgets.clear();
      dashboardConfig.widgets.forEach(widget => {
        this.widgets.set(widget.id, widget);
      });
      this.state.layout.widgets = dashboardConfig.widgets;
    }

    this.emit('configurationImported');
    console.log('📊 Dashboard configuration imported successfully');
  }

  /**
   * Start real-time data streaming
   */
  startRealTimeStream(): void {
    if (this.isStreaming) return;
    
    this.isStreaming = true;
    this.emit('streamStarted');
    
    // Start performance tracking
    const streamStartTime = Date.now();
    
    // Emit real-time updates
    const streamInterval = setInterval(async () => {
      try {
        const realTimeData = await this.getRealTimeData();
        this.emit('realTimeUpdate', realTimeData);
      } catch (error) {
        console.error('Error in real-time stream:', error);
        this.emit('streamError', error);
      }
    }, this.config.realTimeUpdates.updateInterval);

    // Store interval for cleanup
    this.realTimeInterval = streamInterval;
    
    console.log(`📊 Real-time dashboard streaming started (${this.config.realTimeUpdates.updateInterval}ms interval)`);
  }

  /**
   * Stop real-time data streaming
   */
  stopRealTimeStream(): void {
    if (!this.isStreaming) return;
    
    this.isStreaming = false;
    
    if (this.realTimeInterval) {
      clearInterval(this.realTimeInterval);
      this.realTimeInterval = null;
    }
    
    this.emit('streamStopped');
    console.log('📊 Real-time dashboard streaming stopped');
  }

  /**
   * Get dashboard performance statistics
   */
  getPerformanceStats(): {
    renderTime: number;
    dataFetchTime: number;
    updateCount: number;
    errorCount: number;
    cacheHitRate: number;
    memoryUsage: number;
  } {
    const totalRequests = this.state.performance.updateCount;
    const cacheRequests = Array.from(this.dataCache.values()).length;
    const cacheHitRate = totalRequests > 0 ? (cacheRequests / totalRequests) * 100 : 0;
    
    return {
      ...this.state.performance,
      cacheHitRate,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 // MB
    };
  }

  // Private helper methods
  private initializeWidgets(): void {
    const defaultWidgets: Array<Omit<DashboardWidget, 'lastUpdated' | 'status'>> = [
      {
        id: 'system-health',
        type: 'gauge',
        title: 'System Health',
        description: 'Overall system health status',
        data: {},
        config: {
          refreshInterval: 30000,
          height: 200,
          chartType: 'pie',
          colorScheme: ['#28a745', '#ffc107', '#dc3545'],
          thresholds: { warning: 70, critical: 90 }
        }
      },
      {
        id: 'performance-metrics',
        type: 'chart',
        title: 'Performance Metrics',
        description: 'Real-time performance trends',
        data: {},
        config: {
          refreshInterval: 5000,
          height: 300,
          chartType: 'line',
          colorScheme: ['#007bff', '#28a745', '#ffc107', '#dc3545']
        }
      },
      {
        id: 'cost-analytics',
        type: 'chart',
        title: 'Cost Analytics',
        description: 'Cost trends and optimization metrics',
        data: {},
        config: {
          refreshInterval: 60000,
          height: 250,
          chartType: 'area',
          colorScheme: ['#17a2b8', '#6610f2']
        }
      },
      {
        id: 'backend-comparison',
        type: 'table',
        title: 'Backend Comparison',
        description: 'Comparative performance across backends',
        data: {},
        config: {
          refreshInterval: 30000,
          height: 400
        }
      },
      {
        id: 'active-alerts',
        type: 'alert',
        title: 'Active Alerts',
        description: 'Current system alerts and warnings',
        data: {},
        config: {
          refreshInterval: 10000,
          height: 200,
          thresholds: { warning: 1, critical: 3 }
        }
      }
    ];

    defaultWidgets.forEach(widget => {
      const fullWidget: DashboardWidget = {
        ...widget,
        lastUpdated: Date.now(),
        status: 'loading'
      };
      this.widgets.set(widget.id, fullWidget);
      this.state.layout.widgets.push(fullWidget);
    });
  }

  private startRealTimeUpdates(): void {
    this.realTimeInterval = setInterval(async () => {
      await this.updateAllWidgets();
    }, this.config.realTimeUpdates.updateInterval);
  }

  private async updateAllWidgets(): Promise<void> {
    const updatePromises = Array.from(this.widgets.values()).map(widget => 
      this.updateWidgetData(widget)
    );
    
    await Promise.allSettled(updatePromises);
  }

  private async updateWidgetData(widget: DashboardWidget): Promise<void> {
    try {
      widget.status = 'loading';
      
      let data;
      switch (widget.id) {
        case 'system-health':
          data = await this.getSystemHealthData();
          break;
        case 'performance-metrics':
          data = await this.getPerformanceMetricsData();
          break;
        case 'cost-analytics':
          data = await this.getCostAnalyticsData();
          break;
        case 'backend-comparison':
          data = await this.getBackendComparisonData();
          break;
        case 'active-alerts':
          data = await this.getActiveAlertsData();
          break;
        default:
          data = {};
      }
      
      widget.data = data;
      widget.lastUpdated = Date.now();
      widget.status = 'healthy';
      
      this.emit('widgetUpdated', widget);
    } catch (error) {
      widget.status = 'error';
      console.error(`Error updating widget ${widget.id}:`, error);
    }
  }

  private async getSystemHealthData(): Promise<any> {
    const health = await this.systemMonitor.getSystemHealth();
    return {
      overall: this.calculateOverallHealth(health),
      components: health,
      lastCheck: Date.now()
    };
  }

  private async getPerformanceMetricsData(): Promise<any> {
    const metrics = await this.systemMonitor.getPerformanceMetrics(300000); // Last 5 minutes
    return {
      current: metrics.current,
      trends: metrics.trends
    };
  }

  private async getCostAnalyticsData(): Promise<any> {
    // Get cost data from database
    const query = `
      SELECT 
        strftime('%Y-%m-%d %H:00:00', timestamp) as hour,
        SUM(cost_eur) as total_cost,
        COUNT(*) as requests
      FROM quota_ledger 
      WHERE timestamp >= datetime('now', '-24 hours')
      GROUP BY strftime('%Y-%m-%d %H:00:00', timestamp)
      ORDER BY hour DESC
    `;
    
    const data = await this.executeQuery(query);
    return {
      hourly: data,
      totalToday: data.reduce((sum: number, row: any) => sum + row.total_cost, 0)
    };
  }

  private async getBackendComparisonData(): Promise<any> {
    const query = `
      SELECT 
        backend,
        COUNT(*) as requests,
        AVG(latency_ms) as avg_latency,
        SUM(cost_eur) as total_cost,
        AVG(cost_eur) as avg_cost
      FROM quota_ledger 
      WHERE timestamp >= datetime('now', '-1 hour')
      GROUP BY backend
      ORDER BY requests DESC
    `;
    
    return await this.executeQuery(query);
  }

  private async getActiveAlertsData(): Promise<any> {
    const alerts = await this.systemMonitor.getActiveAlerts();
    return {
      alerts,
      counts: {
        critical: alerts.filter(a => a.severity === 'critical').length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length
      }
    };
  }

  private calculateOverallHealth(healthData: Record<string, HealthStatus>): 'healthy' | 'warning' | 'critical' {
    const statuses = Object.values(healthData).map(h => h.status);
    
    if (statuses.includes('critical')) return 'critical';
    if (statuses.includes('warning')) return 'warning';
    return 'healthy';
  }

  private extractSystemMetrics(metrics: Record<string, SystemMetric[]>): Record<string, number> {
    const systemMetrics: Record<string, number> = {};
    
    Object.entries(metrics).forEach(([key, metricArray]) => {
      if (metricArray.length > 0) {
        systemMetrics[key] = metricArray[0].value;
      }
    });
    
    return systemMetrics;
  }

  private extractCostMetrics(metrics: Record<string, SystemMetric[]>): Record<string, number> {
    const costMetrics: Record<string, number> = {};
    
    Object.entries(metrics).forEach(([key, metricArray]) => {
      if (key.includes('cost') && metricArray.length > 0) {
        costMetrics[key] = metricArray[0].value;
      }
    });
    
    return costMetrics;
  }

  private extractTrendData(
    trends: Record<string, Array<{ timestamp: number; value: number }>>,
    metricType: string,
    invert: boolean = false
  ): Array<{ timestamp: number; value: number }> {
    
    for (const [key, data] of Object.entries(trends)) {
      if (key.includes(metricType)) {
        return invert ? data.map(d => ({ ...d, value: 1 - d.value })) : data;
      }
    }
    
    return [];
  }

  private buildHistoricalQuery(
    metric: string,
    timeRange: { start: number; end: number },
    aggregation: 'minute' | 'hour' | 'day'
  ): string {
    
    const startDate = new Date(timeRange.start).toISOString();
    const endDate = new Date(timeRange.end).toISOString();
    
    let timeFormat: string;
    switch (aggregation) {
      case 'minute':
        timeFormat = '%Y-%m-%d %H:%M:00';
        break;
      case 'hour':
        timeFormat = '%Y-%m-%d %H:00:00';
        break;
      case 'day':
        timeFormat = '%Y-%m-%d 00:00:00';
        break;
    }
    
    return `
      SELECT 
        strftime('${timeFormat}', timestamp) as timestamp,
        AVG(value) as value,
        COUNT(*) as count,
        metadata
      FROM system_metrics
      WHERE metric_name = '${metric}'
        AND timestamp >= '${startDate}'
        AND timestamp <= '${endDate}'
      GROUP BY strftime('${timeFormat}', timestamp)
      ORDER BY timestamp
    `;
  }

  private async executeQuery(query: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  private cacheData(key: string, data: any, ttl: number): void {
    this.dataCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    // Clean up expired cache entries
    setTimeout(() => {
      this.dataCache.delete(key);
    }, ttl);
  }

  private getCachedData(key: string): any | null {
    const cached = this.dataCache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    
    this.dataCache.delete(key);
    return null;
  }

  private refreshFilteredWidgets(): void {
    // Refresh widgets that depend on current filters
    const dependentWidgets = ['performance-metrics', 'cost-analytics', 'backend-comparison'];
    
    dependentWidgets.forEach(widgetId => {
      const widget = this.widgets.get(widgetId);
      if (widget) {
        this.updateWidgetData(widget);
      }
    });
  }

  /**
   * Get dashboard configuration
   */
  getConfiguration(): DashboardConfiguration {
    return { ...this.config };
  }

  /**
   * Update dashboard configuration
   */
  updateConfiguration(newConfig: Partial<DashboardConfiguration>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart real-time updates if interval changed
    if (newConfig.realTimeUpdates && this.realTimeInterval) {
      this.stopRealTimeStream();
      this.startRealTimeStream();
    }
    
    this.emit('configurationUpdated', this.config);
    console.log('⚙️ Dashboard configuration updated');
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopRealTimeStream();
    this.dataCache.clear();
    this.widgets.clear();
    this.removeAllListeners();
    console.log('🧹 Dashboard Manager destroyed');
  }
}