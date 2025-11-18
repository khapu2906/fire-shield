/**
 * Manual Persistence Example
 * Shows how to handle state persistence yourself
 * Core library is pure logic - YOU choose where to save
 */

import { RBACBuilder } from '../lib/builder';

// Build RBAC with config
const rbac = new RBACBuilder()
	.addPermission('post:read', 1)
	.addPermission('post:write', 2)
	.addPermission('post:delete', 4)
	.addRole('reader', ['post:read'], { level: 1 })
	.addRole('writer', ['post:read', 'post:write'], { level: 5 })
	.addRole('editor', ['post:read', 'post:write', 'post:delete'], { level: 10 })
	.build();

// ===========================================
// FRONTEND: Save to localStorage
// ===========================================
function saveToLocalStorage() {
	const state = rbac.serialize();
	localStorage.setItem('rbac_state', JSON.stringify(state));
	console.log('✅ State saved to localStorage');
}

function loadFromLocalStorage() {
	const saved = localStorage.getItem('rbac_state');
	if (saved) {
		const state = JSON.parse(saved);
		rbac.deserialize(state);
		console.log('✅ State loaded from localStorage');
	}
}

// Usage
// saveToLocalStorage();
// On next session:
// loadFromLocalStorage();

// ===========================================
// BACKEND: Save to File (Node.js)
// ===========================================
async function saveToFile() {
	const fs = await import('fs/promises');
	const json = rbac.toJSON(); // Returns JSON string
	await fs.writeFile('./rbac-state.json', json);
	console.log('✅ State saved to file');
}

async function loadFromFile() {
	const fs = await import('fs/promises');
	try {
		const json = await fs.readFile('./rbac-state.json', 'utf-8');
		rbac.fromJSON(json);
		console.log('✅ State loaded from file');
	} catch (error) {
		console.log('ℹ️ No saved state found, using fresh instance');
	}
}

// ===========================================
// BACKEND: Save to Database (Prisma example)
// ===========================================
async function saveToDatabase() {
	// Assuming you have Prisma client setup
	// const prisma = new PrismaClient();

	const state = rbac.serialize();

	// await prisma.rbacState.create({
	//   data: {
	//     state: JSON.stringify(state),
	//     version: state.bitPermissions.version,
	//     timestamp: new Date(state.timestamp)
	//   }
	// });

	console.log('✅ State saved to database');
}

async function loadFromDatabase() {
	// const prisma = new PrismaClient();

	// const saved = await prisma.rbacState.findFirst({
	//   orderBy: { timestamp: 'desc' }
	// });

	// if (saved) {
	//   const state = JSON.parse(saved.state);
	//   rbac.deserialize(state);
	//   console.log('✅ State loaded from database');
	// }
}

// ===========================================
// BACKEND: Save to Redis
// ===========================================
async function saveToRedis() {
	// Assuming Redis client setup
	// const redis = new Redis();

	const json = rbac.toJSON();

	// await redis.set('rbac:state', json);
	// await redis.expire('rbac:state', 86400); // 24h TTL

	console.log('✅ State saved to Redis');
}

async function loadFromRedis() {
	// const redis = new Redis();

	// const json = await redis.get('rbac:state');
	// if (json) {
	//   rbac.fromJSON(json);
	//   console.log('✅ State loaded from Redis');
	// }
}

// ===========================================
// Test the RBAC
// ===========================================
const user = { id: '1', roles: ['writer'] };

console.log('Can read:', rbac.hasPermission(user, 'post:read')); // true
console.log('Can write:', rbac.hasPermission(user, 'post:write')); // true
console.log('Can delete:', rbac.hasPermission(user, 'post:delete')); // false

// ===========================================
// Key Takeaway:
// - Core library = pure logic
// - YOU decide: localStorage? File? DB? Redis?
// - Use serialize() / deserialize() or toJSON() / fromJSON()
// ===========================================
