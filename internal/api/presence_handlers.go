package api

import (
	"net/http"
	"sort"
	"time"

	"github.com/yecharlot/AbacoPhy/internal/presence"
)

// handlePresence lista clientes vistos recientemente (admin/master).
func (s *Server) handlePresence(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		return
	}
	sess, err := s.sess(r)
	if err != nil || sess == nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	snap := s.Store.Get(sess.TenantID)
	if snap == nil {
		writeJSON(w, 400, map[string]string{"error": "no tenant"})
		return
	}
	u := snap.Users[sess.UserID]
	if u == nil || (u.Role != "master" && u.Role != "admin") {
		writeJSON(w, 403, map[string]string{"error": "forbidden"})
		return
	}
	list := []presence.Client{}
	if s.Presence != nil {
		list = s.Presence.ListOnline(time.Now().UTC())
	}
	sort.Slice(list, func(i, j int) bool {
		return list[i].LastSeen.After(list[j].LastSeen)
	})
	writeJSON(w, 200, map[string]any{
		"clients": list,
		"count":   len(list),
		"ttl_sec": int(presence.OnlineTTL.Seconds()),
	})
}
