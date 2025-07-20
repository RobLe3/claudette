#!/bin/zsh
# Claude Code Harmony Dashboard
# Interactive dashboard for viewing enhancement harmonization status

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
INVENTORY_SCRIPT="$PROJECT_DIR/scripts/automation/auto_inventory_system.py"
DB_FILE="$HOME/.claude/enhancement_inventory.db"

# Colors and emojis
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Emojis
HARMONY="🎵"
WARNING="⚠️"
ERROR="❌"
SUCCESS="✅"
INFO="📊"
ROCKET="🚀"
GEAR="⚙️"
CHART="📈"
ALERT="🚨"

# Helper functions
get_terminal_width() {
    tput cols 2>/dev/null || echo 80
}

center_text() {
    local text="$1"
    local width=$(get_terminal_width)
    local text_length=${#text}
    local padding=$(( (width - text_length) / 2 ))
    printf "%*s%s\n" $padding "" "$text"
}

draw_separator() {
    local width=$(get_terminal_width)
    printf "%*s\n" $width | tr ' ' '='
}

draw_line() {
    local width=$(get_terminal_width)
    printf "%*s\n" $width | tr ' ' '-'
}

# Database query functions
get_enhancement_count() {
    sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM enhancements WHERE status='active';" 2>/dev/null || echo "0"
}

get_harmony_score() {
    sqlite3 "$DB_FILE" "SELECT AVG(harmony_score) FROM enhancements WHERE status='active';" 2>/dev/null || echo "0"
}

get_splintering_alerts() {
    sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM splintering_alerts WHERE status='active';" 2>/dev/null || echo "0"
}

get_category_distribution() {
    sqlite3 "$DB_FILE" "SELECT category, COUNT(*) FROM enhancements WHERE status='active' GROUP BY category ORDER BY COUNT(*) DESC;" 2>/dev/null
}

get_recent_alerts() {
    sqlite3 "$DB_FILE" "SELECT alert_type, description, severity, created_date FROM splintering_alerts WHERE status='active' ORDER BY created_date DESC LIMIT 5;" 2>/dev/null
}

get_duplicate_functionality() {
    sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM harmony_relationships WHERE relationship_type='duplicate_functionality';" 2>/dev/null || echo "0"
}

get_last_scan_info() {
    sqlite3 "$DB_FILE" "SELECT scan_date, enhancements_found, splintering_alerts FROM inventory_scans ORDER BY scan_date DESC LIMIT 1;" 2>/dev/null
}

# Display functions
show_header() {
    clear
    echo -e "${BLUE}"
    draw_separator
    center_text "$HARMONY Claude Code Harmony Dashboard $HARMONY"
    draw_separator
    echo -e "${NC}"
    
    # Show status bar with key metrics
    local enhancement_count=$(get_enhancement_count)
    local harmony_score=$(get_harmony_score)
    local alerts_count=$(get_splintering_alerts)
    
    # Format harmony score
    if (( $(echo "$harmony_score > 0.8" | bc -l) )); then
        harmony_color="${GREEN}"
        harmony_emoji="${SUCCESS}"
    elif (( $(echo "$harmony_score > 0.6" | bc -l) )); then
        harmony_color="${YELLOW}"
        harmony_emoji="${WARNING}"
    else
        harmony_color="${RED}"
        harmony_emoji="${ERROR}"
    fi
    
    printf "${INFO} Enhancements: %d | ${harmony_color}%s Harmony: %.2f${NC} | " \
           "$enhancement_count" "$harmony_emoji" "$harmony_score"
    
    if [ "$alerts_count" -gt 0 ]; then
        printf "${RED}${ALERT} Alerts: %d${NC}\n" "$alerts_count"
    else
        printf "${GREEN}${SUCCESS} No Active Alerts${NC}\n"
    fi
    
    echo ""
}

show_overview() {
    echo -e "${CYAN}${CHART} Enhancement Overview${NC}"
    draw_line
    
    local enhancement_count=$(get_enhancement_count)
    local harmony_score=$(get_harmony_score)
    local alerts_count=$(get_splintering_alerts)
    local duplicates_count=$(get_duplicate_functionality)
    
    printf "%-30s %s\n" "Total Enhancements:" "$enhancement_count"
    printf "%-30s %.2f/1.00\n" "Overall Harmony Score:" "$harmony_score"
    printf "%-30s %s\n" "Active Splintering Alerts:" "$alerts_count"
    printf "%-30s %s\n" "Duplicate Functionality:" "$duplicates_count"
    
    # Last scan info
    local last_scan_info=$(get_last_scan_info)
    if [ -n "$last_scan_info" ]; then
        local scan_date=$(echo "$last_scan_info" | cut -d'|' -f1)
        local scan_enhancements=$(echo "$last_scan_info" | cut -d'|' -f2)
        local scan_alerts=$(echo "$last_scan_info" | cut -d'|' -f3)
        
        printf "%-30s %s\n" "Last Scan:" "$(date -d "$scan_date" '+%Y-%m-%d %H:%M' 2>/dev/null || echo "$scan_date")"
        printf "%-30s %s enhancements, %s alerts\n" "Last Scan Results:" "$scan_enhancements" "$scan_alerts"
    fi
    
    echo ""
}

show_category_distribution() {
    echo -e "${PURPLE}${GEAR} Enhancement Categories${NC}"
    draw_line
    
    local categories=$(get_category_distribution)
    
    if [ -n "$categories" ]; then
        echo "$categories" | while IFS='|' read -r category count; do
            # Create visual bar
            local bar_length=$((count * 3))
            local bar=$(printf "%*s" $bar_length | tr ' ' '█')
            
            printf "%-20s %2d ${GREEN}%s${NC}\n" "$category:" "$count" "$bar"
        done
    else
        echo "No enhancement data available."
    fi
    
    echo ""
}

show_splintering_alerts() {
    echo -e "${RED}${ALERT} Splintering Alerts${NC}"
    draw_line
    
    local alerts=$(get_recent_alerts)
    
    if [ -n "$alerts" ]; then
        echo "$alerts" | while IFS='|' read -r alert_type description severity created_date; do
            case "$severity" in
                "high")   severity_color="${RED}"; severity_emoji="${ALERT}" ;;
                "medium") severity_color="${YELLOW}"; severity_emoji="${WARNING}" ;;
                "low")    severity_color="${GREEN}"; severity_emoji="${INFO}" ;;
                *)        severity_color="${NC}"; severity_emoji="${INFO}" ;;
            esac
            
            printf "${severity_color}%s %s${NC}\n" "$severity_emoji" "$alert_type"
            printf "   %s\n" "$description"
            printf "   ${CYAN}Date: %s${NC}\n\n" "$(date -d "$created_date" '+%Y-%m-%d %H:%M' 2>/dev/null || echo "$created_date")"
        done
    else
        echo -e "${GREEN}${SUCCESS} No active splintering alerts!${NC}"
    fi
    
    echo ""
}

