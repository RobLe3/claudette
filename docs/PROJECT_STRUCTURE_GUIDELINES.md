# Project Structure Guidelines - Claude Flow
**Comprehensive Directory Organization Standards**

*Generated: 2025-07-24 | Prevents the "Big 6" Development Issues*

---

## 🎯 **CORE PRINCIPLE**

> **Every file has a designated place, and everything in its place.**

The Claude Flow project structure is designed to prevent the 6 most common development issues:
1. State file chaos in root directory
2. Configuration security vulnerabilities  
3. Duplicate file accumulation
4. Archive disorganization
5. Import path breakage
6. Dependency management failures

---

## 📁 **MASTER DIRECTORY STRUCTURE**

```
claude_flow/                          # Project root (keep minimal!)
├── 📋 CORE_DOCS/                     # Essential project documentation
│   ├── README.md                     # Main project overview
│   ├── CLAUDE.md                     # Development configuration
│   ├── DEVELOPMENT_BEST_PRACTICES_GUIDE.md
│   ├── COMMON_PITFALLS_AND_SOLUTIONS.md
│   └── PROJECT_STRUCTURE_GUIDELINES.md (this file)
│
├── 🔧 core/                          # Core system modules
│   ├── coordination/                 # Agent coordination and session management
│   ├── cost-tracking/               # Cost tracking and billing
│   ├── monitoring/                  # System health and performance
│   └── __init__.py
│
├── 📊 data/                          # All data and state management
│   ├── sessions/                     # Session state (DATE ORGANIZED!)
│   │   ├── 2025-07-24/              # Current session
│   │   │   ├── CURRENT_STATE.md
│   │   │   ├── SESSION_SUMMARY.md
│   │   │   ├── DECISIONS_LOG.md
│   │   │   └── analysis_results/
│   │   ├── 2025-07-23/              # Previous session
│   │   └── archive/                 # Sessions > 30 days old
│   ├── memory/                      # Claude Flow agent memory
│   ├── billing/                     # Cost tracking reports
│   └── cache/                       # Temporary cache files
│
├── 🗄️ archive/                       # Historical files (DATE ORGANIZED!)
│   ├── 2025-07-24_major_refactor/   # Dated archive directories
│   │   ├── README.md                # What was archived and why
│   │   ├── migration_notes.md       # Where functionality moved
│   │   └── deprecated_modules/
│   └── legacy/                      # Pre-2025 historical code
│
├── 🔐 config/                        # Configuration management
│   ├── config.template.yaml         # Template (COMMITTED)
│   ├── local.config.yaml           # Real config (IN .GITIGNORE)
│   ├── .env.template               # Environment template
│   └── README.md                   # Configuration setup guide
│
├── 📚 docs/                          # Project documentation
│   ├── analysis/                    # Research and analysis
│   ├── api/                        # API documentation  
│   ├── guides/                     # User and developer guides
│   ├── results/                    # Test results and benchmarks
│   └── status-reports/             # Progress and status updates
│
├── 🧪 tests/                         # Test suites
│   ├── unit/                       # Unit tests
│   ├── integration/                # Integration tests
│   ├── performance/                # Performance benchmarks
│   └── validation/                 # Structure and dependency validation
│
├── 🛠️ scripts/                      # Automation and tooling
│   ├── analysis/                   # Analysis tools (duplicates, dependencies)
│   ├── automation/                 # Session management and hooks
│   ├── cleanup/                    # Maintenance and organization tools
│   ├── security/                   # Security scanning and validation
│   └── setup/                      # Installation and configuration
│
├── 📦 experiments/                   # Experimental features and prototypes
├── 🔌 claudette/                    # Claudette CLI integration
├── 🏗️ project-state-framework/      # Project management framework
└── 🌍 requirements/deployment files  # Package management and deployment
```

---

## 🚨 **ROOT DIRECTORY RULES**

### **MAXIMUM 20 FILES IN ROOT**
The project root should contain ONLY:
- Essential documentation (README.md, CLAUDE.md, etc.)
- Package management files (requirements.txt, setup.py, etc.)
- Configuration templates (pyproject.toml, .gitignore, etc.)
- Deployment files (Makefile, etc.)

