package store

import (
	"bytes"
	"errors"
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

// ErrTenantConflict indica que la nueva empresa colisiona con un ID, slug o username global.
var ErrTenantConflict = errors.New("conflicto de identidad global del tenant")

// Store: memoria + disco local + ancla CID (IPFS-style) + Durable Object opcional.
type Store struct {
	mu       sync.RWMutex
	tenants  map[string]*domain.StoreSnapshot // key = tenantID
	tokens   map[string]*domain.TokenSession
	dataDir  string
	initErr  error
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
	s.initErr = s.ensureDataDirs()
	if s.initErr == nil {
		s.loadAll()
		s.loadTokens()
	}
	return s
}

func (s *Store) pathTenant(id string) string {
	return filepath.Join(s.dataDir, "tenants", id+".json")
}

func (s *Store) loadAll() {
	dir := filepath.Join(s.dataDir, "tenants")
	if err := ensurePrivateDir(dir); err != nil { return }
	entries, err := os.ReadDir(dir)
	if err != nil {
		return
	}
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".json") {
			continue
		}
		id := strings.TrimSuffix(e.Name(), ".json")
		if !validStorageName(id) { continue }
		b, err := readPrivateFile(dir, e.Name())
		if err != nil {
			continue
		}
		var snap domain.StoreSnapshot
		if json.Unmarshal(b, &snap) != nil || snap.Tenant.ID == "" || snap.Tenant.ID != id {
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
	return s.putLocked(snap)
}

// putLocked persiste un snapshot; el caller debe mantener s.mu bloqueado.
func (s *Store) putLocked(snap *domain.StoreSnapshot) error {
	if snap == nil || !validStorageName(snap.Tenant.ID) {
		return fmt.Errorf("snapshot inválido")
	}
	if s.initErr != nil { return fmt.Errorf("directorio de datos no seguro: %w", s.initErr) }
	if err := s.ensureDataDirs(); err != nil { return err }
	// Defensa central: ninguna ruta puede persistir registros hijos con un
	// TenantID explícito distinto al del snapshot. Los registros legacy vacíos
	// se vinculan al tenant raíz antes de calcular CID y persistir.
	if err := domain.BindSnapshotToTenant(snap, snap.Tenant.ID); err != nil {
		return fmt.Errorf("snapshot fuera del tenant: %w", err)
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
	if err := writePrivateFileAtomic(filepath.Join(s.dataDir, "tenants"), snap.Tenant.ID+".json", raw); err != nil { return err }
	if err := writePrivateFileAtomic(filepath.Join(s.dataDir, "cids"), cid+".json", raw); err != nil { return err }
	// Publicar en memoria solo después de confirmar ambas escrituras.
	s.tenants[snap.Tenant.ID] = snap

	go s.pushDO(snap.Tenant.ID, raw)
	return nil
}

// CreateTenant aplica unicidad global de slug y usernames bajo el mismo lock
// que persiste el snapshot. Evita que dos altas master simultáneas superen
// comprobaciones previas y creen identidades globales ambiguas.
func (s *Store) CreateTenant(snap *domain.StoreSnapshot) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if snap == nil || !validStorageName(snap.Tenant.ID) || strings.TrimSpace(snap.Tenant.Slug) == "" {
		return fmt.Errorf("tenant inválido")
	}
	if _, exists := s.tenants[snap.Tenant.ID]; exists {
		return fmt.Errorf("%w: tenant ID ya existe", ErrTenantConflict)
	}
	slug := strings.ToLower(strings.TrimSpace(snap.Tenant.Slug))
	usernames := make(map[string]struct{}, len(snap.Users))
	for _, user := range snap.Users {
		if user == nil { continue }
		username := strings.ToLower(strings.TrimSpace(user.Username))
		if username == "" { continue }
		if _, duplicate := usernames[username]; duplicate {
			return fmt.Errorf("%w: username duplicado dentro del tenant", ErrTenantConflict)
		}
		usernames[username] = struct{}{}
	}
	for _, existing := range s.tenants {
		if existing == nil { continue }
		if strings.ToLower(strings.TrimSpace(existing.Tenant.Slug)) == slug {
			return fmt.Errorf("%w: slug de tenant ya existe", ErrTenantConflict)
		}
		for _, user := range existing.Users {
			if user == nil { continue }
			if _, duplicate := usernames[strings.ToLower(strings.TrimSpace(user.Username))]; duplicate {
				return fmt.Errorf("%w: username ya existe globalmente", ErrTenantConflict)
			}
		}
	}
	return s.putLocked(snap)
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
	b, err := readPrivateFile(s.dataDir, "tokens.json")
	if err != nil {
		return
	}
	// tokens.json contiene credenciales bearer: restringir permisos también
	// cuando el archivo proviene de una instalación anterior.
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
	_ = writePrivateFileAtomic(s.dataDir, "tokens.json", b)
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

// UsernameExists aplica unicidad global porque el endpoint de login no recibe
// un tenant selector. La comparación es insensible a mayúsculas y espacios externos.
func (s *Store) UsernameExists(username string) bool {
	normalized := strings.ToLower(strings.TrimSpace(username))
	if normalized == "" { return false }
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, snap := range s.tenants {
		if snap == nil { continue }
		for _, user := range snap.Users {
			if user != nil && strings.ToLower(strings.TrimSpace(user.Username)) == normalized {
				return true
			}
		}
	}
	return false
}

// UserMatch representa una coincidencia de username y su snapshot propietario.
type UserMatch struct {
	User *domain.User
	Snapshot *domain.StoreSnapshot
}

// FindUsersByUsername devuelve todas las coincidencias globales normalizadas.
// El login compara la contraseña contra todas y solo acepta una coincidencia activa.
func (s *Store) FindUsersByUsername(username string) []UserMatch {
	normalized := strings.ToLower(strings.TrimSpace(username))
	if normalized == "" { return nil }
	s.mu.RLock()
	defer s.mu.RUnlock()
	matches := make([]UserMatch, 0, 1)
	for _, snap := range s.tenants {
		if snap == nil { continue }
		for _, user := range snap.Users {
			if user != nil && strings.ToLower(strings.TrimSpace(user.Username)) == normalized {
				matches = append(matches, UserMatch{User: user, Snapshot: snap})
			}
		}
	}
	return matches
}

// FindUserByUsername falla cerrado si el nombre está duplicado entre tenants.
// Elegir arbitrariamente el primer snapshot podía autenticar la identidad equivocada.
func (s *Store) FindUserByUsername(username string) (*domain.User, *domain.StoreSnapshot) {
	normalized := strings.ToLower(strings.TrimSpace(username))
	if normalized == "" { return nil, nil }
	s.mu.RLock()
	defer s.mu.RUnlock()
	var foundUser *domain.User
	var foundSnap *domain.StoreSnapshot
	for _, snap := range s.tenants {
		if snap == nil { continue }
		for _, user := range snap.Users {
			if user == nil || strings.ToLower(strings.TrimSpace(user.Username)) != normalized { continue }
			if foundUser != nil { return nil, nil }
			foundUser, foundSnap = user, snap
		}
	}
	return foundUser, foundSnap
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
	if cid == "" || len(cid) > 128 || strings.TrimSpace(cid) != cid {
		return nil, fmt.Errorf("cid invalido")
	}
	for _, r := range cid {
		if !((r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_') {
			return nil, fmt.Errorf("cid invalido")
		}
	}
	if s.initErr != nil { return nil, fmt.Errorf("directorio de datos no seguro: %w", s.initErr) }
	if err := s.ensureDataDirs(); err != nil { return nil, err }
	raw, err := readPrivateFile(filepath.Join(s.dataDir, "cids"), cid+".json")
	if err != nil {
		return nil, err
	}
	var snap domain.StoreSnapshot
	if err := json.Unmarshal(raw, &snap); err != nil {
		return nil, fmt.Errorf("contenido CID ilegible: %w", err)
	}
	if snap.RootCID != cid {
		return nil, fmt.Errorf("CID raíz no coincide con el identificador solicitado")
	}

	// Store.Put calcula el CID sobre el snapshot serializado con RootCID vacío.
	// Repetimos exactamente esa canonicalización para detectar blobs sustituidos
	// o modificados en disco antes de devolverlos a cualquier restauración.
	storedCID := snap.RootCID
	snap.RootCID = ""
	canonical, err := json.Marshal(&snap)
	if err != nil {
		return nil, fmt.Errorf("no se pudo canonicalizar el snapshot CID: %w", err)
	}
	if ContentCID(canonical) != storedCID {
		return nil, fmt.Errorf("integridad CID inválida: el contenido no corresponde al identificador")
	}
	snap.RootCID = storedCID
	return &snap, nil
}


// ResetAll elimina todos los tenants y tokens (reinicio de fábrica).
func (s *Store) ResetAll() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.initErr != nil { return s.initErr }
	if err := s.ensureDataDirs(); err != nil { return err }
	s.tenants = make(map[string]*domain.StoreSnapshot)
	s.tokens = make(map[string]*domain.TokenSession)
	root, err := openRootForPath(s.dataDir)
	if err != nil { return err }
	defer root.Close()
	// Root.Remove unlinks entries relative to the pinned data directory and
	// cannot follow a swapped parent path outside that directory.
	for _, name := range []string{"tokens.json", "bootstrap-credentials.txt"} {
		if err := root.Remove(name); err != nil && !os.IsNotExist(err) { return err }
	}
	for _, dirName := range []string{"tenants", "cids"} {
		dirRoot, err := root.OpenRoot(dirName)
		if err != nil { return err }
		dirFile, err := dirRoot.Open(".")
		if err != nil { _ = dirRoot.Close(); return err }
		entries, err := dirFile.ReadDir(-1)
		_ = dirFile.Close()
		if err != nil { _ = dirRoot.Close(); return err }
		for _, entry := range entries {
			if entry.IsDir() { continue }
			if err := dirRoot.Remove(entry.Name()); err != nil && !os.IsNotExist(err) {
				_ = dirRoot.Close()
				return err
			}
		}
		_ = dirRoot.Close()
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
