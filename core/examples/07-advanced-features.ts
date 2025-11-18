/**
 * Advanced Features Example
 *
 * This example demonstrates the new advanced features:
 * - Wildcard permissions (admin:*, *:read, etc.)
 * - Audit logging (tracking all permission checks)
 * - Deny permissions (explicit denies)
 */

import { RBAC, ConsoleAuditLogger, BufferedAuditLogger, type AuditEvent } from '../lib/index';

console.log('=== Advanced Features Example ===\n');

// ========================================
// FEATURE 1: WILDCARD PERMISSIONS
// ========================================

console.log('FEATURE 1: Wildcard Permissions\n');

const rbac1 = new RBAC({ enableWildcards: true });

// Register specific permissions
rbac1.registerPermission('admin:users');
rbac1.registerPermission('admin:posts');
rbac1.registerPermission('admin:settings');
rbac1.registerPermission('admin:analytics');

// Create role with wildcard - grants ALL admin permissions
rbac1.createRole('admin', ['admin:*']);
rbac1.createRole('user', ['user:read', 'user:write']);

const adminUser = { id: 'admin-1', roles: ['admin'] };

console.log('Admin with wildcard permission "admin:*":');
console.log(`  Can manage users? ${rbac1.hasPermission(adminUser, 'admin:users')}`);
console.log(`  Can manage posts? ${rbac1.hasPermission(adminUser, 'admin:posts')}`);
console.log(`  Can manage settings? ${rbac1.hasPermission(adminUser, 'admin:settings')}`);
console.log(`  Can view analytics? ${rbac1.hasPermission(adminUser, 'admin:analytics')}`);

// Wildcard in direct permissions
const contentManager = {
  id: 'manager-1',
  roles: [],
  permissions: ['post:*', 'comment:read']
};

console.log('\nContent Manager with "post:*" permission:');
console.log(`  Can read posts? ${rbac1.hasPermission(contentManager, 'post:read')}`);
console.log(`  Can create posts? ${rbac1.hasPermission(contentManager, 'post:create')}`);
console.log(`  Can delete posts? ${rbac1.hasPermission(contentManager, 'post:delete')}`);
console.log(`  Can write comments? ${rbac1.hasPermission(contentManager, 'comment:write')}`);

// Complex wildcard patterns
const superUser = {
  id: 'super-1',
  roles: [],
  permissions: ['*:*:delete', 'api:v1:*']
};

console.log('\nSuper User with complex wildcards:');
console.log(`  "*:*:delete" matches "user:post:delete"? ${rbac1.hasPermission(superUser, 'user:post:delete')}`);
console.log(`  "*:*:delete" matches "admin:comment:delete"? ${rbac1.hasPermission(superUser, 'admin:comment:delete')}`);
console.log(`  "api:v1:*" matches "api:v1:users:read"? ${rbac1.hasPermission(superUser, 'api:v1:users:read')}`);
console.log(`  Matches "api:v2:users:read"? ${rbac1.hasPermission(superUser, 'api:v2:users:read')}`);

// ========================================
// FEATURE 2: AUDIT LOGGING
// ========================================

console.log('\n\nFEATURE 2: Audit Logging\n');

// Example 1: Console Audit Logger (for development)
console.log('--- Using ConsoleAuditLogger ---');

const rbac2 = new RBAC({
  auditLogger: new ConsoleAuditLogger()
});

rbac2.registerPermission('payment:process');
rbac2.createRole('cashier', ['payment:process']);

const cashier = { id: 'cashier-001', roles: ['cashier'] };
const guest = { id: 'guest-001', roles: [] };

console.log('\nChecking permissions (logs will appear below):');
rbac2.hasPermission(cashier, 'payment:process'); // Allowed
rbac2.hasPermission(guest, 'payment:process');   // Denied

// Example 2: Buffered Audit Logger (for production)
console.log('\n\n--- Using BufferedAuditLogger ---');

const auditEvents: AuditEvent[] = [];

