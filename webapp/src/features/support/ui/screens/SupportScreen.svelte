<script lang="ts">
  import Icon from '../../../../infrastructure/ui/shared/Icon.svelte';

  const topics = [
    { icon: 'invoice' as const, title: 'Facturación', text: 'Documentos, numeración y operaciones de venta.' },
    { icon: 'accounts' as const, title: 'Finanzas', text: 'Ingresos, gastos, cuentas y reportes.' },
    { icon: 'catalog' as const, title: 'Inventario', text: 'Catálogo, recepción y transferencias.' },
    { icon: 'users' as const, title: 'Usuarios y roles', text: 'Acceso, permisos y configuración.' }
  ];
</script>

<svelte:head>
  <title>Soporte · ÁbacoPhy</title>
  <meta
    name="description"
    content="Centro de soporte de ÁbacoPhy para gestión empresarial y contabilidad."
  />
</svelte:head>

<section class="support-page">
  <header class="hero">
    <span class="eyebrow"><Icon name="support" size={15} /> Centro de soporte</span>
    <h1>¿En qué podemos ayudarte?</h1>
    <p>Encuentra orientación rápida sobre las principales áreas de ÁbacoPhy.</p>
    <label class="search">
      <Icon name="help" size={18} />
      <input placeholder="Buscar ayuda..." aria-label="Buscar ayuda" />
    </label>
  </header>

  <div class="topic-grid">
    {#each topics as topic}
      <button class="topic" type="button">
        <span class="topic-icon"><Icon name={topic.icon} size={20} /></span>
        <span>
          <strong>{topic.title}</strong>
          <small>{topic.text}</small>
        </span>
      </button>
    {/each}
  </div>

  <section class="contact">
    <div>
      <span class="eyebrow">¿No encuentras lo que buscas?</span>
      <h2>Contacta con soporte</h2>
      <p>Describe el problema y proporciona el contexto necesario para ayudarte más rápido.</p>
    </div>
    <button type="button">Solicitar ayuda</button>
  </section>
</section>

<style>
  .support-page { max-width: 1100px; margin: 0 auto; padding: clamp(1rem, 3vw, 2.5rem); }
  .hero { padding: 2rem 0 1.75rem; }
  .eyebrow {
    display: inline-flex; align-items: center; gap: .4rem;
    color: var(--accent-cyan); font-size: .76rem; font-weight: 650; text-transform: uppercase; letter-spacing: .08em;
  }
  h1 { margin: .7rem 0 .45rem; font-size: clamp(2rem, 5vw, 3.35rem); line-height: 1.02; letter-spacing: -.045em; }
  .hero p { margin: 0 0 1.5rem; color: var(--text-muted); max-width: 42rem; }
  .search {
    display: flex; align-items: center; gap: .7rem; max-width: 40rem;
    padding: .85rem 1rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--surface-2) 82%, transparent);
  }
  .search:focus-within { border-color: color-mix(in srgb, var(--accent-cyan) 50%, var(--border-subtle)); }
  .search input { width: 100%; border: 0; outline: 0; background: transparent; color: var(--text-primary); font: inherit; }
  .topic-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: .85rem; }
  .topic {
    display: flex; gap: .8rem; align-items: flex-start; text-align: left;
    min-height: 8rem; padding: 1rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--surface-1) 84%, transparent); color: var(--text-primary);
    cursor: pointer; transition: transform .2s ease, border-color .2s ease, background .2s ease;
  }
  .topic:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--accent-cyan) 28%, var(--border-subtle)); }
  .topic-icon { display: grid; place-items: center; width: 2.5rem; height: 2.5rem; flex: 0 0 auto; border-radius: .8rem; color: var(--accent-cyan); background: color-mix(in srgb, var(--accent-cyan) 9%, var(--surface-2)); }
  .topic strong, .topic small { display: block; }
  .topic small { margin-top: .4rem; color: var(--text-muted); line-height: 1.45; }
  .contact { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; margin-top: 1rem; padding: 1.4rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); background: linear-gradient(135deg, color-mix(in srgb, var(--accent-cyan) 7%, var(--surface-1)), var(--surface-1)); }
  .contact h2 { margin: .4rem 0 .3rem; font-size: 1.1rem; }
  .contact p { margin: 0; color: var(--text-muted); max-width: 40rem; }
  .contact button { border: 0; border-radius: var(--radius-sm); padding: .7rem 1rem; background: var(--button-primary); color: var(--button-primary-text); cursor: pointer; white-space: nowrap; }
  @media (max-width: 850px) { .topic-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 560px) { .topic-grid { grid-template-columns: 1fr; } .contact { align-items: flex-start; flex-direction: column; } }
  @media (prefers-reduced-motion: reduce) { .topic { transition: none; } }
</style>
