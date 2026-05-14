<!-- CTFrbt — Admin Layout (placeholder) -->
<svelte:head>
  <title>Admin — CTFrbt</title>
</svelte:head>

<div class="admin-layout">
  <nav class="admin-nav">
    <a href="/admin/challenges">Challenges</a>
    <a href="/admin/users">Users</a>
    <a href="/admin/settings">Settings</a>
  </nav>

  <div class="admin-content">
    <slot />
  </div>
</div>
