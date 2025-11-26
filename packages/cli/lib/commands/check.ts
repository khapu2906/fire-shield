/**
 * Check command implementation
 * Checks if a user has a specific permission
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import chalk from 'chalk';
import { RBAC } from '@fire-shield/core';

interface CheckOptions {
  user?: string;
  roles?: string[];
  permission?: string;
  verbose?: boolean;
}

export async function checkCommand(file: string, options: CheckOptions) {
  try {
    // Validate required options
    if (!options.user) {
      console.log(chalk.red('\n✖ User ID is required (--user <userId>)'));
      process.exit(1);
    }

    if (!options.roles || options.roles.length === 0) {
      console.log(chalk.red('\n✖ At least one role is required (--roles <role1> <role2> ...)'));
      process.exit(1);
    }

    if (!options.permission) {
      console.log(chalk.red('\n✖ Permission is required (--permission <permission>)'));
      process.exit(1);
    }

    console.log(chalk.blue('\n🔍 Checking permission...\n'));

    // Resolve file path
    const filePath = resolve(process.cwd(), file);

    if (options.verbose) {
      console.log(chalk.gray(`  Config file: ${filePath}`));
      console.log(chalk.gray(`  User: ${options.user}`));
      console.log(chalk.gray(`  Roles: ${options.roles.join(', ')}`));
      console.log(chalk.gray(`  Permission: ${options.permission}\n`));
    }

    // Read and parse config file
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

    // Initialize RBAC
    let rbac: RBAC;
    try {
      rbac = new RBAC({
        preset: config,
        useBitSystem: true
      });
    } catch (error: any) {
      console.log(chalk.red('✖ Failed to initialize RBAC'));
      if (options.verbose) {
        console.log(chalk.gray(`  ${error.message}`));
      }
      process.exit(1);
    }

    // Create user object
    const user = {
      id: options.user,
      roles: options.roles
    };

    // Check permission
    const hasPermission = rbac.hasPermission(user, options.permission);

    // Display result
    if (hasPermission) {
      console.log(chalk.green(`✓ User has permission "${options.permission}"`));

      if (options.verbose) {
        console.log(chalk.gray(`\n  User: ${options.user}`));
        console.log(chalk.gray(`  Roles: ${options.roles.join(', ')}`));
        console.log(chalk.gray(`  Permission: ${options.permission}`));
        console.log(chalk.gray(`  Result: ${chalk.green('ALLOWED')}`));

        // Show which roles grant the permission
        const grantingRoles: string[] = [];
        for (const role of options.roles) {
          const testUser = { id: options.user, roles: [role] };
          if (rbac.hasPermission(testUser, options.permission)) {
            grantingRoles.push(role);
          }
        }

        if (grantingRoles.length > 0) {
          console.log(chalk.gray(`  Granted by: ${grantingRoles.join(', ')}`));
        }
      }
    } else {
      console.log(chalk.red(`✖ User does NOT have permission "${options.permission}"`));

      if (options.verbose) {
        console.log(chalk.gray(`\n  User: ${options.user}`));
        console.log(chalk.gray(`  Roles: ${options.roles.join(', ')}`));
        console.log(chalk.gray(`  Permission: ${options.permission}`));
        console.log(chalk.gray(`  Result: ${chalk.red('DENIED')}`));
      }

      process.exit(1);
    }

    console.log();
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
