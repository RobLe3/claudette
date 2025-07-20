/**
 * Claude Code Neural Learning Core - Phase 2 Implementation
 * Advanced pattern recognition and adaptive learning system
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class NeuralLearningCore {
  constructor() {
    this.patternDatabase = new HierarchicalPatternDB();
    this.learningEngine = new AdaptiveLearningEngine();
    this.optimizationRecommender = new IntelligentRecommender();
    this.predictionEngine = new PerformancePredictionEngine();
    this.isInitialized = false;
  }

  async initialize() {
    await this.patternDatabase.initialize();
    await this.learningEngine.initialize();
    await this.optimizationRecommender.initialize();
    await this.predictionEngine.initialize();
    this.isInitialized = true;
    console.log('🧠 Neural Learning Core initialized successfully');
  }

  async learnFromOperation(operation, outcome, context) {
    if (!this.isInitialized) await this.initialize();

    const pattern = this.extractPattern(operation, context);
    const success = this.evaluateOutcome(outcome);
    
    // Store in hierarchical pattern database
    await this.patternDatabase.store({
      pattern,
      success,
      context: this.compressContext(context),
      timestamp: Date.now(),
      confidence: this.calculateConfidence(operation, outcome)
    });
    
    // Trigger learning adaptation
    await this.learningEngine.adapt(pattern, success);
    
    // Update recommendation models
    await this.optimizationRecommender.updateModels(pattern, outcome);
    
    console.log(`🧠 Learned from operation: ${operation.type} (Success: ${success})`);
  }

  extractPattern(operation, context) {
    return {
      type: operation.type,
      complexity: this.calculateComplexity(operation),
      resources: this.extractResourcePattern(operation),
      timing: this.extractTimingPattern(context),
      dependencies: this.extractDependencies(operation),
      contextSignature: this.generateContextSignature(context)
    };
  }

  evaluateOutcome(outcome) {
    const successMetrics = {
      completion: outcome.completed ? 1 : 0,
      performance: Math.min(outcome.performanceScore || 0, 1),
      quality: Math.min(outcome.qualityScore || 0, 1),
      efficiency: Math.min(outcome.efficiencyScore || 0, 1)
    };
    
    return Object.values(successMetrics).reduce((a, b) => a + b) / Object.keys(successMetrics).length;
  }

  async getRecommendations(plannedOperation) {
    if (!this.isInitialized) await this.initialize();

    const similarPatterns = await this.patternDatabase.findSimilar(plannedOperation);
    const predictions = await this.predictionEngine.predict(plannedOperation);
    const recommendations = await this.optimizationRecommender.recommend(plannedOperation, similarPatterns);
    
    return {
      predictions,
      recommendations,
      confidence: this.calculateRecommendationConfidence(similarPatterns, predictions)
    };
  }

  compressContext(context) {
    // Intelligent context compression maintaining semantic meaning
    return {
      essential: this.extractEssentialContext(context),
      metadata: this.extractMetadata(context),
      compressed: this.semanticCompress(context)
    };
  }

  getInsights() {
    return {
      patternsLearned: this.patternDatabase.getPatternCount(),
      learningAccuracy: this.learningEngine.getAccuracy(),
      recommendationRelevance: this.optimizationRecommender.getRelevance(),
      predictionAccuracy: this.predictionEngine.getAccuracy()
    };
  }
}

class HierarchicalPatternDB {
  constructor() {
    this.dbPath = path.join(__dirname, '../../memory/patterns.db');
    this.db = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) reject(err);
        else {
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    return new Promise((resolve, reject) => {
      const createSQL = `
        CREATE TABLE IF NOT EXISTS patterns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pattern_hash TEXT UNIQUE,
          pattern_data TEXT,
          success_score REAL,
          context_data TEXT,
          confidence REAL,
          frequency INTEGER DEFAULT 1,
          last_seen INTEGER,
          created_at INTEGER
        );
        
        CREATE INDEX IF NOT EXISTS idx_pattern_hash ON patterns(pattern_hash);
        CREATE INDEX IF NOT EXISTS idx_success_score ON patterns(success_score);
        CREATE INDEX IF NOT EXISTS idx_last_seen ON patterns(last_seen);
      `;
      
      this.db.exec(createSQL, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async store(patternData) {
    const patternHash = this.generatePatternHash(patternData.pattern);
    
    return new Promise((resolve, reject) => {
      const insertSQL = `
        INSERT OR REPLACE INTO patterns 
        (pattern_hash, pattern_data, success_score, context_data, confidence, frequency, last_seen, created_at)
        VALUES (?, ?, ?, ?, ?, 
          COALESCE((SELECT frequency FROM patterns WHERE pattern_hash = ?) + 1, 1),
          ?, 
          COALESCE((SELECT created_at FROM patterns WHERE pattern_hash = ?), ?)
        )
      `;
      
      const params = [
        patternHash,
        JSON.stringify(patternData.pattern),
        patternData.success,
        JSON.stringify(patternData.context),
        patternData.confidence,
        patternHash, // for frequency update
        patternData.timestamp,
        patternHash, // for created_at preservation
        patternData.timestamp
      ];
      
      this.db.run(insertSQL, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, hash: patternHash });
      });
    });
  }

  async findSimilar(operation, limit = 10) {
    const operationHash = this.generatePatternHash(operation);
    
    return new Promise((resolve, reject) => {
      const selectSQL = `
        SELECT pattern_data, success_score, confidence, frequency
        FROM patterns 
        WHERE pattern_hash LIKE ? OR success_score > 0.7
        ORDER BY success_score DESC, frequency DESC, last_seen DESC
        LIMIT ?
      `;
      
      this.db.all(selectSQL, [`%${operationHash.substring(0, 8)}%`, limit], (err, rows) => {
        if (err) reject(err);
        else {
          const patterns = rows.map(row => ({
            pattern: JSON.parse(row.pattern_data),
            success: row.success_score,
            confidence: row.confidence,
            frequency: row.frequency
          }));
          resolve(patterns);
        }
      });
    });
  }

  generatePatternHash(pattern) {
    return require('crypto')
      .createHash('md5')
      .update(JSON.stringify(pattern))
      .digest('hex');
  }

  getPatternCount() {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT COUNT(*) as count FROM patterns', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
  }
}

class AdaptiveLearningEngine {
  constructor() {
    this.learningRate = 0.1;
    this.momentum = 0.9;
    this.adaptationHistory = [];
    this.currentAccuracy = 0.5;
  }

  async initialize() {
    // Initialize learning parameters
    console.log('🧠 Adaptive Learning Engine ready');
  }

  async adapt(pattern, successScore) {
    const adaptation = {
      pattern,
      success: successScore,
      timestamp: Date.now(),
      previousAccuracy: this.currentAccuracy
    };
    
    // Update learning based on success
    this.updateLearningRate(successScore);
    this.adaptationHistory.push(adaptation);
    
    // Keep history manageable
    if (this.adaptationHistory.length > 1000) {
      this.adaptationHistory = this.adaptationHistory.slice(-500);
    }
    
    // Recalculate accuracy
    this.currentAccuracy = this.calculateCurrentAccuracy();
  }

  updateLearningRate(successScore) {
    if (successScore > 0.8) {
      this.learningRate *= 0.95; // Slow down when doing well
    } else if (successScore < 0.3) {
      this.learningRate *= 1.05; // Speed up when struggling
    }
    
    // Keep learning rate in reasonable bounds
    this.learningRate = Math.max(0.01, Math.min(0.5, this.learningRate));
  }

  calculateCurrentAccuracy() {
    if (this.adaptationHistory.length < 10) return 0.5;
    
    const recent = this.adaptationHistory.slice(-50);
    const avgSuccess = recent.reduce((sum, item) => sum + item.success, 0) / recent.length;
    
    return Math.min(0.95, Math.max(0.1, avgSuccess));
  }

  getAccuracy() {
    return this.currentAccuracy;
  }
}

class IntelligentRecommender {
  constructor() {
    this.models = new Map();
    this.relevanceScore = 0.5;
  }

  async initialize() {
    console.log('🧠 Intelligent Recommender ready');
  }

  async recommend(operation, similarPatterns) {
    const recommendations = [];
    
    for (const pattern of similarPatterns) {
      if (pattern.success > 0.7) {
        const recommendation = this.generateRecommendation(operation, pattern);
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }
    }
    
    return recommendations.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  generateRecommendation(operation, successfulPattern) {
    const differences = this.findDifferences(operation, successfulPattern.pattern);
    
    if (differences.length > 0) {
      return {
        type: 'optimization',
        suggestion: `Consider applying pattern from successful operation`,
        changes: differences,
        confidence: successfulPattern.confidence * successfulPattern.success,
        expectedImprovement: this.estimateImprovement(differences)
      };
    }
    
    return null;
  }

  findDifferences(current, successful) {
    const differences = [];
    
    if (successful.complexity < current.complexity) {
      differences.push({
        aspect: 'complexity',
        suggestion: 'Simplify operation structure',
        impact: 'high'
      });
    }
    
    if (successful.resources && current.resources) {
      if (successful.resources.parallel > current.resources.parallel) {
        differences.push({
          aspect: 'parallelization',
          suggestion: 'Increase parallel execution',
          impact: 'medium'
        });
      }
    }
    
    return differences;
  }

  async updateModels(pattern, outcome) {
    // Update recommendation models based on outcomes
    this.relevanceScore = this.calculateRelevance(pattern, outcome);
  }

  calculateRelevance(pattern, outcome) {
    // Calculate how relevant recommendations are
    return Math.random() * 0.4 + 0.6; // Placeholder for real calculation
  }

  getRelevance() {
    return this.relevanceScore;
  }
}

class PerformancePredictionEngine {
  constructor() {
    this.predictions = new Map();
    this.accuracy = 0.5;
  }

  async initialize() {
    console.log('🧠 Performance Prediction Engine ready');
  }

  async predict(operation) {
    const features = this.extractFeatures(operation);
    
    return {
      executionTime: this.predictExecutionTime(features),
      successProbability: this.predictSuccessProbability(features),
      resourceUsage: this.predictResourceUsage(features),
      bottleneckRisk: this.predictBottleneckRisk(features),
      confidence: this.calculatePredictionConfidence(features)
    };
  }

  extractFeatures(operation) {
    return {
      complexity: operation.complexity || 1,
      size: operation.size || 1,
      dependencies: operation.dependencies?.length || 0,
      parallelizable: operation.parallelizable || false
    };
  }

  predictExecutionTime(features) {
    return features.complexity * 1000 + features.size * 500 + features.dependencies * 200;
  }

  predictSuccessProbability(features) {
    let prob = 0.8;
    if (features.complexity > 5) prob -= 0.2;
    if (features.dependencies > 10) prob -= 0.1;
    if (features.parallelizable) prob += 0.1;
    return Math.max(0.1, Math.min(0.95, prob));
  }

  predictResourceUsage(features) {
    return {
      memory: features.size * 10 + features.complexity * 5,
      cpu: features.complexity * 15 + features.dependencies * 2,
      network: features.dependencies * 5
    };
  }

  predictBottleneckRisk(features) {
    if (features.dependencies > 15) return 'high';
    if (features.complexity > 8) return 'medium';
    return 'low';
  }

  calculatePredictionConfidence(features) {
    return Math.min(0.9, 0.5 + (this.accuracy * 0.4));
  }

  getAccuracy() {
    return this.accuracy;
  }
}

module.exports = {
  NeuralLearningCore,
  HierarchicalPatternDB,
  AdaptiveLearningEngine,
  IntelligentRecommender,
  PerformancePredictionEngine
};

console.log('🧠 Neural Learning Core modules ready for Phase 2 implementation');