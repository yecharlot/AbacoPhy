package api

import (
	"strings"
	"sync"
)

// SSEEvent mensaje a reenviar por text/event-stream a clientes del tenant.
type SSEEvent struct {
	Event string
	Data  any
}

// EventHub fan-out in-process por tenant (sin Redis; mono-instancia).
// El tenant es la única clave de partición: no existe una suscripción global.
type EventHub struct {
	mu   sync.RWMutex
	subs map[string]map[chan SSEEvent]struct{}
}

func NewEventHub() *EventHub {
	return &EventHub{subs: make(map[string]map[chan SSEEvent]struct{})}
}

func (h *EventHub) Subscribe(tenantID string) chan SSEEvent {
	if h == nil || strings.TrimSpace(tenantID) == "" {
		return nil
	}
	ch := make(chan SSEEvent, 16)
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.subs == nil {
		h.subs = make(map[string]map[chan SSEEvent]struct{})
	}
	if h.subs[tenantID] == nil {
		h.subs[tenantID] = make(map[chan SSEEvent]struct{})
	}
	h.subs[tenantID][ch] = struct{}{}
	return ch
}

func (h *EventHub) Unsubscribe(tenantID string, ch chan SSEEvent) {
	if h == nil || strings.TrimSpace(tenantID) == "" || ch == nil {
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	if m, ok := h.subs[tenantID]; ok {
		delete(m, ch)
		if len(m) == 0 {
			delete(h.subs, tenantID)
		}
	}
	// No cerrar ch: Publish puede haberlo obtenido antes del Unsubscribe.
	// El canal queda fuera del mapa y el handler termina por contexto.
}

// Publish envía solo a los suscriptores del tenant indicado. Es no bloqueante:
// un consumidor lento no puede frenar operaciones de negocio.
func (h *EventHub) Publish(tenantID, event string, data any) {
	if h == nil || strings.TrimSpace(tenantID) == "" || strings.TrimSpace(event) == "" ||
		strings.ContainsAny(event, "\r\n") {
		return
	}
	ev := SSEEvent{Event: event, Data: data}
	h.mu.RLock()
	defer h.mu.RUnlock()
	for ch := range h.subs[tenantID] {
		select {
		case ch <- ev:
		default:
			// Cliente lento: descartar para no bloquear almacén/API.
		}
	}
}
