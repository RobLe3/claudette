// Observability Framework - Comprehensive logging, tracing, and metrics collection
// Distributed tracing, structured logging, and observability insights

import { EventEmitter } from 'events';
import { Database } from 'sqlite3';
import * as crypto from 'crypto';

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'success' | 'error' | 'timeout';
  tags: Record<string, string | number | boolean>;
  logs: Array<{
    timestamp: number;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    fields?: Record<string, any>;
  }>;
  baggage: Record<string, string>;
  metadata: {
    serviceName: string;
    serviceVersion: string;
    environment: string;
    hostname: string;
    processId: number;
  };
}

export interface Trace {
  traceId: string;
  spans: TraceSpan[];
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'active' | 'completed' | 'error';
  rootOperation: string;
  serviceCount: number;
  spanCount: number;
  errorCount: number;
  tags: Record<string, string>;
  annotations: Array<{
    timestamp: number;
    value: string;
    endpoint: string;
  }>;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  logger: string;
  traceId?: string;
  spanId?: string;
  service: string;
  environment: string;
  fields: Record<string, any>;
  labels: Record<string, string>;
  location: {
    file?: string;
    line?: number;
    function?: string;
  };
  context: {
    userId?: string;
    sessionId?: string;
    requestId?: string;
    correlationId?: string;
  };
}

export interface MetricSample {
  name: string;
  value: number;
  timestamp: number;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  labels: Record<string, string>;
  help?: string;
  unit?: string;
}

export interface ObservabilityConfiguration {
  tracing: {
    enabled: boolean;
    samplingRate: number; // 0.0 to 1.0
    maxSpansPerTrace: number;
    spanTimeout: number; // milliseconds
    exportBatchSize: number;
    exportInterval: number; // milliseconds
  };
  logging: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
    structuredLogging: boolean;
    includeStackTrace: boolean;
    maxLogSize: number; // bytes
    bufferSize: number;
    flushInterval: number; // milliseconds
  };
  metrics: {
    enabled: boolean;
    collectionInterval: number; // milliseconds
    histogramBuckets: number[];
    summaryObjectives: Record<number, number>;
    labelCardinality: number;
  };
  retention: {
    traceRetentionDays: number;
    logRetentionDays: number;
    metricRetentionDays: number;
    compressionEnabled: boolean;
  };
  export: {
    enabled: boolean;
    endpoints: Array<{
      type: 'jaeger' | 'zipkin' | 'otlp' | 'prometheus' | 'loki';
      url: string;
      apiKey?: string;
      batchSize?: number;
      timeout?: number;
    }>;
  };
}

export interface CorrelationContext {
  traceId: string;
  spanId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  correlationId?: string;
  baggage: Record<string, string>;
}

export class ObservabilityFramework extends EventEmitter {
  private db: Database;
  private config: ObservabilityConfiguration;
  private activeTraces: Map<string, Trace> = new Map();
  private activeSpans: Map<string, TraceSpan> = new Map();
  private logBuffer: LogEntry[] = [];
  private metricBuffer: MetricSample[] = [];
  private correlationContext: Map<string, CorrelationContext> = new Map();
  private exportInterval: NodeJS.Timeout | null = null;
  private flushInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private serviceName: string;
  private serviceVersion: string;
  private environment: string;

  constructor(
    db: Database,
    serviceName: string = 'claudette',
    serviceVersion: string = '3.0.0',
    environment: string = 'production',
    config: Partial<ObservabilityConfiguration> = {}
  ) {
    super();
    
    this.db = db;
    this.serviceName = serviceName;
    this.serviceVersion = serviceVersion;
    this.environment = environment;
    
    this.config = {
      tracing: {
        enabled: true,
        samplingRate: 0.1, // 10% sampling
        maxSpansPerTrace: 1000,
        spanTimeout: 300000, // 5 minutes
        exportBatchSize: 100,
        exportInterval: 10000 // 10 seconds
      },
      logging: {
        enabled: true,
        level: 'info',
        structuredLogging: true,
        includeStackTrace: true,
        maxLogSize: 65536, // 64KB
        bufferSize: 1000,
        flushInterval: 5000 // 5 seconds
      },
      metrics: {
        enabled: true,
        collectionInterval: 15000, // 15 seconds
        histogramBuckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
        summaryObjectives: { 0.5: 0.05, 0.9: 0.01, 0.99: 0.001 },
        labelCardinality: 10000
      },
      retention: {
        traceRetentionDays: 7,
        logRetentionDays: 30,
        metricRetentionDays: 90,
        compressionEnabled: true
      },
      export: {
        enabled: false,
        endpoints: []
      },
      ...config
    };

    this.startObservabilityServices();
    console.log('👁️ Observability Framework initialized with comprehensive telemetry');
  }

