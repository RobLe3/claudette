/**
 * Plugin Validation Utilities
 * 
 * Comprehensive validation system for Claudette plugins.
 */

import { PluginMetadata, PluginCategory, ValidationResult, ValidationError } from './types';

export class PluginValidator {
  /**
   * Validate plugin metadata
   */
  static validateMetadata(metadata: PluginMetadata): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Required fields
    if (!metadata.name || metadata.name.trim() === '') {
      errors.push({
        code: 'INVALID_NAME',
        message: 'Plugin name is required and cannot be empty',
        field: 'name',
        severity: 'error'
      });
    } else if (!/^[a-z0-9-]+$/.test(metadata.name)) {
      errors.push({
        code: 'INVALID_NAME_FORMAT',
        message: 'Plugin name must contain only lowercase letters, numbers, and hyphens',
        field: 'name',
        severity: 'error'
      });
    }

    if (!metadata.version || !/^\d+\.\d+\.\d+/.test(metadata.version)) {
      errors.push({
        code: 'INVALID_VERSION',
        message: 'Plugin version must follow semantic versioning (e.g., 1.0.0)',
        field: 'version',
        severity: 'error'
      });
    }

    if (!metadata.description || metadata.description.trim() === '') {
      warnings.push({
        code: 'MISSING_DESCRIPTION',
        message: 'Plugin description is recommended for better discoverability',
        field: 'description',
        severity: 'warning'
      });
    }

    if (!Object.values(PluginCategory).includes(metadata.category)) {
      errors.push({
        code: 'INVALID_CATEGORY',
        message: `Plugin category must be one of: ${Object.values(PluginCategory).join(', ')}`,
        field: 'category',
        severity: 'error'
      });
    }

    // Optional field validations
    if (metadata.homepage && !this.isValidUrl(metadata.homepage)) {
      warnings.push({
        code: 'INVALID_HOMEPAGE_URL',
        message: 'Homepage URL appears to be invalid',
        field: 'homepage',
        severity: 'warning'
      });
    }

    if (metadata.repository && !this.isValidUrl(metadata.repository)) {
      warnings.push({
        code: 'INVALID_REPOSITORY_URL',
        message: 'Repository URL appears to be invalid',
        field: 'repository',
        severity: 'warning'
      });
    }

