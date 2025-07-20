#!/bin/zsh

# Claude-Flow Startup Script
# Created for local development environment

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${PURPLE}🌊 Claude-Flow Startup Script${NC}"
echo -e "${BLUE}======================================${NC}"

# Check if we're in the right directory
if [[ ! -f "$SCRIPT_DIR/claude-flow.config.json" ]]; then
    echo -e "${RED}❌ Error: claude-flow.config.json not found in current directory${NC}"
    echo -e "${YELLOW}Please run this script from your Claude-Flow project directory${NC}"
    exit 1
fi

# Check if Claude Code is installed
if ! command -v claude &> /dev/null; then
    echo -e "${RED}❌ Error: Claude Code not found${NC}"
    echo -e "${YELLOW}Please install Claude Code first: npm install -g @anthropic-ai/claude-code${NC}"
    exit 1
fi

# Check if we have npx
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ Error: npx not found${NC}"
    echo -e "${YELLOW}Please install Node.js and npm${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"
echo

# Function to show menu
show_menu() {
    echo -e "${CYAN}🐝 Claude-Flow Quick Start Menu:${NC}"
    echo -e "${YELLOW}1)${NC} Hive-Mind Wizard (Recommended for new users)"
    echo -e "${YELLOW}2)${NC} Quick Swarm - Build REST API"
    echo -e "${YELLOW}3)${NC} Quick Swarm - Custom objective"
    echo -e "${YELLOW}4)${NC} Start with UI and Swarm"
    echo -e "${YELLOW}5)${NC} Check system status"
    echo -e "${YELLOW}6)${NC} Show help"
    echo -e "${YELLOW}7)${NC} Exit"
    echo
}

# Function to handle user input
handle_choice() {
    case $1 in
        1)
            echo -e "${GREEN}🎯 Starting Hive-Mind Wizard...${NC}"
            npx claude-flow@alpha hive-mind wizard
            ;;
        2)
            echo -e "${GREEN}🚀 Starting Quick Swarm for REST API...${NC}"
            npx claude-flow@alpha swarm "build me a REST API with authentication and CRUD operations"
            ;;
        3)
            echo -e "${GREEN}💭 Enter your objective:${NC}"
            read -r objective
            if [[ -n "$objective" ]]; then
                echo -e "${GREEN}🚀 Starting Swarm for: $objective${NC}"
                npx claude-flow@alpha swarm "$objective"
            else
                echo -e "${RED}❌ No objective provided${NC}"
            fi
            ;;
        4)
            echo -e "${GREEN}🖥️ Starting Claude-Flow with UI and Swarm...${NC}"
            npx claude-flow@alpha start --ui --swarm
            ;;
        5)
            echo -e "${GREEN}📊 Checking system status...${NC}"
            npx claude-flow@alpha status
            echo
            echo -e "${GREEN}🐝 Hive-Mind status:${NC}"
            npx claude-flow@alpha hive-mind status
            ;;
        6)
            echo -e "${GREEN}📖 Claude-Flow Help:${NC}"
            npx claude-flow@alpha --help
            ;;
        7)
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
    show_menu
    echo -e "${CYAN}Please select an option (1-7):${NC}"
    read -r choice
    echo
    
    handle_choice "$choice"
    
    echo
    echo -e "${BLUE}======================================${NC}"
    echo -e "${YELLOW}Press Enter to continue...${NC}"
    read -r
    clear
done