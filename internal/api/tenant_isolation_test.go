package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/yecharlot/AbacoPhy/internal/auth"
	"github.com/yecharlot/AbacoPhy/internal/domain"
	"github.com/yecharlot/AbacoPhy/internal/store"
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
