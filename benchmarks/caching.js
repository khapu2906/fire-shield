/**
 * Permission Caching Performance Benchmarks
 * v2.2.0 - Caching enabled vs disabled
 */

import Benchmark from 'benchmark';
import { RBAC } from '@fire-shield/core';
import chalk from 'chalk';

console.log(chalk.bold.cyan('\nPermission Caching Benchmarks (v2.2.0)\n'));

// Setup RBAC without cache
const rbacNoCache = new RBAC({
  useBitSystem: true,
  enableCache: false,
  enableWildcards: true
});

rbacNoCache.createRole('viewer', ['posts:read', 'comments:read']);
rbacNoCache.createRole('editor', ['posts:read', 'posts:write', 'comments:read', 'comments:write']);
rbacNoCache.createRole('admin', ['posts:*', 'comments:*', 'users:*']);

// Setup RBAC with cache
const rbacWithCache = new RBAC({
  useBitSystem: true,
  enableCache: true,
  cacheOptions: {
    ttl: 60000,        // 1 minute
    maxSize: 10000,
    cleanupInterval: 30000
  },
  enableWildcards: true
});

rbacWithCache.createRole('viewer', ['posts:read', 'comments:read']);
rbacWithCache.createRole('editor', ['posts:read', 'posts:write', 'comments:read', 'comments:write']);
rbacWithCache.createRole('admin', ['posts:*', 'comments:*', 'users:*']);

const user = { id: 'user1', roles: ['editor'] };
const adminUser = { id: 'admin1', roles: ['admin'] };

// Warm up cache
for (let i = 0; i < 100; i++) {
  rbacWithCache.hasPermission(user, 'posts:write');
  rbacWithCache.hasPermission(user, 'posts:read');
  rbacWithCache.hasPermission(adminUser, 'users:delete');
}

console.log(chalk.gray('Cache warmed up. Starting benchmarks...\n'));

// Create benchmark suite
const suite = new Benchmark.Suite();

suite
  .add('No Cache: Single permission check', function () {
    rbacNoCache.hasPermission(user, 'posts:write');
  })
  .add('With Cache: Single permission check (cached)', function () {
    rbacWithCache.hasPermission(user, 'posts:write');
  })
  .add('No Cache: Wildcard permission check', function () {
    rbacNoCache.hasPermission(adminUser, 'posts:delete');
  })
  .add('With Cache: Wildcard permission check (cached)', function () {
    rbacWithCache.hasPermission(adminUser, 'posts:delete');
  })
  .add('No Cache: Multiple checks', function () {
    rbacNoCache.hasPermission(user, 'posts:read');
    rbacNoCache.hasPermission(user, 'posts:write');
    rbacNoCache.hasPermission(user, 'comments:read');
  })
  .add('With Cache: Multiple checks (cached)', function () {
    rbacWithCache.hasPermission(user, 'posts:read');
    rbacWithCache.hasPermission(user, 'posts:write');
    rbacWithCache.hasPermission(user, 'comments:read');
  })
  .add('Cache invalidation: invalidateUserCache', function () {
    rbacWithCache.invalidateUserCache('user1');
  })
  .add('Cache stats: getCacheStats', function () {
    rbacWithCache.getCacheStats();
  })
  .on('cycle', function (event) {
    const benchmark = event.target;
    const ops = benchmark.hz.toLocaleString('en-US', {
      maximumFractionDigits: 0,
    });

    const isCache = benchmark.name.includes('With Cache');
    const color = isCache ? chalk.green : chalk.blue;

    console.log(
      `${color('✓')} ${chalk.bold(benchmark.name)}: ${chalk.yellow(ops)} ops/sec`
    );
  })
  .on('complete', function () {
    console.log(chalk.bold.green('\n✨ Benchmark Complete!\n'));

    const cacheStats = rbacWithCache.getCacheStats();
    if (cacheStats) {
      console.log(chalk.bold('Cache Statistics:'));
      console.log(`  Hits: ${chalk.green(cacheStats.hits.toLocaleString())}`);
      console.log(`  Misses: ${chalk.yellow(cacheStats.misses.toLocaleString())}`);
      console.log(`  Hit Rate: ${chalk.cyan((cacheStats.hitRate * 100).toFixed(1) + '%')}`);
      console.log(`  Cache Size: ${chalk.blue(cacheStats.size)} / ${cacheStats.maxSize}\n`);
    }

    // Calculate improvement
    const noCacheTests = this.filter(b => b.name.includes('No Cache'));
    const cacheTests = this.filter(b => b.name.includes('With Cache') && !b.name.includes('invalidation') && !b.name.includes('stats'));

    if (noCacheTests.length > 0 && cacheTests.length > 0) {
      const avgNoCache = noCacheTests.reduce((sum, b) => sum + b.hz, 0) / noCacheTests.length;
      const avgCache = cacheTests.reduce((sum, b) => sum + b.hz, 0) / cacheTests.length;
      const improvement = ((avgCache - avgNoCache) / avgNoCache * 100).toFixed(1);

      console.log(chalk.bold('Performance Improvement:'));
      console.log(`  No Cache: ${chalk.blue(avgNoCache.toLocaleString('en-US', { maximumFractionDigits: 0 }))} ops/sec`);
      console.log(`  With Cache: ${chalk.green(avgCache.toLocaleString('en-US', { maximumFractionDigits: 0 }))} ops/sec`);
      console.log(`  ${chalk.bold('Speed Up:')} ${chalk.cyan(improvement + 'x')} faster with caching\n`);
    }
  })
  .run({ async: false });
