# GraphQL Integration

Fire Shield provides GraphQL directives and middleware for field-level and resolver-level authorization in GraphQL servers.

## Features

- Custom directives (`@requirePermission`, `@requireRole`)
- Resolver middleware
- Field-level authorization
- Type-level authorization
- Works with Apollo Server, GraphQL Yoga, and others
- TypeScript support
- Schema-first and code-first approaches

## Installation

```bash
npm install @fire-shield/graphql @fire-shield/core graphql
```

## Quick Start

### 1. Setup RBAC

```typescript
import { RBAC } from '@fire-shield/core';

const rbac = new RBAC();
rbac.createRole('admin', ['user:*', 'post:*']);
rbac.createRole('editor', ['post:read', 'post:write']);
rbac.createRole('viewer', ['post:read']);
```

### 2. Add Directives to Schema

```graphql
directive @requirePermission(permission: String!) on FIELD_DEFINITION | OBJECT
directive @requireRole(role: String!) on FIELD_DEFINITION | OBJECT

type Query {
  posts: [Post!]! @requirePermission(permission: "post:read")
  users: [User!]! @requirePermission(permission: "user:read")
  adminStats: AdminStats! @requireRole(role: "admin")
}

type Mutation {
  createPost(input: CreatePostInput!): Post! @requirePermission(permission: "post:write")
  deletePost(id: ID!): Boolean! @requirePermission(permission: "post:delete")
  updateUser(id: ID!, input: UpdateUserInput!): User! @requirePermission(permission: "user:write")
}

type Post {
  id: ID!
  title: String!
  content: String!
  # Only editors and admins can see draft posts
  draft: Boolean! @requirePermission(permission: "post:edit")
}
```

### 3. Create GraphQL Server

```typescript
import { ApolloServer } from '@apollo/server';
import { createRBACDirectives, createRBACContext } from '@fire-shield/graphql';

const { requirePermissionDirective, requireRoleDirective } = createRBACDirectives(rbac);

const server = new ApolloServer({
  typeDefs,
  resolvers,
  // Add directives
  schemaDirectives: {
    requirePermission: requirePermissionDirective,
    requireRole: requireRoleDirective
  }
});

// Add RBAC context
app.use('/graphql', async (req, res) => {
  const user = await getUserFromRequest(req);

  await server.createHandler({
    context: createRBACContext(rbac, user)
  })(req, res);
});
```

## API

### createRBACDirectives(rbac, options?)

Creates GraphQL directives for authorization.

**Parameters:**
```typescript
interface RBACDirectiveOptions {
  onUnauthorized?: (result: AuthorizationResult, context: any) => void;
}
```

**Returns:**
```typescript
{
  requirePermissionDirective: SchemaDirectiveVisitor;
  requireRoleDirective: SchemaDirectiveVisitor;
}
```

**Example:**
```typescript
const { requirePermissionDirective, requireRoleDirective } = createRBACDirectives(rbac, {
  onUnauthorized: (result, context) => {
    throw new GraphQLError('Access Denied: ' + result.reason, {
      extensions: { code: 'FORBIDDEN' }
    });
  }
});
```

### createRBACContext(rbac, user)

Creates GraphQL context with RBAC utilities.

**Example:**
```typescript
const context = createRBACContext(rbac, user);

// In resolvers:
const canEdit = context.can('post:edit');
const isAdmin = context.hasRole('admin');
```

### Resolver Middleware

Protect resolvers programmatically:

```typescript
import { requirePermission, requireRole } from '@fire-shield/graphql';

const resolvers = {
  Query: {
    posts: requirePermission('post:read', async (parent, args, context) => {
      return await db.post.findMany();
    }),

    adminStats: requireRole('admin', async (parent, args, context) => {
      return await getAdminStatistics();
    })
  },

  Mutation: {
    createPost: requirePermission('post:write', async (parent, { input }, context) => {
      return await db.post.create({ data: input });
    }),

    deletePost: requirePermission('post:delete', async (parent, { id }, context) => {
      await db.post.delete({ where: { id } });
      return true;
    })
  }
};
```

## Usage with Apollo Server

