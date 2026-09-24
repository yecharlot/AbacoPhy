<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card, Input, Money } from '../../../../infrastructure/ui/shared';
  import type { CatalogStore, CatalogState } from '../stores/catalogStore';
  import type { Product } from '../../domain/entities/Product';
  import { DevSeedPanel } from '../../../../infrastructure/ui/dev';
  import { buildSampleProductsPayload, seedProductsViaStore } from '../dev/productsSeed';

  export let store: CatalogStore;
  export let currencyCode = 'CUP';

  let state: CatalogState = {
    status: 'idle',
    products: [],
    measureUnits: [],
    currencies: [],
    error: null,
    saving: false
  };
  let activeTab = 'productos';

  // Form states for Products
  let prodCode = '';
  let prodName = '';
  let prodUnit = 'U';
  let prodCategory = '';
  let prodCostStd = '0';
  let prodPriceSale = '0';
  let editingProdId: string | null = null;

  // Form states for Measure Units
  let muCode = '';
  let muName = '';
  let muSymbol = '';

  onMount(() => {
    const unsub = store.subscribe((s) => {
      state = s;
    });
    void store.loadAll();
    return unsub;
  });

  function startEditProduct(p: Product) {
    editingProdId = p.id;
    prodCode = p.code;
    prodName = p.name;
    prodUnit = p.unit || 'U';
    prodCategory = p.category;
    prodCostStd = String(p.costStd);
    prodPriceSale = String(p.priceSale);
  }

  function cancelEditProduct() {
    editingProdId = null;
    prodCode = '';
    prodName = '';
    prodUnit = 'U';
    prodCategory = '';
    prodCostStd = '0';
    prodPriceSale = '0';
  }

  async function handleProductSubmit(e: Event) {
    e.preventDefault();
    if (!prodName.trim()) return;
    try {
      if (editingProdId) {
        await store.editProduct({
          id: editingProdId,
          code: prodCode.trim() || undefined,
          name: prodName.trim(),
          unit: prodUnit,
          category: prodCategory.trim() || undefined,
          costStd: parseFloat(prodCostStd) || 0,
          priceSale: parseFloat(prodPriceSale) || 0,
        });
      } else {
        await store.addProduct({
          code: prodCode.trim() || undefined,
          name: prodName.trim(),
          unit: prodUnit,
          category: prodCategory.trim() || undefined,
          costStd: parseFloat(prodCostStd) || 0,
          priceSale: parseFloat(prodPriceSale) || 0,
        });
      }
      cancelEditProduct();
    } catch {
      // Handled in store error state
    }
  }

  async function handleMuSubmit(e: Event) {
    e.preventDefault();
    if (!muCode.trim() || !muName.trim()) return;
    try {
      await store.addMeasureUnit({
        code: muCode.trim(),
        name: muName.trim(),
        symbol: muSymbol.trim() || undefined,
      });
      muCode = '';
      muName = '';
      muSymbol = '';
    } catch {
      // Handled in store error state
    }
  }

  async function handleRemoveMu(id: string) {
    if (!confirm('¿Eliminar esta unidad de medida?')) return;
    try {
      await store.removeMeasureUnit(id);
    } catch {
      // Handled in store error state
    }
  }
</script>

<Card>
  <DevSeedPanel
    title="Carga masiva de productos"
    description="JSON: products[] con name, unit, category, price_sale, cost_std. Solo desarrollo."
    sample={buildSampleProductsPayload()}
    onSeed={(data) => seedProductsViaStore(store, data)}
  />
  <h2 style="margin-top:0">Nomencladores / Catálogo</h2>
  <div class="tabs">
    <button
      class="tab-btn"
      class:active={activeTab === 'productos'}
      on:click={() => (activeTab = 'productos')}
    >
      Productos
    </button>
    <button
      class="tab-btn"
      class:active={activeTab === 'medidas'}
      on:click={() => (activeTab = 'medidas')}
    >
      Unidades de Medida
    </button>
    <button
      class="tab-btn"
      class:active={activeTab === 'monedas'}
      on:click={() => (activeTab = 'monedas')}
    >
      Monedas
    </button>
  </div>
  <p class="muted">
    Gestión unificada de nomencladores comerciales y configuración contable básica.
  </p>
