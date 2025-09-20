#!/bin/bash
# Claudette Cross-Platform Installation Entry Point
# Automatically detects platform and runs appropriate installer

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Claudette Universal Installer${NC}"
echo -e "${BLUE}================================${NC}"

# Detect platform
platform=$(uname -s | tr '[:upper:]' '[:lower:]')

case "$platform" in
    "darwin")
        echo -e "${GREEN}✅ Detected macOS${NC}"
        exec "$(dirname "$0")/install/install-unix.sh" "$@"
        ;;
    "linux")
        echo -e "${GREEN}✅ Detected Linux${NC}"
        exec "$(dirname "$0")/install/install-unix.sh" "$@"
        ;;
    *)
        echo -e "${YELLOW}⚠️  Detected unknown Unix-like system: $platform${NC}"
        echo -e "${YELLOW}Attempting Unix installation...${NC}"
        exec "$(dirname "$0")/install/install-unix.sh" "$@"
        ;;
esac