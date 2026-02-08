# CLI Tool

Fire Shield provides a command-line tool for RBAC configuration validation and permission management.

## Features

- Validate RBAC configuration files
- Check user permissions
- Test permission logic before deployment
- CI/CD integration support
- Detailed error reporting
- Strict mode validation
- Verbose output for debugging

## Installation

### Global Installation (Recommended)

```bash
npm install -g @fire-shield/cli
```

After global installation, the `fire-shield` command is available everywhere:

```bash
fire-shield --version  # 2.2.0
fire-shield info       # Show CLI information
```

### Local Installation

```bash
npm install --save-dev @fire-shield/cli
```

Use via npm scripts or npx:

```bash
npx fire-shield validate config.json
```

## Commands

### `validate` - Validate Configuration

Validate an RBAC configuration file for correctness.

**Syntax:**
```bash
fire-shield validate <file> [options]
```

**Options:**
- `-s, --strict` - Enable strict mode validation
- `-v, --verbose` - Show detailed validation output

**Examples:**

```bash
# Basic validation
fire-shield validate rbac-config.json

# Strict mode (stricter validation rules)
fire-shield validate rbac-config.json --strict

# Verbose output (show config details)
fire-shield validate rbac-config.json --verbose

# Both strict and verbose
fire-shield validate rbac-config.json -s -v
```

**What it validates:**
- ✅ Valid JSON syntax
- ✅ Required fields present (permissions, roles)
- ✅ No duplicate permission names
- ✅ No duplicate role names
- ✅ No undefined permissions in roles
- ✅ Wildcard permissions are valid
- ✅ Bit assignments are correct (if using bit system)
- ✅ Role hierarchy is valid (no circular dependencies)
- ✅ RBAC can be instantiated without errors

**Exit codes:**
- `0` - Configuration is valid
- `1` - Configuration has errors

**Output examples:**

Success:
```
🔍 Validating RBAC configuration...

✓ Configuration is valid

  Validated in 15ms
```

Success (verbose):
```
🔍 Validating RBAC configuration...

  File: /path/to/rbac-config.json
  Strict mode: disabled

✓ Configuration is valid

  Configuration details:
  • Name: my-app-rbac
  • Version: 1.0.0
  • Permissions: 12
  • Roles: 4

  Permissions:
    • user:read [bit: 1]
    • user:write [bit: 2]
    • user:delete [bit: 4]
    • post:read [bit: 8]
    ...

  Roles:
    • admin [level: 10]
      Permissions: user:*, post:*
    • editor [level: 5]
      Permissions: post:read, post:write
    ...

  Validated in 18ms
```

Error:
```
🔍 Validating RBAC configuration...

✖ Validation failed

  Duplicate permission name: 'user:read' found multiple times

  Validated in 12ms
```

### `check` - Check User Permission

Check if a user with specific roles has a permission.

**Syntax:**
```bash
fire-shield check <file> --user <userId> --roles <role1> <role2> --permission <permission> [options]
```

**Options:**
- `-u, --user <userId>` - User ID to check (required)
- `-r, --roles <roles...>` - User roles, space-separated (required)
- `-p, --permission <permission>` - Permission to check (required)
- `-v, --verbose` - Show detailed check output

**Examples:**

```bash
# Check if editor can write posts
fire-shield check config.json -u user123 -r editor -p post:write

# Check with multiple roles
fire-shield check config.json -u admin1 -r admin moderator -p user:delete

# Verbose output
fire-shield check config.json -u user1 -r editor -p post:write --verbose

# Check wildcard permission
fire-shield check config.json -u admin -r admin -p post:delete -v
```

**Exit codes:**
- `0` - User HAS the permission
- `1` - User DOES NOT have the permission or error occurred

**Output examples:**

Permission granted:
```
🔍 Checking permission...

✓ User has permission "post:write"
```

Permission granted (verbose):
```
🔍 Checking permission...

  Config file: /path/to/config.json
  User: user123
  Roles: editor
  Permission: post:write

✓ User has permission "post:write"

  User: user123
  Roles: editor
  Permission: post:write
  Result: ALLOWED
  Granted by: editor
```

Permission denied:
```
🔍 Checking permission...

✖ User does NOT have permission "user:delete"
```

Permission denied (verbose):
```
🔍 Checking permission...

  Config file: /path/to/config.json
  User: user123
  Roles: editor
  Permission: user:delete

✖ User does NOT have permission "user:delete"

  User: user123
  Roles: editor
  Permission: user:delete
  Result: DENIED
```

### `info` - Show CLI Information

Display Fire Shield CLI information and available commands.

