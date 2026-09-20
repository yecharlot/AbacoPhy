package api

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"github.com/yecharlot/AbacoPhy/internal/auth"
	"github.com/yecharlot/AbacoPhy/internal/domain"
	"github.com/yecharlot/AbacoPhy/internal/store"
)

type Server struct {
	Store    *store.Store
	StaticDir string
	AppAlias  string // abacophy.app.ans
}

func NewServer(st *store.Store, staticDir string) *Server {
	return &Server{Store: st, StaticDir: staticDir, AppAlias: "abacophy.app.ans"}
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()

	// Health / meta
	mux.HandleFunc("/api/v1/info", s.handleInfo)
	mux.HandleFunc("/api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, map[string]any{"ok": true, "app": "ÁbacoPhy", "ts": time.Now().UTC()})
	})

	// Auth
	mux.HandleFunc("/api/v1/auth/login", s.handleLogin)
	mux.HandleFunc("/api/v1/auth/logout", s.handleLogout)
	mux.HandleFunc("/api/v1/auth/me", s.handleMe)

	// Tenant / customización
	mux.HandleFunc("/api/v1/tenant", s.handleTenant)

	// Contabilidad
	mux.HandleFunc("/api/v1/accounts", s.handleAccounts)
	mux.HandleFunc("/api/v1/entries", s.handleEntries)
	mux.HandleFunc("/api/v1/inventory", s.handleInventory)
	mux.HandleFunc("/api/v1/payroll/employees", s.handleEmployees)
	mux.HandleFunc("/api/v1/payroll/payslips", s.handlePayslips)
	mux.HandleFunc("/api/v1/invoices", s.handleInvoices)

	// Sync offline-first
	mux.HandleFunc("/api/v1/sync", s.handleSync)
	mux.HandleFunc("/api/v1/sync/push", s.handleSyncPush)

	// Master (mantenimiento)
	mux.HandleFunc("/api/v1/master/tenants", s.handleMasterTenants)

	// App ANS + PWA + static assets
	mux.HandleFunc("/w/"+s.AppAlias, s.servePWA)
	mux.HandleFunc("/w/"+s.AppAlias+"/", s.servePWA)
	mux.Handle("/sw.js", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join(s.StaticDir, "app", "sw.js"))
	}))
	mux.Handle("/manifest.webmanifest", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/manifest+json")
		http.ServeFile(w, r, filepath.Join(s.StaticDir, "app", "manifest.webmanifest"))
	}))
	mux.HandleFunc("/", s.servePWA)

	return withCORS(mux)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-AbacoPhy-Client, X-Offline-Rev")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(204)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func readJSON(r *http.Request, dst any) error {
	defer r.Body.Close()
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(dst)
}

func (s *Server) sess(r *http.Request) (*domain.TokenSession, error) {
	return auth.SessionFromHeader(s.Store, r.Header.Get("Authorization"))
}

func (s *Server) handleInfo(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, map[string]any{
		"name":        "ÁbacoPhy",
		"version":     "0.1.0",
		"app_ans":     s.AppAlias,
		"api":         "REST /api/v1",
		"persistence": []string{"local", "cid", "durable_object_optional"},
		"offline":     true,
		"modules":     []string{"ingresos", "gastos", "inventario", "nomina", "facturacion", "cuentas"},
		"roles":       []string{domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleOperador, domain.RoleReadonly},
	})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		return
	}
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := readJSON(r, &body); err != nil {
		writeJSON(w, 400, map[string]string{"error": "bad json"})
		return
	}
	tok, user, err := auth.Login(s.Store, body.Username, body.Password)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "credenciales inválidas"})
		return
	}
	writeJSON(w, 200, map[string]any{
		"token":      tok.Token,
		"expires_at": tok.ExpiresAt,
		"user": map[string]any{
			"id": user.ID, "username": user.Username, "display_name": user.DisplayName,
			"role": user.Role, "tenant_id": user.TenantID,
		},
		"views": viewsForRole(user.Role),
	})
}

