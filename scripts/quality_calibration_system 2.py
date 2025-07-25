#!/usr/bin/env python3
"""
Quality Calibration System
Tests and calibrates quality scoring against known good/bad outputs
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Tuple, Any
from dataclasses import dataclass
from quality_validation_framework import QualityValidator, QualityMetric, TestCase

@dataclass
class CalibrationSample:
    """Sample output for calibration with known quality score"""
    id: str
    description: str
    domain: str
    task: str
    output: str
    expected_quality: float
    quality_criteria: List[QualityMetric]
    notes: str = ""

class QualityCalibrator:
    """Calibrate quality scoring against known good/bad examples"""
    
    def __init__(self):
        self.validator = QualityValidator()
        self.calibration_samples = self._create_calibration_set()
        
    def _create_calibration_set(self) -> List[CalibrationSample]:
        """Create calibration samples with known quality scores"""
        
        return [
            # EXCELLENT CODE (should score 9.0+)
            CalibrationSample(
                id="excellent_code",
                description="High-quality Python function with full documentation",
                domain="code_generation",
                task="write a function to calculate factorial",
                output='''
def factorial(n: int) -> int:
    """
    Calculate the factorial of a non-negative integer.
    
    The factorial of n is the product of all positive integers less than or equal to n.
    By definition, 0! = 1.
    
    Args:
        n: Non-negative integer to calculate factorial for
        
    Returns:
        The factorial of n
        
    Raises:
        ValueError: If n is negative
        TypeError: If n is not an integer
        
    Examples:
        >>> factorial(0)
        1
        >>> factorial(5)
        120
        >>> factorial(10)
        3628800
    """
    if not isinstance(n, int):
        raise TypeError("Input must be an integer")
    
    if n < 0:
        raise ValueError("Factorial is not defined for negative numbers")
    
    if n == 0 or n == 1:
        return 1
    
    result = 1
    for i in range(2, n + 1):
        result *= i
    
    return result

# Alternative recursive implementation
def factorial_recursive(n: int) -> int:
    """Recursive implementation of factorial."""
    if not isinstance(n, int) or n < 0:
        raise ValueError("Input must be a non-negative integer")
    
    if n == 0 or n == 1:
        return 1
    
    return n * factorial_recursive(n - 1)

# Performance comparison and testing
if __name__ == "__main__":
    import time
    
    # Test both implementations
    test_values = [0, 1, 5, 10, 15]
    
    for val in test_values:
        iterative_result = factorial(val)
        recursive_result = factorial_recursive(val)
        
        assert iterative_result == recursive_result, f"Mismatch for {val}"
        print(f"factorial({val}) = {iterative_result}")
''',
                expected_quality=9.2,
                quality_criteria=[QualityMetric.CORRECTNESS, QualityMetric.COMPLETENESS, QualityMetric.MAINTAINABILITY]
            ),
            
            # POOR CODE (should score 3.0-4.0)
            CalibrationSample(
                id="poor_code",
                description="Low-quality code with issues",
                domain="code_generation",
                task="write a function to calculate factorial",
                output='''
def fact(n):
    if n==0:
        return 1
    else:
        return n*fact(n-1)
''',
                expected_quality=3.5,
                quality_criteria=[QualityMetric.CORRECTNESS, QualityMetric.COMPLETENESS, QualityMetric.MAINTAINABILITY],
                notes="Missing documentation, error handling, type hints"
            ),
            
            # EXCELLENT API (should score 9.0+)
            CalibrationSample(
                id="excellent_api",
                description="Comprehensive REST API with security",
                domain="api_design",
                task="create a REST API for user management",
                output='''
from flask import Flask, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import jwt
import sqlite3
from datetime import datetime, timedelta
import re

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'

def init_database():
    """Initialize the database with users table"""
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP,
            is_active BOOLEAN DEFAULT 1
        )
    ''')
    conn.commit()
    conn.close()

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r'\\d', password):
        return False, "Password must contain at least one digit"
    return True, "Password is valid"

def token_required(f):
    """Decorator for routes that require authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user_id = data['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token is invalid'}), 401
        
        return f(current_user_id, *args, **kwargs)
    
    return decorated

