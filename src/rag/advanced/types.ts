// Advanced RAG Intelligence Engine Types
// Phase 2 Enhancement: Multi-modal, intelligent context ranking, adaptive retrieval

import { RAGRequest, RAGResponse, RAGResult } from '../types';

// Multi-modal content types
export type ContentType = 'text' | 'code' | 'image' | 'document' | 'audio' | 'video';

// Enhanced RAG request with multi-modal support
export interface AdvancedRAGRequest extends RAGRequest {
  contentTypes?: ContentType[];
  adaptiveChunking?: boolean;
  crossDocumentSynthesis?: boolean;
  intelligentRanking?: boolean;
  contextComplexity?: 'simple' | 'moderate' | 'complex' | 'adaptive';
  synthesisDepth?: number;
  modalityWeights?: Record<ContentType, number>;
  relationshipTraversal?: boolean;
  temporalRelevance?: boolean;
  semanticExpansion?: boolean;
}

// Enhanced RAG response with intelligence metrics
export interface AdvancedRAGResponse extends RAGResponse {
  intelligence: {
    relevanceDistribution: number[];
    crossDocumentConnections: number;
    synthesisQuality: number;
    adaptiveChunkingUsed: boolean;
    modalityBreakdown: Record<ContentType, number>;
    cognitiveComplexity: number;
    semanticCoverage: number;
  };
}

// Enhanced result with relationship context
export interface AdvancedRAGResult extends RAGResult {
  contentType: ContentType;
  relevanceFactors: {
    semantic: number;
    temporal: number;
    structural: number;
    contextual: number;
    cross_modal: number;
  };
  synthesisContext?: {
    relatedDocuments: string[];
    conceptualBridges: string[];
    inferredConnections: string[];
  };
  chunking?: {
    strategy: 'fixed' | 'semantic' | 'adaptive' | 'contextual';
    chunkId: string;
    chunkSize: number;
    overlap: number;
  };
}

// Intelligence ranking algorithms
export interface RankingAlgorithm {
  name: string;
  weight: number;
  parameters: Record<string, any>;
}

export interface IntelligentRankingConfig {
  algorithms: RankingAlgorithm[];
  thresholds: {
    relevance: number;
    diversity: number;
    freshness: number;
    authority: number;
  };
  adaptiveWeighting: boolean;
  learningEnabled: boolean;
}

// Context complexity analysis
export interface ContextComplexityMetrics {
  syntacticComplexity: number;
  semanticDensity: number;
  topicalBreadth: number;
  conceptualDepth: number;
  interrelationComplexity: number;
  modalityDiversity: number;
}

// Adaptive chunking strategy
export interface AdaptiveChunkingStrategy {
  strategy: 'fixed' | 'semantic' | 'contextual' | 'hierarchical' | 'dynamic';
  baseChunkSize: number;
  maxChunkSize: number;
  minChunkSize: number;
  overlapRatio: number;
  boundaryDetection: 'sentence' | 'paragraph' | 'section' | 'semantic' | 'adaptive';
  preserveStructure: boolean;
}

// Cross-document synthesis capabilities
export interface DocumentSynthesisConfig {
  maxDocuments: number;
  synthesisDepth: number;
  relationshipTypes: string[];
  inferenceStrength: number;
  conflictResolution: 'majority' | 'authority' | 'recency' | 'consensus' | 'weighted';
  citationTracking: boolean;
}

// Multi-modal embedding configuration
export interface MultiModalEmbeddingConfig {
  textEmbedding: {
    model: string;
    dimensions: number;
    normalization: boolean;
  };
  codeEmbedding: {
    model: string;
    syntaxAware: boolean;
    semanticParsing: boolean;
  };
  imageEmbedding?: {
    model: string;
    featureExtraction: boolean;
    ocrIntegration: boolean;
  };
  documentEmbedding?: {
    structureAware: boolean;
    metadataIntegration: boolean;
    hierarchicalEncoding: boolean;
  };
  fusionStrategy: 'concatenation' | 'attention' | 'weighted' | 'learned';
}

// Performance optimization hints
export interface PerformanceOptimizationHints {
  cacheStrategy: 'aggressive' | 'conservative' | 'adaptive';
  parallelization: boolean;
  batchProcessing: boolean;
  memoryOptimization: boolean;
  earlyTermination: boolean;
  progressiveLoading: boolean;
}

// Advanced RAG Intelligence Engine configuration
export interface AdvancedRAGConfig {
  intelligence: {
    ranking: IntelligentRankingConfig;
    chunking: AdaptiveChunkingStrategy;
    synthesis: DocumentSynthesisConfig;
    multiModal: MultiModalEmbeddingConfig;
  };
  performance: PerformanceOptimizationHints;
  learning: {
    enabled: boolean;
    feedbackIntegration: boolean;
    modelAdaptation: boolean;
    queryRefinement: boolean;
  };
  monitoring: {
    detailedMetrics: boolean;
    performanceTracking: boolean;
    qualityAssessment: boolean;
    anomalyDetection: boolean;
  };
}

// Query analysis and enhancement
export interface QueryAnalysis {
  complexity: ContextComplexityMetrics;
  intent: {
    type: 'factual' | 'procedural' | 'conceptual' | 'analytical' | 'creative';
    confidence: number;
    specificity: number;
  };
  scope: {
    temporal: 'current' | 'historical' | 'predictive' | 'timeless';
    breadth: 'narrow' | 'moderate' | 'broad' | 'comprehensive';
    depth: 'surface' | 'intermediate' | 'deep' | 'expert';
  };
  modalities: ContentType[];
  enhancement: {
    expandedQuery: string;
    semanticVariants: string[];
    contextualHints: string[];
    disambiguationTerms: string[];
  };
}

// Real-time adaptation state
export interface AdaptationState {
  queryPatterns: Map<string, number>;
  performanceHistory: Array<{
    query: string;
    responseTime: number;
    relevanceScore: number;
    userFeedback?: number;
    timestamp: number;
  }>;
  modelWeights: Record<string, number>;
  chunkingEffectiveness: Record<string, number>;
  crossDocumentUtility: Record<string, number>;
}

// Error types specific to advanced features
export class AdvancedRAGError extends Error {
  code: 'COMPLEXITY_OVERFLOW' | 'SYNTHESIS_FAILED' | 'MULTIMODAL_ERROR' | 'ADAPTATION_ERROR';
  feature: string;
  context: Record<string, any>;
  retryable: boolean;

  constructor(
    message: string, 
    code: AdvancedRAGError['code'], 
    feature: string, 
    context: Record<string, any> = {},
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'AdvancedRAGError';
    this.code = code;
    this.feature = feature;
    this.context = context;
    this.retryable = retryable;
  }
}