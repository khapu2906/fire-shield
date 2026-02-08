/**
 * Fire Shield GraphQL Adapter
 * Provides GraphQL directives and middleware for RBAC
 */

import { GraphQLError, GraphQLSchema, defaultFieldResolver } from 'graphql';
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils';
import type { RBAC, RBACUser } from '@fire-shield/core';

export interface GraphQLRBACContext {
  rbac: RBAC;
  user?: RBACUser;
}

export interface HasPermissionDirectiveConfig {
  directiveName?: string;
}

export interface HasRoleDirectiveConfig {
  directiveName?: string;
}

/**
 * Create @hasPermission directive transformer
 * Usage: @hasPermission(permission: "user:write")
 */
export function createHasPermissionDirective(
  config: HasPermissionDirectiveConfig = {}
) {
  const directiveName = config.directiveName || 'hasPermission';

  return (schema: GraphQLSchema): GraphQLSchema => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const directive = getDirective(schema, fieldConfig, directiveName)?.[0];

        if (directive) {
          const { permission } = directive;
          const { resolve = defaultFieldResolver } = fieldConfig;

          fieldConfig.resolve = async function (source, args, context: GraphQLRBACContext, info) {
            // Check if RBAC is available
            if (!context.rbac) {
              throw new GraphQLError('RBAC not configured in context', {
                extensions: { code: 'RBAC_NOT_CONFIGURED' },
              });
            }

            // Check if user is available
            if (!context.user) {
              throw new GraphQLError('User not authenticated', {
                extensions: { code: 'UNAUTHENTICATED' },
              });
            }

            // Check permission
            const hasPermission = context.rbac.hasPermission(context.user, permission);

            if (!hasPermission) {
              throw new GraphQLError(`Missing required permission: ${permission}`, {
                extensions: {
                  code: 'FORBIDDEN',
                  requiredPermission: permission,
                },
              });
            }

            return resolve(source, args, context, info);
          };
        }

        return fieldConfig;
      },
    });
  };
}

/**
 * Create @hasRole directive transformer
 * Usage: @hasRole(role: "admin")
 */
export function createHasRoleDirective(
  config: HasRoleDirectiveConfig = {}
) {
  const directiveName = config.directiveName || 'hasRole';

  return (schema: GraphQLSchema): GraphQLSchema => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const directive = getDirective(schema, fieldConfig, directiveName)?.[0];

        if (directive) {
          const { role } = directive;
          const { resolve = defaultFieldResolver } = fieldConfig;

          fieldConfig.resolve = async function (source, args, context: GraphQLRBACContext, info) {
            // Check if user is available
            if (!context.user) {
              throw new GraphQLError('User not authenticated', {
                extensions: { code: 'UNAUTHENTICATED' },
              });
            }

            // Check if user has the required role
            const hasRole = context.user.roles.includes(role);

            if (!hasRole) {
              throw new GraphQLError(`Missing required role: ${role}`, {
                extensions: {
                  code: 'FORBIDDEN',
                  requiredRole: role,
                },
              });
            }

            return resolve(source, args, context, info);
          };
        }

        return fieldConfig;
      },
    });
  };
}

/**
 * Create @hasAnyPermission directive transformer
 * Usage: @hasAnyPermission(permissions: ["user:read", "user:write"])
 */
export function createHasAnyPermissionDirective(
  config: HasPermissionDirectiveConfig = {}
) {
  const directiveName = config.directiveName || 'hasAnyPermission';

  return (schema: GraphQLSchema): GraphQLSchema => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const directive = getDirective(schema, fieldConfig, directiveName)?.[0];

        if (directive) {
          const { permissions } = directive;
          const { resolve = defaultFieldResolver } = fieldConfig;

          fieldConfig.resolve = async function (source, args, context: GraphQLRBACContext, info) {
            if (!context.rbac) {
              throw new GraphQLError('RBAC not configured in context', {
                extensions: { code: 'RBAC_NOT_CONFIGURED' },
              });
            }

            if (!context.user) {
              throw new GraphQLError('User not authenticated', {
                extensions: { code: 'UNAUTHENTICATED' },
              });
            }

            // Check if user has any of the required permissions
            const hasAnyPermission = permissions.some((perm: string) =>
              context.rbac.hasPermission(context.user!, perm)
            );

            if (!hasAnyPermission) {
              throw new GraphQLError(`Missing any of required permissions: ${permissions.join(', ')}`, {
                extensions: {
                  code: 'FORBIDDEN',
                  requiredPermissions: permissions,
                },
              });
            }

            return resolve(source, args, context, info);
          };
        }

        return fieldConfig;
      },
    });
  };
}

/**
 * Create @hasAllPermissions directive transformer
 * Usage: @hasAllPermissions(permissions: ["user:read", "user:write"])
 */
