// Integration Manager - Monitoring integration points for existing backend systems
// Seamless monitoring injection, performance tracking, and observability hooks

import { EventEmitter } from 'events';
import { Database } from 'sqlite3';
import { SystemMonitor } from './system-monitor';
import { AlertManager } from './alert-manager';
import { ObservabilityFramework, TraceSpan, CorrelationContext } from './observability-framework';
import { PerformanceAnalytics } from '../analytics/performance/performance-analytics';
import { ClaudetteRequest, ClaudetteResponse } from '../types/index';

export interface MonitoringIntegration {
  id: string;
  name: string;
  component: string;
  enabled: boolean;
  config: {
    traceRequests: boolean;
    trackPerformance: boolean;
    monitorErrors: boolean;
    recordMetrics: boolean;
    alertThresholds: Record<string, number>;
    samplingRate: number;
  };
  hooks: {
    beforeRequest?: string[];
    afterRequest?: string[];
    onError?: string[];
    onMetric?: string[];
  };
  metadata: Record<string, any>;
}

export interface RequestContext {
  requestId: string;
  traceId: string;
  spanId?: string;
  startTime: number;
  endTime?: number;
  backend: string;
  model?: string;
  operation: string;
  correlationContext?: CorrelationContext;
  metadata: Record<string, any>;
}

export interface MonitoringHook {
  id: string;
  name: string;
  type: 'before_request' | 'after_request' | 'on_error' | 'on_metric';
  handler: (context: any, data: any) => Promise<void> | void;
  priority: number;
  enabled: boolean;
}

export interface IntegrationMetrics {
  component: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  errorRate: number;
  throughput: number;
  totalCost: number;
  averageCost: number;
  lastActivity: number;
}

export class IntegrationManager extends EventEmitter {
  private db: Database;
  private systemMonitor: SystemMonitor;
  private alertManager: AlertManager;
  private observabilityFramework: ObservabilityFramework;
  private performanceAnalytics: PerformanceAnalytics;
  private integrations: Map<string, MonitoringIntegration> = new Map();
  private hooks: Map<string, MonitoringHook[]> = new Map();
  private activeRequests: Map<string, RequestContext> = new Map();
  private componentMetrics: Map<string, IntegrationMetrics> = new Map();
  private isInitialized: boolean = false;

  constructor(
    db: Database,
    systemMonitor: SystemMonitor,
    alertManager: AlertManager,
    observabilityFramework: ObservabilityFramework,
    performanceAnalytics: PerformanceAnalytics
  ) {
    super();
    
    this.db = db;
    this.systemMonitor = systemMonitor;
    this.alertManager = alertManager;
    this.observabilityFramework = observabilityFramework;
    this.performanceAnalytics = performanceAnalytics;
    
    this.initializeDefaultIntegrations();
    this.setupDefaultHooks();
    this.isInitialized = true;
    
    console.log('🔗 Integration Manager initialized with monitoring hooks');
  }

  /**
   * Add monitoring integration for a component
   */
  addIntegration(integration: MonitoringIntegration): void {
    this.integrations.set(integration.id, integration);
    this.initializeComponentMetrics(integration.component);
    this.emit('integrationAdded', integration);
    console.log(`🔗 Monitoring integration added: ${integration.name} (${integration.component})`);
  }

  /**
   * Remove monitoring integration
   */
  removeIntegration(integrationId: string): void {
    const integration = this.integrations.get(integrationId);
    if (integration) {
      this.integrations.delete(integrationId);
      this.emit('integrationRemoved', integration);
      console.log(`🗑️ Monitoring integration removed: ${integration.name}`);
    }
  }

