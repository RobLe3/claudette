#!/bin/bash
# Claudette Universal Unix Installer (macOS/Linux)
# Cross-Platform Agent - Phase 1 Implementation Swarm
# Supports macOS 10.15+ and most Linux distributions

set -euo pipefail

# Default configuration
INSTALL_PREFIX="${CLAUDETTE_INSTALL_PREFIX:-$HOME/.local}"
INSTALL_DIR="$INSTALL_PREFIX/lib/claudette"
BIN_DIR="$INSTALL_PREFIX/bin"
VERSION="${CLAUDETTE_VERSION:-latest}"
DRY_RUN="${CLAUDETTE_DRY_RUN:-false}"
SKIP_DEPENDENCIES="${CLAUDETTE_SKIP_DEPS:-false}"
NO_CREDENTIALS="${CLAUDETTE_NO_CREDS:-false}"
VERBOSE="${CLAUDETTE_VERBOSE:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
BOLD='\033[1m'
NC='\033[0m'

# Logging functions
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
        echo -e "🔍 ${GRAY}$1${NC}"
    fi
}

log_section() {
    echo
    echo -e "🚀 ${BOLD}${CYAN}$1${NC}"
    echo -e "${CYAN}$(printf '=%.0s' $(seq 1 $((${#1} + 3))))${NC}"
}

# Usage information
usage() {
    cat << EOF
Claudette Universal Unix Installer

USAGE:
    $0 [OPTIONS]

OPTIONS:
    -p, --prefix PATH       Installation prefix (default: ~/.local)
    -v, --version VERSION   Version to install (default: latest)
    -d, --dry-run          Show what would be done without making changes
    -s, --skip-deps        Skip dependency installation
    -n, --no-credentials   Skip credential setup
    --verbose              Enable verbose output
    -h, --help             Show this help

ENVIRONMENT VARIABLES:
    CLAUDETTE_INSTALL_PREFIX   Installation prefix
    CLAUDETTE_VERSION          Version to install
    CLAUDETTE_DRY_RUN          Dry run mode (true/false)
    CLAUDETTE_SKIP_DEPS        Skip dependencies (true/false)
    CLAUDETTE_NO_CREDS         Skip credentials (true/false)
    CLAUDETTE_VERBOSE          Verbose output (true/false)

EXAMPLES:
    # Default installation
    curl -sSL https://install.claudette.dev | bash

    # Install to specific directory
    $0 --prefix /usr/local

    # Install specific version
    $0 --version v2.1.5

    # Dry run to see what would happen
    $0 --dry-run

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -p|--prefix)
                INSTALL_PREFIX="$2"
                INSTALL_DIR="$INSTALL_PREFIX/lib/claudette"
                BIN_DIR="$INSTALL_PREFIX/bin"
                shift 2
                ;;
            -v|--version)
                VERSION="$2"
                shift 2
                ;;
            -d|--dry-run)
                DRY_RUN="true"
                shift
                ;;
            -s|--skip-deps)
                SKIP_DEPENDENCIES="true"
                shift
                ;;
            -n|--no-credentials)
                NO_CREDENTIALS="true"
                shift
                ;;
            --verbose)
                VERBOSE="true"
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
}

# Detect platform and architecture
detect_platform() {
    local os
    local arch
    
    os=$(uname -s | tr '[:upper:]' '[:lower:]')
    arch=$(uname -m)
    
    case "$os" in
        darwin)
            PLATFORM="macOS"
            ;;
        linux)
            PLATFORM="Linux"
            ;;
        *)
            PLATFORM="$os"
            ;;
    esac
    
    case "$arch" in
        x86_64|amd64)
            ARCH="x64"
            ;;
        arm64|aarch64)
            ARCH="arm64"
            ;;
        *)
            ARCH="$arch"
            ;;
    esac
    
    log_info "Platform: $PLATFORM ($ARCH)"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]] && [[ "$INSTALL_PREFIX" != "/usr/local" ]]; then
        log_warning "Running as root with user install prefix"
        log_warning "Consider using --prefix /usr/local for system-wide installation"
    fi
}

