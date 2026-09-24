<div class="ambient" aria-hidden="true">
  <span class="orb orb-a"></span>
  <span class="orb orb-b"></span>
  <span class="orb orb-c"></span>
  <span class="grain"></span>
</div>

<style>
  .ambient {
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    overflow: hidden;
  }
  .orb {
    position: absolute;
    width: 28rem;
    height: 28rem;
    border-radius: 50%;
    filter: blur(80px);
    opacity: .075;
  }
  .orb-a { top: -12rem; right: 4%; background: var(--accent-cyan); animation: drift-a 18s ease-in-out infinite alternate; }
  .orb-b { bottom: -16rem; left: 18%; background: var(--accent-purple); animation: drift-b 24s ease-in-out infinite alternate; }
  .orb-c { top: 34%; right: -14rem; background: var(--accent-lime); animation: drift-c 21s ease-in-out infinite alternate; }
  .grain {
    position: absolute;
    inset: 0;
    opacity: .025;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E");
  }
  @keyframes drift-a { to { transform: translate(-3rem, 2rem) scale(1.08); } }
  @keyframes drift-b { to { transform: translate(4rem, -2rem) scale(.94); } }
  @keyframes drift-c { to { transform: translate(-2rem, 3rem); } }
  @media (prefers-reduced-motion: reduce) {
    .orb { animation: none; }
  }
</style>
