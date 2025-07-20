#!/bin/bash
"""
Project Automation Control Script
Manages the project automation daemon and integration
"""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DAEMON_SCRIPT="$SCRIPT_DIR/project_automation_daemon.py"
PID_FILE="$HOME/.claude/automation_daemon.pid"
LOG_FILE="$HOME/.claude/automation_daemon.log"
CONFIG_FILE="$HOME/.claude/automation_config.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Emojis for better UX
ROBOT="🤖"
CHECK="✅"
CROSS="❌"
WARNING="⚠️"
INFO="📊"

function show_status() {
    echo -e "${BLUE}${INFO} Project Automation System Status${NC}"
    echo "=================================="
    
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            echo -e "${GREEN}${CHECK} Daemon Status: RUNNING (PID: $PID)${NC}"
        else
            echo -e "${RED}${CROSS} Daemon Status: STOPPED (stale PID file)${NC}"
            rm -f "$PID_FILE"
        fi
    else
        echo -e "${RED}${CROSS} Daemon Status: STOPPED${NC}"
    fi
    
    # Check configuration
    if [ -f "$CONFIG_FILE" ]; then
        echo -e "${GREEN}${CHECK} Configuration: Found${NC}"
    else
        echo -e "${YELLOW}${WARNING} Configuration: Using defaults${NC}"
    fi
    
    # Check recent activity
    ACTIVITY_FILE="$HOME/.claude/automation_activity.log"
    if [ -f "$ACTIVITY_FILE" ]; then
        LAST_ACTIVITY=$(tail -1 "$ACTIVITY_FILE" 2>/dev/null | jq -r '.timestamp' 2>/dev/null || echo "unknown")
        echo -e "${INFO} Last Activity: $LAST_ACTIVITY"
    fi
    
    # Check database
    DB_FILE="$HOME/.claude/project_automation.db"
    if [ -f "$DB_FILE" ]; then
        echo -e "${GREEN}${CHECK} Database: Initialized${NC}"
    else
        echo -e "${YELLOW}${WARNING} Database: Not initialized${NC}"
    fi
}

function start_daemon() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            echo -e "${YELLOW}${WARNING} Daemon already running (PID: $PID)${NC}"
            return 1
        else
            rm -f "$PID_FILE"
        fi
    fi
    
    echo -e "${ROBOT} Starting Project Automation Daemon..."
    
    # Ensure directories exist
    mkdir -p "$(dirname "$PID_FILE")"
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Start daemon in background
    nohup python3 "$DAEMON_SCRIPT" > "$LOG_FILE" 2>&1 &
    DAEMON_PID=$!
    
    # Save PID
    echo $DAEMON_PID > "$PID_FILE"
    
    # Give it a moment to start
    sleep 2
    
    # Check if it's running
    if ps -p $DAEMON_PID > /dev/null 2>&1; then
        echo -e "${GREEN}${CHECK} Daemon started successfully (PID: $DAEMON_PID)${NC}"
        echo -e "${INFO} Log file: $LOG_FILE"
        return 0
    else
        echo -e "${RED}${CROSS} Failed to start daemon${NC}"
        echo -e "${INFO} Check log file: $LOG_FILE"
        rm -f "$PID_FILE"
        return 1
    fi
}

function stop_daemon() {
    if [ ! -f "$PID_FILE" ]; then
        echo -e "${YELLOW}${WARNING} Daemon not running${NC}"
        return 1
    fi
    
    PID=$(cat "$PID_FILE")
    
    if ps -p $PID > /dev/null 2>&1; then
        echo -e "${ROBOT} Stopping Project Automation Daemon (PID: $PID)..."
        kill $PID
        
        # Wait for graceful shutdown
        for i in {1..10}; do
            if ! ps -p $PID > /dev/null 2>&1; then
                break
            fi
            sleep 1
        done
        
        # Force kill if still running
        if ps -p $PID > /dev/null 2>&1; then
            echo -e "${WARNING} Force killing daemon..."
            kill -9 $PID
        fi
        
        rm -f "$PID_FILE"
        echo -e "${GREEN}${CHECK} Daemon stopped${NC}"
    else
        echo -e "${YELLOW}${WARNING} Daemon not running (removing stale PID file)${NC}"
        rm -f "$PID_FILE"
    fi
}