# Check system requirements
check_requirements() {
    log_section "System Requirements"
    
    # Check for required commands
    local required_commands=("curl" "tar" "mkdir" "cp" "chmod")
    for cmd in "${required_commands[@]}"; do
        if command -v "$cmd" >/dev/null 2>&1; then
            log_success "$cmd: available"
        else
            log_error "$cmd: not found - please install it"
            return 1
        fi
    done
    
    # Check disk space (require at least 100MB)
    local available_space
    available_space=$(df -BM "$HOME" | awk 'NR==2 {print $4}' | sed 's/M//')
    if [[ "$available_space" -lt 100 ]]; then
        log_warning "Low disk space: ${available_space}MB available"
        log_warning "Claudette requires at least 100MB"
    else
        log_success "Disk space: ${available_space}MB available"
    fi
    
    # Check internet connectivity
    if curl -sSf --connect-timeout 5 https://api.github.com >/dev/null 2>&1; then
        log_success "Internet connectivity: available"
    else
        log_error "Internet connectivity: failed"
        log_error "Cannot download Claudette without internet access"
        return 1
    fi
}

# Check Node.js installation
check_nodejs() {
    log_section "Node.js Verification"
    
    if command -v node >/dev/null 2>&1; then
        local node_version
        node_version=$(node --version | sed 's/v//')
        local major_version
        major_version=$(echo "$node_version" | cut -d. -f1)
        
        log_info "Node.js version: $node_version"
        
        if [[ "$major_version" -ge 18 ]]; then
            log_success "Node.js version is compatible (>= 18.0.0)"
            return 0
        else
            log_warning "Node.js version $node_version is too old (need >= 18.0.0)"
            return 1
        fi
    else
        log_warning "Node.js not found"
        return 1
    fi
}

# Install Node.js
install_nodejs() {
    log_section "Node.js Installation"
    
    if check_nodejs; then
        return 0
    fi
    
    log_info "Installing Node.js..."
    
    case "$PLATFORM" in
        "macOS")
            install_nodejs_macos
            ;;
        "Linux")
            install_nodejs_linux
            ;;
        *)
            log_error "Automatic Node.js installation not supported on $PLATFORM"
            log_error "Please install Node.js manually from https://nodejs.org"
            return 1
            ;;
    esac
}

install_nodejs_macos() {
    # Try Homebrew first
    if command -v brew >/dev/null 2>&1; then
        log_info "Installing Node.js via Homebrew..."
        if [[ "$DRY_RUN" == "true" ]]; then
            log_verbose "[DRY RUN] Would run: brew install node"
            return 0
        fi
        brew install node
        return $?
    fi
    
    # Try MacPorts
    if command -v port >/dev/null 2>&1; then
        log_info "Installing Node.js via MacPorts..."
        if [[ "$DRY_RUN" == "true" ]]; then
            log_verbose "[DRY RUN] Would run: sudo port install nodejs18"
            return 0
        fi
        sudo port install nodejs18
        return $?
    fi
    
    # Manual installation
    install_nodejs_manual
}

install_nodejs_linux() {
    # Try package managers in order of preference
    
    # Ubuntu/Debian
    if command -v apt-get >/dev/null 2>&1; then
        log_info "Installing Node.js via apt..."
        if [[ "$DRY_RUN" == "true" ]]; then
            log_verbose "[DRY RUN] Would run: curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -"
            log_verbose "[DRY RUN] Would run: sudo apt-get install -y nodejs"
            return 0
        fi
        
        # Install NodeSource repository
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
        return $?
    fi
    
    # Red Hat/CentOS/Fedora
    if command -v dnf >/dev/null 2>&1; then
        log_info "Installing Node.js via dnf..."
        if [[ "$DRY_RUN" == "true" ]]; then
            log_verbose "[DRY RUN] Would run: sudo dnf install -y nodejs npm"
            return 0
        fi
        sudo dnf install -y nodejs npm
        return $?
    fi
    
    if command -v yum >/dev/null 2>&1; then
        log_info "Installing Node.js via yum..."
        if [[ "$DRY_RUN" == "true" ]]; then
            log_verbose "[DRY RUN] Would run: sudo yum install -y nodejs npm"
            return 0
        fi
        sudo yum install -y nodejs npm
        return $?
    fi
    
    # SUSE
    if command -v zypper >/dev/null 2>&1; then
        log_info "Installing Node.js via zypper..."
        if [[ "$DRY_RUN" == "true" ]]; then
            log_verbose "[DRY RUN] Would run: sudo zypper install -y nodejs18 npm18"
            return 0
        fi
        sudo zypper install -y nodejs18 npm18
        return $?
    fi
    
    # Arch Linux
    if command -v pacman >/dev/null 2>&1; then
        log_info "Installing Node.js via pacman..."
        if [[ "$DRY_RUN" == "true" ]]; then
            log_verbose "[DRY RUN] Would run: sudo pacman -S --noconfirm nodejs npm"
            return 0
        fi
        sudo pacman -S --noconfirm nodejs npm
        return $?
    fi
    
    # Alpine Linux
    if command -v apk >/dev/null 2>&1; then
        log_info "Installing Node.js via apk..."
        if [[ "$DRY_RUN" == "true" ]]; then
            log_verbose "[DRY RUN] Would run: sudo apk add nodejs npm"
            return 0
        fi
        sudo apk add nodejs npm
        return $?
    fi
    
    # Fallback to manual installation
    log_warning "No supported package manager found"
    install_nodejs_manual
}

