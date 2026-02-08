/**
 * Validate command implementation
 * Validates an RBAC configuration file for correctness
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import chalk from 'chalk';
import { RBAC } from '@fire-shield/core';

interface ValidateOptions {
  strict?: boolean;
  verbose?: boolean;
}

export async function validateCommand(file: string, options: ValidateOptions) {
  const startTime = Date.now();

  try {
    console.log(chalk.blue('\n🔍 Validating RBAC configuration...\n'));

    // Resolve file path
    const filePath = resolve(process.cwd(), file);

    if (options.verbose) {
      console.log(chalk.gray(`  File: ${filePath}`));
      console.log(chalk.gray(`  Strict mode: ${options.strict ? 'enabled' : 'disabled'}\n`));
    }

    // Read config file
    let fileContent: string;
    try {
      fileContent = readFileSync(filePath, 'utf-8');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log(chalk.red(`✖ File not found: ${filePath}`));
        process.exit(1);
      }
      throw error;
    }

    // Parse JSON
    let config: any;
    try {
      config = JSON.parse(fileContent);
    } catch (error: any) {
      console.log(chalk.red('✖ Invalid JSON'));
      if (options.verbose) {
        console.log(chalk.gray(`  ${error.message}`));
      }
      process.exit(1);
    }

    // Validate config and instantiate RBAC with performance optimizations
    try {
      const rbac = RBAC.fromJSONConfig(JSON.stringify(config), {
        strictMode: options.strict,
        useBitSystem: true,
        enableCache: true,      // Enable performance optimization
        optimizeMemory: true    // Enable memory optimization
      });
    } catch (error: any) {
      console.log(chalk.red('✖ Configuration is invalid\n'));
      console.log(chalk.red(`  ${error.message}`));
      process.exit(1);
    }

    // Success
    const duration = Date.now() - startTime;
    console.log(chalk.green('✓ Configuration is valid'));

    if (options.verbose) {
      console.log(chalk.gray(`\n  Configuration details:`));
      console.log(chalk.gray(`  • Name: ${config.name || 'N/A'}`));
      console.log(chalk.gray(`  • Version: ${config.version || 'N/A'}`));
      console.log(chalk.gray(`  • Permissions: ${config.permissions?.length || 0}`));
      console.log(chalk.gray(`  • Roles: ${config.roles?.length || 0}`));

      // Show permissions
      if (config.permissions && config.permissions.length > 0) {
        console.log(chalk.gray(`\n  Permissions:`));
        config.permissions.forEach((perm: any) => {
          const bitInfo = perm.bit !== undefined ? chalk.dim(` [bit: ${perm.bit}]`) : '';
          console.log(chalk.gray(`    • ${perm.name}${bitInfo}`));
        });
      }

      // Show roles
      if (config.roles && config.roles.length > 0) {
        console.log(chalk.gray(`\n  Roles:`));
        config.roles.forEach((role: any) => {
          const level = role.level !== undefined ? chalk.dim(` [level: ${role.level}]`) : '';
          console.log(chalk.gray(`    • ${role.name}${level}`));
          if (role.permissions && role.permissions.length > 0) {
            console.log(chalk.gray(`      Permissions: ${role.permissions.join(', ')}`));
          }
        });
      }
    }

    console.log(chalk.gray(`\n  Validated in ${duration}ms\n`));
    process.exit(0);
  } catch (error: any) {
    // Re-throw process.exit errors (for testing)
    if (error.message?.includes('Process.exit called with code')) {
      throw error;
    }

    console.log(chalk.red('\n✖ Unexpected error'));
    if (options.verbose) {
      console.log(chalk.gray(`  ${error.message}`));
      console.log(chalk.gray(`  ${error.stack}`));
    }
    process.exit(1);
  }
}
