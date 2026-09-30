<script lang="ts">
  import {
    findProfilePhotoByEmail,
    type PhotoCandidate,
    type PhotoSearchProgress,
  } from '../../domain/services/findProfilePhotos';
  import {Button} from "../../../../infrastructure/ui/shared";

  /** Correo de contacto (bind desde el formulario). */
  export let email: string = '';
  export let selectedUrl: string = '';
  export let disabled: boolean = false;
  export let onSelect: (url: string) => void = () => {};

  let progress: PhotoSearchProgress | null = null;
  let selectedId: string | null = null;
  let abortCtrl: AbortController | null = null;
  let lastEmail = '';

  $: candidates = progress?.candidates ?? [];
  $: busy = progress?.phase === 'querying_gravatar';
  $: emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());

  function cancel() {
    abortCtrl?.abort();
    abortCtrl = null;
    if (progress && busy) {
      progress = {
        ...progress,
        phase: 'cancelled',
        message: 'Búsqueda cancelada. Puede guardar sin foto.',
      };
    }
  }

  async function startSearch(force = false) {
    const e = (email || '').trim().toLowerCase();
    if (!e) {
      progress = {
        phase: 'done',
        message: 'Escriba un correo para poder buscar foto.',
        emailsFound: 0,
        photosFound: 0,
        candidates: [],
      };
      return;
    }
    if (!force && e === lastEmail && progress?.phase === 'done') return;
    if (disabled) return;

    cancel();
    abortCtrl = new AbortController();
    lastEmail = e;
    selectedId = null;
    progress = {
      phase: 'querying_gravatar',
      message: 'Consultando Gravatar…',
      emailsFound: 1,
      photosFound: 0,
      candidates: [],
    };

    const result = await findProfilePhotoByEmail({
      email: e,
      signal: abortCtrl.signal,
      onProgress: (p) => {
        progress = p;
      },
    });
    progress = result;
    abortCtrl = null;
  }

  /** Llamar desde el padre al blur del campo correo. */
  export function triggerSearch() {
    if (emailOk) void startSearch(true);
  }

  function pick(c: PhotoCandidate) {
    selectedId = c.id;
  }

  function confirmSelection() {
    const c = candidates.find((x) => x.id === selectedId);
    if (!c) return;
    onSelect(c.avatarUrl);
    selectedUrl = c.avatarUrl;
  }

  function clearPhoto() {
    selectedId = null;
    onSelect('');
    selectedUrl = '';
  }

  function skipWithoutPhoto() {
    cancel();
    clearPhoto();
    progress = {
      phase: 'done',
      message: 'Sin foto de perfil. El correo se guardará en metadata.',
      emailsFound: 0,
      photosFound: 0,
      candidates: [],
    };
  }
</script>

<div class="photo-picker" data-testid="employee-photo-picker">
  <div class="picker-head">
    <div>
      <p class="lbl">Foto de perfil (Gravatar)</p>
      <p class="hint">
        Solo si hay correo. No se inventan direcciones. La foto se elige manualmente; el correo se
        guarda en metadata del empleado (y del usuario si aplica).
      </p>
    </div>
    <div class="head-actions">
      <Button
        type="button"
        variant="secondary"
        disabled={disabled || busy || !emailOk}
        onclick={() => startSearch(true)}
      >
        {busy ? 'Buscando…' : 'Buscar foto'}
      </Button>
      {#if busy}
        <Button type="button" variant="secondary" onclick={cancel}>Cancelar</Button>
      {/if}
    </div>
  </div>

  {#if selectedUrl}
    <div class="current">
      <img src={selectedUrl} alt="Foto seleccionada" class="avatar current-avatar" />
      <div>
        <p class="ok-line">Foto seleccionada</p>
        <Button type="button" variant="secondary" disabled={disabled} onclick={clearPhoto}
          >Quitar foto</Button
        >
      </div>
    </div>
  {/if}

  {#if progress}
    <p class="status" class:err={progress.phase === 'error'} class:busy role="status">
      {progress.message}
    </p>
  {/if}

  {#if candidates.length > 0}
    <ul class="grid">
      {#each candidates as c (c.id)}
        <li>
          <button
            type="button"
            class="card"
            class:selected={selectedId === c.id}
            disabled={disabled}
            onclick={() => pick(c)}
          >
            <img
              src={c.avatarUrl}
              alt="Candidata"
              class="avatar"
              loading="lazy"
              onerror={(e) => {
                (e.currentTarget as HTMLImageElement).style.opacity = '0.3';
              }}
            />
            <span class="email">{c.email}</span>
            {#if c.displayName}
              <span class="meta">{c.displayName}</span>
            {/if}
            <span class="meta">{c.sourceLabel}</span>
          </button>
        </li>
      {/each}
    </ul>
    <div class="confirm-row">
      <Button type="button" disabled={disabled || !selectedId} onclick={confirmSelection}
        >Usar foto seleccionada</Button
      >
      <Button type="button" variant="secondary" disabled={disabled} onclick={skipWithoutPhoto}
        >Continuar sin foto</Button
      >
    </div>
  {:else if progress && (progress.phase === 'done' || progress.phase === 'error' || progress.phase === 'cancelled')}
    <div class="confirm-row">
      <Button type="button" variant="secondary" disabled={disabled} onclick={skipWithoutPhoto}
        >Continuar sin foto</Button
      >
      {#if progress.phase === 'error' || progress.photosFound === 0}
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || busy || !emailOk}
          onclick={() => startSearch(true)}
        >
          Reintentar
        </Button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .photo-picker {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    padding: 0.75rem;
    border-radius: 12px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: color-mix(in srgb, var(--color-surface-soft, transparent) 80%, transparent);
  }
  .picker-head {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.5rem;
    align-items: flex-start;
  }
  .lbl {
    margin: 0;
    font-size: 0.62rem;
    font-weight: 650;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-muted);
  }
  .hint {
    margin: 0.2rem 0 0;
    font-size: 0.75rem;
    color: var(--color-text-secondary, var(--ap-text-secondary));
    max-width: 40rem;
  }
  .head-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .status {
    margin: 0;
    font-size: 0.82rem;
    color: var(--color-text-secondary);
  }
  .status.busy {
    color: var(--accent-cyan, #2dd4bf);
  }
  .status.err {
    color: var(--accent-red, #f17b7b);
  }
  .grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    gap: 0.55rem;
  }
  .card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    width: 100%;
    padding: 0.5rem;
    border-radius: 12px;
    border: 2px solid var(--color-border, var(--ap-border));
    background: var(--color-bg, #050812);
    color: inherit;
    cursor: pointer;
    font: inherit;
  }
  .card.selected {
    border-color: var(--accent-cyan, #2dd4bf);
    box-shadow: 0 0 0 1px var(--accent-cyan, #2dd4bf);
  }
  .avatar {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    object-fit: cover;
    background: #1a1f2e;
  }
  .current {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .current-avatar {
    width: 56px;
    height: 56px;
  }
  .ok-line {
    margin: 0 0 0.35rem;
    font-size: 0.85rem;
    color: var(--accent-green, #b7f56a);
  }
  .email {
    font-size: 0.65rem;
    word-break: break-all;
    text-align: center;
    color: var(--color-text-muted);
  }
  .meta {
    font-size: 0.62rem;
    color: var(--color-text-muted);
    text-align: center;
  }
  .confirm-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
</style>