  /**
   * Register monitoring hook
   */
  registerHook(hook: MonitoringHook): void {
    if (!this.hooks.has(hook.type)) {
      this.hooks.set(hook.type, []);
    }
    
    const typeHooks = this.hooks.get(hook.type)!;
    typeHooks.push(hook);
    
    // Sort by priority (higher priority first)
    typeHooks.sort((a, b) => b.priority - a.priority);
    
    this.hooks.set(hook.type, typeHooks);
    this.emit('hookRegistered', hook);
    console.log(`🪝 Monitoring hook registered: ${hook.name} (${hook.type})`);
  }

  /**
   * Unregister monitoring hook
   */
  unregisterHook(hookId: string): void {
    for (const [type, typeHooks] of this.hooks.entries()) {
      const index = typeHooks.findIndex(h => h.id === hookId);
      if (index !== -1) {
        const hook = typeHooks.splice(index, 1)[0];
        this.emit('hookUnregistered', hook);
        console.log(`🗑️ Monitoring hook unregistered: ${hook.name}`);
        break;
      }
    }
  }

  /**
   * Instrument backend request with monitoring
   */
  async instrumentRequest(
    backend: string,
    request: ClaudetteRequest,
    operation: string = 'request'
  ): Promise<RequestContext> {
    
    const integration = this.findIntegrationForComponent(backend);
    if (!integration || !integration.enabled) {
      return this.createMinimalContext(backend, operation, request);
    }

    const requestId = this.generateRequestId();
    const correlationContext = this.observabilityFramework.createCorrelationContext();
    
    // Start tracing if enabled
    let span: TraceSpan | undefined;
    if (integration.config.traceRequests) {
      span = this.observabilityFramework.startTrace(
        `${backend}.${operation}`,
        correlationContext
      );
      
      // Set span tags
      this.observabilityFramework.setSpanTags(span.spanId, {
        'component': backend,
        'operation': operation,
        'model': request.model,
        'prompt_length': request.prompt?.length || 0,
        'max_tokens': request.options?.max_tokens || 0,
        'temperature': request.temperature || 0
      });
    }

    const context: RequestContext = {
      requestId,
      traceId: correlationContext.traceId,
      spanId: span?.spanId,
      startTime: Date.now(),
      backend,
      model: request.model,
      operation,
      correlationContext,
      metadata: {
        request_size: JSON.stringify(request).length,
        model: request.model,
        max_tokens: request.options?.max_tokens,
        temperature: request.temperature
      }
    };

    this.activeRequests.set(requestId, context);
    
    // Execute before request hooks
    await this.executeHooks('before_request', context, { request });
    
    // Record request start
    if (integration.config.recordMetrics) {
      this.recordRequestStart(backend, context);
    }

    this.emit('requestInstrumented', context);
    
    return context;
  }

  /**
   * Complete request instrumentation with response
   */
  async completeRequest(
    context: RequestContext,
    response: ClaudetteResponse,
    error?: Error
  ): Promise<void> {
    
    context.endTime = Date.now();
    const duration = context.endTime - context.startTime;
    
    const integration = this.integrations.get(context.backend);
    if (!integration || !integration.enabled) {
      this.activeRequests.delete(context.requestId);
      return;
    }

    try {
      // Complete tracing
      if (context.spanId && integration.config.traceRequests) {
        const tags = {
          'response_length': response.content.length,
          'tokens_input': response.usage?.prompt_tokens || 0,
          'tokens_output': response.usage?.completion_tokens || 0,
          'total_tokens': response.usage?.total_tokens || 0,
          'cost_eur': response.cost_eur,
          'latency_ms': duration,
          'cached': response.cache_hit || false
        };

        this.observabilityFramework.finishSpan(
          context.spanId,
          error ? 'error' : 'success',
          tags,
          error
        );
      }

      // Record performance metrics
      if (integration.config.trackPerformance) {
        this.performanceAnalytics.recordRequestPerformance(
          this.reconstructRequest(context),
          response,
          context.backend
        );
      }

      // Update component metrics
      this.updateComponentMetrics(context.backend, context, response, error);

      // Execute after request hooks
      await this.executeHooks('after_request', context, { response, error, duration });

      // Check alert thresholds
      if (integration.config.alertThresholds) {
        await this.checkAlertThresholds(context, response, error, duration);
      }

      // Handle errors
      if (error && integration.config.monitorErrors) {
        await this.handleRequestError(context, error);
      }

      this.emit('requestCompleted', { context, response, error, duration });
      
    } catch (monitoringError) {
      console.error('Error in request monitoring completion:', monitoringError);
      this.emit('monitoringError', { context, error: monitoringError });
    } finally {
      this.activeRequests.delete(context.requestId);
    }
  }

