<script lang="ts">
  import { onMount } from 'svelte';
  import '../infrastructure/ui/theme/tokens.css';
  import { AppShell, filterNavByViews, PLACEHOLDER_NAV } from '../infrastructure/ui/shell';
  import { Card, Button, Toast } from '../infrastructure/ui/shared';
  import { createAppContainer } from '../infrastructure/di';
  import { subscribeNetworkStatus } from '../infrastructure/data/http';
  import {
    applyTheme,
    readStoredTheme,
    toggleTheme,
    type ThemeMode,
  } from '../infrastructure/ui/theme/theme';
  import { getScreen, setScreen, subscribeScreen, screenTitle } from './navigation';
  import { createIdentityModule } from '../features/identity/di';
  import LoginScreen from '../features/identity/ui/screens/LoginScreen.svelte';
  import type { SessionState } from '../features/identity/ui/stores/sessionStore';

  const container = createAppContainer({
    apiBaseUrl: import.meta.env.VITE_API_BASE ?? '/api/v1',
  });
  const { sessionStore } = createIdentityModule(container);

  let activeId = $state(getScreen());
  let online = $state(true);
  let theme = $state<ThemeMode>('light');
  let toastMsg = $state('');
  let sessionState = $state<SessionState>(sessionStore.getState());

  const navItems = $derived(
    filterNavByViews(PLACEHOLDER_NAV, sessionState.session?.views ?? ['dashboard']),
  );

  const userLabel = $derived(
    sessionState.session
      ? `${sessionState.session.user.displayName} · ${sessionState.session.user.role}`
      : '',
  );

  const brandSubtitle = $derived(sessionState.session?.tenantName ?? 'Negocio');

  onMount(() => {
    theme = readStoredTheme(container.storage);
    applyTheme(theme, container.storage);

    const unsubNet = subscribeNetworkStatus((s) => {
      online = s.online;
    });
    const unsubScreen = subscribeScreen((id) => {
      activeId = id;
    });
    const unsubSession = sessionStore.subscribe((s) => {
      sessionState = s;
    });

    void sessionStore.bootstrap();

    return () => {
      unsubNet();
      unsubScreen();
      unsubSession();
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

  async function handleLogin(username: string, password: string) {
    try {
      await sessionStore.login(username, password);
      showToast('Sesión iniciada');
    } catch {
      /* error already in sessionState */
    }
  }

  async function handleLogout() {
    await sessionStore.logout();
    setScreen('home');
    showToast('Sesión cerrada');
  }
</script>

{#if sessionState.status === 'idle' || (sessionState.status === 'loading' && !sessionState.session)}
  <div class="boot">
    <p>Cargando…</p>
  </div>
{:else if sessionState.status === 'anonymous' || sessionState.status === 'error'}
  <LoginScreen
    loading={sessionState.status === 'loading'}
    error={sessionState.error}
    onSubmit={handleLogin}
  />
{:else if sessionState.status === 'authenticated' && sessionState.session}
  <AppShell
    {navItems}
    {activeId}
    pageTitle={screenTitle(activeId)}
    {online}
    brandTitle="ÁbacoPhy"
    {brandSubtitle}
    {userLabel}
    onNavigate={handleNavigate}
    onToggleTheme={handleTheme}
  >
    {#if activeId === 'home'}
      <Card>
        <h2 style="margin-top:0">Inicio</h2>
        <p style="color:var(--ap-text-secondary);font-size:0.9rem">
          Sesión activa. Fase 1 · identity lista. UI definitiva más adelante.
        </p>
        <p style="font-size:0.85rem;color:var(--ap-text-muted)">
          Vistas: {(sessionState.session.views ?? []).join(', ') || '—'}
        </p>
        <Button variant="secondary" onclick={handleLogout}>Salir</Button>
      </Card>
    {:else if activeId === 'demo-a'}
      <Card>
        <h2 style="margin-top:0">Pantalla A</h2>
        <p style="color:var(--ap-text-secondary)">Placeholder de navegación.</p>
      </Card>
    {:else}
      <Card>
        <h2 style="margin-top:0">Pantalla B</h2>
        <p style="color:var(--ap-text-secondary)">Placeholder de navegación.</p>
      </Card>
    {/if}
  </AppShell>
{/if}

<Toast message={toastMsg} visible={!!toastMsg} />

<style>
  .boot {
    min-height: 100dvh;
    display: grid;
    place-items: center;
    color: var(--ap-text-secondary);
  }
</style>
