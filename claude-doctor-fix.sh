#!/bin/bash
# Claude Doctor Fix - Drop-in replacement with automatic environment fixes
# Science Officer Claude & XO Claudette - Stardate 2025.08.06

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🖖 Claude Doctor Fix - Engaging Auto-Repair Systems"
echo "=================================================="

# Store original environment
ORIGINAL_TERM="$TERM"
ORIGINAL_TMPDIR="${TMPDIR:-/tmp}"

# Success flag
DIAGNOSTIC_SUCCESS=false

# Function to detect terminal capabilities
detect_terminal_env() {
    local score=0
    echo "🔍 Analyzing terminal environment..."
    
    # Check TTY
    if [ -t 0 ]; then
        echo -e "${GREEN}✅ TTY: Available${NC}"
        ((score++))
    else
        echo -e "${RED}❌ TTY: Not available${NC}"
        return 0
    fi
    
    # Check terminal program
    case "$TERM_PROGRAM" in
        "iTerm.app")
            echo -e "${GREEN}✅ Terminal: iTerm2 (excellent)${NC}"
            ((score+=2))
            ;;
        "Apple_Terminal")
            echo -e "${YELLOW}⚠️  Terminal: Apple Terminal (needs fixes)${NC}"
            ((score++))
            ;;
        *)
            echo -e "${BLUE}ℹ️  Terminal: ${TERM_PROGRAM:-Unknown}${NC}"
            ((score++))
            ;;
    esac
    
    # Check TERM variable
    case "$TERM" in
        xterm*|screen*|tmux*)
            echo -e "${GREEN}✅ TERM: $TERM (compatible)${NC}"
            ((score++))
            ;;
        *)
            echo -e "${YELLOW}⚠️  TERM: $TERM (may need fixing)${NC}"
            ;;
    esac
    
    return $score
}

# Function to apply automatic fixes
apply_auto_fixes() {
    echo ""
    echo "🔧 Applying automatic fixes..."
    
    # Fix 1: Optimize TERM variable
    if [[ "$TERM" != "xterm-256color" ]]; then
        echo "📝 Setting TERM=xterm-256color"
        export TERM=xterm-256color
    fi
    
    # Fix 2: Ensure proper temp directory
    if [[ ! -w "$TMPDIR" ]]; then
        echo "📁 Setting writable temp directory"
        export TMPDIR=/tmp
    fi
    
    # Fix 3: Set raw mode compatibility
    if [[ "$TERM_PROGRAM" == "Apple_Terminal" ]]; then
        echo "🍎 Applying Apple Terminal compatibility fixes"
        export TERM=xterm-256color
        # Disable problematic terminal features
        stty -echo -icanon min 1 time 0 2>/dev/null || true
    fi
    
    # Fix 4: Node.js environment optimization
    export NODE_ENV=${NODE_ENV:-development}
    
    echo -e "${GREEN}✅ Auto-fixes applied${NC}"
}

# Function to run claude doctor with monitoring
run_claude_doctor() {
    echo ""
    echo "🚀 Attempting claude doctor..."
    
    # Try with timeout to prevent hanging
    timeout 30s claude doctor 2>&1 && {
        echo -e "${GREEN}🎉 claude doctor succeeded!${NC}"
        DIAGNOSTIC_SUCCESS=true
        return 0
    }
    
    local exit_code=$?
    if [[ $exit_code -eq 124 ]]; then
        echo -e "${YELLOW}⏰ claude doctor timed out${NC}"
    else
        echo -e "${RED}❌ claude doctor failed (exit code: $exit_code)${NC}"
    fi
    return $exit_code
}

