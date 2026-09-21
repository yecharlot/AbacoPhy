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
    width: var(--sidebar-w, var(--ap-sidebar-w));
    position: fixed;
    inset: 0 auto 0 0;
    background: var(--ap-bg-sidebar);
    border-right: 1px solid var(--color-border, var(--ap-border));
    display: flex;
    flex-direction: column;
    z-index: 100;
    transition: transform 160ms ease-out;
  }
  .header {
    padding: 1.15rem 1rem;
    border-bottom: 1px solid var(--color-border, var(--ap-border));
  }
  .header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }
  .sub,
  .user {
    margin: 0.25rem 0 0;
    font-size: 0.75rem;
    color: var(--color-text-muted, var(--ap-text-muted));
  }
  .nav {
    flex: 1;
    overflow-y: auto;
    padding: 0.55rem 0 1.25rem;
  }
  .nav-item {
    margin: 0.15rem 0.45rem;
    padding: 0.7rem 0.95rem;
    border-radius: 999px;
    display: flex;
    width: calc(100% - 0.9rem);
    color: var(--color-text-secondary, var(--ap-text-secondary));
    font-weight: 500;
    font-size: 0.88rem;
    cursor: pointer;
    border: none;
    background: transparent;
    font-family: inherit;
    text-align: left;
  }
  .nav-item:hover {
    background: var(--color-surface-soft, var(--ap-primary-soft));
    color: var(--color-text-primary, var(--ap-text));
  }
  .nav-item.active {
    background: #f7f8fc;
    color: #0a1210;
    font-weight: 600;
  }
  :global([data-theme='light']) .nav-item.active {
    background: #12151f;
    color: #f7f8fc;
  }
  @media (max-width: 899px) {
    .sidebar {
      transform: translateX(-100%);
      width: min(300px, 88vw);
    }
    .sidebar.open {
      transform: translateX(0);
    }
  }
</style>
