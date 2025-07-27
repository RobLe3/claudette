#!/usr/bin/env python3
"""
ABSTRACT CAPABILITY ASSESSMENT SYSTEM

Mesa redesign dis to be about CAPABILITIES, not literal soldiers!
Claudette should understand:
- What AI backends/models are good at what tasks
- When to use GPT vs Claude vs Qwen vs Local models
- How to match task complexity to model capability
- When to combine models for better results

This is about INTELLIGENT TASK ROUTING, not military metaphors!
"""

import time
import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum

class TaskDomain(Enum):
    """Different domains where AI can help"""
    TEXT_GENERATION = "text_generation"
    CODE_WRITING = "code_writing"
    DATA_ANALYSIS = "data_analysis"
    REASONING = "reasoning"
    CREATIVE_WRITING = "creative_writing"
    TECHNICAL_DOCS = "technical_docs"
    MATH_SOLVING = "math_solving"
    RESEARCH = "research"
    TRANSLATION = "translation"
    SUMMARIZATION = "summarization"
    DEBUGGING = "debugging"
    ARCHITECTURE = "architecture"

class TaskComplexity(Enum):
    """How complex is the task?"""
    TRIVIAL = 1      # Simple questions, basic operations
    SIMPLE = 2       # Straightforward single-step tasks
    MODERATE = 3     # Multi-step tasks, some complexity
    COMPLEX = 4      # Advanced reasoning, multiple considerations
    EXPERT = 5       # Domain expertise required, high stakes

class ModelType(Enum):
    """Different types of AI models available"""
    LARGE_LANGUAGE_MODEL = "llm"      # GPT, Claude, etc.
    LOCAL_MODEL = "local"             # Llama, local deployments
    SPECIALIZED_MODEL = "specialized" # Fine-tuned for specific tasks
    CODE_MODEL = "code"               # Code-specific models like Qwen-Coder
    FAST_MODEL = "fast"               # Quick response models
    REASONING_MODEL = "reasoning"     # Models good at complex reasoning

@dataclass
class ModelCapability:
    """Represents what a model/backend is capable of"""
    model_id: str
    model_type: ModelType
    
    # Domain expertise levels (0.0 to 1.0)
    domain_strengths: Dict[TaskDomain, float] = field(default_factory=dict)
    
    # Performance characteristics
    response_speed: float = 0.5        # 0.0 = very slow, 1.0 = very fast
    reliability: float = 0.7           # 0.0 = unreliable, 1.0 = very reliable
    creativity: float = 0.5            # 0.0 = rigid, 1.0 = very creative
    precision: float = 0.7             # 0.0 = vague, 1.0 = very precise
    cost_efficiency: float = 0.5       # 0.0 = expensive, 1.0 = cheap
    
    # Learned performance data
    total_tasks_handled: int = 0
    successful_tasks: int = 0
    failed_tasks: int = 0
    average_response_time: float = 0.0
    
    @property
    def success_rate(self) -> float:
        """Historical success rate"""
        if self.total_tasks_handled == 0:
            return 0.5  # Default assumption
        return self.successful_tasks / self.total_tasks_handled
    
    @property
    def overall_capability_score(self) -> float:
        """Overall capability assessment"""
        # Weighted combination of factors
        base_score = (
            self.reliability * 0.3 +
            self.success_rate * 0.3 +
            self.precision * 0.2 +
            self.response_speed * 0.1 +
            self.cost_efficiency * 0.1
        )
        return min(1.0, base_score)
    
    def get_domain_capability(self, domain: TaskDomain) -> float:
        """Get capability score for specific domain"""
        base_strength = self.domain_strengths.get(domain, 0.3)  # Default moderate
        # Adjust based on overall capability
        return min(1.0, base_strength * self.overall_capability_score)

@dataclass
class TaskRequest:
    """Represents a task that needs to be handled"""
    description: str
    domain: TaskDomain
    complexity: TaskComplexity
    quality_requirements: float = 0.7  # 0.0 = any quality, 1.0 = perfect quality
    speed_requirements: float = 0.5    # 0.0 = can be slow, 1.0 = must be fast
    cost_sensitivity: float = 0.5      # 0.0 = cost no object, 1.0 = minimize cost
    
