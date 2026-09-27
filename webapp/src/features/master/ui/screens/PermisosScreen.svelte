<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card } from '../../../../infrastructure/ui/shared';
  import type { MasterStore, MasterState } from '../stores/masterStore';
  import {
    UI_SCREEN_CATALOG,
    ROLE_DEFAULT_SCREENS,
    defaultScreensForRole,
    type UiAccessConfig,
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
  let savedPulse = false;

  const manageRoles = Object.keys(ROLE_DEFAULT_SCREENS).filter((r) => r !== 'master');

  /** Agrupa pantallas para una UI más escaneable. */
  const SCREEN_GROUPS: { id: string; label: string; ids: string[] }[] = [
    {
      id: 'panel',
      label: 'Panel e informes',
      ids: ['dashboard', 'reportes', 'cuentas', 'ingresos', 'gastos'],
    },
    {
      id: 'ops',
      label: 'Operaciones',
      ids: ['almacen', 'recepcion', 'transferencias', 'pos', 'catalog'],
    },
    {
      id: 'cost',
      label: 'Costos y precios',
      ids: ['fichas-costo', 'fichas-precio'],
    },
    {
      id: 'hr',
      label: 'Personal y facturación',
      ids: ['empleados', 'liquidaciones', 'facturas'],
    },
    {
      id: 'commerce',
      label: 'Comercio',
      ids: ['pedidos'],
    },
    {
      id: 'admin',
      label: 'Administración',
      ids: ['tenant', 'usuarios', 'permisos', 'traza', 'salvas', 'master'],
    },
  ];

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
  $: selectedCount =
    tab === 'roles' ? roleScreenSet.size : userScreenSet.size;
  $: defaultCount = defaultScreensForRole(selectedRole).length;
  $: isCustomRole =
    tab === 'roles' &&
    !!config.roleScreens[selectedRole]?.length &&
    JSON.stringify([...(config.roleScreens[selectedRole] || [])].sort()) !==
      JSON.stringify([...defaultScreensForRole(selectedRole)].sort());

  function catalogLabel(id: string): string {
    return UI_SCREEN_CATALOG.find((s) => s.id === id)?.label || id;
  }

  function screensInGroup(groupIds: string[], hideMaster: boolean): string[] {
    return groupIds.filter((id) => {
      if (hideMaster && id === 'master') return false;
      return UI_SCREEN_CATALOG.some((s) => s.id === id);
    });
  }

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
      screens: [] as string[],
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
    const prev = config.userAccess[selectedUserId] || { mode, screens: [] as string[] };
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
      notice = 'Permisos guardados en este navegador. Recarga o vuelve a entrar para aplicarlos.';
      savedPulse = true;
      setTimeout(() => {
        savedPulse = false;
      }, 1200);
    } catch (e) {
      error = e instanceof Error ? e.message : 'No se pudo guardar';
    }
  }
</script>

