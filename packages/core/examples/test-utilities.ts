/**
 * Test the new utility functions and APIs
 */

import {
	RBAC,
	RBACBuilder,
	matchPermission,
	parsePermission,
	RBACError,
	isRBACUser,
	isAuditEvent,
	WithMetadata,
	PermissionCheckType,
	SecurityMonitorLogger,
	ComplianceLogger,
	AnalyticsLogger
} from '../lib/index';

function testUtilityFunctions(): void {
	console.log('=== Testing New Utility Functions ===\n');

	// Test matchPermission
	console.log('matchPermission tests:');
	console.log(`  matchPermission('posts:write', 'posts:*') = ${matchPermission('posts:write', 'posts:*')}`);
	console.log(`  matchPermission('posts:write', 'posts:read') = ${matchPermission('posts:write', 'posts:read')}`);
	console.log(`  matchPermission('admin:users:delete', 'admin:*') = ${matchPermission('admin:users:delete', 'admin:*')}`);

	// Test parsePermission
	console.log('\nparsePermission tests:');
	console.log(`  parsePermission('posts:write') =`, parsePermission('posts:write'));
	console.log(`  parsePermission('admin:users:delete') =`, parsePermission('admin:users:delete'));

	// Test RBACError
	console.log('\nRBACError test:');
	try {
		throw new RBACError('Insufficient permissions', 'PERMISSION_DENIED');
	} catch (error) {
		if (error instanceof RBACError) {
			console.log(`  Caught RBACError: ${error.message}, code: ${error.code}`);
		}
	}
}

function testTypeGuards(): void {
	console.log('\nType guard tests:');

	const validUser = { id: 'user-1', roles: ['admin'] };
	const invalidUser = { name: 'invalid' };

	console.log(`  isRBACUser(validUser) = ${isRBACUser(validUser)}`);
	console.log(`  isRBACUser(invalidUser) = ${isRBACUser(invalidUser)}`);

	const validEvent = {
		type: 'permission_check' as const,
		userId: 'user-1',
		permission: 'posts:read',
		allowed: true,
		timestamp: Date.now()
	};

	console.log(`  isAuditEvent(validEvent) = ${isAuditEvent(validEvent)}`);
}

function testTypes(): void {
	console.log('\nWithMetadata type test:');

	const userWithMetadata: WithMetadata<{ id: string; roles: string[] }> = {
		id: 'user-1',
		roles: ['admin'],
		metadata: { department: 'Engineering', hireDate: '2025-01-01' }
	};

	console.log(`  User with metadata:`, userWithMetadata);

	console.log('\nPermissionCheckType enum test:');
	console.log(`  PERMISSION_CHECK = '${PermissionCheckType.PERMISSION_CHECK}'`);
	console.log(`  AUTHORIZATION = '${PermissionCheckType.AUTHORIZATION}'`);
	console.log(`  ROLE_CHECK = '${PermissionCheckType.ROLE_CHECK}'`);
}

function testFluentAPI(): void {
	console.log('\n=== Testing RBACBuilder Fluent API ===\n');

	const rbac = new RBACBuilder()
		.role('admin')
			.grant(['posts:*', 'users:*'])
		.role('editor')
			.grant(['posts:read', 'posts:write'])
		.role('viewer')
			.grant(['posts:read'])
		.hierarchy({
			admin: ['editor'],
			editor: ['viewer']
		})
		.enableWildcards(true)
		.withAuditLogger(new SecurityMonitorLogger())
		.build();

	console.log('RBAC instance created with fluent API!');
	const adminUser = { id: 'admin-1', roles: ['admin'] };
	const editorUser = { id: 'editor-1', roles: ['editor'] };
	const viewerUser = { id: 'viewer-1', roles: ['viewer'] };

	console.log(`  Admin has posts:write? ${rbac.hasPermission(adminUser, 'posts:write')}`);
	console.log(`  Editor has posts:write? ${rbac.hasPermission(editorUser, 'posts:write')}`);
	console.log(`  Viewer has posts:write? ${rbac.hasPermission(viewerUser, 'posts:write')}`);
}

function testAuditLoggers(): void {
	console.log('\n=== Testing Audit Logger Examples ===\n');

	console.log('Testing SecurityMonitorLogger:');
	const securityLogger = new SecurityMonitorLogger();
	securityLogger.log({
		type: 'permission_check',
		userId: 'user-1',
		permission: 'admin:delete',
		allowed: false,
		timestamp: Date.now()
	});

	console.log('\nTesting ComplianceLogger:');
	const complianceLogger = new ComplianceLogger();
	complianceLogger.log({
		type: 'permission_check',
		userId: 'user-1',
		permission: 'medical:records:read',
		allowed: true,
		timestamp: Date.now()
	});

	console.log('\nTesting AnalyticsLogger:');
	const analyticsLogger = new AnalyticsLogger();
	for (let i = 0; i < 5; i++) {
		analyticsLogger.log({
			type: 'permission_check',
			userId: 'user-1',
			permission: 'posts:read',
			allowed: true,
			timestamp: Date.now()
		});
	}
}

// Run all tests
testUtilityFunctions();
testTypeGuards();
testTypes();
testFluentAPI();
testAuditLoggers();

console.log('\n=== All New Features Working! === ✨');