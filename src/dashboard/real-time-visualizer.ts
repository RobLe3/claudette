// Real-Time Visualizer - Advanced data visualization for monitoring dashboards
// Chart rendering, data streaming, and interactive analytics

import { EventEmitter } from 'events';

export interface ChartConfiguration {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'gauge' | 'heatmap';
  title: string;
  subtitle?: string;
  width: number;
  height: number;
  responsive: boolean;
  animation: {
    enabled: boolean;
    duration: number;
    easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  };
  colors: string[];
  theme: 'light' | 'dark';
  grid: {
    show: boolean;
    color: string;
    opacity: number;
  };
  legend: {
    show: boolean;
    position: 'top' | 'bottom' | 'left' | 'right';
  };
  tooltip: {
    enabled: boolean;
    format: string;
  };
  axes: {
    x: AxisConfiguration;
    y: AxisConfiguration;
  };
  realTime: {
    enabled: boolean;
    interval: number;
    maxDataPoints: number;
    scrolling: boolean;
  };
  thresholds: Array<{
    value: number;
    color: string;
    label: string;
    style: 'solid' | 'dashed' | 'dotted';
  }>;
}

export interface AxisConfiguration {
  title: string;
  type: 'linear' | 'logarithmic' | 'time' | 'category';
  min?: number;
  max?: number;
  format: string;
  grid: boolean;
  ticks: {
    count: number;
    rotation: number;
  };
}

export interface DataSeries {
  name: string;
  data: Array<{ x: number | string; y: number; metadata?: any }>;
  color?: string;
  type?: ChartConfiguration['type'];
  yAxis?: number;
  visible: boolean;
  smooth: boolean;
  fill: boolean;
  opacity: number;
}

export interface VisualizationState {
  isStreaming: boolean;
  lastUpdate: number;
  dataPoints: number;
  renderTime: number;
  fps: number;
  memoryUsage: number;
  errors: string[];
}

export interface InteractionEvent {
  type: 'click' | 'hover' | 'zoom' | 'pan' | 'select';
  target: 'point' | 'series' | 'axis' | 'legend';
  data: any;
  coordinates: { x: number; y: number };
  modifiers: {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
  };
}

export interface AlertOverlay {
  id: string;
  type: 'threshold' | 'anomaly' | 'trend' | 'regression';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  coordinates?: { x: number; y: number };
  duration?: number;
  blinking: boolean;
}

export class RealTimeVisualizer extends EventEmitter {
  private config: ChartConfiguration;
  private dataSeries: Map<string, DataSeries> = new Map();
  private state: VisualizationState;
  private alertOverlays: Map<string, AlertOverlay> = new Map();
  private renderLoop: NodeJS.Timeout | null = null;
  private performanceMonitor: {
    frameCount: number;
    lastFpsUpdate: number;
    renderTimes: number[];
  };
  private canvas: any = null; // Would be actual canvas in browser environment
  private isDestroyed: boolean = false;

  constructor(config: Partial<ChartConfiguration> = {}) {
    super();
    
    this.config = {
      type: 'line',
      title: 'Real-Time Metrics',
      width: 800,
      height: 400,
      responsive: true,
      animation: {
        enabled: true,
        duration: 300,
        easing: 'ease-out'
      },
      colors: [
        '#007bff', '#28a745', '#ffc107', '#dc3545', 
        '#6610f2', '#e83e8c', '#20c997', '#fd7e14'
      ],
      theme: 'dark',
      grid: {
        show: true,
        color: '#333333',
        opacity: 0.3
      },
      legend: {
        show: true,
        position: 'top'
      },
      tooltip: {
        enabled: true,
        format: '{series}: {value} {unit}'
      },
      axes: {
        x: {
          title: 'Time',
          type: 'time',
          format: 'HH:mm:ss',
          grid: true,
          ticks: { count: 6, rotation: 0 }
        },
        y: {
          title: 'Value',
          type: 'linear',
          format: '.2f',
          grid: true,
          ticks: { count: 5, rotation: 0 }
        }
      },
      realTime: {
        enabled: true,
        interval: 1000,
        maxDataPoints: 100,
        scrolling: true
      },
      thresholds: [],
      ...config
    };

    this.state = {
      isStreaming: false,
      lastUpdate: 0,
      dataPoints: 0,
      renderTime: 0,
      fps: 0,
      memoryUsage: 0,
      errors: []
    };

    this.performanceMonitor = {
      frameCount: 0,
      lastFpsUpdate: Date.now(),
      renderTimes: []
    };

    console.log('📈 Real-Time Visualizer initialized');
  }

