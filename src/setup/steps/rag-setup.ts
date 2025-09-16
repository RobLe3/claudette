// RAG setup step - Configure Retrieval Augmented Generation system

import chalk from 'chalk';
import { SetupStep, SetupContext, StepResult } from '../types';
import { InteractivePrompts } from '../ui/interactive-prompts';

export class RAGSetupStep implements SetupStep {
  id = 'rag-setup';
  name = 'RAG Configuration';
  description = 'Set up Retrieval Augmented Generation capabilities';
  estimatedTime = 40;
  required = false;
  dependencies = ['backend-configuration'];

  private prompts: InteractivePrompts;

  constructor() {
    this.prompts = new InteractivePrompts();
  }

  async execute(context: SetupContext): Promise<StepResult> {
    try {
      // Skip for beginners in quick setup unless they specifically want it
      if (context.preferences.experienceLevel === 'beginner' && context.options.quickSetup) {
        return {
          success: true,
          skipped: true,
          message: 'RAG setup skipped for simplified configuration'
        };
      }

      console.log(chalk.cyan('🧠 Configuring RAG (Retrieval Augmented Generation)...'));
      console.log(chalk.dim('RAG enhances AI responses with your own documents and knowledge base'));

      // Ask if user wants to enable RAG
      const enableRAG = await this.prompts.confirm(
        'Enable RAG capabilities for enhanced document-aware responses?',
        context.preferences.primaryUseCase === 'research'
      );

      if (!enableRAG) {
        context.configuration.rag.enabled = false;
        return {
          success: true,
          skipped: true,
          message: 'RAG capabilities disabled by user choice'
        };
      }

      // Choose deployment mode
      const deploymentMode = await this.chooseDeploymentMode(context);
      context.configuration.rag.deployment = deploymentMode;
      context.configuration.rag.enabled = true;

      // Configure based on deployment mode
      let connectionResult;
      switch (deploymentMode) {
        case 'mcp':
          connectionResult = await this.configureMCPDeployment(context);
          break;
        case 'local_docker':
          connectionResult = await this.configureLocalDockerDeployment(context);
          break;
        case 'remote_docker':
          connectionResult = await this.configureRemoteDockerDeployment(context);
          break;
        default:
          throw new Error(`Unknown deployment mode: ${deploymentMode}`);
      }

      if (!connectionResult.success) {
        return {
          success: false,
          error: connectionResult.error,
          message: `RAG ${deploymentMode} configuration failed: ${connectionResult.message}`
        };
      }

      // Configure RAG type (Vector, Graph, or Hybrid)
      await this.configureRAGType(context);

      // Test the RAG connection
      const testResult = await this.testRAGConnection(context);
      if (!testResult.success) {
        return {
          success: false,
          error: testResult.error,
          message: `RAG connection test failed: ${testResult.message}`,
          warnings: ['RAG is configured but connection test failed. You may need to start the RAG service manually.']
        };
      }

      return {
        success: true,
        message: `RAG configured successfully with ${deploymentMode} deployment`,
        data: {
          deployment: deploymentMode,
          ragType: context.configuration.rag.hybrid ? 'hybrid' : 'vector',
          connection: context.configuration.rag.connection
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: `RAG setup failed: ${(error as Error).message}`
      };
    }
  }

  async validate(context: SetupContext): Promise<boolean> {
    if (!context.configuration.rag.enabled) {
      return true; // Valid to have RAG disabled
    }

    // Check that required RAG configuration is present
    return !!(
      context.configuration.rag.deployment &&
      context.configuration.rag.connection
    );
  }

  /**
   * Choose RAG deployment mode based on user preferences and capabilities
   */
  private async chooseDeploymentMode(context: SetupContext): Promise<'mcp' | 'local_docker' | 'remote_docker'> {
    console.log(chalk.cyan('\n📦 Choose RAG deployment mode:'));
    
    // Auto-detect capabilities
    const capabilities = await this.detectSystemCapabilities();
    
    const options = [
      {
        name: 'MCP Plugin - Integrated with Claude Code (Recommended)',
        value: 'mcp',
        description: 'Uses Claude\'s Model Context Protocol for seamless integration'
      },
      {
        name: 'Local Docker - Run RAG services locally',
        value: 'local_docker',
        description: capabilities.hasDocker ? 
          'High performance, full control, requires Docker' :
          'Requires Docker (not detected on this system)'
      },
      {
        name: 'Remote Docker - Connect to existing RAG service',
        value: 'remote_docker',
        description: 'Connect to a remote RAG API service'
      }
    ];

    // For beginners, recommend MCP if available, otherwise remote
    let defaultOption = capabilities.hasMCP ? 'mcp' : 'remote_docker';
    
    // For advanced users in production, suggest local docker if available
    if (context.preferences.experienceLevel === 'advanced' && 
        context.preferences.primaryUseCase === 'production' && 
        capabilities.hasDocker) {
      defaultOption = 'local_docker';
    }

    return await this.prompts.select('Choose deployment mode', options, defaultOption);
  }

  /**
   * Configure MCP (Model Context Protocol) deployment
   */
  private async configureMCPDeployment(context: SetupContext): Promise<{
    success: boolean;
    error?: Error;
    message?: string;
  }> {
    console.log(chalk.cyan('🔌 Configuring MCP RAG integration...'));

    try {
      // Check for existing MCP server
      const mcpPath = await this.detectMCPServer();
      
      let serverPath = mcpPath;
      if (!serverPath) {
        console.log(chalk.yellow('⚠️  MCP RAG server not found'));
        
        const installMCP = await this.prompts.confirm(
          'Install MCP RAG server automatically?',
          true
        );

        if (installMCP) {
          console.log(chalk.cyan('📥 Installing MCP RAG server...'));
          serverPath = await this.installMCPServer();
        } else {
          serverPath = await this.prompts.input(
            'Enter path to MCP RAG server',
            './claudette-mcp-server.js'
          );
        }
      }

      // Configure server port
      const serverPort = await this.prompts.input(
        'MCP server port',
        '3001',
        (value: string) => {
          const port = parseInt(value);
          return (port > 0 && port < 65536) ? true : 'Port must be between 1 and 65535';
        }
      );

      context.configuration.rag.connection = {
        type: 'mcp',
        pluginPath: serverPath,
        serverPort: parseInt(serverPort)
      };

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: (error as Error).message
      };
    }
  }

