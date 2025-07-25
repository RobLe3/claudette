# Development Hints - Quick Reference

**Essential commands, patterns, and approaches for efficient Claude Flow development.**

## 🚀 **Repository Management**

### **Public-Private Repository Separation**
```bash
# Always separate public CLI from private development
# Public: Production-ready, minimal dependencies, user-focused
# Private: Development tools, research, internal automation

# Quick cleanup commands for public repositories:
find . -name "*2.*" -o -name "*_backup.*" | xargs rm -f
rm -rf tests/ benchmarks/ .claude/ scripts/automation/
rm -rf docs/analysis/ docs/status-reports/ experiments/

# Essential structure for public CLI:
# README.md (installation/usage only)
# requirements.txt (minimal dependencies)  
# [tool]/ (core module)
# .gitignore (clean Python ignores)
# LICENSE
```

### **Git Operations for Repository Separation**
```bash
# Add remote for separated repository
git remote add [repo-name] git@github.com:[user]/[repo].git

# Push specific branch to different repository  
git push [repo-name] [local-branch]:main

# Handle unrelated histories when merging
git merge [branch] --allow-unrelated-histories

# Clean commit pattern for repository cleanup
git commit -m "🧹 [PHASE]: [Action] - [Scope]
- [Specific changes]
✅ [Results achieved]
🎯 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

## 🔧 **File Operations and Cleanup**

### **Systematic Duplicate Removal**
```bash
# Find all common duplicate patterns
find . -name "*2.*" -o -name "*_backup.*" -o -name "*_old.*"
find . -name "*copy*" -o -name "*Copy*" -o -name "*duplicate*"

# Remove development artifacts
find . -name "*.tmp" -o -name "*.cache" -o -name "__pycache__" | xargs rm -rf
find . -name ".DS_Store" -o -name "Thumbs.db" | xargs rm -f

# Clean up empty directories
find . -type d -empty -delete

# Find large files that shouldn't be in repo
find . -size +10M -type f

# Check for sensitive data patterns  
grep -r "api_key\|password\|secret\|token" . --exclude-dir=.git
```

### **Documentation Update Patterns**
```bash
# Public repository README template
cat > README.md << 'EOF'
# [Tool] - Claude Code Compatible CLI

> **🎯 Drop-in replacement with [key benefit]**

## 📦 Quick Installation
## 🛠️ Usage Examples  
## 🐛 Troubleshooting
EOF

# Private repository README template
cat > README.md << 'EOF'
# [Project] - Advanced Development Extensions

**Private development repository for [purpose]**

## 🎯 Repository Purpose
## 🔧 Development Setup
## 🔒 Privacy Notice  
EOF
```

## 📋 **TodoWrite Patterns**

### **Phase-Based Task Management**
```javascript
// Always use TodoWrite for complex multi-step tasks
[
  {"content": "Phase 1: Remove duplicates", "status": "completed", "priority": "high", "id": "phase1"},
  {"content": "Phase 2: Clean artifacts", "status": "in_progress", "priority": "high", "id": "phase2"},
  {"content": "Phase 3: Update docs", "status": "pending", "priority": "medium", "id": "phase3"},
  {"content": "Phase 4: Test and verify", "status": "pending", "priority": "high", "id": "phase4"}
]

// Always batch 5-10+ todos in ONE TodoWrite call
// Never make multiple TodoWrite calls for related tasks
// Update statuses in batches, not individually
```

### **Repository Cleanup Todo Template**
```javascript
[
  {"content": "Backup important data", "status": "completed", "priority": "high", "id": "backup"},
  {"content": "Remove duplicate files systematically", "status": "in_progress", "priority": "high", "id": "duplicates"},
  {"content": "Clean development artifacts", "status": "pending", "priority": "high", "id": "artifacts"},
  {"content": "Remove empty directories", "status": "pending", "priority": "medium", "id": "empty_dirs"},
  {"content": "Update README for repository purpose", "status": "pending", "priority": "high", "id": "readme"},
  {"content": "Update documentation references", "status": "pending", "priority": "medium", "id": "docs"},
  {"content": "Test functionality still works", "status": "pending", "priority": "high", "id": "test"},
  {"content": "Commit and push changes", "status": "pending", "priority": "high", "id": "commit"},
  {"content": "Verify repository health", "status": "pending", "priority": "medium", "id": "health"}
]
```

## 🤖 **Swarm Coordination Patterns**

### **Parallel Execution Rules**
```javascript
// ✅ CORRECT: Everything in ONE message
[BatchTool]:
  // MCP coordination setup
  mcp__claude-flow__swarm_init { topology: "mesh", maxAgents: 6 }
  mcp__claude-flow__agent_spawn { type: "researcher" }
  mcp__claude-flow__agent_spawn { type: "coder" } 
  mcp__claude-flow__agent_spawn { type: "coordinator" }

  // Claude Code execution - ALL in parallel
  TodoWrite { todos: [6+ todos with all priorities] }
  Task("Researcher: Full instructions with hooks")
  Task("Coder: Full instructions with hooks")
  Read("file1.js")
  Read("file2.js") 
  Write("output.js", content)
  Bash("npm install && npm test")