```typescript
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createRBACDirectives, createRBACContext } from '@fire-shield/graphql';

const { requirePermissionDirective, requireRoleDirective } = createRBACDirectives(rbac);

let schema = makeExecutableSchema({
  typeDefs,
  resolvers
});

// Apply directives
schema = requirePermissionDirective(schema);
schema = requireRoleDirective(schema);

const server = new ApolloServer({
  schema
});

const { url } = await startStandaloneServer(server, {
  context: async ({ req }) => {
    const user = await getUserFromToken(req.headers.authorization);
    return createRBACContext(rbac, user);
  }
});

console.log(`🚀 Server ready at ${url}`);
```

## Usage with GraphQL Yoga

```typescript
import { createYoga } from 'graphql-yoga';
import { createServer } from 'node:http';
import { createRBACDirectives, createRBACContext } from '@fire-shield/graphql';

const { requirePermissionDirective, requireRoleDirective } = createRBACDirectives(rbac);

let schema = makeExecutableSchema({
  typeDefs,
  resolvers
});

schema = requirePermissionDirective(schema);
schema = requireRoleDirective(schema);

const yoga = createYoga({
  schema,
  context: async ({ request }) => {
    const token = request.headers.get('authorization');
    const user = await getUserFromToken(token);
    return createRBACContext(rbac, user);
  }
});

const server = createServer(yoga);
server.listen(4000, () => {
  console.log('Server is running on http://localhost:4000/graphql');
});
```

## Field-Level Authorization

Protect specific fields within a type:

```graphql
type User {
  id: ID!
  username: String!
  email: String!

  # Only visible to admins
  internalNotes: String @requireRole(role: "admin")

  # Only visible if user has permission
  privateData: JSON @requirePermission(permission: "user:private")

  # Only visible to the user themselves or admins
  apiKeys: [APIKey!]! @requirePermission(permission: "user:api-keys")
}
```

## Dynamic Authorization in Resolvers

For complex authorization logic:

```typescript
const resolvers = {
  Query: {
    post: async (parent, { id }, context) => {
      const post = await db.post.findUnique({ where: { id } });

      // Check if user can view this post
      if (!post.published && !context.can('post:view-unpublished')) {
        throw new GraphQLError('Post not found', {
          extensions: { code: 'NOT_FOUND' }
        });
      }

      return post;
    }
  },

  Mutation: {
    updatePost: async (parent, { id, input }, context) => {
      const post = await db.post.findUnique({ where: { id } });

      // Users can only edit their own posts unless they're admin
      const canEdit =
        context.user.id === post.authorId ||
        context.hasRole('admin');

      if (!canEdit) {
        throw new GraphQLError('Access Denied', {
          extensions: { code: 'FORBIDDEN' }
        });
      }

      return await db.post.update({
        where: { id },
        data: input
      });
    }
  },

  User: {
    // Field resolver with authorization
    email: (parent, args, context) => {
      // Users can only see their own email unless admin
      if (context.user.id !== parent.id && !context.hasRole('admin')) {
        return null; // Hide email
      }
      return parent.email;
    }
  }
};
```

## Context Utilities

The RBAC context provides helpful utilities:

```typescript
const context = createRBACContext(rbac, user);

// Permission checks
context.can('post:write'); // boolean
context.cannot('admin:access'); // boolean
context.hasAnyPermission(['post:write', 'post:delete']); // boolean
context.hasAllPermissions(['post:read', 'post:write']); // boolean

// Role checks
context.hasRole('admin'); // boolean
context.hasAnyRole(['admin', 'editor']); // boolean
context.hasAllRoles(['user', 'verified']); // boolean

// User info
context.user; // RBACUser | undefined
context.rbac; // RBAC instance
```

## Error Handling

Customize error responses:

```typescript
const { requirePermissionDirective, requireRoleDirective } = createRBACDirectives(rbac, {
  onUnauthorized: (result, context) => {
    // Log unauthorized attempts
    console.log('Unauthorized access:', {
      user: context.user?.id,
      reason: result.reason
    });

    // Throw custom GraphQL error
    throw new GraphQLError('You do not have permission to access this resource', {
      extensions: {
        code: 'FORBIDDEN',
        reason: result.reason,
        requiredPermission: result.permission
      }
    });
  }
});
```

