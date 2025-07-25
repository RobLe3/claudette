#!/usr/bin/env python3
"""
Quality Validation Framework for Enhanced ChatGPT Offloading
Measures actual performance vs expected results
"""

import json
import asyncio
import time
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
from enum import Enum
import statistics

# Import our enhanced offloading system
import sys
sys.path.append(str(Path(__file__).parent))
from core.coordination.chatgpt_offloading_manager import ChatGPTOffloadingManager

class QualityMetric(Enum):
    """Quality measurement dimensions"""
    CORRECTNESS = "correctness"          # Is the output factually correct?
    COMPLETENESS = "completeness"        # Does it address all requirements?
    CLARITY = "clarity"                  # Is it well-structured and clear?
    EFFICIENCY = "efficiency"            # Is the solution optimal?
    CREATIVITY = "creativity"            # Novel/creative approaches?
    SECURITY = "security"               # Security considerations included?
    PERFORMANCE = "performance"          # Performance considerations?
    MAINTAINABILITY = "maintainability"  # Code quality for maintenance?

@dataclass
class TestCase:
    """Individual test case for validation"""
    id: str
    description: str
    task: str
    expected_complexity: str
    expected_model_tier: str
    context: str = ""
    reference_solution: str = ""
    quality_criteria: List[QualityMetric] = None
    minimum_quality_score: float = 7.0

@dataclass
class ValidationResult:
    """Results of quality validation"""
    test_case_id: str
    classification_result: Dict[str, Any]
    offload_result: Dict[str, Any]
    quality_scores: Dict[QualityMetric, float]
    overall_quality: float
    execution_time: float
    cost_usd: float
    passed: bool
    notes: str = ""

