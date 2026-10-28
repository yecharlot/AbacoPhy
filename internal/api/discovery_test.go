package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestWithDiscoveryInfoEnrichesLegacyInfo(t *testing.T) {
	legacy := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{
			"name":    "ÁbacoPhy",
			"version": "0.1.0",
			"offline": true,
		})
	})

	h := WithDiscoveryInfo(legacy, "0123456789abcdef0123456789abcdef")
	req := httptest.NewRequest(http.MethodGet, "/api/v1/info", nil)
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusOK)
	}

	var body map[string]any
	if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if body["name"] != "ÁbacoPhy" || body["version"] != "0.1.0" || body["offline"] != true {
		t.Fatalf("legacy metadata was not preserved: %#v", body)
	}
	if body["product"] != "AbacoPhy" {
		t.Fatalf("product = %#v", body["product"])
	}
	if body["instanceId"] != "0123456789abcdef0123456789abcdef" {
		t.Fatalf("instanceId = %#v", body["instanceId"])
	}
	if body["apiVersion"] != float64(discoveryAPIVersion) {
		t.Fatalf("apiVersion = %#v", body["apiVersion"])
	}
	if body["pairingRequired"] != false {
		t.Fatalf("pairingRequired = %#v", body["pairingRequired"])
	}
}

func TestWithDiscoveryInfoDoesNotInterceptOtherRoutes(t *testing.T) {
	called := false
	legacy := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		writeJSON(w, http.StatusNoContent, nil)
	})

	h := WithDiscoveryInfo(legacy, "instance")
	req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)

	if !called {
		t.Fatal("legacy handler was not called")
	}
	if res.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusNoContent)
	}
}
