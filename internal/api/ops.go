package api

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/yecharlot/AbacoPhy/internal/auth"
	"github.com/yecharlot/AbacoPhy/internal/domain"
)

func (s *Server) registerOpsRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/v1/products", s.handleProducts)
	mux.HandleFunc("/api/v1/measure-units", s.handleMeasureUnits)
	mux.HandleFunc("/api/v1/price-sheets", s.handlePriceSheets)
	mux.HandleFunc("/api/v1/modules", s.handleModules)
	mux.HandleFunc("/api/v1/online-orders", s.handleOnlineOrders)
	mux.HandleFunc("/api/v1/units", s.handleSalesUnits)
	mux.HandleFunc("/api/v1/warehouse", s.handleWarehouse)
	mux.HandleFunc("/api/v1/receptions", s.handleReceptions)
	mux.HandleFunc("/api/v1/receptions/enter", s.handleReceptions)
	mux.HandleFunc("/api/v1/receptions/entrada", s.handleReceptions)
	mux.HandleFunc("/api/v1/transfers", s.handleTransfers)
	mux.HandleFunc("/api/v1/pos/sales", s.handlePOSSales)
	mux.HandleFunc("/api/v1/cost-sheets", s.handleCostSheets)
	mux.HandleFunc("/api/v1/job-positions", s.handleJobPositions)
	mux.HandleFunc("/api/v1/users", s.handleUsers)
}

func ensureOpsMaps(snap *domain.StoreSnapshot) {
	if snap.Products == nil {
		snap.Products = map[string]*domain.Product{}
	}
	if snap.SalesUnits == nil {
		snap.SalesUnits = map[string]*domain.SalesUnit{}
	}
	if snap.WarehouseStock == nil {
		snap.WarehouseStock = map[string]*domain.WarehouseStock{}
	}
	if snap.CostSheets == nil {
		snap.CostSheets = map[string]*domain.CostSheet{}
	}
	// Semilla de nomenclador si el tenant es antiguo sin productos
	if len(snap.Products) == 0 {
		for id, p := range domain.DefaultProducts(snap.Tenant.ID) {
			snap.Products[id] = p
		}
		snap.DocCounters.ProductSeq = 15
	}
	if snap.JobPositions == nil {
		snap.JobPositions = map[string]*domain.JobPosition{}
	}
	if len(snap.JobPositions) == 0 {
		for id, j := range domain.DefaultJobPositions(snap.Tenant.ID) {
			snap.JobPositions[id] = j
		}
		snap.DocCounters.JobSeq = 10
	}
}

func nextCode(prefix string, seq *int) string {
	*seq++
	return fmt.Sprintf("%s-%04d", prefix, *seq)
}

func (s *Server) handleProducts(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "no autorizado"})
		return
	}
	if err := s.gate(sess, "productos"); err != nil {
		writeJSON(w, 403, map[string]string{"error": "sin permiso"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "no encontrado"})
		return
	}
	ensureOpsMaps(snap)
	switch r.Method {
	case http.MethodGet:
		list := make([]*domain.Product, 0, len(snap.Products))
		for _, p := range snap.Products {
			if p != nil && p.Active {
				list = append(list, p)
			}
		}
		writeJSON(w, 200, map[string]any{"products": list})
	case http.MethodPost:
		// Vendedor solo consulta catálogo; no crea productos
		if sess.Role == domain.RoleVendedor || sess.Role == domain.RoleReadonly {
			writeJSON(w, 403, map[string]string{"error": "sin permiso para modificar productos"})
			return
		}
		var body domain.Product
		if err := readJSON(r, &body); err != nil || strings.TrimSpace(body.Name) == "" {
			writeJSON(w, 400, map[string]string{"error": "nombre requerido"})
			return
		}
		body.TenantID = sess.TenantID
		if body.Code == "" {
			body.Code = nextCode("P", &snap.DocCounters.ProductSeq)
		}
		body.Code = strings.ToUpper(strings.TrimSpace(body.Code))
		// ID estable alineado al bootstrap: prod-P-0001
		body.ID = "prod-" + body.Code
		// evitar código o id duplicado
		for _, p := range snap.Products {
			if p != nil && p.Active && (strings.EqualFold(p.Code, body.Code) || p.ID == body.ID) {
				writeJSON(w, 409, map[string]string{"error": "código de producto ya existe: " + body.Code})
				return
			}
		}
		if body.Unit == "" {
			body.Unit = "u"
		}
		if body.Currency == "" {
			body.Currency = snap.Tenant.Currency
		}
		body.Active = true
		body.CreatedAt = time.Now().UTC()
		body.UpdatedAt = body.CreatedAt
		snap.Products[body.ID] = &body
		s.audit(snap, sess, "producto.alta", "Alta nomenclador "+body.Code+" — "+body.Name, body.ID)
		_ = s.Store.Put(snap)
		writeJSON(w, 201, map[string]any{"product": body})
	case http.MethodPut:
		if sess.Role == domain.RoleVendedor || sess.Role == domain.RoleReadonly {
			writeJSON(w, 403, map[string]string{"error": "sin permiso para modificar productos"})
			return
		}
		var body domain.Product
		if err := readJSON(r, &body); err != nil || body.ID == "" {
			writeJSON(w, 400, map[string]string{"error": "id requerido"})
			return
		}
		ex := snap.Products[body.ID]
		if ex == nil {
			writeJSON(w, 404, map[string]string{"error": "producto no encontrado"})
			return
		}
		if body.Name != "" {
			ex.Name = body.Name
		}
		if body.Unit != "" {
			ex.Unit = body.Unit
		}
		if body.Code != "" && body.Code != ex.Code {
			for _, p := range snap.Products {
				if p != nil && p.Active && p.ID != ex.ID && strings.EqualFold(p.Code, body.Code) {
					writeJSON(w, 409, map[string]string{"error": "código ya en uso"})
					return
				}
			}
			ex.Code = body.Code
		}
		ex.Category = body.Category
		ex.CostStd = body.CostStd
		ex.PriceSale = body.PriceSale
		if body.Currency != "" {
			ex.Currency = body.Currency
		}
		ex.Barcode = body.Barcode
		ex.UpdatedAt = time.Now().UTC()
		s.audit(snap, sess, "producto.edicion", "Edición "+ex.Code+" — "+ex.Name, ex.ID)
		_ = s.Store.Put(snap)
		writeJSON(w, 200, map[string]any{"product": ex})
	case http.MethodDelete:
		if sess.Role == domain.RoleVendedor || sess.Role == domain.RoleReadonly {
			writeJSON(w, 403, map[string]string{"error": "sin permiso para modificar productos"})
			return
		}
		id := r.URL.Query().Get("id")
		if id == "" {
			writeJSON(w, 400, map[string]string{"error": "id requerido"})
			return
		}
		ex := snap.Products[id]
		if ex == nil {
			writeJSON(w, 404, map[string]string{"error": "producto no encontrado"})
			return
		}
		ex.Active = false
		ex.UpdatedAt = time.Now().UTC()
		s.audit(snap, sess, "producto.baja", "Baja lógica producto "+ex.Code+" — "+ex.Name, id)
		_ = s.Store.Put(snap)
		writeJSON(w, 200, map[string]any{"ok": true})
	default:
		writeJSON(w, 405, map[string]string{"error": "metodo no permitido"})
	}
}

