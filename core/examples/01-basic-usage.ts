/**
 * Basic Usage Example
 *
 * This example demonstrates the fundamental concepts of the RBAC system:
 * - Creating an RBAC instance
 * - Registering permissions
 * - Creating roles
 * - Checking permissions
 */

import { RBAC } from '../lib/index';

console.log('=== Basic Usage Example ===\n');

// 1. Create RBAC instance with bit-based system (default)
const rbac = new RBAC({ useBitSystem: true });

// 2. Register permissions
console.log('Registering permissions...');
const readBit = rbac.registerPermission('document:read');
const writeBit = rbac.registerPermission('document:write');
const deleteBit = rbac.registerPermission('document:delete');

console.log(`  document:read -> bit ${readBit}`);
console.log(`  document:write -> bit ${writeBit}`);
console.log(`  document:delete -> bit ${deleteBit}\n`);

// 3. Create roles with permissions
console.log('Creating roles...');
rbac.createRole('viewer', ['document:read']);
rbac.createRole('editor', ['document:read', 'document:write']);
rbac.createRole('admin', ['document:read', 'document:write', 'document:delete']);
console.log('  ✓ viewer, editor, admin roles created\n');

// 4. Create users with different roles
const viewer = {
  id: 'user-001',
  roles: ['viewer']
};

const editor = {
  id: 'user-002',
  roles: ['editor']
};

const admin = {
  id: 'user-003',
  roles: ['admin']
};

// 5. Check permissions
console.log('Permission checks:');
console.log('  Viewer:');
console.log(`    Can read? ${rbac.hasPermission(viewer, 'document:read')}`);
console.log(`    Can write? ${rbac.hasPermission(viewer, 'document:write')}`);
console.log(`    Can delete? ${rbac.hasPermission(viewer, 'document:delete')}`);

console.log('\n  Editor:');
console.log(`    Can read? ${rbac.hasPermission(editor, 'document:read')}`);
console.log(`    Can write? ${rbac.hasPermission(editor, 'document:write')}`);
console.log(`    Can delete? ${rbac.hasPermission(editor, 'document:delete')}`);

console.log('\n  Admin:');
console.log(`    Can read? ${rbac.hasPermission(admin, 'document:read')}`);
console.log(`    Can write? ${rbac.hasPermission(admin, 'document:write')}`);
console.log(`    Can delete? ${rbac.hasPermission(admin, 'document:delete')}`);

// 6. Authorize with detailed results
console.log('\nAuthorization results:');
const viewerDeleteResult = rbac.authorize(viewer, 'document:delete');
console.log('  Viewer trying to delete:');
console.log(`    Allowed: ${viewerDeleteResult.allowed}`);
console.log(`    Reason: ${viewerDeleteResult.reason}`);

const adminDeleteResult = rbac.authorize(admin, 'document:delete');
console.log('\n  Admin trying to delete:');
console.log(`    Allowed: ${adminDeleteResult.allowed}`);
console.log(`    Reason: ${adminDeleteResult.reason || 'N/A'}`);

// 7. Multiple permission checks
console.log('\nChecking multiple permissions:');
const editorPermissions = ['document:read', 'document:write'];
console.log(`  Editor has ALL [read, write]? ${rbac.hasAllPermissions(editor, editorPermissions)}`);

const editorWithDelete = ['document:read', 'document:write', 'document:delete'];
console.log(`  Editor has ALL [read, write, delete]? ${rbac.hasAllPermissions(editor, editorWithDelete)}`);

const anyDeleteOrWrite = ['document:write', 'document:delete'];
console.log(`  Viewer has ANY [write, delete]? ${rbac.hasAnyPermission(viewer, anyDeleteOrWrite)}`);
console.log(`  Editor has ANY [write, delete]? ${rbac.hasAnyPermission(editor, anyDeleteOrWrite)}`);
