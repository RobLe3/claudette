# Claudette Examples

Practical examples and tutorials for using Claudette effectively.

## Quick Start Examples

### Basic Usage

```bash
# Simple command execution
claudette "explain this function" main.py

# Multiple file analysis
claudette "find potential bugs" src/*.py

# Generate documentation
claudette "create README for this project" *.py > README.md
```

### Backend Selection

```bash
# Use specific backend for cost optimization
claudette --backend openai "simple code review" file.py

# Use Claude for complex analysis
claudette --backend claude "comprehensive architecture review" src/

# Local analysis with Ollama
claudette --backend ollama "private code analysis" sensitive.py
```

## Advanced Workflows

### Code Analysis Pipeline

```bash
#!/bin/bash
# comprehensive-analysis.sh

echo "🔍 Starting comprehensive code analysis..."

# 1. Quick overview with cost-effective backend
claudette --backend openai "provide project overview" . > analysis/overview.md

# 2. Detailed security analysis with Claude
claudette --backend claude "perform security audit" src/ > analysis/security.md

# 3. Performance analysis with caching
claudette "identify performance bottlenecks" src/ > analysis/performance.md

# 4. Generate final report
claudette "combine analyses into executive summary" analysis/*.md > final-report.md

echo "✅ Analysis complete! Check final-report.md"
```

### Cost-Optimized Development

```bash
#!/bin/bash
# cost-optimized-workflow.sh

# Set cost-effective defaults
export CLAUDETTE_DEFAULT_BACKEND="openai"

# Enable caching for repeated operations  
claudette config set cache.enabled true

# Use preprocessing for large contexts
claudette config set preprocessing.enabled true

# Monitor costs throughout development
claudette stats --live &
STATS_PID=$!

# Perform development tasks
claudette "review PR changes" $(git diff --name-only main)
claudette "suggest optimizations" src/performance-critical.py
claudette "generate tests" src/new-feature.py

# Stop monitoring and show final costs
kill $STATS_PID
claudette stats --summary
```

## Configuration Examples

### Multi-Environment Setup

```yaml
# ~/.claudette/config.yaml
# Development environment
development:
  default_backend: ollama  # Local for privacy
  cache_enabled: true
  preprocessing_enabled: false  # Faster for dev

# Production analysis  
production:
  default_backend: claude   # Best quality
  cache_enabled: true
  preprocessing_enabled: true  # Cost optimization
  
# Cost-conscious setup
budget:
  default_backend: openai   # Most cost-effective
  cache_enabled: true
  preprocessing_enabled: true
  cost_alerts:
    daily_limit: 5.00
    weekly_limit: 25.00
```

### Team Configuration

```yaml
# Team shared configuration
team_defaults:
  # Standardize on backends available to all
  allowed_backends: [openai, mistral]
  default_backend: openai
  
  # Shared cache for common operations
  cache:
    enabled: true
    shared: true
    directory: "/shared/claudette-cache"
    
  # Cost management
  cost_tracking: true
  budget_alerts: true
  
  # Quality standards
  preprocessing:
    enabled: true
    min_compression_ratio: 0.3
```

## Integration Examples  

### Git Hooks Integration

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "🔍 Running Claudette code review..."

# Get staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(py|js|ts|java|go)$')

if [ -n "$STAGED_FILES" ]; then
    # Quick review of staged changes
    claudette --backend openai "review these changes for issues" $STAGED_FILES
    
    # Check if review suggests blocking commit
    REVIEW_RESULT=$?
    if [ $REVIEW_RESULT -ne 0 ]; then
        echo "❌ Code review suggests improvements needed"
        echo "💡 Run: claudette 'suggest fixes' $STAGED_FILES"
        exit 1
    fi
fi

echo "✅ Code review passed"
```

### CI/CD Integration

```yaml
# .github/workflows/code-review.yml
name: AI Code Review
on: [pull_request]

jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - name: Setup Claudette
        run: |
          pip install claudette
          echo "OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }}" >> $GITHUB_ENV
          
      - name: Review Changed Files
        run: |
          # Get changed files in PR
          CHANGED_FILES=$(git diff --name-only origin/main...HEAD | grep -E '\.(py|js|ts)$' | head -10)
          
          if [ -n "$CHANGED_FILES" ]; then
            # Use cost-effective backend for CI
            claudette --backend openai "review PR changes for bugs, security issues, and improvements" $CHANGED_FILES > review-output.md
            
            # Post review as comment (using additional action)
            echo "REVIEW_OUTPUT<<EOF" >> $GITHUB_ENV
            cat review-output.md >> $GITHUB_ENV
            echo "EOF" >> $GITHUB_ENV
          fi
          
      - name: Comment PR
        if: env.REVIEW_OUTPUT
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## 🤖 AI Code Review\n\n${process.env.REVIEW_OUTPUT}`
            })
```

### IDE Integration

```bash
#!/bin/bash
# VS Code task integration (.vscode/tasks.json companion)

# claudette-review.sh
FILE="$1"
if [ -z "$FILE" ]; then
    echo "Usage: $0 <file>"
    exit 1
fi

echo "🔍 Reviewing $FILE..."

# Quick analysis with caching enabled
claudette --backend openai "review this file for improvements" "$FILE" | \
    tee "/tmp/claudette-review-$(basename "$FILE").md"

# Open review in default editor
code "/tmp/claudette-review-$(basename "$FILE").md"
```

## Dashboard Examples

### Development Monitoring

```bash
#!/bin/bash
# dev-monitor.sh - Monitor development session costs

# Start dashboard in background
claudette dashboard --terminal --refresh 30 &
DASHBOARD_PID=$!

echo "📊 Dashboard running (PID: $DASHBOARD_PID)"
echo "💡 Press Ctrl+C to stop monitoring"