func (s *Server) handleSalesUnits(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "no autorizado"})
		return
	}
	if err := s.gate(sess, "unidades"); err != nil {
		writeJSON(w, 403, map[string]string{"error": "sin permiso"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "no encontrado"})
		return
	}
	ensureOpsMaps(snap)
	switch r.Method {
	case http.MethodGet:
		list := make([]*domain.SalesUnit, 0, len(snap.SalesUnits))
		for _, u := range snap.SalesUnits {
			if u != nil && u.Active {
				list = append(list, u)
			}
		}
		writeJSON(w, 200, map[string]any{"units": list, "stocks": enrichUnitStocks(snap)})
	case http.MethodPost:
		var body domain.SalesUnit
		if err := readJSON(r, &body); err != nil || strings.TrimSpace(body.Name) == "" {
			writeJSON(w, 400, map[string]string{"error": "nombre de unidad requerido"})
			return
		}
		body.ID = uuid.NewString()
		body.TenantID = sess.TenantID
		if body.Code == "" {
			body.Code = nextCode("U", &snap.DocCounters.UnitSeq)
		}
		body.Active = true
		body.CreatedAt = time.Now().UTC()
		snap.SalesUnits[body.ID] = &body
		s.audit(snap, sess, "unidad.alta", "Unidad de venta "+body.Code+" — "+body.Name+" · "+body.Address, body.ID)
		_ = s.Store.Put(snap)
		writeJSON(w, 201, map[string]any{"unit": body})
	default:
		writeJSON(w, 405, map[string]string{"error": "metodo no permitido"})
	}
}


// enrichUnitStocks resuelve códigos y nombres legibles (unidad + producto).
func enrichUnitStocks(snap *domain.StoreSnapshot) []map[string]any {
	out := make([]map[string]any, 0, len(snap.UnitStocks))
	for _, st := range snap.UnitStocks {
		if st.Qty <= 0 {
			continue
		}
		unitCode, unitName := st.UnitID, st.UnitID
		if u := snap.SalesUnits[st.UnitID]; u != nil {
			unitCode, unitName = u.Code, u.Name
		}
		prodCode, prodName, um := st.ProductID, st.ProductID, "u"
		if p := snap.Products[st.ProductID]; p != nil {
			prodCode, prodName, um = p.Code, p.Name, p.Unit
		}
		cur := snap.Tenant.Currency
		if p := snap.Products[st.ProductID]; p != nil && p.Currency != "" {
			cur = p.Currency
		}
		out = append(out, map[string]any{
			"unit_id":      st.UnitID,
			"unit_code":    unitCode,
			"unit_name":    unitName,
			"product_id":   st.ProductID,
			"product_code": prodCode,
			"product_name": prodName,
			"unit":         um,
			"qty":          st.Qty,
			"avg_cost":     st.AvgCost,
			"amount_base":  st.AmountBase,
			"currency":     cur,
		})
	}
	return out
}

