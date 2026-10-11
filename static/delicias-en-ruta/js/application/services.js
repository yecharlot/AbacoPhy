import { createEmptyState } from '../domain/entities.js';

export class DeliciasAppService {
  constructor(repo) {
    this.repo = repo;
    this.state = createEmptyState();
  }

  async boot() {
    this.state = await this.repo.load();
    return this.state;
  }

  async persist() {
    this.state = await this.repo.save(this.state);
    return this.state;
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
