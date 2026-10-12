package domain

import (
	"strings"
	"time"
)

const AuditLogMaxEntries = 2000

// AuditFilter: consulta de traza (GET /audit).
type AuditFilter struct {
	Action   string // coincidencia exacta o prefijo "venta."
	UserID   string
	Username string
	Ref      string
	Q        string // texto libre: action + detail + username + ref
	Since    *time.Time
	Until    *time.Time
	Limit    int
	Offset   int
}

// AppendAudit agrega un evento y recorta el log a AuditLogMaxEntries.
func AppendAudit(snap *StoreSnapshot, e AuditEntry) {
	if snap == nil {
		return
	}
	if e.ID == "" {
		return
	}
	snap.AuditLog = append(snap.AuditLog, e)
	if len(snap.AuditLog) > AuditLogMaxEntries {
		snap.AuditLog = snap.AuditLog[len(snap.AuditLog)-AuditLogMaxEntries:]
	}
}

func matchAction(entryAction, want string) bool {
	if want == "" {
		return true
	}
	if entryAction == want {
		return true
	}
	// prefijo: "venta." o "recepcion"
	if strings.HasSuffix(want, ".") {
		return strings.HasPrefix(entryAction, want)
	}
	if strings.HasPrefix(entryAction, want+".") || strings.HasPrefix(entryAction, want+"_") {
		return true
	}
	return strings.Contains(strings.ToLower(entryAction), strings.ToLower(want))
}

func visibleToRole(e AuditEntry, viewerRole string, users map[string]*User) bool {
	if viewerRole == RoleMaster {
		return true
	}
	if e.Action == "master.op" || e.Action == "error" || e.Action == "theme.update" {
		return false
	}
	if users != nil {
		if u := users[e.UserID]; u != nil && u.Role == RoleMaster {
			return false
		}
	}
	return true
}

// FilterAuditLog aplica visibilidad por rol + filtros + paginación.
// total = coincidencias antes de limit/offset (tras visibilidad y filtros).
func FilterAuditLog(entries []AuditEntry, f AuditFilter, viewerRole string, users map[string]*User) (page []AuditEntry, total int, actions []string) {
	if entries == nil {
		entries = []AuditEntry{}
	}
	q := strings.ToLower(strings.TrimSpace(f.Q))
	actionWant := strings.TrimSpace(f.Action)
	userID := strings.TrimSpace(f.UserID)
	unameWant := strings.ToLower(strings.TrimSpace(f.Username))
	refWant := strings.TrimSpace(f.Ref)

	matched := make([]AuditEntry, 0, len(entries))
	actionSet := map[string]struct{}{}

	for _, e := range entries {
		if !visibleToRole(e, viewerRole, users) {
			continue
		}
		actionSet[e.Action] = struct{}{}

		if !matchAction(e.Action, actionWant) {
			continue
		}
		if userID != "" && e.UserID != userID {
			continue
		}
		if unameWant != "" && !strings.Contains(strings.ToLower(e.Username), unameWant) {
			continue
		}
		if refWant != "" && e.Ref != refWant && !strings.Contains(e.Ref, refWant) {
			continue
		}
		if f.Since != nil && e.CreatedAt.Before(*f.Since) {
			continue
		}
		if f.Until != nil && e.CreatedAt.After(*f.Until) {
			continue
		}
		if q != "" {
			blob := strings.ToLower(e.Action + " " + e.Detail + " " + e.Username + " " + e.Ref + " " + e.UserID)
			if !strings.Contains(blob, q) {
				continue
			}
		}
		matched = append(matched, e)
	}

	total = len(matched)

	// más reciente primero
	rev := make([]AuditEntry, len(matched))
	for i := range matched {
		rev[len(matched)-1-i] = matched[i]
	}

	limit := f.Limit
	if limit <= 0 {
		limit = 200
	}
	if limit > 1000 {
		limit = 1000
	}
	offset := f.Offset
	if offset < 0 {
		offset = 0
	}
	if offset > len(rev) {
		offset = len(rev)
	}
	end := offset + limit
	if end > len(rev) {
		end = len(rev)
	}
	page = rev[offset:end]

	actions = make([]string, 0, len(actionSet))
	for a := range actionSet {
		actions = append(actions, a)
	}
	// sort actions
	for i := 0; i < len(actions); i++ {
		for j := i + 1; j < len(actions); j++ {
			if actions[j] < actions[i] {
				actions[i], actions[j] = actions[j], actions[i]
			}
		}
	}
	return page, total, actions
}
