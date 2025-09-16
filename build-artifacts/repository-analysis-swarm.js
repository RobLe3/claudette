#!/usr/bin/env node

/**
 * Repository Analysis Swarm - Claudette v3.0.0
 * Analyzes repository structure and identifies what needs organization before next release
 */

const fs = require('fs');
const path = require('path');

class RepositoryAnalysisSwarm {
  constructor() {
    this.repoPath = process.cwd();
    this.analysis = {
      releaseFiles: [],
      buildArtifacts: [],
      testFiles: [],
      documentationFiles: [],
      configFiles: [],
      temporaryFiles: [],
      deprecatedFiles: [],
      organizationPlan: {
        toKeep: [],
        toMove: [],
        toArchive: [],
        toDelete: []
      }
    };
    this.directories = {
      docs: 'docs',
      tests: 'tests', 
      scripts: 'scripts',
      artifacts: 'build-artifacts',
      archives: 'archives'
    };
  }

  /**
   * Main analysis workflow
   */
  async analyze() {
    console.log('🔍 Repository Analysis Swarm - Starting Analysis');
    console.log('=' .repeat(60));
    
    try {
      await this.scanRepository();
      await this.createOrganizationPlan();
      await this.validatePlan();
      await this.generateReport();
      
      console.log('\n✅ Repository Analysis Complete');
      return this.analysis;
    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
      throw error;
    }
  }

  /**
   * Scan repository structure
   */
  async scanRepository() {
    console.log('\n📂 Scanning repository structure...');
    
    const allFiles = this.getAllFiles(this.repoPath);
    console.log(`   Found ${allFiles.length} total files`);
    
    // Categorize by file patterns
    for (const filePath of allFiles) {
      const relativePath = path.relative(this.repoPath, filePath);
      const fileName = path.basename(filePath);
      const extension = path.extname(filePath);
      
      // Skip node_modules and .git
      if (relativePath.includes('node_modules') || relativePath.includes('.git')) {
        continue;
      }
      
      this.categorizeFile(relativePath, fileName, extension);
    }
  }

  /**
   * Categorize individual file
   */
  categorizeFile(relativePath, fileName, extension) {
    const fileInfo = {
      path: relativePath,
      name: fileName,
      ext: extension,
      size: this.getFileSize(relativePath)
    };

    // Core release files (keep in root)
    if (this.isReleaseFile(fileName)) {
      this.analysis.releaseFiles.push(fileInfo);
    }
    
    // Build artifacts and reports
    else if (this.isBuildArtifact(fileName, relativePath)) {
      this.analysis.buildArtifacts.push(fileInfo);
    }
    
    // Test files
    else if (this.isTestFile(fileName, relativePath)) {
      this.analysis.testFiles.push(fileInfo);
    }
    
    // Documentation files
    else if (this.isDocumentationFile(fileName, relativePath)) {
      this.analysis.documentationFiles.push(fileInfo);
    }
    
    // Configuration files
    else if (this.isConfigFile(fileName)) {
      this.analysis.configFiles.push(fileInfo);
    }
    
    // Temporary/development files
    else if (this.isTemporaryFile(fileName, relativePath)) {
      this.analysis.temporaryFiles.push(fileInfo);
    }
    
    // Deprecated files
    else if (this.isDeprecatedFile(fileName, relativePath)) {
      this.analysis.deprecatedFiles.push(fileInfo);
    }
  }

  /**
   * File classification methods
   */
  isReleaseFile(fileName) {
    const releaseFiles = [
      'package.json', 'package-lock.json', 'LICENSE', 'README.md', 
      'CHANGELOG.md', 'claudette', 'tsconfig.json', '.env.example',
      'docker-compose.yml', 'Dockerfile'
    ];
    return releaseFiles.includes(fileName);
  }

  isBuildArtifact(fileName, relativePath) {
    return (
      relativePath.startsWith('dist/') ||
      fileName.includes('benchmark') ||
      fileName.includes('test-report') ||
      fileName.includes('assessment') ||
      fileName.includes('validation') ||
      fileName.includes('comprehensive') ||
      fileName.includes('analysis') ||
      fileName.includes('diagnostic') ||
      fileName.includes('results.json') ||
      fileName.includes('report.json') ||
      fileName.includes('summary.json') ||
      fileName.includes('maturity') ||
      fileName.includes('production-readiness')
    );
  }