### **FORBIDDEN IN ROOT**
❌ **NEVER put these in root directory:**
- State files (`STATE_*.md`, `SESSION_*.md`)
- Real configuration files (`config.yaml`, `.env`)
- Temporary files (`temp_*.py`, `test_*.txt`)
- Archive files (`old_*.py`, `backup_*.md`)
- Duplicate files (`*_new.py`, `*_copy.py`)

### **Root Directory Validation**
```bash
# Check root directory health (run daily)
ls -la | wc -l  # Should be < 20

# Auto-organize root directory
python3 scripts/cleanup/root_organizer.py --analyze
python3 scripts/cleanup/root_organizer.py --organize --interactive
```

---

## 📊 **DATA DIRECTORY ORGANIZATION**

### **Session Management Structure**
```
data/sessions/
├── README.md                        # Session index and purpose
├── 2025-07-24/                      # Today's session (MANDATORY DATE FORMAT)
│   ├── CURRENT_STATE.md             # Current project state
│   ├── SESSION_SUMMARY.md           # Session activities and decisions
│   ├── DECISIONS_LOG.md             # Technical decisions made
│   ├── analysis_results/            # Analysis outputs
│   └── temp_files/                  # Temporary session files
├── 2025-07-23/                      # Previous session
├── 2025-07-22/                      # Earlier session
└── archive/                         # Sessions older than 30 days
    ├── 2025-06-01_to_2025-06-30/    # Monthly archive bundles
    └── 2025-05-01_to_2025-05-31/
```

### **Session File Standards**
```bash
# Create new session (MANDATORY DAILY)
mkdir -p data/sessions/$(date +%Y-%m-%d)

# Standard session files
CURRENT_STATE.md        # Current project status and next actions
SESSION_SUMMARY.md      # What was accomplished this session
DECISIONS_LOG.md        # Technical decisions and rationale
```

### **Memory and Cache Organization**
```
data/
├── memory/                          # Persistent memory (never delete)
│   ├── agents/                      # Agent memory and learnings
│   ├── projects/                    # Cross-project knowledge
│   └── patterns/                    # Recognized patterns and solutions
├── billing/                         # Cost tracking (permanent records)
│   ├── daily/                       # Daily cost reports
│   ├── monthly/                     # Monthly summaries
│   └── annual/                      # Yearly analysis
└── cache/                           # Temporary cache (safe to delete)
    ├── analysis/                    # Analysis cache files
    └── temp/                        # Temporary processing files
```

---

## 🗄️ **ARCHIVE STRATEGY**

### **Archive Organization Principles**
1. **Date-Based**: All archives organized by date (YYYY-MM-DD_description)
2. **Documentation Required**: Every archive needs README.md explaining contents
3. **Migration Notes**: Document where functionality moved to
4. **Search Keywords**: Include keywords for finding archived content

### **Archive Structure Template**
```
archive/
├── README.md                        # Archive index and policy
├── 2025-07-24_api_refactor/         # Specific change archive
│   ├── README.md                    # What was archived and why
│   ├── migration_notes.md           # Where to find new equivalents
│   ├── deprecated_api/              # Old API implementations
│   └── related_docs/                # Documentation that became obsolete
├── 2025-07-20_cost_system_upgrade/
│   ├── README.md
│   └── old_cost_tracking/
└── legacy/                          # Pre-2025 historical components
    ├── README.md
    └── archived_by_category/
```

### **Archive Documentation Template**
```markdown
# Archive: [YYYY-MM-DD_description]

## Why Archived
[Explain why these files were archived]

## What Was Moved
- `old_module.py` → `core/new_location/enhanced_module.py`
- `deprecated_api/` → Functionality integrated into `core/api/`

## Migration Notes
- To find equivalent of `old_function()`, use `new_module.enhanced_function()`
- Configuration options moved from `old_config.yaml` to `config/api.yaml`

## Keywords for Search
api, authentication, user-management, legacy-auth
```

---

## 🔐 **CONFIGURATION MANAGEMENT**

### **Configuration Security Model**
```
config/
├── README.md                        # Configuration setup instructions
├── config.template.yaml             # Template (COMMITTED TO GIT)
├── local.config.yaml               # Real config (IN .GITIGNORE)
├── .env.template                   # Environment template (COMMITTED)
├── .env                            # Real environment (IN .GITIGNORE)
└── environments/                   # Environment-specific configs
    ├── development.template.yaml
    ├── testing.template.yaml
    └── production.template.yaml
```

