import { createEmptyState } from '../domain/entities.js';
import * as bridge from '../infrastructure/api-bridge.js';

export class DeliciasAppService {
  constructor(repo) {
    this.repo = repo;
    this.state = createEmptyState();
  }

  async boot() {
    this.state.online = await bridge.probeBackend();
    this.state.mode = this.state.online ? 'online' : 'local';
    if (this.state.online) {
      try {
        await this.refreshOnline();
      } catch (e) {
        console.warn('online refresh failed, local fallback', e);
        this.state = Object.assign(createEmptyState(), await this.repo.load());
        this.state.mode = 'local';
        this.state.online = false;
      }
    } else {
      this.state = Object.assign(createEmptyState(), await this.repo.load());
      this.state.mode = 'local';
    }
    return this.state;
  }

  async refreshOnline() {
    const s = this.state;
    s.online = true;
    s.mode = 'online';
    const tasks = [
      ['/api/v1/tenant', 'tenant'],
      ['/api/v1/accounts', 'accounts'],
      ['/api/v1/entries', 'entries'],
      ['/api/v1/inventory', 'inventory'],
      ['/api/v1/payroll/employees', 'empleados'],
      ['/api/v1/invoices', 'invoices'],
      ['/api/v1/reports/summary', 'meta'],
    ];
    for (const [path, key] of tasks) {
      try {
        const data = await bridge.api(path);
        if (key === 'tenant' && data) s.tenant = { ...s.tenant, ...data };
        else if (key === 'meta' && data) {
          s.meta = data;
          if (data.ingresos != null) s.kpis.ingresos = Number(data.ingresos) || 0;
          if (data.gastos != null) s.kpis.gastos = Number(data.gastos) || 0;
        } else if (Array.isArray(data)) s[key] = data;
        else if (data && Array.isArray(data.items)) s[key] = data.items;
        else if (data && Array.isArray(data.data)) s[key] = data.data;
        else if (data) s[key] = data;
      } catch (_) { /* módulo opcional */ }
    }
    // ops extras
    for (const [path, key] of [
      ['/api/v1/warehouse', 'warehouse'],
      ['/api/v1/receptions', 'receptions'],
      ['/api/v1/cost-sheets', 'costSheets'],
      ['/api/v1/online-orders', 'onlineOrders'],
      ['/api/v1/users', 'users'],
      ['/api/v1/units', 'salesUnits'],
      ['/api/v1/pos/sales', 'pedidos'],
    ]) {
      try {
        const data = await bridge.api(path);
        if (Array.isArray(data)) s[key] = data;
        else if (data && Array.isArray(data.items)) s[key] = data.items;
        else if (data && Array.isArray(data.data)) s[key] = data.data;
      } catch (_) {}
    }
    if (Array.isArray(s.inventory)) s.kpis.stock = s.inventory.length;
    if (Array.isArray(s.pedidos)) s.kpis.pedidos = s.pedidos.length;
    if (Array.isArray(s.empleados) && s.empleados.length && !s.empleados[0].nombre) {
      s.empleados = s.empleados.map((e) => ({
        id: e.id || e.ID,
        nombre: e.name || e.nombre || e.full_name || '—',
        rol: e.role || e.rol || e.position || '—',
      }));
    }
    return s;
  }

  async persist() {
    if (this.state.mode === 'local') {
      this.state = await this.repo.save(this.state);
    }
    return this.state;
  }

  async login(user, pass) {
    const j = await bridge.login(user, pass);
    await this.refreshOnline();
    return j;
  }

  async logout() {
    await bridge.logout();
  }

  async addIngreso(monto, concepto) {
    if (this.state.online) {
      try {
        await bridge.api('/api/v1/entries', {
          method: 'POST',
          body: { type: 'income', amount: +monto, concept: concepto, description: concepto },
        });
        return this.refreshOnline();
      } catch (_) {}
    }
    this.state.ingresos.unshift({ id: crypto.randomUUID(), monto: +monto, concepto, at: new Date().toISOString() });
    this.state.kpis.ingresos = this.state.ingresos.reduce((s, x) => s + Number(x.monto || 0), 0);
    return this.persist();
  }

  async addGasto(monto, concepto) {
    if (this.state.online) {
      try {
        await bridge.api('/api/v1/entries', {
          method: 'POST',
          body: { type: 'expense', amount: +monto, concept: concepto, description: concepto },
        });
        return this.refreshOnline();
      } catch (_) {}
    }
    this.state.gastos.unshift({ id: crypto.randomUUID(), monto: +monto, concepto, at: new Date().toISOString() });
    this.state.kpis.gastos = this.state.gastos.reduce((s, x) => s + Number(x.monto || 0), 0);
    return this.persist();
  }

  async addProducto(nombre, precio) {
    if (this.state.online) {
      try {
        await bridge.api('/api/v1/inventory', {
          method: 'POST',
          body: { name: nombre, price: +precio, unit: 'u' },
        });
        return this.refreshOnline();
      } catch (_) {}
    }
    this.state.productos.unshift({ id: crypto.randomUUID(), nombre, precio: +precio });
    this.state.kpis.stock = this.state.productos.length;
    return this.persist();
  }

  async addPedido(cliente, total) {
    if (this.state.online) {
      try {
        await bridge.api('/api/v1/pos/sales', {
          method: 'POST',
          body: { customer: cliente, total: +total, lines: [] },
        });
        return this.refreshOnline();
      } catch (_) {}
    }
    this.state.pedidos.unshift({ id: crypto.randomUUID(), cliente, total: +total, estado: 'nuevo', at: new Date().toISOString() });
    this.state.kpis.pedidos = this.state.pedidos.length;
    return this.persist();
  }

  async addEmpleado(nombre, rol) {
    if (this.state.online) {
      try {
        await bridge.api('/api/v1/payroll/employees', {
          method: 'POST',
          body: { name: nombre, role: rol },
        });
        return this.refreshOnline();
      } catch (_) {}
    }
    this.state.empleados.unshift({ id: crypto.randomUUID(), nombre, rol });
    return this.persist();
  }

  async history() {
    if (this.state.online) return [{ at: new Date().toISOString(), note: 'modo online — auditoría vía API' }];
    return this.repo.history();
  }
}
