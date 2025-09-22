# Local Testing Workflow Guide

## 🔧 Using Local tmp Directory

The repository includes a local `tmp/` directory for testing activities that is automatically ignored by git.

### Package Testing Workflow:

```bash
# Create package
npm pack

# Create tmp directory and extract package
mkdir -p tmp
tar -xzf claudette-2.1.0.tgz -C tmp

# Test extracted contents
ls -la tmp/package/
ls tmp/package/src/backends/
head tmp/package/src/backends/adaptive-qwen.ts

# Verify fixes are included
grep -n "AbortController\|QwenResponse" tmp/package/src/backends/adaptive-qwen.ts

# Clean up
rm -rf tmp claudette-2.1.0.tgz
```

### Benefits:

- ✅ **Security Compliant**: Works within allowed working directories
- ✅ **Git Ignored**: `tmp/` already in .gitignore (line 99)
- ✅ **Clean Workspace**: Easy cleanup with `rm -rf tmp`
- ✅ **Reproducible**: Standardized testing workflow

### Alternative Commands:

```bash
# Quick extraction and test
npm pack && mkdir -p tmp && tar -xzf *.tgz -C tmp && ls tmp/package/

# Verify specific file
head tmp/package/src/backends/adaptive-qwen.ts

# Check package contents
tar -tzf claudette-2.1.0.tgz | head -20

# Package size and integrity
ls -lh *.tgz
sha256sum *.tgz
```

### Notes:

- The `tmp/` directory is already configured in .gitignore
- No additional setup required
- Safe for any temporary testing activities
- Automatically cleaned up between sessions

---

*This resolves the security restriction: "cd to '/tmp/claudette-test' was blocked"*