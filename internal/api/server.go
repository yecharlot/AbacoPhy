package api

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/yecharlot/AbacoPhy/internal/auth"
	"github.com/yecharlot/AbacoPhy/internal/domain"
	"github.com/yecharlot/AbacoPhy/internal/pdf"
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
	mux.HandleFunc("/api/v1/auth/password", s.handleChangePassword)

	// Tenant / customización
	mux.HandleFunc("/api/v1/tenant", s.handleTenant)

	// Contabilidad
	mux.HandleFunc("/api/v1/accounts", s.handleAccounts)
	mux.HandleFunc("/api/v1/entries", s.handleEntries)
	mux.HandleFunc("/api/v1/inventory", s.handleInventory)
	mux.HandleFunc("/api/v1/payroll/employees", s.handleEmployees)
	mux.HandleFunc("/api/v1/payroll/payslips", s.handlePayslips)
	mux.HandleFunc("/api/v1/payroll/pdf", s.handlePayrollPDF)
	mux.HandleFunc("/api/v1/master/reset", s.handleMasterReset)
	mux.HandleFunc("/api/v1/invoices", s.handleInvoices)
	mux.HandleFunc("/api/v1/invoices/pdf", s.handleInvoicePDF)

	// Sync offline-first
	mux.HandleFunc("/api/v1/sync", s.handleSync)
	mux.HandleFunc("/api/v1/sync/push", s.handleSyncPush)

	// Master (mantenimiento)
	mux.HandleFunc("/api/v1/master/tenants", s.handleMasterTenants)
	s.registerExtraRoutes(mux)
	mux.HandleFunc("/api/v1/master/tenants/create", s.handleMasterCreateTenant)
	mux.HandleFunc("/api/v1/reports/summary", s.handleReportsSummary)

	// App ANS + PWA + static assets
	mux.HandleFunc("/w/"+s.AppAlias, s.servePWA)
	mux.HandleFunc("/w/"+s.AppAlias+"/", s.servePWA)
	mux.Handle("/sw.js", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
		w.Header().Set("Pragma", "no-cache")
		http.ServeFile(w, r, filepath.Join(s.StaticDir, "app", "sw.js"))
	}))
	mux.Handle("/manifest.webmanifest", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/manifest+json")
		http.ServeFile(w, r, filepath.Join(s.StaticDir, "app", "manifest.webmanifest"))
	}))
	mux.Handle("/icon.svg", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/svg+xml")
		http.ServeFile(w, r, filepath.Join(s.StaticDir, "app", "icon.svg"))
	}))
	mux.HandleFunc("/", s.servePWA)

	s.registerOpsRoutes(mux)
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
	return auth.SessionFromRequest(s.Store, r.Header.Get("Authorization"))
}

// gate: rol + módulos del negocio + módulos del usuario.
func (s *Server) gate(sess *domain.TokenSession, view string) error {
	if sess == nil {
		return auth.ErrUnauthorized
	}
	snap := s.Store.Get(sess.TenantID)
	return auth.RequireAccess(snap, sess, view)
}

func (s *Server) handleInfo(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, map[string]any{
		"name":        "ÁbacoPhy",
		"version":     "0.1.0",
		"app_ans":     s.AppAlias,
		"api":         "REST /api/v1",
		"persistence": []string{"local", "cid", "durable_object_optional"},
		"offline":     true,
		"modules":     []string{"ingresos", "gastos", "inventario", "nomina", "facturacion", "cuentas", "productos", "almacen", "unidades", "recepcion", "vendedor", "fichas_costo"},
		"roles":       []string{domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico, domain.RoleVendedor, domain.RoleAlmacenero, domain.RoleOperador, domain.RoleReadonly},
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
		writeJSON(w, 401, map[string]string{"error": "usuario o contraseña incorrectos"})
		return
	}
	writeJSON(w, 200, map[string]any{
		"token":      tok.Token,
		"expires_at": tok.ExpiresAt,
		"user": map[string]any{
			"id": user.ID, "username": user.Username, "display_name": user.DisplayName,
			"role": user.Role, "tenant_id": user.TenantID,
		},
		"views": viewsForUser(user.Role, s.Store.Get(tok.TenantID), user), "modules": modulesPayload(s.Store.Get(tok.TenantID)), "user_modules": user.Modules,
	})
}


