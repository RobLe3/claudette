#!/bin/bash
# Repository Cleanup Script - Remove sensitive data and build artifacts
# Run this before committing to ensure repository is clean and secure

set -e

echo "🧹 Starting Claude Flow Repository Cleanup..."

# Remove Python build artifacts
echo "🔥 Removing Python build artifacts..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true
find . -type f -name "*.pyo" -delete 2>/dev/null || true
find . -type f -name "*.pyd" -delete 2>/dev/null || true

# Remove temporary and cache files
echo "🗑️  Removing temporary files..."
find . -type f -name "*.tmp" -delete 2>/dev/null || true
find . -type f -name "*.temp" -delete 2>/dev/null || true
find . -type f -name ".DS_Store" -delete 2>/dev/null || true
find . -type f -name "Thumbs.db" -delete 2>/dev/null || true

# Remove log files (but keep templates)
echo "📋 Cleaning log files..."
find . -type f -name "*.log" ! -path "*/docs/*" ! -path "*/examples/*" -delete 2>/dev/null || true

# Remove database files that may contain usage data
echo "🗄️  Removing database files..."
find . -type f -name "*.db" ! -path "*/docs/*" ! -path "*/examples/*" -delete 2>/dev/null || true
find . -type f -name "*.sqlite" ! -path "*/docs/*" ! -path "*/examples/*" -delete 2>/dev/null || true

# Remove swarm memory files (may contain session data)
echo "🧠 Cleaning swarm memory files..."
find . -type d -name ".swarm" -exec rm -rf {} + 2>/dev/null || true

# Remove usage tracking files
echo "📊 Removing usage tracking files..."
find . -type f -name "*_usage.json" -delete 2>/dev/null || true
find . -type f -name "usage_*.json" -delete 2>/dev/null || true
find . -type f -name "cost_*.json" -delete 2>/dev/null || true

# Remove backup files
echo "💾 Cleaning backup files..."
find . -type f -name "*.bak" -delete 2>/dev/null || true
find . -type f -name "*~" -delete 2>/dev/null || true
find . -type f -name "*.orig" -delete 2>/dev/null || true

# Remove IDE files
echo "💻 Removing IDE files..."
rm -rf .vscode/settings.json 2>/dev/null || true
rm -rf .idea/ 2>/dev/null || true
find . -type f -name "*.swp" -delete 2>/dev/null || true
find . -type f -name "*.swo" -delete 2>/dev/null || true

# Remove node_modules if any
echo "📦 Cleaning node modules..."
find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true

# Remove virtual environment
echo "🐍 Removing virtual environment..."
rm -rf venv/ 2>/dev/null || true
rm -rf .venv/ 2>/dev/null || true

# Remove pytest cache
echo "🧪 Cleaning test cache..."
find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name ".coverage" -exec rm -rf {} + 2>/dev/null || true

# Clean up any remaining artifacts
echo "🔧 Final cleanup..."
rm -rf build/ dist/ *.egg-info/ 2>/dev/null || true

echo "✅ Repository cleanup complete!"
echo ""
echo "⚠️  SECURITY CHECK REQUIRED:"
echo "Please manually review these files for any remaining sensitive data:"
echo "- Configuration files (*.yaml, *.json, *.conf)"
echo "- Environment files (.env*)"
echo "- Script files with hardcoded paths or keys"
echo ""
echo "🔍 Run 'git status' to see what will be committed"