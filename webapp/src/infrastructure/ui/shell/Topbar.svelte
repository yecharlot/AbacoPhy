<script lang="ts">
  import { Sun, Moon } from '@lucide/svelte';
  import Badge from '../shared/Badge.svelte';

  interface Props {
    title: string;
    online?: boolean;
    onMenu?: () => void;
    onToggleTheme?: () => void;
    children?: import('svelte').Snippet;
  }

  let { title, online = true, onMenu, onToggleTheme, children }: Props = $props();

  let isDark = $state(true);

  $effect(() => {
    if (typeof document === 'undefined') return;
    const el = document.documentElement;
    const sync = () => {
      isDark = el.getAttribute('data-theme') !== 'light';
    };
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(el, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    return () => obs.disconnect();
  });
</script>

<div class="topbar">
  <div class="left">
    <button type="button" class="menu-toggle" aria-label="Menú" onclick={() => onMenu?.()}>☰</button>
    <h1>{title}</h1>
  </div>
  <div class="right">
    <Badge tone={online ? 'ok' : 'off'}>{online ? 'En línea' : 'Sin conexión'}</Badge>
    {#if onToggleTheme}
      <button
        type="button"
        class="theme-btn"
        aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        onclick={onToggleTheme}
      >
        {#if isDark}
          <Sun size={15} strokeWidth={2.2} />
          <span>Claro</span>
        {:else}
          <Moon size={15} strokeWidth={2.2} />
          <span>Oscuro</span>
        {/if}
      </button>
    {/if}
    {#if children}{@render children()}{/if}
  </div>
</div>

<style>
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
  }
  .left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  h1 {
    margin: 0;
    font-size: clamp(1.15rem, 2.4vw, 1.55rem);
    font-weight: 550;
    letter-spacing: -0.03em;
    color: var(--color-text-primary);
  }
  .right {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }
  .menu-toggle {
    display: none;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 8px 12px;
    color: var(--color-text-primary);
    cursor: pointer;
    font-size: 1.1rem;
    min-width: 44px;
    min-height: 44px;
  }
  .theme-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-secondary);
    cursor: pointer;
    font-size: 0.8rem;
    font-family: inherit;
    font-weight: 500;
    min-height: 40px;
    transition: background var(--motion-fast), color var(--motion-fast);
  }
  .theme-btn:hover {
    color: var(--color-text-primary);
    background: var(--color-surface-raised);
  }
  .theme-btn:focus-visible {
    outline: 2px solid var(--accent-cyan);
    outline-offset: 2px;
  }
</style>
