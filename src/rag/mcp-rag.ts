// MCP (Model Context Protocol) RAG Provider
// For local MCP plugins and server communication

import { BaseRAGProvider } from './base-rag';
import { 
  RAGRequest, 
  RAGResponse, 
  RAGConfig, 
  MCPConnection 
} from './types';

export class MCPRAGProvider extends BaseRAGProvider {
  private mcpConnection: MCPConnection;
  private serverProcess?: any;
  private clientSocket?: any;

  constructor(config: RAGConfig) {
    super(config);
    
    if (config.connection.type !== 'mcp') {
      throw this.createError('Invalid connection type for MCP provider', 'INVALID_CONFIG');
    }
    
    this.mcpConnection = config.connection as MCPConnection;
    this.validateConfig();
  }

  validateConfig(): boolean {
    super.validateConfig();
    
    if (!this.mcpConnection.pluginPath) {
      throw this.createError('MCP plugin path is required', 'INVALID_CONFIG');
    }
    
    return true;
  }

  async connect(): Promise<void> {
    console.log(`🔌 Connecting to MCP RAG plugin: ${this.mcpConnection.pluginPath}`);
    
    try {
      // Import Node.js modules for MCP communication
      const { spawn } = await import('child_process');
      const net = await import('net');
      
      // Start MCP server process
      this.serverProcess = spawn('node', [this.mcpConnection.pluginPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, MCP_RAG_MODE: 'server' }
      });

      // Wait for server to be ready
      await this.waitForServer();
      
      // Connect to MCP server
      await this.connectToMCPServer();
      
      console.log('✅ MCP RAG provider connected successfully');
      this.isHealthy = true;
      
    } catch (error: any) {
      console.error('❌ MCP RAG connection failed:', error);
      throw this.createError(
        `Failed to connect to MCP RAG: ${error.message}`,
        'CONNECTION_FAILED',
        true
      );
    }
  }

  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting MCP RAG provider');
    
    try {
      // Close client connection
      if (this.clientSocket) {
        this.clientSocket.end();
        this.clientSocket = null;
      }
      
      // Terminate server process
      if (this.serverProcess) {
        this.serverProcess.kill('SIGTERM');
        this.serverProcess = null;
      }
      
      this.isHealthy = false;
      console.log('✅ MCP RAG provider disconnected');
      
    } catch (error: any) {
      console.warn('⚠️ Error during MCP disconnect:', error);
    }
  }

  async query(request: RAGRequest): Promise<RAGResponse> {
    if (!this.isHealthy) {
      throw this.createError('MCP RAG provider is not connected', 'CONNECTION_FAILED', true);
    }

    const queryId = this.generateQueryId();
    console.log(`🔍 MCP RAG query ${queryId}: "${request.query}"`);

    try {
      const { result, duration } = await this.measureTime(async () => {
        // Send MCP request
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

        return await this.sendMCPRequest(mcpRequest);
      });

      console.log(`✅ MCP RAG query completed in ${duration}ms`);
      
      return {
        results: result.results || [],
        metadata: {
          totalResults: result.results?.length || 0,
          processingTime: duration,
          source: result.source || 'vector',
          queryId
        }
      };

    } catch (error: any) {
      console.error(`❌ MCP RAG query failed: ${error.message}`);
      throw this.createError(
        `MCP RAG query failed: ${error.message}`,
        'RAG_SERVICE_ERROR',
        true
      );
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.serverProcess || !this.clientSocket) {
        return false;
      }

      // Send ping to MCP server
      const pingRequest = {
        method: 'ping',
        params: {},
        id: 'health_check'
      };

      const response = await this.sendMCPRequest(pingRequest, 5000);
      return response.result === 'pong';

    } catch (error: any) {
      console.warn(`⚠️ MCP health check failed: ${error.message}`);
      return false;
    }
  }

  private async waitForServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use standard MCP startup timeout (15 seconds)
      const timeout = setTimeout(() => {
        reject(new Error('MCP server startup timeout after 15 seconds'));
      }, 15000);

      let serverReady = false;
      let startupTime = Date.now();

      if (this.serverProcess) {
        this.serverProcess.stdout.on('data', (data: Buffer) => {
          const output = data.toString();
          console.log(`[MCP] Server output: ${output.trim()}`);
          
          // More flexible startup detection
          if (output.includes('MCP_RAG_READY') || 
              output.includes('Server listening') || 
              output.includes('MCP server started') ||
              output.includes('ready')) {
            if (!serverReady) {
              serverReady = true;
              const elapsed = Date.now() - startupTime;
              console.log(`[MCP] Server ready after ${elapsed}ms`);
              clearTimeout(timeout);
              resolve();
            }
          }
        });

        this.serverProcess.stderr.on('data', (data: Buffer) => {
          const errorOutput = data.toString();
          console.error(`[MCP] Server error: ${errorOutput.trim()}`);
          
          // Don't fail immediately on stderr output, some servers log warnings
          if (errorOutput.includes('Error:') || errorOutput.includes('FATAL')) {
            clearTimeout(timeout);
            reject(new Error(`MCP server startup failed: ${errorOutput}`));
          }
        });

        this.serverProcess.on('error', (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        });

        this.serverProcess.on('exit', (code: number | null) => {
          if (!serverReady) {
            clearTimeout(timeout);
            reject(new Error(`MCP server exited early with code ${code}`));
          }
        });

        // Give the process a moment to start before timing out
        setTimeout(() => {
          if (!serverReady) {
            console.log('[MCP] Server taking longer than expected to start...');
          }
        }, 5000);
      }
    });
  }

  private async connectToMCPServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const net = require('net');
      const port = this.mcpConnection.serverPort || 3000;
      
      this.clientSocket = net.createConnection(port, 'localhost', () => {
        console.log(`🔗 Connected to MCP server on port ${port}`);
        resolve();
      });

      this.clientSocket.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  private async sendMCPRequest(request: any, timeout: number = 30000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('MCP request timeout'));
      }, timeout);

      const requestData = JSON.stringify(request) + '\n';
      
      this.clientSocket.write(requestData);
      
      const responseHandler = (data: Buffer) => {
        try {
          const response = JSON.parse(data.toString());
          clearTimeout(timeoutId);
          this.clientSocket.removeListener('data', responseHandler);
          
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response);
          }
        } catch (error) {
          reject(new Error('Invalid MCP response format'));
        }
      };

      this.clientSocket.on('data', responseHandler);
    });
  }
}