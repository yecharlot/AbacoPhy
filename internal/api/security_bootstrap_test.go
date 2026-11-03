package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
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
	if info.Mode().Perm() != 0600 { t.Fatalf("bootstrap file permissions = %04o, want 0600", info.Mode().Perm()) }
	if _, user, err := auth.Login(st, "master", masterPassword); err != nil || user == nil || !user.MustChangePassword {
		t.Fatalf("temporary master login should succeed and require password change: user=%v err=%v", user, err)
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

func userByName(snap *domain.StoreSnapshot, username string) *domain.User {
	if snap == nil { return nil }
	for _, user := range snap.Users {
		if user != nil && user.Username == username { return user }
	}
	return nil
}
