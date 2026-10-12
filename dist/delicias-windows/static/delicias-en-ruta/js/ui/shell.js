/** Lateral navigation — módulos alineados con ÁbacoPhy main (diseño Delicias) */
export const NAV = [
  { group: 'Operación', items: [
    { id: 'dashboard', label: 'Resumen', icon: '⌂' },
    { id: 'pos', label: 'Punto de venta', icon: '▣' },
    { id: 'pedidos', label: 'Pedidos / ventas', icon: '☰' },
    { id: 'online', label: 'Pedidos online', icon: '☁' },
  ]},
  { group: 'Finanzas', items: [
    { id: 'ingresos', label: 'Ingresos', icon: '↑' },
    { id: 'gastos', label: 'Gastos', icon: '↓' },
    { id: 'cuentas', label: 'Cuentas', icon: '₡' },
    { id: 'asientos', label: 'Asientos', icon: '≡' },
    { id: 'facturas', label: 'Facturas', icon: '▭' },
    { id: 'reportes', label: 'Reportes', icon: '▤' },
  ]},
  { group: 'Operaciones', items: [
    { id: 'catalog', label: 'Carta / productos', icon: '◈' },
    { id: 'almacen', label: 'Almacén', icon: '▢' },
    { id: 'recepciones', label: 'Recepciones', icon: '↓' },
    { id: 'costos', label: 'Fichas de costo', icon: 'ƒ' },
    { id: 'empleados', label: 'Equipo / nómina', icon: '☺' },
    { id: 'unidades', label: 'Unidades de venta', icon: '◎' },
  ]},
  { group: 'Sistema', items: [
    { id: 'usuarios', label: 'Usuarios', icon: '👤' },
    { id: 'tenant', label: 'Negocio', icon: '⚙' },
    { id: 'traza', label: 'Traza / sync', icon: '⬡' },
  ]},
];

export function renderShell(root, { title, onNav, active, modeLabel, onLogin, onLogout, user }) {
  const aside = document.createElement('aside');
  aside.className = 'sidebar';
  aside.innerHTML = `
    <div class="brand">
      <img src="./assets/logo.png" alt="Delicias en Ruta" />
      <h1>Delicias en Ruta</h1>
      <p>Gastronomía · Calidad · Sostenibilidad</p>
    </div>
    <nav class="nav" id="nav"></nav>
    <div class="sidebar-foot">AbacoPhy · gemelo funcional<br/><span id="mode-lab">${modeLabel || ''}</span></div>
  `;
  const nav = aside.querySelector('#nav');
  NAV.forEach((g) => {
    const lab = document.createElement('div');
    lab.className = 'nav-group';
    lab.textContent = g.group;
    nav.appendChild(lab);
    g.items.forEach((it) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.id = it.id;
      b.className = it.id === active ? 'active' : '';
      b.innerHTML = `<span class="icon">${it.icon}</span><span>${it.label}</span>`;
      b.onclick = () => onNav(it.id);
      nav.appendChild(b);
    });
  });

  const main = document.createElement('div');
  main.className = 'main';
  main.innerHTML = `
    <header class="topbar">
      <h2 id="page-title">${title}</h2>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span class="badge" id="mode-badge">${modeLabel || 'Delicias'}</span>
        <span class="badge" id="user-badge">${user ? (user.username || user.name || 'sesión') : 'sin sesión'}</span>
        <button type="button" class="btn-ghost" id="btn-login" style="display:${user?'none':'inline-block'}">Entrar</button>
        <button type="button" class="btn-ghost" id="btn-logout" style="display:${user?'inline-block':'none'}">Salir</button>
      </div>
    </header>
    <div class="content" id="view"></div>
  `;

  root.innerHTML = '';
  const app = document.createElement('div');
  app.className = 'app';
  app.appendChild(aside);
  app.appendChild(main);
  root.appendChild(app);

  main.querySelector('#btn-login').onclick = () => onLogin && onLogin();
  main.querySelector('#btn-logout').onclick = () => onLogout && onLogout();

  return {
    view: main.querySelector('#view'),
    setTitle: (t) => { main.querySelector('#page-title').textContent = t; },
    setActive: (id) => {
      nav.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.id === id));
    },
    setMode: (lab) => {
      const a = main.querySelector('#mode-badge');
      const f = aside.querySelector('#mode-lab');
      if (a) a.textContent = lab;
      if (f) f.textContent = lab;
    },
    setUser: (u) => {
      const ub = main.querySelector('#user-badge');
      if (ub) ub.textContent = u ? (u.username || u.name || 'sesión') : 'sin sesión';
      main.querySelector('#btn-login').style.display = u ? 'none' : 'inline-block';
      main.querySelector('#btn-logout').style.display = u ? 'inline-block' : 'none';
    },
  };
}
