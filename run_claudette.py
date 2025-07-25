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