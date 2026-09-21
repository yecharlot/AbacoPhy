<script lang="ts">
  import { onMount } from 'svelte';
  import { Badge, Button, Card, Input } from '../../../../infrastructure/ui/shared';
  import type { MasterState, MasterStore } from '../stores/masterStore';
  import { RESET_CONFIRMATION } from '../../domain/usecases';

  export let store: MasterStore;

  let state: MasterState = store.getState();

  let tenantName = '';
  let tenantSlug = '';
  let tenantCurrency = 'CUP';
  let adminUser = '';
  let adminPass = '';
  let resetConfirm = '';
  let formError = '';

  onMount(() => {
    const unsub = store.subscribe((s: MasterState) => {
      state = s;
    });
    void store.loadAll();
    return unsub;
  });

  $: isMaster = state.role === 'master';

  $: groupedModules = state.moduleCatalog.reduce(
    (acc: Record<string, typeof state.moduleCatalog>, meta) => {
      const key = meta.group || 'otros';
      acc[key] = acc[key] ? [...acc[key], meta] : [meta];
      return acc;
    },
    {},
  );

  async function handleCreateTenant(e: Event) {
    e.preventDefault();
    formError = '';
    if (!tenantName.trim()) {
      formError = 'Indique el nombre del negocio';
      return;
    }
    try {
      await store.addTenant({
        name: tenantName.trim(),
        slug: tenantSlug.trim() || undefined,
        currency: tenantCurrency.trim() || undefined,
        adminUser: adminUser.trim() || undefined,
        adminPass: adminPass || undefined,
      });
      tenantName = '';
      tenantSlug = '';
      adminUser = '';
      adminPass = '';
    } catch {
      /* error en el estado del store */
    }
  }

  async function handleToggle(id: string, enabled: boolean) {
    try {
      await store.toggleModule(id, enabled);
    } catch {
      /* error en el estado del store */
    }
  }

  async function handleReset(e: Event) {
    e.preventDefault();
    if (!confirm('Esta acción borra los datos de negocio y deja la aplicación como recién instalada. ¿Continuar?')) {
      return;
    }
    try {
      await store.reset(resetConfirm);
      resetConfirm = '';
    } catch {
      /* error en el estado del store */
    }
  }
</script>

<Card>
  <div class="head">
    <h2>Módulos del negocio</h2>
    <Badge tone={isMaster ? 'ok' : 'default'}>{isMaster ? 'Rol master' : `Rol ${state.role || '—'}`}</Badge>
  </div>

  {#if state.status === 'loading'}
    <p class="muted">Cargando configuración…</p>
  {:else if state.status === 'error'}
    <p class="err">{state.error}</p>
    <Button variant="secondary" on:click={() => store.loadAll()}>Reintentar</Button>
  {:else}
    {#if !isMaster}
      <p class="muted">Solo el rol master puede activar o desactivar módulos.</p>
    {/if}
    {#each Object.keys(groupedModules) as group (group)}
      <h3>{group}</h3>
      <ul class="modules">
        {#each groupedModules[group] as meta (meta.id)}
          <li>
            <label class="switch" for={`mod-${meta.id}`}>
              <input
                id={`mod-${meta.id}`}
                type="checkbox"
                checked={state.modules[meta.id] === true || meta.core}
                disabled={!isMaster || meta.core || state.saving}
                on:change={(e) => handleToggle(meta.id, e.currentTarget.checked)}
              />
              <span>
                <strong>{meta.name}</strong>
                {#if meta.core}<em> · núcleo</em>{/if}
                <small>{meta.description}</small>
              </span>
            </label>
          </li>
        {/each}
      </ul>
    {/each}
  {/if}

  {#if state.notice}
    <p class="ok">{state.notice}</p>
  {/if}
</Card>

{#if isMaster}
  <Card>
    <h2>Negocios de la instancia</h2>
    {#if state.tenants.length === 0}
      <p class="muted">No hay negocios listados.</p>
    {:else}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Slug</th>
              <th>Moneda</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {#each state.tenants as tenant (tenant.id)}
              <tr>
                <td>{tenant.name}</td>
                <td>{tenant.slug}</td>
                <td>{tenant.currency}</td>
                <td>{tenant.active ? 'Activo' : 'Inactivo'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

    <h3>Crear negocio</h3>
    <form on:submit={handleCreateTenant}>
      <div class="grid">
        <Input id="tenant-name" label="Nombre" bind:value={tenantName} placeholder="Mi negocio" />
        <Input id="tenant-slug" label="Slug" bind:value={tenantSlug} placeholder="mi-negocio" />
        <Input id="tenant-currency" label="Moneda" bind:value={tenantCurrency} placeholder="CUP" />
        <Input id="tenant-admin" label="Usuario administrador" bind:value={adminUser} placeholder="admin" />
        <Input id="tenant-pass" label="Contraseña" type="password" bind:value={adminPass} placeholder="mínimo 6" />
      </div>
      {#if formError}
        <p class="err">{formError}</p>
      {/if}
      <Button type="submit" disabled={state.saving}>
        {state.saving ? 'Creando…' : 'Crear negocio'}
      </Button>
    </form>
  </Card>

  <Card>
    <h2>Reinicio de fábrica</h2>
    <p class="warn">
      Elimina los datos de negocio de la instancia y deja la aplicación en estado inicial.
      Escriba {RESET_CONFIRMATION} para habilitar el botón.
    </p>
    <form on:submit={handleReset}>
      <Input id="reset-confirm" label="Confirmación" bind:value={resetConfirm} placeholder={RESET_CONFIRMATION} />
      <Button variant="danger" type="submit" disabled={state.saving || resetConfirm.trim() !== RESET_CONFIRMATION}>
        Reiniciar aplicación
      </Button>
    </form>
  </Card>
{/if}

{#if state.error}
  <p class="err">{state.error}</p>
{/if}

<style>
  h2 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
  }
  h3 {
    margin: 1rem 0 0.4rem;
    font-size: 0.82rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--ap-text-muted);
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
  }
  .muted {
    color: var(--ap-text-muted);
    font-size: 0.82rem;
  }
  .warn {
    color: var(--ap-danger);
    font-size: 0.82rem;
  }
  .err {
    color: var(--ap-danger);
    font-size: 0.82rem;
  }
  .ok {
    color: var(--ap-ok);
    font-size: 0.82rem;
  }
  .modules {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 0.4rem;
  }
  .switch {
    display: flex;
    gap: 0.6rem;
    align-items: flex-start;
    padding: 0.5rem 0.6rem;
    border: 1px solid var(--ap-border);
    border-radius: 12px;
    font-size: 0.85rem;
    color: var(--ap-text-secondary);
    cursor: pointer;
  }
  .switch small {
    display: block;
    color: var(--ap-text-muted);
    font-size: 0.74rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0 0.8rem;
  }
  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  th {
    text-align: left;
    font-size: 0.72rem;
    text-transform: uppercase;
    color: var(--ap-text-muted);
    padding: 0.5rem 0.6rem;
    border-bottom: 1px solid var(--ap-border);
    white-space: nowrap;
  }
  td {
    padding: 0.55rem 0.6rem;
    border-bottom: 1px solid var(--ap-border);
    color: var(--ap-text-secondary);
  }
</style>
