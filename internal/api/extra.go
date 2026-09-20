package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/yecharlot/AbacoPhy/internal/auth"
	"github.com/yecharlot/AbacoPhy/internal/domain"
	"github.com/yecharlot/AbacoPhy/internal/store"
)

func (s *Server) audit(snap *domain.StoreSnapshot, sess *domain.TokenSession, action, detail, ref string) {
	if snap == nil || sess == nil {
		return
	}
	uname := ""
	if u := snap.Users[sess.UserID]; u != nil {
		uname = u.Username
	}
	e := domain.AuditEntry{
		ID: uuid.NewString(), TenantID: sess.TenantID, UserID: sess.UserID,
		Username: uname, Action: action, Detail: detail, Ref: ref,
		CID: snap.RootCID, CreatedAt: time.Now().UTC(),
	}
	snap.AuditLog = append(snap.AuditLog, e)
	// mantener últimos 500
	if len(snap.AuditLog) > 500 {
		snap.AuditLog = snap.AuditLog[len(snap.AuditLog)-500:]
	}
}

func (s *Server) ensureCurrencies(snap *domain.StoreSnapshot) {
	if snap.Currencies == nil || len(snap.Currencies) == 0 {
		snap.Currencies = domain.DefaultCurrencies(snap.Tenant.Currency)
	}
}

func (s *Server) registerExtraRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/v1/currencies", s.handleCurrencies)
	mux.HandleFunc("/api/v1/accounts/t", s.handleAccountT)
	mux.HandleFunc("/api/v1/audit", s.handleAudit)
	mux.HandleFunc("/api/v1/backups", s.handleBackups)
	mux.HandleFunc("/api/v1/backups/restore", s.handleBackupRestore)
	mux.HandleFunc("/api/v1/inventory/out", s.handleInventoryOut)
	mux.HandleFunc("/api/v1/reports/financial", s.handleFinancial)
	mux.HandleFunc("/api/v1/theme", s.handleTheme)
	mux.HandleFunc("/api/v1/errors", s.handleErrors)
}

func (s *Server) handleCurrencies(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "no autorizado"})
		return
	}
	if err := auth.RequireView(sess, "monedas"); err != nil && r.Method != http.MethodGet {
		writeJSON(w, 403, map[string]string{"error": "sin permiso"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "no encontrado"})
		return
	}
	s.ensureCurrencies(snap)
	switch r.Method {
	case http.MethodGet:
		list := make([]*domain.CurrencyRate, 0, len(snap.Currencies))
		for _, c := range snap.Currencies {
			list = append(list, c)
		}
		writeJSON(w, 200, map[string]any{"base": snap.Tenant.Currency, "currencies": list})
	case http.MethodPost, http.MethodPut:
		var body domain.CurrencyRate
		if err := readJSON(r, &body); err != nil || body.Code == "" {
			writeJSON(w, 400, map[string]string{"error": "codigo requerido"})
			return
		}
		body.Code = body.Code
		if body.Rate <= 0 {
			body.Rate = 1
		}
		body.Active = true
		body.UpdatedAt = time.Now().UTC()
		if body.Name == "" {
			body.Name = body.Code
		}
		snap.Currencies[body.Code] = &body
		s.audit(snap, sess, "currency.upsert", body.Code+" rate="+formatFloat(body.Rate), body.Code)
		_ = s.Store.Put(snap)
		writeJSON(w, 200, body)
	default:
		writeJSON(w, 405, map[string]string{"error": "metodo no permitido"})
	}
}

func formatFloat(f float64) string {
	b, _ := json.Marshal(f)
	return string(b)
}

func (s *Server) handleAccountT(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "no autorizado"})
		return
	}
	if err := auth.RequireView(sess, "cuentas_t"); err != nil {
		writeJSON(w, 403, map[string]string{"error": "sin permiso"})
		return
	}
	id := r.URL.Query().Get("id")
	if id == "" {
		writeJSON(w, 400, map[string]string{"error": "falta id de cuenta"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "no encontrado"})
		return
	}
	acc := snap.Accounts[id]
	if acc == nil {
		writeJSON(w, 404, map[string]string{"error": "cuenta no encontrada"})
		return
	}
	debe, haber, saldo := domain.TAccountLines(snap, id)
	writeJSON(w, 200, map[string]any{
		"cuenta": acc, "debe": debe, "haber": haber, "saldo": saldo,
		"titulo": "Cuenta T — " + acc.Code + " " + acc.Name,
	})
}

