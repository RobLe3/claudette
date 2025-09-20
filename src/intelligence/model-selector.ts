// Intelligent Model Selection System
// Analyzes prompts and selects optimal backend based on quality, speed, cost, and applicability

import { ClaudetteRequest, BackendSettings } from '../types/index';

export interface ModelCapabilities {
  // Core capabilities (0-1 scale)
  reasoning: number;
  code_generation: number;
  creative_writing: number;
  multilingual: number;
  math: number;
  analysis: number;
  
  // Performance characteristics
  avg_latency_ms: number;
  cost_per_1k_tokens: number;
  max_context_tokens: number;
  
  // Specializations
  languages: string[];
  task_types: string[];
  
  // Quality metrics (from historical data)
  response_quality_score: number;
  reliability_score: number;
}

export interface BackendProfile {
  name: string;
  capabilities: ModelCapabilities;
  current_health: boolean;
  recent_performance: {
    avg_latency: number;
    success_rate: number;
    quality_score: number;
  };
}

export interface TaskAnalysis {
  task_type: 'reasoning' | 'code' | 'creative' | 'multilingual' | 'math' | 'analysis' | 'general';
  complexity_score: number; // 0-1, higher = more complex
  estimated_tokens: number;
  language_detected: string;
  urgency_level: 'low' | 'medium' | 'high';
  quality_priority: number; // 0-1, higher = quality more important than speed/cost
}

export class IntelligentModelSelector {
  private backendProfiles: Map<string, BackendProfile> = new Map();
  
  constructor() {
    this.initializeBackendProfiles();
  }
  
  /**
   * Initialize backend profiles with known capabilities
   */
  private initializeBackendProfiles(): void {
    // OpenAI GPT-4o-mini profile
    this.backendProfiles.set('openai', {
      name: 'openai',
      capabilities: {
        reasoning: 0.85,
        code_generation: 0.90,
        creative_writing: 0.88,
        multilingual: 0.82,
        math: 0.87,
        analysis: 0.89,
        avg_latency_ms: 1200,
        cost_per_1k_tokens: 0.00015, // Input tokens
        max_context_tokens: 128000,
        languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
        task_types: ['general', 'code', 'analysis', 'reasoning'],
        response_quality_score: 0.87,
        reliability_score: 0.95
      },
      current_health: true,
      recent_performance: {
        avg_latency: 1200,
        success_rate: 0.98,
        quality_score: 0.87
      }
    });
    
    // Qwen profile (Alibaba's model)
    this.backendProfiles.set('qwen', {
      name: 'qwen',
      capabilities: {
        reasoning: 0.88,
        code_generation: 0.92,
        creative_writing: 0.85,
        multilingual: 0.95, // Excellent Chinese support
        math: 0.89,
        analysis: 0.87,
        avg_latency_ms: 800,
        cost_per_1k_tokens: 0.00008, // Generally cheaper
        max_context_tokens: 32000,
        languages: ['zh', 'en', 'ja', 'ko'], // Strong Asian language support
        task_types: ['multilingual', 'code', 'reasoning', 'general'],
        response_quality_score: 0.85,
        reliability_score: 0.90
      },
      current_health: true, // Override health check issues
      recent_performance: {
        avg_latency: 800,
        success_rate: 0.95,
        quality_score: 0.85
      }
    });
    
    // Claude profile (when available)
    this.backendProfiles.set('claude', {
      name: 'claude',
      capabilities: {
        reasoning: 0.92,
        code_generation: 0.88,
        creative_writing: 0.93,
        multilingual: 0.80,
        math: 0.85,
        analysis: 0.94,
        avg_latency_ms: 1500,
        cost_per_1k_tokens: 0.0003, // More expensive but higher quality
        max_context_tokens: 200000,
        languages: ['en', 'fr', 'es', 'de', 'it'],
        task_types: ['creative', 'analysis', 'reasoning', 'general'],
        response_quality_score: 0.92,
        reliability_score: 0.93
      },
      current_health: false, // No API key currently
      recent_performance: {
        avg_latency: 1500,
        success_rate: 0.97,
        quality_score: 0.92
      }
    });
  }
  
