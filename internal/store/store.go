package store

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/yecharlot/AbacoPhy/internal/domain"
)

// Store: memoria + disco local + ancla CID (IPFS-style) + Durable Object opcional.
type Store struct {
	mu       sync.RWMutex
	tenants  map[string]*domain.StoreSnapshot // key = tenantID
	tokens   map[string]*domain.TokenSession
	dataDir  string
	doURL    string // Cloudflare DO endpoint (opcional)
	doToken  string
}

func New(dataDir string) *Store {
	s := &Store{
		tenants: make(map[string]*domain.StoreSnapshot),
		tokens:  make(map[string]*domain.TokenSession),
		dataDir: dataDir,
		doURL:   strings.TrimSpace(os.Getenv("ABACOPHY_DO_URL")),
		doToken: strings.TrimSpace(os.Getenv("ABACOPHY_DO_TOKEN")),
	}
	_ = os.MkdirAll(dataDir, 0755)
	s.loadAll()
	s.loadTokens()
	return s
}

func (s *Store) pathTenant(id string) string {
	return filepath.Join(s.dataDir, "tenants", id+".json")
}

func (s *Store) loadAll() {
	dir := filepath.Join(s.dataDir, "tenants")
	_ = os.MkdirAll(dir, 0755)
	entries, err := os.ReadDir(dir)
	if err != nil {
		return
	}
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".json") {
			continue
		}
		b, err := os.ReadFile(filepath.Join(dir, e.Name()))
		if err != nil {
			continue
		}
		var snap domain.StoreSnapshot
		if json.Unmarshal(b, &snap) != nil || snap.Tenant.ID == "" {
			continue
		}
		s.tenants[snap.Tenant.ID] = &snap
	}
}

func (s *Store) Get(tenantID string) *domain.StoreSnapshot {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.tenants[tenantID]
}

func (s *Store) Put(snap *domain.StoreSnapshot) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if snap == nil || snap.Tenant.ID == "" {
		return fmt.Errorf("snapshot inválido")
	}
	snap.UpdatedAt = time.Now().UTC()
	snap.Rev++
	// CID sobre payload sin RootCID (estable); luego se re-serializa con CID.
	snap.RootCID = ""
	rawForCID, err := json.Marshal(snap)
	if err != nil {
		return err
	}
	cid := ContentCID(rawForCID)
	snap.RootCID = cid
	raw, err := json.Marshal(snap)
	if err != nil {
		return err
	}
	s.tenants[snap.Tenant.ID] = snap

	_ = os.MkdirAll(filepath.Join(s.dataDir, "tenants"), 0755)
	if err := os.WriteFile(s.pathTenant(snap.Tenant.ID), raw, 0644); err != nil {
		return err
	}
	cidDir := filepath.Join(s.dataDir, "cids")
	_ = os.MkdirAll(cidDir, 0755)
	_ = os.WriteFile(filepath.Join(cidDir, cid+".json"), raw, 0644)

	go s.pushDO(snap.Tenant.ID, raw)
	return nil
}

// VerifyStoredCID comprueba que el blob CID existe y deserializa.
func (s *Store) VerifyStoredCID(cid string) (*domain.StoreSnapshot, error) {
	snap, err := s.LoadCID(cid)
	if err != nil {
		return nil, err
	}
	if err := domain.ValidateSnapshotStructure(snap); err != nil {
		return nil, err
	}
	return snap, nil
}


// ContentCID genera un identificador content-addressable (compatible con flujo IPFS local).
func ContentCID(data []byte) string {
	h := sha256.Sum256(data)
	return "bafkrei" + hex.EncodeToString(h[:22])
}

func (s *Store) pushDO(tenantID string, raw []byte) {
	if s.doURL == "" {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 12*time.Second)
	defer cancel()
	url := strings.TrimRight(s.doURL, "/") + "/tenant/" + tenantID
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, url, bytes.NewReader(raw))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	if s.doToken != "" {
		req.Header.Set("Authorization", "Bearer "+s.doToken)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Println("⚠️ AbacoPhy DO push:", err)
		return
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, resp.Body)
}

func (s *Store) ListTenants() []domain.Tenant {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.Tenant, 0, len(s.tenants))
	for _, t := range s.tenants {
		out = append(out, t.Tenant)
	}
	return out
}

func (s *Store) DataDir() string { return s.dataDir }

func (s *Store) tokensPath() string {
	return filepath.Join(s.dataDir, "tokens.json")
}

func (s *Store) loadTokens() {
	b, err := os.ReadFile(s.tokensPath())
	if err != nil {
		return
	}
	// tokens.json contiene credenciales bearer: restringir permisos también
	// cuando el archivo proviene de una instalación anterior.
	_ = os.Chmod(s.tokensPath(), 0600)
	var m map[string]*domain.TokenSession
	if json.Unmarshal(b, &m) != nil {
		return
	}
	now := time.Now().UTC()
	removedExpired := false
	for k, t := range m {
		if t == nil || !now.Before(t.ExpiresAt) {
			removedExpired = true
			continue
		}
		s.tokens[k] = t
	}
	// No conservar sesiones expiradas en disco después de arrancar.
	if removedExpired {
		s.persistTokensLocked()
	}
}

