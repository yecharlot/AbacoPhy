export const NAV = [
  { group: 'Operación', items: [
    { id: 'dashboard', label: 'Resumen', icon: '⌂' },
    { id: 'pos', label: 'Punto de venta', icon: '▣' },
    { id: 'pedidos', label: 'Ventas', icon: '☰' },
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
    { id: 'transferencias', label: 'Transferencias', icon: '⇄' },
    { id: 'costos', label: 'Fichas de costo', icon: 'ƒ' },
    { id: 'empleados', label: 'Equipo', icon: '☺' },
    { id: 'nominas', label: 'Nóminas', icon: '₴' },
    { id: 'unidades', label: 'Unidades venta', icon: '◎' },
  ]},
  { group: 'Sistema', items: [
    { id: 'usuarios', label: 'Usuarios', icon: '👤' },
    { id: 'tenant', label: 'Negocio', icon: '⚙' },
    { id: 'traza', label: 'Traza IPFS', icon: '⬡' },
  ]},
];

export function renderShell(root, { title, onNav, active, user, onLogout }) {
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
      <div>${user?.name || user?.username || ''} · ${user?.role || ''}</div>
      <div class="muted">IPFS local · offline</div>
    </div>`;
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
      if (it.id === active) b.classList.add('active');
      b.innerHTML = `<span class="icon">${it.icon}</span><span>${it.label}</span>`;
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
  };
}
