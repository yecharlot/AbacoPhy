import { createEmptyState, effectiveScreens, canAccess, ALL_SCREENS, ROLE_TEMPLATES } from '../domain/entities.js';

export class DeliciasAppService {
  constructor(repo) {
    this.repo = repo;
    this.state = createEmptyState();
  }

  async boot() {
    const loaded = await this.repo.load();
    this.state = { ...createEmptyState(), ...loaded };
    if (!Array.isArray(this.state.usuarios) || !this.state.usuarios.length) {
      this.state.usuarios = createEmptyState().usuarios;
    }
    // no restaurar sesión automáticamente por seguridad básica
    this.state.session = null;
    return this.state;
  }

  async persist() {
    const { session, ...rest } = this.state;
    // persistimos sin password en claro idealmente; aquí demo local
    this.state = await this.repo.save({ ...rest, session: null });
    this.state.session = session;
    return this.state;
  }

  login(username, password) {
    const u = (this.state.usuarios || []).find(
      (x) => x.username.toLowerCase() === String(username || '').toLowerCase()
        && x.password === String(password || ''),
    );
    if (!u) return { ok: false, error: 'Usuario o clave incorrectos' };
    this.state.session = {
      userId: u.id,
      username: u.username,
      role: u.role,
      screens: effectiveScreens(u),
    };
    return { ok: true, session: this.state.session };
  }

  logout() {
    this.state.session = null;
  }

  currentUser() {
    if (!this.state.session) return null;
    return (this.state.usuarios || []).find((u) => u.id === this.state.session.userId) || null;
  }

  isMaster() {
    return this.state.session?.role === 'master';
  }

  menuScreens() {
    const u = this.currentUser();
    return effectiveScreens(u);
  }

  async setUserScreens(userId, screens) {
    if (!this.isMaster()) throw new Error('Solo Master puede gestionar permisos de menú');
    const u = this.state.usuarios.find((x) => x.id === userId);
    if (!u) throw new Error('Usuario no encontrado');
    if (u.role === 'master') {
      u.screens = null; // master siempre ve todo
    } else {
      u.screens = (screens || []).filter((s) => ALL_SCREENS.includes(s));
    }
    return this.persist();
  }

  async upsertUser({ id, username, password, role }) {
    if (!this.isMaster()) throw new Error('Solo Master');
    if (id) {
      const u = this.state.usuarios.find((x) => x.id === id);
      if (!u) throw new Error('No existe');
      if (username) u.username = username;
      if (password) u.password = password;
      if (role && role !== 'master') u.role = role;
      if (role && role !== 'master' && !u.screens) u.screens = [...(ROLE_TEMPLATES[role] || [])];
    } else {
      this.state.usuarios.push({
        id: crypto.randomUUID(),
        username,
        password: password || 'cambiar',
        role: role || 'consulta',
        screens: [...(ROLE_TEMPLATES[role] || ROLE_TEMPLATES.consulta)],
      });
    }
    return this.persist();
  }

  async addIngreso(monto, concepto) {
    this.state.ingresos.unshift({ id: crypto.randomUUID(), monto: +monto, concepto, at: new Date().toISOString() });
    this.state.kpis.ingresos = this.state.ingresos.reduce((s, x) => s + Number(x.monto || 0), 0);
    return this.persist();
  }

  async addGasto(monto, concepto) {
    this.state.gastos.unshift({ id: crypto.randomUUID(), monto: +monto, concepto, at: new Date().toISOString() });
    this.state.kpis.gastos = this.state.gastos.reduce((s, x) => s + Number(x.monto || 0), 0);
    return this.persist();
  }

  async addProducto(nombre, precio) {
    this.state.productos.unshift({ id: crypto.randomUUID(), nombre, precio: +precio });
    this.state.kpis.stock = this.state.productos.length;
    return this.persist();
  }

  async addPedido(cliente, total) {
    this.state.pedidos.unshift({ id: crypto.randomUUID(), cliente, total: +total, estado: 'nuevo', at: new Date().toISOString() });
    this.state.kpis.pedidos = this.state.pedidos.length;
    return this.persist();
  }

  async addEmpleado(nombre, rol) {
    this.state.empleados.unshift({ id: crypto.randomUUID(), nombre, rol });
    return this.persist();
  }

  async history() {
    return this.repo.history();
  }
}

export { canAccess, ALL_SCREENS, ROLE_TEMPLATES };
