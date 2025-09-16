// Enhanced MCP RAG Provider with Multiplexing Support
// Integrates the sophisticated multiplexing system with the existing RAG architecture

import { BaseRAGProvider } from '../base-rag';
import { MCPMultiplexer, MultiplexerConfiguration } from './mcp-multiplexer';
import { RAGRequest, RAGResponse, RAGConfig, MCPConnection, RAGError } from '../types';
import { PerformanceAnalytics } from '../../analytics/performance/performance-analytics';

export interface EnhancedMCPConfig extends RAGConfig {
  multiplexing: {
    enabled: boolean;
    serverConfigs: Array<{
      host: string;
      port: number;
      capabilities: string[];
      pluginPath?: string;
    }>;
    configuration: Partial<MultiplexerConfiguration>;
  };
  fallback: {
    enableSingleServerFallback: boolean;
    singleServerConfig?: {
      host: string;
      port: number;
      pluginPath: string;
    };
  };
}

export class EnhancedMCPRAGProvider extends BaseRAGProvider {
  private mcpConnection: MCPConnection;
  private multiplexer?: MCPMultiplexer;
  private analytics: PerformanceAnalytics;
  private isMultiplexingEnabled: boolean;
  private singleServerProcess?: any;
  private singleServerConnection?: any;

  constructor(config: EnhancedMCPConfig) {
    super(config);
    
    if (config.connection.type !== 'mcp') {
      throw this.createError('Invalid connection type for Enhanced MCP provider', 'INVALID_CONFIG');
    }
    
    this.mcpConnection = config.connection as MCPConnection;
    this.analytics = new PerformanceAnalytics();
    this.isMultiplexingEnabled = config.multiplexing?.enabled ?? true;
    
    this.validateConfig();
    console.log(`🚀 Enhanced MCP RAG Provider initialized with multiplexing ${this.isMultiplexingEnabled ? 'enabled' : 'disabled'}`);
  }

  validateConfig(): boolean {
    super.validateConfig();
    
    if (this.isMultiplexingEnabled) {
      const multiplexingConfig = (this.config as EnhancedMCPConfig).multiplexing;
      
      if (!multiplexingConfig?.serverConfigs || multiplexingConfig.serverConfigs.length === 0) {
        throw this.createError('At least one server configuration is required for multiplexing', 'INVALID_CONFIG');
      }
      
      // Validate each server config
      for (const serverConfig of multiplexingConfig.serverConfigs) {
        if (!serverConfig.host || !serverConfig.port) {
          throw this.createError('Server host and port are required', 'INVALID_CONFIG');
        }
        if (!serverConfig.capabilities || serverConfig.capabilities.length === 0) {
          throw this.createError('Server capabilities are required', 'INVALID_CONFIG');
        }
      }
    } else {
      // For single server mode, require plugin path
      const fallbackConfig = (this.config as EnhancedMCPConfig).fallback;
      if (!this.mcpConnection.pluginPath && !fallbackConfig?.singleServerConfig?.pluginPath) {
        throw this.createError('Plugin path is required for single server mode', 'INVALID_CONFIG');
      }
    }
    
    return true;
  }

  async connect(): Promise<void> {
    console.log(`🔌 Connecting Enhanced MCP RAG provider (multiplexing: ${this.isMultiplexingEnabled})`);
    
    try {
      if (this.isMultiplexingEnabled) {
        await this.connectMultiplexing();
      } else {
        await this.connectSingleServer();
      }
      
      this.isHealthy = true;
      console.log('✅ Enhanced MCP RAG provider connected successfully');
      
    } catch (error: any) {
      console.error('❌ Enhanced MCP RAG connection failed:', error);
      
      // Attempt fallback if multiplexing failed
      if (this.isMultiplexingEnabled && (this.config as EnhancedMCPConfig).fallback.enableSingleServerFallback) {
        console.log('🔄 Attempting single server fallback...');
        try {
          await this.connectSingleServerFallback();
          this.isHealthy = true;
          console.log('✅ Single server fallback connection successful');
        } catch (fallbackError: any) {
          throw this.createError(
            `Failed to connect with multiplexing and fallback: ${error.message} | Fallback: ${fallbackError.message}`,
            'CONNECTION_FAILED',
            true
          );
        }
      } else {
        throw this.createError(
          `Failed to connect to Enhanced MCP RAG: ${error.message}`,
          'CONNECTION_FAILED',
          true
        );
      }
    }
  }

  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting Enhanced MCP RAG provider');
    