    if (metadata.claudetteVersion && !this.isValidVersionRange(metadata.claudetteVersion)) {
      warnings.push({
        code: 'INVALID_CLAUDETTE_VERSION',
        message: 'Claudette version range appears to be invalid',
        field: 'claudetteVersion',
        severity: 'warning'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate plugin implementation
   */
  static validateImplementation(pluginClass: any, category: PluginCategory): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Check if it's a constructor function
    if (typeof pluginClass !== 'function') {
      errors.push({
        code: 'INVALID_PLUGIN_CLASS',
        message: 'Plugin must be a constructor function/class',
        severity: 'error'
      });
      return { valid: false, errors, warnings };
    }

    // Create instance for validation
    let instance: any;
    try {
      instance = new pluginClass();
    } catch (error) {
      errors.push({
        code: 'INSTANTIATION_ERROR',
        message: `Failed to instantiate plugin: ${error.message}`,
        severity: 'error'
      });
      return { valid: false, errors, warnings };
    }

    // Check required base methods
    const requiredMethods = ['validateConfig', 'onInitialize', 'onCleanup'];
    for (const method of requiredMethods) {
      if (typeof instance[method] !== 'function') {
        errors.push({
          code: 'MISSING_METHOD',
          message: `Plugin missing required method: ${method}`,
          field: method,
          severity: 'error'
        });
      }
    }

    // Category-specific validations
    switch (category) {
      case PluginCategory.BACKEND:
        this.validateBackendPlugin(instance, errors, warnings);
        break;
      case PluginCategory.RAG:
        this.validateRAGPlugin(instance, errors, warnings);
        break;
      case PluginCategory.CACHE:
        this.validateCachePlugin(instance, errors, warnings);
        break;
    }

    // Check metadata property
    if (!instance.metadata) {
      errors.push({
        code: 'MISSING_METADATA',
        message: 'Plugin must have metadata property',
        field: 'metadata',
        severity: 'error'
      });
    } else {
      const metadataResult = this.validateMetadata(instance.metadata);
      errors.push(...metadataResult.errors);
      warnings.push(...metadataResult.warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private static validateBackendPlugin(instance: any, errors: ValidationError[], warnings: ValidationError[]): void {
    const backendMethods = ['isAvailable', 'estimateCost', 'getInfo', 'processRequest', 'healthCheck'];
    
    for (const method of backendMethods) {
      if (typeof instance[method] !== 'function') {
        errors.push({
          code: 'MISSING_BACKEND_METHOD',
          message: `Backend plugin missing required method: ${method}`,
          field: method,
          severity: 'error'
        });
      }
    }

    if (!instance.name || typeof instance.name !== 'string') {
      errors.push({
        code: 'MISSING_BACKEND_NAME',
        message: 'Backend plugin must have a name property',
        field: 'name',
        severity: 'error'
      });
    }
  }

  private static validateRAGPlugin(instance: any, errors: ValidationError[], warnings: ValidationError[]): void {
    const ragMethods = ['createProvider', 'getSupportedVectorDBs', 'getSupportedDeployments'];
    
    for (const method of ragMethods) {
      if (typeof instance[method] !== 'function') {
        errors.push({
          code: 'MISSING_RAG_METHOD',
          message: `RAG plugin missing required method: ${method}`,
          field: method,
          severity: 'error'
        });
      }
    }
  }

  private static validateCachePlugin(instance: any, errors: ValidationError[], warnings: ValidationError[]): void {
    const cacheMethods = ['createProvider', 'getSupportedBackends'];
    
    for (const method of cacheMethods) {
      if (typeof instance[method] !== 'function') {
        errors.push({
          code: 'MISSING_CACHE_METHOD',
          message: `Cache plugin missing required method: ${method}`,
          field: method,
          severity: 'error'
        });
      }
    }
  }

  /**
   * Validate plugin configuration
   */
  static validateConfiguration(config: any, pluginMetadata: PluginMetadata): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Basic structure validation
    if (typeof config !== 'object' || config === null) {
      errors.push({
        code: 'INVALID_CONFIG_TYPE',
        message: 'Plugin configuration must be an object',
        severity: 'error'
      });
      return { valid: false, errors, warnings };
    }

    if (typeof config.enabled !== 'boolean') {
      errors.push({
        code: 'INVALID_ENABLED_TYPE',
        message: 'enabled property must be a boolean',
        field: 'enabled',
        severity: 'error'
      });
    }

    if (config.priority !== undefined && (typeof config.priority !== 'number' || config.priority < 0)) {
      warnings.push({
        code: 'INVALID_PRIORITY',
        message: 'priority should be a non-negative number',
        field: 'priority',
        severity: 'warning'
      });
    }

    // Category-specific configuration validation
    if (config.settings) {
      this.validateCategorySettings(config.settings, pluginMetadata.category, errors, warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private static validateCategorySettings(
    settings: any, 
    category: PluginCategory, 
    errors: ValidationError[], 
    warnings: ValidationError[]
  ): void {
    switch (category) {
      case PluginCategory.BACKEND:
        this.validateBackendSettings(settings, errors, warnings);
        break;
      case PluginCategory.RAG:
        this.validateRAGSettings(settings, errors, warnings);
        break;
      case PluginCategory.CACHE:
        this.validateCacheSettings(settings, errors, warnings);
        break;
    }
  }

  private static validateBackendSettings(settings: any, errors: ValidationError[], warnings: ValidationError[]): void {
    if (settings.timeout && (typeof settings.timeout !== 'number' || settings.timeout <= 0)) {
      warnings.push({
        code: 'INVALID_TIMEOUT',
        message: 'timeout should be a positive number',
        field: 'settings.timeout',
        severity: 'warning'
      });
    }

    if (settings.apiKey && typeof settings.apiKey !== 'string') {
      errors.push({
        code: 'INVALID_API_KEY',
        message: 'apiKey must be a string',
        field: 'settings.apiKey',
        severity: 'error'
      });
    }
  }

  private static validateRAGSettings(settings: any, errors: ValidationError[], warnings: ValidationError[]): void {
    if (settings.topK && (typeof settings.topK !== 'number' || settings.topK <= 0)) {
      warnings.push({
        code: 'INVALID_TOP_K',
        message: 'topK should be a positive number',
        field: 'settings.topK',
        severity: 'warning'
      });
    }

    if (settings.scoreThreshold && (typeof settings.scoreThreshold !== 'number' || 
        settings.scoreThreshold < 0 || settings.scoreThreshold > 1)) {
      warnings.push({
        code: 'INVALID_SCORE_THRESHOLD',
        message: 'scoreThreshold should be a number between 0 and 1',
        field: 'settings.scoreThreshold',
        severity: 'warning'
      });
    }
  }

  private static validateCacheSettings(settings: any, errors: ValidationError[], warnings: ValidationError[]): void {
    if (settings.ttl && (typeof settings.ttl !== 'number' || settings.ttl <= 0)) {
      warnings.push({
        code: 'INVALID_TTL',
        message: 'ttl should be a positive number',
        field: 'settings.ttl',
        severity: 'warning'
      });
    }

    if (settings.maxSize && (typeof settings.maxSize !== 'number' || settings.maxSize <= 0)) {
      warnings.push({
        code: 'INVALID_MAX_SIZE',
        message: 'maxSize should be a positive number',
        field: 'settings.maxSize',
        severity: 'warning'
      });
    }
  }

  /**
   * Security validation for plugins
   */
  static validateSecurity(pluginCode: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Check for dangerous patterns
    const dangerousPatterns = [
      { pattern: /eval\s*\(/g, message: 'Use of eval() is not allowed' },
      { pattern: /Function\s*\(/g, message: 'Use of Function constructor is not allowed' },
      { pattern: /process\.exit/g, message: 'Direct process.exit() calls are not allowed' },
      { pattern: /require\s*\(\s*['"]child_process['"]/g, message: 'Child process spawning requires permission' },
      { pattern: /require\s*\(\s*['"]fs['"]/g, message: 'File system access requires permission' }
    ];

    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(pluginCode)) {
        warnings.push({
          code: 'SECURITY_WARNING',
          message,
          severity: 'warning'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Helper methods
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private static isValidVersionRange(version: string): boolean {
    // Simple version range validation
    return /^[~^]?\d+\.\d+\.\d+/.test(version);
  }
}

// Plugin Quality Checker
export class PluginQualityChecker {
  /**
   * Comprehensive quality assessment
   */
  static assessQuality(pluginClass: any, pluginCode: string): QualityAssessment {
    const scores: QualityScores = {
      codeQuality: this.assessCodeQuality(pluginCode),
      documentation: this.assessDocumentation(pluginCode),
      testing: this.assessTesting(pluginCode),
      security: this.assessSecurity(pluginCode),
      performance: this.assessPerformance(pluginCode),
      maintainability: this.assessMaintainability(pluginCode)
    };

    const overallScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length;

    return {
      overallScore,
      scores,
      recommendations: this.generateRecommendations(scores),
      badge: this.determineBadge(overallScore)
    };
  }

  private static assessCodeQuality(code: string): number {
    let score = 100;

    // Penalize for long functions
    const functionMatches = code.match(/function[^{]*{([^{}]*{[^{}]*})*[^{}]*}/g) || [];
    const longFunctions = functionMatches.filter(fn => fn.split('\n').length > 50);
    score -= longFunctions.length * 10;

    // Penalize for missing error handling
    const tryBlocks = (code.match(/try\s*{/g) || []).length;
    const asyncFunctions = (code.match(/async\s+function/g) || []).length;
    if (asyncFunctions > tryBlocks * 2) {
      score -= 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  private static assessDocumentation(code: string): number {
    let score = 0;

    // Check for JSDoc comments
    const jsdocComments = (code.match(/\/\*\*[\s\S]*?\*\//g) || []).length;
    const functions = (code.match(/function|=>/g) || []).length;
    
    if (functions > 0) {
      score += (jsdocComments / functions) * 50;
    }

    // Check for inline comments
    const inlineComments = (code.match(/\/\/[^\n]*/g) || []).length;
    score += Math.min(30, inlineComments * 2);

    // Check for README
    if (code.includes('README') || code.includes('documentation')) {
      score += 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  private static assessTesting(code: string): number {
    let score = 0;

    if (code.includes('test') || code.includes('spec') || code.includes('jest') || code.includes('mocha')) {
      score += 50;
    }

    if (code.includes('expect') || code.includes('assert')) {
      score += 30;
    }

    if (code.includes('beforeEach') || code.includes('beforeAll')) {
      score += 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  private static assessSecurity(code: string): number {
    const securityResult = PluginValidator.validateSecurity(code);
    return securityResult.warnings.length === 0 ? 100 : Math.max(0, 100 - securityResult.warnings.length * 20);
  }

  private static assessPerformance(code: string): number {
    let score = 100;

    // Check for potential performance issues
    if (code.includes('setInterval') && !code.includes('clearInterval')) {
      score -= 20;
    }

    if (code.includes('setTimeout') && !code.includes('clearTimeout')) {
      score -= 10;
    }

    // Check for synchronous file operations
    if (code.includes('Sync(') || code.includes('readFileSync') || code.includes('writeFileSync')) {
      score -= 30;
    }

    return Math.max(0, Math.min(100, score));
  }

  private static assessMaintainability(code: string): number {
    let score = 100;

    // Check code complexity
    const cyclomaticComplexity = this.calculateCyclomaticComplexity(code);
    if (cyclomaticComplexity > 20) {
      score -= 30;
    } else if (cyclomaticComplexity > 10) {
      score -= 15;
    }

    // Check for magic numbers
    const magicNumbers = code.match(/\b\d{3,}\b/g) || [];
    score -= Math.min(20, magicNumbers.length * 5);

    return Math.max(0, Math.min(100, score));
  }

  private static calculateCyclomaticComplexity(code: string): number {
    const complexityKeywords = ['if', 'else', 'while', 'for', 'case', 'catch', '&&', '||', '?'];
    let complexity = 1; // Base complexity

    for (const keyword of complexityKeywords) {
      const matches = code.match(new RegExp(`\\b${keyword}\\b`, 'g'));
      complexity += matches ? matches.length : 0;
    }

    return complexity;
  }

  private static generateRecommendations(scores: QualityScores): string[] {
    const recommendations: string[] = [];

    if (scores.codeQuality < 70) {
      recommendations.push('Improve code quality by reducing function length and adding error handling');
    }

    if (scores.documentation < 60) {
      recommendations.push('Add JSDoc comments to functions and improve inline documentation');
    }

    if (scores.testing < 50) {
      recommendations.push('Add comprehensive test coverage with unit tests');
    }

    if (scores.security < 80) {
      recommendations.push('Review and fix potential security issues');
    }

    if (scores.performance < 70) {
      recommendations.push('Optimize performance by using async operations and avoiding blocking calls');
    }

    if (scores.maintainability < 70) {
      recommendations.push('Reduce code complexity and eliminate magic numbers');
    }

    return recommendations;
  }

  private static determineBadge(score: number): QualityBadge {
    if (score >= 90) return 'platinum';
    if (score >= 80) return 'gold';
    if (score >= 70) return 'silver';
    if (score >= 60) return 'bronze';
    return 'none';
  }
}

// Types for quality assessment
interface QualityScores {
  codeQuality: number;
  documentation: number;
  testing: number;
  security: number;
  performance: number;
  maintainability: number;
}

interface QualityAssessment {
  overallScore: number;
  scores: QualityScores;
  recommendations: string[];
  badge: QualityBadge;
}

type QualityBadge = 'platinum' | 'gold' | 'silver' | 'bronze' | 'none';
