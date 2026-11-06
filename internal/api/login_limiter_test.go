package api

import (
	"net/http/httptest"
	"testing"
	"time"
)

func TestLoginLimiterProgressiveBackoffAndReset(t *testing.T) {
	limiter := newLoginAttemptLimiter()
	now := time.Date(2026, 11, 6, 12, 0, 0, 0, time.UTC)
	for i := 0; i < 2; i++ {
		if got := limiter.retryAfter("192.0.2.10", "admin", now); got != 0 {
			t.Fatalf("attempt %d unexpectedly blocked: %s", i+1, got)
		}
		limiter.recordFailure("192.0.2.10", "admin", now)
	}
	if got := limiter.retryAfter("192.0.2.10", "admin", now); got != 0 {
		t.Fatalf("first two failures should not block, got %s", got)
	}
	limiter.recordFailure("192.0.2.10", "admin", now)
	if got := limiter.retryAfter("192.0.2.10", "admin", now); got != time.Second {
		t.Fatalf("third failure backoff = %s, want 1s", got)
	}
	limiter.recordFailure("192.0.2.10", "admin", now.Add(time.Second))
	if got := limiter.retryAfter("192.0.2.10", "ADMIN", now.Add(time.Second)); got != 2*time.Second {
		t.Fatalf("fourth failure backoff = %s, want 2s", got)
	}
	limiter.recordSuccess("admin")
	if got := limiter.retryAfter("192.0.2.10", "admin", now.Add(2*time.Second)); got != 0 {
		t.Fatalf("successful login must reset username backoff, got %s", got)
	}
}

func TestLoginLimiterIndependentIPAndUsernameBuckets(t *testing.T) {
	limiter := newLoginAttemptLimiter()
	now := time.Now()
	for i := 0; i < loginIPFailureLimit; i++ {
		limiter.recordFailure("192.0.2.20", "user-"+string(rune('a'+i%20)), now)
	}
	if got := limiter.retryAfter("192.0.2.20", "different-user", now); got == 0 {
		t.Fatal("IP bucket should throttle even when username changes")
	}
	if got := limiter.retryAfter("192.0.2.21", "different-user", now); got != 0 {
		t.Fatalf("independent IP should not be blocked, got %s", got)
	}
}

func TestRemoteIPFromRequestIgnoresSpoofedForwardedHeader(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/auth/login", nil)
	req.RemoteAddr = "198.51.100.23:43210"
	req.Header.Set("X-Forwarded-For", "203.0.113.99")
	if got := remoteIPFromRequest(req); got != "198.51.100.23" {
		t.Fatalf("remote IP = %q, want direct peer IP", got)
	}
}

func TestLoginLimiterExpiresOldState(t *testing.T) {
	limiter := newLoginAttemptLimiter()
	now := time.Now()
	limiter.recordFailure("192.0.2.30", "old-user", now)
	if got := limiter.retryAfter("192.0.2.30", "old-user", now.Add(loginUserWindow+time.Second)); got != 0 {
		t.Fatalf("expired state still blocks: %s", got)
	}
}

func TestLoginLimiterCapsTrackedKeys(t *testing.T) {
	limiter := newLoginAttemptLimiter()
	now := time.Now()
	for i := 0; i <= loginMaxEntries; i++ {
		ip := "192.0.2." + string(rune(0x100+i))
		username := "unique-user-" + string(rune(0x100+i))
		limiter.recordFailure(ip, username, now)
	}
	if len(limiter.ips) > loginMaxEntries || len(limiter.users) > loginMaxEntries {
		t.Fatalf("limiter maps exceeded hard cap: ips=%d users=%d", len(limiter.ips), len(limiter.users))
	}
}
