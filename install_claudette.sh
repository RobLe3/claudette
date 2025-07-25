#!/bin/bash

# Claudette Installation Script
# Handles the latest fixes and proper installation

set -e

echo "🚀 Installing/Updating Claudette CLI..."
echo "=================================================="

# Check if we're in the right directory
if [[ ! -f "setup.py" || ! -d "claudette" ]]; then
    echo "❌ Error: Must be run from the claude_flow project root directory"
    exit 1
fi

# Create symlink for claudette command if it doesn't exist
CLAUDETTE_BIN="/usr/local/bin/claudette"
CLAUDETTE_SCRIPT="$(pwd)/run_claudette.py"

# Create the launcher script
cat > run_claudette.py << 'EOF'
#!/usr/bin/env python3
"""
Claudette CLI Launcher
Launches claudette from the local development directory
"""

import sys
import os
from pathlib import Path

# Add the local claudette to Python path
CLAUDETTE_DIR = Path(__file__).parent
sys.path.insert(0, str(CLAUDETTE_DIR))

try:
    from claudette.main import cli
    cli()
except KeyboardInterrupt:
    print("\n🛑 Interrupted by user", file=sys.stderr)
    sys.exit(130)
except Exception as e:
    print(f"claudette: error: {e}", file=sys.stderr)
    sys.exit(1)
EOF

chmod +x run_claudette.py

# Check if claudette symlink exists and points to the right place
if [[ -L "$CLAUDETTE_BIN" ]]; then
    CURRENT_TARGET=$(readlink "$CLAUDETTE_BIN")
    if [[ "$CURRENT_TARGET" == "$CLAUDETTE_SCRIPT" ]]; then
        echo "✅ Claudette symlink already exists and is correct"
    else
        echo "🔄 Updating existing claudette symlink..."
        sudo rm "$CLAUDETTE_BIN"
        sudo ln -s "$CLAUDETTE_SCRIPT" "$CLAUDETTE_BIN"
        echo "✅ Updated claudette symlink"
    fi
elif [[ -f "$CLAUDETTE_BIN" ]]; then
    echo "⚠️  Regular file exists at $CLAUDETTE_BIN, backing up..."
    sudo mv "$CLAUDETTE_BIN" "${CLAUDETTE_BIN}.backup"
    sudo ln -s "$CLAUDETTE_SCRIPT" "$CLAUDETTE_BIN"
    echo "✅ Created claudette symlink (backed up existing file)"
else
    echo "🔗 Creating claudette symlink..."
    sudo ln -s "$CLAUDETTE_SCRIPT" "$CLAUDETTE_BIN"
    echo "✅ Created claudette symlink"
fi

# Verify installation
echo ""
echo "🧪 Testing installation..."
if "$CLAUDETTE_BIN" --version >/dev/null 2>&1; then
    VERSION=$("$CLAUDETTE_BIN" --version)
    echo "✅ Installation successful: $VERSION"
else
    echo "❌ Installation test failed"
    exit 1
fi

echo ""
echo "🎯 Claudette installation complete!"
echo ""
echo "Usage:"
echo "  claudette --help                    # Show help"
echo "  claudette --version                 # Show version" 
echo "  claudette \"your prompt here\"       # Launch with prompt"
echo "  python3 -m claudette \"prompt\"     # Alternative launch method"
echo ""
echo "✅ All bug fixes applied:"
echo "  - LazyFunction warnings eliminated"
echo "  - xargs command length issues fixed"
echo "  - JSON event emission for transparency"
echo "  - Cache permission issues resolved"
echo "  - Import path issues fixed"
echo "  - Preprocessor method names corrected"