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
	mux.HandleFunc("/api/v1/role-permissions", s.handleRolePermissions)
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
		if body.Metadata == nil {
			body.Metadata = domain.Metadata{}
		}
		body.Metadata["int.reception_status"] = "pending_entry"
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
		// La recepción es documental. No afecta stock, costo promedio ni contabilidad
		// de inventario hasta que almacén confirme la entrada física.
		snap.Receptions = append(snap.Receptions, body)
		s.audit(snap, sess, "recepcion.creada",
			fmt.Sprintf("Informe %s · factura=%v · total %.2f %s · %d líneas · pendiente almacén",
				body.Number, body.HasInvoice, body.TotalCost, body.Currency, len(body.Lines)), body.ID)
		_ = s.Store.Put(snap)
		writeJSON(w, 201, map[string]any{
			"reception": body,
			"notify":    "almacen",
			"message":   "Informe registrado. No se actualiza stock ni costo promedio; Almacén debe validar y dar entrada.",
		})

	default:
		writeJSON(w, 405, map[string]string{"error": "metodo no permitido"})
	}
}

// handleReceptionEnter: almacenero valida el IR y da entrada física al almacén.
// Prioridad 1 — política:
//   - Crear IR (POST /receptions) es solo documental (no stock ni CPP).
//   - Aquí se confirma, reporta problema o abandona.
//   - Stock + costo promedio + asiento de inventario solo si accept=true.
//   - Diferencias por línea: qty_received / qty_damaged / qty_rejected.
//   - Abandono definitivo: accept=false + abandon=true → status anulado (sin stock).
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
		if sess.Role != domain.RoleAdmin && sess.Role != domain.RoleMaster {
			writeJSON(w, 403, map[string]string{"error": "módulo almacén no disponible"})
			return
		}
	}

	var req struct {
		ID      string `json:"id"`
		Note    string `json:"note,omitempty"`
		Reason  string `json:"reason,omitempty"`
		Accept  bool   `json:"accept"`            // true = entrada confirmada
		Abandon bool   `json:"abandon,omitempty"` // true + accept=false = abandono definitivo
		// Ajustes opcionales por línea (product_id debe coincidir con el IR).
		// Si se omite, se asume qty_received = qty declarada y 0 dañado/rechazado.
		Lines []struct {
			ProductID   string  `json:"product_id"`
			QtyReceived float64 `json:"qty_received"`
			QtyDamaged  float64 `json:"qty_damaged"`
			QtyRejected float64 `json:"qty_rejected"`
		} `json:"lines,omitempty"`
	}
	if err := readJSON(r, &req); err != nil || req.ID == "" {
		writeJSON(w, 400, map[string]string{"error": "id de informe requerido"})
		return
	}
	if req.Abandon {
		req.Accept = false
	}
	if !req.Accept && strings.TrimSpace(req.Reason) == "" {
		writeJSON(w, 400, map[string]string{"error": "indique el motivo del problema o del abandono"})
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
		writeJSON(w, 409, map[string]string{"error": "informe anulado (abandonado); no admite entrada"})
		return
	}

	now := time.Now().UTC()
	if rn.Metadata == nil {
		rn.Metadata = domain.Metadata{}
	}

	// --- Abandono definitivo: sin movimiento de stock ni contabilidad ---
	if req.Abandon || (!req.Accept && strings.Contains(strings.ToUpper(req.Reason), "[ABANDONADO]")) {
		reason := strings.TrimSpace(req.Reason)
		rn.Status = "anulado"
		rn.Metadata["int.reception_status"] = "abandoned"
		rn.Metadata["int.reception_abandon_reason"] = reason
		rn.Metadata["int.reception_entry_actor"] = sess.UserID
		rn.Metadata["int.reception_entry_at"] = now.Format(time.RFC3339)
		if req.Note != "" {
			rn.Note = strings.TrimSpace(strings.Trim(strings.Join([]string{rn.Note, req.Note}, " · "), "· "))
		}
		s.audit(snap, sess, "recepcion.abandonada",
			fmt.Sprintf("Abandono definitivo IR %s · %s", rn.Number, reason), rn.ID)
		_ = s.Store.Put(snap)
		writeJSON(w, 200, map[string]any{
			"reception": rn,
			"message":   "Recepción abandonada; no se dio entrada ni se modificó stock",
		})
		return
	}

	// --- Problema de entrada (sigue pendiente de resolución; sin stock) ---
	if !req.Accept {
		rn.Status = "problemas_entrada"
		rn.Metadata["int.reception_status"] = "entry_problem"
		rn.Metadata["int.reception_problem_reason"] = strings.TrimSpace(req.Reason)
		rn.Metadata["int.reception_entry_actor"] = sess.UserID
		rn.Metadata["int.reception_entry_at"] = now.Format(time.RFC3339)
		rn.Note = strings.TrimSpace(strings.Trim(strings.Join([]string{rn.Note, strings.TrimSpace(req.Reason)}, " · "), "· "))
		s.audit(snap, sess, "recepcion.problema_entrada",
			fmt.Sprintf("Problema entrada IR %s · %s", rn.Number, strings.TrimSpace(req.Reason)), rn.ID)
		_ = s.Store.Put(snap)
		writeJSON(w, 200, map[string]any{"reception": rn, "message": "Problema de entrada registrado"})
		return
	}

	// --- Confirmación de entrada física ---
	adjByProduct := map[string]struct {
		recv, dmg, rej float64
		set            bool
	}{}
	for _, a := range req.Lines {
		pid := strings.TrimSpace(a.ProductID)
		if pid == "" {
			continue
		}
		adjByProduct[pid] = struct {
			recv, dmg, rej float64
			set            bool
		}{recv: a.QtyReceived, dmg: a.QtyDamaged, rej: a.QtyRejected, set: true}
	}

	var enteredCost float64
	var enteredLines int
	for i := range rn.Lines {
		ln := &rn.Lines[i]
		p := snap.Products[ln.ProductID]
		if p == nil {
			writeJSON(w, 400, map[string]string{"error": "producto faltante: " + ln.ProductCode})
			return
		}

		qtyRecv := ln.Qty
		qtyDmg := 0.0
		qtyRej := 0.0
		if adj, ok := adjByProduct[ln.ProductID]; ok && adj.set {
			qtyRecv = adj.recv
			qtyDmg = adj.dmg
			qtyRej = adj.rej
		}
		if qtyRecv < 0 || qtyDmg < 0 || qtyRej < 0 {
			writeJSON(w, 400, map[string]string{"error": "cantidades de entrada no pueden ser negativas (" + ln.ProductCode + ")"})
			return
		}
		// Tolerancia: recibido+dañado+rechazado no debe superar mucho lo declarado (aviso blando vía status).
		sumPhys := qtyRecv + qtyDmg + qtyRej
		if sumPhys > ln.Qty*1.0001 && ln.Qty > 0 {
			// Permitido pero marcamos partial/exceso en metadata de línea
			if ln.Metadata == nil {
				ln.Metadata = domain.Metadata{}
			}
			ln.Metadata["int.qty_over_declared"] = true
		}

		ln.QtyReceived = qtyRecv
		ln.QtyDamaged = qtyDmg
		ln.QtyRejected = qtyRej
		switch {
		case qtyRecv <= 0 && (qtyDmg > 0 || qtyRej > 0 || ln.Qty > 0):
			ln.LineStatus = "rejected"
		case qtyRecv+1e-9 < ln.Qty || qtyDmg > 0 || qtyRej > 0:
			ln.LineStatus = "partial"
		default:
			ln.LineStatus = "ok"
		}
		if ln.Metadata == nil {
			ln.Metadata = domain.Metadata{}
		}
		ln.Metadata["int.qty_declared"] = ln.Qty
		ln.Metadata["int.qty_received"] = qtyRecv
		ln.Metadata["int.qty_damaged"] = qtyDmg
		ln.Metadata["int.qty_rejected"] = qtyRej

		if qtyRecv <= 0 {
			continue
		}

		lineAmount := qtyRecv * ln.UnitCost
		st := snap.WarehouseStock[ln.ProductID]
		if st == nil {
			st = &domain.WarehouseStock{ProductID: ln.ProductID}
			snap.WarehouseStock[ln.ProductID] = st
		}
		newQty := st.Qty + qtyRecv
		if newQty > 0 {
			st.AvgCost = (st.AmountBase + lineAmount) / newQty
		}
		st.Qty = newQty
		st.AmountBase = st.Qty * st.AvgCost
		p.CostStd = st.AvgCost
		p.UpdatedAt = time.Now().UTC()
		s.mirrorInventoryFromProduct(snap, p, st)
		domain.PropagateCostFromProduct(snap, ln.ProductID)
		domain.AppendStockMove(snap, domain.StockMovement{
			ID: uuid.NewString(), TenantID: sess.TenantID, ProductID: ln.ProductID,
			Location: domain.LocWarehouse, Kind: domain.MoveReceptionIn,
			Qty: qtyRecv, QtySigned: qtyRecv, UnitCost: ln.UnitCost, AmountBase: lineAmount,
			RefType: "reception", RefID: rn.ID, Note: "Entrada IR " + rn.Number,
			CreatedBy: sess.UserID, CreatedAt: time.Now().UTC(),
		})

		enteredCost += lineAmount
		enteredLines++
	}

	if enteredLines == 0 {
		writeJSON(w, 400, map[string]string{"error": "ninguna línea con cantidad recibida > 0; use problema o abandono"})
		return
	}

	// Contabilidad: misma fuente de asientos (libro único) — Debe Inventario | Haber Caja.
	if ent := domain.ApplyInventoryIn(snap, enteredCost,
		fmt.Sprintf("Entrada almacén IR %s · %s · validado por almacenero", rn.Number, rn.Supplier),
		sess.UserID); ent != nil {
		domain.AppendPostedEntry(snap, ent, sess.TenantID, rn.Date)
	}

	rn.Status = "entrado"
	rn.EnteredBy = sess.UserID
	rn.EnteredAt = &now
	rn.Metadata["int.reception_status"] = "entry_confirmed"
	rn.Metadata["int.reception_entry_actor"] = sess.UserID
	rn.Metadata["int.reception_entry_at"] = now.Format(time.RFC3339)
	rn.Metadata["int.reception_entered_cost"] = enteredCost
	rn.Metadata["int.reception_entered_lines"] = enteredLines
	if req.Note != "" {
		if rn.Note != "" {
			rn.Note = rn.Note + " · " + req.Note
		} else {
			rn.Note = req.Note
		}
	}
	// Recalcular total documental se conserva; entered cost queda en metadata.
	s.audit(snap, sess, "recepcion.entrada_almacen",
		fmt.Sprintf("Entrada IR %s · recibido costo %.2f %s · %d líneas con stock",
			rn.Number, enteredCost, rn.Currency, enteredLines), rn.ID)
	_ = s.Store.Put(snap)
	writeJSON(w, 200, map[string]any{
		"reception":     rn,
		"entered_cost":  enteredCost,
		"entered_lines": enteredLines,
		"message":       "Entrada física confirmada; stock y costo promedio actualizados",
	})
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
		// Prioridad 2: validar TODAS las líneas antes de mutar stock (sin fallos parciales).
		var body domain.StockTransfer
		if err := readJSON(r, &body); err != nil || body.UnitID == "" || len(body.Lines) == 0 {
			writeJSON(w, 400, map[string]string{"error": "unidad y líneas requeridas"})
			return
		}
		unit := snap.SalesUnits[body.UnitID]
		if unit == nil || !unit.Active {
			writeJSON(w, 400, map[string]string{"error": "unidad de venta no válida o inactiva", "code": "unit_invalid"})
			return
		}

		inputs := make([]domain.TransferLineInput, 0, len(body.Lines))
		for _, ln := range body.Lines {
			inputs = append(inputs, domain.TransferLineInput{
				ProductID: strings.TrimSpace(ln.ProductID),
				Qty:       ln.Qty,
			})
		}
		demand := domain.AggregateTransferDemand(inputs)
		if err := domain.ValidateTransferStock(snap, body.UnitID, demand); err != nil {
			code := "transfer_invalid"
			msg := err.Error()
			if ve, ok := err.(*domain.TransferValidationError); ok {
				code = ve.Code
				msg = ve.Message
			}
			writeJSON(w, 400, map[string]string{"error": msg, "code": code})
			return
		}

		applied, err := domain.ApplyWarehouseToUnitTransfer(snap, body.UnitID, inputs)
		if err != nil {
			code := "transfer_failed"
			msg := err.Error()
			if ve, ok := err.(*domain.TransferValidationError); ok {
				code = ve.Code
				msg = ve.Message
			}
			writeJSON(w, 400, map[string]string{"error": msg, "code": code})
			return
		}

		transferID := uuid.NewString()
		body.ID = transferID
		// Espejo inventario legacy + Kardex (salida almacén / entrada PDV).
		seen := map[string]struct{}{}
		for _, ln := range applied {
			domain.AppendStockMove(snap, domain.StockMovement{
				ID: uuid.NewString(), TenantID: sess.TenantID, ProductID: ln.ProductID,
				Location: domain.LocWarehouse, Kind: domain.MoveTransferOut,
				Qty: ln.Qty, QtySigned: -ln.Qty, UnitCost: ln.UnitCost, AmountBase: ln.Amount,
				RefType: "transfer", RefID: transferID, Note: "TR → " + unit.Code,
				CreatedBy: sess.UserID, CreatedAt: time.Now().UTC(),
			})
			domain.AppendStockMove(snap, domain.StockMovement{
				ID: uuid.NewString(), TenantID: sess.TenantID, ProductID: ln.ProductID,
				Location: domain.LocUnit, UnitID: body.UnitID, Kind: domain.MoveTransferIn,
				Qty: ln.Qty, QtySigned: ln.Qty, UnitCost: ln.UnitCost, AmountBase: ln.Amount,
				RefType: "transfer", RefID: transferID, Note: "TR desde almacén",
				CreatedBy: sess.UserID, CreatedAt: time.Now().UTC(),
			})
			if _, ok := seen[ln.ProductID]; ok {
				continue
			}
			seen[ln.ProductID] = struct{}{}
			p := snap.Products[ln.ProductID]
			st := snap.WarehouseStock[ln.ProductID]
			if p != nil && st != nil {
				s.mirrorInventoryFromProduct(snap, p, st)
			}
		}

		body.TenantID = sess.TenantID
		body.Number = nextCode("TR", &snap.DocCounters.TransferSeq)
		if body.Date == "" {
			body.Date = time.Now().Format("2006-01-02")
		}
		body.UnitName = unit.Name
		body.Status = "confirmado"
		body.CreatedBy = sess.UserID
		body.CreatedAt = time.Now().UTC()
		body.Lines = applied
		if body.Metadata == nil {
			body.Metadata = domain.Metadata{}
		}
		body.Metadata["int.transfer_unit_code"] = unit.Code
		body.Metadata["int.transfer_line_count"] = len(applied)

		snap.Transfers = append(snap.Transfers, body)
		s.audit(snap, sess, "almacen.transferencia",
			fmt.Sprintf("Transferencia %s a unidad %s (%s) · %d líneas · stock validado",
				body.Number, unit.Code, unit.Name, len(body.Lines)), body.ID)
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
			if ln.UnitPrice <= 0 {
				writeJSON(w, 400, map[string]string{
					"error": "producto sin precio de venta configurado: " + p.Code +
						" · cree una ficha de precio o indique unit_price",
				})
				return
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
				domain.AppendStockMove(snap, domain.StockMovement{
					ID: uuid.NewString(), TenantID: sess.TenantID, ProductID: ln.ProductID,
					Location: domain.LocUnit, UnitID: body.UnitID, Kind: domain.MoveSaleOut,
					Qty: ln.Qty, QtySigned: -ln.Qty, UnitCost: unitCost, AmountBase: unitCost * ln.Qty,
					RefType: "sale", RefID: body.ID, Note: "Venta " + body.Number,
					CreatedBy: sess.UserID, CreatedAt: time.Now().UTC(),
				})
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
				domain.AppendStockMove(snap, domain.StockMovement{
					ID: uuid.NewString(), TenantID: sess.TenantID, ProductID: ln.ProductID,
					Location: domain.LocWarehouse, Kind: domain.MoveSaleOut,
					Qty: ln.Qty, QtySigned: -ln.Qty, UnitCost: unitCost, AmountBase: unitCost * ln.Qty,
					RefType: "sale", RefID: body.ID, Note: "Venta " + body.Number,
					CreatedBy: sess.UserID, CreatedAt: time.Now().UTC(),
				})
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
			domain.AppendPostedEntry(snap, ent, sess.TenantID, body.Date)
		}
		if costT > 0 {
			// COGS: Debe 5000 | Haber 1300 — un solo Apply (saldos + asiento).
			if cogsEnt := domain.ApplyInventoryOut(snap, costT, "Costo venta "+body.Number, sess.UserID); cogsEnt != nil {
				domain.AppendPostedEntry(snap, cogsEnt, sess.TenantID, body.Date)
			}
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


// resolveProductCostRef elige un costo de referencia trazable para fichas de precio:
// 1) avg_cost almacén  2) avg_cost en alguna unidad  3) ficha de costo unitario
// 4) product.cost_std  5) último unit_cost de recepción con entrada (si hay líneas)
func resolveProductCostRef(snap *domain.StoreSnapshot, productID string) float64 {
	if snap == nil || productID == "" {
		return 0
	}
	if st := snap.WarehouseStock[productID]; st != nil && st.AvgCost > 0 {
		return st.AvgCost
	}
	for i := range snap.UnitStocks {
		us := snap.UnitStocks[i]
		if us.ProductID == productID && us.AvgCost > 0 {
			return us.AvgCost
		}
	}
	if cs := snap.CostSheets[productID]; cs != nil && cs.CostoUnitario > 0 {
		return cs.CostoUnitario
	}
	if p := snap.Products[productID]; p != nil && p.CostStd > 0 {
		return p.CostStd
	}
	var last float64
	for i := range snap.Receptions {
		rec := snap.Receptions[i]
		for _, ln := range rec.Lines {
			if ln.ProductID == productID && ln.UnitCost > 0 {
				last = ln.UnitCost
			}
		}
	}
	return last
}

// productHasPriceSheet indica si existe al menos una ficha de precio para el producto.
func productHasPriceSheet(snap *domain.StoreSnapshot, productID string) bool {
	if snap == nil || snap.PriceSheets == nil {
		return false
	}
	for _, ps := range snap.PriceSheets {
		if ps != nil && ps.ProductID == productID && ps.Price > 0 {
			return true
		}
	}
	return false
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
		// Validar componentes de receta
		compIDs := make([]string, 0, len(body.Components))
		for _, c := range body.Components {
			if c.ProductID == "" || c.Qty <= 0 {
				writeJSON(w, 400, map[string]string{"error": "cada componente requiere product_id y qty > 0"})
				return
			}
			if c.ProductID == body.ProductID {
				writeJSON(w, 400, map[string]string{"error": "un producto no puede ser componente de sí mismo"})
				return
			}
			if snap.Products[c.ProductID] == nil {
				writeJSON(w, 400, map[string]string{"error": "componente no encontrado: " + c.ProductID})
				return
			}
			compIDs = append(compIDs, c.ProductID)
		}
		if len(compIDs) > 0 && domain.CostSheetWouldCycle(snap, body.ProductID, compIDs) {
			writeJSON(w, 400, map[string]string{"error": "dependencia circular en la receta de costo"})
			return
		}
		// Legacy: automatizar materia prima desde almacén si no hay receta ni MP
		if len(body.Components) == 0 && body.MateriaPrima <= 0 {
			if st := snap.WarehouseStock[body.ProductID]; st != nil && st.AvgCost > 0 {
				body.MateriaPrima = st.AvgCost
			} else if p.CostStd > 0 {
				body.MateriaPrima = p.CostStd
			}
		}
		if body.DifficultyFactor <= 0 && body.DifficultyLevel > 0 {
			body.DifficultyFactor = domain.DefaultDifficultyFactor(body.DifficultyLevel)
		}
		domain.RecalculateCostSheet(snap, &body)
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
		// Precio de lista solo si no hay ficha de precio ni price_sale previo
		if body.PrecioSugerido > 0 && !productHasPriceSheet(snap, body.ProductID) && p.PriceSale <= 0 {
			p.PriceSale = body.PrecioSugerido
		}
		p.UpdatedAt = time.Now().UTC()
		// Propagar hacia compuestos que usen este producto como componente
		propagated := domain.PropagateCostFromProduct(snap, body.ProductID)
		s.audit(snap, sess, "ficha_costo",
			fmt.Sprintf("Ficha de costo %s %s · unitario %.2f %s · componentes %d · propagó %d",
				p.Code, p.Name, body.CostoUnitario, body.Currency, len(body.Components), propagated), body.ID)
		if err := s.Store.Put(snap); err != nil {
			writeJSON(w, 500, map[string]string{"error": "no se pudo persistir la ficha de costo: " + err.Error()})
			return
		}
		writeJSON(w, 201, map[string]any{"cost_sheet": body, "propagated": propagated})

	case http.MethodDelete:
		// ?product_id=…  o  ?id=… (id de ficha)
		productID := strings.TrimSpace(r.URL.Query().Get("product_id"))
		sheetID := strings.TrimSpace(r.URL.Query().Get("id"))
		if productID == "" && sheetID != "" {
			for pid, cs := range snap.CostSheets {
				if cs != nil && cs.ID == sheetID {
					productID = pid
					break
				}
			}
		}
		if productID == "" {
			writeJSON(w, 400, map[string]string{"error": "product_id o id requerido"})
			return
		}
		cs := snap.CostSheets[productID]
		if cs == nil {
			writeJSON(w, 404, map[string]string{"error": "ficha de costo no encontrada"})
			return
		}
		// Política: no eliminar si este producto es componente de otras recetas.
		deps := domain.CostSheetDependents(snap, productID)
		if len(deps) > 0 {
			names := make([]string, 0, len(deps))
			for _, d := range deps {
				if other := snap.CostSheets[d]; other != nil {
					label := other.ProductCode
					if other.ProductName != "" {
						if label != "" {
							label += " · "
						}
						label += other.ProductName
					}
					if label == "" {
						label = d
					}
					names = append(names, label)
				} else {
					names = append(names, d)
				}
			}
			writeJSON(w, 409, map[string]any{
				"error": "no se puede eliminar: este producto forma parte de otras fichas de costo. Quite el componente de esas recetas primero.",
				"dependents": names,
				"dependent_ids": deps,
			})
			return
		}
		code, name := cs.ProductCode, cs.ProductName
		delete(snap.CostSheets, productID)
		s.audit(snap, sess, "ficha_costo.eliminar",
			fmt.Sprintf("Eliminó ficha de costo %s %s", code, name), productID)
		if err := s.Store.Put(snap); err != nil {
			writeJSON(w, 500, map[string]string{"error": "no se pudo persistir: " + err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"ok": true, "product_id": productID})

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

func (s *Server) handleRolePermissions(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "no autorizado"})
		return
	}
	if sess.Role != domain.RoleMaster && sess.Role != domain.RoleAdmin {
		writeJSON(w, 403, map[string]string{"error": "solo master o admin"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "no encontrado"})
		return
	}
	if snap.Tenant.RolePermissions == nil {
		snap.Tenant.RolePermissions = map[string]map[string]bool{}
	}
	w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate")
	switch r.Method {
	case http.MethodGet:
		result := map[string]map[string]bool{}
		for _, role := range auth.ValidRoles() {
			permissions := map[string]bool{}
			for view := range auth.ViewACL {
				permissions[view] = auth.CanInTenant(snap, role, view)
			}
			result[role] = permissions
		}
		writeJSON(w, 200, map[string]any{"roles": result})
	case http.MethodPut:
		var body struct {
			Role string `json:"role"`
			Permissions map[string]bool `json:"permissions"`
		}
		if err := readJSON(r, &body); err != nil || body.Role == "" || body.Permissions == nil {
			writeJSON(w, 400, map[string]string{"error": "rol y permisos requeridos"})
			return
		}
		valid := false
		for _, role := range auth.ValidRoles() {
			if role == body.Role { valid = true; break }
		}
		if !valid {
			writeJSON(w, 400, map[string]string{"error": "rol no permitido"})
			return
		}
		clean := map[string]bool{}
		for view := range auth.ViewACL {
			if value, ok := body.Permissions[view]; ok {
				clean[view] = value
			} else {
				clean[view] = auth.Can(body.Role, view)
			}
		}
		// Conceder vista en rol también habilita el módulo del negocio (si no, ModuleEnabled bloquea).
		if snap.Tenant.EnabledModules == nil {
			snap.Tenant.EnabledModules = domain.DefaultEnabledModules()
		}
		for view, allowed := range clean {
			if allowed {
				snap.Tenant.EnabledModules[view] = true
			}
		}
		snap.Tenant.RolePermissions[body.Role] = clean
		snap.Tenant.UpdatedAt = time.Now().UTC()
		s.audit(snap, sess, "permisos.rol.edicion", "Edición de permisos del rol «"+roleLabelES(body.Role)+"»", body.Role)
		if err := s.Store.Put(snap); err != nil {
			writeJSON(w, 500, map[string]string{"error": "no se pudieron persistir los permisos del rol: " + err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"role": body.Role, "permissions": clean})
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
			list = append(list, publicUser(snap, u))
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
			Modules: nil,
			CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC(),
		}
		if u.DisplayName == "" {
			u.DisplayName = u.Username
		}
		snap.Users[u.ID] = u
		s.audit(snap, sess, "usuario.alta", "Alta de usuario «"+u.Username+"» con rol «"+roleLabelES(u.Role)+"»", u.ID)
		_ = s.Store.Put(snap)
		writeJSON(w, 201, map[string]any{"user": publicUser(snap, u)})
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
			u.Modules = nil
		}
		if body.Modules != nil && !roleChanged {
			if sess.Role != domain.RoleMaster && sess.Role != domain.RoleAdmin {
				writeJSON(w, 403, map[string]string{"error": "solo master o admin pueden asignar módulos"})
				return
			}
			if snap.Tenant.EnabledModules == nil {
				snap.Tenant.EnabledModules = domain.DefaultEnabledModules()
			}
			// Fusionar: admin puede conceder módulos fuera del rol o revocarlos
			clean := map[string]bool{}
			if u.Modules != nil {
				for k, v := range u.Modules {
					clean[k] = v
				}
			}
			for k, v := range body.Modules {
				clean[k] = v
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
		if err := s.Store.Put(snap); err != nil {
			writeJSON(w, 500, map[string]string{"error": "no se pudieron persistir los cambios del usuario: " + err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"user": publicUser(snap, u), "views": auth.ViewsForUser(u.Role, snap, u)})
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

// mirrorInventoryFromProduct mantiene el inventario “legacy” alineado con el stock de almacén
// del producto del nomenclador (misma cantidad y costo promedio).
func (s *Server) mirrorInventoryFromProduct(snap *domain.StoreSnapshot, p *domain.Product, st *domain.WarehouseStock) {
	if snap == nil || p == nil || st == nil {
		return
	}
	if snap.Inventory == nil {
		snap.Inventory = map[string]*domain.InventoryItem{}
	}
	var item *domain.InventoryItem
	for _, it := range snap.Inventory {
		if it == nil || !it.Active {
			continue
		}
		if strings.EqualFold(strings.TrimSpace(it.SKU), strings.TrimSpace(p.Code)) ||
			(it.SKU == "" && strings.EqualFold(strings.TrimSpace(it.Name), strings.TrimSpace(p.Name))) {
			item = it
			break
		}
	}
	if item == nil {
		item = &domain.InventoryItem{
			ID:       uuid.NewString(),
			TenantID: p.TenantID,
			SKU:      p.Code,
			Name:     p.Name,
			Unit:     p.Unit,
			Currency: p.Currency,
			Active:   true,
		}
		if item.Currency == "" && snap.Tenant.Currency != "" {
			item.Currency = snap.Tenant.Currency
		}
		snap.Inventory[item.ID] = item
	}
	item.Qty = st.Qty
	item.Cost = st.AvgCost
	item.Amount = st.Qty * st.AvgCost
	item.AmountBase = item.Amount
	item.UpdatedAt = time.Now().UTC()
	if p.PriceSale > 0 {
		item.Price = p.PriceSale
	}
}

func findUnitStock(snap *domain.StoreSnapshot, unitID, productID string) *domain.UnitStock {
	if snap == nil {
		return nil
	}
	for i := range snap.UnitStocks {
		if snap.UnitStocks[i].UnitID == unitID && snap.UnitStocks[i].ProductID == productID {
			return &snap.UnitStocks[i]
		}
	}
	return nil
}
