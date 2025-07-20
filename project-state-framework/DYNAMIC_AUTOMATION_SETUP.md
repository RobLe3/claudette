# Dynamic Project Automation - Complete Setup Guide

## 🎯 **System Overview**

The Dynamic Project Automation system provides:

- **🤖 Automatic Project Detection** - Identifies projects from Claude Code activity
- **📝 Interval-Based Diary Writing** - Generates diary entries every 30 minutes
- **📊 Real-time State Updates** - Updates project state every 5 minutes
- **🧠 Intelligent Categorization** - Analyzes project type and objectives
- **🔄 Hook Integration** - Connects with Claude Code for seamless tracking

## 📁 **System Components**

```
scripts/automation/
├── 🤖 project_automation_daemon.py    # Main automation daemon
├── 🔗 claude_hook_integration.py      # Claude Code hook integration
├── 🎛️ automation_control.sh           # Control script (start/stop/status)
├── 🧠 intelligent_categorization.py   # Advanced project analysis
└── 📊 [Generated] activity logs       # Real-time activity tracking
```

## 🚀 **Quick Setup (5 Steps)**

### **Step 1: Initialize Configuration**
```bash
cd /Users/roble/Documents/Python/claude_flow
./scripts/automation/automation_control.sh config
```
Creates default configuration at `~/.claude/automation_config.json`

### **Step 2: Setup Claude Code Hooks**
```bash
./scripts/automation/automation_control.sh setup
```
Configures Claude Code to automatically send activity to automation system

### **Step 3: Start Automation Daemon**
```bash
./scripts/automation/automation_control.sh start
```
Starts background daemon for real-time project tracking

### **Step 4: Verify Setup**
```bash
./scripts/automation/automation_control.sh status
```
Confirms everything is running correctly

### **Step 5: Test with Current Project**
```bash
# Perform some Claude Code operations to generate activity
# Then check for automatic updates
ls PROJECT_STATE/
```
Should show automatically updated state files

## ⚙️ **Configuration Options**

### **Automation Intervals** (`~/.claude/automation_config.json`)
```json
{
  "intervals": {
    "state_update": 300,        # 5 minutes - Current state updates
    "diary_generation": 1800,   # 30 minutes - Diary entries
    "lesson_extraction": 3600,  # 60 minutes - Lessons learned
    "project_detection": 60     # 1 minute - New project detection
  }
}
```

### **Detection Thresholds**
```json
{
  "detection_thresholds": {
    "new_project_file_count": 5,       # Files needed to detect new project
    "new_project_operation_count": 20, # Operations needed for confidence
    "context_switch_confidence": 0.8   # Confidence level for project switching
  }
}
```

### **Diary Generation Settings**
```json
{
  "diary_generation": {
    "min_activity_for_entry": 3,     # Minimum operations for diary entry
    "include_technical_details": true,
    "include_cost_metrics": true,
    "include_lesson_extraction": true
  }
}
```

## 🔄 **How It Works**

### **Real-Time Activity Tracking**
1. **Claude Code Operation** → Triggers hook
2. **Hook Integration** → Parses operation details
3. **Automation Daemon** → Logs activity to database
4. **Project Detection** → Identifies/updates current project

### **Automatic Diary Generation**
```
Every 30 minutes:
├── Collect activities from last 30 minutes
├── Analyze operation patterns and achievements
├── Generate structured diary entry
├── Append to PROJECT_DIARY.md
└── Store metrics in database
```

### **State File Updates**
```
Every 5 minutes:
├── Check recent activity (last 5 minutes)
├── Update CURRENT_STATE.md with progress
├── Update token usage and costs
└── Add activity summary
```

### **Intelligent Project Analysis**
```
Continuous analysis:
├── 🎯 Project type detection (claude_flow, web_app, automation, etc.)
├── 📊 Complexity analysis (high/medium/low)
├── 🔄 Development phase (setup, implementation, testing, etc.)
├── 💡 Objective inference (cost optimization, integration, etc.)
└── 🛠️ Technology stack detection (python, javascript, etc.)
```

## 📊 **Automatic Features**

### **1. Project Detection**
- **Directory-based:** Analyzes file structure and patterns
- **Activity-based:** Infers project type from operations
- **Confidence scoring:** Only creates projects with high confidence
- **Context switching:** Detects when switching between projects

### **2. Diary Entries Generated**
```markdown
### 2025-07-19 - Auto-Generated Entry: 14:30
**Duration:** 30 minutes | **Cost:** €0.0023 | **Status:** AUTO_TRACKED

#### 🎯 **Activities Detected**
- **Operations:** 12 total (Edit, Write, Bash, TodoWrite)
- **Files Modified:** 5 files
- **Token Usage:** 2,340 tokens

#### ✅ **Automated Achievements**
- **File Modifications** - Updated 3 files
- **Task Management** - Updated project todos
- **System Operations** - Executed 2 commands

#### 📊 **Session Metrics**
- **Token Efficiency:** 195 tokens per operation
- **Cost Efficiency:** €0.0002 per operation
- **Activity Rate:** 0.4 operations per minute
```

### **3. State Updates**
- **Last activity timestamp** - When work was last done
- **Active files** - Files currently being worked on
- **Current focus** - Inferred from recent operations
- **Token usage session** - Running total for current session
- **Recent activity summary** - Last 3 operations

### **4. Intelligent Categorization**
```markdown
# 📊 **Project Analysis: claude_flow**

## 🎯 **Project Overview**
- **Type:** Claude Integration (confidence: 95%)
- **Complexity:** High (78%)
- **Phase:** Implementation
- **Primary Objective:** Cost Optimization

## 📈 **Activity Metrics**
- **Total Activities:** 156
- **Files Involved:** 23
- **Technology Stack:** python, automation, monitoring
- **Development Velocity:** 3.2 operations/hour
```

## 🎛️ **Control Commands**

### **Daemon Management**
```bash
# Start automation
./scripts/automation/automation_control.sh start

# Stop automation  
./scripts/automation/automation_control.sh stop

# Restart automation
./scripts/automation/automation_control.sh restart

# Check status
./scripts/automation/automation_control.sh status

# View recent logs
./scripts/automation/automation_control.sh logs
```

### **Manual Triggers**
```bash
# Force project detection
python3 scripts/automation/project_automation_daemon.py detect-project

# Force diary generation
python3 scripts/automation/project_automation_daemon.py generate-diary

# Run project analysis
python3 scripts/automation/intelligent_categorization.py
```

## 📋 **Files Created Automatically**

### **For Each Project:**
```
project_directory/
└── PROJECT_STATE/
    ├── CURRENT_STATE.md        # ← Auto-updated every 5 minutes
    ├── PROJECT_DIARY.md        # ← Auto-updated every 30 minutes
    ├── LESSONS_LEARNED.md      # ← Auto-updated every 60 minutes
    └── sessions/
        └── YYYY-MM-DD_analysis.md  # ← Generated on demand
```

### **Global Files:**
```
~/.claude/
├── automation_config.json      # Configuration
├── project_automation.db       # Activity database
├── automation_daemon.pid       # Daemon process ID
├── automation_daemon.log       # Daemon logs
└── automation_activity.log     # Fallback activity log
```

## 💰 **Cost & Performance Impact**

### **Resource Usage**
- **CPU:** Minimal background processing (~0.1% CPU)
- **Memory:** ~20MB for daemon + SQLite database
- **Disk:** Database grows ~1KB per operation
- **Network:** None (all local processing)

### **Token Impact**
- **No additional tokens** - Tracks existing Claude Code operations
- **Cost analysis included** - Real-time cost tracking continues
- **Efficiency monitoring** - Identifies optimization opportunities

## 🧪 **Testing the System**

### **1. Verify Daemon Status**
```bash
./scripts/automation/automation_control.sh status
```
Should show:
- ✅ Daemon Status: RUNNING
- ✅ Configuration: Found
- ✅ Database: Initialized

### **2. Generate Activity**
```bash
# Perform some Claude Code operations
echo "test" > test_file.txt
ls PROJECT_STATE/
```

### **3. Check Automatic Updates**
```bash
# Wait 5 minutes, then check
cat PROJECT_STATE/CURRENT_STATE.md | tail -10

# Wait 30 minutes, then check
cat PROJECT_STATE/PROJECT_DIARY.md | tail -20
```

### **4. View Activity Database**
```bash
sqlite3 ~/.claude/project_automation.db "SELECT * FROM activities ORDER BY timestamp DESC LIMIT 5;"
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Daemon Won't Start**
```bash
# Check logs
./scripts/automation/automation_control.sh logs

# Common fixes:
pip3 install asyncio  # If missing async support
chmod +x scripts/automation/automation_control.sh  # If permissions issue
```

#### **No Activity Detected**
```bash
# Check Claude Code hooks
cat ~/.claude/settings.json | grep hooks

# Verify hook integration
python3 scripts/automation/claude_hook_integration.py test-tool --file test.txt
```

#### **Database Issues**
```bash
# Reset database
rm ~/.claude/project_automation.db
./scripts/automation/automation_control.sh restart
```

### **Performance Issues**
```bash
# Reduce update frequency in config
vim ~/.claude/automation_config.json

# Set higher intervals:
# "state_update": 900,     # 15 minutes instead of 5
# "diary_generation": 3600 # 60 minutes instead of 30
```

## 🎯 **Benefits Delivered**

### **Automatic Documentation**
- **Zero manual effort** - Diaries write themselves
- **Real-time accuracy** - Always current state
- **Comprehensive coverage** - Nothing gets missed
- **Consistent format** - Follows your established style

### **Intelligent Insights**
- **Pattern recognition** - Identifies optimization opportunities
- **Project classification** - Automatic categorization
- **Progress tracking** - Continuous velocity monitoring
- **Cross-project learning** - Insights applied automatically

### **Seamless Integration**
- **Claude Code native** - Uses existing hook system
- **Non-intrusive** - Background operation
- **Configurable** - Adjust intervals and behavior
- **Extensible** - Easy to add new features

---

## 🏁 **Ready to Use**

The dynamic automation system is now fully implemented and ready for immediate use. It will:

1. **Automatically detect** when you start working on projects
2. **Generate diary entries** every 30 minutes with real activity
3. **Update state files** every 5 minutes with current progress
4. **Classify projects** intelligently based on activity patterns
5. **Track costs and performance** continuously

**Start the system now:**
```bash
./scripts/automation/automation_control.sh start
```

Your development workflow just became fully automated and self-documenting! 🚀