show_enhancement_details() {
    echo -e "${BLUE}${INFO} Enhancement Details${NC}"
    draw_line
    
    # Get detailed enhancement information
    local enhancements=$(sqlite3 "$DB_FILE" "SELECT name, category, file_path, harmony_score, last_modified FROM enhancements WHERE status='active' ORDER BY harmony_score ASC, last_modified DESC LIMIT 10;" 2>/dev/null)
    
    if [ -n "$enhancements" ]; then
        printf "%-25s %-15s %-8s %-30s\n" "Name" "Category" "Harmony" "Path"
        printf "%-25s %-15s %-8s %-30s\n" "----" "--------" "-------" "----"
        
        echo "$enhancements" | while IFS='|' read -r name category file_path harmony_score last_modified; do
            # Color code harmony score
            if (( $(echo "$harmony_score > 0.8" | bc -l) )); then
                harmony_color="${GREEN}"
            elif (( $(echo "$harmony_score > 0.6" | bc -l) )); then
                harmony_color="${YELLOW}"
            else
                harmony_color="${RED}"
            fi
            
            printf "%-25s %-15s ${harmony_color}%-8.2f${NC} %-30s\n" \
                   "${name:0:24}" "${category:0:14}" "$harmony_score" "${file_path:0:29}"
        done
    else
        echo "No enhancement data available."
    fi
    
    echo ""
}