func publicUser(u *domain.User) map[string]any {
	if u == nil {
		return nil
	}
	return map[string]any{
		"id": u.ID, "username": u.Username, "display_name": u.DisplayName,
		"role": u.Role, "tenant_id": u.TenantID, "active": u.Active,
		"modules": u.Modules,
	}
}

func viewsForRole(role string, snap *domain.StoreSnapshot) []string {
	return auth.ViewsForRole(role, snap)
}

func viewsForUser(role string, snap *domain.StoreSnapshot, user *domain.User) []string {
	return auth.ViewsForUser(role, snap, user)
}

func modulesPayload(snap *domain.StoreSnapshot) map[string]bool {
	if snap == nil {
		return domain.DefaultEnabledModules()
	}
	if snap.Tenant.EnabledModules != nil && len(snap.Tenant.EnabledModules) > 0 {
		return snap.Tenant.EnabledModules
	}
	return domain.DefaultEnabledModules()
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
	snap := s.Store.ResolveTenant(sess.TenantID, sess.UserID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "tenant not found"})
		return
	}
	// sanear sesión si el TenantID estaba desfasado
	if sess.TenantID != snap.Tenant.ID {
		sess.TenantID = snap.Tenant.ID
	}
	user := snap.Users[sess.UserID]
	if user == nil {
		// buscar por id en mapa
		for _, u := range snap.Users {
			if u != nil && u.ID == sess.UserID {
				user = u
				break
			}
		}
	}
	umods := map[string]bool(nil)
	if user != nil {
		umods = user.Modules
	}
	writeJSON(w, 200, map[string]any{
		"user": publicUser(user), "tenant": snap.Tenant, "rev": snap.Rev, "root_cid": snap.RootCID,
		"views": viewsForUser(sess.Role, snap, user), "modules": modulesPayload(snap), "user_modules": umods,
	})
}