  /**
   * Add data series to visualization
   */
  addSeries(series: DataSeries): void {
    this.dataSeries.set(series.name, {
      ...series,
      color: series.color || this.getNextColor(),
      visible: series.visible !== false,
      smooth: series.smooth !== false,
      fill: series.fill || false,
      opacity: series.opacity || 1.0
    });
    
    this.emit('seriesAdded', series);
    this.updateDataPointsCount();
    
    if (this.config.realTime.enabled && !this.state.isStreaming) {
      this.startStreaming();
    }
  }

  /**
   * Update existing series data
   */
  updateSeries(seriesName: string, newData: DataSeries['data']): void {
    const series = this.dataSeries.get(seriesName);
    if (!series) return;

    // Limit data points for performance
    const maxPoints = this.config.realTime.maxDataPoints;
    if (newData.length > maxPoints) {
      newData = newData.slice(-maxPoints);
    }

    series.data = newData;
    this.dataSeries.set(seriesName, series);
    
    this.emit('seriesUpdated', { name: seriesName, data: newData });
    this.updateDataPointsCount();
    this.scheduleRender();
  }

  /**
   * Add single data point to series
   */
  addDataPoint(seriesName: string, point: { x: number | string; y: number; metadata?: any }): void {
    const series = this.dataSeries.get(seriesName);
    if (!series) return;

    series.data.push(point);
    
    // Remove old points if exceeding max
    if (series.data.length > this.config.realTime.maxDataPoints) {
      series.data.shift();
    }
    
    this.dataSeries.set(seriesName, series);
    this.emit('dataPointAdded', { series: seriesName, point });
    this.updateDataPointsCount();
    this.scheduleRender();
  }

  /**
   * Remove data series
   */
  removeSeries(seriesName: string): void {
    if (this.dataSeries.delete(seriesName)) {
      this.emit('seriesRemoved', seriesName);
      this.updateDataPointsCount();
      this.scheduleRender();
    }
  }

  /**
   * Toggle series visibility
   */
  toggleSeries(seriesName: string, visible?: boolean): void {
    const series = this.dataSeries.get(seriesName);
    if (!series) return;

    series.visible = visible !== undefined ? visible : !series.visible;
    this.dataSeries.set(seriesName, series);
    
    this.emit('seriesToggled', { name: seriesName, visible: series.visible });
    this.scheduleRender();
  }

  /**
   * Add alert overlay
   */
  addAlert(alert: AlertOverlay): void {
    this.alertOverlays.set(alert.id, alert);
    this.emit('alertAdded', alert);
    this.scheduleRender();
    
    // Auto-remove alert after duration
    if (alert.duration) {
      setTimeout(() => {
        this.removeAlert(alert.id);
      }, alert.duration);
    }
  }

  /**
   * Remove alert overlay
   */
  removeAlert(alertId: string): void {
    if (this.alertOverlays.delete(alertId)) {
      this.emit('alertRemoved', alertId);
      this.scheduleRender();
    }
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    this.alertOverlays.clear();
    this.emit('alertsCleared');
    this.scheduleRender();
  }

  /**
   * Start real-time streaming
   */
  startStreaming(): void {
    if (this.state.isStreaming || !this.config.realTime.enabled) return;
    
    this.state.isStreaming = true;
    this.emit('streamingStarted');
    
    // Start render loop
    this.renderLoop = setInterval(() => {
      this.render();
    }, this.config.realTime.interval);
    
    console.log('📈 Real-time visualization streaming started');
  }

