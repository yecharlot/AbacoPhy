package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/yecharlot/AbacoPhy/internal/auth"
	"github.com/yecharlot/AbacoPhy/internal/domain"
	"github.com/yecharlot/AbacoPhy/internal/store"
)

func readBootstrapPassword(t *testing.T, dataDir, username string) string {
	t.Helper()
	raw, err := os.ReadFile(filepath.Join(dataDir, "bootstrap-credentials.txt"))
	if err != nil { t.Fatalf("read bootstrap credentials: %v", err) }
	for _, block := range strings.Split(string(raw), "\n\n") {
		if !strings.Contains(block, "Username: "+username+"\n") { continue }
		for _, line := range strings.Split(block, "\n") {
			if strings.HasPrefix(line, "Password: ") { return strings.TrimPrefix(line, "Password: ") }
		}
	}
	t.Fatalf("credential for %q not found", username)
	return ""
}

func TestEnsureBootstrapCreatesRandomForcedCredentials(t *testing.T) {
	t.Setenv("ABACOPHY_BOOTSTRAP_MASTER_PASSWORD", "")
	t.Setenv("ABACOPHY_BOOTSTRAP_ADMIN_PASSWORD", "")
	dataDir := t.TempDir()
	st := store.New(dataDir)
	if err := EnsureBootstrap(st); err != nil { t.Fatalf("EnsureBootstrap: %v", err) }

	tenants := st.ListTenants()
	if len(tenants) != 1 { t.Fatalf("tenant count = %d, want 1", len(tenants)) }
	snap := st.Get(tenants[0].ID)
	master, admin := userByName(snap, "master"), userByName(snap, "admin")
	if master == nil || admin == nil { t.Fatal("bootstrap admin accounts missing") }
	if !master.MustChangePassword || !admin.MustChangePassword { t.Fatal("both administrative accounts must require initial password change") }

	masterPassword := readBootstrapPassword(t, dataDir, "master")
	adminPassword := readBootstrapPassword(t, dataDir, "admin")
	if masterPassword == "" || adminPassword == "" || masterPassword == adminPassword {
		t.Fatal("bootstrap passwords must be non-empty and independently generated")
	}
	info, err := os.Stat(filepath.Join(dataDir, "bootstrap-credentials.txt"))
	if err != nil { t.Fatal(err) }
	if runtime.GOOS != "windows" && info.Mode().Perm() != 0600 { t.Fatalf("bootstrap file permissions = %04o, want 0600", info.Mode().Perm()) }
	if _, user, err := auth.Login(st, "master", masterPassword); err != nil || user == nil || !user.MustChangePassword {
		t.Fatalf("temporary master login should succeed and require password change: user=%v err=%v", user, err)
	}

	// Repairing a later account with a missing hash must append credentials,
	// never erase the still-pending initial admin credentials.
	originalMasterPassword := masterPassword
	repaired := &domain.User{ID: "repaired-user", TenantID: snap.Tenant.ID, Username: "repaired-user", Role: domain.RoleVendedor, Active: true}
	snap.Users[repaired.ID] = repaired
	if err := st.Put(snap); err != nil { t.Fatal(err) }
	if err := EnsureBootstrap(st); err != nil { t.Fatalf("repair missing user password: %v", err) }
	if readBootstrapPassword(t, dataDir, "master") != originalMasterPassword {
		t.Fatal("adding a repaired account must not overwrite credentials still awaiting rotation")
	}

	before := master.PasswordHash
	if err := EnsureBootstrap(st); err != nil { t.Fatalf("second EnsureBootstrap: %v", err) }
	if master.PasswordHash != before { t.Fatal("bootstrap credentials must not rotate again on ordinary restart") }
}

