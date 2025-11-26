import { describe, it, expect, beforeEach } from 'vitest';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { graphql, GraphQLError } from 'graphql';
import {
  applyFireShieldDirectives,
  fireShieldDirectiveTypeDefs,
  createHasPermissionDirective,
  createHasRoleDirective,
  createHasAnyPermissionDirective,
  createHasAllPermissionsDirective,
} from '../index';
import { RBAC } from '@fire-shield/core';
import type { GraphQLRBACContext } from '../index';

describe('GraphQL Directives', () => {
  let rbac: RBAC;

  beforeEach(() => {
    rbac = new RBAC({
      preset: {
        permissions: [
          { name: 'user:read', bit: 1 },
          { name: 'user:write', bit: 2 },
          { name: 'user:delete', bit: 4 },
          { name: 'post:read', bit: 8 },
          { name: 'post:write', bit: 16 },
        ],
        roles: [
          {
            name: 'viewer',
            permissions: ['user:read', 'post:read'],
            level: 1,
          },
          {
            name: 'editor',
            permissions: ['user:read', 'user:write', 'post:read', 'post:write'],
            level: 5,
          },
          {
            name: 'admin',
            permissions: ['user:read', 'user:write', 'user:delete', 'post:read', 'post:write'],
            level: 10,
          },
        ],
      },
    });
  });

  describe('@hasPermission directive', () => {
    it('should allow access when user has required permission', async () => {
      const typeDefs = `
        ${fireShieldDirectiveTypeDefs}

        type Query {
          users: [User!]! @hasPermission(permission: "user:read")
        }

        type User {
          id: ID!
          name: String!
        }
      `;

      const resolvers = {
        Query: {
          users: () => [{ id: '1', name: 'Alice' }],
        },
      };

      let schema = makeExecutableSchema({ typeDefs, resolvers });
      schema = applyFireShieldDirectives(schema);

      const context: GraphQLRBACContext = {
        rbac,
        user: { id: 'user1', roles: ['viewer'] },
      };

      const result = await graphql({
        schema,
        source: '{ users { id name } }',
        contextValue: context,
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.users).toEqual([{ id: '1', name: 'Alice' }]);
    });

    it('should deny access when user lacks required permission', async () => {
      const typeDefs = `
        ${fireShieldDirectiveTypeDefs}

        type Query {
          users: [User!]! @hasPermission(permission: "user:write")
        }

        type User {
          id: ID!
          name: String!
        }
      `;

      const resolvers = {
        Query: {
          users: () => [{ id: '1', name: 'Alice' }],
        },
      };

      let schema = makeExecutableSchema({ typeDefs, resolvers });
      schema = applyFireShieldDirectives(schema);

      const context: GraphQLRBACContext = {
        rbac,
        user: { id: 'user1', roles: ['viewer'] },
      };

      const result = await graphql({
        schema,
        source: '{ users { id name } }',
        contextValue: context,
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toContain('Missing required permission: user:write');
      expect(result.errors?.[0].extensions?.code).toBe('FORBIDDEN');
    });

    it('should deny access when user is not authenticated', async () => {
      const typeDefs = `
        ${fireShieldDirectiveTypeDefs}

        type Query {
          users: [User!]! @hasPermission(permission: "user:read")
        }

        type User {
          id: ID!
          name: String!
        }
      `;

      const resolvers = {
        Query: {
          users: () => [{ id: '1', name: 'Alice' }],
        },
      };

      let schema = makeExecutableSchema({ typeDefs, resolvers });
      schema = applyFireShieldDirectives(schema);

      const context: GraphQLRBACContext = {
        rbac,
        user: undefined,
      };

      const result = await graphql({
        schema,
        source: '{ users { id name } }',
        contextValue: context,
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toBe('User not authenticated');
      expect(result.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('@hasRole directive', () => {
    it('should allow access when user has required role', async () => {
      const typeDefs = `
        ${fireShieldDirectiveTypeDefs}

        type Query {
          _dummy: Boolean
        }

        type Mutation {
          deleteUser(id: ID!): Boolean! @hasRole(role: "admin")
        }
      `;

      const resolvers = {
        Mutation: {
          deleteUser: () => true,
        },
      };

      let schema = makeExecutableSchema({ typeDefs, resolvers });
      schema = applyFireShieldDirectives(schema);

      const context: GraphQLRBACContext = {
        rbac,
        user: { id: 'admin1', roles: ['admin'] },
      };

      const result = await graphql({
        schema,
        source: 'mutation { deleteUser(id: "1") }',
        contextValue: context,
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.deleteUser).toBe(true);
    });

    it('should deny access when user lacks required role', async () => {
      const typeDefs = `
        ${fireShieldDirectiveTypeDefs}

        type Query {
          _dummy: Boolean
        }

        type Mutation {
          deleteUser(id: ID!): Boolean! @hasRole(role: "admin")
        }
      `;

      const resolvers = {
        Mutation: {
          deleteUser: () => true,
        },
      };

      let schema = makeExecutableSchema({ typeDefs, resolvers });
      schema = applyFireShieldDirectives(schema);

      const context: GraphQLRBACContext = {
        rbac,
        user: { id: 'editor1', roles: ['editor'] },
      };

      const result = await graphql({
        schema,
        source: 'mutation { deleteUser(id: "1") }',
        contextValue: context,
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toContain('Missing required role: admin');
      expect(result.errors?.[0].extensions?.code).toBe('FORBIDDEN');
    });
  });

  describe('@hasAnyPermission directive', () => {
    it('should allow access when user has any required permission', async () => {
      const typeDefs = `
        ${fireShieldDirectiveTypeDefs}

        type Query {
          posts: [Post!]! @hasAnyPermission(permissions: ["post:read", "post:write"])
        }

        type Post {
          id: ID!
          title: String!
        }
      `;

      const resolvers = {
        Query: {
          posts: () => [{ id: '1', title: 'Hello' }],
        },
      };

      let schema = makeExecutableSchema({ typeDefs, resolvers });
      schema = applyFireShieldDirectives(schema);

      const context: GraphQLRBACContext = {
        rbac,
        user: { id: 'viewer1', roles: ['viewer'] },
      };

      const result = await graphql({
        schema,
        source: '{ posts { id title } }',
        contextValue: context,
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.posts).toEqual([{ id: '1', title: 'Hello' }]);
    });

    it('should deny access when user has none of the required permissions', async () => {
      const typeDefs = `
        ${fireShieldDirectiveTypeDefs}

        type Query {
          posts: [Post!]! @hasAnyPermission(permissions: ["user:delete", "post:write"])
        }

        type Post {
          id: ID!
          title: String!
        }
      `;

      const resolvers = {
        Query: {
          posts: () => [{ id: '1', title: 'Hello' }],
        },
      };

      let schema = makeExecutableSchema({ typeDefs, resolvers });
      schema = applyFireShieldDirectives(schema);

      const context: GraphQLRBACContext = {
        rbac,
        user: { id: 'viewer1', roles: ['viewer'] },
      };

      const result = await graphql({
        schema,
        source: '{ posts { id title } }',
        contextValue: context,
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toContain('Missing any of required permissions');
    });
  });

  describe('@hasAllPermissions directive', () => {
    it('should allow access when user has all required permissions', async () => {
      const typeDefs = `
        ${fireShieldDirectiveTypeDefs}

        type Query {
          _dummy: Boolean
        }

        type Mutation {
          superDelete: Boolean! @hasAllPermissions(permissions: ["user:delete", "post:read"])
        }
      `;

      const resolvers = {
        Mutation: {
          superDelete: () => true,
        },
      };

      let schema = makeExecutableSchema({ typeDefs, resolvers });
      schema = applyFireShieldDirectives(schema);

      const context: GraphQLRBACContext = {
        rbac,
        user: { id: 'admin1', roles: ['admin'] },
      };

      const result = await graphql({
        schema,
        source: 'mutation { superDelete }',
        contextValue: context,
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.superDelete).toBe(true);
    });

    it('should deny access when user lacks any required permission', async () => {
      const typeDefs = `
        ${fireShieldDirectiveTypeDefs}

        type Query {
          _dummy: Boolean
        }

        type Mutation {
          superDelete: Boolean! @hasAllPermissions(permissions: ["user:delete", "post:write"])
        }
      `;

      const resolvers = {
        Mutation: {
          superDelete: () => true,
        },
      };

      let schema = makeExecutableSchema({ typeDefs, resolvers });
      schema = applyFireShieldDirectives(schema);

      const context: GraphQLRBACContext = {
        rbac,
        user: { id: 'editor1', roles: ['editor'] },
      };

      const result = await graphql({
        schema,
        source: 'mutation { superDelete }',
        contextValue: context,
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toContain('Missing all required permissions');
    });
  });

  describe('Error handling', () => {
    it('should throw error when RBAC is not configured', async () => {
      const typeDefs = `
        ${fireShieldDirectiveTypeDefs}

        type Query {
          users: [User!]! @hasPermission(permission: "user:read")
        }

        type User {
          id: ID!
          name: String!
        }
      `;

      const resolvers = {
        Query: {
          users: () => [{ id: '1', name: 'Alice' }],
        },
      };

      let schema = makeExecutableSchema({ typeDefs, resolvers });
      schema = applyFireShieldDirectives(schema);

      const context = {
        user: { id: 'user1', roles: ['viewer'] },
      } as any;

      const result = await graphql({
        schema,
        source: '{ users { id name } }',
        contextValue: context,
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toBe('RBAC not configured in context');
      expect(result.errors?.[0].extensions?.code).toBe('RBAC_NOT_CONFIGURED');
    });
  });

  describe('Individual directive creators', () => {
    it('should work with custom directive names', async () => {
      const typeDefs = `
        directive @requiresPermission(permission: String!) on FIELD_DEFINITION

        type Query {
          users: [User!]! @requiresPermission(permission: "user:read")
        }

        type User {
          id: ID!
          name: String!
        }
      `;

      const resolvers = {
        Query: {
          users: () => [{ id: '1', name: 'Alice' }],
        },
      };

      let schema = makeExecutableSchema({ typeDefs, resolvers });
      schema = createHasPermissionDirective({ directiveName: 'requiresPermission' })(schema);

      const context: GraphQLRBACContext = {
        rbac,
        user: { id: 'user1', roles: ['viewer'] },
      };

      const result = await graphql({
        schema,
        source: '{ users { id name } }',
        contextValue: context,
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.users).toEqual([{ id: '1', name: 'Alice' }]);
    });
  });
});