</Card>

{#if state.status === 'loading' && state.products.length === 0 && state.measureUnits.length === 0}
  <Card>
    <p class="muted">Cargando información del catálogo…</p>
  </Card>
{:else if state.status === 'error' && state.products.length === 0 && state.measureUnits.length === 0}
  <Card>
    <p class="err" role="alert">{state.error}</p>
    <Button variant="secondary" on:click={() => store.loadAll()}>Reintentar</Button>
  </Card>
{:else}
  {#if activeTab === 'productos'}
    <div class="grid-layout">
      <Card>
        <h3 style="margin-top:0">
          {editingProdId ? 'Editar Producto' : 'Alta de Producto'}
        </h3>
        <form on:submit={handleProductSubmit}>
          <Input id="p-code" label="Código (Auto si vacío)" bind:value={prodCode} disabled={state.saving} />
          <Input id="p-name" label="Nombre del Producto" bind:value={prodName} required disabled={state.saving} />

          <label class="lbl" for="p-unit">Unidad de medida</label>
          <select id="p-unit" class="select-inp" bind:value={prodUnit} disabled={state.saving}>
            <option value="U">U — Unidad</option>
            {#each state.measureUnits as mu}
              <option value={mu.code}>{mu.code} — {mu.name}</option>
            {/each}
          </select>

          <Input id="p-cat" label="Categoría" bind:value={prodCategory} disabled={state.saving} />
          <Input id="p-cost" label="Costo Estándar" type="number" step="0.01" bind:value={prodCostStd} disabled={state.saving} />
          <Input id="p-price" label="Precio de Venta" type="number" step="0.01" bind:value={prodPriceSale} disabled={state.saving} />

          {#if state.error}
            <p class="err" role="alert">{state.error}</p>
          {/if}

          <div class="form-actions">
            <Button type="submit" disabled={state.saving}>
              {state.saving ? 'Guardando…' : editingProdId ? 'Actualizar' : 'Registrar'}
            </Button>
            {#if editingProdId}
              <Button variant="secondary" disabled={state.saving} on:click={cancelEditProduct}>
                Cancelar
              </Button>
            {/if}
          </div>
        </form>
      </Card>

      <Card>
        <h3 style="margin-top:0">Listado de Productos</h3>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>UM</th>
                <th>Categoría</th>
                <th style="text-align:right">Costo</th>
                <th style="text-align:right">Precio</th>
                <th style="text-align:center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {#if state.products.length === 0}
                <tr>
                  <td colspan="7" class="muted" style="text-align:center">Sin productos registrados</td>
                </tr>
              {:else}
                {#each state.products as p}
                  <tr>
                    <td><code>{p.code}</code></td>
                    <td>{p.name}</td>
                    <td><span class="badge-um">{p.unit || 'U'}</span></td>
                    <td class="muted">{p.category || '—'}</td>
                    <td style="text-align:right"><Money amount={p.costStd} currency={currencyCode} /></td>
                    <td style="text-align:right"><Money amount={p.priceSale} currency={currencyCode} /></td>
                    <td style="text-align:center">
                      <Button variant="ghost" size="sm" on:click={() => startEditProduct(p)}>
                        Editar
                      </Button>
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  {:else if activeTab === 'medidas'}
    <div class="grid-layout">
      <Card>
        <h3 style="margin-top:0">Agregar Unidad de Medida</h3>
        <form on:submit={handleMuSubmit}>
          <Input id="mu-code" label="Código (Ej: KG, L, BD)" bind:value={muCode} required disabled={state.saving} />
          <Input id="mu-name" label="Nombre (Ej: Kilogramo)" bind:value={muName} required disabled={state.saving} />
          <Input id="mu-symbol" label="Símbolo (Ej: kg)" bind:value={muSymbol} disabled={state.saving} />

          {#if state.error}
            <p class="err" role="alert">{state.error}</p>
          {/if}

          <Button type="submit" disabled={state.saving}>
            {state.saving ? 'Guardando…' : 'Agregar Unidad'}
          </Button>
        </form>
      </Card>

      <Card>
        <h3 style="margin-top:0">Unidades Disponibles</h3>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Símbolo</th>
                <th style="text-align:center">Estado</th>
                <th style="text-align:center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {#if state.measureUnits.length === 0}
                <tr>
                  <td colspan="5" class="muted" style="text-align:center">Sin unidades registradas</td>
                </tr>
              {:else}
                {#each state.measureUnits as mu}
                  <tr>
                    <td><code>{mu.code}</code></td>
                    <td>{mu.name}</td>
                    <td>{mu.symbol || '—'}</td>
                    <td style="text-align:center">
                      <span class={mu.active ? 'txt-ok' : 'txt-muted'}>
                        {mu.active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td style="text-align:center">
                      <Button variant="ghost" size="sm" disabled={state.saving} on:click={() => handleRemoveMu(mu.id)}>
                        Eliminar
                      </Button>
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  {:else if activeTab === 'monedas'}
    <Card>
      <h3 style="margin-top:0">Monedas y Tasas de Cambio</h3>
      <p class="muted">Lista de lectura de las monedas configuradas en el sistema para transacciones multimoneda.</p>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th style="text-align:right">Tasa de Cambio (Base)</th>
              <th style="text-align:center">Activa</th>
            </tr>
          </thead>
          <tbody>
            {#if state.currencies.length === 0}
              <tr>
                <td colspan="4" class="muted" style="text-align:center">No hay monedas configuradas o devueltas por el servidor</td>
              </tr>
            {:else}
              {#each state.currencies as c}
                <tr>
                  <td><code>{c.code}</code></td>
                  <td>{c.name}</td>
                  <td style="text-align:right; font-variant-numeric: tabular-nums;">{c.rate.toFixed(4)}</td>
                  <td style="text-align:center">
                    <span class={c.active ? 'txt-ok' : 'txt-muted'}>
                      {c.active ? 'Sí' : 'No'}
                    </span>
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    </Card>
  {/if}
{/if}

<style>
  .tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }
  .tab-btn {
    background: var(--color-surface-soft, var(--ap-bg));
    color: var(--ap-text-secondary);
    border: 1px solid var(--ap-border);
    padding: 8px 16px;
    border-radius: var(--radius-pill, 999px);
    cursor: pointer;
    font-weight: 600;
    font-size: 0.85rem;
    transition: all 150ms ease;
  }
  .tab-btn.active {
    background: var(--gradient-primary-btn, linear-gradient(135deg, #61e6e1, #b7f56a));
    color: #0a1210;
    border-color: transparent;
  }
  .muted {
    color: var(--ap-text-secondary);
    font-size: 0.9rem;
    margin: 4px 0 0 0;
  }
  .err {
    color: var(--ap-danger);
    font-size: 0.88rem;
    margin: 8px 0;
  }
  .grid-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    align-items: start;
    margin-top: 16px;
  }
  @media (min-width: 900px) {
    .grid-layout {
      grid-template-columns: 320px 1fr;
    }
  }
  .lbl {
    display: block;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ap-text-muted);
    margin-bottom: 6px;
  }
  .select-inp {
    width: 100%;
    padding: 12px 14px;
    margin-bottom: 0.75rem;
    background: var(--color-surface-soft, var(--ap-bg));
    border: 1px solid var(--color-border, var(--ap-border));
    border-radius: var(--radius-md, 12px);
    color: var(--color-text-primary, var(--ap-text));
    font-family: inherit;
    font-size: 0.92rem;
  }
  .select-inp:focus {
    outline: none;
    border-color: var(--ap-primary);
  }
  .form-actions {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }
  .table-container {
    overflow-x: auto;
    width: 100%;
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
    text-align: left;
  }
  .data-table th {
    padding: 10px 12px;
    border-bottom: 2px solid var(--ap-border);
    color: var(--ap-text-secondary);
    font-weight: 600;
  }
  .data-table td {
    padding: 10px 12px;
    border-bottom: 1px solid var(--ap-border);
    color: var(--ap-text);
    vertical-align: middle;
  }
  .badge-um {
    background: var(--color-surface-soft, var(--ap-bg));
    border: 1px solid var(--ap-border);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.78rem;
    font-weight: 600;
  }
  .txt-ok {
    color: var(--ap-ok, #4caf50);
    font-weight: 500;
  }
  .txt-muted {
    color: var(--ap-text-muted);
  }
</style>
