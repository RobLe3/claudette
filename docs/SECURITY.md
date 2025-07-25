# Security Policy

## Supported Versions

Use this section to tell people about which versions of your project are
currently being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |
| 1.x.x   | :x:                |

## Reporting a Vulnerability

### How to Report

If you discover a security vulnerability within Claude Flow, please send an email to security@claude-flow.dev (or create a private security advisory on GitHub). All security vulnerabilities will be promptly addressed.

### What to Include

Please include the following information in your report:

- Type of issue (e.g. buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

### Response Timeline

We will acknowledge receipt of your vulnerability report within 48 hours, and will send a more detailed response within 72 hours indicating the next steps in handling your report.

### Safe Harbor

We support safe harbor for security researchers who:
- Make a good faith effort to avoid privacy violations, destruction of data, and interruption or degradation of our services
- Only interact with accounts you own or with explicit permission of the account holder
- Do not access non-public areas of our infrastructure
- Report vulnerabilities as soon as you discover them

## Security Best Practices

### For Users

- Keep your Claude Flow installation up to date
- Use environment variables for sensitive configuration
- Never commit API keys or credentials to the repository
- Use private repositories for sensitive projects
- Enable two-factor authentication on your GitHub account

### For Developers

- Follow secure coding practices
- Validate all inputs and sanitize outputs
- Use parameterized queries for database interactions
- Implement proper error handling without exposing sensitive information
- Regular security audits and dependency updates

## Dependencies Security

We regularly monitor our dependencies for security vulnerabilities using:
- GitHub Security Advisories
- Snyk vulnerability scanning
- npm audit for Node.js dependencies
- pip-audit for Python dependencies

## Data Handling

### What We Store

- Agent coordination data (temporary, session-based)
- Performance metrics and usage statistics
- Error logs for debugging purposes
- User configuration preferences

### What We Don't Store

- API keys or authentication tokens
- Source code content (unless explicitly cached)
- Personal identifiable information
- Payment information

### Data Retention

- Session data: Cleared after 24 hours
- Performance metrics: Retained for 30 days
- Error logs: Retained for 7 days
- Configuration: Retained until manually deleted

## Encryption

### In Transit

- All API communications use HTTPS/TLS 1.2+
- WebSocket connections use WSS
- GitHub API calls use authenticated HTTPS

### At Rest

- Local configuration files are stored in user directories with appropriate permissions
- Temporary session data is encrypted using AES-256
- No sensitive data is stored permanently without user consent

## Access Control

### Authentication

- GitHub OAuth for repository access
- API key authentication for Claude services
- Local file system permissions for configuration

### Authorization

- Principle of least privilege
- Role-based access for different agent types
- Configurable permissions for different operations

## Incident Response

In case of a security incident:

1. **Immediate containment** - Stop the affected services
2. **Assessment** - Determine the scope and impact
3. **Notification** - Inform affected users within 24 hours
4. **Remediation** - Deploy fixes and security updates
5. **Post-incident review** - Document lessons learned

## Contact

For security-related questions or concerns:
- Email: security@claude-flow.dev
- GitHub Security Advisories: [Private reporting](https://github.com/RobLe3/claude-flow/security/advisories)
- Emergency contact: Use GitHub issues with `security` label for urgent matters

## Acknowledgments

We thank the security research community for their responsible disclosure of vulnerabilities and their contributions to keeping Claude Flow secure.