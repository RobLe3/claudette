# Development Best Practices Guide - Claude Flow
**Comprehensive Guidelines to Prevent Recurring Development Issues**

*Generated: 2025-07-24 | Based on Lessons Learned Analysis*

---

## 🎯 **CRITICAL SUCCESS PRINCIPLES**

### **The Golden Rules**
1. **State Files → Date Organized Immediately** 
2. **Configuration → Templates Only, Never Commit Secrets**
3. **Duplicates → Weekly Analysis & Immediate Cleanup**
4. **Archives → Historical Files to Dated Directories**
5. **Imports → Test After EVERY Structural Change**
6. **Dependencies → Update ALL When Moving Files**

---

## 📁 **STATE FILE MANAGEMENT**

### ✅ **CORRECT State File Organization**
```
project/
├── data/
│   └── sessions/
│       ├── 2025-07-24/
│       │   ├── CURRENT_STATE.md
│       │   ├── SESSION_SUMMARY.md
│       │   └── DECISIONS_LOG.md
│       ├── 2025-07-23/
│       │   └── [previous session files]
│       └── archive/
│           └── [older sessions]
```

### ❌ **WRONG State File Organization**
```
project/
├── STATE_2025-07-24.md          # ❌ Root pollution
├── SESSION_STATE.md             # ❌ No date context
├── CURRENT_PROGRESS.md          # ❌ Unclear purpose
└── [project files mixed with state files]
```

### **State File Best Practices**
1. **Immediate Organization**: Create date-based directory structure from day one
2. **Consistent Naming**: `CURRENT_STATE.md`, `SESSION_SUMMARY.md`, `DECISIONS_LOG.md`
3. **Clear Purpose**: Each file has specific, documented purpose
4. **Archive Strategy**: Move older sessions to `archive/` subdirectory
5. **Index Creation**: Maintain `sessions/README.md` with session index

### **State File Commands**
```bash
# Create new session directory
mkdir -p data/sessions/$(date +%Y-%m-%d)

# Template state files
cp templates/CURRENT_STATE.md data/sessions/$(date +%Y-%m-%d)/
cp templates/SESSION_SUMMARY.md data/sessions/$(date +%Y-%m-%d)/
cp templates/DECISIONS_LOG.md data/sessions/$(date +%Y-%m-%d)/

# Archive old sessions (older than 30 days)
find data/sessions/ -maxdepth 1 -type d -mtime +30 -exec mv {} data/sessions/archive/ \;
```

---

## 🔐 **CONFIGURATION MANAGEMENT**

### ✅ **SECURE Configuration Pattern**
```
config/
├── config.template.yaml         # ✅ Template with placeholders
├── local.config.yaml           # ✅ In .gitignore
├── .env.template               # ✅ Environment template
└── README.md                   # ✅ Setup instructions
```

**Template Example:**
```yaml
# config.template.yaml
api_keys:
  claude: "YOUR_CLAUDE_API_KEY_HERE"
  openai: "YOUR_OPENAI_API_KEY_HERE"
  
database:
  url: "sqlite:///local.db"
  
monitoring:
  enabled: true
  endpoint: "http://localhost:8080"
```

### ❌ **INSECURE Configuration Pattern**
```
config/
├── config.yaml                 # ❌ Real keys committed
├── production.yaml            # ❌ Production secrets exposed
└── secrets.json               # ❌ Obviously bad
```

### **Configuration Security Checklist**
- [ ] **Templates Only**: Only template files committed to git
- [ ] **Real Configs in .gitignore**: All actual config files ignored
- [ ] **No Hardcoded Secrets**: No API keys or passwords in code
- [ ] **Environment Variables**: Sensitive data via environment
- [ ] **Setup Documentation**: Clear instructions for configuration
- [ ] **Validation Script**: Tool to verify configuration integrity

### **Configuration Commands**
```bash
# Check for exposed secrets
git log --all --full-history --grep="api_key\|secret\|password" -i

# Validate configuration security
python3 scripts/security/config_validator.py --check-secrets

# Setup from template
cp config/config.template.yaml config/local.config.yaml
```

---

## 🔄 **DUPLICATE PREVENTION**

### **Weekly Duplicate Analysis Process**
```bash
# Run comprehensive duplicate analysis
python3 scripts/analysis/duplicate_detector.py --full-scan

# Generate cleanup report
python3 scripts/analysis/duplicate_detector.py --generate-report

# Safe cleanup (interactive)
python3 scripts/analysis/duplicate_detector.py --cleanup --interactive

# Validate cleanup results
python3 scripts/analysis/duplicate_detector.py --verify-cleanup
```