func TestEnsureBootstrapRotatesLegacyAdministrativeAccountsOnce(t *testing.T) {
	t.Setenv("ABACOPHY_BOOTSTRAP_MASTER_PASSWORD", "")
	t.Setenv("ABACOPHY_BOOTSTRAP_ADMIN_PASSWORD", "")
	dataDir := t.TempDir()
	st := store.New(dataDir)
	snap := domain.BootstrapTenant("Legacy", "legacy", "CUP")
	for _, user := range snap.Users {
		if user.Username == "master" {
			user.PasswordHash, _ = auth.HashPassword("legacy-master-password")
		} else if user.Username == "admin" {
			user.PasswordHash, _ = auth.HashPassword("legacy-admin-password")
		}
	}
	if err := st.Put(snap); err != nil { t.Fatal(err) }
	master, admin := userByName(snap, "master"), userByName(snap, "admin")
	oldMasterHash, oldAdminHash := master.PasswordHash, admin.PasswordHash

	if err := EnsureBootstrap(st); err != nil { t.Fatalf("EnsureBootstrap migration: %v", err) }
	if master.PasswordHash == oldMasterHash || admin.PasswordHash == oldAdminHash {
		t.Fatal("legacy administrative password hashes must be rotated")
	}
	if !master.MustChangePassword || !admin.MustChangePassword {
		t.Fatal("legacy administrative users must be forced to change password")
	}
	if readBootstrapPassword(t, dataDir, "master") == "" || readBootstrapPassword(t, dataDir, "admin") == "" {
		t.Fatal("rotated credentials must be recoverable from the protected one-time file")
	}
	newHash := master.PasswordHash
	if err := EnsureBootstrap(st); err != nil { t.Fatal(err) }
	if master.PasswordHash != newHash { t.Fatal("legacy migration must execute only once") }
}

func TestInitialPasswordChangeBlocksAPIUntilCompleted(t *testing.T) {
	t.Setenv("ABACOPHY_BOOTSTRAP_MASTER_PASSWORD", "")
	t.Setenv("ABACOPHY_BOOTSTRAP_ADMIN_PASSWORD", "")
	dataDir := t.TempDir()
	st := store.New(dataDir)
	if err := EnsureBootstrap(st); err != nil { t.Fatal(err) }
	password := readBootstrapPassword(t, dataDir, "master")
	token, _, err := auth.Login(st, "master", password)
	if err != nil { t.Fatal(err) }
	handler := NewServer(st, t.TempDir()).Handler()

	request := func(method, path, body string) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(method, path, strings.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token.Token)
		if body != "" { req.Header.Set("Content-Type", "application/json") }
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		return rec
	}

	blocked := request(http.MethodGet, "/api/v1/tenant", "")
	if blocked.Code != http.StatusForbidden { t.Fatalf("protected route status = %d, want 403", blocked.Code) }
	var blockedBody map[string]any
	if err := json.Unmarshal(blocked.Body.Bytes(), &blockedBody); err != nil { t.Fatal(err) }
	if blockedBody["code"] != "password_change_required" { t.Fatalf("blocked response code = %v", blockedBody["code"]) }

	me := request(http.MethodGet, "/api/v1/auth/me", "")
	if me.Code != http.StatusOK { t.Fatalf("/auth/me status = %d, want 200", me.Code) }
	changeBody := `{"current_password":"` + password + `","new_password":"A-long-private-passphrase-2026"}`
	changed := request(http.MethodPost, "/api/v1/auth/password", changeBody)
	if changed.Code != http.StatusOK { t.Fatalf("password change status = %d body=%s", changed.Code, changed.Body.String()) }
	allowed := request(http.MethodGet, "/api/v1/tenant", "")
	if allowed.Code != http.StatusOK { t.Fatalf("protected route after password change = %d, want 200: %s", allowed.Code, allowed.Body.String()) }
	if userByName(st.Get(st.ListTenants()[0].ID), "master").MustChangePassword {
		t.Fatal("successful password change must clear MustChangePassword")
	}
}

