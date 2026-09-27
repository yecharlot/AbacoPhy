<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card } from '../../../../infrastructure/ui/shared';
  import type { MasterStore, MasterState } from '../stores/masterStore';
  import {
    UI_SCREEN_CATALOG,
    ROLE_DEFAULT_SCREENS,
    defaultScreensForRole,
    type UiAccessConfig,
    type UserUiAccess,
  } from '../../../identity/domain/uiAccessPolicy';
  import {
    loadUiAccessConfig,
    saveUiAccessConfig,
  } from '../../../identity/domain/uiAccessStorage';
  import { roleLabel } from '../../domain/entities/roles';

  export let store: MasterStore;
  export let tenantId: string = '';

  let state: MasterState = store.getState();
  let config: UiAccessConfig = loadUiAccessConfig(tenantId);
  let tab: 'roles' | 'users' = 'roles';
  let selectedRole = 'vendedor';
  let selectedUserId = '';
  let notice = '';
  let error = '';

  const manageRoles = Object.keys(ROLE_DEFAULT_SCREENS).filter((r) => r !== 'master');

  onMount(() => {
    const unsub = store.subscribe((s) => {
      state = s;
    });
    void store.loadAll();
    config = loadUiAccessConfig(tenantId);
    return unsub;
  });

  $: roleScreenSet = new Set(
    config.roleScreens[selectedRole]?.length
      ? config.roleScreens[selectedRole]
      : defaultScreensForRole(selectedRole),
  );

  $: userAccess = (selectedUserId && config.userAccess[selectedUserId]) || null;
  $: userMode = userAccess?.mode ?? 'replace';
  $: userScreenSet = new Set(userAccess?.screens ?? []);

  function toggleRoleScreen(screenId: string) {
    const current = new Set(
      config.roleScreens[selectedRole]?.length
        ? config.roleScreens[selectedRole]
        : defaultScreensForRole(selectedRole),
    );
    if (current.has(screenId)) current.delete(screenId);
    else current.add(screenId);
    config = {
      ...config,
      roleScreens: {
        ...config.roleScreens,
        [selectedRole]: [...current],
      },
    };
  }

  function resetRoleToDefault() {
    const next = { ...config.roleScreens };
    delete next[selectedRole];
    config = { ...config, roleScreens: next };
  }

  function toggleUserScreen(screenId: string) {
    if (!selectedUserId) return;
    const prev = config.userAccess[selectedUserId] || {
      mode: 'replace' as const,
      screens: [],
    };
    const set = new Set(prev.screens);
    if (set.has(screenId)) set.delete(screenId);
    else set.add(screenId);
    config = {
      ...config,
      userAccess: {
        ...config.userAccess,
        [selectedUserId]: { mode: prev.mode, screens: [...set] },
      },
    };
  }

  function setUserMode(mode: 'replace' | 'extra') {
    if (!selectedUserId) return;
    const prev = config.userAccess[selectedUserId] || { mode, screens: [] };
    config = {
      ...config,
      userAccess: {
        ...config.userAccess,
        [selectedUserId]: { ...prev, mode },
      },
    };
  }

  function clearUserOverride() {
    if (!selectedUserId) return;
    const next = { ...config.userAccess };
    delete next[selectedUserId];
    config = { ...config, userAccess: next };
  }

  function save() {
    notice = '';
    error = '';
    try {
      saveUiAccessConfig(tenantId, config);
      notice =
        'Permisos UI guardados en este navegador. El usuario verá los cambios en el próximo inicio de sesión o al recargar.';
    } catch (e) {
      error = e instanceof Error ? e.message : 'No se pudo guardar';
    }
  }
</script>

