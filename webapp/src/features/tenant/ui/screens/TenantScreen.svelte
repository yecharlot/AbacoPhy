<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card, Input } from '../../../../infrastructure/ui/shared';
  import type { TenantStore, TenantState } from '../stores/tenantStore';
  import type { WarehouseStore, WarehouseState } from '../../../warehouse/ui/stores/warehouseStore';
  import type { SalesUnit } from '../../../warehouse/domain/entities/SalesUnit';

  export let store: TenantStore;
  export let canEdit = true;
  export let warehouseStore: WarehouseStore | undefined = undefined;

  let state: TenantState = store.getState();
  let whState: WarehouseState | null = null;

  let name = '';
  let currency = 'CUP';
  let phone = '';
  let address = '';
  let email = '';
  let taxId = '';
  let savedMsg = '';
  let unitMsg = '';
  let unitErr = '';
  let editingBusiness = false;

  /** Formulario PDV: alta o edición de uno seleccionado */
  let editingUnitId: string | null = null;
  let unitName = '';
  let unitAddress = '';
  let unitPhone = '';

  const CLOSED_PREFIX = 'abacophy.closedSalesUnits.v1:';
  const OVERRIDE_PREFIX = 'abacophy.unitOverrides.v1:';

  type UnitOverride = { name?: string; address?: string; phone?: string };

  function closedKey(tenantId: string) {
    return CLOSED_PREFIX + (tenantId || 'default');
  }
  function overrideKey(tenantId: string) {
    return OVERRIDE_PREFIX + (tenantId || 'default');
  }

  function loadClosedIds(tenantId: string): Set<string> {
    try {
      const raw = localStorage.getItem(closedKey(tenantId));
      if (!raw) return new Set();
      const arr = JSON.parse(raw) as string[];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  }

  function saveClosedIds(tenantId: string, ids: Set<string>) {
    try {
      localStorage.setItem(closedKey(tenantId), JSON.stringify([...ids]));
    } catch {
      /* ignore */
    }
  }

  function loadOverrides(tenantId: string): Record<string, UnitOverride> {
    try {
      const raw = localStorage.getItem(overrideKey(tenantId));
      if (!raw) return {};
      const obj = JSON.parse(raw) as Record<string, UnitOverride>;
      return obj && typeof obj === 'object' ? obj : {};
    } catch {
      return {};
    }
  }

  function saveOverrides(tenantId: string, map: Record<string, UnitOverride>) {
    try {
      localStorage.setItem(overrideKey(tenantId), JSON.stringify(map));
    } catch {
      /* ignore */
    }
  }

  let closedIds: Set<string> = new Set();
  let overrides: Record<string, UnitOverride> = {};

  function syncForm(tenant: TenantState['tenant']) {
    if (!tenant) return;
    name = tenant.name;
    currency = tenant.currency || 'CUP';
    phone = tenant.phone || '';
    address = tenant.address || '';
    email = tenant.email || '';
    taxId = tenant.taxId || '';
    closedIds = loadClosedIds(tenant.id || '');
    overrides = loadOverrides(tenant.id || '');
  }

  function displayUnit(u: SalesUnit): SalesUnit {
    const o = overrides[u.id];
    if (!o) return u;
    return {
      ...u,
      name: o.name ?? u.name,
      address: o.address ?? u.address,
      phone: o.phone ?? u.phone,
    };
  }

  onMount(() => {
    const unsubT = store.subscribe((s) => {
      state = s;
      if (s.tenant && (s.status === 'success' || s.status === 'empty')) {
        syncForm(s.tenant);
      }
    });
    let unsubW: (() => void) | undefined;
    if (warehouseStore) {
      unsubW = warehouseStore.subscribe((s) => {
        whState = s;
      });
      void warehouseStore.loadAll().catch(() => undefined);
    }
    void store.load();
    return () => {
      unsubT();
      unsubW?.();
    };
  });

  $: units = ((whState?.units ?? []) as SalesUnit[]).map(displayUnit);
  $: activeUnits = units.filter((u) => u.active !== false && !closedIds.has(u.id));
  $: closedUnits = units.filter((u) => closedIds.has(u.id) || u.active === false);
  $: formTitle = editingUnitId ? 'Editar punto de venta' : 'Nuevo punto de venta';
  $: hasWarehouse = !!warehouseStore;

  async function handleSave(e: Event) {
    e.preventDefault();
    if (!canEdit || state.saving) return;
    savedMsg = '';
    try {
      await store.save({ name, currency, phone, address, email, taxId });
      savedMsg = 'Datos del negocio guardados';
      editingBusiness = false;
      setTimeout(() => {
        savedMsg = '';
      }, 2500);
    } catch {
      /* state.error */
    }
  }

  function cancelEditBusiness() {
    syncForm(state.tenant);
    editingBusiness = false;
  }

  function resetUnitForm() {
    editingUnitId = null;
    unitName = '';
    unitAddress = '';
    unitPhone = '';
    unitErr = '';
  }

  function startEditUnit(u: SalesUnit) {
    if (!canEdit) return;
    const d = displayUnit(u);
    editingUnitId = u.id;
    unitName = d.name;
    unitAddress = d.address || '';
    unitPhone = d.phone || '';
    unitErr = '';
    unitMsg = '';
  }

  async function handleUnitSubmit(e: Event) {
    e.preventDefault();
    if (!canEdit || !warehouseStore) return;
    unitErr = '';
    unitMsg = '';
    const n = unitName.trim();
    if (!n) {
      unitErr = 'El nombre del punto de venta es obligatorio';
      return;
    }

    if (editingUnitId) {
      // Sin API de update: override local de gestión
      const tid = state.tenant?.id || '';
      const next = { ...overrides, [editingUnitId]: {
        name: n,
        address: unitAddress.trim(),
        phone: unitPhone.trim(),
      } };
      overrides = next;
      saveOverrides(tid, next);
      unitMsg = 'Cambios de gestión guardados en este dispositivo';
      resetUnitForm();
      setTimeout(() => {
        unitMsg = '';
      }, 2800);
      return;
    }

    try {
      await warehouseStore.addSalesUnit({
        name: n,
        address: unitAddress.trim() || undefined,
        phone: unitPhone.trim() || undefined,
      });
      unitMsg = `Punto de venta «${n}» creado`;
      resetUnitForm();
      setTimeout(() => {
        unitMsg = '';
      }, 2800);
    } catch (err) {
      unitErr = err instanceof Error ? err.message : 'No se pudo crear el punto de venta';
    }
  }

  function closeUnit(unit: SalesUnit) {
    if (!canEdit || !state.tenant) return;
    if (
      !window.confirm(
        `¿Cerrar el punto de venta «${unit.name}» (${unit.code})?\nQuedará marcado cerrado en la gestión del negocio.`,
      )
    ) {
      return;
    }
    const next = new Set(closedIds);
    next.add(unit.id);
    closedIds = next;
    saveClosedIds(state.tenant.id || '', next);
    if (editingUnitId === unit.id) resetUnitForm();
    unitMsg = `«${unit.name}» cerrado en gestión`;
    setTimeout(() => {
      unitMsg = '';
    }, 2500);
  }

  function reopenUnit(unit: SalesUnit) {
    if (!canEdit || !state.tenant) return;
    const next = new Set(closedIds);
    next.delete(unit.id);
    closedIds = next;
    saveClosedIds(state.tenant.id || '', next);
    unitMsg = `«${unit.name}» reabierto`;
    setTimeout(() => {
      unitMsg = '';
    }, 2500);
  }
</script>

<section class="negocio" data-screen="tenant">
  <header class="hero">
    <div class="hero-glow" aria-hidden="true"></div>
    <div class="hero-text">
      <p class="eyebrow">Gestión del negocio</p>
      <h1>{state.tenant?.name || 'Negocio'}</h1>
      <p class="lede">
        Datos fiscales y puntos de venta. Configuración para administrador / master.
      </p>
    </div>
    <div class="hero-stats">
      <div class="stat">
        <span class="stat-val">{activeUnits.length}</span>
        <span class="stat-lbl">PDV activos</span>
      </div>
      {#if state.tenant?.currency}
        <div class="stat">
          <span class="stat-val">{state.tenant.currency}</span>
          <span class="stat-lbl">Moneda</span>
        </div>
      {/if}
    </div>
  </header>

  {#if state.status === 'loading' && !state.tenant}
    <Card><p class="muted">Cargando datos del negocio…</p></Card>
  {:else if state.status === 'error' && !state.tenant}
    <Card>
      <p class="err" role="alert">{state.error}</p>
      <Button variant="secondary" onclick={() => store.load()}>Reintentar</Button>
    </Card>
  {:else}
    <div class="split">
      <!-- Columna izquierda: datos del negocio -->
      <Card class="col-left">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">Datos del negocio</h2>
            <p class="panel-sub">Identidad fiscal y de contacto</p>
          </div>
          {#if canEdit && !editingBusiness}
            <Button variant="secondary" type="button" onclick={() => (editingBusiness = true)}>
              Editar
            </Button>
          {/if}
        </div>

        {#if !editingBusiness}
          <dl class="summary-grid">
            <div>
              <dt>Nombre</dt>
              <dd>{state.tenant?.name || '—'}</dd>
            </div>
            <div>
              <dt>Moneda</dt>
              <dd>{state.tenant?.currency || '—'}</dd>
            </div>
            <div>
              <dt>Teléfono</dt>
              <dd>{state.tenant?.phone || '—'}</dd>
            </div>
            <div>
              <dt>Correo electrónico</dt>
              <dd>{state.tenant?.email || '—'}</dd>
            </div>
            <div class="span-2">
              <dt>Dirección</dt>
              <dd>{state.tenant?.address || '—'}</dd>
            </div>
            <div>
              <dt>NIT / Id. fiscal</dt>
              <dd>{state.tenant?.taxId || '—'}</dd>
            </div>
            {#if state.tenant?.slug}
              <div>
                <dt>Slug</dt>
                <dd class="mono">{state.tenant.slug}</dd>
              </div>
            {/if}
          </dl>
        {:else}
          <form class="biz-form" onsubmit={handleSave}>
            <div class="form-stack">
              <Input id="t-name" label="Nombre" bind:value={name} disabled={state.saving} required />
              <Input id="t-currency" label="Moneda" bind:value={currency} disabled={state.saving} />
              <Input id="t-phone" label="Teléfono" type="tel" bind:value={phone} disabled={state.saving} />
              <Input id="t-email" label="Correo electrónico" type="email" bind:value={email} disabled={state.saving} />
              <Input id="t-address" label="Dirección" bind:value={address} disabled={state.saving} />
              <Input id="t-tax" label="NIT / Id. fiscal" bind:value={taxId} disabled={state.saving} />
            </div>
            {#if state.error}
              <p class="err" role="alert">{state.error}</p>
            {/if}
            <div class="form-actions">
              <Button type="submit" disabled={state.saving}>
                {state.saving ? 'Guardando…' : 'Guardar cambios'}
              </Button>
              <Button type="button" variant="secondary" onclick={cancelEditBusiness} disabled={state.saving}>
                Cancelar
              </Button>
            </div>
          </form>
        {/if}
        {#if savedMsg}
          <p class="ok">{savedMsg}</p>
        {/if}
      </Card>

      <!-- Columna derecha: formulario PDV + listado -->
      <div class="col-right">
        <Card class="unit-form-card">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">{formTitle}</h2>
              <p class="panel-sub">
                {#if editingUnitId}
                  Actualice los datos del punto seleccionado
                {:else}
                  Alta de una nueva unidad de venta
                {/if}
              </p>
            </div>
            {#if editingUnitId}
              <Button type="button" variant="secondary" onclick={resetUnitForm}>Nueva alta</Button>
            {/if}
          </div>

          {#if !hasWarehouse}
            <p class="err" role="alert">
              No se recibió el almacén de operaciones. Compruebe que App.svelte pasa
              <code>warehouseStore</code> a esta pantalla.
            </p>
          {:else if !canEdit}
            <p class="muted">Sin permiso de edición.</p>
          {:else}
            <form class="unit-form" onsubmit={handleUnitSubmit}>
              <div class="form-stack">
                <Input
                  id="u-name"
                  label="Nombre del punto de venta"
                  bind:value={unitName}
                  placeholder="Ej. Tienda Centro"
                  disabled={whState?.saving}
                  required
                />
                <Input
                  id="u-phone"
                  label="Teléfono"
                  type="tel"
                  bind:value={unitPhone}
                  disabled={whState?.saving}
                />
                <Input
                  id="u-address"
                  label="Dirección"
                  bind:value={unitAddress}
                  placeholder="Calle, municipio…"
                  disabled={whState?.saving}
                />
              </div>
              {#if unitErr}
                <p class="err" role="alert">{unitErr}</p>
              {/if}
              {#if unitMsg}
                <p class="ok" role="status">{unitMsg}</p>
              {/if}
              <div class="form-actions">
                <Button type="submit" disabled={whState?.saving}>
                  {#if whState?.saving}
                    Guardando…
                  {:else if editingUnitId}
                    Guardar cambios
                  {:else}
                    Abrir punto de venta
                  {/if}
                </Button>
                {#if editingUnitId}
                  <Button type="button" variant="secondary" onclick={resetUnitForm} disabled={whState?.saving}>
                    Cancelar
                  </Button>
                {/if}
              </div>
            </form>
          {/if}
        </Card>

        <Card class="unit-list-card">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">Listado de puntos de venta</h2>
              <p class="panel-sub">{activeUnits.length} activos · {closedUnits.length} cerrados</p>
            </div>
            {#if hasWarehouse}
              <Button
                type="button"
                variant="secondary"
                onclick={() => warehouseStore?.loadAll()}
                disabled={whState?.status === 'loading'}
              >
                {whState?.status === 'loading' ? 'Actualizando…' : 'Actualizar'}
              </Button>
            {/if}
          </div>

          <div class="unit-scroll" role="list">
            {#if !hasWarehouse}
              <p class="empty">Sin acceso a operaciones.</p>
            {:else if whState?.status === 'loading' && units.length === 0}
              <p class="muted">Cargando…</p>
            {:else if activeUnits.length === 0 && closedUnits.length === 0}
              <p class="empty">No hay puntos de venta. Use el formulario superior para crear el primero.</p>
            {:else}
              {#each activeUnits as u (u.id)}
                <article
                  class="unit-row"
                  class:selected={editingUnitId === u.id}
                  role="listitem"
                >
                  <div class="unit-main">
                    <span class="dot on" aria-hidden="true"></span>
                    <div>
                      <strong>{u.name}</strong>
                      <p class="unit-meta">
                        <span class="mono">{u.code}</span>
                        {#if u.address} · {u.address}{/if}
                        {#if u.phone} · {u.phone}{/if}
                      </p>
                    </div>
                  </div>
                  <div class="unit-side">
                    <span class="pill on">Activo</span>
                    {#if canEdit}
                      <Button type="button" variant="secondary" onclick={() => startEditUnit(u)}>
                        Editar
                      </Button>
                      <Button type="button" variant="secondary" onclick={() => closeUnit(u)}>
                        Cerrar
                      </Button>
                    {/if}
                  </div>
                </article>
              {/each}

              {#if closedUnits.length > 0}
                <p class="subhead">Cerrados</p>
                {#each closedUnits as u (u.id)}
                  <article class="unit-row dim" role="listitem">
                    <div class="unit-main">
                      <span class="dot off" aria-hidden="true"></span>
                      <div>
                        <strong>{u.name}</strong>
                        <p class="unit-meta"><span class="mono">{u.code}</span></p>
                      </div>
                    </div>
                    <div class="unit-side">
                      <span class="pill off">Cerrado</span>
                      {#if canEdit}
                        <Button type="button" variant="secondary" onclick={() => reopenUnit(u)}>
                          Reabrir
                        </Button>
                      {/if}
                    </div>
                  </article>
                {/each}
              {/if}
            {/if}
          </div>
        </Card>
      </div>
    </div>
  {/if}
</section>

<style>
  .negocio {
    max-width: 1100px;
    margin: 0 auto;
    padding-bottom: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    min-height: 0;
  }

  .hero {
    position: relative;
    overflow: hidden;
    border-radius: var(--radius-xl, 28px);
    border: 1px solid var(--color-border, var(--ap-border));
    background: linear-gradient(
      145deg,
      color-mix(in srgb, var(--color-surface, #171b29) 92%, var(--accent-cyan, #61e6e1) 8%) 0%,
      var(--color-surface, #171b29) 55%,
      color-mix(in srgb, var(--color-surface, #171b29) 90%, var(--accent-purple, #9c82ff) 10%) 100%
    );
    padding: 1.1rem 1.35rem;
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: flex-end;
    justify-content: space-between;
    flex-shrink: 0;
  }
  .hero-glow {
    position: absolute;
    inset: -40% -10% auto auto;
    width: 200px;
    height: 200px;
    background: radial-gradient(
      circle,
      color-mix(in srgb, var(--accent-cyan, #61e6e1) 30%, transparent) 0%,
      transparent 70%
    );
    pointer-events: none;
  }
  .eyebrow {
    margin: 0 0 0.25rem;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--accent-cyan, #61e6e1);
  }
  .hero h1 {
    margin: 0 0 0.25rem;
    font-size: clamp(1.15rem, 2.2vw, 1.45rem);
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .lede {
    margin: 0;
    font-size: 0.85rem;
    color: var(--color-text-secondary, var(--ap-text-secondary));
    max-width: 28rem;
  }
  .hero-stats {
    display: flex;
    gap: 0.5rem;
  }
  .stat {
    min-width: 4rem;
    padding: 0.35rem 0.65rem;
    border-radius: 12px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: color-mix(in srgb, var(--color-bg, #050812) 45%, transparent);
    text-align: right;
  }
  .stat-val {
    display: block;
    font-size: 1.15rem;
    font-weight: 700;
    background: var(--gradient-hero, linear-gradient(135deg, #61e6e1, #b7f56a));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .stat-lbl {
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-muted, var(--ap-text-muted));
  }

  .split {
    display: grid;
    grid-template-columns: minmax(280px, 0.95fr) minmax(320px, 1.15fr);
    gap: 0.9rem;
    align-items: start;
    min-height: 0;
  }
  @media (max-width: 900px) {
    .split {
      grid-template-columns: 1fr;
    }
  }

  .col-right {
    display: grid;
    grid-template-rows: auto minmax(220px, 1fr);
    gap: 0.9rem;
    min-height: 0;
  }

  .panel-head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.6rem;
    margin-bottom: 0.85rem;
  }
  .panel-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
  }
  .panel-sub {
    margin: 0.15rem 0 0;
    font-size: 0.8rem;
    color: var(--color-text-secondary, var(--ap-text-secondary));
  }

  .summary-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem 0.85rem;
    margin: 0;
  }
  .summary-grid .span-2 {
    grid-column: 1 / -1;
  }
  .summary-grid dt {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-muted, var(--ap-text-muted));
  }
  .summary-grid dd {
    margin: 0.12rem 0 0;
    font-size: 0.9rem;
    font-weight: 600;
  }
  .mono {
    font-family: ui-monospace, monospace;
    font-size: 0.85em;
  }

  .form-stack {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }
  .form-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin-top: 0.75rem;
  }

  .unit-list-card {
    display: flex;
    flex-direction: column;
    min-height: 0;
    max-height: min(52vh, 480px);
  }
  .unit-scroll {
    overflow-y: auto;
    min-height: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding-right: 2px;
    scrollbar-color: var(--ap-border-strong, var(--ap-border)) transparent;
  }

  .unit-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.6rem 0.7rem;
    border-radius: 12px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: color-mix(in srgb, var(--color-bg, #050812) 35%, transparent);
  }
  .unit-row.selected {
    border-color: color-mix(in srgb, var(--accent-cyan, #61e6e1) 45%, var(--ap-border));
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent-cyan, #61e6e1) 20%, transparent);
  }
  .unit-row.dim {
    opacity: 0.85;
  }
  .unit-main {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
    min-width: 0;
  }
  .unit-main strong {
    font-size: 0.88rem;
  }
  .unit-meta {
    margin: 0.12rem 0 0;
    font-size: 0.75rem;
    color: var(--color-text-secondary, var(--ap-text-secondary));
  }
  .unit-side {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
  }
  .dot {
    width: 8px;
    height: 8px;
    margin-top: 0.35rem;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .dot.on {
    background: var(--accent-green, #b7f56a);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-green, #b7f56a) 22%, transparent);
  }
  .dot.off {
    background: var(--ap-text-muted, #858c9d);
  }
  .pill {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.18rem 0.5rem;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .pill.on {
    background: color-mix(in srgb, var(--accent-green, #b7f56a) 16%, transparent);
    color: var(--accent-green, #b7f56a);
  }
  .pill.off {
    background: color-mix(in srgb, var(--ap-text-muted) 14%, transparent);
    color: var(--ap-text-muted);
  }
  .subhead {
    margin: 0.5rem 0 0.2rem;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-text-muted, var(--ap-text-muted));
  }
  .empty {
    margin: 0;
    padding: 1rem;
    text-align: center;
    font-size: 0.85rem;
    color: var(--color-text-secondary, var(--ap-text-secondary));
    border: 1px dashed var(--color-border, var(--ap-border));
    border-radius: 12px;
  }
  .muted {
    color: var(--ap-text-secondary);
    font-size: 0.88rem;
  }
  .err {
    color: var(--ap-danger, #f17b7b);
    font-size: 0.86rem;
  }
  .ok {
    color: var(--ap-ok, #b7f56a);
    font-size: 0.86rem;
  }
  code {
    font-size: 0.85em;
  }
</style>