func (s *Server) handleAudit(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "no autorizado"})
		return
	}
	if err := auth.RequireView(sess, "traza"); err != nil {
		writeJSON(w, 403, map[string]string{"error": "sin permiso"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "no encontrado"})
		return
	}
	logs := snap.AuditLog
	if logs == nil {
		logs = []domain.AuditEntry{}
	}
	var filtered []domain.AuditEntry
	for _, a := range logs {
		// logs de master solo visibles para master
		if (a.Action == "master.op" || a.Action == "error" || a.Action == "theme.update") && sess.Role != domain.RoleMaster {
			continue
		}
		// acciones de master user
		if u := snap.Users[a.UserID]; u != nil && u.Role == domain.RoleMaster && sess.Role != domain.RoleMaster {
			continue
		}
		filtered = append(filtered, a)
	}
	out := make([]domain.AuditEntry, len(filtered))
	for i := range filtered {
		out[len(filtered)-1-i] = filtered[i]
	}
	writeJSON(w, 200, map[string]any{"audit": out, "count": len(out), "root_cid": snap.RootCID})
}

func (s *Server) handleBackups(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "no autorizado"})
		return
	}
	if err := auth.RequireView(sess, "salvas"); err != nil {
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
		list := snap.Backups
		if list == nil {
			list = []domain.BackupMeta{}
		}
		writeJSON(w, 200, map[string]any{"backups": list, "current_cid": snap.RootCID, "rev": snap.Rev})
	case http.MethodPost:
		var body struct {
			Label string `json:"label"`
		}
		_ = readJSON(r, &body)
		// Forzar persistencia para obtener CID fresco
		_ = s.Store.Put(snap)
		snap = s.Store.Get(sess.TenantID)
		uname := ""
		if u := snap.Users[sess.UserID]; u != nil {
			uname = u.Username
		}
		meta := domain.BackupMeta{
			CID: snap.RootCID, Label: body.Label, Rev: snap.Rev,
			UserID: sess.UserID, Username: uname, CreatedAt: time.Now().UTC(),
		}
		snap.Backups = append(snap.Backups, meta)
		s.audit(snap, sess, "backup.save", "Salva CID "+snap.RootCID, snap.RootCID)
		_ = s.Store.Put(snap)
		writeJSON(w, 201, meta)
	default:
		writeJSON(w, 405, map[string]string{"error": "metodo no permitido"})
	}
}

func (s *Server) handleBackupRestore(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, map[string]string{"error": "metodo no permitido"})
		return
	}
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "no autorizado"})
		return
	}
	if err := auth.RequireView(sess, "salvas"); err != nil {
		writeJSON(w, 403, map[string]string{"error": "sin permiso"})
		return
	}
	var body struct {
		CID string `json:"cid"`
	}
	if err := readJSON(r, &body); err != nil || body.CID == "" {
		writeJSON(w, 400, map[string]string{"error": "cid requerido"})
		return
	}
	restored, err := s.Store.LoadCID(body.CID)
	if err != nil || restored == nil {
		writeJSON(w, 404, map[string]string{"error": "salva no encontrada en almacén CID"})
		return
	}
	if restored.Tenant.ID != sess.TenantID && sess.Role != domain.RoleMaster {
		writeJSON(w, 403, map[string]string{"error": "la salva no pertenece a este negocio"})
		return
	}
	// preservar backups e historial de auditoría reciente
	cur := s.Store.Get(sess.TenantID)
	if cur != nil {
		restored.Backups = cur.Backups
		restored.AuditLog = append(cur.AuditLog, domain.AuditEntry{
			ID: uuid.NewString(), TenantID: sess.TenantID, UserID: sess.UserID,
			Action: "backup.restore", Detail: "Restaurado desde " + body.CID, Ref: body.CID,
			CreatedAt: time.Now().UTC(),
		})
	}
	restored.Tenant.ID = sess.TenantID
	_ = s.Store.Put(restored)
	writeJSON(w, 200, map[string]any{"ok": true, "rev": restored.Rev, "root_cid": restored.RootCID})
}

