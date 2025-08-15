// Alert Manager - Advanced alerting system for monitoring infrastructure
// Intelligent alert routing, escalation, and notification management

import { EventEmitter } from 'events';
import { Database } from 'sqlite3';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'ne' | 'gte' | 'lte';
    threshold: number;
    duration: number; // seconds
    evaluationWindow: number; // seconds
  }[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  labels: Record<string, string>;
  annotations: Record<string, string>;
  routing: {
    channels: AlertChannel[];
    escalation: EscalationPolicy[];
    suppressionRules: SuppressionRule[];
  };
  schedule: {
    enabled: boolean;
    timezone: string;
    activeHours: { start: string; end: string };
    activeDays: number[]; // 0-6, Sunday-Saturday
  };
  cooldown: number; // seconds
  maxOccurrences: number;
  autoResolve: boolean;
  metadata: Record<string, any>;
}

export interface AlertChannel {
  id: string;
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'pagerduty' | 'teams' | 'discord';
  name: string;
  enabled: boolean;
  config: {
    url?: string;
    recipients?: string[];
    apiKey?: string;
    template?: string;
    retryAttempts?: number;
    retryDelay?: number;
  };
  filterSeverity: string[];
  filterLabels: Record<string, string>;
  rateLimiting: {
    enabled: boolean;
    maxPerMinute: number;
    maxPerHour: number;
    maxPerDay: number;
  };
}

export interface EscalationPolicy {
  id: string;
  name: string;
  steps: Array<{
    delay: number; // seconds
    channels: string[];
    condition?: 'unresolved' | 'unacknowledged';
  }>;
  repeatInterval: number; // seconds, 0 = no repeat
  maxEscalations: number;
}

export interface SuppressionRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    labelMatchers: Record<string, string | RegExp>;
    timeWindow?: { start: string; end: string };
    severityFilter?: string[];
  };
  duration: number; // seconds, 0 = permanent
  reason: string;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'suppressed' | 'acknowledged';
  title: string;
  description: string;
  startsAt: number;
  endsAt?: number;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  resolvedAt?: number;
  resolvedBy?: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  value: number;
  threshold: number;
  occurrences: number;
  escalationLevel: number;
  lastNotificationAt?: number;
  fingerprint: string;
  metadata: Record<string, any>;
}

export interface AlertStats {
  total: number;
  active: number;
  resolved: number;
  suppressed: number;
  acknowledged: number;
  bySeverity: Record<string, number>;
  byRule: Record<string, number>;
  meanTimeToResolve: number;
  meanTimeToAcknowledge: number;
  falsePositiveRate: number;
  escalationRate: number;
}

export interface NotificationLog {
  id: string;
  alertId: string;
  channelId: string;
  channelType: string;
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  sentAt?: number;
  error?: string;
  retryCount: number;
  response?: any;
}

export class AlertManager extends EventEmitter {
  private db: Database;
  private rules: Map<string, AlertRule> = new Map();
  private channels: Map<string, AlertChannel> = new Map();
  private escalationPolicies: Map<string, EscalationPolicy> = new Map();
  private suppressionRules: Map<string, SuppressionRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private evaluationInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private rateLimitCounters: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(db: Database) {
    super();
    this.db = db;
    this.initializeDefaultChannels();
    this.loadConfiguration();
    this.startEvaluation();
    console.log('🚨 Alert Manager initialized with advanced notification system');
  }