func (s *Server) handleWarehouse(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "no autorizado"})
		return
	}
	if err := s.gate(sess, "almacen"); err != nil {
		writeJSON(w, 403, map[string]string{"error": "sin permiso"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "no encontrado"})
		return
	}
	ensureOpsMaps(snap)
	if r.Method != http.MethodGet {
		writeJSON(w, 405, map[string]string{"error": "metodo no permitido"})
		return
	}
	type row struct {
		ProductID   string  `json:"product_id"`
		Code        string  `json:"code"`
		Name        string  `json:"name"`
		Unit        string  `json:"unit"`
		Qty         float64 `json:"qty"`
		AvgCost     float64 `json:"avg_cost"`
		AmountBase  float64 `json:"amount_base"`
		Currency    string  `json:"currency"`
	}
	out := []row{}
	for pid, st := range snap.WarehouseStock {
		p := snap.Products[pid]
		name, code, unit, cur := pid, "", "u", snap.Tenant.Currency
		if p != nil {
			name, code, unit = p.Name, p.Code, p.Unit
			if p.Currency != "" {
				cur = p.Currency
			}
		}
		out = append(out, row{ProductID: pid, Code: code, Name: name, Unit: unit, Qty: st.Qty, AvgCost: st.AvgCost, AmountBase: st.AmountBase, Currency: cur})
	}
	writeJSON(w, 200, map[string]any{"warehouse": out, "unit_stocks": enrichUnitStocks(snap)})
}

func (s *Server) handleReceptions(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "no autorizado"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "no encontrado"})
		return
	}
	ensureOpsMaps(snap)

	// Sub-ruta: POST /api/v1/receptions/enter  → almacenero da entrada física
	path := strings.TrimSuffix(r.URL.Path, "/")
	if strings.HasSuffix(path, "/enter") || strings.HasSuffix(path, "/entrada") {
		s.handleReceptionEnter(w, r, sess, snap)
		return
	}

	switch r.Method {
	case http.MethodGet:
		// Lectura: económico (módulo recepción) o almacenero (pendientes de entrada)
		canRead := sess.Role == domain.RoleEconomico || sess.Role == domain.RoleAlmacenero ||
			sess.Role == domain.RoleAdmin || sess.Role == domain.RoleMaster || sess.Role == domain.RoleContador
		if !canRead {
			if err := s.gate(sess, "recepcion"); err != nil {
				if err2 := s.gate(sess, "almacen"); err2 != nil {
					writeJSON(w, 403, map[string]string{"error": "sin permiso"})
					return
				}
			}
		}
		statusFilter := r.URL.Query().Get("status")
		list := snap.Receptions
		if statusFilter != "" {
			filtered := make([]domain.ReceptionNote, 0, len(list))
			for _, rn := range list {
				if rn.Status == statusFilter {
					filtered = append(filtered, rn)
				}
			}
			list = filtered
		}
		pending := 0
		for _, rn := range snap.Receptions {
			if rn.Status == "pendiente_entrada" {
				pending++
			}
		}
		writeJSON(w, 200, map[string]any{"receptions": list, "pending_count": pending})

	case http.MethodPost:
		// Solo rol económico (módulo recepción). Admin/master por supervisión.
		if sess.Role != domain.RoleEconomico && sess.Role != domain.RoleAdmin && sess.Role != domain.RoleMaster {
			writeJSON(w, 403, map[string]string{"error": "solo el económico puede registrar informes de recepción"})
			return
		}
		if err := s.gate(sess, "recepcion"); err != nil {
			writeJSON(w, 403, map[string]string{"error": "módulo recepción no disponible"})
			return
		}
		var body domain.ReceptionNote
		if err := readJSON(r, &body); err != nil || len(body.Lines) == 0 {
			writeJSON(w, 400, map[string]string{"error": "líneas de recepción requeridas"})
			return
		}
		if strings.TrimSpace(body.Receiver) == "" {
			writeJSON(w, 400, map[string]string{"error": "indique quién recibe la mercancía"})
			return
		}
		if body.HasInvoice {
			ref := strings.TrimSpace(body.InvoiceRef)
			if ref == "" {
				ref = strings.TrimSpace(body.DocRef)
			}
			if ref == "" {
				writeJSON(w, 400, map[string]string{"error": "compra con factura: indique número de factura"})
				return
			}
			if strings.TrimSpace(body.Supplier) == "" {
				writeJSON(w, 400, map[string]string{"error": "compra con factura: indique el proveedor"})
				return
			}
			body.InvoiceRef = ref
			body.DocRef = ref
		}
		body.ID = uuid.NewString()
		body.TenantID = sess.TenantID
		body.Number = nextCode("IR", &snap.DocCounters.ReceptionSeq)
		if body.Date == "" {
			body.Date = time.Now().Format("2006-01-02")
		}
		if body.Currency == "" {
			body.Currency = snap.Tenant.Currency
		}
		body.Status = "pendiente_entrada"
		body.CreatedBy = sess.UserID
		body.CreatedAt = time.Now().UTC()
		var total float64
		for i := range body.Lines {
			ln := &body.Lines[i]
			p := snap.Products[ln.ProductID]
			if p == nil {
				writeJSON(w, 400, map[string]string{"error": "producto no encontrado en línea"})
				return
			}
			ln.ProductCode, ln.ProductName = p.Code, p.Name
			if ln.Unit == "" {
				ln.Unit = p.Unit
			}
			if ln.Qty <= 0 {
				writeJSON(w, 400, map[string]string{"error": "cantidad inválida"})
				return
			}
			if ln.UnitCost < 0 {
				writeJSON(w, 400, map[string]string{"error": "costo unitario inválido"})
				return
			}
			ln.Amount = ln.Qty * ln.UnitCost
			total += ln.Amount
		}
		body.TotalCost = total
		// Contabilidad: productos a cuenta Inventario (aún no stock físico de almacén)
		domain.ApplyInventoryIn(snap, total)
		snap.Entries = append(snap.Entries, domain.Entry{
			ID: uuid.NewString(), TenantID: sess.TenantID, Date: body.Date, Type: "inventory",
			Amount: total, Currency: body.Currency,
			Description: fmt.Sprintf("IR %s pendiente entrada · %s · receptor %s", body.Number, body.Supplier, body.Receiver),
			CreatedBy: sess.UserID, CreatedAt: time.Now().UTC(),
		})
		snap.Receptions = append(snap.Receptions, body)
		s.audit(snap, sess, "recepcion.creada",
			fmt.Sprintf("Informe %s · factura=%v · total %.2f %s · %d líneas · pendiente almacén",
				body.Number, body.HasInvoice, body.TotalCost, body.Currency, len(body.Lines)), body.ID)
		_ = s.Store.Put(snap)
		writeJSON(w, 201, map[string]any{
			"reception": body,
			"notify":    "almacen",
			"message":   "Informe registrado. Cuenta inventario actualizada. Almacén debe validar y dar entrada.",
		})

	default:
		writeJSON(w, 405, map[string]string{"error": "metodo no permitido"})
	}
}

