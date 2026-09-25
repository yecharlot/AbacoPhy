<script lang="ts">
  /** Pantalla de arranque: evita flash vacío mientras bootstrap de sesión. */
</script>

<div class="boot-skel" aria-busy="true" aria-label="Cargando aplicación">
  <header class="boot-top">
    <div class="pill-row">
      <div class="bone bone-logo"></div>
      <div class="bone bone-nav"></div>
      <div class="bone bone-nav short"></div>
      <div class="bone bone-nav short"></div>
    </div>
    <div class="pill-row right">
      <div class="bone bone-chip"></div>
      <div class="bone bone-chip"></div>
      <div class="bone bone-avatar"></div>
    </div>
  </header>

  <main class="boot-main">
    <div class="bone bone-title"></div>
    <div class="hero">
      <div class="bone bone-hero"></div>
      <div class="hero-side">
        <div class="bone bone-stat"></div>
        <div class="bone bone-stat"></div>
      </div>
    </div>
    <div class="bone bone-chart"></div>
    <div class="grid2">
      <div class="bone bone-card"></div>
      <div class="bone bone-card"></div>
    </div>
    <div class="bone bone-eq"></div>
  </main>
</div>

<style>
  .boot-skel {
    min-height: 100dvh;
    box-sizing: border-box;
    padding: 12px 16px 24px;
    background: var(--ap-bg, #0b0f0e);
    color: var(--ap-text-secondary, #8a9a94);
  }
  .boot-top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 18px;
  }
  .pill-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .bone {
    border-radius: 12px;
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--ap-surface, #151b1a) 100%, transparent) 0%,
      color-mix(in srgb, var(--ap-surface-raised, #1c2422) 100%, transparent) 50%,
      color-mix(in srgb, var(--ap-surface, #151b1a) 100%, transparent) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.2s ease-in-out infinite;
  }
  .bone-logo {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }
  .bone-nav {
    width: 72px;
    height: 32px;
    border-radius: 999px;
  }
  .bone-nav.short {
    width: 40px;
  }
  .bone-chip {
    width: 56px;
    height: 28px;
    border-radius: 999px;
  }
  .bone-avatar {
    width: 120px;
    height: 36px;
    border-radius: 999px;
  }
  .boot-main {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .bone-title {
    width: 140px;
    height: 22px;
  }
  .hero {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 12px;
  }
  .hero-side {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .bone-hero {
    height: 120px;
    border-radius: 18px;
  }
  .bone-stat {
    height: 56px;
    border-radius: 14px;
  }
  .bone-chart {
    height: 180px;
    border-radius: 18px;
  }
  .grid2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .bone-card {
    height: 140px;
    border-radius: 16px;
  }
  .bone-eq {
    height: 160px;
    border-radius: 18px;
  }
  @keyframes shimmer {
    0% {
      background-position: 100% 0;
    }
    100% {
      background-position: -100% 0;
    }
  }
  @media (max-width: 720px) {
    .hero,
    .grid2 {
      grid-template-columns: 1fr;
    }
    .bone-chart {
      height: 140px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .bone {
      animation: none;
    }
  }
</style>
