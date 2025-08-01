
const path = require('path');
process.env.OPENAI_API_KEY = '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';

// Import from compiled JavaScript
const { BaseBackend } = require('./dist/backends/base.js');

// Create a simple test backend
class TestBackend extends BaseBackend {
  constructor(config) {
    super('test-openai', config);
  }

  async healthCheck() {
    return true;
  }

  async sendRequest(request) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: request.prompt }],
        max_tokens: request.options?.max_tokens || 50
      })
    });

    if (!response.ok) {
      throw new Error('API request failed: ' + response.status);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    return this.createSuccessResponse(
      content,
      data.usage.prompt_tokens,
      data.usage.completion_tokens,
      0 // latency will be calculated by parent
    );
  }
}

async function test() {
  const backend = new TestBackend({
    enabled: true,
    priority: 1,
    cost_per_token: 0.000002,
    model: 'gpt-4o-mini'
  });

  const response = await backend.send({
    prompt: 'What is the capital of Spain?',
    files: [],
    options: { max_tokens: 50 }
  });

  console.log('📤 Response:', response.content);
  console.log('💰 Cost: €' + response.cost_eur.toFixed(6));
  console.log('📊 Tokens:', response.tokens_input + response.tokens_output);
  
  return response.content.toLowerCase().includes('madrid');
}

test().then(success => {
  console.log('✅ Backend test result:', success ? 'PASSED' : 'FAILED');
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Backend test error:', error.message);
  process.exit(1);
});
