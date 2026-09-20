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
	snap.UpdatedAt = time.Now().UTC()
	snap.Rev++
	// CID content-addressable del snapshot
	raw, err := json.Marshal(snap)
	if err != nil {
		return err
	}
	cid := ContentCID(raw)
	snap.RootCID = cid
	s.tenants[snap.Tenant.ID] = snap

	_ = os.MkdirAll(filepath.Join(s.dataDir, "tenants"), 0755)
	if err := os.WriteFile(s.pathTenant(snap.Tenant.ID), raw, 0644); err != nil {
		return err
	}
	// bloque CID local (estilo IPFS)
	cidDir := filepath.Join(s.dataDir, "cids")
	_ = os.MkdirAll(cidDir, 0755)
	_ = os.WriteFile(filepath.Join(cidDir, cid+".json"), raw, 0644)

	go s.pushDO(snap.Tenant.ID, raw)
	return nil
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

func (s *Store) tokensPath() string {
	return filepath.Join(s.dataDir, "tokens.json")
}

func (s *Store) loadTokens() {
	b, err := os.ReadFile(s.tokensPath())
	if err != nil {
		return
	}
	var m map[string]*domain.TokenSession
	if json.Unmarshal(b, &m) != nil {
		return
	}
	now := time.Now()
	for k, t := range m {
		if t == nil || now.After(t.ExpiresAt) {
			continue
		}
		s.tokens[k] = t
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
	_ = os.WriteFile(s.tokensPath(), b, 0600)
}

func (s *Store) SaveToken(tok *domain.TokenSession) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.tokens[tok.Token] = tok
	s.persistTokensLocked()
}

func (s *Store) GetToken(token string) *domain.TokenSession {
	s.mu.RLock()
	defer s.mu.RUnlock()
	t := s.tokens[token]
	if t == nil || time.Now().After(t.ExpiresAt) {
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

// ResolveTenant devuelve el snapshot del tenant o, si el id no existe, busca por userID.
func (s *Store) ResolveTenant(tenantID, userID string) *domain.StoreSnapshot {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if tenantID != "" {
		if snap := s.tenants[tenantID]; snap != nil {
			return snap
		}
	}
	if userID != "" {
		for _, snap := range s.tenants {
			if snap == nil {
				continue
			}
			if u := snap.Users[userID]; u != nil {
				return snap
			}
		}
	}
	// último recurso: único tenant
	if len(s.tenants) == 1 {
		for _, snap := range s.tenants {
			return snap
		}
	}
	return nil
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