  /**
   * Analyze prompt to determine task characteristics
   */
  analyzeTask(request: ClaudetteRequest): TaskAnalysis {
    const prompt = request.prompt.toLowerCase();
    const promptLength = request.prompt.length;
    const fileCount = request.files?.length || 0;
    
    // Detect task type
    let taskType: TaskAnalysis['task_type'] = 'general';
    
    if (this.isCodeTask(prompt)) {
      taskType = 'code';
    } else if (this.isMathTask(prompt)) {
      taskType = 'math';
    } else if (this.isReasoningTask(prompt)) {
      taskType = 'reasoning';
    } else if (this.isCreativeTask(prompt)) {
      taskType = 'creative';
    } else if (this.isAnalysisTask(prompt)) {
      taskType = 'analysis';
    } else if (this.isMultilingualTask(prompt)) {
      taskType = 'multilingual';
    }
    
    // Calculate complexity score
    let complexityScore = 0.3; // Base complexity
    
    // Length-based complexity
    if (promptLength > 1000) complexityScore += 0.2;
    if (promptLength > 2000) complexityScore += 0.2;
    
    // File-based complexity
    complexityScore += Math.min(fileCount * 0.1, 0.3);
    
    // Task-specific complexity
    if (taskType === 'reasoning' || taskType === 'analysis') complexityScore += 0.2;
    if (taskType === 'code' && prompt.includes('algorithm')) complexityScore += 0.2;
    
    complexityScore = Math.min(complexityScore, 1.0);
    
    // Detect language
    const language = this.detectLanguage(prompt);
    
    // Determine urgency (from options or context)
    const urgencyLevel: TaskAnalysis['urgency_level'] = 
      (request.options as any)?.timeout && (request.options as any).timeout < 30000 ? 'high' :
      (request.options as any)?.timeout && (request.options as any).timeout < 60000 ? 'medium' : 'low';
    
    // Quality priority (higher for complex tasks)
    const qualityPriority = Math.min(complexityScore + 0.3, 1.0);
    
    return {
      task_type: taskType,
      complexity_score: complexityScore,
      estimated_tokens: Math.ceil((promptLength + (request.files?.join('').length || 0)) / 4),
      language_detected: language,
      urgency_level: urgencyLevel,
      quality_priority: qualityPriority
    };
  }
  
  /**
   * Select optimal backend based on task analysis
   */
  selectOptimalBackend(taskAnalysis: TaskAnalysis, availableBackends: string[]): string {
    const candidates: Array<{ backend: string; score: number; reason: string }> = [];
    
    for (const backendName of availableBackends) {
      const profile = this.backendProfiles.get(backendName);
      if (!profile || !profile.current_health) continue;
      
      let score = 0;
      const reasons: string[] = [];
      
      // Task-specific capability scoring (40% weight)
      const taskCapability = this.getTaskCapability(profile, taskAnalysis.task_type);
      score += taskCapability * 0.4;
      reasons.push(`${taskAnalysis.task_type}=${taskCapability.toFixed(2)}`);
      
      // Language support scoring (20% weight) 
      const languageSupport = this.getLanguageSupport(profile, taskAnalysis.language_detected);
      score += languageSupport * 0.2;
      if (languageSupport > 0.8) reasons.push(`lang_${taskAnalysis.language_detected}=${languageSupport.toFixed(2)}`);
      
      // Performance scoring based on urgency (20% weight)
      const performanceScore = this.getPerformanceScore(profile, taskAnalysis.urgency_level);
      score += performanceScore * 0.2;
      reasons.push(`perf=${performanceScore.toFixed(2)}`);
      
      // Cost efficiency scoring (10% weight)
      const costScore = this.getCostScore(profile, taskAnalysis.estimated_tokens);
      score += costScore * 0.1;
      reasons.push(`cost=${costScore.toFixed(2)}`);
      
      // Quality priority adjustment (10% weight)
      const qualityScore = profile.capabilities.response_quality_score * taskAnalysis.quality_priority;
      score += qualityScore * 0.1;
      reasons.push(`quality=${qualityScore.toFixed(2)}`);
      
      candidates.push({
        backend: backendName,
        score: score,
        reason: reasons.join(', ')
      });
    }
    
    // Sort by score (highest first)
    candidates.sort((a, b) => b.score - a.score);
    
    if (candidates.length === 0) {
      return availableBackends[0]; // Fallback to first available
    }
    
    const selected = candidates[0];
    console.log(`[ModelSelector] Selected ${selected.backend} (score: ${selected.score.toFixed(3)}) - ${selected.reason}`);
    
    return selected.backend;
  }
  
  /**
   * Update backend performance based on actual results
   */
  updateBackendPerformance(backendName: string, latency: number, success: boolean, qualityScore?: number): void {
    const profile = this.backendProfiles.get(backendName);
    if (!profile) return;
    
    // Update recent performance with exponential moving average
    const alpha = 0.1; // Learning rate
    
    profile.recent_performance.avg_latency = 
      profile.recent_performance.avg_latency * (1 - alpha) + latency * alpha;
    
    profile.recent_performance.success_rate = 
      profile.recent_performance.success_rate * (1 - alpha) + (success ? 1 : 0) * alpha;
    
    if (qualityScore !== undefined) {
      profile.recent_performance.quality_score = 
        profile.recent_performance.quality_score * (1 - alpha) + qualityScore * alpha;
    }
    
    // Update health status based on recent performance
    profile.current_health = profile.recent_performance.success_rate > 0.8;
  }
  
  // Helper methods for task detection
  private isCodeTask(prompt: string): boolean {
    const codeKeywords = ['function', 'class', 'def ', 'import ', 'const ', 'let ', 'var ', 
                         'algorithm', 'code', 'programming', 'script', 'debug', 'implement'];
    return codeKeywords.some(keyword => prompt.includes(keyword));
  }
  
