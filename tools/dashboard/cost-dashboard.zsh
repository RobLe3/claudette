#!/bin/zsh

# Claude Cost Dashboard - Real-time cost monitoring
# Run this script to monitor your Claude Code costs

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${(%):-%x}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TRACKER_SCRIPT="$PROJECT_ROOT/scripts/cost-tracking/claude-cost-tracker.py"

# Check if tracker exists
if [[ ! -f "$TRACKER_SCRIPT" ]]; then
    echo -e "${RED}❌ Error: claude-cost-tracker.py not found at $TRACKER_SCRIPT${NC}"
    echo -e "${YELLOW}Current directory: $(pwd)${NC}"
    echo -e "${YELLOW}Script directory: $SCRIPT_DIR${NC}"
    exit 1
fi

# Function to display header with integrated status bar
show_header() {
    clear
    
    # Get terminal width for status bar positioning
    TERM_WIDTH=$(tput cols)
    
    # Get current session and billing costs in EUR using fast mode
    SESSION_COST_EUR=$(python3 "$TRACKER_SCRIPT" --action status --fast-mode 2>/dev/null | grep "Session Cost:" | awk '{print $3}')
    BILLING_COST_EUR=$(python3 "$TRACKER_SCRIPT" --action status --fast-mode 2>/dev/null | grep "Billing Period" | awk '{print $NF}')
    
    # Create status bar lines
    SESSION_LINE="Session Cost: ${SESSION_COST_EUR:-0.0000€}"
    BILLING_LINE="Billing Period: ${BILLING_COST_EUR:-0.00€}"
    
    # Calculate padding for right alignment
    SESSION_PAD=$((TERM_WIDTH - ${#SESSION_LINE}))
    BILLING_PAD=$((TERM_WIDTH - ${#BILLING_LINE}))
    
    # Display right-aligned status bar
    printf "%*s\n" $TERM_WIDTH "$SESSION_LINE"
    printf "%*s\n" $TERM_WIDTH "$BILLING_LINE"
    echo
    
    # Display main header
    echo -e "${PURPLE}💰 Claude Code Cost Dashboard${NC}"
    echo -e "${BLUE}================================${NC}"
    echo -e "${YELLOW}Last updated: $(date)${NC}"
    echo
}

# Function to show menu
show_menu() {
    echo -e "${CYAN}📊 Dashboard Options:${NC}"
    echo -e "${YELLOW}1)${NC} Show current costs"
    echo -e "${YELLOW}2)${NC} Show status bar only"
    echo -e "${YELLOW}3)${NC} Show historical analysis (7 days)"
    echo -e "${YELLOW}4)${NC} Live monitoring (refresh every 10s)"
    echo -e "${YELLOW}5)${NC} Export usage data to CSV"
    echo -e "${YELLOW}6)${NC} Sync with Anthropic API"
    echo -e "${YELLOW}7)${NC} End current session"
    echo -e "${YELLOW}8)${NC} Install external monitor (claude-monitor)"
    echo -e "${YELLOW}9)${NC} Exit"
    echo
}

# Function to install external monitor
install_monitor() {
    echo -e "${GREEN}📦 Installing claude-monitor...${NC}"
    
    # Check if uv is available
    if command -v uv &> /dev/null; then
        echo -e "${GREEN}Using uv to install claude-monitor...${NC}"
        uv tool install claude-monitor
    elif command -v pip &> /dev/null; then
        echo -e "${GREEN}Using pip to install claude-monitor...${NC}"
        pip install claude-monitor
    else
        echo -e "${RED}❌ Error: Neither uv nor pip found${NC}"
        return 1
    fi
    
    if command -v claude-monitor &> /dev/null; then
        echo -e "${GREEN}✅ claude-monitor installed successfully!${NC}"
        echo -e "${YELLOW}You can now run: claude-monitor --plan pro${NC}"
    else
        echo -e "${RED}❌ Installation failed${NC}"
    fi
}

# Function to handle user input
handle_choice() {
    case $1 in
        1)
            echo -e "${GREEN}📊 Current Cost Summary:${NC}"
            echo
            python3 "$TRACKER_SCRIPT" --action summary
            ;;
        2)
            echo -e "${GREEN}📊 Status Bar Only:${NC}"
            echo
            python3 "$TRACKER_SCRIPT" --action status
            ;;
        3)
            echo -e "${GREEN}📈 Historical Analysis (7 days):${NC}"
            echo
            python3 "$TRACKER_SCRIPT" --action history --days 7
            ;;
        4)
            echo -e "${GREEN}🔄 Starting live monitoring (Press Ctrl+C to stop)...${NC}"
            echo
            while true; do
                show_header
                echo -e "${GREEN}🔄 Live Monitoring Mode${NC}"
                echo
                python3 "$TRACKER_SCRIPT" --action status
                echo
                echo -e "${YELLOW}Next update in 10 seconds... (Press Ctrl+C to stop)${NC}"
                sleep 10
            done
            ;;
        5)
            echo -e "${GREEN}💾 Exporting usage data to CSV...${NC}"
            python3 "$TRACKER_SCRIPT" --action export
            ;;
        6)
            echo -e "${GREEN}🔗 Syncing with Anthropic API...${NC}"
            python3 "$TRACKER_SCRIPT" --action sync
            ;;
        7)
            echo -e "${GREEN}🔚 Ending current session...${NC}"
            python3 "$TRACKER_SCRIPT" --action end
            ;;
        8)
            install_monitor
            ;;
        9)
            echo -e "${GREEN}👋 Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Invalid choice. Please try again.${NC}"
            ;;
    esac
}

# Main loop
while true; do
    show_header
    show_menu
    echo -e "${CYAN}Please select an option (1-9):${NC}"
    read -r choice
    echo
    
    handle_choice "$choice"
    
    echo
    echo -e "${BLUE}================================${NC}"
    echo -e "${YELLOW}Press Enter to continue...${NC}"
    read -r
done