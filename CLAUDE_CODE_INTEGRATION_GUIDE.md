# Claude Code Integration with Claudette v1.0.5 - Complete Guide

## 📋 **OVERVIEW**

This guide explains how to set up Claudette AI integration in Claude Code, featuring the new **ultra-fast MCP server** with sub-second startup, advanced memory management, and optimized performance for production use.

> **New in v1.0.5**: Ultra-fast MCP server with **264ms startup** (99.1% improvement) and advanced memory management system.

---

## 🚀 **QUICK START (v1.0.5)**

### **Option 1: Ultra-Fast MCP Server (Recommended)**
```bash
# 1. Verify Claudette v1.0.5 installation
./claudette --version  # Should output: 1.0.5

# 2. Test the ultra-fast MCP server
node claudette-mcp-server-fast.js &
# Server should be ready in <300ms

# 3. Add to Claude Code settings
```

### **Option 2: Unified MCP Server (Fallback)**
```bash
# Use the reliable unified server if needed
node claudette-mcp-server-unified.js
```

---

## 🛠️ **INSTALLATION STEPS**

### **Step 1: Claude Code Settings Configuration**

**Create or edit `~/.claude/settings.json`:**

```json
{
  "mcpServers": {
    "claudette": {
      "command": "node",
      "args": [
        "/path/to/claudette/claudette-mcp-server-fast.js"
      ],
      "description": "Claudette v1.0.5 - Ultra-Fast AI Backend Router",
      "capabilities": ["tools", "resources"],
      "timeout": 60000,
      "env": {
        "NODE_ENV": "production",
        "CLAUDETTE_MCP_MODE": "1",
        "CLAUDETTE_ADVANCED_MEMORY": "1"
      }
    }
  },
  "logging": {
    "level": "info"
  }
}
```

### **Step 2: Path Configuration**
```bash
# Replace /path/to/claudette with your actual path
# Example paths:
# macOS: /Users/[USERNAME]/Documents/claudette
# Linux: /home/[USERNAME]/claudette
# Windows: C:\Users\[USERNAME]\claudette
```

### **Step 3: Permissions & Verification**
```bash
# Make MCP servers executable
chmod +x claudette-mcp-server-fast.js
chmod +x claudette-mcp-server-unified.js

# Verify syntax
node --check claudette-mcp-server-fast.js

# Test startup speed
time node claudette-mcp-server-fast.js
# Should show ready signal in <300ms
```

### **Step 4: Restart Claude Code**
```bash
# Restart Claude Code to load the new configuration
# The MCP server will start automatically when Claude Code connects
```

---

## 📄 **SETTINGS.JSON EXAMPLES**

### **Minimal Configuration**
```json
{
  "mcpServers": {
    "claudette": {
      "command": "node",
      "args": ["/path/to/claudette/claudette-mcp-server-fast.js"],
      "description": "Ultra-Fast Claudette AI",
      "timeout": 60000
    }
  }
}
```

### **Production Configuration**
```json
{
  "mcpServers": {
    "claudette": {
      "command": "node",
      "args": ["/path/to/claudette/claudette-mcp-server-fast.js"],
      "description": "Claudette v1.0.5 with Advanced Memory Management",
      "capabilities": ["tools", "resources"],
      "timeout": 60000,
      "env": {
        "NODE_ENV": "production",
        "CLAUDETTE_MCP_MODE": "1",
        "CLAUDETTE_ADVANCED_MEMORY": "1",
        "CLAUDETTE_LOG_LEVEL": "info"
      }
    }
  },
  "logging": {
    "level": "info",
    "enableMcpLogging": true
  }
}
```

### **High-Performance Configuration**
```json
{
  "mcpServers": {
    "claudette": {
      "command": "node",
      "args": ["/path/to/claudette/claudette-mcp-server-fast.js"],
      "description": "Claudette High-Performance Setup",
      "capabilities": ["tools", "resources"],
      "timeout": 90000,
      "env": {
        "NODE_ENV": "production",
        "CLAUDETTE_MCP_MODE": "1",
        "CLAUDETTE_ADVANCED_MEMORY": "1",
        "CLAUDETTE_BENCHMARK": "0"
      }
    }
  },
  "performance": {
    "enableMetrics": true,
    "metricsInterval": 30000
  }
}
```

