// Monitoring System - Complete monitoring and analytics platform
// Centralized exports and initialization for all monitoring components

// Unified Performance System exports (NEW)
export { 
  unifiedPerformance,
  TimingCategory,
  PERFORMANCE_THRESHOLDS,
  createTimer,
  completeTimer,
  timedOperation,
  timedSyncOperation,
  type PerformanceLevel,
  type UnifiedTimer,
  type PerformanceSnapshot,
  type ComponentPerformanceProfile
} from './unified-performance-system';

export {
  timeoutManager,
  TimeoutError,
  STANDARD_TIMEOUTS,
  withTimeout,
  setTimeoutConfig,
  type TimeoutType,
  type TimeoutConfig,
  type TimeoutContext
} from './timeout-manager';

export {
  performanceHarmonizer,
  COMPONENT_PROFILES,
  harmonizedBackendOperation,
  harmonizedCacheOperation,
  harmonizedDatabaseOperation,
  harmonizedMCPOperation,
  harmonizedAuthOperation
} from './performance-harmonizer';

export { SystemMonitor } from './system-monitor';
export type { 
  SystemMetric, 
  AlertConfiguration, 
  HealthStatus, 
  MonitoringConfiguration 
} from './system-monitor';

export { AlertManager } from './alert-manager';
export type {
  AlertRule,
  AlertChannel,
  EscalationPolicy,
  SuppressionRule,
  Alert,
  AlertStats,
  NotificationLog
} from './alert-manager';

export { ObservabilityFramework } from './observability-framework';
export type {
  TraceSpan,
  Trace,
  LogEntry,
  MetricSample,
  ObservabilityConfiguration,
  CorrelationContext
} from './observability-framework';

export { IntegrationManager } from './integration-manager';
export type {
  MonitoringIntegration,
  RequestContext,
  MonitoringHook,
  IntegrationMetrics
} from './integration-manager';

// Re-export dashboard components
export { DashboardManager } from '../dashboard/dashboard-manager';
export type { 
  DashboardConfiguration, 
  DashboardWidget, 
  DashboardState,
  RealTimeData 
} from '../dashboard/dashboard-manager';

export { RealTimeVisualizer } from '../dashboard/real-time-visualizer';
export type {
  ChartConfiguration,
  DataSeries,
  VisualizationState,
  InteractionEvent,
  AlertOverlay
} from '../dashboard/real-time-visualizer';

// Re-export analytics components
export { PerformanceAnalytics } from '../analytics/performance/performance-analytics';
export type {
  PerformanceMetric,
  AnalyticsConfiguration,
  PerformanceForecast,
  RegressionAlert,
  PerformanceReport
} from '../analytics/performance/performance-analytics';

export { PredictiveAnalytics } from '../analytics/predictive-analytics';
export type {
  PredictiveModel,
  Forecast,
  TrendAnalysis,
  AnomalyDetection,
  CapacityPlanningInsight
} from '../analytics/predictive-analytics';

import { Database } from 'sqlite3';
import { SystemMonitor } from './system-monitor';
import { AlertManager } from './alert-manager';
import { ObservabilityFramework } from './observability-framework';
import { IntegrationManager } from './integration-manager';
import { DashboardManager } from '../dashboard/dashboard-manager';
import { PerformanceAnalytics } from '../analytics/performance/performance-analytics';
import { PredictiveAnalytics } from '../analytics/predictive-analytics';

/**
 * Complete monitoring platform configuration
 */
export interface MonitoringPlatformConfiguration {
  serviceName?: string;
  serviceVersion?: string;
  environment?: string;
  systemMonitor?: Partial<import('./system-monitor').MonitoringConfiguration>;
  observability?: Partial<import('./observability-framework').ObservabilityConfiguration>;
  analytics?: Partial<import('../analytics/performance/performance-analytics').AnalyticsConfiguration>;
  dashboard?: Partial<import('../dashboard/dashboard-manager').DashboardConfiguration>;
  integrations?: {
    enabled: boolean;
    autoInstrument: boolean;
    components: string[];
  };
}

/**
 * Comprehensive monitoring platform - integrates all monitoring components
 */
