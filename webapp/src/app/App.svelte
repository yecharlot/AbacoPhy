<script lang="ts">
  import { onMount } from 'svelte';
  import '../infrastructure/ui/theme/tokens.css';
  import { AppShell, filterNavByViews, PLACEHOLDER_NAV } from '../infrastructure/ui/shell';
  import { Card, Button, Toast } from '../infrastructure/ui/shared';
  import { createAppContainer } from '../infrastructure/di';
  import { subscribeNetworkStatus } from '../infrastructure/data/http';
  import { applyTheme, readStoredTheme, toggleTheme, type ThemeMode } from '../infrastructure/ui/theme/theme';
  import { getScreen, setScreen, subscribeScreen, screenTitle } from './navigation';

  const container = createAppContainer({
    apiBaseUrl: import.meta.env.VITE_API_BASE ?? '/api/v1',
  });

  let activeId = $state(getScreen());
  let online = $state(true);
  let theme = $state<ThemeMode>('light');
  let toastMsg = $state('');

  // Phase 0: mock views so sidebar shows dashboard + demos
  const mockViews = ['dashboard'];

  const navItems = $derived(filterNavByViews(PLACEHOLDER_NAV, mockViews));

  onMount(() => {
    theme = readStoredTheme(container.storage);
    applyTheme(theme, container.storage);

    const unsubNet = subscribeNetworkStatus((s) => {
      online = s.online;
    });
    const unsubScreen = subscribeScreen((id) => {
      activeId = id;
    });

    return () => {
      unsubNet();
      unsubScreen();
    };
  });

  function handleNavigate(id: string) {
    setScreen(id);
  }

  function handleTheme() {
    theme = toggleTheme(theme, container.storage);
  }

  function showToast(msg: string) {
    toastMsg = msg;
    setTimeout(() => {
      toastMsg = '';
    }, 2500);
  }
</script>

<AppShell
  {navItems}
  {activeId}
  pageTitle={screenTitle(activeId)}
  {online}
  brandTitle="ÁbacoPhy"
  brandSubtitle="Fase 0 · shell"
  userLabel="(sin sesión)"
  onNavigate={handleNavigate}
  onToggleTheme={handleTheme}
>
  {#if activeId === 'home'}
    <Card>
      <h2 style="margin-top:0">Infrastructure lista</h2>
      <p style="color:var(--ap-text-secondary);font-size:0.9rem">
        HTTP client, storage, theme, shared UI y shell. Siguiente: feature
        <strong>identity</strong>.
      </p>
      <Button onclick={() => showToast('Container HTTP listo')}>Probar toast</Button>
    </Card>
  {:else if activeId === 'demo-a'}
    <Card>
      <h2 style="margin-top:0">Pantalla A</h2>
      <p style="color:var(--ap-text-secondary)">Navegación mínima (sin router library).</p>
    </Card>
  {:else}
    <Card>
      <h2 style="margin-top:0">Pantalla B</h2>
      <p style="color:var(--ap-text-secondary)">Segunda ruta dummy para smoke del shell.</p>
    </Card>
  {/if}
</AppShell>

<Toast message={toastMsg} visible={!!toastMsg} />