  /**
   * Record custom metric for component
   */
  recordComponentMetric(
    component: string,
    metricName: string,
    value: number,
    labels: Record<string, string> = {},
    unit?: string
  ): void {
    
    const integration = this.findIntegrationForComponent(component);
    if (!integration || !integration.enabled || !integration.config.recordMetrics) {
      return;
    }

    // Record in observability framework
    this.observabilityFramework.recordMetric(
      `${component}_${metricName}`,
      value,
      'gauge',
      { component, ...labels },
      undefined,
      unit
    );

    // Record in performance analytics
    this.performanceAnalytics.recordSystemMetrics({
      [metricName]: value
    });

    // Execute metric hooks
    this.executeHooks('on_metric', { component, metricName, value, labels }, {});

    this.emit('componentMetricRecorded', { component, metricName, value, labels });
  }

  /**
   * Get component metrics
   */
  getComponentMetrics(component?: string): IntegrationMetrics[] {
    if (component) {
      const metrics = this.componentMetrics.get(component);
      return metrics ? [metrics] : [];
    }
    
    return Array.from(this.componentMetrics.values());
  }

  /**
   * Get active requests
   */
  getActiveRequests(component?: string): RequestContext[] {
    const requests = Array.from(this.activeRequests.values());
    
    if (component) {
      return requests.filter(r => r.backend === component);
    }
    
    return requests;
  }

  /**
   * Get integration status
   */
  getIntegrationStatus(): Array<{
    id: string;
    name: string;
    component: string;
    enabled: boolean;
    activeRequests: number;
    totalRequests: number;
    lastActivity: number;
    healthStatus: 'healthy' | 'warning' | 'critical';
  }> {
    
    return Array.from(this.integrations.values()).map(integration => {
      const metrics = this.componentMetrics.get(integration.component);
      const activeRequests = this.getActiveRequests(integration.component).length;
      
      let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (metrics) {
        if (metrics.errorRate > 10) healthStatus = 'critical';
        else if (metrics.errorRate > 5 || metrics.averageLatency > 30000) healthStatus = 'warning';
      }
      
      return {
        id: integration.id,
        name: integration.name,
        component: integration.component,
        enabled: integration.enabled,
        activeRequests,
        totalRequests: metrics?.totalRequests || 0,
        lastActivity: metrics?.lastActivity || 0,
        healthStatus
      };
    });
  }

  /**
   * Enable/disable integration
   */
  toggleIntegration(integrationId: string, enabled: boolean): void {
    const integration = this.integrations.get(integrationId);
    if (integration) {
      integration.enabled = enabled;
      this.integrations.set(integrationId, integration);
      this.emit('integrationToggled', { integrationId, enabled });
      console.log(`🔗 Integration ${enabled ? 'enabled' : 'disabled'}: ${integration.name}`);
    }
  }

  /**
   * Update integration configuration
   */
  updateIntegrationConfig(
    integrationId: string, 
    config: Partial<MonitoringIntegration['config']>
  ): void {
    
    const integration = this.integrations.get(integrationId);
    if (integration) {
      integration.config = { ...integration.config, ...config };
      this.integrations.set(integrationId, integration);
      this.emit('integrationConfigUpdated', { integrationId, config });
      console.log(`⚙️ Integration config updated: ${integration.name}`);
    }
  }

