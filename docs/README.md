# Claude Flow Private Development Documentation

**Internal documentation for Claude Flow advanced development and extensions.**

This documentation covers the private development repository containing advanced extensions, experimental features, and internal tooling that complements the public [Claudette](https://github.com/RobLe3/claudette) CLI tool.

## 🎯 Repository Purpose

This private repository focuses on:
- **Advanced AI coordination systems** and swarm architectures
- **Experimental cost optimization** algorithms and research
- **Development automation** and workflow extensions
- **Research prototypes** and proof-of-concepts
- **Internal tooling** and custom integrations

## 📚 Documentation Structure

### 🔧 Core Systems
Essential documentation for core development systems:

- **[COST_CONSERVATION_GUIDE.md](guides/COST_CONSERVATION_GUIDE.md)** - Cost optimization strategies
- **[CLAUDE_CODE_UPDATE_PROTECTION.md](guides/CLAUDE_CODE_UPDATE_PROTECTION.md)** - Update protection system

### 🤖 AI Integration
Advanced AI integration and coordination:

- **[CHATGPT_INTEGRATION_README.md](guides/CHATGPT_INTEGRATION_README.md)** - ChatGPT backend integration
- **[CLAUDE_CHATGPT_FALLBACK_GUIDE.md](guides/CLAUDE_CHATGPT_FALLBACK_GUIDE.md)** - Intelligent fallback strategies

### 🛠️ Development Tools
Internal development and automation tools:

- **[cache_usage.md](guides/cache_usage.md)** - Caching system documentation
- **[cost_dashboard.md](guides/cost_dashboard.md)** - Cost monitoring dashboard
- **[release_process.md](guides/release_process.md)** - Release management process

## 🔍 Quick Reference

### For Private Development
1. **Cost optimization research** → [guides/COST_CONSERVATION_GUIDE.md](guides/COST_CONSERVATION_GUIDE.md)
2. **ChatGPT backend integration** → [guides/CHATGPT_INTEGRATION_README.md](guides/CHATGPT_INTEGRATION_README.md)
3. **Development automation** → [scripts/automation/](../scripts/automation/) directory

### For Production Use
1. **Public Claudette CLI** → [https://github.com/RobLe3/claudette](https://github.com/RobLe3/claudette)
2. **Installation and usage** → See public repository README
3. **Bug reports and features** → Public repository issues

### Core Components
1. **Coordination systems** → [core/coordination/](../core/coordination/) directory
2. **Cost tracking** → [core/cost-tracking/](../core/cost-tracking/) directory
3. **Claude Code integration** → [.claude/](./.claude/) configuration

## 📝 Documentation Standards

### File Naming Convention
- **Guides**: `FEATURE_GUIDE.md` (all caps, descriptive)
- **Analysis**: `SUBJECT_ANALYSIS.md` (research and studies)
- **Results**: `results_description.md` (lowercase, underscore-separated)
- **Reports**: `REPORT_TYPE_REPORT.md` (status and completion reports)

### Content Structure
All documentation follows this structure:
1. **Title and overview**
2. **Quick reference/TOC**
3. **Detailed content**
4. **Examples and usage**
5. **Troubleshooting** (if applicable)
6. **References and links**

### Maintenance
- **Review quarterly** for accuracy
- **Update immediately** when features change
- **Archive outdated** documentation to legacy/
- **Validate links** and examples regularly

## 🔄 Documentation Workflow

### Adding New Documentation
1. **Determine category** (guides, analysis, results, legacy)
2. **Follow naming convention**
3. **Use standard structure**
4. **Add to this README** in appropriate section
5. **Validate links** and examples

### Updating Existing Documentation
1. **Check impact** on related documentation
2. **Update cross-references**
3. **Validate examples** still work
4. **Update modification date**

### Archiving Documentation
1. **Move to legacy/** directory
2. **Update references** in other documents
3. **Add note** about archival in README
4. **Preserve for historical reference**

---

**Private development documentation for Claude Flow advanced extensions.**

*Repository focus: Advanced AI coordination, cost optimization research, and development automation.*

*Related projects: [Claudette CLI](https://github.com/RobLe3/claudette) (public), [Claude Flow](https://github.com/ruvnet/claude-flow) (original)*

*Last updated: 2025-07-25*