func (s *Server) handleInventoryOut(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, map[string]string{"error": "metodo no permitido"})
		return
	}
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "no autorizado"})
		return
	}
	if err := auth.RequireView(sess, "inventario"); err != nil {
		writeJSON(w, 403, map[string]string{"error": "sin permiso"})
		return
	}
	var body struct {
		ID  string  `json:"id"`
		Qty float64 `json:"qty"`
		Note string `json:"note"`
	}
	if err := readJSON(r, &body); err != nil || body.ID == "" {
		writeJSON(w, 400, map[string]string{"error": "id requerido"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "no encontrado"})
		return
	}
	item := snap.Inventory[body.ID]
	if item == nil {
		writeJSON(w, 404, map[string]string{"error": "producto no encontrado"})
		return
	}
	if body.Qty <= 0 {
		body.Qty = item.Qty
	}
	if body.Qty > item.Qty {
		writeJSON(w, 400, map[string]string{"error": "cantidad mayor que existencia"})
		return
	}
	unitBase := 0.0
	if item.Qty > 0 {
		unitBase = item.AmountBase / item.Qty
	}
	outBase := unitBase * body.Qty
	item.Qty -= body.Qty
	item.Amount = item.Qty * item.Cost
	item.AmountBase = unitBase * item.Qty
	item.UpdatedAt = time.Now().UTC()
	if item.Qty <= 0 {
		item.Active = false
		item.Qty = 0
		item.Amount = 0
		item.AmountBase = 0
	}
	domain.ApplyInventoryOut(snap, outBase)
	mv := domain.InventoryMove{
		ID: uuid.NewString(), TenantID: sess.TenantID, ItemID: item.ID,
		Kind: "out", Qty: body.Qty, AmountBase: outBase, Note: body.Note,
		CreatedBy: sess.UserID, CreatedAt: time.Now().UTC(),
	}
	snap.InvMoves = append(snap.InvMoves, mv)
	invAcc := domain.FindAccountByCode(snap.Accounts, "1300")
	cogs := domain.FindAccountByCode(snap.Accounts, "5000")
	entry := domain.Entry{
		ID: uuid.NewString(), TenantID: sess.TenantID, Date: time.Now().Format("2006-01-02"),
		Type: "inventory", Amount: outBase, Currency: snap.Tenant.Currency,
		Description: "Salida inventario " + item.Name, Ref: item.ID,
		CreatedBy: sess.UserID, CreatedAt: time.Now().UTC(),
	}
	if cogs != nil {
		entry.AccountID = cogs.ID
	}
	if invAcc != nil {
		entry.Counterpart = invAcc.ID
	}
	snap.Entries = append(snap.Entries, entry)
	s.audit(snap, sess, "inventory.out", item.Name+" qty="+formatFloat(body.Qty), item.ID)
	_ = s.Store.Put(snap)
	writeJSON(w, 200, map[string]any{"item": item, "ecuacion": domain.EquationSnapshot(snap), "rev": snap.Rev})
}

// silence unused store import if only types — store used in restore via s.Store.LoadCID
var _ = store.ContentCID


