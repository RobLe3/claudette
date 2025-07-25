#!/bin/bash
# Prepare repository for secure commit

set -e

echo "🚀 Preparing Claude Flow repository for commit..."

# Step 1: Run cleanup
echo "🧹 Running cleanup..."
./cleanup_repo.sh

# Step 2: Security audit
echo "🔒 Running security audit..."
python3 security_audit.py
if [ $? -ne 0 ]; then
    echo "❌ Security audit failed. Please fix issues before committing."
    exit 1
fi

# Step 3: Update documentation
echo "📚 Updating documentation..."
cp README_POLISHED.md README.md

# Step 4: Add new files to git
echo "📝 Adding new files..."
git add -A

# Step 5: Show what will be committed
echo "📋 Files ready for commit:"
git status --porcelain | head -20

echo ""
echo "✅ Repository prepared for commit!"
echo ""
echo "🎯 Summary of changes:"
echo "├── 🧹 Cleaned build artifacts and sensitive data"
echo "├── 🔒 Enhanced .gitignore for security"
echo "├── 📄 Added configuration templates"
echo "├── 🛡️ Implemented security audit tools"
echo "├── 📚 Polished documentation"
echo "└── 🚀 Ready for production commit"
echo ""
echo "To commit, run:"
echo "git commit -m 'SECURITY: Polish repository and implement 96% cost reduction system'"
echo ""
echo "⚠️  Remember to:"
echo "1. Set environment variables instead of hardcoded values"
echo "2. Use config.template.yaml as base for local configs"
echo "3. Run security_audit.py before future commits"