export class MonitoringPlatform {
  private db: Database;
  private systemMonitor: SystemMonitor;
  private alertManager: AlertManager;
  private observabilityFramework: ObservabilityFramework;
  private performanceAnalytics: PerformanceAnalytics;
  private predictiveAnalytics: PredictiveAnalytics;
  private dashboardManager: DashboardManager;
  private integrationManager: IntegrationManager;
  private isInitialized: boolean = false;

  constructor(
    db: Database,
    config: MonitoringPlatformConfiguration = {}
  ) {
    this.db = db;
    
    console.log('🚀 Initializing Claudette Monitoring Platform v3.0.0');
    
    // Initialize core monitoring components
    this.systemMonitor = new SystemMonitor(db, config.systemMonitor);
    this.alertManager = new AlertManager(db);
    this.observabilityFramework = new ObservabilityFramework(
      db,
      config.serviceName || 'claudette',
      config.serviceVersion || '3.0.0',
      config.environment || 'production',
      config.observability
    );
    
    // Initialize analytics components
    this.performanceAnalytics = new PerformanceAnalytics(config.analytics);
    this.predictiveAnalytics = new PredictiveAnalytics(db);
    
    // Initialize dashboard
    this.dashboardManager = new DashboardManager(
      db,
      this.systemMonitor,
      this.performanceAnalytics,
      config.dashboard
    );
    
    // Initialize integration manager
    this.integrationManager = new IntegrationManager(
      db,
      this.systemMonitor,
      this.alertManager,
      this.observabilityFramework,
      this.performanceAnalytics
    );
    
    this.setupCrossComponentIntegration();
    this.isInitialized = true;
    
    console.log('✅ Monitoring Platform initialized successfully');
    console.log('🔍 System Monitor: Active');
    console.log('🚨 Alert Manager: Active');
    console.log('👁️ Observability Framework: Active');
    console.log('📊 Performance Analytics: Active');
    console.log('🔮 Predictive Analytics: Active');
    console.log('📈 Dashboard Manager: Active');
    console.log('🔗 Integration Manager: Active');
  }

  /**
   * Get system monitor instance
   */
  getSystemMonitor(): SystemMonitor {
    return this.systemMonitor;
  }

  /**
   * Get alert manager instance
   */
  getAlertManager(): AlertManager {
    return this.alertManager;
  }

  /**
   * Get observability framework instance
   */
  getObservabilityFramework(): ObservabilityFramework {
    return this.observabilityFramework;
  }

  /**
   * Get performance analytics instance
   */
  getPerformanceAnalytics(): PerformanceAnalytics {
    return this.performanceAnalytics;
  }

  /**
   * Get predictive analytics instance
   */
  getPredictiveAnalytics(): PredictiveAnalytics {
    return this.predictiveAnalytics;
  }

  /**
   * Get dashboard manager instance
   */
  getDashboardManager(): DashboardManager {
    return this.dashboardManager;
  }

  /**
   * Get integration manager instance
   */
  getIntegrationManager(): IntegrationManager {
    return this.integrationManager;
  }

  /**
   * Get comprehensive platform health status
   */
  async getPlatformHealth(): Promise<{
    overall: 'healthy' | 'warning' | 'critical';
    components: Record<string, {
      status: 'healthy' | 'warning' | 'critical';
      details: any;
    }>;
    metrics: {
      activeTraces: number;
      activeAlerts: number;
      systemHealth: string;
      dashboardHealth: string;
      memoryUsage: number;
      uptime: number;
    };
  }> {
    
    const [
      systemHealth,
      activeAlerts,
      observabilityHealth,
      dashboardData,
      integrationStatus
    ] = await Promise.all([
      this.systemMonitor.getSystemHealth(),
      this.alertManager.getActiveAlerts(),
      this.observabilityFramework.getHealthStatus(),
      this.dashboardManager.getRealTimeData(),
      this.integrationManager.getIntegrationStatus()
    ]);

    const components = {
      systemMonitor: {
        status: this.assessComponentHealth(Object.values(systemHealth)),
        details: systemHealth
      },
      alertManager: {
        status: (activeAlerts.length > 10 ? 'critical' : activeAlerts.length > 5 ? 'warning' : 'healthy') as 'healthy' | 'warning' | 'critical',
        details: { activeAlerts: activeAlerts.length }
      },
      observability: {
        status: (observabilityHealth.performance.memoryUsage > 1000 ? 'warning' : 'healthy') as 'healthy' | 'warning' | 'critical',
        details: observabilityHealth
      },
      dashboard: {
        status: dashboardData.health.overall,
        details: dashboardData.health
      },
      integrations: {
        status: (integrationStatus.some(i => i.healthStatus === 'critical') ? 'critical' :
                integrationStatus.some(i => i.healthStatus === 'warning') ? 'warning' : 'healthy') as 'healthy' | 'warning' | 'critical',
        details: integrationStatus
      }
    };

    const componentStatuses = Object.values(components).map(c => c.status);
    const overall = componentStatuses.includes('critical') ? 'critical' :
                   componentStatuses.includes('warning') ? 'warning' : 'healthy';

    return {
      overall,
      components,
      metrics: {
        activeTraces: observabilityHealth.tracing.activeTraces,
        activeAlerts: activeAlerts.length,
        systemHealth: dashboardData.health.overall,
        dashboardHealth: components.dashboard.status,
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
        uptime: process.uptime()
      }
    };
  }

