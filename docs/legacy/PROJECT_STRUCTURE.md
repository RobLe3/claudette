# Claude Flow Project Structure

## 📁 Directory Organization

```
claude_flow/
├── 📋 CLAUDE.md                    # Claude Flow configuration
├── ⚙️ claude-flow.config.json      # Enhanced project configuration
├── 📜 PROJECT_STRUCTURE.md         # This file
├── 🔗 claude-cost-tracker.py       # Symlink to scripts/cost-tracking/ (for compatibility)
├── 🔧 scripts/                     # Custom development scripts
│   ├── 📊 cost-tracking/
│   │   └── claude-cost-tracker.py  # Cost tracking system
│   ├── 🚀 startup-tools/
│   │   └── start-claude-flow.zsh   # Interactive startup script
│   ├── 🔌 third-party/
│   │   ├── claude-flow             # Unix executable
│   │   ├── claude-flow.bat         # Windows batch
│   │   └── claude-flow.ps1         # PowerShell script
│   └── 📖 README.md
├── 🎛️ tools/                       # Monitoring and dashboard tools
│   ├── 📊 dashboard/
│   │   └── cost-dashboard.zsh      # Interactive cost dashboard
│   ├── 📈 monitoring/
│   │   └── *.csv                   # Exported data files
│   └── 📖 README.md
├── 🔌 plugins/                     # Extensions and custom plugins
│   ├── claude-flow-extensions/     # Reserved for future plugins
│   └── 📖 README.md
├── 🧠 memory/                      # Claude Flow memory system
│   ├── agents/
│   ├── sessions/
│   └── claude-flow-data.json
├── 🎯 coordination/                # Claude Flow coordination
│   ├── memory_bank/
│   ├── orchestration/
│   └── subtasks/
└── 🔧 .claude/                     # Claude Code configuration
    ├── commands/
    ├── helpers/
    ├── settings.json
    └── settings.local.json
```

## 🎯 Quick Access

**Start Claude Flow:**
```bash
./scripts/startup-tools/start-claude-flow.zsh
```

**Monitor Costs:**
```bash
./tools/dashboard/cost-dashboard.zsh
```

**Check Usage:**
```bash
python3 scripts/cost-tracking/claude-cost-tracker.py --action summary
```

## 🔧 Configuration Files

- **claude-flow.config.json** - Project configuration with organization settings
- **.claude/settings.json** - Claude Code hooks and permissions
- **CLAUDE.md** - Claude Flow memory and instructions

## 🎛️ Features

- ✅ **Organized Structure** - Clean separation of concerns
- ✅ **Cost Tracking** - Real-time monitoring with SQLite database
- ✅ **Interactive Dashboards** - User-friendly interfaces
- ✅ **Hook Integration** - Automatic tracking via Claude Code hooks
- ✅ **Historical Analysis** - 7-day, weekly, monthly summaries
- ✅ **Data Export** - CSV export for external analysis
- ✅ **Plugin Ready** - Extensible architecture for future development

## 📊 Usage Tracking

The system automatically tracks:
- All bash commands executed
- All file edits and modifications
- Session start/end times
- Token usage and costs
- Historical patterns and trends

## 🔄 Maintenance

The organized structure is maintained through:
- Configuration in `claude-flow.config.json`
- Hooks in `.claude/settings.json`
- Automatic path resolution in scripts
- README files for documentation
- Compatibility symlink for legacy hook references

## 🔧 Compatibility Notes

- A symlink `claude-cost-tracker.py` → `scripts/cost-tracking/claude-cost-tracker.py` maintains compatibility with cached Claude session data
- All new configurations use the organized paths
- The symlink ensures hooks work regardless of session cache state