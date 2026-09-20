package domain

import (
	"fmt"
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
	// Nomenclador orientado a normativas de Finanzas y Precios (Cuba), simplificado y adaptable.
	type accDef struct {
		code, name, typ, nature, group string
		level int
	}
	defs := []accDef{
		{"1000", "Caja", "asset", "deudora", "Activo circulante", 1},
		{"1100", "Banco en moneda nacional", "asset", "deudora", "Activo circulante", 1},
		{"1110", "Banco en divisas", "asset", "deudora", "Activo circulante", 1},
		{"1200", "Cuentas por cobrar", "asset", "deudora", "Activo circulante", 1},
		{"1300", "Inventarios", "asset", "deudora", "Activo circulante", 1},
		{"1400", "Anticipos a proveedores", "asset", "deudora", "Activo circulante", 1},
		{"1500", "Activos fijos tangibles", "asset", "deudora", "Activo fijo", 1},
		{"1510", "Depreciación acumulada", "asset", "acreedora", "Activo fijo", 2},
		{"2000", "Cuentas por pagar", "liability", "acreedora", "Pasivo circulante", 1},
		{"2100", "Nómina por pagar", "liability", "acreedora", "Pasivo circulante", 1},
		{"2200", "Obligaciones con la seguridad social", "liability", "acreedora", "Pasivo circulante", 1},
		{"2300", "Provisión para vacaciones", "liability", "acreedora", "Pasivo circulante", 1},
		{"2400", "Impuestos por pagar", "liability", "acreedora", "Pasivo circulante", 1},
		{"3000", "Capital social", "equity", "acreedora", "Patrimonio", 1},
		{"3100", "Reservas", "equity", "acreedora", "Patrimonio", 1},
		{"3200", "Resultados acumulados", "equity", "acreedora", "Patrimonio", 1},
		{"4000", "Ingresos por ventas", "income", "acreedora", "Ingresos", 1},
		{"4100", "Otros ingresos", "income", "acreedora", "Ingresos", 1},
		{"5000", "Costo de ventas", "expense", "deudora", "Gastos", 1},
		{"5100", "Gastos de personal (salarios)", "expense", "deudora", "Gastos", 1},
		{"5110", "Seguridad social a cargo de la entidad", "expense", "deudora", "Gastos", 2},
		{"5120", "Provisión de vacaciones (gasto)", "expense", "deudora", "Gastos", 2},
		{"5200", "Gastos operativos", "expense", "deudora", "Gastos", 1},
		{"5300", "Gastos de impuestos", "expense", "deudora", "Gastos", 1},
	}
	m := make(map[string]*Account, len(defs))
	for _, d := range defs {
		a := mk(d.code, d.name, d.typ)
		a.Nature = d.nature
		a.Group = d.group
		a.Level = d.level
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
			"theme":      "light",
			"app_title":  "ÁbacoPhy",
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
		Products:  DefaultProducts(tid),
		SalesUnits: map[string]*SalesUnit{},
		WarehouseStock: map[string]*WarehouseStock{},
		CostSheets: map[string]*CostSheet{},
		DocCounters: DocCounters{ProductSeq: 15, JobSeq: 10},
		JobPositions: DefaultJobPositions(tid),
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


// DefaultProducts nomenclador base (código único P-xxxx).
func DefaultProducts(tenantID string) map[string]*Product {
	now := time.Now().UTC()
	items := []struct {
		code, name, unit, cat string
		cost, price float64
	}{
		{"P-0001", "Arroz", "kg", "Alimentos", 0, 0},
		{"P-0002", "Azúcar", "kg", "Alimentos", 0, 0},
		{"P-0003", "Aceite vegetal", "l", "Alimentos", 0, 0},
		{"P-0004", "Frijol", "kg", "Alimentos", 0, 0},
		{"P-0005", "Leche en polvo", "kg", "Alimentos", 0, 0},
		{"P-0006", "Harina de trigo", "kg", "Alimentos", 0, 0},
		{"P-0007", "Pasta alimenticia", "kg", "Alimentos", 0, 0},
		{"P-0008", "Jabón de lavar", "u", "Aseo", 0, 0},
		{"P-0009", "Detergente", "kg", "Aseo", 0, 0},
		{"P-0010", "Agua embotellada", "u", "Bebidas", 0, 0},
		{"P-0011", "Refresco", "u", "Bebidas", 0, 0},
		{"P-0012", "Cerveza", "u", "Bebidas", 0, 0},
		{"P-0013", "Pan", "u", "Panadería", 0, 0},
		{"P-0014", "Huevo", "u", "Alimentos", 0, 0},
		{"P-0015", "Pollo", "kg", "Cárnicos", 0, 0},
	}
	out := make(map[string]*Product, len(items))
	for _, it := range items {
		id := "prod-" + it.code
		out[id] = &Product{
			ID: id, TenantID: tenantID, Code: it.code, Name: it.name, Unit: it.unit,
			Category: it.cat, CostStd: it.cost, PriceSale: it.price, Currency: "CUP",
			Active: true, CreatedAt: now, UpdatedAt: now,
		}
	}
	return out
}


func DefaultJobPositions(tenantID string) map[string]*JobPosition {
	now := time.Now().UTC()
	names := []string{"Director", "Administrador", "Contador", "Economista", "Vendedor", "Almacenero", "Dependiente", "Chofer", "Técnico", "Auxiliar"}
	out := make(map[string]*JobPosition, len(names))
	for i, n := range names {
		code := fmt.Sprintf("C-%02d", i+1)
		id := "job-" + code
		out[id] = &JobPosition{ID: id, TenantID: tenantID, Code: code, Name: n, Active: true, CreatedAt: now}
	}
	return out
}
