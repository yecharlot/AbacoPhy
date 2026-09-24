<script lang="ts">
  /**
   * Indicador online/offline con estética glass del sky-toggle.
   */
  interface Props {
    online?: boolean;
  }

  let { online = true }: Props = $props();
</script>

<div
  class="conn"
  class:online
  class:offline={!online}
  role="status"
  aria-live="polite"
  title={online ? 'Conectado al servidor' : 'Sin conexión'}
>
  <div class="sky" aria-hidden="true"></div>
  <span class="pulse" aria-hidden="true"></span>
  <span class="label">{online ? 'En línea' : 'Sin conexión'}</span>
</div>

<style>
  .conn {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 36px;
    padding: 0 12px 0 10px;
    border-radius: 999px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.18);
    flex-shrink: 0;
    box-shadow:
      inset 0 1px 3px rgba(255, 255, 255, 0.1),
      inset 0 -3px 10px rgba(0, 0, 0, 0.28),
      0 4px 14px -6px rgba(0, 0, 0, 0.4);
    transition:
      border-color 400ms ease,
      box-shadow 400ms ease;
  }

  .sky {
    position: absolute;
    inset: 0;
    transition: background 500ms ease;
  }
  .online .sky {
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent-green, #b7f56a) 22%, #0c1a14) 0%,
      color-mix(in srgb, var(--accent-cyan, #61e6e1) 12%, #0a1218) 100%
    );
  }
  .offline .sky {
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent-red, #f17b7b) 18%, #1a0c0c) 0%,
      #121018 100%
    );
  }

  :global([data-theme='light']) .online .sky {
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent-green, #3d9a2e) 18%, #eef8f0) 0%,
      color-mix(in srgb, var(--accent-cyan, #1aa8a3) 10%, #f3f7fb) 100%
    );
  }
  :global([data-theme='light']) .offline .sky {
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent-red, #d64545) 14%, #f8eeee) 0%,
      #f3f5f9 100%
    );
  }
  :global([data-theme='light']) .conn {
    border-color: rgba(15, 20, 35, 0.1);
    box-shadow:
      inset 0 1px 2px rgba(255, 255, 255, 0.8),
      0 4px 12px -6px rgba(18, 21, 31, 0.15);
  }

  .pulse {
    position: relative;
    z-index: 1;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .online .pulse {
    background: var(--accent-green, #b7f56a);
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent-green, #b7f56a) 55%, transparent);
    animation: conn-pulse 2s ease-out infinite;
  }
  .offline .pulse {
    background: var(--accent-red, #f17b7b);
    box-shadow: 0 0 8px color-mix(in srgb, var(--accent-red, #f17b7b) 50%, transparent);
  }

  .label {
    position: relative;
    z-index: 1;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    white-space: nowrap;
    color: var(--color-text-primary, #f7f8fc);
  }
  :global([data-theme='light']) .label {
    color: var(--color-text-primary, #12151f);
  }

  @keyframes conn-pulse {
    0% {
      box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent-green, #b7f56a) 50%, transparent);
    }
    70% {
      box-shadow: 0 0 0 8px transparent;
    }
    100% {
      box-shadow: 0 0 0 0 transparent;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pulse {
      animation: none !important;
    }
  }
</style>
