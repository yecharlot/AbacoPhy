package api

import (
	"sync"
)

// SSEEvent mensaje a reenviar por text/event-stream a clientes del tenant.
type SSEEvent struct {
	Event string
	Data  any
}

// EventHub fan-out in-process por tenant (sin Redis; mono-instancia).
type EventHub struct {
	mu   sync.RWMutex
	subs map[string]map[chan SSEEvent]struct{}
}

func NewEventHub() *EventHub {
	return &EventHub{subs: make(map[string]map[chan SSEEvent]struct{})}
}

func (h *EventHub) Subscribe(tenantID string) chan SSEEvent {
	ch := make(chan SSEEvent, 16)
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.subs[tenantID] == nil {
		h.subs[tenantID] = make(map[chan SSEEvent]struct{})
	}
	h.subs[tenantID][ch] = struct{}{}
	return ch
}

func (h *EventHub) Unsubscribe(tenantID string, ch chan SSEEvent) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if m, ok := h.subs[tenantID]; ok {
		delete(m, ch)
		if len(m) == 0 {
			delete(h.subs, tenantID)
		}
	}
	// no cerrar ch aquí: el receptor puede estar leyendo; el defer del handler cierra el flujo
}

// Publish envía a todos los suscriptores del tenant (no bloquea si el buffer está lleno).
func (h *EventHub) Publish(tenantID, event string, data any) {
	if h == nil || tenantID == "" || event == "" {
		return
	}
	ev := SSEEvent{Event: event, Data: data}
	h.mu.RLock()
	defer h.mu.RUnlock()
	for ch := range h.subs[tenantID] {
		select {
		case ch <- ev:
		default:
			// cliente lento: descartar para no bloquear almacén/API
		}
	}
}
