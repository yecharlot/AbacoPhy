<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card, Money } from '../../../../infrastructure/ui/shared';
  import type { PayrollStore, PayrollState } from '../stores/payrollStore';
  import type { MasterStore, MasterState } from '../../../master/ui/stores/masterStore';
  import type { WarehouseStore, WarehouseState } from '../../../warehouse/ui/stores/warehouseStore';
  import type { Employee } from '../../domain/entities/Employee';
  import type { JobPosition } from '../../domain/entities/JobPosition';
  import {
    CENTRAL_OFFICE_LABEL,
    mergeEmployeeMeta,
    parseEmployeeMeta,
    type LaborStatus,
  } from '../../domain/entities/employeeMeta';
  import { suggestAvailableUsernames } from '../../domain/services/usernameSuggestions';
  import {
    filterActivePositions,
    listJobPositions,
    saveJobPosition,
  } from '../../data/sources/positionsLocalSource';
  import { ASSIGNABLE_ROLES, roleLabel } from '../../../master/domain/entities/roles';

  export let store: PayrollStore;
  /** Usuarios / reset password (scope admin|master en backend). */
  export let masterStore: MasterStore | null = null;
  /** Puntos de venta del negocio. */
  export let warehouseStore: WarehouseStore | null = null;
  export let tenantId: string = '';
  /** Rol de la sesión (UI: mostrar reset solo admin/master). */
  export let sessionRole: string = '';

  let state: PayrollState = store.getState();
  let masterState: MasterState | null = masterStore ? masterStore.getState() : null;
  let warehouseState: WarehouseState | null = warehouseStore ? warehouseStore.getState() : null;

  // UI chrome
  /** Formulario inline (sin modal: evita recorte por chrome de la app). */
  let showForm = false;
  let showPositions = false;
  let formError = '';
  let formOk = '';
  let editingId: string | null = null;

  // Form fields
  let name = '';
  let ci = '';
  let positionId = '';
  let positionQuery = '';
  let department = '';
  let hireDate = new Date().toISOString().slice(0, 10);
  let salary = '';
  let currency = 'CUP';
  let unitId = ''; // opcional; vacío = Oficina Central
  let usernameOptions: string[] = [];
  let selectedUsername = '';
  let positionPickerOpen = false;
  let contactEmail = '';
  let avatarUrl = '';
  let avatarBroken = false;

  // Nomenclador cargos form
  let posName = '';
  let posRole = 'vendedor';
  let posError = '';
  let positions: JobPosition[] = [];

  // Listado por ubicación
  let openLocations: Record<string, boolean> = {};
  let locationFilters: Record<
    string,
    {
      name: string;
      ci: string;
      role: string;
      cargo: string;
      hireFrom: string;
      salaryMin: string;
      status: '' | LaborStatus | 'all_active';
    }
  > = {};

  const TEMP_PASSWORD = '123456';

  onMount(() => {
    const unsubs: Array<() => void> = [];
    unsubs.push(store.subscribe((s) => (state = s)));
    void store.loadEmployees();
    if (masterStore) {
      unsubs.push(masterStore.subscribe((s) => (masterState = s)));
      void masterStore.loadAll().catch(() => undefined);
    }
    if (warehouseStore) {
      unsubs.push(warehouseStore.subscribe((s) => (warehouseState = s)));
      void warehouseStore.loadAll?.().catch(() => undefined);
    }
    reloadPositions();
    return () => unsubs.forEach((u) => u());
  });

  $: units = (warehouseState?.units ?? []).filter((u) => u.active !== false);
  $: allEmployees = state.employees ?? [];
  $: users = masterState?.users ?? [];
  $: takenUsernames = users.map((u) => u.username);
  $: canResetPassword = ['admin', 'master'].includes((sessionRole || '').toLowerCase());
  $: activePositions = filterActivePositions(positions);

  $: locationGroups = buildLocationGroups(allEmployees, units);

  function reloadPositions() {
    positions = listJobPositions(tenantId || 'default');
  }

  function buildLocationGroups(
    employees: Employee[],
    unitList: { id: string; name: string; code?: string }[],
  ) {
    const map = new Map<string, { key: string; label: string; items: Employee[] }>();
    const ensure = (key: string, label: string) => {
      if (!map.has(key)) map.set(key, { key, label, items: [] });
      return map.get(key)!;
    };
    ensure('central', CENTRAL_OFFICE_LABEL);
    for (const u of unitList) {
      ensure(u.id, u.name || u.code || u.id);
    }
    for (const e of employees) {
      const meta = parseEmployeeMeta(e.metadata);
      const unitListIds = e.unitIds?.length ? e.unitIds : meta.unitIds || [];
      const firstUnit = unitListIds[0] || '';
      if (firstUnit && map.has(firstUnit)) {
        map.get(firstUnit)!.items.push(e);
      } else if (firstUnit) {
        const u = unitList.find((x) => x.id === firstUnit);
        ensure(firstUnit, u?.name || meta.locationLabel || firstUnit).items.push(e);
      } else {
        map.get('central')!.items.push(e);
      }
    }
    // orden: central primero, luego alfabético
    return [...map.values()]
      .filter((g) => g.items.length > 0 || g.key === 'central' || unitList.some((u) => u.id === g.key))
      .sort((a, b) => {
        if (a.key === 'central') return -1;
        if (b.key === 'central') return 1;
        return a.label.localeCompare(b.label, 'es');
      });
  }

  function filtersFor(key: string) {
    if (!locationFilters[key]) {
      locationFilters[key] = {
        name: '',
        ci: '',
        role: '',
        cargo: '',
        hireFrom: '',
        salaryMin: '',
        status: '',
      };
    }
    return locationFilters[key];
  }

  function clearFilters(key: string) {
    locationFilters[key] = {
      name: '',
      ci: '',
      role: '',
      cargo: '',
      hireFrom: '',
      salaryMin: '',
      status: '',
    };
    locationFilters = locationFilters;
  }

  function filteredEmployees(key: string, items: Employee[]): Employee[] {
    const f = filtersFor(key);
    return items.filter((e) => {
      const meta = parseEmployeeMeta(e.metadata);
      if (f.name.trim() && !e.name.toLowerCase().includes(f.name.trim().toLowerCase())) return false;
      if (f.ci.trim() && !(e.ci || '').toLowerCase().includes(f.ci.trim().toLowerCase())) return false;
      if (f.role.trim() && !(e.role || '').toLowerCase().includes(f.role.trim().toLowerCase()))
        return false;
      if (
        f.cargo.trim() &&
        !(meta.positionName || '').toLowerCase().includes(f.cargo.trim().toLowerCase())
      )
        return false;
      if (f.hireFrom && (e.hireDate || '') < f.hireFrom) return false;
      if (f.salaryMin !== '' && (Number(e.salary) || 0) < parseFloat(f.salaryMin)) return false;
      const labor: LaborStatus = meta.laborStatus
        ? meta.laborStatus
        : e.active
          ? 'active'
          : 'inactive';
      if (f.status === 'active' && labor !== 'active' && labor !== 'reactivated') return false;
      if (f.status === 'inactive' && labor !== 'inactive') return false;
      if (f.status === 'reactivated' && labor !== 'reactivated') return false;
      return true;
    });
  }

  function toggleLocation(key: string) {
    openLocations = { ...openLocations, [key]: !openLocations[key] };
  }

  function resetForm() {
    editingId = null;
    name = '';
    ci = '';
    positionId = '';
    positionQuery = '';
    department = '';
    hireDate = new Date().toISOString().slice(0, 10);
    salary = '';
    currency = 'CUP';
    unitId = '';
    usernameOptions = [];
    selectedUsername = '';
    positionPickerOpen = false;
    contactEmail = '';
    avatarUrl = '';
    avatarBroken = false;
    formError = '';
  }

  function openNewForm() {
    if (state.saving) return;
    resetForm();
    formOk = '';
    formError = '';
    showForm = true;
    refreshUsernameOptions();
    requestAnimationFrame(() => {
      document.getElementById('emp-form-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function closeForm() {
    if (state.saving) return;
    showForm = false;
    formError = '';
    resetForm();
  }

  function onNameInput() {
    refreshUsernameOptions();
  }

  function refreshUsernameOptions() {
    if (editingId) return;
    usernameOptions = suggestAvailableUsernames(name || 'usuario', takenUsernames, 3);
    if (!usernameOptions.includes(selectedUsername)) {
      selectedUsername = usernameOptions[0] || '';
    }
  }

  function filterPositions(q: string): JobPosition[] {
    const query = (q || '').trim().toLowerCase();
    const list = activePositions;
    if (!query) return list.slice(0, 30);
    return list
      .filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.role.toLowerCase().includes(query) ||
          roleLabel(p.role).toLowerCase().includes(query),
      )
      .slice(0, 30);
  }

  function selectPosition(p: JobPosition) {
    positionId = p.id;
    positionQuery = p.name;
    positionPickerOpen = false;
  }

  function selectedPosition(): JobPosition | undefined {
    return positions.find((p) => p.id === positionId);
  }

  function startEdit(e: Employee) {
    const meta = parseEmployeeMeta(e.metadata);
    editingId = e.id;
    name = e.name;
    ci = e.ci || '';
    department = e.department || '';
    hireDate = e.hireDate || new Date().toISOString().slice(0, 10);
    salary = String(e.salary ?? '');
    currency = e.currency || 'CUP';
    unitId = (e.unitIds && e.unitIds[0]) || '';
    positionId = meta.positionId || '';
    positionQuery = meta.positionName || e.role || '';
    selectedUsername = meta.username || '';
    usernameOptions = selectedUsername ? [selectedUsername] : [];
    contactEmail = meta.contactEmail || '';
    avatarUrl = meta.avatarUrl || '';
    avatarBroken = false;
    formError = '';
    formOk = '';
    showForm = true;
  }

  async function handleSubmit(ev: Event) {
    ev.preventDefault();
    formError = '';
    formOk = '';

    if (!name.trim()) {
      formError = 'El nombre del trabajador es obligatorio';
      return;
    }
    const sal = parseFloat(salary);
    if (!Number.isFinite(sal) || sal < 0) {
      formError = 'Indique un salario válido';
      return;
    }
    const pos = selectedPosition();
    if (!pos) {
      formError = 'Seleccione un cargo del nomenclador';
      return;
    }

    const locationLabel = unitId
      ? units.find((u) => u.id === unitId)?.name || unitId
      : CENTRAL_OFFICE_LABEL;
    const unitIds = unitId ? [unitId] : [];

    try {
      if (editingId) {
        const existing = allEmployees.find((x) => x.id === editingId);
        const meta = mergeEmployeeMeta(existing?.metadata, {
          positionId: pos.id,
          positionName: pos.name,
          locationLabel,
          unitIds,
          username: selectedUsername || parseEmployeeMeta(existing?.metadata).username,
          userId: parseEmployeeMeta(existing?.metadata).userId,
          contactEmail: contactEmail.trim() || undefined,
          avatarUrl: (avatarUrl || '').trim() || undefined,
        });
        await store.editEmployee({
          id: editingId,
          name: name.trim(),
          ci: ci.trim() || undefined,
          role: pos.role,
          department: department.trim() || undefined,
          hireDate: hireDate || undefined,
          salary: sal,
          currency,
          // unitIds solo en metadata (API Go no tiene el campo)
          metadata: meta,
        });
        formOk = 'Trabajador actualizado';
      } else {
        const fullName = name.trim();
        if (!fullName) {
          formError = 'El nombre del trabajador es obligatorio';
          return;
        }
        if (!selectedUsername) {
          formError = 'Seleccione un nombre de usuario disponible';
          return;
        }
        if (!masterStore) {
          formError = 'No hay módulo de usuarios disponible para crear el acceso al sistema';
          return;
        }

        // 1) Usuario sistema: crear o reutilizar si ya existe (reintento tras fallo de empleado)
        let userId: string | undefined;
        let userWasNew = false;
        try {
          await masterStore.addUser({
            username: selectedUsername,
            displayName: fullName,
            password: TEMP_PASSWORD,
            role: pos.role,
          });
          userWasNew = true;
        } catch (userErr) {
          const msg = userErr instanceof Error ? userErr.message : String(userErr);
          const exists =
            /ya existe|already exists|duplicate|duplicad/i.test(msg) ||
            /username/i.test(msg);
          if (!exists) throw userErr;
          // Continuar: vincularemos el usuario existente
        }
        await masterStore.loadAll().catch(() => undefined);
        const linked =
          (masterStore.getState().users ?? []).find(
            (u) => u.username.toLowerCase() === selectedUsername.toLowerCase(),
          ) || null;
        userId = linked?.id;
        if (!userId) {
          formError =
            'No se pudo resolver el usuario de sistema. Revise Usuarios/Roles o elija otro username.';
          return;
        }

        const meta = mergeEmployeeMeta(null, {
          positionId: pos.id,
          positionName: pos.name,
          username: selectedUsername,
          userId,
          laborStatus: 'active',
          locationLabel,
          unitIds,
          contactEmail: contactEmail.trim() || undefined,
          avatarUrl: (avatarUrl || '').trim() || undefined,
        });

        await store.addEmployee({
          name: fullName,
          ci: ci.trim() || undefined,
          role: pos.role,
          department: department.trim() || undefined,
          hireDate: hireDate || undefined,
          salary: sal,
          currency: (currency || 'CUP').trim() || 'CUP',
          // unitIds solo en metadata — no van en el body HTTP
          metadata: meta,
        });
        formOk = userWasNew
          ? `Empleado y usuario «${selectedUsername}» creados · contraseña temporal ${TEMP_PASSWORD}`
          : `Empleado creado y vinculado al usuario existente «${selectedUsername}»`;
      }
      resetForm();
      showForm = false;
    } catch (err) {
      formError = err instanceof Error ? err.message : state.error || 'Error al guardar';
    }
  }

  async function handleDismiss(e: Employee) {
    if (!confirm(`¿Dar de baja a ${e.name}?`)) return;
    try {
      await store.dismissEmployee(e.id);
      const meta = mergeEmployeeMeta(e.metadata, { laborStatus: 'inactive' });
      if (typeof store.editEmployee === 'function') {
        await store.editEmployee({ id: e.id, active: false, metadata: meta });
      }
      formOk = 'Baja registrada';
    } catch (err) {
      formError = err instanceof Error ? err.message : 'No se pudo dar de baja';
    }
  }

  async function handleReactivate(e: Employee) {
    try {
      const meta = mergeEmployeeMeta(e.metadata, { laborStatus: 'reactivated' });
      await store.editEmployee({ id: e.id, active: true, metadata: meta });
      formOk = 'Trabajador reactivado';
    } catch (err) {
      formError = err instanceof Error ? err.message : 'No se pudo reactivar';
    }
  }

  async function handleResetPassword(e: Employee) {
    if (!canResetPassword) {
      formError = 'Solo admin o master pueden restablecer contraseñas';
      return;
    }
    const meta = parseEmployeeMeta(e.metadata);
    const userId = meta.userId;
    if (!userId || !masterStore) {
      formError =
        'Este empleado no tiene usuario vinculado. Edite o vuelva a crear el acceso desde Usuarios.';
      return;
    }
    if (!confirm(`¿Restablecer contraseña de ${meta.username || e.name} a ${TEMP_PASSWORD}?`))
      return;
    try {
      // Backend valida autorización; el FE solo envía la petición.
      await masterStore.editUser({ id: userId, password: TEMP_PASSWORD });
      formOk = `Contraseña restablecida a ${TEMP_PASSWORD} (temporal)`;
    } catch (err) {
      formError =
        err instanceof Error
          ? err.message
          : 'El servidor rechazó el restablecimiento (sin permisos o usuario inválido)';
    }
  }

  function addPosition() {
    posError = '';
    try {
      saveJobPosition(tenantId || 'default', { name: posName, role: posRole, active: true });
      posName = '';
      posRole = 'vendedor';
      reloadPositions();
    } catch (err) {
      posError = err instanceof Error ? err.message : 'No se pudo guardar el cargo';
    }
  }

  function laborLabel(e: Employee): string {
    const meta = parseEmployeeMeta(e.metadata);
    if (meta.laborStatus === 'reactivated') return 'Reactivado';
    if (meta.laborStatus === 'inactive' || !e.active) return 'Inactivo';
    return 'Activo';
  }
</script>

<section class="empleados" data-screen="empleados">
  <header class="page-head">
    <div>
      <h1>Gestión de empleados</h1>
      <p class="sub">
        Identidad laboral: cargo (nomenclador) → rol de sistema → usuario. La ubicación prepara el
        contexto operativo (POS / scopes futuros).
      </p>
    </div>
    <Button variant="secondary" onclick={() => store.loadEmployees()} disabled={state.status === 'loading'}
      >Actualizar</Button
    >
  </header>

  {#if formOk}
    <p class="banner ok" role="status">{formOk}</p>
  {/if}
  {#if formError && !showForm}
    <p class="banner err" role="alert">{formError}</p>
  {/if}

  <div class="actions-row">
    {#if showForm}
      <Button type="button" variant="secondary" onclick={closeForm} disabled={state.saving}
        >Cerrar formulario</Button
      >
    {:else}
      <Button type="button" onclick={openNewForm} disabled={state.saving}>Nuevo empleado</Button>
    {/if}
    <Button type="button" variant="secondary" onclick={() => (showPositions = !showPositions)}>
      {showPositions ? 'Ocultar nomenclador' : 'Nomenclador de cargos'}
    </Button>
  </div>


  {#if showForm}
    <Card>
      <div id="emp-form-panel" class="form-panel">
        <div class="form-panel-head">
          <div>
            <h2 id="emp-form-title">{editingId ? 'Editar empleado' : 'Nuevo empleado'}</h2>
            <p class="form-panel-sub">
              El cargo del nomenclador fija el rol de sistema (solo selección). Permisos en Control de
              Roles. Usuario con contraseña temporal hasheada en servidor.
            </p>
          </div>
          <Button type="button" variant="secondary" onclick={closeForm} disabled={state.saving}
            >Cerrar</Button
          >
        </div>

        {#if state.saving}
          <p class="banner ok" role="status">Guardando… no cierre este bloque.</p>
        {/if}

        <form onsubmit={handleSubmit}>
          <div class="form-grid">
            <label class="field span-2">
              <span>Nombre completo <em class="req">*</em></span>
              <input
                bind:value={name}
                oninput={onNameInput}
                disabled={state.saving}
                required
              />
            </label>

            <label class="field">
              <span>Correo de contacto</span>
              <input
                type="email"
                bind:value={contactEmail}
                placeholder="opcional"
                disabled={state.saving}
                autocomplete="email"
              />
            </label>
            <label class="field">
              <span>Carnet de identidad</span>
              <input bind:value={ci} disabled={state.saving} />
            </label>

            <div class="field span-2 photo-url-field">
              <span>URL de foto de perfil</span>
              <div class="photo-url-row">
                <input
                  type="url"
                  bind:value={avatarUrl}
                  placeholder="https://… pegar URL de imagen"
                  disabled={state.saving}
                  oninput={() => (avatarBroken = false)}
                />
                {#if avatarUrl.trim()}
                  <div class="photo-preview">
                    {#if !avatarBroken}
                      <img
                        src={avatarUrl.trim()}
                        alt="Vista previa"
                        class="photo-preview-img"
                        onerror={() => (avatarBroken = true)}
                      />
                    {:else}
                      <span class="photo-preview-err">No se pudo cargar la imagen</span>
                    {/if}
                  </div>
                {/if}
              </div>
            </div>
            <label class="field">
              <span>Departamento</span>
              <input bind:value={department} disabled={state.saving} />
            </label>

            <div class="field span-2 product-picker">
              <span>Cargo (nomenclador) <em class="req">*</em></span>
              <input
                type="search"
                bind:value={positionQuery}
                placeholder="Buscar cargo…"
                disabled={state.saving}
                onfocus={() => (positionPickerOpen = true)}
                oninput={() => {
                  positionId = '';
                  positionPickerOpen = true;
                }}
                autocomplete="off"
              />
              {#if positionPickerOpen}
                <ul class="picker-list">
                  {#each filterPositions(positionQuery) as p (p.id)}
                    <li>
                      <button type="button" class="picker-option" onclick={() => selectPosition(p)}>
                        <span>{p.name}</span>
                        <span class="muted">{roleLabel(p.role)}</span>
                      </button>
                    </li>
                  {:else}
                    <li class="muted pad">Sin cargos — abra el nomenclador</li>
                  {/each}
                </ul>
              {/if}
              {#if selectedPosition()}
                <p class="hint-inline"
                  >Rol asignado: <strong>{roleLabel(selectedPosition()?.role ?? '')}</strong></p
                >
              {/if}
            </div>

            <label class="field">
              <span>Fecha de incorporación</span>
              <input type="date" bind:value={hireDate} disabled={state.saving} />
            </label>
            <label class="field">
              <span>Salario <em class="req">*</em></span>
              <input type="number" min="0" step="any" bind:value={salary} disabled={state.saving} />
            </label>
            <label class="field">
              <span>Moneda</span>
              <input bind:value={currency} disabled={state.saving} />
            </label>
            <label class="field">
              <span>Punto de venta (opcional)</span>
              <select bind:value={unitId} disabled={state.saving}>
                <option value="">Oficina Central</option>
                {#each units as u (u.id)}
                  <option value={u.id}>{u.code ? `${u.code} · ` : ''}{u.name}</option>
                {/each}
              </select>
            </label>

            {#if !editingId}
              <fieldset class="field span-2 user-opts">
                <legend>Usuario de sistema (3 disponibles)</legend>
                {#each usernameOptions as u}
                  <label class="radio">
                    <input type="radio" bind:group={selectedUsername} value={u} />
                    <code>{u}</code>
                  </label>
                {/each}
                <p class="hint-inline"
                  >Contraseña inicial temporal: <code>123456</code> (hash en backend)</p
                >
              </fieldset>
            {:else if selectedUsername}
              <p class="hint-inline span-2">Usuario vinculado: <code>{selectedUsername}</code></p>
            {/if}
          </div>

          {#if formError}
            <p class="banner err" role="alert">{formError}</p>
          {/if}

          <div class="form-panel-actions">
            <Button type="submit" disabled={state.saving}
              >{state.saving
                ? 'Guardando…'
                : editingId
                  ? 'Guardar cambios'
                  : 'Crear empleado y usuario'}</Button
            >
            <Button type="button" variant="secondary" onclick={closeForm} disabled={state.saving}
              >Cancelar</Button
            >
          </div>
        </form>
      </div>
    </Card>
  {/if}

  <div class="main-layout" class:side-open={showPositions}>
    <aside class="side-col" aria-label="Nomenclador de cargos">
      {#if showPositions}
        <div class="side-panel slide-in">
          <Card>
            <h2>Nomenclador de cargos</h2>
            <p class="hint">
              Solo declara <strong>cargos</strong> y los asocia a un <strong>rol ya existente</strong>.
              No crea, elimina ni modifica roles ni permisos (eso es Control de Roles).
            </p>
            <div class="pos-form">
              <label class="field">
                <span>Nombre del cargo</span>
                <input bind:value={posName} placeholder="Ej. Vendedor de piso" />
              </label>
              <label class="field">
                <span>Rol existente (solo selección)</span>
                <select bind:value={posRole} title="Listado de roles del sistema; no se administran aquí">
                  {#each ASSIGNABLE_ROLES as r}
                    <option value={r}>{roleLabel(r)}</option>
                  {/each}
                </select>
              </label>
              <Button type="button" onclick={addPosition}>Añadir cargo</Button>
            </div>
            <p class="hint">Relación: Cargo → Rol existente (consulta). Permisos: pantalla Control de Roles / Usuarios.</p>
            {#if posError}
              <p class="banner err">{posError}</p>
            {/if}
            <ul class="pos-list">
              {#each activePositions as p (p.id)}
                <li>
                  <div>
                    <strong>{p.name}</strong>
                    <span class="muted">→ {roleLabel(p.role)}</span>
                  </div>
                </li>
              {/each}
            </ul>
          </Card>
        </div>
      {/if}
    </aside>

    <div class="list-col">
      {#each locationGroups as group (group.key)}
        {@const open = !!openLocations[group.key]}
        {@const f = filtersFor(group.key)}
        {@const rows = open ? filteredEmployees(group.key, group.items) : []}
        <Card>
          <button type="button" class="loc-toggle" onclick={() => toggleLocation(group.key)}>
            <span class="chev">{open ? '▼' : '▶'}</span>
            <strong>{group.label}</strong>
            <span class="count">{group.items.length}</span>
          </button>

          {#if open}
            <div class="loc-body slide-down">
              <div class="filters">
                <input type="search" placeholder="Nombre" bind:value={f.name} oninput={() => (locationFilters = locationFilters)} />
                <input type="search" placeholder="CI" bind:value={f.ci} oninput={() => (locationFilters = locationFilters)} />
                <input type="search" placeholder="Rol" bind:value={f.role} oninput={() => (locationFilters = locationFilters)} />
                <input type="search" placeholder="Cargo" bind:value={f.cargo} oninput={() => (locationFilters = locationFilters)} />
                <input type="date" title="Incorporación desde" bind:value={f.hireFrom} oninput={() => (locationFilters = locationFilters)} />
                <input type="number" placeholder="Salario mín." bind:value={f.salaryMin} oninput={() => (locationFilters = locationFilters)} />
                <select bind:value={f.status} onchange={() => (locationFilters = locationFilters)}>
                  <option value="">Estado (todos)</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                  <option value="reactivated">Reactivados</option>
                </select>
                <Button type="button" variant="secondary" onclick={() => clearFilters(group.key)}
                  >Limpiar</Button
                >
              </div>

              {#if rows.length === 0}
                <p class="muted">Sin empleados en este filtro.</p>
              {:else}
                <ul class="emp-list">
                  {#each rows as e (e.id)}
                    {@const meta = parseEmployeeMeta(e.metadata)}
                    <li class="emp-item" class:off={!e.active}>
                      <div class="emp-main emp-main-row">
                        {#if meta.avatarUrl}
                          <img class="emp-avatar" src={meta.avatarUrl} alt="" loading="lazy" />
                        {/if}
                        <div>
                        <strong>{e.name}</strong>
                        <p class="meta-line">
                          {meta.positionName || '—'} · {roleLabel(e.role || '')}
                          {#if meta.username}
                            · @{meta.username}
                          {/if}
                          · {laborLabel(e)}
                        </p>
                        <p class="meta-line">
                          CI: {e.ci || '—'} · Alta: {e.hireDate || '—'} ·
                          <Money amount={e.salary} currency={e.currency} />
                          {#if meta.contactEmail}
                            · {meta.contactEmail}
                          {/if}
                        </p>
                        </div>
                      </div>
                      <div class="emp-actions">
                        <Button type="button" variant="secondary" onclick={() => startEdit(e)}
                          >Editar</Button
                        >
                        {#if e.active}
                          <Button type="button" variant="secondary" onclick={() => handleDismiss(e)}
                            >Despedir</Button
                          >
                        {:else}
                          <Button type="button" variant="secondary" onclick={() => handleReactivate(e)}
                            >Reactivar</Button
                          >
                        {/if}
                        {#if canResetPassword && meta.userId}
                          <Button type="button" variant="secondary" onclick={() => handleResetPassword(e)}
                            >Restablecer contraseña</Button
                          >
                        {/if}
                      </div>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
          {/if}
        </Card>
      {/each}
    </div>
  </div>
</section>

<style>
  .empleados {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    max-width: 1200px;
    margin: 0 auto;
    padding-bottom: 1.5rem;
  }
  .page-head {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.75rem;
  }
  h1 {
    margin: 0 0 0.25rem;
    font-size: clamp(1.2rem, 2.2vw, 1.45rem);
  }
  h2 {
    margin: 0 0 0.35rem;
    font-size: 1rem;
  }
  .sub {
    margin: 0;
    font-size: 0.85rem;
    color: var(--color-text-secondary, var(--ap-text-secondary));
    max-width: 40rem;
  }
  .actions-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .main-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.85rem;
    align-items: start;
  }
  .side-col {
    display: none;
  }
  .main-layout.side-open .side-col {
    display: block;
  }
  @media (min-width: 960px) {
    .main-layout.side-open {
      grid-template-columns: minmax(240px, 0.4fr) minmax(0, 1fr);
    }
    .side-col {
      position: sticky;
      top: 0.5rem;
    }
  }
  @media (max-width: 959px) {
    .side-col {
      order: -1;
    }
  }
  .slide-in {
    animation: slideIn 0.28s ease both;
  }
  .slide-down {
    animation: slideDown 0.28s ease both;
  }
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(14px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .hint,
  .hint-inline,
  .muted {
    font-size: 0.78rem;
    color: var(--color-text-muted, var(--ap-text-muted));
  }
  .hint-inline {
    margin: 4px 0 0;
  }
  .pos-form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }
  .pos-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .pos-list li {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    align-items: center;
    padding: 0.4rem 0;
    border-bottom: 1px solid var(--color-border, var(--ap-border));
    font-size: 0.85rem;
  }
  .pos-list li.off {
    opacity: 0.55;
  }
  .loc-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: transparent;
    border: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
    text-align: left;
    padding: 0.15rem 0;
  }
  .count {
    margin-left: auto;
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }
  .loc-body {
    margin-top: 0.65rem;
  }
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 0.65rem;
  }
  .filters input,
  .filters select {
    padding: 6px 8px;
    border-radius: 8px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: var(--color-bg, #050812);
    color: inherit;
    font-size: 0.8rem;
    min-height: 34px;
  }
  .emp-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }
  .emp-main-row {
    display: flex;
    gap: 0.65rem;
    align-items: flex-start;
  }
  .photo-url-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: flex-start;
  }
  .photo-url-row input {
    flex: 1 1 220px;
    min-width: 0;
  }
  .photo-preview {
    flex: 0 0 auto;
  }
  .photo-preview-img {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid var(--color-border, var(--ap-border));
    background: #1a1f2e;
  }
  .photo-preview-err {
    font-size: 0.75rem;
    color: var(--accent-red, #f17b7b);
  }
  .emp-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
    background: #1a1f2e;
  }
  .emp-item {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.55rem 0.65rem;
    border-radius: 12px;
    border: 1px solid var(--color-border, var(--ap-border));
  }
  .emp-item.off {
    opacity: 0.75;
  }
  .meta-line {
    margin: 0.15rem 0 0;
    font-size: 0.75rem;
    color: var(--color-text-secondary, var(--ap-text-secondary));
  }
  .emp-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .banner {
    margin: 0;
    padding: 10px 12px;
    border-radius: 12px;
    font-size: 0.85rem;
  }
  .banner.err {
    background: color-mix(in srgb, var(--accent-red, #f17b7b) 12%, transparent);
    color: var(--accent-red, #f17b7b);
  }
  .banner.ok {
    background: color-mix(in srgb, var(--accent-green, #b7f56a) 12%, transparent);
    color: var(--accent-green, #b7f56a);
  }

  .form-panel {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .form-panel-head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
  }
  .form-panel-head h2 {
    margin: 0 0 0.25rem;
    font-size: 1.05rem;
  }
  .form-panel-sub {
    margin: 0;
    font-size: 0.82rem;
    color: var(--color-text-secondary, var(--ap-text-secondary));
    max-width: 42rem;
  }
  .form-panel-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 0.85rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--color-border, var(--ap-border));
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.55rem 0.65rem;
  }
  .span-2 {
    grid-column: 1 / -1;
  }
  @media (max-width: 520px) {
    .form-grid {
      grid-template-columns: 1fr;
    }
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.78rem;
    position: relative;
  }
  .field span,
  .field legend {
    font-size: 0.62rem;
    font-weight: 650;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-muted);
  }
  .field input,
  .field select {
    padding: 8px 10px;
    border-radius: 10px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: var(--color-bg, #050812);
    color: inherit;
    min-height: 38px;
  }
  .req {
    color: var(--accent-red, #f17b7b);
  }
  .picker-list {
    list-style: none;
    margin: 4px 0 0;
    padding: 4px;
    position: absolute;
    left: 0;
    right: 0;
    z-index: 5;
    max-height: 180px;
    overflow: auto;
    border-radius: 10px;
    border: 1px solid var(--color-border);
    background: var(--color-surface, #171b29);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
  }
  .picker-option {
    width: 100%;
    display: flex;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 10px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-size: 0.84rem;
  }
  .picker-option:hover {
    background: color-mix(in srgb, var(--accent-cyan, #61e6e1) 12%, transparent);
  }
  .user-opts {
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 0.55rem 0.65rem;
  }
  .radio {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.88rem;
    margin: 0.25rem 0;
  }
  .pad {
    padding: 8px;
  }
</style>