func (s *Server) handleTenant(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	if err := s.gate(sess, "tenant"); err != nil {
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
		writeJSON(w, 401, map[string]string{"error": "no autorizado"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "no encontrado"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		if err := s.gate(sess, "cuentas"); err != nil {
			if err2 := s.gate(sess, "reportes"); err2 != nil {
				writeJSON(w, 403, map[string]string{"error": "sin permiso"})
				return
			}
		}
		list := make([]*domain.Account, 0, len(snap.Accounts))
		for _, a := range snap.Accounts {
			if a != nil && a.Active {
				list = append(list, a)
			}
		}
		writeJSON(w, 200, map[string]any{"accounts": list, "rev": snap.Rev, "ecuacion": domain.EquationSnapshot(snap)})
	case http.MethodPost:
		if err := s.gate(sess, "cuentas"); err != nil {
			writeJSON(w, 403, map[string]string{"error": "sin permiso"})
			return
		}
		var body domain.Account
		if err := readJSON(r, &body); err != nil || body.Code == "" || body.Name == "" {
			writeJSON(w, 400, map[string]string{"error": "codigo y nombre requeridos"})
			return
		}
		if body.Type == "" {
			body.Type = "asset"
		}
		body.ID = uuid.NewString()
		body.TenantID = sess.TenantID
		body.Active = true
		body.CreatedAt = time.Now().UTC()
		body.UpdatedAt = body.CreatedAt
		snap.Accounts[body.ID] = &body
		s.audit(snap, sess, "account.create", body.Code+" "+body.Name, body.ID)
		_ = s.Store.Put(snap)
		writeJSON(w, 201, body)
	case http.MethodPut, http.MethodPatch:
		if err := s.gate(sess, "cuentas"); err != nil {
			writeJSON(w, 403, map[string]string{"error": "sin permiso"})
			return
		}
		var body domain.Account
		if err := readJSON(r, &body); err != nil || body.ID == "" {
			writeJSON(w, 400, map[string]string{"error": "id requerido"})
			return
		}
		acc := snap.Accounts[body.ID]
		if acc == nil {
			writeJSON(w, 404, map[string]string{"error": "cuenta no encontrada"})
			return
		}
		if body.Code != "" {
			acc.Code = body.Code
		}
		if body.Name != "" {
			acc.Name = body.Name
		}
		if body.Type != "" {
			acc.Type = body.Type
		}
		acc.Nature = body.Nature
		acc.Group = body.Group
		acc.Level = body.Level
		acc.ParentID = body.ParentID
		acc.Notes = body.Notes
		acc.Active = body.Active
		acc.UpdatedAt = time.Now().UTC()
		s.audit(snap, sess, "cuenta.edicion", "Edición nomenclador de cuentas · código "+acc.Code+" · nombre "+acc.Name+" · tipo "+acc.Type+" · naturaleza "+acc.Nature+" · grupo "+acc.Group, acc.ID)
		_ = s.Store.Put(snap)
		writeJSON(w, 200, acc)
	case http.MethodDelete:
		if err := s.gate(sess, "cuentas"); err != nil {
			writeJSON(w, 403, map[string]string{"error": "sin permiso"})
			return
		}
		id := r.URL.Query().Get("id")
		if id == "" {
			writeJSON(w, 400, map[string]string{"error": "id requerido"})
			return
		}
		acc := snap.Accounts[id]
		if acc == nil {
			writeJSON(w, 404, map[string]string{"error": "cuenta no encontrada"})
			return
		}
		acc.Active = false
		acc.UpdatedAt = time.Now().UTC()
		s.audit(snap, sess, "account.delete", acc.Code+" "+acc.Name, id)
		_ = s.Store.Put(snap)
		writeJSON(w, 200, map[string]any{"ok": true})
	default:
		writeJSON(w, 405, map[string]string{"error": "metodo no permitido"})
	}
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
		if err := s.gate(sess, view); err != nil {
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
		if err := s.gate(sess, view); err != nil {
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
		domain.ApplyDoubleEntry(snap, &body)
		snap.Entries = append(snap.Entries, body)
		s.audit(snap, sess, "asiento.registro", "Registro de asiento · tipo "+body.Type+" · importe "+formatFloat(body.Amount)+" "+body.Currency+" · "+body.Description, body.ID)
		_ = s.Store.Put(snap)
		eq := domain.EquationSnapshot(snap)
		writeJSON(w, 201, map[string]any{"asiento": body, "ecuacion": eq, "rev": snap.Rev, "root_cid": snap.RootCID})
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}


func (s *Server) handleInventory(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "no autorizado"})
		return
	}
	if err := s.gate(sess, "inventario"); err != nil {
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
		list := make([]*domain.InventoryItem, 0, len(snap.Inventory))
		for _, it := range snap.Inventory {
			if it != nil && it.Active {
				list = append(list, it)
			}
		}
		writeJSON(w, 200, map[string]any{"items": list, "rev": snap.Rev, "base": snap.Tenant.Currency})
	case http.MethodPost:
		var body domain.InventoryItem
		if err := readJSON(r, &body); err != nil || body.Name == "" {
			writeJSON(w, 400, map[string]string{"error": "nombre requerido"})
			return
		}
		if body.Unit == "" {
			body.Unit = "ud"
		}
		if body.Currency == "" {
			body.Currency = snap.Tenant.Currency
		}
		if body.Qty <= 0 {
			writeJSON(w, 400, map[string]string{"error": "cantidad debe ser mayor que cero"})
			return
		}
		if body.Amount == 0 && body.Qty > 0 {
			body.Amount = body.Qty * body.Cost
		}
		body.AmountBase = domain.ToBase(snap, body.Amount, body.Currency)
		// Promedio ponderado: mismo nombre + unidad + moneda → fusionar
		nameKey := strings.ToLower(strings.TrimSpace(body.Name))
		var existing *domain.InventoryItem
		for _, it := range snap.Inventory {
			if it == nil || !it.Active {
				continue
			}
			if strings.ToLower(strings.TrimSpace(it.Name)) == nameKey &&
				strings.EqualFold(it.Unit, body.Unit) &&
				strings.EqualFold(it.Currency, body.Currency) {
				existing = it
				break
			}
		}
		var itemOut *domain.InventoryItem
		if existing != nil {
			oldQty := existing.Qty
			oldCost := existing.Cost
			newQty := body.Qty
			newCost := body.Cost
			totalQty := oldQty + newQty
			if totalQty > 0 {
				// promedio ponderado del costo unitario
				existing.Cost = (oldQty*oldCost + newQty*newCost) / totalQty
			}
			existing.Qty = totalQty
			existing.Amount = existing.Qty * existing.Cost
			existing.AmountBase = domain.ToBase(snap, existing.Amount, existing.Currency)
			if body.Price > 0 {
				existing.Price = body.Price
			}
			existing.UpdatedAt = time.Now().UTC()
			itemOut = existing
			domain.ApplyInventoryIn(snap, body.AmountBase)
			mv := domain.InventoryMove{
				ID: uuid.NewString(), TenantID: sess.TenantID, ItemID: existing.ID,
				Kind: "in", Qty: body.Qty, Cost: body.Cost, AmountBase: body.AmountBase,
				Note: "promedio ponderado",
				CreatedBy: sess.UserID, CreatedAt: time.Now().UTC(),
			}
			snap.InvMoves = append(snap.InvMoves, mv)
			s.audit(snap, sess, "inventory.in.avg", body.Name+" avg="+formatFloat(existing.Cost), existing.ID)
		} else {
			body.ID = uuid.NewString()
			body.TenantID = sess.TenantID
			body.Active = true
			body.UpdatedAt = time.Now().UTC()
			snap.Inventory[body.ID] = &body
			itemOut = &body
			domain.ApplyInventoryIn(snap, body.AmountBase)
			mv := domain.InventoryMove{
				ID: uuid.NewString(), TenantID: sess.TenantID, ItemID: body.ID,
				Kind: "in", Qty: body.Qty, Cost: body.Cost, AmountBase: body.AmountBase,
				CreatedBy: sess.UserID, CreatedAt: time.Now().UTC(),
			}
			snap.InvMoves = append(snap.InvMoves, mv)
			s.audit(snap, sess, "inventory.in", body.Name+" "+body.Currency, body.ID)
		}
		invAcc := domain.FindAccountByCode(snap.Accounts, "1300")
		cash := domain.FindAccountByCode(snap.Accounts, "1000")
		entry := domain.Entry{
			ID: uuid.NewString(), TenantID: sess.TenantID, Date: time.Now().Format("2006-01-02"),
			Type: "inventory", Amount: body.AmountBase, Currency: snap.Tenant.Currency,
			OrigAmount: body.Amount, OrigCurrency: body.Currency,
			Description: "Entrada inventario " + body.Name, Ref: itemOut.ID,
			CreatedBy: sess.UserID, CreatedAt: time.Now().UTC(),
		}
		if invAcc != nil {
			entry.AccountID = invAcc.ID
		}
		if cash != nil {
			entry.Counterpart = cash.ID
		}
		snap.Entries = append(snap.Entries, entry)
		_ = s.Store.Put(snap)
		writeJSON(w, 201, map[string]any{"item": itemOut, "ecuacion": domain.EquationSnapshot(snap), "rev": snap.Rev, "weighted_avg": existing != nil})
	case http.MethodDelete:
		id := r.URL.Query().Get("id")
		if id == "" {
			writeJSON(w, 400, map[string]string{"error": "id requerido"})
			return
		}
		item := snap.Inventory[id]
		if item == nil {
			writeJSON(w, 404, map[string]string{"error": "producto no encontrado"})
			return
		}
		if item.Qty > 0 && item.AmountBase > 0 {
			domain.ApplyInventoryOut(snap, item.AmountBase)
		}
		item.Active = false
		item.Qty = 0
		item.Amount = 0
		item.AmountBase = 0
		item.UpdatedAt = time.Now().UTC()
		s.audit(snap, sess, "inventory.delete", item.Name, id)
		_ = s.Store.Put(snap)
		writeJSON(w, 200, map[string]any{"ok": true, "ecuacion": domain.EquationSnapshot(snap)})
	default:
		writeJSON(w, 405, map[string]string{"error": "metodo no permitido"})
	}
}

func (s *Server) handleEmployees(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "no autorizado"})
		return
	}
	if err := s.gate(sess, "nomina"); err != nil {
		writeJSON(w, 403, map[string]string{"error": "sin permiso"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "no encontrado"})
		return
	}
	if snap.Employees == nil {
		snap.Employees = map[string]*domain.Employee{}
	}
	switch r.Method {
	case http.MethodGet:
		list := make([]*domain.Employee, 0, len(snap.Employees))
		for _, e := range snap.Employees {
			if e != nil {
				list = append(list, e)
			}
		}
		writeJSON(w, 200, map[string]any{"employees": list, "rates": map[string]float64{
			"vac_rate_default": 0.09, "ss_employer_default": 0.125, "ss_worker_default": 0.05,
		}})
	case http.MethodPost:
		var body domain.Employee
		if err := readJSON(r, &body); err != nil || body.Name == "" {
			writeJSON(w, 400, map[string]string{"error": "nombre del trabajador requerido"})
			return
		}
		body.ID = uuid.NewString()
		body.TenantID = sess.TenantID
		body.Active = true
		body.CreatedAt = time.Now().UTC()
		body.UpdatedAt = body.CreatedAt
		if body.Currency == "" {
			body.Currency = snap.Tenant.Currency
		}
		if body.VacRate <= 0 {
			body.VacRate = 0.09 // 9 % provisión vacaciones
		}
		if body.SSEmployerRate <= 0 {
			body.SSEmployerRate = 0.125
		}
		if body.SSWorkerRate <= 0 {
			body.SSWorkerRate = 0.05
		}
		snap.Employees[body.ID] = &body
		s.audit(snap, sess, "nomina.trabajador.alta", "Alta de trabajador: "+body.Name+" · salario "+formatFloat(body.Salary)+" "+body.Currency+" · vacaciones "+formatFloat(body.VacRate*100)+" % · SS entidad "+formatFloat(body.SSEmployerRate*100)+" %", body.ID)
		_ = s.Store.Put(snap)
		writeJSON(w, 201, map[string]any{"employee": body})
	case http.MethodPut:
		var body domain.Employee
		if err := readJSON(r, &body); err != nil || body.ID == "" {
			writeJSON(w, 400, map[string]string{"error": "id y datos requeridos"})
			return
		}
		ex := snap.Employees[body.ID]
		if ex == nil {
			writeJSON(w, 404, map[string]string{"error": "trabajador no encontrado"})
			return
		}
		if body.Name != "" {
			ex.Name = body.Name
		}
		ex.CI = body.CI
		ex.Role = body.Role
		ex.Department = body.Department
		ex.HireDate = body.HireDate
		if body.Salary > 0 {
			ex.Salary = body.Salary
		}
		if body.Currency != "" {
			ex.Currency = body.Currency
		}
		if body.VacRate > 0 {
			ex.VacRate = body.VacRate
		}
		if body.SSEmployerRate > 0 {
			ex.SSEmployerRate = body.SSEmployerRate
		}
		if body.SSWorkerRate > 0 {
			ex.SSWorkerRate = body.SSWorkerRate
		}
		ex.Certificate = body.Certificate
		ex.CertificateUntil = body.CertificateUntil
		ex.LicenseType = body.LicenseType
		ex.LicenseFrom = body.LicenseFrom
		ex.LicenseTo = body.LicenseTo
		ex.VacationBalance = body.VacationBalance
		ex.Notes = body.Notes
		ex.Active = body.Active
		ex.UpdatedAt = time.Now().UTC()
		s.audit(snap, sess, "nomina.trabajador.edicion", "Edición de trabajador: "+ex.Name+" · campos actualizados por usuario de sesión", ex.ID)
		_ = s.Store.Put(snap)
		writeJSON(w, 200, map[string]any{"employee": ex})
	case http.MethodDelete:
		id := r.URL.Query().Get("id")
		if id == "" {
			writeJSON(w, 400, map[string]string{"error": "id requerido"})
			return
		}
		ex := snap.Employees[id]
		if ex == nil {
			writeJSON(w, 404, map[string]string{"error": "trabajador no encontrado"})
			return
		}
		ex.Active = false
		ex.UpdatedAt = time.Now().UTC()
		s.audit(snap, sess, "nomina.trabajador.baja", "Baja lógica de trabajador: "+ex.Name, id)
		_ = s.Store.Put(snap)
		writeJSON(w, 200, map[string]any{"ok": true})
	default:
		writeJSON(w, 405, map[string]string{"error": "metodo no permitido"})
	}
}

