o# @fire-shield/cli

Command-line interface for Fire Shield RBAC.

## Installation

```bash
# npm
npm install -g @fire-shield/cli

# yarn
yarn global add @fire-shield/cli

# pnpm
pnpm add -g @fire-shield/cli
```

## Usage

### Validate Configuration

Validate an RBAC configuration file:

```bash
fire-shield validate ./fire-shield.config.json
```

With options:

```bash
fire-shield validate ./config.json --strict --verbose
```

Options:
- `-s, --strict` - Enable strict mode validation
- `-v, --verbose` - Show detailed validation output

### Check Permission

Check if a user has a specific permission:

```bash
fire-shield check ./config.json \
  --user john123 \
  --roles admin editor \
  --permission user:write
```

Options:
- `-u, --user <userId>` - User ID to check
- `-r, --roles <roles...>` - User roles (space-separated)
- `-p, --permission <permission>` - Permission to check
- `-v, --verbose` - Show detailed check output

### CLI Information

Display CLI information:

```bash
fire-shield info
```

### Initialize Configuration (Coming Soon)

Initialize a new Fire Shield configuration:

```bash
fire-shield init
```

## Examples

### Basic Validation

```bash
fire-shield validate ./rbac-config.json
```

Output:
```
🔍 Validating RBAC configuration...

✓ Configuration is valid

  Validated in 12ms
```

### Verbose Validation

```bash
fire-shield validate ./rbac-config.json --verbose
```

Output:
```
🔍 Validating RBAC configuration...

  File: /path/to/rbac-config.json
  Strict mode: disabled

✓ Configuration is valid

  Configuration details:
  • Name: my-rbac
  • Version: 1.0.0
  • Permissions: 10
  • Roles: 4

  Permissions:
    • user:read [bit: 1]
    • user:write [bit: 2]
    • user:delete [bit: 4]
    ...

  Roles:
    • viewer [level: 1]
      Permissions: user:read, post:read
    • editor [level: 5]
      Permissions: user:read, user:write, post:read, post:write
    ...

  Validated in 15ms
```

### Permission Check

```bash
fire-shield check ./config.json \
  --user alice \
  --roles editor \
  --permission user:write \
  --verbose
```

Output:
```
🔍 Checking permission...

  Config file: /path/to/config.json
  User: alice
  Roles: editor
  Permission: user:write

✓ User has permission "user:write"

  User: alice
  Roles: editor
  Permission: user:write
  Result: ALLOWED
  Granted by: editor
```

## Configuration File Format

Fire Shield CLI expects a JSON configuration file with this structure:

```json
{
  "name": "my-rbac",
  "version": "1.0.0",
  "permissions": [
    { "name": "user:read", "bit": 1 },
    { "name": "user:write", "bit": 2 },
    { "name": "user:delete", "bit": 4 }
  ],
  "roles": [
    {
      "name": "viewer",
      "permissions": ["user:read"],
      "level": 1
    },
    {
      "name": "editor",
      "permissions": ["user:read", "user:write"],
      "level": 5
    }
  ]
}
```

## Exit Codes

- `0` - Success
- `1` - Validation/check failed or error occurred

## License

DIB © khapu2906
