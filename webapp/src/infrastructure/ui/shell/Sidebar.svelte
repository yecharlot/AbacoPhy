<script lang="ts">
  import type { NavItem } from './navTypes';

  interface Props {
    items: NavItem[];
    activeId: string;
    title?: string;
    subtitle?: string;
    userLabel?: string;
    open?: boolean;
    onNavigate?: (id: string) => void;
    onClose?: () => void;
  }

  let {
    items,
    activeId,
    title = 'ÁbacoPhy',
    subtitle = 'Negocio',
    userLabel = '',
    open = false,
    onNavigate,
    onClose,
  }: Props = $props();
</script>

<aside class="sidebar" class:open aria-label="Navegación principal">
  <div class="header">
    <h3>{title}</h3>
    <p class="sub">{subtitle}</p>
    {#if userLabel}
      <p class="user">{userLabel}</p>
    {/if}
  </div>
  <nav class="nav">
    {#each items as item (item.id)}
      <button
        type="button"
        class="nav-item"
        class:active={item.id === activeId}
        on:click={() => {
          onNavigate?.(item.id);
          onClose?.();
        }}
      >
        {item.label}
      </button>
    {/each}
  </nav>
</aside>

<style>
  .sidebar {
    width: var(--ap-sidebar-w);
    position: fixed;
    inset: 0 auto 0 0;
    background: var(--ap-bg-sidebar);
    border-right: 1px solid var(--ap-border);
    display: flex;
    flex-direction: column;
    z-index: 100;
    transition: transform 0.25s ease;
  }
  .header {
    padding: 1.15rem 1.1rem;
    border-bottom: 1px solid var(--ap-border);
  }
  .header h3 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 800;
  }
  .sub,
  .user {
    margin: 0.25rem 0 0;
    font-size: 0.75rem;
    color: var(--ap-text-muted);
  }
  .nav {
    flex: 1;
    overflow-y: auto;
    padding: 0.55rem 0 1.25rem;
  }
  .nav-item {
    margin: 0.15rem 0.55rem;
    padding: 0.7rem 0.9rem;
    border-radius: 12px;
    display: flex;
    width: calc(100% - 1.1rem);
    color: var(--ap-text-secondary);
    font-weight: 500;
    font-size: 0.88rem;
    cursor: pointer;
    border: none;
    background: transparent;
    font-family: inherit;
    text-align: left;
  }
  .nav-item:hover {
    background: var(--ap-primary-soft);
    color: var(--ap-primary);
  }
  .nav-item.active {
    background: var(--ap-primary-soft);
    color: var(--ap-primary);
    border-left: 3px solid var(--ap-primary);
    font-weight: 600;
  }
  @media (max-width: 900px) {
    .sidebar {
      transform: translateX(-100%);
      width: min(300px, 88vw);
    }
    .sidebar.open {
      transform: translateX(0);
    }
  }
</style>
