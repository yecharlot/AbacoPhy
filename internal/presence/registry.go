package presence

import (
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

const (
	HeaderClientID   = "X-AbacoPhy-Client-Id"
	HeaderClientApp  = "X-AbacoPhy-Client"
	HeaderOfflineRev = "X-Offline-Rev"
	AnonymousPrefix  = "anon:"
	// TTL visual: sin tráfico se considera ausente (lista en vivo).
	OnlineTTL = 5 * time.Minute
)

// Client es un terminal/proceso que habla con el API (con o sin sesión).
type Client struct {
	InstanceID string    `json:"instance_id"`
	Platform   string    `json:"platform"`
	UserAgent  string    `json:"user_agent,omitempty"`
	RemoteIP   string    `json:"remote_ip"`
	UserID     string    `json:"user_id,omitempty"`
	Username   string    `json:"username,omitempty"`
	HasSession bool      `json:"has_session"`
	FirstSeen  time.Time `json:"first_seen"`
	LastSeen   time.Time `json:"last_seen"`
	LastPath   string    `json:"last_path,omitempty"`
	LastMethod string    `json:"last_method,omitempty"`
}

// Registry en memoria (proceso). No requiere esquema de store.
type Registry struct {
	mu      sync.Mutex
	clients map[string]*Client
}

func NewRegistry() *Registry {
	return &Registry{clients: make(map[string]*Client)}
}

// Touch actualiza o crea la ficha del cliente. key estable = instance_id o anon:ip.
func (r *Registry) Touch(c Client) (created bool) {
	if r == nil {
		return false
	}
	key := strings.TrimSpace(c.InstanceID)
	if key == "" {
		key = AnonymousPrefix + c.RemoteIP
		if key == AnonymousPrefix {
			key = AnonymousPrefix + "unknown"
		}
		c.InstanceID = key
	}
	now := time.Now().UTC()
	r.mu.Lock()
	defer r.mu.Unlock()
	existing, ok := r.clients[key]
	if !ok {
		c.FirstSeen = now
		c.LastSeen = now
		cp := c
		r.clients[key] = &cp
		return true
	}
	existing.LastSeen = now
	if c.Platform != "" {
		existing.Platform = c.Platform
	}
	if c.UserAgent != "" {
		existing.UserAgent = c.UserAgent
	}
	if c.RemoteIP != "" {
		existing.RemoteIP = c.RemoteIP
	}
	if c.LastPath != "" {
		existing.LastPath = c.LastPath
	}
	if c.LastMethod != "" {
		existing.LastMethod = c.LastMethod
	}
	if c.HasSession {
		existing.HasSession = true
		if c.UserID != "" {
			existing.UserID = c.UserID
		}
		if c.Username != "" {
			existing.Username = c.Username
		}
	}
	return false
}

// AttachSession marca usuario autenticado sobre un instance_id (o anon:ip).
func (r *Registry) AttachSession(instanceID, remoteIP, userID, username string) {
	if r == nil {
		return
	}
	key := strings.TrimSpace(instanceID)
	if key == "" {
		key = AnonymousPrefix + remoteIP
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	now := time.Now().UTC()
	if existing, ok := r.clients[key]; ok {
		existing.HasSession = true
		existing.UserID = userID
		existing.Username = username
		existing.LastSeen = now
		return
	}
	r.clients[key] = &Client{
		InstanceID: key,
		RemoteIP:   remoteIP,
		UserID:     userID,
		Username:   username,
		HasSession: true,
		FirstSeen:  now,
		LastSeen:   now,
	}
}

// ListOnline devuelve clientes vistos en OnlineTTL.
func (r *Registry) ListOnline(now time.Time) []Client {
	if r == nil {
		return nil
	}
	if now.IsZero() {
		now = time.Now().UTC()
	}
	cutoff := now.Add(-OnlineTTL)
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]Client, 0, len(r.clients))
	for k, c := range r.clients {
		if c.LastSeen.Before(cutoff) {
			delete(r.clients, k)
			continue
		}
		out = append(out, *c)
	}
	return out
}

// ClientIP extrae IP de RemoteAddr / X-Forwarded-For (primer hop).
func ClientIP(r *http.Request) string {
	if r == nil {
		return ""
	}
	if xff := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// SnapshotFromRequest construye un Client a partir de headers HTTP.
func SnapshotFromRequest(r *http.Request, userID, username string, hasSession bool) Client {
	id := strings.TrimSpace(r.Header.Get(HeaderClientID))
	platform := strings.TrimSpace(r.Header.Get(HeaderClientApp))
	if platform == "" {
		platform = "unknown"
	}
	return Client{
		InstanceID: id,
		Platform:   platform,
		UserAgent:  truncate(r.UserAgent(), 160),
		RemoteIP:   ClientIP(r),
		UserID:     userID,
		Username:   username,
		HasSession: hasSession,
		LastPath:   r.URL.Path,
		LastMethod: r.Method,
	}
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}