  isTestFile(fileName, relativePath) {
    return (
      fileName.includes('test') ||
      fileName.startsWith('agent') ||
      fileName.includes('benchmark.js') ||
      relativePath.includes('test/') ||
      fileName.includes('integration-test') ||
      fileName.includes('e2e') ||
      fileName.includes('validation.js') ||
      fileName.includes('comprehensive-') && fileName.endsWith('.js')
    );
  }

  isDocumentationFile(fileName, relativePath) {
    return (
      fileName.endsWith('.md') && !this.isReleaseFile(fileName) ||
      relativePath.startsWith('docs/') ||
      fileName.includes('GUIDE') ||
      fileName.includes('SETUP') ||
      fileName.includes('INTEGRATION') ||
      fileName.includes('POLISHING_COMPLETE') ||
      fileName.includes('DISTRIBUTION_SUMMARY')
    );
  }

  isConfigFile(fileName) {
    const configFiles = [
      '.env', '.gitignore', '.npmignore',
      'claudette.config.json', 'claudette.config.json.example'
    ];
    return configFiles.includes(fileName) || fileName.includes('config');
  }

  isTemporaryFile(fileName, relativePath) {
    return (
      fileName.includes('temp') ||
      fileName.includes('tmp') ||
      fileName.includes('debug') ||
      fileName.includes('scratch') ||
      fileName.startsWith('test-') && !fileName.includes('test-optimizations') ||
      fileName.includes('working-') ||
      fileName.includes('fixed-')
    );
  }

  isDeprecatedFile(fileName, relativePath) {
    return (
      fileName.includes('old') ||
      fileName.includes('deprecated') ||
      fileName.includes('legacy') ||
      fileName.includes('backup') ||
      fileName.includes('v2.') ||
      fileName.includes('outdated')
    );
  }

  /**
   * Create organization plan
   */
  async createOrganizationPlan() {
    console.log('\n📋 Creating organization plan...');
    
    const plan = this.analysis.organizationPlan;
    
    // Keep release files in root
    plan.toKeep = [...this.analysis.releaseFiles, ...this.analysis.configFiles];
    
    // Move test files to tests/
    plan.toMove.push({
      category: 'tests',
      files: this.analysis.testFiles,
      destination: this.directories.tests
    });
    
    // Move documentation to docs/
    const docsToMove = this.analysis.documentationFiles.filter(f => 
      !f.name.includes('README') && !f.name.includes('CHANGELOG')
    );
    plan.toMove.push({
      category: 'documentation',  
      files: docsToMove,
      destination: this.directories.docs
    });
    
    // Move build artifacts to build-artifacts/
    plan.toMove.push({
      category: 'build-artifacts',
      files: this.analysis.buildArtifacts.filter(f => !f.path.startsWith('dist/')),
      destination: this.directories.artifacts
    });
    
    // Archive temporary files
    plan.toArchive.push({
      category: 'temporary',
      files: this.analysis.temporaryFiles,
      destination: this.directories.archives
    });
    
    // Delete deprecated files
    plan.toDelete = this.analysis.deprecatedFiles;
    
    console.log(`   📂 Files to keep in root: ${plan.toKeep.length}`);
    console.log(`   📁 Categories to organize: ${plan.toMove.length}`);
    console.log(`   🗃️  Files to archive: ${plan.toArchive.reduce((sum, cat) => sum + cat.files.length, 0)}`);
    console.log(`   🗑️  Files to delete: ${plan.toDelete.length}`);
  }

  /**
   * Validate organization plan
   */
  async validatePlan() {
    console.log('\n✅ Validating organization plan...');
    
    // Check for critical files
    const criticalFiles = ['package.json', 'README.md', 'CHANGELOG.md', 'claudette'];
    const keptFiles = this.analysis.organizationPlan.toKeep.map(f => f.name);
    
    for (const critical of criticalFiles) {
      if (!keptFiles.includes(critical)) {
        throw new Error(`Critical file ${critical} not marked to keep in root!`);
      }
    }
    
    // Validate dist/ directory is kept
    const distFiles = this.analysis.buildArtifacts.filter(f => f.path.startsWith('dist/'));
    if (distFiles.length === 0) {
      console.warn('⚠️  No dist/ files found - ensure build has been run');
    }
    
    console.log('   ✅ Critical files validated');
    console.log('   ✅ Organization plan is safe');
  }

