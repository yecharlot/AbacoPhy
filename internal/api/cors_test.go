package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/yecharlot/AbacoPhy/internal/store"
)

func TestHandlerDoesNotEnableCrossOriginRequests(t *testing.T) {
	server := NewServer(store.New(t.TempDir()), t.TempDir())
	handler := server.Handler()

	t.Run("same-origin request remains available", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected same-origin health request to succeed, got %d", rec.Code)
		}
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
			t.Fatalf("same-origin response must not need CORS, got ACAO %q", got)
		}
	})

	t.Run("untrusted origin receives no CORS permission", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
		req.Header.Set("Origin", "https://untrusted.example")
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected API handler to respond normally, got %d", rec.Code)
		}
		assertNoCORSHeaders(t, rec)
	})

	t.Run("cross-origin preflight is not authorized", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodOptions, "/api/v1/auth/login", nil)
		req.Header.Set("Origin", "https://untrusted.example")
		req.Header.Set("Access-Control-Request-Method", http.MethodPost)
		req.Header.Set("Access-Control-Request-Headers", "content-type")
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		assertNoCORSHeaders(t, rec)
	})
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