  /**
   * Stop real-time streaming
   */
  stopStreaming(): void {
    if (!this.state.isStreaming) return;
    
    this.state.isStreaming = false;
    
    if (this.renderLoop) {
      clearInterval(this.renderLoop);
      this.renderLoop = null;
    }
    
    this.emit('streamingStopped');
    console.log('📈 Real-time visualization streaming stopped');
  }

  /**
   * Render visualization
   */
  render(): void {
    if (this.isDestroyed) return;
    
    const startTime = Date.now();
    
    try {
      // In a real implementation, this would render to canvas/SVG
      this.performActualRender();
      
      // Update performance metrics
      const renderTime = Date.now() - startTime;
      this.updatePerformanceMetrics(renderTime);
      
      this.state.lastUpdate = Date.now();
      this.emit('rendered', {
        renderTime,
        seriesCount: this.dataSeries.size,
        dataPoints: this.state.dataPoints
      });
      
    } catch (error) {
      this.state.errors.push(`Render error: ${error}`);
      this.emit('renderError', error);
      console.error('Visualization render error:', error);
    }
  }

  /**
   * Schedule a render on next frame
   */
  scheduleRender(): void {
    if (this.state.isStreaming) return; // Will render on timer
    
    // Use requestAnimationFrame in browser, setImmediate in Node.js
    setImmediate(() => this.render());
  }

