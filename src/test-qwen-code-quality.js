#!/usr/bin/env node

// Comprehensive Qwen Code Quality Assessment
// Measures coding capabilities across multiple dimensions

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================================================
// CODE QUALITY TEST SCENARIOS
// ============================================================================

const CODE_QUALITY_TESTS = [
  {
    category: 'Basic Programming',
    weight: 0.15,
    tests: [
      {
        name: 'Simple Function',
        prompt: 'Write a Python function to calculate the factorial of a number',
        expectedElements: ['def', 'factorial', 'return', 'if'],
        qualityMetrics: ['syntax', 'logic', 'readability']
      },
      {
        name: 'List Processing',
        prompt: 'Create a function that finds all prime numbers up to n using the Sieve of Eratosthenes',
        expectedElements: ['sieve', 'prime', 'range', 'for'],
        qualityMetrics: ['algorithm', 'efficiency', 'correctness']
      }
    ]
  },
  {
    category: 'Object-Oriented Programming', 
    weight: 0.20,
    tests: [
      {
        name: 'Class Design',
        prompt: 'Create a Python class for a Bank Account with methods for deposit, withdraw, and check balance. Include proper encapsulation and error handling.',
        expectedElements: ['class', 'def __init__', 'deposit', 'withdraw', 'balance', 'private'],
        qualityMetrics: ['encapsulation', 'error_handling', 'design_patterns']
      },
      {
        name: 'Inheritance',
        prompt: 'Design a vehicle hierarchy with a base Vehicle class and derived Car and Truck classes. Include method overriding and polymorphism.',
        expectedElements: ['class Vehicle', 'class Car', 'inherit', 'super', 'override'],
        qualityMetrics: ['inheritance', 'polymorphism', 'method_overriding']
      }
    ]
  },
  {
    category: 'Data Structures & Algorithms',
    weight: 0.25,
    tests: [
      {
        name: 'Binary Tree',
        prompt: 'Implement a binary search tree in Python with insert, search, and in-order traversal methods',
        expectedElements: ['class Node', 'insert', 'search', 'traversal', 'left', 'right'],
        qualityMetrics: ['data_structure_design', 'recursion', 'tree_operations']
      },
      {
        name: 'Graph Algorithm',
        prompt: 'Implement breadth-first search (BFS) for finding the shortest path in an unweighted graph',
        expectedElements: ['bfs', 'queue', 'visited', 'neighbors', 'path'],
        qualityMetrics: ['algorithm_implementation', 'graph_theory', 'path_finding']
      }
    ]
  },
  {
    category: 'Web Development',
    weight: 0.15,
    tests: [
      {
        name: 'REST API',
        prompt: 'Create a simple REST API endpoint in Python using Flask for managing a todo list (GET, POST, PUT, DELETE)',
        expectedElements: ['flask', 'route', 'GET', 'POST', 'json', 'request'],
        qualityMetrics: ['rest_principles', 'http_methods', 'json_handling']
      },
      {
        name: 'Database Integration',
        prompt: 'Write Python code to connect to a SQLite database and perform CRUD operations on a users table',
        expectedElements: ['sqlite3', 'connect', 'cursor', 'execute', 'CREATE', 'INSERT'],
        qualityMetrics: ['database_operations', 'sql_knowledge', 'connection_handling']
      }
    ]
  },
  {
    category: 'System Programming',
    weight: 0.10,
    tests: [
      {
        name: 'File Operations',
        prompt: 'Create a Python script that reads a CSV file, processes the data, and writes results to a new file with error handling',
        expectedElements: ['csv', 'open', 'reader', 'writer', 'try', 'except'],
        qualityMetrics: ['file_handling', 'csv_processing', 'exception_handling']
      }
    ]
  },
  {
    category: 'Advanced Programming',
    weight: 0.15,
    tests: [
      {
        name: 'Decorators & Context Managers',
        prompt: 'Implement a Python decorator for timing function execution and a context manager for database connections',
        expectedElements: ['decorator', 'functools', 'wraps', 'context manager', '__enter__', '__exit__'],
        qualityMetrics: ['advanced_python', 'metaprogramming', 'resource_management']
      },
      {
        name: 'Async Programming',
        prompt: 'Write asynchronous Python code using asyncio to make concurrent HTTP requests and process responses',
        expectedElements: ['async', 'await', 'asyncio', 'aiohttp', 'gather'],
        qualityMetrics: ['async_programming', 'concurrency', 'performance_optimization']
      }
    ]
  }
];