<section class="permisos" data-screen="permisos">
  <header class="hero">
    <div class="hero-glow" aria-hidden="true"></div>
    <div class="hero-text">
      <p class="eyebrow">Control de acceso · cliente</p>
      <h1>Permisos de interfaz</h1>
      <p class="lede">
        Define qué pantallas ve cada rol y excepciones por usuario. No modifica el ViewACL del
        servidor; solo la UI de este negocio en el cliente.
      </p>
    </div>
    <div class="hero-stats">
      <div class="stat">
        <span class="stat-val">{selectedCount}</span>
        <span class="stat-lbl">pantallas activas</span>
      </div>
      {#if tab === 'roles'}
        <div class="stat">
          <span class="stat-val">{defaultCount}</span>
          <span class="stat-lbl">default del rol</span>
        </div>
        {#if isCustomRole}
          <span class="pill-warn">personalizado</span>
        {/if}
      {/if}
    </div>
  </header>

  <div class="seg" role="tablist" aria-label="Modo de edición">
    <button
      type="button"
      role="tab"
      class:active={tab === 'roles'}
      aria-selected={tab === 'roles'}
      on:click={() => (tab = 'roles')}
    >
      <span class="seg-dot"></span>
      Por rol
    </button>
    <button
      type="button"
      role="tab"
      class:active={tab === 'users'}
      aria-selected={tab === 'users'}
      on:click={() => (tab = 'users')}
    >
      <span class="seg-dot"></span>
      Por usuario
    </button>
  </div>

  {#if tab === 'roles'}
    <Card>
      <div class="panel-head">
        <div>
          <h2 class="panel-title">Matriz por rol</h2>
          <p class="panel-sub">Elija un rol y marque las pantallas visibles en el menú.</p>
        </div>
        <button type="button" class="ghost-btn" on:click={resetRoleToDefault}>
          Restaurar default
        </button>
      </div>

      <div class="role-chips" role="listbox" aria-label="Roles">
        {#each manageRoles as r}
          <button
            type="button"
            class="role-chip"
            class:on={selectedRole === r}
            role="option"
            aria-selected={selectedRole === r}
            on:click={() => (selectedRole = r)}
          >
            {roleLabel(r)}
          </button>
        {/each}
      </div>

      <p class="default-hint">
        Default de producto para <strong>{roleLabel(selectedRole)}</strong>:
        {#if defaultScreensForRole(selectedRole).length}
          {defaultScreensForRole(selectedRole).map(catalogLabel).join(' · ')}
        {:else}
          ninguna
        {/if}
      </p>

      {#each SCREEN_GROUPS as group (group.id)}
        {@const ids = screensInGroup(group.ids, true)}
        {#if ids.length}
          <div class="group">
            <h3 class="group-title">{group.label}</h3>
            <div class="tile-grid">
              {#each ids as sid (sid)}
                <button
                  type="button"
                  class="tile"
                  class:on={roleScreenSet.has(sid)}
                  aria-pressed={roleScreenSet.has(sid)}
                  on:click={() => toggleRoleScreen(sid)}
                >
                  <span class="tile-check" aria-hidden="true"></span>
                  <span class="tile-body">
                    <span class="tile-label">{catalogLabel(sid)}</span>
                    <span class="tile-id">{sid}</span>
                  </span>
                </button>
              {/each}
            </div>
          </div>
        {/if}
      {/each}
    </Card>
  {:else}
    <Card>
      <div class="panel-head">
        <div>
          <h2 class="panel-title">Excepciones por usuario</h2>
          <p class="panel-sub">
            Acceso especial fuera (o dentro) del paquete del rol. Opcional.
          </p>
        </div>
      </div>

      <div class="user-row">
        <label class="field">
          <span class="field-lbl">Usuario</span>
          <select class="sel" bind:value={selectedUserId}>
            <option value="">— Elija un usuario —</option>
            {#each state.users.filter((u) => u.role !== 'master') as u (u.id)}
              <option value={u.id}>
                {u.displayName || u.username} · {roleLabel(u.role)}
              </option>
            {/each}
          </select>
        </label>

        {#if selectedUserId}
          <label class="field grow">
            <span class="field-lbl">Modo</span>
            <select
              class="sel"
              value={userMode}
              on:change={(e) =>
                setUserMode(e.currentTarget.value === 'extra' ? 'extra' : 'replace')}
            >
              <option value="replace">Solo estas pantallas (reemplaza el rol)</option>
              <option value="extra">Estas + las del rol (acceso especial)</option>
            </select>
          </label>
          <button type="button" class="ghost-btn danger" on:click={clearUserOverride}>
            Quitar excepción
          </button>
        {/if}
      </div>

      {#if selectedUserId}
        {#each SCREEN_GROUPS as group (group.id)}
          {@const ids = screensInGroup(group.ids, true)}
          {#if ids.length}
            <div class="group">
              <h3 class="group-title">{group.label}</h3>
              <div class="tile-grid">
                {#each ids as sid (sid)}
                  <button
                    type="button"
                    class="tile"
                    class:on={userScreenSet.has(sid)}
                    aria-pressed={userScreenSet.has(sid)}
                    on:click={() => toggleUserScreen(sid)}
                  >
                    <span class="tile-check" aria-hidden="true"></span>
                    <span class="tile-body">
                      <span class="tile-label">{catalogLabel(sid)}</span>
                      <span class="tile-id">{sid}</span>
                    </span>
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        {/each}
      {:else}
        <div class="empty">
          <p>Seleccione un usuario para asignar pantallas fuera de su rol.</p>
        </div>
      {/if}
    </Card>
  {/if}

  <footer class="footer" class:pulse={savedPulse}>
    <div class="footer-msg">
      {#if notice}<p class="ok">{notice}</p>{/if}
      {#if error}<p class="err">{error}</p>{/if}
      {#if !notice && !error}
        <p class="muted">Los cambios se guardan en este navegador (política UI local).</p>
      {/if}
    </div>
    <Button type="button" on:click={save}>Guardar permisos UI</Button>
  </footer>
</section>

<style>
  .permisos {
    max-width: 1100px;
    margin: 0 auto;
    padding-bottom: 5rem;
  }

  /* —— Hero —— */
  .hero {
    position: relative;
    overflow: hidden;
    border-radius: var(--radius-xl, 28px);
    border: 1px solid var(--color-border, var(--ap-border));
    background:
      linear-gradient(
        145deg,
        color-mix(in srgb, var(--color-surface, #171b29) 92%, var(--accent-cyan, #61e6e1) 8%) 0%,
        var(--color-surface, #171b29) 55%,
        color-mix(in srgb, var(--color-surface, #171b29) 90%, var(--accent-purple, #9c82ff) 10%) 100%
      );
    padding: 1.35rem 1.5rem 1.4rem;
    margin-bottom: 1.1rem;
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    align-items: flex-end;
    justify-content: space-between;
  }
  .hero-glow {
    position: absolute;
    inset: -40% -20% auto auto;
    width: 280px;
    height: 280px;
    background: radial-gradient(
      circle,
      color-mix(in srgb, var(--accent-cyan, #61e6e1) 35%, transparent) 0%,
      transparent 70%
    );
    pointer-events: none;
  }
  .hero-text {
    position: relative;
    max-width: 36rem;
  }
  .eyebrow {
    margin: 0 0 0.35rem;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--accent-cyan, #61e6e1);
  }
  .hero h1 {
    margin: 0 0 0.4rem;
    font-size: clamp(1.25rem, 2.5vw, 1.55rem);
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--color-text-primary, var(--ap-text));
  }
  .lede {
    margin: 0;
    font-size: 0.88rem;
    line-height: 1.45;
    color: var(--color-text-secondary, var(--ap-text-secondary));
  }
  .hero-stats {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
  }
  .stat {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    min-width: 4.5rem;
    padding: 0.45rem 0.75rem;
    border-radius: 14px;
    background: color-mix(in srgb, var(--color-bg, #050812) 55%, transparent);
    border: 1px solid var(--color-border, var(--ap-border));
  }
  .stat-val {
    font-size: 1.35rem;
    font-weight: 700;
    line-height: 1.1;
    background: var(--gradient-hero, linear-gradient(135deg, #61e6e1, #b7f56a));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .stat-lbl {
    font-size: 0.68rem;
    color: var(--color-text-muted, var(--ap-text-muted));
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .pill-warn {
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.28rem 0.65rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent-yellow, #ffe35a) 18%, transparent);
    color: var(--accent-yellow, #ffe35a);
    border: 1px solid color-mix(in srgb, var(--accent-yellow, #ffe35a) 35%, transparent);
  }

  /* —— Segmented tabs —— */
  .seg {
    display: inline-flex;
    gap: 0.25rem;
    padding: 0.28rem;
    margin-bottom: 1rem;
    border-radius: 999px;
    background: var(--color-surface, var(--ap-bg-elevated));
    border: 1px solid var(--color-border, var(--ap-border));
  }
  .seg button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    border: none;
    background: transparent;
    color: var(--color-text-secondary, var(--ap-text-secondary));
    font: inherit;
    font-size: 0.88rem;
    font-weight: 600;
    padding: 0.48rem 1.05rem;
    border-radius: 999px;
    cursor: pointer;
    transition:
      background 160ms ease,
      color 160ms ease,
      box-shadow 160ms ease;
  }
  .seg button:hover {
    color: var(--color-text-primary, var(--ap-text));
  }
  .seg button.active {
    background: var(--gradient-primary-btn, linear-gradient(135deg, #61e6e1, #b7f56a));
    color: #0a1210;
    box-shadow: 0 6px 20px color-mix(in srgb, var(--accent-cyan, #61e6e1) 28%, transparent);
  }
  .seg-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.55;
  }
  .seg button.active .seg-dot {
    opacity: 1;
  }

  /* —— Panel —— */
  .panel-head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
  .panel-title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .panel-sub {
    margin: 0.25rem 0 0;
    font-size: 0.84rem;
    color: var(--color-text-secondary, var(--ap-text-secondary));
  }
  .ghost-btn {
    border: 1px solid var(--color-border, var(--ap-border));
    background: transparent;
    color: var(--color-text-secondary, var(--ap-text-secondary));
    font: inherit;
    font-size: 0.8rem;
    font-weight: 600;
    padding: 0.4rem 0.85rem;
    border-radius: 999px;
    cursor: pointer;
    transition:
      border-color 140ms ease,
      color 140ms ease,
      background 140ms ease;
  }
  .ghost-btn:hover {
    border-color: color-mix(in srgb, var(--accent-cyan, #61e6e1) 45%, transparent);
    color: var(--color-text-primary, var(--ap-text));
    background: color-mix(in srgb, var(--accent-cyan, #61e6e1) 8%, transparent);
  }
  .ghost-btn.danger:hover {
    border-color: color-mix(in srgb, var(--accent-red, #f17b7b) 50%, transparent);
    color: var(--accent-red, #f17b7b);
    background: color-mix(in srgb, var(--accent-red, #f17b7b) 10%, transparent);
  }

  /* —— Role chips —— */
  .role-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin-bottom: 0.9rem;
  }
  .role-chip {
    border: 1px solid var(--color-border, var(--ap-border));
    background: color-mix(in srgb, var(--color-bg, #050812) 40%, transparent);
    color: var(--color-text-secondary, var(--ap-text-secondary));
    font: inherit;
    font-size: 0.82rem;
    font-weight: 600;
    padding: 0.42rem 0.9rem;
    border-radius: 999px;
    cursor: pointer;
    transition:
      transform 140ms ease,
      border-color 140ms ease,
      background 140ms ease,
      color 140ms ease,
      box-shadow 140ms ease;
  }
  .role-chip:hover {
    color: var(--color-text-primary, var(--ap-text));
    border-color: color-mix(in srgb, var(--accent-cyan, #61e6e1) 40%, transparent);
  }
  .role-chip.on {
    color: #0a1210;
    border-color: transparent;
    background: var(--gradient-primary-btn, linear-gradient(135deg, #61e6e1, #b7f56a));
    box-shadow: 0 4px 16px color-mix(in srgb, var(--accent-cyan, #61e6e1) 25%, transparent);
    transform: translateY(-1px);
  }

  .default-hint {
    margin: 0 0 1.1rem;
    padding: 0.65rem 0.85rem;
    border-radius: 12px;
    font-size: 0.8rem;
    line-height: 1.4;
    color: var(--color-text-secondary, var(--ap-text-secondary));
    background: color-mix(in srgb, var(--color-bg, #050812) 50%, transparent);
    border: 1px dashed var(--color-border, var(--ap-border));
  }
  .default-hint strong {
    color: var(--color-text-primary, var(--ap-text));
  }

  /* —— Groups + tiles —— */
  .group {
    margin-bottom: 1.15rem;
  }
  .group:last-child {
    margin-bottom: 0.25rem;
  }
  .group-title {
    margin: 0 0 0.55rem;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--color-text-muted, var(--ap-text-muted));
  }
  .tile-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
    gap: 0.5rem;
  }
  .tile {
    display: flex;
    align-items: flex-start;
    gap: 0.55rem;
    text-align: left;
    border: 1px solid var(--color-border, var(--ap-border));
    background: color-mix(in srgb, var(--color-bg, #050812) 35%, transparent);
    border-radius: 14px;
    padding: 0.65rem 0.7rem;
    cursor: pointer;
    font: inherit;
    color: inherit;
    transition:
      border-color 150ms ease,
      background 150ms ease,
      box-shadow 150ms ease,
      transform 150ms ease;
  }
  .tile:hover {
    border-color: color-mix(in srgb, var(--accent-cyan, #61e6e1) 40%, transparent);
    transform: translateY(-1px);
  }
  .tile.on {
    border-color: color-mix(in srgb, var(--accent-cyan, #61e6e1) 55%, transparent);
    background: color-mix(in srgb, var(--accent-cyan, #61e6e1) 12%, transparent);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent-cyan, #61e6e1) 20%, transparent);
  }
  .tile-check {
    flex-shrink: 0;
    width: 1.05rem;
    height: 1.05rem;
    margin-top: 0.1rem;
    border-radius: 6px;
    border: 1.5px solid var(--color-border, var(--ap-border));
    background: transparent;
    position: relative;
    transition:
      background 140ms ease,
      border-color 140ms ease;
  }
  .tile.on .tile-check {
    border-color: transparent;
    background: var(--gradient-primary-btn, linear-gradient(135deg, #61e6e1, #b7f56a));
  }
  .tile.on .tile-check::after {
    content: '';
    position: absolute;
    left: 0.28rem;
    top: 0.1rem;
    width: 0.28rem;
    height: 0.5rem;
    border: solid #0a1210;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }
  .tile-body {
    display: flex;
    flex-direction: column;
    gap: 0.12rem;
    min-width: 0;
  }
  .tile-label {
    font-size: 0.86rem;
    font-weight: 600;
    color: var(--color-text-primary, var(--ap-text));
    line-height: 1.25;
  }
  .tile-id {
    font-size: 0.68rem;
    font-family: ui-monospace, monospace;
    color: var(--color-text-muted, var(--ap-text-muted));
  }

  /* —— User row —— */
  .user-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: flex-end;
    margin-bottom: 1.1rem;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    min-width: 14rem;
  }
  .field.grow {
    flex: 1;
    min-width: 16rem;
  }
  .field-lbl {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-muted, var(--ap-text-muted));
  }
  .sel {
    width: 100%;
    padding: 0.55rem 0.75rem;
    border-radius: 12px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: var(--color-surface, var(--ap-bg-elevated));
    color: var(--color-text-primary, var(--ap-text));
    font: inherit;
    font-size: 0.9rem;
  }

  .empty {
    padding: 1.5rem 1rem;
    text-align: center;
    border-radius: 16px;
    border: 1px dashed var(--color-border, var(--ap-border));
    color: var(--color-text-secondary, var(--ap-text-secondary));
    font-size: 0.9rem;
  }

  /* —— Footer —— */
  .footer {
    position: sticky;
    bottom: 0.75rem;
    z-index: 5;
    margin-top: 1.25rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.85rem 1rem;
    border-radius: 18px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: color-mix(in srgb, var(--color-surface, #171b29) 92%, transparent);
    backdrop-filter: blur(12px);
    box-shadow: var(--shadow-float, 0 20px 60px rgba(0, 0, 0, 0.28));
  }
  .footer.pulse {
    border-color: color-mix(in srgb, var(--accent-green, #b7f56a) 50%, transparent);
    box-shadow:
      var(--shadow-float, 0 20px 60px rgba(0, 0, 0, 0.28)),
      0 0 0 1px color-mix(in srgb, var(--accent-green, #b7f56a) 30%, transparent);
  }
  .footer-msg {
    flex: 1;
    min-width: 12rem;
  }
  .footer-msg p {
    margin: 0;
    font-size: 0.84rem;
  }
  .muted {
    color: var(--color-text-muted, var(--ap-text-muted));
  }
  .ok {
    color: var(--accent-green, #b7f56a);
  }
  .err {
    color: var(--accent-red, #f17b7b);
  }

  @media (max-width: 640px) {
    .hero {
      padding: 1.1rem;
    }
    .stat {
      align-items: flex-start;
    }
    .tile-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
