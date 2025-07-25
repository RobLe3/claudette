# Repository Management Guide

**Comprehensive guide for managing public-private repository separation and cleanup strategies.**

## 🎯 **Repository Separation Strategy**

### **Core Principle: Public-Private Split**

**Public Repository Focus:**
- ✅ **Production-ready CLI tools** (e.g., Claudette 2.0.0)
- ✅ **Clean, minimal structure** for easy installation
- ✅ **Professional documentation** for end users
- ✅ **Essential dependencies only**
- ✅ **Community-facing features** and stable releases

**Private Repository Focus:**
- ✅ **Development research** and experimental features
- ✅ **Advanced coordination systems** and algorithms
- ✅ **Internal tooling** and automation scripts
- ✅ **Cost optimization research** and prototypes
- ✅ **Development infrastructure** and test suites

## 🧹 **Systematic Cleanup Approach**

### **Phase 1: Identify What to Remove**

**Always Remove from Public Repositories:**
```bash
# Development artifacts
rm -rf tests/ benchmarks/ experiments/ archive/
rm -rf .claude/ config/ core/ scripts/automation/
rm -rf docs/analysis/ docs/status-reports/ docs/results/

# Duplicate files
find . -name "*2.py" -o -name "*2.sh" -o -name "*2" | xargs rm -f
find . -name "*_backup*" -o -name "*_old*" | xargs rm -f

# Development-specific files
rm -f *benchmark*.py *test*.py *debug*.py
rm -f setup.py pyproject.toml Makefile .pre-commit-config.yaml
rm -f *_REPORT*.md *_ANALYSIS*.md *_SUMMARY*.md
```

**Always Remove from Private Repositories:**
```bash
# Public CLI duplicates (after proper separation)
rm -rf claudette/ public_cli/ user_tools/
rm -f requirements.txt install*.sh run*.py

# Third-party integrations that belong in public
rm -rf scripts/third-party/ scripts/startup-tools/
rm -f scripts/setup_*_config.sh scripts/release/build_*.sh
```

### **Phase 2: Clean Directory Structure**

**Directory Cleanup Commands:**
```bash
# Remove empty directories
find . -type d -empty -delete

# Clean up documentation
rm -rf docs/legacy/ docs/archived-reports/ docs/api/
rm -f docs/*_GUIDE*.md docs/*_README*.md

# Remove configuration artifacts
rm -f config/mkdocs.yml config/commitlint.config.cjs
rm -f .github/workflows/docs.yaml .github/workflows/release.yaml

# Clean scripts directory
find scripts/ -name "demo_*" -o -name "test_*" | xargs rm -f
rm -rf scripts/release/ scripts/startup-tools/
```

### **Phase 3: Update Documentation**

**Public Repository README Template:**
```markdown
# [Tool Name] - Claude Code Compatible CLI

> **🎯 Drop-in replacement for Claude Code with [key benefit]**

## 🚀 What is [Tool Name]?

[Tool] is a drop-in replacement for Claude Code that:
- **Key feature 1** with specific benefit
- **Key feature 2** with cost/performance metrics
- **Key feature 3** with compatibility details

## 📦 Quick Installation

### Prerequisites
```bash
# Requirements check
python --version   # Should be 3.8+
claude --version   # Should be installed and working
```

### Install [Tool]
```bash
git clone https://github.com/[user]/[repo].git
cd [repo]
pip install -r requirements.txt
python -m [module] --version
```

## 🛠️ Usage Examples
[Concrete examples with expected outputs]

## 📄 License
MIT License - See LICENSE file for details.
```

**Private Repository README Template:**
```markdown
# [Project] - Advanced AI Development Extensions

**Private development repository for [project] extensions and customizations**

## 🎯 Repository Purpose

This is a **private development repository** containing:
- Advanced [system] coordination systems
- Experimental [feature] algorithms and research  
- Development automation and workflow extensions
- Research prototypes and proof-of-concepts
- Internal tooling and custom integrations

## 🔗 Related Projects
- **[Public Tool]** - Public CLI tool with [features]
- **[Original Project]** - Original platform/framework

## 🔧 Development Setup
[Internal setup instructions for authorized developers]

## 🔒 Privacy Notice
This repository contains proprietary development work and experimental features.
```

## 📋 **Repository Cleanup Checklist**

### **Before Cleanup:**
- [ ] **Backup important data** to separate location
- [ ] **Document current structure** and important files
- [ ] **Identify core vs. auxiliary components**
- [ ] **Check for hardcoded paths** that will break
- [ ] **List all dependencies** between components

### **During Cleanup:**
- [ ] **Remove duplicates systematically** using find commands
- [ ] **Clean one directory at a time** to avoid confusion
- [ ] **Update documentation immediately** after structural changes
- [ ] **Test functionality** after each major removal
- [ ] **Commit changes incrementally** with descriptive messages