func (s *Store) persistTokensLocked() {
	// caller holds s.mu
	clean := make(map[string]*domain.TokenSession, len(s.tokens))
	now := time.Now()
	for k, t := range s.tokens {
		if t != nil && now.Before(t.ExpiresAt) {
			clean[k] = t
		}
	}
	s.tokens = clean
	b, err := json.MarshalIndent(clean, "", "  ")
	if err != nil {
		return
	}
	tmp, err := os.CreateTemp(s.dataDir, ".tokens-*.tmp")
	if err != nil {
		return
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)
	if err := tmp.Chmod(0600); err != nil {
		_ = tmp.Close()
		return
	}
	if _, err := tmp.Write(b); err != nil {
		_ = tmp.Close()
		return
	}
	if err := tmp.Sync(); err != nil {
		_ = tmp.Close()
		return
	}
	if err := tmp.Close(); err != nil {
		return
	}
	if err := os.Rename(tmpName, s.tokensPath()); err != nil {
		return
	}
	_ = os.Chmod(s.tokensPath(), 0600)
}

func (s *Store) SaveToken(tok *domain.TokenSession) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.tokens[tok.Token] = tok
	s.persistTokensLocked()
}

func (s *Store) GetToken(token string) *domain.TokenSession {
	s.mu.Lock()
	defer s.mu.Unlock()
	t := s.tokens[token]
	if t == nil {
		return nil
	}
	if !time.Now().UTC().Before(t.ExpiresAt) {
		delete(s.tokens, token)
		s.persistTokensLocked()
		return nil
	}
	return t
}

func (s *Store) RevokeToken(token string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.tokens, token)
	s.persistTokensLocked()
}

// RevokeUserTokens invalida todas las sesiones de un usuario (cambio de rol/módulos/baja).
func (s *Store) RevokeUserTokens(userID string) int {
	if userID == "" {
		return 0
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	n := 0
	for tok, sess := range s.tokens {
		if sess != nil && sess.UserID == userID {
			delete(s.tokens, tok)
			n++
		}
	}
	if n > 0 {
		s.persistTokensLocked()
	}
	return n
}

// RevokeUserTokensExcept invalida las sesiones de un usuario salvo el token actual.
func (s *Store) RevokeUserTokensExcept(userID, keepToken string) int {
	if userID == "" { return 0 }
	s.mu.Lock()
	defer s.mu.Unlock()
	n := 0
	for token, sess := range s.tokens {
		if token != keepToken && sess != nil && sess.UserID == userID { delete(s.tokens, token); n++ }
	}
	if n > 0 { s.persistTokensLocked() }
	return n
}

// RevokeRoleTokens invalida sesiones de un rol dentro de un tenant (cambio de grants del rol).
func (s *Store) RevokeRoleTokens(tenantID, role string) int {
	if tenantID == "" || role == "" {
		return 0
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	n := 0
	for tok, sess := range s.tokens {
		if sess != nil && sess.TenantID == tenantID && sess.Role == role {
			delete(s.tokens, tok)
			n++
		}
	}
	if n > 0 {
		s.persistTokensLocked()
	}
	return n
}

// RevokeTenantTokens invalida todas las sesiones del tenant (p. ej. desactivar módulos masivos).
func (s *Store) RevokeTenantTokens(tenantID string) int {
	if tenantID == "" {
		return 0
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	n := 0
	for tok, sess := range s.tokens {
		if sess != nil && sess.TenantID == tenantID {
			delete(s.tokens, tok)
			n++
		}
	}
	if n > 0 {
		s.persistTokensLocked()
	}
	return n
}

func (s *Store) FindUserByUsername(username string) (*domain.User, *domain.StoreSnapshot) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	u := strings.ToLower(strings.TrimSpace(username))
	for _, snap := range s.tenants {
		if snap == nil {
			continue
		}
		for _, user := range snap.Users {
			if user == nil {
				continue
			}
			if strings.ToLower(user.Username) == u {
				return user, snap
			}
		}
	}
	return nil, nil
}

// ResolveTenant devuelve exclusivamente el snapshot identificado por tenantID.
// userID se conserva en la firma por compatibilidad, pero nunca se usa para
// descubrir o inferir el tenant: la pertenencia viene de la sesión autenticada.
func (s *Store) ResolveTenant(tenantID, _ string) *domain.StoreSnapshot {
	if strings.TrimSpace(tenantID) == "" {
		return nil
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.tenants[tenantID]
}


func (s *Store) LoadCID(cid string) (*domain.StoreSnapshot, error) {
	if cid == "" {
		return nil, fmt.Errorf("cid vacio")
	}
	path := filepath.Join(s.dataDir, "cids", cid+".json")
	b, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var snap domain.StoreSnapshot
	if err := json.Unmarshal(b, &snap); err != nil {
		return nil, err
	}
	return &snap, nil
}


// ResetAll elimina todos los tenants y tokens (reinicio de fábrica).
func (s *Store) ResetAll() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.tenants = make(map[string]*domain.StoreSnapshot)
	s.tokens = make(map[string]*domain.TokenSession)
	_ = os.Remove(s.tokensPath())
	_ = os.Remove(filepath.Join(s.dataDir, "bootstrap-credentials.txt"))
	dir := filepath.Join(s.dataDir, "tenants")
	entries, _ := os.ReadDir(dir)
	for _, e := range entries {
		if !e.IsDir() {
			_ = os.Remove(filepath.Join(dir, e.Name()))
		}
	}
	cidDir := filepath.Join(s.dataDir, "cids")
	cids, _ := os.ReadDir(cidDir)
	for _, e := range cids {
		if !e.IsDir() {
			_ = os.Remove(filepath.Join(cidDir, e.Name()))
		}
	}
	return nil
}


func (s *Store) ListTenantIDs() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]string, 0, len(s.tenants))
	for id := range s.tenants {
		out = append(out, id)
	}
	return out
}