  /**
   * Start a new trace
   */
  startTrace(operationName: string, parentContext?: CorrelationContext): TraceSpan {
    const traceId = parentContext?.traceId || this.generateTraceId();
    const spanId = this.generateSpanId();
    
    // Check sampling decision
    if (!this.shouldSample(traceId)) {
      return this.createNoOpSpan(traceId, spanId, operationName);
    }

    const span: TraceSpan = {
      traceId,
      spanId,
      parentSpanId: parentContext?.spanId,
      operationName,
      startTime: Date.now(),
      status: 'pending',
      tags: {},
      logs: [],
      baggage: parentContext?.baggage || {},
      metadata: {
        serviceName: this.serviceName,
        serviceVersion: this.serviceVersion,
        environment: this.environment,
        hostname: require('os').hostname(),
        processId: process.pid
      }
    };

    this.activeSpans.set(spanId, span);
    
    // Create or update trace
    let trace = this.activeTraces.get(traceId);
    if (!trace) {
      trace = {
        traceId,
        spans: [],
        startTime: span.startTime,
        status: 'active',
        rootOperation: operationName,
        serviceCount: 1,
        spanCount: 0,
        errorCount: 0,
        tags: {},
        annotations: []
      };
      this.activeTraces.set(traceId, trace);
    }
    
    trace.spans.push(span);
    trace.spanCount++;
    
    this.emit('spanStarted', span);
    
    return span;
  }

  /**
   * Finish a trace span
   */
  finishSpan(
    spanId: string, 
    status: TraceSpan['status'] = 'success',
    tags?: Record<string, any>,
    error?: Error
  ): void {
    
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;
    
    if (tags) {
      Object.assign(span.tags, tags);
    }
    
    if (error) {
      span.status = 'error';
      span.tags.error = true;
      span.tags.errorMessage = error.message;
      span.tags.errorStack = error.stack || 'No stack trace available';
      
      this.addSpanLog(spanId, 'error', error.message, {
        errorType: error.constructor.name,
        errorStack: error.stack || 'No stack trace available'
      });
    }

    // Update trace
    const trace = this.activeTraces.get(span.traceId);
    if (trace) {
      if (status === 'error') {
        trace.errorCount++;
      }
      
      // Check if trace is complete
      const activeSpansInTrace = trace.spans.filter(s => !s.endTime);
      if (activeSpansInTrace.length === 0) {
        trace.status = trace.errorCount > 0 ? 'error' : 'completed';
        trace.endTime = Math.max(...trace.spans.map(s => s.endTime || s.startTime));
        trace.duration = trace.endTime - trace.startTime;
        
        this.emit('traceCompleted', trace);
      }
    }

    this.activeSpans.delete(spanId);
    this.emit('spanFinished', span);
    
    // Persist span
    this.persistSpan(span);
  }

  /**
   * Add log to span
   */
  addSpanLog(
    spanId: string,
    level: LogEntry['level'],
    message: string,
    fields?: Record<string, any>
  ): void {
    
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    const logEntry = {
      timestamp: Date.now(),
      level: level === 'fatal' ? 'error' : level,
      message,
      fields
    };

    span.logs.push(logEntry);
    
    // Also create structured log entry
    // Filter fatal level to error for external interfaces that don't support it
    const compatibleLevel = level === 'fatal' ? 'error' : level;
    this.log(compatibleLevel, message, {
      ...fields,
      traceId: span.traceId,
      spanId: span.spanId,
      operationName: span.operationName
    });
  }

  /**
   * Set span tags
   */
  setSpanTags(spanId: string, tags: Record<string, any>): void {
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    Object.assign(span.tags, tags);
  }

  /**
   * Set baggage on span
   */
  setSpanBaggage(spanId: string, key: string, value: string): void {
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.baggage[key] = value;
    
    // Propagate to child spans
    this.propagateBaggage(span.traceId, key, value);
  }

