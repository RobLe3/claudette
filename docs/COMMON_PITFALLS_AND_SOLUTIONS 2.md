# Common Pitfalls and Solutions - Claude Flow
**Quick Reference Guide for Avoiding Development Issues**

*Updated: 2025-07-24 | Based on Lessons Learned Analysis*

---

## 🚨 **THE BIG 6 PITFALLS** 
*These cause 90% of development issues*

### 1. 📁 **STATE FILE CHAOS**
**Problem**: State files scattered in project root, no date organization
**Symptoms**: Root directory cluttered, hard to find recent work, unprofessional appearance
**Solution**: Always organize by date immediately
```bash
# ❌ WRONG: Files scattered in root
PROJECT_STATE.md, SESSION_2025-07-24.md, CURRENT_WORK.md

# ✅ CORRECT: Date-organized structure  
data/sessions/2025-07-24/CURRENT_STATE.md
data/sessions/2025-07-24/SESSION_SUMMARY.md
```

### 2. 🔐 **CONFIGURATION EXPOSURE**
**Problem**: Real API keys and secrets committed to git
**Symptoms**: Security vulnerabilities, exposed credentials, compliance violations
**Solution**: Templates only, real configs in .gitignore
```bash
# ❌ WRONG: Real secrets in repo
config.yaml (with actual API keys)

# ✅ CORRECT: Template approach
config.template.yaml (with placeholders)
local.config.yaml (in .gitignore)
```

### 3. 📄 **DUPLICATE ACCUMULATION**
**Problem**: Multiple versions of same file without cleanup
**Symptoms**: Confusion about which version to use, maintenance nightmare
**Solution**: Weekly analysis and immediate cleanup
```bash
# ❌ WRONG: Multiple versions
tracker.py, tracker_new.py, tracker_duplicate.py

# ✅ CORRECT: Single authoritative version
tracker.py (current)
# Use git branches for alternatives
```

### 4. 📚 **ARCHIVE CHAOS**
**Problem**: Old files dumped without structure or documentation
**Symptoms**: Lost knowledge, inability to find historical information
**Solution**: Date-organized archives with README files
```bash
# ❌ WRONG: Unorganized dump
archive/random_old_files/

# ✅ CORRECT: Structured archive
archive/2025-07-24_api_refactor/README.md
archive/2025-07-24_api_refactor/old_implementations/
```

### 5. 🔗 **IMPORT PATH BREAKAGE**
**Problem**: Moving files without updating import statements
**Symptoms**: ImportError, ModuleNotFoundError, broken functionality
**Solution**: Test imports after EVERY structural change
```bash
# MANDATORY before moving files:
python3 scripts/analysis/import_analyzer.py --analyze-file <target>
grep -r "import.*<module>" . --include="*.py"
```

### 6. 🔧 **DEPENDENCY NEGLECT**
**Problem**: Structural changes without updating all dependencies
**Symptoms**: Broken automation, failed hooks, configuration errors
**Solution**: Update ALL dependencies when making changes
```bash
# MANDATORY for structural changes:
python3 core/coordination/dependency_mapper.py --analyze-impact <target>
python3 core/coordination/dependency_validator.py --validate-all
```

---

## ⚡ **QUICK FIXES**

### **State File Organization**
```bash
# Immediate fix for scattered state files
mkdir -p data/sessions/$(date +%Y-%m-%d)
mv *STATE*.md *SESSION*.md data/sessions/$(date +%Y-%m-%d)/
```

### **Configuration Security**
```bash
# Check for exposed secrets
git log --all --full-history --grep="api_key\|secret\|password" -i

# Remove secrets from history (if found)
git filter-branch --force --index-filter \
'git rm --cached --ignore-unmatch config.yaml' --prune-empty --tag-name-filter cat -- --all
```

### **Duplicate Cleanup**
```bash
# Find and clean duplicates
python3 scripts/analysis/duplicate_detector.py --quick-scan
python3 scripts/analysis/duplicate_detector.py --cleanup --interactive
```

### **Dependency Repair**
```bash
# Fix broken dependencies
python3 core/coordination/dependency_validator.py --validate-all --fix-mode
python3 scripts/automation/dependency_checker.py --verify-hooks --repair
```

---

## 🎯 **PREVENTION CHECKLIST**

### **Before Any Development Work**
- [ ] Check state files are date-organized
- [ ] Verify no secrets in git history
- [ ] Run duplicate scan if > 1 week since last
- [ ] Validate dependencies are working

### **Before Moving/Renaming Files**
- [ ] Run impact analysis: `dependency_mapper.py --analyze-impact <target>`
- [ ] Find all references: `grep -r "import.*<target>" . --include="*.py"`
- [ ] Plan update order: config → automation → docs → tests

### **After Structural Changes**
- [ ] Test all imports: `import_analyzer.py --test-all-imports`
- [ ] Validate dependencies: `dependency_validator.py --validate-all`
- [ ] Check automation: `dependency_checker.py --verify-hooks`
- [ ] Update documentation examples

### **Before Committing**
- [ ] No state files in root directory
- [ ] No real config files staged
- [ ] No obvious duplicates present
- [ ] Dependencies validated

---

## 🚑 **EMERGENCY PROCEDURES**

### **If Project Structure is Broken**
```bash
# 1. Assess damage
python3 scripts/validation/structure_validator.py --check-all

# 2. Emergency recovery
./scripts/emergency/project_recovery.sh --analyze
./scripts/emergency/project_recovery.sh --fix --interactive

# 3. Validate fix
python3 scripts/validation/structure_validator.py --check-all
```

