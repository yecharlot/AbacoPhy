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

// Vistas / módulos y roles que pueden acceder.
var ViewACL = map[string][]string{
	"dashboard": {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleOperador, domain.RoleEconomico, domain.RoleVendedor, domain.RoleAlmacenero, domain.RoleReadonly},
	"ingresos":  {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico, domain.RoleOperador},
	"gastos":    {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico, domain.RoleOperador},
	"cuentas":   {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico},
	"inventario": {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico, domain.RoleAlmacenero, domain.RoleOperador, domain.RoleReadonly},
	"nomina":    {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico},
	"facturas":  {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico, domain.RoleOperador},
	"reportes":  {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico, domain.RoleReadonly},
	"usuarios":  {domain.RoleMaster, domain.RoleAdmin},
	"tenant":    {domain.RoleMaster, domain.RoleAdmin},
	"master":    {domain.RoleMaster},
	"sync":      {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleOperador, domain.RoleEconomico, domain.RoleVendedor, domain.RoleAlmacenero},
	"monedas":   {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico},
	"traza":     {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico},
	"salvas":    {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico},
	"cuentas_t": {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico, domain.RoleReadonly},
	"nomencladores": {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico, domain.RoleAlmacenero, domain.RoleOperador, domain.RoleReadonly},
	"productos": {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico, domain.RoleAlmacenero, domain.RoleOperador, domain.RoleReadonly},
	"cargos":    {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico},
	"almacen":   {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico, domain.RoleAlmacenero, domain.RoleOperador, domain.RoleReadonly},
	"unidades":  {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico, domain.RoleAlmacenero},
	"recepcion": {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico, domain.RoleAlmacenero},
	"vendedor":  {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico, domain.RoleVendedor, domain.RoleOperador},
	"fichas_costo": {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico},
}


func HashPassword(pw string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
	return string(b), err
}

func CheckPassword(hash, pw string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(pw)) == nil
}

func NewToken() string {
	var b [24]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}

func Can(role, view string) bool {
	allowed, ok := ViewACL[view]
	if !ok {
		return role == domain.RoleMaster
	}
	for _, r := range allowed {
		if r == role {
			return true
		}
	}
	return false
}

func Login(st *store.Store, username, password string) (*domain.TokenSession, *domain.User, error) {
	user, snap := st.FindUserByUsername(username)
	if user == nil || snap == nil || !user.Active {
		return nil, nil, ErrInvalidCred
	}
	if !CheckPassword(user.PasswordHash, password) {
		return nil, nil, ErrInvalidCred
	}
	// Siempre anclar al tenant del snapshot cargado (evita TenantID huérfano en disco).
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
		ExpiresAt: time.Now().UTC().Add(72 * time.Hour),
	}
	st.SaveToken(tok)
	return tok, user, nil
}

func SessionFromHeader(st *store.Store, authHeader string) (*domain.TokenSession, error) {
	if authHeader == "" {
		return nil, ErrUnauthorized
	}
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


func ValidRoles() []string {
	return []string{
		domain.RoleAdmin, domain.RoleContador, domain.RoleEconomico,
		domain.RoleVendedor, domain.RoleAlmacenero, domain.RoleOperador, domain.RoleReadonly,
	}
}