### **Configuration File Rules**
1. **Templates Only in Git**: Only `.template.*` files committed
2. **Real Configs Ignored**: All actual configs in `.gitignore`
3. **No Hardcoded Secrets**: Use environment variables for sensitive data
4. **Validation Required**: All configs must pass validation before use

### **Configuration Templates**
```yaml
# config.template.yaml
database:
  url: "YOUR_DATABASE_URL_HERE"
  
api_keys:
  claude: "YOUR_CLAUDE_API_KEY_HERE"
  openai: "YOUR_OPENAI_API_KEY_HERE"
  
monitoring:
  enabled: true
  endpoint: "YOUR_MONITORING_ENDPOINT_HERE"
```

---

## 🔧 **CORE MODULE ORGANIZATION**

### **Core Directory Structure**
```
core/
├── __init__.py                      # Core package initialization
├── coordination/                    # Session and agent coordination
│   ├── __init__.py
│   ├── session_manager.py          # Session state management
│   ├── agent_coordinator.py        # Multi-agent coordination
│   ├── dependency_validator.py     # Dependency validation tools
│   └── structure_manager.py        # Project structure management
├── cost-tracking/                   # Cost analysis and tracking
│   ├── __init__.py
│   ├── tracker.py                  # Main cost tracking
│   └── billing_reporter.py        # Cost reporting and analysis
└── monitoring/                      # System health and performance
    ├── __init__.py
    ├── health_monitor.py           # System health checking
    └── performance_tracker.py      # Performance metrics
```

### **Import Path Standards**
```python
# ✅ CORRECT import patterns
from core.coordination import session_manager
from core.cost_tracking.tracker import CostTracker
from core.monitoring.health_monitor import HealthMonitor

# ❌ WRONG import patterns (avoid these)
from core.coordination.session_manager import SessionManager  # Too specific
import core.cost_tracking.tracker as tracker  # Unclear naming
from core import *  # Never use star imports
```

---

## 🛠️ **SCRIPTS AND TOOLS ORGANIZATION**

### **Scripts Directory Structure**
```
scripts/
├── analysis/                        # Analysis and detection tools
│   ├── duplicate_detector.py       # Find and clean duplicate files
│   ├── import_analyzer.py          # Import path analysis
│   └── project_health.py          # Overall project health
├── automation/                      # Automation and session management
│   ├── session_guard.py            # Session state protection
│   ├── claude_startup_hook.py      # Claude Code integration
│   └── dependency_checker.py       # Dependency validation
├── cleanup/                         # Maintenance and organization
│   ├── root_organizer.py           # Root directory cleanup
│   ├── archive_manager.py          # Archive organization
│   └── duplicate_cleaner.py        # Duplicate file cleanup
├── security/                        # Security scanning and validation
│   ├── secret_scanner.py           # Detect exposed secrets
│   ├── config_validator.py         # Configuration security
│   └── permission_auditor.py       # File permission audit
└── setup/                           # Installation and configuration
    ├── install_git_hooks.sh        # Development safety hooks
    ├── project_initializer.py      # New project setup
    └── dependency_installer.sh     # Install all dependencies
```

### **Tool Usage Guidelines**
1. **Daily Tools**: Use `morning_check.sh`, `evening_cleanup.sh`
2. **Weekly Tools**: Use `duplicate_detector.py`, `project_health.py`
3. **Before Changes**: Use `import_analyzer.py`, `dependency_validator.py`
4. **After Changes**: Use validation tools to verify integrity

---

## 🧪 **TESTING ORGANIZATION**

### **Test Directory Structure**
```
tests/
├── conftest.py                      # Pytest configuration
├── unit/                           # Unit tests
│   ├── test_coordination/          # Test core coordination
│   ├── test_cost_tracking/         # Test cost tracking
│   └── test_monitoring/            # Test monitoring systems
├── integration/                     # Integration tests
│   ├── test_claude_integration/    # Claude Code integration
│   ├── test_cost_workflows/        # End-to-end cost tracking
│   └── test_session_management/    # Session management flows
├── performance/                     # Performance benchmarks
│   ├── benchmark_cost_tracking.py
│   └── benchmark_session_mgmt.py
└── validation/                      # Structure and dependency tests
    ├── test_project_structure.py   # Validate project organization
    ├── test_dependencies.py        # Validate all dependencies
    └── test_security.py           # Security validation
```

