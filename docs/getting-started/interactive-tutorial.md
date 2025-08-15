# Interactive Getting Started Tutorial

> **Learn Claudette by Building: 30-Minute Hands-On Tutorial**
>
> This interactive tutorial walks you through setting up and using Claudette's core features with working code examples you can run immediately.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Setup](#quick-setup)
- [Tutorial Path](#tutorial-path)
- [Step 1: First Optimization](#step-1-first-optimization)
- [Step 2: Backend Configuration](#step-2-backend-configuration)
- [Step 3: RAG Integration](#step-3-rag-integration)
- [Step 4: Production Setup](#step-4-production-setup)
- [What's Next](#whats-next)

---

## Prerequisites

Before starting this tutorial, ensure you have:

- **Node.js 18+**: `node --version` should show 18.0.0 or higher
- **npm**: Latest version recommended
- **API Keys**: At least one AI provider API key
- **Terminal**: Command line access
- **Code Editor**: VS Code recommended

### ⚡ Quick Environment Check

Run this command to verify your setup:

```bash
# Check all prerequisites
node --version && npm --version && echo "✅ Environment ready!"
```

---

## Quick Setup

### Option 1: Automated Setup (Recommended)

```bash
# Download and run the setup script
curl -sSL https://raw.githubusercontent.com/user/claudette/main/scripts/quick-setup.sh | bash
```

### Option 2: Manual Setup

```bash
# Create project directory
mkdir claudette-tutorial && cd claudette-tutorial

# Install Claudette
npm init -y
npm install claudette

# Create basic project structure
mkdir src examples
```

### 🔑 API Key Setup

Choose your preferred AI provider and set up credentials:

```bash
# Option 1: Environment variables (recommended for development)
export OPENAI_API_KEY="your-openai-key"
export ANTHROPIC_API_KEY="your-claude-key"

# Option 2: Secure keychain storage (recommended for production)
./setup-api-keys.sh

# Option 3: Configuration file
echo '{
  "openai_api_key": "your-key",
  "anthropic_api_key": "your-key"
}' > claudette.config.json
```

---

## Tutorial Path

This tutorial follows a progressive learning path:

```
🚀 Basic Usage (5 min)
   ↓
⚙️ Backend Configuration (10 min) 
   ↓
🧠 RAG Integration (10 min)
   ↓
🔧 Production Setup (5 min)
```

Each step builds on the previous one with working code examples.

---

## Step 1: First Optimization

**Goal**: Make your first AI request through Claudette
**Time**: 5 minutes

### 1.1 Create Your First Script

Create `src/hello-claudette.js`:

```javascript
// src/hello-claudette.js
import { Claudette } from 'claudette';

async function main() {
  console.log('🚀 Starting Claudette tutorial...');
  
  try {
    // Initialize Claudette
    const claudette = new Claudette();
    await claudette.initialize();
    
    console.log('✅ Claudette initialized successfully!');
    
    // Make your first optimization request
    const result = await claudette.optimize(
      'Explain what TypeScript interfaces are in 2 sentences'
    );
    
    // Display results
    console.log('\n📝 Response:');
    console.log(result.content);
    
    console.log('\n📊 Metadata:');
    console.log(`Backend used: ${result.backend_used}`);
    console.log(`Cost: €${result.cost_eur.toFixed(6)}`);
    console.log(`Latency: ${result.latency_ms}ms`);
    console.log(`Cache hit: ${result.cache_hit}`);
    
    // Cleanup
    await claudette.cleanup();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('API key')) {
      console.log('\n💡 Solution: Set up your API keys:');
      console.log('   export OPENAI_API_KEY="your-key"');
      console.log('   # or run ./setup-api-keys.sh');
    }
  }
}

main();
```

### 1.2 Run Your First Script

```bash
# Run the script
node src/hello-claudette.js
```

**Expected Output:**
```
🚀 Starting Claudette tutorial...
✅ Claudette initialized successfully!

📝 Response:
TypeScript interfaces define the structure of objects by specifying the types of their properties and methods. They provide compile-time type checking and enable better code documentation and IDE support.

📊 Metadata:
Backend used: openai
Cost: €0.000045
Latency: 1234ms
Cache hit: false
```

### 1.3 Understanding What Happened

1. **Initialization**: Claudette loaded configuration and connected to backends
2. **Routing**: Automatically selected the best backend (likely OpenAI gpt-4o-mini for cost optimization)
3. **Execution**: Sent request and received response
4. **Metrics**: Tracked cost, latency, and caching information

### ✅ Checkpoint 1

If you see output similar to above, you've successfully:
- ✅ Installed Claudette
- ✅ Set up API credentials  
- ✅ Made your first AI request
- ✅ Observed intelligent backend selection

**Troubleshooting:**
- **"API key not found"**: Review the [API Key Setup](#-api-key-setup) section
- **"No backends available"**: Ensure at least one backend is configured
- **Network errors**: Check internet connection and firewall settings

---

## Step 2: Backend Configuration

**Goal**: Configure multiple backends and observe intelligent routing
**Time**: 10 minutes

### 2.1 Create Configuration File

Create `claudette.config.json`:

```json
{
  "backends": {
    "openai": {
      "enabled": true,
      "priority": 1,
      "cost_per_token": 0.000015,
      "model": "gpt-4o-mini",
      "max_tokens": 4000,
      "temperature": 0.7
    },
    "claude": {
      "enabled": true,
      "priority": 2,
      "cost_per_token": 0.0003,
      "model": "claude-3-sonnet-20240229",
      "max_tokens": 4000,
      "temperature": 0.7
    },
    "qwen": {
      "enabled": false,
      "priority": 3,
      "cost_per_token": 0.0001,
      "model": "Qwen2.5-Coder-7B-Instruct-AWQ",
      "backend_type": "self_hosted",
      "base_url": "http://localhost:8000"
    }
  },
  "features": {
    "caching": true,
    "cost_optimization": true,
    "performance_monitoring": true,
    "smart_routing": true,
    "mcp_integration": true
  },
  "thresholds": {
    "cache_ttl": 3600,
    "max_cache_size": 10000,
    "cost_warning": 0.01,
    "max_context_tokens": 32000
  }
}
```

### 2.2 Test Backend Selection

Create `src/backend-comparison.js`:

```javascript
// src/backend-comparison.js
import { Claudette } from 'claudette';

async function compareBackends() {
  const claudette = new Claudette('./claudette.config.json');
  await claudette.initialize();
  
  const testPrompt = 'Write a Python function to calculate fibonacci numbers';
  const backends = ['openai', 'claude'];
  
  console.log('🔀 Testing backend selection...\n');
  
  for (const backend of backends) {
    try {
      console.log(`Testing ${backend}:`);
      
      const result = await claudette.optimize(testPrompt, [], {
        backend: backend,  // Force specific backend
        max_tokens: 500
      });
      
      console.log(`  ✅ Success: ${result.content.substring(0, 100)}...`);
      console.log(`  💰 Cost: €${result.cost_eur.toFixed(6)}`);
      console.log(`  ⏱️  Latency: ${result.latency_ms}ms`);
      console.log(`  🏷️  Model: ${result.metadata?.model || 'unknown'}\n`);
      
    } catch (error) {
      console.log(`  ❌ Failed: ${error.message}\n`);
    }
  }
  
  // Test automatic backend selection
  console.log('🎯 Testing automatic backend selection:');
  
  const autoResult = await claudette.optimize(testPrompt, [], {
    max_tokens: 500
    // No backend specified - let Claudette choose
  });
  
  console.log(`  🔄 Auto-selected: ${autoResult.backend_used}`);
  console.log(`  💰 Cost: €${autoResult.cost_eur.toFixed(6)}`);
  console.log(`  ⏱️  Latency: ${autoResult.latency_ms}ms`);
  
  await claudette.cleanup();
}

compareBackends().catch(console.error);
```

### 2.3 Run Backend Comparison

```bash
node src/backend-comparison.js
```

### 2.4 Observe Routing Behavior

Create `src/routing-analysis.js`:

```javascript
// src/routing-analysis.js
import { Claudette } from 'claudette';

async function analyzeRouting() {
  const claudette = new Claudette();
  await claudette.initialize();
  
  const requests = [
    {
      prompt: 'Simple math: what is 2+2?',
      description: 'Simple task (should prefer cheaper backend)'
    },
    {
      prompt: 'Write a comprehensive analysis of distributed systems architecture patterns',
      description: 'Complex task (may prefer higher-quality backend)',
      options: { max_tokens: 2000 }
    },
    {
      prompt: 'Generate TypeScript interfaces for a user management API',
      description: 'Code generation task',
      options: { temperature: 0.3 }
    }
  ];
  
  console.log('🧠 Analyzing intelligent routing decisions...\n');
  
  for (const [index, request] of requests.entries()) {
    console.log(`Test ${index + 1}: ${request.description}`);
    console.log(`Prompt: "${request.prompt}"`);
    
    const result = await claudette.optimize(
      request.prompt,
      [],
      request.options || {}
    );
    
    console.log(`✅ Selected: ${result.backend_used}`);
    console.log(`💰 Cost: €${result.cost_eur.toFixed(6)}`);
    console.log(`⏱️  Latency: ${result.latency_ms}ms`);
    console.log(`🎯 Cache hit: ${result.cache_hit}\n`);
  }
  
  // Show routing statistics
  const status = await claudette.getStatus();
  console.log('📊 System Status:');
  console.log(`Cache hit rate: ${status.cache.hit_rate.toFixed(1)}%`);
  console.log(`Healthy backends: ${status.backends.health.filter(b => b.healthy).length}`);
  
  await claudette.cleanup();
}

analyzeRouting().catch(console.error);
```

### ✅ Checkpoint 2

After running these scripts, you should observe:
- ✅ Multiple backends configured and working
- ✅ Different backends selected for different tasks
- ✅ Cost optimization in action (cheaper backends for simple tasks)
- ✅ Performance metrics and caching behavior

**Expected Insights:**
- Simple tasks route to cheaper backends (OpenAI gpt-4o-mini)
- Complex tasks may route to higher-quality backends (Claude)
- Second identical request shows cache hit
- Cost varies significantly between backends

---

## Step 3: RAG Integration

**Goal**: Set up RAG (Retrieval-Augmented Generation) for context-enhanced responses
**Time**: 10 minutes

### 3.1 Setup Docker RAG Provider

First, start a vector database container:

```bash
# Start Chroma vector database
docker run -d --name chroma-tutorial -p 8000:8000 chromadb/chroma:latest

# Wait for container to be ready
sleep 10

# Verify it's running
curl http://localhost:8000/api/v1/heartbeat
```

### 3.2 Create RAG Integration Script

Create `src/rag-tutorial.js`:

```javascript
// src/rag-tutorial.js
import { Claudette, RAGManager, createDockerProvider } from 'claudette';

async function ragTutorial() {
  console.log('🧠 Starting RAG tutorial...\n');
  
  try {
    // Initialize Claudette and RAG Manager
    const claudette = new Claudette();
    const ragManager = new RAGManager();
    
    await claudette.initialize();
    
    // Step 1: Register RAG provider
    console.log('📋 Step 1: Setting up RAG provider...');
    
    await ragManager.registerProvider('tutorial-docs', {
      deployment: 'local_docker',
      connection: {
        type: 'docker',
        containerName: 'chroma-tutorial',
        port: 8000,
        healthCheck: '/api/v1/heartbeat'
      },
      vectorDB: {
        provider: 'chroma',
        collection: 'tutorial-knowledge',
        similarity: 'cosine'
      }
    });
    
    console.log('✅ RAG provider registered successfully!');
    
    // Step 2: Populate knowledge base (simulated)
    console.log('\n📚 Step 2: Simulating knowledge base with sample data...');
    
    // In a real scenario, you would populate the vector DB with actual documents
    // For this tutorial, we'll simulate having knowledge about Claudette
    const sampleKnowledge = [
      "Claudette is an AI middleware platform that provides intelligent routing across multiple AI backends.",
      "The cost optimization feature in Claudette can reduce AI costs by 5-10x through intelligent backend selection.",
      "RAG (Retrieval-Augmented Generation) enhances AI responses by providing relevant context from knowledge bases.",
      "Claudette supports multiple deployment scenarios: MCP plugins, Docker containers, and remote APIs.",
      "The circuit breaker pattern in Claudette prevents cascade failures by monitoring backend health."
    ];
    
    console.log(`✅ Simulated knowledge base with ${sampleKnowledge.length} documents`);
    
    // Step 3: Test without RAG
    console.log('\n🔄 Step 3: Testing WITHOUT RAG enhancement...');
    
    const withoutRAG = await claudette.optimize(
      'What are the key benefits of using Claudette for AI applications?',
      [],
      { useRAG: false }
    );
    
    console.log('Response without RAG:');
    console.log(withoutRAG.content);
    console.log(`Cost: €${withoutRAG.cost_eur.toFixed(6)}`);
    
    // Step 4: Connect RAG to Claudette
    console.log('\n🔗 Step 4: Connecting RAG to Claudette...');
    
    const router = claudette.getRouter();
    router.setRAGManager(ragManager);
    
    console.log('✅ RAG integration complete!');
    
    // Step 5: Test with RAG
    console.log('\n🧠 Step 5: Testing WITH RAG enhancement...');
    
    const withRAG = await claudette.optimize(
      'What are the key benefits of using Claudette for AI applications?',
      [],
      {
        useRAG: true,
        ragQuery: 'Claudette benefits features cost optimization',
        contextStrategy: 'prepend'
      }
    );
    
    console.log('Response with RAG:');
    console.log(withRAG.content);
    console.log(`Cost: €${withRAG.cost_eur.toFixed(6)}`);
    
    if (withRAG.metadata?.ragUsed) {
      console.log(`\n📊 RAG Metadata:`);
      console.log(`Context sources: ${withRAG.metadata.ragSources?.length || 0}`);
      console.log(`Processing time: ${withRAG.metadata.ragProcessingTime || 0}ms`);
      console.log(`Strategy: ${withRAG.metadata.ragStrategy}`);
    }
    
    // Step 6: Advanced RAG usage
    console.log('\n🎯 Step 6: Advanced RAG with context strategies...');
    
    const strategies = ['prepend', 'append', 'inject'];
    
    for (const strategy of strategies) {
      console.log(`\nTesting strategy: ${strategy}`);
      
      const result = await claudette.optimize(
        strategy === 'inject' 
          ? 'Based on {context}, explain how to optimize AI costs'
          : 'How can I optimize AI costs in my application?',
        [],
        {
          useRAG: true,
          ragQuery: 'cost optimization AI backend selection',
          contextStrategy: strategy
        }
      );
      
      console.log(`✅ ${strategy}: ${result.content.substring(0, 150)}...`);
    }
    
    // Cleanup
    await ragManager.cleanup();
    await claudette.cleanup();
    
    console.log('\n🎉 RAG tutorial completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('Connection refused')) {
      console.log('\n💡 Solution: Make sure Docker container is running:');
      console.log('   docker run -d --name chroma-tutorial -p 8000:8000 chromadb/chroma:latest');
    }
  }
}

ragTutorial();
```

### 3.3 Run RAG Tutorial

```bash
node src/rag-tutorial.js
```

### 3.4 Observe RAG Benefits

Create `src/rag-comparison.js` to see the difference:

```javascript
// src/rag-comparison.js
import { Claudette, RAGManager } from 'claudette';

async function compareRAGResponses() {
  const claudette = new Claudette();
  const ragManager = new RAGManager();
  
  await claudette.initialize();
  
  // Register RAG provider (assuming Docker container is running)
  await ragManager.registerProvider('docs', {
    deployment: 'local_docker',
    connection: { type: 'docker', containerName: 'chroma-tutorial', port: 8000 },
    vectorDB: { provider: 'chroma', collection: 'docs' }
  });
  
  const router = claudette.getRouter();
  router.setRAGManager(ragManager);
  
  const testQueries = [
    {
      question: 'How does Claudette handle backend failures?',
      ragQuery: 'circuit breaker failure handling backend reliability'
    },
    {
      question: 'What are the deployment options for RAG providers?',
      ragQuery: 'RAG deployment MCP Docker remote API'
    }
  ];
  
  for (const [index, query] of testQueries.entries()) {
    console.log(`\n🔍 Test ${index + 1}: ${query.question}\n`);
    
    // Without RAG
    console.log('📝 Without RAG:');
    const withoutRAG = await claudette.optimize(query.question, [], { useRAG: false });
    console.log(withoutRAG.content.substring(0, 200) + '...\n');
    
    // With RAG
    console.log('🧠 With RAG:');
    const withRAG = await claudette.optimize(query.question, [], {
      useRAG: true,
      ragQuery: query.ragQuery,
      contextStrategy: 'prepend'
    });
    console.log(withRAG.content.substring(0, 200) + '...\n');
    
    console.log('📊 Comparison:');
    console.log(`Without RAG cost: €${withoutRAG.cost_eur.toFixed(6)}`);
    console.log(`With RAG cost: €${withRAG.cost_eur.toFixed(6)}`);
    console.log(`RAG processing time: ${withRAG.metadata?.ragProcessingTime || 0}ms`);
  }
  
  await ragManager.cleanup();
  await claudette.cleanup();
}

compareRAGResponses().catch(console.error);
```

### ✅ Checkpoint 3

After completing this section, you should have:
- ✅ Docker container running Chroma vector database
- ✅ RAG provider registered and connected
- ✅ Observed difference between RAG and non-RAG responses
- ✅ Tested different context integration strategies
- ✅ Understanding of RAG cost and performance implications

**Expected Observations:**
- RAG responses include more specific, contextual information
- Slightly higher latency due to context retrieval
- More accurate answers about Claudette-specific topics
- Different context strategies produce different response structures

---

## Step 4: Production Setup

**Goal**: Configure Claudette for production use with monitoring and optimization
**Time**: 5 minutes

### 4.1 Production Configuration

Create `claudette.production.json`:

```json
{
  "backends": {
    "openai": {
      "enabled": true,
      "priority": 1,
      "cost_per_token": 0.000015,
      "model": "gpt-4o-mini",
      "max_tokens": 4000,
      "temperature": 0.7
    },
    "claude": {
      "enabled": true,
      "priority": 2,
      "cost_per_token": 0.0003,
      "model": "claude-3-sonnet-20240229",
      "max_tokens": 4000,
      "temperature": 0.7
    }
  },
  "features": {
    "caching": true,
    "cost_optimization": true,
    "performance_monitoring": true,
    "smart_routing": true,
    "mcp_integration": true,
    "compression": false,
    "summarization": false
  },
  "thresholds": {
    "cache_ttl": 7200,
    "max_cache_size": 50000,
    "cost_warning": 0.05,
    "max_context_tokens": 64000,
    "compression_threshold": 100000
  },
  "database": {
    "path": "./claudette-prod.db",
    "cache_path": "./cache",
    "backup_enabled": true,
    "auto_vacuum": true
  }
}
```

### 4.2 Production Monitoring Script

Create `src/production-setup.js`:

```javascript
// src/production-setup.js
import { Claudette } from 'claudette';

class ProductionClaudette {
  constructor() {
    this.claudette = new Claudette('./claudette.production.json');
    this.metrics = {
      totalRequests: 0,
      totalCost: 0,
      averageLatency: 0,
      errorCount: 0,
      cacheHitRate: 0
    };
    this.costThreshold = 1.0; // €1.00 daily limit
    this.dailyCost = 0;
  }

  async initialize() {
    await this.claudette.initialize();
    console.log('🚀 Production Claudette initialized');
    
    // Start monitoring
    this.startMonitoring();
    
    // Setup graceful shutdown
    this.setupGracefulShutdown();
  }

  async optimize(prompt, files = [], options = {}) {
    const startTime = Date.now();
    
    try {
      // Check daily cost limit
      if (this.dailyCost >= this.costThreshold) {
        throw new Error(`Daily cost limit (€${this.costThreshold}) exceeded`);
      }

      // Execute request
      const result = await this.claudette.optimize(prompt, files, options);
      
      // Update metrics
      this.updateMetrics(result, Date.now() - startTime);
      
      return result;
      
    } catch (error) {
      this.metrics.errorCount++;
      console.error('❌ Request failed:', error.message);
      throw error;
    }
  }

  updateMetrics(result, requestTime) {
    this.metrics.totalRequests++;
    this.metrics.totalCost += result.cost_eur;
    this.dailyCost += result.cost_eur;
    
    // Update average latency
    this.metrics.averageLatency = 
      (this.metrics.averageLatency * (this.metrics.totalRequests - 1) + requestTime) / 
      this.metrics.totalRequests;
  }

  startMonitoring() {
    // Health check every minute
    setInterval(async () => {
      try {
        const status = await this.claudette.getStatus();
        this.metrics.cacheHitRate = status.cache.hit_rate;
        
        console.log('📊 Health Check:', {
          healthy: status.healthy,
          totalRequests: this.metrics.totalRequests,
          dailyCost: `€${this.dailyCost.toFixed(4)}`,
          cacheHitRate: `${this.metrics.cacheHitRate.toFixed(1)}%`,
          avgLatency: `${this.metrics.averageLatency.toFixed(0)}ms`,
          errors: this.metrics.errorCount
        });
        
        // Alert on issues
        if (!status.healthy) {
          console.error('🚨 ALERT: System unhealthy');
        }
        
        if (this.metrics.cacheHitRate < 50) {
          console.warn('⚠️  WARNING: Low cache hit rate');
        }
        
        if (this.dailyCost > this.costThreshold * 0.8) {
          console.warn(`⚠️  WARNING: Approaching daily cost limit (${(this.dailyCost/this.costThreshold*100).toFixed(1)}%)`);
        }
        
      } catch (error) {
        console.error('❌ Health check failed:', error.message);
      }
    }, 60000);

    // Reset daily cost at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    setTimeout(() => {
      this.dailyCost = 0;
      console.log('🔄 Daily cost counter reset');
      
      // Set up daily reset interval
      setInterval(() => {
        this.dailyCost = 0;
        console.log('🔄 Daily cost counter reset');
      }, 24 * 60 * 60 * 1000);
    }, tomorrow.getTime() - now.getTime());
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n📊 Final metrics before shutdown (${signal}):`);
      console.log(this.metrics);
      
      await this.claudette.cleanup();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  getMetrics() {
    return { ...this.metrics, dailyCost: this.dailyCost };
  }
}

// Example production usage
async function productionExample() {
  const production = new ProductionClaudette();
  await production.initialize();
  
  console.log('🎯 Running production example requests...\n');
  
  const requests = [
    'Summarize the key points of microservices architecture',
    'Generate a Python function for user authentication',
    'Explain the benefits of caching in web applications',
    'Write TypeScript interfaces for a REST API',
    'Describe best practices for database optimization'
  ];
  
  for (const [index, prompt] of requests.entries()) {
    try {
      console.log(`Request ${index + 1}: ${prompt.substring(0, 50)}...`);
      
      const result = await production.optimize(prompt, [], {
        max_tokens: 500,
        temperature: 0.3
      });
      
      console.log(`✅ Success: ${result.backend_used}, €${result.cost_eur.toFixed(6)}, ${result.latency_ms}ms`);
      
      // Small delay to observe monitoring
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Request ${index + 1} failed:`, error.message);
    }
  }
  
  console.log('\n📈 Final metrics:');
  console.log(production.getMetrics());
}

productionExample().catch(console.error);
```

### 4.3 Run Production Setup

```bash
node src/production-setup.js
```

### 4.4 Docker Production Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY src/ ./src/
COPY claudette.production.json ./
COPY *.md ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S claudette -u 1001

# Set ownership
RUN chown -R claudette:nodejs /app
USER claudette

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('healthy')" || exit 1

EXPOSE 3000

CMD ["node", "src/production-setup.js"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  claudette:
    build: .
    container_name: claudette-production
    environment:
      - NODE_ENV=production
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "console.log('healthy')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  monitoring:
    image: prom/prometheus
    container_name: claudette-monitoring
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
```

### ✅ Checkpoint 4

You now have a production-ready setup with:
- ✅ Production configuration with optimized settings
- ✅ Comprehensive monitoring and alerting
- ✅ Cost tracking and limits
- ✅ Health checks and graceful shutdown
- ✅ Docker deployment configuration
- ✅ Error handling and recovery

**Production Features:**
- Automatic daily cost reset
- Cache hit rate monitoring
- Performance tracking
- Health status alerts
- Graceful shutdown handling

---

## What's Next

Congratulations! You've completed the Claudette interactive tutorial. Here's what you've learned:

### ✅ Skills Acquired

1. **Basic Usage**: Initialize Claudette and make AI requests
2. **Backend Configuration**: Set up multiple providers and observe intelligent routing
3. **RAG Integration**: Enhance responses with context retrieval
4. **Production Setup**: Configure monitoring, limits, and deployment

### 🚀 Next Steps

#### Immediate Actions
```bash
# 1. Explore advanced features
node examples/advanced-routing.js
node examples/custom-backends.js

# 2. Set up monitoring dashboard
docker-compose up monitoring

# 3. Configure production environment
cp claudette.production.json claudette.config.json
```

#### Learning Path Options

**📚 For Developers**:
- [API Documentation](../api/) - Complete TypeScript API reference
- [Backend Development](../development/backend-plugins.md) - Create custom backends
- [Testing Guide](../development/testing.md) - Testing patterns and practices

**🏢 For Teams**:
- [Enterprise Deployment](../deployment/enterprise.md) - Kubernetes and scaling
- [Security Guide](../security/) - Production security practices
- [Monitoring Setup](../monitoring/) - Metrics and alerting

**🧠 For RAG Enthusiasts**:
- [Advanced RAG Patterns](../rag/advanced-patterns.md) - Hybrid search and optimization
- [Vector Database Guide](../rag/vector-databases.md) - Database-specific configurations
- [Knowledge Management](../rag/knowledge-management.md) - Content ingestion strategies

### 💬 Community Resources

- **GitHub Discussions**: Ask questions and share experiences
- **Documentation**: Comprehensive guides and references
- **Examples Repository**: Real-world usage patterns
- **Discord Community**: Real-time help and discussions

### 🔧 Troubleshooting Resources

If you encountered issues during the tutorial:

1. **Check Prerequisites**: Ensure Node.js 18+ and proper API keys
2. **Review Logs**: Look for specific error messages
3. **Consult Documentation**: [Troubleshooting Guide](../troubleshooting/)
4. **Ask for Help**: GitHub Discussions or Discord

### 📈 Performance Tips

To optimize your Claudette usage:

```javascript
// 1. Configure caching for your use case
const config = {
  thresholds: {
    cache_ttl: 7200,        // 2 hours for stable content
    max_cache_size: 50000   // Large cache for high-traffic
  }
};

// 2. Use appropriate backends for different tasks
const result = await claudette.optimize(prompt, [], {
  backend: 'openai',      // For cost-sensitive tasks
  // backend: 'claude',   // For complex reasoning
  // backend: 'qwen',     // For code generation
});

// 3. Optimize RAG queries
const ragResult = await claudette.optimize(prompt, [], {
  useRAG: true,
  ragQuery: 'specific focused keywords',  // Better than generic queries
  contextStrategy: 'prepend'              // Most reliable strategy
});
```

---

**🎉 You're now ready to build amazing AI applications with Claudette!**

For continued learning and support:
- ⭐ Star the [GitHub repository](https://github.com/user/claudette)
- 📖 Explore the [full documentation](../README.md)
- 💬 Join the [community discussions](https://github.com/user/claudette/discussions)

Happy building! 🚀