### **After Cleanup:**
- [ ] **Verify all links work** in documentation
- [ ] **Test installation process** from scratch
- [ ] **Update CI/CD pipelines** if affected
- [ ] **Notify team members** of structural changes
- [ ] **Document new structure** and purposes

## 🔧 **Essential Commands for Repository Management**

### **Find and Remove Patterns:**
```bash
# Find all duplicate files with suffixes
find . -name "*2.*" -o -name "*_backup.*" -o -name "*_old.*"

# Remove all report and analysis files
find . -name "*REPORT*.md" -o -name "*ANALYSIS*.md" | xargs rm -f

# Clean up development artifacts
find . -name "*.tmp" -o -name "*.cache" -o -name "__pycache__" | xargs rm -rf

# Remove empty directories
find . -type d -empty -delete
```

### **Repository Health Check:**
```bash
# Check for broken symlinks
find . -type l ! -exec test -e {} \; -print

# Find large files that shouldn't be in repo
find . -size +10M -type f

# Check for sensitive data patterns
grep -r "api_key\|password\|secret\|token" . --exclude-dir=.git

# Verify structure makes sense
tree -L 3 -a -I '.git'
```

### **Git Operations:**
```bash
# Add remote for separated repository
git remote add [repo-name] git@github.com:[user]/[repo].git

# Push specific branch to different repository
git push [repo-name] [branch]:main

# Clean git history of large files (use carefully)
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch [large-file]'
```

## 🎓 **Lessons Learned**

### **✅ What Works Well:**

1. **Clear Separation of Concerns**
   - Public repositories should ONLY contain production-ready code
   - Private repositories should focus on research and development
   - Never mix user-facing tools with internal development infrastructure

2. **Systematic Cleanup Approach**
   - Use find commands to locate patterns rather than manual searching
   - Remove duplicates before updating documentation
   - Clean one category at a time (duplicates → reports → artifacts → configs)

3. **Documentation-First Strategy**
   - Update README files immediately after structural changes
   - Use repository purpose to guide what stays vs. what goes
   - Create purpose-specific documentation for each repository

4. **Incremental Commits**
   - Commit cleanup in logical phases
   - Use descriptive commit messages that explain the reasoning
   - Include co-authorship for collaborative cleanup efforts

### **❌ Common Pitfalls to Avoid:**

1. **Mixing Concerns**
   - Don't put development tools in public repositories
   - Don't duplicate entire codebases between repositories
   - Don't use same repository for multiple distinct purposes

2. **Incomplete Cleanup**
   - Don't leave duplicate files with "_2", "_backup" suffixes
   - Don't forget to update documentation after cleanup
   - Don't leave broken symlinks or empty directories

3. **Poor Documentation**
   - Don't use generic README templates
   - Don't reference files that were removed during cleanup
   - Don't forget to update installation instructions

4. **Git Management Issues**
   - Don't force-push to shared branches during cleanup
   - Don't merge unrelated repository histories without --allow-unrelated-histories
   - Don't commit sensitive data during the cleanup process

## 🚀 **Advanced Repository Strategies**

### **Repository Templates:**

Create template repositories for:
- **Public CLI Tools** - Minimal structure with essential components
- **Private Development** - Full development infrastructure
- **Research Projects** - Experiment-focused with proper archiving

### **Automation Scripts:**

```bash
#!/bin/bash
# cleanup_public_repo.sh
# Automated cleanup for converting private repo to public

echo "🧹 Starting public repository cleanup..."

# Remove development infrastructure
rm -rf .claude/ tests/ benchmarks/ experiments/
rm -rf scripts/automation/ core/ config/

# Remove development artifacts  
find . -name "*2.*" -o -name "*_backup.*" | xargs rm -f
find . -name "*REPORT*.md" -o -name "*ANALYSIS*.md" | xargs rm -f

# Clean empty directories
find . -type d -empty -delete

# Update documentation
echo "📝 Don't forget to update README.md for public use!"
```

### **Repository Health Monitoring:**

```bash
#!/bin/bash
# repo_health_check.sh
# Regular checks for repository cleanliness

echo "🔍 Repository Health Check"
echo "=========================="

echo "Duplicate files found:"
find . -name "*2.*" -o -name "*_backup.*" | wc -l

echo "Large files (>10MB):"
find . -size +10M -type f | wc -l

echo "Empty directories:"
find . -type d -empty | wc -l

echo "Broken symlinks:"
find . -type l ! -exec test -e {} \; | wc -l
```

---

**Repository Management is Critical for:**
- 🎯 **Clear project purpose** and user understanding
- 🚀 **Easy installation** and deployment processes  
- 🔒 **Security** through proper separation of concerns
- 🧹 **Maintainability** and long-term project health
- 👥 **Team collaboration** and onboarding efficiency

*This guide should be referenced for all repository restructuring and cleanup activities.*