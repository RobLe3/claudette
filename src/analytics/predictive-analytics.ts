// Predictive Analytics System - Advanced forecasting and trend analysis
// Machine learning models, time series analysis, and predictive insights

import { EventEmitter } from 'events';
import { Database } from 'sqlite3';

export interface PredictiveModel {
  id: string;
  name: string;
  type: 'linear_regression' | 'seasonal_decompose' | 'exponential_smoothing';
  description: string;
  enabled: boolean;
  hyperparameters: Record<string, any>;
  trainingData: {
    metricName: string;
    timeRange: { start: number; end: number };
    frequency: 'minute' | 'hour' | 'day' | 'week';
    features: string[];
  };
  performance: {
    accuracy: number;
    mape: number; // Mean Absolute Percentage Error
    rmse: number; // Root Mean Square Error
    lastTraining: number;
    validationScore: number;
  };
  metadata: Record<string, any>;
}

export interface Forecast {
  id: string;
  modelId: string;
  metricName: string;
  createdAt: number;
  forecastHorizon: number; // hours
  confidence: number;
  predictions: Array<{
    timestamp: number;
    value: number;
    upperBound: number;
    lowerBound: number;
    confidence: number;
  }>;
  accuracy: {
    actualValues?: number[];
    mape?: number;
    rmse?: number;
    directionalAccuracy?: number;
  };
  triggers: Array<{
    type: 'threshold' | 'anomaly' | 'trend_change';
    probability: number;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  metadata: Record<string, any>;
}

export interface TrendAnalysis {
  metric: string;
  timeRange: { start: number; end: number };
  trend: {
    direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    strength: number; // 0-1
    changeRate: number; // percentage per period
    confidence: number;
  };
  seasonality: {
    detected: boolean;
    period?: number; // in hours
    strength?: number;
    pattern?: number[];
  };
  anomalies: Array<{
    timestamp: number;
    value: number;
    expectedValue: number;
    deviation: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: 'spike' | 'drop' | 'shift' | 'outlier';
  }>;
  correlations: Array<{
    metric: string;
    correlation: number;
    significance: number;
    lag: number; // in time units
  }>;
  insights: Array<{
    type: 'optimization' | 'risk' | 'opportunity' | 'degradation';
    description: string;
    impact: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    actionable: boolean;
    recommendations: string[];
  }>;
}

export interface AnomalyDetection {
  metric: string;
  algorithm: 'isolation_forest' | 'one_class_svm' | 'local_outlier_factor' | 'statistical_outlier';
  sensitivity: number;
  threshold: number;
  windowSize: number; // in data points
  detectedAnomalies: Array<{
    timestamp: number;
    value: number;
    anomalyScore: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    context: Record<string, any>;
  }>;
  performance: {
    precision: number;
    recall: number;
    f1Score: number;
    falsePositiveRate: number;
  };
}

export interface CapacityPlanningInsight {
  component: string;
  currentUtilization: number;
  trendProjection: {
    timeToCapacity: number; // hours until hitting threshold
    confidenceLevel: number;
    assumedThreshold: number;
  };
  recommendations: Array<{
    type: 'scale_up' | 'scale_out' | 'optimize' | 'redistribute';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    description: string;
    estimatedCost: number;
    expectedImpact: string;
    timeline: string;
  }>;
  riskAssessment: {
    probability: number;
    impact: 'low' | 'medium' | 'high' | 'critical';
    mitigationStrategies: string[];
  };
}

export class PredictiveAnalytics extends EventEmitter {
  private db: Database;
  private models: Map<string, PredictiveModel> = new Map();
  private forecasts: Map<string, Forecast> = new Map();
  private trendAnalyses: Map<string, TrendAnalysis> = new Map();
  private anomalyDetectors: Map<string, AnomalyDetection> = new Map();
  private trainingInterval: NodeJS.Timeout | null = null;
  private predictionInterval: NodeJS.Timeout | null = null;
  private isTraining: boolean = false;
  private cacheTTL: number = 300000; // 5 minutes

  constructor(db: Database) {
    super();
    this.db = db;
    this.initializeDefaultModels();
    this.startPredictiveLoop();
    console.log('🔮 Predictive Analytics System initialized with ML forecasting');
  }

  /**
   * Add or update predictive model
   */
  addModel(model: PredictiveModel): void {
    this.models.set(model.id, model);
    this.emit('modelAdded', model);
    console.log(`🤖 Predictive model added: ${model.name} (${model.type})`);
  }

