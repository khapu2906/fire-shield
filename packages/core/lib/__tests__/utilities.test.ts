import { describe, it, expect, vi } from 'vitest';
import {
	RBAC,
	RBACBuilder,
	matchPermission,
	parsePermission,
	RBACError,
	isRBACUser,
	isAuditEvent,
	SecurityMonitorLogger,
	ComplianceLogger,
	AnalyticsLogger,
	WithMetadata,
	PermissionCheckType,
	PermissionMask,
	hasPermission,
	hasAnyPermission,
	hasAllPermissions
} from '../index';

describe('Utility Functions - Permission Matching', () => {
	describe('matchPermission', () => {
		it('should match exact permission strings correctly', () => {
			expect(matchPermission('user:read', 'user:read')).toBe(true);
			expect(matchPermission('user:read', 'user:write')).toBe(false);
		});

		it('should support wildcard patterns with *', () => {
			expect(matchPermission('user:read', 'user:*')).toBe(true);
			expect(matchPermission('user:read', '*')).toBe(true);
			expect(matchPermission('admin:users:delete', 'admin:users:*')).toBe(true);
		});

		it('should support multi-level wildcard patterns', () => {
			expect(matchPermission('admin:users:delete', 'admin:*:delete')).toBe(true);
			expect(matchPermission('service:resource:action:detail', 'service:*:action:*')).toBe(true);
		});

		it('should return false for non-matching patterns', () => {
			expect(matchPermission('user:read', 'admin:*')).toBe(false);
			expect(matchPermission('user:read', 'user:delete')).toBe(false);
		});
	});
});

describe('Utility Functions - Permission Parsing', () => {
	describe('parsePermission', () => {
		it('should parse permission with single colon separator', () => {
			const result = parsePermission('user:read');
			expect(result).toEqual({ resource: 'user', action: 'read' });
		});

		it('should parse permission with multiple colons', () => {
			const result = parsePermission('admin:users:delete');
			expect(result).toEqual({ resource: 'admin:users', action: 'delete' });
		});

		it('should handle permission without any colons', () => {
			const result = parsePermission('read');
			expect(result).toEqual({ resource: 'read', action: '*' });
		});

		it('should handle complex permission strings', () => {
			const result = parsePermission('service:resource:action:detail');
			expect(result).toEqual({ resource: 'service:resource:action', action: 'detail' });
		});
	});
});

describe('Custom Error Class - RBACError', () => {
	it('should create RBACError with message and error code', () => {
		const error = new RBACError('Permission denied', 'PERMISSION_DENIED');
		expect(error.name).toBe('RBACError');
		expect(error.message).toBe('Permission denied');
		expect(error.code).toBe('PERMISSION_DENIED');
	});

	it('should extend Error class correctly', () => {
		const error = new RBACError('Test error', 'TEST');
		expect(error instanceof Error).toBe(true);
		expect(error instanceof RBACError).toBe(true);
	});

	it('should support stack trace', () => {
		const error = new RBACError('Test', 'TEST');
		expect(error.stack).toBeDefined();
	});
});

describe('Type Guards - RBACUser Validation', () => {
	describe('isRBACUser', () => {
		it('should validate correct RBACUser object with id and roles', () => {
			const user = { id: '1', roles: ['admin', 'editor'] };
			expect(isRBACUser(user)).toBe(true);
		});

		it('should validate RBACUser with optional fields', () => {
			const user = {
				id: '1',
				roles: ['admin'],
				permissions: ['user:read'],
				permissionMask: 7
			};
			expect(isRBACUser(user)).toBe(true);
		});

		it('should reject null or undefined values', () => {
			expect(isRBACUser(null)).toBe(false);
			expect(isRBACUser(undefined)).toBe(false);
		});

		it('should reject objects without required fields', () => {
			expect(isRBACUser({})).toBe(false);
			expect(isRBACUser({ id: '1' })).toBe(false);
		});

		it('should reject objects with wrong types', () => {
			expect(isRBACUser({ id: 1, roles: [] })).toBe(false);
			expect(isRBACUser({ id: '1', roles: [123] })).toBe(false);
		});
	});
});

describe('Type Guards - Audit Event Validation', () => {
	describe('isAuditEvent', () => {
		it('should validate complete AuditEvent object', () => {
			const event = {
				type: 'permission_check',
				userId: 'user-1',
				permission: 'user:read',
				allowed: true,
				timestamp: 1234567890
			};
			expect(isAuditEvent(event)).toBe(true);
		});

		it('should reject null or undefined values', () => {
			expect(isAuditEvent(null)).toBe(false);
			expect(isAuditEvent(undefined)).toBe(false);
		});

		it('should reject incomplete audit events', () => {
			expect(isAuditEvent({})).toBe(false);
			expect(isAuditEvent({ type: 'test' })).toBe(false);
			expect(isAuditEvent({
				type: 'test',
				userId: '1',
				permission: 'read',
				allowed: true
			})).toBe(false);
		});
	});
});

