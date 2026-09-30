<script lang="ts">
  import { BellToggle, TextRotate, WarpBackground } from '../../../../infrastructure/ui/shared';

  interface Props {
    loading?: boolean;
    error?: string | null;
    onSubmit: (username: string, password: string) => void | Promise<void>;
  }

  let { loading = false, error = null, onSubmit }: Props = $props();
  let username = $state('');
  let password = $state('');

  async function handleSubmit(e?: Event) {
    e?.preventDefault();
    if (loading || !username.trim() || !password) return;
    await onSubmit(username.trim(), password);
  }

  function handleLoginToggle(next: boolean) {
    if (next) void handleSubmit();
  }
</script>

<svelte:head>
  <title>ÁbacoPhy · Iniciar sesión</title>
  <meta name="theme-color" content="#050812" />
</svelte:head>

<div class="login-page">
  <WarpBackground
    color1="#61E6E1"
    color2="#B7F56A"
    timeSpeed={0.18}
    warpFrequency={4.5}
    warpSpeed={1.7}
    warpAmplitude={58}
    grainAmount={0.055}
    contrast={1.28}
    zoom={0.92}
  />
  <div class="backdrop"></div>

  <main class="login-layout">
    <section class="presentation" aria-labelledby="welcome-title">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">
          <span></span><span></span><span></span>
          <i></i>
        </div>
        <span>Ábaco<span class="brand-accent">Phy</span></span>
      </div>

      <div class="presentation-copy">
        <p class="eyebrow">GESTIÓN · CONTABILIDAD · CONTROL</p>
        <h1 id="welcome-title">
          Una visión más clara de tu negocio.
        </h1>
        <p class="lead">
          Una plataforma para conectar las operaciones diarias con la información financiera que necesitas para decidir.
        </p>

        <div class="rotating-line">
          <span>Diseñada para</span>
          <TextRotate
            texts={['contabilidad inteligente', 'inventario preciso', 'control empresarial', 'información en tiempo real']}
            interval={2800}
          />
        </div>
      </div>

      <div class="feature-grid" aria-label="Características">
        <div class="feature">
          <span class="feature-dot"></span>
          <div><strong>Operación</strong><small>Inventario y procesos conectados</small></div>
        </div>
        <div class="feature">
          <span class="feature-dot"></span>
          <div><strong>Finanzas</strong><small>Información contable centralizada</small></div>
        </div>
        <div class="feature">
          <span class="feature-dot"></span>
          <div><strong>Seguridad</strong><small>Acceso según tus permisos</small></div>
        </div>
      </div>

      <p class="version">ÁbacoPhy · Plataforma de gestión empresarial</p>
    </section>

    <section class="login-panel" aria-labelledby="login-title">
      <div class="login-card">
        <div class="login-heading">
          <div class="mini-mark" aria-hidden="true">A</div>
          <div>
            <p class="panel-kicker">BIENVENIDO</p>
            <h2 id="login-title">Inicia sesión</h2>
            <p>Accede a tu espacio de trabajo.</p>
          </div>
        </div>

        <form onsubmit={handleSubmit}>
          <label for="login-user">Usuario</label>
          <div class="input-wrap">
            <span class="input-icon" aria-hidden="true">◎</span>
            <input
              id="login-user"
              name="username"
              autocomplete="username"
              bind:value={username}
              placeholder="Tu usuario"
              required
              disabled={loading}
            />
          </div>

          <label for="login-pass">Contraseña</label>
          <div class="input-wrap">
            <span class="input-icon" aria-hidden="true">⌁</span>
            <input
              id="login-pass"
              name="password"
              type="password"
              autocomplete="current-password"
              bind:value={password}
              placeholder="Tu contraseña"
              required
              disabled={loading}
            />
          </div>

          {#if error}
            <p class="error" role="alert">{error}</p>
          {/if}

          <div class="login-action">
            <BellToggle
              offLabel="Iniciar sesión"
              onLabel="Entrando…"
              color="#07110F"
              background="#61E6E1"
              onColor="#07110F"
              onBackground="#B7F56A"
              size="lg"
              radius={22}
              ringAmplitude={17}
              ringPasses={5}
              ringDecay={1}
              ringDuration={820}
              ringPivot={16}
              crossfadeMs={200}
              revealBounce={0}
              badge={false}
              waves={true}
              clapper={false}
              disabled={loading || !username.trim() || !password}
              pressed={loading}
              onChange={handleLoginToggle}
            />
          </div>
        </form>

        <div class="security-note">
          <span class="shield" aria-hidden="true">✓</span>
          <span>Tu sesión está protegida mediante autenticación segura.</span>
        </div>
      </div>
    </section>
  </main>
</div>

<style>
  .login-page {
    position: relative;
    min-height: 100dvh;
    overflow: hidden;
    display: grid;
    place-items: center;
    isolation: isolate;
    background: #050812;
    color: #f7f8fc;
  }

  .backdrop {
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      radial-gradient(circle at 14% 20%, rgba(97, 230, 225, .14), transparent 32%),
      radial-gradient(circle at 85% 78%, rgba(183, 245, 106, .10), transparent 30%),
      linear-gradient(110deg, rgba(5, 8, 18, .48), rgba(5, 8, 18, .76));
    pointer-events: none;
  }

  .login-layout {
    width: min(1180px, calc(100% - 40px));
    min-height: min(720px, calc(100dvh - 40px));
    display: grid;
    grid-template-columns: 1.2fr .8fr;
    gap: clamp(28px, 6vw, 84px);
    align-items: center;
    padding: clamp(28px, 5vw, 70px);
    border: 1px solid rgba(255,255,255,.11);
    border-radius: 32px;
    background: rgba(5, 8, 18, .46);
    box-shadow: 0 30px 100px rgba(0,0,0,.38);
    backdrop-filter: blur(18px);
    animation: panel-in 700ms cubic-bezier(.22,1,.36,1) both;
  }

  .presentation { display:flex; flex-direction:column; min-height:540px; }
  .brand { display:flex; align-items:center; gap:12px; font-size:1.15rem; font-weight:800; letter-spacing:-.03em; }
  .brand-accent { color:#61E6E1; }
  .brand-mark { width:42px;height:42px;border-radius:13px;position:relative;display:grid;place-items:center;background:linear-gradient(135deg,#61E6E1,#B7F56A);box-shadow:0 10px 35px rgba(97,230,225,.2); }
  .brand-mark span { position:absolute; width:5px;height:5px;border-radius:50%;background:#07110F; top:13px; }
  .brand-mark span:nth-child(1){left:10px}.brand-mark span:nth-child(2){left:19px}.brand-mark span:nth-child(3){left:28px}
  .brand-mark i { position:absolute; width:25px;height:3px;border-radius:4px;background:#07110F;top:22px; }

  .presentation-copy { margin:auto 0; max-width:650px; }
  .eyebrow,.panel-kicker { margin:0 0 14px; font-size:.7rem; font-weight:800; letter-spacing:.18em; color:#61E6E1; }
  h1 { margin:0; max-width:620px; color:#f7f8fc; font-size:clamp(2.8rem,5.3vw,5rem); line-height:.98; letter-spacing:-.055em; font-weight:750; }
  .lead { margin:24px 0 0; max-width:560px; color:#b7bdcc; font-size:1.05rem; line-height:1.75; }
  .rotating-line { margin-top:30px; display:flex; align-items:center; gap:9px; color:#858c9d; font-size:.92rem; }
  .rotating-line :global(.rotate) { color:#B7F56A; font-weight:750; font-size:1.05rem; }

  .feature-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
  .feature { min-width:0; display:flex; gap:10px; align-items:flex-start; padding:13px; border:1px solid rgba(255,255,255,.08); border-radius:15px; background:rgba(255,255,255,.035); }
  .feature-dot { width:7px;height:7px;flex:none;margin-top:6px;border-radius:50%;background:#61E6E1;box-shadow:0 0 14px rgba(97,230,225,.8); }
  .feature:nth-child(2) .feature-dot{background:#B7F56A;box-shadow:0 0 14px rgba(183,245,106,.7)}
  .feature:nth-child(3) .feature-dot{background:#9C82FF;box-shadow:0 0 14px rgba(156,130,255,.7)}
  .feature strong,.feature small{display:block}.feature strong{font-size:.78rem}.feature small{margin-top:2px;color:#858c9d;font-size:.67rem;line-height:1.35}
  .version { margin:22px 0 0; color:#697186; font-size:.68rem; }

  .login-panel { display:flex; justify-content:center; }
  .login-card { width:min(390px,100%); padding:32px; border:1px solid rgba(255,255,255,.13); border-radius:26px; background:rgba(23,27,41,.76); box-shadow:0 25px 70px rgba(0,0,0,.32); backdrop-filter:blur(24px); animation:card-in 800ms 120ms cubic-bezier(.22,1,.36,1) both; }
  .login-heading { display:flex; gap:13px; align-items:center; margin-bottom:28px; }
  .mini-mark { width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:rgba(97,230,225,.12);border:1px solid rgba(97,230,225,.25);color:#61E6E1;font-weight:850; }
  .panel-kicker { margin-bottom:3px; font-size:.62rem; }
  h2 { margin:0; color:#f7f8fc; font-size:1.75rem; letter-spacing:-.04em; }
  .login-heading p:last-child { margin:4px 0 0;color:#858c9d;font-size:.8rem; }
  form { display:grid; gap:9px; }
  label { margin-top:7px;color:#b7bdcc;font-size:.76rem;font-weight:650; }
  .input-wrap { position:relative; }
  .input-icon { position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#61E6E1;font-size:1rem;pointer-events:none; }
  input { width:100%;height:50px;padding:0 14px 0 40px;border:1px solid rgba(255,255,255,.09);border-radius:14px;outline:none;background:rgba(5,8,18,.48);color:#f7f8fc;font:500 .88rem var(--ap-font,system-ui);transition:border-color 160ms ease,box-shadow 160ms ease,background 160ms ease; }
  input::placeholder{color:#697186} input:focus{border-color:rgba(97,230,225,.65);background:rgba(5,8,18,.7);box-shadow:0 0 0 4px rgba(97,230,225,.08)} input:disabled{opacity:.6}
  .error { margin:5px 0 2px;padding:10px 12px;border-radius:11px;border:1px solid rgba(241,123,123,.25);background:rgba(241,123,123,.08);color:#ffaaaA;font-size:.75rem;line-height:1.45; }
  .login-action { margin-top:13px;display:flex;justify-content:flex-end; }
  .login-action :global(.bell-toggle) { width:100%; }
  .login-action :global(.bell-toggle button) { width:100%;justify-content:center; }
  .security-note { margin-top:25px;padding-top:17px;border-top:1px solid rgba(255,255,255,.07);display:flex;gap:9px;align-items:flex-start;color:#697186;font-size:.68rem;line-height:1.45; }
  .shield { width:17px;height:17px;flex:none;display:grid;place-items:center;border-radius:50%;background:rgba(183,245,106,.12);color:#B7F56A;font-size:.62rem; }

  @keyframes panel-in { from{opacity:0;transform:translateY(18px) scale(.985)}to{opacity:1;transform:none} }
  @keyframes card-in { from{opacity:0;transform:translateX(22px)}to{opacity:1;transform:none} }

  @media (max-width:900px) {
    .login-layout { grid-template-columns:1fr; width:min(680px,calc(100% - 24px)); min-height:auto; padding:32px 24px; gap:28px; }
    .presentation { min-height:auto; }
    .presentation-copy { margin:38px 0 28px; }
    h1 { font-size:clamp(2.5rem,10vw,4rem); }
    .feature-grid { grid-template-columns:1fr; }
    .feature small { display:inline;margin-left:5px; }
    .version { display:none; }
    .login-panel { width:100%; }
    .login-card { width:min(480px,100%); }
  }

  @media (max-width:560px) {
    .login-page { padding:12px 0; }
    .login-layout { width:calc(100% - 16px);padding:22px 16px;border-radius:24px;gap:22px; }
    .presentation-copy { margin:30px 0 20px; }
    h1 { font-size:2.45rem; }
    .lead { font-size:.9rem;line-height:1.6; }
    .rotating-line { flex-wrap:wrap; }
    .login-card { padding:24px 18px;border-radius:21px; }
  }

  @media (prefers-reduced-motion:reduce) {
    .login-layout,.login-card { animation:none; }
  }
</style>