const bufferedLogger = new BufferedAuditLogger(
  (events) => {
    // This would normally save to database
    console.log(`\n📝 Flushing ${events.length} audit events to database...`);
    auditEvents.push(...events);

    events.forEach((event, i) => {
      const status = event.allowed ? '✓' : '✗';
      console.log(`  ${i + 1}. ${status} User ${event.userId} - ${event.permission}`);
    });
  },
  {
    maxBufferSize: 5, // Flush after 5 events
    flushIntervalMs: 0 // Disabled for demo
  }
);

const rbac3 = new RBAC({ auditLogger: bufferedLogger });

rbac3.registerPermission('data:read');
rbac3.registerPermission('data:write');
rbac3.createRole('analyst', ['data:read']);

const analyst = { id: 'analyst-123', roles: ['analyst'] };

console.log('\nPerforming 6 permission checks (will auto-flush at 5):');
for (let i = 1; i <= 6; i++) {
  rbac3.hasPermission(analyst, i % 2 === 0 ? 'data:write' : 'data:read');
}

bufferedLogger.destroy(); // Cleanup

// Example 3: Custom Audit Logger
console.log('\n\n--- Custom Audit Logger (Security Monitoring) ---');

class SecurityAuditLogger {
  private failedAttempts: Map<string, number> = new Map();

  log(event: AuditEvent): void {
    if (!event.allowed) {
      // Track failed attempts
      const count = (this.failedAttempts.get(event.userId) || 0) + 1;
      this.failedAttempts.set(event.userId, count);

      console.log(`⚠️  Security Alert: User ${event.userId} denied ${event.permission}`);
      console.log(`   Failed attempts: ${count}`);

      if (count >= 3) {
        console.log(`   🚨 SECURITY WARNING: User ${event.userId} has ${count} failed permission checks!`);
      }
    }
  }
}

const rbac4 = new RBAC({ auditLogger: new SecurityAuditLogger() });

const suspiciousUser = { id: 'user-suspicious', roles: [] };

console.log('\nSimulating suspicious activity:');
for (let i = 0; i < 4; i++) {
  rbac4.hasPermission(suspiciousUser, 'admin:delete:users');
}

// ========================================
// FEATURE 3: DENY PERMISSIONS
// ========================================

console.log('\n\nFEATURE 3: Deny Permissions (Explicit Denies)\n');

const rbac5 = new RBAC({ enableWildcards: true });

rbac5.registerPermission('content:read');
rbac5.registerPermission('content:write');
rbac5.registerPermission('content:delete');
rbac5.createRole('editor', ['content:*']);

const editor = { id: 'editor-001', roles: ['editor'] };

console.log('Editor with "content:*" permission:');
console.log(`  Can read? ${rbac5.hasPermission(editor, 'content:read')}`);
console.log(`  Can write? ${rbac5.hasPermission(editor, 'content:write')}`);
console.log(`  Can delete? ${rbac5.hasPermission(editor, 'content:delete')}`);

// Deny specific permission
console.log('\nDenying "content:delete" for this editor:');
rbac5.denyPermission('editor-001', 'content:delete');

console.log(`  Can read? ${rbac5.hasPermission(editor, 'content:read')}`);
console.log(`  Can write? ${rbac5.hasPermission(editor, 'content:write')}`);
console.log(`  Can delete? ${rbac5.hasPermission(editor, 'content:delete')} (denied!)`);

// Deny with wildcard
console.log('\nDenying all "user:*" permissions:');
rbac5.createRole('admin', ['admin:*', 'user:*', 'post:*']);

const restrictedAdmin = { id: 'admin-restricted', roles: ['admin'] };

rbac5.denyPermission('admin-restricted', 'user:*');

console.log('  Admin permissions:');
console.log(`    Can manage posts? ${rbac5.hasPermission(restrictedAdmin, 'post:read')}`);
console.log(`    Can manage users? ${rbac5.hasPermission(restrictedAdmin, 'user:read')} (denied by wildcard)`);

// View denied permissions
const denied = rbac5.getDeniedPermissions('admin-restricted');
console.log(`\nDenied permissions for admin-restricted: [${denied.join(', ')}]`);