**Syntax:**
```bash
fire-shield info
```

**Output:**
```
🔥 Fire Shield RBAC CLI
Version: 2.2.0
Author: khapu2906
License: DIB
Repository: https://github.com/kentphung92/fire-shield

Available commands:
  validate   Validate RBAC config file
  check      Check user permissions
  init       Initialize new config (coming soon)
  info       Show CLI information
```

### `init` - Initialize Configuration (Coming Soon)

Initialize a new Fire Shield RBAC configuration file.

**Syntax:**
```bash
fire-shield init [options]
```

**Options:**
- `-o, --output <file>` - Output file path (default: `fire-shield.config.json`)
- `-t, --template <template>` - Template to use: `basic` or `advanced` (default: `basic`)

**Status:** Coming in a future release

## Configuration File Format

The CLI validates and uses JSON configuration files with the following structure:

```json
{
  "name": "my-app-rbac",
  "version": "1.0.0",
  "permissions": [
    { "name": "user:read", "bit": 1 },
    { "name": "user:write", "bit": 2 },
    { "name": "user:delete", "bit": 4 },
    { "name": "post:read", "bit": 8 },
    { "name": "post:write", "bit": 16 },
    { "name": "post:delete", "bit": 32 }
  ],
  "roles": [
    {
      "name": "admin",
      "permissions": ["user:*", "post:*"],
      "level": 10
    },
    {
      "name": "editor",
      "permissions": ["post:read", "post:write"],
      "level": 5
    },
    {
      "name": "viewer",
      "permissions": ["post:read"],
      "level": 1
    }
  ]
}
```

**Fields:**

- `name` (optional) - Configuration name
- `version` (optional) - Configuration version
- `permissions` (required) - Array of permission objects
  - `name` (required) - Permission name (e.g., `"user:read"`)
  - `bit` (optional) - Bit value for bit-based system (power of 2)
- `roles` (required) - Array of role objects
  - `name` (required) - Role name
  - `permissions` (required) - Array of permission names (supports wildcards)
  - `level` (optional) - Role level for hierarchy

## CI/CD Integration

### GitHub Actions

```yaml
name: Validate RBAC Config

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Fire Shield CLI
        run: npm install -g @fire-shield/cli

      - name: Validate RBAC configuration
        run: fire-shield validate config/rbac.json --strict

      - name: Test admin permissions
        run: fire-shield check config/rbac.json -u admin -r admin -p user:delete
```

### GitLab CI

```yaml
validate-rbac:
  image: node:18
  stage: test
  script:
    - npm install -g @fire-shield/cli
    - fire-shield validate config/rbac.json --strict
    - fire-shield check config/rbac.json -u admin -r admin -p user:delete
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Validating RBAC configuration..."
npx @fire-shield/cli validate config/rbac.json --strict

if [ $? -ne 0 ]; then
  echo "❌ RBAC validation failed. Commit aborted."
  exit 1
fi

echo "✅ RBAC validation passed"
```

### npm Scripts

```json
{
  "scripts": {
    "rbac:validate": "fire-shield validate config/rbac.json",
    "rbac:validate:strict": "fire-shield validate config/rbac.json --strict",
    "rbac:check:admin": "fire-shield check config/rbac.json -u admin -r admin -p user:delete",
    "pretest": "npm run rbac:validate"
  }
}
```

## Use Cases

### 1. Validate Before Deployment

```bash
# In deployment script
fire-shield validate config/production-rbac.json --strict

if [ $? -eq 0 ]; then
  echo "✅ RBAC config valid, proceeding with deployment"
  # Deploy application
else
  echo "❌ RBAC config invalid, deployment aborted"
  exit 1
fi
```

### 2. Test Permission Logic

```bash
# Test if new role has correct permissions
fire-shield check config.json -u test-user -r new-role -p feature:access -v

# Test admin permissions
fire-shield check config.json -u admin1 -r admin -p user:delete -v
fire-shield check config.json -u admin1 -r admin -p post:delete -v
```

### 3. Debug Permission Issues

```bash
# Check why user can't access feature
fire-shield check config.json -u user123 -r editor viewer -p feature:write --verbose

# Validate config to find issues
fire-shield validate config.json --verbose
```

### 4. Automated Testing

```bash
#!/bin/bash
# test-permissions.sh

echo "Testing permission scenarios..."

# Test 1: Admin should have all permissions
fire-shield check config.json -u admin -r admin -p user:delete
fire-shield check config.json -u admin -r admin -p post:delete

# Test 2: Editor should only write posts
fire-shield check config.json -u editor -r editor -p post:write
! fire-shield check config.json -u editor -r editor -p user:delete

# Test 3: Viewer should only read
fire-shield check config.json -u viewer -r viewer -p post:read
! fire-shield check config.json -u viewer -r viewer -p post:write

echo "✅ All tests passed"
```