---

## 📋 **COMPLIANCE CHECKLIST**

### **Daily Compliance Check**
- [ ] Root directory has < 20 files
- [ ] All state files in `data/sessions/YYYY-MM-DD/`
- [ ] No real config files in git staging area
- [ ] No obvious duplicate files present

### **Weekly Compliance Check**
- [ ] Run full duplicate analysis and cleanup
- [ ] Validate all dependencies working correctly
- [ ] Check archive organization and documentation
- [ ] Review and organize session files

### **Before Structural Changes**
- [ ] Impact analysis completed
- [ ] All import references identified
- [ ] Dependency update plan created
- [ ] Backup/rollback plan prepared

### **After Structural Changes**
- [ ] All imports tested and working
- [ ] Dependencies validated
- [ ] Documentation updated
- [ ] Tests passing

---

## 🛡️ **AUTOMATED ENFORCEMENT**

### **Git Hooks**
```bash
# Install project structure enforcement hooks
./scripts/setup/install_git_hooks.sh

# Hooks installed:
# pre-commit: Prevent structure violations
# post-commit: Auto-organize files
# pre-push: Comprehensive validation
```

### **CI/CD Validation**
```yaml
# GitHub Actions example
- name: Validate Project Structure
  run: |
    python3 tests/validation/test_project_structure.py
    python3 scripts/analysis/project_health.py --validate
    python3 scripts/security/secret_scanner.py --check-all
```

### **Monitoring**
```bash
# Automated monitoring (add to crontab)
# Daily health check
0 9 * * * /path/to/claude_flow/scripts/monitoring/daily_health_check.sh

# Weekly maintenance  
0 9 * * 1 /path/to/claude_flow/scripts/maintenance/weekly_cleanup.sh
```

---

## 🆘 **EMERGENCY RECOVERY**

### **If Structure is Completely Broken**
```bash
# 1. Emergency assessment
python3 scripts/analysis/project_health.py --emergency-scan

# 2. Automated recovery (where safe)
./scripts/emergency/project_recovery.sh --analyze
./scripts/emergency/project_recovery.sh --fix --interactive

# 3. Manual recovery (if needed)
# - Move state files: mv *STATE*.md data/sessions/$(date +%Y-%m-%d)/
# - Organize configs: mv *.yaml config/ (check for secrets first!)
# - Archive old files: ./scripts/cleanup/archive_manager.py --organize
```

### **If Import Paths are Broken**
```bash
# 1. Find all broken imports
python3 scripts/analysis/import_analyzer.py --find-broken

# 2. Systematic repair
python3 scripts/analysis/import_analyzer.py --fix --interactive

# 3. Validate all imports work
python3 scripts/analysis/import_analyzer.py --test-all
```

---

## 📞 **HELP AND RESOURCES**

### **Key Commands**
```bash
# Project health check
python3 scripts/analysis/project_health.py --comprehensive

# Structure validation
python3 tests/validation/test_project_structure.py

# Emergency assessment
./scripts/emergency/emergency_diagnosis.sh
```

### **Related Documentation**
- **Development Guide**: `DEVELOPMENT_BEST_PRACTICES_GUIDE.md`
- **Common Issues**: `COMMON_PITFALLS_AND_SOLUTIONS.md`
- **Dependency Guide**: `docs/guides/DEPENDENCY_AWARE_DEVELOPMENT.md`
- **Lessons Learned**: `project-state-framework/CLAUDE_FLOW_LESSONS_LEARNED.md`

---

## 💡 **REMEMBER**

> **Structure prevents problems. Problems waste time. Time is your most valuable resource.**

### **The Structure Principles**
1. **Every file has a place** - No exceptions
2. **Date organization** - State files and archives by date
3. **Security first** - Templates only, real configs ignored
4. **Prevention over fixing** - Automated enforcement
5. **Documentation required** - Every directory needs README.md

### **The Red Flags**
- Root directory getting cluttered (> 20 files)
- State files scattered throughout project
- Real configuration files in git
- Duplicate files accumulating
- Import errors after "simple" moves

**When you see red flags, stop everything and fix the structure first.**

---

*This structure guide should be the foundation for all Claude Flow development. Deviation from these guidelines leads to the "Big 6" development issues that waste time and create frustration.*

*Last Updated: 2025-07-24*