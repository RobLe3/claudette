# Claudette Release Process

**Version:** 1.0.0  
**Process:** Automated CI/CD with manual triggers  

## Prerequisites

1. **Repository Setup**
   - GitHub repository with admin access
   - CI/CD workflows enabled in `.github/workflows/`
   - Required secrets configured in repository settings

2. **Required Secrets**
   ```
   PYPI_API_TOKEN          # PyPI production API token
   TEST_PYPI_TOKEN         # Test PyPI API token (optional)
   GPG_KEY                 # GPG private key for signing (optional)
   GPG_PASSPHRASE          # GPG key passphrase (optional)
   HOMEBREW_TOKEN          # Homebrew tap access token (optional)
   ```

3. **Local Tools**
   - Python 3.11+ with pip, build, twine
   - Git with tag permissions
   - GPG for signing (optional)

## Release Steps

### 1. Pre-Release Validation
```bash
# Ensure all tests pass
make test

# Verify linting
make lint

# Build locally to test
make build
```

### 2. Version Update
```bash
# Update version in claudette/__init__.py
echo '__version__ = "1.0.0"' > claudette/__init__.py

# Ensure pyproject.toml matches
grep 'version = "1.0.0"' pyproject.toml

# Update CHANGELOG.md with release notes
```

### 3. Create Release Tag
```bash
# Commit version changes
git add claudette/__init__.py CHANGELOG.md
git commit -m "Release v1.0.0"

# Create and push tag (triggers release workflow)
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin main --tags
```

### 4. Monitor Release
- Watch GitHub Actions: `https://github.com/REPO/actions`
- Verify Test PyPI upload (if configured)
- Confirm PyPI production upload
- Check GitHub Release creation

### 5. Post-Release Verification
```bash
# Test PyPI installation
pip install claudette==1.0.0
claudette --help

# Test Homebrew formula (if configured)
brew install --build-from-source formula/claudette.rb
claudette --version
```

## Manual Release (Fallback)

If automated release fails:

```bash
# Build packages
./scripts/release/build_pypi.sh --sign

# Upload to Test PyPI
python -m twine upload --repository testpypi dist/*

# Test installation
pip install --index-url https://test.pypi.org/simple/ claudette

# Upload to production PyPI
python -m twine upload dist/*

# Create GitHub release manually
gh release create v1.0.0 dist/* --title "Claudette v1.0.0" --notes-file CHANGELOG.md
```

## Troubleshooting

**Build Failures:**
- Check pyproject.toml syntax: `python -m build --check`
- Verify dependencies: `pip install -e .[dev]`

**Upload Failures:**
- Confirm API tokens: `python -m twine check dist/*`
- Check version conflicts on PyPI

**CI Failures:**
- Review GitHub Actions logs
- Ensure all required secrets are set
- Verify branch protection rules

**GPG Signing Issues:**
- Test GPG key: `echo "test" | gpg --clearsign`
- Verify GPG_KEY format in secrets (armor format)

## Makefile Targets

```bash
make test      # Run pytest and linting
make lint      # Run pylint with score threshold
make build     # Build source and wheel distributions
make release   # Full release process (local)
make clean     # Remove build artifacts
```