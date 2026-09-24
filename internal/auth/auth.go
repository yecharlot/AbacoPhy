package auth

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/yecharlot/AbacoPhy/internal/domain"
	"github.com/yecharlot/AbacoPhy/internal/store"
)

var (
	ErrUnauthorized = errors.New("unauthorized")
	ErrForbidden    = errors.New("forbidden")
	ErrInvalidCred  = errors.New("invalid credentials")
)

// ViewACL: roles que pueden ver cada módulo (además debe estar habilitado en el tenant).
var ViewACL = map[string][]string{
	"dashboard":     {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleOperador, domain.RoleEconomico, domain.RoleVendedor, domain.RoleAlmacenero, domain.RoleReadonly},
	"ingresos":      {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico, domain.RoleOperador},
	"gastos":        {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico, domain.RoleOperador},
	"cuentas":       {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico},
	"inventario":    {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico, domain.RoleAlmacenero, domain.RoleOperador, domain.RoleReadonly},
	"nomina":        {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico},
	"facturas":      {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico, domain.RoleOperador},
	"reportes":      {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico, domain.RoleReadonly},
	"usuarios":      {domain.RoleMaster, domain.RoleAdmin},
	"tenant":        {domain.RoleMaster, domain.RoleAdmin},
	"master":        {domain.RoleMaster},
	"sync":          {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleOperador, domain.RoleEconomico, domain.RoleVendedor, domain.RoleAlmacenero},
	"monedas":       {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico},
	"traza":         {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico},
	"salvas":        {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico},
	"cuentas_t":     {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico, domain.RoleReadonly},
	"nomencladores": {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico, domain.RoleAlmacenero, domain.RoleOperador, domain.RoleReadonly},
	"productos":     {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico, domain.RoleAlmacenero, domain.RoleOperador, domain.RoleReadonly, domain.RoleVendedor},
	"cargos":        {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico},
	"measure_units": {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico, domain.RoleAlmacenero, domain.RoleOperador},
	"almacen":       {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico, domain.RoleAlmacenero, domain.RoleOperador, domain.RoleReadonly},
	"unidades":      {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico, domain.RoleAlmacenero, domain.RoleVendedor},
	"recepcion":     {domain.RoleMaster, domain.RoleAdmin, domain.RoleEconomico},
	"vendedor":      {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico, domain.RoleVendedor, domain.RoleOperador},
	"fichas_costo":  {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico},
	"fichas_precio": {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico, domain.RoleVendedor},
	"pedidos_online":{domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico, domain.RoleVendedor, domain.RoleOperador},
	"tienda":        {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico, domain.RoleVendedor, domain.RoleOperador, domain.RoleReadonly},
}

func Can(role, view string) bool {
	if role == domain.RoleMaster {
		return true
	}
	allowed, ok := ViewACL[view]
	if !ok {
		return false
	}
	for _, r := range allowed {
		if r == role {
			return true
		}
	}
	return false
}

// ModuleEnabled: módulo activo en el negocio.
// Core siempre true. Si el mapa del tenant no tiene la clave (datos antiguos),
// se usa el valor por defecto del catálogo — no se bloquea por ausencia.
func ModuleEnabled(snap *domain.StoreSnapshot, mod string) bool {
	if snap == nil {
		return true
	}
	for _, meta := range domain.CatalogModules() {
		if meta.ID == mod && meta.Core {
			return true
		}
	}
	def := domain.DefaultEnabledModules()
	em := snap.Tenant.EnabledModules
	if em == nil || len(em) == 0 {
		if v, ok := def[mod]; ok {
			return v
		}
		return true
	}
	if v, ok := em[mod]; ok {
		return v
	}
	// Clave ausente en mapa incompleto: no bloquear
	if v, ok := def[mod]; ok {
		return v
	}
	return true
}

// DefaultModulesForRole: módulos que el rol puede usar (todos en true).
func DefaultModulesForRole(role string) map[string]bool {
	out := map[string]bool{}
	for view := range ViewACL {
		if Can(role, view) {
			out[view] = true
		}
	}
	return out
}

// UserModuleAllowed: solo un false explícito quita el acceso.
// true o clave ausente → no restringe (manda el rol + el negocio).
func UserModuleAllowed(user *domain.User, view string) bool {
	if user == nil || user.Modules == nil {
		return true
	}
	v, ok := user.Modules[view]
	if !ok {
		return true
	}
	return v
}

// CanAccess: rol + módulo del negocio + módulos del usuario.
func CanAccess(snap *domain.StoreSnapshot, role, view string) bool {
	return CanAccessUser(snap, role, view, nil)
}

func CanAccessUser(snap *domain.StoreSnapshot, role, view string, user *domain.User) bool {
	if !Can(role, view) {
		return false
	}
	if !ModuleEnabled(snap, view) {
		return false
	}
	return UserModuleAllowed(user, view)
}

func HashPassword(pw string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func CheckPassword(hash, pw string) bool {
	if hash == "" || pw == "" {
		return false
	}
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(pw)) == nil
}

func NewToken() string {
	b := make([]byte, 24)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func Login(st *store.Store, username, password string) (*domain.TokenSession, *domain.User, error) {
	user, snap := st.FindUserByUsername(username)
	if user == nil || snap == nil || !user.Active {
		return nil, nil, ErrInvalidCred
	}
	if !CheckPassword(user.PasswordHash, password) {
		return nil, nil, ErrInvalidCred
	}
	tenantID := snap.Tenant.ID
	if tenantID == "" {
		tenantID = user.TenantID
	}
	if user.TenantID != tenantID {
		user.TenantID = tenantID
	}
	tok := &domain.TokenSession{
		Token:     NewToken(),
		UserID:    user.ID,
		TenantID:  tenantID,
		Role:      user.Role,
		ExpiresAt: time.Now().UTC().Add(30 * 24 * time.Hour), // 30 días · sesión durable
	}
	st.SaveToken(tok)
	return tok, user, nil
}

func SessionFromRequest(st *store.Store, authHeader string) (*domain.TokenSession, error) {
	token := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	if token == "" {
		return nil, ErrUnauthorized
	}
	sess := st.GetToken(token)
	if sess == nil {
		return nil, ErrUnauthorized
	}
	return sess, nil
}

func RequireView(sess *domain.TokenSession, view string) error {
	if sess == nil {
		return ErrUnauthorized
	}
	if !Can(sess.Role, view) {
		return ErrForbidden
	}
	return nil
}

func RequireAccess(snap *domain.StoreSnapshot, sess *domain.TokenSession, view string) error {
	if sess == nil {
		return ErrUnauthorized
	}
	var user *domain.User
	if snap != nil && sess.UserID != "" {
		user = snap.Users[sess.UserID]
	}
	if !CanAccessUser(snap, sess.Role, view, user) {
		return ErrForbidden
	}
	return nil
}

func ValidRoles() []string {
	return []string{
		domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico,
		domain.RoleVendedor, domain.RoleAlmacenero, domain.RoleOperador, domain.RoleReadonly,
	}
}

func ViewsForRole(role string, snap *domain.StoreSnapshot) []string {
	return ViewsForUser(role, snap, nil)
}

func ViewsForUser(role string, snap *domain.StoreSnapshot, user *domain.User) []string {
	var out []string
	for view := range ViewACL {
		if CanAccessUser(snap, role, view, user) {
			out = append(out, view)
		}
	}
	return out
}
