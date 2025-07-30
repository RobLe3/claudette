# Contributing to Claudette

Thank you for your interest in contributing to Claudette! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues
- Use the GitHub issue tracker to report bugs
- Provide detailed reproduction steps
- Include system information and error messages
- Search existing issues before creating new ones

### Feature Requests
- Describe the feature and its use case
- Explain why it would be valuable
- Consider implementation complexity
- Be open to discussion and alternatives

### Pull Requests
- Fork the repository and create a feature branch
- Follow the existing code style and conventions
- Add tests for new functionality
- Update documentation as needed
- Ensure all tests pass before submitting

## 🏗️ Development Setup

### Prerequisites
- Node.js 18+ 
- npm 8+
- TypeScript 4.5+
- Git

### Setup Instructions

```bash
# Clone your fork
git clone https://github.com/yourusername/claudette.git
cd claudette/src

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Development Scripts

```bash
# Development build with watch
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Run all tests
npm run test:all

# Integration tests (requires API keys)
npm run test:integration
```

## 📋 Code Standards

### TypeScript Guidelines
- Use strict TypeScript configuration
- Provide proper type annotations
- Avoid `any` types when possible
- Use interfaces for object structures

### Code Style
- Use 2 spaces for indentation
- Maximum line length of 100 characters
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Error Handling
- Use proper error types (extend Error)
- Provide helpful error messages
- Handle edge cases gracefully
- Log errors appropriately

## 🧪 Testing

### Test Structure
- Unit tests in `__tests__` directories
- Integration tests in separate files
- Mock external dependencies
- Test both success and failure cases

### Writing Tests
```typescript
describe('BackendRouter', () => {
  it('should select the most cost-effective backend', async () => {
    // Test implementation
  });
});
```

### Test Coverage
- Aim for >90% code coverage
- Test all public APIs
- Include edge cases and error conditions
- Update tests when adding features

## 🔧 Adding New Backends

### Backend Implementation
1. Extend the `BaseBackend` class
2. Implement required methods:
   - `send(request: ClaudetteRequest): Promise<ClaudetteResponse>`
   - `isAvailable(): Promise<boolean>`
   - `getAvailableModels(): string[]`
3. Add proper error handling
4. Include cost estimation logic

### Example Backend Structure
```typescript
export class NewBackend extends BaseBackend {
  constructor(config: BackendSettings) {
    super('new-backend', config);
  }

  async send(request: ClaudetteRequest): Promise<ClaudetteResponse> {
    // Implementation
  }

  protected async healthCheck(): Promise<boolean> {
    // Health check logic
  }

  getAvailableModels(): string[] {
    return ['model1', 'model2'];
  }
}
```

### Testing New Backends
- Add unit tests for all methods
- Include integration tests with real API
- Test error handling and edge cases
- Add capability assessment tests

## 📊 Documentation

### Code Documentation
- Use JSDoc for functions and classes
- Document parameters and return types
- Include usage examples
- Explain complex algorithms

### README Updates
- Update feature lists when adding functionality
- Include new configuration options
- Add usage examples
- Update performance benchmarks

### API Documentation
- Document all public interfaces
- Include TypeScript type definitions
- Provide complete examples
- Explain error conditions

## 🚀 Release Process

### Version Management
- Follow semantic versioning (semver)
- Update version in package.json
- Create detailed changelog entries
- Tag releases appropriately

### Pre-Release Checklist
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Version bumped
- [ ] Changelog updated
- [ ] Performance benchmarks run

## 💡 Best Practices

### Performance
- Profile code for bottlenecks
- Optimize hot paths
- Use efficient algorithms
- Monitor memory usage

### Security
- Never commit API keys or secrets
- Sanitize user inputs
- Use secure communication protocols
- Follow security best practices

### Compatibility
- Support Node.js LTS versions
- Test on multiple platforms
- Handle breaking changes carefully
- Maintain backward compatibility

## 🌟 Recognition

### Contributors
- All contributors are recognized in releases
- Significant contributions highlighted
- Credit given in documentation
- Community recognition

### Types of Contributions
- Code contributions
- Documentation improvements
- Bug reports and testing
- Feature suggestions
- Community support

## ❓ Getting Help

### Communication Channels
- GitHub Discussions for general questions
- GitHub Issues for bugs and features
- Email maintainers for security issues

### Resources
- [Development Documentation](docs/development/)
- [API Reference](docs/api/)
- [Testing Guide](docs/testing/)

## 📄 License

By contributing to Claudette, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Claudette! Your efforts help make AI development more accessible and efficient for everyone.