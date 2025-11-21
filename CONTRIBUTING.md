# Contributing to Fire Shield

Thank you for your interest in contributing to Fire Shield! 🚀

## About Fire Shield

Fire Shield is a lightning-fast, zero-dependency RBAC (Role-Based Access Control) library for TypeScript/JavaScript, delivering **about one hundred million permission checks per second**. Created by Kent Phung, a software engineer with 10+ years of experience in Cloud solutions, Computer Vision, and high-performance libraries.

## Ways to Contribute

### 🐛 Report Issues
- Found a bug? [Open an issue](https://github.com/khapu2906/fire-shield/issues/new?template=bug_report.md)
- Have a feature request? [Submit a feature request](https://github.com/khapu2906/fire-shield/issues/new?template=feature_request.md)

### 💻 Code Contributions
- Fix bugs or implement features
- Improve documentation
- Add tests
- Optimize performance

### 📚 Documentation
- Improve existing docs
- Add examples or tutorials
- Translate documentation
- Fix typos or clarify explanations

### 🧪 Testing
- Write unit tests
- Integration testing
- Performance benchmarking
- Compatibility testing across frameworks

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/khapu2906/fire-shield.git
cd fire-shield

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test
```

### Project Structure

```
packages/
├── core/           # Main RBAC library
├── adaptor/        # Framework-specific adaptors
│   ├── express/    # Express.js middleware
│   ├── react/      # React hooks & components
│   ├── vue/        # Vue.js composables
│   └── ...         # Other framework adaptors
└── docs/           # Documentation
```

## Development Workflow

### 1. Choose an Issue
- Check [open issues](https://github.com/khapu2906/fire-shield/issues) for tasks
- Comment on the issue to indicate you're working on it

### 2. Create a Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number-description
```

### 3. Make Changes
- Follow the existing code style
- Add tests for new features
- Update documentation if needed
- Ensure all tests pass: `npm test`

### 4. Commit Changes
```bash
git add .
git commit -m "feat: add new feature description"
```

Follow conventional commit format:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `test:` for tests
- `refactor:` for code refactoring

### 5. Push and Create PR
```bash
git push origin your-branch-name
```

Then create a Pull Request on GitHub.

## Code Guidelines

### TypeScript
- Use TypeScript for all new code
- Maintain 100% type safety
- Use strict type checking

### Testing
- Write unit tests for all new features
- Maintain high test coverage
- Use descriptive test names

### Performance
- Fire Shield prioritizes performance
- Profile changes that might impact speed
- Add benchmarks for performance-critical code

### Security
- Security is paramount for RBAC systems
- Review code for potential security issues
- Follow secure coding practices

## Pull Request Process

1. **Title**: Use clear, descriptive titles
2. **Description**: Explain what changes and why
3. **Tests**: Ensure all tests pass
4. **Documentation**: Update docs if needed
5. **Review**: Request review from maintainers

## Code of Conduct

This project follows a code of conduct to ensure a welcoming environment for all contributors. By participating, you agree to:

- Be respectful and inclusive
- Focus on constructive feedback
- Accept responsibility for mistakes
- Show empathy towards other contributors

## Recognition

Contributors will be:
- Listed in the repository's contributor list
- Mentioned in release notes
- Recognized for their valuable contributions

## Questions?

Have questions about contributing? Reach out:
- [GitHub Discussions](https://github.com/khapu2906/fire-shield/discussions)
- [Discord Community](https://discord.gg/fire-shield) (if available)
- Email: kentphung@example.com

Thank you for contributing to Fire Shield! Your help makes the library better for everyone. 🙏</content>
<parameter name="filePath">CONTRIBUTING.md