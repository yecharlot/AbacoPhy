<script lang="ts">
  export type PredictiveItem = {
    id: string;
    label: string;
    hint?: string;
  };

  interface Props {
    items: PredictiveItem[];
    /** id seleccionado (controlado) */
    value?: string;
    placeholder?: string;
    disabled?: boolean;
    emptyText?: string;
    /** máx. resultados visibles */
    limit?: number;
    id?: string;
    /** llamado al elegir ítem */
    onSelect?: (item: PredictiveItem) => void;
    /** al limpiar */
    onClear?: () => void;
  }

  let {
    items = [],
    value = '',
    placeholder = 'Buscar…',
    disabled = false,
    emptyText = 'Sin coincidencias',
    limit = 40,
    id = undefined,
    onSelect,
    onClear,
  }: Props = $props();

  let query = $state('');
  let open = $state(false);

  $effect(() => {
    if (!value) {
      if (!open) query = '';
      return;
    }
    const found = items.find((i) => i.id === value);
    if (found && !open) query = found.label;
  });

  function matches(): PredictiveItem[] {
    const q = query.trim().toLowerCase();
    const list = items;
    if (!q) return list.slice(0, limit);
    const out: PredictiveItem[] = [];
    for (const it of list) {
      const hay = `${it.label} ${it.hint || ''}`.toLowerCase();
      if (hay.includes(q)) {
        out.push(it);
        if (out.length >= limit) break;
      }
    }
    return out;
  }

  function select(it: PredictiveItem) {
    query = it.label;
    open = false;
    onSelect?.(it);
  }

  function clear() {
    query = '';
    open = true;
    onClear?.();
  }

  function onInput(e: Event) {
    query = (e.currentTarget as HTMLInputElement).value;
    open = true;
    if (value) onClear?.();
  }
</script>

<div class="pp">
  <div class="pp-control">
    <input
      {id}
      type="search"
      class="pp-input"
      {placeholder}
      {disabled}
      value={query}
      autocomplete="off"
      oninput={onInput}
      onfocus={() => (open = true)}
    />
    {#if value || query}
      <button type="button" class="pp-clear" {disabled} onclick={clear} aria-label="Limpiar">×</button>
    {/if}
  </div>
  {#if open && !disabled}
    {@const list = matches()}
    <ul class="pp-list" role="listbox">
      {#if list.length === 0}
        <li class="pp-empty">{emptyText}</li>
      {:else}
        {#each list as it (it.id)}
          <li role="option">
            <button type="button" class="pp-opt" class:sel={it.id === value} onclick={() => select(it)}>
              <span class="pp-lab">{it.label}</span>
              {#if it.hint}<span class="pp-hint">{it.hint}</span>{/if}
            </button>
          </li>
        {/each}
      {/if}
    </ul>
  {/if}
</div>

<style>
  .pp {
    position: relative;
    margin-bottom: 0.75rem;
  }
  .pp-control {
    position: relative;
    display: flex;
    align-items: center;
  }
  .pp-input {
    width: 100%;
    padding: 11px 36px 11px 13px;
    background: var(--ap-bg, var(--color-surface));
    border: 1px solid var(--ap-border, var(--color-border));
    border-radius: 12px;
    color: var(--ap-text, inherit);
    font-family: inherit;
    font-size: 0.92rem;
  }
  .pp-clear {
    position: absolute;
    right: 8px;
    border: none;
    background: transparent;
    color: var(--ap-text-muted);
    cursor: pointer;
    font-size: 1.1rem;
    line-height: 1;
  }
  .pp-list {
    list-style: none;
    margin: 4px 0 0;
    padding: 4px;
    position: absolute;
    left: 0;
    right: 0;
    z-index: 30;
    max-height: 220px;
    overflow-y: auto;
    border-radius: 12px;
    border: 1px solid var(--ap-border, var(--color-border));
    background: var(--ap-bg-elevated, var(--color-surface-raised, #171b29));
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
  }
  .pp-opt {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.1rem;
    text-align: left;
    padding: 8px 10px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.85rem;
  }
  .pp-opt:hover,
  .pp-opt.sel {
    background: color-mix(in srgb, var(--accent-cyan, #61e6e1) 12%, transparent);
  }
  .pp-lab {
    font-weight: 600;
  }
  .pp-hint {
    font-size: 0.72rem;
    color: var(--ap-text-muted);
  }
  .pp-empty {
    padding: 8px 10px;
    font-size: 0.8rem;
    color: var(--ap-text-muted);
  }
</style>
