#!/usr/bin/env python3
"""
Claudette CLI entry point
Drop-in replacement for Claude Code CLI with preprocessing pipeline
"""

import sys
from claudette.main import cli

if __name__ == "__main__":
    cli(sys.argv[1:])