install_nodejs_manual() {
    log_info "Installing Node.js manually..."
    
    local node_version="20.10.0"
    local node_arch
    
    case "$ARCH" in
        "x64") node_arch="x64" ;;
        "arm64") node_arch="arm64" ;;
        *) 
            log_error "Unsupported architecture: $ARCH"
            return 1
            ;;
    esac
    
    local download_url="https://nodejs.org/dist/v${node_version}/node-v${node_version}-${PLATFORM,,}-${node_arch}.tar.xz"
    local temp_dir
    temp_dir=$(mktemp -d)
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_verbose "[DRY RUN] Would download: $download_url"
        log_verbose "[DRY RUN] Would extract to: $INSTALL_PREFIX"
        return 0
    fi
    
    log_info "Downloading Node.js from $download_url..."
    if ! curl -sSL "$download_url" | tar -xJ -C "$temp_dir"; then
        log_error "Failed to download and extract Node.js"
        rm -rf "$temp_dir"
        return 1
    fi
    
    local node_dir="$temp_dir/node-v${node_version}-${PLATFORM,,}-${node_arch}"
    
    # Create installation directories
    mkdir -p "$INSTALL_PREFIX"/{bin,lib,share}
    
    # Copy Node.js files
    cp -r "$node_dir"/* "$INSTALL_PREFIX/"
    
    # Clean up
    rm -rf "$temp_dir"
    
    log_success "Node.js installed to $INSTALL_PREFIX"
}

# Check platform-specific credential storage
check_credential_storage() {
    log_section "Credential Storage Check"
    
    case "$PLATFORM" in
        "macOS")
            if command -v security >/dev/null 2>&1; then
                log_success "macOS Keychain: available"
                return 0
            else
                log_warning "macOS Keychain: not available"
            fi
            ;;
        "Linux")
            if command -v secret-tool >/dev/null 2>&1; then
                log_success "libsecret (GNOME Keyring): available"
                return 0
            else
                log_warning "libsecret: not available"
                log_info "Install with: sudo apt install libsecret-tools (Ubuntu/Debian)"
                log_info "              sudo dnf install libsecret (Fedora)"
                log_info "              sudo pacman -S libsecret (Arch)"
            fi
            ;;
    esac
    
    log_info "Will use encrypted file storage as fallback"
    return 1
}

# Get latest release information
get_release_info() {
    log_section "Release Information"
    
    local api_url
    if [[ "$VERSION" == "latest" ]]; then
        api_url="https://api.github.com/repos/user/claudette/releases/latest"
    else
        api_url="https://api.github.com/repos/user/claudette/releases/tags/$VERSION"
    fi
    
    log_info "Fetching release information..."
    log_verbose "API URL: $api_url"
    
    local release_json
    if ! release_json=$(curl -sSf "$api_url" 2>/dev/null); then
        log_warning "Failed to fetch release from GitHub API"
        log_info "Falling back to main branch"
        
        RELEASE_VERSION="main"
        DOWNLOAD_URL="https://github.com/user/claudette/archive/refs/heads/main.tar.gz"
        return 0
    fi
    
    # Parse release information (basic JSON parsing)
    RELEASE_VERSION=$(echo "$release_json" | grep '"tag_name"' | head -n 1 | cut -d '"' -f 4)
    DOWNLOAD_URL=$(echo "$release_json" | grep '"tarball_url"' | head -n 1 | cut -d '"' -f 4)
    
    if [[ -z "$DOWNLOAD_URL" ]]; then
        DOWNLOAD_URL="https://github.com/user/claudette/archive/refs/tags/$RELEASE_VERSION.tar.gz"
    fi
    
    log_success "Release: $RELEASE_VERSION"
    log_verbose "Download URL: $DOWNLOAD_URL"
}

# Install Claudette
install_claudette() {
    log_section "Claudette Installation"
    
    get_release_info
    
    log_info "Installing Claudette $RELEASE_VERSION..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_verbose "[DRY RUN] Would download: $DOWNLOAD_URL"
        log_verbose "[DRY RUN] Would install to: $INSTALL_DIR"
        return 0
    fi
    
    # Create temporary directory
    local temp_dir
    temp_dir=$(mktemp -d)
    local archive_file="$temp_dir/claudette.tar.gz"
    
    # Download
    log_info "Downloading Claudette..."
    if ! curl -sSL "$DOWNLOAD_URL" -o "$archive_file"; then
        log_error "Failed to download Claudette"
        rm -rf "$temp_dir"
        return 1
    fi
    
    # Extract
    log_info "Extracting archive..."
    if ! tar -xzf "$archive_file" -C "$temp_dir"; then
        log_error "Failed to extract Claudette archive"
        rm -rf "$temp_dir"
        return 1
    fi
    
    # Find extracted directory (GitHub creates a directory with commit hash)
    local extracted_dir
    extracted_dir=$(find "$temp_dir" -maxdepth 1 -type d -name "*claudette*" | head -n 1)
    
    if [[ -z "$extracted_dir" ]]; then
        log_error "Could not find extracted Claudette directory"
        rm -rf "$temp_dir"
        return 1
    fi
    
    # Create installation directory
    log_info "Creating installation directory..."
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$BIN_DIR"
    
    # Copy files
    log_info "Installing files..."
    cp -r "$extracted_dir"/* "$INSTALL_DIR/"
    
    # Install npm dependencies
    log_info "Installing npm dependencies..."
    cd "$INSTALL_DIR"
    if ! npm install --production; then
        log_warning "npm install failed - continuing anyway"
    fi
    
    # Create executable wrapper
    log_info "Creating executable wrapper..."
    cat > "$BIN_DIR/claudette" << EOF
#!/bin/bash
# Claudette wrapper script
export NODE_PATH="$INSTALL_DIR/node_modules"
exec node "$INSTALL_DIR/claudette" "\$@"
EOF
    
    chmod +x "$BIN_DIR/claudette"
    
    # Clean up
    rm -rf "$temp_dir"
    
    log_success "Claudette installed successfully"
}

# Setup environment
setup_environment() {
    log_section "Environment Setup"
    
    # Add to PATH if not already there
    if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
        log_info "Adding Claudette to PATH..."
        
        local shell_rc
        case "$SHELL" in
            */bash)
                shell_rc="$HOME/.bashrc"
                ;;
            */zsh)
                shell_rc="$HOME/.zshrc"
                ;;
            */fish)
                shell_rc="$HOME/.config/fish/config.fish"
                ;;
            *)
                shell_rc="$HOME/.profile"
                ;;
        esac
        
        if [[ "$DRY_RUN" == "true" ]]; then
            log_verbose "[DRY RUN] Would add to $shell_rc: export PATH=\"$BIN_DIR:\$PATH\""
        else
            if [[ "$SHELL" == */fish ]]; then
                echo "set -gx PATH $BIN_DIR \$PATH" >> "$shell_rc"
            else
                echo "export PATH=\"$BIN_DIR:\$PATH\"" >> "$shell_rc"
            fi
            
            # Also add to current session
            export PATH="$BIN_DIR:$PATH"
            
            log_success "Added to $shell_rc"
        fi
    else
        log_success "Already in PATH"
    fi
    
    # Create symlink for system-wide installation
    if [[ "$INSTALL_PREFIX" == "/usr/local" ]] && [[ -w "/usr/local/bin" ]]; then
        if [[ "$DRY_RUN" == "true" ]]; then
            log_verbose "[DRY RUN] Would create symlink: /usr/local/bin/claudette"
        else
            ln -sf "$BIN_DIR/claudette" "/usr/local/bin/claudette" 2>/dev/null || true
            log_success "Created system-wide symlink"
        fi
    fi
}

