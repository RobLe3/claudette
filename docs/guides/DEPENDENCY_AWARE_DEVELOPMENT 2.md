# Dependency-Aware Development Strategy

**Date:** 2025-07-20  
**Version:** 1.0.0  
**Critical Importance:** MANDATORY for all Claude Flow development

## 🚨 CORE PRINCIPLE

**Every change must update its associated dependencies.**

When you refactor, adapt, or clean up ANY development, ALL systems that depend on those changes MUST be identified and updated accordingly.

## 🎯 WHY THIS MATTERS

### Recent Example: Structure Reorganization
During our recent structure reorganization:
- ✅ **Files moved correctly**: 47 → 21 root files, organized core structure
- ❌ **Dependencies initially missed**: .claude/settings.json, automation scripts, documentation
- ✅ **Issue caught and fixed**: All automation systems updated for new structure

**Lesson:** Without systematic dependency tracking, changes can break automation systems, configurations, and workflows.

## 🔍 DEPENDENCY CATEGORIES

### 1. Configuration Dependencies
**Files that configure system behavior:**
- `.claude/settings.json` - Hook paths, permissions, automation commands
- `CLAUDE.md` - Development rules and configuration references
- `claude-flow.config.json` - Claude Flow specific configurations
- Git hooks and CI/CD configurations

**Impact:** Broken automation, failed hooks, incorrect permissions

### 2. Import Dependencies  
**Python modules that import or reference other modules:**
- `from core.cost_tracking import tracker`
- `import scripts.automation.session_guard`
- Cross-module function calls and class references

**Impact:** ImportError, ModuleNotFoundError, broken functionality

### 3. Path Dependencies
**Hard-coded file paths in scripts and commands:**
- Bash scripts with `python3 /path/to/file.py`
- Documentation with code examples
- Symlinks pointing to files
- Hook commands in settings

**Impact:** FileNotFoundError, broken commands, dead links

### 4. Documentation Dependencies
**References in guides, examples, and instructions:**
- File path examples in markdown
- Code snippets with import statements
- CLI command examples
- Migration guides and troubleshooting

**Impact:** Outdated documentation, confused developers, incorrect instructions

### 5. Test Dependencies
**Test files that reference or import modules:**
- Unit test imports
- Integration test file paths
- Performance test scripts
- Validation scripts

**Impact:** Test failures, broken CI/CD, unreliable validation

## 🛠️ AUTOMATED DEPENDENCY TOOLS

### 1. Dependency Validator
**Purpose:** Comprehensive validation of all dependencies

```bash
# Quick validation (exit codes for CI/CD)
python3 core/coordination/dependency_validator.py --check-all

# Detailed validation with full report
python3 core/coordination/dependency_validator.py --validate-all
```

**Checks:**
- ✅ Claude settings file paths
- ✅ Python import statements
- ✅ Hook command paths
- ✅ Symlink targets
- ✅ Documentation path references
- ✅ Structure consistency
- ✅ Critical functionality tests

### 2. Dependency Mapper
**Purpose:** Impact analysis and reference finding

```bash
# Analyze impact of changing a file/directory
python3 core/coordination/dependency_mapper.py --analyze-impact core/cost-tracking/tracker.py

# Find all files that reference a target
python3 core/coordination/dependency_mapper.py --find-references session_guard.py

# Build complete dependency graph
python3 core/coordination/dependency_mapper.py --export-map
```

**Provides:**
- 🔍 Complete impact analysis
- 📊 Risk assessment (LOW/MEDIUM/HIGH)
- 📋 Categorized reference list
- 🕸️ Full dependency graph export

### 3. Structure Manager with Dependency Tracking
**Purpose:** Structure-aware dependency validation

```bash
# Validate structure and dependencies
python3 core/coordination/structure_manager.py validate-deps

# Get suggestions for new files
python3 core/coordination/structure_manager.py suggest monitoring "health check"
```

### 4. Automation Dependency Checker
**Purpose:** Verify automation system integrity

```bash
# Verify all hook configurations
python3 scripts/automation/dependency_checker.py --verify-hooks
```

## 🔄 DEPENDENCY-AWARE WORKFLOW

### Pre-Change Phase
**BEFORE making ANY structural changes:**

