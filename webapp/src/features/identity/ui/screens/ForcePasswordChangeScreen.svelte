<script lang="ts">
  interface Props {
    onSubmit: (currentPassword: string, newPassword: string) => void | Promise<void>;
  }

  let { onSubmit }: Props = $props();
  let currentPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');
  let loading = $state(false);
  let error = $state('');

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    error = '';
    if (newPassword.length < 12) {
      error = 'La nueva contraseña debe tener al menos 12 caracteres.';
      return;
    }
    if (newPassword !== confirmPassword) {
      error = 'La confirmación no coincide con la nueva contraseña.';
      return;
    }
    loading = true;
    try {
      await onSubmit(currentPassword, newPassword);
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'No se pudo actualizar la contraseña.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>ÁbacoPhy · Seguridad de la cuenta</title>
</svelte:head>

<main class="security-page">
  <section class="security-card" aria-labelledby="security-title">
    <div class="mark" aria-hidden="true">A</div>
    <p class="eyebrow">PRIMER ACCESO · SEGURIDAD</p>
    <h1 id="security-title">Crea tu contraseña privada</h1>
    <p class="intro">
      Esta cuenta utiliza una credencial temporal. Antes de continuar, establece una contraseña que solo tú conozcas.
    </p>

    <form onsubmit={submit}>
      <label for="current-password">Contraseña temporal actual</label>
      <input id="current-password" type="password" autocomplete="current-password"
        bind:value={currentPassword} required disabled={loading} />

      <label for="new-password">Nueva contraseña</label>
      <input id="new-password" type="password" autocomplete="new-password"
        bind:value={newPassword} minlength="12" required disabled={loading} />

      <label for="confirm-password">Confirmar nueva contraseña</label>
      <input id="confirm-password" type="password" autocomplete="new-password"
        bind:value={confirmPassword} minlength="12" required disabled={loading} />

      {#if error}
        <p class="error" role="alert">{error}</p>
      {/if}

      <button type="submit" disabled={loading || !currentPassword || !newPassword || !confirmPassword}>
        {loading ? 'Actualizando…' : 'Guardar contraseña y continuar'}
      </button>
    </form>

    <p class="hint">Usa al menos 12 caracteres. Una frase larga y única es una buena opción.</p>
  </section>
</main>

<style>
  .security-page {
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: 24px;
    color: var(--color-text-primary);
    background:
      radial-gradient(circle at 15% 15%, rgba(67,216,211,.13), transparent 34%),
      radial-gradient(circle at 85% 85%, rgba(168,234,95,.10), transparent 30%),
      var(--color-bg);
  }
  .security-card {
    width: min(460px, 100%);
    padding: clamp(26px, 5vw, 42px);
    border: 1px solid var(--color-border, rgba(255,255,255,.13));
    border-radius: 24px;
    background: var(--color-surface, rgba(23,27,41,.92));
    box-shadow: var(--shadow-float, 0 25px 70px rgba(0,0,0,.25));
  }
  .mark {
    width: 44px; height: 44px; display: grid; place-items: center;
    margin-bottom: 26px; border-radius: 14px;
    color: var(--accent-cyan, #61e6e1); background: rgba(97,230,225,.12);
    font-weight: 850; font-size: 1.2rem;
  }
  .eyebrow { margin: 0 0 9px; color: var(--accent-cyan, #61e6e1); font-size: .68rem; font-weight: 800; letter-spacing: .16em; }
  h1 { margin: 0; font-size: clamp(1.8rem, 5vw, 2.35rem); letter-spacing: -.045em; line-height: 1.08; }
  .intro { margin: 15px 0 26px; color: var(--color-text-secondary); font-size: .9rem; line-height: 1.6; }
  form { display: grid; gap: 10px; }
  label { margin-top: 7px; font-size: .78rem; font-weight: 650; color: var(--color-text-secondary); }
  input {
    width: 100%; min-height: 48px; padding: 0 14px;
    border: 1px solid var(--color-border, rgba(255,255,255,.14));
    border-radius: 12px; background: var(--color-bg, rgba(5,8,18,.45));
    color: var(--color-text-primary); font: inherit;
  }
  input:focus { outline: 2px solid var(--accent-cyan, #61e6e1); outline-offset: 1px; }
  button {
    min-height: 49px; margin-top: 13px; border: 0; border-radius: 13px;
    background: var(--accent-cyan, #61e6e1); color: #071018;
    font: inherit; font-weight: 800; cursor: pointer;
  }
  button:disabled { opacity: .55; cursor: wait; }
  .error { margin: 4px 0; padding: 10px 12px; border-radius: 10px; color: #ffaaaa; background: rgba(241,123,123,.09); font-size: .78rem; }
  .hint { margin: 18px 0 0; color: var(--color-text-muted); font-size: .72rem; line-height: 1.5; }
</style>
