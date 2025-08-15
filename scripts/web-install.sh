#!/bin/bash
# Claudette Web Installer - Download and run latest installer
# Usage: curl -sSL https://install.claudette.dev | bash

set -euo pipefail

# Configuration
GITHUB_REPO="user/claudette"
INSTALL_PREFIX="${CLAUDETTE_INSTALL_PREFIX:-$HOME/.local}"
TEMP_DIR=$(mktemp -d)
VERBOSE="${CLAUDETTE_VERBOSE:-false}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Cleanup on exit
cleanup() {
    if [[ -d "$TEMP_DIR" ]]; then
        rm -rf "$TEMP_DIR"
    fi
}
trap cleanup EXIT

log_info() {
    echo -e "ℹ️  ${BLUE}$1${NC}"
}

log_success() {
    echo -e "✅ ${GREEN}$1${NC}"
}

log_warning() {
    echo -e "⚠️  ${YELLOW}$1${NC}"
}

log_error() {
    echo -e "❌ ${RED}$1${NC}" >&2
}

log_verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "🔍 ${CYAN}$1${NC}"
    fi
}

# Main installation function
main() {
    echo -e "${BOLD}${CYAN}🚀 Claudette Web Installer${NC}"
    echo -e "${CYAN}============================${NC}"
    echo

    # Detect platform
    local platform
    platform=$(uname -s | tr '[:upper:]' '[:lower:]')
    
    log_info "Platform: $platform ($(uname -m))"
    
    # Check requirements
    log_info "Checking requirements..."
    
    local required_commands=("curl" "tar" "bash")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            log_error "$cmd is required but not installed"
            exit 1
        fi
    done
    
    log_success "Requirements satisfied"
    
    # Download latest installer
    log_info "Downloading latest installer..."
    
    local archive_url="https://github.com/$GITHUB_REPO/archive/refs/heads/main.tar.gz"
    local archive_file="$TEMP_DIR/claudette.tar.gz"
    
    log_verbose "Download URL: $archive_url"
    log_verbose "Temp directory: $TEMP_DIR"
    
    if ! curl -sSL "$archive_url" -o "$archive_file"; then
        log_error "Failed to download Claudette installer"
        log_error "Please check your internet connection and try again"
        exit 1
    fi
    
    log_success "Downloaded installer archive"
    
    # Extract archive
    log_info "Extracting installer..."
    
    if ! tar -xzf "$archive_file" -C "$TEMP_DIR"; then
        log_error "Failed to extract installer archive"
        exit 1
    fi
    
    # Find extracted directory
    local extracted_dir
    extracted_dir=$(find "$TEMP_DIR" -maxdepth 1 -type d -name "*claudette*" | head -n 1)
    
    if [[ -z "$extracted_dir" ]]; then
        log_error "Could not find extracted installer directory"
        exit 1
    fi
    
    log_verbose "Extracted to: $extracted_dir"
    log_success "Installer extracted"
    
    # Run platform-specific installer
    local installer_script
    case "$platform" in
        "darwin"|"linux")
            installer_script="$extracted_dir/scripts/install/install-unix.sh"
            ;;
        *)
            log_warning "Unknown platform: $platform, trying Unix installer..."
            installer_script="$extracted_dir/scripts/install/install-unix.sh"
            ;;
    esac
    
    if [[ ! -f "$installer_script" ]]; then
        log_error "Installer script not found: $installer_script"
        exit 1
    fi
    
    # Make installer executable
    chmod +x "$installer_script"
    
    # Pass through environment variables and arguments
    log_info "Starting Claudette installation..."
    echo
    
    export CLAUDETTE_INSTALL_PREFIX="$INSTALL_PREFIX"
    export CLAUDETTE_VERBOSE="$VERBOSE"
    
    # Execute installer with any passed arguments
    exec "$installer_script" "$@"
}

# Parse basic arguments before main
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose)
            VERBOSE="true"
            shift
            ;;
        --prefix)
            INSTALL_PREFIX="$2"
            shift 2
            ;;
        --help|-h)
            cat << 'EOF'
Claudette Web Installer

Download and install the latest version of Claudette from GitHub.

USAGE:
    curl -sSL https://install.claudette.dev | bash
    curl -sSL https://install.claudette.dev | bash -s -- [OPTIONS]

OPTIONS:
    --prefix PATH    Installation prefix (default: ~/.local)
    --verbose        Enable verbose output
    --help           Show this help

EXAMPLES:
    # Default installation
    curl -sSL https://install.claudette.dev | bash

    # Install to /usr/local (requires sudo)
    curl -sSL https://install.claudette.dev | bash -s -- --prefix /usr/local

    # Verbose installation
    curl -sSL https://install.claudette.dev | bash -s -- --verbose

ENVIRONMENT VARIABLES:
    CLAUDETTE_INSTALL_PREFIX   Installation prefix
    CLAUDETTE_VERBOSE          Enable verbose output (true/false)

For more options, the installer supports additional arguments that will be
passed through to the platform-specific installer.

EOF
            exit 0
            ;;
        *)
            # Pass remaining arguments to the main installer
            break
            ;;
    esac
done

# Run main installation
main "$@"