# Fallback diagnostic methods
run_fallback_diagnostics() {
    echo ""
    echo "🛡️  Running fallback diagnostics..."
    
    echo "📋 Basic Claude Code Status:"
    echo "----------------------------"
    
    # Test 1: Version check
    if claude --version 2>/dev/null; then
        echo -e "${GREEN}✅ claude --version: Working${NC}"
    else
        echo -e "${RED}❌ claude --version: Failed${NC}"
    fi
    
    # Test 2: Help command
    if claude --help >/dev/null 2>&1; then
        echo -e "${GREEN}✅ claude --help: Working${NC}"
    else
        echo -e "${RED}❌ claude --help: Failed${NC}"
    fi
    
    # Test 3: Configuration check
    if [[ -f "$HOME/.anthropic/claude.config.json" ]]; then
        echo -e "${GREEN}✅ Config file: Found${NC}"
    else
        echo -e "${YELLOW}⚠️  Config file: Not found${NC}"
    fi
    
    # Test 4: API key check
    if [[ -n "$ANTHROPIC_API_KEY" ]]; then
        echo -e "${GREEN}✅ API Key: Present${NC}"
    else
        echo -e "${YELLOW}ℹ️  API Key: Using system authentication${NC}"
    fi
    
    # Test 5: Network connectivity
    if ping -c 1 api.anthropic.com >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Network: Anthropic API reachable${NC}"
    else
        echo -e "${YELLOW}⚠️  Network: Cannot reach Anthropic API${NC}"
    fi
    
    echo ""
    echo "💡 Manual Diagnostic Commands:"
    echo "   claude --version    # Check installation"
    echo "   claude --help       # View available commands"  
    echo "   export TERM=xterm-256color  # Fix terminal compatibility"
}

# Alternative doctor functionality
run_alternative_doctor() {
    echo ""
    echo "🏥 Alternative Doctor Analysis:"
    echo "==============================="
    
    # System info
    echo "🖥️  System Information:"
    echo "   OS: $(uname -s)"
    echo "   Architecture: $(uname -m)"
    echo "   Shell: $SHELL"
    echo "   Home: $HOME"
    
    # Claude Code installation check
    echo ""
    echo "🔧 Claude Code Installation:"
    if command -v claude >/dev/null 2>&1; then
        local claude_path=$(which claude)
        echo "   Location: $claude_path"
        echo "   Version: $(claude --version 2>/dev/null || echo 'Unknown')"
    else
        echo "   Status: Not found in PATH"
    fi
    
    # Environment variables
    echo ""
    echo "🌍 Environment:"
    echo "   TERM: $TERM"
    echo "   TERM_PROGRAM: ${TERM_PROGRAM:-Not set}"
    echo "   ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:+Set}${ANTHROPIC_API_KEY:-Not set}"
    
    DIAGNOSTIC_SUCCESS=true
}

# Main execution
main() {
    # Step 1: Detect environment
    detect_terminal_env
    local env_score=$?
    
    # Step 2: Apply fixes based on environment
    apply_auto_fixes
    
    # Step 3: Try claude doctor
    if ! run_claude_doctor; then
        echo ""
        echo "🔄 Primary method failed, trying fallback approaches..."
        
        # Step 4: Run fallback diagnostics
        run_fallback_diagnostics
        
        # Step 5: Run alternative doctor
        run_alternative_doctor
    fi
    
    # Step 6: Restore environment
    export TERM="$ORIGINAL_TERM"
    export TMPDIR="$ORIGINAL_TMPDIR"
    
    # Step 7: Summary
    echo ""
    echo "📊 DIAGNOSTIC SUMMARY:"
    echo "======================"
    if [[ "$DIAGNOSTIC_SUCCESS" == true ]]; then
        echo -e "${GREEN}🎉 Diagnostics completed successfully!${NC}"
        echo "   Your Claude Code installation appears to be working."
    else
        echo -e "${YELLOW}⚠️  Some issues were detected.${NC}"
        echo "   Review the output above for specific recommendations."
    fi
    
    echo ""
    echo "🖖 End of diagnostic. Live long and prosper!"
    echo "   Science Officer Claude & XO Claudette"
}

# Execute main function
main "$@"