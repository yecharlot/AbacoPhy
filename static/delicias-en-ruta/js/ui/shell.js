/** Lateral navigation — filtrada por permisos de sesión */
export const NAV = [
  { group: 'Operación', items: [
    { id: 'dashboard', label: 'Resumen', icon: '⌂' },
    { id: 'pos', label: 'Punto de venta', icon: '▣' },
    { id: 'pedidos', label: 'Pedidos', icon: '☰' },
  ]},
  { group: 'Finanzas', items: [
    { id: 'ingresos', label: 'Ingresos', icon: '↑' },
    { id: 'gastos', label: 'Gastos', icon: '↓' },
    { id: 'reportes', label: 'Reportes', icon: '▤' },
  ]},
  { group: 'Operaciones', items: [
    { id: 'catalog', label: 'Carta / productos', icon: '◈' },
    { id: 'almacen', label: 'Almacén', icon: '▢' },
    { id: 'empleados', label: 'Equipo', icon: '☺' },
  ]},
  { group: 'Sistema', items: [
    { id: 'tenant', label: 'Negocio', icon: '⚙' },
    { id: 'traza', label: 'Traza IPFS', icon: '⬡' },
    { id: 'usuarios', label: 'Usuarios', icon: '👤' },
    { id: 'permisos', label: 'Menú por rol', icon: '🔑' },
  ]},
];

/**
 * @param {string[]} allowedScreenIds pantallas que el rol puede ver (otras se ocultan)
 */
export function renderShell(root, { title, onNav, active, allowedScreenIds, sessionLabel, onLogout }) {
  const allowed = new Set(allowedScreenIds || []);

  const aside = document.createElement('aside');
  aside.className = 'sidebar';
  aside.innerHTML = `
    <div class="brand">
      <img src="./assets/logo.png" alt="Delicias en Ruta" />
      <h1>Delicias en Ruta</h1>
      <p>Gastronomía · Calidad · Sostenibilidad</p>
    </div>
    <nav class="nav" id="nav"></nav>
    <div class="sidebar-foot">
      <div id="session-label">${sessionLabel || ''}</div>
      <button type="button" class="btn-logout" id="btn-logout">Cerrar sesión</button>
      <div class="muted-foot">AbacoPhy · menú según permisos</div>
    </div>
  `;
  const nav = aside.querySelector('#nav');
  NAV.forEach((g) => {
    const visibleItems = g.items.filter((it) => allowed.has(it.id));
    if (!visibleItems.length) return;
    const lab = document.createElement('div');
    lab.className = 'nav-group';
    lab.textContent = g.group;
    nav.appendChild(lab);
    visibleItems.forEach((it) => {
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
      <span class="badge">Delicias en Ruta Pp</span>
    </header>
    <div class="content" id="view"></div>
  `;

  root.innerHTML = '';
  const app = document.createElement('div');
  app.className = 'app';
  app.appendChild(aside);
  app.appendChild(main);
  root.appendChild(app);

  aside.querySelector('#btn-logout').onclick = () => onLogout && onLogout();

  return {
    view: main.querySelector('#view'),
    setTitle: (t) => { main.querySelector('#page-title').textContent = t; },
    setActive: (id) => {
      nav.querySelectorAll('button').forEach((b) => {
        b.classList.toggle('active', b.dataset.id === id);
      });
    },
  };
}

export function renderLogin(root, { onLogin, error }) {
  root.innerHTML = `
    <div class="login-wrap">
      <div class="login-card">
        <img src="./assets/logo.png" alt="Delicias" class="login-logo" />
        <h1>Delicias en Ruta</h1>
        <p class="muted">Entra con tu cuenta. El menú muestra solo lo que tu rol permite.</p>
        ${error ? `<p class="err">${error}</p>` : ''}
        <label>Usuario</label>
        <input id="lg-user" placeholder="Master" value="Master" />
        <label>Clave</label>
        <input id="lg-pass" type="password" placeholder="Master" value="Master" />
        <button type="button" class="btn btn-primary" id="lg-ok">Entrar</button>
        <p class="muted" style="margin-top:12px;font-size:0.75rem">Demo: Master/Master · Cajero/cajero</p>
      </div>
    </div>`;
  root.querySelector('#lg-ok').onclick = () => {
    onLogin(root.querySelector('#lg-user').value, root.querySelector('#lg-pass').value);
  };
}
