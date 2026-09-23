<script lang="ts">
  import { onMount } from 'svelte';
  import { User } from '@lucide/svelte';
  import PillNav from './PillNav.svelte';
  import SkyThemeToggle from '../shared/SkyThemeToggle.svelte';
  import ConnectionPill from '../shared/ConnectionPill.svelte';
  import type { NavItem } from './navTypes';
  import {
    viewIn,
    viewOut,
    navIndex,
    directionBetween,
    type ViewDirection,
  } from '../motion/viewTransitions';

  interface Props {
    navItems: NavItem[];
    activeId: string;
    pageTitle: string;
    online?: boolean;
    brandTitle?: string;
    brandSubtitle?: string;
    userLabel?: string;
    onNavigate?: (id: string) => void;
    onToggleTheme?: () => void;
    children?: import('svelte').Snippet;
  }

  let {
    navItems,
    activeId,
    pageTitle,
    online = true,
    brandTitle = 'ÁbacoPhy',
    brandSubtitle = 'Negocio',
    userLabel = '',
    onNavigate,
    onToggleTheme,
    children,
  }: Props = $props();

  let prevIndex = $state(-1);
  let transitionDir = $state<ViewDirection>(0);
  let isDark = $state(true);

  /** Chrome colapsado → solo hamburguesa (3 barras). */
  let chromeCollapsed = $state(false);
  /**
   * Tras clic en las 3 barras: permanece desplegado arriba del viewport
   * hasta que el usuario vuelva a hacer scroll hacia abajo.
   */
  let pinnedOpen = $state(false);

  const SCROLL_DELTA = 8;
  const SCROLL_MIN = 48;

  $effect.pre(() => {
    const next = navIndex(navItems, activeId);
    transitionDir = directionBetween(prevIndex, next);
    if (next >= 0) prevIndex = next;
  });

  $effect(() => {
    if (typeof document === 'undefined') return;
    const el = document.documentElement;
    const sync = () => {
      isDark = el.getAttribute('data-theme') !== 'light';
    };
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  });

  onMount(() => {
    let lastY = window.scrollY || 0;

    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      const dy = y - lastY;

      if (y <= SCROLL_MIN) {
        chromeCollapsed = false;
        // cerca del tope: ya no hace falta el pin
        pinnedOpen = false;
      } else if (dy > SCROLL_DELTA) {
        // Solo el scroll hacia abajo cierra el chrome (también libera el pin)
        pinnedOpen = false;
        chromeCollapsed = true;
      } else if (dy < -SCROLL_DELTA) {
        // hacia arriba → expande (sin pin permanente)
        if (!chromeCollapsed || pinnedOpen) {
          chromeCollapsed = false;
        } else {
          chromeCollapsed = false;
        }
      }

      lastY = y;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  });

  function expandChrome() {
    pinnedOpen = true;
    chromeCollapsed = false;
    // Asegura que la barra quede visible arriba del viewport
    // (sticky + fondo opaco; no hace falta scrollTo si ya está en top:0)
  }

  function handleNavigate(id: string) {
    onNavigate?.(id);
    pinnedOpen = true;
    chromeCollapsed = false;
  }
</script>

