// RAG Manager - Central coordination for all RAG providers

import { BaseRAGProvider } from './base-rag';
import { MCPRAGProvider } from './mcp-rag';
import { DockerRAGProvider } from './docker-rag';
import { 
  RAGRequest, 
  RAGResponse, 
  RAGConfig,
  ClaudetteRAGRequest,
  ClaudetteRAGResponse,
  RAGError 
} from './types';

export class RAGManager {
  private providers: Map<string, BaseRAGProvider> = new Map();
  private defaultProvider?: string;
  private fallbackChain: string[] = [];

  constructor() {
    console.log('🧠 Initializing RAG Manager');
  }

  /**
   * Register a RAG provider
   */
  async registerProvider(name: string, config: RAGConfig): Promise<void> {
    console.log(`📝 Registering RAG provider: ${name} (${config.deployment})`);
    
    try {
      let provider: BaseRAGProvider;
      
      switch (config.deployment) {
        case 'mcp':
          provider = new MCPRAGProvider(config);
          break;
        case 'local_docker':
        case 'remote_docker':
          provider = new DockerRAGProvider(config);
          break;
        default:
          throw new Error(`Unsupported deployment type: ${config.deployment}`);
      }
      
      await provider.connect();
      this.providers.set(name, provider);
      
      // Set as default if first provider
      if (!this.defaultProvider) {
        this.defaultProvider = name;
        console.log(`🎯 Set ${name} as default RAG provider`);
      }
      
      console.log(`✅ RAG provider ${name} registered successfully`);
      
    } catch (error: any) {
      console.error(`❌ Failed to register RAG provider ${name}:`, error);
      throw error;
    }
  }

  /**
   * Unregister a RAG provider
   */
  async unregisterProvider(name: string): Promise<void> {
    const provider = this.providers.get(name);
    if (!provider) {
      console.warn(`⚠️ RAG provider ${name} not found`);
      return;
    }
    
    console.log(`🗑️ Unregistering RAG provider: ${name}`);
    
    try {
      await provider.disconnect();
      this.providers.delete(name);
      
      // Update default if this was the default
      if (this.defaultProvider === name) {
        this.defaultProvider = this.providers.size > 0 ? 
          Array.from(this.providers.keys())[0] : undefined;
        
        if (this.defaultProvider) {
          console.log(`🎯 Changed default RAG provider to: ${this.defaultProvider}`);
        }
      }
      
      // Remove from fallback chain
      this.fallbackChain = this.fallbackChain.filter(p => p !== name);
      
      console.log(`✅ RAG provider ${name} unregistered successfully`);
      
    } catch (error: any) {
      console.error(`❌ Error unregistering RAG provider ${name}:`, error);
    }
  }

