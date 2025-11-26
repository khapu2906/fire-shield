/**
 * Deny Permissions Performance Benchmarks
 * v2.2.0 - New deny permissions feature
 */

import Benchmark from 'benchmark';
import { RBAC } from '@fire-shield/core';
import chalk from 'chalk';

console.log(chalk.bold.cyan('\nDeny Permissions Benchmarks (v2.2.0)\n'));

// Setup RBAC
const rbac = new RBAC({
  useBitSystem: true,
  enableCache: false,
  enableWildcards: true
});

rbac.createRole('admin', ['posts:*', 'comments:*', 'users:*']);
rbac.createRole('editor', ['posts:read', 'posts:write', 'comments:read', 'comments:write']);

const adminUser = { id: 'admin1', roles: ['admin'] };
const editorUser = { id: 'editor1', roles: ['editor'] };
const restrictedAdmin = { id: 'admin2', roles: ['admin'] };

// Add some denied permissions
rbac.denyPermission('admin2', 'users:delete');
rbac.denyPermission('admin2', 'posts:delete');

// Create benchmark suite
const suite = new Benchmark.Suite();

suite
  .add('Permission check - no denies', function () {
    rbac.hasPermission(adminUser, 'posts:write');
  })
  .add('Permission check - with deny list (not denied)', function () {
    rbac.hasPermission(restrictedAdmin, 'posts:write');
  })
  .add('Permission check - with deny list (denied)', function () {
    rbac.hasPermission(restrictedAdmin, 'users:delete');
  })
  .add('denyPermission - add deny', function () {
    rbac.denyPermission('temp-user', 'posts:delete');
    rbac.allowPermission('temp-user', 'posts:delete'); // Clean up
  })
  .add('allowPermission - remove deny', function () {
    rbac.denyPermission('temp-user2', 'posts:delete');
    rbac.allowPermission('temp-user2', 'posts:delete');
  })
  .add('getDeniedPermissions - get deny list', function () {
    rbac.getDeniedPermissions('admin2');
  })
  .add('clearDeniedPermissions - clear all denies', function () {
    rbac.denyPermission('temp-user3', 'posts:delete');
    rbac.denyPermission('temp-user3', 'users:delete');
    rbac.clearDeniedPermissions('temp-user3');
  })
  .add('Wildcard deny check - exact match', function () {
    rbac.denyPermission('wildcard-user', 'admin:*');
    rbac.hasPermission({ id: 'wildcard-user', roles: ['admin'] }, 'admin:access');
    rbac.clearDeniedPermissions('wildcard-user');
  })
  .on('cycle', function (event) {
    const benchmark = event.target;
    const ops = benchmark.hz.toLocaleString('en-US', {
      maximumFractionDigits: 0,
    });

    console.log(
      `${chalk.green('✓')} ${chalk.bold(benchmark.name)}: ${chalk.yellow(ops)} ops/sec`
    );
  })
  .on('complete', function () {
    console.log(chalk.bold.green('\n✨ Benchmark Complete!\n'));

    const fastest = this.filter('fastest').map('name');
    const slowest = this.filter('slowest').map('name');

    console.log(chalk.bold('Results:'));
    console.log(`  Fastest: ${chalk.cyan(fastest[0])}`);
    console.log(`  Slowest: ${chalk.yellow(slowest[0])}\n`);

    console.log(chalk.dim('Note: Deny permissions add minimal overhead to permission checks'));
  })
  .run({ async: false });
