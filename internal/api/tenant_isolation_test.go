package api

import (
	"bytes"
	"encoding/json"
	"strings"

	"github.com/google/uuid"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/yecharlot/AbacoPhy/internal/auth"
	"github.com/yecharlot/AbacoPhy/internal/domain"
	"github.com/yecharlot/AbacoPhy/internal/store"
	"github.com/yecharlot/AbacoPhy/internal/presence"
)

func TestMasterSessionCannotRestoreAnotherTenantSnapshot(t *testing.T) {
	st := store.New(t.TempDir())
	primary := domain.BootstrapTenant("Primary", "primary", "CUP")
	master := userByName(primary, "master")
	if master == nil { t.Fatal("master user missing") }
	master.MustChangePassword = false
	master.PasswordHash = mustHashForTenantIsolationTest(t, "primary-master-password")
	if err := st.Put(primary); err != nil { t.Fatal(err) }

	foreign := domain.BootstrapTenant("Foreign", "foreign", "CUP")
	if u := userByName(foreign, "master"); u != nil { u.Username = "foreign-master" }
	if err := st.Put(foreign); err != nil { t.Fatal(err) }
	foreignCID := foreign.RootCID
	if foreignCID == "" { t.Fatal("foreign snapshot CID missing") }

	sess, _, err := auth.Login(st, master.Username, "primary-master-password")
	if err != nil { t.Fatal(err) }
	handler := NewServer(st, t.TempDir()).Handler()
	body, _ := json.Marshal(map[string]string{"cid": foreignCID})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/backups/restore", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+sess.Token)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden { t.Fatalf("cross-tenant restore status=%d body=%s", rec.Code, rec.Body.String()) }
	if got := st.Get(primary.Tenant.ID).Tenant.Name; got != "Primary" { t.Fatalf("primary tenant overwritten: %q", got) }
	if got := st.Get(foreign.Tenant.ID).Tenant.Name; got != "Foreign" { t.Fatalf("foreign tenant changed: %q", got) }
}

func TestTenantAdminCannotResetAllTenants(t *testing.T) {
	st := store.New(t.TempDir())
	primary := domain.BootstrapTenant("Primary", "primary", "CUP")
	admin := userByName(primary, "admin")
	if admin == nil { t.Fatal("admin user missing") }
	admin.MustChangePassword = false
	admin.PasswordHash = mustHashForTenantIsolationTest(t, "primary-admin-password")
	if err := st.Put(primary); err != nil { t.Fatal(err) }
	foreign := domain.BootstrapTenant("Foreign", "foreign", "CUP")
	if u := userByName(foreign, "admin"); u != nil { u.Username = "foreign-admin" }
	if err := st.Put(foreign); err != nil { t.Fatal(err) }

	sess, _, err := auth.Login(st, admin.Username, "primary-admin-password")
	if err != nil { t.Fatal(err) }
	handler := NewServer(st, t.TempDir()).Handler()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/master/reset", bytes.NewBufferString(`{"confirm":"REINICIAR"}`))
	req.Header.Set("Authorization", "Bearer "+sess.Token)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden { t.Fatalf("tenant admin reset status=%d body=%s", rec.Code, rec.Body.String()) }
	if len(st.ListTenants()) != 2 { t.Fatalf("tenant admin reset removed data: tenant count=%d", len(st.ListTenants())) }
}

func mustHashForTenantIsolationTest(t *testing.T, password string) string {
	t.Helper()
	hash, err := auth.HashPassword(password)
	if err != nil { t.Fatal(err) }
	return hash
}