// handleReceptionEnter: almacenero valida el IR y da entrada física al almacén.
func (s *Server) handleReceptionEnter(w http.ResponseWriter, r *http.Request, sess *domain.TokenSession, snap *domain.StoreSnapshot) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, map[string]string{"error": "metodo no permitido"})
		return
	}
	if sess.Role != domain.RoleAlmacenero && sess.Role != domain.RoleAdmin && sess.Role != domain.RoleMaster {
		writeJSON(w, 403, map[string]string{"error": "solo el almacenero puede dar entrada física"})
		return
	}
	if err := s.gate(sess, "almacen"); err != nil {
		// admin/master pueden actuar aunque el módulo esté off en edge cases
		if sess.Role != domain.RoleAdmin && sess.Role != domain.RoleMaster {
			writeJSON(w, 403, map[string]string{"error": "módulo almacén no disponible"})
			return
		}
	}
	var req struct {
		ID     string `json:"id"`
		Note   string `json:"note,omitempty"`
		Accept bool   `json:"accept"` // true = validado con económico
	}
	if err := readJSON(r, &req); err != nil || req.ID == "" {
		writeJSON(w, 400, map[string]string{"error": "id de informe requerido"})
		return
	}
	if !req.Accept {
		writeJSON(w, 400, map[string]string{"error": "confirme la validación con el económico (accept=true)"})
		return
	}
	idx := -1
	for i := range snap.Receptions {
		if snap.Receptions[i].ID == req.ID || snap.Receptions[i].Number == req.ID {
			idx = i
			break
		}
	}
	if idx < 0 {
		writeJSON(w, 404, map[string]string{"error": "informe no encontrado"})
		return
	}
	rn := &snap.Receptions[idx]
	if rn.Status == "entrado" {
		writeJSON(w, 409, map[string]string{"error": "el informe ya tiene entrada en almacén"})
		return
	}
	if rn.Status == "anulado" {
		writeJSON(w, 409, map[string]string{"error": "informe anulado"})
		return
	}
	for i := range rn.Lines {
		ln := &rn.Lines[i]
		p := snap.Products[ln.ProductID]
		if p == nil {
			writeJSON(w, 400, map[string]string{"error": "producto faltante: " + ln.ProductCode})
			return
		}
		st := snap.WarehouseStock[ln.ProductID]
		if st == nil {
			st = &domain.WarehouseStock{ProductID: ln.ProductID}
			snap.WarehouseStock[ln.ProductID] = st
		}
		newQty := st.Qty + ln.Qty
		if newQty > 0 {
			st.AvgCost = (st.AmountBase + ln.Amount) / newQty
		}
		st.Qty = newQty
		st.AmountBase = st.Qty * st.AvgCost
		p.CostStd = st.AvgCost
		p.UpdatedAt = time.Now().UTC()
		s.mirrorInventoryFromProduct(snap, p, st)
	}
	now := time.Now().UTC()
	rn.Status = "entrado"
	rn.EnteredBy = sess.UserID
	rn.EnteredAt = &now
	if req.Note != "" {
		if rn.Note != "" {
			rn.Note = rn.Note + " · "
		}
		rn.Note = rn.Note + req.Note
	}
	s.audit(snap, sess, "recepcion.entrada_almacen",
		fmt.Sprintf("Entrada almacén IR %s · %d líneas · validado con económico", rn.Number, len(rn.Lines)), rn.ID)
	_ = s.Store.Put(snap)
	writeJSON(w, 200, map[string]any{"reception": rn, "message": "Entrada a almacén registrada"})
}

