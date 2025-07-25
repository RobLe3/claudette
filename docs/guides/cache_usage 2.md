# Claudette Cache Usage Guide

## Overview

Claudette v0.5 includes session caching to avoid recompression and improve performance. The cache stores every prompt, compressed result, backend used, and response hash.

## Configuration

Enable caching in `config.yaml`:

```yaml
# Cache and History Configuration
cache_dir: ~/.claudette/cache          # Cache storage location
history_enabled: true                  # Enable caching and history
```

## Cache Behavior

**Cache Hit Criteria:**
- Same prompt text AND same file contents AND same backend

**Cache Miss Triggers:**
- Different prompt text
- Modified file contents  
- Different backend selection

**Cache Bypass:**
```bash
claudette --no-cache edit file.py --explain "optimize"
```

## History Commands

**View recent history:**
```bash
claudette history                      # Last 10 entries
claudette hist --last 5              # Last 5 entries
claudette history --grep "optimize"   # Search prompts
```

**Detailed information:**
```bash
claudette history --detailed          # Full details
claudette history --stats            # Cache statistics
```

**Clear history:**
```bash
claudette history --clear             # Delete all history
```

## Cache Benefits

- **Skip recompression** on repeated identical operations
- **Audit trail** for all claudette operations  
- **Cost tracking** with token estimates and backend usage
- **Performance improvement** on cache hits

The cache database is stored at `~/.claudette/cache/claudette.db` by default.