package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/yecharlot/AbacoPhy/internal/store"
)

func TestCORSAllowlistMatchesIPSubnetAndPort(t *testing.T) {
	rules, err := parseCORSRules(`["10.10.10.10","10.10.10.0/24:8080","panel.example.com:8443"]`)
	if err != nil {
		t.Fatal(err)
	}
	cases := []struct {
		origin string
		want   bool
	}{
		{"http://10.10.10.10:3000", true},
		{"https://10.10.10.10:9443", true},
		{"http://10.10.10.11:3000", false},
		{"http://10.10.10.20:8080", true},
		{"https://10.10.10.20:8080", true},
		{"http://10.10.10.20:8081", false},
		{"https://panel.example.com:8443", true},
		{"http://panel.example.com:8443", true},
		{"https://sub.panel.example.com:8443", false},
		{"null", false},
	}
	for _, tc := range cases {
		t.Run(tc.origin, func(t *testing.T) {
			got := false
			for _, rule := range rules {
				if rule.matches(tc.origin) {
					got = true
					break
				}
			}
			if got != tc.want {
				t.Fatalf("matches(%q) = %v, want %v", tc.origin, got, tc.want)
			}
		})
	}
}

func TestParseCORSRulesRejectsInvalidEntries(t *testing.T) {
	for _, raw := range []string{
		`["10.10.10.10:0"]`,
		`["10.10.10.10:65536"]`,
		`["10.10.10.0/33"]`,
		`["*.example.com"]`,
		`["https://example.com"]`,
		`["example.com/path"]`,
		`["2001:db8::1"]`,
		`not-json`,
	} {
		if _, err := parseCORSRules(raw); err == nil {
			t.Errorf("expected invalid rules to be rejected: %s", raw)
		}
	}
}

func TestHandlerUsesConfiguredCORSAllowlist(t *testing.T) {
	t.Setenv(corsAllowlistEnv, `["10.10.10.0/24:8080"]`)
	server := NewServer(store.New(t.TempDir()), t.TempDir())
	handler := server.Handler()

	t.Run("allowed origin receives exact CORS grant", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
		req.Header.Set("Origin", "http://10.10.10.25:8080")
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://10.10.10.25:8080" {
			t.Fatalf("expected exact allowed origin, got %q", got)
		}
	})

	t.Run("wrong port receives no CORS grant", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
		req.Header.Set("Origin", "http://10.10.10.25:8081")
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		assertNoCORSHeaders(t, rec)
	})

	t.Run("allowed preflight succeeds", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodOptions, "/api/v1/auth/login", nil)
		req.Header.Set("Origin", "http://10.10.10.25:8080")
		req.Header.Set("Access-Control-Request-Method", http.MethodPost)
		req.Header.Set("Access-Control-Request-Headers", "content-type")
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusNoContent {
			t.Fatalf("expected 204 for allowed preflight, got %d", rec.Code)
		}
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://10.10.10.25:8080" {
			t.Fatalf("expected exact preflight origin, got %q", got)
		}
	})

	t.Run("disallowed preflight is rejected", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodOptions, "/api/v1/auth/login", nil)
		req.Header.Set("Origin", "http://10.10.10.25:8081")
		req.Header.Set("Access-Control-Request-Method", http.MethodPost)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusForbidden {
			t.Fatalf("expected 403 for disallowed preflight, got %d", rec.Code)
		}
		assertNoCORSHeaders(t, rec)
	})
}

func TestEmptyCORSAllowlistKeepsSameOriginOnly(t *testing.T) {
	t.Setenv(corsAllowlistEnv, "")
	server := NewServer(store.New(t.TempDir()), t.TempDir())
	handler := server.Handler()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected same-origin health request to succeed, got %d", rec.Code)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("empty allowlist must not grant CORS, got %q", got)
	}
}

func assertNoCORSHeaders(t *testing.T, rec *httptest.ResponseRecorder) {
	t.Helper()
	for _, header := range []string{
		"Access-Control-Allow-Origin",
		"Access-Control-Allow-Methods",
		"Access-Control-Allow-Headers",
		"Access-Control-Allow-Credentials",
	} {
		if got := rec.Header().Get(header); got != "" {
			t.Errorf("expected no %s header, got %q", header, got)
		}
	}
}