# Cleanup on exit
trap 'kill $DASHBOARD_PID 2>/dev/null' EXIT

# Keep script running
wait
```

### Team Cost Tracking

```bash
#!/bin/bash  
# team-costs.sh - Generate team cost report

echo "📈 Generating team cost report..."

# Individual usage
for dev in alice bob charlie; do
    echo "## $dev's Usage" >> team-report.md
    claudette stats --period week --user $dev --format markdown >> team-report.md
    echo "" >> team-report.md
done

# Team totals
echo "## Team Totals" >> team-report.md
claudette stats --period week --team --format markdown >> team-report.md

# Cost optimization suggestions
echo "## Optimization Suggestions" >> team-report.md
claudette "analyze team usage patterns and suggest cost optimizations" team-report.md >> team-report.md

echo "✅ Team report generated: team-report.md"
```

## Error Handling Examples

### Robust Script Template

```bash
#!/bin/bash
# robust-claudette-script.sh

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Configuration
BACKEND="openai"
MAX_RETRIES=3
RETRY_DELAY=5

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" >&2
}

# Retry function for claudette commands
retry_claudette() {
    local cmd="$*"
    local attempt=1
    
    while [ $attempt -le $MAX_RETRIES ]; do
        log "Attempt $attempt: $cmd"
        
        if claudette --backend "$BACKEND" "$cmd"; then
            return 0
        else
            local exit_code=$?
            log "Attempt $attempt failed (exit code: $exit_code)"
            
            if [ $attempt -eq $MAX_RETRIES ]; then
                log "All $MAX_RETRIES attempts failed"
                return $exit_code
            fi
            
            log "Retrying in $RETRY_DELAY seconds..."
            sleep $RETRY_DELAY
            ((attempt++))
        fi
    done
}

# Main logic with error handling
main() {
    log "Starting analysis..."
    
    # Check prerequisites
    if ! command -v claudette >/dev/null; then
        log "ERROR: claudette not found in PATH"
        exit 1
    fi
    
    # Test backend availability
    if ! claudette --backend "$BACKEND" --dry-run "test" >/dev/null 2>&1; then
        log "ERROR: Backend '$BACKEND' not available"
        exit 1
    fi
    
    # Perform analysis with retries
    retry_claudette "analyze project structure" src/ || {
        log "ERROR: Failed to analyze project structure"
        exit 1
    }
    
    retry_claudette "generate improvement suggestions" . || {
        log "WARNING: Failed to generate suggestions (continuing anyway)"
    }
    
    log "Analysis complete!"
}

# Run with error handling
if ! main "$@"; then
    log "Script failed with exit code $?"
    exit 1
fi
```

## Performance Optimization Examples

### Cache Optimization

```bash
#!/bin/bash
# optimize-cache.sh

echo "🔧 Optimizing Claudette cache..."

# Check current cache status
echo "Current cache statistics:"
claudette cache stats

# Clean old entries (older than 7 days)
echo "Cleaning old cache entries..."
claudette cache clean --older-than 7d

# Rebuild cache index for better performance
echo "Rebuilding cache index..."
claudette cache rebuild

# Set optimal cache configuration
echo "Configuring cache settings..."
claudette config set cache.max_size 500MB
claudette config set cache.ttl 86400  # 24 hours
claudette config set cache.compression true

echo "✅ Cache optimization complete!"
claudette cache stats
```

### Batch Processing

```bash
#!/bin/bash
# batch-process.sh - Process multiple files efficiently

FILES=(src/*.py tests/*.py docs/*.md)
BATCH_SIZE=5

echo "📦 Processing ${#FILES[@]} files in batches of $BATCH_SIZE..."

# Process files in batches to optimize API usage
for ((i=0; i<${#FILES[@]}; i+=BATCH_SIZE)); do
    batch=("${FILES[@]:i:BATCH_SIZE}")
    echo "Processing batch: ${batch[*]}"
    
    # Process batch together to leverage context sharing
    claudette --backend openai "analyze these files together" "${batch[@]}" > "analysis-batch-$((i/BATCH_SIZE + 1)).md"
    
    # Small delay to respect rate limits
    sleep 1
done

echo "✅ Batch processing complete!"
```

## Testing Examples

### Integration Testing

```bash
#!/bin/bash  
# test-integration.sh

echo "🧪 Testing Claudette integration..."

# Test basic functionality
test_basic() {
    echo "Testing basic command execution..."
    if claudette --backend openai "return 'test successful'" | grep -q "test successful"; then
        echo "✅ Basic test passed"
        return 0
    else
        echo "❌ Basic test failed"
        return 1
    fi
}

# Test caching
test_caching() {
    echo "Testing cache functionality..."
    
    # Clear cache
    claudette cache clear --confirm
    
    # First request (cache miss)
    start_time=$(date +%s)
    claudette "return current timestamp" > /dev/null
    first_duration=$(($(date +%s) - start_time))
    
    # Second request (cache hit)
    start_time=$(date +%s)
    claudette "return current timestamp" > /dev/null  
    second_duration=$(($(date +%s) - start_time))
    
    if [ $second_duration -lt $first_duration ]; then
        echo "✅ Cache test passed (${first_duration}s -> ${second_duration}s)"
        return 0
    else
        echo "❌ Cache test failed"
        return 1
    fi
}

# Run tests
FAILED=0

test_basic || FAILED=$((FAILED + 1))
test_caching || FAILED=$((FAILED + 1))

if [ $FAILED -eq 0 ]; then
    echo "🎉 All integration tests passed!"
    exit 0
else
    echo "💥 $FAILED test(s) failed"
    exit 1
fi
```

These examples demonstrate the flexibility and power of Claudette across different use cases, from simple command-line usage to complex CI/CD integration and team workflows.