// ============================================================================
// CODE QUALITY ASSESSMENT ENGINE
// ============================================================================

class QwenCodeQualityEngine {
  constructor() {
    this.results = {
      categoryScores: {},
      overallMetrics: {},
      codeExamples: {},
      qualityAnalysis: {}
    };
    this.startTime = Date.now();
  }

  getApiKeyFromKeychain(service, account) {
    try {
      return execSync(`security find-generic-password -a "${account}" -s "${service}" -w`, 
        { encoding: 'utf8' }).trim();
    } catch (error) {
      return null;
    }
  }

  async initializeQwenBackend() {
    const qwenKey = this.getApiKeyFromKeychain('codellm-api-key', 'codellm');
    
    if (!qwenKey) {
      throw new Error('Qwen API key not found in keychain');
    }

    const { QwenBackend } = require('./dist/backends/qwen.js');
    return new QwenBackend({
      enabled: true,
      priority: 1,
      cost_per_token: 0.0001,
      api_key: qwenKey,
      base_url: 'https://tools.flexcon-ai.de',
      model: 'Qwen/Qwen2.5-Coder-7B-Instruct-AWQ'
    });
  }

  // Comprehensive code quality evaluation
  evaluateCodeQuality(response, test) {
    const code = response.content;
    const scores = {};

    // 1. Syntax & Structure Quality (25%)
    scores.syntax = this.evaluateSyntax(code, test);
    
    // 2. Algorithm Implementation (25%)
    scores.algorithm = this.evaluateAlgorithm(code, test);
    
    // 3. Code Style & Best Practices (20%)
    scores.style = this.evaluateStyle(code);
    
    // 4. Completeness & Functionality (15%)
    scores.completeness = this.evaluateCompleteness(code, test);
    
    // 5. Documentation & Comments (10%)
    scores.documentation = this.evaluateDocumentation(code);
    
    // 6. Error Handling & Edge Cases (5%)
    scores.errorHandling = this.evaluateErrorHandling(code);

    return scores;
  }