func (s *Server) mirrorInventoryFromProduct(snap *domain.StoreSnapshot, p *domain.Product, st *domain.WarehouseStock) {
	if snap.Inventory == nil {
		snap.Inventory = map[string]*domain.InventoryItem{}
	}
	key := "inv-" + p.Code
	it := snap.Inventory[key]
	if it == nil {
		it = &domain.InventoryItem{ID: key, TenantID: snap.Tenant.ID, SKU: p.Code, Name: p.Name, Unit: p.Unit, Currency: p.Currency, Active: true}
		snap.Inventory[key] = it
	}
	it.Qty = st.Qty
	it.Cost = st.AvgCost
	it.Amount = st.AmountBase
	it.AmountBase = st.AmountBase
	it.UpdatedAt = time.Now().UTC()
}

func findUnitStock(snap *domain.StoreSnapshot, unitID, productID string) *domain.UnitStock {
	for i := range snap.UnitStocks {
		if snap.UnitStocks[i].UnitID == unitID && snap.UnitStocks[i].ProductID == productID {
			return &snap.UnitStocks[i]
		}
	}
	return nil
}

func (s *Server) handleTransfers(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "no autorizado"})
		return
	}
	if err := s.gate(sess, "almacen"); err != nil {
		writeJSON(w, 403, map[string]string{"error": "sin permiso"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "no encontrado"})
		return
	}
	ensureOpsMaps(snap)
	switch r.Method {
	case http.MethodGet:
		writeJSON(w, 200, map[string]any{"transfers": snap.Transfers})
	case http.MethodPost:
		var body domain.StockTransfer
		if err := readJSON(r, &body); err != nil || body.UnitID == "" || len(body.Lines) == 0 {
			writeJSON(w, 400, map[string]string{"error": "unidad y líneas requeridas"})
			return
		}
		unit := snap.SalesUnits[body.UnitID]
		if unit == nil || !unit.Active {
			writeJSON(w, 400, map[string]string{"error": "unidad de venta no válida"})
			return
		}
		body.ID = uuid.NewString()
		body.TenantID = sess.TenantID
		body.Number = nextCode("TR", &snap.DocCounters.TransferSeq)
		if body.Date == "" {
			body.Date = time.Now().Format("2006-01-02")
		}
		body.UnitName = unit.Name
		body.Status = "confirmado"
		body.CreatedBy = sess.UserID
		body.CreatedAt = time.Now().UTC()
		for i := range body.Lines {
			ln := &body.Lines[i]
			p := snap.Products[ln.ProductID]
			st := snap.WarehouseStock[ln.ProductID]
			if p == nil || st == nil || ln.Qty <= 0 || st.Qty < ln.Qty {
				writeJSON(w, 400, map[string]string{"error": "stock insuficiente o producto inválido"})
				return
			}
			ln.ProductCode, ln.ProductName = p.Code, p.Name
			ln.UnitCost = st.AvgCost
			ln.Amount = ln.Qty * ln.UnitCost
			st.Qty -= ln.Qty
			st.AmountBase = st.Qty * st.AvgCost
			us := findUnitStock(snap, body.UnitID, ln.ProductID)
			if us == nil {
				snap.UnitStocks = append(snap.UnitStocks, domain.UnitStock{
					UnitID: body.UnitID, ProductID: ln.ProductID, Qty: ln.Qty, AvgCost: ln.UnitCost, AmountBase: ln.Amount,
				})
			} else {
				nq := us.Qty + ln.Qty
				if nq > 0 {
					us.AvgCost = (us.AmountBase + ln.Amount) / nq
				}
				us.Qty = nq
				us.AmountBase = us.Qty * us.AvgCost
			}
			s.mirrorInventoryFromProduct(snap, p, st)
		}
		snap.Transfers = append(snap.Transfers, body)
		s.audit(snap, sess, "almacen.transferencia",
			fmt.Sprintf("Transferencia %s a unidad %s (%s) · %d líneas", body.Number, unit.Code, unit.Name, len(body.Lines)), body.ID)
		_ = s.Store.Put(snap)
		writeJSON(w, 201, map[string]any{"transfer": body})
	default:
		writeJSON(w, 405, map[string]string{"error": "metodo no permitido"})
	}
}

