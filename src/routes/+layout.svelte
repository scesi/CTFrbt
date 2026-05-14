<!-- 
  CTFrbt — Root Layout
  Loads global styles and provides the app shell.
  This layout wraps ALL pages.
-->
<script>
  import '$lib/styles/global.css';
</script>

<!-- Background layers container is in app.html -->

<nav id="ctf-nav">
  <a href="/" class="nav-brand">CTFrbt</a>
  
  <div class="nav-links">
    <a href="/challenges">Challenges</a>
    <a href="/scoreboard">Scoreboard</a>
    <a href="/team">Team</a>
    <a href="/login">Login</a>
  </div>

  <button class="hamburger" aria-label="Menu">
    <span></span>
    <span></span>
    <span></span>
  </button>
</nav>

<div class="nav-mobile">
  <a href="/challenges">Challenges</a>
  <a href="/scoreboard">Scoreboard</a>
  <a href="/team">Team</a>
  <a href="/login">Login</a>
</div>

<main id="ctf-main">
  <slot />
</main>

<footer id="ctf-footer">
  <p>Powered by CTFrbt</p>
</footer>