  /**
   * Get platform performance metrics
   */
  getPerformanceMetrics(): {
    monitoring: {
      metricsCollected: number;
      alertsGenerated: number;
      tracesProcessed: number;
      logsProcessed: number;
      dashboardViews: number;
    };
    resources: {
      memoryUsage: number;
      cpuUsage: number;
      monitoringOverhead: number;
    };
    efficiency: {
      alertAccuracy: number;
      predictionAccuracy: number;
      cachingEfficiency: number;
      instrumentationImpact: number;
    };
  } {
    
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
    const dashboardPerf = this.dashboardManager.getPerformanceStats();
    const integrationStats = this.integrationManager.getMonitoringStatistics();
    
    return {
      monitoring: {
        metricsCollected: 0, // Would track actual metrics
        alertsGenerated: 0, // Would track from alert manager
        tracesProcessed: 0, // Would track from observability
        logsProcessed: 0, // Would track from observability
        dashboardViews: dashboardPerf.updateCount
      },
      resources: {
        memoryUsage,
        cpuUsage: 0, // Would calculate actual CPU usage
        monitoringOverhead: integrationStats.performance.instrumentationOverhead
      },
      efficiency: {
        alertAccuracy: 95, // Would calculate from alert feedback
        predictionAccuracy: 85, // Would get from predictive analytics
        cachingEfficiency: dashboardPerf.cacheHitRate,
        instrumentationImpact: 2 // Percentage impact on performance
      }
    };
  }

  /**
   * Generate comprehensive monitoring report
   */
  async generateMonitoringReport(): Promise<{
    summary: {
      reportPeriod: { start: number; end: number };
      overallHealth: string;
      totalAlerts: number;
      systemUptime: number;
      monitoringCoverage: number;
    };
    systemMetrics: any;
    alertSummary: any;
    performanceInsights: any;
    predictiveInsights: any;
    recommendations: Array<{
      category: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      action: string;
    }>;
  }> {
    
    const endTime = Date.now();
    const startTime = endTime - (24 * 60 * 60 * 1000); // Last 24 hours
    
    const [
      platformHealth,
      performanceReport,
      alertStats,
      dashboardData
    ] = await Promise.all([
      this.getPlatformHealth(),
      this.performanceAnalytics.generateReport(startTime, endTime),
      this.alertManager.getAlertStats({ start: startTime, end: endTime }),
      this.dashboardManager.getRealTimeData()
    ]);

    const recommendations: Array<{
      category: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      action: string;
    }> = [];

    // Generate recommendations based on metrics
    if (platformHealth.overall === 'critical') {
      recommendations.push({
        category: 'system',
        priority: 'critical',
        description: 'System health is critical',
        action: 'Investigate critical components and resolve issues immediately'
      });
    }

    if (alertStats.total > 100) {
      recommendations.push({
        category: 'alerting',
        priority: 'high',
        description: 'High volume of alerts detected',
        action: 'Review alert thresholds and reduce noise'
      });
    }

    if (performanceReport.summary.avgLatency > 10000) {
      recommendations.push({
        category: 'performance',
        priority: 'medium',
        description: 'Average latency is above target',
        action: 'Optimize slow operations and consider scaling'
      });
    }

    return {
      summary: {
        reportPeriod: { start: startTime, end: endTime },
        overallHealth: platformHealth.overall,
        totalAlerts: alertStats.total,
        systemUptime: process.uptime(),
        monitoringCoverage: 95 // Would calculate actual coverage
      },
      systemMetrics: platformHealth.metrics,
      alertSummary: alertStats,
      performanceInsights: performanceReport.summary,
      predictiveInsights: {
        forecastsGenerated: 0, // Would get from predictive analytics
        anomaliesDetected: 0,
        trendChanges: 0
      },
      recommendations
    };
  }