# Setup credentials
setup_credentials() {
    if [[ "$NO_CREDENTIALS" == "true" ]]; then
        log_warning "Skipping credential setup (--no-credentials specified)"
        return
    fi
    
    log_section "Credential Setup"
    
    check_credential_storage
    
    log_info "Credential setup will be handled by Claudette on first run"
    log_info "Use 'claudette setup-credentials' to configure API keys"
}

# Test installation
test_installation() {
    log_section "Installation Verification"
    
    # Test Node.js
    if check_nodejs; then
        log_success "Node.js: compatible version installed"
    else
        log_error "Node.js: installation failed"
        return 1
    fi
    
    # Test Claudette executable
    if [[ "$DRY_RUN" == "true" ]]; then
        log_verbose "[DRY RUN] Would test: $BIN_DIR/claudette --version"
        log_success "Claudette: would be executable"
    else
        if command -v claudette >/dev/null 2>&1; then
            log_success "Claudette: executable found in PATH"
        elif [[ -x "$BIN_DIR/claudette" ]]; then
            log_success "Claudette: executable found at $BIN_DIR/claudette"
        else
            log_error "Claudette: executable not found"
            return 1
        fi
    fi
    
    # Test package.json
    if [[ -f "$INSTALL_DIR/package.json" ]]; then
        local version
        version=$(grep '"version"' "$INSTALL_DIR/package.json" | cut -d '"' -f 4)
        log_success "Package: v$version installed"
    else
        log_error "Package: package.json not found"
        return 1
    fi
    
    # Test dependencies
    if [[ -d "$INSTALL_DIR/node_modules" ]]; then
        log_success "Dependencies: installed"
    else
        log_warning "Dependencies: not installed (run npm install)"
    fi
    
    return 0
}

# Completion message
show_completion() {
    echo
    echo -e "🎉 ${GREEN}${BOLD}Claudette installation completed successfully!${NC}"
    echo
    echo -e "📍 ${CYAN}Installation Location:${NC} $INSTALL_DIR"
    echo -e "🔗 ${CYAN}Executable Path:${NC} $BIN_DIR/claudette"
    echo
    echo -e "🚀 ${BOLD}Getting Started:${NC}"
    echo -e "   1. Restart your terminal or run: ${YELLOW}source ~/.bashrc${NC}"
    echo -e "   2. Set up API keys: ${YELLOW}claudette setup-credentials${NC}"
    echo -e "   3. Test installation: ${YELLOW}claudette status${NC}"
    echo -e "   4. Start using Claudette: ${YELLOW}claudette \"Hello world\"${NC}"
    echo
    echo -e "📚 ${CYAN}Documentation:${NC} https://github.com/user/claudette"
    echo -e "🆘 ${CYAN}Support:${NC} https://github.com/user/claudette/issues"
    echo
}

# Cleanup on exit
cleanup() {
    if [[ -n "${temp_dir:-}" ]] && [[ -d "$temp_dir" ]]; then
        rm -rf "$temp_dir"
    fi
}
trap cleanup EXIT

# Main installation flow
main() {
    echo -e "${BOLD}${CYAN}🚀 Claudette Universal Unix Installer${NC}"
    echo -e "${CYAN}======================================${NC}"
    echo -e "${GRAY}Cross-Platform Agent - Phase 1 Implementation${NC}"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "DRY RUN MODE - No changes will be made"
    fi
    
    # System checks
    detect_platform
    check_root
    check_requirements
    
    # Install dependencies
    if [[ "$SKIP_DEPENDENCIES" != "true" ]]; then
        if ! install_nodejs; then
            log_error "Node.js installation failed - aborting"
            exit 1
        fi
    else
        log_warning "Skipping dependency installation"
    fi
    
    # Install Claudette
    if ! install_claudette; then
        log_error "Claudette installation failed - aborting"
        exit 1
    fi
    
    # Setup environment
    setup_environment
    
    # Setup credentials  
    setup_credentials
    
    # Test installation
    if ! test_installation; then
        log_error "Installation verification failed"
        exit 1
    fi
    
    # Success
    show_completion
}

# Parse arguments and run
parse_args "$@"
main