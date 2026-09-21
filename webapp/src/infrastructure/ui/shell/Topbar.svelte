<script lang="ts">
  import Badge from '../shared/Badge.svelte';

  interface Props {
    title: string;
    online?: boolean;
    onMenu?: () => void;
    onToggleTheme?: () => void;
    children?: import('svelte').Snippet;
  }

  let {
    title,
    online = true,
    onMenu,
    onToggleTheme,
    children,
  }: Props = $props();
</script>

<div class="topbar">
  <div class="left">
    <button type="button" class="menu-toggle" aria-label="Menú" on:click={() => onMenu?.()}>
      ☰
    </button>
    <h1>{title}</h1>
  </div>
  <div class="right">
    <Badge tone={online ? 'ok' : 'off'}>{online ? 'En línea' : 'Sin conexión'}</Badge>
    {#if onToggleTheme}
      <button type="button" class="theme-btn" aria-label="Cambiar tema" on:click={onToggleTheme}>
        Tema
      </button>
    {/if}
    {#if children}
      {@render children()}
    {/if}
  </div>
</div>

<style>
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }
  .left {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  h1 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .right {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }
  .menu-toggle {
    display: none;
    background: transparent;
    border: 1px solid var(--ap-border);
    border-radius: 10px;
    padding: 7px 10px;
    color: var(--ap-primary);
    cursor: pointer;
    font-size: 1.1rem;
  }
  .theme-btn {
    padding: 6px 12px;
    border-radius: 20px;
    border: 1px solid var(--ap-border);
    background: transparent;
    color: var(--ap-text-secondary);
    cursor: pointer;
    font-size: 0.8rem;
    font-family: inherit;
  }
  @media (max-width: 900px) {
    .menu-toggle {
      display: inline-flex;
    }
  }
</style>