1. **🔍 Impact Analysis**
   ```bash
   python3 core/coordination/dependency_mapper.py --analyze-impact <target>
   ```

2. **📋 Create Dependency Checklist**
   - List all affected configuration files
   - Identify import statements to update
   - Note documentation that needs changes
   - Find automation scripts that reference target

3. **🎯 Risk Assessment**
   - HIGH: 10+ affected files, configuration changes
   - MEDIUM: 3-10 affected files, some imports
   - LOW: 1-3 affected files, minimal impact

### Change Phase
**DURING the development work:**

1. **🔄 Systematic Updates**
   - Update configuration files FIRST
   - Update automation scripts SECOND  
   - Update documentation THIRD
   - Update tests LAST

2. **📝 Document Changes**
   - Track what was updated and why
   - Note any breaking changes
   - Document migration steps if needed

### Post-Change Phase
**AFTER completing the changes:**

1. **✅ Validation**
   ```bash
   # Comprehensive dependency validation
   python3 core/coordination/dependency_validator.py --validate-all
   
   # Verify automation systems
   python3 scripts/automation/dependency_checker.py --verify-hooks
   ```

2. **🧪 Functionality Testing**
   ```bash
   # Test critical systems still work
   python3 core/cost-tracking/tracker.py --action summary
   python3 scripts/automation/claude_session_guard.py status
   ```

3. **📚 Documentation Updates**
   - Update migration guides
   - Add new examples to docs
   - Update troubleshooting guides

4. **🤖 Commit Strategy**
   - Include ALL dependency updates in same commit
   - Write descriptive commit message listing dependencies updated
   - Tag with breaking changes if applicable

## 🚨 CRITICAL CHECKPOINTS

### Before Any File Move/Rename
```bash
# MANDATORY: Analyze impact first
python3 core/coordination/dependency_mapper.py --analyze-impact <file_or_directory>

# Check current references
python3 core/coordination/dependency_mapper.py --find-references <target>
```

### Before Any Import Path Changes
```bash
# MANDATORY: Find all import references
grep -r "from.*<module>" . --include="*.py"
grep -r "import.*<module>" . --include="*.py"
```

### Before Any Configuration Updates
```bash
# MANDATORY: Test current configuration works
python3 core/coordination/dependency_validator.py --check-all
```

### After ANY Structural Changes
```bash
# MANDATORY: Validate all dependencies
python3 core/coordination/dependency_validator.py --validate-all

# Test critical functionality
python3 core/cost-tracking/tracker.py --action summary
```

## 📋 DEPENDENCY CHECKLIST TEMPLATE

**Use this checklist for EVERY structural change:**

### Pre-Change Analysis
- [ ] **Impact analysis completed** (`dependency_mapper.py --analyze-impact`)
- [ ] **Reference search completed** (`dependency_mapper.py --find-references`)
- [ ] **Risk level assessed** (LOW/MEDIUM/HIGH)
- [ ] **Dependency list created** (configurations, imports, docs, tests)

### Configuration Updates
- [ ] **`.claude/settings.json`** - Hook paths and permissions updated
- [ ] **`CLAUDE.md`** - Configuration references updated
- [ ] **Git hooks** - Script paths updated if applicable
- [ ] **CI/CD configurations** - Build/test paths updated

### Code Updates
- [ ] **Python imports** - All import statements updated
- [ ] **Cross-references** - Function calls and class references updated
- [ ] **Path variables** - Hard-coded paths updated
- [ ] **Symlinks** - Link targets updated

### Documentation Updates
- [ ] **Code examples** - File paths in examples updated
- [ ] **CLI instructions** - Command examples updated
- [ ] **Migration guides** - New paths documented
- [ ] **Troubleshooting** - Updated with new locations

### Testing Updates
- [ ] **Test imports** - Unit test import statements updated
- [ ] **Test paths** - Integration test file paths updated
- [ ] **Validation scripts** - Test script references updated
- [ ] **Performance tests** - Benchmark script paths updated

### Post-Change Validation
- [ ] **Dependency validation passed** (`dependency_validator.py --validate-all`)
- [ ] **Hook verification passed** (`dependency_checker.py --verify-hooks`)
- [ ] **Critical functionality tested** (cost tracker, session guard, etc.)
- [ ] **Documentation verified** (examples work, paths correct)

