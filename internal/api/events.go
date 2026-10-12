package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// handleEvents — Server-Sent Events (text/event-stream).
//
// Uso POS offline-first:
//   - El cliente mantiene una conexión larga; al restablecerse tras un corte
//     sabe que el backend está vivo sin polling de negocio.
//   - Keepalive periódico mantiene proxies abiertos.
//   - event:connected al abrir; event:ping en keepalive.
//   - Futuro: sale.confirmed, stock.updated, notify.* (mismo canal).
//
// Auth: Bearer igual que el resto de /api/v1.
func (s *Server) handleEvents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, map[string]string{"error": "método no permitido"})
		return
	}
	sess, err := s.sess(r)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "no autorizado"})
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		writeJSON(w, 500, map[string]string{"error": "streaming no soportado"})
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)
	flusher.Flush()

	writeSSE := func(event string, payload any) {
		var data []byte
		if payload == nil {
			data = []byte("{}")
		} else {
			data, _ = json.Marshal(payload)
		}
		if event != "" {
			fmt.Fprintf(w, "event: %s\n", event)
		}
		fmt.Fprintf(w, "data: %s\n\n", data)
		flusher.Flush()
	}

	writeSSE("connected", map[string]any{
		"ok":       true,
		"tenantId": sess.TenantID,
		"userId":   sess.UserID,
		"ts":       time.Now().UTC().Format(time.RFC3339),
	})

	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case <-ticker.C:
			// comentario SSE = keepalive (no es evento de app)
			fmt.Fprintf(w, ": keepalive %s\n\n", time.Now().UTC().Format(time.RFC3339))
			flusher.Flush()
			writeSSE("ping", map[string]any{"ts": time.Now().UTC().Format(time.RFC3339)})
		}
	}
}