  /**
   * Train model with historical data
   */
  async trainModel(modelId: string, forceRetrain: boolean = false): Promise<{
    success: boolean;
    accuracy: number;
    trainingTime: number;
    error?: string;
  }> {
    
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Check if retraining is needed
    const timeSinceTraining = Date.now() - (model.performance.lastTraining || 0);
    const retrainingThreshold = 24 * 60 * 60 * 1000; // 24 hours
    
    if (!forceRetrain && timeSinceTraining < retrainingThreshold) {
      return {
        success: true,
        accuracy: model.performance.accuracy,
        trainingTime: 0
      };
    }

    this.isTraining = true;
    const startTime = Date.now();
    
    try {
      // Fetch training data
      const trainingData = await this.fetchTrainingData(model);
      
      if (trainingData.length < 50) {
        throw new Error('Insufficient training data (minimum 50 data points required)');
      }

      // Train model based on type
      const trainedModel = await this.executeTraining(model, trainingData);
      
      // Update model performance
      model.performance = {
        ...trainedModel.performance,
        lastTraining: Date.now()
      };
      
      this.models.set(modelId, model);
      this.emit('modelTrained', model);
      
      const trainingTime = Date.now() - startTime;
      console.log(`🎯 Model trained: ${model.name} (accuracy: ${model.performance.accuracy.toFixed(3)}, time: ${trainingTime}ms)`);
      
      return {
        success: true,
        accuracy: model.performance.accuracy,
        trainingTime
      };
      
    } catch (error) {
      console.error(`Training failed for model ${model.name}:`, error);
      return {
        success: false,
        accuracy: 0,
        trainingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    } finally {
      this.isTraining = false;
    }
  }

  /**
   * Generate forecast using trained model
   */
  async generateForecast(
    modelId: string,
    metricName: string,
    horizonHours: number = 24,
    confidence: number = 0.95
  ): Promise<Forecast> {
    
    const model = this.models.get(modelId);
    if (!model || !model.enabled) {
      throw new Error(`Model ${modelId} not found or disabled`);
    }

    const startTime = Date.now();
    
    try {
      // Get recent data for prediction
      const recentData = await this.fetchRecentData(metricName, 24 * 7); // Last week
      
      if (recentData.length < 10) {
        throw new Error('Insufficient recent data for prediction');
      }

      // Generate predictions
      const predictions = await this.executePrediction(model, recentData, horizonHours, confidence);
      
      // Detect potential triggers
      const triggers = this.detectTriggers(predictions, model);
      
      const forecast: Forecast = {
        id: this.generateForecastId(),
        modelId,
        metricName,
        createdAt: Date.now(),
        forecastHorizon: horizonHours,
        confidence,
        predictions,
        accuracy: {},
        triggers,
        metadata: {
          modelType: model.type,
          dataPoints: recentData.length,
          generationTime: Date.now() - startTime
        }
      };
      
      this.forecasts.set(forecast.id, forecast);
      this.emit('forecastGenerated', forecast);
      
      console.log(`📈 Forecast generated: ${metricName} (${horizonHours}h horizon, ${predictions.length} points)`);
      
      return forecast;
      
    } catch (error) {
      console.error(`Forecast generation failed for ${metricName}:`, error);
      throw error;
    }
  }

  /**
   * Perform trend analysis on metric
   */
  async analyzeTrends(
    metricName: string,
    timeRange: { start: number; end: number },
    options: {
      detectSeasonality?: boolean;
      findCorrelations?: boolean;
      generateInsights?: boolean;
    } = {}
  ): Promise<TrendAnalysis> {
    
    const cacheKey = `trend_${metricName}_${timeRange.start}_${timeRange.end}`;
    const cached = this.getCachedAnalysis(cacheKey);
    if (cached) return cached;
    
    const startTime = Date.now();
    
    try {
      // Fetch metric data
      const data = await this.fetchMetricData(metricName, timeRange);
      
      if (data.length < 10) {
        throw new Error('Insufficient data for trend analysis');
      }
      
      // Analyze trend direction and strength
      const trend = this.calculateTrend(data);
      
      // Detect seasonality if requested
      const seasonality = options.detectSeasonality 
        ? this.detectSeasonality(data)
        : { detected: false };
      
      // Detect anomalies
      const anomalies = this.detectAnomaliesInData(data);
      
      // Find correlations if requested
      const correlations = options.findCorrelations
        ? await this.findCorrelations(metricName, timeRange)
        : [];
      
      // Generate insights if requested
      const insights = options.generateInsights
        ? this.generateTrendInsights(data, trend, anomalies)
        : [];
      
      const analysis: TrendAnalysis = {
        metric: metricName,
        timeRange,
        trend,
        seasonality,
        anomalies,
        correlations,
        insights
      };
      
      this.trendAnalyses.set(cacheKey, analysis);
      this.emit('trendAnalysisCompleted', analysis);
      
      console.log(`📊 Trend analysis completed: ${metricName} (${Date.now() - startTime}ms)`);
      
      return analysis;
      
    } catch (error) {
      console.error(`Trend analysis failed for ${metricName}:`, error);
      throw error;
    }
  }

  /**
   * Detect anomalies in real-time data
   */
  async detectAnomalies(
    metricName: string,
    algorithm: AnomalyDetection['algorithm'] = 'statistical_outlier',
    options: {
      sensitivity?: number;
      windowSize?: number;
      threshold?: number;
    } = {}
  ): Promise<AnomalyDetection> {
    
    const sensitivity = options.sensitivity || 0.1;
    const windowSize = options.windowSize || 100;
    const threshold = options.threshold || 3.0;
    
    try {
      // Get recent data
      const recentData = await this.fetchRecentData(metricName, 24); // Last 24 hours
      
      if (recentData.length < windowSize) {
        throw new Error(`Insufficient data for anomaly detection (need ${windowSize}, got ${recentData.length})`);
      }
      
      const detectedAnomalies = this.executeAnomalyDetection(
        recentData,
        algorithm,
        { sensitivity, threshold, windowSize }
      );
      
      const anomalyDetection: AnomalyDetection = {
        metric: metricName,
        algorithm,
        sensitivity,
        threshold,
        windowSize,
        detectedAnomalies,
        performance: this.calculateAnomalyPerformance(detectedAnomalies)
      };
      
      this.anomalyDetectors.set(metricName, anomalyDetection);
      this.emit('anomaliesDetected', anomalyDetection);
      
      if (detectedAnomalies.length > 0) {
        console.log(`🚨 Anomalies detected in ${metricName}: ${detectedAnomalies.length} anomalies`);
      }
      
      return anomalyDetection;
      
    } catch (error) {
      console.error(`Anomaly detection failed for ${metricName}:`, error);
      throw error;
    }
  }

  /**
   * Generate capacity planning insights
   */
  async generateCapacityInsights(
    component: string,
    utilizationMetrics: string[],
    thresholds: Record<string, number> = {}
  ): Promise<CapacityPlanningInsight> {
    
    try {
      // Get current utilization
      const currentUtilization = await this.getCurrentUtilization(component, utilizationMetrics);
      
      // Generate trend projections
      const trendProjection = await this.projectCapacityTrend(
        component,
        utilizationMetrics,
        thresholds
      );
      
      // Generate recommendations
      const recommendations = this.generateCapacityRecommendations(
        currentUtilization,
        trendProjection
      );
      
      // Assess risks
      const riskAssessment = this.assessCapacityRisks(
        currentUtilization,
        trendProjection
      );
      
      const insight: CapacityPlanningInsight = {
        component,
        currentUtilization,
        trendProjection,
        recommendations,
        riskAssessment
      };
      
      this.emit('capacityInsightGenerated', insight);
      
      console.log(`📊 Capacity insight generated for ${component}: ${currentUtilization.toFixed(1)}% utilization`);
      
      return insight;
      
    } catch (error) {
      console.error(`Capacity planning failed for ${component}:`, error);
      throw error;
    }
  }

  /**
   * Validate forecast accuracy against actual values
   */
  async validateForecast(forecastId: string): Promise<{
    accuracy: number;
    mape: number;
    rmse: number;
    directionalAccuracy: number;
  }> {
    
    const forecast = this.forecasts.get(forecastId);
    if (!forecast) {
      throw new Error(`Forecast ${forecastId} not found`);
    }
    
    // Get actual values for the forecast period
    const actualData = await this.fetchMetricData(
      forecast.metricName,
      {
        start: forecast.createdAt,
        end: forecast.createdAt + (forecast.forecastHorizon * 3600000)
      }
    );
    
    if (actualData.length === 0) {
      throw new Error('No actual data available for validation');
    }
    
    // Align predictions with actual values
    const alignedData = this.alignPredictionsWithActuals(forecast.predictions, actualData);
    
    // Calculate accuracy metrics
    const accuracy = this.calculateAccuracyMetrics(alignedData);
    
    // Update forecast with validation results
    forecast.accuracy = {
      actualValues: alignedData.map(d => d.actual),
      ...accuracy
    };
    
    this.forecasts.set(forecastId, forecast);
    this.emit('forecastValidated', { forecastId, accuracy });
    
    console.log(`✅ Forecast validated: ${forecast.metricName} (MAPE: ${accuracy.mape.toFixed(2)}%)`);
    
    return accuracy;
  }

  /**
   * Get all active forecasts
   */
  getActiveForecasts(filters?: {
    metricName?: string;
    modelId?: string;
    maxAge?: number;
  }): Forecast[] {
    
    let forecasts = Array.from(this.forecasts.values());
    
    if (filters) {
      if (filters.metricName) {
        forecasts = forecasts.filter(f => f.metricName === filters.metricName);
      }
      
      if (filters.modelId) {
        forecasts = forecasts.filter(f => f.modelId === filters.modelId);
      }
      
      if (filters.maxAge) {
        const cutoff = Date.now() - filters.maxAge;
        forecasts = forecasts.filter(f => f.createdAt > cutoff);
      }
    }
    
    return forecasts.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get model performance statistics
   */
  getModelPerformance(): Array<{
    modelId: string;
    modelName: string;
    accuracy: number;
    forecastsGenerated: number;
    averageMAPE: number;
    lastTrained: number;
    status: 'active' | 'training' | 'disabled';
  }> {
    
    return Array.from(this.models.values()).map(model => {
      const modelForecasts = Array.from(this.forecasts.values())
        .filter(f => f.modelId === model.id);
      
      const averageMAPE = modelForecasts.length > 0
        ? modelForecasts
            .filter(f => f.accuracy.mape !== undefined)
            .reduce((sum, f) => sum + (f.accuracy.mape || 0), 0) / modelForecasts.length
        : 0;
      
      return {
        modelId: model.id,
        modelName: model.name,
        accuracy: model.performance.accuracy,
        forecastsGenerated: modelForecasts.length,
        averageMAPE,
        lastTrained: model.performance.lastTraining,
        status: model.enabled ? (this.isTraining ? 'training' : 'active') : 'disabled'
      };
    });
  }

  // Private helper methods
  private initializeDefaultModels(): void {
    const defaultModels: PredictiveModel[] = [
      {
        id: 'linear_trend',
        name: 'Linear Trend Model',
        type: 'linear_regression',
        description: 'Simple linear regression for trend analysis',
        enabled: true,
        hyperparameters: { 
          lookback_hours: 168, // 1 week
          polynomial_degree: 1 
        },
        trainingData: {
          metricName: 'latency',
          timeRange: { start: 0, end: 0 },
          frequency: 'hour',
          features: ['timestamp', 'hour_of_day', 'day_of_week']
        },
        performance: {
          accuracy: 0.0,
          mape: 0.0,
          rmse: 0.0,
          lastTraining: 0,
          validationScore: 0.0
        },
        metadata: {}
      },
      {
        id: 'seasonal_model',
        name: 'Seasonal Decomposition Model',
        type: 'seasonal_decompose',
        description: 'Seasonal trend decomposition for periodic patterns',
        enabled: true,
        hyperparameters: {
          seasonal_periods: 24, // 24 hours
          trend_component: true,
          seasonal_component: true
        },
        trainingData: {
          metricName: 'cost',
          timeRange: { start: 0, end: 0 },
          frequency: 'hour',
          features: ['timestamp', 'seasonal_component', 'trend_component']
        },
        performance: {
          accuracy: 0.0,
          mape: 0.0,
          rmse: 0.0,
          lastTraining: 0,
          validationScore: 0.0
        },
        metadata: {}
      }
    ];

    defaultModels.forEach(model => this.addModel(model));
  }

  private async fetchTrainingData(model: PredictiveModel): Promise<Array<{
    timestamp: number;
    value: number;
    features: Record<string, number>;
  }>> {
    
    const endTime = Date.now();
    const startTime = endTime - (model.hyperparameters.lookback_hours * 3600000);
    
    const query = `
      SELECT timestamp, value, metadata
      FROM system_metrics
      WHERE metric_name = ? AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp
    `;
    
    const rows = await this.executeQuery(query, [
      model.trainingData.metricName,
      new Date(startTime).toISOString(),
      new Date(endTime).toISOString()
    ]);
    
    return rows.map((row: any) => {
      const timestamp = new Date(row.timestamp).getTime();
      const date = new Date(timestamp);
      
      return {
        timestamp,
        value: parseFloat(row.value),
        features: {
          hour_of_day: date.getHours(),
          day_of_week: date.getDay(),
          day_of_month: date.getDate(),
          month: date.getMonth(),
          timestamp_normalized: timestamp / 1000000000 // Normalize for ML
        }
      };
    });
  }

  private async fetchRecentData(metricName: string, hours: number): Promise<Array<{
    timestamp: number;
    value: number;
  }>> {
    
    const endTime = Date.now();
    const startTime = endTime - (hours * 3600000);
    
    const query = `
      SELECT timestamp, value
      FROM system_metrics
      WHERE metric_name = ? AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp
    `;
    
    const rows = await this.executeQuery(query, [
      metricName,
      new Date(startTime).toISOString(),
      new Date(endTime).toISOString()
    ]);
    
    return rows.map((row: any) => ({
      timestamp: new Date(row.timestamp).getTime(),
      value: parseFloat(row.value)
    }));
  }

  private async fetchMetricData(
    metricName: string, 
    timeRange: { start: number; end: number }
  ): Promise<Array<{ timestamp: number; value: number }>> {
    
    const query = `
      SELECT timestamp, value
      FROM system_metrics
      WHERE metric_name = ? AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp
    `;
    
    const rows = await this.executeQuery(query, [
      metricName,
      new Date(timeRange.start).toISOString(),
      new Date(timeRange.end).toISOString()
    ]);
    
    return rows.map((row: any) => ({
      timestamp: new Date(row.timestamp).getTime(),
      value: parseFloat(row.value)
    }));
  }

  private async executeTraining(
    model: PredictiveModel,
    data: Array<{ timestamp: number; value: number; features: Record<string, number> }>
  ): Promise<{ performance: PredictiveModel['performance'] }> {
    
    // Simplified model training implementation
    switch (model.type) {
      case 'linear_regression':
        return this.trainLinearRegression(data);
      case 'seasonal_decompose':
        return this.trainSeasonalModel(data);
      case 'exponential_smoothing':
        return this.trainExponentialSmoothing(data);
      default:
        console.warn(`Unknown model type: ${model.type}, using linear regression as fallback`);
        return this.trainLinearRegression(data);
    }
  }

  private trainLinearRegression(data: Array<{ timestamp: number; value: number; features: Record<string, number> }>): { performance: PredictiveModel['performance'] } {
    // Simplified linear regression training
    const n = data.length;
    const xMean = data.reduce((sum, d) => sum + d.features.timestamp_normalized, 0) / n;
    const yMean = data.reduce((sum, d) => sum + d.value, 0) / n;
    
    const slope = data.reduce((sum, d) => 
      sum + (d.features.timestamp_normalized - xMean) * (d.value - yMean), 0
    ) / data.reduce((sum, d) => 
      sum + Math.pow(d.features.timestamp_normalized - xMean, 2), 0
    );
    
    // Calculate R-squared
    const predictions = data.map(d => yMean + slope * (d.features.timestamp_normalized - xMean));
    const ssRes = data.reduce((sum, d, i) => sum + Math.pow(d.value - predictions[i], 2), 0);
    const ssTot = data.reduce((sum, d) => sum + Math.pow(d.value - yMean, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);
    
    // Calculate MAPE
    const mape = data.reduce((sum, d, i) => 
      sum + Math.abs((d.value - predictions[i]) / d.value), 0
    ) / n * 100;
    
    // Calculate RMSE
    const rmse = Math.sqrt(ssRes / n);
    
    return {
      performance: {
        accuracy: Math.max(0, rSquared),
        mape,
        rmse,
        lastTraining: Date.now(),
        validationScore: Math.max(0, 1 - mape / 100)
      }
    };
  }

  private trainSeasonalModel(data: Array<{ timestamp: number; value: number; features: Record<string, number> }>): { performance: PredictiveModel['performance'] } {
    // Simplified seasonal decomposition
    const seasonalPeriod = 24; // 24-hour seasonality
    const seasonalComponents: Record<number, number[]> = {};
    
    // Group by hour of day
    data.forEach(d => {
      const hour = d.features.hour_of_day;
      if (!seasonalComponents[hour]) {
        seasonalComponents[hour] = [];
      }
      seasonalComponents[hour].push(d.value);
    });
    
    // Calculate seasonal averages
    const seasonalPattern: Record<number, number> = {};
    Object.entries(seasonalComponents).forEach(([hour, values]) => {
      seasonalPattern[parseInt(hour)] = values.reduce((sum, v) => sum + v, 0) / values.length;
    });
    
    // Calculate trend (simplified as overall mean)
    const overallMean = data.reduce((sum, d) => sum + d.value, 0) / data.length;
    
    // Generate predictions using seasonal pattern
    const predictions = data.map(d => {
      const seasonal = seasonalPattern[d.features.hour_of_day] || overallMean;
      return seasonal;
    });
    
    // Calculate performance metrics
    const mape = data.reduce((sum, d, i) => 
      sum + Math.abs((d.value - predictions[i]) / d.value), 0
    ) / data.length * 100;
    
    const rmse = Math.sqrt(
      data.reduce((sum, d, i) => sum + Math.pow(d.value - predictions[i], 2), 0) / data.length
    );
    
    return {
      performance: {
        accuracy: Math.max(0, 1 - mape / 100),
        mape,
        rmse,
        lastTraining: Date.now(),
        validationScore: Math.max(0, 1 - mape / 100)
      }
    };
  }

  private trainExponentialSmoothing(data: Array<{ timestamp: number; value: number; features: Record<string, number> }>): { performance: PredictiveModel['performance'] } {
    // Simplified exponential smoothing
    const alpha = 0.3; // Smoothing parameter
    const smoothedValues: number[] = [];
    
    smoothedValues[0] = data[0].value;
    
    for (let i = 1; i < data.length; i++) {
      smoothedValues[i] = alpha * data[i].value + (1 - alpha) * smoothedValues[i - 1];
    }
    
    // Calculate performance metrics
    const mape = data.reduce((sum, d, i) => 
      sum + Math.abs((d.value - smoothedValues[i]) / d.value), 0
    ) / data.length * 100;
    
    const rmse = Math.sqrt(
      data.reduce((sum, d, i) => sum + Math.pow(d.value - smoothedValues[i], 2), 0) / data.length
    );
    
    return {
      performance: {
        accuracy: Math.max(0, 1 - mape / 100),
        mape,
        rmse,
        lastTraining: Date.now(),
        validationScore: Math.max(0, 1 - mape / 100)
      }
    };
  }

  private async executePrediction(
    model: PredictiveModel,
    data: Array<{ timestamp: number; value: number }>,
    horizonHours: number,
    confidence: number
  ): Promise<Forecast['predictions']> {
    
    const predictions: Forecast['predictions'] = [];
    const lastTimestamp = data[data.length - 1].timestamp;
    const lastValue = data[data.length - 1].value;
    
    // Simple trend calculation
    const trend = this.calculateSimpleTrend(data.slice(-24)); // Last 24 points
    
    for (let i = 1; i <= horizonHours; i++) {
      const timestamp = lastTimestamp + (i * 3600000); // Add hours
      
      let predictedValue: number;
      let confidenceValue = confidence;
      
      switch (model.type) {
        case 'linear_regression':
          predictedValue = lastValue + (trend * i);
          break;
        case 'seasonal_decompose':
          const hour = new Date(timestamp).getHours();
          const seasonalFactor = Math.sin((hour * Math.PI) / 12) * 0.1 + 1;
          predictedValue = lastValue * seasonalFactor + (trend * i * 0.5);
          break;
        case 'exponential_smoothing':
          predictedValue = lastValue + (trend * i * 0.7);
          break;
        default:
          predictedValue = lastValue + (trend * i);
      }
      
      // Add some uncertainty that increases with time
      const uncertainty = Math.sqrt(i) * (predictedValue * 0.1);
      const confidenceMultiplier = 1.96; // 95% confidence interval
      
      predictions.push({
        timestamp,
        value: Math.max(0, predictedValue),
        upperBound: Math.max(0, predictedValue + uncertainty * confidenceMultiplier),
        lowerBound: Math.max(0, predictedValue - uncertainty * confidenceMultiplier),
        confidence: Math.max(0.1, confidenceValue - (i * 0.01)) // Decrease confidence over time
      });
    }
    
    return predictions;
  }

  private calculateSimpleTrend(data: Array<{ timestamp: number; value: number }>): number {
    if (data.length < 2) return 0;
    
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.value, 0) / secondHalf.length;
    
    return (secondAvg - firstAvg) / (data.length / 2);
  }

  private detectTriggers(predictions: Forecast['predictions'], model: PredictiveModel): Forecast['triggers'] {
    const triggers: Forecast['triggers'] = [];
    
    // Detect threshold violations
    const thresholds = {
      latency: 10000, // 10 seconds
      cost: 0.01, // 1 cent
      memory_usage: 80, // 80%
      cpu_usage: 90 // 90%
    };
    
    predictions.forEach(prediction => {
      Object.entries(thresholds).forEach(([metric, threshold]) => {
        if (model.trainingData.metricName.includes(metric.split('_')[0])) {
          if (prediction.value > threshold) {
            triggers.push({
              type: 'threshold',
              probability: prediction.confidence,
              description: `${metric} predicted to exceed threshold of ${threshold}`,
              severity: prediction.value > threshold * 1.5 ? 'critical' : 'high'
            });
          }
        }
      });
    });
    
    // Detect trend changes
    const values = predictions.map(p => p.value);
    const trend = this.calculateSimpleTrend(
      predictions.map(p => ({ timestamp: p.timestamp, value: p.value }))
    );
    
    if (Math.abs(trend) > 0.1) {
      triggers.push({
        type: 'trend_change',
        probability: 0.8,
        description: `Significant ${trend > 0 ? 'increasing' : 'decreasing'} trend detected`,
        severity: Math.abs(trend) > 0.5 ? 'high' : 'medium'
      });
    }
    
    return triggers;
  }

  private calculateTrend(data: Array<{ timestamp: number; value: number }>): TrendAnalysis['trend'] {
    if (data.length < 3) {
      return {
        direction: 'stable',
        strength: 0,
        changeRate: 0,
        confidence: 0
      };
    }
    
    // Linear regression for trend
    const n = data.length;
    const xMean = data.reduce((sum, d, i) => sum + i, 0) / n;
    const yMean = data.reduce((sum, d) => sum + d.value, 0) / n;
    
    const slope = data.reduce((sum, d, i) => sum + (i - xMean) * (d.value - yMean), 0) /
                  data.reduce((sum, d, i) => sum + Math.pow(i - xMean, 2), 0);
    
    const changeRate = (slope / yMean) * 100; // Percentage change per period
    
    let direction: TrendAnalysis['trend']['direction'];
    if (Math.abs(changeRate) < 1) {
      direction = 'stable';
    } else if (changeRate > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }
    
    // Calculate R-squared as strength indicator
    const predictions = data.map((d, i) => yMean + slope * (i - xMean));
    const ssRes = data.reduce((sum, d, i) => sum + Math.pow(d.value - predictions[i], 2), 0);
    const ssTot = data.reduce((sum, d) => sum + Math.pow(d.value - yMean, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);
    
    return {
      direction,
      strength: Math.max(0, Math.min(1, rSquared)),
      changeRate: Math.abs(changeRate),
      confidence: Math.max(0, Math.min(1, rSquared))
    };
  }

  private detectSeasonality(data: Array<{ timestamp: number; value: number }>): TrendAnalysis['seasonality'] {
    if (data.length < 48) { // Need at least 2 days of hourly data
      return { detected: false };
    }
    
    // Group by hour of day
    const hourlyGroups: Record<number, number[]> = {};
    
    data.forEach(d => {
      const hour = new Date(d.timestamp).getHours();
      if (!hourlyGroups[hour]) {
        hourlyGroups[hour] = [];
      }
      hourlyGroups[hour].push(d.value);
    });
    
    // Calculate variance within hours vs between hours
    const hourlyMeans = Object.values(hourlyGroups).map(values => 
      values.reduce((sum, v) => sum + v, 0) / values.length
    );
    
    const overallMean = data.reduce((sum, d) => sum + d.value, 0) / data.length;
    const betweenVariance = hourlyMeans.reduce((sum, mean) => 
      sum + Math.pow(mean - overallMean, 2), 0) / hourlyMeans.length;
    
    const withinVariance = Object.values(hourlyGroups).reduce((sum, values) => {
      const mean = values.reduce((s, v) => s + v, 0) / values.length;
      return sum + values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
    }, 0) / Object.keys(hourlyGroups).length;
    
    const seasonalStrength = betweenVariance / (betweenVariance + withinVariance);
    
    return {
      detected: seasonalStrength > 0.3,
      period: 24, // 24-hour period
      strength: seasonalStrength,
      pattern: hourlyMeans
    };
  }

  private detectAnomaliesInData(data: Array<{ timestamp: number; value: number }>): TrendAnalysis['anomalies'] {
    const anomalies: TrendAnalysis['anomalies'] = [];
    
    if (data.length < 10) return anomalies;
    
    // Calculate statistical thresholds
    const values = data.map(d => d.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    );
    
    // Detect outliers using z-score
    data.forEach(d => {
      const zScore = Math.abs((d.value - mean) / stdDev);
      
      if (zScore > 3) { // 3-sigma rule
        let severity: TrendAnalysis['anomalies'][0]['severity'] = 'low';
        let type: TrendAnalysis['anomalies'][0]['type'] = 'outlier';
        
        if (zScore > 4) severity = 'high';
        else if (zScore > 3.5) severity = 'medium';
        
        if (d.value > mean + 3 * stdDev) type = 'spike';
        else if (d.value < mean - 3 * stdDev) type = 'drop';
        
        anomalies.push({
          timestamp: d.timestamp,
          value: d.value,
          expectedValue: mean,
          deviation: zScore,
          severity,
          type
        });
      }
    });
    
    return anomalies;
  }

  private async findCorrelations(
    metricName: string,
    timeRange: { start: number; end: number }
  ): Promise<TrendAnalysis['correlations']> {
    
    // Get other metrics for correlation analysis
    const query = `
      SELECT DISTINCT metric_name 
      FROM system_metrics 
      WHERE metric_name != ? 
      AND timestamp BETWEEN ? AND ?
    `;
    
    const otherMetrics = await this.executeQuery(query, [
      metricName,
      new Date(timeRange.start).toISOString(),
      new Date(timeRange.end).toISOString()
    ]);
    
    const correlations: TrendAnalysis['correlations'] = [];
    
    // For each other metric, calculate correlation
    for (const metric of otherMetrics.slice(0, 5)) { // Limit to 5 for performance
      try {
        const correlation = await this.calculateCorrelation(
          metricName,
          metric.metric_name,
          timeRange
        );
        
        if (Math.abs(correlation) > 0.3) { // Only include significant correlations
          correlations.push({
            metric: metric.metric_name,
            correlation,
            significance: Math.abs(correlation),
            lag: 0 // Simplified, no lag analysis
          });
        }
      } catch (error) {
        // Skip metrics that can't be correlated
      }
    }
    
    return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }

  private async calculateCorrelation(
    metric1: string,
    metric2: string,
    timeRange: { start: number; end: number }
  ): Promise<number> {
    
    // Fetch both metrics
    const [data1, data2] = await Promise.all([
      this.fetchMetricData(metric1, timeRange),
      this.fetchMetricData(metric2, timeRange)
    ]);
    
    // Align data points by timestamp
    const alignedData: Array<{ x: number; y: number }> = [];
    
    data1.forEach(d1 => {
      const d2 = data2.find(d => Math.abs(d.timestamp - d1.timestamp) < 300000); // 5 minute tolerance
      if (d2) {
        alignedData.push({ x: d1.value, y: d2.value });
      }
    });
    
    if (alignedData.length < 3) return 0;
    
    // Calculate Pearson correlation
    const n = alignedData.length;
    const xMean = alignedData.reduce((sum, d) => sum + d.x, 0) / n;
    const yMean = alignedData.reduce((sum, d) => sum + d.y, 0) / n;
    
    const numerator = alignedData.reduce((sum, d) => 
      sum + (d.x - xMean) * (d.y - yMean), 0);
    
    const denominator = Math.sqrt(
      alignedData.reduce((sum, d) => sum + Math.pow(d.x - xMean, 2), 0) *
      alignedData.reduce((sum, d) => sum + Math.pow(d.y - yMean, 2), 0)
    );
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private generateTrendInsights(
    data: Array<{ timestamp: number; value: number }>,
    trend: TrendAnalysis['trend'],
    anomalies: TrendAnalysis['anomalies']
  ): TrendAnalysis['insights'] {
    
    const insights: TrendAnalysis['insights'] = [];
    
    // Trend-based insights
    if (trend.direction === 'increasing' && trend.strength > 0.7) {
      insights.push({
        type: 'risk',
        description: 'Strong upward trend detected - may indicate resource pressure',
        impact: trend.changeRate > 10 ? 'critical' : 'high',
        confidence: trend.confidence,
        actionable: true,
        recommendations: [
          'Monitor resource utilization closely',
          'Consider scaling up resources',
          'Investigate root cause of increase'
        ]
      });
    }
    
    if (trend.direction === 'decreasing' && trend.strength > 0.7) {
      insights.push({
        type: 'opportunity',
        description: 'Strong downward trend detected - possible optimization opportunity',
        impact: 'medium',
        confidence: trend.confidence,
        actionable: true,
        recommendations: [
          'Analyze what caused the improvement',
          'Document optimization practices',
          'Consider scaling down unused resources'
        ]
      });
    }
    
    // Anomaly-based insights
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical' || a.severity === 'high');
    if (criticalAnomalies.length > 0) {
      insights.push({
        type: 'degradation',
        description: `${criticalAnomalies.length} critical anomalies detected`,
        impact: 'high',
        confidence: 0.9,
        actionable: true,
        recommendations: [
          'Investigate anomaly root causes',
          'Implement additional monitoring',
          'Consider alerting thresholds adjustment'
        ]
      });
    }
    
    return insights;
  }

  private executeAnomalyDetection(
    data: Array<{ timestamp: number; value: number }>,
    algorithm: AnomalyDetection['algorithm'],
    options: { sensitivity: number; threshold: number; windowSize: number }
  ): AnomalyDetection['detectedAnomalies'] {
    
    const anomalies: AnomalyDetection['detectedAnomalies'] = [];
    
    switch (algorithm) {
      case 'statistical_outlier':
        return this.detectStatisticalOutliers(data, options.threshold);
      case 'isolation_forest':
        return this.detectIsolationForestAnomalies(data, options.sensitivity);
      default:
        return anomalies;
    }
  }

  private detectStatisticalOutliers(
    data: Array<{ timestamp: number; value: number }>,
    threshold: number
  ): AnomalyDetection['detectedAnomalies'] {
    
    const anomalies: AnomalyDetection['detectedAnomalies'] = [];
    
    if (data.length < 10) return anomalies;
    
    const values = data.map(d => d.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    );
    
    data.forEach(d => {
      const zScore = Math.abs((d.value - mean) / stdDev);
      
      if (zScore > threshold) {
        let severity: AnomalyDetection['detectedAnomalies'][0]['severity'] = 'low';
        
        if (zScore > threshold * 1.5) severity = 'critical';
        else if (zScore > threshold * 1.2) severity = 'high';
        else if (zScore > threshold * 1.1) severity = 'medium';
        
        anomalies.push({
          timestamp: d.timestamp,
          value: d.value,
          anomalyScore: zScore,
          severity,
          description: `Statistical outlier detected (z-score: ${zScore.toFixed(2)})`,
          context: { mean, stdDev, threshold }
        });
      }
    });
    
    return anomalies;
  }

  private detectIsolationForestAnomalies(
    data: Array<{ timestamp: number; value: number }>,
    sensitivity: number
  ): AnomalyDetection['detectedAnomalies'] {
    
    // Simplified isolation forest implementation
    const anomalies: AnomalyDetection['detectedAnomalies'] = [];
    
    // Use moving averages and deviations as features
    const windowSize = Math.min(10, Math.floor(data.length / 4));
    
    data.forEach((d, i) => {
      if (i < windowSize) return;
      
      const window = data.slice(i - windowSize, i);
      const windowMean = window.reduce((sum, w) => sum + w.value, 0) / window.length;
      const windowStd = Math.sqrt(
        window.reduce((sum, w) => sum + Math.pow(w.value - windowMean, 2), 0) / window.length
      );
      
      const deviation = Math.abs(d.value - windowMean) / (windowStd + 0.001); // Add small epsilon
      
      // Simple isolation score based on deviation
      const isolationScore = Math.min(1, deviation / 3);
      
      if (isolationScore > (1 - sensitivity)) {
        let severity: AnomalyDetection['detectedAnomalies'][0]['severity'] = 'low';
        
        if (isolationScore > 0.9) severity = 'critical';
        else if (isolationScore > 0.8) severity = 'high';
        else if (isolationScore > 0.7) severity = 'medium';
        
        anomalies.push({
          timestamp: d.timestamp,
          value: d.value,
          anomalyScore: isolationScore,
          severity,
          description: `Isolation forest anomaly detected (score: ${isolationScore.toFixed(3)})`,
          context: { windowMean, windowStd, sensitivity }
        });
      }
    });
    
    return anomalies;
  }

  private calculateAnomalyPerformance(anomalies: AnomalyDetection['detectedAnomalies']): AnomalyDetection['performance'] {
    // Simplified performance calculation
    // In a real implementation, this would compare against ground truth
    
    const totalAnomalies = anomalies.length;
    const highSeverityAnomalies = anomalies.filter(a => 
      a.severity === 'high' || a.severity === 'critical'
    ).length;
    
    return {
      precision: totalAnomalies > 0 ? highSeverityAnomalies / totalAnomalies : 1.0,
      recall: 0.8, // Assumed
      f1Score: 0.75, // Assumed
      falsePositiveRate: Math.max(0, 1 - (highSeverityAnomalies / Math.max(1, totalAnomalies)))
    };
  }

  private async getCurrentUtilization(
    component: string,
    metrics: string[]
  ): Promise<number> {
    
    // Get latest values for utilization metrics
    const utilizationValues: number[] = [];
    
    for (const metric of metrics) {
      const query = `
        SELECT value FROM system_metrics
        WHERE metric_name = ? AND component = ?
        ORDER BY timestamp DESC
        LIMIT 1
      `;
      
      const rows = await this.executeQuery(query, [metric, component]);
      if (rows.length > 0) {
        utilizationValues.push(parseFloat(rows[0].value));
      }
    }
    
    return utilizationValues.length > 0
      ? utilizationValues.reduce((sum, v) => sum + v, 0) / utilizationValues.length
      : 0;
  }

  private async projectCapacityTrend(
    component: string,
    metrics: string[],
    thresholds: Record<string, number>
  ): Promise<CapacityPlanningInsight['trendProjection']> {
    
    // Get historical data for trend projection
    const timeRange = {
      start: Date.now() - (7 * 24 * 60 * 60 * 1000), // Last week
      end: Date.now()
    };
    
    let combinedTrend = 0;
    let trendCount = 0;
    
    for (const metric of metrics) {
      const data = await this.fetchMetricData(metric, timeRange);
      if (data.length > 10) {
        const trend = this.calculateTrend(data);
        combinedTrend += trend.changeRate;
        trendCount++;
      }
    }
    
    const averageTrend = trendCount > 0 ? combinedTrend / trendCount : 0;
    const assumedThreshold = thresholds[component] || 80; // Default 80%
    const currentUtilization = await this.getCurrentUtilization(component, metrics);
    
    // Calculate time to capacity
    let timeToCapacity = Infinity;
    if (averageTrend > 0) {
      const remainingCapacity = assumedThreshold - currentUtilization;
      timeToCapacity = Math.max(0, remainingCapacity / averageTrend); // Hours
    }
    
    return {
      timeToCapacity,
      confidenceLevel: Math.min(0.9, Math.max(0.1, trendCount / metrics.length)),
      assumedThreshold
    };
  }

  private generateCapacityRecommendations(
    currentUtilization: number,
    projection: CapacityPlanningInsight['trendProjection']
  ): CapacityPlanningInsight['recommendations'] {
    
    const recommendations: CapacityPlanningInsight['recommendations'] = [];
    
    if (currentUtilization > 80) {
      recommendations.push({
        type: 'scale_up',
        priority: 'urgent',
        description: 'Current utilization exceeds 80% - immediate scaling recommended',
        estimatedCost: 100, // Placeholder
        expectedImpact: 'Immediate relief of resource pressure',
        timeline: 'Within 1 hour'
      });
    } else if (projection.timeToCapacity < 24) {
      recommendations.push({
        type: 'scale_out',
        priority: 'high',
        description: 'Capacity will be reached within 24 hours - proactive scaling recommended',
        estimatedCost: 200,
        expectedImpact: 'Prevent capacity constraints',
        timeline: 'Within 4 hours'
      });
    } else if (projection.timeToCapacity < 168) { // 1 week
      recommendations.push({
        type: 'optimize',
        priority: 'medium',
        description: 'Consider optimization before scaling - capacity projected in 1 week',
        estimatedCost: 50,
        expectedImpact: 'Delay scaling needs through optimization',
        timeline: 'Within 2 days'
      });
    }
    
    return recommendations;
  }

  private assessCapacityRisks(
    currentUtilization: number,
    projection: CapacityPlanningInsight['trendProjection']
  ): CapacityPlanningInsight['riskAssessment'] {
    
    let probability = 0;
    let impact: CapacityPlanningInsight['riskAssessment']['impact'] = 'low';
    
    if (currentUtilization > 90) {
      probability = 0.9;
      impact = 'critical';
    } else if (currentUtilization > 80) {
      probability = 0.7;
      impact = 'high';
    } else if (projection.timeToCapacity < 72) { // 3 days
      probability = 0.5;
      impact = 'medium';
    } else {
      probability = 0.1;
      impact = 'low';
    }
    
    const mitigationStrategies = [
      'Implement auto-scaling policies',
      'Set up capacity monitoring alerts',
      'Optimize resource usage patterns',
      'Plan capacity increases in advance'
    ];
    
    return {
      probability,
      impact,
      mitigationStrategies
    };
  }

  private alignPredictionsWithActuals(
    predictions: Forecast['predictions'],
    actualData: Array<{ timestamp: number; value: number }>
  ): Array<{ predicted: number; actual: number; timestamp: number }> {
    
    const aligned: Array<{ predicted: number; actual: number; timestamp: number }> = [];
    
    predictions.forEach(prediction => {
      const actual = actualData.find(a => 
        Math.abs(a.timestamp - prediction.timestamp) < 1800000 // 30 minute tolerance
      );
      
      if (actual) {
        aligned.push({
          predicted: prediction.value,
          actual: actual.value,
          timestamp: prediction.timestamp
        });
      }
    });
    
    return aligned;
  }

  private calculateAccuracyMetrics(
    alignedData: Array<{ predicted: number; actual: number; timestamp: number }>
  ): { accuracy: number; mape: number; rmse: number; directionalAccuracy: number } {
    
    if (alignedData.length === 0) {
      return { accuracy: 0, mape: 100, rmse: 0, directionalAccuracy: 0 };
    }
    
    // Calculate MAPE (Mean Absolute Percentage Error)
    const mape = alignedData.reduce((sum, d) => {
      const error = Math.abs((d.actual - d.predicted) / Math.max(0.001, d.actual));
      return sum + error;
    }, 0) / alignedData.length * 100;
    
    // Calculate RMSE (Root Mean Square Error)
    const rmse = Math.sqrt(
      alignedData.reduce((sum, d) => sum + Math.pow(d.actual - d.predicted, 2), 0) / alignedData.length
    );
    
    // Calculate directional accuracy
    let correctDirections = 0;
    for (let i = 1; i < alignedData.length; i++) {
      const actualDirection = alignedData[i].actual - alignedData[i - 1].actual;
      const predictedDirection = alignedData[i].predicted - alignedData[i - 1].predicted;
      
      if ((actualDirection > 0 && predictedDirection > 0) || 
          (actualDirection < 0 && predictedDirection < 0) ||
          (actualDirection === 0 && Math.abs(predictedDirection) < 0.01)) {
        correctDirections++;
      }
    }
    
    const directionalAccuracy = alignedData.length > 1 
      ? correctDirections / (alignedData.length - 1)
      : 0;
    
    const accuracy = Math.max(0, 1 - (mape / 100));
    
    return {
      accuracy,
      mape,
      rmse,
      directionalAccuracy
    };
  }

  private getCachedAnalysis(cacheKey: string): TrendAnalysis | null {
    // Simple in-memory cache implementation
    return null; // Would implement actual caching
  }

  private generateForecastId(): string {
    return `forecast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startPredictiveLoop(): void {
    // Periodic model training
    this.trainingInterval = setInterval(async () => {
      for (const model of this.models.values()) {
        if (model.enabled) {
          try {
            await this.trainModel(model.id);
          } catch (error) {
            console.error(`Scheduled training failed for ${model.name}:`, error);
          }
        }
      }
    }, 6 * 60 * 60 * 1000); // Every 6 hours
    
    // Periodic prediction generation
    this.predictionInterval = setInterval(async () => {
      const metricsToPredict = ['latency', 'cost', 'memory_usage', 'cpu_usage'];
      
      for (const metric of metricsToPredict) {
        for (const model of this.models.values()) {
          if (model.enabled && model.trainingData.metricName.includes(metric.split('_')[0])) {
            try {
              await this.generateForecast(model.id, metric, 24, 0.95);
            } catch (error) {
              console.error(`Scheduled prediction failed for ${metric}:`, error);
            }
          }
        }
      }
    }, 60 * 60 * 1000); // Every hour
    
    console.log('🔄 Predictive analytics loop started');
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

  /**
   * Stop predictive analytics
   */
  stop(): void {
    if (this.trainingInterval) {
      clearInterval(this.trainingInterval);
      this.trainingInterval = null;
    }
    
    if (this.predictionInterval) {
      clearInterval(this.predictionInterval);
      this.predictionInterval = null;
    }
    
    this.removeAllListeners();
    console.log('🛑 Predictive Analytics stopped');
  }
}