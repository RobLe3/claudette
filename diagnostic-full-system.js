#!/usr/bin/env node

console.log('🔍 COMPREHENSIVE CLAUDETTE SYSTEM DIAGNOSTIC');
console.log('============================================');

require('dotenv').config();

const fs = require('fs');
const path = require('path');

let diagnosticResults = {
  environment: {},
  build: {},
  modules: {},
  backends: {},
  functionality: {},
  bugs: []
};

function addBug(category, severity, description, fix) {
  diagnosticResults.bugs.push({ category, severity, description, fix });
  console.log(`🐛 ${severity.toUpperCase()} BUG: ${description}`);
  if (fix) console.log(`   Fix: ${fix}`);
}

async function checkEnvironment() {
  console.log('\n📋 Environment Check');
  console.log('-------------------');
  
  // Check Node.js version
  const nodeVersion = process.version;
  console.log(`Node.js: ${nodeVersion}`);
  diagnosticResults.environment.nodeVersion = nodeVersion;
  
  // Check required environment variables
  const requiredEnvVars = [
    'OPENAI_API_KEY',
    'FLEXCON_API_URL', 
    'FLEXCON_API_KEY',
    'FLEXCON_MODEL',
    'ULTIPA_ENDPOINT',
    'ULTIPA_ACCESS_TOKEN'
  ];
  
  const missingEnvVars = [];
  requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: SET`);
      diagnosticResults.environment[varName] = 'SET';
    } else {
      console.log(`❌ ${varName}: MISSING`);
      diagnosticResults.environment[varName] = 'MISSING';
      missingEnvVars.push(varName);
    }
  });
  
  if (missingEnvVars.length > 0) {
    addBug('environment', 'high', `Missing environment variables: ${missingEnvVars.join(', ')}`, 'Add missing variables to .env file');
  }
}

async function checkBuildSystem() {
  console.log('\n🔨 Build System Check');
  console.log('--------------------');
  
  // Check if dist directory exists
  if (fs.existsSync('./dist')) {
    console.log('✅ dist/ directory exists');
    
    // Check key files
    const keyFiles = [
      'dist/index.js',
      'dist/index.d.ts',
      'dist/backends',
      'dist/cache',
      'dist/database',
      'dist/router'
    ];
    
    keyFiles.forEach(file => {
      if (fs.existsSync(file)) {
        console.log(`✅ ${file}: EXISTS`);
        diagnosticResults.build[file] = 'EXISTS';
      } else {
        console.log(`❌ ${file}: MISSING`);
        diagnosticResults.build[file] = 'MISSING';
        addBug('build', 'high', `Missing build file: ${file}`, 'Run npm run build');
      }
    });
  } else {
    console.log('❌ dist/ directory missing');
    addBug('build', 'critical', 'dist/ directory missing', 'Run npm run build');
  }
  
  // Check package.json
  try {
    const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    console.log(`✅ Package: ${pkg.name}@${pkg.version}`);
    diagnosticResults.build.package = `${pkg.name}@${pkg.version}`;
  } catch (error) {
    addBug('build', 'high', 'Cannot read package.json', 'Fix package.json structure');
  }
}

async function checkModules() {
  console.log('\n📦 Module Loading Check');
  console.log('----------------------');
  
  const modules = [
    { name: 'Claudette', path: './dist/index.js', export: 'Claudette' },
    { name: 'DatabaseManager', path: './dist/database/index.js', export: 'DatabaseManager' },
    { name: 'CacheSystem', path: './dist/cache/index.js', export: 'CacheSystem' },
    { name: 'BackendRouter', path: './dist/router/index.js', export: 'BackendRouter' }
  ];
  
  for (const module of modules) {
    try {
      const loaded = require(module.path);
      if (loaded[module.export]) {
        console.log(`✅ ${module.name}: LOADED`);
        diagnosticResults.modules[module.name] = 'LOADED';
      } else {
        console.log(`❌ ${module.name}: EXPORT MISSING`);
        diagnosticResults.modules[module.name] = 'EXPORT_MISSING';
        addBug('modules', 'medium', `${module.name} export missing from ${module.path}`, 'Check export statement');
      }
    } catch (error) {
      console.log(`❌ ${module.name}: LOAD ERROR - ${error.message}`);
      diagnosticResults.modules[module.name] = `ERROR: ${error.message}`;
      addBug('modules', 'high', `Cannot load ${module.name}: ${error.message}`, 'Fix module dependencies');
    }
  }
}

async function checkBackendAPIs() {
  console.log('\n🌐 Backend API Check');
  console.log('-------------------');
  
  // Test OpenAI API directly
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ OpenAI API: ${data.data?.length || 0} models`);
      diagnosticResults.backends.openai = 'WORKING';
    } else {
      console.log(`❌ OpenAI API: HTTP ${response.status}`);
      diagnosticResults.backends.openai = `ERROR: HTTP ${response.status}`;
      addBug('backends', 'high', `OpenAI API returns HTTP ${response.status}`, 'Check API key validity');
    }
  } catch (error) {
    console.log(`❌ OpenAI API: ${error.message}`);
    diagnosticResults.backends.openai = `ERROR: ${error.message}`;
    addBug('backends', 'high', `OpenAI API error: ${error.message}`, 'Check network connectivity');
  }
  
  // Test Flexcon API
  try {
    const response = await fetch(`${process.env.FLEXCON_API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FLEXCON_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.FLEXCON_MODEL,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5
      }),
      timeout: 15000
    });
    
    if (response.ok) {
      console.log('✅ Flexcon API: WORKING');
      diagnosticResults.backends.flexcon = 'WORKING';
    } else {
      const errorText = await response.text();
      console.log(`❌ Flexcon API: HTTP ${response.status} - ${errorText}`);
      diagnosticResults.backends.flexcon = `ERROR: HTTP ${response.status}`;
      addBug('backends', 'medium', `Flexcon API error: HTTP ${response.status}`, 'Check Flexcon credentials');
    }
  } catch (error) {
    console.log(`❌ Flexcon API: ${error.message}`);
    diagnosticResults.backends.flexcon = `ERROR: ${error.message}`;
    addBug('backends', 'medium', `Flexcon API error: ${error.message}`, 'Check Flexcon configuration');
  }
}

async function checkClaudetteFunctionality() {
  console.log('\n⚡ Claudette Functionality Check');
  console.log('-------------------------------');
  
  try {
    const { Claudette } = require('./dist/index.js');
    
    // Test instance creation
    const claudette = new Claudette({
      openai: { apiKey: process.env.OPENAI_API_KEY }
    });
    console.log('✅ Claudette instance creation: SUCCESS');
    
    // Test initialization
    try {
      await claudette.initialize();
      console.log('✅ Claudette initialization: SUCCESS');
    } catch (error) {
      console.log('❌ Claudette initialization: FAILED -', error.message);
      addBug('functionality', 'high', `Initialization failed: ${error.message}`, 'Debug initialization process');
    }
    
    // Test basic query with short timeout
    try {
      console.log('Testing query with 30 second timeout...');
      const result = await claudette.optimize('Say "diagnostic test"', [], { 
        timeout: 30000,
        maxRetries: 1 
      });
      
      if (result && result.content) {
        console.log('✅ Query processing: SUCCESS');
        console.log(`   Response: "${result.content}"`);
        console.log(`   Backend: ${result.backend_used}`);
        console.log(`   Cost: ${result.cost_eur || 'Unknown'}`);
        diagnosticResults.functionality.queryProcessing = 'SUCCESS';
        
        if (!result.cost_eur || result.cost_eur === 0) {
          addBug('functionality', 'medium', 'Cost calculation returns 0 or undefined', 'Debug cost calculation pipeline');
        }
      } else {
        console.log('❌ Query processing: NO RESPONSE');
        addBug('functionality', 'high', 'Query returns null/undefined result', 'Debug query processing pipeline');
      }
    } catch (error) {
      console.log('❌ Query processing: FAILED -', error.message);
      diagnosticResults.functionality.queryProcessing = `ERROR: ${error.message}`;
      addBug('functionality', 'critical', `Query processing failed: ${error.message}`, 'Debug backend routing system');
    }
    
  } catch (error) {
    console.log('❌ Claudette loading: FAILED -', error.message);
    addBug('functionality', 'critical', `Cannot load Claudette: ${error.message}`, 'Fix module loading issues');
  }
}

async function checkMCPServer() {
  console.log('\n🔌 MCP Server Check');
  console.log('------------------');
  
  const { spawn } = require('child_process');
  
  return new Promise((resolve) => {
    const child = spawn('node', ['claudette-mcp-server.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let gotInitResponse = false;
    let hasErrors = false;
    
    const timeout = setTimeout(() => {
      child.kill();
      if (!gotInitResponse) {
        addBug('mcp', 'high', 'MCP server timeout - no initialization response', 'Debug MCP server startup');
      }
      resolve();
    }, 10000);
    
    child.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('"protocolVersion"')) {
        console.log('✅ MCP Server: RESPONDS');
        gotInitResponse = true;
        diagnosticResults.functionality.mcpServer = 'WORKING';
      }
    });
    
    child.stderr.on('data', (data) => {
      const error = data.toString();
      if (error.includes('error') || error.includes('Error')) {
        hasErrors = true;
        console.log('⚠️ MCP Server: ERRORS IN LOG');
      }
    });
    
    child.on('exit', () => {
      clearTimeout(timeout);
      if (hasErrors && gotInitResponse) {
        addBug('mcp', 'low', 'MCP server works but logs errors', 'Review MCP server error handling');
      }
      resolve();
    });
    
    // Send initialization request
    child.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {}
    }) + '\n');
    
    setTimeout(() => child.stdin.end(), 1000);
  });
}

async function generateBugReport() {
  console.log('\n🐛 BUG ANALYSIS');
  console.log('================');
  
  if (diagnosticResults.bugs.length === 0) {
    console.log('✅ No bugs found!');
    return;
  }
  
  const bugsBySeverity = {
    critical: diagnosticResults.bugs.filter(b => b.severity === 'critical'),
    high: diagnosticResults.bugs.filter(b => b.severity === 'high'),
    medium: diagnosticResults.bugs.filter(b => b.severity === 'medium'),
    low: diagnosticResults.bugs.filter(b => b.severity === 'low')
  };
  
  Object.keys(bugsBySeverity).forEach(severity => {
    if (bugsBySeverity[severity].length > 0) {
      console.log(`\n${severity.toUpperCase()} PRIORITY (${bugsBySeverity[severity].length} bugs):`);
      bugsBySeverity[severity].forEach((bug, i) => {
        console.log(`${i + 1}. [${bug.category}] ${bug.description}`);
        console.log(`   Fix: ${bug.fix}`);
      });
    }
  });
  
  console.log(`\n📊 TOTAL BUGS FOUND: ${diagnosticResults.bugs.length}`);
}

async function runFullDiagnostic() {
  await checkEnvironment();
  await checkBuildSystem();
  await checkModules();
  await checkBackendAPIs();
  await checkClaudetteFunctionality();
  await checkMCPServer();
  await generateBugReport();
  
  // Save complete diagnostic report
  fs.writeFileSync('diagnostic-report.json', JSON.stringify(diagnosticResults, null, 2));
  console.log('\n📄 Complete diagnostic saved to diagnostic-report.json');
  
  // Determine overall system health
  const criticalBugs = diagnosticResults.bugs.filter(b => b.severity === 'critical').length;
  const highBugs = diagnosticResults.bugs.filter(b => b.severity === 'high').length;
  
  console.log('\n🎯 SYSTEM HEALTH ASSESSMENT');
  console.log('============================');
  
  if (criticalBugs > 0) {
    console.log('❌ CRITICAL ISSUES FOUND - System not production ready');
  } else if (highBugs > 0) {
    console.log('⚠️ HIGH PRIORITY ISSUES FOUND - Fix recommended before production');
  } else {
    console.log('✅ SYSTEM HEALTHY - Minor issues only');
  }
  
  console.log(`Critical bugs: ${criticalBugs}`);
  console.log(`High priority bugs: ${highBugs}`);
  console.log(`Total bugs: ${diagnosticResults.bugs.length}`);
}

runFullDiagnostic().catch(error => {
  console.error('❌ Diagnostic failed:', error);
  process.exit(1);
});