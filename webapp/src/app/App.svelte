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
  import { createTenantModule } from '../features/tenant/di';
  import { createCatalogModule } from '../features/catalog/di/catalogModule';
  import { createAccountingModule } from '../features/accounting/di/accountingModule';
  import { createInvoicingModule } from '../features/invoicing/di/invoicingModule';
  import { createPayrollModule } from '../features/payroll/di/payrollModule';
  import LoginScreen from '../features/identity/ui/screens/LoginScreen.svelte';
  import TenantScreen from '../features/tenant/ui/screens/TenantScreen.svelte';
  import CatalogScreen from '../features/catalog/ui/screens/CatalogScreen.svelte';
  import DashboardScreen from '../features/accounting/ui/screens/DashboardScreen.svelte';
  import IngresosScreen from '../features/accounting/ui/screens/IngresosScreen.svelte';
  import GastosScreen from '../features/accounting/ui/screens/GastosScreen.svelte';
  import CuentasScreen from '../features/accounting/ui/screens/CuentasScreen.svelte';
  import ReportesScreen from '../features/accounting/ui/screens/ReportesScreen.svelte';
  import FacturasScreen from '../features/invoicing/ui/screens/FacturasScreen.svelte';
  import EmpleadosScreen from '../features/payroll/ui/screens/EmpleadosScreen.svelte';
  import LiquidacionesScreen from '../features/payroll/ui/screens/LiquidacionesScreen.svelte';
  import type { SessionState } from '../features/identity/ui/stores/sessionStore';

  const container = createAppContainer({
    apiBaseUrl: import.meta.env.VITE_API_BASE ?? '/api/v1',
  });
  const { sessionStore } = createIdentityModule(container);
  const { tenantStore } = createTenantModule(container);
  const { catalogStore } = createCatalogModule(container);
  const { accountingStore } = createAccountingModule(container);
  const { invoicingStore } = createInvoicingModule(container);
  const { payrollStore } = createPayrollModule(container);

  let activeId = $state(getScreen());
  let online = $state(true);
  let theme: ThemeMode = $state('light');
  let toastMsg = $state('');
  let sessionState: SessionState = $state(sessionStore.getState());
  let loginAttempted = $state(false);

  const navItems = $derived(
    filterNavByViews(PLACEHOLDER_NAV, sessionState.session?.views ?? null),
  );

  const userLabel = $derived(
    sessionState.session
      ? `${sessionState.session.user.displayName} · ${sessionState.session.user.role}`
      : '',
  );

  const brandSubtitle = $derived(sessionState.session?.tenantName ?? 'Negocio');

  const canEditTenant = $derived(
    (sessionState.session?.views ?? []).includes('tenant'),
  );

  const isAuthenticated = $derived(
    sessionState.status === 'authenticated' && sessionState.session !== null,
  );

  /** Initial bootstrap only (not login-in-progress) */
  const isBooting = $derived(
    sessionState.status === 'idle' ||
      (sessionState.status === 'loading' &&
        sessionState.session === null &&
        sessionState.error === null &&
        !loginAttempted),
  );

  const loginLoading = $derived(sessionState.status === 'loading' && loginAttempted);

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
    loginAttempted = true;
    try {
      await sessionStore.login(username, password);
      showToast('Sesión iniciada');
    } catch {
      /* error in sessionState */
    }
  }

  async function handleLogout() {
    await sessionStore.logout();
    loginAttempted = false;
    setScreen('home');
    showToast('Sesión cerrada');
  }
</script>

{#if isAuthenticated && sessionState.session}
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
    {#if activeId === 'dashboard' || activeId === 'home'}
      <DashboardScreen store={accountingStore} />
    {:else if activeId === 'ingresos'}
      <IngresosScreen store={accountingStore} />
    {:else if activeId === 'gastos'}
      <GastosScreen store={accountingStore} />
    {:else if activeId === 'cuentas'}
      <CuentasScreen store={accountingStore} />
    {:else if activeId === 'reportes'}
      <ReportesScreen />
    {:else if activeId === 'facturas'}
      <FacturasScreen store={invoicingStore} />
    {:else if activeId === 'empleados'}
      <EmpleadosScreen store={payrollStore} />
    {:else if activeId === 'liquidaciones'}
      <LiquidacionesScreen store={payrollStore} />
    {:else if activeId === 'tenant'}
      <TenantScreen store={tenantStore} canEdit={canEditTenant} />
    {:else if activeId === 'catalog'}
      <CatalogScreen store={catalogStore} currencyCode="CUP" />
    {:else}
      <Card>
        <h2 style="margin-top:0">Inicio</h2>
        <p style="color:var(--ap-text-secondary);font-size:0.9rem">
          Sesión activa. Seleccione una opción del menú.
        </p>
        <Button variant="secondary" on:click={handleLogout}>Salir</Button>
      </Card>
    {/if}
  </AppShell>
{:else if isBooting}
  <div class="boot">
    <p>Cargando…</p>
  </div>
{:else}
  <LoginScreen
    loading={loginLoading}
    error={sessionState.error}
    onSubmit={handleLogin}
  />
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