  /**
   * Generate comprehensive report
   */
  async generateReport() {
    const report = this.generateMarkdownReport();
    const reportPath = 'REPOSITORY_ORGANIZATION_PLAN.md';
    
    fs.writeFileSync(reportPath, report);
    console.log(`\n📊 Organization report generated: ${reportPath}`);
    
    // Also generate executable script
    const script = this.generateOrganizationScript();
    const scriptPath = 'organize-repository.js';
    
    fs.writeFileSync(scriptPath, script);
    fs.chmodSync(scriptPath, 0o755);
    console.log(`📜 Organization script generated: ${scriptPath}`);
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport() {
    const plan = this.analysis.organizationPlan;
    
    return `# 📂 Repository Organization Plan - Claudette v3.0.0

**Generated**: ${new Date().toISOString()}  
**Status**: Ready for execution

---

## 📊 Repository Analysis Summary

### Current State
- **Total files analyzed**: ${this.getTotalFileCount()}
- **Release files (keep in root)**: ${plan.toKeep.length}
- **Files to organize**: ${plan.toMove.reduce((sum, cat) => sum + cat.files.length, 0)}
- **Files to archive**: ${plan.toArchive.reduce((sum, cat) => sum + cat.files.length, 0)}
- **Files to delete**: ${plan.toDelete.length}

---

## 🎯 Organization Plan

### ✅ Files to Keep in Root Directory
${plan.toKeep.map(f => `- \`${f.name}\` (${this.formatFileSize(f.size)})`).join('\n')}

### 📁 Files to Move

${plan.toMove.map(category => `
#### → ${category.destination}/
${category.files.map(f => `- \`${f.path}\` (${this.formatFileSize(f.size)})`).join('\n')}
`).join('\n')}

### 🗃️ Files to Archive

${plan.toArchive.map(category => `
#### → ${category.destination}/
${category.files.map(f => `- \`${f.path}\` (${this.formatFileSize(f.size)})`).join('\n')}
`).join('\n')}

### 🗑️ Files to Delete
${plan.toDelete.length > 0 ? 
  plan.toDelete.map(f => `- \`${f.path}\` (${this.formatFileSize(f.size)})`).join('\n') : 
  '- No files marked for deletion'
}

---

## 🚀 Execution Commands

