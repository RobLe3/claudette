#!/usr/bin/env node

/**
 * Repository Cleanup Script - Move misplaced files to correct directories
 * This script will properly organize the cluttered root directory
 */

const fs = require('fs');
const path = require('path');

const CORE_RELEASE_FILES = [
  'package.json',
  'package-lock.json', 
  'README.md',
  'CHANGELOG.md',
  'LICENSE',
  'claudette',
  'tsconfig.json',
  'docker-compose.yml',
  'Dockerfile',
  '.env.example',
  '.dockerignore',
  '.gitignore',
  '.pre-commit-config.yaml',
  'Makefile'
];

const MOVE_PATTERNS = {
  // Documentation files - move to docs/
  docs: [
    /.*\.md$/, // All markdown files except core ones
    /^ADVANCED_POLISHING/,
    /^BACKEND_RELIABILITY/,
    /^CACHE_/,
    /^CLAUDE_/,
    /^COMPREHENSIVE_/,
    /^CONTRIBUTING/,
    /^CORRECTED_/,
    /^CREDENTIAL_/,
    /^CRITICAL_/,
    /^DISTRIBUTION_/,
    /^FINAL_/,
    /^PERFORMANCE_/,
    /^POLISHING_/,
    /^REPOSITORY_/,
    /^TIMEOUT_/,
    /^TMP_/,
    /^CLEAN_REPOSITORY/,
    /anti-hallucination-framework/,
    /claude-code-/,
    /hallucination-forensic/,
    /self-check-method/
  ],
  
  // Test files - move to tests/
  tests: [
    /^agent\d+.*\.(js|ts)$/,
    /test.*\.(js|ts)$/,
    /-test\.(js|ts)$/,
    /^backend-.*test/,
    /^cache-.*test/,
    /^comprehensive-.*test/,
    /^debug-.*test/,
    /^direct-.*test/,
    /^final-.*test/,
    /^fixed-.*test/,
    /^focused-.*test/,
    /^individual-.*test/,
    /^input-validation.*test/,
    /^meticulous-.*test/,
    /^performance-.*test/,
    /^quick-.*test/,
    /^real-.*test/,
    /^simple-.*test/,
    /^working-.*test/,
    /honest-verification-agent/,
    /^recheck-critical/
  ],
  
  // Build artifacts - move to build-artifacts/
  'build-artifacts': [
    /.*benchmark.*\.(js|json)$/,
    /^comprehensive-.*\.(js|json)$/,
    /^diagnostic-/,
    /^updated-comprehensive/,
    /^dynamic-timeout/,
    /^organize-repository/,
    /^run-comprehensive/,
    /claudette-maturity/,
    /claudette-comprehensive-feature/
  ],
  
  // Archives - move to archives/
  archives: [
    /^debug-cost/,
    /^debug-openai/,
    /^mcp-server-with/,
    /unified_costs\.db/
  ],
  
  // Config files - move to config/
  config: [
    /\.config\.json$/,
    /claude-config/,
    /deploy_.*\.gql$/
  ]
};

class RepositoryCleanup {
  constructor() {
    this.moved = [];
    this.errors = [];
    this.skipped = [];
  }

  async cleanup() {
    console.log('🧹 Starting Repository Cleanup');
    console.log('=' .repeat(50));

    // Get all files in root directory
    const files = fs.readdirSync('.').filter(file => {
      const stat = fs.statSync(file);
      return stat.isFile() && !file.startsWith('.') && !CORE_RELEASE_FILES.includes(file);
    });

    console.log(`📊 Found ${files.length} files to organize`);

    // Process each file
    for (const file of files) {
      await this.moveFile(file);
    }

    // Report results
    this.printSummary();
  }

  async moveFile(filename) {
    try {
      // Skip if file doesn't exist
      if (!fs.existsSync(filename)) {
        this.skipped.push({ file: filename, reason: 'File not found' });
        return;
      }

      // Determine destination directory
      const destination = this.getDestination(filename);
      
      if (!destination) {
        this.skipped.push({ file: filename, reason: 'No matching pattern' });
        return;
      }

      // Ensure destination directory exists
      const destDir = destination;
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      // Move the file
      const sourcePath = filename;
      const destPath = path.join(destDir, filename);

      // Check if destination file already exists
      if (fs.existsSync(destPath)) {
        // If identical, delete source
        const sourceContent = fs.readFileSync(sourcePath);
        const destContent = fs.readFileSync(destPath);
        
        if (sourceContent.equals(destContent)) {
          fs.unlinkSync(sourcePath);
          this.moved.push({ file: filename, dest: destDir, action: 'deleted_duplicate' });
        } else {
          // Rename to avoid conflict
          const newName = `${filename}.duplicate`;
          const newDestPath = path.join(destDir, newName);
          fs.renameSync(sourcePath, newDestPath);
          this.moved.push({ file: filename, dest: destDir, action: 'renamed_conflict', newName });
        }
      } else {
        fs.renameSync(sourcePath, destPath);
        this.moved.push({ file: filename, dest: destDir, action: 'moved' });
      }

    } catch (error) {
      this.errors.push({ file: filename, error: error.message });
    }
  }

  getDestination(filename) {
    for (const [dir, patterns] of Object.entries(MOVE_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(filename)) {
          return dir;
        }
      }
    }
    return null;
  }

  printSummary() {
    console.log('\n📋 CLEANUP SUMMARY');
    console.log('=' .repeat(50));
    
    console.log(`✅ Files moved: ${this.moved.length}`);
    console.log(`⚠️  Files skipped: ${this.skipped.length}`);
    console.log(`❌ Errors: ${this.errors.length}`);

    if (this.moved.length > 0) {
      console.log('\n📦 Moved files by destination:');
      const byDest = {};
      this.moved.forEach(item => {
        if (!byDest[item.dest]) byDest[item.dest] = [];
        byDest[item.dest].push(item);
      });

      Object.entries(byDest).forEach(([dest, items]) => {
        console.log(`   📁 ${dest}/: ${items.length} files`);
      });
    }

    if (this.skipped.length > 0 && this.skipped.length < 10) {
      console.log('\n⏭️  Skipped files:');
      this.skipped.forEach(item => {
        console.log(`   • ${item.file} (${item.reason})`);
      });
    }

    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(item => {
        console.log(`   • ${item.file}: ${item.error}`);
      });
    }

    // Show what should remain in root
    console.log('\n🏠 Files remaining in root directory:');
    const remaining = fs.readdirSync('.').filter(file => {
      const stat = fs.statSync(file);
      return stat.isFile() && !file.startsWith('.');
    });
    
    console.log(`   📊 Total: ${remaining.length} files`);
    if (remaining.length <= 20) {
      remaining.forEach(file => console.log(`   • ${file}`));
    }

    console.log('\n🎯 Repository cleanup complete!');
    if (this.moved.length > 0) {
      console.log('📝 Run "git add ." and commit these changes');
    }
  }
}

// Execute cleanup
if (require.main === module) {
  const cleanup = new RepositoryCleanup();
  cleanup.cleanup().catch(console.error);
}

module.exports = RepositoryCleanup;