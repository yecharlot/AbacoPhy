<script lang="ts">
  import { BellToggle, BlurText, TextRotate, WarpBackground } from '../../../../infrastructure/ui/shared';
  import SocialProof from '../../../../infrastructure/ui/shared/SocialProof.svelte';
  import { onMount } from 'svelte';
  import Brand from '../../../../infrastructure/ui/branding/Brand.svelte';

  interface Props {
    loading?: boolean;
    error?: string | null;
    onSubmit: (username: string, password: string) => void | Promise<void>;
  }

  let { loading = false, error = null, onSubmit }: Props = $props();
  let username = $state('');
  let password = $state('');
  let theme = $state<'dark' | 'light'>(typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

  onMount(() => {
    const root = document.documentElement;
    const readTheme = () => { theme = root.dataset.theme === 'light' ? 'light' : 'dark'; };
    readTheme();
    const observer = new MutationObserver(readTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  });

  const isLight = $derived(theme === 'light');

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
  <meta name="theme-color" content={isLight ? '#f3f5f9' : '#050812'} />
</svelte:head>

<div class="login-page" data-login-theme={theme}>
  <WarpBackground
    color1={isLight ? '#27BDB7' : '#43D8D3'}
    color2={isLight ? '#8CCB3F' : '#A8EA5F'}
    color3={isLight ? '#8B72E8' : '#8E78F0'}
    timeSpeed={isLight ? 0.12 : 0.16}
    colorBalance={isLight ? -0.02 : -0.08}
    warpStrength={1}
    warpFrequency={4.5}
    warpSpeed={1.55}
    warpAmplitude={58}
    blendAngle={-12}
    blendSoftness={0.08}
    rotationAmount={500}
    noiseScale={2}
    grainAmount={isLight ? 0.025 : 0.045}
    grainScale={2}
    contrast={isLight ? 1.08 : 1.28}
    saturation={isLight ? 0.82 : 0.9}
    zoom={0.92}
  />

  <div class="backdrop"></div>

  <main class="login-layout">
    <section class="presentation" aria-labelledby="welcome-title">
      <Brand />

      <div class="presentation-copy">
        <p class="eyebrow">GESTIÓN · CONTABILIDAD · CONTROL</p>
        <BlurText text="Una visión más clara de tu negocio." animateBy="words" direction="bottom" delay={70} stepDuration={0.42} class="hero-title" />
        <p class="lead">
          ÁbacoPhy conecta las operaciones diarias con la información financiera que necesitas para trabajar,
          controlar y decidir.
        </p>

        <div class="rotating-line" aria-label="ÁbacoPhy está diseñado para">
          <span>Diseñada para</span>
          <TextRotate
            texts={[
              'contabilidad inteligente',
              'inventario preciso',
              'control empresarial',
              'información en tiempo real'
            ]}
            interval={2800}
          />
        </div>
      </div>

      <SocialProof />

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
              color={isLight ? '#ffffff' : '#071018'}
              background={isLight ? '#159E99' : '#61E6E1'}
              onColor="#071018"
              onBackground={isLight ? '#9AD94C' : '#B7F56A'}
              size="lg"
              radius={16}
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
    --login-panel-bg: rgba(5, 8, 18, .57);
    --login-card-bg: rgba(23, 27, 41, .88);
    --login-card-border: rgba(255, 255, 255, .13);
    --login-input-bg: rgba(5, 8, 18, .62);
    --login-input-border: rgba(255, 255, 255, .10);
    --login-proof-bg: rgba(255, 255, 255, .035);
    --login-proof-border: rgba(255, 255, 255, .09);
    --login-overlay: rgba(5, 8, 18, .38);
    --login-glow: rgba(97, 230, 225, .13);
    position: relative;
    min-height: 100dvh;
    overflow: hidden;
    display: grid;
    place-items: center;
    isolation: isolate;
    background: var(--color-bg);
    color: var(--color-text-primary);
  }

  .login-page[data-login-theme='light'] {
    --login-panel-bg: rgba(255, 255, 255, .62);
    --login-card-bg: rgba(255, 255, 255, .91);
    --login-card-border: rgba(15, 20, 35, .10);
    --login-input-bg: rgba(247, 248, 252, .94);
    --login-input-border: rgba(15, 20, 35, .11);
    --login-proof-bg: rgba(255, 255, 255, .48);
    --login-proof-border: rgba(15, 20, 35, .10);
    --login-overlay: rgba(255, 255, 255, .30);
    --login-glow: rgba(26, 168, 163, .13);
  }

  .backdrop {
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      radial-gradient(circle at 12% 18%, var(--login-glow), transparent 31%),
      radial-gradient(circle at 87% 82%, rgba(183, 245, 106, .10), transparent 28%),
      linear-gradient(110deg, var(--login-overlay), var(--login-overlay));
    pointer-events: none;
  }

  .login-layout {
    position: relative;
    z-index: 1;
    width: min(1180px, calc(100% - 40px));
    min-height: min(720px, calc(100dvh - 40px));
    display: grid;
    grid-template-columns: 1.18fr .82fr;
    gap: clamp(28px, 6vw, 84px);
    align-items: center;
    padding: clamp(30px, 5vw, 70px);
    border: 1px solid var(--login-card-border);
    border-radius: var(--radius-xl);
    background: var(--login-panel-bg);
    box-shadow: var(--shadow-float);
    backdrop-filter: blur(18px);
    animation: panel-in 700ms cubic-bezier(.22,1,.36,1) both;
  }

  .presentation { display:flex; flex-direction:column; min-height:540px; }
  .presentation :global(.brand) { width:max-content; }
  .presentation :global(.brand-copy strong) { color:var(--color-text-primary); }
  .presentation :global(.brand-copy small) { color:var(--color-text-muted); }
  .presentation-copy { margin:auto 0 24px; max-width:650px; }
  .eyebrow,.panel-kicker { margin:0 0 14px; font-size:.7rem; font-weight:800; letter-spacing:.18em; color:var(--accent-cyan); }
  .hero-title { max-width:620px; color:var(--color-text-primary); font-size:clamp(2.8rem,5.3vw,5rem); line-height:.98; letter-spacing:-.055em; font-weight:750; }
  .lead { margin:24px 0 0; max-width:560px; color:var(--color-text-secondary); font-size:1.05rem; line-height:1.75; }
  .rotating-line { margin-top:30px; display:flex; align-items:center; gap:9px; color:var(--color-text-muted); font-size:.92rem; }
  .rotating-line :global(.rotate) { color:var(--accent-green); font-weight:750; font-size:1.05rem; }
  .version { margin:18px 0 0; color:var(--color-text-muted); opacity:.72; font-size:.66rem; }

  .login-panel { display:flex; justify-content:center; }
  .login-card {
    width:min(390px,100%);
    padding:32px;
    border:1px solid var(--login-card-border);
    border-radius:var(--radius-xl);
    background:var(--login-card-bg);
    box-shadow:0 25px 70px rgba(0,0,0,.32);
    backdrop-filter:blur(24px);
    animation:card-in 800ms 120ms cubic-bezier(.22,1,.36,1) both;
  }
  .login-heading { display:flex; gap:13px; align-items:center; margin-bottom:28px; }
  .mini-mark { width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:var(--ap-primary-soft);border:1px solid rgba(97,230,225,.25);color:var(--accent-cyan);font-weight:850; }
  .panel-kicker { margin-bottom:3px; font-size:.62rem; }
  h2 { margin:0; color:var(--color-text-primary); font-size:1.75rem; letter-spacing:-.04em; }
  .login-heading p:last-child { margin:4px 0 0;color:var(--color-text-muted);font-size:.8rem; }
  form { display:grid; gap:9px; }
  label { margin-top:7px;color:var(--color-text-secondary);font-size:.76rem;font-weight:650; }
  .input-wrap { position:relative; }
  .input-icon { position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--accent-cyan);font-size:1rem;pointer-events:none; }
  input {
    width:100%;height:50px;padding:0 14px 0 40px;border:1px solid rgba(255,255,255,.09);border-radius:14px;
    outline:none;background:rgba(5,8,18,.48);color:var(--color-text-primary);font:500 .88rem var(--ap-font);
    transition:border-color 160ms ease,box-shadow 160ms ease,background 160ms ease;
  }
  input::placeholder{color:#697186}
  input:focus{border-color:rgba(97,230,225,.65);background:rgba(5,8,18,.7);box-shadow:0 0 0 4px rgba(97,230,225,.08)}
  input:disabled{opacity:.6}
  .error { margin:5px 0 2px;padding:10px 12px;border-radius:11px;border:1px solid rgba(241,123,123,.25);background:rgba(241,123,123,.08);color:#ffaaaa;font-size:.75rem;line-height:1.45; }
  .login-action { margin-top:13px;display:flex;justify-content:flex-end; }
  .login-action :global(.bell-toggle) { width:100%; }
  .login-action :global(.bell-toggle button) { width:100%;justify-content:center; }
  .security-note { margin-top:25px;padding-top:17px;border-top:1px solid rgba(255,255,255,.07);display:flex;gap:9px;align-items:flex-start;color:var(--color-text-muted);font-size:.68rem;line-height:1.45; }
  .shield { width:17px;height:17px;flex:none;display:grid;place-items:center;border-radius:50%;background:rgba(183,245,106,.12);color:var(--accent-green);font-size:.62rem; }

  @keyframes panel-in { from{opacity:0;transform:translateY(18px) scale(.985)}to{opacity:1;transform:none} }
  @keyframes card-in { from{opacity:0;transform:translateX(22px)}to{opacity:1;transform:none} }

  @media (max-width:900px) {
    .login-layout { grid-template-columns:1fr; width:min(680px,calc(100% - 24px)); min-height:auto; padding:32px 24px; gap:28px; }
    .presentation { min-height:auto; }
    .presentation-copy { margin:38px 0 28px; }
    .hero-title { font-size:clamp(2.5rem,10vw,4rem); }
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
    .hero-title { font-size:2.45rem; }
    .lead { font-size:.9rem;line-height:1.6; }
    .rotating-line { flex-wrap:wrap; }
    .login-card { padding:24px 18px;border-radius:21px; }
  }

  @media (prefers-reduced-motion:reduce) {
    .login-layout,.login-card { animation:none; }
  }
</style>