### **Duplicate Prevention Rules**
1. **Clear Naming Conventions**: No `_new`, `_duplicate`, `_copy` suffixes
2. **Immediate Cleanup**: Address duplicates within 24 hours of detection
3. **Regular Scanning**: Weekly automated duplicate detection
4. **Documentation**: Document why duplicates were created and resolved
5. **Prevention**: Use version control branches instead of file copies

### **Naming Convention Standards**
```bash
# ✅ GOOD naming patterns
tracker.py                      # Current implementation
tracker_v2.py                  # Major version upgrade
experimental_tracker.py        # Experimental feature

# ❌ BAD naming patterns
tracker_new.py                 # Unclear what's "new"
tracker_duplicate.py          # Obviously a duplicate
tracker_copy.py               # Manual copy indicator
tracker_backup.py             # Use git instead
```

---

## 📚 **ARCHIVE STRATEGY**

### ✅ **PROPER Archive Organization**
```
archive/
├── README.md                  # Archive index and purpose
├── 2025-07-24_major_refactor/
│   ├── README.md             # What was archived and why
│   ├── deprecated_modules/   # Old code modules
│   └── migration_notes.md    # How to find new equivalents
├── 2025-07-20_api_changes/
│   ├── README.md
│   └── old_api_implementations/
└── legacy/
    ├── README.md
    └── pre_2025_code/
```

### **Archive Best Practices**
1. **Date-Based Organization**: Use YYYY-MM-DD_description format
2. **Documentation Required**: Every archive needs README.md
3. **Migration Notes**: Document where functionality moved
4. **Search Helpers**: Include keywords for finding archived content
5. **Retention Policy**: Define when archives can be deleted

### **Archive Commands**
```bash
# Create new archive directory with documentation
./scripts/archive/create_archive.sh "major_refactor" "Archiving old coordination modules"

# Validate archive structure
python3 scripts/archive/archive_validator.py --check-all

# Search archived content
python3 scripts/archive/archive_search.py --query "session_guard"
```

---

## 🔗 **IMPORT PATH CONSISTENCY**

### **Pre-Move Import Analysis**
```bash
# MANDATORY: Before moving ANY file
python3 scripts/analysis/import_analyzer.py --analyze-file core/tracker.py

# Find all import references
grep -r "from.*tracker" . --include="*.py"
grep -r "import.*tracker" . --include="*.py"

# Test import paths after move
python3 scripts/analysis/import_analyzer.py --test-imports
```

### **Import Path Testing Protocol**
1. **Pre-Analysis**: Identify all files that import the target
2. **Impact Assessment**: Determine how many files will be affected
3. **Update Planning**: Plan the order of updates (dependencies first)
4. **Systematic Updates**: Update all import statements
5. **Testing**: Verify all imports work after changes
6. **Documentation**: Update examples and guides

### **Import Validation Checklist**
- [ ] **All Python imports identified** and updated
- [ ] **Documentation examples** updated with new paths
- [ ] **Test files** updated with correct imports
- [ ] **Configuration files** updated with new module paths
- [ ] **CI/CD scripts** updated with correct paths
- [ ] **Import testing passed** on clean environment

---

## 🔧 **DEPENDENCY MANAGEMENT**

### **The Dependency Update Protocol**
```bash
# STEP 1: Impact Analysis (MANDATORY before changes)
python3 core/coordination/dependency_mapper.py --analyze-impact <target>

# STEP 2: Reference Discovery
python3 core/coordination/dependency_mapper.py --find-references <target>

# STEP 3: Update Dependencies Systematically
# - Configuration files FIRST
# - Automation scripts SECOND
# - Documentation THIRD
# - Tests LAST

# STEP 4: Validation (MANDATORY after changes)
python3 core/coordination/dependency_validator.py --validate-all
python3 scripts/automation/dependency_checker.py --verify-hooks
```

### **Dependency Categories Checklist**
- [ ] **Configuration Dependencies**: `.claude/settings.json`, `CLAUDE.md`, config files
- [ ] **Import Dependencies**: Python `import` and `from` statements
- [ ] **Path Dependencies**: Hard-coded file paths in scripts
- [ ] **Documentation Dependencies**: Examples and guides
- [ ] **Test Dependencies**: Test files and validation scripts
- [ ] **Automation Dependencies**: Hook commands and CI/CD configs

