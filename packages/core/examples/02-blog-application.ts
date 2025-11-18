/**
 * Blog Application Example
 *
 * This example demonstrates a complete blog system with:
 * - Multiple content types (posts, comments, pages)
 * - Different user roles (guest, author, editor, admin)
 * - Role hierarchy
 * - Resource-based permissions
 */

import { RBAC } from '../lib/index';

console.log('=== Blog Application Example ===\n');

// Initialize RBAC
const rbac = new RBAC({ useBitSystem: true });

// Register permissions with manual bits for persistence
console.log('Setting up permissions...');

// Post permissions
rbac.registerPermission('post:read', 1);      // 2^0
rbac.registerPermission('post:create', 2);    // 2^1
rbac.registerPermission('post:edit', 4);      // 2^2
rbac.registerPermission('post:delete', 8);    // 2^3
rbac.registerPermission('post:publish', 16);  // 2^4

// Comment permissions
rbac.registerPermission('comment:read', 32);     // 2^5
rbac.registerPermission('comment:create', 64);   // 2^6
rbac.registerPermission('comment:moderate', 128); // 2^7

// Page permissions
rbac.registerPermission('page:read', 256);    // 2^8
rbac.registerPermission('page:edit', 512);    // 2^9

// Admin permissions
rbac.registerPermission('analytics:view', 1024);  // 2^10
rbac.registerPermission('settings:manage', 2048); // 2^11

console.log('  ✓ 11 permissions registered\n');

// Create roles
console.log('Creating roles...');

rbac.createRole('guest', [
  'post:read',
  'comment:read',
  'page:read'
]);

rbac.createRole('registered', [
  'post:read',
  'comment:read',
  'comment:create',
  'page:read'
]);

rbac.createRole('author', [
  'post:read',
  'post:create',
  'post:edit',
  'comment:read',
  'comment:create',
  'page:read'
]);

rbac.createRole('editor', [
  'post:read',
  'post:create',
  'post:edit',
  'post:delete',
  'post:publish',
  'comment:read',
  'comment:create',
  'comment:moderate',
  'page:read',
  'page:edit'
]);

rbac.createRole('admin', [
  'post:read',
  'post:create',
  'post:edit',
  'post:delete',
  'post:publish',
  'comment:read',
  'comment:create',
  'comment:moderate',
  'page:read',
  'page:edit',
  'analytics:view',
  'settings:manage'
]);

console.log('  ✓ 5 roles created\n');

// Set up role hierarchy
console.log('Setting up role hierarchy...');
const hierarchy = rbac.getRoleHierarchy();

hierarchy.setRoleLevel('guest', 1);
hierarchy.setRoleLevel('registered', 2);
hierarchy.setRoleLevel('author', 5);
hierarchy.setRoleLevel('editor', 10);
hierarchy.setRoleLevel('admin', 100);

console.log('  ✓ Hierarchy established\n');

// Create sample users
const users = {
  guest: { id: 'guest-001', roles: ['guest'], name: 'Anonymous' },
  registered: { id: 'user-001', roles: ['registered'], name: 'John Doe' },
  author: { id: 'user-002', roles: ['author'], name: 'Jane Smith' },
  editor: { id: 'user-003', roles: ['editor'], name: 'Bob Johnson' },
  admin: { id: 'user-004', roles: ['admin'], name: 'Alice Admin' }
};

// Simulate blog operations
console.log('=== Blog Operations ===\n');

// Operation 1: Guest trying to read post
console.log('1. Guest reading a post:');
const guestRead = rbac.authorize(users.guest, 'post:read');
console.log(`   Result: ${guestRead.allowed ? '✓ Allowed' : '✗ Denied'}\n`);

// Operation 2: Guest trying to create post
console.log('2. Guest trying to create a post:');
const guestCreate = rbac.authorize(users.guest, 'post:create');
console.log(`   Result: ${guestCreate.allowed ? '✓ Allowed' : '✗ Denied'}`);
console.log(`   Reason: ${guestCreate.reason}\n`);

// Operation 3: Registered user creating comment
console.log('3. Registered user creating a comment:');
const registeredComment = rbac.authorize(users.registered, 'comment:create');
console.log(`   Result: ${registeredComment.allowed ? '✓ Allowed' : '✗ Denied'}\n`);

// Operation 4: Author publishing post
console.log('4. Author trying to publish post:');
const authorPublish = rbac.authorize(users.author, 'post:publish');
console.log(`   Result: ${authorPublish.allowed ? '✓ Allowed' : '✗ Denied'}`);
console.log(`   Reason: ${authorPublish.reason}\n`);

// Operation 5: Editor publishing post
console.log('5. Editor publishing post:');
const editorPublish = rbac.authorize(users.editor, 'post:publish');
console.log(`   Result: ${editorPublish.allowed ? '✓ Allowed' : '✗ Denied'}\n`);

// Operation 6: Editor moderating comment
console.log('6. Editor moderating comment:');
const editorModerate = rbac.authorize(users.editor, 'comment:moderate');
console.log(`   Result: ${editorModerate.allowed ? '✓ Allowed' : '✗ Denied'}\n`);

// Operation 7: Admin viewing analytics
console.log('7. Admin viewing analytics:');
const adminAnalytics = rbac.authorize(users.admin, 'analytics:view');
console.log(`   Result: ${adminAnalytics.allowed ? '✓ Allowed' : '✗ Denied'}\n`);

// Check role hierarchy
console.log('=== Role Hierarchy ===\n');
console.log('Can admin act as editor?', rbac.canActAsRole('admin', 'editor'));
console.log('Can editor act as author?', rbac.canActAsRole('editor', 'author'));
console.log('Can author act as editor?', rbac.canActAsRole('author', 'editor'));
console.log('Can registered act as guest?', rbac.canActAsRole('registered', 'guest'));

// Permission matrix
console.log('\n=== Permission Matrix ===\n');

const permissions = ['post:create', 'post:publish', 'comment:moderate', 'settings:manage'];
const roles = ['guest', 'registered', 'author', 'editor', 'admin'];

console.log('Permission'.padEnd(20), '|', roles.join(' | '));
console.log('-'.repeat(80));

permissions.forEach(permission => {
  const checks = roles.map(role => {
    const hasPermission = rbac.hasPermission(users[role], permission);
    return hasPermission ? '✓' : '✗';
  });
  console.log(permission.padEnd(20), '|', checks.join('   | '));
});

// Example: User with multiple roles
console.log('\n=== Multi-Role User ===\n');
const multiRoleUser = {
  id: 'user-005',
  roles: ['author', 'editor'],
  name: 'Multi-Role User'
};

console.log('User with both "author" and "editor" roles:');
console.log(`  Can create posts? ${rbac.hasPermission(multiRoleUser, 'post:create')}`);
console.log(`  Can publish posts? ${rbac.hasPermission(multiRoleUser, 'post:publish')}`);
console.log(`  Can moderate comments? ${rbac.hasPermission(multiRoleUser, 'comment:moderate')}`);
console.log(`  Can manage settings? ${rbac.hasPermission(multiRoleUser, 'settings:manage')}`);

// Example: Direct permissions override
console.log('\n=== Direct Permissions ===\n');
const specialAuthor = {
  id: 'user-006',
  roles: ['author'],
  permissions: ['post:publish'], // Direct permission override
  name: 'Senior Author'
};

console.log('Regular author can publish?', rbac.hasPermission(users.author, 'post:publish'));
console.log('Senior author (with direct permission) can publish?', rbac.hasPermission(specialAuthor, 'post:publish'));
