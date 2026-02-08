/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, createApp, ref } from 'vue';
import { createRouter, createMemoryHistory } from 'vue-router';
import { RBAC } from '@fire-shield/core';
import {
  createVueRouterRBAC,
  Can,
  Cannot,
  ProtectedRoute,
  RequirePermission
} from '../index';

describe('Vue RBAC Integration Tests', () => {
  let rbac: RBAC;
  let router: ReturnType<typeof createRouter>;

  beforeEach(() => {
    rbac = new RBAC();
    rbac.createRole('admin', ['user:*', 'post:*', 'settings:*']);
    rbac.createRole('editor', ['post:read', 'post:write', 'post:publish']);
    rbac.createRole('viewer', ['post:read']);

    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>Home</div>' } },
        { path: '/unauthorized', component: { template: '<div>Unauthorized</div>' } }
      ]
    });
  });

  describe('Directives Integration', () => {
    describe('v-can directive', () => {
      it('should work with real Vue component and hide element when lacking permission', async () => {
        const user = ref({ id: 'user-1', roles: ['viewer'] });

        const plugin = createVueRouterRBAC(router, {
          rbac,
          getUser: () => user.value,
          enableGuards: false
        });

        const TestComponent = defineComponent({
          template: `
            <div>
              <button v-can="'post:write'" data-test="write-button">Write Post</button>
              <button v-can="'post:read'" data-test="read-button">Read Post</button>
            </div>
          `
        });

        const wrapper = mount(TestComponent, {
          global: {
            plugins: [plugin, router]
          }
        });

        await wrapper.vm.$nextTick();

        const writeButton = wrapper.find('[data-test="write-button"]');
        const readButton = wrapper.find('[data-test="read-button"]');

        // Viewer can't write, should be hidden
        expect((writeButton.element as HTMLElement).style.display).toBe('none');

        // Viewer can read, should be visible
        expect((readButton.element as HTMLElement).style.display).not.toBe('none');
      });

      it('should reactively update when user changes', async () => {
        const user = ref({ id: 'user-1', roles: ['viewer'] });

        const plugin = createVueRouterRBAC(router, {
          rbac,
          getUser: () => user.value,
          enableGuards: false
        });

        const TestComponent = defineComponent({
          template: `
            <div>
              <button v-can="'post:write'" data-test="write-button">Write Post</button>
            </div>
          `
        });

        const wrapper = mount(TestComponent, {
          global: {
            plugins: [plugin, router]
          }
        });

        await wrapper.vm.$nextTick();

        const writeButton = wrapper.find('[data-test="write-button"]');

        // Initially viewer can't write
        expect((writeButton.element as HTMLElement).style.display).toBe('none');

        // Change user to editor
        user.value = { id: 'user-1', roles: ['editor'] };
        plugin.updateUser();
        await wrapper.vm.$nextTick();

        // Now editor can write - should be visible
        expect((writeButton.element as HTMLElement).style.display).not.toBe('none');
      });
    });

    describe('v-cannot directive', () => {
      it('should show element when user lacks permission', async () => {
        const user = ref({ id: 'user-1', roles: ['viewer'] });

        const plugin = createVueRouterRBAC(router, {
          rbac,
          getUser: () => user.value,
          enableGuards: false
        });

        const TestComponent = defineComponent({
          template: `
            <div>
              <p v-cannot="'post:write'" data-test="cannot-write">You cannot write posts</p>
              <p v-cannot="'post:read'" data-test="cannot-read">You cannot read posts</p>
            </div>
          `
        });

        const wrapper = mount(TestComponent, {
          global: {
            plugins: [plugin, router]
          }
        });

        await wrapper.vm.$nextTick();

        const cannotWrite = wrapper.find('[data-test="cannot-write"]');
        const cannotRead = wrapper.find('[data-test="cannot-read"]');

        // Viewer can't write, message should show
        expect((cannotWrite.element as HTMLElement).style.display).not.toBe('none');

        // Viewer can read, message should hide
        expect((cannotRead.element as HTMLElement).style.display).toBe('none');
      });
    });

    describe('v-permission directive', () => {
      it('should work with wildcard permissions', async () => {
        const user = ref({ id: 'admin-1', roles: ['admin'] });

        const plugin = createVueRouterRBAC(router, {
          rbac,
          getUser: () => user.value,
          enableGuards: false
        });

        const TestComponent = defineComponent({
          template: `
            <div>
              <button v-permission="'user:delete'" data-test="delete-button">Delete User</button>
            </div>
          `
        });

        const wrapper = mount(TestComponent, {
          global: {
            plugins: [plugin, router]
          }
        });

        await wrapper.vm.$nextTick();

        const deleteButton = wrapper.find('[data-test="delete-button"]');

        // Admin has user:* so should have user:delete
        expect((deleteButton.element as HTMLElement).style.display).not.toBe('none');
      });
    });

    describe('v-role directive', () => {
      it('should show/hide based on user role', async () => {
        const user = ref({ id: 'user-1', roles: ['editor'] });

        const plugin = createVueRouterRBAC(router, {
          rbac,
          getUser: () => user.value,
          enableGuards: false
        });

        const TestComponent = defineComponent({
          template: `
            <div>
              <div v-role="'admin'" data-test="admin-panel">Admin Panel</div>
              <div v-role="'editor'" data-test="editor-panel">Editor Panel</div>
            </div>
          `
        });

        const wrapper = mount(TestComponent, {
          global: {
            plugins: [plugin, router]
          }
        });

        await wrapper.vm.$nextTick();

        const adminPanel = wrapper.find('[data-test="admin-panel"]');
        const editorPanel = wrapper.find('[data-test="editor-panel"]');

        // User is editor, not admin
        expect((adminPanel.element as HTMLElement).style.display).toBe('none');
        expect((editorPanel.element as HTMLElement).style.display).not.toBe('none');
      });
    });
  });

  describe('Components Integration', () => {
    describe('Can Component', () => {
      it('should render children when user has permission', async () => {
        const user = ref({ id: 'user-1', roles: ['editor'] });

        const plugin = createVueRouterRBAC(router, {
          rbac,
          getUser: () => user.value,
          enableGuards: false
        });

        const TestComponent = defineComponent({
          components: { Can },
          template: `
            <div>
              <Can permission="post:write">
                <button data-test="write-button">Write Post</button>
              </Can>
              <Can permission="post:delete">
                <button data-test="delete-button">Delete Post</button>
              </Can>
            </div>
          `
        });

        const wrapper = mount(TestComponent, {
          global: {
            plugins: [plugin, router]
          }
        });

        await wrapper.vm.$nextTick();

        // Editor can write
        expect(wrapper.find('[data-test="write-button"]').exists()).toBe(true);

        // Editor can't delete
        expect(wrapper.find('[data-test="delete-button"]').exists()).toBe(false);
      });

      it('should work with role prop', async () => {
        const user = ref({ id: 'user-1', roles: ['editor'] });

        const plugin = createVueRouterRBAC(router, {
          rbac,
          getUser: () => user.value,
          enableGuards: false
        });

        const TestComponent = defineComponent({
          components: { Can },
          template: `
            <div>
              <Can role="editor">
                <div data-test="editor-content">Editor Content</div>
              </Can>
              <Can role="admin">
                <div data-test="admin-content">Admin Content</div>
              </Can>
            </div>
          `
        });

        const wrapper = mount(TestComponent, {
          global: {
            plugins: [plugin, router]
          }
        });

        await wrapper.vm.$nextTick();

        expect(wrapper.find('[data-test="editor-content"]').exists()).toBe(true);
        expect(wrapper.find('[data-test="admin-content"]').exists()).toBe(false);
      });
    });

    describe('Cannot Component', () => {
      it('should render children when user lacks permission', async () => {
        const user = ref({ id: 'user-1', roles: ['viewer'] });

        const plugin = createVueRouterRBAC(router, {
          rbac,
          getUser: () => user.value,
          enableGuards: false
        });

        const TestComponent = defineComponent({
          components: { Cannot },
          template: `
            <div>
              <Cannot permission="post:write">
                <p data-test="cannot-message">You cannot write posts</p>
              </Cannot>
            </div>
          `
        });

        const wrapper = mount(TestComponent, {
          global: {
            plugins: [plugin, router]
          }
        });

        await wrapper.vm.$nextTick();

        // Viewer can't write, so message should show
        expect(wrapper.find('[data-test="cannot-message"]').exists()).toBe(true);
      });
    });

    describe('ProtectedRoute Component', () => {
      it('should render children when user has permission', async () => {
        const user = ref({ id: 'user-1', roles: ['editor'] });

        const plugin = createVueRouterRBAC(router, {
          rbac,
          getUser: () => user.value,
          enableGuards: false
        });

        const TestComponent = defineComponent({
          components: { ProtectedRoute },
          template: `
            <div>
              <ProtectedRoute permission="post:read">
                <div data-test="protected-content">Protected Content</div>
              </ProtectedRoute>
            </div>
          `
        });

        const wrapper = mount(TestComponent, {
          global: {
            plugins: [plugin, router]
          }
        });

        await wrapper.vm.$nextTick();

        expect(wrapper.find('[data-test="protected-content"]').exists()).toBe(true);
      });

      it('should not render children when user lacks permission', async () => {
        const user = ref({ id: 'user-1', roles: ['viewer'] });

        const plugin = createVueRouterRBAC(router, {
          rbac,
          getUser: () => user.value,
          enableGuards: false
        });

        const TestComponent = defineComponent({
          components: { ProtectedRoute },
          template: `
            <div>
              <ProtectedRoute permission="post:delete">
                <div data-test="protected-content">Protected Content</div>
              </ProtectedRoute>
            </div>
          `
        });

        const wrapper = mount(TestComponent, {
          global: {
            plugins: [plugin, router]
          }
        });

        await wrapper.vm.$nextTick();

        expect(wrapper.find('[data-test="protected-content"]').exists()).toBe(false);
      });

      it('should work with role prop', async () => {
        const user = ref({ id: 'user-1', roles: ['admin'] });

        const plugin = createVueRouterRBAC(router, {
          rbac,
          getUser: () => user.value,
          enableGuards: false
        });

        const TestComponent = defineComponent({
          components: { ProtectedRoute },
          template: `
            <div>
              <ProtectedRoute role="admin">
                <div data-test="admin-content">Admin Dashboard</div>
              </ProtectedRoute>
            </div>
          `
        });

        const wrapper = mount(TestComponent, {
          global: {
            plugins: [plugin, router]
          }
        });

        await wrapper.vm.$nextTick();

        expect(wrapper.find('[data-test="admin-content"]').exists()).toBe(true);
      });

      it('should render fallback component when access denied', async () => {
        const user = ref({ id: 'user-1', roles: ['viewer'] });

        const plugin = createVueRouterRBAC(router, {
          rbac,
          getUser: () => user.value,
          enableGuards: false
        });

        const UnauthorizedComponent = defineComponent({
          template: '<div data-test="unauthorized">Unauthorized</div>'
        });

        const TestComponent = defineComponent({
          components: { ProtectedRoute },
          setup() {
            return { UnauthorizedComponent };
          },
          template: `
            <div>
              <ProtectedRoute permission="post:delete" :fallback="UnauthorizedComponent">
                <div data-test="protected-content">Protected Content</div>
              </ProtectedRoute>
            </div>
          `
        });

        const wrapper = mount(TestComponent, {
          global: {
            plugins: [plugin, router]
          }
        });

        await wrapper.vm.$nextTick();

        expect(wrapper.find('[data-test="protected-content"]').exists()).toBe(false);
        expect(wrapper.find('[data-test="unauthorized"]').exists()).toBe(true);
      });
    });

    describe('RequirePermission Component', () => {
      it('should render when user has permission', async () => {
        const user = ref({ id: 'user-1', roles: ['editor'] });

        const plugin = createVueRouterRBAC(router, {
          rbac,
          getUser: () => user.value,
          enableGuards: false
        });

        const TestComponent = defineComponent({
          components: { RequirePermission },
          template: `
            <div>
              <RequirePermission permission="post:write">
                <div data-test="content">Content</div>
              </RequirePermission>
            </div>
          `
        });

        const wrapper = mount(TestComponent, {
          global: {
            plugins: [plugin, router]
          }
        });

        await wrapper.vm.$nextTick();

        expect(wrapper.find('[data-test="content"]').exists()).toBe(true);
      });

      it('should throw error when user lacks permission', async () => {
        const user = ref({ id: 'user-1', roles: ['viewer'] });

        const plugin = createVueRouterRBAC(router, {
          rbac,
          getUser: () => user.value,
          enableGuards: false
        });

        const TestComponent = defineComponent({
          components: { RequirePermission },
          template: `
            <div>
              <RequirePermission permission="post:delete">
                <div data-test="content">Content</div>
              </RequirePermission>
            </div>
          `
        });

        // Suppress console.error for this test
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

        expect(() => {
          mount(TestComponent, {
            global: {
              plugins: [plugin, router]
            }
          });
        }).toThrow('Permission denied: post:delete');

        consoleError.mockRestore();
      });
    });
  });

  describe('Edge Cases and Bug Fixes', () => {
    it('should not call inject() in directive mounted hook (regression test)', async () => {
      // This test ensures directives use vnode.appContext instead of inject()
      const user = ref({ id: 'user-1', roles: ['editor'] });

      const plugin = createVueRouterRBAC(router, {
        rbac,
        getUser: () => user.value,
        enableGuards: false
      });

      const TestComponent = defineComponent({
        template: `
          <div>
            <button v-can="'post:write'">Write</button>
          </div>
        `
      });

      // Should not throw "inject() can only be used inside setup()" error
      expect(() => {
        mount(TestComponent, {
          global: {
            plugins: [plugin, router]
          }
        });
      }).not.toThrow();
    });

    it('should access router via getCurrentInstance in ProtectedRoute (regression test)', async () => {
      // This test ensures ProtectedRoute doesn't cause router injection warnings
      const user = ref({ id: 'user-1', roles: ['viewer'] });

      const plugin = createVueRouterRBAC(router, {
        rbac,
        getUser: () => user.value,
        enableGuards: false
      });

      const TestComponent = defineComponent({
        components: { ProtectedRoute },
        template: `
          <div>
            <ProtectedRoute permission="post:read" redirectTo="/unauthorized">
              <div>Content</div>
            </ProtectedRoute>
          </div>
        `
      });

      // Should not throw router injection error
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mount(TestComponent, {
        global: {
          plugins: [plugin, router]
        }
      });

      // Check that no router injection warning was logged
      const warnings = consoleWarn.mock.calls.map(call => call[0]);
      const hasRouterWarning = warnings.some(warning =>
        typeof warning === 'string' && warning.includes('injection') && warning.includes('router')
      );

      expect(hasRouterWarning).toBe(false);

      consoleWarn.mockRestore();
    });

    it('should properly cleanup watchEffect on unmount', async () => {
      const user = ref({ id: 'user-1', roles: ['editor'] });

      const plugin = createVueRouterRBAC(router, {
        rbac,
        getUser: () => user.value,
        enableGuards: false
      });

      const TestComponent = defineComponent({
        template: `
          <div>
            <button v-can="'post:write'" data-test="button">Write</button>
          </div>
        `
      });

      const wrapper = mount(TestComponent, {
        global: {
          plugins: [plugin, router]
        }
      });

      await wrapper.vm.$nextTick();

      // Should not throw on unmount
      expect(() => {
        wrapper.unmount();
      }).not.toThrow();
    });
  });
});
