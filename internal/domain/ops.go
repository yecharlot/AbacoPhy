package domain

import "time"

// Producto del nomenclador (código único por negocio, válido en todas las unidades).
type Product struct {
	ID           string    `json:"id"`
	TenantID     string    `json:"tenant_id"`
	Code         string    `json:"code"` // ej. P-0001
	Name         string    `json:"name"`
	Unit         string    `json:"unit"` // u, kg, l, caja...
	Category     string    `json:"category,omitempty"`
	CostStd      float64   `json:"cost_std"`  // costo estándar / ficha
	PriceSale    float64   `json:"price_sale"`
	Currency     string    `json:"currency"`
	Barcode      string    `json:"barcode,omitempty"`
	Active       bool      `json:"active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	Metadata   Metadata  `json:"metadata,omitempty"`
}

// Unidad de venta (punto de venta del negocio).
type SalesUnit struct {
	ID        string    `json:"id"`
	TenantID  string    `json:"tenant_id"`
	Code      string    `json:"code"`
	Name      string    `json:"name"`
	Address   string    `json:"address,omitempty"`
	Phone     string    `json:"phone,omitempty"`
	Active    bool      `json:"active"`
	CreatedAt time.Time `json:"created_at"`
	Metadata   Metadata  `json:"metadata,omitempty"`
}

// Stock en almacén central (por producto).
type WarehouseStock struct {
	ProductID  string  `json:"product_id"`
	Qty        float64 `json:"qty"`
	AvgCost    float64 `json:"avg_cost"` // promedio ponderado
	AmountBase float64 `json:"amount_base"`
	Metadata   Metadata  `json:"metadata,omitempty"`
}

// Stock en una unidad de venta.
type UnitStock struct {
	UnitID     string  `json:"unit_id"`
	ProductID  string  `json:"product_id"`
	Qty        float64 `json:"qty"`
	AvgCost    float64 `json:"avg_cost"`
	AmountBase float64 `json:"amount_base"`
	Metadata   Metadata  `json:"metadata,omitempty"`
}

// Informe de recepción (módulo desacoplable "recepcion").
// Flujo: económico registra compra documental → aviso a almacén;
// almacenero valida físicamente y da entrada o reporta problema.
// Status: pendiente_entrada | entrado | problemas_entrada | anulado (abandono definitivo).
// Estado visual canónico: Metadata int.reception_status.
type ReceptionNote struct {
	ID           string          `json:"id"`
	TenantID     string          `json:"tenant_id"`
	Number       string          `json:"number"`
	Date         string          `json:"date"`
	HasInvoice   bool            `json:"has_invoice"`             // compra con factura
	InvoiceRef   string          `json:"invoice_ref,omitempty"`   // nº factura si aplica
	Supplier     string          `json:"supplier,omitempty"`      // obligatorio si has_invoice
	Receiver     string          `json:"receiver"`                // quién recibe la mercancía
	DocRef       string          `json:"doc_ref,omitempty"`       // alias legacy de invoice_ref
	Lines        []ReceptionLine `json:"lines"`
	TotalCost    float64         `json:"total_cost"`
	Currency     string          `json:"currency"`
	Status       string          `json:"status"` // pendiente_entrada|entrado|anulado
	CreatedBy    string          `json:"created_by"`
	CreatedAt    time.Time       `json:"created_at"`
	EnteredBy    string          `json:"entered_by,omitempty"`
	EnteredAt    *time.Time      `json:"entered_at,omitempty"`
	Note         string          `json:"note,omitempty"`
	Metadata   Metadata  `json:"metadata,omitempty"`
}

type ReceptionLine struct {
	ProductID   string  `json:"product_id"`
	ProductCode string  `json:"product_code,omitempty"`
	ProductName string  `json:"product_name,omitempty"`
	Unit        string  `json:"unit,omitempty"` // unidad de medida
	// Qty / UnitCost / Amount: lo declarado en el Informe de Recepción (documento).
	Qty      float64 `json:"qty"`
	UnitCost float64 `json:"unit_cost"`
	Amount   float64 `json:"amount"` // importe línea declarado = qty * unit_cost
	// Resultados de la entrada física (solo se rellenan al confirmar en almacén).
	// QtyReceived es lo que realmente ingresa a stock y alimenta el CPP.
	QtyReceived float64 `json:"qty_received,omitempty"`
	QtyDamaged  float64 `json:"qty_damaged,omitempty"`
	QtyRejected float64 `json:"qty_rejected,omitempty"`
	// LineStatus: ok | partial | damaged | rejected (tras entrada).
	LineStatus string   `json:"line_status,omitempty"`
	Metadata   Metadata `json:"metadata,omitempty"`
}

// Transferencia almacén → unidad de venta.
type StockTransfer struct {
	ID        string         `json:"id"`
	TenantID  string         `json:"tenant_id"`
	Number    string         `json:"number"`
	Date      string         `json:"date"`
	UnitID    string         `json:"unit_id"`
	UnitName  string         `json:"unit_name,omitempty"`
	Lines     []TransferLine `json:"lines"`
	Status    string         `json:"status"`
	CreatedBy string         `json:"created_by"`
	CreatedAt time.Time      `json:"created_at"`
	Note      string         `json:"note,omitempty"`
	Metadata   Metadata  `json:"metadata,omitempty"`
}

type TransferLine struct {
	ProductID   string  `json:"product_id"`
	ProductCode string  `json:"product_code,omitempty"`
	ProductName string  `json:"product_name,omitempty"`
	Qty         float64 `json:"qty"`
	UnitCost    float64 `json:"unit_cost"`
	Amount      float64 `json:"amount"`
	Metadata   Metadata  `json:"metadata,omitempty"`
}

// Venta de mostrador / vendedor (tributa a contabilidad).
type POSSale struct {
	ID          string       `json:"id"`
	TenantID    string       `json:"tenant_id"`
	Number      string       `json:"number"`
	Date        string       `json:"date"`
	UnitID      string       `json:"unit_id,omitempty"`
	UnitName    string       `json:"unit_name,omitempty"`
	Seller      string       `json:"seller,omitempty"`
	Lines       []POSLine    `json:"lines"`
	Subtotal    float64      `json:"subtotal"`
	Discount    float64      `json:"discount"` // importe total de rebajas
	Total       float64      `json:"total"`
	CostTotal   float64      `json:"cost_total"`
	Currency    string       `json:"currency"`
	Status      string       `json:"status"` // confirmada|anulada
	CreatedBy   string       `json:"created_by"`
	CreatedAt   time.Time    `json:"created_at"`
	Note        string       `json:"note,omitempty"`
	Metadata   Metadata  `json:"metadata,omitempty"`
}

type POSLine struct {
	ProductID   string  `json:"product_id"`
	ProductCode string  `json:"product_code,omitempty"`
	ProductName string  `json:"product_name,omitempty"`
	Qty         float64 `json:"qty"`
	UnitPrice   float64 `json:"unit_price"`
	DiscountPct float64 `json:"discount_pct,omitempty"` // % rebaja línea
	DiscountAmt float64 `json:"discount_amt,omitempty"`
	LineTotal   float64 `json:"line_total"`
	UnitCost    float64 `json:"unit_cost"`
	CostAmount  float64 `json:"cost_amount"`
	Metadata   Metadata  `json:"metadata,omitempty"`
}

// CostComponent — línea de receta en una ficha de costo (producto compuesto).
// Qty es la cantidad o fracción del componente por 1 unidad del producto elaborado.
type CostComponent struct {
	ProductID   string  `json:"product_id"`
	ProductCode string  `json:"product_code,omitempty"`
	ProductName string  `json:"product_name,omitempty"`
	Qty         float64 `json:"qty"`
	// UnitCost usado en el último cálculo (snapshot informativo).
	UnitCost float64 `json:"unit_cost,omitempty"`
	LineCost float64 `json:"line_cost,omitempty"`
	Metadata Metadata `json:"metadata,omitempty"`
}

// Ficha de costo: receta de elaboración (compuestos) + campos legacy de estructura.
// Si Components tiene elementos, el costo unitario se calcula por receta
// (materiales + tiempo×dificultad). Si no, se usa la suma de rubros legacy.
type CostSheet struct {
	ID               string          `json:"id"`
	TenantID         string          `json:"tenant_id"`
	ProductID        string          `json:"product_id"`
	ProductCode      string          `json:"product_code,omitempty"`
	ProductName      string          `json:"product_name,omitempty"`
	Period           string          `json:"period,omitempty"`
	// --- Receta (productos compuestos) ---
	Components       []CostComponent `json:"components,omitempty"`
	LaborMinutes     float64         `json:"labor_minutes,omitempty"`
	DifficultyLevel  int             `json:"difficulty_level,omitempty"`  // escala UX (p.ej. 1–5)
	DifficultyFactor float64         `json:"difficulty_factor,omitempty"` // multiplicador de cálculo
	LaborBaseRate    float64         `json:"labor_base_rate,omitempty"`   // costo por minuto (o unidad de tiempo)
	MaterialCost     float64         `json:"material_cost,omitempty"`
	LaborCost        float64         `json:"labor_cost,omitempty"`
	// --- Rubros legacy (compatibilidad / costos sin desglose de receta) ---
	MateriaPrima     float64         `json:"materia_prima"`
	MatAuxiliares    float64         `json:"materiales_auxiliares"`
	Energia          float64         `json:"energia"`
	SalarioDirecto   float64         `json:"salario_directo"`
	OtrosDirectos    float64         `json:"otros_directos"`
	GastosIndirectos float64         `json:"gastos_indirectos"`
	CostoUnitario    float64         `json:"costo_unitario"`
	PreviousCostoUnitario float64   `json:"previous_costo_unitario,omitempty"`
	PrecioSugerido   float64         `json:"precio_sugerido,omitempty"`
	Currency         string          `json:"currency"`
	Notes            string          `json:"notes,omitempty"`
	CreatedBy        string          `json:"created_by"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
	Metadata         Metadata        `json:"metadata,omitempty"`
}

// Contadores de documentos por tenant.
type DocCounters struct {
	ProductSeq    int `json:"product_seq"`
	ReceptionSeq  int `json:"reception_seq"`
	TransferSeq   int `json:"transfer_seq"`
	POSSaleSeq    int `json:"pos_sale_seq"`
	UnitSeq       int `json:"unit_seq"`
	JobSeq        int `json:"job_seq"`
	Metadata   Metadata  `json:"metadata,omitempty"`
}