### Commit Requirements
- [ ] **All dependencies included** in same commit
- [ ] **Descriptive commit message** listing what was updated
- [ ] **Breaking changes documented** if applicable
- [ ] **Migration notes added** if needed

## 🎯 INTEGRATION WITH EXISTING WORKFLOW

### Claude.md Integration
This dependency strategy is now **MANDATORY** according to `CLAUDE.md`:

```markdown
## 🚨 CRITICAL: DEPENDENCY UPDATE STRATEGY
### **MANDATORY RULE: ALL CHANGES MUST UPDATE ASSOCIATED DEPENDENCIES**
```

### Git Workflow Integration
**Recommended git hooks:**

```bash
# Pre-commit hook (add to .git/hooks/pre-commit)
python3 core/coordination/dependency_validator.py --check-all
if [ $? -ne 0 ]; then
    echo "❌ Dependency validation failed. Please fix dependencies before committing."
    exit 1
fi
```

### CI/CD Integration
**Add to CI pipeline:**

```yaml
# Example GitHub Actions step
- name: Validate Dependencies
  run: |
    python3 core/coordination/dependency_validator.py --check-all
    python3 scripts/automation/dependency_checker.py --verify-hooks
```

## 🚀 BENEFITS OF DEPENDENCY-AWARE DEVELOPMENT

### Immediate Benefits
- ✅ **Zero broken automation** after structural changes
- ✅ **Consistent configuration** across all systems
- ✅ **Reliable imports** and module references
- ✅ **Accurate documentation** and examples
- ✅ **Working test suites** after refactoring

### Long-term Benefits
- 🎯 **Faster development** (no time lost debugging broken dependencies)
- 🛡️ **Higher reliability** (automation systems always work)
- 📚 **Better documentation** (examples stay current)
- 🔄 **Easier maintenance** (systematic approach to changes)
- 👥 **Team efficiency** (clear process for everyone)

## 🆘 TROUBLESHOOTING

### Common Dependency Issues

**Q: After moving files, automation hooks stopped working**
A: Run `python3 scripts/automation/dependency_checker.py --verify-hooks` to identify and fix hook paths.

**Q: Import errors after refactoring**
A: Use `python3 core/coordination/dependency_mapper.py --find-references <module>` to find all references that need updating.

**Q: Documentation examples don't work**
A: Run `python3 core/coordination/dependency_validator.py --validate-all` to find and fix documentation path issues.

**Q: How do I know what will be affected by a change?**
A: Always run `python3 core/coordination/dependency_mapper.py --analyze-impact <target>` before making changes.

### Emergency Recovery

**If dependencies are broken after a change:**

1. **Quick fix** - Revert the commit:
   ```bash
   git revert <commit-hash>
   ```

2. **Systematic fix** - Update dependencies:
   ```bash
   # Find what's broken
   python3 core/coordination/dependency_validator.py --validate-all
   
   # Fix issues one by one
   # Re-validate until clean
   ```

## 🎓 TRAINING AND ADOPTION

### For New Developers
1. **Read this guide** completely before making any changes
2. **Practice** with the dependency tools on a test change
3. **Follow the workflow** for your first few changes
4. **Ask for review** of dependency updates

### For Existing Team
1. **Adopt immediately** for all future changes
2. **Apply retroactively** to recent changes if needed
3. **Update** any existing broken dependencies
4. **Document** any project-specific dependency patterns

## 📞 SUPPORT AND RESOURCES

### Tools Documentation
- **Dependency Validator**: `core/coordination/dependency_validator.py --help`
- **Dependency Mapper**: `core/coordination/dependency_mapper.py --help`
- **Structure Manager**: `core/coordination/structure_manager.py --help`
- **Dependency Checker**: `scripts/automation/dependency_checker.py --help`

### Examples and Guides
- **Structure Guide**: `docs/guides/NEW_STRUCTURE_GUIDE.md`
- **Development Rules**: `CLAUDE.md` (Dependency Update Strategy section)
- **Migration Examples**: Git history of structure reorganization commits

---

**Remember: A change without dependency updates is an incomplete change.**