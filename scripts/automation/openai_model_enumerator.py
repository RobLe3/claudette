#!/usr/bin/env python3
"""
OpenAI Model Enumerator - List and test available models
"""

import asyncio
import aiohttp
import json
import sys
from pathlib import Path

# Add to path for imports
sys.path.append(str(Path(__file__).parent))
from secure_key_manager import SecureKeyManager

class OpenAIModelEnumerator:
    """Enumerate and test available OpenAI models"""
    
    def __init__(self):
        self.key_manager = SecureKeyManager()
        self.api_key = self.key_manager.retrieve_api_key('openai')
        
    async def list_models(self) -> dict:
        """List all available OpenAI models"""
        if not self.api_key:
            return {'error': 'No OpenAI API key configured'}
            
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    'https://api.openai.com/v1/models',
                    headers={'Authorization': f'Bearer {self.api_key}'}
                ) as response:
                    result = await response.json()
                    
                    if response.status == 200:
                        return result
                    else:
                        return {'error': f'API error: {result}'}
                        
        except Exception as e:
            return {'error': f'Request failed: {str(e)}'}
    
    async def test_model(self, model_name: str, test_prompt: str = "Say 'Hello' in one word") -> dict:
        """Test a specific model with a simple prompt"""
        if not self.api_key:
            return {'error': 'No OpenAI API key configured'}
            
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    'https://api.openai.com/v1/chat/completions',
                    headers={
                        'Authorization': f'Bearer {self.api_key}',
                        'Content-Type': 'application/json'
                    },
                    json={
                        'model': model_name,
                        'messages': [{'role': 'user', 'content': test_prompt}],
                        'max_tokens': 10,
                        'temperature': 0
                    }
                ) as response:
                    result = await response.json()
                    
                    if response.status == 200:
                        return {
                            'success': True,
                            'model': model_name,
                            'response': result['choices'][0]['message']['content'],
                            'tokens_used': result.get('usage', {}).get('total_tokens', 0),
                            'cost_estimate': self._estimate_cost(model_name, result.get('usage', {}).get('total_tokens', 0))
                        }
                    else:
                        return {
                            'success': False,
                            'model': model_name,
                            'error': result.get('error', {}).get('message', 'Unknown error')
                        }
                        
        except Exception as e:
            return {
                'success': False,
                'model': model_name,
                'error': f'Request failed: {str(e)}'
            }
    
    def _estimate_cost(self, model_name: str, tokens: int) -> float:
        """Estimate cost for model usage"""
        costs_per_1k = {
            'gpt-4': 0.03,
            'gpt-4-turbo': 0.01,
            'gpt-3.5-turbo': 0.0005,
            'gpt-3.5-turbo-16k': 0.001
        }
        
        # Default cost if model not in list
        default_cost = 0.002
        
        for model_prefix, cost in costs_per_1k.items():
            if model_name.startswith(model_prefix):
                return (tokens / 1000) * cost
                
        return (tokens / 1000) * default_cost
    
    def categorize_models(self, models_data: dict) -> dict:
        """Categorize models by type and capability"""
        if 'error' in models_data:
            return models_data
            
        categories = {
            'chat_models': [],
            'text_models': [],
            'embedding_models': [],
            'image_models': [],
            'audio_models': [],
            'other_models': []
        }
        
        for model in models_data.get('data', []):
            model_id = model.get('id', '')
            
            if 'gpt-' in model_id and ('3.5' in model_id or '4' in model_id):
                categories['chat_models'].append({
                    'id': model_id,
                    'owned_by': model.get('owned_by', 'openai'),
                    'created': model.get('created', 0)
                })
            elif 'text-' in model_id:
                categories['text_models'].append({
                    'id': model_id,
                    'owned_by': model.get('owned_by', 'openai')
                })
            elif 'embedding' in model_id:
                categories['embedding_models'].append({
                    'id': model_id,
                    'owned_by': model.get('owned_by', 'openai')
                })
            elif 'dall-e' in model_id or 'image' in model_id:
                categories['image_models'].append({
                    'id': model_id,
                    'owned_by': model.get('owned_by', 'openai')
                })
            elif 'whisper' in model_id or 'tts' in model_id:
                categories['audio_models'].append({
                    'id': model_id,
                    'owned_by': model.get('owned_by', 'openai')
                })
            else:
                categories['other_models'].append({
                    'id': model_id,
                    'owned_by': model.get('owned_by', 'openai')
                })
        
        return categories
    
    async def test_recommended_models(self) -> dict:
        """Test the recommended models for Claude Code integration"""
        recommended_models = [
            'gpt-3.5-turbo',
            'gpt-4',
            'gpt-4-turbo'
        ]
        
        test_results = {}
        
        for model in recommended_models:
            print(f"🧪 Testing {model}...")
            result = await self.test_model(model, "Write 'def hello(): return \"Hello\"' in one line")
            test_results[model] = result
            
        return test_results
    
    def generate_model_report(self, categories: dict, test_results: dict = None) -> str:
        """Generate comprehensive model report"""
        
        report = """
╭─────────────────────────────────────────────────────────╮
│                🤖 OPENAI MODELS AVAILABLE                │
├─────────────────────────────────────────────────────────┤
│                                                         │
"""
        
        # Chat models (most important for Claude Code)
        if categories.get('chat_models'):
            report += f"│  💬 CHAT MODELS ({len(categories['chat_models'])} available)                │\n"
            for model in categories['chat_models'][:5]:  # Show top 5
                model_name = model['id'][:45] + '...' if len(model['id']) > 45 else model['id']
                report += f"│     • {model_name:<45}        │\n"
            if len(categories['chat_models']) > 5:
                report += f"│     ... and {len(categories['chat_models']) - 5} more models                        │\n"
            report += "│                                                         │\n"
        
        # Test results
        if test_results:
            report += "│  🧪 MODEL TESTING RESULTS                              │\n"
            for model, result in test_results.items():
                status = "✅" if result.get('success') else "❌"
                cost = f"${result.get('cost_estimate', 0):.6f}" if result.get('success') else "N/A"
                report += f"│     {status} {model:<20} Cost: {cost:<12}        │\n"
            report += "│                                                         │\n"
        
        # Other categories
        for category, models in categories.items():
            if category != 'chat_models' and models:
                category_name = category.replace('_', ' ').title()
                report += f"│  📋 {category_name:<25} ({len(models)} available)       │\n"
        
        report += "│                                                         │\n"
        report += "╰─────────────────────────────────────────────────────────╯"
        
        return report

