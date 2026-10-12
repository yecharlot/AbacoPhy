import { IpfsBusinessStore } from './infrastructure/ipfs-store.js';
import { DeliciasAppService } from './application/services.js';
import { renderShell, NAV } from './ui/shell.js';
import { renderDashboard } from './ui/views/dashboard.js';
import {
  renderIngresos, renderGastos, renderCatalog, renderPedidos,
  renderEmpleados, renderReportes, renderTenant, renderTraza,
  renderPos, renderAlmacen, renderCuentas, renderAsientos, renderFacturas,
  renderRecepciones, renderCostos, renderOnline, renderUsuarios, renderUnidades,
} from './ui/views/forms.js';
import { currentUser } from './infrastructure/api-bridge.js';

const titles = {};
NAV.forEach((g) => g.items.forEach((i) => { titles[i.id] = i.label; }));

const repo = new IpfsBusinessStore();
const svc = new DeliciasAppService(repo);
let screen = 'dashboard';
let shell;

function modeLabel() {
  return svc.state.online ? 'Online · API ÁbacoPhy' : 'Local · IPFS/storage';
}

async function paint() {
  const state = svc.state;
  shell.setTitle(titles[screen] || screen);
  shell.setActive(screen);
  shell.setMode(modeLabel());
  shell.setUser(currentUser());
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
    case 'cuentas': renderCuentas(el, state); break;
    case 'asientos': renderAsientos(el, state); break;
    case 'facturas': renderFacturas(el, state); break;
    case 'recepciones': renderRecepciones(el, state); break;
    case 'costos': renderCostos(el, state); break;
    case 'online': renderOnline(el, state); break;
    case 'usuarios': renderUsuarios(el, state); break;
    case 'unidades': renderUnidades(el, state); break;
    default: renderDashboard(el, state);
  }
}

async function boot() {
  await svc.boot();
  const root = document.getElementById('app');
  shell = renderShell(root, {
    title: titles[screen],
    active: screen,
    modeLabel: modeLabel(),
    user: currentUser(),
    onNav: (id) => { screen = id; paint(); },
    onLogin: async () => {
      const u = prompt('Usuario', 'admin') || 'admin';
      const p = prompt('Contraseña', 'admin123') || '';
      try {
        await svc.login(u, p);
        alert('Sesión iniciada');
        await paint();
      } catch (e) {
        alert('Login: ' + (e.message || e));
      }
    },
    onLogout: async () => {
      await svc.logout();
      await paint();
    },
  });
  await paint();
}

boot();
