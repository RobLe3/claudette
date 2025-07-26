#!/usr/bin/env python3
"""
Smart Budget Manager - Intelligent budget allocation and cost optimization
Ensures real cost savings through dynamic budget controls and ROI analysis
"""

import json
import sqlite3
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import statistics
from dataclasses import dataclass
from enum import Enum

# Import our cost tracker for integration
sys.path.append(str(Path(__file__).parent))
from tracker import ClaudeCostTracker

class TaskComplexity(Enum):
    TRIVIAL = "TRIVIAL"      # Simple queries, basic operations
    SIMPLE = "SIMPLE"        # Straightforward tasks, clear requirements  
    MODERATE = "MODERATE"    # Multi-step tasks, some complexity
    COMPLEX = "COMPLEX"      # Advanced tasks, multiple dependencies
    CRITICAL = "CRITICAL"    # Emergency tasks only

@dataclass
class BudgetConfig:
    """Budget configuration for different task complexities"""
    daily_total: float = 5.00           # Total daily ChatGPT budget
    trivial_limit: float = 1.00         # Budget for trivial tasks
    simple_limit: float = 1.50          # Budget for simple tasks
    moderate_limit: float = 2.00        # Budget for moderate tasks
    complex_limit: float = 0.50         # Budget for complex tasks (avoid)
    emergency_reserve: float = 0.50     # Emergency reserve
    
    # Per-task cost limits
    max_cost_per_task: Dict[str, float] = None
    
    def __post_init__(self):
        if self.max_cost_per_task is None:
            self.max_cost_per_task = {
                'TRIVIAL': 0.005,   # Max $0.005 per trivial task
                'SIMPLE': 0.010,    # Max $0.010 per simple task
                'MODERATE': 0.025,  # Max $0.025 per moderate task
                'COMPLEX': 0.050,   # Max $0.050 per complex task
                'CRITICAL': 0.100   # Max $0.100 per critical task (emergency only)
            }

@dataclass
class TaskCostEstimate:
    """Cost estimation for a task"""
    complexity: TaskComplexity
    estimated_cost: float
    budget_remaining: float
    recommended_action: str
    confidence: float
    reasoning: str
    alternative_suggestions: List[str] = None

