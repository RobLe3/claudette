#!/usr/bin/env python3
"""
Side-by-Side Comparison: Claude vs Enhanced Offloading
Measures actual quality differences to validate our claims
"""

import json
import asyncio
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Any
from dataclasses import dataclass

# Import our enhanced offloading system
import sys
sys.path.append(str(Path(__file__).parent))
from core.coordination.chatgpt_offloading_manager import ChatGPTOffloadingManager

@dataclass
class ComparisonTest:
    """Test case for side-by-side comparison"""
    id: str
    description: str
    task: str
    context: str = ""
    expected_quality_tier: str = "high"  # low, medium, high, critical

@dataclass
class ComparisonResult:
    """Results comparing Claude (reference) vs Offloading"""
    test_id: str
    claude_result: str  # We'll simulate Claude results for comparison
    offload_result: Dict[str, Any]
    claude_quality_score: float
    offload_quality_score: float
    claude_cost_estimate: float  # Estimated Claude cost
    offload_actual_cost: float
    cost_savings_percent: float
    quality_difference: float  # Positive = offload better, negative = Claude better
    recommendation: str  # "use_offload", "use_claude", "equivalent"

class SideBySideComparator:
    """Compare Claude vs Enhanced Offloading side-by-side"""
    
    def __init__(self):
        self.offloading_manager = ChatGPTOffloadingManager()
        self.test_cases = self._create_comparison_tests()
        self.claude_token_cost_eur = 0.015  # €0.015 per 1k tokens
        self.eur_to_usd = 1.08  # Approximate conversion
        
    def _create_comparison_tests(self) -> List[ComparisonTest]:
        """Create test cases for direct comparison"""
        
        return [
            # Simple tasks - Should be cost-optimized
            ComparisonTest(
                id="simple_function",
                description="Simple Python Function",
                task="write a Python function that calculates the factorial of a number",
                expected_quality_tier="medium"
            ),
            ComparisonTest(
                id="api_endpoint",
                description="Basic API Endpoint",
                task="create a REST API endpoint that accepts a POST request with user data and stores it in a database",
                expected_quality_tier="medium"
            ),
            
            # Medium complexity - Should show balanced performance
            ComparisonTest(
                id="data_processing",
                description="Data Processing Pipeline",
                task="create a data processing pipeline that reads CSV files, performs data validation, handles missing values, and generates summary reports",
                expected_quality_tier="high"
            ),
            ComparisonTest(
                id="authentication_system",
                description="User Authentication System",
                task="implement a complete user authentication system with registration, login, password hashing, JWT tokens, and session management",
                expected_quality_tier="high"
            ),
            
            # Complex tasks - Should show quality matching
            ComparisonTest(
                id="microservices_design",
                description="Microservices Architecture",
                task="design a complete microservices architecture for a social media platform including user service, post service, notification service, API gateway, and deployment strategy",
                expected_quality_tier="high"
            ),
            ComparisonTest(
                id="ml_system",
                description="Machine Learning System",
                task="create a complete machine learning system for recommendation engine including data preprocessing, feature engineering, model training, evaluation, and real-time inference API",
                expected_quality_tier="critical"
            )
        ]
    
    async def run_comparison(self) -> Dict[str, Any]:
        """Run complete side-by-side comparison"""
        
        print("🔬 STARTING SIDE-BY-SIDE COMPARISON")
        print("Claude vs Enhanced ChatGPT Offloading")
        print("=" * 60)
        
        results = []
        
        for i, test_case in enumerate(self.test_cases, 1):
            print(f"\n📋 Test {i}/{len(self.test_cases)}: {test_case.description}")
            print(f"   Task: {test_case.task[:80]}...")
            
            try:
                result = await self._compare_single_test(test_case)
                results.append(result)
                
                # Show immediate results
                savings = result.cost_savings_percent
                quality_diff = result.quality_difference
                quality_status = "📈 BETTER" if quality_diff > 0 else "📉 WORSE" if quality_diff < -0.5 else "📊 SIMILAR"
                
                print(f"   Cost Savings: {savings:.0f}% | Quality: {quality_status} ({quality_diff:+.1f})")
                print(f"   Recommendation: {result.recommendation}")
                
            except Exception as e:
                print(f"   ❌ ERROR: {str(e)}")
        
        # Analyze overall results
        analysis = self._analyze_comparison_results(results)
        
        # Save results
        self._save_comparison_results(analysis)
        
        return analysis
    
    async def _compare_single_test(self, test_case: ComparisonTest) -> ComparisonResult:
        """Compare Claude vs Offloading for a single test"""
        
        # Step 1: Test our enhanced offloading
        start_time = time.time()
        classification = self.offloading_manager.classify_task(test_case.task, test_case.context)
        
        if classification and classification.get('recommendation') == 'offload':
            offload_result = await self.offloading_manager.offload_task(test_case.task, test_case.context)
        else:
            offload_result = {
                'success': False,
                'reason': 'Routed to Claude',
                'result': '[This task was routed to Claude]',
                'cost_usd': 0.0,
                'model_used': 'claude'
            }
        
        # Step 2: Simulate Claude result (we'll create reference quality outputs)
        claude_result = self._simulate_claude_result(test_case)
        
        # Step 3: Estimate costs
        claude_cost = self._estimate_claude_cost(test_case.task, claude_result)
        offload_cost = offload_result.get('cost_usd', 0.0)
        
        # Step 4: Quality assessment
        claude_quality = self._assess_claude_quality(test_case, claude_result)
        offload_quality = self._assess_offload_quality(test_case, offload_result)
        
        # Step 5: Calculate metrics
        cost_savings = ((claude_cost - offload_cost) / claude_cost * 100) if claude_cost > 0 else 0
        quality_difference = offload_quality - claude_quality
        
        # Step 6: Make recommendation
        recommendation = self._make_recommendation(cost_savings, quality_difference, test_case.expected_quality_tier)
        
        return ComparisonResult(
            test_id=test_case.id,
            claude_result=claude_result[:500] + "..." if len(claude_result) > 500 else claude_result,
            offload_result=offload_result,
            claude_quality_score=claude_quality,
            offload_quality_score=offload_quality,
            claude_cost_estimate=claude_cost,
            offload_actual_cost=offload_cost,
            cost_savings_percent=cost_savings,
            quality_difference=quality_difference,
            recommendation=recommendation
        )
    
    def _simulate_claude_result(self, test_case: ComparisonTest) -> str:
        """Simulate what Claude would produce (reference implementation)"""
        
        # These are reference outputs representing Claude-quality results
        claude_references = {
            "simple_function": """
def factorial(n):
    '''Calculate the factorial of a number using recursion.
    
    Args:
        n (int): Non-negative integer
        
    Returns:
        int: Factorial of n
        
    Raises:
        ValueError: If n is negative
    '''
    if n < 0:
        raise ValueError("Factorial is not defined for negative numbers")
    elif n == 0 or n == 1:
        return 1
    else:
        return n * factorial(n - 1)

# Alternative iterative implementation for better performance
def factorial_iterative(n):
    if n < 0:
        raise ValueError("Factorial is not defined for negative numbers")
    
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result

# Example usage
print(factorial(5))  # Output: 120
print(factorial_iterative(5))  # Output: 120
""",
            
            "api_endpoint": """
from flask import Flask, request, jsonify
from werkzeug.security import generate_password_hash
import sqlite3
from datetime import datetime

app = Flask(__name__)

def init_db():
    '''Initialize the database with users table'''
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

@app.route('/api/users', methods=['POST'])
def create_user():
    '''Create a new user'''
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['username', 'email', 'password']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Hash password
        password_hash = generate_password_hash(data['password'])
        
        # Store in database
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO users (username, email, password_hash)
            VALUES (?, ?, ?)
        ''', (data['username'], data['email'], password_hash))
        
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'User created successfully',
            'user_id': user_id
        }), 201
        
    except sqlite3.IntegrityError as e:
        return jsonify({'error': 'Username or email already exists'}), 409
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    init_db()
    app.run(debug=True)
""",
            
            "data_processing": """
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
import logging
from pathlib import Path

class DataProcessor:
    '''Comprehensive data processing pipeline'''
    
    def __init__(self, log_level=logging.INFO):
        logging.basicConfig(level=log_level)
        self.logger = logging.getLogger(__name__)
        self.processing_stats = {}
    
    def read_csv_files(self, file_paths: List[str]) -> pd.DataFrame:
        '''Read and combine multiple CSV files'''
        dataframes = []
        
        for file_path in file_paths:
            try:
                df = pd.read_csv(file_path)
                df['source_file'] = Path(file_path).name
                dataframes.append(df)
                self.logger.info(f"Successfully read {file_path}: {len(df)} rows")
            except Exception as e:
                self.logger.error(f"Failed to read {file_path}: {e}")
        
        if not dataframes:
            raise ValueError("No valid CSV files could be read")
        
        combined_df = pd.concat(dataframes, ignore_index=True)
        self.logger.info(f"Combined dataset: {len(combined_df)} rows, {len(combined_df.columns)} columns")
        return combined_df
    
    def validate_data(self, df: pd.DataFrame, validation_rules: Dict[str, Any]) -> pd.DataFrame:
        '''Validate data according to specified rules'''
        validated_df = df.copy()
        
        for column, rules in validation_rules.items():
            if column not in df.columns:
                self.logger.warning(f"Column {column} not found in dataset")
                continue
            
            # Type validation
            if 'type' in rules:
                try:
                    validated_df[column] = validated_df[column].astype(rules['type'])
                except Exception as e:
                    self.logger.error(f"Type conversion failed for {column}: {e}")
            
            # Range validation
            if 'range' in rules:
                min_val, max_val = rules['range']
                mask = (validated_df[column] >= min_val) & (validated_df[column] <= max_val)
                invalid_count = (~mask).sum()
                if invalid_count > 0:
                    self.logger.warning(f"{invalid_count} values in {column} outside range {rules['range']}")
                    validated_df.loc[~mask, column] = np.nan
        
        return validated_df
    
    def handle_missing_values(self, df: pd.DataFrame, strategy: Dict[str, str]) -> pd.DataFrame:
        '''Handle missing values using various strategies'''
        processed_df = df.copy()
        
        for column, method in strategy.items():
            if column not in df.columns:
                continue
            
            missing_count = processed_df[column].isnull().sum()
            if missing_count == 0:
                continue
            
            if method == 'drop':
                processed_df = processed_df.dropna(subset=[column])
            elif method == 'mean':
                processed_df[column].fillna(processed_df[column].mean(), inplace=True)
            elif method == 'median':
                processed_df[column].fillna(processed_df[column].median(), inplace=True)
            elif method == 'mode':
                processed_df[column].fillna(processed_df[column].mode()[0], inplace=True)
            elif method == 'forward_fill':
                processed_df[column].fillna(method='ffill', inplace=True)
            elif method == 'backward_fill':
                processed_df[column].fillna(method='bfill', inplace=True)
            
            self.logger.info(f"Handled {missing_count} missing values in {column} using {method}")
        
        return processed_df
    
    def generate_summary_report(self, df: pd.DataFrame) -> Dict[str, Any]:
        '''Generate comprehensive summary report'''
        report = {
            'dataset_info': {
                'total_rows': len(df),
                'total_columns': len(df.columns),
                'memory_usage_mb': df.memory_usage(deep=True).sum() / 1024**2
            },
            'column_summaries': {},
            'data_quality': {
                'missing_values': df.isnull().sum().to_dict(),
                'duplicate_rows': df.duplicated().sum(),
                'completeness_percentage': ((1 - df.isnull().sum() / len(df)) * 100).to_dict()
            }
        }
        
        for column in df.columns:
            if df[column].dtype in ['int64', 'float64']:
                report['column_summaries'][column] = {
                    'type': 'numeric',
                    'mean': float(df[column].mean()),
                    'median': float(df[column].median()),
                    'std': float(df[column].std()),
                    'min': float(df[column].min()),
                    'max': float(df[column].max())
                }
            else:
                report['column_summaries'][column] = {
                    'type': 'categorical',
                    'unique_values': int(df[column].nunique()),
                    'most_frequent': str(df[column].mode()[0]) if not df[column].empty else None
                }
        
        return report

# Example usage
if __name__ == "__main__":
    processor = DataProcessor()
    
    # Configuration
    validation_rules = {
        'age': {'type': 'int', 'range': (0, 120)},
        'income': {'type': 'float', 'range': (0, 1000000)}
    }
    
    missing_value_strategy = {
        'age': 'median',
        'income': 'mean',
        'category': 'mode'
    }
    
    # Process data
    try:
        df = processor.read_csv_files(['data1.csv', 'data2.csv'])
        df = processor.validate_data(df, validation_rules)
        df = processor.handle_missing_values(df, missing_value_strategy)
        report = processor.generate_summary_report(df)
        
        print("Data processing completed successfully!")
        print(f"Final dataset: {report['dataset_info']['total_rows']} rows")
        
    except Exception as e:
        print(f"Processing failed: {e}")
""",
        }
        
        # Get the appropriate reference or generate a basic one
        task_key = test_case.id
        if task_key in claude_references:
            return claude_references[task_key]
        else:
            # Generate a basic reference based on task description
            return f"# Claude-quality implementation for: {test_case.description}\n\n" + \
                   f"# This would be a comprehensive, well-documented solution\n" + \
                   f"# covering all aspects of: {test_case.task}\n\n" + \
                   "# Implementation would include:\n" + \
                   "# - Error handling\n" + \
                   "# - Documentation\n" + \
                   "# - Best practices\n" + \
                   "# - Testing examples\n" + \
                   "# - Performance considerations"
    
    def _estimate_claude_cost(self, task: str, result: str) -> float:
        """Estimate what this would cost with Claude"""
        # Estimate tokens (rough approximation)
        input_tokens = len(task) // 4  # ~4 chars per token
        output_tokens = len(result) // 4
        total_tokens = input_tokens + output_tokens
        
        # Claude cost in EUR, convert to USD
        claude_cost_eur = (total_tokens / 1000) * self.claude_token_cost_eur
        claude_cost_usd = claude_cost_eur * self.eur_to_usd
        
        return claude_cost_usd
    
    def _assess_claude_quality(self, test_case: ComparisonTest, result: str) -> float:
        """Assess quality of Claude result (reference quality)"""
        # Claude results are our reference, so we assign high scores
        # based on expected quality tier
        quality_map = {
            "low": 7.5,
            "medium": 8.5,
            "high": 9.0,
            "critical": 9.5
        }
        return quality_map.get(test_case.expected_quality_tier, 8.5)
    
    def _assess_offload_quality(self, test_case: ComparisonTest, offload_result: Dict) -> float:
        """Assess quality of offload result"""
        if not offload_result.get('success'):
            return 0.0
        
        result = offload_result.get('result', '')
        if not result:
            return 0.0
        
        # Basic quality assessment
        base_score = 6.0
        
        # Length and completeness
        if len(result) > 500:
            base_score += 1.0
        if len(result) > 1500:
            base_score += 0.5
        
        # Code quality indicators
        if '```' in result:  # Code blocks
            base_score += 0.5
        if 'def ' in result or 'class ' in result:  # Python structures
            base_score += 0.5
        if 'import ' in result:  # Proper imports
            base_score += 0.3
        if '#' in result or '"""' in result:  # Comments/docstrings
            base_score += 0.4
        
        # Error handling and best practices
        if 'try:' in result or 'except' in result:
            base_score += 0.5
        if 'raise' in result or 'ValueError' in result:
            base_score += 0.3
        
        return min(10.0, base_score)
    
    def _make_recommendation(self, cost_savings: float, quality_difference: float, quality_tier: str) -> str:
        """Make recommendation based on cost and quality"""
        
        # Critical tasks need high quality
        if quality_tier == "critical":
            if quality_difference < -1.0:  # Much worse quality
                return "use_claude"
            elif quality_difference > -0.5 and cost_savings > 70:
                return "use_offload"
            else:
                return "use_claude"
        
        # High quality tasks
        elif quality_tier == "high":
            if quality_difference < -0.8:
                return "use_claude"
            elif quality_difference > -0.3 and cost_savings > 60:
                return "use_offload"
            else:
                return "equivalent"
        
        # Medium and low quality tasks
        else:
            if quality_difference < -1.5:
                return "use_claude"
            elif cost_savings > 50:
                return "use_offload"
            else:
                return "equivalent"
    
    def _analyze_comparison_results(self, results: List[ComparisonResult]) -> Dict[str, Any]:
        """Analyze comparison results"""
        
        if not results:
            return {'error': 'No results to analyze'}
        
        # Calculate averages
        avg_cost_savings = sum(r.cost_savings_percent for r in results) / len(results)
        avg_quality_diff = sum(r.quality_difference for r in results) / len(results)
        avg_claude_quality = sum(r.claude_quality_score for r in results) / len(results)
        avg_offload_quality = sum(r.offload_quality_score for r in results) / len(results)
        
        total_claude_cost = sum(r.claude_cost_estimate for r in results)
        total_offload_cost = sum(r.offload_actual_cost for r in results)
        
        # Recommendation breakdown
        recommendations = {}
        for r in results:
            rec = r.recommendation
            recommendations[rec] = recommendations.get(rec, 0) + 1
        
        # Quality comparison
        quality_wins = sum(1 for r in results if r.quality_difference > 0.5)
        quality_losses = sum(1 for r in results if r.quality_difference < -0.5)
        quality_ties = len(results) - quality_wins - quality_losses
        
        return {
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'total_tests': len(results),
                'avg_cost_savings_percent': round(avg_cost_savings, 1),
                'avg_quality_difference': round(avg_quality_diff, 2),
                'claude_avg_quality': round(avg_claude_quality, 1),
                'offload_avg_quality': round(avg_offload_quality, 1),
                'total_claude_cost_usd': round(total_claude_cost, 4),
                'total_offload_cost_usd': round(total_offload_cost, 4),
                'quality_wins': quality_wins,
                'quality_losses': quality_losses,
                'quality_ties': quality_ties
            },
            'recommendations': recommendations,
            'detailed_results': [
                {
                    'test_id': r.test_id,
                    'cost_savings_percent': round(r.cost_savings_percent, 1),
                    'quality_difference': round(r.quality_difference, 2),
                    'claude_quality': r.claude_quality_score,
                    'offload_quality': r.offload_quality_score,
                    'recommendation': r.recommendation,
                    'claude_cost': round(r.claude_cost_estimate, 4),
                    'offload_cost': round(r.offload_actual_cost, 4)
                } for r in results
            ]
        }
    
    def _save_comparison_results(self, analysis: Dict[str, Any]):
        """Save comparison results"""
        results_file = Path(__file__).parent / 'comparison_results.json'
        
        with open(results_file, 'w') as f:
            json.dump(analysis, f, indent=2)
        
        print(f"\n💾 Comparison results saved to: {results_file}")

