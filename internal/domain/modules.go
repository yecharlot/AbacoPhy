package domain

import "time"

// Catálogo de módulos de la aplicación (activables por tenant desde master).
// Core = siempre activos. Optional = el master los enciende/apaga por negocio.

const (
	ModDashboard      = "dashboard"
	ModIngresos       = "ingresos"
	ModGastos         = "gastos"
	ModInventario     = "inventario"
	ModNomencladores  = "nomencladores"
	ModAlmacen        = "almacen"
	ModUnidadesVenta  = "unidades"
	ModRecepcion      = "recepcion"
	ModVendedor       = "vendedor"
	ModFichasCosto    = "fichas_costo"
	ModFichasPrecio   = "fichas_precio"
	ModFacturas       = "facturas"
	ModNomina         = "nomina"
	ModCuentas        = "cuentas"
	ModReportes       = "reportes"
	ModTraza          = "traza"
	ModSalvas         = "salvas"
	ModTenant         = "tenant"
	ModUsuarios       = "usuarios"
	ModMaster         = "master"
	ModSync           = "sync"
	ModMonedas        = "monedas"
	ModCargos         = "cargos"
	ModProductos      = "productos"
	ModCuentasT       = "cuentas_t"
	ModPedidosOnline  = "pedidos_online"
	ModTienda         = "tienda" // catálogo público / ventas tipo La Tati
	ModMeasureUnits   = "measure_units"
)

// ModuleMeta describe un módulo para la UI master.
type ModuleMeta struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Core        bool   `json:"core"` // no se puede desactivar
	Group       string `json:"group"`
}

// CatalogModules lista completa para configuración.
func CatalogModules() []ModuleMeta {
	return []ModuleMeta{
		{ModDashboard, "Inicio", "Panel principal", true, "core"},
		{ModNomencladores, "Nomencladores", "Productos, cargos, monedas, cuentas, unidades de medida", true, "core"},
		{ModCuentas, "Cuentas contables", "Plan de cuentas (también en nomencladores)", true, "core"},
		{ModCuentasT, "Cuentas T", "Movimientos por cuenta", true, "contabilidad"},
		{ModSync, "Sincronización", "Offline / red", true, "core"},
		{ModMaster, "Master", "Configuración profunda del sistema", true, "core"},
		{ModTenant, "Negocio", "Datos del tenant", true, "core"},
		{ModUsuarios, "Usuarios", "Altas y roles", true, "core"},
		{ModTraza, "Traza", "Auditoría de operaciones", true, "core"},
		{ModSalvas, "Salvas", "Snapshot CID / IPFS", true, "core"},
		{ModReportes, "Informes", "Estados financieros", true, "contabilidad"},
		{ModIngresos, "Ingresos", "Registro de ingresos", false, "contabilidad"},
		{ModGastos, "Gastos", "Registro de gastos", false, "contabilidad"},
		{ModInventario, "Inventario", "Existencias y movimientos", false, "ops"},
		{ModAlmacen, "Almacén", "Stock físico, validar IR y dar entrada; transferencias a puntos de venta", false, "ops"},
		{ModUnidadesVenta, "Unidades de venta", "Puntos de venta", false, "ops"},
		{ModRecepcion, "Informe de recepción", "Compras con/sin factura (solo económico); avisa al almacén", false, "ops"},
		{ModVendedor, "Vendedor / POS", "Ventas en mostrador", false, "ops"},
		{ModFichasCosto, "Fichas de costo", "Costo unitario según normas (MP, salario, indirectos)", false, "ops"},
		{ModFichasPrecio, "Fichas de precio", "Precio de venta, margen y lista de precios", false, "ops"},
		{ModFacturas, "Facturas", "Facturación y PDF", false, "contabilidad"},
		{ModNomina, "Nómina", "Trabajadores y liquidaciones", false, "contabilidad"},
		{ModProductos, "Productos", "Nomenclador de productos", false, "nomencladores"},
		{ModCargos, "Cargos", "Nomenclador de cargos", false, "nomencladores"},
		{ModMonedas, "Monedas", "Tipos de cambio", false, "nomencladores"},
		{ModMeasureUnits, "Unidades de medida", "kg, l, u, caja…", false, "nomencladores"},
		{ModPedidosOnline, "Pedidos online", "Pedidos de clientes (estilo La Tati)", false, "comercio"},
		{ModTienda, "Tienda / catálogo", "Catálogo público para clientes", false, "comercio"},
	}
}

// DefaultEnabledModules — módulos activos al crear un negocio.
func DefaultEnabledModules() map[string]bool {
	m := map[string]bool{}
	for _, meta := range CatalogModules() {
		// Core + contabilidad/ops típicas de PyME; comercio offline por defecto
		if meta.Core || meta.Group == "contabilidad" || meta.Group == "ops" || meta.Group == "nomencladores" {
			m[meta.ID] = true
		} else {
			m[meta.ID] = false
		}
	}
	return m
}

// MeasureUnit — nomenclador de unidades de medida.
type MeasureUnit struct {
	ID        string    `json:"id"`
	TenantID  string    `json:"tenant_id"`
	Code      string    `json:"code"` // KG, L, U, CAJA
	Name      string    `json:"name"`
	Symbol    string    `json:"symbol,omitempty"`
	Active    bool      `json:"active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// PriceSheet — ficha de precio (distinta de ficha de costo).
// Costo = cuánto cuesta producir/adquirir. Precio = a cuánto se vende y con qué margen.
type PriceSheet struct {
	ID            string    `json:"id"`
	TenantID      string    `json:"tenant_id"`
	ProductID     string    `json:"product_id"`
	ProductCode   string    `json:"product_code,omitempty"`
	ProductName   string    `json:"product_name,omitempty"`
	CostRef       float64   `json:"cost_ref"`       // referencia de costo
	MarginPct     float64   `json:"margin_pct"`     // % sobre costo
	Price         float64   `json:"price"`          // precio de venta
	Currency      string    `json:"currency"`
	ValidFrom     string    `json:"valid_from,omitempty"`
	ValidTo       string    `json:"valid_to,omitempty"`
	Notes         string    `json:"notes,omitempty"`
	CreatedBy     string    `json:"created_by"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// OnlineOrder — pedido online (cliente final → negocio).
type OnlineOrder struct {
	ID          string            `json:"id"`
	TenantID    string            `json:"tenant_id"`
	Number      string            `json:"number"`
	Customer    string            `json:"customer"`
	Phone       string            `json:"phone,omitempty"`
	Address     string            `json:"address,omitempty"`
	Status      string            `json:"status"` // pending|confirmed|cancelled|delivered
	Lines       []OnlineOrderLine `json:"lines"`
	Total       float64           `json:"total"`
	Currency    string            `json:"currency"`
	Notes       string            `json:"notes,omitempty"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
}

type OnlineOrderLine struct {
	ProductID   string  `json:"product_id"`
	ProductCode string  `json:"product_code,omitempty"`
	ProductName string  `json:"product_name,omitempty"`
	Qty         float64 `json:"qty"`
	UnitPrice   float64 `json:"unit_price"`
	LineTotal   float64 `json:"line_total"`
}