---

## ⚙️ **AVAILABLE MCP TOOLS (v1.0.5)**

### **Core Tools**
- **`claudette_version`** - Get version information (cached)
- **`claudette_status`** - System status with performance metrics  
- **`claudette_health`** - Fast health check of critical components
- **`claudette_backends`** - Available backend information (cached)
- **`claudette_cache_stats`** - Cache and memory statistics
- **`claudette_query`** - Execute AI query with connection pooling

### **Advanced Query Tool**
```javascript
// claudette_query parameters:
{
  "prompt": "Your query here",           // Required
  "backend": "auto|openai|qwen|claude", // Optional, default: auto
  "priority": "high|medium|low",        // Optional, default: medium
  "use_cache": true                     // Optional, default: true
}
```

---

## 🧪 **TESTING AND VALIDATION**

### **1. Quick Functionality Test**
```bash
# Test MCP server startup
timeout 5s node claudette-mcp-server-fast.js
# Should see "MCP_RAG_READY" signal within 1 second

# Test basic Claudette functionality
./claudette --version
./claudette "Test query" --backend qwen
```

### **2. Benchmark Performance (New in v1.0.5)**
```bash
# Test all interfaces performance
node benchmark-all.js

# Test MCP server specifically
node benchmark-mcp.js

# Expected MCP Results:
# 🏆 Startup: ~264ms (ultra-fast)
# 🏆 Queries: ~896ms average
# 🏆 Memory: <1MB growth (efficient)
```

### **3. Memory Management Test**
```bash
# Test advanced memory management
CLAUDETTE_ADVANCED_MEMORY=1 node claudette-mcp-server-fast.js

# Check memory statistics via MCP
# Use claudette_cache_stats tool in Claude Code
```

### **4. Integration Test with Claude Code**
```bash
# In Claude Code, test each tool:
# 1. claudette_version - Should return v1.0.5
# 2. claudette_health - Should show "healthy" status  
# 3. claudette_query with simple prompt
# 4. claudette_cache_stats - Should show memory usage
```

---

## 📊 **MONITORING AND PERFORMANCE**

### **v1.0.5 Performance Metrics**
```json
{
  "startup_time": "264ms",
  "memory_pressure": "75-85%",
  "request_success_rate": "95%+",
  "cache_hit_rate": "40-60%",
  "backend_health": "3/3 healthy"
}
```

### **Memory Management Monitoring**
```bash
# Check memory pressure via tools:
# - claudette_cache_stats: Current cache state
# - claudette_status: Overall system health
# - claudette_health: Component status

# Expected memory behavior:
# - Automatic pressure detection
# - Emergency cleanup at 95%+ pressure  
# - Complex task preparation
# - Intelligent cache eviction
```

### **Performance Optimization**
```bash
# Enable advanced memory management
export CLAUDETTE_ADVANCED_MEMORY=1

# Enable MCP optimizations
export CLAUDETTE_MCP_MODE=1

# Set production environment
export NODE_ENV=production
```

---

## 🚨 **TROUBLESHOOTING**

### **Issue: MCP Server Won't Start**
```bash
# Diagnosis:
node --check claudette-mcp-server-fast.js
ls -la claudette-mcp-server-*.js

# Solutions:
chmod +x claudette-mcp-server-fast.js
# Check path in settings.json
# Try unified server as fallback
```

### **Issue: Slow Startup/Timeouts**
```bash
# v1.0.5 should start in <300ms
# If slow, check:
# 1. Use fast server: claudette-mcp-server-fast.js
# 2. Check environment variables are set
# 3. Verify binary vs ts-node usage

# Fallback to unified server:
# Replace "claudette-mcp-server-fast.js" with 
# "claudette-mcp-server-unified.js" in settings.json
```

