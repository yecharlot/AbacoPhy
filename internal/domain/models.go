package domain

import "time"

const (
	RoleMaster   = "master"
	RoleAdmin    = "admin"
	RoleContador = "contador"
	RoleOperador = "operador"
	RoleReadonly = "readonly"
)

type Tenant struct {
	ID          string            `json:"id"`
	Slug        string            `json:"slug"`
	Name        string            `json:"name"`
	TradeName   string            `json:"trade_name,omitempty"`
	TaxID       string            `json:"tax_id,omitempty"`
	Currency    string            `json:"currency"`
	Timezone    string            `json:"timezone"`
	Address     string            `json:"address,omitempty"`
	Phone       string            `json:"phone,omitempty"`
	Email       string            `json:"email,omitempty"`
	LogoCID     string            `json:"logo_cid,omitempty"`
	Settings    map[string]string `json:"settings,omitempty"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
	Active      bool              `json:"active"`
}

type User struct {
	ID           string    `json:"id"`
	TenantID     string    `json:"tenant_id"`
	Username     string    `json:"username"`
	DisplayName  string    `json:"display_name"`
	Role         string    `json:"role"`
	PasswordHash string    `json:"password_hash,omitempty"`
	PinHash      string    `json:"pin_hash,omitempty"`
	Active       bool      `json:"active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type CurrencyRate struct {
	Code      string    `json:"code"`
	Name      string    `json:"name"`
	Rate      float64   `json:"rate"`
	Active    bool      `json:"active"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Account struct {
	ID        string    `json:"id"`
	TenantID  string    `json:"tenant_id"`
	Code      string    `json:"code"`
	Name      string    `json:"name"`
	Type      string    `json:"type"` // asset|liability|equity|income|expense
	Nature    string    `json:"nature,omitempty"` // deudora|acreedora
	Group     string    `json:"group,omitempty"`  // grupo NIIF / normativa local
	Level     int       `json:"level,omitempty"`
	ParentID  string    `json:"parent_id,omitempty"`
	Balance   float64   `json:"balance"`
	Notes     string    `json:"notes,omitempty"`
	Active    bool      `json:"active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at,omitempty"`
}

type Entry struct {
	ID           string    `json:"id"`
	TenantID     string    `json:"tenant_id"`
	Date         string    `json:"date"`
	Type         string    `json:"type"`
	AccountID    string    `json:"account_id"`
	Counterpart  string    `json:"counterpart,omitempty"`
	Amount       float64   `json:"amount"`
	Currency     string    `json:"currency"`
	OrigAmount   float64   `json:"orig_amount,omitempty"`
	OrigCurrency string    `json:"orig_currency,omitempty"`
	Description  string    `json:"description"`
	Ref          string    `json:"ref,omitempty"`
	CreatedBy    string    `json:"created_by"`
	CID          string    `json:"cid,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

type InventoryItem struct {
	ID         string    `json:"id"`
	TenantID   string    `json:"tenant_id"`
	SKU        string    `json:"sku,omitempty"`
	Name       string    `json:"name"`
	Unit       string    `json:"unit"`
	Qty        float64   `json:"qty"`
	Cost       float64   `json:"cost"`
	Price      float64   `json:"price"`
	Amount     float64   `json:"amount"`
	Currency   string    `json:"currency"`
	AmountBase float64   `json:"amount_base"`
	Category   string    `json:"category,omitempty"`
	Active     bool      `json:"active"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type InventoryMove struct {
	ID         string    `json:"id"`
	TenantID   string    `json:"tenant_id"`
	ItemID     string    `json:"item_id"`
	Kind       string    `json:"kind"`
	Qty        float64   `json:"qty"`
	Cost       float64   `json:"cost,omitempty"`
	AmountBase float64   `json:"amount_base,omitempty"`
	Note       string    `json:"note,omitempty"`
	CreatedBy  string    `json:"created_by"`
	CreatedAt  time.Time `json:"created_at"`
}

type Employee struct {
	ID              string    `json:"id"`
	TenantID        string    `json:"tenant_id"`
	Name            string    `json:"name"`
	CI              string    `json:"ci,omitempty"` // carné de identidad
	Role            string    `json:"role,omitempty"`
	Department      string    `json:"department,omitempty"`
	HireDate        string    `json:"hire_date,omitempty"`
	Salary          float64   `json:"salary"`
	Currency        string    `json:"currency"`
	// Tasas (normativa cubana, ajustables por trabajador)
	VacRate         float64   `json:"vac_rate"`          // provisión vacaciones, defecto 0.09 (9 %)
	SSEmployerRate  float64   `json:"ss_employer_rate"`  // aporte entidad seguridad social ~12.5 %
	SSWorkerRate    float64   `json:"ss_worker_rate"`    // aporte trabajador ~5 %
	// Certificados y licencias
	Certificate     string    `json:"certificate,omitempty"` // certificado médico vigente
	CertificateUntil string   `json:"certificate_until,omitempty"`
	LicenseType     string    `json:"license_type,omitempty"` // maternidad, no remunerada, etc.
	LicenseFrom     string    `json:"license_from,omitempty"`
	LicenseTo       string    `json:"license_to,omitempty"`
	VacationBalance float64   `json:"vacation_balance"` // días acumulados
	Notes           string    `json:"notes,omitempty"`
	Active          bool      `json:"active"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at,omitempty"`
}

type Payslip struct {
	ID             string    `json:"id"`
	TenantID       string    `json:"tenant_id"`
	EmployeeID     string    `json:"employee_id"`
	EmployeeName   string    `json:"employee_name,omitempty"`
	Period         string    `json:"period"`
	Gross          float64   `json:"gross"`
	VacationProv   float64   `json:"vacation_prov"`    // 9 % del salario
	SSEmployer     float64   `json:"ss_employer"`      // aporte entidad
	SSWorker       float64   `json:"ss_worker"`        // retención trabajador
	OtherDeduct    float64   `json:"other_deductions"`
	Deductions     float64   `json:"deductions"`       // total retenciones al trabajador
	Net            float64   `json:"net"`
	EmployerCost   float64   `json:"employer_cost"`    // costo total para la entidad
	Currency       string    `json:"currency"`
	Status         string    `json:"status"`
	CreatedBy      string    `json:"created_by,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

type Invoice struct {
	ID         string        `json:"id"`
	TenantID   string        `json:"tenant_id"`
	Number     string        `json:"number"`
	ClientName string        `json:"client_name"`
	ClientTax  string        `json:"client_tax,omitempty"`
	Lines      []InvoiceLine `json:"lines"`
	Subtotal   float64       `json:"subtotal"`
	Tax        float64       `json:"tax"`
	Total      float64       `json:"total"`
	Currency   string        `json:"currency"`
	Status     string        `json:"status"`
	IssuedAt   string        `json:"issued_at,omitempty"`
	CID        string        `json:"cid,omitempty"`
	CreatedBy  string        `json:"created_by"`
	CreatedAt  time.Time     `json:"created_at"`
}

type InvoiceLine struct {
	Description string  `json:"description"`
	Qty         float64 `json:"qty"`
	UnitPrice   float64 `json:"unit_price"`
	Amount      float64 `json:"amount"`
}

type AuditEntry struct {
	ID        string    `json:"id"`
	TenantID  string    `json:"tenant_id"`
	UserID    string    `json:"user_id"`
	Username  string    `json:"username,omitempty"`
	Action    string    `json:"action"`
	Detail    string    `json:"detail"`
	Ref       string    `json:"ref,omitempty"`
	CID       string    `json:"cid,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type BackupMeta struct {
	CID       string    `json:"cid"`
	Label     string    `json:"label,omitempty"`
	Rev       int64     `json:"rev"`
	UserID    string    `json:"user_id"`
	Username  string    `json:"username,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type StoreSnapshot struct {
	Tenant     Tenant                    `json:"tenant"`
	Users      map[string]*User          `json:"users"`
	Accounts   map[string]*Account       `json:"accounts"`
	Entries    []Entry                   `json:"entries"`
	Inventory  map[string]*InventoryItem `json:"inventory"`
	InvMoves   []InventoryMove           `json:"inv_moves"`
	Employees  map[string]*Employee      `json:"employees"`
	Payslips   []Payslip                 `json:"payslips"`
	Invoices   []Invoice                 `json:"invoices"`
	Currencies map[string]*CurrencyRate  `json:"currencies,omitempty"`
	AuditLog   []AuditEntry              `json:"audit_log,omitempty"`
	Backups    []BackupMeta              `json:"backups,omitempty"`
	// Módulos operativos (aditivos)
	Products       map[string]*Product        `json:"products,omitempty"`
	SalesUnits     map[string]*SalesUnit      `json:"sales_units,omitempty"`
	WarehouseStock map[string]*WarehouseStock `json:"warehouse_stock,omitempty"`
	UnitStocks     []UnitStock                `json:"unit_stocks,omitempty"`
	Receptions     []ReceptionNote            `json:"receptions,omitempty"`
	Transfers      []StockTransfer            `json:"transfers,omitempty"`
	POSSales       []POSSale                  `json:"pos_sales,omitempty"`
	CostSheets     map[string]*CostSheet      `json:"cost_sheets,omitempty"`
	DocCounters    DocCounters               `json:"doc_counters,omitempty"`
	Rev        int64                     `json:"rev"`
	RootCID    string                    `json:"root_cid,omitempty"`
	UpdatedAt  time.Time                 `json:"updated_at"`
}

type TokenSession struct {
	Token     string    `json:"token"`
	UserID    string    `json:"user_id"`
	TenantID  string    `json:"tenant_id"`
	Role      string    `json:"role"`
	ExpiresAt time.Time `json:"expires_at"`
}
