/**
 * Adaptive Backend Manager
 * Manages live backends with custom timers and adaptive behavior
 */

const { DynamicTimeoutManager } = require('../monitoring/dynamic-timeout-manager.js');

class AdaptiveBackendManager {
  constructor() {
    this.backends = new Map();
    this.timeoutManager = new DynamicTimeoutManager();
    this.performanceHistory = new Map();
    this.adaptiveBehaviors = new Map();
    
    // Adaptive behavior configurations
    this.behaviorProfiles = {
      'openai': {
        adaptations: ['timeout_optimization', 'cost_awareness', 'quality_scaling'],
        fallback_strategy: 'graceful_degradation',
        learning_rate: 0.1,
        specialization_bonus: { 'reasoning': 1.2, 'analysis': 1.1 }
      },
      'qwen': {
        adaptations: ['aggressive_timeout', 'cost_optimization', 'specialization_routing'],
        fallback_strategy: 'fast_retry',
        learning_rate: 0.15,
        specialization_bonus: { 'coding': 1.3, 'technical': 1.2 }
      },
      'claude': {
        adaptations: ['context_optimization', 'quality_prioritization'],
        fallback_strategy: 'maintain_quality',
        learning_rate: 0.08,
        specialization_bonus: { 'reasoning': 1.4, 'analysis': 1.3 }
      }
    };
  }

  /**
   * Register a backend with adaptive capabilities
   */
  registerBackend(name, config) {
    console.log(`[ADAPTIVE] Registering backend: ${name}`);
    
    const adaptiveConfig = {
      ...config,
      name,
      registered_at: Date.now(),
      adaptive_state: {
        current_timeout: config.timeout,
        quality_score: config.quality_tier === 'excellent' ? 9 : 
                      config.quality_tier === 'good' ? 7 :
                      config.quality_tier === 'fair' ? 5 : 3,
        cost_efficiency: 1.0,
        reliability_score: 0.8, // Start with reasonable assumption
        specialization_weights: this.initializeSpecializationWeights(config.specialization || [])
      },
      behavior_profile: this.behaviorProfiles[name] || this.behaviorProfiles['claude']
    };
    
    this.backends.set(name, adaptiveConfig);
    this.performanceHistory.set(name, []);
    
    console.log(`[ADAPTIVE] ${name} registered with timeout: ${adaptiveConfig.adaptive_state.current_timeout}ms`);
    console.log(`[ADAPTIVE] ${name} specializations: ${config.specialization?.join(', ') || 'general'}`);
    
    return adaptiveConfig;
  }

  /**
   * Initialize specialization weights based on backend capabilities
   */
  initializeSpecializationWeights(specializations) {
    const weights = {};
    specializations.forEach(spec => {
      weights[spec] = 1.0; // Start with neutral weight
    });
    return weights;
  }

  /**
   * Get optimal backend for a specific task with adaptive selection
   */
  async selectOptimalBackend(taskDescription, context = {}) {
    console.log(`[ADAPTIVE] Selecting optimal backend for task: "${taskDescription.substring(0, 50)}..."`);
    
    const availableBackends = Array.from(this.backends.values()).filter(b => b.enabled);
    
    if (availableBackends.length === 0) {
      throw new Error('No adaptive backends available');
    }
    
    // Analyze task requirements
    const taskProfile = this.analyzeTaskRequirements(taskDescription, context);
    
    // Score each backend based on adaptive factors
    const backendScores = availableBackends.map(backend => {
      const score = this.calculateAdaptiveScore(backend, taskProfile, context);
      return { backend, score };
    });
    
    // Sort by score (highest first)
    backendScores.sort((a, b) => b.score - a.score);
    
    const selectedBackend = backendScores[0].backend;
    console.log(`[ADAPTIVE] Selected: ${selectedBackend.name} (score: ${backendScores[0].score.toFixed(2)})`);
    
    // Log selection reasoning
    backendScores.forEach(({ backend, score }, index) => {
      const status = index === 0 ? '🎯' : '  ';
      console.log(`[ADAPTIVE] ${status} ${backend.name}: ${score.toFixed(2)} (timeout: ${backend.adaptive_state.current_timeout}ms)`);
    });
    
    return selectedBackend;
  }

