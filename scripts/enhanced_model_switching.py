#!/usr/bin/env python3
"""
Enhanced Dynamic Model Switching for ChatGPT Offloading
Intelligently selects optimal model based on task complexity and cost constraints
"""

import re
import json
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from enum import Enum

class ModelTier(Enum):
    """Model performance tiers for intelligent selection"""
    BASIC = "basic"           # GPT-3.5-turbo, o3-mini
    ADVANCED = "advanced"     # GPT-4o-mini, GPT-4o
    PREMIUM = "premium"       # GPT-4, o4-mini
    FLAGSHIP = "flagship"     # GPT-4.1, o-series advanced

class TaskComplexity(Enum):
    """Task complexity levels for model matching"""
    TRIVIAL = 1      # Simple text, basic code
    SIMPLE = 2       # Standard code generation, docs
    MODERATE = 3     # Complex logic, analysis
    COMPLEX = 4      # Advanced reasoning, architecture
    CRITICAL = 5     # Security, performance-critical tasks

class EnhancedModelSelector:
    """Intelligent model selection based on task complexity and cost optimization"""
    
    def __init__(self):
        # Updated 2025 OpenAI model specifications
        self.models = {
            # BASIC TIER - Cost Optimized
            'gpt-3.5-turbo': {
                'tier': ModelTier.BASIC,
                'input_cost_per_1k': 0.0005,   # $0.50 per 1M tokens
                'output_cost_per_1k': 0.0015,  # $1.50 per 1M tokens
                'context_window': 16000,
                'capabilities': ['text', 'basic_reasoning'],
                'strengths': ['speed', 'cost', 'simple_tasks'],
                'max_complexity': TaskComplexity.SIMPLE,  # FIXED: Limited to SIMPLE tasks only
                'quality_score': 7.0
            },
            'o3-mini': {
                'tier': ModelTier.BASIC,
                'input_cost_per_1k': 0.0008,   # Estimated based on o-series pricing
                'output_cost_per_1k': 0.0024,
                'context_window': 200000,      # 200K context window
                'capabilities': ['text', 'reasoning', 'large_context'],
                'strengths': ['reasoning', 'context', 'cost_effective'],
                'max_complexity': TaskComplexity.TRIVIAL,  # FIXED: Keep basic models for trivial tasks only
                'quality_score': 8.5
            },
            
            # ADVANCED TIER - Balanced Performance
            'gpt-4o-mini': {
                'tier': ModelTier.ADVANCED,
                'input_cost_per_1k': 0.00015,  # 60% cheaper than GPT-4o
                'output_cost_per_1k': 0.0006,
                'context_window': 128000,
                'capabilities': ['text', 'vision', 'multimodal', 'reasoning'],
                'strengths': ['multimodal', 'reasoning', 'cost_effective'],
                'max_complexity': TaskComplexity.MODERATE,  # FIXED: Can handle up to MODERATE
                'quality_score': 8.8
            },
            'gpt-4o': {
                'tier': ModelTier.PREMIUM,  # FIXED: Upgraded to PREMIUM tier for better complex task handling
                'input_cost_per_1k': 0.005,    # $5 per 1M tokens
                'output_cost_per_1k': 0.020,   # $20 per 1M tokens
                'context_window': 128000,
                'capabilities': ['text', 'vision', 'multimodal', 'advanced_reasoning'],
                'strengths': ['multimodal', 'large_context', 'balanced_performance'],
                'max_complexity': TaskComplexity.COMPLEX,
                'quality_score': 9.2
            },
            
            # PREMIUM TIER - High Performance
            'gpt-4': {
                'tier': ModelTier.PREMIUM,
                'input_cost_per_1k': 0.030,    # $30 per 1M tokens
                'output_cost_per_1k': 0.060,   # $60 per 1M tokens
                'context_window': 32000,
                'capabilities': ['text', 'advanced_reasoning', 'complex_analysis'],
                'strengths': ['reasoning', 'analysis', 'problem_solving'],
                'max_complexity': TaskComplexity.COMPLEX,
                'quality_score': 9.5
            },
            'o4-mini': {
                'tier': ModelTier.PREMIUM,
                'input_cost_per_1k': 0.008,    # Estimated premium pricing
                'output_cost_per_1k': 0.024,
                'context_window': 200000,
                'capabilities': ['text', 'reasoning', 'math', 'coding', 'visual'],
                'strengths': ['reasoning', 'math', 'coding', 'large_context'],
                'max_complexity': TaskComplexity.COMPLEX,
                'quality_score': 9.7
            },
            
            # FLAGSHIP TIER - Maximum Capability
            'gpt-4.1': {
                'tier': ModelTier.FLAGSHIP,
                'input_cost_per_1k': 0.050,    # Estimated flagship pricing
                'output_cost_per_1k': 0.100,
                'context_window': 1000000,     # 1M token context
                'capabilities': ['text', 'advanced_reasoning', 'creative_tasks', 'agentic_planning'],
                'strengths': ['creativity', 'planning', 'massive_context', 'world_knowledge'],
                'max_complexity': TaskComplexity.CRITICAL,
                'quality_score': 9.9
            }
        }
        
        # FIXED: Enhanced task classification with improved patterns and semantic scoring
        self.task_patterns = {
            # TRIVIAL (Complexity 1) - Use cheapest models
            'trivial_tasks': {
                'patterns': [
                    # Very specific patterns for TRIVIAL tasks
                    r'^(write|create|print)\s+(a\s+)?hello\s+world',
                    r'^(simple|basic)\s+(print|variable|string)',
                    r'^(convert|format|replace)\s+(text|string)\s+(to|with)',
                    r'^(show|display|output)\s+.*text',
                    r'^(basic|simple)\s+(math|calculation)',
                    r'^(get|set)\s+(variable|property)',
                    r'^(print|echo|output)\s+["\'].*["\']'
                ],
                'keywords': ['hello', 'world', 'print', 'echo', 'simple', 'basic', 'trivial'],
                'anti_keywords': ['complex', 'advanced', 'system', 'architecture', 'security', 'api'],
                'complexity': TaskComplexity.TRIVIAL,
                'quality_requirement': 6.0,
                'max_cost_per_1k': 0.001
            },
            
            # SIMPLE (Complexity 2) - Basic coding and docs
            'simple_code_generation': {
                'patterns': [
                    r'^(write|create|implement)\s+(a\s+)?(simple|basic|small)\s+(function|method|class)',
                    r'^(create|write|generate)\s+(a\s+)?(script|program)\s+that',
                    r'^(implement|code|write)\s+(basic|simple)\s+(algorithm|logic)',
                    r'^(implement)\s+(simple)\s+(sorting|search)\s+(algorithm)',
                    r'^(create|build)\s+(a\s+)?(simple|basic)\s+(component|module)',
                    r'^(write|create)\s+(unit|simple)\s+test',
                    r'^(parse|process)\s+(simple|basic)\s+(data|input)'
                ],
                'keywords': ['function', 'method', 'class', 'script', 'simple', 'basic', 'single', 'sorting'],
                'anti_keywords': ['complex', 'advanced', 'distributed', 'microservices', 'architecture'],
                'complexity': TaskComplexity.SIMPLE,
                'quality_requirement': 7.5,
                'max_cost_per_1k': 0.002
            },
            'documentation_tasks': {
                'patterns': [
                    r'^(write|create|generate)\s+(documentation|docs|readme)',
                    r'^(create)\s+(a\s+)?(readme)\s+(file)',
                    r'^(document|explain)\s+(this|the)\s+(code|function|class)',
                    r'^(create|write)\s+(a\s+)?(guide|tutorial|example)',
                    r'^(add|write)\s+(comments|docstrings)\s+to',
                    r'^(explain|describe)\s+(how\s+to|what)',
                    r'^(usage|example)\s+(of|for)'
                ],
                'keywords': ['documentation', 'docs', 'readme', 'guide', 'tutorial', 'comments', 'explain'],
                'anti_keywords': ['implement', 'build', 'develop', 'algorithm', 'system'],
                'complexity': TaskComplexity.SIMPLE,
                'quality_requirement': 7.0,
                'max_cost_per_1k': 0.002
            },
            
            # MODERATE (Complexity 3) - Complex logic and analysis
            'moderate_code_generation': {
                'patterns': [
                    r'^(create|build|implement)\s+(a\s+)?(rest|api|endpoint)',
                    r'^(develop|build|create)\s+(application|feature|module)',
                    r'^(implement)\s+(authentication|auth)\s+(system)',
                    r'^(implement|code|write)\s+(algorithm|logic|workflow)',
                    r'^(create|build)\s+(database|schema|model)',
                    r'^(optimize|improve|refactor)\s+(code|performance)',
                    r'^(integrate|connect)\s+.*\s+(with|to)\s+.*'
                ],
                'keywords': ['api', 'endpoint', 'application', 'authentication', 'database', 'integration'],
                'anti_keywords': ['trivial', 'simple', 'hello', 'basic', 'print'],
                'complexity': TaskComplexity.MODERATE,
                'quality_requirement': 8.5,
                'max_cost_per_1k': 0.010
            },
            'analysis_tasks': {
                'patterns': [
                    r'^(analyze|review|examine)\s+(code|architecture|design)',
                    r'^(debug|troubleshoot|fix)\s+(complex|issue|problem)',
                    r'^(find|identify|locate)\s+(performance|bottleneck|issue)',
                    r'^(optimize|improve)\s+(system|performance|efficiency)',
                    r'^(refactor|restructure|reorganize)\s+(code|codebase)',
                    r'^(compare|evaluate)\s+(solutions|approaches|technologies)'
                ],
                'keywords': ['analyze', 'review', 'debug', 'optimize', 'performance', 'refactor'],
                'anti_keywords': ['security', 'vulnerability', 'critical', 'mission'],
                'complexity': TaskComplexity.MODERATE,
                'quality_requirement': 8.8,
                'max_cost_per_1k': 0.015
            },
            
            # COMPLEX (Complexity 4) - Advanced reasoning
            'advanced_design': {
                'patterns': [
                    r'^(architect|design)\s+(system|microservices|infrastructure)',
                    r'^(plan|design)\s+(distributed|scalable)\s+(system|architecture)',
                    r'^(create|build|design)\s+(framework|platform|architecture)',
                    r'^(implement|design)\s+(complex|advanced)\s+(system|solution)',
                    r'^(design|architect)\s+(database|data)\s+(architecture|model)',
                    r'^(distributed|microservices|enterprise)\s+(system|architecture)'
                ],
                'keywords': ['architecture', 'microservices', 'distributed', 'scalable', 'framework', 'enterprise'],
                'anti_keywords': ['simple', 'basic', 'hello', 'trivial'],
                'complexity': TaskComplexity.COMPLEX,
                'quality_requirement': 9.0,
                'max_cost_per_1k': 0.030
            },
            'research_tasks': {
                'patterns': [
                    r'^(research|investigate|study)\s+(advanced|complex|emerging)',
                    r'^(analyze|examine)\s+(trends|patterns|technologies)',
                    r'^(compare|evaluate|assess)\s+(multiple|various)\s+(technologies|solutions)',
                    r'^(technical|in-depth)\s+(analysis|research|investigation)',
                    r'^(machine\s+learning|ai|artificial\s+intelligence)',
                    r'^(deep\s+dive|comprehensive)\s+(analysis|study)'
                ],
                'keywords': ['research', 'advanced', 'trends', 'technical', 'machine learning', 'ai'],
                'anti_keywords': ['simple', 'basic', 'hello', 'print'],
                'complexity': TaskComplexity.COMPLEX,
                'quality_requirement': 9.2,
                'max_cost_per_1k': 0.025
            },
            
            # CRITICAL (Complexity 5) - Mission critical tasks
            'security_tasks': {
                'patterns': [
                    r'^(security|vulnerability)\s+(analysis|assessment|audit)',
                    r'^(penetration|pen)\s+(test|testing)',
                    r'^(threat|risk)\s+(modeling|assessment|analysis)',
                    r'^(cryptographic|encryption)\s+(implementation|design)',
                    r'^(secure|security)\s+(design|architecture|implementation)',
                    r'^(analyze|check|scan)\s+.*\s+(security|vulnerabilities)',
                    r'^(financial|banking|payment)\s+(system|security)'
                ],
                'keywords': ['security', 'vulnerability', 'penetration', 'threat', 'cryptographic', 'encryption'],
                'anti_keywords': ['simple', 'basic', 'hello'],
                'complexity': TaskComplexity.CRITICAL,
                'quality_requirement': 9.8,
                'max_cost_per_1k': 0.100
            },
            'critical_systems': {
                'patterns': [
                    r'^(mission|business)\s+critical\s+(system|application)',
                    r'^(high|maximum)\s+(availability|uptime)\s+(system|design)',
                    r'^(fault|failure)\s+(tolerant|resistant)\s+(system|design)',
                    r'^(real[-\s]?time|realtime)\s+(system|processing|application)',
                    r'^(safety|life)\s+critical\s+(system|software)',
                    r'^(financial|banking|trading)\s+(system|platform|algorithm)',
                    r'^(disaster|backup)\s+(recovery|system)'
                ],
                'keywords': ['critical', 'availability', 'fault tolerant', 'real-time', 'safety', 'financial'],
                'anti_keywords': ['simple', 'basic', 'hello', 'trivial'],
                'complexity': TaskComplexity.CRITICAL,
                'quality_requirement': 9.9,
                'max_cost_per_1k': 0.100
            }
        }
        
        # Budget management
        self.budget_limits = {
            'daily_budget': 10.0,    # $10/day default
            'hourly_budget': 2.0,    # $2/hour max
            'single_task_max': 1.0,  # $1 per task max
            'emergency_threshold': 0.1  # Allow expensive models for <10% of budget
        }
        
        # Performance tracking
        self.performance_history = {}
        
    def classify_task(self, task_description: str, context_size: int = 0) -> Dict[str, Any]:
        """FIXED: Classify task with improved semantic analysis and higher accuracy"""
        task_lower = task_description.lower().strip()
        
        # Enhanced pattern matching with semantic scoring
        best_match = None
        highest_score = 0.0
        classification_scores = {}
        
        for task_type, config in self.task_patterns.items():
            total_score = 0.0
            pattern_matches = 0
            
            # 1. Pattern matching (60% weight)
            for pattern in config['patterns']:
                if re.search(pattern, task_lower):
                    pattern_matches += 1
                    # Stronger scoring for exact matches
                    match_strength = len(re.findall(pattern, task_lower))
                    total_score += match_strength * 0.6
            
            # 2. Keyword presence scoring (25% weight)
            if 'keywords' in config:
                keyword_matches = 0
                for keyword in config['keywords']:
                    if keyword.lower() in task_lower:
                        keyword_matches += 1
                        total_score += 0.25
                
                # Bonus for multiple keyword matches
                if keyword_matches > 1:
                    total_score += (keyword_matches - 1) * 0.1
            
            # 3. Anti-keyword penalty (15% weight)
            if 'anti_keywords' in config:
                for anti_keyword in config['anti_keywords']:
                    if anti_keyword.lower() in task_lower:
                        total_score -= 0.15  # Penalty for conflicting keywords
            
            # 4. Task length and complexity hints
            task_length_factor = min(len(task_description.split()) / 10, 1.0)
            if config['complexity'] == TaskComplexity.TRIVIAL and task_length_factor > 0.5:
                total_score -= 0.2  # Long tasks are less likely to be trivial
            elif config['complexity'] == TaskComplexity.CRITICAL and task_length_factor < 0.3:
                total_score -= 0.2  # Short tasks are less likely to be critical
            
            classification_scores[task_type] = total_score
            
            if total_score > highest_score:
                highest_score = total_score
                best_match = (task_type, config)
        
        # Enhanced fallback logic
        if not best_match or highest_score < 0.3:
            # Analyze task characteristics for better default classification
            if any(word in task_lower for word in ['hello', 'world', 'print', 'simple', 'basic']):
                complexity = TaskComplexity.TRIVIAL
                quality_req = 6.0
            elif any(word in task_lower for word in ['security', 'vulnerability', 'critical', 'financial']):
                complexity = TaskComplexity.CRITICAL
                quality_req = 9.8
            elif any(word in task_lower for word in ['architecture', 'design', 'system', 'framework']):
                complexity = TaskComplexity.COMPLEX
                quality_req = 9.0
            else:
                complexity = TaskComplexity.MODERATE
                quality_req = 8.0
                
            best_match = ('intelligent_fallback', {
                'complexity': complexity,
                'quality_requirement': quality_req,
                'max_cost_per_1k': 0.005
            })
            highest_score = 0.4
        
        task_type, task_config = best_match
        
        # Enhanced context size adjustment
        base_complexity = task_config['complexity']
        adjusted_complexity = base_complexity
        
        # More nuanced context size impact
        if context_size > 100000:  # Very large context
            adjusted_complexity = TaskComplexity(min(5, base_complexity.value + 2))
        elif context_size > 50000:  # Large context
            adjusted_complexity = TaskComplexity(min(5, base_complexity.value + 1))
        elif context_size > 20000:  # Medium context  
            if base_complexity == TaskComplexity.TRIVIAL:
                adjusted_complexity = TaskComplexity.SIMPLE
        
        # Calculate confidence based on score and classification certainty
        confidence = min(highest_score / 2.0, 0.95)  # Cap at 95%
        if highest_score > 1.5:
            confidence = min(0.90 + (highest_score - 1.5) * 0.05, 0.98)
        
        return {
            'task_type': task_type,
            'complexity': adjusted_complexity,
            'base_complexity': base_complexity,
            'quality_requirement': task_config['quality_requirement'],
            'max_cost_per_1k': task_config['max_cost_per_1k'],
            'confidence': confidence,
            'context_size': context_size,
            'classification_scores': classification_scores,
            'score': highest_score
        }
    
    def select_optimal_model(self, task_classification: Dict[str, Any], 
                           current_budget_used: float = 0.0) -> Dict[str, Any]:
        """Select the optimal model based on task requirements and budget"""
        
        complexity = task_classification['complexity']
        quality_req = task_classification['quality_requirement']
        max_cost = task_classification['max_cost_per_1k']
        context_size = task_classification['context_size']
        
        # FIXED: Filter models by capability with strict quality enforcement
        suitable_models = []
        
        for model_name, model_config in self.models.items():
            # Check if model can handle the complexity
            if model_config['max_complexity'].value >= complexity.value:
                # FIXED: Strict quality requirement enforcement
                if model_config['quality_score'] >= quality_req:
                    # Check context window
                    if model_config['context_window'] >= context_size:
                        suitable_models.append((model_name, model_config))
        
        if not suitable_models:
            # Fallback to Claude if no suitable model found
            return {
                'recommendation': 'claude_fallback',
                'reason': f'No ChatGPT model meets quality requirement {quality_req:.1f} for {complexity.name} task'
            }
        
        # FIXED: Budget-aware selection with proper emergency mode
        budget_remaining = self.budget_limits['daily_budget'] - current_budget_used
        emergency_budget = self.budget_limits['daily_budget'] * self.budget_limits['emergency_threshold']
        
        # FIXED: Quality-first selection for complex/critical tasks
        def quality_first_sort(model_tuple):
            name, config = model_tuple
            # For complex tasks, prioritize quality score first, then cost
            return (config['quality_score'], -((config['input_cost_per_1k'] + config['output_cost_per_1k']) / 2))
        
        def cost_first_sort(model_tuple):
            name, config = model_tuple
            # For budget-constrained scenarios, prioritize cost, then quality
            avg_cost = (config['input_cost_per_1k'] + config['output_cost_per_1k']) / 2
            return (avg_cost, -config['quality_score'])
        
        def balanced_sort(model_tuple):
            name, config = model_tuple
            # Only for TRIVIAL/SIMPLE tasks - balance cost and quality
            avg_cost = (config['input_cost_per_1k'] + config['output_cost_per_1k']) / 2
            if avg_cost == 0:
                return float('inf')  # Avoid division by zero
            return -(config['quality_score'] / avg_cost)  # Negative for descending sort
        
        # FIXED: Priority selection logic with proper emergency mode and cost optimization
        if complexity == TaskComplexity.CRITICAL:
            # CRITICAL tasks ALWAYS get highest quality, budget permitting
            if budget_remaining > emergency_budget or current_budget_used < self.budget_limits['daily_budget'] * 0.95:
                suitable_models.sort(key=quality_first_sort, reverse=True)
            else:
                # Even in emergency, try to give critical tasks good models
                suitable_models.sort(key=lambda x: x[1]['quality_score'], reverse=True)
                
        elif complexity == TaskComplexity.COMPLEX:
            # COMPLEX tasks prioritize quality over cost
            suitable_models.sort(key=quality_first_sort, reverse=True)
            
        elif budget_remaining < emergency_budget:
            # Low budget: prioritize cost but still respect quality minimums
            suitable_models.sort(key=cost_first_sort)
            
        elif complexity in [TaskComplexity.TRIVIAL]:
            # TRIVIAL tasks: strongly prefer cost optimization
            suitable_models.sort(key=cost_first_sort)
            
        elif complexity in [TaskComplexity.SIMPLE]:
            # SIMPLE tasks: balanced cost-effectiveness
            suitable_models.sort(key=balanced_sort)
            
        else:
            # MODERATE tasks: quality-cost balance with slight cost preference
            def moderate_sort(model_tuple):
                name, config = model_tuple
                # For moderate tasks, balance quality and cost but prefer advanced tier
                tier_preference = {'basic': 0, 'advanced': 1, 'premium': 0.8, 'flagship': 0.5}
                tier_bonus = tier_preference.get(config['tier'].value, 0)
                avg_cost = (config['input_cost_per_1k'] + config['output_cost_per_1k']) / 2
                if avg_cost == 0:
                    cost_factor = 1
                else:
                    cost_factor = 1 / avg_cost  # Higher for cheaper models
                return (config['quality_score'] * (1 + tier_bonus), cost_factor)
            
            suitable_models.sort(key=moderate_sort, reverse=True)
        
        selected_model_name, selected_model = suitable_models[0]
        
        # FIXED: Improved cost estimation
        estimated_tokens = self._estimate_tokens(task_classification)
        # More realistic token split: 60% input, 40% output for generation tasks
        input_tokens = estimated_tokens * 0.6
        output_tokens = estimated_tokens * 0.4
        estimated_cost = (
            (input_tokens / 1000) * selected_model['input_cost_per_1k'] +
            (output_tokens / 1000) * selected_model['output_cost_per_1k']
        )
        
        # FIXED: Final budget check with emergency override for critical tasks
        if estimated_cost > self.budget_limits['single_task_max']:
            if complexity.value < TaskComplexity.CRITICAL.value:
                return {
                    'recommendation': 'claude_fallback',
                    'reason': f'Estimated cost ${estimated_cost:.4f} exceeds single task limit ${self.budget_limits["single_task_max"]:.2f}'
                }
            elif complexity == TaskComplexity.CRITICAL and estimated_cost > self.budget_limits['single_task_max'] * 2:
                # Even critical tasks have limits - but higher threshold
                return {
                    'recommendation': 'claude_fallback',
                    'reason': f'Critical task cost ${estimated_cost:.4f} exceeds emergency limit ${self.budget_limits["single_task_max"] * 2:.2f}'
                }
        
        return {
            'recommendation': 'offload',
            'model': selected_model_name,
            'tier': selected_model['tier'].value,
            'estimated_cost': estimated_cost,
            'quality_score': selected_model['quality_score'],
            'reasoning': f"Quality-first selection: {selected_model['tier'].value} tier model for {complexity.name} complexity (quality: {selected_model['quality_score']:.1f})",
            'max_tokens': min(4000, selected_model['context_window'] // 4),  # Conservative token limit
            'capabilities': selected_model['capabilities'],
            'context_window': selected_model['context_window']
        }
    
    def _estimate_tokens(self, task_classification: Dict[str, Any]) -> int:
        """Estimate tokens needed based on task complexity"""
        base_tokens = {
            TaskComplexity.TRIVIAL: 200,
            TaskComplexity.SIMPLE: 800,
            TaskComplexity.MODERATE: 2000,
            TaskComplexity.COMPLEX: 4000,
            TaskComplexity.CRITICAL: 8000
        }
        
        complexity = task_classification['complexity']
        context_size = task_classification['context_size']
        
        # Base estimation plus context
        estimated = base_tokens[complexity] + (context_size // 4)  # Rough token estimation
        
        return min(estimated, 10000)  # Cap at 10k tokens for safety
    
    def get_model_comparison_report(self) -> str:
        """Generate comprehensive model comparison report"""
        
        report = """
╭─────────────────────────────────────────────────────────────────────────╮
│                    🤖 ENHANCED MODEL SELECTION MATRIX                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  🎯 DYNAMIC MODEL SWITCHING - Quality vs Cost Optimization              │
│                                                                         │
╰─────────────────────────────────────────────────────────────────────────╯

"""
        
        # Group models by tier
        tiers = {}
        for model_name, config in self.models.items():
            tier = config['tier']
            if tier not in tiers:
                tiers[tier] = []
            tiers[tier].append((model_name, config))
        
        for tier in [ModelTier.BASIC, ModelTier.ADVANCED, ModelTier.PREMIUM, ModelTier.FLAGSHIP]:
            if tier not in tiers:
                continue
                
            report += f"\n🏆 {tier.value.upper()} TIER - "
            
            if tier == ModelTier.BASIC:
                report += "Cost Optimized (Complexity 1-2)\n"
            elif tier == ModelTier.ADVANCED:
                report += "Balanced Performance (Complexity 2-3)\n"
            elif tier == ModelTier.PREMIUM:
                report += "High Performance (Complexity 3-4)\n"
            else:
                report += "Maximum Capability (Complexity 4-5)\n"
            
            report += "─" * 75 + "\n"
            
            for model_name, config in tiers[tier]:
                avg_cost = (config['input_cost_per_1k'] + config['output_cost_per_1k']) / 2
                report += f"│ 📊 {model_name:<15} │ Quality: {config['quality_score']:.1f}/10 │ "
                report += f"Cost: ${avg_cost:.4f}/1k │ Context: {config['context_window']:>6}\n"
                report += f"│     Capabilities: {', '.join(config['capabilities'])}\n"
                report += f"│     Best for: {', '.join(config['strengths'])}\n"
                report += "│\n"
        
        report += "\n🎯 INTELLIGENT TASK ROUTING:\n"
        report += "─" * 50 + "\n"
        
        complexity_examples = {
            TaskComplexity.TRIVIAL: "Hello world, simple text formatting",
            TaskComplexity.SIMPLE: "Basic functions, documentation",
            TaskComplexity.MODERATE: "API development, code analysis", 
            TaskComplexity.COMPLEX: "System architecture, advanced algorithms",
            TaskComplexity.CRITICAL: "Security analysis, mission-critical systems"
        }
        
        for complexity, example in complexity_examples.items():
            # Find best model for this complexity
            best_model = None
            best_score = 0
            
            for model_name, config in self.models.items():
                if config['max_complexity'].value >= complexity.value:
                    if config['quality_score'] > best_score:
                        best_score = config['quality_score']
                        best_model = model_name
            
            report += f"│ {complexity.name:<8} (Level {complexity.value}) → {best_model:<12} │ {example}\n"
        
        report += "\n💰 COST OPTIMIZATION STRATEGY:\n"
        report += "─" * 40 + "\n"
        report += f"│ Daily Budget: ${self.budget_limits['daily_budget']:.2f}\n"
        report += f"│ Emergency Threshold: {self.budget_limits['emergency_threshold']*100:.0f}% of budget\n"
        report += f"│ Max Cost Per Task: ${self.budget_limits['single_task_max']:.2f}\n"
        report += "│ Strategy: Balance quality vs cost, prioritize quality for critical tasks\n"
        
        return report

def main():
    """Test the enhanced model selection system"""
    selector = EnhancedModelSelector()
    
    # Test different task types
    test_tasks = [
        "write a hello world function",
        "create a REST API for user authentication", 
        "design a microservices architecture for e-commerce",
        "analyze this code for security vulnerabilities",
        "implement a distributed system with fault tolerance"
    ]
    
    print(selector.get_model_comparison_report())
    print("\n🧪 TESTING MODEL SELECTION:\n" + "="*50)
    
    for task in test_tasks:
        classification = selector.classify_task(task)
        selection = selector.select_optimal_model(classification)
        
        print(f"\n📋 Task: {task}")
        print(f"├── Complexity: {classification['complexity'].name}")
        print(f"├── Model: {selection.get('model', 'Claude fallback')}")
        if 'estimated_cost' in selection:
            print(f"├── Cost: ${selection['estimated_cost']:.4f}")
        print(f"└── Reasoning: {selection.get('reasoning', selection.get('reason'))}")

if __name__ == "__main__":
    main()