package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// handleEvents sirve un canal SSE autenticado y confinado al tenant de la sesión.
// La sesión se revalida durante toda la conexión: revocación, expiración, baja,
// cambio de rol o cambio de permisos terminan el stream antes de entregar más eventos.
func (s *Server) handleEvents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "método no permitido"})
		return
	}
	sess, err := s.sess(r)
	if err != nil || sess == nil || sess.TenantID == "" || sess.UserID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "no autorizado"})
		return
	}
	if s.Hub == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "eventos no disponibles"})
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "streaming no soportado"})
		return
	}

	// Suscribir antes de enviar connected evita perder eventos publicados durante
	// el establecimiento de la respuesta.
	hub := s.Hub
	ch := hub.Subscribe(sess.TenantID)
	if ch == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "eventos no disponibles"})
		return
	}
	defer hub.Unsubscribe(sess.TenantID, ch)

	w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-store, private")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)
	flusher.Flush()

	writeSSE := func(event string, payload any) {
		data, err := json.Marshal(payload)
		if err != nil {
			data = []byte("{}")
		}
		if event != "" {
			_, _ = fmt.Fprintf(w, "event: %s\n", event)
		}
		_, _ = fmt.Fprintf(w, "data: %s\n\n", data)
		flusher.Flush()
	}
	writeSSE("connected", map[string]any{
		"ok":       true,
		"tenantId": sess.TenantID,
		"userId":   sess.UserID,
		"ts":       time.Now().UTC().Format(time.RFC3339),
	})

	// No basta con autenticar una vez al abrir un stream largo. Se consulta
	// Store en cada evento y keepalive, para que una revocación no mantenga
	// indefinidamente una conexión autorizada con credenciales ya inválidas.
	sessionStillValid := func() bool {
		current, err := s.sess(r)
		return err == nil && current != nil &&
			current.Token == sess.Token &&
			current.TenantID == sess.TenantID &&
			current.UserID == sess.UserID
	}

	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-r.Context().Done():
			return
		case <-ticker.C:
			if !sessionStillValid() {
				return
			}
			writeSSE("ping", map[string]any{"ts": time.Now().UTC().Format(time.RFC3339)})
		case ev, ok := <-ch:
			if !ok {
				return
			}
			if !sessionStillValid() {
				return
			}
			writeSSE(ev.Event, ev.Data)
		}
	}
}
