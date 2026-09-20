package domain

import (
	"time"

	"github.com/google/uuid"
)

// Default chart of accounts (adaptable por negocio).
func DefaultAccounts(tenantID string) map[string]*Account {
	now := time.Now().UTC()
	mk := func(code, name, typ string) *Account {
		return &Account{
			ID: uuid.NewString(), TenantID: tenantID, Code: code, Name: name,
			Type: typ, Active: true, CreatedAt: now,
		}
	}
	list := []*Account{
		mk("1000", "Caja", "asset"),
		mk("1100", "Banco", "asset"),
		mk("1200", "Cuentas por cobrar", "asset"),
		mk("1300", "Inventario", "asset"),
		mk("2000", "Cuentas por pagar", "liability"),
		mk("3000", "Capital", "equity"),
		mk("4000", "Ingresos por ventas", "income"),
		mk("4100", "Otros ingresos", "income"),
		mk("5000", "Costo de ventas", "expense"),
		mk("5100", "Gastos operativos", "expense"),
		mk("5200", "Nómina", "expense"),
		mk("5300", "Impuestos", "expense"),
	}
	m := make(map[string]*Account, len(list))
	for _, a := range list {
		m[a.ID] = a
	}
	return m
}

// BootstrapTenant crea negocio demo + usuario master.
// Master por defecto: usuario master / contraseña AbacoPhy#Master1
func BootstrapTenant(name, slug, currency string) *StoreSnapshot {
	now := time.Now().UTC()
	tid := uuid.NewString()
	if currency == "" {
		currency = "CUP"
	}
	if slug == "" {
		slug = "default"
	}
	tenant := Tenant{
		ID: tid, Slug: slug, Name: name, Currency: currency,
		Timezone: "America/Havana", Active: true, CreatedAt: now, UpdatedAt: now,
		Settings: map[string]string{
			"brand_name": "ÁbacoPhy",
			"locale":     "es",
		},
	}
	// password hash se rellena fuera (auth.HashPassword)
	master := &User{
		ID: uuid.NewString(), TenantID: tid, Username: "master",
		DisplayName: "Master ÁbacoPhy", Role: RoleMaster, Active: true,
		CreatedAt: now, UpdatedAt: now,
	}
	admin := &User{
		ID: uuid.NewString(), TenantID: tid, Username: "admin",
		DisplayName: "Administrador", Role: RoleAdmin, Active: true,
		CreatedAt: now, UpdatedAt: now,
	}
	return &StoreSnapshot{
		Tenant:    tenant,
		Users:     map[string]*User{master.ID: master, admin.ID: admin},
		Accounts:  DefaultAccounts(tid),
		Currencies: DefaultCurrencies(currency),
		Entries:   []Entry{},
		Inventory: map[string]*InventoryItem{},
		InvMoves:  []InventoryMove{},
		Employees: map[string]*Employee{},
		Payslips:  []Payslip{},
		Invoices:  []Invoice{},
		Rev:       0,
		UpdatedAt: now,
	}
}