@app.route('/api/users/register', methods=['POST'])
def register_user():
    """Register a new user"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['username', 'email', 'password']
        for field in required_fields:
            if field not in data or not data[field].strip():
                return jsonify({'error': f'Missing or empty field: {field}'}), 400
        
        username = data['username'].strip()
        email = data['email'].strip().lower()
        password = data['password']
        
        # Validate email format
        if not validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Validate password strength
        is_valid, message = validate_password(password)
        if not is_valid:
            return jsonify({'error': message}), 400
        
        # Hash password
        password_hash = generate_password_hash(password)
        
        # Store in database
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO users (username, email, password_hash)
                VALUES (?, ?, ?)
            ''', (username, email, password_hash))
            
            user_id = cursor.lastrowid
            conn.commit()
            
            return jsonify({
                'message': 'User registered successfully',
                'user_id': user_id,
                'username': username
            }), 201
            
        except sqlite3.IntegrityError as e:
            if 'username' in str(e):
                return jsonify({'error': 'Username already exists'}), 409
            elif 'email' in str(e):
                return jsonify({'error': 'Email already registered'}), 409
            else:
                return jsonify({'error': 'Registration failed'}), 409
        
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/users/login', methods=['POST'])
def login_user():
    """Authenticate user and return JWT token"""
    try:
        data = request.get_json()
        
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Email and password are required'}), 400
        
        email = data['email'].strip().lower()
        password = data['password']
        
        # Get user from database
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, username, password_hash, is_active
            FROM users WHERE email = ?
        ''', (email,))
        
        user = cursor.fetchone()
        conn.close()
        
        if not user or not check_password_hash(user[2], password):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        if not user[3]:  # is_active
            return jsonify({'error': 'Account is deactivated'}), 401
        
        # Generate JWT token
        token_payload = {
            'user_id': user[0],
            'username': user[1],
            'exp': datetime.utcnow() + timedelta(hours=24)
        }
        
        token = jwt.encode(token_payload, app.config['SECRET_KEY'], algorithm='HS256')
        
        # Update last login
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
        ''', (user[0],))
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user[0],
                'username': user[1]
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/users/profile', methods=['GET'])
@token_required
def get_user_profile(current_user_id):
    """Get current user's profile"""
    try:
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, username, email, created_at, last_login
            FROM users WHERE id = ?
        ''', (current_user_id,))
        
        user = cursor.fetchone()
        conn.close()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'user': {
                'id': user[0],
                'username': user[1],
                'email': user[2],
                'created_at': user[3],
                'last_login': user[4]
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    init_database()
    app.run(debug=True, host='0.0.0.0', port=5000)
''',
                expected_quality=9.1,
                quality_criteria=[QualityMetric.CORRECTNESS, QualityMetric.SECURITY, QualityMetric.COMPLETENESS]
            ),
            
            # POOR API (should score 4.0-5.0)
            CalibrationSample(
                id="poor_api",
                description="Basic API without security or error handling",
                domain="api_design",
                task="create a REST API for user management",
                output='''
from flask import Flask, request

app = Flask(__name__)

@app.route('/users', methods=['POST'])
def create_user():
    data = request.json
    return {'message': 'User created', 'user': data}

@app.route('/users/<id>')
def get_user(id):
    return {'user': {'id': id, 'name': 'John'}}

app.run()
''',
                expected_quality=4.2,
                quality_criteria=[QualityMetric.CORRECTNESS, QualityMetric.SECURITY, QualityMetric.COMPLETENESS],
                notes="Missing validation, security, error handling, database"
            ),
            
            # EXCELLENT ARCHITECTURE (should score 9.0+)
            CalibrationSample(
                id="excellent_architecture",
                description="Comprehensive microservices architecture",
                domain="architecture",
                task="design microservices architecture for e-commerce",
                output='''
# E-Commerce Microservices Architecture Design

## 1. System Overview

This architecture implements a scalable, fault-tolerant e-commerce platform using microservices patterns with event-driven communication, CQRS, and cloud-native deployment.

## 2. Core Services

### 2.1 User Service
- **Responsibilities**: User authentication, authorization, profile management
- **Technology**: Node.js with Express, PostgreSQL
- **Patterns**: JWT authentication, OAuth2 integration
- **Scaling**: Horizontal scaling with Redis session store
- **Database**: PostgreSQL with read replicas

### 2.2 Product Catalog Service
- **Responsibilities**: Product information, inventory management, search
- **Technology**: Java Spring Boot, Elasticsearch
- **Patterns**: CQRS for read/write separation
- **Scaling**: Elasticsearch cluster for search, Redis for caching
- **Database**: PostgreSQL for writes, Elasticsearch for reads

### 2.3 Order Management Service
- **Responsibilities**: Order processing, order history, order status
- **Technology**: Python Django, PostgreSQL
- **Patterns**: Saga pattern for distributed transactions
- **Scaling**: Database sharding by customer region
- **Database**: PostgreSQL with event sourcing

### 2.4 Payment Service
- **Responsibilities**: Payment processing, fraud detection
- **Technology**: Go, PostgreSQL
- **Patterns**: Circuit breaker for external payment APIs
- **Security**: PCI DSS compliance, encrypted data storage
- **Database**: PostgreSQL with encryption at rest

### 2.5 Inventory Service
- **Responsibilities**: Stock management, reservation, allocation
- **Technology**: Java Spring Boot, Redis
- **Patterns**: Event sourcing for inventory changes
- **Scaling**: Redis cluster for real-time inventory
- **Database**: PostgreSQL + Redis

### 2.6 Notification Service
- **Responsibilities**: Email, SMS, push notifications
- **Technology**: Node.js, Message queues
- **Patterns**: Publisher-subscriber pattern
- **Scaling**: Queue-based processing with workers
- **Database**: MongoDB for notification history

## 3. Infrastructure Components

### 3.1 API Gateway
- **Technology**: Kong or AWS API Gateway
- **Features**: 
  - Rate limiting and throttling
  - Authentication and authorization
  - Request/response transformation
  - Load balancing
  - SSL termination
  - Request routing and versioning

### 3.2 Service Discovery
- **Technology**: Consul or Kubernetes DNS
- **Features**:
  - Dynamic service registration
  - Health checking
  - Load balancing
  - Configuration management

### 3.3 Message Broker
- **Technology**: Apache Kafka
- **Topics**:
  - user.events (registration, updates)
  - order.events (created, updated, cancelled)
  - inventory.events (stock changes)
  - payment.events (completed, failed)
- **Patterns**: Event sourcing, CQRS

### 3.4 Caching Layer
- **Technology**: Redis Cluster
- **Use Cases**:
  - Session storage
  - Product catalog caching
  - Real-time inventory
  - Rate limiting counters

### 3.5 Load Balancers
- **Technology**: HAProxy or AWS ALB
- **Features**:
  - Health checking
  - SSL termination
  - Sticky sessions where needed
  - Geographic routing

## 4. Data Management

### 4.1 Database Strategy
- **Pattern**: Database per service
- **Technologies**:
  - PostgreSQL for transactional data
  - MongoDB for document storage
  - Redis for caching and sessions
  - Elasticsearch for search

### 4.2 Data Consistency
- **Pattern**: Eventual consistency with event sourcing
- **Implementation**: Saga pattern for distributed transactions
- **Conflict Resolution**: Last-write-wins with timestamps

### 4.3 Backup and Recovery
- **Strategy**: Automated backups with point-in-time recovery
- **Implementation**: Database snapshots and transaction log shipping
- **Testing**: Regular disaster recovery drills

## 5. Security Architecture

### 5.1 Authentication & Authorization
- **Pattern**: OAuth2 with JWT tokens
- **Implementation**: 
  - Centralized authentication service
  - Role-based access control (RBAC)
  - API key management for service-to-service

### 5.2 Network Security
- **Implementation**:
  - VPC with private subnets
  - Security groups and NACLs
  - WAF for web application protection
  - DDoS protection

### 5.3 Data Security
- **Implementation**:
  - Encryption at rest and in transit
  - Secrets management (HashiCorp Vault)
  - PCI DSS compliance for payment data
  - Data masking in non-production environments

## 6. Monitoring and Observability

### 6.1 Metrics Collection
- **Technology**: Prometheus + Grafana
- **Metrics**: 
  - Business metrics (orders, revenue)
  - Technical metrics (latency, throughput)
  - Infrastructure metrics (CPU, memory)

### 6.2 Logging
- **Technology**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Features**:
  - Centralized logging
  - Structured logging with correlation IDs
  - Log aggregation and search

### 6.3 Distributed Tracing
- **Technology**: Jaeger or Zipkin
- **Features**:
  - Request tracing across services
  - Performance bottleneck identification
  - Error propagation tracking

### 6.4 Alerting
- **Technology**: PagerDuty integration
- **Rules**:
  - Service health alerts
  - Performance degradation alerts
  - Business metric alerts (order failures)

## 7. Deployment and DevOps

### 7.1 Containerization
- **Technology**: Docker containers
- **Registry**: Private container registry
- **Scanning**: Container vulnerability scanning

### 7.2 Orchestration
- **Technology**: Kubernetes
- **Features**:
  - Auto-scaling based on metrics
  - Rolling deployments
  - Health checks and self-healing
  - Resource management

### 7.3 CI/CD Pipeline
- **Technology**: GitLab CI or Jenkins
- **Stages**:
  - Code quality checks (SonarQube)
  - Automated testing (unit, integration, e2e)
  - Security scanning
  - Deployment to staging/production

### 7.4 Infrastructure as Code
- **Technology**: Terraform
- **Features**:
  - Version-controlled infrastructure
  - Automated provisioning
  - Environment consistency

## 8. Performance and Scalability

### 8.1 Horizontal Scaling
- **Implementation**: Auto-scaling groups
- **Triggers**: CPU, memory, queue depth
- **Strategy**: Scale out during peak hours

### 8.2 Caching Strategy
- **Levels**:
  - CDN for static content
  - API Gateway caching
  - Application-level caching
  - Database query caching

### 8.3 Database Optimization
- **Techniques**:
  - Read replicas for scaling reads
  - Database sharding for large datasets
  - Connection pooling
  - Query optimization

## 9. Disaster Recovery

### 9.1 Multi-Region Deployment
- **Strategy**: Active-passive setup
- **Implementation**: Database replication across regions
- **Failover**: Automated DNS failover

### 9.2 Backup Strategy
- **Frequency**: Daily automated backups
- **Retention**: 30 days for regular backups, 1 year for compliance
- **Testing**: Monthly restore testing

## 10. Compliance and Governance

### 10.1 Data Governance
- **Implementation**: Data classification and handling policies
- **Compliance**: GDPR, PCI DSS
- **Auditing**: Comprehensive audit trails

### 10.2 API Governance
- **Standards**: OpenAPI specifications
- **Versioning**: Semantic versioning with backward compatibility
- **Documentation**: Automated API documentation

This architecture provides a robust, scalable foundation for an e-commerce platform with proper separation of concerns, fault tolerance, and operational excellence.
''',
                expected_quality=9.3,
                quality_criteria=[QualityMetric.COMPLETENESS, QualityMetric.PERFORMANCE, QualityMetric.MAINTAINABILITY],
                notes="Comprehensive architecture with all key components"
            ),
            
            # POOR ARCHITECTURE (should score 3.0-4.0)
            CalibrationSample(
                id="poor_architecture",
                description="Incomplete architecture description",
                domain="architecture",
                task="design microservices architecture for e-commerce",
                output='''
E-commerce Architecture:

1. User service - handles users
2. Product service - manages products  
3. Order service - processes orders
4. Database - stores data
5. Load balancer - distributes requests

Use REST APIs between services. Deploy on cloud.
''',
                expected_quality=3.8,
                quality_criteria=[QualityMetric.COMPLETENESS, QualityMetric.PERFORMANCE, QualityMetric.MAINTAINABILITY],
                notes="Extremely shallow, missing critical details"
            )
        ]
    
    def run_calibration(self) -> Dict[str, Any]:
        """Run calibration against known samples"""
        
        print("🎯 RUNNING QUALITY CALIBRATION")
        print("=" * 50)
        
        results = []
        
        for sample in self.calibration_samples:
            print(f"\n📋 Testing: {sample.description}")
            
            # Create a test case from the sample
            test_case = TestCase(
                id=sample.id,
                description=sample.description,
                task=sample.task,
                expected_complexity="SIMPLE",  # Not relevant for calibration
                expected_model_tier="basic",   # Not relevant for calibration
                quality_criteria=sample.quality_criteria,
                minimum_quality_score=5.0
            )
            
            # Mock classification and offload result
            classification = {'complexity': 'SIMPLE', 'model': 'test'}
            offload_result = {'success': True, 'result': sample.output}
            
            # Assess quality using our system
            quality_scores = self.validator._assess_quality(test_case, classification, offload_result)
            overall_quality = sum(quality_scores.values()) / len(quality_scores) if quality_scores else 0.0
            
            # Calculate error
            error = abs(overall_quality - sample.expected_quality)
            error_percent = (error / sample.expected_quality) * 100
            
            result = {
                'sample_id': sample.id,
                'domain': sample.domain,
                'expected_quality': sample.expected_quality,
                'actual_quality': overall_quality,
                'error': error,
                'error_percent': error_percent,
                'quality_scores': {str(k): v for k, v in quality_scores.items()},
                'notes': sample.notes
            }
            
            results.append(result)
            
            status = "✅ GOOD" if error < 1.0 else "⚠️ FAIR" if error < 2.0 else "❌ POOR"
            print(f"   Expected: {sample.expected_quality:.1f} | Actual: {overall_quality:.1f} | Error: {error:.1f} ({error_percent:.0f}%) {status}")
        
        # Analyze calibration results
        analysis = self._analyze_calibration(results)
        self._save_calibration_results(analysis)
        
        return analysis
    
    def _analyze_calibration(self, results: List[Dict]) -> Dict[str, Any]:
        """Analyze calibration results"""
        
        if not results:
            return {'error': 'No calibration results'}
        
        # Calculate overall metrics
        total_samples = len(results)
        avg_error = sum(r['error'] for r in results) / total_samples
        avg_error_percent = sum(r['error_percent'] for r in results) / total_samples
        max_error = max(r['error'] for r in results)
        min_error = min(r['error'] for r in results)
        
        # Accuracy assessment
        good_accuracy = sum(1 for r in results if r['error'] < 1.0)
        fair_accuracy = sum(1 for r in results if 1.0 <= r['error'] < 2.0)
        poor_accuracy = sum(1 for r in results if r['error'] >= 2.0)
        
        # Domain-specific analysis
        domain_results = {}
        for result in results:
            domain = result['domain']
            if domain not in domain_results:
                domain_results[domain] = []
            domain_results[domain].append(result['error'])
        
        domain_analysis = {}
        for domain, errors in domain_results.items():
            domain_analysis[domain] = {
                'avg_error': sum(errors) / len(errors),
                'max_error': max(errors),
                'samples': len(errors)
            }
        
        return {
            'timestamp': '2025-07-20T20:41:00Z',
            'summary': {
                'total_samples': total_samples,
                'avg_error': round(avg_error, 2),
                'avg_error_percent': round(avg_error_percent, 1),
                'max_error': round(max_error, 2),
                'min_error': round(min_error, 2),
                'good_accuracy': good_accuracy,
                'fair_accuracy': fair_accuracy,
                'poor_accuracy': poor_accuracy,
                'accuracy_rate': round((good_accuracy / total_samples) * 100, 1)
            },
            'domain_analysis': domain_analysis,
            'detailed_results': results,
            'recommendations': self._generate_calibration_recommendations(results)
        }
    
    def _generate_calibration_recommendations(self, results: List[Dict]) -> List[str]:
        """Generate recommendations based on calibration results"""
        
        recommendations = []
        
        # Check overall accuracy
        avg_error = sum(r['error'] for r in results) / len(results)
        if avg_error > 2.0:
            recommendations.append("CRITICAL: Quality scoring has high error rate (>2.0 points average)")
        elif avg_error > 1.0:
            recommendations.append("WARNING: Quality scoring needs improvement (>1.0 points average error)")
        else:
            recommendations.append("GOOD: Quality scoring is reasonably accurate (<1.0 point average error)")
        
        # Check domain-specific issues
        poor_domains = []
        for result in results:
            if result['error'] > 2.0:
                poor_domains.append(result['domain'])
        
        if poor_domains:
            unique_domains = list(set(poor_domains))
            recommendations.append(f"FIX NEEDED: Poor accuracy in domains: {', '.join(unique_domains)}")
        
        # Check specific patterns
        high_quality_errors = [r for r in results if r['expected_quality'] > 8.0 and r['error'] > 1.5]
        if high_quality_errors:
            recommendations.append("ISSUE: System underestimates high-quality outputs")
        
        low_quality_errors = [r for r in results if r['expected_quality'] < 5.0 and r['actual_quality'] > 6.0]
        if low_quality_errors:
            recommendations.append("ISSUE: System overestimates low-quality outputs")
        
        return recommendations
    
    def _save_calibration_results(self, analysis: Dict[str, Any]):
        """Save calibration results to file"""
        
        results_file = Path(__file__).parent / 'quality_calibration_results.json'
        
        with open(results_file, 'w') as f:
            json.dump(analysis, f, indent=2)
        
        print(f"\n💾 Calibration results saved to: {results_file}")