  /**
   * Analyze task requirements for optimal backend selection
   */
  analyzeTaskRequirements(taskDescription, context) {
    const description = taskDescription.toLowerCase();
    
    const profile = {
      complexity: this.assessComplexity(description, context),
      domain: this.identifyDomain(description),
      urgency: context.urgency || 'medium',
      quality_requirement: context.quality_requirement || 'standard',
      cost_sensitivity: context.cost_sensitivity || 'medium'
    };
    
    console.log(`[ADAPTIVE] Task profile: ${JSON.stringify(profile)}`);
    return profile;
  }

  /**
   * Assess task complexity
   */
  assessComplexity(description, context) {
    let complexity = 0.5; // Base complexity
    
    // Length-based complexity
    if (description.length > 200) complexity += 0.2;
    if (description.length > 500) complexity += 0.2;
    
    // Keyword-based complexity indicators
    const complexKeywords = ['analyze', 'compare', 'design', 'implement', 'optimize', 'debug'];
    const foundComplexKeywords = complexKeywords.filter(kw => description.includes(kw)).length;
    complexity += foundComplexKeywords * 0.1;
    
    // Context-based complexity
    if (context.requestSize && context.requestSize > 1000) complexity += 0.2;
    if (context.expectedResponseLength && context.expectedResponseLength > 500) complexity += 0.1;
    
    return Math.min(1.0, complexity);
  }

  /**
   * Identify task domain for specialization matching
   */
  identifyDomain(description) {
    const domains = {
      'coding': ['code', 'function', 'programming', 'debug', 'implement', 'api'],
      'technical': ['system', 'architecture', 'performance', 'optimize', 'technical'],
      'reasoning': ['analyze', 'compare', 'explain', 'reason', 'logic'],
      'analysis': ['data', 'pattern', 'trend', 'evaluate', 'assess'],
      'general': []
    };
    
    for (const [domain, keywords] of Object.entries(domains)) {
      if (keywords.some(keyword => description.includes(keyword))) {
        return domain;
      }
    }
    
    return 'general';
  }

  /**
   * Calculate adaptive score for backend selection
   */
  calculateAdaptiveScore(backend, taskProfile, context) {
    let score = 0;
    
    // Base quality score (40% weight)
    score += backend.adaptive_state.quality_score * 0.4;
    
    // Specialization match (25% weight)
    const specializationMatch = this.getSpecializationMatch(backend, taskProfile.domain);
    score += specializationMatch * 2.5; // Scale to 0-2.5 range
    
    // Performance factors (20% weight)
    const timeoutEfficiency = Math.max(0, 1 - (backend.adaptive_state.current_timeout / 60000));
    const reliabilityBonus = backend.adaptive_state.reliability_score;
    score += (timeoutEfficiency + reliabilityBonus) * 1.0;
    
    // Cost efficiency (10% weight)
    const costMultiplier = taskProfile.cost_sensitivity === 'high' ? 2.0 : 1.0;
    score += backend.adaptive_state.cost_efficiency * costMultiplier * 1.0;
    
    // Urgency factor (5% weight)
    if (taskProfile.urgency === 'high' && backend.adaptive_state.current_timeout < 30000) {
      score += 0.5; // Bonus for fast backends when urgency is high
    }
    
    return Math.max(0, score);
  }

  /**
   * Get specialization match score
   */
  getSpecializationMatch(backend, taskDomain) {
    const specializations = backend.specialization || [];
    
    if (specializations.includes(taskDomain)) {
      const weight = backend.adaptive_state.specialization_weights[taskDomain] || 1.0;
      const bonus = backend.behavior_profile.specialization_bonus[taskDomain] || 1.0;
      return weight * bonus;
    }
    
    // General purpose bonus
    if (specializations.includes('general') || specializations.length === 0) {
      return 0.8; // Slight penalty for non-specialized backends
    }
    
    return 0.6; // Penalty for mismatched specialization
  }

  /**
   * Record performance and adapt backend behavior
   */
  async recordPerformanceAndAdapt(backendName, performance) {
    console.log(`[ADAPTIVE] Recording performance for ${backendName}:`, {
      latency: performance.latency,
      success: performance.success,
      quality: performance.quality_score || 'unknown'
    });
    
    const backend = this.backends.get(backendName);
    if (!backend) return;
    
    // Record in timeout manager for timeout adaptation
    this.timeoutManager.recordPerformance(backendName, {
      latency: performance.latency,
      success: performance.success,
      timeout: performance.timeout || false,
      requestSize: performance.requestSize || 0,
      responseSize: performance.responseSize || 0
    });
    
    // Record in performance history
    const history = this.performanceHistory.get(backendName);
    history.push({
      timestamp: Date.now(),
      ...performance
    });
    
    // Keep last 50 entries
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
    
    // Adapt backend behavior
    await this.adaptBackendBehavior(backendName, performance);
    
    // Update timeout from dynamic timeout manager
    const newTimeout = this.timeoutManager.getTimeoutForBackend(backendName, {
      complexityScore: performance.complexity || 0.5,
      requestSize: performance.requestSize || 0
    });
    
    backend.adaptive_state.current_timeout = newTimeout;
    console.log(`[ADAPTIVE] ${backendName} timeout updated to: ${newTimeout}ms`);
  }