func (s *Server) handlePOSSales(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "no autorizado"})
		return
	}
	if err := s.gate(sess, "vendedor"); err != nil {
		writeJSON(w, 403, map[string]string{"error": "sin permiso"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "no encontrado"})
		return
	}
	ensureOpsMaps(snap)
	switch r.Method {
	case http.MethodGet:
		writeJSON(w, 200, map[string]any{"sales": snap.POSSales})
	case http.MethodPost:
		var body domain.POSSale
		if err := readJSON(r, &body); err != nil || len(body.Lines) == 0 {
			writeJSON(w, 400, map[string]string{"error": "líneas de venta requeridas"})
			return
		}
		body.ID = uuid.NewString()
		body.TenantID = sess.TenantID
		body.Number = nextCode("VT", &snap.DocCounters.POSSaleSeq)
		if body.Date == "" {
			body.Date = time.Now().Format("2006-01-02")
		}
		if body.Currency == "" {
			body.Currency = snap.Tenant.Currency
		}
		if body.UnitID != "" {
			if u := snap.SalesUnits[body.UnitID]; u != nil {
				body.UnitName = u.Name
			}
		}
		body.Status = "confirmada"
		body.CreatedBy = sess.UserID
		body.CreatedAt = time.Now().UTC()
		var sub, disc, costT float64
		for i := range body.Lines {
			ln := &body.Lines[i]
			p := snap.Products[ln.ProductID]
			if p == nil || ln.Qty <= 0 {
				writeJSON(w, 400, map[string]string{"error": "producto o cantidad inválida"})
				return
			}
			ln.ProductCode, ln.ProductName = p.Code, p.Name
			if ln.UnitPrice <= 0 {
				ln.UnitPrice = p.PriceSale
			}
			gross := ln.Qty * ln.UnitPrice
			if ln.DiscountPct > 0 {
				ln.DiscountAmt = gross * (ln.DiscountPct / 100)
			}
			ln.LineTotal = gross - ln.DiscountAmt
			if ln.LineTotal < 0 {
				ln.LineTotal = 0
			}
			// descontar stock de unidad si hay, si no del almacén
			var unitCost float64
			if body.UnitID != "" {
				us := findUnitStock(snap, body.UnitID, ln.ProductID)
				if us == nil || us.Qty < ln.Qty {
					writeJSON(w, 400, map[string]string{"error": "stock insuficiente en unidad para " + p.Code})
					return
				}
				unitCost = us.AvgCost
				us.Qty -= ln.Qty
				us.AmountBase = us.Qty * us.AvgCost
			} else {
				st := snap.WarehouseStock[ln.ProductID]
				if st == nil || st.Qty < ln.Qty {
					writeJSON(w, 400, map[string]string{"error": "stock insuficiente en almacén para " + p.Code})
					return
				}
				unitCost = st.AvgCost
				st.Qty -= ln.Qty
				st.AmountBase = st.Qty * st.AvgCost
				s.mirrorInventoryFromProduct(snap, p, st)
			}
			ln.UnitCost = unitCost
			ln.CostAmount = unitCost * ln.Qty
			sub += gross
			disc += ln.DiscountAmt
			costT += ln.CostAmount
		}
		body.Subtotal = sub
		body.Discount = disc
		body.Total = sub - disc
		body.CostTotal = costT
		// Contabilidad: ingreso + COGS
		// Fase 2: persistir el asiento de ingreso (ApplyIncome ya actualiza saldos Caja/4000).
		if ent := domain.ApplyIncome(snap, body.Total, "Venta vendedor "+body.Number+" · rebaja "+formatFloat(disc), sess.UserID); ent != nil {
			ent.ID = uuid.NewString()
			ent.TenantID = sess.TenantID
			if body.Date != "" {
				ent.Date = body.Date
			} else {
				ent.Date = time.Now().Format("2006-01-02")
			}
			ent.CreatedAt = time.Now().UTC()
			snap.Entries = append(snap.Entries, *ent)
		}
		if costT > 0 {
			domain.ApplyInventoryOut(snap, costT)
			// Fase 3 (pendiente): type expense + AccountID 5000. Por ahora se mantiene inventory.
			snap.Entries = append(snap.Entries, domain.Entry{
				ID: uuid.NewString(), TenantID: sess.TenantID, Date: body.Date, Type: "inventory",
				Amount: costT, Currency: body.Currency, Description: "Costo venta "+body.Number,
				CreatedBy: sess.UserID, CreatedAt: time.Now().UTC(),
			})
		}
		snap.POSSales = append(snap.POSSales, body)
		s.audit(snap, sess, "venta.vendedor",
			fmt.Sprintf("Venta %s · total %.2f %s · rebaja %.2f · costo %.2f · unidad %s",
				body.Number, body.Total, body.Currency, body.Discount, body.CostTotal, body.UnitName), body.ID)
		_ = s.Store.Put(snap)
		writeJSON(w, 201, map[string]any{"sale": body})
	default:
		writeJSON(w, 405, map[string]string{"error": "metodo no permitido"})
	}
}

