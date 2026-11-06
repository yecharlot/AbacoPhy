package api

import (
	"crypto/sha256"
	"encoding/hex"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

const (
	loginIPFailureLimit = 30
	loginIPWindow       = 5 * time.Minute
	loginUserWindow     = 15 * time.Minute
	loginMaxBackoff     = 30 * time.Second
	loginMaxEntries     = 10000
)

type loginIPState struct {
	failures []time.Time
	lastSeen time.Time
}

type loginUserState struct {
	failures    int
	windowStart time.Time
	blockedUntil time.Time
	lastSeen    time.Time
}

// loginAttemptLimiter aplica dos límites independientes: origen de red y
// nombre de usuario. Vive en memoria y no persiste bloqueos entre reinicios.
type loginAttemptLimiter struct {
	mu    sync.Mutex
	ips   map[string]*loginIPState
	users map[string]*loginUserState
}

func newLoginAttemptLimiter() *loginAttemptLimiter {
	return &loginAttemptLimiter{
		ips: make(map[string]*loginIPState),
		users: make(map[string]*loginUserState),
	}
}

func normalizeLoginUsername(username string) string {
	return strings.ToLower(strings.TrimSpace(username))
}

func (l *loginAttemptLimiter) retryAfter(ip, username string, now time.Time) time.Duration {
	if l == nil {
		return 0
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	l.pruneLocked(now)
	if state := l.ips[ip]; state != nil {
		cutoff := now.Add(-loginIPWindow)
		active := 0
		for _, at := range state.failures {
			if at.After(cutoff) {
				active++
			}
		}
		if active >= loginIPFailureLimit {
			return loginIPWindow
		}
	}
	if state := l.users[normalizeLoginUsername(username)]; state != nil && now.Before(state.blockedUntil) {
		return state.blockedUntil.Sub(now)
	}
	return 0
}

func (l *loginAttemptLimiter) recordFailure(ip, username string, now time.Time) {
	if l == nil {
		return
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	l.pruneLocked(now)

	ipState := l.ips[ip]
	if ipState == nil {
		ipState = &loginIPState{}
		l.ips[ip] = ipState
	}
	cutoff := now.Add(-loginIPWindow)
	active := ipState.failures[:0]
	for _, at := range ipState.failures {
		if at.After(cutoff) {
			active = append(active, at)
		}
	}
	ipState.failures = append(active, now)
	ipState.lastSeen = now

	key := normalizeLoginUsername(username)
	if key == "" {
		key = "<empty>"
	}
	state := l.users[key]
	if state == nil || now.Sub(state.windowStart) > loginUserWindow {
		state = &loginUserState{windowStart: now}
		l.users[key] = state
	}
	state.failures++
	state.lastSeen = now
	if state.failures >= 3 {
		delay := time.Second << min(state.failures-3, 5)
		if delay > loginMaxBackoff {
			delay = loginMaxBackoff
		}
		state.blockedUntil = now.Add(delay)
	}
}

func (l *loginAttemptLimiter) recordSuccess(username string) {
	if l == nil {
		return
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.users, normalizeLoginUsername(username))
}

func (l *loginAttemptLimiter) pruneLocked(now time.Time) {
	for key, state := range l.ips {
		if state == nil || now.Sub(state.lastSeen) > loginIPWindow {
			delete(l.ips, key)
		}
	}
	for key, state := range l.users {
		if state == nil || now.Sub(state.lastSeen) > loginUserWindow {
			delete(l.users, key)
		}
	}
	// Defensa de memoria ante muchas claves aleatorias. Evita crecimiento ilimitado.
	if len(l.ips) > loginMaxEntries {
		for key, state := range l.ips {
			if state == nil || now.Sub(state.lastSeen) > loginIPWindow/2 {
				delete(l.ips, key)
			}
		}
	}
	if len(l.users) > loginMaxEntries {
		for key, state := range l.users {
			if state == nil || now.Sub(state.lastSeen) > loginUserWindow/2 {
				delete(l.users, key)
			}
		}
	}
}

// No confiar en X-Forwarded-For: sin una lista explícita de proxies confiables,
// cualquier cliente podría falsificar la IP y evadir el límite.
func remoteIPFromRequest(r *http.Request) string {
	if r == nil {
		return "unknown"
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil {
		return host
	}
	if ip := net.ParseIP(r.RemoteAddr); ip != nil {
		return ip.String()
	}
	return "unknown"
}

func loginUsernameTag(username string) string {
	sum := sha256.Sum256([]byte(normalizeLoginUsername(username)))
	return hex.EncodeToString(sum[:6])
}
