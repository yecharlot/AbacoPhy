import { IpfsBusinessStore } from './infrastructure/ipfs-store.js';
import { DomainEngine } from './domain/engine.js';
import { getSession, setSession, clearSession } from './auth/session.js';
import { showSplash } from './ui/splash.js';
import { renderLogin } from './ui/login.js';
import { renderShell, NAV } from './ui/shell.js';
import { renderDashboard } from './ui/views/dashboard.js';
import * as V from './ui/views/forms.js';

const titles = {};
NAV.forEach((g) => g.items.forEach((i) => { titles[i.id] = i.label; }));

const store = new IpfsBusinessStore();
const eng = new DomainEngine(store);
let screen = 'dashboard';
let shell = null;
let user = null;

async function paintApp() {
  if (!shell) return;
  shell.setTitle(titles[screen] || screen);
  shell.setActive(screen);
  const el = shell.view;
  const redraw = () => paintApp();
  if (user && !eng.canAccess(user.role, screen) && user.role !== 'master') {
    el.innerHTML = `<div class="card"><h3>Acceso denegado</h3><p class="muted">Sin permiso UI para «${screen}» (rol ${user.role}).</p></div>`;
    return;
  }
  switch (screen) {
    case 'dashboard': renderDashboard(el, eng); break;
    case 'ingresos': V.renderIngresos(el, eng, redraw); break;
    case 'gastos': V.renderGastos(el, eng, redraw); break;
    case 'cuentas': V.renderCuentas(el, eng, redraw); break;
    case 'reportes': V.renderReportes(el, eng); break;
    case 'facturas': V.renderFacturas(el, eng, redraw); break;
    case 'empleados': V.renderEmpleados(el, eng, redraw); break;
    case 'liquidaciones': V.renderLiquidaciones(el, eng, redraw); break;
    case 'catalog': V.renderCatalog(el, eng, redraw); break;
    case 'tenant': V.renderTenant(el, eng, redraw); break;
    case 'almacen': V.renderAlmacen(el, eng); break;
    case 'recepcion': V.renderRecepcion(el, eng, redraw); break;
    case 'transferencias': V.renderTransferencias(el, eng, redraw); break;
    case 'pos': V.renderPos(el, eng, redraw); break;
    case 'fichas-costo': V.renderFichasCosto(el, eng, redraw); break;
    case 'fichas-precio': V.renderFichasPrecio(el, eng, redraw); break;
    case 'pedidos': V.renderPedidos(el, eng, redraw); break;
    case 'traza': V.renderTraza(el, eng); break;
    case 'salvas': V.renderSalvas(el, eng, redraw); break;
    case 'usuarios': V.renderUsuarios(el, eng, redraw); break;
    case 'roles': V.renderRoles(el, eng, redraw); break;
    case 'permisos': V.renderPermisos(el, eng, redraw); break;
    case 'master': V.renderMaster(el, eng, redraw); break;
    default:
      el.innerHTML = `<div class="card"><p class="muted">Vista no mapeada: ${screen}</p></div>`;
  }
}

function mountShell() {
  const root = document.getElementById('app');
  shell = renderShell(root, {
    title: titles[screen],
    active: screen,
    user,
    onNav: (id) => { screen = id; paintApp(); },
    onLogout: () => {
      clearSession();
      user = null;
      shell = null;
      showLogin();
    },
  });
  paintApp();
}

function showLogin(err) {
  const root = document.getElementById('app');
  renderLogin(root, {
    error: err,
    onSubmit: async (username, password) => {
      try {
        const u = eng.login(username, password);
        user = setSession(u);
        await eng.persist();
        mountShell();
      } catch (e) {
        showLogin(e.message || 'Error de acceso');
      }
    },
  });
}

async function boot() {
  const root = document.getElementById('app');
  await showSplash(root);
  await eng.boot();
  user = getSession();
  if (user) {
    const ok = (eng.state.users || []).some((u) => u.username === user.username && u.active !== false);
    if (!ok) { clearSession(); user = null; }
  }
  if (user) mountShell();
  else showLogin();
}

boot();