class SmartBudgetManager:
    """Smart budget allocation and cost optimization system"""
    
    def __init__(self, config: Optional[BudgetConfig] = None):
        self.config = config or BudgetConfig()
        self.cost_tracker = ClaudeCostTracker()
        
        # Budget tracking database
        self.budget_db_path = Path.home() / ".claude" / "budget_tracker.db"
        self.budget_db_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Time-based budget allocation (hourly weights)
        self.hourly_budget_weights = {
            # Morning hours (productive time)
            8: 1.4, 9: 1.5, 10: 1.4, 11: 1.3,
            # Afternoon hours (moderate productivity)
            12: 1.1, 13: 1.0, 14: 1.2, 15: 1.3, 16: 1.2, 17: 1.1,
            # Evening hours (conservative)
            18: 0.9, 19: 0.8, 20: 0.7, 21: 0.6,
            # Night/early morning (minimal)
            22: 0.4, 23: 0.3, 0: 0.2, 1: 0.2, 2: 0.2, 3: 0.2, 4: 0.2, 5: 0.3, 6: 0.4, 7: 0.6
        }
        
        # Weekend budget reduction factor
        self.weekend_factor = 0.6  # 40% reduction on weekends
        
        self.init_budget_database()
    
    def init_budget_database(self):
        """Initialize budget tracking database"""
        conn = sqlite3.connect(self.budget_db_path)
        cursor = conn.cursor()
        
        # Budget allocation tracking
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS budget_allocations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date DATE,
                complexity TEXT,
                allocated_budget REAL,
                used_budget REAL DEFAULT 0.0,
                task_count INTEGER DEFAULT 0,
                efficiency_score REAL DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Task cost tracking
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS task_costs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id TEXT,
                task_description TEXT,
                complexity TEXT,
                estimated_cost REAL,
                actual_cost REAL,
                execution_time REAL,
                success_rate REAL,
                roi_score REAL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Budget performance metrics
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS budget_performance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date DATE,
                total_budget REAL,
                total_spent REAL,
                savings_achieved REAL,
                tasks_completed INTEGER,
                avg_task_cost REAL,
                budget_efficiency REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # ROI tracking
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS roi_tracking (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date DATE,
                claude_cost_equivalent REAL,
                chatgpt_actual_cost REAL,
                net_savings REAL,
                roi_percentage REAL,
                tasks_offloaded INTEGER,
                quality_impact_score REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def get_current_budget_allocation(self) -> Dict[str, float]:
        """Get dynamic budget allocation based on time and day"""
        now = datetime.now()
        current_hour = now.hour
        is_weekend = now.weekday() >= 5  # Saturday = 5, Sunday = 6
        
        # Base budget allocation
        base_allocation = {
            'trivial': self.config.trivial_limit,
            'simple': self.config.simple_limit,
            'moderate': self.config.moderate_limit,
            'complex': self.config.complex_limit,
            'emergency': self.config.emergency_reserve
        }
        
        # Apply time-based weight
        time_weight = self.hourly_budget_weights.get(current_hour, 1.0)
        
        # Apply weekend factor
        if is_weekend:
            time_weight *= self.weekend_factor
        
        # Adjust allocation based on time
        adjusted_allocation = {}
        for category, budget in base_allocation.items():
            if category == 'emergency':  # Emergency reserve stays constant
                adjusted_allocation[category] = budget
            else:
                adjusted_allocation[category] = budget * time_weight
        
        # Ensure total doesn't exceed daily limit
        total_allocated = sum(adjusted_allocation.values())
        if total_allocated > self.config.daily_total:
            scaling_factor = self.config.daily_total / total_allocated
            for category in adjusted_allocation:
                if category != 'emergency':
                    adjusted_allocation[category] *= scaling_factor
        
        return adjusted_allocation
    
    def get_daily_spending(self) -> Dict[str, float]:
        """Get current daily spending by complexity category"""
        today = datetime.now().date()
        
        conn = sqlite3.connect(self.budget_db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT complexity, SUM(actual_cost) 
            FROM task_costs 
            WHERE DATE(timestamp) = ?
            GROUP BY complexity
        ''', (today,))
        
        results = cursor.fetchall()
        conn.close()
        
        spending = {'trivial': 0.0, 'simple': 0.0, 'moderate': 0.0, 'complex': 0.0}
        for complexity, cost in results:
            if complexity.lower() in spending:
                spending[complexity.lower()] = cost or 0.0
        
        return spending
    
    def classify_task_complexity(self, task_description: str, context_size: int = 0) -> TaskComplexity:
        """Classify task complexity using enhanced analysis"""
        task_lower = task_description.lower()
        
        # Trivial task indicators
        trivial_patterns = [
            'hello', 'hi', 'test', 'simple', 'quick', 'basic',
            'what is', 'define', 'explain briefly', 'short answer'
        ]
        
        # Simple task indicators
        simple_patterns = [
            'write function', 'create script', 'simple code', 'basic implementation',
            'format text', 'convert', 'translate', 'summarize short'
        ]
        
        # Complex task indicators
        complex_patterns = [
            'architecture', 'system design', 'complex algorithm', 'optimization',
            'multiple files', 'full application', 'comprehensive analysis',
            'detailed research', 'advanced features'
        ]
        
        # Critical task indicators (emergency only)
        critical_patterns = [
            'urgent', 'emergency', 'critical bug', 'production issue',
            'immediate fix', 'breaking', 'system down'
        ]
        
        # Check for critical first
        if any(pattern in task_lower for pattern in critical_patterns):
            return TaskComplexity.CRITICAL
        
        # Check for complex
        if any(pattern in task_lower for pattern in complex_patterns):
            return TaskComplexity.COMPLEX
        
        # Check context size
        if context_size > 10000:  # Large context = more complex
            return TaskComplexity.COMPLEX
        elif context_size > 5000:
            return TaskComplexity.MODERATE
        
        # Check for simple
        if any(pattern in task_lower for pattern in simple_patterns):
            return TaskComplexity.SIMPLE
        
        # Check for trivial
        if any(pattern in task_lower for pattern in trivial_patterns) or len(task_description) < 50:
            return TaskComplexity.TRIVIAL
        
        # Default to moderate for unclear cases
        return TaskComplexity.MODERATE
    
    def estimate_task_cost(self, task_description: str, context: str = "") -> TaskCostEstimate:
        """Estimate task cost and provide budget recommendations"""
        complexity = self.classify_task_complexity(task_description, len(context))
        
        # Get current budget allocation and spending
        current_allocation = self.get_current_budget_allocation()
        daily_spending = self.get_daily_spending()
        
        # Calculate remaining budget for this complexity level
        complexity_key = complexity.value.lower()
        allocated_budget = current_allocation.get(complexity_key, 0.0)
        spent_budget = daily_spending.get(complexity_key, 0.0)
        remaining_budget = allocated_budget - spent_budget
        
        # Estimate cost based on complexity and historical data
        max_cost = self.config.max_cost_per_task[complexity.value]
        estimated_cost = self._calculate_estimated_cost(complexity, len(task_description), len(context))
        
        # Determine recommendation
        if remaining_budget <= 0:
            recommendation = "REJECT_BUDGET_EXCEEDED"
            reasoning = f"Daily budget for {complexity.value} tasks exceeded (${spent_budget:.3f}/${allocated_budget:.3f})"
        elif estimated_cost > remaining_budget:
            recommendation = "REJECT_INSUFFICIENT_BUDGET"
            reasoning = f"Estimated cost (${estimated_cost:.3f}) exceeds remaining budget (${remaining_budget:.3f})"
        elif estimated_cost > max_cost:
            recommendation = "REJECT_COST_LIMIT"
            reasoning = f"Estimated cost (${estimated_cost:.3f}) exceeds per-task limit (${max_cost:.3f})"
        elif complexity == TaskComplexity.COMPLEX and estimated_cost > 0.025:
            recommendation = "DEGRADE_TO_CLAUDE"
            reasoning = "Complex task - use Claude for better cost efficiency"
        else:
            recommendation = "APPROVE"
            reasoning = f"Within budget and cost limits (${estimated_cost:.3f}/${remaining_budget:.3f})"
        
        # Calculate confidence based on historical accuracy
        confidence = self._calculate_confidence(complexity, estimated_cost)
        
        # Generate alternative suggestions
        alternatives = self._generate_alternatives(complexity, estimated_cost, remaining_budget)
        
        return TaskCostEstimate(
            complexity=complexity,
            estimated_cost=estimated_cost,
            budget_remaining=remaining_budget,
            recommended_action=recommendation,
            confidence=confidence,
            reasoning=reasoning,
            alternative_suggestions=alternatives
        )
    
    def _calculate_estimated_cost(self, complexity: TaskComplexity, description_length: int, context_length: int) -> float:
        """Calculate estimated cost based on task characteristics"""
        # Base cost by complexity
        base_costs = {
            TaskComplexity.TRIVIAL: 0.002,
            TaskComplexity.SIMPLE: 0.005,
            TaskComplexity.MODERATE: 0.015,
            TaskComplexity.COMPLEX: 0.035,
            TaskComplexity.CRITICAL: 0.075
        }
        
        base_cost = base_costs[complexity]
        
        # Adjust for content length
        length_factor = 1.0
        total_length = description_length + context_length
        
        if total_length > 5000:
            length_factor = 1.5
        elif total_length > 2000:
            length_factor = 1.3
        elif total_length > 1000:
            length_factor = 1.1
        
        estimated_cost = base_cost * length_factor
        
        # Add historical adjustment based on past accuracy
        historical_factor = self._get_historical_cost_factor(complexity)
        estimated_cost *= historical_factor
        
        return round(estimated_cost, 6)
    
    def _get_historical_cost_factor(self, complexity: TaskComplexity) -> float:
        """Get historical cost factor based on past predictions vs actual costs"""
        conn = sqlite3.connect(self.budget_db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT estimated_cost, actual_cost
            FROM task_costs
            WHERE complexity = ? AND actual_cost > 0
            ORDER BY timestamp DESC
            LIMIT 20
        ''', (complexity.value,))
        
        results = cursor.fetchall()
        conn.close()
        
        if not results:
            return 1.0  # No historical data, use base estimate
        
        # Calculate average ratio of actual to estimated
        ratios = []
        for estimated, actual in results:
            if estimated > 0:
                ratios.append(actual / estimated)
        
        if ratios:
            avg_ratio = statistics.mean(ratios)
            # Clamp between 0.5 and 2.0 to avoid extreme adjustments
            return max(0.5, min(2.0, avg_ratio))
        
        return 1.0
    
    def _calculate_confidence(self, complexity: TaskComplexity, estimated_cost: float) -> float:
        """Calculate confidence in cost estimate"""
        # Base confidence by complexity (simpler = more confident)
        base_confidence = {
            TaskComplexity.TRIVIAL: 0.9,
            TaskComplexity.SIMPLE: 0.8,
            TaskComplexity.MODERATE: 0.7,
            TaskComplexity.COMPLEX: 0.6,
            TaskComplexity.CRITICAL: 0.5
        }
        
        confidence = base_confidence[complexity]
        
        # Adjust based on historical accuracy
        historical_factor = self._get_historical_accuracy(complexity)
        confidence *= historical_factor
        
        return round(max(0.1, min(1.0, confidence)), 2)
    
    def _get_historical_accuracy(self, complexity: TaskComplexity) -> float:
        """Get historical prediction accuracy for this complexity level"""
        conn = sqlite3.connect(self.budget_db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT estimated_cost, actual_cost
            FROM task_costs
            WHERE complexity = ? AND actual_cost > 0
            ORDER BY timestamp DESC
            LIMIT 10
        ''', (complexity.value,))
        
        results = cursor.fetchall()
        conn.close()
        
        if not results:
            return 1.0
        
        # Calculate accuracy as inverse of mean absolute percentage error
        errors = []
        for estimated, actual in results:
            if estimated > 0:
                error = abs(actual - estimated) / estimated
                errors.append(error)
        
        if errors:
            mean_error = statistics.mean(errors)
            accuracy = max(0.5, 1.0 - mean_error)  # Convert error to accuracy
            return accuracy
        
        return 1.0
    
    def _generate_alternatives(self, complexity: TaskComplexity, estimated_cost: float, remaining_budget: float) -> List[str]:
        """Generate alternative suggestions for cost optimization"""
        alternatives = []
        
        if estimated_cost > remaining_budget:
            alternatives.append("Reduce task scope to fit within budget")
            alternatives.append("Split task into smaller, simpler parts")
            alternatives.append("Use Claude Code instead for this complexity level")
        
        if complexity in [TaskComplexity.COMPLEX, TaskComplexity.CRITICAL]:
            alternatives.append("Consider using Claude for complex reasoning tasks")
            alternatives.append("Break down into multiple simpler tasks")
        
        if estimated_cost > 0.02:  # High cost task
            alternatives.append("Simplify requirements to reduce token usage")
            alternatives.append("Use template-based approach if possible")
        
        return alternatives
    
    def validate_task_execution(self, task_description: str, context: str = "") -> Dict[str, Any]:
        """Validate if task should be executed based on budget constraints"""
        estimate = self.estimate_task_cost(task_description, context)
        
        validation_result = {
            'approved': estimate.recommended_action == "APPROVE",
            'complexity': estimate.complexity.value,
            'estimated_cost': estimate.estimated_cost,
            'budget_remaining': estimate.budget_remaining,
            'recommendation': estimate.recommended_action,
            'reasoning': estimate.reasoning,
            'confidence': estimate.confidence,
            'alternatives': estimate.alternative_suggestions or [],
            'budget_status': self._get_budget_status()
        }
        
        return validation_result
    
    def _get_budget_status(self) -> Dict[str, Any]:
        """Get comprehensive budget status"""
        allocation = self.get_current_budget_allocation()
        spending = self.get_daily_spending()
        
        total_allocated = sum(allocation.values())
        total_spent = sum(spending.values())
        
        status = {
            'total_budget': self.config.daily_total,
            'total_allocated': total_allocated,
            'total_spent': total_spent,
            'remaining': total_allocated - total_spent,
            'utilization_percentage': (total_spent / total_allocated * 100) if total_allocated > 0 else 0,
            'by_complexity': {}
        }
        
        for complexity in ['trivial', 'simple', 'moderate', 'complex']:
            allocated = allocation.get(complexity, 0.0)
            spent = spending.get(complexity, 0.0)
            remaining = allocated - spent
            
            status['by_complexity'][complexity] = {
                'allocated': allocated,
                'spent': spent,
                'remaining': remaining,
                'utilization_percentage': (spent / allocated * 100) if allocated > 0 else 0
            }
        
        return status
    
    def track_task_execution(self, task_id: str, task_description: str, estimated_cost: float, 
                           actual_cost: float, execution_time: float, success: bool) -> None:
        """Track task execution for budget optimization learning"""
        complexity = self.classify_task_complexity(task_description)
        success_rate = 1.0 if success else 0.0
        
        # Calculate ROI (cost efficiency)
        claude_equivalent_cost = estimated_cost * 1.5  # Assume Claude would cost 50% more
        roi_score = (claude_equivalent_cost - actual_cost) / actual_cost if actual_cost > 0 else 0.0
        
        conn = sqlite3.connect(self.budget_db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO task_costs 
            (task_id, task_description, complexity, estimated_cost, actual_cost, 
             execution_time, success_rate, roi_score, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (task_id, task_description, complexity.value, estimated_cost, actual_cost,
              execution_time, success_rate, roi_score, datetime.now()))
        
        conn.commit()
        conn.close()
        
        # Update daily performance metrics
        self._update_daily_performance()
    
    def _update_daily_performance(self):
        """Update daily budget performance metrics"""
        today = datetime.now().date()
        
        conn = sqlite3.connect(self.budget_db_path)
        cursor = conn.cursor()
        
        # Calculate daily metrics
        cursor.execute('''
            SELECT 
                COUNT(*) as task_count,
                SUM(actual_cost) as total_spent,
                AVG(actual_cost) as avg_task_cost,
                AVG(roi_score) as avg_roi,
                SUM(CASE WHEN success_rate = 1.0 THEN 1 ELSE 0 END) as successful_tasks
            FROM task_costs
            WHERE DATE(timestamp) = ?
        ''', (today,))
        
        result = cursor.fetchone()
        
        if result and result[0] > 0:  # If we have data for today
            task_count, total_spent, avg_task_cost, avg_roi, successful_tasks = result
            
            # Calculate budget efficiency
            total_budget = self.config.daily_total
            budget_efficiency = (1 - (total_spent / total_budget)) if total_budget > 0 else 0.0
            
            # Calculate savings achieved
            estimated_claude_cost = total_spent * 1.5  # Estimate what Claude would have cost
            savings_achieved = estimated_claude_cost - total_spent
            
            # Insert or update daily performance
            cursor.execute('''
                INSERT OR REPLACE INTO budget_performance
                (date, total_budget, total_spent, savings_achieved, tasks_completed,
                 avg_task_cost, budget_efficiency, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (today, total_budget, total_spent, savings_achieved, task_count,
                  avg_task_cost, budget_efficiency, datetime.now()))
        
        conn.commit()
        conn.close()
    
    def calculate_roi_analysis(self, days: int = 7) -> Dict[str, Any]:
        """Calculate ROI analysis for the specified period"""
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days-1)
        
        conn = sqlite3.connect(self.budget_db_path)
        cursor = conn.cursor()
        
        # Get task costs for the period
        cursor.execute('''
            SELECT complexity, SUM(actual_cost), COUNT(*), AVG(roi_score)
            FROM task_costs
            WHERE DATE(timestamp) >= ? AND DATE(timestamp) <= ?
            GROUP BY complexity
        ''', (start_date, end_date))
        
        complexity_results = cursor.fetchall()
        
        # Get overall metrics
        cursor.execute('''
            SELECT 
                SUM(actual_cost) as total_chatgpt_cost,
                COUNT(*) as total_tasks,
                AVG(actual_cost) as avg_cost_per_task,
                AVG(roi_score) as avg_roi
            FROM task_costs
            WHERE DATE(timestamp) >= ? AND DATE(timestamp) <= ?
        ''', (start_date, end_date))
        
        overall_result = cursor.fetchone()
        conn.close()
        
        # Calculate comprehensive ROI analysis
        total_chatgpt_cost = overall_result[0] or 0.0
        total_tasks = overall_result[1] or 0
        avg_cost_per_task = overall_result[2] or 0.0
        avg_roi = overall_result[3] or 0.0
        
        # Estimate what these tasks would have cost with Claude
        estimated_claude_cost = total_chatgpt_cost * 1.5  # Conservative estimate
        net_savings = estimated_claude_cost - total_chatgpt_cost
        roi_percentage = (net_savings / total_chatgpt_cost * 100) if total_chatgpt_cost > 0 else 0.0
        
        # Quality impact analysis
        quality_penalty = 0.1  # Assume 10% quality reduction
        effective_savings = net_savings * (1 - quality_penalty)
        
        analysis = {
            'period': f"{start_date} to {end_date}",
            'total_tasks': total_tasks,
            'chatgpt_cost': total_chatgpt_cost,
            'estimated_claude_cost': estimated_claude_cost,
            'gross_savings': net_savings,
            'quality_adjusted_savings': effective_savings,
            'roi_percentage': roi_percentage,
            'avg_cost_per_task': avg_cost_per_task,
            'daily_average_cost': total_chatgpt_cost / days,
            'budget_compliance': {
                'daily_limit': self.config.daily_total,
                'avg_daily_spend': total_chatgpt_cost / days,
                'compliance_rate': (1 - ((total_chatgpt_cost / days) / self.config.daily_total)) * 100
            },
            'by_complexity': {}
        }
        
        # Add complexity breakdown
        for complexity, cost, count, roi in complexity_results:
            analysis['by_complexity'][complexity] = {
                'total_cost': cost,
                'task_count': count,
                'avg_cost': cost / count if count > 0 else 0.0,
                'avg_roi': roi or 0.0
            }
        
        return analysis
    
    def generate_budget_report(self, days: int = 7) -> str:
        """Generate comprehensive budget performance report"""
        roi_analysis = self.calculate_roi_analysis(days)
        budget_status = self._get_budget_status()
        
        report = f"""
╭─────────────────────────────────────────────────────────╮
│               💰 SMART BUDGET MANAGER REPORT           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📊 BUDGET STATUS (Today)                               │
│     Total Budget: ${self.config.daily_total:.2f}                           │
│     Allocated: ${budget_status['total_allocated']:.2f}                             │
│     Spent: ${budget_status['total_spent']:.2f}                                │
│     Remaining: ${budget_status['remaining']:.2f}                              │
│     Utilization: {budget_status['utilization_percentage']:.1f}%                              │
│                                                         │
│  🎯 ROI ANALYSIS ({days} days)                           │
│     ChatGPT Cost: ${roi_analysis['chatgpt_cost']:.2f}                       │
│     Claude Equivalent: ${roi_analysis['estimated_claude_cost']:.2f}                    │
│     Gross Savings: ${roi_analysis['gross_savings']:.2f}                      │
│     Quality Adjusted: ${roi_analysis['quality_adjusted_savings']:.2f}                   │
│     ROI: {roi_analysis['roi_percentage']:.1f}%                                │
│                                                         │
│  📈 PERFORMANCE METRICS                                 │
│     Tasks Completed: {roi_analysis['total_tasks']}                            │
│     Avg Cost/Task: ${roi_analysis['avg_cost_per_task']:.3f}                  │
│     Daily Avg: ${roi_analysis['daily_average_cost']:.2f}                         │
│     Budget Compliance: {roi_analysis['budget_compliance']['compliance_rate']:.1f}%              │
│                                                         │
│  🔄 COMPLEXITY BREAKDOWN                                │"""

        for complexity, data in roi_analysis['by_complexity'].items():
            report += f"\n│     {complexity.upper()}: {data['task_count']} tasks, ${data['total_cost']:.3f} total          │"

        report += f"""
│                                                         │
│  ⚡ BUDGET ALLOCATION (Current Hour)                    │"""

        current_allocation = self.get_current_budget_allocation()
        for category, amount in current_allocation.items():
            spent = budget_status['by_complexity'].get(category, {}).get('spent', 0.0)
            remaining = amount - spent
            report += f"\n│     {category.upper()}: ${amount:.2f} allocated, ${remaining:.2f} remaining          │"

        # Recommendations
        recommendations = self._generate_budget_recommendations(roi_analysis, budget_status)
        
        report += f"""
│                                                         │
│  💡 RECOMMENDATIONS                                     │"""

        for rec in recommendations[:3]:  # Show top 3 recommendations
            report += f"\n│     • {rec:<50} │"

        report += f"""
│                                                         │
╰─────────────────────────────────────────────────────────╯

🎯 TARGET OUTCOMES STATUS:
├── Daily Cost < $5.00: {'✅' if roi_analysis['daily_average_cost'] < 5.0 else '❌'} (${roi_analysis['daily_average_cost']:.2f})
├── Avg Cost/Task < $0.02: {'✅' if roi_analysis['avg_cost_per_task'] < 0.02 else '❌'} (${roi_analysis['avg_cost_per_task']:.3f})
├── Budget Compliance > 70%: {'✅' if roi_analysis['budget_compliance']['compliance_rate'] > 70 else '❌'} ({roi_analysis['budget_compliance']['compliance_rate']:.1f}%)
└── Positive ROI > 0%: {'✅' if roi_analysis['roi_percentage'] > 0 else '❌'} ({roi_analysis['roi_percentage']:.1f}%)
"""
        return report.strip()
    
    def _generate_budget_recommendations(self, roi_analysis: Dict, budget_status: Dict) -> List[str]:
        """Generate actionable budget recommendations"""
        recommendations = []
        
        # Check daily spending
        if roi_analysis['daily_average_cost'] > self.config.daily_total:
            recommendations.append("Reduce daily spending - currently exceeding budget")
        
        # Check cost per task
        if roi_analysis['avg_cost_per_task'] > 0.02:
            recommendations.append("Focus on simpler tasks to reduce average cost per task")
        
        # Check ROI
        if roi_analysis['roi_percentage'] < 10:
            recommendations.append("Improve task selection - ROI below 10% threshold")
        
        # Check budget utilization
        if budget_status['utilization_percentage'] > 90:
            recommendations.append("High budget utilization - consider increasing limits or reducing scope")
        elif budget_status['utilization_percentage'] < 30:
            recommendations.append("Low budget utilization - opportunity for more task offloading")
        
        # Check complexity distribution
        for complexity, data in roi_analysis['by_complexity'].items():
            if complexity == 'COMPLEX' and data['task_count'] > 3:
                recommendations.append("Too many complex tasks - consider using Claude instead")
            elif complexity == 'TRIVIAL' and data['avg_cost'] > 0.01:
                recommendations.append("Trivial tasks costing too much - optimize prompts")
        
        # Time-based recommendations
        current_hour = datetime.now().hour
        if current_hour >= 22 or current_hour <= 6:  # Night hours
            recommendations.append("Night hours - consider deferring non-urgent tasks")
        
        return recommendations[:5]  # Return top 5 recommendations
    
    def get_budget_alerts(self) -> List[Dict[str, Any]]:
        """Get budget alerts and warnings"""
        alerts = []
        budget_status = self._get_budget_status()
        
        # Total budget alerts
        if budget_status['utilization_percentage'] >= 90:
            alerts.append({
                'level': 'CRITICAL',
                'message': f"Daily budget at {budget_status['utilization_percentage']:.1f}% - approaching limit!",
                'action': 'Stop non-essential tasks'
            })
        elif budget_status['utilization_percentage'] >= 75:
            alerts.append({
                'level': 'WARNING',
                'message': f"Daily budget at {budget_status['utilization_percentage']:.1f}% - monitor closely",
                'action': 'Prioritize simple tasks only'
            })
        
        # Complexity-specific alerts
        for complexity, data in budget_status['by_complexity'].items():
            if data['utilization_percentage'] >= 90:
                alerts.append({
                    'level': 'WARNING',
                    'message': f"{complexity.upper()} budget at {data['utilization_percentage']:.1f}%",
                    'action': f'Avoid {complexity} tasks for remainder of day'
                })
        
        # ROI alerts
        roi_analysis = self.calculate_roi_analysis(1)  # Today only
        if roi_analysis['roi_percentage'] < 0:
            alerts.append({
                'level': 'CRITICAL',
                'message': f"Negative ROI today: {roi_analysis['roi_percentage']:.1f}%",
                'action': 'Switch to Claude Code for remaining tasks'
            })
        
        return alerts

def main():
    """CLI interface for Smart Budget Manager"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Smart Budget Manager for Claude Code')
    parser.add_argument('--action', choices=['validate', 'report', 'status', 'alerts', 'roi'], 
                       default='status', help='Action to perform')
    parser.add_argument('--task', help='Task description for validation')
    parser.add_argument('--context', help='Task context for validation')
    parser.add_argument('--days', type=int, default=7, help='Days for analysis')
    
    args = parser.parse_args()
    
    budget_manager = SmartBudgetManager()
    
    if args.action == 'validate':
        if not args.task:
            print("Error: --task required for validation")
            return
        
        result = budget_manager.validate_task_execution(args.task, args.context or "")
        print(json.dumps(result, indent=2))
    
    elif args.action == 'report':
        print(budget_manager.generate_budget_report(args.days))
    
    elif args.action == 'status':
        status = budget_manager._get_budget_status()
        print(json.dumps(status, indent=2))
    
    elif args.action == 'alerts':
        alerts = budget_manager.get_budget_alerts()
        if alerts:
            print("🚨 BUDGET ALERTS:")
            for alert in alerts:
                level_emoji = {'CRITICAL': '🔴', 'WARNING': '🟡', 'INFO': '🔵'}
                print(f"{level_emoji.get(alert['level'], '⚪')} {alert['level']}: {alert['message']}")
                print(f"   Action: {alert['action']}")
        else:
            print("✅ No budget alerts")
    
    elif args.action == 'roi':
        roi_analysis = budget_manager.calculate_roi_analysis(args.days)
        print(json.dumps(roi_analysis, indent=2))

if __name__ == "__main__":
    main()