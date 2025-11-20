<script setup lang="ts">
import { ref, inject, computed, type Ref } from 'vue';
import { useRoute } from 'vue-router';
import { useCan, useRole } from '@fire-shield/vue';
import type { RBACUser } from '@fire-shield/core';

// Mock users
const users = {
  admin: { id: 'admin-1', name: 'Admin User', roles: ['admin'] },
  editor: { id: 'editor-1', name: 'Editor User', roles: ['editor'] },
  moderator: { id: 'mod-1', name: 'Moderator', roles: ['moderator'] },
  viewer: { id: 'viewer-1', name: 'Viewer User', roles: ['viewer'] },
  guest: null,
};

type UserRole = keyof typeof users;

const route = useRoute();
const currentRole = ref<UserRole>('guest');
const currentUser = inject<Ref<RBACUser | null>>('currentUser')!;
const updateUser = inject<(user: RBACUser | null) => void>('updateUser')!;

const canManagePosts = useCan('post:write');
const canAccessAdmin = useRole('admin');
const canAccessSettings = useCan('settings:write');

const isActive = (path: string) => route.path === path;

const currentUserDisplay = computed(() => {
  if (currentRole.value === 'guest') return { name: 'Guest', id: 'Not logged in' };
  const user = users[currentRole.value];
  return user ? { name: user.name, id: user.id } : { name: 'Guest', id: 'Not logged in' };
});

const currentUserInitial = computed(() => {
  return currentRole.value === 'guest' ? '?' : currentRole.value[0].toUpperCase();
});

function switchRole(role: UserRole) {
  currentRole.value = role;
  const user = users[role];
  currentUser.value = user;
  updateUser(user);
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <header class="bg-white shadow-md sticky top-0 z-50">
      <div class="container mx-auto px-4">
        <!-- Top Bar -->
        <div class="flex items-center justify-between py-4">
          <div class="flex items-center space-x-4">
            <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              🛡️ Fire Shield
            </h1>
            <span class="hidden md:inline text-sm text-gray-500">Vue RBAC Example</span>
          </div>

          <!-- Role Switcher -->
          <div class="flex items-center gap-2">
            <button
              v-for="role in Object.keys(users)"
              :key="role"
              @click="switchRole(role as UserRole)"
              :class="[
                'btn',
                currentRole === role ? 'btn-primary' : 'btn-secondary'
              ]"
            >
              {{ role }}
            </button>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="flex items-center space-x-6 pb-4 border-t pt-4 mt-2">
          <router-link
            to="/"
            :class="[
              'font-medium transition-colors',
              isActive('/') ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
            ]"
          >
            Home
          </router-link>

          <router-link
            v-can="'post:read'"
            to="/posts"
            :class="[
              'font-medium transition-colors',
              isActive('/posts') ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
            ]"
          >
            Posts
          </router-link>

          <router-link
            v-if="canAccessAdmin"
            to="/admin"
            :class="[
              'font-medium transition-colors',
              isActive('/admin') ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
            ]"
          >
            Admin
          </router-link>

          <router-link
            v-if="canAccessSettings"
            to="/settings"
            :class="[
              'font-medium transition-colors',
              isActive('/settings') ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
            ]"
          >
            Settings
          </router-link>

          <router-link
            to="/activity"
            :class="[
              'font-medium transition-colors',
              isActive('/activity') ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
            ]"
          >
            Activity
          </router-link>

          <span v-cannot="'post:read'" class="text-gray-400 cursor-not-allowed">
            Posts (No Access)
          </span>
        </nav>

        <!-- User Info Bar -->
        <div class="pb-4 flex items-center justify-between bg-gray-50 -mx-4 px-4 py-3 mt-2">
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                {{ currentUserInitial }}
              </div>
              <div>
                <div class="font-semibold text-sm">{{ currentUserDisplay.name }}</div>
                <div class="text-xs text-gray-500">{{ currentUserDisplay.id }}</div>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <span :class="[
              'badge',
              canManagePosts ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            ]">
              {{ canManagePosts ? '✓' : '×' }} Write Posts
            </span>
            <span :class="[
              'badge',
              canAccessAdmin ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
            ]">
              {{ canAccessAdmin ? '✓' : '×' }} Admin
            </span>
          </div>
        </div>
      </div>
    </header>

    <main class="container mx-auto px-4 py-8">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
/* Additional custom styles if needed */
</style>