## Common Errors

### File Not Found

```bash
fire-shield validate non-existent.json
```

Output:
```
✖ File not found: /path/to/non-existent.json
```

**Solution:** Check the file path is correct.

### Invalid JSON

```bash
fire-shield validate invalid.json
```

Output:
```
✖ Invalid JSON
  Unexpected token } in JSON at position 123
```

**Solution:** Fix JSON syntax errors.

### Duplicate Permissions

```json
{
  "permissions": [
    { "name": "user:read", "bit": 1 },
    { "name": "user:read", "bit": 2 }  // Duplicate!
  ]
}
```

Output:
```
✖ Validation failed
  Duplicate permission name: 'user:read'
```

**Solution:** Remove duplicate permission names.

### Undefined Permission in Role

```json
{
  "permissions": [
    { "name": "user:read", "bit": 1 }
  ],
  "roles": [
    {
      "name": "admin",
      "permissions": ["user:write"]  // Not defined!
    }
  ]
}
```

Output:
```
✖ Validation failed
  Role 'admin' references undefined permission: 'user:write'
```

**Solution:** Add the permission to the permissions array or remove from role.

### Missing Required Options

```bash
fire-shield check config.json -u user1 -p post:write
# Missing --roles option
```

Output:
```
✖ At least one role is required (--roles <role1> <role2> ...)
```

**Solution:** Provide all required options.

## Tips and Best Practices

### 1. Use Strict Mode in Production

```bash
# Development
fire-shield validate config.json

# Production
fire-shield validate config.json --strict
```

### 2. Version Your Config Files

```json
{
  "name": "my-app-rbac",
  "version": "2.1.0",  // Track changes
  "permissions": [...]
}
```

### 3. Use Verbose Mode for Debugging

```bash
fire-shield validate config.json --verbose
fire-shield check config.json -u user1 -r editor -p post:write --verbose
```

### 4. Wildcard Permissions are Validated

```json
{
  "roles": [
    {
      "name": "admin",
      "permissions": ["user:*"]  // ✅ Valid
    }
  ]
}
```

The CLI validates that wildcard patterns are properly formatted.

### 5. Test in CI/CD

Always validate RBAC configs in your CI/CD pipeline:

```yaml
- run: fire-shield validate config/rbac.json --strict
```

### 6. Document Permission Checks

```bash
# Document expected results in test scripts
echo "Admin should delete users"
fire-shield check config.json -u admin -r admin -p user:delete

echo "Editor should NOT delete users"
! fire-shield check config.json -u editor -r editor -p user:delete
```

## Programmatic Usage

You can also use the CLI commands programmatically in Node.js:

```typescript
import { validateCommand, checkCommand } from '@fire-shield/cli';

// Validate config
try {
  await validateCommand('config.json', {
    strict: true,
    verbose: true
  });
  console.log('Config valid!');
} catch (error) {
  console.error('Config invalid:', error);
}

// Check permission
try {
  await checkCommand('config.json', {
    user: 'user123',
    roles: ['editor'],
    permission: 'post:write',
    verbose: false
  });
  console.log('Permission granted');
} catch (error) {
  console.error('Permission denied');
}
```

## Troubleshooting

### Command Not Found

```bash
fire-shield: command not found
```

**Solutions:**
1. Install globally: `npm install -g @fire-shield/cli`
2. Use npx: `npx @fire-shield/cli validate config.json`
3. Check PATH: `echo $PATH`

### Permission Denied

```bash
EACCES: permission denied
```

**Solution:** Use sudo for global install or install locally:
```bash
sudo npm install -g @fire-shield/cli
# or
npm install --save-dev @fire-shield/cli
```

### Version Mismatch

Ensure CLI version matches core version:

```bash
npm list @fire-shield/cli
npm list @fire-shield/core
```

**Solution:** Update both to latest:
```bash
npm install -g @fire-shield/cli@latest
npm install @fire-shield/core@latest
```

## Next Steps

- [Core API](/api/core) - RBAC API reference
- [Validation Guide](/guide/permissions) - Understanding permissions
- [CI/CD Examples](/examples/best-practices) - Integration examples

## Support

- **GitHub Issues:** [fire-shield/issues](https://github.com/kentphung92/fire-shield/issues)
- **Documentation:** [fire-shield.dev](https://fire-shield.dev)
- **NPM:** [@fire-shield/cli](https://www.npmjs.com/package/@fire-shield/cli)
