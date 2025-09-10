#!/bin/bash

# Claudette Installation Validation Test
# Tests installation across different methods and environments

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Test configuration
TEST_VERSION=""
CLEANUP=true
VERBOSE=false
METHODS=("npm" "local" "github")

usage() {
    cat << EOF
Claudette Installation Validation Test

Usage: $0 [OPTIONS]

OPTIONS:
    -v, --version VERSION     Test specific version (default: current package.json)
    -m, --method METHOD       Test specific method: npm, local, github (default: all)
    -n, --no-cleanup         Skip cleanup after tests
    --verbose                 Enable verbose output
    -h, --help               Show this help message

EXAMPLES:
    $0                                    # Test all methods, current version
    $0 -v 2.1.5                         # Test all methods, specific version  
    $0 -m npm -v 2.1.5                  # Test npm installation only
    $0 --verbose --no-cleanup            # Verbose mode, keep test artifacts

METHODS:
    npm      - Install from npm registry (npm install -g claudette)
    local    - Install from local package (npm install -g ./claudette-*.tgz)
    github   - Install from GitHub release (download + install)

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--version)
            TEST_VERSION="$2"
            shift 2
            ;;
        -m|--method)
            METHODS=("$2")
            shift 2
            ;;
        -n|--no-cleanup)
            CLEANUP=false
            shift
            ;;
        --verbose)
            VERBOSE=true
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

# Get version if not specified
if [ -z "$TEST_VERSION" ]; then
    if command -v jq >/dev/null 2>&1 && [ -f "$PROJECT_ROOT/package.json" ]; then
        TEST_VERSION=$(jq -r '.version' "$PROJECT_ROOT/package.json")
        log_info "Using version from package.json: $TEST_VERSION"
    else
        log_error "Version not specified and cannot read from package.json"
        exit 1
    fi
fi

# Test environment setup
setup_test_environment() {
    local test_name="$1"
    local test_dir="$PROJECT_ROOT/test-install-$test_name-$$"
    
    log_info "Setting up test environment: $test_name"
    
    mkdir -p "$test_dir"
    cd "$test_dir"
    
    # Create minimal package.json for local npm operations
    cat > package.json << EOF
{
  "name": "claudette-test-env",
  "version": "1.0.0",
  "private": true
}
EOF
    
    echo "$test_dir"
}

cleanup_test_environment() {
    local test_dir="$1"
    
    if [ "$CLEANUP" = true ] && [ -d "$test_dir" ]; then
        log_info "Cleaning up test environment: $(basename "$test_dir")"
        rm -rf "$test_dir"
    else
        log_info "Test environment preserved: $test_dir"
    fi
}

test_npm_installation() {
    log_info "🧪 Testing npm registry installation..."
    
    local test_dir=$(setup_test_environment "npm")
    local success=false
    
    cd "$test_dir"
    
    # Create isolated npm environment
    npm config set prefix "$test_dir/npm-global"
    export PATH="$test_dir/npm-global/bin:$PATH"
    
    # Test npm installation
    log_info "Installing claudette@$TEST_VERSION from npm registry..."
    
    if [ "$VERBOSE" = true ]; then
        npm install -g "claudette@$TEST_VERSION"
    else
        npm install -g "claudette@$TEST_VERSION" >/dev/null 2>&1
    fi
    
    if [ $? -eq 0 ]; then
        log_success "npm installation completed"
        
        # Test executable
        if command -v claudette >/dev/null 2>&1; then
            log_info "Testing claudette executable..."
            
            # Test version command
            local installed_version=$(claudette --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1)
            if [ "$installed_version" = "$TEST_VERSION" ]; then
                log_success "Version verification passed: $installed_version"
                success=true
            else
                log_error "Version mismatch: expected $TEST_VERSION, got $installed_version"
            fi
            
            # Test help command
            if claudette --help >/dev/null 2>&1; then
                log_success "Help command functional"
            else
                log_warning "Help command failed"
                success=false
            fi
        else
            log_error "claudette executable not found in PATH"
        fi
    else
        log_error "npm installation failed"
    fi
    
    cleanup_test_environment "$test_dir"
    
    if [ "$success" = true ]; then
        log_success "✅ npm installation test PASSED"
    else
        log_error "❌ npm installation test FAILED"
        return 1
    fi
}

