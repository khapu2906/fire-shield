<script setup lang="ts">
import { ref } from 'vue';
import { ProtectedRoute } from '@fire-shield/vue';

const emailNotifications = ref(true);
const pushNotifications = ref(false);
</script>

<template>
  <ProtectedRoute permission="settings:write" redirectTo="/unauthorized">
    <div class="space-y-6">
      <div class="card">
        <h2 class="text-2xl font-bold mb-6">Settings</h2>
        <div class="space-y-4">
          <div>
            <label class="block font-semibold mb-2">Notification Preferences</label>
            <div class="space-y-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input v-model="emailNotifications" type="checkbox" class="rounded w-4 h-4" />
                <span class="text-sm">Email notifications</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input v-model="pushNotifications" type="checkbox" class="rounded w-4 h-4" />
                <span class="text-sm">Push notifications</span>
              </label>
            </div>
          </div>
          <div>
            <label class="block font-semibold mb-2">Security</label>
            <button class="btn btn-primary">Change Password</button>
          </div>
        </div>
      </div>
    </div>
  </ProtectedRoute>
</template>
