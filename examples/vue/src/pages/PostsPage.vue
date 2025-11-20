<script setup lang="ts">
import { useCan, ProtectedRoute } from '@fire-shield/vue';

const canWrite = useCan('post:write');
const canPublish = useCan('post:publish');
const canDelete = useCan('post:delete');
</script>

<template>
  <ProtectedRoute permission="post:read" redirectTo="/unauthorized">
    <div>
      <h2>Posts Page</h2>
      <p>This page is protected and requires 'post:read' permission.</p>

      <div class="actions">
        <h3>Post Actions</h3>
        <div class="button-group">
          <!-- Using v-can directive ✨ NEW! -->
          <button v-can="'post:write'" class="btn success">
            ✏️ Create Post
          </button>

          <button v-can="'post:publish'" class="btn primary">
            🚀 Publish Post
          </button>

          <button v-can="'post:delete'" class="btn danger">
            🗑️ Delete Post
          </button>
        </div>

        <!-- Using v-cannot directive ✨ NEW! -->
        <p v-cannot="'post:write'" class="info-text">
          ℹ️ You can only view posts. Switch to 'editor' or 'admin' role to create posts.
        </p>
      </div>

      <div class="permissions-card">
        <h4>Your Permissions:</h4>
        <ul>
          <li>Write posts: {{ canWrite ? '✅' : '❌' }}</li>
          <li>Publish posts: {{ canPublish ? '✅' : '❌' }}</li>
          <li>Delete posts: {{ canDelete ? '✅' : '❌' }}</li>
        </ul>
      </div>
    </div>
  </ProtectedRoute>
</template>

<style scoped>
h2 {
  margin-bottom: 10px;
}

.actions {
  margin-top: 30px;
}

h3 {
  margin-bottom: 15px;
}

.button-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 14px;
}

.btn.success {
  background: #28a745;
}

.btn.primary {
  background: #007bff;
}

.btn.danger {
  background: #dc3545;
}

.btn:hover {
  opacity: 0.9;
}

.info-text {
  color: #666;
  margin-top: 15px;
}

.permissions-card {
  margin-top: 30px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 4px;
}

.permissions-card h4 {
  margin-bottom: 10px;
}

.permissions-card ul {
  margin-left: 20px;
  line-height: 1.8;
}
</style>