export function createHasAllPermissionsDirective(
  config: HasPermissionDirectiveConfig = {}
) {
  const directiveName = config.directiveName || 'hasAllPermissions';

  return (schema: GraphQLSchema): GraphQLSchema => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const directive = getDirective(schema, fieldConfig, directiveName)?.[0];

        if (directive) {
          const { permissions } = directive;
          const { resolve = defaultFieldResolver } = fieldConfig;

          fieldConfig.resolve = async function (source, args, context: GraphQLRBACContext, info) {
            if (!context.rbac) {
              throw new GraphQLError('RBAC not configured in context', {
                extensions: { code: 'RBAC_NOT_CONFIGURED' },
              });
            }

            if (!context.user) {
              throw new GraphQLError('User not authenticated', {
                extensions: { code: 'UNAUTHENTICATED' },
              });
            }

            // Check if user has all required permissions
            const hasAllPermissions = permissions.every((perm: string) =>
              context.rbac.hasPermission(context.user!, perm)
            );

            if (!hasAllPermissions) {
              throw new GraphQLError(`Missing all required permissions: ${permissions.join(', ')}`, {
                extensions: {
                  code: 'FORBIDDEN',
                  requiredPermissions: permissions,
                },
              });
            }

            return resolve(source, args, context, info);
          };
        }

        return fieldConfig;
      },
    });
  };
}

/**
 * Apply all Fire Shield directives to a schema
 */
export function applyFireShieldDirectives(
  schema: GraphQLSchema,
  config: {
    hasPermission?: HasPermissionDirectiveConfig;
    hasRole?: HasRoleDirectiveConfig;
    hasAnyPermission?: HasPermissionDirectiveConfig;
    hasAllPermissions?: HasPermissionDirectiveConfig;
  } = {}
): GraphQLSchema {
  let transformedSchema = schema;

  transformedSchema = createHasPermissionDirective(config.hasPermission)(transformedSchema);
  transformedSchema = createHasRoleDirective(config.hasRole)(transformedSchema);
  transformedSchema = createHasAnyPermissionDirective(config.hasAnyPermission)(transformedSchema);
  transformedSchema = createHasAllPermissionsDirective(config.hasAllPermissions)(transformedSchema);

  return transformedSchema;
}

/**
 * Create @notDenied directive - blocks if permission is explicitly denied
 */
export function createNotDeniedDirective(directiveName = 'notDenied') {
  return (schema: GraphQLSchema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const directive = getDirective(schema, fieldConfig, directiveName)?.[0];

        if (directive) {
          const { permission } = directive;
          const { resolve = defaultFieldResolver } = fieldConfig;

          fieldConfig.resolve = async function (source, args, context: GraphQLRBACContext, info) {
            const { rbac, user } = context;

            if (!user) {
              throw new GraphQLError('Authentication required');
            }

            // Check if permission is denied
            const deniedPermissions = rbac.getDeniedPermissions(user.id);
            const isDenied = deniedPermissions.some((denied) => {
              if (denied === permission) return true;
              if (denied.includes('*')) {
                const pattern = denied.replace(/\*/g, '.*');
                return new RegExp(`^${pattern}$`).test(permission);
              }
              return false;
            });

            if (isDenied) {
              throw new GraphQLError(`Permission "${permission}" is explicitly denied`);
            }

            return resolve(source, args, context, info);
          };
        }

        return fieldConfig;
      },
    });
  };
}

/**
 * Create @isDenied directive - only executes if permission IS denied
 */
export function createIsDeniedDirective(directiveName = 'isDenied') {
  return (schema: GraphQLSchema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const directive = getDirective(schema, fieldConfig, directiveName)?.[0];

        if (directive) {
          const { permission } = directive;
          const { resolve = defaultFieldResolver } = fieldConfig;

          fieldConfig.resolve = async function (source, args, context: GraphQLRBACContext, info) {
            const { rbac, user } = context;

            if (!user) {
              return null; // No user, can't check deny
            }

            // Check if permission is denied
            const deniedPermissions = rbac.getDeniedPermissions(user.id);
            const isDenied = deniedPermissions.some((denied) => {
              if (denied === permission) return true;
              if (denied.includes('*')) {
                const pattern = denied.replace(/\*/g, '.*');
                return new RegExp(`^${pattern}$`).test(permission);
              }
              return false;
            });

            if (!isDenied) {
              return null; // Permission not denied, don't execute
            }

            return resolve(source, args, context, info);
          };
        }

        return fieldConfig;
      },
    });
  };
}

/**
 * Schema directive definitions for Fire Shield
 */
export const fireShieldDirectiveTypeDefs = `
  directive @hasPermission(permission: String!) on FIELD_DEFINITION
  directive @hasRole(role: String!) on FIELD_DEFINITION
  directive @hasAnyPermission(permissions: [String!]!) on FIELD_DEFINITION
  directive @hasAllPermissions(permissions: [String!]!) on FIELD_DEFINITION
  directive @notDenied(permission: String!) on FIELD_DEFINITION
  directive @isDenied(permission: String!) on FIELD_DEFINITION
`;
