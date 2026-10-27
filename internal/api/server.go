package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/yecharlot/AbacoPhy/internal/auth"
	"github.com/yecharlot/AbacoPhy/internal/domain"
	"github.com/yecharlot/AbacoPhy/internal/identity"
	"github.com/yecharlot/AbacoPhy/internal/pdf"
	"github.com/yecharlot/AbacoPhy/internal/store"
)

type Server struct {
	Store     *store.Store
	StaticDir string
	AppAlias  string // abacophy.app.ans
	Hub       *EventHub
	Identity  *identity.Instance
}

func NewServer(st *store.Store, staticDir string, instance *identity.Instance) *Server {
	return &Server{Store: st, StaticDir: staticDir, AppAlias: "abacophy.app.ans", Hub: NewEventHub(), Identity: instance}
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()

	// Health / meta
	mux.HandleFunc("/api/v1/info", s.handleInfo)
	mux.HandleFunc("/api/v1/events", s.handleEvents)
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
	const apiVersion = 1

	instanceID := ""
	if s.Identity != nil {
		instanceID = s.Identity.InstanceID
	}

	writeJSON(w, 200, map[string]any{
		// Discovery contract.
		"product":         "AbacoPhy",
		"name":            "ÁbacoPhy",
		"instanceId":      instanceID,
		"version":         "0.1.0",
		"apiVersion":      apiVersion,
		"capabilities":    []string{"web", "pos", "offline", "sync"},
		"pairingRequired": false,

		// Legacy metadata kept for existing clients.
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
	snap := s.Store.Get(tok.TenantID)
	if snap != nil {
		s.audit(snap, tok, "auth.login", "Inicio de sesión «"+user.Username+"» · rol "+user.Role, user.ID)
		_ = s.Store.Put(snap)
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

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) (*domain.TokenSession, error) {
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return nil, err
	}
	snap := s.Store.ResolveTenant(sess.TenantID, sess.UserID)
	if snap == nil {
		writeJSON(w, 404, map[string]string{"error": "tenant not found"})
		return nil, fmt.Errorf("tenant not found")
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
		"user": publicUser(snap, user), "tenant": snap.Tenant, "rev": snap.Rev, "root_cid": snap.RootCID,
		"views": viewsForUser(sess.Role, snap, user), "modules": modulesPayload(snap), "user_modules": umods,
	})
	return sess, nil
}