  /**
   * Add or update alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    this.saveRuleToDatabase(rule);
    this.emit('ruleAdded', rule);
    console.log(`📋 Alert rule added: ${rule.name}`);
  }

  /**
   * Remove alert rule
   */
  removeRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      this.rules.delete(ruleId);
      this.removeRuleFromDatabase(ruleId);
      this.emit('ruleRemoved', rule);
      console.log(`🗑️ Alert rule removed: ${rule.name}`);
    }
  }

  /**
   * Add or update notification channel
   */
  addChannel(channel: AlertChannel): void {
    this.channels.set(channel.id, channel);
    this.saveChannelToDatabase(channel);
    this.emit('channelAdded', channel);
    console.log(`📢 Notification channel added: ${channel.name} (${channel.type})`);
  }

  /**
   * Remove notification channel
   */
  removeChannel(channelId: string): void {
    const channel = this.channels.get(channelId);
    if (channel) {
      this.channels.delete(channelId);
      this.removeChannelFromDatabase(channelId);
      this.emit('channelRemoved', channel);
      console.log(`🗑️ Notification channel removed: ${channel.name}`);
    }
  }

  /**
   * Add escalation policy
   */
  addEscalationPolicy(policy: EscalationPolicy): void {
    this.escalationPolicies.set(policy.id, policy);
    this.emit('escalationPolicyAdded', policy);
    console.log(`📈 Escalation policy added: ${policy.name}`);
  }

  /**
   * Add suppression rule
   */
  addSuppressionRule(rule: SuppressionRule): void {
    this.suppressionRules.set(rule.id, rule);
    this.emit('suppressionRuleAdded', rule);
    console.log(`🔇 Suppression rule added: ${rule.name}`);
  }

  /**
   * Evaluate metrics against alert rules
   */
  async evaluateMetrics(metrics: Array<{
    name: string;
    value: number;
    labels: Record<string, string>;
    timestamp: number;
  }>): Promise<void> {
    
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;
      
      // Check schedule
      if (!this.isRuleScheduleActive(rule)) continue;
      
      try {
        await this.evaluateRule(rule, metrics);
      } catch (error) {
        console.error(`Error evaluating rule ${rule.name}:`, error);
        this.emit('evaluationError', { rule, error });
      }
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string, comment?: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert || alert.status !== 'active') return;

    alert.status = 'acknowledged';
    alert.acknowledgedAt = Date.now();
    alert.acknowledgedBy = acknowledgedBy;
    
    if (comment) {
      alert.annotations.acknowledgmentComment = comment;
    }

    this.activeAlerts.set(alertId, alert);
    await this.updateAlertInDatabase(alert);
    
    this.emit('alertAcknowledged', alert);
    console.log(`✅ Alert acknowledged: ${alert.title} by ${acknowledgedBy}`);
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string, resolvedBy?: string, comment?: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return;

    alert.status = 'resolved';
    alert.resolvedAt = Date.now();
    alert.endsAt = Date.now();
    
    if (resolvedBy) {
      alert.resolvedBy = resolvedBy;
    }
    
    if (comment) {
      alert.annotations.resolutionComment = comment;
    }

    this.activeAlerts.set(alertId, alert);
    await this.updateAlertInDatabase(alert);
    
    this.emit('alertResolved', alert);
    console.log(`🔧 Alert resolved: ${alert.title}`);
  }

  /**
   * Suppress alerts matching criteria
   */
  suppressAlerts(criteria: {
    ruleIds?: string[];
    labels?: Record<string, string>;
    severity?: string[];
    duration?: number;
    reason: string;
  }): void {
    
    let suppressedCount = 0;
    
    for (const alert of this.activeAlerts.values()) {
      if (this.alertMatchesCriteria(alert, criteria)) {
        alert.status = 'suppressed';
        alert.annotations.suppressionReason = criteria.reason;
        this.activeAlerts.set(alert.id, alert);
        suppressedCount++;
      }
    }
    
    this.emit('alertsSuppressed', { criteria, count: suppressedCount });
    console.log(`🔇 Suppressed ${suppressedCount} alerts: ${criteria.reason}`);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(filters?: {
    severity?: string[];
    status?: string[];
    labels?: Record<string, string>;
    ruleIds?: string[];
  }): Alert[] {
    
    let alerts = Array.from(this.activeAlerts.values());
    
    if (filters) {
      if (filters.severity) {
        alerts = alerts.filter(alert => filters.severity!.includes(alert.severity));
      }
      
      if (filters.status) {
        alerts = alerts.filter(alert => filters.status!.includes(alert.status));
      }
      
      if (filters.labels) {
        alerts = alerts.filter(alert => 
          Object.entries(filters.labels!).every(([key, value]) => 
            alert.labels[key] === value
          )
        );
      }
      
      if (filters.ruleIds) {
        alerts = alerts.filter(alert => filters.ruleIds!.includes(alert.ruleId));
      }
    }
    
    return alerts.sort((a, b) => {
      // Sort by severity (critical first), then by start time
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const aSeverity = severityOrder[a.severity as keyof typeof severityOrder];
      const bSeverity = severityOrder[b.severity as keyof typeof severityOrder];
      
      if (aSeverity !== bSeverity) {
        return aSeverity - bSeverity;
      }
      
      return b.startsAt - a.startsAt;
    });
  }

  /**
   * Get alert statistics
   */
  async getAlertStats(timeRange?: { start: number; end: number }): Promise<AlertStats> {
    const now = Date.now();
    const start = timeRange?.start || (now - 24 * 60 * 60 * 1000); // Last 24 hours
    const end = timeRange?.end || now;
    
    const query = `
      SELECT * FROM performance_alerts 
      WHERE timestamp BETWEEN ? AND ?
    `;
    
    const alerts = await this.executeQuery(query, [
      new Date(start).toISOString(),
      new Date(end).toISOString()
    ]);
    
    const stats: AlertStats = {
      total: alerts.length,
      active: alerts.filter((a: any) => a.status === 'active').length,
      resolved: alerts.filter((a: any) => a.status === 'resolved').length,
      suppressed: alerts.filter((a: any) => a.status === 'suppressed').length,
      acknowledged: alerts.filter((a: any) => a.status === 'acknowledged').length,
      bySeverity: {},
      byRule: {},
      meanTimeToResolve: 0,
      meanTimeToAcknowledge: 0,
      falsePositiveRate: 0,
      escalationRate: 0
    };
    
    // Calculate statistics
    const severities = ['low', 'medium', 'high', 'critical'];
    severities.forEach(severity => {
      stats.bySeverity[severity] = alerts.filter((a: any) => a.severity === severity).length;
    });
    
    // Calculate mean times
    const resolvedAlerts = alerts.filter((a: any) => a.resolved_at);
    if (resolvedAlerts.length > 0) {
      const totalResolveTime = resolvedAlerts.reduce((sum: number, alert: any) => {
        const startTime = new Date(alert.timestamp).getTime();
        const resolveTime = new Date(alert.resolved_at).getTime();
        return sum + (resolveTime - startTime);
      }, 0);
      stats.meanTimeToResolve = totalResolveTime / resolvedAlerts.length / 1000; // seconds
    }
    
    return stats;
  }

  /**
   * Test notification channel
   */
  async testChannel(channelId: string): Promise<{
    success: boolean;
    responseTime: number;
    error?: string;
  }> {
    
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }
    
    const testAlert: Alert = {
      id: 'test-alert',
      ruleId: 'test-rule',
      ruleName: 'Test Rule',
      severity: 'low',
      status: 'active',
      title: 'Test Alert',
      description: 'This is a test alert to verify channel configuration',
      startsAt: Date.now(),
      labels: { test: 'true' },
      annotations: { test: 'true' },
      value: 0,
      threshold: 0,
      occurrences: 1,
      escalationLevel: 0,
      fingerprint: 'test-fingerprint',
      metadata: {}
    };
    
    const startTime = Date.now();
    
    try {
      await this.sendNotification(channel, testAlert);
      return {
        success: true,
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get notification logs
   */
  async getNotificationLogs(
    limit: number = 100,
    filters?: {
      alertId?: string;
      channelId?: string;
      status?: string;
      since?: number;
    }
  ): Promise<NotificationLog[]> {
    
    let query = 'SELECT * FROM notification_logs';
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (filters) {
      if (filters.alertId) {
        conditions.push('alert_id = ?');
        params.push(filters.alertId);
      }
      
      if (filters.channelId) {
        conditions.push('channel_id = ?');
        params.push(filters.channelId);
      }
      
      if (filters.status) {
        conditions.push('status = ?');
        params.push(filters.status);
      }
      
      if (filters.since) {
        conditions.push('sent_at >= ?');
        params.push(new Date(filters.since).toISOString());
      }
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY sent_at DESC LIMIT ?';
    params.push(limit);
    
    const logs = await this.executeQuery(query, params);
    return logs.map((log: any) => ({
      id: log.id,
      alertId: log.alert_id,
      channelId: log.channel_id,
      channelType: log.channel_type,
      status: log.status,
      sentAt: log.sent_at ? new Date(log.sent_at).getTime() : undefined,
      error: log.error,
      retryCount: log.retry_count,
      response: log.response ? JSON.parse(log.response) : undefined
    }));
  }

  // Private helper methods
  private async evaluateRule(rule: AlertRule, metrics: any[]): Promise<void> {
    const relevantMetrics = metrics.filter(metric => 
      rule.conditions.some(condition => 
        metric.name === condition.metric
      )
    );
    
    if (relevantMetrics.length === 0) return;
    
    // Check each condition
    let conditionsMet = 0;
    let alertValue = 0;
    let conditionThreshold = 0;
    
    for (const condition of rule.conditions) {
      const metric = relevantMetrics.find(m => m.name === condition.metric);
      if (!metric) continue;
      
      const conditionResult = this.evaluateCondition(condition, metric.value);
      if (conditionResult) {
        conditionsMet++;
        alertValue = metric.value;
        conditionThreshold = condition.threshold;
      }
    }
    
    // All conditions must be met
    if (conditionsMet === rule.conditions.length) {
      await this.triggerAlert(rule, alertValue, conditionThreshold);
    } else {
      // Check if we should auto-resolve
      if (rule.autoResolve) {
        await this.autoResolveAlerts(rule.id);
      }
    }
  }

  private evaluateCondition(condition: any, value: number): boolean {
    switch (condition.operator) {
      case 'gt': return value > condition.threshold;
      case 'gte': return value >= condition.threshold;
      case 'lt': return value < condition.threshold;
      case 'lte': return value <= condition.threshold;
      case 'eq': return value === condition.threshold;
      case 'ne': return value !== condition.threshold;
      default: return false;
    }
  }

  private async triggerAlert(rule: AlertRule, value: number, threshold: number): Promise<void> {
    const fingerprint = this.generateFingerprint(rule, { value, threshold });
    const existingAlert = Array.from(this.activeAlerts.values())
      .find(alert => alert.fingerprint === fingerprint && alert.status === 'active');
    
    if (existingAlert) {
      // Update existing alert
      existingAlert.occurrences++;
      existingAlert.value = value;
      existingAlert.metadata.lastSeen = Date.now();
      
      this.activeAlerts.set(existingAlert.id, existingAlert);
      await this.updateAlertInDatabase(existingAlert);
      
      // Check for escalation
      await this.checkEscalation(existingAlert);
      
    } else {
      // Create new alert
      const alert: Alert = {
        id: this.generateAlertId(),
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        status: 'active',
        title: rule.annotations.title || rule.name,
        description: rule.annotations.description || rule.description,
        startsAt: Date.now(),
        labels: { ...rule.labels },
        annotations: { ...rule.annotations },
        value,
        threshold,
        occurrences: 1,
        escalationLevel: 0,
        fingerprint,
        metadata: { ruleConditions: rule.conditions }
      };
      
      this.activeAlerts.set(alert.id, alert);
      await this.saveAlertToDatabase(alert);
      
      this.emit('alertTriggered', alert);
      
      // Send notifications
      await this.processAlertNotifications(alert, rule);
      
      console.log(`🚨 Alert triggered: ${alert.title} (${alert.severity})`);
    }
  }

  private async processAlertNotifications(alert: Alert, rule: AlertRule): Promise<void> {
    // Check suppression rules
    if (this.isAlertSuppressed(alert)) {
      alert.status = 'suppressed';
      this.activeAlerts.set(alert.id, alert);
      return;
    }
    
    // Send to configured channels
    for (const channelId of rule.routing.channels.map(c => c.id)) {
      const channel = this.channels.get(channelId);
      if (channel && channel.enabled && this.shouldSendToChannel(channel, alert)) {
        try {
          if (this.checkRateLimit(channel, alert)) {
            await this.sendNotification(channel, alert);
            await this.logNotification(alert.id, channel, 'sent');
          } else {
            await this.logNotification(alert.id, channel, 'rate_limited');
          }
        } catch (error) {
          console.error(`Failed to send notification to ${channel.name}:`, error);
          await this.logNotification(alert.id, channel, 'failed', String(error));
        }
      }
    }
  }

  private async sendNotification(channel: AlertChannel, alert: Alert): Promise<void> {
    const message = this.formatNotificationMessage(channel, alert);
    
    switch (channel.type) {
      case 'webhook':
        await this.sendWebhookNotification(channel, alert, message);
        break;
      case 'email':
        await this.sendEmailNotification(channel, alert, message);
        break;
      case 'slack':
        await this.sendSlackNotification(channel, alert, message);
        break;
      default:
        console.warn(`Notification type ${channel.type} not implemented`);
    }
  }

  private async sendWebhookNotification(channel: AlertChannel, alert: Alert, message: any): Promise<void> {
    // Implementation would use actual HTTP client
    console.log(`📤 Sending webhook notification to ${channel.config.url}:`, message);
  }

  private async sendEmailNotification(channel: AlertChannel, alert: Alert, message: any): Promise<void> {
    // Implementation would use actual email service
    console.log(`📧 Sending email notification to ${channel.config.recipients?.join(', ')}:`, message.subject);
  }

  private async sendSlackNotification(channel: AlertChannel, alert: Alert, message: any): Promise<void> {
    // Implementation would use Slack API
    console.log(`💬 Sending Slack notification:`, message.text);
  }

  private formatNotificationMessage(channel: AlertChannel, alert: Alert): any {
    const template = channel.config.template || 'default';
    
    const baseMessage = {
      alert_id: alert.id,
      title: alert.title,
      description: alert.description,
      severity: alert.severity,
      status: alert.status,
      value: alert.value,
      threshold: alert.threshold,
      starts_at: new Date(alert.startsAt).toISOString(),
      labels: alert.labels,
      annotations: alert.annotations
    };
    
    switch (channel.type) {
      case 'webhook':
        return {
          ...baseMessage,
          channel_type: 'webhook'
        };
      
      case 'email':
        return {
          subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
          body: `
Alert: ${alert.title}
Severity: ${alert.severity}
Description: ${alert.description}
Value: ${alert.value}
Threshold: ${alert.threshold}
Time: ${new Date(alert.startsAt).toLocaleString()}

Labels: ${JSON.stringify(alert.labels, null, 2)}
          `.trim(),
          ...baseMessage
        };
      
      case 'slack':
        const color = {
          critical: '#dc3545',
          high: '#fd7e14',
          medium: '#ffc107',
          low: '#28a745'
        }[alert.severity] || '#6c757d';
        
        return {
          text: `🚨 Alert: ${alert.title}`,
          attachments: [{
            color,
            fields: [
              { title: 'Severity', value: alert.severity, short: true },
              { title: 'Status', value: alert.status, short: true },
              { title: 'Value', value: alert.value.toString(), short: true },
              { title: 'Threshold', value: alert.threshold.toString(), short: true },
              { title: 'Description', value: alert.description, short: false }
            ]
          }],
          ...baseMessage
        };
      
      default:
        return baseMessage;
    }
  }

  private checkRateLimit(channel: AlertChannel, alert: Alert): boolean {
    if (!channel.rateLimiting.enabled) return true;
    
    const now = Date.now();
    const windowSize = 60000; // 1 minute
    const key = `${channel.id}_${Math.floor(now / windowSize)}`;
    
    const counter = this.rateLimitCounters.get(key) || { count: 0, resetTime: now + windowSize };
    
    if (now > counter.resetTime) {
      counter.count = 0;
      counter.resetTime = now + windowSize;
    }
    
    if (counter.count >= channel.rateLimiting.maxPerMinute) {
      return false;
    }
    
    counter.count++;
    this.rateLimitCounters.set(key, counter);
    
    return true;
  }

  private isAlertSuppressed(alert: Alert): boolean {
    for (const rule of this.suppressionRules.values()) {
      if (!rule.enabled) continue;
      
      // Check label matchers
      const labelsMatch = Object.entries(rule.conditions.labelMatchers).every(([key, value]) => {
        if (typeof value === 'string') {
          return alert.labels[key] === value;
        } else if (value instanceof RegExp) {
          return value.test(alert.labels[key] || '');
        }
        return false;
      });
      
      if (labelsMatch) {
        return true;
      }
    }
    
    return false;
  }

  private shouldSendToChannel(channel: AlertChannel, alert: Alert): boolean {
    // Check severity filter
    if (channel.filterSeverity.length > 0 && !channel.filterSeverity.includes(alert.severity)) {
      return false;
    }
    
    // Check label filters
    if (Object.keys(channel.filterLabels).length > 0) {
      const labelsMatch = Object.entries(channel.filterLabels).every(([key, value]) => 
        alert.labels[key] === value
      );
      if (!labelsMatch) return false;
    }
    
    return true;
  }

  private async checkEscalation(alert: Alert): Promise<void> {
    const rule = this.rules.get(alert.ruleId);
    if (!rule || rule.routing.escalation.length === 0) return;
    
    const escalationPolicy = rule.routing.escalation[0]; // Use first policy for simplicity
    if (!escalationPolicy || alert.escalationLevel >= escalationPolicy.steps.length) return;
    
    const currentStep = escalationPolicy.steps[alert.escalationLevel];
    const timeSinceAlert = Date.now() - alert.startsAt;
    
    if (timeSinceAlert >= currentStep.delay * 1000) {
      alert.escalationLevel++;
      this.activeAlerts.set(alert.id, alert);
      
      // Send escalation notifications
      for (const channelId of currentStep.channels) {
        const channel = this.channels.get(channelId);
        if (channel && channel.enabled) {
          try {
            await this.sendNotification(channel, alert);
            await this.logNotification(alert.id, channel, 'escalated');
          } catch (error) {
            console.error(`Escalation notification failed for ${channel.name}:`, error);
          }
        }
      }
      
      this.emit('alertEscalated', alert);
      console.log(`📈 Alert escalated: ${alert.title} (level ${alert.escalationLevel})`);
    }
  }

  private async autoResolveAlerts(ruleId: string): Promise<void> {
    const alertsToResolve = Array.from(this.activeAlerts.values())
      .filter(alert => alert.ruleId === ruleId && alert.status === 'active');
    
    for (const alert of alertsToResolve) {
      await this.resolveAlert(alert.id, 'auto-resolved');
    }
  }

  private alertMatchesCriteria(alert: Alert, criteria: any): boolean {
    if (criteria.ruleIds && !criteria.ruleIds.includes(alert.ruleId)) return false;
    if (criteria.severity && !criteria.severity.includes(alert.severity)) return false;
    
    if (criteria.labels) {
      const labelsMatch = Object.entries(criteria.labels).every(([key, value]) => 
        alert.labels[key] === value
      );
      if (!labelsMatch) return false;
    }
    
    return true;
  }

  private isRuleScheduleActive(rule: AlertRule): boolean {
    if (!rule.schedule.enabled) return true;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();
    
    // Check active days
    if (rule.schedule.activeDays.length > 0 && !rule.schedule.activeDays.includes(currentDay)) {
      return false;
    }
    
    // Check active hours
    const [startHour] = rule.schedule.activeHours.start.split(':').map(Number);
    const [endHour] = rule.schedule.activeHours.end.split(':').map(Number);
    
    if (startHour <= endHour) {
      return currentHour >= startHour && currentHour <= endHour;
    } else {
      // Overnight schedule
      return currentHour >= startHour || currentHour <= endHour;
    }
  }

  private generateFingerprint(rule: AlertRule, context: any): string {
    const data = JSON.stringify({ ruleId: rule.id, labels: rule.labels, context });
    return Buffer.from(data).toString('base64').slice(0, 16);
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async executeQuery(query: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  private initializeDefaultChannels(): void {
    // Add default console channel
    this.addChannel({
      id: 'console',
      type: 'webhook',
      name: 'Console Logger',
      enabled: true,
      config: {},
      filterSeverity: [],
      filterLabels: {},
      rateLimiting: {
        enabled: false,
        maxPerMinute: 0,
        maxPerHour: 0,
        maxPerDay: 0
      }
    });
  }

  private loadConfiguration(): void {
    // Load rules, channels, and policies from database
    // Implementation would restore state from persistence
  }

  private startEvaluation(): void {
    this.isRunning = true;
    
    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredData();
    }, 3600000); // Every hour
    
    console.log('🔄 Alert evaluation started');
  }

  private cleanupExpiredData(): void {
    // Clean up old resolved alerts, rate limit counters, etc.
    const now = Date.now();
    const retentionPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (alert.status === 'resolved' && alert.resolvedAt && 
          now - alert.resolvedAt > retentionPeriod) {
        this.activeAlerts.delete(alertId);
      }
    }
    
    // Clean up rate limit counters
    for (const [key, counter] of this.rateLimitCounters.entries()) {
      if (now > counter.resetTime + 3600000) { // 1 hour grace period
        this.rateLimitCounters.delete(key);
      }
    }
  }

  // Database operations (simplified implementations)
  private async saveRuleToDatabase(rule: AlertRule): Promise<void> {
    // Implementation would save rule to database
  }

  private async removeRuleFromDatabase(ruleId: string): Promise<void> {
    // Implementation would remove rule from database
  }

  private async saveChannelToDatabase(channel: AlertChannel): Promise<void> {
    // Implementation would save channel to database
  }

  private async removeChannelFromDatabase(channelId: string): Promise<void> {
    // Implementation would remove channel from database
  }

  private async saveAlertToDatabase(alert: Alert): Promise<void> {
    // Implementation would save alert to database
  }

  private async updateAlertInDatabase(alert: Alert): Promise<void> {
    // Implementation would update alert in database
  }

  private async logNotification(alertId: string, channel: AlertChannel, status: string, error?: string): Promise<void> {
    // Implementation would log notification to database
  }

  /**
   * Stop alert manager
   */
  stop(): void {
    this.isRunning = false;
    
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
      this.evaluationInterval = null;
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.removeAllListeners();
    console.log('🛑 Alert Manager stopped');
  }
}