  /**
   * Adapt backend behavior based on performance
   */
  async adaptBackendBehavior(backendName, performance) {
    const backend = this.backends.get(backendName);
    const history = this.performanceHistory.get(backendName);
    
    if (history.length < 3) return; // Need minimum history for adaptation
    
    const recentHistory = history.slice(-10); // Last 10 performances
    const profile = backend.behavior_profile;
    const learningRate = profile.learning_rate;
    
    // Adapt quality score
    if (performance.quality_score) {
      const currentQuality = backend.adaptive_state.quality_score;
      backend.adaptive_state.quality_score = 
        currentQuality + (learningRate * (performance.quality_score - currentQuality));
    }
    
    // Adapt reliability score
    const recentSuccessRate = recentHistory.filter(h => h.success).length / recentHistory.length;
    backend.adaptive_state.reliability_score = 
      backend.adaptive_state.reliability_score + (learningRate * (recentSuccessRate - backend.adaptive_state.reliability_score));
    
    // Adapt cost efficiency
    if (performance.cost_per_token) {
      const targetCost = backend.cost_per_token;
      const efficiency = Math.max(0.1, targetCost / performance.cost_per_token);
      backend.adaptive_state.cost_efficiency = 
        backend.adaptive_state.cost_efficiency + (learningRate * (efficiency - backend.adaptive_state.cost_efficiency));
    }
    
    // Adapt specialization weights based on task success
    if (performance.task_domain && performance.success && performance.quality_score) {
      const currentWeight = backend.adaptive_state.specialization_weights[performance.task_domain] || 1.0;
      const qualityBonus = (performance.quality_score - 5) / 5; // -1 to 1 range
      const newWeight = Math.max(0.5, Math.min(2.0, currentWeight + (learningRate * qualityBonus)));
      backend.adaptive_state.specialization_weights[performance.task_domain] = newWeight;
      
      console.log(`[ADAPTIVE] ${backendName} specialization weight for ${performance.task_domain}: ${currentWeight.toFixed(2)} → ${newWeight.toFixed(2)}`);
    }
    
    console.log(`[ADAPTIVE] ${backendName} adapted state:`, {
      quality_score: backend.adaptive_state.quality_score.toFixed(2),
      reliability_score: backend.adaptive_state.reliability_score.toFixed(2),
      cost_efficiency: backend.adaptive_state.cost_efficiency.toFixed(2)
    });
  }

  /**
   * Get adaptive backend status
   */
  getAdaptiveStatus() {
    const status = {};
    
    for (const [name, backend] of this.backends.entries()) {
      const history = this.performanceHistory.get(name);
      
      status[name] = {
        enabled: backend.enabled,
        adaptive_state: backend.adaptive_state,
        behavior_profile: backend.behavior_profile,
        performance_history_size: history.length,
        specializations: backend.specialization || [],
        last_adapted: backend.adaptive_state.last_adapted || 'never'
      };
    }
    
    return status;
  }

  /**
   * Reset adaptation for a backend (useful for testing)
   */
  resetAdaptation(backendName) {
    const backend = this.backends.get(backendName);
    if (backend) {
      backend.adaptive_state.current_timeout = backend.timeout;
      backend.adaptive_state.quality_score = backend.quality_tier === 'excellent' ? 9 : 
                                            backend.quality_tier === 'good' ? 7 :
                                            backend.quality_tier === 'fair' ? 5 : 3;
      backend.adaptive_state.cost_efficiency = 1.0;
      backend.adaptive_state.reliability_score = 0.8;
      
      this.performanceHistory.set(backendName, []);
      this.timeoutManager.resetCalibration(backendName);
      
      console.log(`[ADAPTIVE] Reset adaptation for ${backendName}`);
    }
  }
}

module.exports = { AdaptiveBackendManager };