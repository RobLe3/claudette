# Claude Flow Development Best Practices

**Purpose**: Prevent recurring development issues and maintain project organization

## 🎯 The "Big 6" Issues Prevention

### 1. 📁 State File Management
**Problem**: State files scattered in root directory  
**Solution**: Always organize by date
```bash
# Create dated state directory
mkdir -p data/sessions/$(date +%Y-%m-%d)

# Move state files immediately after creation
mv *STATE*.md *PHASE*.md data/sessions/$(date +%Y-%m-%d)/
```

### 2. 🔐 Configuration Security
**Problem**: Real secrets committed to git  
**Solution**: Templates only, real configs in .gitignore
```bash
# Use templates
cp config.template.yaml config.yaml
echo "config.yaml" >> .gitignore

# Check for secrets before commit
python3 security_audit.py --quick-scan
```

### 3. 📄 Duplicate Prevention
**Problem**: Multiple file versions without cleanup  
**Solution**: Weekly duplicate analysis
```bash
# Weekly cleanup routine
python3 scripts/analysis/duplicate_detector.py --full-scan
python3 scripts/analysis/duplicate_detector.py --cleanup --interactive
```

### 4. 🗄️ Archive Organization
**Problem**: Historical files dumped without structure  
**Solution**: Date-organized archives with documentation
```bash
# Organize by date
mkdir -p archive/{states,reports}/{$(date +%Y-%m-%d)}
mv *REPORT*.md archive/reports/$(date +%Y-%m-%d)/
```

### 5. 🔗 Import Path Consistency
**Problem**: Moving files without updating imports  
**Solution**: Test imports after EVERY structural change
```bash
# Before moving files
python3 core/coordination/dependency_mapper.py --analyze-impact <file>

# After moving files
python3 core/coordination/dependency_validator.py --validate-all
```

### 6. 🔧 Dependency Maintenance
**Problem**: Structural changes without dependency updates  
**Solution**: Update ALL dependencies when making changes
```bash
# Impact analysis before changes
python3 core/coordination/impact_analyzer.py --analyze <target>

# Update dependencies after changes
python3 core/coordination/structure_manager.py validate-deps
```

## ⚡ Daily Prevention Routine (5 minutes)

### Morning Check (2 minutes)
```bash
# Check root directory file count (target: < 20)
ls -la | wc -l

# Quick security scan
python3 security_audit.py --quick-scan
```

### Before Making Changes (3 minutes)
```bash
# Analyze impact of planned changes
python3 core/coordination/dependency_mapper.py --analyze-impact <target>

# Check for existing duplicates
find . -name "*$(basename <target>)*" | head -5
```

### End of Day Cleanup (3 minutes)
```bash
# Organize state files
mkdir -p data/sessions/$(date +%Y-%m-%d)
mv *STATE*.md *PHASE*.md data/sessions/$(date +%Y-%m-%d)/ 2>/dev/null || true

# Clean Python cache
find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null
find . -name "*.pyc" -delete 2>/dev/null
```

## 🛠️ Automation Tools

### Git Hooks (Automatic)
```bash
# Setup pre-commit hooks
cp scripts/git-hooks/pre-commit .git/hooks/
chmod +x .git/hooks/pre-commit
```

### Weekly Maintenance
```bash
# Full maintenance cycle (Fridays)
./scripts/maintenance/weekly_cleanup.sh --full-scan
```

### Emergency Recovery
```bash
# If structure is broken
./scripts/emergency/project_recovery.sh --analyze
./scripts/emergency/project_recovery.sh --fix --interactive
```

## 📊 Success Metrics

- **Root Directory Files**: < 20 files (target)
- **Duplicate File Percentage**: < 2% (target)
- **Configuration Security Score**: 100% (target)
- **Dependency Consistency**: > 95% (target)
- **Archive Organization**: All historical files properly dated

## 🚨 Warning Signs

Watch for these indicators of developing issues:

1. **Root directory > 25 files** - Need immediate organization
2. **Multiple config.yaml files** - Configuration chaos developing  
3. **Files with _new, _copy, _backup suffixes** - Duplicate accumulation
4. **Import errors after file moves** - Dependency update missed
5. **Git secrets warnings** - Security leak risk

## 💡 Key Principles

1. **Prevention Over Fixing**: Automated enforcement prevents issues
2. **Structure Prevents Problems**: Good organization eliminates 90% of issues
3. **Daily Habits Matter**: 5-minute daily routine prevents hours of cleanup
4. **Documentation is Critical**: Every archive needs INDEX.md
5. **Automation is Essential**: Git hooks catch issues early

**Remember**: Following these practices prevents 90% of common development problems and maintains a clean, secure, efficient project structure.

**Last Updated**: 2025-07-24  
**Version**: 2.0