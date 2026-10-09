package domain

import (
	"time"

	"github.com/google/uuid"
)

// normalizeAccountType unifica códigos EN/ES del plan de cuentas al agregar la ecuación.
func normalizeAccountType(t string) string {
	switch t {
	case "asset", "activo", "Activo":
		return "asset"
	case "liability", "pasivo", "Pasivo":
		return "liability"
	case "equity", "patrimonio", "Patrimonio":
		return "equity"
	case "income", "ingreso", "Ingreso", "ingresos":
		return "income"
	case "expense", "egreso", "Egreso", "gasto", "Gasto", "gastos":
		return "expense"
	default:
		return t
	}
}


// Ecuación ampliada de la contabilidad:
//   Activo = Pasivo + Patrimonio + (Ingresos − Gastos)
//
// Cada movimiento se registra en partida doble:
//   Ingreso:  Debe Caja/Banco  |  Haber Ingresos
//   Gasto:    Debe Gasto       |  Haber Caja/Banco
//   Factura emitida (cobro caja): Debe Caja | Haber Ingresos

func newEntryID() string { return uuid.NewString() }

func FindAccountByCode(accounts map[string]*Account, code string) *Account {
	for _, a := range accounts {
		if a != nil && a.Code == code && a.Active {
			return a
		}
	}
	return nil
}

func FindAccountByType(accounts map[string]*Account, typ string) *Account {
	for _, a := range accounts {
		if a != nil && a.Type == typ && a.Active {
			return a
		}
	}
	return nil
}

// ApplyDoubleEntry actualiza saldos según tipo de movimiento.
// accountID es la cuenta de resultado (ingreso o gasto);
// assetAccountID es la contrapartida de activo (caja/banco). Si vacío, usa Caja 1000.
func ApplyDoubleEntry(snap *StoreSnapshot, entry *Entry) {
	if snap == nil || entry == nil || entry.Amount == 0 {
		return
	}
	asset := snap.Accounts[entry.Counterpart]
	if asset == nil {
		asset = FindAccountByCode(snap.Accounts, "1000")
	}
	if asset == nil {
		asset = FindAccountByType(snap.Accounts, "asset")
	}
	result := snap.Accounts[entry.AccountID]
	if result == nil {
		return
	}
	if entry.Counterpart == "" && asset != nil {
		entry.Counterpart = asset.ID
	}
	switch entry.Type {
	case "income":
		// Debe Caja/activo (Counterpart) | Haber Ingresos (AccountID)
		if asset != nil {
			asset.Balance += entry.Amount
		}
		result.Balance += entry.Amount
	case "expense":
		// Debe Gasto/COGS (AccountID) | Haber Caja o Inventario (Counterpart)
		result.Balance += entry.Amount
		if asset != nil {
			asset.Balance -= entry.Amount
		}
	case "inventory":
		// Debe Inventario (AccountID) | Haber Caja/CxP (Counterpart)
		result.Balance += entry.Amount
		if asset != nil {
			asset.Balance -= entry.Amount
		}
	case "transfer":
		if asset != nil {
			asset.Balance -= entry.Amount
		}
		result.Balance += entry.Amount
	default:
		result.Balance += entry.Amount
	}
}

// EquationSnapshot calcula los totales de la ecuación ampliada.
func EquationSnapshot(snap *StoreSnapshot) map[string]float64 {
	var activo, pasivo, patrimonio, ingresos, gastos float64
	for _, a := range snap.Accounts {
		if a == nil {
			continue
		}
		switch normalizeAccountType(a.Type) {
		case "asset":
			activo += a.Balance
		case "liability":
			pasivo += a.Balance
		case "equity":
			patrimonio += a.Balance
		case "income":
			ingresos += a.Balance
		case "expense":
			gastos += a.Balance
		}
	}
	return map[string]float64{
		"activo":     activo,
		"pasivo":     pasivo,
		"patrimonio": patrimonio,
		"ingresos":   ingresos,
		"gastos":     gastos,
		"neto":       ingresos - gastos,
		// lado derecho de la ecuación ampliada
		"pasivo_patrimonio_neto": pasivo + patrimonio + (ingresos - gastos),
	}
}

// PostInvoiceToLedger genera asiento de ingreso al emitir factura (cobro en caja).
func PostInvoiceToLedger(snap *StoreSnapshot, inv *Invoice, userID string) *Entry {
	if inv == nil || inv.Total <= 0 {
		return nil
	}
	incomeAcc := FindAccountByCode(snap.Accounts, "4000")
	if incomeAcc == nil {
		incomeAcc = FindAccountByType(snap.Accounts, "income")
	}
	cash := FindAccountByCode(snap.Accounts, "1000")
	if cash == nil {
		cash = FindAccountByType(snap.Accounts, "asset")
	}
	if incomeAcc == nil {
		return nil
	}
	e := Entry{
		Type:        "income",
		AccountID:   incomeAcc.ID,
		Counterpart: "",
		Amount:      inv.Total,
		Currency:    inv.Currency,
		Description: "Factura " + inv.Number + " — " + inv.ClientName,
		Ref:         inv.ID,
		CreatedBy:   userID,
	}
	if cash != nil {
		e.Counterpart = cash.ID
	}
	ApplyDoubleEntry(snap, &e)
	return &e
}

