#!/bin/bash
# Claude Code Terminal Compatibility Diagnostic Script
# Science Officer Claude & XO Claudette - Stardate 2025.08.06

echo "🖖 Claude Code Terminal Diagnostics - Engage!"
echo "=============================================="
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check TTY status
echo "🔍 TTY Status Check:"
if [ -t 0 ]; then
    echo -e "${GREEN}✅ TTY Available: stdin is connected to terminal${NC}"
    TTY_STATUS="good"
else
    echo -e "${RED}❌ TTY Not Available: stdin is not connected to terminal${NC}"
    TTY_STATUS="bad"
fi

# Check terminal type
echo ""
echo "📺 Terminal Environment:"
echo "TERM: $TERM"
echo "SHELL: $SHELL"
echo "Terminal Program: $TERM_PROGRAM"
echo "Terminal Version: $TERM_PROGRAM_VERSION"

# Evaluate terminal compatibility
TERMINAL_SCORE=0
echo ""
echo "🧪 Compatibility Analysis:"

# Check TERM variable
if [[ "$TERM" == "xterm"* ]] || [[ "$TERM" == "screen"* ]]; then
    echo -e "${GREEN}✅ TERM variable compatible: $TERM${NC}"
    ((TERMINAL_SCORE++))
else
    echo -e "${YELLOW}⚠️  TERM variable potentially problematic: $TERM${NC}"
fi

# Check if we're in iTerm2
if [[ "$TERM_PROGRAM" == "iTerm.app" ]]; then
    echo -e "${GREEN}✅ Running in iTerm2 (excellent compatibility)${NC}"
    ((TERMINAL_SCORE++))
elif [[ "$TERM_PROGRAM" == "Apple_Terminal" ]]; then
    echo -e "${YELLOW}⚠️  Running in Terminal.app (may have issues)${NC}"
else
    echo -e "${BLUE}ℹ️  Running in: ${TERM_PROGRAM:-Unknown terminal}${NC}"
fi

# Check for tmux/screen
if [[ -n "$TMUX" ]]; then
    echo -e "${BLUE}ℹ️  Running inside tmux${NC}"
elif [[ -n "$STY" ]]; then
    echo -e "${BLUE}ℹ️  Running inside GNU screen${NC}"
fi

# Test Claude Code availability
echo ""
echo "🚀 Claude Code Status:"
if command_exists claude; then
    CLAUDE_VERSION=$(claude --version 2>/dev/null || echo "Version check failed")
    echo -e "${GREEN}✅ Claude Code installed: $CLAUDE_VERSION${NC}"
    
    # Test basic commands
    echo ""
    echo "🔧 Testing Claude Code Commands:"
    
    if claude --help >/dev/null 2>&1; then
        echo -e "${GREEN}✅ claude --help: Working${NC}"
    else
        echo -e "${RED}❌ claude --help: Failed${NC}"
    fi
    
    if claude --version >/dev/null 2>&1; then
        echo -e "${GREEN}✅ claude --version: Working${NC}"
    else
        echo -e "${RED}❌ claude --version: Failed${NC}"
    fi
    
else
    echo -e "${RED}❌ Claude Code not found in PATH${NC}"
fi

# Generate recommendations
echo ""
echo "📋 RECOMMENDATIONS:"
echo "==================="

if [[ "$TTY_STATUS" == "bad" ]]; then
    echo -e "${RED}🚨 CRITICAL: No TTY support detected${NC}"
    echo "   • Run this script in an interactive terminal"
    echo "   • Avoid running in non-interactive shells or scripts"
fi

if [[ "$TERM" != "xterm"* ]] && [[ "$TERM" != "screen"* ]]; then
    echo -e "${YELLOW}⚠️  Consider setting TERM variable:${NC}"
    echo "   export TERM=xterm-256color"
fi

if [[ "$TERM_PROGRAM" == "Apple_Terminal" ]]; then
    echo -e "${YELLOW}💡 Terminal.app Compatibility Issues:${NC}"
    echo "   • Install iTerm2: brew install --cask iterm2"
    echo "   • Or use: export TERM=xterm-256color"
fi

echo ""
echo "🛠️  QUICK FIXES TO TRY:"
echo "   1. export TERM=xterm-256color"
echo "   2. Try claude --help or claude --version instead of claude doctor"
echo "   3. Use iTerm2 instead of Terminal.app"
echo "   4. Run: bash --login -i (ensure interactive mode)"

# Test recommended fix
echo ""
echo "🧪 Testing Recommended TERM Setting:"
ORIGINAL_TERM="$TERM"
export TERM=xterm-256color
echo "Set TERM to: $TERM"

# Calculate overall compatibility score
TOTAL_SCORE=$((TERMINAL_SCORE + (TTY_STATUS == "good" ? 1 : 0)))
echo ""
echo "📊 COMPATIBILITY SCORE: $TOTAL_SCORE/3"

if [[ $TOTAL_SCORE -ge 2 ]]; then
    echo -e "${GREEN}🎉 Your environment should work well with Claude Code!${NC}"
elif [[ $TOTAL_SCORE -eq 1 ]]; then
    echo -e "${YELLOW}⚠️  Your environment may have some compatibility issues.${NC}"
else
    echo -e "${RED}🚨 Your environment likely has significant compatibility issues.${NC}"
fi

# Restore original TERM
export TERM="$ORIGINAL_TERM"

echo ""
echo "🖖 Live long and prosper! Diagnostics complete."
echo "   Science Officer Claude & XO Claudette"