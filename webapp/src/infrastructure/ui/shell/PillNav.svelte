<script lang="ts">
  import type { NavItem } from './navTypes';
  import { iconForNav } from './navIcons';

  interface Props {
    items: NavItem[];
    activeId: string;
    brandTitle?: string;
    brandSubtitle?: string;
    onNavigate?: (id: string) => void;
  }

  let {
    items,
    activeId,
    brandTitle = 'ÁbacoPhy',
    brandSubtitle = 'Negocio',
    onNavigate,
  }: Props = $props();

  let hovered = $state<string | null>(null);

  function select(id: string) {
    onNavigate?.(id);
  }
</script>

<nav class="pill-nav" aria-label="Navegación principal" onmouseleave={() => (hovered = null)}>
  <div class="track">
    <!-- Brand: always expanded on large screens; logo-only on tablet/mobile -->
    <div class="brand-pill" title="{brandTitle} — {brandSubtitle}">
      <img
        class="brand-logo"
        src="/abacus_color_icon.svg"
        width="28"
        height="28"
        alt=""
        aria-hidden="true"
      />
      <div class="brand-copy">
        <span class="brand-title">{brandTitle}</span>
        <span class="brand-sub">{brandSubtitle}</span>
      </div>
    </div>

    <span class="track-sep" aria-hidden="true"></span>

    {#each items as item (item.id)}
      {@const isActive = item.id === activeId}
      {@const isExpanded = hovered ? hovered === item.id : isActive}
      {@const Icon = iconForNav(item.id)}
      <button
        type="button"
        class="pill"
        class:expanded={isExpanded}
        class:active={isActive}
        aria-label={item.label}
        aria-current={isActive ? 'page' : undefined}
        onclick={() => select(item.id)}
        onmouseenter={() => (hovered = item.id)}
        onfocus={() => (hovered = item.id)}
      >
        <Icon size={17} strokeWidth={2.2} class="pill-icon" aria-hidden="true" />
        {#if isExpanded}
          <span class="pill-label">{item.label}</span>
        {/if}
      </button>
    {/each}
  </div>
</nav>

<style>
  .pill-nav {
    width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    padding-bottom: 0;
    line-height: 0; /* evita gap fantasma bajo el track inline */
  }

  .track {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px; /* interior del pill: sin cambiar tamaño de controles */
    border-radius: var(--radius-pill);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-soft);
    min-height: 52px;
    line-height: normal;
  }

  /* —— Brand inside track —— */
  .brand-pill {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
    height: 36px;
    padding: 0 4px 0 2px;
    border-radius: var(--radius-pill);
  }

  .brand-logo {
    width: 28px;
    height: 28px;
    object-fit: contain;
    flex-shrink: 0;
    display: block;
  }

  .brand-copy {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
    line-height: 1.15;
  }

  .brand-title {
    font-size: 0.82rem;
    font-weight: 650;
    letter-spacing: -0.02em;
    color: var(--color-text-primary);
    white-space: nowrap;
  }

  .brand-sub {
    font-size: 0.65rem;
    color: var(--color-text-muted);
    white-space: nowrap;
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .track-sep {
    width: 1px;
    height: 22px;
    background: var(--color-border);
    flex-shrink: 0;
    margin: 0 2px;
  }

  /* Tablet / mobile: logo only */
  @media (max-width: 899px) {
    .brand-copy {
      display: none;
    }
    .brand-pill {
      padding: 0;
      width: 36px;
      justify-content: center;
    }
  }

  /* —— Nav pills —— */
  .pill {
    height: 36px;
    width: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    padding: 0;
    border: none;
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    font-family: inherit;
    overflow: hidden;
    flex-shrink: 0;
    transition:
      width 250ms cubic-bezier(0.34, 1.56, 0.64, 1),
      background var(--motion-fast),
      color var(--motion-fast),
      gap 180ms ease,
      padding 180ms ease;
  }

  .pill.expanded {
    width: auto;
    min-width: 36px;
    max-width: 160px;
    gap: 8px;
    padding: 0 14px;
    background: color-mix(in srgb, var(--accent-cyan) 16%, transparent);
    color: var(--color-text-primary);
  }

  .pill.active:not(.expanded) {
    background: color-mix(in srgb, var(--accent-cyan) 12%, transparent);
    color: var(--accent-cyan);
  }

  .pill:hover {
    color: var(--color-text-primary);
  }

  .pill:focus-visible {
    outline: 2px solid var(--accent-cyan);
    outline-offset: 2px;
  }

  .pill-label {
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    letter-spacing: -0.01em;
    animation: pill-in 180ms ease-out;
  }

  :global(.pill-icon) {
    flex-shrink: 0;
  }

  @keyframes pill-in {
    from {
      opacity: 0;
      transform: translateX(-4px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pill {
      transition: background var(--motion-fast), color var(--motion-fast);
    }
    .pill-label {
      animation: none;
    }
  }

  @media (max-width: 599px) {
    .track {
      padding: 6px;
      gap: 4px;
    }
    .pill {
      height: 34px;
      width: 34px;
    }
    .pill.expanded {
      padding: 0 12px;
    }
    .pill-label {
      font-size: 12px;
    }
    .brand-logo {
      width: 24px;
      height: 24px;
    }
    .brand-pill {
      width: 34px;
      height: 34px;
    }
  }
</style>
