#!/usr/bin/env node

// Codebase Verification System - Prevents hallucinations by validating actual code
// This script verifies all claims and function implementations before making changes

const fs = require('fs');
const path = require('path');

class CodebaseVerifier {
  constructor() {
    this.basePath = __dirname;
    this.srcPath = path.join(this.basePath, 'src');
    this.verificationResults = {
      totalFiles: 0,
      totalFunctions: 0,
      totalClasses: 0,
      totalInterfaces: 0,
      incompleteImplementations: [],
      duplicateFunctions: {},
      orphanedFunctions: [],
      actualExports: {},
      typeDefinitions: {},
      errors: []
    };
  }

  /**
   * Main verification entry point
   */
  async verifyEverything() {
    console.log('🔍 CODEBASE VERIFICATION SYSTEM');
    console.log('=====================================');
    
    try {
      console.log('📂 Scanning source directory...');
      await this.scanDirectory(this.srcPath);
      
      console.log('🔍 Checking for duplicates...');
      await this.findDuplicateFunctions();
      
      console.log('🔍 Finding orphaned functions...');
      await this.findOrphanedFunctions();
      
      console.log('🔍 Verifying specific claims...');
      await this.verifySpecificClaims();
      
      console.log('📊 Generating verification report...');
      this.generateReport();
      
      return this.verificationResults;
      
    } catch (error) {
      console.error('❌ Verification failed:', error.message);
      this.verificationResults.errors.push(error.message);
      return this.verificationResults;
    }
  }