func TestMasterCreateTenantGeneratesIndependentTemporaryPasswords(t *testing.T) {
	t.Setenv("ABACOPHY_BOOTSTRAP_MASTER_PASSWORD", "")
	t.Setenv("ABACOPHY_BOOTSTRAP_ADMIN_PASSWORD", "")
	dataDir := t.TempDir()
	st := store.New(dataDir)
	if err := EnsureBootstrap(st); err != nil { t.Fatal(err) }
	initial := st.Get(st.ListTenants()[0].ID)
	master := userByName(initial, "master")
	master.MustChangePassword = false
	master.PasswordHash, _ = auth.HashPassword("master-test-private-password")
	if err := st.Put(initial); err != nil { t.Fatal(err) }
	token, _, err := auth.Login(st, "master", "master-test-private-password")
	if err != nil { t.Fatal(err) }

	handler := NewServer(st, t.TempDir()).Handler()
	body := `{"name":"Secure Business","slug":"secure-business","admin_user":"secure-admin"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/master/tenants/create", strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token.Token)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated { t.Fatalf("create tenant status = %d body=%s", rec.Code, rec.Body.String()) }

	var created *domain.StoreSnapshot
	for _, tenant := range st.ListTenants() {
		if tenant.Slug == "secure-business" { created = st.Get(tenant.ID); break }
	}
	if created == nil { t.Fatal("created tenant not found") }
	first := userByName(created, "secure-admin")
	second := userByName(created, "secure-admin-owner")
	if first == nil || second == nil || !first.MustChangePassword || !second.MustChangePassword {
		t.Fatal("both new tenant administrator accounts must require password change")
	}
	firstPassword := readBootstrapPassword(t, dataDir, "secure-admin")
	secondPassword := readBootstrapPassword(t, dataDir, "secure-admin-owner")
	if firstPassword == secondPassword { t.Fatal("new tenant admin accounts must not share a temporary password") }
	foundAudit := false
	for _, entry := range created.AuditLog {
		if entry.Action == "master.tenant_create" && entry.TenantID == created.Tenant.ID &&
			entry.Username == "master" && entry.Role == domain.RoleMaster &&
			entry.Metadata["actor_tenant_id"] == initial.Tenant.ID {
			foundAudit = true
		}
	}
	if !foundAudit { t.Fatal("global tenant creation must be audited in the created tenant with actor tenant metadata") }
}

func userByName(snap *domain.StoreSnapshot, username string) *domain.User {
	if snap == nil { return nil }
	for _, user := range snap.Users {
		if user != nil && user.Username == username { return user }
	}
	return nil
}

func TestReadonlyCannotPostEntriesWithExplicitGrant(t *testing.T) {
	dataDir := t.TempDir()
	st := store.New(dataDir)
	if err := EnsureBootstrap(st); err != nil { t.Fatal(err) }
	tenant := st.ListTenants()[0]
	snap := st.Get(tenant.ID)
	hash, err := auth.HashPassword("readonly-test-password-2026")
	if err != nil { t.Fatal(err) }
	user := &domain.User{ID:"readonly-c1", TenantID:tenant.ID, Username:"readonly-c1", Role:domain.RoleReadonly, PasswordHash:hash, Active:true, Modules:map[string]bool{"ingresos":true}}
	snap.Users[user.ID] = user
	snap.Tenant.EnabledModules = map[string]bool{"ingresos":true}
	snap.Tenant.RolePermissions = map[string]map[string]bool{domain.RoleReadonly: {"ingresos":true}}
	if err := st.Put(snap); err != nil { t.Fatal(err) }
	token, _, err := auth.Login(st, user.Username, "readonly-test-password-2026")
	if err != nil { t.Fatal(err) }
	handler := NewServer(st, t.TempDir()).Handler()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/entries", strings.NewReader(`{"type":"income","amount":100,"description":"forbidden"}`))
	req.Header.Set("Authorization", "Bearer "+token.Token)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden { t.Fatalf("readonly POST status = %d, want 403: %s", rec.Code, rec.Body.String()) }
	if got := len(st.Get(tenant.ID).Entries); got != 0 { t.Fatalf("readonly POST persisted %d entries", got) }
}

func TestTenantRolePolicyCannotPromoteAdminToMasterEndpoint(t *testing.T) {
	dataDir := t.TempDir()
	st := store.New(dataDir)
	if err := EnsureBootstrap(st); err != nil { t.Fatal(err) }
	tenant := st.ListTenants()[0]
	snap := st.Get(tenant.ID)
	admin := userByName(snap, "admin")
	if admin == nil { t.Fatal("bootstrap admin missing") }
	admin.MustChangePassword = false
	admin.PasswordHash, _ = auth.HashPassword("admin-c1-test-password-2026")
	snap.Tenant.EnabledModules = map[string]bool{"master":true}
	snap.Tenant.RolePermissions = map[string]map[string]bool{domain.RoleAdmin: {"master":true}}
	if err := st.Put(snap); err != nil { t.Fatal(err) }
	token, _, err := auth.Login(st, "admin", "admin-c1-test-password-2026")
	if err != nil { t.Fatal(err) }
	handler := NewServer(st, t.TempDir()).Handler()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/master/tenants", nil)
	req.Header.Set("Authorization", "Bearer "+token.Token)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden { t.Fatalf("admin master endpoint status = %d, want 403: %s", rec.Code, rec.Body.String()) }
}
