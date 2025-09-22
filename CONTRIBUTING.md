# Contributing to Claudette 🤝

> **Welcome to the Claudette community!** 
> 
> We're building the future of AI middleware - intelligent routing, cost optimization, and seamless multi-provider integration. Your contributions make this platform better for everyone.

![Contributors Welcome](https://img.shields.io/badge/contributors-welcome-brightgreen.svg)
![Version](https://img.shields.io/badge/version-1.0.4-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue)

## 🎯 How You Can Contribute

### 🔧 **Code Contributions**
- Bug fixes and improvements
- New backend integrations (Gemini, Mistral, etc.)
- Performance optimizations
- RAG system enhancements
- Security improvements

### 📚 **Documentation**
- API documentation
- Tutorials and guides
- Use case examples
- Architecture explanations

### 🧪 **Testing & Quality**
- Unit tests and integration tests
- Performance benchmarks
- Edge case validation
- Security testing

### 💡 **Ideas & Feedback**
- Feature requests
- Architecture suggestions
- Performance insights
- User experience improvements

---

## 🚀 Quick Start for Contributors

### Prerequisites

Before contributing, ensure you have:

- **Node.js 18+** - Check with `node --version`
- **npm 9+** - Latest version recommended
- **Git** - For version control
- **TypeScript knowledge** - Most code is written in TypeScript
- **Docker** (optional) - For RAG development and testing

### 1. Fork & Clone

```bash
# Fork the repository on GitHub first, then:
git clone https://github.com/YOUR_USERNAME/claudette.git
cd claudette

# Add upstream remote
git remote add upstream https://github.com/RobLe3/claudette.git
```

### 2. Setup Development Environment

```bash
# Install dependencies
npm ci

# Build the project
npm run build

# Run tests to ensure everything works
npm test

# Start development mode (with file watching)
npm run dev
```

### 3. Verify Installation

```bash
# Check if CLI works
./claudette --version

# Run health check
npm run health

# Run quick validation
npm run test:validation:quick
```

---

## 🏗️ Development Workflow

### Branch Strategy

```bash
# Create feature branch from main
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name

# Create fix branch for bugs
git checkout -b fix/issue-description

# Create docs branch for documentation
git checkout -b docs/documentation-improvement
```

### Making Changes

1. **Write Code**: Make your changes following our [code standards](#code-standards)
2. **Test Locally**: Run tests and ensure they pass
3. **Update Docs**: Update relevant documentation
4. **Commit Changes**: Use conventional commit messages

```bash
# Build and test
npm run build
npm test

# Run specific test suites
npm run test:rag          # RAG integration tests
npm run test:performance  # Performance benchmarks
npm run test:e2e         # End-to-end tests

# TypeScript validation
npm run validate
```

### Commit Message Format

We use [Conventional Commits](https://conventionalcommits.org/):

```bash
feat: add support for Gemini backend integration
fix: resolve timeout issues in Qwen backend health checks
docs: update API documentation for routing configuration
test: add performance benchmarks for cache system
chore: update dependencies and security fixes
```

**Types:**
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `security`: Security fixes

### Pull Request Process

1. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request** on GitHub with:
   - Clear title following conventional commit format
   - Detailed description of changes
   - Link to related issues
   - Screenshots/examples if applicable

3. **PR Requirements**:
   - ✅ All tests pass
   - ✅ Code follows style guidelines
   - ✅ Documentation updated
   - ✅ No merge conflicts
   - ✅ Signed commits (recommended)

---

## 📋 Code Standards

### TypeScript Guidelines

```typescript
// ✅ Good: Clear interfaces and types
interface BackendConfig {
  enabled: boolean;
  apiKey: string;
  baseURL?: string;
  timeout: number;
}

// ✅ Good: Proper error handling
async function initializeBackend(config: BackendConfig): Promise<void> {
  try {
    await validateConfig(config);
    await connectToBackend(config);
  } catch (error) {
    throw new BackendError(`Failed to initialize: ${error.message}`, 'INIT_ERROR');
  }
}

// ❌ Avoid: Any types and unclear names
function doSomething(data: any): any {
  return data.stuff;
}
```

### File Structure

```
src/
├── backends/          # Backend implementations
├── cache/            # Caching system
├── rag/              # RAG implementations
├── router/           # Request routing logic
├── monitoring/       # Performance monitoring
├── utils/            # Shared utilities
└── types/            # TypeScript definitions
```

### Naming Conventions

- **Files**: `kebab-case.ts`
- **Classes**: `PascalCase`
- **Functions**: `camelCase`
- **Constants**: `SCREAMING_SNAKE_CASE`
- **Interfaces**: `PascalCase` with descriptive names

### Security Guidelines

```typescript
// ✅ Always sanitize user input
const sanitizedInput = sanitizeLogInput(userInput);

// ✅ Use secure random generation
const sessionId = crypto.randomBytes(16).toString('hex');

// ✅ Validate API keys
if (!isValidApiKeyFormat(apiKey)) {
  throw new SecurityError('Invalid API key format');
}

// ❌ Never log sensitive data
console.log('API Key:', apiKey); // DON'T DO THIS
```

---

## 🧪 Testing Requirements

### Test Categories

```bash
# Unit Tests - Test individual components
npm test

# Integration Tests - Test system interactions
npm run test:rag

# Performance Tests - Benchmark performance
npm run test:performance

# End-to-End Tests - Full user journey
npm run test:e2e

# Emergency Validation - Critical path testing
npm run test:emergency
```

### Writing Tests

```typescript
// Example test structure
describe('BackendRouter', () => {
  let router: BackendRouter;
  
  beforeEach(() => {
    router = new BackendRouter(defaultConfig);
  });
  
  it('should route to fastest healthy backend', async () => {
    // Arrange
    const mockBackends = createMockBackends();
    router.registerBackends(mockBackends);
    
    // Act
    const result = await router.routeRequest(testRequest);
    
    // Assert
    expect(result.backend).toBe('claude');
    expect(result.latency).toBeLessThan(1000);
  });
});
```

### Test Requirements for PRs

- ✅ All existing tests must pass
- ✅ New features require tests
- ✅ Bug fixes should include regression tests
- ✅ Performance changes need benchmarks
- ✅ Integration tests for new backends

---

## 📖 Documentation Guidelines

### API Documentation

Use JSDoc for functions:

```typescript
/**
 * Routes a request to the optimal backend based on performance and availability
 * @param request - The request to route
 * @param options - Routing options and preferences
 * @returns Promise containing the routed response
 * @throws {RoutingError} When no healthy backends are available
 * 
 * @example
 * ```typescript
 * const response = await router.routeRequest({
 *   prompt: "Explain quantum computing",
 *   options: { preferredBackend: "claude" }
 * });
 * ```
 */
async routeRequest(request: ClaudetteRequest, options?: RoutingOptions): Promise<ClaudetteResponse>
```

### README Updates

When adding features, update:
- Feature list in README.md
- Installation instructions (if needed)
- Usage examples
- Configuration options

---

## 🎭 Backend Integration Guide

### Adding a New Backend

1. **Create backend implementation**:
   ```typescript
   // src/backends/your-backend.ts
   export class YourBackend extends BaseBackend {
     constructor(config: BackendSettings) {
       super('your-backend', config);
     }
     
     async send(request: ClaudetteRequest): Promise<ClaudetteResponse> {
       // Implementation
     }
   }
   ```

2. **Add to router registration**:
   ```typescript
   // src/index.ts - in initializeBackends()
   if (this.config.backends.yourBackend.enabled) {
     const backend = new YourBackend(this.config.backends.yourBackend);
     this.router.registerBackend(backend);
   }
   ```

3. **Update configuration types**:
   ```typescript
   // src/types/index.ts
   interface ClaudetteConfig {
     backends: {
       yourBackend: BackendSettings;
       // ... other backends
     };
   }
   ```

4. **Add tests**:
   ```bash
   # Create test file
   touch src/test/backend-your-backend.test.ts
   ```

---

## 🔍 RAG System Contributions

### RAG Provider Development

```typescript
// Example RAG provider
export class YourRAGProvider extends BaseRAGProvider {
  async initialize(config: RAGConfig): Promise<void> {
    // Setup connection to your RAG system
  }
  
  async query(prompt: string, context?: any): Promise<RAGResponse> {
    // Implement RAG query logic
  }
  
  async healthCheck(): Promise<boolean> {
    // Check if RAG system is healthy
  }
}
```

### RAG Testing

```bash
# Test RAG integration
npm run test:rag

# Test specific RAG provider
node src/test/test-your-rag-provider.js
```

---

## 🐛 Bug Reports

### Before Reporting

1. **Search existing issues** - Check if it's already reported
2. **Update to latest version** - Bug might be fixed
3. **Minimal reproduction** - Create smallest example that reproduces the issue

### Bug Report Template

```markdown
**Description**
A clear and concise description of the bug.

**To Reproduce**
Steps to reproduce the behavior:
1. Configure Claudette with '...'
2. Run command '...'
3. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Environment**
- Claudette Version: [e.g., 1.0.4]
- Node.js Version: [e.g., 18.17.0]
- OS: [e.g., macOS 13.4]
- Backend: [e.g., Claude, OpenAI]

**Additional Context**
Any other context about the problem.

**Logs**
```
Paste relevant logs here
```
```

---

## 💡 Feature Requests

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of what the problem is.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Any alternative solutions or features you've considered.

**Additional context**
Any other context or screenshots about the feature request.

**Implementation Ideas**
If you have ideas about how this could be implemented.
```

---

## 🏆 Recognition

### Contributors

We recognize contributors in:
- `CONTRIBUTORS.md` file
- Release notes
- Social media announcements
- Special contributor badges

### Types of Contributions Recognized

- 🔧 **Code contributions**
- 📚 **Documentation improvements**
- 🐛 **Bug reports and fixes**
- 💡 **Feature suggestions**
- 🧪 **Testing and QA**
- 🎨 **Design and UX**
- 🌍 **Translation and i18n**
- 📢 **Community support**

---

## 📞 Getting Help

### Community Support

- **GitHub Discussions**: For questions and general discussions
- **Issues**: For bug reports and feature requests
- **Discord** (coming soon): Real-time community chat

### Development Help

- **Architecture Questions**: Tag your issue with `architecture`
- **Backend Integration**: Tag with `backend-integration`
- **RAG Development**: Tag with `rag-development`
- **Performance**: Tag with `performance`

---

## 📜 Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Positive behaviors include:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behaviors include:**
- The use of sexualized language or imagery
- Trolling, insulting/derogatory comments, and personal attacks
- Public or private harassment
- Publishing others' private information without permission
- Other conduct which could reasonably be considered inappropriate

### Enforcement

Project maintainers are responsible for clarifying standards and will take appropriate action in response to any behavior that they deem inappropriate, threatening, offensive, or harmful.

---

## 🔄 Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality
- **PATCH** version for backwards-compatible bug fixes

### Release Workflow

1. **Feature complete**: All planned features merged
2. **Testing**: Full test suite validation
3. **Documentation**: Updated for new features
4. **Version bump**: Update package.json version
5. **Changelog**: Update CHANGELOG.md
6. **Tag release**: Create git tag
7. **NPM publish**: Automated publishing

---

## 🙏 Thank You

Thank you for considering contributing to Claudette! Every contribution, no matter how small, helps make this project better for everyone in the AI community.

**Questions?** Don't hesitate to ask in GitHub Discussions or open an issue.

**Ready to contribute?** Check out our [good first issues](https://github.com/RobLe3/claudette/labels/good%20first%20issue) to get started!

---

*This contributing guide is living document. Feel free to suggest improvements!*