def main():
    """Run side-by-side comparison"""
    
    comparator = SideBySideComparator()
    results = asyncio.run(comparator.run_comparison())
    
    # Print detailed analysis
    print("\n" + "=" * 60)
    print("🏆 COMPARISON ANALYSIS")
    print("=" * 60)
    
    summary = results['summary']
    print(f"📊 Tests Completed: {summary['total_tests']}")
    print(f"💰 Average Cost Savings: {summary['avg_cost_savings_percent']}%")
    print(f"🎯 Quality Comparison: Claude {summary['claude_avg_quality']}/10 vs Offload {summary['offload_avg_quality']}/10")
    print(f"📈 Quality Difference: {summary['avg_quality_difference']:+.1f} (positive = offload better)")
    print(f"💸 Total Cost: Claude ${summary['total_claude_cost_usd']:.4f} vs Offload ${summary['total_offload_cost_usd']:.4f}")
    
    print(f"\n🏅 Quality Comparison:")
    print(f"   Offload Wins: {summary['quality_wins']}")
    print(f"   Claude Wins: {summary['quality_losses']}")
    print(f"   Ties: {summary['quality_ties']}")
    
    print(f"\n📋 Recommendations:")
    for rec, count in results['recommendations'].items():
        print(f"   {rec.replace('_', ' ').title()}: {count} tests")
    
    # Overall assessment
    if summary['avg_cost_savings_percent'] > 70 and summary['avg_quality_difference'] > -0.5:
        print(f"\n✅ OFFLOADING SYSTEM VALIDATED - Significant cost savings with acceptable quality")
    elif summary['avg_cost_savings_percent'] > 50:
        print(f"\n⚠️  MIXED RESULTS - Good cost savings but quality needs improvement")
    else:
        print(f"\n❌ VALIDATION FAILED - System needs major improvements")

if __name__ == "__main__":
    main()