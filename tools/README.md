# Tools Directory

This directory contains monitoring and dashboard tools for the Claude Flow project.

## Directory Structure

### 🎛️ `/dashboard/`
- **cost-dashboard.zsh** - Interactive cost monitoring dashboard
- Real-time cost tracking with live updates
- Export functionality and historical analysis
- Integration with external monitoring tools

### 📊 `/monitoring/`
- **test_export.csv** - Sample exported usage data
- Contains historical tracking data and usage patterns
- Used for analysis and reporting

## Dashboard Features

The cost dashboard provides:
- ✅ Real-time cost monitoring
- ✅ Historical analysis (7+ days)
- ✅ CSV export capabilities
- ✅ Live monitoring mode
- ✅ Anthropic API sync framework
- ✅ External tool integration

## Usage

```bash
# Launch cost dashboard
./tools/dashboard/cost-dashboard.zsh

# Direct monitoring access
python3 scripts/cost-tracking/claude-cost-tracker.py --action summary
```

## Integration

Tools integrate with:
- Cost tracking scripts in `/scripts/cost-tracking/`
- Claude Flow hooks system
- External monitoring tools (claude-monitor)
- Anthropic API (when configured)