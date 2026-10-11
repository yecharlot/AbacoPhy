import { IpfsBusinessStore } from './infrastructure/ipfs-store.js';
import { DeliciasAppService } from './application/services.js';
import { renderShell, NAV } from './ui/shell.js';
import { renderDashboard } from './ui/views/dashboard.js';
import {
  renderIngresos, renderGastos, renderCatalog, renderPedidos,
  renderEmpleados, renderReportes, renderTenant, renderTraza,
  renderPos, renderAlmacen,
} from './ui/views/forms.js';

const titles = {};
NAV.forEach((g) => g.items.forEach((i) => { titles[i.id] = i.label; }));

const repo = new IpfsBusinessStore();
const svc = new DeliciasAppService(repo);
let screen = 'dashboard';
let shell;

async function paint() {
  const state = svc.state;
  shell.setTitle(titles[screen] || screen);
  shell.setActive(screen);
  const el = shell.view;
  const redraw = () => paint();
  switch (screen) {
    case 'dashboard': renderDashboard(el, state); break;
    case 'ingresos': renderIngresos(el, state, svc, redraw); break;
    case 'gastos': renderGastos(el, state, svc, redraw); break;
    case 'catalog': renderCatalog(el, state, svc, redraw); break;
    case 'pedidos': renderPedidos(el, state, svc, redraw); break;
    case 'empleados': renderEmpleados(el, state, svc, redraw); break;
    case 'reportes': renderReportes(el, state); break;
    case 'tenant': renderTenant(el, state); break;
    case 'traza': renderTraza(el, await svc.history(), state); break;
    case 'pos': renderPos(el, state, svc, redraw); break;
    case 'almacen': renderAlmacen(el, state); break;
    default: renderDashboard(el, state);
  }
}

async function boot() {
  await svc.boot();
  const root = document.getElementById('app');
  shell = renderShell(root, {
    title: titles[screen],
    active: screen,
    onNav: (id) => { screen = id; paint(); },
  });
  await paint();
}

boot();
