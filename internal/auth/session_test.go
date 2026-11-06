package auth

import (
	"testing"
	"time"

	"github.com/yecharlot/AbacoPhy/internal/domain"
	"github.com/yecharlot/AbacoPhy/internal/store"
)

func TestSessionLifetimeByRole(t *testing.T) {
	tests := []struct {
		role string
		want time.Duration
	}{
		{role: domain.RoleAdmin, want: 4 * time.Hour},
		{role: domain.RoleMaster, want: 4 * time.Hour},
		{role: domain.RoleContador, want: 12 * time.Hour},
		{role: domain.RoleEconomico, want: 12 * time.Hour},
		{role: domain.RoleVendedor, want: 12 * time.Hour},
		{role: domain.RoleReadonly, want: 12 * time.Hour},
	}
	for _, tt := range tests {
		t.Run(tt.role, func(t *testing.T) {
			if got := SessionLifetime(tt.role); got != tt.want {
				t.Fatalf("SessionLifetime(%q) = %s, want %s", tt.role, got, tt.want)
			}
		})
	}
}

func TestLoginAppliesRoleBasedAbsoluteExpiry(t *testing.T) {
	st := store.New(t.TempDir())
	snap := domain.BootstrapTenant("Session test", "session-test", "CUP")
	master := snap.Users["master"]
	if master == nil {
		for _, user := range snap.Users {
			if user != nil && user.Role == domain.RoleMaster {
				master = user
				break
			}
		}
	}
	if master == nil {
		t.Fatal("bootstrap master user not found")
	}
	master.PasswordHash, _ = HashPassword("master-session-passphrase")
	master.Active = true

	regular := &domain.User{
		ID: "regular-session-user", TenantID: snap.Tenant.ID,
		Username: "regular-session-user", Role: domain.RoleVendedor,
		PasswordHash: mustHashForSessionTest(t, "regular-session-passphrase"),
		Active: true,
	}
	snap.Users[regular.ID] = regular
	if err := st.Put(snap); err != nil {
		t.Fatal(err)
	}

	before := time.Now().UTC()
	adminSession, _, err := Login(st, master.Username, "master-session-passphrase")
	if err != nil {
		t.Fatalf("admin login: %v", err)
	}
	regularSession, _, err := Login(st, regular.Username, "regular-session-passphrase")
	if err != nil {
		t.Fatalf("regular login: %v", err)
	}
	if adminSession.ExpiresAt.Before(before.Add(4*time.Hour)) || adminSession.ExpiresAt.After(time.Now().UTC().Add(4*time.Hour+time.Minute)) {
		t.Fatalf("admin expiry = %s, expected approximately 4 hours", adminSession.ExpiresAt)
	}
	if regularSession.ExpiresAt.Before(before.Add(12*time.Hour)) || regularSession.ExpiresAt.After(time.Now().UTC().Add(12*time.Hour+time.Minute)) {
		t.Fatalf("regular expiry = %s, expected approximately 12 hours", regularSession.ExpiresAt)
	}
}

func mustHashForSessionTest(t *testing.T, password string) string {
	t.Helper()
	hash, err := HashPassword(password)
	if err != nil {
		t.Fatal(err)
	}
	return hash
}

func TestSessionFromRequestRejectsExpiredAndRevokedSessions(t *testing.T) {
	st := store.New(t.TempDir())
	snap := domain.BootstrapTenant("Session validation", "session-validation", "CUP")
	user := snap.Users["admin"]
	if user == nil {
		for _, candidate := range snap.Users {
			if candidate != nil && candidate.Role == domain.RoleAdmin {
				user = candidate
				break
			}
		}
	}
	if user == nil {
		t.Fatal("bootstrap admin user not found")
	}
	user.PasswordHash = mustHashForSessionTest(t, "admin-session-passphrase")
	user.Active = true
	if err := st.Put(snap); err != nil {
		t.Fatal(err)
	}

	sess, _, err := Login(st, user.Username, "admin-session-passphrase")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := SessionFromRequest(st, "Bearer "+sess.Token); err != nil {
		t.Fatalf("fresh session rejected: %v", err)
	}

	BumpUserPermsEpoch(user)
	if _, err := SessionFromRequest(st, "Bearer "+sess.Token); err == nil {
		t.Fatal("session must be rejected after user permissions epoch changes")
	}

	sess, _, err = Login(st, user.Username, "admin-session-passphrase")
	if err != nil {
		t.Fatal(err)
	}
	user.Active = false
	if _, err := SessionFromRequest(st, "Bearer "+sess.Token); err == nil {
		t.Fatal("session must be rejected after user is deactivated")
	}
}
