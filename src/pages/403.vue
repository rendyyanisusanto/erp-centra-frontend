<template>
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--color-bg)">
    <div style="text-align:center">
      <div style="font-size:80px;margin-bottom:16px">🔐</div>
      <h1 style="font-size:32px;font-weight:800;color:var(--color-text);margin-bottom:8px">403 Forbidden</h1>
      <p style="color:var(--color-text-muted);margin-bottom:24px">You do not have permission to access this page.</p>
      <router-link to="/dashboard" class="btn btn-primary">← Back to Dashboard</router-link>
    </div>
  </div>
</template>