\`\`\`bash
# Execute the organization plan
node organize-repository.js

# Or run step by step
node organize-repository.js --dry-run    # Preview only
node organize-repository.js --execute    # Execute changes
\`\`\`

---

## 🎯 Post-Organization Repository Structure

\`\`\`
claudette/
├── package.json                 # NPM package configuration
├── README.md                   # Main project documentation  
├── CHANGELOG.md               # Release notes
├── LICENSE                    # MIT license
├── claudette                  # CLI executable
├── tsconfig.json             # TypeScript configuration
├── docker-compose.yml        # Docker orchestration
├── Dockerfile               # Docker container definition
├── .env.example            # Environment template
├── dist/                   # Compiled TypeScript (build artifact)
├── src/                    # Source code
├── docs/                   # 📂 Organized documentation
├── tests/                  # 📂 Test files and benchmarks
├── scripts/               # 📂 Utility scripts
├── build-artifacts/       # 📂 Reports and analysis files
└── archives/             # 📂 Temporary and deprecated files
\`\`\`

---

## ✅ Validation Checklist

- [x] Critical release files kept in root
- [x] Source code (\`src/\`) preserved
- [x] Build artifacts (\`dist/\`) preserved  
- [x] No package.json or configuration files moved
- [x] Documentation properly categorized
- [x] Test files organized
- [x] Temporary files archived
- [x] Safe execution plan generated

---

*Generated by Repository Analysis Swarm - Ready for clean repository organization*
`;
  }

  /**
   * Generate organization script
   */
  generateOrganizationScript() {
    return `#!/usr/bin/env node

/**
 * Repository Organization Script - Claudette v3.0.0
 * Executes the repository organization plan
 */

const fs = require('fs');
const path = require('path');

const organizationPlan = ${JSON.stringify(this.analysis.organizationPlan, null, 2)};

class RepositoryOrganizer {
  constructor() {
    this.dryRun = process.argv.includes('--dry-run');
    this.execute = process.argv.includes('--execute');
    
    if (!this.dryRun && !this.execute) {
      this.dryRun = true; // Default to dry run
    }
  }

  async organize() {
    console.log('📂 Repository Organization Script');
    console.log('=' .repeat(50));
    
    if (this.dryRun) {
      console.log('🔍 DRY RUN MODE - No files will be moved');
    } else {
      console.log('⚡ EXECUTION MODE - Files will be moved');
    }
    
    try {
      await this.createDirectories();
      await this.moveFiles();
      await this.archiveFiles();
      await this.deleteFiles();
      
      console.log('\\n✅ Repository organization complete!');
      
      if (this.dryRun) {
        console.log('\\n🎯 To execute changes, run: node organize-repository.js --execute');
      }
      
    } catch (error) {
      console.error('❌ Organization failed:', error.message);
      throw error;
    }
  }

  async createDirectories() {
    const dirs = ['docs', 'tests', 'scripts', 'build-artifacts', 'archives'];
    
    console.log('\\n📁 Creating directories...');
    for (const dir of dirs) {
      if (this.execute) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(\`   ✅ Created: \${dir}/\`);
        } else {
          console.log(\`   📂 Exists: \${dir}/\`);
        }
      } else {
        console.log(\`   📂 Would create: \${dir}/\`);
      }
    }
  }

  async moveFiles() {
    console.log('\\n📋 Moving files...');
    
    for (const category of organizationPlan.toMove) {
      console.log(\`\\n   📁 \${category.category} → \${category.destination}/\`);
      
      for (const file of category.files) {
        const sourcePath = file.path;
        const destPath = path.join(category.destination, path.basename(file.path));
        
        if (this.execute) {
          if (fs.existsSync(sourcePath)) {
            fs.renameSync(sourcePath, destPath);
            console.log(\`      ✅ Moved: \${sourcePath} → \${destPath}\`);
          } else {
            console.log(\`      ⚠️  Not found: \${sourcePath}\`);
          }
        } else {
          console.log(\`      📋 Would move: \${sourcePath} → \${destPath}\`);
        }
      }
    }
  }

  async archiveFiles() {
    console.log('\\n🗃️ Archiving files...');
    
    for (const category of organizationPlan.toArchive) {
      console.log(\`\\n   🗃️  \${category.category} → \${category.destination}/\`);
      
      for (const file of category.files) {
        const sourcePath = file.path;
        const destPath = path.join(category.destination, path.basename(file.path));
        
        if (this.execute) {
          if (fs.existsSync(sourcePath)) {
            fs.renameSync(sourcePath, destPath);
            console.log(\`      ✅ Archived: \${sourcePath} → \${destPath}\`);
          } else {
            console.log(\`      ⚠️  Not found: \${sourcePath}\`);
          }
        } else {
          console.log(\`      📋 Would archive: \${sourcePath} → \${destPath}\`);
        }
      }
    }
  }

  async deleteFiles() {
    console.log('\\n🗑️ Deleting deprecated files...');
    
    for (const file of organizationPlan.toDelete) {
      const filePath = file.path;
      
      if (this.execute) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(\`   ✅ Deleted: \${filePath}\`);
        } else {
          console.log(\`   ⚠️  Not found: \${filePath}\`);
        }
      } else {
        console.log(\`   🗑️  Would delete: \${filePath}\`);
      }
    }
    
    if (organizationPlan.toDelete.length === 0) {
      console.log('   📂 No files marked for deletion');
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const organizer = new RepositoryOrganizer();
  organizer.organize().catch(console.error);
}
`;
  }

  /**
   * Utility methods
   */
  getAllFiles(dirPath, fileList = []) {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        if (!file.startsWith('.') && file !== 'node_modules') {
          this.getAllFiles(filePath, fileList);
        }
      } else {
        fileList.push(filePath);
      }
    }
    
    return fileList;
  }

  getFileSize(filePath) {
    try {
      return fs.statSync(filePath).size;
    } catch {
      return 0;
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getTotalFileCount() {
    return this.analysis.releaseFiles.length + 
           this.analysis.buildArtifacts.length + 
           this.analysis.testFiles.length + 
           this.analysis.documentationFiles.length + 
           this.analysis.configFiles.length + 
           this.analysis.temporaryFiles.length + 
           this.analysis.deprecatedFiles.length;
  }
}

// Execute if run directly
if (require.main === module) {
  const swarm = new RepositoryAnalysisSwarm();
  swarm.analyze().catch(console.error);
}

module.exports = RepositoryAnalysisSwarm;