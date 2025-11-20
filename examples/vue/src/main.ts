import { createApp, ref } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { RBAC, BufferedAuditLogger, type AuditEvent } from '@fire-shield/core';
import { createVueRouterRBAC } from '@fire-shield/vue';
import App from './App.vue';
import HomePage from './pages/HomePage.vue';
import PostsPage from './pages/PostsPage.vue';
import AdminPage from './pages/AdminPage.vue';
import SettingsPage from './pages/SettingsPage.vue';
import ActivityPage from './pages/ActivityPage.vue';
import UnauthorizedPage from './pages/UnauthorizedPage.vue';
import './style.css';

// Audit logger to track RBAC actions
const auditLogsArray: AuditEvent[] = [];
const auditLogger = new BufferedAuditLogger(
  async (logs) => {
    auditLogsArray.push(...logs);
  },
  { maxBufferSize: 10, flushIntervalMs: 1000 }
);

// Initialize RBAC with audit logging
const rbac = new RBAC({ auditLogger });
rbac.createRole('admin', ['user:*', 'post:*', 'settings:*', 'analytics:*']);
rbac.createRole('editor', ['post:read', 'post:write', 'post:publish', 'analytics:read']);
rbac.createRole('viewer', ['post:read', 'analytics:read']);
rbac.createRole('moderator', ['post:read', 'post:moderate', 'user:read']);

// Create reactive user state
const currentUser = ref(null);
const auditLogs = ref<AuditEvent[]>([]);

// Create router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: HomePage,
    },
    {
      path: '/posts',
      component: PostsPage,
      meta: { permission: 'post:read' },
    },
    {
      path: '/admin',
      component: AdminPage,
      meta: { role: 'admin' },
    },
    {
      path: '/settings',
      component: SettingsPage,
      meta: { permission: 'settings:write' },
    },
    {
      path: '/activity',
      component: ActivityPage,
    },
    {
      path: '/unauthorized',
      component: UnauthorizedPage,
    },
  ],
});

router.onError((error) => {
  console.error('❌ Router error:', error);
});

// Create app with error handler
const app = createApp(App);

// Add global error handler
app.config.errorHandler = (err, instance, info) => {
  console.error('❌ Vue Error:', err);
  console.error('Component:', instance);
  console.error('Info:', info);

  const loading = document.getElementById('loading');
  if (loading) {
    loading.innerHTML = `<p style="color: red;">❌ Vue Component Error</p><pre style="text-align: left; font-size: 12px; max-width: 600px; margin: 20px auto; background: #fee; padding: 10px; border-radius: 4px;">${err}\n\nInfo: ${info}</pre>`;
  }
};

// Install Vue Router RBAC plugin
const { install: installRBAC, updateUser } = createVueRouterRBAC(router, {
  rbac,
  getUser: () => currentUser.value,
  onUnauthorized: (to) => {
    // Prevent infinite loop - don't redirect if already on unauthorized or home page
    if (to.path !== '/unauthorized' && to.path !== '/') {
      router.push('/unauthorized');
    }
  },
  enableGuards: false, // Use component-level protection instead of global guards
});

// Provide to all components
app.provide('currentUser', currentUser);
app.provide('updateUser', updateUser);
app.provide('rbac', rbac);
app.provide('auditLogs', auditLogs);
app.provide('getAuditLogs', () => {
  auditLogs.value = [...auditLogsArray].reverse().slice(0, 20);
});

app.use(router);
app.use(installRBAC);

try {
  app.mount('#app');

  // Hide loading indicator
  const loading = document.getElementById('loading');
  if (loading) {
    loading.remove();
  }
} catch (error) {
  console.error('❌ Failed to mount app:', error);

  // Show error in loading indicator
  const loading = document.getElementById('loading');
  if (loading) {
    loading.innerHTML = `<p style="color: red;">❌ App failed to mount</p><pre style="text-align: left; font-size: 12px; max-width: 600px; margin: 20px auto;">${error}</pre>`;
  }
}