  // Private helper methods
  private initializeDefaultIntegrations(): void {
    const defaultIntegrations: MonitoringIntegration[] = [
      {
        id: 'claude_backend',
        name: 'Claude Backend Monitoring',
        component: 'claude',
        enabled: true,
        config: {
          traceRequests: true,
          trackPerformance: true,
          monitorErrors: true,
          recordMetrics: true,
          alertThresholds: {
            latency_ms: 30000,
            error_rate: 5,
            cost_per_request: 0.01
          },
          samplingRate: 0.1
        },
        hooks: {
          beforeRequest: ['validate_request', 'check_rate_limits'],
          afterRequest: ['update_cache', 'record_usage'],
          onError: ['log_error', 'notify_team']
        },
        metadata: {}
      },
      {
        id: 'openai_backend',
        name: 'OpenAI Backend Monitoring',
        component: 'openai',
        enabled: true,
        config: {
          traceRequests: true,
          trackPerformance: true,
          monitorErrors: true,
          recordMetrics: true,
          alertThresholds: {
            latency_ms: 25000,
            error_rate: 3,
            cost_per_request: 0.005
          },
          samplingRate: 0.2
        },
        hooks: {
          beforeRequest: ['validate_api_key', 'check_quota'],
          afterRequest: ['update_usage', 'cache_response'],
          onError: ['handle_api_error', 'implement_retry']
        },
        metadata: {}
      },
      {
        id: 'qwen_backend',
        name: 'Qwen Backend Monitoring',
        component: 'qwen',
        enabled: true,
        config: {
          traceRequests: true,
          trackPerformance: true,
          monitorErrors: true,
          recordMetrics: true,
          alertThresholds: {
            latency_ms: 20000,
            error_rate: 2,
            cost_per_request: 0.001
          },
          samplingRate: 0.3
        },
        hooks: {
          beforeRequest: ['validate_request', 'optimize_prompt'],
          afterRequest: ['record_metrics', 'update_cache'],
          onError: ['log_error', 'fallback_backend']
        },
        metadata: {}
      },
      {
        id: 'adaptive_router',
        name: 'Adaptive Router Monitoring',
        component: 'router',
        enabled: true,
        config: {
          traceRequests: true,
          trackPerformance: true,
          monitorErrors: true,
          recordMetrics: true,
          alertThresholds: {
            latency_ms: 1000,
            error_rate: 1,
            routing_accuracy: 85
          },
          samplingRate: 1.0
        },
        hooks: {
          beforeRequest: ['analyze_request', 'select_backend'],
          afterRequest: ['record_routing_decision', 'update_ml_model'],
          onError: ['log_routing_error', 'fallback_strategy']
        },
        metadata: {}
      },
      {
        id: 'rag_system',
        name: 'RAG System Monitoring',
        component: 'rag',
        enabled: true,
        config: {
          traceRequests: true,
          trackPerformance: true,
          monitorErrors: true,
          recordMetrics: true,
          alertThresholds: {
            latency_ms: 15000,
            error_rate: 2,
            retrieval_accuracy: 80
          },
          samplingRate: 0.5
        },
        hooks: {
          beforeRequest: ['prepare_query', 'check_cache'],
          afterRequest: ['record_retrieval_metrics', 'update_index'],
          onError: ['log_rag_error', 'fallback_search']
        },
        metadata: {}
      }
    ];

    defaultIntegrations.forEach(integration => this.addIntegration(integration));
  }

