package api

import (
	"crypto/rand"
	"errors"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"mime"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/yecharlot/AbacoPhy/internal/auth"
	"github.com/yecharlot/AbacoPhy/internal/domain"
	"github.com/yecharlot/AbacoPhy/internal/pdf"
	"github.com/yecharlot/AbacoPhy/internal/presence"
	"github.com/yecharlot/AbacoPhy/internal/store"
)

type Server struct {
	Store        *store.Store
	StaticDir    string
	AppAlias     string // abacophy.app.ans
	Hub          *EventHub
	Presence     *presence.Registry
	loginLimiter *loginAttemptLimiter
}

func NewServer(st *store.Store, staticDir string) *Server {
	return &Server{Store: st, StaticDir: staticDir, AppAlias: "abacophy.app.ans", Hub: NewEventHub(), Presence: presence.NewRegistry(), loginLimiter: newLoginAttemptLimiter()}
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()

	// Health / meta
	mux.HandleFunc("/api/v1/info", s.handleInfo)
	mux.HandleFunc("/api/v1/events", s.handleEvents)
	mux.HandleFunc("/api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		n := 0
		if s.Presence != nil {
			n = s.Presence.CountOnline(time.Now().UTC())
		}
		writeJSON(w, 200, map[string]any{
			"ok": true, "app": "ÁbacoPhy", "ts": time.Now().UTC(),
			"online_clients": n,
		})
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
	// Built webapp twin assets (static/assets from web/dist)
	mux.Handle("/assets/", http.StripPrefix("/assets/", http.FileServer(http.Dir(filepath.Join(s.StaticDir, "assets")))))
	mux.HandleFunc("/abacus_color_icon.svg", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/svg+xml")
		http.ServeFile(w, r, filepath.Join(s.StaticDir, "abacus_color_icon.svg"))
	})
	mux.HandleFunc("/favicon.svg", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/svg+xml")
		http.ServeFile(w, r, filepath.Join(s.StaticDir, "favicon.svg"))
	})
	mux.HandleFunc("/", s.servePWA)

	s.registerOpsRoutes(mux)
	mux.HandleFunc("/api/v1/presence", s.handlePresence)
	return withPresence(s, withCORS(s.requireInitialPasswordChange(mux), corsRulesFromEnv()))
}