class CapabilityMatcher:
    """Intelligent system to match tasks to best available capabilities"""
    
    def __init__(self):
        self.available_models: Dict[str, ModelCapability] = {}
        self.task_history: List[Dict] = []
        
        # Initialize with some common model types
        self._initialize_default_models()
    
    def _initialize_default_models(self):
        """Initialize with common AI model capabilities"""
        
        # GPT-4 style model (high quality, expensive)
        gpt4_capability = ModelCapability(
            model_id="gpt4_style",
            model_type=ModelType.LARGE_LANGUAGE_MODEL,
            domain_strengths={
                TaskDomain.REASONING: 0.9,
                TaskDomain.CODE_WRITING: 0.8,
                TaskDomain.CREATIVE_WRITING: 0.9,
                TaskDomain.RESEARCH: 0.8,
                TaskDomain.ARCHITECTURE: 0.9
            },
            response_speed=0.4,
            reliability=0.9,
            creativity=0.9,
            precision=0.8,
            cost_efficiency=0.2
        )
        self.register_model(gpt4_capability)
        
        # Claude style model (balanced, good reasoning)
        claude_capability = ModelCapability(
            model_id="claude_style", 
            model_type=ModelType.LARGE_LANGUAGE_MODEL,
            domain_strengths={
                TaskDomain.REASONING: 0.9,
                TaskDomain.CODE_WRITING: 0.8,
                TaskDomain.TECHNICAL_DOCS: 0.9,
                TaskDomain.DATA_ANALYSIS: 0.8,
                TaskDomain.DEBUGGING: 0.8
            },
            response_speed=0.5,
            reliability=0.9,
            creativity=0.7,
            precision=0.9,
            cost_efficiency=0.3
        )
        self.register_model(claude_capability)
        
        # Qwen Coder style (fast, code-focused, cheaper)
        qwen_capability = ModelCapability(
            model_id="qwen_coder",
            model_type=ModelType.CODE_MODEL,
            domain_strengths={
                TaskDomain.CODE_WRITING: 0.9,
                TaskDomain.DEBUGGING: 0.8,
                TaskDomain.TECHNICAL_DOCS: 0.7,
                TaskDomain.DATA_ANALYSIS: 0.6
            },
            response_speed=0.8,
            reliability=0.7,
            creativity=0.4,
            precision=0.8,
            cost_efficiency=0.8
        )
        self.register_model(qwen_capability)
        
        # Local model (fast, private, limited capability)
        local_capability = ModelCapability(
            model_id="local_model",
            model_type=ModelType.LOCAL_MODEL,
            domain_strengths={
                TaskDomain.TEXT_GENERATION: 0.6,
                TaskDomain.SUMMARIZATION: 0.7,
                TaskDomain.TRANSLATION: 0.5
            },
            response_speed=0.9,
            reliability=0.6,
            creativity=0.5,
            precision=0.6,
            cost_efficiency=1.0
        )
        self.register_model(local_capability)
    
    def register_model(self, capability: ModelCapability):
        """Register a new model capability"""
        self.available_models[capability.model_id] = capability
    
    def classify_task(self, task_description: str) -> Tuple[TaskDomain, TaskComplexity]:
        """Analyze task to determine domain and complexity"""
        desc_lower = task_description.lower()
        
        # Domain classification based on keywords
        domain_keywords = {
            TaskDomain.CODE_WRITING: ["code", "function", "class", "script", "program", "algorithm"],
            TaskDomain.DEBUGGING: ["debug", "fix", "error", "bug", "issue", "troubleshoot"],
            TaskDomain.DATA_ANALYSIS: ["data", "analyze", "statistics", "pandas", "csv", "chart"],
            TaskDomain.REASONING: ["explain", "analyze", "why", "how", "logic", "reasoning"],
            TaskDomain.CREATIVE_WRITING: ["story", "creative", "write", "poem", "narrative"],
            TaskDomain.TECHNICAL_DOCS: ["documentation", "docs", "readme", "api", "guide"],
            TaskDomain.RESEARCH: ["research", "find", "investigate", "study", "explore"],
            TaskDomain.MATH_SOLVING: ["math", "calculate", "equation", "solve", "formula"],
            TaskDomain.TRANSLATION: ["translate", "translation", "language"],
            TaskDomain.SUMMARIZATION: ["summarize", "summary", "brief", "overview"],
            TaskDomain.ARCHITECTURE: ["architecture", "design", "system", "structure", "scalable"]
        }
        
        domain_scores = {}
        for domain, keywords in domain_keywords.items():
            score = sum(1 for keyword in keywords if keyword in desc_lower)
            if score > 0:
                domain_scores[domain] = score
        
        # Default to text generation if no specific domain found
        detected_domain = max(domain_scores.items(), key=lambda x: x[1])[0] if domain_scores else TaskDomain.TEXT_GENERATION
        
        # Complexity classification based on indicators
        complexity_indicators = {
            TaskComplexity.TRIVIAL: ["hello", "simple", "basic", "easy"],
            TaskComplexity.SIMPLE: ["write", "create", "make", "single"],
            TaskComplexity.MODERATE: ["function", "class", "analyze", "multiple"],
            TaskComplexity.COMPLEX: ["system", "architecture", "complex", "advanced", "optimize"],
            TaskComplexity.EXPERT: ["production", "enterprise", "critical", "scalable", "distributed"]
        }
        
        complexity_scores = {}
        for complexity, keywords in complexity_indicators.items():
            score = sum(1 for keyword in keywords if keyword in desc_lower)
            if score > 0:
                complexity_scores[complexity] = score
        
        detected_complexity = max(complexity_scores.items(), key=lambda x: x[1])[0] if complexity_scores else TaskComplexity.MODERATE
        
        return detected_domain, detected_complexity
    
    def find_best_model(self, task: TaskRequest) -> Optional[Tuple[str, float, str]]:
        """Find the best model for a given task"""
        if not self.available_models:
            return None
        
        model_scores = []
        
        for model_id, capability in self.available_models.items():
            # Base capability in this domain
            domain_score = capability.get_domain_capability(task.domain)
            
            # Adjust for complexity - higher complexity needs more capable models
            complexity_factor = 1.0
            if task.complexity == TaskComplexity.EXPERT:
                complexity_factor = 0.8 if domain_score < 0.8 else 1.0
            elif task.complexity == TaskComplexity.COMPLEX:
                complexity_factor = 0.9 if domain_score < 0.7 else 1.0
            
            adjusted_domain_score = domain_score * complexity_factor
            
            # Factor in specific requirements
            quality_match = 1.0 if capability.precision >= task.quality_requirements else 0.8
            speed_match = 1.0 if capability.response_speed >= task.speed_requirements else 0.9
            cost_match = 1.0 if capability.cost_efficiency >= task.cost_sensitivity else 0.9
            
            # Overall score
            overall_score = (
                adjusted_domain_score * 0.4 +
                capability.success_rate * 0.2 +
                quality_match * 0.15 +
                speed_match * 0.15 +
                cost_match * 0.1
            )
            
            # Generate reasoning
            reasoning = f"Domain: {domain_score:.1%}, Success: {capability.success_rate:.1%}, "
            reasoning += f"Speed: {capability.response_speed:.1%}, Cost: {capability.cost_efficiency:.1%}"
            
            if adjusted_domain_score < 0.5:
                reasoning += " (Low domain capability)"
            if capability.success_rate < 0.6:
                reasoning += " (Unreliable history)"
            
            model_scores.append((model_id, overall_score, reasoning))
        
        # Sort by score and return best
        model_scores.sort(key=lambda x: x[1], reverse=True)
        
        best_model, best_score, reasoning = model_scores[0]
        
        # Only recommend if score is reasonable
        if best_score >= 0.4:
            return best_model, best_score, reasoning
        else:
            return None
    
    def smart_task_routing(self, task_description: str, **preferences) -> Dict[str, Any]:
        """Main function: intelligently route task to best capability"""
        
        # Classify the task
        domain, complexity = self.classify_task(task_description)
        
        # Create task request with user preferences
        task = TaskRequest(
            description=task_description,
            domain=domain,
            complexity=complexity,
            quality_requirements=preferences.get('quality', 0.7),
            speed_requirements=preferences.get('speed', 0.5),
            cost_sensitivity=preferences.get('cost_sensitivity', 0.5)
        )
        
        # Find best model
        best_match = self.find_best_model(task)
        
        routing_result = {
            "task_description": task_description,
            "detected_domain": domain.value,
            "detected_complexity": complexity.name,
            "preferences": {
                "quality": task.quality_requirements,
                "speed": task.speed_requirements,
                "cost_sensitivity": task.cost_sensitivity
            }
        }
        
        if best_match:
            model_id, confidence, reasoning = best_match
            capability = self.available_models[model_id]
            
            routing_result.update({
                "recommended_model": model_id,
                "model_type": capability.model_type.value,
                "confidence": confidence,
                "reasoning": reasoning,
                "expected_quality": capability.precision,
                "expected_speed": capability.response_speed,
                "cost_efficiency": capability.cost_efficiency,
                "should_proceed": confidence >= 0.6
            })
            
            # Add warnings if needed
            warnings = []
            if confidence < 0.7:
                warnings.append("Low confidence - consider simpler approach")
            if capability.success_rate < 0.7:
                warnings.append("Model has inconsistent performance history")
            if task.complexity == TaskComplexity.EXPERT and confidence < 0.8:
                warnings.append("Expert-level task may need human review")
            
            routing_result["warnings"] = warnings
        else:
            routing_result.update({
                "recommended_model": None,
                "should_proceed": False,
                "reason": "No available model has sufficient capability for this task"
            })
        
        return routing_result
    
    def record_task_outcome(self, model_id: str, task_description: str, 
                           success: bool, response_time: float):
        """Record task outcome to improve future routing"""
        if model_id not in self.available_models:
            return
        
        capability = self.available_models[model_id]
        
        # Update performance statistics
        capability.total_tasks_handled += 1
        if success:
            capability.successful_tasks += 1
        else:
            capability.failed_tasks += 1
        
        # Update average response time
        total_tasks = capability.total_tasks_handled
        capability.average_response_time = (
            (capability.average_response_time * (total_tasks - 1) + response_time) / total_tasks
        )
        
        # Update response speed rating based on actual performance
        if response_time < 5.0:
            capability.response_speed = min(1.0, capability.response_speed + 0.05)
        elif response_time > 20.0:
            capability.response_speed = max(0.1, capability.response_speed - 0.05)
        
        # Record in history
        self.task_history.append({
            "timestamp": time.time(),
            "model_id": model_id,
            "task": task_description[:100],
            "success": success,
            "response_time": response_time
        })
    
    def get_capability_report(self) -> Dict[str, Any]:
        """Get report of all model capabilities"""
        report = {
            "total_models": len(self.available_models),
            "total_tasks_handled": sum(m.total_tasks_handled for m in self.available_models.values()),
            "models": {}
        }
        
        for model_id, capability in self.available_models.items():
            model_report = {
                "type": capability.model_type.value,
                "success_rate": capability.success_rate,
                "total_tasks": capability.total_tasks_handled,
                "avg_response_time": capability.average_response_time,
                "characteristics": {
                    "speed": capability.response_speed,
                    "reliability": capability.reliability,
                    "creativity": capability.creativity,
                    "precision": capability.precision,
                    "cost_efficiency": capability.cost_efficiency
                },
                "top_domains": sorted(
                    [(domain.value, strength) for domain, strength in capability.domain_strengths.items()],
                    key=lambda x: x[1], reverse=True
                )[:3]
            }
            report["models"][model_id] = model_report
        
        return report

# Global capability system
GLOBAL_CAPABILITY_SYSTEM = CapabilityMatcher()