import { RBAC } from '@fire-shield/core';

const config = {
  name: 'test-rbac',
  version: '1.0.0',
  permissions: [
    { name: 'user:read', bit: 1 },
    { name: 'user:write', bit: 2 },
  ],
  roles: [
    { name: 'viewer', permissions: ['user:read'], level: 1 },
    { name: 'editor', permissions: ['user:read', 'user:write'], level: 5 },
  ],
};

console.log('Testing RBAC.validateConfig...');
try {
  RBAC.validateConfig(config);
  console.log('✓ validateConfig passed');
} catch (error) {
  console.log('✗ validateConfig failed:', error.message);
  process.exit(1);
}

console.log('\nTesting RBAC instantiation...');
try {
  new RBAC({
    preset: config,
    strictMode: false,
    useBitSystem: true
  });
  console.log('✓ RBAC instantiation passed');
} catch (error) {
  console.log('✗ RBAC instantiation failed:', error.message);
  console.log(error.stack);
  process.exit(1);
}

console.log('\n✓ All tests passed!');