func (s *Server) handlePayslips(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "no autorizado"})
		return
	}
	if err := s.gate(sess, "nomina"); err != nil {
		writeJSON(w, 403, map[string]string{"error": "sin permiso"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "no encontrado"})
		return
	}
	if r.Method == http.MethodGet {
		writeJSON(w, 200, map[string]any{"payslips": snap.Payslips})
		return
	}
	if r.Method == http.MethodPost {
		var body domain.Payslip
		if err := readJSON(r, &body); err != nil || body.EmployeeID == "" {
			writeJSON(w, 400, map[string]string{"error": "trabajador requerido"})
			return
		}
		emp := snap.Employees[body.EmployeeID]
		if emp == nil || !emp.Active {
			writeJSON(w, 404, map[string]string{"error": "trabajador no encontrado o inactivo"})
			return
		}
		if emp.LicenseType != "" && emp.LicenseTo != "" {
			// si está en licencia hasta fecha futura, aún se puede liquidar con notas
		}
		gross := emp.Salary
		if body.Gross > 0 {
			gross = body.Gross
		}
		vacR := emp.VacRate
		if vacR <= 0 {
			vacR = 0.09
		}
		ssER := emp.SSEmployerRate
		if ssER <= 0 {
			ssER = 0.125
		}
		ssWR := emp.SSWorkerRate
		if ssWR <= 0 {
			ssWR = 0.05
		}
		vac := gross * vacR
		ssEmp := gross * ssER
		ssWork := gross * ssWR
		other := body.OtherDeduct
		ded := ssWork + other
		net := gross - ded
		employerCost := gross + ssEmp + vac
		body.ID = uuid.NewString()
		body.TenantID = sess.TenantID
		body.EmployeeName = emp.Name
		body.Gross = gross
		body.VacationProv = vac
		body.SSEmployer = ssEmp
		body.SSWorker = ssWork
		body.OtherDeduct = other
		body.Deductions = ded
		body.Net = net
		body.EmployerCost = employerCost
		if body.Currency == "" {
			body.Currency = emp.Currency
			if body.Currency == "" {
				body.Currency = snap.Tenant.Currency
			}
		}
		if body.Period == "" {
			body.Period = time.Now().Format("2006-01")
		}
		body.Status = "calculated"
		body.CreatedBy = sess.UserID
		body.CreatedAt = time.Now().UTC()
		snap.Payslips = append(snap.Payslips, body)
		// Asientos simplificados: gasto salarios + SS + vacaciones
		base := body.Currency
		_ = base
		s.audit(snap, sess, "nomina.liquidacion",
			"Liquidación de nómina · trabajador "+emp.Name+" · periodo "+body.Period+
				" · bruto "+formatFloat(gross)+" · vacaciones (provisión) "+formatFloat(vac)+
				" · SS entidad "+formatFloat(ssEmp)+" · SS trabajador "+formatFloat(ssWork)+
				" · neto a pagar "+formatFloat(net)+" "+body.Currency, body.ID)
		_ = s.Store.Put(snap)
		writeJSON(w, 201, map[string]any{"payslip": body})
		return
	}
	writeJSON(w, 405, map[string]string{"error": "metodo no permitido"})
}