async def main():
    """Main CLI interface"""
    enumerator = OpenAIModelEnumerator()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "list":
            print("🔍 Fetching available OpenAI models...")
            models = await enumerator.list_models()
            if 'error' in models:
                print(f"❌ Error: {models['error']}")
            else:
                categories = enumerator.categorize_models(models)
                print(enumerator.generate_model_report(categories))
                
        elif command == "test":
            model_name = sys.argv[2] if len(sys.argv) > 2 else "gpt-3.5-turbo"
            test_prompt = " ".join(sys.argv[3:]) if len(sys.argv) > 3 else "Say hello"
            
            print(f"🧪 Testing model: {model_name}")
            result = await enumerator.test_model(model_name, test_prompt)
            print(json.dumps(result, indent=2))
            
        elif command == "test-recommended":
            print("🧪 Testing recommended models for Claude Code integration...")
            test_results = await enumerator.test_recommended_models()
            
            models = await enumerator.list_models()
            categories = enumerator.categorize_models(models)
            
            print(enumerator.generate_model_report(categories, test_results))
            
        elif command == "full":
            print("🔍 Full model analysis...")
            models = await enumerator.list_models()
            categories = enumerator.categorize_models(models)
            test_results = await enumerator.test_recommended_models()
            
            print(enumerator.generate_model_report(categories, test_results))
            print("\n📊 DETAILED RESULTS:")
            print(json.dumps({
                'categories': categories,
                'test_results': test_results
            }, indent=2))
            
        else:
            print("Commands: list, test [model] [prompt], test-recommended, full")
    else:
        print("🤖 OpenAI Model Enumerator")
        print("Commands:")
        print("  list - List all available models")
        print("  test [model] [prompt] - Test specific model")
        print("  test-recommended - Test recommended models")
        print("  full - Complete analysis")

if __name__ == "__main__":
    asyncio.run(main())