func (s *Server) handleFinancial(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "no autorizado"})
		return
	}
	if err := auth.RequireView(sess, "reportes"); err != nil {
		writeJSON(w, 403, map[string]string{"error": "sin permiso"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "no encontrado"})
		return
	}
	period := r.URL.Query().Get("period") // week|month|quarter|year|all
	kind := r.URL.Query().Get("kind")     // situacion|rendimiento|all
	if period == "" {
		period = "month"
	}
	if kind == "" {
		kind = "all"
	}
	now := time.Now().UTC()
	var from time.Time
	switch period {
	case "week":
		from = now.AddDate(0, 0, -7)
	case "month":
		from = now.AddDate(0, -1, 0)
	case "quarter":
		from = now.AddDate(0, -3, 0)
	case "year":
		from = now.AddDate(-1, 0, 0)
	default:
		from = time.Time{}
	}
	fromStr := ""
	if !from.IsZero() {
		fromStr = from.Format("2006-01-02")
	}
	var ingresos, gastos float64
	type line struct {
		Date        string  `json:"date"`
		Type        string  `json:"type"`
		Description string  `json:"description"`
		Amount      float64 `json:"amount"`
		Currency    string  `json:"currency"`
		UserID      string  `json:"user_id"`
		Username    string  `json:"username"`
		Ref         string  `json:"ref,omitempty"`
	}
	var ops []line
	userName := map[string]string{}
	for _, u := range snap.Users {
		if u != nil {
			userName[u.ID] = u.DisplayName
			if userName[u.ID] == "" {
				userName[u.ID] = u.Username
			}
		}
	}
	for _, e := range snap.Entries {
		if fromStr != "" && e.Date != "" && e.Date < fromStr {
			continue
		}
		cur := e.Currency
		if cur == "" {
			cur = snap.Tenant.Currency
		}
		ops = append(ops, line{
			Date: e.Date, Type: e.Type, Description: e.Description,
			Amount: e.Amount, Currency: cur, UserID: e.CreatedBy,
			Username: userName[e.CreatedBy], Ref: e.Ref,
		})
		if e.Type == "income" {
			ingresos += e.Amount
		} else if e.Type == "expense" || e.Type == "inventory" {
			// inventory out hits COGS as expense-like in rendimiento simplified
			if e.Type == "expense" {
				gastos += e.Amount
			}
		}
	}
	// inventory outs also in gastos via COGS balance change — use expense entries mainly
	eq := domain.EquationSnapshot(snap)
	base := snap.Tenant.Currency
	if base == "" {
		base = "CUP"
	}
	writeJSON(w, 200, map[string]any{
		"period": period, "kind": kind, "base_currency": base,
		"estado_situacion": map[string]any{
			"activo": eq["activo"], "pasivo": eq["pasivo"], "patrimonio": eq["patrimonio"],
			"moneda": base,
		},
		"estado_rendimiento": map[string]any{
			"ingresos": ingresos, "gastos": gastos, "resultado": ingresos - gastos, "moneda": base,
		},
		"operaciones": ops, "ecuacion": eq,
	})
}

func (s *Server) handleTheme(w http.ResponseWriter, r *http.Request) {
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
	if snap.Tenant.Settings == nil {
		snap.Tenant.Settings = map[string]string{}
	}
	switch r.Method {
	case http.MethodGet:
		writeJSON(w, 200, map[string]any{
			"settings": snap.Tenant.Settings,
			"name":     snap.Tenant.Name,
			"title":    snap.Tenant.Settings["app_title"],
		})
	case http.MethodPut, http.MethodPost:
		// master puede todo; admin solo nombre del negocio
		var body map[string]string
		if err := readJSON(r, &body); err != nil {
			writeJSON(w, 400, map[string]string{"error": "json invalido"})
			return
		}
		if sess.Role == domain.RoleMaster {
			for k, v := range body {
				if k == "name" {
					snap.Tenant.Name = v
					continue
				}
				snap.Tenant.Settings[k] = v
			}
		} else if sess.Role == domain.RoleAdmin {
			if n, ok := body["name"]; ok {
				snap.Tenant.Name = n
			}
			if t, ok := body["app_title"]; ok {
				snap.Tenant.Settings["app_title"] = t
			}
		} else {
			writeJSON(w, 403, map[string]string{"error": "sin permiso"})
			return
		}
		s.audit(snap, sess, "theme.update", "personalizacion", "")
		_ = s.Store.Put(snap)
		writeJSON(w, 200, map[string]any{"ok": true, "name": snap.Tenant.Name, "settings": snap.Tenant.Settings})
	default:
		writeJSON(w, 405, map[string]string{"error": "metodo no permitido"})
	}
}

func (s *Server) handleErrors(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "no autorizado"})
		return
	}
	// Solo master ve y registra errores de plataforma
	if sess.Role != domain.RoleMaster {
		writeJSON(w, 403, map[string]string{"error": "solo master"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "no encontrado"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		var errs []domain.AuditEntry
		for _, a := range snap.AuditLog {
			if a.Action == "error" || a.Action == "master.op" {
				errs = append(errs, a)
			}
		}
		// reverse
		for i, j := 0, len(errs)-1; i < j; i, j = i+1, j-1 {
			errs[i], errs[j] = errs[j], errs[i]
		}
		writeJSON(w, 200, map[string]any{"errors": errs})
	case http.MethodPost:
		var body struct {
			Detail string `json:"detail"`
			Ref    string `json:"ref"`
		}
		_ = readJSON(r, &body)
		s.audit(snap, sess, "error", body.Detail, body.Ref)
		_ = s.Store.Put(snap)
		writeJSON(w, 201, map[string]any{"ok": true})
	default:
		writeJSON(w, 405, map[string]string{"error": "metodo no permitido"})
	}
}