func TestPresenceEndpointListsOnlyRequestingTenant(t *testing.T) {
	st := store.New(t.TempDir())
	snap := domain.BootstrapTenant("Tenant A", "tenant-a", "CUP")
	admin := userByName(snap, "admin")
	if admin == nil { t.Fatal("admin user missing") }
	admin.MustChangePassword = false
	admin.PasswordHash = mustHashForTenantIsolationTest(t, "presence-isolation-password")
	if err := st.Put(snap); err != nil { t.Fatal(err) }
	sess, _, err := auth.Login(st, admin.Username, "presence-isolation-password")
	if err != nil { t.Fatal(err) }

	server := NewServer(st, t.TempDir())
	server.Presence.Touch(presence.Client{InstanceID: "device-a", TenantID: snap.Tenant.ID, UserID: "user-a", Username: "alice", HasSession: true})
	server.Presence.Touch(presence.Client{InstanceID: "device-b", TenantID: "tenant-b", UserID: "user-b", Username: "bob", HasSession: true})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/presence", nil)
	req.Header.Set("Authorization", "Bearer "+sess.Token)
	rec := httptest.NewRecorder()
	server.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK { t.Fatalf("presence status=%d body=%s", rec.Code, rec.Body.String()) }
	var payload struct { Clients []presence.Client `json:"clients"` }
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil { t.Fatal(err) }
	if len(payload.Clients) == 0 {
		t.Fatal("tenant A should see its own presence records")
	}
	for _, client := range payload.Clients {
		if client.InstanceID == "device-b" || client.Username == "bob" || client.UserID == "user-b" {
			t.Fatalf("tenant A received tenant B presence: %#v", client)
		}
	}
}


func TestRESTReferencesMustBelongToSessionTenant(t *testing.T) {
	st := store.New(t.TempDir())
	snap := domain.BootstrapTenant("Primary", "primary", "CUP")
	master := userByName(snap, "master")
	if master == nil { t.Fatal("master user missing") }
	master.MustChangePassword = false
	master.PasswordHash = mustHashForTenantIsolationTest(t, "rest-reference-password")
	if err := st.Put(snap); err != nil { t.Fatal(err) }
	sess, _, err := auth.Login(st, master.Username, "rest-reference-password")
	if err != nil { t.Fatal(err) }
	handler := NewServer(st, t.TempDir()).Handler()

	cases := []struct{name, path, body string}{
		{"foreign account parent", "/api/v1/accounts", `{"code":"A-CHILD","name":"Child","parent_id":"account-from-b"}`},
		{"foreign entry account", "/api/v1/entries", `{"type":"income","account_id":"account-from-b","amount":10,"description":"test"}`},
		{"foreign POS product", "/api/v1/pos/sales", `{"lines":[{"product_id":"product-from-b","qty":1,"unit_price":10}]}`},
		{"foreign POS unit", "/api/v1/pos/sales", `{"unit_id":"unit-from-b","lines":[{"product_id":"product-from-b","qty":1,"unit_price":10}]}`},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, tc.path, bytes.NewBufferString(tc.body))
			req.Header.Set("Authorization", "Bearer "+sess.Token)
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)
			if rec.Code != http.StatusBadRequest { t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String()) }
			current := st.Get(snap.Tenant.ID)
			if len(current.Entries) != 0 || len(current.POSSales) != 0 {
				t.Fatal("rejected cross-tenant reference changed business records")
			}
		})
	}
}