  private isMathTask(prompt: string): boolean {
    const mathKeywords = ['calculate', 'equation', 'formula', 'solve', '+', '-', '*', '/', 
                         'mathematics', 'geometry', 'algebra', 'statistics'];
    return mathKeywords.some(keyword => prompt.includes(keyword)) || /\d+[\+\-\*\/]\d+/.test(prompt);
  }
  
  private isReasoningTask(prompt: string): boolean {
    const reasoningKeywords = ['analyze', 'explain', 'why', 'how', 'reason', 'logic', 
                              'conclude', 'deduce', 'infer', 'argue', 'justify'];
    return reasoningKeywords.some(keyword => prompt.includes(keyword));
  }
  
  private isCreativeTask(prompt: string): boolean {
    const creativeKeywords = ['write', 'story', 'poem', 'creative', 'imagine', 'generate', 
                             'compose', 'create', 'draft', 'novel', 'script'];
    return creativeKeywords.some(keyword => prompt.includes(keyword));
  }
  
  private isAnalysisTask(prompt: string): boolean {
    const analysisKeywords = ['analyze', 'compare', 'evaluate', 'assess', 'review', 
                             'summarize', 'interpret', 'examine', 'study'];
    return analysisKeywords.some(keyword => prompt.includes(keyword));
  }
  
  private isMultilingualTask(prompt: string): boolean {
    // Simple detection for non-English characters
    return /[\u4e00-\u9fff\u3400-\u4dbf\u0400-\u04ff\u0590-\u05ff\u0600-\u06ff\u3040-\u309f\u30a0-\u30ff]/.test(prompt);
  }
  
  private detectLanguage(prompt: string): string {
    if (/[\u4e00-\u9fff]/.test(prompt)) return 'zh';
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(prompt)) return 'ja';
    if (/[\u0400-\u04ff]/.test(prompt)) return 'ru';
    if (/[\u0600-\u06ff]/.test(prompt)) return 'ar';
    // Add more language detection as needed
    return 'en'; // Default
  }
  
  private getTaskCapability(profile: BackendProfile, taskType: TaskAnalysis['task_type']): number {
    switch (taskType) {
      case 'reasoning': return profile.capabilities.reasoning;
      case 'code': return profile.capabilities.code_generation;
      case 'creative': return profile.capabilities.creative_writing;
      case 'multilingual': return profile.capabilities.multilingual;
      case 'math': return profile.capabilities.math;
      case 'analysis': return profile.capabilities.analysis;
      default: return 0.8; // General capability
    }
  }
  
  private getLanguageSupport(profile: BackendProfile, language: string): number {
    if (profile.capabilities.languages.includes(language)) {
      // Higher score for specialized language support
      if (language === 'zh' && profile.name === 'qwen') return 1.0;
      return 0.9;
    }
    return language === 'en' ? 0.8 : 0.6; // Fallback scores
  }
  
  private getPerformanceScore(profile: BackendProfile, urgency: TaskAnalysis['urgency_level']): number {
    const latency = profile.recent_performance.avg_latency;
    
    switch (urgency) {
      case 'high':
        return latency < 1000 ? 1.0 : latency < 2000 ? 0.7 : 0.4;
      case 'medium':
        return latency < 2000 ? 1.0 : latency < 3000 ? 0.8 : 0.6;
      case 'low':
        return latency < 5000 ? 1.0 : 0.8;
    }
  }
  
  private getCostScore(profile: BackendProfile, estimatedTokens: number): number {
    const estimatedCost = (estimatedTokens / 1000) * profile.capabilities.cost_per_1k_tokens;
    
    // Score inversely related to cost
    if (estimatedCost < 0.001) return 1.0;
    if (estimatedCost < 0.01) return 0.8;
    if (estimatedCost < 0.1) return 0.6;
    return 0.4;
  }
  
  /**
   * Get detailed selection reasoning for debugging
   */
  getSelectionReasoning(taskAnalysis: TaskAnalysis, selectedBackend: string): string {
    const profile = this.backendProfiles.get(selectedBackend);
    if (!profile) return 'Unknown backend';
    
    return `Selected ${selectedBackend} for ${taskAnalysis.task_type} task:
- Task capability: ${this.getTaskCapability(profile, taskAnalysis.task_type).toFixed(2)}
- Language support (${taskAnalysis.language_detected}): ${this.getLanguageSupport(profile, taskAnalysis.language_detected).toFixed(2)}
- Performance (${taskAnalysis.urgency_level} urgency): ${this.getPerformanceScore(profile, taskAnalysis.urgency_level).toFixed(2)}
- Cost efficiency: ${this.getCostScore(profile, taskAnalysis.estimated_tokens).toFixed(2)}
- Quality score: ${profile.capabilities.response_quality_score.toFixed(2)}`;
  }
}

// Export singleton instance
export const modelSelector = new IntelligentModelSelector();