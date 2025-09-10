// Docker RAG Provider
// For local and remote Docker container communication

import { BaseRAGProvider } from './base-rag';
import { 
  RAGRequest, 
  RAGResponse, 
  RAGConfig, 
  DockerConnection,
  RemoteConnection 
} from './types';

export class DockerRAGProvider extends BaseRAGProvider {
  private connection: DockerConnection | RemoteConnection;
  private baseURL!: string;
  private headers!: Record<string, string>;

  constructor(config: RAGConfig) {
    super(config);
    
    if (config.connection.type !== 'docker' && config.connection.type !== 'remote') {
      throw this.createError('Invalid connection type for Docker provider', 'INVALID_CONFIG');
    }
    
    this.connection = config.connection as DockerConnection | RemoteConnection;
    this.setupConnection();
    this.validateConfig();
  }

  private setupConnection(): void {
    if (this.connection.type === 'docker') {
      const dockerConn = this.connection as DockerConnection;
      const host = dockerConn.host || 'localhost';
      this.baseURL = `http://${host}:${dockerConn.port}`;
      this.headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Claudette-RAG/3.0.0'
      };
    } else {
      const remoteConn = this.connection as RemoteConnection;
      this.baseURL = remoteConn.baseURL;
      this.headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Claudette-RAG/3.0.0',
        ...remoteConn.headers
      };
      