func (s *Server) handleInvoices(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	if err := s.gate(sess, "facturas"); err != nil {
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
		var asiento *domain.Entry
		if body.Status == "issued" || body.Status == "paid" {
			asiento = domain.PostInvoiceToLedger(snap, &body, sess.UserID)
			if asiento != nil {
				asiento.ID = uuid.NewString()
				asiento.TenantID = sess.TenantID
				asiento.CreatedAt = time.Now().UTC()
				if asiento.Date == "" {
					asiento.Date = time.Now().Format("2006-01-02")
				}
				snap.Entries = append(snap.Entries, *asiento)
			}
		}
		_ = s.Store.Put(snap)
		writeJSON(w, 201, map[string]any{"factura": body, "asiento": asiento, "ecuacion": domain.EquationSnapshot(snap)})
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
	if err := s.gate(sess, "sync"); err != nil {
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
	if err := s.gate(sess, "sync"); err != nil {
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
	if err := s.gate(sess, "master"); err != nil {
		writeJSON(w, 403, map[string]string{"error": "forbidden"})
		return
	}
	writeJSON(w, 200, map[string]any{"tenants": s.Store.ListTenants()})
}


func (s *Server) handleReportsSummary(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	// Inicio del panel: basta dashboard (vendedor/almacenero también ven números)
	if err := s.gate(sess, "dashboard"); err != nil {
		if err2 := s.gate(sess, "reportes"); err2 != nil {
			writeJSON(w, 403, map[string]string{"error": "sin permiso"})
			return
		}
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "not found"})
		return
	}
	var income, expense float64
	for _, e := range snap.Entries {
		if e.Type == "income" {
			income += e.Amount
		} else if e.Type == "expense" {
			expense += e.Amount
		}
	}
	var invValue float64
	for _, it := range snap.Inventory {
		invValue += it.Qty * it.Cost
	}
	var invIssued, invPaid float64
	nInv := 0
	for _, inv := range snap.Invoices {
		nInv++
		if inv.Status == "issued" || inv.Status == "paid" {
			invIssued += inv.Total
		}
		if inv.Status == "paid" {
			invPaid += inv.Total
		}
	}
	eq := domain.EquationSnapshot(snap)
	writeJSON(w, 200, map[string]any{
		"tenant":                snap.Tenant.Name,
		"slug":                  snap.Tenant.Slug,
		"currency":              snap.Tenant.Currency,
		"income_total":          income,
		"expense_total":         expense,
		"net":                   income - expense,
		// Claves alineadas con el frontend (Equation / StatCard)
		"ingresos":              income,
		"gastos":                expense,
		"neto":                  income - expense,
		"income":                income,
		"expenses":              expense,
		"net_profit":            income - expense,
		"activo":                eq["activo"],
		"pasivo":                eq["pasivo"],
		"patrimonio":            eq["patrimonio"],
		"assets":                eq["activo"],
		"liabilities":           eq["pasivo"],
		"equity":                eq["patrimonio"],
		"ecuacion":              eq,
		"inventory_items":       len(snap.Inventory),
		"inventory_cost_value":  invValue,
		"invoices_count":        nInv,
		"invoices_issued_total": invIssued,
		"invoices_paid_total":   invPaid,
		"employees":             len(snap.Employees),
		"rev":                   snap.Rev,
		"root_cid":              snap.RootCID,
	})
}

func (s *Server) handleMasterCreateTenant(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		return
	}
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	if err := s.gate(sess, "master"); err != nil {
		writeJSON(w, 403, map[string]string{"error": "forbidden"})
		return
	}
	var body struct {
		Name      string `json:"name"`
		Slug      string `json:"slug"`
		Currency  string `json:"currency"`
		AdminUser string `json:"admin_user"`
		AdminPass string `json:"admin_pass"`
	}
	if err := readJSON(r, &body); err != nil || body.Name == "" {
		writeJSON(w, 400, map[string]string{"error": "name required"})
		return
	}
	if body.Slug == "" {
		body.Slug = strings.ToLower(strings.ReplaceAll(body.Name, " ", "-"))
	}
	if body.Currency == "" {
		body.Currency = "CUP"
	}
	if body.AdminUser == "" {
		body.AdminUser = "admin"
	}
	if body.AdminPass == "" {
		body.AdminPass = "admin123"
	}
	for _, t := range s.Store.ListTenants() {
		if strings.EqualFold(t.Slug, body.Slug) {
			writeJSON(w, 409, map[string]string{"error": "slug exists"})
			return
		}
	}
	snap := domain.BootstrapTenant(body.Name, body.Slug, body.Currency)
	hash, err := auth.HashPassword(body.AdminPass)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": "hash failed"})
		return
	}
	for _, u := range snap.Users {
		if u.Username == "admin" {
			u.Username = body.AdminUser
			u.PasswordHash = hash
		}
		if u.Role == domain.RoleMaster {
			u.PasswordHash = hash
			u.Role = domain.RoleAdmin
			u.Username = body.AdminUser + "-owner"
			u.DisplayName = "Owner"
		}
	}
	if err := s.Store.Put(snap); err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 201, map[string]any{"tenant": snap.Tenant, "admin_user": body.AdminUser})
}