describe('RBACBuilder - Fluent API for Role Definition', () => {
	it('should support method chaining for configuration', () => {
		const rbac = new RBACBuilder()
			.useBitSystem()
			.enableStrictMode()
			.enableWildcards(true)
			.build();

		// Verify builder was created successfully
		expect(rbac).toBeDefined();
		expect(typeof rbac.hasPermission).toBe('function');
	});

	it('should throw error when grant() is called before role()', () => {
		const builder = new RBACBuilder();
		expect(() => builder.grant(['user:read'])).toThrow('Must call role() before grant()');
	});

	it('should throw error when starting new role without completing previous', () => {
		const builder = new RBACBuilder();
		builder.role('admin');
		expect(() => builder.role('editor')).toThrow('Cannot start a new role while another role is being defined');
	});

	it('should set role hierarchy configuration', () => {
		const rbac = new RBACBuilder()
			.addRole('viewer', ['read'])
			.addRole('editor', ['read', 'write'])
			.addRole('admin', ['read', 'write', 'delete'])
			.hierarchy({ admin: ['editor', 'viewer'] })
			.build();

		// Verify hierarchy was configured
		const hierarchy = rbac.getRoleHierarchy();
		expect(hierarchy).toBeDefined();
	});

	it('should integrate with custom audit logger', () => {
		const mockLogger = {
			log: vi.fn()
		};

		const rbac = new RBACBuilder()
			.addRole('admin', ['user:read'])
			.withAuditLogger(mockLogger)
			.build();

		const admin = { id: '1', roles: ['admin'] };
		rbac.hasPermission(admin, 'user:read');

		expect(mockLogger.log).toHaveBeenCalled();
	});

	it('should throw error when building with incomplete role definition', () => {
		const builder = new RBACBuilder();
		builder.role('admin');
		expect(() => builder.build()).toThrow('Cannot build while a role is being defined');
	});

	it('should support fluent API with addRole and addPermission methods', () => {
		const rbac = new RBACBuilder()
			.addPermission('user:read', 1)
			.addPermission('user:write', 2)
			.addRole('user', ['user:read'])
			.addRole('admin', ['user:read', 'user:write'])
			.build();

		const user = { id: '1', roles: ['user'] };
		const admin = { id: '2', roles: ['admin'] };

		expect(rbac.hasPermission(user, 'user:read')).toBe(true);
		expect(rbac.hasPermission(admin, 'user:write')).toBe(true);
	});
});

describe('Audit Logger - Security Monitoring', () => {
	describe('SecurityMonitorLogger', () => {
		it('should track and alert on failed permission attempts', () => {
			const logger = new SecurityMonitorLogger();
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			// Log multiple failed attempts
			logger.log({
				type: 'permission_check',
				userId: 'user-1',
				permission: 'admin:delete',
				allowed: false,
				timestamp: Date.now()
			});

			logger.log({
				type: 'permission_check',
				userId: 'user-1',
				permission: 'admin:delete',
				allowed: false,
				timestamp: Date.now()
			});

			logger.log({
				type: 'permission_check',
				userId: 'user-1',
				permission: 'admin:delete',
				allowed: false,
				timestamp: Date.now()
			});

			// Should have logged security alerts
			expect(consoleSpy).toHaveBeenCalled();

			consoleSpy.mockRestore();
		});

		it('should reset failed attempts after successful permission', () => {
			const logger = new SecurityMonitorLogger();
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			// Log failed attempt
			logger.log({
				type: 'permission_check',
				userId: 'user-1',
				permission: 'admin:delete',
				allowed: false,
				timestamp: Date.now()
			});

			// Log successful attempt (should reset counter)
			logger.log({
				type: 'permission_check',
				userId: 'user-1',
				permission: 'user:read',
				allowed: true,
				timestamp: Date.now()
			});

			consoleSpy.mockRestore();
		});
	});
});

describe('Audit Logger - Compliance Logging', () => {
	describe('ComplianceLogger', () => {
		it('should log events with compliance metadata', async () => {
			const logger = new ComplianceLogger();
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			await logger.log({
				type: 'permission_check',
				userId: 'user-1',
				permission: 'user:read',
				allowed: true,
				timestamp: Date.now()
			});

			expect(consoleSpy).toHaveBeenCalled();

			consoleSpy.mockRestore();
		});

		it('should save logs to compliance database', async () => {
			const logger = new ComplianceLogger();
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			await logger.log({
				type: 'permission_check',
				userId: 'user-1',
				permission: 'medical:read',
				allowed: true,
				timestamp: Date.now()
			});

			// Should have saved to database
			expect(consoleSpy).toHaveBeenCalled();

			consoleSpy.mockRestore();
		});
	});
});