show_integration_opportunities() {
    echo -e "${CYAN}${ROCKET} Integration Opportunities${NC}"
    draw_line
    
    # Check for common integration patterns
    local cost_monitoring=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM enhancements WHERE category IN ('cost_tracking', 'monitoring') AND status='active';" 2>/dev/null)
    local automation_project=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM enhancements WHERE category IN ('automation', 'project_management') AND status='active';" 2>/dev/null)
    local claude_monitoring=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM enhancements WHERE category IN ('claude_integration', 'monitoring') AND status='active';" 2>/dev/null)
    
    if [ "$cost_monitoring" -gt 1 ]; then
        echo -e "${ROCKET} Cost tracking + monitoring integration opportunity"
        echo "   Suggestion: Integrate cost metrics into monitoring dashboard"
        echo ""
    fi
    
    if [ "$automation_project" -gt 1 ]; then
        echo -e "${ROCKET} Automation + project management integration opportunity"
        echo "   Suggestion: Configure automation to update project state automatically"
        echo ""
    fi
    
    if [ "$claude_monitoring" -gt 1 ]; then
        echo -e "${ROCKET} Claude integration + monitoring opportunity"
        echo "   Suggestion: Feed Claude hook data into monitoring system"
        echo ""
    fi
    
    # Check for duplicate functionality
    local duplicates=$(get_duplicate_functionality)
    if [ "$duplicates" -gt 0 ]; then
        echo -e "${WARNING} Found $duplicates instances of duplicate functionality"
        echo "   Suggestion: Run consolidation analysis"
        echo ""
    fi
}

run_inventory_scan() {
    echo -e "${GEAR} Running inventory scan..."
    echo ""
    
    if [ -f "$INVENTORY_SCRIPT" ]; then
        python3 "$INVENTORY_SCRIPT"
        echo ""
        echo -e "${SUCCESS} Inventory scan completed!"
        echo "Press Enter to refresh dashboard..."
        read
    else
        echo -e "${ERROR} Inventory script not found: $INVENTORY_SCRIPT"
        echo "Press Enter to continue..."
        read
    fi
}

show_harmony_recommendations() {
    echo -e "${HARMONY} Harmony Recommendations${NC}"
    draw_line
    
    local harmony_score=$(get_harmony_score)
    local alerts_count=$(get_splintering_alerts)
    
    if (( $(echo "$harmony_score < 0.6" | bc -l) )); then
        echo -e "${WARNING} Low harmony score detected!"
        echo "Recommendations:"
        echo "1. Review splintering alerts and consolidate duplicate functionality"
        echo "2. Move enhancements to appropriate category directories"
        echo "3. Standardize naming conventions across similar enhancements"
        echo "4. Consider creating integration layers between categories"
        echo ""
    elif (( $(echo "$harmony_score < 0.8" | bc -l) )); then
        echo -e "${INFO} Moderate harmony score"
        echo "Recommendations:"
        echo "1. Address any active splintering alerts"
        echo "2. Look for integration opportunities between categories"
        echo "3. Review documentation consistency across enhancements"
        echo ""
    else
        echo -e "${SUCCESS} Good harmony score!"
        echo "Recommendations:"
        echo "1. Maintain current organization patterns"
        echo "2. Continue monitoring for new splintering"
        echo "3. Consider advanced integration opportunities"
        echo ""
    fi
    
    if [ "$alerts_count" -gt 0 ]; then
        echo -e "${ALERT} Active alerts require attention:"
        echo "- Run detailed analysis to understand splintering causes"
        echo "- Plan consolidation strategy for duplicate functionality"
        echo "- Update development guidelines to prevent future splintering"
        echo ""
    fi
}

show_menu() {
    echo -e "${BLUE}${GEAR} Dashboard Options:${NC}"
    echo -e "${YELLOW}1)${NC} Refresh overview"
    echo -e "${YELLOW}2)${NC} Show detailed enhancement list"
    echo -e "${YELLOW}3)${NC} View splintering alerts"
    echo -e "${YELLOW}4)${NC} Show integration opportunities"
    echo -e "${YELLOW}5)${NC} Run inventory scan"
    echo -e "${YELLOW}6)${NC} Show harmony recommendations"
    echo -e "${YELLOW}7)${NC} Export harmony report"
    echo -e "${YELLOW}8)${NC} Configure harmony settings"
    echo -e "${YELLOW}9)${NC} Exit"
    echo ""
    echo -e "${CYAN}Please select an option (1-9):${NC} "
}