test_local_installation() {
    log_info "🧪 Testing local package installation..."
    
    local test_dir=$(setup_test_environment "local")
    local success=false
    
    cd "$PROJECT_ROOT"
    
    # Build and pack current version
    npm run build >/dev/null 2>&1
    npm pack >/dev/null 2>&1
    
    local package_file=$(ls claudette-*.tgz 2>/dev/null | head -n 1)
    if [ -z "$package_file" ]; then
        log_error "No package file found - run npm pack first"
        cleanup_test_environment "$test_dir"
        return 1
    fi
    
    # Copy package to test directory
    cp "$package_file" "$test_dir/"
    cd "$test_dir"
    
    # Create isolated npm environment
    npm config set prefix "$test_dir/npm-global"
    export PATH="$test_dir/npm-global/bin:$PATH"
    
    # Test local installation
    log_info "Installing from local package: $package_file"
    
    if [ "$VERBOSE" = true ]; then
        npm install -g "$package_file"
    else
        npm install -g "$package_file" >/dev/null 2>&1
    fi
    
    if [ $? -eq 0 ]; then
        log_success "Local package installation completed"
        
        # Test executable
        if command -v claudette >/dev/null 2>&1; then
            log_info "Testing claudette executable..."
            
            # Test version command
            local installed_version=$(claudette --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1)
            if [ "$installed_version" = "$TEST_VERSION" ]; then
                log_success "Version verification passed: $installed_version"
                success=true
            else
                log_error "Version mismatch: expected $TEST_VERSION, got $installed_version"
            fi
            
            # Test basic functionality
            if claudette --help >/dev/null 2>&1; then
                log_success "Basic functionality test passed"
            else
                log_warning "Basic functionality test failed"
                success=false
            fi
        else
            log_error "claudette executable not found in PATH"
        fi
    else
        log_error "Local package installation failed"
    fi
    
    # Cleanup package file
    rm -f "$PROJECT_ROOT/$package_file"
    cleanup_test_environment "$test_dir"
    
    if [ "$success" = true ]; then
        log_success "✅ Local installation test PASSED"
    else
        log_error "❌ Local installation test FAILED"
        return 1
    fi
}

test_github_installation() {
    log_info "🧪 Testing GitHub release installation..."
    
    local test_dir=$(setup_test_environment "github")
    local success=false
    
    cd "$test_dir"
    
    # Check if GitHub CLI is available
    if ! command -v gh >/dev/null 2>&1; then
        log_warning "GitHub CLI not available - skipping GitHub installation test"
        cleanup_test_environment "$test_dir"
        return 0
    fi
    
    # Create isolated npm environment
    npm config set prefix "$test_dir/npm-global"
    export PATH="$test_dir/npm-global/bin:$PATH"
    
    # Try to download from GitHub release
    log_info "Downloading from GitHub release v$TEST_VERSION..."
    
    # This would work if the release exists
    local repo_url="https://github.com/user/claudette"  # Update with actual repo URL
    local release_url="$repo_url/releases/download/v$TEST_VERSION"
    
    # For now, simulate GitHub release download
    log_warning "GitHub release download simulation - would download from: $release_url"
    
    # Since we can't actually download from a non-existent release,
    # we'll simulate the process with a local package
    cd "$PROJECT_ROOT"
    npm run build >/dev/null 2>&1
    npm pack >/dev/null 2>&1
    
    local package_file=$(ls claudette-*.tgz 2>/dev/null | head -n 1)
    if [ -n "$package_file" ]; then
        cp "$package_file" "$test_dir/"
        cd "$test_dir"
        
        log_info "Simulating GitHub release installation..."
        
        if [ "$VERBOSE" = true ]; then
            npm install -g "$package_file"
        else
            npm install -g "$package_file" >/dev/null 2>&1
        fi
        
        if [ $? -eq 0 ]; then
            log_success "GitHub release installation simulation completed"
            
            # Test executable
            if command -v claudette >/dev/null 2>&1; then
                local installed_version=$(claudette --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1)
                if [ "$installed_version" = "$TEST_VERSION" ]; then
                    log_success "Version verification passed: $installed_version"
                    success=true
                else
                    log_error "Version mismatch: expected $TEST_VERSION, got $installed_version"
                fi
            else
                log_error "claudette executable not found in PATH"
            fi
        else
            log_error "GitHub release installation simulation failed"
        fi
        
        # Cleanup package file
        rm -f "$PROJECT_ROOT/$package_file"
    else
        log_error "Could not create package for GitHub release simulation"
    fi
    
    cleanup_test_environment "$test_dir"
    
    if [ "$success" = true ]; then
        log_success "✅ GitHub installation test PASSED (simulated)"
    else
        log_error "❌ GitHub installation test FAILED"
        return 1
    fi
}

run_performance_tests() {
    log_info "🚀 Running performance tests..."
    
    local test_dir=$(setup_test_environment "performance")
    cd "$test_dir"
    
    # Create isolated npm environment
    npm config set prefix "$test_dir/npm-global"
    export PATH="$test_dir/npm-global/bin:$PATH"
    
    # Install from local package for performance testing
    cd "$PROJECT_ROOT"
    npm run build >/dev/null 2>&1
    npm pack >/dev/null 2>&1
    
    local package_file=$(ls claudette-*.tgz 2>/dev/null | head -n 1)
    if [ -n "$package_file" ]; then
        cp "$package_file" "$test_dir/"
        cd "$test_dir"
        
        # Time installation
        local install_start=$(date +%s%N)
        npm install -g "$package_file" >/dev/null 2>&1
        local install_end=$(date +%s%N)
        local install_time=$(((install_end - install_start) / 1000000))
        
        log_info "Installation time: ${install_time}ms"
        
        if command -v claudette >/dev/null 2>&1; then
            # Time version command
            local version_start=$(date +%s%N)
            claudette --version >/dev/null 2>&1
            local version_end=$(date +%s%N)
            local version_time=$(((version_end - version_start) / 1000000))
            
            log_info "Version command time: ${version_time}ms"
            
            # Time help command
            local help_start=$(date +%s%N)
            claudette --help >/dev/null 2>&1
            local help_end=$(date +%s%N)
            local help_time=$(((help_end - help_start) / 1000000))
            
            log_info "Help command time: ${help_time}ms"
            
            # Performance thresholds
            if [ "$install_time" -lt 10000 ] && [ "$version_time" -lt 1000 ] && [ "$help_time" -lt 2000 ]; then
                log_success "✅ Performance tests PASSED"
            else
                log_warning "⚠️ Performance tests completed with warnings (slow execution)"
            fi
        else
            log_error "❌ Performance tests FAILED (executable not found)"
        fi
        
        rm -f "$PROJECT_ROOT/$package_file"
    else
        log_error "Could not create package for performance testing"
    fi
    
    cleanup_test_environment "$test_dir"
}

generate_test_report() {
    local start_time="$1"
    local end_time="$2"
    local total_time=$(((end_time - start_time) / 1000000))
    
    log_info "Generating test report..."
    
    cat > "installation-test-report.json" << EOF
{
  "test_report": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "version_tested": "$TEST_VERSION",
    "methods_tested": [$(printf '"%s",' "${METHODS[@]}" | sed 's/,$//')]",
    "total_time_ms": $total_time,
    "environment": {
      "os": "$(uname -s 2>/dev/null || echo 'Unknown')",
      "arch": "$(uname -m 2>/dev/null || echo 'Unknown')",
      "node_version": "$(node --version 2>/dev/null || echo 'Unknown')",
      "npm_version": "$(npm --version 2>/dev/null || echo 'Unknown')"
    },
    "test_configuration": {
      "cleanup": $CLEANUP,
      "verbose": $VERBOSE
    }
  }
}
EOF
    
    log_success "Test report generated: installation-test-report.json"
}

# Main execution
main() {
    local start_time=$(date +%s%N)
    
    log_info "🧪 Claudette Installation Validation Test Suite"
    log_info "Version: $TEST_VERSION"
    log_info "Methods: ${METHODS[*]}"
    log_info "Cleanup: $CLEANUP"
    log_info "Verbose: $VERBOSE"
    echo
    
    local failed_tests=0
    local total_tests=0
    
    # Run installation tests
    for method in "${METHODS[@]}"; do
        case $method in
            npm)
                total_tests=$((total_tests + 1))
                if ! test_npm_installation; then
                    failed_tests=$((failed_tests + 1))
                fi
                ;;
            local)
                total_tests=$((total_tests + 1))
                if ! test_local_installation; then
                    failed_tests=$((failed_tests + 1))
                fi
                ;;
            github)
                total_tests=$((total_tests + 1))
                if ! test_github_installation; then
                    failed_tests=$((failed_tests + 1))
                fi
                ;;
            *)
                log_warning "Unknown test method: $method"
                ;;
        esac
        echo
    done
    
    # Run performance tests
    run_performance_tests
    echo
    
    local end_time=$(date +%s%N)
    generate_test_report "$start_time" "$end_time"
    
    # Summary
    log_info "📊 Test Results Summary:"
    log_info "  Total Tests: $total_tests"
    log_info "  Passed: $((total_tests - failed_tests))"
    log_info "  Failed: $failed_tests"
    log_info "  Success Rate: $(( (total_tests - failed_tests) * 100 / total_tests ))%"
    
    if [ "$failed_tests" -eq 0 ]; then
        log_success "🎉 All installation tests PASSED!"
        exit 0
    else
        log_error "❌ Some installation tests FAILED!"
        exit 1
    fi
}

# Execute main function
main "$@"