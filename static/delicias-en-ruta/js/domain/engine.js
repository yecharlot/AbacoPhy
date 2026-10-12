import { emptyState, uid, now, recomputeKpis } from './model.js';

/**
 * DomainEngine — casos de uso offline equivalentes a main (webapp domain/usecases).
 * Persistencia: IPFS local (store.save con CID).
 */
export class DomainEngine {
  constructor(store) {
    this.store = store;
    this.state = emptyState();
  }

  async boot() {
    const loaded = await this.store.load();
    if (loaded && loaded.version >= 2) {
      this.state = { ...emptyState(), ...loaded };
      if (!this.state.users?.length) this.state.users = emptyState().users;
      if (!this.state.accounts?.length) this.state.accounts = emptyState().accounts;
      if (!this.state.measureUnits?.length) this.state.measureUnits = emptyState().measureUnits;
      if (!this.state.rolePermissions) this.state.rolePermissions = emptyState().rolePermissions;
      if (!this.state.modules) this.state.modules = emptyState().modules;
      if (!this.state.backups) this.state.backups = [];
      if (!this.state.systemErrors) this.state.systemErrors = [];
      if (!this.state.jobPositions) this.state.jobPositions = emptyState().jobPositions;
      if (!this.state.priceSheets) this.state.priceSheets = [];
      if (!this.state.tenants) this.state.tenants = emptyState().tenants;
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
    this.state.audit.unshift({ id: uid(), at: now(), event, detail: String(detail || '') });
    this.state.audit = this.state.audit.slice(0, 500);
  }

  // —— Identity ——
  login(username, password) {
    const u = (this.state.users || []).find(
      (x) => x.username === username && x.password === password && x.active !== false
    );
    if (!u) throw new Error('Usuario o contraseña incorrectos');
    this.audit('auth.login', username);
    return {
      id: u.id, username: u.username, role: u.role,
      displayName: u.displayName || u.name || u.username, name: u.displayName || u.name,
    };
  }

  changePassword(username, oldPass, newPass) {
    const u = this.state.users.find((x) => x.username === username);
    if (!u || u.password !== oldPass) throw new Error('Contraseña actual incorrecta');
    if (!newPass || newPass.length < 4) throw new Error('Nueva contraseña demasiado corta');
    u.password = newPass;
    this.audit('auth.password', username);
    return this.persist();
  }

  canAccess(role, screenId) {
    if (!role) return false;
    if (role === 'master') return true;
    const rp = this.state.rolePermissions[role] || {};
    if (rp['*']) return true;
    return !!rp[screenId];
  }

  // —— Accounting ——
  createIncomeEntry({ accountId, amount, description, date }) {
    if (!accountId) throw new Error('Seleccione una cuenta de ingreso');
    if (!(+amount > 0)) throw new Error('El importe debe ser mayor que 0');
    if (!String(description || '').trim()) throw new Error('Indique una descripción');
    return this._createEntry({ type: 'income', accountId, amount: +amount, description: String(description).trim(), date });
  }

  createExpenseEntry({ accountId, amount, description, date }) {
    if (!accountId) throw new Error('Seleccione una cuenta de gasto');
    if (!(+amount > 0)) throw new Error('El importe debe ser mayor que 0');
    if (!String(description || '').trim()) throw new Error('Indique una descripción');
    return this._createEntry({ type: 'expense', accountId, amount: +amount, description: String(description).trim(), date });
  }

  async _createEntry({ type, accountId, amount, description, date }) {
    const acc = this.state.accounts.find((a) => a.id === accountId || a.code === accountId);
    const e = {
      id: uid(), type, amount: +amount, description,
      concept: description,
      accountId: acc?.id || accountId,
      accountCode: acc?.code || '',
      date: date || now(),
    };
    this.state.entries.unshift(e);
    if (acc) {
      if (type === 'income') acc.balance = Number(acc.balance || 0) + e.amount;
      else acc.balance = Number(acc.balance || 0) + e.amount;
    }
    this.audit('entry.' + type, description + ' ' + amount);
    return this.persist();
  }

  listAccounts() { return this.state.accounts.filter((a) => a.active !== false); }
  listEntries(filter) {
    let list = this.state.entries.slice();
    if (filter?.type) list = list.filter((e) => e.type === filter.type);
    if (filter?.from) list = list.filter((e) => (e.date || '') >= filter.from);
    if (filter?.to) list = list.filter((e) => (e.date || '') <= filter.to);
    return list;
  }

  async createAccount({ code, name, type }) {
    if (!code?.trim()) throw new Error('Código obligatorio');
    if (this.state.accounts.some((a) => a.code === code.trim())) throw new Error('Código ya existe');
    this.state.accounts.push({ id: uid(), code: code.trim(), name: name || code, type: type || 'asset', balance: 0, active: true });
    this.audit('account.create', code);
    return this.persist();
  }

  getSummary() {
    recomputeKpis(this.state);
    return {
      ingresos: this.state.kpis.ingresos,
      gastos: this.state.kpis.gastos,
      balance: this.state.kpis.ingresos - this.state.kpis.gastos,
      pedidos: this.state.kpis.pedidos,
      stock: this.state.kpis.stock,
    };
  }

  getTrialBalance() {
    return this.state.accounts.map((a) => ({
      code: a.code, name: a.name, type: a.type, balance: Number(a.balance || 0),
    }));
  }

  getIncomeStatement() {
    const income = this.state.entries.filter((e) => e.type === 'income');
    const expense = this.state.entries.filter((e) => e.type === 'expense');
    const ti = income.reduce((s, e) => s + e.amount, 0);
    const te = expense.reduce((s, e) => s + e.amount, 0);
    return { totalIncome: ti, totalExpense: te, net: ti - te, income, expense };
  }

  getJournal() {
    return this.state.entries.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  // —— Catalog ——
  async createProduct({ name, price, cost, unitId, sku, stock }) {
    if (!name?.trim()) throw new Error('Nombre obligatorio');
    const mu = this.state.measureUnits.find((m) => m.id === unitId) || this.state.measureUnits[0];
    const p = {
      id: uid(), name: name.trim(), price: +price || 0, cost: +cost || 0,
      unitId: mu?.id, unit: mu?.code || 'U', sku: sku || '', stock: +stock || 0, active: true,
    };
    this.state.products.unshift(p);
    this.state.inventory.unshift({
      id: uid(), productId: p.id, name: p.name, sku: p.sku || p.id.slice(0, 8),
      quantity: p.stock, unit: p.unit,
    });
    this.audit('product.create', p.name);
    return this.persist();
  }

  async updateProduct(id, patch) {
    const p = this.state.products.find((x) => x.id === id);
    if (!p) throw new Error('Producto no encontrado');
    Object.assign(p, patch);
    const inv = this.state.inventory.find((i) => i.productId === id);
    if (inv) {
      if (patch.name) inv.name = patch.name;
      if (patch.stock != null) inv.quantity = +patch.stock;
    }
    this.audit('product.update', id);
    return this.persist();
  }

  async createMeasureUnit({ code, name }) {
    if (!code?.trim()) throw new Error('Código obligatorio');
    this.state.measureUnits.push({ id: uid(), code: code.trim(), name: name || code });
    return this.persist();
  }

  async deleteMeasureUnit(id) {
    this.state.measureUnits = this.state.measureUnits.filter((m) => m.id !== id);
    return this.persist();
  }

  // —— POS ——
  async registerSale({ lines, customer, unitId, paymentMethod }) {
    if (!lines?.length) throw new Error('La venta necesita al menos una línea');
    for (const line of lines) {
      if (!line.productId) throw new Error('Cada línea necesita un producto');
      if (!(line.qty > 0)) throw new Error('La cantidad debe ser mayor que cero');
      if (line.unitPrice != null && line.unitPrice < 0) throw new Error('El precio no puede ser negativo');
      if (line.discountPct != null && (line.discountPct < 0 || line.discountPct > 100)) {
        throw new Error('La rebaja debe estar entre 0 y 100 %');
      }
    }
    let total = 0;
    let costTotal = 0;
    const normalized = lines.map((l) => {
      const p = this.state.products.find((x) => x.id === l.productId);
      const price = l.unitPrice != null ? +l.unitPrice : (p?.price || 0);
      const disc = +l.discountPct || 0;
      const lineTotal = (+l.qty) * price * (1 - disc / 100);
      total += lineTotal;
      costTotal += (+l.qty) * (p?.cost || 0);
      return {
        productId: l.productId, name: p?.name || l.name, qty: +l.qty,
        unitPrice: price, discountPct: disc, lineTotal,
      };
    });
    for (const l of normalized) {
      const p = this.state.products.find((x) => x.id === l.productId);
      const inv = this.state.inventory.find((i) => i.productId === l.productId);
      if (p) p.stock = Math.max(0, Number(p.stock || 0) - l.qty);
      if (inv) inv.quantity = Math.max(0, Number(inv.quantity || 0) - l.qty);
    }
    const sale = {
      id: uid(), customer: customer || 'Mostrador', total, costTotal, lines: normalized,
      unitId: unitId || this.state.salesUnits[0]?.id,
      paymentMethod: paymentMethod || 'cash', status: 'completed', at: now(),
    };
    this.state.sales.unshift(sale);
    const incomeAcc = this.state.accounts.find((a) => a.type === 'income') || this.state.accounts.find((a) => a.code === '400');
    await this._createEntry({
      type: 'income', accountId: incomeAcc?.id, amount: total,
      description: 'Venta POS ' + sale.id.slice(0, 8),
    });
    if (costTotal > 0) {
      const costAcc = this.state.accounts.find((a) => a.code === '510') || this.state.accounts.find((a) => a.type === 'expense');
      await this._createEntry({
        type: 'expense', accountId: costAcc?.id, amount: costTotal,
        description: 'Costo venta ' + sale.id.slice(0, 8),
      });
    }
    this.audit('pos.sale', total);
    return this.persist();
  }

  listSales() { return this.state.sales.slice(); }

  // —— Commerce ——
  async createOnlineOrder({ customer, total, items, phone }) {
    const o = {
      id: uid(), customer: customer || 'Cliente web', phone: phone || '',
      total: +total || 0, items: items || [], status: 'nuevo', at: now(),
    };
    this.state.onlineOrders.unshift(o);
    this.audit('online.create', o.customer);
    return this.persist();
  }

  async updateOrderStatus(id, status) {
    const o = this.state.onlineOrders.find((x) => x.id === id);
    if (!o) throw new Error('Pedido no encontrado');
    o.status = status;
    this.audit('online.status', id + '→' + status);
    return this.persist();
  }

  // —— Payroll ——
  async createEmployee({ name, role, salary, positionId }) {
    if (!name?.trim()) throw new Error('Nombre obligatorio');
    this.state.employees.unshift({
      id: uid(), name: name.trim(), role: role || 'general',
      positionId, salary: +salary || 0, active: true,
    });
    this.audit('employee.create', name);
    return this.persist();
  }

  async createPayslip({ employeeId, amount, period }) {
    const emp = this.state.employees.find((e) => e.id === employeeId);
    if (!emp) throw new Error('Empleado no encontrado');
    const amt = +amount || emp.salary || 0;
    this.state.payslips.unshift({
      id: uid(), employeeId, employeeName: emp.name,
      amount: amt, period: period || now().slice(0, 7), at: now(), status: 'pagado',
    });
    const acc = this.state.accounts.find((a) => a.code === '520') || this.state.accounts.find((a) => a.type === 'expense');
    await this._createEntry({ type: 'expense', accountId: acc?.id, amount: amt, description: 'Nómina ' + emp.name + ' ' + (period || '') });
    return this.persist();
  }

  // —— Invoicing ——
  async emitInvoice({ customer, lines, total, notes }) {
    if (!customer?.trim()) throw new Error('Cliente obligatorio');
    const inv = {
      id: uid(),
      number: 'F-' + String((this.state.invoices.length || 0) + 1).padStart(4, '0'),
      customer: customer.trim(), lines: lines || [], total: +total || 0,
      notes: notes || '', status: 'emitida', at: now(),
    };
    this.state.invoices.unshift(inv);
    if (inv.total > 0) {
      const acc = this.state.accounts.find((a) => a.type === 'income');
      await this._createEntry({ type: 'income', accountId: acc?.id, amount: inv.total, description: 'Factura ' + inv.number });
    }
    this.audit('invoice.emit', inv.number);
    return this.persist();
  }

  // —— Warehouse ——
  getStock() {
    return { items: this.state.inventory, products: this.state.products };
  }

  async createReception({ supplier, lines, notes }) {
    const rec = {
      id: uid(),
      code: 'R-' + String((this.state.receptions.length || 0) + 1).padStart(4, '0'),
      supplier: supplier || 'Proveedor', lines: lines || [], notes: notes || '',
      status: 'pendiente', at: now(),
    };
    this.state.receptions.unshift(rec);
    this.audit('reception.create', rec.code);
    return this.persist();
  }

  async enterReception({ receptionId, ok, problem }) {
    const rec = this.state.receptions.find((r) => r.id === receptionId);
    if (!rec) throw new Error('Recepción no encontrada');
    if (ok === false || problem) {
      rec.status = 'problema';
      rec.problem = problem || 'Incidencia en recepción';
      this.audit('reception.problem', rec.code);
      return this.persist();
    }
    for (const l of rec.lines || []) {
      if (l.productId) {
        const p = this.state.products.find((x) => x.id === l.productId);
        const inv = this.state.inventory.find((i) => i.productId === l.productId);
        const q = +l.qty || 1;
        if (p) p.stock = Number(p.stock || 0) + q;
        if (inv) inv.quantity = Number(inv.quantity || 0) + q;
      } else if (l.name) {
        await this.createProduct({ name: l.name, price: l.price || 0, cost: l.cost || 0, stock: l.qty || 1 });
      }
    }
    rec.status = 'recibido';
    rec.enteredAt = now();
    this.audit('reception.enter', rec.code);
    return this.persist();
  }

  async createTransfer({ fromUnitId, toUnitId, productId, qty, notes }) {
    if (!(+qty > 0)) throw new Error('Cantidad inválida');
    const t = {
      id: uid(), fromUnitId, toUnitId, productId, qty: +qty, notes: notes || '',
      status: 'ok', at: now(),
      from: this.state.salesUnits.find((u) => u.id === fromUnitId)?.name || fromUnitId || 'Origen',
      to: this.state.salesUnits.find((u) => u.id === toUnitId)?.name || toUnitId || 'Destino',
    };
    this.state.transfers.unshift(t);
    this.audit('transfer', t.from + '→' + t.to);
    return this.persist();
  }

  async createSalesUnit({ code, name }) {
    if (!code?.trim()) throw new Error('Código obligatorio');
    this.state.salesUnits.push({ id: uid(), code: code.trim(), name: name || code, active: true });
    return this.persist();
  }

  // —— Costing ——
  async saveCostSheet({ id, name, cost, price, productId }) {
    if (id) {
      const c = this.state.costSheets.find((x) => x.id === id);
      if (c) Object.assign(c, { name, cost: +cost, price: +price, productId });
    } else {
      this.state.costSheets.unshift({ id: uid(), name, cost: +cost, price: +price, productId });
    }
    this.audit('costsheet.save', name);
    return this.persist();
  }

  async deleteCostSheet(id) {
    this.state.costSheets = this.state.costSheets.filter((c) => c.id !== id);
    return this.persist();
  }

  async savePriceSheet({ id, name, price, productId }) {
    if (id) {
      const c = this.state.priceSheets.find((x) => x.id === id);
      if (c) Object.assign(c, { name, price: +price, productId });
    } else {
      this.state.priceSheets.unshift({ id: uid(), name, price: +price, productId });
    }
    return this.persist();
  }

  async deletePriceSheet(id) {
    this.state.priceSheets = this.state.priceSheets.filter((c) => c.id !== id);
    return this.persist();
  }

  // —— Master / users / permissions ——
  async createUser({ username, password, role, displayName }) {
    if (!username?.trim()) throw new Error('Usuario obligatorio');
    if (this.state.users.some((u) => u.username === username.trim())) throw new Error('Usuario ya existe');
    this.state.users.push({
      id: uid(), username: username.trim(), password: password || 'changeme',
      role: role || 'cashier', displayName: displayName || username, active: true,
    });
    this.audit('user.create', username);
    return this.persist();
  }

  async updateUser({ id, ...patch }) {
    const u = this.state.users.find((x) => x.id === id);
    if (!u) throw new Error('Usuario no encontrado');
    Object.assign(u, patch);
    return this.persist();
  }

  async deactivateUser(id) {
    const u = this.state.users.find((x) => x.id === id);
    if (u) u.active = false;
    this.audit('user.deactivate', id);
    return this.persist();
  }

  async updateRolePermissions(role, permissions) {
    this.state.rolePermissions[role] = { ...(this.state.rolePermissions[role] || {}), ...permissions };
    this.audit('permissions', role);
    return this.persist();
  }

  async updateModules(modules) {
    this.state.modules = { ...this.state.modules, ...modules };
    return this.persist();
  }

  async createTenant({ name }) {
    const t = { id: uid(), name: name || 'Tenant', active: true };
    this.state.tenants.push(t);
    return this.persist();
  }

  async resetPlatform(confirm) {
    if (confirm !== 'RESET') throw new Error('Confirmación inválida (escriba RESET)');
    this.state = emptyState();
    this.audit('master.reset', 'platform');
    return this.persist();
  }

  // —— Tenant ——
  async updateTenant(patch) {
    this.state.tenant = { ...this.state.tenant, ...patch };
    this.audit('tenant.update', JSON.stringify(patch));
    return this.persist();
  }

  // —— Audit / backups (salvas) ——
  async createBackup(label) {
    const snap = JSON.parse(JSON.stringify(this.state));
    const meta = {
      id: uid(), cid: 'bck-' + uid().slice(0, 12),
      label: (label || 'salva').trim(), at: now(),
      size: JSON.stringify(snap).length,
    };
    this.state.backups.unshift({ ...meta, snapshot: snap });
    this.state.backups = this.state.backups.slice(0, 20);
    this.audit('backup.create', meta.cid);
    await this.persist();
    return meta;
  }

  async restoreBackup(cid) {
    const b = this.state.backups.find((x) => x.cid === cid || x.id === cid);
    if (!b || !b.snapshot) throw new Error('Salva no encontrada');
    const backups = this.state.backups;
    this.state = { ...b.snapshot, backups };
    this.audit('backup.restore', cid);
    return this.persist();
  }

  async exportBackup() {
    const pack = await this.store.exportSnapshot();
    return pack;
  }

  async importBackup(raw) {
    const state = await this.store.importSnapshot(raw);
    this.state = { ...emptyState(), ...state };
    this.audit('backup.import', 'ok');
    return this.persist();
  }

  listAuditTrail() { return this.state.audit.slice(); }
  listSystemErrors() { return this.state.systemErrors.slice(); }

  async history() { return this.store.history(); }
}