  private setupDefaultHooks(): void {
    const defaultHooks: MonitoringHook[] = [
      {
        id: 'validate_request',
        name: 'Request Validation',
        type: 'before_request',
        handler: async (context: RequestContext, data: any) => {
          // Validate request structure and required fields
          const { request } = data;
          if (!request.prompt || request.prompt.length === 0) {
            throw new Error('Empty prompt not allowed');
          }
          
          this.observabilityFramework.log('debug', 'Request validated', {
            requestId: context.requestId,
            promptLength: request.prompt.length,
            model: request.model
          }, context.correlationContext);
        },
        priority: 100,
        enabled: true
      },
      {
        id: 'record_usage',
        name: 'Usage Recording',
        type: 'after_request',
        handler: async (context: RequestContext, data: any) => {
          const { response } = data;
          
          // Record usage metrics to database
          this.systemMonitor.recordMetric({
            timestamp: Date.now(),
            metricType: 'performance',
            metricName: 'request_completed',
            value: 1,
            unit: 'count',
            component: context.backend,
            isHealthy: !data.error
          });
          
          this.observabilityFramework.log('info', 'Usage recorded', {
            requestId: context.requestId,
            backend: context.backend,
            tokens: response?.usage?.total_tokens || 0,
            cost: response?.cost_eur || 0
          }, context.correlationContext);
        },
        priority: 50,
        enabled: true
      },
      {
        id: 'handle_error',
        name: 'Error Handler',
        type: 'on_error',
        handler: async (context: RequestContext, data: any) => {
          const { error } = data;
          
          // Log error with context
          this.observabilityFramework.log('error', `Request failed: ${error.message}`, {
            requestId: context.requestId,
            backend: context.backend,
            operation: context.operation,
            errorType: error.constructor.name,
            errorStack: error.stack
          }, context.correlationContext);
          
          // Create alert for high error rates
          await this.alertManager.evaluateMetrics([{
            name: 'error_rate',
            value: 1,
            labels: { component: context.backend },
            timestamp: Date.now()
          }]);
        },
        priority: 90,
        enabled: true
      },
      {
        id: 'update_metrics',
        name: 'Metrics Updater',
        type: 'on_metric',
        handler: async (context: any, data: any) => {
          const { component, metricName, value, labels } = context;
          
          // Update system metrics
          this.systemMonitor.recordMetric({
            timestamp: Date.now(),
            metricType: 'performance',
            metricName: `${component}_${metricName}`,
            value,
            unit: 'unit',
            component,
            isHealthy: true
          });
          
          this.observabilityFramework.log('debug', 'Metric updated', {
            component,
            metric: metricName,
            value,
            labels
          });
        },
        priority: 70,
        enabled: true
      }
    ];

    defaultHooks.forEach(hook => this.registerHook(hook));
  }

  private findIntegrationForComponent(component: string): MonitoringIntegration | undefined {
    return Array.from(this.integrations.values())
      .find(integration => integration.component === component);
  }

  private createMinimalContext(
    backend: string, 
    operation: string, 
    request: ClaudetteRequest
  ): RequestContext {
    
    return {
      requestId: this.generateRequestId(),
      traceId: this.generateTraceId(),
      startTime: Date.now(),
      backend,
      model: request.model,
      operation,
      metadata: {
        minimal: true,
        model: request.model
      }
    };
  }

  private async executeHooks(
    type: MonitoringHook['type'],
    context: any,
    data: any
  ): Promise<void> {
    
    const hooks = this.hooks.get(type) || [];
    const enabledHooks = hooks.filter(h => h.enabled);
    
    for (const hook of enabledHooks) {
      try {
        await hook.handler(context, data);
      } catch (error) {
        console.error(`Hook execution failed: ${hook.name}`, error);
        this.emit('hookExecutionError', { hook, error, context, data });
      }
    }
  }

  private recordRequestStart(backend: string, context: RequestContext): void {
    // Record request start metrics
    this.observabilityFramework.recordMetric(
      `${backend}_requests_total`,
      1,
      'counter',
      { 
        backend,
        operation: context.operation,
        model: context.model || 'unknown'
      }
    );

    this.observabilityFramework.recordMetric(
      `${backend}_active_requests`,
      1,
      'gauge',
      { backend }
    );
  }

