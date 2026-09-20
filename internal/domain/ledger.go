package domain

import "time"

// Ecuación ampliada de la contabilidad:
//   Activo = Pasivo + Patrimonio + (Ingresos − Gastos)
//
// Cada movimiento se registra en partida doble:
//   Ingreso:  Debe Caja/Banco  |  Haber Ingresos
//   Gasto:    Debe Gasto       |  Haber Caja/Banco
//   Factura emitida (cobro caja): Debe Caja | Haber Ingresos

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
		// Activo ↑, Ingreso ↑  →  Activo = … + Ingresos
		if asset != nil {
			asset.Balance += entry.Amount
		}
		result.Balance += entry.Amount
	case "expense":
		// Gasto ↑, Activo ↓  →  Activo = … − Gastos
		result.Balance += entry.Amount
		if asset != nil {
			asset.Balance -= entry.Amount
		}
	case "transfer":
		// solo entre activos
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
		switch a.Type {
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

// ApplyInventoryIn entrada a almacén: Debe Inventario, Haber Caja (o CxP simplificado como Caja).
func ApplyInventoryIn(snap *StoreSnapshot, amountBase float64) {
	inv := FindAccountByCode(snap.Accounts, "1300")
	cash := FindAccountByCode(snap.Accounts, "1000")
	if inv == nil {
		inv = FindAccountByType(snap.Accounts, "asset")
	}
	if inv != nil {
		inv.Balance += amountBase
	}
	if cash != nil {
		cash.Balance -= amountBase
	}
}

// ApplyInventoryOut salida de almacén: Debe Costo de ventas, Haber Inventario.
func ApplyInventoryOut(snap *StoreSnapshot, amountBase float64) {
	inv := FindAccountByCode(snap.Accounts, "1300")
	cogs := FindAccountByCode(snap.Accounts, "5000")
	if inv != nil {
		inv.Balance -= amountBase
	}
	if cogs != nil {
		cogs.Balance += amountBase
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
