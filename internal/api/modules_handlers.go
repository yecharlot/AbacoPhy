package api

import (
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/yecharlot/AbacoPhy/internal/domain"
)

func (s *Server) handleMeasureUnits(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	if err := s.gate(sess, "measure_units"); err != nil {
		if err2 := s.gate(sess, "nomencladores"); err2 != nil {
			writeJSON(w, 403, map[string]string{"error": "forbidden"})
			return
		}
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "tenant not found"})
		return
	}
	if snap.MeasureUnits == nil {
		snap.MeasureUnits = domain.DefaultMeasureUnits(snap.Tenant.ID)
	}
	switch r.Method {
	case http.MethodGet:
		list := make([]*domain.MeasureUnit, 0, len(snap.MeasureUnits))
		for _, u := range snap.MeasureUnits {
			list = append(list, u)
		}
		writeJSON(w, 200, map[string]any{"units": list})
	case http.MethodPost:
		var body struct {
			Code   string `json:"code"`
			Name   string `json:"name"`
			Symbol string `json:"symbol"`
		}
		if err := readJSON(r, &body); err != nil || strings.TrimSpace(body.Code) == "" || strings.TrimSpace(body.Name) == "" {
			writeJSON(w, 400, map[string]string{"error": "code y name requeridos"})
			return
		}
		now := time.Now().UTC()
		id := uuid.NewString()
		code := strings.ToUpper(strings.TrimSpace(body.Code))
		for _, u := range snap.MeasureUnits {
			if strings.EqualFold(u.Code, code) {
				writeJSON(w, 409, map[string]string{"error": "código ya existe"})
				return
			}
		}
		u := &domain.MeasureUnit{
			ID: id, TenantID: snap.Tenant.ID, Code: code, Name: strings.TrimSpace(body.Name),
			Symbol: strings.TrimSpace(body.Symbol), Active: true, CreatedAt: now, UpdatedAt: now,
		}
		snap.MeasureUnits[id] = u
		s.audit(snap, sess, "measure_unit.create", "Creó unidad de medida "+code, code)
		_ = s.Store.Put(snap)
		writeJSON(w, 200, map[string]any{"ok": true, "unit": u})
	case http.MethodPut:
		var body struct {
			ID     string `json:"id"`
			Code   string `json:"code"`
			Name   string `json:"name"`
			Symbol string `json:"symbol"`
			Active *bool  `json:"active"`
		}
		if err := readJSON(r, &body); err != nil || body.ID == "" {
			writeJSON(w, 400, map[string]string{"error": "id requerido"})
			return
		}
		u := snap.MeasureUnits[body.ID]
		if u == nil {
			writeJSON(w, 404, map[string]string{"error": "no encontrada"})
			return
		}
		if body.Code != "" {
			u.Code = strings.ToUpper(strings.TrimSpace(body.Code))
		}
		if body.Name != "" {
			u.Name = strings.TrimSpace(body.Name)
		}
		if body.Symbol != "" {
			u.Symbol = strings.TrimSpace(body.Symbol)
		}
		if body.Active != nil {
			u.Active = *body.Active
		}
		u.UpdatedAt = time.Now().UTC()
		s.audit(snap, sess, "measure_unit.update", "Actualizó unidad de medida "+u.Code, u.ID)
		_ = s.Store.Put(snap)
		writeJSON(w, 200, map[string]any{"ok": true, "unit": u})
	case http.MethodDelete:
		id := r.URL.Query().Get("id")
		if id == "" {
			writeJSON(w, 400, map[string]string{"error": "id requerido"})
			return
		}
		u := snap.MeasureUnits[id]
		if u == nil {
			writeJSON(w, 404, map[string]string{"error": "no encontrada"})
			return
		}
		delete(snap.MeasureUnits, id)
		s.audit(snap, sess, "measure_unit.delete", "Eliminó unidad de medida "+u.Code, u.ID)
		_ = s.Store.Put(snap)
		writeJSON(w, 200, map[string]any{"ok": true})
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

func (s *Server) handlePriceSheets(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	if err := s.gate(sess, "fichas_precio"); err != nil {
		writeJSON(w, 403, map[string]string{"error": "forbidden"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "tenant not found"})
		return
	}
	if snap.PriceSheets == nil {
		snap.PriceSheets = map[string]*domain.PriceSheet{}
	}
	switch r.Method {
	case http.MethodGet:
		list := make([]*domain.PriceSheet, 0, len(snap.PriceSheets))
		for _, p := range snap.PriceSheets {
			list = append(list, p)
		}
		writeJSON(w, 200, map[string]any{"sheets": list})
	case http.MethodPost:
		var body struct {
			ProductID string  `json:"product_id"`
			CostRef   float64 `json:"cost_ref"`
			MarginPct float64 `json:"margin_pct"`
			Price     float64 `json:"price"`
			Currency  string  `json:"currency"`
			Notes     string  `json:"notes"`
		}
		if err := readJSON(r, &body); err != nil || body.ProductID == "" {
			writeJSON(w, 400, map[string]string{"error": "product_id requerido"})
			return
		}
		prod := snap.Products[body.ProductID]
		if prod == nil {
			writeJSON(w, 404, map[string]string{"error": "producto no encontrado"})
			return
		}
		now := time.Now().UTC()
		price := body.Price
		if price <= 0 && body.CostRef > 0 {
			price = body.CostRef * (1 + body.MarginPct/100)
		}
		cur := body.Currency
		if cur == "" {
			cur = snap.Tenant.Currency
		}
		id := uuid.NewString()
		ps := &domain.PriceSheet{
			ID: id, TenantID: snap.Tenant.ID, ProductID: prod.ID,
			ProductCode: prod.Code, ProductName: prod.Name,
			CostRef: body.CostRef, MarginPct: body.MarginPct, Price: price,
			Currency: cur, Notes: body.Notes, CreatedBy: sess.UserID,
			CreatedAt: now, UpdatedAt: now,
		}
		snap.PriceSheets[id] = ps
		if body.Price > 0 || prod.PriceSale == 0 {
			prod.PriceSale = price
		}
		s.audit(snap, sess, "price_sheet.create", "Ficha de precio "+prod.Code, prod.ID)
		_ = s.Store.Put(snap)
		writeJSON(w, 200, map[string]any{"ok": true, "sheet": ps})
	case http.MethodDelete:
		id := r.URL.Query().Get("id")
		if id == "" {
			writeJSON(w, 400, map[string]string{"error": "id requerido"})
			return
		}
		delete(snap.PriceSheets, id)
		s.audit(snap, sess, "price_sheet.delete", "Eliminó ficha de precio", id)
		_ = s.Store.Put(snap)
		writeJSON(w, 200, map[string]any{"ok": true})
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

func (s *Server) handleModules(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "tenant not found"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		writeJSON(w, 200, map[string]any{
			"modules": modulesPayload(snap),
			"catalog": domain.CatalogModules(),
			"role":    sess.Role,
		})
	case http.MethodPut:
		if sess.Role != domain.RoleMaster {
			writeJSON(w, 403, map[string]string{"error": "solo master puede cambiar módulos"})
			return
		}
		var body struct {
			Modules map[string]bool `json:"modules"`
		}
		if err := readJSON(r, &body); err != nil || body.Modules == nil {
			writeJSON(w, 400, map[string]string{"error": "modules requerido"})
			return
		}
		if snap.Tenant.EnabledModules == nil {
			snap.Tenant.EnabledModules = domain.DefaultEnabledModules()
		}
		for k, v := range body.Modules {
			core := false
			for _, meta := range domain.CatalogModules() {
				if meta.ID == k && meta.Core {
					core = true
					break
				}
			}
			if core {
				snap.Tenant.EnabledModules[k] = true
				continue
			}
			snap.Tenant.EnabledModules[k] = v
		}
		s.audit(snap, sess, "modules.update", "Actualizó módulos habilitados del negocio", "")
		_ = s.Store.Put(snap)
		writeJSON(w, 200, map[string]any{"ok": true, "modules": snap.Tenant.EnabledModules})
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

func (s *Server) handleOnlineOrders(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	if err := s.gate(sess, "pedidos_online"); err != nil {
		writeJSON(w, 403, map[string]string{"error": "forbidden"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "tenant not found"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		writeJSON(w, 200, map[string]any{"orders": snap.OnlineOrders})
	case http.MethodPost:
		var body struct {
			Customer string `json:"customer"`
			Phone    string `json:"phone"`
			Address  string `json:"address"`
			Notes    string `json:"notes"`
			Lines    []struct {
				ProductID string  `json:"product_id"`
				Qty       float64 `json:"qty"`
				UnitPrice float64 `json:"unit_price"`
			} `json:"lines"`
		}
		if err := readJSON(r, &body); err != nil || body.Customer == "" || len(body.Lines) == 0 {
			writeJSON(w, 400, map[string]string{"error": "customer y lines requeridos"})
			return
		}
		now := time.Now().UTC()
		var lines []domain.OnlineOrderLine
		total := 0.0
		for _, l := range body.Lines {
			p := snap.Products[l.ProductID]
			if p == nil {
				continue
			}
			up := l.UnitPrice
			if up <= 0 {
				up = p.PriceSale
			}
			lt := up * l.Qty
			total += lt
			lines = append(lines, domain.OnlineOrderLine{
				ProductID: p.ID, ProductCode: p.Code, ProductName: p.Name,
				Qty: l.Qty, UnitPrice: up, LineTotal: lt,
			})
		}
		if len(lines) == 0 {
			writeJSON(w, 400, map[string]string{"error": "sin líneas válidas"})
			return
		}
		ord := domain.OnlineOrder{
			ID: uuid.NewString(), TenantID: snap.Tenant.ID,
			Number: "PO-" + time.Now().Format("20060102") + "-" + uuid.NewString()[:6],
			Customer: body.Customer, Phone: body.Phone, Address: body.Address,
			Status: "pending", Lines: lines, Total: total, Currency: snap.Tenant.Currency,
			Notes: body.Notes, CreatedAt: now, UpdatedAt: now,
		}
		snap.OnlineOrders = append(snap.OnlineOrders, ord)
		s.audit(snap, sess, "online_order.create", "Pedido online "+ord.Number, ord.ID)
		_ = s.Store.Put(snap)
		writeJSON(w, 200, map[string]any{"ok": true, "order": ord})
	case http.MethodPut:
		var body struct {
			ID     string `json:"id"`
			Status string `json:"status"`
		}
		if err := readJSON(r, &body); err != nil || body.ID == "" {
			writeJSON(w, 400, map[string]string{"error": "id requerido"})
			return
		}
		found := false
		for i := range snap.OnlineOrders {
			if snap.OnlineOrders[i].ID == body.ID {
				if body.Status != "" {
					snap.OnlineOrders[i].Status = body.Status
				}
				snap.OnlineOrders[i].UpdatedAt = time.Now().UTC()
				found = true
				break
			}
		}
		if !found {
			writeJSON(w, 404, map[string]string{"error": "pedido no encontrado"})
			return
		}
		s.audit(snap, sess, "online_order.update", "Actualizó pedido "+body.ID, body.ID)
		_ = s.Store.Put(snap)
		writeJSON(w, 200, map[string]any{"ok": true})
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}
