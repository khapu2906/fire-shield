/**
 * Permission Checking Performance Benchmarks
 * v2.2.0 - Bit-based vs Legacy comparison
 */

import Benchmark from 'benchmark';
import { RBAC } from '@fire-shield/core';
import chalk from 'chalk';

console.log(chalk.bold.cyan('\nPermission Checking Benchmarks (Bit-based vs Legacy)\n'));

// Setup Bit-based RBAC
const rbacBit = new RBAC({
  useBitSystem: true,
  enableCache: false,
  enableWildcards: true
});

rbacBit.createRole('viewer', ['posts:read', 'comments:read']);
rbacBit.createRole('editor', ['posts:read', 'posts:write', 'comments:read', 'comments:write']);
rbacBit.createRole('admin', ['posts:*', 'comments:*', 'users:*']);

// Setup Legacy RBAC
const rbacLegacy = new RBAC({
  useBitSystem: false,
  enableCache: false,
  enableWildcards: true
});

rbacLegacy.createRole('viewer', ['posts:read', 'comments:read']);
rbacLegacy.createRole('editor', ['posts:read', 'posts:write', 'comments:read', 'comments:write']);
rbacLegacy.createRole('admin', ['posts:*', 'comments:*', 'users:*']);

const user = { id: 'user1', roles: ['editor'] };
const adminUser = { id: 'admin1', roles: ['admin'] };

// Create benchmark suite
const suite = new Benchmark.Suite();

suite
  .add('Bit-based: Single permission check', function () {
    rbacBit.hasPermission(user, 'posts:write');
  })
  .add('Legacy: Single permission check', function () {
    rbacLegacy.hasPermission(user, 'posts:write');
  })
  .add('Bit-based: Wildcard permission check', function () {
    rbacBit.hasPermission(adminUser, 'posts:delete');
  })
  .add('Legacy: Wildcard permission check', function () {
    rbacLegacy.hasPermission(adminUser, 'posts:delete');
  })
  .add('Bit-based: Multiple permission checks', function () {
    rbacBit.hasAllPermissions(user, ['posts:read', 'posts:write', 'comments:read']);
  })
  .add('Legacy: Multiple permission checks', function () {
    rbacLegacy.hasAllPermissions(user, ['posts:read', 'posts:write', 'comments:read']);
  })
  .add('Bit-based: Any permission check', function () {
    rbacBit.hasAnyPermission(user, ['admin:access', 'posts:write', 'users:delete']);
  })
  .add('Legacy: Any permission check', function () {
    rbacLegacy.hasAnyPermission(user, ['admin:access', 'posts:write', 'users:delete']);
  })
  .on('cycle', function (event) {
    const benchmark = event.target;
    const ops = benchmark.hz.toLocaleString('en-US', {
      maximumFractionDigits: 0,
    });

    const isBit = benchmark.name.includes('Bit-based');
    const color = isBit ? chalk.green : chalk.blue;

    console.log(
      `${color('✓')} ${chalk.bold(benchmark.name)}: ${chalk.yellow(ops)} ops/sec`
    );
  })
  .on('complete', function () {
    console.log(chalk.bold.green('\n✨ Benchmark Complete!\n'));

    const bitTests = this.filter(b => b.name.includes('Bit-based'));
    const legacyTests = this.filter(b => b.name.includes('Legacy'));

    const avgBit = bitTests.reduce((sum, b) => sum + b.hz, 0) / bitTests.length;
    const avgLegacy = legacyTests.reduce((sum, b) => sum + b.hz, 0) / legacyTests.length;
    const improvement = ((avgBit - avgLegacy) / avgLegacy * 100).toFixed(1);

    console.log(chalk.bold('Average Performance:'));
    console.log(`  Bit-based: ${chalk.green(avgBit.toLocaleString('en-US', { maximumFractionDigits: 0 }))} ops/sec`);
    console.log(`  Legacy: ${chalk.blue(avgLegacy.toLocaleString('en-US', { maximumFractionDigits: 0 }))} ops/sec`);
    console.log(`  ${chalk.bold('Improvement:')} ${chalk.cyan(improvement + '%')} faster\n`);
  })
  .run({ async: false });