// DefaultCurrencies nomenclador inicial (rate respecto a moneda base).
func DefaultCurrencies(base string) map[string]*CurrencyRate {
	now := time.Now().UTC()
	if base == "" {
		base = "CUP"
	}
	m := map[string]*CurrencyRate{
		"CUP": {Code: "CUP", Name: "Peso cubano", Rate: 1, Active: true, UpdatedAt: now},
		"USD": {Code: "USD", Name: "Dólar estadounidense", Rate: 320, Active: true, UpdatedAt: now},
		"EUR": {Code: "EUR", Name: "Euro", Rate: 350, Active: true, UpdatedAt: now},
		"MLC": {Code: "MLC", Name: "Moneda libremente convertible", Rate: 300, Active: true, UpdatedAt: now},
	}
	if base != "CUP" {
		// si la base no es CUP, normalizar: base rate=1, otras relativas
		baseRate := 1.0
		if c, ok := m[base]; ok {
			baseRate = c.Rate
		}
		for _, c := range m {
			c.Rate = c.Rate / baseRate
		}
		if c, ok := m[base]; ok {
			c.Rate = 1
		}
	}
	return m
}

// ToBase convierte importe en moneda foreign a moneda base.
func ToBase(snap *StoreSnapshot, amount float64, currency string) float64 {
	if snap == nil || amount == 0 {
		return amount
	}
	base := snap.Tenant.Currency
	if base == "" {
		base = "CUP"
	}
	if currency == "" || currency == base {
		return amount
	}
	if snap.Currencies == nil {
		return amount
	}
	c, ok := snap.Currencies[currency]
	if !ok || c == nil || c.Rate <= 0 {
		return amount
	}
	return amount * c.Rate
}

// ApplyIncome registra venta al contado: Debe Caja, Haber Ingresos.
func ApplyIncome(snap *StoreSnapshot, amountBase float64, desc, userID string) *Entry {
	if amountBase <= 0 {
		return nil
	}
	incomeAcc := FindAccountByCode(snap.Accounts, "4000")
	if incomeAcc == nil {
		incomeAcc = FindAccountByType(snap.Accounts, "income")
	}
	cash := FindAccountByCode(snap.Accounts, "1000")
	if incomeAcc == nil {
		return nil
	}
	e := Entry{
		Type: "income", AccountID: incomeAcc.ID, Amount: amountBase,
		Currency: snap.Tenant.Currency, Description: desc, CreatedBy: userID,
	}
	if cash != nil {
		e.Counterpart = cash.ID
	}
	ApplyDoubleEntry(snap, &e)
	return &e
}

// ApplyInventoryIn entrada a almacén: Debe Inventario 1300 | Haber Caja 1000.
// Devuelve el asiento listo para append en snap.Entries (misma fuente que ventas/gastos).
func ApplyInventoryIn(snap *StoreSnapshot, amountBase float64, desc, userID string) *Entry {
	if amountBase <= 0 {
		return nil
	}
	inv := FindAccountByCode(snap.Accounts, "1300")
	cash := FindAccountByCode(snap.Accounts, "1000")
	if inv == nil {
		inv = FindAccountByType(snap.Accounts, "asset")
	}
	if inv == nil {
		return nil
	}
	e := Entry{
		Type: "inventory", AccountID: inv.ID, Amount: amountBase,
		Currency: snap.Tenant.Currency, Description: desc, CreatedBy: userID,
	}
	if cash != nil {
		e.Counterpart = cash.ID
	}
	ApplyDoubleEntry(snap, &e)
	return &e
}

// ApplyInventoryOut (COGS): Debe Costo de ventas 5000 | Haber Inventario 1300.
func ApplyInventoryOut(snap *StoreSnapshot, amountBase float64, desc, userID string) *Entry {
	if amountBase <= 0 {
		return nil
	}
	inv := FindAccountByCode(snap.Accounts, "1300")
	cogs := FindAccountByCode(snap.Accounts, "5000")
	if cogs == nil {
		cogs = FindAccountByType(snap.Accounts, "expense")
	}
	if cogs == nil {
		return nil
	}
	e := Entry{
		Type: "expense", AccountID: cogs.ID, Amount: amountBase,
		Currency: snap.Tenant.Currency, Description: desc, CreatedBy: userID,
	}
	if inv != nil {
		e.Counterpart = inv.ID
	}
	ApplyDoubleEntry(snap, &e)
	return &e
}

