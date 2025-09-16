// Progress tracking system for setup wizard

import { SetupProgress, SetupMetrics } from './types';

export class ProgressTracker {
  private startTime: number = 0;
  private stepStartTimes: Map<string, number> = new Map();
  private stepCompletionTimes: Map<string, number> = new Map();
  private metrics: Partial<SetupMetrics> = {};

  /**
   * Start tracking progress
   */
  start(): void {
    this.startTime = Date.now();
    this.metrics = {
      stepTimes: {},
      userInteractionTime: 0,
      automatedTime: 0,
      errorsEncountered: 0,
      warningsEncountered: 0,
      stepsCompleted: 0,
      stepsSkipped: 0
    };
  }

  /**
   * Start tracking a specific step
   */
  startStep(stepId: string): void {
    this.stepStartTimes.set(stepId, Date.now());
  }

  /**
   * Complete tracking for a step
   */
  completeStep(stepId: string, success: boolean, skipped: boolean = false): void {
    const startTime = this.stepStartTimes.get(stepId);
    if (startTime) {
      const completionTime = Date.now();
      const duration = completionTime - startTime;
      
      this.stepCompletionTimes.set(stepId, completionTime);
      this.metrics.stepTimes![stepId] = duration;
      
      if (skipped) {
        this.metrics.stepsSkipped!++;
      } else if (success) {
        this.metrics.stepsCompleted!++;
      }
    }
  }

  /**
   * Record an error encountered
   */
  recordError(): void {
    this.metrics.errorsEncountered = (this.metrics.errorsEncountered || 0) + 1;
  }

  /**
   * Record a warning encountered
   */
  recordWarning(): void {
    this.metrics.warningsEncountered = (this.metrics.warningsEncountered || 0) + 1;
  }

  /**
   * Calculate current progress
   */
  calculateProgress(currentStep: number, totalSteps: number, estimatedTotal: number): SetupProgress {
    const now = Date.now();
    const elapsed = this.startTime ? (now - this.startTime) / 1000 : 0;
    const percentage = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;
    
    // Estimate remaining time based on progress
    let remaining = estimatedTotal - elapsed;
    if (percentage > 0) {
      const estimatedTotal = elapsed / (percentage / 100);
      remaining = Math.max(0, estimatedTotal - elapsed);
    }

    return {
      currentStep,
      totalSteps,
      stepId: '',
      stepName: '',
      elapsed,
      estimated: estimatedTotal,
      remaining,
      percentage: Math.round(percentage),
      phase: 'running'
    };
  }

  /**
   * Get real-time velocity (steps per second)
   */
  getVelocity(): number {
    const elapsed = this.startTime ? (Date.now() - this.startTime) / 1000 : 1;
    const completed = this.metrics.stepsCompleted || 0;
    return completed / elapsed;
  }

  /**
   * Predict completion time based on current velocity
   */
  predictCompletion(remainingSteps: number): number {
    const velocity = this.getVelocity();
    if (velocity <= 0) {
      return 300; // Default 5 minutes if no velocity data
    }
    return remainingSteps / velocity;
  }

  /**
   * Get performance metrics
   */
  getMetrics(): SetupMetrics {
    const now = Date.now();
    const totalTime = this.startTime ? (now - this.startTime) / 1000 : 0;
    
    // Calculate success rate
    const total = (this.metrics.stepsCompleted || 0) + (this.metrics.errorsEncountered || 0);
    const successRate = total > 0 ? (this.metrics.stepsCompleted || 0) / total : 1;

    // Calculate automated vs user interaction time
    const totalStepTime = Object.values(this.metrics.stepTimes || {})
      .reduce((sum, time) => sum + time, 0) / 1000;
    const userInteractionTime = Math.max(0, totalTime - totalStepTime);

    return {
      totalTime,
      stepTimes: this.metrics.stepTimes || {},
      userInteractionTime,
      automatedTime: totalStepTime,
      errorsEncountered: this.metrics.errorsEncountered || 0,
      warningsEncountered: this.metrics.warningsEncountered || 0,
      stepsCompleted: this.metrics.stepsCompleted || 0,
      stepsSkipped: this.metrics.stepsSkipped || 0,
      successRate: Math.round(successRate * 100) / 100
    };
  }

  /**
   * Get step-by-step timing analysis
   */
  getTimingAnalysis(): {
    slowestSteps: Array<{ stepId: string; time: number }>;
    fastestSteps: Array<{ stepId: string; time: number }>;
    averageStepTime: number;
    bottlenecks: string[];
  } {
    const stepTimes = this.metrics.stepTimes || {};
    const entries = Object.entries(stepTimes).map(([stepId, time]) => ({ stepId, time }));
    
    entries.sort((a, b) => b.time - a.time);
    
    const averageStepTime = entries.length > 0 
      ? entries.reduce((sum, entry) => sum + entry.time, 0) / entries.length 
      : 0;

    // Identify bottlenecks (steps taking significantly longer than average)
    const bottlenecks = entries
      .filter(entry => entry.time > averageStepTime * 2)
      .map(entry => entry.stepId);

    return {
      slowestSteps: entries.slice(0, 3),
      fastestSteps: entries.slice(-3).reverse(),
      averageStepTime,
      bottlenecks
    };
  }

  /**
   * Export progress data for analytics
   */
  exportData(): any {
    return {
      startTime: this.startTime,
      stepTimes: Object.fromEntries(this.stepStartTimes),
      completionTimes: Object.fromEntries(this.stepCompletionTimes),
      metrics: this.getMetrics(),
      timing: this.getTimingAnalysis()
    };
  }

  /**
   * Check if setup is on track for target time
   */
  isOnTrack(targetTime: number): {
    onTrack: boolean;
    deviation: number;
    recommendation: string;
  } {
    const metrics = this.getMetrics();
    const deviation = metrics.totalTime - targetTime;
    const deviationPercent = (deviation / targetTime) * 100;

    let recommendation = '';
    let onTrack = Math.abs(deviationPercent) <= 20; // Within 20% of target

    if (deviationPercent > 20) {
      recommendation = 'Consider enabling quick setup mode to reduce time';
    } else if (deviationPercent > 50) {
      recommendation = 'Setup is running significantly over time. Consider skipping optional steps';
    } else if (deviationPercent < -20) {
      recommendation = 'Setup is ahead of schedule. Good progress!';
    } else {
      recommendation = 'Setup is progressing well within expected time';
    }

    return {
      onTrack,
      deviation: Math.round(deviation),
      recommendation
    };
  }

  /**
   * Get real-time status for display
   */
  getStatusDisplay(): {
    elapsed: string;
    estimated: string;
    velocity: string;
    efficiency: string;
  } {
    const metrics = this.getMetrics();
    const velocity = this.getVelocity();

    return {
      elapsed: this.formatTime(metrics.totalTime),
      estimated: this.formatTime(metrics.totalTime + 60), // Rough estimate
      velocity: `${velocity.toFixed(1)} steps/sec`,
      efficiency: `${(metrics.successRate * 100).toFixed(0)}% success rate`
    };
  }

  /**
   * Format time in seconds to human readable format
   */
  private formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    
    if (minutes < 60) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
  }

  /**
   * Reset all tracking data
   */
  reset(): void {
    this.startTime = 0;
    this.stepStartTimes.clear();
    this.stepCompletionTimes.clear();
    this.metrics = {};
  }
}