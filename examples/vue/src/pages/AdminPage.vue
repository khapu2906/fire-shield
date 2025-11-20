<template>
  <div>
    <h2>Admin Dashboard</h2>
    <p>This page is protected and requires 'admin' role.</p>

    <div class="stats-grid">
      <div class="stat-card blue">
        <h3>Users</h3>
        <p class="stat-number">156</p>
      </div>
      <div class="stat-card green">
        <h3>Posts</h3>
        <p class="stat-number">432</p>
      </div>
      <div class="stat-card red">
        <h3>Settings</h3>
        <p class="stat-number">12</p>
      </div>
    </div>

    <div class="admin-note">
      <strong>Admin Note:</strong> Only users with the 'admin' role can access this page.
    </div>
  </div>
</template>

<style scoped>
h2 {
  margin-bottom: 10px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 30px;
}

.stat-card {
  padding: 20px;
  border-radius: 8px;
}

.stat-card.blue {
  background: #e7f3ff;
}

.stat-card.green {
  background: #f0fff4;
}

.stat-card.red {
  background: #fff5f5;
}

.stat-card h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  margin: 0;
}

.admin-note {
  margin-top: 30px;
  padding: 15px;
  background: #fff3cd;
  border-radius: 4px;
}
</style>