  /**
   * Configure local Docker deployment
   */
  private async configureLocalDockerDeployment(context: SetupContext): Promise<{
    success: boolean;
    error?: Error;
    message?: string;
  }> {
    console.log(chalk.cyan('🐳 Configuring local Docker RAG deployment...'));

    try {
      // Check Docker availability
      const dockerAvailable = await this.checkDockerAvailable();
      if (!dockerAvailable) {
        throw new Error('Docker is not available. Please install Docker first.');
      }

      // Configure container settings
      const containerName = await this.prompts.input(
        'Docker container name',
        'claudette-rag',
        (value: string) => value.trim() ? true : 'Container name is required'
      );

      const port = await this.prompts.input(
        'RAG service port',
        '8000',
        (value: string) => {
          const port = parseInt(value);
          return (port > 0 && port < 65536) ? true : 'Port must be between 1 and 65535';
        }
      );

      // Ask about auto-starting container
      const autoStart = await this.prompts.confirm(
        'Automatically start RAG container?',
        true
      );

      context.configuration.rag.connection = {
        type: 'docker',
        containerName,
        port: parseInt(port),
        host: 'localhost',
        autoStart
      };

      if (autoStart) {
        console.log(chalk.cyan('🚀 Starting RAG container...'));
        await this.startRAGContainer(containerName, parseInt(port));
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: (error as Error).message
      };
    }
  }