  /**
   * Recursively scan directory for TypeScript and JavaScript files
   */
  async scanDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      throw new Error(`Directory does not exist: ${dirPath}`);
    }

    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        await this.scanDirectory(itemPath);
      } else if (stats.isFile() && (item.endsWith('.ts') || item.endsWith('.js'))) {
        this.verificationResults.totalFiles++;
        await this.analyzeFile(itemPath);
      }
    }
  }

  /**
   * Analyze individual file for exports, functions, classes, and interfaces
   */
  async analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.basePath, filePath);
      
      // Initialize file analysis
      this.verificationResults.actualExports[relativePath] = {
        functions: [],
        classes: [],
        interfaces: [],
        constants: [],
        types: []
      };

      // Find all exports
      this.findExports(content, relativePath);
      
      // Find function implementations
      this.findFunctionImplementations(content, relativePath);
      
      // Find class definitions
      this.findClassDefinitions(content, relativePath);
      
      // Find interface definitions
      this.findInterfaceDefinitions(content, relativePath);
      
    } catch (error) {
      this.verificationResults.errors.push(`Error analyzing ${filePath}: ${error.message}`);
    }
  }

  /**
   * Find all exported items in a file
   */
  findExports(content, filePath) {
    const exportPatterns = [
      /export\s+(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      /export\s+class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      /export\s+interface\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      /export\s+const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      /export\s+type\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      /export\s+enum\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g
    ];

    const types = ['functions', 'classes', 'interfaces', 'constants', 'types', 'enums'];
    
    exportPatterns.forEach((pattern, index) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const itemName = match[1];
        const itemType = types[index] || 'unknown';
        
        if (!this.verificationResults.actualExports[filePath][itemType]) {
          this.verificationResults.actualExports[filePath][itemType] = [];
        }
        
        this.verificationResults.actualExports[filePath][itemType].push(itemName);
        this.verificationResults[`total${itemType.charAt(0).toUpperCase() + itemType.slice(1, -1)}`]++;
      }
    });
  }

  /**
   * Find function implementations and check completeness
   */
  findFunctionImplementations(content, filePath) {
    // Pattern to find function declarations
    const functionPatterns = [
      /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*[:{]/g,
      /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*\([^)]*\)\s*=>/g, // Arrow functions
      /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{/g // Method definitions
    ];

    functionPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const functionName = match[1];
        
        // Check if function is actually implemented (not just declared)
        const functionBody = this.extractFunctionBody(content, match.index);
        
        if (this.isIncompleteImplementation(functionBody)) {
          this.verificationResults.incompleteImplementations.push({
            function: functionName,
            file: filePath,
            reason: 'Function body is incomplete or contains placeholder comments'
          });
        }
      }
    });
  }

  /**
   * Extract function body starting from a given index
   */
  extractFunctionBody(content, startIndex) {
    let braceCount = 0;
    let inFunction = false;
    let functionBody = '';
    
    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];
      
      if (char === '{') {
        braceCount++;
        inFunction = true;
      } else if (char === '}' && inFunction) {
        braceCount--;
        if (braceCount === 0) {
          functionBody += char;
          break;
        }
      }
      
      if (inFunction) {
        functionBody += char;
      }
    }
    
    return functionBody;
  }

  /**
   * Check if function implementation is incomplete
   */
  isIncompleteImplementation(functionBody) {
    const incompleteIndicators = [
      /\/\/\s*(TODO|FIXME|HACK|XXX)/i,
      /throw\s+new\s+Error\s*\(\s*['"`]Not implemented['"`]/i,
      /return\s*;\s*$/m, // Empty return at end
      /^\s*{\s*}\s*$/m, // Empty function body
      /\/\*[\s\S]*Implementation needed[\s\S]*\*\//i,
      /console\.(log|error|warn)\s*\(\s*['"`].*not implemented.*['"`]/i
    ];
    
    return incompleteIndicators.some(pattern => pattern.test(functionBody));
  }

  /**
   * Find class definitions and verify completeness
   */
  findClassDefinitions(content, filePath) {
    const classPattern = /(?:export\s+)?class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)(?:\s+extends\s+[a-zA-Z_$][a-zA-Z0-9_$]*)?(?:\s+implements\s+[^{]+)?\s*\{/g;
    
    let match;
    while ((match = classPattern.exec(content)) !== null) {
      const className = match[1];
      this.verificationResults.totalClasses++;
      
      // Extract class body and verify methods are implemented
      const classBody = this.extractClassBody(content, match.index);
      const incompleteMethods = this.findIncompleteClassMethods(classBody);
      
      if (incompleteMethods.length > 0) {
        this.verificationResults.incompleteImplementations.push({
          class: className,
          file: filePath,
          incompleteMethods: incompleteMethods,
          reason: 'Class contains incomplete method implementations'
        });
      }
    }
  }

  /**
   * Extract class body content
   */
  extractClassBody(content, startIndex) {
    let braceCount = 0;
    let inClass = false;
    let classBody = '';
    
    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];
      
      if (char === '{') {
        braceCount++;
        inClass = true;
      } else if (char === '}' && inClass) {
        braceCount--;
        if (braceCount === 0) {
          classBody += char;
          break;
        }
      }
      
      if (inClass) {
        classBody += char;
      }
    }
    
    return classBody;
  }

  /**
   * Find incomplete methods in a class
   */
  findIncompleteClassMethods(classBody) {
    const methodPattern = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*[:{]/g;
    const incompleteMethods = [];
    
    let match;
    while ((match = methodPattern.exec(classBody)) !== null) {
      const methodName = match[1];
      const methodBody = this.extractFunctionBody(classBody, match.index);
      
      if (this.isIncompleteImplementation(methodBody)) {
        incompleteMethods.push(methodName);
      }
    }
    
    return incompleteMethods;
  }

  /**
   * Find interface definitions
   */
  findInterfaceDefinitions(content, filePath) {
    const interfacePattern = /(?:export\s+)?interface\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    
    let match;
    while ((match = interfacePattern.exec(content)) !== null) {
      const interfaceName = match[1];
      this.verificationResults.totalInterfaces++;
      
      if (!this.verificationResults.typeDefinitions[interfaceName]) {
        this.verificationResults.typeDefinitions[interfaceName] = [];
      }
      this.verificationResults.typeDefinitions[interfaceName].push(filePath);
    }
  }

  /**
   * Find duplicate function implementations
   */
  async findDuplicateFunctions() {
    const functionMap = {};
    
    // Build map of function names to files
    Object.keys(this.verificationResults.actualExports).forEach(filePath => {
      const functions = this.verificationResults.actualExports[filePath].functions || [];
      
      functions.forEach(functionName => {
        if (!functionMap[functionName]) {
          functionMap[functionName] = [];
        }
        functionMap[functionName].push(filePath);
      });
    });
    
    // Find functions defined in multiple files
    Object.keys(functionMap).forEach(functionName => {
      if (functionMap[functionName].length > 1) {
        this.verificationResults.duplicateFunctions[functionName] = functionMap[functionName];
      }
    });
  }

  /**
   * Find orphaned functions (exported but never imported/used)
   */
  async findOrphanedFunctions() {
    // This is a simplified check - would need more sophisticated analysis for complete accuracy
    const allContent = await this.getAllFileContent();
    
    Object.keys(this.verificationResults.actualExports).forEach(filePath => {
      const functions = this.verificationResults.actualExports[filePath].functions || [];
      
      functions.forEach(functionName => {
        // Count imports/usages of this function in other files
        const usagePattern = new RegExp(`\\b${functionName}\\b`, 'g');
        const usages = (allContent.match(usagePattern) || []).length;
        
        // If only found once (in its definition), it might be orphaned
        if (usages <= 2) { // Allow some tolerance
          this.verificationResults.orphanedFunctions.push({
            function: functionName,
            file: filePath,
            usageCount: usages
          });
        }
      });
    });
  }

  /**
   * Get content of all files for usage analysis
   */
  async getAllFileContent() {
    let allContent = '';
    
    const readDirectory = (dirPath) => {
      const items = fs.readdirSync(dirPath);
      
      items.forEach(item => {
        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          readDirectory(itemPath);
        } else if (stats.isFile() && (item.endsWith('.ts') || item.endsWith('.js'))) {
          allContent += fs.readFileSync(itemPath, 'utf8') + '\n';
        }
      });
    };
    
    readDirectory(this.srcPath);
    return allContent;
  }

  /**
   * Verify specific functions mentioned in analysis documents
   */
  async verifySpecificClaims() {
    console.log('🔍 Verifying specific claims from analysis...');
    
    const claimsToVerify = [
      { claim: 'validateConfig function exists in 8 files', function: 'validateConfig', expectedFiles: 8 },
      { claim: 'healthCheck function exists in 12 files', function: 'healthCheck', expectedFiles: 12 },
      { claim: 'Meta-cognitive functions are incomplete', class: 'MetaCognitiveProblemSolver', file: 'src/meta-cognitive/problem-solving-engine.ts' },
      { claim: 'Graph database client exists', class: 'UltipaGraphClient', file: 'src/graph/ultipa-client.ts' }
    ];
    
    for (const claim of claimsToVerify) {
      const verification = await this.verifyClaim(claim);
      console.log(`${verification.valid ? '✅' : '❌'} ${claim.claim}: ${verification.message}`);
    }
  }

  /**
   * Verify individual claim
   */
  async verifyClaim(claim) {
    if (claim.function) {
      // Count occurrences of function
      const occurrences = Object.values(this.verificationResults.duplicateFunctions[claim.function] || []);
      return {
        valid: occurrences.length >= claim.expectedFiles,
        message: `Found ${occurrences.length} implementations, expected ${claim.expectedFiles}`
      };
    }
    
    if (claim.class && claim.file) {
      // Check if class exists in specified file
      const filePath = path.join(this.basePath, claim.file);
      if (!fs.existsSync(filePath)) {
        return { valid: false, message: `File ${claim.file} does not exist` };
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      const classExists = new RegExp(`class\\s+${claim.class}\\b`).test(content);
      
      return {
        valid: classExists,
        message: classExists ? `Class ${claim.class} found` : `Class ${claim.class} not found`
      };
    }
    
    return { valid: false, message: 'Unknown claim type' };
  }

  /**
   * Generate comprehensive verification report
   */
  generateReport() {
    console.log('\n📊 VERIFICATION REPORT');
    console.log('======================');
    console.log(`📁 Total files analyzed: ${this.verificationResults.totalFiles}`);
    console.log(`🔧 Total functions found: ${this.verificationResults.totalFunctions}`);
    console.log(`🏗️  Total classes found: ${this.verificationResults.totalClasses}`);
    console.log(`📋 Total interfaces found: ${this.verificationResults.totalInterfaces}`);
    
    console.log('\n⚠️  INCOMPLETE IMPLEMENTATIONS:');
    if (this.verificationResults.incompleteImplementations.length === 0) {
      console.log('   ✅ No incomplete implementations found');
    } else {
      this.verificationResults.incompleteImplementations.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.function || item.class} in ${item.file}`);
        console.log(`      Reason: ${item.reason}`);
        if (item.incompleteMethods) {
          console.log(`      Incomplete methods: ${item.incompleteMethods.join(', ')}`);
        }
      });
    }
    
    console.log('\n🔄 DUPLICATE FUNCTIONS:');
    const duplicateCount = Object.keys(this.verificationResults.duplicateFunctions).length;
    if (duplicateCount === 0) {
      console.log('   ✅ No duplicate functions found');
    } else {
      Object.keys(this.verificationResults.duplicateFunctions).forEach(functionName => {
        const files = this.verificationResults.duplicateFunctions[functionName];
        console.log(`   📋 ${functionName}: found in ${files.length} files`);
        files.forEach(file => console.log(`      - ${file}`));
      });
    }
    
    console.log('\n👻 POTENTIALLY ORPHANED FUNCTIONS:');
    if (this.verificationResults.orphanedFunctions.length === 0) {
      console.log('   ✅ No obviously orphaned functions found');
    } else {
      this.verificationResults.orphanedFunctions.slice(0, 10).forEach(item => {
        console.log(`   📋 ${item.function} in ${item.file} (usage count: ${item.usageCount})`);
      });
      if (this.verificationResults.orphanedFunctions.length > 10) {
        console.log(`   ... and ${this.verificationResults.orphanedFunctions.length - 10} more`);
      }
    }
    
    console.log('\n🔍 TYPE DEFINITION DUPLICATES:');
    const duplicateTypes = Object.keys(this.verificationResults.typeDefinitions)
      .filter(type => this.verificationResults.typeDefinitions[type].length > 1);
    
    if (duplicateTypes.length === 0) {
      console.log('   ✅ No duplicate type definitions found');
    } else {
      duplicateTypes.forEach(typeName => {
        const files = this.verificationResults.typeDefinitions[typeName];
        console.log(`   📋 ${typeName}: defined in ${files.length} files`);
        files.forEach(file => console.log(`      - ${file}`));
      });
    }
    
    if (this.verificationResults.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.verificationResults.errors.forEach(error => {
        console.log(`   • ${error}`);
      });
    }
    
    console.log('\n🎯 VERIFICATION COMPLETE');
  }
}

// Run verification if called directly
if (require.main === module) {
  const verifier = new CodebaseVerifier();
  verifier.verifyEverything()
    .then(() => {
      console.log('✅ Verification completed successfully');
    })
    .catch(error => {
      console.error('❌ Verification failed:', error);
      process.exit(1);
    });
}

module.exports = { CodebaseVerifier };