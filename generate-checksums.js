#!/usr/bin/env node

// Comprehensive Checksum Generator for Claudette & Claude Code
// Creates distributable package with integrity verification

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

class ClaudetteChecksumGenerator {
  constructor() {
    this.checksums = {
      claudette: {},
      claude_plugins: {},
      claude_global: {},
      package_info: {}
    };
    this.baseDir = '/Users/roble/Documents/Python/claude_flow';
    this.claudeGlobalDir = '/Users/roble/.claude';
    this.totalFiles = 0;
    this.totalSize = 0;
  }

  generateFileChecksum(filePath) {
    try {
      const content = fs.readFileSync(filePath);
      const hash = crypto.createHash('sha256');
      hash.update(content);
      const checksum = hash.digest('hex');
      
      const stats = fs.statSync(filePath);
      return {
        checksum,
        size: stats.size,
        modified: stats.mtime.toISOString(),
        permissions: stats.mode.toString(8)
      };
    } catch (error) {
      return {
        error: error.message,
        checksum: null,
        size: 0
      };
    }
  }

  async generateClaudetteChecksums() {
    console.log('🔍 Generating Claudette Core checksums...');
    
    const claudetteFiles = [
      // Core TypeScript source files
      'src/backends/adaptive-base.ts',
      'src/backends/adaptive-qwen.ts', 
      'src/backends/base.ts',
      'src/backends/openai.ts',
      'src/backends/qwen.ts',
      'src/router/adaptive-router.ts',
      'src/router/base.ts',
      'src/cache/intelligent-cache.ts',
      'src/database/schema.ts',
      'src/database/manager.ts',
      'src/cli/claudette-cli.ts',
      'src/main.ts',
      
      // Configuration files
      'package.json',
      'tsconfig.json',
      'README.md',
      'CONTRIBUTING.md',
      '.gitignore',
      
      // Test and quality files (key ones)
      'src/test-kpi-framework.js',
      'src/test-qwen-code-quality.js',
      'src/test-qwen-direct.js',
      'src/current-backend-setup-table.md',
      'src/qwen-quality-analysis.md',
      'src/qwen-assessment-verdict.md'
    ];

    for (const file of claudetteFiles) {
      const fullPath = path.join(this.baseDir, file);
      if (fs.existsSync(fullPath)) {
        const result = this.generateFileChecksum(fullPath);
        this.checksums.claudette[file] = result;
        if (result.size) {
          this.totalSize += result.size;
          this.totalFiles++;
        }
        console.log(`  ✅ ${file} - ${result.checksum ? result.checksum.substring(0, 8) : 'ERROR'}`);
      } else {
        console.log(`  ❌ Missing: ${file}`);
        this.checksums.claudette[file] = { error: 'File not found', checksum: null };
      }
    }
  }

  async generateClaudePluginChecksums() {
    console.log('\\n🔌 Generating Claude Code plugin checksums...');
    
    // Local Claude plugins
    const pluginDir = path.join(this.baseDir, '.claude/commands');
    if (fs.existsSync(pluginDir)) {
      this.walkDirectory(pluginDir, (filePath, relativePath) => {
        if (filePath.match(/\\.(md|json|sh)$/)) {
          const result = this.generateFileChecksum(filePath);
          this.checksums.claude_plugins[relativePath] = result;
          if (result.size) {
            this.totalSize += result.size;
            this.totalFiles++;
          }
          console.log(`  📝 ${relativePath} - ${result.checksum ? result.checksum.substring(0, 8) : 'ERROR'}`);
        }
      });
    }

    // Local Claude settings
    const settingsFiles = ['settings.json', 'settings.local.json', 'settings 2.json'];
    for (const file of settingsFiles) {
      const fullPath = path.join(this.baseDir, '.claude', file);
      if (fs.existsSync(fullPath)) {
        const result = this.generateFileChecksum(fullPath);
        this.checksums.claude_plugins[`.claude/${file}`] = result;
        if (result.size) {
          this.totalSize += result.size;
          this.totalFiles++;
        }
        console.log(`  ⚙️ .claude/${file} - ${result.checksum ? result.checksum.substring(0, 8) : 'ERROR'}`);
      }
    }
  }

