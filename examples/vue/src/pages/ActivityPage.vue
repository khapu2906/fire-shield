<script setup lang="ts">
import { inject, onMounted, onUnmounted, type Ref } from 'vue';
import type { AuditEvent } from '@fire-shield/core';

const auditLogs = inject<Ref<AuditEvent[]>>('auditLogs')!;
const getAuditLogs = inject<() => void>('getAuditLogs')!;

let interval: number;

onMounted(() => {
  getAuditLogs();
  interval = setInterval(getAuditLogs, 1000) as unknown as number;
});

onUnmounted(() => {
  if (interval) clearInterval(interval);
});
</script>

<template>
  <div class="space-y-6">
    <div class="card">
      <h2 class="text-2xl font-bold mb-6">Activity Log</h2>
      <p class="text-gray-600 mb-6">Real-time audit trail of RBAC permission checks</p>

      <div v-if="auditLogs.length === 0" class="text-center py-12 text-gray-500">
        <span class="text-4xl mb-4 block">📋</span>
        <p>No activity yet. Navigate around to see permission checks.</p>
      </div>

      <div v-else class="space-y-2 max-h-96 overflow-y-auto">
        <div
          v-for="(log, idx) in auditLogs"
          :key="idx"
          class="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span
                :class="[
                  'badge',
                  log.allowed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                ]"
              >
                {{ log.allowed ? '✓ Allowed' : '× Denied' }}
              </span>
              <span class="font-mono text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {{ log.permission }}
              </span>
              <span class="text-gray-600">
                User: {{ log.userId || 'guest' }}
              </span>
            </div>
            <span class="text-xs text-gray-500">
              {{ new Date(log.timestamp).toLocaleTimeString() }}
            </span>
          </div>
          <div v-if="!log.allowed && log.reason" class="mt-2 text-xs text-gray-600 pl-3 border-l-2 border-gray-300">
            Reason: {{ log.reason }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
