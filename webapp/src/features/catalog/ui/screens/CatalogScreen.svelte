<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card, Input, Money } from '../../../../infrastructure/ui/shared';
  import type { CatalogStore, CatalogState } from '../stores/catalogStore';
  import type { Product } from '../../domain/entities/Product';
  import { DevSeedPanel } from '../../../../infrastructure/ui/dev';
  import { buildSampleProductsPayload, seedProductsViaStore } from '../dev/productsSeed';

  export let store: CatalogStore;
  export let currencyCode = 'CUP';

  let state: CatalogState = store.getState();
  let activeTab: 'productos' | 'unidades' = 'productos';
  let query = '';
  let formError = '';
  let formOk = '';
  /** Toast flotante post-respuesta API */
  let toast: { kind: 'ok' | 'err'; text: string } | null = null;
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  let prodCode = '';
  let prodName = '';
  let prodUnit = 'ud';
  let prodCategory = '';
  let prodCostStd = '';
  let prodPriceSale = '';
  let editingProdId: string | null = null;

  let muCode = '';
  let muName = '';
  let muSymbol = '';

  onMount(() => {
    const unsub = store.subscribe((s) => {
      state = s;
    });
    void store.loadAll();
    return () => {
      unsub();
      if (toastTimer) clearTimeout(toastTimer);
    };
  });

  $: filteredProducts = state.products.filter((p) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.code || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  });

  /** Categorías ya usadas en productos (sugerencias). */
  $: categorySuggestions = [
    ...new Set(
      state.products
        .map((p) => (p.category || '').trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'es')),
    ),
  ];

  /** UM: nomenclador de medidas + unidades ya usadas en productos. */
  $: unitSuggestions = [
    ...new Set([
      ...state.measureUnits.map((u) => u.symbol || u.code).filter(Boolean),
      ...state.measureUnits.map((u) => u.code).filter(Boolean),
      ...state.products.map((p) => (p.unit || '').trim()).filter(Boolean),
      'ud',
      'kg',
      'l',
      'caja',
      'paq',
    ]),
  ].sort((a, b) => a.localeCompare(b, 'es'));

  function showToast(kind: 'ok' | 'err', text: string) {
    toast = { kind, text };
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast = null;
    }, 4200);
  }

  function resetProductForm() {
    editingProdId = null;
    prodCode = '';
    prodName = '';
    prodUnit = 'ud';
    prodCategory = '';
    prodCostStd = '';
    prodPriceSale = '';
    formError = '';
  }

  function startEditProduct(p: Product) {
    editingProdId = p.id;
    prodCode = p.code;
    prodName = p.name;
    prodUnit = p.unit || 'ud';
    prodCategory = p.category || '';
    prodCostStd = String(p.costStd ?? 0);
    prodPriceSale = String(p.priceSale ?? 0);
    formError = '';
    formOk = '';
    activeTab = 'productos';
  }

  async function handleProductSubmit(e: Event) {
    e.preventDefault();
    formError = '';
    formOk = '';
    if (!prodName.trim()) {
      formError = 'El nombre del producto es obligatorio';
      showToast('err', formError);
      return;
    }
    try {
      if (editingProdId) {
        await store.editProduct({
          id: editingProdId,
          code: prodCode.trim() || undefined,
          name: prodName.trim(),
          unit: prodUnit.trim() || 'ud',
          category: prodCategory.trim() || undefined,
          costStd: parseFloat(prodCostStd) || 0,
          priceSale: parseFloat(prodPriceSale) || 0,
        });
        formOk = 'Producto actualizado correctamente';
        showToast('ok', formOk);
      } else {
        await store.addProduct({
          code: prodCode.trim() || undefined,
          name: prodName.trim(),
          unit: prodUnit.trim() || 'ud',
          category: prodCategory.trim() || undefined,
          costStd: parseFloat(prodCostStd) || 0,
          priceSale: parseFloat(prodPriceSale) || 0,
        });
        formOk = 'Producto creado correctamente';
        showToast('ok', formOk);
      }
      resetProductForm();
    } catch (err) {
      formError = err instanceof Error ? err.message : 'No se pudo guardar el producto';
      showToast('err', formError);
    }
  }

  async function handleMuSubmit(e: Event) {
    e.preventDefault();
    formError = '';
    formOk = '';
    if (!muCode.trim() || !muName.trim()) {
      formError = 'Código y nombre de unidad de medida son obligatorios';
      showToast('err', formError);
      return;
    }
    try {
      await store.addMeasureUnit({
        code: muCode.trim(),
        name: muName.trim(),
        symbol: muSymbol.trim() || undefined,
      });
      muCode = '';
      muName = '';
      muSymbol = '';
      formOk = 'Unidad de medida creada';
      showToast('ok', formOk);
    } catch (err) {
      formError = err instanceof Error ? err.message : 'No se pudo crear la UM';
      showToast('err', formError);
    }
  }

  async function handleRemoveMu(id: string) {
    formError = '';
    try {
      await store.removeMeasureUnit(id);
      formOk = 'Unidad de medida eliminada';
      showToast('ok', formOk);
    } catch (err) {
      formError = err instanceof Error ? err.message : 'No se pudo eliminar';
      showToast('err', formError);
    }
  }