  /**
   * Export visualization data
   */
  exportData(format: 'json' | 'csv' | 'svg' | 'png' = 'json'): any {
    const data = {
      config: this.config,
      series: Array.from(this.dataSeries.values()),
      alerts: Array.from(this.alertOverlays.values()),
      state: this.state,
      timestamp: Date.now()
    };
    
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        return this.convertToCSV(data);
      case 'svg':
        return this.renderToSVG(data);
      case 'png':
        return this.renderToPNG(data);
      default:
        return data;
    }
  }

  /**
   * Import visualization data
   */
  importData(data: string | any): void {
    try {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (parsedData.config) {
        this.config = { ...this.config, ...parsedData.config };
      }
      
      if (parsedData.series) {
        this.dataSeries.clear();
        parsedData.series.forEach((series: DataSeries) => {
          this.dataSeries.set(series.name, series);
        });
      }
      
      if (parsedData.alerts) {
        this.alertOverlays.clear();
        parsedData.alerts.forEach((alert: AlertOverlay) => {
          this.alertOverlays.set(alert.id, alert);
        });
      }
      
      this.updateDataPointsCount();
      this.emit('dataImported', parsedData);
      this.scheduleRender();
      
    } catch (error) {
      console.error('Error importing visualization data:', error);
      this.emit('importError', error);
    }
  }

  /**
   * Handle user interaction
   */
  handleInteraction(event: InteractionEvent): void {
    this.emit('interaction', event);
    
    switch (event.type) {
      case 'click':
        this.handleClick(event);
        break;
      case 'hover':
        this.handleHover(event);
        break;
      case 'zoom':
        this.handleZoom(event);
        break;
      case 'pan':
        this.handlePan(event);
        break;
      case 'select':
        this.handleSelect(event);
        break;
    }
  }

  /**
   * Update visualization configuration
   */
  updateConfiguration(newConfig: Partial<ChartConfiguration>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configurationUpdated', this.config);
    this.scheduleRender();
  }

  /**
   * Get current visualization state
   */
  getState(): VisualizationState {
    return { ...this.state };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    fps: number;
    averageRenderTime: number;
    memoryUsage: number;
    dataPoints: number;
    seriesCount: number;
  } {
    const averageRenderTime = this.performanceMonitor.renderTimes.length > 0
      ? this.performanceMonitor.renderTimes.reduce((sum, time) => sum + time, 0) / this.performanceMonitor.renderTimes.length
      : 0;
    
    return {
      fps: this.state.fps,
      averageRenderTime,
      memoryUsage: this.state.memoryUsage,
      dataPoints: this.state.dataPoints,
      seriesCount: this.dataSeries.size
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.dataSeries.clear();
    this.alertOverlays.clear();
    this.state.dataPoints = 0;
    this.state.errors = [];
    this.emit('cleared');
    this.scheduleRender();
  }

  /**
   * Destroy visualizer and cleanup resources
   */
  destroy(): void {
    this.isDestroyed = true;
    this.stopStreaming();
    this.clear();
    this.removeAllListeners();
    console.log('🧹 Real-Time Visualizer destroyed');
  }

  // Private helper methods
  private getNextColor(): string {
    const usedColors = Array.from(this.dataSeries.values()).map(s => s.color).filter(Boolean);
    const availableColors = this.config.colors.filter(color => !usedColors.includes(color));
    return availableColors[0] || this.config.colors[this.dataSeries.size % this.config.colors.length];
  }

  private updateDataPointsCount(): void {
    this.state.dataPoints = Array.from(this.dataSeries.values())
      .reduce((total, series) => total + series.data.length, 0);
  }

  private updatePerformanceMetrics(renderTime: number): void {
    this.state.renderTime = renderTime;
    
    // Update FPS
    this.performanceMonitor.frameCount++;
    const now = Date.now();
    const timeSinceLastUpdate = now - this.performanceMonitor.lastFpsUpdate;
    
    if (timeSinceLastUpdate >= 1000) {
      this.state.fps = Math.round((this.performanceMonitor.frameCount * 1000) / timeSinceLastUpdate);
      this.performanceMonitor.frameCount = 0;
      this.performanceMonitor.lastFpsUpdate = now;
    }
    
    // Track render times
    this.performanceMonitor.renderTimes.push(renderTime);
    if (this.performanceMonitor.renderTimes.length > 100) {
      this.performanceMonitor.renderTimes.shift();
    }
    
    // Update memory usage
    this.state.memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
  }

  private performActualRender(): void {
    // Placeholder for actual rendering logic
    // In a real implementation, this would:
    // 1. Clear canvas/SVG
    // 2. Draw axes and grid
    // 3. Draw data series
    // 4. Draw legends
    // 5. Draw alert overlays
    // 6. Apply animations and interactions
    
    console.log(`🎨 Rendering ${this.dataSeries.size} series with ${this.state.dataPoints} data points`);
  }

  private handleClick(event: InteractionEvent): void {
    // Handle click interactions
    if (event.target === 'point') {
      this.emit('pointClicked', event.data);
    } else if (event.target === 'legend') {
      this.toggleSeries(event.data.seriesName);
    }
  }

  private handleHover(event: InteractionEvent): void {
    // Handle hover interactions
    this.emit('hover', event.data);
  }

  private handleZoom(event: InteractionEvent): void {
    // Handle zoom interactions
    this.emit('zoom', event.data);
  }

  private handlePan(event: InteractionEvent): void {
    // Handle pan interactions
    this.emit('pan', event.data);
  }

  private handleSelect(event: InteractionEvent): void {
    // Handle selection interactions
    this.emit('select', event.data);
  }

  private convertToCSV(data: any): string {
    const headers = ['timestamp', 'series', 'value', 'metadata'];
    const rows = [headers.join(',')];
    
    data.series.forEach((series: DataSeries) => {
      series.data.forEach(point => {
        const row = [
          point.x,
          series.name,
          point.y,
          JSON.stringify(point.metadata || {})
        ].join(',');
        rows.push(row);
      });
    });
    
    return rows.join('\n');
  }

  private renderToSVG(data: any): string {
    // Placeholder for SVG rendering
    return `<svg width="${this.config.width}" height="${this.config.height}">
      <!-- SVG content would be generated here -->
      <text x="10" y="20">Visualization Export</text>
    </svg>`;
  }

  private renderToPNG(data: any): Buffer {
    // Placeholder for PNG rendering
    // In a real implementation, this would use canvas to generate PNG
    return Buffer.from('PNG rendering not implemented in this environment');
  }
}

