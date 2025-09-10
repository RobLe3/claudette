// Configuration Factory for MCP Multiplexing System
// Provides preset configurations and dynamic configuration management

import { MultiplexerConfiguration } from './mcp-multiplexer';
import { LoadBalancingStrategy } from './load-balancer';
import { CircuitBreakerState } from './health-monitor';
import { EnhancedMCPConfig } from './enhanced-mcp-rag';

export enum MultiplexingPreset {
  DEVELOPMENT = 'development',
  PRODUCTION_SMALL = 'production_small',
  PRODUCTION_LARGE = 'production_large',
  HIGH_AVAILABILITY = 'high_availability',
  COST_OPTIMIZED = 'cost_optimized',
  PERFORMANCE_OPTIMIZED = 'performance_optimized',
  TESTING = 'testing'
}

export interface ConfigurationProfile {
  name: string;
  description: string;
  multiplexerConfig: MultiplexerConfiguration;
  recommendedServerCount: number;
  expectedThroughput: string;
  reliability: 'low' | 'medium' | 'high' | 'critical';
  costEfficiency: 'low' | 'medium' | 'high';
  complexity: 'simple' | 'moderate' | 'complex';
}

export class MultiplexingConfigFactory {
  private static readonly configurations = new Map<MultiplexingPreset, ConfigurationProfile>();

  static {
    // Initialize preset configurations
    MultiplexingConfigFactory.initializePresets();
  }

  /**
   * Get a preset configuration
   */
  static getPresetConfiguration(preset: MultiplexingPreset): ConfigurationProfile {
    const config = MultiplexingConfigFactory.configurations.get(preset);
    if (!config) {
      throw new Error(`Unknown configuration preset: ${preset}`);
    }
    return JSON.parse(JSON.stringify(config)); // Deep clone
  }

  /**
   * Create a custom configuration
   */
  static createCustomConfiguration(options: {
    name: string;
    description: string;
    serverCount: number;
    loadBalancingStrategy: LoadBalancingStrategy;
    enableHealthMonitoring: boolean;
    enableFailover: boolean;
    performanceOptimized: boolean;
    reliability: 'low' | 'medium' | 'high' | 'critical';
  }): ConfigurationProfile {
    const baseConfig = this.getBaseConfiguration();
    
    // Customize based on options
    const multiplexerConfig: MultiplexerConfiguration = {
      ...baseConfig,
      pool: {
        ...baseConfig.pool,
        minServers: Math.max(1, Math.floor(options.serverCount * 0.5)),
        maxServers: options.serverCount,
        autoscaling: {
          enabled: options.performanceOptimized,
          scaleUpThreshold: options.performanceOptimized ? 0.7 : 0.8,
          scaleDownThreshold: options.performanceOptimized ? 0.2 : 0.3,
          cooldownPeriod: 300000,
        }
      },
      loadBalancing: {
        ...baseConfig.loadBalancing,
        strategy: options.loadBalancingStrategy,
        adaptiveEnabled: options.performanceOptimized
      },
      healthMonitoring: {
        ...baseConfig.healthMonitoring,
        failureThreshold: options.reliability === 'critical' ? 3 : options.reliability === 'high' ? 5 : 8,
        recoveryTimeMs: options.reliability === 'critical' ? 30000 : 60000
      },
      failover: {
        ...baseConfig.failover,
        enabled: options.enableFailover,
        maxFailoverAttempts: options.reliability === 'critical' ? 5 : 3,
        autoRecovery: options.enableHealthMonitoring
      },
      performance: {
        ...baseConfig.performance,
        optimizationEnabled: options.performanceOptimized,
        adaptiveScaling: options.performanceOptimized
      }
    };

    return {
      name: options.name,
      description: options.description,
      multiplexerConfig,
      recommendedServerCount: options.serverCount,
      expectedThroughput: this.calculateExpectedThroughput(options.serverCount, options.performanceOptimized),
      reliability: options.reliability,
      costEfficiency: this.calculateCostEfficiency(options),
      complexity: this.calculateComplexity(options)
    };
  }

