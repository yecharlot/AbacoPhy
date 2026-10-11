/** Lateral navigation — modules aligned with AbacoPhy screens */
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
  ]},
];

export function renderShell(root, { title, onNav, active }) {
  const aside = document.createElement('aside');
  aside.className = 'sidebar';
  aside.innerHTML = `
    <div class="brand">
      <img src="./assets/logo.png" alt="Delicias en Ruta" />
      <h1>Delicias en Ruta</h1>
      <p>Gastronomía · Calidad · Sostenibilidad</p>
    </div>
    <nav class="nav" id="nav"></nav>
    <div class="sidebar-foot">AbacoPhy · rama Delicias en Ruta<br/>Persistencia IPFS</div>
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