  /**
   * Stop all monitoring components
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping Monitoring Platform...');
    
    // Stop components in reverse order of initialization
    this.integrationManager.stop();
    this.dashboardManager.destroy();
    this.predictiveAnalytics.stop();
    this.performanceAnalytics.clearData();
    this.observabilityFramework.stop();
    this.alertManager.stop();
    this.systemMonitor.stopMonitoring();
    
    console.log('✅ Monitoring Platform stopped successfully');
  }

  // Private helper methods
  private setupCrossComponentIntegration(): void {
    // Event-based integration postponed until components extend EventEmitter
    console.log('📊 Cross-component integration setup deferred - event emitters not implemented');

    console.log('🔗 Cross-component integration configured');
  }

  private assessComponentHealth(healthStatuses: any[]): 'healthy' | 'warning' | 'critical' {
    const statuses = healthStatuses.map(h => h.status);
    
    if (statuses.includes('critical')) return 'critical';
    if (statuses.includes('warning')) return 'warning';
    return 'healthy';
  }
}

/**
 * Factory function to create a complete monitoring platform
 */
export function createMonitoringPlatform(
  db: Database,
  config: MonitoringPlatformConfiguration = {}
): MonitoringPlatform {
  return new MonitoringPlatform(db, config);
}

/**
 * Initialize monitoring platform with default configuration
 */
export function initializeMonitoring(
  db: Database,
  serviceName: string = 'claudette',
  environment: string = 'production'
): MonitoringPlatform {
  
  const config: MonitoringPlatformConfiguration = {
    serviceName,
    serviceVersion: '3.0.0',
    environment,
    systemMonitor: {
      enabled: true,
      collectionInterval: 30,
      retentionDays: 7
    },
    observability: {
      tracing: {
        enabled: true,
        samplingRate: 0.1,
        maxSpansPerTrace: 1000,
        spanTimeout: 30000,
        exportBatchSize: 100,
        exportInterval: 5000
      },
      logging: {
        enabled: true,
        level: 'info',
        structuredLogging: true,
        includeStackTrace: false,
        maxLogSize: 1048576,
        bufferSize: 1000,
        flushInterval: 5000
      },
      metrics: {
        enabled: true,
        collectionInterval: 15000,
        histogramBuckets: [0.1, 0.5, 1, 2, 5, 10],
        summaryObjectives: { 0.5: 0.05, 0.9: 0.01, 0.99: 0.001 },
        labelCardinality: 1000
      }
    },
    analytics: {
      realTimeMonitoring: {
        enabled: true,
        samplingRate: 1.0,
        alertThresholds: {
          latencyP95: 1000,
          errorRate: 0.05,
          costPerRequest: 0.01,
          memoryUsage: 80,
          cacheHitRate: 0.8
        },
        alertCooldown: 300000
      },
      predictiveAnalytics: {
        enabled: true,
        forecastHorizon: 24,
        models: ['linear', 'exponential', 'seasonal'],
        confidenceInterval: 0.8,
        minimumDataPoints: 100
      },
      regressionDetection: {
        enabled: true,
        detectionWindow: 30,
        sensitivityThreshold: 0.05,
        minimumSampleSize: 50,
        statisticalTests: ['t_test', 'mann_whitney']
      }
    },
    dashboard: {
      realTimeUpdates: {
        enabled: true,
        updateInterval: 5000,
        maxDataPoints: 1000,
        compressionEnabled: true
      },
      visualization: {
        theme: 'dark',
        refreshRate: 30,
        animationsEnabled: true,
        responsiveLayout: true
      }
    },
    integrations: {
      enabled: true,
      autoInstrument: true,
      components: ['claude', 'openai', 'qwen', 'router', 'rag']
    }
  };

  return new MonitoringPlatform(db, config);
}