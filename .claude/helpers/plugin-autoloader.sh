#!/bin/bash
#
# Claude Flow Plugin Autoloader
# Automatically discovers, validates, and loads plugins for Claude Code
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
CLAUDE_DIR="${HOME}/.claude"
PROJECT_CLAUDE_DIR=".claude"
SETTINGS_FILE="${CLAUDE_DIR}/settings.json"
PROJECT_SETTINGS_FILE="${PROJECT_CLAUDE_DIR}/settings.json"
BACKUP_DIR="${CLAUDE_DIR}/backups"
LOG_FILE="${CLAUDE_DIR}/plugin-autoloader.log"

# Ensure directories exist
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Print functions
print_header() {
    echo -e "${PURPLE}🔌 Claude Flow Plugin Autoloader${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    log "SUCCESS: $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    log "WARNING: $1"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    log "ERROR: $1"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
    log "INFO: $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Validate MCP server
validate_mcp_server() {
    local server_name="$1"
    local server_command="$2"
    
    print_info "Validating MCP server: $server_name"
    
    # Check if command exists
    if ! command_exists "$(echo "$server_command" | cut -d' ' -f1)"; then
        print_warning "Command not found: $(echo "$server_command" | cut -d' ' -f1)"
        return 1
    fi
    
    # Try to get version/help
    if eval "$server_command --version" >/dev/null 2>&1 || eval "$server_command --help" >/dev/null 2>&1; then
        print_success "MCP server '$server_name' is valid"
        return 0
    else
        print_warning "MCP server '$server_name' may have issues"
        return 1
    fi
}

# Discover plugins
discover_plugins() {
    print_info "Discovering available plugins..."
    
    local discovered_plugins=()
    
    # Check for Claude Flow
    if command_exists "npx"; then
        if npx claude-flow@alpha --version >/dev/null 2>&1; then
            discovered_plugins+=("claude-flow:npx claude-flow@alpha mcp start")
            print_success "Found: claude-flow"
        fi
        
        if npx ruv-swarm@latest --version >/dev/null 2>&1; then
            discovered_plugins+=("ruv-swarm:npx ruv-swarm@latest mcp start")
            print_success "Found: ruv-swarm"
        fi
    fi
    
    # Check for local plugins
    if [[ -d "plugins" ]]; then
        for plugin_dir in plugins/*/; do
            if [[ -f "$plugin_dir/mcp-server.js" ]] || [[ -f "$plugin_dir/mcp-server.py" ]]; then
                plugin_name=$(basename "$plugin_dir")
                discovered_plugins+=("$plugin_name:node $plugin_dir/mcp-server.js")
                print_success "Found local plugin: $plugin_name"
            fi
        done
    fi
    
    printf '%s\n' "${discovered_plugins[@]}"
}

# Backup current settings
backup_settings() {
    local backup_file="$BACKUP_DIR/settings_$(date +%Y%m%d_%H%M%S).json"
    
    if [[ -f "$SETTINGS_FILE" ]]; then
        cp "$SETTINGS_FILE" "$backup_file"
        print_success "Settings backed up to: $backup_file"
    fi
    
    if [[ -f "$PROJECT_SETTINGS_FILE" ]]; then
        cp "$PROJECT_SETTINGS_FILE" "${backup_file%.json}_project.json"
        print_success "Project settings backed up"
    fi
}

# Update MCP servers in settings
update_mcp_servers() {
    local plugins=("$@")
    local settings_file="$1"
    shift
    
    # Create settings if not exists
    if [[ ! -f "$settings_file" ]]; then
        echo '{"enabledMcpjsonServers": []}' > "$settings_file"
    fi
    
    # Backup current settings
    backup_settings
    
    # Build new MCP servers array
    local mcp_servers=()
    local mcp_commands=()
    
    for plugin in "${plugins[@]}"; do
        IFS=':' read -r name command <<< "$plugin"
        if validate_mcp_server "$name" "$command"; then
            mcp_servers+=("\"$name\"")
            # Store command mapping for claude mcp add
            echo "$name: $command" >> "${CLAUDE_DIR}/mcp_commands.txt"
        fi
    done
    
    # Update settings.json
    local servers_json=$(printf '%s,' "${mcp_servers[@]}" | sed 's/,$//')
    
    # Use jq if available, otherwise manual update
    if command_exists "jq"; then
        jq ".enabledMcpjsonServers = [$servers_json]" "$settings_file" > "${settings_file}.tmp" && mv "${settings_file}.tmp" "$settings_file"
        print_success "Updated MCP servers using jq"
    else
        # Manual JSON update (basic)
        sed -i.bak "s/\"enabledMcpjsonServers\":\s*\[[^]]*\]/\"enabledMcpjsonServers\": [$servers_json]/" "$settings_file"
        print_success "Updated MCP servers manually"
    fi
}

# Add MCP servers to Claude Code
add_mcp_servers() {
    local plugins=("$@")
    
    print_info "Adding MCP servers to Claude Code..."
    
    for plugin in "${plugins[@]}"; do
        IFS=':' read -r name command <<< "$plugin"
        
        # Check if already added
        if claude mcp list 2>/dev/null | grep -q "$name:"; then
            print_info "MCP server '$name' already configured"
            continue
        fi
        
        # Add MCP server
        if claude mcp add "$name" $command; then
            print_success "Added MCP server: $name"
        else
            print_error "Failed to add MCP server: $name"
        fi
    done
}

# Health check
health_check() {
    print_info "Performing health check..."
    
    # Check Claude Code
    if ! command_exists "claude"; then
        print_error "Claude Code CLI not found"
        return 1
    fi
    
    # Check MCP servers
    local mcp_list
    if mcp_list=$(claude mcp list 2>/dev/null); then
        print_success "Claude Code MCP integration working"
        echo "$mcp_list"
    else
        print_warning "Could not list MCP servers"
    fi
    
    # Check plugin functionality
    if command_exists "npx"; then
        if npx claude-flow@alpha --version >/dev/null 2>&1; then
            print_success "Claude Flow plugin functional"
        else
            print_warning "Claude Flow plugin may have issues"
        fi
    fi
}

# Main autoloader function
autoload_plugins() {
    print_header
    
    # Discover plugins
    local plugins
    mapfile -t plugins < <(discover_plugins)
    
    if [[ ${#plugins[@]} -eq 0 ]]; then
        print_warning "No plugins discovered"
        return 1
    fi
    
    print_info "Found ${#plugins[@]} plugin(s)"
    
    # Add MCP servers to Claude Code
    add_mcp_servers "${plugins[@]}"
    
    # Update settings files
    if [[ -f "$PROJECT_SETTINGS_FILE" ]]; then
        update_mcp_servers "$PROJECT_SETTINGS_FILE" "${plugins[@]}"
    fi
    
    # Health check
    health_check
    
    print_success "Plugin autoloading complete!"
}

# Command line interface
case "${1:-autoload}" in
    "autoload"|"load")
        autoload_plugins
        ;;
    "discover")
        discover_plugins
        ;;
    "health"|"check")
        health_check
        ;;
    "backup")
        backup_settings
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  autoload    Automatically discover and load plugins (default)"
        echo "  discover    Discover available plugins"
        echo "  health      Perform health check"
        echo "  backup      Backup current settings"
        echo "  help        Show this help"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac