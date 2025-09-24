# Contributing to Claudette

> **Welcome to the Claudette community!** 
> 
> This guide will help you contribute effectively to the Claudette AI middleware platform.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Contribution Types](#contribution-types)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Community Guidelines](#community-guidelines)

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js 18+** - Check with `node --version`
- **npm** - Latest version recommended
- **Git** - For version control
- **Docker** (optional) - For RAG development and testing
- **VS Code** (recommended) - For the best development experience

### Quick Setup

1. **Run the contributor setup script:**
   ```bash
   curl -sSL https://raw.githubusercontent.com/user/claudette/main/dev/workflows/contributor-setup.sh | bash
   ```

2. **Or set up manually:**
   ```bash
   # Fork the repository on GitHub
   git clone https://github.com/YOUR_USERNAME/claudette.git
   cd claudette
   
   # Add upstream remote
   git remote add upstream https://github.com/user/claudette.git
   
   # Install dependencies
   npm ci
   
   # Build the project
   npm run build
   
   # Run the development setup
   ./dev/environment/dev-setup.sh
   ```

3. **Verify setup:**
   ```bash
   npm run test:all
   npm run validate
   ```

---

## Development Environment

### Automated Setup

The development environment setup is automated through scripts:

```bash
# Full development environment with Docker services
docker-compose -f dev/environment/docker-compose.dev.yml up -d

# Or just the Node.js environment
./dev/environment/dev-setup.sh
```

### Manual Configuration

#### VS Code Setup

The repository includes VS Code configuration for optimal development:

- **Extensions**: TypeScript, ESLint, Prettier, Docker
- **Settings**: Auto-format on save, TypeScript validation
- **Debug**: Pre-configured launch configurations for CLI and tests

#### Environment Variables

Create a `.env` file for development:

```bash
# Optional: API keys for testing (use test keys)
OPENAI_API_KEY=test-key-openai
ANTHROPIC_API_KEY=test-key-claude
QWEN_API_KEY=test-key-qwen

# Development settings
NODE_ENV=development
DEBUG=claudette:*
CLAUDETTE_LOG_LEVEL=debug
```

---

## Contribution Types

### 🐛 Bug Fixes

1. **Find or create an issue** using the bug report template
2. **Reproduce the bug** in your development environment
3. **Write a failing test** that demonstrates the bug
4. **Fix the bug** and ensure the test passes
5. **Update documentation** if the fix affects user behavior

**Example:**
```typescript
// Before: Bug in backend selection
async selectBackend(): Promise<Backend> {
  return this.backends[0]; // Always returns first backend
}

// After: Proper weighted selection
async selectBackend(request: OptimizeRequest): Promise<Backend> {
  const scores = await this.calculateScores(this.backends, request);
  return this.selectOptimal(scores);
}
```

### ✨ New Features

1. **Create a feature request** using the template
2. **Discuss the design** with maintainers and community
3. **Create an Architecture Decision Record (ADR)** for significant features
4. **Implement with comprehensive tests**
5. **Update documentation and examples**

**Feature Development Checklist:**
- [ ] Feature request approved by maintainers
- [ ] Architecture design documented
- [ ] TypeScript interfaces defined
- [ ] Core implementation completed
- [ ] Comprehensive test coverage
- [ ] Integration tests added
- [ ] Documentation updated
- [ ] Examples provided
- [ ] Performance impact assessed

### 🧠 RAG Provider Integration

Adding new RAG providers follows a specific pattern:

```typescript
// 1. Implement the RAGProvider interface
class NewRAGProvider implements RAGProvider {
  name = 'new-provider';
  
  async query(query: string, options?: RAGQueryOptions): Promise<RAGResult> {
    // Implementation
  }
  
  async isHealthy(): Promise<boolean> {
    // Health check
  }
}

// 2. Create factory function
export function createNewRAGProvider(config: NewRAGConfig): NewRAGProvider {
  return new NewRAGProvider(config);
}

// 3. Add comprehensive tests
describe('NewRAGProvider', () => {
  it('should retrieve relevant contexts', async () => {
    // Test implementation
  });
});

// 4. Update documentation
```

### 🤖 AI Backend Integration

New AI backends must implement the Backend interface:

```typescript
class NewBackend extends BaseBackend {
  name = 'new-backend';
  
  protected async doComplete(prompt: string, options: CompletionOptions): Promise<CompletionResult> {
    // Provider-specific implementation
  }
  
  async getModels(): Promise<string[]> {
    // Return available models
  }
  
  getCostEstimate(tokens: number, model?: string): number {
    // Return cost in EUR
  }
}
```

### 📚 Documentation

Documentation contributions are highly valued:

- **API Documentation**: Keep `docs/technical/API.md` updated
- **Architecture**: Update `docs/technical/ARCHITECTURE.md` for design changes
- **User Guides**: Improve setup and usage documentation
- **Examples**: Add practical examples and use cases
- **Troubleshooting**: Document common issues and solutions

---

## Development Workflow

### 1. Feature Branch Workflow

```bash
# Update your fork
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add new feature description"

# Push and create PR
git push origin feature/your-feature-name
```

### 2. Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

**Examples:**
```bash
feat(rag): add Pinecone vector database support
fix(router): resolve backend selection edge case
docs(api): update RAG provider configuration examples
test(backend): add comprehensive OpenAI backend tests
```

### 3. Pull Request Process

1. **Create descriptive PR** using the template
2. **Link related issues** using `Fixes #123` syntax
3. **Ensure CI passes** - all tests and checks must pass
4. **Request review** from maintainers
5. **Address feedback** and update as needed
6. **Squash and merge** once approved

### 4. Code Review Guidelines

#### For Authors:
- Write clear PR descriptions
- Keep changes focused and atomic
- Add tests for new functionality
- Update documentation
- Respond promptly to feedback

#### For Reviewers:
- Be constructive and specific
- Test the changes locally
- Consider performance and security implications
- Suggest improvements, not just problems
- Approve when ready

---

## Code Standards

### TypeScript Guidelines

#### Type Safety
```typescript
// ✅ Good: Explicit types
interface BackendConfig {
  apiKey: string;
  models: string[];
  timeout?: number;
}

// ❌ Bad: Any types
interface BackendConfig {
  apiKey: any;
  models: any;
  timeout: any;
}
```

#### Error Handling
```typescript
// ✅ Good: Specific error types
class BackendError extends Error {
  constructor(
    message: string,
    public backend: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'BackendError';
  }
}

// ❌ Bad: Generic errors
throw new Error('Something went wrong');
```

#### Async/Await Patterns
```typescript
// ✅ Good: Proper error handling
async function safeOperation(): Promise<Result> {
  try {
    const result = await riskyOperation();
    return { success: true, data: result };
  } catch (error) {
    logger.error('Operation failed', { error });
    return { success: false, error: error.message };
  }
}

// ❌ Bad: Unhandled promises
function unsafeOperation() {
  riskyOperation(); // Missing await and error handling
}
```

### Code Organization

#### File Structure
```
src/
├── backends/           # AI backend implementations
│   ├── base.ts        # Base backend class
│   ├── openai.ts      # OpenAI implementation
│   └── index.ts       # Exports
├── rag/               # RAG system
├── router/            # Routing logic
├── cache/             # Caching system
├── types/             # Type definitions
└── index.ts           # Main exports
```

#### Naming Conventions
- **Classes**: PascalCase (`BackendManager`)
- **Functions**: camelCase (`selectBackend`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_TIMEOUT`)
- **Files**: kebab-case (`backend-manager.ts`)
- **Interfaces**: PascalCase with descriptive names (`BackendConfig`)

### Performance Guidelines

#### Memory Management
```typescript
// ✅ Good: Cleanup resources
class BackendManager {
  private connections: Map<string, Connection> = new Map();
  
  async shutdown(): Promise<void> {
    for (const connection of this.connections.values()) {
      await connection.close();
    }
    this.connections.clear();
  }
}
```

#### Async Operations
```typescript
// ✅ Good: Concurrent operations
async function checkAllBackends(backends: Backend[]): Promise<boolean[]> {
  const checks = backends.map(backend => backend.isHealthy());
  return Promise.all(checks);
}

// ❌ Bad: Sequential operations
async function checkAllBackendsSequential(backends: Backend[]): Promise<boolean[]> {
  const results = [];
  for (const backend of backends) {
    results.push(await backend.isHealthy()); // Slow!
  }
  return results;
}
```

---

## Testing Requirements

### Test Structure

```
src/
├── backends/
│   ├── openai.ts
│   └── __tests__/
│       ├── openai.test.ts      # Unit tests
│       └── openai.integration.test.ts  # Integration tests
└── test/
    ├── unit/                   # Unit test helpers
    ├── integration/            # Integration test suites
    └── fixtures/               # Test data
```

### Test Categories

#### 1. Unit Tests
```typescript
describe('OpenAIBackend', () => {
  let backend: OpenAIBackend;
  
  beforeEach(() => {
    backend = new OpenAIBackend({
      apiKey: 'test-key',
      models: ['gpt-4o-mini']
    });
  });
  
  it('should calculate cost correctly', () => {
    const cost = backend.getCostEstimate(1000, 'gpt-4o-mini');
    expect(cost).toBeCloseTo(0.000045, 6);
  });
  
  it('should handle API errors gracefully', async () => {
    // Mock API failure
    mockApiFailure();
    
    await expect(backend.complete('test', {}))
      .rejects.toThrow(BackendError);
  });
});
```

#### 2. Integration Tests
```typescript
describe('RAG Integration', () => {
  let ragManager: RAGManager;
  let dockerProvider: DockerRAGProvider;
  
  beforeAll(async () => {
    // Start test containers
    await startTestContainer('chroma');
    ragManager = new RAGManager();
    dockerProvider = await createDockerProvider(testConfig);
  });
  
  afterAll(async () => {
    await stopTestContainer('chroma');
  });
  
  it('should retrieve relevant contexts', async () => {
    const result = await ragManager.query('test query');
    expect(result.contexts).toHaveLength(3);
    expect(result.scores[0]).toBeGreaterThan(0.8);
  });
});
```

#### 3. End-to-End Tests
```typescript
describe('Claudette E2E', () => {
  it('should complete full optimization workflow', async () => {
    const claudette = new Claudette(testConfig);
    
    const result = await claudette.optimize(
      'Explain TypeScript',
      [],
      { useRAG: true }
    );
    
    expect(result.response).toBeTruthy();
    expect(result.metadata.ragUsed).toBe(true);
    expect(result.performance.latencyMs).toBeLessThan(5000);
  });
});
```

### Test Coverage Requirements

- **Minimum Coverage**: 80% for new code
- **Critical Paths**: 95% coverage required
- **Integration Tests**: All public APIs must have integration tests
- **RAG Components**: Comprehensive testing with mock providers

### Running Tests

```bash
# Run all tests
npm run test:all

# Run specific test categories
npm run test              # Unit tests
npm run test:rag          # RAG integration tests
npm run test:e2e          # End-to-end tests
npm run test:performance  # Performance benchmarks

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

---

## Documentation

### API Documentation

API documentation is auto-generated from TypeScript source code. Keep JSDoc comments comprehensive:

```typescript
/**
 * Optimizes AI requests across multiple backends with intelligent routing.
 * 
 * @param prompt - The main prompt text
 * @param messages - Conversation history array
 * @param options - Optional configuration for this request
 * @returns Promise resolving to optimization result with metadata
 * 
 * @example
 * ```typescript
 * const result = await claudette.optimize(
 *   "Explain quantum computing",
 *   [],
 *   { useRAG: true, maxTokens: 500 }
 * );
 * ```
 */
async optimize(
  prompt: string,
  messages: Message[],
  options?: OptimizeOptions
): Promise<OptimizeResult>
```

### Architecture Decision Records (ADRs)

For significant architectural decisions, create ADRs in `docs/technical/adrs/`:

```markdown
# ADR-XXX: Title

**Status:** Proposed | Accepted | Deprecated | Superseded  
**Date:** YYYY-MM-DD  
**Deciders:** @username1, @username2

## Context
Describe the situation requiring a decision.

## Decision
State the decision made.

## Consequences
List positive and negative consequences.

## Implementation
Technical implementation details.
```

### Documentation Updates

When contributing, update relevant documentation:

- **README.md** - For user-facing changes
- **docs/technical/API.md** - For API changes
- **docs/technical/ARCHITECTURE.md** - For architectural changes
- **CHANGELOG.md** - For all user-visible changes

---

## Community Guidelines

### Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- **Be respectful** - Treat all community members with respect
- **Be inclusive** - Welcome newcomers and diverse perspectives
- **Be collaborative** - Work together constructively
- **Be patient** - Help others learn and grow
- **Be professional** - Maintain professional standards in all interactions

### Communication Channels

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - General questions and community discussion
- **Pull Requests** - Code review and technical discussion
- **Documentation** - Written guides and references

### Getting Help

If you need help:

1. **Check documentation** - README, API docs, troubleshooting guides
2. **Search existing issues** - Your question might already be answered
3. **Ask in discussions** - For general questions and guidance
4. **Create an issue** - For specific bugs or feature requests

### Recognition

Contributors are recognized through:

- **Contributor list** in README.md
- **Release notes** crediting contributions
- **GitHub contributor insights**
- **Special recognition** for significant contributions

---

## Advanced Contributing

### Plugin Development

Create new plugins for backends or RAG providers:

```typescript
// Create plugin directory
mkdir -p plugins/my-backend-plugin

// Implement plugin interface
export class MyBackendPlugin implements ClaudettePlugin {
  name = 'my-backend';
  version = '1.0.5';
  type = 'backend' as const;
  
  async initialize(config: PluginConfig): Promise<void> {
    // Plugin initialization
  }
}
```

### Performance Optimization

When optimizing performance:

1. **Benchmark before and after** changes
2. **Profile memory usage** for memory-intensive operations
3. **Test under load** to verify improvements
4. **Document performance characteristics**

### Security Considerations

For security-related contributions:

1. **Never commit API keys** or sensitive data
2. **Validate all inputs** from external sources
3. **Use secure defaults** in configuration
4. **Follow OWASP guidelines** for web security
5. **Report security issues privately** to maintainers

---

## Contribution Checklist

Before submitting your contribution:

### Code Quality
- [ ] TypeScript compilation passes without errors
- [ ] ESLint passes without violations
- [ ] Code follows project style guidelines
- [ ] No debugging code or console.logs in production code
- [ ] Error handling is comprehensive and appropriate

### Testing
- [ ] New functionality has comprehensive unit tests
- [ ] Integration tests added for external dependencies
- [ ] All existing tests pass
- [ ] Performance impact assessed and documented
- [ ] Edge cases and error conditions tested

### Documentation
- [ ] API documentation updated for public interfaces
- [ ] README updated for user-facing changes
- [ ] Architecture documentation updated for design changes
- [ ] Code comments added for complex logic
- [ ] Examples provided for new features

### Process
- [ ] Feature request or bug report exists and is referenced
- [ ] Commit messages follow conventional commit format
- [ ] Pull request template completed thoroughly
- [ ] Changes are focused and atomic
- [ ] Ready for maintainer review

---

**Thank you for contributing to Claudette!** 🎉

Your contributions help make AI more accessible and efficient for developers worldwide. We appreciate your time and effort in making Claudette better for everyone.

For questions about contributing, please open a discussion or reach out to the maintainers. We're here to help and support your contribution journey!