### **Emergency Dependency Recovery**
```bash
# If dependencies are broken after a change:

# OPTION 1: Quick revert
git revert <commit-hash>

# OPTION 2: Systematic fix
python3 core/coordination/dependency_validator.py --validate-all --fix-mode
python3 scripts/automation/dependency_checker.py --repair-hooks
```

---

## 🚫 **COMMON PITFALLS PREVENTION**

### **Root Directory Pollution Prevention**
```bash
# Check for root pollution (run weekly)
ls -la | wc -l  # Should be < 20 files in root

# Auto-clean root directory
python3 scripts/cleanup/root_organizer.py --analyze
python3 scripts/cleanup/root_organizer.py --organize --interactive
```

### **Configuration Leak Prevention**
```bash
# Pre-commit hook to check for secrets
#!/bin/bash
# Add to .git/hooks/pre-commit
python3 scripts/security/secret_scanner.py --check-staged
if [ $? -ne 0 ]; then
    echo "❌ Secrets detected in staged files!"
    exit 1
fi
```

### **Import Breakage Prevention**
```bash
# Pre-commit hook for import validation
#!/bin/bash
# Add to .git/hooks/pre-commit
python3 scripts/analysis/import_analyzer.py --test-all-imports
if [ $? -ne 0 ]; then
    echo "❌ Import errors detected!"
    exit 1
fi
```

---

## 📋 **DEVELOPMENT WORKFLOWS**

### **Daily Development Checklist**
```bash
# Start of day
- [ ] Check for duplicate files: `python3 scripts/analysis/duplicate_detector.py --quick-scan`
- [ ] Validate dependencies: `python3 core/coordination/dependency_validator.py --check-all`
- [ ] Review state file organization: `ls -la data/sessions/$(date +%Y-%m-%d)/`

# During development
- [ ] Before moving files: Run impact analysis
- [ ] After structural changes: Test imports
- [ ] Before commits: Check for configuration leaks

# End of day
- [ ] Organize state files by date
- [ ] Clean up any temporary duplicates
- [ ] Update session documentation
```

### **Weekly Maintenance Checklist**
```bash
# Every Monday
- [ ] Run full duplicate analysis and cleanup
- [ ] Archive sessions older than 30 days
- [ ] Validate all dependencies
- [ ] Check root directory organization
- [ ] Review and update documentation

# Monthly
- [ ] Review archive retention policy
- [ ] Update configuration templates
- [ ] Validate security practices
- [ ] Review and update this guide
```

### **Project Structure Validation**
```bash
# Validate project follows best practices
python3 scripts/validation/structure_validator.py --comprehensive

# Generate project health report
python3 scripts/analysis/project_health.py --generate-report

# Check compliance with this guide
python3 scripts/validation/best_practices_checker.py --check-all
```

---

## 🛡️ **PREVENTION AUTOMATION**

### **Git Hooks Setup**
```bash
# Install all development safety hooks
./scripts/setup/install_git_hooks.sh

# Hooks installed:
# - pre-commit: Secret detection, import validation, dependency check
# - post-commit: Duplicate detection, structure validation
# - pre-push: Comprehensive validation
```

### **CI/CD Integration**
```yaml
# GitHub Actions example
name: Development Best Practices Check
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.9'
      - name: Install dependencies
        run: pip install -r requirements.txt
      - name: Check for secrets
        run: python3 scripts/security/secret_scanner.py --check-all
      - name: Validate dependencies
        run: python3 core/coordination/dependency_validator.py --validate-all
      - name: Check for duplicates
        run: python3 scripts/analysis/duplicate_detector.py --ci-mode
      - name: Validate structure
        run: python3 scripts/validation/structure_validator.py --check-all
```

### **Automated Monitoring**
```bash
# Setup automated monitoring (runs every 4 hours)
crontab -e

# Add these lines:
0 */4 * * * /path/to/claude_flow/scripts/monitoring/health_check.sh
0 9 * * 1 /path/to/claude_flow/scripts/maintenance/weekly_cleanup.sh
```

---

## 📊 **SUCCESS METRICS**

### **Project Health Indicators**
```bash
# Generate project health report
python3 scripts/analysis/project_health.py --report

# Key metrics tracked:
# - Root directory file count (target: < 20)
# - Duplicate file percentage (target: < 2%)
# - Configuration security score (target: 100%)
# - Dependency consistency score (target: > 95%)
# - Documentation coverage (target: > 90%)
```