func (s *Server) handleInvoicePDF(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "no autorizado"})
		return
	}
	if err := s.gate(sess, "facturas"); err != nil {
		writeJSON(w, 403, map[string]string{"error": "sin permiso"})
		return
	}
	id := r.URL.Query().Get("id")
	if id == "" {
		writeJSON(w, 400, map[string]string{"error": "falta id de factura"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "negocio no encontrado"})
		return
	}
	var inv *domain.Invoice
	for i := range snap.Invoices {
		if snap.Invoices[i].ID == id {
			inv = &snap.Invoices[i]
			break
		}
	}
	if inv == nil {
		writeJSON(w, 404, map[string]string{"error": "factura no encontrada"})
		return
	}
	data := pdf.InvoicePDF(snap.Tenant, *inv)
	filename := "factura-" + inv.Number + ".pdf"
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", "attachment; filename=\""+filename+"\"")
	w.WriteHeader(200)
	_, _ = w.Write(data)
}

func (s *Server) servePWA(w http.ResponseWriter, r *http.Request) {
	// Preferir static/app/index.html
	path := filepath.Join(s.StaticDir, "app", "index.html")
	if _, err := os.Stat(path); err == nil {
		w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
		w.Header().Set("Pragma", "no-cache")
		http.ServeFile(w, r, path)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(`<!DOCTYPE html><html><body><h1>ÁbacoPhy</h1><p>PWA no embebida. Coloca static/app/index.html</p></body></html>`))
}