## Subscription Authorization

Protect GraphQL subscriptions:

```graphql
type Subscription {
  postCreated: Post! @requirePermission(permission: "post:subscribe")
  adminNotifications: AdminNotification! @requireRole(role: "admin")
}
```

```typescript
const resolvers = {
  Subscription: {
    postCreated: {
      subscribe: requirePermission('post:subscribe', (parent, args, context) => {
        return pubsub.asyncIterator(['POST_CREATED']);
      })
    },

    adminNotifications: {
      subscribe: requireRole('admin', (parent, args, context) => {
        return pubsub.asyncIterator(['ADMIN_NOTIFICATION']);
      })
    }
  }
};
```

## Type-Level Authorization

Protect entire types:

```graphql
type AdminStats @requireRole(role: "admin") {
  totalUsers: Int!
  totalPosts: Int!
  revenue: Float!
}

type InternalReport @requirePermission(permission: "reports:internal") {
  id: ID!
  data: JSON!
  generatedAt: DateTime!
}
```

## Best Practices

1. **Use directives for simple checks** - Clean and declarative
2. **Use resolver middleware for complex logic** - More flexibility
3. **Combine field-level and resolver authorization** - Defense in depth
4. **Always validate on the server** - Never trust client checks
5. **Cache permission results** - Enable v2.2.0 caching for performance
6. **Provide clear error messages** - Help clients understand why access was denied

## Complete Example

```typescript
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { RBAC } from '@fire-shield/core';
import {
  createRBACDirectives,
  createRBACContext,
  requirePermission
} from '@fire-shield/graphql';

// Initialize RBAC
const rbac = new RBAC({
  enableCache: true, // Enable v2.2.0 caching
  cacheTTL: 60000
});

rbac.createRole('admin', ['*']);
rbac.createRole('editor', ['post:read', 'post:write', 'post:edit']);
rbac.createRole('viewer', ['post:read']);

// GraphQL schema
const typeDefs = `
  directive @requirePermission(permission: String!) on FIELD_DEFINITION | OBJECT
  directive @requireRole(role: String!) on FIELD_DEFINITION | OBJECT

  type Query {
    posts: [Post!]! @requirePermission(permission: "post:read")
    post(id: ID!): Post
  }

  type Mutation {
    createPost(input: CreatePostInput!): Post! @requirePermission(permission: "post:write")
    updatePost(id: ID!, input: UpdatePostInput!): Post!
    deletePost(id: ID!): Boolean! @requirePermission(permission: "post:delete")
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    published: Boolean!
    draft: String @requirePermission(permission: "post:edit")
  }

  input CreatePostInput {
    title: String!
    content: String!
  }

  input UpdatePostInput {
    title: String
    content: String
  }
`;

// Resolvers
const resolvers = {
  Query: {
    posts: async () => await db.post.findMany(),
    post: async (parent, { id }) => await db.post.findUnique({ where: { id } })
  },

  Mutation: {
    createPost: async (parent, { input }, context) => {
      return await db.post.create({
        data: { ...input, authorId: context.user.id }
      });
    },

    updatePost: requirePermission('post:write', async (parent, { id, input }, context) => {
      return await db.post.update({ where: { id }, data: input });
    }),

    deletePost: async (parent, { id }, context) => {
      await db.post.delete({ where: { id } });
      return true;
    }
  }
};

// Create schema with directives
const { requirePermissionDirective, requireRoleDirective } = createRBACDirectives(rbac);

let schema = makeExecutableSchema({ typeDefs, resolvers });
schema = requirePermissionDirective(schema);
schema = requireRoleDirective(schema);

// Create Apollo Server
const server = new ApolloServer({ schema });

const { url } = await startStandaloneServer(server, {
  context: async ({ req }) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token);
    return createRBACContext(rbac, user);
  }
});

console.log(`🚀 Server ready at ${url}`);
```

## Next Steps

- [tRPC Integration](/frameworks/trpc) - Type-safe RPC with RBAC
- [Core Concepts](/guide/permissions) - Understanding permissions
- [API Reference](/api/core) - Complete API documentation
