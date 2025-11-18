/**
 * Framework Integration Examples
 *
 * This example demonstrates how to integrate RBAC with popular frameworks:
 * - Express.js middleware
 * - NestJS guards
 * - GraphQL directives
 * - REST API endpoints
 */

import { RBAC, defaultPreset } from '../lib/index';

console.log('=== Framework Integration Examples ===\n');

// Initialize RBAC
const rbac = new RBAC({ preset: defaultPreset });

// === PATTERN 1: Express.js Middleware ===
console.log('PATTERN 1: Express.js Middleware\n');

// Simulated Express types
interface Request {
  user?: { id: string; roles: string[] };
  params?: { [key: string]: string };
  body?: any;
}

interface Response {
  status: (code: number) => Response;
  json: (data: any) => void;
}

type NextFunction = () => void;

/**
 * Express middleware for RBAC authorization
 */
function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = rbac.authorize(req.user, permission);
    if (!result.allowed) {
      res.status(403).json({
        error: 'Forbidden',
        reason: result.reason
      });
      return;
    }

    next();
  };
}

/**
 * Middleware that checks any of multiple permissions
 */
function requireAnyPermission(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!rbac.hasAnyPermission(req.user, permissions)) {
      res.status(403).json({
        error: 'Forbidden',
        reason: `Requires one of: ${permissions.join(', ')}`
      });
      return;
    }

    next();
  };
}

/**
 * Resource ownership middleware
 */
function requireOwnershipOr(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check if user owns the resource
    const resourceOwnerId = req.params?.userId || req.body?.userId;
    const isOwner = resourceOwnerId === req.user.id;

    // Owner can proceed, or user with permission
    if (isOwner || rbac.hasPermission(req.user, permission)) {
      next();
      return;
    }

    res.status(403).json({ error: 'Forbidden' });
  };
}

// Example Express routes
console.log('Express.js route examples:\n');

interface Route {
  method: string;
  path: string;
  middleware: string[];
  handler: string;
}

const expressRoutes: Route[] = [
  {
    method: 'GET',
    path: '/api/users',
    middleware: ['requirePermission("user:read")'],
    handler: 'listUsers'
  },
  {
    method: 'POST',
    path: '/api/users',
    middleware: ['requirePermission("user:create")'],
    handler: 'createUser'
  },
  {
    method: 'PUT',
    path: '/api/users/:userId',
    middleware: ['requireOwnershipOr("user:update")'],
    handler: 'updateUser'
  },
  {
    method: 'DELETE',
    path: '/api/users/:userId',
    middleware: ['requireAnyPermission("user:delete", "admin:user:manage")'],
    handler: 'deleteUser'
  }
];

console.log('```javascript');
expressRoutes.forEach(route => {
  console.log(`app.${route.method.toLowerCase()}('${route.path}',`);
  route.middleware.forEach(mw => console.log(`  ${mw},`));
  console.log(`  ${route.handler}`);
  console.log(`);\n`);
});
console.log('```\n');

// Test middleware
console.log('Testing Express middleware:\n');

const simulateRequest = (user: any, permission: string): boolean => {
  const req: Request = { user };
  let authorized = false;
  const res: Response = {
    status: (code: number) => res,
    json: (data: any) => {
      if (data.error) {
        console.log(`  ✗ ${data.error}: ${data.reason || 'No access'}`);
      }
    }
  };
  const next = () => {
    console.log(`  ✓ Authorized`);
    authorized = true;
  };

  requirePermission(permission)(req, res, next);
  return authorized;
};

const user = { id: 'user-1', roles: ['user'] };
const admin = { id: 'admin-1', roles: ['admin'] };

console.log('User trying to read users:');
simulateRequest(user, 'user:read');

console.log('\nUser trying to create users:');
simulateRequest(user, 'user:create');

console.log('\nAdmin trying to create users:');
simulateRequest(admin, 'user:create');

// === PATTERN 2: NestJS Guard ===
console.log('\n\nPATTERN 2: NestJS Guard\n');

// Simulated NestJS types
interface ExecutionContext {
  switchToHttp: () => {
    getRequest: () => any;
  };
}

/**
 * NestJS guard for permission-based authorization
 */
class PermissionGuard {
  constructor(
    private readonly rbac: RBAC,
    private readonly permission: string
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    return this.rbac.hasPermission(user, this.permission);
  }
}

/**
 * Custom decorator for permissions
 */
function Permissions(...permissions: string[]) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    // In real NestJS, this would set metadata
    console.log(`@Permissions([${permissions.join(', ')}]) decorator applied to ${propertyKey}`);
  };
}

console.log('NestJS controller example:\n');
console.log('```typescript');
console.log(`
@Controller('users')
export class UsersController {
  constructor(private readonly rbac: RBAC) {}

  @Get()
  @Permissions('user:read')
  async findAll() {
    // Returns all users
  }

  @Post()
  @Permissions('user:create')
  async create(@Body() createUserDto: CreateUserDto) {
    // Creates a new user
  }

  @Put(':id')
  @Permissions('user:update')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    // Updates user
  }

  @Delete(':id')
  @Permissions('user:delete', 'admin:user:manage')
  async remove(@Param('id') id: string) {
    // Requires either user:delete or admin:user:manage
  }
}
`);
console.log('```\n');

// === PATTERN 3: GraphQL Directive ===
console.log('\nPATTERN 3: GraphQL Directive\n');

/**
 * GraphQL directive for permission checking
 */