// Remove deny
console.log('\nRemoving deny for "user:*":');
rbac5.allowPermission('admin-restricted', 'user:*');
console.log(`  Can manage users now? ${rbac5.hasPermission(restrictedAdmin, 'user:read')}`);

// ========================================
// COMBINED FEATURES EXAMPLE
// ========================================

console.log('\n\nCOMBINED EXAMPLE: All Features Together\n');

// Setup RBAC with all features
const auditLog: AuditEvent[] = [];
const fullRBAC = new RBAC({
  enableWildcards: true,
  auditLogger: {
    log: (event) => {
      auditLog.push(event);
      const emoji = event.allowed ? '✓' : '✗';
      console.log(`  [AUDIT] ${emoji} User ${event.userId} → ${event.permission} (${event.allowed ? 'allowed' : 'denied'})`);
      if (event.reason) {
        console.log(`          Reason: ${event.reason}`);
      }
    }
  }
});

// Setup roles with wildcards
fullRBAC.createRole('power-user', ['api:*', 'admin:read', 'admin:write']);

const powerUser = { id: 'power-001', roles: ['power-user'] };

console.log('Power User Scenario:');
console.log('\n1. Testing wildcard permissions:');
fullRBAC.hasPermission(powerUser, 'api:v1:users');     // Allowed by wildcard
fullRBAC.hasPermission(powerUser, 'api:v2:posts');     // Allowed by wildcard
fullRBAC.hasPermission(powerUser, 'admin:read');       // Allowed by exact match

console.log('\n2. Denying specific API permission:');
fullRBAC.denyPermission('power-001', 'api:v1:users');
fullRBAC.hasPermission(powerUser, 'api:v1:users');     // Now denied
fullRBAC.hasPermission(powerUser, 'api:v2:posts');     // Still allowed

console.log('\n3. Denying with wildcard:');
fullRBAC.denyPermission('power-001', 'admin:*');
fullRBAC.hasPermission(powerUser, 'admin:read');       // Denied by wildcard
fullRBAC.hasPermission(powerUser, 'admin:write');      // Denied by wildcard

console.log(`\n📊 Total audit events logged: ${auditLog.length}`);
console.log(`   Allowed: ${auditLog.filter(e => e.allowed).length}`);
console.log(`   Denied: ${auditLog.filter(e => !e.allowed).length}`);

// ========================================
// REAL-WORLD USE CASE
// ========================================

console.log('\n\nREAL-WORLD USE CASE: Multi-Tenant SaaS\n');

const saasRBAC = new RBAC({
  enableWildcards: true,
  auditLogger: new ConsoleAuditLogger()
});

// Tenant Owner - full access
saasRBAC.createRole('tenant-owner', ['tenant:*']);

// Tenant Admin - most access except billing
saasRBAC.createRole('tenant-admin', ['tenant:users:*', 'tenant:settings:*', 'tenant:data:*']);

// Tenant Member - limited access
saasRBAC.createRole('tenant-member', ['tenant:data:read', 'tenant:data:write']);

const owner = { id: 'owner-1', roles: ['tenant-owner'] };
const admin = { id: 'admin-1', roles: ['tenant-admin'] };
const member = { id: 'member-1', roles: ['tenant-member'] };

// Owner tries to manage billing
console.log('\nOwner accessing billing:');
saasRBAC.hasPermission(owner, 'tenant:billing:update');

// Admin tries to manage billing (should fail)
console.log('\nAdmin accessing billing:');
saasRBAC.hasPermission(admin, 'tenant:billing:update');

// Temporarily suspend a user by denying all permissions
console.log('\nSuspending member (deny tenant:*):');
saasRBAC.denyPermission('member-1', 'tenant:*');
saasRBAC.hasPermission(member, 'tenant:data:read');

console.log('\n=== Summary ===');
console.log('✅ Wildcard Permissions - Powerful pattern matching for permissions');
console.log('✅ Audit Logging - Track all permission checks for security & compliance');
console.log('✅ Deny Permissions - Explicit denies that override allows');
console.log('\n🚀 All features work together seamlessly!');