func (s *Server) handleCostSheets(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "no autorizado"})
		return
	}
	if err := s.gate(sess, "fichas_costo"); err != nil {
		writeJSON(w, 403, map[string]string{"error": "sin permiso"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "no encontrado"})
		return
	}
	ensureOpsMaps(snap)
	switch r.Method {
	case http.MethodGet:
		list := make([]*domain.CostSheet, 0, len(snap.CostSheets))
		for _, c := range snap.CostSheets {
			if c != nil {
				list = append(list, c)
			}
		}
		writeJSON(w, 200, map[string]any{"cost_sheets": list})
	case http.MethodPost:
		var body domain.CostSheet
		if err := readJSON(r, &body); err != nil || body.ProductID == "" {
			writeJSON(w, 400, map[string]string{"error": "product_id requerido"})
			return
		}
		p := snap.Products[body.ProductID]
		if p == nil {
			writeJSON(w, 404, map[string]string{"error": "producto no encontrado"})
			return
		}
		// Automatizar materia prima desde costo de almacén si no viene
		if body.MateriaPrima <= 0 {
			if st := snap.WarehouseStock[body.ProductID]; st != nil && st.AvgCost > 0 {
				body.MateriaPrima = st.AvgCost
			} else if p.CostStd > 0 {
				body.MateriaPrima = p.CostStd
			}
		}
		body.CostoUnitario = body.MateriaPrima + body.MatAuxiliares + body.Energia +
			body.SalarioDirecto + body.OtrosDirectos + body.GastosIndirectos
		if body.PrecioSugerido <= 0 && body.CostoUnitario > 0 {
			body.PrecioSugerido = body.CostoUnitario * 1.3 // margen orientativo 30 %
		}
		body.ID = uuid.NewString()
		body.TenantID = sess.TenantID
		body.ProductCode, body.ProductName = p.Code, p.Name
		if body.Currency == "" {
			body.Currency = snap.Tenant.Currency
		}
		body.CreatedBy = sess.UserID
		body.CreatedAt = time.Now().UTC()
		body.UpdatedAt = body.CreatedAt
		snap.CostSheets[body.ProductID] = &body
		p.CostStd = body.CostoUnitario
		if body.PrecioSugerido > 0 {
			p.PriceSale = body.PrecioSugerido
		}
		p.UpdatedAt = time.Now().UTC()
		s.audit(snap, sess, "ficha_costo",
			fmt.Sprintf("Ficha de costo %s %s · unitario %.2f %s (MP %.2f + ind %.2f)",
				p.Code, p.Name, body.CostoUnitario, body.Currency, body.MateriaPrima, body.GastosIndirectos), body.ID)
		_ = s.Store.Put(snap)
		writeJSON(w, 201, map[string]any{"cost_sheet": body})
	default:
		writeJSON(w, 405, map[string]string{"error": "metodo no permitido"})
	}
}


func (s *Server) handleJobPositions(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "no autorizado"})
		return
	}
	if err := s.gate(sess, "cargos"); err != nil {
		writeJSON(w, 403, map[string]string{"error": "sin permiso"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "no encontrado"})
		return
	}
	ensureOpsMaps(snap)
	switch r.Method {
	case http.MethodGet:
		list := make([]*domain.JobPosition, 0)
		for _, j := range snap.JobPositions {
			if j != nil && j.Active {
				list = append(list, j)
			}
		}
		writeJSON(w, 200, map[string]any{"positions": list})
	case http.MethodPost:
		var body domain.JobPosition
		if err := readJSON(r, &body); err != nil || strings.TrimSpace(body.Name) == "" {
			writeJSON(w, 400, map[string]string{"error": "nombre del cargo requerido"})
			return
		}
		body.ID = uuid.NewString()
		body.TenantID = sess.TenantID
		if body.Code == "" {
			body.Code = nextCode("C", &snap.DocCounters.JobSeq)
		}
		body.Active = true
		body.CreatedAt = time.Now().UTC()
		snap.JobPositions[body.ID] = &body
		s.audit(snap, sess, "cargo.alta", "Cargo "+body.Code+" — "+body.Name, body.ID)
		_ = s.Store.Put(snap)
		writeJSON(w, 201, map[string]any{"position": body})
	case http.MethodPut:
		var body domain.JobPosition
		if err := readJSON(r, &body); err != nil || body.ID == "" {
			writeJSON(w, 400, map[string]string{"error": "id requerido"})
			return
		}
		ex := snap.JobPositions[body.ID]
		if ex == nil {
			writeJSON(w, 404, map[string]string{"error": "cargo no encontrado"})
			return
		}
		if body.Name != "" {
			ex.Name = body.Name
		}
		if body.Code != "" {
			ex.Code = body.Code
		}
		s.audit(snap, sess, "cargo.edicion", "Cargo "+ex.Code+" — "+ex.Name, ex.ID)
		_ = s.Store.Put(snap)
		writeJSON(w, 200, map[string]any{"position": ex})
	case http.MethodDelete:
		id := r.URL.Query().Get("id")
		ex := snap.JobPositions[id]
		if ex == nil {
			writeJSON(w, 404, map[string]string{"error": "no encontrado"})
			return
		}
		ex.Active = false
		s.audit(snap, sess, "cargo.baja", "Baja cargo "+ex.Code, id)
		_ = s.Store.Put(snap)
		writeJSON(w, 200, map[string]any{"ok": true})
	default:
		writeJSON(w, 405, map[string]string{"error": "metodo no permitido"})
	}
}