export_harmony_report() {
    local report_file="$PROJECT_DIR/harmony_report_$(date +%Y%m%d_%H%M%S).md"
    
    echo "# Claude Code Harmony Report" > "$report_file"
    echo "Generated: $(date)" >> "$report_file"
    echo "" >> "$report_file"
    
    echo "## Overview" >> "$report_file"
    echo "- Enhancements: $(get_enhancement_count)" >> "$report_file"
    echo "- Harmony Score: $(get_harmony_score)" >> "$report_file"
    echo "- Active Alerts: $(get_splintering_alerts)" >> "$report_file"
    echo "" >> "$report_file"
    
    echo "## Category Distribution" >> "$report_file"
    get_category_distribution | while IFS='|' read -r category count; do
        echo "- $category: $count" >> "$report_file"
    done
    echo "" >> "$report_file"
    
    echo "## Recent Alerts" >> "$report_file"
    get_recent_alerts | while IFS='|' read -r alert_type description severity created_date; do
        echo "### $alert_type ($severity)" >> "$report_file"
        echo "$description" >> "$report_file"
        echo "Date: $created_date" >> "$report_file"
        echo "" >> "$report_file"
    done
    
    echo -e "${SUCCESS} Report exported to: $report_file"
    echo "Press Enter to continue..."
    read
}

configure_harmony_settings() {
    echo -e "${GEAR} Harmony Configuration${NC}"
    draw_line
    
    echo "Current configuration options:"
    echo "1. Harmony threshold (currently: 0.6)"
    echo "2. Duplicate similarity threshold (currently: 0.8)"
    echo "3. Scan intervals"
    echo "4. Alert severity levels"
    echo ""
    echo "Note: Configuration editing will be implemented in future version"
    echo "Press Enter to continue..."
    read
}

# Main dashboard loop
main_dashboard() {
    while true; do
        # Check if database exists
        if [ ! -f "$DB_FILE" ]; then
            echo -e "${WARNING} Enhancement inventory database not found."
            echo "Running initial scan..."
            run_inventory_scan
            continue
        fi
        
        show_header
        show_overview
        show_category_distribution
        show_splintering_alerts
        show_integration_opportunities
        
        show_menu
        read choice
        
        case $choice in
            1)
                # Refresh overview - just continue loop
                ;;
            2)
                clear
                show_header
                show_enhancement_details
                echo "Press Enter to continue..."
                read
                ;;
            3)
                clear
                show_header
                show_splintering_alerts
                echo "Press Enter to continue..."
                read
                ;;
            4)
                clear
                show_header
                show_integration_opportunities
                echo "Press Enter to continue..."
                read
                ;;
            5)
                clear
                run_inventory_scan
                ;;
            6)
                clear
                show_header
                show_harmony_recommendations
                echo "Press Enter to continue..."
                read
                ;;
            7)
                export_harmony_report
                ;;
            8)
                configure_harmony_settings
                ;;
            9)
                echo -e "${SUCCESS} Goodbye!"
                exit 0
                ;;
            *)
                echo -e "${ERROR} Invalid choice. Please try again."
                sleep 1
                ;;
        esac
    done
}

# Check dependencies
check_dependencies() {
    if ! command -v sqlite3 >/dev/null 2>&1; then
        echo -e "${ERROR} sqlite3 is required but not installed."
        exit 1
    fi
    
    if ! command -v bc >/dev/null 2>&1; then
        echo -e "${ERROR} bc is required but not installed."
        exit 1
    fi
    
    if [ ! -f "$INVENTORY_SCRIPT" ]; then
        echo -e "${ERROR} Auto inventory script not found: $INVENTORY_SCRIPT"
        exit 1
    fi
}

# Entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    check_dependencies
    main_dashboard
fi