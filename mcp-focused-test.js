#!/usr/bin/env node

/**
 * MCP Integration Focused Test
 * Tests Model Context Protocol integration and RAG functionality
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function testMCPIntegration() {
  console.log('🔌 MCP Integration Focused Test');
  console.log('===============================');
  
  let results = { total: 0, passed: 0, failed: 0 };
  
  function test(name, condition, details = '') {
    results.total++;
    if (condition) {
      results.passed++;
      console.log(`✅ ${name}: PASSED ${details}`);
    } else {
      results.failed++;
      console.log(`❌ ${name}: FAILED ${details}`);
    }
  }
  
  // Test 1: MCP Module Loading
  console.log('\n📋 Testing MCP Module Loading...');
  try {
    const { MCPRAGProvider, RAGManager } = require('./dist/rag/index.js');
    test('MCP Module Import', true, 'MCPRAGProvider and RAGManager loaded');
  } catch (error) {
    test('MCP Module Import', false, `Failed to load: ${error.message}`);
    return results;
  }
  
  // Test 2: MCP Server Script Existence
  console.log('\n📋 Testing MCP Server Assets...');
  const mcpServerScript = path.join(__dirname, 'claudette-mcp-server-optimized.js');
  const mcpTestScript = path.join(__dirname, 'claudette-mcp-comprehensive-test.js');
  
  test('MCP Server Script', fs.existsSync(mcpServerScript), 
       mcpServerScript.split('/').pop());
  test('MCP Test Script', fs.existsSync(mcpTestScript), 
       mcpTestScript.split('/').pop());
  
  // Test 3: MCP Server Startup (Quick Test)
  console.log('\n📋 Testing MCP Server Startup...');
  if (fs.existsSync(mcpServerScript)) {
    try {
      const mcpServer = spawn('node', [mcpServerScript], {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 8000
      });
      
      let serverOutput = '';
      let serverReady = false;
      
      mcpServer.stdout.on('data', (data) => {
        const output = data.toString();
        serverOutput += output;
        if (output.includes('MCP_RAG_READY') || 
            output.includes('Server listening') ||
            output.includes('ready')) {
          serverReady = true;
        }
      });
      
      // Wait for startup or timeout
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          mcpServer.kill('SIGTERM');
          resolve();
        }, 8000);
        
        const checkReady = setInterval(() => {
          if (serverReady) {
            clearInterval(checkReady);
            clearTimeout(timeout);
            mcpServer.kill('SIGTERM');
            resolve();
          }
        }, 500);
      });
      
      test('MCP Server Startup', serverReady, 
           `Server ${serverReady ? 'started successfully' : 'failed to start in 8s'}`);
      
      if (serverOutput.length > 0) {
        console.log(`   📝 Server output preview: ${serverOutput.substring(0, 100)}...`);
      }
      
    } catch (error) {
      test('MCP Server Startup', false, error.message);
    }
  }
  
  // Test 4: RAG Integration Test
  console.log('\n📋 Testing RAG Integration...');
  try {
    const { optimize } = require('./dist/index.js');
    
    // Test RAG-related query
    const ragQuery = 'What tools are available in the MCP system?';
    const response = await optimize(ragQuery, [], { 
      bypass_cache: true,
      timeout: 15000 
    });
    
    test('RAG Query Processing', 
         response && response.content && response.content.length > 20,
         `Response length: ${response?.content?.length}`);
    
    // Check if response mentions tools or MCP concepts
    const ragRelevant = response?.content?.toLowerCase().includes('tool') ||
                        response?.content?.toLowerCase().includes('mcp') ||
                        response?.content?.toLowerCase().includes('context');
    
    test('RAG Content Relevance', ragRelevant,
         'Response contains tool/MCP related content');
    
  } catch (error) {
    test('RAG Integration', false, error.message);
  }
  
  // Test 5: Abstract MCP Use Cases
  console.log('\n📋 Testing Abstract MCP Use Cases...');
  
  const useCases = [
    {
      name: 'Code Analysis Request',
      query: 'Analyze this code for potential improvements: function hello() { console.log("hi"); }',
      expectKeywords: ['function', 'improvement', 'code']
    },
    {
      name: 'Documentation Query',
      query: 'How do I use the MCP protocol for tool integration?',
      expectKeywords: ['mcp', 'protocol', 'tool']
    }
  ];
  
  for (const useCase of useCases) {
    try {
      const { optimize } = require('./dist/index.js');
      const response = await optimize(useCase.query, [], { 
        bypass_cache: true,
        timeout: 15000 
      });
      
      if (response && response.content && response.content.length > 30) {
        // Check for relevant keywords
        const hasRelevantContent = useCase.expectKeywords.some(keyword => 
          response.content.toLowerCase().includes(keyword.toLowerCase())
        );
        
        test(useCase.name, hasRelevantContent,
             `Content relevant to query (${response.content.length} chars)`);
      } else {
        test(useCase.name, false, 'Response too short or empty');
      }
      
    } catch (error) {
      test(useCase.name, false, error.message);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 MCP INTEGRATION TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log('='.repeat(50));
  
  return results.failed === 0;
}

testMCPIntegration().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});