### **Issue: Memory Pressure Warnings**
```bash
# v1.0.5 has advanced memory management
# Enable it explicitly:
export CLAUDETTE_ADVANCED_MEMORY=1

# Check memory status:
# Use claudette_cache_stats tool
# Expected: 75-85% pressure (managed)
# If >90%: System will auto-cleanup
```

### **Issue: Tool Calls Fail**
```bash
# Check tool availability:
# - claudette_version (should work immediately)
# - claudette_health (basic health check)
# - claudette_query (main functionality)

# Test direct query:
./claudette "test" --backend qwen
```

---

## 🎯 **BEST PRACTICES FOR v1.0.5**

### **1. Server Selection**
- **Primary**: Use `claudette-mcp-server-fast.js` for best performance
- **Fallback**: Use `claudette-mcp-server-unified.js` for reliability  
- **Avoid**: `claudette-mcp-server.js` (legacy, slow startup)

### **2. Memory Management**
- **Always enable**: `CLAUDETTE_ADVANCED_MEMORY=1`
- **Monitor**: Use `claudette_cache_stats` tool regularly
- **Trust the system**: v1.0.5 handles memory pressure automatically

### **3. Performance Optimization**
- **Environment**: Set `NODE_ENV=production`
- **MCP Mode**: Set `CLAUDETTE_MCP_MODE=1`
- **Timeouts**: Use 60s timeout (harmonized with v1.0.5)

### **4. Monitoring**
- **Startup**: Should complete in <300ms
- **Memory**: 75-85% pressure is normal and managed
- **Success Rate**: Should be 95%+ with v1.0.5 improvements

---

## 🔄 **MIGRATION FROM OLDER VERSIONS**

### **From v1.0.4 or Earlier**
```bash
# 1. Update Claudette
git pull origin main
npm install && npm run build

# 2. Update settings.json
# Replace old MCP server references:
# OLD: claudette-mcp-multiplexer.js
# NEW: claudette-mcp-server-fast.js

# 3. Remove old config files (now unused):
# - example-claude-settings.json  
# - mcp-multiplexer-config.json

# 4. Add new environment variables:
export CLAUDETTE_ADVANCED_MEMORY=1
export CLAUDETTE_MCP_MODE=1
```

### **Configuration Changes**
```json
// OLD v1.0.4 style:
{
  "timeout": 120000,
  "args": ["claudette-mcp-multiplexer.js"]
}

// NEW v1.0.5 style:
{
  "timeout": 60000,
  "args": ["claudette-mcp-server-fast.js"],
  "env": {
    "CLAUDETTE_ADVANCED_MEMORY": "1",
    "CLAUDETTE_MCP_MODE": "1"
  }
}
```

---

## 📈 **PERFORMANCE COMPARISON**

| Metric | v1.0.4 | v1.0.5 | Improvement |
|--------|--------|--------|-------------|
| **MCP Startup** | 30,000ms | 264ms | **113.6x faster** |
| **Memory Management** | Manual | Automatic | **Pressure handling** |
| **Tool Success Rate** | 60-70% | 95%+ | **40% improvement** |
| **Memory Efficiency** | Basic | Advanced pools | **Emergency cleanup** |

---

## 🎉 **SUCCESSFUL INTEGRATION CHECKLIST**

After successful setup, you should have:

✅ **Ultra-Fast Startup** (<300ms MCP server ready time)  
✅ **Advanced Memory Management** (Automatic pressure handling)  
✅ **Harmonized Timeouts** (60s optimized timing)  
✅ **Intelligent Routing** (Auto-backend selection)  
✅ **Production Monitoring** (Health checks and metrics)  
✅ **Cache Optimization** (40-60% hit rates)  

**Result**: Claudette runs seamlessly in Claude Code with sub-second startup, advanced memory management, and 95%+ reliability for all AI queries.

---

## 📞 **SUPPORT**

- **Issues**: [GitHub Issues](https://github.com/RobLe3/claudette/issues)
- **Documentation**: [docs/](docs/)
- **Version**: Claudette v1.0.5
- **MCP Compatibility**: Model Context Protocol 2024-11-05

*Happy AI querying with ultra-fast Claudette v1.0.5! 🚀*