func TestMasterPasswordChangeRejectsAmbiguousCrossTenantUsername(t *testing.T) {
	st := store.New(t.TempDir())
	primary := domain.BootstrapTenant("Primary", "primary", "CUP")
	master := userByName(primary, "master")
	if master == nil { t.Fatal("primary master missing") }
	master.MustChangePassword = false
	master.PasswordHash = mustHashForTenantIsolationTest(t, "primary-master-password")
	if err := st.Put(primary); err != nil { t.Fatal(err) }

	for _, tenantName := range []string{"Tenant B", "Tenant C"} {
		snap := domain.BootstrapTenant(tenantName, strings.ToLower(strings.ReplaceAll(tenantName, " ", "-")), "CUP")
		for _, user := range snap.Users {
			if user == nil { continue }
			if user.Role == domain.RoleMaster { user.Username = strings.ToLower(strings.ReplaceAll(tenantName, " ", "-")) + "-owner" }
			if user.Role == domain.RoleAdmin { user.Username = strings.ToLower(strings.ReplaceAll(tenantName, " ", "-")) + "-admin" }
		}
		hash := mustHashForTenantIsolationTest(t, "shared-user-password")
		shared := &domain.User{ID: uuid.NewString(), TenantID: snap.Tenant.ID, Username: "shared-cross-tenant", Role: domain.RoleVendedor, PasswordHash: hash, Active: true}
		snap.Users[shared.ID] = shared
		if err := st.Put(snap); err != nil { t.Fatal(err) }
	}

	sess, _, err := auth.Login(st, master.Username, "primary-master-password")
	if err != nil { t.Fatal(err) }
	body := `{"username":"shared-cross-tenant","current_password":"primary-master-password","new_password":"another-long-password-2026"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/password", bytes.NewBufferString(body))
	req.Header.Set("Authorization", "Bearer "+sess.Token)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	NewServer(st, t.TempDir()).Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound { t.Fatalf("ambiguous master password target status=%d body=%s", rec.Code, rec.Body.String()) }
	if user, snap := st.FindUserByUsername("shared-cross-tenant"); user != nil || snap != nil {
		t.Fatal("ambiguous username must remain unresolved")
	}
}



func TestEmployeeRESTRejectsForeignUserAndUnitAssignments(t *testing.T) {
	st := store.New(t.TempDir())
	snap := domain.BootstrapTenant("Tenant A", "tenant-a", "CUP")
	master := userByName(snap, "master")
	if master == nil { t.Fatal("master user missing") }
	master.MustChangePassword = false
	master.PasswordHash = mustHashForTenantIsolationTest(t, "employee-assignment-password")
	if err := st.Put(snap); err != nil { t.Fatal(err) }
	sess, _, err := auth.Login(st, master.Username, "employee-assignment-password")
	if err != nil { t.Fatal(err) }
	handler := NewServer(st, t.TempDir()).Handler()
	cases := []struct{name, body string}{
		{"foreign user", `{"name":"Worker","metadata":{"userId":"user-from-tenant-b"}}`},
		{"foreign unit", `{"name":"Worker","metadata":{"unitIds":["unit-from-tenant-b"]}}`},
		{"malformed unit ids", `{"name":"Worker","metadata":{"unitIds":[42]}}`},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/v1/payroll/employees", bytes.NewBufferString(tc.body))
			req.Header.Set("Authorization", "Bearer "+sess.Token)
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)
			if rec.Code != http.StatusBadRequest { t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String()) }
			if len(st.Get(snap.Tenant.ID).Employees) != 0 { t.Fatal("invalid employee assignment was persisted") }
		})
	}
}

func TestMasterCanChangeUniqueUserInAnotherTenantAndAuditTargetTenant(t *testing.T) {
	dataDir := t.TempDir()
	st := store.New(dataDir)
	primary := domain.BootstrapTenant("Primary", "primary", "CUP")
	master := userByName(primary, "master")
	if master == nil { t.Fatal("primary master missing") }
	master.MustChangePassword = false
	master.PasswordHash = mustHashForTenantIsolationTest(t, "primary-master-password")
	if err := st.Put(primary); err != nil { t.Fatal(err) }
	target := domain.BootstrapTenant("Target", "target", "CUP")
	for _, user := range target.Users {
		if user == nil { continue }
		if user.Role == domain.RoleMaster { user.Username = "target-owner" }
		if user.Role == domain.RoleAdmin { user.Username = "target-admin" }
	}
	targetUser := &domain.User{ID: uuid.NewString(), TenantID: target.Tenant.ID, Username: "target-worker",
		Role: domain.RoleVendedor, PasswordHash: mustHashForTenantIsolationTest(t, "old-target-password"), Active: true}
	target.Users[targetUser.ID] = targetUser
	if err := st.Put(target); err != nil { t.Fatal(err) }
	targetRevisionBeforeChange := target.Rev
	sess, _, err := auth.Login(st, master.Username, "primary-master-password")
	if err != nil { t.Fatal(err) }
	body := `{"username":"target-worker","current_password":"primary-master-password","new_password":"new-target-password-2026"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/password", bytes.NewBufferString(body))
	req.Header.Set("Authorization", "Bearer "+sess.Token)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	NewServer(st, t.TempDir()).Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK { t.Fatalf("global password change status=%d body=%s", rec.Code, rec.Body.String()) }
	persisted := store.New(dataDir).Get(target.Tenant.ID)
	if persisted == nil { t.Fatal("target tenant disappeared after global password change") }
	updated := persisted.Users[targetUser.ID]
	if updated == nil || !auth.CheckPassword(updated.PasswordHash, "new-target-password-2026") { t.Fatal("target password change was not durably persisted") }
	if persisted.Rev <= int64(targetRevisionBeforeChange) { t.Fatal("target tenant revision was not advanced") }
	foundAudit := false
	for _, entry := range persisted.AuditLog {
		if entry.Action == "auth.password_change.global" && entry.TenantID == target.Tenant.ID &&
			entry.Metadata["actor_tenant_id"] == primary.Tenant.ID && entry.Username == master.Username { foundAudit = true }
	}
	if !foundAudit { t.Fatal("global password change must be audited in target tenant without foreign tenant identity") }
}

func TestCIDRestoreRejectsForeignEntityReference(t *testing.T) {
	st := store.New(t.TempDir())
	snap := domain.BootstrapTenant("Primary", "primary", "CUP")
	master := userByName(snap, "master")
	if master == nil { t.Fatal("master user missing") }
	master.MustChangePassword = false
	master.PasswordHash = mustHashForTenantIsolationTest(t, "cid-child-password")
	snap.Products = map[string]*domain.Product{
		"local-product": {ID: "local-product", TenantID: snap.Tenant.ID, Name: "Local"},
	}
	snap.POSSales = []domain.POSSale{{
		ID: "sale-with-foreign-reference", TenantID: snap.Tenant.ID,
		Lines: []domain.POSLine{{ProductID: "product-from-b", Qty: 1}},
	}}
	if err := st.Put(snap); err != nil { t.Fatal(err) }
	sess, _, err := auth.Login(st, master.Username, "cid-child-password")
	if err != nil { t.Fatal(err) }

	body := `{"cid":"` + snap.RootCID + `"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/backups/restore", bytes.NewBufferString(body))
	req.Header.Set("Authorization", "Bearer "+sess.Token)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	NewServer(st, t.TempDir()).Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest { t.Fatalf("CID restore status=%d body=%s", rec.Code, rec.Body.String()) }
}


func TestSyncPushRejectsForeignTenantAndReferencesAtomically(t *testing.T) {
	st := store.New(t.TempDir())
	snap := domain.BootstrapTenant("Tenant A", "tenant-a", "CUP")
	master := userByName(snap, "master")
	if master == nil { t.Fatal("master user missing") }
	master.MustChangePassword = false
	master.PasswordHash = mustHashForTenantIsolationTest(t, "sync-isolation-password")
	if err := st.Put(snap); err != nil { t.Fatal(err) }
	sess, _, err := auth.Login(st, master.Username, "sync-isolation-password")
	if err != nil { t.Fatal(err) }
	handler := NewServer(st, t.TempDir()).Handler()

	cases := []struct{name, body string}{
		{"foreign invoice tenant", `{"client_rev":0,"entries":[{"id":"local-entry","type":"income","amount":1}],"invoices":[{"id":"foreign-invoice","tenant_id":"tenant-b"}]}`},
		{"foreign inventory tenant", `{"client_rev":0,"entries":[{"id":"local-entry","type":"income","amount":1}],"inventory":[{"id":"foreign-item","tenant_id":"tenant-b"}]}`},
		{"foreign POS sale tenant", `{"client_rev":0,"entries":[{"id":"local-entry","type":"income","amount":1}],"pos_sales":[{"id":"foreign-sale","tenant_id":"tenant-b"}]}`},
		{"foreign account reference", `{"client_rev":0,"entries":[{"id":"local-entry","type":"income","amount":1},{"id":"bad-entry","account_id":"account-from-b","amount":1}]}`},
		{"foreign product reference", `{"client_rev":0,"pos_sales":[{"id":"sale","lines":[{"product_id":"product-from-b","qty":1}]}]}`},
		{"foreign unit reference", `{"client_rev":0,"pos_sales":[{"id":"sale","unit_id":"unit-from-b","lines":[{"product_id":"product-from-b","qty":1}]}]}`},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			before := st.Get(snap.Tenant.ID).Rev
			req := httptest.NewRequest(http.MethodPost, "/api/v1/sync/push", bytes.NewBufferString(tc.body))
			req.Header.Set("Authorization", "Bearer "+sess.Token)
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)
			if rec.Code != http.StatusBadRequest && rec.Code != http.StatusForbidden {
				t.Fatalf("expected rejection, status=%d body=%s", rec.Code, rec.Body.String())
			}
			current := st.Get(snap.Tenant.ID)
			if len(current.Entries) != 0 || len(current.Invoices) != 0 || len(current.POSSales) != 0 {
				t.Fatal("invalid sync batch partially mutated tenant data")
			}
			if current.Rev != before { t.Fatal("invalid sync batch changed tenant revision") }
		})
	}
}


func TestMasterTenantListIsReadOnly(t *testing.T) {
	st := store.New(t.TempDir())
	snap := domain.BootstrapTenant("Primary", "primary", "CUP")
	master := userByName(snap, "master")
	if master == nil { t.Fatal("master user missing") }
	master.MustChangePassword = false
	master.PasswordHash = mustHashForTenantIsolationTest(t, "master-list-password")
	if err := st.Put(snap); err != nil { t.Fatal(err) }
	sess, _, err := auth.Login(st, master.Username, "master-list-password")
	if err != nil { t.Fatal(err) }
	handler := NewServer(st, t.TempDir()).Handler()

	for _, method := range []string{http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete, http.MethodHead} {
		req := httptest.NewRequest(method, "/api/v1/master/tenants", nil)
		req.Header.Set("Authorization", "Bearer "+sess.Token)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusMethodNotAllowed {
			t.Errorf("%s /master/tenants status=%d, want 405: %s", method, rec.Code, rec.Body.String())
		}
	}
}


func TestMasterResetRecordsGlobalOperationAfterBootstrap(t *testing.T) {
	st := store.New(t.TempDir())
	primary := domain.BootstrapTenant("Primary", "primary", "CUP")
	master := userByName(primary, "master")
	if master == nil { t.Fatal("master user missing") }
	master.MustChangePassword = false
	master.PasswordHash = mustHashForTenantIsolationTest(t, "reset-master-password")
	if err := st.Put(primary); err != nil { t.Fatal(err) }
	other := domain.BootstrapTenant("Other", "other", "CUP")
	if err := st.Put(other); err != nil { t.Fatal(err) }
	sess, _, err := auth.Login(st, master.Username, "reset-master-password")
	if err != nil { t.Fatal(err) }

	req := httptest.NewRequest(http.MethodPost, "/api/v1/master/reset", bytes.NewBufferString(`{"confirm":"REINICIAR"}`))
	req.Header.Set("Authorization", "Bearer "+sess.Token)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	NewServer(st, t.TempDir()).Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK { t.Fatalf("master reset status=%d body=%s", rec.Code, rec.Body.String()) }
	if got := len(st.ListTenants()); got != 1 { t.Fatalf("tenant count after reset=%d, want 1 bootstrap tenant", got) }
	fresh := st.Get(st.ListTenants()[0].ID)
	found := false
	for _, entry := range fresh.AuditLog {
		if entry.Action == "master.reset" && entry.TenantID == fresh.Tenant.ID &&
			entry.Username == master.Username && entry.Role == domain.RoleMaster &&
			entry.Metadata["actor_tenant_id"] == primary.Tenant.ID {
			found = true
		}
	}
	if !found { t.Fatal("global reset must leave an audit record with the originating tenant") }
	if _, err := auth.SessionFromRequest(st, "Bearer "+sess.Token); err == nil {
		t.Fatal("global reset must revoke the master session that initiated it")
	}
}