<section class="permisos" data-screen="permisos">
  <header class="head">
    <h1>Permisos de interfaz</h1>
    <p class="muted">
      Controla qué pantallas ve cada rol y excepciones por usuario. No modifica el ViewACL del
      servidor; solo la UI de este negocio en el cliente.
    </p>
  </header>

  <div class="tabs">
    <button type="button" class:active={tab === 'roles'} on:click={() => (tab = 'roles')}>
      Por rol
    </button>
    <button type="button" class:active={tab === 'users'} on:click={() => (tab = 'users')}>
      Por usuario
    </button>
  </div>

  {#if tab === 'roles'}
    <Card>
      <div class="row">
        <label class="lbl" for="role-sel">Rol</label>
        <select id="role-sel" class="sel" bind:value={selectedRole}>
          {#each manageRoles as r}
            <option value={r}>{roleLabel(r)}</option>
          {/each}
        </select>
        <Button type="button" variant="secondary" on:click={resetRoleToDefault}>
          Restaurar default del rol
        </Button>
      </div>
      <p class="muted small">
        Default de producto:
        {(ROLE_DEFAULT_SCREENS[selectedRole] || []).join(', ') || '—'}. Marque las pantallas
        visibles para este rol.
      </p>
      <ul class="checks">
        {#each UI_SCREEN_CATALOG as screen (screen.id)}
          {#if screen.id !== 'master' || selectedRole === 'admin'}
            <li>
              <label>
                <input
                  type="checkbox"
                  checked={roleScreenSet.has(screen.id)}
                  on:change={() => toggleRoleScreen(screen.id)}
                />
                <span>{screen.label} <code>{screen.id}</code></span>
              </label>
            </li>
          {/if}
        {/each}
      </ul>
    </Card>
  {:else}
    <Card>
      <div class="row">
        <label class="lbl" for="user-sel">Usuario</label>
        <select id="user-sel" class="sel" bind:value={selectedUserId}>
          <option value="">— Elija —</option>
          {#each state.users.filter((u) => u.role !== 'master') as u (u.id)}
            <option value={u.id}>
              {u.displayName || u.username} ({roleLabel(u.role)})
            </option>
          {/each}
        </select>
      </div>
      {#if selectedUserId}
        <div class="row">
          <label class="lbl">Modo</label>
          <select
            class="sel"
            value={userMode}
            on:change={(e) => setUserMode(e.currentTarget.value === 'extra' ? 'extra' : 'replace')}
          >
            <option value="replace">Solo estas pantallas (reemplaza el rol)</option>
            <option value="extra">Estas + las del rol (acceso especial)</option>
          </select>
          <Button type="button" variant="secondary" on:click={clearUserOverride}>
            Quitar excepción
          </Button>
        </div>
        <ul class="checks">
          {#each UI_SCREEN_CATALOG as screen (screen.id)}
            {#if screen.id !== 'master'}
              <li>
                <label>
                  <input
                    type="checkbox"
                    checked={userScreenSet.has(screen.id)}
                    on:change={() => toggleUserScreen(screen.id)}
                  />
                  <span>{screen.label}</span>
                </label>
              </li>
            {/if}
          {/each}
        </ul>
      {:else}
        <p class="muted">Seleccione un usuario para asignar pantallas fuera (o dentro) de su rol.</p>
      {/if}
    </Card>
  {/if}

  {#if notice}<p class="ok">{notice}</p>{/if}
  {#if error}<p class="err">{error}</p>{/if}
  <Button type="button" on:click={save}>Guardar permisos UI</Button>
</section>

<style>
  .head h1 {
    margin: 0 0 0.35rem;
    font-size: 1.25rem;
  }
  .muted {
    color: var(--ap-text-secondary);
    font-size: 0.9rem;
  }
  .small {
    font-size: 0.82rem;
  }
  .tabs {
    display: flex;
    gap: 0.5rem;
    margin: 1rem 0;
  }
  .tabs button {
    border: 1px solid var(--ap-border);
    background: var(--ap-bg-elevated);
    color: var(--ap-text);
    border-radius: 999px;
    padding: 0.4rem 0.9rem;
    cursor: pointer;
  }
  .tabs button.active {
    background: var(--ap-primary, #61e6e1);
    color: #0a1210;
    border-color: transparent;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    align-items: center;
    margin-bottom: 0.75rem;
  }
  .lbl {
    font-size: 0.78rem;
    font-weight: 600;
  }
  .sel {
    min-width: 12rem;
    padding: 0.5rem 0.65rem;
    border-radius: 10px;
    border: 1px solid var(--ap-border);
    background: var(--ap-bg-elevated);
    color: var(--ap-text);
  }
  .checks {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 0.35rem;
  }
  .checks label {
    display: flex;
    gap: 0.45rem;
    align-items: flex-start;
    font-size: 0.88rem;
  }
  code {
    font-size: 0.72rem;
    opacity: 0.65;
  }
  .ok {
    color: var(--ap-success, #b7f56a);
  }
  .err {
    color: var(--ap-danger, #e57373);
  }
</style>
