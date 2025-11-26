import { describe, it, expect, beforeEach } from 'vitest';
import { initTRPC, TRPCError } from '@trpc/server';
import {
  createProtectedMiddleware,
  checkPermission,
  checkRole,
  checkAnyPermissions,
  checkAllPermissions,
} from '../index';
import { RBAC } from '@fire-shield/core';
import type { TRPCRBACContext } from '../index';

describe('tRPC Middleware', () => {
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

  describe('createProtectedMiddleware', () => {
    it('should allow access with correct permission', async () => {
      interface Context extends TRPCRBACContext {}

      const t = initTRPC.context<Context>().create();

      const protectedProcedure = t.procedure.use(
        createProtectedMiddleware({ permission: 'user:read' })
      );

      const caller = t.router({
        test: protectedProcedure.query(() => 'success'),
      }).createCaller({
        rbac,
        user: { id: 'user1', roles: ['viewer'] },
      });

      const result = await caller.test();
      expect(result).toBe('success');
    });

    it('should deny access without permission', async () => {
      const t = initTRPC.context<TRPCRBACContext>().create();

      const protectedProcedure = t.procedure.use(
        createProtectedMiddleware({ permission: 'user:write' })
      );

      const caller = t.router({
        test: protectedProcedure.query(() => 'success'),
      }).createCaller({
        rbac,
        user: { id: 'user1', roles: ['viewer'] },
      });

      await expect(caller.test()).rejects.toThrow(TRPCError);
      await expect(caller.test()).rejects.toMatchObject({
        code: 'FORBIDDEN',
        message: expect.stringContaining('Missing required permission: user:write'),
      });
    });

    it('should deny access for unauthenticated user', async () => {
      const t = initTRPC.context<TRPCRBACContext>().create();

      const protectedProcedure = t.procedure.use(
        createProtectedMiddleware({ permission: 'user:read' })
      );

      const caller = t.router({
        test: protectedProcedure.query(() => 'success'),
      }).createCaller({
        rbac,
        user: undefined,
      });

      await expect(caller.test()).rejects.toThrow(TRPCError);
      await expect(caller.test()).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('should allow unauthenticated access when requireAuth is false', async () => {
      const t = initTRPC.context<TRPCRBACContext>().create();

      const publicProcedure = t.procedure.use(
        createProtectedMiddleware({ requireAuth: false })
      );

      const caller = t.router({
        test: publicProcedure.query(() => 'public'),
      }).createCaller({
        rbac,
        user: undefined,
      });

      const result = await caller.test();
      expect(result).toBe('public');
    });

    it('should check role requirement', async () => {
      const t = initTRPC.context<TRPCRBACContext>().create();

      const adminProcedure = t.procedure.use(
        createProtectedMiddleware({ role: 'admin' })
      );

      const adminCaller = t.router({
        test: adminProcedure.query(() => 'admin access'),
      }).createCaller({
        rbac,
        user: { id: 'admin1', roles: ['admin'] },
      });

      const result = await adminCaller.test();
      expect(result).toBe('admin access');

      const editorCaller = t.router({
        test: adminProcedure.query(() => 'admin access'),
      }).createCaller({
        rbac,
        user: { id: 'editor1', roles: ['editor'] },
      });

      await expect(editorCaller.test()).rejects.toThrow(TRPCError);
      await expect(editorCaller.test()).rejects.toMatchObject({
        code: 'FORBIDDEN',
        message: expect.stringContaining('Missing required role: admin'),
      });
    });

    it('should check anyPermissions requirement', async () => {
      const t = initTRPC.context<TRPCRBACContext>().create();

      const procedure = t.procedure.use(
        createProtectedMiddleware({
          anyPermissions: ['user:delete', 'post:write'],
        })
      );

      // Editor has post:write
      const editorCaller = t.router({
        test: procedure.query(() => 'success'),
      }).createCaller({
        rbac,
        user: { id: 'editor1', roles: ['editor'] },
      });

      const result = await editorCaller.test();
      expect(result).toBe('success');

      // Viewer has neither
      const viewerCaller = t.router({
        test: procedure.query(() => 'success'),
      }).createCaller({
        rbac,
        user: { id: 'viewer1', roles: ['viewer'] },
      });

      await expect(viewerCaller.test()).rejects.toThrow(TRPCError);
    });

    it('should check allPermissions requirement', async () => {
      const t = initTRPC.context<TRPCRBACContext>().create();

      const procedure = t.procedure.use(
        createProtectedMiddleware({
          allPermissions: ['user:read', 'user:write'],
        })
      );

      // Editor has both
      const editorCaller = t.router({
        test: procedure.query(() => 'success'),
      }).createCaller({
        rbac,
        user: { id: 'editor1', roles: ['editor'] },
      });

      const result = await editorCaller.test();
      expect(result).toBe('success');

      // Viewer only has user:read
      const viewerCaller = t.router({
        test: procedure.query(() => 'success'),
      }).createCaller({
        rbac,
        user: { id: 'viewer1', roles: ['viewer'] },
      });

      await expect(viewerCaller.test()).rejects.toThrow(TRPCError);
      await expect(viewerCaller.test()).rejects.toMatchObject({
        message: expect.stringContaining('Missing all required permissions'),
      });
    });

    it('should use custom error message', async () => {
      const t = initTRPC.context<TRPCRBACContext>().create();

      const procedure = t.procedure.use(
        createProtectedMiddleware({
          permission: 'user:write',
          errorMessage: 'Custom error message',
        })
      );

      const caller = t.router({
        test: procedure.query(() => 'success'),
      }).createCaller({
        rbac,
        user: { id: 'viewer1', roles: ['viewer'] },
      });

      await expect(caller.test()).rejects.toMatchObject({
        message: 'Custom error message',
      });
    });

    it('should throw error when RBAC not configured', async () => {
      const t = initTRPC.context<any>().create();

      const procedure = t.procedure.use(
        createProtectedMiddleware({ permission: 'user:read' })
      );

      const caller = t.router({
        test: procedure.query(() => 'success'),
      }).createCaller({
        user: { id: 'user1', roles: ['viewer'] },
      });

      await expect(caller.test()).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'RBAC not configured in context',
      });
    });
  });

  describe('Helper Functions', () => {
    let mockContext: TRPCRBACContext;

    beforeEach(() => {
      mockContext = {
        rbac,
        user: { id: 'user1', roles: ['editor'] },
      };
    });

    describe('checkPermission', () => {
      it('should pass when user has permission', () => {
        expect(() => checkPermission(mockContext, 'user:write')).not.toThrow();
      });

      it('should throw when user lacks permission', () => {
        expect(() => checkPermission(mockContext, 'user:delete')).toThrow(TRPCError);
        expect(() => checkPermission(mockContext, 'user:delete')).toThrow(/Missing required permission/);
      });

      it('should throw when user not authenticated', () => {
        const unauthContext = { rbac, user: undefined };
        expect(() => checkPermission(unauthContext, 'user:read')).toThrow(TRPCError);
        expect(() => checkPermission(unauthContext, 'user:read')).toThrow(/must be logged in/);
      });

      it('should use custom error message', () => {
        expect(() => checkPermission(mockContext, 'user:delete', 'Custom error')).toThrow('Custom error');
      });

      it('should throw when RBAC not configured', () => {
        const noRbacContext = { user: { id: 'user1', roles: ['editor'] } } as any;
        expect(() => checkPermission(noRbacContext, 'user:read')).toThrow(/RBAC not configured/);
      });
    });

    describe('checkRole', () => {
      it('should pass when user has role', () => {
        expect(() => checkRole(mockContext, 'editor')).not.toThrow();
      });

      it('should throw when user lacks role', () => {
        expect(() => checkRole(mockContext, 'admin')).toThrow(TRPCError);
        expect(() => checkRole(mockContext, 'admin')).toThrow(/Missing required role/);
      });

      it('should throw when user not authenticated', () => {
        const unauthContext = { rbac, user: undefined };
        expect(() => checkRole(unauthContext, 'editor')).toThrow(/must be logged in/);
      });

      it('should use custom error message', () => {
        expect(() => checkRole(mockContext, 'admin', 'Custom role error')).toThrow('Custom role error');
      });
    });

    describe('checkAnyPermissions', () => {
      it('should pass when user has any permission', () => {
        expect(() =>
          checkAnyPermissions(mockContext, ['user:delete', 'post:write'])
        ).not.toThrow();
      });

      it('should throw when user has none of the permissions', () => {
        expect(() =>
          checkAnyPermissions(mockContext, ['user:delete', 'admin:full'])
        ).toThrow(TRPCError);
      });

      it('should use custom error message', () => {
        expect(() =>
          checkAnyPermissions(mockContext, ['user:delete'], 'Need any perm')
        ).toThrow('Need any perm');
      });
    });

    describe('checkAllPermissions', () => {
      it('should pass when user has all permissions', () => {
        expect(() =>
          checkAllPermissions(mockContext, ['user:read', 'user:write'])
        ).not.toThrow();
      });

      it('should throw when user lacks any permission', () => {
        expect(() =>
          checkAllPermissions(mockContext, ['user:read', 'user:delete'])
        ).toThrow(TRPCError);
        expect(() =>
          checkAllPermissions(mockContext, ['user:read', 'user:delete'])
        ).toThrow(/Missing all required permissions/);
      });

      it('should use custom error message', () => {
        expect(() =>
          checkAllPermissions(mockContext, ['user:delete'], 'Need all perms')
        ).toThrow('Need all perms');
      });
    });
  });

  describe('Integration Tests', () => {
    it('should work with full tRPC router', async () => {
      const t = initTRPC.context<TRPCRBACContext>().create();

      const userRouter = t.router({
        list: t.procedure
          .use(createProtectedMiddleware({ permission: 'user:read' }))
          .query(() => [{ id: '1', name: 'Alice' }]),

        create: t.procedure
          .use(createProtectedMiddleware({ permission: 'user:write' }))
          .mutation(() => ({ id: '2', name: 'Bob' })),

        delete: t.procedure
          .use(createProtectedMiddleware({ role: 'admin' }))
          .mutation(() => true),
      });

      const router = t.router({
        user: userRouter,
      });

      // Viewer can list
      const viewerCaller = router.createCaller({
        rbac,
        user: { id: 'viewer1', roles: ['viewer'] },
      });

      const users = await viewerCaller.user.list();
      expect(users).toHaveLength(1);

      await expect(viewerCaller.user.create()).rejects.toThrow(TRPCError);
      await expect(viewerCaller.user.delete()).rejects.toThrow(TRPCError);

      // Editor can list and create
      const editorCaller = router.createCaller({
        rbac,
        user: { id: 'editor1', roles: ['editor'] },
      });

      await editorCaller.user.list();
      await editorCaller.user.create();
      await expect(editorCaller.user.delete()).rejects.toThrow(TRPCError);

      // Admin can do everything
      const adminCaller = router.createCaller({
        rbac,
        user: { id: 'admin1', roles: ['admin'] },
      });

      await adminCaller.user.list();
      await adminCaller.user.create();
      await adminCaller.user.delete();
    });
  });
});
