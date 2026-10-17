/** Menú = PLACEHOLDER_NAV de main — se filtra por permisos efectivos */
export const NAV = [
  { group: 'Finanzas', items: [
    { id: 'dashboard', label: 'Resumen' },
    { id: 'ingresos', label: 'Ingresos' },
    { id: 'gastos', label: 'Gastos' },
    { id: 'cuentas', label: 'Cuentas' },
    { id: 'reportes', label: 'Reportes' },
    { id: 'aos-erp', label: 'AOS-ERP · Salud' },
    { id: 'facturas', label: 'Facturación' },
  ]},
  { group: 'Nómina', items: [
    { id: 'empleados', label: 'Empleados' },
    { id: 'liquidaciones', label: 'Nómina' },
  ]},
  { group: 'Operación', items: [
    { id: 'pos', label: 'Punto de venta' },
    { id: 'pedidos', label: 'Pedidos online' },
    { id: 'catalog', label: 'Nomenclador' },
    { id: 'almacen', label: 'Almacén' },
    { id: 'recepcion', label: 'Recepción' },
    { id: 'transferencias', label: 'Transferencias' },
    { id: 'fichas-costo', label: 'Fichas de costo' },
    { id: 'fichas-precio', label: 'Fichas de precio' },
  ]},
  { group: 'Sistema', items: [
    { id: 'tenant', label: 'Negocio' },
    { id: 'traza', label: 'Traza' },
    { id: 'salvas', label: 'Salvas' },
    { id: 'usuarios', label: 'Usuarios' },
    { id: 'roles', label: 'Roles' },
    { id: 'permisos', label: 'Permisos UI' },
    { id: 'master', label: 'Master' },
  ]},
];

/**
 * @param canAccess fn(screenId) => boolean
 */
export function filterNav(canAccess) {
  if (!canAccess) return NAV;
  return NAV.map((g) => ({
    group: g.group,
    items: g.items.filter((it) => canAccess(it.id)),
  })).filter((g) => g.items.length > 0);
}

export function renderShell(root, { title, onNav, active, user, onLogout, canAccess }) {
  const navItems = filterNav(canAccess);
  const aside = document.createElement('aside');
  aside.className = 'sidebar';
  aside.innerHTML = `
    <div class="brand brand-fixed">
      <img src="./assets/logo.png" alt="Delicias en Ruta" class="brand-logo"/>
      <h1>Delicias en Ruta</h1>
      <p>Gastronomía · Calidad · Sostenibilidad</p>
    </div>
    <nav class="nav" id="nav"></nav>
    <div class="sidebar-foot">
      <div>${user?.displayName || user?.name || user?.username || ''} · ${user?.role || ''}</div>
      <div class="muted">IPFS local · offline</div>
    </div>`;
  const nav = aside.querySelector('#nav');
  navItems.forEach((g) => {
    const lab = document.createElement('div');
    lab.className = 'nav-group';
    lab.textContent = g.group;
    nav.appendChild(lab);
    g.items.forEach((it) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.id = it.id;
      if (it.id === active) b.classList.add('active');
      b.innerHTML = `<span>${it.label}</span>`;
      b.onclick = () => onNav(it.id);
      nav.appendChild(b);
    });
  });

  const main = document.createElement('div');
  main.className = 'main';
  main.innerHTML = `
    <header class="topbar">
      <h2 id="page-title">${title || ''}</h2>
      <div class="topbar-actions">
        <span class="badge">IPFS offline</span>
        <span class="badge">${user?.username || ''}</span>
        <button type="button" class="btn-ghost" id="btn-logout">Cerrar sesión</button>
      </div>
    </header>
    <div class="content" id="view"></div>`;

  root.innerHTML = '';
  const app = document.createElement('div');
  app.className = 'app';
  app.appendChild(aside);
  app.appendChild(main);
  root.appendChild(app);
  main.querySelector('#btn-logout').onclick = () => onLogout && onLogout();

  return {
    view: main.querySelector('#view'),
    setTitle: (t) => { main.querySelector('#page-title').textContent = t; },
    setActive: (id) => {
      nav.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.id === id));
    },
    /** Reconstruir menú tras cambiar permisos (misma sesión) */
    refreshNav: (nextCanAccess, nextActive) => {
      const items = filterNav(nextCanAccess || canAccess);
      nav.innerHTML = '';
      items.forEach((g) => {
        const lab = document.createElement('div');
        lab.className = 'nav-group';
        lab.textContent = g.group;
        nav.appendChild(lab);
        g.items.forEach((it) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.dataset.id = it.id;
          if (it.id === (nextActive || active)) b.classList.add('active');
          b.innerHTML = `<span>${it.label}</span>`;
          b.onclick = () => onNav(it.id);
          nav.appendChild(b);
        });
      });
    },
  };
}