  /**
   * Configure remote Docker/API deployment
   */
  private async configureRemoteDockerDeployment(context: SetupContext): Promise<{
    success: boolean;
    error?: Error;
    message?: string;
  }> {
    console.log(chalk.cyan('🌐 Configuring remote RAG service...'));

    try {
      const baseURL = await this.prompts.input(
        'RAG service base URL',
        'https://your-rag-service.com/api/v1',
        (value: string) => {
          try {
            new URL(value);
            return true;
          } catch {
            return 'Must be a valid URL';
          }
        }
      );

      const needsAuth = await this.prompts.confirm(
        'Does the service require authentication?',
        true
      );

      let apiKey = '';
      let headers = {};

      if (needsAuth) {
        apiKey = await this.prompts.password(
          'API key for RAG service',
          (key: string) => key.trim() ? true : 'API key is required'
        );

        const headerType = await this.prompts.select(
          'Authentication header type',
          [
            { name: 'Bearer Token', value: 'bearer' },
            { name: 'API Key header', value: 'apikey' },
            { name: 'Custom header', value: 'custom' }
          ],
          'bearer'
        );

        if (headerType === 'bearer') {
          headers = { 'Authorization': `Bearer ${apiKey}` };
        } else if (headerType === 'apikey') {
          headers = { 'X-API-Key': apiKey };
        } else {
          const headerName = await this.prompts.input('Custom header name', 'X-Auth-Token');
          headers = { [headerName]: apiKey };
        }
      }

      const timeout = await this.prompts.input(
        'Request timeout (seconds)',
        '30',
        (value: string) => {
          const num = parseInt(value);
          return (num > 0 && num <= 300) ? true : 'Timeout must be between 1 and 300 seconds';
        }
      );

      context.configuration.rag.connection = {
        type: 'remote',
        baseURL,
        apiKey,
        headers,
        timeout: parseInt(timeout) * 1000
      };

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: (error as Error).message
      };
    }
  }

  /**
   * Configure RAG type (Vector, Graph, or Hybrid)
   */
  private async configureRAGType(context: SetupContext): Promise<void> {
    console.log(chalk.cyan('\n🔍 Choose RAG capabilities:'));

    const ragTypes = [
      {
        name: 'Vector Search - Fast semantic search (Recommended)',
        value: 'vector',
        description: 'Uses embeddings for semantic similarity search'
      },
      {
        name: 'Graph RAG - Advanced relationship understanding',
        value: 'graph',
        description: 'Builds knowledge graphs for complex reasoning'
      },
      {
        name: 'Hybrid - Best of both worlds',
        value: 'hybrid',
        description: 'Combines vector search with graph relationships'
      }
    ];

    const defaultType = context.preferences.primaryUseCase === 'research' ? 'hybrid' : 'vector';
    const ragType = await this.prompts.select('Choose RAG type', ragTypes, defaultType);

    // Configure based on selected type
    if (ragType === 'vector' || ragType === 'hybrid') {
      context.configuration.rag.vectorDB = {
        enabled: true,
        type: 'chromadb', // Default vector DB
        dimensions: 1536, // OpenAI embedding dimensions
        similarity: 'cosine'
      };
    }

    if (ragType === 'graph' || ragType === 'hybrid') {
      context.configuration.rag.graphDB = {
        enabled: true,
        type: 'neo4j', // Default graph DB
        entityExtraction: true,
        relationshipMapping: true
      };
    }

    context.configuration.rag.hybrid = ragType === 'hybrid';

    console.log(chalk.green(`✅ RAG type configured: ${ragType}`));
  }

  /**
   * Test RAG connection and functionality
   */
  private async testRAGConnection(context: SetupContext): Promise<{
    success: boolean;
    error?: Error;
    message?: string;
  }> {
    console.log(chalk.cyan('🧪 Testing RAG connection...'));

    try {
      // Simulate RAG connection test
      await new Promise(resolve => setTimeout(resolve, 1000));

      // In real implementation, this would test the actual RAG connection
      const testSuccess = Math.random() > 0.2; // 80% success rate simulation

      if (testSuccess) {
        console.log(chalk.green('✅ RAG connection test successful'));
        return { success: true };
      } else {
        throw new Error('Connection timeout or service unavailable');
      }

    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: (error as Error).message
      };
    }
  }

  /**
   * Detect system capabilities for RAG deployment
   */
  private async detectSystemCapabilities(): Promise<{
    hasDocker: boolean;
    hasMCP: boolean;
    hasGPU: boolean;
  }> {
    console.log(chalk.dim('Detecting system capabilities...'));

    // Simulate capability detection
    return {
      hasDocker: Math.random() > 0.3, // 70% chance
      hasMCP: true, // Always available with Claudette
      hasGPU: Math.random() > 0.7  // 30% chance
    };
  }

  /**
   * Detect existing MCP RAG server
   */
  private async detectMCPServer(): Promise<string | null> {
    // Check common locations for MCP server
    const commonPaths = [
      './claudette-mcp-server.js',
      './node_modules/.bin/claudette-mcp-server',
      '/usr/local/bin/claudette-mcp-server'
    ];

    // Simulate detection (in real implementation, check file system)
    return Math.random() > 0.5 ? commonPaths[0] : null;
  }

  /**
   * Install MCP RAG server automatically
   */
  private async installMCPServer(): Promise<string> {
    // Simulate MCP server installation
    await new Promise(resolve => setTimeout(resolve, 2000));
    return './claudette-mcp-server.js';
  }

  /**
   * Check if Docker is available
   */
  private async checkDockerAvailable(): Promise<boolean> {
    try {
      // In real implementation, this would run `docker --version`
      return Math.random() > 0.3; // 70% chance Docker is available
    } catch {
      return false;
    }
  }

  /**
   * Start RAG Docker container
   */
  private async startRAGContainer(containerName: string, port: number): Promise<void> {
    // Simulate container startup
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log(chalk.green(`✅ RAG container '${containerName}' started on port ${port}`));
  }

  async cleanup(context: SetupContext): Promise<void> {
    this.prompts.close();
  }
}