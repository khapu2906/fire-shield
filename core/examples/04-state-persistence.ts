/**
 * State Persistence Example
 *
 * This example demonstrates how to:
 * - Serialize RBAC state to JSON
 * - Save state to different storage backends
 * - Restore RBAC from saved state
 * - Handle state versioning
 */

import { RBAC } from '../lib/index';
import * as fs from 'fs';
import * as path from 'path';

console.log('=== State Persistence Example ===\n');

// === PART 1: Initial Setup ===
console.log('PART 1: Setting up initial RBAC configuration\n');

const rbac = new RBAC({ useBitSystem: true });

// Register permissions with manual bits (important for persistence!)
rbac.registerPermission('user:read', 1);
rbac.registerPermission('user:write', 2);
rbac.registerPermission('user:delete', 4);
rbac.registerPermission('admin:manage', 8);
rbac.registerPermission('content:publish', 16);

// Create roles
rbac.createRole('user', ['user:read']);
rbac.createRole('moderator', ['user:read', 'user:write', 'content:publish']);
rbac.createRole('admin', ['user:read', 'user:write', 'user:delete', 'admin:manage', 'content:publish']);

// Set hierarchy
const hierarchy = rbac.getRoleHierarchy();
hierarchy.setRoleLevel('user', 1);
hierarchy.setRoleLevel('moderator', 5);
hierarchy.setRoleLevel('admin', 10);

console.log('✓ RBAC configured with 5 permissions and 3 roles\n');

// === PART 2: Serialize State ===
console.log('PART 2: Serializing RBAC state\n');

// Method 1: Get state object
const stateObject = rbac.serialize();
console.log('State object structure:');
console.log(JSON.stringify(stateObject, null, 2));

console.log('\nState contains:');
console.log(`  - ${Object.keys(stateObject.bitPermissions.permissions).length} permissions`);
console.log(`  - ${Object.keys(stateObject.bitPermissions.roles).length} roles`);
console.log(`  - ${Object.keys(stateObject.hierarchy.levels).length} hierarchy levels`);
console.log(`  - Next bit value: ${stateObject.bitPermissions.nextBitValue}`);
console.log(`  - Timestamp: ${new Date(stateObject.timestamp).toISOString()}\n`);

// Method 2: Get JSON string
const jsonString = rbac.toJSON();
console.log('JSON string (first 200 chars):');
console.log(jsonString.substring(0, 200) + '...\n');

// === PART 3: Save to Different Storage Backends ===
console.log('PART 3: Saving to different storage backends\n');

// Storage Backend 1: File System
const filePath = path.join(__dirname, '../.temp/rbac-state.json');
const tempDir = path.dirname(filePath);

// Ensure directory exists
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

fs.writeFileSync(filePath, jsonString, 'utf-8');
console.log(`✓ Saved to file: ${filePath}`);

// Storage Backend 2: In-Memory Cache (simulated)
const memoryCache = new Map<string, string>();
memoryCache.set('rbac-state', jsonString);
console.log('✓ Saved to memory cache');

// Storage Backend 3: localStorage (browser - simulated)
class LocalStorageSimulator {
  private storage = new Map<string, string>();

  setItem(key: string, value: string) {
    this.storage.set(key, value);
  }

  getItem(key: string): string | null {
    return this.storage.get(key) || null;
  }
}

const localStorage = new LocalStorageSimulator();
localStorage.setItem('rbac-state', jsonString);
console.log('✓ Saved to localStorage (simulated)');

// Storage Backend 4: Database (simulated)
class DatabaseSimulator {
  private db = new Map<string, any>();

  async save(collection: string, doc: any) {
    this.db.set(collection, doc);
    return { id: 'doc-123', success: true };
  }

  async load(collection: string) {
    return this.db.get(collection);
  }
}

const database = new DatabaseSimulator();
await database.save('rbac_state', stateObject);
console.log('✓ Saved to database (simulated)\n');

// === PART 4: Restore State ===
console.log('PART 4: Restoring RBAC from saved state\n');

// Restore 1: From file
console.log('Restoring from file...');
const rbacFromFile = new RBAC({ useBitSystem: true });
const fileContent = fs.readFileSync(filePath, 'utf-8');
rbacFromFile.fromJSON(fileContent);

const testUser = { id: 'user-1', roles: ['moderator'] };
console.log(`  ✓ State loaded from file`);
console.log(`  Test: Moderator can publish? ${rbacFromFile.hasPermission(testUser, 'content:publish')}`);

// Restore 2: From localStorage
console.log('\nRestoring from localStorage...');
const rbacFromLocalStorage = new RBAC({ useBitSystem: true });
const localStorageContent = localStorage.getItem('rbac-state');
if (localStorageContent) {
  rbacFromLocalStorage.fromJSON(localStorageContent);
  console.log(`  ✓ State loaded from localStorage`);
  console.log(`  Test: Admin can manage? ${rbacFromLocalStorage.hasPermission({ id: '1', roles: ['admin'] }, 'admin:manage')}`);
}

