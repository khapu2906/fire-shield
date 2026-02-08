/**
 * Fire Shield RBAC CLI
 * Command-line tool for RBAC config validation and permission management
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { validateCommand } from './commands/validate';
import { checkCommand } from './commands/check';

const program = new Command();

program
  .name('fire-shield')
  .description('Fire Shield RBAC CLI tool for validation and permission management')
  .version('2.2.0');

// Validate command
program
  .command('validate')
  .description('Validate an RBAC configuration file')
  .argument('<file>', 'Path to the RBAC configuration file (JSON)')
  .option('-s, --strict', 'Enable strict mode validation')
  .option('-v, --verbose', 'Show detailed validation output')
  .action(validateCommand);

// Check command
program
  .command('check')
  .description('Check if a user has a specific permission')
  .argument('<file>', 'Path to the RBAC configuration file (JSON)')
  .option('-u, --user <userId>', 'User ID to check')
  .option('-r, --roles <roles...>', 'User roles (space-separated)')
  .option('-p, --permission <permission>', 'Permission to check')
  .option('-v, --verbose', 'Show detailed check output')
  .action(checkCommand);

// Init command (future)
program
  .command('init')
  .description('Initialize a new Fire Shield RBAC configuration')
  .option('-o, --output <file>', 'Output file path', 'fire-shield.config.json')
  .option('-t, --template <template>', 'Template to use (basic, advanced)', 'basic')
  .action(() => {
    console.log(chalk.yellow('\n⚠ This command is coming soon in a future release.'));
  });

// Info command
program
  .command('info')
  .description('Display Fire Shield RBAC information')
  .action(() => {
    console.log(chalk.bold.cyan('\n🔥 Fire Shield RBAC CLI'));
    console.log(chalk.gray('Version: 2.2.0'));
    console.log(chalk.gray('Author: khapu2906'));
    console.log(chalk.gray('License: DIB'));
    console.log(chalk.gray('Repository: https://github.com/kentphung92/fire-shield\n'));
    console.log(chalk.white('Available commands:'));
    console.log(chalk.cyan('  validate  ') + chalk.gray('Validate RBAC config file'));
    console.log(chalk.cyan('  check     ') + chalk.gray('Check user permissions'));
    console.log(chalk.cyan('  init      ') + chalk.gray('Initialize new config (coming soon)'));
    console.log(chalk.cyan('  info      ') + chalk.gray('Show CLI information'));
    console.log();
  });

export function cli() {
  program.parse(process.argv);
}

// Export for testing
export { program };
