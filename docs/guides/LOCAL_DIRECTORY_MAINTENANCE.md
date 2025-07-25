# Local Directory Maintenance Guide

**Keep your Claude Flow development directory clean and organized with automated cleanup.**

## 🎯 **Why Local Directory Maintenance Matters**

A cluttered development directory leads to:
- ❌ **Slower file operations** and IDE performance
- ❌ **Confusion** between duplicate and backup files
- ❌ **Repository bloat** when artifacts get accidentally committed
- ❌ **Reduced productivity** searching through unnecessary files
- ❌ **Merge conflicts** from temporary files and caches

A clean directory provides:
- ✅ **Faster development** with organized structure
- ✅ **Clear understanding** of what files are important
- ✅ **Clean git operations** without artifacts
- ✅ **Professional workspace** for focused development

## 🧹 **Automated Cleanup Solution**

### **Quick Cleanup Commands**

```bash
# Run automated cleanup (recommended)
python3 scripts/automation/local_directory_cleanup.py

# Preview what would be cleaned (safe)
python3 scripts/automation/local_directory_cleanup.py --dry-run --verbose

# Clean specific categories manually
find . -name "*.pyc" -o -name "__pycache__" | xargs rm -rf
find . -name ".DS_Store" -o -name "*.tmp" | xargs rm -f
find . -name "*backup*" -o -name "*_old*" | xargs rm -f
```

### **What Gets Cleaned**

**🐍 Python Cache Files:**
- `*.pyc` compiled Python files
- `__pycache__/` directories
- `*.pyo` optimized Python files

**💻 OS and Editor Files:**
- `.DS_Store` (macOS Finder metadata)
- `Thumbs.db` (Windows thumbnails)
- `*.tmp`, `*.swp`, `*.swo` (temporary files)

**📄 Backup and Duplicate Files:**
- `*backup*`, `*_old*`, `*_2*` files
- `*.bak`, `*.orig` backup files
- Space + number duplicates (e.g., "file 2.py")

**📁 Empty Directories:**
- Removes empty directories (except .git)
- Cleans up after file removals

### **What Gets Preserved**

**Essential Development Files:**
- ✅ `.claude/settings.json` - Claude Code configuration
- ✅ `CLAUDE.md` - Development documentation
- ✅ `core/**/*.py` - Core functionality
- ✅ `scripts/automation/**/*.py` - Automation tools
- ✅ `tests/**/*` - Test suites
- ✅ `docs/**/*.md` - Documentation
- ✅ `data/memory/claude-flow-data.json` - Memory persistence

## ⚙️ **Configuration**

The cleanup behavior is configured in `.claude/settings.json`:

```json
{
  "local_directory_management": {
    "cleanup_frequency": "after_each_major_session",
    "auto_cleanup_enabled": true,
    "cleanup_targets": {
      "python_cache": "*.pyc,__pycache__,*.pyo",
      "os_temp_files": ".DS_Store,Thumbs.db,*.tmp,*.swp,*.swo",
      "backup_files": "*backup*,*_old*,*_2*,*.bak,*.orig"
    },
    "preserve_patterns": [
      "data/memory/claude-flow-data.json",
      ".claude/settings.json",
      "core/**/*.py",
      "scripts/automation/**/*.py"
    ]
  }
}
```

### **Customization Options**

**Cleanup Frequency:**
- `"after_each_major_session"` - After significant development work
- `"daily"` - Once per day
- `"weekly"` - Once per week
- `"manual"` - Only when explicitly run

**Additional Cleanup Targets:**
```json
"cleanup_targets": {
  "log_files": "*.log,debug_*.txt,trace_*.txt",
  "coverage_files": ".coverage,htmlcov/*",
  "build_artifacts": "dist/*,build/*,*.egg-info"
}
```

## 📋 **Best Practices**

### **Regular Maintenance Schedule**

**After Each Development Session:**
```bash
# Quick cleanup before committing
python3 scripts/automation/local_directory_cleanup.py --dry-run
python3 scripts/automation/local_directory_cleanup.py
git status  # Verify only intended files for commit
```

**Weekly Deep Clean:**
```bash
# More thorough cleanup
python3 scripts/automation/local_directory_cleanup.py --verbose
find . -size +10M -type f  # Check for unexpectedly large files
du -sh . # Monitor directory size
```

**Before Major Commits:**
```bash
# Ensure clean state
python3 scripts/automation/local_directory_cleanup.py
git add -A
git status  # Review all changes
git commit -m "Clean commit message"
```

### **Safety Guidelines**

