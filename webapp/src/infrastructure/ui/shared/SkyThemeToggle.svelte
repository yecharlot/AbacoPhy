<script lang="ts">
  /**
   * Toggle día/noche ilustrado (sky pill).
   * Compacto para chrome; size="fab" para móvil.
   */
  type Size = 'chrome' | 'fab';

  interface Props {
    isDark?: boolean;
    size?: Size;
    onToggle?: () => void;
  }

  let { isDark = true, size = 'chrome', onToggle }: Props = $props();

  let isDay = $derived(!isDark);

  const STARS = [
    { x: 18, y: 22, delay: 0 },
    { x: 34, y: 16, delay: 0.3 },
    { x: 52, y: 28, delay: 0.55 },
    { x: 68, y: 18, delay: 0.2 },
    { x: 42, y: 42, delay: 0.45 },
  ];
</script>

<button
  type="button"
  class="sky-toggle"
  class:fab={size === 'fab'}
  class:day={isDay}
  class:night={!isDay}
  aria-label={isDay ? 'Cambiar a modo noche' : 'Cambiar a modo día'}
  aria-pressed={isDay}
  onclick={() => onToggle?.()}
>
  <div class="sky night-sky" aria-hidden="true"></div>
  <div class="sky day-sky" class:on={isDay} aria-hidden="true"></div>

  <div class="stars" class:on={!isDay} aria-hidden="true">
    {#each STARS as star}
      <span
        class="star"
        style="left:{star.x}%;top:{star.y}%;animation-delay:{star.delay}s"
      ></span>
    {/each}
  </div>

  <div class="birds" class:on={isDay} aria-hidden="true">
    <span class="bird" style="left:48%;top:24%">⌃⌃</span>
    <span class="bird" style="left:62%;top:34%">⌃⌃</span>
  </div>

  <div class="sun" class:on={isDay} aria-hidden="true">
    <span class="sun-core"></span>
  </div>

  <div class="moon" class:on={!isDay} aria-hidden="true">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
        fill="currentColor"
      />
    </svg>
  </div>

  <div class="clouds" aria-hidden="true">
    <span class="cloud c1"></span>
    <span class="cloud c2"></span>
  </div>

  <div class="orb" class:orb-day={isDay} class:orb-night={!isDay} aria-hidden="true"></div>
</button>

<style>
  .sky-toggle {
    --w: 88px;
    --h: 36px;
    --orb: 26px;
    --orb-left-day: 6px;
    --orb-left-night: 56px;
    position: relative;
    width: var(--w);
    height: var(--h);
    border-radius: 999px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.22);
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    box-shadow:
      inset 0 1px 4px rgba(255, 255, 255, 0.12),
      inset 0 -4px 12px rgba(0, 0, 0, 0.35),
      0 6px 18px -8px rgba(0, 0, 0, 0.45);
    transition: transform 180ms ease, box-shadow 300ms ease;
  }

  .sky-toggle.fab {
    --w: 56px;
    --h: 56px;
    --orb: 22px;
    --orb-left-day: 6px;
    --orb-left-night: 28px;
    border-radius: 50%;
    box-shadow: var(--shadow-float, 0 12px 40px rgba(0, 0, 0, 0.35));
  }

  .sky-toggle:hover {
    transform: scale(1.03);
  }
  .sky-toggle:active {
    transform: scale(0.97);
  }
  .sky-toggle:focus-visible {
    outline: 2px solid var(--accent-cyan, #61e6e1);
    outline-offset: 2px;
  }

  .sky {
    position: absolute;
    inset: 0;
  }
  .night-sky {
    background: linear-gradient(180deg, #0a1330 0%, #131c42 100%);
  }
  .day-sky {
    background: linear-gradient(180deg, #6fa3d8 0%, #a9c9e8 100%);
    opacity: 0;
    transition: opacity 700ms ease-in-out;
  }
  .day-sky.on {
    opacity: 1;
  }

  .stars {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0;
    transition: opacity 500ms ease;
  }
  .stars.on {
    opacity: 1;
  }
  .star {
    position: absolute;
    width: 2px;
    height: 2px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 3px #fff;
    animation: twinkle 2s ease-in-out infinite;
  }

  .birds {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0;
    transition: opacity 500ms ease, transform 500ms ease;
    transform: translateY(4px);
  }
  .birds.on {
    opacity: 1;
    transform: translateY(0);
  }
  .bird {
    position: absolute;
    font-size: 8px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.85);
    line-height: 1;
  }

  .sun,
  .moon {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    display: grid;
    place-items: center;
    pointer-events: none;
    transition:
      opacity 600ms ease,
      transform 600ms cubic-bezier(0.22, 1.15, 0.36, 1);
  }
  .sun {
    left: 10px;
    opacity: 0.2;
    transform: translateY(-50%) rotate(180deg) scale(0.55);
  }
  .sun.on {
    opacity: 1;
    transform: translateY(-50%) rotate(0deg) scale(1);
  }
  .sun-core {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #ffd35c;
    box-shadow: 0 0 10px 3px rgba(255, 211, 92, 0.65);
  }

  .moon {
    right: 10px;
    color: #f4f1e6;
    opacity: 0.95;
    transform: translateY(-50%) rotate(0) scale(1);
  }
  .moon:not(.on) {
    opacity: 0.2;
    transform: translateY(-50%) rotate(-180deg) scale(0.55);
  }

  .sky-toggle.fab .sun {
    left: 8px;
  }
  .sky-toggle.fab .moon {
    right: 8px;
  }

  .clouds {
    position: absolute;
    inset-inline: 0;
    bottom: 4px;
    height: 10px;
    display: flex;
    justify-content: center;
    gap: 6px;
    pointer-events: none;
  }
  .cloud {
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.45);
    animation: drift 6s ease-in-out infinite;
  }
  .day .cloud {
    background: rgba(255, 255, 255, 0.9);
  }
  .c1 {
    width: 18px;
    height: 6px;
    --cloud-range: 5px;
  }
  .c2 {
    width: 24px;
    height: 7px;
    --cloud-range: -6px;
    animation-duration: 7s;
  }

  .orb {
    position: absolute;
    top: 50%;
    width: var(--orb);
    height: var(--orb);
    margin-top: calc(var(--orb) / -2);
    border-radius: 50%;
    left: var(--orb-left-night);
    pointer-events: none;
    background: radial-gradient(circle at 35% 30%, #fff, #eef3fb 55%, #d8e4f4);
    transition:
      left 900ms cubic-bezier(0.22, 1.25, 0.36, 1),
      box-shadow 700ms ease-in-out;
  }
  .orb-day {
    left: var(--orb-left-day);
    box-shadow:
      0 0 14px 4px rgba(255, 255, 255, 0.55),
      inset 0 1px 3px rgba(255, 255, 255, 0.8);
  }
  .orb-night {
    left: var(--orb-left-night);
    box-shadow:
      0 0 16px 5px rgba(180, 205, 255, 0.45),
      inset 0 1px 3px rgba(255, 255, 255, 0.55);
  }

  @keyframes twinkle {
    0%,
    100% {
      opacity: 0.35;
    }
    50% {
      opacity: 1;
    }
  }
  @keyframes drift {
    0%,
    100% {
      transform: translateX(0);
    }
    50% {
      transform: translateX(var(--cloud-range, 4px));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .orb,
    .sky-toggle,
    .star,
    .cloud,
    .sun,
    .moon,
    .day-sky,
    .stars,
    .birds {
      animation: none !important;
      transition-duration: 0.01ms !important;
    }
  }
</style>