// ApplyExpense gasto manual: Debe gasto | Haber Caja.
func ApplyExpense(snap *StoreSnapshot, amountBase float64, expenseAccountID, desc, userID string) *Entry {
	if amountBase <= 0 {
		return nil
	}
	exp := snap.Accounts[expenseAccountID]
	if exp == nil {
		exp = FindAccountByCode(snap.Accounts, "5100")
	}
	if exp == nil {
		exp = FindAccountByType(snap.Accounts, "expense")
	}
	cash := FindAccountByCode(snap.Accounts, "1000")
	if exp == nil {
		return nil
	}
	e := Entry{
		Type: "expense", AccountID: exp.ID, Amount: amountBase,
		Currency: snap.Tenant.Currency, Description: desc, CreatedBy: userID,
	}
	if cash != nil {
		e.Counterpart = cash.ID
	}
	ApplyDoubleEntry(snap, &e)
	return &e
}

// AppendPostedEntry completa ID/fechas y añade al libro único.
func AppendPostedEntry(snap *StoreSnapshot, e *Entry, tenantID, date string) {
	if snap == nil || e == nil {
		return
	}
	if e.ID == "" {
		e.ID = newEntryID()
	}
	if e.TenantID == "" {
		e.TenantID = tenantID
	}
	if e.Date == "" {
		e.Date = date
	}
	if e.Date == "" {
		e.Date = time.Now().Format("2006-01-02")
	}
	if e.CreatedAt.IsZero() {
		e.CreatedAt = time.Now().UTC()
	}
	if e.Currency == "" && snap.Tenant.Currency != "" {
		e.Currency = snap.Tenant.Currency
	}
	snap.Entries = append(snap.Entries, *e)
}

// EntryBalanced indica si el asiento tiene cuenta principal, contrapartida e importe.
func EntryBalanced(e Entry) bool {
	return e.AccountID != "" && e.Counterpart != "" && e.Amount > 0
}

// LedgerIntegrity comprueba ecuación y asientos sin contrapartida.
func LedgerIntegrity(snap *StoreSnapshot) map[string]any {
	eq := EquationSnapshot(snap)
	unbalanced := 0
	for _, e := range snap.Entries {
		if e.Amount > 0 && (e.AccountID == "" || e.Counterpart == "") {
			unbalanced++
		}
	}
	left := eq["activo"]
	right := eq["pasivo_patrimonio_neto"]
	delta := left - right
	return map[string]any{
		"equation":            eq,
		"equation_ok":         absFloat(delta) < 0.02,
		"equation_delta":      delta,
		"entries_total":       len(snap.Entries),
		"entries_unbalanced":  unbalanced,
		"ok":                  absFloat(delta) < 0.02 && unbalanced == 0,
	}
}

func absFloat(v float64) float64 {
	if v < 0 {
		return -v
	}
	return v
}

// BalanceSheet agrupa activo / pasivo / patrimonio (sin P&L de periodo en el cuerpo).
func BalanceSheet(snap *StoreSnapshot) map[string]any {
	type line struct {
		ID      string  `json:"id"`
		Code    string  `json:"code"`
		Name    string  `json:"name"`
		Balance float64 `json:"balance"`
	}
	var assets, liabilities, equity []line
	var ta, tl, te float64
	for _, a := range snap.Accounts {
		if a == nil || !a.Active {
			continue
		}
		l := line{ID: a.ID, Code: a.Code, Name: a.Name, Balance: a.Balance}
		switch normalizeAccountType(a.Type) {
		case "asset":
			assets = append(assets, l)
			ta += a.Balance
		case "liability":
			liabilities = append(liabilities, l)
			tl += a.Balance
		case "equity":
			equity = append(equity, l)
			te += a.Balance
		}
	}
	eq := EquationSnapshot(snap)
	return map[string]any{
		"assets": assets, "liabilities": liabilities, "equity": equity,
		"total_assets": ta, "total_liabilities": tl, "total_equity": te,
		"net_income": eq["neto"],
		"equation": eq,
	}
}

// TAccountLines construye debe/haber de una cuenta a partir de asientos.
func TAccountLines(snap *StoreSnapshot, accountID string) (debe []Entry, haber []Entry, saldo float64) {
	acc := snap.Accounts[accountID]
	if acc == nil {
		return nil, nil, 0
	}
	for _, e := range snap.Entries {
		if e.AccountID == accountID {
			// cuenta de resultado como "principal"
			switch e.Type {
			case "income":
				haber = append(haber, e)
			case "expense", "inventory":
				debe = append(debe, e)
			default:
				debe = append(debe, e)
			}
		}
		if e.Counterpart == accountID {
			switch e.Type {
			case "income":
				debe = append(debe, e) // caja recibe → debe en caja
			case "expense":
				haber = append(haber, e) // caja paga → haber en caja
			default:
				haber = append(haber, e)
			}
		}
	}
	return debe, haber, acc.Balance
}