function restart_daemon() {
    echo -e "${ROBOT} Restarting Project Automation Daemon..."
    stop_daemon
    sleep 2
    start_daemon
}

function show_logs() {
    if [ -f "$LOG_FILE" ]; then
        echo -e "${INFO} Recent daemon logs:"
        echo "===================="
        tail -20 "$LOG_FILE"
    else
        echo -e "${YELLOW}${WARNING} No log file found${NC}"
    fi
}

function create_default_config() {
    if [ -f "$CONFIG_FILE" ]; then
        echo -e "${YELLOW}${WARNING} Configuration already exists: $CONFIG_FILE${NC}"
        return 1
    fi
    
    echo -e "${ROBOT} Creating default configuration..."
    
    cat > "$CONFIG_FILE" << 'EOF'
{
  "enabled": true,
  "intervals": {
    "state_update": 300,
    "diary_generation": 1800,
    "lesson_extraction": 3600,
    "project_detection": 60
  },
  "detection_thresholds": {
    "new_project_file_count": 5,
    "new_project_operation_count": 20,
    "context_switch_confidence": 0.8
  },
  "diary_generation": {
    "min_activity_for_entry": 3,
    "include_technical_details": true,
    "include_cost_metrics": true,
    "include_lesson_extraction": true
  },
  "user_style": {
    "currency": "EUR",
    "emoji_headers": true,
    "technical_depth": "detailed",
    "metrics_focus": true
  }
}
EOF
    
    echo -e "${GREEN}${CHECK} Configuration created: $CONFIG_FILE${NC}"
}

function setup_claude_hooks() {
    CLAUDE_SETTINGS="$HOME/.claude/settings.json"
    HOOK_SCRIPT="$SCRIPT_DIR/claude_hook_integration.py"
    
    echo -e "${ROBOT} Setting up Claude Code hooks..."
    
    if [ ! -f "$CLAUDE_SETTINGS" ]; then
        echo -e "${YELLOW}${WARNING} Claude settings not found, creating basic configuration${NC}"
        mkdir -p "$(dirname "$CLAUDE_SETTINGS")"
        echo '{}' > "$CLAUDE_SETTINGS"
    fi
    
    # Create backup
    cp "$CLAUDE_SETTINGS" "$CLAUDE_SETTINGS.backup.$(date +%s)"
    
    # Add hooks configuration
    python3 -c "
import json
import sys

settings_file = '$CLAUDE_SETTINGS'
hook_script = '$HOOK_SCRIPT'

try:
    with open(settings_file, 'r') as f:
        settings = json.load(f)
except:
    settings = {}

# Add automation hooks
if 'hooks' not in settings:
    settings['hooks'] = {}

settings['hooks'].update({
    'post-tool': f'python3 {hook_script} post-tool',
    'pre-tool': f'python3 {hook_script} pre-tool'
})

# Add automation config
settings['automation'] = {
    'enabled': True,
    'project_tracking': True,
    'auto_diary': True
}

with open(settings_file, 'w') as f:
    json.dump(settings, f, indent=2)

print('✅ Claude hooks configured successfully')
"
    
    echo -e "${GREEN}${CHECK} Claude Code hooks configured${NC}"
    echo -e "${INFO} Backup saved: $CLAUDE_SETTINGS.backup.*"
}

function show_help() {
    echo -e "${BLUE}Project Automation Control${NC}"
    echo "=========================="
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start      Start the automation daemon"
    echo "  stop       Stop the automation daemon"
    echo "  restart    Restart the automation daemon"
    echo "  status     Show current status"
    echo "  logs       Show recent daemon logs"
    echo "  config     Create default configuration"
    echo "  setup      Setup Claude Code hooks"
    echo "  help       Show this help message"
    echo ""
    echo "Files:"
    echo "  Config:    $CONFIG_FILE"
    echo "  PID:       $PID_FILE"
    echo "  Logs:      $LOG_FILE"
    echo "  Database:  $HOME/.claude/project_automation.db"
}

# Main command handling
case "${1:-help}" in
    "start")
        start_daemon
        ;;
    "stop")
        stop_daemon
        ;;
    "restart")
        restart_daemon
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "config")
        create_default_config
        ;;
    "setup")
        setup_claude_hooks
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    *)
        echo -e "${RED}${CROSS} Unknown command: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac