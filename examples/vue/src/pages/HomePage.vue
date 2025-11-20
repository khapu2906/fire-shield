<script setup lang="ts">
import { inject, onMounted, onUnmounted } from 'vue';
import { useCan, useRole, useAuthorize } from '@fire-shield/vue';

const getAuditLogs = inject<() => void>('getAuditLogs')!;

const isEditor = useRole('editor');
const isAdmin = useRole('admin');
const isModerator = useRole('moderator');
const postWrite = useAuthorize('post:write');
const canReadPosts = useCan('post:read');
const canReadAnalytics = useCan('analytics:read');

let interval: number;

onMounted(() => {
  interval = setInterval(getAuditLogs, 1000) as unknown as number;
});

onUnmounted(() => {
  if (interval) clearInterval(interval);
});

const hasMultiplePerms = useCan('post:read') && useCan('post:write');
const hasAnyPerm = canReadPosts || canReadAnalytics;
</script>

<template>
  <div class="space-y-6">
    <div class="card">
      <h2 class="text-3xl font-bold mb-4">Welcome to Fire Shield Vue Example</h2>
      <p class="text-gray-600 mb-6">
        This example demonstrates advanced role-based access control with @fire-shield/vue
      </p>

      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div class="font-semibold text-blue-900 mb-1">useCan()</div>
          <div class="text-sm text-blue-700">Check single permission</div>
        </div>
        <div class="p-4 bg-green-50 rounded-lg border border-green-200">
          <div class="font-semibold text-green-900 mb-1">useRole()</div>
          <div class="text-sm text-green-700">Check user role</div>
        </div>
        <div class="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div class="font-semibold text-purple-900 mb-1">useAuthorize()</div>
          <div class="text-sm text-purple-700">Get detailed authorization</div>
        </div>
        <div class="p-4 bg-orange-50 rounded-lg border border-orange-200">
          <div class="font-semibold text-orange-900 mb-1">v-can</div>
          <div class="text-sm text-orange-700">Conditional directive</div>
        </div>
        <div class="p-4 bg-pink-50 rounded-lg border border-pink-200">
          <div class="font-semibold text-pink-900 mb-1">v-cannot</div>
          <div class="text-sm text-pink-700">Inverse directive</div>
        </div>
        <div class="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
          <div class="font-semibold text-indigo-900 mb-1">Route Guards</div>
          <div class="text-sm text-indigo-700">Protect routes</div>
        </div>
      </div>
    </div>

    <div class="grid md:grid-cols-2 gap-6">
      <div class="card">
        <h3 class="text-xl font-bold mb-4">Permission Checks</h3>
        <div class="space-y-3">
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span class="font-medium">Write Posts</span>
            <span
              :class="[
                'badge',
                postWrite.allowed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              ]"
            >
              {{ postWrite.allowed ? '✓ Allowed' : '× Denied' }}
            </span>
          </div>
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span class="font-medium">All: Read & Write</span>
            <span
              :class="[
                'badge',
                hasMultiplePerms ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              ]"
            >
              {{ hasMultiplePerms ? '✓ Has All' : '× Missing Some' }}
            </span>
          </div>
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span class="font-medium">Any: Read or Analytics</span>
            <span
              :class="[
                'badge',
                hasAnyPerm ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              ]"
            >
              {{ hasAnyPerm ? '✓ Has Any' : '× Has None' }}
            </span>
          </div>
        </div>
      </div>

      <div class="card">
        <h3 class="text-xl font-bold mb-4">Role Information</h3>
        <div class="space-y-3">
          <div v-if="isAdmin" class="p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-2xl">👑</span>
              <span class="font-bold">Administrator</span>
            </div>
            <p class="text-sm opacity-90">Full system access with all permissions</p>
          </div>

          <div v-else-if="isEditor" class="p-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-2xl">✏️</span>
              <span class="font-bold">Editor</span>
            </div>
            <p class="text-sm opacity-90">Can create, edit, and publish posts</p>
          </div>

          <div v-if="isModerator" class="p-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-2xl">🛡️</span>
              <span class="font-bold">Moderator</span>
            </div>
            <p class="text-sm opacity-90">Can moderate posts and view users</p>
          </div>

          <div v-cannot="'post:write'" class="p-4 bg-gray-100 text-gray-700 rounded-lg">
            <p class="text-sm">
              💡 Switch to <strong>editor</strong> or <strong>admin</strong> role to create posts
            </p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!postWrite.allowed" class="card bg-amber-50 border-amber-200">
      <div class="flex items-start gap-3">
        <span class="text-2xl">⚠️</span>
        <div>
          <h4 class="font-semibold text-amber-900 mb-1">Limited Access</h4>
          <p class="text-sm text-amber-700">
            <strong>Reason:</strong> {{ postWrite.reason }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