</script>

<section class="catalog" data-screen="catalog">
  {#if toast}
    <div class="toast" class:ok={toast.kind === 'ok'} class:err={toast.kind === 'err'} role="status">
      {toast.text}
    </div>
  {/if}

  {#if typeof DevSeedPanel !== 'undefined'}
    <DevSeedPanel
      title="Seed productos (DEV)"
      description="JSON: products[] con name, unit, category, price_sale, cost_std."
      sample={buildSampleProductsPayload()}
      onSeed={(data) => seedProductsViaStore(store, data)}
    />
  {/if}

  <header class="page-head">
    <div>
      <h1>Catálogo</h1>
      <p class="sub">Nomenclador de productos y unidades de medida.</p>
    </div>
    <Button variant="secondary" on:click={() => store.loadAll()} disabled={state.status === 'loading'}>
      {state.status === 'loading' ? 'Cargando…' : 'Actualizar'}
    </Button>
  </header>

  {#if state.error}
    <p class="banner err" role="alert">{state.error}</p>
  {/if}

  <div class="tabs" role="tablist">
    <button
      type="button"
      class="tab"
      class:active={activeTab === 'productos'}
      role="tab"
      aria-selected={activeTab === 'productos'}
      on:click={() => (activeTab = 'productos')}
    >
      Productos ({state.products.length})
    </button>
    <button
      type="button"
      class="tab"
      class:active={activeTab === 'unidades'}
      role="tab"
      aria-selected={activeTab === 'unidades'}
      on:click={() => (activeTab = 'unidades')}
    >
      Unidades de medida ({state.measureUnits.length})
    </button>
  </div>

  {#if activeTab === 'productos'}
    <div class="layout">
      <Card>
        <div class="card-head">
          <h2>Listado</h2>
          <div class="search-wrap">
            <Input id="prod-search" label="" bind:value={query} placeholder="Buscar código, nombre…" />
          </div>
        </div>

        {#if state.status === 'loading' && state.products.length === 0}
          <p class="muted">Cargando productos…</p>
        {:else if filteredProducts.length === 0}
          <p class="muted">
            {state.products.length === 0
              ? 'Sin productos. Cree el primero con el formulario.'
              : 'Ningún producto coincide con la búsqueda.'}
          </p>
        {:else}
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>UM</th>
                  <th>Categoría</th>
                  <th class="num">Costo</th>
                  <th class="num">Precio</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {#each filteredProducts as p (p.id)}
                  <tr>
                    <td class="mono">{p.code || '—'}</td>
                    <td>{p.name}</td>
                    <td>{p.unit || '—'}</td>
                    <td>{p.category || '—'}</td>
                    <td class="num"><Money amount={p.costStd} currency={currencyCode} /></td>
                    <td class="num"><Money amount={p.priceSale} currency={currencyCode} /></td>
                    <td>
                      <button type="button" class="link" on:click={() => startEditProduct(p)}>Editar</button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </Card>

      <Card>
        <h2>{editingProdId ? 'Editar producto' : 'Nuevo producto'}</h2>
        <p class="form-hint">
          Los campos con sugerencias proponen valores ya usados en el catálogo.
        </p>

        <form class="product-form" on:submit={handleProductSubmit}>
          <div class="form-grid">
            <label class="field">
              <span class="lbl">Código <em>(opcional)</em></span>
              <input
                id="prod-code"
                type="text"
                bind:value={prodCode}
                placeholder="Auto si vacío"
                disabled={state.saving}
                autocomplete="off"
              />
            </label>

            <label class="field field-span-2">
              <span class="lbl">Nombre <span class="req">*</span></span>
              <input
                id="prod-name"
                type="text"
                bind:value={prodName}
                placeholder="Ej. Café molido 250g"
                required
                disabled={state.saving}
                autocomplete="off"
              />
            </label>

            <label class="field">
              <span class="lbl">Unidad de medida</span>
              <input
                id="prod-unit"
                type="text"
                list="unit-suggestions"
                bind:value={prodUnit}
                placeholder="ud, kg, l…"
                disabled={state.saving}
                autocomplete="off"
              />
              <datalist id="unit-suggestions">
                {#each unitSuggestions as u}
                  <option value={u}></option>
                {/each}
              </datalist>
            </label>

            <label class="field field-span-2">
              <span class="lbl">Categoría</span>
              <input
                id="prod-cat"
                type="text"
                list="category-suggestions"
                bind:value={prodCategory}
                placeholder="Escriba o elija una existente"
                disabled={state.saving}
                autocomplete="off"
              />
              <datalist id="category-suggestions">
                {#each categorySuggestions as c}
                  <option value={c}></option>
                {/each}
              </datalist>
            </label>

            <label class="field">
              <span class="lbl">Costo estándar</span>
              <input
                id="prod-cost"
                type="number"
                min="0"
                step="any"
                bind:value={prodCostStd}
                placeholder="0.00"
                disabled={state.saving}
              />
            </label>

            <label class="field">
              <span class="lbl">Precio venta</span>
              <input
                id="prod-price"
                type="number"
                min="0"
                step="any"
                bind:value={prodPriceSale}
                placeholder="0.00"
                disabled={state.saving}
              />
            </label>
          </div>

          {#if formError}
            <p class="inline-err" role="alert">{formError}</p>
          {/if}

          <div class="form-actions">
            {#if editingProdId}
              <Button variant="secondary" type="button" on:click={resetProductForm} disabled={state.saving}>
                Cancelar
              </Button>
            {/if}
            <Button type="submit" disabled={state.saving}>
              {#if state.saving}
                <span class="spinner" aria-hidden="true"></span>
                Guardando…
              {:else if editingProdId}
                Guardar cambios
              {:else}
                Crear producto
              {/if}
            </Button>
          </div>

          {#if state.saving}
            <div class="saving-bar" aria-live="polite">
              <span class="spinner" aria-hidden="true"></span>
              Enviando solicitud al servidor…
            </div>
          {/if}
        </form>
      </Card>
    </div>
  {:else}
    <div class="layout">
      <Card>
        <h2>Unidades de medida</h2>
        {#if state.measureUnits.length === 0}
          <p class="muted">No hay UM registradas.</p>
        {:else}
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Símbolo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {#each state.measureUnits as mu (mu.id)}
                  <tr>
                    <td class="mono">{mu.code}</td>
                    <td>{mu.name}</td>
                    <td>{mu.symbol || '—'}</td>
                    <td>
                      <button type="button" class="link danger" on:click={() => handleRemoveMu(mu.id)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </Card>
      <Card>
        <h2>Nueva unidad de medida</h2>
        <form class="product-form" on:submit={handleMuSubmit}>
          <div class="form-grid">
            <label class="field">
              <span class="lbl">Código <span class="req">*</span></span>
              <input id="mu-code" type="text" bind:value={muCode} placeholder="KG" disabled={state.saving} />
            </label>
            <label class="field">
              <span class="lbl">Nombre <span class="req">*</span></span>
              <input id="mu-name" type="text" bind:value={muName} placeholder="Kilogramo" disabled={state.saving} />
            </label>
            <label class="field">
              <span class="lbl">Símbolo</span>
              <input id="mu-sym" type="text" bind:value={muSymbol} placeholder="kg" disabled={state.saving} />
            </label>
          </div>
          <div class="form-actions">
            <Button type="submit" disabled={state.saving}>
              {state.saving ? 'Guardando…' : 'Crear UM'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  {/if}
</section>

<style>
  .catalog {
    display: flex;
    flex-direction: column;
    gap: 14px;
    position: relative;
  }

  .toast {
    position: fixed;
    top: 1.25rem;
    right: 1.25rem;
    z-index: 200;
    max-width: min(360px, calc(100vw - 2rem));
    padding: 12px 16px;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 600;
    box-shadow: var(--shadow-soft, 0 12px 40px rgba(0, 0, 0, 0.35));
    border: 1px solid var(--color-border);
    animation: toast-in 220ms ease;
  }
  .toast.ok {
    background: color-mix(in srgb, var(--accent-green, #b7f56a) 18%, var(--color-surface, #12182a));
    color: var(--accent-green, #b7f56a);
  }
  .toast.err {
    background: color-mix(in srgb, var(--accent-red, #f17b7b) 18%, var(--color-surface, #12182a));
    color: var(--accent-red, #f17b7b);
  }
  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .page-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  h1 {
    margin: 0;
    font-size: 1.25rem;
    letter-spacing: -0.02em;
  }
  h2 {
    margin: 0 0 0.35rem;
    font-size: 0.95rem;
  }
  .sub {
    margin: 4px 0 0;
    font-size: 0.8rem;
    color: var(--color-text-muted, var(--ap-text-muted));
  }
  .form-hint {
    margin: 0 0 1rem;
    font-size: 0.75rem;
    color: var(--color-text-muted, var(--ap-text-muted));
  }

  .tabs {
    display: flex;
    gap: 6px;
  }
  .tab {
    border: 1px solid var(--color-border, var(--ap-border));
    background: transparent;
    color: var(--color-text-secondary, var(--ap-text-secondary));
    border-radius: 999px;
    padding: 6px 14px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
  }
  .tab.active {
    background: color-mix(in srgb, var(--accent-cyan, #61e6e1) 16%, transparent);
    border-color: color-mix(in srgb, var(--accent-cyan, #61e6e1) 40%, transparent);
    color: var(--color-text-primary, var(--ap-text));
  }

  .layout {
    display: grid;
    gap: 14px;
  }
  @media (min-width: 960px) {
    .layout {
      grid-template-columns: 1.35fr 1fr;
      align-items: start;
    }
  }

  .card-head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 0.5rem;
  }
  .search-wrap {
    flex: 1 1 180px;
    max-width: 280px;
  }

  /* —— Formulario alineado —— */
  .product-form {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px 16px;
  }
  @media (min-width: 520px) {
    .form-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
  .field-span-2 {
    grid-column: 1 / -1;
  }
  .lbl {
    font-size: 0.68rem;
    font-weight: 650;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-text-muted, var(--ap-text-muted));
  }
  .lbl em {
    font-style: normal;
    font-weight: 500;
    text-transform: none;
    letter-spacing: 0;
    opacity: 0.75;
  }
  .req {
    color: var(--accent-red, #f17b7b);
  }
  .field input {
    width: 100%;
    box-sizing: border-box;
    padding: 11px 12px;
    border-radius: 12px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: var(--color-surface-soft, var(--ap-bg, transparent));
    color: var(--color-text-primary, var(--ap-text));
    font-family: inherit;
    font-size: 0.9rem;
  }
  .field input:focus {
    outline: none;
    border-color: var(--accent-cyan, var(--ap-primary));
  }
  .field input:disabled {
    opacity: 0.55;
  }

  .form-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 1.1rem;
  }
  .inline-err {
    margin: 10px 0 0;
    font-size: 0.8rem;
    color: var(--accent-red, var(--ap-danger));
  }
  .saving-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    padding: 10px 12px;
    border-radius: 10px;
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    background: color-mix(in srgb, var(--accent-cyan, #61e6e1) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent-cyan, #61e6e1) 25%, transparent);
  }
  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid color-mix(in srgb, currentColor 25%, transparent);
    border-top-color: currentColor;
    border-radius: 50%;
    display: inline-block;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.84rem;
  }
  th {
    text-align: left;
    font-size: 0.7rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-text-muted, var(--ap-text-muted));
    padding: 0.45rem 0.5rem;
    border-bottom: 1px solid var(--color-border, var(--ap-border));
  }
  td {
    padding: 0.5rem;
    border-bottom: 1px solid var(--color-border, var(--ap-border));
    color: var(--color-text-secondary, var(--ap-text-secondary));
  }
  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.8rem;
  }
  .link {
    border: none;
    background: none;
    color: var(--accent-cyan, var(--ap-primary));
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 600;
    padding: 0;
    font-family: inherit;
  }
  .link.danger {
    color: var(--accent-red, var(--ap-danger));
  }
  .muted {
    color: var(--color-text-muted, var(--ap-text-muted));
    font-size: 0.85rem;
  }
  .banner {
    margin: 0;
    padding: 10px 12px;
    border-radius: 12px;
    font-size: 0.85rem;
  }
  .banner.err {
    background: color-mix(in srgb, var(--accent-red, #f17b7b) 12%, transparent);
    color: var(--accent-red, var(--ap-danger));
  }
</style>
