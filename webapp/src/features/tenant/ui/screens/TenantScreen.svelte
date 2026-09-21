<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card, Input } from '../../../../infrastructure/ui/shared';
  import type { TenantStore, TenantState } from '../stores/tenantStore';

  interface Props {
    store: TenantStore;
    canEdit?: boolean;
  }

  let { store, canEdit = true }: Props = $props();

  // Prefer explicit annotation over $state<T>() — avoids TS/svelte-check rune issues
  let state: TenantState = $state(store.getState());
  let name = $state('');
  let currency = $state('CUP');
  let phone = $state('');
  let address = $state('');
  let email = $state('');
  let taxId = $state('');
  let savedMsg = $state('');

  function syncForm(tenant: TenantState['tenant']) {
    if (!tenant) return;
    name = tenant.name;
    currency = tenant.currency || 'CUP';
    phone = tenant.phone;
    address = tenant.address;
    email = tenant.email;
    taxId = tenant.taxId;
  }

  onMount(() => {
    const unsub = store.subscribe((s) => {
      state = s;
      if (s.tenant && (s.status === 'success' || s.status === 'empty')) {
        syncForm(s.tenant);
      }
    });
    void store.load();
    return unsub;
  });

  async function handleSave(e: Event) {
    e.preventDefault();
    if (!canEdit || state.saving) return;
    savedMsg = '';
    try {
      await store.save({ name, currency, phone, address, email, taxId });
      savedMsg = 'Datos guardados';
      setTimeout(() => {
        savedMsg = '';
      }, 2500);
    } catch {
      /* error in state */
    }
  }
</script>

{#if state.status === 'loading' && !state.tenant}
  <Card>
    <p class="muted">Cargando datos del negocio…</p>
  </Card>
{:else if state.status === 'error' && !state.tenant}
  <Card>
    <p class="err" role="alert">{state.error}</p>
    <Button variant="secondary" onclick={() => store.load()}>Reintentar</Button>
  </Card>
{:else}
  <Card>
    <h2 style="margin-top:0">Negocio</h2>
    <p class="muted">
      Datos del tenant. {#if !canEdit}Solo lectura (sin vista <code>tenant</code>).{/if}
    </p>
    {#if state.tenant?.slug}
      <p class="meta">Slug: {state.tenant.slug}</p>
    {/if}

    <form onsubmit={handleSave}>
      <Input id="t-name" label="Nombre" bind:value={name} disabled={!canEdit || state.saving} required />
      <Input id="t-currency" label="Moneda" bind:value={currency} disabled={!canEdit || state.saving} />
      <Input id="t-phone" label="Teléfono" type="tel" bind:value={phone} disabled={!canEdit || state.saving} />
      <Input id="t-email" label="Email" type="email" bind:value={email} disabled={!canEdit || state.saving} />
      <Input id="t-address" label="Dirección" bind:value={address} disabled={!canEdit || state.saving} />
      <Input id="t-tax" label="NIT / Id. fiscal" bind:value={taxId} disabled={!canEdit || state.saving} />

      {#if state.error}
        <p class="err" role="alert">{state.error}</p>
      {/if}
      {#if savedMsg}
        <p class="ok">{savedMsg}</p>
      {/if}

      {#if canEdit}
        <Button type="submit" disabled={state.saving}>
          {state.saving ? 'Guardando…' : 'Guardar'}
        </Button>
      {/if}
    </form>
  </Card>
{/if}

<style>
  .muted {
    color: var(--ap-text-secondary);
    font-size: 0.9rem;
  }
  .meta {
    font-size: 0.8rem;
    color: var(--ap-text-muted);
  }
  .err {
    color: var(--ap-danger);
    font-size: 0.88rem;
  }
  .ok {
    color: var(--ap-ok);
    font-size: 0.88rem;
  }
</style>
