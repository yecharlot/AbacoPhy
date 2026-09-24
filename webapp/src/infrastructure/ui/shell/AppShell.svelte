<script lang="ts">
  import { onMount } from 'svelte';
  import { User, LogOut, ChevronDown } from '@lucide/svelte';
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
    /** Rol o subtítulo bajo el nombre (opcional). */
    userRole?: string;
    onNavigate?: (id: string) => void;
    onToggleTheme?: () => void;
    onLogout?: () => void;
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
    userRole = '',
    onNavigate,
    onToggleTheme,
    onLogout,
    children,
  }: Props = $props();

  let prevIndex = $state(-1);
  let transitionDir = $state<ViewDirection>(0);
  let isDark = $state(true);
  let accountOpen = $state(false);

  function toggleAccount() {
    accountOpen = !accountOpen;
  }

  function closeAccount() {
    accountOpen = false;
  }

  function handleLogoutClick() {
    accountOpen = false;
    onLogout?.();
  }

  function initials(label: string): string {
    const parts = label.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (label.slice(0, 2) || '?').toUpperCase();
  }

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
            <div class="account-menu" class:open={accountOpen}>
              <button
                type="button"
                class="account-trigger"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                title={userLabel}
                onclick={toggleAccount}
              >
                <span class="account-avatar" aria-hidden="true">{initials(userLabel)}</span>
                <span class="account-meta">
                  <span class="account-name">{userLabel}</span>
                  {#if userRole}
                    <span class="account-role">{userRole}</span>
                  {/if}
                </span>
                <ChevronDown size={14} strokeWidth={2.2} class="account-chevron" aria-hidden="true" />
              </button>

              {#if accountOpen}
                <button
                  type="button"
                  class="account-backdrop"
                  aria-label="Cerrar menú de cuenta"
                  onclick={closeAccount}
                ></button>
                <div class="account-dropdown" role="menu">
                  <div class="account-dropdown-head">
                    <span class="account-avatar lg" aria-hidden="true">{initials(userLabel)}</span>
                    <div>
                      <div class="account-name">{userLabel}</div>
                      {#if userRole}
                        <div class="account-role">{userRole}</div>
                      {/if}
                    </div>
                  </div>
                  {#if onLogout}
                    <button
                      type="button"
                      class="account-item danger"
                      role="menuitem"
                      onclick={handleLogoutClick}
                    >
                      <LogOut size={15} strokeWidth={2.2} aria-hidden="true" />
                      Cerrar sesión
                    </button>
                  {/if}
                </div>
              {/if}
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

  .account-menu {
    position: relative;
    z-index: 40;
  }
  .account-trigger {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 4px 10px 4px 4px;
    border-radius: var(--radius-pill, 999px);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-secondary);
    max-width: 220px;
    min-height: 36px;
    cursor: pointer;
    font-family: inherit;
    transition: border-color 160ms ease, background 160ms ease;
  }
  .account-trigger:hover,
  .account-menu.open .account-trigger {
    border-color: color-mix(in srgb, var(--accent-cyan, #61e6e1) 35%, var(--color-border));
    background: color-mix(in srgb, var(--color-surface) 88%, var(--accent-cyan, #61e6e1));
  }
  .account-avatar {
    flex: 0 0 auto;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: #0a1210;
    background: var(--gradient-primary-btn, linear-gradient(135deg, #61e6e1, #b7f56a));
  }
  .account-avatar.lg {
    width: 36px;
    height: 36px;
    font-size: 0.75rem;
  }
  .account-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
    line-height: 1.15;
  }
  .account-name {
    font-size: 0.72rem;
    font-weight: 650;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
  }
  .account-role {
    font-size: 0.62rem;
    color: var(--color-text-muted);
    text-transform: capitalize;
  }
  .account-chevron {
    flex: 0 0 auto;
    opacity: 0.55;
    transition: transform 180ms ease;
  }
  .account-menu.open .account-chevron {
    transform: rotate(180deg);
  }
  .account-backdrop {
    position: fixed;
    inset: 0;
    z-index: 45;
    border: none;
    padding: 0;
    margin: 0;
    background: transparent;
    cursor: default;
  }
  .account-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 50;
    min-width: 200px;
    padding: 8px;
    border-radius: 14px;
    border: 1px solid var(--color-border);
    background: var(--color-surface, #12182a);
    box-shadow: var(--shadow-soft, 0 16px 40px rgba(0, 0, 0, 0.35));
  }
  .account-dropdown-head {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 8px 10px;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 6px;
  }
  .account-dropdown-head .account-name {
    max-width: 140px;
  }
  .account-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 10px;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: var(--color-text-primary);
    font-size: 0.8rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
  }
  .account-item:hover {
    background: color-mix(in srgb, var(--color-text-muted) 12%, transparent);
  }
  .account-item.danger {
    color: var(--accent-red, #f17b7b);
  }
  .account-item.danger:hover {
    background: color-mix(in srgb, var(--accent-red, #f17b7b) 12%, transparent);
  }

  @media (max-width: 699px) {
    .account-meta {
      display: none;
    }
    .account-trigger {
      padding: 4px;
      max-width: none;
    }
    .account-chevron {
      display: none;
    }
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