**Always Use Dry-Run First:**
```bash
# Preview changes before applying
python3 scripts/automation/local_directory_cleanup.py --dry-run --verbose
```

**Verify Preserved Files:**
```bash
# Check essential files exist after cleanup
ls -la .claude/settings.json
ls -la data/memory/
ls -la core/coordination/
```

**Monitor Cleanup Results:**
- ✅ Review cleanup report for errors
- ✅ Check that expected files were removed
- ✅ Verify important files were preserved
- ✅ Test functionality after cleanup

## 🔧 **Advanced Usage**

### **Custom Cleanup Scripts**

Create project-specific cleanup:
```bash
#!/bin/bash
# custom_cleanup.sh

echo "🧹 Custom project cleanup..."

# Remove project-specific artifacts
rm -rf logs/ temp/ cache/
find . -name "*.pid" | xargs rm -f

# Run standard cleanup
python3 scripts/automation/local_directory_cleanup.py

echo "✅ Custom cleanup complete!"
```

### **IDE Integration**

**VS Code Task (.vscode/tasks.json):**
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Clean Directory",
      "type": "shell",
      "command": "python3",
      "args": ["scripts/automation/local_directory_cleanup.py"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always"
      }
    }
  ]
}
```

**Git Hook (pre-commit):**
```bash
#!/bin/sh
# .git/hooks/pre-commit

echo "🧹 Running directory cleanup before commit..."
python3 scripts/automation/local_directory_cleanup.py --dry-run

if [ $? -ne 0 ]; then
    echo "⚠️  Cleanup issues detected - review before commit"
    exit 1
fi
```

## 📊 **Monitoring Directory Health**

### **Health Check Commands**

```bash
# Directory size monitoring
du -sh . && echo "Target: < 50MB for development repo"

# File count monitoring  
find . -type f | wc -l && echo "Target: < 1000 files for clean repo"

# Duplicate detection
find . -name "*2.*" -o -name "*backup*" | wc -l && echo "Target: 0 duplicates"

# Large file detection
find . -size +5M -type f && echo "Review large files for necessity"
```

### **Automated Health Monitoring**

```bash
#!/bin/bash
# health_check.sh - Run weekly

echo "📊 Directory Health Report"
echo "=========================="

total_size=$(du -sh . | cut -f1)
file_count=$(find . -type f | wc -l)
duplicate_count=$(find . -name "*2.*" -o -name "*backup*" | wc -l)
large_files=$(find . -size +5M -type f | wc -l)

echo "📁 Total Size: $total_size"
echo "📄 File Count: $file_count"
echo "🔄 Duplicates: $duplicate_count"
echo "📦 Large Files: $large_files"

# Alert thresholds
if [ $file_count -gt 1000 ]; then
    echo "⚠️  WARNING: High file count - consider cleanup"
fi

if [ $duplicate_count -gt 0 ]; then
    echo "⚠️  WARNING: Duplicate files detected - run cleanup"
fi
```

## 🎯 **Integration with Development Workflow**

### **Claude Code Hooks Integration**

The cleanup can be integrated with Claude Code hooks:

```json
{
  "hooks": {
    "session-end": "python3 scripts/automation/local_directory_cleanup.py && npx claude-flow@alpha hooks session-end --export-metrics true",
    "pre-commit": "python3 scripts/automation/local_directory_cleanup.py --dry-run"
  }
}
```

### **Swarm Coordination**

When using swarms, clean directory before initialization:
```bash
# Clean before swarm work
python3 scripts/automation/local_directory_cleanup.py

# Initialize swarm with clean environment
npx claude-flow@alpha swarm init --topology mesh --agents 5
```

---

## 🎯 **Quick Reference Commands**

**Daily Use:**
```bash
# Standard cleanup
python3 scripts/automation/local_directory_cleanup.py

# Preview first
python3 scripts/automation/local_directory_cleanup.py --dry-run

# Health check
du -sh . && find . -name "*2.*" | wc -l
```

**Configuration:**
```bash
# Edit cleanup settings
nano .claude/settings.json

# Test configuration
python3 scripts/automation/local_directory_cleanup.py --verbose
```

**Emergency Cleanup:**
```bash
# Quick manual cleanup
find . -name "*.pyc" -delete
find . -name "__pycache__" -exec rm -rf {} +
find . -name ".DS_Store" -delete
```

**Maintained properly, your local development directory will:**
- ✅ **Stay organized** and easy to navigate
- ✅ **Perform better** with faster file operations
- ✅ **Commit cleanly** without accidental artifacts
- ✅ **Support focused development** with minimal distractions

*Regular cleanup is essential for productive development environments!*