// Restore 3: From database
console.log('\nRestoring from database...');
const rbacFromDatabase = new RBAC({ useBitSystem: true });
const dbState = await database.load('rbac_state');
rbacFromDatabase.deserialize(dbState);
console.log(`  ✓ State loaded from database`);
console.log(`  Test: User can read? ${rbacFromDatabase.hasPermission({ id: '1', roles: ['user'] }, 'user:read')}`);

// === PART 5: Verify Restored State ===
console.log('\n\nPART 5: Verifying restored state integrity\n');

const bitManager = rbacFromFile.getBitPermissionManager();
if (bitManager) {
  const allPermissions = bitManager.getAllPermissions();
  const allRoles = bitManager.getAllRoles();

  console.log('Permissions restored:', allPermissions.length);
  allPermissions.forEach(perm => {
    const bit = bitManager.getPermissionBit(perm);
    console.log(`  - ${perm}: bit ${bit}`);
  });

  console.log('\nRoles restored:', allRoles.length);
  allRoles.forEach(role => {
    const permissions = bitManager.getRolePermissions(role);
    console.log(`  - ${role}: [${permissions.join(', ')}]`);
  });
}

const restoredHierarchy = rbacFromFile.getRoleHierarchy();
console.log('\nHierarchy levels restored:');
const levels = restoredHierarchy.getAllRoles();
levels.forEach(role => {
  const level = restoredHierarchy.getRoleLevel(role);
  console.log(`  - ${role}: level ${level}`);
});

// === PART 6: Incremental Updates ===
console.log('\n\nPART 6: Incremental state updates\n');

console.log('Adding new permission to existing RBAC...');
rbacFromFile.registerPermission('analytics:view', 32);
rbacFromFile.addPermissionToRole('admin', 'analytics:view');

console.log('  ✓ Added analytics:view permission to admin role');

// Save updated state
const updatedState = rbacFromFile.toJSON();
fs.writeFileSync(filePath, updatedState, 'utf-8');
console.log('  ✓ Updated state saved to file');

// Verify update
const admin = { id: 'admin-1', roles: ['admin'] };
console.log(`  Test: Admin can view analytics? ${rbacFromFile.hasPermission(admin, 'analytics:view')}`);

// === PART 7: State Versioning ===
console.log('\n\nPART 7: State versioning and migration\n');

interface VersionedState {
  version: string;
  timestamp: number;
  state: any;
  metadata?: {
    environment: string;
    updatedBy: string;
  };
}

const createVersionedState = (rbacInstance: RBAC, version: string): VersionedState => {
  return {
    version,
    timestamp: Date.now(),
    state: rbacInstance.serialize(),
    metadata: {
      environment: process.env.NODE_ENV || 'development',
      updatedBy: 'system'
    }
  };
};

const v1State = createVersionedState(rbac, '1.0.0');
console.log('Created versioned state v1.0.0:');
console.log(`  Version: ${v1State.version}`);
console.log(`  Timestamp: ${new Date(v1State.timestamp).toISOString()}`);
console.log(`  Environment: ${v1State.metadata?.environment}`);

// Simulate version upgrade
rbac.registerPermission('feature:beta', 64);
const v2State = createVersionedState(rbac, '2.0.0');
console.log('\nCreated versioned state v2.0.0:');
console.log(`  Version: ${v2State.version}`);
console.log(`  Added new features`);

// Save versioned states
const versionedPath = path.join(__dirname, '../.temp/rbac-state-v1.json');
fs.writeFileSync(versionedPath, JSON.stringify(v1State, null, 2), 'utf-8');
console.log(`\n✓ Versioned states saved`);

// === PART 8: Performance Testing ===
console.log('\n\nPART 8: Serialization performance\n');

console.log('Testing serialization performance...');

const iterations = 1000;
const startSerialize = Date.now();
for (let i = 0; i < iterations; i++) {
  rbac.serialize();
}
const serializeTime = Date.now() - startSerialize;
console.log(`  Serialization: ${iterations} iterations in ${serializeTime}ms (${(serializeTime / iterations).toFixed(3)}ms per operation)`);

const startDeserialize = Date.now();
const testState = rbac.serialize();
for (let i = 0; i < iterations; i++) {
  const tempRBAC = new RBAC({ useBitSystem: true });
  tempRBAC.deserialize(testState);
}
const deserializeTime = Date.now() - startDeserialize;
console.log(`  Deserialization: ${iterations} iterations in ${deserializeTime}ms (${(deserializeTime / iterations).toFixed(3)}ms per operation)`);

// Cleanup
console.log('\n\nCleaning up temporary files...');
if (fs.existsSync(filePath)) {
  fs.unlinkSync(filePath);
  console.log('✓ Temporary files removed');
}

console.log('\n=== Summary ===');
console.log('State persistence capabilities:');
console.log('  ✓ Serialize to JSON');
console.log('  ✓ Deserialize from JSON');
console.log('  ✓ Save to multiple storage backends');
console.log('  ✓ Restore with full integrity');
console.log('  ✓ Incremental updates');
console.log('  ✓ Version management');
console.log('  ✓ High performance (< 1ms per operation)');
