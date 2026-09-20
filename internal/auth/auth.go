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
	"dashboard":  {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleOperador, domain.RoleReadonly},
	"ingresos":   {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleOperador},
	"gastos":     {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleOperador},
	"cuentas":    {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador},
	"inventario": {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleOperador, domain.RoleReadonly},
	"nomina":     {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador},
	"facturas":   {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleOperador},
	"reportes":   {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleReadonly},
	"usuarios":   {domain.RoleMaster, domain.RoleAdmin},
	"tenant":     {domain.RoleMaster, domain.RoleAdmin},
	"master":     {domain.RoleMaster},
	"sync":       {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleOperador},
	"monedas":    {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador},
	"traza":      {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador},
	"salvas":     {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador},
	"cuentas_t":  {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleReadonly},
	"productos":  {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleOperador, domain.RoleReadonly},
	"almacen":    {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleOperador, domain.RoleReadonly},
	"unidades":   {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleOperador, domain.RoleReadonly},
	"recepcion":  {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleOperador},
	"vendedor":   {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador, domain.RoleOperador},
	"fichas_costo": {domain.RoleMaster, domain.RoleAdmin, domain.RoleContador},
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
	user, _ := st.FindUserByUsername(username)
	if user == nil || !user.Active {
		return nil, nil, ErrInvalidCred
	}
	if !CheckPassword(user.PasswordHash, password) {
		return nil, nil, ErrInvalidCred
	}
	tok := &domain.TokenSession{
		Token:     NewToken(),
		UserID:    user.ID,
		TenantID:  user.TenantID,
		Role:      user.Role,
		ExpiresAt: time.Now().Add(72 * time.Hour),
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