class QualityValidator:
    """Comprehensive quality validation system"""
    
    def __init__(self):
        self.offloading_manager = ChatGPTOffloadingManager()
        self.test_cases = self._create_test_suite()
        self.results: List[ValidationResult] = []
        
    def _create_test_suite(self) -> List[TestCase]:
        """Create comprehensive test suite across all complexity levels"""
        
        test_cases = [
            # TRIVIAL COMPLEXITY
            TestCase(
                id="trivial_001",
                description="Simple Hello World Function",
                task="write a hello world function in Python",
                expected_complexity="TRIVIAL",
                expected_model_tier="basic",
                quality_criteria=[QualityMetric.CORRECTNESS, QualityMetric.CLARITY],
                minimum_quality_score=8.0
            ),
            TestCase(
                id="trivial_002", 
                description="Basic String Formatting",
                task="format a string to display 'Hello, [name]!' where name is a variable",
                expected_complexity="TRIVIAL",
                expected_model_tier="basic",
                quality_criteria=[QualityMetric.CORRECTNESS, QualityMetric.CLARITY],
                minimum_quality_score=8.0
            ),
            
            # SIMPLE COMPLEXITY
            TestCase(
                id="simple_001",
                description="REST API Endpoint",
                task="create a REST API endpoint for user authentication using Express.js",
                expected_complexity="SIMPLE",
                expected_model_tier="basic",
                quality_criteria=[QualityMetric.CORRECTNESS, QualityMetric.COMPLETENESS, QualityMetric.SECURITY],
                minimum_quality_score=8.0
            ),
            TestCase(
                id="simple_002",
                description="Data Processing Function",
                task="write a Python function to process a CSV file and return summary statistics",
                expected_complexity="SIMPLE", 
                expected_model_tier="basic",
                quality_criteria=[QualityMetric.CORRECTNESS, QualityMetric.EFFICIENCY, QualityMetric.MAINTAINABILITY],
                minimum_quality_score=8.0
            ),
            
            # MODERATE COMPLEXITY
            TestCase(
                id="moderate_001",
                description="Complex API with Database",
                task="design and implement a complete REST API for a blog system with user authentication, posts, comments, and database integration",
                expected_complexity="MODERATE",
                expected_model_tier="advanced",
                quality_criteria=[QualityMetric.CORRECTNESS, QualityMetric.COMPLETENESS, QualityMetric.SECURITY, QualityMetric.MAINTAINABILITY],
                minimum_quality_score=8.5
            ),
            TestCase(
                id="moderate_002",
                description="Algorithm Optimization",
                task="implement and optimize a graph algorithm to find the shortest path between nodes with performance analysis",
                expected_complexity="MODERATE",
                expected_model_tier="advanced", 
                quality_criteria=[QualityMetric.CORRECTNESS, QualityMetric.EFFICIENCY, QualityMetric.PERFORMANCE],
                minimum_quality_score=8.5
            ),
            
            # COMPLEX COMPLEXITY
            TestCase(
                id="complex_001",
                description="Microservices Architecture",
                task="design a complete microservices architecture for an e-commerce platform with service discovery, load balancing, and fault tolerance",
                expected_complexity="COMPLEX",
                expected_model_tier="premium",
                quality_criteria=[QualityMetric.COMPLETENESS, QualityMetric.EFFICIENCY, QualityMetric.PERFORMANCE, QualityMetric.MAINTAINABILITY],
                minimum_quality_score=9.0
            ),
            TestCase(
                id="complex_002",
                description="Machine Learning Pipeline", 
                task="create a complete machine learning pipeline for fraud detection including data preprocessing, feature engineering, model training, evaluation, and deployment",
                expected_complexity="COMPLEX",
                expected_model_tier="premium",
                quality_criteria=[QualityMetric.CORRECTNESS, QualityMetric.COMPLETENESS, QualityMetric.EFFICIENCY, QualityMetric.PERFORMANCE],
                minimum_quality_score=9.0
            ),
            
            # CRITICAL COMPLEXITY
            TestCase(
                id="critical_001",
                description="Security Analysis",
                task="perform a comprehensive security analysis of a financial trading system architecture and provide detailed vulnerability assessment",
                expected_complexity="CRITICAL", 
                expected_model_tier="flagship",
                quality_criteria=[QualityMetric.CORRECTNESS, QualityMetric.COMPLETENESS, QualityMetric.SECURITY],
                minimum_quality_score=9.5
            ),
            TestCase(
                id="critical_002",
                description="Distributed System Design",
                task="design a fault-tolerant distributed system for real-time financial transactions with ACID compliance and high availability",
                expected_complexity="CRITICAL",
                expected_model_tier="flagship",
                quality_criteria=[QualityMetric.CORRECTNESS, QualityMetric.COMPLETENESS, QualityMetric.PERFORMANCE, QualityMetric.SECURITY],
                minimum_quality_score=9.5
            )
        ]
        
        return test_cases
    
    async def run_validation_suite(self) -> Dict[str, Any]:
        """Run complete validation suite and return comprehensive results"""
        
        print("🧪 STARTING COMPREHENSIVE QUALITY VALIDATION")
        print("=" * 60)
        
        start_time = time.time()
        self.results = []
        
        for i, test_case in enumerate(self.test_cases, 1):
            print(f"\n📋 Test {i}/{len(self.test_cases)}: {test_case.description}")
            print(f"   Task: {test_case.task[:80]}...")
            
            try:
                result = await self._validate_single_test(test_case)
                self.results.append(result)
                
                status = "✅ PASSED" if result.passed else "❌ FAILED"
                print(f"   Result: {status} | Quality: {result.overall_quality:.1f}/10 | Cost: ${result.cost_usd:.4f}")
                
            except Exception as e:
                print(f"   ❌ ERROR: {str(e)}")
                # Create failed result
                failed_result = ValidationResult(
                    test_case_id=test_case.id,
                    classification_result={},
                    offload_result={'error': str(e)},
                    quality_scores={},
                    overall_quality=0.0,
                    execution_time=0.0,
                    cost_usd=0.0,
                    passed=False,
                    notes=f"Exception: {str(e)}"
                )
                self.results.append(failed_result)
        
        total_time = time.time() - start_time
        
        # Generate comprehensive analysis
        analysis = self._analyze_results(total_time)
        
        # Save results
        self._save_results(analysis)
        
        return analysis
    
    async def _validate_single_test(self, test_case: TestCase) -> ValidationResult:
        """Validate a single test case"""
        
        start_time = time.time()
        
        # Step 1: Test classification
        classification = self.offloading_manager.classify_task(test_case.task, test_case.context)
        
        # Step 2: Test offloading (if recommended)
        offload_result = {}
        if classification and classification.get('recommendation') == 'offload':
            offload_result = await self.offloading_manager.offload_task(test_case.task, test_case.context)
        else:
            offload_result = {
                'success': False,
                'reason': 'Task not suitable for offloading or stayed with Claude',
                'classification': classification
            }
        
        execution_time = time.time() - start_time
        cost_usd = offload_result.get('cost_usd', 0.0)
        
        # Step 3: Quality assessment
        quality_scores = self._assess_quality(test_case, classification, offload_result)
        overall_quality = statistics.mean(quality_scores.values()) if quality_scores else 0.0
        
        # Step 4: Determine if test passed
        passed = self._determine_pass_fail(test_case, classification, offload_result, overall_quality)
        
        return ValidationResult(
            test_case_id=test_case.id,
            classification_result=classification or {},
            offload_result=offload_result,
            quality_scores=quality_scores,
            overall_quality=overall_quality,
            execution_time=execution_time,
            cost_usd=cost_usd,
            passed=passed
        )
    
    def _assess_quality(self, test_case: TestCase, classification: Dict, offload_result: Dict) -> Dict[QualityMetric, float]:
        """Assess quality across multiple dimensions"""
        
        quality_scores = {}
        
        if not test_case.quality_criteria:
            return quality_scores
            
        # Get the actual output
        output = offload_result.get('result', '') if offload_result.get('success') else ''
        
        for criterion in test_case.quality_criteria:
            score = self._score_quality_dimension(criterion, test_case, output, classification, offload_result)
            quality_scores[criterion] = score
            
        return quality_scores
    
    def _score_quality_dimension(self, criterion: QualityMetric, test_case: TestCase, 
                                 output: str, classification: Dict, offload_result: Dict) -> float:
        """Score a specific quality dimension with task-specific criteria"""
        
        if not output or not offload_result.get('success'):
            return 0.0
        
        # Identify task domain for specialized scoring
        task_domain = self._identify_task_domain(test_case)
        
        # Use domain-specific quality assessment
        if task_domain:
            return self._assess_domain_quality(criterion, task_domain, test_case, output)
        else:
            return self._assess_generic_quality(criterion, test_case, output)
    
    def _identify_task_domain(self, test_case: TestCase) -> str:
        """Identify the specific domain of the task for specialized assessment"""
        task_lower = test_case.task.lower()
        description_lower = test_case.description.lower()
        
        # Code Generation Tasks
        if any(kw in task_lower for kw in ['function', 'algorithm', 'implement', 'code']):
            if any(kw in task_lower for kw in ['python', 'javascript', 'java', 'c++']):
                return 'code_generation'
        
        # API Design Tasks
        if any(kw in task_lower for kw in ['api', 'endpoint', 'rest', 'graphql']):
            return 'api_design'
        
        # Architecture Tasks
        if any(kw in task_lower for kw in ['architecture', 'microservices', 'system design', 'distributed']):
            return 'architecture'
        
        # Security Tasks
        if any(kw in task_lower for kw in ['security', 'vulnerability', 'threat', 'authentication']):
            return 'security'
        
        # Data Processing Tasks
        if any(kw in task_lower for kw in ['data', 'csv', 'processing', 'analysis']):
            return 'data_processing'
        
        # Machine Learning Tasks
        if any(kw in task_lower for kw in ['machine learning', 'ml', 'model', 'training']):
            return 'machine_learning'
        
        return 'generic'
    
    def _assess_domain_quality(self, criterion: QualityMetric, domain: str, 
                              test_case: TestCase, output: str) -> float:
        """Assess quality using domain-specific criteria"""
        
        if domain == 'code_generation':
            return self._assess_code_generation_quality(criterion, test_case, output)
        elif domain == 'api_design':
            return self._assess_api_design_quality(criterion, test_case, output)
        elif domain == 'architecture':
            return self._assess_architecture_quality(criterion, test_case, output)
        elif domain == 'security':
            return self._assess_security_quality(criterion, test_case, output)
        elif domain == 'data_processing':
            return self._assess_data_processing_quality(criterion, test_case, output)
        elif domain == 'machine_learning':
            return self._assess_ml_quality(criterion, test_case, output)
        else:
            return self._assess_generic_quality(criterion, test_case, output)
    
    def _assess_code_generation_quality(self, criterion: QualityMetric, 
                                       test_case: TestCase, output: str) -> float:
        """Assess code generation tasks with strict criteria"""
        base_score = 3.0  # Start with lower base for stricter scoring
        
        if criterion == QualityMetric.CORRECTNESS:
            # Syntax and structure requirements
            has_function_def = bool(re.search(r'def\s+\w+\s*\(', output))
            has_proper_syntax = '(' in output and ')' in output and ':' in output
            has_return_or_print = 'return' in output or 'print(' in output
            
            if has_function_def and has_proper_syntax:
                base_score += 3.0
            elif has_proper_syntax:
                base_score += 1.5
            
            if has_return_or_print:
                base_score += 1.0
            
            # Check for proper error handling
            if 'try:' in output and 'except' in output:
                base_score += 1.0
            elif 'raise' in output or 'ValueError' in output:
                base_score += 0.5
        
        elif criterion == QualityMetric.COMPLETENESS:
            # Must have comprehensive implementation
            lines = len([line for line in output.split('\n') if line.strip()])
            if lines < 5:  # Too short for complete implementation
                base_score += 0.0
            elif lines < 15:
                base_score += 2.0
            else:
                base_score += 3.0
            
            # Check for documentation
            if '"""' in output or "'''" in output:
                base_score += 1.5
            elif '#' in output:
                base_score += 0.5
        
        elif criterion == QualityMetric.MAINTAINABILITY:
            # Code structure and quality
            if 'class ' in output:
                base_score += 1.5
            if re.search(r'def\s+\w+\s*\([^)]*\)\s*->', output):  # Type hints
                base_score += 1.0
            if 'import' in output:
                base_score += 0.5
        
        return min(10.0, base_score)
    
    def _assess_api_design_quality(self, criterion: QualityMetric, 
                                  test_case: TestCase, output: str) -> float:
        """Assess API design tasks with specific requirements"""
        base_score = 3.0
        
        if criterion == QualityMetric.CORRECTNESS:
            # Must have proper API structure
            has_route_definition = bool(re.search(r'@app\.|app\.|router\.', output))
            has_http_methods = bool(re.search(r'(GET|POST|PUT|DELETE)', output, re.IGNORECASE))
            has_endpoint_path = '/' in output and ('route' in output.lower() or 'endpoint' in output.lower())
            
            if has_route_definition:
                base_score += 2.5
            if has_http_methods:
                base_score += 2.0
            if has_endpoint_path:
                base_score += 1.0
        
        elif criterion == QualityMetric.SECURITY:
            # Security requirements for APIs
            security_elements = [
                'authentication', 'authorization', 'token', 'jwt',
                'validate', 'sanitize', 'hash', 'bcrypt', 'https'
            ]
            found_security = sum(1 for elem in security_elements if elem in output.lower())
            
            if found_security >= 3:
                base_score += 3.0
            elif found_security >= 2:
                base_score += 2.0
            elif found_security >= 1:
                base_score += 1.0
        
        elif criterion == QualityMetric.COMPLETENESS:
            # Must include database integration, error handling
            has_database = any(db in output.lower() for db in ['database', 'db', 'sql', 'mongo'])
            has_error_handling = 'try:' in output or 'except' in output or 'error' in output.lower()
            has_validation = 'validate' in output.lower() or 'required' in output.lower()
            
            if has_database:
                base_score += 2.0
            if has_error_handling:
                base_score += 1.5
            if has_validation:
                base_score += 1.0
        
        return min(10.0, base_score)
    
    def _assess_architecture_quality(self, criterion: QualityMetric, 
                                   test_case: TestCase, output: str) -> float:
        """Assess system architecture tasks with high standards"""
        base_score = 2.0  # Very strict for architecture
        
        if criterion == QualityMetric.COMPLETENESS:
            # Architecture must cover multiple components
            arch_components = [
                'service', 'component', 'module', 'layer',
                'gateway', 'load balancer', 'database', 'cache',
                'queue', 'messaging', 'api', 'interface'
            ]
            found_components = sum(1 for comp in arch_components if comp in output.lower())
            
            if found_components >= 8:
                base_score += 4.0
            elif found_components >= 6:
                base_score += 3.0
            elif found_components >= 4:
                base_score += 2.0
            elif found_components >= 2:
                base_score += 1.0
        
        elif criterion == QualityMetric.PERFORMANCE:
            # Must address scalability and performance
            perf_concepts = [
                'scalability', 'performance', 'load balancing', 'caching',
                'optimization', 'throughput', 'latency', 'concurrent'
            ]
            found_perf = sum(1 for concept in perf_concepts if concept in output.lower())
            
            if found_perf >= 4:
                base_score += 3.0
            elif found_perf >= 2:
                base_score += 2.0
            elif found_perf >= 1:
                base_score += 1.0
        
        elif criterion == QualityMetric.MAINTAINABILITY:
            # Must include deployment, monitoring, patterns
            maint_aspects = [
                'deployment', 'monitoring', 'logging', 'testing',
                'pattern', 'design pattern', 'documentation', 'version'
            ]
            found_maint = sum(1 for aspect in maint_aspects if aspect in output.lower())
            
            if found_maint >= 4:
                base_score += 3.0
            elif found_maint >= 2:
                base_score += 2.0
            elif found_maint >= 1:
                base_score += 1.0
        
        return min(10.0, base_score)
    
    def _assess_security_quality(self, criterion: QualityMetric, 
                               test_case: TestCase, output: str) -> float:
        """Assess security tasks with critical requirements"""
        base_score = 2.0  # Very strict for security
        
        if criterion == QualityMetric.CORRECTNESS:
            # Must identify actual security concepts
            security_concepts = [
                'vulnerability', 'threat', 'attack', 'exploit',
                'encryption', 'authentication', 'authorization', 'owasp'
            ]
            found_concepts = sum(1 for concept in security_concepts if concept in output.lower())
            
            if found_concepts >= 6:
                base_score += 4.0
            elif found_concepts >= 4:
                base_score += 3.0
            elif found_concepts >= 2:
                base_score += 2.0
            elif found_concepts >= 1:
                base_score += 1.0
        
        elif criterion == QualityMetric.COMPLETENESS:
            # Must provide comprehensive security analysis
            analysis_elements = [
                'risk assessment', 'mitigation', 'recommendation',
                'best practice', 'compliance', 'audit', 'policy'
            ]
            found_elements = sum(1 for elem in analysis_elements if elem in output.lower())
            
            if found_elements >= 4:
                base_score += 4.0
            elif found_elements >= 2:
                base_score += 2.0
            elif found_elements >= 1:
                base_score += 1.0
        
        elif criterion == QualityMetric.SECURITY:
            # Specific security measures mentioned
            measures = [
                'firewall', 'intrusion detection', 'access control',
                'encryption at rest', 'encryption in transit', 'key management'
            ]
            found_measures = sum(1 for measure in measures if measure in output.lower())
            
            if found_measures >= 3:
                base_score += 3.0
            elif found_measures >= 2:
                base_score += 2.0
            elif found_measures >= 1:
                base_score += 1.0
        
        return min(10.0, base_score)
    
    def _assess_data_processing_quality(self, criterion: QualityMetric, 
                                      test_case: TestCase, output: str) -> float:
        """Assess data processing tasks"""
        base_score = 3.0
        
        if criterion == QualityMetric.CORRECTNESS:
            # Must handle data operations correctly
            data_ops = ['read', 'write', 'process', 'transform', 'validate']
            found_ops = sum(1 for op in data_ops if op in output.lower())
            
            if found_ops >= 4:
                base_score += 3.0
            elif found_ops >= 2:
                base_score += 2.0
            elif found_ops >= 1:
                base_score += 1.0
        
        elif criterion == QualityMetric.EFFICIENCY:
            # Must consider performance for data processing
            efficiency_aspects = ['pandas', 'numpy', 'batch', 'memory', 'optimization']
            found_aspects = sum(1 for aspect in efficiency_aspects if aspect in output.lower())
            
            if found_aspects >= 2:
                base_score += 2.0
            elif found_aspects >= 1:
                base_score += 1.0
        
        return min(10.0, base_score)
    
    def _assess_ml_quality(self, criterion: QualityMetric, 
                          test_case: TestCase, output: str) -> float:
        """Assess machine learning tasks"""
        base_score = 3.0
        
        if criterion == QualityMetric.CORRECTNESS:
            # Must include ML pipeline components
            ml_components = ['preprocessing', 'feature', 'training', 'evaluation', 'model']
            found_components = sum(1 for comp in ml_components if comp in output.lower())
            
            if found_components >= 4:
                base_score += 3.0
            elif found_components >= 2:
                base_score += 2.0
            elif found_components >= 1:
                base_score += 1.0
        
        elif criterion == QualityMetric.PERFORMANCE:
            # Must address model performance
            perf_metrics = ['accuracy', 'precision', 'recall', 'f1', 'auc', 'evaluation']
            found_metrics = sum(1 for metric in perf_metrics if metric in output.lower())
            
            if found_metrics >= 3:
                base_score += 2.0
            elif found_metrics >= 1:
                base_score += 1.0
        
        return min(10.0, base_score)
    
    def _assess_generic_quality(self, criterion: QualityMetric, 
                              test_case: TestCase, output: str) -> float:
        """Fallback generic quality assessment with stricter scoring"""
        base_score = 4.0  # Lower base score for stricter assessment
        
        if criterion == QualityMetric.CORRECTNESS:
            # Basic correctness indicators
            if len(output) > 100:
                base_score += 1.0
            if '```' in output:  # Code blocks
                base_score += 1.0
            if any(kw in output.lower() for kw in ['example', 'usage', 'implementation']):
                base_score += 1.0
                
        elif criterion == QualityMetric.COMPLETENESS:
            # Output comprehensiveness
            if len(output) > 500:
                base_score += 1.5
            if len(output) > 1000:
                base_score += 1.0
                
        elif criterion == QualityMetric.CLARITY:
            # Structure and clarity
            if output.count('\n') > 5:
                base_score += 1.0
            if '#' in output or '"""' in output:
                base_score += 1.0
        
        return min(10.0, base_score)
    
    def _determine_pass_fail(self, test_case: TestCase, classification: Dict, 
                           offload_result: Dict, overall_quality: float) -> bool:
        """Determine if test case passed validation with stricter criteria"""
        
        # Check 1: Must have successful execution
        if not offload_result.get('success'):
            return False
        
        # Check 2: Output must exist and be substantial
        output = offload_result.get('result', '')
        if not output or len(output.strip()) < 50:
            return False
        
        # Check 3: Classification accuracy (stricter - exact match required)
        if classification:
            expected_complexity = test_case.expected_complexity
            actual_complexity = classification.get('complexity', 'UNKNOWN')
            
            # Exact complexity match required (no tolerance)
            if expected_complexity != actual_complexity:
                return False
        
        # Check 4: Quality threshold (stricter)
        if overall_quality < test_case.minimum_quality_score:
            return False
        
        # Check 5: Domain-specific validation
        task_domain = self._identify_task_domain(test_case)
        if not self._validate_domain_requirements(task_domain, test_case, output):
            return False
                
        return True
    
    def _validate_domain_requirements(self, domain: str, test_case: TestCase, output: str) -> bool:
        """Validate domain-specific requirements for pass/fail"""
        
        if domain == 'code_generation':
            # Must have actual code with proper structure
            has_function = bool(re.search(r'def\s+\w+\s*\(', output))
            has_syntax = '(' in output and ')' in output and ':' in output
            return has_function and has_syntax
        
        elif domain == 'api_design':
            # Must have API endpoints and HTTP methods
            has_routes = bool(re.search(r'@app\.|app\.|router\.', output))
            has_methods = bool(re.search(r'(GET|POST|PUT|DELETE)', output, re.IGNORECASE))
            return has_routes or has_methods
        
        elif domain == 'architecture':
            # Must mention multiple architectural components
            components = ['service', 'component', 'database', 'api', 'interface']
            found = sum(1 for comp in components if comp in output.lower())
            return found >= 3
        
        elif domain == 'security':
            # Must mention security concepts
            security_terms = ['security', 'vulnerability', 'threat', 'authentication', 'encryption']
            found = sum(1 for term in security_terms if term in output.lower())
            return found >= 2
        
        elif domain == 'data_processing':
            # Must mention data operations
            data_ops = ['read', 'process', 'validate', 'transform']
            found = sum(1 for op in data_ops if op in output.lower())
            return found >= 2
        
        elif domain == 'machine_learning':
            # Must mention ML components
            ml_terms = ['model', 'training', 'feature', 'evaluation']
            found = sum(1 for term in ml_terms if term in output.lower())
            return found >= 2
        
        else:
            # Generic validation - must have substantial content
            return len(output.strip()) > 100
    
    def _analyze_results(self, total_time: float) -> Dict[str, Any]:
        """Analyze all validation results"""
        
        if not self.results:
            return {'error': 'No results to analyze'}
            
        # Basic statistics
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r.passed)
        failed_tests = total_tests - passed_tests
        pass_rate = (passed_tests / total_tests) * 100
        
        # Quality statistics
        quality_scores = [r.overall_quality for r in self.results if r.overall_quality > 0]
        avg_quality = statistics.mean(quality_scores) if quality_scores else 0.0
        min_quality = min(quality_scores) if quality_scores else 0.0
        max_quality = max(quality_scores) if quality_scores else 0.0
        
        # Cost statistics
        costs = [r.cost_usd for r in self.results]
        total_cost = sum(costs)
        avg_cost = statistics.mean(costs) if costs else 0.0
        
        # Performance statistics
        execution_times = [r.execution_time for r in self.results]
        avg_execution_time = statistics.mean(execution_times) if execution_times else 0.0
        
        # Complexity breakdown
        complexity_results = {}
        for result in self.results:
            complexity = result.classification_result.get('complexity', 'UNKNOWN')
            if complexity not in complexity_results:
                complexity_results[complexity] = {'total': 0, 'passed': 0}
            complexity_results[complexity]['total'] += 1
            if result.passed:
                complexity_results[complexity]['passed'] += 1
        
        # Model tier usage
        model_usage = {}
        for result in self.results:
            model = result.classification_result.get('model', 'unknown')
            model_usage[model] = model_usage.get(model, 0) + 1
        
        return {
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'total_tests': total_tests,
                'passed_tests': passed_tests,
                'failed_tests': failed_tests,
                'pass_rate': round(pass_rate, 1),
                'avg_quality': round(avg_quality, 2),
                'quality_range': f"{min_quality:.1f}-{max_quality:.1f}",
                'total_cost': round(total_cost, 4),
                'avg_cost_per_test': round(avg_cost, 4),
                'avg_execution_time': round(avg_execution_time, 2),
                'total_validation_time': round(total_time, 2)
            },
            'complexity_breakdown': complexity_results,
            'model_usage': model_usage,
            'detailed_results': [
                {
                    'test_id': r.test_case_id,
                    'passed': r.passed,
                    'quality': r.overall_quality,
                    'cost': r.cost_usd,
                    'model': r.classification_result.get('model', 'unknown'),
                    'complexity': r.classification_result.get('complexity', 'unknown'),
                    'execution_time': r.execution_time
                } for r in self.results
            ]
        }
    
    def _save_results(self, analysis: Dict[str, Any]):
        """Save validation results to file"""
        
        results_file = Path(__file__).parent / 'validation_results.json'
        
        with open(results_file, 'w') as f:
            json.dump(analysis, f, indent=2)
            
        print(f"\n💾 Results saved to: {results_file}")