  private updateComponentMetrics(
    component: string,
    context: RequestContext,
    response: ClaudetteResponse,
    error?: Error
  ): void {
    
    let metrics = this.componentMetrics.get(component);
    if (!metrics) {
      metrics = this.createEmptyMetrics(component);
      this.componentMetrics.set(component, metrics);
    }

    const duration = (context.endTime || Date.now()) - context.startTime;
    const isSuccess = !error;

    // Update metrics
    metrics.totalRequests++;
    if (isSuccess) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
    }

    // Update latency metrics (running average)
    const weight = 1 / metrics.totalRequests;
    metrics.averageLatency = metrics.averageLatency * (1 - weight) + duration * weight;

    // Update error rate
    metrics.errorRate = (metrics.failedRequests / metrics.totalRequests) * 100;

    // Update cost metrics
    if (response.cost_eur) {
      metrics.totalCost += response.cost_eur;
      metrics.averageCost = metrics.totalCost / metrics.totalRequests;
    }

    // Update throughput (requests per minute)
    const timeWindow = 60000; // 1 minute
    const requestsInWindow = Array.from(this.activeRequests.values())
      .filter(r => r.backend === component && 
                   Date.now() - r.startTime < timeWindow).length;
    metrics.throughput = requestsInWindow;

    metrics.lastActivity = Date.now();