  /**
   * Create structured log entry
   */
  log(
    level: LogEntry['level'],
    message: string,
    fields: Record<string, any> = {},
    context?: Partial<CorrelationContext>
  ): void {
    
    if (!this.config.logging.enabled) return;
    
    // Check log level
    const levelPriority = { debug: 0, info: 1, warn: 2, error: 3, fatal: 4 };
    const configLevelPriority = levelPriority[this.config.logging.level];
    const logLevelPriority = levelPriority[level];
    
    if (logLevelPriority < configLevelPriority) return;

    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: Date.now(),
      level,
      message: this.truncateMessage(message),
      logger: this.serviceName,
      traceId: context?.traceId,
      spanId: context?.spanId,
      service: this.serviceName,
      environment: this.environment,
      fields: this.sanitizeFields(fields),
      labels: {
        version: this.serviceVersion,
        hostname: require('os').hostname()
      },
      location: this.config.logging.includeStackTrace ? this.captureLocation() : {},
      context: {
        userId: context?.userId,
        sessionId: context?.sessionId,
        requestId: context?.requestId,
        correlationId: context?.correlationId
      }
    };

    this.logBuffer.push(logEntry);
    
    // Flush if buffer is full
    if (this.logBuffer.length >= this.config.logging.bufferSize) {
      this.flushLogs();
    }

    this.emit('logCreated', logEntry);
    