      if (remoteConn.apiKey) {
        this.headers['Authorization'] = `Bearer ${remoteConn.apiKey}`;
      }
    }
  }

  validateConfig(): boolean {
    super.validateConfig();
    
    if (this.connection.type === 'docker') {
      const dockerConn = this.connection as DockerConnection;
      if (!dockerConn.containerName || !dockerConn.port) {
        throw this.createError('Docker container name and port are required', 'INVALID_CONFIG');
      }
    } else {
      const remoteConn = this.connection as RemoteConnection;
      if (!remoteConn.baseURL) {
        throw this.createError('Remote base URL is required', 'INVALID_CONFIG');
      }
    }
    
    return true;
  }

  async connect(): Promise<void> {
    const connType = this.connection.type === 'docker' ? 'Local Docker' : 'Remote Docker';
    console.log(`🐳 Connecting to ${connType} RAG service: ${this.baseURL}`);
    
    try {
      // For local Docker, optionally check if container is running
      if (this.connection.type === 'docker') {
        await this.ensureDockerContainer();
      }
      
      // Test connection with health check
      const isHealthy = await this.healthCheck();
      if (!isHealthy) {
        throw new Error('Health check failed');
      }
      
      console.log(`✅ ${connType} RAG provider connected successfully`);
      this.isHealthy = true;
      
    } catch (error: any) {
      console.error(`❌ ${connType} RAG connection failed:`, error);
      throw this.createError(
        `Failed to connect to ${connType} RAG: ${error.message}`,
        'CONNECTION_FAILED',
        true
      );
    }
  }

  async disconnect(): Promise<void> {
    console.log('🐳 Disconnecting Docker RAG provider');
    this.isHealthy = false;
    console.log('✅ Docker RAG provider disconnected');
  }

  async query(request: RAGRequest): Promise<RAGResponse> {
    if (!this.isHealthy) {
      throw this.createError('Docker RAG provider is not connected', 'CONNECTION_FAILED', true);
    }

    const queryId = this.generateQueryId();
    console.log(`🔍 Docker RAG query ${queryId}: "${request.query}"`);

    try {
      const { result, duration } = await this.measureTime(async () => {
        const requestBody = {
          query: request.query,
          context: request.context,
          maxResults: request.maxResults || 5,
          threshold: request.threshold || 0.7,
          metadata: request.metadata,
          config: {
            vectorDB: this.config.vectorDB,
            graphDB: this.config.graphDB,
            hybrid: this.config.hybrid
          }
        };

        const response = await this.makeRequest('/api/rag/query', 'POST', requestBody);
        return await response.json();
      });

      console.log(`✅ Docker RAG query completed in ${duration}ms`);
      
      // Type cast the result to avoid TypeScript errors
      const typedResult = result as any;
      
      return {
        results: typedResult.results || [],
        metadata: {
          totalResults: typedResult.totalResults || typedResult.results?.length || 0,
          processingTime: duration,
          source: typedResult.source || 'vector',
          queryId
        }
      };

    } catch (error: any) {
      console.error(`❌ Docker RAG query failed: ${error.message}`);
      throw this.createError(
        `Docker RAG query failed: ${error.message}`,
        'RAG_SERVICE_ERROR',
        true
      );
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const endpoint = this.connection.type === 'docker' 
        ? (this.connection as DockerConnection).healthCheck || '/health'
        : '/health';
        
      const response = await this.makeRequest(endpoint, 'GET', undefined, 5000);
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json() as any;
      return data.status === 'healthy' || data.status === 'ok';

    } catch (error: any) {
      console.warn(`⚠️ Docker health check failed: ${error.message}`);
      return false;
    }
  }

  private async ensureDockerContainer(): Promise<void> {
    try {
      // Import child_process to check Docker container status
      const { exec } = await import('child_process');
      const dockerConn = this.connection as DockerConnection;
      
      // Sanitize container name to prevent command injection
      const containerName = this.sanitizeContainerName(dockerConn.containerName);
      if (!containerName) {
        throw new Error('Invalid container name provided');
      }
      
      return new Promise((resolve, reject) => {
        // Use safer command construction with proper escaping
        const command = `docker ps --filter name=${containerName} --format "{{.Status}}"`;
        
        exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(`Docker command failed: ${error.message}`));
            return;
          }
          
          if (stderr) {
            console.warn(`⚠️ Docker command stderr: ${stderr}`);
          }
          
          if (!stdout.trim()) {
            reject(new Error(`Docker container ${containerName} is not running`));
            return;
          }
          
          console.log(`🐳 Docker container ${containerName} is running`);
          resolve();
        });
      });
      
    } catch (error: any) {
      // If Docker command fails, we'll still try to connect
      console.warn(`⚠️ Could not verify Docker container status: ${error.message}`);
    }
  }

  /**
   * Sanitize container name to prevent command injection
   */
  private sanitizeContainerName(containerName: string): string | null {
    if (!containerName || typeof containerName !== 'string') {
      return null;
    }
    
    // Remove any characters that could be used for command injection
    // Allow only alphanumeric characters, hyphens, underscores, and dots
    const sanitized = containerName.replace(/[^a-zA-Z0-9\-_.]/g, '');
    
    // Validate length and basic format
    if (sanitized.length === 0 || sanitized.length > 255) {
      return null;
    }
    
    // Ensure it doesn't start with special characters
    if (!/^[a-zA-Z0-9]/.test(sanitized)) {
      return null;
    }
    
    return sanitized;
  }

  private async makeRequest(
    endpoint: string, 
    method: string = 'GET', 
    body?: any, 
    timeout?: number
  ): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`;
    const requestTimeout = timeout || 
      (this.connection.type === 'remote' ? 
        (this.connection as RemoteConnection).timeout : 
        30000) || 30000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), requestTimeout);

    try {
      const options: RequestInit = {
        method,
        headers: this.headers,
        signal: controller.signal
      };

      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;

    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${requestTimeout}ms`);
      }
      
      throw error;
    }
  }

  /**
   * Get Docker-specific status information
   */
  getDockerStatus(): {
    containerName?: string;
    endpoint: string;
    type: 'local' | 'remote';
    healthy: boolean;
  } {
    return {
      containerName: this.connection.type === 'docker' ? 
        (this.connection as DockerConnection).containerName : undefined,
      endpoint: this.baseURL,
      type: this.connection.type === 'docker' ? 'local' : 'remote',
      healthy: this.isHealthy
    };
  }
}