    this.componentMetrics.set(component, metrics);
  }

  private async checkAlertThresholds(
    context: RequestContext,
    response: ClaudetteResponse,
    error: Error | undefined,
    duration: number
  ): Promise<void> {
    
    const integration = this.integrations.get(context.backend);
    if (!integration || !integration.config.alertThresholds) return;

    const thresholds = integration.config.alertThresholds;
    const metrics: Array<{ name: string; value: number; labels: Record<string, string> }> = [];

    // Check latency threshold
    if (thresholds.latency_ms && duration > thresholds.latency_ms) {
      metrics.push({
        name: 'high_latency',
        value: duration,
        labels: { component: context.backend, threshold: thresholds.latency_ms.toString() }
      });
    }

    // Check cost threshold
    if (thresholds.cost_per_request && response.cost_eur > thresholds.cost_per_request) {
      metrics.push({
        name: 'high_cost',
        value: response.cost_eur,
        labels: { component: context.backend, threshold: thresholds.cost_per_request.toString() }
      });
    }

    // Check error rate
    if (error && thresholds.error_rate) {
      const componentMetrics = this.componentMetrics.get(context.backend);
      if (componentMetrics && componentMetrics.errorRate > thresholds.error_rate) {
        metrics.push({
          name: 'high_error_rate',
          value: componentMetrics.errorRate,
          labels: { component: context.backend, threshold: thresholds.error_rate.toString() }
        });
      }
    }

    // Evaluate metrics against alert rules
    if (metrics.length > 0) {
      await this.alertManager.evaluateMetrics(metrics.map(m => ({
        ...m,
        timestamp: Date.now()
      })));
    }
  }

  private async handleRequestError(context: RequestContext, error: Error): Promise<void> {
    // Log structured error
    this.observabilityFramework.log('error', `Request error in ${context.backend}`, {
      requestId: context.requestId,
      backend: context.backend,
      operation: context.operation,
      model: context.model,
      errorMessage: error.message,
      errorType: error.constructor.name,
      duration: (context.endTime || Date.now()) - context.startTime
    }, context.correlationContext);

    // Execute error hooks
    await this.executeHooks('on_error', context, { error });

    // Record error metric
    this.observabilityFramework.recordMetric(
      `${context.backend}_errors_total`,
      1,
      'counter',
      { 
        backend: context.backend,
        error_type: error.constructor.name,
        operation: context.operation
      }
    );
  }

  private reconstructRequest(context: RequestContext): ClaudetteRequest {
    // Reconstruct request from context metadata
    return {
      prompt: 'reconstructed', // Would store actual prompt if needed
      model: context.model || 'unknown',
      max_tokens: context.metadata.max_tokens,
      temperature: context.metadata.temperature
    } as ClaudetteRequest;
  }

  private createEmptyMetrics(component: string): IntegrationMetrics {
    return {
      component,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      errorRate: 0,
      throughput: 0,
      totalCost: 0,
      averageCost: 0,
      lastActivity: 0
    };
  }

  private initializeComponentMetrics(component: string): void {
    if (!this.componentMetrics.has(component)) {
      this.componentMetrics.set(component, this.createEmptyMetrics(component));
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStatistics(): {
    integrations: {
      total: number;
      enabled: number;
      disabled: number;
    };
    hooks: {
      total: number;
      byType: Record<string, number>;
    };
    requests: {
      active: number;
      totalProcessed: number;
      averageLatency: number;
      errorRate: number;
    };
    performance: {
      memoryUsage: number;
      instrumentationOverhead: number;
    };
  } {
    
    const enabledIntegrations = Array.from(this.integrations.values())
      .filter(i => i.enabled).length;
    
    const hooksByType: Record<string, number> = {};
    for (const [type, hooks] of this.hooks.entries()) {
      hooksByType[type] = hooks.filter(h => h.enabled).length;
    }

    const totalRequests = Array.from(this.componentMetrics.values())
      .reduce((sum, m) => sum + m.totalRequests, 0);
    const totalErrors = Array.from(this.componentMetrics.values())
      .reduce((sum, m) => sum + m.failedRequests, 0);
    const avgLatency = Array.from(this.componentMetrics.values())
      .reduce((sum, m) => sum + m.averageLatency * m.totalRequests, 0) / Math.max(1, totalRequests);

    return {
      integrations: {
        total: this.integrations.size,
        enabled: enabledIntegrations,
        disabled: this.integrations.size - enabledIntegrations
      },
      hooks: {
        total: Array.from(this.hooks.values()).flat().length,
        byType: hooksByType
      },
      requests: {
        active: this.activeRequests.size,
        totalProcessed: totalRequests,
        averageLatency: avgLatency,
        errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0
      },
      performance: {
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
        instrumentationOverhead: 0 // Would calculate actual overhead
      }
    };
  }

  /**
   * Export monitoring configuration
   */
  exportConfiguration(): {
    integrations: MonitoringIntegration[];
    hooks: MonitoringHook[];
    metadata: {
      version: string;
      exportedAt: number;
      totalIntegrations: number;
      totalHooks: number;
    };
  } {
    
    const allHooks = Array.from(this.hooks.values()).flat();
    
    return {
      integrations: Array.from(this.integrations.values()),
      hooks: allHooks,
      metadata: {
        version: '1.0.0',
        exportedAt: Date.now(),
        totalIntegrations: this.integrations.size,
        totalHooks: allHooks.length
      }
    };
  }

  /**
   * Import monitoring configuration
   */
  importConfiguration(config: {
    integrations?: MonitoringIntegration[];
    hooks?: MonitoringHook[];
  }): void {
    
    if (config.integrations) {
      config.integrations.forEach(integration => {
        this.addIntegration(integration);
      });
    }

    if (config.hooks) {
      config.hooks.forEach(hook => {
        this.registerHook(hook);
      });
    }

    this.emit('configurationImported', config);
    console.log('📥 Monitoring configuration imported successfully');
  }

  /**
   * Stop integration manager
   */
  stop(): void {
    // Complete any active requests
    for (const context of this.activeRequests.values()) {
      if (context.spanId) {
        this.observabilityFramework.finishSpan(context.spanId, 'timeout');
      }
    }

    this.activeRequests.clear();
    this.hooks.clear();
    this.integrations.clear();
    this.componentMetrics.clear();
    this.removeAllListeners();
    
    console.log('🛑 Integration Manager stopped');
  }
}