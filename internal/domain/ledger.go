package domain

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
