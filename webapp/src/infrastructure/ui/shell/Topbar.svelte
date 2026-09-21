<script lang="ts">
  import Badge from '../shared/Badge.svelte';

  interface Props {
    title: string;
    online?: boolean;
    onMenu?: () => void;
    onToggleTheme?: () => void;
    children?: import('svelte').Snippet;
  }

  let { title, online = true, onMenu, onToggleTheme, children }: Props = $props();
</script>

<div class="topbar">
  <div class="left">
    <button type="button" class="menu-toggle" aria-label="Menú" on:click={() => onMenu?.()}>☰</button>
    <h1>{title}</h1>
  </div>
  <div class="right">
    <Badge tone={online ? 'ok' : 'off'}>{online ? 'En línea' : 'Sin conexión'}</Badge>
    {#if onToggleTheme}
      <button type="button" class="theme-btn" aria-label="Cambiar tema" on:click={onToggleTheme}>Tema</button>
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
  }
  h1 {
    margin: 0;
    font-size: clamp(1.25rem, 2.5vw, 1.75rem);
    font-weight: 500;
    letter-spacing: -0.03em;
  }
  .right {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }
  .menu-toggle {
    display: none;
    background: var(--color-surface, var(--ap-bg-elevated));
    border: 1px solid var(--color-border, var(--ap-border));
    border-radius: 12px;
    padding: 8px 12px;
    color: var(--color-text-primary, var(--ap-text));
    cursor: pointer;
    font-size: 1.1rem;
    min-width: 44px;
    min-height: 44px;
  }
  .theme-btn {
    padding: 8px 14px;
    border-radius: 999px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: var(--color-surface, var(--ap-bg-elevated));
    color: var(--color-text-secondary, var(--ap-text-secondary));
    cursor: pointer;
    font-size: 0.8rem;
    font-family: inherit;
    min-height: 40px;
  }
  @media (max-width: 899px) {
    .menu-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  }
</style>