    try {
      if (this.multiplexer) {
        await this.multiplexer.shutdown();
        this.multiplexer = undefined;
      }
      
      if (this.singleServerConnection) {
        this.singleServerConnection.end();
        this.singleServerConnection = null;
      }
      
      if (this.singleServerProcess) {
        this.singleServerProcess.kill('SIGTERM');
        this.singleServerProcess = null;
      }
      
      this.isHealthy = false;
      console.log('✅ Enhanced MCP RAG provider disconnected');
      
    } catch (error: any) {
      console.warn('⚠️ Error during Enhanced MCP disconnect:', error);
    }
  }

  async query(request: RAGRequest): Promise<RAGResponse> {
    if (!this.isHealthy) {
      throw this.createError('Enhanced MCP RAG provider is not connected', 'CONNECTION_FAILED', true);
    }

    const queryId = this.generateQueryId();
    const startTime = Date.now();
    console.log(`🔍 Enhanced MCP RAG query ${queryId}: "${request.query}"`);

    try {
      let response: RAGResponse;
      
      if (this.multiplexer) {
        response = await this.queryWithMultiplexing(request, queryId);
      } else {
        response = await this.queryWithSingleServer(request, queryId);
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ Enhanced MCP RAG query completed in ${duration}ms`);
      
      // Record analytics
      this.recordQueryAnalytics(request, response, duration, true);
      
      return response;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ Enhanced MCP RAG query failed: ${error.message}`);
      
      // Record failure analytics
      this.recordQueryAnalytics(request, null, duration, false, error);
      
      throw this.createError(
        `Enhanced MCP RAG query failed: ${error.message}`,
        'RAG_SERVICE_ERROR',
        true
      );
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (this.multiplexer) {
        const status = this.multiplexer.getStatus();
        return status.isHealthy && status.healthyServers > 0;
      } else if (this.singleServerConnection) {
        return await this.performSingleServerHealthCheck();
      }
      return false;
      
    } catch (error: any) {
      console.warn(`⚠️ Enhanced MCP health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get multiplexer status (if enabled)
   */
  getMultiplexerStatus(): any {
    if (this.multiplexer) {
      return this.multiplexer.getStatus();
    }
    return null;
  }

  /**
   * Get performance analytics
   */
  getPerformanceAnalytics(): any {
    if (this.multiplexer) {
      return this.multiplexer.getPerformanceAnalytics();
    }
    return this.analytics.getDashboardData();
  }

  /**
   * Add server to multiplexer (if enabled)
   */
  async addServer(serverConfig: {
    host: string;
    port: number;
    capabilities: string[];
  }): Promise<void> {
    if (!this.multiplexer) {
      throw new Error('Multiplexing is not enabled');
    }
    
    await this.multiplexer.addServer(serverConfig);
  }

  /**
   * Remove server from multiplexer (if enabled)
   */
  async removeServer(serverId: string): Promise<void> {
    if (!this.multiplexer) {
      throw new Error('Multiplexing is not enabled');
    }
    
    await this.multiplexer.removeServer(serverId);
  }

  /**
   * Force failover for a specific server (if enabled)
   */
  async forceFailover(serverId: string, reason?: string): Promise<void> {
    if (!this.multiplexer) {
      throw new Error('Multiplexing is not enabled');
    }
    
    await this.multiplexer.forceFailover(serverId, reason);
  }

  // Private methods
  private async connectMultiplexing(): Promise<void> {
    const config = this.config as EnhancedMCPConfig;
    
    // Initialize multiplexer
    this.multiplexer = new MCPMultiplexer(config.multiplexing.configuration);
    
    // Start servers and initialize multiplexer
    const serverConfigs = config.multiplexing.serverConfigs;
    
    // Start MCP server processes if plugin paths are provided
    for (const serverConfig of serverConfigs) {
      if (serverConfig.pluginPath) {
        await this.startMCPServerProcess(serverConfig);
      }
    }
    
    // Wait for servers to be ready
    await this.waitForServersReady(serverConfigs);
    
    // Initialize multiplexer with server configurations
    await this.multiplexer.initialize(serverConfigs.map(config => ({
      host: config.host,
      port: config.port,
      capabilities: config.capabilities
    })));
    
    // Set up event handlers
    this.setupMultiplexerEventHandlers();
  }

  private async connectSingleServer(): Promise<void> {
    console.log('🔌 Connecting to single MCP server');
    
    const pluginPath = this.mcpConnection.pluginPath;
    if (!pluginPath) {
      throw new Error('Plugin path is required for single server mode');
    }
    
    await this.startSingleMCPServer(pluginPath);
    await this.connectToSingleMCPServer();
  }

  private async connectSingleServerFallback(): Promise<void> {
    const config = this.config as EnhancedMCPConfig;
    const fallbackConfig = config.fallback.singleServerConfig;
    
    if (!fallbackConfig) {
      throw new Error('No fallback configuration available');
    }
    
    console.log('🔄 Connecting to fallback single server');
    await this.startSingleMCPServer(fallbackConfig.pluginPath);
    
    // Override connection settings for fallback
    this.mcpConnection = {
      ...this.mcpConnection,
      serverHost: fallbackConfig.host,
      serverPort: fallbackConfig.port
    };
    
    await this.connectToSingleMCPServer();
  }

  private async startMCPServerProcess(serverConfig: {
    host: string;
    port: number;
    pluginPath?: string;
    capabilities: string[];
  }): Promise<void> {
    if (!serverConfig.pluginPath) return;
    
    console.log(`🚀 Starting MCP server process: ${serverConfig.pluginPath} on ${serverConfig.host}:${serverConfig.port}`);
    
    const { spawn } = await import('child_process');
    
    const serverProcess = spawn('node', [serverConfig.pluginPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { 
        ...process.env, 
        MCP_RAG_MODE: 'server',
        MCP_SERVER_HOST: serverConfig.host,
        MCP_SERVER_PORT: serverConfig.port.toString()
      }
    });
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`MCP server startup timeout: ${serverConfig.pluginPath}`));
      }, 15000);

      serverProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        if (output.includes('MCP_RAG_READY') || output.includes('Server ready')) {
          clearTimeout(timeout);
          resolve();
        }
      });

      serverProcess.stderr.on('data', (data: Buffer) => {
        console.error(`MCP server error (${serverConfig.host}:${serverConfig.port}):`, data.toString());
      });

      serverProcess.on('error', (error: Error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private async startSingleMCPServer(pluginPath: string): Promise<void> {
    console.log(`🚀 Starting single MCP server: ${pluginPath}`);
    
    const { spawn } = await import('child_process');
    
    this.singleServerProcess = spawn('node', [pluginPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, MCP_RAG_MODE: 'server' }
    });

    await this.waitForSingleServerReady();
  }

  private async waitForSingleServerReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Single MCP server startup timeout'));
      }, 10000);

      if (this.singleServerProcess) {
        this.singleServerProcess.stdout.on('data', (data: Buffer) => {
          const output = data.toString();
          if (output.includes('MCP_RAG_READY')) {
            clearTimeout(timeout);
            resolve();
          }
        });

        this.singleServerProcess.stderr.on('data', (data: Buffer) => {
          console.error('Single MCP server error:', data.toString());
        });

        this.singleServerProcess.on('error', (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        });
      }
    });
  }

  private async waitForServersReady(serverConfigs: any[]): Promise<void> {
    console.log(`⏳ Waiting for ${serverConfigs.length} MCP servers to be ready...`);
    
    // Give servers time to initialize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test connectivity to each server
    const testPromises = serverConfigs.map(async config => {
      try {
        const net = await import('net');
        return new Promise<void>((resolve, reject) => {
          const connection = net.createConnection(config.port, config.host);
          
          const timeout = setTimeout(() => {
            connection.destroy();
            reject(new Error(`Connection timeout to ${config.host}:${config.port}`));
          }, 5000);
          
          connection.on('connect', () => {
            clearTimeout(timeout);
            connection.end();
            resolve();
          });
          
          connection.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
      } catch (error) {
        throw new Error(`Failed to connect to server ${config.host}:${config.port}: ${(error as Error).message}`);
      }
    });
    
    await Promise.all(testPromises);
    console.log('✅ All MCP servers are ready');
  }

  private async connectToSingleMCPServer(): Promise<void> {
    const net = await import('net');
    const port = this.mcpConnection.serverPort || 3000;
    const host = this.mcpConnection.serverHost || 'localhost';
    
    return new Promise((resolve, reject) => {
      this.singleServerConnection = net.createConnection(port, host, () => {
        console.log(`🔗 Connected to single MCP server on ${host}:${port}`);
        resolve();
      });

      this.singleServerConnection.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  private setupMultiplexerEventHandlers(): void {
    if (!this.multiplexer) return;
    
    this.multiplexer.on('serverFailure', (event) => {
      console.warn(`⚠️ Server failure detected: ${event.serverId}`);
    });
    
    this.multiplexer.on('failoverTriggered', (event) => {
      console.log(`🔄 Failover triggered: ${event.fromServerId} → ${event.toServerId || 'none'}`);
    });
    
    this.multiplexer.on('serverRecovery', (serverId) => {
      console.log(`✅ Server recovered: ${serverId}`);
    });
  }

  private async queryWithMultiplexing(request: RAGRequest, queryId: string): Promise<RAGResponse> {
    if (!this.multiplexer) {
      throw new Error('Multiplexer not available');
    }
    
    // Determine priority based on request characteristics
    const priority = this.calculateRequestPriority(request);
    
    return await this.multiplexer.executeRequest(request, priority);
  }

  private async queryWithSingleServer(request: RAGRequest, queryId: string): Promise<RAGResponse> {
    const mcpRequest = {
      method: 'rag/query',
      params: {
        query: request.query,
        context: request.context,
        maxResults: request.maxResults || 5,
        threshold: request.threshold || 0.7,
        vectorDB: this.config.vectorDB,
        graphDB: this.config.graphDB,
        hybrid: this.config.hybrid
      },
      id: queryId
    };

    const result = await this.sendSingleServerRequest(mcpRequest);
    const processingTime = Date.now();

    return {
      results: result.results || [],
      metadata: {
        totalResults: result.results?.length || 0,
        processingTime,
        source: result.source || 'vector',
        queryId
      }
    };
  }

  private async sendSingleServerRequest(request: any, timeout: number = 30000): Promise<any> {
    if (!this.singleServerConnection) {
      throw new Error('Single server connection not available');
    }
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Single server request timeout'));
      }, timeout);

      const requestData = JSON.stringify(request) + '\n';
      
      this.singleServerConnection.write(requestData);
      
      const responseHandler = (data: Buffer) => {
        try {
          const response = JSON.parse(data.toString());
          clearTimeout(timeoutId);
          this.singleServerConnection.removeListener('data', responseHandler);
          
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response);
          }
        } catch (error) {
          reject(new Error('Invalid MCP response format'));
        }
      };

      this.singleServerConnection.on('data', responseHandler);
    });
  }

  private async performSingleServerHealthCheck(): Promise<boolean> {
    try {
      if (!this.singleServerConnection) return false;
      
      const pingRequest = {
        method: 'ping',
        params: {},
        id: 'health_check'
      };

      const response = await this.sendSingleServerRequest(pingRequest, 5000);
      return response.result === 'pong';
      
    } catch (error) {
      return false;
    }
  }

  private calculateRequestPriority(request: RAGRequest): number {
    let priority = 5; // Default priority
    
    // Higher priority for shorter queries (likely more targeted)
    if (request.query.length < 100) priority += 2;
    
    // Higher priority for requests with specific thresholds
    if (request.threshold && request.threshold > 0.8) priority += 1;
    
    // Higher priority for requests with fewer results needed
    if (request.maxResults && request.maxResults <= 3) priority += 1;
    
    // Lower priority for very long queries or high result counts
    if (request.query.length > 500) priority -= 1;
    if (request.maxResults && request.maxResults > 10) priority -= 1;
    
    return Math.max(0, Math.min(10, priority));
  }

  private recordQueryAnalytics(
    request: RAGRequest, 
    response: RAGResponse | null, 
    duration: number, 
    success: boolean, 
    error?: Error
  ): void {
    this.analytics.recordMetric({
      timestamp: Date.now(),
      metricType: 'latency',
      value: duration,
      metadata: {
        queryLength: request.query.length,
        resultCount: response?.results.length || 0,
        success,
        error: error?.message,
        multiplexing: !!this.multiplexer
      }
    });
    
    if (success && response) {
      this.analytics.recordMetric({
        timestamp: Date.now(),
        metricType: 'quality',
        value: response.results.length > 0 ? 1 : 0,
        metadata: {
          resultCount: response.results.length
        }
      });
    }
  }
}