describe('Audit Logger - Analytics Collection', () => {
	describe('AnalyticsLogger', () => {
		it('should send analytics when batch size is reached', () => {
			const logger = new AnalyticsLogger();
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			// Log enough events to trigger batch send (100 events)
			for (let i = 0; i < 100; i++) {
				logger.log({
					type: 'permission_check',
					userId: `user-${i}`,
					permission: `resource:${i % 2 === 0 ? 'read' : 'write'}`,
					allowed: i % 3 !== 0,
					timestamp: Date.now()
				});
			}

			// Should have sent analytics to console with message and stats object
			expect(consoleSpy).toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalledWith(
				'📊 Permission Analytics:',
				expect.any(Object)
			);

			consoleSpy.mockRestore();
		});
	});
});

describe('Utility Types - TypeScript Type Safety', () => {
	it('should support WithMetadata type helper', () => {
		type UserWithMeta = WithMetadata<{ id: string; name: string }>;
		const user: UserWithMeta = { id: '1', name: 'John', metadata: { department: 'Engineering' } };
		expect(user.metadata).toBeDefined();
		expect(user.id).toBe('1');
		expect(user.name).toBe('John');
	});

	it('should provide PermissionCheckType enum values', () => {
		expect(PermissionCheckType.PERMISSION_CHECK).toBe('permission_check');
		expect(PermissionCheckType.AUTHORIZATION).toBe('authorization');
		expect(PermissionCheckType.ROLE_CHECK).toBe('role_check');
	});

	it('should provide PermissionMask type for bit operations', () => {
		const mask: PermissionMask = 7;
		expect(mask).toBe(7);
		const anotherMask: PermissionMask = 15;
		expect(anotherMask).toBe(15);
	});
});

describe('Convenience Functions - Permission Checking', () => {
	it('should check single permission with hasPermission function', () => {
		const rbac = new RBAC({
			config: {
				permissions: [
					{ name: 'user:read' },
					{ name: 'user:write' }
				],
				roles: [
					{ name: 'admin', permissions: ['user:read', 'user:write'] }
				]
			}
		});

		const user = { id: '1', roles: ['admin'] };
		expect(hasPermission(user, 'user:read', rbac)).toBe(true);
		expect(hasPermission(user, 'user:delete', rbac)).toBe(false);
	});

	it('should check if user has any of the specified permissions', () => {
		const rbac = new RBAC({
			config: {
				permissions: [
					{ name: 'user:read' },
					{ name: 'user:write' },
					{ name: 'user:delete' }
				],
				roles: [
					{ name: 'admin', permissions: ['user:read', 'user:write'] }
				]
			}
		});

		const user = { id: '1', roles: ['admin'] };
		expect(hasAnyPermission(user, ['user:read', 'user:delete'], rbac)).toBe(true);
		expect(hasAnyPermission(user, ['user:delete', 'admin:read'], rbac)).toBe(false);
	});

	it('should check if user has all of the specified permissions', () => {
		const rbac = new RBAC({
			config: {
				permissions: [
					{ name: 'user:read' },
					{ name: 'user:write' },
					{ name: 'user:delete' }
				],
				roles: [
					{ name: 'admin', permissions: ['user:read', 'user:write'] }
				]
			}
		});

		const user = { id: '1', roles: ['admin'] };
		expect(hasAllPermissions(user, ['user:read', 'user:write'], rbac)).toBe(true);
		expect(hasAllPermissions(user, ['user:read', 'user:delete'], rbac)).toBe(false);
	});
});

describe('Integration Tests - End-to-End Feature Validation', () => {
	it('should work with all new features together', () => {
		const logger = new AnalyticsLogger();

		const rbac = new RBACBuilder()
			.addPermission('posts:read', 1)
			.addPermission('posts:write', 2)
			.addPermission('posts:delete', 4)
			.addPermission('posts:publish', 8)
			.addPermission('users:read', 16)
			.addPermission('settings:update', 32)
			.addRole('admin', ['posts:read', 'posts:write', 'posts:delete', 'users:read', 'settings:update'])
			.addRole('editor', ['posts:read', 'posts:write', 'posts:publish'])
			.addRole('viewer', ['posts:read'])
			.hierarchy({ admin: ['editor', 'viewer'] })
			.withAuditLogger(logger)
			.build();

		// Test utility functions
		expect(matchPermission('posts:read', 'posts:*')).toBe(true);
		expect(parsePermission('user:delete')).toEqual({ resource: 'user', action: 'delete' });

		// Test type guards
		const user = { id: '1', roles: ['admin'] };
		expect(isRBACUser(user)).toBe(true);

		// Test permissions
		expect(rbac.hasPermission(user, 'posts:delete')).toBe(true);
		expect(rbac.hasPermission(user, 'settings:update')).toBe(true);

		const viewer = { id: '2', roles: ['viewer'] };
		expect(rbac.hasPermission(viewer, 'posts:read')).toBe(true);
		expect(rbac.hasPermission(viewer, 'posts:write')).toBe(false);
	});

	it('should validate RBACError in error scenarios', () => {
		const error = new RBACError('Test error message', 'TEST_CODE');
		expect(error.message).toBe('Test error message');
		expect(error.code).toBe('TEST_CODE');
		expect(error.name).toBe('RBACError');
	});
});
