# Contributing to MorphBox

Thank you for your interest in contributing to MorphBox! We're excited to have you join our community of developers exploring AI-assisted development.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Submitting Changes](#submitting-changes)
- [Community](#community)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. By participating in this project, you agree to:

- Be respectful and considerate in all interactions
- Welcome newcomers and help them get started
- Focus on constructive criticism and collaborative problem-solving
- Respect differing viewpoints and experiences
- Accept responsibility and apologize when mistakes are made

Unacceptable behavior includes harassment, discriminatory language, personal attacks, and any conduct that creates an unsafe environment.

## Getting Started

### Prerequisites

- Docker Desktop or Docker Engine (20.10+)
- Node.js (18.0.0+)
- Git
- Claude Code (recommended for all code modifications)

### First Time Contributors

New to open source? We love helping first-time contributors! Look for issues labeled:
- `good first issue` - Simple fixes to get you started
- `help wanted` - Areas where we need community help
- `documentation` - Help improve our docs

## Development Setup

1. **Fork and Clone**
   ```bash
   # Fork the repository on GitHub, then:
   git clone https://github.com/YOUR_USERNAME/morphbox.git
   cd morphbox
   ```

2. **Install Dependencies**
   ```bash
   cd web
   npm install
   ```

3. **Set Up Development Environment**
   ```bash
   # Copy example environment file
   cp .env.example .env.local

   # Add your Anthropic API key (if available)
   # ANTHROPIC_API_KEY=your-key-here
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   # Access at http://localhost:8008
   ```

5. **Run Type Checking**
   ```bash
   npm run check
   ```

## How to Contribute

### Reporting Bugs

Before creating a bug report:
1. Check [existing issues](https://github.com/MicahBly/morphbox/issues) to avoid duplicates
2. Verify you're using the latest version
3. Collect relevant information (error messages, logs, system info)

When reporting:
- Use a clear, descriptive title
- Describe expected vs actual behavior
- Provide steps to reproduce
- Include relevant code snippets or screenshots
- Specify your environment (OS, Docker version, Node version)

### Suggesting Features

We welcome feature suggestions! Please:
1. Check if it's already suggested in [issues](https://github.com/MicahBly/morphbox/issues) or [discussions](https://github.com/MicahBly/morphbox/discussions)
2. Explain the problem your feature solves
3. Describe your proposed solution
4. Consider alternative approaches
5. Include mockups or examples if applicable

### Improving Documentation

Documentation contributions are highly valued! You can:
- Fix typos and clarify confusing sections
- Add examples and tutorials
- Translate documentation
- Improve code comments
- Update outdated information

## Development Workflow

### Branch Naming

Use descriptive branch names:
- `feat/add-new-panel` - New features
- `fix/terminal-resize-bug` - Bug fixes
- `docs/improve-setup-guide` - Documentation
- `refactor/cleanup-websocket` - Code refactoring
- `test/add-queue-tests` - Test additions

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code formatting (no logic changes)
- `refactor:` Code restructuring
- `test:` Test additions or fixes
- `chore:` Maintenance tasks
- `perf:` Performance improvements

**Examples:**
```bash
feat(queue): add priority levels to prompt queue
fix(terminal): resolve resize event handler memory leak
docs(api): update WebSocket connection examples
```

## Code Standards

### TypeScript/JavaScript

- Use TypeScript for all new code when possible
- Follow existing code patterns in the file/module
- Use meaningful variable and function names
- Keep functions focused and small
- Add JSDoc comments for public APIs

### Svelte Components

- Follow Svelte best practices and conventions
- Keep components focused on a single responsibility
- Use TypeScript for props and events
- Leverage Svelte stores for state management
- Ensure accessibility (ARIA attributes, keyboard navigation)

### CSS/Styling

- Use CSS custom properties for theming
- Follow mobile-first responsive design
- Maintain consistent spacing and sizing
- Ensure dark mode compatibility

### Code Formatting

While we don't enforce strict formatting rules, please:
- Use consistent indentation (tabs in this project)
- Keep line length reasonable (~100 chars)
- Remove trailing whitespace
- End files with a newline

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- path/to/test

# Run in watch mode
npm test -- --watch
```

### Writing Tests

- Write tests for new features and bug fixes
- Follow existing test patterns
- Use descriptive test names
- Test edge cases and error conditions
- Mock external dependencies appropriately

## Documentation

### Code Documentation

- Add JSDoc comments for public functions/classes
- Include parameter types and return values
- Provide usage examples for complex APIs
- Document any non-obvious behavior

### README and Guides

- Keep README.md focused on quick start and overview
- Add detailed guides in `/docs` directory
- Include code examples and screenshots
- Update documentation when changing features

## Submitting Changes

### Pull Request Process

1. **Before Starting**
   - Discuss major changes in an issue first
   - Ensure no one else is working on the same issue

2. **Create Your PR**
   - Fork the repository
   - Create a feature branch from `main`
   - Make your changes using Claude Code
   - Commit with clear, conventional messages
   - Push to your fork

3. **PR Title and Description**
   - Use a clear, descriptive title
   - Reference related issues (#123)
   - Describe what changed and why
   - Include screenshots for UI changes
   - List any breaking changes

4. **PR Checklist**
   - [ ] Code follows project conventions
   - [ ] Tests pass locally
   - [ ] Documentation updated if needed
   - [ ] No sensitive data (API keys, passwords)
   - [ ] Tested in Docker environment
   - [ ] Considered backward compatibility

5. **Review Process**
   - Maintainers will review within 3-5 days
   - Address feedback constructively
   - Make requested changes in new commits
   - Re-request review when ready

### What Happens Next

After approval:
1. Maintainer merges your PR
2. Your contribution appears in the changelog
3. You're credited as a contributor
4. Changes deploy in the next release

## Community

### Getting Help

- **GitHub Discussions**: Ask questions and share ideas
- **Issues**: Report bugs and request features
- **Discord**: Join the Claude Developers Discord for real-time chat

### Recognition

We value all contributions! Contributors are:
- Listed in our contributor graph
- Mentioned in release notes
- Part of shaping MorphBox's future

### Maintainer Responsibilities

Project maintainers:
- Review PRs promptly and constructively
- Provide clear contribution guidelines
- Foster an inclusive community
- Make final decisions on project direction
- Handle security issues responsibly

## Security

### Reporting Security Issues

**DO NOT** create public issues for security vulnerabilities.

Instead:
1. Email security concerns to the maintainers
2. Include detailed description and reproduction steps
3. Allow time for patch before public disclosure

### Security Best Practices

When contributing:
- Never commit API keys or secrets
- Validate and sanitize user inputs
- Follow principle of least privilege
- Consider Docker container isolation
- Review dependencies for vulnerabilities

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (Apache-2.0).

## Questions?

Still have questions? Feel free to:
- Open a [discussion](https://github.com/MicahBly/morphbox/discussions)
- Ask in an [issue](https://github.com/MicahBly/morphbox/issues)
- Reach out on Discord

Thank you for contributing to MorphBox! Your efforts help make AI-assisted development accessible to everyone. 🚀