#!/bin/bash
"""
Claude Code Integration Setup
Sets up the complete integration between Claude Code and our developed tools
"""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
CLAUDE_SETTINGS="$PROJECT_DIR/.claude/settings.json"
GLOBAL_CLAUDE_SETTINGS="$HOME/.claude/settings.json"

# Colors and emojis
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

SUCCESS="✅"
WARNING="⚠️"
ERROR="❌"
INFO="📊"
ROCKET="🚀"

echo -e "${BLUE}${ROCKET} Claude Code Integration Setup${NC}"
echo "======================================"

# Function to backup existing settings
backup_settings() {
    local settings_file="$1"
    if [ -f "$settings_file" ]; then
        local backup_file="${settings_file}.backup.$(date +%s)"
        cp "$settings_file" "$backup_file"
        echo -e "${SUCCESS} Backed up existing settings to: $backup_file"
    fi
}

# Function to merge settings
merge_settings() {
    local source_file="$1"
    local target_file="$2"
    
    echo -e "${INFO} Merging settings: $source_file -> $target_file"
    
    # Create target directory if it doesn't exist
    mkdir -p "$(dirname "$target_file")"
    
    # If target doesn't exist, copy source
    if [ ! -f "$target_file" ]; then
        cp "$source_file" "$target_file"
        echo -e "${SUCCESS} Created new settings file"
        return
    fi
    
    # Backup existing settings
    backup_settings "$target_file"
    
    # Merge using Python
    python3 << EOF
import json
import sys

try:
    # Load source settings
    with open('$source_file', 'r') as f:
        source = json.load(f)
    
    # Load target settings
    with open('$target_file', 'r') as f:
        target = json.load(f)
    
    # Merge source into target
    def merge_dicts(target_dict, source_dict):
        for key, value in source_dict.items():
            if key in target_dict and isinstance(target_dict[key], dict) and isinstance(value, dict):
                merge_dicts(target_dict[key], value)
            else:
                target_dict[key] = value
    
    merge_dicts(target, source)
    
    # Save merged settings
    with open('$target_file', 'w') as f:
        json.dump(target, f, indent=2)
    
    print("${SUCCESS} Settings merged successfully")
    
except Exception as e:
    print(f"${ERROR} Error merging settings: {e}")
    sys.exit(1)
EOF
}

# Function to setup automation daemon
setup_automation_daemon() {
    echo -e "\n${INFO} Setting up automation daemon..."
    
    # Make scripts executable
    chmod +x "$SCRIPT_DIR/automation_control.sh"
    chmod +x "$SCRIPT_DIR/claude_hook_integration.py"
    chmod +x "$SCRIPT_DIR/claude_status_integration.py"
    chmod +x "$SCRIPT_DIR/claude_reminder_system.py"
    
    # Create default automation config
    "$SCRIPT_DIR/automation_control.sh" config
    
    echo -e "${SUCCESS} Automation daemon configured"
}

# Function to test integration
test_integration() {
    echo -e "\n${INFO} Testing integration..."
    
    # Test status system
    echo -e "${INFO} Testing status system..."
    python3 "$SCRIPT_DIR/claude_status_integration.py" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${SUCCESS} Status system working"
    else
        echo -e "${ERROR} Status system failed"
    fi
    
    # Test reminder system
    echo -e "${INFO} Testing reminder system..."
    python3 "$SCRIPT_DIR/claude_reminder_system.py" test > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${SUCCESS} Reminder system working"
    else
        echo -e "${WARNING} Reminder system needs configuration"
    fi
    
    # Test automation daemon
    echo -e "${INFO} Testing automation daemon..."
    "$SCRIPT_DIR/automation_control.sh" status > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${SUCCESS} Automation daemon ready"
    else
        echo -e "${WARNING} Automation daemon not running (can be started later)"
    fi
}

# Function to create helper commands
create_helper_commands() {
    echo -e "\n${INFO} Creating helper commands..."
    
    # Create status command
    cat > "$PROJECT_DIR/status" << 'EOF'
#!/bin/bash
python3 /Users/roble/Documents/Python/claude_flow/scripts/automation/claude_reminder_system.py status
EOF
    chmod +x "$PROJECT_DIR/status"
    
    # Create automation command
    cat > "$PROJECT_DIR/automation" << 'EOF'
#!/bin/bash
/Users/roble/Documents/Python/claude_flow/scripts/automation/automation_control.sh "$@"
EOF
    chmod +x "$PROJECT_DIR/automation"
    
    # Create cost command
    cat > "$PROJECT_DIR/cost" << 'EOF'
#!/bin/bash
python3 /Users/roble/Documents/Python/claude_flow/scripts/cost-tracking/claude-cost-tracker.py --action summary
EOF
    chmod +x "$PROJECT_DIR/cost"
    
    echo -e "${SUCCESS} Helper commands created:"
    echo -e "  - ${PROJECT_DIR}/status     # Show current status"
    echo -e "  - ${PROJECT_DIR}/automation # Control automation daemon"
    echo -e "  - ${PROJECT_DIR}/cost       # Show cost summary"
}

# Main setup process
main() {
    echo -e "${INFO} Starting Claude Code integration setup...\n"
    
    # Step 1: Setup project-local Claude settings
    echo -e "${INFO} Step 1: Configuring Claude Code settings..."
    if [ -f "$CLAUDE_SETTINGS" ]; then
        echo -e "${SUCCESS} Project Claude settings found"
    else
        echo -e "${WARNING} No project Claude settings found, will create"
    fi
    
    # Step 2: Merge with global settings if needed
    echo -e "\n${INFO} Step 2: Checking global Claude settings..."
    if [ -f "$GLOBAL_CLAUDE_SETTINGS" ]; then
        echo -e "${SUCCESS} Global Claude settings found"
        
        # Ask user if they want to merge
        read -p "Merge project settings with global settings? (y/n): " merge_choice
        if [[ $merge_choice =~ ^[Yy]$ ]]; then
            merge_settings "$CLAUDE_SETTINGS" "$GLOBAL_CLAUDE_SETTINGS"
        fi
    else
        echo -e "${WARNING} No global Claude settings found"
    fi
    
    # Step 3: Setup automation
    setup_automation_daemon
    
    # Step 4: Create helper commands
    create_helper_commands
    
    # Step 5: Test everything
    test_integration
    
    # Step 6: Show next steps
    echo -e "\n${ROCKET} Setup Complete!"
    echo "==================="
    echo -e "${SUCCESS} Claude Code integration is now configured"
    echo ""
    echo -e "${INFO} Next steps:"
    echo "1. Start automation daemon: ./automation start"
    echo "2. Check status: ./status"
    echo "3. View costs: ./cost"
    echo "4. Configure reminders: python3 scripts/automation/claude_reminder_system.py configure"
    echo ""
    echo -e "${INFO} The system will now provide:"
    echo "- 📊 Regular status updates with token usage and project maturity"
    echo "- ⚠️  Token usage warnings when approaching limits"
    echo "- 💡 Development suggestions based on project analysis"
    echo "- 🔄 Automatic project state tracking and diary generation"
    echo ""
    echo -e "${SUCCESS} Happy coding with enhanced Claude Code! 🚀"
}

# Check if running as main script
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi