#!/bin/bash
# Build PyPI packages with optional GPG signing
# Usage: ./scripts/release/build_pypi.sh [--sign]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DIST_DIR="$PROJECT_ROOT/dist"

echo "🏗️  Building Claudette PyPI packages..."

cd "$PROJECT_ROOT"

# Clean previous builds
if [ -d "$DIST_DIR" ]; then
    echo "🧹 Cleaning previous builds..."
    rm -rf "$DIST_DIR"
fi

# Ensure build tools are available
echo "🔧 Checking build dependencies..."
python -m pip install --quiet --upgrade build twine

# Build source distribution and wheel
echo "📦 Building source distribution and wheel..."
python -m build

# Verify the built packages
echo "✅ Verifying package integrity..."
python -m twine check "$DIST_DIR"/*

# GPG signing if requested and key available
if [[ "${1:-}" == "--sign" ]] || [[ -n "${GPG_KEY:-}" ]]; then
    if command -v gpg >/dev/null 2>&1; then
        echo "🔐 GPG signing packages..."
        
        # Import GPG key if provided via environment
        if [[ -n "${GPG_KEY:-}" ]]; then
            echo "$GPG_KEY" | gpg --batch --import
        fi
        
        # Sign all files in dist/
        for file in "$DIST_DIR"/*; do
            if [[ -f "$file" ]]; then
                echo "  Signing $(basename "$file")..."
                if [[ -n "${GPG_PASSPHRASE:-}" ]]; then
                    echo "$GPG_PASSPHRASE" | gpg --batch --yes --passphrase-fd 0 --armor --detach-sign "$file"
                else
                    gpg --armor --detach-sign "$file"
                fi
            fi
        done
        
        echo "✅ GPG signatures created"
    else
        echo "⚠️  GPG not available, skipping signing"
    fi
fi

# Show build results
echo ""
echo "📋 Build completed successfully:"
echo "   Directory: $DIST_DIR"
ls -la "$DIST_DIR"

echo ""
echo "🚀 Next steps:"
echo "   Test upload: python -m twine upload --repository testpypi dist/*"
echo "   Production:  python -m twine upload dist/*"
echo ""

# Validate package metadata
echo "🔍 Package metadata validation..."
python -c "
import sys
sys.path.insert(0, '.')
from claudette import __version__
print(f'Package version: {__version__}')
assert __version__ == '1.0.0', f'Version mismatch: {__version__}'
print('✅ Version validation passed')
"

echo "✅ Build script completed successfully!"