  /**
   * Set the default RAG provider
   */
  setDefaultProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`RAG provider ${name} not found`);
    }
    
    this.defaultProvider = name;
    console.log(`🎯 Set ${name} as default RAG provider`);
  }

  /**
   * Configure fallback chain for provider failures
   */
  setFallbackChain(chain: string[]): void {
    // Validate all providers exist
    for (const name of chain) {
      if (!this.providers.has(name)) {
        throw new Error(`RAG provider ${name} not found in fallback chain`);
      }
    }
    
    this.fallbackChain = [...chain];
    console.log(`🔄 Configured RAG fallback chain: ${chain.join(' → ')}`);
  }

  /**
   * Query using the specified or default provider with fallback
   */
  async query(request: RAGRequest, providerName?: string): Promise<RAGResponse> {
    const targetProvider = providerName || this.defaultProvider;
    
    if (!targetProvider) {
      throw new Error('No RAG providers available');
    }
    
    console.log(`🔍 RAG query using provider: ${targetProvider}`);
    
    // Try primary provider
    try {
      const provider = this.providers.get(targetProvider);
      if (!provider) {
        throw new Error(`RAG provider ${targetProvider} not found`);
      }
      
      await provider.ensureHealthy();
      return await provider.query(request);
      
    } catch (error: any) {
      console.warn(`⚠️ RAG provider ${targetProvider} failed:`, error.message);
      
      // Try fallback chain if available
      for (const fallbackName of this.fallbackChain) {
        if (fallbackName === targetProvider) continue; // Skip failed provider
        
        try {
          console.log(`🔄 Trying RAG fallback provider: ${fallbackName}`);
          const fallbackProvider = this.providers.get(fallbackName);
          
          if (fallbackProvider && await fallbackProvider.ensureHealthy()) {
            return await fallbackProvider.query(request);
          }
          
        } catch (fallbackError: any) {
          console.warn(`⚠️ RAG fallback ${fallbackName} failed:`, fallbackError.message);
        }
      }
      
      // All providers failed
      throw new RAGError(
        `All RAG providers failed. Last error: ${error.message}`,
        'RAG_SERVICE_ERROR',
        'all_providers',
        false
      );
    }
  }

  /**
   * Enhanced Claudette request with RAG integration
   */
  async enhanceWithRAG(request: ClaudetteRAGRequest): Promise<ClaudetteRAGResponse> {
    if (!request.useRAG || !request.ragQuery) {
      // Return original request without RAG enhancement
      return {
        content: request.prompt,
        ragContext: [],
        ragMetadata: {
          contextUsed: false,
          resultsCount: 0,
          processingTime: 0,
          strategy: 'none'
        }
      };
    }
    
    const startTime = Date.now();
    console.log(`🧠 Enhancing Claudette request with RAG: "${request.ragQuery}"`);
    
    try {
      // Perform RAG query
      const ragRequest: RAGRequest = {
        query: request.ragQuery,
        context: request.prompt,
        maxResults: 5,
        threshold: 0.7
      };
      
      const ragResponse = await this.query(ragRequest);
      const processingTime = Date.now() - startTime;
      
      // Enhance prompt with RAG context
      const enhancedPrompt = this.applyContextStrategy(
        request.prompt,
        ragResponse.results,
        request.contextStrategy || 'prepend'
      );
      
      console.log(`✅ RAG enhancement completed in ${processingTime}ms with ${ragResponse.results.length} results`);
      
      return {
        content: enhancedPrompt,
        ragContext: ragResponse.results,
        ragMetadata: {
          contextUsed: true,
          resultsCount: ragResponse.results.length,
          processingTime,
          strategy: request.contextStrategy || 'prepend'
        }
      };
      
    } catch (error: any) {
      console.error(`❌ RAG enhancement failed: ${error.message}`);
      
      // Fallback to original prompt
      return {
        content: request.prompt,
        ragContext: [],
        ragMetadata: {
          contextUsed: false,
          resultsCount: 0,
          processingTime: Date.now() - startTime,
          strategy: 'failed'
        }
      };
    }
  }

  /**
   * Apply context strategy to combine prompt with RAG results
   */
  private applyContextStrategy(
    originalPrompt: string,
    ragResults: any[],
    strategy: 'prepend' | 'append' | 'inject'
  ): string {
    if (ragResults.length === 0) {
      return originalPrompt;
    }
    
    const contextText = ragResults
      .map((result, index) => `[Context ${index + 1}]: ${result.content}`)
      .join('\n\n');
    
    switch (strategy) {
      case 'prepend':
        return `Based on the following context:\n\n${contextText}\n\n${originalPrompt}`;
      
      case 'append':
        return `${originalPrompt}\n\nRelevant context:\n\n${contextText}`;
      
      case 'inject':
        // Simple injection - could be more sophisticated
        return originalPrompt.replace(
          /\{context\}/g,
          `\n\n[Retrieved Context]:\n${contextText}\n\n`
        );
      
      default:
        return originalPrompt;
    }
  }

  /**
   * Get status of all RAG providers
   */
  getProvidersStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    for (const [name, provider] of this.providers) {
      status[name] = {
        ...provider.getStatus(),
        isDefault: name === this.defaultProvider,
        inFallbackChain: this.fallbackChain.includes(name)
      };
    }
    
    return status;
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Health check all providers
   */
  async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    const healthChecks = Array.from(this.providers.entries()).map(async ([name, provider]) => {
      try {
        results[name] = await provider.healthCheck();
      } catch (error) {
        results[name] = false;
      }
    });
    
    await Promise.all(healthChecks);
    return results;
  }

  /**
   * Cleanup - disconnect all providers
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up RAG Manager');
    
    const disconnectPromises = Array.from(this.providers.values()).map(provider => 
      provider.disconnect().catch(error => 
        console.warn('Warning during provider cleanup:', error)
      )
    );
    
    await Promise.all(disconnectPromises);
    this.providers.clear();
    this.defaultProvider = undefined;
    this.fallbackChain = [];
    
    console.log('✅ RAG Manager cleanup completed');
  }
}