func withPresence(s *Server, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodOptions && s != nil && s.Presence != nil && presence.ShouldTrackPath(r.URL.Path) {
			uid, uname, tenantID := "", "", ""
			hasSess := false
			if sess, err := s.sess(r); err == nil && sess != nil {
				hasSess = true
				uid = sess.UserID
				tenantID = sess.TenantID
				if tenantSnap := s.Store.Get(sess.TenantID); tenantSnap != nil {
					if u := tenantSnap.Users[sess.UserID]; u != nil {
						uname = u.Username
					}
				}
			}
			snap := presence.SnapshotFromRequest(r, tenantID, uid, uname, hasSess)
			res := s.Presence.Touch(snap)
			if res.Created {
				log.Printf("presence: +NUEVO id=%s platform=%s ip=%s path=%s session=%v user=%s | %s",
					snap.InstanceID, snap.Platform, snap.RemoteIP, snap.LastPath, hasSess, uname,
					s.Presence.SummaryLine(time.Now().UTC()))
			} else if res.SessionAttached {
				log.Printf("presence: +SESIÓN id=%s user=%s ip=%s | %s",
					snap.InstanceID, uname, snap.RemoteIP,
					s.Presence.SummaryLine(time.Now().UTC()))
			}
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

// gate: lectura — rol + módulos del negocio + grants del usuario.
func (s *Server) gate(sess *domain.TokenSession, view string) error {
	if sess == nil {
		return auth.ErrUnauthorized
	}
	snap := s.Store.Get(sess.TenantID)
	return auth.RequireAccess(snap, sess, view)
}

// gateWrite: mutación (POST/PUT/PATCH/DELETE) — permisos reales de escritura.
// RoleReadonly y usuarios sin grant del módulo reciben 403.
func (s *Server) gateWrite(sess *domain.TokenSession, view string) error {
	if sess == nil {
		return auth.ErrUnauthorized
	}
	snap := s.Store.Get(sess.TenantID)
	return auth.RequireMutate(snap, sess, view)
}

// writeGateError responde 401/403 con mensaje accionable.
func writeGateError(w http.ResponseWriter, err error) {
	if err == auth.ErrUnauthorized {
		writeJSON(w, 401, map[string]string{"error": "no autorizado", "code": "unauthorized"})
		return
	}
	writeJSON(w, 403, map[string]string{
		"error": "sin permiso para esta operación",
		"code":  "forbidden",
	})
}

// gateOp: GET/HEAD → gate (lectura); resto de métodos → gateWrite (mutación).
func (s *Server) gateOp(sess *domain.TokenSession, view, method string) error {
	switch method {
	case http.MethodGet, http.MethodHead, http.MethodOptions:
		return s.gate(sess, view)
	default:
		return s.gateWrite(sess, view)
	}
}

func (s *Server) handleInfo(w http.ResponseWriter, r *http.Request) {
	n := 0
	if s.Presence != nil {
		n = s.Presence.CountOnline(time.Now().UTC())
	}
	writeJSON(w, 200, map[string]any{
		"name":        "ÁbacoPhy",
		"version":     "0.1.0",
		"app_ans":     s.AppAlias,
		"api":         "REST /api/v1",
		"persistence": []string{"local", "cid", "durable_object_optional"},
		"offline":     true,
		"online_clients": n,
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
	clientIP := remoteIPFromRequest(r)
	if s.loginLimiter == nil {
		s.loginLimiter = newLoginAttemptLimiter()
	}
	if retryAfter := s.loginLimiter.retryAfter(clientIP, body.Username, time.Now()); retryAfter > 0 {
		w.Header().Set("Cache-Control", "no-store")
		writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": "demasiados intentos; inténtelo más tarde", "code": "login_rate_limited"})
		return
	}

	tok, user, err := auth.Login(s.Store, body.Username, body.Password)
	if err != nil {
		s.loginLimiter.recordFailure(clientIP, body.Username, time.Now())
		w.Header().Set("Cache-Control", "no-store")
		log.Printf("EVENT=auth.login_failed ip=%s username_tag=%s reason=invalid_credentials", clientIP, loginUsernameTag(body.Username))
		writeJSON(w, 401, map[string]string{"error": "usuario o contraseña incorrectos"})
		return
	}
	s.loginLimiter.recordSuccess(body.Username)
	clientID := r.Header.Get(presence.HeaderClientID)
	platform := r.Header.Get(presence.HeaderClientApp)
	ip := presence.ClientIP(r)
	if s.Presence != nil {
		s.Presence.AttachSession(clientID, ip, tok.TenantID, user.ID, user.Username)
		s.Presence.Touch(presence.SnapshotFromRequest(r, tok.TenantID, user.ID, user.Username, true))
	}
	snap := s.Store.Get(tok.TenantID)
	if snap != nil {
		detail := "Inicio de sesión «" + user.Username + "» · rol " + user.Role
		if clientID != "" {
			detail += " · client=" + clientID
		} else {
			detail += " · client=sin-id"
		}
		if platform != "" {
			detail += " · app=" + platform
		}
		detail += " · ip=" + ip
		s.audit(snap, tok, "auth.login", detail, user.ID)
		_ = s.Store.Put(snap)
	}
	if s.Presence != nil {
		log.Printf("auth.login user=%s role=%s client=%s app=%s ip=%s | %s",
			user.Username, user.Role, clientID, platform, ip, s.Presence.SummaryLine(time.Now().UTC()))
	} else {
		log.Printf("auth.login user=%s role=%s client=%s app=%s ip=%s", user.Username, user.Role, clientID, platform, ip)
	}
	writeJSON(w, 200, map[string]any{
		"token":      tok.Token,
		"expires_at": tok.ExpiresAt,
		"user":       publicUser(snap, user),
		"views":      viewsForUser(user.Role, snap, user),
		"modules":    modulesPayload(snap),
		"user_modules": user.Modules,
	})
}


func publicUser(snap *domain.StoreSnapshot, u *domain.User) map[string]any {
	if u == nil {
		return nil
	}
	return map[string]any{
		"id": u.ID, "username": u.Username, "display_name": u.DisplayName,
		"role": u.Role, "tenant_id": u.TenantID, "active": u.Active,
		"modules": u.Modules,
		"must_change_password": u.MustChangePassword,
		// La relación operativo-laboral se guarda en Employee.metadata.
		// Se proyecta aquí como metadata de sesión para que los clientes
		// autenticados puedan resolver su PDV sin acceder a /payroll/employees.
		"metadata": resolvedUserMetadata(snap, u),
	}
}

func resolvedUserMetadata(snap *domain.StoreSnapshot, u *domain.User) string {
	if u == nil {
		return ""
	}
	meta := map[string]any{}
	for k, v := range u.Metadata {
		meta[k] = v
	}
	// La asignación de PDV tiene como fuente de verdad a Employee.metadata,
	// no a User.metadata. Nunca conservamos aquí un unitIds potencialmente
	// obsoleto del usuario.
	delete(meta, "unitIds")

	if snap != nil {
		for _, employee := range snap.Employees {
			if employee == nil {
				continue
			}
			userID, ok := employee.Metadata["userId"].(string)
			if !ok || userID != u.ID {
				continue
			}
			if unitIDs, ok := employee.Metadata["unitIds"]; ok {
				meta["unitIds"] = unitIDs
			}
			break
		}
	}

	if len(meta) == 0 {
		return ""
	}
	encoded, err := json.Marshal(meta)
	if err != nil {
		return ""
	}
	return string(encoded)
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
		snap := s.Store.Get(sess.TenantID)
		if snap != nil {
			s.audit(snap, sess, "auth.logout", "Cierre de sesión", sess.UserID)
			_ = s.Store.Put(snap)
		}
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
	// La sesión ya fue validada contra el tenant y el usuario exactos.
	// No reparar el tenant ni buscar usuarios fuera de la clave canónica.
	user := snap.Users[sess.UserID]
	if user == nil || user.ID != sess.UserID || user.TenantID != sess.TenantID || user.Role != sess.Role {
		writeJSON(w, 401, map[string]string{"error": "session identity mismatch"})
		return
	}
	umods := map[string]bool(nil)
	if user != nil {
		umods = user.Modules
	}
	writeJSON(w, 200, map[string]any{
		"user": publicUser(snap, user), "tenant": snap.Tenant, "rev": snap.Rev, "root_cid": snap.RootCID,
		"views": viewsForUser(sess.Role, snap, user), "modules": modulesPayload(snap), "user_modules": umods,
	})
}

func (s *Server) handleTenant(w http.ResponseWriter, r *http.Request) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	if err := s.gateOp(sess, "tenant", r.Method); err != nil {
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
		if err := s.gateOp(sess, "cuentas", r.Method); err != nil {
			if err2 := s.gateOp(sess, "reportes", r.Method); err2 != nil {
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
		if err := s.gateOp(sess, "cuentas", r.Method); err != nil {
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
		if body.ParentID != "" && snap.Accounts[body.ParentID] == nil {
			writeJSON(w, 400, map[string]string{"error": "cuenta padre no pertenece a este negocio"})
			return
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
		if err := s.gateOp(sess, "cuentas", r.Method); err != nil {
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
		if body.ParentID != "" && (body.ParentID == body.ID || snap.Accounts[body.ParentID] == nil) {
			writeJSON(w, 400, map[string]string{"error": "cuenta padre no válida para este negocio"})
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
		if err := s.gateOp(sess, "cuentas", r.Method); err != nil {
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
		entryType := strings.TrimSpace(r.URL.Query().Get("type"))
		from := strings.TrimSpace(r.URL.Query().Get("from"))
		to := strings.TrimSpace(r.URL.Query().Get("to"))
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		entries := make([]domain.Entry, 0, len(snap.Entries))
		for _, entry := range snap.Entries {
			if entryType != "" && entry.Type != entryType {
				continue
			}
			// Dates use ISO-8601 YYYY-MM-DD; lexical compare is safe.
			if from != "" && entry.Date < from {
				continue
			}
			if to != "" && entry.Date > to {
				continue
			}
			entries = append(entries, entry)
		}
		// Orden estable por fecha ASC, luego CreatedAt, luego ID.
		// Así limit toma siempre los N más recientes por fecha, no por posición en el slice.
		sort.SliceStable(entries, func(i, j int) bool {
			if entries[i].Date != entries[j].Date {
				return entries[i].Date < entries[j].Date
			}
			if !entries[i].CreatedAt.Equal(entries[j].CreatedAt) {
				return entries[i].CreatedAt.Before(entries[j].CreatedAt)
			}
			return entries[i].ID < entries[j].ID
		})
		if limit > 0 && len(entries) > limit {
			entries = entries[len(entries)-limit:]
		}
		writeJSON(w, 200, map[string]any{"entries": entries, "rev": snap.Rev, "root_cid": snap.RootCID})
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
		if err := s.gateWrite(sess, view); err != nil {
			writeJSON(w, 403, map[string]string{"error": "forbidden"})
			return
		}
		if body.AccountID != "" && snap.Accounts[body.AccountID] == nil {
			writeJSON(w, 400, map[string]string{"error": "la cuenta del asiento no pertenece a este negocio"})
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
	if err := s.gateOp(sess, "inventario", r.Method); err != nil {
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
			if invEnt := domain.ApplyInventoryIn(snap, body.AmountBase, "Entrada inventario "+body.Name, sess.UserID); invEnt != nil { domain.AppendPostedEntry(snap, invEnt, sess.TenantID, time.Now().Format("2006-01-02")) }
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
			if invEnt := domain.ApplyInventoryIn(snap, body.AmountBase, "Entrada inventario "+body.Name, sess.UserID); invEnt != nil { domain.AppendPostedEntry(snap, invEnt, sess.TenantID, time.Now().Format("2006-01-02")) }
			mv := domain.InventoryMove{
				ID: uuid.NewString(), TenantID: sess.TenantID, ItemID: body.ID,
				Kind: "in", Qty: body.Qty, Cost: body.Cost, AmountBase: body.AmountBase,
				CreatedBy: sess.UserID, CreatedAt: time.Now().UTC(),
			}
			snap.InvMoves = append(snap.InvMoves, mv)
			s.audit(snap, sess, "inventory.in", body.Name+" "+body.Currency, body.ID)
		}
		// Asiento ya registrado vía ApplyInventoryIn + AppendPostedEntry (libro único).
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
			if cogsEnt := domain.ApplyInventoryOut(snap, item.AmountBase, "Salida inventario", sess.UserID); cogsEnt != nil { domain.AppendPostedEntry(snap, cogsEnt, sess.TenantID, time.Now().Format("2006-01-02")) }
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
	if err := s.gateOp(sess, "nomina", r.Method); err != nil {
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
		if err := domain.ValidateEmployeeAssignments(snap, body.ID, body.Metadata); err != nil {
			writeJSON(w, 400, map[string]string{"error": "asignación de usuario o unidad inválida para este negocio"})
			return
		}
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
		if body.Metadata != nil {
			if err := domain.ValidateEmployeeAssignments(snap, body.ID, body.Metadata); err != nil {
				writeJSON(w, 400, map[string]string{"error": "asignación de usuario o unidad inválida para este negocio"})
				return
			}
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
		// La relación usuario → PDV vive en Employee.metadata. Si el cliente
		// envía metadata, debe reemplazarla para que reasignaciones o
		// desasignaciones de PDV persistan.
		if body.Metadata != nil {
			ex.Metadata = body.Metadata
		}
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
	if err := s.gateOp(sess, "nomina", r.Method); err != nil {
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
	if err := s.gateOp(sess, "facturas", r.Method); err != nil {
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
	if err := s.gateOp(sess, "sync", r.Method); err != nil {
		writeJSON(w, 403, map[string]string{"error": "forbidden"})
		return
	}
	if r.Method != http.MethodGet {
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "not found"})
		return
	}
	q := r.URL.Query()
	// Pull: si since_rev == server.Rev → uptodate (sin snapshot completo)
	if sr := q.Get("since_rev"); sr != "" {
		var since int64
		fmt.Sscanf(sr, "%d", &since)
		if since == snap.Rev {
			writeJSON(w, 200, map[string]any{
				"uptodate":    true,
				"rev":         snap.Rev,
				"root_cid":    snap.RootCID,
				"server_time": time.Now().UTC(),
			})
			return
		}
	}
	writeJSON(w, 200, map[string]any{
		"uptodate":    false,
		"rev":         snap.Rev,
		"root_cid":    snap.RootCID,
		"snapshot":    snap,
		"server_time": time.Now().UTC(),
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
	if err := s.gateOp(sess, "sync", r.Method); err != nil {
		writeJSON(w, 403, map[string]string{"error": "forbidden"})
		return
	}
	var body struct {
		Entries     []domain.Entry         `json:"entries"`
		Invoices    []domain.Invoice       `json:"invoices"`
		Inventory   []domain.InventoryItem `json:"inventory"`
		POSSales    []domain.POSSale       `json:"pos_sales"`
		ClientRev   int64                  `json:"client_rev"`
		BatchOpID   string                 `json:"client_op_id"`
		Force       bool                   `json:"force"`
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
	// Prevalidar el lote completo antes de aplicar cualquier mutación.
	// Los IDs de referencias deben existir dentro del snapshot de la sesión.
	for _, e := range body.Entries {
		if e.TenantID != "" && e.TenantID != sess.TenantID {
			writeJSON(w, 403, map[string]string{"error": "asiento de otro tenant"})
			return
		}
		if e.AccountID != "" {
			account := snap.Accounts[e.AccountID]
			if account == nil || (account.TenantID != "" && account.TenantID != sess.TenantID) {
				writeJSON(w, 400, map[string]string{"error": "la cuenta del asiento no pertenece a este negocio"})
				return
			}
		}
	}
	for _, inv := range body.Invoices {
		if inv.TenantID != "" && inv.TenantID != sess.TenantID {
			writeJSON(w, 403, map[string]string{"error": "factura de otro tenant"})
			return
		}
	}
	for _, item := range body.Inventory {
		if item.TenantID != "" && item.TenantID != sess.TenantID {
			writeJSON(w, 403, map[string]string{"error": "inventario de otro tenant"})
			return
		}
	}
	for _, sale := range body.POSSales {
		if sale.TenantID != "" && sale.TenantID != sess.TenantID {
			writeJSON(w, 403, map[string]string{"error": "venta de otro tenant"})
			return
		}
		if sale.UnitID != "" {
			unit := snap.SalesUnits[sale.UnitID]
			if unit == nil || (unit.TenantID != "" && unit.TenantID != sess.TenantID) {
				writeJSON(w, 400, map[string]string{"error": "la unidad de venta no pertenece a este negocio"})
				return
			}
		}
		for _, line := range sale.Lines {
			if line.ProductID != "" {
				product := snap.Products[line.ProductID]
				if product == nil || (product.TenantID != "" && product.TenantID != sess.TenantID) {
					writeJSON(w, 400, map[string]string{"error": "un producto de la venta no pertenece a este negocio"})
					return
				}
			}
		}
	}
	if err := domain.CheckSyncBase(snap.Rev, body.ClientRev, body.Force, snap.RootCID); err != nil {
		if ce, ok := err.(*domain.SyncConflictError); ok {
			writeJSON(w, 409, map[string]any{
				"error":      ce.Error(),
				"code":       "sync_conflict",
				"server_rev": ce.ServerRev,
				"root_cid":   ce.RootCID,
			})
			return
		}
		writeJSON(w, 409, map[string]string{"error": err.Error(), "code": "sync_conflict"})
		return
	}
	// Idempotencia de lote completo
	if body.BatchOpID != "" {
		if sid, ok := domain.LookupIdempotent(snap, "batch:"+body.BatchOpID); ok {
			writeJSON(w, 200, map[string]any{
				"ok": true, "idempotent": true, "batch_id": sid,
				"rev": snap.Rev, "root_cid": snap.RootCID,
				"applied": map[string]int{"entries": 0, "invoices": 0, "inventory": 0, "pos_sales": 0},
				"skipped": map[string]int{"batch": 1},
			})
			return
		}
	}

	now := time.Now().UTC()
	applied := map[string]int{"entries": 0, "invoices": 0, "inventory": 0, "pos_sales": 0}
	skipped := map[string]int{"entries": 0, "invoices": 0, "inventory": 0, "pos_sales": 0}

	for _, e := range body.Entries {
		opID := domain.ClientOpIDFromMeta(e.Metadata)
		if opID == "" && e.ID != "" {
			opID = "entry:" + e.ID
		}
		if opID != "" {
			if _, ok := domain.LookupIdempotent(snap, opID); ok {
				skipped["entries"]++
				continue
			}
		}
		if e.ID == "" {
			e.ID = uuid.NewString()
		}
		domain.StampEntryServer(&e, sess.TenantID, sess.UserID, now)
		// Aplicar partida doble si hay cuentas; si no, solo append
		if e.AccountID != "" || e.Type != "" {
			domain.ApplyDoubleEntry(snap, &e)
		}
		snap.Entries = append(snap.Entries, e)
		if opID != "" {
			domain.RememberIdempotent(snap, opID, e.ID)
		}
		applied["entries"]++
	}

	for _, inv := range body.Invoices {
		opID := domain.ClientOpIDFromMeta(inv.Metadata)
		if opID == "" && inv.ID != "" {
			opID = "invoice:" + inv.ID
		}
		if opID != "" {
			if _, ok := domain.LookupIdempotent(snap, opID); ok {
				skipped["invoices"]++
				continue
			}
		}
		if inv.ID == "" {
			inv.ID = uuid.NewString()
		}
		inv.TenantID = sess.TenantID
		inv.CreatedBy = sess.UserID
		inv.CreatedAt = now
		snap.Invoices = append(snap.Invoices, inv)
		if opID != "" {
			domain.RememberIdempotent(snap, opID, inv.ID)
		}
		applied["invoices"]++
	}

	if snap.Inventory == nil {
		snap.Inventory = map[string]*domain.InventoryItem{}
	}
	for _, it := range body.Inventory {
		opID := domain.ClientOpIDFromMeta(it.Metadata)
		if opID == "" && it.ID != "" {
			opID = "inv:" + it.ID
		}
		if opID != "" {
			if sid, ok := domain.LookupIdempotent(snap, opID); ok {
				// actualización idempotente: reaplicar estado del item
				_ = sid
				skipped["inventory"]++
				continue
			}
		}
		if it.ID == "" {
			it.ID = uuid.NewString()
		}
		it.TenantID = sess.TenantID
		it.UpdatedAt = now
		cp := it
		snap.Inventory[it.ID] = &cp
		if opID != "" {
			domain.RememberIdempotent(snap, opID, it.ID)
		}
		applied["inventory"]++
	}

	for _, sale := range body.POSSales {
		opID := domain.ClientOpIDFromMeta(sale.Metadata)
		if opID == "" && sale.ID != "" {
			opID = "pos:" + sale.ID
		}
		if opID != "" {
			if _, ok := domain.LookupIdempotent(snap, opID); ok {
				skipped["pos_sales"]++
				continue
			}
		}
		if sale.ID == "" {
			sale.ID = uuid.NewString()
		}
		sale.TenantID = sess.TenantID
		if sale.CreatedAt.IsZero() {
			sale.CreatedAt = now
		}
		snap.POSSales = append(snap.POSSales, sale)
		if opID != "" {
			domain.RememberIdempotent(snap, opID, sale.ID)
		}
		applied["pos_sales"]++
	}

	if body.BatchOpID != "" {
		domain.RememberIdempotent(snap, "batch:"+body.BatchOpID, body.BatchOpID)
	}

	s.audit(snap, sess, "sync.push",
		fmt.Sprintf("Push offline · entries=%d inv=%d invoices=%d pos=%d skipped_e=%d force=%v",
			applied["entries"], applied["inventory"], applied["invoices"], applied["pos_sales"],
			skipped["entries"], body.Force),
		body.BatchOpID)
	_ = s.Store.Put(snap)
	writeJSON(w, 200, map[string]any{
		"ok": true, "idempotent": false,
		"rev": snap.Rev, "root_cid": snap.RootCID,
		"applied": applied, "skipped": skipped,
	})
}


func (s *Server) handleMasterTenants(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	if err := s.gateOp(sess, "master", r.Method); err != nil {
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
	if err := s.gateOp(sess, "dashboard", r.Method); err != nil {
		if err2 := s.gateOp(sess, "reportes", r.Method); err2 != nil {
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
	// Ecuación del panel = saldos del plan de cuentas (única fuente de verdad).
	// income/expense por asientos se exponen solo como métrica auxiliar del libro.
	writeJSON(w, 200, map[string]any{
		"tenant":   snap.Tenant.Name,
		"slug":     snap.Tenant.Slug,
		"currency": snap.Tenant.Currency,

		// Auxiliar: suma de Entries por type (puede diferir del plan de cuentas).
		"entries_income_total":  income,
		"entries_expense_total": expense,
		// Compatibilidad temporal: income_total/expense_total = saldos (ya no el libro).
		"income_total": eq["ingresos"],
		"expense_total": eq["gastos"],
		"net":           eq["neto"],

		// Claves alineadas con el frontend (Equation / StatCard) — desde EquationSnapshot.
		"ingresos":   eq["ingresos"],
		"gastos":     eq["gastos"],
		"neto":       eq["neto"],
		"income":     eq["ingresos"],
		"expenses":   eq["gastos"],
		"net_profit": eq["neto"],
		"activo":     eq["activo"],
		"pasivo":     eq["pasivo"],
		"patrimonio": eq["patrimonio"],
		"assets":     eq["activo"],
		"liabilities": eq["pasivo"],
		"equity":     eq["patrimonio"],
		"ecuacion":   eq,

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
	if err := s.gateOp(sess, "master", r.Method); err != nil {
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
		body.AdminUser = "admin-" + strings.ToLower(strings.ReplaceAll(strings.TrimSpace(body.Slug), " ", "-"))
	}
	body.AdminUser = strings.TrimSpace(body.AdminUser)
	if body.AdminUser == "" {
		writeJSON(w, 400, map[string]string{"error": "admin_user no válido"})
		return
	}
	if s.Store.UsernameExists(body.AdminUser) || s.Store.UsernameExists(body.AdminUser+"-owner") {
		writeJSON(w, 409, map[string]string{"error": "admin_user ya existe globalmente; cada tenant necesita nombres de usuario únicos"})
		return
	}
	if strings.TrimSpace(body.AdminPass) != "" {
		writeJSON(w, 400, map[string]string{"error": "admin_pass ya no se acepta; las credenciales temporales se generan de forma segura"})
		return
	}
	for _, t := range s.Store.ListTenants() {
		if strings.EqualFold(t.Slug, body.Slug) {
			writeJSON(w, 409, map[string]string{"error": "slug exists"})
			return
		}
	}
	snap := domain.BootstrapTenant(body.Name, body.Slug, body.Currency)
	if snap.Tenant.Settings == nil { snap.Tenant.Settings = map[string]string{} }
	credentials := make([]bootstrapCredential, 0, len(snap.Users))
	for _, user := range snap.Users {
		if user.Username == "admin" {
			user.Username = body.AdminUser
		}
		if user.Role == domain.RoleMaster {
			user.Role = domain.RoleAdmin
			user.Username = body.AdminUser + "-owner"
			user.DisplayName = "Owner"
		}
		if err := assignGeneratedInitialPassword(user, snap.Tenant.Slug, &credentials); err != nil {
			writeJSON(w, 500, map[string]string{"error": "no se pudieron generar las credenciales temporales"})
			return
		}
	}
	snap.Tenant.Settings[bootstrapCredentialMarker] = "1"
	actorName := sess.UserID
	if actorSnap := s.Store.Get(sess.TenantID); actorSnap != nil {
		if actor := actorSnap.Users[sess.UserID]; actor != nil && strings.TrimSpace(actor.Username) != "" {
			actorName = actor.Username
		}
	}
	snap.AuditLog = append(snap.AuditLog, domain.AuditEntry{
		ID: uuid.NewString(), TenantID: snap.Tenant.ID, Username: actorName, Role: sess.Role,
		Action: "master.tenant_create", Detail: "Alta global de empresa " + snap.Tenant.Name + " (" + snap.Tenant.Slug + ")",
		Ref: snap.Tenant.ID, CreatedAt: time.Now().UTC(),
		Metadata: domain.Metadata{"actor_tenant_id": sess.TenantID},
	})
	if err := appendBootstrapCredentials(s.Store, credentials); err != nil {
		writeJSON(w, 500, map[string]string{"error": "no se pudieron guardar las credenciales temporales"})
		return
	}
	if err := s.Store.CreateTenant(snap); err != nil {
		if errors.Is(err, store.ErrTenantConflict) {
			writeJSON(w, http.StatusConflict, map[string]string{"error": err.Error()})
		} else {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "no se pudo persistir la nueva empresa"})
		}
		return
	}
	writeJSON(w, 201, map[string]any{
		"tenant": snap.Tenant,
		"admin_user": body.AdminUser,
		"credentials_delivery": "bootstrap-credentials.txt",
		"must_change_password": true,
	})
}


func (s *Server) handleInvoicePDF(w http.ResponseWriter, r *http.Request) {
	setPrivateNoStore(w)
	if r.Method!=http.MethodGet && r.Method!=http.MethodHead { w.Header().Set("Allow","GET, HEAD"); writeJSON(w,405,map[string]string{"error":"metodo no permitido"}); return }
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "no autorizado"})
		return
	}
	if err := s.gateOp(sess, "facturas", r.Method); err != nil {
		writeJSON(w, 403, map[string]string{"error": "sin permiso"})
		return
	}
	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id=="" || len(id)>128 {
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
	if err := pdf.ValidateInvoiceExport(snap.Tenant, *inv); err != nil {
		writeJSON(w, http.StatusRequestEntityTooLarge, map[string]string{"error": "la factura supera los límites de exportación"})
		return
	}
	data := pdf.InvoicePDF(snap.Tenant, *inv)
	if len(data) > pdf.MaxPDFExportBytes {
		writeJSON(w, http.StatusRequestEntityTooLarge, map[string]string{"error": "el PDF supera el tamaño máximo permitido"})
		return
	}
	if err := s.recordExportAudit(snap, sess, "factura.exportacion_pdf", "Exportación PDF de factura · "+inv.Number+" · negocio "+snap.Tenant.Name, inv.ID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "no se pudo registrar la exportación"})
		return
	}
	filename := "factura-" + safeDownloadFilenamePart(inv.Number) + ".pdf"
	w.Header().Set("Content-Type","application/pdf"); w.Header().Set("Content-Disposition",mime.FormatMediaType("attachment",map[string]string{"filename":filename})); w.Header().Set("Content-Length",strconv.Itoa(len(data))); w.WriteHeader(200)
	if r.Method!=http.MethodHead { _,_=w.Write(data) }
}

func (s *Server) servePWA(w http.ResponseWriter, r *http.Request) {
	// Prefer webapp twin: static/index.html, then static/app/index.html
	candidates := []string{
		filepath.Join(s.StaticDir, "index.html"),
		filepath.Join(s.StaticDir, "app", "index.html"),
	}
	for _, path := range candidates {
		if _, err := os.Stat(path); err == nil {
			w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
			w.Header().Set("Pragma", "no-cache")
			http.ServeFile(w, r, path)
			return
		}
	}
	path := "" // fall through
	_ = path
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(`<!DOCTYPE html><html><body><h1>ÁbacoPhy</h1><p>PWA no embebida. Coloca static/app/index.html</p></body></html>`))
}

const bootstrapCredentialMarker = "bootstrap_credentials_v1"

type bootstrapCredential struct {
	Tenant string
	Username string
	Password string
}

// EnsureBootstrap crea cuentas iniciales sin contraseñas predeterminadas reutilizables.
// En la primera ejecución sobre datos antiguos rota una sola vez todas las cuentas master/admin.
func EnsureBootstrap(st *store.Store) error {
	if st == nil { return fmt.Errorf("store requerido") }
	tenants := st.ListTenants()
	credentials := make([]bootstrapCredential, 0)

	if len(tenants) == 0 {
		snap := domain.BootstrapTenant("Negocio Demo ÁbacoPhy", "demo", "CUP")
		if snap.Tenant.Settings == nil { snap.Tenant.Settings = map[string]string{} }
		for _, user := range snap.Users {
			if user != nil {
				if err := assignInitialPassword(user, snap.Tenant.Slug, &credentials); err != nil { return err }
			}
		}
		snap.Tenant.Settings[bootstrapCredentialMarker] = "1"
		if err := persistBootstrapCredentials(st, credentials); err != nil { return err }
		return st.Put(snap)
	}

	changedSnapshots := make([]*domain.StoreSnapshot, 0, len(tenants))
	for _, tenant := range tenants {
		snap := st.Get(tenant.ID)
		if snap == nil { continue }
		changed := false
		if snap.Tenant.Settings == nil { snap.Tenant.Settings = map[string]string{}; changed = true }

		if snap.Tenant.Settings[bootstrapCredentialMarker] != "1" {
			for _, user := range snap.Users {
				if user == nil || (user.Role != domain.RoleMaster && user.Role != domain.RoleAdmin) { continue }
				if err := assignGeneratedInitialPassword(user, snap.Tenant.Slug, &credentials); err != nil { return err }
				st.RevokeUserTokens(user.ID)
				changed = true
			}
			snap.Tenant.Settings[bootstrapCredentialMarker] = "1"
			changed = true
		}

		for _, user := range snap.Users {
			if user == nil { continue }
			if user.TenantID != snap.Tenant.ID && snap.Tenant.ID != "" { user.TenantID = snap.Tenant.ID; changed = true }
			if user.PasswordHash == "" {
				if err := assignGeneratedInitialPassword(user, snap.Tenant.Slug, &credentials); err != nil { return err }
				st.RevokeUserTokens(user.ID)
				changed = true
			}
			if user.Modules == nil { user.Modules = auth.DefaultModulesForRole(user.Role); changed = true }
		}
		if snap.Tenant.EnabledModules == nil || len(snap.Tenant.EnabledModules) == 0 {
			snap.Tenant.EnabledModules = domain.DefaultEnabledModules()
			changed = true
		} else {
			for key, enabled := range domain.DefaultEnabledModules() {
				if _, ok := snap.Tenant.EnabledModules[key]; !ok { snap.Tenant.EnabledModules[key] = enabled; changed = true }
			}
		}
		if snap.MeasureUnits == nil || len(snap.MeasureUnits) == 0 { snap.MeasureUnits = domain.DefaultMeasureUnits(snap.Tenant.ID); changed = true }
		if snap.PriceSheets == nil { snap.PriceSheets = map[string]*domain.PriceSheet{}; changed = true }
		if changed { changedSnapshots = append(changedSnapshots, snap) }
	}
	if err := persistBootstrapCredentials(st, credentials); err != nil { return err }
	for _, snap := range changedSnapshots {
		if err := st.Put(snap); err != nil { return err }
	}
	return nil
}

func assignInitialPassword(user *domain.User, tenantSlug string, credentials *[]bootstrapCredential) error {
	envName := ""
	switch user.Role {
	case domain.RoleMaster: envName = "ABACOPHY_BOOTSTRAP_MASTER_PASSWORD"
	case domain.RoleAdmin: envName = "ABACOPHY_BOOTSTRAP_ADMIN_PASSWORD"
	}
	password := ""
	generated := false
	if envName != "" { password = os.Getenv(envName) }
	if strings.TrimSpace(password) == "" {
		value, err := newBootstrapPassword()
		if err != nil { return err }
		password, generated = value, true
	} else if err := auth.ValidatePassword(password); err != nil {
		return fmt.Errorf("%s: %w", envName, err)
	}
	hash, err := auth.HashPassword(password)
	if err != nil { return err }
	user.PasswordHash = hash
	user.MustChangePassword = true
	user.UpdatedAt = time.Now().UTC()
	if generated {
		*credentials = append(*credentials, bootstrapCredential{Tenant: tenantSlug, Username: user.Username, Password: password})
	}
	return nil
}

func newBootstrapPassword() (string, error) {
	random := make([]byte, 32)
	if _, err := rand.Read(random); err != nil { return "", fmt.Errorf("generación de credencial temporal: %w", err) }
	return base64.RawURLEncoding.EncodeToString(random), nil
}

func persistBootstrapCredentials(st *store.Store, credentials []bootstrapCredential) error {
	return appendBootstrapCredentials(st, credentials)
}

func assignGeneratedInitialPassword(user *domain.User, tenantSlug string, credentials *[]bootstrapCredential) error {
	password, err := newBootstrapPassword()
	if err != nil { return err }
	hash, err := auth.HashPassword(password)
	if err != nil { return err }
	user.PasswordHash = hash
	user.MustChangePassword = true
	user.UpdatedAt = time.Now().UTC()
	*credentials = append(*credentials, bootstrapCredential{Tenant: tenantSlug, Username: user.Username, Password: password})
	return nil
}

func appendBootstrapCredentials(st *store.Store, credentials []bootstrapCredential) error {
	if len(credentials) == 0 { return nil }
	if err := os.MkdirAll(st.DataDir(), 0700); err != nil { return err }
	path := filepath.Join(st.DataDir(), "bootstrap-credentials.txt")
	info, statErr := os.Stat(path)
	isNew := os.IsNotExist(statErr) || (statErr == nil && info.Size() == 0)
	file, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0600)
	if err != nil { return err }
	if isNew {
		if _, err := fmt.Fprintf(file, "ABACOPHY — CREDENCIALES TEMPORALES DE PRIMER ACCESO\nGenerado: %s\n\n", time.Now().UTC().Format(time.RFC3339)); err != nil {
			_ = file.Close()
			return err
		}
	}
	for _, credential := range credentials {
		if _, err := fmt.Fprintf(file, "Tenant: %s\nUsername: %s\nPassword: %s\n\n", credential.Tenant, credential.Username, credential.Password); err != nil {
			_ = file.Close()
			return err
		}
	}
	if err := file.Sync(); err != nil { _ = file.Close(); return err }
	if err := file.Close(); err != nil { return err }
	if err := os.Chmod(path, 0600); err != nil { return err }
	log.Printf("EVENT=security.bootstrap_credentials_appended file=%q accounts=%d secrets_not_logged=true", path, len(credentials))
	return nil
}

func (s *Server) requireInitialPasswordChange(next http.Handler) http.Handler {
	allowed := map[string]bool{
		"/api/v1/info": true, "/api/v1/health": true,
		"/api/v1/auth/login": true, "/api/v1/auth/me": true,
		"/api/v1/auth/password": true, "/api/v1/auth/logout": true,
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions || !strings.HasPrefix(r.URL.Path, "/api/") || allowed[r.URL.Path] {
			next.ServeHTTP(w, r); return
		}
		sess, err := s.sess(r)
		if err == nil && sess != nil {
			if snap := s.Store.Get(sess.TenantID); snap != nil {
				if user := snap.Users[sess.UserID]; user != nil && user.MustChangePassword {
					writeJSON(w, http.StatusForbidden, map[string]any{
						"error": "Debe cambiar su contraseña inicial antes de continuar",
						"code": "password_change_required",
						"must_change_password": true,
					})
					return
				}
			}
		}
		next.ServeHTTP(w, r)
	})
}

func cleanupBootstrapCredentials(st *store.Store) {
	for _, tenantID := range st.ListTenantIDs() {
		snap := st.Get(tenantID)
		if snap == nil { continue }
		for _, user := range snap.Users {
			if user != nil && user.MustChangePassword { return }
		}
	}
	_ = os.Remove(filepath.Join(st.DataDir(), "bootstrap-credentials.txt"))
}

// Note: static assets are also served from main via FileServer fallback if needed.