// EnsureBootstrap crea tenant + master si no hay datos.
// Si ya hay tenants pero las claves están vacías (bug json:"-" antiguo), las repara.
func EnsureBootstrap(st *store.Store) error {
	tenants := st.ListTenants()
	if len(tenants) == 0 {
		snap := domain.BootstrapTenant("Negocio Demo ÁbacoPhy", "demo", "CUP")
		hash, err := auth.HashPassword("AbacoPhy#Master1")
		if err != nil {
			return err
		}
		ah, err := auth.HashPassword("admin123")
		if err != nil {
			return err
		}
		for _, u := range snap.Users {
			if u.Username == "admin" {
				u.PasswordHash = ah
			} else {
				u.PasswordHash = hash
			}
		}
		return st.Put(snap)
	}
	// Reparar hashes vacíos en tenants existentes
	for _, t := range tenants {
		snap := st.Get(t.ID)
		if snap == nil {
			continue
		}
		changed := false
		for _, u := range snap.Users {
			if u == nil {
				continue
			}
			if u.TenantID != snap.Tenant.ID && snap.Tenant.ID != "" {
				u.TenantID = snap.Tenant.ID
				changed = true
			}
			if u.PasswordHash != "" {
				continue
			}
			var pw string
			switch u.Username {
			case "master":
				pw = "AbacoPhy#Master1"
			case "admin":
				pw = "admin123"
			default:
				pw = "cambiar123"
			}
			h, err := auth.HashPassword(pw)
			if err != nil {
				return err
			}
			u.PasswordHash = h
			changed = true
		}
		if snap.Tenant.EnabledModules == nil || len(snap.Tenant.EnabledModules) == 0 {
			snap.Tenant.EnabledModules = domain.DefaultEnabledModules()
			changed = true
		} else {
			// Completar claves faltantes (mapas antiguos incompletos no deben bloquear módulos)
			def := domain.DefaultEnabledModules()
			for k, v := range def {
				if _, ok := snap.Tenant.EnabledModules[k]; !ok {
					snap.Tenant.EnabledModules[k] = v
					changed = true
				}
			}
		}
		if snap.MeasureUnits == nil || len(snap.MeasureUnits) == 0 {
			snap.MeasureUnits = domain.DefaultMeasureUnits(snap.Tenant.ID)
			changed = true
		}
		for _, u := range snap.Users {
			if u != nil && u.Modules == nil {
				u.Modules = auth.DefaultModulesForRole(u.Role)
				changed = true
			}
		}
		if snap.PriceSheets == nil {
			snap.PriceSheets = map[string]*domain.PriceSheet{}
			changed = true
		}
		if changed {
			if err := st.Put(snap); err != nil {
				return err
			}
		}
	}
	return nil
}

// Note: static assets are also served from main via FileServer fallback if needed.