func (s *Server) handleUsers(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "no autorizado"})
		return
	}
	if err := s.gate(sess, "usuarios"); err != nil {
		writeJSON(w, 403, map[string]string{"error": "sin permiso"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "no encontrado"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		list := []map[string]any{}
		for _, u := range snap.Users {
			if u == nil {
				continue
			}
			list = append(list, publicUser(u))
		}
		writeJSON(w, 200, map[string]any{"users": list, "roles": auth.ValidRoles()})
	case http.MethodPost:
		var body struct {
			Username    string `json:"username"`
			DisplayName string `json:"display_name"`
			Password    string `json:"password"`
			Role        string `json:"role"`
		}
		if err := readJSON(r, &body); err != nil || body.Username == "" || body.Password == "" {
			writeJSON(w, 400, map[string]string{"error": "usuario y contraseña requeridos"})
			return
		}
		roleOK := false
		for _, r := range auth.ValidRoles() {
			if r == body.Role {
				roleOK = true
				break
			}
		}
		if !roleOK {
			writeJSON(w, 400, map[string]string{"error": "rol no permitido"})
			return
		}
		for _, u := range snap.Users {
			if u != nil && strings.EqualFold(u.Username, body.Username) {
				writeJSON(w, 409, map[string]string{"error": "usuario ya existe"})
				return
			}
		}
		hash, err := auth.HashPassword(body.Password)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "hash"})
			return
		}
		u := &domain.User{
			ID: uuid.NewString(), TenantID: sess.TenantID,
			Username: strings.TrimSpace(body.Username), DisplayName: body.DisplayName,
			Role: body.Role, PasswordHash: hash, Active: true,
			Modules: auth.DefaultModulesForRole(body.Role),
			CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC(),
		}
		if u.DisplayName == "" {
			u.DisplayName = u.Username
		}
		snap.Users[u.ID] = u
		s.audit(snap, sess, "usuario.alta", "Alta de usuario «"+u.Username+"» con rol «"+roleLabelES(u.Role)+"»", u.ID)
		_ = s.Store.Put(snap)
		writeJSON(w, 201, map[string]any{"user": publicUser(u)})
	case http.MethodPut:
		var body struct {
			ID          string          `json:"id"`
			DisplayName string          `json:"display_name"`
			Role        string          `json:"role"`
			Password    string          `json:"password"`
			Active      *bool           `json:"active"`
			Modules     map[string]bool `json:"modules"`
		}
		if err := readJSON(r, &body); err != nil || body.ID == "" {
			writeJSON(w, 400, map[string]string{"error": "id requerido"})
			return
		}
		u := snap.Users[body.ID]
		if u == nil {
			writeJSON(w, 404, map[string]string{"error": "usuario no encontrado"})
			return
		}
		if u.Role == domain.RoleMaster && sess.Role != domain.RoleMaster {
			writeJSON(w, 403, map[string]string{"error": "no puede modificar master"})
			return
		}
		if body.DisplayName != "" {
			u.DisplayName = body.DisplayName
		}
		roleChanged := false
		if body.Role != "" && body.Role != domain.RoleMaster && body.Role != u.Role {
			u.Role = body.Role
			roleChanged = true
			// Al cambiar el rol se reasignan los módulos por defecto de ese rol
			u.Modules = auth.DefaultModulesForRole(body.Role)
		}
		if body.Modules != nil && !roleChanged {
			if sess.Role != domain.RoleMaster && sess.Role != domain.RoleAdmin {
				writeJSON(w, 403, map[string]string{"error": "solo master o admin pueden asignar módulos"})
				return
			}
			if snap.Tenant.EnabledModules == nil {
				snap.Tenant.EnabledModules = domain.DefaultEnabledModules()
			}
			clean := map[string]bool{}
			for k, v := range body.Modules {
				if !auth.Can(u.Role, k) {
					continue
				}
				clean[k] = v
				// Si se asigna el módulo al usuario, asegurar que el negocio lo tenga activo
				if v {
					snap.Tenant.EnabledModules[k] = true
				}
			}
			u.Modules = clean
		}
		if body.Password != "" {
			h, err := auth.HashPassword(body.Password)
			if err == nil {
				u.PasswordHash = h
			}
		}
		if body.Active != nil {
			u.Active = *body.Active
		}
		u.UpdatedAt = time.Now().UTC()
		s.audit(snap, sess, "usuario.edicion", "Edición de usuario «"+u.Username+"» · rol «"+roleLabelES(u.Role)+"»", u.ID)
		_ = s.Store.Put(snap)
		writeJSON(w, 200, map[string]any{"user": publicUser(u), "views": auth.ViewsForUser(u.Role, snap, u)})
	case http.MethodDelete:
		id := r.URL.Query().Get("id")
		u := snap.Users[id]
		if u == nil {
			writeJSON(w, 404, map[string]string{"error": "no encontrado"})
			return
		}
		if u.Role == domain.RoleMaster {
			writeJSON(w, 403, map[string]string{"error": "no se puede dar de baja master"})
			return
		}
		u.Active = false
		u.UpdatedAt = time.Now().UTC()
		s.audit(snap, sess, "usuario.baja", "Baja usuario "+u.Username, id)
		_ = s.Store.Put(snap)
		writeJSON(w, 200, map[string]any{"ok": true})
	default:
		writeJSON(w, 405, map[string]string{"error": "metodo no permitido"})
	}
}


func roleLabelES(role string) string {
	switch role {
	case domain.RoleMaster:
		return "Master"
	case domain.RoleAdmin:
		return "Administrador"
	case domain.RoleContador:
		return "Contador"
	case domain.RoleEconomico:
		return "Económico"
	case domain.RoleVendedor:
		return "Vendedor"
	case domain.RoleAlmacenero:
		return "Almacenero"
	case domain.RoleOperador:
		return "Operador"
	case domain.RoleReadonly:
		return "Solo lectura"
	default:
		return role
	}
}
