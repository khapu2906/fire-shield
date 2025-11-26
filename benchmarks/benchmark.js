/**
 * Fire Shield Core Performance Benchmarks
 * v2.2.0 - Updated for new API
 */

import Benchmark from 'benchmark';
import { RBAC } from '@fire-shield/core';
import chalk from 'chalk';

console.log(chalk.bold.cyan('\nFire Shield RBAC Performance Benchmarks v2.2.0\n'));

// Setup RBAC with v2.2.0 API
const rbac = new RBAC({
  useBitSystem: true,
  enableCache: false, // Test without cache first
  enableWildcards: true
});

// Create roles
rbac.createRole('viewer', ['posts:read', 'comments:read']);
rbac.createRole('editor', ['posts:read', 'posts:write', 'comments:read', 'comments:write']);
rbac.createRole('admin', ['posts:*', 'comments:*', 'users:*', 'admin:*']);

const user = { id: 'user1', roles: ['editor'] };

// Create benchmark suite
const suite = new Benchmark.Suite();

suite
  .add('hasPermission - direct match', function () {
    rbac.hasPermission(user, 'posts:read');
  })
  .add('hasPermission - wildcard match', function () {
    rbac.hasPermission(user, 'posts:write');
  })
  .add('hasPermission - denied (no permission)', function () {
    rbac.hasPermission(user, 'users:delete');
  })
  .add('hasAllPermissions - multiple checks', function () {
    rbac.hasAllPermissions(user, ['posts:read', 'posts:write', 'comments:read']);
  })
  .add('hasAnyPermission - multiple checks', function () {
    rbac.hasAnyPermission(user, ['posts:read', 'users:delete', 'admin:access']);
  })
  .add('authorize - permission check', function () {
    rbac.authorize(user, 'posts:write');
  })
  .add('getRolePermissions - role lookup', function () {
    rbac.getRolePermissions('editor');
  })
  .on('cycle', function (event) {
    const benchmark = event.target;
    const ops = benchmark.hz.toLocaleString('en-US', {
      maximumFractionDigits: 0,
    });

    console.log(
      `${chalk.green('✓')} ${chalk.bold(benchmark.name)}: ${chalk.yellow(
        ops
      )} ops/sec`
    );
  })
  .on('complete', function () {
    console.log(
      chalk.bold.green('\n✨ Benchmark Complete!\n')
    );

    const fastest = this.filter('fastest').map('name');
    console.log(chalk.bold('Fastest: ') + chalk.cyan(fastest[0]));
  })
  .run({ async: false });