### **If Secrets Were Committed**
```bash
# 1. IMMEDIATELY revoke exposed keys
# 2. Clean git history
git filter-branch --force --index-filter \
'git rm --cached --ignore-unmatch path/to/secret/file' \
--prune-empty --tag-name-filter cat -- --all

# 3. Force push (if safe)
git push origin --force --all
git push origin --force --tags
```

### **If Dependencies Are Completely Broken**
```bash
# 1. Create backup
git stash push -m "broken_dependencies_backup"

# 2. Revert to last known good state
git reset --hard <last_good_commit>

# 3. Re-apply changes with proper dependency updates
git stash pop
# Then follow proper dependency update protocol
```

---

## 📋 **DAILY PREVENTION ROUTINE**

### **Morning Startup (2 minutes)**
```bash
# Quick health check
./scripts/daily/morning_check.sh

# Manual checks:
ls -la | wc -l  # Root files < 20?
ls data/sessions/$(date +%Y-%m-%d)/ 2>/dev/null  # Today's session dir exists?
```

### **Before Major Changes (5 minutes)**
```bash
# Impact analysis
python3 core/coordination/dependency_mapper.py --analyze-impact <target>

# Find references  
grep -r "import.*<target>" . --include="*.py"
grep -r "<target>" docs/ --include="*.md"
```

### **End of Day (3 minutes)**
```bash
# Organize state files
mkdir -p data/sessions/$(date +%Y-%m-%d)
mv *STATE*.md *SESSION*.md data/sessions/$(date +%Y-%m-%d)/ 2>/dev/null || true

# Quick validation
python3 core/coordination/dependency_validator.py --check-all
```

---

## 🔍 **WARNING SIGNS**

### **State File Issues**
- Multiple `.md` files in root directory
- Files with date patterns not in `data/sessions/`
- Unclear file purposes or naming

### **Configuration Issues**
- Files named `config.yaml`, `secrets.json`, `.env` in git
- Hard-coded API keys in source code
- Production configuration mixed with templates

### **Duplicate Issues**
- Files ending in `_new`, `_copy`, `_duplicate`, `_backup`
- Multiple files with same base name but different suffixes
- Confusion about which file is the "real" one

### **Archive Issues**
- Old files scattered throughout project
- Missing documentation for archived components
- Inability to understand why files were archived

### **Import Issues**
- `ImportError` or `ModuleNotFoundError` in tests
- Broken CLI commands after restructuring
- IDE showing import warnings

### **Dependency Issues**
- Automation hooks not working
- Configuration paths pointing to non-existent files
- Documentation examples failing

---

## 🛡️ **AUTOMATED PREVENTION**

### **Git Hooks (One-time Setup)**
```bash
# Install prevention hooks
./scripts/setup/install_git_hooks.sh

# Hooks prevent:
# - Committing secrets (pre-commit)
# - Broken imports (pre-commit)  
# - Dependency issues (pre-push)
# - State file pollution (post-commit cleanup)
```

### **CI/CD Validation**
```yaml
# Add to GitHub Actions / GitLab CI
- name: Validate Project Health
  run: |
    python3 scripts/validation/structure_validator.py --check-all
    python3 scripts/security/secret_scanner.py --check-all
    python3 scripts/analysis/duplicate_detector.py --ci-mode
    python3 core/coordination/dependency_validator.py --validate-all
```

### **Scheduled Maintenance**
```bash
# Add to crontab for automated maintenance
crontab -e

# Weekly cleanup (Mondays at 9 AM)
0 9 * * 1 /path/to/claude_flow/scripts/weekly/maintenance.sh

# Daily health check (every 4 hours)
0 */4 * * * /path/to/claude_flow/scripts/monitoring/health_check.sh
```

---

## 📞 **HELP AND TOOLS**

### **Analysis Tools**
```bash
# Project health overview
python3 scripts/analysis/project_health.py --report

# Find specific issues
python3 scripts/analysis/duplicate_detector.py --scan
python3 core/coordination/dependency_validator.py --validate-all
python3 scripts/security/secret_scanner.py --check-all
```

### **Fix Tools**
```bash
# Automated fixes (where safe)
python3 scripts/cleanup/root_organizer.py --organize --interactive
python3 scripts/analysis/duplicate_detector.py --cleanup --interactive
python3 core/coordination/dependency_validator.py --validate-all --fix-mode
```

### **Documentation**
- **Full Guide**: `DEVELOPMENT_BEST_PRACTICES_GUIDE.md`
- **Dependency Guide**: `docs/guides/DEPENDENCY_AWARE_DEVELOPMENT.md`
- **Lessons Learned**: `project-state-framework/CLAUDE_FLOW_LESSONS_LEARNED.md`

---

## 💡 **REMEMBER**

> **The goal is to prevent problems, not fix them after they occur.**

### **The 5-Minute Rule**
If any of these issues would take > 5 minutes to fix:
1. Stop and assess why prevention failed
2. Update prevention tools/processes
3. Document lesson learned
4. Implement better automation

### **The Red Flags**
- Root directory getting cluttered
- Finding files you don't recognize
- Import errors after "simple" changes
- Automation suddenly not working
- Documentation examples failing

**When you see red flags, stop and fix immediately. Small problems become big problems fast.**

---

*Keep this guide handy and reference it daily. Prevention is always easier than cleanup.*