def main():
    """Run quality calibration"""
    
    calibrator = QualityCalibrator()
    results = calibrator.run_calibration()
    
    # Print analysis
    print("\n" + "=" * 50)
    print("🏆 CALIBRATION ANALYSIS")
    print("=" * 50)
    
    summary = results['summary']
    print(f"📊 Samples Tested: {summary['total_samples']}")
    print(f"🎯 Average Error: {summary['avg_error']:.2f} points ({summary['avg_error_percent']:.1f}%)")
    print(f"📈 Error Range: {summary['min_error']:.2f} - {summary['max_error']:.2f} points")
    print(f"✅ Accuracy: {summary['good_accuracy']}/{summary['total_samples']} good ({summary['accuracy_rate']:.1f}%)")
    
    print(f"\n📋 Domain Analysis:")
    for domain, stats in results['domain_analysis'].items():
        print(f"   {domain}: {stats['avg_error']:.2f} avg error ({stats['samples']} samples)")
    
    print(f"\n💡 Recommendations:")
    for rec in results['recommendations']:
        print(f"   • {rec}")
    
    # Overall assessment
    if summary['avg_error'] < 1.0 and summary['accuracy_rate'] > 80:
        print(f"\n✅ CALIBRATION PASSED - Quality scoring is well-calibrated")
    elif summary['avg_error'] < 2.0:
        print(f"\n⚠️ CALIBRATION PARTIAL - Quality scoring needs minor adjustments")
    else:
        print(f"\n❌ CALIBRATION FAILED - Quality scoring needs major fixes")

if __name__ == "__main__":
    main()