def main():
    """Run quality validation"""
    
    validator = QualityValidator()
    
    # Run validation suite
    results = asyncio.run(validator.run_validation_suite())
    
    # Print summary
    print("\n" + "=" * 60)
    print("🏆 VALIDATION SUMMARY")
    print("=" * 60)
    
    summary = results['summary']
    print(f"📊 Tests: {summary['passed_tests']}/{summary['total_tests']} passed ({summary['pass_rate']}%)")
    print(f"🎯 Quality: {summary['avg_quality']}/10 average (range: {summary['quality_range']})")
    print(f"💰 Cost: ${summary['total_cost']:.4f} total, ${summary['avg_cost_per_test']:.4f} per test")
    print(f"⏱️  Time: {summary['avg_execution_time']:.1f}s average, {summary['total_validation_time']:.1f}s total")
    
    print(f"\n🔍 Complexity Breakdown:")
    for complexity, stats in results['complexity_breakdown'].items():
        pass_rate = (stats['passed'] / stats['total']) * 100 if stats['total'] > 0 else 0
        print(f"   {complexity}: {stats['passed']}/{stats['total']} ({pass_rate:.0f}%)")
    
    print(f"\n🤖 Model Usage:")
    for model, count in results['model_usage'].items():
        print(f"   {model}: {count} tests")
    
    # Overall assessment
    if summary['pass_rate'] >= 80 and summary['avg_quality'] >= 8.0:
        print(f"\n✅ VALIDATION PASSED - System meets quality expectations!")
    elif summary['pass_rate'] >= 70:
        print(f"\n⚠️  VALIDATION PARTIAL - System needs improvement")
    else:
        print(f"\n❌ VALIDATION FAILED - System requires significant fixes")

if __name__ == "__main__":
    main()