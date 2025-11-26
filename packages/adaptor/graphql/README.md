# @fire-shield/graphql

GraphQL adapter for Fire Shield RBAC with schema directives and field middleware.

## Installation

```bash
npm install @fire-shield/graphql @fire-shield/core graphql
```

## Features

- 🎯 **Schema Directives** - `@hasPermission`, `@hasRole`, `@hasAnyPermission`, `@hasAllPermissions`
- 🔒 **Field-level Protection** - Protect individual GraphQL fields
- ⚡ **Zero Runtime Overhead** - Directives are compiled at schema build time
- 🎨 **Type-safe** - Full TypeScript support
- 🔄 **Compatible** - Works with Apollo Server, GraphQL Yoga, and more

## Quick Start

```typescript
import { makeExecutableSchema } from '@graphql-tools/schema';
import { applyFireShieldDirectives, fireShieldDirectiveTypeDefs } from '@fire-shield/graphql';
import { RBAC } from '@fire-shield/core';

// Create RBAC instance
const rbac = new RBAC({
  preset: {
    permissions: [
      { name: 'user:read', bit: 1 },
      { name: 'user:write', bit: 2 },
      { name: 'post:write', bit: 4 },
    ],
    roles: [
      { name: 'viewer', permissions: ['user:read'] },
      { name: 'editor', permissions: ['user:read', 'user:write', 'post:write'] },
    ],
  },
});

// Define your schema with directives
const typeDefs = `
  ${fireShieldDirectiveTypeDefs}

  type Query {
    users: [User!]! @hasPermission(permission: "user:read")
    posts: [Post!]! @hasAnyPermission(permissions: ["post:read", "post:write"])
  }

  type Mutation {
    createUser(name: String!): User! @hasPermission(permission: "user:write")
    updateUser(id: ID!, name: String!): User! @hasRole(role: "editor")
    deleteUser(id: ID!): Boolean! @hasAllPermissions(permissions: ["user:write", "user:delete"])
  }

  type User {
    id: ID!
    name: String!
  }

  type Post {
    id: ID!
    title: String!
  }
`;

const resolvers = {
  Query: {
    users: () => [{ id: '1', name: 'John' }],
    posts: () => [{ id: '1', title: 'Hello' }],
  },
  Mutation: {
    createUser: (_, { name }) => ({ id: '2', name }),
    updateUser: (_, { id, name }) => ({ id, name }),
    deleteUser: () => true,
  },
};

// Create schema and apply directives
let schema = makeExecutableSchema({ typeDefs, resolvers });
schema = applyFireShieldDirectives(schema);

// Use with Apollo Server
import { ApolloServer } from '@apollo/server';

const server = new ApolloServer({
  schema,
});

// Provide RBAC and user in context
const context = ({ req }) => ({
  rbac,
  user: {
    id: req.user.id,
    roles: req.user.roles,
  },
});
```

## Available Directives

### @hasPermission

Requires a specific permission:

```graphql
type Query {
  users: [User!]! @hasPermission(permission: "user:read")
}
```

### @hasRole

Requires a specific role:

```graphql
type Mutation {
  deleteUser(id: ID!): Boolean! @hasRole(role: "admin")
}
```

### @hasAnyPermission

Requires at least one of the specified permissions:

```graphql
type Query {
  posts: [Post!]! @hasAnyPermission(permissions: ["post:read", "post:write"])
}
```

### @hasAllPermissions

Requires all of the specified permissions:

```graphql
type Mutation {
  deletePost(id: ID!): Boolean!
    @hasAllPermissions(permissions: ["post:delete", "post:admin"])
}
```

## Context Requirements

The GraphQL context must include:

```typescript
interface GraphQLRBACContext {
  rbac: RBAC;        // Fire Shield RBAC instance
  user?: RBACUser;   // Current user with roles
}
```

Example context provider:

```typescript
const context = ({ req }) => ({
  rbac: myRBACInstance,
  user: {
    id: req.user.id,
    roles: req.user.roles,
    // Optional: direct permissions
    permissions: req.user.permissions,
  },
});
```

## Error Handling

The directives throw `GraphQLError` with specific error codes:

```typescript
{
  extensions: {
    code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'RBAC_NOT_CONFIGURED',
    requiredPermission?: string,
    requiredRole?: string,
    requiredPermissions?: string[],
  }
}
```

Example error handler:

```typescript
const server = new ApolloServer({
  schema,
  formatError: (error) => {
    if (error.extensions?.code === 'FORBIDDEN') {
      return {
        message: 'You do not have permission to access this resource',
        extensions: error.extensions,
      };
    }
    return error;
  },
});
```

## Advanced Usage

### Custom Directive Names

```typescript
const schema = applyFireShieldDirectives(baseSchema, {
  hasPermission: { directiveName: 'requiresPermission' },
  hasRole: { directiveName: 'requiresRole' },
});
```

Then use in schema:

```graphql
directive @requiresPermission(permission: String!) on FIELD_DEFINITION
directive @requiresRole(role: String!) on FIELD_DEFINITION

type Query {
  users: [User!]! @requiresPermission(permission: "user:read")
}
```

### Combining with Other Tools

Works seamlessly with:
- **Apollo Server** - Full integration
- **GraphQL Yoga** - Context and schema transformation
- **Mercurius** (Fastify) - Schema directives support
- **Express GraphQL** - Standard context pattern

### Programmatic Permission Checks

You can also check permissions directly in resolvers:

```typescript
const resolvers = {
  Query: {
    users: (_, __, context: GraphQLRBACContext) => {
      // Manual check if needed
      if (!context.rbac.hasPermission(context.user, 'user:read')) {
        throw new GraphQLError('Permission denied');
      }
      return fetchUsers();
    },
  },
};
```

## TypeScript Support

Full type definitions included:

```typescript
import type { GraphQLRBACContext } from '@fire-shield/graphql';

interface MyContext extends GraphQLRBACContext {
  // Add your custom context properties
  db: Database;
  logger: Logger;
}

const resolvers = {
  Query: {
    users: (_, __, context: MyContext) => {
      // TypeScript knows about rbac, user, db, logger
      context.rbac.hasPermission(context.user, 'user:read');
      context.logger.info('Fetching users');
      return context.db.users.findMany();
    },
  },
};
```

## Examples

### Apollo Server v4

```typescript
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

const server = new ApolloServer({ schema });

const { url } = await startStandaloneServer(server, {
  context: async ({ req }) => ({
    rbac: myRBACInstance,
    user: await getUserFromRequest(req),
  }),
});
```

### GraphQL Yoga

```typescript
import { createYoga } from 'graphql-yoga';
import { createServer } from 'node:http';

const yoga = createYoga({
  schema,
  context: ({ request }) => ({
    rbac: myRBACInstance,
    user: getUserFromRequest(request),
  }),
});

createServer(yoga).listen(4000);
```

### With Express

```typescript
import express from 'express';
import { createHandler } from 'graphql-http/lib/use/express';

const app = express();

app.use('/graphql', createHandler({
  schema,
  context: (req) => ({
    rbac: myRBACInstance,
    user: req.user,
  }),
}));
```

## License

DIB © khapu2906
