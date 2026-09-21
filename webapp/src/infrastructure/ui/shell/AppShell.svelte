<script lang="ts">
  import Sidebar from './Sidebar.svelte';
  import Topbar from './Topbar.svelte';
  import type { NavItem } from './navTypes';

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

  let sidebarOpen = $state(false);
</script>

<div class="shell">
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="overlay"
    class:on={sidebarOpen}
    on:click={() => (sidebarOpen = false)}
  ></div>
  <Sidebar
    items={navItems}
    {activeId}
    title={brandTitle}
    subtitle={brandSubtitle}
    {userLabel}
    open={sidebarOpen}
    onNavigate={(id) => onNavigate?.(id)}
    onClose={() => (sidebarOpen = false)}
  />
  <div class="main">
    <Topbar
      title={pageTitle}
      {online}
      onMenu={() => (sidebarOpen = !sidebarOpen)}
      {onToggleTheme}
    />
    <div class="content">
      {#if children}
        {@render children()}
      {/if}
    </div>
  </div>
</div>

<style>
  .shell {
    min-height: 100dvh;
  }
  .overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 90;
  }
  .overlay.on {
    display: block;
  }
  .main {
    margin-left: var(--ap-sidebar-w);
    padding: 1.25rem;
    min-height: 100dvh;
  }
  @media (max-width: 900px) {
    .main {
      margin-left: 0;
      padding: 1rem;
    }
  }
</style>