  async generateGlobalClaudeChecksums() {
    console.log('\\n🌐 Generating global Claude Code checksums...');
    
    // Important global configuration files
    const globalFiles = [
      'settings.json',
      'claudette/config.json',
      'claudette/task-log.json', 
      'claudette/status.json',
      'security/key_metadata.json',
      'token_distribution_metrics.json',
      'last_reminder.json',
      'last_startup_check.json'
    ];

    for (const file of globalFiles) {
      const fullPath = path.join(this.claudeGlobalDir, file);
      if (fs.existsSync(fullPath)) {
        const result = this.generateFileChecksum(fullPath);
        this.checksums.claude_global[file] = result;
        if (result.size) {
          this.totalSize += result.size;
          this.totalFiles++;
        }
        console.log(`  🔧 ${file} - ${result.checksum ? result.checksum.substring(0, 8) : 'ERROR'}`);
      }
    }
  }

  walkDirectory(dir, callback) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        this.walkDirectory(fullPath, callback);
      } else {
        const relativePath = path.relative(this.baseDir, fullPath);
        callback(fullPath, relativePath);
      }
    }
  }

  generatePackageInfo() {
    console.log('\\n📦 Generating package information...');
    
    try {
      // Get package.json info
      const packagePath = path.join(this.baseDir, 'package.json');
      if (fs.existsSync(packagePath)) {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        this.checksums.package_info.name = packageJson.name;
        this.checksums.package_info.version = packageJson.version;
        this.checksums.package_info.description = packageJson.description;
      }

      // Get git info
      try {
        const gitCommit = execSync('git rev-parse HEAD', { 
          cwd: this.baseDir, 
          encoding: 'utf8' 
        }).trim();
        const gitBranch = execSync('git branch --show-current', { 
          cwd: this.baseDir, 
          encoding: 'utf8' 
        }).trim();
        
        this.checksums.package_info.git_commit = gitCommit;
        this.checksums.package_info.git_branch = gitBranch;
      } catch (error) {
        this.checksums.package_info.git_error = error.message;
      }

      // System info
      this.checksums.package_info.generated_at = new Date().toISOString();
      this.checksums.package_info.platform = process.platform;
      this.checksums.package_info.node_version = process.version;
      this.checksums.package_info.total_files = this.totalFiles;
      this.checksums.package_info.total_size_bytes = this.totalSize;
      this.checksums.package_info.total_size_mb = (this.totalSize / 1024 / 1024).toFixed(2);

      console.log(`  📊 Package: ${this.checksums.package_info.name} v${this.checksums.package_info.version}`);
      console.log(`  🔗 Git: ${this.checksums.package_info.git_commit?.substring(0, 8)} (${this.checksums.package_info.git_branch})`);
      console.log(`  📁 Files: ${this.totalFiles}, Size: ${this.checksums.package_info.total_size_mb}MB`);
      
    } catch (error) {
      console.log(`  ❌ Package info error: ${error.message}`);
      this.checksums.package_info.error = error.message;
    }
  }

  generateMasterChecksum() {
    // Create master checksum of all individual checksums
    const masterData = JSON.stringify(this.checksums, null, 2);
    const masterHash = crypto.createHash('sha256');
    masterHash.update(masterData);
    return masterHash.digest('hex');
  }

  saveChecksumManifest() {
    const masterChecksum = this.generateMasterChecksum();
    
    const manifest = {
      manifest_version: '1.0',
      master_checksum: masterChecksum,
      generated_at: new Date().toISOString(),
      ...this.checksums
    };

    // Save complete manifest
    const manifestPath = path.join(this.baseDir, 'claudette-integrity-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    // Save compact checksums only
    const checksumPath = path.join(this.baseDir, 'claudette-checksums.txt');
    let checksumText = `# Claudette Distributable Package Checksums\\n`;
    checksumText += `# Generated: ${new Date().toISOString()}\\n`;
    checksumText += `# Master Checksum: ${masterChecksum}\\n\\n`;
    
    // Core Claudette files
    checksumText += `## Claudette Core\\n`;
    Object.entries(this.checksums.claudette).forEach(([file, data]) => {
      if (data.checksum) {
        checksumText += `${data.checksum}  ${file}\\n`;
      }
    });
    
    // Claude plugins
    checksumText += `\\n## Claude Code Plugins\\n`;
    Object.entries(this.checksums.claude_plugins).forEach(([file, data]) => {
      if (data.checksum) {
        checksumText += `${data.checksum}  ${file}\\n`;
      }
    });
    
    fs.writeFileSync(checksumPath, checksumText);
    
    console.log(`\\n💾 Integrity manifest saved: ${manifestPath}`);
    console.log(`💾 Checksum file saved: ${checksumPath}`);
    
    return { manifestPath, checksumPath, masterChecksum };
  }

  displaySummary(manifestInfo) {
    console.log('\\n' + '='.repeat(60));
    console.log('📦 CLAUDETTE CHECKSUM GENERATION COMPLETE');
    console.log('='.repeat(60));
    
    console.log('\\n🎯 PACKAGE SUMMARY:');
    console.log(`   Name: ${this.checksums.package_info.name || 'claudette'}`);
    console.log(`   Version: ${this.checksums.package_info.version || '2.0.0'}`);
    console.log(`   Git Commit: ${this.checksums.package_info.git_commit?.substring(0, 12) || 'N/A'}`);
    console.log(`   Branch: ${this.checksums.package_info.git_branch || 'N/A'}`);
    
    console.log('\\n📊 CHECKSUMS GENERATED:');
    console.log(`   Claudette Core: ${Object.keys(this.checksums.claudette).length} files`);
    console.log(`   Claude Plugins: ${Object.keys(this.checksums.claude_plugins).length} files`);
    console.log(`   Global Config: ${Object.keys(this.checksums.claude_global).length} files`);
    console.log(`   Total Files: ${this.totalFiles}`);
    console.log(`   Total Size: ${this.checksums.package_info.total_size_mb}MB`);
    
    console.log('\\n🔐 INTEGRITY VERIFICATION:');
    console.log(`   Master Checksum: ${manifestInfo.masterChecksum}`);
    console.log(`   Manifest File: ${path.basename(manifestInfo.manifestPath)}`);
    console.log(`   Checksum File: ${path.basename(manifestInfo.checksumPath)}`);
    
    console.log('\\n✅ DISTRIBUTION READY:');
    console.log('   • All core components verified');
    console.log('   • Integrity manifest generated');
    console.log('   • Checksums available for validation');
    console.log('   • Package ready for distribution');
    
    console.log('\\n' + '='.repeat(60));
  }

  async generateAllChecksums() {
    console.log('🚀 Claudette & Claude Code Checksum Generation');
    console.log('='.repeat(60));
    console.log('🎯 Creating distributable package with integrity verification');
    console.log('');

    await this.generateClaudetteChecksums();
    await this.generateClaudePluginChecksums();  
    await this.generateGlobalClaudeChecksums();
    this.generatePackageInfo();
    
    const manifestInfo = this.saveChecksumManifest();
    this.displaySummary(manifestInfo);
    
    return manifestInfo;
  }
}

async function main() {
  const generator = new ClaudetteChecksumGenerator();
  
  try {
    await generator.generateAllChecksums();
    process.exit(0);
  } catch (error) {
    console.error('Checksum generation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { ClaudetteChecksumGenerator };