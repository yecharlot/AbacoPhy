import { emptyState, uid, now, recomputeKpis } from './model.js';

/** Motor de dominio offline — lógica alineada a módulos main */
export class DomainEngine {
  constructor(store) {
    this.store = store;
    this.state = emptyState();
  }

  async boot() {
    const loaded = await this.store.load();
    if (loaded && loaded.version) {
      this.state = { ...emptyState(), ...loaded };
      // preserve default users if missing
      if (!this.state.users?.length) this.state.users = emptyState().users;
      if (!this.state.accounts?.length) this.state.accounts = emptyState().accounts;
    } else {
      this.state = emptyState();
      await this.persist();
    }
    recomputeKpis(this.state);
    return this.state;
  }

  async persist() {
    recomputeKpis(this.state);
    this.state = await this.store.save(this.state);
    return this.state;
  }

  audit(event, detail) {
    this.state.audit.unshift({ id: uid(), at: now(), event, detail });
    this.state.audit = this.state.audit.slice(0, 200);
  }

  // —— Auth offline
  login(username, password) {
    const u = (this.state.users || []).find(
      (x) => x.username === username && x.password === password
    );
    if (!u) throw new Error('Usuario o contraseña incorrectos');
    this.audit('login', username);
    return { id: u.id, username: u.username, role: u.role, name: u.name };
  }

  // —— Contabilidad ——
  async addEntry({ type, amount, concept, accountCode }) {
    const e = {
      id: uid(), type, amount: +amount, concept: concept || type,
      accountCode: accountCode || (type === 'income' ? '400' : '500'),
      date: now(),
    };
    this.state.entries.unshift(e);
    const acc = this.state.accounts.find((a) => a.code === e.accountCode);
    if (acc) {
      if (type === 'income') acc.balance = Number(acc.balance || 0) + e.amount;
      else if (type === 'expense') acc.balance = Number(acc.balance || 0) + e.amount;
    }
    this.audit('entry.' + type, e.concept + ' ' + e.amount);
    return this.persist();
  }

  async addAccount({ code, name, type }) {
    if (this.state.accounts.some((a) => a.code === code)) throw new Error('Código ya existe');
    this.state.accounts.push({ id: uid(), code, name, type: type || 'asset', balance: 0 });
    this.audit('account.create', code);
    return this.persist();
  }

  // —— Catálogo / inventario ——
  async addProduct({ name, price, cost, unit, stock }) {
    const p = {
      id: uid(), name, price: +price || 0, cost: +cost || 0,
      unit: unit || 'u', stock: +stock || 0, active: true,
    };
    this.state.products.unshift(p);
    this.state.inventory.unshift({
      id: uid(), productId: p.id, name: p.name, sku: p.id.slice(0, 8),
      quantity: p.stock, unit: p.unit,
    });
    this.audit('product.create', name);
    return this.persist();
  }

  async updateProductStock(productId, delta) {
    const p = this.state.products.find((x) => x.id === productId);
    const inv = this.state.inventory.find((x) => x.productId === productId);
    if (p) p.stock = Math.max(0, Number(p.stock || 0) + delta);
    if (inv) inv.quantity = Math.max(0, Number(inv.quantity || 0) + delta);
    return this.persist();
  }

  // —— POS / ventas ——
  async posSale({ customer, lines, unitId }) {
    // lines: [{ productId, name, qty, price }]
    let total = 0;
    const normalized = (lines || []).map((l) => {
      const lineTotal = (+l.qty || 1) * (+l.price || 0);
      total += lineTotal;
      return { ...l, lineTotal };
    });
    if (!normalized.length) throw new Error('Agrega al menos un producto');
    for (const l of normalized) {
      if (l.productId) await this.updateProductStock(l.productId, -(+l.qty || 1));
    }
    const sale = {
      id: uid(), customer: customer || 'Mostrador', total, lines: normalized,
      unitId: unitId || this.state.salesUnits[0]?.id, status: 'completed', at: now(),
    };
    this.state.sales.unshift(sale);
    await this.addEntry({ type: 'income', amount: total, concept: 'Venta POS ' + sale.id.slice(0, 8) });
    this.audit('pos.sale', total);
    return this.persist();
  }

  async addOnlineOrder({ customer, total, items }) {
    const o = {
      id: uid(), customer, total: +total, items: items || [],
      status: 'nuevo', at: now(),
    };
    this.state.onlineOrders.unshift(o);
    this.audit('online.order', customer);
    return this.persist();
  }

  async setOnlineStatus(id, status) {
    const o = this.state.onlineOrders.find((x) => x.id === id);
    if (o) o.status = status;
    this.audit('online.status', id + '→' + status);
    return this.persist();
  }

  // —— Nómina ——
  async addEmployee({ name, role, salary }) {
    this.state.employees.unshift({
      id: uid(), name, role: role || 'general', salary: +salary || 0, active: true,
    });
    this.audit('employee.add', name);
    return this.persist();
  }

  async addPayslip({ employeeId, amount, period }) {
    const emp = this.state.employees.find((e) => e.id === employeeId);
    this.state.payslips.unshift({
      id: uid(), employeeId, employeeName: emp?.name || '—',
      amount: +amount || emp?.salary || 0, period: period || now().slice(0, 7), at: now(),
    });
    await this.addEntry({ type: 'expense', amount: +amount || emp?.salary || 0, concept: 'Nómina ' + (emp?.name || '') });
    return this.persist();
  }

  // —— Facturas ——
  async addInvoice({ customer, lines, total }) {
    const inv = {
      id: uid(),
      number: 'F-' + String((this.state.invoices.length || 0) + 1).padStart(4, '0'),
      customer, lines: lines || [], total: +total || 0, status: 'emitida', at: now(),
    };
    this.state.invoices.unshift(inv);
    if (inv.total > 0) {
      await this.addEntry({ type: 'income', amount: inv.total, concept: 'Factura ' + inv.number });
    }
    this.audit('invoice', inv.number);
    return this.persist();
  }

  // —— Almacén ——
  async addReception({ supplier, lines }) {
    const rec = {
      id: uid(), code: 'R-' + String((this.state.receptions.length || 0) + 1).padStart(4, '0'),
      supplier: supplier || 'Proveedor', lines: lines || [], status: 'recibido', at: now(),
    };
    for (const l of rec.lines) {
      if (l.productId) await this.updateProductStock(l.productId, +l.qty || 1);
      else if (l.name) {
        await this.addProduct({ name: l.name, price: l.price || 0, stock: l.qty || 1 });
      }
    }
    this.state.receptions.unshift(rec);
    this.audit('reception', rec.code);
    return this.persist();
  }

  async addTransfer({ from, to, productId, qty }) {
    const t = { id: uid(), from, to, productId, qty: +qty, at: now(), status: 'ok' };
    this.state.transfers.unshift(t);
    this.audit('transfer', from + '→' + to);
    return this.persist();
  }

  // —— Costos / precios ——
  async addCostSheet({ name, cost, price }) {
    this.state.costSheets.unshift({ id: uid(), name, cost: +cost, price: +price });
    this.audit('costsheet', name);
    return this.persist();
  }

  async addPriceSheet({ name, price }) {
    this.state.priceSheets.unshift({ id: uid(), name, price: +price });
    return this.persist();
  }

  // —— Unidades / usuarios ——
  async addSalesUnit({ code, name }) {
    this.state.salesUnits.push({ id: uid(), code, name, active: true });
    return this.persist();
  }

  async addUser({ username, password, role, name }) {
    if (this.state.users.some((u) => u.username === username)) throw new Error('Usuario existe');
    this.state.users.push({ id: uid(), username, password, role: role || 'cashier', name: name || username });
    this.audit('user.create', username);
    return this.persist();
  }

  async updateTenant(patch) {
    this.state.tenant = { ...this.state.tenant, ...patch };
    this.audit('tenant.update', JSON.stringify(patch));
    return this.persist();
  }

  async history() {
    return this.store.history();
  }
}
