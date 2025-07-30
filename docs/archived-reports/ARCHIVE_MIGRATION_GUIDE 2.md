# Archive Migration Guide

This document helps users locate files that have been moved to the new archive structure.

## What Changed

As of 2025-07-24, historical documents and state files have been organized into a structured archive system for better project management and historical tracking.

## File Locations

### State Files
**Old Location**: `PHASE_*_STATE.md` (root directory)  
**New Location**: `archive/states/[date]/`

- `PHASE_10_STATE.md` → `archive/states/2025-07-22/PHASE_10_STATE.md`

### Phase Reports  
**Old Location**: `PHASE_*_COMPLETION_REPORT.md` (root directory)  
**New Location**: `archive/reports/phases/`

- `PHASE_10_COMPLETION_REPORT.md` → `archive/reports/phases/PHASE_10_COMPLETION_REPORT.md`
- `PHASE_11_COMPLETION_REPORT.md` → `archive/reports/phases/PHASE_11_COMPLETION_REPORT.md` 
- `PHASE_12_COMPLETION_REPORT.md` → `archive/reports/phases/PHASE_12_COMPLETION_REPORT.md`

### Final Reports
**Old Location**: Various final reports (root directory)  
**New Location**: `archive/reports/completion/`

- `FINAL_BENCHMARK_REPORT.md` → `archive/reports/completion/FINAL_BENCHMARK_REPORT.md`
- `FINAL_INTEGRITY_REPORT.md` → `archive/reports/completion/FINAL_INTEGRITY_REPORT.md`
- `QUALITY_VALIDATION_REPORT.md` → `archive/reports/completion/QUALITY_VALIDATION_REPORT.md`

### Analysis and Summary Files
**Old Location**: Various `*_SUMMARY.md` and analysis files (root directory)  
**New Location**: `archive/reports/analysis/`

- `COST_CONSERVATION_SUMMARY.md` → `archive/reports/analysis/COST_CONSERVATION_SUMMARY.md`
- `LESSONS_LEARNED_SUMMARY.md` → `archive/reports/analysis/LESSONS_LEARNED_SUMMARY.md`
- `DEPLOYMENT_SUMMARY.md` → `archive/reports/analysis/DEPLOYMENT_SUMMARY.md`
- `CLAUDETTE_POLISH_SUMMARY.md` → `archive/reports/analysis/CLAUDETTE_POLISH_SUMMARY.md`
- `SECURE_SUDO_SUMMARY.md` → `archive/reports/analysis/SECURE_SUDO_SUMMARY.md`
- `FILESYSTEM_COORDINATION_SUMMARY.md` → `archive/reports/analysis/FILESYSTEM_COORDINATION_SUMMARY.md`

### Diagnostic Reports
**Old Location**: `*_DIAGNOSIS.md` files (root directory)  
**New Location**: `archive/reports/analysis/`

- `CONSOLE_ERROR_DIAGNOSIS.md` → `archive/reports/analysis/CONSOLE_ERROR_DIAGNOSIS.md`
- `CLAUDE_GUI_DIAGNOSIS.md` → `archive/reports/analysis/CLAUDE_GUI_DIAGNOSIS.md`

### Assessment Documents
**Old Location**: Assessment files (root directory)  
**New Location**: `archive/reports/analysis/`

- `CLAUDETTE_FEASIBILITY_ASSESSMENT.md` → `archive/reports/analysis/CLAUDETTE_FEASIBILITY_ASSESSMENT.md`

### Technical Analysis Reports
**Old Location**: Various technical reports (root directory)  
**New Location**: `archive/reports/analysis/`

- All technical analysis reports including offloading, model switching, validation, and quality enhancement reports

## Navigation Help

### Finding Documents by Type

**For State Files**: Check `archive/states/[date]/INDEX.md` for chronological organization
**For Phase Reports**: Check `archive/reports/phases/INDEX.md` for phase-specific documentation  
**For Final Reports**: Check `archive/reports/completion/INDEX.md` for project milestones
**For Analysis**: Check `archive/reports/analysis/INDEX.md` for technical analysis and summaries

### Index Files

Each archive directory contains an `INDEX.md` file that explains:
- What types of documents are stored there
- Organization methodology 
- Historical context
- Usage guidelines

### Quick Reference Commands

```bash
# Find all index files
find archive -name "INDEX.md"

# List all archived reports  
find archive/reports -name "*.md" | grep -v INDEX

# Find specific file by name pattern
find archive -name "*PHASE_10*"
find archive -name "*SUMMARY*"

# Browse archive structure
tree archive/
```

## Benefits of New Structure

1. **Chronological Organization** - Easy to track project evolution over time
2. **Categorical Grouping** - Related documents grouped together logically  
3. **Historical Preservation** - Important development history maintained
4. **Improved Navigation** - Index files provide clear guidance
5. **Reduced Root Clutter** - Clean working directory for active development

## Support

If you cannot locate a specific file after the migration:

1. Check the appropriate `INDEX.md` file in the archive
2. Use the quick reference commands above
3. Search by file content if you remember key phrases:
   ```bash
   grep -r "search term" archive/
   ```

This migration maintains all historical documents while improving project organization and maintainability.

Last Updated: 2025-07-24