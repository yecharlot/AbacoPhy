<script lang="ts">
  import { Button, Card, Input } from '../../../../infrastructure/ui/shared';

  interface Props {
    loading?: boolean;
    error?: string | null;
    onSubmit: (username: string, password: string) => void | Promise<void>;
  }

  let { loading = false, error = null, onSubmit }: Props = $props();

  let username = $state('');
  let password = $state('');

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (loading) return;
    await onSubmit(username, password);
  }
</script>

<div class="wrap">
  <Card>
    <div class="brand">
      <div class="mark" aria-hidden="true"></div>
      <h1>Ábaco<span class="accent">Phy</span></h1>
      <p class="muted">Sistema contable para negocios</p>
    </div>
    <form onsubmit={handleSubmit}>
      <Input
        id="login-user"
        label="Usuario"
        autocomplete="username"
        bind:value={username}
        required
        disabled={loading}
      />
      <Input
        id="login-pass"
        label="Contraseña"
        type="password"
        autocomplete="current-password"
        bind:value={password}
        required
        disabled={loading}
      />
      {#if error}
        <p class="err" role="alert">{error}</p>
      {/if}
      <Button type="submit" fullWidth disabled={loading}>
        {loading ? 'Entrando…' : 'Iniciar sesión'}
      </Button>
    </form>
  </Card>
</div>

<style>
  .wrap {
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: radial-gradient(ellipse at 50% 30%, #fff8e7, var(--ap-bg));
  }
  :global([data-theme='dark']) .wrap {
    background: radial-gradient(ellipse at 50% 40%, #121212, #050505);
  }
  .brand {
    text-align: center;
    margin-bottom: 1.25rem;
  }
  .mark {
    width: 52px;
    height: 52px;
    margin: 0 auto 0.6rem;
    border-radius: 14px;
    background: linear-gradient(135deg, var(--ap-primary), var(--ap-primary-dark));
    box-shadow: 0 6px 18px var(--ap-primary-soft);
  }
  h1 {
    margin: 0;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .accent {
    color: var(--ap-primary);
  }
  .muted {
    color: var(--ap-text-secondary);
    font-size: 0.9rem;
    margin: 0.25rem 0 0;
  }
  .err {
    color: var(--ap-danger);
    font-size: 0.88rem;
    margin: 0 0 0.75rem;
  }
  form :global(.btn) {
    margin-top: 0.25rem;
  }
</style>
