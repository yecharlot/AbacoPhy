package domain

import (
	"testing"
	"time"
)

func TestFilterAuditLog_QueryAndPagination(t *testing.T) {
	now := time.Now().UTC()
	entries := []AuditEntry{
		{ID: "1", Action: "venta.vendedor", Detail: "Venta 100", Username: "vend", UserID: "u1", CreatedAt: now.Add(-2 * time.Hour)},
		{ID: "2", Action: "recepcion.creada", Detail: "IR-1", Username: "eco", UserID: "u2", CreatedAt: now.Add(-1 * time.Hour)},
		{ID: "3", Action: "venta.vendedor", Detail: "Venta 50", Username: "vend", UserID: "u1", CreatedAt: now},
		{ID: "4", Action: "master.op", Detail: "secret", Username: "root", UserID: "m1", CreatedAt: now},
	}
	users := map[string]*User{
		"m1": {ID: "m1", Role: RoleMaster},
		"u1": {ID: "u1", Role: RoleVendedor},
	}

	page, total, actions := FilterAuditLog(entries, AuditFilter{Action: "venta", Limit: 10}, RoleAdmin, users)
	if total != 2 {
		t.Fatalf("total=%d want 2", total)
	}
	if len(page) != 2 {
		t.Fatalf("page=%d", len(page))
	}
	// newest first
	if page[0].ID != "3" {
		t.Fatalf("order first=%s", page[0].ID)
	}
	// master.op hidden from admin
	for _, a := range actions {
		if a == "master.op" {
			t.Fatal("master.op should not appear in actions for admin")
		}
	}

	page2, total2, _ := FilterAuditLog(entries, AuditFilter{Q: "IR-1", Limit: 5}, RoleAdmin, users)
	if total2 != 1 || page2[0].ID != "2" {
		t.Fatalf("q filter total=%d id=%v", total2, page2)
	}

	page3, total3, _ := FilterAuditLog(entries, AuditFilter{Limit: 1, Offset: 1}, RoleAdmin, users)
	if total3 != 3 { // master hidden
		t.Fatalf("visible total=%d", total3)
	}
	if len(page3) != 1 {
		t.Fatalf("limit page")
	}
}