  evaluateSyntax(code, test) {
    let score = 0;
    const maxScore = 100;

    // Check for expected elements
    const elementsFound = test.expectedElements.filter(element => 
      code.toLowerCase().includes(element.toLowerCase())
    ).length;
    score += (elementsFound / test.expectedElements.length) * 40;

    // Check for proper Python syntax patterns
    const syntaxPatterns = [
      /def\s+\w+\s*\(/,           // Function definitions
      /class\s+\w+/,              // Class definitions  
      /if\s+.*:/,                 // Conditional statements
      /for\s+\w+\s+in\s+/,        // For loops
      /return\s+/,                // Return statements
    ];

    const foundPatterns = syntaxPatterns.filter(pattern => pattern.test(code)).length;
    score += (foundPatterns / syntaxPatterns.length) * 30;

    // Check for proper indentation
    const lines = code.split('\n');
    const properlyIndented = lines.filter(line => 
      line.trim() === '' || line.match(/^(\s{4})*\S/) || line.match(/^\S/)
    ).length;
    score += (properlyIndented / Math.max(lines.length, 1)) * 30;

    return Math.min(score, maxScore);
  }

  evaluateAlgorithm(code, test) {
    let score = 0;
    const maxScore = 100;

    // Check for algorithm-specific keywords
    const algorithmKeywords = {
      'sorting': ['sort', 'sorted', 'bubble', 'quick', 'merge'],
      'searching': ['search', 'find', 'binary', 'linear'],
      'data_structures': ['list', 'dict', 'set', 'queue', 'stack', 'tree'],
      'loops': ['for', 'while', 'range', 'enumerate'],
      'conditions': ['if', 'elif', 'else', 'and', 'or', 'not']
    };

    let keywordScore = 0;
    Object.values(algorithmKeywords).forEach(keywords => {
      const found = keywords.filter(keyword => 
        code.toLowerCase().includes(keyword)
      ).length;
      keywordScore += found > 0 ? 20 : 0;
    });
    score += Math.min(keywordScore, 60);

    // Check for complexity considerations
    const complexityIndicators = [
      /O\(.*\)/,                  // Big O notation
      /time complexity/i,         // Complexity discussion
      /space complexity/i,        // Space analysis
      /optimize/i,                // Optimization mentions
      /efficient/i                // Efficiency considerations
    ];

    const complexityScore = complexityIndicators.filter(pattern => 
      pattern.test(code)
    ).length;
    score += (complexityScore / complexityIndicators.length) * 40;

    return Math.min(score, maxScore);
  }

  evaluateStyle(code) {
    let score = 0;
    const maxScore = 100;

    // PEP 8 compliance indicators
    const styleChecks = [
      {
        name: 'snake_case_functions',
        pattern: /def\s+[a-z_][a-z0-9_]*\s*\(/,
        weight: 15
      },
      {
        name: 'proper_spacing',
        pattern: /=\s+\w+|,\s+\w+/,
        weight: 10
      },
      {
        name: 'meaningful_names',
        pattern: /\b(?!a|b|c|x|y|z|i|j|k)\w{3,}\b/,
        weight: 20
      },
      {
        name: 'class_naming',
        pattern: /class\s+[A-Z][a-zA-Z0-9]*:/,
        weight: 15
      },
      {
        name: 'constant_naming',
        pattern: /[A-Z][A-Z0-9_]*\s*=/,
        weight: 10
      }
    ];

    styleChecks.forEach(check => {
      if (check.pattern.test(code)) {
        score += check.weight;
      }
    });

    // Check for imports at top
    const lines = code.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
      const importLines = lines.filter(line => 
        line.trim().startsWith('import ') || line.trim().startsWith('from ')
      );
      const firstImportIndex = lines.findIndex(line => 
        line.trim().startsWith('import ') || line.trim().startsWith('from ')
      );
      
      if (importLines.length > 0 && firstImportIndex < 3) {
        score += 15;
      }
    }

    // Line length check (approximate)
    const longLines = code.split('\n').filter(line => line.length > 100).length;
    const totalLines = Math.max(code.split('\n').length, 1);
    score += (1 - longLines / totalLines) * 15;

    return Math.min(score, maxScore);
  }

  evaluateCompleteness(code, test) {
    let score = 0;
    const maxScore = 100;

    // Check if all expected elements are present
    const elementsFound = test.expectedElements.filter(element => 
      code.toLowerCase().includes(element.toLowerCase())
    ).length;
    score += (elementsFound / test.expectedElements.length) * 70;

    // Check for test cases or examples
    const hasTests = /test|assert|example|demo/.test(code.toLowerCase());
    if (hasTests) score += 15;

    // Check for main execution block
    const hasMain = /if __name__ == ['"]__main__['"]/.test(code);
    if (hasMain) score += 15;

    return Math.min(score, maxScore);
  }

  evaluateDocumentation(code) {
    let score = 0;
    const maxScore = 100;

    // Check for docstrings
    const docstringPatterns = [
      /"""[\s\S]*?"""/,           // Triple quote docstrings
      /'''[\s\S]*?'''/,           // Single quote docstrings
    ];

    const hasDocstrings = docstringPatterns.some(pattern => pattern.test(code));
    if (hasDocstrings) score += 40;

    // Check for inline comments
    const commentLines = code.split('\n').filter(line => 
      line.trim().startsWith('#') && line.trim().length > 1
    ).length;
    const totalLines = Math.max(code.split('\n').length, 1);
    const commentRatio = commentLines / totalLines;
    score += Math.min(commentRatio * 200, 30); // Up to 30 points for comments

    // Check for type hints
    const hasTypeHints = /:\s*(int|str|float|bool|list|dict|tuple|None|Optional|Union)/.test(code);
    if (hasTypeHints) score += 30;

    return Math.min(score, maxScore);
  }

  evaluateErrorHandling(code) {
    let score = 0;
    const maxScore = 100;

    // Check for try/except blocks
    const hasTryExcept = /try:[\s\S]*?except/.test(code);
    if (hasTryExcept) score += 50;

    // Check for input validation
    const hasValidation = /if.*not|if.*is None|if.*len\(|if.*isinstance/.test(code);
    if (hasValidation) score += 30;

    // Check for specific exception handling
    const hasSpecificExceptions = /except\s+(ValueError|TypeError|IndexError|KeyError)/.test(code);
    if (hasSpecificExceptions) score += 20;

    return Math.min(score, maxScore);
  }

  calculateOverallScore(qualityScores) {
    const weights = {
      syntax: 0.25,
      algorithm: 0.25,
      style: 0.20,
      completeness: 0.15,
      documentation: 0.10,
      errorHandling: 0.05
    };

    return Object.entries(weights).reduce((total, [metric, weight]) => {
      return total + (qualityScores[metric] || 0) * weight;
    }, 0);
  }

  getQualityRating(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Satisfactory';
    if (score >= 50) return 'Adequate';
    return 'Needs Improvement';
  }

  async testQwenCodeQuality() {
    console.log('🧪 Comprehensive Qwen Code Quality Assessment');
    console.log('='.repeat(60));
    console.log('🎯 Measuring coding capabilities across multiple dimensions');
    console.log('');

    const qwenBackend = await this.initializeQwenBackend();
    const categoryResults = {};

    for (const category of CODE_QUALITY_TESTS) {
      console.log(`\n📁 Testing ${category.category} (Weight: ${(category.weight * 100).toFixed(0)}%)`);
      console.log('─'.repeat(50));

      const categoryScore = {
        tests: [],
        avgScore: 0,
        weight: category.weight
      };

      for (const test of category.tests) {
        console.log(`\n  🧪 ${test.name}...`);
        
        try {
          const startTime = Date.now();
          
          // Use extended timeout for quality assessment
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Quality test timeout')), 120000)
          );

          const response = await Promise.race([
            qwenBackend.send({
              prompt: test.prompt,
              files: [],
              options: { max_tokens: 1500, temperature: 0.1 }
            }),
            timeoutPromise
          ]);

          const latency = Date.now() - startTime;
          const qualityScores = this.evaluateCodeQuality(response, test);
          const overallScore = this.calculateOverallScore(qualityScores);
          const rating = this.getQualityRating(overallScore);

          const testResult = {
            name: test.name,
            overallScore,
            rating,
            qualityScores,
            latency,
            cost: response.cost_eur,
            responseLength: response.content.length,
            codeExample: response.content.substring(0, 500) + '...'
          };

          categoryScore.tests.push(testResult);

          console.log(`    ✅ Overall Score: ${overallScore.toFixed(1)} (${rating})`);
          console.log(`    📊 Breakdown: Syntax ${qualityScores.syntax.toFixed(0)}, Algorithm ${qualityScores.algorithm.toFixed(0)}, Style ${qualityScores.style.toFixed(0)}`);
          console.log(`    ⏱️ ${latency}ms, 💰 €${response.cost_eur.toFixed(6)}`);

          // Store code example for analysis
          this.results.codeExamples[`${category.category}_${test.name}`] = response.content;

        } catch (error) {
          console.log(`    ❌ Failed: ${error.message}`);
          
          categoryScore.tests.push({
            name: test.name,
            overallScore: 0,
            rating: 'Failed',
            error: error.message,
            latency: 120000
          });
        }
      }

      // Calculate category average
      const validTests = categoryScore.tests.filter(t => !t.error);
      if (validTests.length > 0) {
        categoryScore.avgScore = validTests.reduce((sum, t) => sum + t.overallScore, 0) / validTests.length;
      }

      categoryResults[category.category] = categoryScore;
      console.log(`  📊 Category Average: ${categoryScore.avgScore.toFixed(1)}`);
    }

    this.results.categoryScores = categoryResults;
    return this.generateQualityReport();
  }

  generateQualityReport() {
    // Calculate weighted overall score
    let weightedScore = 0;
    let totalWeight = 0;

    Object.values(this.results.categoryScores).forEach(category => {
      weightedScore += category.avgScore * category.weight;
      totalWeight += category.weight;
    });

    const overallScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
    const overallRating = this.getQualityRating(overallScore);

    // Generate detailed analysis
    const qualityAnalysis = {
      overallScore,
      overallRating,
      strengths: [],
      weaknesses: [],
      recommendations: []
    };

    // Analyze strengths and weaknesses
    Object.entries(this.results.categoryScores).forEach(([category, data]) => {
      if (data.avgScore >= 75) {
        qualityAnalysis.strengths.push({
          category,
          score: data.avgScore,
          description: `Strong performance in ${category.toLowerCase()}`
        });
      } else if (data.avgScore < 60) {
        qualityAnalysis.weaknesses.push({
          category,
          score: data.avgScore,
          description: `Needs improvement in ${category.toLowerCase()}`
        });
      }
    });

    this.results.qualityAnalysis = qualityAnalysis;

    return {
      categoryScores: this.results.categoryScores,
      overallScore,
      overallRating,
      qualityAnalysis,
      codeExamples: this.results.codeExamples
    };
  }

  displayQualityResults(report) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 QWEN CODE QUALITY ASSESSMENT RESULTS');
    console.log('='.repeat(60));

    console.log('\n🏆 OVERALL PERFORMANCE:');
    console.log(`Overall Score: ${report.overallScore.toFixed(1)}/100 (${report.overallRating})`);

    console.log('\n📋 CATEGORY BREAKDOWN:');
    Object.entries(report.categoryScores).forEach(([category, data]) => {
      const weight = (data.weight * 100).toFixed(0);
      console.log(`${category.padEnd(25)}: ${data.avgScore.toFixed(1).padStart(5)}/100 (${weight}% weight)`);
    });

    if (report.qualityAnalysis.strengths.length > 0) {
      console.log('\n💪 STRENGTHS:');
      report.qualityAnalysis.strengths.forEach(strength => {
        console.log(`  • ${strength.description} (${strength.score.toFixed(1)}/100)`);
      });
    }

    if (report.qualityAnalysis.weaknesses.length > 0) {
      console.log('\n⚠️ AREAS FOR IMPROVEMENT:');
      report.qualityAnalysis.weaknesses.forEach(weakness => {
        console.log(`  • ${weakness.description} (${weakness.score.toFixed(1)}/100)`);
      });
    }

    console.log('\n' + '='.repeat(60));
  }

  async runQualityAssessment() {
    try {
      const report = await this.testQwenCodeQuality();
      this.displayQualityResults(report);

      // Save detailed report
      const reportPath = path.join(__dirname, `qwen-code-quality-${Date.now()}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n💾 Detailed report saved: ${reportPath}`);

      return report;
    } catch (error) {
      console.error('💥 Quality assessment failed:', error.message);
      throw error;
    }
  }
}

async function main() {
  const engine = new QwenCodeQualityEngine();
  
  try {
    await engine.runQualityAssessment();
    process.exit(0);
  } catch (error) {
    console.error('Assessment failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { QwenCodeQualityEngine };