  /**
   * Create an Enhanced MCP RAG configuration
   */
  static createEnhancedMCPConfig(options: {
    preset: MultiplexingPreset;
    serverConfigs: Array<{
      host: string;
      port: number;
      capabilities: string[];
      pluginPath?: string;
    }>;
    enableFallback?: boolean;
    fallbackConfig?: {
      host: string;
      port: number;
      pluginPath: string;
    };
  }): EnhancedMCPConfig {
    const profile = this.getPresetConfiguration(options.preset);
    
    return {
      deployment: 'mcp',
      connection: {
        type: 'mcp',
        pluginPath: options.serverConfigs[0]?.pluginPath || '',
        serverHost: options.serverConfigs[0]?.host || 'localhost',
        serverPort: options.serverConfigs[0]?.port || 3000
      },
      vectorDB: {
        enabled: true,
        provider: 'local',
        collection: 'default',
        dimensions: 1536
      },
      graphDB: {
        enabled: false,
        provider: 'lightrag',
        database: 'default'
      },
      hybrid: false,
      multiplexing: {
        enabled: true,
        serverConfigs: options.serverConfigs,
        configuration: profile.multiplexerConfig
      },
      fallback: {
        enableSingleServerFallback: options.enableFallback ?? true,
        singleServerConfig: options.fallbackConfig
      }
    };
  }

  /**
   * Optimize configuration for specific use case
   */
  static optimizeForUseCase(baseConfig: ConfigurationProfile, useCase: {
    expectedQPS: number;
    maxLatency: number;
    reliabilityRequirement: 'low' | 'medium' | 'high' | 'critical';
    costBudget: 'low' | 'medium' | 'high';
  }): ConfigurationProfile {
    const optimized = JSON.parse(JSON.stringify(baseConfig)); // Deep clone
    
    // Adjust server count based on expected QPS
    const requiredServerCount = Math.ceil(useCase.expectedQPS / 10); // Assume 10 QPS per server
    optimized.multiplexerConfig.pool.minServers = Math.max(2, Math.floor(requiredServerCount * 0.7));
    optimized.multiplexerConfig.pool.maxServers = Math.max(3, requiredServerCount * 2);
    
    // Adjust timeouts based on latency requirements
    if (useCase.maxLatency < 5000) {
      optimized.multiplexerConfig.router.defaultTimeout = Math.min(useCase.maxLatency * 0.8, 10000);
      optimized.multiplexerConfig.healthMonitoring.timeoutMs = Math.min(useCase.maxLatency * 0.5, 5000);
    }
    
    // Adjust reliability settings
    switch (useCase.reliabilityRequirement) {
      case 'critical':
        optimized.multiplexerConfig.healthMonitoring.failureThreshold = 2;
        optimized.multiplexerConfig.failover.maxFailoverAttempts = 5;
        optimized.multiplexerConfig.healthMonitoring.recoveryTimeMs = 30000;
        break;
      case 'high':
        optimized.multiplexerConfig.healthMonitoring.failureThreshold = 3;
        optimized.multiplexerConfig.failover.maxFailoverAttempts = 4;
        break;
      case 'medium':
        optimized.multiplexerConfig.healthMonitoring.failureThreshold = 5;
        optimized.multiplexerConfig.failover.maxFailoverAttempts = 3;
        break;
      case 'low':
        optimized.multiplexerConfig.healthMonitoring.failureThreshold = 8;
        optimized.multiplexerConfig.failover.maxFailoverAttempts = 2;
        break;
    }
    
    // Adjust based on cost budget
    if (useCase.costBudget === 'low') {
      optimized.multiplexerConfig.loadBalancing.strategy = LoadBalancingStrategy.ROUND_ROBIN;
      optimized.multiplexerConfig.performance.optimizationEnabled = false;
      optimized.multiplexerConfig.pool.maxServers = Math.min(optimized.multiplexerConfig.pool.maxServers, 4);
    } else if (useCase.costBudget === 'high') {
      optimized.multiplexerConfig.loadBalancing.strategy = LoadBalancingStrategy.ADAPTIVE;
      optimized.multiplexerConfig.performance.optimizationEnabled = true;
      optimized.multiplexerConfig.performance.adaptiveScaling = true;
    }
    
    optimized.reliability = useCase.reliabilityRequirement;
    optimized.expectedThroughput = `${useCase.expectedQPS} QPS`;
    
    return optimized;
  }

  /**
   * Validate configuration for production readiness
   */
  static validateProductionConfig(config: ConfigurationProfile): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
    recommendations: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    const recommendations: string[] = [];
    
    // Check minimum server count
    if (config.multiplexerConfig.pool.minServers && config.multiplexerConfig.pool.minServers < 2) {
      errors.push('Minimum server count should be at least 2 for production');
    }
    
    // Check failover configuration
    if (!config.multiplexerConfig.failover.enabled) {
      warnings.push('Failover is disabled - consider enabling for production resilience');
    }
    