class AuthDirective {
  constructor(private readonly rbac: RBAC) {}

  visitFieldDefinition(field: any, details: any) {
    const { resolve = defaultFieldResolver } = field;
    const requiredPermission = details.args.requires;

    field.resolve = async function (source: any, args: any, context: any, info: any) {
      const user = context.user;

      if (!user) {
        throw new Error('Unauthorized');
      }

      if (!rbac.hasPermission(user, requiredPermission)) {
        throw new Error(`Forbidden: requires ${requiredPermission}`);
      }

      return resolve.call(this, source, args, context, info);
    };
  }
}

function defaultFieldResolver(source: any, args: any) {
  return source;
}

console.log('GraphQL schema example:\n');
console.log('```graphql');
console.log(`
type Query {
  users: [User!]! @auth(requires: "user:read")
  user(id: ID!): User @auth(requires: "user:read")
}

type Mutation {
  createUser(input: CreateUserInput!): User! @auth(requires: "user:create")
  updateUser(id: ID!, input: UpdateUserInput!): User! @auth(requires: "user:update")
  deleteUser(id: ID!): Boolean! @auth(requires: "user:delete")
}

directive @auth(requires: String!) on FIELD_DEFINITION
`);
console.log('```\n');

// === PATTERN 4: REST API Helper ===
console.log('\nPATTERN 4: REST API Helper Class\n');

interface ApiRequest {
  user: { id: string; roles: string[] };
  resource: string;
  action: string;
  data?: any;
}

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
  };
}

class RBACApiController {
  constructor(private readonly rbac: RBAC) {}

  /**
   * Execute an action with RBAC check
   */
  async execute(
    request: ApiRequest,
    handler: (data?: any) => Promise<any>
  ): Promise<ApiResponse> {
    const permission = `${request.resource}:${request.action}`;

    // Check permission
    const authResult = this.rbac.authorize(request.user, permission);
    if (!authResult.allowed) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: authResult.reason || 'Access denied'
        }
      };
    }

    // Execute handler
    try {
      const data = await handler(request.data);
      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Batch permission check
   */
  checkPermissions(
    user: { id: string; roles: string[] },
    permissions: string[]
  ): { [key: string]: boolean } {
    const result: { [key: string]: boolean } = {};
    permissions.forEach(permission => {
      result[permission] = this.rbac.hasPermission(user, permission);
    });
    return result;
  }
}

const apiController = new RBACApiController(rbac);

console.log('API Controller usage:\n');

// Test API controller
const testApiRequest = async () => {
  const request: ApiRequest = {
    user: { id: 'user-1', roles: ['user'] },
    resource: 'user',
    action: 'read'
  };

  const response = await apiController.execute(request, async () => {
    return { id: 'user-1', name: 'John Doe' };
  });

  console.log('API Response:', JSON.stringify(response, null, 2));
};

await testApiRequest();

// Check multiple permissions
console.log('\nBatch permission check:');
const permissions = apiController.checkPermissions(
  { id: 'user-1', roles: ['editor'] },
  ['user:read', 'user:create', 'user:delete', 'moderator:content:manage']
);
console.log(JSON.stringify(permissions, null, 2));

// === PATTERN 5: Webhook Authorization ===
console.log('\n\nPATTERN 5: Webhook Authorization\n');

interface WebhookEvent {
  type: string;
  userId: string;
  data: any;
}

class WebhookAuthorizer {
  constructor(private readonly rbac: RBAC) {}

  /**
   * Authorize webhook event processing
   */
  canProcessWebhook(
    user: { id: string; roles: string[] },
    event: WebhookEvent
  ): { allowed: boolean; reason?: string } {
    // Map webhook event types to permissions
    const eventPermissionMap: { [key: string]: string } = {
      'user.created': 'webhook:user:process',
      'user.updated': 'webhook:user:process',
      'order.placed': 'webhook:order:process',
      'payment.received': 'webhook:payment:process'
    };

    const requiredPermission = eventPermissionMap[event.type];
    if (!requiredPermission) {
      return {
        allowed: false,
        reason: `Unknown webhook event type: ${event.type}`
      };
    }

    return this.rbac.authorize(user, requiredPermission);
  }
}

// Register webhook permissions
rbac.registerPermission('webhook:user:process');
rbac.registerPermission('webhook:order:process');
rbac.registerPermission('webhook:payment:process');

rbac.createRole('webhook-processor', [
  'webhook:user:process',
  'webhook:order:process'
]);

const webhookAuthorizer = new WebhookAuthorizer(rbac);

console.log('Webhook authorization examples:\n');

const webhookUser = { id: 'webhook-1', roles: ['webhook-processor'] };

const events: WebhookEvent[] = [
  { type: 'user.created', userId: 'user-1', data: {} },
  { type: 'order.placed', userId: 'user-1', data: {} },
  { type: 'payment.received', userId: 'user-1', data: {} }
];

events.forEach(event => {
  const result = webhookAuthorizer.canProcessWebhook(webhookUser, event);
  console.log(`Event: ${event.type}`);
  console.log(`  Allowed: ${result.allowed}`);
  if (!result.allowed) {
    console.log(`  Reason: ${result.reason}`);
  }
  console.log();
});

console.log('=== Summary ===');
console.log('Framework integrations demonstrated:');
console.log('  ✓ Express.js middleware');
console.log('  ✓ NestJS guards and decorators');
console.log('  ✓ GraphQL directives');
console.log('  ✓ REST API controller helpers');
console.log('  ✓ Webhook authorization');
