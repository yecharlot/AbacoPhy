package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
)

const discoveryAPIVersion = 1

// WithDiscoveryInfo enriches the existing /api/v1/info response with the
// public identity and compatibility metadata used by discovery clients.
// The existing response remains the source of legacy metadata so current
// clients are not broken during the migration.
func WithDiscoveryInfo(next http.Handler, instanceID string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v1/info" || r.Method != http.MethodGet {
			next.ServeHTTP(w, r)
			return
		}

		recorder := httptest.NewRecorder()
		next.ServeHTTP(recorder, r)

		var payload map[string]any
		if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
			// Preserve the original response if the legacy handler ever stops
			// returning JSON; discovery must not break the endpoint itself.
			copyResponse(w, recorder)
			return
		}

		payload["product"] = "AbacoPhy"
		payload["instanceId"] = instanceID
		payload["apiVersion"] = discoveryAPIVersion
		payload["capabilities"] = []string{"web", "pos", "offline", "sync"}
		// Pairing is introduced in the security phase. Advertising true here
		// would claim a security capability that is not implemented yet.
		payload["pairingRequired"] = false

		writeJSON(w, recorder.Code, payload)
	})
}

func copyResponse(w http.ResponseWriter, recorder *httptest.ResponseRecorder) {
	for key, values := range recorder.Header() {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}
	w.WriteHeader(recorder.Code)
	_, _ = w.Write(recorder.Body.Bytes())
}