### **Development Efficiency Metrics**
- **Time to Resume Work**: How quickly can development resume after break
- **Bug Discovery Rate**: How often do structural issues cause bugs
- **Maintenance Overhead**: Time spent on cleanup vs. feature development
- **Knowledge Retention**: How much context is preserved across sessions

---

## 🎯 **QUICK REFERENCE COMMANDS**

### **Emergency Cleanup**
```bash
# If project structure is corrupted
./scripts/emergency/project_recovery.sh --analyze
./scripts/emergency/project_recovery.sh --fix --interactive

# If dependencies are broken
python3 core/coordination/dependency_validator.py --validate-all --fix-mode

# If root directory is polluted
python3 scripts/cleanup/root_organizer.py --organize --force
```

### **Daily Commands**
```bash
# Morning setup
./scripts/daily/morning_check.sh

# Before major changes
./scripts/analysis/impact_analysis.sh <target>

# After structural changes
./scripts/validation/post_change_validation.sh

# End of day cleanup
./scripts/daily/evening_cleanup.sh
```

### **Weekly Maintenance**
```bash
# Full maintenance cycle
./scripts/weekly/full_maintenance.sh

# Generate health report
./scripts/reporting/weekly_health_report.sh
```

---

## 🚨 **EMERGENCY PROCEDURES**

### **If State Files Are Missing**
1. Check `data/sessions/archive/` for recent sessions
2. Look in git history: `git log --oneline --all -- "*STATE*"`
3. Reconstruct from git commits and messages
4. Create new session with known context

### **If Configuration Is Compromised**
1. Immediately revoke any exposed API keys
2. Review git history for leaked secrets: `git log -p --all | grep -i "api_key\|secret"`
3. Clean git history if needed: `git filter-branch` or BFG Repo-Cleaner
4. Update all affected services with new credentials

### **If Dependencies Are Broken**
1. Run comprehensive validation: `python3 core/coordination/dependency_validator.py --validate-all`
2. Use dependency mapper to find all references: `python3 core/coordination/dependency_mapper.py --find-references <broken_item>`
3. Update systematically: config → automation → docs → tests
4. Test critical functionality after each fix

### **If Duplicates Have Accumulated**
1. Run comprehensive scan: `python3 scripts/analysis/duplicate_detector.py --full-scan`
2. Generate cleanup plan: `python3 scripts/analysis/duplicate_detector.py --generate-plan`
3. Review plan carefully before execution
4. Execute with backups: `python3 scripts/analysis/duplicate_detector.py --cleanup --backup`

---

## 📚 **LEARNING AND IMPROVEMENT**

### **Lesson Extraction Process**
When something goes wrong:
1. **Document the Issue**: What happened, when, why
2. **Analyze Root Cause**: What process failed to prevent this
3. **Identify Prevention**: How can this be prevented in future
4. **Update This Guide**: Add new prevention measures
5. **Implement Automation**: Create tools to prevent recurrence

### **Continuous Improvement**
- **Monthly Review**: Review this guide and update based on new lessons
- **Tool Development**: Create new automation tools for common issues
- **Process Refinement**: Improve workflows based on practical experience
- **Knowledge Sharing**: Share lessons learned across projects

---

## ✅ **COMPLIANCE CHECKLIST**

Use this checklist to verify project follows all best practices:

### **File Organization**
- [ ] State files organized by date in `data/sessions/YYYY-MM-DD/`
- [ ] Root directory has < 20 files
- [ ] Archives organized with documentation
- [ ] No duplicate files present
- [ ] Clear naming conventions followed

### **Configuration Security**  
- [ ] Only template files committed to git
- [ ] Real configurations in .gitignore
- [ ] No hardcoded secrets in code
- [ ] Environment variables used for sensitive data
- [ ] Configuration validation passes

### **Dependency Management**
- [ ] All dependencies validated and consistent
- [ ] Import paths tested after structural changes
- [ ] Automation hooks work correctly
- [ ] Documentation examples are current
- [ ] Test suite passes completely

### **Development Process**
- [ ] Git hooks installed and working
- [ ] CI/CD validation enabled  
- [ ] Regular maintenance scheduled
- [ ] Emergency procedures documented
- [ ] Lesson learned process followed

---

**This guide should be reviewed and updated monthly to incorporate new lessons learned and improve development practices.**

*Last Updated: 2025-07-24*