func viewsForRole(role string) []string {
	var out []string
	for view := range auth.ViewACL {
		if auth.Can(role, view) {
			out = append(out, view)
		}
	}
	return out
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err == nil {
		s.Store.RevokeToken(sess.Token)
	}
	writeJSON(w, 200, map[string]bool{"ok": true})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
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
	user := snap.Users[sess.UserID]
	writeJSON(w, 200, map[string]any{
		"user": user, "tenant": snap.Tenant, "rev": snap.Rev, "root_cid": snap.RootCID,
		"views": viewsForRole(sess.Role),
	})
}

func (s *Server) handleTenant(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	if err := auth.RequireView(sess, "tenant"); err != nil {
		writeJSON(w, 403, map[string]string{"error": "forbidden"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "not found"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		writeJSON(w, 200, snap.Tenant)
	case http.MethodPut, http.MethodPatch:
		var patch domain.Tenant
		if err := readJSON(r, &patch); err != nil {
			writeJSON(w, 400, map[string]string{"error": "bad json"})
			return
		}
		t := snap.Tenant
		if patch.Name != "" {
			t.Name = patch.Name
		}
		if patch.TradeName != "" {
			t.TradeName = patch.TradeName
		}
		if patch.TaxID != "" {
			t.TaxID = patch.TaxID
		}
		if patch.Currency != "" {
			t.Currency = patch.Currency
		}
		if patch.Address != "" {
			t.Address = patch.Address
		}
		if patch.Phone != "" {
			t.Phone = patch.Phone
		}
		if patch.Email != "" {
			t.Email = patch.Email
		}
		if patch.Settings != nil {
			if t.Settings == nil {
				t.Settings = map[string]string{}
			}
			for k, v := range patch.Settings {
				t.Settings[k] = v
			}
		}
		t.UpdatedAt = time.Now().UTC()
		snap.Tenant = t
		_ = s.Store.Put(snap)
		writeJSON(w, 200, t)
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

func (s *Server) handleAccounts(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	if err := auth.RequireView(sess, "cuentas"); err != nil && r.Method != http.MethodGet {
		writeJSON(w, 403, map[string]string{"error": "forbidden"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "not found"})
		return
	}
	if r.Method == http.MethodGet {
		list := make([]*domain.Account, 0, len(snap.Accounts))
		for _, a := range snap.Accounts {
			list = append(list, a)
		}
		writeJSON(w, 200, map[string]any{"accounts": list, "rev": snap.Rev})
		return
	}
	writeJSON(w, 405, map[string]string{"error": "method not allowed"})
}

func (s *Server) handleEntries(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "not found"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		view := "reportes"
		if err := auth.RequireView(sess, view); err != nil {
			writeJSON(w, 403, map[string]string{"error": "forbidden"})
			return
		}
		writeJSON(w, 200, map[string]any{"entries": snap.Entries, "rev": snap.Rev, "root_cid": snap.RootCID})
	case http.MethodPost:
		var body domain.Entry
		if err := readJSON(r, &body); err != nil {
			writeJSON(w, 400, map[string]string{"error": "bad json"})
			return
		}
		view := "ingresos"
		if body.Type == "expense" {
			view = "gastos"
		}
		if err := auth.RequireView(sess, view); err != nil {
			writeJSON(w, 403, map[string]string{"error": "forbidden"})
			return
		}
		body.ID = uuid.NewString()
		body.TenantID = sess.TenantID
		body.CreatedBy = sess.UserID
		body.CreatedAt = time.Now().UTC()
		if body.Currency == "" {
			body.Currency = snap.Tenant.Currency
		}
		if body.Date == "" {
			body.Date = time.Now().Format("2006-01-02")
		}
		snap.Entries = append(snap.Entries, body)
		if acc, ok := snap.Accounts[body.AccountID]; ok {
			if body.Type == "income" {
				acc.Balance += body.Amount
			} else if body.Type == "expense" {
				acc.Balance -= body.Amount
			}
		}
		_ = s.Store.Put(snap)
		writeJSON(w, 201, body)
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

func (s *Server) handleInventory(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	if err := auth.RequireView(sess, "inventario"); err != nil {
		writeJSON(w, 403, map[string]string{"error": "forbidden"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "not found"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		list := make([]*domain.InventoryItem, 0, len(snap.Inventory))
		for _, it := range snap.Inventory {
			list = append(list, it)
		}
		writeJSON(w, 200, map[string]any{"items": list, "rev": snap.Rev})
	case http.MethodPost:
		var body domain.InventoryItem
		if err := readJSON(r, &body); err != nil {
			writeJSON(w, 400, map[string]string{"error": "bad json"})
			return
		}
		body.ID = uuid.NewString()
		body.TenantID = sess.TenantID
		body.Active = true
		body.UpdatedAt = time.Now().UTC()
		if body.Unit == "" {
			body.Unit = "ud"
		}
		snap.Inventory[body.ID] = &body
		_ = s.Store.Put(snap)
		writeJSON(w, 201, body)
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

func (s *Server) handleEmployees(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	if err := auth.RequireView(sess, "nomina"); err != nil {
		writeJSON(w, 403, map[string]string{"error": "forbidden"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "not found"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		list := make([]*domain.Employee, 0, len(snap.Employees))
		for _, e := range snap.Employees {
			list = append(list, e)
		}
		writeJSON(w, 200, map[string]any{"employees": list})
	case http.MethodPost:
		var body domain.Employee
		if err := readJSON(r, &body); err != nil {
			writeJSON(w, 400, map[string]string{"error": "bad json"})
			return
		}
		body.ID = uuid.NewString()
		body.TenantID = sess.TenantID
		body.Active = true
		body.CreatedAt = time.Now().UTC()
		if body.Currency == "" {
			body.Currency = snap.Tenant.Currency
		}
		snap.Employees[body.ID] = &body
		_ = s.Store.Put(snap)
		writeJSON(w, 201, body)
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

func (s *Server) handlePayslips(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	if err := auth.RequireView(sess, "nomina"); err != nil {
		writeJSON(w, 403, map[string]string{"error": "forbidden"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "not found"})
		return
	}
	if r.Method == http.MethodGet {
		writeJSON(w, 200, map[string]any{"payslips": snap.Payslips})
		return
	}
	if r.Method == http.MethodPost {
		var body domain.Payslip
		if err := readJSON(r, &body); err != nil {
			writeJSON(w, 400, map[string]string{"error": "bad json"})
			return
		}
		body.ID = uuid.NewString()
		body.TenantID = sess.TenantID
		body.CreatedAt = time.Now().UTC()
		body.Net = body.Gross - body.Deductions
		if body.Currency == "" {
			body.Currency = snap.Tenant.Currency
		}
		if body.Status == "" {
			body.Status = "draft"
		}
		snap.Payslips = append(snap.Payslips, body)
		_ = s.Store.Put(snap)
		writeJSON(w, 201, body)
		return
	}
	writeJSON(w, 405, map[string]string{"error": "method not allowed"})
}

func (s *Server) handleInvoices(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	if err := auth.RequireView(sess, "facturas"); err != nil {
		writeJSON(w, 403, map[string]string{"error": "forbidden"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "not found"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		writeJSON(w, 200, map[string]any{"invoices": snap.Invoices, "rev": snap.Rev})
	case http.MethodPost:
		var body domain.Invoice
		if err := readJSON(r, &body); err != nil {
			writeJSON(w, 400, map[string]string{"error": "bad json"})
			return
		}
		body.ID = uuid.NewString()
		body.TenantID = sess.TenantID
		body.CreatedBy = sess.UserID
		body.CreatedAt = time.Now().UTC()
		if body.Currency == "" {
			body.Currency = snap.Tenant.Currency
		}
		if body.Status == "" {
			body.Status = "draft"
		}
		var sub float64
		for i := range body.Lines {
			body.Lines[i].Amount = body.Lines[i].Qty * body.Lines[i].UnitPrice
			sub += body.Lines[i].Amount
		}
		body.Subtotal = sub
		body.Total = sub + body.Tax
		if body.Number == "" {
			body.Number = "F-" + time.Now().Format("20060102") + "-" + body.ID[:8]
		}
		raw, _ := json.Marshal(body)
		body.CID = store.ContentCID(raw)
		snap.Invoices = append(snap.Invoices, body)
		_ = s.Store.Put(snap)
		writeJSON(w, 201, body)
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

func (s *Server) handleSync(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	if err := auth.RequireView(sess, "sync"); err != nil {
		writeJSON(w, 403, map[string]string{"error": "forbidden"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "not found"})
		return
	}
	// Pull completo del tenant (cliente offline aplica delta por rev)
	writeJSON(w, 200, map[string]any{
		"rev": snap.Rev, "root_cid": snap.RootCID, "snapshot": snap, "server_time": time.Now().UTC(),
	})
}

func (s *Server) handleSyncPush(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		return
	}
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	if err := auth.RequireView(sess, "sync"); err != nil {
		writeJSON(w, 403, map[string]string{"error": "forbidden"})
		return
	}
	var body struct {
		Entries   []domain.Entry         `json:"entries"`
		Invoices  []domain.Invoice       `json:"invoices"`
		Inventory []domain.InventoryItem `json:"inventory"`
		ClientRev int64                  `json:"client_rev"`
	}
	if err := readJSON(r, &body); err != nil {
		writeJSON(w, 400, map[string]string{"error": "bad json"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "not found"})
		return
	}
	for _, e := range body.Entries {
		e.ID = uuid.NewString()
		e.TenantID = sess.TenantID
		e.CreatedBy = sess.UserID
		e.CreatedAt = time.Now().UTC()
		snap.Entries = append(snap.Entries, e)
	}
	for _, inv := range body.Invoices {
		inv.ID = uuid.NewString()
		inv.TenantID = sess.TenantID
		inv.CreatedBy = sess.UserID
		inv.CreatedAt = time.Now().UTC()
		snap.Invoices = append(snap.Invoices, inv)
	}
	for _, it := range body.Inventory {
		if it.ID == "" {
			it.ID = uuid.NewString()
		}
		it.TenantID = sess.TenantID
		it.UpdatedAt = time.Now().UTC()
		cp := it
		snap.Inventory[it.ID] = &cp
	}
	_ = s.Store.Put(snap)
	writeJSON(w, 200, map[string]any{"ok": true, "rev": snap.Rev, "root_cid": snap.RootCID})
}

func (s *Server) handleMasterTenants(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	if err := auth.RequireView(sess, "master"); err != nil {
		writeJSON(w, 403, map[string]string{"error": "forbidden"})
		return
	}
	writeJSON(w, 200, map[string]any{"tenants": s.Store.ListTenants()})
}

func (s *Server) servePWA(w http.ResponseWriter, r *http.Request) {
	// Preferir static/app/index.html
	path := filepath.Join(s.StaticDir, "app", "index.html")
	if _, err := os.Stat(path); err == nil {
		w.Header().Set("Cache-Control", "no-cache")
		http.ServeFile(w, r, path)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(`<!DOCTYPE html><html><body><h1>ÁbacoPhy</h1><p>PWA no embebida. Coloca static/app/index.html</p></body></html>`))
}

// EnsureBootstrap crea tenant + master si no hay datos.
func EnsureBootstrap(st *store.Store) error {
	if len(st.ListTenants()) > 0 {
		return nil
	}
	snap := domain.BootstrapTenant("Negocio Demo ÁbacoPhy", "demo", "CUP")
	hash, err := auth.HashPassword("AbacoPhy#Master1")
	if err != nil {
		return err
	}
	for _, u := range snap.Users {
		u.PasswordHash = hash
		if u.Username == "admin" {
			ah, _ := auth.HashPassword("admin123")
			u.PasswordHash = ah
		}
	}
	return st.Put(snap)
}

// Note: static assets are also served from main via FileServer fallback if needed.
