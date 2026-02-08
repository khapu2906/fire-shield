<template>
  <div class="unauthorized">
    <h2>🚫 Unauthorized</h2>
    <p>You don't have permission to access this page.</p>
    <router-link to="/" class="back-link">← Go back to home</router-link>
  </div>
</template>

<style scoped>
.unauthorized {
  text-align: center;
  padding: 50px;
}

h2 {
  margin-bottom: 15px;
  font-size: 32px;
}

p {
  margin-bottom: 20px;
  color: #666;
}

.back-link {
  color: #007bff;
  text-decoration: none;
  font-size: 16px;
}

.back-link:hover {
  text-decoration: underline;
}
</style>
