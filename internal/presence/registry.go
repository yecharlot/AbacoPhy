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
	TenantID   string    `json:"-"`
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

// TouchResult describe el efecto del Touch para logging visible.
type TouchResult struct {
	Created         bool
	SessionAttached bool // pasó de sin sesión a con sesión
	Key             string
	OnlineCount     int
}

// Touch actualiza o crea la ficha del cliente. key estable = instance_id o anon:ip.
func (r *Registry) Touch(c Client) TouchResult {
	res := TouchResult{}
	if r == nil {
		return res
	}
	key := strings.TrimSpace(c.InstanceID)
	if key == "" {
		key = AnonymousPrefix + c.RemoteIP
		if key == AnonymousPrefix {
			key = AnonymousPrefix + "unknown"
		}
		c.InstanceID = key
	}
	res.Key = key
	now := time.Now().UTC()
	r.mu.Lock()
	defer r.mu.Unlock()
	existing, ok := r.clients[key]
	if !ok {
		c.FirstSeen = now
		c.LastSeen = now
		cp := c
		r.clients[key] = &cp
		res.Created = true
		res.OnlineCount = r.countLocked(now)
		return res
	}
	wasSession := existing.HasSession
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
		if c.TenantID != "" {
			existing.TenantID = c.TenantID
		}
		if c.UserID != "" {
			existing.UserID = c.UserID
		}
		if c.Username != "" {
			existing.Username = c.Username
		}
		if !wasSession {
			res.SessionAttached = true
		}
	}
	res.OnlineCount = r.countLocked(now)
	return res
}

func (r *Registry) countLocked(now time.Time) int {
	cutoff := now.Add(-OnlineTTL)
	n := 0
	for _, c := range r.clients {
		if !c.LastSeen.Before(cutoff) {
			n++
		}
	}
	return n
}

// AttachSession marca usuario autenticado sobre un instance_id (o anon:ip).
func (r *Registry) AttachSession(instanceID, remoteIP, tenantID, userID, username string) {
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
		existing.TenantID = tenantID
		existing.UserID = userID
		existing.Username = username
		existing.LastSeen = now
		return
	}
	r.clients[key] = &Client{
		InstanceID: key,
		TenantID:   tenantID,
		RemoteIP:   remoteIP,
		UserID:     userID,
		Username:   username,
		HasSession: true,
		FirstSeen:  now,
		LastSeen:   now,
	}
}

// CountOnline número de clientes dentro del TTL.
func (r *Registry) CountOnline(now time.Time) int {
	if r == nil {
		return 0
	}
	if now.IsZero() {
		now = time.Now().UTC()
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.countLocked(now)
}

// ListOnline devuelve todos los clientes vistos en OnlineTTL (uso interno).
func (r *Registry) ListOnline(now time.Time) []Client {
	return r.listOnline(now, "")
}

// ListOnlineForTenant limita la presencia al tenant de la sesión solicitante.
func (r *Registry) ListOnlineForTenant(tenantID string, now time.Time) []Client {
	if strings.TrimSpace(tenantID) == "" {
		return nil
	}
	return r.listOnline(now, tenantID)
}

func (r *Registry) listOnline(now time.Time, tenantID string) []Client {
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
		if tenantID == "" || c.TenantID == tenantID {
			out = append(out, *c)
		}
	}
	return out
}

// SummaryLine texto único para consola del orquestador.
func (r *Registry) SummaryLine(now time.Time) string {
	list := r.ListOnline(now)
	if len(list) == 0 {
		return "presence: online=0"
	}
	parts := make([]string, 0, len(list))
	for _, c := range list {
		label := c.Platform
		if label == "" {
			label = "?"
		}
		id := c.InstanceID
		if len(id) > 12 {
			id = id[:8] + "…"
		}
		user := "sin-sesión"
		if c.HasSession && c.Username != "" {
			user = c.Username
		} else if c.HasSession {
			user = "sesión"
		}
		parts = append(parts, label+"|"+id+"@"+c.RemoteIP+"("+user+")")
	}
	return "presence: online=" + itoa(len(list)) + " → " + strings.Join(parts, " · ")
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b [16]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}

// ShouldTrackPath evita ruido de estáticos/PWA; solo API y health/info.
func ShouldTrackPath(path string) bool {
	if strings.HasPrefix(path, "/api/") {
		return true
	}
	return false
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
func SnapshotFromRequest(r *http.Request, tenantID, userID, username string, hasSession bool) Client {
	id := strings.TrimSpace(r.Header.Get(HeaderClientID))
	platform := strings.TrimSpace(r.Header.Get(HeaderClientApp))
	if platform == "" {
		platform = "unknown"
	}
	return Client{
		InstanceID: id,
		TenantID:   tenantID,
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