// ❌ WRONG: Multiple messages (NEVER DO THIS)
Message 1: mcp__claude-flow__swarm_init
Message 2: Task("agent 1")
Message 3: TodoWrite({ single todo })
// This breaks parallel coordination!
```

### **Agent Coordination Protocol**
```bash
# Every spawned agent MUST use coordination hooks:

# Before starting work:
npx claude-flow@alpha hooks pre-task --description "[task]" --auto-spawn-agents false

# After every file operation:
npx claude-flow@alpha hooks post-edit --file "[file]" --memory-key "swarm/[agent]/[step]"

# After completing work:
npx claude-flow@alpha hooks post-task --task-id "[task]" --analyze-performance true
```

## 🔍 **Verification and Health Checks**

### **Repository Health Monitoring**
```bash
#!/bin/bash
# repo_health_check.sh - Use regularly

echo "🔍 Repository Health Check"
echo "=========================="

echo "Duplicate files found:"
find . -name "*2.*" -o -name "*_backup.*" | wc -l

echo "Large files (>10MB):"
find . -size +10M -type f

echo "Empty directories:"
find . -type d -empty

echo "Broken symlinks:"
find . -type l ! -exec test -e {} \; -print

echo "Sensitive data patterns:"
grep -r "api_key\|password\|secret" . --exclude-dir=.git | wc -l

echo "Repository structure:"
tree -L 2 -a -I '.git'
```

### **Functionality Verification**
```bash
# Public repository verification
python -m [tool] --version
python -m [tool] --test-connection

# Private repository verification  
python3 core/coordination/chatgpt_offloading_manager.py status
python3 core/cost-tracking/tracker.py --action summary

# Test installation from scratch
pip install -r requirements.txt
[tool] "test command"
```

## ⚡ **Performance Optimization**

### **Batch Operations**
```bash
# Always batch related operations
# Instead of: rm file1; rm file2; rm file3
# Use: rm file1 file2 file3

# Instead of multiple git adds
# Use: git add -A

# Instead of multiple tool calls
# Use: Single message with multiple tool invocations
```

### **Parallel Tool Usage**
```bash
# Read multiple files in parallel
Read("file1") + Read("file2") + Read("file3")  # Single message

# Write multiple files in parallel  
Write("out1", content1) + Write("out2", content2)  # Single message

# Run multiple commands in parallel
Bash("cmd1") + Bash("cmd2") + Bash("cmd3")  # Single message
```

## 🔒 **Security and Privacy**

### **Sensitive Data Removal**
```bash
# Check for sensitive patterns before commits
grep -r "api_key\|password\|secret\|token" . --exclude-dir=.git

# Clean up sensitive files
rm -f *.key *.pem config/secrets.yaml
rm -f *usage*.json *tracking*.json *session*.json

# Update .gitignore to prevent future issues
cat >> .gitignore << 'EOF'
# Sensitive data
*.key
*.pem  
*secret*
*password*
*token*
*api_key*
EOF
```

### **Repository Access Control**
```bash
# Public repository checklist:
# ✅ No API keys or secrets
# ✅ No internal development docs
# ✅ No proprietary algorithms
# ✅ Clean professional appearance
# ✅ Working installation process

# Private repository checklist:
# ✅ Proper access controls
# ✅ Internal documentation clearly marked
# ✅ Separation from public components
# ✅ Backup and recovery procedures
```

## 📊 **Metrics and Monitoring**

### **Success Metrics to Track**
```bash
# Repository cleanliness metrics
duplicate_files=$(find . -name "*2.*" | wc -l)
large_files=$(find . -size +10M | wc -l)
empty_dirs=$(find . -type d -empty | wc -l)
sensitive_patterns=$(grep -r "api_key" . --exclude-dir=.git | wc -l)

# Repository size and complexity
repo_size=$(du -sh . | cut -f1)
file_count=$(find . -type f | wc -l)
directory_count=$(find . -type d | wc -l)

# Documentation quality
broken_links=$(grep -r "\[.*\](.*)" docs/ | grep -c "404\|broken")
outdated_refs=$(grep -r "TODO\|FIXME\|XXX" docs/ | wc -l)
```

### **Performance Indicators**
- **Installation time**: < 2 minutes for public CLI
- **Repository size**: < 10MB for public, manageable for private
- **Documentation coverage**: 100% of public features documented
- **Test coverage**: > 80% for core functionality
- **Build success rate**: > 95% for CI/CD pipelines

---

## 🎯 **Quick Decision Framework**

### **Should this be in the public repository?**
- ✅ **YES** if: Production-ready, user-facing, well-documented, stable
- ❌ **NO** if: Development tool, experimental, internal-only, research

### **Should this file be removed during cleanup?**
- ✅ **REMOVE** if: Duplicate, backup, report, analysis, temporary, large
- ❌ **KEEP** if: Core functionality, documentation, configuration, tests

### **Should this use parallel execution?**
- ✅ **PARALLEL** if: Multiple related operations, independent tasks, batch processing
- ❌ **SEQUENTIAL** if: Single operation, dependency chain, requires interaction

**Remember: When in doubt, use TodoWrite, batch operations, and document your reasoning!**