    // Check health monitoring
    if (config.multiplexerConfig.healthMonitoring.failureThreshold && config.multiplexerConfig.healthMonitoring.failureThreshold > 5) {
      warnings.push('High failure threshold may delay fault detection');
    }
    
    // Check load balancing strategy
    if (config.multiplexerConfig.loadBalancing.strategy === LoadBalancingStrategy.ROUND_ROBIN) {
      recommendations.push('Consider using ADAPTIVE or WEIGHTED_RESPONSE_TIME strategy for better performance');
    }
    
    // Check timeout configurations
    if (config.multiplexerConfig.router.defaultTimeout > 30000) {
      warnings.push('High default timeout may impact user experience');
    }
    
    // Check autoscaling
    if (!config.multiplexerConfig.pool.autoscaling?.enabled && config.multiplexerConfig.pool.maxServers && config.multiplexerConfig.pool.maxServers > 5) {
      recommendations.push('Consider enabling autoscaling for large server pools');
    }
    
    // Check performance monitoring
    if (!config.multiplexerConfig.performance.metricsEnabled) {
      warnings.push('Performance metrics are disabled - this will limit observability');
    }
    
    return {
      isValid: errors.length === 0,
      warnings,
      errors,
      recommendations
    };
  }

  /**
   * Get all available presets
   */
  static getAvailablePresets(): Array<{
    preset: MultiplexingPreset;
    profile: ConfigurationProfile;
  }> {
    return Array.from(MultiplexingConfigFactory.configurations.entries()).map(([preset, profile]) => ({
      preset,
      profile: JSON.parse(JSON.stringify(profile)) // Deep clone
    }));
  }

  // Private methods
  private static initializePresets(): void {
    // Development preset
    MultiplexingConfigFactory.configurations.set(MultiplexingPreset.DEVELOPMENT, {
      name: 'Development',
      description: 'Optimized for development and testing with minimal resource usage',
      multiplexerConfig: {
        ...MultiplexingConfigFactory.getBaseConfiguration(),
        pool: {
          minServers: 1,
          maxServers: 2,
          healthCheckInterval: 15000,
          maxConsecutiveFailures: 5,
          connectionTimeout: 5000,
          requestTimeout: 15000,
          maxRequestsPerServer: 50,
          loadBalancingStrategy: 'round-robin',
          circuitBreakerThreshold: 0.3,
          autoscaling: {
            enabled: false,
            scaleUpThreshold: 0.8,
            scaleDownThreshold: 0.3,
            cooldownPeriod: 600000
          },
          retryPolicy: {
            maxRetries: 2,
            backoffStrategy: 'linear',
            initialDelay: 1000,
            maxDelay: 5000
          }
        },
        loadBalancing: {
          strategy: LoadBalancingStrategy.ROUND_ROBIN,
          adaptiveEnabled: false,
          adaptationInterval: 120000,
          strategyWeights: new Map(),
          performanceThresholds: {
            maxResponseTime: 15000,
            maxErrorRate: 0.1,
            maxUtilization: 0.9
          },
          predictiveModel: {
            enabled: false,
            historyWindow: 300000,
            predictionHorizon: 60000,
            confidenceThreshold: 0.6
          }
        }
      },
      recommendedServerCount: 2,
      expectedThroughput: '5-10 QPS',
      reliability: 'low',
      costEfficiency: 'high',
      complexity: 'simple'
    });

    // Production Small preset
    MultiplexingConfigFactory.configurations.set(MultiplexingPreset.PRODUCTION_SMALL, {
      name: 'Production Small',
      description: 'Suitable for small production workloads with moderate traffic',
      multiplexerConfig: MultiplexingConfigFactory.getBaseConfiguration(),
      recommendedServerCount: 3,
      expectedThroughput: '50-100 QPS',
      reliability: 'medium',
      costEfficiency: 'medium',
      complexity: 'moderate'
    });

    // Production Large preset
    MultiplexingConfigFactory.configurations.set(MultiplexingPreset.PRODUCTION_LARGE, {
      name: 'Production Large',
      description: 'Designed for high-traffic production environments',
      multiplexerConfig: {
        ...MultiplexingConfigFactory.getBaseConfiguration(),
        pool: {
          ...MultiplexingConfigFactory.getBaseConfiguration().pool,
          minServers: 4,
          maxServers: 12,
          maxRequestsPerServer: 200,
          autoscaling: {
            enabled: true,
            scaleUpThreshold: 0.7,
            scaleDownThreshold: 0.2,
            cooldownPeriod: 180000
          }
        },
        loadBalancing: {
          ...MultiplexingConfigFactory.getBaseConfiguration().loadBalancing,
          strategy: LoadBalancingStrategy.ADAPTIVE,
          adaptiveEnabled: true
        },
        performance: {
          metricsEnabled: true,
          optimizationEnabled: true,
          adaptiveScaling: true
        }
      },
      recommendedServerCount: 8,
      expectedThroughput: '500-1000 QPS',
      reliability: 'high',
      costEfficiency: 'medium',
      complexity: 'complex'
    });

    // High Availability preset
    MultiplexingConfigFactory.configurations.set(MultiplexingPreset.HIGH_AVAILABILITY, {
      name: 'High Availability',
      description: 'Maximum reliability with aggressive failover and monitoring',
      multiplexerConfig: {
        ...MultiplexingConfigFactory.getBaseConfiguration(),
        healthMonitoring: {
          failureThreshold: 2,
          timeoutMs: 5000,
          recoveryTimeMs: 30000,
          successThreshold: 5,
          monitoringWindow: 120000,
          healthCheckInterval: 5000
        },
        failover: {
          enabled: true,
          maxFailoverAttempts: 5,
          failoverDelay: 500,
          autoRecovery: true,
          recoveryCheckInterval: 15000
        },
        pool: {
          ...MultiplexingConfigFactory.getBaseConfiguration().pool,
          minServers: 3,
          maxServers: 10,
          maxConsecutiveFailures: 2,
          circuitBreakerThreshold: 0.7
        }
      },
      recommendedServerCount: 6,
      expectedThroughput: '200-500 QPS',
      reliability: 'critical',
      costEfficiency: 'low',
      complexity: 'complex'
    });

    // Cost Optimized preset
    MultiplexingConfigFactory.configurations.set(MultiplexingPreset.COST_OPTIMIZED, {
      name: 'Cost Optimized',
      description: 'Minimizes resource usage while maintaining basic reliability',
      multiplexerConfig: {
        ...MultiplexingConfigFactory.getBaseConfiguration(),
        pool: {
          ...MultiplexingConfigFactory.getBaseConfiguration().pool,
          minServers: 2,
          maxServers: 4,
          maxRequestsPerServer: 150,
          autoscaling: {
            enabled: true,
            scaleUpThreshold: 0.9,
            scaleDownThreshold: 0.2,
            cooldownPeriod: 600000
          }
        },
        loadBalancing: {
          ...MultiplexingConfigFactory.getBaseConfiguration().loadBalancing,
          strategy: LoadBalancingStrategy.LEAST_CONNECTIONS,
          adaptiveEnabled: false
        },
        performance: {
          metricsEnabled: true,
          optimizationEnabled: false,
          adaptiveScaling: false
        }
      },
      recommendedServerCount: 3,
      expectedThroughput: '100-200 QPS',
      reliability: 'medium',
      costEfficiency: 'high',
      complexity: 'simple'
    });

    // Performance Optimized preset
    MultiplexingConfigFactory.configurations.set(MultiplexingPreset.PERFORMANCE_OPTIMIZED, {
      name: 'Performance Optimized',
      description: 'Maximum performance with advanced features and optimization',
      multiplexerConfig: {
        ...MultiplexingConfigFactory.getBaseConfiguration(),
        loadBalancing: {
          ...MultiplexingConfigFactory.getBaseConfiguration().loadBalancing,
          strategy: LoadBalancingStrategy.PREDICTIVE,
          adaptiveEnabled: true,
          predictiveModel: {
            enabled: true,
            historyWindow: 600000,
            predictionHorizon: 120000,
            confidenceThreshold: 0.8
          }
        },
        performance: {
          metricsEnabled: true,
          optimizationEnabled: true,
          adaptiveScaling: true
        },
        pool: {
          ...MultiplexingConfigFactory.getBaseConfiguration().pool,
          maxRequestsPerServer: 300,
          requestTimeout: 5000
        }
      },
      recommendedServerCount: 6,
      expectedThroughput: '1000+ QPS',
      reliability: 'high',
      costEfficiency: 'low',
      complexity: 'complex'
    });

    // Testing preset
    MultiplexingConfigFactory.configurations.set(MultiplexingPreset.TESTING, {
      name: 'Testing',
      description: 'Configured for automated testing and validation',
      multiplexerConfig: {
        ...MultiplexingConfigFactory.getBaseConfiguration(),
        pool: {
          ...MultiplexingConfigFactory.getBaseConfiguration().pool,
          minServers: 2,
          maxServers: 3,
          healthCheckInterval: 5000,
          connectionTimeout: 2000,
          requestTimeout: 5000
        },
        healthMonitoring: {
          ...MultiplexingConfigFactory.getBaseConfiguration().healthMonitoring,
          healthCheckInterval: 2000,
          timeoutMs: 3000,
          recoveryTimeMs: 10000
        },
        failover: {
          ...MultiplexingConfigFactory.getBaseConfiguration().failover,
          failoverDelay: 200
        }
      },
      recommendedServerCount: 2,
      expectedThroughput: '10-20 QPS',
      reliability: 'medium',
      costEfficiency: 'high',
      complexity: 'simple'
    });
  }

  private static getBaseConfiguration(): MultiplexerConfiguration {
    return {
      pool: {
        minServers: 2,
        maxServers: 6,
        healthCheckInterval: 10000,
        maxConsecutiveFailures: 3,
        connectionTimeout: 5000,
        requestTimeout: 30000,
        maxRequestsPerServer: 100,
        loadBalancingStrategy: 'weighted-response-time',
        circuitBreakerThreshold: 0.5,
        autoscaling: {
          enabled: true,
          scaleUpThreshold: 0.8,
          scaleDownThreshold: 0.3,
          cooldownPeriod: 300000
        },
        retryPolicy: {
          maxRetries: 3,
          backoffStrategy: 'exponential',
          initialDelay: 1000,
          maxDelay: 10000
        }
      },
      router: {
        enableIntelligentRouting: true,
        defaultTimeout: 30000,
        maxRetries: 3
      },
      healthMonitoring: {
        failureThreshold: 5,
        timeoutMs: 10000,
        recoveryTimeMs: 60000,
        successThreshold: 3,
        monitoringWindow: 300000,
        healthCheckInterval: 10000
      },
      loadBalancing: {
        strategy: LoadBalancingStrategy.WEIGHTED_RESPONSE_TIME,
        adaptiveEnabled: true,
        adaptationInterval: 60000,
        strategyWeights: new Map([
          [LoadBalancingStrategy.ROUND_ROBIN, 1.0],
          [LoadBalancingStrategy.LEAST_CONNECTIONS, 1.2],
          [LoadBalancingStrategy.WEIGHTED_RESPONSE_TIME, 1.5],
          [LoadBalancingStrategy.RESOURCE_AWARE, 1.8],
          [LoadBalancingStrategy.CAPABILITY_BASED, 1.3],
          [LoadBalancingStrategy.PREDICTIVE, 2.0],
          [LoadBalancingStrategy.ADAPTIVE, 2.2]
        ]),
        performanceThresholds: {
          maxResponseTime: 10000,
          maxErrorRate: 0.05,
          maxUtilization: 0.8
        },
        predictiveModel: {
          enabled: true,
          historyWindow: 300000,
          predictionHorizon: 60000,
          confidenceThreshold: 0.7
        }
      },
      failover: {
        enabled: true,
        maxFailoverAttempts: 3,
        failoverDelay: 1000,
        autoRecovery: true,
        recoveryCheckInterval: 30000
      },
      performance: {
        metricsEnabled: true,
        optimizationEnabled: true,
        adaptiveScaling: true
      }
    };
  }

  private static calculateExpectedThroughput(serverCount: number, performanceOptimized: boolean): string {
    const baseQPS = performanceOptimized ? 15 : 10;
    const totalQPS = serverCount * baseQPS;
    
    if (totalQPS < 50) return `${totalQPS} QPS`;
    if (totalQPS < 200) return `${Math.floor(totalQPS / 50) * 50}-${Math.ceil(totalQPS / 50) * 50} QPS`;
    return `${Math.floor(totalQPS / 100) * 100}+ QPS`;
  }

  private static calculateCostEfficiency(options: any): 'low' | 'medium' | 'high' {
    if (options.serverCount <= 3 && !options.performanceOptimized) return 'high';
    if (options.serverCount <= 6 && options.reliability !== 'critical') return 'medium';
    return 'low';
  }

  private static calculateComplexity(options: any): 'simple' | 'moderate' | 'complex' {
    let complexity = 0;
    
    if (options.serverCount > 6) complexity += 2;
    if (options.loadBalancingStrategy === LoadBalancingStrategy.ADAPTIVE || 
        options.loadBalancingStrategy === LoadBalancingStrategy.PREDICTIVE) complexity += 2;
    if (options.reliability === 'critical') complexity += 1;
    if (options.performanceOptimized) complexity += 1;
    
    if (complexity <= 2) return 'simple';
    if (complexity <= 4) return 'moderate';
    return 'complex';
  }
}