<div class="shell" class:chrome-collapsed={chromeCollapsed}>
  <header class="chrome">
    <!-- Botón 3 barras: visible al colapsar -->
    <button
      type="button"
      class="chrome-burger"
      class:visible={chromeCollapsed}
      aria-label="Mostrar navegación"
      aria-expanded={!chromeCollapsed}
      onclick={expandChrome}
    >
      <span class="bar"></span>
      <span class="bar"></span>
      <span class="bar"></span>
    </button>

    <!-- Barra completa: se desliza a la izquierda al colapsar -->
    <div class="chrome-full" class:away={chromeCollapsed} aria-hidden={chromeCollapsed}>
      <div class="chrome-grid">
        <div class="cell-nav">
          <PillNav
            items={navItems}
            {activeId}
            {brandTitle}
            {brandSubtitle}
            onNavigate={handleNavigate}
          />
        </div>

        <div class="cell-title" aria-live="polite">
          {#key pageTitle}
            <h1
              class="page-title"
              in:viewIn={{ direction: transitionDir }}
              out:viewOut={{ direction: transitionDir }}
            >
              {pageTitle}
            </h1>
          {/key}
        </div>

        <div class="cell-online">
          <ConnectionPill {online} />
        </div>

        {#if onToggleTheme}
          <div class="cell-theme">
            <SkyThemeToggle {isDark} size="chrome" onToggle={onToggleTheme} />
          </div>
        {/if}

        {#if userLabel}
          <div class="cell-account">
            <div class="account-box" title={userLabel}>
              <User size={15} strokeWidth={2.2} aria-hidden="true" />
              <span class="account-text">{userLabel}</span>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </header>

  <!-- FAB tema: solo móvil; siempre visible (no participa del colapso) -->
  {#if onToggleTheme}
    <div class="theme-fab-wrap">
      <SkyThemeToggle {isDark} size="fab" onToggle={onToggleTheme} />
    </div>
  {/if}

  <main class="content dashboard-container">
    <div class="view-viewport">
      {#key activeId}
        <div
          class="view-layer"
          in:viewIn={{ direction: transitionDir }}
          out:viewOut={{ direction: transitionDir }}
        >
          {#if children}
            {@render children()}
          {/if}
        </div>
      {/key}
    </div>
  </main>
</div>

<style>
  .shell {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    background: var(--color-bg, var(--ap-bg));
  }

  /*
   * Sticky siempre arriba (expandido o solo hamburguesa).
   * Expandido: fondo opaco → el contenido no se ve detrás.
   * Colapsado: chrome casi sin altura/fondo; solo el botón flotante sticky.
   */
  .chrome {
    position: sticky;
    top: 0;
    z-index: 80;
    padding: 8px var(--page-padding, 1.25rem);
    display: flex;
    align-items: center;
    /* Opaco: bloquea el contenido de la vista */
    background: var(--color-bg, var(--ap-bg));
    border-bottom: 1px solid var(--color-border);
    transition:
      padding 280ms ease,
      background 280ms ease,
      border-color 280ms ease,
      min-height 280ms ease;
    min-height: 52px;
  }

  /* Colapsado: libera altura vertical; el contenido puede subir debajo */
  .shell.chrome-collapsed .chrome {
    padding: 0;
    min-height: 0;
    height: 0;
    border-bottom-color: transparent;
    background: transparent;
    overflow: visible; /* permite ver la hamburguesa fuera del height 0 */
  }

  /* —— Hamburguesa: sticky visual, legible sobre el contenido —— */
  .chrome-burger {
    position: fixed;
    left: var(--page-padding, 1.25rem);
    top: 10px;
    width: 42px;
    height: 42px;
    border-radius: 12px;
    border: 1px solid var(--color-border);
    /* Fondo sólido + sombra para no confundirse con el contenido */
    background: var(--color-surface, var(--ap-bg-elevated));
    box-shadow:
      var(--shadow-soft, 0 12px 40px rgba(0, 0, 0, 0.18)),
      0 0 0 1px color-mix(in srgb, var(--color-bg) 40%, transparent);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    z-index: 90;
    transform: scale(0.88) translateX(-6px);
    transition:
      opacity 280ms ease,
      transform 320ms cubic-bezier(0.22, 1.15, 0.36, 1);
  }
  .chrome-burger.visible {
    opacity: 1;
    pointer-events: auto;
    transform: scale(1) translateX(0);
  }
  .chrome-burger:hover {
    background: var(--color-surface-raised, var(--color-surface));
  }
  .chrome-burger:focus-visible {
    outline: 2px solid var(--accent-cyan);
    outline-offset: 2px;
  }
  .bar {
    display: block;
    width: 18px;
    height: 2px;
    border-radius: 2px;
    background: var(--color-text-primary);
  }

  /* —— Barra completa: sale hacia la izquierda —— */
  .chrome-full {
    width: 100%;
    transform: translate3d(0, 0, 0);
    opacity: 1;
    transition:
      transform 360ms cubic-bezier(0.22, 1.1, 0.36, 1),
      opacity 280ms ease;
    will-change: transform, opacity;
  }
  .chrome-full.away {
    transform: translate3d(-28px, 0, 0);
    opacity: 0;
    pointer-events: none;
  }

  .chrome-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto auto auto;
    grid-template-areas: 'nav title online theme account';
    align-items: center;
    column-gap: 12px;
    row-gap: 6px;
  }

  .cell-nav {
    grid-area: nav;
    min-width: 0;
  }
  .cell-title {
    grid-area: title;
    position: relative;
    min-width: 0;
    min-height: 1.55em;
    overflow: hidden;
  }
  .cell-online {
    grid-area: online;
  }
  .cell-theme {
    grid-area: theme;
  }
  .cell-account {
    grid-area: account;
  }

  .page-title {
    margin: 0;
    font-size: clamp(1.05rem, 2vw, 1.35rem);
    font-weight: 550;
    letter-spacing: -0.03em;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: min(280px, 28vw);
  }

  .account-box {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px 6px 10px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-secondary);
    max-width: 200px;
    min-height: 36px;
  }
  .account-text {
    font-size: 0.72rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .theme-fab-wrap {
    display: none;
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 90;
  }

  .content {
    flex: 1;
    padding: var(--page-padding, 1.25rem);
    width: min(100%, 1500px);
    margin-inline: auto;
    transition: padding-top 280ms ease;
  }

  @media (min-width: 900px) {
    .content {
      padding-top: 14px;
    }
  }

  @media (min-width: 600px) and (max-width: 899px) {
    .content {
      padding-top: 12px;
    }
  }

  /* Colapsado: deja hueco bajo el botón de 3 barras para no tapar el contenido */
  .shell.chrome-collapsed .content {
    padding-top: 56px;
  }

  .view-viewport {
    position: relative;
    min-height: 40vh;
  }
  .view-layer {
    width: 100%;
    will-change: transform, opacity;
  }
  .view-viewport :global(.view-layer:not(:only-child)) {
    position: absolute;
    inset: 0 auto auto 0;
    width: 100%;
  }

  /* Tablet */
  @media (max-width: 899px) and (min-width: 600px) {
    .chrome-grid {
      grid-template-columns: minmax(0, 1fr) auto auto auto;
      grid-template-areas:
        'nav online theme account'
        'title title title title';
      row-gap: 6px;
    }
    .page-title {
      max-width: 100%;
    }
  }

  /* Mobile: FAB tema siempre; chrome colapsa igual */
  @media (max-width: 599px) {
    .chrome-grid {
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-areas:
        'nav nav'
        'title online';
    }
    .cell-theme,
    .cell-account {
      display: none;
    }
    .page-title {
      max-width: 100%;
    }
    .theme-fab-wrap {
      display: block;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .chrome-full,
    .chrome-burger,
    .view-layer {
      transition-duration: 0.01ms !important;
      will-change: auto;
    }
  }
</style>
