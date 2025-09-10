#!/usr/bin/env node

console.log('🔍 DEBUGGING COST CALCULATION ISSUE');
console.log('===================================');

require('dotenv').config();

async function debugCostCalculation() {
  try {
    const { Claudette } = require('./dist/index.js');
    
    const claudette = new Claudette({
      openai: { apiKey: process.env.OPENAI_API_KEY }
    });
    
    await claudette.initialize();
    
    // Access internal router to check backend configurations
    const router = claudette.router;
    const backends = router.backends;
    
    console.log('\n🔧 Backend Cost Configuration:');
    console.log('------------------------------');
    
    Object.entries(backends).forEach(([name, backend]) => {
      console.log(`\n${name.toUpperCase()} Backend:`);
      if (backend.config) {
        console.log(`  cost_per_token: ${backend.config.cost_per_token || 'UNDEFINED'}`);
        console.log(`  estimateCost(1000): ${backend.estimateCost ? backend.estimateCost(1000) : 'NO METHOD'}`);
        console.log(`  Backend type: ${backend.constructor.name}`);
      } else {
        console.log('  No config found');
      }
    });
    
    // Test cost calculation manually
    console.log('\n🧮 Manual Cost Calculation Test:');
    console.log('---------------------------------');
    
    const testTokens = 1000;
    Object.entries(backends).forEach(([name, backend]) => {
      try {
        if (backend.estimateCost) {
          const cost = backend.estimateCost(testTokens);
          console.log(`${name}: ${testTokens} tokens = €${cost}`);
          
          if (cost === 0 || cost === undefined || isNaN(cost)) {
            console.log(`  ⚠️ PROBLEM: ${name} returns invalid cost: ${cost}`);
          }
        }
      } catch (error) {
        console.log(`${name}: ERROR - ${error.message}`);
      }
    });
    
    // Test actual query to see cost calculation in action
    console.log('\n🚀 Live Cost Calculation Test:');
    console.log('------------------------------');
    
    const result = await claudette.optimize('Count to 5', [], { timeout: 30000 });
    
    if (result) {
      console.log(`Response: "${result.content}"`);
      console.log(`Backend used: ${result.backend_used}`);
      console.log(`Tokens: ${result.tokens_input} → ${result.tokens_output} = ${result.tokens_input + result.tokens_output} total`);
      console.log(`Cost EUR: ${result.cost_eur}`);
      console.log(`Cost type: ${typeof result.cost_eur}`);
      console.log(`Cost is valid: ${!!(result.cost_eur && result.cost_eur > 0)}`);
      
      // Check the backend that was used
      const usedBackend = backends[result.backend_used];
      if (usedBackend) {
        console.log('\nUsed Backend Analysis:');
        const manualCost = usedBackend.estimateCost(result.tokens_input + result.tokens_output);
        console.log(`  Manual calculation: €${manualCost}`);
        console.log(`  Config cost_per_token: ${usedBackend.config?.cost_per_token}`);
      }
      
      if (result.cost_eur === undefined || result.cost_eur === 0 || result.cost_eur === null) {
        console.log('\n🐛 BUG CONFIRMED: Cost calculation is not working');
        
        // Try to identify the issue
        const usedBackend = backends[result.backend_used];
        if (usedBackend && usedBackend.config) {
          if (!usedBackend.config.cost_per_token) {
            console.log('   Root cause: cost_per_token not set in backend config');
            console.log('   Fix: Set cost_per_token in backend configuration');
          } else {
            console.log('   Root cause: Unknown - cost_per_token is set but calculation fails');
          }
        }
      } else {
        console.log('\n✅ Cost calculation is working correctly');
      }
      
    } else {
      console.log('Query failed - cannot test cost calculation');
    }
    
  } catch (error) {
    console.error('Debug failed:', error);
  }
}

debugCostCalculation();