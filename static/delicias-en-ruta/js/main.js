import { IpfsBusinessStore } from './infrastructure/ipfs-store.js';
import { DeliciasAppService } from './application/services.js';
import { renderShell, renderLogin, NAV } from './ui/shell.js';
import { renderDashboard } from './ui/views/dashboard.js';
import {
  renderIngresos, renderGastos, renderCatalog, renderPedidos,
  renderEmpleados, renderReportes, renderTenant, renderTraza,
  renderPos, renderAlmacen, renderUsuarios, renderPermisos,
} from './ui/views/forms.js';

const titles = {};
NAV.forEach((g) => g.items.forEach((i) => { titles[i.id] = i.label; }));

const repo = new IpfsBusinessStore();
const svc = new DeliciasAppService(repo);
let screen = 'dashboard';
let shell;
let loginError = '';

async function paintApp() {
  const allowed = svc.menuScreens();
  if (!allowed.includes(screen)) screen = allowed[0] || 'dashboard';
  const root = document.getElementById('app');
  const sess = svc.state.session;
  shell = renderShell(root, {
    title: titles[screen] || screen,
    active: screen,
    allowedScreenIds: allowed,
    sessionLabel: sess ? `${sess.username} · ${sess.role}` : '',
    onLogout: () => { svc.logout(); boot(); },
    onNav: (id) => {
      if (!allowed.includes(id)) return;
      screen = id;
      paintApp();
    },
  });
  const el = shell.view;
  const redraw = () => paintApp();
  const state = svc.state;
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
    case 'usuarios': renderUsuarios(el, state, svc, redraw); break;
    case 'permisos': renderPermisos(el, state, svc, redraw); break;
    default: renderDashboard(el, state);
  }
}

async function boot() {
  await svc.boot();
  const root = document.getElementById('app');
  if (!svc.state.session) {
    renderLogin(root, {
      error: loginError,
      onLogin: (user, pass) => {
        const r = svc.login(user, pass);
        if (!r.ok) { loginError = r.error; boot(); return; }
        loginError = '';
        screen = 'dashboard';
        paintApp();
      },
    });
    return;
  }
  await paintApp();
}

boot();