    // Also emit to console for immediate visibility
    if (level === 'error' || level === 'fatal') {
      console.error(`[${level.toUpperCase()}] ${message}`, fields);
    } else if (level === 'warn') {
      console.warn(`[${level.toUpperCase()}] ${message}`, fields);
    } else if (this.config.logging.level === 'debug' || level === 'info') {
      console.log(`[${level.toUpperCase()}] ${message}`, fields);
    }
  }

  /**
   * Record metric sample
   */
  recordMetric(
    name: string,
    value: number,
    type: MetricSample['type'] = 'gauge',
    labels: Record<string, string> = {},
    help?: string,
    unit?: string
  ): void {
    
    if (!this.config.metrics.enabled) return;

    const sample: MetricSample = {
      name,
      value,
      timestamp: Date.now(),
      type,
      labels: this.sanitizeLabels(labels),
      help,
      unit
    };

    this.metricBuffer.push(sample);
    this.emit('metricRecorded', sample);
  }

  /**
   * Create correlation context
   */
  createCorrelationContext(
    traceId?: string,
    parentContext?: CorrelationContext
  ): CorrelationContext {
    
    const context: CorrelationContext = {
      traceId: traceId || parentContext?.traceId || this.generateTraceId(),
      userId: parentContext?.userId,
      sessionId: parentContext?.sessionId,
      requestId: parentContext?.requestId || this.generateRequestId(),
      correlationId: parentContext?.correlationId || this.generateCorrelationId(),
      baggage: parentContext?.baggage ? { ...parentContext.baggage } : {}
    };

    return context;
  }

  /**
   * Get trace by ID
   */
  getTrace(traceId: string): Promise<Trace | null> {
    // First check active traces
    const activeTrace = this.activeTraces.get(traceId);
    if (activeTrace) {
      return Promise.resolve(activeTrace);
    }

    // Query database for completed traces
    return this.queryTraceFromDatabase(traceId);
  }

  /**
   * Search traces
   */
  async searchTraces(query: {
    service?: string;
    operation?: string;
    tags?: Record<string, string>;
    duration?: { min?: number; max?: number };
    timeRange?: { start: number; end: number };
    limit?: number;
    hasError?: boolean;
  }): Promise<Trace[]> {
    
    const traces: Trace[] = [];
    
    // Include active traces that match
    for (const trace of this.activeTraces.values()) {
      if (this.traceMatchesQuery(trace, query)) {
        traces.push(trace);
      }
    }
    
    // Query database for historical traces
    const historicalTraces = await this.queryTracesFromDatabase(query);
    traces.push(...historicalTraces);
    
    // Sort by start time and limit
    traces.sort((a, b) => b.startTime - a.startTime);
    
    if (query.limit) {
      return traces.slice(0, query.limit);
    }
    
    return traces;
  }

  /**
   * Search logs
   */
  async searchLogs(query: {
    level?: LogEntry['level'];
    message?: string;
    service?: string;
    traceId?: string;
    fields?: Record<string, any>;
    timeRange?: { start: number; end: number };
    limit?: number;
  }): Promise<LogEntry[]> {
    
    return this.queryLogsFromDatabase(query);
  }

  /**
   * Get metrics
   */
  async getMetrics(query: {
    name?: string;
    labels?: Record<string, string>;
    timeRange?: { start: number; end: number };
    aggregation?: 'avg' | 'sum' | 'count' | 'max' | 'min';
    groupBy?: string[];
    limit?: number;
  }): Promise<MetricSample[]> {
    
    return this.queryMetricsFromDatabase(query);
  }

  /**
   * Export telemetry data
   */
  async exportTelemetryData(format: 'jaeger' | 'zipkin' | 'otlp' = 'jaeger'): Promise<any> {
    const activeTraces = Array.from(this.activeTraces.values());
    const recentLogs = this.logBuffer.slice(-1000); // Last 1000 logs
    const recentMetrics = this.metricBuffer.slice(-1000); // Last 1000 metrics
    
    switch (format) {
      case 'jaeger':
        return this.exportToJaegerFormat(activeTraces);
      case 'zipkin':
        return this.exportToZipkinFormat(activeTraces);
      case 'otlp':
        return this.exportToOTLPFormat(activeTraces, recentLogs, recentMetrics);
      default:
        return { traces: activeTraces, logs: recentLogs, metrics: recentMetrics };
    }
  }

  /**
   * Get observability health status
   */
  getHealthStatus(): {
    tracing: { enabled: boolean; activeTraces: number; activeSpans: number };
    logging: { enabled: boolean; bufferSize: number; level: string };
    metrics: { enabled: boolean; bufferSize: number };
    export: { enabled: boolean; endpoints: number };
    performance: {
      avgTraceProcessingTime: number;
      logFlushLatency: number;
      memoryUsage: number;
    };
  } {
    
    return {
      tracing: {
        enabled: this.config.tracing.enabled,
        activeTraces: this.activeTraces.size,
        activeSpans: this.activeSpans.size
      },
      logging: {
        enabled: this.config.logging.enabled,
        bufferSize: this.logBuffer.length,
        level: this.config.logging.level
      },
      metrics: {
        enabled: this.config.metrics.enabled,
        bufferSize: this.metricBuffer.length
      },
      export: {
        enabled: this.config.export.enabled,
        endpoints: this.config.export.endpoints.length
      },
      performance: {
        avgTraceProcessingTime: this.calculateAvgTraceProcessingTime(),
        logFlushLatency: 0, // Would track actual flush latency
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024
      }
    };
  }

  // Private helper methods
  private startObservabilityServices(): void {
    // Start export interval
    if (this.config.export.enabled) {
      this.exportInterval = setInterval(() => {
        this.exportBufferedData();
      }, this.config.tracing.exportInterval);
    }
    
    // Start log flush interval
    this.flushInterval = setInterval(() => {
      this.flushLogs();
    }, this.config.logging.flushInterval);
    
    // Start metrics collection interval
    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.flushMetrics();
    }, this.config.metrics.collectionInterval);
    
    // Start cleanup interval
    setInterval(() => {
      this.cleanupExpiredData();
    }, 3600000); // Every hour
  }

  private generateTraceId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private generateSpanId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateCorrelationId(): string {
    return `cor_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private shouldSample(traceId: string): boolean {
    if (this.config.tracing.samplingRate >= 1.0) return true;
    if (this.config.tracing.samplingRate <= 0.0) return false;
    
    // Use trace ID for consistent sampling decisions
    const hash = parseInt(traceId.slice(-8), 16);
    const threshold = this.config.tracing.samplingRate * 0xFFFFFFFF;
    return hash < threshold;
  }

  private createNoOpSpan(traceId: string, spanId: string, operationName: string): TraceSpan {
    return {
      traceId,
      spanId,
      operationName,
      startTime: Date.now(),
      status: 'success',
      tags: { sampled: false },
      logs: [],
      baggage: {},
      metadata: {
        serviceName: this.serviceName,
        serviceVersion: this.serviceVersion,
        environment: this.environment,
        hostname: require('os').hostname(),
        processId: process.pid
      }
    };
  }

  private propagateBaggage(traceId: string, key: string, value: string): void {
    const trace = this.activeTraces.get(traceId);
    if (!trace) return;
    
    trace.spans.forEach(span => {
      if (this.activeSpans.has(span.spanId)) {
        span.baggage[key] = value;
      }
    });
  }

  private truncateMessage(message: string): string {
    if (message.length <= this.config.logging.maxLogSize) {
      return message;
    }
    
    return message.slice(0, this.config.logging.maxLogSize - 3) + '...';
  }

  private sanitizeFields(fields: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    Object.entries(fields).forEach(([key, value]) => {
      // Remove sensitive fields
      if (key.toLowerCase().includes('password') || 
          key.toLowerCase().includes('token') || 
          key.toLowerCase().includes('secret')) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = JSON.stringify(value);
      } else {
        sanitized[key] = value;
      }
    });
    
    return sanitized;
  }

  private sanitizeLabels(labels: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    
    // Limit label cardinality
    const keys = Object.keys(labels).slice(0, 10); // Max 10 labels
    
    keys.forEach(key => {
      const value = String(labels[key]);
      sanitized[key] = value.length > 100 ? value.slice(0, 100) : value;
    });
    
    return sanitized;
  }

  private captureLocation(): LogEntry['location'] {
    if (!this.config.logging.includeStackTrace) return {};
    
    const stack = new Error().stack;
    if (!stack) return {};
    
    // Parse stack trace to get caller location
    const lines = stack.split('\n');
    const callerLine = lines[3]; // Skip Error, captureLocation, and log method
    
    if (!callerLine) return {};
    
    const match = callerLine.match(/at (.+) \((.+):(\d+):(\d+)\)/);
    if (match) {
      return {
        function: match[1],
        file: match[2],
        line: parseInt(match[3])
      };
    }
    
    return {};
  }

  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return;
    
    const logsToFlush = this.logBuffer.splice(0);
    
    try {
      await this.persistLogs(logsToFlush);
      this.emit('logsFlushed', { count: logsToFlush.length });
    } catch (error) {
      console.error('Failed to flush logs:', error);
      // Put logs back in buffer
      this.logBuffer.unshift(...logsToFlush);
    }
  }

  private async flushMetrics(): Promise<void> {
    if (this.metricBuffer.length === 0) return;
    
    const metricsToFlush = this.metricBuffer.splice(0);
    
    try {
      await this.persistMetrics(metricsToFlush);
      this.emit('metricsFlushed', { count: metricsToFlush.length });
    } catch (error) {
      console.error('Failed to flush metrics:', error);
      // Put metrics back in buffer
      this.metricBuffer.unshift(...metricsToFlush);
    }
  }

  private collectSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    this.recordMetric('nodejs_memory_heap_used_bytes', memUsage.heapUsed, 'gauge', { type: 'heap' });
    this.recordMetric('nodejs_memory_heap_total_bytes', memUsage.heapTotal, 'gauge', { type: 'heap' });
    this.recordMetric('nodejs_memory_external_bytes', memUsage.external, 'gauge', { type: 'external' });
    this.recordMetric('nodejs_cpu_user_seconds_total', cpuUsage.user / 1000000, 'counter', { type: 'user' });
    this.recordMetric('nodejs_cpu_system_seconds_total', cpuUsage.system / 1000000, 'counter', { type: 'system' });
    
    // Observability-specific metrics
    this.recordMetric('observability_active_traces_total', this.activeTraces.size, 'gauge');
    this.recordMetric('observability_active_spans_total', this.activeSpans.size, 'gauge');
    this.recordMetric('observability_log_buffer_size', this.logBuffer.length, 'gauge');
    this.recordMetric('observability_metric_buffer_size', this.metricBuffer.length, 'gauge');
  }

  private async exportBufferedData(): Promise<void> {
    if (!this.config.export.enabled) return;
    
    for (const endpoint of this.config.export.endpoints) {
      try {
        await this.exportToEndpoint(endpoint);
      } catch (error) {
        console.error(`Failed to export to ${endpoint.type} endpoint:`, error);
      }
    }
  }

  private async exportToEndpoint(endpoint: ObservabilityConfiguration['export']['endpoints'][0]): Promise<void> {
    const data = await this.exportTelemetryData(endpoint.type as any);
    
    // In a real implementation, this would make HTTP requests to the endpoint
    console.log(`📤 Exporting ${Object.keys(data).length} data types to ${endpoint.type} endpoint`);
  }

  private traceMatchesQuery(trace: Trace, query: any): boolean {
    if (query.service && !trace.spans.some(s => s.metadata.serviceName === query.service)) {
      return false;
    }
    
    if (query.operation && trace.rootOperation !== query.operation) {
      return false;
    }
    
    if (query.hasError !== undefined && (trace.errorCount > 0) !== query.hasError) {
      return false;
    }
    
    if (query.duration) {
      if (query.duration.min && trace.duration && trace.duration < query.duration.min) {
        return false;
      }
      if (query.duration.max && trace.duration && trace.duration > query.duration.max) {
        return false;
      }
    }
    
    if (query.timeRange) {
      if (trace.startTime < query.timeRange.start || trace.startTime > query.timeRange.end) {
        return false;
      }
    }
    
    return true;
  }

  private calculateAvgTraceProcessingTime(): number {
    const completedTraces = Array.from(this.activeTraces.values())
      .filter(t => t.status === 'completed' && t.duration);
    
    if (completedTraces.length === 0) return 0;
    
    const totalTime = completedTraces.reduce((sum, t) => sum + (t.duration || 0), 0);
    return totalTime / completedTraces.length;
  }

  private cleanupExpiredData(): void {
    const now = Date.now();
    const traceTimeout = this.config.tracing.spanTimeout;
    
    // Cleanup expired active spans
    for (const [spanId, span] of this.activeSpans.entries()) {
      if (now - span.startTime > traceTimeout) {
        this.finishSpan(spanId, 'timeout');
      }
    }
    
    // Cleanup old completed traces from memory
    for (const [traceId, trace] of this.activeTraces.entries()) {
      if (trace.status === 'completed' && trace.endTime && 
          now - trace.endTime > 3600000) { // 1 hour
        this.activeTraces.delete(traceId);
      }
    }
  }

  private exportToJaegerFormat(traces: Trace[]): any {
    return {
      data: traces.map(trace => ({
        traceID: trace.traceId,
        spans: trace.spans.map(span => ({
          traceID: span.traceId,
          spanID: span.spanId,
          parentSpanID: span.parentSpanId,
          operationName: span.operationName,
          startTime: span.startTime * 1000, // Jaeger uses microseconds
          duration: (span.duration || 0) * 1000,
          tags: Object.entries(span.tags).map(([key, value]) => ({
            key,
            type: typeof value === 'string' ? 'string' : 'number',
            value: String(value)
          })),
          logs: span.logs.map(log => ({
            timestamp: log.timestamp * 1000,
            fields: [
              { key: 'level', value: log.level },
              { key: 'message', value: log.message },
              ...(log.fields ? Object.entries(log.fields).map(([k, v]) => ({
                key: k,
                value: String(v)
              })) : [])
            ]
          })),
          process: {
            serviceName: span.metadata.serviceName,
            tags: [
              { key: 'version', value: span.metadata.serviceVersion },
              { key: 'hostname', value: span.metadata.hostname }
            ]
          }
        }))
      }))
    };
  }

  private exportToZipkinFormat(traces: Trace[]): any {
    const spans: any[] = [];
    
    traces.forEach(trace => {
      trace.spans.forEach(span => {
        spans.push({
          traceId: span.traceId,
          id: span.spanId,
          parentId: span.parentSpanId,
          name: span.operationName,
          timestamp: span.startTime * 1000, // Zipkin uses microseconds
          duration: (span.duration || 0) * 1000,
          kind: 'SERVER',
          localEndpoint: {
            serviceName: span.metadata.serviceName,
            ipv4: '127.0.0.1'
          },
          tags: Object.fromEntries(
            Object.entries(span.tags).map(([k, v]) => [k, String(v)])
          ),
          annotations: span.logs.map(log => ({
            timestamp: log.timestamp * 1000,
            value: `${log.level}: ${log.message}`
          }))
        });
      });
    });
    
    return spans;
  }

  private exportToOTLPFormat(traces: Trace[], logs: LogEntry[], metrics: MetricSample[]): any {
    return {
      resourceSpans: [{
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: this.serviceName } },
            { key: 'service.version', value: { stringValue: this.serviceVersion } },
            { key: 'deployment.environment', value: { stringValue: this.environment } }
          ]
        },
        instrumentationLibrarySpans: [{
          instrumentationLibrary: {
            name: 'claudette-observability',
            version: '1.0.0'
          },
          spans: traces.flatMap(trace => 
            trace.spans.map(span => ({
              traceId: Buffer.from(span.traceId, 'hex'),
              spanId: Buffer.from(span.spanId, 'hex'),
              parentSpanId: span.parentSpanId ? Buffer.from(span.parentSpanId, 'hex') : undefined,
              name: span.operationName,
              startTimeUnixNano: span.startTime * 1000000,
              endTimeUnixNano: (span.endTime || span.startTime) * 1000000,
              kind: 1, // SPAN_KIND_SERVER
              status: { code: span.status === 'error' ? 2 : 1 },
              attributes: Object.entries(span.tags).map(([key, value]) => ({
                key,
                value: { stringValue: String(value) }
              })),
              events: span.logs.map(log => ({
                timeUnixNano: log.timestamp * 1000000,
                name: log.level,
                attributes: [
                  { key: 'message', value: { stringValue: log.message } }
                ]
              }))
            }))
          )
        }]
      }],
      resourceLogs: [{
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: this.serviceName } }
          ]
        },
        instrumentationLibraryLogs: [{
          logs: logs.map(log => ({
            timeUnixNano: log.timestamp * 1000000,
            severityNumber: { debug: 5, info: 9, warn: 13, error: 17, fatal: 21 }[log.level],
            severityText: log.level.toUpperCase(),
            body: { stringValue: log.message },
            attributes: Object.entries(log.fields).map(([key, value]) => ({
              key,
              value: { stringValue: String(value) }
            })),
            traceId: log.traceId ? Buffer.from(log.traceId, 'hex') : undefined,
            spanId: log.spanId ? Buffer.from(log.spanId, 'hex') : undefined
          }))
        }]
      }],
      resourceMetrics: [{
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: this.serviceName } }
          ]
        },
        instrumentationLibraryMetrics: [{
          metrics: this.aggregateMetricsForExport(metrics)
        }]
      }]
    };
  }

  private aggregateMetricsForExport(metrics: MetricSample[]): any[] {
    const metricGroups = new Map<string, MetricSample[]>();
    
    metrics.forEach(metric => {
      const key = `${metric.name}_${JSON.stringify(metric.labels)}`;
      if (!metricGroups.has(key)) {
        metricGroups.set(key, []);
      }
      metricGroups.get(key)!.push(metric);
    });
    
    return Array.from(metricGroups.entries()).map(([key, samples]) => {
      const sample = samples[0];
      return {
        name: sample.name,
        description: sample.help || '',
        unit: sample.unit || '',
        [sample.type]: {
          dataPoints: [{
            attributes: Object.entries(sample.labels).map(([k, v]) => ({
              key: k,
              value: { stringValue: v }
            })),
            timeUnixNano: sample.timestamp * 1000000,
            asDouble: sample.value
          }]
        }
      };
    });
  }

  // Database persistence methods (simplified implementations)
  private async persistSpan(span: TraceSpan): Promise<void> {
    // Implementation would save span to database
  }

  private async persistLogs(logs: LogEntry[]): Promise<void> {
    // Implementation would save logs to database
  }

  private async persistMetrics(metrics: MetricSample[]): Promise<void> {
    // Implementation would save metrics to database
  }

  private async queryTraceFromDatabase(traceId: string): Promise<Trace | null> {
    // Implementation would query trace from database
    return null;
  }

  private async queryTracesFromDatabase(query: any): Promise<Trace[]> {
    // Implementation would query traces from database
    return [];
  }

  private async queryLogsFromDatabase(query: any): Promise<LogEntry[]> {
    // Implementation would query logs from database
    return [];
  }

  private async queryMetricsFromDatabase(query: any): Promise<MetricSample[]> {
    // Implementation would query metrics from database
    return [];
  }

  /**
   * Stop observability framework
   */
  stop(): void {
    if (this.exportInterval) {
      clearInterval(this.exportInterval);
      this.exportInterval = null;
    }
    
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    
    // Final flush
    this.flushLogs();
    this.flushMetrics();
    
    this.removeAllListeners();
    console.log('🛑 Observability Framework stopped');
  }
}